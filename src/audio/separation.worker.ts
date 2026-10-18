import { separateHtdemucs, SEGMENT, type DemucsRunner } from '../engine/htdemucs';
import { separateDsp, vocalBoundaryPenalty, type Stems } from '../engine/separate';
import { putStems } from './cache';

export type ToSeparation = {
  method: 'dsp' | 'htdemucs';
  channels: Float32Array[];
  sampleRate: number;
  modelUrl?: string;
  /**
   * Skip the WebGPU attempt entirely. Used on a retry in a fresh worker:
   * a failed WebGPU attempt can poison this worker's shared WASM backend
   * init (see ort-fallback.ts), so the retry must not repeat it.
   */
  wasmOnly?: boolean;
  /** Beat positions, when analysis is done: the vocal seam penalty is computed here. */
  beats?: number[];
  /** File hash: HTDemucs results are cached in IndexedDB from here. */
  hash?: string;
};
export type FromSeparation =
  | { type: 'progress'; stage: string; fraction: number }
  | { type: 'done'; stems: Stems; backend: string; vocalPenalty?: Float32Array }
  | { type: 'error'; message: string };

const post = (m: FromSeparation, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

const MODEL_CACHE = 'stems-models-v1';

/** Fetch the model once and keep it in Cache Storage (it is ~180 MB). */
async function loadModel(url: string): Promise<ArrayBuffer> {
  const cache = typeof caches !== 'undefined' ? await caches.open(MODEL_CACHE).catch(() => null) : null;
  const hit = await cache?.match(url);
  if (hit) {
    post({ type: 'progress', stage: 'Loading cached model', fraction: 0 });
    return hit.arrayBuffer();
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Model download failed (${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    if (total) post({ type: 'progress', stage: `Downloading model (${Math.round(got / 1e6)} / ${Math.round(total / 1e6)} MB)`, fraction: got / total });
  }
  const buf = new Uint8Array(got);
  let o = 0;
  for (const p of parts) { buf.set(p, o); o += p.length; }
  await cache?.put(url, new Response(buf, { headers: { 'content-type': 'application/octet-stream' } })).catch(() => {});
  return buf.buffer;
}

async function htdemucsRunner(modelUrl: string, wasmOnly = false): Promise<{ runner: DemucsRunner; backend: string }> {
  const ort = await import('onnxruntime-web/webgpu');
  ort.env.wasm.numThreads = (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1)) : 1; // leave a core for the audio thread
  const model = await loadModel(modelUrl);
  post({ type: 'progress', stage: 'Starting model', fraction: 0 });
  let session: Awaited<ReturnType<typeof ort.InferenceSession.create>> | null = null;
  let backend = 'wasm';
  // `navigator.gpu` can exist without a usable adapter (headless, blocklisted
  // GPUs), and creating a WebGPU session then hangs instead of failing: only
  // try it with a real adapter, and never wait on it forever.
  type Adapter = { isFallbackAdapter?: boolean; info?: Record<string, string> };
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(o?: object): Promise<Adapter | null> } }).gpu;
  const adapter = !wasmOnly && gpu ? await gpu.requestAdapter({ powerPreference: 'high-performance' }).catch(() => null) : null;
  // Software rasterisers (SwiftShader, llvmpipe) are far slower than WASM for this model.
  // (GPUAdapterInfo fields are prototype getters, so read them by name.)
  const info = adapter?.info;
  const desc = info ? [info.vendor, info.architecture, info.device, info.description, info.type].join(' ') : '';
  const software = !!adapter && (adapter.isFallbackAdapter || /swiftshader|llvmpipe|software|cpu/i.test(desc));
  if (adapter && !software) {
    try {
      session = await Promise.race([
        ort.InferenceSession.create(model, { executionProviders: ['webgpu'] }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('WebGPU init timed out')), 60_000)),
      ]);
      backend = 'webgpu';
    } catch (err) {
      // Do not swallow this: if the failure happened inside initWasm, this
      // worker's WASM backend is now poisoned and the create below will
      // only report "previous call to 'initWasm()' failed". The caller
      // retries in a fresh worker with wasmOnly set (see ort-fallback.ts).
      session = null;
      post({ type: 'progress', stage: `WebGPU start failed (${err instanceof Error ? err.message : String(err)}); trying WASM`, fraction: 0 });
    }
  }
  session ??= await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
  const s = session;
  post({ type: 'progress', stage: `Model ready (${backend === 'webgpu' ? 'WebGPU' : `WASM × ${ort.env.wasm.numThreads} threads`})`, fraction: 0 });
  return {
    backend,
    runner: {
      async run(input, spec) {
        const r = await s.run({
          input: new ort.Tensor('float32', input, [1, 2, SEGMENT]),
          x: new ort.Tensor('float32', spec, [1, 4, 2048, 336]),
        });
        const [specOut, waveOut] = s.outputNames.map((n) => r[n]);
        return { spec: (await specOut.getData()) as Float32Array, wave: (await waveOut.getData()) as Float32Array };
      },
    },
  };
}

self.onmessage = async (e: MessageEvent<ToSeparation>) => {
  const { method, channels, sampleRate, modelUrl, wasmOnly, beats, hash } = e.data;
  try {
    let stems: Stems;
    let backend = 'js';
    if (method === 'htdemucs') {
      if (!modelUrl) throw new Error('No model URL configured');
      const r = await htdemucsRunner(modelUrl, wasmOnly);
      backend = r.backend;
      stems = await separateHtdemucs(channels, sampleRate, r.runner, (f, detail) => post({ type: 'progress', stage: `HTDemucs (${backend}) · ${detail ?? ''}`, fraction: f }));
    } else {
      stems = separateDsp(channels, sampleRate, (f) => post({ type: 'progress', stage: 'Separating (DSP)', fraction: f }));
    }
    // Everything heavy happens here rather than on the page's main thread,
    // where it would freeze the UI for a second or more on a phone.
    post({ type: 'progress', stage: 'Finishing', fraction: 1 });
    if (method === 'htdemucs' && hash) await putStems(hash, sampleRate, stems).catch(() => {});
    const vi = stems.names.indexOf('vocals');
    const vocalPenalty = beats && stems.hasVocals && vi >= 0 ? vocalBoundaryPenalty(stems.channels[vi], channels, beats, sampleRate) : undefined;
    if ((self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated) {
      // Shared memory: the page and the audio worklet read these directly, no copies.
      const shared = (x: Float32Array) => { const y = new Float32Array(new SharedArrayBuffer(x.byteLength)); y.set(x); return y; };
      stems = { ...stems, channels: stems.channels.map((g) => g.map(shared)) };
      post({ type: 'done', stems, backend, vocalPenalty });
    } else {
      post({ type: 'done', stems, backend, vocalPenalty }, stems.channels.flat().map((c) => c.buffer as ArrayBuffer));
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

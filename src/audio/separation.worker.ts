import { separateHtdemucs, SEGMENT, type DemucsRunner } from '../engine/htdemucs';
import { separateDsp, type Stems } from '../engine/separate';

export type ToSeparation = {
  method: 'dsp' | 'htdemucs';
  channels: Float32Array[];
  sampleRate: number;
  modelUrl?: string;
};
export type FromSeparation =
  | { type: 'progress'; stage: string; fraction: number }
  | { type: 'done'; stems: Stems; backend: string }
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

async function htdemucsRunner(modelUrl: string): Promise<{ runner: DemucsRunner; backend: string }> {
  const ort = await import('onnxruntime-web/webgpu');
  ort.env.wasm.numThreads = (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated ? Math.min(8, navigator.hardwareConcurrency || 4) : 1;
  const model = await loadModel(modelUrl);
  post({ type: 'progress', stage: 'Starting model', fraction: 0 });
  let session: Awaited<ReturnType<typeof ort.InferenceSession.create>> | null = null;
  let backend = 'wasm';
  if ('gpu' in navigator) {
    try {
      session = await ort.InferenceSession.create(model, { executionProviders: ['webgpu'] });
      backend = 'webgpu';
    } catch { session = null; }
  }
  session ??= await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
  const s = session;
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
  const { method, channels, sampleRate, modelUrl } = e.data;
  try {
    let stems: Stems;
    let backend = 'js';
    if (method === 'htdemucs') {
      if (!modelUrl) throw new Error('No model URL configured');
      const r = await htdemucsRunner(modelUrl);
      backend = r.backend;
      stems = await separateHtdemucs(channels, sampleRate, r.runner, (f) => post({ type: 'progress', stage: `Separating with HTDemucs (${backend})`, fraction: f }));
    } else {
      stems = separateDsp(channels, sampleRate, (f) => post({ type: 'progress', stage: 'Separating (DSP)', fraction: f }));
    }
    post({ type: 'done', stems, backend }, stems.channels.flat().map((c) => c.buffer));
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

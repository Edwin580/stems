import { rescoreWithPenalty, type Analysis } from '../engine/analyze';
import { coarseMono, type AudioSource } from '../engine/align';
import { mixdown } from '../engine/dsp';
import { findLoops, type LoopCandidate } from '../engine/loops';
import { DEFAULT_SETTINGS, Planner, type PlannerSettings } from '../engine/planner';
import { bakeLoop, planToLength, renderJumps, type RenderSources } from '../engine/render';
import { vocalBoundaryPenalty, type Stems } from '../engine/separate';
import type { Jump } from '../engine/splicer';
import type { FromAnalysis } from './analysis.worker';
import * as cache from './cache';
import { isBackendInitError } from './ort-fallback';
import type { FromSeparation, ToSeparation } from './separation.worker';
import type { FromWorklet, ToWorklet } from './worklet';
import workletUrl from './worklet.ts?worker&url';

/** How many jumps to keep queued in the worklet ahead of the playhead. */
const QUEUE_AHEAD = 3;

export const DEFAULT_MODEL_URL = 'https://huggingface.co/timcsy/demucs-web-onnx/resolve/main/htdemucs_embedded.onnx';

export interface PlayerEvents {
  onProgress?: (stage: string, fraction: number) => void;
  onAnalysis?: (fromCache: boolean) => void;
  onStemsProgress?: (stage: string, fraction: number) => void;
  onStems?: (stems: Stems, backend: string) => void;
  onJump?: (jump: Jump) => void;
  onEnded?: () => void;
  onSleep?: () => void;
}

export const sharedMemory = () =>
  !!(globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined';

/** Copy into SharedArrayBuffer-backed memory when cross-origin isolated (zero-copy to worklet/workers). */
function shareable(x: Float32Array): Float32Array {
  if (!sharedMemory() || x.buffer instanceof SharedArrayBuffer) return x;
  const y = new Float32Array(new SharedArrayBuffer(x.byteLength));
  y.set(x);
  return y;
}

/**
 * Main-thread controller: decodes audio, runs analysis and separation in
 * workers, owns the Planner, and keeps the AudioWorklet's jump queue topped
 * up. Playback can start as soon as the file is decoded; seams switch on
 * when analysis lands.
 */
export class Player {
  readonly ctx: AudioContext;
  private node!: AudioWorkletNode;
  private master!: GainNode;
  source: AudioSource | null = null;
  analysis: Analysis | null = null;
  planner: Planner | null = null;
  loops: LoopCandidate[] = [];
  stems: Stems | null = null;
  coarse = new Float32Array(0);
  fileHash = '';
  private settings: PlannerSettings = { ...DEFAULT_SETTINGS };
  private queued: Jump[] = [];
  private clearReq = 0;
  private replanning = false;
  private nextSeekId = -1;
  private loadToken = 0;
  events: PlayerEvents = {};

  /** Mixer state, by stem index. */
  gains: number[] = [1];
  locked: boolean[] = [false];
  vocalAware = true;

  private lastPos = 0;
  private lastPosTime = 0;
  stemPositions: number[] = [];
  playing = false;
  private ended = false;
  listenedSec = 0;
  jumpCount = 0;
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  sleepAt = 0;

  private constructor(ctx: AudioContext) { this.ctx = ctx; }

  static async create(): Promise<Player> {
    const ctx = new AudioContext({ latencyHint: 'playback' });
    const p = new Player(ctx);
    await ctx.audioWorklet.addModule(workletUrl);
    p.node = new AudioWorkletNode(ctx, 'stems-splicer', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    p.master = ctx.createGain();
    p.node.connect(p.master).connect(ctx.destination);
    p.node.port.onmessage = (e: MessageEvent<FromWorklet>) => p.onWorklet(e.data);
    return p;
  }

  private send(m: ToWorklet) { this.node.port.postMessage(m); }

  get stemNames(): string[] { return this.stems ? this.stems.names : ['mix']; }

  async loadFile(file: File | Blob): Promise<void> {
    const buf = await file.arrayBuffer();
    const hashP = cache.hashBytes(buf.slice(0));
    const audio = await this.ctx.decodeAudioData(buf);
    const channels = Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, c) => audio.getChannelData(c));
    await this.loadChannels(channels, await hashP);
  }

  async loadChannels(channels: Float32Array[], hash = ''): Promise<void> {
    const token = ++this.loadToken;
    this.stop();
    const sampleRate = this.ctx.sampleRate;
    channels = channels.map(shareable);
    this.source = { channels, sampleRate, length: channels[0].length };
    this.fileHash = hash;
    this.analysis = null;
    this.planner = null;
    this.stems = null;
    this.loops = [];
    this.gains = [1];
    this.locked = [false];
    this.lastPos = 0;
    this.listenedSec = 0;
    this.jumpCount = 0;
    this.ended = false;
    this.send({ type: 'load', groups: [channels], names: ['mix'] });
    this.coarse = coarseMono(this.source);
    this.events.onProgress?.('Decoded — press play any time', 0.05);

    let analysis = hash ? await cache.getAnalysis(hash, sampleRate) : null;
    const fromCache = !!analysis;
    if (!analysis) {
      const mono = mixdown(channels);
      analysis = await new Promise<Analysis>((resolve, reject) => {
        const w = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
        w.onmessage = (e: MessageEvent<FromAnalysis>) => {
          const m = e.data;
          if (m.type === 'progress') this.events.onProgress?.(m.stage, m.fraction);
          else {
            w.terminate();
            if (m.type === 'done') resolve(m.analysis); else reject(new Error(m.message));
          }
        };
        w.onerror = (e) => { w.terminate(); reject(new Error(e.message || 'Analysis worker failed')); };
        w.postMessage({ mono, sampleRate }, [mono.buffer]);
      });
      if (hash) void cache.putAnalysis(hash, sampleRate, analysis);
    }
    if (token !== this.loadToken) return;
    this.analysis = analysis;
    this.send({ type: 'downbeats', downbeats: this.downbeats() });
    this.events.onProgress?.('Finding loops', 0.97);
    this.settings = { ...DEFAULT_SETTINGS, threshold: analysis.suggestedThreshold };
    this.rebuild();
    this.events.onAnalysis?.(fromCache);
  }

  private downbeats(): Int32Array {
    const a = this.analysis!;
    const m = a.meter.beatsPerBar;
    return Int32Array.from(a.beats.filter((_, i) => (((i - a.meter.phase) % m) + m) % m === 0));
  }

  /** (Re)build loops and the planner from the current analysis; keeps settings. */
  private rebuild() {
    const a = this.analysis!, src = this.source!;
    const fade = Math.round(this.settings.fadeSec * src.sampleRate);
    const prev = this.settings.loop;
    this.loops = findLoops(a, src, this.coarse, { minBeats: 8 * a.meter.beatsPerBar, maxCandidates: 8, lengthBias: 0.04, fade, autoFade: this.settings.autoFade });
    const same = prev && this.loops.find((l) => l.startBeat === prev.startBeat && l.endBeat === prev.endBeat);
    this.settings.loop = same ?? (prev && this.settings.mode === 'loop' ? prev : this.loops[0] ?? null);
    this.planner = new Planner(a, src, this.coarse, this.settings);
    this.replan();
  }

  private onWorklet(m: FromWorklet) {
    switch (m.type) {
      case 'pos':
        if (this.playing && m.playing) this.listenedSec += Math.max(0, m.time - this.lastPosTime);
        this.lastPos = m.pos;
        this.lastPosTime = m.time;
        this.playing = m.playing;
        this.stemPositions = m.stemPos;
        break;
      case 'jumped': {
        const idx = this.queued.findIndex((j) => j.id === m.id);
        const jump = idx >= 0 ? this.queued[idx] : null;
        if (idx >= 0) this.queued.splice(0, idx + 1);
        if (m.id > 0) this.jumpCount++;
        if (jump) this.events.onJump?.(jump);
        this.topUp();
        break;
      }
      case 'ended':
        this.playing = false;
        this.ended = true;
        this.events.onEnded?.();
        break;
      case 'cleared':
        if (m.req !== this.clearReq || !this.planner) return;
        this.replanning = false;
        this.queued = [];
        this.planner.resetFrom(m.pos);
        this.topUp();
        break;
    }
  }

  private topUp() {
    if (!this.planner || this.replanning) return;
    const fresh: Jump[] = [];
    while (this.queued.length < QUEUE_AHEAD) {
      const j = this.planner.next();
      if (!j) break;
      this.queued.push(j);
      fresh.push(j);
    }
    if (fresh.length) this.send({ type: 'enqueue', jumps: fresh });
  }

  /** Drop queued jumps and plan again from the current position. */
  replan() {
    if (!this.planner) return;
    this.replanning = true;
    this.send({ type: 'clear', req: ++this.clearReq });
  }

  get currentSettings(): PlannerSettings { return this.settings; }

  updateSettings(s: Partial<PlannerSettings>) {
    const fadeChanged = (s.fadeSec !== undefined && s.fadeSec !== this.settings.fadeSec) || (s.autoFade !== undefined && s.autoFade !== this.settings.autoFade);
    this.settings = { ...this.settings, ...s };
    if (!this.planner) return;
    if (fadeChanged) { this.rebuild(); return; }
    this.planner.update(s);
    this.replan();
  }

  async play() {
    if (!this.source) return;
    if (this.ctx.state !== 'running') await this.ctx.resume();
    if (!this.sleepAt) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(1, this.ctx.currentTime);
    }
    if (this.ended) {
      this.ended = false;
      this.seek(0);
    }
    this.playing = true;
    this.lastPosTime = this.ctx.currentTime;
    this.send({ type: 'play' });
  }

  pause() { this.send({ type: 'pause' }); }

  stop() {
    this.pause();
    this.queued = [];
  }

  /** Click-free seek to a sample position, then continue planning from there. */
  seek(sample: number) {
    if (!this.source) return;
    const fade = Math.round(0.03 * this.ctx.sampleRate);
    const to = Math.max(fade, Math.min(this.source.length - 1, sample));
    this.send({ type: 'seek', to, fade, id: this.nextSeekId-- });
    // A seek supersedes any in-flight replan.
    this.clearReq++;
    this.replanning = false;
    this.queued = [];
    this.planner?.resetFrom(to);
    this.lastPos = to;
    this.topUp();
  }

  /** Playhead estimate for drawing, extrapolated from the last report. */
  position(): number {
    if (!this.playing) return this.lastPos;
    const dt = Math.max(0, this.ctx.currentTime - this.lastPosTime);
    return this.lastPos + Math.min(dt, 0.1) * this.ctx.sampleRate;
  }

  get queue(): readonly Jump[] { return this.queued; }

  // ---- Stems ----------------------------------------------------------------

  async separate(method: 'dsp' | 'htdemucs', modelUrl = DEFAULT_MODEL_URL): Promise<void> {
    if (!this.source) return;
    const src = this.source;
    const token = this.loadToken;
    let stems = method === 'htdemucs' && this.fileHash ? await cache.getStems(this.fileHash, src.sampleRate, method) : null;
    let backend = 'cache';
    if (!stems) {
      const runWorker = (wasmOnly: boolean) => new Promise<{ stems: Stems; backend: string }>((resolve, reject) => {
        const w = new Worker(new URL('./separation.worker.ts', import.meta.url), { type: 'module' });
        w.onmessage = (e: MessageEvent<FromSeparation>) => {
          const m = e.data;
          if (m.type === 'progress') this.events.onStemsProgress?.(m.stage, m.fraction);
          else {
            w.terminate();
            if (m.type === 'done') resolve({ stems: m.stems, backend: m.backend }); else reject(new Error(m.message));
          }
        };
        w.onerror = (e) => { w.terminate(); reject(new Error(e.message || 'Separation worker failed')); };
        const msg: ToSeparation = { method, channels: src.channels, sampleRate: src.sampleRate, modelUrl, ...(wasmOnly ? { wasmOnly: true } : {}) };
        w.postMessage(msg);
      });
      let res: { stems: Stems; backend: string };
      try {
        res = await runWorker(false);
      } catch (err) {
        // A failed WebGPU attempt poisons the shared onnxruntime backend
        // init for the whole worker (see ort-fallback.ts), so the in-worker
        // WASM fallback is already dead. Retry once in a fresh worker whose
        // first session attempt is WASM-only; the model comes from cache.
        if (method !== 'htdemucs' || !isBackendInitError(err instanceof Error ? err.message : String(err))) throw err;
        this.events.onStemsProgress?.('Backend failed to start — retrying with WASM only', 0);
        res = await runWorker(true);
      }
      stems = res.stems;
      backend = res.backend;
      if (method === 'htdemucs' && this.fileHash) void cache.putStems(this.fileHash, src.sampleRate, stems);
    }
    if (token !== this.loadToken) return;
    stems = { ...stems, channels: stems.channels.map((g) => g.map(shareable)) };
    this.stems = stems;
    this.gains = stems.names.map(() => 1);
    this.locked = stems.names.map(() => false);
    this.send({ type: 'sources', groups: stems.channels, names: stems.names });
    this.applyVocalAwareness();
    this.events.onStems?.(stems, backend);
  }

  /** Re-score seams with (or without) the vocal-activity penalty. */
  setVocalAware(on: boolean) {
    this.vocalAware = on;
    this.applyVocalAwareness();
  }

  private applyVocalAwareness() {
    if (!this.analysis || !this.source) return;
    const vi = this.stems?.hasVocals ? this.stems.names.indexOf('vocals') : -1;
    const pen = this.vocalAware && vi >= 0
      ? vocalBoundaryPenalty(this.stems!.channels[vi], this.source.channels, this.analysis.beats, this.source.sampleRate)
      : undefined;
    if (!pen && !this.analysis.boundaryPenalty) return;
    this.analysis = rescoreWithPenalty(this.analysis, pen);
    this.rebuild();
  }

  setGains(gains: number[]) {
    gains.forEach((g, i) => {
      if (this.gains[i] !== g) this.send({ type: 'gain', index: i, gain: g });
    });
    this.gains = gains.slice();
  }

  /** Lock a stem to a loop (it keeps cycling while the others wander). Never locks every stem. */
  lockStem(index: number, loop: LoopCandidate): boolean {
    const unlocked = this.locked.filter((l) => !l).length;
    if (unlocked <= 1 && !this.locked[index]) return false;
    this.locked[index] = true;
    this.send({ type: 'lock', index, loop: { at: loop.endSample, to: loop.startSample, fade: loop.fade, rho: loop.rho, drift: loop.drift } });
    return true;
  }

  unlockStem(index: number) {
    this.locked[index] = false;
    this.send({ type: 'unlock', index });
  }

  // ---- Sleep timer ------------------------------------------------------------

  /** Fade out over 20 s and pause after `minutes` (0 cancels). */
  setSleep(minutes: number) {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    this.sleepTimer = null;
    this.sleepAt = 0;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(1, this.ctx.currentTime);
    if (minutes <= 0) return;
    const fade = Math.min(20, minutes * 30);
    const ms = minutes * 60_000;
    this.sleepAt = Date.now() + ms;
    this.sleepTimer = setTimeout(() => {
      const t = this.ctx.currentTime;
      this.master.gain.setValueAtTime(1, t);
      this.master.gain.linearRampToValueAtTime(0.0001, t + fade);
      this.sleepTimer = setTimeout(() => {
        this.pause();
        this.sleepAt = 0;
        this.sleepTimer = null;
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.setValueAtTime(1, this.ctx.currentTime + 0.05);
        this.events.onSleep?.();
      }, fade * 1000);
    }, Math.max(0, ms - fade * 1000));
  }

  // ---- Export -------------------------------------------------------------------

  private renderSources(): RenderSources {
    return this.stems
      ? { groups: this.stems.channels, names: this.stems.names, gains: this.gains }
      : { groups: [this.source!.channels], names: ['mix'], gains: this.gains };
  }

  /** One seamless cycle of a loop, through the current mix (stem gains apply). */
  exportLoop(loop: LoopCandidate): Float32Array[] {
    return bakeLoop(this.renderSources(), loop, this.source!.sampleRate);
  }

  /** Endless render; with `realEnding` it finishes on the song's own outro. Returns audio and seam markers. */
  exportEndless(minutes: number, realEnding: boolean): { channels: Float32Array[]; cues: { frame: number; label: string }[]; exact: boolean } {
    const a = this.analysis!, src = this.source!;
    const offline = new Planner(a, src, this.coarse, { ...this.settings, mode: 'endless' }, 1234);
    const sr = src.sampleRate;
    let jumps: Jump[];
    let samples: number;
    let exact = false;
    if (realEnding) {
      const plan = planToLength(offline, minutes * 60);
      jumps = plan.jumps;
      samples = plan.samples;
      exact = plan.exact;
    } else {
      samples = Math.round(minutes * 60 * sr);
      jumps = [];
      offline.resetFrom(0);
      let pos = 0, t = 0;
      for (;;) {
        const j = offline.next();
        if (!j || t + (j.at - pos) > samples) break;
        jumps.push(j);
        t += j.at - pos;
        pos = j.to;
      }
    }
    const channels = renderJumps(this.renderSources(), sr, jumps, samples, exact ? 0 : 2);
    const cues: { frame: number; label: string }[] = [];
    let pos = 0, t = 0;
    for (const j of jumps) {
      t += j.at - pos;
      pos = j.to;
      cues.push({ frame: t, label: `seam ${cues.length + 1}: ${(j.at / sr).toFixed(2)}s -> ${(j.to / sr).toFixed(2)}s` });
    }
    return { channels, cues, exact };
  }
}

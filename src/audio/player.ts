import { rescoreWithPenalty, type Analysis } from '../engine/analyze';
import { coarseMono, type AudioSource } from '../engine/align';
import { mixdown } from '../engine/dsp';
import { findLoops, loopAt, snapLoop, type LoopCandidate } from '../engine/loops';
import { DEFAULT_SETTINGS, Planner, type PlannerSettings } from '../engine/planner';
import { bakeLoop, planToLength, renderJumps, type RenderSources } from '../engine/render';
import { vocalBoundaryPenalty, type Stems } from '../engine/separate';
import type { Jump } from '../engine/splicer';
import type { FromAnalysis } from './analysis.worker';
import { BackgroundOutput } from './background';
import * as cache from './cache';
import { isBackendInitError } from './ort-fallback';
import type { FromSeparation, ToSeparation } from './separation.worker';
import type { FromWorklet, ToWorklet } from './worklet';
import workletUrl from './worklet.ts?worker&url';

/**
 * How many jumps to keep queued in the worklet ahead of the playhead. Generous,
 * so playback never waits on the main thread (which browsers slow down in
 * background tabs).
 */
const QUEUE_AHEAD = 6;

export const DEFAULT_MODEL_URL = 'https://huggingface.co/timcsy/demucs-web-onnx/resolve/main/htdemucs_embedded.onnx';

export interface PlayerEvents {
  onProgress?: (stage: string, fraction: number) => void;
  onAnalysis?: (fromCache: boolean) => void;
  onStemsProgress?: (stage: string, fraction: number) => void;
  onStems?: (stems: Stems, backend: string) => void;
  /** Seams were re-scored (stems arrived or vocal awareness changed): loops may differ. */
  onRescored?: () => void;
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
  /** Taps the output for the Live song map (a spectrum; it changes nothing it hears). */
  analyser!: AnalyserNode;
  private out!: BackgroundOutput;
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
    p.node.connect(p.master);
    p.analyser = ctx.createAnalyser();
    p.analyser.fftSize = 2048;
    p.analyser.smoothingTimeConstant = 0.78;
    p.master.connect(p.analyser);
    p.out = new BackgroundOutput(ctx, p.master);
    p.node.port.onmessage = (e: MessageEvent<FromWorklet>) => p.onWorklet(e.data);
    return p;
  }

  private send(m: ToWorklet) { this.node.port.postMessage(m); }

  get stemNames(): string[] { return this.stems ? this.stems.names : ['mix']; }

  /**
   * Stop and forget the current song. Anything still running for it
   * (decode, analysis, separation) sees a stale token and is dropped.
   */
  reset() {
    this.loadToken++;
    this.stop();
    for (const w of this.workers) w.terminate();
    this.workers.clear();
    this.source = null;
    this.analysis = null;
    this.planner = null;
    this.stems = null;
    this.vocalPenalty = null;
    this.lyricPenalty = null;
  }
  /** Separation workers in flight, terminated by reset(). */
  private workers = new Set<Worker>();

  async loadFile(file: File | Blob): Promise<void> {
    const token = ++this.loadToken;
    const buf = await file.arrayBuffer();
    const hashP = cache.hashBytes(buf.slice(0));
    const audio = await this.ctx.decodeAudioData(buf);
    const hash = await hashP;
    if (token !== this.loadToken) return;
    const channels = Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, c) => audio.getChannelData(c));
    await this.loadChannels(channels, hash, token);
  }

  async loadChannels(channels: Float32Array[], hash = '', token = ++this.loadToken): Promise<void> {
    this.stop();
    const sampleRate = this.ctx.sampleRate;
    channels = channels.map(shareable);
    this.source = { channels, sampleRate, length: channels[0].length };
    this.fileHash = hash;
    this.analysis = null;
    this.planner = null;
    this.stems = null;
    this.vocalPenalty = null;
    this.lyricPenalty = null;
    this.lastShown = 0;
    this.recentJump = null;
    this.loops = [];
    this.gains = [1];
    this.locked = [false];
    this.lastPos = 0;
    this.listenedSec = 0;
    this.jumpCount = 0;
    this.ended = false;
    this.send({ type: 'load', groups: [channels], names: ['mix'] });
    this.coarse = coarseMono(this.source);
    this.events.onProgress?.('Decoded', 0.05);

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
    // Stems or lyrics that arrived before the analysis.
    if (this.stems || this.lyricPenalty) void this.applyVocalAwareness();
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
    // A section or handle loop isn't among the candidates: rebuild it with the current fade.
    this.settings.loop = same ?? (prev && this.settings.mode === 'loop' ? loopAt(a, src, this.coarse, prev.startBeat, prev.endBeat, fade, this.settings.autoFade) : this.loops[0] ?? null);
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
        if (jump) { this.recentJump = { time: m.time, at: jump.at }; this.lastShown = 0; }
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

  // ---- Section (start/end handles) ------------------------------------------

  /** Beats a section may start or end on: every downbeat, plus the song's first and last beat. */
  sectionStops(): number[] {
    const a = this.analysis;
    if (!a) return [];
    const n = a.beats.length;
    const stops = new Set<number>([0, n - 1]);
    for (const d of this.downbeatIndices()) if (d < n - 1) stops.add(d);
    return [...stops].sort((x, y) => x - y);
  }

  private downbeatIndices(): number[] {
    const a = this.analysis!;
    const m = a.meter.beatsPerBar;
    return a.beats.map((_, i) => i).filter((i) => (((i - a.meter.phase) % m) + m) % m === 0);
  }

  /**
   * Move section ends (by whole bars, at most two) to the cleanest seam
   * nearby. On by default; off loops exactly the chosen bars.
   */
  seamless = true;

  /** A verified loop over this section (snapped to a clean seam when `seamless`). */
  loopFor(range: { start: number; end: number }, snap = this.seamless): LoopCandidate {
    const fade = Math.round(this.settings.fadeSec * this.source!.sampleRate);
    return snap
      ? snapLoop(this.analysis!, this.source!, this.coarse, range.start, range.end, fade, this.settings.autoFade)
      : loopAt(this.analysis!, this.source!, this.coarse, range.start, range.end, fade, this.settings.autoFade);
  }

  /**
   * Keep playback inside beats [start, end), or the whole song (null). Loop
   * mode loops exactly that section; Endless wanders inside it. Returns the
   * section's end-to-start seam (after snapping), or null for the whole song.
   */
  setSection(range: { start: number; end: number } | null, loop?: LoopCandidate): LoopCandidate | null {
    if (!this.analysis || !this.planner) return null;
    // In Loop mode, "no section" means looping the whole song end to start.
    const whole = { start: 0, end: this.analysis.beats.length - 1 };
    // A hand-picked section repeats through its end-to-start seam in both modes, so snap it once here.
    let snapped: LoopCandidate | null = null;
    if (range && !loop && this.seamless) {
      snapped = this.loopFor(range);
      range = { start: snapped.startBeat, end: snapped.endBeat };
    }
    const next = loop ?? (this.settings.mode === 'loop' ? snapped ?? this.loopFor(range ?? whole) : this.settings.loop);
    this.settings = { ...this.settings, range, loop: next };
    this.planner.update({ range, loop: next });
    const b = this.analysis.beats;
    const pos = this.position();
    if (range && (pos < b[range.start] || pos >= b[range.end] - 0.25 * this.source!.sampleRate)) this.seek(b[range.start]);
    else this.replan();
    return range ? loop ?? snapped ?? (this.settings.mode === 'loop' ? next : null) : null;
  }

  updateSettings(s: Partial<PlannerSettings>) {
    const fadeChanged = (s.fadeSec !== undefined && s.fadeSec !== this.settings.fadeSec) || (s.autoFade !== undefined && s.autoFade !== this.settings.autoFade);
    this.settings = { ...this.settings, ...s };
    if (!this.planner) return;
    if (fadeChanged) { this.rebuild(); return; }
    this.planner.update(s);
    this.replan();
  }

  /** Start playback. Call straight from a click/tap (see BackgroundOutput.start). */
  async play() {
    if (!this.source) return;
    const started = this.out.start();
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
    await started;
  }

  pause() {
    this.send({ type: 'pause' });
    this.out.stop();
  }

  stop() {
    this.pause();
    this.queued = [];
  }

  /** Click-free seek to a sample position, then continue planning from there. */
  seek(sample: number) {
    if (!this.source) return;
    this.lastShown = 0;
    this.recentJump = null;
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
    let x = this.lastPos + Math.min(dt, 0.1) * this.ctx.sampleRate;
    // Reports arrive with a little timing jitter, which made the estimate
    // step back a few ms now and then (and a lyric line flicker at its
    // boundary). Real jumps move much further than this.
    if (x < this.lastShown && this.lastShown - x < 0.05 * this.ctx.sampleRate) x = this.lastShown;
    this.lastShown = x;
    return x;
  }
  private lastShown = 0;
  private recentJump: { time: number; at: number } | null = null;

  /**
   * The sample being heard right now: the play position minus the output
   * latency, including the moments right after a jump, when the speakers are
   * still playing the audio from before it. Lyrics and the playhead follow
   * this, so they line up with the sound rather than run ahead of it.
   */
  audiblePosition(extraLatencySec = 0): number {
    const sr = this.ctx.sampleRate;
    const lat = (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0) + extraLatencySec;
    const now = this.ctx.currentTime - lat;
    const j = this.recentJump;
    if (j && this.playing && now < j.time && j.time - now < 1) return Math.max(0, j.at - (j.time - now) * sr);
    return Math.max(0, this.position() - (this.playing ? lat * sr : 0));
  }

  get queue(): readonly Jump[] { return this.queued; }

  /** Whether output runs through a media element, so it keeps playing in the background. */
  get backgroundCapable(): boolean { return this.out.viaMediaElement; }

  // ---- Stems ----------------------------------------------------------------

  async separate(method: 'dsp' | 'htdemucs', modelUrl = DEFAULT_MODEL_URL): Promise<void> {
    if (!this.source) return;
    const src = this.source;
    const token = this.loadToken;
    let stems = method === 'htdemucs' && this.fileHash ? await cache.getStems(this.fileHash, src.sampleRate, method) : null;
    let backend = 'cache';
    if (!stems) {
      const runWorker = (wasmOnly: boolean) => new Promise<{ stems: Stems; backend: string; vocalPenalty?: Float32Array }>((resolve, reject) => {
        const w = new Worker(new URL('./separation.worker.ts', import.meta.url), { type: 'module' });
        this.workers.add(w);
        w.onmessage = (e: MessageEvent<FromSeparation>) => {
          const m = e.data;
          if (token !== this.loadToken) return;
          if (m.type === 'progress') this.events.onStemsProgress?.(m.stage, m.fraction);
          else {
            w.terminate();
            this.workers.delete(w);
            if (m.type === 'done') resolve({ stems: m.stems, backend: m.backend, vocalPenalty: m.vocalPenalty }); else reject(new Error(m.message));
          }
        };
        w.onerror = (e) => { w.terminate(); this.workers.delete(w); reject(new Error(e.message || 'Separation worker failed')); };
        const msg: ToSeparation = {
          method, channels: src.channels, sampleRate: src.sampleRate, modelUrl, beats: this.analysis?.beats, hash: this.fileHash || undefined,
          ...(wasmOnly ? { wasmOnly: true } : {}),
        };
        w.postMessage(msg);
      });
      let res: { stems: Stems; backend: string; vocalPenalty?: Float32Array };
      try {
        res = await runWorker(false);
      } catch (err) {
        // A failed WebGPU attempt poisons the shared onnxruntime backend
        // init for the whole worker (see ort-fallback.ts), so the in-worker
        // WASM fallback is already dead. Retry once in a fresh worker whose
        // first session attempt is WASM-only; the model comes from cache.
        if (method !== 'htdemucs' || !isBackendInitError(err instanceof Error ? err.message : String(err))) throw err;
        this.events.onStemsProgress?.('Backend failed to start; retrying with WASM', 0);
        res = await runWorker(true);
      }
      if (token !== this.loadToken) return;
      stems = res.stems;
      backend = res.backend;
      this.vocalPenalty = res.vocalPenalty ?? null;
    } else {
      if (token !== this.loadToken) return;
      this.vocalPenalty = null;
    }
    // Already shared when the worker produced them; cached stems still need copying.
    stems = { ...stems, channels: stems.channels.map((g) => g.map(shareable)) };
    this.stems = stems;
    this.gains = stems.names.map(() => 1);
    this.locked = stems.names.map(() => false);
    this.send({ type: 'sources', groups: stems.channels, names: stems.names });
    this.events.onStems?.(stems, backend);
    await this.applyVocalAwareness();
  }

  /** Per-beat vocal seam penalty for the current stems, computed by the separation worker. */
  private vocalPenalty: Float32Array | null = null;
  /** Per-beat seam penalty from synced lyrics (keeps jumps between sung lines). */
  private lyricPenalty: Float32Array | null = null;

  /** Use synced lyrics to keep jumps between sung lines (null clears it). */
  setLyricPenalty(pen: Float32Array | null): Promise<void> {
    this.lyricPenalty = pen;
    return this.applyVocalAwareness();
  }

  /** Re-score seams with (or without) the vocal-activity penalty. */
  setVocalAware(on: boolean): Promise<void> {
    this.vocalAware = on;
    return this.applyVocalAwareness();
  }

  /** Split into short steps so the page stays responsive (each is ~100 ms on a desktop). */
  private async applyVocalAwareness(): Promise<void> {
    const tick = () => new Promise((r) => setTimeout(r, 0));
    if (!this.analysis || !this.source) return;
    const vi = this.stems?.hasVocals ? this.stems.names.indexOf('vocals') : -1;
    let pen: Float32Array | undefined;
    if (this.vocalAware && vi >= 0) {
      if (!this.vocalPenalty) {
        await tick();
        this.vocalPenalty = vocalBoundaryPenalty(this.stems!.channels[vi], this.source.channels, this.analysis.beats, this.source.sampleRate);
      }
      pen = this.vocalPenalty;
    }
    if (this.lyricPenalty) {
      const lyr = this.lyricPenalty;
      pen = pen ? pen.map((v, i) => Math.max(v, lyr[i] ?? 0)) : lyr;
    }
    if (!pen && !this.analysis.boundaryPenalty) return;
    const token = this.loadToken;
    await tick();
    if (token !== this.loadToken || !this.analysis) return;
    this.analysis = rescoreWithPenalty(this.analysis, pen);
    await tick();
    if (token !== this.loadToken) return;
    this.rebuild();
    this.events.onRescored?.();
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
    const sec = minutes * 60;
    this.sleepAt = Date.now() + sec * 1000;
    // The fade is scheduled on the audio clock now, so it happens on time even
    // when the page is in the background and timers run late.
    const t = this.ctx.currentTime;
    this.master.gain.setValueAtTime(1, t + sec - fade);
    this.master.gain.linearRampToValueAtTime(0.0001, t + sec);
    this.sleepTimer = setTimeout(() => {
      this.pause();
      this.sleepAt = 0;
      this.sleepTimer = null;
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(1, this.ctx.currentTime + 0.2);
      this.events.onSleep?.();
    }, sec * 1000);
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
    // With a section set, the render starts at the section and stays inside it.
    const start = this.settings.range ? a.beats[this.settings.range.start] : 0;
    let jumps: Jump[];
    let samples: number;
    let exact = false;
    if (realEnding && !this.settings.range) {
      const plan = planToLength(offline, minutes * 60);
      jumps = plan.jumps;
      samples = plan.samples;
      exact = plan.exact;
    } else {
      samples = Math.round(minutes * 60 * sr);
      jumps = [];
      offline.resetFrom(start);
      let pos = start, t = 0;
      for (;;) {
        const j = offline.next();
        if (!j || t + (j.at - pos) > samples) break;
        jumps.push(j);
        t += j.at - pos;
        pos = j.to;
      }
    }
    const channels = renderJumps(this.renderSources(), sr, jumps, samples, exact ? 0 : 2, exact ? 0 : start);
    const cues: { frame: number; label: string }[] = [];
    let pos = exact ? 0 : start, t = 0;
    for (const j of jumps) {
      t += j.at - pos;
      pos = j.to;
      cues.push({ frame: t, label: `seam ${cues.length + 1}: ${(j.at / sr).toFixed(2)}s -> ${(j.to / sr).toFixed(2)}s` });
    }
    return { channels, cues, exact };
  }
}

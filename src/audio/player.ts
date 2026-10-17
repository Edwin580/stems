import type { Analysis } from '../engine/analyze';
import { coarseMono, type AudioSource } from '../engine/align';
import { mixdown } from '../engine/dsp';
import { findLoops, type LoopCandidate } from '../engine/loops';
import { DEFAULT_SETTINGS, Planner, type PlannerSettings } from '../engine/planner';
import type { Jump } from '../engine/splicer';
import type { FromAnalysis } from './analysis.worker';
import type { FromWorklet, ToWorklet } from './worklet';
import workletUrl from './worklet.ts?worker&url';

/** How many jumps to keep queued in the worklet ahead of the playhead. */
const QUEUE_AHEAD = 3;

export interface PlayerEvents {
  onProgress?: (stage: string, fraction: number) => void;
  onJump?: (jump: Jump) => void;
  onEnded?: () => void;
  onQueueChange?: (queued: readonly Jump[]) => void;
}

/**
 * Main-thread controller: decodes audio, runs analysis in a worker, owns the
 * Planner, and keeps the AudioWorklet's jump queue topped up.
 */
export class Player {
  readonly ctx: AudioContext;
  private node!: AudioWorkletNode;
  source: AudioSource | null = null;
  analysis: Analysis | null = null;
  planner: Planner | null = null;
  loops: LoopCandidate[] = [];
  coarse = new Float32Array(0);
  private queued: Jump[] = [];
  private clearReq = 0;
  private replanning = false;
  private nextSeekId = -1;
  events: PlayerEvents = {};

  /** Last reported playhead + the audio-clock time it was reported at. */
  private lastPos = 0;
  private lastPosTime = 0;
  playing = false;
  private ended = false;
  listenedSec = 0;
  jumpCount = 0;

  private constructor(ctx: AudioContext) { this.ctx = ctx; }

  static async create(): Promise<Player> {
    const ctx = new AudioContext({ latencyHint: 'playback' });
    const p = new Player(ctx);
    await ctx.audioWorklet.addModule(workletUrl);
    p.node = new AudioWorkletNode(ctx, 'stems-splicer', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    p.node.connect(ctx.destination);
    p.node.port.onmessage = (e: MessageEvent<FromWorklet>) => p.onWorklet(e.data);
    return p;
  }

  private send(m: ToWorklet) { this.node.port.postMessage(m); }

  async loadFile(file: File | Blob): Promise<void> {
    const buf = await file.arrayBuffer();
    const audio = await this.ctx.decodeAudioData(buf);
    const channels = Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, c) => audio.getChannelData(c).slice());
    await this.loadChannels(channels);
  }

  async loadChannels(channels: Float32Array[]): Promise<void> {
    this.stop();
    const sampleRate = this.ctx.sampleRate;
    this.source = { channels, sampleRate, length: channels[0].length };
    this.analysis = null;
    this.planner = null;
    this.send({ type: 'load', channels });
    this.coarse = coarseMono(this.source);
    const mono = mixdown(channels);
    this.analysis = await new Promise<Analysis>((resolve, reject) => {
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
    this.events.onProgress?.('Finding loops', 0.97);
    const fade = Math.round(DEFAULT_SETTINGS.fadeSec * sampleRate);
    this.loops = findLoops(this.analysis, this.source, this.coarse, { minBeats: 8 * this.analysis.meter.beatsPerBar, maxCandidates: 8, lengthBias: 0.04, fade });
    const settings: PlannerSettings = { ...DEFAULT_SETTINGS, threshold: this.analysis.suggestedThreshold, loop: this.loops[0] ?? null };
    this.planner = new Planner(this.analysis, this.source, this.coarse, settings);
    this.lastPos = 0;
    this.listenedSec = 0;
    this.jumpCount = 0;
    this.planner.resetFrom(0);
    this.topUp();
  }

  private onWorklet(m: FromWorklet) {
    switch (m.type) {
      case 'pos':
        if (this.playing && m.playing) this.listenedSec += Math.max(0, m.time - this.lastPosTime);
        this.lastPos = m.pos;
        this.lastPosTime = m.time;
        this.playing = m.playing;
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
    this.events.onQueueChange?.(this.queued);
  }

  /** Drop queued jumps and plan again from the current position. */
  replan() {
    if (!this.planner) return;
    this.replanning = true;
    this.send({ type: 'clear', req: ++this.clearReq });
  }

  updateSettings(s: Partial<PlannerSettings>) {
    if (!this.planner) return;
    this.planner.update(s);
    this.replan();
  }

  async play() {
    if (!this.planner) return;
    if (this.ctx.state !== 'running') await this.ctx.resume();
    if (this.ended) {
      this.ended = false;
      this.seek(0);
    }
    this.playing = true;
    this.lastPosTime = this.ctx.currentTime;
    this.send({ type: 'play' });
  }

  pause() {
    this.send({ type: 'pause' });
  }

  stop() {
    this.pause();
    this.queued = [];
  }

  /** Click-free seek to a sample position, then continue planning from there. */
  seek(sample: number) {
    if (!this.planner || !this.source) return;
    const fade = this.planner.fade;
    const to = Math.max(fade, Math.min(this.source.length - 1, sample));
    this.send({ type: 'seek', to, fade, id: this.nextSeekId-- });
    // A seek supersedes any in-flight replan.
    this.clearReq++;
    this.replanning = false;
    this.queued = [];
    this.planner.resetFrom(to);
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
}

import { alignSeam, type AudioSource } from './align';
import type { Analysis } from './analyze';
import { infiniteCore, pruneToCore } from './graph';
import type { LoopCandidate } from './loops';
import type { Edge } from './similarity';
import type { Jump } from './splicer';

/** Small deterministic PRNG so renders are reproducible from a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PlannerSettings {
  mode: 'endless' | 'loop';
  /** Max transition cost allowed (lower = stricter, fewer but cleaner jumps). */
  threshold: number;
  /** Average bars between jumps in endless mode. */
  barsBetweenJumps: number;
  /** Only jump at bar boundaries. */
  barLock: boolean;
  /** Crossfade length in seconds. */
  fadeSec: number;
  /** Reject seams whose sample-level correlation is below this (unless forced). */
  minRho: number;
  loop: LoopCandidate | null;
}

export const DEFAULT_SETTINGS: PlannerSettings = {
  mode: 'endless',
  threshold: 0.3,
  barsBetweenJumps: 8,
  barLock: true,
  fadeSec: 0.06,
  minRho: 0.2,
  loop: null,
};

/**
 * Decides the future path through the song. It produces a stream of Jumps
 * that the Splicer executes. Endless mode is a random walk on the beat graph
 * restricted to its strongly connected core (so it never runs out of song);
 * loop mode repeats one verified seam.
 */
export class Planner {
  private a: Analysis;
  private src: AudioSource;
  private coarse: Float32Array;
  private s: PlannerSettings;
  private rng: () => number;
  private edges: Edge[][] = [];
  private core = new Uint8Array(0);
  /** Beat index the virtual cursor sits at (start of that beat). */
  private cursor = 0;
  private beatsSinceJump = 0;
  private recentTargets: number[] = [];
  private nextId = 1;
  /** Effective threshold after automatic relaxation. */
  effectiveThreshold = 0;
  coreSize = 0;

  constructor(a: Analysis, src: AudioSource, coarse: Float32Array, settings: PlannerSettings, seed = Date.now()) {
    this.a = a;
    this.src = src;
    this.coarse = coarse;
    this.s = { ...settings };
    this.rng = mulberry32(seed);
    this.rebuildGraph();
  }

  get settings(): PlannerSettings { return this.s; }
  get activeEdges(): Edge[][] { return this.edges; }
  get coreMask(): Uint8Array { return this.core; }

  get fade(): number { return Math.round(this.s.fadeSec * this.a.sampleRate); }

  update(settings: Partial<PlannerSettings>) {
    const thrChanged = settings.threshold !== undefined && settings.threshold !== this.s.threshold;
    this.s = { ...this.s, ...settings };
    if (thrChanged) this.rebuildGraph();
  }

  /** Filter edges by threshold; relax it until a usable infinite core exists. */
  private rebuildGraph() {
    const n = this.a.beats.length;
    let thr = this.s.threshold;
    for (let attempt = 0; attempt < 12; attempt++) {
      const filtered = this.a.edges.map((l) => l.filter((e) => e.cost <= thr));
      const core = infiniteCore(n, filtered);
      let size = 0;
      for (let i = 0; i < n; i++) size += core[i];
      if (size >= Math.min(n * 0.25, 32) || attempt === 11) {
        this.edges = pruneToCore(filtered, core);
        this.core = core;
        this.coreSize = size;
        this.effectiveThreshold = thr;
        return;
      }
      thr *= 1.2;
    }
  }

  beatAtSample(sample: number): number {
    const b = this.a.beats;
    let lo = 0, hi = b.length - 1;
    if (sample <= b[0]) return 0;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (b[mid] <= sample) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  /** Restart planning from a playback position (after seek or settings change). */
  resetFrom(sample: number) {
    const margin = Math.round(0.15 * this.a.sampleRate) + this.fade;
    let b = this.beatAtSample(sample + margin);
    if (this.a.beats[b] < sample + margin) b++;
    this.cursor = Math.min(b, this.a.beats.length - 1);
    this.beatsSinceJump = 0;
  }

  private isBarEnd(i: number): boolean {
    const m = this.a.meter.beatsPerBar;
    return (((i + 1 - this.a.meter.phase) % m) + m) % m === 0;
  }

  private makeJump(from: number, to: number): Jump {
    const at = this.a.beats[from + 1];
    const fade = this.fade;
    const al = alignSeam(this.src, this.coarse, at, this.a.beats[to], fade);
    return { id: this.nextId++, at, to: al.to, fade, rho: al.rho, fromBeat: from, toBeat: to };
  }

  /**
   * Next jump after the cursor, or null if playback should simply run to the
   * end of the song (only possible when no infinite core exists).
   */
  next(): Jump | null {
    if (this.s.mode === 'loop' && this.s.loop) return this.nextLoop(this.s.loop);
    const n = this.a.beats.length;
    const m = this.a.meter.beatsPerBar;
    const expected = Math.max(1, this.s.barsBetweenJumps) * m;
    const minStay = m;
    for (let i = this.cursor; i < n - 1; i++, this.beatsSinceJump++) {
      const out = this.edges[i];
      const forced = this.core[i] === 1 && (i + 1 >= n - 1 || this.core[i + 1] === 0);
      if (!out.length) continue;
      if (!forced) {
        if (this.beatsSinceJump < minStay) continue;
        if (this.s.barLock && !this.isBarEnd(i)) continue;
        // Linearly rising hazard → jump spacing averages `expected` beats.
        const k = this.beatsSinceJump + 1;
        const checksPerBeat = this.s.barLock ? m : 1;
        const p = Math.min(1, (k * Math.PI * checksPerBeat) / (2 * expected * expected));
        if (this.rng() > p) continue;
      }
      const edge = this.chooseEdge(out, forced);
      if (!edge) continue;
      const jump = this.makeJump(edge.from, edge.to);
      if (!forced && jump.rho < this.s.minRho) continue;
      this.recentTargets.push(edge.to);
      if (this.recentTargets.length > 6) this.recentTargets.shift();
      this.cursor = edge.to;
      this.beatsSinceJump = 0;
      return jump;
    }
    return null;
  }

  private chooseEdge(out: Edge[], forced: boolean): Edge | null {
    const fresh = out.filter((e) => !this.recentTargets.some((t) => Math.abs(t - e.to) < 8));
    const pool = fresh.length ? fresh : forced ? out : [];
    if (!pool.length) return null;
    const temp = 0.08;
    const best = pool[0].cost;
    const w = pool.map((e) => Math.exp(-(e.cost - best) / temp));
    let r = this.rng() * w.reduce((x, y) => x + y, 0);
    for (let k = 0; k < pool.length; k++) {
      r -= w[k];
      if (r <= 0) return pool[k];
    }
    return pool[pool.length - 1];
  }

  private nextLoop(loop: LoopCandidate): Jump {
    return {
      id: this.nextId++,
      at: loop.endSample,
      to: loop.startSample,
      fade: this.fade,
      rho: loop.rho,
      fromBeat: loop.endBeat - 1,
      toBeat: loop.startBeat,
    };
  }
}

import type { AudioSource } from './align';
import { buildSeam } from './seam';
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
  /** Reject seams whose spectrum jumps more than this many dB on average (unless forced). */
  maxSpectralDb: number;
  /** Shorten fades around transients, lengthen them on smooth material. */
  autoFade: boolean;
  /** Ramp the level when the two sides of a seam differ in loudness. */
  loudnessMatch: boolean;
  /** 0..1: how strongly to favour jumping at phrase boundaries. */
  phraseBias: number;
  loop: LoopCandidate | null;
  /**
   * Keep playback inside beats [start, end): Endless wanders only within it
   * and jumps from its end back to its start. Null = the whole song.
   */
  range: { start: number; end: number } | null;
}

/** The automatic wrap per analysis (it only depends on the audio and the fade). */
const wrapMemo = new WeakMap<Analysis, Map<string, { start: number; end: number } | null>>();

export const DEFAULT_SETTINGS: PlannerSettings = {
  mode: 'endless',
  threshold: 0.3,
  barsBetweenJumps: 16,
  barLock: true,
  fadeSec: 0.06,
  minRho: 0.6,
  maxSpectralDb: 4.5,
  autoFade: true,
  loudnessMatch: true,
  phraseBias: 0.6,
  loop: null,
  range: null,
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
  /**
   * The part of the song Endless cycles through: the person's section, or
   * the automatic one between the wrap seam's landing and its exit. Null only
   * when no wrap seam exists (falls back to the strongly connected core).
   */
  section: { start: number; end: number } | null = null;
  /** How often each beat has been planned through, for spreading variety jumps. */
  private played = new Float32Array(0);

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
    const rangeChanged = settings.range !== undefined && JSON.stringify(settings.range) !== JSON.stringify(this.s.range);
    this.s = { ...this.s, ...settings };
    if (thrChanged || rangeChanged) this.rebuildGraph();
  }

  /**
   * Endless plays the track through and, near its end, takes the cleanest
   * seam back toward its start (the "wrap"), so it never runs out of music
   * and never gets stuck cycling one region. Extra jumps for variety only use
   * seams under the strictness threshold, at least two bars long, inside the
   * cycle. A section set by the person replaces the automatic cycle.
   */
  private rebuildGraph() {
    const n = this.a.beats.length;
    const thr = this.s.threshold;
    this.played = new Float32Array(n);
    this.section = this.s.range ?? this.autoSection();
    const sec = this.section;
    if (sec) {
      const minHop = 2 * this.a.meter.beatsPerBar;
      this.edges = this.a.edges.map((l, i) => (i >= sec.start && i + 1 < sec.end
        ? l.filter((e) => e.cost <= thr && e.to >= sec.start && e.to < sec.end && Math.abs(e.to - (i + 1)) >= minHop)
        : []));
      // The wrap itself, so the song map draws it.
      const wrapCost = this.a.transitions[(sec.end - 1) * n + sec.start];
      this.edges[sec.end - 1] = [{ from: sec.end - 1, to: sec.start, cost: Number.isFinite(wrapCost) ? wrapCost : 1 }];
      this.core = new Uint8Array(n);
      this.core.fill(1, sec.start, sec.end);
      this.coreSize = sec.end - sec.start;
      this.effectiveThreshold = thr;
      return;
    }
    // No wrap seam at all (very short or unusual material): the strongly
    // connected core of the seam graph, relaxed until it is usable.
    const m = this.a.meter.beatsPerBar;
    let t = thr;
    for (let attempt = 0; attempt < 12; attempt++) {
      const filtered = this.a.edges.map((l) => l.filter((e) => e.cost <= t));
      const core = infiniteCore(n, filtered);
      let size = 0;
      for (let i = 0; i < n; i++) size += core[i];
      const pruned = pruneToCore(filtered, core);
      const exits = pruned.reduce((k, l) => k + l.length, 0);
      if ((size >= Math.min(n * 0.25, 32) && exits >= size / m) || attempt === 11) {
        this.edges = pruned;
        this.core = core;
        this.coreSize = size;
        this.effectiveThreshold = t;
        return;
      }
      t *= 1.2;
    }
  }

  /**
   * The automatic cycle: the best bar-aligned seam from the last part of the
   * track back to its first part. Candidates are ranked by musical cost with
   * a bonus for spanning more of the song, then the best few are checked at
   * sample level (waveform correlation, spectral step).
   */
  private autoSection(): { start: number; end: number } | null {
    const key = `${this.fade}|${this.s.autoFade}`;
    let memo = wrapMemo.get(this.a);
    if (!memo) wrapMemo.set(this.a, (memo = new Map()));
    if (!memo.has(key)) memo.set(key, this.findWrap());
    return memo.get(key)!;
  }

  private findWrap(): { start: number; end: number } | null {
    const a = this.a, n = a.beats.length, T = a.transitions;
    const m = a.meter.beatsPerBar;
    const down = (i: number) => (((i - a.meter.phase) % m) + m) % m === 0;
    if (n < 8 * m) return null;
    const cands: { from: number; to: number; key: number }[] = [];
    for (let e = Math.floor(n * 0.6); e < n - 1; e++) {
      if (!down(e)) continue; // leave at a bar line
      const i = e - 1;
      for (let j = 0; j <= Math.floor(n * 0.4); j++) {
        if (!down(j)) continue;
        const c = T[i * n + j];
        if (!Number.isFinite(c)) continue;
        cands.push({ from: i, to: j, key: c - 0.15 * ((e - j) / n) });
      }
    }
    if (!cands.length) return null;
    cands.sort((x, y) => x.key - y.key);
    let best: { from: number; to: number; score: number } | null = null;
    // The wrap is heard on every cycle: check many candidates and weigh the
    // sample-level match heavily.
    for (const c of cands.slice(0, 40)) {
      const j = this.makeJump(c.from, c.to);
      this.nextId--; // probe only
      const score = c.key + (1 - Math.max(0, j.rho)) * 1.2 + Math.max(0, j.spectralDb - 2.5) * 0.06;
      if (!best || score < best.score) best = { from: c.from, to: c.to, score };
    }
    return best ? { start: best.to, end: best.from + 1 } : null;
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

  /** Build a fully refined jump for an explicit edge (used by render-to-length). */
  seamJump(from: number, to: number): Jump {
    const { spectralDb: _s, ...j } = this.makeJump(from, to);
    return j;
  }

  private makeJump(from: number, to: number): Jump & { spectralDb: number } {
    const at = this.a.beats[from + 1];
    const seam = buildSeam(this.src, this.coarse, at, this.a.beats[to], {
      fade: this.fade,
      autoFade: this.s.autoFade,
      loudnessMatch: this.s.loudnessMatch,
      periodOut: this.a.beatPeriods[from],
      periodIn: this.a.beatPeriods[Math.max(0, to - 1)],
    });
    return {
      id: this.nextId++, at, to: seam.to, fade: seam.fade, rho: seam.rho, drift: seam.drift,
      gainDb: seam.gainDb, gainRamp: Math.round(3 * this.a.sampleRate), fromBeat: from, toBeat: to,
      spectralDb: seam.spectralDb,
    };
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
    const r = this.section;
    // Past the cycle (after a seek into the outro): head back in at the next bar line.
    if (r && this.cursor >= r.end) return this.reenter(this.cursor);
    for (let i = this.cursor; i < n - 1; i++, this.beatsSinceJump++) {
      if (r && i + 1 >= r.end) return this.take(r.end - 1, r.start, this.makeJump(r.end - 1, r.start));
      const out = this.edges[i];
      const forced = this.core[i] === 1 && (i + 1 >= n - 1 || this.core[i + 1] === 0);
      if (!out.length) continue;
      if (!forced) {
        if (this.s.barsBetweenJumps <= 0) continue; // extra jumps off: a straight cycle
        if (this.beatsSinceJump < minStay) continue;
        if (this.s.barLock && !this.isBarEnd(i)) continue;
        // Linearly rising hazard → jump spacing averages `expected` beats.
        const k = this.beatsSinceJump + 1;
        const checksPerBeat = this.s.barLock ? m : 1;
        // Phrase boundaries are the most natural places to leave: boost the
        // hazard there and damp it elsewhere, keeping the mean spacing similar.
        const ph = this.a.phrase[i + 1] ?? 0;
        const phraseMul = 1 + this.s.phraseBias * (3 * ph - 0.5);
        const p = Math.min(1, (phraseMul * k * Math.PI * checksPerBeat) / (2 * expected * expected));
        if (this.rng() > p) continue;
      }
      const edge = this.chooseEdge(out, forced);
      if (!edge) continue;
      const jump = this.makeJump(edge.from, edge.to);
      if (!forced && (jump.rho < this.s.minRho || jump.spectralDb > this.s.maxSpectralDb)) continue;
      return this.take(edge.from, edge.to, jump);
    }
    return null;
  }

  /** From beat `i` outside the cycle, the cleanest seam at the next bar line back into it. */
  private reenter(i: number): Jump {
    const a = this.a, n = a.beats.length, sec = this.section!;
    // Past the last beat (a seek into the fade-out): leave from the last beat that has a successor.
    let from = Math.min(i, n - 2);
    while (from < n - 2 && !this.isBarEnd(from)) from++;
    let to = sec.start, bestCost = Infinity;
    for (let j = sec.start; j < sec.end; j++) {
      const c = a.transitions[from * n + j];
      if (c < bestCost) { bestCost = c; to = j; }
    }
    return this.take(from, to, this.makeJump(from, to));
  }

  private take(from: number, to: number, jump: Jump & { spectralDb: number }): Jump {
    for (let b = Math.max(0, this.cursor); b <= from && b < this.played.length; b++) this.played[b]++;
    this.recentTargets.push(to);
    if (this.recentTargets.length > 6) this.recentTargets.shift();
    this.cursor = to;
    this.beatsSinceJump = 0;
    const { spectralDb: _s, ...plain } = jump;
    return plain;
  }

  private chooseEdge(out: Edge[], forced: boolean): Edge | null {
    const fresh = out.filter((e) => !this.recentTargets.some((t) => Math.abs(t - e.to) < 8));
    const pool = fresh.length ? fresh : forced ? out : [];
    if (!pool.length) return null;
    const temp = 0.08;
    const best = pool[0].cost;
    // Favour landing where the walk has spent the least time, so long
    // listening covers the whole cycle instead of circling one part.
    let least = Infinity;
    for (const e of pool) least = Math.min(least, this.played[e.to] ?? 0);
    const w = pool.map((e) => Math.exp(-(e.cost - best) / temp - ((this.played[e.to] ?? 0) - least)));
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
      fade: loop.fade,
      rho: loop.rho,
      drift: loop.drift,
      fromBeat: loop.endBeat - 1,
      toBeat: loop.startBeat,
    };
  }

  /** Expose the analysis for helpers (render-to-length). */
  get analysis(): Analysis { return this.a; }
}

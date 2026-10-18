import { describe, expect, it, beforeAll } from 'vitest';
import { FFT } from '../src/engine/fft';
import { mixdown } from '../src/engine/dsp';
import { analyze, type Analysis } from '../src/engine/analyze';
import { coarseMono, type AudioSource } from '../src/engine/align';
import { findLoops, loopAt, snapLoop } from '../src/engine/loops';
import { infiniteCore } from '../src/engine/graph';
import { DEFAULT_SETTINGS, Planner } from '../src/engine/planner';
import { crossfadeGains, Splicer } from '../src/engine/splicer';
import { bakeLoop, encodeWav, renderPath } from '../src/engine/render';
import { synthSong, type SynthSong } from '../src/engine/demo';

/** Largest absolute sample-to-sample step: a click shows up as a spike. */
function maxStep(x: Float32Array, from = 1, to = x.length): number {
  let m = 0;
  for (let i = Math.max(1, from); i < to; i++) m = Math.max(m, Math.abs(x[i] - x[i - 1]));
  return m;
}

describe('FFT', () => {
  it('matches a naive DFT', () => {
    const n = 64;
    const fft = new FFT(n);
    const re = new Float64Array(n), im = new Float64Array(n);
    const x = Array.from({ length: n }, (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1));
    x.forEach((v, i) => (re[i] = v));
    fft.transform(re, im);
    for (let k = 0; k < n; k++) {
      let r = 0, q = 0;
      for (let t = 0; t < n; t++) { r += x[t] * Math.cos((-2 * Math.PI * k * t) / n); q += x[t] * Math.sin((-2 * Math.PI * k * t) / n); }
      expect(re[k]).toBeCloseTo(r, 6);
      expect(im[k]).toBeCloseTo(q, 6);
    }
  });
});

describe('crossfade law', () => {
  it('is constant-gain for correlated and equal-power for uncorrelated signals', () => {
    for (const t of [0.1, 0.5, 0.9]) {
      const [a1, b1] = crossfadeGains(t, 1);
      expect(a1 + b1).toBeCloseTo(1, 6);
      const [a0, b0] = crossfadeGains(t, 0);
      expect(a0 * a0 + b0 * b0).toBeCloseTo(1, 6);
    }
  });
});

describe('infiniteCore', () => {
  it('finds the loopable region and excludes the outro', () => {
    // 0→1→…→9 naturally; jump 6→2 makes 2..6 a cycle.
    const edges = Array.from({ length: 10 }, () => [] as { from: number; to: number; cost: number }[]);
    edges[6].push({ from: 6, to: 2, cost: 0.1 });
    const core = infiniteCore(10, edges);
    expect(Array.from(core)).toEqual([0, 0, 1, 1, 1, 1, 1, 0, 0, 0]);
  });
});

describe.each([
  { bpm: 120, sampleRate: 44100, seed: 7 },
  { bpm: 93, sampleRate: 48000, seed: 3 },
])('analysis + playback on a synthetic song ($bpm BPM @ $sampleRate Hz)', (cfg) => {
  let song: SynthSong;
  let a: Analysis;
  let src: AudioSource;
  let coarse: Float32Array;

  beforeAll(() => {
    song = synthSong(cfg);
    a = analyze(mixdown(song.channels), song.sampleRate);
    src = { channels: song.channels, sampleRate: song.sampleRate, length: song.channels[0].length };
    coarse = coarseMono(src);
  });

  it('estimates tempo', () => {
    expect(Math.abs(a.bpm - song.bpm) / song.bpm).toBeLessThan(0.02);
  });

  it('places beats within 20 ms of the truth', () => {
    const errs = a.beats.map((s) => {
      const t = s / song.sampleRate;
      return Math.min(...song.beatTimes.map((b) => Math.abs(b - t)));
    });
    errs.sort((x, y) => x - y);
    expect(errs[Math.floor(errs.length / 2)]).toBeLessThan(0.02);
    expect(a.beats.length).toBeGreaterThan(song.beatTimes.length - 8);
  });

  it('detects 4/4 with the correct downbeat phase', () => {
    expect(a.meter.beatsPerBar).toBe(4);
    const firstBeatIdx = Math.round(a.beats[0] / song.sampleRate / (60 / song.bpm));
    expect((a.meter.phase + firstBeatIdx) % 4).toBe(0);
  });

  it('finds bar-aligned jump candidates between repeated sections', () => {
    const all = a.edges.flat().filter((e) => e.cost < 0.3);
    expect(all.length).toBeGreaterThan(20);
    const aligned = all.filter((e) => (e.from + 1 - e.to) % 4 === 0);
    expect(aligned.length / all.length).toBeGreaterThan(0.9);
  });

  it('finds seamless loops with high waveform correlation', () => {
    const loops = findLoops(a, src, coarse, { minBeats: 16, maxCandidates: 5, lengthBias: 0.05, fade: 2646 });
    expect(loops.length).toBeGreaterThan(0);
    const best = loops[0];
    expect(best.rho).toBeGreaterThan(0.8);
    expect((best.endBeat - best.startBeat) % 4).toBe(0);
  });

  it('endless render never runs out and has no clicks at seams', () => {
    const planner = new Planner(a, src, coarse, { ...DEFAULT_SETTINGS, barsBetweenJumps: 2 }, 42);
    const seconds = song.channels[0].length / song.sampleRate * 3;
    const out = renderPath({ groups: [song.channels], names: ["mix"] }, song.sampleRate, planner, seconds);
    const len = out[0].length;
    // Audio is still playing at the end (energy in the second-to-last 3 s).
    let e = 0;
    for (let i = len - 5 * song.sampleRate; i < len - 2 * song.sampleRate; i++) e += out[0][i] ** 2;
    expect(e).toBeGreaterThan(1);
    // Clicks: no sample step bigger than the source's own largest step.
    expect(maxStep(out[0])).toBeLessThanOrEqual(maxStep(song.channels[0]) * 1.05);
  });

  it('Endless cycles most of the song: wraps from its last part back to its first part', () => {
    const n = a.beats.length;
    const planner = new Planner(a, src, coarse, { ...DEFAULT_SETTINGS }, 5);
    const sec = planner.section!;
    expect(sec).not.toBeNull();
    expect(sec.start).toBeLessThan(n * 0.4);
    expect(sec.end).toBeGreaterThan(n * 0.6);
    planner.resetFrom(0);
    let wraps = 0;
    for (let k = 0; k < 30; k++) {
      const j = planner.next()!;
      expect(j.toBeat!).toBeGreaterThanOrEqual(sec.start);
      expect(j.fromBeat! + 1).toBeLessThanOrEqual(sec.end);
      // Variety jumps are never tiny hops.
      if (!(j.fromBeat === sec.end - 1 && j.toBeat === sec.start)) expect(Math.abs(j.toBeat! - (j.fromBeat! + 1))).toBeGreaterThanOrEqual(2 * a.meter.beatsPerBar);
      else wraps++;
    }
    expect(wraps).toBeGreaterThan(0);
    // After a seek past the cycle, the next jump heads back into it.
    planner.resetFrom(a.beats[Math.min(n - 3, sec.end + 2)]);
    const back = planner.next()!;
    expect(back.toBeat!).toBeGreaterThanOrEqual(sec.start);
    expect(back.toBeat!).toBeLessThan(sec.end);
    // A seek into the tail after the last beat still yields a playable jump.
    planner.resetFrom(src.length - 1);
    const tail = planner.next()!;
    expect(Number.isFinite(tail.at)).toBe(true);
    expect(tail.toBeat!).toBeLessThan(sec.end);
  });

  it('keeps Endless inside a chosen section and wraps from its end to its start', () => {
    const m = a.meter.beatsPerBar;
    const start = m * 2 + a.meter.phase, end = start + m * 8;
    const planner = new Planner(a, src, coarse, { ...DEFAULT_SETTINGS, barsBetweenJumps: 2, range: { start, end } }, 3);
    planner.resetFrom(0);
    let wraps = 0;
    for (let k = 0; k < 40; k++) {
      const j = planner.next()!;
      expect(j.fromBeat! + 1).toBeLessThanOrEqual(end);
      expect(j.toBeat!).toBeGreaterThanOrEqual(start);
      expect(j.toBeat!).toBeLessThan(end);
      if (j.fromBeat === end - 1 && j.toBeat === start) wraps++;
    }
    expect(wraps).toBeGreaterThan(0);
    // A hand-picked section as a loop: verified seam on exactly those beats.
    const loop = loopAt(a, src, coarse, start, end, 2646);
    expect([loop.startBeat, loop.endBeat, loop.bars]).toEqual([start, end, 8]);
    expect(loop.endSample).toBe(a.beats[end]);
    expect(Math.abs(loop.startSample - a.beats[start])).toBeLessThan(0.05 * song.sampleRate);
    // Seamless snapping moves the ends by whole bars, never to a worse seam.
    const off = start + 1; // deliberately off the bar grid's best points
    const raw = loopAt(a, src, coarse, off, off + 8 * a.meter.beatsPerBar, 2646);
    const snapped = snapLoop(a, src, coarse, off, off + 8 * a.meter.beatsPerBar, 2646);
    expect(snapped.cost).toBeLessThanOrEqual(raw.cost + 1e-9);
    expect(Math.abs((snapped.startBeat - off) % a.meter.beatsPerBar)).toBe(0);
    expect(Math.abs((snapped.endBeat - (off + 8 * a.meter.beatsPerBar)) % a.meter.beatsPerBar)).toBe(0);
  });

  it('jumps happen and land where the planner said', () => {
    const planner = new Planner(a, src, coarse, { ...DEFAULT_SETTINGS, barsBetweenJumps: 1 }, 1);
    const sp = new Splicer(song.channels, song.sampleRate);
    sp.setRunning(true);
    const jumps = [planner.next()!, planner.next()!];
    jumps.forEach((j) => sp.enqueue(j));
    const buf = [new Float32Array(128), new Float32Array(128)];
    const seen: number[] = [];
    for (let k = 0; k < 20000 && seen.length < 2; k++) {
      for (const ev of sp.render(buf, 128)) if (ev.type === 'jumped') seen.push(ev.id);
    }
    expect(seen).toEqual(jumps.map((j) => j.id));
  });

  it('seams add no high-frequency energy (no clicks or phasing)', () => {
    const planner = new Planner(a, src, coarse, { ...DEFAULT_SETTINGS, barsBetweenJumps: 1, loudnessMatch: false }, 9);
    const sp = new Splicer(song.channels, song.sampleRate);
    sp.setRunning(true);
    const block = 256;
    const total = song.sampleRate * 120; // long enough for several jumps: the planner now jumps sparingly
    const out = [new Float32Array(total), new Float32Array(total)];
    const seams: { frame: number; jump: ReturnType<Planner['next']> }[] = [];
    const byId = new Map<number, NonNullable<ReturnType<Planner['next']>>>();
    for (let off = 0; off + block <= total; off += block) {
      while (sp.pending().length < 2) { const j = planner.next(); if (!j) break; byId.set(j.id, j); sp.enqueue(j); }
      for (const ev of sp.render(out, block, off)) if (ev.type === 'jumped') seams.push({ frame: off + ev.frame, jump: byId.get(ev.id)! });
    }
    expect(seams.length).toBeGreaterThan(3);
    // Second-difference energy is dominated by clicks and comb-filtering.
    const hf = (x: Float32Array, s0: number, n: number) => {
      let e = 0;
      for (let i = s0 + 1; i < s0 + n - 1; i++) e += (x[i + 1] - 2 * x[i] + x[i - 1]) ** 2;
      return e;
    };
    for (const { frame, jump } of seams) {
      const F = jump!.fade, W = F + 512;
      const got = hf(out[0], frame - F - 256, W);
      const outgoing = hf(song.channels[0], jump!.at - F - 256, W);
      const incoming = hf(song.channels[0], jump!.to - F - 256, W);
      expect(got).toBeLessThanOrEqual(Math.max(outgoing, incoming) * 1.25 + 1e-6);
    }
  });

  it('baked loop wraps without a click', () => {
    const loops = findLoops(a, src, coarse, { minBeats: 16, maxCandidates: 3, lengthBias: 0.05, fade: 2646 });
    const baked = bakeLoop(song.channels, loops[0], song.sampleRate);
    const L = baked[0].length;
    const twice = new Float32Array(L * 2);
    twice.set(baked[0]); twice.set(baked[0], L);
    expect(maxStep(twice, L - 2000, L + 2000)).toBeLessThanOrEqual(maxStep(song.channels[0]) * 1.05);
    const wav = encodeWav(baked, song.sampleRate);
    expect(wav.size).toBe(44 + L * 2 * 2);
  });
});

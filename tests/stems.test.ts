import { beforeAll, describe, expect, it } from 'vitest';
import { analyze, rescoreWithPenalty, type Analysis } from '../src/engine/analyze';
import { synthSong, type SynthSong } from '../src/engine/demo';
import { mixdown, resample } from '../src/engine/dsp';
import { demucsIspec, demucsSpec, SEGMENT, separateHtdemucs, type DemucsRunner } from '../src/engine/htdemucs';
import { separateDsp, vocalBoundaryPenalty, type Stems } from '../src/engine/separate';
import { StemEngine, stemJump } from '../src/engine/stemengine';

const sdr = (est: Float32Array, ref: Float32Array) => {
  let n = 0, e = 0;
  for (let i = 0; i < ref.length; i++) { n += ref[i] ** 2; e += (ref[i] - est[i]) ** 2; }
  return 10 * Math.log10(n / (e + 1e-12));
};

describe('DSP separation', () => {
  let song: SynthSong;
  let stems: Stems;
  beforeAll(() => {
    song = synthSong();
    stems = separateDsp(song.channels, song.sampleRate);
  });

  it('stems sum back to the mix exactly', () => {
    let err = 0;
    for (let i = 0; i < song.channels[0].length; i += 3) {
      let s = 0;
      for (const st of stems.channels) s += st[0][i];
      err = Math.max(err, Math.abs(s - song.channels[0][i]));
    }
    expect(err).toBeLessThan(1e-5);
  });

  it('each stem resembles its ground truth', () => {
    stems.names.forEach((name, i) => expect(sdr(stems.channels[i][0], song.stems[name][0])).toBeGreaterThan(2));
    expect(sdr(stems.channels[2][0], song.stems.vocals[0])).toBeGreaterThan(5);
    expect(stems.hasVocals).toBe(true);
  });

  it('detects mono input and declines to guess vocals', () => {
    const m = song.channels[0].slice(0, song.sampleRate * 5);
    expect(separateDsp([m, m], song.sampleRate).hasVocals).toBe(false);
  });
});

describe('vocal-aware seams', () => {
  let song: SynthSong;
  let a: Analysis;
  let pen: Float32Array;
  beforeAll(() => {
    song = synthSong();
    a = analyze(mixdown(song.channels), song.sampleRate);
    pen = vocalBoundaryPenalty(song.stems.vocals, song.channels, a.beats, song.sampleRate);
  });

  it('penalises beats where the vocal sings and not where it is silent', () => {
    const beatSec = 60 / song.bpm;
    const barOf = (s: number) => Math.floor(s / song.sampleRate / beatSec / 4);
    const vox = song.sections.filter((s) => ['A1', 'B', 'A3'].includes(s.name));
    const inVox = (bar: number) => vox.some((s) => bar >= s.startBar && bar < s.startBar + s.bars);
    let on = 0, onN = 0, off = 0, offN = 0;
    a.beats.forEach((b, i) => { if (inVox(barOf(b))) { on += pen[i]; onN++; } else { off += pen[i]; offN++; } });
    expect(on / onN).toBeGreaterThan(0.15);
    expect(off / offN).toBeLessThan(0.05);
  });

  it('re-scoring moves jumps out of sung passages', () => {
    const r = rescoreWithPenalty(a, pen);
    const meanPen = (an: Analysis) => {
      const es = an.edges.flat().filter((e) => e.cost < an.suggestedThreshold * 1.5);
      return es.reduce((s, e) => s + pen[e.from + 1] + pen[e.to], 0) / Math.max(1, es.length);
    };
    expect(meanPen(r)).toBeLessThan(meanPen(a));
  });
});

describe('StemEngine', () => {
  const SR = 44100;
  const ramp = (n: number, k: number) => new Float32Array(n).map((_, i) => ((i * k) % 1000) / 1000 - 0.5);

  it('renders stems identically to the mix when nothing jumps', () => {
    const n = SR;
    const a = [ramp(n, 1), ramp(n, 3)], b = [ramp(n, 7), ramp(n, 11)];
    const mix = [a[0].map((v, i) => v + b[0][i]), a[1].map((v, i) => v + b[1][i])];
    const e1 = new StemEngine([a, b], ['drums', 'other'], SR);
    const e2 = new StemEngine([mix], ['mix'], SR);
    e1.setRunning(true); e2.setRunning(true);
    const o1 = [new Float32Array(n), new Float32Array(n)], o2 = [new Float32Array(n), new Float32Array(n)];
    e1.render(o1, n); e2.render(o2, n);
    for (let i = 0; i < n; i += 97) expect(o1[0][i]).toBeCloseTo(o2[0][i], 5);
  });

  it('applies per-stem crossfade laws', () => {
    const j = { id: 1, at: 50000, to: 10000, fade: 2646, rho: 0.9 };
    expect(stemJump('drums', j, SR).fade).toBeLessThan(600);
    expect(stemJump('other', j, SR).fade).toBe(5292);
    expect(stemJump('vocals', j, SR).fade).toBe(2646);
  });

  it('mutes a stem smoothly', () => {
    const n = SR;
    const a = [new Float32Array(n).fill(0.5)], b = [new Float32Array(n).fill(0.25)];
    const e = new StemEngine([a, b], ['vocals', 'other'], SR);
    e.setRunning(true);
    e.setGain(0, 0);
    const o = [new Float32Array(n)];
    e.render(o, n);
    expect(o[0][n - 1]).toBeCloseTo(0.25, 5);
    for (let i = 1; i < n; i++) expect(Math.abs(o[0][i] - o[0][i - 1])).toBeLessThan(0.001);
  });

  it('locks a stem to a loop on a downbeat, then re-joins the main path', () => {
    const n = SR * 20;
    const x = [new Float32Array(n).map((_, i) => Math.sin(i / 50))];
    const downbeats = Int32Array.from({ length: 20 }, (_, k) => k * SR);
    const e = new StemEngine([x, x], ['drums', 'other'], SR, downbeats);
    e.setRunning(true);
    const o = [new Float32Array(4096)];
    expect(e.lock(0, { at: SR * 4, to: SR * 2, fade: 500, rho: 1 })).toBe(true);
    expect(e.lock(1, { at: SR * 4, to: SR * 2, fade: 500, rho: 1 })).toBe(false); // never lock everything
    const seen: number[] = [];
    for (let t = 0; t < SR * 12; t += 4096) { e.render(o, 4096); seen.push(e.splicers[0].pos); }
    // After entry (first downbeat ≥ 0.15 s → 1 s), the locked stem stays inside [2 s, 4 s).
    const later = seen.slice(Math.ceil((SR * 1.5) / 4096));
    expect(later.every((p) => p >= SR * 2 - 600 && p < SR * 4 + 4096)).toBe(true);
    expect(e.splicers[1].pos).toBeGreaterThan(SR * 11);
    e.unlock(0);
    for (let t = 0; t < SR; t += 4096) e.render(o, 4096);
    expect(e.isLocked(0)).toBe(false);
    expect(e.splicers[0].pos).toBe(e.splicers[1].pos);
  });

  it('swaps mix → stems mid-playback without a discontinuity', () => {
    const n = SR * 2;
    const a = [ramp(n, 1)], b = [ramp(n, 5)];
    const mix = [a[0].map((v, i) => v + b[0][i])];
    const e = new StemEngine([mix], ['mix'], SR);
    e.setRunning(true);
    const o = [new Float32Array(n)];
    e.render(o, 30000);
    e.replaceSources([a, b], ['drums', 'other']);
    e.render(o, n - 30000, 30000);
    for (let i = 29990; i < 30010; i++) expect(o[0][i]).toBeCloseTo(mix[0][i], 5);
  });
});

describe('HTDemucs adapter (no model needed)', () => {
  it('spec → ispec round-trips the waveform (Demucs STFT conventions)', () => {
    const x = new Float32Array(SEGMENT).map((_, i) => Math.sin(i / 37) * 0.5 + Math.sin(i / 5.3) * 0.2);
    const spec = demucsSpec([x, x]);
    const y = demucsIspec(spec, 0);
    let e = 0, m = 0;
    for (let i = 5000; i < SEGMENT - 5000; i++) { e += (y[i] - x[i]) ** 2; m += x[i] ** 2; }
    expect(10 * Math.log10(m / e)).toBeGreaterThan(60);
  });

  it('chunked overlap-add with an oracle runner returns the input as "other"', async () => {
    // Fake network: spectral branch outputs 0, time branch passes the (normalised) mix into "other".
    const runner: DemucsRunner = {
      async run(input) {
        const wave = new Float32Array(4 * 2 * SEGMENT);
        wave.set(input, 2 * 2 * SEGMENT); // source index 2 = other in Demucs order
        return { spec: new Float32Array(4 * 4 * 2048 * 336), wave };
      },
    };
    const sr = 48000;
    const n = sr * 20;
    const L = new Float32Array(n).map((_, i) => 0.3 * Math.sin(i / 23));
    const st = await separateHtdemucs([L, L], sr, runner);
    const other = st.channels[st.names.indexOf('other')][0];
    expect(sdr(other.subarray(2000, n - 2000), L.subarray(2000, n - 2000))).toBeGreaterThan(30);
  });

  it('resampler preserves a band-limited tone', () => {
    const x = new Float32Array(48000).map((_, i) => Math.sin((2 * Math.PI * 1000 * i) / 48000));
    const y = resample(resample(x, 48000, 44100), 44100, 48000);
    expect(sdr(y.subarray(1000, 47000), x.subarray(1000, 47000))).toBeGreaterThan(40);
  });
});

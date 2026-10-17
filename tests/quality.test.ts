import { describe, expect, it } from 'vitest';
import { analyze } from '../src/engine/analyze';
import { synthSong } from '../src/engine/demo';
import { mixdown } from '../src/engine/dsp';
import { coarseMono, type AudioSource } from '../src/engine/align';
import { buildSeam, chooseFade } from '../src/engine/seam';
import { Splicer } from '../src/engine/splicer';

const SR = 44100;
const src = (ch: Float32Array[]): AudioSource => ({ channels: ch, sampleRate: SR, length: ch[0].length });

describe('tempo-varying music', () => {
  it('tracks beats through a 110 → 126 BPM glide', () => {
    const song = synthSong({ bpm: 110, bpmEnd: 126, sampleRate: SR, seed: 5 });
    const a = analyze(mixdown(song.channels), SR);
    const errs = a.beats.map((s) => Math.min(...song.beatTimes.map((b) => Math.abs(b - s / SR)))).sort((x, y) => x - y);
    expect(errs[Math.floor(errs.length / 2)]).toBeLessThan(0.02);
    expect(errs[Math.floor(errs.length * 0.9)]).toBeLessThan(0.04);
    expect(a.tempoSpread).toBeGreaterThan(1.05);
  });
});

describe('phrase structure', () => {
  it('scores section starts above ordinary bar lines', () => {
    const song = synthSong({ sampleRate: SR });
    const a = analyze(mixdown(song.channels), SR);
    const beatSec = 60 / song.bpm;
    const starts = new Set(song.sections.slice(1).map((s) => s.startBar * 4));
    let on = 0, onN = 0, off = 0, offN = 0;
    a.beats.forEach((s, i) => {
      const trueIdx = Math.round(s / SR / beatSec);
      if (trueIdx % 4 !== 0) return;
      if (starts.has(trueIdx)) { on += a.phrase[i]; onN++; } else { off += a.phrase[i]; offN++; }
    });
    expect(on / onN).toBeGreaterThan(2 * (off / offN));
  });
});

describe('adaptive fade', () => {
  it('shortens the fade so a transient is never half-faded, lengthens it on smooth material', () => {
    const n = SR * 2;
    const smooth = new Float32Array(n).map((_, i) => 0.3 * Math.sin((2 * Math.PI * 220 * i) / SR));
    const base = Math.round(0.06 * SR);
    expect(chooseFade(src([smooth]), SR, SR / 2, base, true)).toBeGreaterThan(base * 1.5);
    const hit = smooth.slice();
    const pos = SR - Math.round(0.03 * SR); // 30 ms before the seam
    for (let i = 0; i < 400; i++) hit[pos + i] += 0.9 * Math.exp(-i / 80) * (i % 2 ? 1 : -1);
    const f = chooseFade(src([hit]), SR, SR / 2, base, true);
    expect(f).toBeLessThan(Math.round(0.03 * SR));
    expect(chooseFade(src([hit]), SR, SR / 2, base, false)).toBe(base);
  });
});

describe('splicer extensions', () => {
  it('varispeed fade lands exactly on the target sample', () => {
    const x = new Float32Array(SR).map((_, i) => i / SR);
    const sp = new Splicer([x], SR);
    sp.setRunning(true);
    sp.enqueue({ id: 1, at: 20000, to: 5000, fade: 1000, rho: 1, drift: 15 });
    const out = [new Float32Array(20100)];
    sp.render(out, 20100);
    // Right after the seam we are exactly at `to`.
    expect(out[0][20000]).toBeCloseTo(x[5000], 6);
    // Ramp is monotone (no discontinuity) through the varispeed fade.
    for (let i = 19000; i < 20100; i++) expect(out[0][i] - out[0][i - 1]).toBeLessThan(0.002);
  });

  it('loudness match ramps the level back to unity', () => {
    const quietLoud = new Float32Array(SR * 4).map((_, i) => (i < SR * 2 ? 0.1 : 0.4) * Math.sin((2 * Math.PI * 330 * i) / SR));
    const s = src([quietLoud]);
    const seam = buildSeam(s, coarseMono(s), SR, SR * 3, { fade: 2000, autoFade: false, loudnessMatch: true });
    expect(seam.gainDb).toBeLessThan(-5.5);
    const sp = new Splicer([quietLoud], SR);
    sp.setRunning(true);
    sp.enqueue({ id: 1, at: SR, to: seam.to, fade: 2000, rho: seam.rho, gainDb: seam.gainDb, gainRamp: SR / 2 });
    const out = [new Float32Array(SR * 3)];
    sp.render(out, SR * 3);
    const peak = (a: number, b: number) => { let m = 0; for (let i = a; i < b; i++) m = Math.max(m, Math.abs(out[0][i])); return m; };
    expect(peak(SR + 100, SR + 1000)).toBeLessThan(0.25); // matched near the seam
    expect(peak(SR * 1.6, SR * 1.9)).toBeGreaterThan(0.38); // back to natural level
  });

  it('flags spectrally mismatched seams', () => {
    const tone = new Float32Array(SR * 2).map((_, i) => 0.3 * Math.sin((2 * Math.PI * 220 * i) / SR));
    const noise = new Float32Array(SR * 2).map((_, i) => 0.3 * Math.sin(i * 12.9898) * Math.sin(i * 78.233));
    const both = new Float32Array(SR * 4);
    both.set(tone);
    both.set(noise, SR * 2);
    const s = src([both]);
    const c = coarseMono(s);
    const same = buildSeam(s, c, SR, SR / 2, { fade: 2000, autoFade: false, loudnessMatch: false });
    const diff = buildSeam(s, c, SR, SR * 3, { fade: 2000, autoFade: false, loudnessMatch: false });
    expect(same.spectralDb).toBeLessThan(2);
    expect(diff.spectralDb).toBeGreaterThan(8);
    expect(diff.penalty).toBeGreaterThan(same.penalty);
  });
});

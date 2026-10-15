import { describe, expect, it } from 'vitest';
import { analyze } from '../src/engine/analyze';
import { coarseMono } from '../src/engine/align';
import { synthSong } from '../src/engine/demo';
import { mixdown } from '../src/engine/dsp';
import { DEFAULT_SETTINGS, Planner } from '../src/engine/planner';
import { encodeWav, planToLength, renderJumps } from '../src/engine/render';
import { decodeShare, encodeShare, scaleLoop } from '../src/engine/share';

describe('render to length with a real ending', () => {
  it('fills ~3 minutes and ends on the song\'s own outro', () => {
    const song = synthSong();
    const a = analyze(mixdown(song.channels), song.sampleRate);
    const src = { channels: song.channels, sampleRate: song.sampleRate, length: song.channels[0].length };
    const planner = new Planner(a, src, coarseMono(src), { ...DEFAULT_SETTINGS, threshold: a.suggestedThreshold }, 3);
    const target = 180;
    const plan = planToLength(planner, target);
    expect(plan.exact).toBe(true);
    // Seams preserve bar phase, so length is quantised to whole bars (2 s here).
    expect(Math.abs(plan.samples / song.sampleRate - target)).toBeLessThan(2);
    const out = renderJumps({ groups: [song.channels], names: ['mix'] }, song.sampleRate, plan.jumps, plan.samples);
    // The last 3 s are the song's own last 3 s (a real ending, not a fade);
    // only a residual loudness-match ramp may still be settling.
    const n = 3 * song.sampleRate;
    const L = song.channels[0];
    let maxDiff = 0;
    for (let k = 1; k <= n; k++) maxDiff = Math.max(maxDiff, Math.abs(out[0][plan.samples - k] - L[L.length - k]));
    expect(maxDiff).toBeLessThan(0.02);
  });
});

describe('WAV metadata', () => {
  const read = async (b: Blob) => new DataView(await b.arrayBuffer());
  const chunks = (v: DataView) => {
    const out: Record<string, number> = {};
    for (let o = 12; o + 8 <= v.byteLength;) {
      const id = String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
      const size = v.getUint32(o + 4, true);
      out[id] = o;
      o += 8 + size + (size & 1);
    }
    return out;
  };

  it('writes a sampler loop (smpl) and seam markers (cue + labels)', async () => {
    const ch = [new Float32Array(1000), new Float32Array(1000)];
    const v = await read(encodeWav(ch, 44100, { loop: { start: 0, end: 1000 }, cues: [{ frame: 100, label: 'seam 1' }, { frame: 600, label: 'seam 2' }] }));
    const c = chunks(v);
    expect(Object.keys(c)).toEqual(['fmt ', 'smpl', 'cue ', 'LIST', 'data']);
    expect(v.getUint32(c.smpl + 8 + 28, true)).toBe(1);
    expect(v.getUint32(c.smpl + 8 + 36 + 12, true)).toBe(999);
    expect(v.getUint32(c['cue '] + 8, true)).toBe(2);
    expect(v.getUint32(c['cue '] + 12 + 24 + 20, true)).toBe(600);
    expect(v.getUint32(c.data + 4, true)).toBe(4000);
    expect(v.getUint32(4, true)).toBe(v.byteLength - 8);
  });

  it('plain files are still 44-byte-header WAVs', async () => {
    const b = encodeWav([new Float32Array(10)], 8000);
    expect(b.size).toBe(44 + 20);
  });
});

describe('share links', () => {
  it('round-trips state and rejects junk', () => {
    const s = { v: 1 as const, h: 'abcdef0123456789', n: 'Tëst — song', mode: 'loop' as const, loop: [1000, 50000] as [number, number], sr: 48000, settings: { bars: 8 }, locks: ['drums'] };
    expect(decodeShare(encodeShare(s))).toEqual(s);
    expect(decodeShare('#share=%%%')).toBeNull();
    expect(decodeShare('#nothing')).toBeNull();
    expect(scaleLoop([48000, 96000], 48000, 44100)).toEqual([44100, 88200]);
  });
});

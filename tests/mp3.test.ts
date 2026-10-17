import { describe, expect, it } from 'vitest';
import { encodeMp3 } from '../src/audio/mp3';
import { id3v23 } from '../src/engine/id3';

/** Read ID3v2.3 text frames back (UTF-16 with BOM) — a minimal reader for the test. */
function readId3(bytes: Uint8Array): { size: number; frames: Record<string, string> } {
  expect(String.fromCharCode(...bytes.subarray(0, 3))).toBe('ID3');
  const size = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
  const frames: Record<string, string> = {};
  const v = new DataView(bytes.buffer, bytes.byteOffset);
  for (let o = 10; o < 10 + size;) {
    const id = String.fromCharCode(...bytes.subarray(o, o + 4));
    const len = v.getUint32(o + 4);
    const p = bytes.subarray(o + 10, o + 10 + len);
    if (id.startsWith('T')) frames[id] = new TextDecoder('utf-16le').decode(p.subarray(3)).replace(/\0+$/, '');
    else if (id === 'WOAS') frames[id] = String.fromCharCode(...p);
    o += 10 + len;
  }
  return { size, frames };
}

describe('MP3 output', () => {
  it('writes ID3v2.3 tags that round-trip unicode', () => {
    const tag = id3v23({ title: 'Café — 東京', artist: 'Björk', sourceUrl: 'https://youtu.be/dQw4w9WgXcQ' });
    const { size, frames } = readId3(tag);
    expect(size).toBe(tag.length - 10);
    expect(frames).toEqual({ TIT2: 'Café — 東京', TPE1: 'Björk', WOAS: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(id3v23({}).length).toBe(0);
  });

  /** Walk MPEG-1 Layer III frames after the tag; returns header facts. */
  async function frames(blob: Blob) {
    const b = new Uint8Array(await blob.arrayBuffer());
    let o = b[0] === 0x49 ? 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]) : 0;
    const rates = [44100, 48000, 32000];
    const kbps = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    const seen: { kbps: number; rate: number; mode: number }[] = [];
    while (o + 4 <= b.length) {
      if (b[o] !== 0xff || (b[o + 1] & 0xfe) !== 0xfa) break; // sync + MPEG-1 + Layer III
      const br = kbps[b[o + 2] >> 4], sr = rates[(b[o + 2] >> 2) & 3], pad = (b[o + 2] >> 1) & 1;
      seen.push({ kbps: br, rate: sr, mode: b[o + 3] >> 6 });
      o += Math.floor((144000 * br) / sr) + pad;
    }
    return { seen, consumedAll: o === b.length };
  }

  it('encodes stereo 44.1 kHz to a valid, tagged 192 kbps stream', async () => {
    const sr = 44100, n = sr * 2;
    const tone = (f: number) => new Float32Array(n).map((_, i) => 0.4 * Math.sin((2 * Math.PI * f * i) / sr));
    const blob = encodeMp3([tone(440), tone(660)], sr, { tags: { title: 'Test', artist: 'stems' } });
    expect(readId3(new Uint8Array(await blob.arrayBuffer())).frames.TIT2).toBe('Test');
    const f = await frames(blob);
    expect(f.consumedAll).toBe(true);
    expect(f.seen.length).toBeGreaterThanOrEqual(Math.floor(n / 1152));
    expect(f.seen.every((h) => h.kbps === 192 && h.rate === 44100 && h.mode !== 3)).toBe(true);
  });

  it('resamples rates MP3 cannot carry and keeps mono as mono', async () => {
    const x = new Float32Array(22050).map((_, i) => Math.sin(i / 7) * 0.3);
    const f = await frames(encodeMp3([x], 22050, { kbps: 128 }));
    expect(f.consumedAll).toBe(true);
    expect(f.seen[0]).toEqual({ kbps: 128, rate: 48000, mode: 3 });
  });
});

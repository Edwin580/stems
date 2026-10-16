import { Mp3Encoder } from '@breezystack/lamejs';
import { resample } from '../engine/dsp';
import { id3v23, type Id3Tags } from '../engine/id3';

/** Sample rates an MPEG-1 Layer III stream can carry. */
const MP3_RATES = [48000, 44100, 32000];

function toInt16(x: Float32Array, from: number, n: number, out: Int16Array): Int16Array {
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, x[from + i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return n === out.length ? out : out.subarray(0, n);
}

/**
 * Encode PCM to a tagged MP3 (CBR, LAME via lamejs). Rates MP3 can't carry
 * are resampled to 48 kHz first. Mono stays mono; more than two channels
 * keep the first two.
 */
export function encodeMp3(
  channels: Float32Array[],
  sampleRate: number,
  opts: { kbps?: number; tags?: Id3Tags; onProgress?: (f: number) => void } = {},
): Blob {
  let chs = channels.slice(0, 2);
  let sr = sampleRate;
  if (!MP3_RATES.includes(sr)) {
    chs = chs.map((c) => resample(c, sr, 48000));
    sr = 48000;
  }
  const stereo = chs.length > 1;
  const enc = new Mp3Encoder(stereo ? 2 : 1, sr, opts.kbps ?? 192);
  const BLOCK = 1152 * 16;
  const l16 = new Int16Array(BLOCK), r16 = new Int16Array(BLOCK);
  const parts: BlobPart[] = [];
  const tag = id3v23(opts.tags ?? {});
  if (tag.length) parts.push(tag);
  const n = chs[0].length;
  for (let i = 0; i < n; i += BLOCK) {
    const m = Math.min(BLOCK, n - i);
    const out = stereo ? enc.encodeBuffer(toInt16(chs[0], i, m, l16), toInt16(chs[1], i, m, r16)) : enc.encodeBuffer(toInt16(chs[0], i, m, l16));
    if (out.length) parts.push(new Uint8Array(out));
    if ((i / BLOCK) % 16 === 0) opts.onProgress?.(i / n);
  }
  const tail = enc.flush();
  if (tail.length) parts.push(new Uint8Array(tail));
  opts.onProgress?.(1);
  return new Blob(parts, { type: 'audio/mpeg' });
}

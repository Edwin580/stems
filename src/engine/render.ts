import type { LoopCandidate } from './loops';
import type { Planner } from './planner';
import { crossfadeGains, Splicer } from './splicer';

/**
 * Bake one cycle of a loop into a standalone buffer that repeats seamlessly
 * in any player or DAW. The last `fade` samples carry the same crossfade the
 * live engine plays, so cycle N's tail flows into cycle N+1's head.
 */
export function bakeLoop(channels: Float32Array[], loop: LoopCandidate, fade: number, rho = loop.rho): Float32Array[] {
  const at = loop.endSample, to = loop.startSample;
  const L = at - to;
  const F = Math.min(fade, L >> 1);
  return channels.map((ch) => {
    const out = new Float32Array(L);
    out.set(ch.subarray(to, at));
    for (let k = 0; k < F; k++) {
      const [ga, gb] = crossfadeGains((k + 0.5) / F, rho);
      const inIdx = to - F + k;
      out[L - F + k] = ga * ch[at - F + k] + gb * (inIdx >= 0 ? ch[inIdx] : 0);
    }
    return out;
  });
}

/** Offline render of the planner's path from the start of the song. */
export function renderPath(channels: Float32Array[], sampleRate: number, planner: Planner, seconds: number): Float32Array[] {
  const total = Math.round(seconds * sampleRate);
  const sp = new Splicer(channels, sampleRate);
  sp.setRunning(true);
  planner.resetFrom(0);
  const outs = channels.map(() => new Float32Array(total));
  const block = 4096;
  let done = false;
  for (let off = 0; off < total && !done; off += block) {
    while (sp.pending().length < 2) {
      const j = planner.next();
      if (!j) break;
      sp.enqueue(j);
    }
    const n = Math.min(block, total - off);
    const ev = sp.render(outs, n, off);
    if (ev.some((e) => e.type === 'ended')) done = true;
  }
  // Fade the last 2 s so the file doesn't end abruptly.
  const tail = Math.min(total, 2 * sampleRate);
  for (const o of outs) for (let k = 0; k < tail; k++) o[total - tail + k] *= 1 - k / tail;
  return outs;
}

/** 16-bit PCM WAV encoder. */
export function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const nCh = channels.length;
  const len = channels[0].length;
  const dataBytes = len * nCh * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * nCh * 2, true);
  v.setUint16(32, nCh * 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, dataBytes, true);
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < nCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

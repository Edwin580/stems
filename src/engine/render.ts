import type { LoopCandidate } from './loops';
import type { Planner } from './planner';
import { Splicer, type Jump } from './splicer';
import { StemEngine } from './stemengine';

/**
 * Bake one cycle of a loop into a standalone buffer that repeats seamlessly
 * in any player or DAW. Rendered with the live Splicer starting at the loop
 * start: the first cycle already equals the steady state (plain audio from
 * `to`, ending in the seam crossfade), so cycle N's tail flows into N+1's head.
 */
export function bakeLoop(channels: Float32Array[], loop: LoopCandidate, sampleRate: number): Float32Array[] {
  const L = loop.endSample - loop.startSample;
  const sp = new Splicer(channels, sampleRate);
  sp.setRunning(true);
  sp.pos = loop.startSample;
  sp.enqueue({ id: 1, at: loop.endSample, to: loop.startSample, fade: Math.min(loop.fade, L >> 1), rho: loop.rho, drift: loop.drift });
  const outs = channels.map(() => new Float32Array(L));
  sp.render(outs, L);
  return outs;
}

export interface RenderSources {
  groups: Float32Array[][];
  names: string[];
  gains?: number[];
}

/** Offline render of the planner's path from the start of the song, through the full stem engine. */
export function renderPath(src: RenderSources, sampleRate: number, planner: Planner, seconds: number): Float32Array[] {
  const total = Math.round(seconds * sampleRate);
  const eng = new StemEngine(src.groups, src.names, sampleRate);
  src.gains?.forEach((g, i) => eng.setGain(i, g, true));
  eng.setRunning(true);
  planner.resetFrom(0);
  const outs = [new Float32Array(total), new Float32Array(total)];
  const block = 4096;
  for (let off = 0; off < total; off += block) {
    while (eng.pending().length < 2) {
      const j = planner.next();
      if (!j) break;
      eng.enqueue(j);
    }
    const n = Math.min(block, total - off);
    const ev = eng.render(outs, n, off);
    if (ev.some((e) => e.type === 'ended')) break;
  }
  // Fade the last 2 s so the file doesn't end abruptly.
  const tail = Math.min(total, 2 * sampleRate);
  for (const o of outs) for (let k = 0; k < tail; k++) o[total - tail + k] *= 1 - k / tail;
  return outs;
}

/**
 * Plan a path that lasts about `seconds` and finishes on the song's real
 * ending (the outro plays out naturally, no fade).
 *
 * Wander normally (planner.next()) until the remaining time is within a
 * horizon of a few song-lengths, then solve exactly with dynamic
 * programming over (beat, beats remaining): f(b, r) is true if starting at
 * beat b we can play exactly r more beats and arrive at the end, using
 * natural steps b → b+1 and the planner's seams (only at bar ends). The
 * reconstruction prefers natural playback and takes a seam only when needed.
 */
export function planToLength(planner: Planner, seconds: number): { jumps: Jump[]; samples: number; exact: boolean } {
  const a = planner.analysis;
  const sr = a.sampleRate;
  const beats = a.beats;
  const n = beats.length;
  const len = a.length;
  const total = Math.round(seconds * sr);
  const period = [...a.beatPeriods].sort((x, y) => x - y)[n >> 1];
  const tail = len - beats[n - 1]; // last beat to end of file, in samples
  const edges = planner.activeEdges;
  const m = a.meter.beatsPerBar;
  const barEnd = (i: number) => (((i + 1 - a.meter.phase) % m) + m) % m === 0;
  const horizon = 3 * n;

  planner.resetFrom(0);
  const jumps: Jump[] = [];
  let pos = 0, t = 0;
  // Phase 1: wander until the remainder is within the DP horizon.
  while ((total - t - tail) / period > horizon) {
    const j = planner.next();
    if (!j) break;
    jumps.push(j);
    t += j.at - pos;
    pos = j.to;
  }
  // Phase 2: exact DP. f[r * n + b]: from the start of beat b, exactly r beats then the tail.
  const b0 = Math.min(n - 1, planner.beatAtSample(pos + Math.round(period / 4)));
  const startT = t + (beats[b0] - pos);
  const rTarget = Math.round((total - startT - tail) / period);
  const R = Math.max(0, Math.min(horizon + 2 * n, rTarget + n));
  const f = new Uint8Array((R + 1) * n);
  for (let r = 0; r <= R; r++) {
    for (let b = n - 1; b >= 0; b--) {
      if (r === n - 1 - b) { f[r * n + b] = 1; continue; } // play straight to the end
      if (r === 0 || b >= n - 1) continue;
      if (f[(r - 1) * n + b + 1]) { f[r * n + b] = 1; continue; }
      if (barEnd(b)) for (const e of edges[b]) if (f[(r - 1) * n + e.to]) { f[r * n + b] = 1; break; }
    }
  }
  let r = -1;
  for (let d = 0; d <= R && r < 0; d++) {
    for (const c of [rTarget - d, rTarget + d]) if (c >= 0 && c <= R && f[c * n + b0]) { r = c; break; }
  }
  if (r < 0) return { jumps, samples: Math.min(total, t + (len - pos)), exact: false };
  // The current segment plays from `pos` to beats[b0]; continue from b0.
  let b = b0;
  while (r !== n - 1 - b) {
    if (b + 1 < n && f[(r - 1) * n + b + 1]) { b++; r--; continue; }
    const choices = barEnd(b) ? edges[b].filter((e) => f[(r - 1) * n + e.to]) : [];
    const e = choices[0];
    if (!e) break; // unreachable by construction
    const j = planner.seamJump(b, e.to);
    jumps.push(j);
    t += j.at - pos;
    pos = j.to;
    b = e.to;
    r--;
  }
  return { jumps, samples: t + (len - pos), exact: true };
}

/** Render a planned path (from the start of the song) through the stem engine. */
export function renderJumps(src: RenderSources, sampleRate: number, jumps: Jump[], samples: number, fadeOutSec = 0): Float32Array[] {
  const eng = new StemEngine(src.groups, src.names, sampleRate);
  src.gains?.forEach((g, i) => eng.setGain(i, g, true));
  eng.setRunning(true);
  for (const j of jumps) eng.enqueue(j);
  const outs = [new Float32Array(samples), new Float32Array(samples)];
  const block = 8192;
  for (let off = 0; off < samples; off += block) eng.render(outs, Math.min(block, samples - off), off);
  const tail = Math.min(samples, Math.round(fadeOutSec * sampleRate));
  for (const o of outs) for (let k = 0; k < tail; k++) o[samples - tail + k] *= 1 - k / tail;
  return outs;
}

export interface WavMeta {
  /** Sustain loop for samplers (sample frames, end exclusive). */
  loop?: { start: number; end: number };
  /** Cue markers (e.g. every seam), shown in DAWs and editors. */
  cues?: { frame: number; label: string }[];
}

/** 16-bit PCM WAV encoder with optional `smpl` (loop) and `cue `/`LIST adtl` (markers) chunks. */
export function encodeWav(channels: Float32Array[], sampleRate: number, meta: WavMeta = {}): Blob {
  const nCh = channels.length;
  const len = channels[0].length;
  const dataBytes = len * nCh * 2;
  const chunks: Uint8Array[] = [];
  const u8 = (n: number) => { const b = new Uint8Array(n); return { b, v: new DataView(b.buffer) }; };
  const str = (v: DataView, o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };

  const fmt = u8(24);
  str(fmt.v, 0, 'fmt '); fmt.v.setUint32(4, 16, true); fmt.v.setUint16(8, 1, true); fmt.v.setUint16(10, nCh, true);
  fmt.v.setUint32(12, sampleRate, true); fmt.v.setUint32(16, sampleRate * nCh * 2, true);
  fmt.v.setUint16(20, nCh * 2, true); fmt.v.setUint16(22, 16, true);
  chunks.push(fmt.b);

  if (meta.loop) {
    const c = u8(8 + 36 + 24);
    str(c.v, 0, 'smpl'); c.v.setUint32(4, 36 + 24, true);
    c.v.setUint32(8 + 8, Math.round(1e9 / sampleRate), true); // sample period (ns)
    c.v.setUint32(8 + 12, 60, true); // MIDI unity note (middle C)
    c.v.setUint32(8 + 28, 1, true); // one loop
    const lo = 8 + 36;
    c.v.setUint32(lo + 0, 0, true); // cue id
    c.v.setUint32(lo + 4, 0, true); // forward loop
    c.v.setUint32(lo + 8, meta.loop.start, true);
    c.v.setUint32(lo + 12, meta.loop.end - 1, true); // inclusive end
    chunks.push(c.b);
  }

  if (meta.cues?.length) {
    const cues = meta.cues;
    const c = u8(8 + 4 + 24 * cues.length);
    str(c.v, 0, 'cue '); c.v.setUint32(4, 4 + 24 * cues.length, true); c.v.setUint32(8, cues.length, true);
    cues.forEach((q, i) => {
      const o = 12 + 24 * i;
      c.v.setUint32(o, i + 1, true); c.v.setUint32(o + 4, q.frame, true); str(c.v, o + 8, 'data');
      c.v.setUint32(o + 12, 0, true); c.v.setUint32(o + 16, 0, true); c.v.setUint32(o + 20, q.frame, true);
    });
    chunks.push(c.b);
    const labels = cues.map((q, i) => {
      const text = q.label.slice(0, 200) + '\0';
      const size = 4 + text.length;
      const l = u8(8 + size + (size & 1));
      str(l.v, 0, 'labl'); l.v.setUint32(4, size, true); l.v.setUint32(8, i + 1, true); str(l.v, 12, text);
      return l.b;
    });
    const listSize = 4 + labels.reduce((s, b) => s + b.length, 0);
    const list = u8(12);
    str(list.v, 0, 'LIST'); list.v.setUint32(4, listSize, true); str(list.v, 8, 'adtl');
    chunks.push(list.b, ...labels);
  }

  const dataHead = u8(8);
  str(dataHead.v, 0, 'data'); dataHead.v.setUint32(4, dataBytes, true);
  const pcm = new Int16Array(len * nCh);
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < nCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      pcm[i * nCh + c] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
  }
  const metaBytes = chunks.reduce((s, b) => s + b.length, 0);
  const riff = u8(12);
  str(riff.v, 0, 'RIFF'); riff.v.setUint32(4, 4 + metaBytes + 8 + dataBytes, true); str(riff.v, 8, 'WAVE');
  return new Blob([riff.b, ...chunks, dataHead.b, new Uint8Array(pcm.buffer)], { type: 'audio/wav' });
}

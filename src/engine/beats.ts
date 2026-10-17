/**
 * Onset detection, tempo estimation and dynamic-programming beat tracking
 * (after Ellis 2007, "Beat Tracking by Dynamic Programming").
 */

/**
 * Spectral flux on a log-mel spectrogram, mean-removed and std-normalised.
 * The lowest quarter of the mel bands (kick, bass) is weighted up: hi-hats
 * light up many high bands and would otherwise pull the tracker onto
 * off-beats.
 */
export function onsetEnvelope(logMel: Float32Array, frames: number, nMels: number): Float32Array {
  const env = new Float32Array(frames);
  const bandW = Array.from({ length: nMels }, (_, m) => (m < nMels / 4 ? 3 : 1));
  const wSum = bandW.reduce((a, b) => a + b, 0);
  for (let f = 1; f < frames; f++) {
    let acc = 0;
    for (let m = 0; m < nMels; m++) {
      const d = logMel[f * nMels + m] - logMel[(f - 1) * nMels + m];
      if (d > 0) acc += d * bandW[m];
    }
    env[f] = acc / wSum;
  }
  // Remove slow trend (local mean over ~1 s) so loud sections don't dominate.
  const w = 43;
  const detr = new Float32Array(frames);
  let run = 0;
  const pre = new Float64Array(frames + 1);
  for (let i = 0; i < frames; i++) pre[i + 1] = pre[i] + env[i];
  for (let i = 0; i < frames; i++) {
    const a = Math.max(0, i - w), b = Math.min(frames, i + w + 1);
    const mean = (pre[b] - pre[a]) / (b - a);
    detr[i] = Math.max(0, env[i] - mean);
    run += detr[i] * detr[i];
  }
  const std = Math.sqrt(run / frames) || 1;
  for (let i = 0; i < frames; i++) detr[i] /= std;
  return detr;
}

export interface TempoEstimate {
  bpm: number;
  /** Beat period in onset frames (fractional). */
  period: number;
  confidence: number;
}

/**
 * Global tempo from the onset envelope autocorrelation, weighted by a
 * log-normal prior centred on 120 BPM to resolve octave ambiguity.
 */
export function estimateTempo(env: Float32Array, frameRate: number, prior = 120): TempoEstimate {
  const minBpm = 50, maxBpm = 220;
  const minLag = Math.floor((60 * frameRate) / maxBpm);
  const maxLag = Math.ceil((60 * frameRate) / minBpm);
  const n = env.length;
  // Autocorrelation out to twice the longest period so every candidate gets
  // its metrical-support term (otherwise slow tempos are penalised).
  const acMax = Math.min(n - 1, 2 * maxLag + 2);
  const ac = new Float64Array(acMax + 1);
  for (let lag = minLag - 1; lag <= acMax; lag++) {
    let acc = 0;
    for (let i = lag; i < n; i++) acc += env[i] * env[i - lag];
    ac[lag] = acc / (n - lag);
  }
  let best = -Infinity, bestLag = minLag;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * frameRate) / lag;
    const w = Math.exp(-0.5 * (Math.log2(bpm / prior) / 0.9) ** 2);
    // Reward lags whose double also correlates (metrical support).
    const support = 0.5 * (ac[Math.min(acMax, lag * 2)] ?? 0);
    const s = w * (ac[lag] + support);
    if (s > best) { best = s; bestLag = lag; }
  }
  // Parabolic interpolation around the peak for sub-frame period.
  const y0 = ac[bestLag - 1], y1 = ac[bestLag], y2 = ac[bestLag + 1];
  const denom = y0 - 2 * y1 + y2;
  const delta = denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (y0 - y2)) / denom)) : 0;
  const period = bestLag + delta;
  let mean = 0;
  for (let lag = minLag; lag <= maxLag; lag++) mean += ac[lag];
  mean /= maxLag - minLag + 1;
  return { bpm: (60 * frameRate) / period, period, confidence: mean > 0 ? y1 / mean : 0 };
}

/**
 * Ellis DP beat tracker. Returns beat positions in (fractional) onset frames.
 * `tightness` controls how strongly inter-beat intervals stick to the period.
 */
/**
 * Local beat period per onset frame, for music whose tempo drifts (live
 * playing, rubato, DJ-mixed edits). Windowed autocorrelation restricted to
 * ±20% of the global period, median-smoothed, then interpolated per frame.
 * For steady tracks this collapses to (almost exactly) the global period.
 */
export function localPeriods(env: Float32Array, globalPeriod: number, frameRate: number, windowSec = 8, hopSec = 1): Float64Array {
  const n = env.length;
  const out = new Float64Array(n).fill(globalPeriod);
  const win = Math.round(windowSec * frameRate);
  const hop = Math.max(1, Math.round(hopSec * frameRate));
  if (n < win * 1.5) return out;
  const lo = Math.max(2, Math.floor(globalPeriod * 0.8)), hi = Math.ceil(globalPeriod * 1.25);
  const centers: number[] = [];
  const est: number[] = [];
  for (let c = Math.floor(win / 2); c + win / 2 <= n; c += hop) {
    const s = c - Math.floor(win / 2);
    const ac = new Float64Array(hi + 2);
    for (let lag = lo - 1; lag <= hi + 1; lag++) {
      let acc = 0;
      for (let i = s + lag; i < s + win; i++) acc += env[i] * env[i - lag];
      ac[lag] = acc;
    }
    let best = -Infinity, arg = Math.round(globalPeriod);
    for (let lag = lo; lag <= hi; lag++) {
      // Mild pull toward the global period resolves near-ties.
      const w = Math.exp(-0.5 * (Math.log(lag / globalPeriod) / 0.15) ** 2);
      const v = ac[lag] * (0.7 + 0.3 * w);
      if (v > best) { best = v; arg = lag; }
    }
    const y0 = ac[arg - 1], y1 = ac[arg], y2 = ac[arg + 1];
    const den = y0 - 2 * y1 + y2;
    const d = den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (y0 - y2)) / den)) : 0;
    centers.push(c);
    est.push(arg + d);
  }
  if (est.length < 3) return out;
  // Median smoothing over 5 windows.
  const sm = est.map((_, i) => {
    const w = est.slice(Math.max(0, i - 2), Math.min(est.length, i + 3)).sort((a, b) => a - b);
    return w[Math.floor(w.length / 2)];
  });
  let k = 0;
  for (let t = 0; t < n; t++) {
    while (k + 1 < centers.length && centers[k + 1] <= t) k++;
    if (t <= centers[0]) out[t] = sm[0];
    else if (k + 1 >= centers.length) out[t] = sm[sm.length - 1];
    else {
      const f = (t - centers[k]) / (centers[k + 1] - centers[k]);
      out[t] = sm[k] * (1 - f) + sm[k + 1] * f;
    }
  }
  return out;
}

export function trackBeats(env: Float32Array, periodIn: number | Float64Array, tightness = 100): number[] {
  const n = env.length;
  const periods = typeof periodIn === 'number' ? null : periodIn;
  const period = typeof periodIn === 'number' ? periodIn : median(Array.from(periodIn));
  if (n < period * 4) return [];
  // Smooth the onset envelope with a Gaussian of width ~ period/32.
  const sigma = Math.max(1, period / 32);
  const half = Math.ceil(sigma * 3);
  const g: number[] = [];
  for (let i = -half; i <= half; i++) g.push(Math.exp(-0.5 * (i / sigma) ** 2));
  const local = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = -half; k <= half; k++) {
      const j = i + k;
      if (j >= 0 && j < n) acc += env[j] * g[k + half];
    }
    local[i] = acc;
  }
  const score = new Float64Array(n);
  const back = new Int32Array(n).fill(-1);
  for (let t = 0; t < n; t++) {
    const p = periods ? periods[t] : period;
    const lo = Math.round(p / 2), hi = Math.round(p * 2);
    let best = -Infinity, arg = -1;
    for (let tau = t - hi; tau <= t - lo; tau++) {
      if (tau < 0) continue;
      const pen = Math.log((t - tau) / p);
      const s = score[tau] - tightness * pen * pen;
      if (s > best) { best = s; arg = tau; }
    }
    score[t] = local[t] + (arg >= 0 ? Math.max(0, best) : 0);
    back[t] = arg >= 0 && best > 0 ? arg : -1;
  }
  // Last beat: the best-scoring local max in the final period.
  let last = n - 1, lastScore = -Infinity;
  for (let t = Math.max(0, n - Math.ceil(period * 1.5)); t < n; t++) {
    if (score[t] > lastScore) { lastScore = score[t]; last = t; }
  }
  const beats: number[] = [];
  for (let t = last; t >= 0; t = back[t]) {
    beats.push(t);
    if (back[t] < 0) break;
  }
  beats.reverse();
  return trimWeakEdges(beats, local);
}

function median(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

/** Drop leading/trailing beats that sit in near-silence (fade in/out). */
function trimWeakEdges(beats: number[], local: Float64Array): number[] {
  if (beats.length < 8) return beats;
  const vals = beats.map((b) => local[b]);
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const thr = 0.1 * median;
  let s = 0, e = beats.length;
  while (s < e && vals[s] < thr) s++;
  while (e > s && vals[e - 1] < thr) e--;
  return beats.slice(s, e);
}

/**
 * STFT onset detection fires early (the analysis window "sees" an attack
 * before its centre reaches it). Measure that bias against a fine
 * time-domain energy-rise envelope and return the median correction in
 * samples of `x`. Using one global shift keeps beat spacing stable.
 */
export function beatBiasCorrection(x: Float32Array, beatSamples: number[], sampleRate: number): number {
  const hop = Math.max(1, Math.round(0.0015 * sampleRate));
  const win = Math.round(0.01 * sampleRate);
  const nE = Math.floor(x.length / hop);
  const logE = new Float32Array(nE);
  for (let k = 0; k < nE; k++) {
    let acc = 0;
    const s = k * hop;
    for (let i = 0; i < win && s + i < x.length; i++) acc += x[s + i] * x[s + i];
    logE[k] = 10 * Math.log10(acc / win + 1e-9);
  }
  const back = Math.round(0.01 * sampleRate / hop);
  const lo = Math.round(-0.04 * sampleRate / hop), hi = Math.round(0.09 * sampleRate / hop);
  const offsets: number[] = [];
  for (const b of beatSamples) {
    const c = Math.round(b / hop);
    let best = -Infinity, arg = 0;
    for (let l = lo; l <= hi; l++) {
      const k = c + l;
      if (k - back < 0 || k >= nE) continue;
      const rise = logE[k] - logE[k - back];
      if (rise > best) { best = rise; arg = l; }
    }
    // The rise peaks ~one window after the attack starts; step back to the attack.
    if (best > 3) offsets.push(arg * hop + win / 2 - win);
  }
  if (offsets.length < 8) return 0;
  offsets.sort((a, b) => a - b);
  return offsets[Math.floor(offsets.length / 2)];
}

/**
 * Sub-frame refinement: nudge each beat to the onset-envelope centroid within
 * ±1 frame so beat times aren't quantised to the hop size.
 */
export function refineBeatFrames(beats: number[], env: Float32Array): number[] {
  return beats.map((b) => {
    const a = env[b - 1] ?? 0, c = env[b] ?? 0, d = env[b + 1] ?? 0;
    const denom = a - 2 * c + d;
    if (denom >= 0) return b;
    const delta = (0.5 * (a - d)) / denom;
    return b + Math.max(-0.5, Math.min(0.5, delta));
  });
}

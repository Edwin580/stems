import { chroma, dctRows, decimate, frameLoudnessDb, logMel, stft } from './dsp';
import { beatBiasCorrection, estimateTempo, localPeriods, onsetEnvelope, refineBeatFrames, trackBeats } from './beats';
import { beatFeatures } from './features';
import { estimateMeter, footeNovelty, phraseScores, type Meter } from './structure';
import { beatDistanceMatrix, candidateEdges, costQuantile, DEFAULT_TRANSITION_OPTIONS, transitionMatrix, type Edge, type TransitionExtras } from './similarity';

export type { Meter };

export interface Analysis {
  sampleRate: number;
  length: number;
  bpm: number;
  tempoConfidence: number;
  meter: Meter;
  /** Beat start positions in samples at the playback sample rate. */
  beats: number[];
  /** Candidate jumps per source beat (loose threshold; the planner tightens). */
  edges: Edge[][];
  /** Full transition-cost matrix (n*n), +Infinity where invalid. */
  transitions: Float32Array;
  /** Suggested default strictness threshold for this song. */
  suggestedThreshold: number;
  /** Per-beat loudness (dB) for display. */
  beatLoudness: number[];
  /** Beat-to-beat distance matrix (n*n), kept so seams can be re-scored (e.g. once stems exist). */
  distances: Float32Array;
  /** Per-beat phrase-start score 0..1. */
  phrase: Float32Array;
  /** Local beat period (samples) at each beat. */
  beatPeriods: number[];
  /** Ratio of slowest to fastest local tempo (1 = perfectly steady). */
  tempoSpread: number;
  /** Per-beat seam penalty currently applied (e.g. vocal activity), if any. */
  boundaryPenalty?: Float32Array;
}

export type Progress = (stage: string, fraction: number) => void;

/** Full analysis of a mono signal at the playback sample rate. */
export function analyze(mono: Float32Array, sampleRate: number, onProgress: Progress = () => {}): Analysis {
  onProgress('Resampling', 0.02);
  const factor = sampleRate >= 32000 ? Math.round(sampleRate / 22050) || 1 : 1;
  const x = decimate(mono, factor);
  const sr = sampleRate / factor;

  onProgress('Spectrogram', 0.1);
  const hop = 512;
  const spec = stft(x, sr, 2048, hop);

  onProgress('Features', 0.35);
  const nMels = 40;
  const mel = logMel(spec, nMels);
  const mfcc = dctRows(mel, spec.frames, nMels, 13);
  const chr = chroma(spec);
  const loud = frameLoudnessDb(spec);

  onProgress('Onsets', 0.45);
  // Onsets use a short window and finer hop: a long window "sees" attacks
  // up to half a window early, which smears and biases beat times.
  const oHop = 256;
  const oSpec = stft(x, sr, 1024, oHop);
  const oMel = logMel(oSpec, nMels);
  const env = onsetEnvelope(oMel, oSpec.frames, nMels);
  const oRate = sr / oHop;

  onProgress('Tempo', 0.5);
  const tempo = estimateTempo(env, oRate);
  const periods = localPeriods(env, tempo.period, oRate);

  onProgress('Beats', 0.55);
  let oBeats = trackBeats(env, periods);
  oBeats = refineBeatFrames(oBeats, env);
  if (oBeats.length < 16) throw new Error('Could not find a steady beat in this track.');
  // Beat positions in feature-STFT frames.
  const beatFrames = oBeats.map((b) => (b * oHop) / hop);
  const envAtFeatureRate = new Float32Array(spec.frames);
  for (let f = 0; f < spec.frames; f++) {
    const o = Math.round((f * hop) / oHop);
    envAtFeatureRate[f] = Math.max(env[o] ?? 0, env[o + 1] ?? 0);
  }

  onProgress('Beat features', 0.65);
  const bassChr = chroma(spec, 40, 250);
  const feats = beatFeatures(beatFrames, spec.frames, chr, mfcc, loud, envAtFeatureRate, bassChr);
  const n = feats.count;

  onProgress('Self-similarity', 0.72);
  const D = beatDistanceMatrix(feats);

  onProgress('Meter & phrases', 0.8);
  const meter = estimateMeter([
    { values: feats.onset, weight: 0.5 },
    { values: feats.harmonicChange, weight: 1 },
    { values: feats.bassChange, weight: 0.7 },
    { values: footeNovelty(D, n, 4), weight: 0.7 },
  ]);
  const phrase = phraseScores(D, n, meter);

  onProgress('Jump graph', 0.88);
  const scored = scoreTransitions(D, n, meter, { phrase });

  const bias = beatBiasCorrection(x, beatFrames.map((bf) => bf * hop), sr);
  const toSample = (bf: number) => Math.max(0, Math.round((bf * hop + bias) * factor));
  const beats = beatFrames.map(toSample);
  const beatPeriods = beats.map((_, i) => {
    const a = Math.max(0, i - 2), b = Math.min(beats.length - 1, i + 2);
    return (beats[b] - beats[a]) / Math.max(1, b - a);
  });
  const sortedP = [...beatPeriods].sort((p, q) => p - q);
  const pLo = sortedP[Math.floor(sortedP.length * 0.1)], pHi = sortedP[Math.floor(sortedP.length * 0.9)];
  onProgress('Done', 1);
  return {
    sampleRate,
    length: mono.length,
    bpm: (60 * sampleRate) / sortedP[Math.floor(sortedP.length / 2)],
    tempoConfidence: tempo.confidence,
    meter,
    beats,
    ...scored,
    beatLoudness: Array.from({ length: n }, (_, i) => (feats.loudness[i * 2] + feats.loudness[i * 2 + 1]) / 2),
    distances: D,
    phrase,
    beatPeriods,
    tempoSpread: pHi / pLo,
  };
}

/** Transition matrix, loose candidate edges and a suggested strictness. */
export function scoreTransitions(D: Float32Array, n: number, meter: Meter, extras: TransitionExtras) {
  const transitions = transitionMatrix(D, n, { ...DEFAULT_TRANSITION_OPTIONS, beatsPerBar: meter.beatsPerBar }, extras);
  // Loose candidate set; the planner applies the user's strictness.
  const [q01, q05] = costQuantile(transitions, [0.01, 0.05]);
  const edges = candidateEdges(transitions, n, Math.max(q05, 0.55), 8);
  const suggestedThreshold = Math.min(0.45, Math.max(0.12, q01));
  return { transitions, edges, suggestedThreshold };
}

/** Re-score seams with an extra per-beat boundary penalty (e.g. vocal activity from stems). */
export function rescoreWithPenalty(a: Analysis, boundaryPenalty: Float32Array | undefined): Analysis {
  const scored = scoreTransitions(a.distances, a.beats.length, a.meter, { phrase: a.phrase, boundaryPenalty });
  return { ...a, ...scored, boundaryPenalty };
}

import { chroma, dctRows, decimate, frameLoudnessDb, logMel, stft } from './dsp';
import { beatBiasCorrection, estimateTempo, onsetEnvelope, refineBeatFrames, trackBeats } from './beats';
import { beatFeatures, estimateMeter, type Meter } from './features';
import { beatDistanceMatrix, candidateEdges, costQuantile, DEFAULT_TRANSITION_OPTIONS, transitionMatrix, type Edge } from './similarity';

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
  const frameRate = sr / hop;

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

  onProgress('Beats', 0.55);
  let oBeats = trackBeats(env, tempo.period);
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
  const feats = beatFeatures(beatFrames, spec.frames, chr, mfcc, loud, envAtFeatureRate);
  const meter = estimateMeter(feats.novelty);
  const n = feats.count;

  onProgress('Self-similarity', 0.75);
  const D = beatDistanceMatrix(feats);
  const T = transitionMatrix(D, n, { ...DEFAULT_TRANSITION_OPTIONS, beatsPerBar: meter.beatsPerBar });

  onProgress('Jump graph', 0.92);
  // Loose candidate set; the planner applies the user's strictness.
  const [q01, q05] = costQuantile(T, [0.01, 0.05]);
  const edges = candidateEdges(T, n, Math.max(q05, 0.55), 8);
  const suggestedThreshold = Math.min(0.45, Math.max(0.12, q01));

  const bias = beatBiasCorrection(x, beatFrames.map((bf) => bf * hop), sr);
  const toSample = (bf: number) => Math.max(0, Math.round((bf * hop + bias) * factor));
  onProgress('Done', 1);
  return {
    sampleRate,
    length: mono.length,
    bpm: 60 * frameRate / ((beatFrames[beatFrames.length - 1] - beatFrames[0]) / (beatFrames.length - 1)),
    tempoConfidence: tempo.confidence,
    meter,
    beats: beatFrames.map(toSample),
    edges,
    transitions: T,
    suggestedThreshold,
    beatLoudness: Array.from({ length: n }, (_, i) => (feats.loudness[i * 2] + feats.loudness[i * 2 + 1]) / 2),
  };
}

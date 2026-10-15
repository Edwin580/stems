import { mulberry32 } from './planner';

/**
 * Deterministic synthetic "song" with known ground truth: tempo, beat times,
 * bars, section structure, and the individual instrument stems. Stereo.
 *
 * Instruments are routed to stems so separation can be scored:
 *  drums (kick/snare/hats), bass (sine bass), vocals (centre-panned
 *  vibrato melody), other (stereo-wide pads).
 */
export interface SynthSong {
  channels: Float32Array[];
  sampleRate: number;
  bpm: number;
  beatTimes: number[]; // seconds (true, before humanisation)
  sections: { name: string; startBar: number; bars: number }[];
  stems: Record<'drums' | 'bass' | 'vocals' | 'other', Float32Array[]>;
}

export interface SynthOptions {
  bpm?: number;
  /** If set, tempo glides linearly from bpm to bpmEnd across the song. */
  bpmEnd?: number;
  sampleRate?: number;
  seed?: number;
  vocals?: boolean;
}

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

export function synthSong(opts: SynthOptions = {}): SynthSong {
  const bpm = opts.bpm ?? 120;
  const bpmEnd = opts.bpmEnd ?? bpm;
  const sr = opts.sampleRate ?? 44100;
  const rng = mulberry32(opts.seed ?? 7);
  const withVocals = opts.vocals ?? true;
  const A = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]]; // C Am F G
  const B = [[50, 53, 57], [52, 55, 59], [53, 57, 60], [55, 59, 62]]; // Dm Em F G
  const melodyA = [72, 74, 76, 74, 72, 69, 67, 69];
  const sections = [
    { name: 'intro', bars: 2, chords: A, drums: 'light', vox: false },
    { name: 'A1', bars: 8, chords: A, drums: 'full', vox: true },
    { name: 'A2', bars: 8, chords: A, drums: 'full', vox: false },
    { name: 'B', bars: 8, chords: B, drums: 'half', vox: true },
    { name: 'A3', bars: 8, chords: A, drums: 'full', vox: true },
    { name: 'outro', bars: 2, chords: A, drums: 'light', vox: false },
  ];
  const totalBars = sections.reduce((s, x) => s + x.bars, 0);
  const totalBeats = totalBars * 4;
  // Beat start times from a (possibly gliding) tempo.
  const beatTimes: number[] = [];
  let t = 0;
  for (let k = 0; k <= totalBeats; k++) {
    beatTimes.push(t);
    const b = bpm + ((bpmEnd - bpm) * k) / totalBeats;
    t += 60 / b;
  }
  const total = Math.ceil((beatTimes[totalBeats] + 1.5) * sr);
  const mk = () => [new Float32Array(total), new Float32Array(total)];
  const stems = { drums: mk(), bass: mk(), vocals: mk(), other: mk() };
  const add = (stem: Float32Array[], t0: number, dur: number, gl: number, gr: number, fn: (t: number) => number) => {
    const s0 = Math.round(t0 * sr);
    const n = Math.round(dur * sr);
    for (let i = 0; i < n && s0 + i < total; i++) {
      if (s0 + i < 0) continue;
      const v = fn(i / sr);
      stem[0][s0 + i] += v * gl;
      stem[1][s0 + i] += v * gr;
    }
  };
  const out: SynthSong['sections'] = [];
  let bar = 0;
  for (const sec of sections) {
    out.push({ name: sec.name, startBar: bar, bars: sec.bars });
    for (let b = 0; b < sec.bars; b++, bar++) {
      const chord = sec.chords[Math.floor(b / 2) % sec.chords.length];
      const barT = beatTimes[bar * 4];
      const barDur = beatTimes[bar * 4 + 4] - barT;
      // Pads: stereo-wide (detuned + panned per note) so they are not "centre".
      chord.forEach((note, ni) => {
        const f = midiHz(note + 12);
        const pan = [0.2, 0.8, 0.5][ni];
        add(stems.other, barT, barDur, 0.07 * (1 - pan), 0.07 * pan, (tt) =>
          Math.sin(2 * Math.PI * f * tt) * Math.min(1, tt / 0.02) * Math.min(1, (barDur - tt) / 0.02));
        add(stems.other, barT, barDur, 0.03 * pan, 0.03 * (1 - pan), (tt) =>
          Math.sin(2 * Math.PI * f * 1.004 * tt) * Math.min(1, tt / 0.02) * Math.min(1, (barDur - tt) / 0.02));
      });
      for (let k = 0; k < 4; k++) {
        const bi = bar * 4 + k;
        const bt = beatTimes[bi];
        const beatSec = beatTimes[bi + 1] - bt;
        const j = (rng() - 0.5) * 0.006;
        const vel = 0.85 + 0.15 * rng();
        const fb = midiHz(chord[0] - 12);
        add(stems.bass, bt + j, beatSec * 0.9, 0.25 * vel, 0.25 * vel, (tt) => Math.sin(2 * Math.PI * fb * tt) * Math.exp(-tt * 3) * Math.min(1, tt / 0.005));
        if (sec.drums === 'full' || (sec.drums === 'half' && k % 2 === 0) || (sec.drums === 'light' && k === 0)) {
          if (k % 2 === 0) {
            add(stems.drums, bt + j, 0.3, 0.6 * vel, 0.6 * vel, (tt) => Math.sin(2 * Math.PI * (50 * tt + 100 * (1 - Math.exp(-tt * 30)) / 30)) * Math.exp(-tt * 12));
          } else {
            add(stems.drums, bt + j, 0.2, 0.25 * vel, 0.3 * vel, (tt) => (rng() * 2 - 1) * Math.exp(-tt * 25) + 0.3 * Math.sin(2 * Math.PI * 190 * tt) * Math.exp(-tt * 20));
          }
        }
        if (sec.drums !== 'light') {
          for (const h of [0, 0.5]) add(stems.drums, bt + h * beatSec + j, 0.05, 0.06, 0.05, (tt) => (rng() * 2 - 1) * Math.exp(-tt * 80));
        }
        // "Vocal": centre-panned vibrato line with harmonics, one note per beat.
        if (withVocals && sec.vox) {
          const note = melodyA[(b * 4 + k) % melodyA.length] + (sec.name === 'B' ? 2 : 0);
          const f = midiHz(note);
          add(stems.vocals, bt, beatSec * 0.95, 0.12, 0.12, (tt) => {
            const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * tt);
            const ph = 2 * Math.PI * f * vib * tt;
            const env = Math.min(1, tt / 0.03) * Math.min(1, (beatSec * 0.95 - tt) / 0.03);
            return env * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.25 * Math.sin(3 * ph));
          });
        }
      }
    }
  }
  const L = new Float32Array(total), R = new Float32Array(total);
  for (const st of Object.values(stems)) for (let i = 0; i < total; i++) { L[i] += st[0][i]; R[i] += st[1][i]; }
  return { channels: [L, R], sampleRate: sr, bpm, beatTimes: beatTimes.slice(0, totalBeats), sections: out, stems };
}

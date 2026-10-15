import { mulberry32 } from './planner';

/**
 * Deterministic synthetic "song" with known ground truth: tempo, beat times,
 * bars and section structure. Stereo, 44.1 kHz.
 */
export interface SynthSong {
  channels: Float32Array[];
  sampleRate: number;
  bpm: number;
  beatTimes: number[]; // seconds (true, before humanisation)
  sections: { name: string; startBar: number; bars: number }[];
}

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

export function synthSong(opts: { bpm?: number; sampleRate?: number; seed?: number } = {}): SynthSong {
  const bpm = opts.bpm ?? 120;
  const sr = opts.sampleRate ?? 44100;
  const rng = mulberry32(opts.seed ?? 7);
  const beatSec = 60 / bpm;
  const A = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]]; // C Am F G
  const B = [[50, 53, 57], [52, 55, 59], [53, 57, 60], [55, 59, 62]]; // Dm Em F G
  const sections = [
    { name: 'intro', bars: 2, chords: A, drums: 'light' },
    { name: 'A1', bars: 8, chords: A, drums: 'full' },
    { name: 'A2', bars: 8, chords: A, drums: 'full' },
    { name: 'B', bars: 8, chords: B, drums: 'half' },
    { name: 'A3', bars: 8, chords: A, drums: 'full' },
    { name: 'outro', bars: 2, chords: A, drums: 'light' },
  ];
  const totalBars = sections.reduce((s, x) => s + x.bars, 0);
  const total = Math.ceil((totalBars * 4 * beatSec + 1.5) * sr);
  const L = new Float32Array(total);
  const R = new Float32Array(total);
  const beatTimes: number[] = [];
  const out: SynthSong['sections'] = [];
  const add = (t0: number, dur: number, gl: number, gr: number, fn: (t: number) => number) => {
    const s0 = Math.round(t0 * sr);
    const n = Math.round(dur * sr);
    for (let i = 0; i < n && s0 + i < total; i++) {
      const v = fn(i / sr);
      L[s0 + i] += v * gl;
      R[s0 + i] += v * gr;
    }
  };
  let bar = 0;
  for (const sec of sections) {
    out.push({ name: sec.name, startBar: bar, bars: sec.bars });
    for (let b = 0; b < sec.bars; b++, bar++) {
      const chord = sec.chords[Math.floor(b / 2) % sec.chords.length];
      const barT = bar * 4 * beatSec;
      // Pad: sustained chord for the bar.
      for (const note of chord) {
        const f = midiHz(note + 12);
        add(barT, 4 * beatSec, 0.05, 0.05, (t) => Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.02) * Math.min(1, (4 * beatSec - t) / 0.02));
      }
      for (let k = 0; k < 4; k++) {
        const bt = barT + k * beatSec;
        beatTimes.push(bt);
        const j = (rng() - 0.5) * 0.006;
        const vel = 0.85 + 0.15 * rng();
        // Bass on every beat.
        const fb = midiHz(chord[0] - 12);
        add(bt + j, beatSec * 0.9, 0.25 * vel, 0.25 * vel, (t) => Math.sin(2 * Math.PI * fb * t) * Math.exp(-t * 3) * Math.min(1, t / 0.005));
        if (sec.drums === 'full' || (sec.drums === 'half' && k % 2 === 0) || (sec.drums === 'light' && k === 0)) {
          if (k % 2 === 0) {
            add(bt + j, 0.3, 0.6 * vel, 0.6 * vel, (t) => Math.sin(2 * Math.PI * (50 * t + 100 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 12));
          } else {
            add(bt + j, 0.2, 0.25 * vel, 0.3 * vel, (t) => (rng() * 2 - 1) * Math.exp(-t * 25) + 0.3 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 20));
          }
        }
        if (sec.drums !== 'light') {
          for (const h of [0, 0.5]) add(bt + h * beatSec + j, 0.05, 0.06, 0.05, (t) => (rng() * 2 - 1) * Math.exp(-t * 80));
        }
      }
    }
  }
  return { channels: [L, R], sampleRate: sr, bpm, beatTimes, sections: out };
}

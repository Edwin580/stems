# stems: plan

Upload a song and it plays forever. A listener should not be able to hear where it loops.

This document covers what we are building, why the Infinite Jukebox approach fell short, how the custom engine works, what the MVP includes, and what comes after it.

---

## 1. Why the Infinite Jukebox sounded wrong

The Infinite Jukebox (2012) proved people want this. Its seams were still easy to hear, for these reasons:

| Problem | Cause | What stems does |
|---|---|---|
| Audible hiccups at jumps | It cut at beat boundaries taken from a remote analysis service. Those boundaries were accurate to tens of milliseconds, and the cuts had little or no crossfade, so transients doubled or dropped and bass waveforms clicked out of phase. | Beats are measured locally with a short onset window and bias correction. Every seam is then aligned at sample level by cross-correlation, and a crossfade law chosen from that correlation is applied. |
| Jumps that land "wrong" | It judged similarity one beat at a time. Two single beats can match while the music around them does not. | Each seam is scored over ±4 beats of context on both sides, weighted toward the seam. |
| Jumps that shift the downbeat | It had no model of bars. | The engine estimates meter and downbeat and penalises jumps that change the position within the bar. By default jumps only happen on bar lines. |
| Dead ends and running off the end | Jumps were random, with special cases near the end of the track. | The engine computes the strongly connected core of the beat graph. Inside the core every beat can reach every other, so playback never runs out. |
| Repetitive ping-ponging | It picked jumps by plain random choice. | Jump timing follows a rising hazard function, jump choice is weighted by quality, and recently used landing spots are avoided for a while. |
| Stopped working | It depended on the Echo Nest API, which shut down in 2016. | Everything runs in the browser, and the audio never leaves the device. |
| No clean single loop | It had only a random-walk mode. | **Perfect loop** mode finds verified single-seam loops and can export a seamless WAV that loops in any player or DAW. |

## 2. What "perfect" means here

A seam is inaudible only when all of these hold:

1. **Musical context matches.** Harmony, timbre, rhythm pattern and loudness are the same before and after the seam, over several beats.
2. **Metric position matches.** The jump keeps the position within the bar, and ideally within the phrase.
3. **Waveforms are in phase.** At the sample level the incoming audio is time-aligned with the outgoing audio, so bass and sustained notes do not cancel or click.
4. **The crossfade law fits the signal.** Correlated material needs a constant-gain fade, and uncorrelated material needs equal power. Using the wrong one causes a level bump or dip.
5. **The fade finishes on the beat.** The incoming beat's attack plays untouched, which masks the seam.
6. **Playback cannot get stuck.** There are no dead ends and no forced bad jumps.

The engine is built around these six conditions.

## 3. Architecture

```
 File ──decodeAudioData──► PCM (playback rate, stereo)
                              │
          ┌───────────────────┴─────────────────────┐
          ▼ (Web Worker)                            ▼ (main thread)
   ANALYSIS PIPELINE                           coarse mono (÷4)
   decimate → 22 kHz                                │
   STFT 2048/512 → log-mel, MFCC, chroma, loudness │
   STFT 1024/256 → onset envelope (bass-weighted)  │
   tempo (autocorr + prior + metrical support)     │
   beats (Ellis DP) + time-domain bias correction  │
   beat-sync features + meter/downbeat             │
   distance matrix D → transition matrix T         │
   candidate jump edges                            │
          │                                         │
          └──────────────► PLANNER ◄────────────────┘
                 infinite core (Tarjan SCC) under the user's strictness
                 endless walk / loop mode, seeded RNG
                 alignSeam(): coarse+fine normalised cross-correlation
                          │  Jump{at, to, fade, rho}
                          ▼
                 AudioWorklet: SPLICER (pure TS, shared with export/tests)
                 read head + jump queue, correlation-aware crossfade,
                 click-free play/pause/seek
```

Every piece of DSP is written from scratch in TypeScript: the FFT, mel filterbank, chroma, MFCC, beat tracker, similarity, graph, aligner, splicer and WAV encoder. The project has no runtime dependencies.

### 3.1 Analysis (`src/engine/analyze.ts`)

| Stage | Method | Notes |
|---|---|---|
| Resample | Windowed-sinc decimation to about 22 kHz | Used for analysis only. Playback stays at full rate. |
| Feature STFT | 2048-sample Hann window, hop 512, two real frames per complex FFT | Feeds 40-band log-mel, 13 MFCCs, 12-bin energy chroma (55 Hz–2.5 kHz) and loudness. |
| Onset envelope | Separate 1024/256 STFT, spectral flux on log-mel with the low bands weighted ×3 | A short window avoids "seeing" attacks early. The bass weighting stops hi-hats from pulling the tracker onto off-beats. |
| Tempo | Onset autocorrelation × log-normal prior around 120 BPM, plus 2× metrical support | Autocorrelation is computed out to 2× the longest lag so slow tempos are not penalised. This fixed 93→186 BPM octave errors. |
| Beats | Ellis dynamic-programming tracker (tightness 100), parabolic sub-frame refinement | |
| Beat bias | Median offset to the peak energy rise in a time-domain envelope with 1.5 ms hop | Removes the systematic early bias of STFT onsets. Measured within about 5 ms on test material. |
| Beat features | Chroma for the whole beat, MFCC 1–12 for each half of the beat, loudness per half | Splitting into halves captures rhythm shape inside the beat. |
| Meter | 3 vs 4 and downbeat phase from z-scored onset strength plus harmonic change | 4/4 is preferred unless 3/4 wins clearly. |
| D | 2·(1−cos chroma) + ‖Δmfcc‖/√48 + Δloudness/12, normalised to median 1 | |
| T(i→j) | Weighted mean of D(i+1+d, j+d), d ∈ [−4, 3], weights e^(−\|d+½\|/4), + 0.6 if bar position changes | Jumps shorter than 8 beats are excluded because they sound like stutters. |
| Edges | Up to 8 per beat under a loose threshold (5th percentile, or 0.55), with near-duplicates suppressed | The planner tightens this set to the user's strictness setting. |

### 3.2 Seam alignment (`src/engine/align.ts`)

For a jump that leaves at sample `at` and lands at `to`, the aligner searches lags within ±25 ms. It does a coarse pass on box-filtered mono at 1/4 rate, then a fine pass at full rate within ±8 samples of the coarse result. Each pass maximises normalised cross-correlation over a window covering the crossfade and 30 ms on each side. The aligner returns the refined landing sample and the correlation `rho`. The planner rejects seams with `rho < 0.2` unless a jump is forced.

### 3.3 Splicer (`src/engine/splicer.ts`)

The splicer is a read head plus a queue of jumps. A crossfade occupies `[at − fade, at)`, so it ends exactly on the landing point and the new beat's transient plays clean. The gains use raised-cosine shapes normalised by `1/√(x² + y² + 2ρxy)`:

- When ρ = 1 the fade is constant-gain, because correlated signals sum linearly.
- When ρ = 0 the fade is equal-power.
- Values in between interpolate correctly.

Play, pause and seek all use ramps or crossfades, so nothing clicks. The same class runs in the AudioWorklet, in offline WAV rendering and in unit tests. What you hear is exactly what gets exported and tested.

### 3.4 Planner (`src/engine/planner.ts`)

- **Infinite core.** The planner filters edges by strictness and runs Tarjan's SCC over the natural edges (i→i+1) plus the jump edges. If the core comes out too small, it relaxes the threshold automatically and reports that in the UI. Beats outside the core (intro and outro) play once. At the edge of the core a jump is forced.
- **Endless mode.** Jump timing uses a linearly rising hazard, calibrated so the mean spacing equals the "every N bars" setting. With bar-lock on, jumps happen only at bar ends. The planner picks an edge by softmax over cost (temperature 0.08) and avoids landing within 8 beats of the last 6 landings.
- **Loop mode.** One verified seam, repeated. `findLoops` ranks every (start, end) pair of 8 bars or more by T with a mild bias toward longer loops. It suppresses near-duplicates, keeps at most two loops of each length, verifies every candidate with `alignSeam`, and re-ranks with the correlation folded in.
- **Seeded RNG** (mulberry32) makes renders reproducible.

### 3.5 Export (`src/engine/render.ts`)

- **Seamless loop WAV.** One cycle of the loop, with the same crossfade the live engine applies baked into its tail. The file therefore loops gaplessly in any looping player, sampler or DAW.
- **Endless render.** N minutes of the planner's path, rendered offline with the same Splicer. It ends with a 2 s fade.

## 4. MVP scope (built)

- [x] Drag-and-drop or file-picker upload of any format the browser can decode. A built-in synthesised demo track is included.
- [x] Full local analysis in a Web Worker with a progress bar. A 5-minute song takes about 5 s.
- [x] Endless mode with controls for jump spacing, seam strictness, crossfade length and bar-lock.
- [x] Perfect-loop mode with ranked loops. Each shows quality, length and phase match, and has **Loop this**, **Hear seam** (seeks to 4 s before the seam) and **WAV** export.
- [x] A song map showing the waveform (dimmed outside the infinite core), the beat and bar grid, jump arcs coloured by quality, the next planned jump (dashed), a flash when a jump happens, and the playhead. Click to seek, snapped to beats.
- [x] Listening time, current position and a count of seams crossed.
- [x] Endless WAV render of 1–60 minutes.
- [x] Light and dark themes, mobile layout, and space bar for play/pause.
- [x] Tests (Vitest) against synthetic songs with known ground truth at two tempos and sample rates:
  - FFT against a reference DFT, and the crossfade law
  - SCC correctness
  - tempo within 2%, median beat error under 20 ms, meter and downbeat phase
  - more than 90% of good edges bar-aligned
  - best loop with ρ > 0.8
  - endless render that never ends, with no click spikes
  - per-seam high-frequency energy no higher than the source's (a mutation check confirms this test fails on misaligned hard cuts)
  - baked loop that wraps cleanly, and the WAV byte size

## 5. Roadmap

### Phase 2: seam quality
- **Phrase awareness.** Detect 4-, 8- and 16-bar phrase boundaries with novelty on the self-similarity matrix, and prefer jumps at phrase ends ("land on the 1 of a new phrase").
- **Better downbeats.** Add a small learned downbeat model (an ONNX CNN over the beat-synchronous spectrogram), keeping the heuristic as a fallback.
- **Tempo-varying music.** Use local-tempo DP or a particle-filter tracker for live, rubato or swing recordings. Today a single global period is assumed.
- **Micro time-stretch at the seam.** When the tempos on the two sides differ by more than about 0.5%, stretch the incoming bar over the fade with WSOLA so the downbeats stay locked.
- **Spectral seam check.** Compare a short-window spectrum across the seam, alongside the waveform correlation, and reject seams that cause a sudden change in brightness.
- **Loudness matching.** Apply a small gain ramp when the two sides differ by more than 1 dB.
- **Adaptive fade length.** Short fades on percussive seams, long fades on pads.

### Phase 3: stems (source separation)
- Run HTDemucs or a similar model in the browser through ONNX Runtime Web with WebGPU, falling back to a server.
- **Seams per stem.** Vocals are what usually give a seam away, so prefer seams where the vocal stem is silent or identical. Crossfade each stem with its own law, for example cutting drums on the transient and fading pads over a long window.
- **Stem mixer.** Mute or solo stems, for example an "instrumental endless" mode or drums-only practice loops.
- **Cross-section mashups.** Loop the drums of section A under the harmony of section B, where the beat grid allows it.

### Phase 4: product
- Cache analysis in IndexedDB, keyed by audio hash, so tracks reopen instantly.
- **Extend to N minutes with a real ending.** The planner aims to arrive in the outro at the target time instead of fading out.
- Write `smpl` and `cue ` chunks into exported WAVs so samplers pick up loop points, and add an export of loop markers for DAWs.
- Media Session API, background playback, a sleep timer, and a PWA install.
- Share a loop as a link that carries the analysis and seam choices. Each user supplies their own audio file.

### Phase 5: performance
- A WASM SIMD FFT and feature extraction, targeting under 1 s analysis for a 5-minute track.
- Streaming analysis so playback can start before analysis finishes.
- A SharedArrayBuffer for PCM, so the copy into the worklet goes away. This needs COOP/COEP headers.

## 6. Known limitations (MVP)

- Music with free tempo (classical, ambient without a beat) gets few or no seams. The endless core may be small, and the UI says so.
- The meter model only knows 3/4 and 4/4.
- PCM is held twice in memory, on the main thread and in the worklet. That is about 180 MB for a 4-minute 48 kHz stereo track.
- The test corpus is synthetic. The next step is a small regression set of real recordings (CC-licensed) with hand-marked seams and listening checks.

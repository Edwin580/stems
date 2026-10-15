# stems: plan and status

Upload a song and it plays forever. A listener should not be able to hear where it loops.

This document covers why the Infinite Jukebox approach fell short, how the custom engine works, and the status of every roadmap item. All five phases are implemented. Where an item was built differently from the original plan, its entry says how.

---

## 1. Why the Infinite Jukebox sounded wrong

| Problem | Cause | What stems does |
|---|---|---|
| Audible hiccups at jumps | Beat boundaries from a remote service were tens of milliseconds off, and cuts had little or no crossfade. | Beats are tracked locally with a short onset window, bias correction and local tempo. Every seam is aligned at sample level by cross-correlation and uses a crossfade law chosen from that correlation. Fades adapt so they never split a drum hit, and varispeed follows tempo differences. |
| Jumps that land wrong | It judged similarity one beat at a time. | Each seam is scored over ±4 beats of context, then checked at sample level for correlation, spectral match and loudness. |
| Jumps that shift the downbeat | It had no bar model. | Meter and downbeats come from several cues. Jumps that change the position in the bar are penalised. Jumps happen on bar lines and prefer phrase boundaries. |
| Jumps in the middle of a vocal line | It had no notion of sources. | With stems, seams avoid moments where the vocal stem is active. |
| Dead ends | Jumps were random, with special cases near the end. | The strongly connected core of the beat graph guarantees that playback can never run out. |
| Stopped working | It depended on the Echo Nest API, which shut down in 2016. | Everything runs in the browser and the audio never leaves the device. |

## 2. What "perfect" means here

A seam is inaudible only when all of these hold:

1. **Musical context matches:** harmony, timbre, rhythm and loudness, over several beats on both sides.
2. **Metric position matches:** bar position, and ideally phrase position.
3. **Waveforms are in phase** at the sample level.
4. **The crossfade law fits the signal:** constant-gain for correlated material, equal-power for uncorrelated.
5. **The fade finishes on the beat** and never cuts through a transient.
6. **Tempo and level match** across the seam.
7. **No voice is caught mid-phrase.**
8. **Playback cannot get stuck.**

## 3. Architecture

```
 File ─decode─► PCM (SharedArrayBuffer when cross-origin isolated)
   │                │
   │ SHA-256        ├─► AudioWorklet: StemEngine (plays immediately, linear until seams arrive)
   ▼                │
 IndexedDB cache ◄──┼─► Analysis worker
                    │     decimate → STFTs (WASM SIMD FFT) → onsets → tempo → local tempo curve
                    │     → DP beats → bias fix → beat features (+ bass chroma)
                    │     → D (beat distances) → multi-cue meter → phrase novelty
                    │     → T (context + bar + phrase [+ vocal] cost) → edges
                    │
                    ├─► Separation worker (optional)
                    │     DSP: streaming HPSS + bass + centre-coherence masks (sum to unity)
                    │     ML:  HTDemucs ONNX via onnxruntime-web (WebGPU → WASM), chunked OLA
                    │
                    └─► Planner (main thread)
                          infinite core (Tarjan SCC), endless walk with phrase-biased hazard,
                          perfect-loop mode, render-to-length DP
                          buildSeam(): align → adaptive fade → varispeed → spectral check → loudness
                                │ Jump{at, to, fade, rho, drift, gainDb}
                                ▼
                          StemEngine: one Splicer per stem, per-stem fade laws,
                          mixer gains, stem lock to a loop on the downbeat grid
```

All DSP is written from scratch:

- the FFT, in JavaScript and as AssemblyScript compiled to WASM SIMD
- the STFT, mel and chroma features, MFCC, onset detection, tempo, local tempo and the dynamic-programming beat tracker
- self-similarity, Foote novelty and meter
- the transition matrix, SCC, aligner, seam builder and splicer
- the HPSS separator, the resampler, the Demucs STFT and ISTFT conventions, and the WAV encoder with metadata chunks

The only runtime dependency is onnxruntime-web, which is loaded lazily and only when HTDemucs is used.

## 4. Status

### Phase 1: MVP ✅
This phase covers upload, analysis, endless mode, perfect-loop mode, the song map, and seamless loop and endless WAV export.

### Phase 2: seam quality ✅

| Item | Implementation | Where |
|---|---|---|
| Phrase awareness | Foote checkerboard novelty on the beat distance matrix with a 4-bar kernel, then a logistic per-downbeat phrase-start score. The score enters the transition cost (`phraseWeight · \|phrase(i+1) − phrase(j)\|`) and the jump hazard, which is boosted at phrase ends. The Phrase preference slider controls it. | `structure.ts`, `similarity.ts`, `planner.ts` |
| Better downbeats | **Built differently from the plan:** there is no learned model, because no labelled training data was available here. Instead, meter and phase come from a z-scored, weighted vote of four cues: onset strength, harmonic change, bass-note change (40–250 Hz chroma) and bar-scale structural novelty. | `structure.ts` |
| Tempo-varying music | Local beat period from windowed autocorrelation (8 s window, 1 s hop, ±20%, median-smoothed). The DP tracker uses the local period per frame. A 110→126 BPM glide is tracked with a median error under 20 ms. | `beats.ts` |
| Micro time-stretch at the seam | Varispeed over the crossfade. The incoming side is read at the ratio of the local beat periods (clamped to ±2%), with linear interpolation, and still lands exactly on the target sample. | `seam.ts`, `splicer.ts` |
| Spectral seam check | 16-band log spectra of what would have played compared with what will play. Seams above 8 dB mean difference are rejected unless forced, and the difference is added to the cost of loop candidates. | `seam.ts` |
| Loudness matching | RMS over 0.4 s after the seam on both sides. A difference above 1 dB triggers a ±6 dB correction on the incoming side that ramps back to unity over 3 s. Loops don't use it, because they repeat verbatim. | `seam.ts`, `splicer.ts` |
| Adaptive fade length | Transient detection (energy rise over ~4 ms). The fade is the longest one, up to 2× the requested length, whose window holds no transient on either side, so a drum hit is never half-faded. | `seam.ts` |

### Phase 3: stems ✅

| Item | Implementation |
|---|---|
| In-browser separation | **Two backends.** (1) A built-in DSP separator. It runs a streaming STFT (2048/1024, √Hann) with median-filter HPSS (branchless 9-tap median network), a low-band mask for bass, and inter-channel coherence ⁸ × 150 Hz–9 kHz for vocals. "Other" is the time-domain residual, so the stems sum back to the mix exactly. It runs at about 25× real time. Mono files are detected, and no vocal estimate is attempted for them. (2) **HTDemucs** through an ONNX export run with onnxruntime-web (WebGPU, falling back to multi-threaded WASM). Demucs' own `_spec`, `_magnitude`, `_mask` and `_ispec` steps, and its torch.stft and torch.istft conventions, are reproduced exactly. Inference runs on 7.8 s segments with 25% overlap and triangular weights, with global normalisation and 44.1 kHz resampling. The model is downloaded once and kept in Cache Storage, and ML stems are cached in IndexedDB. |
| Per-stem seams | A vocal-activity penalty (vocal-to-mix energy ratio in a ±120 ms window around each beat) is added to the seam cost at both ends of a jump. Turning on **Vocal-aware seams** re-scores the transition matrix from the stored distances. |
| Per-stem crossfade laws | Every stem's fade ends on the same landing sample. Drums cut in 12 ms or less. "Other" (pads and keys) fades over twice the requested length, up to 200 ms. Bass and vocals use the seam's adaptive fade. |
| Stem mixer | Volume, mute and solo per stem, with presets (Full mix, Instrumental, A cappella, Drums + bass). Gains are smoothed in the worklet over about 20 ms. Exports use the current mix. |
| Cross-section mashups | **Stem lock:** a locked stem leaves the main path, enters the selected perfect loop on the next downbeat, and keeps cycling while the other stems wander. On unlock it crossfades back onto the leader's exact position, and the transition waits until no seam is due. The engine never allows every stem to be locked. |
| Live handover | Separation finishes while the song plays. The engine then swaps the single mix source for four stems in the middle of a block, with no discontinuity, because the stems sum to the mix. |

Measured on the synthetic song, as SDR against the true stems:

| Stem | DSP | HTDemucs |
|---|---|---|
| Drums | 3.2 dB | **14.5 dB** |
| Bass | 4.4 dB | **16.0 dB** |
| Vocals | 4.1 dB | **22.8 dB** |
| Other | 2.7 dB | **21.8 dB** |

The table is from onnxruntime-node on a 20 s excerpt. In the browser (onnxruntime-web, WASM with 4 threads, in a worker, headless Chromium), a 15 s excerpt that includes a section boundary scored 7.2, 8.0, 25.7 and 19.4 dB for drums, bass, vocals and other. It ran at about 13 s per 7.8 s segment.

WebGPU is used only when a hardware adapter is present. Software adapters such as SwiftShader or llvmpipe, and fallback adapters, are skipped. WebGPU session creation is also given a timeout, because it can hang instead of failing.

### Phase 4: product ✅

| Item | Implementation |
|---|---|
| Analysis cache | IndexedDB, keyed by engine version, the SHA-256 of the file and the sample rate. Re-opening a file skips analysis, and the UI shows "analysis from cache". |
| Extend to N minutes with a real ending | The planner wanders until the remaining time is within 3 song-lengths. An exact DP over (beat, beats remaining) then uses natural steps and planned seams at bar ends to reach the song's own outro. Because seams preserve bar phase, the result snaps to the nearest reachable length in whole bars. If no path exists, it falls back to a 2 s fade. |
| Sampler and DAW markers | Loop exports carry a `smpl` chunk with a forward loop over the whole file. Endless renders carry `cue ` and `LIST/adtl/labl` markers at every seam. |
| Media Session, background playback, sleep timer | Media Session metadata and play/pause/stop handlers. The sleep timer (15, 30, 60 or 90 minutes) fades out over 20 s and then pauses. AudioWorklet playback keeps running in background tabs. |
| PWA | Web app manifest, icons, an offline app-shell service worker, an install button, and `file_handlers` so the installed app can open audio files from the OS. |
| Share links | `#share=` with base64url JSON holding mode, loop, settings, stem gains and locks, plus a 16-hex-character file hash. No audio is included. The recipient opens the same file, and the link applies only if the hashes match. Sample positions are rescaled across sample rates. The mix is applied once stems exist. |

### Phase 5: performance ✅

| Item | Implementation | Result |
|---|---|---|
| WASM SIMD FFT | AssemblyScript radix-2 with an f32x4 butterfly and a fused radix-4 first pass, embedded as base64 so workers instantiate it synchronously. It falls back to JS when SIMD is unavailable. `npm run build:wasm` regenerates it. | 3.4–3.8× faster than JS per 2048-point FFT. A 5-minute track analyses in 2.8 s, down from 5.4 s. **The < 1 s target was not reached:** the remaining time is in feature loops and the O(n²) matrices, not the FFT. |
| Play before analysis finishes | Playback starts as soon as the file is decoded. Seams switch on when analysis completes, and the planner picks up from the live playhead. **Built differently from the plan:** this replaces incremental streaming analysis, which isn't needed because the first seam is always several bars in. | Time to sound is about the decode time. |
| SharedArrayBuffer PCM | COOP/COEP headers in Vite dev and preview, and `public/_headers` for Netlify or Cloudflare. When `crossOriginIsolated` is true, PCM and stems live in SharedArrayBuffers and are shared with the worklet and workers without copying. This also enables multi-threaded ONNX WASM. Otherwise buffers are copied. | Halves resident memory for PCM and stems. |

## 5. Testing

The suite has 47 tests in `npm test`:

- **engine:** FFT, crossfade law, SCC, tempo, beats, meter, edges, loops, endless render, seam high-frequency energy, baked loop. Runs at two tempos and sample rates.
- **quality:** tempo glide, phrase scores, adaptive fade, varispeed landing, loudness ramp, spectral check.
- **stems:** exact reconstruction, SDR, mono detection, vocal penalty, re-scoring, StemEngine parity, fade laws, mute, lock and unlock, live source swap, Demucs STFT round trip, chunked overlap-add with an oracle runner, resampler.
- **product:** render to length with a real ending, WAV `smpl` and `cue` chunks, share-link round trip.
- **perf:** WASM FFT availability, accuracy and speed.

Browser end-to-end checks were run with Playwright and headless Chromium:

- early playback
- cross-origin isolation
- DSP separation, presets, lock and unlock
- loop and endless exports, with chunks verified
- sleep timer
- share link applied on a fresh page
- cache hit on reload
- HTDemucs in the browser via onnxruntime-web (WASM path; the WebGPU path is untested here because the sandbox has no GPU)

## 6. Known limitations

- The test corpus is synthetic. A CC-licensed set of real recordings with hand-marked seams and listening checks is the next step.
- The DSP separator is an estimate. Centre-panned sustained instruments leak into "vocals". Use HTDemucs for quality.
- HTDemucs on CPU (WASM) takes minutes per song. WebGPU support depends on the browser.
- The default model URL points to a third-party ONNX export of Meta's MIT-licensed HTDemucs weights on Hugging Face. The URL can be changed in Advanced, and self-hosting the model is recommended for production.
- The meter model only knows 3/4 and 4/4.
- Render-to-length snaps to whole bars, and to lengths the seam graph can actually reach.
- Stem lock assumes a steady tempo. On tempo-drifting tracks a locked stem can drift up to a few percent against the rest within one loop cycle.

# stems

Pick a song and it plays forever. stems is an infinite jukebox built so you can't hear the seams, and it keeps playing with your screen off.

- **Endless:** wanders through the song without stopping, jumping between moments that are musically equivalent. Every jump is bar-aligned and prefers phrase boundaries. It is checked against several beats of context, phase-aligned to the exact sample, and gets an adaptive crossfade that never splits a drum hit. Small tempo and level differences across the jump are evened out.
- **Section handles:** drag start and end under the song map (they snap to bar lines). Loop mode repeats exactly that part with a verified seam; Endless wanders only inside it.
- **Loop:** finds single-seam loops that have been verified at sample level. You can preview the seam, or export a WAV that loops gaplessly anywhere and carries sampler loop points.
- **Stems:** splits the song into drums, bass, vocals and other, using either a fast built-in DSP separator or HTDemucs running in your browser on WebGPU or WASM.
  - Seams avoid moments where someone is singing, and each stem gets its own crossfade.
  - You can mute or solo stems, or use the instrumental and a cappella presets.
  - You can **lock** a stem to a loop while the rest of the song wanders.
- **Lyrics:** finds synced lyrics for the song on [LRCLIB](https://lrclib.net) (or load a `.lrc` file). They highlight as the song plays, tapping a line jumps there, and loops can be ranked to start on a lyric line.
- **Background playback:** the engine's output plays through a media element, so it keeps going with the screen locked or in another tab, with lock-screen and headphone controls. Jumps are planned well ahead in the AudioWorklet, so a throttled page doesn't interrupt the music.
- **Library:** songs you open are kept on the device (IndexedDB), searchable by title, artist or file name, and reopen without picking the file again. Add several files at once, paste a direct link to an audio file (hosts that allow cross-site downloads, such as Internet Archive or Dropbox direct links), or, with the app installed on Android, share audio to stems from any app's Share menu.
- **Extras:**
  - Save a long version (N minutes, optionally ending on the song's real outro) as MP3 or WAV, through your current stem mix.
  - Seam cue markers in the exported WAV.
  - A cache, so songs you've opened before load instantly.
  - Share links (settings only, never audio).
  - A sleep timer and Media Session controls.
  - Installable as a PWA.

Everything runs locally on a custom DSP engine written in TypeScript, with an AssemblyScript WASM SIMD FFT. Your audio never leaves your device.

```bash
npm install
npm run dev         # http://localhost:5173 (STEMS_ISOLATE=0 npm run dev to test without shared memory)
npm test            # Vitest suites (synthetic songs with ground truth)
npm run build       # static site in dist/; any static host works, GitHub Pages included
npm run build:wasm  # rebuild the SIMD FFT from assembly/fft.ts
```

## How it works

The full design, the comparison with the original Infinite Jukebox, the status of every roadmap item, and measured results are in [docs/PLAN.md](docs/PLAN.md).

```
assembly/     AssemblyScript SIMD FFT (compiled + embedded by scripts/build-wasm.mjs)
src/engine/   pure DSP: fft, wasm-fft, dsp, beats, features, structure, similarity, graph, align,
              seam, loops, planner, splicer, stemengine, separate, htdemucs, render, share, demo
src/audio/    Web Audio glue: AudioWorklet, analysis + separation workers, Player, IndexedDB cache
src/lyrics/   LRC parsing, LRCLIB search, ID3 song names, synced-line lookup, lyric-aligned loop ranking
src/ui/       page controller, song-map visualiser, styles
public/       PWA manifest, service worker, icons, hosting headers
tests/        Vitest suites
```

## Spotify and YouTube

stems needs the song's actual audio to find seams and split stems. Spotify and YouTube only play audio inside their own players and never hand the samples to other apps, so songs from them can't be used directly. Use an audio file you have.

## Third-party code

- MP3 encoding uses [lamejs](https://github.com/zhuker/lamejs) (`@breezystack/lamejs`, LGPL-3.0), loaded in a worker only when you save an MP3.
- HTDemucs weights are Meta's (MIT), loaded from a public ONNX export; the model URL can be changed under Advanced.

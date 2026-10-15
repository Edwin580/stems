# stems

Drop in a song and it plays forever. stems is an infinite jukebox built so you can't hear the seams.

- **Endless:** wanders through the song without stopping, jumping between moments that are musically equivalent. Every jump is bar-aligned and prefers phrase boundaries. It is checked against several beats of context, phase-aligned to the exact sample, and gets an adaptive crossfade that never splits a drum hit. Small tempo and level differences across the jump are evened out.
- **Perfect loop:** finds single-seam loops that have been verified at sample level. You can preview the seam, or export a WAV that loops gaplessly anywhere and carries sampler loop points.
- **Stems:** splits the song into drums, bass, vocals and other, using either a fast built-in DSP separator or HTDemucs running in your browser on WebGPU or WASM.
  - Seams avoid moments where someone is singing, and each stem gets its own crossfade.
  - You can mute or solo stems, or use the instrumental and a cappella presets.
  - You can **lock** a stem to a loop while the rest of the song wanders.
- **Extras:**
  - Render N minutes that end on the song's real outro.
  - Seam cue markers in the exported WAV.
  - A cache, so songs you've opened before load instantly.
  - Share links (settings only, never audio).
  - A sleep timer and Media Session controls.
  - Installable as a PWA.

Everything runs locally on a custom DSP engine written in TypeScript, with an AssemblyScript WASM SIMD FFT. Your audio never leaves your device.

```bash
npm install
npm run dev         # http://localhost:5173 (served cross-origin isolated)
npm test            # 62 tests on synthetic songs with ground truth
npm run build       # static site in dist/ — deploy with the COOP/COEP headers in public/_headers
npm run build:wasm  # rebuild the SIMD FFT from assembly/fft.ts
```

## How it works

The full design, the comparison with the original Infinite Jukebox, the status of every roadmap item, and measured results are in [docs/PLAN.md](docs/PLAN.md).

```
assembly/     AssemblyScript SIMD FFT (compiled + embedded by scripts/build-wasm.mjs)
src/engine/   pure DSP: fft, wasm-fft, dsp, beats, features, structure, similarity, graph, align,
              seam, loops, planner, splicer, stemengine, separate, htdemucs, render, share, demo
src/audio/    Web Audio glue: AudioWorklet, analysis + separation workers, Player, IndexedDB cache
src/lyrics/   LRC parsing, synced-line lookup, lyric-aligned loop ranking
src/sources/  YouTube (IFrame player + optional Data API search), Spotify (PKCE auth, Web API search, Playback SDK)
src/ui/       page controller, song-map visualiser, styles
public/       PWA manifest, service worker, icons, hosting headers
tests/        Vitest suites
```

## Sources: YouTube and Spotify

The endless engine needs a decoded audio buffer, so it works on uploaded files (and the demo track). YouTube and Spotify play through their official players, in the same app:

- **YouTube** — paste any watch / youtu.be / embed / Shorts link; it plays embedded. Set `VITE_YOUTUBE_API_KEY` (Data API v3) for in-app search.
- **Spotify** — connect with OAuth (PKCE, so no client secret in the browser). Search tracks, play full songs in-app with the Web Playback SDK (needs Premium), or play 30-second previews / open in Spotify without it.

Setup: copy `.env.example` to `.env`, create a free app at https://developer.spotify.com/dashboard, and register the app's root URL as a Redirect URI (local dev: `http://127.0.0.1:5173/` and `http://localhost:5173/`; production: `https://edwin580.github.io/stems/`).

## Lyrics

Load a `.lrc` file alongside any song: lyrics highlight in sync with playback, clicking a line seeks to it, and the loop list can re-rank candidates so loops start on lyric lines.

# stems

Drop in a song and it plays forever. stems is an infinite jukebox built so you can't hear the seams.

- **Endless mode** moves through the song without stopping, jumping between moments that are musically equivalent. Every jump stays on the bar, is checked against several beats of context on both sides, and is phase-aligned to the exact sample.
- **Perfect loop mode** finds loops that each have one verified seam, then lets you preview the seam or export a WAV that loops seamlessly in any player or DAW.

Everything runs in your browser on a custom DSP engine written in TypeScript with no runtime dependencies. Your audio never leaves your device.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine tests on synthetic songs with known ground truth
npm run build    # static site in dist/
```

## How it works

Pipeline: onset/beat tracking → beat-synchronous chroma + MFCC → context-matched self-similarity → strongly-connected jump graph → cross-correlation seam alignment → correlation-aware crossfades in an AudioWorklet.

The full design, the comparison with the original Infinite Jukebox, and the roadmap (including stem separation) are in [docs/PLAN.md](docs/PLAN.md).

```
src/engine/   pure DSP: fft, dsp, beats, features, similarity, graph, align, loops, planner, splicer, render
src/audio/    Web Audio glue: AudioWorklet processor, analysis worker, Player
src/lyrics/   LRC parsing, synced-line lookup, lyric-aligned loop ranking
src/sources/  YouTube (IFrame player + optional Data API search), Spotify (PKCE auth, Web API search, Playback SDK)
src/ui/       page controller, song-map visualiser, styles
tests/        Vitest suite
```

## Sources: YouTube and Spotify

The endless engine needs a decoded audio buffer, so it works on uploaded files (and the demo track). YouTube and Spotify play through their official players, in the same app:

- **YouTube** — paste any watch / youtu.be / embed / Shorts link; it plays embedded. Set `VITE_YOUTUBE_API_KEY` (Data API v3) for in-app search.
- **Spotify** — connect with OAuth (PKCE, so no client secret in the browser). Search tracks, play full songs in-app with the Web Playback SDK (needs Premium), or play 30-second previews / open in Spotify without it.

Setup: copy `.env.example` to `.env`, create a free app at https://developer.spotify.com/dashboard, and register the app's root URL as a Redirect URI (local dev: `http://127.0.0.1:5173/` and `http://localhost:5173/`; production: `https://edwin580.github.io/stems/`).

## Lyrics

Load a `.lrc` file alongside any song: lyrics highlight in sync with playback, clicking a line seeks to it, and the loop list can re-rank candidates so loops start on lyric lines.

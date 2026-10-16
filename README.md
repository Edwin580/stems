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
npm run dev         # http://localhost:5173 (STEMS_ISOLATE=1 npm run dev for multi-threaded mode)
npm test            # 62 tests on synthetic songs with ground truth
npm run build       # static site in dist/ — any static host works (GitHub Pages included)
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

- **YouTube link → stems + MP3** (the "or paste a YouTube link" box). The page runs the engine itself (`src/sources/yt-engine.ts`): it streams the audio, resumes if the connection drops, opens it in the stem engine like an uploaded file (endless loops, perfect loops, stems, WAV export), and encodes a tagged 192 kbps MP3 in a Web Worker (**Download MP3**).
  - **Why a relay is needed.** A static page can't fetch YouTube audio by itself. YouTube's player API answers other websites with 403, and its media servers only allow `www.youtube.com` to read the audio. The stream URLs are also signed for the IP that requested them.
  - **What the relay does.** `relay/youtube-relay.js` is a free Cloudflare Worker that looks up the video and streams the audio back in the same request. It has no other logic.
  - **Setting it up.** Deploy it once: Cloudflare dashboard → Workers & Pages → Create → Hello World → Edit code → paste the file → Deploy. Then paste its URL under "YouTube relay" in the app; the URL is saved in your browser. Alternatively, run `npx wrangler deploy` in `relay/`, or set `VITE_YT_RELAY_URL` at build time.
  - **Who can use it.** Only origins listed in `ALLOWED_ORIGINS` can use it from a browser.
  - **Local development.** Run `npm run relay` (the same worker code under Node, on `http://127.0.0.1:8788`).
  - **Without a relay.** The app falls back to the local converter (`npm run yt-server`, dev only) and then to public Invidious instances. Those are best-effort and may ask you to pass their bot check in a new tab.
  - **Downloading.** Download only what you have the right to. YouTube's terms restrict downloading.
- **YouTube player and Spotify** ("Listen with the official players"): these play inside YouTube's and Spotify's own players, which never expose the audio. Set `VITE_YOUTUBE_API_KEY` (Data API v3) to search YouTube in the app.
- **Spotify** — connect with OAuth (PKCE, so no client secret in the browser). Search tracks, play full songs in-app with the Web Playback SDK (needs Premium), loop the whole track with Spotify's native repeat, or loop an A-B section by seeking back to its start. Spotify's SDK is an encrypted stream with playback control and metadata only — it exposes no audio samples, so beat-matched seamless loops, stems and WAV export still require the same song as an uploaded file (there is a one-click local-file button in the Spotify panel for that).

Setup: the app's public Client ID is built in as the default, so Spotify works out of the box. To use your own app instead, copy `.env.example` to `.env`, create a free app at https://developer.spotify.com/dashboard, and register the app's root URL as a Redirect URI (local dev: `http://127.0.0.1:5173/` — Spotify rejects `localhost`, so open the dev server via 127.0.0.1; production: `https://edwin580.github.io/stems/`).

## Lyrics

Load a `.lrc` file alongside any song: lyrics highlight in sync with playback, clicking a line seeks to it, and the loop list can re-rank candidates so loops start on lyric lines.

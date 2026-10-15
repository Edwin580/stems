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
src/ui/       page controller, song-map visualiser, styles
tests/        Vitest suite
```

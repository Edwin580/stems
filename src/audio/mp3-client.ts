import type { Id3Tags } from '../engine/id3';
import type { FromMp3, ToMp3 } from './mp3.worker';

/** Encode PCM to a tagged MP3 off the main thread. */
export function encodeMp3InWorker(channels: Float32Array[], sampleRate: number, tags: Id3Tags, onProgress?: (f: number) => void): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<FromMp3>) => {
      const m = e.data;
      if (m.type === 'progress') onProgress?.(m.fraction);
      else {
        w.terminate();
        if (m.type === 'done') resolve(m.mp3); else reject(new Error(m.message));
      }
    };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message || 'MP3 encoder failed')); };
    const msg: ToMp3 = { channels, sampleRate, kbps: 192, tags };
    w.postMessage(msg);
  });
}

import type { Id3Tags } from '../engine/id3';
import { encodeMp3 } from './mp3';

export type ToMp3 = { channels: Float32Array[]; sampleRate: number; kbps?: number; tags?: Id3Tags };
export type FromMp3 = { type: 'progress'; fraction: number } | { type: 'done'; mp3: Blob } | { type: 'error'; message: string };

const post = (m: FromMp3) => (self as unknown as Worker).postMessage(m);

self.onmessage = (e: MessageEvent<ToMp3>) => {
  try {
    const { channels, sampleRate, kbps, tags } = e.data;
    const mp3 = encodeMp3(channels, sampleRate, { kbps, tags, onProgress: (fraction) => post({ type: 'progress', fraction }) });
    post({ type: 'done', mp3 });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

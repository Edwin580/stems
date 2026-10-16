import { describe, expect, it } from 'vitest';
// @ts-expect-error: plain JS module (deployed as-is to Cloudflare Workers)
import { handle } from '../relay/youtube-relay.js';
import { encodeMp3 } from '../src/audio/mp3';
import { id3v23 } from '../src/engine/id3';
import { audioFileName, downloadViaRelay, fetchYouTubeAudio, normalizeRelayUrl, NoRouteError } from '../src/sources/yt-engine';
import { fakeBytes, fakeYouTube } from './fake-youtube';

const ORIGIN = 'https://edwin580.github.io';
const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

/** A browser-side fetch that reaches the relay worker, which reaches the fake YouTube. */
function viaRelay(yt: ReturnType<typeof fakeYouTube>, mutate?: (res: Response, n: number) => Response) {
  let n = 0;
  const urls: string[] = [];
  const f = (async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    const res = await handle(new Request(url, { headers: { Origin: ORIGIN } }), {}, undefined, yt.fetch);
    return mutate ? mutate(res, n++) : res;
  }) as typeof fetch;
  return { fetch: f, urls };
}

/** Cut a response body off after `limit` bytes with a network-style error. */
function truncate(res: Response, limit: number): Response {
  const reader = res.body!.getReader();
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      if (sent >= limit) { ctrl.error(new TypeError('network error')); await reader.cancel(); return; }
      const { done, value } = await reader.read();
      if (done) { ctrl.close(); return; }
      const take = value.subarray(0, Math.max(0, limit - sent));
      sent += take.length;
      ctrl.enqueue(take);
    },
  });
  return new Response(body, { status: res.status, headers: res.headers });
}

describe('in-browser YouTube engine (relay route)', () => {
  it('downloads through the relay with progress and metadata', async () => {
    const audio = fakeBytes(2_300_000);
    const yt = fakeYouTube({ audio, title: 'Song', author: 'Band' });
    const r = viaRelay(yt);
    const fractions: number[] = [];
    const got = await downloadViaRelay('https://relay.example.workers.dev/', 'dQw4w9WgXcQ', { fetchFn: r.fetch, onProgress: (_, f) => fractions.push(f) });
    expect(same(got.bytes, audio)).toBe(true);
    expect(got).toMatchObject({ title: 'Song', author: 'Band', route: 'relay' });
    expect(got.mime).toContain('audio/mp4');
    expect(fractions.at(-1)).toBe(1);
    expect(fractions.every((f, i) => i === 0 || f >= fractions[i - 1])).toBe(true);
  });

  it('resumes from the last byte when the connection drops mid-stream', async () => {
    const audio = fakeBytes(2_500_000);
    const yt = fakeYouTube({ audio });
    const r = viaRelay(yt, (res, n) => (n === 0 ? truncate(res, 1_200_000) : res));
    const got = await downloadViaRelay('relay.example.workers.dev', 'dQw4w9WgXcQ', { fetchFn: r.fetch });
    expect(same(got.bytes, audio)).toBe(true);
    expect(r.urls[1]).toContain('&start=1200000');
  });

  it('gives up after the resume budget and surfaces the error', async () => {
    const yt = fakeYouTube({ audio: fakeBytes(2_000_000) });
    const r = viaRelay(yt, (res) => truncate(res, 10));
    await expect(downloadViaRelay('https://relay.example', 'dQw4w9WgXcQ', { fetchFn: r.fetch, maxResumes: 2 })).rejects.toThrow(/network error|ended early/);
    expect(r.urls).toHaveLength(3);
  });

  it('does not retry a definite refusal from the relay', async () => {
    const yt = fakeYouTube({ audio: fakeBytes(10), playability: { ANDROID_VR: 'UNPLAYABLE', ANDROID: 'UNPLAYABLE', IOS: 'UNPLAYABLE' } });
    const r = viaRelay(yt);
    await expect(downloadViaRelay('https://relay.example', 'dQw4w9WgXcQ', { fetchFn: r.fetch })).rejects.toThrow(/Video unavailable/);
    expect(r.urls).toHaveLength(1);
  });

  it('routes by link and reports a clear error when nothing can serve it', async () => {
    const yt = fakeYouTube({ audio: fakeBytes(5000) });
    const r = viaRelay(yt);
    const got = await fetchYouTubeAudio('https://youtu.be/dQw4w9WgXcQ?t=42', { relayUrl: 'https://relay.example', fetchFn: r.fetch });
    expect(got.videoId).toBe('dQw4w9WgXcQ');
    await expect(fetchYouTubeAudio('not a link', { relayUrl: 'x' })).rejects.toThrow(/doesn’t look like a YouTube link/);
    const dead = (async () => new Response('nope', { status: 503 })) as unknown as typeof fetch;
    await expect(fetchYouTubeAudio('dQw4w9WgXcQ', { relayUrl: '', fetchFn: dead, instances: ['https://inv.example'] })).rejects.toBeInstanceOf(NoRouteError);
  });

  it('normalizes relay URLs and file names', () => {
    expect(normalizeRelayUrl('relay.example.workers.dev/')).toBe('https://relay.example.workers.dev');
    expect(normalizeRelayUrl(' https://r.example/audio ')).toBe('https://r.example');
    expect(normalizeRelayUrl('http://127.0.0.1:8788/health')).toBe('http://127.0.0.1:8788');
    expect(normalizeRelayUrl('')).toBe('');
    expect(audioFileName({ title: 'A/B: "C"?', author: 'Band', videoId: 'dQw4w9WgXcQ' }, 'mp3')).toBe('Band - AB C.mp3');
    expect(audioFileName({ title: '', author: '', videoId: 'dQw4w9WgXcQ' }, 'm4a')).toBe('youtube-dQw4w9WgXcQ.m4a');
  });
});

/** Read ID3v2.3 text frames back (UTF-16 with BOM) — a minimal reader for the test. */
function readId3(bytes: Uint8Array): { size: number; frames: Record<string, string> } {
  expect(String.fromCharCode(...bytes.subarray(0, 3))).toBe('ID3');
  const size = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
  const frames: Record<string, string> = {};
  const v = new DataView(bytes.buffer, bytes.byteOffset);
  for (let o = 10; o < 10 + size;) {
    const id = String.fromCharCode(...bytes.subarray(o, o + 4));
    const len = v.getUint32(o + 4);
    const p = bytes.subarray(o + 10, o + 10 + len);
    if (id.startsWith('T')) frames[id] = new TextDecoder('utf-16le').decode(p.subarray(3)).replace(/\0+$/, '');
    else if (id === 'WOAS') frames[id] = String.fromCharCode(...p);
    o += 10 + len;
  }
  return { size, frames };
}

describe('MP3 output', () => {
  it('writes ID3v2.3 tags that round-trip unicode', () => {
    const tag = id3v23({ title: 'Café — 東京', artist: 'Björk', sourceUrl: 'https://youtu.be/dQw4w9WgXcQ' });
    const { size, frames } = readId3(tag);
    expect(size).toBe(tag.length - 10);
    expect(frames).toEqual({ TIT2: 'Café — 東京', TPE1: 'Björk', WOAS: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(id3v23({}).length).toBe(0);
  });

  /** Walk MPEG-1 Layer III frames after the tag; returns header facts. */
  async function frames(blob: Blob) {
    const b = new Uint8Array(await blob.arrayBuffer());
    let o = b[0] === 0x49 ? 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]) : 0;
    const rates = [44100, 48000, 32000];
    const kbps = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    const seen: { kbps: number; rate: number; mode: number }[] = [];
    while (o + 4 <= b.length) {
      if (b[o] !== 0xff || (b[o + 1] & 0xfe) !== 0xfa) break; // sync + MPEG-1 + Layer III
      const br = kbps[b[o + 2] >> 4], sr = rates[(b[o + 2] >> 2) & 3], pad = (b[o + 2] >> 1) & 1;
      seen.push({ kbps: br, rate: sr, mode: b[o + 3] >> 6 });
      o += Math.floor((144000 * br) / sr) + pad;
    }
    return { seen, consumedAll: o === b.length };
  }

  it('encodes stereo 44.1 kHz to a valid, tagged 192 kbps stream', async () => {
    const sr = 44100, n = sr * 2;
    const tone = (f: number) => new Float32Array(n).map((_, i) => 0.4 * Math.sin((2 * Math.PI * f * i) / sr));
    const blob = encodeMp3([tone(440), tone(660)], sr, { tags: { title: 'Test', artist: 'stems' } });
    expect(readId3(new Uint8Array(await blob.arrayBuffer())).frames.TIT2).toBe('Test');
    const f = await frames(blob);
    expect(f.consumedAll).toBe(true);
    expect(f.seen.length).toBeGreaterThanOrEqual(Math.floor(n / 1152));
    expect(f.seen.every((h) => h.kbps === 192 && h.rate === 44100 && h.mode !== 3)).toBe(true);
  });

  it('resamples rates MP3 cannot carry and keeps mono as mono', async () => {
    const x = new Float32Array(22050).map((_, i) => Math.sin(i / 7) * 0.3);
    const f = await frames(encodeMp3([x], 22050, { kbps: 128 }));
    expect(f.consumedAll).toBe(true);
    expect(f.seen[0]).toEqual({ kbps: 128, rate: 48000, mode: 3 });
  });
});

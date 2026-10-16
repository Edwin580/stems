import { describe, expect, it } from 'vitest';
// @ts-expect-error: plain JS module (deployed as-is to Cloudflare Workers)
import { handle, pickAudio } from '../relay/youtube-relay.js';
import { fakeBytes, fakeYouTube } from './fake-youtube';

const ORIGIN = 'https://edwin580.github.io';
const req = (path: string, init: RequestInit & { origin?: string } = {}) =>
  new Request(`https://relay.example.workers.dev${path}`, {
    ...init,
    headers: { ...(init.origin === undefined ? { Origin: ORIGIN } : init.origin ? { Origin: init.origin } : {}), ...(init.headers ?? {}) },
  });
const bytesOf = async (res: Response) => new Uint8Array(await res.arrayBuffer());
const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

describe('YouTube relay worker', () => {
  it('resolves and streams the whole audio in ≤1 MB ranges, with metadata headers and CORS', async () => {
    const audio = fakeBytes(2_600_000);
    const yt = fakeYouTube({ audio, title: 'Café — Song', author: 'Ünïcode Artist' });
    const res = await handle(req('/audio?v=dQw4w9WgXcQ'), {}, undefined, yt.fetch);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(res.headers.get('Access-Control-Expose-Headers')).toContain('X-Total-Length');
    expect(res.headers.get('Content-Type')).toBe('audio/mp4');
    expect(decodeURIComponent(res.headers.get('X-Title')!)).toBe('Café — Song');
    expect(decodeURIComponent(res.headers.get('X-Author')!)).toBe('Ünïcode Artist');
    expect(res.headers.get('X-Total-Length')).toBe('2600000');
    expect(res.headers.get('X-Itag')).toBe('140'); // AAC preferred over higher-bitrate Opus
    expect(same(await bytesOf(res), audio)).toBe(true);
    expect(yt.ranges).toEqual(['bytes=0-1048575', 'bytes=1048576-2097151', 'bytes=2097152-2599999']);
  });

  it('resumes from a byte offset', async () => {
    const audio = fakeBytes(1_500_000);
    const yt = fakeYouTube({ audio });
    const res = await handle(req('/audio?v=dQw4w9WgXcQ&start=1000000'), {}, undefined, yt.fetch);
    expect(res.headers.get('X-Start')).toBe('1000000');
    expect(same(await bytesOf(res), audio.slice(1_000_000))).toBe(true);
  });

  it('retries a failed chunk instead of truncating the file', async () => {
    const audio = fakeBytes(2_200_000);
    const yt = fakeYouTube({ audio, flakyAt: new Set([1_048_576]) });
    const res = await handle(req('/audio?v=dQw4w9WgXcQ'), {}, undefined, yt.fetch);
    expect(same(await bytesOf(res), audio)).toBe(true);
    expect(yt.ranges.filter((r) => r === 'bytes=1048576-2097151')).toHaveLength(2);
  });

  it('falls back across app clients and reports which one worked', async () => {
    const yt = fakeYouTube({ audio: fakeBytes(1000), playability: { ANDROID_VR: 'LOGIN_REQUIRED' } });
    const res = await handle(req('/audio?v=dQw4w9WgXcQ'), {}, undefined, yt.fetch);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Client')).toBe('ANDROID');
    expect(yt.playerCalls).toEqual(['ANDROID_VR', 'ANDROID']);
    await res.arrayBuffer();
  });

  it('explains when no client can play the video', async () => {
    const yt = fakeYouTube({ audio: fakeBytes(10), playability: { ANDROID_VR: 'UNPLAYABLE', ANDROID: 'UNPLAYABLE', IOS: 'UNPLAYABLE' } });
    const res = await handle(req('/audio?v=dQw4w9WgXcQ'), {}, undefined, yt.fetch);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/would not play this video.*Video unavailable/);
  });

  it('only serves allowed browser origins', async () => {
    const yt = fakeYouTube({ audio: fakeBytes(10) });
    const bad = await handle(req('/audio?v=dQw4w9WgXcQ', { origin: 'https://evil.example' }), {}, undefined, yt.fetch);
    expect(bad.status).toBe(403);
    expect(bad.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(yt.playerCalls).toHaveLength(0);
    const custom = await handle(req('/health', { origin: 'https://me.example' }), { ALLOWED_ORIGINS: 'https://me.example' }, undefined, yt.fetch);
    expect(custom.status).toBe(200);
    const pre = await handle(req('/audio', { method: 'OPTIONS' }), {}, undefined, yt.fetch);
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('validates input', async () => {
    const yt = fakeYouTube({ audio: fakeBytes(10) });
    expect((await handle(req('/audio?v=nope'), {}, undefined, yt.fetch)).status).toBe(400);
    expect((await handle(req('/other'), {}, undefined, yt.fetch)).status).toBe(404);
    expect((await handle(req('/audio?v=dQw4w9WgXcQ&start=99'), {}, undefined, yt.fetch)).status).toBe(416);
  });

  it('picks AAC over Opus and ignores video formats', () => {
    expect(pickAudio([{ mimeType: 'video/mp4', url: 'v', bitrate: 9e6 }, { mimeType: 'audio/webm', url: 'o', bitrate: 160000 }, { mimeType: 'audio/mp4', url: 'a', bitrate: 128000 }]).url).toBe('a');
    expect(pickAudio([{ mimeType: 'audio/mp4' }])).toBeNull(); // ciphered: no direct url
  });
});

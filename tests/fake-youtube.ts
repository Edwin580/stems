/**
 * A fake YouTube for tests: an Innertube player endpoint plus a googlevideo
 * media host that serves byte ranges, enforces the ~1 MB range limit app
 * clients get, and can be told to fail. No network involved.
 */
export interface FakeYouTubeOptions {
  audio: Uint8Array;
  mime?: string;
  title?: string;
  author?: string;
  /** Per-client playability: client name → status (default OK for all). */
  playability?: Record<string, string>;
  /** Chunk start offsets whose first request fails with HTTP 500. */
  flakyAt?: Set<number>;
  maxRange?: number;
}

export interface FakeYouTube {
  fetch: typeof fetch;
  ranges: string[];
  playerCalls: string[];
}

export function fakeYouTube(opts: FakeYouTubeOptions): FakeYouTube {
  const mime = opts.mime ?? 'audio/mp4; codecs="mp4a.40.2"';
  const maxRange = opts.maxRange ?? 1024 * 1024;
  const failed = new Set<number>();
  const ranges: string[] = [];
  const playerCalls: string[] = [];
  const mediaUrl = 'https://rr1---sn-fake.googlevideo.com/videoplayback?itag=140&ip=1.2.3.4';
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
      const body = JSON.parse(String(init?.body ?? '{}'));
      const client = body?.context?.client?.clientName ?? '?';
      playerCalls.push(client);
      const status = opts.playability?.[client] ?? 'OK';
      if (status !== 'OK') {
        return Response.json({ playabilityStatus: { status, reason: status === 'LOGIN_REQUIRED' ? 'Sign in to confirm you’re not a bot' : 'Video unavailable' } });
      }
      return Response.json({
        playabilityStatus: { status: 'OK' },
        videoDetails: { title: opts.title ?? 'Fake Song', author: opts.author ?? 'Fake Artist', lengthSeconds: '42' },
        streamingData: {
          adaptiveFormats: [
            { itag: 251, mimeType: 'audio/webm; codecs="opus"', bitrate: 140000, url: mediaUrl.replace('itag=140', 'itag=251'), contentLength: String(opts.audio.length) },
            { itag: 140, mimeType: mime, bitrate: 130000, url: mediaUrl, contentLength: String(opts.audio.length) },
            { itag: 137, mimeType: 'video/mp4', bitrate: 4_000_000, url: mediaUrl.replace('itag=140', 'itag=137') },
          ],
        },
      });
    }
    if (url.startsWith('https://rr1---sn-fake.googlevideo.com/')) {
      const headers = new Headers(init?.headers);
      const range = headers.get('Range');
      ranges.push(range ?? '');
      const m = /bytes=(\d+)-(\d+)/.exec(range ?? '');
      if (!m) return new Response('', { status: 403 });
      const from = Number(m[1]), to = Number(m[2]);
      if (to - from + 1 > maxRange) return new Response('', { status: 403 });
      if (opts.flakyAt?.has(from) && !failed.has(from)) {
        failed.add(from);
        return new Response('', { status: 500 });
      }
      const slice = opts.audio.slice(from, Math.min(opts.audio.length, to + 1));
      return new Response(slice, { status: 206, headers: { 'Content-Type': mime.split(';')[0] } });
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
  return { fetch: fetchFn, ranges, playerCalls };
}

/** Deterministic pseudo-audio bytes. */
export function fakeBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  let x = 12345;
  for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) >>> 0; out[i] = x >>> 24; }
  return out;
}

/**
 * stems YouTube relay: a Cloudflare Worker (free plan is enough).
 *
 * Why it exists: the stems site is a static page, and a static page cannot
 * reach YouTube's audio by itself. YouTube's player API rejects requests that
 * carry a foreign Origin (403, preflight included), and the media hosts
 * (*.googlevideo.com) only grant CORS to https://www.youtube.com. Every
 * browser-only route ends at that wall, so something outside the browser has
 * to fetch the bytes.
 *
 * Why it does two things in one request: the stream URLs YouTube hands out
 * are signed for the IP that asked for them (`ip` is in `sparams`). A
 * serverless platform can leave from a different IP on each invocation, so
 * "look up" and "download" must happen in the same invocation. This worker
 * therefore resolves the video and streams the audio back in one response.
 * Everything else (decoding, MP3 encoding, tags, loading into the stem
 * engine) happens in the browser.
 *
 *   GET /audio?v=<11-char id>[&start=<byte offset>]
 *     200, body = audio bytes from `start` to the end, streamed.
 *     X-Title / X-Author (URI-encoded), X-Duration (s), X-Itag, X-Mime,
 *     X-Total-Length (full file size), X-Start: for progress and resume.
 *   GET /health → {"ok":true}
 *
 * Only Origins in ALLOWED_ORIGINS (a Worker variable, comma-separated) may
 * use it from a browser, so other websites can't borrow your relay.
 *
 * Deploy: Cloudflare dashboard → Workers & Pages → Create → Hello World →
 * Edit code → paste this file → Deploy. Optionally set ALLOWED_ORIGINS
 * under Settings → Variables. Then paste the worker URL into stems
 * ("YouTube relay" in the Open panel). Or: `npx wrangler deploy` in relay/.
 *
 * Self-contained on purpose (one file to paste). Keep CLIENTS in step with
 * server/youtube-engine.mjs when YouTube moves.
 */

const DEFAULT_ORIGINS = [
  'https://edwin580.github.io',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
];

// googlevideo answers app-client URLs with 403 for ranges much over 1 MB.
const CHUNK_BYTES = 1024 * 1024;
const CHUNK_ATTEMPTS = 3;
const INNERTUBE = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** App-client profiles, tried in order (they get direct, unciphered audio URLs). */
export const CLIENTS = [
  {
    name: 'ANDROID_VR',
    client: {
      clientName: 'ANDROID_VR', clientVersion: '1.65.10', deviceMake: 'Oculus', deviceModel: 'Quest 3',
      androidSdkVersion: 32, osName: 'Android', osVersion: '12L', hl: 'en', gl: 'US',
    },
    userAgent: 'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220705.003.A1) gzip',
  },
  {
    name: 'ANDROID',
    client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: 'en', gl: 'US' },
    userAgent: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
  },
  {
    name: 'IOS',
    client: {
      clientName: 'IOS', clientVersion: '20.10.4', deviceMake: 'Apple', deviceModel: 'iPhone16,2',
      osName: 'iOS', osVersion: '18.3.1.22D72', hl: 'en', gl: 'US',
    },
    userAgent: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_1 like Mac OS X)',
  },
];

const EXPOSE = 'X-Title, X-Author, X-Duration, X-Itag, X-Mime, X-Total-Length, X-Start, X-Client';

function corsHeaders(origin) {
  return origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Expose-Headers': EXPOSE, Vary: 'Origin' } : {};
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
  });
}

/** Best audio-only format with a direct URL: MP4/AAC first (decodes in every browser), then bitrate. */
export function pickAudio(formats) {
  const audio = (formats ?? []).filter((f) => f && f.url && String(f.mimeType ?? '').startsWith('audio/'));
  if (!audio.length) return null;
  const rank = (f) => (String(f.mimeType).includes('mp4') ? 1 : 0);
  return [...audio].sort((a, b) => rank(b) - rank(a) || Number(b.bitrate ?? 0) - Number(a.bitrate ?? 0))[0];
}

/** Ask the player API for streaming data, trying each app client. */
export async function resolveVideo(videoId, fetchFn = fetch) {
  const errors = [];
  for (const profile of CLIENTS) {
    try {
      const res = await fetchFn(INNERTUBE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': profile.userAgent },
        body: JSON.stringify({ videoId, context: { client: profile.client }, racyCheckOk: true, contentCheckOk: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const status = data?.playabilityStatus?.status;
      if (status !== 'OK') throw new Error(data?.playabilityStatus?.reason || status || 'not playable');
      const format = pickAudio(data?.streamingData?.adaptiveFormats);
      if (!format) throw new Error('no direct audio stream');
      return {
        client: profile.name,
        userAgent: profile.userAgent,
        title: data?.videoDetails?.title ?? '',
        author: data?.videoDetails?.author ?? '',
        duration: Number(data?.videoDetails?.lengthSeconds ?? 0),
        format,
      };
    } catch (err) {
      errors.push(`${profile.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`YouTube would not play this video for any client (${errors.join('; ')})`);
}

async function fetchChunk(url, userAgent, from, to, fetchFn) {
  let lastErr;
  for (let attempt = 0; attempt < CHUNK_ATTEMPTS; attempt++) {
    try {
      const res = await fetchFn(url, { headers: { 'User-Agent': userAgent, Range: `bytes=${from}-${to}` } });
      if (res.status !== 206 && res.status !== 200) throw new Error(`media HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (!buf.length) throw new Error('empty media response');
      return buf;
    } catch (err) {
      lastErr = err;
      if (attempt < CHUNK_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/** Stream [start, total) of a resolved format into `writable`, in ranged chunks. */
export async function pumpAudio(info, start, writable, fetchFn = fetch) {
  const writer = writable.getWriter();
  const total = Number(info.format.contentLength ?? 0);
  try {
    if (!total) {
      // Unknown length: one plain request (rare for audio formats).
      const res = await fetchFn(info.format.url, { headers: { 'User-Agent': info.userAgent } });
      if (!res.ok || !res.body) throw new Error(`media HTTP ${res.status}`);
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } else {
      for (let pos = start; pos < total;) {
        const end = Math.min(total - 1, pos + CHUNK_BYTES - 1);
        const buf = await fetchChunk(info.format.url, info.userAgent, pos, end, fetchFn);
        await writer.write(buf.length > end - pos + 1 ? buf.subarray(0, end - pos + 1) : buf);
        pos += Math.min(buf.length, end - pos + 1);
      }
    }
    await writer.close();
  } catch (err) {
    await writer.abort(err).catch(() => {});
  }
}

export function allowedOrigins(env) {
  const raw = env?.ALLOWED_ORIGINS;
  return raw ? String(raw).split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_ORIGINS;
}

export async function handle(request, env = {}, ctx = undefined, fetchFn = fetch) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  const originOk = !origin || allowed.includes('*') || allowed.includes(origin);
  if (!originOk) return json(403, { error: `Origin ${origin} is not allowed to use this relay (ALLOWED_ORIGINS).` }, '');
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(origin), 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400' },
    });
  }
  if (request.method !== 'GET') return json(405, { error: 'GET only' }, origin);
  if (url.pathname.endsWith('/health')) return json(200, { ok: true, relay: 'stems-youtube', version: 1 }, origin);
  if (!url.pathname.endsWith('/audio')) return json(404, { error: 'Use /audio?v=<video id>' }, origin);

  const videoId = url.searchParams.get('v') ?? '';
  if (!VIDEO_ID.test(videoId)) return json(400, { error: 'v must be an 11-character YouTube video id' }, origin);
  const start = Math.max(0, Number.parseInt(url.searchParams.get('start') ?? '0', 10) || 0);

  let info;
  try {
    info = await resolveVideo(videoId, fetchFn);
  } catch (err) {
    return json(502, { error: err instanceof Error ? err.message : String(err) }, origin);
  }
  const total = Number(info.format.contentLength ?? 0);
  if (total && start >= total) return json(416, { error: `start ${start} is past the end (${total})` }, origin);

  const { readable, writable } = new TransformStream();
  const pumping = pumpAudio(info, start, writable, fetchFn);
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(pumping);

  const mime = String(info.format.mimeType ?? 'application/octet-stream');
  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': mime.split(';')[0],
      'Cache-Control': 'no-store',
      'X-Title': encodeURIComponent(info.title),
      'X-Author': encodeURIComponent(info.author),
      'X-Duration': String(info.duration),
      'X-Itag': String(info.format.itag ?? ''),
      'X-Mime': encodeURIComponent(mime),
      'X-Total-Length': String(total),
      'X-Start': String(start),
      'X-Client': info.client,
      ...corsHeaders(origin),
    },
  });
}

export default {
  fetch(request, env, ctx) {
    return handle(request, env, ctx);
  },
};

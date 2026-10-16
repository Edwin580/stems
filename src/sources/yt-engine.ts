/**
 * In-browser YouTube engine for the static site.
 *
 * The page does the work: it parses the link, streams the audio through the
 * relay (relay/youtube-relay.js), resumes if the connection drops, and hands
 * the original audio to the stem engine. The MP3 is encoded in a worker
 * afterwards (src/audio/mp3.worker.ts). The relay only exists because the
 * browser cannot fetch YouTube audio itself (no CORS from YouTube for other
 * origins, and stream URLs signed for the requesting IP).
 *
 * Fallbacks when no relay is configured, in order: a converter endpoint
 * (local dev: `npm run yt-server`) and public Invidious instances, which
 * sometimes show a human bot check (the UI lets the person pass it).
 */
import { parseYouTubeId } from './youtube';
import { fromConverterEndpoint, fromInvidious, INVIDIOUS_INSTANCES, YouTubeBotCheckError, youtubeMp3Endpoint, YT_MP3_DEFAULT_PATH } from './youtube-mp3';

export interface YouTubeAudio {
  videoId: string;
  bytes: Uint8Array;
  mime: string;
  title: string;
  author: string;
  /** Which route delivered it, for the status line. */
  route: string;
}

export interface Progress { (stage: string, fraction: number): void }

const RELAY_KEY = 'stems.ytRelay';

/** The relay URL: what the person saved in the app, else the build-time default. */
export function getRelayUrl(): string {
  try {
    const saved = localStorage.getItem(RELAY_KEY);
    if (saved !== null) return saved;
  } catch { /* storage blocked */ }
  return ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_YT_RELAY_URL ?? '').trim();
}

export function setRelayUrl(url: string) {
  try { localStorage.setItem(RELAY_KEY, normalizeRelayUrl(url)); } catch { /* ignore */ }
}

/** Accept "relay.example.workers.dev", with or without scheme, trailing slash or /audio. */
export function normalizeRelayUrl(input: string): string {
  let s = input.trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/+$/, '').replace(/\/(audio|health)$/i, '');
}

/** Check that a relay answers (and allows this page's origin). */
export async function checkRelay(relayUrl: string, fetchFn: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchFn(`${normalizeRelayUrl(relayUrl)}/health`);
    if (res.ok) return null;
    const body = await res.json().catch(() => null) as { error?: string } | null;
    return body?.error ?? `relay answered HTTP ${res.status}`;
  } catch {
    return 'relay unreachable (wrong URL, offline, or it does not allow this site; check ALLOWED_ORIGINS)';
  }
}

/**
 * Stream the audio for `videoId` through the relay, resuming from the last
 * byte received if the connection drops. Verifies the total length.
 */
export async function downloadViaRelay(
  relayUrl: string,
  videoId: string,
  opts: { fetchFn?: typeof fetch; onProgress?: Progress; maxResumes?: number; signal?: AbortSignal } = {},
): Promise<YouTubeAudio> {
  const doFetch = opts.fetchFn ?? fetch;
  const base = normalizeRelayUrl(relayUrl);
  const parts: Uint8Array[] = [];
  let received = 0;
  let total = 0;
  let itag = '';
  let meta = { mime: 'audio/mp4', title: '', author: '' };
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= (opts.maxResumes ?? 3); attempt++) {
    try {
      const res = await doFetch(`${base}/audio?v=${encodeURIComponent(videoId)}${received ? `&start=${received}` : ''}`, { signal: opts.signal });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        throw new RelayError(body?.error ?? `relay answered HTTP ${res.status}`, res.status);
      }
      const resItag = res.headers.get('X-Itag') ?? '';
      const resTotal = Number(res.headers.get('X-Total-Length') ?? 0);
      if (received && (resItag !== itag || resTotal !== total)) {
        // A different stream came back on resume: start over cleanly.
        parts.length = 0;
        received = 0;
        if (res.headers.get('X-Start') !== '0') { await res.body?.cancel(); continue; }
      }
      itag = resItag;
      total = resTotal;
      meta = {
        mime: decodeURIComponent(res.headers.get('X-Mime') ?? '') || res.headers.get('Content-Type') || 'audio/mp4',
        title: decodeURIComponent(res.headers.get('X-Title') ?? ''),
        author: decodeURIComponent(res.headers.get('X-Author') ?? ''),
      };
      if (!res.body) throw new Error('relay sent no body');
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        received += value.length;
        if (total) opts.onProgress?.(`Downloading audio (${(received / 1e6).toFixed(1)} / ${(total / 1e6).toFixed(1)} MB)`, received / total);
      }
      if (total && received < total) throw new Error(`stream ended early at ${received} of ${total} bytes`);
      const bytes = new Uint8Array(received);
      let o = 0;
      for (const p of parts) { bytes.set(p, o); o += p.length; }
      return { videoId, bytes, mime: meta.mime, title: meta.title, author: meta.author, route: 'relay' };
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      if (err instanceof RelayError) throw err; // the relay gave a definite answer; retrying won't change it
      lastErr = err;
      opts.onProgress?.(`Connection dropped, resuming at ${(received / 1e6).toFixed(1)} MB…`, total ? received / total : 0);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

class RelayError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

/**
 * Get a YouTube link's audio by the best available route: the relay when one
 * is configured, else a converter endpoint (dev), else public Invidious.
 */
export async function fetchYouTubeAudio(
  input: string,
  opts: { relayUrl?: string; fetchFn?: typeof fetch; onProgress?: Progress; trySameOrigin?: boolean; instances?: readonly string[] } = {},
): Promise<YouTubeAudio> {
  const videoId = parseYouTubeId(input);
  if (!videoId) throw new Error('That doesn’t look like a YouTube link or video ID.');
  const doFetch = opts.fetchFn ?? fetch;
  const relay = opts.relayUrl ?? getRelayUrl();
  if (relay) {
    opts.onProgress?.('Asking the relay for the audio…', 0);
    return downloadViaRelay(relay, videoId, { fetchFn: doFetch, onProgress: opts.onProgress });
  }
  const errors: string[] = [];
  let botCheck: YouTubeBotCheckError | null = null;
  const endpoint = youtubeMp3Endpoint((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_YT_MP3_API_URL);
  if (endpoint !== YT_MP3_DEFAULT_PATH || opts.trySameOrigin) {
    try {
      opts.onProgress?.('Asking the converter…', 0);
      const r = await fromConverterEndpoint(endpoint, videoId, doFetch);
      return { videoId, bytes: new Uint8Array(await r.blob.arrayBuffer()), mime: r.blob.type || 'audio/mpeg', title: r.title ?? '', author: '', route: 'converter' };
    } catch (err) { errors.push(`converter: ${err instanceof Error ? err.message : String(err)}`); }
  }
  for (const instance of opts.instances ?? INVIDIOUS_INSTANCES) {
    try {
      opts.onProgress?.(`Trying ${new URL(instance).host}…`, 0);
      const r = await fromInvidious(instance, videoId, doFetch);
      return { videoId, bytes: new Uint8Array(await r.blob.arrayBuffer()), mime: r.blob.type || 'audio/mp4', title: r.title ?? '', author: '', route: new URL(instance).host };
    } catch (err) {
      if (err instanceof YouTubeBotCheckError) botCheck ??= err;
      else errors.push(`${new URL(instance).host}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (botCheck) throw botCheck;
  throw new NoRouteError(errors);
}

/** No relay configured and every public fallback failed. */
export class NoRouteError extends Error {
  constructor(readonly attempts: string[]) {
    super('Couldn’t get this video’s audio. Set up the free YouTube relay (one-time, about 2 minutes) for reliable conversions.');
    this.name = 'NoRouteError';
  }
}

/** File name for the audio/MP3, from title and author. */
export function audioFileName(a: Pick<YouTubeAudio, 'title' | 'author' | 'videoId'>, ext: string): string {
  const base = [a.author, a.title].filter(Boolean).join(' - ') || `youtube-${a.videoId}`;
  const clean = base.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120).replace(/[. ]+$/, '');
  return `${clean || `youtube-${a.videoId}`}.${ext}`;
}

export function extensionForMime(mime: string): string {
  if (/mpeg|mp3/.test(mime)) return 'mp3';
  if (/webm/.test(mime)) return 'webm';
  if (/ogg/.test(mime)) return 'ogg';
  return 'm4a';
}

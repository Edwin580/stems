/**
 * YouTube -> MP3, so a YouTube link can feed the stem / endless engine.
 *
 * Why this is a chain of fallbacks: a browser cannot download a YouTube
 * video's audio directly — the stream URLs are signed, IP-bound, served
 * without CORS headers, and expire. Every public shortcut was re-checked
 * on 2026-10-15 after the first version of this feature 404'd on the
 * deployed (static GitHub Pages) site:
 *
 *   - Cobalt public instances (10 reviewed ones): all now require JWT
 *     auth tokens issued to their own frontends. Dead end.
 *   - Piped public instances (14): all dead or erroring. Dead end.
 *   - Invidious: invidious.f5.si answers its API with CORS open and
 *     returns real audio formats, and its /videoplayback proxy serves the
 *     audio to a real browser — after an Anubis bot check that a first
 *     fetch trips over (it returns an HTML challenge page instead of
 *     audio). Visiting the instance once clears it; the UI offers that
 *     as a one-click step when a fetch hits the check.
 *   - A self-hosted converter (server/youtube-mp3-server.mjs, yt-dlp +
 *     ffmpeg) is the only fully reliable path, so it stays first-class:
 *     set VITE_YT_MP3_API_URL, or run `npm run yt-server` in local dev
 *     (the Vite dev server proxies the same-origin /api/youtube-mp3).
 *
 * Resolution order in fetchYouTubeMp3:
 *   1. The configured converter endpoint (returns a real MP3 directly).
 *   2. Invidious instances: API lookup (?local=true so stream URLs are
 *      proxied by the instance), best audio format, fetched as bytes.
 *      Non-MP3 audio (m4a / opus) is decoded and re-encoded to MP3 in the
 *      browser with lamejs, so every path yields an actual .mp3 File.
 * The resulting File goes through the exact same load path as an upload.
 */
import { Mp3Encoder } from '@breezystack/lamejs';
import { parseYouTubeId } from './youtube';

export const YT_MP3_DEFAULT_PATH = '/api/youtube-mp3';

/** Public Invidious instances tried, in order, for the no-server path. */
export const INVIDIOUS_INSTANCES = [
  'https://invidious.f5.si',
  'https://invidious.tiekoetter.com',
  'https://yt.chocolatemoo53.com',
  'https://invidious.nerdvpn.de',
] as const;

/** The instance's bot check (Anubis) intercepted the audio fetch. */
export class YouTubeBotCheckError extends Error {
  readonly instance: string;
  constructor(instance: string) {
    super(
      'The public converter site is showing a bot check instead of the audio. ' +
      'Use the “Pass the bot check” button below — it opens that site once so the check clears — then press Convert again.',
    );
    this.name = 'YouTubeBotCheckError';
    this.instance = instance;
  }
}

/** Resolve the converter endpoint URL from an optional configured value. */
export function youtubeMp3Endpoint(configured?: string | null): string {
  const v = (configured ?? '').trim();
  if (!v) return YT_MP3_DEFAULT_PATH;
  const base = v.replace(/\/+$/, '');
  return base.endsWith('/youtube-mp3') ? base : `${base}/youtube-mp3`;
}

/** Build the request URL for a video ID against an endpoint. */
export function youtubeMp3RequestUrl(endpoint: string, videoId: string): string {
  const sep = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${sep}v=${encodeURIComponent(videoId)}`;
}

/** Turn a video title into a safe .mp3 file name. */
export function mp3FileName(title: string | null | undefined, videoId: string): string {
  const clean = (title ?? '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/[. ]+$/, '');
  return `${clean || `youtube-${videoId}`}.mp3`;
}

/** True when a response body looks like an HTML page rather than audio/text. */
export function looksLikeHtml(text: string): boolean {
  return /^\s*<(?:!doctype|html|head|body)\b/i.test(text);
}

/** Error detail safe to show: plain text only, never an HTML page dump. */
export function safeErrorDetail(text: string): string {
  const t = text.trim();
  if (!t || looksLikeHtml(t)) return '';
  return t.replace(/<[^>]*>/g, '').trim().slice(0, 200);
}

export interface InvidiousFormat {
  itag?: string | number;
  type?: string;
  bitrate?: string | number;
  url?: string;
}

/** Best audio-only format: prefer MP4/AAC (decodes everywhere), then bitrate. */
export function pickInvidiousAudio(formats: InvidiousFormat[]): InvidiousFormat | null {
  const audio = formats.filter((f) => f.url && (f.type ?? '').startsWith('audio/'));
  if (!audio.length) return null;
  const rank = (f: InvidiousFormat) => (f.type!.includes('mp4') ? 1 : 0);
  return [...audio].sort((a, b) => rank(b) - rank(a) || Number(b.bitrate ?? 0) - Number(a.bitrate ?? 0))[0];
}

export interface DecodableAudio {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
  getChannelData(channel: number): Float32Array;
}

function floatTo16(arr: Float32Array, offset: number, len: number): Int16Array {
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, arr[offset + i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Encode decoded PCM to an MP3 blob (192 kbps, lamejs). Pure and testable. */
export function encodeMp3(audio: DecodableAudio): Blob {
  const channels = Math.min(2, Math.max(1, audio.numberOfChannels));
  const enc = new Mp3Encoder(channels, audio.sampleRate, 192);
  const left = audio.getChannelData(0);
  const right = channels > 1 ? audio.getChannelData(1) : left;
  const parts: Uint8Array[] = [];
  const BLOCK = 1152;
  for (let i = 0; i < audio.length; i += BLOCK) {
    const n = Math.min(BLOCK, audio.length - i);
    const out = channels > 1
      ? enc.encodeBuffer(floatTo16(left, i, n), floatTo16(right, i, n))
      : enc.encodeBuffer(floatTo16(left, i, n));
    if (out.length) parts.push(out);
  }
  const tail = enc.flush();
  if (tail.length) parts.push(tail);
  return new Blob(parts as BlobPart[], { type: 'audio/mpeg' });
}

export interface YouTubeMp3Options {
  /** Converter endpoint override; '' / unset = env var or same-origin default. */
  endpoint?: string;
  /**
   * Try the same-origin /api/youtube-mp3 endpoint. Only sensible where it
   * can exist (local dev via the Vite proxy, or a host that routes it) —
   * on a purely static host it just 404s, so production passes false.
   */
  trySameOrigin?: boolean;
  /** Invidious instances to try; defaults to INVIDIOUS_INSTANCES. */
  instances?: readonly string[];
  /** Decode non-MP3 audio so it can be re-encoded to MP3 (browser: OfflineAudioContext). */
  decodeAudio?: (data: ArrayBuffer) => Promise<DecodableAudio>;
  /** Injectable for tests. */
  fetchFn?: typeof fetch;
}

interface RawAudio { blob: Blob; title: string | null; }

async function fromConverterEndpoint(endpoint: string, videoId: string, doFetch: typeof fetch): Promise<RawAudio> {
  let res: Response;
  try {
    res = await doFetch(youtubeMp3RequestUrl(endpoint, videoId));
  } catch {
    throw new Error('converter unreachable');
  }
  if (!res.ok) {
    let detail = '';
    try { detail = safeErrorDetail(await res.text()); } catch { /* status only */ }
    throw new Error(`converter failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  const blob = await res.blob();
  if (!blob.size || looksLikeHtml(await blob.slice(0, 256).text().catch(() => ''))) {
    throw new Error('converter returned no audio');
  }
  const title = res.headers?.get?.('x-video-title');
  return { blob, title: title ? decodeURIComponent(title) : null };
}

async function fromInvidious(instance: string, videoId: string, doFetch: typeof fetch): Promise<RawAudio> {
  const api = `${instance}/api/v1/videos/${videoId}?local=true&fields=title,adaptiveFormats`;
  const res = await doFetch(api);
  if (!res.ok) throw new Error(`lookup failed (${res.status})`);
  const info = await res.json() as { title?: string; adaptiveFormats?: InvidiousFormat[] };
  const fmt = pickInvidiousAudio(info.adaptiveFormats ?? []);
  if (!fmt?.url) throw new Error('no audio format offered');
  const media = await doFetch(fmt.url);
  if (!media.ok) throw new Error(`audio fetch failed (${media.status})`);
  const blob = await media.blob();
  const head = await blob.slice(0, 256).text().catch(() => '');
  if (!blob.size || looksLikeHtml(head)) throw new YouTubeBotCheckError(instance);
  return { blob, title: info.title ?? null };
}

/**
 * Fetch a YouTube link's audio as an MP3 File, ready for Player.loadFile /
 * the UI's load({ file }) path. Throws an Error with a user-facing message
 * (YouTubeBotCheckError when the fallback site's bot check intercepted).
 */
export async function fetchYouTubeMp3(input: string, opts: YouTubeMp3Options = {}): Promise<File> {
  const videoId = parseYouTubeId(input);
  if (!videoId) throw new Error('That doesn’t look like a YouTube link or video ID.');
  const doFetch = opts.fetchFn ?? fetch;
  const configured = opts.endpoint ?? (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_YT_MP3_API_URL;
  const endpoint = youtubeMp3Endpoint(configured);
  const isDefaultEndpoint = endpoint === YT_MP3_DEFAULT_PATH;

  const attempts: (() => Promise<RawAudio>)[] = [];
  if (!isDefaultEndpoint || opts.trySameOrigin) {
    attempts.push(() => fromConverterEndpoint(endpoint, videoId, doFetch));
  }
  for (const instance of opts.instances ?? INVIDIOUS_INSTANCES) {
    attempts.push(() => fromInvidious(instance, videoId, doFetch));
  }

  let raw: RawAudio | null = null;
  let botCheck: YouTubeBotCheckError | null = null;
  let lastError: unknown = null;
  for (const attempt of attempts) {
    try { raw = await attempt(); break; } catch (err) {
      if (err instanceof YouTubeBotCheckError) botCheck = err; else lastError = err;
    }
  }
  if (!raw) {
    if (botCheck) throw botCheck;
    throw new Error(
      'YouTube→MP3 conversion failed on every route. The reliable fix is the local converter: ' +
      'run `npm run yt-server` next to the dev server, or set VITE_YT_MP3_API_URL to a deployed converter (see README).' +
      (lastError instanceof Error ? ` Last error: ${lastError.message}` : ''),
    );
  }

  if (raw.blob.type.includes('mpeg') || raw.blob.type.includes('mp3')) {
    return new File([raw.blob], mp3FileName(raw.title, videoId), { type: 'audio/mpeg' });
  }
  if (opts.decodeAudio) {
    const decoded = await opts.decodeAudio(await raw.blob.arrayBuffer());
    const mp3 = encodeMp3(decoded);
    return new File([mp3], mp3FileName(raw.title, videoId), { type: 'audio/mpeg' });
  }
  // No decoder available: hand back the original audio — the player decodes
  // m4a/opus fine; it just isn't literally an MP3 file.
  const ext = raw.blob.type.includes('webm') ? 'webm' : 'm4a';
  return new File([raw.blob], mp3FileName(raw.title, videoId).replace(/\.mp3$/, `.${ext}`), { type: raw.blob.type || 'audio/mp4' });
}

/**
 * YouTube -> MP3, so a YouTube link can feed the stem / endless engine.
 *
 * Why a converter endpoint is involved at all: a browser cannot download a
 * YouTube video's audio directly. The stream URLs are signed, served without
 * CORS headers, and expire — the same wall that keeps Spotify's SDK stream
 * out of the engine. Public resolver APIs (Piped / Invidious instances) were
 * checked on 2026-10-15 and were dead, forbidden, or had the endpoint
 * disabled, so they are not a foundation to build on.
 *
 * The working shape, mirroring how the rest of this app treats gated
 * features (YouTube search needs an API key, Spotify needs a client ID):
 *
 *   1. A tiny converter endpoint (server/youtube-mp3-server.mjs in this
 *      repo, `npm run yt-server`, or any host running it) downloads the
 *      video's best audio with yt-dlp and converts it to MP3 with ffmpeg.
 *   2. This module fetches that MP3 as a File and hands it to the exact
 *      same load path as an uploaded file — decode, beat analysis, loops
 *      and HTDemucs stem separation all work unchanged.
 *
 * Endpoint resolution: VITE_YT_MP3_API_URL when set (full endpoint URL or a
 * base URL), otherwise the same-origin path /api/youtube-mp3 — which the
 * Vite dev server proxies to the local converter (see vite.config.ts), and
 * which a production host can route to a deployed converter.
 */
import { parseYouTubeId } from './youtube';

export const YT_MP3_DEFAULT_PATH = '/api/youtube-mp3';

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

export interface YouTubeMp3Options {
  /** Converter endpoint; defaults to youtubeMp3Endpoint(import.meta.env...). */
  endpoint?: string;
  /** Injectable for tests. */
  fetchFn?: typeof fetch;
}

/**
 * Fetch a YouTube link's audio as an MP3 File, ready for Player.loadFile /
 * the UI's load({ file }) path. Throws an Error with a user-facing message.
 */
export async function fetchYouTubeMp3(input: string, opts: YouTubeMp3Options = {}): Promise<File> {
  const videoId = parseYouTubeId(input);
  if (!videoId) throw new Error('That doesn’t look like a YouTube link or video ID.');
  const endpoint = opts.endpoint ?? youtubeMp3Endpoint(
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_YT_MP3_API_URL,
  );
  const doFetch = opts.fetchFn ?? fetch;
  let res: Response;
  try {
    res = await doFetch(youtubeMp3RequestUrl(endpoint, videoId));
  } catch {
    throw new Error(
      'Couldn’t reach the YouTube→MP3 converter. Run `npm run yt-server` alongside the dev server, ' +
      'or set VITE_YT_MP3_API_URL to a deployed converter (see README).',
    );
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.text()).trim().slice(0, 200); } catch { /* keep status only */ }
    throw new Error(`YouTube→MP3 conversion failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  const blob = await res.blob();
  if (!blob.size) throw new Error('The converter returned an empty file.');
  const title = res.headers?.get?.('x-video-title');
  return new File([blob], mp3FileName(title ? decodeURIComponent(title) : null, videoId), {
    type: blob.type || 'audio/mpeg',
  });
}

/**
 * Invidious relay: resolve + download a video's audio through a public
 * Invidious instance, server-side.
 *
 * Browsers can't do this directly (the media endpoint sends no CORS
 * headers and sits behind a bot check), but a server can: it reads the
 * instance's API, solves the Anubis proof-of-work when one is presented
 * (see anubis.mjs), and downloads the proxied audio in full. Used by the
 * deployed single-site API route (api/youtube-mp3.mjs) and as a fallback
 * in the local converter server.
 */

import { fetchWithAnubis } from './anubis.mjs';

export const RELAY_INSTANCES = [
  'https://invidious.f5.si',
  'https://invidious.tiekoetter.com',
  'https://yt.chocolatemoo53.com',
  'https://invidious.nerdvpn.de',
];

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

/** Best audio format from an Invidious video payload (MP4/AAC preferred). */
export function pickRelayAudio(formats) {
  const audio = (formats || []).filter((f) => typeof f?.url === 'string' && /^audio\//.test(f.type || ''));
  if (!audio.length) return null;
  const mp4 = audio.filter((f) => (f.type || '').includes('mp4'));
  const pool = mp4.length ? mp4 : audio;
  return pool.slice().sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0))[0];
}

/**
 * Download the full audio for `videoId` through the first instance that
 * cooperates. Returns { title, buffer, contentType }.
 */
export async function convertViaRelay(videoId, fetchFn = fetch) {
  const errors = [];
  for (const instance of RELAY_INSTANCES) {
    try {
      const apiRes = await fetchWithAnubis(`${instance}/api/v1/videos/${videoId}?local=true`, { headers: { 'User-Agent': UA } }, fetchFn);
      if (!apiRes.ok) throw new Error(`API HTTP ${apiRes.status}`);
      const data = await apiRes.json();
      const format = pickRelayAudio(data.adaptiveFormats);
      if (!format) throw new Error('instance returned no audio formats');
      const mediaRes = await fetchWithAnubis(format.url, { headers: { 'User-Agent': UA } }, fetchFn);
      if (!mediaRes.ok) throw new Error(`media HTTP ${mediaRes.status}`);
      const buffer = Buffer.from(await mediaRes.arrayBuffer());
      if (buffer.length < 1024) throw new Error('media response was empty');
      return { title: data.title || videoId, buffer, contentType: (format.type || 'application/octet-stream').split(';')[0] };
    } catch (error) {
      errors.push(`${instance.replace('https://', '')}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Invidious relay failed on every instance — ${errors.join(' · ')}`);
}

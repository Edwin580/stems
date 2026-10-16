/**
 * stems — custom YouTube audio engine (no yt-dlp).
 *
 * This is our own small extractor + downloader, in the spirit of what
 * yt-dlp does internally, minus the dependency:
 *
 *   1. Ask YouTube's Innertube player API (the API the official apps use)
 *      for the video's streaming data, presenting as one of several app
 *      clients. App clients (Android / Android VR / iOS / TV) currently
 *      get direct, unsigned stream URLs for audio formats; the web client
 *      mostly gets signature-ciphered ones, so it is not in the list.
 *   2. Download the best audio format with chunked Range requests —
 *      googlevideo rejects or throttles naive full-file GETs, chunked
 *      206 responses are the well-behaved path.
 *   3. Hand the audio file to the caller (the server transcodes to MP3
 *      with ffmpeg).
 *
 * Reality notes (Oct 2026): YouTube changes this surface regularly —
 * client version strings and the playback signature timestamp below will
 * need occasional bumps, and some videos/IPs will still be bot-checked
 * (the caller falls back to yt-dlp, then surfaces the error). Verified
 * working 2026-10-15, including from a datacenter IP that yt-dlp's web
 * extraction was bot-walled on.
 */

const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
//STS: playbackContext signature timestamp; any recent value is accepted.
const SIGNATURE_TIMESTAMP = 20000;
// googlevideo 403s oversized Range requests on app-client URLs; 1 MB
// chunks are the size yt-dlp's downloader uses for YouTube, and each chunk
// is retried — media connections drop mid-song often enough to need it.
const CHUNK_BYTES = 1024 * 1024;
const CHUNK_ATTEMPTS = 4;

/** App-client profiles, tried in order. Keep versions reasonably fresh. */
export const CLIENTS = [
  {
    name: 'ANDROID',
    client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: 'en', gl: 'US' },
    userAgent: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
  },
  {
    name: 'ANDROID_VR',
    client: {
      clientName: 'ANDROID_VR', clientVersion: '1.65.10', deviceMake: 'Oculus', deviceModel: 'Quest 3',
      androidSdkVersion: 32, osName: 'Android', osVersion: '12L', hl: 'en', gl: 'US',
    },
    userAgent: 'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220705.003.A1) gzip',
  },
  {
    name: 'IOS',
    client: {
      clientName: 'IOS', clientVersion: '20.10.4', deviceMake: 'Apple', deviceModel: 'iPhone16,2',
      osName: 'iOS', osVersion: '18.3.1.22D72', hl: 'en', gl: 'US',
    },
    userAgent: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_1 like Mac OS X)',
  },
  {
    name: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
    client: { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0', hl: 'en', gl: 'US' },
    userAgent: 'Mozilla/5.0 (PlayStation; PlayStation 5) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    thirdParty: { embedUrl: 'https://www.youtube.com/' },
  },
];

/** Pick the best audio format with a direct URL: MP4/AAC first, then bitrate. */
export function pickBestAudio(formats) {
  const audio = (formats ?? []).filter((f) => f.url && String(f.mimeType ?? '').startsWith('audio/'));
  if (!audio.length) return null;
  const rank = (f) => (String(f.mimeType).includes('mp4') ? 1 : 0);
  return [...audio].sort((a, b) => rank(b) - rank(a) || Number(b.bitrate ?? 0) - Number(a.bitrate ?? 0))[0];
}

/** One Innertube player request. Returns { title, format, userAgent, clientName } or throws. */
async function playerInfo(videoId, profile, fetchFn) {
  const body = {
    context: { client: profile.client, ...(profile.thirdParty ? { thirdParty: profile.thirdParty } : {}) },
    videoId,
    playbackContext: { contentPlaybackContext: { signatureTimestamp: SIGNATURE_TIMESTAMP } },
    racyCheckOk: true,
    contentCheckOk: true,
  };
  const res = await fetchFn(`https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': profile.userAgent },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${profile.name}: player HTTP ${res.status}`);
  const data = await res.json();
  const status = data?.playabilityStatus?.status;
  if (status !== 'OK') {
    const reason = data?.playabilityStatus?.reason || status || 'not playable';
    throw new Error(`${profile.name}: ${reason}`);
  }
  const format = pickBestAudio(data?.streamingData?.adaptiveFormats);
  if (!format) throw new Error(`${profile.name}: no direct audio URL (ciphered streams only)`);
  return {
    title: data?.videoDetails?.title || '',
    format,
    userAgent: profile.userAgent,
    clientName: profile.name,
  };
}

/** Resolve a video to a downloadable audio stream, trying each client profile. */
export async function resolveAudioStream(videoId, fetchFn = fetch) {
  const errors = [];
  for (const profile of CLIENTS) {
    try {
      return await playerInfo(videoId, profile, fetchFn);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(`Custom engine could not resolve this video — ${errors.join('; ')}`);
}

/**
 * Download a resolved stream to destPath with chunked Range requests.
 * Returns the number of bytes written.
 */
export async function downloadAudioStream(info, destPath, fetchFn = fetch, fs = null) {
  const fsp = fs ?? (await import('node:fs/promises'));
  const { createWriteStream } = await import('node:fs');
  const total = Number(info.format.contentLength ?? 0);
  const out = createWriteStream(destPath);
  const write = (chunk) => new Promise((resolve, reject) => {
    out.write(chunk, (err) => (err ? reject(err) : resolve()));
  });
  let written = 0;
  try {
    if (!total) {
      // Unknown length: a single ranged GET still behaves better than none.
      const res = await fetchFn(info.format.url, { headers: { 'User-Agent': info.userAgent, Range: 'bytes=0-' } });
      if (!res.ok) throw new Error(`download HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await write(buf);
      written = buf.length;
    } else {
      while (written < total) {
        const end = Math.min(total - 1, written + CHUNK_BYTES - 1);
        let buf = null;
        let status = 0;
        let lastErr = null;
        for (let attempt = 0; attempt < CHUNK_ATTEMPTS && !buf; attempt++) {
          try {
            const res = await fetchFn(info.format.url, {
              headers: { 'User-Agent': info.userAgent, Range: `bytes=${written}-${end}` },
            });
            status = res.status;
            if (status !== 206 && status !== 200) throw new Error(`download HTTP ${status} at byte ${written}`);
            buf = Buffer.from(await res.arrayBuffer());
            if (!buf.length) throw new Error(`download stalled at byte ${written} of ${total}`);
          } catch (err) {
            lastErr = err;
            buf = null;
            if (attempt < CHUNK_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          }
        }
        if (!buf) throw lastErr ?? new Error(`download failed at byte ${written}`);
        await write(buf);
        written += buf.length;
        // A 200 means the server ignored Range and sent everything; stop.
        if (status === 200) break;
      }
    }
  } finally {
    await new Promise((resolve) => out.end(resolve));
  }
  if (total && written < total) {
    await fsp.rm(destPath, { force: true }).catch(() => {});
    throw new Error(`download incomplete: ${written} of ${total} bytes`);
  }
  return written;
}

/** File extension matching a resolved format's container. */
export function extensionFor(format) {
  return String(format?.mimeType ?? '').includes('webm') ? 'webm' : 'm4a';
}

/**
 * Deployed converter endpoint for the single-site deployment (Vercel).
 *
 *   GET /api/youtube-mp3?v=<videoId>   (or ?url=<youtube url>)
 *   → 200 with the best audio stream (m4a/opus) and an X-Video-Title
 *     header. The browser re-encodes to MP3 itself (lamejs), so this
 *     route needs no ffmpeg and no yt-dlp.
 *
 * Order of attempts: our custom engine (server/youtube-engine.mjs),
 * then the Invidious relay (server/relay.mjs).
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveAudioStream, downloadAudioStream, extensionFor } from '../server/youtube-engine.mjs';
import { convertViaRelay } from '../server/relay.mjs';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function videoIdFrom(req) {
  const url = new URL(req.url, 'http://localhost');
  const v = url.searchParams.get('v');
  if (v && VIDEO_ID.test(v)) return v;
  const raw = url.searchParams.get('url') || '';
  const match = raw.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function viaEngine(videoId) {
  const info = await resolveAudioStream(videoId);
  const dir = await mkdtemp(join(tmpdir(), 'stems-api-'));
  try {
    const path = join(dir, `audio.${extensionFor(info.format)}`);
    await downloadAudioStream(info, path);
    const buffer = await readFile(path);
    return { title: info.title, buffer, contentType: info.format.mimeType.split(';')[0] };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export default async function handler(req, res) {
  const videoId = videoIdFrom(req);
  if (!videoId) {
    res.status(400).json({ error: 'Pass ?v=<videoId> or ?url=<youtube url>.' });
    return;
  }
  const attempts = [];
  for (const [name, run] of [['custom engine', viaEngine], ['invidious relay', convertViaRelay]]) {
    try {
      const { title, buffer, contentType } = await run(videoId);
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Video-Title', encodeURIComponent(title));
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(buffer);
      return;
    } catch (error) {
      attempts.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  res.status(502).json({ error: `Conversion failed — ${attempts.join(' · ')}` });
}

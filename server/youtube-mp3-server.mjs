#!/usr/bin/env node
/**
 * stems — YouTube -> MP3 converter endpoint.
 *
 * Why this exists: browsers cannot download YouTube audio directly (signed,
 * CORS-less, expiring stream URLs), so the static site needs one small
 * server piece for this feature. This is it: zero npm dependencies, just
 * Node + ffmpeg on the host. Extraction is our own custom engine
 * (youtube-engine.mjs: Innertube app clients + chunked download);
 * yt-dlp, when installed, is only a fallback for videos the engine
 * cannot resolve.
 *
 *   GET /api/youtube-mp3?v=<videoId>     (or ?url=<youtube url>)
 *     -> 200 audio/mpeg, the video's best audio converted to MP3 (192 kbps)
 *        X-Video-Title: <url-encoded title>
 *   GET /health -> 200 "ok"
 *
 * Run:  npm run yt-server        (listens on PORT, default 8787)
 * Needs: ffmpeg on PATH. If the yt-dlp fallback is used and YouTube
 * bot-checks the host, set YTDLP_COOKIES_FROM_BROWSER=chrome
 * or YTDLP_COOKIES_FILE=/path/cookies.txt.
 *
 * Only use it for content you have the right to download.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadAudioStream, extensionFor, resolveAudioStream } from './youtube-engine.mjs';
import { convertViaRelay } from './relay.mjs';

const PORT = Number(process.env.PORT || 8787);
const ID_RE = /^[\w-]{11}$/;

// Optional, for hosts YouTube bot-checks (datacenter IPs often need this):
//   YTDLP_COOKIES_FROM_BROWSER=chrome   — reuse a logged-in browser's cookies
//   YTDLP_COOKIES_FILE=/path/cookies.txt — a Netscape-format cookies file
const COOKIE_ARGS = process.env.YTDLP_COOKIES_FROM_BROWSER
  ? ['--cookies-from-browser', process.env.YTDLP_COOKIES_FROM_BROWSER]
  : process.env.YTDLP_COOKIES_FILE
    ? ['--cookies', process.env.YTDLP_COOKIES_FILE]
    : [];

function videoIdFrom(req) {
  const u = new URL(req.url, 'http://localhost');
  const v = u.searchParams.get('v');
  if (v && ID_RE.test(v)) return v;
  const raw = u.searchParams.get('url') || v || '';
  try {
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split(/[/?#]/)[0];
      if (ID_RE.test(id)) return id;
    }
    if (host === 'youtube.com' || host === 'music.youtube.com' || host.endsWith('.youtube.com')) {
      const qv = parsed.searchParams.get('v');
      if (qv && ID_RE.test(qv)) return qv;
      for (const prefix of ['/embed/', '/shorts/', '/live/', '/v/']) {
        if (parsed.pathname.startsWith(prefix)) {
          const id = parsed.pathname.slice(prefix.length).split(/[/?#]/)[0];
          if (ID_RE.test(id)) return id;
        }
      }
    }
  } catch { /* fall through */ }
  return null;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Access-Control-Allow-Origin': '*', ...headers });
  res.end(body);
}

/** Convert an audio file to MP3 192k with ffmpeg. */
function transcodeToMp3(input, output) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', input, '-codec:a', 'libmp3lame', '-b:a', '192k', '-y', output], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => reject(new Error(
      e.code === 'ENOENT' ? 'ffmpeg is not installed on the converter host.' : `Could not start ffmpeg: ${e.message}`,
    )));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed (exit ${code}): ${err.trim().split('\n').pop() || 'unknown error'}`))));
  });
}

/** Primary path: our own Innertube engine (server/youtube-engine.mjs). */
async function convertWithEngine(videoId, dir) {
  const info = await resolveAudioStream(videoId);
  const raw = join(dir, `audio.${extensionFor(info.format)}`);
  await downloadAudioStream(info, raw);
  const mp3 = join(dir, 'audio.mp3');
  await transcodeToMp3(raw, mp3);
  return { file: mp3, title: info.title };
}

/** Fallback: yt-dlp, when it is installed and the custom engine failed. */
async function convertWithYtDlp(videoId, dir) {
  const outTemplate = join(dir, 'audio.%(ext)s');
  const args = [
    '-f', 'bestaudio/best',
    '-x', '--audio-format', 'mp3', '--audio-quality', '192K',
    '--no-playlist', '--no-warnings', '--restrict-filenames',
    ...COOKIE_ARGS,
    '-o', outTemplate,
    `https://www.youtube.com/watch?v=${videoId}`,
  ];
  const title = await new Promise((resolve) => {
    const p = spawn('yt-dlp', ['--get-title', '--no-playlist', ...COOKIE_ARGS, `https://www.youtube.com/watch?v=${videoId}`]);
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('error', () => resolve(''));
    p.on('close', () => resolve(out.trim().split('\n')[0] || ''));
  });
  await new Promise((resolve, reject) => {
    const p = spawn('yt-dlp', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => reject(new Error(
      e.code === 'ENOENT'
        ? 'yt-dlp is not installed on the converter host (https://github.com/yt-dlp/yt-dlp).'
        : `Could not start yt-dlp: ${e.message}`,
    )));
    p.on('close', (code) => (code === 0
      ? resolve()
      : reject(new Error(`yt-dlp/ffmpeg failed (exit ${code}): ${err.trim().split('\n').pop() || 'unknown error'}`))));
  });
  const files = (await readdir(dir)).filter((f) => f.endsWith('.mp3'));
  if (!files.length) throw new Error('Conversion produced no MP3 file.');
  return { file: join(dir, files[0]), title };
}

/** Second path: the Invidious relay (full downloads, needs ffmpeg here). */
async function convertWithRelay(videoId, dir) {
  const { title, buffer, contentType } = await convertViaRelay(videoId);
  const ext = contentType.includes('webm') ? 'webm' : contentType.includes('mp4') ? 'm4a' : 'bin';
  const raw = join(dir, `relay.${ext}`);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(raw, buffer);
  const mp3 = join(dir, 'audio.mp3');
  await transcodeToMp3(raw, mp3);
  return { file: mp3, title };
}

/** Download + convert one video to an MP3 file in a fresh temp dir. */
async function convert(videoId) {
  const dir = await mkdtemp(join(tmpdir(), 'stems-yt-'));
  const attempts = [
    ['custom engine', () => convertWithEngine(videoId, dir)],
    ['invidious relay', () => convertWithRelay(videoId, dir)],
    ['yt-dlp', () => convertWithYtDlp(videoId, dir)],
  ];
  const errors = [];
  for (const [name, run] of attempts) {
    try {
      const { file, title } = await run();
      return { dir, file, title };
    } catch (error) {
      errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.join(' · '));
}

if (spawnSync('ffmpeg', ['--version'], { stdio: 'ignore' }).error) {
  console.error('[yt-server] Missing on PATH: ffmpeg. Install it, then re-run. (yt-dlp is now only an optional fallback.)');
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/health') return send(res, 200, 'ok', { 'Content-Type': 'text/plain' });
  if (path !== '/api/youtube-mp3') return send(res, 404, 'Not found');
  const videoId = videoIdFrom(req);
  if (!videoId) return send(res, 400, 'Missing or invalid YouTube video id / url');
  let work;
  try {
    work = await convert(videoId);
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="youtube-${videoId}.mp3"`,
      ...(work.title ? { 'X-Video-Title': encodeURIComponent(work.title) } : {}),
      'Cache-Control': 'private, max-age=3600',
    });
    const stream = createReadStream(work.file);
    stream.pipe(res);
    stream.on('close', () => { void rm(work.dir, { recursive: true, force: true }); });
    res.on('close', () => { if (!stream.destroyed) stream.destroy(); });
  } catch (err) {
    if (work?.dir && existsSync(work.dir)) void rm(work.dir, { recursive: true, force: true });
    if (!res.headersSent) send(res, 502, err instanceof Error ? err.message : String(err), { 'Content-Type': 'text/plain' });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`[yt-server] YouTube->MP3 converter listening on http://127.0.0.1:${PORT}/api/youtube-mp3`);
});

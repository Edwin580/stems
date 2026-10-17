/**
 * Song identity and lyrics lookup.
 *
 * The title and artist come from the file's ID3 tags when it has them, else
 * from its name ("Artist - Title_128k.mp3" style). Synced lyrics come from
 * LRCLIB (lrclib.net), a free, open lyrics database with a CORS-enabled API.
 */
import { parseLrc, type LyricLine } from './lrc';

export interface SongInfo { title: string; artist: string }

/** Read TIT2/TPE1 from an ID3v2.2–2.4 tag at the start of the bytes. */
export function readId3(bytes: Uint8Array): Partial<SongInfo> {
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return {};
  const ver = bytes[3];
  const flags = bytes[5];
  const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
  const end = Math.min(bytes.length, 10 + size);
  let o = 10;
  if (flags & 0x40 && ver >= 3) {
    // Extended header: skip it.
    const ext = ver === 4
      ? ((bytes[o] & 0x7f) << 21) | ((bytes[o + 1] & 0x7f) << 14) | ((bytes[o + 2] & 0x7f) << 7) | (bytes[o + 3] & 0x7f)
      : ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) + 4;
    o += ext;
  }
  const idLen = ver === 2 ? 3 : 4;
  const head = ver === 2 ? 6 : 10;
  const want: Record<string, keyof SongInfo> = ver === 2 ? { TT2: 'title', TP1: 'artist' } : { TIT2: 'title', TPE1: 'artist' };
  const out: Partial<SongInfo> = {};
  while (o + head <= end) {
    const id = String.fromCharCode(...bytes.subarray(o, o + idLen));
    if (!/^[A-Z0-9]+$/.test(id)) break; // padding
    const len = ver === 2
      ? (bytes[o + 3] << 16) | (bytes[o + 4] << 8) | bytes[o + 5]
      : ver === 4
        ? ((bytes[o + 4] & 0x7f) << 21) | ((bytes[o + 5] & 0x7f) << 14) | ((bytes[o + 6] & 0x7f) << 7) | (bytes[o + 7] & 0x7f)
        : ((bytes[o + 4] << 24) | (bytes[o + 5] << 16) | (bytes[o + 6] << 8) | bytes[o + 7]) >>> 0;
    const body = bytes.subarray(o + head, Math.min(end, o + head + len));
    if (want[id] && body.length > 1) {
      const text = decodeId3Text(body).split('\0')[0].trim();
      if (text) out[want[id]] = text;
    }
    o += head + len;
  }
  return out;
}

function decodeId3Text(body: Uint8Array): string {
  const enc = body[0];
  const data = body.subarray(1);
  if (enc === 1) return new TextDecoder('utf-16').decode(data); // with BOM
  if (enc === 2) return new TextDecoder('utf-16be').decode(data);
  if (enc === 3) return new TextDecoder('utf-8').decode(data);
  return new TextDecoder('latin1').decode(data);
}

/**
 * A clean song name from a file name. "A - B" could be artist-title or
 * title-artist, so it stays one string (search handles either order).
 */
export function infoFromFileName(name: string): SongInfo {
  const title = name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' ')
    .replace(/[([](official|lyrics?|audio|video|hd|hq|visuali[sz]er|music video)[^)\]]*[)\]]/gi, '')
    .replace(/\b\d{2,3}\s?k(bps)?\b/gi, '')
    .replace(/\s+([-–—])\s+/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();
  return { artist: '', title };
}

/** Title and artist for a file: tags first, file name for anything missing. */
export async function songInfo(file: File): Promise<SongInfo> {
  const fromName = infoFromFileName(file.name);
  let tags: Partial<SongInfo> = {};
  try { tags = readId3(new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer())); } catch { /* unreadable */ }
  return { title: tags.title || fromName.title, artist: tags.artist || '' };
}

export interface LyricsResult {
  title: string;
  artist: string;
  album: string;
  duration: number;
  synced: LyricLine[];
  plain: string;
}

interface LrclibRow {
  trackName?: string; artistName?: string; albumName?: string; duration?: number;
  syncedLyrics?: string | null; plainLyrics?: string | null; instrumental?: boolean;
}

/**
 * Search LRCLIB. Results with synced lyrics come first, then by how close
 * their length is to the song's (when known).
 */
export async function searchLyrics(query: string, durationSec = 0, fetchFn: typeof fetch = fetch, retryDelayMs = 1500): Promise<LyricsResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
  let res = await fetchFn(url);
  for (let retry = 1; retry <= 2 && (res.status === 503 || res.status === 429); retry++) {
    await new Promise((r) => setTimeout(r, retryDelayMs * retry));
    res = await fetchFn(url);
  }
  if (!res.ok) throw new Error(res.status === 503 ? 'The lyrics service is busy. Try again in a moment.' : `Lyrics search failed (HTTP ${res.status}).`);
  const rows = (await res.json()) as LrclibRow[];
  const out = rows
    .filter((r) => !r.instrumental && (r.syncedLyrics || r.plainLyrics))
    .map((r) => ({
      title: r.trackName ?? '',
      artist: r.artistName ?? '',
      album: r.albumName ?? '',
      duration: r.duration ?? 0,
      synced: r.syncedLyrics ? parseLrc(r.syncedLyrics) : [],
      plain: r.plainLyrics ?? '',
    }));
  const off = (r: LyricsResult) => (durationSec && r.duration ? Math.abs(r.duration - durationSec) : 30);
  return out.sort((a, b) => Number(b.synced.length > 0) - Number(a.synced.length > 0) || off(a) - off(b)).slice(0, 8);
}

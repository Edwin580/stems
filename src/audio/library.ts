/**
 * The song library: audio files kept on this device (IndexedDB), so they can
 * be reopened without picking them again. Each song is stored once, keyed by
 * the SHA-256 of its bytes (the same key the analysis cache uses, so a
 * reopened song also skips analysis).
 */
import { songInfo, type SongInfo } from '../lyrics/search';
import { hashBytes } from './cache';

export interface LibrarySong {
  id: string;
  name: string;
  title: string;
  artist: string;
  type: string;
  size: number;
  /** Seconds; 0 until the song has been decoded once. */
  duration: number;
  addedAt: number;
  playedAt: number;
}

interface Stored extends LibrarySong { blob: Blob }

const DB = 'stems-library';
const STORE = 'songs';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then((db) => new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Storage aborted'));
  }));
}

/** Ask the browser not to evict the library under storage pressure (best effort). */
export function persist(): void {
  try { void navigator.storage?.persist?.(); } catch { /* unsupported */ }
}

/**
 * Add a file (no-op if the same audio is already there); returns its entry
 * and whether this call stored it.
 */
export async function addSong(file: File, known?: SongInfo): Promise<LibrarySong & { isNew: boolean }> {
  const id = await hashBytes(await file.arrayBuffer());
  const existing = await run<Stored>('readonly', (s) => s.get(id));
  if (existing) {
    const { blob: _b, ...meta } = existing;
    return { ...meta, isNew: false };
  }
  const info = known ?? await songInfo(file);
  const entry: Stored = {
    id, name: file.name, title: info.title, artist: info.artist, type: file.type, size: file.size,
    duration: 0, addedAt: Date.now(), playedAt: 0, blob: file,
  };
  await run('readwrite', (s) => s.put(entry));
  persist();
  const { blob: _b, ...meta } = entry;
  return { ...meta, isNew: true };
}

/** All songs, most recently played (or added) first, without their audio. */
export async function listSongs(): Promise<LibrarySong[]> {
  const all = (await run<Stored[]>('readonly', (s) => s.getAll())) ?? [];
  return all
    .map(({ blob: _b, ...meta }) => meta)
    .sort((a, b) => Math.max(b.playedAt, b.addedAt) - Math.max(a.playedAt, a.addedAt));
}

/** The song's audio as a File, ready to load. */
export async function songFile(id: string): Promise<File | null> {
  const e = await run<Stored>('readonly', (s) => s.get(id));
  return e ? new File([e.blob], e.name, { type: e.type || e.blob.type }) : null;
}

export async function updateSong(id: string, patch: Partial<Omit<LibrarySong, 'id'>>): Promise<void> {
  const e = await run<Stored>('readonly', (s) => s.get(id));
  if (e) await run('readwrite', (s) => s.put({ ...e, ...patch }));
}

export async function removeSong(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}

/** Filter by a free-text query over title, artist and file name. */
export function matchSongs(songs: LibrarySong[], query: string): LibrarySong[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return songs;
  return songs.filter((s) => {
    const hay = `${s.title} ${s.artist} ${s.name}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

// ---- Links ----------------------------------------------------------------------------

/**
 * Turn share-page links into direct file links where the host has a known
 * pattern (Dropbox, Internet Archive item pages stay as they are).
 */
export function directAudioUrl(input: string): string {
  const url = new URL(input.trim());
  if (/(^|\.)dropbox\.com$/i.test(url.hostname)) {
    url.hostname = 'dl.dropboxusercontent.com';
    url.searchParams.delete('dl');
  }
  return url.toString();
}

/** Download an audio file from a link, with progress. Throws a readable error. */
export async function fetchAudioFile(input: string, onProgress?: (f: number) => void, fetchFn: typeof fetch = fetch, nameHint?: string): Promise<File> {
  let url: string;
  try { url = directAudioUrl(input); } catch { throw new Error('That is not a valid link.'); }
  let res: Response;
  try {
    res = await fetchFn(url);
  } catch {
    throw new Error("That site doesn't let other apps download its files. Download it, then open or share the file instead.");
  }
  if (!res.ok) throw new Error(`The link returned HTTP ${res.status}.`);
  const type = res.headers.get('content-type') ?? '';
  if (/text\/html/i.test(type)) throw new Error('That link opens a web page, not an audio file. Use the direct file link.');
  const total = Number(res.headers.get('content-length')) || 0;
  const parts: Uint8Array[] = [];
  let got = 0;
  if (res.body) {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      if (total) onProgress?.(got / total);
    }
  } else {
    parts.push(new Uint8Array(await res.arrayBuffer()));
  }
  const fromPath = decodeURIComponent(new URL(res.url || url).pathname.split('/').pop() || '') || 'audio';
  const disposition = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(res.headers.get('content-disposition') ?? '')?.[1];
  const name = nameHint ?? (disposition ? decodeURIComponent(disposition) : fromPath);
  return new File(parts as BlobPart[], name, { type: type.split(';')[0] || 'audio/mpeg' });
}

// ---- Share target inbox ---------------------------------------------------------------

/** Files the service worker received from the system Share menu (see public/sw.js). */
export async function takeSharedFiles(): Promise<File[]> {
  if (typeof caches === 'undefined') return [];
  try {
    const cache = await caches.open('stems-inbox');
    const files: File[] = [];
    for (const req of await cache.keys()) {
      const res = await cache.match(req);
      if (res) {
        const name = decodeURIComponent(new URL(req.url).pathname.split('/').pop() || 'shared audio');
        files.push(new File([await res.blob()], name, { type: res.headers.get('content-type') ?? '' }));
      }
      await cache.delete(req);
    }
    return files;
  } catch {
    return [];
  }
}

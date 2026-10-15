import type { Analysis } from '../engine/analyze';
import type { Stems } from '../engine/separate';

/**
 * IndexedDB cache so a track opens instantly the second time. Analysis is
 * keyed by (engine version, SHA-256 of the file, playback sample rate);
 * separated stems by the same plus the separation method. Everything is
 * best-effort: any storage failure just means recomputing.
 */

/** Bump when analysis output changes shape or meaning. */
export const ANALYSIS_VERSION = 3;
const DB = 'stems-cache';
const STORE = 'entries';

export async function hashBytes(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function get<T>(key: string): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise<T | null>((resolve) => {
      const r = db.transaction(STORE).objectStore(STORE).get(key);
      r.onsuccess = () => resolve((r.result as T) ?? null);
      r.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function put(key: string, value: unknown): Promise<boolean> {
  try {
    const db = await open();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}

const aKey = (hash: string, sr: number) => `analysis:v${ANALYSIS_VERSION}:${hash}:${sr}`;
const sKey = (hash: string, sr: number, method: string) => `stems:${method}:${hash}:${sr}`;

export const getAnalysis = (hash: string, sr: number) => get<Analysis>(aKey(hash, sr));
export const putAnalysis = (hash: string, sr: number, a: Analysis) => put(aKey(hash, sr), a);
export const getStems = (hash: string, sr: number, method: string) => get<Stems>(sKey(hash, sr, method));
/** Stems are large (tens to hundreds of MB): only worth caching for the slow ML method. */
export const putStems = (hash: string, sr: number, s: Stems) => put(sKey(hash, sr, s.method), s);

export async function clearCache(): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* ignore */ }
}

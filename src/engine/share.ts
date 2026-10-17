/**
 * Share links carry seam choices and settings, never audio: the recipient
 * opens the same file and the link is applied once its hash matches.
 */
export interface ShareState {
  v: 1;
  /** First 16 hex chars of the file's SHA-256. */
  h: string;
  /** Display name of the track. */
  n?: string;
  mode: 'endless' | 'loop';
  /** Loop as [startSample, endSample] at sample rate `sr`. */
  loop?: [number, number];
  sr: number;
  settings?: { bars?: number; thr?: number; fade?: number; barLock?: boolean; phrase?: number };
  /** Stem gains (by stem name) and locked stems. */
  gains?: Record<string, number>;
  locks?: string[];
}

const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))));

export function encodeShare(s: ShareState): string {
  return `#share=${b64url(JSON.stringify(s))}`;
}

export function decodeShare(hash: string): ShareState | null {
  const m = /[#&]share=([A-Za-z0-9_-]+)/.exec(hash);
  if (!m) return null;
  try {
    const s = JSON.parse(unb64url(m[1])) as ShareState;
    if (s.v !== 1 || typeof s.h !== 'string' || (s.mode !== 'endless' && s.mode !== 'loop')) return null;
    return s;
  } catch {
    return null;
  }
}

/** Map a shared loop (possibly at another sample rate) to this session's rate. */
export function scaleLoop(loop: [number, number], fromSr: number, toSr: number): [number, number] {
  const r = toSr / fromSr;
  return [Math.round(loop[0] * r), Math.round(loop[1] * r)];
}

/**
 * LRC lyric files: synced lyrics as plain text.
 *
 * Format: one or more timestamps per line, e.g.
 *   [00:12.34]First line of the verse
 *   [00:15.00][00:45.00]Chorus line repeated later
 * Metadata tags like [ti:Title] are ignored.
 */

/** One synced lyric line. */
export interface LyricLine {
  /** Start time in seconds. */
  time: number;
  text: string;
}

const TS = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/** Parse LRC text into time-sorted lyric lines. Empty/instrumental lines are dropped. */
export function parseLrc(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const times: number[] = [];
    let m: RegExpExecArray | null;
    TS.lastIndex = 0;
    while ((m = TS.exec(line))) {
      const min = Number(m[1]);
      const sec = Number(m[2]);
      const frac = m[3] ? Number(m[3]) / 10 ** m[3].length : 0;
      times.push(min * 60 + sec + frac);
    }
    const text = line.replace(TS, '').trim();
    if (!times.length || !text) continue;
    for (const t of times) lines.push({ time: t, text });
  }
  lines.sort((a, b) => a.time - b.time);
  return lines;
}

/** Index of the lyric line active at `seconds` (-1 if none yet). */
export function lineAt(lines: LyricLine[], seconds: number): number {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= seconds) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

import { describe, expect, it } from 'vitest';
import { parseLrc, lineAt } from '../src/lyrics/lrc';
import { alignLoopsToLyrics } from '../src/lyrics/loopalign';
import { parseYouTubeId } from '../src/sources/youtube';
import {
  base64Url, codeChallenge, normalizeSpotifySection, spotifyPlaybackSnapshot, spotifySectionDue,
} from '../src/sources/spotify';
import type { LoopCandidate } from '../src/engine/loops';

describe('LRC parsing', () => {
  it('parses timestamps, repeats and metadata', () => {
    const lrc = `[ti:Test Song]\n[ar:Someone]\n[00:12.34]First line\n[00:15.00][00:45.00]Chorus\n[01:02]No fraction\n\n[bad]no time\n[02:00.000]Millis\n`;
    const lines = parseLrc(lrc);
    expect(lines.map((l) => l.text)).toEqual(['First line', 'Chorus', 'Chorus', 'No fraction', 'Millis']);
    expect(lines[0].time).toBeCloseTo(12.34, 6);
    expect(lines[1].time).toBe(15);
    expect(lines[2].time).toBe(45);
    expect(lines[4].time).toBe(120);
  });

  it('finds the active line', () => {
    const lines = parseLrc('[00:10.00]a\n[00:20.00]b\n[00:30.00]c\n');
    expect(lineAt(lines, 0)).toBe(-1);
    expect(lineAt(lines, 10)).toBe(0);
    expect(lineAt(lines, 29.99)).toBe(1);
    expect(lineAt(lines, 100)).toBe(2);
  });
});

describe('lyric-aligned loop ranking', () => {
  const mk = (startSample: number, endSample: number, cost: number): LoopCandidate => ({
    startBeat: 0, endBeat: 8, startSample, endSample, cost, rho: 0.9, quality: 90, bars: 2, seconds: 4,
    fade: 0, drift: 0, spectralDb: 0,
  });
  const sr = 44100;

  it('prefers loops that start on a lyric line', () => {
    const lines = [{ time: 10, text: 'verse' }, { time: 20, text: 'chorus' }];
    // A: slightly worse seam but starts exactly on the lyric; B: better seam, mid-line.
    const a = mk(10 * sr, 14 * sr, 0.20);
    const b = mk(15 * sr, 19 * sr, 0.05);
    const ranked = alignLoopsToLyrics([b, a], lines, sr);
    expect(ranked[0]).toBe(a);
  });

  it('is a no-op without lyrics', () => {
    const loops = [mk(0, 100, 0.1), mk(50, 150, 0.2)];
    expect(alignLoopsToLyrics(loops, [], sr)).toEqual(loops);
  });
});

describe('YouTube URL parsing', () => {
  const cases: [string, string | null][] = [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share', 'dQw4w9WgXcQ'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=abc', 'dQw4w9WgXcQ'],
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=short', null],
    ['not a url at all!!!', null],
    ['https://example.com/watch?v=dQw4w9WgXcQ', null],
  ];
  for (const [input, expected] of cases) {
    it(`parses ${input}`, () => expect(parseYouTubeId(input)).toBe(expected));
  }
});

describe('Spotify-native looping', () => {
  it('normalizes and clamps an A-B section', () => {
    expect(normalizeSpotifySection(-500, 12_345, 10_000)).toEqual({ startMs: 0, endMs: 10_000 });
    expect(normalizeSpotifySection(2_000, 8_000, 10_000)).toEqual({ startMs: 2_000, endMs: 8_000 });
  });

  it('rejects sections shorter than one second', () => {
    expect(normalizeSpotifySection(2_000, 2_500, 10_000)).toBeNull();
    expect(normalizeSpotifySection(2_000, 8_000, 0)).toBeNull();
  });

  it('fires only at or after the section end', () => {
    const section = { startMs: 2_000, endMs: 8_000 };
    expect(spotifySectionDue(7_999, section)).toBe(false);
    expect(spotifySectionDue(8_000, section)).toBe(true);
    expect(spotifySectionDue(8_000, null)).toBe(false);
  });

  it('normalizes Web Playback SDK state', () => {
    const snapshot = spotifyPlaybackSnapshot({
      paused: false,
      position: 42_000,
      duration: 180_000,
      track_window: { current_track: { id: 'abc', uri: 'spotify:track:abc', name: 'Song', duration_ms: 180_000 } },
    });
    expect(snapshot).toEqual({
      paused: false, positionMs: 42_000, durationMs: 180_000,
      trackId: 'abc', trackUri: 'spotify:track:abc', trackName: 'Song',
    });
    expect(spotifyPlaybackSnapshot(null)).toBeNull();
  });
});

describe('PKCE', () => {
  it('matches the RFC 7636 test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(await codeChallenge(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('base64url-encodes without padding or unsafe chars', () => {
    const out = base64Url(new Uint8Array([251, 255, 190, 0, 1]));
    expect(out).not.toMatch(/[+/=]/);
  });
});

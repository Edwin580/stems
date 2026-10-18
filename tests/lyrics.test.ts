import { describe, expect, it } from 'vitest';
import { parseLrc, lineAt } from '../src/lyrics/lrc';
import { alignLoopsToLyrics } from '../src/lyrics/loopalign';
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
    expect(parseLrc('[00:12.5]Tenths')[0].time).toBeCloseTo(12.5, 6);
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


describe('song identity and lyrics search', () => {
  it('reads title and artist from ID3v2.3 tags', async () => {
    const { id3v23 } = await import('../src/engine/id3');
    const { readId3 } = await import('../src/lyrics/search');
    const tag = id3v23({ title: 'Café Song', artist: 'Björk' });
    expect(readId3(tag)).toEqual({ title: 'Café Song', artist: 'Björk' });
    expect(readId3(new Uint8Array([1, 2, 3]))).toEqual({});
  });

  it('cleans up file names into a song name', async () => {
    const { infoFromFileName } = await import('../src/lyrics/search');
    expect(infoFromFileName('Hit_and_Run_-_Remy_Sher_128k.mp3')).toEqual({ artist: '', title: 'Hit and Run - Remy Sher' });
    expect(infoFromFileName('Daft Punk - One More Time (Official Video).m4a')).toEqual({ artist: '', title: 'Daft Punk - One More Time' });
    expect(infoFromFileName('just a title.wav')).toEqual({ artist: '', title: 'just a title' });
  });

  it('ranks synced lyrics of the right length first', async () => {
    const { searchLyrics } = await import('../src/lyrics/search');
    const rows = [
      { trackName: 'Plain', artistName: 'A', duration: 200, plainLyrics: 'la', syncedLyrics: null },
      { trackName: 'Far', artistName: 'A', duration: 400, syncedLyrics: '[00:01.00]x' },
      { trackName: 'Close', artistName: 'A', duration: 201, syncedLyrics: '[00:01.00]y' },
      { trackName: 'Inst', artistName: 'A', duration: 200, instrumental: true },
    ];
    let url = '';
    const f = (async (u: string) => { url = u; return Response.json(rows); }) as unknown as typeof fetch;
    const res = await searchLyrics('a song', 200, f);
    expect(url).toBe('https://lrclib.net/api/search?q=a%20song');
    expect(res.map((r) => r.title)).toEqual(['Close', 'Far', 'Plain']);
    expect(res[0].synced[0]).toEqual({ time: 1, text: 'y' });
    const busy = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
    await expect(searchLyrics('x', 0, busy, 1)).rejects.toThrow(/busy/);
  });
});

describe('lyric-aware seams', () => {
  it('penalises beats inside a sung line, not at line starts or before the first line', async () => {
    const { lyricBoundaryPenalty } = await import('../src/lyrics/loopalign');
    const sr = 1000;
    const beats = [0, 1000, 2000, 2500, 3000, 4000, 9000, 15000, 20000].map((x) => x);
    const lines = [{ time: 2, text: 'a' }, { time: 4, text: 'b' }];
    const p = Array.from(lyricBoundaryPenalty(lines, beats, sr, 0.3)).map((x) => +x.toFixed(2));
    // 0 s, 1 s: before the first line. 2 s: line start. 2.5, 3 s: inside line a.
    // 4 s: line start. 9 s: inside b (b runs at most 8 s). 15 s: in the long gap. 20 s: gap.
    expect(p).toEqual([0, 0, 0, 0.3, 0.3, 0, 0.3, 0.06, 0.06]);
  });
});

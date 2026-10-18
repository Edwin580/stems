import { describe, expect, it } from 'vitest';
import { directAudioUrl, fetchAudioFile, matchSongs, type LibrarySong } from '../src/audio/library';

const song = (title: string, artist: string, name = `${title}.mp3`): LibrarySong =>
  ({ id: title, name, title, artist, type: 'audio/mpeg', size: 1, duration: 0, addedAt: 0, playedAt: 0 });

describe('library', () => {
  it('searches title, artist and file name, all words must match', () => {
    const lib = [song('Hit and Run', 'Remy Sher'), song('One More Time', 'Daft Punk'), song('Untitled', '', 'demo_take2.wav')];
    expect(matchSongs(lib, '').length).toBe(3);
    expect(matchSongs(lib, 'remy').map((s) => s.title)).toEqual(['Hit and Run']);
    expect(matchSongs(lib, 'daft time').map((s) => s.title)).toEqual(['One More Time']);
    expect(matchSongs(lib, 'take2').map((s) => s.title)).toEqual(['Untitled']);
    expect(matchSongs(lib, 'daft remy')).toEqual([]);
  });

  it('turns Dropbox share links into direct file links', () => {
    expect(directAudioUrl('https://www.dropbox.com/scl/fi/abc/song.mp3?rlkey=x&dl=0')).toBe('https://dl.dropboxusercontent.com/scl/fi/abc/song.mp3?rlkey=x');
    expect(directAudioUrl(' https://archive.org/download/item/track.mp3 ')).toBe('https://archive.org/download/item/track.mp3');
    expect(() => directAudioUrl('not a link')).toThrow();
  });

  it('downloads a linked file with progress and a sensible name, and explains failures', async () => {
    const bytes = new Uint8Array(5000).fill(7);
    const ok = (async () => new Response(bytes, { headers: { 'content-type': 'audio/mpeg', 'content-length': '5000', 'content-disposition': 'attachment; filename="My Song.mp3"' } })) as unknown as typeof fetch;
    const seen: number[] = [];
    const f = await fetchAudioFile('https://example.org/x', (p) => seen.push(p), ok);
    expect([f.name, f.type, f.size]).toEqual(['My Song.mp3', 'audio/mpeg', 5000]);
    expect(seen.at(-1)).toBe(1);
    const page = (async () => new Response('<html>', { headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch;
    await expect(fetchAudioFile('https://example.org/x', undefined, page)).rejects.toThrow(/web page/);
    const blocked = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    await expect(fetchAudioFile('https://example.org/x', undefined, blocked)).rejects.toThrow(/doesn't let other apps/);
    const missing = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    await expect(fetchAudioFile('https://example.org/x', undefined, missing)).rejects.toThrow(/404/);
  });
});

import { describe, expect, it } from 'vitest';
import { parseLrc, lineAt } from '../src/lyrics/lrc';
import { alignLoopsToLyrics } from '../src/lyrics/loopalign';
import { parseYouTubeId } from '../src/sources/youtube';
import {
  encodeMp3, fetchYouTubeMp3, mp3FileName, pickInvidiousAudio, safeErrorDetail,
  YouTubeBotCheckError, youtubeMp3Endpoint, youtubeMp3RequestUrl, type DecodableAudio,
} from '../src/sources/youtube-mp3';
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

describe('YouTube -> MP3 conversion', () => {
  it('resolves the converter endpoint', () => {
    expect(youtubeMp3Endpoint()).toBe('/api/youtube-mp3');
    expect(youtubeMp3Endpoint('')).toBe('/api/youtube-mp3');
    expect(youtubeMp3Endpoint('https://convert.example.com/api')).toBe('https://convert.example.com/api/youtube-mp3');
    expect(youtubeMp3Endpoint('https://convert.example.com/api/youtube-mp3')).toBe('https://convert.example.com/api/youtube-mp3');
    expect(youtubeMp3Endpoint('https://convert.example.com/api/')).toBe('https://convert.example.com/api/youtube-mp3');
  });

  it('builds the request URL from a video id', () => {
    expect(youtubeMp3RequestUrl('/api/youtube-mp3', 'dQw4w9WgXcQ')).toBe('/api/youtube-mp3?v=dQw4w9WgXcQ');
  });

  it('sanitizes titles into safe mp3 file names', () => {
    expect(mp3FileName('Never Gonna Give You Up', 'dQw4w9WgXcQ')).toBe('Never Gonna Give You Up.mp3');
    expect(mp3FileName('a/b: c? "d" <e>', 'dQw4w9WgXcQ')).toBe('ab c d e.mp3');
    expect(mp3FileName(null, 'dQw4w9WgXcQ')).toBe('youtube-dQw4w9WgXcQ.mp3');
    expect(mp3FileName('   ', 'dQw4w9WgXcQ')).toBe('youtube-dQw4w9WgXcQ.mp3');
  });

  it('fetches an MP3 File named from the X-Video-Title header', async () => {
    const fetchFn = async (url: string) => {
      expect(url).toBe('/api/youtube-mp3?v=dQw4w9WgXcQ');
      return new Response(new Blob(['fake-mp3'], { type: 'audio/mpeg' }), {
        status: 200,
        headers: { 'X-Video-Title': encodeURIComponent('Test Song (Official)') },
      });
    };
    const file = await fetchYouTubeMp3('https://youtu.be/dQw4w9WgXcQ', { endpoint: '/api/youtube-mp3', trySameOrigin: true, instances: [], fetchFn: fetchFn as typeof fetch });
    expect(file.name).toBe('Test Song (Official).mp3');
    expect(file.type).toBe('audio/mpeg');
    expect(file.size).toBe(8);
  });

  it('rejects non-YouTube input before any fetch', async () => {
    const fetchFn = async () => { throw new Error('must not be called'); };
    await expect(fetchYouTubeMp3('https://example.com/watch?v=dQw4w9WgXcQ', { fetchFn: fetchFn as typeof fetch }))
      .rejects.toThrow(/YouTube link/);
  });

  it('never dumps an HTML error page into the message', () => {
    expect(safeErrorDetail('<!DOCTYPE html><html><head><title>404</title></head></html>')).toBe('');
    expect(safeErrorDetail('yt-dlp failed')).toBe('yt-dlp failed');
  });

  it('falls back to Invidious and re-encodes m4a audio to a real MP3', async () => {
    const fakePcm: DecodableAudio = {
      numberOfChannels: 2, sampleRate: 44_100, length: 4_410,
      getChannelData: () => Float32Array.from({ length: 4_410 }, (_, i) => Math.sin(i / 20) * 0.5),
    };
    const fetchFn = async (url: string) => {
      if (url.includes('/api/v1/videos/')) {
        return Response.json({
          title: 'Hit and Run',
          adaptiveFormats: [
            { itag: 251, type: 'audio/webm; codecs="opus"', bitrate: 150_000, url: 'https://inv.example/opus' },
            { itag: 140, type: 'audio/mp4; codecs="mp4a.40.2"', bitrate: 130_000, url: 'https://inv.example/m4a' },
          ],
        });
      }
      expect(url).toBe('https://inv.example/m4a'); // mp4 preferred over higher-bitrate opus
      return new Response(new Blob(['FAKE-M4A-AUDIO'], { type: 'audio/mp4' }), { status: 200 });
    };
    const file = await fetchYouTubeMp3('https://youtu.be/Gw_NGU6osNo', {
      instances: ['https://inv.example'],
      fetchFn: fetchFn as typeof fetch,
      decodeAudio: async () => fakePcm,
    });
    expect(file.name).toBe('Hit and Run.mp3');
    expect(file.type).toBe('audio/mpeg');
    expect(file.size).toBeGreaterThan(500);
    const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    expect(head[0]).toBe(0xff);
    expect(head[1] & 0xe0).toBe(0xe0); // MP3 frame sync
  });

  it('raises the bot-check error when the fallback serves an HTML challenge', async () => {
    const fetchFn = async (url: string) => {
      if (url.includes('/api/v1/videos/')) {
        return Response.json({
          title: 'Song',
          adaptiveFormats: [{ itag: 140, type: 'audio/mp4', bitrate: 128_000, url: 'https://inv.example/media' }],
        });
      }
      return new Response('<!DOCTYPE html><html><title>Making sure you are not a bot!</title>', {
        status: 200, headers: { 'Content-Type': 'text/html' },
      });
    };
    const err = await fetchYouTubeMp3('Gw_NGU6osNo', { instances: ['https://inv.example'], fetchFn: fetchFn as typeof fetch })
      .catch((e) => e);
    expect(err).toBeInstanceOf(YouTubeBotCheckError);
    expect(err.instance).toBe('https://inv.example');
  });

  it('picks the best audio format (mp4 first, then bitrate)', () => {
    const best = pickInvidiousAudio([
      { type: 'audio/webm', bitrate: 160_000, url: 'a' },
      { type: 'audio/mp4', bitrate: 96_000, url: 'b' },
      { type: 'video/mp4', bitrate: 999_000, url: 'c' },
    ]);
    expect(best?.url).toBe('b');
    expect(pickInvidiousAudio([{ type: 'video/mp4', url: 'c' }])).toBeNull();
  });

  it('encodes PCM to an MP3 blob with a frame sync', () => {
    const pcm: DecodableAudio = {
      numberOfChannels: 1, sampleRate: 22_050, length: 2_205,
      getChannelData: () => Float32Array.from({ length: 2_205 }, (_, i) => Math.sin(i / 10) * 0.4),
    };
    const blob = encodeMp3(pcm);
    expect(blob.type).toBe('audio/mpeg');
    expect(blob.size).toBeGreaterThan(100);
  });

  it('ends with the local-converter advice when every route fails', async () => {
    const fetchFn = async () => new Response('nope', { status: 502 });
    await expect(fetchYouTubeMp3('dQw4w9WgXcQ', { endpoint: '/api/youtube-mp3', trySameOrigin: true, instances: [], fetchFn: fetchFn as typeof fetch }))
      .rejects.toThrow(/npm run yt-server/);
  });
});

describe('Spotify-native looping', () => {
  it('normalizes and clamps an A-B section', () => {
    expect(normalizeSpotifySection(-500, 12_345, 10_000)).toEqual({ startMs: 0, endMs: 9_700 }); // stops short of the track end
    expect(normalizeSpotifySection(2_000, 8_000, 10_000)).toEqual({ startMs: 2_000, endMs: 8_000 });
  });

  it('rejects sections shorter than one second', () => {
    expect(normalizeSpotifySection(2_000, 2_500, 10_000)).toBeNull();
    expect(normalizeSpotifySection(2_000, 8_000, 0)).toBeNull();
  });

  it('fires at the section end, with a short lookahead for polling and seek latency', () => {
    const section = { startMs: 2_000, endMs: 8_000 };
    expect(spotifySectionDue(7_849, section)).toBe(false);
    expect(spotifySectionDue(7_850, section)).toBe(true); // 150 ms lookahead
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

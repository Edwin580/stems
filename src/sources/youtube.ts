/**
 * YouTube as a source: paste a link, play it in the app.
 *
 * Honest limitation: YouTube audio can't be decoded into a buffer in the
 * browser, so through this player alone the endless-loop engine only applies
 * to uploaded files. YouTube tracks play through the official IFrame player,
 * embedded in the app. To feed a YouTube link to the engine, see
 * youtube-mp3.ts: a small converter endpoint (yt-dlp + ffmpeg) turns the
 * link into an MP3 the app loads exactly like an uploaded file.
 * Optional: set VITE_YOUTUBE_API_KEY for in-app search (Data API v3).
 */

/** Extract the 11-char video ID from watch / youtu.be / embed / shorts / live URLs. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let u: URL;
  try { u = new URL(s.startsWith('http') ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split(/[/?#]/)[0];
    return /^[\w-]{11}$/.test(id) ? id : null;
  }
  if (host === 'youtube.com' || host === 'music.youtube.com' || host.endsWith('.youtube.com')) {
    const v = u.searchParams.get('v');
    if (v && /^[\w-]{11}$/.test(v)) return v;
    for (const prefix of ['/embed/', '/shorts/', '/live/', '/v/']) {
      if (u.pathname.startsWith(prefix)) {
        const id = u.pathname.slice(prefix.length).split(/[/?#]/)[0];
        if (/^[\w-]{11}$/.test(id)) return id;
      }
    }
  }
  return null;
}

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void; }
}

let apiPromise: Promise<any> | null = null;

/** Load the official YouTube IFrame API (idempotent). */
export function loadYouTubeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => { apiPromise = null; reject(new Error('Could not load the YouTube player')); };
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export interface YouTubeEvents {
  onReady?: (duration: number) => void;
  onState?: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
  onError?: (message: string) => void;
}

/** A YouTube video embedded in the app, with a minimal player interface. */
export class YouTubeSource {
  events: YouTubeEvents = {};
  private player: any = null;
  private el: HTMLElement;
  videoId: string | null = null;

  constructor(el: HTMLElement) { this.el = el; }

  async load(videoId: string): Promise<void> {
    const YT = await loadYouTubeApi();
    this.videoId = videoId;
    this.player?.destroy?.();
    this.player = new YT.Player(this.el, {
      videoId,
      width: '100%',
      playerVars: { rel: 0, modestbranding: 1 },
      events: {
        onReady: () => this.events.onReady?.(this.player.getDuration()),
        onStateChange: (e: any) => {
          const s = ({ 1: 'playing', 2: 'paused', 0: 'ended', 3: 'buffering' } as const)[e.data as number];
          if (s) this.events.onState?.(s);
        },
        onError: (e: any) => this.events.onError?.(`YouTube player error ${e.data}`),
      },
    });
  }

  play() { this.player?.playVideo?.(); }
  pause() { this.player?.pauseVideo?.(); }
  seekTo(sec: number) { this.player?.seekTo?.(sec, true); }
  position(): number { return this.player?.getCurrentTime?.() ?? 0; }
  duration(): number { return this.player?.getDuration?.() ?? 0; }
  destroy() { this.player?.destroy?.(); this.player = null; }
}

export interface YouTubeSearchResult { videoId: string; title: string; channel: string; thumbnail: string; }

/** YouTube Data API v3 search. Needs VITE_YOUTUBE_API_KEY; throws a clear error without it. */
export async function searchYouTube(query: string, apiKey: string | undefined): Promise<YouTubeSearchResult[]> {
  if (!apiKey) throw new Error('Set VITE_YOUTUBE_API_KEY in .env to enable YouTube search.');
  const u = new URL('https://www.googleapis.com/youtube/v3/search');
  u.searchParams.set('part', 'snippet');
  u.searchParams.set('type', 'video');
  u.searchParams.set('videoCategoryId', '10'); // music
  u.searchParams.set('maxResults', '10');
  u.searchParams.set('q', query);
  u.searchParams.set('key', apiKey);
  const r = await fetch(u);
  if (!r.ok) throw new Error(`YouTube search failed (${r.status})`);
  const j = await r.json();
  return (j.items ?? [])
    .filter((it: any) => it.id?.videoId)
    .map((it: any) => ({
      videoId: it.id.videoId,
      title: it.snippet.title,
      channel: it.snippet.channelTitle,
      thumbnail: it.snippet.thumbnails?.default?.url ?? '',
    }));
}

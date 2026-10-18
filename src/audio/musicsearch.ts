/**
 * Music search through Audius: an open catalogue where artists publish full
 * tracks for streaming, with a public API that allows browser requests. Only
 * tracks the artist made streamable are listed; they import as MP3.
 */

export interface TrackHit {
  id: string;
  title: string;
  artist: string;
  /** Seconds. */
  duration: number;
  artwork: string;
  genre: string;
  /** The track's page on audius.co. */
  page: string;
}

const API = 'https://api.audius.co/v1';
const APP = 'stems';

interface AudiusTrack {
  id: string; title?: string; duration?: number; genre?: string; permalink?: string;
  is_streamable?: boolean; is_delete?: boolean;
  artwork?: Record<string, string> | null;
  user?: { name?: string; handle?: string };
}

export async function searchTracks(query: string, fetchFn: typeof fetch = fetch): Promise<TrackHit[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetchFn(`${API}/tracks/search?query=${encodeURIComponent(q)}&app_name=${APP}`);
  if (!res.ok) throw new Error(`Music search failed (HTTP ${res.status}).`);
  const { data } = (await res.json()) as { data?: AudiusTrack[] };
  return (data ?? [])
    .filter((t) => t.is_streamable !== false && !t.is_delete)
    .slice(0, 20)
    .map((t) => ({
      id: t.id,
      title: t.title ?? 'Untitled',
      artist: t.user?.name ?? t.user?.handle ?? '',
      duration: t.duration ?? 0,
      artwork: t.artwork?.['150x150'] ?? '',
      genre: t.genre ?? '',
      page: t.permalink ? `https://audius.co${t.permalink}` : 'https://audius.co',
    }));
}

/** Direct MP3 stream of a track (redirects to the artist's content node). */
export function trackAudioUrl(id: string): string {
  return `${API}/tracks/${encodeURIComponent(id)}/stream?app_name=${APP}&skip_play_count=true`;
}

/** File name for an imported track: "Artist - Title.mp3", minus characters file systems reject. */
export function trackFileName(t: Pick<TrackHit, 'title' | 'artist'>): string {
  const base = [t.artist, t.title].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return `${base || 'track'}.mp3`;
}

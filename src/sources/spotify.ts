/**
 * Spotify as a source, wired for a static site (GitHub Pages).
 *
 * Auth uses OAuth Authorization Code with PKCE: no client secret in the
 * browser, only VITE_SPOTIFY_CLIENT_ID. The redirect URI is the app's own
 * root URL (registered in the Spotify developer dashboard); the OAuth
 * `code` lands on the main page and is exchanged right there.
 *
 * Playback: the Web Playback SDK (needs Spotify Premium) on this page as a
 * device; otherwise tracks open in Spotify and 30 s previews play inline
 * where Spotify provides them.
 *
 * The SDK is an Encrypted Media Extensions stream plus playback control and
 * metadata. It deliberately exposes no PCM samples, AudioBuffer or file bytes,
 * so a Spotify track cannot be fed to the local analysis / seamless-loop /
 * stem-separation engine (which starts from decodeAudioData). What Spotify
 * does expose is native track repeat and seek, used below for whole-track and
 * A-B section looping. The sample-accurate engine still needs the same song
 * as a user-supplied audio file.
 */

// The fallback is the public Client ID of the "stems" Spotify developer app.
// For a PKCE app the Client ID is a public identifier (it ships in every
// visitor's browser by design); there is no client secret anywhere in this
// codebase. VITE_SPOTIFY_CLIENT_ID overrides it, e.g. for a fork's own app.
const CLIENT_ID = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)
  ?? '90d6b4f7e843401daf309db1aa6a5a7f';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
].join(' ');

const LS_KEY = 'stems.spotify.tokens';
const VERIFIER_KEY = 'stems.spotify.verifier';

/** The redirect URI: this app's own root URL. Must be registered in the dev dashboard. */
export function redirectUri(): string {
  const { origin, pathname } = window.location;
  const dir = pathname.endsWith('/') ? pathname : pathname.slice(0, pathname.lastIndexOf('/') + 1);
  return origin + dir;
}

export function spotifyConfigured(): boolean {
  return !!CLIENT_ID;
}

interface Tokens { access: string; refresh: string; expiresAt: number; }

function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch { return null; }
}
function saveTokens(t: Tokens) { localStorage.setItem(LS_KEY, JSON.stringify(t)); }
export function spotifyLogout() { localStorage.removeItem(LS_KEY); }

/** RFC 7636 test-vector-compatible PKCE helpers. */
export function base64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function generateVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

/** Step 1: redirect the user to Spotify's consent page. */
export async function spotifyLogin(): Promise<void> {
  if (!CLIENT_ID) throw new Error('Set VITE_SPOTIFY_CLIENT_ID in .env to connect Spotify.');
  const verifier = generateVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = await codeChallenge(verifier);
  const u = new URL('https://accounts.spotify.com/authorize');
  u.searchParams.set('client_id', CLIENT_ID);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', redirectUri());
  u.searchParams.set('scope', SCOPES);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('code_challenge', challenge);
  window.location.assign(u);
}

/** Step 2: on page load with ?code=, exchange it for tokens and clean the URL. Returns true if a login just completed. */
export async function handleSpotifyCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code || !CLIENT_ID) return false;
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('Login session expired; please connect Spotify again.');
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`Spotify login failed (${r.status})`);
  const j = await r.json();
  saveTokens({ access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + j.expires_in * 1000 });
  sessionStorage.removeItem(VERIFIER_KEY);
  window.history.replaceState({}, '', window.location.pathname);
  return true;
}

async function refreshTokens(t: Tokens): Promise<Tokens> {
  const body = new URLSearchParams({ client_id: CLIENT_ID!, grant_type: 'refresh_token', refresh_token: t.refresh });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error('Spotify session expired; please reconnect.');
  const j = await r.json();
  const next: Tokens = {
    access: j.access_token,
    refresh: j.refresh_token ?? t.refresh,
    expiresAt: Date.now() + j.expires_in * 1000,
  };
  saveTokens(next);
  return next;
}

/** Valid access token, refreshing transparently. Null when not logged in. */
export async function spotifyToken(): Promise<string | null> {
  let t = loadTokens();
  if (!t) return null;
  if (Date.now() > t.expiresAt - 60_000) t = await refreshTokens(t);
  return t.access;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await spotifyToken();
  if (!token) throw new Error('Connect Spotify first.');
  const r = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (r.status === 401) { spotifyLogout(); throw new Error('Spotify session expired; please reconnect.'); }
  if (!r.ok) {
    let detail = '';
    try { detail = (await r.json())?.error?.message ?? ''; } catch { /* no body */ }
    if (r.status === 403) throw new Error(`Spotify refused playback${detail ? `: ${detail}` : ''} (in-app playback needs Premium).`);
    if (r.status === 404) throw new Error(`Spotify player not found${detail ? `: ${detail}` : ''}.`);
    throw new Error(`Spotify API error (${r.status})${detail ? `: ${detail}` : ''}`);
  }
  // Player endpoints answer 204 No Content (or an empty 200/202) on success.
  const text = await r.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: string;
  album: string;
  image: string;
  previewUrl: string | null;
  durationMs: number;
}

export interface SpotifySection {
  startMs: number;
  endMs: number;
}

/** Validate and clamp a user-selected A-B section. Sections need at least 1 s. */
export function normalizeSpotifySection(startMs: number, endMs: number, durationMs: number): SpotifySection | null {
  if (![startMs, endMs, durationMs].every(Number.isFinite) || durationMs <= 0) return null;
  const start = Math.min(Math.max(0, Math.floor(startMs)), Math.max(0, durationMs - 1000));
  const end = Math.min(Math.max(0, Math.floor(endMs)), durationMs);
  return end - start >= 1000 ? { startMs: start, endMs: end } : null;
}

/** True when playback has reached the end of an A-B section. */
export function spotifySectionDue(positionMs: number, section: SpotifySection | null): boolean {
  return !!section && positionMs >= section.endMs;
}

export interface SpotifyPlaybackSnapshot {
  paused: boolean;
  positionMs: number;
  durationMs: number;
  trackId: string;
  trackUri: string;
  trackName: string;
}

/** Normalize the Web Playback SDK's player-state object. */
export function spotifyPlaybackSnapshot(state: any): SpotifyPlaybackSnapshot | null {
  const track = state?.track_window?.current_track;
  if (!state || !track) return null;
  return {
    paused: !!state.paused,
    positionMs: Math.max(0, state.position ?? 0),
    durationMs: Math.max(0, state.duration ?? track.duration_ms ?? 0),
    trackId: track.id ?? '',
    trackUri: track.uri ?? '',
    trackName: track.name ?? '',
  };
}

/** Search tracks by name/artist. */
export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  const j = await api<{ tracks: { items: any[] } }>(`/search?q=${encodeURIComponent(query)}&type=track&limit=10`);
  return j.tracks.items.map((t) => ({
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: t.artists.map((a: any) => a.name).join(', '),
    album: t.album.name,
    image: t.album.images?.[2]?.url ?? t.album.images?.[0]?.url ?? '',
    previewUrl: t.preview_url ?? null,
    durationMs: t.duration_ms,
  }));
}

declare global {
  interface Window { Spotify?: any; onSpotifyWebPlaybackSDKReady?: () => void; }
}

let sdkPromise: Promise<any> | null = null;

function loadPlaybackSdk(): Promise<any> {
  if (window.Spotify?.Player) return Promise.resolve(window.Spotify);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const prev = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => { prev?.(); resolve(window.Spotify); };
    const tag = document.createElement('script');
    tag.src = 'https://sdk.scdn.co/spotify-player.js';
    tag.onerror = () => { sdkPromise = null; reject(new Error('Could not load the Spotify player')); };
    document.head.appendChild(tag);
  });
  return sdkPromise;
}

export interface SpotifyPlayerEvents {
  onReady?: (deviceId: string) => void;
  onState?: (playing: boolean, trackName: string) => void;
  onSnapshot?: (snapshot: SpotifyPlaybackSnapshot) => void;
  onError?: (message: string) => void;
}

/**
 * This page as a Spotify Connect device (Premium required). Plays full
 * tracks; without Premium the SDK refuses and the UI falls back to previews.
 */
export class SpotifyWebPlayer {
  events: SpotifyPlayerEvents = {};
  private player: any = null;
  deviceId: string | null = null;

  async connect(): Promise<void> {
    const Spotify = await loadPlaybackSdk();
    this.player = new Spotify.Player({
      name: 'stems (browser)',
      getOAuthToken: async (cb: (t: string) => void) => {
        const t = await spotifyToken();
        if (t) cb(t); else this.events.onError?.('Connect Spotify first.');
      },
      volume: 0.8,
    });
    this.player.addListener('ready', ({ device_id }: any) => {
      this.deviceId = device_id;
      this.events.onReady?.(device_id);
    });
    this.player.addListener('not_ready', () => { this.deviceId = null; });
    this.player.addListener('player_state_changed', (s: any) => {
      const snapshot = spotifyPlaybackSnapshot(s);
      if (snapshot) this.events.onSnapshot?.(snapshot);
      this.events.onState?.(!s?.paused, s?.track_window?.current_track?.name ?? '');
    });
    this.player.addListener('authentication_error', () => this.events.onError?.('Spotify authentication failed; please reconnect.'));
    this.player.addListener('account_error', () => this.events.onError?.('Spotify Premium is required for in-app playback.'));
    this.player.addListener('playback_error', ({ message }: any) => this.events.onError?.(`Playback error: ${message}`));
    const ok = await this.player.connect();
    if (!ok) throw new Error('Could not start the Spotify player (Premium required).');
  }

  /** Connect the in-page device if needed and wait until Spotify reports it ready. */
  async ensureReady(timeoutMs = 15_000): Promise<string> {
    if (this.deviceId) return this.deviceId;
    const ready = new Promise<string>((resolve, reject) => {
      const prev = this.events.onReady;
      const timer = setTimeout(() => reject(new Error('The Spotify player did not become ready (Premium is required for in-app playback).')), timeoutMs);
      this.events.onReady = (id) => { clearTimeout(timer); this.events.onReady = prev; prev?.(id); resolve(id); };
    });
    if (!this.player) await this.connect();
    return ready;
  }

  /**
   * Browsers block audio that doesn't start from a user gesture; the SDK's
   * activateElement() must run synchronously inside the click handler.
   */
  activate() { this.player?.activateElement?.(); }

  async playUri(uri: string): Promise<void> {
    const deviceId = await this.ensureReady();
    const play = () => api(`/me/player/play?device_id=${deviceId}`, { method: 'PUT', body: JSON.stringify({ uris: [uri] }) });
    try {
      await play();
    } catch (err) {
      // A freshly registered device can take a moment to appear in Spotify Connect.
      if (!(err instanceof Error) || !/not found/i.test(err.message)) throw err;
      await new Promise((r) => setTimeout(r, 1500));
      await play();
    }
  }

  /** Spotify's own repeat control: the only true whole-track loop Spotify exposes. */
  async setRepeatMode(state: 'track' | 'context' | 'off'): Promise<void> {
    const deviceId = await this.ensureReady();
    await api(`/me/player/repeat?state=${state}&device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT' });
  }

  /** Seek inside the current Spotify stream (used to restart an A-B section). */
  async seek(positionMs: number): Promise<void> {
    if (!this.player) await this.connect();
    if (!this.player?.seek) throw new Error('The Spotify player does not support seeking.');
    await this.player.seek(Math.max(0, Math.round(positionMs)));
  }

  /** Current playback position / track, or null when nothing is loaded in the SDK. */
  async getSnapshot(): Promise<SpotifyPlaybackSnapshot | null> {
    if (!this.player?.getCurrentState) return null;
    return spotifyPlaybackSnapshot(await this.player.getCurrentState());
  }

  pause() { this.player?.pause(); }
  resume() { this.player?.resume(); }
  disconnect() { this.player?.disconnect(); this.player = null; this.deviceId = null; }
}

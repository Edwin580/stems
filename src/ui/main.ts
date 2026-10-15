import { Player } from '../audio/player';
import { synthSong } from '../engine/demo';
import { bakeLoop, encodeWav, renderPath } from '../engine/render';
import { Planner } from '../engine/planner';
import { costToQuality } from '../engine/similarity';
import type { LoopCandidate } from '../engine/loops';
import { Visualizer } from './visualizer';
import { parseLrc, lineAt, type LyricLine } from '../lyrics/lrc';
import { alignLoopsToLyrics, linesInLoop } from '../lyrics/loopalign';
import { parseYouTubeId, searchYouTube, YouTubeSource } from '../sources/youtube';
import {
  handleSpotifyCallback, searchSpotifyTracks, spotifyConfigured, spotifyLogin,
  spotifyLogout, spotifyToken, SpotifyWebPlayer, type SpotifyTrack,
} from '../sources/spotify';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};

let player: Player | null = null;
let trackName = '';
const viz = new Visualizer($<HTMLCanvasElement>('viz'));

function show(id: 'drop' | 'progress' | 'app' | 'error', on = true) { $(id).classList.toggle('hidden', !on); }

function setProgress(stage: string, f: number) {
  $('stage').textContent = stage;
  $('pct').textContent = `${Math.round(f * 100)}%`;
  $('bar-fill').style.width = `${Math.round(f * 100)}%`;
}

async function ensurePlayer(): Promise<Player> {
  if (player) return player;
  player = await Player.create();
  player.events = {
    onProgress: setProgress,
    onJump: (j) => viz.flashJump(j),
    onEnded: () => updatePlayButton(),
  };
  viz.onSeek = (s) => player?.seek(s);
  return player;
}

async function load(source: { file?: File; demo?: boolean }) {
  show('error', false);
  show('drop', false);
  show('app', false);
  show('progress');
  setProgress('Decoding', 0);
  try {
    const p = await ensurePlayer();
    if (source.file) {
      trackName = source.file.name.replace(/\.[^.]+$/, '');
      await p.loadFile(source.file);
    } else {
      trackName = 'Demo track (synthesised in your browser)';
      const song = synthSong({ sampleRate: p.ctx.sampleRate });
      await p.loadChannels(song.channels);
    }
    onLoaded(p);
  } catch (err) {
    show('progress', false);
    show('drop');
    const e = $('error');
    e.textContent = `Couldn't process that file: ${err instanceof Error ? err.message : String(err)}`;
    show('error');
  }
}

function onLoaded(p: Player) {
  const a = p.analysis!, src = p.source!, planner = p.planner!;
  show('progress', false);
  show('app');
  $('track').textContent = trackName;
  const bars = a.beats.length / a.meter.beatsPerBar;
  const seams = a.edges.reduce((n, l) => n + l.length, 0);
  $('stats').innerHTML = [
    fmt(src.length / src.sampleRate),
    `${a.bpm.toFixed(1)} BPM`,
    `${a.meter.beatsPerBar}/4`,
    `${a.beats.length} beats · ${Math.round(bars)} bars`,
    `${seams} candidate seams`,
    `${p.loops.length} perfect loops`,
  ].map((s) => `<span>${s}</span>`).join('');
  viz.setSong(src.channels, a);
  const thr = $<HTMLInputElement>('thr');
  thr.value = String(planner.settings.threshold);
  syncControls();
  renderLoops();
  setMode('endless');
}

function refreshGraph() {
  if (!player?.planner) return;
  const pl = player.planner;
  viz.setGraph(pl.activeEdges, pl.coreMask, pl.settings.mode === 'loop' ? pl.settings.loop : null);
  const n = player.analysis!.beats.length;
  const pct = Math.round((100 * pl.coreSize) / n);
  const relaxed = pl.effectiveThreshold > pl.settings.threshold + 1e-6;
  $('thr-note').textContent = `${pct}% of the song is in the endless loop${relaxed ? ' (auto-relaxed: too strict for this song)' : ''}.`;
}

function syncControls() {
  const bars = $<HTMLInputElement>('bars'), thr = $<HTMLInputElement>('thr'), fade = $<HTMLInputElement>('fade');
  $('bars-v').textContent = bars.value;
  $('thr-v').textContent = `≥ ${costToQuality(Number(thr.value))}% match`;
  $('fade-v').textContent = `${fade.value} ms`;
  refreshGraph();
}

function settingsFromControls() {
  return {
    barsBetweenJumps: Number($<HTMLInputElement>('bars').value),
    threshold: Number($<HTMLInputElement>('thr').value),
    fadeSec: Number($<HTMLInputElement>('fade').value) / 1000,
    barLock: $<HTMLInputElement>('barlock').checked,
  };
}

for (const id of ['bars', 'thr', 'fade', 'barlock']) {
  $(id).addEventListener('input', () => syncControls());
  $(id).addEventListener('change', () => {
    player?.updateSettings(settingsFromControls());
    syncControls();
  });
}
$('lyric-align').addEventListener('change', () => renderLoops());

function setMode(mode: 'endless' | 'loop') {
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
  $('panel-endless').classList.toggle('hidden', mode !== 'endless');
  $('panel-loop').classList.toggle('hidden', mode !== 'loop');
  player?.updateSettings({ mode });
  refreshGraph();
}
document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode as 'endless' | 'loop')));

function selectLoop(loop: LoopCandidate) {
  if (!player) return;
  player.updateSettings({ loop, mode: 'loop' });
  renderLoops();
  refreshGraph();
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

let lyricLines: LyricLine[] = [];

function displayedLoops(): LoopCandidate[] {
  const p = player;
  if (!p) return [];
  const align = lyricLines.length > 0 && $<HTMLInputElement>('lyric-align').checked;
  return align ? alignLoopsToLyrics(p.loops, lyricLines, p.source!.sampleRate) : p.loops;
}

function renderLoops() {
  const p = player;
  const ol = $('loops');
  ol.innerHTML = '';
  if (!p) return;
  const loops = displayedLoops();
  if (!loops.length) {
    ol.innerHTML = '<li>No loop of 8+ bars passed verification for this track. Endless mode still works.</li>';
    return;
  }
  const sr = p.source!.sampleRate;
  const sel = p.planner?.settings.loop;
  $('lyric-align-row').classList.toggle('hidden', lyricLines.length === 0);
  loops.forEach((l, i) => {
    const li = document.createElement('li');
    if (sel && sel.startSample === l.startSample && sel.endSample === l.endSample) li.classList.add('sel');
    const lyricNote = lyricLines.length ? ` · ${linesInLoop(l, lyricLines, sr).length} lyric lines` : '';
    li.innerHTML = `
      <span class="q">${l.quality}%</span>
      <span class="meta"><b>#${i + 1} · ${l.bars} bars · ${fmt(l.seconds)}</b><br>${fmt(l.startSample / sr)} → ${fmt(l.endSample / sr)} · phase match ${(Math.max(0, l.rho) * 100).toFixed(0)}%${lyricNote}</span>
      <span class="acts">
        <button data-act="use" class="primary">Loop this</button>
        <button data-act="seam">Hear seam</button>
        <button data-act="wav">WAV</button>
      </span>`;
    li.querySelector<HTMLButtonElement>('[data-act=use]')!.onclick = () => selectLoop(l);
    li.querySelector<HTMLButtonElement>('[data-act=seam]')!.onclick = async () => {
      selectLoop(l);
      p.seek(Math.max(l.startSample, l.endSample - 4 * sr));
      if (!p.playing) await p.play();
      updatePlayButton();
    };
    li.querySelector<HTMLButtonElement>('[data-act=wav]')!.onclick = () => {
      const baked = bakeLoop(p.source!.channels, l, p.planner!.fade);
      download(encodeWav(baked, sr), `${trackName} - seamless loop ${i + 1}.wav`);
    };
    ol.appendChild(li);
  });
}

$('render').addEventListener('click', async () => {
  const p = player;
  if (!p?.analysis || !p.source || !p.planner) return;
  const btn = $<HTMLButtonElement>('render');
  btn.disabled = true;
  btn.textContent = 'Rendering…';
  await new Promise((r) => setTimeout(r, 30));
  try {
    const mins = Math.max(1, Math.min(60, Number($<HTMLInputElement>('mins').value) || 10));
    const offline = new Planner(p.analysis, p.source, p.coarse, { ...p.planner.settings, mode: 'endless' });
    const out = renderPath(p.source.channels, p.source.sampleRate, offline, mins * 60);
    download(encodeWav(out, p.source.sampleRate), `${trackName} - ${mins} min endless.wav`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download WAV';
  }
});

function updatePlayButton() {
  const b = $('play');
  const on = !!player?.playing;
  b.textContent = on ? '❚❚' : '▶';
  b.setAttribute('aria-label', on ? 'Pause' : 'Play');
}

async function togglePlay() {
  if (!player?.planner) return;
  if (player.playing) player.pause(); else await player.play();
  updatePlayButton();
}
$('play').addEventListener('click', togglePlay);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault();
    togglePlay();
  }
});

// File input + drag and drop.
const fileInput = $<HTMLInputElement>('file');
$('pick').addEventListener('click', () => fileInput.click());
$('another').addEventListener('click', () => { player?.pause(); updatePlayButton(); fileInput.click(); });
fileInput.addEventListener('change', () => { const f = fileInput.files?.[0]; if (f) load({ file: f }); fileInput.value = ''; });
$('demo').addEventListener('click', () => load({ demo: true }));
const drop = $('drop');
for (const ev of ['dragenter', 'dragover']) document.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); });
for (const ev of ['dragleave', 'drop']) document.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'drop' || e.target === drop) drop.classList.remove('over'); });
document.addEventListener('drop', (e) => {
  const f = (e as DragEvent).dataTransfer?.files?.[0];
  if (f) load({ file: f });
});

// Render loop.
let lyricActiveIdx = -1;
function frame() {
  if (player?.analysis && player.source) {
    const pos = player.position();
    viz.draw(pos, player.queue);
    $('listened').textContent = fmt(player.listenedSec);
    $('posn').textContent = fmt(pos / player.source.sampleRate);
    $('jumps').textContent = String(player.jumpCount);
    updatePlayButton();
    if (lyricLines.length) {
      const idx = lineAt(lyricLines, pos / player.source.sampleRate);
      if (idx !== lyricActiveIdx) {
        lyricActiveIdx = idx;
        document.querySelectorAll<HTMLDivElement>('#lyrics .line').forEach((el, i) => {
          el.classList.toggle('active', i === idx);
          if (i === idx) el.scrollIntoView({ block: 'nearest' });
        });
      }
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose for automated testing / console tinkering.
(window as unknown as { stems: unknown }).stems = { get player() { return player; } };

// ---- Lyrics (.lrc) ----

function renderLyrics() {
  const box = $('lyrics');
  box.innerHTML = '';
  lyricActiveIdx = -1;
  lyricLines.forEach((l) => {
    const d = document.createElement('div');
    d.className = 'line';
    d.innerHTML = `<span class="t">${fmt(l.time)}</span><span>${escapeHtml(l.text)}</span>`;
    d.addEventListener('click', () => player?.seek(Math.round(l.time * player!.source!.sampleRate)));
    box.appendChild(d);
  });
  renderLoops();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

$('lrc-pick').addEventListener('click', () => $<HTMLInputElement>('lrc').click());
$<HTMLInputElement>('lrc').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = '';
  if (!f) return;
  const lines = parseLrc(await f.text());
  if (!lines.length) {
    $('lrc-name').textContent = 'No synced lines found in that file.';
    return;
  }
  lyricLines = lines;
  $('lrc-name').textContent = `${lines.length} synced lines loaded.`;
  renderLyrics();
});

// ---- YouTube ----

let yt: YouTubeSource | null = null;
const ytKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
if (ytKey) $('yt-search-row').classList.remove('hidden');

async function ytPlayId(id: string) {
  const status = $('yt-status');
  status.textContent = 'Loading YouTube player…';
  try {
    yt ??= new YouTubeSource($('yt-player'));
    yt.events = {
      onReady: (d) => { status.textContent = `Ready · ${fmt(d)}`; },
      onState: (s) => { status.textContent = s === 'playing' ? 'Playing' : s === 'paused' ? 'Paused' : s === 'ended' ? 'Ended' : 'Buffering…'; },
      onError: (m) => { status.textContent = m; },
    };
    await yt.load(id);
    yt.play();
  } catch (err) {
    status.textContent = `Couldn't load that video: ${err instanceof Error ? err.message : String(err)}`;
  }
}

$('yt-load').addEventListener('click', () => {
  const id = parseYouTubeId($<HTMLInputElement>('yt-url').value);
  if (!id) { $('yt-status').textContent = 'That doesn\u2019t look like a YouTube link or video ID.'; return; }
  ytPlayId(id);
});
$('yt-search').addEventListener('click', async () => {
  const q = $<HTMLInputElement>('yt-q').value.trim();
  if (!q) return;
  const status = $('yt-status');
  status.textContent = 'Searching…';
  try {
    const results = await searchYouTube(q, ytKey);
    status.textContent = results.length ? '' : 'No music videos found.';
    for (const r of results.slice(0, 5)) {
      const d = document.createElement('div');
      d.className = 'mini-result';
      d.innerHTML = `<b>${escapeHtml(r.title)}</b><br><span>${escapeHtml(r.channel)}</span>`;
      d.addEventListener('click', () => ytPlayId(r.videoId));
      status.appendChild(d);
    }
  } catch (err) {
    status.textContent = err instanceof Error ? err.message : String(err);
  }
});

// ---- Spotify ----

const spPlayer = new SpotifyWebPlayer();
const spAudio = new Audio();
spAudio.preload = 'none';

async function spRefreshAuth() {
  const logged = !!(await spotifyToken().catch(() => null));
  $('sp-connect').classList.toggle('hidden', logged);
  $('sp-disconnect').classList.toggle('hidden', !logged);
  $('sp-search-row').classList.toggle('hidden', !logged);
  $('sp-player-row').classList.toggle('hidden', !logged);
  if (!logged && !spotifyConfigured()) {
    $('sp-now').textContent = 'Set VITE_SPOTIFY_CLIENT_ID in .env to connect Spotify.';
  } else if (!logged) {
    $('sp-now').textContent = '';
  }
}

spPlayer.events = {
  onReady: () => { $('sp-status').textContent = 'In-app playback ready.'; },
  onState: (playing, name) => { $('sp-now').textContent = playing ? `▶ ${name}` : name ? `❚❚ ${name}` : ''; },
  onError: (m) => { $('sp-status').textContent = m; },
};

$('sp-connect').addEventListener('click', () => spotifyLogin().catch((e) => { $('sp-now').textContent = e.message; }));
$('sp-disconnect').addEventListener('click', () => {
  spPlayer.disconnect();
  spAudio.pause();
  spotifyLogout();
  $('sp-results').innerHTML = '';
  spRefreshAuth();
});
$('sp-device').addEventListener('click', async () => {
  $('sp-status').textContent = 'Starting player…';
  try { await spPlayer.connect(); }
  catch (err) { $('sp-status').textContent = err instanceof Error ? err.message : String(err); }
});
$('sp-search').addEventListener('click', async () => {
  const q = $<HTMLInputElement>('sp-q').value.trim();
  if (!q) return;
  const ol = $('sp-results');
  ol.innerHTML = '';
  try {
    const tracks = await searchSpotifyTracks(q);
    if (!tracks.length) { $('sp-now').textContent = 'No tracks found.'; return; }
    for (const t of tracks) playSpotifyResult(t, ol);
  } catch (err) {
    $('sp-now').textContent = err instanceof Error ? err.message : String(err);
  }
});

function playSpotifyResult(t: SpotifyTrack, ol: HTMLElement) {
  const li = document.createElement('li');
  li.innerHTML = `
    <span class="q">${t.image ? `<img src="${t.image}" alt="" width="40" height="40" />` : ''}</span>
    <span class="meta"><b>${escapeHtml(t.name)}</b><br>${escapeHtml(t.artists)} · ${escapeHtml(t.album)}</span>
    <span class="acts">
      <button data-act="play" class="primary">Play</button>
      ${t.previewUrl ? '<button data-act="preview">Preview</button>' : ''}
      <button data-act="open">Open in Spotify</button>
    </span>`;
  li.querySelector<HTMLButtonElement>('[data-act=play]')!.onclick = async () => {
    try { await spPlayer.playUri(t.uri); }
    catch (err) { $('sp-status').textContent = `${err instanceof Error ? err.message : String(err)} (Premium required)`; }
  };
  li.querySelector<HTMLButtonElement>('[data-act=preview]')!.onclick = () => {
    spAudio.src = t.previewUrl!;
    spAudio.play().catch(() => {});
    $('sp-now').textContent = `♪ Preview · ${t.name} — ${t.artists}`;
  };
  li.querySelector<HTMLButtonElement>('[data-act=open]')!.onclick = () =>
    window.open(`https://open.spotify.com/track/${t.id}`, '_blank', 'noopener');
  ol.appendChild(li);
}

// OAuth callback: ?code= lands on this page; exchange it, then clean the URL.
handleSpotifyCallback()
  .then((done) => { if (done) $('sp-now').textContent = 'Spotify connected.'; })
  .catch((err) => { $('sp-now').textContent = err instanceof Error ? err.message : String(err); })
  .finally(() => spRefreshAuth());

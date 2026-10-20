import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import { clearCache, getLyricSearch, getSongLyrics, putLyricSearch, putSongLyrics } from '../audio/cache';
import { addSong, fetchAudioFile, listSongs, matchSongs, removeSong, songFile, takeSharedFiles, updateSong, type LibrarySong } from '../audio/library';
import { encodeMp3InWorker } from '../audio/mp3-client';
import { DEFAULT_MODEL_URL, Player, sharedMemory } from '../audio/player';
import type { Spatial8DSpeed } from '../audio/spatial';
import { synthSong } from '../engine/demo';
import type { LoopCandidate } from '../engine/loops';
import { encodeWav } from '../engine/render';
import { decodeShare, encodeShare, scaleLoop, type ShareState } from '../engine/share';
import { costToQuality } from '../engine/similarity';
import { wasmFFTAvailable } from '../engine/wasm-fft';
import { alignLoopsToLyrics, linesInLoop, lyricBoundaryPenalty } from '../lyrics/loopalign';
import { lineAt, parseLrc, type LyricLine } from '../lyrics/lrc';
import { searchLyrics, songInfo, type LyricsResult, type SongInfo } from '../lyrics/search';
import { ensureIsolationState, setIsolation } from './isolation';
import { Visualizer } from './visualizer';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

type Tab = 'loops' | 'stems' | 'lyrics' | 'save' | 'tune';

let player: Player | null = null;
let song: SongInfo = { title: '', artist: '' };
let tab: Tab = 'loops';
let pendingShare: ShareState | null = decodeShare(location.hash);
const viz = new Visualizer($<HTMLCanvasElement>('viz'));
function setLayout(l: 'wave' | 'circle') {
  try { localStorage.setItem('stems.layout', l); } catch { /* ignore */ }
  document.querySelectorAll<HTMLButtonElement>('[data-layout]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === l)));
  viz.setLayout(l);
}
document.querySelectorAll<HTMLButtonElement>('[data-layout]').forEach((b) => b.addEventListener('click', () => setLayout(b.dataset.layout as 'wave' | 'circle')));
setLayout((() => { try { return localStorage.getItem('stems.layout') === 'circle' ? 'circle' : 'wave'; } catch { return 'wave'; } })());

function show(id: string, on = true) { $(id).classList.toggle('hidden', !on); }
const trackName = () => [song.artist, song.title].filter(Boolean).join(' - ') || 'stems';
const fileSafe = (s: string) => s.replace(/[\\/:*?"<>|]/g, '').trim() || 'stems';

function setProgress(stage: string, f: number) {
  $('stage').textContent = stage;
  $('pct').textContent = `${Math.round(f * 100)}%`;
  $('bar-fill').style.width = `${Math.round(f * 100)}%`;
}

function setStemProgress(stage: string, f: number) {
  if (/segment/i.test(stage)) $('sep-note').textContent = 'Playback continues while this runs. Keep the page open.';
  $('sstage').textContent = stage;
  $('spct').textContent = `${Math.round(f * 100)}%`;
  $('sbar-fill').style.width = `${Math.round(f * 100)}%`;
}

function showError(msg: string) {
  $('error').textContent = msg;
  show('error');
}

$('env-note').textContent = [
  wasmFFTAvailable() ? 'WASM SIMD FFT' : 'JS FFT',
  sharedMemory() ? 'shared memory' : 'copied buffers',
].join(' · ');

if (pendingShare) {
  $('share-banner').innerHTML = `Shared ${pendingShare.mode === 'loop' ? 'loop' : 'endless mix'}${pendingShare.n ? ` of <b>${esc(pendingShare.n)}</b>` : ''}. Open the same audio file to apply it.`;
  show('share-banner');
}

// ---- Loading ----------------------------------------------------------------------

async function ensurePlayer(): Promise<Player> {
  if (player) return player;
  player = await Player.create();
  player.seamless = $<HTMLInputElement>('seamless').checked;
  player.events = {
    onProgress: (stage, f) => setProgress(friendlyStage(stage), f),
    onAnalysis: (fromCache) => onAnalysed(fromCache),
    onStemsProgress: setStemProgress,
    onStems: (_s, backend) => onStems(backend),
    onRescored: () => { renderLoops(); refreshGraph(); updateModeHint(); },
    onJump: (j) => viz.flashJump(j),
    onEnded: () => updatePlayButton(),
    onSleep: () => { $<HTMLSelectElement>('sleep').value = '0'; updatePlayButton(); },
  };
  viz.onSeek = (s) => player?.seek(s);
  if (player.supports8D) apply8D();
  else eightdSelect.closest('label')?.classList.add('hidden');
  return player;
}

/** Engine stage names, in plain words. */
function friendlyStage(stage: string): string {
  if (/^Decoded/.test(stage)) return 'Decoded. Analyzing';
  if (/loops/i.test(stage)) return 'Finding loops';
  return `Analyzing: ${stage.toLowerCase()}`;
}

/** Resolve once the player has decoded audio (analysis may still be running). */
function waitForSource(p: Player, done: Promise<void>): Promise<void> {
  return new Promise((resolve) => {
    let finished = false;
    done.then(() => { finished = true; }, () => { finished = true; });
    const check = () => (p.source || finished ? resolve() : setTimeout(check, 30));
    check();
  });
}

/** Library id of the loaded song (empty for the demo). */
let currentSongId = '';

/** A song is being opened (the isolation fix-up must not reload the page meanwhile). */
let opening = 0;

async function load(source: { file?: File; demo?: boolean; libraryId?: string; info?: SongInfo }) {
  show('error', false);
  go('app');
  const token = ++songToken;
  opening++;
  // Only a song this call added is removed again if it can't be decoded.
  let added = '';
  try {
    // Stop the previous song first, so a failure below never leaves it playing out of reach.
    player?.reset();
    currentSongId = source.libraryId ?? '';
    if (source.file && !currentSongId) {
      try {
        const entry = await addSong(source.file, source.info);
        currentSongId = entry.id;
        if (entry.isNew) added = entry.id;
      } catch { /* storage full or blocked: play it anyway */ }
    }
    const p = await ensurePlayer();
    if (token !== songToken) return;
    p.reset();
    show('app');
    show('aprog');
    resetSongUi();
    setProgress('Decoding', 0);
    let loaded: Promise<void>;
    if (source.file) {
      song = source.info ?? await songInfo(source.file);
      loaded = p.loadFile(source.file);
    } else {
      song = { title: 'Demo track', artist: 'Synthesized in the browser' };
      loaded = p.loadChannels(synthSong({ sampleRate: p.ctx.sampleRate }).channels);
    }
    $('track').textContent = song.title || 'Untitled';
    $('artist').textContent = song.artist;
    $<HTMLInputElement>('lyr-q').value = [song.title, song.artist].filter(Boolean).join(' ');
    await waitForSource(p, loaded);
    if (token !== songToken) return;
    if (p.source) onDecoded(p);
    await loaded;
  } catch (err) {
    if (token !== songToken) return;
    // A file that can't be decoded doesn't belong in the library.
    if (added) { void removeSong(added).then(() => renderLibrary()); currentSongId = ''; }
    go('home');
    setPlayerTab(false);
    showError(`Couldn't decode that file (${errText(err)}). MP3, M4A, WAV, FLAC and OGG are supported.`);
  } finally {
    opening--;
  }
}

function resetSongUi() {
  $<HTMLButtonElement>('play').disabled = true;
  $('stats').innerHTML = '';
  $('loops').innerHTML = '<li class="empty">Looking for loops…</li>';
  show('mixer', false);
  show('sprog', false);
  show('sep-actions');
  $('sep-note').textContent = '';
  lyricLines = [];
  lyricsSearched = false;
  showLyricsView(false);
  show('now-line', false);
  lyricOffset = 0;
  $('lyr-offset').textContent = '0.0 s';
  sectionFromHandles = false;
  sectionSeam = null;
  $('lyrics').innerHTML = '';
  $('lyr-results').innerHTML = '';
  $('lyr-status').textContent = '';
  $('render-note').textContent = '';
  show('share-out', false);
  show('section', false);
  viz.setSection(null);
  setMode('endless', false);
}

function onDecoded(p: Player) {
  viz.setSong(p.source!.channels, null);
  if (currentSongId) void updateSong(currentSongId, { duration: p.source!.length / p.source!.sampleRate, playedAt: Date.now() }).then(() => renderLibrary());
  $<HTMLButtonElement>('play').disabled = false;
  setPlayerTab(true);
  updateMediaSession();
  updateModeHint();
  void restoreLyrics();
}

/** Show the lyrics chosen for this song last time; otherwise look them up in the background. */
async function restoreLyrics() {
  const token = songToken;
  const saved = currentSongId ? await getSongLyrics(currentSongId) : null;
  if (token !== songToken || lyricLines.length) return;
  if (saved?.lines.length) {
    lyricsSearched = true;
    lyricLines = saved.lines;
    lyricSource = saved.source;
    $('lyr-source').textContent = saved.source;
    setLyricOffset(saved.offset, false);
    renderLyrics();
  } else if (!lyricsSearched && song.title && currentSongId) {
    void findLyrics(true);
  }
}

/** Remember the lyrics and timing for this song. */
function saveLyrics() {
  if (currentSongId && lyricLines.length) void putSongLyrics(currentSongId, { lines: lyricLines, source: lyricSource, offset: lyricOffset });
}

function onAnalysed(fromCache: boolean) {
  const p = player!;
  const a = p.analysis!, src = p.source!;
  show('aprog', false);
  const bars = a.beats.length / a.meter.beatsPerBar;
  const seams = a.edges.reduce((n, l) => n + l.length, 0);
  const tempo = a.tempoSpread > 1.03 ? `${a.bpm.toFixed(1)} BPM (drifts ±${(((a.tempoSpread - 1) / 2) * 100).toFixed(0)}%)` : `${a.bpm.toFixed(1)} BPM`;
  $('stats').innerHTML = [
    fmt(src.length / src.sampleRate), tempo, `${a.meter.beatsPerBar}/4`, `${Math.round(bars)} bars`,
    `${seams} candidate seams`, `${p.loops.length} loops`, fromCache ? 'analysis from cache' : '',
  ].filter(Boolean).map((s) => `<span>${s}</span>`).join('');
  viz.setAnalysis(a);
  $<HTMLInputElement>('thr').value = String(p.currentSettings.threshold);
  // The player starts each song from defaults: carry over what the controls show.
  p.updateSettings(settingsFromControls());
  // Loop picked while the analysis ran.
  if (document.querySelector<HTMLButtonElement>('.seg [aria-pressed=true]')?.dataset.mode === 'loop') setMode('loop');
  syncControls();
  initSection();
  if (lyricLines.length) applyLyricPenalty();
  renderLoops();
  applyShare();
  updateModeHint();
}

// ---- Mode (endless / loop) ------------------------------------------------------------

function currentMode(): 'endless' | 'loop' { return player?.currentSettings.mode ?? 'endless'; }

function setMode(mode: 'endless' | 'loop', apply = true) {
  document.querySelectorAll<HTMLButtonElement>('.seg [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  show('style-row', mode === 'endless');
  const p = player;
  if (apply && p) {
    p.updateSettings({ mode });
    if (mode === 'endless' && p.analysis && p.currentSettings.range && !sectionFromHandles) {
      p.setSection(null);
      sectionSeam = null;
      syncSectionInputs();
    }
    if (mode === 'loop' && p.analysis) {
      // Loop mode always shows its loop on the handles: the section if one is
      // set, otherwise the best loop found.
      const r = p.currentSettings.range;
      // A set section was already snapped when it was chosen: loop it exactly.
      const loop = r ? p.loopFor(r, false) : p.currentSettings.loop ?? p.loops[0];
      if (loop) {
        sectionSeam = p.setSection({ start: loop.startBeat, end: loop.endBeat }, loop)?.quality ?? null;
        relockStems(loop);
      }
      syncSectionInputs();
    }
  }
  refreshGraph();
  renderLoops();
  updateModeHint();
}
document.querySelectorAll<HTMLButtonElement>('.seg [data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as 'endless' | 'loop')));

/** Endless style (persisted): Smooth plays long stretches, Jumpy branches often. */
let endlessStyle: 'smooth' | 'jumpy' = (() => { try { return localStorage.getItem('stems.style') === 'jumpy' ? 'jumpy' : 'smooth'; } catch { return 'smooth'; } })();
function setStyle(s: 'smooth' | 'jumpy') {
  endlessStyle = s;
  try { localStorage.setItem('stems.style', s); } catch { /* ignore */ }
  document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === s)));
  player?.updateSettings({ style: s });
  refreshGraph();
  updateModeHint();
}
document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach((b) => b.addEventListener('click', () => setStyle(b.dataset.style as 'smooth' | 'jumpy')));
setStyle(endlessStyle);

function updateModeHint() {
  const p = player;
  const el = $('mode-hint');
  if (!p?.source) { el.textContent = ''; return; }
  if (!p.analysis) { el.textContent = 'Ready to play. Jumps start once analysis finishes.'; return; }
  const sr = p.source.sampleRate;
  const r = p.currentSettings.range;
  if (currentMode() === 'endless') {
    const sec = p.planner?.section;
    const b = p.analysis.beats;
    if (endlessStyle === 'jumpy') {
      el.textContent = `Jumpy: branches often between matching beats${r ? ` within ${fmt(b[r.start] / sr)}-${fmt(b[r.end] / sr)}` : ''}, like the Infinite Jukebox.`;
      return;
    }
    el.textContent = r
      ? `Endless within ${fmt(b[r.start] / sr)}-${fmt(b[r.end] / sr)}.`
      : sec
        ? `Endless: plays through to ${fmt(b[sec.end] / sr)}, then rejoins at ${fmt(b[sec.start] / sr)} through a matched seam.`
        : 'Endless across the full track, splicing between matching bars.';
    return;
  }
  const loop = p.currentSettings.loop;
  const i = loop ? displayedLoops().findIndex((l) => l.startSample === loop.startSample && l.endSample === loop.endSample) : -1;
  const seam = loop ? (seamGrade(loop) === 'audible' ? 'likely audible; try moving a handle by a bar' : seamLabel(loop).toLowerCase()) : '';
  const what = i >= 0 ? `loop ${i + 1}` : r ? 'section' : 'full track';
  el.textContent = loop
    ? `Looping ${what}, ${fmt(loop.startSample / sr)}-${fmt(loop.endSample / sr)}. Seam: ${seam}.`
    : 'No verified loop in this track. Drag the handles to choose a section.';
}

// ---- Tabs ---------------------------------------------------------------------------

function setTab(t: Tab) {
  tab = t;
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => {
    const on = b.dataset.tab === t;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  for (const k of ['loops', 'stems', 'lyrics', 'save', 'tune']) show(`panel-${k}`, k === t);
  if (t === 'lyrics' && !lyricsSearched && !lyricLines.length && player?.source) void findLyrics(true);
  if (t === 'lyrics') { lyricActiveIdx = -2; lyricScrollHold = 0; }
}
document.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab as Tab)));

// ---- Tune ---------------------------------------------------------------------------

function refreshGraph() {
  const pl = player?.planner;
  if (!pl) return;
  viz.setGraph(pl.activeEdges, pl.coreMask, pl.settings.mode === 'loop' ? pl.settings.loop : null);
  const extra = pl.activeEdges.reduce((k, l) => k + l.length, 0) - (pl.section ? 1 : 0);
  $('thr-note').textContent = `${extra} extra jump point${extra === 1 ? '' : 's'} pass at this setting.`;
}

function syncControls() {
  const v = (id: string) => $<HTMLInputElement>(id).value;
  $('bars-v').textContent = Number(v('bars')) ? `about every ${v('bars')} bars` : 'off';
  $('thr-v').textContent = `≥ ${costToQuality(Number(v('thr')))}% match`;
  $('fade-v').textContent = `${v('fade')} ms`;
  $('phrase-v').textContent = `${Math.round(Number(v('phrase')) * 100)}%`;
  refreshGraph();
}

function settingsFromControls() {
  const v = (id: string) => $<HTMLInputElement>(id);
  return {
    style: endlessStyle,
    barsBetweenJumps: Number(v('bars').value),
    threshold: Number(v('thr').value),
    fadeSec: Number(v('fade').value) / 1000,
    phraseBias: Number(v('phrase').value),
    barLock: v('barlock').checked,
    autoFade: v('autofade').checked,
    loudnessMatch: v('loudness').checked,
  };
}

for (const id of ['bars', 'thr', 'fade', 'phrase', 'barlock', 'autofade', 'loudness']) {
  $(id).addEventListener('input', () => syncControls());
  $(id).addEventListener('change', () => {
    player?.updateSettings(settingsFromControls());
    if (id === 'fade' || id === 'autofade') renderLoops();
    syncControls();
  });
}

// ---- Loops --------------------------------------------------------------------------

function selectLoop(loop: LoopCandidate) {
  const p = player;
  if (!p) return;
  sectionFromHandles = false;
  p.updateSettings({ mode: 'loop' });
  sectionSeam = p.setSection({ start: loop.startBeat, end: loop.endBeat }, loop)?.quality ?? null;
  relockStems(loop);
  syncSectionInputs();
  setMode('loop', false);
}

/** Locked stems follow the current loop. */
/** Seam grade from the sample-level checks (correlation across the splice and spectral step). */
function seamGrade(l: LoopCandidate): 'clean' | 'fair' | 'audible' {
  return l.rho >= 0.8 && l.spectralDb <= 4 ? 'clean' : l.rho >= 0.5 && l.spectralDb <= 8 ? 'fair' : 'audible';
}
function seamLabel(l: LoopCandidate): string {
  return { clean: 'Clean', fair: 'Fair', audible: 'Audible' }[seamGrade(l)];
}

function relockStems(loop: LoopCandidate) {
  const p = player;
  p?.locked.forEach((l, i) => { if (l) { p.unlockStem(i); p.lockStem(i, loop); } });
}

// ---- Section handles --------------------------------------------------------------------

let stops: number[] = [];
/** True when the person dragged the handles; a section that only came from picking a loop is dropped when leaving Loop mode. */
let sectionFromHandles = false;
const secStart = $<HTMLInputElement>('sec-start');
const secEnd = $<HTMLInputElement>('sec-end');

/** Beat index -> slider value (ms into the song). */
function beatMs(beat: number): number {
  const p = player!;
  return Math.round((p.analysis!.beats[beat] / p.source!.sampleRate) * 1000);
}

function nearestStop(ms: number): number {
  let best = 0;
  stops.forEach((b, k) => { if (Math.abs(beatMs(b) - ms) < Math.abs(beatMs(stops[best]) - ms)) best = k; });
  return best;
}

function initSection() {
  const p = player;
  if (!p?.analysis) return;
  stops = p.sectionStops();
  const max = String(beatMs(stops[stops.length - 1]));
  secStart.max = secEnd.max = max;
  syncSectionInputs();
  show('section');
}

/** Put the handles where the player's section is (or at the song's ends). */
function syncSectionInputs() {
  const p = player;
  if (!p?.analysis || !stops.length) return;
  const r = p.currentSettings.range;
  secStart.value = String(beatMs(r ? r.start : stops[0]));
  secEnd.value = String(beatMs(r ? r.end : stops[stops.length - 1]));
  drawSection();
}

/** Snap both handles to bar lines (at least one bar apart) and return their stop indices. */
function snapHandles(moved: 'start' | 'end'): [number, number] {
  let si = nearestStop(Number(secStart.value));
  let ei = nearestStop(Number(secEnd.value));
  if (ei <= si) {
    if (moved === 'start') si = Math.max(0, ei - 1);
    else ei = Math.min(stops.length - 1, si + 1);
    if (ei <= si) ei = si + 1;
  }
  return [si, ei];
}

function drawSection(indices?: [number, number]) {
  const p = player;
  if (!p?.analysis) return;
  // While dragging: the stops under the handles. Otherwise: the player's (possibly snapped) section.
  const r = indices ? null : p.currentSettings.range;
  const [s, e] = r ? [r.start, r.end] : (() => {
    const [si, ei] = indices ?? [nearestStop(Number(secStart.value)), nearestStop(Number(secEnd.value))];
    return [stops[si], stops[ei]];
  })();
  const whole = s === stops[0] && e === stops[stops.length - 1];
  const b = p.analysis.beats, sr = p.source!.sampleRate;
  const max = Number(secStart.max) || 1;
  const fill = $('range-fill');
  fill.style.left = `${(beatMs(s) / max) * 100}%`;
  fill.style.width = `${((beatMs(e) - beatMs(s)) / max) * 100}%`;
  viz.setSection(whole ? null : [b[s], b[e]]);
  const bars = Math.round((e - s) / p.analysis.meter.beatsPerBar);
  const seam = !indices && sectionSeam !== null ? `, seam ${sectionSeam}%` : '';
  $('sec-label').textContent = whole
    ? 'Full track'
    : `${fmt(b[s] / sr)}-${fmt(b[e] / sr)}, ${bars} bar${bars === 1 ? '' : 's'}${seam}`;
  show('sec-reset', !whole);
}

for (const [input, which] of [[secStart, 'start'], [secEnd, 'end']] as const) {
  input.addEventListener('input', () => {
    const [si, ei] = snapHandles(which);
    drawSection([si, ei]);
  });
  input.addEventListener('change', () => applySection(snapHandles(which)));
}
$('sec-reset').addEventListener('click', () => applySection([0, stops.length - 1]));

const seamlessBox = $<HTMLInputElement>('seamless');
try { seamlessBox.checked = localStorage.getItem('stems.seamless') !== '0'; } catch { /* default on */ }
seamlessBox.addEventListener('change', () => {
  try { localStorage.setItem('stems.seamless', seamlessBox.checked ? '1' : '0'); } catch { /* ignore */ }
  if (player) player.seamless = seamlessBox.checked;
  const r = player?.currentSettings.range;
  if (r && sectionFromHandles) applySection(snapHandles('end'));
});

/** Match quality of the hand-picked section's seam, shown next to its range. */
let sectionSeam: number | null = null;

function applySection([si, ei]: [number, number]) {
  const p = player;
  if (!p?.analysis) return;
  const whole = si === 0 && ei === stops.length - 1;
  sectionFromHandles = !whole;
  sectionSeam = p.setSection(whole ? null : { start: stops[si], end: stops[ei] })?.quality ?? null;
  const loop = p.currentSettings.loop;
  if (currentMode() === 'loop' && loop) relockStems(loop);
  syncSectionInputs();
  refreshGraph();
  renderLoops();
  updateModeHint();
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

let lyricLines: LyricLine[] = [];
let lyricsSearched = false;
/** Where the shown lyrics came from (saved with them per song). */
let lyricSource = '';
/** Bumped on every song load, so late async results for the previous song are dropped. */
let songToken = 0;

function displayedLoops(): LoopCandidate[] {
  const p = player;
  if (!p) return [];
  const align = lyricLines.length > 0 && $<HTMLInputElement>('lyric-align').checked;
  return align ? alignLoopsToLyrics(p.loops, lyricLines, p.source!.sampleRate) : p.loops;
}
$('lyric-align').addEventListener('change', () => renderLoops());

function renderLoops() {
  const p = player;
  const ol = $('loops');
  if (!p?.analysis || !p.source) return;
  ol.innerHTML = '';
  const loops = displayedLoops();
  $('lyric-align-row').classList.toggle('hidden', lyricLines.length === 0);
  if (!loops.length) {
    ol.innerHTML = '<li class="empty">No loop of 8+ bars passed the seam check for this song. Endless mode still works.</li>';
    return;
  }
  const sr = p.source!.sampleRate;
  const sel = currentMode() === 'loop' ? p.currentSettings.loop : null;
  loops.forEach((l, i) => {
    const li = document.createElement('li');
    const active = !!sel && sel.startSample === l.startSample && sel.endSample === l.endSample;
    li.classList.toggle('sel', active);
    const lyricNote = lyricLines.length ? `, ${linesInLoop(l, lyricLines, sr).length} lyric lines` : '';
    li.innerHTML = `
      <button data-act="use" class="meta" aria-pressed="${active}"><b>Loop ${i + 1}</b><span class="q ${seamGrade(l)}" title="Waveform correlation ${Math.round(l.rho * 100)}%, spectral step ${l.spectralDb.toFixed(1)} dB">${seamLabel(l)}</span><span class="d">${l.bars} bars · ${fmt(l.startSample / sr)}-${fmt(l.endSample / sr)} · ${fmt(l.seconds)}${lyricNote}</span></button>
      <button data-act="seam" class="icon" aria-label="Preview the seam of loop ${i + 1}" title="Play the four seconds before the seam">${ICON_SEAM}</button>
      <button data-act="wav" class="icon" aria-label="Download loop ${i + 1} as WAV" title="One cycle as WAV with loop points">${ICON_DOWNLOAD}</button>`;
    li.querySelector<HTMLButtonElement>('[data-act=use]')!.onclick = async () => {
      selectLoop(l);
      if (!p.playing) await togglePlay();
    };
    li.querySelector<HTMLButtonElement>('[data-act=seam]')!.onclick = async () => {
      selectLoop(l);
      p.seek(Math.max(l.startSample, l.endSample - 4 * sr));
      if (!p.playing) await togglePlay();
    };
    li.querySelector<HTMLButtonElement>('[data-act=wav]')!.onclick = () => {
      const baked = p.exportLoop(l);
      const suffix = p.stems && p.gains.some((g) => g !== 1) ? ' (custom mix)' : '';
      download(encodeWav(baked, sr, { loop: { start: 0, end: baked[0].length } }), `${fileSafe(trackName())} - loop ${i + 1}${suffix}.wav`);
    };
    ol.appendChild(li);
  });
}

// ---- Save ---------------------------------------------------------------------------

$('render').addEventListener('click', async () => {
  const p = player;
  if (!p?.analysis) { $('render-note').textContent = 'Analysis is still running.'; return; }
  const btn = $<HTMLButtonElement>('render');
  const format = $<HTMLSelectElement>('fmt').value;
  btn.disabled = true;
  btn.textContent = 'Rendering…';
  $('render-note').textContent = '';
  await new Promise((r) => setTimeout(r, 30));
  try {
    const mins = Math.max(1, Math.min(60, Number($<HTMLInputElement>('mins').value) || 10));
    const realEnd = $<HTMLInputElement>('realend').checked;
    const { channels, cues, exact } = p.exportEndless(mins, realEnd);
    const sr = p.source!.sampleRate;
    const secs = channels[0].length / sr;
    const name = `${fileSafe(trackName())} - ${mins} min endless`;
    if (format === 'mp3') {
      btn.textContent = 'Encoding MP3…';
      const mp3 = await encodeMp3InWorker(channels, sr, { title: `${song.title || 'stems'} (${mins} min endless)`, artist: song.artist, comment: 'Rendered with stems' },
        (f) => { btn.textContent = `Encoding MP3… ${Math.round(f * 100)}%`; });
      download(mp3, `${name}.mp3`);
    } else {
      download(encodeWav(channels, sr, { cues }), `${name}.wav`);
    }
    $('render-note').textContent = p.currentSettings.range
      ? `${fmt(secs)}, within the section.`
      : realEnd
      ? exact ? `${fmt(secs)}, ending on the track's outro.` : `No path reached the outro at that length; ${fmt(secs)} with a fade-out.`
      : `${fmt(secs)} long with ${cues.length} seams.`;
  } catch (err) {
    $('render-note').textContent = `Couldn't render: ${errText(err)}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Render';
  }
});

// ---- Stems --------------------------------------------------------------------------

const modelUrl = $<HTMLInputElement>('model-url');
modelUrl.value = (() => { try { return localStorage.getItem('stems.modelUrl') || DEFAULT_MODEL_URL; } catch { return DEFAULT_MODEL_URL; } })();
modelUrl.addEventListener('change', () => { try { localStorage.setItem('stems.modelUrl', modelUrl.value); } catch { /* ignore */ } });

async function separate(method: 'dsp' | 'htdemucs') {
  const p = player;
  if (!p?.source) return;
  show('sep-actions', false);
  show('mixer', false);
  show('sprog');
  $('sep-note').textContent = method === 'htdemucs' ? 'Downloading the model (about 180 MB, first use only).' : '';
  setStemProgress('Starting', 0);
  try {
    await p.separate(method, modelUrl.value || DEFAULT_MODEL_URL);
  } catch (err) {
    show('sprog', false);
    show('sep-actions');
    $('sep-note').textContent = `Separation failed: ${errText(err)}`;
  }
}
$('sep-dsp').addEventListener('click', () => separate('dsp'));
$('sep-ml').addEventListener('click', () => separate('htdemucs'));
$('sep-again').addEventListener('click', () => separate(player?.stems?.method === 'htdemucs' ? 'dsp' : 'htdemucs'));

const mute: boolean[] = [];
const solo: boolean[] = [];
const vol: number[] = [];

function onStems(backend: string) {
  const p = player!;
  show('sprog', false);
  show('mixer');
  const st = p.stems!;
  const how = st.method === 'htdemucs' ? `HTDemucs (${backend === 'cache' ? 'cached' : backend})` : 'Fast DSP separation';
  $('sep-note').textContent = `${how}.${st.hasVocals ? '' : ' The source is mono, so vocals could not be isolated.'}`;
  $('sep-again').textContent = st.method === 'htdemucs' ? 'Use fast separation instead' : 'Separate with HTDemucs';
  mute.length = solo.length = vol.length = 0;
  st.names.forEach(() => { mute.push(false); solo.push(false); vol.push(1); });
  const rows = $('stem-rows');
  rows.innerHTML = '';
  st.names.forEach((name, i) => {
    const row = document.createElement('div');
    row.className = 'stem';
    row.innerHTML = `
      <span class="name">${name}</span>
      <input type="range" min="0" max="1.5" step="0.01" value="1" aria-label="${name} volume" />
      <button data-k="m" aria-pressed="false" title="Mute ${name}">M</button>
      <button data-k="s" aria-pressed="false" title="Solo ${name}">S</button>
      <button data-k="l" aria-pressed="false" title="Lock ${name} to the current loop">Lock</button>`;
    const range = row.querySelector('input')!;
    range.addEventListener('input', () => { vol[i] = Number(range.value); pushGains(); });
    row.querySelector<HTMLButtonElement>('[data-k=m]')!.onclick = (e) => { mute[i] = !mute[i]; (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(mute[i])); pushGains(); };
    row.querySelector<HTMLButtonElement>('[data-k=s]')!.onclick = (e) => { solo[i] = !solo[i]; (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(solo[i])); pushGains(); };
    row.querySelector<HTMLButtonElement>('[data-k=l]')!.onclick = (e) => {
      const btn = e.currentTarget as HTMLElement;
      if (p.locked[i]) { p.unlockStem(i); btn.setAttribute('aria-pressed', 'false'); return; }
      const loop = p.currentSettings.loop ?? p.loops[0];
      if (!loop) { $('sep-note').textContent = 'No loop available to lock to.'; return; }
      if (p.lockStem(i, loop)) btn.setAttribute('aria-pressed', 'true');
      else $('sep-note').textContent = 'At least one stem must stay unlocked.';
    };
    rows.appendChild(row);
  });
  applyShareMix();
  renderLoops();
  refreshGraph();
}

function pushGains() {
  const p = player;
  if (!p?.stems) return;
  const anySolo = solo.some(Boolean);
  p.setGains(vol.map((v, i) => (mute[i] || (anySolo && !solo[i]) ? 0 : v)));
}

function setPreset(name: string) {
  const p = player;
  if (!p?.stems) return;
  const names = p.stems.names as string[];
  const on: Record<string, string[]> = {
    full: [...names], instrumental: names.filter((n) => n !== 'vocals'), acapella: ['vocals'], drums: ['drums', 'bass'],
  };
  names.forEach((n, i) => { mute[i] = !on[name].includes(n); solo[i] = false; vol[i] = 1; });
  document.querySelectorAll<HTMLElement>('#stem-rows .stem').forEach((row, i) => {
    row.querySelector<HTMLInputElement>('input')!.value = '1';
    row.querySelector('[data-k=m]')!.setAttribute('aria-pressed', String(mute[i]));
    row.querySelector('[data-k=s]')!.setAttribute('aria-pressed', 'false');
  });
  pushGains();
}
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => b.addEventListener('click', () => setPreset(b.dataset.preset!)));
$<HTMLInputElement>('vocalaware').addEventListener('change', (e) => {
  void player?.setVocalAware((e.target as HTMLInputElement).checked);
});

// ---- Lyrics -------------------------------------------------------------------------

let lyricActiveIdx = -1;
/** Seconds added to every lyric time (LRC files are often timed to a different master or intro). */
let lyricOffset = 0;
/** The person scrolled the lyrics recently: leave the scroll position alone for a moment. */
let lyricScrollHold = 0;
{
  const box = $('lyrics');
  const hold = () => { lyricScrollHold = performance.now() + 4000; };
  for (const ev of ['wheel', 'touchstart', 'pointerdown']) box.addEventListener(ev, hold, { passive: true });
}

/** Keep jumps between sung lines: tell the planner where lines start. */
let lyricPenaltyTimer: ReturnType<typeof setTimeout> | null = null;
function applyLyricPenalty() {
  if (lyricPenaltyTimer) clearTimeout(lyricPenaltyTimer);
  lyricPenaltyTimer = setTimeout(() => {
    const p = player;
    if (!p?.analysis || !p.source) return;
    const shifted = lyricLines.map((l) => ({ ...l, time: l.time + lyricOffset }));
    void p.setLyricPenalty(lyricLines.length ? lyricBoundaryPenalty(shifted, p.analysis.beats, p.source.sampleRate) : null);
  }, 300);
}

function setLyricOffset(v: number, save = true) {
  lyricOffset = Math.round(v * 10) / 10;
  $('lyr-offset').textContent = `${lyricOffset > 0 ? '+' : ''}${lyricOffset.toFixed(1)} s`;
  lyricActiveIdx = -2;
  applyLyricPenalty();
  if (save) saveLyrics();
}
$('lyr-earlier').addEventListener('click', () => setLyricOffset(lyricOffset - 0.1));
$('lyr-later').addEventListener('click', () => setLyricOffset(lyricOffset + 0.1));

function renderLyrics() {
  const box = $('lyrics');
  box.innerHTML = '';
  lyricActiveIdx = -1;
  lyricLines.forEach((l) => {
    const d = document.createElement('div');
    d.className = 'line';
    d.textContent = l.text;
    d.addEventListener('click', () => player?.seek(Math.round((l.time + lyricOffset) * player!.source!.sampleRate)));
    box.appendChild(d);
  });
  showLyricsView(lyricLines.length > 0);
  show('now-line', lyricLines.length > 0);
  applyLyricPenalty();
  renderLoops();
}

function useLyrics(r: LyricsResult) {
  setLyrics(r.synced, `${r.title} · ${r.artist}`);
}

function setLyrics(lines: LyricLine[], source: string) {
  lyricLines = lines;
  lyricsSearched = true;
  lyricSource = source;
  $('lyr-results').innerHTML = '';
  $('lyr-status').textContent = '';
  $('lyr-source').textContent = source;
  setLyricOffset(0, false);
  renderLyrics();
  saveLyrics();
}

/** LRCLIB search with a memory and IndexedDB cache in front (the service is often slow or busy). */
const lyricSearches = new Map<string, Promise<LyricsResult[]>>();
function cachedSearch(q: string, duration: number): Promise<LyricsResult[]> {
  const key = `${q.toLowerCase()}|${Math.round(duration)}`;
  let hit = lyricSearches.get(key);
  if (!hit) {
    hit = (async () => {
      const stored = await getLyricSearch<LyricsResult[]>(key);
      if (stored) return stored;
      const results = await searchLyrics(q, duration);
      if (results.length) void putLyricSearch(key, results);
      return results;
    })();
    hit.catch(() => lyricSearches.delete(key));
    lyricSearches.set(key, hit);
  }
  return hit;
}

/** Lyrics loaded: the karaoke view; otherwise (or on "Change") the search. */
function showLyricsView(on: boolean) {
  show('lyr-view', on);
  show('lyr-find', !on);
}
$('lyr-change').addEventListener('click', () => show('lyr-find', $('lyr-find').classList.contains('hidden')));
$('now-line').addEventListener('click', () => {
  setTab('lyrics');
  $('panel-lyrics').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/** Search LRCLIB; with `auto`, take the top result if it's synced and the same length. */
async function findLyrics(auto: boolean) {
  const q = $<HTMLInputElement>('lyr-q').value.trim();
  if (!q) { $('lyr-status').textContent = 'Enter a title and artist.'; return; }
  lyricsSearched = true;
  const token = songToken;
  const status = $('lyr-status');
  const list = $('lyr-results');
  status.textContent = 'Searching…';
  list.innerHTML = '';
  const src = player?.source;
  const duration = src ? src.length / src.sampleRate : 0;
  try {
    const results = await cachedSearch(q.replace(/\s+[-–—]\s+/g, ' '), duration);
    if (token !== songToken || (auto && lyricLines.length)) return;
    const top = results[0];
    if (auto && top?.synced.length && (!duration || Math.abs(top.duration - duration) <= 4)) { useLyrics(top); return; }
    if (!results.some((r) => r.synced.length)) {
      status.textContent = results.length ? 'LRCLIB only has unsynced lyrics for this search.' : 'LRCLIB has no lyrics for this search. Try other wording or load an .lrc file.';
      return;
    }
    status.textContent = 'Select the matching recording:';
    for (const r of results.filter((x) => x.synced.length)) {
      const li = document.createElement('li');
      const off = duration && r.duration ? Math.abs(r.duration - duration) : 0;
      li.innerHTML = `<span class="meta"><b>${esc(r.title)}</b><br>${esc(r.artist)}${r.album ? ` · ${esc(r.album)}` : ''} · ${fmt(r.duration)}${off > 4 ? ' (length differs)' : ''}</span><button class="primary">Use</button>`;
      li.querySelector('button')!.addEventListener('click', () => useLyrics(r));
      list.appendChild(li);
    }
  } catch (err) {
    if (token !== songToken) return;
    status.textContent = `Lyrics search failed: ${errText(err)}`;
    // A failed background lookup is retried when the Lyrics tab opens.
    if (auto) lyricsSearched = false;
  }
}
$<HTMLFormElement>('lyr-form').addEventListener('submit', (e) => { e.preventDefault(); void findLyrics(false); });

$('lrc-pick').addEventListener('click', () => $<HTMLInputElement>('lrc').click());
$<HTMLInputElement>('lrc').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = '';
  if (!f) return;
  const lines = parseLrc(await f.text());
  if (!lines.length) { $('lyr-status').textContent = 'No synced lines in that file.'; return; }
  setLyrics(lines, f.name);
});

// ---- Share links --------------------------------------------------------------------

$('share').addEventListener('click', async () => {
  const p = player;
  if (!p?.analysis) return;
  const s = p.currentSettings;
  const state: ShareState = {
    v: 1,
    h: p.fileHash.slice(0, 16),
    n: trackName().slice(0, 80),
    mode: s.mode,
    sr: p.source!.sampleRate,
    loop: s.mode === 'loop' && s.loop ? [s.loop.startSample, s.loop.endSample] : undefined,
    settings: { bars: s.barsBetweenJumps, thr: +s.threshold.toFixed(3), fade: s.fadeSec, barLock: s.barLock, phrase: s.phraseBias },
    gains: p.stems ? Object.fromEntries(p.stems.names.map((n, i) => [n, +p.gains[i].toFixed(2)])) : undefined,
    locks: p.stems ? p.stems.names.filter((_, i) => p.locked[i]) : undefined,
  };
  const url = `${location.origin}${location.pathname}${encodeShare(state)}`;
  const out = $<HTMLInputElement>('share-url');
  out.value = url;
  show('share-out');
  out.select();
  try { await navigator.clipboard.writeText(url); $('share').textContent = 'Link copied'; } catch { $('share').textContent = 'Copy it below'; }
  setTimeout(() => ($('share').textContent = 'Copy link'), 2500);
});

function applyShare() {
  const p = player, s = pendingShare;
  if (!p?.analysis || !s) return;
  if (s.h && p.fileHash && !p.fileHash.startsWith(s.h)) {
    $('share-banner').textContent = "This isn't the same audio file as the shared link, so its settings weren't applied.";
    return;
  }
  const v = (id: string) => $<HTMLInputElement>(id);
  if (s.settings?.bars) v('bars').value = String(s.settings.bars);
  if (s.settings?.thr) v('thr').value = String(s.settings.thr);
  if (s.settings?.fade) v('fade').value = String(Math.round(s.settings.fade * 1000));
  if (s.settings?.phrase !== undefined) v('phrase').value = String(s.settings.phrase);
  if (s.settings?.barLock !== undefined) v('barlock').checked = s.settings.barLock;
  p.updateSettings(settingsFromControls());
  if (s.mode === 'loop' && s.loop) {
    const [a, b] = scaleLoop(s.loop, s.sr, p.source!.sampleRate);
    const tolerance = 0.05 * p.source!.sampleRate;
    const match = p.loops.find((l) => Math.abs(l.startSample - a) < tolerance && Math.abs(l.endSample - b) < tolerance);
    if (match) selectLoop(match);
  }
  syncControls();
  const needsStems = !!(s.gains && Object.values(s.gains).some((g) => g !== 1)) || !!s.locks?.length;
  $('share-banner').textContent = needsStems ? 'Shared settings applied. Separate stems to apply the shared mix.' : 'Shared settings applied.';
  if (!needsStems) pendingShare = null;
}

function applyShareMix() {
  const p = player, s = pendingShare;
  if (!p?.stems || !s) return;
  if (s.h && p.fileHash && !p.fileHash.startsWith(s.h)) return;
  p.stems.names.forEach((n, i) => { if (s.gains && n in s.gains) { vol[i] = s.gains[n] || 1; mute[i] = s.gains[n] === 0; } });
  document.querySelectorAll<HTMLElement>('#stem-rows .stem').forEach((row, i) => {
    row.querySelector<HTMLInputElement>('input')!.value = String(vol[i]);
    row.querySelector('[data-k=m]')!.setAttribute('aria-pressed', String(mute[i]));
  });
  pushGains();
  const loop = p.currentSettings.loop;
  if (loop) s.locks?.forEach((n) => {
    const i = (p.stems!.names as string[]).indexOf(n);
    if (i >= 0 && p.lockStem(i, loop)) document.querySelectorAll('#stem-rows .stem')[i]?.querySelector('[data-k=l]')?.setAttribute('aria-pressed', 'true');
  });
  $('share-banner').textContent = 'Shared settings and mix applied.';
  pendingShare = null;
}

// ---- Transport, sleep, lock screen ------------------------------------------------------

const ICON_SEAM = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 4v6h-6l2.3-2.3A6 6 0 1 0 18 12h2a8 8 0 0 1-16 0z" fill="currentColor"/></svg>';
const ICON_DOWNLOAD = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M11 4h2v9.2l3.3-3.3 1.4 1.4L12 17l-5.7-5.7 1.4-1.4 3.3 3.3zM5 19h14v2H5z" fill="currentColor"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
let shownPlaying: boolean | null = null;
function updatePlayButton() {
  const on = !!player?.playing;
  if (on === shownPlaying) return;
  shownPlaying = on;
  for (const b of [$('play'), ...document.querySelectorAll<HTMLElement>('.lib-play')]) {
    b.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
    b.setAttribute('aria-label', on ? 'Pause' : 'Play');
  }
  $('tab-eq').classList.toggle('on', on);
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
}

/** Must be called straight from a tap/click so the browser lets audio start. */
async function togglePlay() {
  if (!player?.source) return;
  if (player.playing) player.pause();
  else await player.play();
  updatePlayButton();
}
$('play').addEventListener('click', togglePlay);
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (e.code === 'Space' && !(t instanceof HTMLInputElement) && !(t instanceof HTMLButtonElement) && !(t instanceof HTMLSelectElement)) {
    e.preventDefault();
    void togglePlay();
  }
});

$<HTMLSelectElement>('sleep').addEventListener('change', (e) => player?.setSleep(Number((e.target as HTMLSelectElement).value)));

/** 8D audio (persisted): the mix circles around the listener. */
const eightdSelect = $<HTMLSelectElement>('eightd');
try { eightdSelect.value = localStorage.getItem('stems.8d') || 'off'; } catch { /* default off */ }
if (!eightdSelect.value) eightdSelect.value = 'off';
function apply8D() { player?.set8D(eightdSelect.value as Spatial8DSpeed); }
eightdSelect.addEventListener('change', () => {
  try { localStorage.setItem('stems.8d', eightdSelect.value); } catch { /* ignore */ }
  apply8D();
});

function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title || 'stems',
    artist: song.artist || 'stems',
    album: 'stems · endless',
    artwork: [{ src: new URL('./icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }],
  });
  navigator.mediaSession.setActionHandler('play', () => { void player?.play().then(updatePlayButton); });
  navigator.mediaSession.setActionHandler('pause', () => { player?.pause(); updatePlayButton(); });
  navigator.mediaSession.setActionHandler('stop', () => { player?.pause(); updatePlayButton(); });
}

// ---- File input + drag and drop -----------------------------------------------------------

const fileInput = $<HTMLInputElement>('file');
$('pick').addEventListener('click', () => fileInput.click());

// ---- Views (tab bar) ------------------------------------------------------------------------

type View = 'home' | 'app';
const scrollPos: Partial<Record<View, number>> = {};
let view: View = 'home';

function go(v: View) {
  if (v !== view) scrollPos[view] = window.scrollY;
  for (const k of ['home', 'app'] as const) show(k, k === v);
  document.querySelectorAll<HTMLButtonElement>('#tabbar [data-view]').forEach((b) => {
    if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  const back = v !== view ? scrollPos[v] ?? 0 : window.scrollY;
  view = v;
  if (v === 'home') void renderLibrary();
  window.scrollTo({ top: back });
}

/** The Player tab is usable once a song is open; it carries the song's name. */
function setPlayerTab(on: boolean) {
  const b = document.querySelector<HTMLButtonElement>('#tabbar [data-view=app]')!;
  b.disabled = !on;
  $('tab-player').textContent = on ? song.title || 'Player' : 'Player';
}

document.querySelectorAll<HTMLButtonElement>('#tabbar [data-view]').forEach((b) => b.addEventListener('click', () => {
  const v = b.dataset.view as View;
  if (v === view) window.scrollTo({ top: 0, behavior: 'smooth' });
  else go(v);
}));
fileInput.addEventListener('change', () => { const fs = [...(fileInput.files ?? [])]; fileInput.value = ''; void addFiles(fs); });
$('demo').addEventListener('click', () => load({ demo: true }));
const drop = $('drop');
for (const ev of ['dragenter', 'dragover']) document.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); });
for (const ev of ['dragleave', 'drop']) document.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'drop' || e.target === drop) drop.classList.remove('over'); });
document.addEventListener('drop', (e) => {
  const fs = [...((e as DragEvent).dataTransfer?.files ?? [])];
  if (fs.length) void addFiles(fs);
});

// ---- Library ------------------------------------------------------------------------------

let librarySongs: LibrarySong[] = [];

/** Add files to the library and open the first one. */
async function addFiles(files: File[]) {
  const audio = files.filter((f) => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|webm)$/i.test(f.name));
  if (!audio.length) { showError('Those files are not audio. MP3, M4A, WAV, FLAC and OGG are supported.'); return; }
  if (audio.length === 1) { void load({ file: audio[0] }); return; }
  const status = $('url-status');
  let first: LibrarySong | null = null;
  opening++;
  try {
    for (const [i, f] of audio.entries()) {
      status.textContent = `Adding ${i + 1} of ${audio.length}: ${f.name}`;
      try { const s = await addSong(f); first ??= s; } catch { /* skip unreadable files */ }
    }
  } finally {
    opening--;
  }
  status.textContent = `Added ${audio.length} songs to the library.`;
  await renderLibrary();
  if (first) void openSong(first.id);
}

async function openSong(id: string) {
  const f = await songFile(id);
  const e = librarySongs.find((s) => s.id === id);
  if (f) void load({ file: f, libraryId: id, info: e && e.title ? { title: e.title, artist: e.artist } : undefined });
}

/** Redraw the library; `reload` re-reads it from storage (typing in search only filters). */
async function renderLibrary(reload = true) {
  if (reload) { try { librarySongs = await listSongs(); } catch { librarySongs = []; } }
  const playing = !!player?.source;
  show('library', librarySongs.length > 0);
  show('hero', librarySongs.length === 0 && !playing);
  $('drop').classList.toggle('compact', librarySongs.length > 0);
  $('lib-count').textContent = librarySongs.length ? `${librarySongs.length}` : '';
  const list = $('lib-list');
  list.innerHTML = '';
  const shown = matchSongs(librarySongs, $<HTMLInputElement>('lib-q').value);
  if (!shown.length && librarySongs.length) list.innerHTML = '<li class="empty">No songs match.</li>';
  for (const s of shown) {
    const li = document.createElement('li');
    li.classList.toggle('current', s.id === currentSongId);
    const meta = [s.artist, s.duration ? fmt(s.duration) : '', `${(s.size / 1e6).toFixed(1)} MB`].filter(Boolean).join(' · ');
    const isCurrent = s.id === currentSongId && playing;
    li.innerHTML = `${isCurrent ? `<button class="lib-play" aria-label="${player?.playing ? 'Pause' : 'Play'}">${player?.playing ? ICON_PAUSE : ICON_PLAY}</button>` : ''}<button class="open"><b>${esc(s.title || s.name)}</b><span>${esc(meta)}</span></button><button class="rm" aria-label="Remove ${esc(s.title || s.name)} from the library">Remove</button>`;
    li.querySelector<HTMLButtonElement>('.lib-play')?.addEventListener('click', togglePlay);
    li.querySelector<HTMLButtonElement>('.open')!.onclick = () => (isCurrent ? go('app') : void openSong(s.id));
    li.querySelector<HTMLButtonElement>('.rm')!.onclick = async () => { await removeSong(s.id); if (s.id === currentSongId) currentSongId = ''; void renderLibrary(); };
    list.appendChild(li);
  }
}
$('lib-q').addEventListener('input', () => { void renderLibrary(false); });

$<HTMLFormElement>('url-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>('url');
  const status = $('url-status');
  if (!input.value.trim()) return;
  status.textContent = 'Downloading';
  try {
    const f = await fetchAudioFile(input.value, (fr) => { status.textContent = `Downloading ${Math.round(fr * 100)}%`; });
    status.textContent = '';
    input.value = '';
    void load({ file: f });
  } catch (err) {
    status.textContent = errText(err);
  }
});

// Files shared to stems from the system Share menu (installed app, see public/sw.js).
if (new URLSearchParams(location.search).has('shared')) {
  history.replaceState(null, '', location.pathname);
  void takeSharedFiles().then((fs) => { if (fs.length) void addFiles(fs); });
}
void renderLibrary();

$('clear-cache').addEventListener('click', async () => {
  await clearCache();
  try { await caches.delete('stems-models-v1'); } catch { /* ignore */ }
  $('clear-cache').textContent = 'Cleared';
});

// ---- PWA ----------------------------------------------------------------------------------

let installPrompt: (Event & { prompt(): Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e as typeof installPrompt;
  show('install');
});
$('install').addEventListener('click', async () => { await installPrompt?.prompt(); show('install', false); });
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => ensureIsolationState(() => !player?.source && !opening))
    .catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { void ensureIsolationState(() => !player?.source && !opening); });
}

// Multi-threaded mode (cross-origin isolation). Needs the service worker in production builds.
const mt = $<HTMLInputElement>('multithread');
mt.checked = crossOriginIsolated;
if (!import.meta.env.PROD && !crossOriginIsolated) {
  mt.disabled = true;
  $('multithread-note').textContent = 'Dev server started with STEMS_ISOLATE=0.';
}
mt.addEventListener('change', () => { void setIsolation(mt.checked); });

// Installed app: "Open with stems" for audio files.
type LaunchParams = { files: { getFile(): Promise<File> }[] };
const lq = (window as unknown as { launchQueue?: { setConsumer(cb: (p: LaunchParams) => void): void } }).launchQueue;
lq?.setConsumer(async (params) => {
  if (params.files.length) void addFiles(await Promise.all(params.files.map((h) => h.getFile())));
});

// ---- Drawing --------------------------------------------------------------------------------

function frame() {
  const p = player;
  if (p?.source) updatePlayButton();
  if (p?.source && document.visibilityState === 'visible' && !$('app').classList.contains('hidden')) {
    const pos = p.audiblePosition();
    const heads = p.stems
      ? p.stems.names.map((n, i) => ({ n, i })).filter(({ i }) => p.locked[i]).map(({ n, i }) => ({ pos: p.stemPositions[i] ?? 0, label: n }))
      : [];
    viz.draw(pos, p.queue, heads);
    $('listened').textContent = fmt(p.listenedSec);
    $('posn').textContent = fmt(pos / p.source.sampleRate);
    $('jumps').textContent = String(p.jumpCount);
    $('sleep-left').textContent = p.sleepAt ? fmt((p.sleepAt - Date.now()) / 1000) : '';
    updatePlayButton();
    if (lyricLines.length) {
      const idx = lineAt(lyricLines, pos / p.source.sampleRate - lyricOffset);
      // Current line in the player card, so it can be followed from any tab.
      // A line counts as over once the next starts or 8 s have passed.
      const cur = lyricLines[idx];
      const ended = !cur || pos / p.source.sampleRate - lyricOffset > Math.min(lyricLines[idx + 1]?.time ?? Infinity, cur.time + 8);
      const curText = ended ? '' : cur.text, nextText = lyricLines[idx + 1]?.text ?? '';
      if ($('now-cur').textContent !== curText) $('now-cur').textContent = curText;
      if ($('now-next').textContent !== nextText) $('now-next').textContent = nextText;
      if (idx !== lyricActiveIdx) {
        lyricActiveIdx = idx;
        const box = $('lyrics');
        box.querySelectorAll<HTMLDivElement>('.line').forEach((el, i) => {
          el.classList.toggle('active', i === idx);
          el.classList.toggle('near', Math.abs(i - idx) === 1);
        });
        // Keep the sung line centred, except while the person scrolls the lyrics.
        const el = box.children[Math.max(0, idx)] as HTMLElement | undefined;
        if (el && tab === 'lyrics' && performance.now() > lyricScrollHold) {
          const target = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
          box.scrollTo({ top: target, behavior: Math.abs(target - box.scrollTop) > box.clientHeight ? 'auto' : 'smooth' });
        }
      }
    }
  }
  requestAnimationFrame(frame);
}
updatePlayButton();
requestAnimationFrame(frame);

// Expose for automated testing / console tinkering.
(window as unknown as { stems: unknown }).stems = { get player() { return player; } };

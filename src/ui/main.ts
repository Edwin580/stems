import { clearCache } from '../audio/cache';
import { encodeMp3InWorker } from '../audio/mp3-client';
import { DEFAULT_MODEL_URL, Player, sharedMemory } from '../audio/player';
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

async function load(source: { file?: File; demo?: boolean }) {
  show('error', false);
  show('home', false);
  show('another');
  try {
    const p = await ensurePlayer();
    p.source = null;
    show('app');
    show('aprog');
    resetSongUi();
    setProgress('Decoding', 0);
    let loaded: Promise<void>;
    if (source.file) {
      song = await songInfo(source.file);
      loaded = p.loadFile(source.file);
    } else {
      song = { title: 'Demo track', artist: 'Synthesized in the browser' };
      loaded = p.loadChannels(synthSong({ sampleRate: p.ctx.sampleRate }).channels);
    }
    $('track').textContent = song.title || 'Untitled';
    $('artist').textContent = song.artist;
    $<HTMLInputElement>('lyr-q').value = [song.title, song.artist].filter(Boolean).join(' ');
    await waitForSource(p, loaded);
    if (p.source) onDecoded(p);
    await loaded;
  } catch (err) {
    show('app', false);
    show('another', false);
    show('home');
    showError(`Couldn't decode that file (${errText(err)}). MP3, M4A, WAV, FLAC and OGG are supported.`);
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
  show('lyr-timing', false);
  lyricOffset = 0;
  $('lyr-offset').textContent = '0.0 s';
  sectionFromHandles = false;
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
  $<HTMLButtonElement>('play').disabled = false;
  updateMediaSession();
  updateModeHint();
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
  const p = player;
  if (apply && p) {
    p.updateSettings({ mode });
    if (mode === 'endless' && p.analysis && p.currentSettings.range && !sectionFromHandles) {
      p.setSection(null);
      syncSectionInputs();
    }
    if (mode === 'loop' && p.analysis) {
      // Loop mode always shows its loop on the handles: the section if one is
      // set, otherwise the best loop found.
      const r = p.currentSettings.range;
      const loop = r ? p.loopFor(r) : p.currentSettings.loop ?? p.loops[0];
      if (loop) {
        p.setSection({ start: loop.startBeat, end: loop.endBeat }, loop);
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

function updateModeHint() {
  const p = player;
  const el = $('mode-hint');
  if (!p?.source) { el.textContent = ''; return; }
  if (!p.analysis) { el.textContent = 'Ready to play. Jumps start once analysis finishes.'; return; }
  const sr = p.source.sampleRate;
  const r = p.currentSettings.range;
  if (currentMode() === 'endless') {
    el.textContent = r
      ? `Endless within ${fmt(p.analysis.beats[r.start] / sr)}-${fmt(p.analysis.beats[r.end] / sr)}.`
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
}
document.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab as Tab)));

// ---- Tune ---------------------------------------------------------------------------

function refreshGraph() {
  const pl = player?.planner;
  if (!pl) return;
  viz.setGraph(pl.activeEdges, pl.coreMask, pl.settings.mode === 'loop' ? pl.settings.loop : null);
  const n = player!.analysis!.beats.length;
  const pct = Math.round((100 * pl.coreSize) / n);
  const relaxed = pl.effectiveThreshold > pl.settings.threshold + 1e-6;
  $('thr-note').textContent = `${pct}% of the track is reachable${relaxed ? '; loosened automatically because the setting left too few jumps' : ''}.`;
}

function syncControls() {
  const v = (id: string) => $<HTMLInputElement>(id).value;
  $('bars-v').textContent = v('bars');
  $('thr-v').textContent = `≥ ${costToQuality(Number(v('thr')))}% match`;
  $('fade-v').textContent = `${v('fade')} ms`;
  $('phrase-v').textContent = `${Math.round(Number(v('phrase')) * 100)}%`;
  refreshGraph();
}

function settingsFromControls() {
  const v = (id: string) => $<HTMLInputElement>(id);
  return {
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
  p.setSection({ start: loop.startBeat, end: loop.endBeat }, loop);
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
  const [si, ei] = indices ?? [nearestStop(Number(secStart.value)), nearestStop(Number(secEnd.value))];
  const whole = si === 0 && ei === stops.length - 1;
  const b = p.analysis.beats, sr = p.source!.sampleRate;
  const max = Number(secStart.max) || 1;
  const fill = $('range-fill');
  fill.style.left = `${(beatMs(stops[si]) / max) * 100}%`;
  fill.style.width = `${((beatMs(stops[ei]) - beatMs(stops[si])) / max) * 100}%`;
  viz.setSection(whole ? null : [b[stops[si]], b[stops[ei]]]);
  const bars = Math.round((stops[ei] - stops[si]) / p.analysis.meter.beatsPerBar);
  $('sec-label').textContent = whole
    ? 'Full track'
    : `${fmt(b[stops[si]] / sr)}-${fmt(b[stops[ei]] / sr)}, ${bars} bar${bars === 1 ? '' : 's'}`;
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

function applySection([si, ei]: [number, number]) {
  const p = player;
  if (!p?.analysis) return;
  const whole = si === 0 && ei === stops.length - 1;
  sectionFromHandles = !whole;
  p.setSection(whole ? null : { start: stops[si], end: stops[ei] });
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
  if (!p?.analysis) return;
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
      <span class="meta"><b>Loop ${i + 1}</b> <span class="q ${seamGrade(l)}" title="Waveform correlation ${Math.round(l.rho * 100)}%, spectral step ${l.spectralDb.toFixed(1)} dB">${seamLabel(l)} seam</span><br>${l.bars} bars, ${fmt(l.startSample / sr)}-${fmt(l.endSample / sr)} (${fmt(l.seconds)})${lyricNote}</span>
      <span class="acts">
        <button data-act="use" ${active ? 'class="primary" aria-pressed="true"' : ''}>${active ? 'Looping' : 'Loop'}</button>
        <button data-act="seam" title="Play the four seconds before the seam">Preview seam</button>
        <button data-act="wav" title="Export one cycle as WAV with loop points">WAV</button>
      </span>`;
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

function setLyricOffset(v: number) {
  lyricOffset = Math.round(v * 10) / 10;
  $('lyr-offset').textContent = `${lyricOffset > 0 ? '+' : ''}${lyricOffset.toFixed(1)} s`;
  lyricActiveIdx = -2;
  applyLyricPenalty();
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
    d.innerHTML = `<span class="t">${fmt(l.time)}</span><span>${esc(l.text)}</span>`;
    d.addEventListener('click', () => player?.seek(Math.round((l.time + lyricOffset) * player!.source!.sampleRate)));
    box.appendChild(d);
  });
  show('lyr-timing', lyricLines.length > 0);
  applyLyricPenalty();
  renderLoops();
}

function useLyrics(r: LyricsResult) {
  lyricLines = r.synced;
  $('lyr-results').innerHTML = '';
  $('lyr-status').innerHTML = `${esc(r.title)} · ${esc(r.artist)}. <button class="link" id="lyr-other">Wrong match</button>`;
  $('lyr-other').addEventListener('click', () => { void findLyrics(false); });
  renderLyrics();
}

/** Search LRCLIB; with `auto`, take the top result if it's synced and the same length. */
async function findLyrics(auto: boolean) {
  const q = $<HTMLInputElement>('lyr-q').value.trim();
  if (!q) { $('lyr-status').textContent = 'Enter a title and artist.'; return; }
  lyricsSearched = true;
  const status = $('lyr-status');
  const list = $('lyr-results');
  status.textContent = 'Searching…';
  list.innerHTML = '';
  const src = player?.source;
  const duration = src ? src.length / src.sampleRate : 0;
  try {
    const results = await searchLyrics(q.replace(/\s+[-–—]\s+/g, ' '), duration);
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
    status.textContent = `Lyrics search failed: ${errText(err)}`;
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
  lyricLines = lines;
  lyricsSearched = true;
  $('lyr-results').innerHTML = '';
  $('lyr-status').textContent = `${lines.length} synced lines from ${f.name}.`;
  renderLyrics();
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

const ICON_PLAY = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
let shownPlaying: boolean | null = null;
function updatePlayButton() {
  const on = !!player?.playing;
  if (on === shownPlaying) return;
  shownPlaying = on;
  const b = $('play');
  b.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
  b.setAttribute('aria-label', on ? 'Pause' : 'Play');
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
$('another').addEventListener('click', () => { player?.pause(); updatePlayButton(); fileInput.click(); });
fileInput.addEventListener('change', () => { const f = fileInput.files?.[0]; if (f) void load({ file: f }); fileInput.value = ''; });
$('demo').addEventListener('click', () => load({ demo: true }));
const drop = $('drop');
for (const ev of ['dragenter', 'dragover']) document.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); });
for (const ev of ['dragleave', 'drop']) document.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'drop' || e.target === drop) drop.classList.remove('over'); });
document.addEventListener('drop', (e) => {
  const f = (e as DragEvent).dataTransfer?.files?.[0];
  if (f) void load({ file: f });
});

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
    .then(() => ensureIsolationState(() => !player?.source))
    .catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { void ensureIsolationState(() => !player?.source); });
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
  const h = params.files[0];
  if (h) void load({ file: await h.getFile() });
});

// ---- Drawing --------------------------------------------------------------------------------

function frame() {
  const p = player;
  if (p?.source && document.visibilityState === 'visible') {
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
      if (idx !== lyricActiveIdx) {
        lyricActiveIdx = idx;
        const box = $('lyrics');
        box.querySelectorAll<HTMLDivElement>('.line').forEach((el, i) => el.classList.toggle('active', i === idx));
        const el = box.children[idx] as HTMLElement | undefined;
        // Scroll only when the line leaves the middle of the view, and never
        // while the person is scrolling the lyrics themselves.
        if (el && tab === 'lyrics' && performance.now() > lyricScrollHold) {
          const top = el.offsetTop - box.offsetTop;
          const mid = box.scrollTop + box.clientHeight / 2;
          if (Math.abs(top + el.clientHeight / 2 - mid) > box.clientHeight / 4) {
            box.scrollTo({ top: top - box.clientHeight / 2 + el.clientHeight / 2, behavior: Math.abs(top - box.scrollTop) > box.clientHeight * 2 ? 'auto' : 'smooth' });
          }
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

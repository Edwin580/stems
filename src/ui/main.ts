import { clearCache } from '../audio/cache';
import { encodeMp3InWorker } from '../audio/mp3-client';
import { DEFAULT_MODEL_URL, Player, sharedMemory } from '../audio/player';
import { synthSong } from '../engine/demo';
import type { LoopCandidate } from '../engine/loops';
import { encodeWav } from '../engine/render';
import { decodeShare, encodeShare, scaleLoop, type ShareState } from '../engine/share';
import { costToQuality } from '../engine/similarity';
import { wasmFFTAvailable } from '../engine/wasm-fft';
import { alignLoopsToLyrics, linesInLoop } from '../lyrics/loopalign';
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
  if (/segment/i.test(stage)) $('sep-note').textContent = 'Keep this page open. It keeps playing while it works.';
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
  $('share-banner').innerHTML = `Someone shared a ${pendingShare.mode === 'loop' ? 'loop' : 'endless mix'}${pendingShare.n ? ` of <b>${esc(pendingShare.n)}</b>` : ''}. Choose the same song file to hear it.`;
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
    onJump: (j) => viz.flashJump(j),
    onEnded: () => updatePlayButton(),
    onSleep: () => { $<HTMLSelectElement>('sleep').value = '0'; updatePlayButton(); },
  };
  viz.onSeek = (s) => player?.seek(s);
  return player;
}

/** Engine stage names, in plain words. */
function friendlyStage(stage: string): string {
  if (/^Decoded/.test(stage)) return 'Ready to play · finding the seams';
  if (/loops/i.test(stage)) return 'Finding loops';
  return `Listening to the song · ${stage.toLowerCase()}`;
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
  try {
    const p = await ensurePlayer();
    p.source = null;
    show('app');
    show('aprog');
    resetSongUi();
    setProgress('Opening the song', 0);
    let loaded: Promise<void>;
    if (source.file) {
      song = await songInfo(source.file);
      loaded = p.loadFile(source.file);
    } else {
      song = { title: 'Demo track', artist: 'made in your browser' };
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
    show('home');
    showError(`Couldn't open that file: ${errText(err)}. Try an MP3, M4A or WAV.`);
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
  $('lyrics').innerHTML = '';
  $('lyr-results').innerHTML = '';
  $('lyr-status').textContent = '';
  $('render-note').textContent = '';
  show('share-out', false);
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
  renderLoops();
  applyShare();
  updateModeHint();
}

// ---- Mode (endless / loop) ------------------------------------------------------------

function currentMode(): 'endless' | 'loop' { return player?.currentSettings.mode ?? 'endless'; }

function setMode(mode: 'endless' | 'loop', apply = true) {
  document.querySelectorAll<HTMLButtonElement>('.seg [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  if (apply) player?.updateSettings({ mode });
  refreshGraph();
  renderLoops();
  updateModeHint();
}
document.querySelectorAll<HTMLButtonElement>('.seg [data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as 'endless' | 'loop')));

function updateModeHint() {
  const p = player;
  const el = $('mode-hint');
  if (!p?.source) { el.textContent = ''; return; }
  if (!p.analysis) { el.textContent = 'You can press play now. Seamless jumps switch on in a few seconds.'; return; }
  if (currentMode() === 'endless') {
    el.textContent = 'Endless: moves through the song, jumping between moments that match. It never ends.';
    return;
  }
  const loop = p.currentSettings.loop;
  const i = loop ? displayedLoops().findIndex((l) => l.startSample === loop.startSample && l.endSample === loop.endSample) : -1;
  el.textContent = loop
    ? `Loop: repeating ${i >= 0 ? `loop ${i + 1}` : 'a section'} (${loop.bars} bars, ${fmt(loop.startSample / p.source.sampleRate)}–${fmt(loop.endSample / p.source.sampleRate)}) forever. Pick another in Loops.`
    : 'Loop: no seamless loop was found in this song. Endless still works.';
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
  $('thr-note').textContent = `${pct}% of the song is reachable${relaxed ? ' (loosened automatically: too strict for this song)' : ''}.`;
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
  p.updateSettings({ loop, mode: 'loop' });
  // Locked stems follow the selected loop.
  p.locked.forEach((l, i) => { if (l) { p.unlockStem(i); p.lockStem(i, loop); } });
  setMode('loop', false);
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
    const lyricNote = lyricLines.length ? ` · ${linesInLoop(l, lyricLines, sr).length} lyric lines` : '';
    li.innerHTML = `
      <span class="q" title="Seam match">${l.quality}%</span>
      <span class="meta"><b>Loop ${i + 1} · ${l.bars} bars</b><br>${fmt(l.startSample / sr)}–${fmt(l.endSample / sr)} · ${fmt(l.seconds)} long${lyricNote}</span>
      <span class="acts">
        <button data-act="use" class="${active ? '' : 'primary'}">${active ? 'Playing' : 'Loop this'}</button>
        <button data-act="seam" title="Play the few seconds around the seam">Hear seam</button>
        <button data-act="wav" title="Download one seamless cycle as WAV">WAV</button>
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
  if (!p?.analysis) { $('render-note').textContent = 'Wait a moment: the song is still being analysed.'; return; }
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
      const mp3 = await encodeMp3InWorker(channels, sr, { title: `${song.title || 'stems'} (${mins} min endless)`, artist: song.artist, comment: 'Made with stems' },
        (f) => { btn.textContent = `Encoding MP3… ${Math.round(f * 100)}%`; });
      download(mp3, `${name}.mp3`);
    } else {
      download(encodeWav(channels, sr, { cues }), `${name}.wav`);
    }
    $('render-note').textContent = realEnd
      ? exact ? `${fmt(secs)} long, ending on the song's own outro.` : `Couldn't land exactly on the ending, so it's ${fmt(secs)} with a fade-out.`
      : `${fmt(secs)} long with ${cues.length} seams.`;
  } catch (err) {
    $('render-note').textContent = `Couldn't render: ${errText(err)}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download';
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
  $('sep-note').textContent = method === 'htdemucs' ? 'The first time, this downloads the model (about 180 MB). Keep this page open.' : '';
  setStemProgress('Starting', 0);
  try {
    await p.separate(method, modelUrl.value || DEFAULT_MODEL_URL);
  } catch (err) {
    show('sprog', false);
    show('sep-actions');
    $('sep-note').textContent = `Splitting failed: ${errText(err)}`;
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
  const how = st.method === 'htdemucs' ? `Best quality (${backend === 'cache' ? 'saved from last time' : backend})` : 'Quick split';
  $('sep-note').textContent = `${how}.${st.hasVocals ? '' : ' This recording is mono, so vocals could not be separated.'}`;
  $('sep-again').textContent = st.method === 'htdemucs' ? 'Use the quick split instead' : 'Try the best-quality split';
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
      <button data-k="m" aria-pressed="false" title="Mute ${name}">Mute</button>
      <button data-k="s" aria-pressed="false" title="Solo ${name}">Solo</button>
      <button data-k="l" aria-pressed="false" title="Keep ${name} on the selected loop">🔒</button>`;
    const range = row.querySelector('input')!;
    range.addEventListener('input', () => { vol[i] = Number(range.value); pushGains(); });
    row.querySelector<HTMLButtonElement>('[data-k=m]')!.onclick = (e) => { mute[i] = !mute[i]; (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(mute[i])); pushGains(); };
    row.querySelector<HTMLButtonElement>('[data-k=s]')!.onclick = (e) => { solo[i] = !solo[i]; (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(solo[i])); pushGains(); };
    row.querySelector<HTMLButtonElement>('[data-k=l]')!.onclick = (e) => {
      const btn = e.currentTarget as HTMLElement;
      if (p.locked[i]) { p.unlockStem(i); btn.setAttribute('aria-pressed', 'false'); return; }
      const loop = p.currentSettings.loop ?? p.loops[0];
      if (!loop) { $('sep-note').textContent = 'There is no loop to lock to in this song.'; return; }
      if (p.lockStem(i, loop)) btn.setAttribute('aria-pressed', 'true');
      else $('sep-note').textContent = 'At least one stem has to keep following the song.';
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
  player?.setVocalAware((e.target as HTMLInputElement).checked);
  renderLoops();
  refreshGraph();
});

// ---- Lyrics -------------------------------------------------------------------------

let lyricActiveIdx = -1;

function renderLyrics() {
  const box = $('lyrics');
  box.innerHTML = '';
  lyricActiveIdx = -1;
  lyricLines.forEach((l) => {
    const d = document.createElement('div');
    d.className = 'line';
    d.innerHTML = `<span class="t">${fmt(l.time)}</span><span>${esc(l.text)}</span>`;
    d.addEventListener('click', () => player?.seek(Math.round(l.time * player!.source!.sampleRate)));
    box.appendChild(d);
  });
  renderLoops();
}

function useLyrics(r: LyricsResult) {
  lyricLines = r.synced;
  $('lyr-results').innerHTML = '';
  $('lyr-status').innerHTML = `${esc(r.title)} · ${esc(r.artist)}. <button class="link" id="lyr-other">Wrong song?</button>`;
  $('lyr-other').addEventListener('click', () => { void findLyrics(false); });
  renderLyrics();
}

/** Search LRCLIB; with `auto`, take the top result if it's synced and the same length. */
async function findLyrics(auto: boolean) {
  const q = $<HTMLInputElement>('lyr-q').value.trim();
  if (!q) { $('lyr-status').textContent = 'Type the song name and artist.'; return; }
  lyricsSearched = true;
  const status = $('lyr-status');
  const list = $('lyr-results');
  status.textContent = 'Searching…';
  list.innerHTML = '';
  const src = player?.source;
  const duration = src ? src.length / src.sampleRate : 0;
  try {
    const results = await searchLyrics(q, duration);
    const top = results[0];
    if (auto && top?.synced.length && (!duration || Math.abs(top.duration - duration) <= 4)) { useLyrics(top); return; }
    if (!results.some((r) => r.synced.length)) {
      status.textContent = results.length ? 'Found only unsynced lyrics for that search. Try a different spelling.' : 'No lyrics found. Try a different spelling.';
      return;
    }
    status.textContent = 'Pick the matching song:';
    for (const r of results.filter((x) => x.synced.length)) {
      const li = document.createElement('li');
      const off = duration && r.duration ? Math.abs(r.duration - duration) : 0;
      li.innerHTML = `<span class="meta"><b>${esc(r.title)}</b><br>${esc(r.artist)}${r.album ? ` · ${esc(r.album)}` : ''} · ${fmt(r.duration)}${off > 4 ? ' (different length)' : ''}</span><button class="primary">Use</button>`;
      li.querySelector('button')!.addEventListener('click', () => useLyrics(r));
      list.appendChild(li);
    }
  } catch (err) {
    status.textContent = `Couldn't search lyrics: ${errText(err)}`;
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
  try { await navigator.clipboard.writeText(url); $('share').textContent = 'Link copied'; } catch { $('share').textContent = 'Copy the link below'; }
  setTimeout(() => ($('share').textContent = 'Copy share link'), 2500);
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
  $('share-banner').textContent = needsStems ? 'Shared settings applied. Split the stems (Stems tab) to hear the shared mix too.' : 'Shared settings applied.';
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

let shownPlaying: boolean | null = null;
function updatePlayButton() {
  const on = !!player?.playing;
  if (on === shownPlaying) return;
  shownPlaying = on;
  const b = $('play');
  b.textContent = on ? '❚❚' : '▶';
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
  $('multithread-note').textContent = '(dev server: start with STEMS_ISOLATE=1)';
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
    const pos = p.position();
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
      const idx = lineAt(lyricLines, pos / p.source.sampleRate);
      if (idx !== lyricActiveIdx) {
        lyricActiveIdx = idx;
        const box = $('lyrics');
        box.querySelectorAll<HTMLDivElement>('.line').forEach((el, i) => el.classList.toggle('active', i === idx));
        const el = box.children[idx] as HTMLElement | undefined;
        if (el && tab === 'lyrics') box.scrollTop = el.offsetTop - box.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
      }
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose for automated testing / console tinkering.
(window as unknown as { stems: unknown }).stems = { get player() { return player; } };

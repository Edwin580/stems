import { clearCache } from '../audio/cache';
import { DEFAULT_MODEL_URL, Player, sharedMemory } from '../audio/player';
import { synthSong } from '../engine/demo';
import type { LoopCandidate } from '../engine/loops';
import { encodeWav } from '../engine/render';
import { decodeShare, encodeShare, scaleLoop, type ShareState } from '../engine/share';
import { costToQuality } from '../engine/similarity';
import { wasmFFTAvailable } from '../engine/wasm-fft';
import { Visualizer } from './visualizer';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let player: Player | null = null;
let trackName = '';
let tab: 'endless' | 'loop' | 'stems' = 'endless';
let pendingShare: ShareState | null = decodeShare(location.hash);
const viz = new Visualizer($<HTMLCanvasElement>('viz'));

function show(id: string, on = true) { $(id).classList.toggle('hidden', !on); }

function setProgress(stage: string, f: number) {
  $('stage').textContent = stage;
  $('pct').textContent = `${Math.round(f * 100)}%`;
  $('bar-fill').style.width = `${Math.round(f * 100)}%`;
}

function setStemProgress(stage: string, f: number) {
  $('sstage').textContent = stage;
  $('spct').textContent = `${Math.round(f * 100)}%`;
  $('sbar-fill').style.width = `${Math.round(f * 100)}%`;
}

// ---- Environment notes --------------------------------------------------------
$('env-note').textContent = [
  wasmFFTAvailable() ? 'WASM SIMD FFT' : 'JS FFT (no WASM SIMD)',
  sharedMemory() ? 'shared memory' : 'copied buffers',
].join(' · ');

if (pendingShare) {
  const b = $('share-banner');
  b.innerHTML = `Shared ${pendingShare.mode === 'loop' ? 'perfect loop' : 'endless mix'}${pendingShare.n ? ` of <b>${esc(pendingShare.n)}</b>` : ''}. Open the same audio file to hear it — links never contain audio.`;
  show('share-banner');
}

async function ensurePlayer(): Promise<Player> {
  if (player) return player;
  player = await Player.create();
  player.events = {
    onProgress: setProgress,
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
  show('drop', false);
  try {
    const p = await ensurePlayer();
    p.source = null;
    show('app');
    show('aprog');
    show('mixer', false);
    show('sprog', false);
    show('sep-actions');
    setProgress('Decoding', 0);
    $('stats').innerHTML = '';
    $('loops').innerHTML = '';
    $('sep-note').textContent = 'HTDemucs downloads a ~180 MB model once (cached), then runs on your GPU (WebGPU) or CPU. Expect a few minutes per song on CPU.';
    let loaded: Promise<void>;
    if (source.file) {
      trackName = source.file.name.replace(/\.[^.]+$/, '');
      loaded = p.loadFile(source.file);
    } else {
      trackName = 'Demo track (synthesised in your browser)';
      loaded = p.loadChannels(synthSong({ sampleRate: p.ctx.sampleRate }).channels);
    }
    $('track').textContent = trackName;
    await waitForSource(p, loaded);
    if (p.source) onDecoded(p);
    await loaded;
  } catch (err) {
    show('app', false);
    show('drop');
    $('error').textContent = `Couldn't process that file: ${err instanceof Error ? err.message : String(err)}`;
    show('error');
  }
}

function onDecoded(p: Player) {
  viz.setSong(p.source!.channels, null);
  updateMediaSession();
}

function onAnalysed(fromCache: boolean) {
  const p = player!;
  const a = p.analysis!, src = p.source!;
  show('aprog', false);
  const bars = a.beats.length / a.meter.beatsPerBar;
  const seams = a.edges.reduce((n, l) => n + l.length, 0);
  const tempo = a.tempoSpread > 1.03 ? `${a.bpm.toFixed(1)} BPM (drifts ±${(((a.tempoSpread - 1) / 2) * 100).toFixed(0)}%)` : `${a.bpm.toFixed(1)} BPM`;
  $('stats').innerHTML = [
    fmt(src.length / src.sampleRate),
    tempo,
    `${a.meter.beatsPerBar}/4`,
    `${a.beats.length} beats · ${Math.round(bars)} bars`,
    `${seams} candidate seams`,
    `${p.loops.length} perfect loops`,
    fromCache ? 'analysis from cache' : '',
  ].filter(Boolean).map((s) => `<span>${s}</span>`).join('');
  viz.setAnalysis(a);
  $<HTMLInputElement>('thr').value = String(p.currentSettings.threshold);
  syncControls();
  renderLoops();
  applyShare();
  setTab(tab);
}

function refreshGraph() {
  const pl = player?.planner;
  if (!pl) return;
  viz.setGraph(pl.activeEdges, pl.coreMask, pl.settings.mode === 'loop' ? pl.settings.loop : null);
  const n = player!.analysis!.beats.length;
  const pct = Math.round((100 * pl.coreSize) / n);
  const relaxed = pl.effectiveThreshold > pl.settings.threshold + 1e-6;
  $('thr-note').textContent = `${pct}% of the song is in the endless loop${relaxed ? ' (auto-relaxed: too strict for this song)' : ''}.`;
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

function setTab(t: 'endless' | 'loop' | 'stems') {
  tab = t;
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === t));
  for (const k of ['endless', 'loop', 'stems']) show(`panel-${k}`, k === t);
  // The stems tab doesn't change the playback mode.
  if (t !== 'stems') player?.updateSettings({ mode: t });
  refreshGraph();
}
document.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.mode as typeof tab)));

function selectLoop(loop: LoopCandidate) {
  const p = player;
  if (!p) return;
  p.updateSettings({ loop, mode: 'loop' });
  // Locked stems follow the selected loop.
  p.locked.forEach((l, i) => { if (l) { p.unlockStem(i); p.lockStem(i, loop); } });
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

function renderLoops() {
  const p = player;
  const ol = $('loops');
  ol.innerHTML = '';
  if (!p?.analysis) return;
  if (!p.loops.length) {
    ol.innerHTML = '<li>No loop of 8+ bars passed verification for this track. Endless mode still works.</li>';
    return;
  }
  const sr = p.source!.sampleRate;
  const sel = p.currentSettings.loop;
  p.loops.forEach((l, i) => {
    const li = document.createElement('li');
    if (sel && sel.startSample === l.startSample && sel.endSample === l.endSample) li.classList.add('sel');
    li.innerHTML = `
      <span class="q">${l.quality}%</span>
      <span class="meta"><b>#${i + 1} · ${l.bars} bars · ${fmt(l.seconds)}</b><br>${fmt(l.startSample / sr)} → ${fmt(l.endSample / sr)} · phase ${(Math.max(0, l.rho) * 100).toFixed(0)}% · fade ${Math.round((l.fade / sr) * 1000)} ms</span>
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
      const baked = p.exportLoop(l);
      const suffix = p.stems && p.gains.some((g) => g !== 1) ? ' (custom mix)' : '';
      download(encodeWav(baked, sr, { loop: { start: 0, end: baked[0].length } }), `${trackName} - seamless loop ${i + 1}${suffix}.wav`);
    };
    ol.appendChild(li);
  });
}

$('render').addEventListener('click', async () => {
  const p = player;
  if (!p?.analysis) return;
  const btn = $<HTMLButtonElement>('render');
  btn.disabled = true;
  btn.textContent = 'Rendering…';
  await new Promise((r) => setTimeout(r, 30));
  try {
    const mins = Math.max(1, Math.min(60, Number($<HTMLInputElement>('mins').value) || 10));
    const realEnd = $<HTMLInputElement>('realend').checked;
    const { channels, cues, exact } = p.exportEndless(mins, realEnd);
    const secs = channels[0].length / p.source!.sampleRate;
    $('render-note').textContent = realEnd
      ? exact ? `${fmt(secs)} long, ending on the song's own outro (length snaps to whole bars).` : `Couldn't land exactly on the ending; rendered ${fmt(secs)} with a fade.`
      : `${fmt(secs)} with ${cues.length} seams (marked as cue points).`;
    download(encodeWav(channels, p.source!.sampleRate, { cues }), `${trackName} - ${mins} min endless.wav`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download WAV';
  }
});

// ---- Stems ----------------------------------------------------------------------
const modelUrl = $<HTMLInputElement>('model-url');
modelUrl.value = (() => { try { return localStorage.getItem('stems.modelUrl') || DEFAULT_MODEL_URL; } catch { return DEFAULT_MODEL_URL; } })();
modelUrl.addEventListener('change', () => { try { localStorage.setItem('stems.modelUrl', modelUrl.value); } catch { /* ignore */ } });

async function separate(method: 'dsp' | 'htdemucs') {
  const p = player;
  if (!p?.source) return;
  show('sep-actions', false);
  show('sprog');
  setStemProgress('Starting', 0);
  try {
    await p.separate(method, modelUrl.value || DEFAULT_MODEL_URL);
  } catch (err) {
    show('sprog', false);
    show('sep-actions');
    $('sep-note').textContent = `Separation failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}
$('sep-dsp').addEventListener('click', () => separate('dsp'));
$('sep-ml').addEventListener('click', () => separate('htdemucs'));

const mute: boolean[] = [];
const solo: boolean[] = [];
const vol: number[] = [];

function onStems(backend: string) {
  const p = player!;
  show('sprog', false);
  show('mixer');
  const st = p.stems!;
  $('sep-note').textContent = `${st.method === 'htdemucs' ? 'HTDemucs' : 'Built-in DSP'} stems (${backend})${st.hasVocals ? '' : ' — mono source: vocals could not be isolated'}. Seams re-scored${p.vocalAware && st.hasVocals ? ' to avoid sung passages' : ''}.`;
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
      <button data-k="m" aria-pressed="false" title="Mute">M</button>
      <button data-k="s" aria-pressed="false" title="Solo">S</button>
      <button data-k="l" aria-pressed="false" title="Lock to the selected loop">🔒</button>`;
    const range = row.querySelector('input')!;
    range.addEventListener('input', () => { vol[i] = Number(range.value); pushGains(); });
    row.querySelector<HTMLButtonElement>('[data-k=m]')!.onclick = (e) => { mute[i] = !mute[i]; (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(mute[i])); pushGains(); };
    row.querySelector<HTMLButtonElement>('[data-k=s]')!.onclick = (e) => { solo[i] = !solo[i]; (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(solo[i])); pushGains(); };
    row.querySelector<HTMLButtonElement>('[data-k=l]')!.onclick = (e) => {
      const btn = e.currentTarget as HTMLElement;
      if (p.locked[i]) { p.unlockStem(i); btn.setAttribute('aria-pressed', 'false'); return; }
      const loop = p.currentSettings.loop ?? p.loops[0];
      if (!loop) { $('sep-note').textContent = 'No perfect loop available to lock to.'; return; }
      if (p.lockStem(i, loop)) btn.setAttribute('aria-pressed', 'true');
      else $('sep-note').textContent = 'At least one stem must keep following the song.';
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

// ---- Share links ------------------------------------------------------------------
$('share').addEventListener('click', async () => {
  const p = player;
  if (!p?.analysis) return;
  const s = p.currentSettings;
  const state: ShareState = {
    v: 1,
    h: p.fileHash.slice(0, 16),
    n: trackName.slice(0, 80),
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
  try { await navigator.clipboard.writeText(url); $('share').textContent = 'Link copied'; } catch { $('share').textContent = 'Copy the link'; }
  setTimeout(() => ($('share').textContent = 'Share'), 2500);
});

function applyShare() {
  const p = player, s = pendingShare;
  if (!p?.analysis || !s) return;
  if (s.h && p.fileHash && !p.fileHash.startsWith(s.h)) {
    $('share-banner').textContent = 'This file does not match the shared link (different audio). Shared settings were not applied.';
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
  tab = s.mode;
  syncControls();
  const needsStems = !!(s.gains && Object.values(s.gains).some((g) => g !== 1)) || !!s.locks?.length;
  $('share-banner').textContent = needsStems ? 'Shared settings applied. Separate stems to apply the shared mix too.' : 'Shared settings applied.';
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

// ---- Transport, sleep, media session ---------------------------------------------
function updatePlayButton() {
  const b = $('play');
  const on = !!player?.playing;
  b.textContent = on ? '❚❚' : '▶';
  b.setAttribute('aria-label', on ? 'Pause' : 'Play');
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
}

async function togglePlay() {
  if (!player?.source) return;
  if (player.playing) player.pause(); else await player.play();
  updatePlayButton();
}
$('play').addEventListener('click', togglePlay);
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (e.code === 'Space' && !(t instanceof HTMLInputElement) && !(t instanceof HTMLButtonElement) && !(t instanceof HTMLSelectElement)) {
    e.preventDefault();
    togglePlay();
  }
});

$<HTMLSelectElement>('sleep').addEventListener('change', (e) => player?.setSleep(Number((e.target as HTMLSelectElement).value)));

function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: trackName,
    artist: 'stems · endless',
    artwork: [{ src: new URL('./icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }],
  });
  navigator.mediaSession.setActionHandler('play', () => { void player?.play().then(updatePlayButton); });
  navigator.mediaSession.setActionHandler('pause', () => { player?.pause(); updatePlayButton(); });
  navigator.mediaSession.setActionHandler('stop', () => { player?.pause(); updatePlayButton(); });
}

// ---- File input + drag and drop --------------------------------------------------
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

$('clear-cache').addEventListener('click', async () => {
  await clearCache();
  try { await caches.delete('stems-models-v1'); } catch { /* ignore */ }
  $('clear-cache').textContent = 'Cache cleared';
});

// ---- PWA ---------------------------------------------------------------------------
let installPrompt: (Event & { prompt(): Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e as typeof installPrompt;
  show('install');
});
$('install').addEventListener('click', async () => { await installPrompt?.prompt(); show('install', false); });
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    // Hosts without COOP/COEP headers (GitHub Pages): the service worker adds
    // them, but only to documents it serves, so reload once after it takes control.
    if (!crossOriginIsolated && navigator.serviceWorker.controller) {
      try {
        if (!sessionStorage.getItem('stems.coiReload')) {
          sessionStorage.setItem('stems.coiReload', '1');
          if (!player?.source) location.reload();
        }
      } catch { /* storage blocked: stay non-isolated */ }
    }
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    try {
      if (!crossOriginIsolated && !sessionStorage.getItem('stems.coiReload') && !player?.source) {
        sessionStorage.setItem('stems.coiReload', '1');
        location.reload();
      }
    } catch { /* ignore */ }
  });
}

// ---- Render loop -------------------------------------------------------------------
function frame() {
  const p = player;
  if (p?.source) {
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
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose for automated testing / console tinkering.
(window as unknown as { stems: unknown }).stems = { get player() { return player; } };

// Installed-PWA "Open with stems" for audio files.
type LaunchParams = { files: { getFile(): Promise<File> }[] };
const lq = (window as unknown as { launchQueue?: { setConsumer(cb: (p: LaunchParams) => void): void } }).launchQueue;
lq?.setConsumer(async (params) => {
  const h = params.files[0];
  if (h) load({ file: await h.getFile() });
});

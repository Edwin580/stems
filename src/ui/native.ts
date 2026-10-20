/**
 * The iOS app's native controls (SwiftUI tab bar, play button, mode and
 * sleep pickers) drive the page through this bridge. When the page runs in
 * the app it hides its own copies of those controls and reports their state
 * to the app; the app's taps come back as commands that press the same
 * (hidden) buttons, so all the logic stays in one place.
 */

type Handler = { postMessage(body: string): void };
const handler = (window as Window & { webkit?: { messageHandlers?: { stemsNative?: Handler } } }).webkit?.messageHandlers?.stemsNative;

export const inNativeShell = !!handler;

export type NativeCommand =
  | { type: 'toggle' }
  | { type: 'mode'; value: 'endless' | 'loop' }
  | { type: 'style'; value: 'smooth' | 'jumpy' }
  | { type: 'sleep'; value: string }
  | { type: 'view'; value: 'home' | 'app' }
  | { type: 'barHeight'; value: number };

const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);

export function nativeCommand(c: NativeCommand) {
  switch (c.type) {
    case 'toggle': q<HTMLButtonElement>('#play')?.click(); break;
    case 'mode': q<HTMLButtonElement>(`[data-mode="${c.value}"]`)?.click(); break;
    case 'style': q<HTMLButtonElement>(`[data-style="${c.value}"]`)?.click(); break;
    case 'view': q<HTMLButtonElement>(`#tabbar [data-view="${c.value}"]`)?.click(); break;
    case 'sleep': {
      const s = q<HTMLSelectElement>('#sleep');
      if (s && s.value !== c.value) { s.value = c.value; s.dispatchEvent(new Event('change')); }
      break;
    }
    case 'barHeight': document.documentElement.style.setProperty('--native-bar', `${Math.max(0, c.value)}px`); break;
  }
  // Always answer, so the app's optimistic update is corrected if nothing changed.
  last = '';
  report();
}

function state() {
  const pressed = (attr: string) => q<HTMLElement>(`[${attr}][aria-pressed=true]`)?.getAttribute(attr) ?? '';
  const play = q<HTMLButtonElement>('#play');
  const playerTab = q<HTMLButtonElement>('#tabbar [data-view=app]');
  const sleep = q<HTMLSelectElement>('#sleep');
  return {
    v: 1,
    view: q('#tabbar [aria-current=page]')?.dataset.view ?? 'home',
    hasSong: !!playerTab && !playerTab.disabled,
    canPlay: !!play && !play.disabled,
    playing: play?.getAttribute('aria-label') === 'Pause',
    mode: pressed('data-mode') || 'endless',
    style: pressed('data-style') || 'smooth',
    sleep: sleep?.value ?? '0',
    sleepOptions: sleep ? [...sleep.options].map((o) => ({ value: o.value, label: o.textContent ?? o.value })) : [],
    sleepLeft: q('#sleep-left')?.textContent ?? '',
    title: q('#track')?.textContent || q('#tab-player')?.textContent || '',
    artist: q('#artist')?.textContent ?? '',
  };
}

let last = '';
function report() {
  if (!handler) return;
  const s = JSON.stringify(state());
  if (s === last) return;
  last = s;
  handler.postMessage(s);
}

if (handler) {
  document.documentElement.classList.add('native-shell');
  // The state is read off the page's own controls, so a cheap poll catches
  // every change wherever it comes from (taps, the lock screen, the sleep timer).
  setInterval(report, 250);
  report();
}

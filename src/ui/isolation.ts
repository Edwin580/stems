/**
 * Cross-origin isolation (COOP/COEP) is opt-in ("multi-threaded mode").
 *
 * It unlocks SharedArrayBuffer (zero-copy audio between page, worklet and
 * workers) and multi-threaded WASM for HTDemucs on CPU, but it also blocks
 * third-party content that doesn't opt in, and on static hosts it needs a
 * service-worker reload. So it is off by default.
 *
 * Static hosts (GitHub Pages) can't send the headers, so the service worker
 * adds them, but only while this marker exists in Cache Storage. The service
 * worker reads the same marker.
 */
const CACHE = 'stems-coi';
const markerUrl = () => new URL('./__coi-on', location.href).href;
// (Distinct from the key older builds used, so their guard can't block the fix-up reload.)
const RELOAD_KEY = 'stems.coiSync';

export async function isolationWanted(): Promise<boolean> {
  try {
    return !!(await (await caches.open(CACHE)).match(markerUrl()));
  } catch {
    return false;
  }
}

/** Turn multi-threaded mode on or off; reloads the page so the new headers apply. */
export async function setIsolation(on: boolean): Promise<void> {
  try {
    const c = await caches.open(CACHE);
    if (on) await c.put(markerUrl(), new Response('1'));
    else await c.delete(markerUrl());
    sessionStorage.removeItem(RELOAD_KEY);
  } catch { /* storage blocked: nothing to toggle */ }
  location.reload();
}

/**
 * After the service worker controls the page: if this document's isolation
 * doesn't match the user's choice, reload once so the worker serves it the
 * right way. Bounded so it can never loop.
 */
export async function ensureIsolationState(canReload: () => boolean): Promise<void> {
  if (!navigator.serviceWorker?.controller) return;
  // If a newer worker is on its way, decide once it has taken control
  // (controllerchange calls us again); reloading now would be served by the old one.
  const reg = await navigator.serviceWorker.getRegistration();
  try { await reg?.update(); } catch { /* offline: decide with what we have */ }
  if (reg?.installing || reg?.waiting) return;
  // Mismatch either way: wanted but not isolated (first visit, just enabled), or
  // isolated but not wanted (served by an older worker that always isolated).
  if (crossOriginIsolated === (await isolationWanted())) return;
  // Up to two fix-up reloads per session: right after an upgrade the first one
  // can still be served by the previous worker before the new one takes over.
  try {
    const n = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (n >= 2 || !canReload()) return;
    sessionStorage.setItem(RELOAD_KEY, String(n + 1));
  } catch {
    return;
  }
  location.reload();
}

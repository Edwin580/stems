// stems service worker.
//
// 1. Offline app shell: network-first for navigations, cache-first for built
//    assets (hashed filenames never change). Models are cached separately by
//    the separation worker; audio never touches this cache.
// 2. Opt-in cross-origin isolation ("multi-threaded mode") on static hosts that
//    can't set headers (GitHub Pages): while the page has stored the marker
//    below, same-origin responses get COOP/COEP/CORP headers, unlocking
//    SharedArrayBuffer and multi-threaded WASM. It's opt-in because it blocks
//    third-party players (YouTube, Spotify). See src/ui/isolation.ts.
const CACHE = 'stems-shell-v3';
const SCOPE = new URL(self.registration.scope);
const COI_CACHE = 'stems-coi';
const COI_MARKER = new URL('./__coi-on', SCOPE).href;
let coiOn = false;
const refreshCoi = () => caches.open(COI_CACHE).then((c) => c.match(COI_MARKER)).then((r) => { coiOn = !!r; }).catch(() => { coiOn = false; });
refreshCoi();

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('stems-shell-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

/** Copy a response, adding cross-origin isolation headers. */
function isolate(res) {
  if (!coiOn || !res || res.status === 0 || res.type === 'opaqueredirect') return res;
  const headers = new Headers(res.headers);
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // A production worker at the site root must not serve PR previews (and vice versa).
  const rel = url.pathname.slice(SCOPE.pathname.length);
  if (!url.pathname.startsWith(SCOPE.pathname) || rel.startsWith('previews/')) return;
  if (req.mode === 'navigate') {
    // Re-read the opt-in marker on every navigation (the toggle reloads the page).
    e.respondWith(refreshCoi().then(() => fetch(req)).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return isolate(res);
    }).catch(() => caches.match(req).then((r) => isolate(r)).then((r) => r || caches.match('./index.html').then(isolate))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && url.pathname.includes('/assets/')) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  })).then(isolate));
});

/**
 * Minimal Anubis (Techaro) proof-of-work solver.
 *
 * Some public Invidious instances sit behind Anubis, which gates every
 * request behind a SHA-256 proof-of-work challenge — a browser solves it
 * with JavaScript and gets an auth cookie. A server-side relay has no
 * browser, so it solves the same puzzle itself (that is the mechanism
 * working as designed: prove work, get cookie). Difficulty 4 costs a few
 * hundred milliseconds.
 */

import { createHash } from 'node:crypto';

const PASSPORT = new Map(); // origin -> { cookie, expiresAt }

/** Parse the challenge JSON embedded in an Anubis interstitial page. */
export function parseAnubisChallenge(html) {
  const script = html.match(/<script id="anubis_challenge"[^>]*>(\{.*?\})<\/script>/s);
  if (script) {
    try {
      const parsed = JSON.parse(script[1]);
      if (parsed?.challenge?.randomData && parsed?.challenge?.id) {
        return { randomData: parsed.challenge.randomData, id: parsed.challenge.id, difficulty: parsed?.rules?.difficulty ?? 4 };
      }
    } catch { /* fall through to regex scrape */ }
  }
  const randomData = html.match(/"randomData":"([0-9a-f]+)"/)?.[1];
  const id = html.match(/"id":"([0-9a-f-]{36})"/)?.[1];
  const difficulty = Number(html.match(/"difficulty":(\d+)/)?.[1] ?? 4);
  return randomData && id ? { randomData, id, difficulty } : null;
}

/** Solve the proof of work: sha256(randomData + nonce) with N leading zero nibbles. */
export function solveAnubis(challenge, maxTries = 5_000_000) {
  const target = '0'.repeat(challenge.difficulty);
  for (let nonce = 0; nonce < maxTries; nonce++) {
    const hash = createHash('sha256').update(challenge.randomData + String(nonce)).digest('hex');
    if (hash.startsWith(target)) return { nonce, hash };
  }
  throw new Error('Anubis challenge did not solve within the attempt budget.');
}

/**
 * Fetch `url`; if an Anubis interstitial answers, solve it, collect the
 * auth cookie, and retry the original request with it. Cookies are cached
 * per origin for a few minutes. Returns the final Response.
 */
export async function fetchWithAnubis(url, init = {}, fetchFn = fetch) {
  const origin = new URL(url).origin;
  const headers = new Headers(init.headers || {});
  const cached = PASSPORT.get(origin);
  if (cached && cached.expiresAt > Date.now()) headers.set('Cookie', cached.cookie);
  let res = await fetchFn(url, { ...init, headers });
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return res;
  const html = await res.text();
  if (!/anubis|Making sure you're not a bot/i.test(html)) {
    // Not an interstitial — hand back an equivalent response with the body.
    return new Response(html, { status: res.status, headers: res.headers });
  }
  const challenge = parseAnubisChallenge(html);
  if (!challenge) throw new Error('Anubis challenge could not be parsed.');
  const started = Date.now();
  const { nonce, hash } = solveAnubis(challenge);
  const passUrl = `${origin}/.within.website/x/cmd/anubis/api/pass-challenge?id=${challenge.id}&response=${hash}&nonce=${nonce}&redir=${encodeURIComponent(new URL(url).pathname)}&elapsedTime=${Date.now() - started}`;
  const passRes = await fetchFn(passUrl, { headers: { 'User-Agent': headers.get('User-Agent') || '' }, redirect: 'manual' });
  const setCookies = typeof passRes.headers.getSetCookie === 'function' ? passRes.headers.getSetCookie() : [passRes.headers.get('set-cookie')].filter(Boolean);
  const cookie = setCookies.map((c) => c.split(';')[0]).filter((c) => c.includes('anubis-auth')).join('; ');
  if (!cookie) throw new Error('Anubis pass did not return an auth cookie.');
  PASSPORT.set(origin, { cookie, expiresAt: Date.now() + 10 * 60 * 1000 });
  headers.set('Cookie', cookie);
  res = await fetchFn(url, { ...init, headers });
  return res;
}

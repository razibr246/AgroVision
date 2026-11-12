// The Gemini keys, used one after another. GEMINI_API_KEYS (comma-separated, in priority order) plus GEMINI_API_KEY;
// each key is its own Google project with its own quota per model. Server-side only: keys never reach the browser.
// The underscore keeps Vercel from serving this file as a function.
//
//   poolCall(scope, attempt, { hedgeMs, timeoutMs }) -> { ok, value, key, index } | { ok: false, status, error }
//     attempt(key, index, signal) must resolve { status, value?, body? }: status 200 is success; 429 / 5xx / timeouts
//     move on to the next key. A key that is out of quota for `scope` (a model) is skipped until its quota is back.
//
// Speed: when the first key has not answered within `hedgeMs`, the next key starts too and the first good answer wins;
// the slower request is aborted. Only two run at once, so a busy moment never fans out over every key.
// Note on terms: rotating keys is for reliability. Google's Gemini API terms limit use of the free tier; a paid key
// (or several paid projects) is the supported way to more quota.

// Remembered by the key itself (in this server's memory only), so reordering the keys never mixes up their rest.
const cool = new Map(); // `${key}|${scope}` -> time the key may be tried again
const fails = new Map(); // `${key}|${scope}` -> consecutive failures (the circuit breaker)
const MINUTE = 60_000, HOUR = 3_600_000;

export function geminiKeys(env = process.env) {
  const list = [...String(env.GEMINI_API_KEYS ?? '').split(','), env.GEMINI_API_KEY ?? ''].map((k) => k.trim()).filter((k) => /^[\w.-]{1,200}$/.test(k));
  return [...new Set(list)];
}

// How long a refused key rests: Google's 429 says whether the per-minute or the per-day limit was hit.
export function restFor(status, body = '') {
  const b = String(body);
  if (status === 429) return /per\s*day|daily|PerDay/i.test(b) ? 6 * HOUR : /per\s*minute|PerMinute/i.test(b) ? MINUTE + 5_000 : /limit:\s*0\b/.test(b) ? 24 * HOUR : 10 * MINUTE;
  if (status === 401 || status === 403) return 24 * HOUR; // a dead or unauthorised key
  if (status === 402) return 24 * HOUR; // no credits
  return 0;
}

export function markRest(key, scope, ms, now = Date.now()) {
  if (ms > 0) cool.set(`${key}|${scope}`, now + ms);
}
const resting = (key, scope, now) => (cool.get(`${key}|${scope}`) ?? 0) > now;
export function available(keys, scope, now = Date.now()) {
  return keys.map((key, index) => ({ key, index })).filter(({ key }) => !resting(key, scope, now));
}
export function resetPool() { cool.clear(); fails.clear(); }

function failed(key, scope) {
  const k = `${key}|${scope}`;
  const n = (fails.get(k) ?? 0) + 1;
  fails.set(k, n);
  if (n >= 3) { markRest(key, scope, 5 * MINUTE); fails.set(k, 0); } // three failures in a row: rest it a while
}

export async function poolCall(scope, attempt, { keys = geminiKeys(), hedgeMs = 0, timeoutMs = 25_000 } = {}) {
  const queue = available(keys, scope);
  if (!keys.length) return { ok: false, status: 503, error: 'no key' };
  if (!queue.length) return { ok: false, status: 429, error: 'every key is resting' };
  let last = { ok: false, status: 502, error: 'unreachable' };
  const running = new Set();
  const start = ({ key, index }) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs);
    const p = Promise.resolve().then(() => attempt(key, index, ctl.signal))
      .then((r) => ({ r, key, index }), (e) => ({ r: { status: e?.name === 'TimeoutError' || ctl.signal.aborted ? 504 : 502, error: String(e?.message ?? e) }, key, index }))
      .finally(() => clearTimeout(timer));
    const entry = { p, ctl };
    running.add(entry);
    return entry;
  };
  const settle = (entry, { r, key, index }) => {
    running.delete(entry);
    if (r.status === 200) { fails.set(`${key}|${scope}`, 0); return { ok: true, value: r.value, key, index }; }
    const rest = r.restMs ?? restFor(r.status, r.body ?? r.error); // a provider may say how long to rest
    if (rest) markRest(key, scope, rest); else failed(key, scope);
    last = { ok: false, status: r.status, error: r.error ?? `status ${r.status}` };
    // A request the provider rejects as malformed fails the same on every key: stop rather than spend them all.
    if (r.status === 400) return { stop: true };
    return null;
  };
  let next = 0;
  while (next < queue.length || running.size) {
    if (!running.size) start(queue[next++]);
    const race = [...running].map((e) => e.p.then((x) => ({ e, x })));
    const hedge = hedgeMs && next < queue.length && running.size < 2 ? new Promise((res) => setTimeout(() => res({ hedge: true }), hedgeMs)) : null;
    const won = await Promise.race(hedge ? [...race, hedge] : race);
    if (won.hedge) { start(queue[next++]); continue; } // slow: start the next key alongside
    const out = settle(won.e, won.x);
    if (out?.ok) { for (const e of running) e.ctl.abort(); running.clear(); return out; }
    if (out?.stop) { for (const e of running) e.ctl.abort(); running.clear(); return last; }
  }
  return last;
}

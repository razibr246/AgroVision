import test from 'node:test';
import assert from 'node:assert/strict';
import { poolCall, geminiKeys, restFor, resetPool, available } from './_keypool.js';

const keys = ['key-aaaaaaaaaaaaaaaaaaaa1', 'key-bbbbbbbbbbbbbbbbbbbb2', 'key-cccccccccccccccccccc3'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('keys come from GEMINI_API_KEYS then GEMINI_API_KEY, in order, without repeats or junk', () => {
  assert.deepEqual(geminiKeys({ GEMINI_API_KEYS: `${keys[1]}, ${keys[0]},bad key`, GEMINI_API_KEY: keys[1] }), [keys[1], keys[0]]);
  assert.deepEqual(geminiKeys({}), []);
});

test('a key out of its daily quota is skipped for that model, and the next key answers', async () => {
  resetPool();
  const seen = [];
  const r = await poolCall('m1', async (k, i) => { seen.push(i); return i === 0 ? { status: 429, body: 'Quota exceeded: limit 10 requests per day' } : { status: 200, value: `from ${i}` }; }, { keys });
  assert.deepEqual([r.ok, r.value, r.index], [true, 'from 1', 1]);
  assert.deepEqual(seen, [0, 1]);
  assert.deepEqual(available(keys, 'm1').map((x) => x.index), [1, 2]); // key 0 rests for m1…
  assert.deepEqual(available(keys, 'm2').map((x) => x.index), [0, 1, 2]); // …but not for another model
});

test('per-minute and per-day limits rest for different times', () => {
  assert.ok(restFor(429, 'limit: 3 requests per minute') < 2 * 60_000);
  assert.ok(restFor(429, 'limit: 10 requests per day') >= 6 * 3_600_000);
  assert.equal(restFor(500, 'boom'), 0);
});

test('a slow key gets company: the second starts after hedgeMs and the first good answer wins', async () => {
  resetPool();
  const r = await poolCall('m3', async (k, i, signal) => { if (i === 0) { await wait(400); return signal.aborted ? { status: 504 } : { status: 200, value: 'slow' }; } await wait(20); return { status: 200, value: 'fast' }; }, { keys, hedgeMs: 50 });
  assert.equal(r.value, 'fast'); // without the second key starting, the slow first one would have answered
  assert.equal(r.index, 1);
});

test('a malformed request stops at once instead of spending every key; all resting says so', async () => {
  resetPool();
  let n = 0;
  const r = await poolCall('m4', async () => { n++; return { status: 400, error: 'bad request' }; }, { keys });
  assert.equal(r.status, 400);
  assert.equal(n, 1);
  resetPool();
  await poolCall('m5', async () => ({ status: 429, body: 'per day' }), { keys });
  const again = await poolCall('m5', async () => ({ status: 200, value: 'x' }), { keys });
  assert.deepEqual([again.ok, again.status], [false, 429]);
  assert.equal((await poolCall('m6', async () => ({ status: 200 }), { keys: [] })).status, 503);
});

test('three failures in a row rest a key (the circuit breaker); a timeout moves on', async () => {
  resetPool();
  for (let i = 0; i < 3; i++) await poolCall('m7', async (k, idx) => (idx === 0 ? { status: 503 } : { status: 200, value: 'ok' }), { keys });
  assert.ok(!available(keys, 'm7').some((x) => x.index === 0));
  resetPool();
  const r = await poolCall('m8', async (k, i, signal) => { if (i === 0) { await new Promise((res) => signal.addEventListener('abort', res)); throw signal.reason; } return { status: 200, value: 'next' }; }, { keys, timeoutMs: 50 });
  assert.equal(r.value, 'next');
});

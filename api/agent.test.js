// api/agent.js with Gemini stubbed: an answer that fails the app's checks is asked for again, and one that still
// fails is repaired before it is sent (src/engine/replyCheck.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './agent.js';

function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

// A Gemini streamed answer carrying this JSON.
const sse = (out) => new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }], modelVersion: 'stub' })}\n\n`, { status: 200 });

async function withGemini(answers, run) {
  const saved = { key: process.env.GEMINI_API_KEY, fetch: globalThis.fetch };
  process.env.GEMINI_API_KEY = 'test';
  const sent = [];
  globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return sse(answers[Math.min(sent.length - 1, answers.length - 1)]); };
  try { return await run(sent); } finally {
    if (saved.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = saved.key;
    globalThis.fetch = saved.fetch;
  }
}

const data = {
  prov: { climate: 'REAL', soil: 'REAL' },
  today: { water: { color: 'GREEN', reasons: [{ bn: 'আগামী ৩ দিনে ১২ মিমি বৃষ্টির পূর্বাভাস', en: '12 mm of rain forecast in the next 3 days' }] }, weather: { rainNext3: 12, rain7: 2, tmax: 30, live: true } },
  requests: [{ id: 'R-1' }],
};
const ask = (res) => handler({ method: 'POST', headers: {}, body: { role: 'farmer', lang: 'bn', message: 'আজ কি সেচ দেব?', data } }, res);

test('a good first answer goes out as it is, checked once', () => withGemini([{ reply: 'আজ সেচ দেবেন না, আগামী ৩ দিনে ১২ মিমি বৃষ্টি আসছে।', proposals: [] }], async (sent) => {
  const res = response();
  await ask(res);
  assert.equal(res.statusCode, 200);
  assert.equal(sent.length, 1);
  assert.equal(res.body.check.ok, true);
  assert.equal(res.body.check.attempts, 1);
  assert.equal(res.body.check.ceiling, 1);
}));

test('a failed answer is asked for again with the rule ids, and the second one is used', () => withGemini([
  { reply: 'আজই সেচ দিন, মাটিতে ৪০ মিমি ঘাটতি।', proposals: [] },
  { reply: 'আজ সেচ দেবেন না, আগামী ৩ দিনে ১২ মিমি বৃষ্টি আসছে।', proposals: [] },
], async (sent) => {
  const res = response();
  await ask(res);
  assert.equal(sent.length, 2);
  const note = sent[1].contents.at(-1).parts[0].text;
  assert.match(note, /\[R1_RAIN_OFFSET\]/);
  assert.match(note, /\[G1_UNGROUNDED_NUMBER\]/);
  assert.equal(res.body.reply, 'আজ সেচ দেবেন না, আগামী ৩ দিনে ১২ মিমি বৃষ্টি আসছে।');
  assert.equal(res.body.check.ok, true);
  assert.equal(res.body.check.attempts, 2);
}));

test('an answer that fails twice is repaired, and a proposal pointing nowhere is dropped', () => withGemini([
  { reply: 'প্রতি লিটার পানিতে ২ মিলি মিশিয়ে স্প্রে করুন।', proposals: [{ action: 'follow_up', text: '', target: 'R-404' }] },
], async (sent) => {
  const res = response();
  await ask(res);
  assert.equal(sent.length, 2);
  assert.equal(res.body.check.ok, false);
  assert.equal(res.body.check.repaired, true);
  assert.doesNotMatch(res.body.reply, /মিলি/);
  assert.match(res.body.reply, /কৃষি অফিসারকে/);
  assert.deepEqual(res.body.proposals, []);
}));

test('foreign Chakra uses country-only instructions, no web search, and navigation proposals only', () => withGemini([
  { reply: 'The available sample field and soil records are ready to review.', proposals: [
    { action: 'navigate', text: '', target: '/abroad/spain/future' },
    { action: 'report_problem', text: 'Send this', target: '' },
    { action: 'navigate', text: '', target: '/abroad/brazil/future' },
  ] },
], async (sent) => {
  const res = response();
  await handler({ method: 'POST', headers: {}, body: { role: 'farmer', lang: 'en', message: 'What does the field record show?', data: { place_context: { kind: 'abroad', country: 'spain', field: { area: 2 }, soil: { source: 'ISRIC SoilGrids model estimate' } } } } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(sent.length, 1);
  const request = sent[0];
  assert.match(request.systemInstruction.parts[0].text, /Never apply Bangladesh/);
  assert.doesNotMatch(request.systemInstruction.parts[0].text, /DAE|Bangladeshi/i);
  assert.doesNotMatch(JSON.stringify(request.tools || []), /googleSearch/);
  assert.deepEqual(res.body.proposals.map((p) => p.target), ['/abroad/spain/future']);
  assert.ok(res.body.check.problems.some((p) => p.id === 'P2_ABROAD_ACTION'));
}));

test('a slow Gemini gets Meta alongside: the first good answer wins, and a failed one hands over at once', async () => {
  const { firstGood } = await import('./agent.js');
  const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
  const t0 = Date.now();
  const r1 = await firstGood(() => wait(400, { reply: 'gemini' }), () => wait(10, { reply: 'meta' }), 30);
  assert.equal(r1.reply, 'meta');
  assert.ok(Date.now() - t0 < 300);
  const r2 = await firstGood(() => wait(5, { error: 'down', status: 502 }), () => wait(5, { reply: 'meta' }), 10_000);
  assert.equal(r2.reply, 'meta'); // Gemini failed: Meta did not wait for the 10 s mark
  const r3 = await firstGood(() => wait(5, { error: 'a', status: 429 }), () => wait(5, { error: 'b', status: 402 }), 10);
  assert.equal(r3.error, 'b');
  const r4 = await firstGood(() => wait(5, { reply: 'fast gemini' }), () => { throw new Error('must not start'); }, 200);
  assert.equal(r4.reply, 'fast gemini');
  assert.equal((await firstGood(() => wait(5, { error: 'x', status: 502 }), null, 10)).error, 'x');
});

test('Meta answers through the agent when Gemini is down, and its billing refusal rests the key', async () => {
  const { resetPool } = await import('./_keypool.js');
  resetPool();
  const saved = { g: process.env.GEMINI_API_KEY, gs: process.env.GEMINI_API_KEYS, m: process.env.META_API_KEYS, h: process.env.AGENT_PROVIDER_HEDGE_MS, f: globalThis.fetch };
  process.env.GEMINI_API_KEY = 'gem-key'; delete process.env.GEMINI_API_KEYS; process.env.META_API_KEYS = 'LLM_meta_one,LLM_meta_two'; process.env.AGENT_PROVIDER_HEDGE_MS = '20';
  const metaCalls = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('api.meta.ai')) {
      const key = init.headers.authorization.slice(7);
      metaCalls.push(key);
      if (key === 'LLM_meta_one') return new Response('{"error":{"code":"billing_not_configured"}}', { status: 402 });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ reply: 'মেটা থেকে উত্তর: আজ সেচ দেবেন না।', proposals: [] }) } }] }), { status: 200 });
    }
    return new Response('{"error":{"message":"overloaded"}}', { status: 503 });
  };
  try {
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { role: 'farmer', lang: 'bn', message: 'আজ কি সেচ দেব?', data } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.provider, 'meta');
    assert.match(res.body.reply, /মেটা থেকে উত্তর/);
    assert.deepEqual(metaCalls.slice(0, 2), ['LLM_meta_one', 'LLM_meta_two']); // the key without billing rests, the next answers
  } finally {
    for (const [k, v] of [['GEMINI_API_KEY', saved.g], ['GEMINI_API_KEYS', saved.gs], ['META_API_KEYS', saved.m], ['AGENT_PROVIDER_HEDGE_MS', saved.h]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    globalThis.fetch = saved.f;
    resetPool();
  }
});

test('an English app never gets a Bangla answer: it is asked for again in English, and a second Bangla answer is not sent', async () => {
  const { resetPool } = await import('./_keypool.js');
  resetPool();
  const askEn = (res) => handler({ method: 'POST', headers: {}, body: { role: 'farmer', lang: 'en', message: 'Harvest date?', data } }, res);
  await withGemini([{ reply: 'আপনার টমেটো তোলার সময় ফেব্রুয়ারি থেকে মার্চ।', proposals: [] }, { reply: 'Your tomato harvest runs from February to March.', proposals: [] }], async (sent) => {
    const res = response();
    await askEn(res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.reply, 'Your tomato harvest runs from February to March.');
    assert.equal(res.body.check.attempts, 2);
    assert.match(sent[0].contents.at(-1).parts[0].text, /Reply only in English\. Do not write any Bangla/); // said last, after the data
    assert.match(sent[1].contents.at(-1).parts[0].text, /R7_LANGUAGE/);
  });
  resetPool();
  await withGemini([{ reply: 'আপনার টমেটো তোলার সময় ফেব্রুয়ারি থেকে মার্চ।', proposals: [] }], async () => {
    const res = response();
    await askEn(res);
    assert.equal(res.statusCode, 502); // the browser then answers from the app's own engine, in English
    assert.equal(res.body.error, 'wrong language');
  });
  resetPool();
  await withGemini([{ reply: 'Your harvest is in February, so plan the drying space now.', proposals: [] }], async () => {
    const res = response();
    await ask(res); // the Bangla app
    assert.equal(res.statusCode, 502);
  });
});

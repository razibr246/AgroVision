import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyProblem, problemTask, farmerTasks, officerTasks, gateFor, authorize, appendAudit, verifyAudit, sanitize, autoCountToday, nextAutoVerdict, dismissAllVerdicts, minimizeVerdictWindow, restoreVerdictWindow, verdictQueueNav } from './chakra.js';

const DAY = 86400000;
const today = Date.UTC(2026, 9, 30);
const farmer = { id: 'RAHIM', union: 'Deopara', village: 'Amtoli', villageBn: 'আমতলী', lat: 24.4, lon: 88.4, name: { bn: 'রহিম', en: 'Rahim' } };

test('classifyProblem reads the crop, the pest and the urgency from Bangla words', () => {
  assert.deepEqual(classifyProblem('ধানে কারেন্ট পোকা, পুরো জমি পুড়ে যাচ্ছে', 'boro'), { crop: 'aman', symptom: 'bph', urgent: true });
  assert.equal(classifyProblem('জমিতে পোকা লেগেছে', 'mustard').symptom, 'aphid');
  assert.equal(classifyProblem('টমেটো পাতায় দাগ', 'aman').crop, 'tomato');
  assert.equal(classifyProblem('আজ আবহাওয়া কেমন?', 'aman').symptom, null);
});

test('a reported problem becomes the farmer’s own request without a fabricated diagnosis score', () => {
  const t = problemTask('ধানে কারেন্ট পোকা জরুরি', { farmer, cropNow: 'aman', today, now: today, weather: { rain7: 4, tmax: 31 } });
  const req = t.effects[0].req;
  assert.equal(req.farmerId, 'RAHIM');
  assert.equal(req.priority, 'High');
  assert.equal(req.symptom, 'bph');
  assert.equal(req.ai, null);
  assert.deepEqual(t.tags, ['RULE']);
  assert.match(t.why.en, /no photo was analyzed/);
  assert.equal(problemTask('কেমন আছেন', { farmer, cropNow: 'aman', today, now: today }), null);
});

test('farmer tasks: dry field, an unanswered request and the harvest market', () => {
  const tasks = farmerTasks({
    farmer, today, officer: { bn: 'করিম', en: 'Karim' }, water: { color: 'RED', reasons: [{ bn: 'শুকনো', en: 'dry' }] },
    requests: [{ id: 'R1', status: 'open', created: today - 4 * DAY }, { id: 'R2', status: 'open', created: today - DAY }],
    harvest: { daysTo: 10, glut: 'High', hold: { gain: 0.12 }, crop: { id: 'boro', bn: 'বোরো', en: 'Boro' } },
  });
  assert.deepEqual(tasks.map((t) => t.kind), ['water', 'market', 'followUp']);
});

test('gates: the officer always decides what goes out; the farmer’s agent acts alone only in agent mode', () => {
  const reply = { effects: [{ type: 'addAdvisory' }, { type: 'updateRequest' }] };
  assert.equal(gateFor('officer', 'agent', reply), 'verdict');
  assert.equal(gateFor('officer', 'manual', reply), 'verdict');
  const report = { effects: [{ type: 'addRequest' }] };
  assert.equal(gateFor('farmer', 'agent', report), 'auto');
  assert.equal(gateFor('farmer', 'manual', report), 'confirm');
  assert.equal(gateFor('farmer', 'manual', { effects: [{ type: 'notify' }] }), 'auto');
});

test('authorize refuses effects outside the role or the person’s own scope', () => {
  assert.equal(authorize('farmer', { type: 'addAdvisory', adv: {} }, { farmerId: 'RAHIM' }).ok, false);
  assert.equal(authorize('farmer', { type: 'addRequest', req: { farmerId: 'KARIM', text: { bn: 'x' } } }, { farmerId: 'RAHIM' }).ok, false);
  assert.equal(authorize('farmer', { type: 'addRequest', req: { farmerId: 'RAHIM', union: 'Deopara', text: { bn: 'পোকা', en: 'পোকা' } } }, { farmerId: 'RAHIM', union: 'Deopara' }).ok, true);
  assert.equal(authorize('farmer', { type: 'addRequest', req: { farmerId: 'RAHIM', union: 'Kulla', text: { bn: 'পোকা', en: 'পোকা' } } }, { farmerId: 'RAHIM', union: 'Deopara' }).ok, false);
  const requestOf = (id) => id === 'R1' ? { farmerId: 'RAHIM', union: 'Deopara' } : null;
  assert.equal(authorize('farmer', { type: 'followUp', esc: { request: 'R1', union: 'Deopara' } }, { farmerId: 'RAHIM', requestOf }).ok, true);
  assert.equal(authorize('farmer', { type: 'followUp', esc: { request: 'R9', union: 'Kulla' } }, { farmerId: 'RAHIM', requestOf }).ok, false);
  const scope = { unions: ['Deopara'], unionOf: (id) => (id === 'R1' ? 'Deopara' : 'Kulla') };
  assert.equal(authorize('officer', { type: 'updateRequest', ids: ['R1'] }, scope).ok, true);
  assert.equal(authorize('officer', { type: 'updateRequest', ids: ['R1', 'R9'] }, scope).ok, false);
  assert.equal(authorize('officer', { type: 'addRequest', req: {} }, scope).ok, false);
  const advisoryScope = { ...scope, farmerUnionOf: (id) => (id === 'RAHIM' ? 'Deopara' : 'Kulla') };
  assert.equal(authorize('officer', { type: 'addAdvisory', adv: { text: 'খবর দেখে উত্তর দিন', to: ['RAHIM'] } }, advisoryScope).ok, true);
  assert.equal(authorize('officer', { type: 'addAdvisory', adv: { text: 'খবর', to: ['RAHIM', 'OTHER'] } }, advisoryScope).ok, false);
  assert.equal(authorize('officer', { type: 'addAdvisory', adv: { text: 'খবর', to: ['RAHIM'] } }, scope).ok, false);
});

test('officer tasks draft replies for open requests in the upazila only', () => {
  const requests = [
    { id: 'A', status: 'open', union: 'Deopara', farmerId: 'RAHIM', crop: 'aman', symptom: 'bph', priority: 'High', created: today - 3 * DAY, text: { bn: 'পোকা' } },
    { id: 'B', status: 'open', union: 'Kulla', farmerId: 'X', crop: 'aman', symptom: 'blast', priority: 'High', created: today, text: { bn: '' } },
  ];
  const tasks = officerTasks({ unions: ['Deopara'], today, requests, hotspots: [], replyFn: () => ({ bn: 'উত্তর', en: 'reply' }), farmerName: () => farmer.name });
  assert.deepEqual(tasks.map((t) => t.kind), ['reply', 'escalate']);
  assert.deepEqual(tasks[0].effects[0].adv.to, ['RAHIM']);
});

test('officer hotspot actions include only reports and farmers in the officer’s upazila', () => {
  const hotspot = {
    id: 'nearby', sent: false, draft: { bn: 'খবর এসেছে', en: 'Reports came in' },
    members: [
      { id: 'R1', farmerId: 'RAHIM', union: 'Deopara' },
      { id: 'R2', farmerId: 'KARIM', union: 'Deopara' },
      { id: 'R3', farmerId: 'OUTSIDE', union: 'Kulla' },
    ],
  };
  const [task] = officerTasks({ unions: ['Deopara'], today, requests: [], hotspots: [hotspot] });
  assert.equal(task.kind, 'area');
  assert.deepEqual(task.effects[0].adv.to, ['RAHIM', 'KARIM']);
  assert.equal(task.effects[0].adv.text, 'Reports came in');
  assert.deepEqual(task.effects[1].ids, ['R1', 'R2']);

  const [bnTask] = officerTasks({ unions: ['Deopara'], today, requests: [], hotspots: [hotspot], lang: 'bn' });
  assert.equal(bnTask.effects[0].adv.text, 'খবর এসেছে');
});

test('the audit log is hash-chained: editing or removing an entry is detected', () => {
  let log = [];
  for (const action of ['addRequest', 'notify', 'followUp']) log = appendAudit(log, { at: today, role: 'farmer', who: 'RAHIM', task: 't', action, gate: 'auto', result: 'done' });
  assert.deepEqual(verifyAudit(log), { ok: true, n: 3 });
  assert.equal(verifyAudit(log.map((e, i) => (i === 1 ? { ...e, action: 'addAdvisory' } : e))).ok, false);
  assert.equal(verifyAudit([log[0], log[2]]).ok, false);
  assert.equal(autoCountToday(log, 'farmer', today), 2);
});

test('sanitize strips control and bidi characters and caps the length', () => {
  assert.equal(sanitize('a\u0000b‮c  d'), 'abc d');
  assert.equal(sanitize('x'.repeat(900)).length, 600);
});

test('verdict window helpers close all auto-popups on red dismiss and support minimize/restore', () => {
  const queue = [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }];
  assert.equal(nextAutoVerdict(queue, { mode: 'agent' })?.id, 'v1');
  assert.equal(nextAutoVerdict(queue, { mode: 'manual' }), null);
  assert.equal(nextAutoVerdict(queue, { mode: 'agent', panelOpen: true }), null);

  // Red button snoozes the entire remaining queue at once instead of popping up v2..v18.
  const closed = dismissAllVerdicts(new Set(), 'v1');
  assert.equal(closed.snoozedAll, true);
  assert.equal(closed.minimized, false);
  assert.equal(closed.verdict, null);
  assert.equal(closed.later.has('v1'), true);
  assert.equal(nextAutoVerdict(queue, { mode: 'agent', ...closed }), null);

  // Yellow minimizes without clearing handled state; restore brings back the queue/selected verdict.
  assert.deepEqual(minimizeVerdictWindow(), { minimized: true });
  assert.equal(nextAutoVerdict(queue, { mode: 'agent', minimized: true }), null);
  const restored = restoreVerdictWindow(queue[1]);
  assert.deepEqual(restored, { minimized: false, snoozedAll: false, verdict: queue[1] });
  assert.equal(nextAutoVerdict(queue, { mode: 'agent', later: closed.later, ...restored })?.id, 'v2');
});

test('verdictQueueNav reports current index, left/right remaining counts and adjacent items', () => {
  assert.deepEqual(verdictQueueNav([], 'v1'), {
    total: 0, index: -1, position: 0, left: 0, right: 0, prev: null, next: null,
  });
  const q = [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }, { id: 'v4' }];
  const start = verdictQueueNav(q, 'v1');
  assert.equal(start.position, 1);
  assert.equal(start.left, 0);
  assert.equal(start.right, 3);
  assert.equal(start.prev, null);
  assert.equal(start.next?.id, 'v2');

  const mid = verdictQueueNav(q, 'v3');
  assert.equal(mid.position, 3);
  assert.equal(mid.left, 2);
  assert.equal(mid.right, 1);
  assert.equal(mid.prev?.id, 'v2');
  assert.equal(mid.next?.id, 'v4');

  const end = verdictQueueNav(q, 'v4');
  assert.equal(end.position, 4);
  assert.equal(end.left, 3);
  assert.equal(end.right, 0);
  assert.equal(end.prev?.id, 'v3');
  assert.equal(end.next, null);

  // Unknown id falls back cleanly to the first waiting draft.
  assert.equal(verdictQueueNav(q, 'missing').position, 1);
});

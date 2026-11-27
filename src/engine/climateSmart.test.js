// Climate-smart additions: the 14-day irrigation planner, and the heat watch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planIrrigation, topdressDays, COST } from './irrigationPlan.js';
import { heatWatch } from './heatWatch.js';
import { RABI_CROPS } from './crops.js';

const days = (n, f) => Array.from({ length: n }, (_, i) => ({ d: `2026-12-${String(i + 1).padStart(2, '0')}`, ...f(i) }));
const field = (Dr, horizon) => ({ mode: 'balance', now: { Dr }, horizon, area_m2: 1000 });

test('planner waters no more than the RAW rule and never leaves the crop more stressed', () => {
  const h = days(14, (i) => ({ rain: i === 6 ? 25 : 0, et0: 3.5, kc: 1.1, TAW: 90, RAW: 50 }));
  const p = planIrrigation(field(30, h));
  assert.ok(p.best.cost <= p.compare.atRaw.cost + 1e-9);
  assert.ok(p.best.cost <= p.compare.weekly.cost + 1e-9);
  assert.ok(p.best.pumpedMm <= p.compare.atRaw.pumpedMm + 1e-9);
  assert.ok(p.best.stressMm <= 0.5);
  assert.equal(p.path.filter((x) => x.refill).length, 1);
});

test('planner waits when heavy rain is forecast soon', () => {
  const h = days(14, (i) => ({ rain: i === 1 ? 60 : 0, et0: 3, kc: 1, TAW: 90, RAW: 50 }));
  const p = planIrrigation(field(45, h));
  assert.equal(p.path[0].refill, false);
});

test('planner waters a field already deep in stress with a dry fortnight ahead', () => {
  const h = days(14, () => ({ rain: 0, et0: 4, kc: 1.1, TAW: 90, RAW: 50 }));
  const p = planIrrigation(field(70, h));
  assert.equal(p.path[0].refill, true);
  assert.ok(Math.abs(p.path[0].netMm - 70) < 1e-9);
});

test('planner returns null without a water balance (Boro AWD, before planting)', () => {
  assert.equal(planIrrigation(null), null);
  assert.equal(planIrrigation({ mode: 'before' }), null);
  assert.equal(planIrrigation({ mode: 'awd', now: {} }), null);
});

test('stress is costed above pumping (FAO-33 Ky ≈ 1 against pump cost)', () => {
  assert.ok(COST.perMmStress > COST.perMmPumped * 5);
});

test('top-dress check avoids days before heavy rain', () => {
  const t = topdressDays(days(7, (i) => ({ rain: i === 2 ? 30 : 0 })));
  assert.equal(t.rows[0].ok, false); // rain within the next two days
  assert.equal(t.rows[2].ok, false);
  assert.equal(t.best.d, '2026-12-04');
  assert.equal(topdressDays([]), null);
});

const boroPlant = Date.parse('2027-01-15T00:00:00Z');
const april = (tmax) => Array.from({ length: 16 }, (_, i) => ({ d: `2027-04-${String(i + 1).padStart(2, '0')}`, tmax: tmax(i) }));
const mar31 = Date.parse('2027-03-31T00:00:00Z');

test('heat watch flags three 36 °C days in Boro flowering before they happen', () => {
  const w = heatWatch({ crop: RABI_CROPS.boro, plantT: boroPlant, forecast: april((i) => (i >= 4 && i < 8 ? 37 : 33)), today: mar31 });
  assert.equal(w.level, 'breach');
  assert.equal(w.rules[0].firstHot, '2027-04-05');
  assert.ok(w.advice.length > 0);
});

test('heat watch levels: near, clear, later, past', () => {
  const near = heatWatch({ crop: RABI_CROPS.boro, plantT: boroPlant, forecast: april((i) => (i === 4 || i === 9 ? 37 : 33)), today: mar31 });
  assert.equal(near.level, 'near');
  const clear = heatWatch({ crop: RABI_CROPS.boro, plantT: boroPlant, forecast: april(() => 33), today: mar31 });
  assert.equal(clear.level, 'clear');
  assert.equal(clear.advice.length, 0);
  const early = heatWatch({ crop: RABI_CROPS.boro, plantT: boroPlant, forecast: april(() => 38), today: Date.parse('2027-01-20T00:00:00Z') });
  // the forecast days are in April, so the window is in view; with a January forecast it would be "later"
  assert.ok(['breach', 'near', 'clear', 'later'].includes(early.level));
  const jan = Array.from({ length: 16 }, (_, i) => ({ d: `2027-01-${String(i + 16).padStart(2, '0')}`, tmax: 30 }));
  const later = heatWatch({ crop: RABI_CROPS.boro, plantT: boroPlant, forecast: jan, today: Date.parse('2027-01-15T00:00:00Z') });
  assert.equal(later.level, 'later');
  assert.ok(later.rules[0].opensIn > 0);
  const may = Array.from({ length: 16 }, (_, i) => ({ d: `2027-05-${String(i + 10).padStart(2, '0')}`, tmax: 40 }));
  assert.equal(heatWatch({ crop: RABI_CROPS.boro, plantT: boroPlant, forecast: may, today: Date.parse('2027-05-09T00:00:00Z') }).level, 'past');
});

// One hazard list per field: each hazard at its limits, the "not checked is not clear" rule, AWD never on a saline or
// haor field, and the three demo places worked out by hand. The forecasts here are made-up test weather.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldHazards, awdAllowed, SALINE_EC, STRONG_EC, LATE_DAYS } from './hazards.js';
import { BMD } from './weatherRisk.js';
import { RABI_CROPS } from './crops.js';
import { fieldWater } from './fieldwater.js';
import { applyTest, checkTest } from './soiltest.js';
import { ymd, addDays, iso } from './dates.js';

const boro = RABI_CROPS.boro, tomato = RABI_CROPS.tomato;
const today = ymd(2027, 3, 20);
// A 16-day forecast starting tomorrow; `over` replaces fields on given days (1 = tomorrow).
const forecast = (over = {}, base = { tmax: 30, tmin: 18, rain: 0, et0: 4 }) => ({
  days: Array.from({ length: 16 }, (_, i) => ({ d: iso(addDays(today, i + 1)), ...base, ...(over[i + 1] ?? {}) })),
});
const ids = (r) => r.hazards.map((h) => `${h.id}:${h.severity}`);

test('heat: three forecast days at 36 °C inside Boro flowering is high; two is medium (one short)', () => {
  const plantT = addDays(today, -78); // day 79 tomorrow: inside 75–95
  const three = fieldHazards({ crop: boro, plantT, today, wx: forecast({ 2: { tmax: 36 }, 3: { tmax: 36.4 }, 4: { tmax: 37 } }) });
  assert.deepEqual(ids(three), ['heat:high']);
  assert.equal(three.hazards[0].daysAhead, 2);
  assert.equal(three.hazards[0].trigger.thr, 36);
  const two = fieldHazards({ crop: boro, plantT, today, wx: forecast({ 2: { tmax: 36 }, 3: { tmax: 36 } }) });
  assert.deepEqual(ids(two), ['heat:medium']);
  const cool = fieldHazards({ crop: boro, plantT, today, wx: forecast({ 2: { tmax: 35.9 }, 3: { tmax: 35.9 }, 4: { tmax: 35.9 } }) });
  assert.ok(cool.clear.includes('heat'));
});

test('cold follows the BMD classes, for Boro and tomato only', () => {
  assert.equal(BMD.coldMild, 10);
  assert.deepEqual(ids(fieldHazards({ crop: tomato, today, wx: forecast({ 5: { tmin: 10 } }) })), ['cold:medium']);
  assert.deepEqual(ids(fieldHazards({ crop: tomato, today, wx: forecast({ 5: { tmin: 7.9 } }) })), ['cold:high']);
  assert.ok(fieldHazards({ crop: tomato, today, wx: forecast({ 5: { tmin: 10.1 } }) }).clear.includes('cold'));
  const wheat = fieldHazards({ crop: RABI_CROPS.wheat, today, wx: forecast({ 5: { tmin: 5 } }) });
  assert.ok(!wheat.hazards.some((h) => h.id === 'cold'));
});

test('heavy rain at 44 and 89 mm; a haor field is one level higher', () => {
  assert.ok(fieldHazards({ crop: tomato, today, wx: forecast({ 3: { rain: 43.9 } }) }).clear.includes('rain'));
  assert.deepEqual(ids(fieldHazards({ crop: tomato, today, wx: forecast({ 3: { rain: 44 } }) })), ['rain:medium']);
  assert.deepEqual(ids(fieldHazards({ crop: tomato, today, wx: forecast({ 3: { rain: 89 } }) })), ['rain:high']);
  const haor = fieldHazards({ crop: boro, today, wx: forecast({ 3: { rain: 50 } }), field: { landform: 'haor' } });
  assert.deepEqual(ids(haor), ['rain:high']);
  assert.equal(haor.hazards[0].trigger.haor, true);
});

test('salinity from the soil test EC: 4 is saline, 8 strongly; no test is not "not saline"', () => {
  assert.deepEqual([SALINE_EC, STRONG_EC], [4, 8]);
  assert.ok(fieldHazards({ crop: tomato, today, soil: { ec_dsm: 3.9 } }).clear.includes('salinity'));
  assert.deepEqual(ids(fieldHazards({ crop: tomato, today, soil: { ec_dsm: 4 } })), ['salinity:medium']);
  assert.deepEqual(ids(fieldHazards({ crop: tomato, today, soil: { ec_dsm: 8 } })), ['salinity:high']);
  const untested = fieldHazards({ crop: tomato, today, soil: { ph: 6.5 } });
  assert.ok(!untested.clear.includes('salinity') && !untested.hazards.length);
});

test('late planting from the usual date, at 21 days', () => {
  const usualT = ymd(2027, 1, 15);
  assert.ok(fieldHazards({ crop: boro, today, plantT: addDays(usualT, LATE_DAYS - 1), usualT }).clear.includes('late'));
  assert.deepEqual(ids(fieldHazards({ crop: boro, today, plantT: addDays(usualT, LATE_DAYS), usualT })), ['late:medium']);
});

test('water shortage from the FAO-56 balance: past RAW now is high, on a forecast day medium', () => {
  const now = fieldHazards({ crop: tomato, today, fw: { mode: 'balance', now: { Dr: 40, RAW: 35 }, horizon: [] } });
  assert.deepEqual(ids(now), ['water:high']);
  const soon = fieldHazards({ crop: tomato, today, fw: { mode: 'balance', now: { Dr: 20, RAW: 35 }, horizon: [{ d: iso(addDays(today, 1)), Dr: 30, RAW: 35 }, { d: iso(addDays(today, 2)), Dr: 36, RAW: 35 }] } });
  assert.deepEqual(ids(soon), ['water:medium']);
  assert.equal(soon.hazards[0].daysAhead, 2);
  const boroAwd = fieldHazards({ crop: boro, today, fw: { mode: 'awd' } });
  assert.ok(!boroAwd.clear.includes('water'), 'AWD mode is not a soil-water balance, so water is not checked');
});

test('high comes before medium, then the soonest first', () => {
  const r = fieldHazards({ crop: tomato, today, wx: forecast({ 2: { rain: 50 }, 9: { tmin: 7 } }), soil: { ec_dsm: 5 } });
  assert.deepEqual(ids(r), ['cold:high', 'rain:medium', 'salinity:medium']);
});

test('AWD is never allowed on a saline or haor field, and the Boro water advice keeps the field flooded', () => {
  assert.equal(awdAllowed({ soil: { ec_dsm: 4 } }).because, 'saline');
  assert.equal(awdAllowed({ field: { landform: 'haor' } }).because, 'haor');
  assert.equal(awdAllowed({ soil: { ec_dsm: 2 }, field: { landform: 'plain' } }).ok, true);
  const plantT = addDays(today, -40); // day 41: normally the drying phase
  const wx = { days: Array.from({ length: 20 }, (_, i) => ({ d: iso(addDays(today, i - 10)), rain: 0, et0: 4, tmax: 30, tmin: 18 })) };
  const normal = fieldWater({ crop: boro, plantT, wx, today });
  assert.equal(normal.keepWet, false);
  const block = awdAllowed({ soil: { ec_dsm: 6 } });
  const flooded = fieldWater({ crop: boro, plantT, wx, today, keepFlooded: block.reason });
  assert.equal(flooded.keepWet, true);
  assert.equal(flooded.awdOff, true);
  assert.deepEqual(flooded.reasons[0], block.reason);
});

test('a soil test can carry EC, checked for typing slips, and lays it on the soil', () => {
  assert.equal(checkTest({ date: '2026-10-01', ph: 6.8, ec: 45 }).ok, false);
  const ok = checkTest({ date: '2026-10-01', ph: 6.8, ec: 6.2 });
  assert.ok(ok.ok);
  assert.equal(applyTest({ ph: 6, om_pct: 1.5 }, ok.test).ec_dsm, 6.2);
});

// The three demo places, worked out by hand (made-up forecasts, the places' real character):
//   Godagari (Barind, Boro on day 79 at flowering): three days 36–37 °C → heat high; plain field → AWD allowed.
//   Gowainghat GOW-RU-0501 (haor Boro field): 52 mm on day 4 → heavy rain, raised to high on a haor; AWD off (haor).
//   Dacope (coastal, soil test EC 9 dS/m, tomato): strongly saline → salinity high; nothing else in a quiet forecast.
test('the three demo places, worked out by hand', () => {
  const godagari = fieldHazards({ crop: boro, plantT: addDays(today, -78), today, wx: forecast({ 2: { tmax: 36 }, 3: { tmax: 36.5 }, 4: { tmax: 37 } }), field: { landform: 'plain' } });
  assert.deepEqual(ids(godagari), ['heat:high']);
  assert.equal(godagari.awd.ok, true);

  const gowainghat = fieldHazards({ crop: boro, plantT: addDays(today, -100), today, wx: forecast({ 4: { rain: 52 } }), field: { id: 'GOW-RU-0501', landform: 'haor' } });
  assert.deepEqual(ids(gowainghat), ['rain:high']);
  assert.equal(gowainghat.hazards[0].daysAhead, 4);
  assert.deepEqual([gowainghat.awd.ok, gowainghat.awd.because], [false, 'haor']);

  const dacope = fieldHazards({ crop: tomato, plantT: addDays(today, -60), today, wx: forecast(), soil: { ec_dsm: 9 } });
  assert.deepEqual(ids(dacope), ['salinity:high']);
  assert.ok(['heat', 'cold', 'rain', 'salinity'].every((id) => dacope.clear.includes(id) || dacope.hazards.some((h) => h.id === id)));
});

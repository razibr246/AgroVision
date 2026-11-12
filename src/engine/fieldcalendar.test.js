// The bare-field calendar and the farmer's constraints, on Godagari's real NASA POWER record.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeClimate } from './climate.js';
import { fieldContext, fieldFuture } from './soilfuture.js';
import { bareCalendar, rotationBare, slotsOf } from './fieldcalendar.js';
import { constraintEffects, mergeExclude, defaultConstraints, RULES, CONSTRAINTS } from './constraints.js';

const clim = makeClimate(JSON.parse(readFileSync(new URL('../data/climate/climate_godagari.json', import.meta.url))));
const econ = { prices: JSON.parse(readFileSync(new URL('../data/market/price_seasons.json', import.meta.url))), costs: JSON.parse(readFileSync(new URL('../data/market/crop_economics.json', import.meta.url))) };
const soil = { ph: 6.2, soc_g_kg: 12, bulk_density: 1.32, drainage: 'imperfect' };
const ctx = fieldContext({ clim, change: null, soil, plot: { irrigation: 'dtw' }, amanT: null, econ });

test('bare calendar: twelve whole months that add up to a year', () => {
  const cal = bareCalendar(ctx, { rabi: 'boro', k1: 'fallow' });
  assert.equal(cal.months.length, 12);
  assert.deepEqual(cal.months.map((m) => m.m), [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const m of cal.months) assert.equal(m.crop + m.straw + m.bare, m.total);
  assert.equal(cal.months.reduce((a, m) => a + m.total, 0), 365 + (cal.months.some((m) => m.m === 2 && m.total === 29) ? 1 : 0));
});

test('bare calendar: Aman then Boro leaves the field bare after the Boro harvest, and a Kharif-1 crop covers it', () => {
  const boro = bareCalendar(ctx, { rabi: 'boro', k1: 'fallow' });
  const withMung = bareCalendar(ctx, { rabi: 'wheat', k1: 'mungbean' });
  const wheatOnly = bareCalendar(ctx, { rabi: 'wheat', k1: 'fallow' });
  assert.ok(boro.bareDays > 30, `Boro year should have a bare spell, got ${boro.bareDays}`);
  assert.ok(withMung.bareDays < wheatOnly.bareDays, 'adding mungbean after wheat covers bare days');
  // Straw kept on the field turns bare days into covered days, never adds crop days.
  const kept = bareCalendar(ctx, { rabi: 'wheat', k1: 'fallow' }, 'retain');
  assert.ok(kept.bareDays < wheatOnly.bareDays);
  assert.equal(kept.bareDays + kept.strawDays, wheatOnly.bareDays + wheatOnly.strawDays);
});

test('bare calendar: slots come from the same dates Field Future uses', () => {
  const slots = slotsOf(ctx, { rabi: 'wheat', k1: 'mungbean' });
  const w = slots.find((s) => s.id === 'wheat'), m = slots.find((s) => s.id === 'mungbean');
  assert.equal(w.from, ctx.rabi.wheat.t0);
  assert.equal(m.from, ctx.k1.wheat.mungbean.t0);
  assert.ok(m.from >= w.to, 'the Kharif-1 crop goes in after the Rabi harvest');
  const ff = fieldFuture({ ctx, lastCrop: 'boro', plan: null, priorities: [] });
  for (const e of [ff.habit, ff.best]) {
    const r = rotationBare(ctx, e.rot);
    assert.ok(r.meanBareDays >= 0 && r.meanBareDays <= 366);
  }
});

test('constraints: the defaults change nothing', () => {
  const fx = constraintEffects(defaultConstraints());
  assert.deepEqual(fx.out, []);
  assert.deepEqual(fx.flags, []);
  assert.deepEqual(mergeExclude(['tomato'], {}), ['tomato']);
});

test('constraints: each rule removes or flags its crop, with a reason in both languages', () => {
  for (const r of RULES) {
    assert.ok(CONSTRAINTS[r.key]?.options[r.value], `${r.key}=${r.value} is a real option`);
    assert.ok(r.why.bn && r.why.en);
  }
  const fx = constraintEffects({ labour: 'short', market: 'no', retting: 'no', machine: 'none' });
  assert.ok(fx.out.includes('tomato') && fx.out.includes('jute') && fx.out.includes('wheat'));
  assert.ok(fx.flags.includes('mustard') && fx.flags.includes('boro'));
  for (const id of fx.out) assert.ok(!fx.flags.includes(id), 'a removed crop is not also flagged');
  assert.equal(fx.why.tomato.length, 2, 'tomato is ruled out twice: labour and market');
});

test('constraints: removed crops leave Field Future\'s options, the baseline stays', () => {
  const exclude = mergeExclude([], { labour: 'short' });
  const ff = fieldFuture({ ctx, lastCrop: 'boro', plan: null, priorities: [], exclude });
  assert.ok(!ff.best.rot.cycle.some((y) => exclude.includes(y.rabi) || exclude.includes(y.k1)));
  assert.equal(ff.habit.rot.cycle[0].rabi, 'boro');
});

import { HARMONIZE, UNITS, WHY_NO_FINE_GRID } from './harmonize.js';
import { DATASETS } from './provenance.js';

test('harmonize: every dataset in the register says how it reaches the field and the crop calendar', () => {
  for (const d of DATASETS) {
    const h = HARMONIZE[d.id];
    assert.ok(h, `${d.id} has a harmonization entry`);
    for (const k of ['place', 'time']) assert.ok(h[k]?.bn && h[k]?.en, `${d.id}.${k} in both languages`);
  }
  for (const id of Object.keys(HARMONIZE)) assert.ok(DATASETS.some((d) => d.id === id), `${id} is in the register`);
  assert.ok(UNITS.place.en && UNITS.time.en && WHY_NO_FINE_GRID.en && WHY_NO_FINE_GRID.bn);
});

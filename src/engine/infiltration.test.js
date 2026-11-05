// Infiltration (Saxton & Rawls 2006 saturated conductivity): sandy soil drains faster than clay, organic matter
// helps, and a rotation's carbon change moves it the right way.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ksatOf, infiltrationChange } from './fieldwater.js';

const loam = { sand: 40, clay: 20, om_pct: 2.5 };
const clayLoam = { sand: 29, clay: 38, om_pct: 2.88 };
const sandy = { sand: 75, clay: 8, om_pct: 1.5 };

test('Ksat falls in the published range for each texture (Saxton & Rawls 2006, Table 3)', () => {
  // published values at 2.5% OM: loam about 20 mm/h, clay loam about 6, sandy loam well above loam
  assert.ok(ksatOf(loam) > 10 && ksatOf(loam) < 30, `loam ${ksatOf(loam)}`);
  assert.ok(ksatOf(clayLoam) > 1 && ksatOf(clayLoam) < 12, `clay loam ${ksatOf(clayLoam)}`);
  assert.ok(ksatOf(sandy) > ksatOf(loam));
});

test('more organic matter, faster infiltration', () => {
  assert.ok(ksatOf(clayLoam, 4) > ksatOf(clayLoam, 2));
  const up = infiltrationChange(clayLoam, 10), down = infiltrationChange(clayLoam, -10);
  assert.ok(up.pct > 0 && down.pct < 0);
  assert.equal(infiltrationChange(clayLoam, 0).pct, 0);
});

test('no texture, no answer', () => {
  assert.equal(ksatOf({ om_pct: 2 }), null);
  assert.equal(infiltrationChange({ sand: 30, clay: 30 }, 5), null);
});

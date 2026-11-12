import test from 'node:test';
import assert from 'node:assert/strict';
import { subsolarPoint, sunCosZenith, circularOrbit, dayOfYear } from './sun.js';

test('declination is about +23.4° at the June solstice and -23.4° at the December solstice', () => {
  assert.ok(Math.abs(subsolarPoint('2026-06-21T12:00:00Z').lat - 23.44) < 0.5);
  assert.ok(Math.abs(subsolarPoint('2026-12-21T12:00:00Z').lat + 23.44) < 0.5);
  assert.ok(Math.abs(subsolarPoint('2026-03-20T12:00:00Z').lat) < 0.8);
});

test('the sun is overhead near Greenwich at 12:00 UTC, give or take the equation of time', () => {
  const s = subsolarPoint('2026-11-03T12:00:00Z'); // EoT is near its +16 min peak in early November
  assert.ok(s.eotMin > 15 && s.eotMin < 17.5, `eot ${s.eotMin}`);
  assert.ok(Math.abs(s.lon + 4.1) < 0.6, `lon ${s.lon}`);
});

test('Dhaka is in daylight at 06:00 UTC (noon local) and in night at 18:00 UTC', () => {
  assert.ok(sunCosZenith('2026-11-11T06:00:00Z', 23.8, 90.4) > 0.6);
  assert.ok(sunCosZenith('2026-11-11T18:00:00Z', 23.8, 90.4) < -0.5);
});

test('orbital periods match the published ones for ISS-height and Landsat-height orbits', () => {
  assert.ok(Math.abs(circularOrbit(415).periodMin - 92.8) < 0.6);
  assert.ok(Math.abs(circularOrbit(705).periodMin - 98.9) < 0.6);
  assert.ok(Math.abs(circularOrbit(705).speedKmS - 7.5) < 0.05);
  assert.equal(dayOfYear('2026-01-01T05:00:00Z'), 1);
});

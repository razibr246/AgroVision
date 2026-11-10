#!/usr/bin/env node
// Reproduces the SMAP against NASA POWER root-zone wetness check quoted in docs/EVIDENCE.md.
//
//   node scripts/build/check_smap_power.mjs
//
// SMAP L4 analysed root-zone soil moisture (m³/m³, read from NASA GIBS tiles by scripts/fetch/gibs-water.mjs, in
// src/data/water/water_sat.json) is paired month by month with NASA POWER GWETROOT root-zone wetness (0–1, MERRA-2,
// in src/data/water/soil_wetness.json) at each of the seven upazilas, and the Pearson correlation printed. The two
// units differ, which a correlation does not mind. Both come from NASA's GEOS land modelling, so a high r is a
// consistency check between two NASA products, not independent validation against field measurements.
// Reads committed data only; writes nothing.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));
const smap = read('src/data/water/water_sat.json').points;
const power = read('src/data/water/soil_wetness.json').upazilas;
const UPAZILAS = ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat'];

export function pearson(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxy / Math.sqrt(sxx * syy);
}

const rows = [];
for (const id of UPAZILAS) {
  const s = smap[id]?.smap ?? {}, p = power[id]?.root ?? {};
  const xs = [], ys = [];
  for (const [ym, v] of Object.entries(s)) {
    const [y, m] = ym.split('-').map(Number), w = p[y]?.[m - 1];
    if (v != null && w != null) { xs.push(v); ys.push(w); }
  }
  rows.push({ id, months: xs.length, r: xs.length > 2 ? pearson(xs, ys) : NaN });
}
console.log('upazila      months   r (SMAP L4 vs POWER GWETROOT, monthly)');
for (const r of rows) console.log(`${r.id.padEnd(12)} ${String(r.months).padStart(6)}   ${r.r.toFixed(2)}`);
const rs = rows.map((r) => r.r).filter(Number.isFinite);
console.log(`range: r = ${Math.min(...rs).toFixed(2)}–${Math.max(...rs).toFixed(2)}; months: ${Math.min(...rows.map((r) => r.months))}–${Math.max(...rows.map((r) => r.months))}`);

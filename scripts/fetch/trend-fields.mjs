#!/usr/bin/env node
// The Trends map's year-by-year satellite fields: the same three records as its points (engine/trends.js), computed the
// same way but for every pixel of South Asia, so the map shows the whole pattern and not just twelve dots.
//   grace  GRACE/GRACE-FO JPL mascons (CRI): each year's mean of the monthly anomaly against 2004–2009, cm of water,
//          years with at least 8 months (as soilwater.js graceRecord)
//   smap   SMAP L4 root-zone soil moisture, the 8th and 22nd of each month: each year's mean (years with 10+ months)
//          against that pixel's own mean of all years, % (as trends.js)
//   green  MODIS Terra monthly NDVI, December–March of each Rabi: the season's mean against that pixel's own linear
//          trend, in standard deviations of the departures (as landsat.js rabiGreenness); pixels whose Rabi NDVI
//          averages under 0.15 (water, sand, snow) are left blank
// GIBS serves each layer as a colour-mapped PNG; each pixel is turned back into its value with the layer's own
// colour map (scripts/lib/gibs.mjs), then drawn in the app's diverging colours (trends.js trendColor) and reprojected
// to Web Mercator so it sits exactly under the Leaflet map.
// Writes public/trends/{grace,smap,green}/<year>.png and public/trends/meta.json. Usage: npm run fetch:trend-fields
import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync, crc32 } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colourMap, getMap } from '../lib/gibs.mjs';
import { trendColor, TREND_LAYERS } from '../../src/engine/trends.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'public', 'trends');
const CAPS = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities';
// The Trends map's full view (TrendMap.jsx ALL_BOUNDS)
const BOX = { s: 19.2, w: 66.5, n: 31.8, e: 97.5 };

const LAYERS = {
  grace: { id: 'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI', cmap: 'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI', res: 0.25 },
  smap: { id: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', cmap: 'SMAP_Analyzed_Soil_Moisture', res: 0.1 },
  green: { id: 'MODIS_Terra_L3_NDVI_Monthly', cmap: 'MODIS_L3_NDVI', res: 0.05 },
};
const only = process.argv[2];

const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

function datesOf(caps, layer) {
  const i = caps.indexOf(`<ows:Identifier>${layer}</ows:Identifier>`), j = caps.lastIndexOf('<Layer>', i), k = caps.indexOf('</Layer>', i);
  const out = [];
  for (const [, v] of caps.slice(j, k).matchAll(/<Value>([^<]*)<\/Value>/g)) {
    const [a, b, per] = v.split('/');
    const step = per === 'P1M' ? 'm' : per === 'P1D' ? 'd' : null;
    let t = new Date(`${a}T00:00:00Z`);
    const end = new Date(`${b}T00:00:00Z`);
    if (!step) { out.push(a); continue; }
    while (t <= end) { out.push(t.toISOString().slice(0, 10)); if (step === 'm') t.setUTCMonth(t.getUTCMonth() + 1); else t.setUTCDate(t.getUTCDate() + 1); }
  }
  return out;
}

async function pool(items, n, f) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await f(items[k], k); } }));
}

// One date as a grid of values (Float32Array, NaN where no data)
async function grid(L, map, date) {
  const W = Math.round((BOX.e - BOX.w) / L.res), H = Math.round((BOX.n - BOX.s) / L.res);
  const img = await getMap(L.id, BOX, W, H, date);
  if (!img) { console.warn(`  ${L.id} ${date}: no image`); return null; }
  const g = new Float32Array(W * H).fill(NaN);
  for (let p = 0; p < W * H; p++) {
    if (img.px[p * 4 + 3] < 128) continue;
    const v = map.get(`${img.px[p * 4]},${img.px[p * 4 + 1]},${img.px[p * 4 + 2]}`);
    if (v != null) g[p] = v;
  }
  return { g, W, H };
}

// Per-pixel mean of several grids, NaN where fewer than `min` have a value
function meanGrid(grids, min) {
  const n = grids[0].g.length, out = new Float32Array(n).fill(NaN);
  for (let p = 0; p < n; p++) {
    let s = 0, c = 0;
    for (const x of grids) { const v = x.g[p]; if (!Number.isNaN(v)) { s += v; c++; } }
    if (c >= min) out[p] = s / c;
  }
  return out;
}

// ---- PNG (RGBA) ----
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.subarray(y * w * 4, (y + 1) * w * 4).forEach((v, x) => { raw[y * (w * 4 + 1) + 1 + x] = v; });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// Values on the lat/lon grid → colours on a Web Mercator grid of the same width
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
function render(values, W, H, span) {
  const yN = mercY(BOX.n), yS = mercY(BOX.s);
  const HM = Math.round((W * (yN - yS)) / (((BOX.e - BOX.w) * Math.PI) / 180));
  const rgba = new Uint8Array(W * HM * 4);
  for (let r = 0; r < HM; r++) {
    const y = yN - ((r + 0.5) / HM) * (yN - yS);
    const lat = (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * (180 / Math.PI);
    const sr = Math.min(H - 1, Math.max(0, Math.floor(((BOX.n - lat) / (BOX.n - BOX.s)) * H)));
    for (let x = 0; x < W; x++) {
      const v = values[sr * W + x];
      if (Number.isNaN(v)) continue;
      const [cr, cg, cb] = trendColor(v, span).match(/\d+/g).map(Number);
      const o = (r * W + x) * 4;
      rgba[o] = cr; rgba[o + 1] = cg; rgba[o + 2] = cb;
      // opacity follows the size of the departure: near-normal pixels barely tint the photo, extremes stand out
      rgba[o + 3] = Math.round(255 * (0.12 + 0.72 * Math.min(1, Math.abs(v) / span)));
    }
  }
  return { png: png(W, HM, rgba), HM };
}

console.log('reading GIBS capabilities ...');
const caps = await (await fetch(CAPS)).text();
const meta = { source: 'NASA GIBS WMS, decoded with each layer’s colour map', fetched: new Date().toISOString().slice(0, 10), bounds: [[BOX.s, BOX.w], [BOX.n, BOX.e]], layers: {} };

for (const [kind, L] of Object.entries(LAYERS)) {
  if (only && only !== kind) continue;
  const map = await colourMap(L.cmap);
  let dates = datesOf(caps, L.id);
  if (kind === 'smap') dates = dates.filter((d) => d.endsWith('-08') || d.endsWith('-22'));
  if (kind === 'green') dates = dates.filter((d) => [11, 12, 1, 2, 3].includes(+d.slice(5, 7)) && d.endsWith('-01'));
  console.log(`${kind}: ${dates.length} images from ${dates[0]} to ${dates[dates.length - 1]}`);
  const grids = {};
  await pool(dates, 4, async (d) => { const x = await grid(L, map, d); if (x) grids[d] = x; });
  const any = Object.values(grids)[0];
  if (!any) { console.warn(`${kind}: nothing read`); continue; }
  const { W, H } = any;
  const years = {};

  if (kind === 'grace') {
    const by = {};
    for (const [d, x] of Object.entries(grids)) (by[d.slice(0, 4)] ??= []).push(x);
    for (const [y, gs] of Object.entries(by)) if (gs.length >= 8) years[y] = meanGrid(gs, 8);
  }
  if (kind === 'smap') {
    const months = {};
    for (const [d, x] of Object.entries(grids)) (months[d.slice(0, 7)] ??= []).push(x);
    const by = {};
    for (const [m, gs] of Object.entries(months)) (by[m.slice(0, 4)] ??= []).push({ g: meanGrid(gs, 1) });
    const yearly = {};
    for (const [y, gs] of Object.entries(by)) if (gs.length >= 10) yearly[y] = meanGrid(gs, 10);
    const all = meanGrid(Object.values(yearly).map((g) => ({ g })), 1);
    for (const [y, g] of Object.entries(yearly)) years[y] = g.map((v, p) => (Number.isNaN(v) || !all[p] ? NaN : ((v - all[p]) / all[p]) * 100));
  }
  if (kind === 'green') {
    const seasons = {};
    for (const [d, x] of Object.entries(grids)) {
      const m = +d.slice(5, 7), y = +d.slice(0, 4);
      if (![12, 1, 2, 3].includes(m)) continue;
      (seasons[m >= 11 ? y + 1 : y] ??= []).push(x);
    }
    const ys = Object.keys(seasons).map(Number).filter((y) => seasons[y].length === 4).sort();
    const sm = Object.fromEntries(ys.map((y) => [y, meanGrid(seasons[y], 4)]));
    for (const y of ys) years[y] = new Float32Array(W * H).fill(NaN);
    for (let p = 0; p < W * H; p++) {
      const rows = ys.map((y) => [y, sm[y][p]]).filter(([, v]) => !Number.isNaN(v));
      if (rows.length < 12) continue;
      const my = mean(rows.map((r) => r[0])), mv = mean(rows.map((r) => r[1]));
      if (mv < 0.15) continue;
      const slope = rows.reduce((a, r) => a + (r[0] - my) * (r[1] - mv), 0) / (rows.reduce((a, r) => a + (r[0] - my) ** 2, 0) || 1);
      const dev = rows.map((r) => r[1] - (mv + slope * (r[0] - my)));
      const s = Math.sqrt(mean(dev.map((x) => x * x))) || 1;
      rows.forEach(([y], i) => { years[y][p] = dev[i] / s; });
    }
  }

  await mkdir(path.join(OUT, kind), { recursive: true });
  const list = Object.keys(years).map(Number).sort();
  let size = 0;
  for (const y of list) {
    const { png: buf } = render(years[y], W, H, TREND_LAYERS[kind].span);
    await writeFile(path.join(OUT, kind, `${y}.png`), buf);
    size += buf.length;
  }
  meta.layers[kind] = { layer: L.id, res: L.res, years: list };
  console.log(`  ${kind}: ${list.length} years ${list[0]}–${list[list.length - 1]}, ${Math.round(size / 1024)} KB`);
}

let old = {};
try { old = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(OUT, 'meta.json'), 'utf8')); } catch { /* first run */ }
meta.layers = { ...(old.layers ?? {}), ...meta.layers };
await writeFile(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log('wrote public/trends/meta.json');

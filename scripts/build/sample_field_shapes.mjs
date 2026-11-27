// Sample field outlines for the demo farmers' fields (src/data/fields/parcels.json). The
// farmers are sample people, so their fields have no surveyed boundary; for the demo each one is drawn as the edge of
// a real field seen in the sharpest satellite photo (Esri World Imagery) near its pin, found by src/engine/fielddetect.js.
// The app labels these "sample boundary (demo)": a real field's edge on the ground, not that farmer's measured land.
//
// For each field, seeds are tried on rings round the pin (0–50 m); the outline kept is the most confident one, with a
// bonus when it holds the pin and a cost for distance. scripts/build/sample_field_seeds.json can fix a seed by hand
// ({ "<id>": [metres east, metres north] }) where the automatic choice picks a bad patch.
//   node scripts/build/sample_field_shapes.mjs [--debug <dir>] [--cache <dir>] [--only <id,id>]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';
import { preparePhoto, detectOn, latLonToPx, metresPerPx, TILE } from '../../src/engine/fielddetect.js';
import { measure, polygonFrom } from '../../src/engine/landgeom.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
const UA = { 'User-Agent': 'agrovision-360-build/1.0' };
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const DEBUG = arg('--debug'), CACHE = arg('--cache'), ONLY = arg('--only')?.split(',');
const MAX_PX = 900;
const SEEDS_FILE = join(ROOT, 'scripts/build/sample_field_seeds.json');
const SEEDS = existsSync(SEEDS_FILE) ? JSON.parse(readFileSync(SEEDS_FILE, 'utf8')) : {};
// Where the edge-finder picks a bad patch, the outline is traced by hand along a real field's edges in the same photo
// (corners as [lat, lon], read off the --debug picture's pixel grid): { "<id>": { "field": "what was traced", "corners": [...] } }.
const TRACES_FILE = join(ROOT, 'scripts/build/sample_field_traces.json');
const TRACES = existsSync(TRACES_FILE) ? JSON.parse(readFileSync(TRACES_FILE, 'utf8')) : {};
if (CACHE) mkdirSync(CACHE, { recursive: true });
if (DEBUG) mkdirSync(DEBUG, { recursive: true });

async function esriDepthAt(lat, lon) {
  for (let z = 19; z >= 15; z--) {
    const [px, py] = latLonToPx(lat, lon, z);
    try {
      const j = await (await fetch(`${ESRI}/tilemap/${z}/${Math.floor(py / TILE)}/${Math.floor(px / TILE)}/1/1`, { headers: UA })).json();
      if (j.valid !== false && j.data?.[0] === 1) return z;
    } catch { /* try shallower */ }
  }
  return 17;
}
async function tile(z, x, y) {
  const f = CACHE && join(CACHE, `${z}-${x}-${y}.jpg`);
  if (f && existsSync(f)) return jpeg.decode(readFileSync(f), { useTArray: true, formatAsRGBA: true });
  for (let tries = 0; tries < 3; tries++) {
    try {
      const r = await fetch(`${ESRI}/tile/${z}/${y}/${x}?blankTile=false`, { headers: UA });
      if (!r.ok) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (f) writeFileSync(f, buf);
      return jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
    } catch { await new Promise((ok) => setTimeout(ok, 800)); }
  }
  return null;
}
async function photoAround(lat, lon, side) {
  let z = await esriDepthAt(lat, lon);
  while (z > 14 && side / metresPerPx(lat, z) > MAX_PX) z--;
  const half = side / metresPerPx(lat, z) / 2;
  const [cx, cy] = latLonToPx(lat, lon, z);
  const x0 = Math.floor(cx - half), y0 = Math.floor(cy - half), w = Math.ceil(2 * half), h = w;
  const data = new Uint8ClampedArray(w * h * 4);
  const jobs = [];
  for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y0 + h - 1) / TILE); ty++) for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x0 + w - 1) / TILE); tx++) {
    jobs.push(tile(z, tx, ty).then((t) => {
      if (!t) throw new Error(`missing tile ${z}/${ty}/${tx}`);
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const gx = tx * TILE + x - x0, gy = ty * TILE + y - y0;
        if (gx < 0 || gy < 0 || gx >= w || gy >= h) continue;
        const s = 4 * (y * TILE + x), d = 4 * (gy * w + gx);
        data[d] = t.data[s]; data[d + 1] = t.data[s + 1]; data[d + 2] = t.data[s + 2]; data[d + 3] = 255;
      }
    }));
  }
  await Promise.all(jobs);
  return { img: { width: w, height: h, data }, geo: { z, x0, y0 } };
}

const offset = (lat, lon, e, n) => [lat + n / 111320, lon + e / (111320 * Math.cos((lat * Math.PI) / 180))];
const inPoly = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

function debugPicture(file, { img }, res, pinPx) {
  const { width: w, height: h } = img;
  const out = Buffer.from(img.data);
  const dot = (x, y, c, r = 1) => { for (let k = -r; k <= r; k++) for (let j = -r; j <= r; j++) { const xx = Math.round(x) + j, yy = Math.round(y) + k; if (xx >= 0 && yy >= 0 && xx < w && yy < h) { const i = 4 * (yy * w + xx); out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; } } };
  // A pixel grid for reading corners off the picture: grey every 50 px, white every 100 px.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x % 50 && y % 50) continue;
    const i = 4 * (y * w + x), c = x % 100 === 0 || y % 100 === 0 ? 255 : 150;
    out[i] = (out[i] + c) >> 1; out[i + 1] = (out[i + 1] + c) >> 1; out[i + 2] = (out[i + 2] + c) >> 1;
  }
  if (res?.ringPx) {
    const r = res.ringPx;
    for (let i = 0; i < r.length; i++) { const [a, b] = r[i], [c, d] = r[(i + 1) % r.length], n = Math.ceil(Math.hypot(c - a, d - b)); for (let t = 0; t <= n; t++) dot(a + ((c - a) * t) / n, b + ((d - b) * t) / n, [80, 160, 255]); }
  }
  dot(pinPx[0], pinPx[1], [255, 0, 0], 3);
  if (res?.seedPx) dot(res.seedPx[0], res.seedPx[1], [255, 230, 0], 2);
  writeFileSync(file, jpeg.encode({ width: w, height: h, data: out }, 85).data);
}

const registry = JSON.parse(readFileSync(join(ROOT, 'src/data/fields/parcels.json'), 'utf8')).parcels;
const fields = registry.filter((p) => !ONLY || ONLY.includes(p.id));

const out = {};
for (const p of fields) {
  const hintM2 = p.area_dec * 40.4686; // frames the photo and bounds the size; never shapes the outline
  const side = TRACES[p.id]?.side ?? Math.max(200, 4 * Math.sqrt(hintM2)); // a trace may need a wider photo (a very large field)
  const reach = Math.min(50, side / 4);
  const seeds = TRACES[p.id]?.corners ? [] : SEEDS[p.id] ? [SEEDS[p.id]] : [[0, 0], ...[reach * 0.2, reach * 0.45, reach * 0.7, reach].flatMap((r) => Array.from({ length: 8 }, (_, k) => [r * Math.cos((k * Math.PI) / 4), r * Math.sin((k * Math.PI) / 4)]))];
  let ph;
  try { ph = await photoAround(p.lat, p.lon, side); } catch (e) { out[p.id] = { ok: false, reason: `photo: ${e.message}` }; console.log(p.id.padEnd(12), 'photo failed', e.message); continue; }
  const photo = preparePhoto(ph.img, ph.geo, p.lat);
  const [px, py] = latLonToPx(p.lat, p.lon, ph.geo.z);
  const pinPx = [px - ph.geo.x0, py - ph.geo.y0];
  let best = null;
  for (const [e, n] of seeds) {
    const [la, lo] = offset(p.lat, p.lon, e, n);
    const r = detectOn(photo, { lat: la, lon: lo }, { seedSearchM: 2, minAreaM2: 250, maxAreaM2: Math.max(12000, 2.5 * hintM2), simplifyPx: Math.max(1, 0.8 / photo.mpp) });
    if (!r.geometry || (!r.ok && r.conf < 0.3)) continue;
    const holds = inPoly(pinPx[0], pinPx[1], r.ringPx);
    // Among real fields found near the pin, prefer a confident one that holds the pin and is near the recorded size.
    const sizeOff = Math.min(1.5, Math.abs(Math.log((r.pixels * photo.mpp ** 2) / hintM2)));
    const score = r.conf + (holds ? 0.25 : 0) - Math.hypot(e, n) / 250 - 0.3 * sizeOff + (SEEDS[p.id] ? 1 : 0);
    if (!best || score > best.score) best = { ...r, score, holds, seed: [Math.round(e), Math.round(n)] };
  }
  if (TRACES[p.id]?.corners) {
    const g = polygonFrom(TRACES[p.id].corners);
    const ringPx = g.coordinates[0].slice(0, -1).map(([lo, la]) => { const [x, y] = latLonToPx(la, lo, ph.geo.z); return [x - ph.geo.x0, y - ph.geo.y0]; });
    best = { ok: true, conf: null, geometry: g, ringPx, holds: inPoly(pinPx[0], pinPx[1], ringPx), seed: null, hand: true };
  }
  if (DEBUG) {
    debugPicture(join(DEBUG, `${p.id}.jpg`), ph, best, pinPx);
    writeFileSync(join(DEBUG, `${p.id}.json`), JSON.stringify({ ...ph.geo, w: ph.img.width, h: ph.img.height, pin: pinPx.map(Math.round) }));
  }
  if (!best) { out[p.id] = { ok: false, reason: 'no field edge found near the pin' }; console.log(p.id.padEnd(12), 'none'); continue; }
  const m = measure(best.geometry);
  out[p.id] = {
    ok: true, method: best.hand ? 'hand' : 'auto', conf: best.conf, holds_pin: best.holds, seed_m: best.seed, z: ph.geo.z, area_m2: Math.round(m.areaM2), vertices: m.vertexCount,
    geometry: { type: 'Polygon', coordinates: [best.geometry.coordinates[0].map(([lo, la]) => [Math.round(lo * 1e7) / 1e7, Math.round(la * 1e7) / 1e7])] },
  };
  console.log(p.id.padEnd(12), `${best.hand ? 'hand-traced' : `conf ${best.conf.toFixed(2)}`}  ${best.holds ? 'holds pin' : best.seed ? `seed ${best.seed.join(',')} m` : 'near pin'}  ${(m.area.decimal).toFixed(1)} dec  ${m.vertexCount} corners  z${ph.geo.z}`);
}

const file = join(ROOT, 'src/data/fields/sample_shapes.json');
let prev = {};
try { prev = JSON.parse(readFileSync(file, 'utf8')).fields ?? {}; } catch { /* first run */ }
writeFileSync(file, `${JSON.stringify({
  provenance: {
    status: 'SAMPLE',
    what: 'Sample field outlines for the demo: each is the edge of a real field seen in the satellite photo near the sample field pin, not a surveyed or farmer-measured boundary of that field.',
    imagery: 'Esri World Imagery (Maxar, Earthstar Geographics), undated, the deepest zoom available at each field',
    method: 'src/engine/fielddetect.js, seeds on rings round the pin (scripts/build/sample_field_shapes.mjs); hand-picked seeds in scripts/build/sample_field_seeds.json; where it picked a bad patch, traced by hand along the edges of a real field in the same photo (scripts/build/sample_field_traces.json, method "hand")',
    made: new Date().toISOString().slice(0, 10),
  },
  fields: { ...prev, ...out },
}, null, 1)}\n`);
console.log(`\n${Object.values(out).filter((x) => x.ok).length}/${fields.length} -> ${file}`);

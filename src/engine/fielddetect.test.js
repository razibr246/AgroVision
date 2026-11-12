import test from 'node:test';
import assert from 'node:assert/strict';
import { detectField, latLonToPx, pxToLatLon, metresPerPx, traceOutline, simplifyRing } from './fielddetect.js';
import { measure } from './landgeom.js';

// A synthetic photo: fields of given colours (polygons in pixels), 2 px light bunds between them, sensor noise.
let seedRand = 7;
const rand = () => ((seedRand = (seedRand * 16807) % 2147483647) / 2147483647);
const inPoly = (x, y, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const segD = (px, py, [ax, ay], [bx, by]) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
function photo(w, h, fields, base = [96, 112, 70], { bund = true, noise = 6 } = {}) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = base, nearEdge = false;
    for (const f of fields) {
      if (inPoly(x + 0.5, y + 0.5, f.poly)) c = f.rgb;
      if (bund) for (let i = 0; i < f.poly.length; i++) if (segD(x + 0.5, y + 0.5, f.poly[i], f.poly[(i + 1) % f.poly.length]) < 1.1) nearEdge = true;
    }
    if (nearEdge) c = [168, 160, 120];
    const i = 4 * (y * w + x);
    for (let k = 0; k < 3; k++) data[i + k] = c[k] + (rand() - 0.5) * 2 * noise;
    data[i + 3] = 255;
  }
  return { width: w, height: h, data };
}
const Z = 19, LAT = 24.0233, LON = 90.079;
const [CX, CY] = latLonToPx(LAT, LON, Z);
const geoFor = (w, h, sx, sy) => ({ z: Z, x0: Math.round(CX) - sx, y0: Math.round(CY) - sy });
const iou = (ringPx, truth, w, h) => {
  let a = 0, b = 0, both = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = inPoly(x + 0.5, y + 0.5, ringPx), q = inPoly(x + 0.5, y + 0.5, truth);
    a += p; b += q; both += p && q;
  }
  return both / (a + b - both);
};

test('web mercator pixel <-> lat/lon round trip and scale', () => {
  const [x, y] = latLonToPx(LAT, LON, Z);
  const [la, lo] = pxToLatLon(x, y, Z);
  assert.ok(Math.abs(la - LAT) < 1e-9 && Math.abs(lo - LON) < 1e-9);
  assert.ok(Math.abs(metresPerPx(LAT, 19) - 0.2721) < 0.001);
});

test('outline tracing follows pixel edges exactly', () => {
  const w = 6, h = 5, m = new Uint8Array(w * h);
  for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [1, 3]]) m[y * w + x] = 1;
  const r = traceOutline(m, w, h);
  let s = 0; for (let i = 0; i < r.length; i++) { const [a, b] = r[i], [c, d] = r[(i + 1) % r.length]; s += a * d - c * b; }
  assert.equal(Math.abs(s) / 2, 6);
  assert.equal(r.length, 8); // a staircase of three rows: eight corners, no extra points
  assert.deepEqual(simplifyRing([[0, 0], [5, 0.2], [10, 0], [10, 10], [0, 10]], 1).length, 4);
});

test('an irregular field among neighbours is found with its own shape, not a square', () => {
  const w = 320, h = 300;
  const target = [[100, 80], [190, 70], [230, 120], [215, 200], [160, 215], [140, 180], [95, 170]]; // bent, unequal sides
  const fields = [
    { poly: target, rgb: [70, 130, 60] },
    { poly: [[190, 70], [300, 60], [300, 150], [230, 120]], rgb: [140, 120, 90] },
    { poly: [[20, 70], [100, 80], [95, 170], [20, 180]], rgb: [110, 100, 60] },
    { poly: [[95, 170], [140, 180], [160, 215], [150, 290], [30, 290], [20, 180]], rgb: [60, 90, 50] },
  ];
  const img = photo(w, h, fields);
  const r = detectField(img, geoFor(w, h, 160, 140), { lat: LAT, lon: LON });
  assert.equal(r.ok, true, `${r.reason} conf=${r.conf}`);
  // The 2 px bunds belong half to each side, which caps the overlap near 0.9.
  assert.ok(iou(r.ringPx, target, w, h) > 0.85, `iou ${iou(r.ringPx, target, w, h)}`);
  assert.ok(r.ringPx.length >= 6, `vertices ${r.ringPx.length}`);
  const m = measure(r.geometry);
  let s = 0; for (let i = 0; i < target.length; i++) { const [a, b] = target[i], [c, d] = target[(i + 1) % target.length]; s += a * d - c * b; }
  const trueM2 = (Math.abs(s) / 2) * metresPerPx(LAT, Z) ** 2;
  assert.ok(Math.abs(m.areaM2 / trueM2 - 1) < 0.1, `${m.areaM2} vs ${trueM2}`);
});

test('a bund stops the field even when the next field has the same crop', () => {
  const w = 260, h = 220;
  const target = [[40, 40], [130, 45], [125, 170], [45, 160]];
  const img = photo(w, h, [{ poly: target, rgb: [70, 130, 60] }, { poly: [[130, 45], [230, 40], [225, 175], [125, 170]], rgb: [72, 128, 62] }]);
  const r = detectField(img, geoFor(w, h, 85, 100), { lat: LAT, lon: LON });
  assert.equal(r.ok, true, `${r.reason} conf=${r.conf}`);
  assert.ok(iou(r.ringPx, target, w, h) > 0.85, `iou ${iou(r.ringPx, target, w, h)}`);
});

test('no clear field in the photo: nothing is returned rather than a guess', () => {
  const w = 200, h = 200;
  const r = detectField(photo(w, h, [], [90, 120, 70], { bund: false }), geoFor(w, h, 100, 100), { lat: LAT, lon: LON });
  assert.equal(r.ok, false);
  assert.equal(r.geometry, undefined);
});

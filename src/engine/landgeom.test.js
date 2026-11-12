import test from 'node:test';
import assert from 'node:assert/strict';
import {
  R_AUTHALIC, UNIT_M2, areaIn, inverse, distanceM, measure, ringAreaM2, selfIntersects, checkBoundary, polygonFrom,
  parseCoordList, parseBoundaryFile, fromTrack, averageFix, boundaryOf, boundaryStatus, toGeoJSON, toKML, shapeKey,
  areaUncertaintyM2, toBoxPercent, labelPoint, measuredBoundaryOf, svgPathCentroid,
} from './landgeom.js';

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
// A point dx metres east and dy metres north of [lat, lon] (small offsets, local radii of curvature).
const A = 6378137, E2 = (1 / 298.257223563) * (2 - 1 / 298.257223563);
const offset = ([lat, lon], dx, dy) => {
  const s = Math.sin((lat * Math.PI) / 180), w = Math.sqrt(1 - E2 * s * s);
  const M = (A * (1 - E2)) / w ** 3, N = A / w;
  return [lat + (dy / M) * (180 / Math.PI), lon + (dx / (N * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI)];
};

test('authalic radius gives the WGS84 surface area', () => {
  // 510,065,621.7 km² is the published surface area of the WGS84 ellipsoid.
  assert.ok(rel(4 * Math.PI * R_AUTHALIC ** 2, 510065621.7e6) < 1e-8);
});

test('Vincenty inverse matches the reference line (Flinders Peak to Buninyong)', () => {
  const dms = (d, m, s) => Math.sign(d) * (Math.abs(d) + m / 60 + s / 3600);
  const r = inverse([dms(-37, 57, 3.7203), dms(144, 25, 29.5244)], [dms(-37, 39, 10.1561), dms(143, 55, 35.3839)]);
  assert.ok(Math.abs(r.m - 54972.271) < 0.001);
  assert.ok(Math.abs(r.bearing - dms(306, 52, 5.37)) < 1e-4);
});

test('area of a small latitude/longitude cell equals the exact ellipsoidal value', () => {
  // Exact area between two parallels over dλ: R_q² · dλ · (sin β2 − sin β1), β the authalic latitude.
  const e = Math.sqrt(E2), q = (s) => (1 - E2) * (s / (1 - E2 * s * s) - (1 / (2 * e)) * Math.log((1 - e * s) / (1 + e * s)));
  const sinB = (lat) => q(Math.sin((lat * Math.PI) / 180)) / q(1);
  const [s, w, n, eL] = [24.02, 90.07, 24.021, 90.071];
  const exact = R_AUTHALIC ** 2 * ((0.001 * Math.PI) / 180) * (sinB(n) - sinB(s));
  const got = ringAreaM2([[w, s], [eL, s], [eL, n], [w, n]]);
  assert.ok(rel(got, exact) < 1e-6, `${got} vs ${exact}`);
});

test('a 100 m by 50 m field measures 5000 m² and 300 m round', () => {
  const p0 = [24.0233, 90.079];
  const g = polygonFrom([p0, offset(p0, 100, 0), offset(p0, 100, 50), offset(p0, 0, 50)]);
  const m = measure(g);
  assert.ok(rel(m.areaM2, 5000) < 1e-4);
  assert.ok(Math.abs(m.perimeterM - 300) < 0.05);
  assert.deepEqual(m.parts[0].sides.map((x) => Math.round(x.m)), [100, 50, 100, 50]);
  assert.equal(m.parts[0].sides[0].facing.en, 'south');
  assert.equal(m.parts[0].sides[1].facing.en, 'east');
});

test('an irregular field keeps every corner, in order, with no squaring off', () => {
  const p0 = [24.0086, 90.0354];
  const corners = [[0, 0], [62, -4], [71, 18], [55, 41], [58, 63], [12, 70], [-6, 33]].map(([dx, dy]) => offset(p0, dx, dy));
  const m = measure(polygonFrom(corners));
  assert.equal(m.vertexCount, 7);
  assert.equal(m.parts[0].sides.length, 7);
  m.parts[0].vertices.forEach((v, i) => { assert.ok(distanceM(v, corners[i]) < 1e-6); });
  // Shoelace on the same local metres, as an independent check.
  const xy = [[0, 0], [62, -4], [71, 18], [55, 41], [58, 63], [12, 70], [-6, 33]];
  let s = 0; for (let i = 0; i < xy.length; i++) { const [a, b] = xy[i], [c, d] = xy[(i + 1) % xy.length]; s += a * d - c * b; }
  assert.ok(rel(m.areaM2, Math.abs(s) / 2) < 1e-3);
});

test('a curved boundary given as many points keeps them all', () => {
  const p0 = [23.99, 90.07];
  const arc = Array.from({ length: 40 }, (_, i) => { const t = (Math.PI * i) / 39; return offset(p0, 40 * Math.cos(t), 40 * Math.sin(t)); });
  const m = measure(polygonFrom(arc));
  assert.equal(m.vertexCount, 40);
  const half = (Math.PI * 40 * 40) / 2;
  assert.ok(rel(m.areaM2, half) < 0.01); // 40-point half-disc vs the true half-disc
});

test('Bangladeshi land units', () => {
  assert.ok(rel(UNIT_M2.decimal, 40.468564224) < 1e-12);
  assert.ok(rel(UNIT_M2.acre / UNIT_M2.decimal, 100) < 1e-12);
  assert.ok(rel(UNIT_M2.bigha / UNIT_M2.katha, 20) < 1e-12);
  assert.ok(rel(UNIT_M2.bigha / UNIT_M2.decimal, 33.0579) < 1e-5);
  const a = areaIn(UNIT_M2.bigha);
  assert.ok(Math.abs(a.katha - 20) < 1e-9 && Math.abs(a.bigha - 1) < 1e-12);
});

test('a hole (a pond inside the field) is taken out of the area', () => {
  const p0 = [24.0, 90.0];
  const outer = [[0, 0], [100, 0], [100, 100], [0, 100]].map(([x, y]) => offset(p0, x, y)).map(([la, lo]) => [lo, la]);
  const hole = [[40, 40], [60, 40], [60, 60], [40, 60]].map(([x, y]) => offset(p0, x, y)).map(([la, lo]) => [lo, la]);
  const m = measure({ type: 'Polygon', coordinates: [outer, hole] });
  assert.ok(rel(m.areaM2, 10000 - 400) < 1e-4);
  assert.equal(m.parts[0].holes, 1);
});

test('checks: crossed sides, too few corners, size against the record, distance from the pin', () => {
  const p0 = [24.0233, 90.079];
  const bow = polygonFrom([p0, offset(p0, 50, 50), offset(p0, 50, 0), offset(p0, 0, 50)]);
  assert.ok(selfIntersects(bow.coordinates[0]));
  assert.equal(checkBoundary(bow).errors[0].code, 'B2_SELF_CROSS');
  assert.equal(checkBoundary(polygonFrom([p0, offset(p0, 5, 5)])).errors[0].code, 'B1_FEW_POINTS');
  const sq = polygonFrom([p0, offset(p0, 45, 0), offset(p0, 45, 45), offset(p0, 0, 45)]); // ≈ 50 decimal
  const ok = checkBoundary(sq, { recordDec: 50, pin: { lat: p0[0], lon: p0[1] } });
  assert.ok(ok.ok && ok.warnings.length === 0);
  const off = checkBoundary(sq, { recordDec: 99, pin: { lat: p0[0] + 0.01, lon: p0[1] } });
  assert.deepEqual(off.warnings.map((w) => w.code), ['B5_RECORD_MISMATCH', 'B7_FAR_FROM_PIN']);
  // A boundary 200 km from the pin (another district) is refused, not just warned about.
  const elsewhere = checkBoundary(sq, { recordDec: 50, pin: { lat: 24.41, lon: 88.5 } });
  assert.equal(elsewhere.ok, false);
  assert.equal(elsewhere.errors[0].code, 'B8_WRONG_PLACE');
});

test('a surveyor list: Bangla digits, labels, and swapped order', () => {
  const r = parseCoordList('১. ২৪.০২৩১, ৯০.০৭৮৮\n2) 24.0233 90.0794\n3 24.0228, 90.0796\n# note\n24.0226,90.0789');
  assert.equal(r.length, 4);
  assert.deepEqual(r[0], [24.0231, 90.0788]);
  assert.throws(() => parseCoordList('90.07, 24.02\n90.08, 24.02\n90.08, 24.03'), (e) => e.code === 'P2_SWAPPED');
  assert.throws(() => parseCoordList('24.0, 90.0\n24.0, 90.0'), (e) => e.code === 'P3_FEW');
});

test('GeoJSON and KML files: polygons found, points refused, swapped order caught', () => {
  const fc = { type: 'FeatureCollection', features: [
    { type: 'Feature', properties: { name: 'Plot A' }, geometry: { type: 'Polygon', coordinates: [[[90.079, 24.023], [90.08, 24.023], [90.08, 24.024], [90.079, 24.023]]] } },
    { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [90.0, 24.0] } },
    { type: 'Feature', properties: { name: 'Plot B' }, geometry: { type: 'MultiPolygon', coordinates: [[[[90.07, 24.02], [90.071, 24.02], [90.071, 24.021], [90.07, 24.02]]]] } },
  ] };
  const list = parseBoundaryFile(JSON.stringify(fc), 'x.geojson');
  assert.deepEqual(list.map((c) => c.name), ['Plot A', 'Plot B']);
  assert.throws(() => parseBoundaryFile(JSON.stringify({ type: 'Point', coordinates: [90, 24] })), (e) => e.code === 'F3_NO_POLYGON');
  assert.throws(() => parseBoundaryFile(JSON.stringify({ type: 'Polygon', coordinates: [[[24.02, 90.07], [24.03, 90.07], [24.03, 90.08]]] })), (e) => e.code === 'F4_SWAPPED');
  assert.throws(() => parseBoundaryFile('hello'), (e) => e.code === 'F2_FORMAT');
  const kml = `<kml><Document><Placemark><name>বাড়ির জমি</name><Polygon><outerBoundaryIs><LinearRing><coordinates>
    90.079,24.023,0 90.080,24.023,0 90.080,24.024,0 90.079,24.024,0 90.079,24.023,0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`;
  const k = parseBoundaryFile(kml, 'f.kml');
  assert.equal(k[0].name, 'বাড়ির জমি');
  assert.equal(measure(k[0].geometry).vertexCount, 4);
});

test('export to GeoJSON and KML and read back gives the same field', () => {
  const p0 = [24.0233, 90.079];
  const g = polygonFrom([p0, offset(p0, 60, 3), offset(p0, 52, 40), offset(p0, 8, 47), offset(p0, -3, 20)]);
  const parcel = { id: 'DHM-CH-0142', name: { en: 'Field east of the house' }, boundary: { ...g, source: 'gps', posErr: 4, at: '2026-11-11' } };
  const a = measure(g).areaM2;
  const gj = toGeoJSON(parcel);
  assert.equal(gj.properties.source, 'gps');
  assert.ok(rel(measure(parseBoundaryFile(JSON.stringify(gj))[0].geometry).areaM2, a) < 1e-9);
  assert.ok(rel(measure(parseBoundaryFile(toKML(parcel), 'x.kml')[0].geometry).areaM2, a) < 1e-9);
});

test('a parcel without a boundary has none; nothing is made up from its pin', () => {
  assert.equal(boundaryOf({ id: 'X', lat: 24, lon: 90, area_dec: 50 }), null);
  assert.equal(boundaryOf({ id: 'X', boundary: { type: 'Polygon', coordinates: [[[90, 24], [90.001, 24], [90.001, 24.001]]], source: 'guess' } }), null);
  assert.equal(boundaryStatus(null), 'none');
  assert.equal(boundaryStatus({ source: 'survey', checked: { date: '2026-11-11' } }), 'verified');
  assert.equal(boundaryStatus({ source: 'drawn', checked: { date: '2026-11-11' } }), 'checked');
  assert.equal(boundaryStatus({ source: 'survey' }), 'unverified');
  // A demo sample outline is drawn, but it is never treated as the field's measured boundary.
  const sample = { id: 'X', boundary: { type: 'Polygon', coordinates: [[[90, 24], [90.001, 24], [90.001, 24.001]]], source: 'sample' } };
  assert.ok(boundaryOf(sample));
  assert.equal(boundaryStatus(boundaryOf(sample)), 'sample');
  assert.equal(measuredBoundaryOf(sample), null);
});

test('GPS walk: poor readings and near-duplicates are dropped, corners averaged by accuracy', () => {
  const p0 = [24.0, 90.0];
  const track = [[0, 0, 4], [0.5, 0, 4], [30, 0, 5], [30, 1, 40], [30, 25, 6], [0, 25, 5], [0.5, 0.5, 4]]
    .map(([x, y, acc]) => { const [lat, lon] = offset(p0, x, y); return { lat, lon, acc }; });
  const t = fromTrack(track);
  assert.equal(t.points.length, 4);
  assert.equal(t.dropped, 3);
  assert.ok(rel(measure(t.geometry).areaM2, 750) < 1e-3);
  const f = averageFix([{ lat: 24, lon: 90, acc: 3 }, { lat: 24.0001, lon: 90, acc: 30 }]);
  assert.ok(Math.abs(f.lat - 24) < 0.000002 && f.n === 2);
});

test('svg path centroid: the largest ring wins, small islands do not pull it', () => {
  const c = svgPathCentroid('M0,0L10,0L10,10L0,10Z M100,100L101,100L101,101Z');
  assert.ok(Math.abs(c[0] - 5) < 1e-9 && Math.abs(c[1] - 5) < 1e-9);
  assert.equal(svgPathCentroid(''), null);
});

test('a label point sits inside the field, even an L-shaped one', () => {
  const p0 = [24.0, 90.0];
  const L = polygonFrom([[0, 0], [100, 0], [100, 20], [20, 20], [20, 100], [0, 100]].map(([x, y]) => offset(p0, x, y)));
  const [lat, lon] = labelPoint(L);
  const ring = L.coordinates[0];
  let c = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c; }
  assert.ok(c);
});

test('helpers: shape key changes with the shape; uncertainty; picture box', () => {
  const g1 = polygonFrom([[24, 90], [24, 90.001], [24.001, 90.001]]), g2 = polygonFrom([[24, 90], [24, 90.001], [24.0011, 90.001]]);
  assert.notEqual(shapeKey(g1), shapeKey(g2));
  assert.equal(areaUncertaintyM2(200, 3), 600);
  assert.equal(areaUncertaintyM2(200, null), null);
  const [[ring]] = toBoxPercent(g1, [[23.999, 89.999], [24.002, 90.002]]);
  assert.ok(ring.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100));
});

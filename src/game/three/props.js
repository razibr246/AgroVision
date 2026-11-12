// Low-poly builders for everything that stands in the five worlds: houses in each local style, the seed shop and the
// FieldShift kiosk, water sources, markets, shelters, trees, animals and landmarks. Each builder returns a Group whose
// origin is on the ground at the object's centre, facing +z. Things that move (flags, animals, flowing water) are
// tagged in userData so world.js can animate them; everything else is merged into a few big meshes after building.
import * as THREE from 'three';
import { mat, canvasTex } from './people.js';
import { buildPalm, frondGeometry } from './palm.js';
import { buildTree, buildBamboo } from './leafytree.js';
import { buildBanana } from './banana.js';
import { buildAnimal } from './animals.js';
import { surface, boxGeo, scaleUV, roofGeo, eaveFringeGeo, gableEndGeo } from './surfaces.js';
let bananaSeed = 0; // each banana plant grows its own way, the same way every visit
let treeSeed = 5; // each tree grows its own way, the same way every visit
let palmSeed = 3; // each palm in a world leans and turns its own way, the same way every visit

const M = (c, o = {}) => mat(c, { flat: true, ...o });
function put(p, g, c, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  const m = new THREE.Mesh(g, typeof c === 'string' ? M(c) : c);
  m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...scale);
  m.castShadow = true; m.receiveShadow = true; p.add(m); return m;
}
const box = (p, w, h, d, c, pos, rot) => put(p, new THREE.BoxGeometry(w, h, d), c, pos, rot);
const cyl = (p, rt, rb, h, c, pos, rot, seg = 8) => put(p, new THREE.CylinderGeometry(rt, rb, h, seg), c, pos, rot);
const cone = (p, r, h, c, pos, rot, seg = 8) => put(p, new THREE.ConeGeometry(r, h, seg), c, pos, rot);
const blob = (p, r, c, pos, scale, detail = 1) => put(p, new THREE.IcosahedronGeometry(r, detail), c, pos, [0, 0, 0], scale);
const half = (p, r, c, pos, scale) => put(p, new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, pos, [0, 0, 0], scale);
// a gable roof along x: length, width, height, with its eaves at y
function gable(p, len, wid, h, c, y, pos = [0, 0]) {
  const g = new THREE.CylinderGeometry(1, 1, len, 3, 1, false, Math.PI / 2); g.rotateZ(Math.PI / 2);
  return put(p, g, c, [pos[0], y + h / 3, pos[1]], [0, 0, 0], [1, h / 1.5, wid / 1.732]);
}
const pyramid = (p, w, h, c, y, seg = 4) => put(p, new THREE.ConeGeometry(w * 0.72, h, seg), c, [0, y + h / 2, 0], [0, Math.PI / 4, 0]);
const G = () => new THREE.Group();
// ---- real surfaces (surfaces.js): brick, mud, lime, tin, thatch, bamboo, wood, concrete at their true size ----
const sbox = (p, w, h, d, name, tint, pos = [0, 0, 0], rot, o) => put(p, boxGeo(w, h, d, name, pos, o), surface(name, tint), pos, rot);
function scyl(p, rt, rb, h, name, tint, pos = [0, 0, 0], rot, seg = 14) {
  const geo = scaleUV(new THREE.CylinderGeometry(rt, rb, h, seg), Math.PI * (rt + rb), h, name, pos);
  return put(p, geo, surface(name, tint), pos, rot);
}
// A pitched roof over walls wallLen x wallWid (gable along x), rise from the wall top to the ridge, eaves `over` past
// the walls at the same pitch; the gable triangles take the wall surface (or the roof's, for a tin house).
function pitched(p, wallLen, wallWid, rise, over, roof, rtint, y, o = {}) {
  const half = wallWid / 2 + over, rr = rise * half / (wallWid / 2), thick = o.thick ?? (roof === 'thatch' ? 0.28 : 0.04);
  const len = wallLen + 2 * (o.overEnd ?? over * 0.8), ey = y + rise - rr + thick;
  if (o.ends !== false) put(p, gableEndGeo(wallLen, wallWid, rise, o.ends ?? roof), surface(o.ends ?? roof, o.etint ?? rtint), [0, y, 0]);
  put(p, roofGeo(len, half * 2, rr, thick, roof), surface(roof, rtint), [0, ey, 0]);
  if (roof === 'thatch') { const f = put(p, eaveFringeGeo(len, half * 2, rr, 0.3), surface('thatchEdge', rtint), [0, ey - thick + 0.03, 0]); f.castShadow = false; }
  return ey;
}
const INSIDE = () => mat('#14100c', { rough: 1 });
function shalf(p, r, name, tint, pos, scale = [1, 1, 1]) {
  const geo = scaleUV(new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), Math.PI * 2 * r, Math.PI * r / 2, name, pos, { foot: false });
  return put(p, geo, surface(name, tint), pos, [0, 0, 0], scale);
}
const spyr = (p, w, h, name, tint, y) => put(p, scaleUV(new THREE.ConeGeometry(w * 0.72, h, 4, 1, true), w * 4, Math.hypot(h, w / 2), name, [0, y, 0], { foot: false }), surface(name, tint, { side: THREE.DoubleSide }), [0, y + h / 2, 0], [0, Math.PI / 4, 0]);
const GOLD = () => mat('#d9a93a', { rough: 0.35, metal: 0.75 });
// A doorway: the dark room behind, a timber frame, a threshold, and two plank leaves, one shut and one swung open.
function door(p, w, h, x, z, c = '#4a3020', y = 0) {
  box(p, w, h, 0.04, INSIDE(), [x, y + h / 2, z - 0.01]);
  const ft = '#6e5a46';
  for (const s of [-1, 1]) sbox(p, 0.09, h + 0.09, 0.12, 'wood', ft, [x + s * (w / 2 + 0.045), y + (h + 0.09) / 2, z + 0.02]);
  sbox(p, w + 0.18, 0.1, 0.13, 'wood', ft, [x, y + h + 0.05, z + 0.02]);
  sbox(p, w + 0.18, 0.05, 0.16, 'wood', '#5a4838', [x, y + 0.025, z + 0.04]);
  const lw = w / 2 - 0.01;
  sbox(p, lw, h - 0.03, 0.04, 'wood', c, [x - w / 4, y + h / 2, z + 0.01]);
  const hinge = G(); hinge.position.set(x + w / 2 - 0.01, y, z + 0.03); hinge.rotation.y = 1.05; p.add(hinge);
  sbox(hinge, lw, h - 0.03, 0.04, 'wood', c, [-lw / 2, h / 2, 0]);
}
// A window: dark inside, iron bars, a frame and sill, and two shutters folded open against the wall.
function win(p, w, h, x, y, z, c = '#2a2420', frame = '#e9e2d0') {
  box(p, w, h, 0.04, INSIDE(), [x, y, z - 0.01]);
  const bars = Math.max(2, Math.round(w / 0.13) - 1);
  for (let k = 1; k <= bars; k++) cyl(p, 0.008, 0.008, h, mat('#2a2826', { rough: 0.5, metal: 0.6 }), [x - w / 2 + (k * w) / (bars + 1), y, z + 0.03], [0, 0, 0], 5);
  for (const s of [-1, 1]) sbox(p, 0.07, h + 0.14, 0.1, 'wood', frame, [x + s * (w / 2 + 0.035), y, z + 0.03]);
  sbox(p, w + 0.14, 0.07, 0.1, 'wood', frame, [x, y + h / 2 + 0.035, z + 0.03]);
  sbox(p, w + 0.26, 0.06, 0.18, 'concrete', '#c9c0b0', [x, y - h / 2 - 0.03, z + 0.06]);
  for (const s of [-1, 1]) { const hg = G(); hg.position.set(x + s * (w / 2 + 0.07), y, z + 0.06); hg.rotation.y = s * 1.95; p.add(hg); sbox(hg, w / 2, h, 0.035, 'wood', frame, [-s * w / 4, 0, 0]); }
}

// ---- patterns ----
const brickTex = () => canvasTex('brick', 64, 64, (c, w, h) => {
  c.fillStyle = '#a9502f'; c.fillRect(0, 0, w, h); c.fillStyle = '#c96a45';
  for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < w; x += 16) c.fillRect(x + 1, y + 1, 14, 6);
}, [3, 2]);
const tharuTex = () => canvasTex('tharu', 128, 64, (c, w, h) => {
  c.fillStyle = '#e9dcc0'; c.fillRect(0, 0, w, h); c.fillStyle = '#9e5a34'; c.fillRect(0, h - 14, w, 14);
  c.fillStyle = '#b8322a'; for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, h - 14); c.lineTo(x + 8, h - 24); c.lineTo(x + 16, h - 14); c.fill(); }
  c.fillStyle = '#1e1a18'; for (let x = 4; x < w; x += 16) { c.fillRect(x, 10, 2, 14); c.fillRect(x - 4, 16, 10, 2); }
  c.fillStyle = '#ffffff'; for (let x = 10; x < w; x += 16) { c.beginPath(); c.arc(x, 30, 2.5, 0, Math.PI * 2); c.fill(); }
}, [2, 1]);
const wovenTex = () => canvasTex('woven', 64, 64, (c, w, h) => {
  c.fillStyle = '#c9a66b'; c.fillRect(0, 0, w, h); c.fillStyle = '#a8834c';
  for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (((x + y) / 8) % 2) c.fillRect(x, y, 8, 4); else c.fillRect(x, y + 4, 8, 4);
}, [3, 2]);
const truckTex = () => canvasTex('truckart', 128, 64, (c, w, h) => {
  const cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#264653', '#ff66c4', '#3a86ff'];
  c.fillStyle = '#f1faee'; c.fillRect(0, 0, w, h);
  for (let k = 0; k < 7; k++) { c.fillStyle = cols[k]; c.fillRect(0, k * 9, w, 5); }
  for (let x = 8; x < w; x += 22) { c.fillStyle = cols[(x / 22) % 7 | 0]; c.beginPath(); c.arc(x, 32, 8, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, 32, 3, 0, Math.PI * 2); c.fill(); }
});
const leafTex = () => canvasTex('fsleaf', 64, 64, (c, w, h) => {
  c.fillStyle = '#123d24'; c.fillRect(0, 0, w, h);
  c.save(); c.translate(32, 30); c.rotate(-0.6); c.fillStyle = '#7fd36b'; c.beginPath(); c.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#123d24'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-16, 0); c.lineTo(16, 0); c.stroke(); c.restore();
  c.fillStyle = '#e9f5e3'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('FieldShift', 32, 56);
});

// ---- houses ----
function brickhouse(p = {}) {
  if (p.style === 'cortijo') return cortijo();
  if (p.style === 'fazenda') return fazenda();
  if (p.style === 'ranch') return ranch();
  const g = G();
  sbox(g, 7, 0.3, 5.4, 'concrete', '#b9b2a6', [0, 0.15, 0]); // the plinth
  sbox(g, 6.6, 2.85, 5, 'brick', '#ffffff', [0, 1.725, 0], undefined, { top: 3.15 });
  sbox(g, 4.2, 2.6, 4, 'lime', '#efe6d6', [-1.1, 4.4, -0.3], undefined, { top: 5.7 });
  sbox(g, 6.9, 0.18, 5.3, 'concrete', '#d9cfbd', [0, 3.15, 0]); sbox(g, 4.5, 0.16, 4.3, 'concrete', '#d9cfbd', [-1.1, 5.75, -0.3]);
  for (const [x, z, w, d] of [[0, 2.6, 6.9, 0.12], [0, -2.6, 6.9, 0.12], [3.4, 0, 0.12, 5.3]]) sbox(g, w, 0.5, d, 'lime', '#e8dfcf', [x, 3.5, z]);
  cyl(g, 0.55, 0.55, 1, mat('#1a1a1a', { rough: 0.6 }), [-2.4, 6.35, -1.2], [0, 0, 0], 20); // the black roof water tank
  for (const [x, w] of [[1.4, 1.5], [-1.4, 1.3]]) sbox(g, w, 0.16, 0.24, 'concrete', '#c9c2b4', [x, x > 0 ? 2.76 : 2.3, 2.5]); // lintels
  door(g, 1.2, 2.2, 1.4, 2.51, '#2f5f8f', 0.3); win(g, 1, 0.9, -1.4, 1.7, 2.51, '#283844', '#e9e2d0'); win(g, 0.9, 0.8, -1.1, 4.4, 1.71, '#283844', '#e9e2d0');
  for (let k = 0; k < 8; k++) sbox(g, 1, 0.2, 0.32, 'concrete', '#cfc5b3', [3.9, 0.1 + k * 0.2, 0.9 - k * 0.3]); // the stair to the roof
  return g;
}
// Andalucía: a white-washed cortijo, an ochre band along the foot, barred windows with green shutters, a terracotta
// barrel-tile roof, a chimney and a vine pergola over the door.
function cortijo() {
  const g = G();
  sbox(g, 6.8, 2.9, 5, 'lime', '#fbf8f0', [0, 1.45, 0], undefined, { top: 2.9 });
  sbox(g, 6.84, 0.55, 5.04, 'lime', '#d6ac5e', [0, 0.275, 0]); // the zócalo
  pitched(g, 6.8, 5, 1.2, 0.35, 'tile', '#dba48a', 2.9, { ends: 'lime', etint: '#fbf8f0', overEnd: 0.25, thick: 0.08 });
  sbox(g, 0.6, 1.4, 0.6, 'lime', '#fbf8f0', [2.2, 4.1, -0.9]); sbox(g, 0.8, 0.08, 0.8, 'tile', '#c9805a', [2.2, 4.84, -0.9]);
  door(g, 1.1, 2.2, 0.9, 2.51, '#5a3a22'); for (const x of [-1.6, 2.6]) win(g, 0.8, 1.0, x, 1.6, 2.51, '#2a2420', '#2f5a3a');
  sbox(g, 7.4, 0.08, 1.8, 'wood', '#8a7058', [0, 2.4, 3.3], [0.12, 0, 0], { foot: false });
  for (const x of [-3.4, 0, 3.4]) scyl(g, 0.07, 0.08, 2.4, 'wood', '#7a6450', [x, 1.2, 4.1]);
  return g;
}
// Mato Grosso: a farmhouse with cream-painted walls, a clay-tile roof run out over a deep veranda on posts, blue
// window frames and a tiled floor.
function fazenda() {
  const g = G();
  sbox(g, 7.4, 0.35, 6.6, 'concrete', '#c4a888', [0, 0.175, 0.6]);
  sbox(g, 6.8, 2.8, 5, 'lime', '#efdfbc', [0, 1.75, 0], undefined, { top: 3.15 });
  pitched(g, 6.8, 5, 1.4, 1.6, 'tile', '#d29a82', 3.15, { ends: 'lime', etint: '#efdfbc', overEnd: 0.5, thick: 0.08 });
  for (const x of [-3.3, -1.1, 1.1, 3.3]) scyl(g, 0.09, 0.1, 2.12, 'wood', '#6e5a46', [x, 1.41, 3.6]); // up to the eave rafters
  door(g, 1.1, 2.2, 0, 2.51, '#2f5f8f', 0.35); for (const x of [-2.2, 2.2]) win(g, 0.9, 1.0, x, 1.9, 2.51, '#2a2420', '#3a6fa8');
  return g;
}
// Diamond Valley: a low ranch house in painted lap siding on a concrete foundation, a shallow corrugated metal roof,
// a covered porch on posts and a stove pipe.
function ranch() {
  const g = G();
  sbox(g, 8.2, 0.45, 5.4, 'concrete', '#bdb8ae', [0, 0.225, 0]);
  sbox(g, 8, 2.5, 5.2, 'siding', '#e6dfcf', [0, 1.7, 0], undefined, { top: 2.95 });
  pitched(g, 8, 5.2, 0.95, 0.5, 'tin', '#9aa29c', 2.95, { ends: 'siding', etint: '#e6dfcf', overEnd: 0.3 });
  sbox(g, 4.2, 0.12, 2.2, 'wood', '#8a7058', [1.4, 0.4, 3.7]);
  sbox(g, 4.4, 0.04, 2.4, 'tin', '#9aa29c', [1.4, 2.75, 3.75], [0.12, 0, 0], { foot: false });
  for (const x of [-0.6, 3.4]) sbox(g, 0.12, 2.3, 0.12, 'wood', '#efe9dc', [x, 1.6, 4.7]);
  door(g, 1, 2.1, 1.4, 2.61, '#7a3a2a', 0.45); for (const x of [-2.4, 3.2]) win(g, 1.1, 1.0, x, 1.85, 2.61, '#2a2420', '#f2efe8');
  scyl(g, 0.09, 0.09, 1.2, 'tin', '#5a5a58', [-2.5, 4.0, -1.0], undefined, 10);
  return g;
}
function mudhouse() {
  const g = G();
  sbox(g, 6.2, 2.7, 4.6, 'mud', '#cfae7c', [0, 1.35, 0], undefined, { top: 2.7 });
  sbox(g, 6.5, 0.16, 4.9, 'mud', '#a8865a', [0, 2.75, 0]); for (const z of [2.4, -2.4]) sbox(g, 6.5, 0.35, 0.14, 'mud', '#c4a06a', [0, 3, z]);
  for (let k = -3; k <= 3; k++) scyl(g, 0.06, 0.06, 0.5, 'wood', '#6e5a46', [k * 0.95, 2.6, 2.45], [Math.PI / 2, 0, 0], 8); // roof beam ends
  sbox(g, 0.9, 1.2, 0.9, 'mud', '#c4a06a', [1.8, 3.4, -1], [0, 0.3, 0]); box(g, 0.7, 0.5, 0.06, INSIDE(), [1.86, 3.6, -0.55], [0, 0.3, 0]); // a mangh (wind catcher)
  door(g, 1.1, 2, 0.8, 2.31, '#6b4a2b'); win(g, 0.6, 0.6, -1.6, 1.7, 2.31, '#2a2420', '#8a6a42');
  // a reed shade in front, on posts
  for (const x of [-2.6, 0, 2.6]) scyl(g, 0.06, 0.07, 2.3, 'wood', '#8a7058', [x, 1.15, 4]);
  sbox(g, 6, 0.06, 2.1, 'bamboo', '#e0c9a0', [0, 2.3, 3.2], [0.08, 0, 0], { foot: false });
  return g;
}
function tharuhouse() {
  const g = G(); const tm = M('#fff', { map: tharuTex() });
  sbox(g, 0.3 + 7.6, 0.3, 4.6, 'mud', '#a8865c', [0, 0.15, 0]);
  sbox(g, 7.6, 2.2, 4.2, 'mud', '#e2d2b4', [0, 1.4, 0], undefined, { top: 2.5 });
  box(g, 7.62, 1.0, 4.22, tm, [0, 1.0, 0]); // the painted band the Tharu women draw on the mud
  pitched(g, 7.6, 4.2, 1.9, 0.9, 'thatch', '#c2b08a', 2.5, { ends: 'mud', etint: '#e2d2b4', overEnd: 0.6 });
  door(g, 1, 1.9, -1.2, 2.11, '#5a3a22', 0.3); door(g, 1, 1.9, 2, 2.11, '#5a3a22', 0.3);
  for (const x of [-3.5, 0, 3.5]) scyl(g, 0.07, 0.08, 2.2, 'wood', '#7a6450', [x, 1.4, 2.9]);
  return g;
}
function bhutanhouse() {
  const g = G();
  sbox(g, 6.4, 2.8, 5.2, 'lime', '#f2ede2', [0, 1.4, 0]);
  sbox(g, 6.6, 2.2, 5.4, 'lime', '#f2ede2', [0, 3.9, 0]);
  sbox(g, 6.7, 0.35, 5.5, 'wood', '#8a4a2c', [0, 2.95, 0]); sbox(g, 6.8, 0.3, 5.6, 'wood', '#8a4a2c', [0, 5.05, 0]);
  // the rabsel: a projecting painted wooden window bay
  sbox(g, 3, 1.5, 0.5, 'wood', '#9a4a2a', [0, 3.95, 2.85]); for (let k = -1; k <= 1; k++) win(g, 0.7, 0.9, k * 0.95, 3.95, 3.12, '#2b1d16', '#d8a33a');
  win(g, 0.7, 0.8, -2.2, 1.6, 2.62, '#2b1d16', '#7a3b22'); win(g, 0.7, 0.8, 2.2, 1.6, 2.62, '#2b1d16', '#7a3b22');
  door(g, 1.1, 2, 0.3, 2.62, '#7a3b22');
  for (const [x, z] of [[-3, -2.4], [3, -2.4], [-3, 2.4], [3, 2.4]]) scyl(g, 0.08, 0.08, 0.8, 'wood', '#7a4a30', [x, 5.6, z]);
  pitched(g, 6.6, 5.4, 1.0, 0.6, 'tin', '#c4c9cc', 5.6, { ends: false, overEnd: 0.5 }); // the open attic under its raised roof
  // red chillies drying on the roof
  for (let k = 0; k < 40; k++) blob(g, 0.07, '#c92a1e', [-2.6 + (k % 10) * 0.55, 6.62 + Math.floor(k / 10) * 0.02, -1.6 + Math.floor(k / 10) * 0.32], [1.6, 0.6, 0.6], 0);
  return g;
}
function stilthouse() {
  const g = G();
  for (const x of [-2.6, 0, 2.6]) for (const z of [-2, 2]) scyl(g, 0.1, 0.11, 1.5, 'wood', '#7a6450', [x, 0.75, z]);
  sbox(g, 6, 0.2, 4.6, 'wood', '#8a7058', [0, 1.5, 0]);
  sbox(g, 5.6, 2, 4, 'bamboo', '#ffffff', [0, 2.6, 0], undefined, { foot: false });
  for (const [x, z] of [[-2.8, -2], [2.8, -2], [-2.8, 2], [2.8, 2]]) sbox(g, 0.12, 2.05, 0.12, 'wood', '#6e5a46', [x, 2.62, z]);
  pitched(g, 5.6, 4, 1.9, 0.8, 'thatch', '#c9b88e', 3.6, { ends: 'bamboo', etint: '#ffffff', overEnd: 0.6 });
  door(g, 1, 1.7, 0.8, 2.01, '#5a3a22', 1.6);
  for (let k = 0; k < 5; k++) sbox(g, 1, 0.06, 0.25, 'wood', '#7a6450', [0.8, 0.3 * k + 0.1, 3 - k * 0.22]);
  return g;
}

// ---- the seed shop and the FieldShift kiosk ----
function shed(p) {
  const g = G();
  const [wn, wt] = { brick: ['brick', '#ffffff'], mud: ['mud', '#cfae7c'], thatch: ['bamboo', '#ffffff'], bhutan: ['lime', '#f2ede2'] }[p.style] ?? ['bamboo', '#ffffff'];
  sbox(g, 4.4, 2.6, 0.2, wn, wt, [0, 1.3, -2.5]); sbox(g, 0.2, 2.6, 5, wn, wt, [-2.1, 1.3, 0]); sbox(g, 0.2, 2.6, 5, wn, wt, [2.1, 1.3, 0]);
  sbox(g, 4.6, 0.12, 5.2, 'concrete', '#b9b2a6', [0, 0.06, 0]); // the shop floor
  if (p.style === 'thatch') pitched(g, 4.4, 5, 1.4, 0.4, 'thatch', '#c2b08a', 2.6, { ends: false, overEnd: 0.4 });
  else sbox(g, 4.9, 0.05, 5.6, 'tin', p.style === 'bhutan' ? '#b4b9bc' : '#d0d4d4', [0, 2.7, 0.1], [-0.1, 0, 0], { foot: false });
  
  // Rear wall storage shelves
  box(g, 3.6, 0.08, 0.35, '#8c6239', [0, 1.85, -2.3]);
  box(g, 3.6, 0.08, 0.35, '#8c6239', [0, 1.25, -2.3]);
  // Bottles & cartons on shelves
  cyl(g, 0.05, 0.05, 0.22, '#2e7d32', [-1.2, 1.98, -2.3]);
  cyl(g, 0.06, 0.06, 0.25, '#d97706', [-0.8, 1.99, -2.3]);
  box(g, 0.18, 0.22, 0.12, '#2563eb', [0.8, 1.98, -2.3]);
  box(g, 0.22, 0.22, 0.14, '#dc2626', [1.2, 1.98, -2.3]);
  box(g, 0.26, 0.24, 0.16, '#059669', [-0.9, 1.39, -2.3]);
  box(g, 0.24, 0.22, 0.15, '#d97706', [0.9, 1.38, -2.3]);

  // Fertilizer & seed sacks stacked along side walls (leaving the center open for the shopkeeper)
  for (let k = 0; k < 4; k++) cyl(g, 0.32, 0.36, 0.8, k % 2 ? '#e2d3a8' : '#cdb985', [-1.4 + (k % 2) * 0.45, 0.4 + Math.floor(k / 2) * 0.75, -1.6 + (k % 2) * 0.3]);
  for (let k = 0; k < 4; k++) cyl(g, 0.32, 0.36, 0.8, k % 2 ? '#cdb985' : '#e2d3a8', [1.2 + (k % 2) * 0.45, 0.4 + Math.floor(k / 2) * 0.75, -1.6 + (k % 2) * 0.3]);

  // Hardwood counter & trim
  box(g, 3.2, 0.88, 0.85, '#6d4c2b', [0, 0.44, 1.38]);
  box(g, 3.3, 0.05, 0.92, '#55391d', [0, 0.90, 1.38]);

  // Seed sample clay bowls on counter
  for (let k = 0; k < 4; k++) {
    half(g, 0.22, '#d4c5b0', [-1.05 + k * 0.70, 0.92, 1.38], [1, 0.4, 1]);
    blob(g, 0.20, ['#e5b416', '#c9952a', '#5a9a3c', '#e0452c'][k], [-1.05 + k * 0.70, 1.01, 1.38], [1, 0.5, 1], 0);
  }

  const sign = box(g, 2.6, 0.7, 0.08, M('#fff', { map: leafTex() }), [0, 3.1, 2.5]);
  sign.material = M('#fff', { map: leafTex() });

  // ---- দোকানের মালিক (The Shopkeeper - রফিক ভাই standing behind the counter) ----
  const owner = G();
  owner.position.set(0, 0, 0.65);
  owner.userData.npc = { kind: 'shopkeeper', name: { bn: 'রফিক ভাই', en: 'Rafiq Bhai' } };

  const skin = '#9c6644';
  // Lungi & feet
  cyl(owner, 0.20, 0.24, 0.84, '#264653', [0, 0.42, 0], [0, 0, 0], 12);
  cyl(owner, 0.21, 0.21, 0.08, '#1e343e', [0, 0.82, 0], [0, 0, 0], 12);
  box(owner, 0.11, 0.04, 0.24, '#3a2a1e', [-0.10, 0.02, 0.02]);
  box(owner, 0.11, 0.04, 0.24, '#3a2a1e', [0.10, 0.02, 0.02]);
  box(owner, 0.08, 0.025, 0.06, skin, [-0.10, 0.05, 0.04]);
  box(owner, 0.08, 0.025, 0.06, skin, [0.10, 0.05, 0.04]);

  // Torso / White Fotua-kurta (in separate group for subtle breathing idle animation)
  const torso = G();
  box(torso, 0.44, 0.52, 0.26, '#f4f3ea', [0, 1.10, 0]);
  box(torso, 0.16, 0.08, 0.06, '#e2dfd2', [0, 1.34, 0.11]);
  box(torso, 0.09, 0.10, 0.02, '#e2dfd2', [-0.12, 1.18, 0.13]); // pocket
  cyl(torso, 0.007, 0.007, 0.06, '#1d4ed8', [-0.12, 1.23, 0.14], [0, 0, 0.1]); // pen

  // Traditional Gamcha on left shoulder
  box(torso, 0.11, 0.48, 0.04, '#c0392b', [-0.16, 1.12, 0.14], [0, 0, 0.06]);
  box(torso, 0.11, 0.36, 0.04, '#c0392b', [-0.16, 1.18, -0.14], [0, 0, 0.06]);
  owner.add(torso);
  owner.userData.torso = torso;

  // Head group (for smooth look-at head turns towards player when approaching)
  const head = G();
  head.position.set(0, 1.45, 0);
  cyl(head, 0.075, 0.085, 0.12, skin, [0, -0.06, 0], [0, 0, 0], 8);
  blob(head, 0.175, skin, [0, 0.09, 0], [1, 1.12, 0.94], 2);
  blob(head, 0.04, skin, [-0.17, 0.09, 0]);
  blob(head, 0.04, skin, [0.17, 0.09, 0]);
  cone(head, 0.025, 0.05, '#8c5838', [0, 0.08, 0.17], [Math.PI / 2, 0, 0], 4);

  // Eyes & facial expression
  box(head, 0.035, 0.022, 0.015, '#ffffff', [-0.06, 0.11, 0.155]);
  box(head, 0.035, 0.022, 0.015, '#ffffff', [0.06, 0.11, 0.155]);
  box(head, 0.018, 0.018, 0.01, '#1a1410', [-0.06, 0.11, 0.162]);
  box(head, 0.018, 0.018, 0.01, '#1a1410', [0.06, 0.11, 0.162]);
  box(head, 0.05, 0.014, 0.015, '#221a14', [-0.06, 0.14, 0.155], [0, 0, 0.06]);
  box(head, 0.05, 0.014, 0.015, '#221a14', [0.06, 0.14, 0.155], [0, 0, -0.06]);
  box(head, 0.09, 0.022, 0.015, '#221a14', [0, 0.045, 0.16]); // moustache
  box(head, 0.06, 0.012, 0.01, '#7a2018', [0, 0.02, 0.155]); // welcoming smile

  // Embroidered white prayer cap (Tupi) with emerald green band
  half(head, 0.18, '#faf9f5', [0, 0.15, 0], [1, 0.62, 0.96]);
  cyl(head, 0.178, 0.178, 0.03, '#2e7d32', [0, 0.145, 0], [0, 0, 0], 16);
  owner.add(head);
  owner.userData.head = head;

  // Arms and hands leaning on the counter
  cyl(owner, 0.06, 0.05, 0.28, '#f4f3ea', [-0.26, 1.16, 0.10], [0.45, 0, -0.15], 8);
  cyl(owner, 0.05, 0.042, 0.26, skin, [-0.23, 0.98, 0.25], [0.75, 0, 0.15], 8);
  box(owner, 0.08, 0.03, 0.11, skin, [-0.20, 0.915, 0.39]);

  cyl(owner, 0.06, 0.05, 0.28, '#f4f3ea', [0.26, 1.16, 0.12], [0.55, 0, 0.18], 8);
  cyl(owner, 0.05, 0.042, 0.26, skin, [0.22, 1.00, 0.27], [0.70, 0, -0.2], 8);
  blob(owner, 0.048, skin, [0.18, 0.94, 0.38]);
  cyl(owner, 0.038, 0.048, 0.08, '#d4af37', [0.18, 0.95, 0.42], [0.35, 0, 0], 10);

  g.add(owner);

  // ---- Counter Accessories (দাঁড়িপাল্লা, ক্যাশ বাক্স ও খাতা) ----
  // Brass balance scale
  cyl(g, 0.018, 0.024, 0.36, '#d4af37', [0.85, 1.08, 1.30], [0, 0, 0], 8);
  cyl(g, 0.007, 0.007, 0.32, '#d4af37', [0.85, 1.25, 1.30], [0, 0, Math.PI / 2], 8);
  half(g, 0.06, '#d4af37', [0.72, 1.09, 1.30], [1, 0.45, 1]);
  half(g, 0.06, '#d4af37', [0.98, 1.10, 1.30], [1, 0.45, 1]);
  cyl(g, 0.003, 0.003, 0.16, '#c5a028', [0.72, 1.17, 1.30]);
  cyl(g, 0.003, 0.003, 0.16, '#c5a028', [0.98, 1.17, 1.30]);
  cyl(g, 0.024, 0.024, 0.038, '#9c824c', [0.60, 0.92, 1.24], [0, 0, 0], 6);
  cyl(g, 0.016, 0.016, 0.028, '#9c824c', [0.60, 0.914, 1.31], [0, 0, 0], 6);

  // Wooden Cash Box
  box(g, 0.28, 0.12, 0.20, '#5c3a21', [-0.75, 0.96, 1.30]);
  box(g, 0.04, 0.03, 0.015, '#d4af37', [-0.75, 0.96, 1.41]);

  // Red ledger book
  box(g, 0.20, 0.025, 0.24, '#c0392b', [-0.48, 0.912, 1.28], [0, 0.12, 0]);
  box(g, 0.19, 0.02, 0.23, '#fbf8f0', [-0.48, 0.912, 1.28], [0, 0.12, 0]);

  // Wooden Abacus / Pen stand on counter
  box(g, 0.18, 0.03, 0.10, '#3e2723', [-0.48, 0.92, 1.48]);
  for (let k = 0; k < 4; k++) cyl(g, 0.003, 0.003, 0.08, '#d4af37', [-0.54 + k * 0.04, 0.925, 1.48], [Math.PI / 2, 0, 0]);

  // Traditional hanging hurricane brass lantern (হারিকেন) over counter
  cyl(g, 0.004, 0.004, 0.45, '#785522', [0, 2.50, 1.35]); // hanging wire
  cyl(g, 0.07, 0.09, 0.06, '#d4af37', [0, 2.26, 1.35]); // brass top
  cyl(g, 0.06, 0.06, 0.16, '#fef08a', [0, 2.15, 1.35]); // glass chimney with warm glow
  cyl(g, 0.09, 0.08, 0.08, '#b45309', [0, 2.03, 1.35]); // oil reservoir base
  const glowLight = new THREE.PointLight('#fef08a', 0.8, 4.5);
  glowLight.position.set(0, 2.15, 1.35);
  g.add(glowLight);

  return g;
}
// The agriculture office (office.js; placed by layout.js): a two-storey lime-washed government building on a raised
// plinth with steps, a columned verandah in front, barred windows, a parapet roof with a water tank, a notice board
// and a bench where farmers wait. Faces +z (the farm). Its name board stands beside it (life.js signs).
function upazila() {
  const g = G();
  const W = 6.4, D = 4.4, H1 = 3.0, H2 = 2.8;
  sbox(g, W + 1.2, 0.45, D + 1.6, 'concrete', '#b3ab9c', [0, 0.225, 0.4]); // plinth with the verandah floor
  for (let k = 0; k < 3; k++) sbox(g, 2.2, 0.15 * (k + 1), 0.3, 'concrete', '#a9a192', [0, 0.075 * (k + 1), D / 2 + 1.2 + 0.3 * (3 - k)]); // three steps up to the verandah
  sbox(g, W, H1, D, 'lime', '#ece6d6', [0, 0.45 + H1 / 2, 0], undefined, { top: H1 });
  sbox(g, W + 0.3, 0.18, D + 1.5, 'concrete', '#d9d3c4', [0, 0.45 + H1 + 0.09, 0.55]); // first floor slab, over the verandah
  sbox(g, W, H2, D, 'lime', '#e4ddcb', [0, 0.45 + H1 + 0.18 + H2 / 2, 0], undefined, { top: H2 });
  const top = 0.45 + H1 + 0.18 + H2;
  sbox(g, W + 0.2, 0.16, D + 0.2, 'concrete', '#cfc8b8', [0, top + 0.08, 0]);
  for (const [w, d, x, z] of [[W + 0.2, 0.12, 0, D / 2 + 0.04], [W + 0.2, 0.12, 0, -D / 2 - 0.04], [0.12, D + 0.2, W / 2 + 0.04, 0], [0.12, D + 0.2, -W / 2 - 0.04, 0]])
    sbox(g, w, 0.5, d, 'lime', '#e9e3d3', [x, top + 0.41, z]); // the parapet
  scyl(g, 0.55, 0.55, 0.9, 'concrete', '#3f4a52', [W / 2 - 1.1, top + 0.61, -D / 2 + 1.0]); // water tank
  for (const x of [-W / 2 + 0.3, -1.2, 1.2, W / 2 - 0.3]) sbox(g, 0.28, H1, 0.28, 'lime', '#f1ece0', [x, 0.45 + H1 / 2, D / 2 + 1.1]); // verandah columns
  sbox(g, W + 0.3, 0.08, 0.6, 'concrete', '#4f8a5c', [0, 0.45 + H1 + 0.02, D / 2 + 1.0]); // green band on the verandah edge
  door(g, 1.1, 2.2, 0, D / 2 + 0.01, '#2f6b3d', 0.45);
  for (const x of [-2.2, 2.2]) win(g, 1.0, 1.1, x, 0.45 + 1.55, D / 2 + 0.01);
  for (const x of [-2.2, 0, 2.2]) win(g, 1.0, 1.1, x, 0.45 + H1 + 0.18 + 1.45, D / 2 + 0.01);
  for (const s of [-1, 1]) for (const z of [-1, 1]) { const side = G(); side.position.set(s * (W / 2 + 0.01), 0, z * 1.1); side.rotation.y = s * Math.PI / 2; g.add(side); win(side, 0.9, 1.0, 0, 0.45 + 1.55, 0); } // side windows
  // notice board with pinned papers, and a bench where farmers wait their turn
  sbox(g, 1.3, 0.9, 0.06, 'wood', '#5a4430', [-2.6, 0.45 + 1.4, D / 2 + 0.04]);
  for (let k = 0; k < 5; k++) box(g, 0.24, 0.3, 0.01, k % 2 ? '#f4efe0' : '#fde68a', [-3.0 + k * 0.2 + (k > 2 ? 0.1 : 0), 0.45 + 1.4 + (k % 2 ? 0.12 : -0.14), D / 2 + 0.08], [0, 0, (k - 2) * 0.06]);
  sbox(g, 1.6, 0.06, 0.4, 'wood', '#7a5a38', [2.4, 0.45 + 0.45, D / 2 + 0.55]);
  for (const x of [1.75, 3.05]) sbox(g, 0.06, 0.42, 0.36, 'wood', '#5a4430', [x, 0.45 + 0.21, D / 2 + 0.55]);
  // a flag pole at the corner of the plinth
  cyl(g, 0.04, 0.05, 5.2, mat('#d8d8d8', { metal: 0.6, rough: 0.35 }), [W / 2 + 0.4, 0.45 + 2.6, D / 2 + 1.0], [0, 0, 0], 8);
  const fl = box(g, 1.1, 0.66, 0.02, '#1f7a45', [W / 2 + 0.97, 0.45 + 4.85, D / 2 + 1.0]); fl.userData.wave = true;
  return g;
}

function kiosk() {
  const g = G();
  sbox(g, 3.4, 0.2, 3.0, 'concrete', '#b9b2a6', [0, 0.1, 0.1]);
  sbox(g, 3, 2.6, 2.6, 'lime', '#efe8d8', [0, 1.3, 0], undefined, { top: 2.6 }); sbox(g, 3.3, 0.2, 2.9, 'concrete', '#4f8a5c', [0, 2.7, 0]);
  door(g, 0.9, 2, -0.7, 1.31, '#2f6b3d', 0.2);
  const s = box(g, 1.2, 0.9, 0.06, M('#fff', { map: leafTex() }), [0.7, 1.6, 1.32]); s.material = new THREE.MeshStandardMaterial({ map: leafTex(), emissive: '#ffffff', emissiveMap: leafTex(), emissiveIntensity: 0.6 });
  box(g, 0.08, 1.5, 0.08, '#555', [1.6, 3.4, 0.9]); box(g, 0.5, 0.8, 0.05, '#2b6cb0', [1.6, 3.9, 0.9]); // the dish

  // Veranda service counter / desk
  box(g, 1.1, 0.85, 0.55, '#7a5a38', [0.65, 0.425, 1.58]);
  // Laptop & tablet on counter
  box(g, 0.32, 0.02, 0.22, '#374151', [0.55, 0.86, 1.58]);
  box(g, 0.32, 0.20, 0.02, '#1f2937', [0.55, 0.96, 1.48], [-0.2, 0, 0]);
  // Farmer advisory files & register
  box(g, 0.24, 0.03, 0.28, '#1e3a8a', [0.90, 0.865, 1.58], [0, 0.1, 0]);

  // Extension Officer NPC
  const officer = G();
  officer.position.set(0.65, 0, 0.95);
  officer.userData.npc = { kind: 'officer', name: 'SAAO' };

  const skin = '#9c6644';
  cyl(officer, 0.18, 0.20, 0.84, '#1e293b', [0, 0.42, 0], [0, 0, 0], 10);
  box(officer, 0.10, 0.04, 0.22, '#0f172a', [-0.09, 0.02, 0.02]);
  box(officer, 0.10, 0.04, 0.22, '#0f172a', [0.09, 0.02, 0.02]);

  const offTorso = G();
  box(offTorso, 0.42, 0.50, 0.24, '#93c5fd', [0, 1.08, 0]);
  box(offTorso, 0.14, 0.08, 0.06, '#60a5fa', [0, 1.32, 0.10]);
  cyl(offTorso, 0.005, 0.005, 0.32, '#dc2626', [0, 1.16, 0.125]);
  box(offTorso, 0.06, 0.08, 0.01, '#ffffff', [0, 0.98, 0.13]);
  officer.add(offTorso);
  officer.userData.torso = offTorso;

  const offHead = G();
  offHead.position.set(0, 1.42, 0);
  cyl(offHead, 0.07, 0.08, 0.10, skin, [0, -0.05, 0], [0, 0, 0], 8);
  blob(offHead, 0.17, skin, [0, 0.09, 0], [1, 1.1, 0.92], 2);
  blob(offHead, 0.035, skin, [-0.16, 0.09, 0]);
  blob(offHead, 0.035, skin, [0.16, 0.09, 0]);
  half(offHead, 0.175, '#18181b', [0, 0.13, -0.01], [1.02, 0.85, 1.02]);
  box(offHead, 0.03, 0.02, 0.015, '#ffffff', [-0.055, 0.10, 0.155]);
  box(offHead, 0.03, 0.02, 0.015, '#ffffff', [0.055, 0.10, 0.155]);
  box(offHead, 0.016, 0.016, 0.01, '#1e293b', [-0.055, 0.10, 0.162]);
  box(offHead, 0.016, 0.016, 0.01, '#1e293b', [0.055, 0.10, 0.162]);
  box(offHead, 0.045, 0.03, 0.01, '#d4af37', [-0.055, 0.10, 0.166]);
  box(offHead, 0.045, 0.03, 0.01, '#d4af37', [0.055, 0.10, 0.166]);
  box(offHead, 0.03, 0.006, 0.01, '#d4af37', [0, 0.10, 0.166]);
  box(offHead, 0.05, 0.012, 0.01, '#831843', [0, 0.02, 0.155]);
  officer.add(offHead);
  officer.userData.head = offHead;

  cyl(officer, 0.055, 0.045, 0.28, '#93c5fd', [-0.22, 1.12, 0.10], [0.55, 0, -0.15], 8);
  cyl(officer, 0.045, 0.038, 0.26, skin, [-0.19, 0.95, 0.26], [0.75, 0, 0.12], 8);
  box(officer, 0.07, 0.025, 0.09, skin, [-0.15, 0.87, 0.38]);

  cyl(officer, 0.055, 0.045, 0.28, '#93c5fd', [0.22, 1.12, 0.10], [0.55, 0, 0.15], 8);
  cyl(officer, 0.045, 0.038, 0.26, skin, [0.19, 0.95, 0.26], [0.75, 0, -0.12], 8);
  box(officer, 0.07, 0.025, 0.09, skin, [0.15, 0.87, 0.38]);

  g.add(officer);
  return g;
}

// ---- water sources ----
function pumphouse() {
  const g = G(); const bm = M('#fff', { map: brickTex() });
  sbox(g, 2.6, 2.3, 2.6, 'brick', '#ffffff', [0, 1.15, 0], undefined, { top: 2.3 }); sbox(g, 2.9, 0.16, 2.9, 'concrete', '#cfc5b3', [0, 2.35, 0]); door(g, 0.8, 1.7, -0.6, 1.31, '#2f5f8f');
  cyl(g, 0.16, 0.16, 1, mat('#5f6a70', { rough: 0.45, metal: 0.6 }), [0.5, 0.9, 1.6], [Math.PI / 2, 0, 0], 16);
  sbox(g, 1.6, 0.5, 1.4, 'concrete', '#bdb3a2', [0.5, 0.25, 2.6]);
  const jet = box(g, 0.3, 0.6, 0.5, new THREE.MeshStandardMaterial({ color: '#bfe6f6', transparent: true, opacity: 0.75, roughness: 0.1 }), [0.5, 0.6, 2.2]);
  jet.userData.flow = true; jet.castShadow = false;
  return g;
}
function channel(p) {
  const g = G();
  box(g, 0.7, 0.25, p.len, '#c2b8a6', [0, 0.12, 0]);
  const w = box(g, 0.45, 0.06, p.len, new THREE.MeshStandardMaterial({ color: '#7fb9cc', roughness: 0.1 }), [0, 0.24, 0]); w.castShadow = false;
  return g;
}
function mogha() {
  const g = G();
  box(g, 2.4, 1, 0.5, '#bdb3a2', [0, 0.3, 0]); cyl(g, 0.2, 0.2, 1.4, '#6f7a80', [0, 0.25, 0.9], [Math.PI / 2, 0, 0], 10);
  box(g, 1, 0.3, 3, '#a89272', [0, -0.05, 2.4]);
  return g;
}
function stw() {
  const g = G();
  box(g, 1.8, 0.2, 1.4, '#bdb3a2', [0, 0.1, 0]); box(g, 1, 0.7, 0.6, '#c62a2a', [0, 0.55, 0]);
  cyl(g, 0.25, 0.25, 0.12, '#333', [0.55, 0.6, 0], [0, 0, Math.PI / 2], 14);
  cyl(g, 0.08, 0.08, 1.8, '#3a8bd1', [0, 0.4, 1.2], [Math.PI / 2, 0, 0]);
  box(g, 1.4, 0.3, 1.2, '#a89272', [0, 0.05, 2.4]);
  return g;
}
function stream() {
  const g = G();
  for (let k = 0; k < 8; k++) blob(g, 0.35, '#8b8f8c', [-0.6 + (k % 2) * 1.2, 0.15, -1.6 + Math.floor(k / 2) * 0.9], [1, 0.6, 1], 0);
  cyl(g, 0.07, 0.07, 1.5, '#9c8a4a', [0, 0.8, 0.4], [1.2, 0, 0]);
  const w = box(g, 0.5, 0.08, 4, new THREE.MeshStandardMaterial({ color: '#8fd3e6', roughness: 0.1, transparent: true, opacity: 0.85 }), [0, 0.18, -0.5]); w.castShadow = false; w.userData.flow = true;
  return g;
}

// ---- markets ----
function tractor(p) {
  const g = G();
  const body = p?.red ? '#c62a2a' : '#2f5fa8';
  box(g, 1.4, 1, 2.6, body, [0, 1.1, 0]); box(g, 1.2, 0.6, 1.2, body, [0, 1.7, 0.6]);
  cyl(g, 0.05, 0.05, 1, '#333', [0.4, 2.1, 1]);
  box(g, 1.3, 1, 1, '#2a2a2a', [0, 2.1, -0.6]); box(g, 1.5, 0.1, 1.3, body, [0, 2.65, -0.5]);
  for (const s of [-1, 1]) { cyl(g, 0.8, 0.8, 0.45, '#1c1c1c', [s * 0.85, 0.8, -0.8], [0, 0, Math.PI / 2], 14); cyl(g, 0.45, 0.45, 0.3, '#1c1c1c', [s * 0.75, 0.45, 1.1], [0, 0, Math.PI / 2], 12); }
  return g;
}
function trolley() {
  const g = G();
  const t = tractor({}); t.position.z = 3.2; g.add(t);
  box(g, 2.2, 0.15, 3.6, '#8a5a2b', [0, 0.95, -0.9]); for (const s of [-1, 1]) box(g, 0.1, 0.8, 3.6, '#c62a2a', [s * 1.1, 1.4, -0.9]);
  for (const s of [-1, 1]) cyl(g, 0.5, 0.5, 0.35, '#1c1c1c', [s * 1.25, 0.5, -0.9], [0, 0, Math.PI / 2], 12);
  for (let k = 0; k < 6; k++) cyl(g, 0.32, 0.36, 0.8, '#e2d3a8', [-0.5 + (k % 2) * 1, 1.45, -2.2 + Math.floor(k / 2) * 0.9], [Math.PI / 2, 0, 0]);
  return g;
}
function donkeycart() {
  const g = G();
  box(g, 1.8, 0.12, 2.4, '#8a6a42', [0, 0.85, -0.5]); for (const s of [-1, 1]) cyl(g, 0.55, 0.55, 0.1, '#5a3a22', [s * 1, 0.55, -0.5], [0, 0, Math.PI / 2], 12);
  for (const s of [-1, 1]) box(g, 0.08, 0.08, 2.4, '#6b4a2b', [s * 0.45, 0.9, 1.5]);
  const d = animal('donkey'); d.position.set(0, 0, 1.9); g.add(d);
  for (let k = 0; k < 4; k++) cyl(g, 0.3, 0.33, 0.7, '#e2d3a8', [-0.4 + (k % 2) * 0.8, 1.2, -1 + Math.floor(k / 2) * 0.9], [Math.PI / 2, 0, 0]);
  return g;
}
function oxcart() {
  const g = G();
  box(g, 1.7, 0.12, 2.8, '#8a6a42', [0, 1.05, -0.6]);
  for (const s of [-1, 1]) { const w = cyl(g, 0.85, 0.85, 0.12, '#6b4a2b', [s * 1, 0.85, -0.6], [0, 0, Math.PI / 2], 14); w.userData.wheel = true; }
  const hood = new THREE.CylinderGeometry(0.9, 0.9, 2, 12, 1, true, -Math.PI / 2, Math.PI); hood.rotateX(Math.PI / 2); hood.rotateZ(0);
  put(g, hood, M('#c9a66b', { side: THREE.DoubleSide }), [0, 1.15, -0.8], [0, 0, 0]);
  box(g, 0.1, 0.1, 2.6, '#6b4a2b', [0, 1.1, 1.6]);
  for (const s of [-1, 1]) { const o = animal('ox'); o.position.set(s * 0.6, 0, 2.6); g.add(o); }
  return g;
}
function stall(p) {
  const g = G();
  for (const [x, z] of [[-1.5, -1], [1.5, -1], [-1.5, 1], [1.5, 1]]) scyl(g, 0.06, 0.07, 2.4, 'wood', '#a8935a', [x, 1.2, z], undefined, 8);
  sbox(g, 3.6, 0.04, 2.8, 'tin', '#c9cfd0', [0, 2.45, 0], [0.08, 0, 0], { foot: false });
  sbox(g, 3, 0.8, 1.2, 'wood', '#8a7058', [0, 0.4, 0.3]);
  for (let k = 0; k < 6; k++) { sbox(g, 0.8, 0.35, 0.6, 'bamboo', '#e6d2a8', [-1.05 + (k % 3) * 1.05, 0.98, 0.0 + Math.floor(k / 3) * 0.62]); for (let j = 0; j < 3; j++) blob(g, 0.13, p.crates ?? '#d6402e', [-1.25 + (k % 3) * 1.05 + j * 0.2, 1.2, Math.floor(k / 3) * 0.62], [1, 1, 1], 0); }
  return g;
}

// ---- shelters and landmarks ----
function gurdwara() {
  const g = G();
  sbox(g, 8.4, 0.4, 6.4, 'concrete', '#e6e2da', [0, 0.2, 0]); sbox(g, 7.6, 3.6, 5.6, 'lime', '#fbf9f4', [0, 2.2, 0], undefined, { top: 4 });
  sbox(g, 7.9, 0.3, 5.9, 'concrete', '#e8dcc0', [0, 4.1, 0]);
  shalf(g, 1.6, 'lime', '#fbf9f4', [0, 4.2, 0], [1, 1.2, 1]); cone(g, 0.18, 0.9, GOLD(), [0, 6.5, 0], [0, 0, 0], 16);
  for (const [x, z] of [[-3.4, -2.4], [3.4, -2.4], [-3.4, 2.4], [3.4, 2.4]]) { for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) scyl(g, 0.05, 0.05, 0.8, 'lime', '#fbf9f4', [x + dx, 4.65, z + dz], undefined, 8); shalf(g, 0.55, 'lime', '#fbf9f4', [x, 5.05, z]); }
  for (let k = -1; k <= 1; k++) { box(g, 1.1, 2, 0.04, INSIDE(), [k * 2.2, 1.4, 2.81]); sbox(g, 1.1, 2, 0.06, 'wood', '#c9a24a', [k * 2.2, 1.4, 2.84]); half(g, 0.55, GOLD(), [k * 2.2, 2.4, 2.82], [1, 0.8, 0.1]); }
  // the Nishan Sahib: a tall pole with the saffron flag
  cyl(g, 0.08, 0.1, 9, '#e98a1c', [5.6, 4.5, 3]); cone(g, 0.2, 0.6, '#c9ced3', [5.6, 9.3, 3]);
  const f = box(g, 1.8, 1, 0.03, '#f08a12', [6.5, 8.3, 3]); f.userData.wave = true;
  return g;
}
function dhaba() {
  const g = G();
  for (const [x, z] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]]) scyl(g, 0.06, 0.07, 2.3, 'wood', '#7a6450', [x, 1.15, z], undefined, 8);
  sbox(g, 3.6, 0.04, 3, 'tin', '#c4cacb', [0, 2.35, 0], undefined, { foot: false }); sbox(g, 2.4, 0.9, 0.8, 'mud', '#c9a676', [0, 0.45, -0.7]);
  cyl(g, 0.2, 0.25, 0.4, '#5f6a70', [0.6, 1.1, -0.7]); const c = charpai(); c.position.set(0, 0, 2.2); g.add(c);
  return g;
}
function truck() {
  const g = G(); const art = M('#fff', { map: truckTex() });
  box(g, 2.3, 0.4, 7, '#2a2a2a', [0, 0.9, 0]);
  box(g, 2.3, 1.7, 1.8, art, [0, 1.95, 2.6]); box(g, 2.2, 0.8, 0.06, '#9cc9e8', [0, 2.3, 3.52]);
  box(g, 2.5, 1, 0.5, art, [0, 3.2, 2.9], [-0.25, 0, 0]); // the carved crown over the cab
  box(g, 2.4, 2, 4.6, art, [0, 2.1, -1.1]);
  for (const z of [2.4, -1.4, -2.8]) for (const s of [-1, 1]) cyl(g, 0.5, 0.5, 0.35, '#1c1c1c', [s * 1.05, 0.5, z], [0, 0, Math.PI / 2], 12);
  return g;
}
function wardoffice() {
  const g = G();
  sbox(g, 10.4, 0.4, 4.4, 'concrete', '#cfc5b3', [0, 0.2, 0]); sbox(g, 10, 3, 3.6, 'lime', '#efe6d0', [0, 1.9, -0.2], undefined, { top: 3.4 });
  sbox(g, 10.6, 0.25, 4.6, 'concrete', '#5a86b8', [0, 3.5, 0]);
  for (let k = -2; k <= 2; k++) { scyl(g, 0.14, 0.14, 3, 'lime', '#f5f0e6', [k * 2.3, 1.9, 1.9], undefined, 16); if (k) win(g, 0.9, 0.9, k * 2.3 - 1.1, 2, 1.62, '#2a3a4a', '#3a6fa8'); }
  door(g, 1.2, 2.2, 0, 1.62, '#3a6fa8', 0.4);
  // Nepal's flag: two stacked crimson pennants with a blue border
  cyl(g, 0.05, 0.05, 6, '#cfd4d8', [6, 3, 2.4]);
  const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.lineTo(0, 1.4); fl.lineTo(1, 0.75); fl.lineTo(0.45, 0.75); fl.lineTo(1, 0); fl.closePath();
  const f = put(g, new THREE.ShapeGeometry(fl), M('#d0102a', { side: THREE.DoubleSide }), [6.05, 4.4, 2.4]); f.userData.wave = true;
  return g;
}
function lhakhang() {
  const g = G();
  sbox(g, 5.6, 0.5, 4.6, 'concrete', '#d9d2c2', [0, 0.25, 0]); sbox(g, 5, 3, 4, 'lime', '#f4efe4', [0, 2, 0], undefined, { top: 3 });
  sbox(g, 5.1, 0.6, 4.1, 'lime', '#9a3426', [0, 3.3, 0]); // the red kemar band
  spyr(g, 6, 1.4, 'tin', '#e0b04a', 3.6); cone(g, 0.3, 1, GOLD(), [0, 5.4, 0], [0, 0, 0], 12);
  door(g, 1.2, 2, 0, 2.01, '#8a2a20', 0.5);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; cyl(g, 0.04, 0.04, 5, '#d9d2c2', [Math.cos(a) * 4.4, 2.5, Math.sin(a) * 4.4]); const f = box(g, 0.4, 3.4, 0.02, ['#2b6cb0', '#f4efe4', '#c62a2a', '#2e8b57', '#e2b84a', '#f4efe4'][k], [Math.cos(a) * 4.4 + 0.22, 3.2, Math.sin(a) * 4.4]); f.userData.wave = true; }
  return g;
}
function kyaung() {
  const g = G();
  for (const x of [-2.6, 0, 2.6]) for (const z of [-2, 2]) scyl(g, 0.15, 0.16, 1.4, 'wood', '#6e5040', [x, 0.7, z]);
  sbox(g, 6.6, 0.3, 5, 'wood', '#7a5a44', [0, 1.5, 0]); sbox(g, 5.6, 2.2, 4, 'wood', '#8a5a3a', [0, 2.75, 0], undefined, { foot: false });
  for (let k = 0; k < 3; k++) spyr(g, 7 - k * 1.8, 1, 'tin', '#7a6a5a', 3.85 + k * 1.05);
  cone(g, 0.2, 1.6, GOLD(), [0, 7.8, 0], [0, 0, 0], 12);
  for (let k = 0; k < 6; k++) sbox(g, 1.4, 0.1, 0.3, 'wood', '#7a5a44', [0, 0.25 * k + 0.1, 3.8 - k * 0.25]);
  return g;
}
function chorten(p) {
  const g = G();
  sbox(g, 2.4, 0.6, 2.4, 'lime', '#f4efe4', [0, 0.3, 0]); sbox(g, 1.9, 0.5, 1.9, 'lime', '#f4efe4', [0, 0.85, 0]);
  shalf(g, 0.9, 'lime', '#f4efe4', [0, 1.1, 0], [1, 1.1, 1]);
  sbox(g, 0.7, 0.4, 0.7, 'lime', '#9a3426', [0, 2.15, 0], undefined, { foot: false }); cone(g, 0.3, 1.2, GOLD(), [0, 2.95, 0], [0, 0, 0], 12);
  return g;
}
function zedi() {
  const g = G();
  for (let k = 0; k < 3; k++) sbox(g, 4.6 - k * 1.1, 0.6, 4.6 - k * 1.1, 'lime', '#f8f5ee', [0, 0.3 + k * 0.6, 0]);
  shalf(g, 1.3, 'lime', '#f8f5ee', [0, 1.8, 0], [1, 1.4, 1]);
  cone(g, 0.6, 3.4, GOLD(), [0, 4.5, 0], [0, 0, 0], 20); blob(g, 0.15, '#f7e08a', [0, 6.3, 0], [1, 1, 1], 0);
  return g;
}
function waterpots() {
  const g = G();
  for (const x of [-0.8, 0.8]) cyl(g, 0.06, 0.06, 1.8, '#6b4a2b', [x, 0.9, 0]);
  box(g, 2, 0.08, 0.9, '#6b4a2b', [0, 0.8, 0]); gable(g, 2.2, 1.2, 0.5, '#9c7a4c', 1.8);
  for (let k = 0; k < 3; k++) blob(g, 0.26, '#a65731', [-0.55 + k * 0.55, 1.08, 0], [1, 1.1, 1], 1);
  return g;
}

// ---- small things ----
function kup(p) {
  const g = G();
  // a straw stack round a bamboo pole: a bulging drum and a domed top, ragged where the straw hangs
  scyl(g, 1.32, 1.42, 1.2, 'straw', '#e8d6a8', [0, 0.6, 0], undefined, 24);
  const dome = scaleUV(new THREE.SphereGeometry(1.36, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), Math.PI * 2 * 1.36, 2.1, 'straw', [0, 1.2, 0], { foot: false });
  put(g, dome, surface('straw', '#dcc89a'), [0, 1.18, 0], [0, 0, 0], [1, 1.1, 1]);
  scyl(g, 1.45, 1.36, 0.22, 'straw', '#cdb684', [0, 1.2, 0], undefined, 24); // the bulge where the top was built out
  scyl(g, 0.04, 0.05, 0.9, 'wood', '#8a7058', [0, 2.75, 0], undefined, 8);
  return g;
}
function charpai() {
  const g = G();
  const weave = canvasTex('weave', 32, 32, (c) => { c.fillStyle = '#d9c393'; c.fillRect(0, 0, 32, 32); c.strokeStyle = '#a8834c'; for (let k = 0; k < 32; k += 4) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 32); c.moveTo(0, k); c.lineTo(32, k); c.stroke(); } }, [3, 2]);
  box(g, 1.9, 0.1, 0.9, M('#fff', { map: weave }), [0, 0.5, 0]);
  for (const [x, z] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) cyl(g, 0.05, 0.05, 0.5, '#6b4a2b', [x, 0.25, z]);
  return g;
}
function pots() { const g = G(); for (let k = 0; k < 4; k++) blob(g, 0.28 - k * 0.03, '#a65731', [(k % 2) * 0.55, 0.28, Math.floor(k / 2) * 0.55], [1, 1.1, 1], 1); return g; }
function dehari() { const g = G(); cyl(g, 0.3, 0.34, 1.7, '#b07a4a', [0, 0.85, 0], [0, 0, 0], 10); cone(g, 0.36, 0.3, '#9a6a3f', [0, 1.85, 0]); return g; }
function machan() {
  const g = G();
  for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) cyl(g, 0.07, 0.07, 3.6, '#9c8a4a', [x, 1.8, z]);
  box(g, 2.2, 0.12, 2.2, '#8a6a42', [0, 2.6, 0]); pyramid(g, 2.8, 1, '#b89a5a', 3.6);
  for (let k = 0; k < 6; k++) box(g, 0.6, 0.05, 0.08, '#8a6a42', [0, 0.4 + k * 0.4, 1.1]);
  return g;
}
function pole() { const g = G(); cyl(g, 0.1, 0.13, 7, '#9a9a90', [0, 3.5, 0]); box(g, 1.6, 0.1, 0.1, '#7a7a70', [0, 6.6, 0]); return g; }
function lungdar() { const g = G(); cyl(g, 0.04, 0.05, 5.5, '#d9d2c2', [0, 2.75, 0]); const f = box(g, 0.45, 3.6, 0.02, '#f4efe4', [0.24, 3.4, 0]); f.userData.wave = true; return g; }
function flagline(p) {
  const g = G(); const n = 18, cols = ['#2b6cb0', '#f4efe4', '#c62a2a', '#2e8b57', '#e2b84a'];
  for (const x of [-p.len / 2, p.len / 2]) cyl(g, 0.05, 0.05, 3.6, '#7a5a38', [x, 1.8, 0]);
  for (let k = 0; k < n; k++) { const x = -p.len / 2 + (k + 0.5) * (p.len / n), y = 3.4 - Math.sin(((k + 0.5) / n) * Math.PI) * 0.5; const f = box(g, 0.32, 0.36, 0.01, cols[k % 5], [x, y - 0.2, 0]); f.userData.wave = true; f.castShadow = false; }
  return g;
}

// ---- trees ----
const trunk = (g, h, r, c = '#6b4a2b') => cyl(g, r * 0.7, r, h, c, [0, h / 2, 0], [0, 0, 0], 7);
// A leafy crown: a shaded core with clumps of leaves round it and a sunlit top, so a tree reads as foliage from the
// farmer's height and not as one faceted ball. Each tree uses three tones of its colour, and bake() merges by material,
// so this costs vertices, not draw calls. The clumps come from a fixed sequence: the same world grows the same trees.
let leafSeed = 7;
const leafRnd = () => { leafSeed = (leafSeed * 16807) % 2147483647; return leafSeed / 2147483647; };
const shade = (c, k) => '#' + new THREE.Color(c).lerp(new THREE.Color(k < 0 ? '#0b1a0b' : '#f2f5c4'), Math.abs(k)).getHexString();
function canopy(g, R, col, [cx, cy, cz], sy = 0.8, n = 8) {
  const crown = G(); crown.position.set(cx, cy, cz); g.add(crown);
  crown.userData.crown = true; crown.userData.swayAmp = 0.045;
  const dark = shade(col, -0.3), lite = shade(col, 0.18);
  blob(crown, R * 0.82, dark, [0, -R * 0.08, 0], [1, sy, 1]);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + leafRnd() * 0.7, up = leafRnd() - 0.4;
    const d = R * (0.58 + leafRnd() * 0.16), r = R * (0.4 + leafRnd() * 0.18);
    blob(crown, r, up > 0.1 ? col : dark, [Math.cos(a) * d, up * R * sy, Math.sin(a) * d], [1, 0.82, 1]);
  }
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + leafRnd(); blob(crown, R * (0.36 + leafRnd() * 0.1), lite, [Math.cos(a) * R * 0.3, R * sy * 0.62, Math.sin(a) * R * 0.3], [1, 0.75, 1]); }
  return crown;
}
// two or three limbs out of the trunk top into the crown, so the crown does not float on a post
function limbs(g, h, r, c, spread, n = 3) {
  for (let k = 0; k < n; k++) { const a = k * (Math.PI * 2 / n) + 0.4, L = spread * 0.9; cyl(g, r * 0.35, r * 0.6, L, c, [Math.cos(a) * L * 0.35, h + L * 0.3, Math.sin(a) * L * 0.35], [Math.sin(a) * 0.85, 0, -Math.cos(a) * 0.85], 6); }
}
function tree(type) {
  const g = G();
  if (['mango', 'sal', 'tamarind', 'eucalyptus', 'poplar', 'kikar'].includes(type)) {
    // a real tree: branching trunk, a crown of leaf sprays (leafytree.js)
    g.add(buildTree(type, { seed: ++treeSeed, scale: 0.9 + (treeSeed % 5) * 0.06, sway: type === 'eucalyptus' || type === 'poplar' ? 0.05 : 0.035 }));
  } else if (type === 'bluepine') {
    trunk(g, 1.2, 0.18, '#4a3628');
    const crown = G(); crown.position.set(0, 1.6, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.035;
    for (let k = 0; k < 4; k++) cone(crown, 1.7 - k * 0.35, 2.2, '#2a5a48', [0, k * 1.35, 0], [0, 0, 0], 8);
  } else if (type === 'banana') {
    // a real banana plant: sheathed stem, torn arching leaves, a hanging bunch and its bud (banana.js)
    g.add(buildBanana({ seed: ++bananaSeed, h: 1.9 + (bananaSeed % 4) * 0.12 }));
  } else { // palms: date and palmyra (toddy), built as real palms (palm.js)
    const toddy = type === 'toddy';
    g.add(buildPalm({ kind: toddy ? 'palmyra' : 'date', h: toddy ? 10 : 6, lean: 0.04, seed: ++palmSeed, sway: 0.065 }));
  }
  return g;
}

// ---- animals ----
// Every animal (cattle, buffalo, goats, the donkey, hens, ducks, egrets) is sculpted, coated and jointed in animals.js;
// world.js moves them with updateAnimals() from the same file.
export function animal(type) { return buildAnimal(type); }

// ---- Bangladesh ----
const tinTex = () => canvasTex('tin', 64, 32, (c, w, h) => { c.fillStyle = '#8f9ba3'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 4) { c.fillStyle = x % 8 ? '#a7b2b9' : '#7c8890'; c.fillRect(x, 0, 2, h); } c.fillStyle = 'rgba(150,80,40,.25)'; c.fillRect(0, h - 6, w, 6); }, [4, 2]);
// A Bangladeshi village house: tin sheet walls (or mud, in Rajshahi) on a timber frame, standing on its raised earth
// plinth (ভিটা), under a two-sloped tin roof (দোচালা), with a lean-to verandah in front.
function tinhouse(p) {
  const g = G();
  const plinth = p.plinth ?? 0.4;
  sbox(g, 7, plinth, 5.4, 'mud', '#a8865c', [0, plinth / 2, 0]);
  sbox(g, 1.4, plinth * 0.5, 0.5, 'concrete', '#b9b2a4', [0.6, plinth * 0.25, 2.95]); // the step up
  const [wn, wt] = p.mud ? ['mud', '#c7a476'] : ['tin', '#d4d9da'];
  sbox(g, 6.4, 2.4, 4.8, wn, wt, [0, plinth + 1.2, 0], undefined, { top: plinth + 2.4 });
  for (const [x, z] of [[-3.2, -2.4], [3.2, -2.4], [-3.2, 2.4], [3.2, 2.4]]) sbox(g, 0.1, 2.42, 0.1, 'wood', '#7a6450', [x, plinth + 1.21, z]);
  pitched(g, 6.4, 4.8, 1.8, 0.6, 'tin', '#d4d9da', plinth + 2.4, { ends: wn, etint: wt, overEnd: 0.4 });
  door(g, 1, 1.9, 0.6, 2.41, '#3e6fa8', plinth); win(g, 0.8, 0.7, -1.8, plinth + 1.4, 2.41, '#2a2420', '#3e6fa8');
  for (const x of [-3, 3]) scyl(g, 0.06, 0.07, 2.2, 'wood', '#7a6450', [x, plinth + 1.1, 3.3]);
  sbox(g, 6.6, 0.04, 1.4, 'tin', '#d4d9da', [0, plinth + 2.25, 3.1], [0.18, 0, 0], { foot: false });
  return g;
}
// The south's golpata house: mud walls on a high plinth against the tide, under a thick nipa-leaf thatch.
function thatchhouse(p) {
  const g = G(); const plinth = p.plinth ?? 0.7;
  sbox(g, 7, plinth, 5.4, 'mud', '#a8865c', [0, plinth / 2, 0]);
  sbox(g, 6.2, 2.2, 4.6, 'mud', '#c7a476', [0, plinth + 1.1, 0], undefined, { top: plinth + 2.2 });
  pitched(g, 6.2, 4.6, 1.9, 0.8, 'thatch', '#a89a78', plinth + 2.2, { ends: 'mud', etint: '#c7a476', overEnd: 0.6 }); // golpata thatch
  door(g, 1, 1.8, 0.4, 2.31, '#5a3a22', plinth); win(g, 0.7, 0.6, -1.9, plinth + 1.3, 2.31, '#2a2420', '#6e5a46');
  for (const x of [-2.9, 2.9]) scyl(g, 0.07, 0.08, 2.0, 'wood', '#7a6450', [x, plinth + 1.0, 3.2]);
  return g;
}
const bdFlag = (g, x, z, h = 6) => {
  cyl(g, 0.05, 0.05, h, '#cfd4d8', [x, h / 2, z]);
  const f = box(g, 1.5, 0.9, 0.02, '#006a4e', [x + 0.78, h - 0.5, z]); f.userData.wave = true;
  const d = put(g, new THREE.CircleGeometry(0.27, 16), M('#f42a41', { side: THREE.DoubleSide }), [x + 0.7, h - 0.5, z + 0.015]); d.userData.wave = true;
};
function school() {
  const g = G();
  sbox(g, 14.4, 0.4, 4.4, 'concrete', '#cfc5b3', [0, 0.2, 0]); sbox(g, 14, 3, 3, 'brick', '#ffffff', [0, 1.9, -0.5], undefined, { top: 3.4 });
  sbox(g, 14.6, 0.25, 4.6, 'concrete', '#e8dfcf', [0, 3.5, 0]);
  for (let k = -3; k <= 3; k++) { scyl(g, 0.15, 0.15, 3, 'lime', '#f1ece2', [k * 2.2, 1.9, 1.8], undefined, 16); if (k) door(g, 0.9, 2, k * 2.2 - 1.1, 1.01, '#2f6b3d', 0.4); }
  bdFlag(g, 7.6, 2.6);
  return g;
}
function shelter() {
  // a cyclone shelter: open on pillars at the ground, two storeys above the surge
  const g = G();
  for (const x of [-5, 0, 5]) for (const z of [-2.6, 2.6]) scyl(g, 0.3, 0.3, 3, 'concrete', '#e2ded4', [x, 1.5, z], [0, 0, 0], 18);
  sbox(g, 11.6, 0.4, 6.4, 'concrete', '#d9d2c2', [0, 3.2, 0]); sbox(g, 11, 2.8, 5.8, 'lime', '#f4f1ea', [0, 4.8, 0], undefined, { foot: false });
  sbox(g, 11.6, 0.4, 6.4, 'concrete', '#d9d2c2', [0, 6.4, 0]); sbox(g, 11, 2.6, 5.8, 'lime', '#f4f1ea', [0, 7.9, 0], undefined, { foot: false });
  sbox(g, 11.8, 0.3, 6.6, 'concrete', '#4f86b0', [0, 9.35, 0]);
  for (let k = -2; k <= 2; k++) { win(g, 1.2, 1, k * 2.1, 4.9, 2.92, '#2a3a4a', '#2f6b9a'); win(g, 1.2, 1, k * 2.1, 8, 2.92, '#2a3a4a', '#2f6b9a'); }
  for (let k = 0; k < 10; k++) sbox(g, 1.6, 0.12, 0.45, 'concrete', '#cfc5b3', [6.6, 0.3 * k + 0.15, 2.4 - k * 0.42]);
  bdFlag(g, -6.6, 3.4, 11);
  return g;
}
function tilashed() {
  const g = G();
  for (const [x, z] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) scyl(g, 0.08, 0.09, 2.4, 'wood', '#9c8a6a', [x, 1.2, z], undefined, 10);
  pitched(g, 3.2, 2.4, 0.7, 0.5, 'tin', '#ccd1d2', 2.4, { ends: false, overEnd: 0.4 }); sbox(g, 3.4, 0.2, 2.6, 'wood', '#8a7058', [0, 0.1, 0]);
  return g;
}
function kiln() {
  const g = G();
  sbox(g, 10, 2.2, 6, 'brick', '#c9a090', [0, 1.1, 0]); scyl(g, 0.9, 1.4, 18, 'brick', '#e0b8a0', [0, 9, 0], [0, 0, 0], 20);
  scyl(g, 0.95, 0.95, 0.5, 'concrete', '#5a524a', [0, 17.8, 0], [0, 0, 0], 20); // the soot-black lip
  for (let k = 0; k < 4; k++) { const sm = blob(g, 1.6 + k * 0.6, '#cfcac2', [0.8 * k, 19 + k * 2.2, 0], [1.4, 0.7, 1.2], 0); sm.castShadow = false; sm.userData.live = true; }
  return g;
}
function boat(p) {
  const g = G();
  const hull = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  put(g, hull, '#5a3a22', [0, 0.45, 0], [0, 0, 0], [0.9, 0.55, 3.4]);
  box(g, 1.5, 0.08, 4.6, '#7a5a38', [0, 0.45, 0]);
  const hood = new THREE.CylinderGeometry(0.85, 0.85, 2, 12, 1, true, -Math.PI / 2, Math.PI); hood.rotateX(Math.PI / 2);
  put(g, hood, M('#a8834c', { side: THREE.DoubleSide }), [0, 0.5, -0.4]);
  if (p?.cargo !== false) for (let k = 0; k < 6; k++) blob(g, 0.22, p?.cargo ?? '#9cc04a', [-0.3 + (k % 2) * 0.6, 0.62, 1.2 + Math.floor(k / 2) * 0.4], [1, 1, 1], 0);
  g.userData.live = true; g.userData.bob = true;
  return g;
}
function van() {
  const g = G();
  box(g, 1.5, 0.1, 2.2, '#8a6a42', [0, 0.85, -0.3]);
  for (const s of [-1, 1]) cyl(g, 0.42, 0.42, 0.06, '#2a2a2a', [s * 0.8, 0.42, -0.6], [0, 0, Math.PI / 2], 14);
  cyl(g, 0.42, 0.42, 0.06, '#2a2a2a', [0, 0.42, 1.3], [0, 0, Math.PI / 2], 14);
  cyl(g, 0.03, 0.03, 1, '#c62a2a', [0, 1, 1.2], [0.3, 0, 0]); box(g, 0.7, 0.04, 0.04, '#c62a2a', [0, 1.45, 1.35]);
  box(g, 0.35, 0.08, 0.3, '#2a2a2a', [0, 1.05, 0.9]);
  for (let k = 0; k < 4; k++) cyl(g, 0.3, 0.33, 0.7, '#e2d3a8', [-0.35 + (k % 2) * 0.7, 1.2, -0.8 + Math.floor(k / 2) * 0.8], [Math.PI / 2, 0, 0]);
  return g;
}
function llp() {
  const g = G();
  box(g, 1.6, 0.2, 1.2, '#bdb3a2', [0, 0.1, 0]); box(g, 1.1, 0.7, 0.6, '#2f7a4a', [0, 0.55, 0]);
  cyl(g, 0.3, 0.3, 0.1, '#333', [0.6, 0.6, 0], [0, 0, Math.PI / 2], 14);
  cyl(g, 0.1, 0.1, 2.8, '#2a2a2a', [0, 0.4, 1.6], [Math.PI / 2 - 0.15, 0, 0]);
  return g;
}
function ghat() { const g = G(); for (let k = 0; k < 4; k++) box(g, 2.6, 0.2, 0.5, '#bdb3a2', [0, 0.1 - k * 0.2, k * 0.5]); return g; }
function trellis() {
  const g = G();
  for (const x of [-1.4, 0, 1.4]) for (const z of [-1.4, 1.4]) cyl(g, 0.04, 0.04, 2, '#a8935a', [x, 1, z]);
  for (const z of [-1.4, 1.4]) box(g, 3, 0.04, 0.04, '#a8935a', [0, 2, z]);
  for (let k = 0; k < 8; k++) blob(g, 0.35, '#4f8f34', [-1.2 + (k % 4) * 0.8, 1.9, -1.4 + Math.floor(k / 4) * 2.8], [1.2, 0.5, 1], 0);
  return g;
}
function gher() {
  const g = G();
  for (const [x, z, w, d] of [[0, -3.9, 8.4, 0.8], [0, 3.9, 8.4, 0.8], [-3.9, 0, 0.8, 8.4], [3.9, 0, 0.8, 8.4]]) box(g, w, 0.5, d, '#7a6a4a', [x, 0.1, z]);
  return g;
}
function bamboobridge() {
  const g = G();
  for (let k = 0; k < 7; k++) { cyl(g, 0.05, 0.05, 2.4, '#a8935a', [0, 0.6, -3 + k], [0, 0, 0.1]); }
  box(g, 0.4, 0.06, 7, '#a8935a', [0, 1.2, 0]); box(g, 0.05, 0.05, 7, '#a8935a', [0.35, 1.9, 0]);
  return g;
}
function stilthut() { const g = G(); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.06, 0.06, 1.6, '#6b4a2b', [x, 0.8, z]); box(g, 2.4, 1.6, 2.4, '#a8834c', [0, 2.3, 0]); gable(g, 3, 3, 1, '#8f7a4a', 3.1); return g; }
function stoneboat() { const g = boat({ cargo: false }); for (let k = 0; k < 8; k++) blob(g, 0.24, '#8b8f8c', [-0.3 + (k % 2) * 0.6, 0.65, -1.4 + Math.floor(k / 2) * 0.8], [1, 0.7, 1], 0); return g; }
function tea() { const g = G(); blob(g, 0.6, '#3f7a34', [0, 0.45, 0], [1.2, 0.7, 1.2], 1); return g; }
function stone(p) { const g = G(); blob(g, 0.5, '#8b8f8c', [0, 0.15, 0], [1.2, 0.6, 1], 0); return g; }
function treeBD(type) {
  const g = G();
  if (type === 'banyan') {
    // Ancient Banyan Tree (বটগাছ): wide sprawling gnarled trunk, fluted buttress roots,
    // hanging aerial prop roots (ঝুড়ি) descending to the earth, wide tiered umbrella canopy
    g.add(buildTree('banyan', { seed: ++treeSeed, sway: 0.025 })); // the trunk, limbs and the wide crown (leafytree.js)
    for (let k = 0; k < 5; k++) {
      const a = k * (Math.PI * 2 / 5);
      cyl(g, 0.15, 0.35, 1.4, '#3d2b1f', [Math.cos(a) * 0.7, 0.7, Math.sin(a) * 0.7], [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], 6);
    }
    // Aerial prop roots (ঝুড়ি)
    for (let k = 0; k < 8; k++) {
      const a = k * (Math.PI * 2 / 8) + 0.2, d = 1.6 + (k % 3) * 0.8;
      const rx = Math.cos(a) * d, rz = Math.sin(a) * d;
      const rootH = 3.0 + (k % 2) * 0.4;
      cyl(g, 0.05 + (k % 2) * 0.04, 0.07 + (k % 2) * 0.05, rootH, '#5a4533', [rx, rootH / 2, rz], [0.03 * (k % 3 - 1), 0, 0.03 * (k % 2)], 5);
    }
  } else if (type === 'coconut') { // a real coconut palm (palm.js): curved ringed trunk, pinnate fronds, nuts
    g.add(buildPalm({ kind: 'coconut', h: 7.5, lean: 0.12 + (palmSeed % 4) * 0.025, seed: ++palmSeed, sway: 0.085 }));
  } else if (type === 'betelnut') { // a slim areca palm
    g.add(buildPalm({ kind: 'areca', h: 8.8, lean: 0.02, seed: ++palmSeed, sway: 0.07 }));
  } else if (type === 'bamboo') { // a bamboo clump: arching ringed culms, sprays of narrow leaves (leafytree.js)
    g.add(buildBamboo({ seed: ++treeSeed }));
  } else if (type === 'hijal') {
    g.add(buildTree('hijal', { seed: ++treeSeed, scale: 0.9 + (treeSeed % 5) * 0.06 }));
  } else if (type === 'nipa') {
    const crown = G(); crown.position.set(0, 0.8, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.09;
    const nipaM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }); // pinnate nipa fronds from the mud (palm.js)
    for (let k = 0; k < 10; k++) { const f = new THREE.Mesh(frondGeometry({ len: 3.4, leaflets: 34, leaf: 0.6, droop: 0.32 }), nipaM); f.position.set(0, -0.75, 0); f.rotation.set(-1.0 - (k % 3) * 0.12, (k / 10) * Math.PI * 2, 0, 'YXZ'); f.castShadow = true; crown.add(f); }
  } else if (type === 'guava') {
    g.add(buildTree('guava', { seed: ++treeSeed, scale: 0.9 + (treeSeed % 5) * 0.06 }));
  } else if (type === 'mangrove') {
    g.add(buildTree('mangrove', { seed: ++treeSeed, scale: 0.9 + (treeSeed % 5) * 0.06 }));
    for (let k = 0; k < 6; k++) cone(g, 0.05, 0.4, '#5a4632', [Math.cos(k) * 1.2, 0.2, Math.sin(k) * 1.2], [0, 0, 0], 4); // stilt roots in the mud
  }
  return g;
}

export const BUILD = {
  brickhouse, mudhouse, tharuhouse, bhutanhouse, stilthouse, shed, kiosk,
  pumphouse, channel, mogha, stw, stream, pond: () => G(),
  upazila, tractor, trolley, donkeycart, oxcart, stall, gurdwara, dhaba, truck, wardoffice, lhakhang, kyaung, chorten, zedi, waterpots,
  kup, charpai, pots, dehari, machan, pole, lungdar, flagline,
  mango: () => tree('mango'), sal: () => tree('sal'), tamarind: () => tree('tamarind'), eucalyptus: () => tree('eucalyptus'), poplar: () => tree('poplar'),
  kikar: () => tree('kikar'), bluepine: () => tree('bluepine'), banana: () => tree('banana'), date: () => tree('date'), toddy: () => tree('toddy'),
  tinhouse, thatchhouse, school, shelter, tilashed, kiln, boat, van, llp, ghat, trellis, gher, bamboobridge, stilthut, stoneboat, duck: () => animal('duck'), tea, stone,
  banyan: () => treeBD('banyan'), coconut: () => treeBD('coconut'), betelnut: () => treeBD('betelnut'), bamboo: () => treeBD('bamboo'), hijal: () => treeBD('hijal'), nipa: () => treeBD('nipa'), guava: () => treeBD('guava'), mangrove: () => treeBD('mangrove'),
  buffalo: () => animal('buffalo'), cow: () => animal('cow'), ox: () => animal('ox'), goat: () => animal('goat'), chicken: () => animal('chicken'), egret: () => animal('egret'),
};
export { box, cyl, cone, blob, half, put, M, gable, pyramid };

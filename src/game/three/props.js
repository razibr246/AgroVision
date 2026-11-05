// Low-poly builders for everything that stands in the five worlds: houses in each local style, the seed shop and the
// FieldShift kiosk, water sources, markets, shelters, trees, animals and landmarks. Each builder returns a Group whose
// origin is on the ground at the object's centre, facing +z. Things that move (flags, animals, flowing water) are
// tagged in userData so world.js can animate them; everything else is merged into a few big meshes after building.
import * as THREE from 'three';
import { mat, canvasTex } from './people';

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
const door = (p, w, h, x, z, c = '#4a3020', y = 0) => box(p, w, h, 0.06, c, [x, y + h / 2, z]);
const win = (p, w, h, x, y, z, c = '#2a2420', frame = '#e9e2d0') => { box(p, w + 0.12, h + 0.12, 0.05, frame, [x, y, z]); box(p, w, h, 0.07, c, [x, y, z + 0.01]); };

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
function brickhouse() {
  const g = G(); const bm = M('#fff', { map: brickTex() });
  box(g, 6.6, 3.1, 5, bm, [0, 1.55, 0]); box(g, 4.2, 2.6, 4, '#efe6d6', [-1.1, 4.4, -0.3]);
  box(g, 6.9, 0.18, 5.3, '#d9cfbd', [0, 3.15, 0]); box(g, 4.4, 0.16, 4.2, '#d9cfbd', [-1.1, 5.75, -0.3]);
  for (const [x, z, w, d] of [[0, 2.6, 6.9, 0.12], [0, -2.6, 6.9, 0.12], [3.4, 0, 0.12, 5.3]]) box(g, w, 0.5, d, '#e8dfcf', [x, 3.5, z]);
  cyl(g, 0.55, 0.55, 1, '#1a1a1a', [-2.4, 6.35, -1.2], [0, 0, 0], 12); // the black roof water tank
  door(g, 1.2, 2.2, 1.4, 2.51, '#2f5f8f'); win(g, 1, 0.9, -1.4, 1.7, 2.52, '#283844', '#efe6d6'); win(g, 0.9, 0.8, -1.1, 4.4, 1.72, '#283844');
  box(g, 1, 0.2, 2.6, '#cfc5b3', [3.9, 1.6, -0.6], [0.9, 0, 0]);
  return g;
}
function mudhouse() {
  const g = G();
  box(g, 6.2, 2.7, 4.6, '#c4a370', [0, 1.35, 0]);
  box(g, 6.5, 0.16, 4.9, '#9c7a4c', [0, 2.75, 0]); for (const z of [2.4, -2.4]) box(g, 6.5, 0.35, 0.14, '#b8955f', [0, 3, z]);
  box(g, 0.9, 1.2, 0.9, '#b8955f', [1.8, 3.4, -1], [0, 0.3, 0]); box(g, 0.7, 0.5, 0.06, '#3a2a1e', [1.86, 3.6, -0.55], [0, 0.3, 0]); // a mangh (wind catcher)
  door(g, 1.1, 2, 0.8, 2.31, '#6b4a2b'); win(g, 0.6, 0.6, -1.6, 1.7, 2.31, '#2a2420', '#8a6a42');
  // a reed shade in front, on posts
  for (const x of [-2.6, 0, 2.6]) cyl(g, 0.06, 0.06, 2.3, '#7a5a38', [x, 1.15, 4]);
  box(g, 6, 0.12, 2.1, '#c9b07a', [0, 2.3, 3.2], [0.08, 0, 0]);
  return g;
}
function tharuhouse() {
  const g = G(); const tm = M('#fff', { map: tharuTex() });
  box(g, 0.3 + 7.6, 0.3, 4.6, '#8e6a48', [0, 0.15, 0]);
  box(g, 7.6, 2.2, 4.2, tm, [0, 1.4, 0]);
  gable(g, 8.8, 6, 2.4, '#b89a5a', 2.45);
  door(g, 1, 1.9, -1.2, 2.11, '#5a3a22', 0.3); door(g, 1, 1.9, 2, 2.11, '#5a3a22', 0.3);
  for (const x of [-3.5, 0, 3.5]) cyl(g, 0.07, 0.07, 2.2, '#6b4a2b', [x, 1.4, 2.9]);
  return g;
}
function bhutanhouse() {
  const g = G();
  box(g, 6.4, 2.8, 5.2, '#f2ede2', [0, 1.4, 0]);
  box(g, 6.6, 2.2, 5.4, '#f2ede2', [0, 3.9, 0]);
  box(g, 6.7, 0.35, 5.5, '#7a3b22', [0, 2.95, 0]); box(g, 6.8, 0.3, 5.6, '#7a3b22', [0, 5.05, 0]);
  // the rabsel: a projecting painted wooden window bay
  box(g, 3, 1.5, 0.5, '#8a3f22', [0, 3.95, 2.85]); for (let k = -1; k <= 1; k++) win(g, 0.7, 0.9, k * 0.95, 3.95, 3.12, '#2b1d16', '#d8a33a');
  win(g, 0.7, 0.8, -2.2, 1.6, 2.62, '#2b1d16', '#7a3b22'); win(g, 0.7, 0.8, 2.2, 1.6, 2.62, '#2b1d16', '#7a3b22');
  door(g, 1.1, 2, 0.3, 2.62, '#7a3b22');
  for (const [x, z] of [[-3, -2.4], [3, -2.4], [-3, 2.4], [3, 2.4]]) cyl(g, 0.08, 0.08, 0.8, '#6b3a22', [x, 5.6, z]);
  gable(g, 7.6, 6.6, 1.2, '#7d838a', 6);
  // red chillies drying on the roof
  for (let k = 0; k < 40; k++) blob(g, 0.07, '#c92a1e', [-2.6 + (k % 10) * 0.55, 6.62 + Math.floor(k / 10) * 0.02, -1.6 + Math.floor(k / 10) * 0.32], [1.6, 0.6, 0.6], 0);
  return g;
}
function stilthouse() {
  const g = G(); const wm = M('#fff', { map: wovenTex() });
  for (const x of [-2.6, 0, 2.6]) for (const z of [-2, 2]) cyl(g, 0.1, 0.1, 1.5, '#6b4a2b', [x, 0.75, z]);
  box(g, 6, 0.2, 4.6, '#7a5a38', [0, 1.5, 0]);
  box(g, 5.6, 2, 4, wm, [0, 2.6, 0]);
  gable(g, 7, 5.6, 2.6, '#b8995a', 3.55);
  door(g, 1, 1.7, 0.8, 2.01, '#5a3a22', 1.6);
  for (let k = 0; k < 5; k++) box(g, 1, 0.06, 0.25, '#6b4a2b', [0.8, 0.3 * k + 0.1, 3 - k * 0.22]);
  return g;
}

// ---- the seed shop and the FieldShift kiosk ----
function shed(p) {
  const g = G();
  const wall = { brick: M('#fff', { map: brickTex() }), mud: '#c4a370', thatch: '#d9c79c', bhutan: '#f2ede2' }[p.style] ?? '#d9c79c';
  box(g, 4.4, 2.6, 0.2, wall, [0, 1.3, -2.5]); box(g, 0.2, 2.6, 5, wall, [-2.1, 1.3, 0]); box(g, 0.2, 2.6, 5, wall, [2.1, 1.3, 0]);
  if (p.style === 'thatch') gable(g, 5.4, 5.6, 1.6, '#b89a5a', 2.6); else box(g, 4.9, 0.12, 5.6, p.style === 'bhutan' ? '#7d838a' : '#8c9aa4', [0, 2.7, 0.1], [-0.1, 0, 0]);
  for (let k = 0; k < 6; k++) cyl(g, 0.32, 0.36, 0.8, k % 2 ? '#e2d3a8' : '#cdb985', [-1.4 + (k % 3) * 0.75, 0.4 + Math.floor(k / 3) * 0.75, -1.8 + (k % 2) * 0.2]);
  box(g, 3.2, 0.9, 0.9, '#7a5a38', [0, 0.45, 1.4]);
  for (let k = 0; k < 4; k++) blob(g, 0.25, ['#e5b416', '#c9952a', '#5a9a3c', '#e0452c'][k], [-1.1 + k * 0.72, 1.05, 1.4], [1, 0.6, 1], 0);
  const sign = box(g, 2.6, 0.7, 0.08, M('#fff', { map: leafTex() }), [0, 3.1, 2.5]);
  sign.material = M('#fff', { map: leafTex() });
  return g;
}
function kiosk() {
  const g = G();
  box(g, 3, 2.6, 2.6, '#efe8d8', [0, 1.3, 0]); box(g, 3.3, 0.2, 2.9, '#2f6b3d', [0, 2.7, 0]);
  door(g, 0.9, 2, -0.7, 1.31, '#2f6b3d');
  const s = box(g, 1.2, 0.9, 0.06, M('#fff', { map: leafTex() }), [0.7, 1.6, 1.32]); s.material = new THREE.MeshStandardMaterial({ map: leafTex(), emissive: '#ffffff', emissiveMap: leafTex(), emissiveIntensity: 0.6 });
  box(g, 0.08, 1.5, 0.08, '#555', [1.6, 3.4, 0.9]); box(g, 0.5, 0.8, 0.05, '#2b6cb0', [1.6, 3.9, 0.9]); // the dish
  return g;
}

// ---- water sources ----
function pumphouse() {
  const g = G(); const bm = M('#fff', { map: brickTex() });
  box(g, 2.6, 2.3, 2.6, bm, [0, 1.15, 0]); box(g, 2.9, 0.16, 2.9, '#cfc5b3', [0, 2.35, 0]); door(g, 0.8, 1.7, -0.6, 1.31, '#2f5f8f');
  cyl(g, 0.16, 0.16, 1, '#5f6a70', [0.5, 0.9, 1.6], [Math.PI / 2, 0, 0]);
  box(g, 1.6, 0.5, 1.4, '#bdb3a2', [0.5, 0.25, 2.6]);
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
  for (const [x, z] of [[-1.5, -1], [1.5, -1], [-1.5, 1], [1.5, 1]]) cyl(g, 0.06, 0.06, 2.4, '#9c8a4a', [x, 1.2, z]);
  box(g, 3.6, 0.1, 2.8, '#8c9aa4', [0, 2.45, 0], [0.08, 0, 0]);
  box(g, 3, 0.8, 1.2, '#7a5a38', [0, 0.4, 0.3]);
  for (let k = 0; k < 6; k++) { box(g, 0.8, 0.35, 0.6, '#a8834c', [-1.05 + (k % 3) * 1.05, 0.98, 0.0 + Math.floor(k / 3) * 0.62]); for (let j = 0; j < 3; j++) blob(g, 0.13, p.crates ?? '#d6402e', [-1.25 + (k % 3) * 1.05 + j * 0.2, 1.2, Math.floor(k / 3) * 0.62], [1, 1, 1], 0); }
  return g;
}

// ---- shelters and landmarks ----
function gurdwara() {
  const g = G();
  box(g, 8.4, 0.4, 6.4, '#e9e4da', [0, 0.2, 0]); box(g, 7.6, 3.6, 5.6, '#f7f4ee', [0, 2.2, 0]);
  box(g, 7.9, 0.3, 5.9, '#e2d6b6', [0, 4.1, 0]);
  half(g, 1.6, '#f7f4ee', [0, 4.2, 0], [1, 1.2, 1]); cone(g, 0.18, 0.9, '#e2b84a', [0, 6.5, 0]);
  for (const [x, z] of [[-3.4, -2.4], [3.4, -2.4], [-3.4, 2.4], [3.4, 2.4]]) { for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) cyl(g, 0.05, 0.05, 0.8, '#f7f4ee', [x + dx, 4.65, z + dz]); half(g, 0.55, '#f7f4ee', [x, 5.05, z]); }
  for (let k = -1; k <= 1; k++) { box(g, 1.1, 2, 0.08, '#c9a24a', [k * 2.2, 1.4, 2.82]); half(g, 0.55, '#c9a24a', [k * 2.2, 2.4, 2.82], [1, 0.8, 0.1]); }
  // the Nishan Sahib: a tall pole with the saffron flag
  cyl(g, 0.08, 0.1, 9, '#e98a1c', [5.6, 4.5, 3]); cone(g, 0.2, 0.6, '#c9ced3', [5.6, 9.3, 3]);
  const f = box(g, 1.8, 1, 0.03, '#f08a12', [6.5, 8.3, 3]); f.userData.wave = true;
  return g;
}
function dhaba() {
  const g = G();
  for (const [x, z] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]]) cyl(g, 0.06, 0.06, 2.3, '#7a5a38', [x, 1.15, z]);
  box(g, 3.6, 0.1, 3, '#8c9aa4', [0, 2.35, 0]); box(g, 2.4, 0.9, 0.8, '#7a5a38', [0, 0.45, -0.7]);
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
  box(g, 10.4, 0.4, 4.4, '#cfc5b3', [0, 0.2, 0]); box(g, 10, 3, 3.6, '#efe6d0', [0, 1.9, -0.2]);
  box(g, 10.6, 0.25, 4.6, '#3a6fa8', [0, 3.5, 0]);
  for (let k = -2; k <= 2; k++) { cyl(g, 0.14, 0.14, 3, '#f5f0e6', [k * 2.3, 1.9, 1.9]); if (k) win(g, 0.9, 0.9, k * 2.3 - 1.1, 2, 1.62, '#2a3a4a', '#3a6fa8'); }
  door(g, 1.2, 2.2, 0, 1.62, '#3a6fa8', 0.4);
  // Nepal's flag: two stacked crimson pennants with a blue border
  cyl(g, 0.05, 0.05, 6, '#cfd4d8', [6, 3, 2.4]);
  const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.lineTo(0, 1.4); fl.lineTo(1, 0.75); fl.lineTo(0.45, 0.75); fl.lineTo(1, 0); fl.closePath();
  const f = put(g, new THREE.ShapeGeometry(fl), M('#d0102a', { side: THREE.DoubleSide }), [6.05, 4.4, 2.4]); f.userData.wave = true;
  return g;
}
function lhakhang() {
  const g = G();
  box(g, 5.6, 0.5, 4.6, '#d9d2c2', [0, 0.25, 0]); box(g, 5, 3, 4, '#f4efe4', [0, 2, 0]);
  box(g, 5.1, 0.6, 4.1, '#8a2a20', [0, 3.3, 0]); // the red kemar band
  pyramid(g, 6, 1.4, '#d4a73a', 3.6); cone(g, 0.3, 1, '#e2b84a', [0, 5.4, 0]);
  door(g, 1.2, 2, 0, 2.01, '#8a2a20', 0.5);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; cyl(g, 0.04, 0.04, 5, '#d9d2c2', [Math.cos(a) * 4.4, 2.5, Math.sin(a) * 4.4]); const f = box(g, 0.4, 3.4, 0.02, ['#2b6cb0', '#f4efe4', '#c62a2a', '#2e8b57', '#e2b84a', '#f4efe4'][k], [Math.cos(a) * 4.4 + 0.22, 3.2, Math.sin(a) * 4.4]); f.userData.wave = true; }
  return g;
}
function kyaung() {
  const g = G();
  for (const x of [-2.6, 0, 2.6]) for (const z of [-2, 2]) cyl(g, 0.15, 0.15, 1.4, '#5a3a22', [x, 0.7, z]);
  box(g, 6.6, 0.3, 5, '#6b4a2b', [0, 1.5, 0]); box(g, 5.6, 2.2, 4, '#7a4a28', [0, 2.75, 0]);
  for (let k = 0; k < 3; k++) pyramid(g, 7 - k * 1.8, 1, '#4f3a2a', 3.85 + k * 1.05);
  cone(g, 0.2, 1.6, '#e2b84a', [0, 7.8, 0]);
  for (let k = 0; k < 6; k++) box(g, 1.4, 0.1, 0.3, '#6b4a2b', [0, 0.25 * k + 0.1, 3.8 - k * 0.25]);
  return g;
}
function chorten(p) {
  const g = G();
  box(g, 2.4, 0.6, 2.4, '#f4efe4', [0, 0.3, 0]); box(g, 1.9, 0.5, 1.9, '#f4efe4', [0, 0.85, 0]);
  half(g, 0.9, '#f4efe4', [0, 1.1, 0], [1, 1.1, 1]);
  box(g, 0.7, 0.4, 0.7, '#8a2a20', [0, 2.15, 0]); cone(g, 0.3, 1.2, '#e2b84a', [0, 2.95, 0], [0, 0, 0], 10);
  return g;
}
function zedi() {
  const g = G();
  for (let k = 0; k < 3; k++) box(g, 4.6 - k * 1.1, 0.6, 4.6 - k * 1.1, '#f5f1e8', [0, 0.3 + k * 0.6, 0]);
  put(g, new THREE.SphereGeometry(1.3, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), '#f5f1e8', [0, 1.8, 0], [0, 0, 0], [1, 1.25, 1]);
  cone(g, 0.6, 3.4, '#e2b84a', [0, 4.5, 0], [0, 0, 0], 12); blob(g, 0.15, '#f7e08a', [0, 6.3, 0], [1, 1, 1], 0);
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
  cyl(g, 1.3, 1.4, 1.2, '#d9b866', [0, 0.6, 0], [0, 0, 0], 12); half(g, 1.32, '#cfa957', [0, 1.2, 0], [1, 1.1, 1]); cone(g, 0.2, 0.5, '#a8833e', [0, 2.7, 0]);
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
  if (type === 'mango' || type === 'sal' || type === 'tamarind') {
    const h = type === 'sal' ? 5.5 : type === 'tamarind' ? 2.6 : 2.2, col = type === 'sal' ? '#2f5d2a' : type === 'tamarind' ? '#5b7f3a' : '#2f6a2e';
    trunk(g, h, type === 'tamarind' ? 0.4 : 0.28, type === 'sal' ? '#5a4632' : '#6b4a2b');
    const R = type === 'tamarind' ? 3 : type === 'sal' ? 1.9 : 2.1;
    const bark = type === 'sal' ? '#5a4632' : '#6b4a2b';
    if (type !== 'sal') limbs(g, h - 0.2, type === 'tamarind' ? 0.4 : 0.28, bark, R * 0.7);
    canopy(g, R * 1.12, col, [0, h + R * 0.62, 0], type === 'tamarind' ? 0.58 : type === 'sal' ? 1.05 : 0.82, type === 'tamarind' ? 10 : 8);
    if (type === 'mango') {
      // Hanging green mangoes
      for (let k = 0; k < 6; k++) {
        const ma = k * 1.1, mr = R * 0.75;
        blob(g, 0.09, '#84cc16', [Math.cos(ma) * mr, h + R * 0.4, Math.sin(ma) * mr], [0.8, 1.2, 0.8], 0);
      }
    }
  } else if (type === 'eucalyptus') {
    trunk(g, 9, 0.2, '#d9d2c2');
    const crown = G(); crown.position.set(0, 8.5, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.04;
    blob(crown, 1.2, '#6f8f5a', [0, 0, 0], [0.8, 1.6, 0.8]); blob(crown, 0.9, '#6f8f5a', [0.4, -1.7, 0.2], [0.8, 1.4, 0.8]);
  } else if (type === 'poplar') {
    trunk(g, 2, 0.14, '#9a9488');
    const crown = G(); crown.position.set(0, 4.6, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.055;
    blob(crown, 0.9, '#7f9f4a', [0, 0, 0], [0.75, 3.2, 0.75]);
  } else if (type === 'kikar') {
    const t = trunk(g, 2.4, 0.16, '#5a4632'); t.rotation.z = 0.15;
    const crown = G(); crown.position.set(0, 2.8, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.05;
    blob(crown, 2.2, '#7d8a4a', [0.3, 0.1, 0], [1.3, 0.35, 1.2]); blob(crown, 1.3, '#7d8a4a', [-1, -0.2, 0.6], [1.2, 0.35, 1.1]);
  } else if (type === 'bluepine') {
    trunk(g, 1.2, 0.18, '#4a3628');
    const crown = G(); crown.position.set(0, 1.6, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.035;
    for (let k = 0; k < 4; k++) cone(crown, 1.7 - k * 0.35, 2.2, '#2a5a48', [0, k * 1.35, 0], [0, 0, 0], 8);
  } else if (type === 'banana') {
    trunk(g, 1.8, 0.16, '#6f8a3a');
    const crown = G(); crown.position.set(0, 1.85, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.11;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      box(crown, 0.52, 0.04, 2.4, '#5fa02c', [Math.cos(a) * 0.9, 0.2, Math.sin(a) * 0.9], [0.55, -a + Math.PI / 2, 0]);
    }
    cyl(crown, 0.035, 0.03, 0.55, '#4f7a28', [0.25, -0.2, 0.2], [0.8, 0, 0.3]);
    cone(crown, 0.11, 0.3, '#831843', [0.38, -0.42, 0.32], [Math.PI, 0, 0], 6);
    for (let b = 0; b < 6; b++) {
      cyl(crown, 0.03, 0.025, 0.18, '#70a530', [0.28 + (b % 2) * 0.12, -0.15 - Math.floor(b / 2) * 0.08, 0.24], [1.1, 0, b * 0.4], 4);
    }
  } else { // palms: date, toddy (palmyra)
    const toddy = type === 'toddy', h = toddy ? 10 : 6;
    cyl(g, 0.22, toddy ? 0.34 : 0.3, h, '#6b5340', [0, h / 2, 0], [0, 0, 0], 7);
    if (toddy) {
      const crown = G(); crown.position.set(0, h, 0); g.add(crown);
      crown.userData.crown = true; crown.userData.swayAmp = 0.065;
      blob(crown, 0.6, '#3d3226', [0, 0.1, 0], [1, 0.8, 1], 0);
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2, e = (k % 2) * 0.5;
        put(crown, new THREE.CircleGeometry(1.1, 8, 0, Math.PI), M('#5c7d3a', { side: THREE.DoubleSide }), [Math.cos(a) * 0.9, 0.4 + e * 0.4, Math.sin(a) * 0.9], [-1.2 + e, -a + Math.PI / 2, 0]);
      }
    } else {
      const crown = G(); crown.position.set(0, h, 0); g.add(crown);
      crown.userData.crown = true; crown.userData.swayAmp = 0.075;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        box(crown, 0.36, 0.04, 2.7, '#5f7f38', [Math.cos(a) * 1.1, -0.1, Math.sin(a) * 1.1], [0.55, -a + Math.PI / 2, 0]);
      }
      for (let k = 0; k < 3; k++) blob(crown, 0.3, '#c96f1e', [Math.cos(k * 2.1) * 0.4, -0.6, Math.sin(k * 2.1) * 0.4], [1, 1.3, 1], 0);
      // Traditional date palm sap clay pot (রস সংগ্রহের মাটির হাঁড়ি)
      blob(g, 0.18, '#b45309', [0.26, h - 1.8, 0], [1, 1.15, 1], 0);
      cyl(g, 0.07, 0.1, 0.08, '#9a3412', [0.26, h - 1.68, 0]);
      cyl(g, 0.015, 0.015, 0.2, '#fde047', [0.18, h - 1.55, 0], [0.6, 0, 0]);
    }
  }
  return g;
}

// ---- animals ----
export function animal(type) {
  const g = G();
  if (type === 'egret') {
    // White wetland egret (সাদা বক): slender elegant body, S-curved long neck, golden spear bill, wading legs, wings
    const colW = '#ffffff';
    blob(g, 0.14, colW, [0, 0.42, 0], [0.85, 0.85, 1.5], 0);
    // Wings on sides (flare open when taking off)
    const wingL = G(); wingL.position.set(-0.13, 0.44, 0); g.add(wingL);
    box(wingL, 0.03, 0.14, 0.35, '#f1f5f9', [0, 0, -0.05], [0.1, 0, 0]);
    const wingR = G(); wingR.position.set(0.13, 0.44, 0); g.add(wingR);
    box(wingR, 0.03, 0.14, 0.35, '#f1f5f9', [0, 0, -0.05], [0.1, 0, 0]);
    // S-curved neck and head
    const neck = G(); neck.position.set(0, 0.46, 0.18); g.add(neck);
    cyl(neck, 0.035, 0.045, 0.28, colW, [0, 0.12, 0.05], [-0.35, 0, 0], 6);
    cyl(neck, 0.032, 0.035, 0.26, colW, [0, 0.32, 0.02], [0.45, 0, 0], 6);
    blob(neck, 0.05, colW, [0, 0.44, 0.09], [0.8, 0.8, 1.2], 0);
    // Golden spear bill
    cone(neck, 0.022, 0.2, '#f59e0b', [0, 0.44, 0.24], [Math.PI / 2, 0, 0], 4);
    // Black stilt wading legs
    const legs = {};
    for (const [s, key] of [[-0.06, 'lL'], [0.06, 'lR']]) {
      const leg = G(); leg.position.set(s, 0.36, -0.02); g.add(leg);
      cyl(leg, 0.014, 0.012, 0.36, '#1c1917', [0, -0.18, 0], [0, 0, 0], 4);
      box(leg, 0.05, 0.008, 0.08, '#1c1917', [0, -0.36, 0.03]);
      legs[key] = leg;
    }
    g.userData.animal = { kind: 'egret', neck, wingL, wingR, legs };
    return g;
  }
  const col = { buffalo: '#2a2624', cow: '#c9a27a', ox: '#e8e2d6', goat: '#7a5638', donkey: '#8c8680', chicken: '#f1ece2' }[type];
  if (type === 'chicken') {
    blob(g, 0.18, col, [0, 0.26, 0], [1, 0.95, 1.35], 0);
    blob(g, 0.14, '#b45309', [-0.14, 0.28, 0.02], [0.35, 0.8, 1.1], 0);
    blob(g, 0.14, '#b45309', [0.14, 0.28, 0.02], [0.35, 0.8, 1.1], 0);
    const tail = G(); tail.position.set(0, 0.32, -0.18); g.add(tail);
    for (let k = 0; k < 3; k++) box(tail, 0.02, 0.2, 0.08, '#1e293b', [0, 0.08 + k * 0.04, -0.05 * k], [0.45 - k * 0.15, 0, 0]);
    const head = G(); head.position.set(0, 0.38, 0.16); g.add(head);
    cyl(head, 0.055, 0.07, 0.18, col, [0, 0.04, 0.02], [0.4, 0, 0], 6);
    blob(head, 0.075, col, [0, 0.14, 0.06], [1, 1, 1], 0);
    cone(head, 0.028, 0.08, '#eab308', [0, 0.13, 0.15], [Math.PI / 2, 0, 0], 4);
    box(head, 0.02, 0.07, 0.1, '#dc2626', [0, 0.22, 0.05]);
    blob(head, 0.025, '#dc2626', [0, 0.08, 0.11], [0.6, 1.2, 0.6], 0);
    const legL = G(); legL.position.set(-0.06, 0.18, 0); g.add(legL);
    cyl(legL, 0.015, 0.012, 0.18, '#ca8a04', [0, -0.09, 0], [0, 0, 0], 4);
    box(legL, 0.06, 0.01, 0.09, '#ca8a04', [0, -0.18, 0.03]);
    const legR = G(); legR.position.set(0.06, 0.18, 0); g.add(legR);
    cyl(legR, 0.015, 0.012, 0.18, '#ca8a04', [0, -0.09, 0], [0, 0, 0], 4);
    box(legR, 0.06, 0.01, 0.09, '#ca8a04', [0, -0.18, 0.03]);
    g.userData.animal = { kind: 'chicken', head, tail, legL, legR };
    return g;
  }
  // four-legged: a barrel body with a deep chest and round haunches, jointed legs on dark hooves, a neck that bends
  // down to graze, a head with a muzzle, nostrils, eyes and ears, and each animal's own horns, hump, udder or mane
  const big = type === 'buffalo' ? 1.15 : type === 'goat' ? 0.55 : type === 'donkey' ? 0.75 : 1;
  const b = G(); b.scale.setScalar(big); g.add(b);
  const tone = (k) => '#' + new THREE.Color(col).lerp(new THREE.Color(k < 0 ? '#000000' : '#ffffff'), Math.abs(k)).getHexString();
  const hoof = '#2a221d', pale = type === 'buffalo' || type === 'donkey' ? tone(0.25) : '#e9dccb';
  const nose = type === 'buffalo' ? '#141110' : type === 'donkey' ? tone(0.45) : '#b98579';
  put(b, new THREE.CapsuleGeometry(0.37, 0.95, 4, 10), col, [0, 1.05, -0.02], [Math.PI / 2, 0, 0], [0.95, 1, 1.12]);
  blob(b, 0.38, col, [0, 1.1, 0.5], [0.98, 1.08, 0.95]); // chest and shoulders
  blob(b, 0.37, col, [0, 1.1, -0.52], [1.02, 1.04, 0.95]); // haunches
  blob(b, 0.3, tone(0.12), [0, 0.86, 0.05], [1, 0.55, 2.2]); // the lighter belly
  if (type === 'ox') { blob(b, 0.24, tone(-0.12), [0, 1.5, 0.5], [0.9, 1.1, 1.1]); blob(b, 0.2, col, [0, 0.86, 0.8], [0.35, 1.3, 1]); } // zebu hump and dewlap
  if (type === 'cow') {
    blob(b, 0.15, '#e3aaa0', [0, 0.72, -0.36], [1, 0.7, 1.1]);
    for (const [x, z] of [[-0.05, -0.31], [0.05, -0.31], [-0.05, -0.41], [0.05, -0.41]]) cyl(b, 0.015, 0.01, 0.07, '#d8968c', [x, 0.63, z]);
    // Piebald white flank patches
    blob(b, 0.25, '#f8fafc', [0.27, 1.08, 0.1], [0.5, 0.9, 1.3], 0);
    blob(b, 0.21, '#f8fafc', [-0.27, 1.12, -0.2], [0.5, 1.0, 1.1], 0);
  }
  if (type === 'donkey') for (let k = 0; k < 5; k++) box(b, 0.05, 0.12, 0.14, '#3b3633', [0, 1.5 + k * 0.08, 0.72 + k * 0.07], [0.9, 0, 0]); // the upright mane

  // articulated legs grouped at hip/shoulder pivots for walking/shifting
  const legs = {};
  for (const [x, z, hind, key] of [[-0.2, 0.55, 0, 'fL'], [0.2, 0.55, 0, 'fR'], [-0.2, -0.55, 1, 'bL'], [0.2, -0.55, 1, 'bR']]) {
    const leg = G(); leg.position.set(x, 0.92, z); b.add(leg);
    cyl(leg, hind ? 0.13 : 0.11, 0.075, 0.46, col, [0, -0.2, 0], [hind ? -0.12 : 0.04, 0, 0], 8);
    blob(leg, 0.075, col, [0, -0.42, hind ? -0.03 : 0.01], [1, 1, 1], 0);
    cyl(leg, 0.06, 0.052, 0.38, col, [0, -0.62, 0], [0, 0, 0], 7);
    cyl(leg, 0.062, 0.078, 0.1, hoof, [0, -0.84, 0], [0, 0, 0], 7);
    legs[key] = leg;
  }

  // the head hangs from a pivot at the base of the neck; world.js swings it down to the grass and back
  // cattle and buffalo carry the head low and forward on a short thick neck; the goat and donkey hold it higher
  const bovine = type === 'cow' || type === 'ox' || type === 'buffalo';
  const head = G(); head.position.set(0, bovine ? 1.15 : 1.2, 0.72); b.add(head);
  if (bovine) cyl(head, 0.2, 0.3, 0.5, col, [0, 0.12, 0.2], [1.2, 0, 0], 9);
  else cyl(head, 0.15, 0.26, 0.68, col, [0, 0.24, 0.2], [0.9, 0, 0], 9); // the neck, up and forward
  const n = bovine ? [0, 0.24, 0.46] : [0, 0.46, 0.4];
  blob(head, 0.18, col, n, [0.85, 0.95, 1.05]); // the skull
  cyl(head, 0.1, 0.135, 0.36, col, [0, n[1] - 0.12, n[2] + 0.2], [2.1, 0, 0], 9); // the long face
  blob(head, 0.11, nose, [0, n[1] - 0.24, n[2] + 0.37], [1.05, 0.75, 0.75]); // muzzle and nostrils
  if (type === 'cow' || type === 'ox') {
    blob(head, 0.09, pale, [0, n[1] + 0.03, n[2] + 0.15], [0.9, 1.2, 0.5]); // the pale blaze
    // Jute halter rope and brass collar bell (ঘণ্টি)
    cyl(head, 0.03, 0.03, 0.55, '#92400e', [0, 0.06, 0.18], [1.2, 0, 0], 8);
    cone(head, 0.045, 0.075, '#eab308', [0, -0.12, 0.22], [0, 0, 0], 6);
    blob(head, 0.02, '#ca8a04', [0, -0.16, 0.22]);
  }
  // Eyes
  for (const s of [-1, 1]) blob(head, 0.028, '#120d0b', [s * 0.13, n[1] + 0.02, n[2] + 0.1], [1, 1, 1], 0);

  // Pivotable ears for realistic fly-flicking
  const earL = G(), earR = G();
  earL.position.set(-0.16, n[1] + 0.02, n[2] - 0.04); head.add(earL);
  earR.position.set(0.16, n[1] + 0.02, n[2] - 0.04); head.add(earR);
  if (type === 'donkey') {
    cone(earL, 0.06, 0.42, col, [0, 0.18, 0], [-0.15, 0, 0.18], 6);
    cone(earR, 0.06, 0.42, col, [0, 0.18, 0], [-0.15, 0, -0.18], 6);
  } else {
    cone(earL, 0.07, 0.2, tone(-0.08), [-0.05, 0, 0], [0, 0, Math.PI / 2 + 0.25], 6);
    cone(earR, 0.07, 0.2, tone(-0.08), [0.05, 0, 0], [0, 0, -(Math.PI / 2 + 0.25)], 6);
  }

  // Horns
  for (const s of [-1, 1]) {
    if (type === 'buffalo') { // heavy horns: out to the side, then swept back and up
      cyl(head, 0.06, 0.07, 0.22, '#1a1716', [s * 0.22, n[1] + 0.13, n[2] - 0.06], [0, 0, s * Math.PI / 2], 6);
      cone(head, 0.06, 0.38, '#1a1716', [s * 0.36, n[1] + 0.2, n[2] - 0.24], [-1.15, s * 0.35, 0], 6);
    }
    else if (type === 'goat') cone(head, 0.035, 0.24, '#4a3a2c', [s * 0.06, n[1] + 0.2, n[2] - 0.08], [-0.55, 0, -s * 0.15], 5);
    else if (type === 'cow' || type === 'ox') cone(head, 0.04, type === 'ox' ? 0.24 : 0.16, '#d9d0bd', [s * 0.15, n[1] + 0.16, n[2] - 0.04], [0, 0, -s * 0.55], 5);
  }
  if (type === 'goat') cone(head, 0.04, 0.14, '#3a2c20', [0, n[1] - 0.36, n[2] + 0.3], [Math.PI, 0, 0], 5); // the beard
  const tail = G(); tail.position.set(0, 1.28, -0.9); b.add(tail);
  cyl(tail, 0.035, 0.022, 0.72, col, [0, -0.36, -0.03], [0.05, 0, 0], 6);
  blob(tail, 0.06, type === 'ox' ? '#2a2420' : tone(-0.35), [0, -0.76, -0.05], [0.8, 1.6, 0.8], 0); // the tuft
  g.userData.animal = { kind: 'grazer', head, tail, earL, earR, legs, torso: b };
  return g;
}


// ---- Bangladesh ----
const tinTex = () => canvasTex('tin', 64, 32, (c, w, h) => { c.fillStyle = '#8f9ba3'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 4) { c.fillStyle = x % 8 ? '#a7b2b9' : '#7c8890'; c.fillRect(x, 0, 2, h); } c.fillStyle = 'rgba(150,80,40,.25)'; c.fillRect(0, h - 6, w, 6); }, [4, 2]);
function tinhouse(p) {
  const g = G(); const tm = M('#fff', { map: tinTex() });
  const plinth = p.plinth ?? 0.4;
  box(g, 7, plinth, 5.4, '#8a6a48', [0, plinth / 2, 0]);
  box(g, 6.4, 2.4, 4.8, p.mud ? '#b8956a' : tm, [0, plinth + 1.2, 0]);
  gable(g, 7.4, 6, 1.8, tm, plinth + 2.4);
  door(g, 1, 1.9, 0.6, 2.41, '#3e6fa8', plinth); win(g, 0.8, 0.7, -1.8, plinth + 1.4, 2.42, '#2a2420', '#3e6fa8');
  for (const x of [-3, 3]) cyl(g, 0.06, 0.06, 2.2, '#6b4a2b', [x, plinth + 1.1, 3.3]);
  box(g, 6.6, 0.06, 1.4, tm, [0, plinth + 2.25, 3.1], [0.18, 0, 0]);
  return g;
}
function thatchhouse(p) {
  const g = G(); const plinth = p.plinth ?? 0.7;
  box(g, 7, plinth, 5.4, '#8a6a48', [0, plinth / 2, 0]);
  box(g, 6.2, 2.2, 4.6, '#b8956a', [0, plinth + 1.1, 0]);
  gable(g, 7.6, 6.6, 2.4, '#8f7a4a', plinth + 2.2); // golpata thatch
  door(g, 1, 1.8, 0.4, 2.31, '#5a3a22', plinth);
  return g;
}
const bdFlag = (g, x, z, h = 6) => {
  cyl(g, 0.05, 0.05, h, '#cfd4d8', [x, h / 2, z]);
  const f = box(g, 1.5, 0.9, 0.02, '#006a4e', [x + 0.78, h - 0.5, z]); f.userData.wave = true;
  const d = put(g, new THREE.CircleGeometry(0.27, 16), M('#f42a41', { side: THREE.DoubleSide }), [x + 0.7, h - 0.5, z + 0.015]); d.userData.wave = true;
};
function school() {
  const g = G(); const bm = M('#fff', { map: brickTex() });
  box(g, 14.4, 0.4, 4.4, '#cfc5b3', [0, 0.2, 0]); box(g, 14, 3, 3, bm, [0, 1.9, -0.5]);
  box(g, 14.6, 0.25, 4.6, '#e8dfcf', [0, 3.5, 0]);
  for (let k = -3; k <= 3; k++) { cyl(g, 0.15, 0.15, 3, '#f1ece2', [k * 2.2, 1.9, 1.8]); if (k) door(g, 0.9, 2, k * 2.2 - 1.1, 1.01, '#2f6b3d', 0.4); }
  bdFlag(g, 7.6, 2.6);
  return g;
}
function shelter() {
  // a cyclone shelter: open on pillars at the ground, two storeys above the surge
  const g = G();
  for (const x of [-5, 0, 5]) for (const z of [-2.6, 2.6]) cyl(g, 0.3, 0.3, 3, '#e8e4da', [x, 1.5, z], [0, 0, 0], 10);
  box(g, 11.6, 0.4, 6.4, '#d9d2c2', [0, 3.2, 0]); box(g, 11, 2.8, 5.8, '#f4f1ea', [0, 4.8, 0]);
  box(g, 11.6, 0.4, 6.4, '#d9d2c2', [0, 6.4, 0]); box(g, 11, 2.6, 5.8, '#f4f1ea', [0, 7.9, 0]);
  box(g, 11.8, 0.3, 6.6, '#2f6b9a', [0, 9.35, 0]);
  for (let k = -2; k <= 2; k++) { win(g, 1.2, 1, k * 2.1, 4.9, 2.92, '#2a3a4a', '#2f6b9a'); win(g, 1.2, 1, k * 2.1, 8, 2.92, '#2a3a4a', '#2f6b9a'); }
  for (let k = 0; k < 10; k++) box(g, 1.6, 0.12, 0.45, '#cfc5b3', [6.6, 0.3 * k + 0.15, 2.4 - k * 0.42]);
  bdFlag(g, -6.6, 3.4, 11);
  return g;
}
function tilashed() {
  const g = G();
  for (const [x, z] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) cyl(g, 0.08, 0.08, 2.4, '#9c8a4a', [x, 1.2, z]);
  gable(g, 4, 3.4, 1, M('#fff', { map: tinTex() }), 2.4); box(g, 3.4, 0.2, 2.6, '#8a6a42', [0, 0.1, 0]);
  return g;
}
function kiln() {
  const g = G();
  box(g, 10, 2.2, 6, '#8a4a32', [0, 1.1, 0]); cyl(g, 0.9, 1.4, 18, '#9a5a3a', [0, 9, 0], [0, 0, 0], 10);
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
function duck() {
  const g = G();
  // Domestic delta duck (পাতিহাঁস): boat-shaped buoyant body, wing accents, upcurled tail, mallard sheen head, orange bill
  blob(g, 0.18, '#f8fafc', [0, 0.14, 0], [0.95, 0.75, 1.45], 0);
  blob(g, 0.12, '#cbd5e1', [-0.14, 0.16, 0.02], [0.25, 0.6, 1.0], 0);
  blob(g, 0.12, '#cbd5e1', [0.14, 0.16, 0.02], [0.25, 0.6, 1.0], 0);
  cone(g, 0.05, 0.14, '#64748b', [0, 0.2, -0.2], [-0.75, 0, 0], 4);
  const head = G(); head.position.set(0, 0.22, 0.18); g.add(head);
  cyl(head, 0.045, 0.06, 0.16, '#15803d', [0, 0.06, 0.02], [0.4, 0, 0], 6);
  blob(head, 0.075, '#15803d', [0, 0.14, 0.05], [0.9, 0.95, 1.1], 0);
  box(head, 0.065, 0.025, 0.12, '#ea580c', [0, 0.12, 0.15], [0.2, 0, 0]);
  blob(head, 0.014, '#0f172a', [-0.065, 0.15, 0.08]);
  blob(head, 0.014, '#0f172a', [0.065, 0.15, 0.08]);
  g.userData.animal = { kind: 'duck', head };
  return g;
}
function tea() { const g = G(); blob(g, 0.6, '#3f7a34', [0, 0.45, 0], [1.2, 0.7, 1.2], 1); return g; }
function stone(p) { const g = G(); blob(g, 0.5, '#8b8f8c', [0, 0.15, 0], [1.2, 0.6, 1], 0); return g; }
function treeBD(type) {
  const g = G();
  if (type === 'banyan') {
    // Ancient Banyan Tree (বটগাছ): wide sprawling gnarled trunk, fluted buttress roots,
    // hanging aerial prop roots (ঝুড়ি) descending to the earth, wide tiered umbrella canopy
    const R = 4.2;
    trunk(g, 3.2, 0.65, '#4a3628');
    for (let k = 0; k < 5; k++) {
      const a = k * (Math.PI * 2 / 5);
      cyl(g, 0.15, 0.35, 1.4, '#3d2b1f', [Math.cos(a) * 0.7, 0.7, Math.sin(a) * 0.7], [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], 6);
    }
    limbs(g, 2.8, 0.55, '#4a3628', 3.6, 5);
    // Aerial prop roots (ঝুড়ি)
    for (let k = 0; k < 8; k++) {
      const a = k * (Math.PI * 2 / 8) + 0.2, d = 1.6 + (k % 3) * 0.8;
      const rx = Math.cos(a) * d, rz = Math.sin(a) * d;
      const rootH = 3.0 + (k % 2) * 0.4;
      cyl(g, 0.05 + (k % 2) * 0.04, 0.07 + (k % 2) * 0.05, rootH, '#5a4533', [rx, rootH / 2, rz], [0.03 * (k % 3 - 1), 0, 0.03 * (k % 2)], 5);
    }
    canopy(g, R, '#1f4e24', [0, 4.4, 0], 0.52, 12);
  } else if (type === 'coconut') {
    cyl(g, 0.18, 0.28, 7.5, '#78624d', [0.55, 3.75, 0], [0, 0, -0.14], 8);
    for (let r = 1; r < 7; r++) {
      cyl(g, 0.25 - r * 0.01, 0.25 - r * 0.01, 0.05, '#524131', [0.55 * (r / 7.5), r, 0], [0, 0, -0.14], 8);
    }
    const crown = G(); crown.position.set(1.1, 7.3, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.085;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      box(crown, 0.35, 0.04, 3.2, '#3f7e2a', [Math.cos(a) * 1.3, -0.1, Math.sin(a) * 1.3], [0.72, -a + Math.PI / 2, 0]);
    }
    for (let k = 0; k < 7; k++) {
      const ca = k * 0.95;
      blob(crown, 0.2, '#558b2f', [Math.cos(ca) * 0.45, -0.32, Math.sin(ca) * 0.45], [0.95, 1.25, 0.95], 0);
    }
  } else if (type === 'betelnut') {
    cyl(g, 0.11, 0.14, 8.8, '#948e82', [0, 4.4, 0], [0, 0, 0], 7);
    for (let r = 1; r < 8; r++) cyl(g, 0.13, 0.13, 0.04, '#6d665a', [0, r * 1.1, 0], [0, 0, 0], 7);
    const crown = G(); crown.position.set(0, 8.8, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.07;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      box(crown, 0.28, 0.03, 2.1, '#528f32', [Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8], [0.65, -a + Math.PI / 2, 0]);
    }
    for (let k = 0; k < 4; k++) blob(crown, 0.13, '#f59e0b', [Math.cos(k * 1.6) * 0.24, -0.22, Math.sin(k * 1.6) * 0.24], [1, 1.2, 1], 0);
  } else if (type === 'bamboo') {
    const crown = G(); crown.position.set(0, 0, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.11;
    for (let k = 0; k < 11; k++) {
      const a = k * 0.65, r = 0.25 + (k % 4) * 0.22, culmH = 6.5 + (k % 3) * 0.8;
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      cyl(g, 0.055, 0.075, culmH, '#65a30d', [cx, culmH / 2, cz], [Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1], 6);
      for (let n = 1; n < culmH; n += 0.9) {
        cyl(g, 0.072, 0.072, 0.03, '#a3e635', [cx + Math.cos(a) * 0.1 * (n / culmH), n, cz + Math.sin(a) * 0.1 * (n / culmH)], [0, 0, 0], 6);
      }
    }
    blob(crown, 1.8, '#4d7c0f', [0, 6.8, 0], [1.3, 1.1, 1.3], 0);
    blob(crown, 1.4, '#65a30d', [0.4, 5.8, -0.3], [1.1, 1.0, 1.1], 0);
    blob(crown, 1.3, '#84cc16', [-0.3, 7.6, 0.3], [1.1, 0.9, 1.1], 0);
  } else if (type === 'hijal') {
    trunk(g, 2.2, 0.28, '#3d2b1f'); limbs(g, 2.0, 0.28, '#3d2b1f', 1.6);
    canopy(g, 2.3, '#1e5e2e', [0, 3.4, 0], 0.62);
    for (let k = 0; k < 6; k++) {
      const fa = k * 1.1, fr = 1.4 + (k % 2) * 0.5;
      cyl(g, 0.015, 0.015, 0.45, '#fb7185', [Math.cos(fa) * fr, 2.4, Math.sin(fa) * fr]);
    }
  } else if (type === 'nipa') {
    const crown = G(); crown.position.set(0, 0.8, 0); g.add(crown);
    crown.userData.crown = true; crown.userData.swayAmp = 0.09;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      box(crown, 0.32, 0.03, 3.2, '#4d7c0f', [Math.cos(a) * 1.1, 0.3, Math.sin(a) * 1.1], [-0.85, -a + Math.PI / 2, 0]);
    }
  } else if (type === 'guava') {
    trunk(g, 1.4, 0.16, '#78563c'); canopy(g, 1.4, '#528f32', [0, 2.2, 0], 0.8, 6);
    for (let k = 0; k < 6; k++) blob(g, 0.1, '#a3e635', [Math.cos(k * 1.1) * 1.1, 1.9, Math.sin(k * 1.1) * 1.1], [1, 1, 1], 0);
  } else if (type === 'mangrove') {
    trunk(g, 2.6, 0.24, '#3d2b1f'); canopy(g, 2.4, '#1b4d24', [0, 3.6, 0], 0.85);
    for (let k = 0; k < 9; k++) cone(g, 0.05, 0.45, '#523e2b', [Math.cos(k * 0.7) * 1.3, 0.22, Math.sin(k * 0.7) * 1.3], [0, 0, 0], 4);
  }
  return g;
}

export const BUILD = {
  brickhouse, mudhouse, tharuhouse, bhutanhouse, stilthouse, shed, kiosk,
  pumphouse, channel, mogha, stw, stream, pond: () => G(),
  tractor, trolley, donkeycart, oxcart, stall, gurdwara, dhaba, truck, wardoffice, lhakhang, kyaung, chorten, zedi, waterpots,
  kup, charpai, pots, dehari, machan, pole, lungdar, flagline,
  mango: () => tree('mango'), sal: () => tree('sal'), tamarind: () => tree('tamarind'), eucalyptus: () => tree('eucalyptus'), poplar: () => tree('poplar'),
  kikar: () => tree('kikar'), bluepine: () => tree('bluepine'), banana: () => tree('banana'), date: () => tree('date'), toddy: () => tree('toddy'),
  tinhouse, thatchhouse, school, shelter, tilashed, kiln, boat, van, llp, ghat, trellis, gher, bamboobridge, stilthut, stoneboat, duck, tea, stone,
  banyan: () => treeBD('banyan'), coconut: () => treeBD('coconut'), betelnut: () => treeBD('betelnut'), bamboo: () => treeBD('bamboo'), hijal: () => treeBD('hijal'), nipa: () => treeBD('nipa'), guava: () => treeBD('guava'), mangrove: () => treeBD('mangrove'),
  buffalo: () => animal('buffalo'), cow: () => animal('cow'), ox: () => animal('ox'), goat: () => animal('goat'), chicken: () => animal('chicken'), egret: () => animal('egret'),
};
export { box, cyl, cone, blob, half, put, M, gable, pyramid };

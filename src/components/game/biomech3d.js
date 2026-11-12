// The 3D scene of the biomechanics lab (/games#biomechanics): a cut-away block of the chosen delta soil with its
// strata, the paddy water on top where the field is flooded, and the farmer the user picked, as the game's real
// MakeHuman person (people.js + realPeople.js), doing the chosen task with a real tool: seedlings pushed into the mud,
// a kodal swung from overhead, a knapsack sprayer walked along the bund, a sickle drawn through ripe paddy, a basket
// carried on the head, a nirani scraping out weeds. The feet press prints into the mud as deep as the lab's sinkage
// number, and the mud rises round them.
//
// The four views of the lab are drawn on top: joint markers and live angle arcs (skeleton), the body coloured by the
// model's load on each region (muscles), the soil cut through under the foot with the forces and a stress bulb (soil
// resistance), and the strata with ions, roots and the carbon pools (geochemistry). The poses are an animation
// (../../game/biomechPose.js); every number in the lab comes from the lab's model, and the angles drawn on the body
// are measured from the animated skeleton and labelled as such.
//
// One renderer; it pauses when the lab is off screen and frees everything it made when it is taken down. The farmer's
// shared game geometry is never disposed here: the 3D farm game uses the same cached shapes.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildFarmer, animate } from '../../game/three/people.js';
import { TASK_MOTION, taskPose, sampleKeys, cycleSeconds, trunkFlexion, kneeFlexion, hipFlexion } from '../../game/biomechPose.js';

const W = 2.6, D = 3.0, DEPTH = 1.1, HX = W / 2, HZ = D / 2;
const NX = 104, NZ = 120;
const DEG = Math.PI / 180;
const BOUNDS = [0, 0.15, 0.4, 0.72, DEPTH]; // the four horizons the lab names: 0, 15, 40 and 72+ cm
const WATER_Y = 0.035;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const clamp01 = (x) => clamp(x, 0, 1);
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
const lerp = (a, b, t) => a + (b - a) * t;

// how each soil behaves under a foot and looks: recover = seconds for a print to flow back, rim = share of the
// sinkage pushed up round the print (wet mud bulges, a hard paleosol barely does)
const SOIL_LOOK = {
  wetland: { recover: 22, rim: 0.5, rough: 0.32, wet: 1, relief: 0.004 },
  barind: { recover: 150, rim: 0.12, rough: 0.96, wet: 0, relief: 0.007, cracks: true },
  loam: { recover: 70, rim: 0.28, rough: 0.88, wet: 0.25, relief: 0.006, sand: true },
  peat: { recover: 16, rim: 0.42, rough: 0.4, wet: 0.85, relief: 0.005, fibre: true },
};
const DEEP = { peat: '#21150d', barind: '#6b2a18', wetland: '#2a1a0f', loam: '#2a1a0f' };

// ---------- small procedural helpers ----------
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}
const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.2;
function shade(hex, f) { const c = new THREE.Color(hex); if (f >= 0) c.lerp(new THREE.Color('#ffffff'), f); else c.multiplyScalar(1 + f); return `#${c.getHexString()}`; }
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// The strata, as one picture of the cut face: 3.0 m wide (the block's long side) and 1.1 m deep.
function strataCanvas(soilId, topColor, moist) {
  const PX = 420, cw = Math.round(3.0 * PX), ch = Math.round(DEPTH * PX);
  const c = canvas(cw, ch), x = c.getContext('2d');
  const r = rng(soilId.length * 97 + 13);
  const wet = moist / 100;
  const cols = [shade(topColor, 0.12 - wet * 0.6), shade('#5a3a20', 0.05), shade('#3a2414', 0.08), shade(DEEP[soilId] ?? '#2a1a0f', 0.1)];
  if (soilId === 'barind') { cols[1] = '#7a3b22'; cols[2] = '#6a3220'; }
  if (soilId === 'loam') { cols[1] = '#6b5034'; cols[2] = '#4c3522'; }
  if (soilId === 'peat') { cols[1] = '#2f2017'; cols[2] = '#261a12'; }
  const edge = (i, px) => BOUNDS[i] * PX + (i ? Math.sin(px * 0.011 + i * 2.3) * 5 + (fbm(px * 0.02, i * 7) - 0.5) * 9 : 0);
  for (let i = 3; i >= 0; i--) {
    x.beginPath(); x.moveTo(0, edge(i, 0));
    for (let px = 0; px <= cw; px += 8) x.lineTo(px, edge(i, px));
    x.lineTo(cw, ch); x.lineTo(0, ch); x.closePath();
    const g = x.createLinearGradient(0, BOUNDS[i] * PX, 0, BOUNDS[i + 1] * PX);
    g.addColorStop(0, shade(cols[i], 0.06)); g.addColorStop(1, shade(cols[i], -0.12));
    x.fillStyle = g; x.fill();
  }
  // grain: every horizon speckled lighter and darker, finer deeper down
  for (let k = 0; k < 26000; k++) {
    const px = r() * cw, py = r() * ch, s = r() < 0.04 ? 2.4 : 1.1;
    x.fillStyle = r() < 0.5 ? 'rgba(255,240,220,0.10)' : 'rgba(0,0,0,0.16)';
    x.fillRect(px, py, s, s);
  }
  // plough pan: flat platy structure
  x.strokeStyle = 'rgba(0,0,0,0.22)'; x.lineWidth = 1;
  for (let k = 0; k < 70; k++) { const py = (0.16 + r() * 0.22) * PX, px = r() * cw, l = 30 + r() * 90; x.beginPath(); x.moveTo(px, py); x.lineTo(px + l, py + (r() - 0.5) * 2); x.stroke(); }
  // roots in the topsoil and a few deeper
  x.lineCap = 'round';
  for (let k = 0; k < 70; k++) {
    let px = r() * cw, py = 2; const deep = (r() < 0.2 ? 0.55 : 0.24) * PX;
    x.strokeStyle = `rgba(222,196,150,${0.25 + r() * 0.3})`; x.lineWidth = 0.6 + r() * 1.3;
    x.beginPath(); x.moveTo(px, py);
    while (py < deep) { px += (r() - 0.5) * 9; py += 4 + r() * 7; x.lineTo(px, py); }
    x.stroke();
  }
  // humus: worm channels and dark organic flecks
  for (let k = 0; k < 26; k++) {
    let px = r() * cw, py = (0.42 + r() * 0.26) * PX;
    x.strokeStyle = 'rgba(150,110,70,0.35)'; x.lineWidth = 3 + r() * 3; x.beginPath(); x.moveTo(px, py);
    for (let s = 0; s < 6; s++) { px += (r() - 0.5) * 28; py += (r() - 0.5) * 16; x.lineTo(px, py); }
    x.stroke();
  }
  // the deep horizon tells which soil this is
  const top3 = 0.74 * PX;
  if (soilId === 'barind') {
    for (let k = 0; k < 160; k++) { // red and grey mottles, iron-manganese nodules
      const px = r() * cw, py = top3 + r() * (ch - top3), rr = 4 + r() * 14;
      x.fillStyle = r() < 0.5 ? 'rgba(214,120,60,0.35)' : 'rgba(170,170,160,0.28)';
      x.beginPath(); x.ellipse(px, py, rr * 1.4, rr, r() * 3, 0, Math.PI * 2); x.fill();
    }
    for (let k = 0; k < 120; k++) { x.fillStyle = 'rgba(25,15,10,0.7)'; x.beginPath(); x.arc(r() * cw, 0.3 * PX + r() * (ch - 0.3 * PX), 1.5 + r() * 2.5, 0, Math.PI * 2); x.fill(); }
  } else if (soilId === 'peat') {
    for (let k = 0; k < 90; k++) { // wood and leaf fragments of the buried mangrove
      const px = r() * cw, py = top3 + r() * (ch - top3), l = 10 + r() * 46;
      x.strokeStyle = r() < 0.6 ? 'rgba(120,78,40,0.7)' : 'rgba(70,50,28,0.8)'; x.lineWidth = 2 + r() * 4;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + l, py + (r() - 0.5) * 12); x.stroke();
    }
    for (let k = 0; k < 40; k++) { x.strokeStyle = 'rgba(160,120,70,0.35)'; x.lineWidth = 1; const py = top3 + r() * (ch - top3); x.beginPath(); x.moveTo(0, py); for (let px = 0; px < cw; px += 40) x.lineTo(px, py + Math.sin(px * 0.02 + k) * 3); x.stroke(); }
  } else {
    for (let k = 0; k < 40; k++) { // silt and sand laminae
      const py = top3 + r() * (ch - top3);
      x.strokeStyle = soilId === 'loam' ? 'rgba(220,200,150,0.28)' : 'rgba(190,170,140,0.18)'; x.lineWidth = 1 + r() * 2;
      x.beginPath(); x.moveTo(0, py); for (let px = 0; px < cw; px += 30) x.lineTo(px, py + Math.sin(px * 0.013 + k) * 4); x.stroke();
    }
    for (let k = 0; k < 70; k++) { // shell fragments of the old river and delta floor
      const px = r() * cw, py = top3 + 6 + r() * (ch - top3 - 6), rr = 3 + r() * 6;
      x.strokeStyle = 'rgba(236,226,206,0.75)'; x.lineWidth = 1.6;
      x.beginPath(); x.arc(px, py, rr, Math.PI * (0.1 + r() * 0.2), Math.PI * (0.9 + r() * 0.2)); x.stroke();
    }
    if (soilId === 'loam') for (let k = 0; k < 140; k++) { const px = r() * cw, py = r() * ch, rr = 1.5 + r() * 4; x.fillStyle = 'rgba(200,185,160,0.55)'; x.beginPath(); x.ellipse(px, py, rr * 1.3, rr, r() * 3, 0, Math.PI * 2); x.fill(); }
  }
  if (soilId === 'wetland' || soilId === 'peat') { // grey-blue gley where the soil stays waterlogged
    for (let k = 0; k < 90; k++) { const px = r() * cw, py = (0.2 + r() * 0.5) * PX, rr = 5 + r() * 12; x.fillStyle = 'rgba(120,140,150,0.18)'; x.beginPath(); x.ellipse(px, py, rr * 1.6, rr, 0, 0, Math.PI * 2); x.fill(); }
  }
  // the horizon boundaries, drawn faintly
  x.strokeStyle = 'rgba(255,240,215,0.22)'; x.lineWidth = 1.2; x.setLineDash([6, 5]);
  for (let i = 1; i < 4; i++) { x.beginPath(); for (let px = 0; px <= cw; px += 8) (px ? x.lineTo(px, edge(i, px)) : x.moveTo(px, edge(i, px))); x.stroke(); }
  x.setLineDash([]);
  return c;
}

function topCanvas(soilId, color, moist) {
  const n = 512, c = canvas(n, n), x = c.getContext('2d');
  const r = rng(soilId.length * 31 + 7);
  x.fillStyle = shade(color, soilId === 'barind' ? 0.18 : 0.06 - moist / 120); x.fillRect(0, 0, n, n);
  const img = x.getImageData(0, 0, n, n), d = img.data;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { // tileable mottling
    const f = (fbm(i / 40, j / 40) + fbm((i - n) / 40, j / 40) * 0) - 0.5, k = (j * n + i) * 4;
    d[k] = clamp(d[k] * (1 + f * 0.5), 0, 255); d[k + 1] = clamp(d[k + 1] * (1 + f * 0.5), 0, 255); d[k + 2] = clamp(d[k + 2] * (1 + f * 0.45), 0, 255);
  }
  x.putImageData(img, 0, 0);
  for (let k = 0; k < 9000; k++) { x.fillStyle = r() < 0.5 ? 'rgba(255,240,220,0.12)' : 'rgba(0,0,0,0.18)'; const s = r() < 0.05 ? 3 : 1.4; x.fillRect(r() * n, r() * n, s, s); }
  if (SOIL_LOOK[soilId]?.cracks) { // a dry paleosol cracks into plates
    x.strokeStyle = 'rgba(40,14,6,0.7)'; x.lineWidth = 2.2;
    const pts = []; for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) pts.push([gx * n / 6 + r() * 60, gy * n / 6 + r() * 60]);
    for (const [px, py] of pts) { x.beginPath(); x.moveTo(px, py); let a = r() * 6.28; for (let s = 0; s < 4; s++) { a += (r() - 0.5) * 1.4; x.lineTo(px + Math.cos(a) * (20 + s * 18), py + Math.sin(a) * (20 + s * 18)); } x.stroke(); }
  }
  if (SOIL_LOOK[soilId]?.fibre) { x.strokeStyle = 'rgba(120,85,50,0.45)'; x.lineWidth = 1.2; for (let k = 0; k < 260; k++) { const px = r() * n, py = r() * n, a = r() * 6.28; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 14, py + Math.sin(a) * 14); x.stroke(); } }
  if (SOIL_LOOK[soilId]?.sand) for (let k = 0; k < 3000; k++) { x.fillStyle = 'rgba(235,220,180,0.35)'; x.fillRect(r() * n, r() * n, 1.6, 1.6); }
  return c;
}

function waterNormalCanvas() {
  const n = 256, c = canvas(n, n), x = c.getContext('2d'), img = x.createImageData(n, n);
  const h = (i, j) => Math.sin((i / n) * Math.PI * 2 * 3 + Math.sin((j / n) * Math.PI * 2 * 2) * 1.5) * 0.5 + Math.sin(((i + j) / n) * Math.PI * 2 * 5) * 0.3 + Math.sin(((i * 2 - j) / n) * Math.PI * 2 * 4) * 0.2;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const dx = h(i + 1, j) - h(i - 1, j), dy = h(i, j + 1) - h(i, j - 1), k = (j * n + i) * 4;
    const v = new THREE.Vector3(-dx * 0.6, -dy * 0.6, 1).normalize();
    img.data[k] = (v.x * 0.5 + 0.5) * 255; img.data[k + 1] = (v.y * 0.5 + 0.5) * 255; img.data[k + 2] = (v.z * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

function weaveCanvas() {
  const c = canvas(128, 64), x = c.getContext('2d');
  x.fillStyle = '#b8894a'; x.fillRect(0, 0, 128, 64);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 16; i++) { x.fillStyle = (i + j) % 2 ? '#d1a462' : '#9c7038'; x.fillRect(i * 8, j * 8, 8, 8); x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(i * 8, j * 8 + 7, 8, 1); }
  return c;
}

function blobCanvas() {
  const c = canvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 10, 64, 64, 64);
  g.addColorStop(0, 'rgba(30,40,30,0.38)'); g.addColorStop(1, 'rgba(30,40,30,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return c;
}

// ---------- plant and tool geometry ----------
function blade(len, w, lean, yaw, color) {
  const g = new THREE.ConeGeometry(w, len, 3, 1); g.translate(0, len / 2, 0); g.rotateZ(lean); g.rotateY(yaw);
  if (color) { const col = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) col.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
  return g;
}
function clumpGeometry(n, len, spread, seed, w = 0.0045) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < n; i++) parts.push(blade(len * (0.75 + r() * 0.35), w, (0.08 + r() * spread), r() * Math.PI * 2));
  return mergeGeometries(parts);
}
function paniclesGeometry(n, h, seed) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < n; i++) {
    const yaw = r() * Math.PI * 2, lean = 0.05 + r() * 0.12, hh = h * (0.85 + r() * 0.2);
    const pts = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6, bend = t * t * 0.22; pts.push(new THREE.Vector3(Math.sin(lean) * hh + bend * 0.9, hh * 0.92 + 0.05 - bend * 0.9, 0)); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.009, 4); g.rotateY(yaw); parts.push(g);
  }
  return mergeGeometries(parts);
}
function stemsGeometry(n, h, seed) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < n; i++) { const yaw = r() * Math.PI * 2, lean = 0.05 + r() * 0.12, hh = h * (0.85 + r() * 0.2); const g = new THREE.CylinderGeometry(0.0028, 0.004, hh, 4, 1, true); g.translate(0, hh / 2, 0); g.rotateZ(-lean); g.rotateY(yaw); parts.push(g); }
  return mergeGeometries(parts);
}
function rosetteGeometry(n, len, seed) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < n; i++) { const g = new THREE.SphereGeometry(1, 6, 4); g.scale(len * (0.8 + r() * 0.4), 0.006, len * 0.35); g.translate(len * 0.8, 0.012 + r() * 0.01, 0); g.rotateZ(0.25); g.rotateY((i / n) * Math.PI * 2 + r() * 0.4); parts.push(g); }
  return mergeGeometries(parts);
}

// An instanced crop: one draw for a whole field of identical plants.
class Crop {
  constructor(scene, geo, mat, cap) {
    this.mesh = new THREE.InstancedMesh(geo, mat, cap); this.mesh.count = 0; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false;
    this.cap = cap; this.items = []; scene.add(this.mesh);
  }
  add(x, y, z, yaw = 0, s = 1, tilt = 0, roll = 0) {
    if (this.items.length >= this.cap) return -1;
    this.items.push({ x, y, z, yaw, s, tilt, roll }); this.write(this.items.length - 1); this.mesh.count = this.items.length; return this.items.length - 1;
  }
  write(i) {
    const it = this.items[i], m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(it.tilt, it.yaw, it.roll, 'YXZ'));
    m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.s, it.s, it.s)); this.mesh.setMatrixAt(i, m); this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { this.items = []; this.mesh.count = 0; }
}

// ---------- the heat map on the real body ----------
// Regions by bone: x lumbar, y legs (the knee load), z shoulders, w chest (the cardiac load).
const BONE_REGION = {
  pelvis: [0.6, 0.2, 0, 0], spine_01: [1, 0, 0, 0], spine_02: [0.7, 0, 0, 0.3], spine_03: [0, 0, 0.3, 0.7],
  thigh_l: [0, 1, 0, 0], thigh_r: [0, 1, 0, 0], calf_l: [0, 1, 0, 0], calf_r: [0, 1, 0, 0], foot_l: [0, 0.4, 0, 0], foot_r: [0, 0.4, 0, 0],
  clavicle_l: [0, 0, 1, 0], clavicle_r: [0, 0, 1, 0], upperarm_l: [0, 0, 1, 0], upperarm_r: [0, 0, 1, 0], lowerarm_l: [0, 0, 0.45, 0], lowerarm_r: [0, 0, 0.45, 0], neck_01: [0, 0, 0.5, 0],
};
function heatAttribute(mesh) {
  const g = mesh.geometry;
  if (g.attributes.heat) return;
  const n = g.attributes.position.count, out = new Float32Array(n * 4);
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bones = mesh.skeleton?.bones;
  if (si && sw && bones) {
    const reg = bones.map((b) => BONE_REGION[b.name] ?? [0, 0, 0, 0]);
    const get = [(a, i) => a.getX(i), (a, i) => a.getY(i), (a, i) => a.getZ(i), (a, i) => a.getW(i)];
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
      const w = get[k](sw, i); if (!w) continue; const rr = reg[get[k](si, i)]; if (!rr) continue;
      out[i * 4] += w * rr[0]; out[i * 4 + 1] += w * rr[1]; out[i * 4 + 2] += w * rr[2]; out[i * 4 + 3] += w * rr[3];
    }
  }
  g.setAttribute('heat', new THREE.BufferAttribute(out, 4));
}
function heatMaterial(src, U) {
  const m = src.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uLoad = U.uLoad; sh.uniforms.uHeat = U.uHeat; sh.uniforms.uPulse = U.uPulse;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 heat;\nvarying vec4 vHeat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeat = heat;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec4 uLoad; uniform float uHeat; uniform float uPulse; varying vec4 vHeat;
vec3 heatRamp(float l) { vec3 g = vec3(0.13, 0.77, 0.37), y = vec3(0.98, 0.8, 0.08), r = vec3(0.94, 0.27, 0.27);
  return l < 0.65 ? mix(g, y, smoothstep(0.35, 0.65, l)) : mix(y, r, smoothstep(0.65, 0.88, l)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float hw = clamp(vHeat.x + vHeat.y + vHeat.z + vHeat.w, 0.0, 1.0);
float hl = dot(vHeat, uLoad) / max(vHeat.x + vHeat.y + vHeat.z + vHeat.w, 0.001);
vec3 hc = heatRamp(hl);
float grey = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(grey * 0.75 + 0.12), uHeat * 0.8);
diffuseColor.rgb = mix(diffuseColor.rgb, hc, uHeat * hw * 0.88);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += hc * uHeat * hw * (0.22 + 0.12 * uPulse * hl);`);
  };
  m.customProgramCacheKey = () => 'biomech-heat';
  return m;
}

// ---------- the scene ----------
export function createBiomechLab(host, overlay, chart, opts = {}) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  renderer.domElement.style.display = 'block'; renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);

  const own = []; // everything this lab made, freed on dispose
  const keep = (o) => { own.push(o); return o; };
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04); keep(envRT);
  scene.environment = envRT.texture; scene.environmentIntensity = 0.42;
  room.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
  camera.position.set(3.4, 1.2, 0.4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false; controls.enableZoom = false;
  controls.minPolarAngle = 0.2; controls.maxPolarAngle = Math.PI * 0.6; controls.rotateSpeed = 0.7;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  renderer.domElement.style.touchAction = 'pan-y'; // a finger dragged up or down still scrolls the page
  renderer.domElement.style.cursor = 'grab';

  // light: a warm low sun, a cool sky fill, the room environment for reflections in water, metal and skin
  const hemi = new THREE.HemisphereLight(0xeaf3ff, 0x5c4a34, 0.85);
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.5);
  sun.castShadow = true; sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -2.3, right: 2.3, top: 2.3, bottom: -2.3, near: 0.5, far: 14 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.025;
  const fill = new THREE.DirectionalLight(0xc4dcff, 0.55); fill.position.set(-3, 2, -2.5);
  scene.add(hemi, sun, sun.target, fill);

  const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), HX);
  const clipped = [clip];

  // ----- the block of soil -----
  const strataTex = keep(new THREE.CanvasTexture(canvas(4, 4))); strataTex.colorSpace = THREE.SRGBColorSpace;
  strataTex.wrapT = THREE.ClampToEdgeWrapping; strataTex.anisotropy = 8;
  const wallMat = keep(new THREE.MeshStandardMaterial({ map: strataTex, roughness: 0.94, clippingPlanes: clipped, side: THREE.DoubleSide }));
  const capMat = keep(new THREE.MeshStandardMaterial({ map: strataTex, roughness: 0.92, side: THREE.DoubleSide }));
  const bottomMat = keep(new THREE.MeshStandardMaterial({ color: '#1a120c', roughness: 1, clippingPlanes: clipped }));
  // a wall is a strip: n columns along `along` (x or z) at the fixed other coordinate; its top follows the surface
  function makeWall(axis, fixed, n, mat) {
    const g = keep(new THREE.BufferGeometry()), pos = new Float32Array((n + 1) * 2 * 3), uv = new Float32Array((n + 1) * 2 * 2), idx = [];
    const span = axis === 'x' ? W : D, half = span / 2;
    for (let i = 0; i <= n; i++) {
      const s = -half + (i / n) * span;
      for (let k = 0; k < 2; k++) {
        const j = (i * 2 + k);
        if (axis === 'x') { pos[j * 3] = s; pos[j * 3 + 2] = fixed; } else { pos[j * 3] = fixed; pos[j * 3 + 2] = s; }
        pos[j * 3 + 1] = k ? 0 : -DEPTH; uv[j * 2] = (s + 1.5) / 3.0; uv[j * 2 + 1] = k ? 1 : 0;
      }
      if (i < n) { const a = i * 2, b = a + 1, c2 = a + 2, d2 = a + 3; idx.push(a, c2, b, b, c2, d2); }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m);
    return { mesh: m, n, axis, setTop(fn) { for (let i = 0; i <= n; i++) { const j = i * 2 + 1, s = -half + (i / n) * span, y = fn(s); pos[j * 3 + 1] = y; uv[j * 2 + 1] = 1 + y / DEPTH; } g.attributes.position.needsUpdate = true; g.attributes.uv.needsUpdate = true; } };
  }
  const wallZp = makeWall('x', HZ, 52, wallMat), wallZn = makeWall('x', -HZ, 52, wallMat), wallXn = makeWall('z', -HX, 60, wallMat);
  const cap = makeWall('z', HX, NZ, capMat); // the cut face; it slides in under the foot for the soil views
  cap.mesh.receiveShadow = false; // the shadow pass ignores the cut, so plants cut away would still shade it
  const bottom = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, D)), bottomMat); bottom.rotation.x = Math.PI / 2; bottom.position.y = -DEPTH; scene.add(bottom);
  const blob = new THREE.Mesh(keep(new THREE.PlaneGeometry(W + 2.2, D + 2.2)), keep(new THREE.MeshBasicMaterial({ map: keep(new THREE.CanvasTexture(blobCanvas())), transparent: true, depthWrite: false })));
  blob.rotation.x = -Math.PI / 2; blob.position.y = -DEPTH - 0.004; scene.add(blob);

  // the surface: a height field the feet and the kodal press into
  const topGeo = keep(new THREE.PlaneGeometry(W, D, NX, NZ)); topGeo.rotateX(-Math.PI / 2);
  const NV = (NX + 1) * (NZ + 1);
  const base = new Float32Array(NV), dent = new Float32Array(NV), wetCol = new Float32Array(NV * 3).fill(1);
  topGeo.setAttribute('color', new THREE.BufferAttribute(wetCol, 3));
  const topTex = keep(new THREE.CanvasTexture(canvas(4, 4))); topTex.colorSpace = THREE.SRGBColorSpace; topTex.wrapS = topTex.wrapT = THREE.RepeatWrapping; topTex.repeat.set(3, 3.5); topTex.anisotropy = 8;
  const topMat = keep(new THREE.MeshStandardMaterial({ map: topTex, vertexColors: true, roughness: 0.6, clippingPlanes: clipped }));
  const top = new THREE.Mesh(topGeo, topMat); top.receiveShadow = true; scene.add(top);
  const vx = (i) => -HX + (i % (NX + 1)) * (W / NX), vz = (i) => -HZ + Math.floor(i / (NX + 1)) * (D / NZ);
  function heightAt(x, z) {
    const fx = clamp((x + HX) / (W / NX), 0, NX - 0.001), fz = clamp((z + HZ) / (D / NZ), 0, NZ - 0.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz, i = iz * (NX + 1) + ix;
    const h = (k) => base[k] + dent[k];
    return lerp(lerp(h(i), h(i + 1), tx), lerp(h(i + NX + 1), h(i + NX + 2), tx), tz);
  }
  const baseHeight = (x, z) => { const fx = clamp(Math.round((x + HX) / (W / NX)), 0, NX), fz = clamp(Math.round((z + HZ) / (D / NZ)), 0, NZ); return base[fz * (NX + 1) + fx]; };
  let topDirty = true;
  // press a print into the surface: an ellipse (a, b half-axes, turned by yaw) `depth` deep with a rim of mud round it
  function stamp(x, z, yaw, a, b, depth, rimH) {
    const R = Math.max(a, b) * 1.7, c = Math.cos(yaw), s = Math.sin(yaw);
    const i0 = clamp(Math.floor((x - R + HX) / (W / NX)), 0, NX), i1 = clamp(Math.ceil((x + R + HX) / (W / NX)), 0, NX);
    const j0 = clamp(Math.floor((z - R + HZ) / (D / NZ)), 0, NZ), j1 = clamp(Math.ceil((z + R + HZ) / (D / NZ)), 0, NZ);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * (NX + 1) + i, dx = vx(k) - x, dz = vz(k) - z;
      const u = (dx * s + dz * c) / a, v = (dx * c - dz * s) / b, r = Math.hypot(u, v);
      if (r < 1) dent[k] = Math.min(dent[k], -depth * (1 - r ** 4));
      else if (r < 1.7 && dent[k] > -0.002) dent[k] = Math.max(dent[k], rimH * Math.sin(((r - 1) / 0.7) * Math.PI));
    }
    topDirty = true;
  }
  function refreshTop() {
    const p = topGeo.attributes.position;
    const water = state.water;
    for (let k = 0; k < NV; k++) {
      const y = base[k] + dent[k]; p.setY(k, y);
      const wet = clamp01(-dent[k] / 0.03) * 0.35 + (water && y < WATER_Y ? 0.12 : 0);
      wetCol[k * 3] = wetCol[k * 3 + 1] = wetCol[k * 3 + 2] = 1 - wet;
    }
    p.needsUpdate = true; topGeo.attributes.color.needsUpdate = true; topGeo.computeVertexNormals();
    for (const wl of [wallZp, wallZn]) wl.setTop((s) => heightAt(s, wl === wallZp ? HZ - 0.001 : -HZ + 0.001));
    wallXn.setTop((s) => heightAt(-HX + 0.001, s));
    cap.setTop((s) => heightAt(state.cutX - 0.001, s));
    topDirty = false;
  }

  // the paddy water and its cut edge
  const wn = keep(new THREE.CanvasTexture(waterNormalCanvas())); wn.wrapS = wn.wrapT = THREE.RepeatWrapping; wn.repeat.set(4, 4);
  const waterMat = keep(new THREE.MeshStandardMaterial({ color: '#9fb3a2', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.4, normalMap: wn, normalScale: new THREE.Vector2(0.25, 0.25), clippingPlanes: clipped, depthWrite: false }));
  const water = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, D)), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; water.renderOrder = 2; scene.add(water);
  const waterEdgeMat = keep(new THREE.MeshStandardMaterial({ color: '#6f8a72', roughness: 0.2, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  const waterEdgeX = new THREE.Mesh(keep(new THREE.PlaneGeometry(D, WATER_Y + 0.12)), waterEdgeMat); waterEdgeX.rotation.y = Math.PI / 2; waterEdgeX.position.y = (WATER_Y - 0.12) / 2; scene.add(waterEdgeX);
  const waterEdgeZMat = waterEdgeMat.clone(); waterEdgeZMat.clippingPlanes = clipped; keep(waterEdgeZMat);
  const waterEdgeZ = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, WATER_Y + 0.12)), waterEdgeZMat); waterEdgeZ.position.set(0, (WATER_Y - 0.12) / 2, HZ - 0.002); scene.add(waterEdgeZ);

  // ripples on the water
  const ringGeo = keep(new THREE.RingGeometry(0.9, 1, 40)); ringGeo.rotateX(-Math.PI / 2);
  const ripples = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(ringGeo, keep(new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0, depthWrite: false, clippingPlanes: clipped }))); m.visible = false; m.renderOrder = 3; scene.add(m); return { m, t: 1, life: 1, r: 0.3 }; });
  let ripI = 0;
  function ripple(x, z, r = 0.32) { if (!state.water) return; const rp = ripples[ripI++ % ripples.length]; rp.m.position.set(x, WATER_Y + 0.003, z); rp.t = 0; rp.life = 1.3; rp.r = r; rp.m.visible = true; }

  // particles: splashes, mud, dust, spray mist, chaff
  const PMAX = 700;
  const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pAlpha = new Float32Array(PMAX), pSize = new Float32Array(PMAX);
  const pv = Array.from({ length: PMAX }, () => ({ vx: 0, vy: 0, vz: 0, life: 0, max: 1, g: 9.8, drag: 0, a0: 1, s0: 0.02, grow: 0 }));
  const pGeo = keep(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(pAlpha, 1)); pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
  const pU = { uScale: { value: 400 } };
  const pMat = keep(new THREE.ShaderMaterial({
    uniforms: pU, transparent: true, depthWrite: false,
    vertexShader: 'attribute vec3 aColor; attribute float aAlpha; attribute float aSize; uniform float uScale; varying vec3 vC; varying float vA; void main(){ vC=aColor; vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=max(1.0, aSize*uScale/-mv.z); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor=vec4(vC, vA*smoothstep(0.5,0.15,d)); }',
  }));
  const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; points.renderOrder = 4; scene.add(points);
  let pI = 0;
  const _c = new THREE.Color();
  function emit(n, x, y, z, o) {
    if (reduced) n = Math.ceil(n / 3);
    for (let k = 0; k < n; k++) {
      const i = pI++ % PMAX, p = pv[i], a = Math.random() * Math.PI * 2, sp = (o.spread ?? 0.6) * (0.4 + Math.random() * 0.8);
      pPos[i * 3] = x + (Math.random() - 0.5) * (o.jitter ?? 0.03); pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z + (Math.random() - 0.5) * (o.jitter ?? 0.03);
      p.vx = (o.vx ?? 0) + Math.cos(a) * sp; p.vz = (o.vz ?? 0) + Math.sin(a) * sp; p.vy = (o.vy ?? 1.5) * (0.6 + Math.random() * 0.6);
      p.life = 0; p.max = (o.life ?? 0.8) * (0.7 + Math.random() * 0.6); p.g = o.g ?? 9.8; p.drag = o.drag ?? 0; p.a0 = o.alpha ?? 0.85; p.s0 = (o.size ?? 0.018) * (0.7 + Math.random() * 0.6); p.grow = o.grow ?? 0;
      _c.set(o.color ?? '#ffffff'); if (o.vary) _c.offsetHSL(0, 0, (Math.random() - 0.5) * o.vary); _c.toArray(pCol, i * 3);
      pAlpha[i] = p.a0; pSize[i] = p.s0;
    }
  }
  function stepParticles(dt) {
    for (let i = 0; i < PMAX; i++) {
      const p = pv[i]; if (p.life >= p.max) { if (pAlpha[i]) pAlpha[i] = 0; continue; }
      p.life += dt; const f = Math.exp(-p.drag * dt);
      p.vx *= f; p.vz *= f; p.vy = p.vy * f - p.g * dt;
      pPos[i * 3] += p.vx * dt; pPos[i * 3 + 1] += p.vy * dt; pPos[i * 3 + 2] += p.vz * dt;
      const floor = WATER_Y * (state.water ? 1 : 0) - 0.01;
      if (pPos[i * 3 + 1] < floor && p.vy < 0 && p.g > 2) { p.life = p.max; pAlpha[i] = 0; continue; }
      const t = p.life / p.max; pAlpha[i] = p.a0 * (1 - t * t); pSize[i] = p.s0 * (1 + p.grow * t);
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.aAlpha.needsUpdate = true; pGeo.attributes.aSize.needsUpdate = true; pGeo.attributes.aColor.needsUpdate = true;
  }

  // ----- plants -----
  const plantMats = {
    seedling: keep(new THREE.MeshStandardMaterial({ color: '#6cbf45', roughness: 0.7, side: THREE.DoubleSide, clippingPlanes: clipped })),
    green: keep(new THREE.MeshStandardMaterial({ color: '#5aa83c', roughness: 0.7, side: THREE.DoubleSide, clippingPlanes: clipped })),
    straw: keep(new THREE.MeshStandardMaterial({ color: '#c9b25a', roughness: 0.75, side: THREE.DoubleSide, clippingPlanes: clipped })),
    grain: keep(new THREE.MeshStandardMaterial({ color: '#d9a838', roughness: 0.6, clippingPlanes: clipped })),
    weed: keep(new THREE.MeshStandardMaterial({ color: '#3f7f2c', roughness: 0.75, clippingPlanes: clipped })),
    crop: keep(new THREE.MeshStandardMaterial({ color: '#86c45a', roughness: 0.7, clippingPlanes: clipped })),
  };
  const geos = {
    seedling: keep(clumpGeometry(6, 0.2, 0.32, 3, 0.004)),
    green: keep(clumpGeometry(12, 0.42, 0.38, 5, 0.006)),
    stems: keep(stemsGeometry(9, 0.78, 7)), panicles: keep(paniclesGeometry(9, 0.78, 7)),
    stubble: keep(stemsGeometry(8, 0.17, 9)),
    weed: keep(rosetteGeometry(7, 0.055, 11)), crop: keep(rosetteGeometry(5, 0.08, 12)),
    tuft: keep(clumpGeometry(7, 0.08, 0.6, 13, 0.003)),
  };
  geos.crop.translate(0, 0.05, 0);
  const crops = {
    seedling: new Crop(scene, geos.seedling, plantMats.seedling, 360),
    green: new Crop(scene, geos.green, plantMats.green, 260),
    stems: new Crop(scene, geos.stems, plantMats.straw, 260), panicles: new Crop(scene, geos.panicles, plantMats.grain, 260),
    stubble: new Crop(scene, geos.stubble, plantMats.straw, 120),
    sheafS: new Crop(scene, geos.stems, plantMats.straw, 60), sheafP: new Crop(scene, geos.panicles, plantMats.grain, 60),
    weed: new Crop(scene, geos.weed, plantMats.weed, 120), crop: new Crop(scene, geos.crop, plantMats.crop, 160),
    tuft: new Crop(scene, geos.tuft, plantMats.green, 120),
  };
  for (const c of Object.values(crops)) own.push({ dispose: () => c.mesh.dispose() });
  const fly = []; // things in the air: a cut sheaf on its way to the pile, a pulled weed tossed aside
  function flyMesh(kind) {
    const g = new THREE.Group();
    if (kind === 'sheaf') { g.add(new THREE.Mesh(geos.stems, plantMats.straw), new THREE.Mesh(geos.panicles, plantMats.grain)); }
    else g.add(new THREE.Mesh(geos.weed, plantMats.weed));
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(g); return g;
  }

  // ----- tools (in the coded figure's hand frame: fingers along −y, forward +z) -----
  const toolMat = {
    wood: keep(new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.7 })),
    iron: keep(new THREE.MeshStandardMaterial({ color: '#5b6066', roughness: 0.38, metalness: 0.75 })),
    steel: keep(new THREE.MeshStandardMaterial({ color: '#dfe5ea', roughness: 0.2, metalness: 0.92 })),
    brass: keep(new THREE.MeshStandardMaterial({ color: '#c08a2c', roughness: 0.3, metalness: 0.85 })),
    tank: keep(new THREE.MeshStandardMaterial({ color: '#2f86c9', roughness: 0.45, metalness: 0.05 })),
    dark: keep(new THREE.MeshStandardMaterial({ color: '#1f2933', roughness: 0.6 })),
    weave: keep(new THREE.MeshStandardMaterial({ map: keep(new THREE.CanvasTexture(weaveCanvas())), roughness: 0.9, side: THREE.DoubleSide })),
    pad: keep(new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.9 })),
  };
  const G = (fn) => { const g = keep(fn()); return g; };
  const T = {};
  const mk = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scl) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); if (scl) m.scale.set(...scl); m.castShadow = true; return m; };
  // seedlings pinched in the right hand: leaves up along the forearm, roots out past the fingertips
  T.pinch = new THREE.Group(); { const s = mk(geos.seedling, plantMats.seedling, [0, -0.06, 0.01], [0, 0, 0], [0.8, 1, 0.8]); s.rotation.x = 0.1; T.pinch.add(s); T.pinch.add(mk(G(() => new THREE.CylinderGeometry(0.008, 0.004, 0.05, 5)), toolMat.wood, [0, -0.09, 0.01])); }
  // the bundle of seedlings in the left hand
  T.bundle = new THREE.Group(); { const b = new THREE.Mesh(G(() => clumpGeometry(30, 0.24, 0.22, 21, 0.004)), plantMats.seedling); b.rotation.x = Math.PI / 2 - 0.4; b.position.set(0, -0.06, -0.06); b.castShadow = true; T.bundle.add(b); T.bundle.add(mk(G(() => new THREE.TorusGeometry(0.028, 0.006, 5, 12)), toolMat.wood, [0, -0.062, -0.02], [0.4, 0, 0])); }
  // the kodal: a long wooden handle, the iron blade at its end turned back towards the farmer
  T.kodal = new THREE.Group(); { T.kodal.add(mk(G(() => new THREE.CylinderGeometry(0.017, 0.019, 0.98, 8)), toolMat.wood, [0, 0, 0.36], [Math.PI / 2, 0, 0])); const bl = new THREE.Group(); bl.position.set(0, 0, 0.84); bl.add(mk(G(() => new THREE.CylinderGeometry(0.03, 0.03, 0.07, 10)), toolMat.iron, [0, 0, 0], [0, 0, 0])); bl.add(mk(G(() => new THREE.BoxGeometry(0.2, 0.25, 0.012)), toolMat.iron, [0, -0.14, -0.035], [-0.28, 0, 0])); bl.add(mk(G(() => new THREE.BoxGeometry(0.2, 0.02, 0.014)), toolMat.steel, [0, -0.265, -0.07], [-0.28, 0, 0])); T.kodal.add(bl); }
  // the sickle: a short handle, a toothed crescent of steel hooking inward
  T.sickle = new THREE.Group(); { T.sickle.add(mk(G(() => new THREE.CylinderGeometry(0.016, 0.016, 0.13, 8)), toolMat.wood, [0, 0, 0.03], [Math.PI / 2, 0, 0])); T.sickle.add(mk(G(() => new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8)), toolMat.brass, [0, 0, 0.1], [Math.PI / 2, 0, 0])); const g = G(() => new THREE.TorusGeometry(0.1, 0.008, 4, 22, Math.PI * 1.2)); const arc = mk(g, toolMat.steel, [0.1, 0, 0.11], [Math.PI / 2, 0, 0], [1, 1, 0.3]); arc.rotation.z = -0.2 * Math.PI; T.sickle.add(arc); }
  // the nirani: a short handle and a small bent iron blade
  T.nirani = new THREE.Group(); { T.nirani.add(mk(G(() => new THREE.CylinderGeometry(0.015, 0.017, 0.12, 8)), toolMat.wood, [0, 0, 0.02], [Math.PI / 2, 0, 0])); T.nirani.add(mk(G(() => new THREE.CylinderGeometry(0.005, 0.005, 0.08, 6)), toolMat.iron, [0, 0, 0.12], [Math.PI / 2, 0, 0])); T.nirani.add(mk(G(() => new THREE.BoxGeometry(0.07, 0.05, 0.006)), toolMat.iron, [0, -0.025, 0.16], [0.15, 0, 0])); }
  // the knapsack sprayer's lance in the right hand, the tank on the back, its hose and pump lever
  T.lance = new THREE.Group(); { const dir = new THREE.Vector3(0, -0.38, 1).normalize(); const l = mk(G(() => new THREE.CylinderGeometry(0.006, 0.006, 0.82, 6)), toolMat.steel); l.position.copy(dir.clone().multiplyScalar(0.45)); l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); T.lance.add(l); T.lance.add(mk(G(() => new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8)), toolMat.dark, [0, 0, 0.02], [Math.PI / 2, 0, 0])); const nz = mk(G(() => new THREE.CylinderGeometry(0.012, 0.008, 0.04, 8)), toolMat.brass); nz.position.copy(dir.clone().multiplyScalar(0.87)); nz.quaternion.copy(l.quaternion); T.lance.add(nz); T.lance.userData.tip = dir.clone().multiplyScalar(0.9); T.lance.userData.dir = dir; }
  T.tank = new THREE.Group(); { T.tank.add(mk(G(() => new THREE.BoxGeometry(0.33, 0.44, 0.16)), toolMat.tank)); T.tank.add(mk(G(() => new THREE.CylinderGeometry(0.06, 0.06, 0.03, 14)), toolMat.dark, [0, 0.235, 0])); for (const s of [-1, 1]) T.tank.add(mk(G(() => new THREE.BoxGeometry(0.03, 0.42, 0.02)), toolMat.dark, [s * 0.1, 0.0, 0.09])); }
  // the bamboo basket for the head, on a cloth ring, full of paddy
  T.basket = new THREE.Group(); { const prof = [[0.12, 0], [0.2, 0.02], [0.26, 0.12], [0.28, 0.2]].map(([r, y]) => new THREE.Vector2(r, y)); T.basket.add(mk(G(() => new THREE.LatheGeometry(prof, 24)), toolMat.weave)); T.basket.add(mk(G(() => new THREE.TorusGeometry(0.28, 0.012, 6, 28)), toolMat.wood, [0, 0.2, 0], [Math.PI / 2, 0, 0])); T.basket.add(mk(G(() => new THREE.SphereGeometry(0.27, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)), plantMats.grain, [0, 0.17, 0], [0, 0, 0], [1, 0.42, 1])); T.basket.add(mk(G(() => new THREE.TorusGeometry(0.07, 0.025, 6, 16)), toolMat.pad, [0, -0.01, 0], [Math.PI / 2, 0, 0])); }
  T.weedHand = flyMesh('weed'); T.sheafHand = flyMesh('sheaf');
  for (const t of Object.values(T)) { t.visible = false; scene.add(t); }
  const hose = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 14 }, () => new THREE.Vector3()))), keep(new THREE.LineBasicMaterial({ color: '#222' })));
  const lever = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])), keep(new THREE.LineBasicMaterial({ color: '#333' })));
  hose.visible = lever.visible = false; hose.frustumCulled = lever.frustumCulled = false; scene.add(hose, lever);

  // ----- state -----
  const state = {
    action: 'transplant', soilId: 'wetland', soilColor: '#3d3024', sink: 0.052, moist: 0, effort: 1, simSpeed: 1, playing: !reduced,
    mode: 'kinematics', water: true, cadence: 18, loads: { lumbar: 0.8, knee: 0.7, shoulder: 0.3, cardiac: 0.5 }, model: { trunk: 44, knee: 62 },
    kinetic: 7.7, penetration: 0.35, labels: {}, fmt: (v) => String(v), soil: {}, pools: null, drag: 1, toolMass: 0,
    cutX: HX, phase: 0, t: 0, fx: 0, fz: 0, dir: -1, row: [], ev: 0, step: null, leanBias: 0, reachTarget: null,
    walk: { z: 0, heading: 1, turn: 0 }, blendIn: 1, shake: 0, visible: true, dirty: true, lastSample: 0, readouts: null,
  };
  const samples = []; // live angles for the chart: [t, trunk, hip, knee]

  // ----- the farmer -----
  let P = null, real = null, heatMats = [], realBones = null, ankleRest = 0;
  const U = { uLoad: { value: new THREE.Vector4() }, uHeat: { value: 0 }, uPulse: { value: 0 } };
  let ghost = 0, heatMix = 0;
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  let status = opts.onStatus ?? (() => {});

  function setFarmer(look) {
    if (P) { P.disposed = true; scene.remove(P.root); for (const m of heatMats) m.dispose(); heatMats = []; }
    real = null; realBones = null;
    P = buildFarmer(look);
    P.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(P.root);
    // where the ankles sit when standing, so a crouch can keep the feet on the ground
    P.root.updateMatrixWorld(true);
    ankleRest = Math.min(...P.legs.map((l) => P.root.worldToLocal(l.foot.getWorldPosition(v1)).y));
    status({ loading: true, real: false });
    const mine = P;
    (P.realReady ?? Promise.resolve(null)).then((r) => {
      if (mine !== P || mine.disposed) return;
      if (r && r.model) {
        real = r; realBones = {};
        r.model.traverse((o) => {
          if (o.isBone) realBones[o.name] = o;
          if (o.isMesh && o.material) {
            if (o.isSkinnedMesh) heatAttribute(o); else if (!o.geometry.attributes.heat) o.geometry.setAttribute('heat', new THREE.BufferAttribute(new Float32Array(o.geometry.attributes.position.count * 4), 4));
            const src = o.material; const m = heatMaterial(src, U); m.userData.baseOpacity = src.opacity; m.userData.baseTransparent = src.transparent; o.material = m; heatMats.push(m);
          }
        });
        // the fingers close round a handle
        realBones._grip = ['l', 'r'].map((s) => ['index', 'middle', 'ring', 'pinky', 'thumb'].flatMap((f) => [1, 2, 3].map((k) => realBones[`${f}_0${k}_${s}`]).filter(Boolean)));
      }
      status({ loading: false, real: !!real });
      solveReach(); state.dirty = true;
    }).catch(() => status({ loading: false, real: false }));
    state.blendIn = 0;
  }

  // hand, head and body anchor points, from the real skeleton when it is there
  function palm(i, out) {
    const s = i === 0 ? 'r' : 'l';
    if (realBones?.[`hand_${s}`]) { const h = realBones[`hand_${s}`].getWorldPosition(v3), m = realBones[`middle_01_${s}`]; if (m) { m.getWorldPosition(out); return out.sub(h).multiplyScalar(0.62).add(h); } return out.copy(h); }
    const hd = P.arms[i].hand; hd.getWorldQuaternion(q2); return hd.getWorldPosition(out).add(v3.set(0, -0.07, 0).applyQuaternion(q2));
  }
  function handQuat(i, out) { return P.arms[i].hand.getWorldQuaternion(out); }
  function bonePos(name, coded, out) { if (realBones?.[name]) return realBones[name].getWorldPosition(out); return coded.getWorldPosition(out); }

  // ----- poses -----
  function setRot(o, x, y, z, k) { o.rotation.x += (x - o.rotation.x) * k; o.rotation.y += (y - o.rotation.y) * k; o.rotation.z += (z - o.rotation.z) * k; }
  function applyPose(q, k) {
    const { hips, torso, neck, head, legs, arms } = P;
    P.body.position.y = 0; hips.position.x = 0; setRot(hips, 0, 0, 0, k);
    torso.scale.set(1, 1, 1);
    setRot(torso, (q.lean ?? 0) * DEG, (q.twist ?? 0) * DEG, 0, k);
    for (let i = 0; i < 2; i++) {
      const L = (q[`L${i}`] ?? 0) * DEG, Kn = (q[`K${i}`] ?? 0) * DEG, side = i ? 1 : -1, abd = (0.04 + 0.16 * clamp01(Kn / (110 * DEG)));
      setRot(legs[i].thigh, -L, 0, side * abd, k);
      setRot(legs[i].knee, Kn, 0, 0, k);
      setRot(legs[i].foot, L - Kn, 0, -side * abd, k);
      const sf = (q[`sf${i}`] ?? 0) * DEG, ef = (q[`ef${i}`] ?? 0) * DEG, ab = ((q[`ab${i}`] ?? 0) + 6) * DEG;
      setRot(arms[i].shoulder, -sf, 0, side * ab, k);
      setRot(arms[i].elbow, -ef, 0, 0, k);
      arms[i].hand.scale.setScalar(1); setRot(arms[i].hand, 0, 0, 0, k);
    }
    const hp = (q.head ?? 0) * DEG;
    if (neck) { setRot(neck, hp * 0.35, 0, 0, k); setRot(head, hp * 0.65, 0, 0, k); } else setRot(head, hp, 0, 0, k);
    P.footYaw = [0, 0];
  }
  // keep the lower foot on the ground after the legs have folded
  function plantFeet() {
    P.hips.position.y = P.restHipsPos.y; P.root.updateMatrixWorld(true);
    const low = Math.min(...P.legs.map((l) => P.root.worldToLocal(l.foot.getWorldPosition(v1)).y));
    P.hips.position.y += (ankleRest - low) / (P.body.scale.y || 1);
    P.root.updateMatrixWorld(true);
  }
  function syncReal(grip) {
    if (!real) return;
    real.sync({ t: state.t, act: true });
    if (realBones?._grip) for (let s = 0; s < 2; s++) { const g = grip[s]; if (!g) continue; for (const b of realBones._grip[s]) { b.quaternion.multiply(q1.setFromAxisAngle(v1.set(1, 0, 0), g * (b.name.startsWith('thumb') ? 0.35 : 0.85))); b.updateMatrixWorld(true); } }
  }
  const motion = () => TASK_MOTION[state.action] ?? TASK_MOTION.transplant;
  const lateral = () => (state.row[state.ev] ?? state.fx) - state.fx;
  function poseFor(phase, lat) {
    const q = taskPose(state.action, phase);
    q.lean = (q.lean ?? 0) + state.leanBias;
    // the arms keep pointing where they did in the world when the trunk bends further
    q.sf0 = (q.sf0 ?? 0) + state.leanBias; q.sf1 = (q.sf1 ?? 0) + state.leanBias;
    q.twist = (q.twist ?? 0) + (lat / 0.2) * 9;
    q.ab0 = (q.ab0 ?? 0) - (lat / 0.2) * 11 * (motion().event?.kind === 'pluck' ? 0.5 : 1);
    if (state.action === 'sickle' || state.action === 'weeding') q.ab1 = (q.ab1 ?? 0) + (lat / 0.2) * 8;
    return q;
  }
  // lean the trunk until the working hand reaches its work at the moment of the task (each body is built differently)
  const REACH = { transplant: [0, 0.075], sickle: [0, 0.27], weeding: [0, 0.085] };
  function solveReach() {
    state.leanBias = 0;
    const r = REACH[state.action]; if (!P || !r || motion().walk) { state.reachTarget = null; return; }
    const at = motion().event.at;
    P.root.position.set(state.fx, -state.sink, state.fz); P.root.rotation.set(0, 0, 0);
    for (let it = 0; it < 14; it++) {
      applyPose(poseFor(at, 0), 1); plantFeet(); syncReal([1, 1]);
      const y = palm(r[0], v2).y;
      state.leanBias = clamp(state.leanBias + clamp((y - r[1]) * 95, -9, 9), -25, 15);
    }
    state.reachTarget = r[1]; state.blendIn = 0.4;
  }

  // ----- the field for each task -----
  const ROW = 0.2; // seedlings, hills and strikes 20 cm apart, as paddy is planted
  function buildField() {
    for (const c of Object.values(crops)) c.clear();
    for (const f of fly) scene.remove(f.g); fly.length = 0;
    dent.fill(0);
    const a = state.action, r = rng(a.length * 17 + 3), lookSoil = SOIL_LOOK[state.soilId] ?? SOIL_LOOK.wetland;
    const bund = a === 'spray' || a === 'basket';
    for (let k = 0; k < NV; k++) {
      const x = vx(k), z = vz(k);
      let h = (fbm(x * 6 + 3, z * 6) - 0.5) * 2 * lookSoil.relief;
      if (bund) { const t = clamp01((0.36 - Math.abs(x)) / 0.16); h = lerp(h, 0.11 + (fbm(x * 9, z * 9) - 0.5) * 0.01, ease(t)); }
      if (a === 'hoe') h += (fbm(x * 2, z * 2) - 0.5) * 0.02;
      base[k] = h;
    }
    const jit = () => (r() - 0.5) * 0.03;
    const surf = (x, z) => baseHeight(x, z);
    if (a === 'transplant') {
      state.dir = -1; state.fx = 0; state.fz = 0.32;
      for (let z = -HZ + 0.1; z < HZ - 0.05; z += ROW) for (let x = -1.2; x <= 1.21; x += ROW) {
        const mine = Math.abs(x) < 0.3; // the farmer's own strip: planted only ahead of where they start
        if (mine && z < state.fz + 0.55) continue;
        if (!mine && Math.abs(x) < 0.45 && z < state.fz + 0.2) continue;
        crops.seedling.add(x + jit(), surf(x, z) - 0.02, z + jit(), r() * 6.3, 0.9 + r() * 0.25, (r() - 0.5) * 0.15);
      }
      for (let k = 0; k < 3; k++) { const x = (r() - 0.5) * 0.8, z = state.fz - 0.6 - r() * 0.6; crops.sheafS.add(x, surf(x, z) + 0.02, z, r() * 6.3, 0.32, Math.PI / 2 - 0.05, 0); } // spare bundles left in the water behind
    } else if (a === 'hoe') {
      state.dir = -1; state.fx = 0; state.fz = 0.45;
      for (let k = 0; k < 70; k++) { const x = (r() - 0.5) * W * 0.95, z = (r() - 0.5) * D * 0.95; if (Math.abs(x) < 0.5 && z < state.fz + 0.5) continue; crops.tuft.add(x, surf(x, z) - 0.005, z, r() * 6.3, 0.7 + r() * 0.8); }
    } else if (a === 'sickle') {
      state.dir = 1; state.fx = 0; state.fz = -0.95;
      for (let z = -HZ + 0.12; z < HZ - 0.05; z += ROW) for (let x = -1.2; x <= 1.21; x += ROW) {
        const mine = Math.abs(x) < 0.3;
        if (mine && z < state.fz + 0.3) { crops.stubble.add(x + jit(), surf(x, z) - 0.01, z + jit(), r() * 6.3); continue; }
        const yaw = r() * 6.3, s = 0.92 + r() * 0.16, x2 = x + jit(), z2 = z + jit();
        crops.stems.add(x2, surf(x2, z2) - 0.01, z2, yaw, s); crops.panicles.add(x2, surf(x2, z2) - 0.01, z2, yaw, s);
      }
    } else if (a === 'weeding') {
      state.dir = 1; state.fx = 0; state.fz = -1.0;
      for (let z = -HZ + 0.1; z < HZ - 0.05; z += 0.16) for (const x of [-1.05, -0.75, -0.45, 0.45, 0.75, 1.05, -0.12, 0.12]) crops.crop.add(x + jit() * 0.5, surf(x, z), z, r() * 6.3, 0.85 + r() * 0.3);
      for (let z = state.fz + 0.55; z < HZ - 0.1; z += 0.12) for (const x of [-0.3, 0, 0.3, -0.6, 0.6]) if (r() < 0.65) crops.weed.add(x + jit() * 2, surf(x, z), z + jit(), r() * 6.3, 0.8 + r() * 0.5);
    } else {
      // the bund: the farmer walks its top between two fields of paddy, green for spraying, ripe for carrying home
      state.dir = 0; state.fx = 0; state.walk = { z: -0.9, heading: 1, turn: 0 };
      for (let z = -HZ + 0.1; z < HZ - 0.05; z += ROW) for (let x = 0.45; x <= 1.21; x += ROW) for (const sx of [-1, 1]) {
        const x2 = sx * x + jit(), z2 = z + jit(), yaw = r() * 6.3, s = 0.9 + r() * 0.2;
        if (a === 'spray') crops.green.add(x2, surf(x2, z2) - 0.02, z2, yaw, s);
        else { crops.stems.add(x2, surf(x2, z2) - 0.01, z2, yaw, s); crops.panicles.add(x2, surf(x2, z2) - 0.01, z2, yaw, s); }
      }
    }
    if (a === 'weeding') { // the active row of weeds in reach
      state.rowWeeds = [];
    }
    newRow();
    topDirty = true; state.phase = 0; state.step = null; state.ev = 0;
  }
  // the row in reach: three spots across, at the right distance in front of the feet
  const REACH_Z = { transplant: 0.36, hoe: 0.66, sickle: 0.4, weeding: 0.34 };
  function newRow() {
    const a = state.action; state.ev = 0;
    if (motion().walk) { state.row = []; return; }
    state.rowZ = state.fz + (REACH_Z[a] ?? 0.4);
    state.row = a === 'hoe' ? [state.fx - 0.06, state.fx + 0.04, state.fx + 0.1] : [state.fx - ROW, state.fx, state.fx + ROW];
    if (a === 'sickle') { // the three ripe hills in reach become the ones to cut
      state.rowClumps = state.row.map((x) => nearest(crops.stems, x, state.rowZ, 0.14));
    }
    if (a === 'weeding') {
      state.rowClumps = state.row.map((x) => { const r2 = rng(Math.round((x + state.rowZ) * 1000)); const z = state.rowZ + (r2() - 0.5) * 0.04, x2 = x + (r2() - 0.5) * 0.05; return crops.weed.add(x2, baseHeight(x2, z), z, r2() * 6.3, 1.1); });
    }
  }
  function nearest(crop, x, z, maxD) {
    let best = -1, bd = maxD;
    crop.items.forEach((it, i) => { if (it.s === 0) return; const d = Math.hypot(it.x - x, it.z - z); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  // ----- events of the work -----
  const palmP = new THREE.Vector3();
  function onEvent(kind) {
    const soilCol = shade(state.soilColor, -0.1);
    if (kind === 'plant') {
      palm(0, palmP); const x = palmP.x, z = palmP.z + 0.01, y = heightAt(x, z);
      crops.seedling.add(x, y - 0.03, z, Math.random() * 6.3, 0.05, (Math.random() - 0.5) * 0.12); state.grow = { i: crops.seedling.items.length - 1, t: 0 };
      stamp(x, z, 0, 0.025, 0.025, 0.02, 0.006);
      if (state.water) { ripple(x, z, 0.22); emit(14, x, WATER_Y + 0.01, z, { color: '#dfeef4', vy: 1.1, spread: 0.45, life: 0.55, size: 0.012, alpha: 0.85 }); }
      else emit(8, x, y + 0.01, z, { color: soilCol, vy: 0.6, spread: 0.3, life: 0.5, size: 0.012 });
    } else if (kind === 'strike') {
      const tip = T.kodal.localToWorld(v2.set(0, -0.27, 0.8)); const x = tip.x, z = tip.z;
      const depth = clamp(0.02 + 0.03 * state.kinetic / (8 * Math.max(0.2, state.penetration)), 0.015, 0.11);
      stamp(x, z, 0, 0.1, 0.075, depth, depth * 0.55);
      emit(state.water ? 18 : 26, x, heightAt(x, z) + 0.02, z, { color: soilCol, vary: 0.12, vy: 2.0, spread: 0.7, vz: -0.4, life: 0.75, size: 0.022 });
      if (state.water) { ripple(x, z, 0.4); emit(16, x, WATER_Y, z, { color: '#e2f0f5', vy: 1.8, spread: 0.8, life: 0.6, size: 0.012 }); }
      else emit(10, x, heightAt(x, z) + 0.02, z, { color: '#c9b08a', vy: 0.35, spread: 0.25, g: -0.05, drag: 1.5, life: 1.5, size: 0.06, grow: 2.5, alpha: 0.32 });
      if (!reduced) state.shake = 0.012;
    } else if (kind === 'cut') {
      const i = state.rowClumps?.[state.ev];
      if (i >= 0) {
        const it = crops.stems.items[i]; it.s = 0; crops.stems.write(i); crops.panicles.items[i].s = 0; crops.panicles.write(i);
        crops.stubble.add(it.x, it.y, it.z, it.yaw);
        T.sheafHand.visible = true;
        emit(10, it.x, it.y + 0.22, it.z, { color: '#e2bf5a', vy: 0.6, spread: 0.4, life: 0.8, size: 0.01, g: 3 });
      }
    } else if (kind === 'pluck') {
      const i = state.rowClumps?.[state.ev];
      if (i >= 0) { const it = crops.weed.items[i]; it.s = 0; crops.weed.write(i); T.weedHand.visible = true; emit(10, it.x, it.y + 0.01, it.z, { color: soilCol, vy: 0.8, spread: 0.3, life: 0.5, size: 0.012 }); stamp(it.x, it.z, 0, 0.03, 0.03, 0.012, 0.004); }
    }
  }
  function tossHeld(kind) {
    const src = kind === 'sheaf' ? T.sheafHand : T.weedHand; if (!src.visible) return;
    src.visible = false;
    const g = flyMesh(kind); g.position.copy(src.position); g.quaternion.copy(src.quaternion); g.scale.copy(src.scale);
    const to = kind === 'sheaf' ? new THREE.Vector3(state.fx + 0.5 + Math.random() * 0.12, 0, state.fz + (Math.random() - 0.5) * 0.3) : new THREE.Vector3(state.fx + 0.42 + Math.random() * 0.1, 0, state.fz + 0.1 + (Math.random() - 0.5) * 0.2);
    to.y = heightAt(to.x, to.z);
    fly.push({ g, kind, from: g.position.clone(), to, t: 0, dur: 0.55, q0: g.quaternion.clone() });
  }
  function stepFly(dt) {
    for (let k = fly.length - 1; k >= 0; k--) {
      const f = fly[k]; f.t += dt / f.dur; const t = clamp01(f.t);
      f.g.position.lerpVectors(f.from, f.to, t); f.g.position.y += Math.sin(t * Math.PI) * 0.18;
      if (f.kind === 'sheaf') f.g.quaternion.slerpQuaternions(f.q0, q1.setFromEuler(new THREE.Euler(Math.PI / 2 - 0.1, 0.4, 0)), t);
      if (f.t >= 1) {
        scene.remove(f.g);
        if (f.kind === 'sheaf') { const yaw = Math.random() * 0.5 - 0.25; crops.sheafS.add(f.to.x, f.to.y + 0.03, f.to.z, yaw, 0.85, Math.PI / 2 - 0.08); crops.sheafP.add(f.to.x, f.to.y + 0.03, f.to.z, yaw, 0.85, Math.PI / 2 - 0.08); }
        else crops.weed.add(f.to.x, f.to.y + 0.01, f.to.z, Math.random() * 6.3, 1, 0.4 + Math.random() * 0.6, 0.3);
        fly.splice(k, 1);
      }
    }
  }

  // ----- tools follow the hands -----
  const wristKeys = { hoe: [[0, 30], [0.42, 70], [0.5, 75], [0.6, 20], [0.66, -5], [0.8, 10], [1, 30]] };
  function placeTools(phase) {
    for (const t of Object.values(T)) t.visible = false;
    hose.visible = lever.visible = false;
    const a = state.action, ev = motion().event;
    const atHand = (tool, i, extra) => { palm(i, tool.position); handQuat(i, tool.quaternion); if (extra) tool.quaternion.multiply(extra); tool.visible = true; };
    if (a === 'transplant') {
      atHand(T.bundle, 1);
      if (phase > 0.12 && phase < ev.at && !state.step) atHand(T.pinch, 0);
    } else if (a === 'hoe') {
      const w = sampleKeys(wristKeys.hoe, phase) * DEG;
      atHand(T.kodal, 0, q1.setFromAxisAngle(v1.set(1, 0, 0), w));
      // in the stroke the handle aims at the ground in front, so the blade lands where it should
      const aim = clamp01(1 - Math.abs(phase - 0.68) / 0.12);
      if (aim > 0) {
        const tgt = v2.set(state.fx + (state.row[state.ev] ?? state.fx) - state.fx, 0.02, state.rowZ ?? state.fz + 0.66);
        const d = tgt.sub(T.kodal.position).normalize();
        const xAxis = v3.set(1, 0, 0).applyQuaternion(T.kodal.quaternion); xAxis.sub(d.clone().multiplyScalar(xAxis.dot(d))).normalize();
        const yAxis = new THREE.Vector3().crossVectors(d, xAxis);
        m4.makeBasis(xAxis, yAxis, d); q2.setFromRotationMatrix(m4);
        // the blade, not the handle, should touch: aim the handle a little above the spot
        q2.multiply(q1.setFromAxisAngle(v1.set(1, 0, 0), -0.32));
        T.kodal.quaternion.slerp(q2, ease(aim));
      }
    } else if (a === 'sickle') {
      atHand(T.sickle, 0, q1.setFromAxisAngle(v1.set(0, 0, 1), -0.3));
      if (T.sheafHand.userData.held) { palm(1, T.sheafHand.position); T.sheafHand.position.y -= 0.05; handQuat(1, T.sheafHand.quaternion); T.sheafHand.quaternion.multiply(q1.setFromAxisAngle(v1.set(1, 0, 0), -Math.PI / 2 + 0.3)); T.sheafHand.visible = true; T.sheafHand.scale.setScalar(0.8); }
    } else if (a === 'weeding') {
      atHand(T.nirani, 0, q1.setFromAxisAngle(v1.set(1, 0, 0), 0.25));
      if (T.weedHand.userData.held) { palm(1, T.weedHand.position); T.weedHand.position.y -= 0.04; T.weedHand.quaternion.identity(); T.weedHand.visible = true; }
    } else if (a === 'spray') {
      atHand(T.lance, 0, q1.setFromAxisAngle(v1.set(1, 0, 0), 0.15));
      const sp = realBones?.spine_03; P.torso.getWorldQuaternion(q2);
      if (sp) sp.getWorldPosition(T.tank.position); else P.torso.getWorldPosition(T.tank.position).add(v1.set(0, 0.32, 0).applyQuaternion(q2));
      T.tank.position.add(v1.set(0, -0.06, -0.2).applyQuaternion(q2)); T.tank.quaternion.copy(q2); T.tank.visible = true;
      // hose from the tank's foot to the lance grip, sagging; the pump lever from the tank to the left hand
      const p0 = T.tank.localToWorld(v1.set(0.12, -0.22, 0.02)), p1 = T.lance.position, hp = hose.geometry.attributes.position;
      for (let k = 0; k < 14; k++) { const t = k / 13; hp.setXYZ(k, lerp(p0.x, p1.x, t), lerp(p0.y, p1.y, t) - Math.sin(t * Math.PI) * 0.18, lerp(p0.z, p1.z, t)); }
      hp.needsUpdate = true; hose.visible = true;
      const l0 = T.tank.localToWorld(v1.set(-0.17, -0.2, 0)), l1 = palm(1, v2), lp = lever.geometry.attributes.position; lp.setXYZ(0, l0.x, l0.y, l0.z); lp.setXYZ(1, l1.x, l1.y, l1.z); lp.needsUpdate = true; lever.visible = true;
    } else if (a === 'basket') {
      const hb = realBones?.head; P.head.getWorldQuaternion(q2);
      if (hb) hb.getWorldPosition(T.basket.position); else P.head.getWorldPosition(T.basket.position);
      T.basket.position.add(v1.set(0, hb ? 0.2 : 0.16, 0.0).applyQuaternion(q2)); T.basket.quaternion.copy(q2); T.basket.visible = true;
    }
  }

  // ----- the frame -----
  const _p = { pelvis: new THREE.Vector3(), neck: new THREE.Vector3(), hip: new THREE.Vector3(), knee: new THREE.Vector3(), ankle: new THREE.Vector3() };
  function measure() {
    const near = camera.position.x - state.fx >= 0 ? 1 : 0; // the side facing the camera
    const s = near ? 'l' : 'r';
    bonePos('pelvis', P.hips, _p.pelvis); bonePos('neck_01', P.neck ?? P.head, _p.neck);
    bonePos(`thigh_${s}`, P.legs[near].thigh, _p.hip); bonePos(`calf_${s}`, P.legs[near].knee, _p.knee); bonePos(`foot_${s}`, P.legs[near].foot, _p.ankle);
    const A = (v) => [v.x, v.y, v.z];
    return { trunk: trunkFlexion(A(_p.pelvis), A(_p.neck)), hip: hipFlexion(A(_p.neck), A(_p.hip), A(_p.knee)), knee: kneeFlexion(A(_p.hip), A(_p.knee), A(_p.ankle)) };
  }

  function update(dt) {
    if (!P) return;
    const run = state.playing ? dt * state.simSpeed : 0;
    state.t += run;
    const m = motion();
    const k = state.blendIn < 1 ? 1 - Math.exp(-dt * 7) : 1;
    state.blendIn = Math.min(1, state.blendIn + dt / 0.7);
    let grip = [1, 1];
    if (m.walk) {
      // walking the bund: up and back, turning at each end
      const w = state.walk, speed = (m.speed ?? 0.5) * Math.sqrt(state.effort);
      let sp = speed, turnRate = 0;
      if (w.turn > 0) { w.turn -= run; sp = 0; turnRate = Math.PI / 1.2; P.root.rotation.y += turnRate * run * (w.heading > 0 ? 1 : -1) * 0; if (w.turn <= 0) w.heading *= -1; }
      else { w.z += w.heading * sp * run; if (Math.abs(w.z) > 0.95 && Math.sign(w.z) === w.heading) { w.turn = 1.2; } }
      const yawTarget = w.heading > 0 ? 0 : Math.PI;
      const yawNow = P.root.rotation.y; let dy = yawTarget - yawNow; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      if (w.turn > 0) P.root.rotation.y = yawNow + dy * Math.min(1, run * 3.2);
      else P.root.rotation.y = yawTarget;
      state.fx = 0; state.fz = w.z;
      P.root.position.set(0, baseHeight(0, w.z) - state.sink, w.z);
      if (run > 0 || state.blendIn < 1) animate(P, { speed: run > 0 ? sp : 0, t: state.t, turnRate: w.turn > 0 ? turnRate : 0 }, Math.max(run, 1e-4));
      const ph = (state.t / (cycleSeconds(state.cadence, state.effort) * 2)) % 1;
      const q = taskPose(state.action, ph);
      for (let i = 0; i < 2; i++) {
        const side = i ? 1 : -1;
        P.arms[i].shoulder.rotation.x = -(q[`sf${i}`] ?? 0) * DEG; P.arms[i].shoulder.rotation.z = side * ((q[`ab${i}`] ?? 0) + 6) * DEG; P.arms[i].elbow.rotation.x = -(q[`ef${i}`] ?? 0) * DEG;
      }
      if (state.action === 'basket') { P.head.rotation.x = 0; if (P.neck) P.neck.rotation.x = 0; P.torso.rotation.x = 6 * DEG; }
      P.root.updateMatrixWorld(true); syncReal([1, state.action === 'basket' ? 0.6 : 0.4]);
      state.phase = ph;
      if (state.action === 'spray' && run > 0 && Math.random() < 0.9) { // a fine cone of mist from the nozzle
        const tip = T.lance.localToWorld(v2.copy(T.lance.userData.tip)), dir = v3.copy(T.lance.userData.dir).applyQuaternion(T.lance.quaternion);
        emit(3, tip.x, tip.y, tip.z, { color: '#eaf6ff', vx: dir.x * 1.6, vy: dir.y * 1.6, vz: dir.z * 1.6, spread: 0.35, g: 0.6, drag: 2.2, life: 1.3, size: 0.02, grow: 2.2, alpha: 0.3, jitter: 0.01 });
      }
    } else {
      // working on the spot; a step back (or forward) after each row of three
      const cyc = cycleSeconds(state.cadence, state.effort);
      let ph = state.phase, stepLift = [0, 0], stepLean = 0;
      if (state.step) {
        state.step.t += run / 0.95;
        const s = clamp01(state.step.t);
        state.fz = state.step.z0 + state.dir * ROW * ease(s);
        for (let i = 0; i < 2; i++) stepLift[i] = Math.sin(clamp01((s - i * 0.45) / 0.55) * Math.PI);
        stepLean = -10 * Math.sin(s * Math.PI);
        if (state.step.t >= 1) {
          state.step = null;
          const edge = state.dir < 0 ? state.fz < -HZ + 0.55 : state.fz + 0.75 > HZ;
          if (edge) { buildField(); if (host.animate && !reduced) host.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 450 }); }
          else newRow();
        }
      } else if (run > 0) {
        const prev = ph; ph = (ph + run / cyc);
        const at = m.event?.at ?? 2;
        if (prev < at && ph >= at) onEvent(m.event.kind);
        if (state.action === 'sickle' && prev < 0.82 && ph >= 0.82) { T.sheafHand.userData.held = false; tossHeld('sheaf'); }
        if (state.action === 'weeding' && prev < 0.92 && ph >= 0.92) { T.weedHand.userData.held = false; tossHeld('weed'); }
        if (state.action === 'sickle' && prev < 0.55 && ph >= 0.55) T.sheafHand.userData.held = true;
        if (state.action === 'weeding' && prev < 0.8 && ph >= 0.8) T.weedHand.userData.held = true;
        if (ph >= 1) {
          ph -= 1; state.ev += 1;
          if (state.ev >= 3) { state.step = { t: 0, z0: state.fz }; ph = 0; }
        }
        state.phase = ph;
      }
      const q = poseFor(state.step ? 0 : state.phase, state.step ? 0 : lateral());
      q.lean += stepLean;
      for (let i = 0; i < 2; i++) { q[`L${i}`] += (state.dir < 0 ? -14 : 14) * stepLift[i]; q[`K${i}`] += 32 * stepLift[i]; }
      P.root.position.set(state.fx, -state.sink, state.fz); P.root.rotation.set(0, 0, 0);
      applyPose(q, k); plantFeet();
      grip = state.action === 'transplant' ? [0.5, 0.9] : [1, state.action === 'hoe' ? 1 : 0.6];
      syncReal(grip);
    }
    if (state.grow) { state.grow.t += run / 0.35; const it = crops.seedling.items[state.grow.i]; if (it) { it.s = lerp(0.05, 1.0, ease(state.grow.t)); crops.seedling.write(state.grow.i); } if (state.grow.t >= 1) state.grow = null; }
    placeTools(state.phase);
    stepFly(run);
    // the feet press into the soil: any foot down at its standing height leaves its print
    if (state.sink > 0.001) for (let i = 0; i < 2; i++) {
      const f = P.legs[i].foot, y = P.root.worldToLocal(f.getWorldPosition(v1)).y;
      if (y < ankleRest + 0.012) {
        f.getWorldPosition(v1); f.getWorldQuaternion(q1); const fwd = v2.set(0, 0, 1).applyQuaternion(q1); fwd.y = 0; fwd.normalize();
        const cx = v1.x + fwd.x * 0.05, cz = v1.z + fwd.z * 0.05, yaw = Math.atan2(fwd.x, fwd.z);
        const look = SOIL_LOOK[state.soilId] ?? SOIL_LOOK.wetland;
        const was = heightAt(cx, cz);
        stamp(cx, cz, yaw, 0.13, 0.055, state.sink + 0.004 - (baseHeight(cx, cz)), state.sink * look.rim);
        if (m.walk && run > 0 && was > baseHeight(cx, cz) - state.sink * 0.5) { // a fresh step
          if (state.water) { ripple(cx, cz, 0.26); emit(6, cx, WATER_Y, cz, { color: '#e2f0f5', vy: 0.9, spread: 0.4, life: 0.5, size: 0.011 }); }
          else if (state.soilId === 'barind' || state.soilId === 'loam') emit(4, cx, 0.02, cz, { color: '#c8ad86', vy: 0.25, spread: 0.2, g: -0.05, drag: 1.5, life: 1.2, size: 0.05, grow: 2, alpha: 0.25 });
        }
      }
    }
    // prints slowly flow back
    if (run > 0) { const f = Math.exp(-run / (SOIL_LOOK[state.soilId]?.recover ?? 40)); for (let k2 = 0; k2 < NV; k2++) dent[k2] *= f; topDirty = true; }
    // ripples, particles, water
    for (const rp of ripples) if (rp.m.visible) { rp.t += run / rp.life; const t = clamp01(rp.t); rp.m.scale.setScalar(0.02 + rp.r * Math.sqrt(t)); rp.m.material.opacity = 0.55 * (1 - t); if (rp.t >= 1) rp.m.visible = false; }
    if (run > 0) stepParticles(run);
    wn.offset.x += run * 0.012; wn.offset.y += run * 0.007;
    // the cut: at the block's edge, or under the near foot for the soil views
    const near = camera.position.x - state.fx >= 0 ? 1 : 0;
    P.legs[near].foot.getWorldPosition(v1);
    const want = state.mode === 'strata' || state.mode === 'geochem' ? clamp(v1.x, -HX + 0.2, HX) : HX;
    state.cutX = Math.abs(want - state.cutX) < 0.002 ? want : lerp(state.cutX, want, reduced ? 1 : 1 - Math.exp(-dt * 4));
    clip.constant = state.cutX; cap.mesh.position.x = 0; capMoveTo(state.cutX);
    if (topDirty) refreshTop();
    // body look per view
    const wantGhost = state.mode === 'kinematics' ? 1 : 0, wantHeat = state.mode === 'muscles' ? 1 : 0;
    ghost = lerp(ghost, wantGhost, reduced ? 1 : 1 - Math.exp(-dt * 5)); heatMix = lerp(heatMix, wantHeat, reduced ? 1 : 1 - Math.exp(-dt * 5));
    U.uHeat.value = heatMix; U.uPulse.value = 0.5 + 0.5 * Math.sin(state.t * Math.PI * 2 / cycleSeconds(state.cadence, state.effort));
    const L = state.loads; U.uLoad.value.set(L.lumbar, L.knee, L.shoulder, L.cardiac);
    for (const mm of heatMats) {
      const op = (mm.userData.baseOpacity ?? 1) * (1 - 0.5 * ghost), tr = op < 0.99 || mm.userData.baseTransparent;
      mm.opacity = op; if (mm.transparent !== tr) { mm.transparent = tr; mm.needsUpdate = true; }
    }
  }
  function capMoveTo(x) {
    const p = cap.mesh.geometry.attributes.position; let moved = false;
    for (let i = 0; i < p.count; i++) if (p.getX(i) !== x) { p.setX(i, x); moved = true; }
    if (moved) { p.needsUpdate = true; topDirty = true; }
    waterEdgeX.position.x = x - 0.002; waterEdgeZ.visible = waterEdgeX.visible = state.water;
  }

  // ----- camera presets -----
  const PRESETS = {
    side: { off: [3.7, 0.42, 0.25], ty: 0.42 },
    three: { off: [2.3, 1.35, 2.5], ty: 0.55 },
    back: { off: [-1.5, 1.45, -2.6], ty: 0.7 },
    close: { off: [1.25, 0.55, 1.0], ty: 0.6 },
    section: { off: [3.6, 0.32, 0.55], ty: -0.06 },
    deep: { off: [3.9, 0.25, 0.6], ty: -0.3 },
  };
  let tween = null, preset = 'side';
  function setView(name, instant) {
    const p = PRESETS[name] ?? PRESETS.side; preset = name;
    const aspect = Math.max(0.3, camera.aspect), fit = aspect < 1.1 ? 1.15 / aspect : 1; // a narrow phone frame stands further back
    const target = new THREE.Vector3(state.fx, p.ty, state.fz), pos = new THREE.Vector3(...p.off).multiplyScalar(fit).add(target);
    if (instant || reduced) { controls.target.copy(target); camera.position.copy(pos); tween = null; controls.update(); state.dirty = true; return; }
    tween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target };
  }
  controls.addEventListener('start', () => { tween = null; renderer.domElement.style.cursor = 'grabbing'; });
  controls.addEventListener('end', () => { renderer.domElement.style.cursor = 'grab'; });
  controls.addEventListener('change', () => { state.dirty = true; });
  function zoom(f) { const d = camera.position.clone().sub(controls.target); const len = clamp(d.length() * f, 0.9, 7.5); camera.position.copy(controls.target).add(d.setLength(len)); tween = null; controls.update(); state.dirty = true; }
  let follow = new THREE.Vector3();
  function updateCamera(dt) {
    if (tween) {
      tween.t += dt / 0.9; const t = ease(tween.t);
      camera.position.lerpVectors(tween.p0, tween.p1, t); controls.target.lerpVectors(tween.t0, tween.t1, t);
      if (tween.t >= 1) tween = null;
    } else {
      // follow the farmer along the field, keeping the user's angle
      follow.set(state.fx - controls.target.x, 0, state.fz - controls.target.z).multiplyScalar(1 - Math.exp(-dt * 2.5));
      controls.target.add(follow); camera.position.add(follow);
    }
    controls.update();
    sun.position.set(controls.target.x + 2.2, 4.6, controls.target.z + 2.8); sun.target.position.set(controls.target.x, 0, controls.target.z);
  }

  // ----- the overlay: skeleton, angles, heat labels, forces, ions, depth scale -----
  const octx = overlay.getContext('2d'), cctx = chart?.getContext('2d');
  const proj = (v, out = {}) => { v2.copy(v).project(camera); out.x = (v2.x * 0.5 + 0.5) * ow; out.y = (-v2.y * 0.5 + 0.5) * oh; out.ok = v2.z < 1; return out; };
  let ow = 1, oh = 1, odpr = 1, font = 'system-ui, sans-serif';
  const BONES = [['pelvis', 'spine_02'], ['spine_02', 'spine_03'], ['spine_03', 'neck_01'], ['neck_01', 'head'],
    ['spine_03', 'upperarm_r'], ['upperarm_r', 'lowerarm_r'], ['lowerarm_r', 'hand_r'], ['spine_03', 'upperarm_l'], ['upperarm_l', 'lowerarm_l'], ['lowerarm_l', 'hand_l'],
    ['pelvis', 'thigh_r'], ['thigh_r', 'calf_r'], ['calf_r', 'foot_r'], ['foot_r', 'ball_r'], ['pelvis', 'thigh_l'], ['thigh_l', 'calf_l'], ['calf_l', 'foot_l'], ['foot_l', 'ball_l']];
  const CODED = () => ({ pelvis: P.hips, spine_02: P.torso, spine_03: P.torso, neck_01: P.neck ?? P.head, head: P.head, upperarm_r: P.arms[0].shoulder, lowerarm_r: P.arms[0].elbow, hand_r: P.arms[0].hand, upperarm_l: P.arms[1].shoulder, lowerarm_l: P.arms[1].elbow, hand_l: P.arms[1].hand, thigh_r: P.legs[0].thigh, calf_r: P.legs[0].knee, foot_r: P.legs[0].foot, ball_r: null, thigh_l: P.legs[1].thigh, calf_l: P.legs[1].knee, foot_l: P.legs[1].foot, ball_l: null });
  const sp = {};
  function screenOf(name) {
    if (sp[name]) return sp[name];
    const b = realBones?.[name] ?? CODED()[name]; if (!b) return null;
    const w = b.getWorldPosition(new THREE.Vector3()); if (name === 'spine_02' && !realBones) w.y += 0.2; if (name === 'spine_03' && !realBones) w.add(v1.set(0, 0.42, 0).applyQuaternion(P.torso.getWorldQuaternion(q1)));
    return (sp[name] = { ...proj(w), w });
  }
  function label(text, x, y, o = {}) {
    octx.font = `${o.bold ? 700 : 600} ${o.size ?? 11}px ${font}`;
    const tw = octx.measureText(text).width, padX = 6, h = (o.size ?? 11) + 8;
    let lx = o.align === 'right' ? x - tw - padX * 2 : o.align === 'center' ? x - tw / 2 - padX : x;
    lx = clamp(lx, 4, ow - tw - padX * 2 - 4); const ly = clamp(y - h / 2, 4, oh - h - 4);
    octx.fillStyle = o.bg ?? 'rgba(255,255,255,0.92)'; octx.beginPath(); octx.roundRect(lx, ly, tw + padX * 2, h, 7); octx.fill();
    if (o.border) { octx.strokeStyle = o.border; octx.lineWidth = 1.2; octx.stroke(); }
    octx.fillStyle = o.color ?? '#0f172a'; octx.textBaseline = 'middle'; octx.fillText(text, lx + padX, ly + h / 2 + 0.5);
  }
  function arrow(x0, y0, x1, y1, color, w = 3) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    octx.strokeStyle = color; octx.fillStyle = color; octx.lineWidth = w; octx.lineCap = 'round';
    octx.beginPath(); octx.moveTo(x0, y0); octx.lineTo(x1 - Math.cos(a) * 8, y1 - Math.sin(a) * 8); octx.stroke();
    octx.beginPath(); octx.moveTo(x1, y1); octx.lineTo(x1 - Math.cos(a - 0.45) * 12, y1 - Math.sin(a - 0.45) * 12); octx.lineTo(x1 - Math.cos(a + 0.45) * 12, y1 - Math.sin(a + 0.45) * 12); octx.closePath(); octx.fill();
  }
  function angleArc(J, A, B, color, text, r = 24) {
    if (!J || !A || !B) return;
    let a1 = Math.atan2(A.y - J.y, A.x - J.x), a2 = Math.atan2(B.y - J.y, B.x - J.x);
    let d = a2 - a1; d = Math.atan2(Math.sin(d), Math.cos(d));
    octx.fillStyle = color.replace('rgb', 'rgba').replace(')', ',0.18)'); octx.strokeStyle = color; octx.lineWidth = 2;
    octx.beginPath(); octx.moveTo(J.x, J.y); octx.arc(J.x, J.y, r, a1, a1 + d, d < 0); octx.closePath(); octx.fill();
    octx.beginPath(); octx.arc(J.x, J.y, r, a1, a1 + d, d < 0); octx.stroke();
    const mid = a1 + d / 2; label(text, J.x + Math.cos(mid) * (r + 30), J.y + Math.sin(mid) * (r + 30), { align: 'center', color, bold: true, border: color });
  }
  function drawOverlay() {
    for (const k in sp) delete sp[k];
    octx.setTransform(odpr, 0, 0, odpr, 0, 0); octx.clearRect(0, 0, ow, oh);
    if (!P) return;
    const Lb = state.labels, fmt = state.fmt, mode = state.mode, R = state.readouts;
    // the depth scale on the cut face, on the side of it towards the right of the screen
    const za = proj(v1.set(state.cutX, 0, HZ)), zb = proj(v1.set(state.cutX, 0, -HZ));
    const zEnd = za.x > zb.x ? HZ : -HZ;
    const depthNames = mode === 'geochem' ? Lb.depthGeo : Lb.depth;
    if (depthNames && mode !== 'muscles') BOUNDS.slice(0, 4).forEach((d, i) => {
      const p = proj(v1.set(state.cutX, -d - (i === 0 ? 0 : 0.002), zEnd));
      if (!p.ok) return; octx.strokeStyle = 'rgba(255,255,255,0.85)'; octx.lineWidth = 1.5; octx.beginPath(); octx.moveTo(p.x - 10, p.y); octx.lineTo(p.x + 4, p.y); octx.stroke();
      label(depthNames[i], p.x - 14, p.y + (i === 0 ? -12 : 10), { align: 'right', size: 10.5, bg: 'rgba(15,23,42,0.72)', color: '#fff' });
    });
    // the sinkage of the near foot, always
    const near = camera.position.x - state.fx >= 0 ? 1 : 0;
    const fw = P.legs[near].foot.getWorldPosition(new THREE.Vector3());
    const s0 = proj(v1.set(fw.x, baseHeight(fw.x, fw.z), fw.z + 0.12)), s1 = proj(v1.set(fw.x, baseHeight(fw.x, fw.z) - state.sink, fw.z + 0.12));
    if (s0.ok && Math.abs(s1.y - s0.y) > 0.5) {
      const xr = Math.max(s0.x, s1.x) + 26;
      octx.strokeStyle = '#ef4444'; octx.lineWidth = 1.4; octx.setLineDash([4, 3]); octx.beginPath(); octx.moveTo(s0.x + 4, s0.y); octx.lineTo(xr, s0.y); octx.moveTo(s1.x + 4, s1.y); octx.lineTo(xr, s1.y); octx.stroke(); octx.setLineDash([]);
      octx.beginPath(); octx.moveTo(xr - 4, s0.y); octx.lineTo(xr - 4, s1.y); octx.stroke();
      label(Lb.dz ?? '', xr + 2, (s0.y + s1.y) / 2, { color: '#b91c1c', bold: true, border: '#fca5a5' });
    }
    if (mode === 'kinematics') {
      octx.lineCap = 'round';
      for (const [a, b] of BONES) { const A = screenOf(a), B = screenOf(b); if (!A || !B || !A.ok || !B.ok) continue; octx.strokeStyle = 'rgba(15,23,42,0.55)'; octx.lineWidth = 6; octx.beginPath(); octx.moveTo(A.x, A.y); octx.lineTo(B.x, B.y); octx.stroke(); octx.strokeStyle = '#f8fafc'; octx.lineWidth = 2.6; octx.stroke(); }
      for (const n of ['pelvis', 'spine_03', 'neck_01', 'upperarm_r', 'lowerarm_r', 'hand_r', 'upperarm_l', 'lowerarm_l', 'hand_l', 'thigh_r', 'calf_r', 'foot_r', 'thigh_l', 'calf_l', 'foot_l']) { const p = screenOf(n); if (!p?.ok) continue; octx.fillStyle = '#0ea5e9'; octx.strokeStyle = '#fff'; octx.lineWidth = 2; octx.beginPath(); octx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); octx.fill(); octx.stroke(); }
      const hd = screenOf('head'), nk = screenOf('neck_01');
      if (hd?.ok && nk?.ok) { const r = Math.max(8, Math.hypot(hd.x - nk.x, hd.y - nk.y) * 1.3); octx.strokeStyle = '#f8fafc'; octx.lineWidth = 2.4; octx.beginPath(); octx.arc(hd.x + (hd.x - nk.x) * 0.6, hd.y + (hd.y - nk.y) * 0.6, r, 0, Math.PI * 2); octx.stroke(); }
      if (R) {
        const s = near ? 'l' : 'r', pel = screenOf('pelvis'), up = proj(v1.copy(pel.w).add(v2.set(0, 0.35, 0)));
        octx.strokeStyle = 'rgba(59,130,246,0.7)'; octx.setLineDash([3, 4]); octx.lineWidth = 1.5; octx.beginPath(); octx.moveTo(pel.x, pel.y); octx.lineTo(up.x, up.y); octx.stroke(); octx.setLineDash([]);
        angleArc(pel, up, screenOf('neck_01'), 'rgb(37,99,235)', `${Lb.trunk} ${fmt(Math.round(R.trunk))}°`, 30);
        angleArc(screenOf(`thigh_${s}`), screenOf('neck_01'), screenOf(`calf_${s}`), 'rgb(124,58,237)', `${Lb.hip} ${fmt(Math.round(R.hip))}°`, 20);
        const kn = screenOf(`calf_${s}`), th = screenOf(`thigh_${s}`), an = screenOf(`foot_${s}`);
        if (kn && th && an) { const ext = { x: kn.x + (kn.x - th.x), y: kn.y + (kn.y - th.y) }; angleArc(kn, ext, an, 'rgb(5,150,105)', `${Lb.knee} ${fmt(Math.round(R.knee))}°`, 18); }
      }
    } else if (mode === 'muscles') {
      const L = state.loads, items = [['spine_01', L.lumbar, Lb.lumbar, -1], ['calf_r', L.knee, Lb.kneeR, 1], ['upperarm_l', L.shoulder, Lb.shoulder, -1], ['spine_03', L.cardiac, Lb.cardiac, 1]];
      for (const [bn, val, name, sideL] of items) {
        const p = screenOf(bn) ?? screenOf('pelvis'); if (!p?.ok) continue;
        const pct = Math.round(val * 100), col = pct > 85 ? '#dc2626' : pct > 65 ? '#d97706' : '#059669';
        if (!real) { const g = octx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34); g.addColorStop(0, col + 'cc'); g.addColorStop(1, col + '00'); octx.fillStyle = g; octx.beginPath(); octx.arc(p.x, p.y, 34, 0, Math.PI * 2); octx.fill(); }
        const lx = p.x + sideL * 70, ly = p.y - 18;
        octx.strokeStyle = col; octx.lineWidth = 1.5; octx.beginPath(); octx.moveTo(p.x, p.y); octx.lineTo(lx, ly); octx.stroke();
        octx.fillStyle = col; octx.beginPath(); octx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); octx.fill();
        label(`${name} ${fmt(pct)}%`, lx, ly, { align: sideL < 0 ? 'right' : 'left', color: col, bold: true, border: col });
      }
      // legend
      const lx = 14, ly = oh - 40, lw = Math.min(170, ow * 0.4), g = octx.createLinearGradient(lx, 0, lx + lw, 0);
      g.addColorStop(0, '#22c55e'); g.addColorStop(0.55, '#facc15'); g.addColorStop(0.75, '#f59e0b'); g.addColorStop(1, '#ef4444');
      octx.fillStyle = 'rgba(255,255,255,0.9)'; octx.beginPath(); octx.roundRect(lx - 8, ly - 22, lw + 16, 46, 10); octx.fill();
      octx.fillStyle = g; octx.beginPath(); octx.roundRect(lx, ly, lw, 8, 4); octx.fill();
      octx.fillStyle = '#334155'; octx.font = `600 10px ${font}`; octx.textBaseline = 'alphabetic'; octx.fillText(Lb.legend ?? '', lx, ly - 7);
      octx.fillText('0', lx, ly + 20); octx.fillText(`${fmt(65)}`, lx + lw * 0.65 - 6, ly + 20); octx.fillText(`${fmt(85)}`, lx + lw * 0.85 - 6, ly + 20); octx.fillText(`${fmt(100)}%`, lx + lw - 26, ly + 20);
    } else if (mode === 'strata') {
      const footS = proj(v1.set(state.cutX, baseHeight(state.cutX, fw.z) - state.sink, fw.z));
      const per = (dm) => Math.abs(proj(v2.set(state.cutX, -dm, fw.z)).y - footS.y); // pixels for dm metres down
      if (footS.ok) {
        // the stress bulb under the foot (a textbook picture of how load spreads, not a model output)
        const B = 0.11;
        [[2.0, 'rgba(250,204,21,0.20)'], [1.2, 'rgba(249,115,22,0.26)'], [0.6, 'rgba(239,68,68,0.32)']].forEach(([f, c]) => {
          const ry = per(B * f * 1.5), rx = Math.abs(proj(v2.set(state.cutX, 0, fw.z + B * f)).x - proj(v3.set(state.cutX, 0, fw.z)).x) || ry * 0.7;
          octx.fillStyle = c; octx.beginPath(); octx.ellipse(footS.x, footS.y + ry * 0.55, Math.max(6, rx), Math.max(6, ry * 0.85), 0, 0, Math.PI * 2); octx.fill();
        });
        label(Lb.bulb ?? '', footS.x, footS.y + per(0.33) + 6, { align: 'center', size: 10, bg: 'rgba(15,23,42,0.72)', color: '#fde68a' });
        // the slip surface: a circle as deep as twice the sinkage below the sole
        const rr = Math.max(0.06, state.sink * 2.2), arc = [];
        for (let k = 0; k <= 20; k++) { const a = Math.PI * (0.1 + 0.8 * k / 20); arc.push(proj(v2.set(state.cutX, baseHeight(state.cutX, fw.z) - state.sink - Math.sin(a) * rr * 0.9, fw.z + Math.cos(a) * rr * 1.6))); }
        octx.strokeStyle = 'rgba(239,68,68,0.85)'; octx.lineWidth = 1.8; octx.setLineDash([5, 4]); octx.beginPath(); arc.forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y))); octx.stroke(); octx.setLineDash([]);
        // pore water pushing up in wet soil
        if (state.water || state.soilId === 'peat') for (let k = -2; k <= 2; k++) { const p = proj(v2.set(state.cutX, -state.sink - 0.12, fw.z + k * 0.06)); arrow(p.x, p.y + 10, p.x, p.y - 8, '#38bdf8', 2); }
        // forces: weight down through the hips, the soil's reaction up at the sole, the drag of the mud against the foot
        const pel = screenOf('pelvis');
        if (pel?.ok) { arrow(pel.x, pel.y - 10, pel.x, pel.y + 50, '#1d4ed8', 3.5); label(Lb.weight ?? 'W', pel.x + 10, pel.y + 22, { color: '#1d4ed8', bold: true, border: '#93c5fd' }); }
        arrow(footS.x - 18, footS.y + 46, footS.x - 18, footS.y + 4, '#16a34a', 3.5); label(Lb.reaction ?? 'R', footS.x - 24, footS.y + 40, { align: 'right', color: '#15803d', bold: true, border: '#86efac' });
        const dl = 18 + 16 * (state.drag - 1); const fz2 = proj(v2.set(state.cutX, baseHeight(state.cutX, fw.z) - state.sink * 0.5, fw.z + 0.16));
        arrow(fz2.x + dl, fz2.y, fz2.x, fz2.y, '#ea580c', 3); label(Lb.drag ?? '', fz2.x + dl + 4, fz2.y - 14, { color: '#c2410c', bold: true, border: '#fdba74', size: 10.5 });
        label(Lb.shear ?? '', 14, 18, { bg: 'rgba(15,23,42,0.78)', color: '#fff', bold: true });
        label(Lb.cohesion ?? '', 14, 44, { bg: 'rgba(15,23,42,0.66)', color: '#e2e8f0', size: 10.5 });
        label(Lb.penetration ?? '', 14, 68, { bg: 'rgba(15,23,42,0.66)', color: '#e2e8f0', size: 10.5 });
      }
    } else if (mode === 'geochem') {
      const ions = [['Ca²⁺', '#38bdf8', 0.12, 0.08, 0], ['Mg²⁺', '#34d399', -0.2, 0.2, 1.5], ['K⁺', '#fbbf24', 0.32, 0.06, 3.1], ['NH₄⁺', '#a5b4fc', -0.36, 0.13, 4.2], ['Ca²⁺', '#38bdf8', -0.05, 0.3, 2.1], ['Mg²⁺', '#34d399', 0.45, 0.33, 0.8], ['K⁺', '#fbbf24', 0.22, 0.5, 5.0]];
      const t = state.t;
      // roots of the crop drawing nutrients up
      octx.strokeStyle = 'rgba(253,230,138,0.75)'; octx.lineWidth = 1.4;
      for (let r = 0; r < 6; r++) { const z0 = state.fz + 0.3 + (r - 2.5) * 0.12; const pts = []; for (let k = 0; k <= 8; k++) pts.push(proj(v2.set(state.cutX, -k * 0.035, z0 + Math.sin(k * 0.9 + r) * 0.025))); octx.beginPath(); pts.forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y))); octx.stroke(); }
      for (const [name, col, dz, dy, ph] of ions) {
        const p = proj(v2.set(state.cutX, -dy - Math.sin(t * 2.2 + ph) * 0.012, state.fz + 0.3 + dz + Math.cos(t * 1.8 + ph) * 0.02));
        if (!p.ok) continue;
        octx.fillStyle = col + '40'; octx.beginPath(); octx.arc(p.x, p.y, 11, 0, Math.PI * 2); octx.fill();
        octx.fillStyle = col; octx.beginPath(); octx.arc(p.x, p.y, 5.5, 0, Math.PI * 2); octx.fill();
        octx.fillStyle = '#fff'; octx.font = `700 10px ${font}`; octx.textBaseline = 'middle'; octx.fillText(name, p.x + 8, p.y);
      }
      if (Lb.cec) label(Lb.cec, 14, 18, { bg: 'rgba(15,23,42,0.78)', color: '#fff', bold: true });
      if (Lb.fossil) label(Lb.fossil, 14, 44, { bg: 'rgba(15,23,42,0.66)', color: '#fde68a', size: 10.5 });
    }
  }

  function drawChart(now) {
    if (!cctx || !chart.clientWidth) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = chart.clientWidth, chh = chart.clientHeight;
    if (chart.width !== Math.round(cw * dpr)) { chart.width = Math.round(cw * dpr); chart.height = Math.round(chh * dpr); }
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0); cctx.clearRect(0, 0, cw, chh);
    const padL = 30, padR = 8, padT = 8, padB = 18, gw = cw - padL - padR, gh = chh - padT - padB, span = 8;
    const y = (deg) => padT + gh * (1 - deg / 135), x = (t) => padL + gw * (1 - (now - t) / span);
    cctx.font = `500 9.5px ${font}`; cctx.fillStyle = '#64748b'; cctx.strokeStyle = 'rgba(100,116,139,0.18)'; cctx.lineWidth = 1; cctx.textBaseline = 'middle';
    for (const d of [0, 45, 90, 135]) { cctx.beginPath(); cctx.moveTo(padL, y(d)); cctx.lineTo(padL + gw, y(d)); cctx.stroke(); cctx.fillText(`${state.fmt(d)}°`, 2, y(d)); }
    const series = [[1, '#2563eb'], [2, '#7c3aed'], [3, '#059669']];
    // the model's own trunk and knee angles, dashed
    cctx.setLineDash([4, 4]); cctx.lineWidth = 1.2;
    cctx.strokeStyle = '#2563eb99'; cctx.beginPath(); cctx.moveTo(padL, y(state.model.trunk)); cctx.lineTo(padL + gw, y(state.model.trunk)); cctx.stroke();
    cctx.strokeStyle = '#05966999'; cctx.beginPath(); cctx.moveTo(padL, y(state.model.knee)); cctx.lineTo(padL + gw, y(state.model.knee)); cctx.stroke();
    cctx.setLineDash([]);
    for (const [k, col] of series) { cctx.strokeStyle = col; cctx.lineWidth = 2; cctx.beginPath(); let first = true; for (const s of samples) { if (now - s[0] > span) continue; const px = x(s[0]), py = y(clamp(s[k], 0, 135)); if (first) { cctx.moveTo(px, py); first = false; } else cctx.lineTo(px, py); } cctx.stroke(); }
    cctx.fillStyle = '#94a3b8'; cctx.fillText(state.labels.chartAxis ?? '', padL, chh - 7);
  }

  // ----- loop, size, visibility -----
  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    odpr = Math.min(window.devicePixelRatio || 1, 2); ow = w; oh = h; overlay.width = Math.round(w * odpr); overlay.height = Math.round(h * odpr);
    pU.uScale.value = (h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * DEG) / 2));
    font = getComputedStyle(host).fontFamily || font;
    state.dirty = true;
  }
  const ro = new ResizeObserver(() => { const before = camera.aspect; resize(); if ((before < 1.1) !== (camera.aspect < 1.1)) setView(preset, true); });
  ro.observe(host);
  const io = new IntersectionObserver((es) => { state.visible = es.some((e) => e.isIntersecting); if (state.visible) kick(); }, { rootMargin: '120px' });
  io.observe(host);
  const onVis = () => { if (!document.hidden) kick(); };
  document.addEventListener('visibilitychange', onVis);
  let raf = 0, last = performance.now(), alive = true, frame = 0;
  function kick() { if (!raf && alive) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function loop(now) {
    raf = 0; if (!alive) return;
    if (!state.visible || document.hidden) return; // resumes on scroll back / tab back
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const active = state.playing || tween || state.blendIn < 1 || state.dirty || Math.abs(state.cutX - (state.mode === 'strata' || state.mode === 'geochem' ? -9 : HX)) > 0.002 || Math.abs(heatMix - (state.mode === 'muscles' ? 1 : 0)) > 0.01 || Math.abs(ghost - (state.mode === 'kinematics' ? 1 : 0)) > 0.01 || fly.length;
    if (active) {
      update(dt); updateCamera(dt);
      if (state.shake > 0.0005) { camera.position.y += (Math.random() - 0.5) * state.shake; state.shake *= 0.8; }
      renderer.render(scene, camera);
      if (P) {
        state.readouts = measure();
        if (state.playing && now / 1000 - state.lastSample > 0.05) { samples.push([state.t, state.readouts.trunk, state.readouts.hip, state.readouts.knee]); state.lastSample = now / 1000; while (samples.length > 400) samples.shift(); }
      }
      drawOverlay();
      if (frame++ % 2 === 0) drawChart(state.t);
      state.dirty = false;
    } else { controls.update(); }
    raf = requestAnimationFrame(loop);
  }

  resize(); setView('side', true);

  // ----- the lab's controls talk to the scene through these -----
  function setSoil(id, color, moist) {
    // a texture keeps the size it was first sent to the GPU with, so a new picture gets a new texture
    const st = new THREE.CanvasTexture(strataCanvas(id, color, moist)); st.colorSpace = THREE.SRGBColorSpace; st.wrapT = THREE.ClampToEdgeWrapping; st.anisotropy = 8;
    const tt = new THREE.CanvasTexture(topCanvas(id, color, moist)); tt.colorSpace = THREE.SRGBColorSpace; tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(3, 3.5); tt.anisotropy = 8;
    wallMat.map?.dispose(); topMat.map?.dispose();
    wallMat.map = st; capMat.map = st; topMat.map = tt; wallMat.needsUpdate = capMat.needsUpdate = true;
    own.push(st, tt);
    const look = SOIL_LOOK[id] ?? SOIL_LOOK.wetland;
    topMat.roughness = clamp(look.rough - moist / 60, 0.2, 1); topMat.needsUpdate = true;
  }
  const api = {
    setParams(p) {
      const prev = { ...state };
      Object.assign(state, p);
      if (p.soilId !== undefined && (p.soilId !== prev.soilId || p.moist !== prev.moist || p.soilColor !== prev.soilColor || !api._soilOnce)) { setSoil(state.soilId, state.soilColor, state.moist); api._soilOnce = true; topDirty = true; }
      water.visible = state.water;
      if (p.action !== undefined && (p.action !== prev.action || !api._fieldOnce)) { api._fieldOnce = true; buildField(); if (P) solveReach(); state.blendIn = 0; samples.length = 0; setView(preset); }
      else if (p.soilId !== prev.soilId) { const keepFz = state.fz; buildField(); if (!motion().walk) { state.fz = keepFz; } }
      if (P && (p.sink !== prev.sink || p.effort !== prev.effort)) solveReach();
      state.dirty = true; kick();
    },
    setFarmer(look) { setFarmer(look); if (state.action) solveReach(); state.dirty = true; kick(); },
    setView(name) { setView(name); kick(); },
    zoom(f) { zoom(f); kick(); },
    reset() { state.t = 0; samples.length = 0; buildField(); solveReach(); setView(preset); state.dirty = true; kick(); },
    get view() { return preset; },
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
      controls.dispose();
      if (P) { P.disposed = true; scene.remove(P.root); }
      for (const m of heatMats) m.dispose();
      for (const f of fly) scene.remove(f.g);
      for (const o of own) o.dispose?.();
      renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove();
    },
  };
  if (typeof window !== 'undefined' && import.meta.env?.DEV) window.__fsBiomech = { state, api, scene, camera, get P() { return P; }, get real() { return real; } };
  kick();
  return api;
}

// A palm that reads as a real coconut, date or palmyra palm, not a pole with green strips: a trunk that leans and
// curves, swollen at the foot and ringed with old leaf scars; a crown of long pinnate fronds, each a yellow-green
// midrib with dozens of narrow leaflets hanging in a V, the young ones standing up, the old ones drooping, two
// dry brown ones hanging against the trunk; and a cluster of nuts under the crown. Used behind the characters
// (backdrop.js) and in the game world (props.js). Geometry is built once per kind and shared.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const cache = new Map();

// One frond, along +z from the origin: a midrib that rises and then arches over, with leaflets on both sides.
// Vertex colours run from the darker base to sun-faded tips; `dry` makes it a hanging brown frond.
export function frondGeometry({ len = 2.4, leaflets = 30, leaf = 0.75, droop = 0.65, dry = false } = {}) {
  const key = `${len}|${leaflets}|${leaf}|${droop}|${dry}`;
  if (cache.has(key)) return cache.get(key);
  const pos = [], col = [], idx = [];
  const base = new THREE.Color(dry ? '#8a6a3c' : '#3f7a2c'), tip = new THREE.Color(dry ? '#b8935a' : '#8fb34a'), rib = new THREE.Color(dry ? '#9a7a48' : '#b9b45a');
  const at = (u) => [0, Math.sin(u * Math.PI * 0.55) * len * 0.28 - u * u * len * droop * 0.55, u * len];
  const quad = (a, b, c, d, ca, cb) => { const i = pos.length / 3; pos.push(...a, ...b, ...c, ...d); col.push(ca.r, ca.g, ca.b, ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cb.r, cb.g, cb.b); idx.push(i, i + 1, i + 2, i, i + 2, i + 3); };
  // the midrib: a narrow strip standing on edge
  const N = 14;
  for (let k = 0; k < N; k++) {
    const u0 = k / N, u1 = (k + 1) / N, [x0, y0, z0] = at(u0), [x1, y1, z1] = at(u1), w0 = 0.03 * (1 - u0 * 0.8), w1 = 0.03 * (1 - u1 * 0.8);
    quad([x0 - w0, y0, z0], [x0 + w0, y0, z0], [x1 + w1, y1, z1], [x1 - w1, y1, z1], rib, rib);
  }
  // leaflets: longest in the middle of the frond, hanging down and out in a V, a little forward
  for (let k = 0; k < leaflets; k++) {
    const u = 0.1 + (k / (leaflets - 1)) * 0.88, P = at(u), L = leaf * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.55) * (0.85 + ((k * 37) % 10) / 40);
    const hang = (dry ? 1.15 : 0.45) + u * 0.5, c = base.clone().lerp(tip, u * 0.8);
    for (const s of [-1, 1]) {
      const dx = s * Math.cos(hang), dy = -Math.sin(hang), dz = 0.32, w = 0.028;
      const E = [P[0] + dx * L, P[1] + dy * L, P[2] + dz * L];
      quad([P[0], P[1] + w, P[2] - w], [P[0], P[1] - w, P[2] + w], [E[0], E[1] - w * 0.2, E[2] + w * 0.4], [E[0], E[1] + w * 0.2, E[2] - w * 0.4], c, c.clone().lerp(tip, 0.4));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  cache.set(key, g);
  return g;
}

// the trunk's grey-brown bark with its rings of old leaf scars
let barkTex = null;
function bark() {
  if (barkTex) return barkTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#8a7a66'; x.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 128; y += 16) {
    x.fillStyle = 'rgba(60,48,36,0.55)'; x.fillRect(0, y, 64, 3);
    x.fillStyle = 'rgba(190,176,150,0.35)'; x.fillRect(0, y + 3, 64, 2);
    for (let k = 0; k < 10; k++) { x.fillStyle = `rgba(70,58,44,${0.12 + (k % 3) * 0.05})`; x.fillRect((k * 23 + y) % 64, y + 6 + (k % 5), 6, 1); }
  }
  barkTex = new THREE.CanvasTexture(c); barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping; barkTex.colorSpace = THREE.SRGBColorSpace;
  return barkTex;
}

// A whole palm, its foot at the origin. kind: 'coconut' (tall, leaning, nuts), 'date' (straight, shorter, dates),
// 'areca' (slim and straight), 'palmyra' (straight, fan-like crown).
// The crown is one group (userData.crown, as world.js sways it in the wind) holding one merged mesh of fronds.
export function buildPalm({ kind = 'coconut', h = 7, lean = 0.12, seed = 1, sway = 0.07, own = (o) => o } = {}) {
  const g = new THREE.Group();
  const rnd = (() => { let s = (seed * 9301 + 49297) % 233280 || 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const slim = kind === 'areca' ? 0.55 : kind === 'palmyra' ? 1.25 : 1;
  const bend = kind === 'coconut' ? lean : lean * 0.25;
  // the trunk: a cylinder bent along a gentle curve, wider at the foot
  const tg = own(new THREE.CylinderGeometry(0.15 * slim, 0.21 * slim, h, 12, 18, true).translate(0, h / 2, 0));
  const p = tg.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const y = p.getY(k), u = y / h, foot = 1 + Math.max(0, 1 - y / 0.6) * 0.45;
    p.setX(k, p.getX(k) * foot + Math.sin(u * Math.PI * 0.5) * bend * h); p.setZ(k, p.getZ(k) * foot);
  }
  tg.computeVertexNormals();
  const tex = bark().clone(); tex.needsUpdate = true; tex.repeat.set(1, h / 0.9);
  const tm = own(new THREE.MeshStandardMaterial({ map: own(tex), roughness: 0.95 }));
  const trunk = new THREE.Mesh(tg, tm); trunk.castShadow = true; g.add(trunk);
  const top = new THREE.Vector3(bend * h, h, 0);
  // the crown, swaying from the top of the trunk: a knot of old frond bases, the fronds round it, the nuts below
  const crown = new THREE.Group(); crown.position.copy(top); crown.userData.crown = true; crown.userData.swayAmp = sway; g.add(crown);
  const knot = new THREE.Mesh(own(new THREE.SphereGeometry(0.26 * slim, 12, 8)), own(new THREE.MeshStandardMaterial({ color: '#6f6a3e', roughness: 0.9 })));
  knot.scale.set(1, 0.8, 1); crown.add(knot);
  const len = kind === 'areca' ? 1.8 : kind === 'palmyra' ? 1.6 : kind === 'date' ? 2.3 : 2.7;
  const n = kind === 'palmyra' ? 18 : kind === 'areca' ? 9 : 15;
  const parts = [], m4 = new THREE.Matrix4(), e = new THREE.Euler(), qn = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3();
  const place = (geo, rx, ry, y = 0) => { e.set(rx, ry, 0, 'YXZ'); qn.setFromEuler(e); m4.compose(zero.set(0, y, 0), qn, one); parts.push(geo.clone().applyMatrix4(m4)); };
  for (let k = 0; k < n; k++) {
    const young = k % 3 === 0, a = (k / n) * Math.PI * 2 + rnd() * 0.3;
    place(frondGeometry({ len: +(len * (0.85 + (k % 4) * 0.06)).toFixed(2), leaflets: kind === 'palmyra' ? 22 : 30, leaf: kind === 'palmyra' ? 0.55 : len * 0.3, droop: young ? 0.35 : 0.75 }), young ? -0.55 : -0.1 + rnd() * 0.2, a);
  }
  for (let k = 0; k < 2; k++) place(frondGeometry({ len: +(len * 0.85).toFixed(2), leaflets: 22, leaf: len * 0.22, droop: 0.9, dry: true }), 0.9 + k * 0.2, k * 2.4 + 0.8, -0.15); // dry fronds hanging against the trunk
  const fronds = new THREE.Mesh(own(mergeGeometries(parts)), own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide })));
  for (const pg of parts) pg.dispose();
  fronds.castShadow = true; crown.add(fronds);
  if (kind !== 'areca') {
    const nm = own(new THREE.MeshStandardMaterial({ color: kind === 'date' ? '#b8642a' : kind === 'palmyra' ? '#2a2420' : '#7a8a2e', roughness: 0.6 }));
    const ng = own(new THREE.SphereGeometry(kind === 'date' ? 0.05 : 0.13, 10, 8));
    const m = kind === 'date' ? 22 : 7;
    for (let k = 0; k < m; k++) { const a = k * 2.4, r = 0.2 + (k % 3) * 0.05; const nut = new THREE.Mesh(ng, nm); nut.position.set(Math.cos(a) * r, -0.25 - (k % 4) * 0.09, Math.sin(a) * r); crown.add(nut); }
  }
  return g;
}

// Living ground cover and sky for the world of মাঠের মানুষ: grass tufts that bend in the wind, wildflowers in clumps,
// the neighbours' crops standing in their patches (wheat in ear, paddy, mustard in flower, sunflowers, low sesame and
// groundnut, cut stubble; the standing crops are the drawn plants of plants.js), clouds drifting overhead, and the
// village's birds in flocks overhead and on the ground. Each kind is one InstancedMesh, so thousands of plants cost a
// few draw calls; the sway runs in the vertex shader from the weather's wind (a breeze most days, a gale in the
// storm). Planting avoids the farm's plots, paths, water, buildings, trees and stations, and is seeded from the
// layout so a place looks the same every visit. 'light' graphics plants about a quarter as much and no flowers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FIELD_W, FIELD_D } from '../regions.js';
import { cropLook, cropMaterials } from './plants.js';

const C = (h) => new THREE.Color(h);
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};

// One geometry from triangles given as flat position and colour arrays; normals point up so blades light like a lawn
// seen from above, not like paper cards edge-on.
function soup(pos, col, up = true) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (up) g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  else g.computeVertexNormals();
  return g;
}
// a closed shape (flower, ear, head) as a non-indexed geometry with a flat colour, ready to merge with blades
function part(geo, color, at = [0, 0, 0], scale = [1, 1, 1]) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.deleteAttribute('uv');
  g.scale(...scale); g.translate(...at);
  const c = C(color), n = g.attributes.position.count;
  g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => [c.r, c.g, c.b][i % 3]), 3));
  return g;
}
// A tuft of tapered blades round the origin: n blades, heights hMin..hMax, darker at the base than the tip.
function tuft(rng, n, hMin, hMax, w, spread, base, tip) {
  const pos = [], col = [], b = C(base), t = C(tip);
  for (let k = 0; k < n; k++) {
    const a = rng() * Math.PI * 2, r = rng() * spread, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const rot = rng() * Math.PI, h = hMin + rng() * (hMax - hMin), lean = (rng() - 0.3) * h * 0.35;
    const c = Math.cos(rot), s = Math.sin(rot);
    pos.push(x - (c * w) / 2, 0, z - (s * w) / 2, x + (c * w) / 2, 0, z + (s * w) / 2, x - s * lean, h, z + c * lean);
    col.push(b.r, b.g, b.b, b.r, b.g, b.b, t.r, t.g, t.b);
  }
  return soup(pos, col);
}

// The shapes: grass, a wildflower, and the cut stubble of a harvested patch (the standing crops come from plants.js).
function shapes(rng) {
  const grass = tuft(rng, 11, 0.08, 0.22, 0.05, 0.14, '#5f8a34', '#c4dc74');
  const flower = mergeGeometries([
    tuft(rng, 3, 0.1, 0.16, 0.03, 0.03, '#5f8a34', '#9fc45a'),
    part(new THREE.CircleGeometry(0.05, 6).rotateX(-Math.PI / 2), '#ffffff', [0, 0.16, 0]),
    part(new THREE.CircleGeometry(0.02, 5).rotateX(-Math.PI / 2), '#f2c230', [0, 0.165, 0]),
  ]);
  const stubble = tuft(rng, 10, 0.08, 0.16, 0.03, 0.12, '#a08a4a', '#d9c27a');
  return { grass, flower, stubble };
}

function makeButterflyGeo() {
  const g = new THREE.BufferGeometry();
  const pos = [
    // left wing
    0, 0, 0,  -0.12, 0.04, 0.09,  -0.14, 0.02, -0.07,
    0, 0, 0,  -0.14, 0.02, -0.07,  -0.06, 0.01, -0.11,
    // right wing
    0, 0, 0,   0.14, 0.02, -0.07,   0.12, 0.04, 0.09,
    0, 0, 0,   0.06, 0.01, -0.11,   0.14, 0.02, -0.07,
  ];
  const uvs = [
    0.5, 0.5,  0, 1,  0, 0,
    0.5, 0.5,  0, 0,  0.2, 0,
    0.5, 0.5,  1, 0,  1, 1,
    0.5, 0.5,  0.8, 0,  1, 0,
  ];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

// ---- birds ----
// The birds of a South Asian village at their real size: house crows (black with a grey collar), common mynas (brown,
// black head, yellow bill and the bare yellow skin behind the eye, white wing patch), rock pigeons (blue-grey, two
// black wing bars, a green-purple neck), cattle egrets (white, buff crown, yellow bill, long dark legs) and barn
// swallows (steel-blue, rufous throat, forked tail). Each species is one InstancedMesh: body, head, bill, tail fan, legs
// and two wings in one geometry whose parts are tagged (aPart), so the vertex shader beats the wings (shoulder and a
// bending wrist; the down-stroke quicker than the up-stroke, the hand flexed on the way up), folds them along the flank
// at rest, tucks the legs back in flight and dips or turns the head. Flocks fly to wandering waypoints, turning at a
// limited rate and banking into the turn; each bird keeps a loose place behind the lead and flaps in bouts with glides
// between; they come down on open ground (egrets by the water), on roofs and tree tops, walk about and peck, and burst
// up together when the farmer comes too close. Swallows never land: they hawk low over the land all day. At night or
// in a storm the birds settle and the swallows are gone. The CPU per bird is a few lines and one matrix a frame; no
// allocation while running.
const TAU = Math.PI * 2;
const clampB = (v, a, b) => Math.max(a, Math.min(b, v));
const easeB = (k) => k * k * (3 - 2 * k);
// hz: wingbeats a second; up / dn: shoulder angle at the top and bottom of the stroke; down: share of the beat spent
// on the down-stroke; glide: wing angle while gliding (a pigeon holds a V); fold: droop of the folded wing; speed m/s;
// turn rad/s; alt / roam: flight height above ground and distance from the farm; flight / stay: seconds aloft and on
// the ground; flush: metres at which the farmer puts them up; bout: seconds flapping, seconds gliding; spread: how far
// the flock strings out; walk m/s; stand: body pitch standing (negative is breast up)
const BIRD_SP = {
  crow: { hz: 3.4, up: 0.95, dn: -0.75, down: 0.4, glide: 0.06, fold: -0.35, speed: 7.5, turn: 0.9, meander: 0.25, alt: [7, 15], roam: [10, 70], flight: [10, 24], stay: [15, 40], flush: 7, bout: [2.4, 0.9], spread: 3, flockR: 2.2, walk: 0.5, wander: 1.4, hop: 0.03, peckGap: 1.6, peckA: 0.9, perch: 0.45, stand: -0.3, flyHead: 0, rough: 0.38 },
  myna: { hz: 7, up: 1.0, dn: -0.8, down: 0.4, glide: 0.04, fold: -0.3, speed: 6.5, turn: 1.3, meander: 0.4, alt: [3, 9], roam: [8, 55], flight: [6, 14], stay: [12, 30], flush: 5, bout: [1.3, 0.35], spread: 1, flockR: 1.2, walk: 0.6, wander: 1.2, hop: 0, peckGap: 1, peckA: 1, perch: 0.45, stand: -0.25, flyHead: 0, rough: 0.6 },
  pigeon: { hz: 6.2, up: 1.15, dn: -0.9, down: 0.4, glide: 0.38, fold: -0.3, speed: 9, turn: 1, meander: 0.3, alt: [8, 18], roam: [10, 75], flight: [12, 26], stay: [15, 35], flush: 6, bout: [1.6, 1.3], spread: 1.6, flockR: 1.8, walk: 0.4, wander: 1.5, hop: 0, bob: true, peckGap: 1.2, peckA: 0.9, perch: 0.5, stand: -0.12, flyHead: 0, rough: 0.55 },
  egret: { hz: 2.7, up: 0.75, dn: -0.6, down: 0.42, glide: 0.02, fold: -0.25, speed: 6, turn: 0.7, meander: 0.15, alt: [4, 9], roam: [10, 65], flight: [10, 20], stay: [20, 50], flush: 9, bout: [5, 0.7], spread: 2.5, flockR: 3, walk: 0.25, wander: 2, hop: 0, peckGap: 2.5, peckA: 1.2, perch: 0, wet: true, stand: -0.35, flyHead: 0.45, flyRetract: 1, rough: 0.75 },
  swallow: { hz: 8.5, up: 0.85, dn: -0.6, down: 0.4, glide: -0.04, fold: -0.2, speed: 9, turn: 2.4, meander: 1.6, alt: [1.2, 5], roam: [5, 50], flight: [1e9, 1e9], stay: [1, 1], flush: 0, bout: [0.45, 0.8], spread: 0, flockR: 0, walk: 0, wander: 0, perch: 0, always: true, stand: 0, flyHead: 0, rough: 0.45 },
};

// One species' bird facing +z, its body's middle at the origin. Returns the geometry and the pivots the shader turns
// the parts about: shoulder (sh), hip and the base of the neck (neck, with how far the head draws back).
function birdGeometry(kind) {
  const P = [], N = [], Cl = [], A = [], col = new THREE.Color();
  const put = (x, y, z, nx, ny, nz, c, a) => { P.push(x, y, z); N.push(nx, ny, nz); col.set(c); Cl.push(col.r, col.g, col.b); A.push(a[0], a[1], a[2]); };
  const paint = (c, x, y, z) => (typeof c === 'function' ? c(x, y, z) : c);
  const solid = (geo, color, part = [0, 0, 0]) => {
    const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); put(x, y, z, n.getX(i), n.getY(i), n.getZ(i), paint(color, x, y, z), part); }
    if (g !== geo) g.dispose(); geo.dispose();
  };
  // flat feathers and toes: every triangle wound to face up, so the top is the front face (lit from the sky) and the
  // underside the back face (lit from the ground) on a two-sided material
  const flat = (tris, color, part) => {
    for (let i = 0; i < tris.length; i += 9) {
      const T = tris.slice(i, i + 9);
      if ((T[5] - T[2]) * (T[6] - T[0]) - (T[3] - T[0]) * (T[8] - T[2]) < 0) for (let k = 0; k < 3; k++) [T[3 + k], T[6 + k]] = [T[6 + k], T[3 + k]];
      for (let v = 0; v < 9; v += 3) { const x = T[v], y = T[v + 1], z = T[v + 2]; put(x, y, z, 0, 1, 0, paint(color, x, y, z), typeof part === 'function' ? part(x, y, z) : part); }
    }
  };
  const ell = (rx, ry, rz, at, w = 12, h = 8) => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz).translate(...at);
  const bill = (r, len, at, rotX = 0) => new THREE.ConeGeometry(r, len, 6).rotateX(Math.PI / 2 + rotX).translate(...at);
  // a wing each side: stations [share of the span, leading edge z, trailing edge z] from the shoulder out, optional
  // separated primaries ("fingers") [share, z, z, tip share, tip z]; color(share of span, z from the shoulder)
  const wings = (sh, S, stations, color, fingers = []) => {
    for (const side of [1, -1]) {
      const X = (f) => side * (sh[0] + f * S), tris = [];
      for (let i = 1; i < stations.length; i++) {
        const [f0, l0, t0] = stations[i - 1], [f1, l1, t1] = stations[i];
        tris.push(X(f0), sh[1], sh[2] + l0, X(f0), sh[1], sh[2] + t0, X(f1), sh[1], sh[2] + t1, X(f0), sh[1], sh[2] + l0, X(f1), sh[1], sh[2] + t1, X(f1), sh[1], sh[2] + l1);
      }
      for (const [f0, za, zb, f1, zt] of fingers) tris.push(X(f0), sh[1], sh[2] + za, X(f0), sh[1], sh[2] + zb, X(f1), sh[1], sh[2] + zt);
      flat(tris, (x, y, z) => color((Math.abs(x) - sh[0]) / S, z - sh[2]), (x) => [side * Math.max(0.002, (Math.abs(x) - sh[0]) / S), 0, 0]);
    }
  };
  // a tail of n feathers fanned over ±half radians; fork > 0 makes the outer ones longer (a swallow's streamers)
  const tail = (z0, y, len, half, n, fork, color) => {
    const tris = [];
    for (let k = 0; k < n; k++) {
      const a0 = -half + (2 * half * k) / n, a1 = -half + (2 * half * (k + 1)) / n, l0 = len * (1 + (fork * Math.abs(a0)) / half), l1 = len * (1 + (fork * Math.abs(a1)) / half);
      tris.push(0, y, z0, Math.sin(a0) * l0, y, z0 - Math.cos(a0) * l0, Math.sin(a1) * l1, y, z0 - Math.cos(a1) * l1);
    }
    flat(tris, color, [0, 0, 0]);
  };
  const legs = (hy, hz, gap, len, r, color, toe) => {
    for (const sx of [-1, 1]) {
      const x = sx * gap;
      solid(new THREE.CylinderGeometry(r, r * 0.8, len, 4).translate(x, hy - len / 2, hz), color, [0, 1, 0]);
      const fy = hy - len + 0.001, tris = [];
      for (const a of [-0.45, 0, 0.45, Math.PI]) {
        const l = a === Math.PI ? toe * 0.6 : toe, c = Math.cos(a) * 0.003, s = Math.sin(a) * 0.003;
        tris.push(x - c, fy, hz + s, x + c, fy, hz - s, x + Math.sin(a) * l, fy, hz + Math.cos(a) * l);
      }
      flat(tris, color, [0, 1, 0]);
    }
  };
  const H = [0, 0, 1];
  let sh, hip, neck;
  if (kind === 'crow') {
    const black = '#16161b', grey = '#5c5d63';
    solid(ell(0.068, 0.07, 0.13, [0, 0, -0.01]), (x, y, z) => (z > 0.05 && y > -0.045 ? grey : black));
    solid(ell(0.045, 0.045, 0.055, [0, 0.055, 0.135]), (x, y, z) => (z > 0.13 || y < 0.03 ? black : grey), H);
    solid(bill(0.016, 0.065, [0, 0.05, 0.205]), '#101014', H);
    for (const s of [-1, 1]) solid(ell(0.008, 0.008, 0.008, [s * 0.036, 0.066, 0.163], 6, 4), '#2a2018', H);
    tail(-0.1, 0.012, 0.15, 0.22, 6, -0.12, black);
    sh = [0.05, 0.03, 0.04];
    wings(sh, 0.36, [[0, 0.03, -0.15], [0.3, 0.045, -0.16], [0.5, 0.05, -0.15], [0.72, 0.02, -0.13], [0.8, 0.005, -0.12]], (f) => (f > 0.75 ? '#1f1e24' : '#141419'),
      [0, 1, 2, 3, 4].map((k) => { const za = 0.005 - k * 0.025, zb = za - 0.022; return [0.8, za, zb, 0.97 + 0.03 * Math.sin(k), (za + zb) / 2 - 0.02 - k * 0.012]; }));
    legs(-0.05, 0, 0.022, 0.055, 0.005, '#121214', 0.03);
    hip = [0, -0.05, 0, 0.055]; neck = [0, 0.035, 0.09, 0.03];
  } else if (kind === 'myna') {
    const head = '#151210', brown = '#5e3f27', white = '#f2efe6', yellow = '#f0c01a';
    solid(ell(0.042, 0.045, 0.075, [0, 0, 0]), (x, y, z) => (y < -0.02 && z < -0.02 ? white : z > 0.045 ? head : y < -0.012 ? '#7a5638' : brown));
    solid(ell(0.03, 0.03, 0.035, [0, 0.035, 0.08]), head, H);
    for (const s of [-1, 1]) {
      solid(ell(0.005, 0.012, 0.016, [s * 0.026, 0.038, 0.088], 6, 4), yellow, H); // the bare skin round the eye
      solid(ell(0.0045, 0.0045, 0.0045, [s * 0.03, 0.041, 0.094], 6, 4), '#4a2410', H);
    }
    solid(bill(0.009, 0.03, [0, 0.03, 0.125]), yellow, H);
    tail(-0.065, 0.008, 0.08, 0.18, 5, -0.1, (x, y, z) => (z < -0.135 ? white : '#1d1814'));
    sh = [0.03, 0.02, 0.03];
    wings(sh, 0.17, [[0, 0.02, -0.085], [0.45, 0.03, -0.085], [0.75, 0, -0.07], [1, -0.04, -0.06]], (f, dz) => (f > 0.55 ? (f < 0.72 && dz > -0.05 ? white : '#1c1814') : brown));
    legs(-0.03, 0.005, 0.015, 0.045, 0.004, '#e2b020', 0.022);
    hip = [0, -0.03, 0.005, 0.045]; neck = [0, 0.02, 0.055, 0.02];
  } else if (kind === 'pigeon') {
    const grey = '#878d99', light = '#a9afba';
    solid(ell(0.06, 0.062, 0.1, [0, 0, 0]), (x, y, z) => (z > 0.06 ? (y > 0.01 ? '#4d6a5a' : '#6a4f6c') : y < -0.02 ? '#7d8390' : grey));
    solid(ell(0.032, 0.033, 0.038, [0, 0.055, 0.105]), '#69707c', H);
    for (const s of [-1, 1]) solid(ell(0.006, 0.006, 0.006, [s * 0.028, 0.062, 0.117], 6, 4), '#d8701a', H);
    solid(bill(0.008, 0.028, [0, 0.05, 0.15]), '#38353a', H);
    solid(ell(0.008, 0.005, 0.008, [0, 0.057, 0.137], 6, 4), '#eceae4', H); // the white cere
    tail(-0.085, 0.01, 0.12, 0.2, 6, -0.05, (x, y, z) => (z < -0.18 ? '#2b2c33' : grey));
    sh = [0.045, 0.025, 0.035];
    wings(sh, 0.28, [[0, 0.025, -0.12], [0.42, 0.035, -0.12], [0.7, 0, -0.095], [1, -0.08, -0.09]],
      (f, dz) => (f > 0.68 ? '#4a4d57' : f < 0.5 && ((dz < -0.06 && dz > -0.076) || (dz < -0.09 && dz > -0.106)) ? '#1e1f24' : light));
    legs(-0.045, 0.005, 0.018, 0.045, 0.004, '#c4505a', 0.025);
    hip = [0, -0.045, 0.005, 0.045]; neck = [0, 0.035, 0.07, 0.035];
  } else if (kind === 'egret') {
    const white = '#f5f4ee', buff = '#efdcae';
    solid(ell(0.06, 0.07, 0.11, [0, 0, 0]), (x, y, z) => (y > 0.045 && z > -0.02 ? '#f1e8d2' : white));
    const nk = new THREE.CylinderGeometry(0.017, 0.022, 0.16, 6).rotateX(0.55).translate(0, 0.04 + Math.cos(0.55) * 0.08, 0.08 + Math.sin(0.55) * 0.08);
    solid(nk, (x, y) => (y > 0.13 ? buff : white), H);
    solid(ell(0.026, 0.028, 0.034, [0, 0.185, 0.175]), buff, H);
    for (const s of [-1, 1]) solid(ell(0.005, 0.005, 0.005, [s * 0.022, 0.19, 0.188], 6, 4), '#d8c020', H);
    solid(bill(0.008, 0.06, [0, 0.18, 0.225]), '#f0c020', H);
    tail(-0.1, 0.01, 0.06, 0.3, 5, -0.1, white);
    sh = [0.05, 0.03, 0.04];
    wings(sh, 0.4, [[0, 0.04, -0.17], [0.4, 0.05, -0.18], [0.72, 0.03, -0.16], [0.9, 0, -0.12], [1, -0.05, -0.08]], (f) => (f > 0.8 ? '#ecebe4' : '#f7f6f0'));
    legs(-0.05, 0, 0.02, 0.2, 0.005, '#4a4630', 0.05);
    hip = [0, -0.05, 0, 0.2]; neck = [0, 0.04, 0.08, 0.08];
  } else { // swallow
    const blue = '#1d2c56', rufous = '#9a3e22', cream = '#efe0c4';
    solid(ell(0.022, 0.022, 0.05, [0, 0, 0]), (x, y, z) => (y > 0.004 ? blue : z > 0.025 ? rufous : cream));
    solid(ell(0.018, 0.017, 0.02, [0, 0.008, 0.055]), (x, y, z) => (y < 0.003 || z > 0.07 ? rufous : blue), H);
    solid(bill(0.004, 0.01, [0, 0.006, 0.078]), '#111111', H);
    tail(-0.045, 0.004, 0.04, 0.32, 6, 1.4, blue);
    sh = [0.016, 0.01, 0.02];
    wings(sh, 0.14, [[0, 0.012, -0.04], [0.35, 0.012, -0.045], [0.65, -0.02, -0.055], [1, -0.075, -0.085]], () => '#1a2850');
    legs(-0.015, 0, 0.007, 0.012, 0.002, '#2a2020', 0.008);
    hip = [0, -0.015, 0, 0.012]; neck = [0, 0.005, 0.04, 0.008];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(Cl, 3)); g.setAttribute('aPart', new THREE.Float32BufferAttribute(A, 3));
  const p = BIRD_SP[kind].stand, foot = hip[1] * Math.cos(p) - hip[2] * Math.sin(p) - hip[3]; // the feet's height under the middle, standing
  return { geo: g, sh, hip, neck, foot };
}

// aPart: x the wing (signed share of the span, + is the bird's left), y a leg, z the head and neck.
// aFlap (per bird): x shoulder angle, y wrist bend, z how far the wings are open (0 folded), w legs down (0 tucked).
// aHead (per bird): x pitch (head down), y turn, z how far the head draws back (a pigeon's bob, an egret's tucked neck).
const BIRD_HEAD = 'attribute vec3 aPart; attribute vec4 aFlap; attribute vec3 aHead;\nuniform vec3 uShoulder; uniform vec4 uHip; uniform vec4 uNeck;\n';
const BIRD_NORMAL = `#include <beginnormal_vertex>
  if (aPart.x != 0.0) { float bwA = aFlap.x * sign(aPart.x), bwC = cos(bwA), bwS = sin(bwA); objectNormal.xy = vec2(objectNormal.x * bwC - objectNormal.y * bwS, objectNormal.x * bwS + objectNormal.y * bwC); }`;
const BIRD_VERT = `#include <begin_vertex>
  if (aPart.x != 0.0) {
    float bSide = sign(aPart.x), bF = abs(aPart.x);
    vec3 bSh = vec3(bSide * uShoulder.x, uShoulder.y, uShoulder.z);
    vec3 bQ = transformed - bSh;
    float bLx = bQ.x * bSide, bHand = max(0.0, bLx - 0.45 * bLx / bF);
    bQ.y += bHand * sin(aFlap.y); bQ.x -= bSide * bHand * (1.0 - cos(aFlap.y));
    bLx = bQ.x * bSide;
    bQ.x = bSide * bLx * mix(0.14, 1.0, aFlap.z); bQ.z = bQ.z * mix(0.55, 1.0, aFlap.z) - bLx * (1.0 - aFlap.z) * 0.42; bQ.y += bLx * (1.0 - aFlap.z) * 0.1;
    float bA = aFlap.x * bSide, bC = cos(bA), bS = sin(bA);
    bQ.xy = vec2(bQ.x * bC - bQ.y * bS, bQ.x * bS + bQ.y * bC);
    transformed = bSh + bQ;
  } else if (aPart.y > 0.5) {
    vec3 bQ = transformed - uHip.xyz; float bT = (1.0 - aFlap.w) * 1.45 + aFlap.w * uHip.w, bC = cos(bT), bS = sin(bT);
    bQ.yz = vec2(bQ.y * bC - bQ.z * bS, bQ.y * bS + bQ.z * bC); transformed = uHip.xyz + bQ;
  } else if (aPart.z > 0.5) {
    vec3 bQ = transformed - uNeck.xyz;
    float bPc = cos(aHead.x), bPs = sin(aHead.x); bQ.yz = vec2(bQ.y * bPc - bQ.z * bPs, bQ.y * bPs + bQ.z * bPc);
    float bYc = cos(aHead.y), bYs = sin(aHead.y); bQ.xz = vec2(bQ.x * bYc + bQ.z * bYs, -bQ.x * bYs + bQ.z * bYc);
    transformed = uNeck.xyz + bQ + vec3(0.0, 0.25, -1.0) * aHead.z * uNeck.w;
  }`;
function birdMaterial(kind, G, depth = false) {
  const m = depth ? new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: BIRD_SP[kind].rough, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uShoulder = { value: new THREE.Vector3(...G.sh) };
    sh.uniforms.uHip = { value: new THREE.Vector4(G.hip[0], G.hip[1], G.hip[2], -BIRD_SP[kind].stand) };
    sh.uniforms.uNeck = { value: new THREE.Vector4(...G.neck) };
    sh.vertexShader = BIRD_HEAD + sh.vertexShader.replace('#include <beginnormal_vertex>', BIRD_NORMAL).replace('#include <begin_vertex>', BIRD_VERT);
  };
  m.customProgramCacheKey = () => (depth ? 'fs-bird-depth-v1' : 'fs-bird-v1');
  return m;
}

const PERCHLESS = new Set(['cow', 'ox', 'buffalo', 'goat', 'chicken', 'duck', 'egret', 'donkey', 'pond', 'stream', 'channel', 'stone']);
function createBirds(scene, L, rng, { free, inPatch, light }) {
  const FLOCKS = light
    ? [['crow', 3], ['myna', 2], ['pigeon', 4], ['egret', 2], ['swallow', 1], ['swallow', 1]]
    : [['crow', 4], ['crow', 3], ['myna', 2], ['myna', 2], ['pigeon', 7], ['egret', 4], ['swallow', 1], ['swallow', 1], ['swallow', 1], ['swallow', 1]];
  const count = {};
  for (const [k, n] of FLOCKS) count[k] = (count[k] ?? 0) + n;
  const M = {};
  for (const [k, n] of Object.entries(count)) {
    const G = birdGeometry(k);
    const flap = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4), head = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    flap.setUsage(THREE.DynamicDrawUsage); head.setUsage(THREE.DynamicDrawUsage);
    G.geo.setAttribute('aFlap', flap); G.geo.setAttribute('aHead', head);
    const mat = birdMaterial(k, G), depth = birdMaterial(k, G, true), mesh = new THREE.InstancedMesh(G.geo, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.customDepthMaterial = depth; mesh.castShadow = !light; mesh.receiveShadow = false; mesh.frustumCulled = false;
    scene.add(mesh);
    M[k] = { mesh, flap, head, mat, depth, geo: G.geo, foot: G.foot, used: 0 };
  }
  const flocks = [], birds = [];
  for (const [k, n] of FLOCKS) {
    const S = BIRD_SP[k], m = M[k];
    const f = { k, S, M: m, members: [], fly: false, landing: false, x: 0, y: 8, z: 0, yaw: rng() * TAU, speed: S.speed, wx: 0, wy: 8, wz: 0, timer: 0, stay: S.stay[0] + rng() * (S.stay[1] - S.stay[0]) };
    for (let i = 0; i < n; i++) {
      const b = {
        f, S, M: m, i: m.used++, x: 0, y: 0, z: 0, yaw: rng() * TAU, pitch: S.stand, roll: 0, sp: 0, spT: 0, vy: 0,
        mode: 'rest', perch: false, sx: 0, sy: 0, sz: 0, hx: 0, hz: 0, homing: false, landT: 0,
        ox: i ? (rng() - 0.5) * 2 * S.spread : 0, oy: i ? (rng() - 0.5) * S.spread * 0.4 : 0, oz: i ? -rng() * S.spread * 1.5 : 0,
        ph: rng(), flapW: 0, open: 0, legs: 1, bout: rng() * 2, flapping: true, delay: 0, boost: 0,
        idle: rng() * 2, peck: 0, peckT: rng() * 2, look: 0, lookT: 0, hy: 0, step: 0, wob: rng() * TAU, near: false,
      };
      f.members.push(b); birds.push(b);
    }
    flocks.push(f);
  }

  // perches: the tops of roofs, trees and poles, found once the village stands by looking straight down on each
  let perches = null;
  const ray = new THREE.Raycaster(), DOWN = new THREE.Vector3(0, -1, 0), rv = new THREE.Vector3();
  const own = new Set(Object.values(M).map((m) => m.mesh));
  function findPerches() {
    perches = [];
    const near = [], sph = new THREE.Sphere();
    scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || own.has(o) || !o.geometry?.attributes?.position) return;
      let vis = o.visible; o.traverseAncestors((a) => { if (!a.visible) vis = false; }); if (!vis) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if (sph.radius > 0.05 && sph.radius < 14) near.push([o, sph.center.x, sph.center.z, sph.radius]);
    });
    for (const p of L.props) {
      if (PERCHLESS.has(p.type) || Math.hypot(p.x, p.z) > 85) continue;
      const list = near.filter(([, x, z, r]) => Math.hypot(x - p.x, z - p.z) < r + 1).map(([o]) => o);
      if (!list.length) continue;
      const pts = [];
      for (const [ox, oz] of [[0, 0], [0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45], [0.9, 0], [-0.9, 0]]) {
        ray.set(rv.set(p.x + ox, 60, p.z + oz), DOWN);
        const hit = ray.intersectObjects(list, false)[0];
        if (hit && hit.point.y - L.ground(hit.point.x, hit.point.z) > 2.2 && hit.point.y < 30) pts.push([hit.point.x, hit.point.y, hit.point.z]);
      }
      if (pts.length >= 2) perches.push(pts);
    }
  }
  const walkable = (x, z) => { const p = inPatch(x, z); return p ? p[4] === 'bare' || p[4] === 'stubble' : free(x, z, 0.6); };
  // where a flock comes down, at least 16 m from the farmer: a perch, the water's edge (egrets) or open ground
  function restFor(f, px, pz) {
    const S = f.S;
    if (S.perch && perches?.length && rng() < S.perch) {
      for (let k = 0; k < 10; k++) {
        const site = perches[Math.floor(rng() * perches.length)];
        if (Math.hypot(site[0][0] - px, site[0][2] - pz) < 16) continue;
        f.members.forEach((b, i) => { const p = site[i % site.length], o = Math.floor(i / site.length) * 0.18; b.sx = b.hx = p[0] + o; b.sz = b.hz = p[2] + o * 0.5; b.sy = p[1] - b.M.foot; b.perch = true; });
        return true;
      }
    }
    for (let k = 0; k < 40; k++) {
      let cx, cz;
      if (S.wet && L.water.length) {
        const w = L.water[Math.floor(rng() * L.water.length)], a = rng() * TAU;
        if (w.r) { const d = w.r + 1.5 + rng() * 2.5; cx = w.cx + Math.cos(a) * d; cz = w.cz + Math.sin(a) * d; }
        else {
          const ex = (w.x1 - w.x0) / 2 + 1.5 + rng() * 2.5, ez = (w.z1 - w.z0) / 2 + 1.5 + rng() * 2.5, mx = (w.x0 + w.x1) / 2, mz = (w.z0 + w.z1) / 2;
          if (rng() < 0.5) { cx = mx + (rng() - 0.5) * 2 * ex; cz = mz + (rng() < 0.5 ? -ez : ez); } else { cx = mx + (rng() < 0.5 ? -ex : ex); cz = mz + (rng() - 0.5) * 2 * ez; }
        }
      } else { const a = rng() * TAU, d = 8 + rng() * 55; cx = Math.cos(a) * d; cz = Math.sin(a) * d; }
      if (Math.hypot(cx - px, cz - pz) < 16 || Math.hypot(cx, cz) > 85 || !walkable(cx, cz)) continue;
      for (const b of f.members) {
        let x = cx, z = cz;
        for (let tr = 0; tr < 6; tr++) { const a = rng() * TAU, d = Math.sqrt(rng()) * S.flockR, tx = cx + Math.cos(a) * d, tz = cz + Math.sin(a) * d; if (walkable(tx, tz)) { x = tx; z = tz; break; } }
        b.sx = b.hx = x; b.sz = b.hz = z; b.sy = L.ground(x, z) - b.M.foot; b.perch = false;
      }
      return true;
    }
    return false;
  }
  function wayFor(f) {
    const S = f.S, a = rng() * TAU, d = S.roam[0] + rng() * (S.roam[1] - S.roam[0]);
    f.wx = Math.cos(a) * d; f.wz = Math.sin(a) * d; f.wy = L.ground(f.wx, f.wz) + S.alt[0] + rng() * (S.alt[1] - S.alt[0]);
  }
  function takeOff(f, px, pz) {
    const S = f.S, n = f.members.length;
    let cx = 0, cy = 0, cz = 0;
    for (const b of f.members) { cx += b.x; cy += b.y; cz += b.z; }
    f.fly = true; f.landing = false; f.timer = S.flight[0] + rng() * (S.flight[1] - S.flight[0]);
    f.x = cx / n; f.y = cy / n + 1.5; f.z = cz / n; f.speed = S.speed * 0.6;
    f.yaw = Math.atan2(f.x - px, f.z - pz) + (rng() - 0.5) * 0.8; // away from whoever put them up
    f.wx = f.x + Math.sin(f.yaw) * 30; f.wz = f.z + Math.cos(f.yaw) * 30; f.wy = L.ground(f.wx, f.wz) + S.alt[1];
    for (const b of f.members) { b.mode = 'fly'; b.delay = b.perch ? rng() * 0.2 : rng() * 0.35; b.boost = 1.4; b.sp = 0.6; b.vy = b.perch ? 0.5 : 2.5; b.ph = rng(); b.homing = false; b.yaw = f.yaw + (rng() - 0.5) * 1.2; }
  }
  // start: most flocks down somewhere, the pigeons and the swallows up
  for (const f of flocks) {
    if (f.S.always || !restFor(f, 0, 0)) { f.x = (rng() - 0.5) * 40; f.z = (rng() - 0.5) * 40; f.y = L.ground(f.x, f.z) + f.S.alt[1]; for (const b of f.members) { b.x = f.x + b.ox; b.y = f.y; b.z = f.z + b.oz; } takeOff(f, f.x, f.z - 1); for (const b of f.members) { b.delay = 0; b.legs = 0; b.open = 1; b.sp = f.S.speed; b.vy = 0; } wayFor(f); continue; }
    for (const b of f.members) { b.x = b.sx; b.y = b.sy; b.z = b.sz; }
    if (f.k === 'pigeon') takeOff(f, f.members[0].x + 1, f.members[0].z);
  }

  function flyTo(b, gx, gy, gz, spT, dt) {
    const S = b.S, want = Math.atan2(gx - b.x, gz - b.z);
    let d = want - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    const turn = clampB(d * 3, -S.turn * 2.6, S.turn * 2.6) * dt;
    b.yaw += turn;
    b.roll += (clampB((-turn / Math.max(dt, 1e-3)) * 0.55, -1, 1) - b.roll) * Math.min(1, dt * 5); // bank into the turn
    b.spT = spT; b.sp += clampB(spT - b.sp, -5 * dt, 4 * dt);
    b.vy += (clampB((gy - b.y) * 1.4, -3, 3.5) - b.vy) * Math.min(1, dt * 3);
    b.x += Math.sin(b.yaw) * b.sp * dt; b.z += Math.cos(b.yaw) * b.sp * dt; b.y += b.vy * dt;
    b.pitch += (-Math.atan2(b.vy, Math.max(b.sp, 1)) * 0.8 - b.pitch) * Math.min(1, dt * 4);
  }
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(0, 0, 0, 'YXZ'), v4 = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1), ZERO = new THREE.Vector3(0, 0, 0);
  let clock = 0;

  return {
    // px, pz: the farmer; run: running (they flush further off); allow: daylight and no storm, when birds go about
    update(t, dt, px, pz, run, allow) {
      dt = Math.min(dt, 0.1); clock += dt;
      if (!perches && clock > 2) { try { findPerches(); } catch { perches = []; } }
      for (const f of flocks) {
        const S = f.S;
        if (S.always && !allow) continue;
        if (!f.fly) {
          f.stay -= dt;
          const reach = S.flush * (run ? 1.35 : 1);
          let scare = false;
          for (const b of f.members) if (Math.hypot(b.x - px, b.z - pz) < (b.perch ? reach * 0.55 : reach)) scare = true;
          if (scare) takeOff(f, px, pz);
          else if (f.stay <= 0 && allow) { const a = rng() * TAU; takeOff(f, f.members[0].x + Math.cos(a), f.members[0].z + Math.sin(a)); }
          if (!f.fly) continue;
        }
        // the lead: a point the flock follows, turning at a limited rate towards its waypoint
        if (!f.landing) {
          f.timer -= dt;
          if (!S.always && (f.timer <= 0 || !allow)) {
            if (restFor(f, px, pz)) {
              f.landing = true; let cx = 0, cy = 0, cz = 0;
              for (const b of f.members) { cx += b.sx; cy += b.sy; cz += b.sz; b.landT = 0; }
              const n = f.members.length; f.wx = cx / n; f.wy = cy / n + 3; f.wz = cz / n;
            } else f.timer = 4;
          } else if (Math.hypot(f.wx - f.x, f.wz - f.z) < 12) wayFor(f);
        }
        let d = Math.atan2(f.wx - f.x, f.wz - f.z) - f.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        f.yaw += clampB(d, -S.turn * dt, S.turn * dt) + Math.sin(t * 0.37 + f.members[0].wob) * S.meander * dt;
        const dh = Math.hypot(f.wx - f.x, f.wz - f.z);
        f.speed += ((f.landing ? Math.min(S.speed, 2 + dh * 0.5) : S.speed) - f.speed) * Math.min(1, dt);
        f.x += Math.sin(f.yaw) * f.speed * dt; f.z += Math.cos(f.yaw) * f.speed * dt;
        f.y += clampB(f.wy - f.y, -2.5, 2.5) * Math.min(1, dt * 0.8);
        f.y = Math.max(f.y, L.ground(f.x, f.z) + 1.5);
        if (f.landing && dh < 14) for (const b of f.members) if (b.mode === 'fly') b.mode = 'land';
        let down = 0;
        const fs = Math.sin(f.yaw), fc = Math.cos(f.yaw);
        for (const b of f.members) {
          if (b.mode === 'rest') { down++; continue; }
          if (b.delay > 0) { b.delay -= dt; continue; }
          if (b.mode === 'fly') {
            // its place in the flock, drifting a little, aimed a few metres ahead so it does not circle the spot
            const ox = b.ox + Math.sin(t * 0.7 + b.wob) * 0.6, oz = b.oz + Math.cos(t * 0.5 + b.wob) * 0.6;
            const gx = f.x + fc * ox + fs * oz, gz = f.z - fs * ox + fc * oz, gy = f.y + b.oy;
            const along = (gx - b.x) * fs + (gz - b.z) * fc;
            flyTo(b, gx + fs * 4, gy, gz + fc * 4, f.speed * clampB(1 + along * 0.15, 0.6, 1.5), dt);
            b.y = Math.max(b.y, L.ground(b.x, b.z) + 0.8);
            b.near = false;
          } else { // landing on its own spot
            b.landT += dt;
            const dx = b.sx - b.x, dz = b.sz - b.z, dy = b.sy - b.y, dd = Math.hypot(dx, dz);
            b.near = dd < 4;
            if (b.homing || dd < 1.6 || b.landT > 14) {
              b.homing = true;
              const k = Math.min(1, dt * 2.6);
              b.x += dx * k; b.z += dz * k; b.y += dy * k; b.sp *= 1 - k; b.roll *= 1 - k; b.vy = 0;
              b.pitch += (-0.55 - b.pitch) * k; // breast up, tail down, braking
              if (dd < 0.04 && Math.abs(dy) < 0.04) {
                b.mode = 'rest'; b.homing = false; b.x = b.sx; b.y = b.sy; b.z = b.sz; b.idle = 0.5 + rng() * 2;
              }
            } else {
              flyTo(b, b.sx, b.sy + Math.min(dd * 0.4, 5), b.sz, clampB(dd * 0.7, 1, f.speed), dt);
              b.y = Math.max(b.y, Math.min(b.sy, L.ground(b.x, b.z) + 0.5));
            }
          }
        }
        if (f.landing && down === f.members.length) { f.fly = false; f.landing = false; f.stay = S.stay[0] + rng() * (S.stay[1] - S.stay[0]); }
      }

      for (const b of birds) {
        const S = b.S, M = b.M;
        if (S.always && !allow) { m4.compose(v4.set(0, -50, 0), q4.identity(), ZERO); M.mesh.setMatrixAt(b.i, m4); continue; }
        let hp = 0, retract = 0, ang, wrist = 0, open, hop = 0;
        const air = b.mode !== 'rest' && b.delay <= 0;
        if (!air) {
          if (b.mode === 'rest') {
            // on the ground or a perch: walk about home, stop, peck, look round
            if (!b.perch && S.walk) {
              const dx = b.hx - b.x, dz = b.hz - b.z, d = Math.hypot(dx, dz);
              if (d > 0.03) {
                let a = Math.atan2(dx, dz) - b.yaw; a = Math.atan2(Math.sin(a), Math.cos(a));
                b.yaw += clampB(a, -4 * dt, 4 * dt);
                if (Math.abs(a) < 0.6) { const st = Math.min(d, S.walk * dt); b.x += (dx / d) * st; b.z += (dz / d) * st; b.step += dt * S.walk * 9; }
                if (S.hop) hop = Math.abs(Math.sin(b.step * Math.PI)) * S.hop;
                if (S.bob) retract = 0.5 + 0.5 * Math.sin(b.step * TAU);
              } else {
                b.idle -= dt;
                if (b.idle <= 0) {
                  const a = rng() * TAU, r = rng() * S.wander, tx = b.sx + Math.cos(a) * r, tz = b.sz + Math.sin(a) * r;
                  if (walkable(tx, tz)) { b.hx = tx; b.hz = tz; }
                  b.idle = 0.8 + rng() * 3;
                }
                b.peckT -= dt;
                if (b.peckT <= 0) { b.peck = 0.35; b.peckT = S.peckGap * (0.5 + rng()); }
              }
              b.y = L.ground(b.x, b.z) - M.foot + hop;
            }
            b.pitch += (S.stand - b.pitch) * Math.min(1, dt * 6); b.roll *= 1 - Math.min(1, dt * 6);
          }
          if (b.peck > 0) { b.peck -= dt; hp = Math.sin((1 - Math.max(0, b.peck) / 0.35) * Math.PI) * S.peckA; }
          b.lookT -= dt;
          if (b.lookT <= 0) { b.look = (rng() - 0.5) * 1.6; b.lookT = 0.5 + rng() * 2.2; }
          b.hy += (b.look - b.hy) * Math.min(1, dt * 10);
          hp += -b.pitch;
        } else {
          // the beat: a quick down-stroke, a slower up-stroke with the hand flexed; bouts of flapping, glides between
          b.bout -= dt;
          if (b.bout <= 0) { b.flapping = !b.flapping; b.bout = (b.flapping ? S.bout[0] : S.bout[1]) * (0.6 + rng() * 0.8); }
          const need = b.boost > 0 || b.vy > 0.6 || b.sp < b.spT * 0.85 || b.homing || b.near || b.flapping;
          b.flapW += ((need ? 1 : 0) - b.flapW) * Math.min(1, dt * 5);
          b.ph += dt * S.hz * (b.boost > 0 || b.homing ? 1.3 : 1);
          b.boost -= dt;
          hp = -b.pitch * 0.6 + S.flyHead; retract = S.flyRetract ?? 0;
          b.hy *= 1 - Math.min(1, dt * 4);
        }
        const u = b.ph % 1, D = S.down;
        let spreadK = 1;
        if (u < D) { const k = easeB(u / D); ang = S.up + (S.dn - S.up) * k; wrist = 0.25 * (1 - k) - 0.05; }
        else { const k = easeB((u - D) / (1 - D)), sn = Math.sin(k * Math.PI); ang = S.dn + (S.up - S.dn) * k; wrist = -0.7 * sn; spreadK = 1 - 0.28 * sn; }
        ang = S.glide + (ang - S.glide) * b.flapW; wrist *= b.flapW; spreadK = 1 + (spreadK - 1) * b.flapW;
        const wantOpen = air || b.delay > 0 ? 1 : 0, wantLegs = !air || b.homing || b.near ? 1 : 0;
        b.open += (wantOpen - b.open) * Math.min(1, dt * (wantOpen ? 9 : 4));
        b.legs += (wantLegs - b.legs) * Math.min(1, dt * 3);
        open = b.open * spreadK; ang = S.fold + (ang - S.fold) * b.open;
        e4.set(b.pitch, b.yaw, b.roll); q4.setFromEuler(e4);
        m4.compose(v4.set(b.x, b.y, b.z), q4, ONE); M.mesh.setMatrixAt(b.i, m4);
        M.flap.setXYZW(b.i, ang, wrist * b.open, open, b.legs); M.head.setXYZ(b.i, hp, b.hy, retract);
      }
      for (const m of Object.values(M)) { m.mesh.instanceMatrix.needsUpdate = true; m.flap.needsUpdate = true; m.head.needsUpdate = true; }
    },
    debug: { flocks, birds, takeOff, get perches() { return perches; } },
    dispose() { for (const m of Object.values(M)) { scene.remove(m.mesh); m.mesh.dispose(); m.geo.dispose(); m.mat.dispose(); m.depth.dispose(); } },
  };
}

export function createNature(scene, L, { light = false } = {}) {
  const seed = Math.floor(Math.abs((L.patches?.[0]?.[0] ?? 1) * 1e4)) + L.props.length;
  const rng = mulberry(seed);
  const time = { value: 0 }, wind = { value: 0.8 };
  const playerPos = { value: new THREE.Vector3(0, 0, 0) };
  const playerRadius = { value: 1.45 };
  const geos = shapes(rng);
  const group = new THREE.Group(); scene.add(group);
  const mats = [];
  // the sway: the higher a vertex, the further it bends; a slow gust and a quick flutter that travel across the land
  // plus dynamic interactive foliage displacement when the player walks or runs through vegetation
  const swayMat = (amp) => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide });
    const ampU = { value: amp };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time;
      sh.uniforms.uWind = wind;
      sh.uniforms.uAmp = ampU;
      sh.uniforms.uPlayerPos = playerPos;
      sh.uniforms.uPlayerRadius = playerRadius;
      sh.vertexShader = `uniform float uTime; uniform float uWind; uniform float uAmp; uniform vec3 uPlayerPos; uniform float uPlayerRadius;\n${sh.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          mat3 instM = mat3(instanceMatrix);
          vec3 instP = vec3(instanceMatrix[3]);
          vec3 instS2 = vec3(dot(instM[0], instM[0]), dot(instM[1], instM[1]), dot(instM[2], instM[2]));
          vec2 ip = instP.xz;
          vec3 wp = instP + instM * transformed;
        #else
          vec2 ip = vec2(0.0);
          vec3 wp = transformed;
        #endif
        float bend = transformed.y * transformed.y;
        float wA = sin(uTime * 1.15 - ip.x * 0.11 - ip.y * 0.07);
        float wB = sin(uTime * 2.55 + ip.y * 0.22 - ip.x * 0.17);
        float wC = sin(uTime * 4.9 + ip.x * 1.1 + ip.y * 0.85);
        float gust = wA * 0.52 + wB * 0.30 + wC * 0.18;
        float cross = wB * 0.32 - wC * 0.14;
        vec3 disp = vec3(gust, 0.0, gust * 0.45 + cross * 0.26) * (uWind * uAmp * bend);

        // Player physical foliage displacement: smooth radial vegetation parting in world space
        vec2 diffP = wp.xz - uPlayerPos.xz;
        float distP = length(diffP);
        float maxR = max(0.45, uPlayerRadius);
        float pushNorm = 1.0 - smoothstep(0.14, maxR, distP);
        if (pushNorm > 0.001 && transformed.y > 0.03) {
          float pushFactor = pushNorm * pushNorm * min(transformed.y * 1.55, 0.95);
          vec2 pushDir = distP > 0.001 ? (diffP / distP) : vec2(0.0, 1.0);
          disp.xz += pushDir * pushFactor * 0.88;
          disp.y -= pushFactor * 0.32;
        }
        #ifdef USE_INSTANCING
          transformed += (transpose(instM) * disp) / max(instS2, vec3(1e-6));
        #else
          transformed += disp;
        #endif`);
      // a two-sided material flips the normal on the back face; blades keep their up-facing normal on both sides,
      // or half of every tuft is lit from below and turns black
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n        normal = normalize(vNormal);');
    };
    m.customProgramCacheKey = () => 'fs-sway-v4';
    mats.push(m);
    return m;
  };

  // where a plant may stand
  const fieldX = FIELD_W / 2 + 1.4, fieldZ = FIELD_D / 2 + 1.4;
  const stations = Object.values(L.S ?? {});
  const inPatch = (x, z) => L.patches?.find(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  const free = (x, z, margin = 0.5) => {
    if (Math.abs(x) < fieldX && Math.abs(z) < fieldZ) return false;
    for (const w of L.water) { if (w.r ? Math.hypot(x - w.cx, z - w.cz) < w.r + 1.2 : x > w.x0 - 1.2 && x < w.x1 + 1.2 && z > w.z0 - 1.2 && z < w.z1 + 1.2) return false; }
    for (const p of L.paths) for (let k = 1; k < p.length; k++) if (segDist(x, z, p[k - 1], p[k]) < 1.6) return false;
    for (const b of L.blockers) {
      if (b.r) { if (Math.hypot(x - b.x, z - b.z) < b.r + margin) return false; }
      else { const dx = x - b.x, dz = z - b.z, u = dx * b.c - dz * b.s, v = dx * b.s + dz * b.c; if (Math.abs(u) < b.hw + margin && Math.abs(v) < b.hd + margin) return false; }
    }
    for (const s of stations) if (s && Math.hypot(x - s.x, z - s.z) < (s.r ?? 2) + 1.5) return false;
    return true;
  };
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  const plant = (geo, mat, spots, color) => {
    if (!spots.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
    spots.forEach(([x, z, s, rot, j], i) => {
      dummy.position.set(x, L.ground(x, z) - 0.02, z); dummy.rotation.set(0, rot, 0); dummy.scale.set(s, s * (0.85 + j * 0.3), s); dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tint.set(color(j)); mesh.setColorAt(i, tint);
    });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = !light; mesh.castShadow = false; mesh.frustumCulled = false;
    group.add(mesh); return mesh;
  };

  // grass over the walkable land, thinning towards the edge of the world
  const grassN = light ? 3500 : 16000, grass = [];
  for (let tries = 0; grass.length < grassN && tries < grassN * 6; tries++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 78, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (inPatch(x, z) || !free(x, z)) continue;
    grass.push([x, z, 0.6 + rng() * 0.4, rng() * Math.PI * 2, rng()]);
  }
  const hue = C('#ffffff').lerp(C(L.grass), 0.25);
  plant(geos.grass, swayMat(0.6), grass, (j) => tint.copy(hue).multiplyScalar(0.92 + j * 0.2).offsetHSL((j - 0.5) * 0.03, 0, 0));

  // wildflowers in clumps of a single colour
  if (!light) {
    const palette = ['#ffffff', '#ffd23a', '#c77dff', '#ff8a5c', '#9ad0ff'], flowers = [], colors = [];
    for (let c = 0; c < 70; c++) {
      const a = rng() * Math.PI * 2, d = 10 + Math.sqrt(rng()) * 64, cx = Math.cos(a) * d, cz = Math.sin(a) * d, col = palette[Math.floor(rng() * palette.length)];
      for (let k = 0; k < 14; k++) {
        const x = cx + (rng() - 0.5) * 3, z = cz + (rng() - 0.5) * 3;
        if (inPatch(x, z) || !free(x, z)) continue;
        flowers.push([x, z, 0.8 + rng() * 0.6, rng() * Math.PI * 2, rng()]); colors.push(col);
      }
    }
    let n = 0;
    plant(geos.flower, swayMat(0.5), flowers, () => colors[n++]);
  }

  // the neighbours' crops: the same drawn plants as the farm's own plots (plants.js: crossed cards from each crop's
  // atlas), in rows along each patch's long side, every patch at its own stage (growing, grown or in flower, a few
  // ripe) with a plant here and there a stage behind or ahead. One instanced mesh per crop, swaying in the shader with
  // the field's wind and parting round the farmer. The real spacing is far too dense for the budget, so rows and plants
  // are spread out by one factor for every crop; the patch's tinted ground (world.js) fills between them. Cut stubble
  // stays as short tufts.
  const KIND = { wheat: 'wheat', paddy: 'rice', mustard: 'mustard', sunflower: 'sunflower', sesame: 'sesame', groundnut: 'groundnut', soybean: 'soybean', maize: 'maize', olive: 'olive' };
  const STAGE_MIX = { mustard: [0.1, 0.75, 0.15], sunflower: [0.1, 0.7, 0.2], olive: [0, 0.6, 0.4] }; // shares at stage 1, 2, 3
  const cropPatches = (L.patches ?? []).filter(([, , , , k]) => KIND[k]);
  const realCount = cropPatches.reduce((a, [x0, x1, z0, z1, k]) => { const P = cropLook(KIND[k]); return a + ((x1 - x0) * (z1 - z0)) / (P.row * P.step); }, 0);
  const spread = Math.max(1, Math.sqrt(realCount / (light ? 5000 : 16000)));
  const cropU = { time, wind, player: playerPos };
  const cropSpots = {};
  for (const [x0, x1, z0, z1, k] of cropPatches) {
    const kind = KIND[k], P = cropLook(kind), mix = STAGE_MIX[kind] ?? [0.15, 0.55, 0.3], r0 = rng();
    const st = r0 < mix[0] ? 1 : r0 < mix[0] + mix[1] ? 2 : 3;
    const alongX = x1 - x0 > z1 - z0, rowW = P.row * spread, stepL = P.step * spread;
    const [a0, a1, b0, b1] = alongX ? [x0, x1, z0, z1] : [z0, z1, x0, x1]; // a along the rows, b across them
    for (let b = b0 + rowW / 2; b < b1; b += rowW) {
      const wob = (rng() - 0.5) * rowW * 0.15; // a row is drawn by hand, not with a ruler
      for (let a = a0 + stepL * rng(); a < a1; a += stepL * (0.8 + rng() * 0.4)) {
        const bb = b + wob + (rng() - 0.5) * rowW * 0.12, x = alongX ? a : bb, z = alongX ? bb : a;
        if (Math.hypot(x, z) > 135 || !free(x, z, 0.3)) continue;
        const lag = rng(), s = lag < 0.06 ? Math.max(1, st - 1) : lag > 0.96 ? Math.min(3, st + 1) : st;
        (cropSpots[kind] ??= []).push(x, z, s, 0.85 + rng() * 0.3, rng() * Math.PI * 2, rng());
      }
    }
  }
  const cropSets = [];
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
  for (const [kind, S] of Object.entries(cropSpots)) {
    const { mat, depth, geo, look } = cropMaterials(kind, cropU, { light }), n = S.length / 6;
    const grow = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); geo.setAttribute('aGrow', grow);
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    for (let i = 0; i < n; i++) {
      const j = i * 6, x = S[j], z = S[j + 1], st = S[j + 2], h = look.h[st] * S[j + 3], w = h / look.aspect;
      e4.set((S[j + 5] - 0.5) * 0.1, S[j + 4], (S[j + 3] - 1) * 0.3); q4.setFromEuler(e4);
      m4.compose(v4.set(x, L.ground(x, z) - 0.03, z), q4, s4.set(w, h, w)); mesh.setMatrixAt(i, m4);
      const br = 0.86 + S[j + 5] * 0.24; tint.setRGB(br, br * (0.98 + S[j + 3] * 0.03), br * 0.96); mesh.setColorAt(i, tint);
      grow.setXYZW(i, st, 0, 0, S[j + 5]);
    }
    mesh.customDepthMaterial = depth; mesh.castShadow = false; mesh.receiveShadow = !light; mesh.frustumCulled = false;
    group.add(mesh); cropSets.push({ mat, depth, geo });
  }
  const stubble = [];
  for (const [x0, x1, z0, z1, k] of L.patches ?? []) {
    if (k !== 'stubble') continue;
    const step = light ? 0.9 : 0.6, alongX = x1 - x0 > z1 - z0;
    for (let u = x0 + step / 2; u < x1; u += alongX ? step * 0.7 : step * 1.25) {
      for (let v = z0 + step / 2; v < z1; v += alongX ? step * 1.25 : step * 0.7) {
        const x = u + (rng() - 0.5) * step * 0.3, z = v + (rng() - 0.5) * step * 0.3;
        if (Math.hypot(x, z) > 135 || !free(x, z, 0.3)) continue;
        stubble.push([x, z, 0.85 + rng() * 0.3, rng() * Math.PI * 2, rng()]);
      }
    }
  }
  plant(geos.stubble, swayMat(0), stubble, (j) => tint.setRGB(0.88 + j * 0.24, 0.88 + j * 0.24, 0.88 + j * 0.2));

  // clouds: soft clusters high over the land, drifting with the wind, coloured by the sky
  const puff = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const cloudMat = new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
  const clouds = new THREE.Group(); scene.add(clouds);
  for (let c = 0; c < (light ? 7 : 16); c++) {
    const a = rng() * Math.PI * 2, d = 150 + rng() * 140, cx = Math.cos(a) * d, cz = Math.sin(a) * d, cy = 70 + rng() * 45, w = 30 + rng() * 40;
    for (let k = 0; k < 7; k++) {
      const s = new THREE.Sprite(cloudMat); const r = (rng() - 0.5) * w;
      s.position.set(cx + r, cy + Math.abs(r) * -0.15 + rng() * 6, cz + (rng() - 0.5) * w * 0.5);
      s.scale.setScalar(w * (0.45 + rng() * 0.35)); s.renderOrder = -1; clouds.add(s);
    }
  }
  const cloudCol = new THREE.Color();
  let gustWind = 0.8;

  // ---- ambient butterflies hovering over flowers & crops ----
  const BFLY_COUNT = light ? 6 : 16;
  const bflyGeo = makeButterflyGeo();
  const bflyMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide });
  const bflyMesh = bflyGeo ? new THREE.InstancedMesh(bflyGeo, bflyMat, BFLY_COUNT) : null;
  if (bflyMesh) {
    bflyMesh.castShadow = false; bflyMesh.receiveShadow = false; bflyMesh.frustumCulled = false;
    scene.add(bflyMesh);
  }

  const bflyDummy = new THREE.Object3D();
  const bflyPalette = ['#f4a226', '#fcd34d', '#38bdf8', '#4ade80', '#fb7185', '#e879f9'];
  const butterflies = Array.from({ length: BFLY_COUNT }, (_, i) => {
    const a = rng() * Math.PI * 2, r = 8 + rng() * 45;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    const col = C(bflyPalette[i % bflyPalette.length]);
    if (bflyMesh) bflyMesh.setColorAt(i, col);
    return {
      cx, cz,
      rx: 2.5 + rng() * 2.5, rz: 2.5 + rng() * 2.5,
      speed: 0.8 + rng() * 0.7,
      offset: rng() * 20,
      flapSpeed: 16 + rng() * 6,
    };
  });
  if (bflyMesh?.instanceColor) bflyMesh.instanceColor.needsUpdate = true;

  // ---- birds: crows, mynas, pigeons, egrets and swallows (createBirds above) ----
  const birdLife = createBirds(scene, L, mulberry(seed * 7 + 3), { free, inPatch, light });
  if (import.meta.env?.DEV && typeof window !== 'undefined') window.__fsBirds = birdLife.debug; // for a script looking at them (dev)

  // ---- ambient nocturnal fireflies (জোনাকি পোকা) dancing at dusk and night ----
  const FIREFLY_COUNT = light ? 14 : 36;
  const fireflyGeo = new THREE.SphereGeometry(0.045, 6, 5);
  const fireflyMat = new THREE.MeshBasicMaterial({ color: '#dcfc44', transparent: true, opacity: 0.95 });
  const fireflyMesh = new THREE.InstancedMesh(fireflyGeo, fireflyMat, FIREFLY_COUNT);
  fireflyMesh.castShadow = false; fireflyMesh.receiveShadow = false; fireflyMesh.frustumCulled = false;
  scene.add(fireflyMesh);

  const fireflyDummy = new THREE.Object3D();
  const fireflies = Array.from({ length: FIREFLY_COUNT }, () => {
    const a = rng() * Math.PI * 2, r = 5 + rng() * 45;
    return {
      cx: Math.cos(a) * r,
      cz: Math.sin(a) * r,
      rx: 2.2 + rng() * 3.5,
      rz: 2.2 + rng() * 3.5,
      yBase: 0.45 + rng() * 1.35,
      speed: 0.45 + rng() * 0.5,
      offset: rng() * 20,
      blinkRate: 2.4 + rng() * 2.6,
    };
  });

  // ---- windblown dandelion seeds & golden chaff drifting across the fields ----
  const SEED_COUNT = light ? 28 : 80;
  const seedGeo = (() => {
    const g = new THREE.PlaneGeometry(0.11, 0.065);
    return g;
  })();
  const seedMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false });
  const seedMesh = new THREE.InstancedMesh(seedGeo, seedMat, SEED_COUNT);
  seedMesh.castShadow = false; seedMesh.receiveShadow = false; seedMesh.frustumCulled = false;
  scene.add(seedMesh);

  const seedDummy = new THREE.Object3D();
  const seedPalette = ['#fef9c3', '#fde68a', '#f5d061', '#fffbeb', '#fcd34d'];
  const seeds = Array.from({ length: SEED_COUNT }, (_, i) => {
    seedMesh.setColorAt(i, C(seedPalette[i % seedPalette.length]));
    return {
      ox: (rng() - 0.5) * 34,
      oz: (rng() - 0.5) * 34,
      y: 0.4 + rng() * 3.4,
      speed: 0.9 + rng() * 1.35,
      bob: 1.2 + rng() * 1.6,
      spin: (rng() - 0.5) * 3.4,
      ph: rng() * 20,
      sc: 0.65 + rng() * 0.75,
    };
  });
  if (seedMesh.instanceColor) seedMesh.instanceColor.needsUpdate = true;

  return {
    // w: the weather's wind (0.8 breeze, 2.4 storm); sky: the sky's middle colour; storm 0–1; day: is the sun up; focus: player position; player: optional farmer state
    update(t, dt, w, sky, storm, day, focus, player = null) {
      time.value = t;
      gustWind += (w - gustWind) * Math.min(1, dt * 0.8); wind.value = gustWind;
      if (player) {
        playerPos.value.set(player.x, player.y ?? focus.y, player.z);
        playerRadius.value = player.run ? 1.65 : 1.35;
      } else if (focus) {
        playerPos.value.set(focus.x, focus.y, focus.z);
      }
      clouds.rotation.y += dt * 0.002 * gustWind;
      cloudCol.set(day ? '#ffffff' : '#3a4566').lerp(sky, day ? 0.25 : 0.5).lerp(C('#59636e'), storm * 0.85);
      cloudMat.color.copy(cloudCol); cloudMat.opacity = day ? 0.85 + storm * 0.1 : 0.45;

      // Butterflies update
      if (bflyMesh) {
        butterflies.forEach((b, i) => {
          if (storm > 0.4 || !day) {
            bflyDummy.scale.set(0, 0, 0);
          } else {
            const angle = t * b.speed + b.offset;
            const bx = b.cx + Math.cos(angle) * b.rx + Math.sin(angle * 1.6) * 0.4;
            const bz = b.cz + Math.sin(angle * 1.2) * b.rz + Math.cos(angle * 0.9) * 0.4;
            const gy = L.ground(bx, bz);
            const by = gy + 0.35 + Math.sin(t * 3.2 + b.offset) * 0.22;
            const flap = Math.sin(t * b.flapSpeed + b.offset);
            const yaw = Math.atan2(-Math.sin(angle), Math.cos(angle));

            bflyDummy.position.set(bx, by, bz);
            bflyDummy.rotation.set(Math.sin(t * 2) * 0.2, yaw, 0);
            bflyDummy.scale.set((0.4 + Math.abs(flap) * 0.6) * 0.8, 0.8, 0.8);
          }
          bflyDummy.updateMatrix();
          bflyMesh.setMatrixAt(i, bflyDummy.matrix);
        });
        bflyMesh.instanceMatrix.needsUpdate = true;
      }

      // Birds: they go about by day and settle at night or in a storm; the farmer puts them up
      birdLife.update(t, dt, player ? player.x : focus ? focus.x : 0, player ? player.z : focus ? focus.z : 0, !!player?.run, day && storm < 0.6);

      // Fireflies update: active during dusk, dawn, and night (when !day or in heavy storm)
      if (fireflyMesh) {
        if (day && storm < 0.7) {
          fireflyMesh.visible = false;
        } else {
          fireflyMesh.visible = true;
          fireflies.forEach((f, i) => {
            const angle = t * f.speed + f.offset;
            const fx = f.cx + Math.cos(angle) * f.rx + Math.sin(angle * 2.1) * 0.5;
            const fz = f.cz + Math.sin(angle * 1.3) * f.rz + Math.cos(angle * 1.7) * 0.5;
            const gy = L.ground(fx, fz);
            const fy = gy + f.yBase + Math.sin(t * 1.8 + f.offset) * 0.35;
            const glow = Math.max(0, Math.sin(t * f.blinkRate + f.offset));
            const sz = glow > 0.15 ? (0.6 + glow * 0.8) : 0;

            fireflyDummy.position.set(fx, fy, fz);
            fireflyDummy.scale.setScalar(sz);
            fireflyDummy.updateMatrix();
            fireflyMesh.setMatrixAt(i, fireflyDummy.matrix);
          });
          fireflyMesh.instanceMatrix.needsUpdate = true;
        }
      }

      // Windblown dandelion seeds & golden chaff update
      const seedActive = day && storm < 0.85;
      seedMesh.visible = seedActive;
      if (seedActive) {
        const fx0 = focus ? focus.x : 0, fz0 = focus ? focus.z : 0;
        const wrap = 17;
        seedMat.opacity = 0.76 * (1 - storm * 0.75);
        seeds.forEach((s, i) => {
          s.ox += dt * (0.85 + gustWind * 1.15) * s.speed + Math.sin(t * 0.9 + s.ph) * dt * 0.35;
          s.oz += dt * (0.38 + gustWind * 0.48) * s.speed + Math.cos(t * 1.1 + s.ph) * dt * 0.3;
          if (s.ox > wrap) s.ox -= wrap * 2;
          if (s.ox < -wrap) s.ox += wrap * 2;
          if (s.oz > wrap) s.oz -= wrap * 2;
          if (s.oz < -wrap) s.oz += wrap * 2;
          const sx = fx0 + s.ox, sz = fz0 + s.oz;
          const gy = L.ground(sx, sz);
          const sy = gy + 0.55 + s.y * 0.85 + Math.sin(t * s.bob + s.ph) * 0.45;
          seedDummy.position.set(sx, sy, sz);
          seedDummy.rotation.set(t * s.spin, t * s.spin * 0.7 + s.ph, Math.sin(t * 2.2 + s.ph) * 0.55);
          seedDummy.scale.setScalar(s.sc);
          seedDummy.updateMatrix();
          seedMesh.setMatrixAt(i, seedDummy.matrix);
        });
        seedMesh.instanceMatrix.needsUpdate = true;
      }
    },
    dispose() {
      group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      Object.values(geos).forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); cloudMat.dispose(); puff.dispose();
      cropSets.forEach(({ mat, depth, geo }) => { mat.dispose(); depth.dispose(); geo.dispose(); }); // the atlases are shared with the farm's plots (plants.js caches them)
      if (bflyMesh) { bflyMesh.dispose(); bflyGeo.dispose(); bflyMat.dispose(); scene.remove(bflyMesh); }
      birdLife.dispose();
      if (fireflyMesh) { fireflyMesh.dispose(); fireflyGeo.dispose(); fireflyMat.dispose(); scene.remove(fireflyMesh); }
      seedMesh.dispose(); seedGeo.dispose(); seedMat.dispose(); scene.remove(seedMesh);
      scene.remove(group); scene.remove(clouds);
    },
  };
}

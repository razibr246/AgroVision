// The village's animals, built and moved to look like the real ones: the deshi cow (দেশি গাভী), the zebu ox
// (বলদ), the water buffalo (মহিষ), the Black Bengal goat (ব্ল্যাক বেঙ্গল ছাগল), the donkey, the deshi hen and
// rooster (দেশি মুরগি), the duck (পাতিহাঁস) and the egret (বক).
//
// Looks: every body is one sculpted hide (a loft of rings along the spine), not a pile of balls; the coat is painted
// per vertex from where a point sits on the animal (paler belly, darker legs and muzzle, a cow's patches, a buffalo's
// pale stockings, a donkey's shoulder cross) with slow noise so no two square metres are the same colour, and a
// canvas-drawn short-hair (or feather) texture over it, used as bump too, so the coat catches the light like hair.
// Eyes are dark and glossy under a lid; hooves and horns are hard and shiny; nostrils wet.
//
// Movement: each leg is a chain of groups (shoulder or hip → knee or hock → fetlock), driven by two-bone IK from a
// foot path (game/gait.js): the four-beat lateral-sequence walk, each foot planted while it moves back at the body's
// own speed, so feet do not slide. Grazers wander a few metres round their home between grazing spots, never into
// water, houses or the crop field; they graze with the head down and the jaw working, lift the head to look round
// (at the farmer if near), flick their ears and swish their tails. Hens walk in short bursts, peck and scratch, their
// heads held still and thrust forward as they step; ducks swim and up-end on the pond, and waddle on land; egrets
// stalk, freeze and strike, and fly off if the farmer runs at them.
//
// Materials and textures are made once and shared (cache below); the frame update allocates nothing.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { inWater } from '../layout.js';
import { FIELD_W, FIELD_D, WORLD_R } from '../regions.js';
import { LATERAL, footPath, legIK, reachFor, turnToward, wrapAngle, pickWander, smooth01, clamp } from '../gait.js';

// ---------------------------------------------------------------------------------------------------------------
// small maths: noise for coats, smooth keys for shapes
const hash3 = (x, y, z) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
const fbm = (x, y, z) => vnoise(x, y, z) * 0.55 + vnoise(x * 2.03 + 5.1, y * 2.03, z * 2.03) * 0.3 + vnoise(x * 4.1, y * 4.1 + 2.7, z * 4.1) * 0.15;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const keys = (k) => (u) => { for (let i = 0; i < k.length - 1; i++) if (u <= k[i + 1][0]) { const t = (u - k[i][0]) / (k[i + 1][0] - k[i][0]); return k[i][1] + (k[i + 1][1] - k[i][1]) * (t * t * (3 - 2 * t)); } return k[k.length - 1][1]; };
const ends = (u, a = 0.08, b = 0.08) => Math.sqrt(Math.max(0, 1 - (Math.max(0, a - u) / a) ** 2)) * Math.sqrt(Math.max(0, 1 - (Math.max(0, u - (1 - b)) / b) ** 2));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const seeded = (s) => () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };

// ---------------------------------------------------------------------------------------------------------------
// shared textures and materials
const cache = new Map();
const once = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
function canvasTexture(key, size, draw) {
  return once(key, () => {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    draw(cv.getContext('2d'), size);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  });
}
// short hair lying along the body (the texture's x runs along the spine and down the legs)
const hairTex = () => canvasTexture('hair', 256, (x, S) => {
  const r = seeded(7);
  x.fillStyle = 'rgb(214,214,214)'; x.fillRect(0, 0, S, S);
  for (let k = 0; k < 6500; k++) {
    const px = r() * S, py = r() * S, len = 3 + r() * 8, a = (r() - 0.5) * 0.45, v = (150 + r() * 105) | 0;
    x.strokeStyle = `rgba(${v},${v},${v},0.55)`; x.lineWidth = 0.6 + r() * 0.9;
    for (const ox of [0, -S]) for (const oy of [0, -S, S]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(px + ox + Math.cos(a) * len, py + oy + Math.sin(a) * len); x.stroke(); }
  }
});
// overlapping feathers: rows of rounded tips with a shaft
const featherTex = () => canvasTexture('feather', 256, (x, S) => {
  x.fillStyle = 'rgb(190,190,190)'; x.fillRect(0, 0, S, S);
  const r = seeded(11), step = 16;
  for (let row = -1; row <= S / (step * 0.6) + 1; row++) for (let col = -1; col <= S / step + 1; col++) {
    const cx = col * step + (row % 2) * step * 0.5 + (r() - 0.5) * 2, cy = row * step * 0.6;
    const g = x.createRadialGradient(cx, cy - 4, 1, cx, cy - 2, step * 0.75);
    g.addColorStop(0, 'rgb(255,255,255)'); g.addColorStop(0.75, 'rgb(226,226,226)'); g.addColorStop(1, 'rgb(150,150,150)');
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, step * 0.58, step * 0.62, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(140,140,140,0.5)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(cx, cy - step * 0.5); x.lineTo(cx, cy + step * 0.45); x.stroke();
  }
});
const MAT = {
  hide: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, map: hairTex(), bumpMap: hairTex(), bumpScale: 1.2, roughness: 0.86, sheen: 0.45, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ffffff') }),
  gloss: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, map: hairTex(), bumpMap: hairTex(), bumpScale: 0.8, roughness: 0.48, sheen: 0.6, sheenRoughness: 0.4, sheenColor: new THREE.Color('#ffffff') }),
  feather: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, map: featherTex(), bumpMap: featherTex(), bumpScale: 1.5, roughness: 0.78, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff') }),
  horn: () => new THREE.MeshStandardMaterial({ vertexColors: true, bumpMap: hairTex(), bumpScale: 0.6, roughness: 0.36 }),
  wet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26 }),
  skin: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 }),
  eye: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03 }),
};
const material = (k) => once('m:' + k, MAT[k]);

// ---------------------------------------------------------------------------------------------------------------
// geometry: lofts, lathes and tubes, all with uv in metres (so the hair is the same size everywhere)
const TEX = 3.2; // texture repeats per metre
const X = V(1, 0, 0);
// rings of a superellipse round a path; sec(u) → { c, w, up, dn, pu, pd, narrowTop, bump }; x is the animal's side
function loft(sec, n = 32, m = 24, tex = TEX) {
  const pos = [], uv = [], idx = [], T = V(0, 0, 0), N = V(0, 0, 0), v = V(0, 0, 0);
  let along = 0, prev = null;
  for (let i = 0; i <= n; i++) {
    const u = i / n, s = sec(u), s2 = sec(Math.min(1, u + 1e-3)), s1 = sec(Math.max(0, u - 1e-3));
    T.copy(s2.c).sub(s1.c).normalize(); N.crossVectors(T, X).normalize();
    if (prev) along += s.c.distanceTo(prev); prev = s.c;
    const per = 2 * Math.PI * Math.sqrt((s.w * s.w + ((s.up + s.dn) / 2) ** 2) / 2);
    for (let j = 0; j <= m; j++) {
      const th = (j / m) * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th), top = sn >= 0, p = top ? s.pu : s.pd;
      const x = s.w * Math.sign(c) * Math.pow(Math.abs(c), p) * (top ? 1 - (s.narrowTop ?? 0.12) * sn : 1);
      const y = (top ? s.up : s.dn) * Math.sign(sn) * Math.pow(Math.abs(sn), p);
      v.copy(s.c).addScaledVector(N, y); v.x += x + (s.bump ? s.bump(c, sn) * Math.sign(c) : 0);
      pos.push(v.x, v.y, v.z); uv.push(along * tex, (j / m) * per * tex);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = i * (m + 1) + j, b = a + m + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  return finish(pos, uv, idx);
}
function finish(pos, uv, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a limb as a lathe round a vertical axis at (x, z): profile [[radius, y], ...] bottom to top; depth(y) makes it
// deeper front to back than wide, as legs are
function lathe(profile, x, z, depth = () => 1.2, seg = 14, tex = TEX) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i < profile.length; i++) {
    const [r, y] = profile[i], d = depth(y);
    for (let j = 0; j <= seg; j++) { const a = (j / seg) * Math.PI * 2; pos.push(x + Math.cos(a) * r, y, z + Math.sin(a) * r * d); uv.push(y * tex, (j / seg) * 2 * Math.PI * r * tex); }
  }
  for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  return finish(pos, uv, idx);
}
// a tapered tube along points: radius r0 at the start to r1 at the end; flat squashes it across the curve
function taper(points, r0, r1, seg = 12, rad = 8, tex = TEX, prof = null) {
  const curve = new THREE.CatmullRomCurve3(points), g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position, uv = g.attributes.uv;
  const len = curve.getLength(), ctr = V(0, 0, 0);
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, r = prof ? prof(t) : r0 + (r1 - r0) * t; curve.getPointAt(t, ctr);
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; p.setXYZ(k, ctr.x + (p.getX(k) - ctr.x) * r, ctr.y + (p.getY(k) - ctr.y) * r, ctr.z + (p.getZ(k) - ctr.z) * r); uv.setXY(k, t * len * tex, (j / rad) * 2 * Math.PI * Math.max(r, 0.01) * tex); }
  }
  g.computeVertexNormals();
  return g;
}
const ball = (rx, ry, rz, x, y, z, ws = 16, hs = 12) => { const g = new THREE.SphereGeometry(1, ws, hs); g.scale(rx, ry, rz); g.translate(x, y, z); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * rx * TEX, uv.getY(i) * Math.PI * ry * TEX); return g; };

// A bag of parts for one group: each part is painted by the coat (or a colour, or its own painter) in the animal's
// body coordinates, then all the parts of one material are merged and moved into the group's frame.
function bag(coat) {
  const list = [], c = new THREE.Color(), v = V(0, 0, 0);
  return {
    add(geo, mat, part) {
      const p = geo.attributes.position, a = new Float32Array(p.count * 3), boost = mat === 'hide' || mat === 'gloss' || mat === 'feather' ? coat.boost ?? 1.16 : 1;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        if (typeof part === 'function') part(v, c); else if (part[0] === '#') c.set(part); else coat.color(v, part, c);
        a[i * 3] = c.r * boost; a[i * 3 + 1] = c.g * boost; a[i * 3 + 2] = c.b * boost;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
      list.push([geo, mat]);
      return geo;
    },
    flush(group, pivot = null, shadow = true) {
      const by = new Map();
      for (const [g, m] of list) { if (!by.has(m)) by.set(m, []); by.get(m).push(g); }
      for (const [m, gs] of by) {
        const geo = gs.length === 1 ? gs[0] : mergeGeometries(gs);
        for (const g of gs) if (g !== geo) g.dispose();
        if (pivot) geo.translate(-pivot.x, -pivot.y, -pivot.z);
        const o = new THREE.Mesh(geo, material(m)); o.castShadow = shadow; o.receiveShadow = true; group.add(o);
      }
      list.length = 0;
    },
  };
}
const joint = (parent, at, parentAt) => { const g = new THREE.Group(); g.position.copy(at).sub(parentAt); parent.add(g); return g; };

// ---------------------------------------------------------------------------------------------------------------
// coats
const C = (h) => new THREE.Color(h);
function mammalCoat(o) {
  const base = C(o.base), belly = C(o.belly ?? o.base), dark = C(o.dark ?? o.base), leg = C(o.leg ?? o.dark ?? o.base), muzzle = C(o.muzzle ?? o.dark ?? o.base);
  const patch = o.patch ? C(o.patch.color) : null, face = C(o.face ?? o.base), tmp = new THREE.Color();
  return {
    boost: o.boost, mat: o.mat ?? 'hide',
    color(p, part, c) {
      if (part === 'hoof') { c.set(o.hoof ?? '#231c18'); return; }
      if (part === 'nose') { c.set(o.nostril ?? '#120d0b'); return; }
      if (part === 'eye') { c.set('#0b0806'); return; }
      if (part === 'earIn') { c.set(o.earIn ?? o.belly ?? o.base); return; }
      if (part === 'switch') { c.set(o.switch ?? o.dark ?? o.base); return; }
      if (part === 'muzzle') { c.copy(muzzle); return; }
      if (part === 'udder') { c.set(o.udder ?? '#d9a493'); return; }
      if (part === 'mane') { c.set(o.mane ?? o.dark ?? o.base); return; }
      c.copy(part === 'head' || part === 'ear' ? face : base);
      if (part === 'body' || part === 'neck') c.lerp(belly, sm(o.bellyY + 0.1, o.bellyY - 0.12, p.y) * (o.bellyAmt ?? 0.6));
      if (part === 'leg') c.lerp(belly, (o.innerLeg ?? 0.25) * sm(0.03, 0, Math.abs(p.x) - (o.legX ?? 0.1)));
      if (o.dorsal) c.lerp(dark, sm(o.topY - 0.06, o.topY + 0.02, p.y) * o.dorsal * (part === 'body' || part === 'neck' ? 1 : 0));
      if (o.fore) c.lerp(dark, sm(o.fore[0], o.fore[1], p.z) * o.fore[2] * (part === 'body' || part === 'neck' || part === 'head' ? 1 : 0)); // a darker neck and forequarter
      if (o.cross && part === 'body') c.lerp(dark, sm(0.03, 0.0, Math.abs(p.z - o.cross[0])) * sm(o.cross[1], o.cross[1] + 0.12, p.y)); // the donkey's shoulder cross
      if (part === 'leg') c.lerp(leg, sm(o.legTop, o.legTop - (o.legFade ?? 0.18), p.y) * (o.legAmt ?? 1));
      if (part === 'head' && o.eyeRing) { /* painted where the eyes are, below */ }
      if (patch) {
        const n = fbm(p.x * o.patch.f + 3.7, p.y * o.patch.f, p.z * o.patch.f + 1.3);
        const k = sm(o.patch.thr - 0.015, o.patch.thr + 0.015, n) * (part === 'leg' && p.y < o.legTop - 0.1 ? 0 : 1);
        if (o.patch.under) c.lerp(patch, k); else { tmp.copy(c); c.copy(patch).lerp(tmp, 1 - k); }
      }
      const n = fbm(p.x * 4.2, p.y * 4.2, p.z * 4.2); c.multiplyScalar(1 + (n - 0.5) * (o.mottle ?? 0.22)); // no two hand-widths alike
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// the four-legged animals: one builder, a spec per kind
const BOVINE_HEAD = {
  w: [[0, 0.12], [0.12, 0.145], [0.3, 0.148], [0.55, 0.105], [0.75, 0.095], [0.9, 0.11], [1, 0.1]],
  dn: [[0, 0.1], [0.2, 0.15], [0.45, 0.12], [0.75, 0.085], [0.95, 0.085], [1, 0.08]],
};
const BOVINE = (o = {}) => ({
  body: { z0: -0.9, z1: 0.8, top: [[0, 1.33], [0.08, 1.38], [0.2, 1.43], [0.45, 1.4], [0.7, 1.42], [0.85, 1.47], [1, 1.38]], bot: [[0, 1.0], [0.12, 0.98], [0.24, 1.0], [0.4, 0.84], [0.58, 0.79], [0.78, 0.83], [0.92, 0.86], [1, 0.98]], half: [[0, 0.2], [0.1, 0.27], [0.2, 0.3], [0.32, 0.29], [0.52, 0.36], [0.7, 0.33], [0.88, 0.27], [1, 0.2]], hooks: 0.035, pins: 0.03 },
  shoulder: { y: 1.1, z: 0.55, r: [0.1, 0.24, 0.17] },
  fore: { x: 0.145, z: 0.52, py: 0.95, ky: 0.42, fy: 0.12, r: { top: 0.1, arm: 0.075, knee: 0.054, cannon: 0.04, fet: 0.05, pastern: 0.042 } },
  hind: { x: 0.15, z: -0.6, py: 1.0, hy: 0.48, hz: -0.13, fy: 0.12, r: { thigh: [0.12, 0.34, 0.17], gaskin: 0.085, hock: 0.05, cannon: 0.04, fet: 0.05, pastern: 0.042 } },
  hoof: { h: 0.07, r: 0.05, cloven: true },
  neck: { base: [1.18, 0.66], poll: [1.42, 1.16], w: [0.21, 0.11], up: [0.27, 0.12], dn: [0.3, 0.14], dew: 0.05 },
  head: { len: 0.5, tilt: 0.95, up: 0.075, ...BOVINE_HEAD, muzzle: [0.1, 0.07, 0.04], eye: [0.16, 0.03, 0.15, 0.03] },
  ears: { at: [0.13, 0.03, -0.02], len: 0.2, w: 0.07, out: 0.25, droop: 0.3 },
  tail: { at: [1.36, -0.86], len: 0.78, r0: 0.04, r1: 0.015, sw: [0.05, 0.16] },
  walk: { speed: 0.75, period: 1.3, duty: 0.66, lift: 0.1 },
  ...o,
});
const SPECS = {
  cow: () => BOVINE({ scale: 0.8, udder: true, hump: [0.11, 0.08, 0.16, 1.42, 0.5], horns: 'short' }),
  ox: () => BOVINE({ scale: 0.92, hump: [0.12, 0.17, 0.2, 1.4, 0.48], horns: 'zebu', dewlap: 0.11 }),
  buffalo: () => BOVINE({
    scale: 0.95,
    body: { z0: -0.92, z1: 0.82, top: [[0, 1.3], [0.08, 1.35], [0.22, 1.38], [0.45, 1.36], [0.7, 1.38], [0.86, 1.42], [1, 1.34]], bot: [[0, 0.98], [0.12, 0.9], [0.26, 0.86], [0.42, 0.72], [0.6, 0.68], [0.8, 0.74], [0.92, 0.8], [1, 0.94]], half: [[0, 0.22], [0.1, 0.31], [0.22, 0.35], [0.36, 0.34], [0.54, 0.42], [0.72, 0.39], [0.88, 0.31], [1, 0.22]], hooks: 0.05, pins: 0.04 },
    fore: { x: 0.17, z: 0.52, py: 0.88, ky: 0.38, fy: 0.11, r: { top: 0.12, arm: 0.09, knee: 0.062, cannon: 0.048, fet: 0.058, pastern: 0.05 } },
    hind: { x: 0.18, z: -0.6, py: 0.95, hy: 0.44, hz: -0.12, fy: 0.11, r: { thigh: [0.14, 0.34, 0.19], gaskin: 0.1, hock: 0.058, cannon: 0.048, fet: 0.058, pastern: 0.05 } },
    hoof: { h: 0.075, r: 0.062, cloven: true },
    neck: { base: [1.12, 0.66], poll: [1.26, 1.2], w: [0.24, 0.13], up: [0.27, 0.13], dn: [0.3, 0.15], dew: 0.0 },
    head: { len: 0.56, tilt: 0.7, up: 0.08, w: [[0, 0.13], [0.12, 0.16], [0.3, 0.16], [0.55, 0.12], [0.78, 0.115], [0.92, 0.14], [1, 0.12]], dn: [[0, 0.11], [0.2, 0.16], [0.45, 0.13], [0.75, 0.1], [0.95, 0.1], [1, 0.09]], muzzle: [0.13, 0.08, 0.04], eye: [0.17, 0.035, 0.16, 0.032] },
    ears: { at: [0.15, -0.02, -0.04], len: 0.2, w: 0.075, out: 0.15, droop: 0.55 },
    horns: 'buffalo', tail: { at: [1.32, -0.88], len: 0.72, r0: 0.04, r1: 0.016, sw: [0.045, 0.12] },
    walk: { speed: 0.65, period: 1.45, duty: 0.68, lift: 0.09 },
  }),
  goat: () => ({
    scale: 1,
    body: { z0: -0.32, z1: 0.3, top: [[0, 0.5], [0.1, 0.535], [0.25, 0.55], [0.5, 0.54], [0.75, 0.545], [0.9, 0.565], [1, 0.52]], bot: [[0, 0.39], [0.12, 0.37], [0.3, 0.31], [0.5, 0.28], [0.7, 0.3], [0.88, 0.34], [1, 0.41]], half: [[0, 0.06], [0.1, 0.09], [0.25, 0.1], [0.45, 0.125], [0.7, 0.115], [0.88, 0.09], [1, 0.06]], hooks: 0.012, pins: 0.012 },
    shoulder: { y: 0.42, z: 0.2, r: [0.04, 0.09, 0.065] },
    fore: { x: 0.055, z: 0.2, py: 0.36, ky: 0.17, fy: 0.045, r: { top: 0.04, arm: 0.03, knee: 0.022, cannon: 0.015, fet: 0.019, pastern: 0.016 } },
    hind: { x: 0.06, z: -0.22, py: 0.4, hy: 0.2, hz: -0.06, fy: 0.045, r: { thigh: [0.05, 0.13, 0.07], gaskin: 0.034, hock: 0.02, cannon: 0.015, fet: 0.019, pastern: 0.016 } },
    hoof: { h: 0.028, r: 0.019, cloven: true },
    neck: { base: [0.46, 0.22], poll: [0.68, 0.37], w: [0.075, 0.04], up: [0.09, 0.045], dn: [0.1, 0.05], dew: 0 },
    head: { len: 0.165, tilt: 1.2, up: 0.03, w: [[0, 0.044], [0.15, 0.054], [0.35, 0.05], [0.6, 0.03], [0.85, 0.02], [1, 0.016]], dn: [[0, 0.04], [0.2, 0.052], [0.5, 0.036], [0.8, 0.024], [1, 0.018]], muzzle: [0.017, 0.014, 0.009], eye: [0.05, 0.016, 0.06, 0.012] },
    ears: { at: [0.04, -0.02, 0.02], len: 0.11, w: 0.03, out: 0.45, droop: 0.95, roll: 1.15, leaf: true },
    horns: 'goat', beard: true, tail: { at: [0.52, -0.31], len: 0.1, r0: 0.018, r1: 0.008, up: true },
    walk: { speed: 0.5, period: 0.8, duty: 0.64, lift: 0.045 },
  }),
  donkey: () => ({
    scale: 1,
    body: { z0: -0.5, z1: 0.48, top: [[0, 0.94], [0.1, 1.0], [0.25, 1.01], [0.5, 0.98], [0.75, 0.98], [0.9, 1.0], [1, 0.95]], bot: [[0, 0.74], [0.12, 0.7], [0.3, 0.64], [0.5, 0.6], [0.72, 0.61], [0.9, 0.66], [1, 0.74]], half: [[0, 0.11], [0.1, 0.17], [0.25, 0.19], [0.5, 0.215], [0.72, 0.2], [0.9, 0.16], [1, 0.11]], hooks: 0.015, pins: 0.012 },
    shoulder: { y: 0.8, z: 0.33, r: [0.07, 0.16, 0.11] },
    fore: { x: 0.1, z: 0.32, py: 0.68, ky: 0.33, fy: 0.09, r: { top: 0.07, arm: 0.05, knee: 0.036, cannon: 0.026, fet: 0.034, pastern: 0.03 } },
    hind: { x: 0.105, z: -0.36, py: 0.74, hy: 0.37, hz: -0.09, fy: 0.09, r: { thigh: [0.085, 0.24, 0.12], gaskin: 0.06, hock: 0.035, cannon: 0.026, fet: 0.034, pastern: 0.03 } },
    hoof: { h: 0.06, r: 0.036, cloven: false },
    neck: { base: [0.88, 0.4], poll: [1.18, 0.72], w: [0.12, 0.07], up: [0.18, 0.08], dn: [0.2, 0.1], dew: 0, mane: true },
    head: { len: 0.46, tilt: 1.05, up: 0.06, w: [[0, 0.085], [0.15, 0.1], [0.35, 0.095], [0.6, 0.07], [0.85, 0.068], [1, 0.06]], dn: [[0, 0.08], [0.2, 0.12], [0.45, 0.09], [0.75, 0.07], [0.95, 0.07], [1, 0.06]], muzzle: [0.075, 0.06, 0.03], eye: [0.098, 0.03, 0.14, 0.022] },
    ears: { at: [0.05, 0.06, -0.03], len: 0.27, w: 0.055, out: -0.35, droop: -1.62, long: true },
    tail: { at: [0.94, -0.49], len: 0.5, r0: 0.028, r1: 0.012, sw: [0.035, 0.1] },
    walk: { speed: 0.8, period: 1.05, duty: 0.64, lift: 0.075 },
  }),
};
const COATS = {
  cow: [
    { base: '#8a4426', belly: '#b88058', dark: '#4e2414', leg: '#5a2c1a', muzzle: '#2c2220', bellyY: 0.95, topY: 1.42, dorsal: 0.25, legTop: 0.42, hoof: '#2a201b', switch: '#2a1610', earIn: '#c49a84', udder: '#c98f7c' }, // Red Chittagong
    { base: '#ecebe6', belly: '#f6f5f1', dark: '#1c1918', leg: '#e2e0da', muzzle: '#d7a89c', bellyY: 0.95, topY: 1.42, legTop: 0.3, patch: { color: '#1c1918', f: 2.4, thr: 0.52 }, switch: '#f1efe9', earIn: '#e8c4b8', udder: '#e6b4a6', nostril: '#6a4a44' },
    { base: '#c7a27a', belly: '#e9d8bd', dark: '#7a5a3a', leg: '#a08060', muzzle: '#2e2624', bellyY: 0.95, topY: 1.42, dorsal: 0.2, legTop: 0.4, fore: [0.3, 0.9, 0.18], switch: '#1e1816', earIn: '#d8b8a0' },
    { base: '#d9d4ca', belly: '#ece8de', dark: '#6f6a64', leg: '#c9c3b8', muzzle: '#2e2a28', bellyY: 0.95, topY: 1.42, fore: [0.3, 1.0, 0.35], legTop: 0.3, switch: '#2a2624', earIn: '#d8c0b0' }, // the white-grey deshi cow
    { base: '#262120', belly: '#3a322e', dark: '#141110', leg: '#1e1a18', muzzle: '#5a4a44', bellyY: 0.95, topY: 1.42, legTop: 0.4, switch: '#0e0c0b', earIn: '#5a4840' },
  ],
  ox: [{ base: '#d6d1c6', belly: '#ece8de', dark: '#5f5a54', leg: '#bdb6aa', muzzle: '#2a2624', bellyY: 0.95, topY: 1.42, fore: [0.2, 0.95, 0.55], legTop: 0.36, legAmt: 0.6, switch: '#1a1716', earIn: '#d0b8a8' }],
  buffalo: [{ base: '#2e2c2e', belly: '#3d3a3b', dark: '#1d1b1c', leg: '#77716c', muzzle: '#151313', bellyY: 0.9, topY: 1.38, legTop: 0.42, legFade: 0.1, mottle: 0.3, hoof: '#1a1716', switch: '#141212', earIn: '#4a4240', mat: 'gloss', boost: 1.1 }],
  goat: [
    { base: '#161316', belly: '#1d191b', dark: '#0c0a0b', leg: '#141114', muzzle: '#1c1818', bellyY: 0.34, topY: 0.55, legTop: 0.16, hoof: '#151212', earIn: '#3a2c2c', mat: 'gloss', mottle: 0.35, boost: 1.05 }, // Black Bengal
    { base: '#6e4a30', belly: '#9a7656', dark: '#2a1c14', leg: '#3a281c', muzzle: '#2a1e18', bellyY: 0.34, topY: 0.55, dorsal: 0.8, legTop: 0.18, earIn: '#a07860', mat: 'gloss' },
    { base: '#ebe6dc', belly: '#f4f0e8', dark: '#a89a88', leg: '#e0d8cc', muzzle: '#c8a89c', bellyY: 0.34, topY: 0.55, legTop: 0.14, earIn: '#e0b8a8', nostril: '#5a4440' },
  ],
  donkey: [{ base: '#8a8078', belly: '#d8d0c4', dark: '#3a3430', leg: '#7a7068', muzzle: '#dcd4ca', face: '#8a8078', bellyY: 0.68, topY: 1.0, dorsal: 0.9, cross: [0.33, 0.86], legTop: 0.3, legAmt: 0.4, switch: '#2a2420', earIn: '#d8d0c4', mane: '#2e2824', hoof: '#2a2420' }],
};
const herd = { cow: 0, ox: 0, buffalo: 0, goat: 0, donkey: 0 };

// The neck as a soft joint: each vertex turns with the head by a weight that grows from 0 inside the withers to 1 at
// the poll, so the neck curves down to the grass the way a real one does. Positions and normals are rewritten in
// place (no allocation) only when the head has moved.
function makeBend(group, pivot, poll) {
  const dir = poll.clone().sub(pivot), len = dir.length(); dir.normalize();
  const parts = group.children.map((m) => {
    m.frustumCulled = false;
    const g = m.geometry, p = g.attributes.position, n = g.attributes.normal, base = p.array.slice(), nb = n.array.slice(), w = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) { const t = ((base[i * 3] - pivot.x) * dir.x + (base[i * 3 + 1] - pivot.y) * dir.y + (base[i * 3 + 2] - pivot.z) * dir.z) / len; w[i] = smooth01((t + 0.15) / 1.0); }
    return { p, n, base, nb, w };
  });
  return { parts, px: pivot.x, py: pivot.y, pz: pivot.z, rx: 0, ry: 0 };
}
function bendNeck(B, rx, ry) {
  if (!B || (Math.abs(rx - B.rx) < 1e-4 && Math.abs(ry - B.ry) < 1e-4)) return;
  B.rx = rx; B.ry = ry;
  for (const P of B.parts) {
    const a = P.p.array, na = P.n.array, b = P.base, nb = P.nb, w = P.w;
    for (let i = 0, j = 0; i < w.length; i++, j += 3) {
      const ax = rx * w[i], ay = ry * w[i], cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
      // Euler XYZ as three.js applies it: turn about y, then about x
      let x = b[j] - B.px, y = b[j + 1] - B.py, z = b[j + 2] - B.pz;
      let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      a[j] = B.px + x1; a[j + 1] = B.py + y * cx - z1 * sx; a[j + 2] = B.pz + y * sx + z1 * cx;
      x = nb[j]; y = nb[j + 1]; z = nb[j + 2]; x1 = x * cy + z * sy; z1 = -x * sy + z * cy;
      na[j] = x1; na[j + 1] = y * cx - z1 * sx; na[j + 2] = y * sx + z1 * cx;
    }
    P.p.needsUpdate = true; P.n.needsUpdate = true;
  }
}

function quadruped(type) {
  const sp = SPECS[type](), list = COATS[type], coat = mammalCoat(list[herd[type]++ % list.length]);
  const hide = coat.mat, root = new THREE.Group(), w = new THREE.Group(); w.scale.setScalar(sp.scale); root.add(w);
  const O = V(0, 0, 0);
  const torso = new THREE.Group(); w.add(torso); // bobs and rolls with the walk
  const barrel = new THREE.Group(); torso.add(barrel); // breathes
  // ---- the barrel, rump (u=0) to brisket (u=1): a straight back, hook and pin bones, a belly that hangs ----
  const B = sp.body, top = keys(B.top), bot = keys(B.bot), half = keys(B.half);
  const tb = bag(coat);
  tb.add(loft((u) => {
    const e = ends(u, 0.07, 0.09), t = top(u), d = bot(u), mid = (t + d) / 2;
    const hk = Math.exp(-(((u - 0.2) / 0.05) ** 2)) * B.hooks, pn = Math.exp(-(((u - 0.05) / 0.035) ** 2)) * B.pins;
    return { c: V(0, mid, B.z0 + u * (B.z1 - B.z0)), w: half(u) * e, up: (t - mid) * e, dn: (mid - d) * e, pu: 0.55, pd: 0.8, narrowTop: 0.18, bump: (c, s) => (s > 0.4 && s < 0.95 ? (hk + pn) * e : 0) };
  }, 44, 30), hide, 'body');
  if (sp.hump) { const [rx, ry, rz, y, z] = sp.hump; tb.add(ball(rx, ry, rz, 0, y, z), hide, 'body'); }
  for (const s of [-1, 1]) { const S = sp.shoulder; tb.add(ball(S.r[0] * 0.8, S.r[1], S.r[2], s * (half(0.82) - S.r[0] * 0.95), S.y, S.z, 14, 10), hide, 'body'); } // shoulder and upper arm
  if (sp.udder) {
    tb.add(ball(0.12, 0.09, 0.14, 0, 0.92, -0.42), 'skin', 'udder');
    for (const [x, z] of [[-0.05, -0.36], [0.05, -0.36], [-0.05, -0.48], [0.05, -0.48]]) tb.add(lathe([[0.001, 0.79], [0.011, 0.795], [0.014, 0.84], [0.02, 0.87]], x, z, () => 1, 8), 'skin', 'udder');
  }
  tb.flush(barrel);

  // ---- legs: shoulder/hip → knee/hock → fetlock; each a group so the walk can bend it ----
  const legs = {}, Hf = sp.hoof;
  const hoofGeo = (lb, x, z) => {
    if (Hf.cloven) for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(Hf.r * 0.5, Hf.r * 0.62, Hf.h, 10, 1); g.scale(1, 1, 1.35); g.translate(x + s * Hf.r * 0.42, Hf.h / 2, z + Hf.r * 0.18); lb.add(g, 'wet', 'hoof'); }
    else { const g = new THREE.CylinderGeometry(Hf.r * 0.95, Hf.r * 1.15, Hf.h, 14, 1); g.scale(1, 1, 1.15); g.translate(x, Hf.h / 2, z + Hf.r * 0.12); lb.add(g, 'wet', 'hoof'); }
  };
  const lowerLeg = (lb, pb, x, z, ky, fy, r, knee) => {
    // knee (or hock) down the cannon to the fetlock; then the pastern to the hoof
    lb.add(lathe([[r.fet * 0.8, fy - 0.005], [r.fet, fy + 0.02], [r.fet * 0.9, fy + 0.05], [r.cannon, fy + 0.09], [r.cannon, ky - 0.08], [knee, ky - 0.02], [knee * 1.02, ky + 0.02], [knee * 0.9, ky + 0.05]], x, z, (y) => (y < fy + 0.06 ? 1.15 : 1.3)), hide, 'leg');
    pb.add(lathe([[Hf.r * 0.95, Hf.h * 0.8], [r.pastern, Hf.h + 0.01], [r.pastern * 0.92, (Hf.h + fy) / 2], [r.fet * 0.85, fy + 0.01]], x, z + 0.005, () => 1.15), hide, 'leg');
    hoofGeo(pb, x, z);
    if (Hf.cloven) for (const s of [-1, 1]) pb.add(ball(r.pastern * 0.3, r.pastern * 0.35, r.pastern * 0.3, x + s * r.pastern * 0.45, fy - 0.01, z - r.fet * 0.95, 8, 6), 'wet', 'hoof'); // dewclaws
  };
  for (const [key, s] of [['fL', -1], ['fR', 1]]) {
    const F = sp.fore, x = s * F.x, P = V(x, F.py, F.z), K = V(x, F.ky, F.z), Fe = V(x, F.fy, F.z);
    const up = joint(torso, P, O), knee = joint(up, K, P), pas = joint(knee, Fe, K);
    const ub = bag(coat), lb = bag(coat), pb = bag(coat);
    ub.add(lathe([[F.r.knee * 0.9, F.ky - 0.02], [F.r.arm * 0.82, F.ky + 0.12], [F.r.arm, (F.ky + F.py) / 2], [F.r.top, F.py - 0.03], [F.r.top * 0.95, F.py + 0.06], [F.r.top * 0.5, F.py + 0.12]], x, F.z, (y) => 1.15 + sm(F.ky, F.py, y) * 0.5), hide, 'leg');
    lowerLeg(lb, pb, x, F.z, F.ky, F.fy, F.r, F.r.knee);
    ub.flush(up, P); lb.flush(knee, K); pb.flush(pas, Fe);
    legs[key] = { up, knee, pas, a: F.py - F.ky, b: F.ky, bend: 1, py: F.py, nz: 0, phase: s < 0 ? LATERAL.LF : LATERAL.RF };
  }
  for (const [key, s] of [['bL', -1], ['bR', 1]]) {
    const Hd = sp.hind, x = s * Hd.x, P = V(x, Hd.py, Hd.z), K = V(x, Hd.hy, Hd.z + Hd.hz), Fe = V(x, Hd.fy, Hd.z + Hd.hz);
    const up = joint(torso, P, O), knee = joint(up, K, P), pas = joint(knee, Fe, K);
    const ub = bag(coat), lb = bag(coat), pb = bag(coat);
    const [tx, ty, tz] = Hd.r.thigh;
    ub.add(ball(tx * 0.85, ty, tz, x * 0.9, Hd.py - ty * 0.25, Hd.z + 0.01, 18, 14), hide, 'leg'); // the round of the thigh
    ub.add(taper([V(x, Hd.py - ty * 0.4, Hd.z - 0.01), V(x, (Hd.py + Hd.hy) / 2 + 0.02, Hd.z + Hd.hz * 0.6), V(x, Hd.hy + 0.03, K.z - 0.005)], Hd.r.gaskin, Hd.r.hock * 1.05, 10, 12), hide, 'leg');
    lowerLeg(lb, pb, x, K.z, Hd.hy, Hd.fy, Hd.r, Hd.r.hock);
    lb.add(ball(Hd.r.hock * 0.75, Hd.r.hock * 1.1, Hd.r.hock * 0.8, x, Hd.hy + 0.02, K.z - Hd.r.hock * 0.9, 10, 8), hide, 'leg'); // the point of the hock
    ub.flush(up, P); lb.flush(knee, K); pb.flush(pas, Fe);
    legs[key] = { up, knee, pas, a: P.distanceTo(K), b: Hd.hy, bend: -1, py: Hd.py, nz: Hd.hz, phase: s < 0 ? LATERAL.LH : LATERAL.RH };
  }
  for (const L of Object.values(legs)) { const [u, l] = legIK(L.a, L.b, L.nz, -L.py, L.bend); L.u0 = u; L.l0 = l; }

  // ---- the neck and head: a pivot at the base of the neck (it lowers to graze), the skull nods at the poll ----
  const N = sp.neck, Hh = sp.head, nb = V(0, N.base[0], N.base[1]), poll = V(0, N.poll[0], N.poll[1]);
  const head = joint(torso, nb, O), skull = joint(head, poll, nb);
  const hb = bag(coat), sb = bag(coat);
  // the neck starts well back inside the withers and chest, so no rim shows; it bends along its length when the
  // head moves (bendNeck), instead of swinging out of the body as one stiff piece
  hb.add(loft((uu) => {
    const u = -0.35 + uu * 1.35, k = u < 0 ? 1 + u * 1.1 : 1, uc = Math.max(0, u);
    const c = nb.clone().lerp(poll, u); c.y -= Math.sin(uc * Math.PI) * 0.02 * (N.up[0] / 0.27); c.z -= uc * (1 - uc) * 0.06 * (N.w[0] / 0.21);
    const e = (uu < 0.5 ? 1 : ends(uu, 0.001, 0.1)) * k;
    return { c, w: (N.w[0] + (N.w[1] - N.w[0]) * uc) * e, up: (N.up[0] + (N.up[1] - N.up[0]) * uc) * e * (0.86 + 0.14 * sm(0, 0.35, u)), dn: (N.dn[0] + (N.dn[1] - N.dn[0]) * uc + Math.sin(uc * Math.PI) * N.dew) * e, pu: 0.75, pd: 1.05, narrowTop: 0.2 };
  }, 30, 24), hide, 'neck');
  if (sp.dewlap) hb.add(ball(0.025, sp.dewlap * 1.3, sp.dewlap * 2.8, 0, 0, 0).rotateX(-0.55).translate(0, nb.y - 0.17, nb.z + 0.16), hide, 'neck');
  if (N.mane) for (let k = 0; k <= 10; k++) { const t = k / 10, c = nb.clone().lerp(poll, t); hb.add(ball(0.018, 0.06 - t * 0.015, 0.05, 0, c.y + N.up[0] * (1 - t) + N.up[1] * t - 0.01, c.z - 0.01), hide, 'mane'); }
  // the skull: poll (z=0) to muzzle (z=len), tipped nose-down by `tilt`
  const SK = new THREE.Matrix4().compose(poll, new THREE.Quaternion().setFromEuler(new THREE.Euler(Hh.tilt, 0, 0)), V(1, 1, 1));
  const sw = keys(Hh.w), sdn = keys(Hh.dn), L0 = Hh.len;
  sb.add(loft((u) => {
    const e = ends(u, 0.06, 0.05), orb = Math.exp(-(((u - 0.3) / 0.07) ** 2)) * sw(0.3) * 0.17;
    return { c: V(0, 0, u * L0), w: sw(u) * e, up: Hh.up * e, dn: sdn(u) * e, pu: 0.45, pd: 0.8, narrowTop: 0.05, bump: (c, s) => (s > -0.2 && s < 0.6 ? orb : 0) };
  }, 30, 24).applyMatrix4(SK), hide, 'head');
  const [mw, mh, md] = Hh.muzzle;
  sb.add(ball(mw, mh, md, 0, -0.005 * (L0 / 0.5), L0 * 0.95).applyMatrix4(SK), 'wet', 'muzzle');
  for (const s of [-1, 1]) {
    sb.add(ball(mw * 0.22, mh * 0.2, md * 0.3, s * mw * 0.42, mh * 0.28, L0 * 0.95 + md * 0.85).rotateZ(0).applyMatrix4(SK), 'wet', 'nose');
    const [ex, ey, ez, er] = Hh.eye;
    sb.add(ball(er * 0.6, er * 0.8, er * 0.95, s * ex, ey, ez, 12, 10).applyMatrix4(SK), 'eye', 'eye');
    const lid = new THREE.SphereGeometry(er * 1.04, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.32); lid.scale(0.6, 0.8, 0.98); lid.rotateZ(-s * 0.35); lid.translate(s * ex, ey, ez);
    sb.add(lid.applyMatrix4(SK), hide, 'head');
  }
  // the lower jaw (it works while grazing and chewing the cud)
  const jawAt = V(0, -sdn(0.25) * 0.55, L0 * 0.25).applyMatrix4(SK), jaw = joint(skull, jawAt, poll), jb = bag(coat);
  jb.add(loft((u) => { const uu = 0.25 + u * 0.68, e = ends(u, 0.1, 0.12); return { c: V(0, -sdn(uu) * 0.62, uu * L0), w: sw(uu) * 0.72 * e, up: sdn(uu) * 0.32 * e, dn: sdn(uu) * 0.42 * e, pu: 0.6, pd: 0.8 }; }, 16, 14).applyMatrix4(SK), hide, 'head');
  if (sp.beard) { const b0 = V(0, -sdn(0.75) * 0.95, L0 * 0.75).applyMatrix4(SK); jb.add(taper([b0, b0.clone().add(V(0, -0.03, -0.006)), b0.clone().add(V(0, -0.06, -0.016))], 0.014, 0.004, 8, 8), hide, 'switch'); } // the beard hangs straight down from the chin
  jb.flush(jaw, jawAt);
  // ears: out to the side under the horns, a paler inside
  const E = sp.ears, ears = [];
  for (const s of [-1, 1]) {
    const at = poll.clone().add(V(s * E.at[0], E.at[1], E.at[2])), ear = joint(skull, at, poll), eb = bag(coat);
    const shape = (k) => loft((u) => { const e = ends(u, 0.05, 0.12); const wv = E.w * Math.pow(Math.sin(Math.PI * Math.min(1, u * (E.leaf ? 0.85 : 0.9) + (E.leaf ? 0.15 : 0.1))), E.leaf ? 0.9 : 0.6) * (E.long ? 1 - u * 0.45 : E.leaf ? 1 - u * 0.25 : 1) * e * k; return { c: V(0, 0, u * E.len), w: wv, up: 0.01 * e * (k < 1 ? 0.6 : 1), dn: 0.008 * e, pu: 0.8, pd: 0.8, narrowTop: 0, bump: (c, sn) => (sn > 0 ? -wv * 0.25 * Math.abs(sn) : 0) }; }, 14, 12);
    const M = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(E.droop, s * (Math.PI / 2 - E.out), s * (E.roll ?? 0), 'YXZ')); // roll turns a hanging ear's face outward
    if (E.long) M.makeRotationFromEuler(new THREE.Euler(E.droop, s * 0.25, s * 0.15, 'YXZ'));
    eb.add(shape(1).applyMatrix4(M).translate(at.x, at.y, at.z), hide, 'ear');
    eb.add(shape(0.8).translate(0, E.leaf ? -0.005 : 0.006, 0).applyMatrix4(M).translate(at.x, at.y, at.z), 'skin', 'earIn');
    eb.flush(ear, at);
    ears.push(ear);
  }
  // horns
  if (sp.horns) for (const s of [-1, 1]) {
    let pts, r0, r1;
    if (sp.horns === 'buffalo') { // heavy, ridged, out to the side then swept back and up in a crescent
      const o = poll.clone().add(V(s * 0.1, 0.06, 0.02));
      pts = [o, o.clone().add(V(s * 0.15, 0.02, -0.03)), o.clone().add(V(s * 0.3, 0.05, -0.12)), o.clone().add(V(s * 0.39, 0.12, -0.27)), o.clone().add(V(s * 0.37, 0.22, -0.42)), o.clone().add(V(s * 0.27, 0.3, -0.5))]; r0 = 0.058; r1 = 0.011; // the swamp buffalo's wide crescent, back and up
    } else if (sp.horns === 'goat') { const o = poll.clone().add(V(s * 0.02, 0.008, 0.03)); pts = [o, o.clone().add(V(s * 0.006, 0.035, -0.006)), o.clone().add(V(s * 0.014, 0.06, -0.032)), o.clone().add(V(s * 0.02, 0.068, -0.068))]; r0 = 0.011; r1 = 0.0025; } // up, then back
    else { const o = poll.clone().add(V(s * 0.08, 0.05, -0.03)), L = sp.horns === 'zebu' ? 1.7 : 1; pts = [o, o.clone().add(V(s * 0.07 * L, 0.03 * L, -0.01)), o.clone().add(V(s * 0.12 * L, 0.1 * L, 0.0)), o.clone().add(V(s * 0.11 * L, 0.18 * L, 0.04 * L))]; r0 = 0.03; r1 = 0.006; }
    const start = pts[0].clone(), span = pts[pts.length - 1].distanceTo(start), root0 = C(sp.horns === 'buffalo' ? '#2a2624' : sp.horns === 'goat' ? '#4a4038' : '#d6cab0'), tip = C(sp.horns === 'buffalo' ? '#141212' : sp.horns === 'goat' ? '#221c18' : '#2e2620');
    const geo = taper(pts, r0, r1, 16, 10, TEX * 3);
    if (sp.horns === 'buffalo') { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const ring = Math.floor(i / 11); p.setY(i, p.getY(i) + Math.sin(ring * 2.2) * 0.003); } geo.computeVertexNormals(); }
    sb.add(geo, 'horn', (v, c) => c.copy(root0).lerp(tip, sm(0.4, 1, v.distanceTo(start) / span)));
  }
  const neckG = new THREE.Group(); torso.add(neckG); hb.flush(neckG); sb.flush(skull, poll);
  const neckBend = makeBend(neckG, nb, poll);
  // where the muzzle is, and the head angle that puts it on the grass
  const muz = V(0, -0.02, L0).applyMatrix4(SK);
  const dz = muz.z - nb.z, dy = muz.y - nb.y, R = Math.hypot(dz, dy), a0 = Math.atan2(-dy, dz), want = Math.asin(clamp((nb.y - 0.03) / R, -1, 1));
  const grazeAngle = clamp(want - a0, 0.3, 1.5);

  // ---- the tail: three joints from the tail head down to the switch ----
  const T = sp.tail, tails = [];
  {
    const at = V(0, T.at[0], T.at[1]);
    let parent = torso, pAt = O, cur = at.clone();
    const segs = T.up ? 1 : 3;
    for (let k = 0; k < segs; k++) {
      const j = joint(parent, cur, pAt), b = bag(coat), l = T.len / segs;
      const t0 = k / segs, t1 = (k + 1) / segs, r0 = T.r0 + (T.r1 - T.r0) * t0, r1 = T.r0 + (T.r1 - T.r0) * t1;
      const end = T.up ? cur.clone().add(V(0, 0.06, -0.07)) : cur.clone().add(V(0, -l, k === 0 ? -0.05 : 0.005));
      const mid = T.up ? cur.clone().add(V(0, 0.04, -0.03)) : cur.clone().lerp(end, 0.5).add(V(0, 0, k === 0 ? -0.03 : 0));
      b.add(taper([cur.clone(), mid, end], r0, r1, 8, 8), hide, 'body');
      if (k === segs - 1 && T.sw) b.add(taper([end.clone().add(V(0, 0.06, 0)), end.clone().add(V(0, -T.sw[1] * 0.5, 0)), end.clone().add(V(0, -T.sw[1], 0.005))], T.sw[0] * 0.5, T.sw[0] * 0.3, 8, 10, TEX, (t) => T.sw[0] * (0.45 + Math.sin(Math.PI * Math.min(1, t * 1.2)) * 0.75)), hide, 'switch');
      b.flush(j, cur);
      tails.push(j); parent = j; pAt = cur; cur = end;
    }
  }

  root.userData.animal = {
    kind: 'grazer', species: type, head, skull, neckBend, jaw, tails, tail: tails[0], earL: ears[0], earR: ears[1], legs, torso, barrel,
    scale: sp.scale, walk: sp.walk, grazeAngle, rad: type === 'goat' ? 0.4 : type === 'donkey' ? 0.6 : 0.85, roam: type === 'goat' ? 3 : 3.5,
  };
  return root;
}

// ---------------------------------------------------------------------------------------------------------------
// birds
const birdLeg = (parent, pAt, x, hipY, hockY, hockZ, len, r, color, mat, toes, coat, tibia = null) => {
  // the drumstick hangs from the hip inside the feathers; the scaly shank runs from the hock (the joint that bends
  // back) down to the toes
  const hip = V(x, hipY, 0), hock = V(x, hockY, hockZ), foot = V(x, 0.0, hockZ + 0.005);
  const up = joint(parent, hip, pAt), knee = joint(up, hock, hip), pas = joint(knee, foot.clone().setY(0.012), hock);
  const kb = bag(coat), pb = bag(coat);
  kb.add(taper([hock.clone(), hock.clone().lerp(foot, 0.5), foot.clone().setY(0.012)], r, r * 0.85, 8, 8, TEX * 4), mat, (v, c) => { c.set(color); c.multiplyScalar(0.9 + 0.2 * vnoise(v.y * 300, v.x * 300, 0)); });
  for (const [ang, l] of [[-0.45, toes], [0, toes * 1.15], [0.45, toes], [Math.PI, toes * 0.5]]) {
    const d = V(Math.sin(ang), 0, Math.cos(ang)), s = foot.clone().setY(0.008);
    pb.add(taper([s, s.clone().addScaledVector(d, l * 0.6).setY(0.006), s.clone().addScaledVector(d, l).setY(0.002)], r * 0.55, r * 0.3, 6, 6, TEX * 4), mat, color);
  }
  if (tibia) { const ub = bag(coat); ub.add(taper([hip.clone().add(V(0, -0.04, 0.01)), hip.clone().lerp(hock, 0.5), hock.clone()], r * 1.6, r * 1.05, 8, 8, TEX * 4), mat, (v, c) => c.set(v.y > hipY - 0.1 ? tibia : color)); ub.flush(up, hip); }
  kb.flush(knee, hock); pb.flush(pas, foot.clone().setY(0.012));
  return { up, knee, pas, a: hip.distanceTo(hock), b: hockY, bend: -1, py: hipY, nz: hockZ };
};
let flock = 0;
function chicken() {
  const k = flock++, rooster = k % 4 === 1, pal = [
    { body: '#9a5a2a', dark: '#3a2010', hackle: '#c88a3a', tail: '#2a1a12', wing: '#7a4220' }, // a brown deshi hen
    { body: '#2a2422', dark: '#121010', hackle: '#d0782a', tail: '#10161a', wing: '#8a3a1a' }, // a red-and-black rooster
    { body: '#e8e0d0', dark: '#a89880', hackle: '#f0e8d8', tail: '#d8d0c0', wing: '#d8cfbe' }, // a white hen
    { body: '#6a4a30', dark: '#2a1a10', hackle: '#a07040', tail: '#1a1410', wing: '#5a3a22', speck: true }, // speckled
  ][k % 4];
  const P = { body: C(pal.body), dark: C(pal.dark), hackle: C(pal.hackle), tail: C(pal.tail), wing: C(pal.wing) };
  const coat = { boost: 1.12, color(v, part, c) {
    if (part === 'hackle') c.copy(P.hackle).lerp(P.body, sm(0.33, 0.24, v.y));
    else if (part === 'wing') c.copy(P.body).lerp(P.wing, 0.5).lerp(P.dark, sm(-0.04, -0.1, v.z) * 0.5);
    else if (part === 'tail') c.copy(P.tail);
    else { c.copy(P.body).lerp(P.hackle, sm(0.08, 0.14, v.z) * sm(0.24, 0.3, v.y) * 0.8); if (rooster) c.lerp(P.dark, sm(0.2, 0.12, v.y)); }
    if (pal.speck || part === 'body') { const n = vnoise(v.x * 90, v.y * 90, v.z * 90); if (pal.speck && n > 0.7) c.lerp(P.dark, 0.6); }
    c.multiplyScalar(1 + (fbm(v.x * 30, v.y * 30, v.z * 30) - 0.5) * 0.25);
  } };
  const root = new THREE.Group(), s = rooster ? 1.12 : 1, w = new THREE.Group(); w.scale.setScalar(s); root.add(w);
  const O = V(0, 0, 0), body = new THREE.Group(); w.add(body); // pitches forward to peck
  const pivotY = 0.2; body.position.set(0, pivotY, 0);
  const BP = V(0, pivotY, 0), inner = new THREE.Group(); inner.position.set(0, -pivotY, 0); body.add(inner);
  const bb = bag(coat), FT = TEX * 5;
  const top = keys([[0, 0.3], [0.2, 0.3], [0.5, 0.31], [0.8, 0.32], [1, 0.3]]), bot = keys([[0, 0.24], [0.15, 0.17], [0.45, 0.13], [0.75, 0.14], [1, 0.2]]), half = keys([[0, 0.03], [0.2, 0.07], [0.5, 0.085], [0.8, 0.075], [1, 0.04]]);
  bb.add(loft((u) => { const e = ends(u, 0.12, 0.14), t = top(u), d = bot(u), m = (t + d) / 2; return { c: V(0, m, -0.13 + u * 0.27), w: half(u) * e, up: (t - m) * e, dn: (m - d) * e, pu: 0.7, pd: 0.75 }; }, 24, 20, FT), 'feather', 'body');
  for (const sd of [-1, 1]) bb.add(loft((u) => { const e = ends(u, 0.3, 0.45); return { c: V(sd * 0.052, 0.25 - u * 0.025, 0.075 - u * 0.19), w: 0.034 * e, up: 0.05 * e, dn: 0.042 * e, pu: 1, pd: 1, narrowTop: 0.3 }; }, 16, 14, FT), 'feather', 'wing'); // folded wings
  // the tail: a hen's fan held up; a rooster's arching black-green sickles
  const tail = joint(inner, V(0, 0.28, -0.12), O), tb = bag(coat);
  // the fan: a tent of feathers, broad seen from the side, rising up and back from the rump
  tb.add(loft((u) => { const e = ends(u, 0.02, 0.18); return { c: V(0, 0.27 + u * (rooster ? 0.12 : 0.11), -0.1 - u * (rooster ? 0.07 : 0.05)), w: (0.03 - u * 0.012) * e, up: (0.025 + u * 0.02) * e, dn: (0.025 + u * 0.022) * e, pu: 0.9, pd: 0.9, narrowTop: 0.4 }; }, 12, 12, TEX * 5), 'feather', 'tail');
  if (rooster) for (let i = 0; i < 4; i++) { // the cock's arching sickle feathers
    const sx = (i - 1.5) * 0.01, o = V(sx, 0.34, -0.14);
    const g = taper([o, o.clone().add(V(sx, 0.09 - i * 0.01, -0.04)), o.clone().add(V(sx, 0.08 - i * 0.015, -0.13)), o.clone().add(V(sx, 0.0 - i * 0.012, -0.18))], 0.016, 0.006, 12, 8, TEX * 5);
    g.scale(0.3, 1, 1).translate(o.x * 0.7, 0, 0); tb.add(g, 'feather', 'tail');
  }
  tb.flush(tail, V(0, 0.28, -0.12));
  bb.flush(inner);
  // neck and head: held up, the head stays still in the air as the bird steps, then thrusts forward
  const neckAt = V(0, 0.27, 0.1), head = joint(inner, neckAt, O), hb = bag(coat);
  hb.add(loft((u) => { const e = u < 0.5 ? 1 : ends(u, 0.001, 0.2); return { c: V(0, 0.26 + u * 0.12, 0.085 + u * 0.06 - Math.sin(u * Math.PI) * 0.012), w: (0.062 - u * 0.04) * e, up: (0.05 - u * 0.028) * e, dn: (0.06 - u * 0.035) * e, pu: 0.8, pd: 0.8 }; }, 14, 14, FT), 'feather', 'hackle');
  const hc = V(0, 0.385, 0.15);
  hb.add(ball(0.024, 0.026, 0.032, hc.x, hc.y, hc.z), 'feather', 'hackle');
  hb.add(ball(0.024, 0.026, 0.032, hc.x, hc.y - 0.002, hc.z + 0.004), 'skin', rooster ? '#c8302a' : '#c85a4a'); // the bare red face
  const beak = taper([hc.clone().add(V(0, 0.002, 0.026)), hc.clone().add(V(0, -0.002, 0.042)), hc.clone().add(V(0, -0.01, 0.054))], 0.009, 0.0015, 8, 8); beak.scale(1, 0.9, 1);
  hb.add(beak, 'wet', (v, c) => c.set('#d8b060').lerp(C('#8a6a3a'), sm(0.0, -0.01, v.y - hc.y)));
  const cs = rooster ? 1.6 : 0.8; // the comb: a row of points
  for (let i = 0; i < 5; i++) hb.add(ball(0.005 * cs, (0.01 + (i === 2 ? 0.004 : 0)) * cs, 0.007 * cs, 0, hc.y + 0.026 + Math.sin((i / 4) * Math.PI) * 0.006 * cs, hc.z - 0.016 + i * 0.009, 8, 6), 'skin', '#c8241e');
  hb.add(ball(0.005, 0.009 * cs, 0.026, 0, hc.y + 0.02, hc.z + 0.002, 8, 6), 'skin', '#c8241e');
  for (const sd of [-1, 1]) {
    hb.add(ball(0.006 * cs, 0.012 * cs, 0.007, sd * 0.006, hc.y - 0.03, hc.z + 0.03, 8, 6), 'skin', '#c42a22'); // wattles
    hb.add(ball(0.0055, 0.0055, 0.0045, sd * 0.021, hc.y + 0.005, hc.z + 0.01, 10, 8), 'eye', (v, c) => c.set(Math.abs(v.z - (hc.z + 0.0145)) < 0.0015 ? '#080606' : '#c8701a'));
    hb.add(ball(0.0035, 0.0035, 0.0012, sd * 0.0262, hc.y + 0.005, hc.z + 0.01, 8, 6), 'eye', '#080606'); // pupil
  }
  hb.flush(head, neckAt);
  const legs = {};
  for (const [key, sd] of [['lL', -1], ['lR', 1]]) legs[key] = birdLeg(w, O, sd * 0.035, 0.17, 0.11, -0.012, 0.03, 0.007, '#d8b040', 'skin', 0.035, coat);
  for (const L of Object.values(legs)) { const [u, l] = legIK(L.a, L.b, L.nz, -L.py, L.bend); L.u0 = u; L.l0 = l; }
  legs.lL.phase = 0; legs.lR.phase = 0.5;
  root.userData.animal = { kind: 'chicken', body, inner, head, tail, legs, scale: s, walk: { speed: 0.38, period: 0.48, duty: 0.6, lift: 0.025 }, rad: 0.2, roam: 3.5 };
  return root;
}

let paddling = 0;
function duck() {
  const k = paddling++, pal = [
    { body: '#8a6a48', dark: '#4a3420', head: '#7a5a3a', breast: '#9a7a58', speculum: '#2a3a8a' }, // khaki-brown deshi duck
    { body: '#f2f0ea', dark: '#c8c2b8', head: '#f4f2ec', breast: '#f6f4ee' }, // white
    { body: '#1e1c1c', dark: '#0e0d0d', head: '#1a1a1c', breast: '#f0eee8', speculum: '#2a4a3a', bib: true }, // Nageswari: black with a white bib
    { body: '#9a9890', dark: '#4a4440', head: '#1c4a2a', breast: '#6a3a24', speculum: '#3a3aa0', collar: true }, // a mallard-type drake
  ][k % 4];
  const P = Object.fromEntries(Object.entries(pal).filter(([, v]) => typeof v === 'string').map(([a, b]) => [a, C(b)]));
  const coat = { boost: 1.1, color(v, part, c) {
    if (part === 'head') { c.copy(P.head); if (pal.collar && v.y < 0.2) c.set('#f0eee8'); if (pal.bib && v.y < 0.215 && v.z > 0.15) c.copy(P.breast); }
    else if (part === 'wing') { c.copy(P.body).lerp(P.dark, 0.4); if (P.speculum && v.z < 0.0 && v.z > -0.05 && v.y < 0.17) c.copy(P.speculum); }
    else { c.copy(P.body).lerp(P.breast, sm(0.06, 0.15, v.z)); c.lerp(P.dark, sm(-0.1, -0.18, v.z) * 0.6); }
    if (pal.body === '#8a6a48') { const n = vnoise(v.x * 80, v.y * 80, v.z * 80); if (n > 0.62) c.lerp(P.dark, 0.55); } // the khaki duck's mottling
    c.multiplyScalar(1 + (fbm(v.x * 30, v.y * 30, v.z * 30) - 0.5) * 0.2);
  } };
  const root = new THREE.Group(), w = new THREE.Group(); root.add(w);
  const O = V(0, 0, 0), body = new THREE.Group(); body.position.set(0, 0.12, 0); w.add(body);
  const BP = V(0, 0.12, 0), inner = new THREE.Group(); inner.position.set(0, -0.12, 0); body.add(inner);
  const bb = bag(coat), FT = TEX * 5;
  const top = keys([[0, 0.2], [0.15, 0.19], [0.5, 0.2], [0.85, 0.21], [1, 0.19]]), bot = keys([[0, 0.17], [0.2, 0.09], [0.5, 0.075], [0.8, 0.08], [1, 0.13]]), half = keys([[0, 0.015], [0.2, 0.08], [0.5, 0.1], [0.8, 0.09], [1, 0.04]]);
  bb.add(loft((u) => { const e = ends(u, 0.1, 0.12), t = top(u), d = bot(u), m = (t + d) / 2; return { c: V(0, m + (u < 0.15 ? (0.15 - u) * 0.25 : 0), -0.2 + u * 0.38), w: half(u) * e, up: (t - m) * e, dn: (m - d) * e, pu: 0.8, pd: 0.6 }; }, 26, 22, FT), 'feather', 'body');
  for (const sd of [-1, 1]) bb.add(loft((u) => { const e = ends(u, 0.3, 0.4); return { c: V(sd * 0.064, 0.172 - u * 0.004, 0.07 - u * 0.25), w: 0.036 * e, up: 0.042 * e, dn: 0.03 * e, pu: 1, pd: 1, narrowTop: 0.3 }; }, 16, 14, FT), 'feather', 'wing');
  if (pal.collar) for (let i = 0; i < 3; i++) bb.add(taper([V(0, 0.2, -0.17), V(0, 0.235, -0.19), V(i * 0.006 - 0.006, 0.23, -0.16)], 0.004, 0.002, 6, 6), 'feather', 'body'); // the drake's curl
  // neck and head; the broad flat bill
  const neckAt = V(0, 0.19, 0.13), head = joint(inner, neckAt, O), hb = bag(coat);
  hb.add(loft((u) => { const e = u < 0.5 ? 1 : ends(u, 0.001, 0.15); return { c: V(0, 0.18 + u * 0.12, 0.13 + u * 0.035 - Math.sin(u * Math.PI) * 0.012), w: (0.05 - u * 0.022) * e, up: (0.045 - u * 0.018) * e, dn: (0.05 - u * 0.02) * e, pu: 0.8, pd: 0.8 }; }, 14, 14, FT), 'feather', 'head');
  const hc = V(0, 0.305, 0.17);
  hb.add(ball(0.03, 0.03, 0.04, hc.x, hc.y, hc.z), 'feather', 'head');
  const bill = loft((u) => { const e = ends(u, 0.001, 0.1); return { c: V(0, hc.y - 0.008 - u * 0.012, hc.z + 0.025 + u * 0.055), w: (0.018 + u * 0.006) * e, up: (0.009 - u * 0.004) * e, dn: 0.006 * e, pu: 0.9, pd: 0.7 }; }, 12, 12);
  hb.add(bill, 'wet', (v, c) => c.set(pal.head === '#1c4a2a' ? '#c8b040' : '#d88a2a').lerp(C('#2a2420'), sm(hc.z + 0.072, hc.z + 0.08, v.z)));
  for (const sd of [-1, 1]) hb.add(ball(0.006, 0.006, 0.005, sd * 0.026, hc.y + 0.006, hc.z + 0.012, 10, 8), 'eye', '#0a0808');
  hb.flush(head, neckAt);
  bb.flush(inner);
  const legs = {};
  for (const [key, sd] of [['lL', -1], ['lR', 1]]) {
    legs[key] = birdLeg(w, O, sd * 0.045, 0.1, 0.06, -0.01, 0.02, 0.008, '#e0802a', 'skin', 0.04, coat);
    const web = new THREE.CircleGeometry(0.035, 10, Math.PI / 2 - 0.5, 1.0); web.rotateX(-Math.PI / 2); web.translate(sd * 0.045, 0.004, -0.005);
    const pb = bag(coat); pb.add(web, 'skin', '#d8782a'); pb.flush(legs[key].pas, V(sd * 0.045, 0.012, -0.005), false);
  }
  for (const L of Object.values(legs)) { const [u, l] = legIK(L.a, L.b, L.nz, -L.py, L.bend); L.u0 = u; L.l0 = l; }
  legs.lL.phase = 0; legs.lR.phase = 0.5;
  root.userData.animal = { kind: 'duck', body, inner, head, legs, scale: 1, walk: { speed: 0.3, period: 0.44, duty: 0.6, lift: 0.025 }, rad: 0.2 };
  return root;
}

function egret() {
  const white = { color(v, part, c) { c.set(part === 'plume' ? '#fbfbf8' : '#f3f3ee'); c.multiplyScalar(1 + (fbm(v.x * 25, v.y * 25, v.z * 25) - 0.5) * 0.08); }, boost: 1.05 };
  const root = new THREE.Group(), O = V(0, 0, 0), w = new THREE.Group(); root.add(w);
  const body = new THREE.Group(); body.position.set(0, 0.5, 0); w.add(body);
  const BP = V(0, 0.5, 0), inner = new THREE.Group(); inner.position.set(0, -0.5, 0); body.add(inner);
  const bb = bag(white), FT = TEX * 4;
  bb.add(loft((u) => { const e = ends(u, 0.1, 0.18); return { c: V(0, 0.52 + u * 0.08, -0.24 + u * 0.38), w: (0.055 + Math.sin(u * Math.PI) * 0.035) * e, up: (0.05 + Math.sin(u * Math.PI) * 0.02) * e, dn: (0.05 + Math.sin(u * Math.PI) * 0.035) * e, pu: 0.8, pd: 0.75 }; }, 22, 18, FT), 'feather', 'body');
  // folded wings lie along the body; in flight a pair of open wings (hidden at rest) beats
  for (const sd of [-1, 1]) bb.add(loft((u) => { const e = ends(u, 0.12, 0.3); return { c: V(sd * 0.07, 0.6 - u * 0.03, 0.1 - u * 0.36), w: 0.012 * e, up: 0.05 * e, dn: 0.045 * e, pu: 0.8, pd: 0.8 }; }, 14, 12, FT), 'feather', 'body');
  const wings = [];
  for (const sd of [-1, 1]) {
    const at = V(sd * 0.07, 0.6, 0.06), wg = joint(inner, at, O), wb = bag(white);
    // a sheet in the y-z plane rising from the shoulder; turned flat and outward (rotation.z) it is an open wing
    wb.add(loft((u) => { const e = ends(u, 0.03, 0.08), chord = 0.17 * (1 - u * 0.5); return { c: V(at.x, at.y + u * 0.45, at.z - chord * 0.5 - u * 0.06), w: 0.008 * e, up: chord * 0.5 * e + 0.002, dn: chord * 0.5 * e + 0.002, pu: 0.9, pd: 0.9, narrowTop: 0 }; }, 14, 10, FT), 'feather', 'body');
    wb.flush(wg, at); wg.visible = false;
    wings.push(wg);
  }
  bb.flush(inner);
  // the long neck: two joints, so it can draw back into an S and strike
  const n0 = V(0, 0.6, 0.12), neck = joint(inner, n0, O), nb = bag(white);
  const n1 = V(0, 0.78, 0.13), neck2 = joint(neck, n1, n0), n2b = bag(white);
  nb.add(taper([n0.clone(), V(0, 0.68, 0.18), V(0, 0.75, 0.15), n1.clone().add(V(0, 0.01, 0))], 0.035, 0.02, 12, 10, FT), 'feather', 'body');
  const hc = V(0, 0.9, 0.17);
  n2b.add(taper([n1.clone(), V(0, 0.83, 0.11), V(0, 0.88, 0.14), hc.clone()], 0.02, 0.019, 12, 10, FT), 'feather', 'body');
  n2b.add(ball(0.024, 0.024, 0.034, hc.x, hc.y, hc.z + 0.01), 'feather', 'body');
  n2b.add(taper([hc.clone().add(V(0, -0.002, 0.03)), hc.clone().add(V(0, -0.008, 0.1)), hc.clone().add(V(0, -0.014, 0.15))], 0.011, 0.001, 10, 8), 'wet', (v, c) => c.set('#e0b020').lerp(C('#6a5420'), sm(hc.z + 0.12, hc.z + 0.15, v.z)));
  for (const sd of [-1, 1]) { n2b.add(ball(0.0055, 0.0055, 0.0045, sd * 0.021, hc.y + 0.004, hc.z + 0.022, 10, 8), 'eye', (v, c) => c.set(Math.abs(v.x) > 0.024 ? '#080606' : '#e0c030')); }
  nb.flush(neck, n0); n2b.flush(neck2, n1);
  const legs = {};
  for (const [key, sd] of [['lL', -1], ['lR', 1]]) legs[key] = birdLeg(w, O, sd * 0.04, 0.5, 0.27, -0.03, 0.05, 0.007, '#1a1614', 'wet', 0.07, white, '#f0f0ea');
  for (const L of Object.values(legs)) { const [u, l] = legIK(L.a, L.b, L.nz, -L.py, L.bend); L.u0 = u; L.l0 = l; }
  legs.lL.phase = 0; legs.lR.phase = 0.5;
  root.userData.animal = { kind: 'egret', body, inner, neck, neck2, wingL: wings[0], wingR: wings[1], legs, scale: 1, walk: { speed: 0.14, period: 2.2, duty: 0.78, lift: 0.08 }, rad: 0.3 };
  return root;
}

// the builders props.js uses for every animal it places
export const ANIMAL_KINDS = ['cow', 'ox', 'buffalo', 'goat', 'donkey', 'chicken', 'duck', 'egret'];
export function buildAnimal(type) {
  if (type === 'chicken') return chicken();
  if (type === 'duck') return duck();
  if (type === 'egret') return egret();
  return quadruped(SPECS[type] ? type : 'cow');
}

// ---------------------------------------------------------------------------------------------------------------
// moving them
const HALF_W = FIELD_W / 2 + 1.5, HALF_D = FIELD_D / 2 + 1.5;
// can an animal of radius r stand at (x, z)? Not in or at the edge of water, not in the crop field, not inside a
// house or tree; its own place among the blockers (at home) does not count.
function standable(L, x, z, r, home, wet) {
  if (Math.hypot(x, z) > WORLD_R - 2) return false;
  if (Math.abs(x) < HALF_W && Math.abs(z) < HALF_D) return false;
  const m = r + 0.6;
  const water = !!(inWater(L, x, z) || inWater(L, x + m, z) || inWater(L, x - m, z) || inWater(L, x, z + m) || inWater(L, x, z - m));
  if (wet ? !inWater(L, x, z) || !inWater(L, x + m * 0.6, z) || !inWater(L, x - m * 0.6, z) || !inWater(L, x, z + m * 0.6) || !inWater(L, x, z - m * 0.6) : water) return false;
  for (const b of L.blockers) {
    if (b.r) { if (Math.abs(b.x - home[0]) < 0.05 && Math.abs(b.z - home[1]) < 0.05) continue; if (Math.hypot(x - b.x, z - b.z) < b.r + r) return false; }
    else { const dx = x - b.x, dz = z - b.z, u = dx * b.c - dz * b.s, v = dx * b.s + dz * b.c; if (Math.abs(u) < b.hw + r && Math.abs(v) < b.hd + r) return false; }
  }
  return true;
}

// pose a leg chain from a foot target (z forward of the hip, y up from the hip, in the animal's own units)
function poseLeg(L, z, y, flex) {
  const [u, l] = legIK(L.a, L.b, z, y, L.bend);
  L.up.rotation.x = -(u - L.u0);
  L.knee.rotation.x = -((l - u) - (L.l0 - L.u0));
  L.pas.rotation.x = (l - L.l0) + flex; // the hoof stays flat on the ground while planted
}
// walk every leg along its foot path; returns nothing, allocates nothing
function stepLegs(A, legs, reach, lift, bodyY) {
  const W = A.walk;
  for (const key in legs) {
    const L = legs[key], f = footPath((A.cyc ?? 0) + L.phase, W.duty, reach, lift);
    const flex = f.stance ? 0 : Math.sin(Math.PI * f.s) * 0.9 * (lift > 0 ? 1 : 0);
    poseLeg(L, L.nz + f.dz, -(L.py + bodyY) + f.dy, flex);
  }
}

const rnd = Math.random;
function sound(ctx, A, d, name, near, gap) {
  A.soundWait = Math.max(0, (A.soundWait ?? rnd() * gap) - ctx.dt);
  if (d < near && A.soundWait <= 0 && ctx.play) { A.soundWait = gap + rnd() * gap * 0.7; ctx.play(name); }
}
// head toward a yaw/pitch, easing
const ease = (o, k, want, rate, dt) => { o[k] += (want - o[k]) * Math.min(1, rate * dt); };

function grazer(a, A, ctx) {
  const { dt, L, focus } = ctx, W = A.walk, k = A.scale * a.scale.x;
  const px = a.position.x, pz = a.position.z, dP = focus ? Math.hypot(px - focus.x, pz - focus.z) : 99;
  if (A.species === 'goat') sound(ctx, A, dP, 'goat_bleat', 4, 16); else if (A.species !== 'donkey') sound(ctx, A, dP, 'cow_low', 4.2, 16);
  A.stT = (A.stT ?? rnd() * 6) - dt;
  if (A.stT <= 0 || (A.st === 'walk' && !A.to)) {
    const r = rnd();
    if (A.st === 'walk' || !A.st) { A.st = r < 0.75 ? 'graze' : 'look'; A.stT = A.st === 'graze' ? 6 + rnd() * 10 : 2.5 + rnd() * 3; }
    else if (r < 0.55) { // move on to fresh grass
      A.to = pickWander(A.home, [px, pz], A.roam, rnd, (x, z) => standable(L, x, z, A.rad, A.home, false), { min: 0.8, max: A.species === 'goat' ? 1.8 : 2.6 });
      if (A.to) { A.st = 'walk'; A.stT = 12; A.low = rnd() < 0.5; } else { A.st = 'graze'; A.stT = 4 + rnd() * 6; }
    } else if (r < 0.75) { A.st = 'look'; A.stT = 2.5 + rnd() * 3.5; A.lookYaw = (rnd() - 0.5) * 1.4; }
    else { A.st = 'graze'; A.stT = 5 + rnd() * 8; A.sweep = rnd() * 6; }
  }
  // the farmer close by: stop, lift the head and watch
  if (dP < 2.2 && A.st !== 'look') { A.st = 'look'; A.stT = 3 + rnd() * 2; A.to = null; }
  // walking: turn toward the spot, slow for the turn, ease in and out
  let want = 0, turning = 0;
  if (A.st === 'walk' && A.to) {
    const dx = A.to[0] - px, dz = A.to[1] - pz, d = Math.hypot(dx, dz), head = Math.atan2(dx, dz), err = wrapAngle(head - a.rotation.y);
    const ny = turnToward(a.rotation.y, head, 0.75 * dt); turning = (ny - a.rotation.y) / Math.max(dt, 1e-4); a.rotation.y = ny;
    want = W.speed * (A.low ? 0.6 : 1) * Math.max(0, Math.cos(err)) * Math.min(1, Math.sqrt(d / 0.6));
    if (d < 0.12) { A.to = null; A.st = 'graze'; A.stT = 5 + rnd() * 8; }
  }
  A.v = (A.v ?? 0) + clamp(want - (A.v ?? 0), -0.9 * dt, 0.6 * dt);
  if (A.v > 1e-3) { a.position.x += Math.sin(a.rotation.y) * A.v * dt; a.position.z += Math.cos(a.rotation.y) * A.v * dt; }
  a.position.y = L.ground(a.position.x, a.position.z);
  // the walk: phase runs while moving or turning on the spot; stride from the speed, so no foot slides
  const vEff = Math.max(A.v, Math.abs(turning) * 0.35 * (A.species === 'goat' ? 0.4 : 1));
  const act = clamp(vEff / (W.speed * 0.5), 0, 1);
  A.act = (A.act ?? 0) + (act - (A.act ?? 0)) * Math.min(1, dt * 4);
  if (A.act > 0.01) A.cyc = ((A.cyc ?? 0) + dt / W.period) % 1;
  const reach = reachFor(vEff, W.period, W.duty) / k, lift = W.lift * A.act / k * 0.9 + 0.0001;
  const cyc = A.cyc ?? 0, bob = -W.lift * 0.12 * A.act * (0.5 - 0.5 * Math.cos(4 * Math.PI * cyc)) / k;
  A.torso.position.y = bob; A.torso.rotation.z = Math.sin(2 * Math.PI * cyc) * 0.014 * A.act; A.torso.rotation.x = Math.sin(4 * Math.PI * cyc + 0.6) * 0.008 * A.act;
  stepLegs(A, A.legs, reach * A.act + reach * (1 - A.act) * 0, lift, bob);
  // breathing
  const br = Math.sin(A.ph * (A.species === 'goat' ? 2.6 : 1.6));
  A.barrel.scale.x = 1 + br * 0.014; A.barrel.scale.y = 1 + br * 0.008;
  // the head: down to the grass, up to look, carried and nodding on the walk
  let pitch, yaw = 0, skull = 0;
  if (A.st === 'graze') { pitch = A.grazeAngle; skull = 0.2; A.sweep = (A.sweep ?? 0) + dt; yaw = Math.sin(A.sweep * 0.45) * 0.28 + Math.sin(A.sweep * 1.3) * 0.05; }
  else if (A.st === 'walk') { pitch = A.low ? A.grazeAngle * 0.85 : 0.22; skull = A.low ? 0.1 : 0; pitch += Math.sin(4 * Math.PI * cyc + 1.2) * 0.035 * A.act; }
  else { pitch = -0.12; yaw = A.lookYaw ?? 0; }
  if (focus && dP < 5 && A.st !== 'graze') { // watch the farmer
    const hy = wrapAngle(Math.atan2(focus.x - px, focus.z - pz) - a.rotation.y);
    if (Math.abs(hy) < 1.6) yaw = clamp(hy, -0.9, 0.9);
  }
  ease(A.head.rotation, 'x', pitch, A.st === 'graze' ? 1.6 : 2.4, dt);
  ease(A.head.rotation, 'y', yaw * 0.7, 2.2, dt);
  ease(A.skull.rotation, 'x', skull, 2, dt); ease(A.skull.rotation, 'y', yaw * 0.3, 2.2, dt);
  bendNeck(A.neckBend, A.head.rotation.x, A.head.rotation.y);
  // the jaw: bites while grazing, the side-to-side grind of chewing the cud while looking
  const chew = A.st === 'graze' ? 7.5 : 5.2;
  A.jaw.rotation.x = (A.st === 'graze' ? Math.max(0, Math.sin(A.ph * chew)) * 0.12 : (0.5 + 0.5 * Math.sin(A.ph * chew * 2)) * 0.05);
  A.jaw.rotation.y = A.st === 'graze' ? 0 : Math.sin(A.ph * chew) * 0.06;
  // ears: held a little back, forward when watching, a quick flick at flies now and then
  for (const [ear, sd, key] of [[A.earL, -1, 'fL'], [A.earR, 1, 'fR']]) {
    A[key + 'e'] = (A[key + 'e'] ?? rnd() * 5) - dt;
    if (A[key + 'e'] < -0.35) A[key + 'e'] = 2 + rnd() * 7;
    const flick = A[key + 'e'] < 0 ? Math.sin((-A[key + 'e'] / 0.35) * Math.PI * 2) * 0.55 : 0;
    ear.rotation.x = flick; ear.rotation.y = sd * (A.st === 'look' ? -0.25 : 0.1);
  }
  // tail: hangs and sways; a swish at flies, a wave running down to the switch
  A.sw = (A.sw ?? rnd() * 6) - dt;
  if (A.sw < -1.4) A.sw = 2.5 + rnd() * 6;
  const sw = A.sw < 0 ? Math.sin((-A.sw / 1.4) * Math.PI) : 0;
  for (let i = 0; i < A.tails.length; i++) {
    const t = A.tails[i];
    t.rotation.z = (Math.sin(A.ph * 1.1 - i * 0.6) * 0.04 + sw * Math.sin(A.ph * 7 - i * 0.9) * 0.4) * (A.tails.length === 1 ? 0.5 : 1);
    t.rotation.x = i === 0 ? -sw * 0.15 + Math.sin(2 * Math.PI * cyc) * 0.04 * A.act : 0;
  }
}

function chickenStep(a, A, ctx) {
  const { dt, L, focus } = ctx, W = A.walk, k = A.scale;
  const px = a.position.x, pz = a.position.z, dP = focus ? Math.hypot(px - focus.x, pz - focus.z) : 99;
  A.stT = (A.stT ?? rnd() * 3) - dt;
  if (dP < 2.2 && A.st !== 'run') { // run from the farmer, clucking
    A.st = 'run'; A.stT = 1.6;
    const ax = px - focus.x, az = pz - focus.z, d = Math.hypot(ax, az) || 1;
    A.to = [px + (ax / d) * 2.5, pz + (az / d) * 2.5];
    if (!standable(L, A.to[0], A.to[1], A.rad, A.home, false)) A.to = pickWander(A.home, [px, pz], A.roam + 1.5, rnd, (x, z) => standable(L, x, z, A.rad, A.home, false), { min: 1.2, max: 3 });
    if (ctx.play) { ctx.play('chicken_cluck'); ctx.play('chicken_flutter'); }
  }
  if (A.stT <= 0) {
    const r = rnd();
    if (r < 0.4) { A.to = pickWander(A.home, [px, pz], A.roam, rnd, (x, z) => standable(L, x, z, A.rad, A.home, false), { min: 0.4, max: 1.4 }); A.st = A.to ? 'walk' : 'peck'; A.stT = A.to ? 6 : 2; }
    else if (r < 0.78) { A.st = 'peck'; A.stT = 1.5 + rnd() * 3; }
    else if (r < 0.9) { A.st = 'scratch'; A.stT = 1.2; }
    else { A.st = 'stand'; A.stT = 1 + rnd() * 2; }
  }
  let want = 0;
  if ((A.st === 'walk' || A.st === 'run') && A.to) {
    const dx = A.to[0] - px, dz = A.to[1] - pz, d = Math.hypot(dx, dz);
    a.rotation.y = turnToward(a.rotation.y, Math.atan2(dx, dz), (A.st === 'run' ? 8 : 4) * dt);
    want = (A.st === 'run' ? 1.6 : W.speed) * Math.min(1, d / 0.2);
    if (d < 0.08) { A.to = null; A.st = 'peck'; A.stT = 1 + rnd() * 2; }
  } else if (A.st === 'run') { A.st = 'stand'; A.stT = 1; }
  A.v = (A.v ?? 0) + clamp(want - (A.v ?? 0), -4 * dt, 4 * dt);
  if (A.v > 1e-3) { a.position.x += Math.sin(a.rotation.y) * A.v * dt; a.position.z += Math.cos(a.rotation.y) * A.v * dt; }
  a.position.y = L.ground(a.position.x, a.position.z);
  const period = A.v > 0.8 ? 0.26 : W.period;
  const act = clamp(A.v / 0.15, 0, 1);
  if (act > 0.01 || A.st === 'scratch') A.cyc = ((A.cyc ?? 0) + dt / period) % 1;
  const cyc = A.cyc ?? 0;
  // legs: the walk, or a scratch (one foot rakes back twice)
  if (A.st === 'scratch' && act < 0.05) {
    const s = (1.2 - A.stT) / 1.2, which = s < 0.5 ? A.legs.lL : A.legs.lR, other = s < 0.5 ? A.legs.lR : A.legs.lL, q = (s * 4) % 1;
    poseLeg(other, other.nz, -other.py, 0);
    poseLeg(which, which.nz + 0.03 - q * 0.07, -which.py + Math.max(0, Math.sin(q * Math.PI)) * 0.02 * (q > 0.7 ? 1 : 0.3), 0.3);
  } else stepLegs(A, A.legs, reachFor(A.v, period, W.duty) / k, W.lift * act / k + 0.0001, 0);
  // the body leans in to peck; the head holds still in the air while the body steps under it, then thrusts on
  let pitch = 0, hz = 0, hy = 0;
  if (A.st === 'peck') { const q = (A.ph * 2.2) % 1; pitch = 0.75 + (q < 0.25 ? Math.sin(q / 0.25 * Math.PI) * 0.3 : 0); }
  else if (A.st === 'scratch') pitch = 0.2;
  if (act > 0.05) { const hs = (cyc * 2) % 1, rch = (A.v * period * 0.5) / k * 0.8; hz = (hs < 0.75 ? rch * (0.5 - hs / 0.75) : rch * (-0.5 + (hs - 0.75) / 0.25)) * act; }
  if (A.st === 'stand') { A.jerk = (A.jerk ?? 0) - dt; if (A.jerk <= 0) { A.jerk = 0.3 + rnd() * 0.8; A.hyw = (rnd() - 0.5) * 1.6; } hy = A.hyw ?? 0; }
  ease(A.body.rotation, 'x', pitch, 10, dt);
  A.head.position.z = 0.1 + hz; A.head.rotation.y += ((hy) - A.head.rotation.y) * Math.min(1, dt * 18);
  A.head.rotation.x = A.st === 'peck' ? 0.35 : 0;
  A.tail.rotation.x = Math.sin(A.ph * 3) * 0.04 + (A.st === 'run' ? -0.25 : 0);
  A.body.rotation.z = Math.sin(2 * Math.PI * cyc) * 0.05 * act;
}

function duckStep(a, A, ctx) {
  const { dt, L, focus } = ctx, W = A.walk;
  const px = a.position.x, pz = a.position.z, dP = focus ? Math.hypot(px - focus.x, pz - focus.z) : 99;
  sound(ctx, A, dP, 'duck_quack', 3.8, 9);
  if (A.wet == null) A.wet = !!inWater(L, A.home[0], A.home[1]);
  const wet = A.wet;
  A.stT = (A.stT ?? rnd() * 4) - dt;
  if (A.stT <= 0) {
    const r = rnd();
    if (r < 0.55) { A.to = pickWander(A.home, [px, pz], wet ? 3 : 2.5, rnd, (x, z) => standable(L, x, z, A.rad, A.home, wet), { min: 0.6, max: 2.2 }); A.st = A.to ? 'go' : 'rest'; A.stT = 10; }
    else if (r < 0.75 && wet) { A.st = 'dabble'; A.stT = 2.5 + rnd() * 1.5; }
    else if (r < 0.88) { A.st = 'preen'; A.stT = 2 + rnd() * 2; }
    else { A.st = 'rest'; A.stT = 2 + rnd() * 3; }
  }
  let want = 0;
  if (A.st === 'go' && A.to) {
    const dx = A.to[0] - px, dz = A.to[1] - pz, d = Math.hypot(dx, dz);
    a.rotation.y = turnToward(a.rotation.y, Math.atan2(dx, dz), 1.2 * dt);
    want = (wet ? 0.28 : W.speed) * Math.min(1, d / 0.3);
    if (d < 0.1) { A.to = null; A.st = 'rest'; A.stT = 1 + rnd() * 3; }
  }
  A.v = (A.v ?? 0) + clamp(want - (A.v ?? 0), -0.4 * dt, 0.4 * dt);
  if (A.v > 1e-3) { a.position.x += Math.sin(a.rotation.y) * A.v * dt; a.position.z += Math.cos(a.rotation.y) * A.v * dt; }
  const wt = wet ? inWater(L, a.position.x, a.position.z) ?? L.water.find((w) => (w.r ? Math.hypot(a.position.x - w.cx, a.position.z - w.cz) < w.r + 1 : a.position.x > w.x0 - 1 && a.position.x < w.x1 + 1 && a.position.z > w.z0 - 1 && a.position.z < w.z1 + 1)) : null;
  const act = clamp(A.v / 0.1, 0, 1);
  A.cyc = ((A.cyc ?? 0) + dt / (wet ? 0.7 : W.period) * (act > 0.02 ? 1 : 0)) % 1;
  const cyc = A.cyc;
  if (wt) {
    a.position.y = wt.y - 0.055 + Math.sin(A.ph * 2.1) * 0.008; // floats low, riding the ripples
    a.rotation.z = Math.sin(A.ph * 1.7) * 0.03;
    for (const key in A.legs) { const L2 = A.legs[key]; L2.up.rotation.x = Math.sin(2 * Math.PI * (cyc + L2.phase)) * 0.6 * act - 0.5; L2.knee.rotation.x = 0; }
  } else {
    a.position.y = L.ground(a.position.x, a.position.z);
    stepLegs(A, A.legs, reachFor(A.v, W.period, W.duty), W.lift * act + 0.0001, 0);
    a.rotation.z = Math.sin(2 * Math.PI * cyc) * 0.13 * act; // the waddle
  }
  let pitch = 0, hx = 0, hy = 0;
  if (A.st === 'dabble') { const s = 1 - A.stT / 3; pitch = Math.sin(Math.min(1, s * 1.3) * Math.PI) > 0.2 ? 1.25 : 0; hx = 0.6; } // up-ends, tail to the sky
  else if (A.st === 'preen') { hy = Math.sin(A.ph * 1.5) > 0 ? 2.2 : -2.2; hx = 0.4; }
  else { hy = Math.sin(A.ph * 0.6) * 0.35; hx = Math.sin(A.ph * 3.1) * 0.05 + (act > 0 ? Math.sin(4 * Math.PI * cyc) * 0.08 * act : 0); }
  ease(A.body.rotation, 'x', pitch, 3, dt);
  ease(A.head.rotation, 'x', hx, 4, dt); ease(A.head.rotation, 'y', hy, 3, dt);
}

function egretStep(a, A, ctx) {
  const { dt, L, focus } = ctx, W = A.walk;
  const px = a.position.x, pz = a.position.z, dP = focus ? Math.hypot(px - focus.x, pz - focus.z) : 99;
  A.alarm = Math.max(0, (A.alarm ?? 0) - dt);
  if (dP < 3.8 && A.alarm <= 0 && focus) {
    A.alarm = 4; if (ctx.play) { ctx.play('splash'); ctx.play('chicken_flutter'); }
    const ax = px - focus.x, az = pz - focus.z, d = Math.hypot(ax, az) || 1;
    A.flightTo = [px + (ax / d) * 8, pz + (az / d) * 8];
  }
  const g = L.ground(px, pz), wt = inWater(L, px, pz), floor = wt ? Math.max(g, wt.y - 0.12) : g;
  if (A.alarm > 0 && A.flightTo) { // flies off low over the water and lands again
    const prog = 1 - A.alarm / 4, dx = A.flightTo[0] - px, dz = A.flightTo[1] - pz, d = Math.hypot(dx, dz) || 1;
    if (d > 0.2) { a.position.x += (dx / d) * dt * 2.6; a.position.z += (dz / d) * dt * 2.6; a.rotation.y = turnToward(a.rotation.y, Math.atan2(dx, dz), 5 * dt); }
    a.position.y = floor + Math.sin(prog * Math.PI) * 2.2;
    const open = Math.min(1, Math.sin(prog * Math.PI) * 4), flap = Math.sin(A.ph * 11) * open;
    for (const [wg, s] of [[A.wingL, -1], [A.wingR, 1]]) { wg.visible = open > 0.05; wg.scale.setScalar(Math.max(0.05, open)); wg.rotation.z = s * (Math.PI / 2 - flap * 0.6); }
    ease(A.neck.rotation, 'x', -0.5, 4, dt); ease(A.neck2.rotation, 'x', 0.9, 4, dt);
    for (const key in A.legs) { const L2 = A.legs[key]; L2.up.rotation.x = 0.9 * open; L2.knee.rotation.x = -0.4 * open; }
    A.home = [a.position.x, a.position.z];
    return;
  }
  A.wingL.visible = A.wingR.visible = false;
  // stalk: a slow step or two, freeze, strike
  A.stT = (A.stT ?? rnd() * 3) - dt;
  if (A.stT <= 0) {
    const r = rnd();
    if (r < 0.45) { A.to = pickWander(A.home, [px, pz], 2.5, rnd, (x, z) => Math.hypot(x, z) < WORLD_R - 2 && !(Math.abs(x) < HALF_W && Math.abs(z) < HALF_D), { min: 0.3, max: 0.9 }); A.st = A.to ? 'stalk' : 'freeze'; A.stT = 8; }
    else if (r < 0.75) { A.st = 'freeze'; A.stT = 2 + rnd() * 3; }
    else { A.st = 'strike'; A.stT = 0.9; }
  }
  let want = 0;
  if (A.st === 'stalk' && A.to) {
    const dx = A.to[0] - px, dz = A.to[1] - pz, d = Math.hypot(dx, dz);
    a.rotation.y = turnToward(a.rotation.y, Math.atan2(dx, dz), 0.8 * dt);
    want = W.speed * Math.min(1, d / 0.15);
    if (d < 0.05) { A.to = null; A.st = 'freeze'; A.stT = 1.5 + rnd() * 2; }
  }
  A.v = (A.v ?? 0) + clamp(want - (A.v ?? 0), -0.3 * dt, 0.3 * dt);
  if (A.v > 1e-3) { a.position.x += Math.sin(a.rotation.y) * A.v * dt; a.position.z += Math.cos(a.rotation.y) * A.v * dt; }
  a.position.y = floor;
  const act = clamp(A.v / 0.06, 0, 1);
  if (act > 0.01) A.cyc = ((A.cyc ?? 0) + dt / W.period) % 1;
  stepLegs(A, A.legs, reachFor(A.v, W.period, W.duty), W.lift * act + 0.0001, 0);
  // the neck: drawn back in an S while it waits, darted forward and down to strike
  let n1 = 0, n2 = 0;
  if (A.st === 'freeze') { n1 = 0.15; n2 = -0.25; }
  else if (A.st === 'strike') { const s = 1 - A.stT / 0.9; const hit = s < 0.3 ? s / 0.3 : Math.max(0, 1 - (s - 0.3) / 0.7); n1 = 0.15 + hit * 0.8; n2 = -0.25 + hit * 0.9; }
  else { n1 = Math.sin(4 * Math.PI * (A.cyc ?? 0)) * 0.05 * act; n2 = 0; }
  ease(A.neck.rotation, 'x', n1, A.st === 'strike' ? 25 : 3, dt); ease(A.neck2.rotation, 'x', n2, A.st === 'strike' ? 25 : 3, dt);
  A.body.rotation.x = A.st === 'strike' ? 0.15 : 0;
}

const ctx0 = { dt: 0, L: null, focus: null, play: null };
// every frame from world.js: advance every animal by dt seconds
export function updateAnimals(list, dt, { L, focus, play } = {}) {
  if (!dt || dt <= 0) return;
  dt = Math.min(dt, 0.1);
  ctx0.dt = dt; ctx0.L = L; ctx0.focus = focus ?? null; ctx0.play = play ?? null;
  for (const a of list) {
    const A = a.userData.animal; if (!A) continue;
    if (A.ph == null) A.ph = rnd() * 10;
    if (!A.home) A.home = [a.position.x, a.position.z];
    A.ph += dt;
    if (A.kind === 'grazer') grazer(a, A, ctx0);
    else if (A.kind === 'chicken') chickenStep(a, A, ctx0);
    else if (A.kind === 'duck') duckStep(a, A, ctx0);
    else if (A.kind === 'egret') egretStep(a, A, ctx0);
  }
}

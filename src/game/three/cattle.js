// Village cattle that read as real animals: a deshi cow (দেশি গাভী) and a zebu ox (ষাঁড়/বলদ). Each is sculpted
// as one smooth hide, not a pile of balls: a barrel lofted along its length with a straight back, hook and pin bones
// showing at the hips, a deep chest and a belly that hangs and tucks up at the flank; a small hump over the withers
// and a dewlap down the throat, as Bangladesh's zebu cattle have; a long head with a broad flat forehead, bony eye
// sockets, a narrow face and a wide wet muzzle; ears held out sideways under short curved horns; slim legs with
// knees, a hock that points back, fetlocks and dark cloven hooves; a long tail ending in a switch; and a udder on
// the cow. The coat is painted per vertex: red-brown, black, fawn or black-and-white, lighter on the belly.
// The animation hooks match props.js's animals (userData.animal: head, tail, ears, legs, torso), so world.js
// grazes, walks and swishes them the same way.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const COATS = {
  red: { base: '#8a4426', light: '#c08a5e', dark: '#4e2414', muzzle: '#6e5550', hoof: '#2a201b' }, // Red Chittagong
  black: { base: '#262120', light: '#4a403c', dark: '#141110', muzzle: '#8a7a72', hoof: '#1a1615' },
  fawn: { base: '#b08a62', light: '#e2cfb0', dark: '#6e5238', muzzle: '#3a302c', hoof: '#2a221d' },
  piebald: { base: '#ecebe6', light: '#f6f5f1', dark: '#1f1c1b', muzzle: '#d7a89c', hoof: '#2a221d', patches: true },
  grey: { base: '#d6d1c6', light: '#ece8de', dark: '#6f6a64', muzzle: '#2e2a28', hoof: '#2a221d' }, // the zebu ox
};
const ORDER = ['red', 'piebald', 'fawn', 'black'];
let herd = 0;

const mats = new Map();
const hide = () => mats.get('hide') ?? mats.set('hide', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 })).get('hide');
const shine = () => mats.get('shine') ?? mats.set('shine', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32 })).get('shine');
const C = (c) => new THREE.Color(c);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// a loft: rings of a superellipse round a path. sec(u) gives { c: centre, w: half-width, up, dn: half-heights above and
// below the path, pu, pd: squareness (lower = boxier) }; the frame keeps x as the animal's side.
function loft(sec, n = 40, m = 28) {
  const pos = [], idx = [], X = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= n; i++) {
    const u = i / n, s = sec(u), s2 = sec(Math.min(1, u + 1e-3)), s1 = sec(Math.max(0, u - 1e-3));
    const T = s2.c.clone().sub(s1.c).normalize(), N = new THREE.Vector3().crossVectors(T, X).normalize();
    for (let j = 0; j <= m; j++) {
      const th = (j / m) * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
      const top = sn >= 0, p = top ? s.pu : s.pd;
      const x = s.w * Math.sign(c) * Math.pow(Math.abs(c), p) * (top ? 1 - (s.narrowTop ?? 0.12) * sn : 1);
      const y = (top ? s.up : s.dn) * Math.sign(sn) * Math.pow(Math.abs(sn), top ? s.pu : s.pd);
      const v = s.c.clone().addScaledVector(N, y); v.x += x + (s.bump ? s.bump(c, sn) * Math.sign(c) : 0);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const a = i * (m + 1) + j, b = a + m + 1, c = a + 1, d = b + 1;
    idx.push(a, c, b, c, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// rounds a loft's ends to a close: 0 at u=0 and u=1, 1 inside
const ends = (u, a = 0.08, b = 0.08) => Math.sqrt(Math.max(0, 1 - (Math.max(0, a - u) / a) ** 2)) * Math.sqrt(Math.max(0, 1 - (Math.max(0, u - (1 - b)) / b) ** 2));
// a smooth curve through [u, value] keys
const keys = (k) => (u) => { for (let i = 0; i < k.length - 1; i++) if (u <= k[i + 1][0]) { const t = (u - k[i][0]) / (k[i + 1][0] - k[i][0]); return k[i][1] + (k[i + 1][1] - k[i][1]) * (t * t * (3 - 2 * t)); } return k[k.length - 1][1]; };

// the coat, painted by where a vertex sits on the animal (body coordinates)
function paint(geo, coat, at, opt = {}) {
  const p = geo.attributes.position, n = p.count, a = new Float32Array(n * 3), v = new THREE.Vector3(), c = new THREE.Color();
  const base = C(coat.base), light = C(coat.light), dark = C(coat.dark);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(at);
    if (opt.fixed) c.set(opt.fixed); else {
      c.copy(base);
      if (opt.belly !== false) c.lerp(light, smooth(1.05, 0.8, v.y) * 0.55); // the paler belly and inner legs
      c.lerp(dark, smooth(1.4, 1.5, v.y) * 0.18); // a darker line along the back
      if (coat.patches) { // black patches on white, as on the crossbred dairy cows
        const nz = Math.sin(v.x * 7.1 + v.z * 3.3) + Math.sin(v.z * 5.3 - v.y * 4.1 + 1.7) + Math.sin(v.y * 6.7 + v.x * 2.3 + v.z * 1.9);
        if (nz > 0.55 && v.y > 0.5) c.copy(dark);
      }
      if (opt.shade) c.lerp(dark, opt.shade(v));
      if (opt.hoofBelow != null && v.y < opt.hoofBelow) c.set(coat.hoof);
    }
    const j = 1 + (((i * 2654435761) % 1000) / 1000 - 0.5) * 0.06; // hair: a little unevenness
    a[i * 3] = c.r * j; a[i * 3 + 1] = c.g * j; a[i * 3 + 2] = c.b * j;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const I = new THREE.Matrix4();
const mesh = (geo, m = hide()) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true; return o; };

// a tapered tube along points: radius r0 at the start to r1 at the end
function taper(points, r0, r1, seg = 16, rad = 8) {
  const curve = new THREE.CatmullRomCurve3(points), g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, ctr = curve.getPointAt(t), r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; p.setXYZ(k, ctr.x + (p.getX(k) - ctr.x) * r, ctr.y + (p.getY(k) - ctr.y) * r, ctr.z + (p.getZ(k) - ctr.z) * r); }
  }
  g.computeVertexNormals();
  return g;
}

// one leg as a lathe, profile [radius, y] from the ground up; hooves dark below `hoofTop`
function legGeo(profile, coat, at, hoofTop) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const p = g.attributes.position; // a hoof and cannon are deeper front to back than they are wide
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < hoofTop + 0.12) p.setZ(i, p.getZ(i) * 1.18);
    const up = smooth(0.6, 0.95, y); p.setX(i, p.getX(i) * (1 - up * 0.25)); p.setZ(i, p.getZ(i) * (1 + up * 0.45)); // the forearm flattens into the chest
  }
  g.computeVertexNormals();
  return paint(g, coat, at, { belly: false, hoofBelow: hoofTop, shade: (v) => (!coat.patches && v.y < 0.42 ? 0.18 : 0) });
}

export function buildCattle(type = 'cow') {
  const ox = type === 'ox';
  const coat = COATS[ox ? 'grey' : ORDER[herd++ % ORDER.length]];
  const g = new THREE.Group(), w = new THREE.Group(); w.scale.setScalar(ox ? 1.08 : 0.96); g.add(w);
  const b = new THREE.Group(); w.add(b); // the torso: world.js breathes it, so it keeps scale 1

  // ---- the barrel, rump (u=0) to brisket (u=1) ----
  const z0 = -0.9, z1 = 0.8;
  const top = keys([[0, 1.33], [0.08, 1.38], [0.2, 1.43], [0.45, 1.4], [0.7, 1.42], [0.85, 1.47], [1, 1.38]]);
  const bot = keys([[0, 1.0], [0.12, 0.98], [0.24, 1.0], [0.4, 0.84], [0.58, 0.79], [0.78, 0.83], [0.92, 0.86], [1, 0.98]]);
  const half = keys([[0, 0.2], [0.1, 0.27], [0.2, 0.3], [0.32, 0.29], [0.52, 0.36], [0.7, 0.33], [0.88, 0.27], [1, 0.2]]);
  const body = loft((u) => {
    const e = ends(u, 0.07, 0.09), t = top(u), d = bot(u), mid = (t + d) / 2;
    const hooks = Math.exp(-(((u - 0.2) / 0.05) ** 2)) * 0.035, pins = Math.exp(-(((u - 0.05) / 0.035) ** 2)) * 0.03;
    return {
      c: new THREE.Vector3(0, mid, z0 + u * (z1 - z0)), w: half(u) * e, up: (t - mid) * e, dn: (mid - d) * e, pu: 0.55, pd: 0.8,
      narrowTop: 0.18, bump: (c, s) => (s > 0.4 && s < 0.95 ? (hooks + pins) * e : 0), // hook and pin bones at the top corners
    };
  }, 48, 30);
  b.add(mesh(paint(body, coat, I)));
  // the hump over the withers and the dewlap under the brisket
  const hump = new THREE.SphereGeometry(1, 16, 12); hump.scale(ox ? 0.15 : 0.11, ox ? 0.17 : 0.08, ox ? 0.2 : 0.16); hump.translate(0, ox ? 1.45 : 1.42, 0.5);
  b.add(mesh(paint(hump, coat, I, { shade: () => (ox ? 0.25 : 0.06) })));
  // the udder and four teats between the hind legs
  if (!ox) {
    const ud = new THREE.SphereGeometry(1, 16, 12); ud.scale(0.13, 0.1, 0.15); ud.translate(0, 0.9, -0.42);
    const teats = [];
    for (const [x, z] of [[-0.05, -0.36], [0.05, -0.36], [-0.05, -0.48], [0.05, -0.48]]) teats.push(new THREE.CylinderGeometry(0.014, 0.011, 0.07, 8).translate(x, 0.79, z));
    b.add(mesh(paint(mergeGeometries([ud, ...teats]), coat, I, { fixed: coat.patches ? '#e6b4a6' : C(coat.light).lerp(C('#d9a090'), 0.5).getStyle() })));
  }

  // ---- legs: pivots at the shoulders and hips ----
  const legs = {};
  const front = [[0.001, 0], [0.056, 0.002], [0.054, 0.06], [0.044, 0.085], [0.05, 0.13], [0.042, 0.2], [0.04, 0.37], [0.054, 0.44], [0.056, 0.5], [0.064, 0.56], [0.085, 0.76], [0.1, 0.92], [0.09, 1.0], [0.001, 1.04]];
  for (const [x, key] of [[-0.145, 'fL'], [0.145, 'fR']]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.95, 0.52); b.add(leg);
    const geo = legGeo(front, coat, new THREE.Matrix4().makeTranslation(x, 0, 0.52), 0.06); geo.translate(0, -0.95, 0);
    leg.add(mesh(geo)); legs[key] = leg;
  }
  for (const [x, key] of [[-0.15, 'bL'], [0.15, 'bR']]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.98, -0.6); b.add(leg);
    const at = new THREE.Matrix4().makeTranslation(x, 0.98, -0.6);
    // gaskin: from the hip down and back to the hock
    const L1 = Math.hypot(0.5, 0.13);
    const up = new THREE.LatheGeometry([[0.001, -L1 - 0.02], [0.056, -L1], [0.066, -L1 + 0.08], [0.085, -0.3], [0.095, -0.15], [0.001, -0.05]].map(([r, y]) => new THREE.Vector2(r, y)), 14);
    up.rotateX(0.255);
    leg.add(mesh(paint(up, coat, at, { belly: false })));
    // the round of the thigh: a muscle that swells out of the hindquarter and runs down into the gaskin
    const thigh = new THREE.SphereGeometry(1, 18, 14); thigh.scale(0.115, 0.34, 0.165); thigh.rotateX(0.32); thigh.translate(0, -0.15, -0.03);
    leg.add(mesh(paint(thigh, coat, at, { belly: false })));
    // cannon from the hock to the ground, the point of the hock behind
    const lo = legGeo([[0.001, 0], [0.054, 0.002], [0.052, 0.06], [0.043, 0.085], [0.049, 0.13], [0.04, 0.2], [0.039, 0.36], [0.052, 0.43], [0.06, 0.48], [0.001, 0.5]], coat, new THREE.Matrix4().makeTranslation(x, 0, -0.73), 0.06);
    lo.translate(0, -0.98, -0.13); leg.add(mesh(lo));
    const hock = new THREE.SphereGeometry(0.045, 10, 8).translate(0, -0.47, -0.19);
    leg.add(mesh(paint(hock, coat, at, { belly: false })));
    legs[key] = leg;
  }

  // ---- the neck and head, hanging from a pivot at the base of the neck (world.js lowers it to graze) ----
  const head = new THREE.Group(); head.position.set(0, 1.18, 0.66); b.add(head);
  const hAt = new THREE.Matrix4().makeTranslation(0, 1.18, 0.66);
  const poll = new THREE.Vector3(0, 0.24, 0.5);
  const neck = loft((u) => {
    const c = new THREE.Vector3(0, -0.02, -0.12).lerp(poll, u); c.y -= Math.sin(u * Math.PI) * 0.02;
    const e = ends(u, 0.001, 0.12);
    return { c, w: (0.21 - u * 0.1) * e, up: (0.27 - u * 0.15) * e, dn: (0.3 - u * 0.16 + Math.sin(u * Math.PI) * (ox ? 0.1 : 0.05)) * e, pu: 0.75, pd: 1.1, narrowTop: 0.2 };
  }, 24, 24);
  head.add(mesh(paint(neck, coat, hAt, { belly: false, shade: () => (ox ? 0.35 : 0) })));
  const dew = new THREE.SphereGeometry(1, 14, 10); dew.scale(0.03, ox ? 0.2 : 0.12, ox ? 0.3 : 0.24); dew.rotateX(-0.5); dew.translate(0, ox ? -0.24 : -0.2, 0.14);
  head.add(mesh(paint(dew, coat, hAt, { belly: false })));
  // the skull, built poll (z=0) to muzzle (z=0.5) and tipped nose-down
  const skull = new THREE.Group(); skull.position.copy(poll); skull.rotation.x = 0.95; head.add(skull);
  const sAt = hAt.clone().multiply(new THREE.Matrix4().compose(poll, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.95, 0, 0)), new THREE.Vector3(1, 1, 1)));
  const sw = keys([[0, 0.12], [0.12, 0.145], [0.3, 0.148], [0.55, 0.105], [0.75, 0.095], [0.9, 0.11], [1, 0.1]]);
  const sdn = keys([[0, 0.1], [0.2, 0.15], [0.45, 0.12], [0.75, 0.085], [0.95, 0.085], [1, 0.08]]);
  const head3 = loft((u) => {
    const e = ends(u, 0.06, 0.06), orb = Math.exp(-(((u - 0.3) / 0.07) ** 2)) * 0.025; // the bony eye sockets
    return { c: new THREE.Vector3(0, 0, u * 0.5), w: sw(u) * e, up: 0.075 * e, dn: sdn(u) * e, pu: 0.45, pd: 0.8, narrowTop: 0.05, bump: (c, s) => (s > -0.2 && s < 0.6 ? orb : 0) };
  }, 30, 26);
  skull.add(mesh(paint(head3, coat, sAt, { belly: false, shade: (v) => (coat === COATS.red ? 0.12 : 0) })));
  // the muzzle pad and nostrils
  const pad = new THREE.SphereGeometry(1, 16, 12); pad.scale(0.1, 0.07, 0.04); pad.translate(0, -0.005, 0.475);
  skull.add(mesh(paint(pad, coat, I, { fixed: coat.muzzle }), shine()));
  for (const s of [-1, 1]) {
    const nos = new THREE.SphereGeometry(1, 10, 8); nos.scale(0.022, 0.014, 0.012); nos.rotateZ(s * 0.5); nos.translate(s * 0.04, 0.02, 0.508);
    skull.add(mesh(paint(nos, coat, I, { fixed: '#1a1412' })));
    // the eyes, dark and shining under the brow
    const eye = new THREE.SphereGeometry(0.03, 12, 10); eye.scale(0.55, 0.8, 0.95); eye.translate(s * 0.16, 0.03, 0.15);
    skull.add(mesh(paint(eye, coat, I, { fixed: '#0e0a09' }), shine()));
  }
  // the poll's tuft of hair between the horns
  const tuft = new THREE.SphereGeometry(1, 12, 8); tuft.scale(0.08, 0.04, 0.05); tuft.translate(0, 0.06, 0.02);
  skull.add(mesh(paint(tuft, coat, sAt, { belly: false, shade: () => 0.15 })));

  // ears: held out to the side just under the horns, a little drooped, the inside paler
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(s * 0.13, 0.27, 0.48); head.add(ear);
    const outer = new THREE.SphereGeometry(1, 14, 10); outer.scale(0.12, 0.035, 0.065); outer.translate(s * 0.1, 0, 0);
    ear.add(mesh(paint(outer, coat, I, { fixed: C(coat.base).lerp(C(coat.dark), 0.15).getStyle() })));
    const inner = new THREE.SphereGeometry(1, 12, 8); inner.scale(0.1, 0.02, 0.05); inner.translate(s * 0.1, -0.012, 0.012);
    ear.add(mesh(paint(inner, coat, I, { fixed: coat.patches ? '#e8c4b8' : C(coat.light).lerp(C('#c99a8a'), 0.4).getStyle() })));
    ear.rotation.z = -s * 0.3; ear.rotation.y = s * 0.25;
    ears.push(ear);
  }
  // horns: out from the poll, then up and a little forward; pale at the root, dark at the tip
  for (const s of [-1, 1]) {
    const o = new THREE.Vector3(s * 0.08, 0.29, 0.47), L = ox ? 1.6 : 1;
    const pts = [o, o.clone().add(new THREE.Vector3(s * 0.07 * L, 0.03 * L, -0.01)), o.clone().add(new THREE.Vector3(s * 0.12 * L, 0.1 * L, 0.0)), o.clone().add(new THREE.Vector3(s * 0.12 * L, 0.18 * L, 0.04 * L))];
    const horn = taper(pts, 0.032, 0.006, 14, 8);
    const pc = horn.attributes.position, hc = new Float32Array(pc.count * 3), root = C('#d8ccb0'), tip = C('#3a3029'), c = new THREE.Color();
    for (let i = 0; i < pc.count; i++) { const t = Math.floor(i / 9) / 14; c.copy(root).lerp(tip, smooth(0.55, 1, t)); hc[i * 3] = c.r; hc[i * 3 + 1] = c.g; hc[i * 3 + 2] = c.b; }
    horn.setAttribute('color', new THREE.BufferAttribute(hc, 3));
    head.add(mesh(horn, shine()));
  }

  // ---- the tail: from the tail head over the rump, hanging to the hocks, a switch of long hair at the end ----
  const tail = new THREE.Group(); tail.position.set(0, 1.36, -0.86); b.add(tail);
  const tg = taper([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.04, -0.07), new THREE.Vector3(0, -0.3, -0.1), new THREE.Vector3(0, -0.7, -0.07)], 0.04, 0.016, 16, 8);
  tail.add(mesh(paint(tg, coat, new THREE.Matrix4().makeTranslation(0, 1.36, -0.86), { belly: false })));
  const sw2 = new THREE.SphereGeometry(1, 12, 10); sw2.scale(0.05, 0.15, 0.05); sw2.translate(0, -0.8, -0.07);
  tail.add(mesh(paint(sw2, coat, I, { fixed: coat.patches ? '#f1efe9' : C(coat.dark).lerp(C('#000000'), 0.2).getStyle() })));

  g.userData.animal = { kind: 'grazer', head, tail, earL: ears[0], earR: ears[1], legs, torso: b };
  return g;
}

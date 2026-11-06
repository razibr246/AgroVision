// A banana plant (কলা গাছ) that reads as the real thing, not a post with green planks: a pseudostem of leaf sheaths,
// green streaked with brown and dark blotches, drying brown at the foot; a crown of huge oblong leaves that rise on
// their stalks, arch over and droop, each with a pale midrib and its blade torn into strips by the wind (the old
// ones most); a rolled new "cigar" leaf standing in the middle; two dead leaves hanging brown against the stem; a
// bunch hanging on its curved stalk, six hands of green fingers turned up toward the light, the bare stalk below and
// the maroon flower bud (মোচা) at its end; and a young sucker at the foot. Geometry is built once per variant and shared.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const cache = new Map();
const mats = {};
const col = (c) => new THREE.Color(c);

// give a geometry a plain vertex colour, so it can be merged with the coloured leaves
function paint(geo, c, jitter = 0, rnd = Math.random) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3), k = col(c);
  for (let i = 0; i < n; i++) { const j = 1 + (rnd() - 0.5) * jitter; a[i * 3] = k.r * j; a[i * 3 + 1] = k.g * j; a[i * 3 + 2] = k.b * j; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

// One leaf along +z from its foot at the origin: a stalk rising at th0 that bends over to th1 at the tip, the blade
// on both sides of the midrib sloping down from it, cut into strips where the wind has torn it.
function leafGeometry({ len = 2, stalk = 0.45, width = 0.3, th0 = 1.1, th1 = -0.6, tear = 0.3, old = 0, dead = false, rnd }) {
  // the midrib, integrated from its bending angle
  const M = 60, pts = [], ang = [];
  let y = 0, z = 0;
  for (let i = 0; i <= M; i++) {
    const s = (i / M) * len, th = th0 + (th1 - th0) * Math.pow(s / len, 1.35);
    pts.push(new THREE.Vector3(0, y, z)); ang.push(th);
    y += Math.sin(th) * (len / M); z += Math.cos(th) * (len / M);
  }
  const at = (s) => { const f = Math.min(M - 1e-6, (s / len) * M), i = Math.floor(f), t = f - i; return [pts[i].clone().lerp(pts[i + 1], t), ang[i] + (ang[i + 1] - ang[i]) * t]; };
  const pos = [], cols = [], idx = [];
  const green = dead ? col('#7a5a34') : col(old > 0.5 ? '#3d7326' : '#2f6e22'), edge = dead ? col('#a8834e') : col(old > 0.5 ? '#6f9a34' : '#4f9a30');
  const dry = col(dead ? '#5e4428' : '#9c8a42'), rib = dead ? col('#8a6a40') : col('#b7c46a');
  const S = 22, F = 4, phi = dead ? 1.3 : 0.22; // a dead leaf hangs folded shut
  for (const side of [-1, 1]) {
    for (let k = 0; k < S; k++) {
      const torn = !dead && k > 1 && k < S - 2 && rnd() < tear;
      const t0 = k / S, t1 = (k + 1) / S - (torn ? 0.012 : 0), sag = (torn ? 0.12 + rnd() * 0.2 : 0) + (dead ? 0.3 : 0);
      const base = pos.length / 3, tint = 0.92 + rnd() * 0.16;
      for (const t of [t0, t1]) {
        const s = stalk + t * (len - stalk), [P, th] = at(s);
        // an oblong blade: rounded at the foot, nearly even along its length, a blunt round tip
        const w = width * Math.pow(Math.min(1, t * 5), 0.5) * Math.pow(Math.min(1, (1 - t) * 6), 0.55);
        const N = new THREE.Vector3(0, Math.cos(th), -Math.sin(th));
        for (let f = 0; f <= F; f++) {
          const u = f / F, d = u * w;
          const drop = d * Math.sin(phi) + u * u * w * (0.18 + sag) + Math.sin(t * 47 + side) * 0.012 * u;
          const p = P.clone().addScaledVector(N, -drop); p.x += side * d * Math.cos(phi + sag * 0.6);
          pos.push(p.x, p.y, p.z);
          const c = green.clone().lerp(edge, u * 0.6);
          if (old > 0 && u > 0.7) c.lerp(dry, (u - 0.7) * 3.3 * old * (0.4 + rnd() * 0.6));
          if (u === 0) c.lerp(rib, 0.7);
          cols.push(c.r * tint, c.g * tint, c.b * tint);
        }
      }
      for (let f = 0; f < F; f++) { const a = base + f, b = base + f + 1, c = base + F + 1 + f, d = base + F + 2 + f; idx.push(a, c, b, b, c, d); }
    }
  }
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  blade.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  blade.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  blade.setIndex(idx); blade.computeVertexNormals();
  // the stalk and midrib: a channelled stalk that thins toward the tip
  const curve = new THREE.CatmullRomCurve3(pts.filter((_, i) => i % 4 === 0 || i === M));
  const tube = paint(new THREE.TubeGeometry(curve, 30, dead ? 0.018 : 0.024, 5, false), dead ? '#6a5030' : '#a9bb5a');
  const g = mergeGeometries([blade, tube]); blade.dispose(); tube.dispose();
  return g;
}

// the pseudostem's skin: green sheaths with darker streaks and brown-black blotches, dry brown strips at the foot
function stemMat() {
  if (mats.stem) return mats.stem;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext('2d');
  const grd = x.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#7f9c42'); grd.addColorStop(0.6, '#6f8a3a'); grd.addColorStop(1, '#6b6234');
  x.fillStyle = grd; x.fillRect(0, 0, 64, 256);
  let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(${r() < 0.5 ? '70,95,40' : '150,175,90'},0.35)`; x.fillRect(r() * 64, 0, 1 + r() * 2, 256); }
  for (let k = 0; k < 26; k++) { x.fillStyle = `rgba(60,36,30,${0.35 + r() * 0.35})`; x.beginPath(); x.ellipse(r() * 64, r() * 220, 1.5 + r() * 3, 3 + r() * 8, 0, 0, Math.PI * 2); x.fill(); }
  for (let k = 0; k < 9; k++) { x.fillStyle = `rgba(${130 + r() * 30},${95 + r() * 20},55,0.85)`; x.fillRect(r() * 64, 150 + r() * 60, 4 + r() * 8, 40 + r() * 60); } // dry sheath strips
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(2, 1);
  mats.stem = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  return mats.stem;
}
const leafMat = () => (mats.leaf ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, side: THREE.DoubleSide }));
const fruitMat = () => (mats.fruit ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));

// the hanging bunch, from the top of the stem: the stalk, the hands of fingers, the bare stalk and the bud
function bunchGeometry(rnd) {
  const parts = [];
  const top = [new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.12, 0.3, 0.08), new THREE.Vector3(0.32, 0.26, 0.2), new THREE.Vector3(0.42, 0.0, 0.26)];
  const hang = [new THREE.Vector3(0.44, -0.3, 0.27), new THREE.Vector3(0.45, -0.75, 0.28), new THREE.Vector3(0.44, -1.15, 0.27), new THREE.Vector3(0.43, -1.32, 0.26)];
  parts.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...top, ...hang]), 40, 0.03, 6, false), '#667e30', 0.1, rnd));
  const fingerGeo = (L) => {
    const g = new THREE.CapsuleGeometry(0.024, L, 3, 7); g.translate(0, L / 2 + 0.024, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i); p.setX(i, p.getX(i) + yy * yy * 0.9); } // the finger curves out and up
    g.computeVertexNormals(); return g;
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let h = 0; h < 6; h++) {
    const yH = -0.12 - h * 0.11, L = 0.15 - h * 0.012, n = 9 - Math.floor(h / 2);
    for (let row = 0; row < 2; row++) for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 1.6 - 0.2 + h * 0.9 + row * 0.18, tilt = 0.55 - row * 0.12;
      const g = paint(fingerGeo(L), rnd() < 0.08 ? '#9aa83a' : '#6d9a2c', 0.12, rnd);
      e.set(0, -a, -tilt, 'YXZ'); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(0.44 + Math.cos(a) * 0.045, yH - row * 0.04, 0.27 + Math.sin(a) * 0.045), q, new THREE.Vector3(1, 1, 1));
      parts.push(g.applyMatrix4(m4));
    }
  }
  // the bud: a long maroon teardrop, one bract lifting off it
  const prof = []; for (let i = 0; i <= 12; i++) { const u = i / 12; prof.push(new THREE.Vector2(Math.max(0.002, 0.09 * Math.pow(Math.sin(Math.PI * u), 0.75) * (1 - 0.5 * u)), -0.32 * u)); }
  const bud = paint(new THREE.LatheGeometry(prof, 12), '#5a1631', 0.15, rnd); bud.translate(0.43, -1.3, 0.26); parts.push(bud);
  const bract = paint(new THREE.SphereGeometry(0.07, 8, 6, 0, Math.PI * 0.8, 0, Math.PI * 0.6), '#6e1c3a', 0.1, rnd);
  bract.rotateX(0.6); bract.translate(0.46, -1.32, 0.3); parts.push(bract);
  for (const p of parts) if (!p.index) throw new Error('bunch part not indexed');
  const g = mergeGeometries(parts); for (const p of parts) p.dispose();
  return g;
}

function plantGeometry(variant) {
  if (cache.has(variant)) return cache.get(variant);
  let s = (variant * 7919 + 13) % 2147483647 || 5; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const parts = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const put = (geo, ry, y = 0, rx = 0) => { e.set(rx, ry, 0, 'YXZ'); q.setFromEuler(e); m4.compose(new THREE.Vector3(0, y, 0), q, one); parts.push(geo.applyMatrix4(m4)); };
  const n = 8 + (variant % 2);
  for (let k = 0; k < n; k++) {
    const age = k / (n - 1); // 0 = oldest, lowest, most torn; 1 = youngest, upright
    put(leafGeometry({ len: 2.0 + rnd() * 0.4 - age * 0.25, stalk: 0.35 + age * 0.15, width: 0.27 + rnd() * 0.05, th0: 0.75 + age * 0.55, th1: -0.95 + age * 0.75, tear: 0.45 - age * 0.35, old: 1 - age, rnd }), k * 2.39996 + rnd() * 0.3, -0.12 * (1 - age));
  }
  for (let k = 0; k < 2; k++) put(leafGeometry({ len: 1.2, stalk: 0.08, width: 0.15, th0: -1.35, th1: -1.6, tear: 0, dead: true, rnd }).translate(0, 0, 0.13), k * 3.0 + 1.2 + rnd(), -0.12); // snapped at the stalk, hanging against the stem
  const cigar = paint(new THREE.ConeGeometry(0.045, 0.75, 8), '#a6c95a', 0.08, rnd); cigar.translate(0, 0.42, 0); parts.push(cigar);
  const g = { leaves: mergeGeometries(parts), bunch: bunchGeometry(rnd) };
  for (const p of parts) p.dispose();
  // a sword sucker at the foot: a short stem and three narrow upright leaves
  const sp = [];
  for (let k = 0; k < 3; k++) { const l = leafGeometry({ len: 0.75, stalk: 0.12, width: 0.08, th0: 1.35, th1: 0.2, tear: 0, old: 0, rnd }); e.set(0, k * 2.1, 0, 'YXZ'); q.setFromEuler(e); m4.compose(new THREE.Vector3(0, 0.38, 0), q, one); sp.push(l.applyMatrix4(m4)); }
  g.sucker = mergeGeometries(sp); for (const p of sp) p.dispose();
  cache.set(variant, g);
  return g;
}

// A whole banana plant, its foot at the origin. The crown (userData.crown) holds the leaves and the bunch, so
// world.js sways it; the stem and the sucker stay still and are baked.
export function buildBanana({ seed = 1, h = 2.1, sway = 0.09 } = {}) {
  const g = new THREE.Group(), geo = plantGeometry(seed % 3);
  const sg = new THREE.CylinderGeometry(0.115, 0.17, h, 14, 6, false).translate(0, h / 2, 0);
  const p = sg.attributes.position; // swollen at the corm, a little uneven where sheaths overlap
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + Math.max(0, 1 - y / 0.35) * 0.35 + Math.sin(y * 9 + Math.atan2(p.getZ(i), p.getX(i)) * 3) * 0.02; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  sg.computeVertexNormals();
  const stem = new THREE.Mesh(sg, stemMat()); stem.castShadow = true; stem.receiveShadow = true; g.add(stem);
  const crown = new THREE.Group(); crown.position.set(0, h, 0); crown.rotation.y = seed * 1.3; crown.userData.crown = true; crown.userData.swayAmp = sway; g.add(crown);
  const leaves = new THREE.Mesh(geo.leaves, leafMat()); leaves.castShadow = true; crown.add(leaves);
  const bunch = new THREE.Mesh(geo.bunch, fruitMat()); bunch.castShadow = true; crown.add(bunch);
  const a = seed * 2.2, sx = Math.cos(a) * 0.42, sz = Math.sin(a) * 0.42;
  const ss = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.42, 8).translate(sx, 0.21, sz), stemMat()); ss.castShadow = true; g.add(ss);
  const suck = new THREE.Mesh(geo.sucker, leafMat()); suck.position.set(sx, 0, sz); suck.castShadow = true; g.add(suck);
  return g;
}

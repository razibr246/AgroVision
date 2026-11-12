// Trees that read as real trees, not balls on sticks: a trunk that splits into limbs and twigs, and a crown made of
// a few hundred leaf-cluster cards (a drawn spray of leaves, cut out by alpha) gathered in clumps at the twig tips,
// so the crown has a ragged edge, gaps with sky between, darker leaves inside and below, sunlit leaves on top, and
// leaf-shaped shadows. Shared by the game world (props.js) and the scenes behind the characters (backdrop.js).
// Geometry and leaf textures are made once per kind and reused; the crown is one group (userData.crown) so
// world.js can sway it in the wind.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---- the leaf sprays, drawn once: 'narrow' (mango, eucalyptus, bamboo: long pointed leaves), 'broad' (sal, jackfruit,
// guava: wide oval leaves), 'feather' (tamarind, acacia: rows of tiny leaflets)
const texCache = {};
function leafTexture(style) {
  if (texCache[style]) return texCache[style];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  let seed = style.length * 97 + 13; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (style === 'core') { x.fillStyle = '#2a4a1c'; x.fillRect(0, 0, S, S); } // the crown's heart: leaves all the way, no gaps
  // real leaf greens, from the shaded back of the clump to the sunlit front
  const back = ['#1f3f17', '#27501c', '#2c5a20'], mid = ['#3b6e28', '#457a2e', '#4f8634'], front = ['#5f9a3c', '#6fa846', '#82b652', '#97c05e'];
  const n = style === 'feather' ? 70 : style === 'broad' ? 34 : 44;
  for (let k = 0; k < n; k++) {
    const layer = k / n, pal = layer < 0.35 ? back : layer < 0.7 ? mid : front;
    // leaves sprout from a few twig points inside a rough circle and point outward, so the clump has a leafy rim
    const a0 = r() * Math.PI * 2, d0 = Math.sqrt(r()) * S * 0.2;
    const bx = S / 2 + Math.cos(a0) * d0, by = S / 2 + Math.sin(a0) * d0;
    const ang = a0 + Math.PI / 2 + (r() - 0.5) * 1.2;
    const [rx, ry] = style === 'broad' ? [13 + r() * 6, 24 + r() * 8] : style === 'feather' ? [3.5 + r() * 1.5, 10 + r() * 4] : [6 + r() * 3, 27 + r() * 9];
    x.save(); x.translate(bx, by); x.rotate(ang);
    const gr = x.createLinearGradient(-rx, 0, rx, 0); const c0 = pal[Math.floor(r() * pal.length)];
    gr.addColorStop(0, c0); gr.addColorStop(1, shadeHex(c0, 0.18));
    x.fillStyle = gr;
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(rx * 1.6, -ry, 0, -ry * 2.05); x.quadraticCurveTo(-rx * 1.6, -ry, 0, 0); x.fill(); // a pointed leaf
    x.strokeStyle = 'rgba(20,40,12,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -ry * 1.9); x.stroke(); // midrib
    x.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (style === 'core') { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); }
  texCache[style] = t; return t;
}
function shadeHex(hex, k) { const c = new THREE.Color(hex); c.lerp(new THREE.Color('#e8f4c8'), k); return '#' + c.getHexString(); }
const matCache = {};
function leafMaterial(style) {
  if (matCache[style]) return matCache[style];
  const map = leafTexture(style);
  const m = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: 0.78 });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 }); // leaf-shaped shadows
  return (matCache[style] = { m, depth });
}
const coreMats = {};
const coreMaterial = (hex) => coreMats[hex] ?? (coreMats[hex] = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).multiplyScalar(0.55), roughness: 1, map: leafTexture('core') }));
let barkMat = null;
const barkMaterial = () => barkMat ?? (barkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));

// ---- the kinds
export const TREES = {
  mango: { h: 2.3, R: 2.7, sy: 0.78, limbs: 4, style: 'narrow', leaf: '#2f6428', bark: '#5e4430', cards: 240, thick: 0.3 },
  jackfruit: { h: 2.8, R: 2.4, sy: 0.95, limbs: 4, style: 'broad', leaf: '#2c5a26', bark: '#5a4632', cards: 220, thick: 0.3 },
  sal: { h: 5.2, R: 1.9, sy: 1.15, limbs: 3, style: 'broad', leaf: '#3a6a2c', bark: '#544232', cards: 190, thick: 0.26 },
  tamarind: { h: 2.6, R: 3.3, sy: 0.6, limbs: 5, style: 'feather', leaf: '#4f7a30', bark: '#4e3b2b', cards: 260, thick: 0.42 },
  eucalyptus: { h: 7.5, R: 1.6, sy: 1.7, limbs: 3, style: 'narrow', leaf: '#6f8f62', bark: '#d6cfbf', cards: 150, thick: 0.2, sparse: true },
  poplar: { h: 1.8, R: 0.95, sy: 3.2, limbs: 3, style: 'broad', leaf: '#6f9a3c', bark: '#9a9488', cards: 170, thick: 0.15, upright: true },
  kikar: { h: 2.3, R: 2.6, sy: 0.38, limbs: 4, style: 'feather', leaf: '#6e8040', bark: '#4e3b2b', cards: 200, thick: 0.17 },
  guava: { h: 1.3, R: 1.5, sy: 0.85, limbs: 3, style: 'broad', leaf: '#4f8a34', bark: '#8a6a4c', cards: 140, thick: 0.15 },
  hijal: { h: 2.1, R: 2.1, sy: 0.7, limbs: 4, style: 'broad', leaf: '#3c7030', bark: '#4a3628', cards: 180, thick: 0.25 },
  banyan: { h: 3.2, R: 4.6, sy: 0.5, limbs: 6, style: 'broad', leaf: '#24502a', bark: '#4a3628', cards: 420, thick: 0.62 },
  mangrove: { h: 2.4, R: 2.2, sy: 0.85, limbs: 4, style: 'narrow', leaf: '#2a5530', bark: '#4a3628', cards: 190, thick: 0.22 },
};

const UP = new THREE.Vector3(0, 1, 0);
// a tapered branch from a to b, as geometry with the bark colour in its vertices
function branch(a, b, r0, r1, col) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 7, 1, true).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())).translate(a.x, a.y, a.z);
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { const f = 0.85 + ((k * 13) % 7) / 40; c[k * 3] = col.r * f; c[k * 3 + 1] = col.g * f; c[k * 3 + 2] = col.b * f; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// A whole tree, its foot at the origin. `lite` makes fewer leaf cards (the far horizon).
export function buildTree(kind = 'mango', { seed = 1, scale = 1, lite = false, sway = 0.05 } = {}) {
  const K = TREES[kind] ?? TREES.mango;
  let s = (Math.abs(Math.round(seed * 7919)) % 2147483646) + 1; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const g = new THREE.Group();
  const barkC = new THREE.Color(K.bark), h = K.h * scale, R = K.R * scale, sy = K.sy;
  const top = new THREE.Vector3((rnd() - 0.5) * 0.3 * scale, h, (rnd() - 0.5) * 0.3 * scale);
  const centre = new THREE.Vector3(top.x, h + R * sy * 0.55, top.z);
  // the skeleton: trunk, limbs out and up into the crown, two twigs on each limb
  const wood = [branch(new THREE.Vector3(0, -0.05, 0), top, K.thick * scale, K.thick * 0.72 * scale, barkC)];
  const tips = [];
  for (let k = 0; k < K.limbs; k++) {
    const a = (k / K.limbs) * Math.PI * 2 + rnd() * 0.8, out = K.upright ? 0.25 : 0.62;
    const end = new THREE.Vector3(top.x + Math.cos(a) * R * out, h + R * sy * (K.upright ? 1.1 : 0.42 + rnd() * 0.2), top.z + Math.sin(a) * R * out);
    wood.push(branch(top, end, K.thick * 0.62 * scale, K.thick * 0.3 * scale, barkC));
    for (let j = 0; j < 2; j++) {
      const b = a + (j ? 0.55 : -0.55), tip = new THREE.Vector3(end.x + Math.cos(b) * R * 0.32, end.y + R * sy * (0.12 + rnd() * 0.25), end.z + Math.sin(b) * R * 0.32);
      wood.push(branch(end, tip, K.thick * 0.28 * scale, K.thick * 0.1 * scale, barkC)); tips.push(tip);
    }
  }
  const trunk = new THREE.Mesh(mergeGeometries(wood), barkMaterial()); trunk.castShadow = true; trunk.receiveShadow = true; g.add(trunk);
  for (const w of wood) w.dispose();

  // the crown: clumps at the twig tips and through the outer shell, each a handful of leaf cards
  const crown = new THREE.Group(); crown.position.copy(centre); crown.userData.crown = true; crown.userData.swayAmp = sway; g.add(crown);
  const cards = Math.round(K.cards * 1.8 * (lite ? 0.35 : 1) * (K.sparse ? 0.75 : 1));
  const clumps = tips.map((t) => t.clone().sub(centre));
  while (clumps.length < Math.max(8, Math.round(cards / 9))) {
    const th = rnd() * Math.PI * 2, ph = Math.acos(1 - rnd() * 1.75), rr = 0.55 + rnd() * 0.4; // more clumps on top than underneath
    clumps.push(new THREE.Vector3(Math.sin(ph) * Math.cos(th) * R * rr, Math.cos(ph) * R * sy * rr - R * sy * 0.08, Math.sin(ph) * Math.sin(th) * R * rr));
  }
  const tint = new THREE.Color(K.leaf).lerp(new THREE.Color('#ffffff'), 0.55).multiplyScalar(1.25), pos = [], nor = [], col = [], uv = [], idx = []; // a species' hue over the leaves' own greens
  const size = (K.style === 'feather' ? 0.62 : K.style === 'broad' ? 0.66 : 0.7) * Math.max(0.6, scale);
  for (let k = 0; k < cards; k++) {
    const c = clumps[k % clumps.length], rc = R * 0.22;
    const p = new THREE.Vector3(c.x + (rnd() - 0.5) * rc * 2, c.y + (rnd() - 0.5) * rc * 1.6, c.z + (rnd() - 0.5) * rc * 2);
    // the card hangs from its twig: mostly upright, turned any way, tipped a little
    const yaw = rnd() * Math.PI * 2, tilt = (rnd() - 0.5) * 2.4 + (K.sparse ? 0.4 : 0);
    const u = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)).multiplyScalar(size * (0.8 + rnd() * 0.4) / 2);
    const v = new THREE.Vector3(-Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), Math.cos(yaw) * Math.sin(tilt)).multiplyScalar(size * (0.85 + rnd() * 0.4) / 2);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    // light: darker inside and below the crown, brighter on the outer top; the normal points out of the crown (soft, round shading)
    const out = Math.min(1, p.length() / R), high = THREE.MathUtils.clamp(p.y / (R * sy) * 0.5 + 0.5, 0, 1);
    const shade = 0.5 + out * 0.3 + high * 0.28 + (rnd() - 0.5) * 0.12;
    const i0 = pos.length / 3;
    for (const [a, b] of corners) {
      const q = p.clone().addScaledVector(u, a).addScaledVector(v, b);
      pos.push(q.x, q.y, q.z);
      const nn = q.clone().multiply(new THREE.Vector3(1, 1 / Math.max(0.5, sy), 1)).normalize(); nor.push(nn.x, nn.y, nn.z);
      col.push(tint.r * shade, tint.g * shade, tint.b * shade);
      uv.push((a + 1) / 2, (b + 1) / 2);
    }
    idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  fg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  fg.setIndex(idx);
  const { m, depth } = leafMaterial(K.style);
  const leaves = new THREE.Mesh(fg, m); leaves.customDepthMaterial = depth; leaves.castShadow = true; leaves.receiveShadow = true;
  crown.add(leaves);
  if (!K.sparse) { // the shaded heart of the crown: an uneven mass of dark leaves behind the cards
    const core = new THREE.IcosahedronGeometry(1, lite ? 1 : 3), cp = core.attributes.position;
    for (let k = 0; k < cp.count; k++) { const v = new THREE.Vector3().fromBufferAttribute(cp, k), w = 0.82 + 0.18 * Math.sin(v.x * 5.1 + seed) * Math.cos(v.z * 4.3 - seed) + (rnd() - 0.5) * 0.08; cp.setXYZ(k, v.x * R * 0.68 * w, v.y * R * sy * 0.62 * w, v.z * R * 0.68 * w); }
    core.computeVertexNormals();
    const cm = new THREE.Mesh(core, coreMaterial(K.leaf)); cm.receiveShadow = true; cm.castShadow = true; cm.position.y = -R * sy * 0.05; crown.add(cm);
  }
  return g;
}

// A bamboo clump (বাঁশঝাড়): culms that rise and arch outward, ringed at the nodes, with sprays of narrow leaves
// along their upper halves hanging from the bend.
export function buildBamboo({ seed = 1, scale = 1, culms = 11, sway = 0.1 } = {}) {
  let s = (Math.abs(Math.round(seed * 7919)) % 2147483646) + 1; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const g = new THREE.Group();
  const crown = new THREE.Group(); crown.userData.crown = true; crown.userData.swayAmp = sway; g.add(crown);
  const wood = [], pos = [], nor = [], col = [], uv = [], idx = [];
  const green = new THREE.Color('#8aa83e'), node = new THREE.Color('#5c7a2a'), tint = new THREE.Color('#5f8f30');
  for (let k = 0; k < culms; k++) {
    const a = k * 2.4 + rnd() * 0.5, r0 = (0.12 + (k % 4) * 0.09) * scale, H = (6 + rnd() * 2.2) * scale, bend = (0.9 + rnd() * 1.2) * scale;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(Math.cos(a) * r0, 0, Math.sin(a) * r0),
      new THREE.Vector3(Math.cos(a) * r0 * 1.4, H * 0.6, Math.sin(a) * r0 * 1.4),
      new THREE.Vector3(Math.cos(a) * (r0 + bend), H, Math.sin(a) * (r0 + bend)));
    const tube = new THREE.TubeGeometry(curve, 16, 0.045 * scale, 6, false);
    const n = tube.attributes.position.count, c = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) { const seg = Math.floor(v / 7), ring = seg % 2 === 0 && seg > 0; const cc = ring ? node : green; c[v * 3] = cc.r; c[v * 3 + 1] = cc.g; c[v * 3 + 2] = cc.b; }
    tube.setAttribute('color', new THREE.BufferAttribute(c, 3)); wood.push(tube);
    // leaf sprays along the upper half, hanging out and down from the culm
    for (let j = 0; j < 9; j++) {
      const t = 0.45 + (j / 9) * 0.55, p = curve.getPoint(t), yaw = a + (rnd() - 0.5) * 2.4, sz = (0.8 + rnd() * 0.4) * scale;
      const u = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)).multiplyScalar(sz / 2), v = new THREE.Vector3(Math.cos(yaw + 1.57) * 0.3, -1, Math.sin(yaw + 1.57) * 0.3).normalize().multiplyScalar(sz / 2);
      const c0 = p.clone().addScaledVector(v, 0.8), i0 = pos.length / 3, shade = 0.6 + t * 0.45 + (rnd() - 0.5) * 0.12;
      for (const [aa, bb] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const q = c0.clone().addScaledVector(u, aa).addScaledVector(v, -bb); pos.push(q.x, q.y, q.z);
        const nn = new THREE.Vector3(q.x, 0.6, q.z).normalize(); nor.push(nn.x, nn.y, nn.z);
        col.push(tint.r * shade, tint.g * shade, tint.b * shade); uv.push((aa + 1) / 2, (bb + 1) / 2);
      }
      idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
    }
  }
  const stems = new THREE.Mesh(mergeGeometries(wood), barkMaterial()); stems.castShadow = true; crown.add(stems);
  for (const w of wood) w.dispose();
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  fg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx);
  const { m, depth } = leafMaterial('narrow');
  const leaves = new THREE.Mesh(fg, m); leaves.customDepthMaterial = depth; leaves.castShadow = true; crown.add(leaves);
  return g;
}

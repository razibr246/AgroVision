// Crops that look like the real fields of the five countries, not cones and faceted balls: each crop is drawn once
// as a picture of a whole plant (thin arching rice blades, wheat with bearded ears, mustard with its clusters of
// small four-petal flowers, maize with tassel and cob, a leafy vegetable bush, alfalfa) with see-through edges, and
// set in the field as crossed cards, so a field of hundreds of plants reads as real from any side. Used behind the
// characters (backdrop.js).
import * as THREE from 'three';

const W = 256, H = 512;
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

// a long thin leaf or blade from (x, y) leaning by `lean`, arching over by `arch`, of length L and width w
function blade(x, ctx, x0, y0, L, w, lean, arch, color) {
  const dx = Math.sin(lean) * L, dy = -Math.cos(lean) * L;
  const cx = x0 + dx * 0.5 + arch * L * Math.sign(lean || 1) * 0.35, cy = y0 + dy * 0.55;
  const ex = x0 + dx + arch * L * Math.sign(lean || 1) * 0.6, ey = y0 + dy * (1 - arch * 0.6);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x0 - w, y0);
  ctx.quadraticCurveTo(cx - w * 0.8, cy, ex, ey);
  ctx.quadraticCurveTo(cx + w * 0.8, cy, x0 + w, y0); ctx.closePath(); ctx.fill();
}
function stem(ctx, x0, y0, x1, y1, w, color) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + (rnd() - 0.5) * 10, (y0 + y1) / 2, x1, y1); ctx.stroke(); }

const DRAW = {
  paddy(ctx, ripe) { // a tuft of rice: many narrow blades from one base; heads bowed with grain when ripe
    const greens = ripe ? ['#b59a3a', '#c8ac4a', '#a88a30', '#d4b85a'] : ['#4f8a2e', '#5f9a36', '#6fa83e', '#3f7a28', '#7fb446'];
    for (let k = 0; k < 18; k++) blade(null, ctx, W / 2 + (rnd() - 0.5) * 22, H - 4, H * (0.55 + rnd() * 0.4), 4 + rnd() * 2.5, (rnd() - 0.5) * 0.7, rnd() * 0.5, pick(greens));
    if (ripe) for (let k = 0; k < 6; k++) { const x = W / 2 + (rnd() - 0.5) * 120, y = H * (0.18 + rnd() * 0.2); ctx.strokeStyle = '#c9a646'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2, H * 0.45); ctx.quadraticCurveTo(x, y - 40, x + (x > W / 2 ? 20 : -20), y + 30); ctx.stroke(); for (let g = 0; g < 9; g++) { ctx.fillStyle = '#e0c060'; ctx.beginPath(); ctx.ellipse(x + (x > W / 2 ? 1 : -1) * g * 2.4, y - 10 + g * 5, 3.5, 6, 0.3, 0, Math.PI * 2); ctx.fill(); } }
  },
  wheat(ctx) { // golden stalks, a few dry leaves, each stalk topped with a bearded ear
    for (let k = 0; k < 6; k++) blade(null, ctx, W / 2 + (rnd() - 0.5) * 30, H - 4, H * (0.3 + rnd() * 0.2), 5, (rnd() - 0.5) * 1.1, 0.5, pick(['#b8a050', '#c9b060', '#a89040']));
    for (let k = 0; k < 7; k++) {
      const x = W / 2 + (rnd() - 0.5) * 120, top = H * (0.08 + rnd() * 0.16);
      stem(ctx, W / 2 + (rnd() - 0.5) * 20, H - 4, x, top + 50, 3, pick(['#c8b060', '#d4bc6c', '#b8a050']));
      for (let g = 0; g < 10; g++) for (const s of [-1, 1]) { // the ear: grains in two rows, each with its awn
        const gx = x + s * 5, gy = top + g * 5.5;
        ctx.fillStyle = pick(['#e2c66e', '#d8b85a', '#ecd282']); ctx.beginPath(); ctx.ellipse(gx, gy, 4.5, 6.5, s * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(214,190,120,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, gy - 4); ctx.lineTo(gx + s * 10, gy - 34); ctx.stroke();
      }
    }
  },
  mustard(ctx) { // lobed leaves at the foot, a branched flowering canopy of small four-petal yellow flowers and buds
    for (let k = 0; k < 6; k++) {
      const a = (rnd() - 0.5) * 2.2; ctx.save(); ctx.translate(W / 2, H - 20); ctx.rotate(a);
      ctx.fillStyle = pick(['#4f7f2c', '#5f8f36', '#3f6f26']);
      ctx.beginPath(); ctx.ellipse(0, -42, 22, 48, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const tips = [];
    for (let k = 0; k < 7; k++) {
      const x = W / 2 + (rnd() - 0.5) * 140, y = H * (0.16 + rnd() * 0.32);
      stem(ctx, W / 2 + (rnd() - 0.5) * 16, H - 20, x, y, 2.6, '#6a9a3a');
      tips.push([x, y]);
    }
    for (const [x, y] of tips) {
      for (let f = 0; f < 20; f++) { // a raceme: open flowers below, buds on top
        const fx = x + (rnd() - 0.5) * 38, fy = y + (rnd() - 0.28) * 50, open = fy > y - 8;
        if (open) {
          ctx.fillStyle = pick(['#f7d722', '#fedf38', '#eab812', '#ffe64d']);
          for (let p = 0; p < 4; p++) {
            const a = p * Math.PI / 2 + rnd() * 0.3;
            ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 4.2, 2.8, a, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#fffa80'; ctx.beginPath(); ctx.arc(fx, fy, 1.4, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = '#b8c838'; ctx.beginPath(); ctx.arc(fx, fy, 2.6, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  },
  veg(ctx) { // a leafy vegetable bush (brinjal, beans): broad veined leaves and a fruit or two
    for (let k = 0; k < 14; k++) {
      const a = (rnd() - 0.5) * 2.6, L = 70 + rnd() * 50, x = W / 2 + Math.sin(a) * 30, y = H - 30 - rnd() * 140;
      stem(ctx, W / 2, H - 4, x, y, 3, '#5a7a32');
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = pick(['#3f7a2c', '#4f8a34', '#2f6a24', '#5f9a3c']); ctx.beginPath(); ctx.ellipse(0, -L * 0.45, L * 0.32, L * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(200,230,160,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -L * 0.9); ctx.stroke();
      ctx.restore();
    }
    for (let k = 0; k < 2; k++) { ctx.fillStyle = '#5a2a6a'; ctx.beginPath(); ctx.ellipse(W / 2 + (k ? 30 : -34), H - 110 - k * 30, 10, 22, k ? -0.3 : 0.3, 0, Math.PI * 2); ctx.fill(); }
  },
  low(ctx) { // alfalfa: a low bushy mass of small trefoil leaves with a few purple flower heads
    for (let k = 0; k < 160; k++) { const x = W / 2 + (rnd() - 0.5) * 220, y = H - rnd() * 230 * (1 - Math.abs(x - W / 2) / 160); ctx.fillStyle = pick(['#4f8a2e', '#5f9a36', '#6faa40', '#3f7a28']); ctx.beginPath(); ctx.ellipse(x, y, 6, 4.5, rnd() * 3, 0, Math.PI * 2); ctx.fill(); }
    for (let k = 0; k < 6; k++) { ctx.fillStyle = pick(['#8a5ab0', '#9a6ac0']); ctx.beginPath(); ctx.ellipse(W / 2 + (rnd() - 0.5) * 180, H - 180 - rnd() * 60, 6, 9, 0, 0, Math.PI * 2); ctx.fill(); }
  },
  maize(ctx) { // a tall stalk with long ribbon leaves arching out, a tassel on top and a cob in its husk
    stem(ctx, W / 2, H - 2, W / 2 + 4, 40, 8, '#6f9a3a');
    for (let k = 0; k < 9; k++) { const y = H - 40 - k * 48, s = k % 2 ? 1 : -1; blade(null, ctx, W / 2, y, 170 + rnd() * 60, 9, s * (0.9 + rnd() * 0.5), 0.7, pick(['#4f8a2e', '#5f9a36', '#6fa83e'])); }
    for (let k = 0; k < 8; k++) { ctx.strokeStyle = '#c8b46a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 + 4, 44); ctx.lineTo(W / 2 + (k - 3.5) * 9, 6 + (k % 3) * 6); ctx.stroke(); }
    ctx.fillStyle = '#9ab656'; ctx.beginPath(); ctx.ellipse(W / 2 + 18, H * 0.5, 12, 34, 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c89a5a'; ctx.fillRect(W / 2 + 26, H * 0.5 - 40, 3, 12); // silk
  },
};

const texCache = {};
export function plantTexture(kind, ripe = false) {
  const key = kind + (ripe ? ':ripe' : '');
  if (texCache[key]) return texCache[key];
  seed = 31 + key.length * 17;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  (DRAW[kind] ?? DRAW.paddy)(c.getContext('2d'), ripe);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (texCache[key] = t);
}

// one plant as two crossed cards (three for a bush), its foot at the origin; normals lean up so the far side of a
// card is lit like the near side, as sunlight through leaves is
function crossedCards(w, h, n) {
  const parts = [];
  for (let k = 0; k < n; k++) {
    const g = new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0).rotateY((k / n) * Math.PI);
    const nn = g.attributes.normal; for (let v = 0; v < nn.count; v++) { const x = nn.getX(v) * 0.35, z = nn.getZ(v) * 0.35; nn.setXYZ(v, x, 0.93, z); }
    parts.push(g);
  }
  const g = parts[0];
  if (parts.length === 1) return g;
  const all = new THREE.BufferGeometry(), pos = [], nor = [], uv = [], idx = [];
  for (const p of parts) { const o = pos.length / 3; pos.push(...p.attributes.position.array); nor.push(...p.attributes.normal.array); uv.push(...p.attributes.uv.array); idx.push(...Array.from(p.index.array, (i) => i + o)); p.dispose(); }
  all.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); all.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); all.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); all.setIndex(idx);
  return all;
}

export const CROP_SIZE = { paddy: [0.42, 0.75], wheat: [0.42, 1.05], mustard: [0.46, 0.62], veg: [0.6, 0.62], low: [0.6, 0.42], maize: [0.75, 2.1] };

// A field of `kind` at the given spots ([x, z] pairs): an InstancedMesh, each plant turned, sized and tinted a little
// differently. `own` registers what the caller must dispose.
export function plantField(kind, spots, { ripe = false, perSpot = 2, own = (o) => o, jitter = 0.12, seedBase = 5 } = {}) {
  const [w, h] = CROP_SIZE[kind] ?? CROP_SIZE.paddy;
  const geo = own(crossedCards(w, h, kind === 'veg' || kind === 'low' ? 3 : 2));
  const map = plantTexture(kind, ripe);
  const mat = own(new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }));
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length * perSpot);
  mesh.customDepthMaterial = own(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.45 }));
  let s = seedBase; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  let n = 0;
  for (const [x, z] of spots) for (let k = 0; k < perSpot; k++) {
    e.set((r() - 0.5) * 0.12, r() * Math.PI, (r() - 0.5) * 0.12); q.setFromEuler(e);
    const sc = 0.8 + r() * 0.45;
    m.compose(new THREE.Vector3(x + (r() - 0.5) * jitter * 2, 0, z + (r() - 0.5) * jitter * 2), q, new THREE.Vector3(sc, sc * (0.9 + r() * 0.2), sc));
    mesh.setMatrixAt(n, m);
    c.setRGB(1, 1, 1).multiplyScalar(0.82 + r() * 0.3); mesh.setColorAt(n, c);
    n++;
  }
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// ---- the farm's own plots (field.js): every crop at every stage of its life ----
// Each crop is drawn once per stage (seedling, growing, grown or in flower, ripe, dead) into the columns of one
// texture, an atlas. A plant is a few crossed upright cards, and for a low or rosette crop one card lying flat on top
// so it still reads from above; a per-plant attribute picks the stage's column, so a whole crop is one draw call. The
// wind sway, the sag of a thirsty plant, the push of a farmer walking through and the chewed look of a pest attack
// are worked in the shaders, so the CPU touches a plant only when its plot changes.
export const CROP_COLS = 5;
const CW = 192; // px per atlas column; its height follows the crop's shape (aspect)

// draw: which drawing; aspect: height over width of the plant's card; h: card height in metres at the end of each
// stage (seedling, growing, grown, ripe, dead); row / step: metres between rows and along a row; cards: upright cards;
// top: height (share of the card) of the flat card seen from above, 0 for none; sway: how far it bends in the wind.
const GRAIN = { draw: 'grass', cards: 3, top: 0, sway: 0.16 };
const LEG = { draw: 'legume', cards: 3, top: 0.62, sway: 0.12, aspect: 1, row: 0.25, step: 0.14, stem: '#6a8a3e', leaf: ['#4f8a36', '#5a9440', '#46802f', '#68a04a'], tip: '#9cc06c', ripeLeaf: ['#b8a860', '#c4b26a', '#a89a50', '#9a9a4a'], ripeTip: '#d8c88a' };
const BUSH = { draw: 'bush', cards: 3, top: 0.72, sway: 0.06, aspect: 1.1, row: 0.65, step: 0.5 };
const LOOKS = {
  rice: { ...GRAIN, head: 'panicle', aspect: 1.9, h: [0.26, 0.6, 0.95, 1.0, 0.75], row: 0.26, step: 0.22,
    leaf: ['#3d7a2a', '#46862e', '#539334', '#2f6a24'], seed: ['#6aa83e', '#78b548', '#5f9c38'], tip: '#a6cf66', ripeLeaf: ['#a8963e', '#b8a24a', '#9a913c', '#c2ac58'], ripeTip: '#dcc47a',
    grain: '#d9b24f', grainGreen: '#b8cc62', stem: '#6f9a3a', stemRipe: '#c0a050', paddy: true },
  wheat: { ...GRAIN, head: 'ear', awn: 18, aspect: 2.2, h: [0.2, 0.5, 0.9, 1.0, 0.75], row: 0.2, step: 0.17, bladeW: 4,
    leaf: ['#4d8a34', '#5a9640', '#447f2e', '#64a046'], seed: ['#6aa448', '#78b052'], tip: '#acc874', ripeLeaf: ['#c8a85a', '#d4b468', '#bc9c4e', '#e0c27a'], ripeTip: '#ecd59a',
    grain: '#dcb860', grainGreen: '#9cbc5a', stem: '#6f9a40', stemRipe: '#d0b264' },
  mustard: { draw: 'mustard', cards: 3, top: 0, sway: 0.14, aspect: 1.45, h: [0.2, 0.55, 1.05, 1.1, 0.8], row: 0.3, step: 0.2,
    leaf: ['#3f7a34', '#4a8a3c', '#356b2c', '#58963f'], tip: '#8ab664', ripeLeaf: ['#9a9a3e', '#b0a44a', '#8a8a36'], ripeTip: '#c8c070',
    flower: ['#f7d21f', '#ffdf2e', '#f0c814', '#ffe74a'], pod: '#9ab048', podRipe: '#c8b060', stem: '#6c9a3e', stemRipe: '#b8a656' },
  maize: { draw: 'maize', cards: 2, top: 0, sway: 0.08, aspect: 2.5, h: [0.4, 1.1, 2.2, 2.2, 1.6], row: 0.6, step: 0.26,
    leaf: ['#3f7f2e', '#4b8c34', '#5a9a3c', '#36702a'], tip: '#8ab858', ripeLeaf: ['#b8a064', '#c8ae70', '#a8905a', '#d0b880'], ripeTip: '#e0cc98',
    tassel: '#d6c27a', husk: '#8fb050', huskRipe: '#cbb57a', silk: '#b0603a', stem: '#6e9a3c', stemRipe: '#c2aa6a' },
  potato: { draw: 'potato', cards: 3, top: 0.6, sway: 0.08, aspect: 0.85, h: [0.16, 0.4, 0.58, 0.52, 0.45], row: 0.55, step: 0.3,
    leaf: ['#2f6a28', '#3a7a2e', '#467f34', '#2a5e24'], tip: '#6a9a48', ripeLeaf: ['#8a8a46', '#9a9050', '#6f7a3c', '#5f6e34', '#8a7444'], ripeTip: '#b0a470',
    flower: ['#f6f2ea', '#e9dff2', '#d8c6ec'], eye: '#f2c62a', stem: '#4a7a2e' },
  brinjal: { ...BUSH, h: [0.18, 0.5, 0.85, 0.9, 0.65], leafType: 'broad', leafLen: 40, leafW: 0.55,
    leaf: ['#3e6e34', '#4a7a3c', '#365f2e', '#56864a'], tip: '#86a872', stem: '#5a3e5e', flower: ['#a77fd0', '#9a6cc8'], eye: '#f2d12a',
    fruitGreen: '#6a3a80', fruit: '#3a1e48', fruitHi: '#9a6ab8', calyx: '#5a7a3a', fruitShape: 'long' },
  tomato: { ...BUSH, aspect: 1.15, h: [0.18, 0.5, 0.85, 0.9, 0.65], leafType: 'compound', leafLen: 42,
    leaf: ['#2f6e2a', '#3a7e30', '#468a38', '#2a6024'], tip: '#6aa04a', stem: '#4f7a2e', flower: ['#f4d21e'], eye: '#e8b000',
    fruitGreen: '#8ab448', fruit: '#d23a22', fruitHi: '#ff9a76', calyx: '#4f7a2e', fruitShape: 'round' },
  chili: { ...BUSH, aspect: 1.05, h: [0.15, 0.4, 0.65, 0.68, 0.5], row: 0.5, step: 0.4, leafType: 'small', leafLen: 24, leafW: 0.34,
    leaf: ['#2f7a2e', '#3a8a34', '#2a6a28', '#469a3c'], tip: '#7cbc5c', stem: '#4a7a2e', flower: ['#f6f6ee'], eye: '#c8d070',
    fruitGreen: '#4f9a30', fruit: '#c81e14', fruitHi: '#ff7a5a', calyx: '#3a7a2a', fruitShape: 'chili' },
  olive: { ...BUSH, aspect: 1.4, h: [0.35, 0.9, 1.6, 1.7, 1.2], row: 1.1, step: 0.85, sway: 0.04, leafType: 'small', leafLen: 15, leafW: 0.2,
    leaf: ['#5f6f46', '#6e7e54', '#55643f', '#808f66'], tip: '#b4bc9a', stem: '#6e6450', flower: ['#efe8c8'], eye: '#d8d0a0',
    fruitGreen: '#7a8a3a', fruit: '#2c2a22', fruitHi: '#6e6a5a', calyx: '#6e6450', fruitShape: 'olive', trunk: true },
  cauliflower: { draw: 'cole', cards: 3, top: 0.5, sway: 0.04, aspect: 0.8, h: [0.15, 0.38, 0.55, 0.58, 0.45], row: 0.5, step: 0.45,
    leaf: ['#4f7f6a', '#5a8a74', '#466f5e', '#64947c'], tip: '#9ab8a2', rib: '#dce6cc', curd: '#f4efdc', curdShade: '#d6cca4', stem: '#9ab09a' },
  lentil: { ...LEG, h: [0.1, 0.24, 0.4, 0.4, 0.32], leaflet: [6, 2.2], pairs: 5, flower: ['#ecebf6', '#d8dcf2'], pod: '#c8b878', podShape: 'flat' },
  grasspea: { ...LEG, h: [0.1, 0.26, 0.45, 0.45, 0.35], leaflet: [11, 2.2], pairs: 1, flower: ['#5a6ad0', '#6a7ae0'], pod: '#b8aa70', podShape: 'flat' },
  chickpea: { ...LEG, h: [0.1, 0.26, 0.45, 0.45, 0.35], leaflet: [3.6, 2.6], pairs: 6, flower: ['#d88ab8', '#e8a0c8'], pod: '#c0b070', podShape: 'puff', leaf: ['#5f8f48', '#6a9a52', '#557f40', '#78a45a'] },
  mungbean: { ...LEG, aspect: 1.1, h: [0.12, 0.3, 0.52, 0.52, 0.4], row: 0.3, step: 0.15, leaflet: [12, 6.5], pairs: 1, flower: ['#f2d020'], pod: '#2e2a22', podShape: 'long', ripeLeaf: ['#9a9a40', '#8a8a3a', '#a8a048'] },
  pea: { ...LEG, aspect: 1.1, h: [0.12, 0.32, 0.52, 0.55, 0.42], row: 0.35, step: 0.15, leaflet: [11, 6.8], pairs: 1, flower: ['#f6f6f2', '#ece8f6'], pod: '#7ab84a', podShape: 'long', ripeLeaf: ['#7a9a48', '#8aa050', '#6f9040'] },
  groundnut: { ...LEG, aspect: 0.85, h: [0.09, 0.22, 0.34, 0.34, 0.28], row: 0.3, step: 0.15, leaflet: [8, 5.5], pairs: 2, flower: ['#f6c21e'], ripeLeaf: ['#a89a48', '#b8a650', '#98924a'] },
  soybean: { ...LEG, aspect: 1.1, h: [0.13, 0.38, 0.68, 0.68, 0.5], row: 0.4, step: 0.15, leaflet: [12, 7], pairs: 1, flower: ['#d8c0ec'], pod: '#9a8456', podShape: 'fuzzy', ripeLeaf: ['#c0a650', '#b89a46', '#a8903e'] },
  alfalfa: { ...LEG, aspect: 1.1, h: [0.1, 0.3, 0.55, 0.55, 0.42], row: 0.22, step: 0.15, leaflet: [7, 3.2], pairs: 1, flower: ['#8a6ad0', '#7a5ac0'], spike: true, ripeLeaf: ['#6a9a48', '#7aa04a', '#5f8f40'] },
  sainfoin: { ...LEG, aspect: 1.3, h: [0.12, 0.36, 0.66, 0.66, 0.5], row: 0.22, step: 0.13, leaflet: [6, 2.6], pairs: 6, flower: ['#e07aa8', '#ea8ab4'], spike: true, ripeLeaf: ['#7a9a4a', '#8aa052', '#6f8f44'] },
  pigeonpea: { ...LEG, aspect: 1.6, h: [0.22, 0.75, 1.6, 1.7, 1.2], row: 0.75, step: 0.45, sway: 0.06, leaflet: [11, 4], pairs: 1, flower: ['#f0c020', '#e8b018'], pod: '#5a4a2a', podShape: 'long' },
  bean: { draw: 'vine', cards: 2, top: 0, sway: 0.05, aspect: 2.2, h: [0.2, 0.75, 1.5, 1.55, 1.1], row: 0.75, step: 0.45, leafType: 'trio',
    leaf: ['#3a7a2e', '#468a36', '#2f6a26', '#52923e'], tip: '#7aae56', stem: '#4f7a30', flower: ['#c8a0dc', '#b48ad0'], eye: '#f4ecf8', fruitGreen: '#7ab84a', fruit: '#5f9a34', fruitHi: '#a8d878', fruitShape: 'pod', stake: '#b49a62' },
  bittergourd: { draw: 'vine', cards: 2, top: 0, sway: 0.05, aspect: 2.2, h: [0.2, 0.75, 1.5, 1.55, 1.1], row: 0.75, step: 0.5, leafType: 'palm',
    leaf: ['#3f7f30', '#4a8a38', '#36702a', '#56943f'], tip: '#80b45a', stem: '#4f7a30', flower: ['#f2d020'], eye: '#e0b010', fruitGreen: '#7ab84a', fruit: '#4f9a34', fruitHi: '#a8e07a', fruitShape: 'gourd', stake: '#b49a62' },
  sunflower: { draw: 'sunflower', cards: 2, top: 0, sway: 0.05, aspect: 3, h: [0.3, 0.8, 1.75, 1.8, 1.3], row: 0.6, step: 0.32,
    leaf: ['#3f7a2e', '#4a8a36', '#558f3c'], tip: '#86b25a', ripeLeaf: ['#9a8a40', '#8a7a3a', '#a89a50'], ripeTip: '#c0b070', ray: '#f6bc12', rayRipe: '#a07a30', disc: '#4a2e14', stem: '#5f8f34', stemRipe: '#9a9050' },
  sesame: { draw: 'sesame', cards: 2, top: 0, sway: 0.1, aspect: 3.2, h: [0.18, 0.55, 1.15, 1.2, 0.9], row: 0.3, step: 0.15,
    leaf: ['#3f7f34', '#4a8a3c', '#356f2c'], tip: '#7aae5a', ripeLeaf: ['#a8a04a', '#b8a854', '#98903e'], ripeTip: '#d0c080', flower: ['#f6e8f0', '#f0d4e4'], capsule: '#7a9a3a', capsuleRipe: '#9a7a44', stem: '#5a8a34', stemRipe: '#a89a54' },
  onion: { draw: 'onion', cards: 2, top: 0, sway: 0.06, aspect: 1.6, h: [0.14, 0.34, 0.48, 0.36, 0.34], row: 0.22, step: 0.16,
    leaf: ['#4f8a66', '#5a9672', '#46805c', '#6aa07c'], tip: '#a4c8aa', ripeLeaf: ['#b0a050', '#c0ae60', '#a09044'], ripeTip: '#d8c88a', bulb: '#a8445a', bulbHi: '#e0909a' },
  pineapple: { draw: 'pineapple', cards: 3, top: 0.42, sway: 0.02, aspect: 1, h: [0.22, 0.55, 0.85, 0.95, 0.7], row: 0.55, step: 0.38,
    leaf: ['#4a6a44', '#56764c', '#3e5e3c', '#647452'], tip: '#9a6a4a', fruitGreen: '#c8506a', fruit: '#d8a028', fruitHi: '#f6d060', crown: '#4f7a44' },
  watermelon: { draw: 'melon', cards: 2, top: 0.3, sway: 0.03, aspect: 0.32, h: [0.08, 0.2, 0.3, 0.32, 0.26], row: 1.0, step: 0.75,
    leaf: ['#3e6e2e', '#4a7a36', '#557f3c'], tip: '#86aa62', stem: '#4f7a30', flower: ['#f2d020'], eye: '#e0b010', fruit: '#2f5a24', stripe: '#9abc6a', fruitHi: '#7aa860', ripeLeaf: ['#7a8a40', '#8a9a48'] },
};
LOOKS.redrice = { ...LOOKS.rice, grain: '#9c4a2c', grainGreen: '#a8b45a', ripeLeaf: ['#9a9a42', '#a8a04a', '#8a8a3c', '#b0a256'] };
export const cropLook = (kind) => LOOKS[kind] ?? LOOKS.lentil;

// ---- drawing ----
let S = 7;
const rn = () => ((S = (S * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rn() * (b - a);
const one = (a) => (Array.isArray(a) ? a[Math.floor(rn() * a.length)] : a);
const WHITE = new THREE.Color('#ffffff');
function tone(hex, k) { const c = new THREE.Color(hex); if (k > 0) c.lerp(WHITE, k); else c.multiplyScalar(1 + k); return `#${c.getHexString()}`; }
const TAU = Math.PI * 2;

// a tapering blade (grass, rice, maize, onion) from (x, y), leaving at `ang` from upright and bending by `bend`
function ribbon(c, x, y, len, w, ang, bend, c0, c1, rib = 0.25) {
  const n = 12, ds = len / n, P = [];
  let a = ang, px = x, py = y;
  for (let i = 0; i <= n; i++) { P.push(px, py, a); a += bend / n; px += Math.sin(a) * ds; py -= Math.cos(a) * ds; }
  c.beginPath();
  for (let i = 0; i <= n; i++) { const t = i / n, hw = w * Math.min(1, 0.6 + t * 4) * (1 - t ** 1.6), qa = P[i * 3 + 2]; const X = P[i * 3] + Math.cos(qa) * hw, Y = P[i * 3 + 1] + Math.sin(qa) * hw; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }
  for (let i = n; i >= 0; i--) { const t = i / n, hw = w * Math.min(1, 0.6 + t * 4) * (1 - t ** 1.6), qa = P[i * 3 + 2]; c.lineTo(P[i * 3] - Math.cos(qa) * hw, P[i * 3 + 1] - Math.sin(qa) * hw); }
  c.closePath();
  const g = c.createLinearGradient(x, y, P[n * 3], P[n * 3 + 1]); g.addColorStop(0, tone(c0, -0.25)); g.addColorStop(0.35, c0); g.addColorStop(1, c1);
  c.fillStyle = g; c.fill();
  if (rib) { c.strokeStyle = `rgba(236,246,206,${rib})`; c.lineWidth = Math.max(0.6, w * 0.22); c.beginPath(); c.moveTo(x, y); for (let i = 1; i < n - 1; i++) c.lineTo(P[i * 3], P[i * 3 + 1]); c.stroke(); }
  return [P[n * 3], P[n * 3 + 1]];
}
// a broad leaf from (x, y) pointing along `ang` (0 = up): widest at `wide` of its length, wavy-edged with `lobes`
function leaf(c, x, y, len, w, ang, c0, c1, o = {}) {
  c.save(); c.translate(x, y); c.rotate(ang);
  if (o.pet) { c.strokeStyle = o.stem ?? c0; c.lineWidth = o.petW ?? Math.max(0.9, w * 0.16); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -o.pet); c.stroke(); c.translate(0, -o.pet); }
  const N = o.lobes ? o.lobes * 2 : 8, p = Math.log(0.5) / Math.log(o.wide ?? 0.42), X = [], Y = [];
  for (let i = 0; i <= N; i++) { const t = i / N; let e = Math.sin(Math.PI * t ** p); if (o.lobes && i < N) e *= i % 2 ? 1.16 : 0.72; X.push(w * e); Y.push(-len * t); }
  c.beginPath(); c.moveTo(0, 0);
  for (let i = 1; i < N; i++) c.quadraticCurveTo(X[i], Y[i], (X[i] + X[i + 1]) / 2, (Y[i] + Y[i + 1]) / 2);
  c.lineTo(0, -len);
  for (let i = N - 1; i >= 1; i--) c.quadraticCurveTo(-X[i], Y[i], -(X[i] + X[i - 1]) / 2, (Y[i] + Y[i - 1]) / 2);
  c.closePath();
  const g = c.createLinearGradient(-w, -len * 0.2, w, -len * 0.6); g.addColorStop(0, c1); g.addColorStop(0.55, c0); g.addColorStop(1, tone(c0, -0.22));
  c.fillStyle = g; c.fill();
  const v = o.vein ?? 0.3;
  if (v) {
    c.strokeStyle = o.veinCol ?? `rgba(238,246,214,${v})`; c.lineWidth = o.ribW ?? Math.max(0.6, w * 0.09);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -len * 0.9); c.stroke();
    if (w > 4) { c.lineWidth = Math.max(0.5, w * 0.04); c.strokeStyle = `rgba(238,246,214,${v * 0.55})`; c.beginPath(); for (let t = 0.18; t < 0.8; t += 0.15) for (const s of [-1, 1]) { c.moveTo(0, -len * t); c.quadraticCurveTo(s * w * 0.35, -len * (t + 0.05), s * w * 0.72, -len * (t + 0.14)); } c.stroke(); }
  }
  c.restore();
}
// a compound leaf: a stalk with `pairs` pairs of leaflets and one at the tip
function pinnate(c, x, y, len, ang, bend, pairs, ll, lw, L, P, o = {}) {
  const n = pairs + 1, ds = len / n;
  let a = ang, px = x, py = y;
  c.strokeStyle = P.stem ?? one(L); c.lineWidth = o.sw ?? 1.2;
  for (let i = 0; i < n; i++) {
    a += bend / n; const nx = px + Math.sin(a) * ds, ny = py - Math.cos(a) * ds;
    c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
    if (i < pairs) for (const s of [-1, 1]) leaf(c, nx, ny, ll * (1 - i * 0.04), lw, a + s * (o.spread ?? 1.05), one(L), P.tip, { vein: o.vein ?? 0.2, lobes: o.lobes });
    px = nx; py = ny;
  }
  leaf(c, px, py, ll * 1.1, lw * 1.05, a, one(L), P.tip, { vein: o.vein ?? 0.2, lobes: o.lobes });
}
function bloom(c, x, y, r, n, col, eye) {
  const a0 = rn() * TAU; c.fillStyle = col;
  for (let k = 0; k < n; k++) { const a = a0 + (k / n) * TAU; c.beginPath(); c.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.55, r * 0.34, a, 0, TAU); c.fill(); }
  c.fillStyle = eye ?? '#f8e870'; c.beginPath(); c.arc(x, y, r * 0.26, 0, TAU); c.fill();
}
function fruit(c, x, y, rx, ry, rot, col, hi) {
  const g = c.createRadialGradient(x - rx * 0.35, y - ry * 0.4, 0.4, x, y, Math.max(rx, ry) * 1.05);
  g.addColorStop(0, hi ?? tone(col, 0.4)); g.addColorStop(0.4, col); g.addColorStop(1, tone(col, -0.5));
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(x - rx * 0.35, y - ry * 0.4, rx * 0.18, ry * 0.12, rot, 0, TAU); c.fill();
}
function stalk(c, x0, y0, x1, y1, w, col, wob = 6) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + rr(-wob, wob), (y0 + y1) / 2, x1, y1); c.stroke(); }
const pt = (x0, y0, x1, y1, t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];

function grainDot(c, x, y, a, col) {
  c.fillStyle = tone(col, rr(-0.12, 0.08)); c.beginPath(); c.ellipse(x, y, 1.8, 3.4, a, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,250,214,0.32)'; c.beginPath(); c.ellipse(x - 0.5, y - 0.8, 0.6, 1.4, a, 0, TAU); c.fill();
}
// a rice panicle: branches of grains on an axis that arches over, bowing low when the grain is full
function panicle(c, x, y, a0, ripe, P) {
  const side = Math.sign(a0) || (rn() < 0.5 ? -1 : 1), len = ripe ? rr(72, 96) : rr(44, 60), droop = ripe ? rr(2.6, 3.3) : rr(0.4, 0.9);
  const gc = ripe ? P.grain : P.grainGreen, n = 10, ds = len / n;
  let a = a0 * 0.6, px = x, py = y;
  for (let i = 0; i < n; i++) {
    a += (side * droop) / n;
    const nx = px + Math.sin(a) * ds, ny = py - Math.cos(a) * ds;
    c.strokeStyle = ripe ? P.stemRipe : P.stem; c.lineWidth = 1.3; c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
    if (i > 0) for (const s of [-1, 1]) {
      if (rn() < 0.25) continue;
      const bl = rr(5, 12) * (1 - (i / n) * 0.4), ba = a + s * rr(0.25, 0.55), bx = nx + Math.sin(ba) * bl, by = ny - Math.cos(ba) * bl;
      c.lineWidth = 0.8; c.beginPath(); c.moveTo(nx, ny); c.lineTo(bx, by); c.stroke();
      for (let k = 0; k < 3; k++) { const [gx, gy] = pt(nx, ny, bx, by, 0.4 + k * 0.3); grainDot(c, gx, gy, ba, gc); }
    }
    grainDot(c, nx, ny, a, gc);
    px = nx; py = ny;
  }
}
// a wheat ear: two rows of spikelets, each with its awn
function ear(c, x, y, a0, ripe, P) {
  const a = a0 * 0.5 + (ripe ? Math.sign(a0 || 1) * 0.22 : 0), len = rr(40, 52), n = 11, gc = ripe ? P.grain : P.grainGreen, dx = Math.sin(a), dy = -Math.cos(a);
  for (let i = 0; i < n; i++) {
    const t = i / n, gx = x + dx * len * t, gy = y + dy * len * t, w = 3.6 * (1 - t * 0.35);
    for (const s of [-1, 1]) {
      const sx = gx + Math.cos(a) * s * w * 0.8, sy = gy + Math.sin(a) * s * w * 0.8;
      if (P.awn) { c.strokeStyle = ripe ? 'rgba(226,202,134,0.9)' : 'rgba(172,202,112,0.9)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + (dx + Math.cos(a) * s * 0.35) * P.awn, sy + (dy + Math.sin(a) * s * 0.35) * P.awn); c.stroke(); }
      c.fillStyle = tone(gc, rr(-0.12, 0.1)); c.beginPath(); c.ellipse(sx, sy, w * 0.75, w * 1.25, a + s * 0.35, 0, TAU); c.fill();
    }
  }
}
// a palmate leaf (gourd, melon): five lobes from one point
function palm(c, x, y, s, ang, L, P) { const col = one(L); for (let k = -2; k <= 2; k++) leaf(c, x, y, s * (1 - Math.abs(k) * 0.16), s * 0.3, ang + k * 0.5, col, P.tip, { lobes: 2, wide: 0.5, vein: 0.25 }); }
// a bean leaf: three leaflets
function trio(c, x, y, s, ang, L, P) { const col = one(L); for (const k of [-1, 1, 0]) leaf(c, x, y, s * (k ? 0.85 : 1), s * 0.5, ang + k * 0.95, col, P.tip, { wide: 0.38, vein: 0.3, pet: k ? 0 : s * 0.25 }); }

const DRAW2 = {
  grass(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3, L = ripe ? P.ripeLeaf : P.leaf, tip = ripe ? P.ripeTip : P.tip;
    if (st === 0) { for (let k = 0; k < 8; k++) { const a = rr(-0.4, 0.4); ribbon(c, cx + rr(-5, 5), by, H * rr(0.5, 0.97), rr(2.2, 3.2), a, a * rr(0.3, 1.2), one(P.seed ?? L), tip); } return; }
    const heads = st >= 2, tops = [];
    if (heads) for (let k = 0; k < (P.head === 'ear' ? 11 : 10); k++) {
      const tx = cx + rr(-W * 0.3, W * 0.3), ty = H * rr(0.1, 0.24) + (ripe && P.head === 'panicle' ? H * 0.04 : 0), sx = cx + rr(-6, 6);
      stalk(c, sx, by, tx, ty, 2, ripe ? P.stemRipe : P.stem);
      tops.push([tx, ty, Math.atan2(tx - sx, by - ty)]);
      if (P.head === 'ear') for (let q = 0; q < 2; q++) { const [x, y] = pt(sx, by, tx, ty, rr(0.3, 0.65)), s = rn() < 0.5 ? -1 : 1; ribbon(c, x, y, H * rr(0.14, 0.22), 3.2, s * rr(0.4, 0.9), s * rr(0.4, 1.2), one(L), tip, 0.2); }
    }
    for (let k = 0, n = st === 1 ? 30 : 24; k < n; k++) {
      const a = rr(-0.8, 0.8) * (heads ? 0.85 : 1), len = H * rr(heads ? 0.4 : 0.45, heads ? 0.82 : 0.97);
      ribbon(c, cx + rr(-7, 7), by, len, rr(2.6, P.bladeW ?? 3.6), a, Math.sign(a) * rr(0.15, ripe ? 1.4 : 0.9), one(L), tip, 0.2);
    }
    for (const [x, y, a] of tops) (P.head === 'ear' ? ear : panicle)(c, x, y, a, ripe, P);
  },
  mustard(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3, L = ripe ? P.ripeLeaf : P.leaf;
    const nb = [7, 8, 6, 3][st], bl = [H * 0.78, H * 0.4, H * 0.24, H * 0.2][st];
    const basal = () => { for (let k = 0; k < nb; k++) { const a = rr(-1.25, 1.25), len = bl * rr(0.7, 1); leaf(c, cx + rr(-4, 4), by, len, len * 0.3, a, one(L), P.tip, { lobes: 4, wide: 0.62, pet: len * 0.18, vein: 0.3, stem: P.stem }); } };
    if (st === 0) { basal(); return; }
    if (st === 1) {
      const tx = cx + rr(-4, 4), ty = H * 0.22; stalk(c, cx, by, tx, ty, 3, P.stem, 2);
      for (let k = 0; k < 5; k++) { const [x, y] = pt(cx, by, tx, ty, 0.3 + k * 0.12); leaf(c, x, y, rr(14, 22), rr(4, 6), (k % 2 ? 1 : -1) * rr(0.6, 1.1), one(L), P.tip, { vein: 0.2 }); }
      basal();
      for (let b = 0; b < 16; b++) { c.fillStyle = one(['#a8c040', '#c8cc40', '#98b438']); c.beginPath(); c.arc(tx + rr(-7, 7), ty + rr(-6, 6), rr(1.8, 2.8), 0, TAU); c.fill(); }
      return;
    }
    const tops = [];
    for (let k = 0; k < 10; k++) { const tx = cx + rr(-W * 0.38, W * 0.38), ty = H * rr(0.08, 0.34); stalk(c, cx + rr(-3, 3), by, tx, ty, 2.2, ripe ? P.stemRipe : P.stem); tops.push([tx, ty]); }
    for (let k = 0; k < (ripe ? 5 : 16); k++) leaf(c, cx + rr(-20, 20), H * rr(0.42, 0.82), rr(14, 22), rr(4, 6), rr(-1.3, 1.3), one(L), P.tip, { vein: 0.2 });
    basal();
    for (const [x, y] of tops) {
      // siliques up the stem, then flowers on top: open ones in a ring round a knot of buds
      const pods = ripe ? 16 : 6;
      for (let i = 0; i < pods; i++) { const t = i / pods, px = x + (cx - x) * t * 0.25, py = y + 10 + t * H * (ripe ? 0.32 : 0.16), s = i % 2 ? 1 : -1; c.strokeStyle = tone(ripe ? P.podRipe : P.pod, rr(-0.12, 0.1)); c.lineWidth = 2; c.beginPath(); c.moveTo(px, py); c.lineTo(px + s * rr(6, 10), py - rr(9, 13)); c.stroke(); }
      const nf = ripe ? 4 : 32;
      for (let f = 0; f < nf; f++) { const a = rn() * TAU, d = rr(2, ripe ? 6 : 18); bloom(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 + 3, rr(3, 4.3), 4, one(P.flower), '#fbe96a'); }
      if (!ripe) for (let b = 0; b < 6; b++) { c.fillStyle = one(['#b8c838', '#d8d040']); c.beginPath(); c.arc(x + rr(-4, 4), y - rr(1, 7), rr(1.6, 2.4), 0, TAU); c.fill(); }
    }
  },
  maize(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3, L = ripe ? P.ripeLeaf : P.leaf, tip = ripe ? P.ripeTip : P.tip;
    if (st === 0) { for (let k = 0; k < 5; k++) { const a = rr(-0.9, 0.9); ribbon(c, cx, by, H * rr(0.4, 0.85), rr(6, 8), a, Math.sign(a) * rr(0.3, 0.9), one(L), tip, 0.35); } return; }
    const top = st === 1 ? H * 0.3 : H * 0.09, stem = ripe ? P.stemRipe : P.stem;
    c.fillStyle = stem; c.beginPath(); c.moveTo(cx - 5, by); c.lineTo(cx - 2, top); c.lineTo(cx + 2, top); c.lineTo(cx + 5, by); c.closePath(); c.fill();
    const n = st === 1 ? 7 : 11;
    for (let k = 0; k < n; k++) {
      const y = by - (by - top) * (0.05 + (k / n) * 0.85), s = (k % 2 ? 1 : -1) * (rn() < 0.2 ? -1 : 1), len = W * rr(0.7, 1.05) * (1 - (k / n) * 0.3);
      ribbon(c, cx + s * 2, y, len, rr(7, 9.5), s * rr(0.35, 0.8), s * rr(1.1, ripe ? 2.4 : 1.9), one(L), tip, 0.4);
    }
    if (st === 1) { for (let k = 0; k < 3; k++) ribbon(c, cx, top + 10, H * 0.22, 6, rr(-0.3, 0.3), rr(-0.4, 0.4), one(L), tip, 0.35); return; }
    for (let k = 0; k < 10; k++) { const a = rr(-0.7, 0.7), l = rr(18, 34); c.strokeStyle = ripe ? tone(P.tassel, -0.25) : P.tassel; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx, top + 6); c.quadraticCurveTo(cx + Math.sin(a) * l * 0.5, top - l * 0.6, cx + Math.sin(a) * l, top - Math.cos(a) * l * 0.7 + l * 0.25 * Math.abs(a)); c.stroke(); }
    const ey = H * 0.52, husk = ripe ? P.huskRipe : P.husk;
    leaf(c, cx + 3, ey, 46, 9, 0.35, husk, tone(husk, 0.3), { wide: 0.45, vein: 0.25 });
    c.strokeStyle = ripe ? '#6a4a2a' : P.silk; c.lineWidth = 1;
    for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(cx + 3 + Math.sin(0.35) * 44, ey - Math.cos(0.35) * 44); c.lineTo(cx + 3 + Math.sin(0.35) * 44 + rr(2, 9), ey - Math.cos(0.35) * 44 + rr(-8, 4)); c.stroke(); }
  },
  potato(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3, tops = [];
    for (let k = 0, n = [4, 12, 14, 13][st]; k < n; k++) {
      const a = rr(-1.2, 1.2) * (st ? 1 : 0.8), len = H * rr(0.5, 0.8), ex = cx + Math.sin(a) * len * 0.7, ey = by - Math.cos(a) * len * 0.55;
      stalk(c, cx + rr(-4, 4), by, ex, ey, 1.8, P.stem, 4);
      const L = ripe && rn() < 0.7 ? P.ripeLeaf : P.leaf;
      pinnate(c, ex, ey, len * 0.5, a * 0.6 + rr(-0.4, 0.4), Math.sign(a) * rr(0.3, ripe ? 1.5 : 0.9), 3, len * 0.19, len * 0.1, L, P, { vein: 0.25 });
      if (st) for (const t of [0.45, 0.75]) { const [mx, my] = pt(cx, by, ex, ey, t), s = rn() < 0.5 ? -1 : 1; pinnate(c, mx, my, len * 0.42, a + s * 0.8, s * 0.5, 2, len * 0.17, len * 0.09, L, P, { vein: 0.25 }); }
      tops.push([ex, ey]);
    }
    if (st === 2) for (const [x, y] of tops.slice(0, 6)) for (let f = 0; f < 4; f++) bloom(c, x + rr(-8, 8), y - rr(6, 16), rr(4, 5.5), 5, one(P.flower), P.eye);
  },
  bush(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3, tops = [];
    const mainTop = by - H * [0.5, 0.7, 0.8, 0.8][st], trunk = P.trunk && st;
    stalk(c, cx, by, cx + rr(-3, 3), mainTop, trunk ? 5 : [2, 3, 3.5, 3.5][st], P.stem, 2);
    for (let k = 0, nb = [1, 6, 8, 8][st]; k < nb; k++) {
      const sy = by - (by - mainTop) * rr(trunk ? 0.4 : 0.1, 0.6), tx = cx + rr(-W * 0.4, W * 0.4), ty = H * rr(0.14, trunk ? 0.4 : 0.6);
      stalk(c, cx, sy, tx, ty, trunk ? 2.6 : 2, P.stem, 5); tops.push([cx, sy, tx, ty]);
    }
    tops.push([cx, by, cx, mainTop]);
    const leafAt = (x, y, a, s) => {
      if (P.leafType === 'compound') pinnate(c, x, y, P.leafLen * s, a, Math.sign(a) * 0.5, 2, P.leafLen * s * 0.3, P.leafLen * s * 0.14, P.leaf, P, { vein: 0.25, lobes: 2 });
      else leaf(c, x, y, P.leafLen * s, P.leafLen * s * P.leafW, a, one(P.leaf), P.tip, { pet: P.leafLen * s * 0.15, lobes: P.leafType === 'broad' ? 3 : 0, wide: 0.45, vein: P.leafType === 'broad' ? 0.35 : 0.2, stem: P.stem });
    };
    const spots = (n) => Array.from({ length: n }, () => { const [x0, y0, x1, y1] = one(tops); const t = rr(0.25, 1); return [...pt(x0, y0, x1, y1, t), Math.atan2(x1 - x0, y0 - y1)]; });
    const leaves = spots(Math.round([6, 40, 50, 46][st] * (P.leafType === 'small' ? 1.6 : 1)));
    leaves.forEach(([x, y, a], i) => i < leaves.length * 0.7 && leafAt(x, y, a + rr(-1.2, 1.2), rr(0.7, 1.05) * (st ? 1 : 0.8)));
    if (st >= 2) {
      for (const [x, y] of spots(ripe ? 3 : 6)) bloom(c, x, y, rr(3.5, 5), 5, one(P.flower), P.eye);
      const sh = P.fruitShape, nf = { long: 4, round: 4, chili: 9, olive: 14 }[sh] * (ripe ? 1 : 0.6);
      for (const [x, y] of spots(Math.round(nf))) {
        const col = ripe ? P.fruit : P.fruitGreen, hi = ripe ? P.fruitHi : undefined;
        if (sh === 'long') { const l = ripe ? rr(16, 22) : rr(8, 12); fruit(c, x, y + l, l * 0.38, l, rr(-0.25, 0.25), col, hi); leaf(c, x, y + 2, 6, 5, Math.PI, P.calyx, P.calyx, { vein: 0 }); }
        else if (sh === 'round') for (let k = 0; k < 3; k++) fruit(c, x + rr(-6, 6), y + 6 + rr(0, 6), ripe ? 6 : 4.5, ripe ? 5.6 : 4.2, 0, ripe && rn() < 0.25 ? '#e8902a' : col, hi);
        else if (sh === 'chili') ribbon(c, x, y, ripe ? rr(14, 19) : rr(10, 14), 2.6, Math.PI + rr(-0.45, 0.45), rr(-0.5, 0.5), col, hi ?? tone(col, 0.3), 0.3);
        else fruit(c, x, y + 3, 2.4, 3.3, rr(-0.5, 0.5), col, hi);
      }
    }
    leaves.forEach(([x, y, a], i) => i >= leaves.length * 0.7 && leafAt(x, y, a + rr(-1.2, 1.2), rr(0.6, 0.9)));
  },
  cole(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, n = [5, 10, 13, 13][st], cr = [0, 0, W * 0.13, W * 0.2][st];
    const all = Array.from({ length: n }, () => { const a = rr(-1.25, 1.25); return [a, H * rr(0.65, 0.98) * (Math.abs(a) > 0.8 ? 0.85 : 1)]; }).sort((p, q) => Math.abs(p[0]) - Math.abs(q[0]));
    const lf = ([a, len]) => leaf(c, cx + rr(-3, 3), by, len, len * 0.4, a, one(P.leaf), P.tip, { wide: 0.64, vein: 0.55, veinCol: P.rib, ribW: 2.2, pet: len * 0.1, stem: P.rib });
    all.slice(0, Math.ceil(n * 0.55)).forEach(lf);
    if (cr) {
      const y = by - H * 0.46;
      const g = c.createRadialGradient(cx - cr * 0.3, y - cr * 0.4, 1, cx, y, cr); g.addColorStop(0, '#fffdf2'); g.addColorStop(0.6, P.curd); g.addColorStop(1, P.curdShade);
      c.fillStyle = g; c.beginPath(); c.ellipse(cx, y, cr, cr * 0.72, 0, 0, TAU); c.fill();
      for (let k = 0; k < 18; k++) { const a = rn() * TAU, d = rn() * cr * 0.8; c.strokeStyle = 'rgba(150,130,80,0.35)'; c.lineWidth = 0.8; c.beginPath(); c.arc(cx + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, rr(2.5, 4.5), Math.PI, TAU); c.stroke(); }
    }
    all.slice(Math.ceil(n * 0.55)).forEach(([a, len]) => lf([a * 1.1, len * 0.8]));
  },
  legume(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3, L = ripe ? P.ripeLeaf : P.leaf, tips = [];
    const [ll, lw] = P.leaflet;
    for (let k = 0, n = [4, 12, 14, 13][st]; k < n; k++) {
      const a = rr(-1, 1) * (st ? 1 : 0.6), len = H * rr(0.5, 0.97), ex = cx + Math.sin(a) * len * 0.7, ey = by - Math.cos(a) * len * 0.85;
      stalk(c, cx + rr(-4, 4), by, ex, ey, 1.3, P.stem, 5);
      for (let m = 0, nm = st ? 4 : 2; m < nm; m++) {
        const [x, y] = pt(cx, by, ex, ey, 0.3 + (m / nm) * 0.75), s = m % 2 ? 1 : -1;
        pinnate(c, x, y, (ll * 0.9 + P.pairs * ll * 0.35) * rr(0.8, 1.1), a + s * rr(0.5, 1.1), s * 0.3, P.pairs, ll, lw, L, P, { vein: lw > 4 ? 0.3 : 0 });
      }
      tips.push([ex, ey]);
    }
    if (st === 2 || (ripe && !P.pod)) for (const [x, y] of tips) {
      if (P.spike) for (let f = 0; f < 7; f++) { c.fillStyle = one(P.flower); c.beginPath(); c.ellipse(x + rr(-2, 2), y - f * 2.6, 2.6, 2, 0, 0, TAU); c.fill(); }
      else for (let f = 0; f < (ripe ? 1 : 2); f++) { const fx = x + rr(-5, 5), fy = y - rr(0, 6); c.fillStyle = one(P.flower); c.beginPath(); c.ellipse(fx, fy - 1.5, 3.4, 2.8, 0, 0, TAU); c.fill(); c.fillStyle = tone(one(P.flower), -0.15); c.beginPath(); c.ellipse(fx, fy + 1.4, 2, 1.6, 0, 0, TAU); c.fill(); }
    }
    if (ripe && P.pod) for (let k = 0; k < 22; k++) {
      const [x0, y0] = one(tips), t = rr(0.1, 0.6), x = x0 + (cx - x0) * t, y = y0 + (by - y0) * t;
      if (P.podShape === 'flat') fruit(c, x, y, 2.6, 3.8, rr(-0.6, 0.6), P.pod);
      else if (P.podShape === 'puff') fruit(c, x, y, 4, 4.8, rr(-0.5, 0.5), P.pod);
      else if (P.podShape === 'fuzzy') for (let q = 0; q < 2; q++) fruit(c, x + q * 3, y, 2.6, 7, rr(-0.5, 0.5), P.pod, '#d8c8a0');
      else ribbon(c, x, y, rr(14, 22), 2.2, Math.PI + rr(-0.7, 0.7), rr(-0.4, 0.4), P.pod, tone(P.pod, 0.3), 0);
    }
  },
  vine(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3, reach = H * [0.3, 0.6, 0.94, 0.94][st];
    // a bamboo stake (and, for a gourd, the cross-bar of its trellis)
    if (st) {
      c.fillStyle = P.stake; c.fillRect(cx - 2.2, H * 0.03, 4.4, by - H * 0.03);
      c.fillStyle = tone(P.stake, -0.3); for (let y = by - 30; y > H * 0.05; y -= rr(34, 46)) c.fillRect(cx - 2.6, y, 5.2, 2);
      if (P.leafType === 'palm') { c.fillStyle = P.stake; c.fillRect(W * 0.04, H * 0.05, W * 0.92, 3.4); }
    }
    c.strokeStyle = P.stem; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx, by);
    const nodes = [];
    for (let y = by; y > by - reach; y -= 4) { const x = cx + Math.sin((by - y) * 0.12) * 5; c.lineTo(x, y); if ((by - y) % 24 < 4) nodes.push([x, y]); }
    c.stroke();
    if (P.leafType === 'palm' && st >= 2) { c.beginPath(); c.moveTo(cx, H * 0.06); c.bezierCurveTo(W * 0.3, H * 0.09, W * 0.2, H * 0.05, W * 0.06, H * 0.08); c.moveTo(cx, H * 0.06); c.bezierCurveTo(W * 0.7, H * 0.09, W * 0.8, H * 0.05, W * 0.94, H * 0.08); c.stroke(); for (let k = 0; k < 8; k++) nodes.push([rr(W * 0.08, W * 0.92), H * rr(0.05, 0.1)]); }
    const lf = P.leafType === 'palm' ? palm : trio, sz = st ? W * 0.17 : W * 0.18;
    nodes.forEach(([x, y], i) => { const s = i % 2 ? 1 : -1, a = s * rr(0.8, 1.6) + (y < H * 0.12 ? Math.PI * 0.8 * s : 0), d = rr(4, 12); c.strokeStyle = P.stem; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(a) * d, y - Math.cos(a) * d); c.stroke(); lf(c, x + Math.sin(a) * d, y - Math.cos(a) * d, sz * rr(0.8, 1.15), a, P.leaf, P); });
    if (st >= 2) {
      for (let k = 0; k < 6; k++) { const [x, y] = one(nodes); bloom(c, x + rr(-6, 6), y + rr(-4, 4), P.leafType === 'palm' ? 6 : 3.6, 5, one(P.flower), P.eye); }
      for (let k = 0, n = P.fruitShape === 'pod' ? 16 : 6; k < n * (ripe ? 1 : 0.5); k++) {
        const [x, y] = one(nodes), col = ripe ? P.fruit : P.fruitGreen;
        if (P.fruitShape === 'pod') for (let q = 0; q < 2; q++) ribbon(c, x + rr(-10, 10), y + rr(0, 8), ripe ? rr(30, 42) : rr(14, 20), 2.8, Math.PI + rr(-0.3, 0.3), rr(-0.3, 0.3), col, P.fruitHi, 0.35);
        else { const l = ripe ? rr(20, 28) : rr(10, 14), fx = x + rr(-4, 4), fy = y + l + 4; fruit(c, fx, fy, l * 0.3, l, rr(-0.15, 0.15), col, P.fruitHi); c.fillStyle = 'rgba(220,255,190,0.35)'; for (let q = 0; q < 14; q++) { c.beginPath(); c.arc(fx + rr(-l * 0.22, l * 0.22), fy + rr(-l * 0.85, l * 0.85), 1.1, 0, TAU); c.fill(); } }
      }
    }
  },
  sunflower(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3, L = ripe ? P.ripeLeaf : P.leaf;
    if (st === 0) { stalk(c, cx, by, cx, H * 0.62, 2.4, P.stem, 1); for (const s of [-1, 1]) { leaf(c, cx, H * 0.64, W * 0.26, W * 0.12, s * 1.1, one(L), P.tip, { wide: 0.4 }); leaf(c, cx, H * 0.75, W * 0.18, W * 0.1, s * 1.4, '#7aaa4a', P.tip, { vein: 0 }); } return; }
    const top = st === 1 ? H * 0.22 : H * 0.12;
    stalk(c, cx, by, cx + 4, top, st === 1 ? 3.6 : 5, ripe ? P.stemRipe : P.stem, 3);
    for (let k = 0, n = st === 1 ? 7 : 10; k < n; k++) {
      const y = by - (by - top) * (0.08 + (k / n) * 0.82), s = k % 2 ? 1 : -1, len = W * rr(0.3, 0.42) * (1 - (k / n) * 0.35);
      leaf(c, cx, y, len, len * 0.52, s * rr(1.1, 1.8), ripe && k < 5 ? one(['#8a7038', '#7a6434']) : one(L), ripe ? P.ripeTip : P.tip, { wide: 0.32, pet: len * 0.3, vein: 0.35, stem: P.stem });
    }
    if (st === 1) { fruit(c, cx + 4, top, 7, 6, 0, '#5f8f34', '#9ac060'); return; }
    if (!ripe) {
      const hx = cx + 8, hy = top + 6, R = W * 0.2;
      for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU; c.fillStyle = tone(P.ray, rr(-0.08, 0.1)); c.beginPath(); c.ellipse(hx + Math.cos(a) * R * 0.78, hy + Math.sin(a) * R * 0.66, R * 0.36, R * 0.11, a, 0, TAU); c.fill(); }
      const g = c.createRadialGradient(hx, hy, 1, hx, hy, R * 0.55); g.addColorStop(0, '#6a4a1a'); g.addColorStop(0.6, P.disc); g.addColorStop(1, '#2e1e0c'); c.fillStyle = g; c.beginPath(); c.ellipse(hx, hy, R * 0.55, R * 0.47, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(200,160,90,0.35)'; for (let k = 0; k < 40; k++) { const a = k * 2.4, d = Math.sqrt(k / 40) * R * 0.5; c.beginPath(); c.arc(hx + Math.cos(a) * d, hy + Math.sin(a) * d * 0.85, 0.9, 0, TAU); c.fill(); }
    } else {
      const hx = cx + 18, hy = top + 22, R = W * 0.18;
      c.strokeStyle = P.stemRipe; c.lineWidth = 4; c.beginPath(); c.moveTo(cx + 4, top); c.quadraticCurveTo(cx + 16, top - 8, hx, hy - R * 0.5); c.stroke();
      fruit(c, hx, hy, R * 0.7, R * 0.6, 0.6, '#7a6a34', '#a8964a');
      for (let k = 0; k < 14; k++) { const a = Math.PI * 0.2 + (k / 14) * Math.PI * 0.9; c.fillStyle = P.rayRipe; c.beginPath(); c.ellipse(hx + Math.cos(a) * R * 0.7, hy + Math.sin(a) * R * 0.62, R * 0.2, R * 0.06, a, 0, TAU); c.fill(); }
    }
  },
  sesame(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3, L = ripe ? P.ripeLeaf : P.leaf, top = by - H * [0.45, 0.85, 0.94, 0.94][st];
    for (let s = 0, n = st ? 2 : 1; s < n; s++) {
      const tx = cx + (s ? rr(-14, 14) : rr(-3, 3)), ty = top + s * H * 0.08;
      stalk(c, cx, by, tx, ty, st ? 2.6 : 1.6, ripe ? P.stemRipe : P.stem, 3);
      for (let k = 0, nn = [2, 8, 9, 8][st]; k < nn; k++) {
        const t = 0.15 + (k / nn) * 0.8, [x, y] = pt(cx, by, tx, ty, t), len = W * (0.34 - t * 0.18) * (st ? 1 : 1.4);
        if (!(ripe && k < 3)) for (const d of [-1, 1]) leaf(c, x, y, len, len * (0.36 - t * 0.18), d * rr(0.7, 1.15), one(L), ripe ? P.ripeTip : P.tip, { wide: 0.35, pet: 3, vein: 0.3 });
        if (st >= 2 && t > 0.45) for (const d of [-1, 1]) {
          if (ripe) fruit(c, x + d * 5, y - 4, 3, 8, d * 0.2, P.capsuleRipe, '#c8a870');
          else if (k % 2) { c.fillStyle = one(P.flower); c.beginPath(); c.ellipse(x + d * 6, y + 2, 3.2, 6, d * 0.35, 0, TAU); c.fill(); c.fillStyle = '#c07aa0'; c.beginPath(); c.arc(x + d * 6.6, y + 6, 1.4, 0, TAU); c.fill(); }
          else fruit(c, x + d * 5, y - 4, 2.6, 6.5, d * 0.2, P.capsule);
        }
      }
    }
  },
  onion(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3, L = ripe ? P.ripeLeaf : P.leaf, tip = ripe ? P.ripeTip : P.tip, br = [0, 0, W * 0.1, W * 0.15][st];
    for (let k = 0, n = [4, 8, 10, 9][st]; k < n; k++) {
      const a = rr(-0.35, 0.35) * (ripe ? 2.2 : 1);
      ribbon(c, cx + rr(-3, 3), by - br * 1.1, H * rr(0.6, 0.95) * (ripe ? 0.8 : 1), rr(2.6, 3.8), a, ripe ? Math.sign(a || 1) * rr(1.5, 2.6) : rr(-0.2, 0.2), one(L), tip, 0.4);
    }
    if (br) { fruit(c, cx, by - br * 0.7, br, br * 0.86, 0, P.bulb, P.bulbHi); c.strokeStyle = 'rgba(255,230,230,0.35)'; c.lineWidth = 0.8; for (const s of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(cx + s * br, by - br * 1.5); c.quadraticCurveTo(cx + s * br * 1.6, by - br * 0.7, cx + s * br * 0.8, by); c.stroke(); } }
  },
  pineapple(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, n = [9, 20, 24, 22][st];
    const ls = Array.from({ length: n }, () => rr(-1.25, 1.25)).sort((a, b) => Math.abs(a) - Math.abs(b));
    const lf = (a) => ribbon(c, cx + rr(-4, 4), by, H * rr(0.5, 0.95) * (1 - Math.abs(a) * 0.2), rr(3.5, 5), a, Math.sign(a) * rr(0.2, 0.7), one(P.leaf), P.tip, 0.25);
    ls.slice(0, n / 2).forEach(lf);
    if (st >= 2) {
      const ripe = st === 3, fy = H * 0.4, rx = ripe ? W * 0.13 : W * 0.09, ry = ripe ? H * 0.17 : H * 0.12;
      fruit(c, cx, fy, rx, ry, 0, ripe ? P.fruit : P.fruitGreen, ripe ? P.fruitHi : '#e888a0');
      c.save(); c.beginPath(); c.ellipse(cx, fy, rx, ry, 0, 0, TAU); c.clip(); c.strokeStyle = 'rgba(90,60,20,0.45)'; c.lineWidth = 0.9;
      for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(cx + k * rx * 0.3 - rx, fy - ry); c.lineTo(cx + k * rx * 0.3 + rx, fy + ry); c.moveTo(cx + k * rx * 0.3 + rx, fy - ry); c.lineTo(cx + k * rx * 0.3 - rx, fy + ry); c.stroke(); }
      c.restore();
      for (let k = 0; k < 9; k++) { const a = rr(-0.6, 0.6); ribbon(c, cx, fy - ry * 0.9, ry * rr(0.6, 1), 2.6, a, a * 0.5, P.crown, P.tip, 0.2); }
    }
    ls.slice(n / 2).forEach(lf);
  },
  melon(c, st, P, W, H) {
    const cx = W / 2, by = H - 2, ripe = st === 3;
    for (let k = 0, n = [4, 10, 12, 10][st]; k < n; k++) palm(c, cx + rr(-W, W) * (st ? 0.42 : 0.15), by - rr(0, H * 0.35), H * rr(0.4, 0.6), rr(-0.8, 0.8), ripe ? [...P.leaf, ...P.ripeLeaf] : P.leaf, P);
    if (st >= 2) {
      for (let k = 0; k < 3; k++) bloom(c, cx + rr(-W * 0.4, W * 0.4), by - rr(H * 0.2, H * 0.5), 4.4, 5, one(P.flower), P.eye);
      const rx = ripe ? W * 0.2 : W * 0.08, ry = ripe ? H * 0.42 : H * 0.2, fx = cx + rr(-10, 10), fy = by - ry;
      melonSkin(c, fx, fy, rx, ry, P);
    }
  },
};
function melonSkin(c, x, y, rx, ry, P) {
  fruit(c, x, y, rx, ry, 0, P.stripe, '#cfe8a0');
  c.save(); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.clip(); c.fillStyle = P.fruit;
  for (let k = -5; k <= 5; k++) { c.beginPath(); c.ellipse(x + (k / 5) * rx, y, rx * 0.07, ry * 1.1, 0, 0, TAU); c.fill(); }
  const g = c.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 1, x, y, rx); g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.35)'); c.fillStyle = g; c.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  c.restore();
}

// ---- the same plants seen from above, for the flat card: drawn round the origin within radius R ----
function canopy(c, st, n, R, leafAt) { for (let k = 0; k < n; k++) { const a = rn() * TAU, d = Math.sqrt(rn()) * R * [0.45, 0.62, 0.68, 0.68][st]; leafAt(Math.cos(a) * d, Math.sin(a) * d, k % 3 ? a + Math.PI / 2 + rr(-0.5, 0.5) : rn() * TAU); } }
const scatter = (R, n, f, reach = 0.8) => { for (let k = 0; k < n; k++) { const a = rn() * TAU, d = Math.sqrt(rn()) * R * reach; f(Math.cos(a) * d, Math.sin(a) * d); } };
const TOP2 = {
  potato(c, st, P, R) {
    const ripe = st === 3;
    canopy(c, st, [7, 30, 36, 32][st], R, (x, y, a) => pinnate(c, x, y, R * rr(0.34, 0.46), a, rr(-0.4, 0.4), 3, R * 0.13, R * 0.07, ripe && rn() < 0.7 ? P.ripeLeaf : P.leaf, P, { vein: 0.25 }));
    if (st === 2) scatter(R, 9, (x, y) => { for (let f = 0; f < 3; f++) bloom(c, x + rr(-5, 5), y + rr(-5, 5), 4.6, 5, one(P.flower), P.eye); }, 0.6);
  },
  legume(c, st, P, R) {
    const ripe = st === 3, [ll, lw] = P.leaflet;
    canopy(c, st, [8, 30, 34, 32][st], R, (x, y, a) => pinnate(c, x, y, ll * 0.9 + P.pairs * ll * 0.35, a, rr(-0.3, 0.3), P.pairs, ll, lw, ripe ? P.ripeLeaf : P.leaf, P, { vein: lw > 4 ? 0.3 : 0 }));
    if (st === 2 || (ripe && !P.pod)) scatter(R, 16, (x, y) => { c.fillStyle = one(P.flower); c.beginPath(); c.arc(x, y, 2.8, 0, TAU); c.fill(); }, 0.65);
    if (ripe && P.pod) scatter(R, 14, (x, y) => fruit(c, x, y, 2.6, 4, rn() * 3, P.pod), 0.6);
  },
  bush(c, st, P, R) {
    const ripe = st === 3;
    canopy(c, st, Math.round([7, 40, 48, 44][st] * (P.leafType === 'small' ? 1.6 : 1)), R, (x, y, a) => (P.leafType === 'compound'
      ? pinnate(c, x, y, P.leafLen * 0.9, a, 0.3, 2, P.leafLen * 0.28, P.leafLen * 0.13, P.leaf, P, { vein: 0.25, lobes: 2 })
      : leaf(c, x, y, P.leafLen * rr(0.8, 1.1), P.leafLen * P.leafW, a, one(P.leaf), P.tip, { lobes: P.leafType === 'broad' ? 3 : 0, wide: 0.45, vein: 0.3 })));
    if (st >= 2) {
      scatter(R, 5, (x, y) => bloom(c, x, y, 4, 5, one(P.flower), P.eye), 0.6);
      const sh = P.fruitShape, col = ripe ? P.fruit : P.fruitGreen;
      scatter(R, { long: 4, round: 6, chili: 8, olive: 14 }[sh], (x, y) => (sh === 'long' ? fruit(c, x, y, 5, 12, rn() * 3, col, ripe ? P.fruitHi : undefined) : sh === 'chili' ? fruit(c, x, y, 2.2, 7, rn() * 3, col, ripe ? P.fruitHi : undefined) : fruit(c, x, y, sh === 'olive' ? 2.4 : 5.5, sh === 'olive' ? 3.2 : 5.2, 0, col, ripe ? P.fruitHi : undefined)), 0.7);
    }
  },
  cole(c, st, P, R) {
    const n = [5, 10, 13, 13][st], cr = [0, R * 0.12, R * 0.28, R * 0.4][st];
    for (let k = 0; k < n; k++) leaf(c, 0, 0, R * rr(0.75, 0.98) * [0.55, 0.85, 1, 1][st], R * 0.36 * [0.55, 0.85, 1, 1][st], (k / n) * TAU + rr(-0.2, 0.2), one(P.leaf), P.tip, { wide: 0.64, vein: 0.55, veinCol: P.rib, ribW: 2.2 });
    if (st >= 2) {
      const g = c.createRadialGradient(-cr * 0.2, -cr * 0.2, 1, 0, 0, cr); g.addColorStop(0, '#fffdf4'); g.addColorStop(0.7, P.curd); g.addColorStop(1, P.curdShade);
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, cr, 0, TAU); c.fill();
      for (let k = 0; k < 26; k++) { const a = rn() * TAU, d = Math.sqrt(rn()) * cr * 0.85; c.strokeStyle = 'rgba(150,130,80,0.3)'; c.lineWidth = 0.8; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, rr(2.5, 5), 0, TAU); c.stroke(); }
    }
  },
  pineapple(c, st, P, R) {
    const n = [9, 20, 24, 22][st];
    for (let k = 0; k < n; k++) ribbon(c, 0, 0, R * rr(0.6, 0.98) * [0.55, 0.85, 1, 1][st], rr(3.5, 5), (k / n) * TAU + rr(-0.15, 0.15), rr(-0.2, 0.2), one(P.leaf), P.tip, 0.25);
    if (st >= 2) { fruit(c, 0, 0, R * 0.22, R * 0.22, 0, st === 3 ? P.fruit : P.fruitGreen, st === 3 ? P.fruitHi : '#e888a0'); for (let k = 0; k < 9; k++) ribbon(c, 0, 0, R * 0.22, 2.6, (k / 9) * TAU, 0.2, P.crown, P.tip, 0.2); }
  },
  melon(c, st, P, R) {
    const ripe = st === 3;
    c.strokeStyle = P.stem; c.lineWidth = 1.4;
    for (let k = 0; k < (st ? 5 : 2); k++) { const a = rn() * TAU; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a + 0.4) * R * 0.5, Math.sin(a + 0.4) * R * 0.5, Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); c.stroke(); }
    canopy(c, st, [5, 22, 26, 22][st], R * 1.35, (x, y, a) => palm(c, x, y, R * rr(0.13, 0.18), a, ripe ? [...P.leaf, ...P.ripeLeaf] : P.leaf, P));
    if (st >= 2) { scatter(R, 4, (x, y) => bloom(c, x, y, 4.4, 5, one(P.flower), P.eye), 0.7); melonSkin(c, R * 0.15, -R * 0.1, ripe ? R * 0.36 : R * 0.12, ripe ? R * 0.26 : R * 0.09, P); }
  },
};
// brown and collapsed: the same plant in the colours of a dead crop
const DEAD = {
  leaf: ['#7a5a34', '#8a6a3e', '#6a4c2c', '#9a7c4c'], ripeLeaf: ['#7a5a34', '#8a6a3e', '#6a4c2c'], seed: ['#7a5a34', '#8a6a3e'], tip: '#b09060', ripeTip: '#b09060',
  stem: '#7a6040', stemRipe: '#7a6040', flower: ['#7a6040'], eye: '#5a4028', fruit: '#4a3420', fruitHi: '#7a5a40', fruitGreen: '#5a4428', grain: '#8a6a40', grainGreen: '#8a6a40',
  pod: '#6a5030', podRipe: '#6a5030', curd: '#9a8058', curdShade: '#6a5438', husk: '#8a7048', huskRipe: '#8a7048', tassel: '#8a7048', silk: '#5a4028', ray: '#7a5a30', rayRipe: '#7a5a30', disc: '#3a2a18',
  bulb: '#7a4a3a', bulbHi: '#9a6a5a', capsule: '#6a5030', capsuleRipe: '#6a5030', crown: '#6a5030', stripe: '#7a6a3a', rib: '#a08a60', calyx: '#6a5030',
};
const atlasCache = {};
// The atlas of one crop: CROP_COLS columns (seedling, growing, grown, ripe, dead) of the side view, and below them the
// view from above when the crop has a flat card. vSplit: where the side views start in the texture's v.
export function cropAtlas(kind, { light = false } = {}) {
  const key = kind + (light ? ':light' : '');
  if (atlasCache[key]) return atlasCache[key];
  const P = cropLook(kind), H = Math.round(CW * P.aspect), T = P.top ? CW : 0, k = light ? 0.6 : 1;
  const cv = document.createElement('canvas'); cv.width = Math.round(CW * CROP_COLS * k); cv.height = Math.round((H + T) * k);
  const c = cv.getContext('2d'); c.scale(k, k); c.lineCap = 'round'; c.lineJoin = 'round';
  for (let col = 0; col < CROP_COLS; col++) {
    const dead = col === 4, Q = dead ? { ...P, ...DEAD, stake: P.stake } : P, st = dead ? 2 : col;
    S = 101 + col * 977 + kind.length * 31;
    c.save(); c.translate(col * CW, 0); c.beginPath(); c.rect(2, 2, CW - 4, H - 3); c.clip();
    if (dead) { c.translate(CW / 2, H); c.scale(1.15, 0.5); c.translate(-CW / 2, -H); }
    (DRAW2[P.draw] ?? DRAW2.legume)(c, st, Q, CW, H);
    c.restore();
    // shade low in the plant, where leaves crowd and the sky is hidden
    c.save(); c.globalCompositeOperation = 'source-atop';
    const g = c.createLinearGradient(0, H, 0, H * 0.4); g.addColorStop(0, 'rgba(24,18,8,0.5)'); g.addColorStop(1, 'rgba(24,18,8,0)');
    c.fillStyle = g; c.fillRect(col * CW, 0, CW, H); c.restore();
    if (T) {
      S = 211 + col * 613 + kind.length * 17;
      c.save(); c.translate(col * CW + CW / 2, H + T / 2); c.beginPath(); c.arc(0, 0, CW / 2 - 3, 0, TAU); c.clip();
      if (dead) c.scale(0.8, 0.8);
      (TOP2[P.draw] ?? TOP2.legume)(c, st, Q, CW / 2 - 4);
      c.restore();
    }
  }
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  return (atlasCache[key] = { map, vSplit: T / (H + T), canvas: cv });
}

// one plant: `cards` crossed upright cards (unit size, foot at the origin) and the flat top card; normals lean up so
// both faces light like leaves in the sun
export function cropCards(P, vSplit) {
  const pos = [], nor = [], uv = [], idx = [], u0 = 1.5 / (CW * CROP_COLS), u1 = 1 / CROP_COLS - u0, n = P.cards ?? 3;
  for (let k = 0; k < n; k++) {
    const r = (k / n) * Math.PI + 0.3, hx = Math.cos(r) * 0.5, hz = Math.sin(r) * 0.5, o = pos.length / 3;
    pos.push(-hx, 0, -hz, hx, 0, hz, hx, 1, hz, -hx, 1, -hz);
    for (let v = 0; v < 4; v++) nor.push(-Math.sin(r) * 0.38, 0.92, Math.cos(r) * 0.38);
    uv.push(u0, vSplit, u1, vSplit, u1, 1, u0, 1);
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  if (P.top) {
    const o = pos.length / 3, y = P.top;
    pos.push(-0.5, y, 0.5, 0.5, y, 0.5, 0.5, y, -0.5, -0.5, y, -0.5);
    for (let v = 0; v < 4; v++) nor.push(0, 1, 0);
    uv.push(u0, 0.004, u1, 0.004, u1, vSplit - 0.004, u0, vSplit - 0.004);
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}

// The shaders. aGrow per plant: x the atlas column, y how wilted (0–1), z pests (0/1), w a sway phase. Wilting sags the
// plant and bends its top over and fades its green to straw; pests mottle and hole the leaves; the wind bends the top
// most (a breeze most days, a gale in the storm); a farmer walking through pushes the stems aside.
const VERT_HEAD = 'attribute vec4 aGrow;\nuniform float uTime; uniform float uWind; uniform float uAmp; uniform vec3 uPlayer;\nvarying vec2 vCrop;\n';
const VERT_UV = `#include <uv_vertex>
#ifdef USE_MAP
  vMapUv.x += aGrow.x * ${(1 / CROP_COLS).toFixed(5)};
#endif`;
const VERT_BEND = `#include <begin_vertex>
  float hy = clamp(transformed.y, 0.0, 1.0);
  transformed.x += aGrow.y * 0.3 * hy * hy;
  transformed.y *= 1.0 - aGrow.y * 0.24 * hy;
#ifdef USE_INSTANCING
  mat3 cropM = mat3(instanceMatrix);
  vec3 cropP = vec3(instanceMatrix[3]);
  vec3 s2 = vec3(dot(cropM[0], cropM[0]), dot(cropM[1], cropM[1]), dot(cropM[2], cropM[2]));
  float tall = sqrt(s2.y);
  float waveA = sin(uTime * 1.15 - cropP.x * 0.12 - cropP.z * 0.08);
  float waveB = sin(uTime * 2.45 + cropP.z * 0.24 - cropP.x * 0.19 + aGrow.w * 3.1415);
  float waveC = sin(uTime * 4.85 + aGrow.w * 6.283 + cropP.x * 0.9 + cropP.z * 0.7);
  float gust = waveA * 0.52 + waveB * 0.30 + waveC * 0.18;
  float cross = waveB * 0.35 - waveC * 0.15;
  vec3 wd = vec3(gust, 0.0, gust * 0.45 + cross * 0.28) * (uWind * uAmp * hy * hy * tall);
  vec2 dp = cropP.xz - uPlayer.xz; float dd = length(dp);
  float push = (1.0 - smoothstep(0.18, 1.32, dd)) * hy * min(tall, 1.25) * 0.58;
  wd.xz += (dd > 0.001 ? dp / dd : vec2(0.0, 1.0)) * push;
  wd.y -= push * hy * 0.32;
  transformed += (transpose(cropM) * wd) / max(s2, vec3(1e-6));
#endif
  vCrop = aGrow.yz;`;
const FRAG_MAP = `#include <map_fragment>
#ifdef USE_MAP
  // thin blades stay solid far off: mipmaps average their edges away, so lift alpha with the mip level
  vec2 tsz = vec2(textureSize(map, 0));
  vec2 ddx = dFdx(vMapUv * tsz), ddy = dFdy(vMapUv * tsz);
  diffuseColor.a *= 1.0 + max(0.0, 0.5 * log2(max(dot(ddx, ddx), dot(ddy, ddy)))) * 0.3;
  float bite = fract(sin(dot(floor(vMapUv * vec2(300.0, 200.0)), vec2(12.9898, 78.233))) * 43758.5453);
#else
  float bite = 0.0;
#endif
  float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum * 1.32, lum * 1.08, lum * 0.55), vCrop.x * 0.8);
  diffuseColor.rgb *= 1.0 - vCrop.y * step(0.72, bite) * 0.6;
  if (vCrop.y > 0.5 && bite > 0.94) discard;`;
// The material and shadow material for one crop's plants; `u` holds the uniforms shared by every crop of the field
// ({ time, wind, player } as { value } objects).
export function cropMaterials(kind, u, { light = false } = {}) {
  const P = cropLook(kind), A = cropAtlas(kind, { light }), amp = { value: P.sway ?? 0.1 };
  const vert = (sh) => {
    Object.assign(sh.uniforms, { uTime: u.time, uWind: u.wind, uPlayer: u.player, uAmp: amp });
    sh.vertexShader = VERT_HEAD + sh.vertexShader.replace('#include <uv_vertex>', VERT_UV).replace('#include <begin_vertex>', VERT_BEND);
  };
  const mat = new THREE.MeshStandardMaterial({ map: A.map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  mat.onBeforeCompile = (sh) => {
    vert(sh);
    // a two-sided card keeps its up-leaning normal on both faces, or the back of every plant turns dark
    sh.fragmentShader = 'varying vec2 vCrop;\n' + sh.fragmentShader.replace('#include <map_fragment>', FRAG_MAP).replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);');
  };
  mat.customProgramCacheKey = () => 'fs-crop-v2';
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: A.map, alphaTest: 0.5 });
  depth.onBeforeCompile = vert; depth.customProgramCacheKey = () => 'fs-crop-depth-v2';
  return { mat, depth, geo: cropCards(P, A.vSplit), look: P };
}

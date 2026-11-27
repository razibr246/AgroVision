// The character preview's set: the farmer on a round earthen base, like a collectible figure on its display stand,
// in front of their own place. The ground, path and soil colours and the sky's haze, dust or fog are that world's
// (layout.js), so Dhamrai stands under a hazy sky in green paddy, the Barind on red soil under dust, Sindh in the
// heat. A soft studio light sits on top (stage.js createPreview). Kept small: one canvas sky, one ground, instanced
// paddy, a dozen trees, so it also draws well on a phone.
import * as THREE from 'three';
import { buildPalm, frondGeometry } from './palm.js';
import { buildTree, buildBamboo } from './leafytree.js';
import { plantField } from './plants.js';
import { layoutFor } from '../layout.js';

// haze colour and how much of it there is, as the game world tints its sky (world.js SKYTINT)
const AIR = { hazy: ['#d9cfb0', 0.42], dusty: ['#e0c597', 0.45], hot: ['#f2e2b8', 0.32], foggy: ['#e4e8e4', 0.6], clear: ['#f3e6c8', 0.2] };
// Each place's own set: the crop in front, the trees, what lies on the horizon, and a landmark where one truly belongs.
// crop: paddy | wheat | mustard | veg | low (sesame, groundnut) | maize; far: hills | mountains | snow; water: a river,
// haor or gher band behind the bund; sand: a char sandbank; marks: kiln (brick chimney), hay, pagoda (Bagan), dzong.
const SETS = {
  dhamrai: { crop: 'mustard', trees: ['dome', 'bamboo', 'palm', 'dome', 'bamboo'], marks: ['kiln'] },
  barind: { crop: 'wheat', trees: ['dome', 'dome', 'dome', 'palm', 'dome'] }, // Rajshahi's mango orchards
  sitakunda: { crop: 'veg', trees: ['palm', 'dome', 'palm', 'bamboo'], far: 'hills', farColor: '#5f8a4c' },
  coast: { crop: 'veg', trees: ['golpata', 'palm', 'golpata', 'palm'], water: '#6f9fb0' }, // Dacope: river and embankment
  tidal: { crop: 'paddy', trees: ['palm', 'palm', 'dome', 'palm'], water: '#7fa6b4', marks: ['boat'] },
  char: { crop: 'maize', trees: ['dome', 'bamboo'], sand: '#e2d3a6', water: '#9cb8c0' }, // the Teesta's sandbank
  haor: { crop: 'paddy', trees: ['dome', 'bamboo', 'dome'], water: '#7aa8bf', far: 'hills', farColor: '#5c7f96' }, // Meghalaya hills
};

const mix = (a, b, t) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

function skyTexture(top, horizon) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(0.4, mix(top, horizon, 0.45)); gr.addColorStop(0.62, horizon); gr.addColorStop(1, horizon);
  x.fillStyle = gr; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function groundTexture(grass, soil) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = grass; x.fillRect(0, 0, 256, 256);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 2200; k++) {
    const isSoil = r() < 0.22;
    x.fillStyle = isSoil ? mix(grass, soil, 0.45 + r() * 0.35) : mix(grass, r() < 0.5 ? '#e8f0d0' : '#1b3314', 0.14 + r() * 0.12);
    const sz = 1 + Math.floor(r() * 3);
    x.fillRect(r() * 256, r() * 256, sz, sz);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createBackdrop(scene) {
  const root = new THREE.Group(); scene.add(root);
  const owned = []; // geometries, materials and textures to dispose
  const keep = (o) => { owned.push(o); return o; };
  let current = null;

  function build(world) {
    for (const o of root.children.splice(0)) o.removeFromParent();
    for (const o of owned.splice(0)) o.dispose();
    let L = null;
    try { L = world ? layoutFor(world) : null; } catch { L = null; }
    const grass = L?.grass ?? '#7fae4c', soil = L?.soil ?? '#7a6248', path = L?.path ?? '#a08868';
    const SET = SETS[world] ?? SETS.dhamrai;
    const [airC, air] = AIR[L?.sky] ?? AIR.clear;
    const horizon = mix('#f4e4c2', airC, 0.45), top = mix('#3f7fd0', airC, air * 0.45);

    // the sky behind the camera's fixed view (a screen-space gradient, so the blue is not lost to the tone mapping),
    // and the haze that melts the far ground into its horizon
    scene.background = keep(skyTexture(top, horizon));
    scene.fog = new THREE.Fog(horizon, 12 - air * 4, 34);

    // the place's ground, and the earthen display base the farmer stands on
    const ground = new THREE.Mesh(keep(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2)), keep(new THREE.MeshStandardMaterial({ map: keep(groundTexture(grass, soil)), roughness: 1 })));
    ground.position.y = -0.07; ground.receiveShadow = true; root.add(ground);
    const base = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.82, 0.9, 0.07, 48)), keep(new THREE.MeshStandardMaterial({ color: path, roughness: 0.95 })));
    base.position.y = -0.035; base.receiveShadow = true; root.add(base);
    const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(0.86, 0.022, 8, 64).rotateX(Math.PI / 2)), keep(new THREE.MeshStandardMaterial({ color: mix(soil, '#000000', 0.25), roughness: 0.9 })));
    rim.position.y = 0.0; root.add(rim);

    // the place's crop in rows behind and beside the figure: real plants drawn once and set as crossed cards (plants.js)
    const spots = [];
    for (let row = 0; row < 12; row++) for (let col = -16; col <= 16; col++) {
      const x = col * 0.36 + (row % 2) * 0.18, z = -1.95 - row * 0.40;
      if (Math.hypot(x, z) < 1.55 || (Math.abs(x) < 1.15 && z > -2.3)) continue;
      spots.push([x, z]);
    }
    let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const field = plantField(SET.crop, SET.crop === 'maize' ? spots.filter((_, i) => i % 3 !== 1) : spots, { perSpot: SET.crop === 'maize' ? 1 : 2, own: keep, seedBase: 11 }); // maize stands taller and sparser
    field.position.y = -0.07; root.add(keep(field));
    const bund = new THREE.Mesh(keep(new THREE.BoxGeometry(14, 0.12, 0.38)), keep(new THREE.MeshStandardMaterial({ color: mix(soil, '#2e1e0e', 0.15), roughness: 0.95 })));
    bund.position.set(0, -0.03, -1.65); root.add(bund);

    // the village tree line: mango and jackfruit domes, coconut and areca palms, a clump of bamboo
    const trunkM = keep(new THREE.MeshStandardMaterial({ color: '#6b4f36', roughness: 1 }));
    const leafM = keep(new THREE.MeshStandardMaterial({ color: mix(grass, '#1e4a1c', 0.45), roughness: 0.9 }));
    const leafM2 = keep(new THREE.MeshStandardMaterial({ color: mix(grass, '#2f6a28', 0.3), roughness: 0.9 }));
    const trunkG = keep(new THREE.CylinderGeometry(0.07, 0.11, 1, 10).translate(0, 0.5, 0));
    const leafDark = keep(new THREE.MeshStandardMaterial({ color: mix(grass, '#10301a', 0.62), roughness: 0.95 }));
    const SLOTS = [[-7.5, -15, 0.95], [-4.4, -17, 0.85], [-1.6, -18.5, 1.15], [2.4, -16.5, 0.9], [5.2, -15.5, 0.9], [8.4, -17, 0.85], [-10.5, -17.5, 0.85], [11, -14.5, 0.8]];
    const trees = SLOTS.map(([x, z, k], i) => [x, z, SET.trees[i % SET.trees.length], k]);
    for (const [x, z, kind, k] of trees) {
      const t = new THREE.Group(); t.position.set(x, -0.07, z); t.scale.setScalar(k); root.add(t);
      if (kind === 'dome') {
        const tree = buildTree(SET.crop === 'veg' || SET.crop === 'paddy' ? 'jackfruit' : 'mango', { seed: x * 13 + z }); tree.scale.setScalar(0.72); t.add(tree);
      } else if (kind === 'palm') { // a coconut palm: curved ringed trunk, pinnate fronds, nuts (palm.js)
        const pm = buildPalm({ kind: 'coconut', h: 6.2, lean: 0.1 + (x % 3) * 0.02, seed: Math.round(x * 10 + z), own: keep });
        pm.scale.setScalar(3.6 / 6.2); pm.rotation.y = x > 0 ? Math.PI : 0; t.add(pm);
      } else if (kind === 'pine') {
        const tr = new THREE.Mesh(trunkG, trunkM); tr.scale.set(0.9, 1.2, 0.9); t.add(tr);
        for (let c = 0; c < 5; c++) { const cn = new THREE.Mesh(keep(new THREE.ConeGeometry(1.05 - c * 0.19, 1.3, 14)), c % 2 ? leafM2 : leafDark); cn.position.y = 1.4 + c * 0.62; t.add(cn); }
      } else if (kind === 'tall') { // tall poplar and eucalyptus along field edges
        const tree = buildTree(x > 0 ? 'eucalyptus' : 'poplar', { seed: x * 13 + z }); tree.scale.setScalar(x > 0 ? 0.55 : 0.85); t.add(tree);
      } else if (kind === 'golpata') { // nipa palm fronds rising straight from the mud of the Sundarbans' edge
        // nipa fronds: long pinnate leaves rising straight from the mud and arching out (palm.js)
        const nipaM = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
        for (let f = 0; f < 12; f++) { const fr = new THREE.Mesh(frondGeometry({ len: 3.2, leaflets: 34, leaf: 0.6, droop: 0.32 }), nipaM); fr.position.set(0, 0.05, 0); fr.rotation.set(-1.0 - (f % 3) * 0.12, (f / 12) * Math.PI * 2, 0, 'YXZ'); t.add(fr); }
      } else { // a bamboo clump
        const b = buildBamboo({ seed: x * 13 + z, culms: 9 }); b.scale.setScalar(0.62); t.add(b);
      }
    }

    root.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.userData.shared) keep(o.geometry); });
    // a river, haor or gher behind the bund, and a char's sandbank
    const band = (color, z0, z1, y = -0.06) => { const b = new THREE.Mesh(keep(new THREE.PlaneGeometry(40, z1 - z0).rotateX(-Math.PI / 2)), keep(new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.05 }))); b.position.set(0, y, (z0 + z1) / 2); root.add(b); };
    if (SET.sand) band(SET.sand, -12.5, -8.5, -0.055);
    if (SET.water) band(SET.water, -14, SET.sand ? -12.5 : -9.5, -0.05);
    // the horizon: green hills, a bare range, or snow peaks
    if (SET.far) {
      const farM = keep(new THREE.MeshStandardMaterial({ color: SET.farColor, roughness: 1, flatShading: true })), snowM = keep(new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.8, flatShading: true }));
      for (let k = 0; k < 7; k++) {
        const x = -16 + k * 5.4 + (r() - 0.5) * 2, h = SET.far === 'hills' ? 3 + r() * 2.5 : 6 + r() * 5;
        const hill = new THREE.Mesh(keep(SET.far === 'hills' ? new THREE.SphereGeometry(4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.ConeGeometry(4.5, 1, 6)), farM);
        if (SET.far === 'hills') hill.scale.set(1.3, h / 4, 1); else { hill.scale.set(1, h, 1); hill.position.y = h / 2; }
        hill.position.x = x; hill.position.z = -24 - r() * 3; hill.position.y += -0.07; root.add(hill);
        if (SET.far === 'snow') { const cap = new THREE.Mesh(keep(new THREE.ConeGeometry(4.5 * 0.32, 1, 6)), snowM); cap.scale.set(1, h * 0.32, 1); cap.position.set(x, h - h * 0.16 - 0.07, hill.position.z); root.add(cap); }
      }
    }
    // a landmark where one truly belongs
    const brick = keep(new THREE.MeshStandardMaterial({ color: '#a8583a', roughness: 0.95 })), white = keep(new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.9 }));
    for (const mk of SET.marks ?? []) {
      if (mk === 'kiln') { const ch = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.35, 0.55, 9, 8)), brick); ch.position.set(9.5, 4.4, -21); root.add(ch); }
      if (mk === 'hay') for (const [x, z] of [[-5.5, -10.5], [6, -11.5]]) { const hs = new THREE.Mesh(keep(new THREE.ConeGeometry(0.9, 1.8, 10)), keep(new THREE.MeshStandardMaterial({ color: '#d8bf73', roughness: 1 }))); hs.position.set(x, 0.83, z); root.add(hs); }
      if (mk === 'boat') { const bt = new THREE.Mesh(keep(new THREE.BoxGeometry(2.6, 0.25, 0.6)), keep(new THREE.MeshStandardMaterial({ color: '#5a3d26', roughness: 0.9 }))); bt.position.set(-3.5, 0.03, -11.5); root.add(bt); }
      if (mk === 'pagoda') for (const [x, z, k] of [[-6, -20, 1.2], [4.5, -23, 1.6], [10, -19, 0.9]]) {
        const pg = new THREE.Group(); pg.position.set(x, -0.07, z); pg.scale.setScalar(k); root.add(pg);
        const b1 = new THREE.Mesh(keep(new THREE.BoxGeometry(3, 0.8, 3)), brick); b1.position.y = 0.4; pg.add(b1);
        const b2 = new THREE.Mesh(keep(new THREE.BoxGeometry(2.2, 0.6, 2.2)), brick); b2.position.y = 1.1; pg.add(b2);
        const bell = new THREE.Mesh(keep(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), brick); bell.position.y = 1.4; bell.scale.set(1, 1.2, 1); pg.add(bell);
        const spire = new THREE.Mesh(keep(new THREE.ConeGeometry(0.3, 2.2, 8)), keep(new THREE.MeshStandardMaterial({ color: '#d9b04a', roughness: 0.4, metalness: 0.5 }))); spire.position.y = 3.6; pg.add(spire);
      }
      if (mk === 'dzong') {
        const dz = new THREE.Group(); dz.position.set(7, -0.07, -21); root.add(dz);
        const wall = new THREE.Mesh(keep(new THREE.BoxGeometry(7, 3.4, 3)), white); wall.position.y = 1.7; dz.add(wall);
        const band2 = new THREE.Mesh(keep(new THREE.BoxGeometry(7.05, 0.45, 3.05)), keep(new THREE.MeshStandardMaterial({ color: '#8c2a22', roughness: 0.9 }))); band2.position.y = 3.0; dz.add(band2);
        const roof = new THREE.Mesh(keep(new THREE.CylinderGeometry(0, 4.6, 1.2, 4)), keep(new THREE.MeshStandardMaterial({ color: '#c49a3a', roughness: 0.6 }))); roof.position.y = 3.9; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.5); dz.add(roof);
      }
    }
  }

  return {
    set(world) { if (world !== current) { current = world; build(world); } },
    dispose() { for (const o of root.children.splice(0)) o.removeFromParent(); for (const o of owned.splice(0)) o.dispose(); root.removeFromParent(); scene.fog = null; scene.background = null; },
  };
}

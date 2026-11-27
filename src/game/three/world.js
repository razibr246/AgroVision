// The 3D world around the field: terrain shaped and coloured by layout.js (soil, paths, sand, neighbours' fields,
// Punakha's terraces), water, the sky through the day and night, distant scenery for each place, every prop, the
// animals, and the weather — rain, hail, heat haze, lightning and rising flood water — plus the storm's safe zone
// and the quest marker. Static props are merged into a few large meshes so the scene draws quickly on phones.
// Each place has its own air (layout.js `air`: haze, dust, sea air or winter fog) and its own smoke — kiln chimneys,
// burning straw, the cooking fire at home in the morning and evening.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BUILD, M, blob, cone, box, cyl } from './props.js';
import { buildTree } from './leafytree.js';
import { FIELD_W, FIELD_D } from '../regions.js';
import { inWater } from '../layout.js';
import { createNature } from './nature.js';
import { updateAnimals } from './animals.js';
import { animalBody } from '../footing.js';
import { daylight } from '../sunlight.js';

const _sunC = new THREE.Color(), _lr = new THREE.Vector3(), _lu = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const _down = new THREE.Vector3(0, -1, 0), _rayDir = new THREE.Vector3(), _beamQ = new THREE.Quaternion(), _flashTop = new THREE.Color('#eef6ff'), _flashMid = new THREE.Color('#cfdcf5');
import { play } from '../sound.js';
import { setSurfaceQuality, groundMaterial, MASK_HALF, waterMaterial, waterUniforms, setWaterDepth } from './surfaces.js';

const C = (h) => new THREE.Color(h);
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const PATCH = { wheat: '#7fa84a', stubble: '#c9b06a', mustard: '#e3c93a', paddy: '#a9b44a', bare: '#b39466', sunflower: '#d9b43a', sesame: '#9aa45a', groundnut: '#7c9a4a', soybean: '#608d3c', maize: '#9b9b45', olive: '#71804f' };

function terrain(L) {
  const size = 340, seg = 200;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), grassy = new Float32Array(pos.count);
  const ground = C(L.grass), soil = C(L.soil), path = C(L.path), sand = C(L.sand ?? '#d9c79c'), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const far = Math.hypot(x, z);
    let h = L.ground(x, z);
    const wet = L.water.some((w) => (w.r ? Math.hypot(x - w.cx, z - w.cz) < w.r + 2 : x > w.x0 - 2 && x < w.x1 + 2 && z > w.z0 - 2 && z < w.z1 + 2));
    if (far > 70 && !wet) h += (far - 70) * 0.045 * (L.far === 'himalaya' ? 3.2 : (L.far === 'churia' || L.far === 'meghalaya') && z < 0 ? 1.7 : L.far === 'chittagong' && x > 0 ? 2.3 : 0.25);
    pos.setY(i, h);
    const n = hash(Math.floor(x / 2), Math.floor(z / 2));
    tmp.copy(ground).offsetHSL((n - 0.5) * 0.03, (n - 0.5) * 0.08, (n - 0.5) * 0.06);
    let gr = 1; // how much of this ground is grass (surfaces.js picks grass or bare-soil grain by it)
    if (L.patches) for (const [x0, x1, z0, z1, k] of L.patches) if (x > x0 && x < x1 && z > z0 && z < z1) { gr = 0.2; tmp.set(PATCH[k]).offsetHSL(0, 0, (n - 0.5) * 0.05 + (k === 'stubble' && Math.floor(x) % 2 ? 0.04 : 0)); break; }
    if (L.terraces) { const d = Math.max(0, Math.abs(x) - 26, -z - 18); if (d > 0) tmp.set(Math.floor(d / 3.2) % 2 ? '#b5a84a' : '#8fb24a').offsetHSL(0, 0, (n - 0.5) * 0.05); if (d % 3.2 > 2.6) tmp.set('#7a6a4a'); if (d > 0) gr = 0.55; }
    if (L.sandbank && z > L.sandbank.z0 && z < L.sandbank.z1 + 4) { tmp.lerp(sand, 0.85); gr = 0.1; }
    // paths inside the detail mask are drawn sharp by the ground shader (surfaces.js); only the far ones stay here
    if (Math.abs(x) > MASK_HALF - 1 || Math.abs(z) > MASK_HALF - 1) {
      let pd = 99; for (const p of L.paths) for (let k = 1; k < p.length; k++) pd = Math.min(pd, segDist(x, z, p[k - 1], p[k]));
      if (pd < 1.3) tmp.lerp(path, 0.85 * (1 - pd / 1.3) + 0.15);
    }
    if (Math.abs(x) < FIELD_W / 2 + 1 && Math.abs(z) < FIELD_D / 2 + 1) { tmp.copy(soil); gr = 0; }
    for (const w of L.water) { const d = w.r ? w.r - Math.hypot(x - w.cx, z - w.cz) : Math.min(x - w.x0, w.x1 - x, z - w.z0, w.z1 - z); if (d > -1.5) { tmp.lerp(C('#6b5a42'), 0.7); gr = 0; } }
    grassy[i] = gr;
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.setAttribute('aGrass', new THREE.BufferAttribute(grassy, 1));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, groundMaterial(L, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false })));
  m.receiveShadow = true;
  return m;
}

function waters(L, WU) {
  const list = [];
  const lilyPadMat = new THREE.MeshStandardMaterial({ color: '#1a4c28', roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide });
  const flowerMat = new THREE.MeshStandardMaterial({ color: '#fbfcfc', roughness: 0.3, metalness: 0.05 });
  const redFlowerMat = new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.3, metalness: 0.05 });
  const stamenMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.4 });

  for (const w of L.water) {
    // fine enough near the shore for the depth (and so the shallows) to follow the bed; waves run on the GPU
    const geo = w.r ? new THREE.RingGeometry(0.01, w.r + 0.4, 56, Math.ceil(w.r / 1.2)) : new THREE.PlaneGeometry(w.x1 - w.x0, w.z1 - w.z0, Math.min(200, Math.ceil((w.x1 - w.x0) / 1.6)), Math.min(120, Math.ceil((w.z1 - w.z0) / 1.6)));
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, waterMaterial(w.color, WU, { muddy: w.kind === 'gher' || w.kind === 'river' && L.far === 'char' }));
    m.position.set(w.r ? w.cx : (w.x0 + w.x1) / 2, w.y, w.r ? w.cz : (w.z0 + w.z1) / 2);
    setWaterDepth(geo, m, L.ground, w.y, 0.55, (x, z) => (w.r ? w.r + 0.4 - Math.hypot(x - w.cx, z - w.cz) : Math.min(x - w.x0, w.x1 - x, z - w.z0, w.z1 - z) + 1.2));
    m.receiveShadow = true; m.renderOrder = 1; m.userData.water = true;
    list.push(m);

    // Floating water lilies and lily pads (শালুক ও জাতীয় ফুল শাপলা)
    if (w.kind === 'pond' || w.kind === 'canal' || w.kind === 'gher' || (w.kind === 'river' && (L.far === 'dhaka' || L.far === 'meghalaya' || L.far === 'mangrove'))) {
      const floraGroup = new THREE.Group();
      floraGroup.position.set(w.r ? w.cx : (w.x0 + w.x1) / 2, w.y + 0.02, w.r ? w.cz : (w.z0 + w.z1) / 2);
      const padCount = w.r ? Math.min(22, Math.floor(w.r * 3.2)) : Math.min(26, Math.floor((w.x1 - w.x0) * 0.35));
      let rndSeed = 13 + (w.r || w.x0);
      const wRnd = () => { rndSeed = (rndSeed * 16807) % 2147483647; return rndSeed / 2147483647; };
      for (let k = 0; k < padCount; k++) {
        let px, pz;
        if (w.r) {
          const a = wRnd() * Math.PI * 2, dist = (0.32 + wRnd() * 0.58) * w.r;
          px = Math.cos(a) * dist; pz = Math.sin(a) * dist;
        } else {
          const edge = wRnd() < 0.5 ? -1 : 1;
          px = (wRnd() - 0.5) * (w.x1 - w.x0) * 0.85;
          pz = edge * ((w.z1 - w.z0) * 0.34 + wRnd() * (w.z1 - w.z0) * 0.1);
        }
        const padR = 0.28 + wRnd() * 0.2;
        const padGeo = new THREE.CircleGeometry(padR, 10, 0.2, Math.PI * 1.82);
        padGeo.rotateX(-Math.PI / 2);
        const padMesh = new THREE.Mesh(padGeo, lilyPadMat);
        padMesh.position.set(px, 0, pz);
        padMesh.rotation.y = wRnd() * Math.PI * 2;
        padMesh.receiveShadow = true;
        floraGroup.add(padMesh);

        if (k % 3 === 0) {
          const isRed = (k / 3) % 2 === 1;
          const flower = new THREE.Group();
          flower.position.set(px + (wRnd() - 0.5) * 0.1, 0.025, pz + (wRnd() - 0.5) * 0.1);
          const stam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.04, 6), stamenMat);
          stam.position.y = 0.02;
          flower.add(stam);
          const fMat = isRed ? redFlowerMat : flowerMat;
          for (let p = 0; p < 7; p++) {
            const pa = (p / 7) * Math.PI * 2;
            const pet = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 4), fMat);
            pet.position.set(Math.cos(pa) * 0.045, 0.03, Math.sin(pa) * 0.045);
            pet.rotation.set(0.65, -pa + Math.PI / 2, 0);
            flower.add(pet);
          }
          floraGroup.add(flower);
        }
      }
      floraGroup.userData.live = true; floraGroup.userData.bob = true;
      list.push(floraGroup);
    }
  }
  return list;
}

// Distant scenery for each place, beyond the walkable circle.
function scenery(kind, group) {
  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const ridge = (n, r0, r1, a0, a1, hMin, hMax, col, snow) => {
    for (let k = 0; k < n; k++) {
      const a = a0 + (a1 - a0) * (k / n) + rnd() * 0.1, r = r0 + rnd() * (r1 - r0), h = hMin + rnd() * (hMax - hMin);
      const m = cone(group, h * (0.9 + rnd() * 0.6), h, col, [Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r], [0, rnd() * 3, 0], 6);
      m.castShadow = false;
      if (snow && h > hMax * 0.6) { const s = cone(group, h * 0.38, h * 0.3, '#f4f6f8', [Math.cos(a) * r, h - 2 - h * 0.15 + 0.2, Math.sin(a) * r], [0, rnd() * 3, 0], 6); s.castShadow = false; }
    }
  };
  // A village tree line on the horizon: each one a grove (a trunk under a crown of clumps, darker below, lit on top),
  // not a single faceted ball, which looked like a green rock once the camera turned towards it. Nothing here casts
  // a shadow, and bake() merges it by material, so it costs vertices only.
  const grove = (x, z, R, col) => {
    // a real tree in its light form (leafytree.js); not swaying, so bake() merges the whole horizon into a few meshes
    const kind = col === '#7f9f55' ? 'kikar' : kind0;
    const t = buildTree(kind, { seed: x * 7 + z, scale: R / 2.9, lite: true });
    t.traverse((o) => { if (o.userData.crown) o.userData.crown = false; if (o.isMesh) { o.castShadow = false; o.customDepthMaterial = undefined; } });
    t.position.set(x, 0, z); t.rotation.y = rnd() * Math.PI * 2; group.add(t);
  };
  const kind0 = kind === 'rivers' || kind === 'char' ? 'hijal' : 'mango';

  const farPalm = (x, z, h = 9, col = '#3f6a34') => {
    cyl(group, 0.16, 0.26, h, '#544332', [x, h / 2, z], [0, 0, 0], 6).castShadow = false;
    blob(group, 1.3, col, [x, h + 0.5, z], [1.3, 0.4, 1.3], 0).castShadow = false;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      box(group, 0.28, 0.04, 2.2, col, [x + Math.cos(a) * 0.8, h + 0.35, z + Math.sin(a) * 0.8], [0.65, -a + Math.PI / 2, 0]).castShadow = false;
    }
  };
  if (kind === 'plain') {
    for (let k = 0; k < 110; k++) {
      const a = rnd() * Math.PI * 2, r = 85 + rnd() * 60;
      grove(Math.cos(a) * r, Math.sin(a) * r, 3 + rnd() * 3.2, ['#3f6a34', '#4f7a3f', '#5a8a44'][k % 3]);
      if (k % 5 === 0) farPalm(Math.cos(a + 0.05) * (r + 4), Math.sin(a + 0.05) * (r + 4), 9 + rnd() * 3, '#32572b');
    }
    // Deep misty horizon ring ("ফসলের দিগন্ত")
    for (let k = 0; k < 60; k++) {
      const a = rnd() * Math.PI * 2, r = 150 + rnd() * 65;
      grove(Math.cos(a) * r, Math.sin(a) * r, 4 + rnd() * 3.8, ['#49725f', '#5a8370', '#6b9281'][k % 3]);
    }
  }
  if (kind === 'dhaka') {
    for (let k = 0; k < 85; k++) {
      const a = rnd() * Math.PI * 2, r = 85 + rnd() * 60;
      grove(Math.cos(a) * r, Math.sin(a) * r, 3 + rnd() * 3.2, k % 2 ? '#5f8f45' : '#4f7f3c');
      if (k % 6 === 0) farPalm(Math.cos(a + 0.06) * (r + 3), Math.sin(a + 0.06) * (r + 3), 9 + rnd() * 2, '#385d2f');
    }
    for (let k = 0; k < 45; k++) {
      const a = rnd() * Math.PI * 2, r = 145 + rnd() * 65;
      grove(Math.cos(a) * r, Math.sin(a) * r, 4.2 + rnd() * 3.5, ['#4f7b68', '#5e8976', '#6e9784'][k % 3]);
    }
    for (let k = 0; k < 12; k++) { const a = -Math.PI * 0.85 + k * 0.18, r = 110 + rnd() * 40, x = Math.cos(a) * r, z = Math.sin(a) * r;
      box(group, 18, 7, 10, k % 2 ? '#9aa4ad' : '#b7aa96', [x, 3.5, z]).castShadow = false; cyl(group, 0.8, 1, 16, '#8a8178', [x + 6, 8, z], [0, 0, 0], 8).castShadow = false; }
  }
  if (kind === 'chittagong') {
    ridge(34, 85, 140, -Math.PI * 0.45, Math.PI * 0.45, 24, 52, '#3d6a3a');
    const t = new THREE.Group(); t.position.set(110, 34, -10); group.add(t); box(t, 3, 4, 3, '#f2ede2', [0, 2, 0]); cone(t, 2, 3, '#c9482e', [0, 5.5, 0], [0, Math.PI / 4, 0], 4); // Chandranath on its hill
    for (let k = 0; k < 7; k++) { const z = -60 + k * 26, x = -110 - rnd() * 35; box(group, 6, 4, 26, k % 2 ? '#8a3a2a' : '#4a5a6a', [x, 1, z]).castShadow = false; box(group, 4, 5, 6, '#e8e4da', [x, 5, z - 8]).castShadow = false; cyl(group, 0.2, 0.2, 18, '#d6a020', [x + 10, 9, z + 4], [0, 0, 0], 5).castShadow = false; }
  }
  if (kind === 'rivers' || kind === 'char') {
    for (let k = 0; k < 95; k++) {
      const a = rnd() * Math.PI * 2, r = 80 + rnd() * 70;
      grove(Math.cos(a) * r, Math.sin(a) * r, 3 + rnd() * 3.2, kind === 'char' ? '#7f9f55' : k % 2 ? '#4f8a3c' : '#437a34');
      if (k % 5 === 0) farPalm(Math.cos(a + 0.05) * (r + 4), Math.sin(a + 0.05) * (r + 4), 9 + rnd() * 3, '#32572b');
    }
    for (let k = 0; k < 50; k++) {
      const a = rnd() * Math.PI * 2, r = 150 + rnd() * 65;
      grove(Math.cos(a) * r, Math.sin(a) * r, 4 + rnd() * 3.8, ['#4c7865', '#5d8774', '#6d9582'][k % 3]);
    }
  }
  if (kind === 'char') for (let k = 0; k < 180; k++) { const x = -70 + rnd() * 140, z = 26 + rnd() * 18; cone(group, 0.35, 1.6, '#e9e4d6', [x, 0.8, z], [0, 0, (rnd() - 0.5) * 0.4], 4).castShadow = false; }
  if (kind === 'meghalaya') {
    ridge(38, 110, 160, -Math.PI * 0.95, -Math.PI * 0.05, 34, 68, '#3a6a4a'); ridge(26, 160, 220, -Math.PI * 0.9, -Math.PI * 0.1, 68, 102, '#6a8a96');
    box(group, 4, 40, 1, '#e8f4f8', [-30, 18, -128], [0.15, 0, 0]).castShadow = false; // a waterfall down the hills
  }
}

// Merge every non-moving mesh into one mesh per material.
function bake(group) {
  group.updateMatrixWorld(true);
  const byMat = new Map(), keep = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    let moving = false; for (let p = o; p; p = p.parent) if (p.userData.wave || p.userData.flow || p.userData.animal || p.userData.wheel || p.userData.live || p.userData.crown || p.userData.npc) { moving = true; break; }
    if (moving) { keep.push(o); return; }
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k) && !(k === 'color' && o.material.vertexColors)) g.deleteAttribute(k); // palm fronds keep their colours
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const key = o.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { m: o.material, list: [], shadow: o.castShadow });
    byMat.get(key).list.push(g);
  });
  const out = new THREE.Group();
  for (const { m, list, shadow } of byMat.values()) {
    const mm = new THREE.Mesh(mergeGeometries(list), m); mm.castShadow = shadow; mm.receiveShadow = true; out.add(mm);
  }
  return { baked: out, keep };
}

// Sky dome with a vertical gradient and a glow round the sun.
function sky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C('#5aa0e0') }, mid: { value: C('#cfe6f2') }, low: { value: C('#e8efe6') }, sun: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: C('#fff1c4') }, stars: { value: 0 }, twilight: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, low, glow, sun; uniform float stars, twilight; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(mid, top, pow(clamp(y,0.0,1.0), 0.55)) : mix(mid, low, clamp(-y*4.0,0.0,1.0));
        vec3 sDir = normalize(sun);
        float s = max(0.0, dot(vP, sDir));
        float horizon = exp(-abs(y) * 5.2);
        float fwd = pow(s, 3.2) * horizon;
        vec2 sunH = vec2(sDir.x, sDir.z);
        vec2 hDir = length(sunH) > 0.001 ? normalize(sunH) : vec2(1.0, 0.0);
        vec2 pH = vec2(vP.x, vP.z);
        float anti = length(pH) > 0.001 ? max(0.0, dot(normalize(pH), -hDir)) : 0.0;
        vec3 tw = vec3(1.0, 0.46, 0.22) * fwd * 0.55 + vec3(0.56, 0.34, 0.64) * pow(anti, 2.0) * exp(-max(y, 0.0) * 6.5) * 0.26;
        c += glow * (pow(s, 600.0) * 1.6 + pow(s, 12.0) * 0.35) + tw * twilight;
        vec3 q = floor(vP * 260.0); float st = step(0.9975, h(q)) * stars * smoothstep(0.0, 0.25, y); c += vec3(st);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(520, 32, 16), mat);
}

// Sky colours through the day: [phase, top, mid, low, sun light, sun intensity, hemi intensity]
const DAYCOL = [
  [0.0, '#5888cc', '#ffbe88', '#fae2c8', '#ffba80', 2.0, 0.85],
  [0.12, '#3f8ee0', '#bde0f5', '#e4f0e4', '#fff6e2', 2.9, 1.05],
  [0.6, '#3f8ee0', '#c2e4f6', '#e4f0e4', '#fff6e2', 2.9, 1.05],
  [0.73, '#4d75be', '#f69e68', '#f0be9c', '#ffa464', 2.0, 0.85],
  [0.8, '#141e42', '#2c3866', '#1c243c', '#9eb6f0', 0.65, 0.45],
  [0.95, '#101838', '#25325c', '#1c243c', '#9eb6f0', 0.65, 0.45],
  [1.0, '#5888cc', '#ffbe88', '#fae2c8', '#ffba80', 2.0, 0.85],
];
const SKYTINT = { hazy: ['#d5ceb8', 0.22], dusty: ['#e0cdab', 0.2], hot: ['#f6e7c6', 0.15], foggy: ['#e4ebe6', 0.3], clear: [null, 0] };

export function createWorld(scene, g, { light = false } = {}) {
  const L = g.L;
  const root = new THREE.Group(); scene.add(root);
  setSurfaceQuality({ light }); // real surfaces (surfaces.js): smaller textures and no bump on phones
  const groundMesh = terrain(L);
  root.add(groundMesh);
  const nature = createNature(scene, L, { light }); // grass, wildflowers, the neighbours' crops, clouds, butterflies & birds
  const skyM = sky(); scene.add(skyM);
  const WU = waterUniforms(skyM.material.uniforms.top.value, skyM.material.uniforms.mid.value); // water reflects this sky
  const water = waters(L, WU); water.forEach((w) => root.add(w));
  const props = new THREE.Group();
  const animals = [];
  for (const p of L.props) {
    const b = BUILD[p.type]; if (!b) continue;
    const o = b(p); const wet = inWater(L, p.x, p.z); o.position.set(p.x, wet ? wet.y : L.ground(p.x, p.z), p.z); o.rotation.y = p.rot; o.scale.setScalar(p.s ?? 1);
    props.add(o);
    if (o.userData.animal) {
      o.userData.animal.home = [p.x, p.z]; o.userData.animal.ph = Math.random() * 10; animals.push(o);
      // its body from above, for bumping into people (../footing.js): measured facing +z, as it was built
      const ry = o.rotation.y; o.rotation.y = 0; o.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(o), w = bb.max.x - bb.min.x, l = bb.max.z - bb.min.z; o.rotation.y = ry;
      if (w > 0 && l > 0 && w < 6 && l < 6) { const r = (w / 2) * 0.8; o.userData.animal.foot = { r, half: Math.max(0, l / 2 - r) * 0.85, cz: (bb.max.z + bb.min.z) / 2 - p.z }; } // its footprint (A.body is its body mesh)
    }
  }
  const swayingCrowns = [];
  const npcs = [];
  props.traverse((o) => {
    if (o.userData.crown) swayingCrowns.push(o);
    if (o.userData.npc) npcs.push(o);
  });
  scenery(L.far, props);
  const { baked, keep } = bake(props);
  root.add(baked);
  // Re-parent swaying tree crowns and village NPCs as intact groups to root
  for (const c of swayingCrowns) {
    c.updateWorldMatrix(true, false);
    c.matrixWorld.decompose(c.position, c.quaternion, c.scale);
    root.add(c);
  }
  for (const n of npcs) {
    n.updateWorldMatrix(true, false);
    n.matrixWorld.decompose(n.position, n.quaternion, n.scale);
    root.add(n);
  }
  // moving pieces stay live: re-parent them with their world transforms
  const waving = [], flowing = [], wheels = [], bobbing = [];
  for (const o of keep) {
    if (animals.some((a) => { for (let p = o; p; p = p.parent) if (p === a) return true; return false; })) continue;
    if (swayingCrowns.some((c) => { for (let p = o; p; p = p.parent) if (p === c) return true; return false; })) continue;
    if (npcs.some((n) => { for (let p = o; p; p = p.parent) if (p === n) return true; return false; })) continue;
    o.updateWorldMatrix(true, false); o.matrixWorld.decompose(o.position, o.quaternion, o.scale); root.add(o);
    if (o.userData.wave) waving.push(o); if (o.userData.flow) flowing.push(o); if (o.userData.wheel) wheels.push(o);
    for (let p = o; p; p = p.parent) if (p.userData.bob) { bobbing.push({ o, y: o.position.y, ph: Math.random() * 6 }); break; }
  }
  for (const a of animals) root.add(a);

  // lights
  // the sky's light from above and the ground's warm bounce from below; the sun with a shadow box that follows the
  // player, small biases so feet keep their shadows (no gap under them) without speckle on the ground
  const hemi = new THREE.HemisphereLight('#f0f8ff', '#6a5a40', 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff5e0', 2.8);
  sun.castShadow = !light; sun.shadow.mapSize.set(light ? 1024 : 2048, light ? 1024 : 2048); sun.shadow.bias = -0.00015; sun.shadow.normalBias = 0.025;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 130 });
  scene.add(sun); scene.add(sun.target);
  const lamp = new THREE.PointLight('#ffc070', 0, 18, 1.6); lamp.position.set(L.S.house.x + 1, 2.6, L.S.house.z + 3.2); scene.add(lamp);
  const air = L.air ?? { fog: '#e2ecf2', near: 80, far: 380 }, airC = C(air.fog);
  scene.fog = new THREE.Fog(air.fog, air.near, air.far);
  // smoke: soft puffs that rise, drift with the wind and fade; small ones are a home's cooking fire
  const puffTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const smoke = (L.smoke ?? []).map(([x, y, z, size]) => {
    const base = new THREE.Vector3(x, L.ground(x, z) + y, z), hearth = size < 1, puffs = [];
    for (let k = 0; k < (hearth ? 7 : 10); k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: hearth ? '#d9d4cc' : size > 2 ? '#8f877c' : '#b5aea4', transparent: true, depthWrite: false, opacity: 0, fog: true }));
      sp.renderOrder = 3; scene.add(sp); puffs.push(sp);
    }
    return { base, size, hearth, puffs };
  });

  // weather
  const RAIN = 1800;
  const rainGeo = new THREE.BufferGeometry(); const rp = new Float32Array(RAIN * 6); rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#c8d8ea', transparent: true, opacity: 0.55 }));
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  const drops = Array.from({ length: RAIN }, () => [Math.random() * 70 - 35, Math.random() * 30, Math.random() * 70 - 35]);
  const hailGeo = new THREE.BufferGeometry(); const hp = new Float32Array(500 * 3); hailGeo.setAttribute('position', new THREE.BufferAttribute(hp, 3));
  const hail = new THREE.Points(hailGeo, new THREE.PointsMaterial({ color: '#f4f8fb', size: 0.16 })); hail.frustumCulled = false; hail.visible = false; scene.add(hail);
  const stones = Array.from({ length: 500 }, () => [Math.random() * 50 - 25, Math.random() * 25, Math.random() * 50 - 25]);
  const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(300 * 3).map(() => Math.random() * 40 - 20), 3)), new THREE.PointsMaterial({ color: '#ffe0a0', size: 0.08, transparent: true, opacity: 0.6 }));
  motes.frustumCulled = false; motes.visible = false; scene.add(motes);
  const floodGeo = new THREE.PlaneGeometry(90, 70, 30, 24).rotateX(-Math.PI / 2);
  floodGeo.setAttribute('aDepth', new THREE.BufferAttribute(new Float32Array(floodGeo.attributes.position.count).fill(1), 1));
  const flood = new THREE.Mesh(floodGeo, waterMaterial('#8a7a58', WU, { muddy: true, opacity: 0.88 }));
  flood.position.set(0, -1, -4); flood.visible = false; scene.add(flood);

  // Ground mist sheets (কুয়াশা): soft horizontal misty layers hovering over low terrain, ponds, and open fields
  const mistTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(235,242,248,0.7)');
    gr.addColorStop(0.4, 'rgba(235,242,248,0.4)');
    gr.addColorStop(0.8, 'rgba(235,242,248,0.1)');
    gr.addColorStop(1, 'rgba(235,242,248,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const MIST_N = light ? 5 : 12;
  const mistGroup = new THREE.Group(); scene.add(mistGroup);
  const mistSheets = [];
  const mistMat = new THREE.MeshBasicMaterial({
    map: mistTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  // Real mist thins close to you: the sheets fade out within ~14 m of the eye, and fade where they meet anything
  // standing in them, so a person walking through mist is never cut by a flat white plane at the waist
  mistMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMistW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMistW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMistW;')
      .replace('#include <opaque_fragment>', 'diffuseColor.a *= smoothstep(6.0, 20.0, distance(vMistW, cameraPosition));\n#include <opaque_fragment>');
  };
  const mistGeo = new THREE.PlaneGeometry(38, 38); mistGeo.rotateX(-Math.PI / 2);
  for (let k = 0; k < MIST_N; k++) {
    const a = (k / MIST_N) * Math.PI * 2 + (k % 2) * 0.4;
    const dist = 18 + (k % 4) * 15;
    const mx = Math.cos(a) * dist, mz = Math.sin(a) * dist;
    const my = L.ground(mx, mz) + 0.25 + (k % 3) * 0.2; // a low layer over the fields and water, not at waist height
    const m = new THREE.Mesh(mistGeo, mistMat);
    m.position.set(mx, my, mz);
    m.scale.setScalar(0.75 + (k % 3) * 0.25);
    mistGroup.add(m);
    mistSheets.push({ mesh: m, base: [mx, my, mz], ph: k * 1.7, rot: (k % 2 ? 1 : -1) * 0.05 });
  }

  // Rain puddle ripple reflections across the terrain during wet weather
  const PR_COUNT = light ? 12 : 28;
  const prGeo = new THREE.RingGeometry(0.85, 1.0, 24); prGeo.rotateX(-Math.PI / 2);
  const prMat = new THREE.MeshBasicMaterial({ color: '#d2e8fa', transparent: true, opacity: 0.65, depthWrite: false });
  const prMesh = new THREE.InstancedMesh(prGeo, prMat, PR_COUNT);
  prMesh.count = 0; prMesh.frustumCulled = false; prMesh.renderOrder = 2; scene.add(prMesh);
  const puddleRipples = Array.from({ length: PR_COUNT }, () => ({
    x: 0, y: 0, z: 0,
    age: Math.random(),
    duration: 0.6 + Math.random() * 0.4,
    maxR: 0.45 + Math.random() * 0.4,
  }));
  const prDummy = new THREE.Object3D();

  // Ground rain micro-splashes (droplet splash crowns bouncing on impact)
  const SPLASH_COUNT = light ? 24 : 68;
  const splashGeo = new THREE.CylinderGeometry(0.09, 0.022, 0.14, 7, 1, true);
  splashGeo.translate(0, 0.07, 0);
  const splashMat = new THREE.MeshBasicMaterial({ color: '#dceeff', transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });
  const splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, SPLASH_COUNT);
  splashMesh.count = 0; splashMesh.frustumCulled = false; splashMesh.renderOrder = 3; scene.add(splashMesh);
  const splashes = Array.from({ length: SPLASH_COUNT }, () => ({
    x: 0, y: 0, z: 0, age: Math.random(), dur: 0.24 + Math.random() * 0.22, sc: 0.7 + Math.random() * 0.7,
  }));
  const splashDummy = new THREE.Object3D();

  // Volumetric sunbeam shafts filtering through tree canopies in golden-hour light
  const beamGeo = new THREE.CylinderGeometry(0.45, 2.75, 13.5, 14, 1, true);
  beamGeo.translate(0, -6.75, 0);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: C('#ffe2a8') }, uIntensity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vVN, vVD;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vVN = normalize(normalMatrix * normal);
        vVD = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity, uTime;
      varying vec2 vUv;
      varying vec3 vVN, vVD;
      void main() {
        float lengthFade = smoothstep(0.0, 0.34, vUv.y) * smoothstep(1.0, 0.14, vUv.y);
        float edgeFade = pow(abs(dot(normalize(vVN), normalize(vVD))), 1.75);
        float dapple = 0.78 + 0.22 * sin(vUv.x * 18.8495 + uTime * 0.55) * cos(vUv.x * 12.566 - uTime * 0.35);
        float a = lengthFade * edgeFade * dapple * uIntensity;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const beamGroup = new THREE.Group();
  beamGroup.visible = false;
  scene.add(beamGroup);
  const BEAM_CAP = light ? 5 : 12;
  const beamSpots = [];
  for (const c of swayingCrowns) {
    if (beamSpots.length >= BEAM_CAP) break;
    if (Math.hypot(c.position.x, c.position.z) > 65) continue;
    if (beamSpots.some((p) => p.distanceTo(c.position) < 9)) continue;
    const m = new THREE.Mesh(beamGeo, beamMat);
    m.position.copy(c.position);
    m.position.y -= 0.4;
    m.renderOrder = 4;
    m.frustumCulled = false;
    beamGroup.add(m);
    beamSpots.push(c.position.clone());
  }

  // Subtle low-altitude heat shimmer ribbon around the farmer (visible even when post-processing composer is off)
  const heatGeo = new THREE.PlaneGeometry(18, 2.4, 16, 1);
  const heatMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uHeat: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(p.x * 0.8 + uTime * 4.2) * 0.18;
        p.y += cos(p.x * 1.1 - uTime * 5.0) * 0.08;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uHeat;
      varying vec2 vUv;
      void main() {
        float w = sin(vUv.x * 28.0 + uTime * 6.5) * cos(vUv.y * 12.0 - uTime * 4.5);
        float fade = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.1, vUv.y);
        gl_FragColor = vec4(1.0, 0.9, 0.7, max(0.0, w) * fade * uHeat * 0.09);
      }`,
  });
  const heatRibbon = new THREE.Mesh(heatGeo, heatMat);
  heatRibbon.visible = false; heatRibbon.frustumCulled = false; heatRibbon.renderOrder = 4;
  scene.add(heatRibbon);

  // the storm's safe circle: a glowing wall of light, like a closing zone, and a ring on the ground
  const zoneMat = new THREE.MeshBasicMaterial({ color: '#7fd0ff', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const zone = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 14, 48, 1, true), zoneMat); zone.visible = false; scene.add(zone);
  const zoneRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#b8ecff', transparent: true, opacity: 0.85, depthWrite: false })); zoneRing.visible = false; scene.add(zoneRing);
  // the quest marker: a turning golden diamond over a beam of light
  const marker = new THREE.Group();
  const dia = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshStandardMaterial({ color: '#ffd24a', emissive: '#ffb000', emissiveIntensity: 0.9, roughness: 0.3 }));
  dia.scale.y = 1.5; marker.add(dia);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 8, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe48a', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = -4.5; marker.add(beam); marker.visible = false; scene.add(marker);

  const cTop = new THREE.Color(), cMid = new THREE.Color(), cLow = new THREE.Color(), cSun = new THREE.Color();
  const tint = SKYTINT[L.sky] ?? SKYTINT.clear;
  let flashT = 0, wasRaining = false;
  return {
    sky: skyM,
    flash() { flashT = 0.62; },
    // the animals as bodies from above, for keeping people out of them (../footing.js keepApart), and back again
    herd: {
      bodies() {
        const out = [];
        for (const a of animals) {
          const A = a.userData.animal; if (!A || (A.alarm ?? 0) > 0) continue; // an egret in the air
          const cz = A.foot?.cz ?? 0, b = animalBody(A.species ?? A.kind, a.position.x + Math.sin(a.rotation.y) * cz, a.position.z + Math.cos(a.rotation.y) * cz, a.rotation.y);
          if (A.foot) { b.r = A.foot.r; b.half = A.foot.half; }
          b.obj = a; b.x0 = b.x; b.z0 = b.z; out.push(b);
        }
        return out;
      },
      settle(list, hit) {
        for (const b of list) {
          if (b.x === b.x0 && b.z === b.z0) continue;
          b.obj.position.x += b.x - b.x0; b.obj.position.z += b.z - b.z0;
          const A = b.obj.userData.animal;
          if (A.kind === 'grazer' || A.kind === 'chicken') b.obj.position.y = L.ground(b.obj.position.x, b.obj.position.z);
        }
        // a beast someone walks into stops and looks round rather than pushing on through them
        for (const b of hit) { const A = b.obj.userData.animal; if (A.kind === 'grazer' && A.st === 'walk') { A.st = 'look'; A.to = null; A.stT = 2 + Math.random() * 2; A.v = 0; } }
      },
    },
    marker(pos) { marker.visible = !!pos; if (pos) marker.position.set(pos[0], L.ground(pos[0], pos[1]) + 4.6, pos[1]); },
    update(t, dt, phase, ev, camPos, focus, me = null) {
      // the sun across the sky; colours blend between the keyframes
      let i = 0; while (DAYCOL[i + 1][0] < phase) i++;
      const A = DAYCOL[i], B = DAYCOL[i + 1], f = (phase - A[0]) / (B[0] - A[0]);
      cTop.set(A[1]).lerp(C(B[1]), f); cMid.set(A[2]).lerp(C(B[2]), f); cLow.set(A[3]).lerp(C(B[3]), f); cSun.set(A[4]).lerp(C(B[4]), f);
      let sunI = A[5] + (B[5] - A[5]) * f, hemiI = A[6] + (B[6] - A[6]) * f;
      const day = phase < 0.75;
      const ang = day ? (phase / 0.75) * Math.PI : ((phase - 0.75) / 0.25) * Math.PI;
      const dir = new THREE.Vector3(Math.cos(ang) * 0.8, Math.max(0.12, Math.sin(ang)), -0.45).normalize();
      // Daylight as the air makes it (../sunlight.js): the sun's colour and strength from how much air its light crosses
      // at this height (warm and softer low in the morning and evening, near white and strong at noon), the sky's light
      // a bigger share when the sun is low. The heat, the storm and lightning then change it as before.
      if (day) {
        const dl = daylight(dir.y, tint[0] ? tint[1] : 0), w = Math.max(0, Math.min(1, (0.75 - phase) / 0.03));
        cSun.lerp(_sunC.setRGB(dl.r, dl.g, dl.b), w); sunI += (dl.sun - sunI) * w; hemiI += (dl.sky - hemiI) * w;
      }
      if (tint[0]) { cMid.lerp(C(tint[0]), tint[1]); cLow.lerp(C(tint[0]), tint[1]); }
      const storm = ev.storm > 0 ? 1 : ev.zone ? Math.min(1, 1 - ev.zone.left / ev.zone.total) * 0.7 : ev.shower > 0 ? 0.4 : 0;
      const heat = ev.heat > 0 ? 1 : 0;
      if (heat) { cMid.lerp(C('#f2c88a'), 0.45); cLow.lerp(C('#f0c890'), 0.45); cSun.lerp(C('#ffb060'), 0.4); sunI *= 1.15; }
      if (storm) { const s = C('#4a5566'); cTop.lerp(C('#2e3846'), storm * 0.85); cMid.lerp(s, storm * 0.8); cLow.lerp(s, storm * 0.8); sunI *= 1 - storm * 0.75; hemiI *= 1 - storm * 0.35; }
      if (flashT > 0) {
        flashT = Math.max(0, flashT - dt);
        const fp = 1 - flashT / 0.62;
        const f1 = Math.exp(-Math.pow((fp - 0.07) / 0.055, 2));
        const f2 = 0.78 * Math.exp(-Math.pow((fp - 0.34) / 0.065, 2));
        const f3 = 0.42 * Math.exp(-Math.pow((fp - 0.56) / 0.08, 2));
        const bolt = Math.min(1, f1 + f2 + f3);
        hemiI += bolt * 7.5;
        sunI += bolt * 4.5;
        cTop.lerp(_flashTop, Math.min(0.88, bolt * 0.9));
        cMid.lerp(_flashMid, Math.min(0.65, bolt * 0.65));
      }
      const wet0 = ev.storm > 0, wind0 = wet0 ? 2.4 : ev.zone ? 1.5 : 0.8;
      nature.update(t, dt, wind0, cMid, storm, day, focus, me);

      // Low ground morning/evening mist update (কুয়াশা)
      const fogWeather = storm && g.R.storm?.kind === 'fog';
      let mistAlpha = 0;
      if (fogWeather) {
        mistAlpha = 0.58;
      } else if (phase < 0.22) {
        mistAlpha = (1.0 - phase / 0.22) * 0.44;
      } else if (phase > 0.66 && phase < 0.82) {
        mistAlpha = ((phase - 0.66) / 0.16) * 0.38;
      }
      mistMat.opacity = mistAlpha;
      mistGroup.visible = mistAlpha > 0.01;
      if (mistGroup.visible) {
        for (const ms of mistSheets) {
          ms.mesh.rotation.y = t * ms.rot;
          const drift = Math.sin(t * 0.35 + ms.ph) * 2.2;
          ms.mesh.position.x = ms.base[0] + drift * wind0 * 0.45;
          ms.mesh.position.z = ms.base[2] + Math.cos(t * 0.28 + ms.ph) * 1.5;
        }
      }

      // Dynamic wet ground sheen during rain, showers and rising water
      const wetSheen = ev.storm > 0 ? 0.85 : ev.shower > 0 ? 0.5 : ev.flood > 0.05 ? 0.65 : 0;
      groundMesh.material.roughness = THREE.MathUtils.lerp(groundMesh.material.roughness, 1.0 - wetSheen * 0.72, Math.min(1, dt * 4));
      groundMesh.material.metalness = THREE.MathUtils.lerp(groundMesh.material.metalness, wetSheen * 0.35, Math.min(1, dt * 4));
      skyM.material.uniforms.top.value.copy(cTop); skyM.material.uniforms.mid.value.copy(cMid); skyM.material.uniforms.low.value.copy(cLow);
      skyM.material.uniforms.sun.value.copy(dir); skyM.material.uniforms.glow.value.copy(day ? C('#fff1c4') : C('#c8d6ff')).multiplyScalar(day ? 1 - storm : 0.5);
      skyM.material.uniforms.stars.value = day ? 0 : 1 - storm;
      const twilight = day
        ? Math.max(0, Math.min(1, (0.55 - dir.y) / 0.40)) * (1 - storm * 0.85)
        : (phase > 0.74 && phase < 0.83 ? (1 - (phase - 0.74) / 0.09) * 0.65 * (1 - storm) : phase > 0.93 ? ((phase - 0.93) / 0.07) * 0.65 * (1 - storm) : 0);
      skyM.material.uniforms.twilight.value = twilight;
      skyM.position.copy(camPos);

      // Morning & evening volumetric sunbeam shafts filtering through tree canopies
      const fogWeatherNow = storm && g.R.storm?.kind === 'fog';
      const beamI = day && !fogWeatherNow && beamGroup.children.length
        ? Math.max(0, Math.min(1, (0.52 - dir.y) / 0.36)) * (1 - storm * 0.88) * 0.22
        : 0;
      beamGroup.visible = beamI > 0.005;
      if (beamGroup.visible) {
        _rayDir.copy(dir).negate();
        _beamQ.setFromUnitVectors(_down, _rayDir);
        beamMat.uniforms.uColor.value.copy(cSun);
        beamMat.uniforms.uIntensity.value = beamI;
        beamMat.uniforms.uTime.value = t;
        for (const bm of beamGroup.children) bm.quaternion.copy(_beamQ);
      }
      sun.color.copy(cSun); sun.intensity = sunI; hemi.intensity = hemiI;
      hemi.color.copy(cTop).lerp(cMid, 0.55).lerp(C('#ffffff'), 0.25); // the whole sky's colour, bluer than the horizon
      // the shadow box follows the player in whole shadow-map texels, so shadows do not crawl as they walk
      const texel = (sun.shadow.camera.right - sun.shadow.camera.left) / sun.shadow.mapSize.x;
      _lr.crossVectors(_up, dir).normalize(); _lu.crossVectors(dir, _lr);
      const sa = Math.round(focus.dot(_lr) / texel) * texel, sb = Math.round(focus.dot(_lu) / texel) * texel, sc = focus.dot(dir);
      sun.target.position.copy(_lr).multiplyScalar(sa).addScaledVector(_lu, sb).addScaledVector(dir, sc);
      sun.position.copy(sun.target.position).addScaledVector(dir, 60);
      // the place's own air: its haze or fog colours the horizon and closes in the distance
      scene.fog.color.copy(cMid).lerp(airC, day ? 0.45 : 0.12); const fogStorm = storm && g.R.storm.kind === 'fog';
      const morning = phase < 0.16, evening = phase > 0.64 && phase < 0.82;
      scene.fog.near = fogStorm ? 6 : morning ? Math.max(50, air.near) : storm ? Math.min(30, air.near) : Math.max(65, air.near);
      scene.fog.far = fogStorm ? 55 : morning ? Math.max(300, air.far) : storm ? Math.min(180, air.far) : Math.max(380, air.far);
      for (const s of smoke) s.puffs.forEach((sp, k) => {
        const age = (t * (s.hearth ? 0.16 : 0.09) + k / s.puffs.length) % 1, h = s.hearth ? 4 : 14 * s.size;
        sp.position.set(s.base.x + age * age * h * 0.7 * wind0, s.base.y + age * h, s.base.z + Math.sin(k * 1.7 + t * 0.3) * 0.3 * s.size);
        sp.scale.setScalar(s.size * (1.2 + age * 3.2));
        sp.material.opacity = Math.sin(age * Math.PI) * (s.hearth ? (morning || evening ? 0.55 : 0.12) : 0.5) * (storm ? 0.3 : 1);
      });
      lamp.intensity = day ? 0 : 6;
      // rain or hail around the camera
      const wet = ev.storm > 0;
      rain.visible = (wet && g.R.storm.kind !== 'fog') || ev.shower > 0; // the storm's rain, or a passing shower
      if (rain.visible) {
        for (let k = 0; k < RAIN; k++) {
          const d = drops[k]; d[1] -= dt * 26; d[0] -= dt * 6; if (d[1] < -1) { d[1] = 30; d[0] = Math.random() * 70 - 35; d[2] = Math.random() * 70 - 35; }
          const x = camPos.x + d[0], y = d[1], z = camPos.z + d[2];
          rp.set([x, y, z, x + 0.25, y + 0.9, z], k * 6);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      // Scatter ripples & micro-splashes around the player on rain onset so frame 1 never piles at (0,0,0)
      if (rain.visible && !wasRaining) {
        for (const pr of puddleRipples) {
          const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 22;
          pr.x = focus.x + Math.cos(a) * r; pr.z = focus.z + Math.sin(a) * r;
          pr.y = L.ground(pr.x, pr.z) + 0.025;
        }
        for (const sp of splashes) {
          const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 18;
          sp.x = focus.x + Math.cos(a) * r; sp.z = focus.z + Math.sin(a) * r;
          sp.y = L.ground(sp.x, sp.z) + 0.02;
        }
      }
      wasRaining = rain.visible;

      // Rain puddle ripple reflections across the terrain
      prMesh.visible = rain.visible;
      if (prMesh.visible) {
        let prCount = 0;
        for (const pr of puddleRipples) {
          pr.age += dt / pr.duration;
          if (pr.age >= 1.0) {
            pr.age = 0;
            const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 22;
            pr.x = focus.x + Math.cos(a) * r;
            pr.z = focus.z + Math.sin(a) * r;
            pr.y = L.ground(pr.x, pr.z) + 0.025;
            pr.duration = 0.55 + Math.random() * 0.45;
            pr.maxR = 0.35 + Math.random() * 0.45;
          }
          const s = pr.maxR * (0.08 + pr.age * 0.92);
          prDummy.position.set(pr.x, pr.y, pr.z);
          prDummy.scale.set(s, 1, s);
          prDummy.updateMatrix();
          prMesh.setMatrixAt(prCount++, prDummy.matrix);
        }
        prMesh.count = prCount;
        prMesh.instanceMatrix.needsUpdate = true;
      }

      // Ground rain micro-splashes
      splashMesh.visible = rain.visible;
      if (splashMesh.visible) {
        let spCount = 0;
        for (const sp of splashes) {
          sp.age += dt / sp.dur;
          if (sp.age >= 1.0) {
            sp.age = 0;
            const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 18;
            sp.x = focus.x + Math.cos(a) * r;
            sp.z = focus.z + Math.sin(a) * r;
            sp.y = L.ground(sp.x, sp.z) + 0.02;
            sp.dur = 0.20 + Math.random() * 0.22;
            sp.sc = 0.7 + Math.random() * 0.8;
          }
          const sc = sp.sc * Math.sin(sp.age * Math.PI);
          splashDummy.position.set(sp.x, sp.y, sp.z);
          splashDummy.scale.set(sc * (0.65 + sp.age * 0.75), sc * (0.6 + (1 - sp.age) * 0.9), sc * (0.65 + sp.age * 0.75));
          splashDummy.updateMatrix();
          splashMesh.setMatrixAt(spCount++, splashDummy.matrix);
        }
        splashMesh.count = spCount;
        splashMesh.instanceMatrix.needsUpdate = true;
      }
      hail.visible = wet && g.R.storm.kind === 'hail';
      if (hail.visible) { for (let k = 0; k < 500; k++) { const s = stones[k]; s[1] -= dt * 18; if (s[1] < 0) s[1] = 25; hp.set([camPos.x + s[0], s[1], camPos.z + s[2]], k * 3); } hailGeo.attributes.position.needsUpdate = true; }
      motes.visible = heat > 0; if (heat) { motes.position.set(focus.x, 1 + Math.sin(t * 0.5) * 0.3, focus.z); motes.rotation.y = t * 0.05; }
      heatRibbon.visible = heat > 0;
      if (heatRibbon.visible) {
        heatMat.uniforms.uTime.value = t;
        heatMat.uniforms.uHeat.value = heat;
        _rayDir.subVectors(focus, camPos).setY(0);
        if (_rayDir.lengthSq() > 1e-4) {
          _rayDir.normalize();
          const rx = focus.x + _rayDir.x * 7, rz = focus.z + _rayDir.z * 7;
          heatRibbon.position.set(rx, L.ground(rx, rz) + 1.0, rz);
          heatRibbon.lookAt(camPos.x, heatRibbon.position.y, camPos.z);
        }
      }
      flood.visible = ev.flood > 0.01; flood.position.y = -0.35 + ev.flood * 0.75;
      // zone
      const z = ev.zone;
      zone.visible = zoneRing.visible = !!z;
      if (z) {
        const gy = L.ground(z.x, z.z);
        zone.position.set(z.x, gy + 5, z.z); zone.scale.set(z.r, 1, z.r); zoneMat.opacity = 0.16 + Math.sin(t * 3) * 0.06 + (z.left < 8 && z.left > 0 ? 0.12 : 0);
        zoneRing.position.set(z.x, gy + 0.15, z.z); zoneRing.scale.set(z.r, 1, z.r);
      }
      // the marker turns and bobs
      if (marker.visible) { dia.rotation.y = t * 2; dia.position.y = Math.sin(t * 3) * 0.25; }
      // water ripples, flags, flowing spouts, animals
      // the water's waves and ripples run in its shader (surfaces.js): only the clock and the rain go up
      WU.uTime.value = t; WU.uRain.value += ((rain.visible ? (wet ? 1 : 0.6) : 0) - WU.uRain.value) * Math.min(1, dt * 2);
      const wind = wet0 ? 2.4 : 0.8;
      for (const c of swayingCrowns) {
        const amp = c.userData.swayAmp ?? 0.05;
        const ph = c.position.x * 0.35 + c.position.z * 0.25;
        c.rotation.z = Math.sin(t * 1.8 * wind + ph) * amp * (wind > 1.5 ? 1.35 : 1.0);
        c.rotation.x = Math.cos(t * 1.3 * wind + ph) * amp * 0.55;
      }
      for (const f of waving) f.rotation.y = Math.sin(t * 3 * wind + f.position.x) * 0.25 * wind;
      for (const f of flowing) f.scale.y = 1 + Math.sin(t * 12 + f.position.x) * 0.08;
      for (const b of bobbing) b.o.position.y = b.y + Math.sin(t * 1.3 + b.ph) * 0.05;
      for (const n of npcs) {
        if (n.userData.head && focus) {
          const dx = focus.x - n.position.x, dz = focus.z - n.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 5.8) {
            let ang = Math.atan2(dx, dz) - (n.rotation.y || 0);
            while (ang > Math.PI) ang -= Math.PI * 2;
            while (ang < -Math.PI) ang += Math.PI * 2;
            const clamped = Math.max(-0.75, Math.min(0.75, ang));
            n.userData.head.rotation.y += (clamped - n.userData.head.rotation.y) * 0.12;
          } else {
            n.userData.head.rotation.y += (0 - n.userData.head.rotation.y) * 0.05;
          }
        }
        if (n.userData.torso) {
          n.userData.torso.position.y = Math.sin(t * 2.2) * 0.008;
        }
      }
      updateAnimals(animals, dt, { L, focus, play }); // walk, graze, peck, swim (animals.js)
      return { wind };
    },
    dispose() {
      nature.dispose();
      puffTex.dispose(); mistTex.dispose(); mistGeo.dispose(); mistMat.dispose();
      rainGeo.dispose(); rain.material.dispose(); hailGeo.dispose(); hail.material.dispose();
      motes.geometry.dispose(); motes.material.dispose();
      prGeo.dispose(); prMat.dispose(); splashGeo.dispose(); splashMat.dispose();
      beamGeo.dispose(); beamMat.dispose(); heatGeo.dispose(); heatMat.dispose();
      floodGeo.dispose(); flood.material.dispose();
      zone.geometry.dispose(); zoneMat.dispose(); zoneRing.geometry.dispose(); zoneRing.material.dispose();
      dia.geometry.dispose(); dia.material.dispose(); beam.geometry.dispose(); beam.material.dispose();
      skyM.geometry.dispose(); skyM.material.dispose();
      for (const s of smoke) for (const sp of s.puffs) sp.material.dispose();
      scene.remove(root, skyM, mistGroup, prMesh, splashMesh, beamGroup, heatRibbon, rain, hail, motes, flood, zone, zoneRing, marker, hemi, sun, sun.target, lamp);
    },
  };
}

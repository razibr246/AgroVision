// The field in 3D: 18 plots of soil that darken when watered, the earth bunds between them, a straw mulch when it is
// laid, standing water in a paddy, and the crops: real-looking plants (plants.js) in slightly uneven rows, a few
// dozen to a couple of hundred per plot, one instanced mesh per crop. Each plant shows its stage (seedling, growing,
// grown or in flower, ripe, dead); thirsty plants yellow and sag, pests chew their leaves, the wind sways them and the
// farmer pushes through them (all in the shaders), and the satellite view (NDVI-style) tints each plot by health.
import * as THREE from 'three';
import { PLOT, GAP, FIELD_W, FIELD_D } from '../regions.js';
import { ripeAt } from '../sim.js';
import { cropLook, cropMaterials, CROP_COLS } from './plants.js';
import { lightGraphics } from './stage.js';

const C = (hex) => new THREE.Color(hex);

// Where each plant of a plot stands, as [x, z, yaw, size, sway phase, lag] per plant from the plot's centre: rows
// across the plot at the crop's spacing, each row a little wavy and askew, each plant a little off its mark, now and
// then a missing hill. 'light' graphics space them wider (about 40% as many plants), drawn a little bigger.
function plantSpots(look, seed, light) {
  let s = 977 + seed * 7919; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const k = light ? 1.6 : 1, half = PLOT / 2 - 0.17;
  const rows = Math.max(2, Math.round((half * 2) / (look.row * k))), per = Math.max(2, Math.round((half * 2) / (look.step * k)));
  const dz = (half * 2) / rows, dx = (half * 2) / per, out = [];
  for (let a = 0; a < rows; a++) {
    const z0 = -half + (a + 0.5) * dz, wob = r() * 6.28, skew = (r() - 0.5) * 0.05;
    for (let b = 0; b < per; b++) {
      if (r() < 0.035) continue;
      const x = -half + (b + 0.5) * dx + (r() - 0.5) * dx * 0.35;
      const z = z0 + Math.sin(x * 1.7 + wob) * dz * 0.1 + x * skew + (r() - 0.5) * dz * 0.18;
      out.push(x, z, r() * Math.PI * 2, 0.85 + r() * 0.3, r(), r());
    }
  }
  return new Float32Array(out);
}
// growth where each stage starts; ripe from ripeAt(g)
const STAGE_AT = [0, 0.22, 0.55];
// Card height for growth gg in column col: grows through each stage from the last stage's size to its own.
function cardHeight(h, col, gg, lim) {
  if (col >= 3) return h[col];
  if (col === 0) return h[0] * (0.45 + 0.55 * Math.min(1, Math.max(0, gg) / STAGE_AT[1]));
  const a = STAGE_AT[col], b = col === 1 ? STAGE_AT[2] : lim, t = Math.min(1, Math.max(0, (gg - a) / Math.max(0.05, b - a)));
  return h[col - 1] + (h[col] - h[col - 1]) * t;
}
// Ploughed soil: clods and the furrows of the rows, light grey so the plot's own colour (dry to wet) shows through;
// the same picture lifts the furrows' ridges in the light.
let soilTex = null;
function soilTexture() {
  if (soilTex) return soilTex;
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d');
  let s = 41; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  x.fillStyle = '#e4e4e4'; x.fillRect(0, 0, N, N);
  for (let k = 0; k < 12; k++) { const y = (k + 0.5) * (N / 12), g = x.createLinearGradient(0, y - N / 24, 0, y + N / 24); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(60,50,40,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0.5)'); x.fillStyle = g; x.fillRect(0, y - N / 24, N, N / 12); }
  for (let k = 0; k < 2600; k++) { const v = r(); x.fillStyle = v < 0.5 ? `rgba(70,56,40,${0.08 + r() * 0.2})` : `rgba(255,255,250,${0.1 + r() * 0.25})`; x.beginPath(); x.arc(r() * N, r() * N, 0.6 + r() * (v < 0.9 ? 1.6 : 3.2), 0, Math.PI * 2); x.fill(); }
  soilTex = new THREE.CanvasTexture(cv); soilTex.colorSpace = THREE.SRGBColorSpace; soilTex.anisotropy = 4;
  return soilTex;
}

// ---- the field ----
const CELL = PLOT + GAP;
export function createField(scene, g) {
  const root = new THREE.Group(); scene.add(root);
  const light = lightGraphics();
  // bunds: a raised earth frame round and between the plots
  const bundM = new THREE.MeshStandardMaterial({ color: g.L.soil, roughness: 1, flatShading: true });
  const bundG = new THREE.BoxGeometry(1, 0.16, 1);
  const bunds = [];
  for (let c = 0; c <= 6; c++) bunds.push([-FIELD_W / 2 - GAP / 2 + c * CELL, 0, 0.45, FIELD_D + GAP]);
  for (let r = 0; r <= 3; r++) bunds.push([0, -FIELD_D / 2 - GAP / 2 + r * CELL, FIELD_W + GAP, 0.45]);
  for (const [x, z, w, d] of bunds) { const m = new THREE.Mesh(bundG, bundM); m.position.set(x, 0.08, z); m.scale.set(w, 1, d); m.receiveShadow = true; m.castShadow = true; root.add(m); }
  const dry = C(g.L.soil).lerp(C('#e6d6b8'), 0.35), wet = C(g.L.soil).multiplyScalar(0.55), straw = C('#d9b866');
  const soilG = new THREE.BoxGeometry(PLOT, 0.12, PLOT);
  const ndviG = new THREE.PlaneGeometry(PLOT * 0.96, PLOT * 0.96); ndviG.rotateX(-Math.PI / 2);
  const ringG = new THREE.RingGeometry(PLOT * 0.42, PLOT * 0.48, 32); ringG.rotateX(-Math.PI / 2);
  const auraG = new THREE.RingGeometry(PLOT * 0.36, PLOT * 0.48, 32); auraG.rotateX(-Math.PI / 2);
  const soilMap = soilTexture();
  // standing water in a paddy plot while the rice grows (drained for the harvest): a thin sheet over the mud
  const waterG = new THREE.PlaneGeometry(PLOT * 0.98, PLOT * 0.98); waterG.rotateX(-Math.PI / 2);
  const waterM = new THREE.MeshStandardMaterial({ color: '#6f7d66', roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });
  const plots = g.plots.map((p) => {
    const sm = new THREE.MeshStandardMaterial({ color: dry.clone(), roughness: 1, map: soilMap, bumpMap: light ? null : soilMap, bumpScale: 1.2 });
    const soil = new THREE.Mesh(soilG, sm); soil.position.set(p.x, 0.04, p.z); soil.receiveShadow = true; root.add(soil);
    const water = new THREE.Mesh(waterG, waterM); water.position.set(p.x, 0.115, p.z); water.visible = false; water.receiveShadow = true; root.add(water);
    const nm = new THREE.MeshBasicMaterial({ color: '#2e9d3a', transparent: true, opacity: 0.55, depthWrite: false });
    const ndvi = new THREE.Mesh(ndviG, nm); ndvi.position.set(p.x, 1.2, p.z); ndvi.visible = false; ndvi.renderOrder = 2; root.add(ndvi);
    const rm = new THREE.MeshBasicMaterial({ color: '#3aa0e0', transparent: true, opacity: 0.8, depthWrite: false });
    const ring = new THREE.Mesh(ringG, rm); ring.position.set(p.x, 0.13, p.z); ring.visible = false; root.add(ring);
    const am = new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
    const aura = new THREE.Mesh(auraG, am); aura.position.set(p.x, 0.14, p.z); aura.visible = false; root.add(aura);
    // a small swarm for pests or raiders
    const swarm = new THREE.Group(); swarm.position.set(p.x, 0, p.z); swarm.visible = false; root.add(swarm);
    for (let k = 0; k < 14; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 3), new THREE.MeshBasicMaterial({ color: '#1b1b14' })); b.userData.ph = Math.random() * 10; swarm.add(b); }
    return { soil, ndvi, ring, swarm, aura, water };
  });
  // the plants: one instanced mesh per crop, every plant a few crossed cards from that crop's atlas (plants.js)
  const U = { time: { value: 0 }, wind: { value: 0.8 }, player: { value: new THREE.Vector3(1e4, 0, 1e4) } };

  // Rising golden pollen & spore particles floating gently above ripe plots
  const POLLEN_PER_PLOT = light ? 6 : 16;
  const POLLEN_COUNT = g.plots.length * POLLEN_PER_PLOT;
  const pollenPos = new Float32Array(POLLEN_COUNT * 3);
  const pollenSeed = new Float32Array(POLLEN_COUNT * 4);
  const pollenActive = new Float32Array(POLLEN_COUNT);
  let sr = 193;
  const pr = () => ((sr = (sr * 16807) % 2147483647) / 2147483647);
  g.plots.forEach((p, pi) => {
    for (let k = 0; k < POLLEN_PER_PLOT; k++) {
      const idx = pi * POLLEN_PER_PLOT + k;
      pollenPos[idx * 3] = p.x + (pr() - 0.5) * PLOT * 0.78;
      pollenPos[idx * 3 + 1] = 0.25;
      pollenPos[idx * 3 + 2] = p.z + (pr() - 0.5) * PLOT * 0.78;
      pollenSeed[idx * 4] = pr(); // phase
      pollenSeed[idx * 4 + 1] = 0.22 + pr() * 0.22; // speed
      pollenSeed[idx * 4 + 2] = pr(); // hue/size jitter
      pollenSeed[idx * 4 + 3] = 0.4 + pr() * 0.6; // swirl amp
    }
  });
  const pollenGeo = new THREE.BufferGeometry();
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
  pollenGeo.setAttribute('aSeed', new THREE.BufferAttribute(pollenSeed, 4));
  const pollenActiveAttr = new THREE.BufferAttribute(pollenActive, 1);
  pollenActiveAttr.setUsage(THREE.DynamicDrawUsage);
  pollenGeo.setAttribute('aActive', pollenActiveAttr);
  const pollenMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.time, uWind: U.wind },
    vertexShader: `
      attribute vec4 aSeed;
      attribute float aActive;
      uniform float uTime, uWind;
      varying float vAlpha, vHue;
      void main() {
        float age = fract(uTime * aSeed.y + aSeed.x);
        float swirl = uTime * (1.2 + aSeed.z) + aSeed.x * 6.2831;
        vec3 p = position;
        p.x += sin(swirl) * 0.32 * aSeed.w + uWind * age * 0.55;
        p.y += age * 1.85;
        p.z += cos(swirl * 0.85) * 0.32 * aSeed.w + uWind * age * 0.22;
        vAlpha = aActive * sin(age * 3.14159) * (0.55 + 0.45 * sin(uTime * 3.8 + aSeed.x * 12.0));
        vHue = aSeed.z;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((22.0 + aSeed.z * 14.0) / max(1.0, -mv.z), 1.5, 18.0) * step(0.01, aActive);
      }`,
    fragmentShader: `
      varying float vAlpha, vHue;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float glow = pow(1.0 - d, 1.9);
        vec3 col = mix(vec3(0.98, 0.74, 0.20), vec3(1.0, 0.95, 0.62), vHue);
        gl_FragColor = vec4(col, glow * vAlpha * 0.85);
      }`,
  });
  const pollenPoints = new THREE.Points(pollenGeo, pollenMat);
  pollenPoints.frustumCulled = false; pollenPoints.renderOrder = 3;
  root.add(pollenPoints);
  const kinds = [...new Set(Object.values(g.R.crops).map((c) => c.kind))];
  const crops = new Map(), spotCache = new Map();
  const spotsOf = (i, kind, look) => { const key = `${i}:${kind}`; if (!spotCache.has(key)) spotCache.set(key, plantSpots(look, i * 31 + kind.length, light)); return spotCache.get(key); };
  kinds.forEach((kind) => {
    const { mat, depth, geo, look } = cropMaterials(kind, U, { light });
    const most = g.plots.reduce((m, _, i) => Math.max(m, spotsOf(i, kind, look).length / 6), 0), cap = Math.max(1, g.plots.length * most);
    const grow = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); grow.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aGrow', grow);
    const mesh = new THREE.InstancedMesh(geo, mat, cap);
    mesh.customDepthMaterial = depth; mesh.castShadow = !light; mesh.receiveShadow = true; mesh.count = 0; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    root.add(mesh); crops.set(kind, { look, mesh, grow });
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  // what each plot showed when the plants were last laid out; they are laid out again only when one changes
  const seen = new Float32Array(g.plots.length * 6).fill(-1);
  const kindIx = new Map(kinds.map((k, n) => [k, n]));
  const mark = (k, val) => { if (seen[k] === val) return 0; seen[k] = val; return 1; };
  function layPlants(lim) {
    for (const c of crops.values()) c.mesh.count = 0;
    g.plots.forEach((p, i) => {
      const c = p.crop && crops.get(g.R.crops[p.crop]?.kind);
      if (!c) return;
      const { look, mesh, grow } = c, S = spotsOf(i, g.R.crops[p.crop].kind, look), ripe = !p.dead && p.g >= lim;
      // thirst and failing health fade the green and sag the plant; pests add to it and chew the leaves
      const wilt = p.dead ? 0 : Math.min(1, Math.max(p.wilt / 10, (1 - p.health) * 0.7, p.moist < 0.12 ? 0.2 : 0) + (p.pests ? 0.15 : 0));
      const w = 1 / look.aspect, big = light ? 1.15 : 1;
      for (let j = 0; j < S.length; j += 6) {
        const n = mesh.count++;
        // a plant or two lags behind or runs ahead, so a plot turns from one stage to the next over a few days
        const gg = p.g + (S[j + 5] - 0.5) * 0.08;
        const st = p.dead ? 4 : ripe ? 3 : gg >= STAGE_AT[2] ? 2 : gg >= STAGE_AT[1] ? 1 : 0;
        const h = cardHeight(look.h, st, gg, lim) * S[j + 3] * big;
        e.set((S[j + 4] - 0.5) * 0.12, S[j + 2], (S[j + 5] - 0.5) * 0.12); q.setFromEuler(e);
        m4.compose(v.set(p.x + S[j], 0.1, p.z + S[j + 1]), q, sc.set(h * w, h, h * w));
        mesh.setMatrixAt(n, m4);
        const b = 0.86 + S[j + 4] * 0.24; col.setRGB(b, b * (0.98 + S[j + 5] * 0.04), b * 0.97); mesh.setColorAt(n, col);
        grow.setXYZW(n, Math.min(st, CROP_COLS - 1), wilt, p.pests ? 1 : 0, S[j + 4]);
      }
    });
    for (const c of crops.values()) { c.mesh.instanceMatrix.needsUpdate = true; c.mesh.instanceColor.needsUpdate = true; c.grow.needsUpdate = true; }
  }
  return {
    root,
    // layer: what the satellite view shows: 'health' (NDVI-style greenness), 'water' (water-stress hotspots, SMAP-style)
    // or 'soil' (each plot's soil health, raised by legumes and lost when bare soil washes away)
    // playerPos: optional player position for real-time crop stalk displacement when walking between rows
    update(t, wind, sat, scanner, layer = 'health', playerPos = null) {
      const lim = ripeAt(g);
      // the shaders' clock, the wind (eased into a gust or a lull) and where the farmer stands
      U.time.value = t; U.wind.value += ((wind ?? 0.8) - U.wind.value) * 0.04;
      if (playerPos) U.player.value.set(playerPos.x, 0, playerPos.z);
      g.plots.forEach((p, i) => {
        const P = plots[i];
        // soil: dry to dark wet, straw-coloured under mulch
        const base = P.soil.material.color;
        base.copy(dry).lerp(wet, Math.min(1, p.moist));
        if (p.mulch && p.crop) base.lerp(straw, 0.5);
        // physical wetness sheen: wet mud glistens under sunlight
        P.soil.material.roughness = THREE.MathUtils.lerp(0.96, 0.38, Math.min(1, p.moist));
        P.soil.material.metalness = THREE.MathUtils.lerp(0.0, 0.06, Math.min(1, p.moist));
        P.ring.visible = scanner && !!p.crop && !p.dead; if (P.ring.visible) P.ring.material.color.set(p.moist > 0.4 ? '#3aa0e0' : p.moist > 0.15 ? '#e0b43a' : '#e04a3a');
        P.ndvi.visible = sat;
        if (sat) {
          if (layer === 'water') {
            const growing = p.crop && !p.dead; // a hotspot is a crop short of water; bare soil stays neutral
            P.ndvi.material.color.set(!growing ? '#8a7a5a' : p.moist > 0.5 ? '#2f7fd0' : p.moist > 0.25 ? '#c9c23a' : '#d6452f');
            P.ndvi.material.opacity = growing ? 0.62 : 0.25;
          } else if (layer === 'temp') {
            const hot = p.crop && !p.dead ? (p.moist > 0.4 || p.mulch ? 0 : p.moist > 0.2 ? 1 : 2) : (p.mulch ? 0 : 2);
            P.ndvi.material.color.set(hot === 0 ? '#2ea87a' : hot === 1 ? '#e0983a' : '#e03a3a');
            P.ndvi.material.opacity = 0.65;
          } else if (layer === 'infilt') {
            const f = p.fert / 0.6;
            const ok = f > 0.3 || p.mulch || (p.crop && !p.dead);
            P.ndvi.material.color.set(ok ? '#2a98c8' : f > 0.1 ? '#c9a23a' : '#d84b2e');
            P.ndvi.material.opacity = 0.65;
          } else if (layer === 'soil') {
            const f = p.fert / 0.6;
            P.ndvi.material.color.set(f > 0.5 ? '#2e9d3a' : f > 0.15 ? '#c9a23a' : '#8a5a3a');
            P.ndvi.material.opacity = 0.6;
          } else {
            const h = !p.crop ? -1 : p.dead ? 0 : p.health * (p.moist > 0.12 ? 1 : 0.6) * (p.pests ? 0.5 : 1);
            P.ndvi.material.color.set(h < 0 ? '#8a7a5a' : h > 0.7 ? '#2e9d3a' : h > 0.4 ? '#c9c23a' : '#d6452f');
            P.ndvi.material.opacity = h < 0 ? 0.25 : 0.6;
          }
        }
        P.swarm.visible = p.pests > 0;
        if (P.swarm.visible) P.swarm.children.forEach((b, k) => { const ph = b.userData.ph + t * 3; b.position.set(Math.cos(ph + k) * 1.2, 0.5 + Math.sin(ph * 1.7) * 0.3, Math.sin(ph * 0.8 + k) * 1.2); });
        const ripe = p.crop && !p.dead && p.g >= lim && !sat;
        P.aura.visible = ripe;
        if (ripe) {
          P.aura.material.opacity = 0.22 + Math.sin(t * 3.6 + i * 0.5) * 0.12;
          P.aura.rotation.y = t * 0.4 + i;
        }
        const targetActive = ripe ? 1 : 0;
        const baseIdx = i * POLLEN_PER_PLOT;
        for (let k = 0; k < POLLEN_PER_PLOT; k++) {
          pollenActive[baseIdx + k] += (targetActive - pollenActive[baseIdx + k]) * 0.12;
        }
        // paddy water while rice grows, drained once it ripens
        P.water.visible = !sat && !!p.crop && !p.dead && !!g.R.crops[p.crop] && !!cropLook(g.R.crops[p.crop].kind).paddy && p.moist > 0.45 && p.g < lim;
      });
      pollenActiveAttr.needsUpdate = true;
      // the plants: laid out again only when a plot's crop, stage, growth, thirst or pests change
      let dirty = 0;
      for (let i = 0; i < g.plots.length; i++) {
        const p = g.plots[i], o = i * 6, kind = p.crop ? kindIx.get(g.R.crops[p.crop]?.kind) ?? -1 : -1;
        dirty = mark(o, kind) | mark(o + 1, Math.floor(p.g * 40)) | mark(o + 2, Math.round(Math.min(1, p.wilt / 10) * 12) + Math.round((1 - p.health) * 10) * 16 + (p.moist < 0.12 ? 1000 : 0))
          | mark(o + 3, p.pests ? 1 : 0) | mark(o + 4, p.dead ? 1 : 0) | mark(o + 5, p.g >= lim ? 1 : 0) | dirty;
      }
      if (dirty) layPlants(lim);
    },
    dispose() {
      pollenGeo.dispose(); pollenMat.dispose();
      bundG.dispose(); bundM.dispose(); soilG.dispose(); ndviG.dispose(); ringG.dispose(); auraG.dispose(); waterG.dispose(); waterM.dispose();
      for (const P of plots) {
        P.soil.material.dispose(); P.ndvi.material.dispose(); P.ring.material.dispose(); P.aura.material.dispose();
        P.swarm.children.forEach((b) => { b.geometry.dispose(); b.material.dispose(); });
      }
      for (const c of crops.values()) { c.mesh.geometry.dispose(); c.mesh.material.dispose(); c.mesh.customDepthMaterial?.dispose(); }
      scene.remove(root);
    },
  };
}

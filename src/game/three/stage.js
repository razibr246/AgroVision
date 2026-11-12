// The 3D stage: renderer, third-person camera, input (keys, mouse drag, touch joystick and look), the opening drop
// from satellite height, the game loop that steps the simulation, particles, and the HTML overlay that follows the
// 3D world (station names, speech bubble, floating numbers, the quest marker's distance tag), and the village's
// neighbours and signboards (life.js). It also draws the
// minimap and turns the compass, and plays in AR and VR through WebXR (see "AR and VR" below). React owns the HUD and
// talks to the stage through the object returned here.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { createWorld } from './world.js';
import { createField } from './field.js';
import { buildFarmer, animate, personLight } from './people.js';
import { createBackdrop } from './backdrop.js';
import { createLife } from './life.js';
import { update as step, act as simAct, emote as simEmote, target, plotAt, dayPhase, ripeAt, STATIONS, note, buy as simBuy } from '../sim.js';
import { newJob, nextStep, stepLine, STEP_TIMEOUT } from '../helper.js';
import { QUESTS, FIELD_W, FIELD_D, WORLD_R } from '../regions.js';
import { bakeNav, findPath } from '../nav.js';
import { DEFAULT_SETTINGS, lookDelta } from '../settings.js';
import { camReach } from '../camclip.js';
import { surfaceAt as groundAt } from '../footing.js';

// what is underfoot (../footing.js), as the footstep sounds and footprints know it: a plot's dry soil sounds like mud
function surfaceAt(L, g, x, z) {
  const s = groundAt(L, g, x, z);
  return s === 'soil' ? 'mud' : s;
}

const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
// Asked once before any renderer is made: when WebGL is off, three.js fills the console with errors on its way to
// failing, so fail quietly here instead (the page shows its own message).
let glOK;
const needWebGL = () => {
  glOK ??= (() => { try { const c = document.createElement('canvas'); const x = c.getContext('webgl2') || c.getContext('webgl'); x?.getExtension('WEBGL_lose_context')?.loseContext(); return !!x; } catch { return false; } })();
  if (!glOK) throw new Error('WebGL is not available');
};

// The cinematic grade, after tone mapping: balanced saturation, clean shadow lift,
// subtle warm highlight wash, gentle corner vignette framing, and film grain for texture.
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uHeat: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uHeat; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      if (uHeat > 0.005) {
        float mask = smoothstep(0.05, 0.68, 1.0 - uv.y) * smoothstep(0.0, 0.12, uv.y);
        float w1 = sin(uv.y * 56.0 - uTime * 7.8 + uv.x * 11.0);
        float w2 = cos(uv.y * 34.0 - uTime * 5.1 - uv.x * 16.0);
        uv = clamp(uv + vec2(w1 * 0.0020 + w2 * 0.0011, w2 * 0.0008) * uHeat * mask, 0.001, 0.999);
      }
      vec3 c = texture2D(tDiffuse, uv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      /* saturation +14% */
      c = mix(vec3(l), c, 1.14);
      /* gentle cinematic S-curve */
      c = c + (c - 0.5) * 0.08 * (1.0 - abs(c - 0.5) * 2.0);
      /* warm sunbeam highlights, clear open shadows */
      c += mix(vec3(0.002, 0.006, 0.010), vec3(0.024, 0.012, -0.015), smoothstep(0.2, 0.85, l));
      /* gentle corner framing */
      vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * 0.20;
      /* subtle film grain */
      float g = (hash(vUv + fract(uTime * 0.017)) - 0.5) * 0.014;
      c += g;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export const QUALITY_KEY = 'fs360.game.quality';
// Light graphics unless the player chose otherwise: on by default for a phone that reports little memory or few cores.
export function lightGraphics() {
  try { const v = localStorage.getItem(QUALITY_KEY); if (v) return v === 'light'; } catch { /* storage unavailable */ }
  if (typeof navigator === 'undefined' || !isTouch()) return false;
  return (navigator.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
}
// The drop from orbit is a sweeping camera move; a player who asks for less motion gets a short fade-in instead.
const lessMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Critically damped scalar spring (zero overshoot, smooth velocity continuity)
function springStep(cur, vel, target, smoothTime, dt) {
  const omega = 2 / Math.max(0.01, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel + omega * change) * dt;
  return [target + (change + temp) * exp, (vel - omega * temp) * exp];
}
export function createStage({ canvas, overlay, minimap, compass, g, lang, onEvent }) {
  needWebGL();
  const touch = isTouch();
  // 'light' graphics (chosen on the farmer picker, for weaker phones and laptops): no post effects, fewer pixels
  const light = lightGraphics();
  // smooth edges everywhere except 'light' graphics: the world is low-poly, so a phone can afford them
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !light, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, light ? 1 : touch ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; // white cloth stays cloth, not a glow
  renderer.shadowMap.enabled = !light; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(touch ? 60 : 52, 1, 0.1, 900);
  // on computers: ambient occlusion (contact shadows where things meet), a soft glow on bright light, the grade
  let composer = null, gtao = null, gradPass = null;
  if (!touch && !light) {
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      gtao = new GTAOPass(scene, camera, 2, 2);
      gtao.blendIntensity = 0.35; gtao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.5, thickness: 1.3, scale: 1 });
      composer.addPass(gtao);
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(2, 2), 0.22, 0.5, 0.97)); // only the truly bright glows (the sun on water, a lamp)
      composer.addPass(new OutputPass());
      gradPass = new ShaderPass(GRADE); composer.addPass(gradPass);
    } catch { composer = null; }
  }
  const world = createWorld(scene, g, { light });
  const field = createField(scene, g);
  const P = buildFarmer(g.F.look);
  P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(P.root);
  // a soft fill from the camera's side, as a game keeps on its characters: faces and fronts stay readable in shade
  const fill = new THREE.DirectionalLight('#fff3e2', 0.5); scene.add(fill); scene.add(fill.target);
  const L = g.L;

  // ---- particles: water, soil, sparks, coins ----
  const MAXP = light ? 260 : 600;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pGeo.setDrawRange(0, 0);
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
  pts.frustumCulled = false; scene.add(pts);
  const parts = [];
  const FXCOL = { water: '#8fd3f0', pump: '#8fd3f0', plant: '#6b4a2b', dust: '#a08060', harvest: '#ffe27a', spray: '#bfe8a0', coin: '#f2c94c', sparkle: '#fbbf24', ripe: '#f59e0b' };
  function burst(kind, x, z) {
    const y = L.ground(x, z), n = kind === 'harvest' || kind === 'coin' ? 30 : 22, c = new THREE.Color(FXCOL[kind] ?? '#ffffff');
    for (let k = 0; k < n && parts.length < MAXP; k++) {
      const a = Math.random() * Math.PI * 2, s = Math.random();
      const up = kind === 'water' || kind === 'pump' ? -1 : 1;
      parts.push({ x: x + Math.cos(a) * s * 0.6, y: y + (up < 0 ? 1.1 : 0.3), z: z + Math.sin(a) * s * 0.6, vx: Math.cos(a) * (1 + s * 2), vy: up < 0 ? -1 - s : 2 + s * 3, vz: Math.sin(a) * (1 + s * 2), life: 0.8 + s * 0.5, c });
    }
  }

  function footDust(x, y, z, n = 3, hex = '#a08060', isRunning = false) {
    if (parts.length >= MAXP - 15) return;
    const c = new THREE.Color(hex);
    const speedMult = isRunning ? 1.5 : 0.85;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = Math.random();
      parts.push({
        x: x + (Math.random() - 0.5) * 0.22,
        y: y + 0.04,
        z: z + (Math.random() - 0.5) * 0.22,
        vx: Math.cos(a) * (0.3 + s * 0.7) * speedMult,
        vy: 0.5 + s * 0.8 * (isRunning ? 1.4 : 1.0),
        vz: Math.sin(a) * (0.3 + s * 0.7) * speedMult,
        life: 0.32 + s * 0.22,
        c,
      });
    }
  }

  // ---- dynamic footprints on soil, mud, sand and paths ----
  const FP_CAP = light ? 36 : 96;
  const fpGeo = new THREE.PlaneGeometry(0.12, 0.24); fpGeo.rotateX(-Math.PI / 2);
  const fpMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1.8,
    polygonOffsetUnits: -1.8,
  });
  const fpMesh = new THREE.InstancedMesh(fpGeo, fpMat, FP_CAP);
  fpMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(FP_CAP * 3), 3);
  fpMesh.count = 0; fpMesh.frustumCulled = false; fpMesh.renderOrder = 1; scene.add(fpMesh);

  const footprints = [];
  let fpFootLeft = false;
  const fpDummy = new THREE.Object3D(), fpCol = new THREE.Color();
  const FP_COLORS = {
    mud: '#241408',
    soil: '#3c2411',
    path: '#4f3e29',
    sand: '#6e5a3c',
    grass: '#2b3614',
    wood: '#44301d',
    water: '#5890b0',
  };

  function addFootprint(x, y, z, yaw, surf, isRun) {
    if (surf === 'wood') return; // no footprints on wooden boards
    const baseCol = new THREE.Color(FP_COLORS[surf] ?? '#443322');
    const maxLife = surf === 'mud' ? 14 : surf === 'sand' ? 10 : surf === 'soil' ? 11 : 7;
    if (footprints.length >= FP_CAP) footprints.shift();
    footprints.push({
      x, y: y + 0.015, z, yaw,
      surf,
      life: maxLife,
      maxLife,
      col: baseCol,
      scale: isRun ? 1.08 : 0.95,
    });
  }

  // Water footstep ripple rings
  const WR_CAP = light ? 12 : 24;
  const wrGeo = new THREE.RingGeometry(0.85, 1.0, 32); wrGeo.rotateX(-Math.PI / 2);
  const wrMat = new THREE.MeshBasicMaterial({ color: '#bce0fa', transparent: true, opacity: 0.65, depthWrite: false });
  const wrMesh = new THREE.InstancedMesh(wrGeo, wrMat, WR_CAP);
  wrMesh.count = 0; wrMesh.frustumCulled = false; wrMesh.renderOrder = 2; scene.add(wrMesh);
  const waterRipples = [];
  const wrDummy = new THREE.Object3D();

  function addWaterRipple(x, y, z, scaleMax = 0.55) {
    if (waterRipples.length >= WR_CAP) waterRipples.shift();
    waterRipples.push({ x, y: y + 0.02, z, progress: 0, scaleMax, life: 0.75 });
  }

  // ---- overlay: names, bubble, floaters, marker tag ----
  const el = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; overlay.appendChild(d); return d; };
  const labels = STATIONS.concat('safe').filter((id) => g.S[id]).map((id) => ({ id, d: el('g3-label') }));
  const bubble = el('g3-bubble'); bubble.style.display = 'none';
  const life = createLife(scene, g, overlay, lang);
  life.setHerd(world.herd); // people and animals keep out of each other (../footing.js)
  const tag = el('g3-tag'); tag.style.display = 'none';
  const actionTag = el('g3-action-tag'); actionTag.style.display = 'none';
  actionTag.onclick = (e) => { e.stopPropagation(); if (cam.intro === 0) simAct(g); };
  const floats = [];
  let snapReq = null; // photo mode: read the canvas straight after a render, before the browser clears it
  let bubbleT = 0, hush = false; // hush: a centre banner is up, so the bubble waits instead of talking over it
  const T = (o) => (o ? o[lang] ?? o.bn : '');
  const setNames = () => { for (const l of labels) l.d.textContent = T(g.R.names[l.id]); };
  setNames();

  // ---- camera and input ----
  // over the shoulder: close, low, and a little to the side so the farmer stands left of centre
  const cam = { layer: 'health', yaw: -2.4, pitch: 0.32, dist: touch ? 5 : 5.4, look: 0, sat: false, intro: 1, introT: lessMotion() ? 4.7 : 0, side: 0, reach: 1 };
  const camSpring = {
    curDist: cam.dist, distVel: 0,
    curPitch: cam.pitch, pitchVel: 0,
    satT: 0, satVel: 0,
    roll: 0, rollVel: 0,
    fovVel: 0,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    look: new THREE.Vector3(), lookVel: new THREE.Vector3(),
    ready: false,
  };
  let heatMix = 0;
  const keys = new Set();
  const joy = { x: 0, y: 0 };
  let runHeld = false, runToggle = false;
  const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  const onKey = (e, down) => {
    const k = e.code;
    const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
    const onControl = e.target.closest?.('button, a, [role="button"]');
    // Keep movement available after a HUD click, while never stealing keys from text fields.
    // Always process keyup so a key pressed before focus changed cannot stay held forever.
    if (down && (typing || (onControl && !MOVE_KEYS.has(k)))) return;
    if (MOVE_KEYS.has(k) || k === 'Space') e.preventDefault();
    if (down) keys.add(k); else keys.delete(k);
    if (k === 'ShiftLeft' || k === 'ShiftRight') runHeld = down;
  };
  const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false);
  const clearInput = () => { keys.clear(); runHeld = false; joy.x = 0; joy.y = 0; };
  const onVisibility = () => { if (document.hidden) clearInput(); };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', onVisibility);
  let prefs = { ...DEFAULT_SETTINGS }; // the player's look speed, invert and field of view (../settings.js)
  const drags = new Map();
  const pd = (e) => { canvas.setPointerCapture?.(e.pointerId); drags.set(e.pointerId, [e.clientX, e.clientY]); cam.look = 1.5; };
  const pm = (e) => {
    const d = drags.get(e.pointerId); if (!d) return;
    if (drags.size === 2) { // pinch to zoom
      const [a, b] = [...drags.values()]; const before = Math.hypot(a[0] - b[0], a[1] - b[1]);
      drags.set(e.pointerId, [e.clientX, e.clientY]);
      const [c2, d2] = [...drags.values()]; const after = Math.hypot(c2[0] - d2[0], c2[1] - d2[1]);
      cam.dist = Math.min(14, Math.max(3.5, cam.dist * (before / Math.max(1, after))));
      return;
    }
    const lk = lookDelta(e.clientX - d[0], e.clientY - d[1], touch ? 0.006 : 0.0045, prefs);
    cam.yaw += lk.yaw; cam.pitch = Math.min(1.25, Math.max(0.08, cam.pitch + lk.pitch));
    drags.set(e.pointerId, [e.clientX, e.clientY]); cam.look = 1.5;
  };
  const pu = (e) => drags.delete(e.pointerId);
  const wheel = (e) => { e.preventDefault(); cam.dist = Math.min(14, Math.max(3.5, cam.dist * (1 + Math.sign(e.deltaY) * 0.1))); };
  canvas.addEventListener('pointerdown', pd); canvas.addEventListener('pointermove', pm); canvas.addEventListener('pointerup', pu); canvas.addEventListener('pointercancel', pu);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || renderer.xr.isPresenting) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { const pr = renderer.getPixelRatio(); composer.setPixelRatio(pr); composer.setSize(w, h); }
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  // ---- where the quest wants the farmer next ----
  let hint = null, hintT = 0, stepT = 0;
  function goal() {
    if (hintT > 0 && hint) return hint;
    const q = QUESTS[g.quest];
    if (!q || g.won) return null;
    if (g.ev.zone && g.ev.zone.left > 0) return [g.ev.zone.x, g.ev.zone.z];
    const station = (id) => [g.S[id].x, g.S[id].z];
    const ripe = g.plots.find((p) => p.crop && !p.dead && p.g >= ripeAt(g));
    const pick = (fn) => { const p = g.plots.filter(fn).sort((a, b) => Math.hypot(a.x - g.me.x, a.z - g.me.z) - Math.hypot(b.x - g.me.x, b.z - g.me.z))[0]; return p ? [p.x, p.z] : null; };
    if (q.id === 'buy' && !g.count.advised) return station('kiosk');
    if (q.id === 'scan') return null;
    if (q.id === 'buy' || (!Object.values(g.seeds).some(Boolean) && !g.plots.some((p) => p.crop && !p.dead) && ['plant', 'water', 'harvest'].includes(q.id))) return station('shed');
    if (q.go === 'market' && Object.values(g.basket).some(Boolean) && (q.id === 'sell' || !ripe)) return station('market');
    if (g.can <= 0 && g.plots.some((p) => p.crop && !p.dead && p.moist < 0.5)) return station('water');
    if (g.plots.some((p) => p.pests)) return pick((p) => p.pests);
    if (q.id === 'plant') return pick((p) => !p.crop);
    if (q.id === 'harvest' && g.count.harvested >= 3 && !g.count.rotated) { const e = pick((p) => !p.crop && p.last); if (e) return e; }
    if (ripe && ['harvest', 'sell', 'storm', 'profit'].includes(q.id)) return pick((p) => p.crop && !p.dead && p.g >= ripeAt(g));
    const thirsty = pick((p) => p.crop && !p.dead && p.moist < 0.35 && p.g < ripeAt(g));
    if (thirsty) return thirsty;
    if (q.id === 'plant' || q.id === 'heat' || q.id === 'pests' || q.id === 'storm' || q.id === 'profit') { const e = pick((p) => !p.crop); if (e && Object.values(g.seeds).some(Boolean)) return e; }
    if (!Object.values(g.seeds).some(Boolean) && g.plots.some((p) => !p.crop)) return station('shed');
    return null;
  }

  // ---- minimap: a static picture of the farm, with the farmer, the zone and the goal drawn over it ----
  // the farm fills the map; out beyond it, the map zooms out to the whole walkable land
  let MAP_R = 46;
  let mapBg = null;
  function paintMap() {
    const c = minimap; if (!c) return;
    const S = c.width;
    const bg = document.createElement('canvas'); bg.width = bg.height = S; const x = bg.getContext('2d');
    const k = S / (MAP_R * 2), X = (v) => (v + MAP_R) * k;
    x.fillStyle = L.grass; x.fillRect(0, 0, S, S);
    if (L.patches) for (const [x0, x1, z0, z1, kind] of L.patches) { x.fillStyle = { wheat: '#7fa84a', stubble: '#c9b06a', mustard: '#e3c93a', paddy: '#a9b44a', bare: '#b39466', sunflower: '#d9b43a', sesame: '#9aa45a', groundnut: '#7c9a4a' }[kind]; x.fillRect(X(x0), X(z0), (x1 - x0) * k, (z1 - z0) * k); }
    x.strokeStyle = L.path; x.lineWidth = 2.4 * k; x.lineCap = 'round';
    for (const p of L.paths) { x.beginPath(); p.forEach(([a, b], i) => (i ? x.lineTo(X(a), X(b)) : x.moveTo(X(a), X(b)))); x.stroke(); }
    for (const w of L.water) { x.fillStyle = '#5f9fc0'; if (w.r) { x.beginPath(); x.arc(X(w.cx), X(w.cz), w.r * k, 0, Math.PI * 2); x.fill(); } else x.fillRect(X(Math.max(-MAP_R, w.x0)), X(Math.max(-MAP_R, w.z0)), (Math.min(MAP_R, w.x1) - Math.max(-MAP_R, w.x0)) * k, (Math.min(MAP_R, w.z1) - Math.max(-MAP_R, w.z0)) * k); }
    x.fillStyle = L.soil; x.fillRect(X(-FIELD_W / 2), X(-FIELD_D / 2), FIELD_W * k, FIELD_D * k);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; for (const p of g.plots) x.strokeRect(X(p.x - 1.6), X(p.z - 1.6), 3.2 * k, 3.2 * k);
    for (const b of L.blockers) if (b.hw) { x.save(); x.translate(X(b.x), X(b.z)); x.rotate(-Math.atan2(b.s, b.c)); x.fillStyle = 'rgba(60,40,30,.55)'; x.fillRect(-b.hw * k, -b.hd * k, b.hw * 2 * k, b.hd * 2 * k); x.restore(); }
    else { x.fillStyle = 'rgba(30,70,30,.45)'; x.beginPath(); x.arc(X(b.x), X(b.z), Math.max(1.2, b.r * k), 0, Math.PI * 2); x.fill(); }
    const icon = { shed: '#f2c94c', water: '#5fb8f0', market: '#f08a4a', kiosk: '#7fd36b', office: '#3b82f6' };
    for (const id of STATIONS) { if (!g.S[id]) continue; x.fillStyle = '#fff'; x.beginPath(); x.arc(X(g.S[id].x), X(g.S[id].z), 5.5, 0, Math.PI * 2); x.fill(); x.fillStyle = icon[id]; x.beginPath(); x.arc(X(g.S[id].x), X(g.S[id].z), 4, 0, Math.PI * 2); x.fill(); }
    mapBg = bg;
  }
  function drawMap(t, goalPos) {
    const c = minimap; if (!c || !mapBg) return;
    const wantR = Math.hypot(g.me.x, g.me.z) > 40 ? WORLD_R + 4 : 46;
    if (wantR !== MAP_R) { MAP_R = wantR; paintMap(); }
    const x = c.getContext('2d'), S = c.width, k = S / (MAP_R * 2), X = (v) => (v + MAP_R) * k;
    x.clearRect(0, 0, S, S); x.drawImage(mapBg, 0, 0);
    // pest and ripe dots
    for (const p of g.plots) {
      if (p.pests) { x.fillStyle = '#e04a3a'; x.beginPath(); x.arc(X(p.x), X(p.z), 2.4, 0, Math.PI * 2); x.fill(); }
      else if (p.crop && !p.dead && p.g >= ripeAt(g)) { x.fillStyle = '#ffe27a'; x.beginPath(); x.arc(X(p.x), X(p.z), 2, 0, Math.PI * 2); x.fill(); }
    }
    const z = g.ev.zone;
    if (z) {
      x.save(); x.fillStyle = 'rgba(30,60,120,.32)'; x.beginPath(); x.rect(0, 0, S, S); x.arc(X(z.x), X(z.z), z.r * k, 0, Math.PI * 2, true); x.fill('evenodd');
      x.strokeStyle = '#ffffff'; x.lineWidth = 2; x.setLineDash([5, 4]); x.beginPath(); x.arc(X(z.x), X(z.z), z.r * k, 0, Math.PI * 2); x.stroke(); x.restore();
      x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(X(g.me.x), X(g.me.z)); x.lineTo(X(z.x), X(z.z)); x.stroke();
    }
    x.fillStyle = '#f4efe2'; for (const [a, b] of life.dots()) { x.beginPath(); x.arc(X(a), X(b), 2.6, 0, Math.PI * 2); x.fill(); }
    if (route.pts) { x.save(); x.strokeStyle = route.auto ? '#fff0a0' : 'rgba(255,210,74,.9)'; x.lineWidth = 2.4; x.setLineDash([4, 3]); x.beginPath(); route.pts.forEach(([a, b], i) => (i ? x.lineTo(X(a), X(b)) : x.moveTo(X(a), X(b)))); x.stroke(); x.restore(); }
    if (goalPos) { const r = 5 + Math.sin(t * 5) * 1.5; x.strokeStyle = '#ffd24a'; x.lineWidth = 2.2; x.beginPath(); x.arc(X(goalPos[0]), X(goalPos[1]), r, 0, Math.PI * 2); x.stroke(); }
    // the farmer: an arrow pointing the way they face, and the camera's view cone
    x.save(); x.translate(X(g.me.x), X(g.me.z));
    const va = Math.atan2(-Math.cos(cam.yaw), -Math.sin(cam.yaw));
    x.fillStyle = 'rgba(255,255,255,.2)'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 28, va - 0.5, va + 0.5); x.closePath(); x.fill();
    x.rotate(-g.me.yaw + Math.PI); x.fillStyle = '#ffffff'; x.strokeStyle = '#123d24'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 5); x.lineTo(0, 2.5); x.lineTo(-5, 5); x.closePath(); x.fill(); x.stroke(); x.restore();
  }
  paintMap();

  // ---- the route (game/nav.js, after NavMeshPlus): the village's walkable surface is baked while the camera drops
  // from orbit; a trail of soft golden steps then leads round houses, trees and water to the mission, keeping to the
  // paths. A tap on the minimap (or walkToGoal) walks the farmer there, until the player takes the controls again.
  let nav = null;
  const navTimer = setTimeout(() => { if (alive) { try { nav = bakeNav(L); } catch { nav = null; } } }, 700);
  const TRAIL = 70, trailDot = new THREE.Object3D();
  const trail = new THREE.InstancedMesh(new THREE.CircleGeometry(0.16, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.8, depthWrite: false }), TRAIL);
  trail.count = 0; trail.frustumCulled = false; trail.renderOrder = 2; scene.add(trail);
  const route = { pts: null, to: null, step: 1, auto: false, at: 0 };
  function walkTo(x, z) {
    if (!nav) return false;
    const p = findPath(nav, g.me.x, g.me.z, x, z); if (!p) return false;
    Object.assign(route, { pts: p, to: [x, z], step: 1, auto: true, at: 0.6 }); return true;
  }
  // চক্র এজেন্ট doing a job: walk to the step's plot or station, do the work there, ask for the next step
  const helper = { job: null, step: null, t: 0 };
  function stopJob(why) {
    if (!helper.job) return;
    const job = helper.job; helper.job = null; helper.step = null; route.auto = false;
    onEvent({ type: 'helper', state: why, id: job.id, log: job.log });
  }
  function arrived(s) {
    const me = g.me;
    if (s.kind === 'plot') return plotAt(me.x, me.z) === s.i && Math.hypot(me.x - s.x, me.z - s.z) < 1.3;
    if (s.kind === 'station') { const t = target(g); return t?.kind === 'station' && t.id === s.id; }
    return Math.hypot(me.x - s.x, me.z - s.z) < s.r;
  }
  function helperTick(dt) {
    const job = helper.job; if (!job || g.me.act || g.me.down > 0) return;
    if (!helper.step) {
      const s = nextStep(g, job);
      if (!s) { stopJob('done'); return; }
      helper.step = s; helper.t = 0;
      if (!arrived(s) && !walkTo(s.x, s.z)) { stopJob('blocked'); return; }
      onEvent({ type: 'helper', state: 'going', id: job.id, step: s });
      return;
    }
    const s = helper.step; helper.t += dt;
    if (!arrived(s)) {
      if (helper.t > STEP_TIMEOUT) stopJob('blocked');
      else if (!route.auto) walkTo(s.x, s.z); // the route ended short of a station's reach: try again from here
      return;
    }
    route.auto = false;
    if (s.sel) g.sel = s.sel;
    if (s.buy) { for (const b of s.buy) simBuy(g, b.k, b.n); job.bought = true; }
    const what = s.kind === 'plot' ? target(g)?.what : null;
    if (!s.buy && s.kind !== 'spot') simAct(g);
    const line = stepLine(g, s, what); job.log.push(line); job.steps++;
    helper.step = null;
    onEvent({ type: 'helper', state: 'step', id: job.id, line, steps: job.steps });
  }
  function updateRoute(dt, goalPos, xrOn) {
    route.at -= dt;
    const to = route.auto ? route.to : goalPos, me = g.me;
    if (!nav || !to || cam.sat || xrOn || Math.hypot(to[0] - me.x, to[1] - me.z) < (route.auto ? 1.2 : 4)) { if (route.auto && to && Math.hypot(to[0] - me.x, to[1] - me.z) < 1.2) route.auto = false; route.pts = null; return; }
    if (route.at <= 0) { route.at = 0.6; const p = findPath(nav, me.x, me.z, to[0], to[1]); if (p) { route.pts = p; route.step = 1; } }
  }
  function drawTrail(t) {
    let n = 0;
    if (route.pts) {
      const pts = route.pts, total = pts.reduce((a, q, k) => (k ? a + Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]) : 0), 0);
      let d = 0, next = 1.6;
      for (let k = 1; k < pts.length && n < TRAIL; k++) {
        const [ax, az] = pts[k - 1], [bx, bz] = pts[k], len = Math.hypot(bx - ax, bz - az);
        while (next <= d + len && n < TRAIL && next < total - 0.8) {
          const u = (next - d) / (len || 1), x = ax + (bx - ax) * u, z = az + (bz - az) * u;
          const pulse = lessMotion() ? 1 : 1 + 0.35 * Math.max(0, Math.sin(t * 4 - next * 0.9));
          trailDot.position.set(x, L.ground(x, z) + 0.06, z); trailDot.scale.setScalar(pulse * Math.min(1, (total - next) / 3 + 0.4) * (route.auto ? 1.15 : 1)); trailDot.updateMatrix();
          trail.setMatrixAt(n++, trailDot.matrix); next += 1.1;
        }
        d += len;
      }
    }
    trail.count = n; trail.instanceMatrix.needsUpdate = true;
  }
  const mapTap = (e) => {
    if (!minimap || cam.intro) return;
    const r = minimap.getBoundingClientRect();
    if (walkTo(((e.clientX - r.left) / r.width) * 2 * MAP_R - MAP_R, ((e.clientY - r.top) / r.height) * 2 * MAP_R - MAP_R)) onEvent({ type: 'sound', s: 'tap' });
  };
  minimap?.addEventListener('pointerdown', mapTap);

  // ---- AR and VR (WebXR) ----
  // AR on a phone: the farm stands in the room as a tabletop model (one world metre to 2.5 cm) and the page's HUD stays
  // on top (dom-overlay), so the joystick, the act button and every panel work as they do on screen.
  // VR on a headset: life size, standing behind the farmer. Left stick walks, right stick turns in steps, trigger (or A/X)
  // acts, grip runs, and a sign over the farmer carries what they say, the mission and the alerts. A headset's AR
  // (passthrough, no dom-overlay) plays the tabletop with the same controllers and sign. Full VR (first person,
  // teleport, hands, panels in the world, the wrist) lives in xr.js, loaded when a session starts: `vr` while it runs.
  const AR_SCALE = 40, UP = new THREE.Vector3(0, 1, 0), fov0 = camera.fov;
  const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
  const xr = { mode: null, pads: false, run: false, yaw: 0, turnHeld: false, actHeld: false, eye: new THREE.Vector3(), dir: new THREE.Vector3(), at: new THREE.Vector3() };
  let vr = null, arx = null; // xr.js: the VR game and the AR placement, while a session runs
  const toPage = onEvent; onEvent = (e) => { vr?.peek(e); toPage(e); };
  const signC = document.createElement('canvas'); signC.width = 1024; signC.height = 320;
  const signTex = new THREE.CanvasTexture(signC); signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex, transparent: true, depthTest: false, fog: false }));
  sign.renderOrder = 10; sign.visible = false; scene.add(sign);
  let signT = 0;
  function showSign(title, body) {
    const x = signC.getContext('2d'), font = getComputedStyle(document.body).fontFamily;
    x.clearRect(0, 0, 1024, 320); x.fillStyle = 'rgba(13,26,18,.85)'; x.beginPath(); x.roundRect(8, 8, 1008, 304, 48); x.fill();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const lines = title ? [[title, `700 54px ${font}`, '#ffd24a']] : [], bodyFont = `500 46px ${font}`;
    x.font = bodyFont; let line = '';
    for (const w of body.split(' ')) { const s = line ? `${line} ${w}` : w; if (line && x.measureText(s).width > 940) { lines.push([line, bodyFont, '#ffffff']); line = w; } else line = s; }
    if (line) lines.push([line, bodyFont, '#ffffff']);
    const shown = lines.slice(0, 4);
    shown.forEach(([s, f, c], k) => { x.font = f; x.fillStyle = c; x.fillText(s, 512, 160 + (k - (shown.length - 1) / 2) * 68); });
    signTex.needsUpdate = true; sign.visible = true; signT = 6;
  }
  // VR: stand 4.5 m behind the farmer, the floor a little above theirs, following at walking pace
  function placeVR(k, gy) {
    rig.rotation.y = xr.yaw;
    const x = g.me.x + Math.sin(xr.yaw) * 4.5, z = g.me.z + Math.cos(xr.yaw) * 4.5;
    xr.at.set(x, Math.max(gy, L.ground(x, z)) + 0.6, z);
    rig.position.lerp(xr.at, k);
  }
  function pollPads() {
    const session = renderer.xr.getSession(); if (!session) return;
    let lx = 0, ly = 0, rx = 0, act = false, run = false;
    for (const src of session.inputSources) {
      const gp = src.gamepad; if (!gp) continue;
      const ax = gp.axes[2] ?? gp.axes[0] ?? 0, ay = gp.axes[3] ?? gp.axes[1] ?? 0;
      if (src.handedness === 'right') rx = ax; else { lx = ax; ly = ay; }
      act ||= !!(gp.buttons[0]?.pressed || gp.buttons[4]?.pressed);
      run ||= !!gp.buttons[1]?.pressed;
    }
    const dead = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    joy.x = dead(lx); joy.y = -dead(ly); xr.run = run;
    if (xr.mode === 'vr') {
      if (Math.abs(rx) > 0.7 && !xr.turnHeld) { xr.yaw -= Math.sign(rx) * Math.PI / 6; xr.turnHeld = true; placeVR(1, L.ground(g.me.x, g.me.z)); }
      else if (Math.abs(rx) < 0.3) xr.turnHeld = false;
    }
    if (act && !xr.actHeld && cam.intro === 0 && !paused) simAct(g);
    xr.actHeld = act;
  }
  async function enterXR(mode, root) {
    if (renderer.xr.isPresenting) return;
    const ar = mode === 'ar';
    const session = await navigator.xr.requestSession(ar ? 'immersive-ar' : 'immersive-vr', ar ? { optionalFeatures: ['dom-overlay', 'hit-test'], domOverlay: { root } } : { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
    renderer.xr.setReferenceSpaceType(ar ? 'local' : 'local-floor');
    const X = await import('./xr.js');
    X.prepareXR(renderer);
    await renderer.xr.setSession(session);
    xr.mode = mode; xr.pads = !ar || !session.domOverlayState;
    if (cam.intro) { cam.intro = 0; onEvent({ type: 'introDone' }); }
    world.sky.visible = !ar;
    if (ar) {
      // the field's middle half a metre below the eyes and 0.9 m ahead, seen from where the camera was looking
      const v = new THREE.Vector3(0, -0.45, -0.9).multiplyScalar(AR_SCALE).applyAxisAngle(UP, cam.yaw);
      rig.scale.setScalar(AR_SCALE); rig.rotation.y = cam.yaw; rig.position.set(-v.x, L.ground(0, 0) - v.y, -v.z);
      sign.scale.set(12.8, 4, 1);
    } else { xr.yaw = cam.yaw; placeVR(1, L.ground(g.me.x, g.me.z)); sign.scale.set(3.2, 1, 1); }
    try {
      if (ar) arx = X.createAR({ renderer, rig, L, scale0: AR_SCALE, root });
      else vr = X.createXR({ renderer, scene, camera, rig, g, L, P, world, xrs: xr, joy, cam, emit: toPage, api: {
        lang: () => lang, act: () => { if (cam.intro === 0) simAct(g); }, emote: (k) => simEmote(g, k), npcs: () => life.dots?.() ?? [], route,
        sat: () => cam.sat, layer: () => cam.layer, toggleSat() { cam.sat = !cam.sat; g.ndvi = cam.sat; if (cam.sat) note(g, 'satViews'); if (cam.sat && cam.layer === 'water') note(g, 'waterLayer'); },
        setLayer(l) { cam.layer = l; if (l === 'water' && cam.sat) note(g, 'waterLayer'); },
        runJob(id, opts) { if (cam.intro || !nav) return false; stopJob('replaced'); helper.job = newJob(id, opts); helper.step = null; return true; },
        stopJob: () => stopJob('stopped'), job: () => (helper.job ? { id: helper.job.id, steps: helper.job.steps } : null),
      } });
    } catch (err) { if (import.meta.env.DEV) console.error('[xr]', err); }
    session.addEventListener('end', () => {
      try { vr?.end(); arx?.end(); } catch { /* the scene may be gone */ }
      vr = null; arx = null;
      xr.mode = null; xr.pads = false; xr.run = false; joy.x = joy.y = 0;
      rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); rig.scale.setScalar(1);
      world.sky.visible = true; sign.visible = false; camera.fov = fov0; resize();
      onEvent({ type: 'xr', mode: null });
    });
    onEvent({ type: 'xr', mode });
  }

  // ---- the loop ----
  const tmpV = new THREE.Vector3(), focus = new THREE.Vector3(), camPos = new THREE.Vector3();
  let last = performance.now(), mapT = 0, paused = false, alive = true;
  const project = (x, y, z) => { tmpV.set(x, y, z).project(renderer.xr.isPresenting ? renderer.xr.getCamera() : camera); return [(tmpV.x * 0.5 + 0.5) * canvas.clientWidth, (-tmpV.y * 0.5 + 0.5) * canvas.clientHeight, tmpV.z < 1]; };

  const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  // A gamepad in the standard layout: left stick walks, right stick looks, A acts, either trigger runs; B, X, Y, the
  // shoulders and Start go to the HUD as 'pad' events (back, satellite, FieldShift, seed left and right, pause).
  const pad = { x: 0, y: 0, run: false, held: new Set() };
  const PAD_EVENTS = { 1: 'back', 2: 'sat', 3: 'kiosk', 4: 'prev', 5: 'next', 9: 'pause' };
  function readPad(dt) {
    const gp = typeof navigator !== 'undefined' && [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected && p.mapping === 'standard');
    if (!gp) { pad.x = pad.y = 0; pad.run = false; return; }
    const dz = (v) => (Math.abs(v ?? 0) < 0.18 ? 0 : v);
    const edge = (i) => { const on = !!gp.buttons[i]?.pressed, was = pad.held.has(i); if (on) pad.held.add(i); else pad.held.delete(i); return on && !was; };
    pad.x = dz(gp.axes[0]); pad.y = -dz(gp.axes[1]);
    pad.run = (gp.buttons[6]?.value ?? 0) > 0.4 || (gp.buttons[7]?.value ?? 0) > 0.4 || !!gp.buttons[10]?.pressed;
    const rx = dz(gp.axes[2]), ry = dz(gp.axes[3]);
    if (rx || ry) { const lk = lookDelta(rx * 2.4, ry * 1.6, dt, prefs); cam.yaw += lk.yaw; cam.pitch = Math.min(1.25, Math.max(0.08, cam.pitch + lk.pitch)); cam.look = 1.5; }
    if (edge(0) && cam.intro === 0 && !paused && !g.paused) simAct(g);
    for (const [i, action] of Object.entries(PAD_EVENTS)) if (edge(+i)) onEvent({ type: 'pad', action });
  }
  function inputVector() {
    if (route.auto && (MOVE.some((k) => keys.has(k)) || Math.hypot(joy.x, joy.y) > 0.15 || Math.hypot(pad.x, pad.y) > 0)) { route.auto = false; stopJob('taken'); } // the player takes over
    if (route.auto && route.pts) {
      const me = g.me; let p = route.pts[route.step];
      while (p && Math.hypot(p[0] - me.x, p[1] - me.z) < 0.7 && route.step < route.pts.length - 1) p = route.pts[++route.step];
      const dx = p[0] - me.x, dz = p[1] - me.z, d = Math.hypot(dx, dz);
      if (d > 0.3) { const left = Math.hypot(route.to[0] - me.x, route.to[1] - me.z); return { mx: dx / d, mz: dz / d, run: left > 10 }; }
    }
    let fx = 0, fz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) fz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) fz -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) fx += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) fx -= 1;
    fx += joy.x + pad.x; fz += joy.y + pad.y;
    const l = Math.hypot(fx, fz); if (l > 1) { fx /= l; fz /= l; }
    const s = Math.sin(cam.yaw), c = Math.cos(cam.yaw);
    // forward is from the camera towards the farmer; right is forward × up
    return { mx: -s * fz + c * fx, mz: -c * fz - s * fx, run: pad.run || runHeld || runToggle || xr.run || Math.hypot(joy.x, joy.y) > 0.95, brisk: !!prefs.fastWalk };
  }

  function frame(now) {
    if (!alive) return;
    try {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = now / 1000;
      // in AR and VR the head is the camera: walking is relative to where the player looks
      const xrOn = renderer.xr.isPresenting;
      if (xrOn) {
        const xc = renderer.xr.getCamera(); xc.getWorldPosition(xr.eye); xc.getWorldDirection(xr.dir);
        if (Math.hypot(xr.dir.x, xr.dir.z) > 0.1) cam.yaw = Math.atan2(-xr.dir.x, -xr.dir.z);
        if (vr) vr.input(dt); else if (xr.pads) pollPads();
      }
      if (!xrOn) readPad(dt);
      const inp = inputVector();
      if (cam.intro > 0) { cam.introT += dt; if (cam.introT > 5.2) { cam.intro = 0; onEvent({ type: 'introDone' }); } }
      heatMix += (((g.ev.heat > 0 && !cam.sat && !xrOn) ? 1 : 0) - heatMix) * Math.min(1, dt * 3.2);
      if (gradPass) { gradPass.uniforms.uTime.value = t; gradPass.uniforms.uHeat.value = heatMix; }
      if (!paused && cam.intro === 0) {
        if (keys.has('Space') || keys.has('KeyE') || keys.has('KeyF')) { keys.delete('Space'); keys.delete('KeyE'); keys.delete('KeyF'); simAct(g); }
        if (keys.has('KeyG')) { keys.delete('KeyG'); simEmote(g, 'greet'); }
        if (keys.has('KeyT')) { keys.delete('KeyT'); simEmote(g, 'wipe'); }
        if (keys.has('KeyH')) { keys.delete('KeyH'); simEmote(g, 'soilcheck'); }
        step(g, dt, inp);
        helperTick(dt);
      }
      for (const e of g.out.splice(0)) {
        if (vr && vr.event(e)) continue; // VR shows it in the world (a panel never ends the session)
        if (xr.pads && !vr) {
          if (e.type === 'say' || e.type === 'toast') showSign('', T(e.text));
          else if (e.type === 'alert') showSign(T(e.title), T(e.body));
          else if (e.type === 'quest') showSign(lang === 'bn' ? `মিশন ${String(e.index + 1).replace(/\d/g, (n) => '০১২৩৪৫৬৭৮৯'[n])}` : `Mission ${e.index + 1}`, T(QUESTS[e.index]));
          else if (e.type === 'open' || e.type === 'broke') renderer.xr.getSession()?.end();
        }
        if (e.type === 'fx') burst(e.kind, e.x, e.z);
        else if (e.type === 'flash') world.flash();
        else if (e.type === 'say') { bubble.textContent = T(e.text); bubble.style.display = ''; bubble.classList.remove('g3-pop'); void bubble.offsetWidth; bubble.classList.add('g3-pop'); bubbleT = e.long ? 6.5 : 3.4; }
        else if (e.type === 'float') { const d = el(`g3-float g3-${e.tone}`); d.textContent = T(e.text); floats.push({ d, x: e.x, z: e.z, t: 0 }); }
        else if (e.type === 'hint') { const s = g.S[e.what]; if (s) { hint = [s.x, s.z]; hintT = 6; } onEvent(e); }
        else onEvent(e);
      }
      hintT -= dt;
      // the farmer
      const me = g.me, gy = L.ground(me.x, me.z) + (g.ev.flood > 0.3 && Math.abs(me.x) < FIELD_W / 2 + 4 && Math.abs(me.z) < FIELD_D / 2 + 4 ? -0.15 : 0);
      P.root.position.set(me.x, gy, me.z); P.root.rotation.y = me.yaw;
      // people stand upright on a slope; their feet follow the ground (people.js animate, slopeX / slopeZ)
      P.root.rotation.x = 0; P.root.rotation.z = 0;
      let nearestNpc = null, minNpcD = 4.2;
      const npcs = life.dots?.() ?? [];
      for (const [nx, nz] of npcs) {
        const d = Math.hypot(nx - me.x, nz - me.z);
        if (d < minNpcD) { minNpcD = d; nearestNpc = { x: nx, y: L.ground(nx, nz) + 1.35, z: nz }; }
      }
      if (g.S?.shed) {
        const d = Math.hypot(g.S.shed.x - me.x, g.S.shed.z - me.z);
        if (d < minNpcD) { minNpcD = d; nearestNpc = { x: g.S.shed.x, y: L.ground(g.S.shed.x, g.S.shed.z) + 1.45, z: g.S.shed.z }; }
      }
      if (g.S?.kiosk) {
        const d = Math.hypot(g.S.kiosk.x - me.x, g.S.kiosk.z - me.z);
        if (d < minNpcD) { minNpcD = d; nearestNpc = { x: g.S.kiosk.x, y: L.ground(g.S.kiosk.x, g.S.kiosk.z) + 1.35, z: g.S.kiosk.z }; }
      }
      animate(P, {
        speed: me.speed,
        run: me.run,
        act: me.act,
        down: me.down,
        t,
        carrying: Object.values(g.basket).reduce((a, b) => a + b, 0) > 0,
        bank: me.bank ?? 0,
        turnRate: me.turnRate ?? 0,
        lookTarget: nearestNpc,
        slopeZ: me.slopeZ,
        slopeX: me.slopeX,
      }, dt);
      if (me.speed > 0.6 && !me.act && me.down <= 0) {
        // a footstep at each heel strike of the stride (people.js keeps P.phase: 0 and π are the two feet landing)
        const half = Math.floor((P.phase ?? 0) / Math.PI);
        if (half !== stepT) {
          stepT = half;
          fpFootLeft = half === 0; // leg 0 (the figure's -x side) lands at phase 0
          const sideOffset = fpFootLeft ? -0.11 : 0.11, ahead = Math.min(0.35, me.speed * 0.12);
          const fx = me.x + Math.cos(me.yaw) * sideOffset + Math.sin(me.yaw) * ahead;
          const fz = me.z - Math.sin(me.yaw) * sideOffset + Math.cos(me.yaw) * ahead;
          const fy = L.ground(fx, fz);
          const surf = surfaceAt(L, g, fx, fz);
          onEvent({ type: 'sound', s: 'step', surface: surf, run: me.run });

          if (surf === 'water' || (g.ev.flood > 0.15 && Math.abs(fx) < FIELD_W / 2 + 4 && Math.abs(fz) < FIELD_D / 2 + 4)) {
            addWaterRipple(fx, fy, fz, me.run ? 0.65 : 0.42);
            footDust(fx, fy, fz, me.run ? 5 : 2, '#7dd3fc', me.run);
          } else {
            addFootprint(fx, fy, fz, me.yaw, surf, me.run);
            const dustCol = surf === 'mud' ? '#382212' : surf === 'grass' ? '#688c3a' : surf === 'sand' ? '#c4ad84' : surf === 'wood' ? '#8c6d48' : '#947a5a';
            footDust(fx, fy, fz, me.run ? 4 : 2, dustCol, me.run);
          }
        }
      } else {
        stepT = Math.floor((P.phase ?? 0) / Math.PI);
      }
      // camera: critically damped spring follow with velocity look-ahead, orbital zoom blend & dynamic roll banking
      const runShare = me.run ? Math.min(1, me.speed / 4.8) : 0;
      const leadX = (me.vx ?? 0) * 0.25, leadZ = (me.vz ?? 0) * 0.25;
      focus.set(me.x + leadX, gy + 1.45, me.z + leadZ);
      if (cam.look > 0) cam.look -= dt;
      else if (me.speed > 1 && !cam.sat) { let d = (me.yaw + Math.PI) - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < 2.2) cam.yaw += d * Math.min(1, dt * 1.1); }
      [camSpring.curDist, camSpring.distVel] = springStep(camSpring.curDist, camSpring.distVel, cam.dist, 0.12, dt);
      [camSpring.curPitch, camSpring.pitchVel] = springStep(camSpring.curPitch, camSpring.pitchVel, cam.pitch, 0.08, dt);
      [camSpring.satT, camSpring.satVel] = springStep(camSpring.satT, camSpring.satVel, cam.sat ? 1 : 0, 0.34, dt);
      const dist = THREE.MathUtils.lerp(camSpring.curDist * (1 + runShare * 0.16), 46, camSpring.satT);
      const pitch = THREE.MathUtils.lerp(camSpring.curPitch, 1.35, camSpring.satT);
      cam.side += ((cam.sat ? 0 : 0.55) - cam.side) * Math.min(1, dt * 3.5);
      const rx = Math.cos(cam.yaw) * cam.side, rz = -Math.sin(cam.yaw) * cam.side;
      focus.x += rx; focus.z += rz;
      camPos.set(focus.x + Math.sin(cam.yaw) * Math.cos(pitch) * dist, gy + 1.45 + Math.sin(pitch) * dist, focus.z + Math.cos(cam.yaw) * Math.cos(pitch) * dist);
      // never inside a house: come in to just before the wall at once, ease back out once the way is clear
      if (!cam.sat && !xrOn) {
        const want = camReach(L.blockers, [focus.x, 1.45, focus.z], [camPos.x, camPos.y - gy, camPos.z]);
        cam.reach = want < cam.reach ? want : cam.reach + (want - cam.reach) * Math.min(1, dt * 2.2);
        if (cam.reach < 0.999) camPos.lerpVectors(focus, camPos, Math.max(0.16, cam.reach));
      } else cam.reach = 1;
      if (xrOn) { if (vr) vr.place(dt, gy); else if (xr.mode === 'vr') placeVR(Math.min(1, dt * 2.5), gy); arx?.frame(); }
      else if (cam.intro > 0) {
        const k = ease((cam.introT - 0.8) / 4.0);
        const top = tmpV.set(0, 200, 50);
        camera.position.copy(top).lerp(camPos, k);
        camera.up.set(0, 1, 0); camera.lookAt(focus.x * k, focus.y * k, focus.z * k);
        camSpring.pos.copy(camera.position); camSpring.vel.set(0, 0, 0);
        camSpring.look.copy(focus); camSpring.lookVel.set(0, 0, 0);
        camSpring.ready = true;
        if (scene.fog) scene.fog.far = Math.max(scene.fog.far, 420);
      } else {
        camPos.y = Math.max(camPos.y, L.ground(camPos.x, camPos.z) + 0.6);
        if (!camSpring.ready) {
          camSpring.pos.copy(camPos); camSpring.vel.set(0, 0, 0);
          camSpring.look.copy(focus); camSpring.lookVel.set(0, 0, 0);
          camSpring.ready = true;
        } else {
          const st = THREE.MathUtils.lerp(0.11, 0.24, camSpring.satT);
          [camSpring.pos.x, camSpring.vel.x] = springStep(camSpring.pos.x, camSpring.vel.x, camPos.x, st, dt);
          [camSpring.pos.y, camSpring.vel.y] = springStep(camSpring.pos.y, camSpring.vel.y, camPos.y, st, dt);
          [camSpring.pos.z, camSpring.vel.z] = springStep(camSpring.pos.z, camSpring.vel.z, camPos.z, st, dt);
          const lt = THREE.MathUtils.lerp(0.085, 0.20, camSpring.satT);
          [camSpring.look.x, camSpring.lookVel.x] = springStep(camSpring.look.x, camSpring.lookVel.x, focus.x, lt, dt);
          [camSpring.look.y, camSpring.lookVel.y] = springStep(camSpring.look.y, camSpring.lookVel.y, focus.y, lt, dt);
          [camSpring.look.z, camSpring.lookVel.z] = springStep(camSpring.look.z, camSpring.lookVel.z, focus.z, lt, dt);
        }
        camSpring.pos.y = Math.max(camSpring.pos.y, L.ground(camSpring.pos.x, camSpring.pos.z) + 0.6);
        if (!cam.sat && camSpring.satT < 0.35) {
          const springReach = camReach(L.blockers, [camSpring.look.x, camSpring.look.y - gy, camSpring.look.z], [camSpring.pos.x, camSpring.pos.y - gy, camSpring.pos.z]);
          if (springReach < 0.999) {
            camSpring.pos.lerpVectors(camSpring.look, camSpring.pos, Math.max(0.16, springReach));
            camSpring.vel.multiplyScalar(0.5);
          }
        }
        camera.position.copy(camSpring.pos);
        camera.up.set(0, 1, 0);
        camera.lookAt(camSpring.look);
        const wantRoll = (cam.sat || camSpring.satT > 0.1 || lessMotion() || me.speed < 0.6)
          ? 0
          : Math.max(-0.032, Math.min(0.032, (me.turnRate ?? 0) * (me.run ? 0.0075 : 0.0035)));
        [camSpring.roll, camSpring.rollVel] = springStep(camSpring.roll, camSpring.rollVel, wantRoll, 0.16, dt);
        if (Math.abs(camSpring.roll) > 1e-4) camera.rotateZ(camSpring.roll);
        const baseFov = (touch ? 60 : 52) + prefs.fov;
        const targetFov = baseFov + (1 - camSpring.satT) * runShare * 4;
        if (Math.abs(camera.fov - targetFov) > 0.02 || Math.abs(camSpring.fovVel) > 0.02) {
          [camera.fov, camSpring.fovVel] = springStep(camera.fov, camSpring.fovVel, targetFov, 0.14, dt);
          camera.updateProjectionMatrix();
        } else if (camera.fov !== targetFov) {
          camera.fov = targetFov;
          camSpring.fovVel = 0;
          camera.updateProjectionMatrix();
        }
      }
      const goalPos = cam.intro ? null : goal();
      const onIt = goalPos && Math.hypot(goalPos[0] - me.x, goalPos[1] - me.z) < 1.8;
      world.marker(onIt ? null : goalPos);
      updateRoute(dt, goalPos, xrOn); drawTrail(t);
      const eye = xrOn ? xr.eye : camera.position;
      const ph = dayPhase(g), sunUp = ph < 0.75 ? Math.sin((ph / 0.75) * Math.PI) : 0;
      personLight.value = 0.35 + 0.65 * Math.min(1, sunUp * 2.5);
      fill.intensity = 0.2 + 0.3 * Math.min(1, sunUp * 2.5);
      fill.position.copy(eye).add(tmpV.set(0, 2, 0)); fill.target.position.copy(focus);
      const { wind } = world.update(t, dt, ph, g.ev, eye, focus, me);
      if (xr.mode === 'ar') { scene.fog.near = 1e4; scene.fog.far = 2e4; } // the room is the horizon
      field.update(t, wind, g.ndvi || cam.sat, g.F.scanner, cam.layer, me);
      life.update(t, paused || cam.intro ? 0 : dt, project, eye);
      if (sign.visible) { signT -= dt; sign.position.set(me.x, gy + (xr.mode === 'ar' ? 8 : 3.3), me.z); if (signT <= 0 || !xrOn) sign.visible = false; }
      // Action-driven dynamic particles (water stream from can, aerosol spray from lance)
      if (me.act && parts.length < MAXP - 15) {
        const actProg = me.act.p / me.act.dur;
        const yw = me.yaw;
        if (me.act.type === 'water' && actProg > 0.22 && actProg < 0.82) {
          const sx = me.x + Math.sin(yw) * 0.45 + Math.cos(yw) * 0.25;
          const sz = me.z + Math.cos(yw) * 0.45 - Math.sin(yw) * 0.25;
          const sy = gy + 0.82;
          const c = new THREE.Color('#7dd3fc');
          for (let k = 0; k < 2; k++) {
            parts.push({
              x: sx + (Math.random() - 0.5) * 0.08,
              y: sy + (Math.random() - 0.5) * 0.08,
              z: sz + (Math.random() - 0.5) * 0.08,
              vx: Math.sin(yw) * (1.6 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.3,
              vy: 0.3 + Math.random() * 0.4,
              vz: Math.cos(yw) * (1.6 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.3,
              life: 0.45,
              c,
            });
          }
        } else if (me.act.type === 'spray' && actProg > 0.15 && actProg < 0.88) {
          const sx = me.x + Math.sin(yw) * 0.55;
          const sz = me.z + Math.cos(yw) * 0.55;
          const sy = gy + 0.72;
          const c = new THREE.Color('#bbf7d0');
          for (let k = 0; k < 2; k++) {
            const spread = yw + (Math.random() - 0.5) * 0.5;
            parts.push({
              x: sx,
              y: sy,
              z: sz,
              vx: Math.sin(spread) * (1.9 + Math.random() * 0.7),
              vy: -0.1 - Math.random() * 0.3,
              vz: Math.cos(spread) * (1.9 + Math.random() * 0.7),
              life: 0.38,
              c,
            });
          }
        } else if (me.act.type === 'harvest' && actProg > 0.15 && actProg < 0.75) {
          const sx = me.x + Math.sin(yw) * 0.45;
          const sz = me.z + Math.cos(yw) * 0.45;
          const sy = gy + 0.25;
          const c = new THREE.Color('#fcd34d');
          for (let k = 0; k < 2; k++) {
            parts.push({
              x: sx + (Math.random() - 0.5) * 0.35,
              y: sy + Math.random() * 0.2,
              z: sz + (Math.random() - 0.5) * 0.35,
              vx: (Math.random() - 0.5) * 0.8,
              vy: 1.6 + Math.random() * 1.2,
              vz: (Math.random() - 0.5) * 0.8,
              life: 0.42,
              c,
            });
          }
        } else if (me.act.type === 'plant' && actProg > 0.2 && actProg < 0.7) {
          const sx = me.x + Math.sin(yw) * 0.45;
          const sz = me.z + Math.cos(yw) * 0.45;
          const sy = gy + 0.45;
          const c = new THREE.Color('#78350f');
          for (let k = 0; k < 2; k++) {
            parts.push({
              x: sx + (Math.random() - 0.5) * 0.2,
              y: sy,
              z: sz + (Math.random() - 0.5) * 0.2,
              vx: (Math.random() - 0.5) * 0.6,
              vy: -0.4 - Math.random() * 0.4,
              vz: (Math.random() - 0.5) * 0.6,
              life: 0.32,
              c,
            });
          }
        } else if (me.act.type === 'sell' && actProg > 0.15 && actProg < 0.8) {
          const sx = me.x + Math.sin(yw) * 0.35;
          const sz = me.z + Math.cos(yw) * 0.35;
          const sy = gy + 0.85;
          const c = new THREE.Color('#f59e0b');
          for (let k = 0; k < 3; k++) {
            const a = Math.random() * Math.PI * 2;
            parts.push({
              x: sx,
              y: sy,
              z: sz,
              vx: Math.cos(a) * (1.2 + Math.random() * 1.5),
              vy: 2.2 + Math.random() * 1.4,
              vz: Math.sin(a) * (1.2 + Math.random() * 1.5),
              life: 0.52,
              c,
            });
          }
        }
      }
      // particles
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.life <= 0 || p.y < -1) parts.splice(i, 1); }
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
        pCol[i * 3] = p.c.r; pCol[i * 3 + 1] = p.c.g; pCol[i * 3 + 2] = p.c.b;
      }
      pGeo.setDrawRange(0, parts.length);
      if (parts.length) { pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true; }

      // Dynamic footprints update
      let fpCount = 0;
      for (let i = footprints.length - 1; i >= 0; i--) {
        const fp = footprints[i];
        fp.life -= dt;
        if (fp.life <= 0) {
          footprints.splice(i, 1);
          continue;
        }
        const alpha = Math.min(1.0, fp.life / fp.maxLife);
        const curScale = fp.scale * (0.8 + alpha * 0.2);
        fpDummy.position.set(fp.x, fp.y, fp.z);
        fpDummy.rotation.set(0, fp.yaw, 0);
        fpDummy.scale.set(curScale, 1, curScale);
        fpDummy.updateMatrix();
        fpMesh.setMatrixAt(fpCount, fpDummy.matrix);
        fpCol.copy(fp.col).multiplyScalar(alpha * 0.85);
        fpMesh.setColorAt(fpCount, fpCol);
        fpCount++;
      }
      fpMesh.count = fpCount;
      if (fpCount > 0) {
        fpMesh.instanceMatrix.needsUpdate = true;
        if (fpMesh.instanceColor) fpMesh.instanceColor.needsUpdate = true;
      }

      // Dynamic water footstep ripples update
      let wrCount = 0;
      for (let i = waterRipples.length - 1; i >= 0; i--) {
        const wr = waterRipples[i];
        wr.progress += dt / wr.life;
        if (wr.progress >= 1.0) {
          waterRipples.splice(i, 1);
          continue;
        }
        const s = wr.scaleMax * (0.15 + wr.progress * 0.85);
        wrDummy.position.set(wr.x, wr.y, wr.z);
        wrDummy.scale.set(s, 1, s);
        wrDummy.updateMatrix();
        wrMesh.setMatrixAt(wrCount, wrDummy.matrix);
        wrCount++;
      }
      wrMesh.count = wrCount;
      if (wrCount > 0) wrMesh.instanceMatrix.needsUpdate = true;

      if (composer && !xrOn) {
        try {
          composer.render(dt);
        } catch {
          composer = null;
          renderer.render(scene, camera);
        }
      } else {
        renderer.render(scene, camera);
      }
      if (snapReq) { const done = snapReq; snapReq = null; canvas.toBlob(done, 'image/jpeg', 0.92); }
      // overlay
      for (const l of labels) {
        const s = g.S[l.id], d = Math.hypot(s.x - me.x, s.z - me.z);
        const show = !cam.intro && d < (l.id === 'office' ? 26 : 16) && (l.id !== 'safe' || g.ev.zone);
        if (!show) { l.d.style.display = 'none'; continue; }
        const [x, y, vis] = project(s.x, L.ground(s.x, s.z) + (l.id === 'safe' ? 7 : l.id === 'office' ? 7.4 : 3.6), s.z);
        l.d.style.display = vis ? '' : 'none'; l.d.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`; l.d.style.opacity = String(Math.min(1, (16 - d) / 5));
      }
      if (bubbleT > 0) {
        if (!hush) bubbleT -= dt; const [x, y, vis] = project(me.x, gy + 2.15, me.z);
        bubble.style.display = vis && !cam.intro && !hush ? '' : 'none'; bubble.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
        if (bubbleT <= 0) bubble.style.display = 'none';
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i]; f.t += dt;
        const [x, y, vis] = project(f.x, L.ground(f.x, f.z) + 1.6 + f.t * 0.9, f.z);
        f.d.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`; f.d.style.opacity = String(Math.max(0, 1 - Math.max(0, f.t - 0.9) / 0.6)); f.d.style.display = vis ? '' : 'none';
        if (f.t > 1.5) { f.d.remove(); floats.splice(i, 1); }
      }
      if (goalPos && !onIt && !cam.sat) {
        const gyy = L.ground(goalPos[0], goalPos[1]) + 4.6;
        let [x, y, vis] = project(goalPos[0], gyy, goalPos[1]);
        const W = canvas.clientWidth, H = canvas.clientHeight, m = 36;
        if (!vis) { x = W - x; y = H - y; }
        const off = !vis || x < m || x > W - m || y < m || y > H - m;
        x = Math.min(W - m, Math.max(m, x)); y = Math.min(H - m, Math.max(m + 40, y));
        tag.style.display = ''; tag.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        tag.classList.toggle('g3-edge', off);
        const dm = Math.round(Math.hypot(goalPos[0] - me.x, goalPos[1] - me.z));
        tag.textContent = lang === 'bn' ? `${String(dm).replace(/\d/g, (n) => '০১২৩৪৫৬৭৮৯'[n])} মি` : `${dm} m`;
      } else tag.style.display = 'none';

      // In-world contextual 3D action prompt directly over active target
      try {
        const curTarget = cam.intro ? null : target(g);
        if (curTarget && !cam.sat) {
          let tx, ty, tz, actionTxt;
          if (curTarget.kind === 'plot' && curTarget.p) {
            const p = curTarget.p;
            tx = p.x; tz = p.z;
            ty = L.ground(tx, tz) + 0.95;
            const cName = curTarget.crop ? (curTarget.crop[lang] ?? curTarget.crop.bn ?? curTarget.crop.name?.[lang] ?? curTarget.crop.en ?? '') : '';
            const acts = {
              spray: lang === 'bn' ? 'বালাই দমন' : 'Treat plot',
              clear: lang === 'bn' ? 'মরা গাছ সরান' : 'Clear dead',
              plant: lang === 'bn' ? (cName ? `${cName} বুনুন` : 'বীজ বুনুন') : (cName ? `Sow ${cName}` : 'Sow seeds'),
              harvest: lang === 'bn' ? (cName ? `${cName} তুলুন` : 'ফসল তুলুন') : (cName ? `Harvest ${cName}` : 'Harvest crop'),
              water: lang === 'bn' ? 'পানি দিন' : 'Water plot',
              wet: lang === 'bn' ? 'মাটি ভেজা' : 'Soil wet',
              nowater: lang === 'bn' ? 'পানি আনুন' : 'Fetch water',
              noseed: lang === 'bn' ? 'দোকানে যান' : 'Go to shop',
            };
            actionTxt = acts[curTarget.what] ?? (lang === 'bn' ? 'কাজ করুন' : 'Act');
          } else if (curTarget.kind === 'station' && g.S?.[curTarget.id]) {
            const s = g.S[curTarget.id];
            tx = s.x; tz = s.z;
            ty = L.ground(tx, tz) + 1.85;
            const stActs = {
              shed: lang === 'bn' ? 'বীজের দোকান' : 'Seed shed',
              water: lang === 'bn' ? 'সেচ পাম্প' : 'Water pump',
              market: lang === 'bn' ? (g.basket && Object.values(g.basket).some(Boolean) ? 'ফসল বিক্রি' : 'হাটবাজার') : (g.basket && Object.values(g.basket).some(Boolean) ? 'Sell harvest' : 'Market'),
              kiosk: lang === 'bn' ? 'FieldShift কিওস্ক' : 'FieldShift Kiosk',
            };
            actionTxt = stActs[curTarget.id] ?? (lang === 'bn' ? 'দেখুন' : 'Open');
          }
          if (tx !== undefined) {
            const [x, y, vis] = project(tx, ty, tz);
            if (vis) {
              actionTag.style.display = '';
              actionTag.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
              actionTag.innerHTML = `<span class="g3-action-kbd">${touch ? '👆' : 'E'}</span> <span>${actionTxt}</span>`;
            } else {
              actionTag.style.display = 'none';
            }
          } else {
            actionTag.style.display = 'none';
          }
        } else {
          actionTag.style.display = 'none';
        }
      } catch {
        actionTag.style.display = 'none';
      }

      if (compass) compass.style.setProperty('--heading', String((((-cam.yaw * 180) / Math.PI) % 360 + 540) % 360 - 180));
      mapT -= dt; if (mapT <= 0) { mapT = 0.08; drawMap(t, goalPos); }
    } catch (err) { if (import.meta.env.DEV && !frame.warned) { frame.warned = true; console.error("[stage frame]", err); }
      try { renderer.render(scene, camera); } catch {}
    }
  }
  renderer.setAnimationLoop(frame); // not requestAnimationFrame: an XR session drives its own frames

  return {
    setJoy(x, y) { joy.x = x; joy.y = y; },
    walkTo,
    walkToGoal() { const gp = goal(); return gp ? walkTo(gp[0], gp[1]) : false; },
    get walking() { return route.auto; },
    setRun(on) { runToggle = on; },
    act() { if (cam.intro === 0) simAct(g); },
    emote(type) { if (cam.intro === 0) simEmote(g, type); },
    toggleSat() { cam.sat = !cam.sat; g.ndvi = cam.sat; if (cam.sat) note(g, 'satViews'); if (cam.sat && cam.layer === 'water') note(g, 'waterLayer'); return cam.sat; },
    get sat() { return cam.sat; },
    setLayer(l) { cam.layer = l; if (l === 'water' && cam.sat) note(g, 'waterLayer'); },
    setHush(v) { hush = !!v; },
    runJob(id, opts) { if (cam.intro || !nav) return false; stopJob('replaced'); helper.job = newJob(id, opts); helper.step = null; return true; },
    stopJob() { stopJob('stopped'); },
    get job() { return helper.job ? { id: helper.job.id, steps: helper.job.steps, log: helper.job.log } : null; },
    setPrefs(p) { prefs = { ...DEFAULT_SETTINGS, ...p }; },
    snap: () => new Promise((resolve) => { snapReq = resolve; }),
    skipIntro() { if (cam.intro) cam.introT = Math.max(cam.introT, 4.6); },
    setPaused(p) { paused = p; if (p) clearInput(); },
    setLang(l) { lang = l; setNames(); life.setLang(l); },
    target: () => target(g),
    onPlot: () => plotAt(g.me.x, g.me.z) !== null,
    enterXR,
    get xr() { return xr.mode; },
    get vr() { return vr; }, // the running VR game (xr.js), for a script driving an emulator (dev)
    get cam() { return cam; }, get farmer() { return P; }, // for a script or headless browser looking at the people up close (dev, window.__fsGame)
    dispose() {
      clearTimeout(navTimer); minimap?.removeEventListener('pointerdown', mapTap);
      alive = false; renderer.xr.getSession()?.end().catch(() => {}); renderer.setAnimationLoop(null); ro.disconnect(); signTex.dispose(); world.dispose?.(); field.dispose?.(); life.dispose(); composer?.dispose(); gtao?.dispose?.(); gradPass?.dispose?.(); fpMat.dispose(); wrMat.dispose();
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', clearInput); document.removeEventListener('visibilitychange', onVisibility);
      overlay.replaceChildren();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      renderer.dispose();
    },
  };
}

// The immersive modes this browser and device can play: a phone with ARCore gives 'ar', a headset 'vr' (and often
// 'ar' as passthrough). WebXR needs a secure page (https, or localhost while developing).
export async function xrModes() {
  const x = typeof navigator !== 'undefined' ? navigator.xr : null;
  if (!x) return [];
  const ok = async (m) => { try { return await x.isSessionSupported(m); } catch { return false; } };
  const [ar, vr] = await Promise.all([ok('immersive-ar'), ok('immersive-vr')]);
  return [ar && 'ar', vr && 'vr'].filter(Boolean);
}

// Small renders of each farmer for the choosing screen, and a turning preview of the chosen one. With `world`, the
// preview stands the farmer on a display base in front of their own place (backdrop.js); without it the canvas stays
// transparent, as the portrait cards need.
export function createPreview(canvas, look, { world = null } = {}) {
  needWebGL();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight('#fff6e0', '#4a6838', 1.6));
  const key = new THREE.DirectionalLight('#fffbe8', 2.8); key.position.set(2.8, 4.5, 3.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  // a tight shadow box round the figure, with bias, so cloth shows no shadow speckle
  Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.6, bottom: -0.5, near: 1, far: 12 }); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.018; scene.add(key);
  const rim = new THREE.DirectionalLight('#c8e4ff', 1.4); rim.position.set(-3, 2.5, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight('#ffe8d0', 0.65); fill.position.set(1, 0.5, -3); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.25 })); ground.receiveShadow = true; scene.add(ground);
  // the set: soft studio shadows (a blurred shadow edge) over the farmer's own place
  const backdrop = world ? createBackdrop(scene) : null;
  if (backdrop) { key.shadow.radius = 4; key.shadow.blurSamples = 20; ground.visible = false; }
  let P = null, raf = 0, alive = true, last = performance.now(), mode = 'idle', spin = 0.35;
  const set = (lk, w) => { if (P) scene.remove(P.root); P = buildFarmer(lk); P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(P.root); if (backdrop && w !== undefined) backdrop.set(w); return P.realReady; };
  set(look, world);
  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (w && h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const loop = (now) => {
    if (!alive) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
    spin += dt * 0.5; P.root.rotation.y = Math.sin(spin) * 0.7;
    animate(P, { speed: mode === 'walk' ? 2.2 : 0, act: mode === 'cheer' ? { type: 'cheer', p: 0, dur: 9 } : null, t }, dt);
    camera.position.set(0, 1.2, 4.6); camera.lookAt(world ? -0.3 : 0, 0.95, 0);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);
  const renderOnce = () => { resize(); P.root.rotation.y = 0.35; for (let k = 0; k < 20; k++) animate(P, { speed: 0, act: null, t: 0 }, 0.05); camera.position.set(0, 1.2, 4.6); camera.lookAt(world ? -0.3 : 0, 0.95, 0); renderer.render(scene, camera); };
  return {
    set, renderOnce, mode(m) { mode = m; },
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); backdrop?.dispose(); renderer.dispose(); },
  };
}

// Still pictures of several farmers (for the cards), rendered once on one hidden canvas.
export async function portraits(looks, size = 220) {
  needWebGL();
  const cv = document.createElement('canvas'); cv.width = size; cv.height = Math.round(size * 1.15);
  cv.style.cssText = `position:fixed;left:-9999px;width:${size}px;height:${Math.round(size * 1.15)}px`; document.body.appendChild(cv);
  const pv = createPreview(cv, looks[0]);
  const out = [];
  try {
    for (const lk of looks) { await pv.set(lk); pv.renderOnce(); out.push(cv.toDataURL('image/png')); }
  } finally { pv.dispose(); cv.remove(); }
  return out;
}

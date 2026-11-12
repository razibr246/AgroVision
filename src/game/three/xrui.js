// The things VR draws for the player in মাঠের মানুষ (see xr.js): world-space panels painted on a canvas (laid out by
// ../xrlogic.js, so drawing and pointing agree), a short message card, a hover tag, simple hands for the controllers,
// the tools the farmer holds while working, the pointer's laser and dot, the teleport arc and landing ring, and the
// comfort vignette. Everything is built once when VR starts and updated in place: no allocation per frame.
import * as THREE from 'three';
import { layoutPanel } from '../xrlogic.js';

// the page's own font stack (index.css), so Bangla draws with the same faces the page loaded
export const fontStack = () => {
  try { const f = getComputedStyle(document.body).fontFamily; if (f) return f; } catch { /* no document */ }
  return '"Noto Sans Bengali Variable", "Noto Sans Bengali", "Hind Siliguri", system-ui, sans-serif';
};

const TONE_BG = { good: 'rgba(52,168,83,.22)', warn: 'rgba(245,158,11,.22)', bad: 'rgba(220,38,38,.25)', info: 'rgba(56,152,236,.18)' };
const TONE_RING = { good: '#4ade80', warn: '#fbbf24', bad: '#f87171', info: '#7cc4fa' };
const BTN = { go: ['#15803d', '#22c55e'], bad: ['#7f1d1d', '#ef4444'], good: ['#14532d', '#4ade80'], base: ['#24533a', '#3f8a5f'] };

function rr(x, X, Y, W, H, r) { x.beginPath(); x.roundRect(X, Y, W, H, r); }
function fit(x, s, w) {
  if (x.measureText(s).width <= w) return s;
  let t = s; while (t.length > 1 && x.measureText(`${t}…`).width > w) t = t.slice(0, -1);
  return `${t}…`;
}

// A flat panel in the world, w × h metres, painted on a canvas of pw × ph pixels. draw(spec) lays out and paints;
// pick(uv) gives the button under a pointer; hover(item) moves a glow onto a button without repainting.
export function createPanel(scene, { w = 1.28, pw = 1280, ph = 960, order = 20 } = {}) {
  const h = (w * ph) / pw;
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.renderOrder = order; mesh.visible = false; mesh.frustumCulled = false; scene.add(mesh);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.22, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat);
  glow.renderOrder = order + 1; glow.visible = false; glow.frustumCulled = false; mesh.add(glow);
  const font = fontStack();
  let curPx = 0, curW = '';
  const setFont = (px, wt = 500) => { if (px !== curPx || wt !== curW) { x.font = `${wt} ${px}px ${font}`; curPx = px; curW = wt; } };
  const measure = (s, px) => { setFont(px); return x.measureText(s).width; };
  const P = { mesh, glow, canvas: c, layout: null, spec: null, hoverId: null, w, h, pw, ph };
  P.draw = (spec, page = 0) => {
    P.spec = spec; curPx = 0;
    const L = layoutPanel(spec, { w: pw, h: ph, measure, page });
    P.layout = L;
    x.clearRect(0, 0, pw, ph);
    x.fillStyle = 'rgba(12,28,19,.94)'; rr(x, 4, 4, pw - 8, ph - 8, 44); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 3; x.stroke();
    x.textBaseline = 'top';
    for (const it of L.items) {
      if (it.type === 'title' || it.type === 'sub') {
        setFont(it.px, it.type === 'title' ? 700 : 500); x.fillStyle = it.type === 'title' ? '#ffd24a' : '#bfe3c8'; x.textAlign = 'left';
        it.lines.forEach((s, k) => x.fillText(s, it.x, it.y + k * it.px * (it.type === 'title' ? 1.25 : 1.38)));
      } else if (it.type === 'text') {
        if (it.tone) { x.fillStyle = TONE_BG[it.tone] ?? TONE_BG.info; rr(x, it.x, it.y, it.w, it.h, 18); x.fill(); x.fillStyle = TONE_RING[it.tone] ?? TONE_RING.info; x.fillRect(it.x, it.y + 10, 6, it.h - 20); }
        setFont(it.px, 500); x.fillStyle = '#f2f6f1'; x.textAlign = 'left';
        it.lines.forEach((s, k) => x.fillText(s, it.x + it.pad + (it.tone ? 8 : 0), it.y + it.pad + k * it.px * 1.38));
      } else if (it.type === 'button') {
        const [bg, ring] = BTN[it.tone] ?? BTN.base;
        x.globalAlpha = it.on ? 1 : 0.38;
        x.fillStyle = bg; rr(x, it.x, it.y, it.w, it.h, 22); x.fill();
        x.strokeStyle = ring; x.lineWidth = it.tone ? 4 : 2; x.stroke();
        x.textAlign = 'center'; x.fillStyle = '#ffffff';
        if (it.sub) {
          setFont(27, 650); x.fillText(fit(x, it.label, it.w - 24), it.x + it.w / 2, it.y + 14);
          setFont(21, 500); x.fillStyle = 'rgba(255,255,255,.78)'; x.fillText(fit(x, it.sub, it.w - 24), it.x + it.w / 2, it.y + 56);
        } else { setFont(29, 650); x.textBaseline = 'middle'; x.fillText(fit(x, it.label, it.w - 24), it.x + it.w / 2, it.y + it.h / 2 + 1); x.textBaseline = 'top'; }
        x.globalAlpha = 1;
      }
    }
    if (L.pages > 1) { setFont(22, 500); x.fillStyle = 'rgba(255,255,255,.6)'; x.textAlign = 'right'; x.fillText(`${L.page + 1}/${L.pages}`, pw - 40, 40); }
    tex.needsUpdate = true;
    P.hover(null);
  };
  // uv: the raycaster's texture coordinate on the plane
  P.pick = (uv) => {
    if (!P.layout || !uv) return null;
    const px = uv.x * pw, py = (1 - uv.y) * ph;
    for (const it of P.layout.items) if (it.type === 'button' && it.on && px >= it.x && px <= it.x + it.w && py >= it.y && py <= it.y + it.h) return it;
    return null;
  };
  P.hover = (it) => {
    const id = it?.id ?? null; if (id === P.hoverId) return; P.hoverId = id;
    if (!it) { glow.visible = false; return; }
    glow.visible = true;
    glow.scale.set((it.w / pw) * w, (it.h / ph) * h, 1);
    glow.position.set(((it.x + it.w / 2) / pw - 0.5) * w, (0.5 - (it.y + it.h / 2) / ph) * h, 0.002);
  };
  P.dispose = () => { scene.remove(mesh); mesh.geometry.dispose(); mat.dispose(); tex.dispose(); glow.geometry.dispose(); glowMat.dispose(); };
  return P;
}

// A one-or-two line card: what the farmer says, a toast, an alert or a new mission. draw(title, body, tone).
export function createCard(scene, { w = 0.84, pw = 1024, ph = 256, order = 18 } = {}) {
  const h = (w * ph) / pw;
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const x = c.getContext('2d'), font = fontStack();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.renderOrder = order; mesh.visible = false; mesh.frustumCulled = false; scene.add(mesh);
  const draw = (title, body, tone = 'info') => {
    x.clearRect(0, 0, pw, ph);
    x.fillStyle = 'rgba(12,28,19,.9)'; rr(x, 6, 6, pw - 12, ph - 12, 40); x.fill();
    x.strokeStyle = TONE_RING[tone] ?? TONE_RING.info; x.lineWidth = 6; x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const lines = [];
    if (title) lines.push([title, `700 48px ${font}`, '#ffd24a']);
    x.font = `500 40px ${font}`;
    let line = '';
    for (const word of String(body ?? '').split(/\s+/).filter(Boolean)) { const s = line ? `${line} ${word}` : word; if (line && x.measureText(s).width > pw - 80) { lines.push([line, `500 40px ${font}`, '#ffffff']); line = word; } else line = s; }
    if (line) lines.push([line, `500 40px ${font}`, '#ffffff']);
    const shown = lines.slice(0, title ? 4 : 4);
    shown.forEach(([s, f, col], k) => { x.font = f; x.fillStyle = col; x.fillText(fit(x, s, pw - 70), pw / 2, ph / 2 + (k - (shown.length - 1) / 2) * 52); });
    tex.needsUpdate = true;
  };
  return { mesh, draw, dispose() { scene.remove(mesh); mesh.geometry.dispose(); mat.dispose(); tex.dispose(); } };
}

// A small tag that floats over what the pointer is on ("Sow wheat", "Seed shed"). set(text, tone) repaints only
// when the text changes.
export function createTag(scene) {
  const pw = 640, ph = 120, c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const x = c.getContext('2d'), font = fontStack();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  const sprite = new THREE.Sprite(mat); sprite.renderOrder = 16; sprite.visible = false; sprite.scale.set(0.8, 0.15, 1); scene.add(sprite);
  let cur = '';
  const set = (text, tone = 'go') => {
    const key = `${tone}|${text}`; if (key === cur) return; cur = key;
    x.clearRect(0, 0, pw, ph); x.font = `650 50px ${font}`;
    const tw = Math.min(pw - 20, x.measureText(text).width + 70);
    x.fillStyle = tone === 'bad' ? 'rgba(120,20,20,.9)' : 'rgba(10,40,24,.9)'; rr(x, (pw - tw) / 2, 10, tw, ph - 20, 46); x.fill();
    x.strokeStyle = tone === 'bad' ? '#f87171' : '#ffd24a'; x.lineWidth = 4; x.stroke();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(fit(x, text, tw - 50), pw / 2, ph / 2 + 2);
    tex.needsUpdate = true;
  };
  return { sprite, set, dispose() { scene.remove(sprite); mat.dispose(); tex.dispose(); } };
}

// Simple hands for the controllers: a palm, four fingers closed round the grip and a thumb on top, in the farmer's
// own skin colour. Built from boxes so nothing is fetched (three's controller models load from a CDN).
export function makeHand(skin, left) {
  const m = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 });
  const root = new THREE.Group();
  const s = left ? -1 : 1;
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.03, 0.085), m); palm.position.set(0.012 * s, -0.008, 0.035); root.add(palm);
  for (let k = 0; k < 4; k++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.042, 0.022), m);
    f.position.set((0.03 - k * 0.019) * s * -1 + 0.012 * s, -0.035, -0.012 - Math.abs(k - 1.5) * 0.003); f.rotation.x = 0.3; root.add(f);
  }
  const th = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.05), m); th.position.set(-0.03 * s, 0.006, 0.0); th.rotation.y = 0.35 * s; root.add(th);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.04, 10), new THREE.MeshStandardMaterial({ color: '#d8d2c2', roughness: 0.9 }));
  cuff.rotation.x = Math.PI / 2; cuff.position.set(0.012 * s, -0.004, 0.1); root.add(cuff);
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return root;
}

// The tools the farmer holds while working, each in the hand's frame (forward is -z).
export function makeTools() {
  const M = (c, r = 0.6, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
  const tools = {};
  { // the watering can
    const t = new THREE.Group(), tin = M('#7f9aa8', 0.45, 0.5);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.16, 14), tin); body.position.set(0, -0.06, -0.05); t.add(body);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.22, 8), tin); spout.position.set(0, -0.02, -0.18); spout.rotation.x = -1.05; t.add(spout);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.012, 0.03, 10), tin); rose.position.set(0, 0.04, -0.27); rose.rotation.x = -1.05; t.add(rose);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI), tin); handle.position.set(0, 0.02, -0.03); handle.rotation.y = Math.PI / 2; t.add(handle);
    tools.water = t;
  }
  { // the sickle (kaste)
    const t = new THREE.Group();
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.13, 8), M('#6b4a2b', 0.8)); grip.rotation.x = Math.PI / 2; grip.position.z = 0.0; t.add(grip);
    const blade = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 4, 16, Math.PI * 1.1), M('#c9ccd0', 0.3, 0.8)); blade.position.set(0.0, 0.0, -0.17); blade.rotation.set(Math.PI / 2, 0, 0.3); t.add(blade);
    tools.harvest = t;
  }
  { // the knapsack sprayer's lance
    const t = new THREE.Group();
    const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.55, 6), M('#c9ccd0', 0.4, 0.6)); lance.rotation.x = Math.PI / 2; lance.position.z = -0.25; t.add(lance);
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 8), M('#e0b030')); nozzle.rotation.x = -Math.PI / 2; nozzle.position.z = -0.54; t.add(nozzle);
    const valve = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.06), M('#2f6f3a')); valve.position.set(0, -0.02, 0.0); t.add(valve);
    tools.spray = t;
  }
  { // a cloth bag of seed
    const t = new THREE.Group();
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M('#cdb88a', 0.95)); bag.scale.set(1, 1.2, 1); bag.position.set(0, -0.07, -0.03); t.add(bag);
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.03, 8), M('#8a6a3a')); tie.position.set(0, 0.0, -0.03); t.add(tie);
    tools.plant = t;
  }
  { // the coins at the market
    const t = new THREE.Group(), gold = M('#e8b923', 0.3, 0.8);
    for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.005, 12), gold); c.position.set(0, -0.03 + k * 0.006, -0.05); t.add(c); }
    tools.sell = t;
  }
  tools.clear = tools.harvest; tools.pump = tools.water;
  for (const t of Object.values(tools)) { t.visible = false; t.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
  return tools;
}

// The pointer: a thin beam from the hand (a mesh, as a 1-pixel line is hard to see in a headset) and a dot where it
// lands. Its length is scale.z.
export function makeLaser() {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false, fog: false, toneMapped: false });
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.0035, 1).translate(0, 0, -0.5), mat); line.renderOrder = 15; line.frustumCulled = false;
  const dotMat = new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, depthWrite: false, fog: false, toneMapped: false, transparent: true });
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), dotMat); dot.renderOrder = 17; dot.frustumCulled = false;
  return { line, dot, mat, dotMat };
}

// The teleport arc as a string of beads (up to n points, every other one drawn) and the ring where it lands.
// set(count) places the beads from `pos`, the array arcPoints() fills.
export function makeArc(n = 90) {
  const pos = new Float32Array(n * 3);
  const mat = new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.95, depthWrite: false, fog: false, toneMapped: false });
  const line = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), mat, Math.ceil(n / 2));
  line.count = 0; line.frustumCulled = false; line.renderOrder = 14; line.visible = false;
  const dummy = new THREE.Object3D();
  const set = (count) => {
    let k = 0;
    for (let i = 0; i < count; i += 2) { dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); dummy.scale.setScalar(1 - (i / n) * 0.5); dummy.updateMatrix(); line.setMatrixAt(k++, dummy.matrix); }
    line.count = k; line.instanceMatrix.needsUpdate = true;
  };
  const ringMat = new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.9, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide });
  const ring = new THREE.Group();
  const r1 = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.4, 32).rotateX(-Math.PI / 2), ringMat); ring.add(r1);
  const r2 = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16).rotateX(-Math.PI / 2), ringMat); ring.add(r2);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 3).rotateX(-Math.PI / 2), ringMat); arrow.position.set(0, 0.02, -0.5); ring.add(arrow);
  ring.visible = false; ring.renderOrder = 14;
  return { line, ring, pos, set, mat, ringMat, n };
}

// The comfort vignette and the teleport blink: a quad in front of the eyes, dark at the edges by `strength` and
// all over by `fade`.
export function makeVignette() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { strength: { value: 0 }, fade: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float strength, fade; varying vec2 vUv;
      void main(){ float r = length(vUv - 0.5) * 8.9; float inner = mix(1.05, 0.38, strength);
        float a = max(smoothstep(inner, inner + 0.32, r) * step(0.001, strength), fade);
        gl_FragColor = vec4(0.0, 0.0, 0.0, a); }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat);
  mesh.position.z = -0.3; mesh.renderOrder = 999; mesh.frustumCulled = false; mesh.visible = false;
  return { mesh, mat };
}

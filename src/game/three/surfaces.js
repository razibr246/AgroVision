// Real surfaces for the village: brick with mortar, mud plaster with cracks, lime-wash, corrugated tin with rust,
// thatch, split-bamboo matting, weathered planks, concrete and straw, each drawn once on a small canvas (with a
// matching height map for bump) and repeated at its true size in metres, so a brick is a brick wherever it is used.
// Boxes and roofs built here carry world-scale UVs and a vertex tint that darkens the damp, splashed foot of every
// wall; world.js bake() keeps both and merges each surface into one mesh. The ground's detail and path mask and the
// water material live here too, so world.js only wires them in. `light` (phones) halves every texture and skips the
// bump maps and the costlier shader steps.
import * as THREE from 'three';

let LIGHT = false;
export function setSurfaceQuality({ light = false } = {}) { LIGHT = !!light; }

const HAS_DOM = typeof document !== 'undefined';
const rng = (seed) => { let s = (seed >>> 0) % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hsl = (h, s, l) => `hsl(${h},${clamp(s, 0, 100)}%,${clamp(l, 0, 100)}%)`;
const grey = (v) => { const k = clamp(Math.round(v), 0, 255); return `rgb(${k},${k},${k})`; };

// draw `fn(x, y)` at x and its wrapped copies so a texture tiles without seams
function wrap(S, x, y, r, fn) {
  for (const dx of [0, -S, S]) for (const dy of [0, -S, S]) {
    if (x + dx < -r || x + dx > S + r || y + dy < -r || y + dy > S + r) continue;
    fn(x + dx, y + dy);
  }
}

// A colour canvas and its height canvas drawn together (the same random layout in both); cached by key.
const texCache = new Map();
function surfaceTex(key, size, draw) {
  const S = LIGHT ? size / 2 : size, k = `${key}|${S}|${LIGHT ? 1 : 0}`;
  if (texCache.has(k)) return texCache.get(k);
  let out;
  if (!HAS_DOM) out = { map: new THREE.Texture(), bump: null };
  else {
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const hv = document.createElement('canvas'); hv.width = hv.height = S;
    const c = cv.getContext('2d'), h = hv.getContext('2d');
    draw(c, h, S, rng(key.length * 7919 + key.charCodeAt(0) * 131));
    const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = LIGHT ? 2 : 8;
    let bump = null;
    if (!LIGHT) { bump = new THREE.CanvasTexture(hv); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.anisotropy = 4; }
    out = { map, bump };
  }
  texCache.set(k, out); return out;
}
// speckle a canvas with soft noise (colour and height alike)
function speckle(c, S, rnd, n, r0, r1, col) {
  for (let k = 0; k < n; k++) { c.fillStyle = col(rnd); const x = rnd() * S, y = rnd() * S, r = r0 + rnd() * (r1 - r0); c.fillRect(x, y, r, r); }
}
function blotches(c, S, rnd, n, rMin, rMax, col) {
  for (let k = 0; k < n; k++) {
    const x = rnd() * S, y = rnd() * S, r = rMin + rnd() * (rMax - rMin), fill = col(rnd);
    wrap(S, x, y, r, (X, Y) => { const g = c.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, fill); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(X - r, Y - r, r * 2, r * 2); });
  }
}
// a hairline crack: a wandering, branching line
function crack(c, S, rnd, x, y, len, w, col, depth = 0) {
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round';
  let a = rnd() * Math.PI * 2;
  for (let k = 0; k < len; k++) {
    const nx = x + Math.cos(a) * 3, ny = y + Math.sin(a) * 3;
    wrap(S, x, y, 4, (X, Y) => { c.beginPath(); c.moveTo(X, Y); c.lineTo(X + nx - x, Y + ny - y); c.stroke(); });
    x = nx; y = ny; a += (rnd() - 0.5) * 0.9;
    if (depth < 2 && rnd() < 0.04) crack(c, S, rnd, x, y, len * 0.4, w * 0.7, col, depth + 1);
  }
}

// ---- the surfaces: [tile size u, v in metres, texture] ----
const DRAW = {
  // fired brick in stretcher bond: 4 bricks of 250 mm across a metre, 12 courses of 83 mm, recessed lime mortar
  brick: [1, 1, 512, (c, h, S, rnd) => {
    c.fillStyle = '#b3a796'; c.fillRect(0, 0, S, S); h.fillStyle = grey(70); h.fillRect(0, 0, S, S);
    speckle(c, S, rnd, S * 30, 1, 2, (r) => `rgba(${90 + r() * 80},${85 + r() * 70},${70 + r() * 60},.35)`);
    const rows = 12, cols = 4, bh = S / rows, bw = S / cols, m = Math.max(1.5, S / 110);
    for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh, burnt = rnd() < 0.1, pale = rnd() < 0.08;
      const hue = 10 + rnd() * 10, sat = 48 + rnd() * 18, lit = burnt ? 22 + rnd() * 8 : pale ? 52 + rnd() * 8 : 34 + rnd() * 12;
      const jx = (rnd() - 0.5) * m * 0.6, jy = (rnd() - 0.5) * m * 0.5;
      wrap(S, x, y, bw, (X, Y) => {
        c.fillStyle = hsl(hue, sat, lit); c.fillRect(X + m / 2 + jx, Y + m / 2 + jy, bw - m, bh - m);
        const g = c.createLinearGradient(0, Y, 0, Y + bh); g.addColorStop(0, 'rgba(255,230,200,.10)'); g.addColorStop(1, 'rgba(40,10,0,.22)');
        c.fillStyle = g; c.fillRect(X + m / 2 + jx, Y + m / 2 + jy, bw - m, bh - m);
        h.fillStyle = grey(190 + rnd() * 40); h.fillRect(X + m / 2 + jx, Y + m / 2 + jy, bw - m, bh - m);
      });
      // pits, chips and the soot of the kiln on each brick
      for (let k = 0; k < 18; k++) { const px = x + m + rnd() * (bw - 2 * m), py = y + m + rnd() * (bh - 2 * m), r = 0.6 + rnd() * 1.8; wrap(S, px, py, 3, (X, Y) => { c.fillStyle = rnd() < 0.5 ? `rgba(40,15,5,${0.2 + rnd() * 0.3})` : `rgba(255,210,170,${0.12 + rnd() * 0.15})`; c.fillRect(X, Y, r, r); h.fillStyle = grey(140); h.fillRect(X, Y, r, r); }); }
      if (rnd() < 0.25) { const cx = x + (rnd() < 0.5 ? m : bw - m * 3), cy = y + m; wrap(S, cx, cy, 6, (X, Y) => { c.fillStyle = '#9e9282'; c.fillRect(X, Y, m * 2.5, m * 2); h.fillStyle = grey(95); h.fillRect(X, Y, m * 2.5, m * 2); }); }
    }
    blotches(c, S, rnd, 10, S * 0.08, S * 0.22, (r) => `rgba(${r() < 0.5 ? '30,20,10' : '200,190,170'},${0.06 + r() * 0.08})`);
  }],
  // hand-laid mud plaster (lepa): trowel sweeps, hairline shrinkage cracks, chopped straw; drawn near white, tinted
  mud: [2, 2, 512, (c, h, S, rnd) => {
    c.fillStyle = '#ece4d6'; c.fillRect(0, 0, S, S); h.fillStyle = grey(150); h.fillRect(0, 0, S, S);
    blotches(c, S, rnd, 40, S * 0.05, S * 0.18, (r) => r() < 0.5 ? `rgba(120,95,65,${0.08 + r() * 0.1})` : `rgba(255,250,240,${0.1 + r() * 0.12})`);
    // trowel arcs
    for (let k = 0; k < 90; k++) {
      const x = rnd() * S, y = rnd() * S, r = S * (0.03 + rnd() * 0.06), a = rnd() * Math.PI * 2;
      wrap(S, x, y, r, (X, Y) => { c.strokeStyle = `rgba(${rnd() < 0.5 ? '255,250,240' : '110,85,55'},.10)`; c.lineWidth = 2 + rnd() * 4; c.beginPath(); c.arc(X, Y, r, a, a + 1.4); c.stroke(); h.strokeStyle = rnd() < 0.5 ? 'rgba(200,200,200,.25)' : 'rgba(110,110,110,.25)'; h.lineWidth = 3; h.beginPath(); h.arc(X, Y, r, a, a + 1.4); h.stroke(); });
    }
    speckle(c, S, rnd, S * 12, 1, 2, (r) => `rgba(${70 + r() * 60},${55 + r() * 45},${35 + r() * 30},.4)`);
    // chopped straw in the mud
    for (let k = 0; k < S / 3; k++) {
      const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI, l = 3 + rnd() * 7;
      wrap(S, x, y, l, (X, Y) => { c.strokeStyle = `rgba(${200 + rnd() * 40},${170 + rnd() * 30},${100 + rnd() * 30},.55)`; c.lineWidth = 1; c.beginPath(); c.moveTo(X, Y); c.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); c.stroke(); });
    }
    for (let k = 0; k < 9; k++) { const x = rnd() * S, y = rnd() * S; crack(c, S, rnd, x, y, 20 + rnd() * 40, 1.1, 'rgba(60,40,22,.55)'); crack(h, S, rng(k * 31 + 7), x, y, 20 + rnd() * 40, 1.5, grey(40)); }
  }],
  // lime-wash over plaster: patchy brushing, rain streaks from the top, a few flakes off showing the grey under it
  lime: [2, 2, 512, (c, h, S, rnd) => {
    c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, S, S); h.fillStyle = grey(170); h.fillRect(0, 0, S, S);
    for (let k = 0; k < 160; k++) { const y = rnd() * S, x = rnd() * S, l = S * (0.1 + rnd() * 0.3); wrap(S, x, y, l, (X, Y) => { c.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '190,180,160'},.07)`; c.fillRect(X, Y, l, 4 + rnd() * 10); }); }
    blotches(c, S, rnd, 26, S * 0.05, S * 0.16, (r) => `rgba(150,140,120,${0.05 + r() * 0.08})`);
    for (let k = 0; k < 40; k++) { const x = rnd() * S, l = S * (0.1 + rnd() * 0.5), w = 1 + rnd() * 4; const g = c.createLinearGradient(0, 0, 0, l); g.addColorStop(0, 'rgba(110,100,85,.18)'); g.addColorStop(1, 'rgba(110,100,85,0)'); c.fillStyle = g; c.fillRect(x, 0, w, l); }
    for (let k = 0; k < 5; k++) {
      const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 6;
      wrap(S, x, y, r * 2, (X, Y) => { c.fillStyle = 'rgba(200,192,178,.7)'; c.beginPath(); c.ellipse(X, Y, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, 7); c.fill(); h.fillStyle = grey(110); h.beginPath(); h.ellipse(X, Y, r, r * 0.7, 0, 0, 7); h.fill(); });
    }
    for (let k = 0; k < 5; k++) { const x = rnd() * S, y = rnd() * S; crack(c, S, rnd, x, y, 14 + rnd() * 20, 0.8, 'rgba(90,80,65,.4)'); }
  }],
  // galvanised corrugated sheet: 13 ridges a metre, a lapped seam with nail heads, rust running down from the nails
  tin: [2, 2, 512, (c, h, S, rnd) => {
    const n = 26, p = S / n;
    for (let x = 0; x < S; x++) {
      const s = Math.sin((x / p) * Math.PI * 2), lit = 150 + s * 42;
      c.fillStyle = `rgb(${lit * 0.95},${lit},${lit * 1.03})`; c.fillRect(x, 0, 1, S);
      h.fillStyle = grey(128 + s * 120); h.fillRect(x, 0, 1, S);
    }
    blotches(c, S, rnd, 60, S * 0.02, S * 0.08, (r) => r() < 0.6 ? `rgba(70,75,80,${0.06 + r() * 0.1})` : `rgba(235,240,245,${0.06 + r() * 0.08})`);
    speckle(c, S, rnd, S * 20, 1, 2, (r) => `rgba(${r() < 0.5 ? '255,255,255' : '40,45,50'},.12)`);
    // the lap where one sheet overlaps the next, and its nails on every second ridge
    c.fillStyle = 'rgba(30,30,32,.45)'; c.fillRect(0, S * 0.02, S, 2); c.fillRect(0, S * 0.52, S, 2);
    for (let k = 0; k < n * 2; k += 3) {
      const x = ((k % n) + 0.25) * p + (k >= n ? p * 1.5 : 0), y = S * (k >= n ? 0.55 : 0.05);
      c.fillStyle = '#5a5550'; c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill();
      if (rnd() < 0.4) continue; const l = S * (0.05 + rnd() * 0.3), g = c.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, 'rgba(140,62,22,.55)'); g.addColorStop(0.3, 'rgba(150,75,30,.22)'); g.addColorStop(1, 'rgba(150,80,35,0)');
      c.fillStyle = g; c.fillRect(x - 1.5, y, 2 + rnd() * 3, l);
    }
    // rust where the water lies: low patches, and a few streaks that wander
    for (let k = 0; k < 7; k++) { const x = rnd() * S, y = rnd() * S, r = S * (0.04 + rnd() * 0.1); wrap(S, x, y, r, (X, Y) => { const g = c.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, `rgba(${120 + rnd() * 40},${55 + rnd() * 20},25,.32)`); g.addColorStop(1, 'rgba(130,60,25,0)'); c.fillStyle = g; c.fillRect(X - r, Y - r, r * 2, r * 2); }); }
    for (let k = 0; k < 10; k++) { const x = rnd() * S, l = S * (0.2 + rnd() * 0.6), g = c.createLinearGradient(0, 0, 0, l); g.addColorStop(0, 'rgba(130,60,25,0)'); g.addColorStop(0.5, 'rgba(130,60,25,.3)'); g.addColorStop(1, 'rgba(130,60,25,0)'); c.fillStyle = g; c.fillRect(x, rnd() * S * 0.5, 2 + rnd() * 3, l); }
  }],
  // straw thatch laid in courses: strands down the slope, each course's butt ends in shadow under the next
  thatch: [1.2, 1.2, 512, (c, h, S, rnd) => {
    c.fillStyle = '#6b5a3a'; c.fillRect(0, 0, S, S); h.fillStyle = grey(60); h.fillRect(0, 0, S, S);
    const courses = 4, ch = S / courses;
    for (let j = 0; j < courses; j++) {
      const y0 = j * ch;
      for (let k = 0; k < S * 2.2; k++) {
        const x = rnd() * S, y = y0 + rnd() * ch * 0.9, l = ch * (0.5 + rnd() * 0.7), a = Math.PI / 2 + (rnd() - 0.5) * 0.22;
        const age = rnd(), r = 150 + age * 70, g = 125 + age * 60, b = 70 + age * 40, grey0 = rnd() < 0.3;
        const col = grey0 ? `rgba(${r * 0.78},${g * 0.8},${b * 0.95},.9)` : `rgba(${r},${g},${b},.85)`;
        wrap(S, x, y, l, (X, Y) => {
          c.strokeStyle = col; c.lineWidth = 0.8 + rnd() * 1.4; c.beginPath(); c.moveTo(X, Y); c.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); c.stroke();
          h.strokeStyle = grey(120 + rnd() * 120); h.lineWidth = 1.2; h.beginPath(); h.moveTo(X, Y); h.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); h.stroke();
        });
      }
      // the shadow line under the next course
      const g = c.createLinearGradient(0, y0 + ch * 0.82, 0, y0 + ch); g.addColorStop(0, 'rgba(30,22,10,0)'); g.addColorStop(1, 'rgba(30,22,10,.55)'); c.fillStyle = g; c.fillRect(0, y0 + ch * 0.82, S, ch * 0.18);
    }
    blotches(c, S, rnd, 16, S * 0.06, S * 0.18, (r) => r() < 0.6 ? `rgba(60,55,40,${0.12 + r() * 0.15})` : `rgba(70,80,40,${0.08 + r() * 0.1})`); // weathering, a little moss
  }],
  // the cut straw ends along a thatch eave, ragged at the bottom (alpha)
  thatchEdge: [1, 0.3, 256, (c, h, S, rnd) => {
    c.clearRect(0, 0, S, S);
    for (let k = 0; k < S * 6; k++) {
      const x = rnd() * S, l = S * (0.55 + rnd() * 0.45), age = rnd();
      c.strokeStyle = `rgba(${140 + age * 70},${115 + age * 60},${65 + age * 40},1)`; c.lineWidth = 1 + rnd() * 1.5;
      const dx = (rnd() - 0.5) * S * 0.08;
      wrap(S, x, 0, S * 0.1, (X) => { c.beginPath(); c.moveTo(X, 0); c.lineTo(X + dx, l); c.stroke(); });
    }
    const g = c.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(25,18,8,.35)'); g.addColorStop(0.4, 'rgba(25,18,8,0)'); c.fillStyle = g; c.globalCompositeOperation = 'source-atop'; c.fillRect(0, 0, S, S); c.globalCompositeOperation = 'source-over';
  }],
  // split bamboo woven in a two-over-two twill (bera, chatai)
  bamboo: [0.6, 0.6, 256, (c, h, S, rnd) => {
    const n = 16, w = S / n;
    c.fillStyle = '#5a4a30'; c.fillRect(0, 0, S, S); h.fillStyle = grey(40); h.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const over = ((i + j) >> 1) % 2 === 0, x = i * w, y = j * w, t = rnd();
      const base = over ? [214, 186, 128] : [190, 160, 104], f = 0.85 + t * 0.25;
      c.fillStyle = `rgb(${base[0] * f},${base[1] * f},${base[2] * f})`; c.fillRect(x + 0.6, y + 0.6, w - 1.2, w - 1.2);
      const g = over ? c.createLinearGradient(x, 0, x + w, 0) : c.createLinearGradient(0, y, 0, y + w);
      g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(0.5, 'rgba(255,240,200,.12)'); g.addColorStop(1, 'rgba(0,0,0,.3)'); c.fillStyle = g; c.fillRect(x + 0.6, y + 0.6, w - 1.2, w - 1.2);
      c.strokeStyle = 'rgba(90,70,40,.35)'; c.lineWidth = 0.6; c.beginPath();
      if (over) { c.moveTo(x + w * 0.5, y); c.lineTo(x + w * 0.5, y + w); } else { c.moveTo(x, y + w * 0.5); c.lineTo(x + w, y + w * 0.5); } c.stroke();
      h.fillStyle = grey(over ? 220 : 150); h.fillRect(x + 1, y + 1, w - 2, w - 2);
    }
    blotches(c, S, rnd, 10, S * 0.08, S * 0.2, (r) => `rgba(60,50,30,${0.08 + r() * 0.12})`);
  }],
  // weathered planks, 140 mm wide, with grain, knots and dark gaps; drawn light so paint colours tint it
  wood: [1, 1, 512, (c, h, S, rnd) => {
    const n = 7, pw = S / n;
    for (let i = 0; i < n; i++) {
      const x = i * pw, f = 0.82 + rnd() * 0.22;
      c.fillStyle = `rgb(${222 * f},${214 * f},${200 * f})`; c.fillRect(x, 0, pw, S); h.fillStyle = grey(180); h.fillRect(x, 0, pw, S);
      for (let k = 0; k < 40; k++) {
        const gx = x + rnd() * pw, amp = 1 + rnd() * 3, ph = rnd() * 6, fr = 0.01 + rnd() * 0.02;
        c.strokeStyle = `rgba(${rnd() < 0.5 ? '90,75,55' : '255,250,240'},${0.12 + rnd() * 0.18})`; c.lineWidth = 0.6 + rnd() * 1.2;
        c.beginPath(); for (let y = 0; y <= S; y += 8) { const X = gx + Math.sin(y * fr + ph) * amp; y ? c.lineTo(X, y) : c.moveTo(X, y); } c.stroke();
      }
      if (rnd() < 0.6) { const ky = rnd() * S, kx = x + pw * (0.3 + rnd() * 0.4), r = 2 + rnd() * 4; c.fillStyle = 'rgba(70,50,30,.6)'; c.beginPath(); c.ellipse(kx, ky, r, r * 1.6, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(70,50,30,.25)'; c.beginPath(); c.ellipse(kx, ky, r * 2, r * 3.4, 0, 0, 7); c.stroke(); }
      c.fillStyle = 'rgba(25,18,12,.85)'; c.fillRect(x, 0, 2, S); h.fillStyle = grey(20); h.fillRect(x, 0, 2.5, S);
    }
    blotches(c, S, rnd, 14, S * 0.06, S * 0.2, (r) => `rgba(60,55,50,${0.06 + r() * 0.1})`);
  }],
  // cement plaster and poured concrete: mottled grey, pits, a few hairline cracks and water stains
  concrete: [2, 2, 512, (c, h, S, rnd) => {
    c.fillStyle = '#d6d3cc'; c.fillRect(0, 0, S, S); h.fillStyle = grey(160); h.fillRect(0, 0, S, S);
    blotches(c, S, rnd, 50, S * 0.04, S * 0.16, (r) => r() < 0.5 ? `rgba(110,105,95,${0.06 + r() * 0.1})` : `rgba(250,248,240,${0.06 + r() * 0.08})`);
    speckle(c, S, rnd, S * 30, 1, 2, (r) => `rgba(${r() < 0.5 ? '60,58,55' : '255,255,250'},.18)`);
    speckle(h, S, rnd, S * 4, 1, 2, () => grey(120));
    for (let k = 0; k < 6; k++) { const x = rnd() * S, y = rnd() * S; crack(c, S, rnd, x, y, 16 + rnd() * 30, 0.9, 'rgba(70,65,60,.45)'); }
    for (let k = 0; k < 14; k++) { const x = rnd() * S, l = S * (0.1 + rnd() * 0.3), g = c.createLinearGradient(0, 0, 0, l); g.addColorStop(0, 'rgba(90,85,70,.15)'); g.addColorStop(1, 'rgba(90,85,70,0)'); c.fillStyle = g; c.fillRect(x, rnd() * S, 3 + rnd() * 8, l); }
  }],
  // loose straw on a haystack: strands every way, sun-bleached outside
  straw: [1, 1, 256, (c, h, S, rnd) => {
    c.fillStyle = '#8a7240'; c.fillRect(0, 0, S, S); h.fillStyle = grey(70); h.fillRect(0, 0, S, S);
    for (let k = 0; k < S * 9; k++) {
      const x = rnd() * S, y = rnd() * S, a = Math.PI / 2 + (rnd() - 0.5) * 1.4, l = 6 + rnd() * 18, t = rnd();
      wrap(S, x, y, l, (X, Y) => { c.strokeStyle = `rgba(${170 + t * 70},${140 + t * 60},${70 + t * 40},.9)`; c.lineWidth = 0.7 + rnd(); c.beginPath(); c.moveTo(X, Y); c.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); c.stroke(); h.strokeStyle = grey(120 + t * 130); h.beginPath(); h.moveTo(X, Y); h.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); h.stroke(); });
    }
  }],
  // painted lap siding (a Nevada ranch house): 200 mm boards, each lapped over the one below with a shadow line;
  // drawn near white so the paint colour tints it, with a little weathering
  siding: [1, 1, 256, (c, h, S, rnd) => {
    const n = 5, bh = S / n;
    for (let j = 0; j < n; j++) {
      const y = j * bh, f = 0.93 + rnd() * 0.07;
      const g = c.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, grey(225 * f)); g.addColorStop(0.85, grey(245 * f)); g.addColorStop(1, grey(250 * f));
      c.fillStyle = g; c.fillRect(0, y, S, bh);
      c.fillStyle = 'rgba(40,35,30,.55)'; c.fillRect(0, y, S, 2.5); c.fillStyle = 'rgba(40,35,30,.18)'; c.fillRect(0, y + 2.5, S, 3);
      const hg = h.createLinearGradient(0, y, 0, y + bh); hg.addColorStop(0, grey(60)); hg.addColorStop(1, grey(230)); h.fillStyle = hg; h.fillRect(0, y, S, bh);
      for (let k = 0; k < 6; k++) { c.strokeStyle = `rgba(120,110,95,${0.05 + rnd() * 0.08})`; c.lineWidth = 1; const yy = y + 4 + rnd() * (bh - 6); c.beginPath(); c.moveTo(0, yy); c.lineTo(S, yy + (rnd() - 0.5) * 2); c.stroke(); }
    }
    blotches(c, S, rnd, 8, S * 0.06, S * 0.18, (r) => `rgba(110,100,85,${0.05 + r() * 0.06})`);
  }],
  // clay roof tiles (Spanish and Brazilian roofs): curved barrel courses
  tile: [1, 1, 256, (c, h, S, rnd) => {
    const n = 5, w = S / n, rows = 6, rh = S / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
      const x = i * w + (j % 2 ? w / 2 : 0), y = j * rh, l = 38 + rnd() * 10;
      wrap(S, x, y, w, (X, Y) => {
        const g = c.createLinearGradient(X, 0, X + w, 0); g.addColorStop(0, hsl(16, 45, l - 16)); g.addColorStop(0.5, hsl(18, 52, l + 6)); g.addColorStop(1, hsl(16, 45, l - 18));
        c.fillStyle = g; c.fillRect(X, Y, w, rh + 2);
        const hg = h.createLinearGradient(X, 0, X + w, 0); hg.addColorStop(0, grey(60)); hg.addColorStop(0.5, grey(230)); hg.addColorStop(1, grey(60)); h.fillStyle = hg; h.fillRect(X, Y, w, rh + 2);
        c.fillStyle = 'rgba(30,15,8,.4)'; c.fillRect(X, Y + rh - 3, w, 3);
      });
    }
    blotches(c, S, rnd, 12, S * 0.05, S * 0.15, (r) => `rgba(50,45,35,${0.1 + r() * 0.15})`);
  }],
};

// ---- materials ----
const ROUGH = { siding: 0.8, brick: 0.92, mud: 0.97, lime: 0.9, tin: 0.48, thatch: 1, thatchEdge: 1, bamboo: 0.85, wood: 0.82, concrete: 0.93, straw: 1, tile: 0.75 };
const BUMP = { siding: 1.2, brick: 1.6, mud: 0.9, lime: 0.6, tin: 2.6, thatch: 2.2, bamboo: 1.2, wood: 0.9, concrete: 0.7, straw: 2, tile: 2 };
const mats = new Map();
export function surface(name, tint = '#ffffff', o = {}) {
  const k = `${name}|${tint}|${o.side ?? ''}|${LIGHT ? 1 : 0}`;
  if (mats.has(k)) return mats.get(k);
  const [, , size, draw] = DRAW[name];
  const { map, bump } = surfaceTex(name, size, draw);
  const m = new THREE.MeshStandardMaterial({
    color: tint, map, vertexColors: true, roughness: ROUGH[name] ?? 0.9, metalness: name === 'tin' ? 0.35 : 0,
    side: o.side ?? (name === 'thatchEdge' ? THREE.DoubleSide : THREE.FrontSide),
  });
  if (bump && BUMP[name]) { m.bumpMap = bump; m.bumpScale = BUMP[name]; }
  if (name === 'thatchEdge') { m.alphaTest = 0.5; m.transparent = false; }
  m.userData.surface = name;
  mats.set(k, m); return m;
}
export const tileOf = (name) => DRAW[name] ?? [1, 1];

// ---- geometry: world-scale UVs and the damp foot ----
// The vertex tint: walls darken and warm towards the ground (splash, damp, dirt), and a little under the eaves.
const FOOT = new THREE.Color('#8a7a64');
function tint(geo, at, { foot = true, top = null } = {}) {
  const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3), white = new THREE.Color(1, 1, 1), t = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const y = p.getY(i) + at[1];
    t.copy(white);
    if (foot) t.lerp(FOOT, 0.75 * Math.exp(-Math.max(0, y) / 0.28));
    if (top != null) t.multiplyScalar(1 - 0.18 * Math.exp(-Math.max(0, top - y) / 0.35));
    col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
// A box whose faces repeat the surface at its real size; `at` is the box's position in its object, so neighbouring
// boxes line up and the foot tint knows where the ground is. Tall sides get extra rows so the foot can darken.
export function boxGeo(w, h, d, name, at = [0, 0, 0], o = {}) {
  const [tu, tv] = tileOf(name);
  const rows = h > 0.6 && (at[1] - h / 2) < 0.8 ? Math.min(8, Math.ceil(h / 0.3)) : 1;
  const geo = new THREE.BoxGeometry(w, h, d, 1, rows, 1);
  const p = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + at[0], y = p.getY(i) + at[1], z = p.getZ(i) + at[2];
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i));
    if (ax > 0.5) uv.setXY(i, (nrm.getX(i) > 0 ? -z : z) / tu, y / tv);
    else if (ay > 0.5) uv.setXY(i, x / tu, z / tv);
    else uv.setXY(i, (nrm.getZ(i) > 0 ? x : -x) / tu, y / tv);
  }
  return tint(geo, at, { foot: o.foot !== false, top: o.top ?? null });
}
// any geometry with its UVs scaled to metres (cylinders and domes: circumference and height)
export function scaleUV(geo, su, sv, name, at = [0, 0, 0], o = {}) {
  const [tu, tv] = tileOf(name), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su / tu, uv.getY(i) * sv / tv);
  return tint(geo, at, { foot: o.foot !== false });
}
// A gable roof along x with real thickness: the two slopes (UVs down the slope from the ridge, so thatch strands and
// tin ridges run the way water does), their undersides, and the eave and verge edges. len and wid include the
// overhang; the eaves sit at y = 0 and the ridge at y = rise.
export function roofGeo(len, wid, rise, thick, name) {
  const [tu, tv] = tileOf(name), hw = wid / 2, hl = len / 2;
  const slope = Math.hypot(hw, rise);
  const P = [], U = [];
  const quad = (a, b, c, d, ua, ub, uc, ud) => { P.push(...a, ...b, ...c, ...a, ...c, ...d); U.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud); };
  for (const s of [1, -1]) {
    const r = [0, rise, 0], e = [0, 0, s * hw];
    const A = [-hl, r[1], 0], B = [hl, r[1], 0], Cc = [hl, 0, e[2]], D = [-hl, 0, e[2]];
    const flip = s > 0;
    // the top surface: v runs from the ridge (0) down to the eave
    const uA = [-hl / tu * s, 0], uB = [hl / tu * s, 0], uC = [hl / tu * s, -slope / tv], uD = [-hl / tu * s, -slope / tv];
    if (flip) quad(A, D, Cc, B, uA, uD, uC, uB); else quad(A, B, Cc, D, uA, uB, uC, uD);
    // the underside, a thickness below
    const dn = (q) => [q[0], q[1] - thick, q[2]];
    if (flip) quad(dn(A), dn(B), dn(Cc), dn(D), uA, uB, uC, uD); else quad(dn(A), dn(D), dn(Cc), dn(B), uA, uD, uC, uB);
    // the eave edge
    const t0 = [0, 0], t1 = [len / tu, 0], t2 = [len / tu, thick / tv], t3 = [0, thick / tv];
    if (flip) quad(D, dn(D), dn(Cc), Cc, t3, t0, t1, t2); else quad(D, Cc, dn(Cc), dn(D), t3, t2, t1, t0);
    // the verge edges at both ends
    for (const x of [-hl, hl]) {
      const a = [x, rise, 0], b = [x, 0, e[2]];
      const inward = (x > 0) === flip;
      const ua = [0, 0], ub = [slope / tu, 0], uc = [slope / tu, thick / tv], ud = [0, thick / tv];
      if (inward) quad(a, b, dn(b), dn(a), ua, ub, uc, ud); else quad(a, dn(a), dn(b), b, ua, ud, uc, ub);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  geo.computeVertexNormals();
  return tint(geo, [0, 10, 0], { foot: false });
}
// the ragged straw ends hanging under a thatch eave: a strip along each eave, tilted on down the slope
export function eaveFringeGeo(len, wid, rise, drop = 0.3) {
  const hw = wid / 2, hl = len / 2, k = drop / Math.hypot(hw, rise);
  const P = [], U = [];
  for (const s of [1, -1]) {
    const z0 = s * hw, z1 = s * (hw + hw * k * 0.6), y1 = -rise * k - drop * 0.4;
    P.push(-hl, 0.02, z0, hl, 0.02, z0, hl, y1, z1, -hl, 0.02, z0, hl, y1, z1, -hl, y1, z1);
    U.push(0, 1, len, 1, len, 0, 0, 1, len, 0, 0, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  geo.computeVertexNormals();
  return tint(geo, [0, 10, 0], { foot: false });
}
// the triangle of wall that closes each gable end (a prism the length of the house; its sides hide under the roof)
export function gableEndGeo(len, wid, rise, name) {
  const [tu, tv] = tileOf(name);
  const sh = new THREE.Shape(); sh.moveTo(-wid / 2, 0); sh.lineTo(wid / 2, 0); sh.lineTo(0, rise); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false });
  geo.rotateY(Math.PI / 2); geo.translate(-len / 2, 0, 0);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tu, uv.getY(i) / tv);
  return tint(geo, [0, 10, 0], { foot: false });
}

// ---- the ground ----
// One tiling detail texture for the ground: R grass, G bare soil, B a trodden path, each a grey around 0.5 that
// multiplies the vertex colour by 2x (so the colours layout.js gave the places stay as they are, only with grain).
let groundTex = null;
function groundDetail() {
  if (groundTex) return groundTex;
  const S = LIGHT ? 256 : 512;
  if (!HAS_DOM) return (groundTex = new THREE.Texture());
  const layer = (seed, draw) => { const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'); c.fillStyle = grey(128); c.fillRect(0, 0, S, S); draw(c, rng(seed)); soften(cv, c); return c.getImageData(0, 0, S, S).data; };
  // a soft pass (half size and back, wrapped) takes the hard single-pixel speckle out of the grain
  const soften = (cv, c) => { const t = document.createElement('canvas'); t.width = t.height = S / 2; const x = t.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cv, 0, 0, S / 2, S / 2); c.imageSmoothingQuality = 'high'; c.drawImage(t, 0, 0, S, S); };
  const grass = layer(11, (c, rnd) => {
    blotches(c, S, rnd, 60, S * 0.04, S * 0.14, (r) => r() < 0.5 ? `rgba(70,70,70,${0.15 + r() * 0.2})` : `rgba(190,190,190,${0.12 + r() * 0.2})`);
    for (let k = 0; k < S * 14; k++) {
      const x = rnd() * S, y = rnd() * S, l = 3 + rnd() * 8, a = -Math.PI / 2 + (rnd() - 0.5) * 1.2;
      wrap(S, x, y, l, (X, Y) => { c.strokeStyle = grey(rnd() < 0.55 ? 95 + rnd() * 30 : 145 + rnd() * 40); c.lineWidth = 1.4; c.beginPath(); c.moveTo(X, Y); c.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); c.stroke(); });
    }
    speckle(c, S, rnd, S * 2, 1, 3, () => grey(95)); // bare specks between the tufts
  });
  const soil = layer(23, (c, rnd) => {
    blotches(c, S, rnd, 50, S * 0.03, S * 0.12, (r) => r() < 0.5 ? `rgba(80,80,80,${0.15 + r() * 0.2})` : `rgba(175,175,175,${0.12 + r() * 0.2})`);
    for (let k = 0; k < S * 3; k++) { // clods: lit on top, shadowed below
      const x = rnd() * S, y = rnd() * S, r = 1 + rnd() * 3.5;
      wrap(S, x, y, r * 2, (X, Y) => { c.fillStyle = grey(105); c.beginPath(); c.arc(X + r * 0.3, Y + r * 0.35, r, 0, 7); c.fill(); c.fillStyle = grey(150 + rnd() * 50); c.beginPath(); c.arc(X, Y, r * 0.85, 0, 7); c.fill(); });
    }
    for (let k = 0; k < S / 12; k++) { const x = rnd() * S, y = rnd() * S, r = 1 + rnd() * 2; c.fillStyle = grey(170 + rnd() * 30); c.fillRect(x, y, r, r); } // grit
    for (let k = 0; k < 6; k++) crack(c, S, rnd, rnd() * S, rnd() * S, 14 + rnd() * 20, 1, grey(70));
  });
  const path = layer(37, (c, rnd) => {
    blotches(c, S, rnd, 40, S * 0.05, S * 0.2, (r) => r() < 0.5 ? `rgba(100,100,100,${0.12 + r() * 0.15})` : `rgba(165,165,165,${0.12 + r() * 0.15})`);
    speckle(c, S, rnd, S * 6, 1, 2, (r) => grey(r() < 0.5 ? 115 : 140));
    for (let k = 0; k < S / 2.5; k++) { // pebbles with their shadow
      const x = rnd() * S, y = rnd() * S, r = 0.8 + rnd() * 2.6;
      wrap(S, x, y, r * 2, (X, Y) => { c.fillStyle = grey(75); c.beginPath(); c.ellipse(X + r * 0.4, Y + r * 0.4, r, r * 0.8, 0, 0, 7); c.fill(); c.fillStyle = grey(165 + rnd() * 70); c.beginPath(); c.ellipse(X, Y, r, r * 0.75, rnd() * 3, 0, 7); c.fill(); });
    }
  });
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'); const img = c.createImageData(S, S);
  for (let i = 0; i < S * S; i++) { img.data[i * 4] = grass[i * 4]; img.data[i * 4 + 1] = soil[i * 4]; img.data[i * 4 + 2] = path[i * 4]; img.data[i * 4 + 3] = 255; }
  c.putImageData(img, 0, 0);
  groundTex = new THREE.CanvasTexture(cv); groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.anisotropy = LIGHT ? 2 : 8;
  groundTex.colorSpace = THREE.NoColorSpace; groundTex.generateMipmaps = true;
  return groundTex;
}
const segDist = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1, t = clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1);
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};
// The village's paths and wet shores, sharp enough to walk on: R the path (soft, irregular edge), G the trodden
// tracks (one worn line on a footpath, two wheel ruts on a road), B the damp mud round the water. Covers ±HALF m.
export const MASK_HALF = 48;
export function groundMask(L) {
  const S = LIGHT ? 512 : 1024;
  if (!HAS_DOM) return new THREE.Texture();
  const px = S / (MASK_HALF * 2), toP = (v) => (v + MASK_HALF) * px;
  const layer = (draw) => { const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, S, S); c.lineCap = 'round'; c.lineJoin = 'round'; draw(c); return c.getImageData(0, 0, S, S).data; };
  const stroke = (c, pts, w, a) => { c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = w * px; c.beginPath(); pts.forEach(([x, z], k) => (k ? c.lineTo(toP(x), toP(z)) : c.moveTo(toP(x), toP(z)))); c.stroke(); };
  const len = (p) => { let s = 0; for (let k = 1; k < p.length; k++) s += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); return s; };
  const R = layer((c) => {
    for (const p of L.paths) { const road = len(p) > 40, w = road ? 3.2 : 2.0; for (let k = 0; k < 6; k++) stroke(c, p, w + 1.6 - k * 0.32, 0.22); }
  });
  const G = layer((c) => {
    for (const p of L.paths) {
      const road = len(p) > 40;
      const offs = road ? [-0.75, 0.75] : [0];
      for (const o of offs) {
        const q = p.map(([x, z], k) => { const a = p[Math.max(0, k - 1)], b = p[Math.min(p.length - 1, k + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [x - (dz / l) * o, z + (dx / l) * o]; });
        for (let k = 0; k < 3; k++) stroke(c, q, (road ? 0.55 : 0.75) + 0.3 - k * 0.15, 0.35);
      }
    }
  });
  const B = layer((c) => {
    for (const w of L.water) {
      for (let k = 0; k < 5; k++) {
        c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = (4.5 - k * 0.8) * px;
        if (w.r) { c.beginPath(); c.arc(toP(w.cx), toP(w.cz), w.r * px, 0, Math.PI * 2); c.stroke(); }
        else c.strokeRect(toP(w.x0), toP(w.z0), (w.x1 - w.x0) * px, (w.z1 - w.z0) * px);
      }
    }
  });
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'); const img = c.createImageData(S, S);
  for (let i = 0; i < S * S; i++) { img.data[i * 4] = R[i * 4]; img.data[i * 4 + 1] = G[i * 4]; img.data[i * 4 + 2] = B[i * 4]; img.data[i * 4 + 3] = 255; }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.flipY = false;
  return t;
}
export { segDist };

// Ground shader: the detail texture at two scales blended by how grassy each vertex is (aGrass), the paths and their
// ruts from the mask with a ragged edge, damp mud by the water, and bump from the detail (not on phones).
export function groundMaterial(L, base) {
  const m = base;
  const U = {
    uDetail: { value: groundDetail() }, uMask: { value: groundMask(L) }, uHalf: { value: MASK_HALF },
    uPath: { value: new THREE.Color(L.path) }, uWet: { value: 0 },
  };
  m.userData.ground = U;
  m.customProgramCacheKey = () => `fsground${LIGHT ? 1 : 0}`;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.defines = { ...(sh.defines ?? {}), ...(LIGHT ? {} : { GROUND_BUMP: 1 }) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGrass; varying float vGrass; varying vec3 vGW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGrass = aGrass; vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uDetail; uniform sampler2D uMask; uniform float uHalf; uniform vec3 uPath; uniform float uWet;
        varying float vGrass; varying vec3 vGW;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 gxz = vGW.xz;
        vec3 d1 = texture2D(uDetail, gxz / 4.3).rgb, d2 = texture2D(uDetail, gxz / 13.7 + 0.37).rgb, dm = texture2D(uDetail, gxz / 61.0).rgb;
        float camD = length(vViewPosition), fadeD = 1.0 - smoothstep(30.0, 110.0, camD);
        vec2 mUv = (gxz + uHalf) / (2.0 * uHalf);
        float inMask = step(0.0, mUv.x) * step(mUv.x, 1.0) * step(0.0, mUv.y) * step(mUv.y, 1.0);
        vec3 mk = texture2D(uMask, mUv).rgb * inMask;
        float pth = smoothstep(0.3, 0.75, mk.r + (d2.g - 0.5) * 0.55 + (d1.r - 0.5) * 0.2);
        float gr = clamp(vGrass, 0.0, 1.0) * (1.0 - pth);
        float grassD = 0.5 + (mix(d1.r, d2.r, 0.35) - 0.5) * 0.42, soilD = mix(d1.g, d2.g, 0.4), pathD = mix(d1.b, d2.b, 0.3);
        float det = mix(mix(soilD, grassD, gr), pathD, pth);
        det = mix(0.5, det, mix(0.45, 1.0, fadeD));
        float wetM = smoothstep(0.15, 0.75, mk.b + (dm.g - 0.5) * 0.9 + (d2.r - 0.5) * 0.3);
        det = mix(det, 0.5 + (det - 0.5) * 0.35, wetM); // wet mud is smoothed over, not clods
        vec3 gcol = diffuseColor.rgb;
        gcol = mix(gcol, uPath * (0.92 + (dm.b - 0.5) * 0.3), pth);
        gcol *= 0.86 + (dm.r - 0.5) * 0.5 + (d2.r - 0.5) * 0.12 * gr; // the large patchiness that hides the tiling
        gcol *= det * 2.0;
        gcol *= 1.0 - mk.g * pth * 0.22;           // trodden tracks, darker and smoother
        gcol = mix(gcol, gcol * vec3(0.62, 0.58, 0.52), wetM * (1.0 - pth * 0.5)); // damp mud by the water
        diffuseColor.rgb = gcol;
        float tH = det + mk.g * pth * -0.25;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor - wetM * 0.35 - mk.g * pth * 0.08, 0.2, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        #ifdef GROUND_BUMP
        {
          vec3 vSx = dFdx(-vViewPosition), vSy = dFdy(-vViewPosition);
          vec2 dH = vec2(dFdx(tH), dFdy(tH)) * (0.9 + pth * 0.6) * fadeD;
          vec3 R1 = cross(vSy, normal), R2 = cross(normal, vSx);
          float fDet = dot(vSx, R1);
          vec3 grad = sign(fDet) * (dH.x * R1 + dH.y * R2);
          normal = normalize(abs(fDet) * normal - grad);
        }
        #endif`);
  };
  return m;
}

// ---- water ----
// A tiling ripple normal map made from a few wrapped sine waves and noise blobs (so it tiles exactly).
let waterN = null;
function waterNormals() {
  if (waterN) return waterN;
  if (!HAS_DOM) return (waterN = new THREE.Texture());
  const S = LIGHT ? 128 : 256, H = new Float32Array(S * S), rnd = rng(91);
  const waves = Array.from({ length: 9 }, () => [1 + Math.floor(rnd() * 5), Math.floor(rnd() * 7) - 3, rnd() * 6.28, 0.4 + rnd()]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let h = 0; for (const [a, b, ph, amp] of waves) h += Math.sin(((x * a + y * b) / S) * Math.PI * 2 + ph) * amp / (a + Math.abs(b));
    H[y * S + x] = h;
  }
  for (let k = 0; k < 120; k++) { const cx = rnd() * S, cy = rnd() * S, r = 3 + rnd() * 10, a = (rnd() - 0.5) * 0.5; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y) / r; if (d < 1) { const X = ((Math.round(cx + x) % S) + S) % S, Y = ((Math.round(cy + y) % S) + S) % S; H[Y * S + X] += a * (1 - d * d); } } }
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), img = c.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const hx = H[y * S + ((x + 1) % S)] - H[y * S + ((x - 1 + S) % S)], hy = H[((y + 1) % S) * S + x] - H[((y - 1 + S) % S) * S + x];
    const nx = -hx * 2.2, ny = -hy * 2.2, l = Math.hypot(nx, ny, 1), i = (y * S + x) * 4;
    img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  waterN = new THREE.CanvasTexture(cv); waterN.colorSpace = THREE.NoColorSpace; waterN.wrapS = waterN.wrapT = THREE.RepeatWrapping;
  return waterN;
}
// Shared uniforms for every water surface in a world (time, rain, and the sky colours to reflect).
export function waterUniforms(skyTop, skyMid) {
  return { uTime: { value: 0 }, uRain: { value: 0 }, uWN: { value: waterNormals() }, uSkyTop: { value: skyTop }, uSkyMid: { value: skyMid } };
}
// Water: its own colour in the deep, a lighter, clearer shallow fading out at the shore (aDepth 0 at the edge, 1
// deep), waves moved on the GPU, two scrolling ripple normals (plus rain rings when it rains), and the sky reflected
// by Fresnel: the surface mirrors the sky at a low angle and shows its colour looking down.
export function waterMaterial(color, U, { opacity = 0.92, shallow = null, muddy = false } = {}) {
  const deep = new THREE.Color(color).multiplyScalar(muddy ? 0.8 : 0.45);
  const sh0 = new THREE.Color(shallow ?? color).lerp(new THREE.Color(muddy ? '#9a8660' : '#8a8a62'), 0.35);
  const m = new THREE.MeshStandardMaterial({ color: deep, roughness: 0.1, metalness: 0, transparent: true, opacity, depthWrite: false });
  const own = { uShallow: { value: sh0 }, uMuddy: { value: muddy ? 1 : 0 } };
  m.customProgramCacheKey = () => `fswater${LIGHT ? 1 : 0}`;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, own);
    sh.defines = { ...(sh.defines ?? {}), ...(LIGHT ? {} : { WATER_RAIN: 1 }) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aDepth; varying float vDepth; varying vec3 vWW; uniform float uTime; uniform float uRain;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 wp0 = (modelMatrix * vec4(transformed, 1.0)).xyz;
        float wv = sin(uTime * 1.3 + wp0.x * 0.35 + wp0.z * 0.25) + 0.6 * sin(uTime * 1.9 - wp0.x * 0.55 + wp0.z * 0.45);
        transformed.y += wv * 0.03 * (1.0 + uRain * 1.8) * aDepth;`)
      .replace('#include <project_vertex>', '#include <project_vertex>\nvDepth = aDepth; vWW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uRain; uniform sampler2D uWN; uniform vec3 uSkyTop; uniform vec3 uSkyMid; uniform vec3 uShallow; uniform float uMuddy;
        varying float vDepth; varying vec3 vWW;
        float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float wNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + 1.0), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // the waterline wanders: the depth that fades the shallows is pushed in and out by two octaves of noise
        float shoreN = wNoise(vWW.xz * 0.16) * 0.6 + wNoise(vWW.xz * 0.7 + 7.0) * 0.4;
        float wDepth = clamp(vDepth + (shoreN - 0.5) * 1.3 * (1.0 - smoothstep(0.4, 0.9, vDepth)), 0.0, 1.0);
        float sd = smoothstep(0.0, 1.0, wDepth);
        diffuseColor.rgb = mix(uShallow, diffuseColor.rgb, sd);
        diffuseColor.a *= smoothstep(0.02, 0.5, wDepth);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 wxz = vWW.xz;
        // three ripple layers at unrelated scales and angles so no repeat lines up, calmer with distance (where the
        // repeats would show) and patchy, as wind lies on water in cat's-paws
        vec2 wr = mat2(0.80, -0.60, 0.60, 0.80) * wxz;
        vec3 n1 = texture2D(uWN, wxz * 0.16 + uTime * vec2(0.018, 0.011)).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D(uWN, wxz * 0.37 + uTime * vec2(-0.021, 0.026)).xyz * 2.0 - 1.0;
        vec3 n3 = texture2D(uWN, wr * 0.071 + uTime * vec2(0.007, -0.009)).xyz * 2.0 - 1.0;
        float wDist = length(vWW - cameraPosition), far = smoothstep(18.0, 90.0, wDist);
        float gust = 0.55 + 0.9 * wNoise(wxz * 0.05 + uTime * 0.02);
        vec2 slope = (mix(n1.xy + n2.xy, n1.xy * 0.4, far) + n3.xy * 0.9) * (0.2 + uRain * 0.35) * gust * mix(1.0, 0.45, far) * mix(1.0, 0.5, uMuddy);
        float ringGlow = 0.0;
        #ifdef WATER_RAIN
        if (uRain > 0.01) {
          // raindrop rings: two staggered grids of drops, each ring spreading and fading
          for (int k = 0; k < 2; k++) {
            vec2 q = wxz * 1.7 + float(k) * vec2(0.37, 0.61);
            vec2 cell = floor(q), f = fract(q) - 0.5;
            float h = wHash(cell + float(k) * 13.0), ph = fract(uTime * 1.3 + h);
            vec2 o = vec2(wHash(cell + 3.1), wHash(cell + 7.7)) - 0.5; vec2 dv = f - o * 0.5;
            float rr = ph * 0.42, r = length(dv), band = smoothstep(0.06, 0.0, abs(r - rr)) * (1.0 - ph) * (1.0 - far);
            slope += normalize(dv + 1e-4) * sin((r - rr) * 70.0) * band * 1.4 * uRain;
            ringGlow += band * uRain;
          }
        }
        #endif
        vec3 wN = normalize(vec3(-slope.x, 1.0, -slope.y));
        normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);`)
      .replace('#include <opaque_fragment>', `
        {
          vec3 V = normalize(vWW - cameraPosition);
          vec3 Rf = reflect(V, wN);
          vec3 skyC = mix(uSkyMid, uSkyTop, pow(clamp(Rf.y, 0.0, 1.0), 0.55));
          float fr = 0.03 + 0.97 * pow(1.0 - clamp(dot(-V, wN), 0.0, 1.0), 5.0);
          fr *= mix(0.55, 1.0, sd) * mix(1.0, 0.7, uMuddy);
          outgoingLight = mix(outgoingLight, skyC, clamp(fr, 0.0, 0.92));
          outgoingLight += skyC * ringGlow * 0.45;
          diffuseColor.a = clamp(max(diffuseColor.a, fr * smoothstep(0.0, 0.3, vDepth)), 0.0, 1.0);
        }
        #include <opaque_fragment>`);
  };
  return m;
}
// how deep each vertex of a water surface lies, 0 at the waterline and 1 from `full` metres down
export function setWaterDepth(geo, mesh, ground, y, full = 0.8, edge = null) {
  const p = geo.attributes.position, d = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + mesh.position.x, z = p.getZ(i) + mesh.position.z;
    let v = ground ? clamp((y - ground(x, z)) / full, 0, 1) : 1;
    if (edge) v = Math.min(v, clamp(edge(x, z) / 2.5, 0, 1));
    d[i] = v;
  }
  geo.setAttribute('aDepth', new THREE.BufferAttribute(d, 1));
}

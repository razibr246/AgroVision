// VR rules of মাঠের মানুষ that need no three.js and no headset, so they can be tested: the player's comfort settings,
// where a teleport may land, the arc it follows, what a pointing ray lands on (a plot, a station, a villager or plain
// ground), where the farmer must stand to act on it, and how a world-space panel lays out its text and buttons and
// which button a pointer is on. The stage's VR mode (three/xr.js) draws and moves; this module only decides.
import { inWater, resolve } from './layout.js';
import { WORLD_R, PLOT } from './regions.js';
import { plotAt, target, STATIONS } from './sim.js';

// ---- settings (the VR menu) ----
export const XR_KEY = 'fs360.game.xr';
// view: 'first' (you are the farmer) or 'third' (a god view behind them); move: walk where the head or the left
// hand points; turn: snap angle in degrees; smoothTurn: turn continuously instead; vignette: darken the edges while
// moving or turning by stick; seated: lift the eyes to a standing farmer's height for a seated player.
export const XR_DEFAULTS = Object.freeze({ view: 'first', move: 'head', turn: 30, smoothTurn: false, vignette: true, seated: false });
export const XR_OPTIONS = Object.freeze({ view: ['first', 'third'], move: ['head', 'hand'], turn: [30, 45], smoothTurn: [false, true], vignette: [true, false], seated: [false, true] });
export function cleanXR(raw) {
  const out = { ...XR_DEFAULTS };
  if (raw && typeof raw === 'object') for (const k of Object.keys(XR_OPTIONS)) if (XR_OPTIONS[k].includes(raw[k])) out[k] = raw[k];
  return out;
}
// the next value of one setting, as a menu button cycles it
export function cycleXR(s, key) {
  const opts = XR_OPTIONS[key]; if (!opts) return s;
  const i = opts.indexOf(s[key]);
  return { ...s, [key]: opts[(i + 1) % opts.length] };
}
export const SEATED_LIFT = 0.5; // m: a seated player's eyes are about this much lower than a standing one's
export const eyeLift = (s) => (s.seated ? SEATED_LIFT : 0);

// ---- turning ----
export const SMOOTH_TURN_RATE = 1.9; // rad/s at full stick
// One frame of the right stick's sideways push: the change of yaw (radians, + is to the left). `st.held` remembers a
// snap so one push turns once; the stick must come back near the middle before the next.
export function turnStep(st, rx, s, dt) {
  if (s.smoothTurn) { st.held = false; return Math.abs(rx) > 0.2 ? -rx * SMOOTH_TURN_RATE * dt : 0; }
  if (Math.abs(rx) > 0.7 && !st.held) { st.held = true; return -Math.sign(rx) * (s.turn * Math.PI) / 180; }
  if (Math.abs(rx) < 0.3) st.held = false;
  return 0;
}

// ---- comfort vignette ----
// How dark the edges should be: none when still or when the player turned it off; more for faster stick motion and
// smooth turning. Physical walking in the room never darkens the view (the body feels that motion).
export function vignetteTarget(s, stickSpeed, turnRate) {
  if (!s.vignette) return 0;
  const m = Math.min(1, Math.max(0, stickSpeed) / 3.5), r = Math.min(1, Math.abs(turnRate) / 1.5);
  return Math.min(0.85, Math.max(m > 0.03 ? 0.35 + m * 0.45 : 0, r > 0.03 ? 0.45 + r * 0.35 : 0));
}
// eased: closes quickly, opens slowly
export const approachVignette = (cur, want, dt) => cur + (want - cur) * Math.min(1, dt * (want > cur ? 10 : 3));

// ---- teleport ----
export const TELEPORT_MAX = 16; // m from the farmer
// Can the farmer land here? Not in water, not inside a house, tree or wall, not past the walkable edge, not too far.
export function teleportOK(L, x, z, from = null) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, why: 'none' };
  if (Math.hypot(x, z) > WORLD_R - 0.5) return { ok: false, why: 'edge' };
  if (from && Math.hypot(x - from.x, z - from.z) > TELEPORT_MAX) return { ok: false, why: 'far' };
  if (inWater(L, x, z)) return { ok: false, why: 'water' };
  // (nudged a hair: resolve() leaves a point exactly on a round blocker's centre where it is)
  const nx = x + 0.011, nz = z + 0.007, [rx, rz] = resolve(L, nx, nz);
  if (Math.hypot(rx - nx, rz - nz) > 0.05) return { ok: false, why: 'blocked' };
  return { ok: true, x, z };
}
// The teleport arc: a thrown point under gravity from the hand, until it meets the ground. Writes xyz triples into
// `out` (a Float32Array, reused every frame) and returns { n, hit, x, y, z }: n points, and where it landed.
export function arcPoints(ox, oy, oz, dx, dy, dz, ground, out, { speed = 10, grav = 9.8, step = 0.04 } = {}) {
  const max = Math.floor(out.length / 3), l = Math.hypot(dx, dy, dz) || 1;
  let vx = (dx / l) * speed, vy = (dy / l) * speed, vz = (dz / l) * speed, x = ox, y = oy, z = oz, n = 0;
  for (; n < max; n++) {
    out[n * 3] = x; out[n * 3 + 1] = y; out[n * 3 + 2] = z;
    const gy = ground(x, z);
    if (n > 0 && y <= gy) {
      // back up to where it crossed the ground
      const px = out[n * 3 - 3], py = out[n * 3 - 2], pz = out[n * 3 - 1], pg = ground(px, pz);
      const u = Math.min(1, Math.max(0, (py - pg) / Math.max(1e-6, (py - pg) - (y - gy))));
      x = px + (x - px) * u; z = pz + (z - pz) * u; y = ground(x, z);
      out[n * 3] = x; out[n * 3 + 1] = y; out[n * 3 + 2] = z;
      return { n: n + 1, hit: true, x, y, z };
    }
    x += vx * step; y += vy * step; z += vz * step; vy -= grav * step;
    if (y < -50) break;
  }
  return { n, hit: false, x, y, z };
}

// ---- pointing ----
// Where a ray (origin o, direction d, both [x, y, z]) first meets the ground, marching and then halving the step.
// Returns the distance along the ray, or -1 within maxD.
export function rayGround(o, d, ground, maxD = 40, step = 0.5) {
  const l = Math.hypot(d[0], d[1], d[2]) || 1, dx = d[0] / l, dy = d[1] / l, dz = d[2] / l;
  let prev = 0;
  if (o[1] - ground(o[0], o[2]) <= 0) return 0;
  for (let t = step; t <= maxD; t += step) {
    const x = o[0] + dx * t, y = o[1] + dy * t, z = o[2] + dz * t;
    if (y <= ground(x, z)) {
      let a = prev, b = t;
      for (let k = 0; k < 10; k++) { const m = (a + b) / 2; if (o[1] + dy * m <= ground(o[0] + dx * m, o[2] + dz * m)) b = m; else a = m; }
      return b;
    }
    prev = t;
  }
  return -1;
}
// The closest the ray comes to a point: [distance from the point, distance along the ray].
function nearRay(o, d, px, py, pz) {
  const l = Math.hypot(d[0], d[1], d[2]) || 1, dx = d[0] / l, dy = d[1] / l, dz = d[2] / l;
  const t = Math.max(0, (px - o[0]) * dx + (py - o[1]) * dy + (pz - o[2]) * dz);
  return [Math.hypot(o[0] + dx * t - px, o[1] + dy * t - py, o[2] + dz * t - pz), t];
}
// What the ray points at: a villager (npcs: [[x, z], ...]), a station (its building, up to 4 m high, or the ground
// round it), a plot, or the plain ground. `hitT` is rayGround's answer. Returns { kind, ..., t } or null.
export function pickWorld(g, o, d, hitT, npcs = []) {
  const L = g.L, ground = L.ground;
  let best = null;
  const far = hitT >= 0 ? hitT : 40;
  for (let k = 0; k < npcs.length; k++) {
    const [nx, nz] = npcs[k], [r, t] = nearRay(o, d, nx, ground(nx, nz) + 1.05, nz);
    if (r < 0.55 && t < far + 0.5 && (!best || t < best.t)) best = { kind: 'npc', k, x: nx, z: nz, t };
  }
  for (const id of STATIONS) {
    const s = g.S[id]; if (!s) continue;
    const gy = ground(s.x, s.z), rad = Math.max(1, Math.min(s.r ?? 1.5, 3));
    for (const h of [0.6, 1.6, 2.8]) {
      const [r, t] = nearRay(o, d, s.x, gy + h, s.z);
      if (r < rad && t < far + rad && (!best || t < best.t)) best = { kind: 'station', id, x: s.x, z: s.z, t };
    }
  }
  if (best) return best;
  if (hitT < 0) return null;
  const l = Math.hypot(d[0], d[1], d[2]) || 1;
  const x = o[0] + (d[0] / l) * hitT, z = o[2] + (d[2] / l) * hitT;
  for (const id of STATIONS) { const s = g.S[id]; if (s && Math.hypot(x - s.x, z - s.z) < (s.r ?? 1.5) + 0.6) return { kind: 'station', id, x: s.x, z: s.z, t: hitT }; }
  const i = plotAt(x, z);
  if (i !== null && g.plots[i]) {
    const p = g.plots[i];
    if (Math.abs(x - p.x) <= PLOT / 2 + 0.05 && Math.abs(z - p.z) <= PLOT / 2 + 0.05) return { kind: 'plot', i, x, z, t: hitT };
  }
  return { kind: 'ground', x, z, t: hitT };
}
export const REACH = { plot: 8, station: 16, npc: 8 }; // how far the farmer steps (with a blink) to act on what they point at
// Where the farmer must stand to act on what is pointed at: null when they already can from where they are, or
// { x, z, d } (d: how far that is), or { far: true } beyond REACH, or { none: true } when nowhere near is free.
export function standFor(g, pick) {
  const me = g.me, L = g.L;
  if (!pick) return { none: true };
  if (pick.kind === 'plot') {
    const p = g.plots[pick.i];
    if (plotAt(me.x, me.z) === pick.i) return null;
    const h = PLOT / 2 - 0.35;
    const x = Math.min(p.x + h, Math.max(p.x - h, me.x)), z = Math.min(p.z + h, Math.max(p.z - h, me.z)), d = Math.hypot(x - me.x, z - me.z);
    if (Math.hypot(p.x - me.x, p.z - me.z) > REACH.plot) return { far: true, d };
    return { x, z, d };
  }
  if (pick.kind === 'station') {
    const t = target(g);
    if (t?.kind === 'station' && t.id === pick.id) return null;
    const s = g.S[pick.id], d0 = Math.hypot(s.x - me.x, s.z - me.z);
    if (d0 > REACH.station) return { far: true, d: d0 };
    const a0 = Math.atan2(me.x - s.x, me.z - s.z), r = (s.r ?? 1.5) + 0.9;
    for (const da of [0, 0.4, -0.4, 0.8, -0.8, 1.3, -1.3, 1.9, -1.9, 2.6, -2.6, Math.PI]) {
      const x = s.x + Math.sin(a0 + da) * r, z = s.z + Math.cos(a0 + da) * r;
      if (teleportOK(L, x, z).ok) return { x, z, d: Math.hypot(x - me.x, z - me.z) };
    }
    return { none: true };
  }
  if (pick.kind === 'npc') {
    const d0 = Math.hypot(pick.x - me.x, pick.z - me.z);
    if (d0 < 2.2) return null;
    if (d0 > REACH.npc) return { far: true, d: d0 };
    const ux = (me.x - pick.x) / d0, uz = (me.z - pick.z) / d0, x = pick.x + ux * 1.4, z = pick.z + uz * 1.4;
    return teleportOK(L, x, z).ok ? { x, z, d: d0 - 1.4 } : null;
  }
  return { none: true };
}

// ---- wrist ----
// The wrist panel shows when the inside of the left wrist faces the eyes: `facing` is the cosine between the panel's
// normal and the way to the head; `dist` the head-to-wrist distance in metres.
export const wristVisible = (facing, dist, was = false) => dist < 0.75 && facing > (was ? 0.45 : 0.6);

// ---- world-space panels ----
// A panel is { title, sub?, rows: [...], foot: [buttons] }: a row is { text, tone?, size? } (wrapped) or
// { buttons: [{ id, label, sub?, on?: false, tone? }], cols? }. layoutPanel places it on a canvas of w × h pixels,
// splitting rows that do not fit onto pages (the foot's buttons and the page arrows stay on every page), with
// measure(text, px) giving a string's width at a font size. Pure, so the same layout is drawn and hit-tested.
export const PANEL = { pad: 40, title: 46, sub: 26, body: 29, small: 24, btnH: 74, gap: 14, lineK: 1.38 };
export function wrapText(text, maxW, px, measure) {
  const out = [];
  for (const para of String(text ?? '').split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const s = line ? `${line} ${word}` : word;
      if (measure(s, px) <= maxW) { line = s; continue; }
      if (line) out.push(line);
      if (measure(word, px) <= maxW) { line = word; continue; }
      // a single word wider than the line: break it by characters
      let piece = '';
      for (const ch of word) { if (measure(piece + ch, px) > maxW && piece) { out.push(piece); piece = ch; } else piece += ch; }
      line = piece;
    }
    out.push(line);
  }
  return out;
}
export function layoutPanel(spec, { w, h, measure, page = 0 }) {
  const P = PANEL, inner = w - P.pad * 2;
  let y = P.pad;
  const head = [];
  if (spec.title) { const lines = wrapText(spec.title, inner, P.title, measure).slice(0, 2); head.push({ type: 'title', x: P.pad, y, w: inner, lines, px: P.title }); y += lines.length * P.title * 1.25; }
  if (spec.sub) { const lines = wrapText(spec.sub, inner, P.sub, measure).slice(0, 3); head.push({ type: 'sub', x: P.pad, y, w: inner, lines, px: P.sub }); y += lines.length * P.sub * P.lineK; }
  y += P.gap;
  const top = y;
  const foot = (spec.foot ?? []).slice(0, 4);
  const footH = P.btnH + P.gap;
  // first pass: every row's own height
  const blocks = (spec.rows ?? []).map((r) => {
    if (r.buttons) {
      const cols = Math.max(1, Math.min(r.cols ?? r.buttons.length, 4)), rows = Math.ceil(r.buttons.length / cols);
      const bh = r.buttons.some((b) => b.sub) ? P.btnH + 30 : P.btnH;
      return { r, cols, bh, h: rows * bh + (rows - 1) * P.gap };
    }
    const px = r.size === 'small' ? P.small : r.size === 'big' ? P.sub + 6 : P.body;
    const pad = r.tone ? 14 : 0;
    const lines = wrapText(r.text, inner - pad * 2, px, measure);
    return { r, px, lines, pad, h: lines.length * px * P.lineK + pad * 2 };
  });
  // pages: as many rows as fit above the foot
  const room = h - top - footH - P.pad / 2;
  const pages = [[]];
  let used = 0;
  for (const b of blocks) {
    const bh = Math.min(b.h, room);
    if (used + bh > room && pages.at(-1).length) { pages.push([]); used = 0; }
    pages.at(-1).push(b); used += bh + P.gap;
  }
  const pg = Math.max(0, Math.min(page, pages.length - 1));
  const items = [...head];
  y = top;
  for (const b of pages[pg]) {
    if (b.r.buttons) {
      const bw = (inner - (b.cols - 1) * P.gap) / b.cols;
      b.r.buttons.forEach((btn, k) => {
        const c = k % b.cols, row = Math.floor(k / b.cols);
        items.push({ type: 'button', id: btn.id, label: btn.label, sub: btn.sub, on: btn.on !== false, tone: btn.tone, x: P.pad + c * (bw + P.gap), y: y + row * (b.bh + P.gap), w: bw, h: b.bh });
      });
    } else {
      const maxLines = Math.max(1, Math.floor((room - b.pad * 2) / (b.px * P.lineK)));
      const lines = b.lines.slice(0, maxLines);
      items.push({ type: 'text', x: P.pad, y, w: inner, h: lines.length * b.px * P.lineK + b.pad * 2, lines, px: b.px, tone: b.r.tone, pad: b.pad });
    }
    y += Math.min(b.h, room) + P.gap;
  }
  // the foot: page arrows (when there are pages) and the panel's own buttons, across the bottom
  const fb = [...foot];
  if (pages.length > 1) {
    fb.unshift({ id: 'page:-1', label: '◀', on: pg > 0, small: true });
    fb.push({ id: 'page:+1', label: '▶', on: pg < pages.length - 1, small: true });
  }
  if (fb.length) {
    const smallW = 96, nSmall = fb.filter((b) => b.small).length, nBig = fb.length - nSmall;
    const bigW = nBig ? (inner - nSmall * smallW - (fb.length - 1) * P.gap) / nBig : 0;
    let x = P.pad; const fy = h - P.pad / 2 - P.btnH;
    for (const b of fb) { const bw = b.small ? smallW : bigW; items.push({ type: 'button', id: b.id, label: b.label, on: b.on !== false, tone: b.tone, x, y: fy, w: bw, h: P.btnH, foot: true }); x += bw + P.gap; }
  }
  return { w, h, items, page: pg, pages: pages.length };
}
// the button under a pointer at canvas pixel (x, y), or null; a greyed-out button is never hit
export function hitPanel(layout, x, y) {
  if (!layout) return null;
  for (const it of layout.items) if (it.type === 'button' && it.on && x >= it.x && x <= it.x + it.w && y >= it.y && y <= it.y + it.h) return it;
  return null;
}

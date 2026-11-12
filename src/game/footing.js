// Footing for মাঠের মানুষ, as numbers only (no three.js), so it can be tested: what the ground under a person is, how
// it lets them start, stop and how fast it lets them go (the "friction" of each surface), and keeping bodies (people,
// cattle, goats, hens) from walking through each other.
//
//   path    a beaten earth path, a road, a bridge's boards: firm, the full pace, quick to start and stop
//   grass   the open ground: nearly as firm
//   soil    a ploughed plot: soft underfoot, a slower pace, a little slower to get going
//   mud     wet ground (a bank by the water, or anywhere soft after rain): slow, and a short slide on stopping
//   water   ankle-deep flood water: slow and dragging
// The numbers are kept small on purpose: a game should still answer the keys at once, but a person crossing a wet
// plot should feel it.
import { inWater, resolve } from './layout.js';
import { PLOT, GAP, FCOLS, FROWS, FIELD_W, FIELD_D } from './regions.js';

// accel / decel in m/s², top as a share of the person's pace
export const FOOTING = {
  path: { accel: 4.2, decel: 7.0, top: 1 },
  wood: { accel: 4.2, decel: 7.0, top: 1 },
  grass: { accel: 3.9, decel: 6.2, top: 0.97 },
  sand: { accel: 3.2, decel: 5.2, top: 0.88 },
  soil: { accel: 3.2, decel: 5.4, top: 0.86 },
  mud: { accel: 2.4, decel: 3.0, top: 0.74 },
  water: { accel: 1.9, decel: 4.8, top: 0.55 },
};
// running pushes harder off the ground than walking
const RUN_PUSH = 1.25;

const segDist = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};
// on one of the field's plots (sim.js plotCenter: a grid of PLOT squares GAP apart)
const onPlot = (x, z) => {
  const c = (x + FIELD_W / 2) / (PLOT + GAP), r = (z + FIELD_D / 2) / (PLOT + GAP);
  if (c < 0 || r < 0 || c >= FCOLS || r >= FROWS) return false;
  return c % 1 < PLOT / (PLOT + GAP) && r % 1 < PLOT / (PLOT + GAP);
};
// is (x, z) on the soft bank of a pond, canal or river (within `m` metres of its water, but not in it)?
export function nearWater(L, x, z, m = 1.4) {
  for (const w of L.water ?? []) {
    const d = w.r ? Math.hypot(x - w.cx, z - w.cz) - w.r : Math.max(w.x0 - x, x - w.x1, w.z0 - z, z - w.z1);
    if (d < m) return true;
  }
  return false;
}

// What the ground is at (x, z): 'water' (in water or flood), 'soil' (a plot), 'mud' (soil or bank made wet), 'path',
// 'wood' (bridge, ghat, the shop's floor), 'grass'. g is the game (for the weather and the stations), optional.
export function surfaceAt(L, g, x, z) {
  const ev = g?.ev ?? {};
  const field = Math.abs(x) < FIELD_W / 2 + 4 && Math.abs(z) < FIELD_D / 2 + 4;
  if (inWater(L, x, z) || (ev.flood > 0.15 && field)) return 'water';
  const wet = ev.storm > 0 || ev.shower > 0;
  if (onPlot(x, z)) return wet ? 'mud' : 'soil';
  if (nearWater(L, x, z)) return 'mud';
  for (const pr of L.props ?? []) if ((pr.type === 'bamboobridge' || pr.type === 'ghat') && Math.hypot(x - pr.x, z - pr.z) < 2.5) return 'wood';
  if (g?.S?.shed && Math.hypot(x - g.S.shed.x, z - g.S.shed.z) < 2.6) return 'wood';
  for (const p of L.paths ?? []) for (let k = 1; k < p.length; k++) if (segDist(x, z, p[k - 1][0], p[k - 1][1], p[k][0], p[k][1]) < 1.35) return wet ? 'mud' : 'path';
  return 'grass';
}

// One step of a person's velocity (vx, vz) toward the wanted velocity (tx, tz) on this footing: speeding up at most
// at `accel`, slowing (or turning, which takes off the speed across the new way) at most at `decel`. Returns [vx, vz].
export function approach(vx, vz, tx, tz, f, dt, run = false) {
  const dx = tx - vx, dz = tz - vz, dl = Math.hypot(dx, dz);
  if (dl < 1e-6) return [tx, tz];
  const v = Math.hypot(vx, vz), t = Math.hypot(tx, tz);
  // speeding up along the way already going is the push; anything else (stopping, turning) is the braking grip
  const gaining = t > v && (vx * tx + vz * tz) >= 0.7 * v * t;
  const lim = (gaining ? f.accel * (run ? RUN_PUSH : 1) : f.decel) * dt;
  if (dl <= lim) return [tx, tz];
  return [vx + (dx / dl) * lim, vz + (dz / dl) * lim];
}

// Two bodies seen from above, each a circle {x, z, r} or a capsule {x, z, r, yaw, half} (cattle: a long body on its
// heading); mass decides who gives way (Infinity: does not move). Pushes them apart in place; returns the overlap.
function closest(b, x, z) {
  if (!b.half) return [b.x, b.z];
  const ux = Math.sin(b.yaw), uz = Math.cos(b.yaw), t = Math.max(-b.half, Math.min(b.half, (x - b.x) * ux + (z - b.z) * uz));
  return [b.x + ux * t, b.z + uz * t];
}
export function separate(a, b) {
  const [bx, bz] = closest(b, a.x, a.z), [ax, az] = closest(a, bx, bz);
  let dx = ax - bx, dz = az - bz;
  const d = Math.hypot(dx, dz), m = a.r + b.r;
  if (d >= m) return 0;
  if (d < 1e-5) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
  const push = m - d;
  const wa = a.mass === Infinity ? 0 : b.mass === Infinity ? 1 : b.mass / (a.mass + b.mass);
  const wb = b.mass === Infinity ? 0 : a.mass === Infinity ? 1 : a.mass / (a.mass + b.mass);
  a.x += dx * push * wa; a.z += dz * push * wa;
  b.x -= dx * push * wb; b.z -= dz * push * wb;
  return push;
}

// The body of a farm animal for separate(): cattle, buffalo and donkeys are long, goats and birds round.
const BODY = {
  cow: { r: 0.42, half: 0.55, mass: Infinity }, ox: { r: 0.45, half: 0.6, mass: Infinity }, buffalo: { r: 0.5, half: 0.65, mass: Infinity },
  donkey: { r: 0.32, half: 0.45, mass: Infinity }, goat: { r: 0.28, half: 0.22, mass: 60 },
  chicken: { r: 0.16, mass: 3 }, duck: { r: 0.17, mass: 3 }, egret: { r: 0.18, mass: 2 },
};
export function animalBody(species, x, z, yaw, scale = 1) {
  const b = BODY[species] ?? BODY.goat;
  return { x, z, yaw, r: b.r * scale, half: (b.half ?? 0) * scale, mass: b.mass, species };
}
export const PERSON = { r: 0.3, mass: 70 };

// Keep people out of the animals: each person {x, z} is pushed out of every animal body (a cow stands its ground; a
// hen is shoved aside), and then out of walls again (layout.js resolve). Animals moved here keep out of the water.
// Returns the bodies that were touched, so the caller can make an animal stop or scatter.
export function keepApart(L, people, animals) {
  const hit = [];
  for (const p of people) {
    const pb = { x: p.x, z: p.z, r: p.r ?? PERSON.r, mass: PERSON.mass };
    for (const an of animals) {
      if (Math.abs(an.x - pb.x) > 3 || Math.abs(an.z - pb.z) > 3) continue;
      const ox = an.x, oz = an.z;
      if (separate(pb, an) > 0) {
        hit.push(an);
        if (inWater(L, an.x, an.z) && !inWater(L, ox, oz)) { an.x = ox; an.z = oz; }
      }
    }
    const [rx, rz] = resolve(L, pb.x, pb.z, pb.r);
    p.x = rx; p.z = rz;
  }
  for (let i = 0; i < animals.length; i++) for (let j = i + 1; j < animals.length; j++) {
    const a = animals[i], b = animals[j];
    if (Math.abs(a.x - b.x) > 3 || Math.abs(a.z - b.z) > 3) continue;
    if (a.mass === Infinity && b.mass === Infinity) {
      // two big beasts nudge each other apart evenly
      const A = { ...a, mass: 1 }, Bb = { ...b, mass: 1 };
      if (separate(A, Bb) > 0) { a.x = A.x; a.z = A.z; b.x = Bb.x; b.z = Bb.z; }
    } else separate(a, b);
  }
  return hit;
}

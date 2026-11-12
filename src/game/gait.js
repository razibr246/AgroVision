// How the farm animals walk, as numbers only (no three.js), so it can be tested: the walk of cattle, buffalo, goats
// and donkeys is a four-beat lateral sequence (left hind, left fore, right hind, right fore, a quarter cycle apart),
// each foot planted for most of the cycle. While a foot is planted it moves back under the body at exactly the
// body's speed, so it does not slide over the ground; then it lifts, swings forward and sets down again. The leg's
// two joints come from the foot's place by two-bone inverse kinematics: a fore knee bends forward, a hind hock back.

export const LATERAL = { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 }; // when each foot leaves the ground, as a share of the cycle
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smooth01 = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// where a foot is, `p` (0..1) through its own cycle: stance first (for `duty` of the cycle), then swing.
// `reach` is half the distance the foot travels under the body while planted; `lift` the swing's height.
// dz is forward of the leg's neutral place, dy up from the ground.
export function footPath(p, duty, reach, lift) {
  p = ((p % 1) + 1) % 1;
  if (p < duty) { const s = p / duty; return { dz: reach * (1 - 2 * s), dy: 0, stance: true, s }; }
  const s = (p - duty) / (1 - duty);
  return { dz: -reach + 2 * reach * smooth01(s), dy: lift * Math.sin(Math.PI * s), stance: false, s };
}

// the stride for a walk at `speed` m/s with a cycle `period` s long: half the travel of a planted foot
export const reachFor = (speed, period, duty) => (speed * period * duty) / 2;

// Two-bone IK in the leg's side plane. The hip (or elbow) is at the origin; the foot target is (z, y) with y below
// (negative). a and b are the upper and lower lengths. bend = +1 puts the middle joint forward of the line (a fore
// knee), -1 behind it (a hind hock). Returns the two segments' angles from straight down, forward positive.
export function legIK(a, b, z, y, bend) {
  const D = clamp(Math.hypot(z, y), Math.abs(a - b) + 1e-4, a + b - 1e-4);
  const base = Math.atan2(z, -y);
  const A = Math.acos(clamp((a * a + D * D - b * b) / (2 * a * D), -1, 1));
  const u = base + bend * A;
  const kz = a * Math.sin(u), ky = -a * Math.cos(u);
  const l = Math.atan2(z - kz, -(y - ky));
  return [u, l];
}

// turn from `cur` toward `want` by at most `step` radians
export function turnToward(cur, want, step) {
  const d = wrapAngle(want - cur);
  return cur + clamp(d, -step, step);
}

// A spot to wander to: a few metres from where the animal is, never more than `radius` from home, and one that `ok`
// accepts (not in water, not inside a house) at the end and along the way. rnd() gives numbers in [0, 1).
export function pickWander(home, at, radius, rnd, ok, { min = 0.8, max = 2.6, tries = 8 } = {}) {
  for (let k = 0; k < tries; k++) {
    const a = rnd() * Math.PI * 2, d = min + rnd() * (max - min);
    const x = at[0] + Math.sin(a) * d, z = at[1] + Math.cos(a) * d;
    if (Math.hypot(x - home[0], z - home[1]) > radius) continue;
    let clear = true;
    for (let s = 1; s <= 4 && clear; s++) { const f = s / 4; if (!ok(at[0] + (x - at[0]) * f, at[1] + (z - at[1]) * f)) clear = false; }
    if (clear) return [x, z];
  }
  return null;
}

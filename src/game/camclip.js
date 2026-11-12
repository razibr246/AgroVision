// Keep the third-person camera out of houses, sheds and other solid things. The camera sits on a line from a point
// above the farmer's shoulders to where the player has swung it; if that line enters a building's footprint below
// its roof, the camera comes in to just before the wall instead of showing the inside of the tin. Pure: footprints
// are the layout's `blockers` (circles, or boxes turned by c = cos, s = sin of the prop's rotation), heights are
// metres above the ground at the farmer.

const ROOF = 4.6; // a house or shed's roof ridge; a camera higher than this passes over
const MIN_R = 0.9; // circles smaller than this are posts and tree trunks: the camera may brush past them

// where (0..1 along a→b) the 2D segment enters the shape grown by pad; null if it never does or a starts inside
function enterAt(b, ax, az, bx, bz, pad) {
  if (b.r) {
    if (b.r < MIN_R) return null;
    const r = b.r + pad, dx = bx - ax, dz = bz - az, fx = ax - b.x, fz = az - b.z;
    const A = dx * dx + dz * dz, B = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - r * r;
    if (C <= 0 || A === 0) return null; // the focus is inside, or there is no line
    const disc = B * B - 4 * A * C; if (disc < 0) return null;
    const t = (-B - Math.sqrt(disc)) / (2 * A);
    return t >= 0 && t <= 1 ? t : null;
  }
  // a box: into its own frame (as nav.js does), then the slab test
  const loc = (x, z) => { const dx = x - b.x, dz = z - b.z; return [dx * b.c - dz * b.s, dx * b.s + dz * b.c]; };
  const [u0, v0] = loc(ax, az), [u1, v1] = loc(bx, bz), hu = b.hw + pad, hv = b.hd + pad;
  if (Math.abs(u0) < hu && Math.abs(v0) < hv) return null;
  let lo = 0, hi = 1;
  for (const [p0, p1, h] of [[u0, u1, hu], [v0, v1, hv]]) {
    const d = p1 - p0;
    if (Math.abs(d) < 1e-9) { if (Math.abs(p0) >= h) return null; continue; }
    let ta = (-h - p0) / d, tb = (h - p0) / d; if (ta > tb) [ta, tb] = [tb, ta];
    lo = Math.max(lo, ta); hi = Math.min(hi, tb); if (lo > hi) return null;
  }
  return lo;
}

// How far along focus → camera (0..1) the camera can sit: 1 when nothing is in the way.
// f, c: [x, height above the farmer's ground, z]
export function camReach(blockers, f, c, { pad = 0.35, roof = ROOF } = {}) {
  let t = 1;
  for (const b of blockers ?? []) {
    const hit = enterAt(b, f[0], f[2], c[0], c[2], pad);
    if (hit === null || hit >= t) continue;
    const y = f[1] + (c[1] - f[1]) * hit; // the line only climbs from the shoulders, so its entry is its lowest point inside
    if (y > roof) continue;
    t = hit;
  }
  return Math.max(0, t - 0.02);
}

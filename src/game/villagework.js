// What the villagers of মাঠের মানুষ actually do with their hands, so nobody mimes work over bare grass. Pure: the
// routine of each kind of work site, in the site's own frame (x to the worker's right, z ahead, metres from where
// the worker stands at home), and what each finished step changes. life.js builds the site and walks people
// through it.
//
// A courtyard (a woman at her house, as in places.js): sweep the yard with the jharu, spread the paddy drying on
// the mat, winnow rice in the kula by the heap — then round again, as the morning's chores go.
// A field row (a picker on her own plot): along the row, one plant at a time into the basket on her arm, then the
// full basket is tipped out at the row's end and the plants have grown more by the time she is back.

export const ROW = 6; // plants in a picker's row
const SWEEP = [[-1.5, 0.5], [-1.0, 1.15], [-0.55, 1.7], [-1.35, 1.95], [-1.8, 1.3]]; // ahead of her: away from the house

export const COURTYARD = [
  { act: 'sweep', n: 5, dur: 2.6 },
  { act: 'spread', n: 2, dur: 3.4 },
  { act: 'winnow', n: 2, dur: 3.6 },
];

// the mat and the heap of a courtyard, the plants and the basket of a row, in the site's frame
export const SITE = {
  courtyard: { mat: [1.15, 1.6, 1.7, 1.2], heap: [1.95, 0.55] }, // mat: centre x, z, size x, z; z ahead = away from the house
  field: { plant: (k) => [-1.5 + k * 0.6, 0.95], basket: [-2.3, 0.3] },
};

export const siteKind = (f) => (f?.job ? f.job : Array.isArray(f?.at) && f.at[0] === 'house' ? 'courtyard' : 'field');
export const newJob = (kind) => ({ kind, task: 0, i: 0, picked: Array(ROW).fill(false), fill: 0 });

// the next step: where to stand (site frame), which way to face (radians, 0 = ahead), what to do and for how long
export function nextStep(job) {
  if (job.kind === 'courtyard') {
    const t = COURTYARD[job.task];
    if (t.act === 'sweep') {
      const [x, z] = SWEEP[job.i % SWEEP.length], [nx, nz] = SWEEP[(job.i + 1) % SWEEP.length];
      return { act: 'sweep', at: [x, z], face: Math.atan2(nx - x, nz - z), dur: t.dur };
    }
    const [mx, mz, sx] = SITE.courtyard.mat;
    if (t.act === 'spread') return { act: 'spread', at: [mx - sx / 2 - 0.35, mz + (job.i ? 0.35 : -0.3)], face: Math.PI / 2, dur: t.dur };
    const [hx, hz] = SITE.courtyard.heap;
    return { act: 'winnow', at: [hx - 0.75, hz], face: Math.PI / 2, dur: t.dur };
  }
  if (job.i < ROW) { const [x, z] = SITE.field.plant(job.i); return { act: 'pick', at: [x, z - 0.6], face: 0, dur: 2.4 }; }
  const [bx, bz] = SITE.field.basket;
  return { act: 'tip', at: [bx + 0.5, bz], face: -Math.PI / 2, dur: 2 };
}

// a step done: what changed, and the job's next state (a new object; the old one is left as it was)
export function finishStep(job) {
  const j = { ...job, picked: [...job.picked] };
  if (j.kind === 'courtyard') {
    j.i += 1;
    if (j.i >= COURTYARD[j.task].n) { j.task = (j.task + 1) % COURTYARD.length; j.i = 0; }
    return j;
  }
  if (j.i < ROW) { j.picked[j.i] = true; j.i += 1; j.fill = j.i / ROW; return j; }
  // the basket tipped out: the plants have set more pods by the time she starts the row again
  return { ...j, i: 0, fill: 0, picked: Array(ROW).fill(false) };
}

// site frame to world: the site faces `yaw` (as a person's root does: +z ahead), standing at (x, z)
export function toWorld(site, [lx, lz]) {
  const c = Math.cos(site.yaw), s = Math.sin(site.yaw);
  return [site.x + lx * c + lz * s, site.z - lx * s + lz * c];
}

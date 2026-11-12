// The body movements of the biomechanics lab (/games#biomechanics): one work cycle of each farm task as keyframes
// for the joints of the game's figure (people.js), and the geometry that measures the angles of the animated body.
// Pure numbers, no three.js, so they are tested (biomechPose.test.js).
//
// The poses are drawn to look like the real work (a transplanter stooped from the hips with soft knees and the hand
// reaching the mud, a kodal swung from overhead, a reaper crouched over the stalks). They are an animation, not a
// measurement: the lab's model numbers (trunk and knee angles, L4/L5 load, kcal) are its own inputs and are shown
// beside the angles measured on the figure, never replaced by them.
//
// Channels, in degrees: lean (trunk forward of upright), twist (trunk turned to the left), L0/L1 (hip flexion, thigh
// forward), K0/K1 (knee flexion), sf0/sf1 (shoulder flexion, arm raised forward), ef0/ef1 (elbow flexion), ab0/ab1
// (shoulder abduction, arm out to the side; negative brings it across the body), head (head pitched down from the
// trunk's line). Index 0 is the right side of the body, 1 the left.

const K = (...pairs) => pairs; // [[phase, value], ...] from 0 to 1, the last value equal to the first

export const TASK_MOTION = {
  transplant: {
    walk: false,
    event: { at: 0.5, kind: 'plant' }, // the seedlings pushed into the mud
    keys: {
      lean: K([0, 88], [0.35, 97], [0.5, 101], [0.62, 97], [1, 88]),
      twist: K([0, 4], [0.4, -2], [0.6, -2], [1, 4]),
      L0: K([0, 22], [0.5, 30], [1, 22]), L1: K([0, 22], [0.5, 30], [1, 22]),
      K0: K([0, 28], [0.5, 36], [1, 28]), K1: K([0, 28], [0.5, 36], [1, 28]),
      sf0: K([0, 72], [0.12, 70], [0.38, 104], [0.5, 101], [0.6, 98], [0.85, 74], [1, 72]),
      ef0: K([0, 45], [0.12, 48], [0.38, 8], [0.5, 4], [0.6, 10], [0.85, 40], [1, 45]),
      ab0: K([0, -18], [0.15, -20], [0.4, 0], [0.6, 0], [0.85, -15], [1, -18]),
      sf1: K([0, 76], [0.5, 80], [1, 76]), ef1: K([0, 58], [0.5, 52], [1, 58]), ab1: K([0, -14], [0.5, -10], [1, -14]),
      head: K([0, -38], [0.45, -28], [0.6, -30], [1, -38]),
    },
  },
  hoe: {
    walk: false,
    event: { at: 0.66, kind: 'strike' }, // the kodal's blade bites the soil
    keys: {
      lean: K([0, 40], [0.42, 12], [0.5, 10], [0.6, 30], [0.66, 52], [0.8, 50], [1, 40]),
      twist: K([0, 0], [0.45, 6], [0.66, -3], [1, 0]),
      L0: K([0, 6], [0.5, 2], [0.66, 12], [1, 6]), L1: K([0, 30], [0.5, 24], [0.66, 36], [1, 30]),
      K0: K([0, 26], [0.5, 18], [0.68, 34], [1, 26]), K1: K([0, 40], [0.5, 32], [0.68, 46], [1, 40]),
      sf0: K([0, 55], [0.42, 172], [0.5, 176], [0.6, 120], [0.66, 64], [0.8, 52], [1, 55]),
      ef0: K([0, 25], [0.42, 80], [0.5, 86], [0.6, 40], [0.66, 10], [0.8, 20], [1, 25]),
      ab0: K([0, -12], [0.5, -6], [0.66, -14], [1, -12]),
      sf1: K([0, 50], [0.42, 160], [0.5, 165], [0.6, 112], [0.66, 58], [0.8, 46], [1, 50]),
      ef1: K([0, 45], [0.42, 95], [0.5, 100], [0.6, 55], [0.66, 30], [0.8, 40], [1, 45]),
      ab1: K([0, -16], [0.5, -8], [0.66, -18], [1, -16]),
      head: K([0, 12], [0.45, -18], [0.66, 18], [1, 12]),
    },
  },
  spray: {
    walk: true, speed: 0.5, // metres a second over the bund, a slow walk with the tank on the back
    event: null,
    keys: { // arms only: the legs and trunk come from the game's walk
      sf0: K([0, 38], [0.5, 44], [1, 38]), ef0: K([0, 38], [0.5, 30], [1, 38]), ab0: K([0, -2], [0.25, 10], [0.75, -14], [1, -2]),
      sf1: K([0, 8], [0.5, 34], [1, 8]), ef1: K([0, 70], [0.5, 40], [1, 70]), ab1: K([0, 12], [1, 12]),
    },
  },
  sickle: {
    walk: false,
    event: { at: 0.55, kind: 'cut' }, // the sickle draws through the stalks
    keys: {
      lean: K([0, 56], [0.5, 63], [1, 56]),
      twist: K([0, 0], [0.55, -8], [0.8, 10], [1, 0]),
      L0: K([0, 64], [1, 64]), L1: K([0, 60], [1, 60]),
      K0: K([0, 94], [0.5, 98], [1, 94]), K1: K([0, 90], [0.5, 94], [1, 90]),
      sf0: K([0, 80], [0.3, 90], [0.45, 98], [0.6, 95], [0.8, 80], [1, 80]),
      ef0: K([0, 40], [0.3, 30], [0.45, 15], [0.6, 25], [1, 40]),
      ab0: K([0, 25], [0.3, 30], [0.55, -26], [0.65, -24], [0.85, 15], [1, 25]),
      sf1: K([0, 86], [0.25, 100], [0.55, 100], [0.75, 70], [0.9, 62], [1, 86]),
      ef1: K([0, 30], [0.25, 14], [0.55, 20], [0.75, 50], [1, 30]),
      ab1: K([0, 0], [0.25, -10], [0.55, -10], [0.8, 34], [1, 0]),
      head: K([0, -24], [0.5, -18], [1, -24]),
    },
  },
  basket: {
    walk: true, speed: 0.55,
    event: null,
    keys: { // both hands up steadying the basket on the head
      sf0: K([0, 158], [0.5, 162], [1, 158]), ef0: K([0, 78], [0.5, 72], [1, 78]), ab0: K([0, 24], [1, 24]),
      sf1: K([0, 160], [0.5, 156], [1, 160]), ef1: K([0, 74], [0.5, 80], [1, 74]), ab1: K([0, 24], [1, 24]),
    },
  },
  weeding: {
    walk: false,
    event: { at: 0.8, kind: 'pluck' }, // the loosened weed pulled out by the left hand
    keys: {
      lean: K([0, 52], [0.5, 58], [1, 52]),
      twist: K([0, 0], [0.8, -4], [0.92, 8], [1, 0]),
      L0: K([0, 74], [1, 74]), L1: K([0, 70], [1, 70]),
      K0: K([0, 108], [0.5, 112], [1, 108]), K1: K([0, 104], [0.5, 108], [1, 104]),
      sf0: K([0, 95], [0.15, 108], [0.3, 92], [0.45, 108], [0.6, 92], [1, 95]),
      ef0: K([0, 20], [0.15, 8], [0.3, 30], [0.45, 8], [0.6, 30], [1, 20]),
      ab0: K([0, -4], [0.15, -8], [0.45, -8], [1, -4]),
      sf1: K([0, 80], [0.6, 82], [0.72, 100], [0.8, 98], [0.92, 66], [1, 80]),
      ef1: K([0, 40], [0.72, 10], [0.8, 15], [0.92, 60], [1, 40]),
      ab1: K([0, -5], [0.72, -12], [0.92, 40], [1, -5]),
      head: K([0, -26], [0.5, -20], [1, -26]),
    },
  },
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t)); // smooth in and out of every key

// A channel's value at phase p (0..1, wrapping), eased between keys.
export function sampleKeys(keys, p) {
  const ph = ((p % 1) + 1) % 1;
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i], [b, vb] = keys[i + 1];
    if (ph >= a && ph <= b) return va + (vb - va) * ease(b > a ? (ph - a) / (b - a) : 0);
  }
  return keys[keys.length - 1][1];
}

const CHANNELS = ['lean', 'twist', 'L0', 'L1', 'K0', 'K1', 'sf0', 'sf1', 'ef0', 'ef1', 'ab0', 'ab1', 'head'];

// The pose of a task at a phase of its cycle, in degrees; channels a task does not set are absent.
export function taskPose(id, p) {
  const m = TASK_MOTION[id] ?? TASK_MOTION.transplant;
  const out = {};
  for (const c of CHANNELS) if (m.keys[c]) out[c] = sampleKeys(m.keys[c], p);
  return out;
}

// Seconds for one cycle from the model's cadence (movements a minute); slower or faster with effort.
export const cycleSeconds = (cadence, effort = 1) => 60 / Math.max(1, cadence * Math.max(0.3, effort));

// ---- angles measured on the body: points are [x, y, z] in metres, y up ----
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
export function angleDeg(u, v) {
  const d = len(u) * len(v);
  if (d < 1e-9) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot(u, v) / d))) * 180) / Math.PI;
}
// trunk forward of vertical: the pelvis-to-neck line against straight up
export const trunkFlexion = (pelvis, neck) => angleDeg(sub(neck, pelvis), [0, 1, 0]);
// knee and hip flexion: 0 when the limb is straight, more as it folds
export const kneeFlexion = (hip, knee, ankle) => 180 - angleDeg(sub(hip, knee), sub(ankle, knee));
export const hipFlexion = (neck, hip, knee) => 180 - angleDeg(sub(neck, hip), sub(knee, hip));

// The model's stress profile (0..100 per region) scaled by the effort slider, as 0..1 loads for the heat map.
export function muscleLoads(profile, effort = 1) {
  const f = (v) => clamp01(((v ?? 0) * effort) / 100);
  return { lumbar: f(profile?.lumbar), knee: f(profile?.knee), shoulder: f(profile?.shoulder), cardiac: f(profile?.cardiac) };
}
// the lab's bands for a load in percent: the same cut-offs the 2D lab used (65 and 85)
export const stressBand = (pct) => (pct > 85 ? 'high' : pct > 65 ? 'raised' : 'ok');

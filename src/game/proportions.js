// Body proportions of the people of মাঠের মানুষ: a realistic adult, about seven heads tall, legs half the height,
// shoulders, hands and feet at life size. (The figure was a big-headed semi-chibi toy for a while; the player asked
// for real-life bodies on 2026-11-05.) Pure numbers, so the figure's height, its head count and its feet on the
// ground can be tested without three.js; people.js builds the body from them. Lengths are metres in the figure's own
// space (before look.build scales a farmer).

export const STYLE = {
  head: 1.05, // the head and everything on it (hair, cap, turban, face): a touch over life size, so faces still read from the game camera
  neckY: 0.16, // head centre above the base of the neck
  aoY: 0.125, // atlanto-occipital joint height above the base of the neck (cranial articulation pivot)
  aoZ: -0.020, // atlanto-occipital joint anteroposterior offset (posterior condyles)
  thigh: 0.44, // hip to knee
  shin: 0.42, // knee to ankle
  legThick: 1, // leg radii
  armThick: 1, // arm radii
  shoulder: 1, // shoulder joints
  torsoWide: 1, // the torso's width
  hand: 1, // hands
  foot: 1, // feet and shoes
  stance: 0.035, // radians each leg turns outward when standing: feet a natural hip-width apart
};

// Where things sit, derived from STYLE so the figure always stands on the ground.
const TORSO_TOP = 0.57; // hips to the base of the neck (torso at +0.02, neck at +0.55)
const HEAD_UP = 0.127, HEAD_DOWN = 0.114; // unscaled head: crown above its centre, chin below it
const SOLE = 0.05; // unscaled: the lowest point of a shoe below the ankle joint
export const SHIN_POS = STYLE.shin + 0.02; // knee to ankle joint (the shin's rounded end overlaps the foot)
export const HIP_Y = STYLE.thigh + SHIN_POS + SOLE * STYLE.foot - 0.01; // shoes sink a centimetre into the soil
export const DOWN_HIP_Y = HIP_Y * (0.3 / 0.92); // sitting on the heels, as the realistic body did at 0.3 of 0.92

export function figure(style = STYLE) {
  const headH = (HEAD_UP + HEAD_DOWN) * style.head;
  const height = HIP_Y + TORSO_TOP + style.neckY + HEAD_UP * style.head;
  return { height, headH, heads: height / headH, legShare: HIP_Y / height, neckGap: style.neckY - HEAD_DOWN * style.head };
}

// Standing still with both hands in the trouser pockets: upper arms a little back and in, elbows bent, so the wrist
// lands on the front pocket of the hip, at (±0.135, −0.02, 0.085) m from the hip joint (on the cloth of the thigh). The angles were solved for
// that point on this arm (shoulder 0.205 m out and 0.485 m up, upper arm 0.28, forearm 0.27) and are checked in the
// test; the hand then shrinks to `handIn` of its size, into the pocket.
export const POCKET = { shoulderX: 0.18, shoulderZ: 0.145, elbowX: -0.7, handIn: 0.3, at: [0.135, -0.02, 0.085] };
export const ARM = { shoulderUp: 0.485, upper: 0.28, fore: 0.27 };
// Trousers have pockets (under a kurta, reached through its side slit); a lungi or dhoti has the fold at the waist,
// where the hands tuck in the same way. Skirts, saris and the longyi have neither: those figures rest their hands
// loosely at their sides.
export const hasPockets = (look) => ['pyjama', 'shalwar', 'cargo', 'lungi', 'dhoti'].includes(look?.lower);

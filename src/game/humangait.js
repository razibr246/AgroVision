// How people walk and run in মাঠের মানুষ, as numbers only (no three.js), so it can be tested: the human counterpart of
// gait.js (the animals). people.js `animate()` turns these numbers into the coded figure's joint angles, and
// realPeople.js carries them onto the real MakeHuman skeleton.
//
// The model is the one used for game characters that must not skate: each foot follows a path under the hip.
//   stance  the foot is on the ground and moves back under the body at exactly the body's speed (so it does not slide):
//           heel strike with the toes up, the foot rolls flat, then the heel lifts and it rolls over the ball of the
//           foot (the ball stays where it is on the ground) until the toes leave it;
//   swing   the foot comes forward, lifted and with the ankle bent up so the toes clear the ground, and is set down
//           again with the heel.
// The hip and knee angles come from the foot's place by two-bone inverse kinematics (gait.js legIK), so the knee is
// nearly straight at heel strike, gives a little as the weight comes on, and folds well up in the swing.
// Stride follows ground speed: cadence (steps per second) rises with speed as it does in people (about 1.9 steps a
// second at 1.4 m/s walking, 2.7–3 running) and the step length is speed / cadence. A long skirt or sari caps the step.
// Walking keeps a foot on the ground all the time (two at once around each heel strike) and the hips are lowest then;
// running has a flight phase between steps and the hips are lowest in the middle of each stance.
import { legIK, clamp, smooth01 } from './gait.js';

// the figure's leg in its own units (proportions.js: thigh 0.44, knee to ankle 0.44, the ankle joint 4 cm above the
// ground; the ball of the foot 12 cm in front of the ankle). The leg is solved as the line hip–knee–ankle: at the
// figure's rest (knee turned 0) that line is straight, which is how the real skeleton is lined up to it.
export const LEG = { a: 0.44, b: 0.44, ankle: 0.04, toe: 0.12, heel: 0.05 };
const B = LEG.b;
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

// steps per second at `speed` m/s; runness 0 is a walk, 1 a run. stepMax (m) caps a step (a sari, a long skirt): the
// person takes shorter, quicker steps instead.
export function cadence(speed, runness = 0, stepMax = Infinity) {
  const walk = 1.45 + 0.32 * speed, run = 2.45 + 0.09 * speed;
  let c = lerp(walk, run, runness);
  if (speed / c > stepMax) c = Math.min(4, speed / stepMax);
  return c;
}

// The stride at this speed: cadence, the stride's period (two steps), the share of it each foot is on the ground,
// how far a planted foot travels back under the hip, the step length, and how much of that travel is in front.
export function gaitParams(speed, runness = 0, stepMax = Infinity) {
  speed = Math.max(0, speed);
  const cad = cadence(speed, runness, stepMax);
  const T = 2 / cad;
  let duty = lerp(clamp(0.64 - 0.03 * speed, 0.56, 0.64), clamp(0.42 - 0.025 * speed, 0.26, 0.4), runness);
  // a planted foot can only travel so far under the hip before the leg runs out: past that, a runner spends less time
  // on the ground (and more in the air) rather than overreaching
  const maxTravel = lerp(1.05, 0.78, runness);
  if (speed * T * duty > maxTravel) duty = Math.max(runness > 0.5 ? 0.16 : 0.52, maxTravel / (speed * T));
  return { cad, T, duty, travel: speed * T * duty, step: speed / cad, front: lerp(0.44, 0.4, runness) };
}

// the ankle's place (z forward of the hip, y up from the ground) and the foot's pitch (phi, toes down positive) for a
// foot `p` (0..1) through its own stride; p = 0 is heel strike. amt (0..1) scales the step's motions in from standing.
const foot = { z: 0, y: 0, phi: 0, stance: true, s: 0 };
export function footAt(p, G, r, amt = 1, out = foot) {
  p = ((p % 1) + 1) % 1;
  const { duty, travel, front } = G;
  const zF = travel * front;
  const phiHS = lerp(-0.3, -0.06, r) * amt, phiTO = lerp(0.72, 0.9, r) * amt;
  const heelOff = lerp(0.6, 0.45, r);
  if (p < duty) {
    const s = p / duty, cz = zF - travel * s;
    out.stance = true; out.s = s;
    if (s < 0.2 && phiHS < 0) { // on the heel: the heel is the pivot, still on the ground
      const phi = phiHS * (1 - smooth01(s / 0.2));
      out.phi = phi; out.z = cz - LEG.heel + LEG.heel * Math.cos(phi) + LEG.ankle * Math.sin(phi);
      out.y = -LEG.heel * Math.sin(phi) + LEG.ankle * Math.cos(phi);
    } else if (s > heelOff) { // the heel is up: rolling over the ball of the foot, which stays put
      const phi = phiTO * Math.pow((s - heelOff) / (1 - heelOff), 1.6);
      out.phi = phi; out.z = cz + LEG.toe - LEG.toe * Math.cos(phi) + LEG.ankle * Math.sin(phi);
      out.y = LEG.toe * Math.sin(phi) + LEG.ankle * Math.cos(phi);
    } else { out.phi = 0; out.z = cz; out.y = LEG.ankle; }
    return out;
  }
  // the swing: from toe-off to the next heel strike along a curve whose ends move with the ground (no jerk at lift or
  // landing), lifted in the middle, the ankle bent up early so the toes clear and the heel leads at the end
  const s = (p - duty) / (1 - duty);
  const zB = zF - travel;
  const zT = zB + LEG.toe - LEG.toe * Math.cos(phiTO) + LEG.ankle * Math.sin(phiTO), yT = LEG.toe * Math.sin(phiTO) + LEG.ankle * Math.cos(phiTO);
  const zH = zF - LEG.heel + LEG.heel * Math.cos(phiHS) + LEG.ankle * Math.sin(phiHS), yH = -LEG.heel * Math.sin(phiHS) + LEG.ankle * Math.cos(phiHS);
  const m = -travel * ((1 - duty) / Math.max(0.05, duty)) * 0.55; // the ends' slope: moving back with the ground
  const s2 = s * s, s3 = s2 * s;
  out.z = (2 * s3 - 3 * s2 + 1) * zT + (s3 - 2 * s2 + s) * m + (-2 * s3 + 3 * s2) * zH + (s3 - s2) * m;
  const v = travel / Math.max(0.05, G.T * duty);
  const lift = lerp(0.06 + 0.012 * Math.min(2.5, v), 0.14 + 0.03 * Math.min(7, v), r) * amt;
  out.y = lerp(yT, yH, smooth01(s)) + lift * Math.sin(Math.PI * Math.pow(s, lerp(0.8, 0.6, r)));
  out.phi = phiTO * (1 - smooth01(s / 0.4)) - 0.12 * amt * Math.sin(Math.PI * s) + phiHS * smooth01((s - 0.55) / 0.45);
  out.stance = false; out.s = s;
  return out;
}

// Hip height above the ground for a stride at phase p (leg 0's), in the figure's units. The hips are as high as the
// planted leg(s) allow with the knee at the bend it has at that point of the stance (walking: almost straight at heel
// strike, about 17° as the weight comes on, straight again over the foot; running: about 20°
// at landing, 45° in mid-stance). With two feet down the lower limit holds, so a walk is lowest at heel strike and
// highest over the planted foot. With no foot down (a run's flight) the hips fly a ballistic arc between take-off and
// landing.
const tmp = { z: 0, y: 0, phi: 0, stance: true, s: 0 };
const reachAt = (knee) => Math.sqrt(LEG.a * LEG.a + B * B + 2 * LEG.a * B * Math.cos(knee));
const stanceKnee = (s, r) => {
  const walk = 0.08 + 0.2 * Math.sin(Math.PI * Math.min(1, s / 0.45)); // a trailing leg on its toes never holds the hips down
  const run = 0.3 + 0.48 * Math.sin(Math.PI * s);
  return lerp(walk, run, r);
};
function stanceLimit(p, G, r, amt) {
  let y = Infinity;
  for (let i = 0; i < 2; i++) {
    const f = footAt(p + i * 0.5, G, r, amt, tmp);
    if (!f.stance) continue;
    const d = reachAt(stanceKnee(f.s, r) * amt);
    y = Math.min(y, f.y + Math.sqrt(Math.max(0, d * d - f.z * f.z)));
  }
  return y;
}
export function hipHeight(p, G, r, amt = 1, stand = LEG.a + LEG.b + LEG.ankle) {
  p = ((p % 1) + 1) % 1;
  let y = stanceLimit(p, G, r, amt);
  if (y === Infinity) {
    // in the air: from the take-off of the leg that left the ground to the landing of the other
    const q = p % 0.5, tf = (0.5 - G.duty) * G.T, tau = (q - G.duty) * G.T;
    const y0 = stanceLimit(p - q + G.duty - 1e-4, G, r, amt), y1 = stanceLimit(p - q + 0.5, G, r, amt);
    const g = 9.81, v0 = (y1 - y0) / tf + (g * tf) / 2;
    y = y0 + v0 * tau - (g * tau * tau) / 2;
  }
  // real walkers soften the stance knee at the top of the step, so the hips rise only ~4–5 cm above the double-
  // support low point instead of vaulting over a straight leg (that read as a bouncy, hiking gait)
  if (r < 0.5) {
    const low = stanceLimit(0, G, r, amt);
    if (Number.isFinite(low)) y = Math.min(y, low + 0.052);
  }
  return Math.min(stand, y) * amt + stand * (1 - amt);
}

// Joint angles for one leg reaching an ankle target (z, y) from a hip at height hy: the thigh's turn about x (the
// figure's convention: positive swings it back), the knee's bend (positive) and the foot's turn that gives the foot
// the pitch phi in the world. A target out of reach leaves the leg straight towards it.
export function legAngles(z, y, hy, phi, out = {}) {
  const [u, l] = legIK(LEG.a, B, z, y - hy, 1);
  out.thigh = -u; out.knee = Math.max(0, u - l); out.foot = phi + (out.knee === 0 ? u : l);
  return out;
}

// The whole lower body and the arms for a stride at phase p (leg 0's; leg 1 is half a stride behind).
// speed m/s in the figure's units, r runness 0..1, amt how far into a step from standing (0..1).
// opts: stepMax, hipX [x of each hip joint], slopeF/slopeS (ground rise per metre forward / to the figure's +x).
export function stridePose(p, speed, r, amt, opts = {}) {
  const G = gaitParams(speed, r, opts.stepMax ?? Infinity);
  const hipX = opts.hipX ?? [-0.092, 0.092];
  const hy = hipHeight(p, G, r, amt);
  const yawAmp = lerp(0.03 + 0.02 * Math.min(2, speed), 0.1, r) * amt;
  const yaw = yawAmp * Math.cos(TAU * p); // the pelvis turns the hip of the leg reaching forward, forward
  const list = -lerp(0.06, 0.035, r) * amt * Math.sin(TAU * (p - 0.06)); // drops on the side of the swinging leg
  const sway = -lerp(0.022, 0.01, r) * amt * Math.sin(TAU * (p - 0.06)); // over the planted foot
  const legs = [];
  for (let i = 0; i < 2; i++) {
    const f = footAt(p + i * 0.5, G, r, amt, {});
    // the hip joint moves as the pelvis turns and tilts: aim the foot from where the joint really is
    const hz = -hipX[i] * Math.sin(yaw), hyi = hy + hipX[i] * Math.sin(list);
    const ground = (opts.slopeF ?? 0) * f.z + (opts.slopeS ?? 0) * hipX[i];
    const ang = legAngles(f.z - hz, f.y + ground, hyi, f.phi + Math.atan(opts.slopeF ?? 0) * (f.stance ? 1 : 0.5));
    legs.push({ ...ang, z: f.z, y: f.y + ground, phi: f.phi, stance: f.stance, s: f.s });
  }
  // arms swing from the shoulder against the legs (the right arm forward with the left leg), a little more forward
  // than back; elbows bend more as the arm comes forward, and are held bent when running
  const armAmp = lerp(0.12 + 0.12 * Math.min(2.2, speed), 0.5 + 0.03 * Math.min(6, speed), r) * amt;
  const arms = [];
  for (let i = 0; i < 2; i++) {
    const c = Math.cos(TAU * (p + i * 0.5) - 0.25); // +1: this leg forward, so this arm back
    const sh = armAmp * c - 0.05 * amt; // shoulder turn about x: negative is forward
    const el = -(lerp(0.22, 1.45, r) * amt + Math.max(0, -sh) * lerp(0.5, 0.35, r)); // elbow bend (negative)
    arms.push({ shoulder: sh, elbow: el });
  }
  return { G, hipY: hy, yaw, list, sway, legs, arms, lean: lerp(0.03, 0.14, r) * amt };
}

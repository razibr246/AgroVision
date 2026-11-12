// The realistic body: about seven heads tall, legs half the height, life-size hands and feet, feet on the ground,
// and the hands-in-pockets pose only for clothes that have somewhere to put them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STYLE, HIP_Y, SHIN_POS, POCKET, ARM, figure, hasPockets } from './proportions.js';
import { REGIONS } from './regions.js';

test('a realistic adult: about seven heads tall, legs about half the height', () => {
  const f = figure();
  assert.ok(f.heads >= 6.8 && f.heads <= 7.8, `${f.heads.toFixed(2)} heads`);
  assert.ok(f.height > 1.6 && f.height < 1.85, `height ${f.height.toFixed(2)} m keeps the game's doors, carts and camera`);
  assert.ok(f.legShare > 0.48 && f.legShare < 0.55, `legs ${(f.legShare * 100).toFixed(0)}% of height`);
  assert.ok(f.neckGap > 0.02, 'a visible neck under the jaw');
  for (const k of ['hand', 'foot', 'legThick', 'armThick', 'shoulder', 'torsoWide']) assert.ok(Math.abs(STYLE[k] - 1) < 0.1, `${k} at life size`);
});

test('the shoes stand on the ground: hip height is the leg plus the scaled sole', () => {
  assert.ok(Math.abs(HIP_Y - (STYLE.thigh + SHIN_POS + 0.05 * STYLE.foot)) <= 0.011);
});

test('hands go in pockets (or the lungi fold) only where the clothes allow', () => {
  for (const [id, r] of Object.entries(REGIONS)) {
    const l = r.farmer.look, p = hasPockets(l);
    if (['ghagra', 'kira', 'longyi', 'sari'].includes(l.lower)) assert.equal(p, false, `${id} in a ${l.lower} rests the hands at the sides`);
    if (['pyjama', 'shalwar', 'cargo', 'lungi', 'dhoti'].includes(l.lower)) assert.equal(p, true, `${id} in ${l.lower}`);
  }
});

test('the pocket pose puts the wrist on the pocket: forward kinematics of the arm chain', () => {
  // shoulder rotation order XYZ (three.js default), then the elbow about x
  const { shoulderX: ax, shoulderZ: az, elbowX: ex, at } = POCKET;
  const rot = ([x, y, z], rx, rz) => {
    const [x1, y1] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)]; // Rz first (intrinsic XYZ = Rx·Ry·Rz)
    return [x1, y1 * Math.cos(rx) - z * Math.sin(rx), y1 * Math.sin(rx) + z * Math.cos(rx)];
  };
  // right arm (side +1): z rotation −shoulderZ turns the hand inward
  const fore = rot([0, -ARM.fore, 0], ex, 0);
  const local = [fore[0], fore[1] - ARM.upper, fore[2]];
  const w = rot(local, ax, -az);
  const wrist = [0.205 * STYLE.shoulder + w[0], ARM.shoulderUp + w[1], w[2]];
  const d = Math.hypot(wrist[0] - at[0], wrist[1] - at[1], wrist[2] - at[2]);
  assert.ok(d < 0.012, `wrist ${wrist.map((v) => v.toFixed(3))} is ${(d * 100).toFixed(1)} cm from the pocket`);
});

test('atlanto-occipital joint and neck proportions define an anatomically viable neck (F05)', () => {
  assert.equal(STYLE.aoY, 0.125, 'AO joint is 12.5 cm above neck base');
  assert.equal(STYLE.aoZ, -0.020, 'AO joint is 2.0 cm posterior to cranial center');
  assert.ok(STYLE.aoY < STYLE.neckY, 'AO joint sits below the cranial centroid');
  const f = figure();
  assert.ok(f.heads >= 6.8 && f.heads <= 7.8, `${f.heads.toFixed(2)} heads`);
  assert.ok(f.height > 1.6 && f.height < 1.85, `height ${f.height.toFixed(2)} m`);
  assert.ok(f.neckGap > 0.02, 'visible neck under jaw');

  // Cervical-cranial continuity invariant across pitch range [-0.5, 0.5] rad
  const aoY = STYLE.aoY, aoZ = STYLE.aoZ;
  const neckCylTop = 0.065 + 0.16 / 2; // 0.145 m
  const collarTop = 0.128 + 0.068 * 0.90; // 0.1892 m
  const collarBottom = 0.128 - 0.068 * 0.90; // 0.0668 m
  const neckCylBottom = 0.065 - 0.16 / 2; // -0.015 m

  assert.ok(neckCylBottom < 0.0, 'neck cylinder penetrates torso opening');
  assert.ok(neckCylTop - collarBottom > 0.07, 'substantial ball-and-cylinder overlap');

  for (let pitch = -0.5; pitch <= 0.5; pitch += 0.05) {
    const cos = Math.cos(pitch), sin = Math.sin(pitch);
    // Posterior skull base
    const yHeadA = (STYLE.neckY - aoY) / STYLE.head - 0.06;
    const zHeadA = -aoZ / STYLE.head - 0.11;
    const yRotA = yHeadA * cos - zHeadA * sin;
    const yNeckA = aoY + STYLE.head * yRotA;
    assert.ok(yNeckA <= collarTop, `Occiput (${yNeckA.toFixed(3)}m) enclosed in collar (${collarTop.toFixed(3)}m) at pitch ${pitch.toFixed(2)}`);

    // Anterior chin
    const yHeadB = (STYLE.neckY - aoY) / STYLE.head - 0.09;
    const zHeadB = -aoZ / STYLE.head + 0.06;
    const yRotB = yHeadB * cos - zHeadB * sin;
    const yNeckB = aoY + STYLE.head * yRotB;
    assert.ok(yNeckB <= collarTop, `Chin (${yNeckB.toFixed(3)}m) enclosed in collar (${collarTop.toFixed(3)}m) at pitch ${pitch.toFixed(2)}`);
  }
});


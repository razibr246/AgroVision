import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TASK_MOTION, sampleKeys, taskPose, cycleSeconds, angleDeg, trunkFlexion, kneeFlexion, hipFlexion, muscleLoads, stressBand } from './biomechPose.js';

test('every task cycle closes on itself, so the loop has no jump', () => {
  for (const [id, m] of Object.entries(TASK_MOTION)) {
    for (const [ch, keys] of Object.entries(m.keys)) {
      assert.equal(keys[0][0], 0, `${id}.${ch} starts at 0`);
      assert.equal(keys.at(-1)[0], 1, `${id}.${ch} ends at 1`);
      assert.equal(keys[0][1], keys.at(-1)[1], `${id}.${ch} ends where it starts`);
      for (let i = 1; i < keys.length; i++) assert.ok(keys[i][0] >= keys[i - 1][0], `${id}.${ch} keys in order`);
    }
  }
});

test('poses stay inside what a human joint can do', () => {
  for (const id of Object.keys(TASK_MOTION)) {
    for (let p = 0; p < 1; p += 0.02) {
      const q = taskPose(id, p);
      for (const k of ['K0', 'K1']) if (q[k] !== undefined) assert.ok(q[k] >= 0 && q[k] <= 140, `${id} knee ${q[k]}`);
      for (const k of ['ef0', 'ef1']) if (q[k] !== undefined) assert.ok(q[k] >= 0 && q[k] <= 145, `${id} elbow ${q[k]}`);
      for (const k of ['sf0', 'sf1']) if (q[k] !== undefined) assert.ok(q[k] >= -40 && q[k] <= 180, `${id} shoulder ${q[k]}`);
      for (const k of ['L0', 'L1']) if (q[k] !== undefined) assert.ok(q[k] >= -20 && q[k] <= 120, `${id} hip ${q[k]}`);
      if (q.lean !== undefined) assert.ok(q.lean >= 0 && q.lean <= 110, `${id} trunk ${q.lean}`);
    }
  }
});

test('the work tasks have the body positions they are known for', () => {
  const avg = (id, ch) => { let s = 0; for (let i = 0; i < 50; i++) s += taskPose(id, i / 50)[ch]; return s / 50; };
  assert.ok(avg('transplant', 'lean') > 80, 'transplanting is a deep stoop from the hips');
  assert.ok(avg('transplant', 'K0') < 45, '... with soft knees');
  assert.ok(avg('weeding', 'K0') > avg('transplant', 'K0') + 50, 'weeding is a crouch');
  assert.ok(Math.max(...Array.from({ length: 50 }, (_, i) => taskPose('hoe', i / 50).sf0)) > 160, 'the kodal goes overhead');
  assert.equal(TASK_MOTION.spray.walk && TASK_MOTION.basket.walk, true, 'spraying and carrying are walked');
});

test('keys are eased and wrap around', () => {
  const keys = [[0, 0], [0.5, 10], [1, 0]];
  assert.equal(sampleKeys(keys, 0), 0);
  assert.equal(sampleKeys(keys, 0.5), 10);
  assert.ok(Math.abs(sampleKeys(keys, 0.25) - 5) < 1e-9);
  assert.ok(sampleKeys(keys, 0.05) < 0.5, 'eased: slow out of a key');
  assert.ok(Math.abs(sampleKeys(keys, 1.25) - sampleKeys(keys, 0.25)) < 1e-9);
});

test('cycle time follows the cadence and effort', () => {
  assert.ok(Math.abs(cycleSeconds(18) - 60 / 18) < 1e-9);
  assert.ok(cycleSeconds(18, 1.5) < cycleSeconds(18, 1));
});

test('angles measured from joint positions', () => {
  assert.ok(Math.abs(angleDeg([1, 0, 0], [0, 1, 0]) - 90) < 1e-9);
  assert.ok(Math.abs(trunkFlexion([0, 1, 0], [0, 1.5, 0])) < 1e-9, 'upright trunk is 0');
  assert.ok(Math.abs(trunkFlexion([0, 1, 0], [0, 1, 0.5]) - 90) < 1e-9, 'horizontal trunk is 90');
  assert.ok(Math.abs(kneeFlexion([0, 1, 0], [0, 0.5, 0], [0, 0, 0])) < 1e-9, 'straight leg');
  assert.ok(Math.abs(kneeFlexion([0, 1, 0], [0, 0.5, 0], [0, 0.5, -0.5]) - 90) < 1e-9, 'shin at right angles');
  assert.ok(Math.abs(hipFlexion([0, 1.5, 0], [0, 1, 0], [0, 1, 0.5]) - 90) < 1e-9, 'thigh forward at right angles');
});

test('muscle loads come from the model profile and effort, clamped to 0..1', () => {
  const l = muscleLoads({ lumbar: 82, knee: 74, shoulder: 35, cardiac: 58 }, 1);
  assert.deepEqual(l, { lumbar: 0.82, knee: 0.74, shoulder: 0.35, cardiac: 0.58 });
  assert.equal(muscleLoads({ lumbar: 94 }, 1.6).lumbar, 1);
  assert.equal(stressBand(90), 'high');
  assert.equal(stressBand(70), 'raised');
  assert.equal(stressBand(40), 'ok');
});

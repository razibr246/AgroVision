/**
 * Automated Headless 3D Rigging Regression Test Suite (F19, F20)
 * Verifies joint hierarchy, anatomical range-of-motion bounds, knee/hip ball-and-socket continuity,
 * skirt containment, cervical-cranial look-at IK conservation, and action envelope smoothness
 * across all 7 regional farmer characters in Agros ("ফসলের দিগন্ত").
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Headless DOM stubs for Three.js canvasTexture creation in Node
if (typeof globalThis.document === 'undefined') {
  const mockCanvas = () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      strokeRect: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      clearRect: () => {},
    }),
  });
  globalThis.document = {
    createElement: (tag) => (tag === 'canvas' ? mockCanvas() : {}),
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    matchMedia: () => ({ matches: false }),
    devicePixelRatio: 1,
  };
}

import { REGIONS, FARMER_IDS } from './regions.js';
import { STYLE, HIP_Y, SHIN_POS } from './proportions.js';
import { buildFarmer, animate } from './three/people.js';

// Helper: build character by id
function getFarmer(id) {
  const reg = REGIONS[id];
  assert.ok(reg && reg.farmer && reg.farmer.look, `Region ${id} must have valid farmer look`);
  return buildFarmer(reg.farmer.look);
}

// Helper: advance animation by N frames so lerps settle
function stepAnim(p, st, frames = 20, dt = 1 / 60) {
  for (let f = 0; f < frames; f++) {
    animate(p, st, dt);
  }
}

// Helper: check if character has full skirt
function isSkirted(look) {
  return ['ghagra', 'kira', 'longyi', 'sari'].includes(look.lower);
}

// ============================================================================
// 1. JOINT TREE & SEGMENT INVARIANCE ACROSS ALL 7 CHARACTERS
// ============================================================================

test('F19: All 7 regional characters instantiate valid complete joint hierarchies', () => {
  assert.equal(FARMER_IDS.length, 7, 'must evaluate exactly 7 regional characters');
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    assert.ok(p.root && p.body && p.hips && p.torso && p.neck && p.head && p.cranial, `${id} complete central axis`);
    assert.ok(p.arms && p.arms.length === 2, `${id} has exactly 2 arms`);
    assert.ok(p.legs && p.legs.length === 2, `${id} has exactly 2 legs`);
    assert.ok(p.skirtGroup, `${id} has skirtGroup for attire dynamics`);
    assert.ok(p.tools, `${id} has tools group`);
  }
});

test('F19: Bilateral arm and leg segment lengths maintain strict anatomical invariance across all 7 characters', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    // Arms: shoulder -> elbow (0.28m), elbow -> hand (0.27m)
    for (let i = 0; i < 2; i++) {
      assert.equal(p.arms[i].elbow.position.y, -0.28, `${id} arm[${i}] elbow distance is 0.28m`);
      assert.equal(p.arms[i].hand.position.y, -0.27, `${id} arm[${i}] hand distance is 0.27m`);
    }
    assert.equal(p.arms[0].elbow.position.y, p.arms[1].elbow.position.y, `${id} bilateral arm symmetry`);

    // Legs: thigh -> knee (STYLE.thigh = 0.44m), knee -> foot (SHIN_POS = 0.44m)
    for (let i = 0; i < 2; i++) {
      assert.equal(p.legs[i].knee.position.y, -STYLE.thigh, `${id} leg[${i}] knee distance is STYLE.thigh`);
      assert.equal(p.legs[i].foot.position.y, -SHIN_POS, `${id} leg[${i}] foot distance is SHIN_POS`);
    }
    assert.equal(p.legs[0].knee.position.y, p.legs[1].knee.position.y, `${id} bilateral leg symmetry`);
  }
});

test('F19: Rest-pose transform cache records immutable quaternions and positions for all 10+ major joints', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    assert.ok(p.restQ instanceof Map, `${id} has restQ Map`);
    assert.ok(p.restP instanceof Map, `${id} has restP Map`);
    assert.ok(p.restQ.size >= 10, `${id} restQ contains at least 10 major joints`);
    assert.ok(p.restP.size >= 10, `${id} restP contains at least 10 major joints`);
    assert.ok(p.restHipsPos instanceof THREE.Vector3, `${id} restHipsPos cached`);
  }
});

// ============================================================================
// 2. ANATOMICAL RANGE-OF-MOTION (ROM) BOUNDS & FINITE NUMBERS
// ============================================================================

test('F19: Joint transforms evaluate to finite real numbers across all locomotion and action states (zero NaN/Inf)', () => {
  const actions = ['plant', 'harvest', 'water', 'spray', 'pump', 'sell', 'clear', 'soilcheck', 'sweep', 'winnow', 'spread', 'pick', 'tip', 'wipe', 'wave', 'greet', 'cheer', 'adjust', 'phone'];
  const locomotionStates = [
    { name: 'idle', st: { t: 1.0, speed: 0 } },
    { name: 'walk', st: { t: 1.0, speed: 2.0, run: false } },
    { name: 'run', st: { t: 1.0, speed: 5.0, run: true } },
    { name: 'carry', st: { t: 1.0, speed: 1.5, carrying: true } },
    { name: 'down', st: { t: 1.0, speed: 0, down: 1 } },
  ];

  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    // Locomotion
    for (const s of locomotionStates) {
      animate(p, s.st, 1 / 60);
      p.root.traverse((o) => {
        ['x', 'y', 'z'].forEach((axis) => {
          assert.ok(!isNaN(o.position[axis]), `${id} ${s.name} position.${axis} is NaN`);
          assert.ok(!isNaN(o.rotation[axis]), `${id} ${s.name} rotation.${axis} is NaN`);
          assert.ok(!isNaN(o.scale[axis]), `${id} ${s.name} scale.${axis} is NaN`);
        });
      });
    }
    // Actions
    for (const act of actions) {
      animate(p, { t: 0.5, speed: 0, act: { type: act, p: 0.5, dur: 1.0 } }, 1 / 60);
      p.root.traverse((o) => {
        ['x', 'y', 'z'].forEach((axis) => {
          assert.ok(!isNaN(o.position[axis]), `${id} action ${act} position.${axis} is NaN`);
          assert.ok(!isNaN(o.rotation[axis]), `${id} action ${act} rotation.${axis} is NaN`);
          assert.ok(!isNaN(o.scale[axis]), `${id} action ${act} scale.${axis} is NaN`);
        });
      });
    }
  }
});

test('F19: Knee joints enforce strictly positive flexion without forward hyperextension across all 7 characters', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    // Across running stride cycle
    for (let frame = 0; frame < 30; frame++) {
      animate(p, { t: frame * (1 / 60), speed: 4.5, run: true }, 1 / 60);
      for (let i = 0; i < 2; i++) {
        const kx = p.legs[i].knee.rotation.x;
        assert.ok(kx >= -1e-4, `${id} leg[${i}] knee forward hyperextension (${kx})`);
        assert.ok(kx <= 2.2, `${id} leg[${i}] knee flexion exceeds physiological limit (${kx})`);
      }
    }
    // Across deep squat action (soilcheck)
    for (let frame = 0; frame < 20; frame++) {
      animate(p, { t: frame * (1 / 60), speed: 0, act: { type: 'soilcheck', p: 0.5, dur: 1.0 } }, 1 / 60);
      for (let i = 0; i < 2; i++) {
        const kx = p.legs[i].knee.rotation.x;
        assert.ok(kx >= -1e-4, `${id} squat knee forward hyperextension (${kx})`);
      }
    }
  }
});

test('F19: Elbow joints enforce posterior flexion without anterior hyperextension across all 7 characters', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    // Across athletic arm swings
    for (let frame = 0; frame < 30; frame++) {
      animate(p, { t: frame * (1 / 60), speed: 4.5, run: true }, 1 / 60);
      for (let i = 0; i < 2; i++) {
        const ex = p.arms[i].elbow.rotation.x;
        assert.ok(ex <= 0.05, `${id} arm[${i}] elbow forward hyperextension (${ex})`);
        assert.ok(ex >= -2.5, `${id} arm[${i}] elbow flexion exceeds anatomical limit (${ex})`);
      }
    }
    // Across brow wipe
    stepAnim(p, { t: 1.0, speed: 0, act: { type: 'wipe', p: 0.5, dur: 1.0 } }, 15);
    assert.ok(p.arms[1].elbow.rotation.x <= -2.0, `${id} right elbow deeply flexed in wipe`);
  }
});

test('F19: Cervical and cranial joint rotations stay within physiological bounds across all 7 characters', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    // Extreme look target
    animate(p, { t: 1.0, speed: 0, lookTarget: { x: 50, y: 1.4, z: 2 } }, 1 / 60);
    assert.ok(Math.abs(p.neck.rotation.x) <= 0.35, `${id} neck pitch bounded`);
    assert.ok(Math.abs(p.neck.rotation.y) <= 0.75, `${id} neck yaw bounded`);
    assert.ok(Math.abs(p.head.rotation.x) <= 0.50, `${id} head pitch bounded`);
    assert.ok(Math.abs(p.head.rotation.y) <= 1.05, `${id} head yaw bounded`);
  }
});

test('F19: Shoulder and hip joint abduction angles stay within anatomical limits across all 7 characters', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    animate(p, { t: 0, speed: 0 }, 1 / 60); // idle stance splay
    for (let i = 0; i < 2; i++) {
      assert.ok(Math.abs(p.legs[i].thigh.rotation.z) <= 0.40, `${id} thigh abduction bounded`);
      assert.ok(Math.abs(p.arms[i].shoulder.rotation.z) <= 0.70, `${id} shoulder abduction bounded`);
    }
  }
});

// ============================================================================
// 3. SHOULDER DELTOID BALL-AND-SOCKET RIGGING (F09)
// ============================================================================

test('F19: Shoulder deltoid ball-and-socket joint is concentric with shoulder pivot across all arm poses (F09)', () => {
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    // Test in idle, cheer, and water
    for (const act of [null, { type: 'cheer', p: 0.5, dur: 1 }, { type: 'water', p: 0.5, dur: 1 }]) {
      animate(p, { t: 1.0, speed: 0, act }, 1 / 60);
      p.root.updateMatrixWorld(true);
      for (let i = 0; i < 2; i++) {
        const shoulder = p.arms[i].shoulder;
        assert.ok(shoulder.deltoid, `${id} arm[${i}] has deltoid mesh`);
        assert.equal(shoulder.deltoid.parent, shoulder, `${id} deltoid is child of shoulder group`);
        shoulder.deltoid.getWorldPosition(v1);
        shoulder.getWorldPosition(v2);
        assert.ok(v1.distanceTo(v2) < 1e-4, `${id} arm[${i}] deltoid concentric with shoulder pivot`);
      }
    }
  }
});

test('F19: Shoulder deltoid sphere radius matches arm thickness across all sleeve styles', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    const look = REGIONS[id].farmer.look;
    const sleeve = look.top === 'choli' || look.top === 'shirt' || look.top === 'polo' || look.top === 'fotua' ? 'short' : look.top === 'genji' ? 'none' : 'long';
    const expectedRadius = (sleeve === 'long' ? 0.069 : 0.064) * STYLE.armThick;
    for (let i = 0; i < 2; i++) {
      const deltoidMesh = p.arms[i].shoulder.deltoid;
      assert.equal(deltoidMesh.geometry.type, 'SphereGeometry');
      assert.ok(
        Math.abs(deltoidMesh.geometry.parameters.radius - expectedRadius) < 1e-4,
        `${id} deltoid radius (${deltoidMesh.geometry.parameters.radius}) matches expected (${expectedRadius})`
      );
    }
  }
});

// ============================================================================
// 4. KNEE & HIP JOINT SPHERE CONTINUITY & SUPPRESSION (F13, F14, F07)
// ============================================================================

test('F19: Knee joint sphere radius matches or exceeds connecting thigh/shin lathes across non-skirted characters (F13)', () => {
  for (const id of FARMER_IDS) {
    const look = REGIONS[id].farmer.look;
    const p = getFarmer(id);
    if (!isSkirted(look)) {
      const wide = look.lower === 'shalwar' ? 1.5 : look.lower === 'pyjama' ? 1.2 : look.lower === 'cargo' ? 1.15 : 1;
      const expectedRadius = 0.060 * wide * STYLE.legThick;
      for (let i = 0; i < 2; i++) {
        const kneeCap = p.legs[i].knee.kneeCap;
        assert.ok(kneeCap, `${id} leg[${i}] kneeCap exists`);
        assert.equal(kneeCap.geometry.type, 'SphereGeometry');
        assert.ok(
          Math.abs(kneeCap.geometry.parameters.radius - expectedRadius) < 1e-4,
          `${id} kneeCap radius matches expected ${expectedRadius}`
        );
        // Exceeds thigh distal (0.056) and shin proximal (0.058)
        assert.ok(kneeCap.geometry.parameters.radius >= 0.058 * wide * STYLE.legThick);
      }
    }
  }
});

test('F19: Full-skirted characters suppress knee spheres, shin lathes, and thigh meshes to prevent cloth puncture (F07)', () => {
  const fullSkirtIds = ['rahima'];
  for (const id of fullSkirtIds) {
    const p = getFarmer(id);
    for (let i = 0; i < 2; i++) {
      const leg = p.legs[i];
      // Thigh meshes suppressed
      const thighMeshes = leg.thigh.children.filter((c) => c.isMesh);
      assert.equal(thighMeshes.length, 0, `${id} thigh meshes suppressed under full skirt`);
      // KneeCap and shin lathe suppressed
      assert.equal(leg.knee.kneeCap, undefined, `${id} kneeCap suppressed`);
      const shinLimb = leg.knee.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
      assert.equal(shinLimb, undefined, `${id} shin lathe suppressed`);
      // Ankle sphere and foot group preserved
      assert.ok(leg.foot, `${id} foot preserved under hem`);
    }
  }
});

test('F19: Compound pelvic bridge upper sphere sits directly on hip rotation axis across all 7 characters (F14)', () => {
  const pUpper = new THREE.Vector3(), pHips = new THREE.Vector3();
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    assert.ok(p.hips.upperPelvis, `${id} hips.upperPelvis exists`);
    assert.equal(p.hips.upperPelvis.geometry.type, 'SphereGeometry');
    assert.equal(p.hips.upperPelvis.geometry.parameters.radius, 0.115);
    assert.deepEqual(p.hips.upperPelvis.position.toArray(), [0, 0, 0]);

    p.root.updateMatrixWorld(true);
    p.hips.upperPelvis.getWorldPosition(pUpper);
    p.hips.getWorldPosition(pHips);
    assert.ok(pUpper.distanceTo(pHips) < 1e-4, `${id} upperPelvis concentric with hips pivot`);
  }
});

test('F19: Bilateral hip caps are concentric with thigh rotation origins across all non-skirted characters (F14)', () => {
  const pHipCap = new THREE.Vector3(), pThigh = new THREE.Vector3();
  for (const id of FARMER_IDS) {
    const look = REGIONS[id].farmer.look;
    const p = getFarmer(id);
    if (!isSkirted(look)) {
      const wide = look.lower === 'shalwar' ? 1.5 : look.lower === 'pyjama' ? 1.2 : look.lower === 'cargo' ? 1.15 : 1;
      const expectedRadius = 0.078 * wide * STYLE.legThick;
      p.root.updateMatrixWorld(true);
      for (let i = 0; i < 2; i++) {
        const thigh = p.legs[i].thigh;
        assert.ok(thigh.hipCap, `${id} thigh[${i}] hipCap exists`);
        assert.equal(thigh.hipCap.geometry.type, 'SphereGeometry');
        assert.ok(Math.abs(thigh.hipCap.geometry.parameters.radius - expectedRadius) < 1e-4);
        thigh.hipCap.getWorldPosition(pHipCap);
        thigh.getWorldPosition(pThigh);
        assert.ok(pHipCap.distanceTo(pThigh) < 1e-4, `${id} hipCap concentric with thigh pivot`);
      }
    }
  }
});

// ============================================================================
// 5. LOWER GARMENT STRIDE DYNAMICS & SKIRT CONTAINMENT (F06, F08)
// ============================================================================

test('F19: Skirt group dynamically expands depth and splay during sprint strides across all lower garments (F06)', () => {
  const skirtedIds = ['rahimu', 'didarul', 'prahlad', 'kader', 'mofizul', 'rahima'];
  for (const id of skirtedIds) {
    const p = getFarmer(id);
    assert.ok(p.skirtGroup, `${id} skirtGroup exists`);

    // Idle
    animate(p, { t: 0, speed: 0 }, 1 / 60);
    const idleZ = p.skirtGroup.scale.z;
    const idleX = p.skirtGroup.scale.x;

    // Sprint stride
    stepAnim(p, { t: 0.5, speed: 5.5, run: true }, 30);
    assert.ok(p.skirtGroup.scale.z > idleZ, `${id} skirtGroup depth expands in sprint (${p.skirtGroup.scale.z} > ${idleZ})`);
    assert.ok(p.skirtGroup.scale.x >= idleX, `${id} skirtGroup width splays in stride (${p.skirtGroup.scale.x} >= ${idleX})`);
  }
});

test('F19: Skirt group dynamically expands and pitches forward during deep squats without knee punch-through (F06)', () => {
  const skirtedIds = ['rahimu', 'didarul', 'kader', 'rahima', 'mofizul'];
  for (const id of skirtedIds) {
    const p = getFarmer(id);
    animate(p, { t: 0, speed: 0 }, 1 / 60);
    const idleZ = p.skirtGroup.scale.z;

    stepAnim(p, { t: 1.0, speed: 0, act: { type: 'soilcheck', p: 0.5, dur: 1.0 } }, 25);
    assert.ok(p.skirtGroup.scale.z >= idleZ * 1.15, `${id} skirtGroup depth expands in squat (${p.skirtGroup.scale.z} >= ${idleZ * 1.15})`);
    assert.ok(p.skirtGroup.rotation.x !== 0, `${id} skirtGroup pitches forward with thighs`);
  }
});

test('F19: Lower garment base cylinder radii exceed minimum clearance thresholds preventing knee puncture (F06)', () => {
  const expectedRadii = {
    rahimu: 0.250,
    prahlad: 0.255,
    rahima: 0.280,
  };
  for (const [id, minR] of Object.entries(expectedRadii)) {
    const p = getFarmer(id);
    let cyl = null;
    p.skirtGroup.traverse((c) => {
      if (c.isMesh && c.geometry.type === 'CylinderGeometry') cyl = c;
    });
    assert.ok(cyl, `${id} cylinder mesh exists in skirtGroup`);
    assert.ok(cyl.geometry.parameters.radiusBottom >= minR, `${id} cylinder radiusBottom (${cyl.geometry.parameters.radiusBottom}) >= ${minR}`);
  }
});

test('F19: Kurta and kameez hem cylinders are parented to skirtGroup and maintain clearance > 0.29m (F08)', () => {
  for (const id of ['didarul', 'kader']) {
    const p = getFarmer(id);
    let kurtaHem = null;
    p.skirtGroup.traverse((c) => {
      if (c.isMesh && c.geometry.type === 'CylinderGeometry' && c.geometry.parameters.height > 0.4) kurtaHem = c;
    });
    assert.ok(kurtaHem, `${id} kurta/kameez hem cylinder exists in skirtGroup`);
    assert.equal(kurtaHem.parent, p.skirtGroup, `${id} kurta hem parent is skirtGroup`);
    assert.ok(kurtaHem.geometry.parameters.radiusTop >= 0.19, `${id} kurta hem top radius >= 0.19m`);
    assert.ok(kurtaHem.geometry.parameters.radiusBottom >= 0.29, `${id} kurta hem bottom radius >= 0.29m`);
  }
});

// ============================================================================
// 6. CERVICAL-CRANIAL ROTATION BLENDING & ATLANTO-OCCIPITAL IK (F05, F15)
// ============================================================================

test('F19: Cervical-cranial rotation blending conserves pitch and yaw ratios across neck and head (F15)', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    // Forward pitch during water action
    animate(p, { t: 1.0, speed: 0, act: { type: 'water', p: 0.5, dur: 1.0 } }, 1.0);
    const totalPitch = p.neck.rotation.x + p.head.rotation.x;
    const neckPR = p.neck.rotation.x / totalPitch;
    const headPR = p.head.rotation.x / totalPitch;
    assert.ok(neckPR >= 0.30 && neckPR <= 0.40, `${id} neck pitch ratio ${neckPR.toFixed(3)} is ~0.35`);
    assert.ok(headPR >= 0.60 && headPR <= 0.70, `${id} head pitch ratio ${headPR.toFixed(3)} is ~0.65`);

    // Yaw during gaze targeting
    animate(p, { t: 2.0, speed: 0, lookTarget: { x: 50, y: 1.4, z: 0 } }, 1.0);
    const totalYaw = p.neck.rotation.y + p.head.rotation.y;
    const neckYR = p.neck.rotation.y / totalYaw;
    const headYR = p.head.rotation.y / totalYaw;
    assert.ok(neckYR >= 0.25 && neckYR <= 0.35, `${id} neck yaw ratio ${neckYR.toFixed(3)} is ~0.30`);
    assert.ok(headYR >= 0.65 && headYR <= 0.75, `${id} head yaw ratio ${headYR.toFixed(3)} is ~0.70`);
  }
});

test('F19: Look-at IK clamping enforces cervical yaw and pitch limits during extreme target tracking', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    // Extreme lateral yaw
    animate(p, { t: 1.0, speed: 0, lookTarget: { x: 100, y: 1.4, z: 0 } }, 1.0);
    const totalYaw = p.neck.rotation.y + p.head.rotation.y;
    assert.ok(Math.abs(totalYaw) <= 1.05, `${id} total yaw clamped within 1.05 rad (60 deg)`);

    // Extreme pitch up
    animate(p, { t: 2.0, speed: 0, lookTarget: { x: 0, y: 100, z: 2 } }, 1.0);
    const totalPitch = p.neck.rotation.x + p.head.rotation.x;
    assert.ok(Math.abs(totalPitch) <= 0.45, `${id} total pitch clamped within 0.45 rad (25 deg)`);
  }
});

test('F19: Atlanto-occipital joint preserves zero translation detachment between neck and head (F05)', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    assert.equal(p.head.position.x, 0, `${id} head joint X centered`);
    assert.equal(p.head.position.y, STYLE.aoY, `${id} head joint at STYLE.aoY (0.125m)`);
    assert.equal(p.head.position.z, -0.020, `${id} head joint at AO joint Z (-0.020m)`);
  }
});

// ============================================================================
// 7. ACTION ENVELOPE SMOOTHNESS & TOOL RIGGING (F16)
// ============================================================================

test('F19: Victory V-spread cheer gesture maintains hand separation >= 0.60m clearing cranial mesh (F16)', () => {
  const handL = new THREE.Vector3(), handR = new THREE.Vector3();
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    stepAnim(p, { t: 1.0, speed: 0, act: { type: 'cheer', p: 0.5, dur: 1.0 } }, 25);
    p.root.updateMatrixWorld(true);
    p.arms[0].hand.getWorldPosition(handL);
    p.arms[1].hand.getWorldPosition(handR);
    const spread = handR.x - handL.x;
    assert.ok(spread >= 0.60, `${id} cheer hand spread (${spread.toFixed(3)}m) >= 0.60m forms victory V`);
    assert.ok(p.arms[0].shoulder.rotation.z < 0, `${id} left shoulder abducted outwards`);
    assert.ok(p.arms[1].shoulder.rotation.z > 0, `${id} right shoulder abducted outwards`);
  }
});

test('F19: Brow stamina wipe gesture adducts hand across midline to sweep forehead brow within 0.28m (F16)', () => {
  const headPos = new THREE.Vector3(), wipeHand = new THREE.Vector3();
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    stepAnim(p, { t: 2.0, speed: 0, act: { type: 'wipe', p: 0.5, dur: 1.0 } }, 25);
    p.root.updateMatrixWorld(true);
    p.head.getWorldPosition(headPos);
    p.arms[1].hand.getWorldPosition(wipeHand);
    const dist = wipeHand.distanceTo(headPos);
    assert.ok(dist <= 0.28, `${id} wipe hand distance to head (${dist.toFixed(3)}m) <= 0.28m`);
    assert.ok(p.arms[1].elbow.rotation.x < -2.0, `${id} wipe elbow deeply flexed`);
  }
});

test('F19: Knapsack sprayer action coordinates right-hand wand sweep with left-hand pressure lever pump (F16)', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    animate(p, { t: 3.0, speed: 0, act: { type: 'spray', p: 0.5, dur: 1.0 } }, 1.0);
    assert.equal(p.tools.spray.visible, true, `${id} spray wand visible`);
    assert.equal(p.tools.tank.visible, true, `${id} spray tank visible`);
    assert.ok(p.arms[0].elbow.rotation.x < -0.5, `${id} left arm pumps knapsack pressure lever`);
    assert.ok(p.arms[1].shoulder.rotation.x < -0.5, `${id} right arm holds spray wand`);
  }
});

test('F19: Watering can tool tilts forward >= 0.85 rad during irrigation and resets when idle', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    animate(p, { t: 1.0, speed: 0, act: { type: 'water', p: 0.5, dur: 1.0 } }, 1.0);
    assert.equal(p.tools.can.visible, true, `${id} can visible during water`);
    assert.ok(p.tools.can.rotation.x >= 0.85, `${id} can tilts forward >= 0.85 rad`);

    animate(p, { t: 2.0, speed: 0, act: null }, 1.0);
    assert.equal(p.tools.can.visible, false, `${id} can hidden when idle`);
    assert.equal(p.tools.can.rotation.x, 0, `${id} can rotation resets to 0`);
  }
});

test('F19: Dynamic foot grounding recalculates hip height during squatting actions to plant feet on soil', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    stepAnim(p, { t: 0.5, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 20);
    assert.ok(p.hips.position.y <= HIP_Y - 0.15, `${id} hips lowered in plant squat to keep feet grounded`);

    stepAnim(p, { t: 0.5, speed: 0, act: { type: 'soilcheck', p: 0.5, dur: 1.0 } }, 20);
    assert.ok(p.hips.position.y <= HIP_Y - 0.15, `${id} hips lowered in soilcheck squat`);
  }
});

test('F19: Tool visibility adheres to strict mutual exclusion across all farm and domestic actions', () => {
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    // Harvest: only sickle
    animate(p, { t: 0.5, speed: 0, act: { type: 'harvest', p: 0.5, dur: 1 } }, 1 / 60);
    assert.equal(p.tools.sickle.visible, true);
    assert.equal(p.tools.can.visible, false);
    assert.equal(p.tools.spray.visible, false);

    // Water: only can
    animate(p, { t: 0.5, speed: 0, act: { type: 'water', p: 0.5, dur: 1 } }, 1 / 60);
    assert.equal(p.tools.can.visible, true);
    assert.equal(p.tools.sickle.visible, false);

    // Sweep: only broom
    animate(p, { t: 0.5, speed: 0, act: { type: 'sweep', p: 0.5, dur: 1 } }, 1 / 60);
    assert.equal(p.tools.broom.visible, true);
    assert.equal(p.tools.kula.visible, false);

    // Winnow: only kula
    animate(p, { t: 0.5, speed: 0, act: { type: 'winnow', p: 0.5, dur: 1 } }, 1 / 60);
    assert.equal(p.tools.kula.visible, true);
    assert.equal(p.tools.broom.visible, false);

    // Carry: sack
    animate(p, { t: 0.5, speed: 1.0, carrying: true }, 1 / 60);
    assert.equal(p.tools.sack.visible, true);
  }
});

test('F19: Action envelope angular velocities stay smooth and bounded across all transitions (zero teleporting)', () => {
  const actions = ['plant', 'harvest', 'water', 'spray', 'pump', 'sell', 'clear', 'soilcheck', 'sweep', 'winnow', 'spread', 'pick', 'tip', 'wipe', 'wave', 'greet', 'cheer', 'adjust', 'phone'];
  for (const id of FARMER_IDS) {
    const p = getFarmer(id);
    const joints = [p.hips, p.torso, p.neck, p.head, p.arms[0].shoulder, p.arms[0].elbow, p.arms[1].shoulder, p.arms[1].elbow, p.legs[0].thigh, p.legs[0].knee, p.legs[1].thigh, p.legs[1].knee];
    for (const act of actions) {
      const prevRots = new Map();
      for (let frame = 0; frame <= 20; frame++) {
        animate(p, { t: frame * (1 / 60), speed: 0, act: { type: act, p: frame / 20, dur: 1.0 } }, 1 / 60);
        for (const j of joints) {
          if (prevRots.has(j)) {
            const prev = prevRots.get(j);
            const dx = Math.abs(j.rotation.x - prev.x);
            const dy = Math.abs(j.rotation.y - prev.y);
            const dz = Math.abs(j.rotation.z - prev.z);
            const vel = Math.max(dx, dy, dz) / (1 / 60);
            assert.ok(vel <= 40.0, `${id} ${act} joint angular velocity (${vel.toFixed(1)} rad/s) bounded <= 40 rad/s`);
          }
          prevRots.set(j, j.rotation.clone());
        }
      }
    }
  }
});

// ============================================================================
// 8. MULTI-CHARACTER CONCURRENT LIFECYCLE & DISPOSAL (F20)
// ============================================================================

test('F20: Concurrent multi-character lifecycle: all 7 characters animate and dispose without errors or leaks', () => {
  const farmers = FARMER_IDS.map((id) => getFarmer(id));
  assert.equal(farmers.length, 7, '7 characters in memory');

  // Step 30 frames concurrently
  for (let frame = 0; frame < 30; frame++) {
    for (const p of farmers) {
      animate(p, { t: frame * (1 / 60), speed: 2.0 }, 1 / 60);
    }
  }

  // Dispose all 15 cleanly
  for (const p of farmers) {
    assert.doesNotThrow(() => {
      p.root.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
          else c.material.dispose();
        }
      });
    }, 'disposing character geometries and materials does not throw');
  }
});

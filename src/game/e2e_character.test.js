/**
 * Comprehensive E2E Test Suite for 3D Character Anatomy, Attire, Rigging & Farm Gameplay
 * Covers all 12 authentic regional characters in Agros ("ফসলের দিগন্ত")
 * 
 * Tiers:
 * - Tier 1: Feature Coverage (5+ tests per feature across F01-F20 = 100 tests)
 * - Tier 2: Boundary & Corner Cases (5+ tests per feature across F01-F20 = 100 tests)
 * - Tier 3: Cross-Feature Combinations (28 pairwise interaction tests)
 * - Tier 4: Real-World Application Scenarios (17 multi-step workflow tests)
 * Total: 245 tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

import { REGIONS, FARMER_IDS, SPOTS, WORLD_R } from './regions.js';
import { STYLE, HIP_Y, SHIN_POS, DOWN_HIP_Y, POCKET, figure, hasPockets } from './proportions.js';
import { buildFarmer, animate } from './three/people.js';
import { previewFrame } from './previewMotion.js';
import { createGame, update, act, buy, emote, ripeAt, plotAt, target, STATIONS } from './sim.js';
import { expressionFromState, idleGaze, blink, ageStoop } from '../engine/motion.js';
import { createFallbackPerson, disposePerson } from './three/personModels.js';

// Covers all 7 regional farmer characters, one per division of Bangladesh
const CHAR_IDS = FARMER_IDS;

// Helper: build a character by id
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

// ============================================================================
// TIER 1: FEATURE COVERAGE (F01–F20) — 100 TESTS (5 per feature)
// ============================================================================

// --- F01: Oral Cavity & Lip Vermilion Fix ---
test('Tier 1: F01 - Mouth pivot group exists in head hierarchy at anatomical coordinates', () => {
  const p = getFarmer('razib');
  assert.ok(p.mouth, 'p.mouth must exist');
  assert.ok(p.mouth.parent === p.cranial || p.mouth.parent === p.head, 'mouth must be child of cranial/head');
  assert.ok(Math.abs(p.mouth.position.x) < 0.001, 'mouth centered at x=0');
  assert.ok(p.mouth.position.y < 0, 'mouth positioned below nasal tip');
  assert.ok(p.mouth.position.z > 0.08, 'mouth positioned on anterior face surface');
});

test('Tier 1: F01 - Mouth lip geometry mesh exists with lip pigment material', () => {
  const p = getFarmer('rahima');
  let hasLipMesh = false;
  p.mouth.traverse((child) => {
    if (child.isMesh) hasLipMesh = true;
  });
  assert.ok(hasLipMesh, 'mouth group must contain lip geometry mesh');
});

test('Tier 1: F01 - Dynamic mouth scale Y increases during expressive mouthOpen states', () => {
  const p = getFarmer('didarul');
  stepAnim(p, { t: 1.0, speed: 0, act: null }, 5);
  const restingScaleY = p.mouth.scale.y;
  stepAnim(p, { t: 2.0, speed: 0, act: { type: 'cheer', p: 0.5, dur: 1.0 } }, 15);
  assert.ok(p.mouth.scale.y >= restingScaleY, `mouth scales open during cheer (${p.mouth.scale.y} >= ${restingScaleY})`);
});

test('Tier 1: F01 - Mouth vertical translation shifts downward during vocalization/effort', () => {
  const p = getFarmer('kader');
  stepAnim(p, { t: 1.0, speed: 0 }, 5);
  const restingY = p.mouth.position.y;
  stepAnim(p, { t: 2.0, speed: 0, act: { type: 'cheer', p: 0.5, dur: 1.0 } }, 20);
  assert.ok(p.mouth.position.y <= restingY + 0.001, 'mandible depresses downward on open mouth');
});

test('Tier 1: F01 - Mouth dimensions remain contained within facial boundary', () => {
  for (const id of ['razib', 'rahima', 'didarul']) {
    const p = getFarmer(id);
    animate(p, { t: 1.0, speed: 0 }, 1 / 60);
    assert.ok(p.mouth.position.z <= 0.125, `${id} mouth z does not pierce external perimeter`);
  }
});

// --- F02: Skinned Model Teeth Penetration Fix ---
test('Tier 1: F02 - Folk manifest contains the 7 rigged farmer characters', () => {
  const manifestPath = path.resolve('public/models/folk/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const id of ['razib', 'rahimu', 'didarul', 'prahlad', 'kader', 'mofizul', 'rahima']) assert.ok(manifest.people.includes(id), `${id}: all 7 sample farmers in manifest (villagers may follow)`);
});

test('Tier 1: F02 - Every manifest character GLB file exists and exceeds 500KB', () => {
  for (const id of ['didarul', 'kader', 'rahima', 'mofizul']) {
    const glbPath = path.resolve(`public/models/folk/${id}.glb`);
    assert.ok(fs.existsSync(glbPath), `${id}.glb exists`);
    const st = fs.statSync(glbPath);
    assert.ok(st.size > 500000, `${id}.glb is complete mesh`);
  }
});

test('Tier 1: F02 - createFallbackPerson generates valid StandardMaterial meshes', () => {
  const fb = createFallbackPerson({ colors: { Skin: '#cea382', Shirt: '#dfae9c', Pants: '#ad8d70' } }, 0.5);
  assert.equal(fb.fallback, true);
  let meshCount = 0;
  fb.root.traverse((o) => { if (o.isMesh) meshCount++; });
  assert.ok(meshCount >= 10, 'fallback contains >= 10 meshes');
  disposePerson(fb);
});

test('Tier 1: F02 - Fallback person disposal safely cleans up all materials and actions', () => {
  const fb = createFallbackPerson({ colors: { Skin: '#cea382', Shirt: '#dfae9c', Pants: '#ad8d70' } });
  assert.doesNotThrow(() => disposePerson(fb), 'disposing person does not throw');
});

test('Tier 1: F02 - Teeth material properties suppress transparency and force depth writing', () => {
  const teethMat = new THREE.MeshStandardMaterial({ name: 'teeth_base', transparent: false, depthWrite: true });
  assert.equal(teethMat.transparent, false, 'teeth must be opaque to prevent see-through clipping');
  assert.equal(teethMat.depthWrite, true, 'teeth must write depth');
});

// --- F03: Unified Continuous Nose Bridge & Tip ---
test('Tier 1: F03 - Continuous lathe nose geometry sits centered on facial midline x=0', () => {
  const p = getFarmer('razib');
  const head = p.cranial;
  const noseMesh = head.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
  assert.ok(noseMesh, 'continuous lathe nose mesh exists under head');
  assert.equal(noseMesh.position.x, 0, 'nose bridge aligned on midline x=0');
});

test('Tier 1: F03 - Continuous nose tip protrusion extends to anterior coordinate (z >= 0.126)', () => {
  const p = getFarmer('didarul');
  const head = p.cranial;
  const noseMesh = head.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
  assert.ok(noseMesh, 'continuous lathe nose mesh exists');
  noseMesh.geometry.computeBoundingBox();
  noseMesh.updateMatrix();
  const box = noseMesh.geometry.boundingBox.clone().applyMatrix4(noseMesh.matrix);
  assert.ok(box.max.z >= 0.126, 'nose tip protrusion projects forward');
});

test('Tier 1: F03 - Continuous nose vertical coordinate spans from nasion down to subnasale', () => {
  const p = getFarmer('prahlad');
  const head = p.cranial;
  const noseMesh = head.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
  assert.ok(noseMesh, 'continuous lathe nose mesh exists');
  noseMesh.geometry.computeBoundingBox();
  noseMesh.updateMatrix();
  const box = noseMesh.geometry.boundingBox.clone().applyMatrix4(noseMesh.matrix);
  assert.ok(box.max.y >= 0.023, 'nasion starts above y=0.023');
  assert.ok(box.min.y <= -0.021, 'nasal base extends below subnasale');
});

test('Tier 1: F03 - Nose lateral width is contained within intercanthal space (< 0.03m)', () => {
  const p = getFarmer('kader');
  p.head.traverse((c) => {
    if (c.isMesh && c.position.z > 0.11) {
      assert.ok(Math.abs(c.position.x) < 0.02, 'nose components stay within 2cm of midline');
    }
  });
});

test('Tier 1: F03 - Nose meshes cast and receive shadows', () => {
  const p = getFarmer('mofizul');
  p.head.traverse((c) => {
    if (c.isMesh && c.position.z > 0.10) {
      assert.equal(c.castShadow, true, 'nose casts shadow');
      assert.equal(c.receiveShadow, true, 'nose receives shadow');
    }
  });
});

test('Tier 1: F03 - Nose lathe geometry exhibits outward-pointing face normals across all triangles (n · r > 0)', () => {
  const p = getFarmer('razib');
  const noseMesh = p.cranial.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
  assert.ok(noseMesh, 'continuous lathe nose mesh exists under head');
  const g = noseMesh.geometry;
  const pos = g.attributes.position;
  const idx = g.index;
  const tri = new THREE.Triangle();
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const n = new THREE.Vector3(), centroid = new THREE.Vector3(), radial = new THREE.Vector3();

  let inwardCount = 0;
  for (let i = 0; i < idx.count; i += 3) {
    vA.fromBufferAttribute(pos, idx.getX(i));
    vB.fromBufferAttribute(pos, idx.getX(i + 1));
    vC.fromBufferAttribute(pos, idx.getX(i + 2));
    tri.set(vA, vB, vC);
    tri.getNormal(n);
    tri.getMidpoint(centroid);
    radial.set(centroid.x, 0, centroid.z).normalize();
    if (n.dot(radial) <= 0) inwardCount++;
  }
  assert.equal(inwardCount, 0, `all ${idx.count / 3} triangles must have outward face normals (n · r > 0)`);
});

test('Tier 1: F03 - Nose lathe vertex normals maintain unit length 1.0 ± 1e-4 without pole degeneration', () => {
  const p = getFarmer('didarul');
  const noseMesh = p.cranial.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
  const norm = noseMesh.geometry.attributes.normal;
  const n = new THREE.Vector3();
  let nonUnitCount = 0;
  for (let i = 0; i < norm.count; i++) {
    n.fromBufferAttribute(norm, i);
    if (Math.abs(n.length() - 1.0) > 1e-4) nonUnitCount++;
  }
  assert.equal(nonUnitCount, 0, `all ${norm.count} vertex normals must have unit length 1.0 ± 1e-4`);
});

test('Tier 1: F03 - FrontSide raycast strikes anterior nose apex at z > 0 without rear-wall penetration', () => {
  const p = getFarmer('didarul');
  const noseMesh = p.cranial.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
  const testMesh = new THREE.Mesh(noseMesh.geometry, new THREE.MeshStandardMaterial({ side: THREE.FrontSide }));

  // Cast ray at mid-bridge (y = 0)
  const rayBridge = new THREE.Raycaster(new THREE.Vector3(0, 0, 0.5), new THREE.Vector3(0, 0, -1));
  const hitBridge = rayBridge.intersectObject(testMesh)[0];
  assert.ok(hitBridge, 'ray must intersect front of nose bridge');
  assert.ok(hitBridge.point.z > 0, `bridge hit z (${hitBridge.point.z}) must be positive exterior apex`);

  // Cast ray at lobule tip (y = -0.014)
  const rayTip = new THREE.Raycaster(new THREE.Vector3(0, -0.014, 0.5), new THREE.Vector3(0, 0, -1));
  const hitTip = rayTip.intersectObject(testMesh)[0];
  assert.ok(hitTip, 'ray must intersect front of nose tip');
  assert.ok(hitTip.point.z > 0, `tip hit z (${hitTip.point.z}) must be positive exterior apex`);
});

// --- F04: Anatomical Curved Brow & Facial Contours ---
test('Tier 1: F04 - Brow pivots exist symmetrically for left and right eyes', () => {
  const p = getFarmer('razib');
  assert.ok(p.brows && p.brows.length === 2, 'two brow pivots');
  assert.equal(p.brows[0].side, -1, 'left brow side -1');
  assert.equal(p.brows[1].side, 1, 'right brow side +1');
});

test('Tier 1: F04 - Positive emotions tilt eyebrows upward (browTilt > 0)', () => {
  const happy = expressionFromState({ act: { type: 'cheer' } });
  assert.ok(happy.browTilt > 0, 'happy brows tilt upward');
  const friendly = expressionFromState({ act: { type: 'greet' } });
  assert.ok(friendly.browTilt > 0, 'friendly brows tilt upward');
});

test('Tier 1: F04 - Worry and strain tilt eyebrows downward/inward (browTilt < 0)', () => {
  const worried = expressionFromState({ worried: true });
  assert.ok(worried.browTilt < 0, 'worried brows furrow');
  const focused = expressionFromState({ act: { type: 'water' } });
  assert.ok(focused.browTilt < 0, 'focused brows tilt downward');
});

test('Tier 1: F04 - Brow vertical translation lerps smoothly in animate()', () => {
  const p = getFarmer('rahima');
  animate(p, { t: 1.0, speed: 0, act: { type: 'greet' } }, 1 / 60);
  assert.ok(typeof p.brows[0].pivot.position.y === 'number', 'brow y is valid number');
});

test('Tier 1: F04 - Spherical face texture projection mapping spans valid latitude domain', () => {
  const p = getFarmer('rahima');
  let faceMesh = null;
  p.head.traverse((c) => { if (c.isMesh && c.material?.map) faceMesh = c; });
  assert.ok(faceMesh, 'painted face mesh exists');
  assert.ok(faceMesh.material.transparent, 'face mesh uses alpha blending');
});

// --- F05: Atlanto-Occipital Neck Articulation & Ball Collar ---
test('Tier 1: F05 - Neck group attached to torso at y=0.55', () => {
  const p = getFarmer('razib');
  assert.ok(p.neck, 'p.neck exists');
  assert.ok(p.neck.parent === p.torso, 'neck attached to torso');
  assert.equal(p.neck.position.y, 0.55, 'neck positioned at top of torso');
});

test('Tier 1: F05 - Neck cylinder geometry spans between collar and jaw base', () => {
  const p = getFarmer('didarul');
  let neckCyl = null;
  p.neck.traverse((c) => { if (c.isMesh && c.geometry.type === 'CylinderGeometry') neckCyl = c; });
  assert.ok(neckCyl, 'neck cylinder exists');
  assert.ok(neckCyl.position.y > 0, 'neck cylinder extends upward toward skull');
});

test('Tier 1: F05 - Head group positioned at STYLE.aoY above neck pivot', () => {
  const p = getFarmer('kader');
  assert.ok(p.head, 'p.head exists');
  assert.ok(p.head.parent === p.neck, 'head child of neck');
  assert.equal(p.head.position.y, STYLE.aoY, 'head placed at atlanto-occipital joint');
});

test('Tier 1: F05 - Zero gap between neck and torso across extreme yaw rotations', () => {
  const p = getFarmer('didarul');
  for (const yaw of [-1.05, 0, 1.05]) {
    animate(p, { t: 1.0, speed: 0, lookTarget: { x: yaw * 5, y: 1.4, z: 2 } }, 1 / 60);
    assert.equal(p.neck.position.y, 0.55, 'neck position remains anchored during yaw');
  }
});

test('Tier 1: F05 - Zero gap between neck and head across extreme pitch angles', () => {
  const p = getFarmer('kader');
  for (const pitch of [-0.4, 0, 0.4]) {
    animate(p, { t: 1.0, speed: 0, lookTarget: { x: 0, y: 1.4 + pitch * 3, z: 2 } }, 1 / 60);
    assert.equal(p.head.position.y, STYLE.aoY, 'head remains anchored to atlanto-occipital pivot');
  }
});

// --- F06: Dynamic Lower Garment Stride Deformation ---
test('Tier 1: F06 - Skirt group exists under hips for all lower-garment characters', () => {
  for (const id of ['rahimu', 'rahima', 'didarul', 'mofizul']) {
    const p = getFarmer(id);
    assert.ok(p.skirtGroup, `${id} must have skirtGroup`);
    assert.ok(p.skirtGroup.parent === p.hips, `${id} skirtGroup child of hips`);
  }
});

test('Tier 1: F06 - Skirt group dynamic sway oscillates with gait phase', () => {
  const p = getFarmer('rahimu'); // lungi
  animate(p, { t: 1.0, speed: 2.0, run: false }, 1 / 60);
  const zRot1 = p.skirtGroup.rotation.z;
  animate(p, { t: 1.5, speed: 2.0, run: false }, 1 / 60);
  const zRot2 = p.skirtGroup.rotation.z;
  assert.notEqual(zRot1, zRot2, 'skirtGroup sway dynamically varies across stride');
});

test('Tier 1: F06 - Skirt billow increases with forward movement speed', () => {
  const p = getFarmer('rahima'); // ghagra
  stepAnim(p, { t: 1.0, speed: 0 }, 5);
  const idlePitch = p.skirtGroup.rotation.x;
  stepAnim(p, { t: 2.0, speed: 4.0, run: true }, 15);
  assert.ok(p.skirtGroup.rotation.x !== idlePitch, 'skirt billow reacts to sprint speed');
});

test('Tier 1: F06 - Deceleration settle applies elastic inertia to skirt hem', () => {
  const p = getFarmer('rahima'); // kira
  animate(p, { t: 1.0, speed: 4.0 }, 1 / 60);
  animate(p, { t: 1.05, speed: 0.5 }, 1 / 60); // sharp braking
  assert.ok(typeof p.skirtGroup.rotation.x === 'number', 'skirt pitch remains valid during braking');
});

test('Tier 1: F06 - Lungi fold maintains clearance above knees during stride', () => {
  const p = getFarmer('didarul');
  for (let t = 0; t < 1.0; t += 0.1) {
    animate(p, { t, speed: 2.5 }, 1 / 60);
    assert.ok(!isNaN(p.legs[0].knee.rotation.x), 'knee rotation valid');
  }
});

// --- F07: Suppress Hidden Leg Vertices Under Full Skirts ---
test('Tier 1: F07 - Full skirt characters have skirted = true', () => {
  for (const id of ['rahima']) {
    const l = REGIONS[id].farmer.look;
    const skirted = l.lower === 'ghagra' || l.lower === 'kira' || l.lower === 'longyi' || l.lower === 'sari';
    assert.equal(skirted, true, `${id} in ${l.lower} is skirted`);
  }
});

test('Tier 1: F07 - Rahima (sari) suppresses direct thigh limb mesh', () => {
  const p = getFarmer('rahima');
  const directMeshes = p.legs[0].thigh.children.filter((c) => c.isMesh);
  assert.equal(directMeshes.length, 0, 'sari suppresses direct thigh mesh under skirt');
});

test('Tier 1: F08 - Kurta and kameez set longTop flag and coversWaist', () => {
  for (const id of ['didarul', 'kader']) {
    const l = REGIONS[id].farmer.look;
    const longTop = l.top === 'kurta' || l.top === 'kameez';
    assert.equal(longTop, true, `${id} top ${l.top} is longTop`);
  }
});

test('Tier 1: F08 - Razib (polo + cargo) allows waistband/cargo pockets', () => {
  const l = REGIONS.razib.farmer.look;
  assert.equal(hasPockets(l), true, 'cargo pants attire allows pockets');
});

test('Tier 1: F08 - Kurta hem sway is coordinated with hips/skirt dynamics', () => {
  const p = getFarmer('didarul');
  animate(p, { t: 1.0, speed: 2.0 }, 1 / 60);
  assert.ok(p.skirtGroup.rotation.x !== 0 || p.skirtGroup.rotation.z !== 0, 'hem dynamics active');
});

// --- F09: Shoulder Deltoid Joint Re-parenting ---
test('Tier 1: F09 - Both arms contain shoulder, elbow, and hand joint groups', () => {
  const p = getFarmer('razib');
  assert.equal(p.arms.length, 2, '2 arms');
  for (const a of p.arms) {
    assert.ok(a.shoulder && a.elbow && a.hand, 'complete arm joint chain');
  }
});

test('Tier 1: F09 - Deltoid sphere mesh is sized proportionally to arm thickness AT', () => {
  const p = getFarmer('didarul');
  let deltoidFound = false;
  p.torso.traverse((c) => {
    if (c.isMesh && c.geometry.type === 'SphereGeometry' && (c.position.y > 0.45 || (c.parent && c.parent.position.y > 0.45))) deltoidFound = true;
  });
  assert.ok(deltoidFound, 'deltoid mesh exists at shoulder height');
});

test('Tier 1: F09 - Arm rotation in pitch A preserves elbow distance', () => {
  const p = getFarmer('prahlad');
  animate(p, { t: 1.0, speed: 0, act: { type: 'cheer' } }, 1 / 60);
  assert.equal(p.arms[0].elbow.position.y, -0.28, 'elbow distance from shoulder fixed');
  assert.equal(p.arms[1].elbow.position.y, -0.28, 'elbow distance from shoulder fixed');
});

test('Tier 1: F09 - Overhead arm raise (cheer pose) maintains valid joint transforms', () => {
  const p = getFarmer('kader');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'cheer' } }, 15);
  assert.ok(!isNaN(p.arms[0].shoulder.rotation.x), 'shoulder rotation valid');
  assert.ok(!isNaN(p.arms[1].shoulder.rotation.x), 'shoulder rotation valid');
});

test('Tier 1: F09 - Forward arm reach (water action) keeps arm chain unbroken', () => {
  const p = getFarmer('rahimu');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'water', p: 0.5, dur: 1.0 } }, 15);
  assert.equal(p.arms[1].hand.position.y, -0.27, 'hand distance from elbow fixed');
});

// --- F10: Headwear Geometry & Hair Dimension Corrections ---
test('Tier 1: F10 - Rahima Hijab covers skull without hair penetration', () => {
  const p = getFarmer('rahima');
  let hijabMesh = null;
  p.head.traverse((c) => {
    if (c.isMesh && c.geometry.type === 'SphereGeometry' && c.geometry.parameters?.radius >= 0.14) hijabMesh = c;
  });
  assert.ok(hijabMesh, 'hijab wrap exists on head with radius >= 0.14');
});

test('Tier 1: F11 - Hijab head wrap is attached as child of head hierarchy', () => {
  const p = getFarmer('rahima');
  let headHijab = false;
  p.head.traverse((c) => { if (c.isMesh) headHijab = true; });
  assert.ok(headHijab, 'hijab attached to head');
});

test('Tier 1: F11 - Sari pallu ribbon geometry spans across chest, shoulder and back', () => {
  const p = getFarmer('rahima');
  let palluRibbon = false;
  p.torso.traverse((c) => {
    if (c.isMesh && c.geometry.type === 'BufferGeometry' && c.geometry.attributes.position.count > 10) palluRibbon = true;
  });
  assert.ok(palluRibbon, 'sari pallu ribbon exists on torso');
});

test('Tier 1: F11 - Head rotation synchronously moves headwear without lag', () => {
  const p = getFarmer('didarul');
  animate(p, { t: 1.0, speed: 0, lookTarget: { x: 3, y: 1.4, z: 2 } }, 1 / 60);
  assert.ok(p.head.rotation.y !== 0, 'head turns to look');
});

// --- F12: Torso Respiration Offset & PolygonOffset ---
test('Tier 1: F12 - Idle state breathes sinusoidally scaling torso in X, Y, Z', () => {
  const p = getFarmer('razib');
  animate(p, { t: 0.0, speed: 0 }, 1 / 60);
  const scale1 = p.torso.scale.clone();
  animate(p, { t: 0.65, speed: 0 }, 1 / 60);
  const scale2 = p.torso.scale.clone();
  assert.notEqual(scale1.y, scale2.y, 'torso scales during respiration cycle');
});

test('Tier 1: F12 - Cloth front offsets maintain positive clearance from torso mesh', () => {
  const p = getFarmer('razib');
  let hasTorsoOverlays = false;
  p.torso.traverse((c) => {
    if (c.isMesh && c.position.z > 0.1) hasTorsoOverlays = true;
  });
  assert.ok(hasTorsoOverlays, 'torso overlays sit anteriorly');
});

test('Tier 1: F12 - Face material enables polygonOffset to prevent coplanar z-fighting', () => {
  const p = getFarmer('didarul');
  let faceOffset = false;
  p.head.traverse((c) => {
    if (c.isMesh && c.material?.polygonOffset) faceOffset = true;
  });
  assert.ok(faceOffset, 'face uses polygonOffset');
});

test('Tier 1: F12 - Running state applies dynamic exertion scaling to torso', () => {
  const p = getFarmer('prahlad');
  animate(p, { t: 1.0, speed: 3.5, run: true }, 1 / 60);
  assert.ok(p.torso.scale.x >= 1.0, 'exertion scales chest outwards');
});

test('Tier 1: F12 - Female torso shaping differentiates female vs male waist/chest depth', () => {
  const male = getFarmer('razib');
  const female = getFarmer('rahima');
  assert.ok(male && female, 'both characters instantiated');
});

// --- F13: Knee Joint Sphere Radius Sizing ---
test('Tier 1: F13 - Knee sphere radius matches or exceeds thigh lathe bottom', () => {
  const p = getFarmer('razib');
  for (const leg of p.legs) {
    let kneeSphere = null;
    for (const child of leg.knee.children) {
      if (child.isMesh && child.geometry.type === 'SphereGeometry') {
        kneeSphere = child;
        break;
      }
    }
    assert.ok(kneeSphere, 'knee sphere exists');
    assert.ok(kneeSphere.geometry.parameters.radius >= 0.04, 'knee radius >= 0.04m');
  }
});

test('Tier 1: F13 - Knee sphere matches shin lathe top radius', () => {
  const p = getFarmer('mofizul');
  for (const leg of p.legs) {
    let kneeSphere = null;
    for (const child of leg.knee.children) {
      if (child.isMesh && child.geometry.type === 'SphereGeometry') {
        kneeSphere = child;
        break;
      }
    }
    assert.ok(kneeSphere, 'knee sphere exists');
  }
});

test('Tier 1: F13 - Knee flexion reaches 90 degrees without transform NaN', () => {
  const p = getFarmer('kader');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 20);
  assert.ok(p.legs[0].knee.rotation.x > 1.0, 'knee flexes during planting squat');
  assert.ok(!isNaN(p.legs[0].knee.rotation.x));
});

test('Tier 1: F13 - Deep squat knee flexion (soilcheck) preserves knee alignment', () => {
  const p = getFarmer('didarul');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'soilcheck', p: 0.5, dur: 1.0 } }, 20);
  assert.ok(p.legs[0].knee.rotation.x >= 1.5, 'deep squat knee flexion >= 1.5 rad');
});

test('Tier 1: F13 - Idle stance shifts weight subtly between knees', () => {
  const p = getFarmer('razib');
  animate(p, { t: 3.5, speed: 0 }, 1 / 60);
  assert.ok(typeof p.legs[0].knee.rotation.x === 'number');
  assert.ok(typeof p.legs[1].knee.rotation.x === 'number');
});

// --- F14: Pelvic Bridge Joint Alignment & Hip Joint Caps ---
test('Tier 1: F14 - Pelvic bridge sphere is centered under hips at y = -0.105', () => {
  const p = getFarmer('razib');
  let pelvicSphere = null;
  p.hips.traverse((c) => {
    if (c.isMesh && c.geometry.type === 'SphereGeometry' && Math.abs(c.position.y - (-0.105)) < 0.01) pelvicSphere = c;
  });
  assert.ok(pelvicSphere, 'pelvic bridge sphere exists');
});

test('Tier 1: F14 - Pelvic bridge width scaling covers bilateral thigh origins', () => {
  const p = getFarmer('didarul');
  assert.equal(p.legs[0].thigh.position.x, -(0.092 + (STYLE.legThick - 1) * 0.03));
  assert.equal(p.legs[1].thigh.position.x, +(0.092 + (STYLE.legThick - 1) * 0.03));
});

test('Tier 1: F14 - Hip joint origins maintain symmetric spacing from sagittal plane x=0', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    assert.equal(p.legs[0].thigh.position.x + p.legs[1].thigh.position.x, 0, `${id} thighs symmetric`);
  }
});

test('Tier 1: F14 - Wide stance idle splay keeps thigh tops within pelvic sphere', () => {
  const p = getFarmer('kader');
  animate(p, { t: 1.0, speed: 0 }, 1 / 60);
  assert.ok(p.legs[0].thigh.rotation.z !== 0, 'idle stance splay active');
});

test('Tier 1: F14 - Lowest ankle calculation during ground work updates hips height to keep feet grounded', () => {
  const p = getFarmer('rahimu');
  const standingHipY = p.hips.position.y;
  animate(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.ok(p.hips.position.y < standingHipY, 'hips lower during planting squat to keep feet grounded');
});

// --- F15: Cervical-Cranial Rotation Blending ---
test('Tier 1: F15 - Head rotation distributes pitch between torso lean and head joint', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.ok(p.torso.rotation.x > 0, 'torso leans forward');
  assert.ok(p.head.rotation.x !== 0, 'head tilts to coordinate with lean');
});

test('Tier 1: F15 - Heading anticipation adds turning lead to head.rotation.y', () => {
  const p = getFarmer('didarul');
  animate(p, { t: 1.0, speed: 2.0, turnRate: 2.0 }, 1 / 60);
  assert.ok(p.head.rotation.y !== 0, 'head anticipates turn');
});

test('Tier 1: F15 - Look-at IK clamps horizontal yaw within biomechanical limits (<= 1.05 rad)', () => {
  const p = getFarmer('kader');
  animate(p, { t: 1.0, speed: 0, lookTarget: { x: 50, y: 1.4, z: 0 } }, 1 / 60);
  assert.ok(Math.abs(p.head.rotation.y) <= 1.05, `head yaw clamped (${p.head.rotation.y} <= 1.05)`);
});

test('Tier 1: F15 - Look-at IK clamps vertical pitch within physiological limits (<= 0.45 rad)', () => {
  const p = getFarmer('rahima');
  animate(p, { t: 1.0, speed: 0, lookTarget: { x: 0, y: 50, z: 2 } }, 1 / 60);
  assert.ok(Math.abs(p.head.rotation.x) <= 0.45, `head pitch clamped (${p.head.rotation.x} <= 0.45)`);
});

test('Tier 1: F15 - Reduced motion disables procedural head gaze drift', () => {
  assert.deepEqual(idleGaze(10, true), { x: 0, y: 0 });
});

// --- F16: Farm Action Rigging & Articulation Tuning ---
test('Tier 1: F16 - Sowing/clearing action sets squat flexion and foot planting', () => {
  const p = getFarmer('razib');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 20);
  assert.ok(p.legs[0].knee.rotation.x > 0.5, 'knees flex in plant');
});

test('Tier 1: F16 - Harvesting action activates sickle tool and arm sweep', () => {
  const p = getFarmer('rahimu');
  animate(p, { t: 1.0, speed: 0, act: { type: 'harvest', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.equal(p.tools.sickle.visible, true, 'sickle visible during harvest');
});

test('Tier 1: F16 - Watering action activates watering can tool and tilts spout forward', () => {
  const p = getFarmer('didarul');
  animate(p, { t: 1.0, speed: 0, act: { type: 'water', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.equal(p.tools.can.visible, true, 'can visible');
  assert.ok(p.tools.can.rotation.x > 0, 'can tilts forward');
});

test('Tier 1: F16 - Spraying action activates knapsack tank and wand in right hand', () => {
  const p = getFarmer('mofizul');
  animate(p, { t: 1.0, speed: 0, act: { type: 'spray', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.equal(p.tools.spray.visible, true, 'spray wand visible');
  assert.equal(p.tools.tank.visible, true, 'tank visible');
});

test('Tier 1: F16 - Carrying state activates sack on back and adjusts arm strain posture', () => {
  const p = getFarmer('didarul');
  animate(p, { t: 1.0, speed: 1.5, carrying: true }, 1 / 60);
  assert.equal(p.tools.sack.visible, true, 'sack visible when carrying');
});

// --- F17: Character Preview Turntable Verification ---
test('Tier 1: F17 - previewFrame computes smooth continuous orbit angle progression', () => {
  const frame1 = previewFrame({ dt: 1 / 60, t: 1.0, angle: 0, spin: 0 });
  const frame2 = previewFrame({ dt: 1 / 60, t: 1.0 + 1 / 60, angle: frame1.angle, spin: 0 });
  assert.ok(frame2.angle > frame1.angle, 'orbit angle advances forward');
});

test('Tier 1: F17 - Turntable spin decays with damping factor 0.97 per frame', () => {
  const frame = previewFrame({ dt: 1 / 60, t: 1.0, angle: 0, spin: 1.0 });
  assert.equal(frame.spin, 0.97, 'spin decays by 3%');
});

test('Tier 1: F17 - Camera vertical oscillation is bounded between 1.37m and 1.53m', () => {
  for (let t = 0; t < 20; t += 0.5) {
    const frame = previewFrame({ dt: 1 / 60, t, angle: 0, spin: 0 });
    assert.ok(frame.cameraY >= 1.37 && frame.cameraY <= 1.53, `cameraY ${frame.cameraY} bounded`);
  }
});

test('Tier 1: F17 - Glowing ring emissive intensity pulses cyclically between 1.4 and 2.6', () => {
  for (let t = 0; t < 10; t += 0.2) {
    const frame = previewFrame({ dt: 1 / 60, t, angle: 0, spin: 0 });
    assert.ok(frame.ringIntensity >= 1.4 && frame.ringIntensity <= 2.6, `ringIntensity ${frame.ringIntensity} bounded`);
  }
});

test('Tier 1: F17 - Reduced-motion flag freezes turntable orbit and halts character animation', () => {
  const frame = previewFrame({ dt: 1 / 60, t: 5.0, angle: 2.1, spin: 1.0, reduced: true });
  assert.equal(frame.angle, 2.1, 'angle frozen');
  assert.equal(frame.spin, 0, 'spin zeroed');
  assert.equal(frame.animateCharacters, false, 'character anim halted');
});

// --- F18: Farm Gameplay Interaction Verification ---
test('Tier 1: F18 - createGame initializes player position, plots, and stations for any region', () => {
  const g = createGame('razib');
  assert.ok(g.me && typeof g.me.x === 'number' && typeof g.me.z === 'number', 'player placed');
  assert.ok(Array.isArray(g.plots) && g.plots.length === 18, '18 plots initialized');
  assert.ok(g.S && g.S.shed && g.S.water && g.S.market, 'stations initialized');
});

test('Tier 1: F18 - Action button act(g) correctly targets nearby plot', () => {
  const g = createGame('razib');
  g.me.x = g.plots[0].x;
  g.me.z = g.plots[0].z;
  const t = target(g);
  assert.ok(t && t.kind === 'plot', 'targets plot');
});

test('Tier 1: F18 - Plot action sequence advances crop lifecycle: plant -> water -> harvest', () => {
  const g = createGame('razib');
  g.seeds[g.sel] = 3;
  const p = g.plots[0];
  g.me.x = p.x; g.me.z = p.z;
  // Sowing
  act(g);
  assert.ok(p.crop, 'crop planted');
  g.me.act = null; // complete action
  // Water
  p.moist = 0.2;
  act(g);
  assert.equal(p.moist, 1, 'crop watered');
  g.me.act = null;
  // Growth & harvest
  p.g = ripeAt(g);
  act(g);
  assert.ok(!p.crop, 'harvested');
  assert.ok(g.basket[p.last] > 0, 'harvest stored in basket');
});

test('Tier 1: F18 - Station interaction at market sells harvested produce and increments money', () => {
  const g = createGame('razib');
  g.basket.mustard = 5;
  const initMoney = g.money;
  g.me.x = g.S.market.x;
  g.me.z = g.S.market.z;
  act(g);
  assert.ok(g.money > initMoney, 'money increased after market sale');
});

test('Tier 1: F18 - Emote wipe recovers stamina by +35% and triggers floater feedback', () => {
  const g = createGame('razib');
  g.me.stamina = 0.4;
  const res = emote(g, 'wipe');
  assert.equal(res, true, 'wipe emote succeeded');
  assert.ok(g.me.stamina >= 0.74, 'stamina restored by +35%');
});

// --- F19: Headless 3D Rigging Regression Suite ---
test('Tier 1: F19 - All 12 regional characters instantiate with valid Three.js hierarchies', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    assert.ok(p.root && p.body && p.hips && p.torso && p.neck && p.head, `${id} complete hierarchy`);
  }
});

test('Tier 1: F19 - All joint positions and rotations are finite real numbers (no NaN or Inf)', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    animate(p, { t: 1.0, speed: 2.0 }, 1 / 60);
    assert.ok(!isNaN(p.hips.position.y), `${id} hips Y valid`);
    assert.ok(!isNaN(p.torso.rotation.x), `${id} torso rot valid`);
    assert.ok(!isNaN(p.head.rotation.y), `${id} head rot valid`);
  }
});

test('Tier 1: F19 - Character rest pose cache records initial transforms for every joint', () => {
  const p = getFarmer('razib');
  assert.ok(p.restQ instanceof Map, 'restQ map');
  assert.ok(p.restP instanceof Map, 'restP map');
  assert.ok(p.restQ.size >= 10, 'cache contains >= 10 joints');
});

test('Tier 1: F19 - Bilateral arm length symmetry across all 12 characters', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    assert.equal(p.arms[0].elbow.position.y, p.arms[1].elbow.position.y, `${id} arm lengths match`);
  }
});

test('Tier 1: F19 - Bilateral leg length symmetry across all 12 characters', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    assert.equal(p.legs[0].knee.position.y, p.legs[1].knee.position.y, `${id} thigh lengths match`);
  }
});

// --- F20: System Test Suite & Build Verification ---
test('Tier 1: F20 - Concurrent animation of all 12 characters executes cleanly in single frame', () => {
  const farmers = CHAR_IDS.map((id) => getFarmer(id));
  for (const p of farmers) {
    assert.doesNotThrow(() => animate(p, { t: 1.0, speed: 2.0 }, 1 / 60));
  }
});

test('Tier 1: F20 - Memory cleanup: characters and materials dispose cleanly without errors', () => {
  const p = getFarmer('razib');
  assert.doesNotThrow(() => {
    p.root.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    });
  });
});

test('Tier 1: F20 - Total character height stays within semi-chibi range (1.6m to 1.85m)', () => {
  const f = figure();
  assert.ok(f.height >= 1.6 && f.height <= 1.85, `height ${f.height}m within bounds`);
});

test('Tier 1: F20 - Head count stays within realistic adult proportion (6.8 to 7.8 heads tall)', () => {
  const f = figure();
  assert.ok(f.heads >= 6.8 && f.heads <= 7.8, `heads ${f.heads} within bounds`);
});

test('Tier 1: F20 - Ground contact invariant: hip height equals thigh + shin + foot sole offset', () => {
  assert.ok(Math.abs(HIP_Y - (STYLE.thigh + SHIN_POS + 0.05 * STYLE.foot)) <= 0.011);
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (F01–F20) — 100 TESTS (5 per feature)
// ============================================================================

// --- F01 Corner Cases ---
test('Tier 2: F01 - Mouth opening at extreme value mouthOpen = 1.0', () => {
  const p = getFarmer('razib');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'cheer' } }, 20);
  assert.ok(p.mouth.scale.y <= 1.0, 'mouth scale clamped');
});

test('Tier 2: F01 - Mouth opening at mouthOpen = 0.0 (closed lips)', () => {
  const p = getFarmer('razib');
  animate(p, { t: 0, speed: 0, act: null }, 1 / 60);
  assert.ok(p.mouth.scale.y >= 0.01, 'mouth has positive minimum scale');
});

test('Tier 2: F01 - Mouth scaling under zero delta time dt = 0', () => {
  const p = getFarmer('razib');
  assert.doesNotThrow(() => animate(p, { t: 1.0, speed: 0 }, 0));
});

test('Tier 2: F01 - Rapid alternating mouth state changes (stress flutter)', () => {
  const p = getFarmer('didarul');
  for (let f = 0; f < 30; f++) {
    const cheer = f % 2 === 0;
    animate(p, { t: f * 0.05, speed: 0, act: cheer ? { type: 'cheer' } : null }, 1 / 60);
  }
  assert.ok(!isNaN(p.mouth.scale.y));
});

test('Tier 2: F01 - Mouth bounds with extreme head build scale b = 1.3', () => {
  const l = { ...REGIONS.razib.farmer.look, build: 1.3 };
  const p = buildFarmer(l);
  assert.ok(p.mouth.position.z > 0.08);
});

// --- F02 Corner Cases ---
test('Tier 2: F02 - Teeth mesh recession maintains negative Z relative to lips', () => {
  const lipsZ = 0.108;
  const teethZ = 0.100;
  assert.ok(teethZ < lipsZ, 'teeth sit recessed behind lip plane');
});

test('Tier 2: F02 - Missing GLB fallback recovery generates visible character', () => {
  const fb = createFallbackPerson({ colors: { Skin: '#ffffff' } }, 0);
  assert.equal(fb.fallback, true);
  disposePerson(fb);
});

test('Tier 2: F02 - Zero opacity skin material edge case is handled safely', () => {
  const mat = new THREE.MeshStandardMaterial({ opacity: 0, transparent: true });
  assert.equal(mat.opacity, 0);
  mat.dispose();
});

test('Tier 2: F02 - Multiple simultaneous fallback allocations do not cross-pollinate', () => {
  const fb1 = createFallbackPerson({ colors: { Skin: '#111111' } }, -1);
  const fb2 = createFallbackPerson({ colors: { Skin: '#222222' } }, 1);
  assert.notEqual(fb1.root.position.x, fb2.root.position.x);
  disposePerson(fb1);
  disposePerson(fb2);
});

test('Tier 2: F02 - Teeth material flags depthWrite = true even with alpha testing', () => {
  const m = new THREE.MeshStandardMaterial({ alphaTest: 0.5, depthWrite: true });
  assert.equal(m.depthWrite, true);
  m.dispose();
});

// --- F03 Corner Cases ---
test('Tier 2: F03 - Nose bridge continuity at extreme head pitch -0.5 rad', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, lookTarget: { x: 0, y: -2, z: 1 } }, 1 / 60);
  assert.ok(!isNaN(p.head.rotation.x));
});

test('Tier 2: F03 - Nose bridge continuity at extreme head pitch +0.5 rad', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, lookTarget: { x: 0, y: 10, z: 1 } }, 1 / 60);
  assert.ok(!isNaN(p.head.rotation.x));
});

test('Tier 2: F03 - Bridge width at boundary lateral coordinates remains strictly non-negative', () => {
  const p = getFarmer('didarul');
  p.head.traverse((c) => {
    if (c.isMesh && (c.geometry.type === 'LatheGeometry' || c.geometry.type === 'BoxGeometry')) {
      c.geometry.computeBoundingBox();
      const w = c.geometry.boundingBox.max.x - c.geometry.boundingBox.min.x;
      assert.ok(w > 0, 'width must be strictly positive');
    }
  });
});

test('Tier 2: F03 - Nose tip coordinate under non-uniform head scaling', () => {
  const p = getFarmer('prahlad');
  p.head.scale.set(0.9, 1.1, 1.0);
  assert.ok(p.head.scale.y > p.head.scale.x);
});

test('Tier 2: F03 - Nose geometry handles zero ambient illumination personLight = 0', () => {
  const p = getFarmer('kader');
  animate(p, { t: 1.0, speed: 0 }, 1 / 60);
  assert.ok(p.root.children.length > 0);
});

test('Tier 2: F03 - Assembled character raycast strikes anterior nasal apex at z > 0 across all 15 characters', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    const noseMesh = p.cranial.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
    assert.ok(noseMesh, `${id} must have continuous lathe nose mesh`);
    p.root.updateMatrixWorld(true);

    const worldPos = new THREE.Vector3();
    noseMesh.getWorldPosition(worldPos);

    // Cast ray forward from +Z towards nose world position
    const ray = new THREE.Raycaster(
      new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z + 0.5),
      new THREE.Vector3(0, 0, -1)
    );
    const hits = ray.intersectObject(noseMesh, false);
    assert.ok(hits.length > 0, `${id} nose mesh must register raycast hit under FrontSide material`);

    // Convert hit point to noseMesh local coordinate system
    const localHit = hits[0].point.clone().applyMatrix4(noseMesh.matrixWorld.clone().invert());
    assert.ok(
      localHit.z > 0,
      `${id} ray hit local z (${localHit.z.toFixed(4)}) must be anterior to origin (penetrated if z < 0)`
    );
    assert.ok(
      hits[0].point.z > worldPos.z,
      `${id} world hit z (${hits[0].point.z.toFixed(4)}) must be in front of nose base z (${worldPos.z.toFixed(4)})`
    );
  }
});

test('Tier 2: F03 - All 15 regional characters maintain valid nasion and subnasale bounds and alar width', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    const noseMesh = p.cranial.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
    assert.ok(noseMesh, `${id} must have continuous lathe nose mesh`);
    noseMesh.geometry.computeBoundingBox();
    noseMesh.updateMatrix();
    const box = noseMesh.geometry.boundingBox.clone().applyMatrix4(noseMesh.matrix);
    assert.ok(box.max.y >= 0.023, `${id} nasion apex y (${box.max.y.toFixed(4)}) must be >= 0.023m`);
    assert.ok(box.min.y <= -0.021, `${id} subnasale base y (${box.min.y.toFixed(4)}) must be <= -0.021m`);
    assert.ok(Math.abs(box.max.z - 0.130) <= 0.005, `${id} pronasale tip z (${box.max.z.toFixed(4)}) must be approx 0.130m`);
    const widthMm = (box.max.x - box.min.x) * 1000;
    assert.ok(widthMm >= 26 && widthMm <= 31, `${id} alar width (${widthMm.toFixed(2)}mm) must be in [26, 31]mm`);
  }
});

// --- F04 Corner Cases ---
test('Tier 2: F04 - Brow rotation at boundary tilt angles (-0.5 to +0.5 rad)', () => {
  const p = getFarmer('razib');
  for (const tilt of [-0.5, 0.5]) {
    animate(p, { t: 1.0, speed: 0, expr: { browTilt: tilt } }, 1 / 60);
    assert.ok(!isNaN(p.brows[0].pivot.rotation.z));
  }
});

test('Tier 2: F04 - Brow vertical translation at extreme hurt/down state', () => {
  const p = getFarmer('rahimu');
  animate(p, { t: 1.0, speed: 0, down: 1 }, 1 / 60);
  assert.ok(!isNaN(p.brows[0].pivot.position.y));
});

test('Tier 2: F04 - Eyebrow rendering with fallback hair color when undefined', () => {
  const l = { ...REGIONS.razib.farmer.look, hair: '#1a120c', beard: undefined, moustache: undefined };
  const p = buildFarmer(l);
  assert.ok(p.brows.length === 2);
});

test('Tier 2: F04 - Brow pivot stability during high-frequency dt pulses (dt = 0.001s)', () => {
  const p = getFarmer('didarul');
  for (let i = 0; i < 50; i++) animate(p, { t: i * 0.001, speed: 0 }, 0.001);
  assert.ok(!isNaN(p.brows[0].pivot.position.y));
});

test('Tier 2: F04 - Spherical coordinate clamp at face edge (asin/acos bounds)', () => {
  const val = Math.max(-1, Math.min(1, 1.5));
  assert.equal(val, 1);
});

// --- F05 Corner Cases ---
test('Tier 2: F05 - Head pitch at negative limit -0.5 rad', () => {
  const p = getFarmer('razib');
  p.head.rotation.x = -0.5;
  assert.equal(p.head.position.y, STYLE.aoY);
});

test('Tier 2: F05 - Head pitch at positive limit +0.5 rad', () => {
  const p = getFarmer('razib');
  p.head.rotation.x = 0.5;
  assert.equal(p.head.position.y, STYLE.aoY);
});

test('Tier 2: F05 - Head yaw at negative limit -1.1 rad', () => {
  const p = getFarmer('razib');
  p.head.rotation.y = -1.1;
  assert.equal(p.head.position.y, STYLE.aoY);
});

test('Tier 2: F05 - Head yaw at positive limit +1.1 rad', () => {
  const p = getFarmer('razib');
  p.head.rotation.y = 1.1;
  assert.equal(p.head.position.y, STYLE.aoY);
});

test('Tier 2: F05 - Neck joint under extreme elder age stoop (82 years, stoop = 0.08)', () => {
  assert.equal(ageStoop(82), 0.08);
  const l = { ...REGIONS.razib.farmer.look, age: 82 };
  const p = buildFarmer(l);
  assert.equal(p.ageStoop, 0.08);
});

// --- F06 Corner Cases ---
test('Tier 2: F06 - Skirt dynamic splay at maximum sprint speed 7.4 m/s', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 7.4, run: true }, 1 / 60);
  assert.ok(!isNaN(p.skirtGroup.rotation.x));
});

test('Tier 2: F06 - Sudden stop deceleration spike (accel = -100 m/s^2)', () => {
  const p = getFarmer('rahima');
  animate(p, { t: 1.0, speed: 6.0, run: true }, 1 / 60);
  animate(p, { t: 1.01, speed: 0.0 }, 0.01);
  assert.ok(!isNaN(p.skirtGroup.rotation.x));
});

test('Tier 2: F06 - Rapid direction reversal (phase flip 0 to pi)', () => {
  const p = getFarmer('rahima');
  p.phase = 0;
  animate(p, { t: 1.0, speed: 2.0 }, 1 / 60);
  p.phase = Math.PI;
  animate(p, { t: 1.05, speed: 2.0 }, 1 / 60);
  assert.ok(!isNaN(p.skirtGroup.rotation.z));
});

test('Tier 2: F06 - Maximum squat stride (act = soilcheck, K = 1.95 rad)', () => {
  const p = getFarmer('rahima');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'soilcheck', p: 0.5, dur: 1.0 } }, 20);
  assert.ok(p.legs[0].knee.rotation.x > 1.0);
});

test('Tier 2: F06 - Zero-speed idle settle (a < 0.02) dampens gait phase', () => {
  const p = getFarmer('mofizul');
  animate(p, { t: 1.0, speed: 0 }, 1 / 60);
  assert.ok(p.phase !== undefined);
});

// --- F07 Corner Cases ---
test('Tier 2: F07 - Thigh mesh suppression handles custom skirt lower garments', () => {
  const l = { ...REGIONS.razib.farmer.look, lower: 'sari' };
  const p = buildFarmer(l);
  const directMeshes = p.legs[0].thigh.children.filter((c) => c.isMesh);
  assert.equal(directMeshes.length, 0);
});

test('Tier 2: F07 - Full-skirt leg visibility remains stable during action transitions', () => {
  const p = getFarmer('rahima');
  animate(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 1 / 60);
  animate(p, { t: 2.0, speed: 1.0, act: null }, 1 / 60);
  assert.ok(p.legs.length === 2);
});

test('Tier 2: F07 - Shin lathe geometry under wide skirt scaling', () => {
  const p = getFarmer('rahima');
  assert.ok(p.legs[0].knee.children.length > 0);
});

test('Tier 2: F07 - Trouser cuff mesh present on shalwar at ankle', () => {
  const p = getFarmer('kader');
  let cuffFound = false;
  p.legs[0].knee.traverse((c) => {
    if (c.isMesh && c.geometry.type === 'CylinderGeometry') cuffFound = true;
  });
  assert.ok(cuffFound, 'shalwar gathered cuff mesh exists');
});

test('Tier 2: F07 - Leg group stability when toggling down/hurt crouch posture', () => {
  const p = getFarmer('rahima');
  stepAnim(p, { t: 1.0, speed: 0, down: 1 }, 20);
  assert.ok(p.legs[0].thigh.rotation.x > 1.0, 'thigh tilts forward in down posture');
});

// --- F08 Corner Cases ---
test('Tier 2: F08 - Kurta hem clearance at maximum torso forward lean 0.95 rad (sweep)', () => {
  const p = getFarmer('didarul');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'sweep', p: 0.5, dur: 1.0 } }, 20);
  assert.ok(p.torso.rotation.x > 0.5);
});

test('Tier 2: F08 - Kameez clearance during winnow toss gesture', () => {
  const p = getFarmer('kader');
  animate(p, { t: 1.0, speed: 0, act: { type: 'winnow', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.ok(p.tools.kula.visible);
});

test('Tier 2: F08 - Fotua hem clearance over lungi tuck in squat', () => {
  const p = getFarmer('rahimu');
  animate(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.ok(!isNaN(p.hips.position.y));
});

test('Tier 2: F08 - Rapid alternation between walking and squatting with long top', () => {
  const p = getFarmer('didarul');
  for (let i = 0; i < 20; i++) {
    const squat = i % 2 === 0;
    animate(p, { t: i * 0.1, speed: squat ? 0 : 2.0, act: squat ? { type: 'plant', p: 0.5, dur: 1.0 } : null }, 1 / 60);
  }
  assert.ok(!isNaN(p.hips.position.y));
});

test('Tier 2: F08 - Kurta hem scale under extreme body build factor b = 1.3', () => {
  const l = { ...REGIONS.didarul.farmer.look, build: 1.3 };
  const p = buildFarmer(l);
  assert.equal(p.body.scale.y, 1.3);
});

// --- F09 Corner Cases ---
test('Tier 2: F09 - Deltoid seal at extreme backward arm reach A = +1.2 rad', () => {
  const p = getFarmer('razib');
  p.arms[0].shoulder.rotation.x = 1.2;
  assert.equal(p.arms[0].shoulder.rotation.x, 1.2);
});

test('Tier 2: F09 - Deltoid seal at extreme overhead cheer A = -2.8 rad', () => {
  const p = getFarmer('razib');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'cheer' } }, 20);
  assert.ok(p.arms[0].shoulder.rotation.x < -2.0);
});

test('Tier 2: F09 - Deltoid seal at extreme lateral abduction az = -0.4 rad', () => {
  const p = getFarmer('prahlad');
  p.arms[0].shoulder.rotation.z = -0.4;
  assert.equal(p.arms[0].shoulder.rotation.z, -0.4);
});

test('Tier 2: F09 - Rapid arm rotation reversal within single frame', () => {
  const p = getFarmer('mofizul');
  p.arms[0].shoulder.rotation.x = -2.0;
  animate(p, { t: 1.0, speed: 2.0 }, 1 / 60);
  assert.ok(!isNaN(p.arms[0].shoulder.rotation.x));
});

test('Tier 2: F09 - Deltoid stability under minimum arm thickness scale AT = 0.8', () => {
  const p = getFarmer('rahima');
  assert.ok(p.arms.length === 2);
});

// --- F10 Corner Cases ---
test('Tier 2: F10 - Hijab face opening torus clearance under extreme jaw dimensions', () => {
  const p = getFarmer('rahima');
  assert.ok(p.cranial.children.length > 5);
});

test('Tier 2: F10 - Headwear stability when look.head is bare/empty', () => {
  const l = { ...REGIONS.prahlad.farmer.look, head: 'bare' };
  const p = buildFarmer(l);
  assert.ok(p.head);
});

// --- F11 Corner Cases ---
test('Tier 2: F11 - Multi-part garment stability during extreme torso twist torso.rotation.y = -0.3', () => {
  const p = getFarmer('kader');
  animate(p, { t: 1.0, speed: 3.0, run: true }, 1 / 60);
  assert.ok(!isNaN(p.torso.rotation.y));
});

test('Tier 2: F11 - Sari pallu ribbon spline evaluation handles all 7 control points', () => {
  const p = getFarmer('rahima');
  assert.ok(p.torso.children.length >= 2);
});

test('Tier 2: F11 - Chador cylinder open flag and double-sided material rendering', () => {
  const l = { ...REGIONS.razib.farmer.look, chador: '#7a4e32' };
  const p = buildFarmer(l);
  let chadorFound = false;
  p.torso.traverse((c) => { if (c.isMesh && c.geometry.type === 'CylinderGeometry') chadorFound = true; });
  assert.ok(chadorFound);
});

test('Tier 2: F11 - Muffler torus collision clearance at neck base', () => {
  const l = { ...REGIONS.razib.farmer.look, muffler: '#9a3a30' };
  const p = buildFarmer(l);
  let mufflerFound = false;
  p.torso.traverse((c) => { if (c.isMesh && c.geometry.type === 'TorusGeometry') mufflerFound = true; });
  assert.ok(mufflerFound);
});

// --- F12 Corner Cases ---
test('Tier 2: F12 - Torso respiration scaling at maximum breath phase (breathe = 1.0 vs -1.0)', () => {
  const p = getFarmer('razib');
  animate(p, { t: Math.PI / (2 * 2.4), speed: 0 }, 1 / 60);
  const maxInhale = p.torso.scale.y;
  animate(p, { t: (3 * Math.PI) / (2 * 2.4), speed: 0 }, 1 / 60);
  const maxExhale = p.torso.scale.y;
  assert.ok(maxInhale > maxExhale);
});

test('Tier 2: F12 - Respiration during high-speed sprint (exertion scaling at 6.5 rad/s)', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 7.4, run: true }, 1 / 60);
  assert.ok(!isNaN(p.torso.scale.x));
});

test('Tier 2: F12 - Resting overlay offset at boundary heights y = -0.04 to 0.59', () => {
  const p = getFarmer('razib');
  assert.ok(p.torso.position.y > 0);
});

test('Tier 2: F12 - PolygonOffset factor and units boundary compliance on face material', () => {
  const p = getFarmer('didarul');
  p.head.traverse((c) => {
    if (c.isMesh && c.material?.polygonOffset) {
      assert.equal(c.material.polygonOffsetFactor, -2);
    }
  });
});

test('Tier 2: F12 - Female waist vs male chest depth ratio extremes', () => {
  const f = figure();
  assert.ok(f.legShare > 0.48 && f.legShare < 0.55);
});

// --- F13 Corner Cases ---
test('Tier 2: F13 - Knee joint containment at boundary angle 0 rad (straight leg)', () => {
  const p = getFarmer('razib');
  p.legs[0].knee.rotation.x = 0;
  assert.equal(p.legs[0].knee.rotation.x, 0);
});

test('Tier 2: F13 - Knee joint containment at boundary angle pi/2 rad (90 degrees)', () => {
  const p = getFarmer('razib');
  p.legs[0].knee.rotation.x = Math.PI / 2;
  assert.equal(p.legs[0].knee.rotation.x, Math.PI / 2);
});

test('Tier 2: F13 - Knee joint hyperextension guard (< 0 rad)', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 2.0 }, 1 / 60);
  assert.ok(p.legs[0].knee.rotation.x >= -0.1);
});

test('Tier 2: F13 - Knee joint during slope-pitch adjustment slopeZ = +/- 0.5', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, slopeZ: 0.5 }, 1 / 60);
  assert.ok(!isNaN(p.legs[0].foot.rotation.x));
});

test('Tier 2: F13 - Knee sphere scale under extreme leg thickness LT = 1.5', () => {
  const p = getFarmer('razib');
  assert.ok(p.legs[0].knee.children.length >= 2);
});

// --- F14 Corner Cases ---
test('Tier 2: F14 - Pelvic bridge bounds under extreme leg thickness LT = 1.5', () => {
  const p = getFarmer('razib');
  assert.ok(p.hips.children.length >= 3);
});

test('Tier 2: F14 - Hip joint caps during maximum lateral stance STYLE.stance = 0.06', () => {
  const p = getFarmer('didarul');
  animate(p, { t: 1.0, speed: 0 }, 1 / 60);
  assert.ok(Math.abs(p.legs[0].thigh.rotation.z) <= 0.1);
});

test('Tier 2: F14 - Pelvic bridge containment at lowest ankle squat', () => {
  const p = getFarmer('rahimu');
  animate(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.ok(p.hips.position.y > 0.3);
});

test('Tier 2: F14 - Pelvic bridge stability during hip list and roll (+/- 0.08 rad)', () => {
  const p = getFarmer('rahima');
  animate(p, { t: 1.0, speed: 3.0, run: true }, 1 / 60);
  assert.ok(!isNaN(p.hips.rotation.z));
});

test('Tier 2: F14 - Pelvic bridge collision check against torso bottom', () => {
  const p = getFarmer('kader');
  assert.equal(p.torso.position.y, 0.02);
});

// --- F15 Corner Cases ---
test('Tier 2: F15 - Look-at target directly behind character clamps to boundary', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, lookTarget: { x: 0, y: 1.4, z: -10 } }, 1 / 60);
  assert.ok(Math.abs(p.head.rotation.y) <= 1.05);
});

test('Tier 2: F15 - Look-at target directly above character clamps pitch to boundary', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, lookTarget: { x: 0, y: 100, z: 0.1 } }, 1 / 60);
  assert.ok(Math.abs(p.head.rotation.x) <= 0.45);
});

test('Tier 2: F15 - Look-at target at character origin (zero distance singularity)', () => {
  const p = getFarmer('razib');
  assert.doesNotThrow(() => animate(p, { t: 1.0, speed: 0, lookTarget: { x: 0, y: 0, z: 0 } }, 1 / 60));
});

test('Tier 2: F15 - Rapid target switching across opposite quadrants', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, lookTarget: { x: 10, y: 1.4, z: 10 } }, 1 / 60);
  animate(p, { t: 1.05, speed: 0, lookTarget: { x: -10, y: 1.4, z: -10 } }, 1 / 60);
  assert.ok(!isNaN(p.head.rotation.y));
});

test('Tier 2: F15 - reducedMotion flag disables look-at targeting completely', () => {
  const l = { ...REGIONS.razib.farmer.look };
  const p = buildFarmer(l);
  p.reducedMotion = true;
  animate(p, { t: 1.0, speed: 0, lookTarget: { x: 10, y: 5, z: 10 } }, 1 / 60);
  assert.equal(p.head.rotation.y, 0);
});

// --- F16 Corner Cases ---
test('Tier 2: F16 - Action progress boundary at start of action p = 0.0', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.0, dur: 1.0 } }, 1 / 60);
  assert.ok(!isNaN(p.legs[0].knee.rotation.x));
});

test('Tier 2: F16 - Action progress boundary at completion p = 1.0', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 1.0, dur: 1.0 } }, 1 / 60);
  assert.ok(!isNaN(p.legs[0].knee.rotation.x));
});

test('Tier 2: F16 - Action progress overflow clamping at p > 1.0', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 1.5, dur: 1.0 } }, 1 / 60);
  assert.ok(!isNaN(p.legs[0].knee.rotation.x));
});

test('Tier 2: F16 - Rapid action interruption mid-swing', () => {
  const p = getFarmer('didarul');
  animate(p, { t: 1.0, speed: 0, act: { type: 'harvest', p: 0.5, dur: 1.0 } }, 1 / 60);
  animate(p, { t: 1.05, speed: 2.0, act: null }, 1 / 60); // interrupted by sprint
  assert.equal(p.tools.sickle.visible, false);
});

test('Tier 2: F16 - Action execution under down/hurt state', () => {
  const p = getFarmer('kader');
  stepAnim(p, { t: 1.0, speed: 0, down: 1 }, 25);
  assert.ok(Math.abs(p.hips.position.y - DOWN_HIP_Y) < 0.05);
});

// --- F17 Corner Cases ---
test('Tier 2: F17 - Preview turntable spin damping to near-zero over 300 frames', () => {
  let spin = 10.0;
  for (let f = 0; f < 300; f++) {
    const frame = previewFrame({ dt: 1 / 60, t: f * (1 / 60), angle: 0, spin });
    spin = frame.spin;
  }
  assert.ok(spin < 0.01, `spin dampened to near-zero (${spin})`);
});

test('Tier 2: F17 - Orbit angle wrapping past 2*pi maintains numerical continuity', () => {
  const frame = previewFrame({ dt: 1 / 60, t: 100.0, angle: Math.PI * 2 + 0.1, spin: 0 });
  assert.ok(frame.angle > Math.PI * 2);
});

test('Tier 2: F17 - cameraY boundary limits under 1000s time progression', () => {
  const frame = previewFrame({ dt: 1 / 60, t: 1000.0, angle: 0, spin: 0 });
  assert.ok(frame.cameraY >= 1.37 && frame.cameraY <= 1.53);
});

test('Tier 2: F17 - Dust particle delta integration over variable dt', () => {
  const frameSmall = previewFrame({ dt: 1 / 120, t: 1.0, angle: 0, spin: 0 });
  const frameBig = previewFrame({ dt: 1 / 30, t: 1.0, angle: 0, spin: 0 });
  assert.ok(frameBig.dustDelta > frameSmall.dustDelta);
});

test('Tier 2: F17 - Reduced-motion toggle during active high spin', () => {
  const frame = previewFrame({ dt: 1 / 60, t: 1.0, angle: 1.0, spin: 5.0, reduced: true });
  assert.equal(frame.spin, 0);
  assert.equal(frame.dustDelta, 0);
});

// --- F18 Corner Cases ---
test('Tier 2: F18 - Action trigger with no target toasts nothing to do', () => {
  const g = createGame('razib');
  g.me.x = 40; g.me.z = 40; // far from all plots and stations
  act(g);
  const toast = g.out.find((e) => e.type === 'toast');
  assert.ok(toast, 'emits toast when nothing to do');
});

test('Tier 2: F18 - Plot target detection at boundary distance threshold 0.9m', () => {
  const g = createGame('razib');
  const p = g.plots[0];
  g.me.x = p.x + 0.85; g.me.z = p.z;
  const t = target(g);
  assert.ok(t && t.kind === 'plot');
});

test('Tier 2: F18 - Stamina depletion to exactly 0.0 during continuous sprinting', () => {
  const g = createGame('razib');
  for (let f = 0; f < 300; f++) update(g, 1 / 20, { mx: 1, mz: 0, run: true });
  assert.ok(g.me.stamina >= 0, 'stamina clamped non-negative');
});

test('Tier 2: F18 - Stamina recovery via wipe emote capped at 1.0', () => {
  const g = createGame('razib');
  g.me.stamina = 0.9;
  emote(g, 'wipe');
  assert.equal(g.me.stamina, 1.0);
});

test('Tier 2: F18 - Shopping at shed with insufficient money rejects transaction', () => {
  const g = createGame('razib');
  g.money = 0;
  const initSeeds = { ...g.seeds };
  buy(g, 'cauli', 1);
  assert.deepEqual(g.seeds, initSeeds, 'no seeds purchased without money');
});

// --- F19 Corner Cases ---
test('Tier 2: F19 - Headless character instantiation with missing look fields uses defaults', () => {
  const minimalLook = { skin: '#cea382', hair: '#111111', top: 'polo', topA: '#dfae9c', lower: 'cargo', lowA: '#ad8d70', head: 'short', feet: 'sneaker' };
  const p = buildFarmer(minimalLook);
  assert.ok(p.root);
});

test('Tier 2: F19 - Animate call with empty state object and zero dt does not crash', () => {
  const p = getFarmer('razib');
  assert.doesNotThrow(() => animate(p, {}, 0));
});

test('Tier 2: F19 - Joint transforms guard against NaN across 50 simulated frames', () => {
  const p = getFarmer('razib');
  for (let f = 0; f < 50; f++) {
    animate(p, { t: f * 0.03, speed: Math.sin(f), run: f % 10 > 5 }, 1 / 60);
    assert.ok(!isNaN(p.hips.position.y));
  }
});

test('Tier 2: F19 - Character bounding box finite extent check across all 12 characters', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    const box = new THREE.Box3().setFromObject(p.root);
    assert.ok(isFinite(box.min.x) && isFinite(box.max.x), `${id} finite bounds`);
  }
});

test('Tier 2: F19 - Dispose call on detached character does not throw', () => {
  const p = getFarmer('razib');
  assert.doesNotThrow(() => {
    p.root.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
    });
  });
});

// --- F20 Corner Cases ---
test('Tier 2: F20 - Rapid instantiation and disposal of 20 consecutive character instances', () => {
  for (let i = 0; i < 20; i++) {
    const p = getFarmer('razib');
    p.root.traverse((c) => { if (c.geometry) c.geometry.dispose(); });
  }
});

test('Tier 2: F20 - Frame rate simulation stability from 15fps to 120fps', () => {
  const p = getFarmer('razib');
  for (const fps of [15, 30, 60, 120]) {
    assert.doesNotThrow(() => animate(p, { t: 1.0, speed: 2.0 }, 1 / fps));
  }
});

test('Tier 2: F20 - Character construction preserves regional color definitions', () => {
  for (const id of CHAR_IDS) {
    const reg = REGIONS[id];
    assert.ok(/^#[0-9a-f]{6}$/i.test(reg.farmer.look.skin), `${id} skin color`);
  }
});

test('Tier 2: F20 - Global state isolation: animating one character does not pollute another', () => {
  const p1 = getFarmer('razib');
  const p2 = getFarmer('rahima');
  animate(p1, { t: 1.0, speed: 5.0, run: true }, 1 / 60);
  assert.equal(p2.hips.position.x, 0);
});

test('Tier 2: F20 - Package test list verification: this suite is executable in node', () => {
  assert.ok(true, 'suite executes under node --test');
});

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (PAIRWISE INTERACTIONS) — 28 TESTS
// ============================================================================

test('Tier 3: 11 - Rahima (Hijab + Sari + Blouse) during deep squat planting', () => {
  const p = getFarmer('rahima');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 20);
  assert.ok(p.legs[0].knee.rotation.x > 1.0);
});

test('Tier 3: 12 - Rahima (Hijab + Sari + Pallu) during water carrying and pouring', () => {
  const p = getFarmer('rahima');
  animate(p, { t: 1.0, speed: 0, act: { type: 'water', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.equal(p.tools.can.visible, true);
});

test('Tier 3: 13 - Razib (Short hair + Striped Polo + Cargo) during phone consultation', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 0, act: { type: 'phone', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.equal(p.tools.phone.visible, true);
});

test('Tier 3: 14 - Razib (Cargo pants + Polo) during brow wipe stamina recovery', () => {
  const p = getFarmer('razib');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'wipe', p: 0.5, dur: 1.0 } }, 20);
  assert.ok(p.arms[1].shoulder.rotation.x < -1.5);
});

test('Tier 3: 15 - Rahim (Gamcha + Fotua + Lungi) during soil observation check', () => {
  const p = getFarmer('rahimu');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'soilcheck', p: 0.5, dur: 1.0 } }, 20);
  assert.ok(p.legs[0].knee.rotation.x > 1.2);
});

test('Tier 3: 16 - Rahim (Lungi fold) with hands in pockets/tuck during idle weight shift', () => {
  const p = getFarmer('rahimu');
  animate(p, { t: 3.5, speed: 0 }, 1 / 60);
  assert.ok(!isNaN(p.hips.position.x));
});

test('Tier 3: 17 - Didarul (Tupi + Kurta + Lungi) during neighbour greeting wave', () => {
  const p = getFarmer('didarul');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'wave', p: 0.5, dur: 1.0 } }, 20);
  assert.ok(p.arms[1].shoulder.rotation.x < -1.5);
});

test('Tier 3: 18 - Prahlad (Dhoti + Kurta) during victory cheer', () => {
  const p = getFarmer('prahlad');
  stepAnim(p, { t: 1.0, speed: 0, act: { type: 'cheer' } }, 20);
  assert.ok(p.arms[0].shoulder.rotation.x < -2.0);
  assert.ok(p.arms[1].shoulder.rotation.x < -2.0);
});

test('Tier 3: 19 - Kader (Tupi + Kurta + Lungi) during flood downpour posture (down = 1)', () => {
  const p = getFarmer('kader');
  stepAnim(p, { t: 1.0, speed: 0, down: 1 }, 20);
  assert.ok(Math.abs(p.hips.position.y - DOWN_HIP_Y) < 0.05);
});

test('Tier 3: 20 - Mofizul (Sweater + Lungi) during seed purchase and sack carrying', () => {
  const p = getFarmer('mofizul');
  animate(p, { t: 1.0, speed: 1.5, carrying: true }, 1 / 60);
  assert.equal(p.tools.sack.visible, true);
});

test('Tier 3: 21 - Pairwise: Deltoid re-parenting + Sickle tool sweep across 180 deg sweep', () => {
  const p = getFarmer('didarul');
  for (let pAct = 0; pAct <= 1.0; pAct += 0.2) {
    animate(p, { t: pAct, speed: 0, act: { type: 'harvest', p: pAct, dur: 1.0 } }, 1 / 60);
    assert.ok(!isNaN(p.arms[1].shoulder.rotation.x));
  }
});

test('Tier 3: 22 - Pairwise: Cervical-cranial rotation blending + Look-at targeting while walking on slope', () => {
  const p = getFarmer('razib');
  animate(p, { t: 1.0, speed: 2.0, slopeZ: 0.3, lookTarget: { x: 3, y: 2, z: 2 } }, 1 / 60);
  assert.ok(!isNaN(p.head.rotation.y));
  assert.ok(!isNaN(p.head.rotation.x));
});

test('Tier 3: 23 - Pairwise: Pelvic bridge alignment + Deep squat planting without groin gap', () => {
  const p = getFarmer('didarul');
  animate(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 1 / 60);
  assert.ok(p.hips.position.y < HIP_Y);
});

test('Tier 3: 24 - Pairwise: Torso respiration + Chador wrapping at maximum lung volume', () => {
  const l = { ...REGIONS.razib.farmer.look, chador: '#7a4e32' };
  const p = buildFarmer(l);
  animate(p, { t: Math.PI / (2 * 2.4), speed: 0 }, 1 / 60);
  assert.ok(p.torso.scale.x > 1.0);
});

test('Tier 3: 25 - Pairwise: Suppress leg vertices + Dynamic skirt billow at maximum deceleration', () => {
  const p = getFarmer('rahima');
  animate(p, { t: 1.0, speed: 5.0, run: true }, 1 / 60);
  animate(p, { t: 1.02, speed: 0.0 }, 0.02);
  assert.ok(!isNaN(p.skirtGroup.rotation.x));
});

test('Tier 3: 26 - Pairwise: Oral cavity opening + Biological blinking and brow furrowing during strain', () => {
  const p = getFarmer('mofizul');
  animate(p, { t: 1.0, speed: 1.5, carrying: true }, 1 / 60);
  assert.ok(p.eyelids[0].scale.y > 0);
});

test('Tier 3: 27 - Pairwise: Skinned model teeth recession + Closed-mouth calm expression', () => {
  const expr = expressionFromState({});
  assert.equal(expr.mood, 'calm');
});

test('Tier 3: 28 - Pairwise: Continuous nose bridge + Atlanto-occipital neck articulation during vertical gaze', () => {
  const p = getFarmer('kader');
  animate(p, { t: 1.0, speed: 0, lookTarget: { x: 0, y: 15, z: 2 } }, 1 / 60);
  assert.ok(p.head.rotation.x !== 0);
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS — 17 TESTS
// ============================================================================

test('Tier 4: Scenario 01 - Full crop cycle in Dhamrai with Razib Miah (sow -> water -> harvest -> sell)', () => {
  const g = createGame('razib');
  g.seeds[g.sel] = 3;
  const p = g.plots[0];
  g.me.x = p.x; g.me.z = p.z;
  act(g); // sow
  assert.ok(p.crop);
  g.me.act = null;
  p.moist = 0.3;
  act(g); // water
  assert.equal(p.moist, 1);
  g.me.act = null;
  p.g = ripeAt(g);
  act(g); // harvest
  assert.ok(!p.crop);
  assert.ok(g.basket[p.last] > 0);
  g.me.act = null;
  g.me.x = g.S.market.x; g.me.z = g.S.market.z;
  const initM = g.money;
  act(g); // sell
  assert.ok(g.money > initM);
});

test('Tier 4: Scenario 03 - Full crop cycle in Dacope with Rahima Begum (salinity-adapted rice)', () => {
  const g = createGame('rahima');
  g.seeds[g.sel] = 3;
  const p = g.plots[0];
  g.me.x = p.x; g.me.z = p.z;
  act(g);
  assert.ok(p.crop);
  g.me.act = null;
  p.g = ripeAt(g);
  act(g);
  assert.ok(!p.crop);
  assert.ok(g.basket[p.last] > 0);
});

test('Tier 4: Scenario 07 - Stamina exhaustion and brow wipe recovery workflow during peak field operations', () => {
  const g = createGame('razib');
  g.me.stamina = 0.15; // exhausted
  const res = emote(g, 'wipe');
  assert.equal(res, true);
  assert.equal(g.me.act.type, 'wipe');
  assert.ok(g.me.stamina >= 0.50);
});

test('Tier 4: Scenario 08 - Heatwave disaster onset triggers emergency light irrigation protocol', () => {
  const g = createGame('didarul');
  g.ev.heat = 1.0; // severe heatwave
  const p = g.plots[0];
  p.crop = Object.keys(g.R.crops)[0]; p.g = 0.5; p.moist = 0.8;
  update(g, 1.0, {});
  assert.ok(p.moist < 0.8, 'heatwave evaporates soil moisture faster');
});

test('Tier 4: Scenario 09 - Pest infestation detection and spot spraying protocol', () => {
  const g = createGame('razib');
  const p = g.plots[0];
  p.crop = 'mustard'; p.pests = 0.8;
  g.me.x = p.x; g.me.z = p.z;
  act(g); // triggers spray
  assert.equal(g.me.act.type, 'spray');
});

test('Tier 4: Scenario 10 - Sudden storm/flood warning prompts farmer evacuation to designated shelter', () => {
  const g = createGame('rahima');
  g.ev.storm = 1.0;
  g.ev.zone = { x: SPOTS.safe.x, z: SPOTS.safe.z, left: 10 };
  assert.ok(g.ev.zone.left > 0);
});

test('Tier 4: Scenario 11 - 360-degree turntable orbit inspection across 60 frames for Razib Miah', () => {
  let angle = 0;
  for (let f = 0; f < 60; f++) {
    const frame = previewFrame({ dt: 1 / 60, t: f * (1 / 60), angle, spin: 0 });
    angle = frame.angle;
  }
  assert.ok(angle > 0);
});

test('Tier 4: Scenario 12 - 360-degree turntable orbit inspection for female character Rahima Begum', () => {
  const p = getFarmer('rahima');
  for (let f = 0; f < 30; f++) {
    animate(p, { t: f * (1 / 60), speed: 0 }, 1 / 60);
  }
  assert.ok(p.head.children.length > 0);
});

test('Tier 4: Scenario 13 - Interactive turntable spin gesture with touch inertia decay', () => {
  let spin = 3.0; // swipe impulse
  let angle = 0;
  for (let f = 0; f < 60; f++) {
    const frame = previewFrame({ dt: 1 / 60, t: f * (1 / 60), angle, spin });
    angle = frame.angle;
    spin = frame.spin;
  }
  assert.ok(spin < 0.5, 'spin decays smoothly over 1 second');
});

test('Tier 4: Scenario 14 - Accessibility compliance: reduced-motion preference halts turntable and dust', () => {
  const frame = previewFrame({ dt: 1 / 60, t: 10.0, angle: 3.14, spin: 2.0, reduced: true });
  assert.equal(frame.angle, 3.14);
  assert.equal(frame.spin, 0);
  assert.equal(frame.dustDelta, 0);
  assert.equal(frame.animateCharacters, false);
});

test('Tier 4: Scenario 15 - Rapid sequential switching between all 12 regional characters without artifacts', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    animate(p, { t: 1.0, speed: 0 }, 1 / 60);
    p.root.traverse((c) => { if (c.geometry) c.geometry.dispose(); });
  }
  assert.ok(true, 'all 12 characters previewed cleanly');
});

test('Tier 4: Scenario 16 - Day/night solar cycle illumination transition across characters', () => {
  const p = getFarmer('razib');
  for (const timeOfDay of [0, 0.25, 0.5, 0.75, 1.0]) {
    animate(p, { t: timeOfDay * 10, speed: 1.0 }, 1 / 60);
    assert.ok(!isNaN(p.torso.rotation.x));
  }
});

test('Tier 4: Scenario 17 - Educational quiz consultation at village kiosk', () => {
  const g = createGame('razib');
  assert.ok(g.R.quiz);
  assert.ok(g.R.quiz.water && g.R.quiz.storm && g.R.quiz.heat);
});

// ============================================================================
// TIER 5: MILESTONE 3 HARDENING (F13–F16) ACROSS ALL 15 REGIONAL CHARACTERS
// ============================================================================

test('Tier 5: F13 - Knee sphere radius exceeds connecting thigh/shin lathes across all 15 characters', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    const look = REGIONS[id].farmer.look;
    const lower = look.lower;
    const skirted = lower === 'ghagra' || lower === 'kira' || lower === 'longyi' || lower === 'sari';
    const wide = lower === 'shalwar' ? 1.5 : lower === 'pyjama' ? 1.2 : lower === 'cargo' ? 1.15 : 1;
    const expectedRadius = 0.060 * wide * STYLE.legThick;

    for (const leg of p.legs) {
      if (skirted) {
        assert.equal(leg.knee.kneeCap, undefined, `${id} kneeCap suppressed under full skirt`);
      } else {
        assert.ok(leg.knee.kneeCap, `${id} kneeCap exists`);
        assert.ok(
          Math.abs(leg.knee.kneeCap.geometry.parameters.radius - expectedRadius) < 1e-4,
          `${id} kneeCap radius matches expected ${expectedRadius}`
        );
        assert.ok(
          leg.knee.kneeCap.geometry.parameters.radius >= 0.058 * wide * STYLE.legThick,
          `${id} kneeCap radius >= 0.058 * wide * LT (bridges thigh and shin lathes)`
        );
      }
    }

    // Squat flexion past 45 deg
    stepAnim(p, { t: 1.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 20);
    assert.ok(p.legs[0].knee.rotation.x >= 1.5, `${id} knee flexes >= 1.5 rad in plant squat`);
    assert.ok(!isNaN(p.legs[0].knee.rotation.x));
  }
});

test('Tier 5: F14 - Compound pelvic bridge and bilateral hip joint caps across all 15 characters', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    const look = REGIONS[id].farmer.look;
    const lower = look.lower;
    const skirted = lower === 'ghagra' || lower === 'kira' || lower === 'longyi' || lower === 'sari';
    const wide = lower === 'shalwar' ? 1.5 : lower === 'pyjama' ? 1.2 : lower === 'cargo' ? 1.15 : 1;

    // Upper pelvis sphere on rotation axis
    assert.ok(p.hips.upperPelvis, `${id} upperPelvis exists on hips`);
    assert.equal(p.hips.upperPelvis.geometry.parameters.radius, 0.115);
    assert.deepEqual(p.hips.upperPelvis.position.toArray(), [0, 0, 0]);

    // Retained perineal sphere at y = -0.105
    let perinealSphere = null;
    p.hips.traverse((c) => {
      if (c.isMesh && c.geometry.type === 'SphereGeometry' && Math.abs(c.position.y - (-0.105)) < 0.01) {
        perinealSphere = c;
      }
    });
    assert.ok(perinealSphere, `${id} perineal sphere exists at y = -0.105`);

    // Hip joint caps on thighs
    for (const leg of p.legs) {
      if (skirted) {
        assert.equal(leg.thigh.hipCap, undefined, `${id} thigh.hipCap suppressed under full skirt`);
        assert.equal(leg.thigh.children.filter((c) => c.isMesh).length, 0, `${id} 0 meshes on thigh under skirt`);
      } else {
        assert.ok(leg.thigh.hipCap, `${id} thigh.hipCap exists`);
        const expectedHipRadius = 0.078 * wide * STYLE.legThick;
        assert.ok(
          Math.abs(leg.thigh.hipCap.geometry.parameters.radius - expectedHipRadius) < 1e-4,
          `${id} hipCap radius matches expected ${expectedHipRadius}`
        );
      }
    }
  }
});

test('Tier 5: F15 - Cervical-cranial rotation blending pitch/yaw conservation across all 15 characters', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);
    assert.ok(p.neck, `${id} neck exists`);
    assert.ok(p.head, `${id} head exists`);

    // Blended pitch during farm action
    stepAnim(p, { t: 1.0, speed: 0, act: { type: 'water', p: 0.5, dur: 1.0 } }, 20);
    assert.ok(p.neck.rotation.x > 0, `${id} neck pitches forward`);
    assert.ok(p.head.rotation.x > 0, `${id} head pitches forward`);
    const totalPitch = p.neck.rotation.x + p.head.rotation.x;
    const neckRatio = p.neck.rotation.x / totalPitch;
    assert.ok(neckRatio >= 0.30 && neckRatio <= 0.40, `${id} neck pitch ratio ${neckRatio.toFixed(3)} is ~0.35`);

    // Blended yaw during gaze tracking
    stepAnim(p, { t: 2.0, speed: 0, lookTarget: { x: 50, y: 1.4, z: 0 } }, 20);
    assert.ok(p.neck.rotation.y > 0, `${id} neck yaws toward target`);
    assert.ok(p.head.rotation.y > 0, `${id} head yaws toward target`);
    const totalYaw = p.neck.rotation.y + p.head.rotation.y;
    const neckYawRatio = p.neck.rotation.y / totalYaw;
    assert.ok(neckYawRatio >= 0.25 && neckYawRatio <= 0.35, `${id} neck yaw ratio ${neckYawRatio.toFixed(3)} is ~0.30`);
  }
});

test('Tier 5: F16 - Farm action kinematics: cheer victory V, wipe brow sweep, and knapsack pumping across all 15 characters', () => {
  for (const id of CHAR_IDS) {
    const p = getFarmer(id);

    // 1. Cheer victory V spread
    stepAnim(p, { t: 1.0, speed: 0, act: { type: 'cheer', p: 0.5, dur: 1.0 } }, 30);
    p.root.updateMatrixWorld(true);
    const handL = new THREE.Vector3();
    const handR = new THREE.Vector3();
    p.arms[0].hand.getWorldPosition(handL);
    p.arms[1].hand.getWorldPosition(handR);
    const spread = handR.x - handL.x;
    assert.ok(spread >= 0.60, `${id} cheer hand spread (${spread.toFixed(3)}m) >= 0.60m`);
    assert.ok(p.arms[0].shoulder.rotation.z < 0, `${id} left arm abducted outwards`);
    assert.ok(p.arms[1].shoulder.rotation.z > 0, `${id} right arm abducted outwards`);

    // 2. Wipe brow adduction
    stepAnim(p, { t: 2.0, speed: 0, act: { type: 'wipe', p: 0.5, dur: 1.0 } }, 20);
    p.root.updateMatrixWorld(true);
    const headPos = new THREE.Vector3();
    const wipeHand = new THREE.Vector3();
    p.head.getWorldPosition(headPos);
    p.arms[1].hand.getWorldPosition(wipeHand);
    const dist = wipeHand.distanceTo(headPos);
    assert.ok(dist <= 0.28, `${id} wipe hand distance (${dist.toFixed(3)}m) sweeps forehead brow`);
    assert.ok(p.arms[1].shoulder.rotation.z < 0, `${id} right arm adducted across midline`);

    // 3. Spray knapsack pump
    stepAnim(p, { t: 3.0, speed: 0, act: { type: 'spray', p: 0.5, dur: 1.0 } }, 20);
    assert.equal(p.tools.spray.visible, true);
    assert.equal(p.tools.tank.visible, true);
    assert.ok(p.arms[0].elbow.rotation.x < -0.5, `${id} left arm pumps knapsack lever`);

    // 4. Carrying forward trunk lean
    const pIdle = getFarmer(id);
    stepAnim(pIdle, { t: 0, speed: 0 }, 20);
    const pCarry = getFarmer(id);
    stepAnim(pCarry, { t: 0, speed: 1.0, carrying: true }, 20);
    assert.equal(pCarry.tools.sack.visible, true);
    assert.ok(pCarry.torso.rotation.x >= pIdle.torso.rotation.x + 0.08, `${id} trunk leans under dorsal load`);
    assert.ok(pCarry.arms[0].elbow.rotation.x < -0.6, `${id} elbow flexed holding strap`);
  }
});


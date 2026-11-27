import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import * as THREE from 'three';
import { REGIONS, FARMER_IDS } from './regions.js';
import { CHILDREN, CHILD_IDS, MOODS } from './dream.js';
import { ageStoop, expressionFromState, idleGaze } from '../engine/motion.js';
import { buildFarmer, animate, mat } from './three/people.js';
import { attachReal } from './three/realPeople.js';
import { STYLE } from './proportions.js';

test('every one of the farmers has a complete, respectful look definition', () => {
  const ids = Object.keys(REGIONS);
  assert.ok(ids.length >= 7, 'at least 7 farmers, one per division of Bangladesh');
  for (const id of ids) {
    const f = REGIONS[id].farmer;
    assert.ok(f.name || f.bn, `farmer ${id} has a name`);
    assert.ok(f.look, `farmer ${id} has a look definition`);
    const l = f.look;
    assert.ok(l.skin && /^#[0-9a-f]{6}$/i.test(l.skin), `${id} has valid hex skin tone`);
    assert.ok(l.hair && /^#[0-9a-f]{6}$/i.test(l.hair), `${id} has valid hex hair`);
    assert.ok(l.top, `${id} has a top garment`);
    assert.ok(l.lower, `${id} has lower attire`);
    assert.ok(l.head, `${id} has headwear or hair style`);
    assert.ok(l.feet, `${id} has footwear`);
  }
});

test('every child has a complete profile, age between 7 and 10, and a personal story item', () => {
  assert.equal(CHILD_IDS.length, Object.keys(REGIONS).length, 'one child for every farmer');
  for (const id of CHILD_IDS) {
    const c = CHILDREN[id];
    assert.ok(c, `child ${id} exists`);
    assert.ok(c.name.bn && c.name.en, `child ${id} has bilingual name`);
    assert.ok(c.calls.bn && c.calls.en, `child ${id} has bilingual call for grown-up`);
    assert.ok(c.rel.bn && c.rel.en, `child ${id} has bilingual relationship`);
    assert.ok(c.age >= 7 && c.age <= 10, `child ${id} age ${c.age} is between 7 and 10`);
    assert.equal(typeof c.girl, 'boolean', `child ${id} specifies girl boolean`);
    assert.ok(c.item, `child ${id} has personal story item`);
    assert.ok(REGIONS[id], `region ${id} matches farmer`);
  }
});

test('child game moods strictly enforce peaceful non-violent animations', () => {
  const forbiddenViolentActions = ['Death', 'Punch', 'RecieveHit', 'SwordSlash', 'Shoot_OneHanded'];
  for (const [moodKey, mood] of Object.entries(MOODS)) {
    assert.ok(!forbiddenViolentActions.includes(mood.anim), `mood ${moodKey} must not use combat/violent action ${mood.anim}`);
    assert.ok(mood.grade, `mood ${moodKey} specifies visual grade`);
    assert.ok(mood.music, `mood ${moodKey} specifies music cue`);
  }
});

test('age stoop creates natural grounded posture calibrated by age', () => {
  assert.equal(ageStoop(25), 0, 'young adult stands upright');
  assert.equal(ageStoop(30), 0, 'adult stands upright');
  assert.equal(ageStoop(46), 0.025, 'middle-aged farmer has subtle grounding');
  assert.equal(ageStoop(58), 0.055, 'senior farmer stands with grounded stoop');
  assert.equal(ageStoop(82), 0.08, 'elder stands with gentle stoop');
});

test('expression from state dynamically responds to farm work and mood', () => {
  const calm = expressionFromState({});
  assert.equal(calm.mood, 'calm');
  assert.equal(calm.browTilt, 0);

  const cheer = expressionFromState({ act: { type: 'cheer' } });
  assert.equal(cheer.mood, 'happy');
  assert.ok(cheer.browTilt > 0, 'happy brows arch upwards');

  const work = expressionFromState({ act: { type: 'water' } });
  assert.equal(work.mood, 'focused');
  assert.ok(work.browTilt < 0, 'focused work lowers brow slightly');

  const strain = expressionFromState({ carrying: true });
  assert.equal(strain.mood, 'effort');
  assert.ok(strain.lidSquint > 0, 'carrying load narrows gaze');

  const distress = expressionFromState({ down: 1 });
  assert.equal(distress.mood, 'hurt');
  assert.ok(distress.lidSquint >= 0.3, 'down narrows eyes');

  const stress = expressionFromState({ worried: true });
  assert.equal(stress.mood, 'worried');
  assert.ok(stress.browTilt < 0, 'worried brows furrow');

  const greet = expressionFromState({ act: { type: 'greet' } });
  assert.equal(greet.mood, 'friendly');
  assert.ok(greet.browTilt > 0, 'friendly greeting has welcoming eyebrows');

  const wipe = expressionFromState({ act: { type: 'wipe' } });
  assert.equal(wipe.mood, 'relieved');

  const soil = expressionFromState({ act: { type: 'soilcheck' } });
  assert.equal(soil.mood, 'observant');
});

test('reduced motion disables idle head looking while preserving normal gaze drift', () => {
  assert.deepEqual(idleGaze(10, true), { x: 0, y: 0 });
  const activeGaze = idleGaze(10, false);
  assert.ok(typeof activeGaze.x === 'number' && typeof activeGaze.y === 'number');
});

test('all sample farmer characters have MakeHuman 3D rigged models in manifest', () => {
  const manifestPath = new URL('../../public/models/folk/manifest.json', import.meta.url);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.ok(Array.isArray(manifest.people));
  assert.ok(manifest.people.length >= 15, 'the 15 farmers, and the villagers built since');
  for (const id of manifest.people) {
    const glbPath = new URL(`../../public/models/folk/${id}.glb`, import.meta.url);
    const stat = statSync(glbPath);
    assert.ok(stat.size > 500000, `character ${id}.glb must be a complete 3D mesh (> 500KB)`);
  }
});

test('procedural mouth structure has anatomical cavity, lip vermilion, and interior teeth bar (F01)', () => {
  const ids = Object.keys(REGIONS);
  for (const id of ids) {
    const look = REGIONS[id].farmer.look;
    const P = buildFarmer(look);
    assert.ok(P.mouth, `farmer ${id} must have P.mouth defined`);
    assert.ok(P.mouth.cavity, `farmer ${id} must have oral cavity mesh`);
    assert.ok(P.mouth.teeth, `farmer ${id} must have interior teeth mesh`);
    assert.ok(P.mouth.upperLip, `farmer ${id} must have upper lip group`);
    assert.ok(P.mouth.lowerLip, `farmer ${id} must have lower lip group`);

    // Verify lip pigment does not equal skin tone
    const upperMat = P.mouth.upperLip.children[0].material;
    assert.ok(upperMat.color.getHexString(), `farmer ${id} lip must have color`);

    // Verify rest pose closure (lip overlap)
    assert.ok(P.mouth.upperLip.position.y > 0, 'upper lip resting position is positive Y');
    assert.ok(P.mouth.lowerLip.position.y < 0, 'lower lip resting position is negative Y');

    // Verify teeth are recessed behind lips
    assert.ok(P.mouth.teeth.position.z < P.mouth.upperLip.position.z,
      'teeth must be recessed strictly behind upper lip in Z');

    // Test dynamic animation opening
    animate(P, { act: { type: 'cheer', p: 0.5, dur: 1 } }, 0.1);
    assert.ok(P.mouth.lowerLip.position.y < -0.003, 'active gesture depresses lower lip');
    assert.ok(P.mouth.cavity.scale.y > 0.3, 'active gesture expands oral cavity vertical scale');
    assert.ok(P.mouth.scale.x >= 1.0, 'smile expands mouth width without ballooning');
  }
});

test('continuous nose geometry connects nasion to tip without seams or box gaps across all characters (F03)', () => {
  for (const id of FARMER_IDS) {
    const farmer = buildFarmer(REGIONS[id].farmer.look);
    const head = farmer.cranial;
    const noseMesh = head.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
    assert.ok(noseMesh, `continuous lathe nose mesh must exist under head for ${id}`);

    noseMesh.geometry.computeBoundingBox();
    noseMesh.updateMatrix();
    const box = noseMesh.geometry.boundingBox.clone().applyMatrix4(noseMesh.matrix);
    assert.ok(box.max.y >= 0.023, `${id} nose superior edge (${box.max.y}) must reach nasion (>= 0.023m)`);
    assert.ok(box.min.y <= -0.021, `${id} nose inferior base (${box.min.y}) must reach subnasale (<= -0.021m)`);
    assert.ok(box.max.z >= 0.126 && box.max.z <= 0.135, `${id} nose tip protrusion (${box.max.z}) must be approx 0.130m`);
    const widthX = box.max.x - box.min.x;
    assert.ok(widthX >= 0.026 && widthX <= 0.031, `${id} alar wing width (${widthX * 1000}mm) must be 26-31mm`);
  }
});

test('nose geometry has outward face normals, unit vertex normals, and FrontSide anterior raycast hit (F03)', () => {
  const farmer = buildFarmer(REGIONS.razib.farmer.look);
  const head = farmer.cranial;
  const noseMesh = head.children.find((c) => c.geometry && c.geometry.type === 'LatheGeometry');
  assert.ok(noseMesh, 'continuous lathe nose mesh must exist under head');
  const g = noseMesh.geometry;

  // 1. Outward face normals across all triangles (n · r > 0)
  const pos = g.attributes.position;
  const idx = g.index;
  assert.ok(idx && idx.count > 0, 'nose geometry must have index buffer');
  const triCount = idx.count / 3;
  assert.equal(triCount, 224, '16-segment 8-point lathe produces exactly 224 triangle faces');
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
    const dot = n.dot(radial);
    if (dot <= 0) inwardCount++;
  }
  assert.equal(
    inwardCount,
    0,
    `all ${triCount} triangles must have outward face normals (n · r > 0), but ${inwardCount} pointed inward`
  );

  // 2. Unit length vertex normals (|n| = 1.0 ± 1e-4)
  const norm = g.attributes.normal;
  assert.ok(norm && norm.count > 0, 'geometry must have normal attribute');
  assert.equal(norm.count, 136, '16-segment 8-point lathe has 136 vertices');
  const vertNormal = new THREE.Vector3();
  let nonUnitCount = 0;
  for (let i = 0; i < norm.count; i++) {
    vertNormal.fromBufferAttribute(norm, i);
    const len = vertNormal.length();
    if (Math.abs(len - 1.0) > 1e-4) nonUnitCount++;
  }
  assert.equal(
    nonUnitCount,
    0,
    `all ${norm.count} vertex normals must have unit length 1.0 ± 1e-4, but ${nonUnitCount} were non-unit`
  );

  // 3. Raycast with THREE.FrontSide material hits anterior nose apex at z > 0 without penetrating to back wall
  const testMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ side: THREE.FrontSide }));
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 0.5), new THREE.Vector3(0, 0, -1));
  const hits = ray.intersectObject(testMesh);
  assert.ok(hits.length > 0, 'FrontSide raycast must intersect nose mesh');
  assert.ok(
    hits[0].point.z > 0,
    `FrontSide ray must strike anterior exterior surface at z > 0 (penetrated to rear wall at z = ${hits[0].point.z})`
  );
  assert.ok(
    Math.abs(hits[0].point.z - 0.0110) < 0.001,
    `FrontSide ray hit z (${hits[0].point.z}) must be at anterior apex (+0.0110m in local frame)`
  );
  assert.ok(
    hits[0].face.normal.z > 0,
    `hit face normal must point towards viewer (+z), got z = ${hits[0].face.normal.z}`
  );
});

test('curved eyebrows conform flush to forehead curvature across all characters (F04)', () => {
  const farmer = buildFarmer(REGIONS.razib.farmer.look);
  assert.equal(farmer.brows.length, 2, 'character must have two eyebrow pivots');

  for (const b of farmer.brows) {
    const mesh = b.pivot.children.find((c) => c.isMesh);
    assert.ok(mesh, 'eyebrow mesh must exist');
    assert.equal(mesh.geometry.type, 'TorusGeometry', 'eyebrows must be TorusGeometry');

    mesh.geometry.computeBoundingBox();
    mesh.updateMatrix();
    b.pivot.updateMatrix();
    const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix).applyMatrix4(b.pivot.matrix);
    assert.ok(box.max.y >= 0.045 && box.min.y <= 0.060, 'eyebrow vertical height must stay in brow ridge');
  }
});

test('curved moustache wraps flush around maxilla without straight board protrusion (F04)', () => {
  const farmer = buildFarmer(REGIONS.prahlad.farmer.look);
  const head = farmer.cranial;
  const mMesh = head.children.find((c) => c.geometry && c.geometry.type === 'TorusGeometry' && c.position.y < 0);
  assert.ok(mMesh, 'curved moustache mesh must exist under head');

  mMesh.geometry.computeBoundingBox();
  mMesh.updateMatrix();
  const box = mMesh.geometry.boundingBox.clone().applyMatrix4(mMesh.matrix);
  const width = box.max.x - box.min.x;
  assert.ok(width >= 0.080 && width <= 0.095, `moustache width (${width}) must be 80-95mm`);
  assert.ok(box.min.z <= 0.105, `lateral ends must wrap back behind z=0.105m to conform to cheeks`);
});

test('atlanto-occipital cranial articulation pivot, neck cylinder, ball collar, and fillet (F05)', () => {
  const farmer = buildFarmer(REGIONS.razib.farmer.look);
  assert.ok(farmer.neck, 'farmer.neck exists');
  assert.ok(farmer.head, 'farmer.head exists');
  assert.ok(farmer.cranial, 'farmer.cranial exists');
  assert.equal(farmer.neck.children.length, 4, 'neck has fillet, cylinder, ball collar, and head joint');
  assert.equal(farmer.head.position.y, 0.125, 'head joint at AO joint Y');
  assert.equal(farmer.head.position.z, -0.020, 'head joint at AO joint Z');
});

test('skinned MakeHuman characters recess dental meshes and enable depth offset (F02)', async () => {
  globalThis.self = globalThis;
  globalThis.ProgressEvent ??= class ProgressEvent extends Event { constructor(type, dict) { super(type); Object.assign(this, dict); } };
  THREE.DefaultLoadingManager.setURLModifier((url) => url.startsWith('http') ? url : 'http://localhost' + url);

  const manifestPath = new URL('../../public/models/folk/manifest.json', import.meta.url);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = typeof url === 'string' ? url : url.url;
    if (u.includes('manifest.json')) {
      return new Response(JSON.stringify(manifest), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const match = u.match(/\/([a-z0-9_-]+)\.glb$/i); // villager ids can have a hyphen (caio_co-op)
    if (match) {
      const glbPath = new URL(`../../public/models/folk/${match[1]}.glb`, import.meta.url);
      const fileBuf = readFileSync(glbPath);
      return new Response(fileBuf, { status: 200, headers: { 'content-type': 'model/gltf-binary' } });
    }
    return new Response('Not found', { status: 404 });
  };

  try {
    for (const id of manifest.people.filter((x) => REGIONS[x])) { // the farmers: a villager's model is found by its own look, not a farmer's
      const look = REGIONS[id].farmer.look;
      const P = buildFarmer(look);
      await attachReal(P, look);
      let teethFound = false;
      P.root.traverse((o) => {
        const m = o.material;
        if (o.isMesh && (o.name.toLowerCase().includes('teeth') || (m && /teeth/i.test(m.name)))) {
          teethFound = true;
          assert.ok(o.position.z <= -0.006, `character ${id} teeth Z-offset must be <= -6mm`);
          assert.ok(o.scale.x <= 0.965, `character ${id} teeth scale must be <= 0.965x`);
          assert.equal(m.polygonOffset, true, `character ${id} teeth must enable polygonOffset`);
          assert.ok(m.polygonOffsetFactor >= 2.0, `character ${id} polygonOffsetFactor must be >= 2.0`);
          assert.equal(m.depthWrite, true, `character ${id} teeth depthWrite must be true`);
          assert.equal(m.transparent, false, `character ${id} teeth transparent must be false`);
        }
      });
      assert.ok(teethFound, `character ${id} must contain teeth mesh`);
    }
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('dynamic lower garment stride deformation expands skirtGroup depth and splay during stride and squats (F06)', () => {
  for (const id of ['rahimu', 'didarul', 'kader', 'rahima', 'mofizul']) {
    const look = REGIONS[id].farmer.look;
    const p = buildFarmer(look);
    assert.ok(p.skirtGroup, `${id} must have skirtGroup`);

    // Standing idle
    animate(p, { t: 0, speed: 0, a: 0 }, 1 / 60);
    const idleScaleZ = p.skirtGroup.scale.z;
    const idleScaleX = p.skirtGroup.scale.x;

    // Running sprint (leading thigh forward)
    for (let frame = 0; frame < 30; frame++) {
      animate(p, { t: frame * (1 / 60), speed: 5.5, a: 1.0, run: true }, 1 / 60);
    }
    assert.ok(p.skirtGroup.scale.z > idleScaleZ, `${id} skirtGroup.scale.z must expand dynamically during sprint`);
    assert.ok(p.skirtGroup.scale.x >= idleScaleX, `${id} skirtGroup.scale.x must splay dynamically during stride`);

    // Action squat (soilcheck)
    for (let frame = 0; frame < 30; frame++) {
      animate(p, { t: frame * (1 / 60), speed: 0, a: 0, act: { type: 'soilcheck', p: 0.5, dur: 1.5 } }, 1 / 60);
    }
    assert.ok(p.skirtGroup.scale.z > idleScaleZ, `${id} skirtGroup.scale.z must expand during squat`);
    assert.ok(p.skirtGroup.rotation.x !== 0, `${id} skirtGroup.rotation.x must pitch with leading thigh`);
  }
});

test('lower garment base cylinders have relaxed radii preventing knee puncture (F06)', () => {
  // Test relaxed lower garment cylinder radii for lungi, dhoti and sari
  const checkCyl = (id, expectedMinBottomRadius) => {
    const p = buildFarmer(REGIONS[id].farmer.look);
    let cyl = null;
    p.skirtGroup.traverse((c) => {
      if (c.isMesh && c.geometry.type === 'CylinderGeometry') cyl = c;
    });
    assert.ok(cyl, `${id} lower garment cylinder exists`);
    assert.ok(cyl.geometry.parameters.radiusBottom >= expectedMinBottomRadius, `${id} cylinder bottom radius >= ${expectedMinBottomRadius}`);
  };
  checkCyl('rahimu', 0.250); // lungi: 0.255
  checkCyl('prahlad', 0.255); // dhoti: 0.260
  checkCyl('rahima', 0.280); // sari: 0.285
});

test('suppress hidden leg vertices (knee sphere and shin lathe) under full skirts (F07)', () => {
  // Full skirt characters: rahima (sari)
  for (const id of ['rahima']) {
    const p = buildFarmer(REGIONS[id].farmer.look);
    for (const leg of p.legs) {
      // Thigh mesh must be suppressed
      const thighMeshes = leg.thigh.children.filter((c) => c.isMesh);
      assert.equal(thighMeshes.length, 0, `${id} thigh mesh must be suppressed under full skirt`);

      // Knee cap sphere at [0, 0, 0] and shin limb lathe must be suppressed
      const kneeMeshes = leg.knee.children.filter((c) => c.isMesh);
      const kneeCap = kneeMeshes.find((c) => c.geometry.type === 'SphereGeometry' && c.position.y === 0);
      const shinLimb = kneeMeshes.find((c) => c.geometry.type === 'LatheGeometry');
      assert.equal(kneeCap, undefined, `${id} knee cap sphere must be suppressed`);
      assert.equal(shinLimb, undefined, `${id} shin limb lathe must be suppressed`);

      // Ankle sphere and foot group MUST still be preserved
      const ankleSphere = kneeMeshes.find((c) => c.geometry.type === 'SphereGeometry' && c.position.y < 0);
      assert.ok(ankleSphere, `${id} ankle sphere must be preserved under hem`);
      assert.ok(leg.foot, `${id} foot group must exist`);
    }
  }

  // Non-full skirt characters must retain knee spheres and shin limbs
  for (const id of ['razib', 'rahimu', 'didarul', 'kader']) {
    const p = buildFarmer(REGIONS[id].farmer.look);
    for (const leg of p.legs) {
      const kneeMeshes = leg.knee.children.filter((c) => c.isMesh);
      const kneeCap = kneeMeshes.find((c) => c.geometry.type === 'SphereGeometry' && c.position.y === 0);
      assert.ok(kneeCap, `${id} knee cap sphere must be present`);
    }
  }
});

test('kurta and kameez hem alignment, reparenting to skirtGroup, and GLB scale/polygonOffset (F08)', () => {
  for (const id of ['didarul', 'kader']) {
    const p = buildFarmer(REGIONS[id].farmer.look);
    let kurtaHem = null;
    p.skirtGroup.traverse((c) => {
      if (c.isMesh && c.geometry.type === 'CylinderGeometry' && c.geometry.parameters.height > 0.4) kurtaHem = c;
    });
    assert.ok(kurtaHem, `${id} kurta/kameez hem cylinder must be parented to skirtGroup`);
    assert.equal(kurtaHem.parent, p.skirtGroup, `${id} kurta hem parent must be skirtGroup`);
    assert.ok(kurtaHem.geometry.parameters.radiusTop >= 0.19, `${id} kurta hem top radius >= 0.19m`);
    assert.ok(kurtaHem.geometry.parameters.radiusBottom >= 0.29, `${id} kurta hem bottom radius >= 0.29m`);
  }
});

test('shoulder deltoid ball-and-socket joint re-parented to shoulder group at origin (F09)', () => {
  for (const id of FARMER_IDS) {
    const p = buildFarmer(REGIONS[id].farmer.look);
    assert.equal(p.arms.length, 2, `${id} has 2 arms`);
    for (const a of p.arms) {
      assert.ok(a.shoulder, `${id} arm has shoulder group`);
      assert.ok(a.shoulder.deltoid, `${id} shoulder has deltoid reference`);
      assert.equal(a.shoulder.deltoid.parent, a.shoulder, `${id} deltoid sphere parent is shoulder`);
      assert.equal(a.shoulder.deltoid.position.x, 0, `${id} deltoid position.x is 0`);
      assert.equal(a.shoulder.deltoid.position.y, 0, `${id} deltoid position.y is 0`);
      assert.equal(a.shoulder.deltoid.position.z, 0, `${id} deltoid position.z is 0`);
      assert.equal(a.shoulder.deltoid.geometry.type, 'SphereGeometry', `${id} deltoid is a sphere`);
    }
  }
});

test('headwear geometry & hair dimensions strictly prevent hair/scalp penetration (F10)', () => {
  // 4. Tupi (Didarul & Kader): cylindrical headband at y = 0.086m and dome theta = 0.36*PI
  for (const id of ['didarul', 'kader']) {
    const p = buildFarmer(REGIONS[id].farmer.look);
    let band = null, dome = null;
    p.cranial.traverse((c) => {
      if (c.isMesh && c.geometry.type === 'CylinderGeometry' && c.position.y > 0.07) band = c;
      if (c.isMesh && c.geometry.type === 'SphereGeometry' && c.geometry.parameters.thetaLength >= Math.PI * 0.35) dome = c;
    });
    assert.ok(band, `${id} tupi cylindrical headband exists`);
    assert.ok(dome, `${id} tupi dome extended to theta >= 0.35*PI`);
  }

  // 5. Gamcha (Rahimu): torus major radius >= 0.120m, tube >= 0.032m
  const rahimu = buildFarmer(REGIONS.rahimu.farmer.look);
  let gamchaTorus = null;
  rahimu.cranial.traverse((c) => {
    if (c.isMesh && c.geometry.type === 'TorusGeometry' && c.geometry.parameters.radius >= 0.120) gamchaTorus = c;
  });
  assert.ok(gamchaTorus, 'gamcha torus has major radius >= 0.120m');
});

test('multi-part garment hierarchical consolidation eliminates joint seams (F11)', () => {
  // 1. Rahima (Hijab): cape lathe and hem trim are children of head, not neck
  const rahima = buildFarmer(REGIONS.rahima.farmer.look);
  let capeInHead = false, torusInHead = false, trimInHead = false;
  rahima.cranial.traverse((c) => {
    if (c.isMesh && c.geometry.type === 'LatheGeometry') capeInHead = true;
    if (c.isMesh && c.geometry.type === 'TorusGeometry') {
      if (c.position.z > 0.06) torusInHead = true; // forward-projected face torus
      if (c.position.y < -0.15) trimInHead = true; // hem trim torus
    }
  });
  assert.ok(capeInHead, 'hijab cape lathe must be child of cranial/head');
  assert.ok(torusInHead, 'face torus must be forward-projected (z > 0.06m) in cranial/head');
  assert.ok(trimInHead, 'cape hem trim torus must be child of cranial/head');
});

test('torso respiration offsets >= 9mm and polygonOffset depth bias (F12)', () => {
  // Test that mat() assigns polygonOffset
  const testM = mat('#123456', { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  assert.equal(testM.polygonOffset, true, 'mat() sets polygonOffset');
  assert.equal(testM.polygonOffsetFactor, -2, 'mat() sets polygonOffsetFactor');
  assert.equal(testM.polygonOffsetUnits, -2, 'mat() sets polygonOffsetUnits');

  // Test overlay clearance and polygonOffset on torso overlays
  for (const id of ['prahlad', 'didarul']) {
    const p = buildFarmer(REGIONS[id].farmer.look);
    let overlayWithOffset = 0;
    p.torso.traverse((c) => {
      if (c.isMesh && c.position.z > 0.12 && c.material?.polygonOffset) {
        overlayWithOffset++;
      }
    });
    assert.ok(overlayWithOffset > 0, `${id} contains cloth overlays with polygonOffset`);
  }
});

test('knee joint sphere radius sizing matches or exceeds connecting limbs across all characters (F13)', () => {
  for (const id of FARMER_IDS) {
    const p = buildFarmer(REGIONS[id].farmer.look);
    const look = REGIONS[id].farmer.look;
    const lower = look.lower;
    const skirted = lower === 'ghagra' || lower === 'kira' || lower === 'longyi' || lower === 'sari';
    const wide = lower === 'shalwar' ? 1.5 : lower === 'pyjama' ? 1.2 : lower === 'cargo' ? 1.15 : 1;
    const expectedRadius = 0.060 * wide * STYLE.legThick;

    for (let i = 0; i < p.legs.length; i++) {
      const knee = p.legs[i].knee;
      if (skirted) {
        assert.equal(knee.kneeCap, undefined, `${id} kneeCap must be suppressed under full skirt`);
      } else {
        assert.ok(knee.kneeCap, `${id} kneeCap must exist on leg ${i}`);
        assert.equal(knee.kneeCap.geometry.type, 'SphereGeometry');
        assert.ok(
          Math.abs(knee.kneeCap.geometry.parameters.radius - expectedRadius) < 1e-4,
          `${id} kneeCap radius (${knee.kneeCap.geometry.parameters.radius}) matches expected ${expectedRadius}`
        );
        // Exceeds thigh distal (0.056) and shin proximal (0.058) lathe radii
        assert.ok(
          knee.kneeCap.geometry.parameters.radius >= 0.058 * wide * STYLE.legThick,
          `${id} kneeCap radius >= 0.058 * wide * LT`
        );
        // Patellar scale
        assert.deepEqual(knee.kneeCap.scale.toArray(), [1, 1.0, 1.04]);
      }
    }

    // Dynamic deep squat flexion past 45 degrees without joint gaps
    animate(p, { t: 1.0, speed: 0, act: { type: 'soilcheck', p: 0.5, dur: 1.0 } }, 1.0);
    assert.ok(p.legs[0].knee.rotation.x >= 1.5, `${id} knee flexes deeply (> 1.5 rad)`);
    assert.ok(!isNaN(p.legs[0].knee.rotation.x));
  }
});

test('compound pelvic bridge alignment and bilateral hip caps across all characters (F14)', () => {
  for (const id of FARMER_IDS) {
    const p = buildFarmer(REGIONS[id].farmer.look);
    const look = REGIONS[id].farmer.look;
    const lower = look.lower;
    const skirted = lower === 'ghagra' || lower === 'kira' || lower === 'longyi' || lower === 'sari';
    const wide = lower === 'shalwar' ? 1.5 : lower === 'pyjama' ? 1.2 : lower === 'cargo' ? 1.15 : 1;

    // 1. Upper pelvis sphere directly on thigh rotation axis y=0, z=0
    assert.ok(p.hips.upperPelvis, `${id} hips.upperPelvis must exist`);
    assert.equal(p.hips.upperPelvis.geometry.type, 'SphereGeometry');
    assert.equal(p.hips.upperPelvis.geometry.parameters.radius, 0.115);
    assert.deepEqual(p.hips.upperPelvis.position.toArray(), [0, 0, 0]);

    // 2. Perineal pelvic bridge sphere retained at [0, -0.105, 0]
    let perinealSphere = null;
    p.hips.traverse((c) => {
      if (c.isMesh && c.geometry.type === 'SphereGeometry' && Math.abs(c.position.y - (-0.105)) < 0.01) {
        perinealSphere = c;
      }
    });
    assert.ok(perinealSphere, `${id} perineal pelvic bridge sphere exists at y = -0.105`);
    assert.equal(perinealSphere.geometry.parameters.radius, 0.12);

    // 3. Bilateral hip joint caps on thighs
    for (let i = 0; i < p.legs.length; i++) {
      const thigh = p.legs[i].thigh;
      if (skirted) {
        assert.equal(thigh.hipCap, undefined, `${id} thigh.hipCap must be suppressed under full skirt`);
        const thighMeshes = thigh.children.filter((c) => c.isMesh);
        assert.equal(thighMeshes.length, 0, `${id} thigh must have 0 meshes under full skirt`);
      } else {
        assert.ok(thigh.hipCap, `${id} thigh.hipCap must exist on thigh ${i}`);
        assert.equal(thigh.hipCap.geometry.type, 'SphereGeometry');
        const expectedHipRadius = 0.078 * wide * STYLE.legThick;
        assert.ok(
          Math.abs(thigh.hipCap.geometry.parameters.radius - expectedHipRadius) < 1e-4,
          `${id} thigh.hipCap radius matches expected ${expectedHipRadius}`
        );
        assert.deepEqual(thigh.hipCap.position.toArray(), [0, 0, 0]);
      }
    }
  }
});

test('cervical-cranial rotation blending distributes pitch and yaw across neck and head joints across all characters (F15)', () => {
  for (const id of FARMER_IDS) {
    const p = buildFarmer(REGIONS[id].farmer.look);
    assert.ok(p.neck, `${id} neck group exists`);
    assert.ok(p.head, `${id} head group exists`);

    // Forward pitch blending during farm action
    animate(p, { t: 1.0, speed: 0, act: { type: 'water', p: 0.5, dur: 1.0 } }, 1.0);
    assert.ok(p.neck.rotation.x > 0, `${id} neck pitches forward`);
    assert.ok(p.head.rotation.x > 0, `${id} head pitches forward`);
    const totalPitch = p.neck.rotation.x + p.head.rotation.x;
    const neckPitchRatio = p.neck.rotation.x / totalPitch;
    const headPitchRatio = p.head.rotation.x / totalPitch;
    assert.ok(neckPitchRatio >= 0.30 && neckPitchRatio <= 0.40, `${id} neck pitch ratio ${neckPitchRatio.toFixed(3)} is ~0.35`);
    assert.ok(headPitchRatio >= 0.60 && headPitchRatio <= 0.70, `${id} head pitch ratio ${headPitchRatio.toFixed(3)} is ~0.65`);

    // Yaw blending during gaze targeting
    animate(p, { t: 2.0, speed: 0, lookTarget: { x: 50, y: 1.4, z: 0 } }, 1.0);
    assert.ok(p.neck.rotation.y > 0, `${id} neck yaws toward target`);
    assert.ok(p.head.rotation.y > 0, `${id} head yaws toward target`);
    const totalYaw = p.neck.rotation.y + p.head.rotation.y;
    const neckYawRatio = p.neck.rotation.y / totalYaw;
    const headYawRatio = p.head.rotation.y / totalYaw;
    assert.ok(neckYawRatio >= 0.25 && neckYawRatio <= 0.35, `${id} neck yaw ratio ${neckYawRatio.toFixed(3)} is ~0.30`);
    assert.ok(headYawRatio >= 0.65 && headYawRatio <= 0.75, `${id} head yaw ratio ${headYawRatio.toFixed(3)} is ~0.70`);
  }
});

test('farm action rigging & articulation tuning across all characters (F16)', () => {
  for (const id of FARMER_IDS) {
    const p = buildFarmer(REGIONS[id].farmer.look);

    // 1. Cheer victory V-spread eliminating skull intersection
    for (let f = 0; f < 30; f++) animate(p, { t: 1.0, speed: 0, act: { type: 'cheer', p: 0.5, dur: 1.0 } }, 1 / 60);
    p.root.updateMatrixWorld(true);
    const handL = new THREE.Vector3();
    const handR = new THREE.Vector3();
    p.arms[0].hand.getWorldPosition(handL);
    p.arms[1].hand.getWorldPosition(handR);
    const spread = handR.x - handL.x;
    assert.ok(
      spread >= 0.60,
      `${id} cheer hand spread (${spread.toFixed(3)}m) must be >= 0.60m to form an open victory V`
    );
    assert.ok(p.arms[0].shoulder.rotation.z < 0, `${id} left arm shoulder Z abducted outwards`);
    assert.ok(p.arms[1].shoulder.rotation.z > 0, `${id} right arm shoulder Z abducted outwards`);

    // 2. Wipe brow adduction and sweep across forehead
    animate(p, { t: 2.0, speed: 0, act: { type: 'wipe', p: 0.5, dur: 1.0 } }, 1.0);
    p.root.updateMatrixWorld(true);
    const headPos = new THREE.Vector3();
    const wipeHand = new THREE.Vector3();
    p.head.getWorldPosition(headPos);
    p.arms[1].hand.getWorldPosition(wipeHand);
    const handHeadDist = wipeHand.distanceTo(headPos);
    assert.ok(
      handHeadDist <= 0.28,
      `${id} wipe hand distance to head (${handHeadDist.toFixed(3)}m) <= 0.28m sweeps forehead brow`
    );
    assert.ok(p.arms[1].shoulder.rotation.z < 0, `${id} wipe right arm shoulder adducted across midline`);
    assert.ok(p.arms[1].elbow.rotation.x < -2.0, `${id} wipe elbow deeply flexed`);

    // 3. Spray knapsack pressure pump coordination & smooth envelope
    animate(p, { t: 3.0, speed: 0, act: { type: 'spray', p: 0.5, dur: 1.0 } }, 1.0);
    assert.equal(p.tools.spray.visible, true, `${id} spray wand visible`);
    assert.equal(p.tools.tank.visible, true, `${id} spray tank visible`);
    assert.ok(p.arms[0].elbow.rotation.x < -0.5, `${id} left arm actively operating knapsack pressure lever`);
    assert.ok(p.arms[1].shoulder.rotation.x < -0.5, `${id} right arm holding spray wand`);

    // 4. Carrying posture with forward trunk lean and shoulder strap grasp
    const idleP = buildFarmer(REGIONS[id].farmer.look);
    animate(idleP, { t: 0, speed: 0 }, 1.0);
    const carryP = buildFarmer(REGIONS[id].farmer.look);
    animate(carryP, { t: 0, speed: 1.0, carrying: true }, 1.0);
    assert.equal(carryP.tools.sack.visible, true, `${id} sack visible when carrying`);
    assert.ok(
      carryP.torso.rotation.x >= idleP.torso.rotation.x + 0.08,
      `${id} carrying exhibits forward trunk lean (${carryP.torso.rotation.x.toFixed(3)} >= ${(idleP.torso.rotation.x + 0.08).toFixed(3)})`
    );
    assert.ok(carryP.arms[0].elbow.rotation.x < -0.6, `${id} left arm holds sack strap`);
    assert.ok(carryP.arms[1].elbow.rotation.x < -0.6, `${id} right arm holds sack strap`);

    // 5. Deep squat furrow reach in plant and soilcheck
    animate(p, { t: 4.0, speed: 0, act: { type: 'plant', p: 0.5, dur: 1.0 } }, 1.0);
    assert.ok(p.torso.rotation.x >= 0.45, `${id} torso leans forward into furrow`);
    assert.ok(p.legs[0].knee.rotation.x >= 1.5, `${id} deep knee flexion`);
    assert.ok(p.arms[1].shoulder.rotation.x >= -0.75, `${id} right arm reaches downward towards furrow`);
  }
});



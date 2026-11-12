// Real people for মাঠের মানুষ: the rigged human made for each farmer and neighbour in Blender with MakeHuman
// (scripts/build/build_people.py → public/models/folk/<id>.glb), driven by the game's own figure.
//
// The coded figure in people.js keeps working out every movement (walk and run, the work poses, the gestures, the
// head turning to look at someone); it just is not drawn. Each frame its joints' rotations are carried over to the
// real skeleton (retargeting): for every pair of joints, the turn the figure's joint has made from its rest pose
// is applied to the real bone, after a one-time correction that lines the real bone up with the figure's limb at
// rest (MakeHuman stands in an A-pose, the figure with its arms down). So everything people do in the game, they
// now do with a real body. Tools in the hands stay with the figure's hands, which move with the real ones.
//
// If a model is missing or fails to load, the coded figure simply stays visible.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { REGIONS } from '../regions.js';
import { PLACES } from '../places.js';
import { personMat } from './people.js';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const DIR = `${BASE}models/folk/`;

// which person a look belongs to (the same objects regions.js and places.js hand to buildFarmer)
const ID_OF = new Map();
for (const [id, r] of Object.entries(REGIONS)) if (r.farmer?.look) ID_OF.set(r.farmer.look, id);
for (const [farm, p] of Object.entries(PLACES)) for (const n of p.folk ?? []) if (n.look) ID_OF.set(n.look, `${farm}_${n.id}`);
export const modelIdFor = (look) => ID_OF.get(look) ?? (look?.face && REGIONS[look.face] ? look.face : null); // a copied look keeps its face id

let manifestPromise = null;
const loadManifest = () => {
  return (manifestPromise ??= fetch(`${DIR}manifest.json`)
    .then((r) => (r.ok ? r.json() : { people: [] }))
    .then((m) => {
      const s = new Set(m.people ?? []);
      if (s.size === 0) manifestPromise = null;
      return s;
    })
    .catch(() => {
      manifestPromise = null;
      return new Set();
    }));
};
let loader = null;
const gltfs = new Map();
function load(id) {
  if (!gltfs.has(id)) {
    loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    gltfs.set(id, loadManifest().then((have) => {
      if (have.has(id)) return loader.loadAsync(`${DIR}${id}.glb`);
      gltfs.delete(id);
      return null;
    }).catch(() => {
      gltfs.delete(id);
      return null;
    }));
  }
  return gltfs.get(id);
}
let disabled = false;
export const setRealPeople = (on) => { disabled = !on; };

// figure joint → real bone, with the joint or bone that each points to (for the rest-pose correction)
const PAIRS = (P) => {
  const out = [
    ['pelvis', P.hips, null, null],
    ['spine_01', P.torso, null, null],
    ['neck_01', P.neck, null, null],
    ['head', P.head, null, null],
  ];
  const side = ['r', 'l']; // the figure's index 0 is at −x, its right side (people face +z)
  P.arms?.forEach((a, i) => out.push(
    [`upperarm_${side[i]}`, a.shoulder, a.elbow, `lowerarm_${side[i]}`],
    [`lowerarm_${side[i]}`, a.elbow, a.hand, `hand_${side[i]}`],
    [`hand_${side[i]}`, a.hand, null, null, `lowerarm_${side[i]}`]));
  P.legs?.forEach((l, i) => out.push(
    [`thigh_${side[i]}`, l.thigh, l.knee, `calf_${side[i]}`],
    [`calf_${side[i]}`, l.knee, l.foot, `foot_${side[i]}`],
    [`foot_${side[i]}`, l.foot, null, null, `calf_${side[i]}`]));
  return out;
};

export const PHONE_POSE = { along: 0.55, off: [0, 0, 0], rot: [0, Math.PI, 0], thumb: [0.8, 0, 0], finger: 1.15 }; // screen towards the palm, thumb along its edge // where the phone sits in Razib's left hand bone
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _p = new THREE.Quaternion();

const poloTexCache = new Map();
function poloPiqueTexture(look) {
  const base = look?.topA || '#dfae9c';
  const gold = look?.topB || '#d9a531';
  const dark = look?.topC || '#3b2f45';
  const key = `polo_${base}_${gold}_${dark}`;
  if (poloTexCache.has(key)) return poloTexCache.get(key);
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const c = cv.getContext('2d');
  c.fillStyle = base; c.fillRect(0, 0, 512, 512);
  // Pique knit micro-texture
  c.fillStyle = 'rgba(0,0,0,0.035)';
  for (let y = 0; y < 512; y += 4) {
    for (let x = (y % 8 === 0 ? 0 : 2); x < 512; x += 4) {
      c.fillRect(x, y, 2, 2);
    }
  }
  // Contrast collar band at collar UVs (U: 0.05 to 0.89, V: 0.02 to 0.08)
  c.fillStyle = dark;
  c.fillRect(512 * 0.05, 512 * 0.02, 512 * 0.84, 512 * 0.05);
  c.fillStyle = gold;
  c.fillRect(512 * 0.05, 512 * 0.068, 512 * 0.84, 3);
  // Front chest stripes (U: 0.47 to 0.65, V: 0.20 to 0.24)
  const u0 = 512 * 0.47, u1 = 512 * 0.65;
  c.fillStyle = gold; c.fillRect(u0, 512 * 0.20, u1 - u0, 5);
  c.fillStyle = dark; c.fillRect(u0, 512 * 0.218, u1 - u0, 3.5);
  // Placket at neck (U: 0.535 to 0.585, V: 0.08 to 0.22)
  const pu0 = 512 * 0.535, pu1 = 512 * 0.585;
  c.fillStyle = dark; c.fillRect(pu0, 512 * 0.08, pu1 - pu0, 512 * 0.135);
  c.strokeStyle = gold; c.lineWidth = 1.5;
  c.strokeRect(pu0, 512 * 0.08, pu1 - pu0, 512 * 0.135);
  // Pearl buttons
  c.fillStyle = '#f5f0ea';
  c.beginPath(); c.arc(512 * 0.56, 512 * 0.12, 3.2, 0, Math.PI * 2); c.arc(512 * 0.56, 512 * 0.175, 3.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#222222';
  c.beginPath(); c.arc(512 * 0.56, 512 * 0.12, 0.8, 0, Math.PI * 2); c.arc(512 * 0.56, 512 * 0.175, 0.8, 0, Math.PI * 2); c.fill();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  poloTexCache.set(key, t);
  return t;
}

// A real smartphone (Razib's): a thin rounded slab, aluminium edges, a dark glass face whose screen shows the
// FieldShift app (a field map, a moisture bar, an alert), and a camera bump on the back. 74 x 160 x 8 mm.
let phoneTex = null;
function phoneScreen() {
  if (phoneTex || typeof document === 'undefined') return phoneTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 552; const x = c.getContext('2d');
  x.fillStyle = '#0b1a12'; x.fillRect(0, 0, 256, 552);
  x.fillStyle = '#123524'; x.fillRect(0, 0, 256, 60);
  x.fillStyle = '#e8f5e9'; x.font = 'bold 26px system-ui, sans-serif'; x.fillText('FieldShift', 18, 40);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { x.fillStyle = ['#3f9d4a', '#9cc54a', '#d8b444', '#5fb36a'][(r * 6 + k * 5) % 4]; x.fillRect(18 + k * 37, 84 + r * 64, 33, 58); }
  x.fillStyle = '#9fb3a8'; x.font = '16px system-ui, sans-serif'; x.fillText('Soil moisture', 18, 300);
  x.fillStyle = '#25433a'; x.fillRect(18, 312, 220, 16); x.fillStyle = '#4fc3f7'; x.fillRect(18, 312, 142, 16);
  x.fillStyle = '#3a2a10'; x.fillRect(18, 352, 220, 74); x.fillStyle = '#ffcc66'; x.font = 'bold 17px system-ui, sans-serif'; x.fillText('Rain in 2 days', 30, 384);
  x.fillStyle = '#e0d6bf'; x.font = '14px system-ui, sans-serif'; x.fillText('Hold watering', 30, 408);
  x.fillStyle = '#2e7d4f'; x.beginPath(); x.arc(128, 496, 26, 0, Math.PI * 2); x.fill();
  phoneTex = new THREE.CanvasTexture(c); phoneTex.colorSpace = THREE.SRGBColorSpace;
  return phoneTex;
}
function realPhone() {
  const g = new THREE.Group();
  const W = 0.074, H = 0.16, D = 0.008, r = 0.01;
  const sh = new THREE.Shape();
  sh.moveTo(-W / 2 + r, -H / 2); sh.lineTo(W / 2 - r, -H / 2); sh.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + r);
  sh.lineTo(W / 2, H / 2 - r); sh.quadraticCurveTo(W / 2, H / 2, W / 2 - r, H / 2); sh.lineTo(-W / 2 + r, H / 2);
  sh.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - r); sh.lineTo(-W / 2, -H / 2 + r); sh.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + r, -H / 2);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 3, curveSegments: 8 }), new THREE.MeshStandardMaterial({ color: '#3a3d42', metalness: 0.85, roughness: 0.3 }));
  body.position.z = -D / 2; g.add(body);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.004, H - 0.004), new THREE.MeshStandardMaterial({ color: '#ffffff', map: phoneScreen(), emissive: '#ffffff', emissiveMap: phoneScreen(), emissiveIntensity: 0.55, roughness: 0.08, metalness: 0.1 }));
  glass.position.z = D / 2 + 0.0013; g.add(glass);
  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.032, 0.002), new THREE.MeshStandardMaterial({ color: '#1c1d20', roughness: 0.4 }));
  cam.position.set(-W / 2 + 0.02, H / 2 - 0.022, -D / 2 - 0.0022); g.add(cam);
  for (const [dx, dy] of [[-0.006, 0.007], [-0.006, -0.007]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.002, 16), new THREE.MeshStandardMaterial({ color: '#08090b', roughness: 0.1, metalness: 0.4 })); l.rotation.x = Math.PI / 2; l.position.set(-W / 2 + 0.02 + dx, H / 2 - 0.022 + dy, -D / 2 - 0.0035); g.add(l); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Attach the real model to a figure from buildFarmer (async; the figure shows until it arrives).
export function attachReal(P, look) {
  const id = modelIdFor(look);
  if (!id || disabled) return Promise.resolve(null);
  P.pockets = false; // real people let their hands hang naturally; never sink into thighs
  return load(id).then((gltf) => {
    if (!gltf || P.disposed) return;
    const model = cloneSkinned(gltf.scene);
    const bones = {};
    model.traverse((o) => {
      if (o.isBone) bones[o.name] = o;
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; // a skinned mesh's bounds are its rest pose
        const m = o.material;
        // MakeHuman marks the skin, eyes and teeth as see-through: drawn that way the teeth show through the face.
        // Skin and teeth are solid; the eyes' clear cornea, brows, lashes and hair are cut by alpha instead.
        if (m && m.name.startsWith('skin')) {
          m.transparent = false; m.depthWrite = true; m.alphaTest = 0; m.opacity = 1;
          m.polygonOffset = false;
          const skinHex = look.skin || '#cea382';
          // Tint base diffuse map with farmer's authentic regional skin tone
          const skinCol = new THREE.Color(skinHex);
          // the build already painted the texture in this person's own skin colour (and the beard into it):
          // tinting it again would darken every face and turn a white beard brown
          m.color = m.map ? new THREE.Color('#ffffff') : skinCol;
          m.roughness = 0.58;
          m.metalness = 0.0;
        }
        if (o.isMesh && (o.name.toLowerCase().includes('teeth') || (m && /teeth/i.test(m.name)))) {
          // MakeHuman rest pose leaves lips parted, causing teeth to poke out like a grinning skeleton.
          // In idle, walking, and natural farmer postures, teeth should not clip through closed lips.
          o.position.z = -0.008;
          o.scale.set(0.95, 0.95, 0.95);
          if (m) {
            m.polygonOffset = true;
            m.polygonOffsetFactor = 3.0;
            m.polygonOffsetUnits = 4.0;
            m.depthWrite = true;
            m.transparent = false;
          }
          o.visible = false;
        }
        if (o.isMesh && (o.name.toLowerCase().includes('eyelash') || (m && /lash/i.test(m.name)))) {
          // MakeHuman eyelashes are planar quad strips that occlude the face skin, causing a horizontal transparent cut across eyes/nose
          o.visible = false;
        }
        if (o.isMesh && (o.name.toLowerCase().includes('high-poly') || (m && /eyes/i.test(m.name)))) {
          if (m) {
            // the eye has a clear cornea shell over the iris: drawn solid it hides the iris as a white blank, so its
            // see-through part is cut away and the iris and pupil show
            m.transparent = false;
            m.depthWrite = true;
            m.alphaTest = 0.5;
            m.roughness = 0.2;
            m.metalness = 0.02;
          }
        }
        if (o.isMesh && (/hair|ponytail/i.test(o.name) || (m && /hair/i.test(m.name)))) {
          // If wearing a full headwrap, hijab, orhni or turban, hide bulky hair/ponytails that poke through
          if (look.head === 'hijab' || look.head === 'turban' || look.head === 'dastar' || look.head === 'orhni' || look.head === 'gaungbaung' || (look.head === 'tupi' && /ponytail/i.test(o.name))) {
            o.visible = false;
          } else if (m) {
            m.transparent = true;
            m.alphaTest = 0.35;
            m.depthWrite = true;
            m.roughness = 0.72;
          }
        }
        if (m && /beard/i.test(m.name)) {
          m.transparent = true;
          m.alphaTest = 0.25;
          m.depthWrite = true;
          m.side = THREE.DoubleSide;
        }
        if (m && /brow/i.test(m.name)) {
          m.transparent = true;
          m.alphaTest = 0.2;
          m.depthWrite = true;
          m.side = THREE.DoubleSide;
        }
        if (m && /^Human\.shoes/.test(m.name)) { m.transparent = false; m.depthWrite = true; }
        if (m && /^cloth/.test(m.name)) {
          m.side = THREE.DoubleSide;
          m.polygonOffset = true;
          m.polygonOffsetFactor = -2.0;
          m.polygonOffsetUnits = -4.0;
          m.depthWrite = true;
          m.roughness = 0.82;
          if (false && look.top === 'polo') { // the build paints the polo itself; this coded-figure texture lands as a pale band across a real shirt
            const pTex = poloPiqueTexture(look);
            if (pTex) { m.map = pTex; m.color = new THREE.Color('#ffffff'); }
          }
        }
        // Specific garment layering fixes to prevent mesh tearing and z-fighting
        if (o.name === 'hem_kurta' || o.name === 'hem_kameez' || (m && (m.name === 'cloth_hem_kurta' || m.name === 'cloth_hem_kameez'))) {
          // Kurta / kameez hem hangs outside the lungi / shalwar: scale slightly in X/Z and push polygonOffset forward
          // so it never z-fights or tears in jagged white triangles through the lungi or shalwar
          o.scale.set(1.035, 1.0, 1.035);
          if (m) {
            m.side = THREE.DoubleSide;
            m.depthWrite = true;
            m.polygonOffset = true;
            m.polygonOffsetFactor = -6.0;
            m.polygonOffsetUnits = -8.0;
            m.roughness = 0.85;
          }
        }
        if (o.name === 'scarf_hijab' || o.name === 'scarf_orhni' || (m && (m.name === 'cloth_scarf' || m.name === 'cloth_orhni'))) {
          // Expand hijab & orhni slightly so head/hair never pokes through (Rahima and Rampyari fix)
          o.scale.set(1.032, 1.015, 1.032);
          if (m) {
            m.side = THREE.DoubleSide;
            m.depthWrite = true;
            m.polygonOffset = true;
            m.polygonOffsetFactor = -7.0;
            m.polygonOffsetUnits = -10.0;
            m.roughness = 0.85;
          }
        }
        if (['low_sari', 'low_ghagra', 'low_kira', 'low_longyi'].includes(o.name)) {
          o.scale.set(1.025, 1.0, 1.03);
          if (m) {
            m.side = THREE.DoubleSide;
            m.depthWrite = true;
            m.polygonOffset = true;
            m.polygonOffsetFactor = -4.0;
            m.polygonOffsetUnits = -6.0;
          }
        }
        if (o.name === 'pallu' || (m && m.name === 'cloth_pallu')) {
          // Sari pallu hangs over blouse: expand slightly
          o.scale.set(1.025, 1.01, 1.025);
          if (m) {
            m.side = THREE.DoubleSide;
            m.depthWrite = true;
            m.polygonOffset = true;
            m.polygonOffsetFactor = -5.0;
            m.polygonOffsetUnits = -7.0;
            m.roughness = 0.85;
          }
        }
        if (o.isMesh && (o.name === 'Human' || o.name === 'base' || (m && m.name.startsWith('skin')))) {
          if (!o.geometry.userData.chestTucked) {
            o.geometry.userData.chestTucked = true;
            const pos = o.geometry?.attributes?.position;
            // only on plain float positions: a compressed model stores them as packed integers, where these numbers
            // mean nothing and recomputing the normals ruins the skin's lighting (build_people.py tucks the chest itself)
            if (pos && !pos.normalized && pos.array instanceof Float32Array) {
              for (let i = 0; i < pos.count; i++) {
                const x = Math.abs(pos.getX(i));
                const y = pos.getY(i);
                const z = pos.getZ(i);
                // Only pull mid-chest gently under shirt front; NEVER touch the upper neck/clavicle (y > 1.22)
                // which created a 2cm neck hole in front of the collar
                if (x < 0.10 && y >= 0.90 && y <= 1.22 && z > 0.005) {
                  pos.setZ(i, Math.max(0.002, z - 0.006));
                }
              }
              pos.needsUpdate = true;
              o.geometry.computeVertexNormals();
            }
          }
        }
        // the game's rim light suits the coded figures' cloth; on real skin, eyes and hair it reads as a white glow
        // round the face, so only clothes get it
        if (o.material && /^cloth/.test(o.material.name)) {
          o.material = personMat(o.material);
          o.material.needsUpdate = true;
        }
      }
    });
    if (!bones.pelvis) return;
    // size: the real person as tall as the figure (its build already scales it)
    P.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model), h = box.max.y - box.min.y;
    const fig = new THREE.Box3(); P.body.traverse((o) => { if (o.isMesh && o.visible) fig.expandByObject(o); });
    const target = (fig.max.y - fig.min.y) || 1.7;
    const s = h > 0.5 ? target / h : 1;
    const holder = new THREE.Group(); holder.scale.setScalar(s / Math.max(1e-6, P.root.scale.x)); holder.add(model);
    P.root.add(holder);
    holder.updateMatrixWorld(true);
    // the rest pose of both, and the corrections that line the real limbs up with the figure's
    const pairs = PAIRS(P).filter(([b, j]) => bones[b] && j).map(([b, j, jChild, bChild, corrFrom]) => ({ b: bones[b], j, jChild, bChild: bChild && bones[bChild], corrFrom, C: new THREE.Quaternion() }));
    const byName = Object.fromEntries(pairs.map((p) => [p.b.name, p]));
    for (const p of pairs) {
      p.Q0 = P.restQ?.get(p.j) ? P.restQ.get(p.j).clone() : p.j.getWorldQuaternion(new THREE.Quaternion());
      p.R0 = p.b.getWorldQuaternion(new THREE.Quaternion());
      if (p.jChild && p.bChild) {
        const pF = P.restP?.get(p.jChild);
        const pJ = P.restP?.get(p.j);
        const dF = (pF && pJ)
          ? pF.clone().sub(pJ).normalize()
          : p.jChild.getWorldPosition(new THREE.Vector3()).sub(p.j.getWorldPosition(new THREE.Vector3())).normalize();
        const dR = p.bChild.getWorldPosition(new THREE.Vector3()).sub(p.b.getWorldPosition(new THREE.Vector3())).normalize();
        p.C.setFromUnitVectors(dR, dF);
      }
    }
    for (const p of pairs) if (p.corrFrom && byName[p.corrFrom]) p.C.copy(byName[p.corrFrom].C); // hands and feet follow their limb's correction
    // pairs in parent-first order, so each bone is set after its parent
    const depth = (o) => { let d = 0; for (let x = o; x.parent; x = x.parent) d++; return d; };
    pairs.sort((a, b) => depth(a.b) - depth(b.b));
    const hips0 = P.restHipsPos ? P.restHipsPos.clone() : P.hips.position.clone(), pelvis0 = bones.pelvis.position.clone();
    // MakeHuman's hand mesh has articulated finger bones. Keep their rest pose and add a
    // tiny asynchronous curl so an idle hand is relaxed instead of frozen like a mannequin.
    const fingers = [];
    for (const side of ['l', 'r']) {
      for (const [finger, base] of [['index', 0.025], ['middle', 0.045], ['ring', 0.06], ['pinky', 0.075], ['thumb', 0.025]]) {
        for (let joint = 1; joint <= 3; joint++) {
          const b = bones[`${finger}_0${joint}_${side}`];
          if (b) fingers.push({ b, q: b.quaternion.clone(), side, finger, joint, base });
        }
      }
    }
    const pelvisScale = (bones.pelvis.getWorldPosition(new THREE.Vector3()).y - holder.getWorldPosition(_w).y) / Math.max(1e-6, P.hips.getWorldPosition(_v).y - P.root.getWorldPosition(_w).y);
    // hide the coded figure's body, but not the tools in its hands
    const tools = new Set(Object.values(P.tools ?? {}));
    const hideAll = () => P.root.traverse((o) => {
      if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return;
      for (let x = o; x; x = x.parent) if (tools.has(x) || x === holder) return;
      o.visible = false;
    });
    hideAll();
    // the tools (can, sickle, sprayer, broom, kula, basket, tank, sack) move from the hidden coded figure onto the
    // real skeleton, so they sit in the real palm or on the real body instead of floating beside it
    P.root.updateMatrixWorld(true);
    const handBone = new Map((P.arms ?? []).map((a, i) => [a.hand, bones[`hand_${i === 0 ? 'r' : 'l'}`]]));
    const palmOf = (side) => { const mid = bones[`middle_01_${side}`]; return mid ? mid.position.clone().multiplyScalar(0.6) : new THREE.Vector3(0, 0.06, 0); };
    for (const t of Object.values(P.tools ?? {})) {
      const hb = handBone.get(t.parent);
      const target = hb ?? (t.parent === P.torso ? bones.spine_03 ?? bones.spine_02 : null);
      if (!target) continue;
      target.attach(t); // keeps its look and size in the world
      // an anchor holds that placement, so the work animation's own turns of the tool (tilting the can, sweeping
      // the broom) stay relative to the hand instead of overwriting it
      const anchor = new THREE.Group(); target.add(anchor);
      anchor.position.copy(hb ? palmOf(hb.name.endsWith('_r') ? 'r' : 'l') : t.position);
      anchor.quaternion.copy(t.quaternion); anchor.scale.copy(t.scale);
      anchor.add(t); t.position.set(0, 0, 0); t.quaternion.identity(); t.scale.set(1, 1, 1);
    }
    P.pockets = false; // the coded pocket pose sinks real hands into the thighs: real people let their hands hang
    // the phone: a copy held in the real left hand, the fingers closed round it (the figure's own stays hidden)
    let phone = null; const fist = [];
    if (false && id === 'razib' && bones.hand_l) { // the phone is off: the user asked for empty hands (2026-11-12) // only Razib carries a phone: a real one, in his left hand (PHONE_POSE)
      phone = realPhone();
      const hb = bones.hand_l, mid = bones.middle_01_l;
      const palm = mid ? mid.position.clone().multiplyScalar(PHONE_POSE.along) : new THREE.Vector3(0, 0.05, 0);
      phone.position.copy(palm).add(new THREE.Vector3(...PHONE_POSE.off)); phone.rotation.set(...PHONE_POSE.rot);
      const hs = new THREE.Vector3(); hb.getWorldScale(hs); phone.scale.setScalar(holder.scale.x * P.root.scale.x / Math.max(1e-6, hs.x * holder.scale.x * P.root.scale.x)); // world-size phone
      hb.add(phone);
      for (const f of ['index', 'middle', 'ring', 'pinky']) for (const k of [1, 2, 3]) { const b = bones[`${f}_0${k}_l`]; if (b) fist.push({ b, q: b.quaternion.clone(), a: k === 1 ? 1.1 : 1.25 }); }
      for (const k of [1, 2, 3]) { const b = bones[`thumb_0${k}_l`]; if (b) fist.push({ b, q: b.quaternion.clone(), a: k === 1 ? 0.9 : 0.75, thumb: true }); } // the thumb wraps the phone's edge
    }
    const _e = new THREE.Euler(), _c = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AZ = new THREE.Vector3(0, 0, 1);
    P.real = {
      id, model, holder, n: 0, pose: PHONE_POSE,
      sync(state = {}) {
        if (++this.n % 60 === 1) hideAll(); // parts the figure adds later (a blink's lids, a held tool's case)
        // the pelvis goes up and down with the figure's hips (a crouch, a step's bounce)
        bones.pelvis.position.copy(pelvis0).addScaledVector(_v.copy(P.hips.position).sub(hips0), pelvisScale / Math.max(1e-6, holder.scale.x));
        for (const p of pairs) {
          const now = p.j.getWorldQuaternion(_q);
          const delta = now.multiply(_p.copy(p.Q0).invert()); // the turn the figure's joint has made since rest
          const want = delta.multiply(p.C).multiply(p.R0); // ... applied to the corrected real bone
          const parentW = p.b.parent.getWorldQuaternion(_p);
          p.b.quaternion.copy(parentW.invert().multiply(want));
          p.b.updateMatrixWorld(true);
        }
        const moving = Math.min(1, (state.speed ?? 0) / 2.5);
        const working = state.act ? 0.045 : 0;
        for (const f of fingers) {
          const phase = (state.t ?? 0) * (f.finger === 'thumb' ? 1.15 : 1.6) + (f.side === 'l' ? 0.8 : 0) + f.joint * 0.45;
          const flex = f.base + Math.sin(phase) * 0.018 + moving * 0.035 + working;
          f.b.quaternion.copy(f.q).multiply(_c.setFromAxisAngle(AX, flex));
          f.b.updateMatrixWorld(true);
        }
        if (P.tools?.phone) P.tools.phone.visible = false;
        if (phone) {
          phone.rotation.set(...this.pose.rot);
          for (const f of fist) {
            if (f.thumb) _c.setFromEuler(_e.set(...this.pose.thumb)); else _c.setFromAxisAngle(AX, this.pose.finger * (f.a / 1.15));
            f.b.quaternion.copy(f.q).multiply(_c); f.b.updateMatrixWorld(true);
          }
        }
      },
    };
    return P.real;
  });
}

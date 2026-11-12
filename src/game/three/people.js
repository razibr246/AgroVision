// Procedural low-poly game characters with jointed limbs, dressed for their regional setting:
// Harjinder Singh in a saffron dastar, white kurta-pyjama and a steel kara; Ghulam Nabi Chandio in a mirror-work
// Sindhi cap, white shalwar kameez and an ajrak shawl; Rampyari Chaudhary in a Tharu skirt with bright bands, a white
// choli, a red orhni and silver jewellery; Kinley Wangmo in a woven kira and silk tego with folded wonju cuffs;
// U Kyaw Win in a checked longyi, a white eingyi and a gaung baung head-wrap. Tools appear for the work: a watering
// can (a clay pot for the women), a sickle, a sprayer, a phone. animate() poses the figure every frame.
// Bodies are stylised semi-chibi, like a premium designer toy (proportions in ../proportions.js): a large head,
// broad shoulders, a medium torso, short sturdy legs, big hands and feet; a shaped torso (broader chest on men, a
// narrower waist on women), smooth tapered limbs with rounded joints, hands with fingers, fabric that catches the light at its edges
// and skin with a soft sheen, and a painted face on every head (look.face). These are sample game characters, not
// likenesses of real farmers. The walk sways the hips and counter-turns the shoulders.
import * as THREE from 'three';
import { blink, idleGaze, ageStoop, expressionFromState } from '../../engine/motion.js';
import { STYLE, HIP_Y, DOWN_HIP_Y, SHIN_POS, POCKET, hasPockets } from '../proportions.js';
import { attachReal } from './realPeople.js';
import { stridePose, gaitParams } from '../humangait.js';
import { smooth01 } from '../gait.js';

const ankle = new THREE.Vector3(); // scratch for planting the feet in animate()
const TH = STYLE.thigh, SH = STYLE.shin, LT = STYLE.legThick, AT = STYLE.armThick, TR = TH / 0.44; // TR: thigh against the old 0.44 m

const geo = {
  sphere: (r, w = 14, h = 10, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest),
  cyl: (rt, rb, h, s = 12, open = false, t0 = 0, tl = Math.PI * 2) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open, t0, tl),
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  torus: (r, t, rs = 8, ts = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
};
const mats = new Map();
// Phones get plain materials; elsewhere cloth and skin get a sheen (light caught at grazing angles, as fabric and skin do).
const HQ = typeof window !== 'undefined' && !window.matchMedia?.('(pointer: coarse)').matches;
export function mat(color, o = {}) {
  const poKey = `${o.polygonOffset ? 1 : 0}|${o.polygonOffsetFactor ?? ''}|${o.polygonOffsetUnits ?? ''}`;
  const k = `${color}|${o.flat ? 1 : 0}|${o.map?.uuid ?? ''}|${o.emissive ?? ''}|${o.rough ?? ''}|${o.metal ?? ''}|${o.side ?? ''}|${o.sheen ?? ''}|${poKey}`;
  if (!mats.has(k)) {
    const base = {
      color: o.map ? '#ffffff' : color,
      map: o.map ?? null,
      roughness: o.rough ?? 0.85,
      metalness: o.metal ?? 0,
      flatShading: !!o.flat,
      emissive: o.emissive ?? '#000000',
      emissiveIntensity: o.emissive ? 1 : 0,
      side: o.side ?? THREE.FrontSide,
      polygonOffset: !!o.polygonOffset,
      polygonOffsetFactor: o.polygonOffsetFactor ?? 0,
      polygonOffsetUnits: o.polygonOffsetUnits ?? 0,
    };
    mats.set(k, HQ && o.sheen ? new THREE.MeshPhysicalMaterial({ ...base, sheen: o.sheen, sheenRoughness: o.sheenRough ?? 0.7, sheenColor: new THREE.Color(o.sheenColor ?? '#ffffff') }) : new THREE.MeshStandardMaterial(base));
  }
  return mats.get(k);
}
const cloth = (color, o = {}) => mat(color, { sheen: 0.55, sheenRough: 0.8, ...o });

// A limb hanging from its joint: radius r0 at the top, r1 at the bottom, a slight muscle swell, rounded ends that
// close over the joints when it bends. Shared between figures.
const shapes = new Map();
function smoothProfile(points, steps = Math.max(12, (points.length - 1) * 5)) {
  // Preserve the authored silhouette but interpolate between rings so the profile
  // reads as a continuous body instead of a stack of low-poly cylinders.
  return new THREE.SplineCurve(points.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(steps);
}
function torsoDepth(female, y) {
  const waist = Math.exp(-(((y - 0.13) / 0.13) ** 2));
  const chest = Math.exp(-(((y - 0.4) / 0.19) ** 2));
  return female ? 1 - 0.1 * waist + 0.015 * chest : 1 - 0.1 * waist + 0.055 * chest;
}
function limb(r0, r1, len, swell = 1.07) {
  const k = `limb${r0}|${r1}|${len}|${swell}`;
  if (shapes.has(k)) return shapes.get(k);
  const pts = [];
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2); pts.push(new THREE.Vector2(r1 * Math.sin(a), -len - r1 * Math.cos(a) * 0.85)); }
  pts.push(new THREE.Vector2((r1 + (r0 - r1) * 0.35) * swell, -len * 0.62), new THREE.Vector2((r1 + (r0 - r1) * 0.78) * swell, -len * 0.3));
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2); pts.push(new THREE.Vector2(r0 * Math.cos(a), r0 * Math.sin(a) * 0.85)); }
  const profile = smoothProfile(pts.map((p) => [p.x, p.y]), 28);
  const g = new THREE.LatheGeometry(profile, 24); shapes.set(k, g); return g;
}
// The torso from the waist to the base of the neck, lofted through elliptical cross-sections.
function torsoShape(female) {
  const k = `torso${female}`;
  if (shapes.has(k)) return shapes.get(k);
  // A more human silhouette under every outfit: a gently shaped pelvis, narrow waist,
  // rib cage, and shoulders tapering into the neck. Extra profile rings keep the
  // transition smooth instead of making the torso read as a single tapered tube.
  const prof = female
    ? [[0.153, -0.04], [0.17, 0.0], [0.178, 0.06], [0.161, 0.13], [0.154, 0.2], [0.167, 0.27], [0.187, 0.34], [0.194, 0.4], [0.184, 0.46], [0.163, 0.51], [0.13, 0.55], [0.082, 0.58], [0.052, 0.59]]
    : [[0.155, -0.04], [0.166, 0.01], [0.168, 0.08], [0.15, 0.15], [0.158, 0.22], [0.178, 0.3], [0.2, 0.38], [0.211, 0.445], [0.202, 0.49], [0.174, 0.53], [0.13, 0.56], [0.058, 0.59]];
  const profile = smoothProfile(prof, 60);
  const segments = 40, positions = [], uvs = [], indices = [];
  profile.forEach((p, row) => {
    for (let col = 0; col <= segments; col++) {
      const angle = (col / segments) * Math.PI * 2;
      positions.push(p.x * Math.cos(angle), p.y, p.x * torsoDepth(female, p.y) * Math.sin(angle));
      uvs.push(col / segments, row / (profile.length - 1));
      if (row < profile.length - 1 && col < segments) {
        const a = row * (segments + 1) + col, b = a + 1, c = a + segments + 1, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices); g.computeVertexNormals();
  g.userData.prof = profile.map((p) => [p.x, p.y]); shapes.set(k, g); return g;
}
// how far forward the torso's surface is at height y, x to the side: where buttons, plackets and sashes sit
function frontOf(female) {
  const prof = torsoShape(female).userData.prof;
  return (y, x = 0) => {
    let i = 0; while (i < prof.length - 2 && prof[i + 1][1] < y) i++;
    const [r0, y0] = prof[i], [r1, y1] = prof[i + 1], r = r0 + (r1 - r0) * Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
    return 0.86 * torsoDepth(female, y) * Math.sqrt(Math.max(0, r * r - x * x));
  };
}
const capsule = (r, l) => { const k = `cap${r}|${l}`; if (!shapes.has(k)) shapes.set(k, new THREE.CapsuleGeometry(r, l, 3, 8)); return shapes.get(k); };

// Cached continuous tapered nose geometry (nasion to tip lobule and alar flare)
export function noseGeometry() {
  if (shapes.has('nose')) return shapes.get('nose');
  // Order profile points from bottom (subnasale) to top (nasion) to produce CCW face winding and outward normals
  const pts = [
    new THREE.Vector2(0.0001, -0.023),
    new THREE.Vector2(0.012, -0.019),
    new THREE.Vector2(0.017, -0.014),
    new THREE.Vector2(0.016, -0.009),
    new THREE.Vector2(0.011, 0.000),
    new THREE.Vector2(0.008, 0.010),
    new THREE.Vector2(0.006, 0.020),
    new THREE.Vector2(0.0001, 0.026),
  ];
  const g = new THREE.LatheGeometry(pts, 16);
  g.computeVertexNormals();
  shapes.set('nose', g);
  return g;
}

// Cached anatomical curved eyebrow conforming to forehead ellipsoid curvature
function browGeometry(side = 1) {
  const k = `curvedBrow${side}`;
  if (shapes.has(k)) return shapes.get(k);
  const R = 0.100, tube = 0.0034;
  const theta1 = Math.asin(0.015 / R), theta2 = Math.asin(0.060 / R);
  const arc = theta2 - theta1;
  const g = new THREE.TorusGeometry(R, tube, 6, 14, arc);
  g.rotateZ(theta1);
  const thetaMid = (theta1 + theta2) / 2;
  const xMid = R * Math.cos(thetaMid), yMid = R * Math.sin(thetaMid);
  g.translate(-xMid, -yMid, 0);
  g.applyMatrix4(new THREE.Matrix4().set(
    0, side, 0, 0,
    0, 0,    1, 0,
    1, 0,    0, 0,
    0, 0,    0, 1
  ));
  if (side === -1) {
    const idx = g.getIndex();
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i);
      idx.setX(i, idx.getX(i + 1));
      idx.setX(i + 1, a);
    }
  }
  g.computeVertexNormals();
  g.userData = { yMid, xMid };
  shapes.set(k, g);
  return g;
}

// Cached curved moustache wrapping flush around the maxilla and cheeks
function moustacheGeometry() {
  const k = 'curvedMoustache';
  if (shapes.has(k)) return shapes.get(k);
  const R = 0.106, tube = 0.0065, arc = 0.82;
  const g = new THREE.TorusGeometry(R, tube, 6, 18, arc);
  g.rotateZ(-arc / 2);
  g.translate(-R, 0, 0);
  g.applyMatrix4(new THREE.Matrix4().set(
    0, 1, 0, 0,
    0, 0, 1, 0,
    1, 0, 0, 0,
    0, 0, 0, 1
  ));
  g.scale(1.0, 1.35, 0.90);
  g.computeVertexNormals();
  shapes.set(k, g);
  return g;
}

const isFemale = (look) => look.female === true || ['sari', 'ghagra', 'kira'].includes(look.lower) || ['orhni', 'aanchal', 'hijab'].includes(look.head) || ['blouse', 'choli', 'tego'].includes(look.top);
function mesh(g, m, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  const o = new THREE.Mesh(g, m);
  o.position.set(...pos); o.rotation.set(...rot); if (scale) o.scale.set(...scale);
  o.castShadow = true; o.receiveShadow = true;
  parent.add(o); return o;
}
const group = (parent, pos = [0, 0, 0]) => { const o = new THREE.Group(); o.position.set(...pos); parent.add(o); return o; };

// ---- cloth patterns, drawn once on small canvases ----
const texCache = new Map();
export function canvasTex(key, w, h, draw, rep = [1, 1]) {
  if (texCache.has(key)) return texCache.get(key);
  if (typeof document === 'undefined') {
    const t = new THREE.Texture();
    texCache.set(key, t);
    return t;
  }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 4;
  texCache.set(key, t); return t;
}
const check = (a, b, n = 8, rep = [3, 2]) => canvasTex(`check${a}${b}${n}${rep}`, 64, 64, (c, w, h) => {
  c.fillStyle = a; c.fillRect(0, 0, w, h);
  c.globalAlpha = 0.55; c.fillStyle = b;
  for (let i = 0; i < n; i += 2) { c.fillRect(i * (w / n), 0, w / n / 1.6, h); c.fillRect(0, i * (h / n), w, h / n / 1.6); }
  c.globalAlpha = 0.3; c.fillStyle = '#ffffff';
  for (let i = 1; i < n; i += 2) { c.fillRect(i * (w / n), 0, 1.5, h); c.fillRect(0, i * (h / n), w, 1.5); }
}, rep);
// horizontal woven bands at the hem (Tharu skirt) or all over (Bhutanese kira)
const bandTex = (base, bands, all) => canvasTex(`band${base}${bands}${all}`, 64, 128, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  if (all) {
    for (let y = 0, k = 0; y < h; y += 10, k++) { c.fillStyle = bands[k % bands.length]; c.fillRect(0, y, w, k % 3 === 0 ? 6 : 3); }
    c.fillStyle = 'rgba(255,255,255,.35)'; for (let y = 4; y < h; y += 20) for (let x = (y / 4) % 8; x < w; x += 8) c.fillRect(x, y, 3, 2);
  } else bands.forEach((col, k) => { c.fillStyle = col; c.fillRect(0, h - 10 - k * 10, w, 6); });
}, [3, 1]);
// Sindhi ajrak: crimson ground with indigo and white block-printed rosettes
const ajrakTex = () => canvasTex('ajrak', 64, 64, (c, w, h) => {
  c.fillStyle = '#8f1d24'; c.fillRect(0, 0, w, h);
  for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) {
    c.fillStyle = '#1d2a5a'; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f2ece0'; c.beginPath(); c.arc(x, y, 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#121212'; c.fillRect(x + 6, y - 1, 4, 2);
  }
  c.fillStyle = '#1d2a5a'; c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3);
}, [2, 2]);
// the mirror-work band of a Sindhi topi
const topiTex = (a, b) => canvasTex(`topi${a}${b}`, 128, 32, (c, w, h) => {
  c.fillStyle = a; c.fillRect(0, 0, w, h);
  c.fillStyle = b; for (let x = 4; x < w; x += 12) { c.beginPath(); c.moveTo(x, 4); c.lineTo(x + 5, h / 2); c.lineTo(x, h - 4); c.lineTo(x - 5, h / 2); c.fill(); }
  c.fillStyle = '#e8f0f6'; for (let x = 10; x < w; x += 12) { c.beginPath(); c.arc(x, h / 2, 2.6, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#1a6b3a'; c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2);
});
const turbanTex = (a, b) => canvasTex(`turban${a}${b}`, 64, 64, (c, w, h) => {
  c.fillStyle = a; c.fillRect(0, 0, w, h);
  c.strokeStyle = b; c.lineWidth = 2;
  for (let k = -h; k < w; k += 9) { c.beginPath(); c.moveTo(k, h); c.lineTo(k + h * 0.6, 0); c.stroke(); }
}, [3, 1]);

// Painted game faces, drawn from each farmer's portrait: distinct skin undertones, almond eyes with limbal rings,
// triple corneal catch-lights, authentic eyebrows, facial contours, lip highlights, and healthy cheek warmth.
const FACES = {
  razib: { brow: '#16100d', iris: '#3b2416', lid: '#22150f', lip: '#9e5a4c', lipLo: '#b8766a', beard: '#1e1611', shade: '#9c6a4c', blush: '#c76e5b', goatee: true, browW: 8.5 },
  rahimu: { brow: '#5a524c', iris: '#2d1c12', lid: '#1a100a', lip: '#8a4b3d', lipLo: '#a15d4e', beard: '#d9d4cc', shade: '#7a4e32', blush: '#b06148', wrinkles: true, browW: 9 },
  didarul: { brow: '#1a1410', iris: '#28170e', lid: '#180e08', lip: '#945242', lipLo: '#aa6452', beard: '#231b16', shade: '#7c4d30', blush: '#b5644c', beardTrim: true, browW: 8.5 },
  prahlad: { brow: '#1f1915', iris: '#2e1d13', lid: '#1a100a', lip: '#844537', lipLo: '#9c5444', beard: '#2a2420', shade: '#693e25', blush: '#9e5238', wrinkles: true, browW: 9.5 },
  kader: { brow: '#d5d0c8', iris: '#2b1b12', lid: '#1a110a', lip: '#965646', lipLo: '#af6a58', beard: '#efebe4', shade: '#885434', blush: '#bd6a52', browW: 8 },
  mofizul: { brow: '#1c1511', iris: '#301f14', lid: '#1b110a', lip: '#99594a', lipLo: '#b26e5e', beard: '#211a16', shade: '#94603e', blush: '#c26e52', stubble: true, browW: 8.5 },
  rahima: { brow: '#18120e', iris: '#2e190e', lid: '#140c07', lip: '#b34842', lipLo: '#cf635c', shade: '#a87854', blush: '#dc6d62', female: true, beautyMark: true, browW: 5.8 },
  harjinder: { brow: '#15100c', iris: '#2f1c11', lid: '#180f09', lip: '#945344', lipLo: '#ad6756', beard: '#1d1714', shade: '#8a5635', blush: '#bf6c54', browW: 10 },
  ghulam: { brow: '#201812', iris: '#2a1a10', lid: '#170e08', lip: '#8e4e3f', lipLo: '#a66050', beard: '#3a322c', shade: '#7a4e30', blush: '#b25f46', wrinkles: true, browW: 9 },
  rampyari: { brow: '#1a130f', iris: '#2b170c', lid: '#160d07', lip: '#bf443e', lipLo: '#d85e56', shade: '#98623f', blush: '#dd6658', female: true, noseStud: true, browW: 6 },
  kinley: { brow: '#1b1410', iris: '#2d1b11', lid: '#150d08', lip: '#b8524d', lipLo: '#d36c66', shade: '#a67652', blush: '#e86e68', female: true, himalayanCheeks: true, browW: 5.5 },
  kyaw: { brow: '#241b16', iris: '#2c1c12', lid: '#160e09', lip: '#8c4e40', lipLo: '#a56252', beard: '#241b16', shade: '#966341', blush: '#bd6a50', wrinkles: true, browW: 7.5 },
};
function faceFor(look) {
  if (look.face && FACES[look.face]) return look.face;
  const female = isFemale(look), k = `auto${female ? 'f' : 'm'}_${look.skin}_${look.hair}_${look.beard ?? ''}_${look.moustache ?? ''}`;
  if (!FACES[k]) {
    const sk = new THREE.Color(look.skin);
    const shade = '#' + sk.clone().multiplyScalar(0.74).getHexString();
    const blush = '#' + sk.clone().lerp(new THREE.Color('#e06a55'), 0.28).getHexString();
    FACES[k] = {
      brow: look.beard ?? look.moustache ?? look.hair,
      iris: female ? '#2f1a10' : '#2b1b12',
      lid: '#1c120c',
      lip: female ? '#aa504a' : '#' + sk.clone().lerp(new THREE.Color('#7a3a30'), 0.45).getHexString(),
      lipLo: female ? '#c26b64' : '#' + sk.clone().lerp(new THREE.Color('#9a5048'), 0.4).getHexString(),
      beard: look.beard ?? look.hair,
      shade,
      blush,
      female,
      browW: female ? 5.5 : 8,
      stubble: !female && !look.beard && !look.moustache,
      goatee: look.face === 'razib',
    };
  }
  return k;
}
const FACE_R = 0.1195, FACE_RX = FACE_R * 0.95, FACE_RY = FACE_R * 1.08, FACE_P = (72 * Math.PI) / 180;
const FACE_T0 = Math.acos(0.064 / FACE_RY), FACE_T1 = Math.acos(-0.112 / FACE_RY);
const faceTex = (k) => canvasTex(`face${k}`, 512, 512, (c, W, H) => {
  const F = FACES[k];
  const px = (x, y) => {
    const th = Math.acos(Math.max(-1, Math.min(1, y / FACE_RY)));
    return [
      ((Math.asin(Math.max(-1, Math.min(1, x / (FACE_RX * Math.sin(th))))) + FACE_P) / (2 * FACE_P)) * W,
      ((th - FACE_T0) / (FACE_T1 - FACE_T0)) * H,
    ];
  };
  const blob = (x, y, rx, ry, col, a = 1, rot = 0) => {
    const [u, v] = px(x, y), [u1] = px(x + rx, y), [, v1] = px(x, y - ry);
    c.globalAlpha = a; c.fillStyle = col; c.beginPath();
    c.ellipse(u, v, Math.max(0.5, Math.abs(u1 - u)), Math.max(0.5, Math.abs(v1 - v)), rot, 0, Math.PI * 2);
    c.fill(); c.globalAlpha = 1;
  };
  const line = (pts, col, w, a = 1) => {
    c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = w * 1.6; c.lineCap = c.lineJoin = 'round';
    c.beginPath(); pts.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo'](...px(x, y))); c.stroke(); c.globalAlpha = 1;
  };
  // Soft ambient shading: forehead shadow, orbital sockets, nose bridge, under lip
  const g = c.createLinearGradient(0, 0, 0, H * 0.18);
  g.addColorStop(0, 'rgba(60,30,18,.42)');
  g.addColorStop(1, 'rgba(60,30,18,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H * 0.18);

  for (const s of [-1, 1]) blob(s * 0.039, 0.026, 0.024, 0.014, F.shade, 0.28);
  blob(0, -0.017, 0.022, 0.009, F.shade, 0.42);
  blob(0, -0.058, 0.018, 0.007, F.shade, 0.36);

  // Stubble / Goatee / Beard / Trim
  if (F.goatee) {
    blob(0, -0.08, 0.02, 0.017, F.beard, 0.38);
    blob(0, -0.064, 0.01, 0.007, F.beard, 0.32);
    line([[-0.022, -0.034], [-0.007, -0.03], [0.007, -0.03], [0.022, -0.034]], F.beard, 4.5, 0.7);
  }
  if (F.beardTrim) {
    blob(0, -0.078, 0.028, 0.022, F.beard, 0.32);
    line([[-0.03, -0.035], [0, -0.03], [0.03, -0.035]], F.beard, 4, 0.65);
  }
  if (F.stubble) {
    blob(0, -0.076, 0.032, 0.026, F.beard, 0.14);
    blob(0, -0.035, 0.02, 0.005, F.beard, 0.22);
  }
  // Cheeks warmth & glow
  const cheekCol = F.blush ?? '#d9776a';
  for (const s of [-1, 1]) blob(s * 0.052, -0.018, 0.022, 0.013, cheekCol, F.female ? 0.24 : 0.14);
  blob(0, -0.008, 0.012, 0.008, cheekCol, 0.12);
  if (F.himalayanCheeks) {
    for (const s of [-1, 1]) blob(s * 0.054, -0.014, 0.026, 0.016, '#e05852', 0.28);
  }

  // Philtrum column indentations and Cupid's bow
  line([[0, -0.026], [-0.004, -0.038]], F.shade, 1.2, 0.35);
  line([[0, -0.026], [0.004, -0.038]], F.shade, 1.2, 0.35);

  // Lips: vermilion border, upper lip, fuller lower lip
  blob(0, -0.043, 0.022, 0.0055, F.lip);
  blob(0, -0.051, 0.018, 0.0065, F.lipLo);
  line([[-0.022, -0.045], [-0.007, -0.047], [0, -0.046], [0.007, -0.047], [0.022, -0.045]], '#482018', 1.8, 0.95);
  blob(0, -0.052, 0.009, 0.0025, '#ffffff', 0.18);

  // Nostrils & personal ornaments
  for (const s of [-1, 1]) blob(s * 0.009, -0.021, 0.005, 0.0035, '#3e1e12', 0.85);
  if (F.noseStud) {
    blob(-0.013, -0.018, 0.0036, 0.0036, '#9ba2a8', 0.8);
    blob(-0.013, -0.018, 0.0024, 0.0024, '#ffffff', 0.98);
  }
  if (F.beautyMark) blob(0.042, -0.038, 0.0024, 0.0024, '#21150f', 0.88);

  // Seasoned farmer character lines & subtle crows-feet
  if (F.wrinkles) {
    for (const s of [-1, 1]) {
      line([[s * 0.054, 0.028], [s * 0.066, 0.033]], F.shade, 1.1, 0.38);
      line([[s * 0.056, 0.022], [s * 0.068, 0.021]], F.shade, 1.1, 0.32);
      line([[s * 0.024, -0.024], [s * 0.036, -0.046]], F.shade, 1.2, 0.28);
    }
    line([[-0.028, 0.064], [0.028, 0.064]], F.shade, 1.1, 0.25);
  }

  // Almond eyes: detailed anatomical structure with sclera shading, limbal ring, and triple catch-lights
  for (const s of [-1, 1]) {
    const ex = s * 0.039, ey = 0.026;
    blob(ex, ey, 0.0205, 0.0098, '#f7f3ec');
    blob(ex + s * -0.014, ey, 0.006, 0.007, '#e4d3c5', 0.45);
    blob(ex + s * 0.014, ey, 0.006, 0.007, '#e4d3c5', 0.45);
    // Inner lacrimal caruncle
    blob(ex - s * 0.019, ey - 0.001, 0.0042, 0.0035, '#d47b74', 0.65);

    const irisX = ex + s * -0.002, irisY = ey - 0.0005;
    blob(irisX, irisY, 0.0094, 0.0094, F.lid, 0.85); // limbal ring
    blob(irisX, irisY, 0.0086, 0.0086, F.iris); // rich iris
    blob(irisX, irisY, 0.0058, 0.0058, '#4a2816', 0.4);
    blob(irisX, irisY, 0.0042, 0.0042, '#070504'); // pupil

    // Triple corneal catch-lights (primary specular, bounce, and rim gleam)
    blob(irisX + 0.0032, irisY + 0.0035, 0.0022, 0.0022, '#ffffff', 0.95);
    blob(irisX - 0.0024, irisY - 0.0022, 0.0014, 0.0014, '#ffffff', 0.4);
    blob(irisX + 0.001, irisY - 0.0035, 0.001, 0.001, '#ffffff', 0.25);

    // Eyelid contours & supratarsal crease
    line([[ex - s * 0.022, ey - 0.0015], [ex - s * 0.01, ey + 0.01], [ex + s * 0.01, ey + 0.0095], [ex + s * 0.022, ey + 0.0015]], F.lid, F.female ? 4.2 : 3.6);
    line([[ex - s * 0.02, ey + 0.014], [ex, ey + 0.017], [ex + s * 0.018, ey + 0.013]], F.shade, 1.2, 0.45); // supratarsal fold
    if (F.female) line([[ex + s * 0.02, ey + 0.002], [ex + s * 0.026, ey + 0.007]], F.lid, 2.4);
    line([[ex - s * 0.015, ey - 0.0065], [ex + s * 0.015, ey - 0.0055]], F.shade, 1.2, 0.55);

    const browPts = F.female
      ? [[s * 0.016, 0.046], [s * 0.036, 0.053], [s * 0.058, 0.047]]
      : [[s * 0.014, 0.045], [s * 0.035, 0.050], [s * 0.061, 0.045]];
    line(browPts, F.brow, (F.browW ?? 8) * 0.95);
  }
}, [1, 1]);
// a polo shirt's woven chest stripes: a lattice band under the collar, then a gold line and a dark one
export const poloTex = (base, gold, dark, lattice) => canvasTex(`polo${base}${gold}`, 128, 256, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  const y0 = h * 0.13, y1 = h * 0.21;
  c.strokeStyle = lattice; c.lineWidth = 1.4;
  for (let x = -h; x < w + h; x += 8) { c.beginPath(); c.moveTo(x, y0); c.lineTo(x + (y1 - y0), y1); c.moveTo(x, y1); c.lineTo(x + (y1 - y0), y0); c.stroke(); }
  c.fillStyle = gold; c.fillRect(0, y0 - 2, w, 3); c.fillRect(0, y1 - 1, w, 3);
  c.fillStyle = dark; for (let x = 0; x < w; x += 4) c.fillRect(x, h * 0.27, 2, 1.5);
  c.fillStyle = gold; c.fillRect(0, h * 0.4, w, 3.5);
  c.fillStyle = dark; c.fillRect(0, h * 0.4 + 4, w, 1); c.fillRect(0, h * 0.52, w, 2.5);
  c.fillStyle = gold; c.fillRect(0, h * 0.52 + 3, w, 1);
}, [2, 1]);

// a sari's pallu: the body colour with a broad border down both long edges
const palluTex = (base, border, gold) => canvasTex(`pallu${base}${border}${gold}`, 64, 64, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (const x of [0, w - 9]) { c.fillStyle = border; c.fillRect(x, 0, 9, h); }
  c.fillStyle = gold; c.fillRect(10, 0, 2, h); c.fillRect(w - 12, 0, 2, h);
  c.fillStyle = 'rgba(255,255,255,.18)'; for (let y = 4; y < h; y += 8) for (let x = 16; x < w - 16; x += 8) c.fillRect(x + ((y / 8) % 2) * 4, y, 2, 2);
}, [1, 3]);
// A strip of cloth between two edge curves (each a few points), smooth and two-sided: a pallu over the shoulder.
function ribbon(edgeA, edgeB, n = 28) {
  const ca = new THREE.CatmullRomCurve3(edgeA.map((p) => new THREE.Vector3(...p))), cb = new THREE.CatmullRomCurve3(edgeB.map((p) => new THREE.Vector3(...p)));
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = ca.getPoint(t), b = cb.getPoint(t);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(0, t, 1, t);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}

// Hair as it grows: a crown over the top, then the back and sides down to the nape, open at the front so the
// hairline sits on the forehead and never over the eyes or face.
function hair(head, color, r = 0.123, nape = 0.68) {
  const m = mat(color, { rough: 0.75, sheen: 0.35, sheenRough: 0.6 });
  mesh(geo.sphere(r, 22, 8, 0, Math.PI * 2, 0, Math.PI * 0.3), m, head, [0, 0.008, -0.006], [0, 0, 0], [0.97, 1.06, 1]);
  mesh(geo.sphere(r, 22, 10, Math.PI / 2 + 1.1, Math.PI * 2 - 2.2, Math.PI * 0.29, Math.PI * (nape - 0.29)), m, head, [0, 0.008, -0.006], [0, 0, 0], [0.97, 1.06, 1]);
}

// ---- the figure ----
export function buildFarmer(look) {
  const b = look.build ?? 1;
  const root = new THREE.Group();
  const body = group(root);
  // `build` now shapes the frame horizontally as well as scaling stature, so the
  // roster has subtle height/build differences instead of twelve scaled copies.
  const frame = 1 + (b - 1) * 1.15;
  body.scale.set(b * frame, b, b * frame);
  const skin = mat(look.skin, { rough: 0.6, sheen: 0.3, sheenRough: 0.55, sheenColor: '#ffe2cf' });
  const female = isFemale(look);
  const hips = group(body, [0, HIP_Y, 0]);
  const torso = group(hips, [0, 0.02, 0]);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const stoop = ageStoop(look.age ?? (look.beard ? 58 : look.hair === '#efece6' ? 72 : 34));
  const P = { root, body, hips, torso, look, reducedMotion, ageStoop: stoop, pockets: hasPockets(look), seed: ((look.skin ? look.skin.charCodeAt(1) : 3) + (look.hair ? look.hair.charCodeAt(1) : 7)) % 100 };
  const lower = look.lower;
  const skirted = lower === 'ghagra' || lower === 'kira' || lower === 'longyi' || lower === 'sari';
  const kneeSkirt = lower === 'lungi' || lower === 'dhoti';
  const longTop = look.top === 'kurta' || look.top === 'kameez';
  const coversWaist = longTop || look.top === 'fotua'; // a top whose hem hangs over the waistband

  // legs: cloth for trousers (wide for the shalwar), skin under a skirt
  const legM = lower === 'pyjama' || lower === 'shalwar' || lower === 'cargo' ? cloth(look.lowA, { rough: 0.95 }) : skin;
  const wide = lower === 'shalwar' ? 1.5 : lower === 'pyjama' ? 1.2 : lower === 'cargo' ? 1.15 : 1;
  const legs = [];
  for (const side of [-1, 1]) {
    const thigh = group(hips, [side * (0.092 + (LT - 1) * 0.03), 0, 0]); // hip-width apart, wider only for thicker legs
    let hipCap;
    if (!skirted) {
      hipCap = mesh(geo.sphere(0.078 * wide * LT, 18, 12), legM, thigh, [0, 0, 0]);
      thigh.hipCap = hipCap;
    }
    if (!skirted) mesh(limb(0.076 * wide * LT, 0.056 * wide * LT, TH, 1.04), legM, thigh); // a long skirt hides the thigh
    const knee = group(thigh, [0, -TH, 0]);
    let kneeCap;
    if (!skirted) {
      kneeCap = mesh(geo.sphere(0.060 * wide * LT, 14, 10), legM, knee, [0, 0, 0], [0, 0, 0], [1, 1.0, 1.04]);
      knee.kneeCap = kneeCap;
    }
    if (!skirted) mesh(limb(0.058 * wide * LT, (lower === 'shalwar' ? 0.048 : wide > 1 ? 0.046 * wide : 0.036) * LT, SH, wide > 1 ? 1.02 : 1.12), legM, knee);
    if (lower === 'shalwar') mesh(geo.cyl(0.05 * LT, 0.05 * LT, 0.05), mat(look.lowB), knee, [0, -(SH - 0.02), 0]); // gathered cuff
    if (lower === 'cargo') {
      // flapped pockets on the outside of each thigh, and a hem at the ankle
      mesh(geo.box(0.012, 0.13 * TR, 0.075 * LT), mat(look.lowA), thigh, [side * (0.071 * wide * LT - 0.012), -0.29 * TR, 0.005], [0, 0, side * 0.08]); // flat on the side of the thigh
      mesh(geo.box(0.014, 0.03, 0.08 * LT), mat(look.lowB), thigh, [side * (0.074 * wide * LT - 0.012), -0.225 * TR, 0.005], [0, 0, side * 0.08]);
      mesh(geo.cyl(0.06 * LT, 0.06 * LT, 0.03), mat(look.lowB), knee, [0, -(SH - 0.02), 0]);
    }
    mesh(geo.sphere(0.032 * wide * LT, 12, 8), legM, knee, [0, -(SH - 0.015), 0], [0, 0, 0], [0.88, 1.1, 0.9]);
    const foot = group(knee, [0, -SHIN_POS, 0.03]);
    foot.scale.setScalar(STYLE.foot);
    const fm = mat(look.feetA);
    const shoeG = capsule(0.05, 0.12);
    if (look.feet === 'jutti') {
      mesh(shoeG, fm, foot, [0, 0.0, 0.03], [Math.PI / 2, 0, 0], [1, 1, 0.72]);
      mesh(geo.cyl(0.0, 0.045, 0.1, 6), fm, foot, [0, 0.01, 0.17], [Math.PI / 2, 0, 0]);
      mesh(geo.box(0.08, 0.012, 0.12), mat('#d9a83a', { metal: 0.5, rough: 0.4 }), foot, [0, 0.038, 0.07]);
    } else if (look.feet === 'shoe') {
      mesh(shoeG, fm, foot, [0, 0.0, 0.03], [Math.PI / 2, 0, 0], [1, 1, 0.75]);
    } else if (look.feet === 'sneaker') {
      mesh(shoeG, fm, foot, [0, 0.008, 0.03], [Math.PI / 2, 0, 0], [1, 1, 0.75]);
      mesh(geo.cyl(0.056, 0.056, 0.03, 16), mat('#f4f2ec'), foot, [0, -0.03, 0.035], [0, 0, 0], [1, 1, 2.25]);
      for (const s of [-1, 1]) mesh(geo.box(0.004, 0.025, 0.1), mat(look.feetB ?? '#7b4a2e'), foot, [s * 0.051, 0.01, 0.03], [0, 0, 0]);
    } else {
      mesh(capsule(0.042, 0.11), skin, foot, [0, 0.0, 0.035], [Math.PI / 2, 0, 0], [1, 1, 0.62]); // the bare foot
      mesh(geo.sphere(0.031, 14, 10), skin, foot, [0, -0.002, 0.12], [0, 0, 0], [1.12, 0.72, 1.25]); // rounded toe line
      mesh(geo.cyl(0.05, 0.05, 0.018, 16), fm, foot, [0, -0.03, 0.035], [0, 0, 0], [1.05, 1, 2.3]); // the sandal's sole
      mesh(geo.torus(0.04, 0.007, 5, 12, Math.PI), fm, foot, [0, -0.02, 0.07], [0, 0, 0], [1.1, 0.9, 1]); // and its strap
    }
    legs.push({ thigh, knee, foot });
  }
  P.legs = legs;
  // A rounded pelvic bridge joins the waist to both upper legs. The waistband and
  // skirts sit over it, while trousers inherit the same fabric as their thighs.
  // Upper pelvic bridge directly on thigh rotation axis (y = 0, z = 0) eliminates groin tearing (F14)
  const upperPelvis = mesh(geo.sphere(0.115, 20, 14), legM, hips, [0, 0, 0], [0, 0, 0], [1.16 + (LT - 1) * 0.8, 0.75, 0.68 + (LT - 1) * 0.5]);
  hips.upperPelvis = upperPelvis;
  mesh(geo.sphere(0.12, 20, 14), legM, hips, [0, -0.105, 0], [0, 0, 0], [1.2 + (LT - 1) * 0.9, 0.7, 0.66 + (LT - 1) * 0.55]); // inside the line of hips and thighs, no deeper than a thigh: no ring, no pouch
  if (lower === 'cargo') mesh(geo.cyl(0.162 * (0.86 + (LT - 1) * 0.4), 0.16 * (0.86 + (LT - 1) * 0.4), 0.16, 16), mat(look.lowA, { rough: 0.95 }), hips, [0, -0.05, 0], [0, 0, 0], [1, 1, 0.85]);
  P.skirt = skirted ? 0.45 : longTop || kneeSkirt ? 0.75 : 1;
  // the front pockets the hands go into when standing (trousers under a short top; a kurta's hem covers them)
  if ((lower === 'pyjama' || lower === 'shalwar' || lower === 'cargo') && !longTop) {
    const pk = mat('#' + new THREE.Color(look.lowA).multiplyScalar(0.55).getHexString(), { rough: 1 });
    for (const sd of [-1, 1]) mesh(geo.box(0.07, 0.011, 0.012), pk, hips, [sd * POCKET.at[0], POCKET.at[1] - 0.005, POCKET.at[2] + 0.012], [0.35, 0, sd * 0.95]);
  }
  const legShorter = HIP_Y / 0.92; // skirts and long hems were cut for the 0.92 m legs of the realistic body

  // skirts and the hems of long shirts, grouped for organic cloth inertia and sway
  const skirtGroup = group(hips, [0, 0, 0]);
  skirtGroup.scale.set(1.05, legShorter, 1.05);
  P.skirtGroup = skirtGroup;
  if (lower === 'ghagra') {
    mesh(geo.cyl(0.175, 0.32, 0.86, 18), cloth('#fff', { map: bandTex(look.lowA, look.bands, false) }), skirtGroup, [0, -0.42, 0]);
  } else if (lower === 'kira') {
    mesh(geo.cyl(0.185, 0.265, 0.88, 18), cloth('#fff', { map: bandTex(look.lowA, look.bands, true) }), skirtGroup, [0, -0.42, 0]);
  } else if (lower === 'lungi') {
    // folded up to the knee for field work, with the tuck at the waist
    mesh(geo.cyl(0.175, 0.255, 0.52, 20), cloth('#fff', { map: check(look.lowA, look.lowB) }), skirtGroup, [0, -0.25, 0], [0, 0, 0], [1.02, 1, 0.94]);
    if (!coversWaist) {
      mesh(geo.cyl(0.175, 0.175, 0.07, 16), cloth(look.lowA), hips, [0, 0.0, 0]);
      mesh(geo.sphere(0.045, 10, 8), cloth(look.lowA), hips, [0.03, -0.02, 0.165], [0, 0, 0], [1.1, 1, 0.6]);
    }
  } else if (lower === 'dhoti') {
    mesh(geo.cyl(0.175, 0.26, 0.6, 16), cloth(look.lowA), skirtGroup, [0, -0.29, 0]);
    mesh(geo.box(0.07, coversWaist ? 0.46 : 0.56, 0.03), cloth(look.lowB), skirtGroup, [0, coversWaist ? -0.34 : -0.28, 0.2], [0.1, 0, 0]); // the front pleats
  } else if (lower === 'sari') {
    mesh(geo.cyl(0.175, 0.285, 0.9, 18), cloth('#fff', { map: bandTex(look.lowA, [look.lowB, look.gold ?? '#e2b84a'], false) }), skirtGroup, [0, -0.43, 0]);
    // the front pleats, lying on the skirt's flare
    const pl = cloth(look.lowA, { rough: 0.7 });
    for (let k = -2; k <= 1; k++) mesh(geo.box(0.032, 0.8, 0.012), pl, skirtGroup, [k * 0.03 + 0.015, -0.45, 0.226 + (k % 2) * 0.004], [-0.11, 0, 0]);
    mesh(geo.box(0.14, 0.018, 0.012), cloth('#fff', { map: bandTex(look.lowA, [look.lowB, look.gold ?? '#e2b84a'], false) }), skirtGroup, [0, -0.84, 0.266], [-0.11, 0, 0]);
  } else if (lower === 'longyi') {
    mesh(geo.cyl(0.18, 0.255, 0.86, 16), cloth('#fff', { map: check(look.lowA, look.lowB, 8, [4, 3]) }), skirtGroup, [0, -0.42, 0]);
    mesh(geo.sphere(0.05, 10, 8), cloth(look.lowA), skirtGroup, [0.0, -0.02, 0.18], [0, 0, 0], [1, 1.2, 0.8]); // the paso knot
  }
  const topM = look.top === 'polo' ? cloth('#fff', { map: poloTex(look.topA, look.topB, look.topC, look.topD) }) : look.top === 'sweater' ? cloth('#fff', { map: canvasTex(`knit${look.topA}`, 32, 32, (c, w, h) => { c.fillStyle = look.topA; c.fillRect(0, 0, w, h); c.strokeStyle = look.topB; c.lineWidth = 2; for (let x = 0; x < w; x += 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } }, [6, 3]) }) : look.top === 'shirt' ? cloth('#fff', { map: check(look.topA, look.topB, 10, [3, 2]) }) : cloth(look.topA);
  if (longTop) {
    const topWide = wide > 1.2 ? 1.15 : 1.08;
    mesh(geo.cyl(0.195, 0.295, 0.52 * legShorter, 28, true), topM, skirtGroup, [0, -0.24 * legShorter, 0], [0, 0, 0], [topWide, 1, 0.96]);
  }

  // upper body
  // The chest has a little more depth than the old flattened mannequin profile.
  // Keep this in sync with frontOf(), which positions buttons and trim on the cloth.
  mesh(torsoShape(female), topM, torso, [0, 0, 0], [0, 0, 0], [STYLE.torsoWide, 1, 0.88]);
  const fz = frontOf(female);
  const plainTop = look.top === 'polo' ? cloth(look.topA) : topM;
  if (look.top === 'kurta' || look.top === 'kameez' || look.top === 'eingyi') {
    mesh(geo.box(0.02, 0.16, 0.01), mat(look.topB, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), torso, [0, 0.45, fz(0.45) + 0.010]);
    for (let k = 0; k < 3; k++) mesh(geo.sphere(0.009, 6, 4), mat('#cfc6b4', { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), torso, [0.012, 0.5 - k * 0.045, fz(0.5 - k * 0.045, 0.012) + 0.014]);
  }
  if (look.top === 'fotua' || look.top === 'shirt') {
    if (look.top === 'fotua') mesh(geo.cyl(0.168, 0.205, 0.22, 24, true), topM, torso, [0, -0.1, 0], [0, 0, 0], [1, 1, 0.86]);
    mesh(geo.box(0.02, 0.16, 0.01), mat(look.topB, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), torso, [0, 0.45, fz(0.45) + 0.010]);
    if (look.top === 'shirt') for (const sd of [-1, 1]) mesh(geo.box(0.09, 0.03, 0.05), cloth(look.topA, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), torso, [sd * 0.05, 0.54, fz(0.54, 0.05) + 0.012], [0.4, 0, sd * 0.5]);
  }
  if (look.top === 'polo') {
    // worn loose over the trousers: the hem, a ribbed collar, a two-button placket and a small badge on the chest
    mesh(geo.cyl(0.175, 0.2, 0.2, 14), plainTop, torso, [0, -0.06, 0], [0, 0, 0], [1, 1, 0.84]);
    mesh(geo.torus(0.078, 0.022, 8, 18), plainTop, torso, [0, 0.565, 0.005], [Math.PI / 2 + 0.15, 0, 0]);
    for (const sd of [-1, 1]) mesh(geo.box(0.055, 0.01, 0.05), plainTop, torso, [sd * 0.035, 0.545, fz(0.545, 0.035) + 0.012], [1.05, 0, sd * 0.55]);
    mesh(geo.box(0.036, 0.12, 0.008), mat(look.topA, { rough: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), torso, [0, 0.47, fz(0.47) + 0.010]);
    for (let k = 0; k < 2; k++) mesh(geo.sphere(0.008, 6, 4), mat('#f5efe6', { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), torso, [0, 0.505 - k * 0.05, fz(0.505 - k * 0.05) + 0.014]);
    mesh(geo.cyl(0.018, 0.018, 0.004, 12), mat('#f3efe8', { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), torso, [0.09, 0.38, fz(0.38, 0.09) + 0.009], [Math.PI / 2, 0, 0.45]);
  }
  if (look.sari) {
    // the pallu: from the right hip across the chest, over the left shoulder, and down the back
    const pm = mat('#fff', { map: palluTex(look.lowA, look.lowB, look.gold ?? '#e2b84a'), side: THREE.DoubleSide, rough: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mesh(ribbon(
      [[0.05, -0.02, fz(-0.02, 0.05) + 0.016], [-0.04, 0.2, fz(0.2, 0.04) + 0.016], [-0.15, 0.45, fz(0.45, 0.15) + 0.03], [-0.19, 0.59, 0.0], [-0.19, 0.42, -0.165], [-0.17, 0.0, -0.19], [-0.15, -0.42, -0.245]],
      [[0.15, 0.04, fz(0.04, 0.15) + 0.03], [0.09, 0.3, fz(0.3, 0.09) + 0.016], [-0.02, 0.53, fz(0.53, 0.02) + 0.02], [-0.05, 0.62, 0.0], [-0.02, 0.44, -0.17], [0.03, 0.0, -0.2], [0.06, -0.42, -0.25]],
    ), pm, torso);
  }
  if (look.chador) {
    const cm = mat(look.chador, { rough: 1 });
    mesh(geo.cyl(0.26, 0.29, 0.5, 16, true), mat(look.chador, { rough: 1, side: THREE.DoubleSide }), torso, [0, 0.3, 0], [0, 0, 0], [1, 1, 0.85]);
    mesh(geo.sphere(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), cm, torso, [0, 0.5, 0], [0, 0, 0], [1, 0.5, 0.85]);
  }
  if (look.muffler) {
    const mm = mat(look.muffler, { rough: 1 });
    mesh(geo.torus(0.088, 0.034, 8, 16), mm, torso, [0, 0.57, 0], [Math.PI / 2, 0, 0]);
    mesh(geo.box(0.07, 0.3, 0.03), mm, torso, [0.06, 0.38, fz(0.38, 0.06) + 0.018], [0.06, 0, -0.06]);
  }
  if (look.scarf) {
    const sm = mat('#fff', { map: check(look.scarf, '#f3eee4', 6) });
    mesh(geo.torus(0.085, 0.03, 8, 16), sm, torso, [0, 0.57, 0], [Math.PI / 2, 0, 0]);
    mesh(geo.box(0.06, 0.24, 0.02), sm, torso, [-0.06, 0.38, fz(0.38, 0.06) + 0.014], [0.08, 0, 0.08]);
  }
  if (look.top === 'choli') mesh(geo.cyl(0.152, 0.163, 0.1, 18), skin, torso, [0, 0.05, 0], [0, 0, 0], [1, 1, 0.78]); // bare midriff
  if (look.top === 'tego') {
    // the kira is worn up to the chest; the tego jacket crosses over it, with white wonju showing at the neck
    for (const s of [-1, 1]) mesh(geo.box(0.032, 0.17, 0.01), mat(look.topB, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), torso, [s * 0.04, 0.48, fz(0.48, 0.04) + 0.010], [0, 0, s * 0.45]);
    mesh(geo.box(0.04, 0.42, 0.01), mat(look.topB, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), torso, [0.05, 0.3, fz(0.3, 0.05) + 0.011], [0, 0, -0.18]);
    for (const s of [-1, 1]) mesh(geo.sphere(0.022, 8, 6), mat(look.silver, { metal: 0.8, rough: 0.25 }), torso, [s * 0.12, 0.47, fz(0.47, 0.12) + 0.01]);
  }
  if (look.ajrak) {
    const am = mat('#fff', { map: ajrakTex(), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mesh(geo.box(0.15, 0.6, 0.008), am, torso, [-0.1, 0.2, fz(0.3, 0.1) + 0.012], [0.06, 0, -0.06]);
    mesh(geo.box(0.15, 0.66, 0.008), am, torso, [-0.11, 0.18, -0.155], [-0.06, 0, -0.06]);
    mesh(geo.cyl(0.1, 0.1, 0.15, 16, true, 0, Math.PI), am, torso, [-0.12, 0.47, -0.005], [0, Math.PI / 2, Math.PI / 2], [1, 1, 0.62]); // the fold over the shoulder
  }

  // head and neck articulation (Feature F05: Neck Seam Elimination, AO Joint & Ball Collar)
  const neck = group(torso, [0, 0.55, 0]);
  // 1. Tapered collar fillet blending the neck base into the torso opening
  mesh(geo.cyl(0.068, 0.105, 0.048, 18), skin, neck, [0, 0.008, -0.006], [0, 0, 0], [1.12, 1, 0.88]);
  // 2. Extended neck cylinder providing continuous cervical column
  mesh(geo.cyl(0.054, 0.078, 0.16, 18), skin, neck, [0, 0.065, -0.01]);
  // 3. Spherical collar ball-joint enclosing the cervical-cranial junction (ball-and-socket seal)
  mesh(geo.sphere(0.068, 16, 12), skin, neck, [0, 0.128, -0.015], [0, 0, 0], [0.95, 0.9, 1.0]);

  // Atlanto-occipital cranial articulation pivot
  const aoY = STYLE.aoY ?? 0.125, aoZ = STYLE.aoZ ?? -0.020;
  const headJoint = group(neck, [0, aoY, aoZ]); headJoint.scale.setScalar(STYLE.head);
  P.neck = neck; P.head = headJoint;
  // Cranial assembly offset from AO joint pivot to skull centroid
  const head = group(headJoint, [0, (STYLE.neckY - aoY) / STYLE.head, -aoZ / STYLE.head]);
  P.cranial = head;
  mesh(geo.sphere(0.118, 18, 14), skin, head, [0, 0, 0], [0, 0, 0], [0.95, 1.08, 1]);
  mesh(geo.sphere(0.02, 6, 4), skin, head, [-0.115, 0, 0]); mesh(geo.sphere(0.02, 6, 4), skin, head, [0.115, 0, 0]);
  // Feature F03: Continuous anatomical nose connecting nasion, dorsal bridge, lobule tip, and alar wings
  mesh(
    noseGeometry(),
    skin,
    head,
    [0, -0.002, 0.113],
    [0.14, 0, 0],
    female ? [0.78, 0.94, 0.90] : [0.85, 1.0, 0.95]
  );
  mesh(geo.sphere(0.086, 16, 10), skin, head, [0, -0.052, 0.02], [0, 0, 0], [female ? 0.92 : 1.02, 0.72, 0.95]);
  const faceKey = faceFor(look);
  const F = FACES[faceKey] || {};
  {
    const ft = faceTex(faceKey); ft.wrapS = ft.wrapT = THREE.ClampToEdgeWrapping;
    const fm = new THREE.MeshStandardMaterial({ map: ft, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
    const f = mesh(new THREE.SphereGeometry(FACE_R, 32, 24, Math.PI / 2 - FACE_P, FACE_P * 2, FACE_T0, FACE_T1 - FACE_T0), fm, head, [0, 0, 0], [0, 0, 0], [0.95, 1.08, 1]);
    f.castShadow = false;
  }
  // 3D dynamic eyelids for biological real-time blinking
  const eyelids = [];
  const lidM = mat(look.skin, { rough: 0.72, sheen: 0.25 });
  const lashM = mat('#1a120c', { rough: 0.85 });
  for (const s of [-1, 1]) {
    const eyePivot = group(head, [s * 0.039, 0.026, 0.1102]);
    const lid = group(eyePivot, [0, 0.009, 0]);
    mesh(geo.sphere(0.0125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), lidM, lid, [0, 0, 0], [0.2, 0, 0], [1.12, 0.95, 0.45]);
    mesh(geo.torus(0.012, 0.0016, 4, 12, Math.PI * 0.85), lashM, lid, [0, -0.001, 0.003], [0, 0, s * -0.08]);
    lid.scale.set(1, 0.02, 1);
    eyelids.push(lid);
  }
  P.eyelids = eyelids;
  const eyeM = mat('#16100c', { rough: 0.3 });
  const brows = [];
  const browColor = look.beard ?? look.moustache ?? (look.head === 'gaungbaung' ? '#3a3330' : (look.hair || '#1a120c'));
  const browM = mat(browColor, { rough: 0.88 });
  // Feature F04: Curved conforming eyebrows
  for (const s of [-1, 1]) {
    const bg = browGeometry(s);
    const browPivot = group(head, [s * bg.userData.yMid, 0.052, bg.userData.xMid + 0.010]);
    mesh(bg, browM, browPivot, [0, 0, 0], [0, 0, s * -0.10], female ? [0.88, 0.82, 0.88] : [1, 1, 1]);
    brows.push({ pivot: browPivot, side: s, baseRotZ: s * -0.10 });
  }
  P.brows = brows;
  // Feature F01: Dynamic anatomical oral cavity, lip vermilion arches, and interior dental arch
  const mouthPivot = group(head, [0, -0.0475, 0.1105]);
  const cavityM = mat('#160a08', { rough: 0.96, side: THREE.DoubleSide });
  const cavity = mesh(geo.sphere(0.011, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), cavityM, mouthPivot, [0, -0.001, -0.003], [-Math.PI / 2, 0, 0], [1.15, 0.15, 0.55]);
  const teethM = mat('#f7f3ec', { rough: 0.3, metal: 0.04 });
  const teeth = mesh(geo.box(0.014, 0.0032, 0.0028), teethM, mouthPivot, [0, 0.0014, -0.0024]);
  const lipM = mat(F.lip ?? '#9e5a4c', { rough: 0.68, sheen: 0.35 });
  const lipLoM = mat(F.lipLo ?? F.lip ?? '#b06558', { rough: 0.65, sheen: 0.38 });
  const upperLip = group(mouthPivot, [0, 0.0014, 0.0006]);
  mesh(geo.sphere(0.0125, 12, 6), lipM, upperLip, [0, 0, 0], [0, 0, 0], [1.3, 0.20, 0.22]);
  const lowerLip = group(mouthPivot, [0, -0.0018, 0.0006]);
  mesh(geo.sphere(0.0118, 12, 6), lipLoM, lowerLip, [0, 0, 0], [0, 0, 0], [1.18, 0.26, 0.24]);
  mouthPivot.cavity = cavity;
  mouthPivot.teeth = teeth;
  mouthPivot.upperLip = upperLip;
  mouthPivot.lowerLip = lowerLip;
  P.mouth = mouthPivot;
  if (look.beard) {
    // a full beard that follows the jaw from the cheeks round the chin, and a moustache curving over the lip
    const bm = mat(look.beard, { rough: 1, sheen: 0.4, sheenRough: 0.9, side: THREE.DoubleSide });
    mesh(new THREE.SphereGeometry(0.1, 28, 14, 0, Math.PI * 2, Math.PI * 0.44, Math.PI * 0.52), bm, head, [0, -0.012, 0.01], [0, 0, 0], [0.97, 1.14, 1.02]);
    mesh(new THREE.ConeGeometry(0.042, 0.06, 16, 1, true), bm, head, [0, -0.118, 0.052], [Math.PI + 0.45, 0, 0], [1.25, 1, 0.7]); // the chin's beard tapers to a soft point, close to the jaw
    mesh(geo.torus(0.026, 0.009, 6, 14, Math.PI), bm, head, [0, -0.04, 0.113], [0, 0, Math.PI]);
  }
  // Feature F04: Curved conforming moustache
  if (look.moustache) mesh(moustacheGeometry(), mat(look.moustache), head, [0, -0.034, 0.1165]);
  if (look.silver) mesh(geo.sphere(0.006, 6, 4), mat(look.silver, { rough: 0.2, metal: 0.8 }), head, [0.017, -0.02, 0.127]);

  // headwear
  const hA = look.headA, hB = look.headB;
  if (look.head === 'turban') {
    const tm = mat('#fff', { map: turbanTex(hA, hB) });
    mesh(geo.sphere(0.138, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), tm, head, [0, 0.072, -0.010], [0, 0, 0], [1.08, 0.85, 1.12]);
    for (let k = 0; k < 3; k++) mesh(geo.torus(0.128 - k * 0.009, 0.023, 8, 20), tm, head, [0, 0.052 + k * 0.034, 0.006], [Math.PI / 2 - 0.35 + k * 0.08, 0, 0], [1.03, 1, 1.05]);
    mesh(geo.box(0.05, 0.08, 0.03), tm, head, [0, 0.12, 0.12], [0.5, 0, 0]);
  } else if (look.head === 'sindhi') {
    // Feature F10: Tighter hair profile under Sindhi topi to keep apex within y < 0.136m
    hair(head, look.hair, 0.120, 0.64);
    // Feature F10: Align arched cutout over forehead (+Z axis, centered at theta = PI/2)
    mesh(geo.cyl(0.128, 0.126, 0.105, 24, false, Math.PI * 0.68, Math.PI * 1.64), mat('#fff', { map: topiTex(hA, hB), side: THREE.DoubleSide }), head, [0, 0.088, 0]);
    // Feature F10: Raise top disc to y = 0.142m (above hair crown apex 0.1352m)
    mesh(geo.cyl(0.128, 0.128, 0.012, 24), mat(hA), head, [0, 0.142, 0]);
  } else if (look.head === 'orhni') {
    // Feature F10: Hair bun positioned at z = -0.09m, radius 0.052m (back at z = -0.134m < veil -0.163m)
    mesh(geo.sphere(0.052, 10, 8), mat(look.hair), head, [0, -0.02, -0.09], [0, 0, 0], [1, 0.9, 0.85]);
    const om = mat('#fff', { map: bandTex(hA, [hB, '#f3efe6'], false), side: THREE.DoubleSide });
    // Feature F10 & F11: Extend veil sphere backward and downward to theta = 0.70*PI (reaches y_torso = +0.62m)
    mesh(new THREE.SphereGeometry(0.144, 24, 14, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.70), om, head, [0, 0.005, -0.010], [0, 0, 0], [1.0, 1.02, 1.06]);
    // Feature F11: Raise & expand torso back drape box to [0, 0.35, -0.165], height 0.68m (reaches y_torso = +0.69m, overlapping veil by 7cm)
    mesh(geo.box(0.22, 0.68, 0.016), om, torso, [0, 0.35, -0.165], [-0.04, 0, 0]);
    // Feature F11: Reposition front chest drape to x = 0.07m to prevent arm penetration during arm swing
    mesh(geo.box(0.11, 0.36, 0.014), om, torso, [0.07, 0.35, 0.162], [0.08, 0, 0.22]);
  } else if (look.head === 'short') {
    hair(head, look.hair, 0.127, 0.74); // a bob, down past the ears at the back
  } else if (look.head === 'gamcha') {
    // Feature F10: Tighter hair profile under gamcha wrap
    hair(head, look.hair, 0.120, 0.65);
    const gm = mat('#fff', { map: check(hA, hB, 6) });
    // Feature F10: Major radius 0.122m, tube 0.034m (inner radius 0.0898m clears hair crown)
    mesh(geo.torus(0.122, 0.034, 8, 20), gm, head, [0, 0.068, -0.004], [Math.PI / 2 - 0.12, 0, 0], [1.02, 1.0, 1.06]);
    mesh(geo.sphere(0.06, 10, 8), gm, head, [0.02, 0.1, -0.11]);
  } else if (look.head === 'tupi') {
    // Feature F10: Crop hair slightly so cap fits without Z-fighting
    hair(head, look.hair, 0.120, 0.62);
    // Feature F10: Expand dome to 0.130m down to theta = 0.36*PI
    mesh(geo.sphere(0.130, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.36), mat(hA), head, [0, 0.032, -0.003], [0, 0, 0], [0.98, 1.02, 1.01]);
    // Feature F10: Cylindrical headband bridging rim down to y = 0.075m, sealing hair border
    mesh(geo.cyl(0.124, 0.126, 0.022, 22, true), mat(hA), head, [0, 0.086, -0.003]);
  } else if (look.head === 'mathal') {
    // the mathal: a broad conical hat of palm leaf, the Bangladeshi farmer's sunshade
    hair(head, look.hair);
    const mm = mat('#fff', { map: canvasTex('mathal', 64, 64, (c, w, h) => { c.fillStyle = '#d8b56a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8833e'; c.lineWidth = 1.5; for (let k = 0; k < w; k += 5) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, h); c.stroke(); } for (let k = 0; k < h; k += 12) { c.beginPath(); c.moveTo(0, k); c.lineTo(w, k); c.stroke(); } }, [6, 1]) });
    mesh(geo.cyl(0.0, 0.34, 0.16, 18), mm, head, [0, 0.14, 0]);
    mesh(geo.cyl(0.34, 0.34, 0.012, 18), mat('#a8833e'), head, [0, 0.06, 0]);
  } else if (look.head === 'monkeycap') {
    // the knitted monkey cap of a northern cold wave, open only at the face
    const km = mat(hA, { rough: 1 });
    mesh(new THREE.SphereGeometry(0.135, 18, 12, Math.PI * 0.7, Math.PI * 1.6, 0, Math.PI * 0.82), mat(hA, { rough: 1, side: THREE.DoubleSide }), head, [0, 0.005, -0.004]);
    mesh(geo.sphere(0.03, 8, 6), mat(hB), head, [0, 0.14, -0.01]);
    mesh(geo.cyl(0.08, 0.1, 0.1, 14), km, head, [0, -0.13, -0.01]);
  } else if (look.head === 'aanchal') {
    mesh(geo.sphere(0.052, 10, 8), mat(look.hair), head, [0, -0.02, -0.09], [0, 0, 0], [1, 0.9, 0.85]);
    mesh(new THREE.SphereGeometry(0.142, 22, 12, Math.PI * 0.725, Math.PI * 1.55, 0, Math.PI * 0.62), mat('#fff', { map: bandTex(hA, [hB], false), side: THREE.DoubleSide }), head, [0, 0.0, -0.004]);
  } else if (look.head === 'hijab') {
    // a hijab wraps the head and neck, open at the face, and falls over the shoulders
    const hm = mat(hA, { side: THREE.DoubleSide, rough: 0.9 });
    mesh(new THREE.SphereGeometry(0.142, 24, 16, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.9), hm, head, [0, 0.005, -0.006]);
    // Feature F10 & F11: Forward-projected face torus framing facial ellipse cleanly (z = 0.082m, tilt = 0.24 rad)
    mesh(geo.torus(0.116, 0.014, 8, 24, Math.PI * 1.15), mat(look.headB ?? '#' + new THREE.Color(hA).multiplyScalar(0.72).getHexString()), head, [0, -0.008, 0.082], [0.24, 0, Math.PI * 0.925], [0.94, 1.12, 1.0]);
    // Feature F11: Consolidate cape lathe under head hierarchy in head coordinate space (y in [-0.04, -0.18])
    const cape = new THREE.LatheGeometry([[0.115, -0.04], [0.132, -0.07], [0.155, -0.11], [0.185, -0.15], [0.205, -0.18]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
    mesh(cape, hm, head, [0, 0, -0.005], [0.06, 0, 0], [1, 1, 0.88]);
    // Feature F11: Consolidate cape hem trim torus under head hierarchy
    mesh(geo.torus(0.205, 0.007, 6, 32), mat('#' + new THREE.Color(hA).multiplyScalar(0.72).getHexString()), head, [0, -0.18, 0.005], [Math.PI / 2 + 0.06, 0, 0], [1, 0.88, 1]);
  } else if (look.head === 'cap') {
    // a baseball cap, peak to the front, short hair showing at the sides and back
    // the hair is only round the back and above the ears, so it never covers the face
    hair(head, look.hair, 0.121, 0.64);
    const cm = mat(hA, { rough: 0.9 });
    mesh(geo.sphere(0.13, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), cm, head, [0, 0.062, -0.006], [-0.08, 0, 0], [0.92, 0.72, 1.0]);
    mesh(geo.cyl(0.125, 0.125, 0.012, 20, false, -Math.PI / 2, Math.PI), cm, head, [0, 0.068, 0.0], [0.06, 0, 0], [0.92, 1, 1.4]);
    mesh(geo.cyl(0.123, 0.123, 0.004, 20, false, -Math.PI / 2, Math.PI), mat(look.headC ?? '#6e3a24'), head, [0, 0.0605, 0.0], [0.06, 0, 0], [0.9, 1, 1.38]);
    mesh(geo.sphere(0.013, 8, 6), cm, head, [0, 0.157, -0.014]);
    const lm = mat(hB, { rough: 0.6 });
    for (const sd of [-1, 1]) mesh(geo.box(0.028, 0.008, 0.004), lm, head, [sd * 0.011, 0.112, 0.113], [-0.6, 0, sd * -0.35]);
  } else if (look.head === 'bare') {
    hair(head, look.hair);
  } else if (look.head === 'gaungbaung') {
    // Feature F10: Tighter hair profile under gaung baung to prevent lateral & posterior puncture
    hair(head, look.hair, 0.118, 0.55);
    const gm = mat(hA);
    mesh(geo.torus(0.120, 0.040, 8, 18), gm, head, [0, 0.07, 0], [Math.PI / 2 - 0.1, 0, 0]);
    // Feature F10: Enlarge dome radius (0.130m > 0.118m hair) with scale [1.02, 0.74, 1.05]
    mesh(geo.sphere(0.130, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), gm, head, [0, 0.078, -0.004], [0, 0, 0], [1.02, 0.74, 1.05]);
    mesh(geo.sphere(0.045, 8, 6), mat(hB), head, [-0.12, 0.1, 0.03]);
    mesh(geo.box(0.02, 0.09, 0.06), mat(hB), head, [-0.15, 0.12, 0.04], [0, 0, 0.5]);
  }
  if (look.silver && look.top === 'choli') {
    mesh(geo.torus(0.1, 0.012, 6, 18), mat(look.silver, { metal: 0.8, rough: 0.25 }), neck, [0, -0.04, 0.02], [Math.PI / 2 - 0.25, 0, 0]);
    mesh(geo.torus(0.12, 0.01, 6, 18), mat(look.silver, { metal: 0.8, rough: 0.25 }), neck, [0, -0.09, 0.03], [Math.PI / 2 - 0.35, 0, 0]);
  }

  // arms: full sleeves for kurta, kameez, tego and eingyi; short for the choli
  const arms = [];
  const sleeve = look.top === 'choli' || look.top === 'shirt' || look.top === 'polo' || look.top === 'fotua' ? 'short' : look.top === 'genji' ? 'none' : 'long';
  for (const side of [-1, 1]) {
    const shoulder = group(torso, [side * (female ? 0.19 : 0.205) * STYLE.shoulder, 0.465, 0]);
    const upperM = sleeve === 'none' ? skin : look.top === 'polo' ? cloth(look.topA) : topM;
    // Feature F09: Airtight spherical ball-and-socket deltoid joint centered at shoulder rotation pivot
    const deltoid = mesh(geo.sphere((sleeve === 'long' ? 0.069 : 0.064) * AT, 20, 14), upperM, shoulder, [0, 0, 0]);
    shoulder.deltoid = deltoid;
    if (sleeve === 'short') { mesh(limb(0.05 * AT, 0.04 * AT, 0.28), skin, shoulder); mesh(limb(0.06 * AT, 0.054 * AT, 0.13, 1), upperM, shoulder); }
    else mesh(limb((sleeve === 'long' ? 0.058 : 0.053) * AT, (sleeve === 'long' ? 0.048 : 0.04) * AT, 0.28), upperM, shoulder);
    const elbow = group(shoulder, [0, -0.28, 0]);
    const lowerM = sleeve === 'long' ? topM : skin;
    mesh(limb((sleeve === 'long' ? 0.048 : 0.041) * AT, (sleeve === 'long' ? 0.042 : 0.031) * AT, 0.25, 1.1), lowerM, elbow);
    // A small soft elbow volume keeps the bend closed when the arm swings or reaches.
    mesh(geo.sphere((sleeve === 'long' ? 0.045 : 0.038) * AT, 14, 10), lowerM, elbow, [0, 0.006, 0], [0, 0, 0], [1, 0.86, 0.95]);
    mesh(geo.sphere(0.032, 12, 8), skin, elbow, [0, -0.244, 0], [0, 0, 0], [0.9, 1, 0.92]); // wrist transition
    if (look.cuff) mesh(geo.cyl(0.052 * AT, 0.052 * AT, 0.07), mat(look.cuff), elbow, [0, -0.2, 0]);
    const hand = group(elbow, [0, -0.27, 0]);
    hand.scale.setScalar(STYLE.hand);
    // palm, four slightly curled fingers and a thumb
    mesh(geo.sphere(0.041, 16, 12), skin, hand, [0, -0.03, 0.004], [0, 0, 0], [0.58, 1, 0.9]);
    for (let f = 0; f < 4; f++) {
      const fingerLen = 0.052 - Math.abs(f - 1.5) * 0.007;
      const fingerX = (f - 1.5) * 0.006;
      const fingerZ = -0.023 + f * 0.015;
      mesh(capsule(0.009, fingerLen), skin, hand, [fingerX, -0.082 - fingerLen * 0.14 + Math.abs(f - 1.5) * 0.003, fingerZ], [0, 0, side * (0.12 + (f - 1.5) * 0.08)]);
      mesh(geo.sphere(0.009, 8, 6), skin, hand, [fingerX, -0.056, fingerZ], [0, 0, 0], [0.9, 1, 0.9]); // knuckle
    }
    mesh(capsule(0.0095, 0.032), skin, hand, [side * -0.012, -0.045, 0.034], [0.7, 0, side * 0.35]);
    if (look.bangle) for (let k = 0; k < 3; k++) mesh(geo.torus(0.04, 0.007, 6, 14), mat(look.bangle, { rough: 0.25, metal: 0.6 }), elbow, [0, -0.22 - k * 0.015, 0], [Math.PI / 2, 0, 0]);
    if (look.kara && side === 1) mesh(geo.torus(0.042, 0.009, 6, 16), mat('#c9ced3', { rough: 0.2, metal: 0.9 }), elbow, [0, -0.23, 0], [Math.PI / 2, 0, 0]);
    arms.push({ shoulder, elbow, hand });
  }
  P.arms = arms;

  // tools, shown when needed
  const tools = {};
  const handR = arms[1].hand, handL = arms[0].hand;
  tools.can = group(handR, [0, -0.06, 0.04]);
  if (look.lower === 'ghagra' || look.lower === 'kira' || look.lower === 'sari') {
    mesh(geo.sphere(0.13, 14, 10), mat('#b8643c'), tools.can, [0, -0.12, 0.05]);
    mesh(geo.cyl(0.05, 0.07, 0.07, 12), mat('#a65731'), tools.can, [0, 0.0, 0.05]);
  } else {
    const cm = mat('#9aa3a8', { rough: 0.35, metal: 0.6 });
    mesh(geo.cyl(0.08, 0.09, 0.2, 12), cm, tools.can, [0, -0.12, 0.06]);
    mesh(geo.cyl(0.012, 0.018, 0.26, 6), cm, tools.can, [0, -0.08, 0.2], [-1.1, 0, 0]);
    mesh(geo.cyl(0.024, 0.016, 0.04, 8), cm, tools.can, [0, -0.19, 0.32], [-1.1, 0, 0]); // sprinkler rose
    mesh(geo.torus(0.06, 0.01, 6, 12, Math.PI), cm, tools.can, [0, 0.0, 0.06], [0, Math.PI / 2, 0]);
  }
  tools.sickle = group(handR, [0, -0.04, 0.02]);
  mesh(geo.cyl(0.016, 0.016, 0.12, 6), mat('#6b4a2b'), tools.sickle, [0, 0.0, 0]);
  mesh(geo.cyl(0.018, 0.018, 0.02, 8), mat('#b45309', { metal: 0.85, rough: 0.25 }), tools.sickle, [0, -0.06, 0]); // brass ferrule
  mesh(geo.torus(0.1, 0.012, 4, 14, Math.PI * 1.15), mat('#e2e8f0', { rough: 0.18, metal: 0.95 }), tools.sickle, [0.0, -0.13, 0.08], [Math.PI / 2, 0, 0.4]);
  tools.spray = group(handR, [0, -0.04, 0.02]);
  mesh(geo.cyl(0.008, 0.008, 0.5, 5), mat('#d9d9d9'), tools.spray, [0, -0.05, 0.22], [-1.3, 0, 0]);
  mesh(geo.cyl(0.014, 0.014, 0.03, 6), mat('#d97706', { metal: 0.85, rough: 0.25 }), tools.spray, [0, -0.05, 0.48], [-1.3, 0, 0]); // brass nozzle tip
  tools.tank = group(torso, [0, 0.3, -0.2]);
  mesh(geo.box(0.26, 0.36, 0.13), mat('#e9c23a'), tools.tank, [0, 0, 0]);
  mesh(geo.box(0.025, 0.34, 0.24), mat('#1f2937'), tools.tank, [0.09, 0.02, 0.07]); // shoulder harness straps
  mesh(geo.box(0.025, 0.34, 0.24), mat('#1f2937'), tools.tank, [-0.09, 0.02, 0.07]);
  mesh(geo.cyl(0.009, 0.009, 0.24, 5), mat('#374151'), tools.tank, [0.15, 0.02, 0]); // pressure lever
  tools.phone = group(handL, [0.03, -0.05, 0.06]);
  mesh(geo.box(0.07, 0.13, 0.012), mat('#111'), tools.phone, [0, 0, 0], [-0.4, 0, 0]);
  mesh(geo.box(0.06, 0.115, 0.002), mat('#57c46a', { emissive: '#3aa857' }), tools.phone, [0, 0.0, 0.007], [-0.4, 0, 0]);
  tools.sack = group(torso, [0, 0.35, -0.22]);
  mesh(geo.sphere(0.2, 10, 8), mat('#d9c08a', { flat: true }), tools.sack, [0, 0, 0], [0, 0, 0], [1, 1.1, 0.7]);
  // village work: the short jharu (a bundle of coconut-leaf ribs tied at the grip), the kula (a woven winnowing
  // tray, held in both hands), and the picking basket on the left forearm
  tools.broom = group(handR, [0, -0.05, 0.02]);
  const rib = mat('#cdb27a', { rough: 0.9 }), tie = mat('#8a5a2b');
  mesh(geo.cyl(0.024, 0.02, 0.12, 8), tie, tools.broom, [0, 0, 0]);
  for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, r = 0.018 + (k % 3) * 0.008; mesh(geo.cyl(0.004, 0.003, 0.62, 4), rib, tools.broom, [Math.cos(a) * r, -0.34, Math.sin(a) * r], [Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09]); }
  tools.kula = group(handR, [-0.18, -0.07, 0.12]);
  const weave = mat('#c9a35e', { rough: 0.95, side: THREE.DoubleSide }), rim = mat('#8a6a35');
  mesh(geo.cyl(0.26, 0.22, 0.05, 20, true), weave, tools.kula, [0, 0, 0], [0, 0, 0], [1, 1, 0.82]);
  mesh(geo.cyl(0.22, 0.22, 0.008, 20), weave, tools.kula, [0, -0.022, 0], [0, 0, 0], [1, 1, 0.82]);
  mesh(geo.torus(0.26, 0.012, 5, 22), rim, tools.kula, [0, 0.025, 0], [Math.PI / 2, 0, 0], [1, 0.82, 1]);
  mesh(geo.cyl(0.2, 0.2, 0.014, 18), mat('#d9b24c', { rough: 1 }), tools.kula, [0, -0.008, 0], [0, 0, 0], [1, 1, 0.8]); // the rice on it
  tools.basket = group(torso, [0.2 * STYLE.shoulder, 0.02, 0.12]);
  mesh(geo.cyl(0.15, 0.1, 0.2, 16, true), weave, tools.basket, [0, 0, 0]);
  mesh(geo.cyl(0.1, 0.1, 0.01, 14), weave, tools.basket, [0, -0.1, 0]);
  mesh(geo.torus(0.15, 0.01, 5, 18), rim, tools.basket, [0, 0.1, 0], [Math.PI / 2, 0, 0]);
  P.basketFill = mesh(geo.sphere(0.13, 12, 8), mat('#6f9a3a', { rough: 0.8 }), tools.basket, [0, 0.02, 0], [0, 0, 0], [1, 0.45, 1]);
  // tools held in a hand keep their real size inside the bigger hands
  for (const t of [tools.can, tools.sickle, tools.spray, tools.phone, tools.broom, tools.kula]) t.scale.setScalar(1 / STYLE.hand);
  for (const t of Object.values(tools)) t.visible = false;
  P.tools = tools;
  P.phase = 0;
  root.traverse((o) => { if (o.isMesh) o.material = personMat(o.material); });
  // Store immutable rest-pose world transforms before any animation begins
  root.updateMatrixWorld(true);
  const restQ = new Map(), restP = new Map();
  const allJoints = [P.hips, P.torso, P.neck, P.head];
  for (const a of P.arms ?? []) allJoints.push(a.shoulder, a.elbow, a.hand);
  for (const l of P.legs ?? []) allJoints.push(l.thigh, l.knee, l.foot);
  for (const j of allJoints) {
    if (j) {
      restQ.set(j, j.getWorldQuaternion(new THREE.Quaternion()));
      restP.set(j, j.getWorldPosition(new THREE.Vector3()));
    }
  }
  P.restQ = restQ;
  P.restP = restP;
  P.restHipsPos = P.hips.position.clone();
  P.realReady = attachReal(P, look); // the real MakeHuman person, when one has been made for this look (realPeople.js)
  return P;
}

// People must read clearly against the field, as characters do in games: a rim of light on the edges turned away from
// the camera, and a little of their own colour kept in deep shade, so a farmer under a tree is a figure, not a
// silhouette. personLight (0..1, set by the stage from the time of day) dims both at night.
export const personLight = { value: 1 };
const personMats = new Map();
export function personMat(m) {
  if (!personMats.has(m)) {
    const p = m.clone();
    p.onBeforeCompile = (sh) => {
      sh.uniforms.personLight = personLight;
      sh.fragmentShader = `uniform float personLight;\n${sh.fragmentShader}`.replace('#include <opaque_fragment>', `
        float rimK = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.6);
        outgoingLight += (vec3(1.0, 0.95, 0.86) * rimK * 0.3 + diffuseColor.rgb * 0.09) * personLight;
        #include <opaque_fragment>`);
    };
    p.customProgramCacheKey = () => `person_${m.id}_${m.map ? 1 : 0}_${m.normalMap ? 1 : 0}`;
    personMats.set(m, p);
  }
  return personMats.get(m);
}

const lerp = (a, b, t) => a + (b - a) * t;

// Pose for this frame. st: { speed, run, act: {type,p,dur} | null, down, t, carrying, bank, turnRate, lookTarget }
export function animate(P, st, dt) {
  const { hips, torso, neck, head, legs, arms, tools } = P;
  const rawSpeed = st.speed ?? 0;
  P.smoothSpeed = lerp(P.smoothSpeed ?? rawSpeed, rawSpeed, Math.min(1, dt * 30)); // callers ease their speeds already; a lag here would slide the feet
  const speed = P.smoothSpeed;
  // The walk and the run (../humangait.js): each foot planted while it is on the ground, the stride matched to the
  // ground speed, the legs posed by inverse kinematics from where the feet are. Speeds go into the figure's own units
  // (a person of bigger build covers the same ground with a slightly slower stride). Turning on the spot takes small
  // steps; a sari or long skirt shortens the step.
  const scaleZ = (P.body.scale.z || 1) * (P.root.scale.z || 1);
  const turnStep = Math.min(0.5, Math.abs(st.turnRate ?? 0) * 0.16);
  const gs = Math.max(speed, turnStep) / scaleZ;
  const a = smooth01(gs / 0.5); // 0 standing .. 1 stepping out
  const wantRun = speed > 3.0 || (st.run && speed > 1.6) ? 1 : 0;
  P.runness = lerp(P.runness ?? wantRun, speed < 1.2 ? 0 : wantRun, Math.min(1, dt * 5));
  const rn = P.runness;
  const sk = P.skirt;
  const stepMax = sk >= 1 ? Infinity : sk * lerp(1.25, 2.2, rn);
  const G = gaitParams(gs, rn, stepMax);
  if (a > 0.02) {
    P.phase = ((P.phase ?? 0) + dt * Math.PI * G.cad) % (Math.PI * 2); // a stride is two steps
  } else if (P.phase !== undefined) {
    // coming to a stop: settle into the nearest double support, both feet down side by side
    const targetPh = Math.round(P.phase / Math.PI) * Math.PI;
    P.phase = lerp(P.phase, targetPh, Math.min(1, dt * 9)) % (Math.PI * 2);
  } else {
    P.phase = 0;
  }

  const ph = P.phase;
  const yawR = P.root.rotation.y, sx = st.slopeX ?? 0, sz = st.slopeZ ?? 0;
  const pose = stridePose(ph / (Math.PI * 2), gs, rn, a, {
    stepMax,
    hipX: [legs[0].thigh.position.x, legs[1].thigh.position.x],
    slopeF: sx * Math.sin(yawR) + sz * Math.cos(yawR), // the ground's rise ahead of the person and to their side
    slopeS: sx * Math.cos(yawR) - sz * Math.sin(yawR),
  });
  let hipY = pose.hipY;

  // a little forward lean, more when running; leaning into a start and back against a stop; banking into a turn
  let lean = pose.lean;
  const bank = (st.bank ?? 0) * a;
  const accel = (rawSpeed - (P.prevSpeed ?? rawSpeed)) / Math.max(0.001, dt);
  P.prevSpeed = rawSpeed;
  P.accelS = lerp(P.accelS ?? 0, Math.max(-12, Math.min(12, accel)), Math.min(1, dt * 6));
  const decelSettle = Math.max(-0.14, Math.min(0.14, -P.accelS * 0.008)); // the skirt's hem swings on when braking
  lean += Math.max(-0.08, Math.min(0.12, P.accelS * 0.02));

  const L = [-pose.legs[0].thigh, -pose.legs[1].thigh];
  const K = [pose.legs[0].knee, pose.legs[1].knee];
  const footRoll = [pose.legs[0].foot, pose.legs[1].foot];

  // arms swing from the shoulder against the legs, elbows a little bent (well bent running); a slow drape standing
  const idleArmDrape = (1 - a) * Math.sin((st.t ?? 0) * 2.1) * 0.024;
  const A = [pose.arms[0].shoulder + idleArmDrape, pose.arms[1].shoulder - idleArmDrape];
  const E = [Math.min(-0.2, pose.arms[0].elbow), Math.min(-0.2, pose.arms[1].elbow)];
  let az = [
    -0.28 - lerp(0.04, 0.12, rn) * a,
    0.28 + lerp(0.04, 0.12, rn) * a,
  ];

  let headX = 0, headY = 0, bodyY = 0;
  for (const t of Object.values(tools)) t.visible = false;
  if (st.carrying) {
    tools.sack.visible = true;
    lean += 0.10; // biomechanical forward compensatory trunk lean under dorsal load
    if (!st.act) {
      // hands steady sack straps on chest/shoulders
      A[0] = lerp(A[0], -0.28, 0.65);
      A[1] = lerp(A[1], -0.28, 0.65);
      E[0] = lerp(E[0], -0.95, 0.65);
      E[1] = lerp(E[1], -0.95, 0.65);
      az[0] = lerp(az[0], -0.34, 0.65);
      az[1] = lerp(az[1], 0.34, 0.65);
    }
  }
  tools.basket.rotation.z = 0;
  if (st.basket) tools.basket.visible = true; // a picker keeps the basket on the arm between plants
  if (P.basketFill) P.basketFill.scale.set(1, 0.15 + 0.85 * (st.fill ?? 0), 1);

  // Authentic human idle weight-shifting (stance shift) and breathing
  let idleHipX = 0, idleHipRoll = 0, idleKneeRelax = [0, 0];
  if (a < 0.04 && !st.act) {
    const breathe = Math.sin(st.t * 2.4);
    torso.scale.set(1 + breathe * 0.014, 1 + breathe * 0.022, 1 + breathe * 0.016);

    // Natural weight shift every 6-7 seconds: pelvis shifts over stance leg, free knee relaxes slightly
    const shiftCycle = (st.t ?? 0) * 0.24;
    const shiftSide = Math.sin(shiftCycle);
    const shiftWeight = (P.reducedMotion ? 0 : 1) * Math.sin(shiftCycle * 2) * 0.026;
    idleHipX = shiftWeight;
    idleHipRoll = (shiftSide > 0 ? 0.035 : -0.035) * Math.abs(shiftWeight / 0.026);
    idleKneeRelax = shiftSide > 0 ? [0, 0.07] : [0.07, 0];

    const gaze = idleGaze(st.t, P.reducedMotion);
    headY = gaze.y;
    headX = gaze.x;
  } else {
    const exertion = 1 + (st.run ? 0.028 : 0.014) * Math.sin(st.t * 6.5);
    torso.scale.set(exertion, 1, exertion);
  }

  // Procedural Head Look-at IK targeting toward people or points of interest
  if (st.lookTarget && !P.reducedMotion) {
    const tx = st.lookTarget.x ?? st.lookTarget[0] ?? 0;
    const ty = st.lookTarget.y ?? st.lookTarget[1] ?? 1.4;
    const tz = st.lookTarget.z ?? st.lookTarget[2] ?? 0;
    const px = P.root.position.x, py = P.root.position.y + 1.4, pz = P.root.position.z;
    const dx = tx - px, dy = ty - py, dz = tz - pz, dist = Math.hypot(dx, dz) || 1;
    const targetHeading = Math.atan2(dx, dz) - P.root.rotation.y;
    const normH = Math.atan2(Math.sin(targetHeading), Math.cos(targetHeading));
    const targetPitch = -Math.atan2(dy, dist);
    // Respect biomechanical cervical limits: yaw +/- 60 deg, pitch +/- 25 deg
    const clampH = Math.max(-1.05, Math.min(1.05, normH));
    const clampP = Math.max(-0.45, Math.min(0.45, targetPitch));
    headY = clampH * 0.88;
    headX = clampP * 0.78;
  }

  // 3D Biological Blinking & Expressive Gestures
  const expr = expressionFromState(st);
  const bVal = blink(st.t ?? 0, P.seed ?? 1);
  if (P.eyelids) {
    const openLimit = 0.02 + expr.lidSquint;
    for (const lid of P.eyelids) {
      lid.scale.y = openLimit + bVal * (1 - openLimit);
      lid.position.y = (1 - bVal) * (0.009 * (1 - expr.lidSquint * 0.5));
      lid.position.z = bVal * 0.0025;
    }
  }
  if (P.brows) {
    const browLerp = Math.min(1, dt * 12);
    for (const b of P.brows) {
      b.pivot.position.y = lerp(b.pivot.position.y, 0.052 + expr.browY, browLerp);
      b.pivot.rotation.z = lerp(b.pivot.rotation.z, b.baseRotZ + b.side * expr.browTilt, browLerp);
    }
  }
  if (P.mouth) {
    const mouthLerp = Math.min(1, dt * 10);
    const mOpen = expr.mouthOpen ?? 0;
    const mSmile = expr.smile ?? 0;
    if (P.mouth.lowerLip) {
      P.mouth.lowerLip.position.y = lerp(P.mouth.lowerLip.position.y, -0.0018 - mOpen * 0.007, mouthLerp);
      P.mouth.upperLip.position.y = lerp(P.mouth.upperLip.position.y, 0.0014 + mOpen * 0.0015, mouthLerp);
      P.mouth.cavity.scale.y = lerp(P.mouth.cavity.scale.y, 0.15 + mOpen * 1.1, mouthLerp);
      P.mouth.cavity.position.y = lerp(P.mouth.cavity.position.y, -0.001 - mOpen * 0.0035, mouthLerp);
      P.mouth.scale.x = lerp(P.mouth.scale.x, 1 + mSmile * 0.14, mouthLerp);
    } else {
      const targetMouthY = -0.048 - mOpen * 0.007;
      const targetMouthScaleY = 0.02 + mOpen * 0.85;
      P.mouth.position.y = lerp(P.mouth.position.y, targetMouthY, mouthLerp);
      P.mouth.scale.y = lerp(P.mouth.scale.y, targetMouthScaleY, mouthLerp);
    }
  }

  const act = st.act;
  if (act) {
    const p = act.p / act.dur, e = Math.sin(Math.min(1, p) * Math.PI);
    switch (act.type) {
      case 'plant': case 'clear':
        lean = 0.52 * e; K[0] = K[1] = 1.82 * e; L[0] = L[1] = 1.22 * e; headX = 0.35 * e; // squat with deep knee flexion and foot planting
        A[1] = -0.65 * e; E[1] = -0.25 * e; az[1] = 0.28 * (1 - e) + 0.10 * e; // hand reaches downward into furrow
        A[0] = -0.45 * e; E[0] = -0.45 * e; az[0] = -0.25 * e; // left hand steadies on knee
        break;
      case 'harvest': {
        const slice = Math.sin(p * Math.PI * 4);
        lean = 0.55 * e; K[0] = K[1] = 1.3 * e; L[0] = L[1] = 0.9 * e; headX = 0.25 * e;
        tools.sickle.visible = true;
        A[1] = -1.0 * e;
        az[1] = 0.28 * (1 - e) + (-0.15 + slice * 0.55) * e; // smooth resting blend, 2-slice sweep
        E[1] = -0.2 - 0.35 * e;
        A[0] = -0.9 * e; E[0] = -0.35 * e; // left hand gathers stalks
        break;
      }
      case 'water':
        tools.can.visible = true;
        A[1] = -1.15 * e; E[1] = -0.25 * e;
        A[0] = -0.35 * e; E[0] = -0.55 * e; az[0] = -0.34 * e; // left arm counterbalances heavy can
        lean = 0.25 * e; headX = 0.35 * e;
        tools.can.rotation.x = 0.9 * e;
        break;
      case 'spray': {
        const sweep = Math.sin(p * Math.PI * 5);
        tools.spray.visible = true; tools.tank.visible = true;
        A[1] = -0.9 * e;
        E[1] = -0.2 - 0.25 * e;
        az[1] = 0.28 * (1 - e) + (0.15 + sweep * 0.35) * e; // smooth wand sweep
        A[0] = (-0.25 - sweep * 0.12) * e; E[0] = -0.85 * e; az[0] = -0.22 * e; // left hand pumps knapsack lever
        lean = 0.25 * e; headX = 0.3 * e;
        break;
      }
      case 'pump': {
        const pumpCycle = Math.sin(p * Math.PI * 8);
        tools.can.visible = true;
        A[1] = (-1.35 + pumpCycle * 0.45) * e;
        E[1] = -0.2 - 0.45 * e;
        A[0] = -0.45 * e; E[0] = -0.5 * e;
        lean = 0.2 * e;
        break;
      }
      case 'sell':
        A[0] = A[1] = -1.0 * e; E[0] = E[1] = -0.5 * e; az[0] = -0.18 * e; az[1] = 0.18 * e; lean = 0.3 * e; tools.sack.visible = p < 0.5; break;
      case 'sweep': {
        // bent low from the hips over the short jharu, knees soft, the broom flicked across the ground in short strokes
        // while the free hand rests on the knee; the feet stay where they are
        const stroke = Math.sin(p * Math.PI * 6);
        lean = 0.95 * e; K[0] = K[1] = 0.55 * e; L[0] = L[1] = 0.25 * e; headX = -0.15 * e;
        A[1] = -0.35 * e; az[1] = (-0.05 + stroke * 0.32) * e; E[1] = -0.15 * e;
        A[0] = -0.55 * e; E[0] = -0.6 * e; az[0] = 0.15 * e;
        tools.broom.visible = true; tools.broom.rotation.set(0.35 * e, 0, stroke * 0.25 * e);
        break;
      }
      case 'winnow': {
        // standing square with the kula in both hands at the waist: a toss and catch, the tray tipped forward each time
        const toss = Math.max(0, Math.sin(p * Math.PI * 7)), en = Math.min(1, p * 5, (1 - p) * 5);
        A[0] = A[1] = (-0.85 - toss * 0.18) * en; E[0] = E[1] = -0.75 * en; az[0] = -0.18 * en; az[1] = 0.18 * en;
        lean = 0.12 * en; headX = 0.3 * en; K[0] = K[1] = toss * 0.12 * en;
        tools.kula.visible = true; tools.kula.rotation.set(-0.9 * en + toss * 0.35, 0, 0); tools.kula.position.y = -0.07 + toss * 0.04;
        break;
      }
      case 'spread': {
        // crouched at the edge of the drying mat, one hand raking the paddy flat in long sweeps
        const rake = Math.sin(p * Math.PI * 4);
        lean = 0.5 * e; K[0] = K[1] = 1.7 * e; L[0] = L[1] = 1.15 * e; headX = 0.35 * e;
        A[1] = -1.0 * e; az[1] = rake * 0.45 * e; E[1] = -0.15 * e; A[0] = -0.35 * e; E[0] = -0.5 * e;
        break;
      }
      case 'pick': {
        // picking beans from a staked vine: standing close, the right hand reaches into the leaves (chest to head
        // high, a little higher or lower each time), feels for a pod, snaps it off with a small twist and drops it in
        // the basket on the left forearm; the head follows the hand, the weight shifts into each reach
        const n = 3, ph = (p * n) % 1, k = Math.floor(p * n);
        const reachOut = Math.sin(Math.min(1, ph / 0.45) * Math.PI * 0.5);      // out to the vine
        const back = Math.max(0, (ph - 0.62) / 0.38);                            // back to the basket
        const r = reachOut * (1 - Math.sin(Math.min(1, back) * Math.PI * 0.5));
        const high = [0.25, -0.1, 0.12][k % 3];                                  // each pod at its own height
        const twist = ph > 0.45 && ph < 0.62 ? Math.sin((ph - 0.45) / 0.17 * Math.PI) : 0;
        lean = (0.12 + 0.08 * r) * e; K[0] = K[1] = 0.1 * e; L[0] = L[1] = 0.04 * e;
        A[1] = (-0.55 - (1.05 + high) * r) * e; E[1] = (-1.2 + 0.85 * r) * e; az[1] = (0.15 - 0.05 * r + 0.12 * twist) * e;
        A[0] = -0.75 * e; E[0] = -1.45 * e; az[0] = 0.12 * e;                    // the basket arm
        headX = (0.05 - 0.18 * r * (0.5 + high)) * e; headY = (0.1 * (1 - r)) * e;
        tools.basket.visible = true;
        break;
      }
      case 'tip':
        // the full basket off the arm and tipped out onto the heap at the row's end
        lean = 0.45 * e; K[0] = K[1] = 0.5 * e; A[0] = A[1] = -1.0 * e; E[0] = E[1] = -0.6 * e; az[0] = -0.2 * e; az[1] = 0.2 * e;
        tools.basket.visible = true; tools.basket.rotation.z = -1.3 * Math.max(0, Math.sin(p * Math.PI)); break;
      case 'wipe': {
        const swipe = Math.sin(p * Math.PI * 2);
        A[1] = -2.35 * e;
        az[1] = 0.28 * (1 - e) + (-0.32 + swipe * 0.12) * e; // adducts across chest and sweeps brow
        E[1] = -2.25 * e;
        headX = -0.18 * e;
        headY = (0.10 + swipe * 0.08) * e;
        A[0] = -0.20 * e; E[0] = -0.35 * e; // left hand steadies body
        break;
      }
      case 'talk': {
        // speaking with someone: the right hand rises to chest height and opens and turns with the words, the
        // left rests, small nods and tilts of the head, weight easing from one leg to the other
        const t = act.p, beat = Math.sin(t * 5.2) * 0.5 + Math.sin(t * 3.1 + 1) * 0.5, en = Math.min(1, t * 3, (act.dur - t) * 3);
        A[1] = (-0.55 - 0.18 * beat) * en; E[1] = (-1.25 + 0.2 * beat) * en; az[1] = (0.12 + 0.1 * Math.sin(t * 2.3)) * en;
        A[0] = -0.08 * en; E[0] = -0.3 * en;
        headX = (0.05 * Math.sin(t * 4.1)) * en; headY = (0.08 * Math.sin(t * 1.7)) * en;
        lean = 0.03 * en;
        break;
      }
      case 'wave': case 'greet': {
        const wave = Math.sin(p * Math.PI * 6);
        A[1] = -2.35 * e;
        az[1] = 0.28 * (1 - e) + (0.35 + wave * 0.22) * e; // smooth resting blend
        E[1] = -0.20 * (1 - e) + (-1.25 + wave * 0.18) * e;
        headX = -0.12 * e; headY = (0.15 + wave * 0.08) * e;
        A[0] = -0.15 * e; E[0] = -0.25 * e;
        break;
      }
      case 'soilcheck':
        lean = 0.62 * e; K[0] = K[1] = 1.95 * e; L[0] = L[1] = 1.25 * e; headX = 0.45 * e;
        A[1] = -0.58 * e; E[1] = -0.28 * e; az[1] = 0.28 * (1 - e) + 0.08 * e; // hand reaches downward into soil
        A[0] = -0.45 * e; E[0] = -0.45 * e; az[0] = -0.25 * e; // left hand rests on knee
        break;
      case 'adjust':
        A[0] = -2.6 * e; az[0] = -0.35; E[0] = -1.5 * e; headY = 0.2 * e; break;
      case 'phone':
        tools.phone.visible = true; A[0] = -1.02 * Math.min(1, p * 4, (1 - p) * 4); E[0] = -0.2 - 1.1 * Math.min(1, p * 4, (1 - p) * 4); az[0] = -0.18 * Math.min(1, p * 4, (1 - p) * 4); // phone held with forearm clearing torso
        A[1] = -0.3 * e; E[1] = -0.6 * e; az[1] = 0.28; headX = 0.35 * e; break;
      case 'cheer': {
        const w = Math.sin(st.t * 7);
        A[0] = -2.8 + w * 0.2; A[1] = -2.8 - w * 0.2; E[0] = E[1] = -0.2; az = [-0.35, 0.35]; bodyY = Math.abs(Math.sin(st.t * 5)) * 0.16; headX = -0.2; break; // Feature F16: V-spread arms eliminating skull intersection
      }
      default:
    }
  }
  // Let the head anticipate a turn slightly, rather than rotating as one rigid block.
  headY += Math.max(-0.2, Math.min(0.2, (st.turnRate ?? 0) * 0.04));
  // Standing still: hands in the pockets (or tucked in the lungi's fold), feet a little apart.
  const idle = a < 0.04 && !act && !(st.down > 0);
  const pocket = idle && P.pockets;
  if (pocket) {
    A[0] = A[1] = POCKET.shoulderX; E[0] = E[1] = POCKET.elbowX;
    az = [POCKET.shoulderZ, -POCKET.shoulderZ];
  }
  if (st.down > 0) { hipY = DOWN_HIP_Y; L[0] = L[1] = -1.45; K[0] = K[1] = 1.5; lean = 0.25; A[1] = -2.4; E[1] = -1.8; A[0] = -0.5; headX = 0.35; }
  lean += (P.ageStoop ?? 0);
  const k = Math.min(1, dt * 18);
  // the stepping legs and the hips follow the stride exactly (any lag would slide the planted foot); poses and the
  // way into and out of a step are eased
  const gk = act || st.down > 0 ? k : lerp(k, 1, a);
  hips.position.y = lerp(hips.position.y, hipY, gk);
  hips.position.x = lerp(hips.position.x, idle ? idleHipX : act ? 0 : pose.sway, gk);
  P.body.position.y = lerp(P.body.position.y, bodyY, k);
  torso.rotation.x = lerp(torso.rotation.x, lean, k);
  const targetPitch = headX - lean * 0.5;
  const targetYaw = headY + (act ? 0 : pose.yaw * 0.6); // the head stays facing ahead while the shoulders turn
  if (neck) {
    neck.rotation.x = lerp(neck.rotation.x, targetPitch * 0.35, k);
    neck.rotation.y = lerp(neck.rotation.y, targetYaw * 0.30, k * 0.6);
    head.rotation.x = lerp(head.rotation.x, targetPitch * 0.65, k);
    head.rotation.y = lerp(head.rotation.y, targetYaw * 0.70, k * 0.6);
  } else {
    head.rotation.x = lerp(head.rotation.x, targetPitch, k);
    head.rotation.y = lerp(head.rotation.y, targetYaw, k * 0.6);
  }

  // The walk & run: pelvic list and yaw, thoracic counter-rotation, dynamic turn banking
  const still = a < 0.04 && !act;
  // the pelvis turns with the leg reaching forward and dips on the side of the swinging leg; the shoulders turn against it
  const hipYaw = act ? 0 : pose.yaw;
  const hipRoll = act ? 0 : still ? idleHipRoll : pose.list;

  hips.rotation.y = lerp(hips.rotation.y, hipYaw, gk);
  hips.rotation.z = lerp(hips.rotation.z, hipRoll + bank * 0.75, gk);
  torso.rotation.y = lerp(torso.rotation.y, act ? 0 : -hipYaw * 1.6, k);
  torso.rotation.z = lerp(torso.rotation.z, act ? 0 : -hipRoll * 0.85 + bank * 0.55, k);

  // Turning on the spot: a planted foot stays pointing where it was while the body turns above it (the hip turns
  // in its socket), and only swings round with the next step, as a person pivots in small steps. Without this the
  // feet twisted on the ground with the body.
  const rootYaw = P.root.rotation.y, dYaw = Math.atan2(Math.sin(rootYaw - (P.lastRootYaw ?? rootYaw)), Math.cos(rootYaw - (P.lastRootYaw ?? rootYaw)));
  P.lastRootYaw = rootYaw;
  P.footYaw ??= [0, 0];
  // standing still and turning: both feet stay put; when one has been left more than ~25° behind, it steps round
  // (lifted for a quarter second, knee bent) and is set down facing the new way, then the other follows
  const pivoting = speed < 0.3 && !act;
  if (pivoting && !P.pivot) { const far = Math.abs(P.footYaw[0]) >= Math.abs(P.footYaw[1]) ? 0 : 1; if (Math.abs(P.footYaw[far]) > 0.42) P.pivot = { i: far, t: 0 }; }
  const pivotLift = [0, 0];
  for (let i = 0; i < 2; i++) {
    const stepping = P.pivot?.i === i;
    const planted = pivoting ? !stepping : (pose.legs[i].stance && speed < 1.2 && !act);
    if (planted) P.footYaw[i] = Math.max(-1.0, Math.min(1.0, P.footYaw[i] - dYaw)); // a hip turns about 45° in its socket
    else P.footYaw[i] *= Math.exp(-dt * (stepping ? 16 : 14)); // lifted: it swings round to face the new way
    if (stepping) { P.pivot.t += dt; pivotLift[i] = Math.sin(Math.min(1, P.pivot.t / 0.26) * Math.PI); if (P.pivot.t >= 0.26) P.pivot = null; }
    legs[i].thigh.rotation.y = P.footYaw[i];
  }
  if (!pivoting) P.pivot = null;
  for (let i = 0; i < 2; i++) if (pivotLift[i]) { L[i] -= 0.35 * pivotLift[i]; K[i] += 0.7 * pivotLift[i]; } // the stepping foot lifts clear
  for (let i = 0; i < 2; i++) {
    legs[i].thigh.rotation.x = lerp(legs[i].thigh.rotation.x, -L[i], gk);
    legs[i].knee.rotation.x = lerp(legs[i].knee.rotation.x, K[i] + (idle ? idleKneeRelax[i] : 0), gk);
    legs[i].foot.rotation.x = lerp(legs[i].foot.rotation.x, footRoll[i], gk);
    arms[i].shoulder.rotation.x = lerp(arms[i].shoulder.rotation.x, A[i], k);
    arms[i].shoulder.rotation.z = lerp(arms[i].shoulder.rotation.z, az[i], k);
    arms[i].elbow.rotation.x = lerp(arms[i].elbow.rotation.x, E[i], k);
    const side = i ? 1 : -1;
    legs[i].thigh.rotation.z = lerp(legs[i].thigh.rotation.z, idle ? side * STYLE.stance : 0, k);
    legs[i].foot.rotation.z = lerp(legs[i].foot.rotation.z, idle ? -side * STYLE.stance : 0, k); // soles stay flat
    // in the pocket the hand slips out of sight; out of it, it comes back to its full size
    const hd = arms[i].hand;
    hd.scale.setScalar(lerp(hd.scale.x, STYLE.hand * (pocket ? POCKET.handIn : 1), k));
  }
  // Ground work keeps the feet planted: run the legs' own transforms to find the lower ankle, and set the hips so it
  // sits at its standing height. Fixed hip drops were fitted to the old longer legs; on these shorter legs they sank
  // the feet into the soil and folded the figure onto its hands.
  if (act && (act.type === 'plant' || act.type === 'clear' || act.type === 'harvest' || act.type === 'spread' || act.type === 'sweep' || act.type === 'pick' || act.type === 'soilcheck')) {
    let lowest = Infinity;
    for (const l of legs) { l.thigh.updateMatrix(); l.knee.updateMatrix(); ankle.copy(l.foot.position).applyMatrix4(l.knee.matrix).applyMatrix4(l.thigh.matrix); lowest = Math.min(lowest, ankle.y); }
    hips.position.y = HIP_Y - TH - SHIN_POS - lowest;
  }

  // Secondary cloth inertia and sway for skirts, dhotis, saris, and long garments
  if (P.skirtGroup) {
    const sway = Math.sin(ph) * 0.075 * a * lerp(1, 0.6, rn);
    const billow = -speed * 0.026;
    const brakeBillow = Math.min(0.22, Math.max(-0.05, decelSettle * 0.95));

    // Feature F06: Stride kinematics: find forward extension of thighs and lateral separation
    const tRot0 = legs[0]?.thigh?.rotation?.x ?? 0;
    const tRot1 = legs[1]?.thigh?.rotation?.x ?? 0;
    const forwardThigh = Math.max(0, -tRot0, -tRot1);
    const backThigh = Math.max(0, tRot0, tRot1);
    const strideSpread = Math.abs(tRot0 - tRot1);

    // Stride-following splay: skirt pitch follows leading thigh motion and squats
    const strideFollowPitch = -forwardThigh * 0.22;
    P.skirtGroup.rotation.z = lerp(P.skirtGroup.rotation.z, -hips.rotation.z * 0.65 + sway, k);
    P.skirtGroup.rotation.x = lerp(P.skirtGroup.rotation.x, billow - lean * 0.35 + brakeBillow + strideFollowPitch, k);

    // Dynamic depth expansion (Z) and lateral stride splay (X) to eliminate knee-punch tearing
    const depthExpand = forwardThigh * 0.36 + strideSpread * 0.20;
    const splayExpand = strideSpread * 0.14 + (act ? 0.08 : 0);
    const targetScaleZ = 1.05 * (1 + depthExpand);
    const targetScaleX = 1.05 * (1 + splayExpand);
    P.skirtGroup.scale.z = lerp(P.skirtGroup.scale.z, targetScaleZ, k);
    P.skirtGroup.scale.x = lerp(P.skirtGroup.scale.x, targetScaleX, k);

    // Dynamic forward centroid tracking
    const forwardOffset = (forwardThigh - backThigh * 0.35) * 0.065;
    P.skirtGroup.position.z = lerp(P.skirtGroup.position.z, forwardOffset, k);
  }

  if (!act || act.type !== 'water') tools.can.rotation.x = 0;
  P.real?.sync(st);
}

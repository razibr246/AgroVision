// The 3D world of "স্বপ্নের মাঠ", the children's dream (story and rules in game/dream.js). One renderer, three places:
// the courtyard at night, space with the Earth, and the family's field by day. People are rigged, animated models
// (public/models/people, Quaternius, CC0) dressed in each character's own colours from regions.js; children are the
// same bodies scaled down with a bigger head. The light, the sky and the people's animation follow the mood.
// Taps (mouse, touch, or a VR/AR controller's trigger) hit the objects of the mini-games. Runs through
// renderer.setAnimationLoop so WebXR works; keep frame code free of exceptions.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = `${import.meta.env.BASE_URL || './'}models/people/`;
const GRADES = {
  night: { sky: 0x14224a, fog: 0x14224a, sun: 0xa9bcff, sunI: 0.9, amb: 0x6a7ab0, ambI: 1.25, lamp: 3.2 },
  space: { sky: 0x02030a, fog: 0x02030a, sun: 0xffffff, sunI: 1.6, amb: 0x223355, ambI: 0.35, lamp: 0 },
  day: { sky: 0x9fd3f2, fog: 0xc9e6f5, sun: 0xfff2d6, sunI: 2.2, amb: 0xbfd8ff, ambI: 0.8, lamp: 0 },
  grey: { sky: 0x6f7882, fog: 0x6a747e, sun: 0xb4bcc4, sunI: 1.3, amb: 0x8d97a1, ambI: 1.15, lamp: 0 },
  gold: { sky: 0xffc985, fog: 0xffd9a8, sun: 0xffd08a, sunI: 2.6, amb: 0xffe3c0, ambI: 0.9, lamp: 0 },
  dawn: { sky: 0xf7b9a0, fog: 0xf9d2bd, sun: 0xffc9a0, sunI: 1.9, amb: 0xf3d8ff, ambI: 0.85, lamp: 0 },
};

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
const sphere = (r, c, o) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(c, o));

// Which body each grown-up wears, and the colours of their clothes.
export function bodyFor(id, region) {
  const look = region?.farmer?.look ?? {};
  const age = region?.farmer?.age ?? 40;
  const isFemale = ['rahima', 'rampyari', 'kinley', 'ellen', 'lucia'].includes(id);
  const model = isFemale ? 'Casual3_Female' : id === 'razib' ? 'Casual2_Male' : age >= 55 ? 'OldClassy_Male' : 'Worker_Male';
  return { id, look, age, model, colors: { Skin: look.skin, Shirt: look.topA, Vest: look.topB ?? look.topA, Detail: look.topB, Pants: look.lowA, Hair: look.hair, Hat: look.headA ?? look.hair, Belt: '#3a2a1e' } };
}
export function kidBody(child, region) {
  const skin = region?.farmer?.look?.skin ?? '#b77b52';
  return child.girl
    ? { child, model: 'Casual_Female', colors: { Skin: skin, Shirt: '#f2a7c3', Pants: '#7b5cd6', Hair: '#1a1411', Belt: '#e2b84a' }, kid: true }
    : { child, model: 'Casual_Male', colors: { Skin: skin, Shirt: '#4fb3e8', Pants: '#2f4f7f', Hair: '#1a1411', Belt: '#e2b84a' }, kid: true };
}

export function createDreamScene(host, { onTap = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.05, 400);
  const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(6, 12, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  const amb = new THREE.HemisphereLight(0xbfd8ff, 0x3a2f20, 0.8);
  const lamp = new THREE.PointLight(0xffb45a, 0, 9, 1.6); lamp.position.set(1.3, 1.6, 0.6);
  scene.add(sun, amb, lamp);
  scene.fog = new THREE.Fog(0x9fd3f2, 18, 70);

  // soft round dots and thin streaks for stars, rain and fireflies
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
  const streakTex = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 64; const g = c.getContext('2d'); const l = g.createLinearGradient(0, 0, 0, 64); l.addColorStop(0, 'rgba(220,235,255,0)'); l.addColorStop(1, 'rgba(220,235,255,.9)'); g.fillStyle = l; g.fillRect(6, 0, 4, 64); return new THREE.CanvasTexture(c); })();
  const cloudsTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 256);
    let s = 73; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 85; i++) {
      const cx = rnd() * 512, cy = 28 + rnd() * 200, rx = 24 + rnd() * 55, ry = 7 + rnd() * 16;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.55, 'rgba(245,250,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  // Spring overshoot curve: 0 -> 1.25 -> 1.0 over u in [0, 1]
  const springOvershoot = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : (1 - Math.exp(-2.12 * u) * Math.cos(u * Math.PI * 1.65)) * (1 - Math.pow(u, 6)) + Math.pow(u, 6));
  // ── places ──
  const places = { night: new THREE.Group(), space: new THREE.Group(), field: new THREE.Group() };
  Object.values(places).forEach((g) => scene.add(g));
  const STAR_N = 800;
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: STAR_N * 3 }, () => (Math.random() - 0.5) * 300), 3));
  starGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(Array.from({ length: STAR_N }, () => Math.random()), 1));
  starGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(Array.from({ length: STAR_N }, () => 0.7 + Math.random() * 0.9), 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uTex: { value: dotTex } },
    vertexShader: `
      attribute float aSeed, aSize;
      uniform float uTime;
      varying float vTwinkle, vSeed;
      void main() {
        float w = 0.5 + 0.5 * sin(uTime * (1.8 + aSeed * 3.8) + aSeed * 62.83);
        vTwinkle = 0.35 + 0.65 * w * w;
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aSize * (185.0 / max(1.0, -mv.z)) * (0.72 + 0.42 * vTwinkle), 1.5, 11.0);
      }`,
    fragmentShader: `
      uniform sampler2D uTex;
      varying float vTwinkle, vSeed;
      void main() {
        vec4 t = texture2D(uTex, gl_PointCoord);
        if (t.a < 0.04) discard;
        vec3 col = mix(vec3(0.84, 0.92, 1.0), vec3(1.0, 0.92, 0.76), step(0.65, fract(vSeed * 13.7)));
        gl_FragColor = vec4(col, t.a * vTwinkle);
      }`,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Shooting star streak across the night sky
  const shootGeo = new THREE.CylinderGeometry(0.055, 0.008, 3.8, 5);
  const shootMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const shootingStar = new THREE.Mesh(shootGeo, shootMat);
  scene.add(shootingStar);
  const _shootUp = new THREE.Vector3(0, 1, 0);
  let shootTimer = 3.5, shooting = false, shootProgress = 0, shootStart = new THREE.Vector3(), shootDir = new THREE.Vector3();

  // night courtyard: a mud-and-tin house, glowing windows, a lantern with volumetric halo, courtyard fireflies, a cot
  const nightWindowMats = [];
  let lanternHaloMat = null, lanternGlowSprite = null, nightFliesMat = null;
  {
    const g = places.night;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 40), mat(0x5a4632)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    const wall = box(5, 2.4, 3, 0xb38b5d); wall.position.set(0, 1.2, -3.2); g.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.4, 4), mat(0x8a9198, { metalness: 0.4, roughness: 0.5 })); roof.position.set(0, 3.1, -3.2); roof.rotation.y = Math.PI / 4; g.add(roof);
    const door = box(1, 1.7, 0.05, 0x5b3a22); door.position.set(0, 0.85, -1.68); g.add(door);
    // Glowing mud-hut windows (front & side)
    for (const [wx, wy, wz, ry] of [[-1.45, 1.32, -1.69, 0], [1.45, 1.32, -1.69, 0], [-2.51, 1.32, -3.2, Math.PI / 2]]) {
      const wg = new THREE.Group();
      wg.position.set(wx, wy, wz); wg.rotation.y = ry;
      const frame = box(0.66, 0.54, 0.05, 0x5b3a22);
      const paneMat = mat(0xffd27a, { emissive: 0xffa040, emissiveIntensity: 1.55 });
      nightWindowMats.push(paneMat);
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.40, 0.065), paneMat);
      const barV = box(0.04, 0.42, 0.08, 0x5b3a22);
      const barH = box(0.54, 0.04, 0.08, 0x5b3a22);
      wg.add(frame, pane, barV, barH);
      g.add(wg);
    }
    const cot = box(2, 0.25, 1, 0x7a5532); cot.position.set(-1.8, 0.45, 0.3); g.add(cot);
    const pitcher = sphere(0.22, 0x9c5a32); pitcher.scale.set(1, 1.25, 1); pitcher.position.set(-0.7, 0.28, 0.4); g.add(pitcher);
    const lantern = sphere(0.12, 0xffd08a, { emissive: 0xffa040, emissiveIntensity: 2 }); lantern.position.copy(lamp.position); g.add(lantern);
    // Warm volumetric lantern halo
    lanternHaloMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uPulse: { value: 1.0 } },
      vertexShader: `
        varying vec3 vVN, vVD;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vVN = normalize(normalMatrix * normal);
          vVD = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uPulse;
        varying vec3 vVN, vVD;
        void main() {
          float f = pow(max(0.0, dot(normalize(vVN), normalize(vVD))), 2.3);
          gl_FragColor = vec4(1.0, 0.68, 0.28, f * 0.48 * uPulse);
        }`,
    });
    const lanternHalo = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 18), lanternHaloMat);
    lanternHalo.position.copy(lamp.position); g.add(lanternHalo);
    lanternGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xffbe68, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    lanternGlowSprite.position.copy(lamp.position); lanternGlowSprite.scale.setScalar(2.1); g.add(lanternGlowSprite);
    // Dedicated courtyard fireflies drifting across places.night
    const NF_N = 44;
    const nfPos = new Float32Array(NF_N * 3);
    const nfSeed = new Float32Array(NF_N * 3);
    for (let i = 0; i < NF_N; i++) {
      nfPos[i * 3] = (Math.random() - 0.5) * 8.6;
      nfPos[i * 3 + 1] = 0.45 + Math.random() * 1.9;
      nfPos[i * 3 + 2] = -1.8 + Math.random() * 5.2;
      nfSeed[i * 3] = Math.random();
      nfSeed[i * 3 + 1] = 1.6 + Math.random() * 2.4;
      nfSeed[i * 3 + 2] = 0.5 + Math.random() * 0.7;
    }
    const nfGeo = new THREE.BufferGeometry();
    nfGeo.setAttribute('position', new THREE.BufferAttribute(nfPos, 3));
    nfGeo.setAttribute('aSeed', new THREE.BufferAttribute(nfSeed, 3));
    nightFliesMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uTex: { value: dotTex } },
      vertexShader: `
        attribute vec3 aSeed;
        uniform float uTime;
        varying float vGlow;
        void main() {
          vec3 p = position;
          float ph = aSeed.x * 6.2831;
          p.x += sin(uTime * aSeed.z + ph) * 0.48;
          p.y += sin(uTime * aSeed.z * 1.4 + ph * 1.7) * 0.28;
          p.z += cos(uTime * aSeed.z * 0.9 + ph) * 0.45;
          vGlow = pow(max(0.0, sin(uTime * aSeed.y + ph * 3.0)), 2.2);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp((38.0 / max(1.0, -mv.z)) * (0.45 + 0.75 * vGlow), 2.0, 14.0);
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vGlow;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          if (t.a < 0.05 || vGlow < 0.05) discard;
          gl_FragColor = vec4(0.92, 0.98, 0.36, t.a * vGlow);
        }`,
    });
    const nightFlies = new THREE.Points(nfGeo, nightFliesMat);
    nightFlies.frustumCulled = false; g.add(nightFlies);
  }
  // space: the Earth with the home dot, dual-layer Fresnel rim, independent cloud layer, Tara orbiting
  const earth = new THREE.Group();
  const home = sphere(0.09, 0xfff07a, { emissive: 0xffd400, emissiveIntensity: 3 });
  let earthClouds = null;
  {
    const globe = sphere(3, 0x1f5fb8, { roughness: 0.6 });
    globe.geometry = new THREE.SphereGeometry(3, 64, 48);
    globe.userData.onTap = () => onTap({ kind: 'home' }); // little fingers: anywhere on the Earth finds home
    earth.add(globe);

    for (let i = 0; i < 26; i++) { // land blobs
      const blob = sphere(0.35 + Math.random() * 0.5, i % 3 ? 0x3f8f3a : 0x55a84f, { roughness: 1 });
      const v = new THREE.Vector3().randomDirection().multiplyScalar(2.82);
      blob.position.copy(v); blob.scale.set(1, 0.25, 1); blob.lookAt(0, 0, 0); blob.rotateX(Math.PI / 2); earth.add(blob);
    }
    // Independent rotating swirling cloud layer sphere
    earthClouds = new THREE.Mesh(
      new THREE.SphereGeometry(3.07, 48, 36),
      new THREE.MeshStandardMaterial({ map: cloudsTex, transparent: true, opacity: 0.78, depthWrite: false, roughness: 1 })
    );
    earthClouds.rotation.z = 0.08;
    earth.add(earthClouds);

    // Dual-layer Fresnel atmospheric rim shaders: inner sunlit scatter rim + outer limb halo
    const atmoInnerMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vN, vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vN, vV;
        void main() {
          float f = pow(1.0 - max(0.0, dot(normalize(vN), normalize(vV))), 3.1);
          float dayLit = 0.35 + 0.65 * max(0.0, dot(normalize(vN), normalize(vec3(0.55, 0.5, 0.65))));
          vec3 col = mix(vec3(0.18, 0.64, 1.0), vec3(0.68, 0.94, 1.0), f);
          gl_FragColor = vec4(col, f * dayLit * 0.68);
        }`,
    });
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(3.09, 48, 36), atmoInnerMat));

    const atmoOuterMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vN, vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vN, vV;
        void main() {
          float d = clamp(dot(normalize(vN), normalize(-vV)), 0.0, 1.0);
          float rim = pow(smoothstep(0.02, 0.44, d), 2.1);
          float dayLit = 0.42 + 0.58 * max(0.0, dot(normalize(vN), normalize(vec3(0.55, 0.5, 0.65))));
          gl_FragColor = vec4(0.24, 0.76, 1.0, rim * dayLit * 0.46);
        }`,
    });
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(3.26, 48, 36), atmoOuterMat));

    home.geometry = new THREE.SphereGeometry(0.16, 20, 14);
    home.position.set(0, 0.6, 1).normalize().multiplyScalar(3.04); earth.add(home);
    home.userData.onTap = () => onTap({ kind: 'home' });
    earth.position.set(0, 0, -9);
    places.space.add(earth);
  }
  // field: plots, a river, palms, a pump, the house far off
  const plots = [];
  {
    const g = places.field;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat(0x6d8f3f)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(90, 6), mat(0x3d7fb3, { roughness: 0.2, metalness: 0.1 })); river.rotation.x = -Math.PI / 2; river.position.set(0, 0.02, -22); g.add(river);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const p = box(2.6, 0.18, 2.2, 0x8a6a45); p.position.set(-4.2 + c * 2.8, 0.09, -2.5 - r * 2.4); p.receiveShadow = true;
      p.userData = { bare: true, plants: null };
      g.add(p); plots.push(p);
    }
    for (let i = 0; i < 9; i++) {
      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 4, 8), mat(0x7a5b3a)); trunk.position.y = 2; palm.add(trunk);
      for (let k = 0; k < 6; k++) { const leaf = box(0.25, 0.05, 1.8, 0x2f7a35); leaf.position.set(0, 4, 0); leaf.rotation.set(0.5, (k / 6) * Math.PI * 2, 0); leaf.translateZ(0.8); palm.add(leaf); }
      palm.position.set(-14 + i * 3.6, 0, -15 - (i % 2) * 3); g.add(palm);
    }
    const hut = box(3, 2, 2.4, 0xb38b5d); hut.position.set(9, 1, -8); g.add(hut);
    // Shallow pond puddle beside the plots for the swimming duckling & wake ripples
    const pondRim = new THREE.Mesh(new THREE.CircleGeometry(1.38, 28), mat(0x5b4632, { roughness: 0.95 }));
    pondRim.rotation.x = -Math.PI / 2; pondRim.position.set(6.7, 0.008, -2.4); g.add(pondRim);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(1.18, 28), mat(0x38bdf8, { roughness: 0.14, metalness: 0.2, transparent: true, opacity: 0.88 }));
    pond.rotation.x = -Math.PI / 2; pond.position.set(6.7, 0.016, -2.4); g.add(pond);
  }

  // ── Tara the satellite, Bhola the goat, the frog ──
  const tara = new THREE.Group();
  {
    const body = box(0.52, 0.52, 0.52, 0xf59e0b); body.material.metalness = 0.7; body.material.roughness = 0.25; tara.add(body);
    for (const s of [-1, 1]) {
      const panel = box(0.92, 0.04, 0.44, 0x1d4ed8);
      panel.material.metalness = 0.8; panel.material.roughness = 0.2; panel.position.x = s * 0.74;
      const grid = box(0.88, 0.045, 0.40, 0x60a5fa);
      grid.material.wireframe = true; grid.position.x = s * 0.74;
      tara.add(panel, grid);
    }
    for (const s of [-1, 1]) {
      const eye = sphere(0.075, 0xffffff); eye.position.set(s * 0.12, 0.06, 0.27);
      const pupil = sphere(0.038, 0x0f172a); pupil.position.set(s * 0.12, 0.06, 0.33);
      tara.add(eye, pupil);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 16, Math.PI), mat(0x78350f)); smile.position.set(0, -0.08, 0.27); smile.rotation.z = Math.PI; tara.add(smile);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.42), mat(0xe2e8f0)); ant.position.y = 0.46; tara.add(ant);
    const tip = sphere(0.055, 0xef4444, { emissive: 0xef4444, emissiveIntensity: 2.2 }); tip.position.y = 0.68; tara.add(tip);
    tara.userData.tip = tip;
    tara.userData.onTap = () => onTap({ kind: 'tara' });

    // Tara's solar panel specular glints
    const glintMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float pos = fract(uTime * 0.35);
          float band = exp(-pow((vUv.x + vUv.y * 0.25 - pos * 1.45 + 0.1) * 6.5, 2.0));
          gl_FragColor = vec4(0.88, 0.97, 1.0, band * 0.85);
        }`,
    });
    const glintGeo = new THREE.PlaneGeometry(0.9, 0.42); glintGeo.rotateX(-Math.PI / 2);
    for (const s of [-1, 1]) {
      const gl = new THREE.Mesh(glintGeo, glintMat);
      gl.position.set(s * 0.74, 0.025, 0);
      tara.add(gl);
    }
    tara.userData.glintMat = glintMat;

    // Tara's Earth observation scanning beam & pulsing concentric radar waves
    const beamGeo = new THREE.ConeGeometry(0.7, 3.8, 16, 1, true); beamGeo.rotateX(Math.PI);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.y = -1.9;
    tara.add(beam);
    tara.userData.beam = beam;

    const waveGeo = new THREE.RingGeometry(0.16, 0.23, 24); waveGeo.rotateX(-Math.PI / 2);
    const taraWaves = [];
    for (let k = 0; k < 3; k++) {
      const wm = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      const w = new THREE.Mesh(waveGeo, wm);
      tara.add(w);
      taraWaves.push({ mesh: w, phase: k / 3 });
    }
    tara.userData.waves = taraWaves;
    scene.add(tara);
  }
  const goat = new THREE.Group();
  let goatTail = null, goatHead = null;
  const goatLegs = [];
  {
    const b = box(0.9, 0.45, 0.4, 0xf1ece2); b.position.y = 0.6; goat.add(b);
    goatHead = new THREE.Group(); goatHead.position.set(0.42, 0.78, 0);
    const h = box(0.3, 0.3, 0.28, 0xe6dfd2); h.position.set(0.13, 0.07, 0); goatHead.add(h);
    for (const s of [-1, 1]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 6), mat(0x8a7a62)); horn.position.set(0.13, 0.27, s * 0.08); goatHead.add(horn); }
    goat.add(goatHead);
    goatTail = box(0.08, 0.18, 0.08, 0xdcd5c8); goatTail.position.set(-0.48, 0.72, 0); goatTail.rotation.z = 0.4; goat.add(goatTail);
    for (const [x, z] of [[-0.3, -0.12], [-0.3, 0.12], [0.3, -0.12], [0.3, 0.12]]) {
      const piv = new THREE.Group(); piv.position.set(x, 0.4, z);
      const l = box(0.08, 0.4, 0.08, 0x3a2f28); l.position.set(0, -0.2, 0); piv.add(l);
      goat.add(piv); goatLegs.push(piv);
    }
    goat.visible = false; goat.userData.onTap = () => onTap({ kind: 'goat' }); places.field.add(goat);
  }
  const frog = new THREE.Group();
  let frogThroat = null;
  {
    const lily = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.02, 18), mat(0x15803d)); lily.position.y = 0.01; frog.add(lily);
    const b = sphere(0.22, 0x22c55e); b.scale.set(1, 0.7, 1); b.position.y = 0.14; frog.add(b);
    frogThroat = sphere(0.11, 0xfecdd3, { roughness: 0.4 }); frogThroat.position.set(0, 0.11, 0.16); frogThroat.scale.setScalar(0.5); frog.add(frogThroat);
    for (const s of [-1, 1]) {
      const e = sphere(0.075, 0xffffff); e.position.set(s * 0.1, 0.26, 0.1);
      const pupil = sphere(0.038, 0x0f172a); pupil.position.set(s * 0.1, 0.26, 0.16);
      frog.add(e, pupil);
    }
    frog.visible = false; frog.position.set(0.6, 0.19, -2.5);
    frog.userData.onTap = () => onTap({ kind: 'frog' });
    places.field.add(frog);
  }

  // ── Village Rooster sitting proudly on fence post ──
  const rooster = new THREE.Group();
  let roosterWingL = null, roosterWingR = null, roosterHead = null, roosterBreast = null, roosterBody = null;
  {
    const post = box(0.14, 1.05, 0.14, 0x6b4a2b); post.position.set(-6.5, 0.525, -2.5); rooster.add(post);
    roosterBody = sphere(0.20, 0xd97706); roosterBody.position.set(-6.5, 1.20, -2.5); rooster.add(roosterBody);
    roosterBreast = sphere(0.15, 0xef4444); roosterBreast.position.set(-6.38, 1.22, -2.5); rooster.add(roosterBreast);
    roosterHead = new THREE.Group();
    roosterHead.position.set(-6.32, 1.38, -2.5);
    const headS = sphere(0.09, 0xd97706); roosterHead.add(headS);
    const comb = box(0.04, 0.10, 0.12, 0xdc2626); comb.position.set(0, 0.08, 0); roosterHead.add(comb);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 4), mat(0xfacc15));
    beak.rotation.z = -Math.PI / 2; beak.position.set(0.09, -0.02, 0); roosterHead.add(beak);
    const wattle = sphere(0.035, 0xdc2626); wattle.position.set(0.05, -0.07, 0); roosterHead.add(wattle);
    rooster.add(roosterHead);

    roosterWingL = new THREE.Group(); roosterWingL.position.set(-6.5, 1.28, -2.37);
    const wL = box(0.16, 0.18, 0.035, 0x1e3a8a); wL.position.set(0, -0.07, 0); roosterWingL.add(wL); rooster.add(roosterWingL);
    roosterWingR = new THREE.Group(); roosterWingR.position.set(-6.5, 1.28, -2.63);
    const wR = box(0.16, 0.18, 0.035, 0x1e3a8a); wR.position.set(0, -0.07, 0); roosterWingR.add(wR); rooster.add(roosterWingR);

    // Sickle tail feathers
    for (let k = 0; k < 3; k++) {
      const tail = box(0.30, 0.035, 0.05, 0x064e3b);
      tail.position.set(-6.72 - k * 0.04, 1.30 + k * 0.05, -2.5);
      tail.rotation.z = -0.45 - k * 0.18;
      rooster.add(tail);
    }
    rooster.userData.onTap = () => onTap({ kind: 'rooster' });
    places.field.add(rooster);
  }

  // ── Cute Baby Duckling swimming in the pond beside the plots with water wake ripples ──
  const duckling = new THREE.Group();
  let ducklingSpin = 0;
  {
    const dBody = sphere(0.12, 0xfacc15); dBody.scale.set(1.1, 0.85, 0.9); dBody.position.y = 0.08; duckling.add(dBody);
    const dHead = sphere(0.08, 0xfacc15); dHead.position.set(0.08, 0.16, 0); duckling.add(dHead);
    const dBeak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), mat(0xf97316));
    dBeak.rotation.z = -Math.PI / 2; dBeak.position.set(0.15, 0.15, 0); duckling.add(dBeak);
    for (const s of [-1, 1]) {
      const eye = sphere(0.02, 0x0f172a); eye.position.set(0.11, 0.18, s * 0.05); duckling.add(eye);
    }
    const dTail = sphere(0.04, 0xfacc15); dTail.position.set(-0.11, 0.10, 0); duckling.add(dTail);
    duckling.position.set(6.7, 0.02, -2.4);
    duckling.userData.onTap = () => onTap({ kind: 'duckling' });
    places.field.add(duckling);
  }

  // ── people ──
  const loader = new GLTFLoader();
  const cache = new Map();
  const load = (name) => { if (!cache.has(name)) cache.set(name, loader.loadAsync(`${BASE}${name}.glb`)); return cache.get(name); };
  const people = {}; // role → { root, mixer, actions, now }
  async function addPerson(role, spec) {
    const gltf = await load(spec.model);
    const root = cloneSkinned(gltf.scene);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      o.material = ms.map((m) => { const n = m.clone(); const c = spec.colors[m.name]; if (c) n.color.set(c); return n; });
      if (o.material.length === 1) o.material = o.material[0];
    });
    let headBone = null, neckBone = null, spineBone = null, handBoneR = null;
    root.traverse((o) => {
      if (o.isBone) {
        if (/^Head$/i.test(o.name)) headBone = o;
        else if (/^Neck$/i.test(o.name)) neckBone = o;
        else if (/^Spine2$|^Chest$/i.test(o.name)) spineBone = o;
        else if (/^RightHand$/i.test(o.name)) handBoneR = o;
      }
    });

    if (spec.kid) {
      const age = spec.child?.age ?? 8;
      const kidScale = 0.54 + (age - 7) * 0.032;
      root.scale.setScalar(kidScale);
      const headScale = 1.32 - (age - 7) * 0.02;
      if (headBone) headBone.scale.setScalar(headScale);

      // Child personal story item
      const item = spec.child?.item;
      if (item && handBoneR) {
        if (item === 'boat') {
          const boat = box(0.14, 0.06, 0.08, 0xf6f0e4);
          boat.position.set(0.04, 0.02, 0.06);
          handBoneR.add(boat);
        } else if (item === 'bag' && spineBone) {
          const bag = box(0.24, 0.28, 0.12, 0x2563eb);
          bag.position.set(0, 0.04, -0.14);
          spineBone.add(bag);
        } else if (item === 'kite') {
          const kite = box(0.22, 0.22, 0.015, 0xef4444);
          kite.rotation.z = Math.PI / 4;
          kite.position.set(0.06, 0.08, 0.06);
          handBoneR.add(kite);
        } else if (item === 'pinwheel') {
          const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 6), mat(0xd4a373));
          stick.position.set(0.04, 0.1, 0.04);
          handBoneR.add(stick);
        } else if (item === 'slate') {
          const slate = box(0.14, 0.19, 0.012, 0x1e293b);
          slate.position.set(0.05, 0.02, 0.05);
          handBoneR.add(slate);
        }
      }
    } else if (spec.look && headBone) {
      const l = spec.look;
      if (l.head === 'turban') {
        const turb = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.155, 0.15, 16), mat(l.headA ?? 0xd97736));
        turb.position.set(0, 0.12, 0);
        headBone.add(turb);
      } else if (l.head === 'sindhi') {
        const topi = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.148, 0.085, 16), mat(l.headA ?? 0x991b1b));
        topi.position.set(0, 0.11, 0);
        headBone.add(topi);
      } else if (l.head === 'tupi') {
        const tupi = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.148, 0.065, 16), mat(l.headA ?? 0xffffff));
        tupi.position.set(0, 0.11, 0);
        headBone.add(tupi);
      } else if (l.head === 'mathal') {
        const mathal = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.16, 16), mat(0xd8b56a));
        mathal.position.set(0, 0.14, 0);
        headBone.add(mathal);
      } else if (l.head === 'gamcha') {
        const gam = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.038, 6, 16), mat(l.headA ?? 0xd9383a));
        gam.position.set(0, 0.08, 0);
        gam.rotation.x = Math.PI / 2;
        headBone.add(gam);
      } else if (l.head === 'gaungbaung') {
        const gb = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.032, 6, 16), mat(l.headA ?? 0xf59e0b));
        gb.position.set(0, 0.09, 0);
        gb.rotation.x = Math.PI / 2;
        headBone.add(gb);
      }

      if (spec.id === 'harjinder' && handBoneR) {
        const kara = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.008, 6, 14), mat(0xcccccc, { metalness: 0.85, roughness: 0.2 }));
        kara.position.set(0, 0.02, 0);
        kara.rotation.x = Math.PI / 2;
        handBoneR.add(kara);
      }
    }
    const mixer = new THREE.AnimationMixer(root);
    const actions = Object.fromEntries(gltf.animations.map((a) => [a.name, mixer.clipAction(a)]));
    if (people[role]) { scene.remove(people[role].root); }
    people[role] = { root, mixer, actions, now: null };
    scene.add(root);
    play(role, 'Idle');
    return people[role];
  }
  function play(role, name, { once = false } = {}) {
    const p = people[role];
    if (!p) return;
    const next = p.actions[name] ?? p.actions.Idle;
    if (!next || p.now === next) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    if (p.now) p.now.crossFadeTo(next, 0.35, false);
    next.play();
    p.now = next;
  }
  const place = (role, x, z, ry = 0) => { const p = people[role]; if (p) { p.root.position.set(x, 0, z); p.root.rotation.y = ry; p.root.visible = true; } };
  const hide = (role) => { if (people[role]) people[role].root.visible = false; };

  // ── weather: rain, fireflies (soft round dots and thin streaks, not square points) ──
  const rainGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 3000 }, (_, i) => (i % 3 === 1 ? Math.random() * 14 : (Math.random() - 0.5) * 24)), 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaecbe8, size: 0.22, map: streakTex, transparent: true, opacity: 0.75, depthWrite: false }));
  rain.visible = false; scene.add(rain);
  const flies = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 300 }, (_, i) => (i % 3 === 1 ? Math.random() * 3 + 0.3 : (Math.random() - 0.5) * 10)), 3)), new THREE.PointsMaterial({ color: 0xffe680, size: 0.16, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flies.visible = false; scene.add(flies);

  // ── 3D FX pool: duckling wakes, frog splashes, goat leaves, rainbow bursts, golden fairy sparkles ──
  const fx3dGroup = new THREE.Group();
  places.field.add(fx3dGroup);
  const fxParticles = [], fxRings = [];
  const fxPartGeo = new THREE.SphereGeometry(0.045, 6, 5);
  const fxRingGeo = new THREE.RingGeometry(0.12, 0.165, 22); fxRingGeo.rotateX(-Math.PI / 2);
  let duckWakeT = 0, goatMunchT = 0;
  function spawnRing(x, y, z, col, maxScale = 3.8, dur = 1.0) {
    const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const r = new THREE.Mesh(fxRingGeo, m);
    r.position.set(x, y, z);
    fx3dGroup.add(r);
    fxRings.push({ mesh: r, age: 0, dur, maxScale });
  }
  function spawnBurst3D(pos, colors, count, speed = 2.0, gravity = 3.6, swirl = 0, life = 1.1, size = 1.0) {
    for (let i = 0; i < count; i++) {
      const col = colors[i % colors.length];
      const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1, depthWrite: false, blending: swirl ? THREE.AdditiveBlending : THREE.NormalBlending });
      const sp = new THREE.Mesh(fxPartGeo, m);
      sp.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.2, (Math.random() - 0.5) * 0.4));
      const a = Math.random() * Math.PI * 2;
      const h = (0.35 + Math.random() * 0.7) * speed;
      fx3dGroup.add(sp);
      fxParticles.push({
        mesh: sp,
        vx: Math.cos(a) * h,
        vy: (0.65 + Math.random() * 0.85) * speed,
        vz: Math.sin(a) * h,
        gravity, swirl, life: life * (0.75 + Math.random() * 0.5), maxLife: life, size, age: 0,
      });
    }
  }
  function spawnFrogSplash() {
    const at = new THREE.Vector3(frog.position.x, 0.18, frog.position.z);
    spawnBurst3D(at, [0x93c5fd, 0xe0f2fe, 0x38bdf8], 12, 1.5, 4.8, 0, 0.75, 0.85);
    spawnRing(at.x, 0.19, at.z, 0x7dd3fc, 3.6, 0.9);
  }
  function spawnRainbowBurst(pos) {
    spawnBurst3D(pos, [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93, 0xf472b6], 18, 2.4, 1.4, 1.8, 1.15, 1.2);
    spawnRing(pos.x, pos.y, pos.z, 0xfde047, 5.2, 0.7);
  }
  function spawnFairySparkles(pos) {
    spawnBurst3D(pos.clone().add(new THREE.Vector3(0, 0.35, 0)), [0xfde047, 0xfbbf24, 0xfef9c3, 0xf59e0b], 20, 1.15, -0.45, 3.2, 2.1, 1.15);
    spawnRing(pos.x, 0.16, pos.z, 0xfcd34d, 4.8, 1.2);
  }

  // ── mini-game objects ──
  const clouds = [];
  const hotSpots = [];
  const sprouts = new THREE.Group(); places.field.add(sprouts);
  let soilLevel = 50;
  function cloudMesh(dark) {
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const s = sphere(0.45 + Math.random() * 0.3, dark ? 0x475569 : 0xffffff, { roughness: 0.95 });
      s.position.set((k - 2) * 0.5, Math.random() * 0.25, Math.random() * 0.2);
      g.add(s);
    }
    const arcs = [];
    if (dark) {
      const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), mat(0xfacc15, { emissive: 0xfacc15, emissiveIntensity: 1.5 }));
      bolt.position.set(0, -0.4, 0); bolt.rotation.z = 0.3; g.add(bolt);
      for (let a = 0; a < 2; a++) {
        const pts = [
          new THREE.Vector3((a - 0.5) * 0.65, -0.15, 0.12),
          new THREE.Vector3((a - 0.5) * 0.45 + (a ? -0.18 : 0.18), -0.42, 0.14),
          new THREE.Vector3((a - 0.5) * 0.72, -0.68, 0.1),
          new THREE.Vector3((a - 0.5) * 0.55 + (a ? 0.15 : -0.15), -0.95, 0.12),
        ];
        const lMat = new THREE.LineBasicMaterial({ color: a ? 0x67e8f9 : 0xfef08a, transparent: true, opacity: 0.9 });
        const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lMat);
        g.add(arc);
        arcs.push(arc);
      }
    }
    g.userData = { dark, arcs, onTap: () => { if (!g.userData.gone) { g.userData.gone = true; spawnRainbowBurst(g.position); onTap({ kind: 'cloud', dark, pos: g.position.clone() }); } } };
    return g;
  }
  function cover(p) {
    if (!p.userData.bare) return;
    p.userData.bare = false;
    p.material.color.set(0x3e6b2c);
    const g = new THREE.Group();
    for (let k = 0; k < 10; k++) {
      const sx = (Math.random() - 0.5) * 2.2, sz = (Math.random() - 0.5) * 1.8;
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.38, 5), mat(0x4caf50));
      s.position.set(sx, 0.3, sz); s.scale.setScalar(0.01); g.add(s);
      if (k % 3 === 0) {
        const flower = sphere(0.065, k % 6 === 0 ? 0xfacc15 : 0xf472b6);
        flower.position.set(sx, 0.48, sz); flower.scale.setScalar(0.01); g.add(flower);
      }
    }
    g.position.copy(p.position); g.userData.grow = 0; p.userData.plants = g; sprouts.add(g);
  }
  function uncover(p) {
    if (p.userData.bare && !p.userData.plants) return;
    p.userData.bare = true; p.userData.stressed = false; p.material.color.set(0x8a6a45);
    const pl = p.userData.plants;
    if (pl) {
      pl.parent?.remove(pl);
      pl.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose?.());
        }
      });
      p.userData.plants = null;
    }
  }
  const game = { kind: null, t: 0, goatTarget: null, goatT: 0, munchT: 0 };

  // ── scenes ──
  let mood = 'calm';
  function grade(name) {
    const g = GRADES[name] ?? GRADES.day;
    scene.background = new THREE.Color(g.sky); scene.fog.color.set(g.fog);
    sun.color.set(g.sun); sun.intensity = g.sunI; amb.color.set(g.amb); amb.intensity = g.ambI; lamp.intensity = g.lamp;
    stars.visible = name === 'night' || name === 'space';
  }
  function show(placeName) { for (const [k, g] of Object.entries(places)) g.visible = k === placeName; }
  const camTo = new THREE.Vector3(), lookTo = new THREE.Vector3(), look = new THREE.Vector3();
  const baseCam = new THREE.Vector3(), baseLook = new THREE.Vector3();
  function frame(pos, at) { camTo.set(...pos); lookTo.set(...at); baseCam.copy(camTo); baseLook.copy(lookTo); }

  function setScene(id, m) {
    mood = m ?? mood; focus = null;
    for (const sp of [...fxGroup.children]) { fxGroup.remove(sp); sp.material.dispose(); } // a new place starts clean
    while (fxParticles.length) { const p = fxParticles.pop(); fx3dGroup.remove(p.mesh); p.mesh.material.dispose(); }
    while (fxRings.length) { const r = fxRings.pop(); fx3dGroup.remove(r.mesh); r.mesh.material.dispose(); }
    rain.visible = false; flies.visible = false; frog.visible = false; goat.visible = false;
    for (const c of clouds) places.field.remove(c); clouds.length = 0;
    for (const s of hotSpots) places.field.remove(s); hotSpots.length = 0;
    game.kind = null;
    if (id === 'night') {
      show('night'); grade('night');
      place('parent', -1.6, 0.4, 0.5); place('child', 0.4, 1.2, -0.6); tara.visible = false;
      frame([0.5, 1.6, 4.6], [-0.6, 0.9, 0]);
    } else if (id === 'tara') {
      show('space'); grade('space'); hide('parent'); hide('child');
      tara.visible = true; tara.position.set(1.4, 0.2, -3.5);
      frame([0, 0, 2.5], [0, 0, -9]);
    } else {
      show('field'); grade(id === 'without' ? 'grey' : id === 'with' ? 'gold' : id === 'morning' ? 'dawn' : 'day');
      tara.visible = id !== 'morning'; tara.position.set(2.6, 3.2, -1.5);
      place('child', 1.4, 1.6, -0.4); place('parent', -1.2, 1.2, 0.5);
      frame([0.2, 3.4, 8.5], [0, 0.6, -2.5]);
      if (id === 'without') { rain.visible = true; plots.forEach(uncover); plots.forEach((p) => p.material.color.set(0x5b4a38)); }
      if (id === 'with') { flies.visible = true; plots.forEach(cover); }
      if (id === 'morning') { plots.forEach(cover); frame([0.5, 1.8, 6], [0, 1, 0]); }
    }
    play('parent', id === 'without' ? 'Defeat' : id === 'with' ? 'Victory' : id === 'night' ? 'SitDown' : 'Idle', { once: id === 'night' || id === 'without' });
    play('child', id === 'with' ? 'Victory' : id === 'without' ? 'Defeat' : 'Idle', { once: id === 'without' });
  }

  function startGame(kind) {
    game.kind = kind; game.t = 0;
    if (kind === 'clouds') {
      for (let i = 0; i < 12; i++) { const c = cloudMesh([1, 3, 6, 8, 10].includes(i)); c.scale.setScalar(1.25); c.position.set(-12 - i * 3, 2.6 + Math.random() * 1.4, -3 - Math.random() * 3); places.field.add(c); clouds.push(c); }
    }
    if (kind === 'blanket') {
      plots.forEach((p, i) => (i % 3 === 1 ? cover(p) : uncover(p)));
      plots.forEach((p) => { p.userData.onTap = () => { if (p.userData.bare) { cover(p); onTap({ kind: 'plant' }); } }; });
      goat.visible = true; goat.position.set(7, 0, -3); game.goatT = 0; game.munchT = 0; game.goatTarget = null;
    }
    if (kind === 'health') {
      plots.forEach((p, i) => {
        uncover(p);
        if (i % 2 === 0 || i === 1 || i === 7) {
          p.userData.stressed = true;
          p.userData.bare = false;
          p.material.color.set(0xbfa045);
          const g = new THREE.Group();
          g.position.copy(p.position);
          for (let k = 0; k < 6; k++) {
            const sx = (Math.random() - 0.5) * 2.0, sz = (Math.random() - 0.5) * 1.6;
            const stem = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 5), mat(0xcca040));
            stem.position.set(sx, 0.25, sz); stem.rotation.z = (k % 2 === 0 ? 0.35 : -0.35);
            g.add(stem);
          }
          sprouts.add(g); p.userData.plants = g;
          p.userData.onTap = () => {
            if (p.userData.stressed) {
              uncover(p);
              cover(p);
              spawnFairySparkles(p.position);
              burst('sparkle', 'child');
              onTap({ kind: 'heal' });
            }
          };
        } else {
          cover(p);
        }
      });
      if (tara.userData.beam) tara.userData.beam.material.opacity = 0.32;
    }
    if (kind === 'cool') {
      plots.forEach((p) => cover(p));
      for (const s of hotSpots) places.field.remove(s);
      hotSpots.length = 0;
      plots.forEach((p, i) => {
        if (i % 2 === 1 || i === 0 || i === 8) {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.04, 16), mat(0xef4444, { emissive: 0xef4444, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 }));
          disc.position.copy(p.position); disc.position.y += 0.08;
          disc.userData = {
            hot: true,
            onTap: () => {
              if (disc.userData.hot) {
                disc.userData.hot = false;
                disc.material.color.set(0x38bdf8);
                disc.material.emissive.set(0x38bdf8);
                burst('waterdrop', 'child');
                onTap({ kind: 'cool' });
                setTimeout(() => { places.field.remove(disc); }, 350);
              }
            },
          };
          places.field.add(disc);
          hotSpots.push(disc);
        }
      });
    }
    if (kind === 'water') { soilLevel = 20; setWater(20); }
  }
  function stopGame() {
    plots.forEach((p) => { p.userData.onTap = null; p.userData.stressed = false; });
    goat.visible = false;
    for (const s of hotSpots) places.field.remove(s);
    hotSpots.length = 0;
    if (tara.userData.beam) tara.userData.beam.material.opacity = 0.16;
    game.kind = null;
  }
  function setWater(level) {
    soilLevel = level;
    const dry = new THREE.Color(0xb08a5a), moist = new THREE.Color(0x5a4028), wet = new THREE.Color(0x4a6f8a);
    const c = level < 50 ? dry.clone().lerp(moist, level / 50) : moist.clone().lerp(wet, (level - 50) / 50);
    plots.forEach((p) => { if (p.userData.bare) p.material.color.copy(c); });
    frog.visible = level > 72;
  }
  const blanketState = () => ({ covered: plots.filter((p) => !p.userData.bare).length, total: plots.length });

  // ── input: mouse, touch, XR controllers ──
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hit(objects) {
    const hits = ray.intersectObjects(objects, true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.onTap) o = o.parent; if (o?.userData.onTap && o.visible !== false) { o.userData.onTap(); return true; } }
    return false;
  }
  const tappables = () => [earth, tara, frog, goat, rooster, duckling, ...clouds, ...plots, ...hotSpots];
  function onPointer(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    hit(tappables());
  }
  renderer.domElement.addEventListener('pointerdown', onPointer);
  const tmp = new THREE.Matrix4();
  for (let i = 0; i < 2; i++) {
    const ctl = renderer.xr.getController(i);
    ctl.addEventListener('select', () => { tmp.identity().extractRotation(ctl.matrixWorld); ray.ray.origin.setFromMatrixPosition(ctl.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(tmp); if (!hit(tappables())) onTap({ kind: 'next' }); });
    rig.add(ctl);
  }

  // ── a speech bubble in the world (the page's bubbles cannot be seen inside a VR headset) ──
  const FONT = '"Noto Sans Bengali Variable", "Kohinoor Bangla", system-ui, sans-serif';
  const bubbleCanvas = document.createElement('canvas'); bubbleCanvas.width = 1024; bubbleCanvas.height = 320;
  const bubbleTex = new THREE.CanvasTexture(bubbleCanvas); bubbleTex.colorSpace = THREE.SRGBColorSpace;
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, depthTest: false, transparent: true }));
  bubble.scale.set(2.4, 0.75, 1); bubble.renderOrder = 10; bubble.visible = false; scene.add(bubble);
  let bubbleRole = null, alwaysBubble = false;
  function drawBubble(text, who) {
    const g = bubbleCanvas.getContext('2d'), W = 1024, H = 320;
    g.clearRect(0, 0, W, H);
    g.fillStyle = { tara: '#fff6c2', child: '#dff1ff', frog: '#e3f7dc' }[who] ?? '#fff1dc';
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 6;
    g.beginPath(); g.roundRect(8, 8, W - 16, H - 60, 48); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(W / 2 - 30, H - 54); g.lineTo(W / 2, H - 8); g.lineTo(W / 2 + 30, H - 54); g.fill();
    g.fillStyle = '#1b2620'; g.font = `600 44px ${FONT}`; g.textBaseline = 'top';
    const words = String(text).split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (g.measureText(t).width > W - 90 && cur) { lines.push(cur); cur = w; } else cur = t; }
    lines.push(cur);
    lines.slice(0, 4).forEach((l, i) => g.fillText(l, 44, 34 + i * 56));
    bubbleTex.needsUpdate = true;
  }
  function anchorOf(role) {
    if (role === 'tara' || role === 'frog') return (role === 'tara' ? tara : frog).position.clone().add(new THREE.Vector3(0, role === 'tara' ? 0.9 : 0.8, 0));
    const p = people[role]; if (!p) return null;
    return p.root.position.clone().add(new THREE.Vector3(0, role === 'child' ? 1.75 : 2.55, 0));
  }

  // ── feelings you can see: hearts, tears, confetti ──
  const fxGroup = new THREE.Group(); scene.add(fxGroup);
  const emojiTex = {};
  const texOf = (ch) => { if (!emojiTex[ch]) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.font = '100px system-ui, "Apple Color Emoji", "Noto Color Emoji"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 70); emojiTex[ch] = new THREE.CanvasTexture(c); emojiTex[ch].colorSpace = THREE.SRGBColorSpace; } return emojiTex[ch]; };
  function burst(kind, role = 'child') {
    const at = anchorOf(role) ?? new THREE.Vector3(0, 1.5, 0);
    const spec = {
      hearts: ['💗', 12, 1.2],
      tears: ['💧', 8, -1.2],
      confetti: ['🎉', 8, 1.6],
      stars: ['⭐', 12, 1.4],
      sparkle: ['✨', 12, 1.1],
      rainbow: ['🌈', 5, 1.3],
      flower: ['🌸', 10, 1.2],
      waterdrop: ['💧', 8, -1.0],
      notes: ['🎵', 8, 1.2],
    }[kind];
    if (!spec) return;
    const [ch, n, up] = spec;
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(ch), transparent: true, depthTest: false }));
      sp.scale.setScalar(kind === 'tears' ? 0.12 : 0.3);
      sp.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * (kind === 'tears' ? 0.15 : 0.8), kind === 'tears' ? -0.45 : 0, (Math.random() - 0.5) * 0.3));
      sp.userData = { v: new THREE.Vector3((Math.random() - 0.5) * 0.6, up * (0.6 + Math.random() * 0.6), 0), life: 1.6 + Math.random() * 0.8, delay: kind === 'tears' ? i * 0.35 : 0 };
      fxGroup.add(sp);
    }
  }

  // ── a close-up on whoever speaks a line that matters ──
  let focus = null;
  function closeUp(role) { focus = role; }

  // ── dynamic reactive state ──
  let taraSpin = 0, frogJump = 0, goatHop = 0, roosterCrow = 0;

  // ── the loop ──
  const clock = new THREE.Timer(); // THREE.Clock is deprecated
  look.set(0, 1, 0);
  renderer.setAnimationLoop(() => {
    clock.update(); const dt = Math.min(clock.getDelta(), 0.05), t = clock.getElapsed();
    for (const p of Object.values(people)) p.mixer.update(dt);
    if (!renderer.xr.isPresenting) {
      // a tall phone screen sees less from side to side: step back so everyone stays in the picture
      const back = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 1.15 : 1;
      const want = lookTo.clone().add(camTo.clone().sub(lookTo).multiplyScalar(back));
      camera.position.lerp(want.add(new THREE.Vector3(Math.sin(t * 0.3) * 0.15, Math.sin(t * 0.4) * 0.06, 0)), 0.04);
      look.lerp(lookTo, 0.05); camera.lookAt(look);
    }

    // Shooting stars in night & space sky
    shootTimer -= dt;
    if (shootTimer <= 0 && (places.night.visible || places.space.visible)) {
      shootTimer = 4.0 + Math.random() * 4.5;
      shooting = true; shootProgress = 0;
      shootStart.set((Math.random() - 0.5) * 60 + 15, 20 + Math.random() * 12, -35 - Math.random() * 25);
      shootDir.set(-1.1 - Math.random() * 0.6, -0.45 - Math.random() * 0.35, 0.2 + Math.random() * 0.3).normalize();
      shootingStar.quaternion.setFromUnitVectors(_shootUp, shootDir);
    }
    if (shooting) {
      shootProgress += dt * 1.8;
      const cur = shootStart.clone().addScaledVector(shootDir, shootProgress * 42);
      shootingStar.position.copy(cur);
      shootMat.opacity = Math.sin(Math.min(1, shootProgress) * Math.PI) * 0.85;
      if (shootProgress >= 1) { shooting = false; shootMat.opacity = 0; }
    }

    tara.position.y += Math.sin(t * 2) * 0.005;
    tara.rotation.z = Math.sin(t * 1.3) * 0.12;
    if (tara.userData.glintMat) tara.userData.glintMat.uniforms.uTime.value = t;
    if (tara.userData.beam) tara.userData.beam.material.opacity = 0.12 + Math.sin(t * 3.5) * 0.05;
    if (tara.userData.waves) {
      for (const w of tara.userData.waves) {
        const age = (t * 0.55 + w.phase) % 1;
        w.mesh.position.y = -0.3 - age * 3.2;
        w.mesh.scale.setScalar(1 + age * 2.8);
        w.mesh.material.opacity = Math.sin(age * Math.PI) * 0.58;
      }
    }
    if (taraSpin > 0) {
      const step = Math.min(taraSpin, dt * 16);
      tara.rotation.y += step;
      taraSpin -= step;
    }
    tara.userData.tip.material.emissiveIntensity = 1.5 + Math.sin(t * 6);
    if (stars.visible) starMat.uniforms.uTime.value = t;
    if (places.night.visible) {
      const flicker = 3.0 + Math.sin(t * 8) * 0.35 + Math.cos(t * 13) * 0.15;
      lamp.intensity = flicker;
      const pulse = flicker / 3.0;
      if (lanternHaloMat) lanternHaloMat.uniforms.uPulse.value = pulse;
      if (lanternGlowSprite) lanternGlowSprite.material.opacity = 0.42 * pulse;
      for (const wm of nightWindowMats) wm.emissiveIntensity = 1.35 + Math.sin(t * 5.5) * 0.25;
      if (nightFliesMat) nightFliesMat.uniforms.uTime.value = t;
    }
    if (!earth.userData.hold) earth.rotation.y += dt * 0.05; else earth.rotation.y += (0 - earth.rotation.y) * 0.05;
    if (earthClouds) earthClouds.rotation.y += dt * 0.042;
    home.scale.setScalar(earth.userData.hold ? 1.4 + Math.sin(t * 5) * 0.4 : 1); home.material.emissiveIntensity = 2 + Math.sin(t * 5) * 1.5;
    if (rain.visible) { const a = rainGeo.attributes.position.array; for (let i = 1; i < a.length; i += 3) { a[i] -= dt * 14; if (a[i] < 0) a[i] = 14; } rainGeo.attributes.position.needsUpdate = true; }
    if (flies.visible) flies.rotation.y += dt * 0.2;
    sprouts.children.forEach((g) => {
      if (g.userData.grow < 1) {
        g.userData.grow = Math.min(1, g.userData.grow + dt * 2.1);
        const n = Math.max(1, g.children.length);
        g.children.forEach((s, idx) => {
          const u = Math.max(0, Math.min(1, g.userData.grow * 1.3 - (idx / n) * 0.3));
          s.scale.setScalar(Math.max(0.01, springOvershoot(u)));
        });
      }
    });
    if (frogJump > 0) {
      frogJump -= dt * 1.6;
      if (frogJump <= 0) spawnFrogSplash();
      frog.position.y = 0.19 + Math.sin(Math.max(0, 1 - Math.max(0, frogJump)) * Math.PI) * 1.1;
      frog.rotation.x = Math.sin(Math.max(0, 1 - Math.max(0, frogJump)) * Math.PI * 2) * 2;
      if (frogThroat) frogThroat.scale.setScalar(0.55);
    } else if (frog.visible) {
      frog.rotation.x = 0;
      frog.position.y = 0.19 + Math.abs(Math.sin(t * 4)) * 0.25;
      if (frogThroat) {
        const ribbit = Math.pow(Math.max(0, Math.sin(t * 2.8)), 3);
        frogThroat.scale.setScalar(0.45 + ribbit * 0.95);
      }
      if (soilLevel >= 45 && soilLevel <= 65) frog.rotation.y = t * 3; else frog.rotation.y = 0;
    }
    if (goatHop > 0) {
      goatHop -= dt * 2.2;
      goat.position.y = Math.sin(Math.max(0, 1 - goatHop) * Math.PI) * 0.75;
      if (goatTail) goatTail.rotation.z = Math.sin(t * 18) * 0.5;
      goatLegs.forEach((leg, idx) => { leg.rotation.z = (idx < 2 ? -0.45 : 0.45); });
      if (goatHead) goatHead.rotation.z = 0.25;
    }
    if (roosterCrow > 0) {
      roosterCrow -= dt * 1.6;
      const p = 1 - Math.max(0, roosterCrow);
      const flap = Math.sin(p * Math.PI * 8);
      const puff = Math.sin(p * Math.PI);
      if (roosterWingL && roosterWingR) {
        roosterWingL.rotation.x = Math.abs(flap) * 0.75;
        roosterWingR.rotation.x = -Math.abs(flap) * 0.75;
        roosterWingL.rotation.z = flap * 0.35;
        roosterWingR.rotation.z = -flap * 0.35;
      }
      if (roosterHead) roosterHead.rotation.z = puff * 0.55;
      if (roosterBreast) roosterBreast.scale.setScalar(1 + puff * 0.32);
      if (roosterBody) roosterBody.scale.setScalar(1 + puff * 0.14);
    } else {
      if (roosterWingL && roosterWingR) {
        roosterWingL.rotation.set(0, 0, 0);
        roosterWingR.rotation.set(0, 0, 0);
      }
      if (roosterHead) roosterHead.rotation.z = Math.sin(t * 1.5) * 0.08;
      if (roosterBreast) roosterBreast.scale.setScalar(1);
      if (roosterBody) roosterBody.scale.setScalar(1);
    }
    if (ducklingSpin > 0) {
      const step = Math.min(ducklingSpin, dt * 14);
      duckling.rotation.y += step;
      ducklingSpin -= step;
    } else {
      duckling.position.x = 6.7 + Math.cos(t * 1.1) * 0.42;
      duckling.position.z = -2.4 + Math.sin(t * 1.1) * 0.42;
      duckling.rotation.y = -t * 1.1 - Math.PI / 2;
      duckling.position.y = 0.02 + Math.sin(t * 3.5) * 0.012;
    }
    if (places.field.visible && duckling.visible) {
      duckWakeT -= dt;
      if (duckWakeT <= 0) {
        duckWakeT = ducklingSpin > 0 ? 0.12 : 0.34;
        spawnRing(duckling.position.x, 0.028, duckling.position.z, 0xbae6fd, ducklingSpin > 0 ? 4.2 : 2.8, 1.0);
      }
    }
    if (game.kind === 'clouds') {
      game.t += dt;
      clouds.forEach((c, idx) => {
        c.position.x += dt * (1.6 + (c.userData.dark ? 0.6 : 0));
        if (c.userData.gone) c.scale.multiplyScalar(0.85);
        else if (c.userData.dark && c.userData.arcs?.length) {
          c.userData.arcs.forEach((arc, ai) => {
            const flash = Math.sin(t * 19 + idx * 3.1 + ai * 2.4) * Math.sin(t * 7.3 + idx);
            arc.visible = flash > 0.32;
            arc.material.opacity = flash > 0.32 ? 0.95 : 0;
          });
        }
      });
    }
    if (game.kind === 'blanket') {
      game.goatT += dt;
      if (goatTail) goatTail.rotation.z = 0.35 + Math.sin(t * 14) * 0.4;
      if (!game.goatTarget || game.goatTarget.userData.bare || game.goatT > 9.5) {
        const covered = plots.filter((p) => !p.userData.bare);
        game.goatTarget = covered[Math.floor(Math.random() * covered.length)] ?? null;
        game.goatT = 0; game.munchT = 0;
      }
      let trotting = false, munching = false;
      if (game.goatTarget) {
        const to = game.goatTarget.position.clone().setY(0), d = to.clone().sub(goat.position);
        if (d.length() > 0.35) {
          trotting = true;
          game.munchT = 0;
          goat.position.addScaledVector(d.normalize(), dt * 1.5);
          goat.lookAt(to.x, 0, to.z); goat.rotateY(-Math.PI / 2);
        } else {
          munching = true;
          game.munchT += dt;
          if (game.munchT > 1.45) {
            uncover(game.goatTarget);
            onTap({ kind: 'eaten' });
            game.goatTarget = null; game.goatT = 0; game.munchT = 0;
          }
        }
      }
      if (goatHop <= 0) {
        if (trotting) {
          const stride = Math.sin(t * 14) * 0.52;
          goatLegs.forEach((leg, idx) => { leg.rotation.z = idx === 0 || idx === 3 ? stride : -stride; });
          if (goatHead) goatHead.rotation.z = Math.sin(t * 7) * 0.08;
          goat.position.y = Math.abs(Math.sin(t * 14)) * 0.055;
        } else if (munching) {
          goatLegs.forEach((leg) => { leg.rotation.z = 0; });
          if (goatHead) goatHead.rotation.z = -0.45 + Math.sin(t * 16) * 0.16;
          goat.position.y = 0;
          goatMunchT -= dt;
          if (goatMunchT <= 0 && game.goatTarget) {
            goatMunchT = 0.28;
            spawnBurst3D(game.goatTarget.position.clone().add(new THREE.Vector3(0, 0.3, 0)), [0x4ade80, 0x86efac], 3, 0.85, 3.2, 0, 0.55, 0.7);
          }
        } else {
          goatLegs.forEach((leg) => { leg.rotation.z = 0; });
          if (goatHead) goatHead.rotation.z = Math.sin(t * 2.5) * 0.06;
          goat.position.y = 0;
        }
      }
    }
    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const p = fxParticles[i];
      p.age += dt;
      if (p.age >= p.life) {
        fx3dGroup.remove(p.mesh); p.mesh.material.dispose(); fxParticles.splice(i, 1); continue;
      }
      p.vy -= p.gravity * dt;
      if (p.swirl) {
        const a = p.swirl * dt, nx = p.vx * Math.cos(a) - p.vz * Math.sin(a), nz = p.vx * Math.sin(a) + p.vz * Math.cos(a);
        p.vx = nx; p.vz = nz;
      }
      p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
      const u = p.age / p.life;
      p.mesh.scale.setScalar(p.size * (1 - u * 0.7));
      p.mesh.material.opacity = Math.sin((1 - u) * Math.PI * 0.5);
    }
    for (let i = fxRings.length - 1; i >= 0; i--) {
      const r = fxRings[i];
      r.age += dt;
      if (r.age >= r.dur) {
        fx3dGroup.remove(r.mesh); r.mesh.material.dispose(); fxRings.splice(i, 1); continue;
      }
      const u = r.age / r.dur;
      r.mesh.scale.setScalar(1 + u * r.maxScale);
      r.mesh.material.opacity = 0.72 * (1 - u);
    }
    const showBubble = (renderer.xr.isPresenting || alwaysBubble) && bubbleRole;
    bubble.visible = !!showBubble;
    if (showBubble) { const a = anchorOf(bubbleRole); if (a) bubble.position.lerp(a, 0.2); }
    for (const sp of [...fxGroup.children]) {
      const u = sp.userData;
      if (u.delay > 0) { u.delay -= dt; sp.visible = false; continue; }
      sp.visible = true; u.life -= dt; sp.position.addScaledVector(u.v, dt); sp.material.opacity = Math.min(1, u.life);
      if (u.life <= 0) { fxGroup.remove(sp); sp.material.dispose(); }
    }
    if (focus && !renderer.xr.isPresenting) {
      const a = anchorOf(focus);
      if (a) { lookTo.lerp(a.clone().add(new THREE.Vector3(0, -0.25, 0)), 0.08); camTo.lerp(a.clone().add(new THREE.Vector3(0.6, 0.1, 2.6)), 0.05); }
    } else { camTo.lerp(baseCam, 0.05); lookTo.lerp(baseLook, 0.05); }
    renderer.render(scene, camera);
  });

  const onResize = () => { camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); };
  window.addEventListener('resize', onResize);

  return {
    renderer,
    async cast(parentSpec, kidSpec) { await Promise.all([addPerson('parent', parentSpec), addPerson('child', kidSpec)]); },
    setScene, startGame, stopGame, setWater, blanketState, play,
    dropMist() {
      burst('waterdrop', 'child');
      const hot = hotSpots.find((h) => h.userData.hot);
      if (hot) {
        hot.userData.hot = false;
        hot.material.color.set(0x38bdf8);
        hot.material.emissive.set(0x38bdf8);
        setTimeout(() => { places.field.remove(hot); }, 350);
      }
    },
    healthState() {
      const healed = plots.filter((p) => !p.userData.bare && !p.userData.stressed).length;
      return { healed, total: 6 };
    },
    say(line) { if (!line) { bubbleRole = null; return; } drawBubble(line.text, line.who); bubbleRole = line.who; },
    showBubbles(on) { alwaysBubble = on; },
    burst, closeUp,
    wide() { focus = null; },
    spinTara() { taraSpin = Math.PI * 2; },
    jumpFrog() { frogJump = 1.0; spawnFrogSplash(); },
    crowRooster() { roosterCrow = 1.0; burst('notes', 'child'); },
    spinDuckling() { ducklingSpin = Math.PI * 2; },
    holdEarth(on) { earth.userData.hold = on; if (on) earth.rotation.y %= Math.PI * 2; },
    shooGoat() { goatHop = 1.0; if (game.kind === 'blanket') { goat.position.set(8, 0, -3); game.goatTarget = null; game.goatT = 0; game.munchT = 0; } },
    cloudsLeft() { return clouds.filter((c) => !c.userData.gone && c.position.x < 14).length; },
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointer);
      dotTex.dispose(); streakTex.dispose(); cloudsTex.dispose(); bubbleTex.dispose();
      Object.values(emojiTex).forEach((t) => t.dispose());
      fxPartGeo.dispose(); fxRingGeo.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose?.());
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

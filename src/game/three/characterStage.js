// The people of মাঠের মানুষ on a studio turntable, in the style of an open-world game's character screen: a dark
// stage, a warm key light and a cold rim light, a slow orbiting camera. Each farmer stands in a rigged, animated body
// (public/models/people, CC0) dressed in their own colours, with their child beside them. Bodies come from
// dreamScene.js (bodyFor, kidBody) so the two pages show the same people.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createFallbackPerson, disposePerson } from './personModels.js';
import { previewFrame } from '../previewMotion.js';

const BASE = `${import.meta.env.BASE_URL || './'}models/people/`;

export function createCharacterStage(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap was removed from three.js
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.cursor = 'grab';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1712);
  scene.fog = new THREE.Fog(0x0d1712, 8, 22);
  const camera = new THREE.PerspectiveCamera(32, host.clientWidth / host.clientHeight, 0.1, 100);

  // light: warm key from the front left, cold rim from behind, a soft fill, a floor spot
  const key = new THREE.SpotLight(0xffd9a8, 60, 20, 0.5, 0.6, 1.4); key.position.set(-3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; // no striping on skin
  const rim = new THREE.DirectionalLight(0x7fd4ff, 2.6); rim.position.set(2, 3, -4);
  const rim2 = new THREE.DirectionalLight(0xff9a6a, 1.2); rim2.position.set(-3, 2, -3);
  const fill = new THREE.HemisphereLight(0x9fb8a8, 0x1a1410, 0.6);
  scene.add(key, key.target, rim, rim2, fill);

  // the stage: a dark disc with a glowing ring, and a field of paddy-gold dust in the air
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x1d2a22, roughness: 0.4, metalness: 0.3 }));
  disc.position.y = -0.06; disc.receiveShadow = true; scene.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.025, 8, 96), new THREE.MeshStandardMaterial({ color: 0x8be08a, emissive: 0x4caf50, emissiveIntensity: 2.5 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.005; scene.add(ring);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x0f1a14, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.12; floor.receiveShadow = true; scene.add(floor);
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, i) => (i % 3 === 1 ? Math.random() * 5 : (Math.random() - 0.5) * 12)), 3)), new THREE.PointsMaterial({ color: 0xffd98a, size: 0.025, transparent: true, opacity: 0.6 }));
  scene.add(dust);

  const loader = new GLTFLoader(), cache = new Map();
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;
  const load = (n) => {
    if (!cache.has(n)) {
      const request = loader.loadAsync(`${BASE}${n}.glb`).catch((error) => {
        if (cache.get(n) === request) cache.delete(n);
        throw error;
      });
      cache.set(n, request);
    }
    return cache.get(n);
  };
  const cast = [];
  async function person(spec, x) {
    let gltf;
    try { gltf = await load(spec.model); }
    catch (error) {
      console.warn(`Character model ${spec.model} could not be loaded; using the built-in fallback.`, error);
      return { ...createFallbackPerson(spec, x), mixer: null, actions: {}, now: null };
    }
    const root = cloneSkinned(gltf.scene);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; // they cast onto the stage; self-shadowing on low-poly bodies only draws stripes
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      o.material = ms.map((m) => { const n = m.clone(); const c = spec.colors[m.name]; if (c) n.color.set(c); n.roughness = m.name === 'Skin' ? 0.55 : 0.75; return n; });
      if (o.material.length === 1) o.material = o.material[0];
    });
    if (spec.kid) {
      const age = spec.child?.age ?? 8;
      const kidScale = 0.54 + (age - 7) * 0.032;
      root.scale.setScalar(kidScale);
      const headScale = 1.32 - (age - 7) * 0.02;
      root.traverse((o) => { if (o.isBone && /^Head$/i.test(o.name)) o.scale.setScalar(headScale); });
    }
    root.position.x = x;
    const mixer = new THREE.AnimationMixer(root);
    const actions = Object.fromEntries(gltf.animations.map((a) => [a.name, mixer.clipAction(a)]));
    return { root, mixer, actions, now: null };
  }
  function play(p, name, once = false) {
    const a = p.actions[name] ?? p.actions.Idle;
    if (!a || p.now === a) return;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once;
    if (p.now) p.now.crossFadeTo(a, 0.3, false);
    a.play(); p.now = a;
    if (once) setTimeout(() => play(p, 'Idle'), (a.getClip().duration * 1000) | 0);
  }

  let token = 0;
  let activeAdultAction = 'Victory';
  let activeKidAction = 'Jump';

  async function show(adult, kid) {
    const my = ++token;
    const [a, k] = await Promise.all([person(adult, -0.35), person(kid, 0.75)]);
    if (my !== token) { disposePerson(a); disposePerson(k); return; } // a newer pick came in while these loaded
    for (const p of cast.splice(0)) { scene.remove(p.root); disposePerson(p); }
    cast.push(a, k);
    scene.add(a.root, k.root);
    if (!reducedMotion) {
      play(a, activeAdultAction, activeAdultAction === 'Victory');
      play(k, activeKidAction, activeKidAction === 'Jump');
    }
    spin = -0.6;
  }

  // Camera & Turntable Drag Controls
  const clock = new THREE.Timer(); // THREE.Clock is deprecated
  let spin = 0, angle = 0.35;
  let autoRotate = true;
  let isDragging = false, dragStartX = 0;
  let camMode = 'full'; // 'full' | 'portrait' | 'action'
  let curR = 5.6, curY = 1.45, curLookX = 0.15, curLookY = 1.05;

  const onPointerDown = (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    renderer.domElement.style.cursor = 'grabbing';
  };
  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    dragStartX = e.clientX;
    angle -= dx * 0.007;
    spin = -dx * 0.004;
  };
  const onPointerUp = () => {
    isDragging = false;
    renderer.domElement.style.cursor = 'grab';
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  const onMotionPreference = (event) => {
    reducedMotion = event.matches;
    spin = 0;
    if (reducedMotion) for (const p of cast) { p.mixer?.stopAllAction(); p.now = null; }
  };
  motionQuery.addEventListener?.('change', onMotionPreference);

  renderer.setAnimationLoop(() => {
    clock.update(); const dt = Math.min(clock.getDelta(), 0.05), t = clock.getElapsed();
    const motion = previewFrame({ dt, t, angle, spin, reduced: reducedMotion });

    if (autoRotate && !isDragging) {
      angle = motion.angle;
    }
    spin = motion.spin;

    if (!reducedMotion) {
      for (const p of cast) p.mixer?.update(dt);
    }

    // Camera target configuration based on framing mode
    const isMobile = camera.aspect < 1;
    let targetR, targetY, targetLookX, targetLookY;

    if (camMode === 'portrait') {
      targetR = isMobile ? 3.4 : 2.5;
      targetY = 1.46;
      targetLookX = -0.35; // adult center
      targetLookY = 1.42;
    } else if (camMode === 'action') {
      targetR = isMobile ? 6.2 : 4.4;
      targetY = 0.95;
      targetLookX = -0.15;
      targetLookY = 0.88;
    } else {
      // 'full'
      targetR = isMobile ? 9.2 : 5.6;
      targetY = motion.cameraY;
      targetLookX = 0.15;
      targetLookY = isMobile ? 1.75 : 1.05;
    }

    // Smooth cinematic camera pan
    const lerpK = Math.min(1, dt * 5);
    curR += (targetR - curR) * lerpK;
    curY += (targetY - curY) * lerpK;
    curLookX += (targetLookX - curLookX) * lerpK;
    curLookY += (targetLookY - curLookY) * lerpK;

    camera.position.set(Math.sin(angle) * curR, curY, Math.cos(angle) * curR);
    camera.lookAt(curLookX, curLookY, 0);

    ring.material.emissiveIntensity = motion.ringIntensity;
    dust.rotation.y += motion.dustDelta;
    renderer.render(scene, camera);
  });

  const onResize = () => { camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); };
  window.addEventListener('resize', onResize);

  return {
    show,
    cheer() {
      if (!reducedMotion) {
        if (cast[0]) play(cast[0], 'Victory', true);
        if (cast[1]) play(cast[1], 'Jump', true);
      }
    },
    playAction(name, target = 'adult', loop = true) {
      if (reducedMotion) return;
      if (target === 'adult' || target === 'both') {
        activeAdultAction = name;
        if (cast[0]) play(cast[0], name, !loop);
      }
      if (target === 'kid' || target === 'both') {
        const kidAction = ['SwordSlash', 'PickUp'].includes(name) ? 'Jump' : name;
        activeKidAction = kidAction;
        if (cast[1]) play(cast[1], kidAction, !loop);
      }
    },
    setCameraMode(mode) {
      camMode = mode;
    },
    toggleSpin() {
      autoRotate = !autoRotate;
      return autoRotate;
    },
    setAutoRotate(enabled) {
      autoRotate = !!enabled;
    },
    rotateBy(delta) {
      angle += delta;
      spin = delta * 0.4;
    },
    dispose() {
      token++;
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      for (const p of cast.splice(0)) { scene.remove(p.root); disposePerson(p); }
      renderer.setAnimationLoop(null);
      motionQuery.removeEventListener?.('change', onMotionPreference);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

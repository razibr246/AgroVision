// The village around the farm (from places.js): neighbours in the clothes of the place going about their day —
// walking the paths, bent over their own plots, waiting at the market — who greet the farmer as they pass and hurry
// to the safe ground when the storm comes; and signboards on the shop, the market, the kiosk and the shelter,
// written in the local script. Human intelligence, needs, memory, and reciprocal social interactions are powered
// by npcMind.js.
import * as THREE from 'three';
import { buildFarmer, animate, canvasTex, mat } from './people.js';
import { resolve, inWater } from '../layout.js';
import { keepApart } from '../footing.js';
import { spot } from '../places.js';
import {
  createNpcMind,
  updateNpcNeeds,
  getNpcActionGoal,
  recordPlayerInteraction,
  generateContextualDialogue,
  computeObstacleAvoidance,
} from '../npcMind.js';
import { dayPhase } from '../sim.js';
import { officeOf, officerLook } from '../office.js';
import { cropLook, cropAtlas, cropCards, CROP_COLS } from './plants.js';
let beanMatCache = null, beanDepth = null;
import { siteKind, newJob, nextStep, finishStep, toWorld, SITE, ROW } from '../villagework.js';

const FONT = '"Hind Siliguri", "Noto Sans Bengali", "Noto Sans Gurmukhi", "Noto Naskh Arabic", "Noto Sans Devanagari", "Noto Sans Myanmar", system-ui, sans-serif';
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};

function signTex(key, sign, rtl) {
  return canvasTex(key, 512, 160, (c, w, h) => {
    c.fillStyle = '#f6f1e3'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f5a34'; c.fillRect(0, 0, w, 12); c.fillRect(0, h - 12, w, 12);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = sign.sub ? 56 : 64;
    const fit = () => { c.font = `700 ${size}px ${FONT}`; while (c.measureText(sign.t).width > w - 44 && size > 20) { size -= 2; c.font = `700 ${size}px ${FONT}`; } };
    c.direction = rtl ? 'rtl' : 'ltr'; fit();
    c.fillStyle = '#17321f'; c.fillText(sign.t, w / 2, sign.sub ? h * 0.42 : h / 2 + 3);
    if (sign.sub) { c.direction = 'ltr'; c.font = `600 26px system-ui, sans-serif`; c.fillStyle = '#56645a'; c.fillText(sign.sub, w / 2, h * 0.79); }
  });
}

// A board on two posts beside each station, turned to face the field, on whichever side keeps it off the path.
function signs(scene, g) {
  const H = g.home, L = g.L, out = [];
  const wood = mat('#6b4a2b'), back = mat('#e9e2cf');
  for (const id of ['shed', 'market', 'kiosk', 'safe', 'office']) {
    if (!g.S[id]) continue;
    const sign = H.signs[id]; if (!sign) continue;
    const s = g.S[id], l = Math.hypot(s.x, s.z), dx = -s.x / l, dz = -s.z / l;
    const cand = [1, -1].map((side) => {
      const x = s.x + dx * (s.r + 0.9) + -dz * 2.1 * side, z = s.z + dz * (s.r + 0.9) + dx * 2.1 * side;
      let clear = 99; for (const p of L.paths) for (let k = 1; k < p.length; k++) clear = Math.min(clear, segDist(x, z, p[k - 1], p[k]));
      for (const b of L.blockers) clear = Math.min(clear, Math.hypot(x - b.x, z - b.z) - (b.r ?? Math.max(b.hw, b.hd)));
      return { x, z, clear: inWater(L, x, z) ? -99 : clear };
    }).sort((a, b) => b.clear - a.clear)[0];
    const grp = new THREE.Group(); grp.position.set(cand.x, L.ground(cand.x, cand.z), cand.z); grp.rotation.y = Math.atan2(dx, dz);
    for (const sx of [-0.95, 0.95]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.3, 6), wood); p.position.set(sx, 1.15, 0); p.castShadow = true; grp.add(p); }
    const face = mat('#fff', { map: signTex(`sign${g.id}${id}`, sign, H.signs.rtl) });
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.72, 0.06), [wood, wood, wood, wood, face, back]);
    board.position.set(0, 1.95, 0.04); board.castShadow = true; grp.add(board);
    scene.add(grp); out.push(grp);
  }
  return out;
}

export function createLife(scene, g, overlay, lang = 'en') {
  const H = g.home, L = g.L;
  if (!H) return { update() {}, dots: () => [], setLang() {}, setHerd() {}, dispose() {} };
  const boards = signs(scene, g);
  const T = (o) => (o ? o[lang] ?? o.en ?? o.bn : '');
  const el = (cls) => { const d = document.createElement('div'); d.className = cls; d.style.display = 'none'; overlay.appendChild(d); return d; };
  // the agriculture officer, on the office verandah (office.js): a neighbour like the others, who greets farmers
  const off = g.S.office && officeOf(g.R.country), offL = g.S.office && (Math.hypot(g.S.office.x, g.S.office.z) || 1);
  const officer = off ? [{
    id: 'officer', name: off.officer.name, look: officerLook(g.R.country), does: 'stand',
    at: [g.S.office.x + (g.S.office.x / offL) * 1.6, g.S.office.z + (g.S.office.z / offL) * 1.6],
    hello: { bn: 'আসুন, বসুন! মাঠের কী অবস্থা? ভেতরে এসে বলুন, একসাথে দেখি।', en: 'Come in, sit down! How is the field? Come inside and tell me, we’ll look together.' },
  }] : [];
  const folk = [...H.folk, ...officer].map((f, i) => {
    const P = buildFarmer(f.look);
    P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(P.root);
    const at = f.at && spot(g.S, f.at), route = f.route?.map((p) => spot(g.S, p));
    const [x, z] = at ?? route[0];
    return {
      f,
      at,
      route,
      P,
      x,
      z,
      yaw: Math.atan2(-x, -z),
      seg: 1,
      dir: 1,
      wait: 1 + i * 1.3,
      act: null,
      next: 1 + Math.random() * 3,
      cool: 3 + i * 2,
      hold: 0,
      away: false,
      speed: 0,
      run: false,
      label: el('g3-label g3-npc'),
      bubble: el('g3-bubble g3-npc'),
      bubT: 0,
      mind: createNpcMind(f),
      baseSpeed: (f.look?.build ?? 1) * (1.1 + ((f.industriousness ?? 0.6) - 0.5) * 0.35),
      lookTarget: null,
      npcChatCool: 4 + i * 3,
    };
  });
  // every worker gets the things the work is done on: a courtyard's drying mat, paddy heap and swept ground, or a
  // picker's own short row of plants and the basket heap at its end (../villagework.js has the routine)
  const sites = [];
  for (const n of folk) {
    if (n.f.does !== 'work' || !n.at) continue;
    const kind = siteKind(n.f), H0 = kind === 'courtyard' && g.S[n.f.at[0]];
    // a courtyard opens away from its house, so the mat, the heap and the swept ground are all in the open
    const site = { x: n.x, z: n.z, yaw: H0 ? Math.atan2(n.x - H0.x, n.z - H0.z) : n.yaw, kind };
    const grp = new THREE.Group(); grp.position.set(n.x, L.ground(n.x, n.z), n.z); grp.rotation.y = site.yaw; scene.add(grp);
    const put = (geo, m, pos, rot = [0, 0, 0], sc) => { const o = new THREE.Mesh(geo, m); o.position.set(...pos); o.rotation.set(...rot); if (sc) o.scale.set(...sc); o.receiveShadow = true; o.castShadow = pos[1] > 0.05; grp.add(o); return o; };
    if (kind === 'courtyard') {
      const [mx, mz, sx, sz] = SITE.courtyard.mat;
      put(new THREE.CircleGeometry(2.3, 28), mat('#b59a6a', { rough: 1 }), [-0.3, 0.012, 1.25], [-Math.PI / 2, 0, 0]); // the swept, packed earth of the yard
      put(new THREE.BoxGeometry(sx, 0.02, sz), mat('#a8834c', { rough: 1 }), [mx, 0.02, mz]); // the pati (woven mat)
      site.grain = put(new THREE.BoxGeometry(sx - 0.12, 0.025, sz - 0.12), mat('#d6ad45', { rough: 1 }), [mx, 0.04, mz]);
      const [hx, hz] = SITE.courtyard.heap;
      site.heap = put(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#cfa23e', { rough: 1 }), [hx, 0.02, hz], [0, 0, 0], [1, 0.6, 1]);
      put(new THREE.CylinderGeometry(0.16, 0.13, 0.32, 14), mat('#7a4a2a'), [hx + 0.55, 0.16, hz + 0.35]); // a clay pot for the clean rice
    } else {
      put(new THREE.PlaneGeometry(ROW * 0.6 + 0.6, 1.1), mat('#7a5a3a', { rough: 1 }), [-1.5 + (ROW - 1) * 0.3, 0.015, 0.95], [-Math.PI / 2, 0, 0]); // the row's dug soil
      // real bean plants on stakes (plants.js's drawn bean): laden with pods while waiting, picked bare after
      const pod = mat('#86b04a', { rough: 0.7 });
      const BEAN = cropLook('bean'), A = cropAtlas('bean');
      const cardsAt = (col) => { const gq = cropCards(BEAN, A.vSplit), uv = gq.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setX(q, uv.getX(q) + col / CROP_COLS); return gq; };
      const beanMat = beanMatCache ?? (beanMatCache = new THREE.MeshStandardMaterial({ map: A.map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }));
      const ripeG = cardsAt(3), pickedG = cardsAt(2);
      site.plants = []; site.pickedG = pickedG; site.ripeG = ripeG;
      for (let k = 0; k < ROW; k++) {
        const [px, pz] = SITE.field.plant(k), h = BEAN.h[3] * (0.92 + (k % 3) * 0.05), w = h / BEAN.aspect;
        const m = new THREE.Mesh(ripeG, beanMat); m.position.set(px, 0, pz); m.scale.set(w, h, w); m.rotation.y = k * 0.7;
        m.castShadow = true; m.receiveShadow = true;
        m.customDepthMaterial = beanDepth ?? (beanDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: A.map, alphaTest: 0.5 }));
        grp.add(m); site.plants.push(m);
      }
      const [bx, bz] = SITE.field.basket;
      site.pile = put(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), pod, [bx, 0.01, bz], [0, 0, 0], [1, 0.25, 1]);
    }
    n.site = site; n.job = newJob(kind); n.step = null; sites.push(grp);
  }
  // one step of a worker's routine: walk to the spot, turn to the work, do it, and leave its mark
  function work(n, dt, obstacles) {
    if (n.act) {
      n.act.p += dt;
      if (n.act.p >= n.act.dur) {
        const done = n.step, s = n.site;
        if (!done || done.act !== n.act.type) { n.act = null; return; } // a greeting's gesture, not a work step
        n.job = finishStep(n.job); n.act = null; n.step = null;
        if (done.act === 'spread' && s.heap) s.heap.scale.multiplyScalar(0.9);
        if (done.act === 'winnow' && s.heap) s.heap.scale.set(1, 0.6, 1); // the cleaned rice tipped back onto the heap
        if (done.act === 'pick') s.plants.forEach((pl, k) => { pl.geometry = n.job.picked[k] ? s.pickedG : s.ripeG; }); // a picked plant stays, bare of pods
        if (done.act === 'tip') { s.plants.forEach((pl) => { pl.geometry = s.ripeG; }); s.pile.scale.y = Math.min(0.75, s.pile.scale.y + 0.1); }
      }
      return;
    }
    if (!n.step) { n.step = nextStep(n.job); n.stepT = 0; }
    const [gx, gz] = toWorld(n.site, n.step.at);
    n.stepT += dt;
    // a spot that someone (the farmer, a hen) is standing on, or that a wall keeps her from: work where she is
    if (n.stepT < 7 && !walkTo(n, gx, gz, dt, false, obstacles)) return;
    n.speed = 0;
    let dy = n.site.yaw + n.step.face - n.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    n.yaw += dy * Math.min(1, dt * 6);
    if (Math.abs(dy) < 0.12) n.act = { type: n.step.act, p: 0, dur: n.step.dur };
  }
  const setNames = () => { for (const n of folk) n.label.textContent = T(n.f.name); };
  setNames();
  const home = (n) => n.at ?? n.route[0];

  function walkTo(n, gx, gz, dt, fast, obstacles = []) {
    const dx = gx - n.x, dz = gz - n.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { n.speed = 0; return true; }
    const maxSp = fast ? 3.4 : (n.baseSpeed ?? 1.25);
    const sp = Math.min(d / Math.max(dt, 1e-4), maxSp);
    const avoid = computeObstacleAvoidance([n.x, n.z], n.yaw, obstacles, 2.3);
    const wantX = dx + (avoid.mustSteer ? avoid.avoidX * 1.6 : 0);
    const wantZ = dz + (avoid.mustSteer ? avoid.avoidZ * 1.6 : 0);
    const want = Math.atan2(wantX, wantZ);
    let dy = want - n.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const turn = Math.max(-5 * dt, Math.min(5 * dt, dy * Math.min(1, dt * 7.5)));
    n.yaw += turn; n.turnRate = turn / Math.max(dt, 1e-4);

    // a person gets going and stops over a step or two (about 2 m/s² walking, 4 running, 3.5 braking), slows near
    // the spot, and turns round on the spot before setting off the other way
    const targetSp = (d < 0.8 ? Math.min(sp, d * (fast ? 3.6 : 1.8)) : sp) * Math.max(0.1, Math.cos(Math.min(Math.PI / 2, Math.abs(dy))));
    const v0 = n.vel ?? 0;
    n.speed = v0 + Math.max(-3.5 * dt, Math.min((fast ? 4 : 2) * dt, targetSp - v0));
    n.run = fast;

    const nx = n.x + Math.sin(n.yaw) * n.speed * dt, nz = n.z + Math.cos(n.yaw) * n.speed * dt;
    if (!inWater(L, nx, nz)) [n.x, n.z] = resolve(L, nx, nz, 0.3);
    return false;
  }

  // Bodies, not ghosts: the farmer and the villagers push each other apart (the villager gives way more), a run
  // into someone knocks the farmer back and staggers them, with a word and a thud, and villagers keep apart too.
  const BODY = 0.36;
  const OUCH = [{ bn: 'আস্তে, ভাই!', en: 'Easy there!' }, { bn: 'দেখে চলো!', en: 'Watch where you go!' }, { bn: 'উফ্‌, ধাক্কা!', en: 'Oof!' }];
  function bodies(dt) {
    const me = g.me;
    for (const n of folk) {
      n.stag = Math.max(0, (n.stag ?? 0) - dt); n.bumpT = Math.max(0, (n.bumpT ?? 0) - dt);
      const dx = n.x - me.x, dz = n.z - me.z, d = Math.hypot(dx, dz), m = BODY * 2;
      if (d >= m || d < 1e-4) continue;
      const push = m - d, ux = dx / d, uz = dz / d;
      const nx = n.x + ux * push * 0.75, nz = n.z + uz * push * 0.75;
      if (!inWater(L, nx, nz)) [n.x, n.z] = resolve(L, nx, nz, 0.3);
      [me.x, me.z] = resolve(L, me.x - ux * push * 0.25, me.z - uz * push * 0.25);
      const into = me.vx * ux + me.vz * uz; // speed straight at them
      if (into > 2.6 && n.bumpT <= 0 && !(me.down > 0)) {
        n.bumpT = 1.2; n.stag = 0.6; n.hold = 1.8; n.act = null; n.yaw = Math.atan2(-ux, -uz);
        // the farmer is thrown back a step and loses the run; the villager rocks back
        [me.x, me.z] = resolve(L, me.x - ux * 0.45, me.z - uz * 0.45); me.vx = me.vz = 0;
        [n.x, n.z] = resolve(L, n.x + ux * 0.25, n.z + uz * 0.25, 0.3);
        n.mind = recordPlayerInteraction(n.mind, 'bump', g.t ?? 0);
        const bumpSay = generateContextualDialogue(n.mind, dayPhase ? dayPhase(g) : 0.3, g.ev, OUCH[Math.floor(Math.random() * OUCH.length)]);
        n.bubT = 2.4; n.bubble.textContent = T(bumpSay); n.bubble.style.display = ''; n.bubble.classList.remove('g3-pop'); void n.bubble.offsetWidth; n.bubble.classList.add('g3-pop');
        g.out.push({ type: 'sound', s: 'bump' });
      }
    }
    for (let i = 0; i < folk.length; i++) for (let j = i + 1; j < folk.length; j++) {
      const a = folk[i], b = folk[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = BODY * 2;
      if (d >= m || d < 1e-4) continue;
      const p = (m - d) / 2, ux = dx / d, uz = dz / d;
      [a.x, a.z] = resolve(L, a.x - ux * p, a.z - uz * p, 0.3); [b.x, b.z] = resolve(L, b.x + ux * p, b.z + uz * p, 0.3);
    }
    // and the animals (world.js herd): nobody walks through a cow; a hen in the way is shoved aside
    if (herd) { beasts = herd.bodies(); herd.settle(beasts, keepApart(L, [me, ...folk], beasts)); }
  }
  let herd = null, beasts = [];

  function update(t, dt, project, camPos) {
    const me = g.me, storm = !!(g.ev.zone && (g.ev.zone.left > 0 || g.ev.storm > 0));
    const ph = dayPhase ? dayPhase(g) : ((t * 0.02) % 1);
    if (dt > 0) bodies(dt);
    folk.forEach((n, i) => {
      n.cool -= dt; n.hold -= dt; n.npcChatCool -= dt; n.vel = n.speed; n.speed = 0; n.turnRate = 0; // walkTo() carries the speed on
      const dMe = Math.hypot(me.x - n.x, me.z - n.z);

      // Living AI needs and circadian updates
      n.mind = updateNpcNeeds(n.mind, dt, {
        isMoving: n.speed > 0.1,
        isWorking: !!n.act,
        isSocializing: n.hold > 0 || n.bubT > 0,
        weather: g.ev,
      });

      // Find nearest neighboring villager for situational awareness & gaze
      let nearNeighbor = null, nearDist = 999;
      for (let j = 0; j < folk.length; j++) {
        if (i === j) continue;
        const dN = Math.hypot(folk[j].x - n.x, folk[j].z - n.z);
        if (dN < nearDist) { nearDist = dN; nearNeighbor = folk[j]; }
      }

      // Natural Look-at IK targeting: prioritize looking at approaching player or nearby neighbour
      if (dMe < 5.5) {
        n.lookTarget = { x: me.x, y: L.ground(me.x, me.z) + 1.4, z: me.z };
      } else if (nearNeighbor && nearDist < 4.0) {
        n.lookTarget = { x: nearNeighbor.x, y: L.ground(nearNeighbor.x, nearNeighbor.z) + 1.35, z: nearNeighbor.z };
      } else {
        n.lookTarget = null;
      }

      // NPC-to-NPC natural social greeting when crossing paths
      if (nearNeighbor && nearDist < 2.0 && n.npcChatCool <= 0 && nearNeighbor.npcChatCool <= 0 && !storm && !n.act) {
        n.npcChatCool = 25 + Math.random() * 15;
        nearNeighbor.npcChatCool = 25 + Math.random() * 15;
        n.act = { type: 'adjust', p: 0, dur: 1.4 };
        nearNeighbor.act = { type: 'wipe', p: 0, dur: 1.4 };
        n.mind = updateNpcNeeds(n.mind, dt, { isSocializing: true });
      }

      const obstacles = [me, ...folk.filter((_, idx) => idx !== i).map((o) => ({ x: o.x, z: o.z })), ...beasts.filter((b) => b.mass === Infinity && Math.abs(b.x - n.x) < 4 && Math.abs(b.z - n.z) < 4)];

      if (storm) {
        // to the safe ground, each to their own spot inside the circle
        const z = g.ev.zone, a = i * 2.1 + 0.6;
        walkTo(n, z.x + Math.cos(a) * z.r * 0.45, z.z + Math.sin(a) * z.r * 0.45, dt, true, obstacles);
        n.away = true; n.act = null;
      } else if (n.hold > 0) {
        let dy = Math.atan2(me.x - n.x, me.z - n.z) - n.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); n.yaw += dy * Math.min(1, dt * 6);
      } else if (n.away) {
        const [hx, hz] = home(n); if (walkTo(n, hx, hz, dt, false, obstacles)) { n.away = false; n.seg = 1; n.dir = 1; }
      } else if (n.f.does === 'walk') {
        if (n.wait > 0) n.wait -= dt;
        else {
          const r = n.route, [gx, gz] = r[n.seg];
          if (walkTo(n, gx, gz, dt, false, obstacles)) {
            if (n.seg + n.dir >= r.length || n.seg + n.dir < 0) { n.dir *= -1; n.wait = 2 + Math.random() * 4; }
            n.seg += n.dir;
          }
        }
      } else if (n.site) {
        work(n, dt, obstacles);
      } else {
        // busy where they stand
        n.next -= dt;
        if (!n.act && n.next <= 0) { n.act = { type: n.f.does === 'work' ? (Math.random() < 0.6 ? 'plant' : 'harvest') : Math.random() < 0.5 ? 'wipe' : 'adjust', p: 0, dur: n.f.does === 'work' ? 1.8 : 2.2 }; }
        if (n.act) { n.act.p += dt; if (n.act.p >= n.act.dur) { n.act = null; n.next = n.f.does === 'work' ? 0.6 + Math.random() * 1.6 : 4 + Math.random() * 6; } }
      }
      // a greeting when the farmer comes close with context-aware dialogue
      if (!storm && dMe < 3.2 && n.cool <= 0 && !g.won) {
        n.cool = 36; n.hold = 2.6; n.act = null; n.bubT = 4.2;
        n.mind = recordPlayerInteraction(n.mind, 'talk', t);
        const dlg = generateContextualDialogue(n.mind, ph, g.ev, n.f.hello);
        n.bubble.textContent = T(dlg); n.bubble.style.display = ''; n.bubble.classList.remove('g3-pop'); void n.bubble.offsetWidth; n.bubble.classList.add('g3-pop');
      }
      const gy = L.ground(n.x, n.z);
      n.P.root.position.set(n.x, gy, n.z); n.P.root.rotation.y = n.yaw;
      n.P.root.rotation.x = n.stag > 0 ? -Math.sin((n.stag / 0.6) * Math.PI) * 0.22 : 0; // knocked back a step
      n.P.root.visible = Math.hypot(camPos.x - n.x, camPos.z - n.z) < 70;
      animate(n.P, {
        speed: n.speed,
        run: n.run,
        act: n.hold > 0 ? { type: 'talk', p: Math.max(0, 2.6 - n.hold), dur: 2.6 } : n.act, // talking to the farmer: hands and head move with the words
        basket: n.site?.kind === 'field',
        fill: n.job?.fill ?? 0,
        t: t + i * 7,
        down: 0,
        lookTarget: n.lookTarget,
        turnRate: n.turnRate,
      }, dt);
      // name when near, words when speaking
      const showName = dMe < 7 && n.bubT <= 0;
      if (showName || n.bubT > 0) {
        const [x, y, vis] = project(n.x, gy + (n.bubT > 0 ? 2.05 : 2.0) * (n.f.look.build ?? 1), n.z);
        const d = n.bubT > 0 ? n.bubble : n.label;
        d.style.display = vis ? '' : 'none'; d.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        (n.bubT > 0 ? n.label : n.bubble).style.display = 'none';
      } else { n.label.style.display = 'none'; n.bubble.style.display = 'none'; }
      if (n.bubT > 0) { n.bubT -= dt; if (n.bubT <= 0) n.bubble.style.display = 'none'; }
    });
  }

  return {
    update,
    dots: () => folk.map((n) => [n.x, n.z]),
    setLang(l) { lang = l; setNames(); },
    setHerd(h) { herd = h; },
    dispose() { for (const n of folk) { n.label.remove(); n.bubble.remove(); } for (const s of sites) scene.remove(s); boards.length = 0; },
  };
}

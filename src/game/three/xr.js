// মাঠের মানুষ in a VR headset (Meta Quest browser first, PC VR through WebXR too), loaded only when a session starts
// (stage.js enterXR). The player is the farmer: the eyes at the farmer's head on the local floor, the body hidden from
// their own view but still casting its shadow, simple hands on the controllers holding the can, the sickle or the
// sprayer while working. Walking in the room moves the farmer; the left stick walks (head- or hand-relative), the
// right stick snap- or smooth-turns and, pushed forward, throws a teleport arc that lands only on walkable ground.
// Point at a plot, a station or a neighbour and pull the trigger to act there. The shop, the FieldShift kiosk, the
// mission questions, the agriculture office, the Chakra helper, the menu and the season's report are panels in the
// world (xrui.js, laid out by ../xrlogic.js, worded by ../xrpanels.js), so nothing ever ends the session; a look at
// the left wrist shows money, time, water, seed and the mission. A third-person "god view" is one menu tap away.
// The AR tabletop (createAR below) gains hit-test placement on a real surface and a two-finger pinch to resize.
import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { target, buy, answerQuiz, quizOf, note, plotAt } from '../sim.js';
import { buyFertilizer, fertilize } from '../village.js';
import { useService } from '../office.js';
import { spaceFacts, placeOf } from '../fieldshift.js';
import { inWater, resolve } from '../layout.js';
import { XR_KEY, cleanXR, cycleXR, eyeLift, turnStep, vignetteTarget, approachVignette, teleportOK, arcPoints, rayGround, pickWorld, standFor, wristVisible } from '../xrlogic.js';
import { shopSpec, kioskSpec, quizSpec, officeSpec, helperSpec, menuSpec, wristSpec, reportSpec, brokeSpec, toastSpec } from '../xrpanels.js';
import { createPanel, createCard, createTag, makeHand, makeTools, makeLaser, makeArc, makeVignette } from './xrui.js';

// a standalone headset (Quest, Pico): fewer pixels and shadows than a PC drives
export const standalone = () => typeof navigator !== 'undefined' && /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
// before renderer.xr.setSession: the eye buffers' size, which cannot change while presenting
export function prepareXR(renderer) { try { renderer.xr.setFramebufferScaleFactor(standalone() ? 0.9 : 1); } catch { /* already presenting */ } }

const readSettings = () => { try { return cleanXR(JSON.parse(localStorage.getItem(XR_KEY) || 'null')); } catch { return cleanXR(null); } };
const saveSettings = (s) => { try { localStorage.setItem(XR_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } };

// the action words over a plot or station, as the page's prompt says them
const ACT_WORD = {
  spray: ['বালাই দমন', 'Treat pests'], clear: ['মরা গাছ সরান', 'Clear dead plants'], plant: ['বুনুন', 'Sow'], harvest: ['তুলুন', 'Harvest'],
  water: ['পানি দিন', 'Water'], wet: ['মাটি ভেজা', 'Soil is wet'], nowater: ['আগে পানি আনুন', 'Fetch water first'], noseed: ['বীজ নেই: দোকানে যান', 'No seed: go to the shop'],
};
const STATION_WORD = { shed: ['দোকান খুলুন', 'Open the shop'], water: ['পাম্পে পানি ভরুন', 'Fill the can'], market: ['ফসল বিক্রি', 'Sell the harvest'], kiosk: ['FieldShift খুলুন', 'Open FieldShift'], office: ['কৃষি অফিসে যান', 'Visit the office'] };
const BUZZ = { water: [0.25, 90], pump: [0.35, 160], plant: [0.3, 70], harvest: [0.7, 140], spray: [0.25, 220], coin: [0.5, 60], ripe: [0.2, 40], sparkle: [0.3, 50] };

export function createXR(ctx) {
  const { renderer, scene, camera, rig, g, L, P, world, xrs, joy, cam, emit, api } = ctx;
  let s = readSettings();
  const lang = () => api.lang();
  const T = (bn, en) => (lang() === 'en' ? en : bn);
  const session = renderer.xr.getSession();
  const heavy = standalone();

  // ---- what is built for VR (all removed again at the end) ----
  const skin = g.F.look?.skin ?? '#b98260';
  const handFactory = new XRHandModelFactory();
  const tools = makeTools();
  const laser = makeLaser();
  const arc = makeArc(90); scene.add(arc.line); scene.add(arc.ring);
  const vig = makeVignette(); camera.add(vig.mesh); vig.mesh.visible = true;
  const panel = createPanel(scene);
  const wrist = createPanel(scene, { w: 0.2, pw: 720, ph: 470, order: 21 });
  const card = createCard(scene);
  const tag = createTag(scene);
  scene.add(laser.dot);
  // a soft shadow under the player's feet, so the ground is felt even where the sun casts none
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false }));
  blob.renderOrder = 3; scene.add(blob);

  const hands = [0, 1].map((i) => {
    const ctl = renderer.xr.getController(i), grip = renderer.xr.getControllerGrip(i), hand = renderer.xr.getHand(i);
    rig.add(ctl); rig.add(grip); rig.add(hand);
    const h = { i, ctl, grip, hand, src: null, side: i ? 'right' : 'left', tracked: false, press: false, mitt: null, model: null, held: new Set() };
    ctl.addEventListener('connected', (e) => {
      h.src = e.data; h.side = e.data.handedness || h.side; h.tracked = !!e.data.hand;
      if (!h.mitt) { h.mitt = makeHand(skin, h.side === 'left'); grip.add(h.mitt); }
      h.mitt.visible = !h.tracked;
      if (h.tracked && !h.model) { try { h.model = handFactory.createHandModel(hand, 'spheres'); hand.add(h.model); } catch { h.model = null; } }
    });
    ctl.addEventListener('disconnected', () => { h.src = null; if (h.mitt) h.mitt.visible = false; });
    ctl.addEventListener('selectstart', () => { h.press = true; active = h; });
    return h;
  });
  let active = hands[1];
  const handOf = (side) => hands.find((h) => h.src && h.side === side) ?? null;
  for (const t of Object.values(tools)) if (!t.parent) scene.add(t);

  // ---- comfort and quality while presenting ----
  const far0 = camera.far, near0 = camera.near, auto0 = renderer.shadowMap.autoUpdate;
  camera.far = 420; camera.near = 0.05; camera.updateProjectionMatrix();
  world.sky?.scale.setScalar(0.75); // the sky sphere (520 m) inside the shorter draw distance
  try { renderer.xr.setFoveation(1); } catch { /* no foveation */ }
  if (heavy) renderer.shadowMap.autoUpdate = false; // the sun's shadows every third frame on a standalone headset
  let frameN = 0;

  // the farmer's body: hidden from the player's own eyes in first person, its shadow kept (a material that writes
  // neither colour nor depth still goes into the shadow map)
  const ghost = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const kept = new Map();
  let hideT = 0;
  function bodyHidden(on) {
    P.root.traverse((o) => {
      if (!o.isMesh) return;
      if (on) { if (!kept.has(o)) { kept.set(o, o.material); o.material = ghost; } }
      else if (kept.has(o)) o.material = kept.get(o);
    });
    if (!on) kept.clear();
  }
  const firstPerson = () => s.view === 'first';
  bodyHidden(firstPerson());

  // ---- haptics ----
  function buzz(h, v, ms) {
    const gp = h?.src?.gamepad; if (!gp) return;
    try {
      const a = gp.hapticActuators?.[0];
      if (a?.pulse) a.pulse(v, ms);
      else gp.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: v, weakMagnitude: v });
    } catch { /* no haptics */ }
  }
  const buzzBoth = (v, ms) => { for (const h of hands) buzz(h, v, ms); };

  // ---- reused vectors ----
  const head = new THREE.Vector3(), o = new THREE.Vector3(), d = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), q0 = new THREE.Quaternion();
  const ray = new THREE.Raycaster(); ray.far = 30;
  const O = [0, 0, 0], D = [0, 0, 0];
  const headWorld = () => { rig.updateMatrixWorld(true); return head.copy(camera.position).applyMatrix4(rig.matrixWorld); };
  const headYaw = () => { camera.getWorldDirection(tmp); return Math.atan2(-tmp.x, -tmp.z); };

  // ---- the message card in front of the player ----
  const toast = { t: 0, prio: 0, yaw: 0 };
  function showCard(c) {
    if (!c) return;
    const prio = c.tone === 'bad' ? 3 : c.title ? 2 : 1;
    if (toast.t > 0 && prio < toast.prio && toast.t > 1.2) return; // a warning is not talked over
    card.draw(c.title, c.body, c.tone); toast.t = c.secs ?? 4; toast.prio = prio;
    if (!card.mesh.visible) { toast.yaw = headYaw(); card.mesh.visible = true; }
  }
  const say = (bn, en, tone = 'info', secs = 3) => showCard({ title: '', body: T(bn, en), tone, secs });

  // ---- panels ----
  const ui = { kind: null, page: 0, pick: null, msg: null, win: null };
  function specFor(kind) {
    const l = lang();
    if (kind === 'shop') return shopSpec(g, l);
    if (kind === 'kiosk') { let facts = []; try { facts = spaceFacts(placeOf(g.R, g.id)); } catch { facts = []; } return kioskSpec(g, l, facts); }
    if (kind === 'quiz') return quizSpec(g, l, ui.pick);
    if (kind === 'office') return officeSpec(g, l, ui.msg);
    if (kind === 'helper') return helperSpec(g, l, api.job());
    if (kind === 'menu') return menuSpec(g, l, s, { sat: api.sat(), layer: api.layer() });
    if (kind === 'report') return reportSpec(g, l);
    if (kind === 'broke') return brokeSpec(g, l);
    return null;
  }
  const redraw = () => { if (ui.kind) panel.draw(specFor(ui.kind), ui.page); };
  function openPanel(kind) {
    ui.kind = kind; ui.page = 0; ui.pick = null; ui.msg = null;
    g.paused = true; joy.x = joy.y = 0;
    redraw();
    // 1.1 m ahead of the eyes, a little below them, turned to face the player
    const hw = headWorld(), yaw = headYaw();
    panel.mesh.position.set(hw.x - Math.sin(yaw) * 1.1, hw.y - 0.12, hw.z - Math.cos(yaw) * 1.1);
    panel.mesh.rotation.set(0, yaw, 0);
    panel.mesh.visible = true;
    buzz(active, 0.15, 30);
  }
  function closePanel() {
    if (!ui.kind) return;
    const was = ui.kind; ui.kind = null; panel.mesh.visible = false; panel.hover(null);
    if (was !== 'quiz') g.paused = false;
    emit({ type: 'sound', s: 'tap' });
  }
  function button(id) {
    buzz(active, 0.2, 25);
    const [a, b, c] = id.split(':');
    if (id === 'close') return closePanel();
    if (a === 'page') { ui.page += +b; return redraw(); }
    if (a === 'buy') { buy(g, b, +c); return redraw(); }
    if (a === 'fert') { buyFertilizer(g, b, +c); return redraw(); }
    if (a === 'quiz' && b === 'done') { const Q = quizOf(g), ok = ui.pick !== null && !!Q?.options[ui.pick]?.ok; ui.kind = null; panel.mesh.visible = false; answerQuiz(g, ok); return; }
    if (a === 'quiz') { ui.pick = +b; const ok = !!quizOf(g)?.options[ui.pick]?.ok; emit({ type: 'sound', s: ok ? 'good' : 'bad' }); buzz(active, ok ? 0.5 : 0.8, ok ? 80 : 200); return redraw(); }
    if (a === 'svc') {
      const r = useService(g, b);
      ui.msg = !r.ok ? r.why : b === 'soiltest' ? { bn: 'মাটি পরীক্ষা হয়েছে: নিচে প্রতিটি জমির ফল।', en: 'Soil tested: each plot’s result is below.' } : b === 'school' ? { bn: 'মাঠ স্কুলে এক বেলা শিখলেন: +৪০ XP।', en: 'A session at the field school: +40 XP.' } : { bn: `প্রণোদনার বীজ পেলেন: ${g.R.crops[r.seed]?.bn} ×${r.n}।`, en: `Incentive seed received: ${g.R.crops[r.seed]?.en} ×${r.n}.` };
      if (r.ok) emit({ type: 'sound', s: 'coin' });
      return redraw();
    }
    if (a === 'job' && b === 'stop') { api.stopJob(); return redraw(); }
    if (a === 'job') { api.runJob(b, { approved: true }); closePanel(); return; }
    if (a === 'set') { const was = s.view; s = cycleXR(s, b); saveSettings(s); if (s.view !== was) bodyHidden(firstPerson()); return redraw(); }
    if (a === 'seed') { g.sel = b; return redraw(); }
    if (a === 'feed') { const i = plotAt(g.me.x, g.me.z); fertilize(g, b, i === null ? null : g.plots[i]); return redraw(); }
    if (id === 'sat') { api.toggleSat(); return redraw(); }
    if (a === 'layer') { api.setLayer(b); return redraw(); }
    if (a === 'open') { if (b === 'kiosk') note(g, 'advised'); ui.kind = null; return openPanel(b); }
    if (id === 'lang') { emit({ type: 'lang', lang: lang() === 'en' ? 'bn' : 'en' }); return; }
    if (id === 'menu') { if (ui.kind === 'menu') closePanel(); else openPanel('menu'); return; }
    if (id === 'exit') { session.end().catch(() => {}); return; }
    if (id === 'finish') { const w = ui.win; ui.win = null; session.end().catch(() => {}); if (w) emit(w); }
  }
  let langSeen = lang();

  // ---- teleport and the blink ----
  const tele = { aim: false, ok: false, x: 0, z: 0 };
  let fade = 0;
  function blinkTo(x, z) {
    g.me.x = x; g.me.z = z; g.me.vx = g.me.vz = 0; g.me.speed = 0;
    fade = 1; buzz(active, 0.15, 40);
  }

  // ---- what the pointer is on ----
  const hov = { pick: null, item: null, wristItem: null, key: '' };
  function whatAt(pick) {
    // what the action button would do there: target() as if the farmer already stood on that plot
    const me = g.me, x = me.x, z = me.z;
    if (pick.kind === 'plot') { const p = g.plots[pick.i]; me.x = p.x; me.z = p.z; }
    const t = target(g); me.x = x; me.z = z;
    return t;
  }
  function tagFor(pick) {
    if (!pick || pick.kind === 'ground') return null;
    const st = standFor(g, pick);
    const far = st?.far ? T(' — অনেক দূর', ' — too far') : '';
    if (pick.kind === 'npc') return [T('নমস্কার জানান', 'Greet') + far, far ? 'bad' : 'go'];
    if (pick.kind === 'station') { const w = STATION_WORD[pick.id] ?? ['দেখুন', 'Open']; return [T(w[0], w[1]) + far, far ? 'bad' : 'go']; }
    const t = whatAt(pick);
    if (t?.kind !== 'plot') return null;
    const w = ACT_WORD[t.what] ?? ['কাজ', 'Act'];
    const crop = t.what === 'plant' || t.what === 'harvest' ? ` ${T(t.crop?.bn ?? '', t.crop?.en ?? '')}` : '';
    const rot = t.rot === 'repeat' ? T(' (একই ফসল আবার!)', ' (same crop again!)') : t.rot === 'rotate' ? T(' · ফসল বদল ✓', ' · rotation ✓') : '';
    const bad = far || ['wet', 'nowater', 'noseed'].includes(t.what) || t.rot === 'repeat';
    return [`${lang() === 'en' ? `${w[1]}${crop}` : `${crop.trim()} ${w[0]}`.trim()}${rot}${far}`, bad ? 'bad' : 'go'];
  }
  function actOn(pick, h) {
    if (!pick) return;
    if (pick.kind === 'ground') {
      // a tracked hand has no stick: a pinch on open ground is its teleport
      if (h.tracked) { const ok = teleportOK(L, pick.x, pick.z, g.me); if (ok.ok) blinkTo(pick.x, pick.z); else buzz(h, 0.6, 120); }
      return;
    }
    const st = standFor(g, pick);
    if (st?.far) { say('অনেক দূর — ডান স্টিক সামনে ঠেলে কাছে লাফ দিন।', 'Too far — push the right stick forward to teleport closer.', 'warn'); buzz(h, 0.6, 140); return; }
    if (st?.none) { say('ওখানে যাওয়া যাচ্ছে না।', 'Cannot get there.', 'warn'); buzz(h, 0.6, 140); return; }
    if (st) blinkTo(st.x, st.z);
    g.me.yaw = Math.atan2(pick.x - g.me.x, pick.z - g.me.z);
    if (pick.kind === 'npc') api.emote('greet');
    else api.act();
  }

  // ---- buttons on the controllers ----
  function pressed(h, i) {
    const b = h?.src?.gamepad?.buttons[i]; const on = !!b?.pressed;
    const was = h ? h.held.has(i) : false;
    if (h) { if (on) h.held.add(i); else h.held.delete(i); }
    return on && !was;
  }
  const turn = { held: false };
  let turnRate = 0, vigV = 0;

  // ---- once a frame, before the simulation steps: sticks, buttons, the pointer ----
  function input(dt) {
    rig.updateMatrixWorld(true);
    const L_ = handOf('left'), R_ = handOf('right');
    const lg = L_?.src?.gamepad, rg = R_?.src?.gamepad;
    const dead = (v) => (Math.abs(v ?? 0) < 0.15 ? 0 : v);
    const lx = dead(lg?.axes[2] ?? lg?.axes[0]), ly = dead(lg?.axes[3] ?? lg?.axes[1]);
    const rx = dead(rg?.axes[2] ?? rg?.axes[0]), ry = dead(rg?.axes[3] ?? rg?.axes[1]);
    const busy = !!ui.kind;
    joy.x = busy ? 0 : lx; joy.y = busy ? 0 : -ly;
    xrs.run = !!(lg?.buttons[1]?.pressed || lg?.buttons[3]?.pressed || rg?.buttons[1]?.pressed);
    // walking relative to the left hand, when chosen
    if (s.move === 'hand' && L_ && !L_.tracked) { L_.ctl.getWorldDirection(tmp); /* -z of the ray is its forward */ cam.yaw = Math.atan2(tmp.x, tmp.z); }
    // turning (both views)
    const dy = turnStep(turn, tele.aim ? 0 : rx, s, dt);
    if (dy) xrs.yaw += dy;
    turnRate = s.smoothTurn ? Math.abs(dy) / Math.max(dt, 1e-3) : 0;
    // the teleport: aim by pushing the right stick forward, jump on letting go
    if (!busy && ry < -0.6 && R_) tele.aim = true;
    else if (tele.aim && Math.abs(ry) < 0.3) { tele.aim = false; if (tele.ok) blinkTo(tele.x, tele.z); else buzz(R_, 0.4, 80); }
    if (busy) tele.aim = false;
    // A acts where the farmer stands, B closes, X the menu, Y the next seed
    if (pressed(R_, 4) && !busy) api.act();
    if (pressed(R_, 5) && busy && ui.kind !== 'quiz' && ui.kind !== 'report' && ui.kind !== 'broke') closePanel();
    if (pressed(L_, 4)) { if (ui.kind === 'menu') closePanel(); else if (!busy) openPanel('menu'); }
    if (pressed(L_, 5) && !busy) {
      const ks = Object.keys(g.R.crops), have = ks.filter((k) => g.seeds[k] > 0), list = have.length ? have : ks;
      g.sel = list[(list.indexOf(g.sel) + 1) % list.length];
      say(`বীজ: ${g.R.crops[g.sel].bn} (${g.seeds[g.sel] ?? 0})`, `Seed: ${g.R.crops[g.sel].en} (${g.seeds[g.sel] ?? 0})`);
    }
    // the Chakra helper walks the farmer to its next step: in VR it blinks there instead (no walking you did not do)
    const r = api.route;
    if (r.auto && r.pts?.length) { const e = r.pts[r.pts.length - 1]; r.auto = false; r.pts = null; blinkTo(e[0], e[1]); }
    if (lang() !== langSeen) { langSeen = lang(); redraw(); wristKey = ''; }

    // the pointer
    const h = active;
    hov.item = null; hov.wristItem = null;
    h.ctl.getWorldPosition(o); h.ctl.getWorldQuaternion(q0); d.set(0, 0, -1).applyQuaternion(q0);
    let len = 6, hitPanel = false;
    ray.set(o, d);
    if (ui.kind) {
      const hit = ray.intersectObject(panel.mesh, false)[0];
      if (hit) { hov.item = panel.pick(hit.uv); len = hit.distance; hitPanel = true; }
      panel.hover(hov.item);
    }
    if (!hitPanel && wrist.mesh.visible && h.side === 'right') {
      const hit = ray.intersectObject(wrist.mesh, false)[0];
      if (hit) { hov.wristItem = wrist.pick(hit.uv); len = hit.distance; hitPanel = true; }
    }
    wrist.hover(hov.wristItem);
    hov.pick = null;
    if (!hitPanel && !ui.kind) {
      O[0] = o.x; O[1] = o.y; O[2] = o.z; D[0] = d.x; D[1] = d.y; D[2] = d.z;
      const t = rayGround(O, D, L.ground, 30);
      hov.pick = pickWorld(g, O, D, t, api.npcs());
      if (hov.pick) len = hov.pick.t;
      else if (t > 0) len = t;
    }
    laser.line.scale.z = Math.max(0.05, len);
    laser.dot.position.copy(o).addScaledVector(d, len);
    const live = hitPanel ? !!(hov.item || hov.wristItem) : hov.pick && hov.pick.kind !== 'ground';
    laser.mat.color.set(live ? '#ffd24a' : '#ffffff'); laser.dotMat.color.copy(laser.mat.color);
    if (laser.line.parent !== h.ctl) { h.ctl.add(laser.line); }
    laser.line.visible = !!h.src && !tele.aim;
    laser.dot.visible = laser.line.visible;
    // presses: on a panel button, the wrist's menu button, or the world
    for (const hh of hands) {
      if (!hh.press) continue; hh.press = false;
      if (hh !== h) continue; // selectstart made the pressing hand the pointer, so this only skips a stale press
      if (hov.item) button(hov.item.id);
      else if (hov.wristItem) button(hov.wristItem.id);
      else if (!ui.kind && cam.intro === 0 && !g.won) actOn(hov.pick, hh);
    }
  }

  // ---- after the simulation: where the eyes are, the body, the hands, the panels ----
  let wristKey = '', wristT = 0, wristOn = false;
  function place(dt, gy) {
    frameN++;
    if (heavy && frameN % 3 === 0) renderer.shadowMap.needsUpdate = true;
    const me = g.me;
    rig.rotation.y = xrs.yaw;
    rig.updateMatrixWorld(true);
    if (firstPerson()) {
      // walking in the room moves the farmer: the head's step over the floor, kept out of walls and water
      const hw = headWorld();
      if (!g.paused && !me.act && me.down <= 0) {
        const dx = hw.x - me.x, dz = hw.z - me.z, m = Math.hypot(dx, dz);
        if (m > 0.004 && m < 1.5) {
          const nx = me.x + dx, nz = me.z + dz;
          if (!inWater(L, nx, nz)) { const [rx, rz] = resolve(L, nx, nz); me.x = rx; me.z = rz; }
        }
      }
      me.idle = 0; // the player is the farmer: no idle habits of their own
      if (!me.act) me.yaw = headYaw() + Math.PI;
      // then the floor under the head is the farmer's ground, and the head is where the farmer is
      const c = Math.cos(xrs.yaw), sn = Math.sin(xrs.yaw), lx = camera.position.x, lz = camera.position.z;
      rig.position.set(me.x - (c * lx + sn * lz), gy + eyeLift(s), me.z - (-sn * lx + c * lz));
      hideT -= dt; if (hideT <= 0) { hideT = 1; bodyHidden(true); } // the real model may have loaded since
    } else {
      // the god view: 4.5 m behind the farmer, a little above their floor, following at walking pace
      if (kept.size) bodyHidden(false);
      const x = me.x + Math.sin(xrs.yaw) * 4.5, z = me.z + Math.cos(xrs.yaw) * 4.5;
      tmp.set(x, Math.max(gy, L.ground(x, z)) + 0.6 + eyeLift(s), z);
      if (rig.position.distanceToSquared(tmp) > 400) rig.position.copy(tmp); else rig.position.lerp(tmp, Math.min(1, dt * 2.5));
    }
    rig.updateMatrixWorld(true);
    blob.visible = firstPerson();
    if (blob.visible) blob.position.set(me.x, L.ground(me.x, me.z) + 0.03, me.z);

    // the teleport arc from the right hand
    const R_ = handOf('right');
    if (tele.aim && R_) {
      R_.ctl.getWorldPosition(o); R_.ctl.getWorldQuaternion(q0); d.set(0, 0, -1).applyQuaternion(q0);
      const a = arcPoints(o.x, o.y, o.z, d.x, d.y, d.z, L.ground, arc.pos);
      const ok = a.hit ? teleportOK(L, a.x, a.z, me) : { ok: false };
      tele.ok = ok.ok; tele.x = a.x; tele.z = a.z;
      arc.set(a.n);
      arc.line.visible = true;
      const col = ok.ok ? '#7dd3fc' : '#f87171'; arc.mat.color.set(col); arc.ringMat.color.set(col);
      arc.ring.visible = a.hit; arc.ring.position.set(a.x, a.y + 0.03, a.z); arc.ring.rotation.y = headYaw();
    } else { arc.line.visible = false; arc.ring.visible = false; }

    // the tool in the working hand
    const act = me.act?.type, tool = tools[act];
    for (const k in tools) if (tools[k] !== tool) tools[k].visible = false;
    if (tool && active.src) {
      const holder = active.grip; // a tracked hand has a grip space too
      if (tool.parent !== holder) holder.add(tool);
      tool.visible = true;
      const p = me.act.p / me.act.dur;
      tool.rotation.set(act === 'water' ? Math.sin(Math.min(1, p * 1.6) * Math.PI) * 0.7 : act === 'harvest' || act === 'clear' ? Math.sin(p * Math.PI * 4) * 0.6 : 0, 0, 0);
      if (frameN % 9 === 0 && BUZZ[act]) buzz(active, BUZZ[act][0] * 0.4, 30);
    }

    // the hover tag over what the pointer is on
    const tg = !ui.kind && !tele.aim ? tagFor(hov.pick) : null;
    if (tg) {
      tag.set(tg[0], tg[1]);
      const p = hov.pick, up = p.kind === 'station' ? 3.2 : p.kind === 'npc' ? 2.1 : 0.9;
      tag.sprite.position.set(p.kind === 'plot' ? g.plots[p.i].x : p.x, L.ground(p.x, p.z) + up, p.kind === 'plot' ? g.plots[p.i].z : p.z);
      const dist = tag.sprite.position.distanceTo(headWorld()), k = Math.max(1, Math.min(4, dist / 3));
      tag.sprite.scale.set(0.8 * k, 0.15 * k, 1);
      tag.sprite.visible = true;
    } else tag.sprite.visible = false;

    // the wrist: shown when the inside of the left wrist turns to the eyes
    const L_ = handOf('left');
    const holder = L_ ? L_.grip : null;
    if (holder) {
      holder.getWorldPosition(tmp); holder.getWorldQuaternion(q0);
      // the card sits along the inner forearm, its face turned up and in
      // (the grip's +x is the palm side of a left hand holding the controller, +z runs back to the elbow)
      tmp2.set(0.045, 0.01, 0.07).applyQuaternion(q0); wrist.mesh.position.copy(tmp).add(tmp2);
      wrist.mesh.quaternion.copy(q0); wrist.mesh.rotateY(Math.PI / 2);
      const hw = headWorld(); tmp2.copy(hw).sub(wrist.mesh.position); const dist = tmp2.length(); tmp2.normalize();
      tmp.set(0, 0, 1).applyQuaternion(wrist.mesh.quaternion);
      wristOn = wristVisible(tmp.dot(tmp2), dist, wristOn) && !ui.kind;
    } else wristOn = false;
    wrist.mesh.visible = wristOn;
    wristT -= dt;
    if (wristOn && wristT <= 0) {
      wristT = 0.5;
      const spec = wristSpec(g, lang()), key = JSON.stringify(spec);
      if (key !== wristKey) { wristKey = key; wrist.draw(spec); }
    }

    // the card: follows the eyes lazily, 1.4 m ahead and below the line of sight
    if (card.mesh.visible) {
      toast.t -= dt; if (toast.t <= 0) card.mesh.visible = false;
      const hy = headYaw(); let da = hy - toast.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > 0.6) toast.yaw += da * Math.min(1, dt * 3);
      const hw = headWorld();
      card.mesh.position.set(hw.x - Math.sin(toast.yaw) * 1.4, hw.y - 0.42, hw.z - Math.cos(toast.yaw) * 1.4);
      card.mesh.rotation.set(-0.25, toast.yaw, 0, 'YXZ');
    }

    // comfort: the vignette while the stick moves or turns the view; the blink after a teleport
    const stick = !g.paused && Math.hypot(joy.x, joy.y) > 0.1 ? me.speed : 0;
    vigV = approachVignette(vigV, vignetteTarget(s, stick, turnRate), dt);
    fade = Math.max(0, fade - dt * 4);
    vig.mat.uniforms.strength.value = vigV; vig.mat.uniforms.fade.value = fade;
    vig.mesh.visible = vigV > 0.01 || fade > 0.01;
  }

  // ---- the game's events, before the page sees them; true when VR has handled one completely ----
  function event(e) {
    if (e.type === 'open') { if (e.panel === 'kiosk') note(g, 'advised'); openPanel(e.panel); return true; }
    if (e.type === 'win') { ui.win = e; openPanel('report'); buzzBoth(0.6, 300); return true; }
    if (e.type === 'broke') { openPanel('broke'); return false; }
    if (e.type === 'fx') { const b = BUZZ[e.kind]; if (b) buzz(active, b[0], b[1]); return false; }
    if (e.type === 'alert') buzzBoth(e.tone === 'hot' ? 0.9 : 0.5, e.tone === 'hot' ? 350 : 160);
    if (e.type === 'hurt') buzzBoth(1, 400);
    if (e.type === 'questDone') buzzBoth(0.5, 120);
    showCard(toastSpec(e, g, lang()));
    return false;
  }
  // the stage's own news to the page (the Chakra helper's steps)
  function peek(e) {
    if (e.type !== 'helper') return;
    if (e.state === 'step' && e.line) showCard({ title: T('চক্র এজেন্ট', 'Chakra Agent'), body: T(e.line.bn ?? '', e.line.en ?? ''), tone: 'info', secs: 3 });
    else if (e.state === 'done' || e.state === 'blocked') showCard({ title: T('চক্র এজেন্ট', 'Chakra Agent'), body: e.state === 'done' ? T('কাজ শেষ।', 'Job done.') : T('এই কাজ আর এগোনো গেল না।', 'The job could not go on.'), tone: e.state === 'done' ? 'good' : 'warn', secs: 3 });
  }

  function end() {
    bodyHidden(false);
    camera.far = far0; camera.near = near0; camera.updateProjectionMatrix();
    world.sky?.scale.setScalar(1);
    renderer.shadowMap.autoUpdate = auto0;
    if (ui.kind && ui.kind !== 'quiz' && ui.kind !== 'report') g.paused = false; // a question left open is asked again on the page
    if (ui.kind === 'quiz') emit({ type: 'open', panel: 'quiz' });
    ui.kind = null;
    camera.remove(vig.mesh); vig.mat.dispose(); vig.mesh.geometry.dispose(); laser.line.geometry.dispose(); arc.line.geometry.dispose(); arc.line.dispose();
    for (const h of hands) { rig.remove(h.ctl); rig.remove(h.grip); rig.remove(h.hand); if (h.mitt) h.grip.remove(h.mitt); if (h.model) h.hand.remove(h.model); }
    for (const t of Object.values(tools)) t.parent?.remove(t);
    laser.line.parent?.remove(laser.line); scene.remove(laser.dot); scene.remove(arc.line); scene.remove(arc.ring); scene.remove(blob);
    panel.dispose(); wrist.dispose(); card.dispose(); tag.dispose(); ghost.dispose();
    const ui0 = ui.win; if (ui0) emit(ui0); // a season finished in VR still reaches its report
  }

  return {
    get on() { return true; },
    get settings() { return s; },
    get panel() { return ui.kind; },
    input, place, event, peek, end, openPanel, closePanel, button,
    // for a script driving the emulator (dev): what the pointer is on, the teleport state
    debug: () => ({ pick: hov.pick, item: hov.item?.id ?? null, wrist: wristOn, tele: { ...tele }, view: s.view, vig: vigV, panel: ui.kind, rig: rig.position.toArray().map((v) => +v.toFixed(2)), me: [+g.me.x.toFixed(2), +g.me.z.toFixed(2)] }),
    set(k, v) { s = cleanXR({ ...s, [k]: v }); saveSettings(s); bodyHidden(firstPerson()); },
    face(x, z) { xrs.yaw = Math.atan2(-(x - g.me.x), -(z - g.me.z)); }, // turn the rig so the headset's forward looks at a point (dev)
  };
}

// ---- AR: the tabletop on a real surface ----
// A ring follows the surface the phone (or headset) looks at; a tap stands the farm there. Two fingers pinch it
// bigger or smaller. Taps on the page's own buttons never move it (beforexrselect).
export function createAR({ renderer, rig, L, scale0, root }) {
  const session = renderer.xr.getSession();
  const st = { src: null, scale: scale0, H: new THREE.Vector3(0, -0.45, -0.9), placed: false, pinch: 0, lastPinch: -1 };
  const C = new THREE.Vector3(0, L.ground(0, 0), 0), tmp = new THREE.Vector3();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd24a', depthTest: false, toneMapped: false }));
  ring.visible = false; ring.renderOrder = 30; rig.add(ring); // in the room's own metres: a child of the scaled rig
  session.requestReferenceSpace('viewer').then((v) => session.requestHitTestSource?.({ space: v })).then((src) => { st.src = src ?? null; }).catch(() => {});
  const apply = () => { tmp.copy(st.H).multiplyScalar(st.scale).applyAxisAngle(THREE.Object3D.DEFAULT_UP, rig.rotation.y); rig.scale.setScalar(st.scale); rig.position.copy(C).sub(tmp); };
  const onSelect = () => {
    if (!ring.visible || performance.now() - st.lastPinch < 500) return;
    st.H.copy(ring.position); st.placed = true; apply();
  };
  const noSelect = (e) => { if (e.target?.closest?.('button, a, input, select, textarea, [role="button"], [role="dialog"], [role="slider"], .g3-joy')) e.preventDefault(); };
  const touches = new Map();
  const tStart = (e) => { for (const t of e.changedTouches) touches.set(t.identifier, [t.clientX, t.clientY]); if (touches.size === 2) { const [a, b] = [...touches.values()]; st.pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } };
  const tMove = (e) => {
    for (const t of e.changedTouches) if (touches.has(t.identifier)) touches.set(t.identifier, [t.clientX, t.clientY]);
    if (touches.size !== 2 || !st.pinch) return;
    const [a, b] = [...touches.values()], now = Math.hypot(a[0] - b[0], a[1] - b[1]);
    st.scale = Math.min(160, Math.max(8, st.scale * (st.pinch / Math.max(1, now)))); st.pinch = now; st.lastPinch = performance.now(); apply();
  };
  const tEnd = (e) => { for (const t of e.changedTouches) touches.delete(t.identifier); if (touches.size < 2) st.pinch = 0; };
  session.addEventListener('select', onSelect);
  root?.addEventListener('beforexrselect', noSelect);
  root?.addEventListener('touchstart', tStart, { passive: true }); root?.addEventListener('touchmove', tMove, { passive: true }); root?.addEventListener('touchend', tEnd); root?.addEventListener('touchcancel', tEnd);
  return {
    frame() {
      const frame = renderer.xr.getFrame(), space = renderer.xr.getReferenceSpace();
      if (!st.src || !frame || !space) { ring.visible = false; return; }
      const hit = frame.getHitTestResults(st.src)[0], pose = hit?.getPose(space);
      ring.visible = !!pose;
      if (pose) { const p = pose.transform.position; ring.position.set(p.x, p.y, p.z); }
    },
    get placed() { return st.placed; },
    end() {
      try { st.src?.cancel(); } catch { /* gone with the session */ }
      session.removeEventListener('select', onSelect);
      root?.removeEventListener('beforexrselect', noSelect);
      root?.removeEventListener('touchstart', tStart); root?.removeEventListener('touchmove', tMove); root?.removeEventListener('touchend', tEnd); root?.removeEventListener('touchcancel', tEnd);
      rig.remove(ring); ring.geometry.dispose(); ring.material.dispose();
    },
  };
}

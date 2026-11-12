import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  clamp,
  lerp,
  smooth,
  rad,
  deg,
  hash,
  curve,
  steps,
  reach,
  ring,
  wobble,
  idleGaze,
  ageStoop,
  expressionFromState,
  blink,
  panCurve,
} from './motion.js';
import {
  dayOfYear,
  subsolarPoint,
  sunCosZenith,
  circularOrbit,
  R_EARTH_KM,
} from './sun.js';
import { airMass, daylight } from '../game/sunlight.js';
import { camReach } from '../game/camclip.js';
import { WORLD_IDS, layoutFor } from '../game/layout.js';
import {
  XR_KEY,
  XR_DEFAULTS,
  XR_OPTIONS,
  cleanXR,
  cycleXR,
  SEATED_LIFT,
  eyeLift,
  SMOOTH_TURN_RATE,
  turnStep,
  vignetteTarget,
  approachVignette,
  TELEPORT_MAX,
  teleportOK,
  arcPoints,
  rayGround,
  pickWorld,
  REACH,
  standFor,
  wristVisible,
  PANEL,
  wrapText,
  layoutPanel,
  hitPanel,
} from '../game/xrlogic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const readRepo = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const makeMockLayout = () => ({
  ground: () => 0,
  water: [{ kind: 'river', x0: -20, x1: 20, z0: 12, z1: 30, y: -0.5 }],
  blockers: [{ x: 5, z: 5, hw: 1.5, hd: 1.5, c: 1, s: 0 }],
});
const monoMeasure = (px = 16) => (txt) => String(txt || '').length * px * 0.55;

describe('F23/F24 Tier 1 — Category Partition: Engine Motion, Sun, Daylight & Camclip', () => {
  it('clamp, lerp, smooth, rad/deg and hash behave deterministically across inputs', () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-4, 0, 10), 0);
    assert.equal(clamp(42, 0, 10), 10);
    assert.equal(lerp(10, 20, 0.25), 12.5);
    assert.equal(smooth(0), 0);
    assert.equal(smooth(1), 1);
    assert.equal(smooth(0.5), 0.5);
    assert.ok(smooth(0.25) < 0.25 && smooth(0.75) > 0.75);
    assert.ok(Math.abs(deg(rad(180)) - 180) < 1e-12);
    const h1 = hash(17), h2 = hash(17), h3 = hash(18);
    assert.equal(h1, h2);
    assert.notEqual(h1, h3);
    assert.ok(h1 >= 0 && h1 < 1 && h3 >= 0 && h3 < 1);
  });

  it('curve and steps interpolate cleanly and wrap over arbitrary periods', () => {
    const keys = [
      [0, 0],
      [0.5, 10],
      [1, 0],
    ];
    assert.equal(curve(keys, { period: 1 })(0), 0);
    assert.ok(Math.abs(curve(keys, { period: 1 })(0.5) - 10) < 1e-9);
    assert.ok(Math.abs(curve(keys, { period: 1 })(0.25) - curve(keys, { period: 1 })(1.25)) < 1e-9);
    const stepFn = steps([[0, 'dawn'], [0.4, 'noon'], [0.8, 'dusk']], { period: 1 });
    assert.equal(stepFn(0.1), 'dawn');
    assert.equal(stepFn(0.45), 'noon');
    assert.equal(stepFn(1.85), 'dusk');
  });

  it('2-bone IK reach preserves segment lengths when reachable and reports shortfall when unreachable', () => {
    const ok = reach(0, 0, 1.2, 0.4, 1, 1, 1);
    assert.equal(ok.short, 0);
    const len1 = Math.hypot(ok.jx - 0, ok.jy - 0);
    const len2 = Math.hypot(ok.ex - ok.jx, ok.ey - ok.jy);
    assert.ok(Math.abs(len1 - 1) < 1e-5, `upper limb len=${len1}`);
    assert.ok(Math.abs(len2 - 1) < 1e-5, `lower limb len=${len2}`);
    assert.ok(Math.hypot(ok.ex - 1.2, ok.ey - 0.4) < 1e-5);

    const flipped = reach(0, 0, 1.2, 0.4, 1, 1, -1);
    assert.notEqual(Math.sign(ok.jy - 0.2), Math.sign(flipped.jy - 0.2));

    const far = reach(0, 0, 5, 0, 1, 1, 1);
    assert.ok(far.short > 2.9, `expected shortfall ~3, got ${far.short}`);
    assert.ok(Math.abs(far.ex - 2) < 0.05);
  });

  it('ring oscillator settles, blink stays within [0,1], idleGaze honors reducedMotion, and ageStoop increases with age', () => {
    assert.equal(ring(0, 1), 1);
    assert.ok(Math.abs(ring(25, 1, 2, 0.35)) < 1e-3);
    assert.ok(Number.isFinite(wobble(1.5, 3)));
    assert.deepEqual(idleGaze(3.7, true), { x: 0, y: 0 });
    const g = idleGaze(3.7, false);
    assert.ok(Number.isFinite(g.x) && Number.isFinite(g.y));
    assert.ok(ageStoop(68) > ageStoop(25));
    for (let t = 0; t < 20; t += 0.05) {
      const b = blink(t, 2);
      assert.ok(b >= 0 && b <= 1, `blink=${b} at t=${t}`);
    }
    const pan = panCurve({ peak: 0.5, width: 0.08, rest: 0.15 });
    assert.equal(pan(0), 0);
    assert.ok(pan(0.5) > pan(0.1) && pan(0.999) > 0.99);
  });

  it('expressionFromState produces finite facial rig outputs across farmer conditions', () => {
    const calm = expressionFromState({});
    const alert = expressionFromState({ tired: 0.9, worry: 0.8, mood: 'worried' });
    const happy = expressionFromState({ joy: 0.95, energy: 0.9, mood: 'happy' });
    for (const ex of [calm, alert, happy]) {
      assert.ok(typeof ex === 'object' && ex !== null);
      for (const v of Object.values(ex)) {
        if (typeof v === 'number') assert.ok(Number.isFinite(v), `non-finite ${v}`);
      }
    }
  });

  it('sunlight & orbital astronomy match solar zenith geometry across latitudes and seasons', () => {
    const juneSolstice = new Date('2026-06-21T06:00:00Z');
    const decSolstice = new Date('2026-12-21T06:00:00Z');
    assert.ok(dayOfYear(juneSolstice) >= 170 && dayOfYear(juneSolstice) <= 173);
    const subJune = subsolarPoint(juneSolstice);
    const subDec = subsolarPoint(decSolstice);
    assert.ok(subJune.lat > 22 && subJune.lat < 24);
    assert.ok(subDec.lat < -22 && subDec.lat > -24);

    const cosJune = sunCosZenith(juneSolstice, 23.81, 90.41);
    const cosDec = sunCosZenith(decSolstice, 23.81, 90.41);
    assert.ok(cosJune > cosDec && cosJune > 0.95);

    const orbit = circularOrbit(705);
    assert.ok(orbit.periodMin > 96 && orbit.periodMin < 102);
    assert.ok(orbit.speedKmS > 7 && orbit.speedKmS < 8 && R_EARTH_KM > 6300);

    const noonLight = daylight(0.95, 0);
    const duskLight = daylight(0.12, 0.25);
    assert.ok(airMass(0.95) < airMass(0.12));
    assert.ok(noonLight.sun > duskLight.sun);
    assert.ok(noonLight.r >= 0 && noonLight.g >= 0 && noonLight.b >= 0);
  });

  it('camReach pulls camera ahead of oriented blocker while leaving open vistas near full reach', () => {
    const f = [0, 1.5, 0];
    const c = [0, 2.0, 8];
    const open = camReach([], f, c);
    assert.ok(open >= 0.95 && open <= 1, `open=${open}`);

    const wall = { x: 0, z: 4, hw: 2.5, hd: 0.6, c: 1, s: 0 };
    const blocked = camReach([wall], f, c, { pad: 0.35 });
    assert.ok(blocked > 0 && blocked < 0.6, `blocked reach ratio=${blocked}`);
  });
});

describe('F23/F24 Tier 2 — Boundary Value Analysis: XR Comfort, Teleport, Raycast & Layout Limits', () => {
  it('cleanXR sanitizes corrupted/partial settings and cycleXR wraps options cleanly', () => {
    const def = cleanXR(null);
    assert.deepEqual(def, XR_DEFAULTS);
    const bad = cleanXR({ vignette: 'invalid', turn: 99, seated: 'yes' });
    assert.equal(XR_OPTIONS.turn.includes(bad.turn), true);
    assert.equal(XR_OPTIONS.vignette.includes(bad.vignette), true);
    assert.equal(typeof bad.seated, 'boolean');

    const cycled = cycleXR(def, 'turn');
    assert.notEqual(cycled.turn, def.turn);
    assert.ok(eyeLift({ ...def, seated: true }) >= SEATED_LIFT);
    assert.equal(eyeLift({ ...def, seated: false }), 0);
    assert.ok(XR_KEY.length > 0 && SMOOTH_TURN_RATE > 0);
  });

  it('teleportOK enforces max distance, blocker bounds, water limits, and works on real layouts', () => {
    const mock = makeMockLayout();
    assert.equal(teleportOK(mock, 1, 1, { x: 0, z: 0 }).ok, true);
    assert.equal(teleportOK(mock, 5, 5, { x: 0, z: 0 }).ok, false);
    assert.equal(teleportOK(mock, 0, 18, { x: 0, z: 0 }).ok, false);
    assert.equal(teleportOK(mock, TELEPORT_MAX - 0.5, 0, { x: 0, z: 0 }).ok, true);
    assert.equal(teleportOK(mock, TELEPORT_MAX + 2, 0, { x: 0, z: 0 }).ok, false);

    // Every published world layout handles teleport origin safely
    for (const id of WORLD_IDS.slice(0, 5)) {
      const realL = layoutFor(id);
      const res = teleportOK(realL, 0, 0, { x: 0, z: 0 });
      assert.equal(typeof res.ok, 'boolean');
    }
  });

  it('turnStep, vignetteTarget, approachVignette, arcPoints, rayGround & wristVisible honor boundary inputs', () => {
    const st = { held: false };
    const smoothDelta = turnStep(st, 1, { ...XR_DEFAULTS, smoothTurn: true }, 0.1);
    assert.ok(Math.abs(smoothDelta) > 0.05);
    const snapDelta = turnStep({ held: false }, 1, { ...XR_DEFAULTS, smoothTurn: false, turn: 30 }, 0.016);
    assert.ok(Math.abs(snapDelta - (-30 * Math.PI) / 180) < 1e-6);

    assert.equal(vignetteTarget({ ...XR_DEFAULTS, vignette: false }, 5, 2), 0);
    assert.ok(vignetteTarget({ ...XR_DEFAULTS, vignette: true }, 3, 1.5) > 0);
    assert.equal(approachVignette(0, 0.5, 0), 0);
    assert.ok(approachVignette(0, 0.5, 0.1) > 0 && approachVignette(0, 0.5, 0.1) <= 0.5);

    const out = new Float32Array(40 * 3);
    const arc = arcPoints(0, 1.5, 0, 0, 0.2, -1, () => 0, out);
    assert.ok(arc.n >= 2 && arc.hit === true && Number.isFinite(arc.x));

    const hitT = rayGround([0, 2, 0], [0, -1, -1], () => 0, 20, 0.25);
    assert.ok(hitT > 2.7 && hitT < 2.95, `hitT=${hitT}`);
    assert.equal(rayGround([0, 2, 0], [0, 1, -1], () => 0, 20, 0.25), -1);

    assert.equal(wristVisible(0.9, 0.4, false), true);
    assert.equal(wristVisible(0.1, 0.4, false), false);
    assert.equal(wristVisible(0.5, 0.5, true), true);
  });

  it('REACH radii, wrapText empty/multi-line, layoutPanel pagination & hitPanel edge bounds behave safely', () => {
    assert.ok(REACH.plot > 0 && REACH.station > 0 && REACH.npc > 0);
    const emptyWrapped = wrapText('', 200, 16, monoMeasure(16));
    assert.ok(Array.isArray(emptyWrapped) && emptyWrapped.length <= 1);
    const wrapped = wrapText('Rice rotation protects monsoon paddy yield and soil nitrogen balance', 140, 16, monoMeasure(16));
    assert.ok(wrapped.length >= 3);

    const layout = layoutPanel({
      title: 'Field Summary',
      sub: 'Monsoon Aman planning',
      rows: [
        { text: 'Soil organic matter is balanced for transplanted paddy.' },
        { buttons: [{ id: 'next', label: 'Inspect' }] },
      ],
      foot: [{ id: 'close', label: 'Close' }],
    }, { w: 680, h: 520, measure: monoMeasure(16), page: 0 });
    assert.ok(PANEL.btnH > 0);
    const btns = layout.items.filter((it) => it.type === 'button');
    assert.ok(btns.length >= 2);
    const b = btns[0];
    assert.equal(hitPanel(layout, b.x + b.w / 2, b.y + b.h / 2)?.id, b.id);
    assert.equal(hitPanel(layout, -50, -50), null);
  });

  it('pickWorld and standFor resolve NPC and ground targets deterministically', () => {
    const world = makeMockLayout();
    const g = { L: world, S: {}, plots: [], me: { x: 0, z: 0 } };
    const hitNpc = pickWorld(g, [0, 1.05, 0], [0, 0, -1], 10, [[0, -4]]);
    assert.equal(hitNpc?.kind, 'npc');
    const stand = standFor(g, hitNpc);
    assert.ok(stand && Number.isFinite(stand.x) && Number.isFinite(stand.z));
    const hitGround = pickWorld(g, [0, 1.5, 0], [0, -1, -1], 2.8, []);
    assert.equal(hitGround?.kind, 'ground');
  });
});

describe('F23/F24 Tier 3 — Pairwise Atmosphere Moods & Transition State Contracts', () => {
  it('FarmerAtmosphere pairs every climate mood (calm/rain/heat) and diurnal phase (dawn/day/dusk/night) in JSX & CSS', () => {
    const jsx = readRepo('src/components/brand/FarmerAtmosphere.jsx');
    const css = readRepo('src/index.css');
    for (const climate of ['calm', 'rain', 'heat']) {
      assert.match(jsx, new RegExp(`'${climate}'`));
    }
    for (const diurnal of ['dawn', 'day', 'dusk', 'night']) {
      assert.match(jsx, new RegExp(`'${diurnal}'`));
    }
    assert.match(css, /\.farmer-atmosphere\[data-climate="rain"\]/);
    assert.match(css, /\.farmer-atmosphere\[data-climate="heat"\]/);
    assert.match(css, /\.farmer-atmosphere\[data-diurnal="dawn"\]/);
    assert.match(css, /\.farmer-atmosphere\[data-diurnal="dusk"\]/);
    assert.match(css, /\.farmer-atmosphere\[data-diurnal="night"\]/);
    assert.match(css, /\.farmer-mist-wisp/);
    assert.match(css, /@keyframes farmer-pollen-drift/);
    assert.match(css, /@keyframes farmer-rain-fall/);
    assert.match(css, /@keyframes farmer-heat-shimmer/);
  });

  it('PublicAtmosphere maps every public portal mood cleanly across PublicLayout and index.css', () => {
    const jsx = readRepo('src/components/brand/PublicAtmosphere.jsx');
    const layout = readRepo('src/layouts/PublicLayout.jsx');
    const css = readRepo('src/index.css');
    assert.match(layout, /import PublicAtmosphere from '\.\.\/components\/brand\/PublicAtmosphere'/);
    assert.match(layout, /<PublicAtmosphere\s+portal=/);
    for (const mood of ['public', 'science', 'stories', 'games', 'kids']) {
      assert.match(jsx, new RegExp(`'${mood}'`));
      if (mood !== 'public') {
        assert.match(css, new RegExp(`\\.public-atmosphere\\[data-portal="${mood}"\\]`));
      }
    }
    assert.match(css, /\.public-mesh-orb/);
    assert.match(css, /\.public-mote/);
    assert.doesNotMatch(css, /\.public-shell\[data-portal="science"\]::before/);
    assert.doesNotMatch(css, /\.public-shell\[data-portal="games"\]::before/);
  });

  it('OfficerAtmosphere mounts in OfficerLayout with telemetry grid, crosshairs, radar sweep and alert escalation', () => {
    const jsx = readRepo('src/components/brand/OfficerAtmosphere.jsx');
    const layout = readRepo('src/layouts/OfficerLayout.jsx');
    const css = readRepo('src/index.css');
    assert.match(layout, /import OfficerAtmosphere from '\.\.\/components\/brand\/OfficerAtmosphere'/);
    assert.match(layout, /<OfficerAtmosphere\s+alertsCount=\{alertsCount\}\s*\/>/);
    assert.match(jsx, /officer-geodetic-grid/);
    assert.match(jsx, /officer-orbital-crosshairs/);
    assert.match(jsx, /officer-radar-sweep/);
    assert.match(jsx, /data-alert=\{alertsCount > 0 \? 'active' : 'nominal'\}/);
    assert.match(css, /\.officer-atmosphere\[data-alert="active"\]/);
    assert.match(css, /@keyframes officer-radar-spin/);
  });
});

describe('F23/F24 Tier 4 — Realistic Portal Showcase, GPU Perf, Reduced Motion & Build Contracts', () => {
  it('All three portal atmospheres enforce strict containment, pointer-events-none, aria-hidden, scroll/hidden pause & reduced motion', () => {
    const css = readRepo('src/index.css');
    for (const file of [
      'src/components/brand/OfficerAtmosphere.jsx',
      'src/components/brand/PublicAtmosphere.jsx',
      'src/components/brand/FarmerAtmosphere.jsx',
    ]) {
      const src = readRepo(file);
      assert.match(src, /pointer-events-none fixed inset-0 -z-10/);
      assert.match(src, /aria-hidden="true"/);
      assert.match(src, /visibilitychange/);
      assert.match(src, /data-hidden=\{hidden \? 'true' : 'false'\}/);
    }
    for (const cls of ['.farmer-atmosphere', '.public-atmosphere', '.officer-atmosphere']) {
      const re = new RegExp(`${cls.replace('.', '\\.')}\\s*\\{[^}]*contain:\\s*strict;[^}]*transform:\\s*translateZ\\(0\\);`, 's');
      assert.match(css, re, `${cls} must enforce contain: strict and transform: translateZ(0)`);
    }
    assert.match(css, /body\.is-scrolling\s+\.farmer-atmosphere\s+\*/);
    assert.match(css, /body\.is-scrolling\s+\.officer-atmosphere\s+\*/);
    assert.match(css, /body\.is-scrolling\s+\.public-atmosphere\s+\*/);
    assert.match(css, /\.officer-atmosphere\[data-hidden="true"\]\s+\*/);
    assert.match(css, /\.public-atmosphere\[data-hidden="true"\]\s+\*/);
    assert.match(css, /\.farmer-atmosphere\[data-hidden="true"\]\s+\*/);
    assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.officer-radar-sweep/);
    assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.farmer-particle/);
    assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.public-mote/);
  });

  it('F21 PageOutlet settles cleanly to transform: none without trapping sticky SectionNav or fixed game shells', () => {
    const motion = readRepo('src/components/Motion.jsx');
    const css = readRepo('src/index.css');
    assert.match(motion, /is-entering/);
    assert.match(motion, /is-settled/);
    assert.match(motion, /onAnimationEnd/);
    assert.match(motion, /setSettledPath\(pathname\)/);
    assert.match(css, /\.page-enter\.is-entering\s*\{[\s\S]*animation:\s*page-outlet-in/);
    assert.match(css, /\.page-enter\.is-entering:has\(>\s*\.fixed\)\s*\{[^}]*transform:\s*none;[^}]*will-change:\s*auto;/s);
    assert.match(css, /\.page-enter\.is-settled\s*\{[^}]*transform:\s*none;/s);
    assert.doesNotMatch(css, /\.page-enter\s*\{[^}]*contain:\s*(?:layout|paint|strict)/s);
    assert.match(css, /\.farmer-experience\s*\{[^}]*isolation:\s*isolate;/s);
    assert.match(css, /\.officer-workspace\s*\{\s*background:\s*transparent;\s*\}/s);
  });

  it('F22 SectionNav thumb uses GPU translate3d + scaleX instead of left/width; Overlays and ui.jsx avoid animated backdrop-filter & support reduced motion', () => {
    const nav = readRepo('src/components/SectionNav.jsx');
    const ui = readRepo('src/components/ui.jsx');
    const overlays = readRepo('src/components/Overlays.jsx');
    const css = readRepo('src/index.css');

    assert.match(nav, /ResizeObserver/);
    assert.match(nav, /bRect\.left/);
    assert.match(nav, /translate3d\(\$\{thumb\.x\}px,\s*0,\s*0\)\s*scaleX\(/);
    assert.match(nav, /!thumb\s*\?\s*'bg-primary-800/);
    assert.match(nav, /elapsed\s*>\s*1800/);
    assert.match(nav, /behavior:\s*reduce\s*\?\s*'instant'\s*:\s*'smooth'/);
    assert.match(css, /\.section-nav-thumb\s*\{[^}]*left:\s*0;[^}]*transform-origin:\s*0\s+50%;[^}]*transition:\s*transform/s);
    assert.doesNotMatch(css, /\.section-nav-thumb\s*\{[^}]*transition:[^}]*(?:left|width)/s);

    assert.match(css, /@keyframes sheet-fade\s*\{\s*from\s*\{\s*opacity:\s*0;\s*\}\s*to\s*\{\s*opacity:\s*1;\s*\}\s*\}/);
    assert.match(css, /\.toast-pop\s*\{/);
    assert.match(css, /\.animate-fadeIn\s*\{/);
    assert.match(overlays, /toast-pop/);
    assert.match(overlays, /closeRef\.current/);
    assert.match(overlays, /motion-reduce:transition-none/);
    assert.doesNotMatch(overlays, /will-change-transform/);
    assert.match(ui, /motion-reduce:transition-none/);
    assert.match(ui, /,filter\]/);
  });

  it('Vite config splits heavy vendor bundles (three, maplibre, leaflet, recharts, lucide, react) outside single-file build', () => {
    const vite = readRepo('vite.config.js');
    assert.match(vite, /manualChunks/);
    assert.match(vite, /vendor-three/);
    assert.match(vite, /vendor-maplibre/);
    assert.match(vite, /vendor-leaflet/);
    assert.match(vite, /vendor-charts/);
    assert.match(vite, /vendor-react/);
    assert.match(vite, /mode === 'single'\s*\?\s*\{\s*outDir:\s*'dist-single'/);
  });
});

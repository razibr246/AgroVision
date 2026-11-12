// Plays a full season of "মাঠের মানুষ" for every one of the twelve farmers with a simple bot, on the simulation alone,
// to make sure each season can be finished: buy, sow, water, harvest, sell, every question, the heatwave, the pests,
// the storm's safe zone and the price crash. Run with `node --test src/game/sim.test.js`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, update, act, buy, note, answerQuiz, ripeAt, canMax, plotAt, emote, target } from './sim.js';
import { REGIONS, FARMER_IDS, QUESTS } from './regions.js';
import { useService } from './office.js';
import { layoutFor, WORLD_IDS, inWater, resolve } from './layout.js';
import { PLACES, spot } from './places.js';
import { LATERAL, footPath, legIK, reachFor, turnToward, pickWander } from './gait.js';
import { XR_DEFAULTS, cleanXR, cycleXR, eyeLift, turnStep, vignetteTarget, approachVignette, teleportOK, arcPoints, rayGround, pickWorld, standFor, wristVisible, wrapText, layoutPanel, hitPanel } from './xrlogic.js';
import { shopSpec, quizSpec, officeSpec, helperSpec, menuSpec, wristSpec, reportSpec, toastSpec } from './xrpanels.js';

const DT = 1 / 20;
function play(id, budget = 60 * 40) {
  const g = createGame(id);
  const go = (x, z) => { const dx = x - g.me.x, dz = z - g.me.z, d = Math.hypot(dx, dz); return d < 0.5 ? null : { mx: dx / d, mz: dz / d, run: d > 6 }; };
  let t = 0, stuck = 0, lastX = 0, lastZ = 0, lastBuy = null;
  while (!g.won && t < budget) {
    t += DT;
    // a player who uses FieldShift: looks from space, checks the kiosk, opens the water-stress layer when asked
    const need = QUESTS[g.quest]?.need ?? {};
    for (const k of ['satViews', 'advised', 'waterLayer']) if (need[k] && !g.count[k]) note(g, k);
    if (need.officeVisits && !g.count.officeVisits) { note(g, 'officeVisits'); useService(g, 'soiltest'); } // a player who visits the office
    for (const e of g.out.splice(0)) if (e.type === 'open') {
      if (e.panel === 'quiz') { const q = QUESTS[g.quest]; const Q = g.R.quiz[q.quiz]; answerQuiz(g, !!Q); }
      else g.paused = false;
    }
    if (g.paused) { g.paused = false; continue; }
    const me = g.me;
    let target = null, doAct = false;
    const ripe = g.plots.filter((p) => p.crop && !p.dead && p.g >= ripeAt(g));
    const near = (list) => list.sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
    const seeds = Object.values(g.seeds).reduce((a, b) => a + b, 0), basket = Object.values(g.basket).reduce((a, b) => a + b, 0);
    const z = g.ev.zone;
    if (z && z.left > 0 && z.left < 14) target = [z.x, z.z];
    else if (g.ev.storm > 0 && z) target = [z.x, z.z];
    else if (g.plots.some((p) => p.pests)) { const p = near(g.plots.filter((q) => q.pests)); target = [p.x, p.z]; doAct = true; }
    else if (ripe.length) { const p = near(ripe); target = [p.x, p.z]; doAct = true; }
    else if (basket >= 3 || (basket && !g.plots.some((p) => p.crop && !p.dead))) { target = [g.S.market.x, g.S.market.z]; doAct = true; }
    else if (g.can === 0 && g.plots.some((p) => p.crop && !p.dead)) { target = [g.S.water.x, g.S.water.z]; doAct = true; }
    else if (g.plots.some((p) => p.dead)) { const p = near(g.plots.filter((q) => q.dead)); target = [p.x, p.z]; doAct = true; }
    else if (g.plots.some((p) => p.crop && !p.dead && p.moist < 0.45 && p.g < ripeAt(g))) { const p = near(g.plots.filter((q) => q.crop && !q.dead && q.moist < 0.45 && q.g < ripeAt(g))); target = [p.x, p.z]; doAct = true; }
    else if (seeds && g.plots.some((p) => !p.crop)) {
      const p = near(g.plots.filter((q) => !q.crop)); target = [p.x, p.z]; doAct = true;
      const alt = Object.keys(g.seeds).find((k) => g.seeds[k] > 0 && k !== p.last); if (alt) g.sel = alt; // rotate where it can
    }
    else if (!seeds && g.money >= 30 && g.plots.filter((p) => !p.crop).length >= 3) {
      const d = Math.hypot(g.S.shed.x - me.x, g.S.shed.z - me.z);
      if (d < 3.4) { const k = Object.keys(g.R.crops).filter((c) => c !== g.R.glut || !g.ev.glut).sort((a, b) => (a === lastBuy) - (b === lastBuy) || (g.R.crops[b].price - g.R.crops[b].cost) - (g.R.crops[a].price - g.R.crops[a].cost)).find((c) => g.money >= g.R.crops[c].cost * 6) ?? Object.keys(g.R.crops).find((c) => g.money >= g.R.crops[c].cost * 3); if (k) { buy(g, k, g.money >= g.R.crops[k].cost * 6 ? 6 : 3); lastBuy = k; } }
      else target = [g.S.shed.x, g.S.shed.z];
    }
    let inp = target ? go(...target) : null;
    if (target && (!inp || Math.hypot(target[0] - me.x, target[1] - me.z) < (plotAt(target[0], target[1]) !== null ? 0.9 : 3))) { inp = null; if (doAct) act(g); }
    update(g, DT, inp ?? {});
    if (Math.hypot(me.x - lastX, me.z - lastZ) < 0.001 && inp) stuck++; else stuck = 0;
    lastX = me.x; lastZ = me.z;
    if (stuck > 200) { me.x += (Math.random() - 0.5) * 2; me.z += (Math.random() - 0.5) * 2; stuck = 0; }
  }
  return { g, t };
}

for (const id of FARMER_IDS) {
  test(`a full season can be won with ${REGIONS[id].farmer.en}`, () => {
    const { g, t } = play(id);
    if (process.env.SIMLOG) console.log(id, Math.round(t), "s", JSON.stringify(g.count), "hurt", g.count.hurt, "answers", g.answers.length);
    assert.ok(g.won, `${id} stuck at mission ${g.quest + 1} (${QUESTS[g.quest]?.id}) after ${Math.round(t)} s; money ${g.money}`);
    assert.ok(g.count.earned >= 1000);
  });
}

test('every farmer has every question their season asks, and every crop has a shape and a price', () => {
  for (const id of FARMER_IDS) {
    const R = REGIONS[id];
    for (const k of ['water', 'heat', 'pests', 'storm', 'profit']) {
      const Q = R.quiz[k];
      assert.ok(Q, `${id} lacks the ${k} question`);
      assert.equal(Q.options.filter((o) => o.ok).length, 1, `${id} ${k}: exactly one right answer`);
      assert.ok(Q.perk && Q.why.bn && Q.why.en);
    }
    assert.equal(Object.keys(R.crops).length, 4);
    assert.ok(R.crops[R.glut], `${id}: the crop whose price crashes is one of theirs`);
    assert.ok(WORLD_IDS.includes(R.world), `${id}: world ${R.world} exists`);
    assert.ok(R.intro.length === 5 && R.farmer.look && R.names.safe && R.dinner && R.cur);
  }
});

test('the stations and the safe ground are reachable on dry land in every world', () => {
  for (const w of WORLD_IDS) {
    const L = layoutFor(w);
    for (const k of ['shed', 'water', 'market', 'kiosk', 'safe']) {
      const s = L.S[k];
      const free = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [-3, 0]].some(([dx, dz]) => !L.water.some((wt) => (wt.r ? Math.hypot(s.x + dx - wt.cx, s.z + dz - wt.cz) < wt.r : s.x + dx > wt.x0 && s.x + dx < wt.x1 && s.z + dz > wt.z0 && s.z + dz < wt.z1)));
      assert.ok(free, `${w}: ${k} is under water`);
    }
  }
});

test('every farmer’s village has named places, neighbours and signs, all on dry walkable ground', () => {
  for (const id of FARMER_IDS) {
    const H = PLACES[id], L = layoutFor(REGIONS[id].world);
    assert.ok(H, `${id} has a village`);
    assert.ok(H.places.length >= 5 && H.folk.length >= 3 && H.dawn && H.dusk, `${id}: places, neighbours, dawn and dusk`);
    for (const k of ['shed', 'market', 'kiosk', 'safe']) assert.ok(H.signs[k]?.t, `${id}: a ${k} sign`);
    const at = (p) => spot(L.S, p);
    const spots = [...H.places.map((p) => [...at(p.at), `place ${p.id}`]), ...H.folk.flatMap((f) => (f.at ? [f.at] : f.route).map((p) => [...at(p), `${f.id}`]))];
    for (const [x, z, what] of spots) {
      assert.ok(Math.hypot(x, z) < 43.5, `${id}: ${what} is inside the walkable circle`);
      assert.ok(!inWater(L, x, z), `${id}: ${what} is not in the water`);
      const [rx, rz] = resolve(L, x, z, 0.3);
      assert.ok(Math.hypot(rx - x, rz - z) < 0.6, `${id}: ${what} is not inside a building or tree`);
    }
    for (const p of H.places) assert.ok(p.name.bn && p.name.en && p.line.bn && p.line.en, `${id}: ${p.id} is named and told in both languages`);
  }
});

test('walking the village finds every place, once each', () => {
  const g = createGame('razib');
  for (const p of g.home.places) { [g.me.x, g.me.z] = spot(g.S, p.at); update(g, DT, {}); }
  [g.me.x, g.me.z] = spot(g.S, g.home.places[0].at); update(g, DT, {});
  assert.equal(g.seen.length, g.home.places.length);
  assert.equal(g.out.filter((e) => e.type === 'place').length, g.home.places.length);
});

test('the walkable land reaches the outer villages, and nothing out there stands in water or a field', async () => {
  const { layoutFor, WORLD_IDS, inWater, resolve } = await import('./layout.js');
  const { WORLD_R } = await import('./regions.js');
  for (const w of WORLD_IDS) {
    const L = layoutFor(w), outer = L.props.filter((p) => p.outer);
    assert.ok(outer.length >= 30, `${w}: only ${outer.length} things beyond the farm`);
    for (const p of outer) assert.ok(!inWater(L, p.x, p.z), `${w}: ${p.type} in the water`);
    const [x, z] = resolve(L, 500, 0);
    assert.ok(Math.hypot(x, z) <= WORLD_R + 1e-6);
  }
});

test('running into a wall stops the farmer with a thud', async () => {
  const { createGame, update } = await import('./sim.js');
  const g = createGame('razib');
  const b = g.L.blockers.find((x) => x.r && x.r > 0.3);
  g.me.x = b.x - b.r - 1.2; g.me.z = b.z; g.me.vx = 4; g.me.vz = 0; g.nextQuestAt = 1e9;
  for (let k = 0; k < 30; k++) update(g, 1 / 30, { mx: 1, mz: 0, run: true });
  assert.ok(g.out.some((e) => e.type === 'sound' && e.s === 'bump'), 'a thud');
  assert.ok(Math.hypot(g.me.x - b.x, g.me.z - b.z) >= b.r + 0.34, 'not inside the tree');
});

// ── FieldShift's rotation lessons, and the station's real data for every farmer's place ──
const onPlot = (g, p) => { g.me.x = p.x; g.me.z = p.z; g.me.act = null; };
const sowHarvest = (g, p, k) => { g.seeds[k] = 1; g.sel = k; onPlot(g, p); act(g); p.g = 1; g.me.act = null; act(g); };

test('the same crop twice on a plot is a repeat and the pest wave finds it; a different crop is a rotation', () => {
  const g = createGame('rahimu'); g.nextQuestAt = 1e9;
  const [a, b] = g.plots;
  sowHarvest(g, a, 'wheat'); sowHarvest(g, b, 'wheat');
  g.seeds.wheat = 1; g.sel = 'wheat'; onPlot(g, a); act(g);
  g.seeds.lentil = 1; g.sel = 'lentil'; g.me.act = null; onPlot(g, b); act(g);
  assert.equal(g.count.repeats, 1); assert.equal(g.count.rotated, 1);
  assert.ok(a.repeat && !b.repeat);
  g.quest = QUESTS.findIndex((q) => q.event === 'pests'); g.mods.pests = 0.01;
  answerQuiz(g, false); g.waitFor.then();
  for (let k = 0; k < 400; k++) update(g, DT, {});
  assert.ok(a.pests > 0, 'the repeated plot is struck');
});

test('a legume enriches the soil and bare plots lose topsoil in the storm', async () => {
  const { seasonReport } = await import('./fieldshift.js');
  const g = createGame('rahimu'); g.nextQuestAt = 1e9;
  const p = g.plots[0];
  sowHarvest(g, p, 'lentil');
  assert.equal(g.count.legumes, 1); assert.ok(p.fert > 0.3);
  const before = p.fert;
  g.ev.storm = DT; update(g, DT, {});
  assert.ok(p.fert < before, 'the bare plot lost soil');
  assert.equal(g.count.eroded, 18);
  const r = seasonReport(g);
  assert.equal(r.legumes, 1); assert.ok(r.tips.length >= 1 && r.tips[0].bn && r.tips[0].en);
});

test('every farmer’s FieldShift station has real NASA cards for their own place', async () => {
  const { placeOf, spaceFacts } = await import('./fieldshift.js');
  const { readFileSync } = await import('node:fs');
  for (const id of FARMER_IDS) {
    const pl = placeOf(REGIONS[id], id);
    const normals = pl.kind === 'abroad' ? JSON.parse(readFileSync(new URL(`../data/abroad/${pl.id}.json`, import.meta.url))).points.farm.normals : null;
    const cards = spaceFacts(pl, normals), ids = cards.map((c) => c.id);
    for (const k of ['bare', 'heat', 'et', 'soil', 'grace', 'rain', 'frost', 'truth']) assert.ok(ids.includes(k), `${id}: no ${k} card`);
    for (const c of cards) for (const f of ['title', 'value', 'detail', 'term']) assert.ok(c[f].bn && c[f].en && !/NaN|undefined/.test(c[f].en + c[f].bn), `${id} ${c.id}.${f}`);
  }
});

test('the what-if sliders reach both rotation engines, and the season gets hotter and drier', async () => {
  const { sliderChange, sliderMods } = await import('./fieldshift.js');
  const { abroadRotations } = await import('../engine/rotationAbroad.js');
  const { readFileSync } = await import('node:fs');
  assert.equal(sliderChange(0, 0), null);
  const ch = sliderChange(2, -20);
  assert.deepEqual([ch.dTmax[5], ch.rain[5]], [2, 0.8]);
  const sy = JSON.parse(readFileSync(new URL('../data/soil/abroad_soil_yields.json', import.meta.url))).countries.india;
  const normals = JSON.parse(readFileSync(new URL('../data/abroad/india.json', import.meta.url))).points.farm.normals;
  const res = abroadRotations({ country: 'india', soil: sy.soil, yields: sy.yields, normals, change: ch });
  assert.ok(res.options.length >= 3 && res.options.every((o) => Number.isFinite(o.dSocFut)));
  const m = sliderMods(2, -20);
  assert.ok(m.heat > 1 && m.dry > 1);
  const g = createGame('razib', m), h = createGame('razib');
  for (const x of [g, h]) { x.nextQuestAt = 1e9; Object.assign(x.plots[0], { crop: 'mustard', moist: 1 }); for (let k = 0; k < 100; k++) update(x, DT, {}); }
  assert.ok(g.plots[0].moist < h.plots[0].moist, 'less rain dries the soil faster');
});

test('every neighbour’s rotation option has its irrigation water and harvest value, and the brief names old prices', async () => {
  const { abroadRotations, cropAbroad } = await import('../engine/rotationAbroad.js');
  const { climateChange } = await import('../engine/soilfuture.js');
  const { abroadBrief } = await import('./fieldshift.js');
  const { readFileSync } = await import('node:fs');
  const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
  const SY = read('../data/soil/abroad_soil_yields.json').countries, PR = read('../data/market/abroad_prices.json').countries, deltas = read('../data/climate/cmip6_deltas.json');
  for (const c of ['india', 'pakistan', 'nepal', 'bhutan', 'myanmar']) {
    const normals = read(`../data/abroad/${c}.json`).points.farm.normals;
    const r = abroadRotations({ country: c, soil: SY[c].soil, yields: SY[c].yields, normals, change: climateChange(deltas, `abroad_${c}`), prices: PR[c] });
    const habit = r.options.find((o) => o.habit);
    for (const o of r.options) {
      assert.ok(Number.isFinite(o.waterMm) && o.waterMm >= 0 && Number.isFinite(o.waterFut), `${c}: water`);
      assert.ok(o.gross > 0 && o.unpriced.length === 0, `${c}: every crop priced`);
      const b = abroadBrief(o, habit, (k) => cropAbroad(k).name, true, PR[c]);
      assert.ok(b.evidence.some((x) => /FAO-56/.test(x.en)) && b.gaps.some((x) => /costs/.test(x.en)));
    }
  }
});

test('every mission names its farming problem and the NASA record that answers it; the data must be used', () => {
  for (const q of QUESTS) for (const f of ['bn', 'en']) assert.ok(q.problem?.[f] && q.how?.[f], `${q.id}: ${f}`);
  const g = createGame('razib'); g.nextQuestAt = 0;
  for (let k = 0; k < 40; k++) update(g, DT, {});
  assert.equal(QUESTS[g.quest].id, 'scan', 'looking at the field is not enough');
  note(g, 'satViews'); for (let k = 0; k < 60; k++) update(g, DT, {});
  assert.equal(QUESTS[g.quest].id, 'buy');
  buy(g, 'mustard', 3); for (let k = 0; k < 60; k++) update(g, DT, {});
  assert.equal(QUESTS[g.quest].id, 'buy', 'seed bought without checking FieldShift does not count');
  note(g, 'advised'); for (let k = 0; k < 60; k++) update(g, DT, {});
  assert.equal(QUESTS[g.quest].id, 'plant');
});

test('before sowing, the prompt knows a rotation from a repeat; the season ends with strategies to try next', async () => {
  const { seasonReport, nextTry } = await import('./fieldshift.js');
  const { target } = await import('./sim.js');
  const g = createGame('rahimu'); g.nextQuestAt = 1e9;
  const p = g.plots[0];
  sowHarvest(g, p, 'wheat');
  g.seeds.wheat = 1; g.sel = 'wheat'; onPlot(g, p);
  assert.equal(target(g).rot, 'repeat');
  g.seeds.lentil = 1; g.sel = 'lentil';
  assert.equal(target(g).rot, 'rotate');
  g.count.repeats = 2; g.count.eroded = 4;
  const tries = nextTry(seasonReport(g), g.R);
  assert.ok(tries.length >= 2 && tries.length <= 3);
  assert.equal(tries.at(-1).id, 'heat'); assert.deepEqual(tries.at(-1).whatIf, { dT: 2, rain: -10 });
  assert.ok(tries.some((x) => x.id === 'rotate'));
  for (const x of tries) assert.ok(x.title.bn && x.title.en && x.why.bn && x.why.en && !/NaN|undefined/.test(x.why.en));
});

test('agronomic progression: XP, leveling, soil health, and agriScorecard work accurately', async () => {
  const { agriScorecard, gainXp, LEVELS } = await import('./sim.js');
  const g = createGame('razib');
  assert.equal(g.xp, 0);
  assert.equal(g.level, 1);
  assert.equal(g.soilHealth, 50);
  assert.equal(g.carbonScore, 25);
  assert.equal(LEVELS.length, 4);

  // Gain XP and level up
  gainXp(g, 90, { bn: 'পরীক্ষা', en: 'Test' });
  assert.equal(g.xp, 90);
  assert.equal(g.level, 2);

  // Scorecard evaluation
  g.count.rotated = 3;
  g.count.legumes = 2;
  g.count.repeats = 0;
  g.count.watered = 5;
  g.count.earned = 1200;
  const sc = agriScorecard(g);
  assert.ok(sc.rotScore >= 80);
  assert.ok(sc.waterScore >= 50);
  assert.ok(sc.diversityScore >= 50);
  assert.ok(sc.econScore >= 70);
  assert.ok(sc.overall >= 70);
  assert.ok([1, 2, 3].includes(sc.stars));
  assert.ok(sc.takeaways.length > 0);
  for (const t of sc.takeaways) {
    assert.ok(t.bn && t.en);
  }
});

test('a career grows across seasons: XP for farming well, ranks, achievements once each, equipment unlocked', async () => {
  const { recordSeason, rankOf, startPerks, seasonXp, emptyCareer, ACHIEVEMENTS, RANKS, UNLOCKS } = await import('./career.js');
  const report = { rotated: 3, repeats: 0, legumes: 2, enriched: 6, eroded: 0 };
  const res = (who, country, extra = {}) => ({ who, country, stars: 3, count: { earned: 2100, satViews: 1, waterLayer: 1, advised: 2 }, report, whatIf: null, ...extra });
  const good = seasonXp(res('razib', 'bangladesh')), poor = seasonXp({ ...res('razib', 'bangladesh'), stars: 1, report: { rotated: 0, repeats: 5, legumes: 0, enriched: 0, eroded: 4 }, count: {} });
  assert.ok(good.total > poor.total && poor.total >= 50, 'farming well is worth more, and every win is worth something');
  for (const p of good.parts) assert.ok(p.label.bn && p.label.en);
  let c = emptyCareer(), out;
  out = recordSeason(c, res('razib', 'bangladesh'));
  assert.deepEqual(c, emptyCareer(), 'never mutates');
  c = out.career;
  for (const id of ['first', 'stars3', 'rotator', 'norepeat', 'legume', 'soil', 'covered', 'data', 'harvest']) assert.ok(c.achievements[id], id);
  assert.equal(recordSeason(c, res('razib', 'bangladesh')).newAchievements.length, 0, 'each achievement once');
  for (const [who, country] of [['harjinder', 'india'], ['ghulam', 'pakistan'], ['rampyari', 'nepal'], ['kinley', 'bhutan'], ['kyawwin', 'myanmar']]) c = recordSeason(c, res(who, country, { whatIf: { dT: 2, rain: -10 } })).career;
  assert.ok(c.achievements.world && c.achievements.three && c.achievements.heat);
  assert.ok(!c.achievements.bangladesh);
  assert.equal(rankOf(0).index, 0); assert.equal(rankOf(RANKS.at(-1).xp + 1).next, null);
  assert.deepEqual(startPerks({ xp: 0 }), []);
  assert.deepEqual(startPerks({ xp: RANKS.at(-1).xp }), UNLOCKS.map((u) => u.perk));
  for (const a of ACHIEVEMENTS) assert.ok(a.title.bn && a.title.en && a.what.bn && a.what.en && a.icon, a.id);
});

test('navigation: in every village a route reaches every station on walkable ground, keeps off the crops, and is smooth', async () => {
  const { bakeNav, findPath, costAt, smooth, pathLength, AREA } = await import('./nav.js');
  const { layoutFor, WORLD_IDS } = await import('./layout.js');
  for (const w of WORLD_IDS) {
    const L = layoutFor(w), t0 = performance.now(), nav = bakeNav(L), ms = performance.now() - t0;
    assert.ok(ms < 1500, `${w}: baking took ${Math.round(ms)} ms`);
    for (const [id, s] of Object.entries(L.S)) {
      if (!s || id === 'start') continue;
      const p = findPath(nav, L.S.start.x, L.S.start.z, s.x, s.z);
      assert.ok(p && p.length >= 2, `${w}: no route to ${id}`);
      for (let k = 1; k < p.length; k++) {
        const [ax, az] = p[k - 1], [bx, bz] = p[k], d = Math.hypot(bx - ax, bz - az);
        for (let u = 0; u <= d; u += 0.25) assert.ok(costAt(nav, ax + ((bx - ax) * u) / (d || 1), az + ((bz - az) * u) / (d || 1)) < Infinity, `${w} → ${id}: the route crosses a wall or water`);
      }
      assert.ok(pathLength(p) < 3 * Math.hypot(s.x - L.S.start.x, s.z - L.S.start.z) + 20, `${w} → ${id}: a long way round`);
    }
  }
  // the area costs steer a route: a patch of neighbours' crops costs more than the grass beside it
  const L = layoutFor('dhamrai'), nav = bakeNav(L);
  const patch = L.patches.find(([x0, x1, z0, z1, k]) => k !== 'bare' && Math.hypot((x0 + x1) / 2, (z0 + z1) / 2) < 70);
  if (patch) assert.ok(costAt(nav, (patch[0] + patch[1]) / 2, (patch[2] + patch[3]) / 2) === AREA.crops || costAt(nav, (patch[0] + patch[1]) / 2, (patch[2] + patch[3]) / 2) === Infinity);
  const zig = [[-5, 30], [-4, 31], [-3, 30], [-2, 31], [-1, 30]];
  assert.ok(smooth(nav, zig).length <= zig.length);
});

test('the village: haat prices move and recover, a forecast shower waters every plot, compost builds soil, urea speeds a crop, orders pay', async () => {
  const V = await import('./village.js');
  const { priceOf } = await import('./sim.js');
  const g = createGame('rahimu'); g.nextQuestAt = 1e9; g.nextOrder = 1e9;
  // market days
  for (let k = 0; k < 6; k++) { g.market.next = 0; update(g, DT, {}); }
  for (const m of Object.values(g.market.mult)) assert.ok(m >= 0.78 && m <= 1.5);
  assert.ok(g.out.some((e) => e.type === 'alert' && /Market day/.test(e.title.en)));
  assert.equal(priceOf(g, 'wheat'), Math.round(g.R.crops.wheat.price * (1 + g.F.sellBonus) * g.market.mult.wheat));
  // a shower: forecast, then every plot wet; water poured just before it is called out
  g.nextShower = 0; update(g, DT, {});
  assert.ok(g.ev.showerSoon > 0, 'forecast first');
  const p = g.plots[0]; Object.assign(p, { crop: 'wheat', g: 0.2, moist: 0.3 }); g.me.x = p.x; g.me.z = p.z; g.me.act = null; act(g);
  assert.equal(g.count.wasted, 1);
  g.plots[1].crop = 'wheat'; g.plots[1].moist = 0.1;
  for (let k = 0; k < (V.SHOWER.warn + 1) / DT; k++) update(g, DT, {});
  assert.ok(g.ev.shower > 0 && g.plots[1].moist === 1, 'the rain waters the field');
  // fertiliser: compost builds the soil, urea speeds this crop and costs soil
  g.money = 500; assert.ok(V.buyFertilizer(g, 'compost', 1) && V.buyFertilizer(g, 'urea', 1));
  const a = g.plots[2], b = g.plots[3]; Object.assign(a, { crop: 'wheat', g: 0, moist: 1, fert: 0.1 }); Object.assign(b, { crop: 'wheat', g: 0, moist: 1, fert: 0.1 });
  const soil0 = g.soilHealth;
  assert.ok(V.fertilize(g, 'compost', a) && a.fert > 0.1 && g.soilHealth > soil0);
  assert.ok(V.fertilize(g, 'urea', b) && b.fert < 0.1 && b.feed > a.feed);
  assert.equal(V.fertilize(g, 'urea', b), false, 'once per crop');
  // an order: met at the market when the basket holds enough
  g.order = { crop: 'wheat', n: 2, bonus: 40, who: { bn: 'চাচি', en: 'Auntie' }, left: 50, total: 50 };
  g.basket.wheat = 2; const m0 = g.money;
  assert.equal(V.fillOrder(g), 40); assert.equal(g.money, m0 + 40); assert.equal(g.count.orders, 1); assert.equal(g.order, null);
});

test('a season saves and continues: money, plots, counts, the mission reached and the market come back; events restart cleanly', async () => {
  const { saveState, restoreState } = await import('./savegame.js');
  const g = createGame('rahimu'); g.nextQuestAt = 1e9;
  sowHarvest(g, g.plots[0], 'lentil'); g.money = 321; g.quest = 4; g.market.mult.wheat = 1.27; g.fertilizer.compost = 2;
  Object.assign(g.plots[5], { crop: 'wheat', g: 0.6, pests: 1 }); g.ev.storm = 5; g.ev.done.heat = true;
  const s = JSON.parse(JSON.stringify(saveState(g)));
  const h = createGame('rahimu');
  assert.ok(restoreState(h, s));
  assert.equal(h.money, 321); assert.equal(h.quest, 4); assert.equal(h.count.legumes, 1); assert.equal(h.plots[0].last, 'lentil');
  assert.equal(h.plots[5].crop, 'wheat'); assert.equal(h.plots[5].pests, 0); assert.equal(h.market.mult.wheat, 1.27); assert.equal(h.fertilizer.compost, 2);
  assert.ok(h.ev.done.heat && !(h.ev.storm > 0) && !h.questStarted && h.timers.length === 0, 'events restart cleanly');
  assert.equal(restoreState(createGame('razib'), s), false, 'a save belongs to its own farmer');
  for (let k = 0; k < 200; k++) update(h, DT, {});
  assert.ok(h.questStarted, 'the mission reached starts again');
});

test('game settings: stored values are clamped and snapped, bad ones fall back, invert flips the look', async () => {
  const { parseSettings, cleanSettings, DEFAULT_SETTINGS, isDefault, lookDelta } = await import('./settings.js');
  assert.deepEqual(parseSettings('not json'), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS);
  const s = cleanSettings({ look: 9, invertY: 'yes', fov: -30, text: '1.17', extra: 1 });
  assert.deepEqual(s, { look: 2, invertY: false, fov: -8, text: 1.2, fastWalk: false });
  assert.ok(isDefault(cleanSettings({})) && !isDefault(s));
  const a = lookDelta(10, 10, 0.01, { look: 1, invertY: false }), b = lookDelta(10, 10, 0.01, { look: 1, invertY: true });
  assert.equal(a.pitch, -b.pitch); assert.equal(a.yaw, b.yaw);
  assert.equal(lookDelta(10, 0, 0.01, { look: 2, invertY: false }).yaw, 2 * a.yaw);
});

test('the camera stays out of houses: it comes in before a wall, passes over roofs, ignores posts', async () => {
  const { camReach } = await import('./camclip.js');
  const house = { x: 0, z: 5, hw: 2, hd: 1.5, c: 1, s: 0 }; // a box from z 3.5 to 6.5
  const t = camReach([house], [0, 1.45, 0], [0, 3, 10]);
  assert.ok(t > 0.25 && t < 0.35, `stops before the wall at z≈3.15, got t=${t.toFixed(3)}`);
  assert.equal(camReach([house], [0, 1.45, 0], [0, 3, 2]), 0.98, 'nothing in the way: (almost) all the way');
  assert.equal(camReach([house], [0, 1.45, 0], [10, 3, 0]), 0.98, 'a house off to the side does not pull the camera in');
  assert.equal(camReach([house], [0, 6, 0], [0, 12, 10]), 0.98, 'high above the roof the camera passes over');
  assert.equal(camReach([{ x: 0, z: 4, r: 0.3 }], [0, 1.45, 0], [0, 3, 10]), 0.98, 'a post or trunk does not');
  const big = camReach([{ x: 0, z: 4, r: 1.5 }], [0, 1.45, 0], [0, 3, 10]);
  assert.ok(big < 0.25, 'a haystack-size circle does');
  const turned = { x: 0, z: 5, hw: 2, hd: 1.5, c: Math.cos(Math.PI / 2), s: Math.sin(Math.PI / 2) }; // now 3 wide, 4 deep
  assert.ok(camReach([turned], [0, 1.45, 0], [0, 3, 10]) < t, 'a turned house is deeper along z');
  assert.equal(camReach([house], [0, 1.45, 5], [0, 3, 10]), 0.98, 'a focus already inside a footprint is not trapped');
});

test('villagers do real work: a courtyard goes round sweep, spread, winnow; a picker walks the row, then tips the basket', async () => {
  const { newJob, nextStep, finishStep, siteKind, toWorld, COURTYARD, ROW } = await import('./villagework.js');
  assert.equal(siteKind({ at: ['house', 3, 3] }), 'courtyard');
  assert.equal(siteKind({ at: [21, 6] }), 'field');
  let j = newJob('courtyard'); const seen = [];
  const steps = COURTYARD.reduce((s, t) => s + t.n, 0);
  for (let k = 0; k < steps; k++) { const s = nextStep(j); seen.push(s.act); assert.ok(Math.hypot(...s.at) < 2.8 && s.at[1] > -0.2, `${s.act} stays near home, on the open side`); j = finishStep(j); }
  assert.deepEqual([...new Set(seen)], ['sweep', 'spread', 'winnow']);
  assert.equal(j.task, 0, 'and round again');
  const sweeps = seen.filter((a) => a === 'sweep').length; assert.ok(sweeps >= 3, 'the broom moves across the yard, not on one spot');
  j = newJob('field'); const xs = [];
  for (let k = 0; k < ROW; k++) { const s = nextStep(j); assert.equal(s.act, 'pick'); xs.push(s.at[0]); j = finishStep(j); assert.equal(j.picked.filter(Boolean).length, k + 1); }
  assert.ok(xs.every((x, k) => !k || x > xs[k - 1]), 'along the row in order');
  assert.equal(j.fill, 1, 'the basket is full at the end of the row');
  assert.equal(nextStep(j).act, 'tip'); j = finishStep(j);
  assert.equal(j.fill, 0); assert.ok(j.picked.every((p) => !p), 'emptied, and the row is ready again');
  const w = toWorld({ x: 10, z: 5, yaw: Math.PI / 2 }, [0, 1]); // facing +x: ahead is +x
  assert.ok(Math.abs(w[0] - 11) < 1e-9 && Math.abs(w[1] - 5) < 1e-9);
});

test('Chakra helper in the game: does the jobs for real, asks before spending, checks the forecast, rotates crops', async () => {
  const { helperJobs, newJob, nextStep, sowPlan, stepLine } = await import('./helper.js');
  const run = (g, job) => {
    let s, n = 0;
    while ((s = nextStep(g, job)) && n < 60) {
      if (s.kind === 'station') { g.me.x = g.S[s.id].x; g.me.z = g.S[s.id].z; } else { g.me.x = s.x; g.me.z = s.z; }
      if (s.sel) g.sel = s.sel;
      if (s.buy) { for (const b of s.buy) buy(g, b.k, b.n); job.bought = true; }
      else if (s.kind !== 'spot') act(g);
      job.log.push(stepLine(g, s)); job.steps++; n++;
      for (let k = 0; k < 40 && g.me.act; k++) update(g, DT, {});
    }
    return job;
  };
  const g = createGame('razib'); g.nextQuestAt = 1e9; g.ev.showerSoon = 0;
  const C = Object.keys(g.R.crops);
  Object.assign(g.plots[0], { crop: C[0], g: 2, moist: 0.8 });           // ripe
  Object.assign(g.plots[1], { crop: C[1], g: 0.3, moist: 0.1 });         // dry
  Object.assign(g.plots[2], { crop: C[1], g: 0.3, moist: 0.1, pests: 1 }); // pests (and dry)
  const ids = helperJobs(g).map((j) => j.id);
  for (const id of ['rounds', 'pests', 'harvest', 'water']) assert.ok(ids.includes(id), `${id} offered`);
  const money0 = g.money;
  run(g, newJob('rounds'));
  assert.equal(g.plots[2].pests, 0, 'pests treated');
  assert.ok(!g.plots[0].crop && g.plots[0].last === C[0], 'ripe plot harvested');
  assert.ok(g.count.watered >= 2 && g.plots[1].moist > 0.7 && g.plots[2].moist > 0.7, 'dry plots watered');
  assert.ok(g.money > money0 && Object.values(g.basket).every((n) => n === 0), 'and sold at the market');
  // rain coming: the agent will not water
  Object.assign(g.plots[1], { moist: 0.1 }); g.ev.showerSoon = 20;
  const w = helperJobs(g).find((j) => j.id === 'water');
  assert.ok(w?.blocked, 'watering is held back with the reason');
  assert.equal(nextStep(g, newJob('water')), null);
  g.ev.showerSoon = 0;
  // sowing spends money: nothing happens until the farmer approves
  for (const k of C) g.seeds[k] = 0;
  const sp = sowPlan(g);
  assert.ok(sp.cost > 0 && sp.plan.every(({ i, k }) => k !== g.plots[i].last), 'never the same crop again on a plot');
  assert.equal(nextStep(g, newJob('sow')), null, 'not approved: no buying');
  g.money = sp.cost + 50;
  const job = run(g, newJob('sow', { approved: true }));
  assert.ok(job.log.length > 1 && g.plots.filter((p) => !p.crop && !p.dead).length === 0, 'bought and sowed every empty plot');
  assert.equal(g.plots[0].crop !== C[0], true, 'the harvested plot got a different crop');
});

test('farmer gestures and emotes: wave, wipe brow to restore stamina, and soil inspection', () => {
  const g = createGame('razib');
  // 1. Wipe brow recovers stamina
  g.me.stamina = 0.2;
  const wiped = emote(g, 'wipe');
  assert.equal(wiped, true);
  assert.equal(g.me.act?.type, 'wipe');
  assert.ok(g.me.stamina >= 0.5, 'wiping brow restored stamina');
  const wipeToast = g.out.find((e) => e.type === 'toast');
  assert.ok(wipeToast && /ঘাম/.test(wipeToast.text.bn));

  // Clear act
  g.me.act = null;

  // 2. Wave / Greet
  const greeted = emote(g, 'greet');
  assert.equal(greeted, true);
  assert.equal(g.me.act?.type, 'wave');

  // Clear act
  g.me.act = null;

  // 3. Soil Check
  const checked = emote(g, 'soilcheck');
  assert.equal(checked, true);
  assert.equal(g.me.act?.type, 'soilcheck');
  const soilToast = g.out.find((e) => e.type === 'toast' && /মাটি/.test(e.text.bn));
  assert.ok(soilToast, 'soil check produced diagnostic feedback');
});

// The animals' walk (gait.js): a four-beat lateral sequence, planted feet that move back at the body's speed (no
// sliding), two-bone IK that reaches the foot with the knee bent the right way, and wandering that stays near home.
test('animal walk: lateral sequence, feet do not slide, IK reaches the foot', () => {
  const order = Object.entries(LATERAL).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  assert.deepEqual(order, ['LH', 'LF', 'RH', 'RF']);
  const speed = 0.75, period = 1.3, duty = 0.66, reach = reachFor(speed, period, duty);
  for (let p = 0.02; p < duty - 0.02; p += 0.05) {
    const a = footPath(p, duty, reach, 0.1), b = footPath(p + 0.01, duty, reach, 0.1);
    assert.equal(a.stance, true); assert.equal(a.dy, 0);
    const v = -(b.dz - a.dz) / (0.01 * period); // how fast the planted foot moves back under the body
    assert.ok(Math.abs(v - speed) < 1e-9, `planted foot moves at ${v}, body at ${speed}`);
  }
  const sw = footPath(duty + (1 - duty) / 2, duty, reach, 0.1);
  assert.equal(sw.stance, false); assert.ok(Math.abs(sw.dy - 0.1) < 1e-9);
  assert.ok(Math.abs(footPath(0, duty, reach, 0.1).dz - footPath(0.999999, duty, reach, 0.1).dz) < 1e-4, 'the cycle closes');
  for (const [bend, z, y] of [[1, 0.1, -0.85], [-1, -0.2, -0.9], [-1, 0.15, -0.7]]) {
    const a = 0.5, b = 0.48, [u, l] = legIK(a, b, z, y, bend);
    const fz = a * Math.sin(u) + b * Math.sin(l), fy = -a * Math.cos(u) - b * Math.cos(l);
    assert.ok(Math.hypot(fz - z, fy - y) < 1e-6, 'IK reaches the target');
    const kz = a * Math.sin(u), side = (kz - z * (a / Math.hypot(z, y)));
    assert.ok(Math.sign(u - Math.atan2(z, -y)) === bend, 'the joint bends the right way');
    void side;
  }
  assert.ok(Math.abs(turnToward(0, 3, 0.2) - 0.2) < 1e-12);
  assert.ok(Math.abs(turnToward(3, -3, 0.5) - (3 + (2 * Math.PI - 6))) < 1e-12, 'turns the short way round');
});

test('animals wander near home and never onto forbidden ground', () => {
  let s = 1; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const ok = (x, z) => !(x > 1 && x < 3); // a strip of water
  for (let k = 0; k < 300; k++) {
    const to = pickWander([0, 0], [0.5, 0], 3, rnd, ok);
    if (!to) continue;
    assert.ok(Math.hypot(to[0], to[1]) <= 3);
    for (let f = 0; f <= 1; f += 0.25) assert.ok(ok(0.5 + (to[0] - 0.5) * f, to[1] * f), 'never crosses the water');
  }
});

test('agriculture office: every farmer has one on dry ground, the officer reads the farm, real programmes, services once a season', async () => {
  const { farmTroubles, officePrograms, canUse, useService, officeOf } = await import('./office.js');
  for (const id of FARMER_IDS) {
    const g = createGame(id); g.nextQuestAt = 1e9;
    const o = g.S.office;
    assert.ok(o, `${id} has an office`);
    assert.ok(!inWater(g.L, o.x, o.z), `${id}'s office door is on dry ground`);
    assert.ok(g.L.props.some((p) => p.type === 'upazila'), `${id}'s office building stands`);
    assert.ok(g.R.names.office?.bn && g.R.names.office?.en, `${id}'s office is named`);
    assert.ok(officeOf(g.R.country).sign.t, `${id}'s office has a board`);
    g.me.x = o.x; g.me.z = o.z; assert.equal(target(g)?.id, 'office', `${id}: the action button opens the office`);
    act(g); assert.ok(g.out.some((e) => e.type === 'open' && e.panel === 'office'), `${id}: the office opens`);
    const C = Object.keys(g.R.crops);
    Object.assign(g.plots[0], { crop: C[0], g: 0.3, pests: 1, moist: 0.8 });
    Object.assign(g.plots[1], { crop: C[0], g: 0.3, moist: 0.1 });
    const tr = farmTroubles(g).map((t) => t.id);
    assert.ok(tr.includes('pests') && tr.includes('dry'), `${id}: the officer sees pests and thirst (${tr})`);
    const ps = officePrograms(g);
    assert.ok(ps.length > 0 && ps.every((p) => p.src && p.status !== 'announced'), `${id}: real, sourced programmes`);
    const xp = g.xp; assert.ok(useService(g, 'school').ok); assert.equal(g.xp, xp + 40);
    assert.equal(canUse(g, 'school').ok, false, 'once a season');
    g.money = 0; for (const k of C) g.basket[k] = 0;
    const r = useService(g, 'seedkit'); assert.ok(r.ok && g.seeds[r.seed] >= 3, `${id}: incentive seed when money is short`);
  }
});

// ── how people walk and run (humangait.js), and the footing under them (footing.js) ──
test('human gait: cadence and stride follow ground speed; walking keeps a foot down, running has a flight; a sari shortens the step', async () => {
  const { gaitParams } = await import('./humangait.js');
  const w = gaitParams(1.4, 0), b = gaitParams(2.0, 0), r = gaitParams(5, 1), s = gaitParams(1.3, 0, 0.56);
  assert.ok(w.cad >= 1.7 && w.cad <= 2.0, `walk cadence ${w.cad}`);
  assert.ok(Math.abs(w.step - 1.4 / w.cad) < 1e-9 && w.step > 0.65 && w.step < 0.8, `walk step ${w.step}`);
  assert.ok(b.step > w.step, 'a faster walk takes longer steps');
  assert.ok(r.cad >= 2.6 && r.cad <= 3.1, `run cadence ${r.cad}`);
  assert.ok(w.duty > 0.5 && r.duty < 0.5, 'double support walking, flight running');
  assert.ok(s.step <= 0.56 + 1e-9 && s.cad > gaitParams(1.3, 0).cad, 'short quick steps in a sari');
});

test('human gait: a planted foot stays put on the ground, the knee is near straight at heel strike and folds in the swing, arms swing against the legs', async () => {
  const { stridePose, gaitParams, LEG } = await import('./humangait.js');
  const fk = (P, L0) => { // where the leg's angles really put the ankle (forward kinematics), relative to the ground under the hip
    const u = -L0.thigh, sh = u - L0.knee;
    return [LEG.a * Math.sin(u) + LEG.b * Math.sin(sh), P.hipY - LEG.a * Math.cos(u) - LEG.b * Math.cos(sh)];
  };
  for (const [v, r] of [[1.4, 0], [2, 0], [4, 1]]) {
    const G = gaitParams(v, r);
    let flatX = null, slide = 0, kneeHS = null, swingMax = 0, stanceMax = 0;
    for (let k = 0; k < 400; k++) {
      const p = k / 400, P = stridePose(p, v, r, 1, { hipX: [0, 0] }), L0 = P.legs[0];
      const [az, ay] = fk(P, L0);
      if (L0.stance && L0.s < 0.85) assert.ok(Math.hypot(az - L0.z, ay - L0.y) < 0.015, `v=${v}: the leg reaches its planted foot (p=${p})`);
      if (L0.stance && L0.phi === 0) { const wz = az + v * p * G.T; if (flatX === null) flatX = wz; slide = Math.max(slide, Math.abs(wz - flatX)); }
      if (k === 0) kneeHS = L0.knee;
      if (L0.stance) stanceMax = Math.max(stanceMax, L0.knee); else swingMax = Math.max(swingMax, L0.knee);
    }
    assert.ok(slide < 0.01, `v=${v}: the flat foot slides ${slide.toFixed(3)} m`);
    const deg = (x) => (x * 180) / Math.PI;
    if (!r) {
      assert.ok(deg(kneeHS) < 20, `walk: knee at heel strike ${deg(kneeHS).toFixed(0)}°`);
      assert.ok(deg(swingMax) > 55 && deg(swingMax) < 75, `walk: swing knee ${deg(swingMax).toFixed(0)}°`);
    } else assert.ok(deg(swingMax) > 90 && deg(stanceMax) > 35, `run: swing knee ${deg(swingMax).toFixed(0)}°, stance ${deg(stanceMax).toFixed(0)}°`);
  }
  const P = stridePose(0, 1.4, 0, 1);
  assert.ok(P.legs[0].z > 0.25 && P.arms[0].shoulder > 0 && P.arms[1].shoulder < 0, 'leg 0 forward at heel strike: arm 0 back, arm 1 forward');
  const still = stridePose(0, 0, 0, 0);
  assert.ok(Math.abs(still.hipY - (LEG.a + LEG.b + LEG.ankle)) < 1e-9 && Math.abs(still.legs[0].knee) < 0.05, 'standing: straight legs');
});

test('footing: the ground under the feet sets the pace, the start and the stop', async () => {
  const { surfaceAt, FOOTING, approach, separate, animalBody, keepApart } = await import('./footing.js');
  const g = createGame('razib'), L = g.L, p = g.plots[0];
  assert.equal(surfaceAt(L, g, p.x, p.z), 'soil');
  g.ev.shower = 5; assert.equal(surfaceAt(L, g, p.x, p.z), 'mud'); g.ev.shower = 0;
  const path = L.paths[0], mid = [(path[0][0] + path[1][0]) / 2, (path[0][1] + path[1][1]) / 2];
  if (!inWater(L, ...mid)) assert.ok(['path', 'wood', 'mud'].includes(surfaceAt(L, g, ...mid)), 'on the path');
  // starting off: a walk is reached in about half a second on firm ground, later on soft soil
  const startT = (f) => { let v = [0, 0], t = 0; while (v[0] < 1.9 * 0.99 && t < 5) { v = approach(...v, 1.9, 0, f, 1 / 60); t += 1 / 60; } return t; };
  assert.ok(startT(FOOTING.path) > 0.3 && startT(FOOTING.path) < 0.7, `start on a path ${startT(FOOTING.path)}`);
  assert.ok(startT(FOOTING.soil) > startT(FOOTING.path));
  const stopD = (f) => { let v = [2, 0], d = 0; while (v[0] > 1e-3) { v = approach(...v, 0, 0, f, 1 / 60); d += v[0] / 60; } return d; };
  assert.ok(stopD(FOOTING.mud) > stopD(FOOTING.path) * 1.5 && stopD(FOOTING.mud) < 1, `a short slide on mud: ${stopD(FOOTING.mud).toFixed(2)} m`);
  // bodies: a cow stands its ground, a hen is shoved aside, nobody ends up inside anybody
  const cow = animalBody('cow', 0, 0, 0), me = { x: 0, z: 0.5, r: 0.3, mass: 70 };
  separate(me, cow);
  assert.ok(cow.x === 0 && cow.z === 0 && Math.abs(me.x) >= 0.72 - 1e-9, 'pushed out to the side of the cow');
  const hen = animalBody('chicken', 30.1, 30, 0), who = { x: 30, z: 30 };
  keepApart({ ...L, blockers: [] }, [who], [hen]);
  assert.ok(Math.hypot(hen.x - who.x, hen.z - who.z) >= 0.45, 'the hen moved off');
  // walking straight at a cow, step after step, never passes through it
  const c2 = animalBody('buffalo', 40, 40, Math.PI / 2), walker = { x: 37, z: 40 };
  for (let k = 0; k < 120; k++) { walker.x += 0.05; keepApart({ ...L, blockers: [] }, [walker], [c2]); }
  assert.ok(walker.x < 40 - 0.5 || Math.abs(walker.z - 40) > 0.6, 'went round, not through');
});

test('the farmer speeds up and slows down like a person and turns round before walking back', () => {
  const g = createGame('razib'); g.nextQuestAt = 1e9;
  const b = g.L.blockers; g.L.blockers = []; // open ground for the measure
  g.me.x = 0; g.me.z = -40; g.me.yaw = 0;
  update(g, 0.1, { mx: 0, mz: 1 });
  assert.ok(g.me.speed > 0.2 && g.me.speed < 1, `after 0.1 s: ${g.me.speed}`);
  for (let k = 0; k < 20; k++) update(g, 0.05, { mx: 0, mz: 1 });
  const walk = g.me.speed;
  assert.ok(walk > 1.6 && walk < 2.4, `a brisk walk: ${walk.toFixed(2)} m/s`);
  update(g, 0.05, { mx: 0, mz: -1 }); // back the other way
  assert.ok(g.me.vz > 0, 'still carried forward for a moment');
  for (let k = 0; k < 30; k++) update(g, 0.05, { mx: 0, mz: -1 });
  assert.ok(g.me.vz < -1 && Math.abs(Math.cos(g.me.yaw) + 1) < 0.05, 'turned round and walking back');
  g.L.blockers = b;
});

test('daylight: a low sun is weaker and warmer than the noon sun, hazy air reddens it more, and the sky is a bigger share', async () => {
  const { daylight, airMass } = await import('./sunlight.js');
  const s = (deg) => Math.sin((deg * Math.PI) / 180);
  assert.ok(Math.abs(airMass(1) - 1) < 0.01 && airMass(s(7)) > 7 && airMass(s(7)) < 8.5, 'air mass 1 overhead, about 8 at 7°');
  const low = daylight(s(8)), noon = daylight(s(66)), hazy = daylight(s(8), 0.22);
  assert.ok(low.sun < noon.sun * 0.75 && noon.sun > 2.5 && noon.sun < 3.2, `sun ${low.sun.toFixed(2)} → ${noon.sun.toFixed(2)}`);
  assert.ok(low.b < 0.35 && low.g < 0.7 && noon.b > 0.7 && noon.g > 0.88, 'orange at sunrise, near white at noon');
  assert.ok(hazy.b < low.b && hazy.sun < low.sun, 'haze reddens and dims');
  assert.ok(low.sky / low.sun > noon.sky / noon.sun, 'the sky is a bigger share of the light at a low sun');
});

// ---- VR (xrlogic.js, xrpanels.js): comfort, teleport, pointing and the world-space panels ----
test('VR settings: unknown values fall back, each menu tap cycles one setting', () => {
  assert.deepEqual(cleanXR(null), XR_DEFAULTS);
  assert.equal(XR_DEFAULTS.view, 'first', 'first person is the default');
  const s = cleanXR({ view: 'third', turn: 99, vignette: 'yes', seated: true });
  assert.equal(s.view, 'third'); assert.equal(s.turn, 30); assert.equal(s.vignette, true); assert.equal(s.seated, true);
  assert.equal(cycleXR(XR_DEFAULTS, 'turn').turn, 45); assert.equal(cycleXR(cycleXR(XR_DEFAULTS, 'turn'), 'turn').turn, 30);
  assert.equal(cycleXR(XR_DEFAULTS, 'view').view, 'third');
  assert.equal(eyeLift(XR_DEFAULTS), 0); assert.ok(eyeLift({ seated: true }) > 0.3);
});

test('VR turning: one push snaps once by the chosen angle; smooth turning follows the stick', () => {
  const st = { held: false }, s = { ...XR_DEFAULTS, turn: 45 };
  const a = turnStep(st, 0.9, s, 1 / 72);
  assert.ok(Math.abs(Math.abs(a) - Math.PI / 4) < 1e-9 && a < 0, 'right push turns right by 45°');
  assert.equal(turnStep(st, 0.9, s, 1 / 72), 0, 'held: no second snap');
  assert.equal(turnStep(st, 0.1, s, 1 / 72), 0); assert.ok(turnStep(st, -0.9, s, 1 / 72) > 0, 'back to the middle, then left');
  const sm = turnStep({ held: false }, 0.5, { ...s, smoothTurn: true }, 0.1);
  assert.ok(sm < 0 && Math.abs(sm) < 0.2, 'smooth: a little each frame');
});

test('VR comfort vignette: dark only while the stick moves or turns, never when switched off', () => {
  assert.equal(vignetteTarget(XR_DEFAULTS, 0, 0), 0);
  assert.ok(vignetteTarget(XR_DEFAULTS, 3, 0) > 0.4);
  assert.ok(vignetteTarget(XR_DEFAULTS, 0, 1.5) > 0.5);
  assert.equal(vignetteTarget({ ...XR_DEFAULTS, vignette: false }, 4, 2), 0);
  assert.ok(vignetteTarget(XR_DEFAULTS, 6, 3) <= 0.85, 'never fully black');
  let v = 0; for (let k = 0; k < 10; k++) v = approachVignette(v, 0.8, 1 / 72); assert.ok(v > 0.5, 'closes quickly');
});

test('VR teleport: lands on open ground, never in water, inside a house or tree, past the edge or too far', () => {
  for (const id of FARMER_IDS) {
    const g = createGame(id), L = g.L;
    assert.ok(teleportOK(L, g.me.x, g.me.z, g.me).ok, `${id}: the start is a fine landing`);
    for (const b of L.blockers.slice(0, 20)) assert.equal(teleportOK(L, b.x, b.z).ok, false, `${id}: inside a blocker at ${b.x},${b.z}`);
    assert.equal(teleportOK(L, 79.8, 0).why, 'edge');
    assert.equal(teleportOK(L, g.me.x + 30, g.me.z, g.me).ok, false, 'too far for one jump');
    // a point well inside water inside the walkable circle
    for (const w of L.water) {
      const [x, z] = w.r ? [w.cx, w.cz] : [Math.max(w.x0 + 1, Math.min(w.x1 - 1, 0)), Math.max(w.z0 + 1, Math.min(w.z1 - 1, 0))];
      if (Math.hypot(x, z) < 70 && inWater(L, x, z)) assert.equal(teleportOK(L, x, z).why, 'water', `${id}: water at ${x},${z}`);
    }
  }
});

test('VR teleport arc: falls under gravity and stops where it meets the ground', () => {
  const g = createGame('razib'), out = new Float32Array(90 * 3);
  const a = arcPoints(g.me.x, 1.4, g.me.z, 0, 0.4, -1, g.L.ground, out);
  assert.ok(a.hit && a.n > 5 && a.n <= 90);
  assert.ok(Math.abs(a.y - g.L.ground(a.x, a.z)) < 0.05, 'ends on the ground');
  const dist = Math.hypot(a.x - g.me.x, a.z - g.me.z); assert.ok(dist > 4 && dist < 16, `lands ${dist.toFixed(1)} m ahead`);
  for (let k = 1; k < a.n; k++) assert.ok(out[k * 3 + 2] < out[k * 3 - 1], 'always moving forward');
  const up = arcPoints(0, 1.4, 0, 0, 1, 0, () => 0, out); assert.ok(up.hit && Math.hypot(up.x, up.z) < 1e-6, 'straight up comes straight down');
});

test('VR pointing: a ray at a plot picks that plot; the farmer steps onto it; far plots need a teleport', () => {
  const g = createGame('razib'), L = g.L, p = g.plots[7];
  const o = [p.x + 3, L.ground(p.x, p.z) + 1.6, p.z + 2], d = [p.x - o[0], L.ground(p.x, p.z) - o[1], p.z - o[2]];
  const t = rayGround(o, d, L.ground);
  assert.ok(t > 0, 'the ray meets the ground');
  const pick = pickWorld(g, o, d, t, []);
  assert.equal(pick.kind, 'plot'); assert.equal(pick.i, 7);
  g.me.x = p.x + 2.6; g.me.z = p.z;
  const st = standFor(g, pick);
  assert.ok(st && !st.far && plotAt(st.x, st.z) === 7 && st.d < 1.5, 'a short step onto the plot');
  g.me.x = p.x; g.me.z = p.z; assert.equal(standFor(g, pick), null, 'already on it: act from here');
  g.me.x = p.x + 40; g.me.z = p.z + 10; assert.ok(standFor(g, pick).far);
  assert.equal(rayGround([0, 5, 0], [0, 1, 0], L.ground), -1, 'pointing at the sky meets nothing');
});

test('VR pointing: stations are picked by their building, and the farmer is stood within reach of them', () => {
  for (const id of ['razib', 'gurpreet', 'jake'].filter((k) => FARMER_IDS.includes(k)).concat(FARMER_IDS.slice(0, 2))) {
    const g = createGame(id), L = g.L;
    for (const sid of ['shed', 'water', 'market', 'kiosk']) {
      const s = g.S[sid]; if (!s) continue;
      const o = [s.x + 5, L.ground(s.x, s.z) + 1.6, s.z + 5], d = [s.x - o[0], L.ground(s.x, s.z) + 1.4 - o[1], s.z - o[2]];
      const pick = pickWorld(g, o, d, rayGround(o, d, L.ground), []);
      assert.equal(pick?.kind, 'station', `${id} ${sid}`); assert.equal(pick.id, sid);
      g.me.x = s.x + 7; g.me.z = s.z + 7;
      const st = standFor(g, pick);
      if (st && !st.none) { assert.ok(!st.far); g.me.x = st.x; g.me.z = st.z; const tg = target(g); assert.equal(tg?.kind, 'station', `${id} ${sid}: in reach after the step`); }
    }
    const npc = pickWorld(g, [0, L.ground(0, 0) + 1.6, 4], [0, -0.1, -1], -1, [[0, 0]]);
    assert.equal(npc?.kind, 'npc', `${id}: a villager in the way is picked`);
  }
});

test('VR wrist: shows only when the inside of the wrist faces the eyes, close by', () => {
  assert.equal(wristVisible(0.9, 0.4), true);
  assert.equal(wristVisible(0.2, 0.4), false);
  assert.equal(wristVisible(0.9, 1.2), false);
  assert.equal(wristVisible(0.5, 0.4, true), true, 'a little slack once shown');
});

test('VR panels: text wraps, rows that do not fit go to pages, and the pointer hits only live buttons', () => {
  const m = (s, px) => s.length * px * 0.5;
  assert.deepEqual(wrapText('aa bb cc', 30, 10, m), ['aa bb', 'cc']);
  assert.ok(wrapText('x'.repeat(40), 50, 10, m).length >= 4, 'a long word is broken');
  const spec = { title: 'T', rows: Array.from({ length: 30 }, (_, k) => ({ text: `row ${k} with some words in it` })), foot: [{ id: 'close', label: 'Close' }] };
  const L1 = layoutPanel(spec, { w: 1280, h: 960, measure: m });
  assert.ok(L1.pages > 1);
  const L2 = layoutPanel(spec, { w: 1280, h: 960, measure: m, page: 1 });
  assert.equal(L2.page, 1);
  for (const L of [L1, L2]) for (const it of L.items) assert.ok(it.y + (it.h ?? 0) <= 960 && it.x + (it.w ?? 0) <= 1280, 'inside the panel');
  const close = L1.items.find((i) => i.id === 'close');
  assert.equal(hitPanel(L1, close.x + 5, close.y + 5)?.id, 'close');
  const back = L1.items.find((i) => i.id === 'page:-1');
  assert.equal(back.on, false); assert.equal(hitPanel(L1, back.x + 5, back.y + 5), null, 'a greyed button is not hit');
  assert.equal(hitPanel(L1, 2, 2), null);
});

test('VR panels say what the page panels say: shop, quiz, office, helper, menu, wrist, report', () => {
  const m = (s, px) => s.length * px * 0.5;
  for (const id of FARMER_IDS) {
    const g = createGame(id);
    for (const lang of ['bn', 'en']) {
      const shop = shopSpec(g, lang);
      for (const k of Object.keys(g.R.crops)) assert.ok(shop.rows.some((r) => r.buttons?.some((b) => b.id === `buy:${k}:3`)), `${id}: ${k} on sale`);
      const L = layoutPanel(shop, { w: 1280, h: 960, measure: m });
      assert.ok(L.items.some((i) => i.id === 'close'));
      assert.ok(officeSpec(g, lang).rows.some((r) => r.buttons?.some((b) => b.id === 'svc:soiltest' && b.on)));
      const menu = menuSpec(g, lang, XR_DEFAULTS);
      for (const k of ['set:view', 'set:turn', 'set:vignette', 'set:seated', 'sat', 'exit', 'open:helper']) assert.ok(menu.rows.some((r) => r.buttons?.some((b) => b.id === k)), `${id}: menu has ${k}`);
      assert.ok(wristSpec(g, lang).title.includes(g.R.cur));
      assert.ok(reportSpec(g, lang).foot[0].id === 'finish');
      assert.ok(helperSpec(g, lang).foot.some((b) => b.id === 'close'));
    }
    // a question: options first, then the answer and the way back
    const qi = QUESTS.findIndex((q) => q.quiz && g.R.quiz[q.quiz]);
    if (qi >= 0) {
      g.quest = qi;
      const before = quizSpec(g, 'en');
      const opts = before.rows[0].buttons;
      assert.ok(opts.length >= 2 && opts.every((b) => b.on)); assert.equal(before.foot.length, 0, 'no way out before answering');
      const right = g.R.quiz[QUESTS[qi].quiz].options.findIndex((o) => o.ok);
      const after = quizSpec(g, 'en', right);
      assert.ok(after.rows[0].buttons.every((b) => !b.on)); assert.equal(after.foot[0].id, 'quiz:done');
      assert.equal(after.rows[0].buttons[right].tone, 'good');
    }
    assert.equal(toastSpec({ type: 'alert', tone: 'hot', title: { bn: 'ক', en: 'A' }, body: { bn: 'খ', en: 'B' } }, g, 'en').tone, 'bad');
  }
});

test('VR helper: a job that spends money asks for the tap with its cost', () => {
  const g = createGame('razib');
  for (const k in g.seeds) g.seeds[k] = 0;
  const spec = helperSpec(g, 'en');
  const sow = spec.rows.flatMap((r) => r.buttons ?? []).find((b) => b.id === 'job:sow');
  if (sow) assert.ok(/approve/.test(sow.label), sow.label);
});

test('resolve pushes exact blocker center points outside circular and rectangular blockers', () => {
  for (const w of WORLD_IDS) {
    const L = layoutFor(w);
    for (const b of L.blockers) {
      const [sx, sz] = resolve({ blockers: [b] }, b.x, b.z, 0.35);
      if (b.r) {
        assert.ok(Math.hypot(sx - b.x, sz - b.z) >= b.r + 0.35 - 1e-6, `${w}: escaped circular center (${b.x}, ${b.z})`);
      } else {
        const dx = sx - b.x, dz = sz - b.z;
        const u = Math.abs(dx * b.c - dz * b.s), v = Math.abs(dx * b.s + dz * b.c);
        assert.ok(u >= b.hw + 0.35 - 1e-6 || v >= b.hd + 0.35 - 1e-6, `${w}: escaped box center (${b.x}, ${b.z})`);
      }
      const [rx, rz] = resolve(L, b.x, b.z, 0.35);
      assert.ok(Number.isFinite(rx) && Number.isFinite(rz) && Math.hypot(rx - b.x, rz - b.z) >= 0.35, `${w}: moved away from blocker center (${b.x}, ${b.z})`);
    }
  }
  const Lrazib = createGame('razib').L, b34 = Lrazib.blockers.find((b) => b.x === -34 && b.z === -8);
  assert.ok(b34);
  const [rx0, rz0] = resolve(Lrazib, b34.x, b34.z, 0.35);
  assert.ok(Math.hypot(rx0 - b34.x, rz0 - b34.z) >= b34.r + 0.35 - 1e-6);
  const Ldham = layoutFor('dhamrai');
  const [rx1, rz1] = resolve(Ldham, -32, 3, 0.35);
  assert.ok(Math.hypot(rx1 + 32, rz1 - 3) >= 1.35 - 1e-6, 'overlapping circular cluster (-32, 3) resolves cleanly');
});

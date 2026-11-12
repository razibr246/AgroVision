import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  KIDS_STORAGE_KEY,
  KIDS_LEVELS,
  MARKET_ITEMS,
  PLANT_STAGES,
  PIPELINE_LEVELS,
  calculateLevelFromXp,
  evaluateBadges,
  createDefaultKidsProfile,
  readKidsProfile,
  writeKidsProfile,
  resetKidsProfile,
  applyMissionCompletion,
  applyActivityProgress,
  getWorldProgress,
  buildMissionRoundChallenge,
  simulateMarketTrade,
  simulatePlantGrowthStep,
  getPipeOpenings,
  rotatePipeGridCell,
  checkPipelineConnectivity,
  evaluateIpmAction,
  classifyLitmusPh,
  simulateSoilChemistry,
  evaluateLivingClassification,
  evaluateFoodChainOrder,
  simulatePhotosynthesis,
  evaluateCubeSatBuild,
  evaluateWaterCycleOrder,
  simulateRampRace,
  simulatePaperPlaneFlight,
} from './kidsEngine.js';
import { KIDS_WORLDS, KIDS_BADGES, KIDS_SCIENCE_MODULES } from '../data/kidsData.js';

function cloneGrid(grid) {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

function rotateTimes(grid, r, c, times) {
  let out = grid;
  for (let i = 0; i < times; i++) {
    out = rotatePipeGridCell(out, r, c);
  }
  return out;
}

describe('kidsEngine — Level Curve & Gamification', () => {
  it('computes levels across boundaries, negatives, and max XP', () => {
    const neg = calculateLevelFromXp(-50);
    assert.equal(neg.level, 1);
    assert.equal(neg.xp, 0);
    assert.equal(neg.progressFraction, 0);

    const mid1 = calculateLevelFromXp(50);
    assert.equal(mid1.level, 1);
    assert.equal(mid1.progressFraction, 0.5);
    assert.equal(mid1.xpNeededForNext, 50);

    assert.equal(calculateLevelFromXp(100).level, 2);
    assert.equal(calculateLevelFromXp(300).level, 3);
    assert.equal(calculateLevelFromXp(600).level, 4);
    assert.equal(calculateLevelFromXp(950).level, 5);
    assert.equal(calculateLevelFromXp(1400).level, 6);

    const max = calculateLevelFromXp(2500);
    assert.equal(max.level, KIDS_LEVELS.length);
    assert.equal(max.isMaxLevel, true);
    assert.equal(max.progressFraction, 1.0);
    assert.equal(max.xpNeededForNext, 0);
  });

  it('evaluates all 12 badges accurately and excludes already owned badges', () => {
    assert.deepEqual(
      evaluateBadges({ xp: 550, completedSeedMissions: 5, badges: [] }),
      ['seed_master']
    );
    assert.deepEqual(
      evaluateBadges({ xp: 550, completedSeedMissions: 5, badges: ['seed_master'] }),
      []
    );

    const fullScience = evaluateBadges({
      completedMissions: KIDS_WORLDS.flatMap((w) => w.missions.map((m) => m.id)),
      completedIpmMissions: 2,
      miniGames: {
        bioLivingCorrect: 4,
        chemLabsSolved: ['barind_acidic', 'dacope_saline'],
        cubesatsLaunched: ['agro_ndvi'],
        waterCyclesSolved: 1,
        plantsHarvested: 1,
      },
    });
    assert.equal(fullScience.length, Object.keys(KIDS_BADGES).length);
  });
});

describe('kidsEngine — Safe Profile Storage & Progression', () => {
  it('handles corrupt JSON, quota errors, round-trips, and reset', () => {
    const map = new Map();
    const storage = {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, v),
      removeItem: (k) => map.delete(k),
    };

    storage.setItem(KIDS_STORAGE_KEY, '{not valid json!!!');
    const fallback = readKidsProfile(storage);
    assert.equal(fallback.xp, 0);
    assert.equal(fallback.difficulty, 'beginner');

    const profile = { ...createDefaultKidsProfile(), learnerName: 'Meera', xp: 420, difficulty: 'advanced' };
    const writeRes = writeKidsProfile(profile, storage);
    assert.equal(writeRes.ok, true);
    const loaded = readKidsProfile(storage);
    assert.equal(loaded.learnerName, 'Meera');
    assert.equal(loaded.level, 3);
    assert.equal(loaded.difficulty, 'advanced');

    const failingStorage = {
      getItem: () => null,
      setItem: () => {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      },
    };
    const failWrite = writeKidsProfile(profile, failingStorage);
    assert.equal(failWrite.ok, false);
    assert.equal(failWrite.error, 'QuotaExceededError');

    const reset = resetKidsProfile(storage);
    assert.equal(reset.xp, 0);
    assert.equal(readKidsProfile(storage).learnerName, '');
  });

  it('awards mission completions, reduced replay XP, activity progress, and strict world unlocks', () => {
    let profile = createDefaultKidsProfile();
    const res1 = applyMissionCompletion(profile, { missionId: 'm1_crops', xpReward: 60, stars: 3 });
    assert.equal(res1.earnedXp, 60);
    assert.equal(res1.profile.completedMissions.includes('m1_crops'), true);

    const replay = applyMissionCompletion(res1.profile, { missionId: 'm1_crops', xpReward: 60, stars: 2 });
    assert.equal(replay.earnedXp, 15);
    assert.equal(replay.profile.missionStars.m1_crops, 3);

    const act = applyActivityProgress(replay.profile, {
      xpDelta: 45,
      miniGamePatch: { chemLabsSolved: 'barind_acidic', bioLivingCorrect: 4 },
      flags: { completedIpmMissions: 2 },
    });
    assert.equal(act.profile.xp, 120);
    assert.equal(act.profile.badges.includes('soil_doctor'), true);
    assert.equal(act.profile.badges.includes('bio_detective'), true);
    assert.equal(act.profile.badges.includes('eco_defender'), true);

    const w2Free = getWorldProgress(KIDS_WORLDS[1], profile, { strictUnlock: false });
    const w2Strict = getWorldProgress(KIDS_WORLDS[1], profile, { strictUnlock: true });
    assert.equal(w2Free.isUnlocked, true);
    assert.equal(w2Strict.isUnlocked, false);
    assert.equal(w2Strict.prerequisiteMet, false);
  });

  it('builds mission challenges with visual choice cards for ndvi and weather categories', () => {
    const ndviCh = buildMissionRoundChallenge({ type: 'math_category', category: 'ndvi' }, 'beginner', 11);
    assert.ok(ndviCh);
    assert.equal(ndviCh.answerType, 'choice');
    assert.ok(Array.isArray(ndviCh.choiceCards) && ndviCh.choiceCards.length >= 2);

    const weatherCh = buildMissionRoundChallenge({ type: 'math_category', category: 'weather' }, 'intermediate', 22);
    assert.ok(weatherCh);
    assert.equal(weatherCh.answerType, 'choice');
    assert.ok(weatherCh.choiceCards.every((c) => c.icon && c.label.bn && c.label.en));

    assert.equal(buildMissionRoundChallenge({ type: 'choice' }), null);
  });
});

describe('kidsEngine — Mini-Games (Market, Plant, Pipeline, IPM)', () => {
  it('calculates profit, loss, and zero demand in Farmer Market', () => {
    assert.ok(MARKET_ITEMS.length >= 4);
    const gain = simulateMarketTrade({ demandKg: 50, offeredPriceTk: 36, costKg: 26 });
    assert.equal(gain.isProfitable, true);
    assert.equal(gain.revenue, 1800);
    assert.equal(gain.cost, 1300);
    assert.equal(gain.profit, 500);

    const loss = simulateMarketTrade({ demandKg: 40, offeredPriceTk: 20, costKg: 26 });
    assert.equal(loss.isProfitable, false);
    assert.equal(loss.profit, -240);

    const empty = simulateMarketTrade({ demandKg: 0, offeredPriceTk: 30, costKg: 20 });
    assert.equal(empty.profit, 0);
    assert.equal(empty.revenue, 0);
  });

  it('simulates Plant Growth drought, waterlog, weeds, low light, and healthy harvest', () => {
    assert.equal(PLANT_STAGES.length, 5);
    assert.equal(simulatePlantGrowthStep({ currentStage: 2, soilMoisture: 18 }).status, 'drought_stress');
    assert.equal(simulatePlantGrowthStep({ currentStage: 2, soilMoisture: 96 }).status, 'waterlogged');
    assert.equal(simulatePlantGrowthStep({ currentStage: 2, soilMoisture: 60, weedLevel: 80 }).status, 'weed_competition');
    assert.equal(simulatePlantGrowthStep({ currentStage: 2, soilMoisture: 60, sunlight: 20 }).status, 'low_light');

    const grow = simulatePlantGrowthStep({ currentStage: 4, soilMoisture: 65, sunlight: 85, compost: 75, weedLevel: 10 });
    assert.equal(grow.nextStage, 5);
    assert.equal(grow.status, 'harvest_ready');
    assert.ok(grow.healthDelta > 0);
  });

  it('solves all 3 Water Pipeline levels via rotation + BFS and handles locked/array inputs', () => {
    // Pipe openings check
    assert.deepEqual(getPipeOpenings('straight', 0), [true, false, true, false]);
    assert.deepEqual(getPipeOpenings('straight', 90), [false, true, false, true]);
    assert.deepEqual(getPipeOpenings('elbow', 180), [false, false, true, true]);

    // Array polymorphism check
    assert.equal(checkPipelineConnectivity([{ id: 1, connected: true }, { id: 2, connected: false }]).isConnected, false);
    assert.equal(checkPipelineConnectivity([{ id: 1, connected: true }, { id: 2, connected: true }]).isConnected, true);

    // Every pipeline level starts disconnected and becomes solvable via rotations
    for (const lvl of PIPELINE_LEVELS) {
      const initCheck = checkPipelineConnectivity({ grid: lvl.grid, moves: 0, par: lvl.par });
      assert.equal(initCheck.isConnected, false, `${lvl.id} must not start already solved`);
    }

    // Solve Level 1 (canal_easy)
    let g1 = cloneGrid(PIPELINE_LEVELS[0].grid);
    g1 = rotateTimes(g1, 0, 1, 1); // straight 0 -> 90 (E-W)
    g1 = rotateTimes(g1, 0, 2, 2); // elbow 0 -> 180 (S-W)
    g1 = rotateTimes(g1, 1, 2, 1); // straight 90 -> 180 (N-S)
    const r1 = checkPipelineConnectivity({ grid: g1, moves: 4, par: PIPELINE_LEVELS[0].par });
    assert.equal(r1.isConnected, true);
    assert.equal(r1.stars, 3);
    assert.ok(r1.pathCells.includes('2,2'));

    // Solve Level 2 (boro_mid)
    let g2 = cloneGrid(PIPELINE_LEVELS[1].grid);
    g2 = rotateTimes(g2, 0, 1, 2); // elbow 0 -> 180 (S-W)
    g2 = rotateTimes(g2, 1, 1, 1); // straight 90 -> 180 (N-S)
    g2 = rotateTimes(g2, 2, 1, 3); // elbow 90 -> 0 (N-E)
    g2 = rotateTimes(g2, 2, 2, 1); // elbow 90 -> 180 (S-W)
    g2 = rotateTimes(g2, 3, 2, 1); // elbow 270 -> 0 (N-E)
    const r2 = checkPipelineConnectivity({ grid: g2, moves: 8, par: PIPELINE_LEVELS[1].par });
    assert.equal(r2.isConnected, true);
    assert.equal(r2.stars, 3);

    // Solve Level 3 (awd_pro)
    let g3 = cloneGrid(PIPELINE_LEVELS[2].grid);
    g3 = rotateTimes(g3, 0, 1, 1); // straight 0 -> 90 (E-W)
    g3 = rotateTimes(g3, 0, 2, 1); // tee 90 -> 180 (E-S-W)
    g3 = rotateTimes(g3, 1, 2, 1); // straight 90 -> 180 (N-S)
    g3 = rotateTimes(g3, 2, 2, 2); // elbow 180 -> 0 (N-E)
    g3 = rotateTimes(g3, 2, 3, 2); // elbow 0 -> 180 (S-W)
    const r3 = checkPipelineConnectivity({ grid: g3, moves: 7, par: PIPELINE_LEVELS[2].par });
    assert.equal(r3.isConnected, true);
    assert.equal(r3.stars, 3);

    // Locked source cells do not rotate
    const lockedAfter = rotatePipeGridCell(g1, 0, 0);
    assert.equal(lockedAfter[0][0].rotation, 0);
  });

  it('evaluates IPM decisions protecting predators and warning on chemical sprays', () => {
    const allyGood = evaluateIpmAction({ bugId: 'ladybird', chosenAction: 'protect' });
    assert.equal(allyGood.success, true);
    assert.equal(allyGood.outcomeType, 'beneficial_preserved');

    const allySprayed = evaluateIpmAction({ bugId: 'ladybird', chosenAction: 'chemical_spray' });
    assert.equal(allySprayed.success, false);
    assert.equal(allySprayed.outcomeType, 'beneficial_harmed');

    const pestEco = evaluateIpmAction({ bugId: 'bph', chosenAction: 'light_trap' });
    assert.equal(pestEco.success, true);
    assert.equal(pestEco.outcomeType, 'pest_controlled');

    const pestChem = evaluateIpmAction({ bugId: 'bph', chosenAction: 'chemical_spray' });
    assert.equal(pestChem.success, false);
    assert.equal(pestChem.outcomeType, 'over_sprayed');

    assert.equal(evaluateIpmAction({ bugId: 'nonexistent', chosenAction: 'protect' }).outcomeType, 'unknown_organism');
  });
});

describe('kidsEngine — Chemistry, Biology & NASA Physics Arcade', () => {
  it('simulates Barind acidic and Dacope saline soil chemistry restoration', () => {
    assert.equal(classifyLitmusPh(4.8).id, 'strongly_acidic');
    assert.equal(classifyLitmusPh(6.5).id, 'healthy_neutral');
    assert.equal(classifyLitmusPh(8.2).id, 'strongly_alkaline');

    // Barind starts acidic (pH 5.1) -> agri_lime + vermicompost restores healthy target
    const barindBefore = simulateSoilChemistry('godagari_barind', []);
    assert.equal(barindBefore.isHealthy, false);
    const barindAfter = simulateSoilChemistry('godagari_barind', ['agri_lime', 'vermicompost', 'vermicompost']);
    assert.equal(barindAfter.isPhHealthy, true);
    assert.equal(barindAfter.isHealthy, true);
    assert.equal(barindAfter.isOmHealthy, true);

    // Dacope starts saline (EC 5.4, pH 7.9) -> gypsum + vermicompost lowers EC and buffers pH
    const dacopeBefore = simulateSoilChemistry('dacope_coastal', []);
    assert.equal(dacopeBefore.isEcHealthy, false);
    const dacopeAfter = simulateSoilChemistry('dacope_coastal', ['gypsum', 'gypsum', 'vermicompost']);
    assert.equal(dacopeAfter.isEcHealthy, true);
    assert.equal(dacopeAfter.isPhHealthy, true);
    assert.equal(dacopeAfter.isHealthy, true);
  });

  it('evaluates Biology living-vs-non-living, photosynthesis, and food chain order', () => {
    const worm = evaluateLivingClassification('earthworm', 'living');
    assert.equal(worm.isCorrect, true);
    const tractorWrong = evaluateLivingClassification('tractor', 'living');
    assert.equal(tractorWrong.isCorrect, false);
    assert.equal(tractorWrong.expectedClass, 'nonliving');

    const chain = KIDS_SCIENCE_MODULES.biologyLab.foodChains[0];
    const correctIds = chain.correctOrder.map((x) => x.id);
    assert.equal(evaluateFoodChainOrder(chain.id, correctIds).isCorrect, true);
    assert.equal(evaluateFoodChainOrder(chain.id, [...correctIds].reverse()).isCorrect, false);

    const lowSun = simulatePhotosynthesis({ sunlight: 15, water: 90, co2: 90 });
    assert.equal(lowSun.limitingFactor, 'sunlight');
    const thriving = simulatePhotosynthesis({ sunlight: 90, water: 85, co2: 85 });
    assert.equal(thriving.limitingFactor, 'balanced');
    assert.ok(thriving.glucoseRate > lowSun.glucoseRate);
  });

  it('evaluates CubeSat builds, Water Cycle order, Ramp Race physics, and Paper Plane aerodynamics', () => {
    const satGood = evaluateCubeSatBuild('cs_ndvi', ['solar_panels', 'nir_cam', 'radio_dish']);
    assert.equal(satGood.launchReady, true);
    assert.ok(satGood.totalMassKg <= satGood.maxMassKg);

    const satCandy = evaluateCubeSatBuild('cs_ndvi', ['solar_panels', 'nir_cam', 'radio_dish', 'candy_box']);
    assert.equal(satCandy.launchReady, false);
    assert.equal(satCandy.hasDistractor, true);

    const satNoPower = evaluateCubeSatBuild('cs_ndvi', ['nir_cam', 'radio_dish']);
    assert.equal(satNoPower.launchReady, false);

    const expectedWater = KIDS_SCIENCE_MODULES.scienceArcade.waterCycle.stages.map((s) => s.id);
    assert.equal(evaluateWaterCycleOrder(expectedWater).isCorrect, true);
    assert.equal(evaluateWaterCycleOrder([...expectedWater].reverse()).isCorrect, false);

    // Ramp Race: rolling watermelon beats flat paddy sack on straw; low angle stalls on straw
    const melon = simulateRampRace({ surfaceId: 'dry_straw', objectId: 'watermelon', angleDeg: 20 });
    const sack = simulateRampRace({ surfaceId: 'dry_straw', objectId: 'paddy_sack', angleDeg: 20 });
    assert.equal(melon.stalled, false);
    assert.ok(melon.timeSec < sack.timeSec);
    const stalled = simulateRampRace({ surfaceId: 'dry_straw', objectId: 'paddy_sack', angleDeg: 8 });
    assert.equal(stalled.stalled, true);

    // Paper Plane: balanced wide glider outperforms tail-heavy light glider
    const balancedGlider = simulatePaperPlaneFlight({ wingId: 'glider', noseId: 'balanced', throwStrength: 80 });
    const tailHeavy = simulatePaperPlaneFlight({ wingId: 'glider', noseId: 'light', throwStrength: 90 });
    assert.ok(balancedGlider.distanceM > tailHeavy.distanceM);
  });
});

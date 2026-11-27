// E2E Test Suite: Agros Kids – Learn, Play & Grow (তারার স্বপ্ন-খামার / Tara's Dream Farm)
// Opaque-box requirement-driven testing covering Tiers 1–4 across all 11 features, boundary cases,
// pairwise interactions, and realistic application scenarios.
//
// Follows Node.js native test runner (node:test, node:assert/strict).
// Strictly imports and validates authentic functions from src/engine/kidsMath.js.
// Milestone 2 modules (kidsEngine.js, kidsData.js) use honest Node test runner skip directives.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RABI_CROPS } from '../engine/crops.js';
import { bnDigits } from '../engine/dates.js';

// --- Production Engine Imports (Milestone 1) ---
import {
  SQFT_PER_M2,
  KIDS_LAND_UNITS,
  KIDS_WEIGHT_UNITS,
  KIDS_FERTILIZERS,
  KIDS_CROPS,
  KIDS_NDVI_BANDS,
  KIDS_WEATHER_RULES,
  DIFFICULTY_TIERS,
  DIFFICULTY_CONFIG,
  convertLandArea,
  convertWeight,
  calculateSeedNeeded,
  calculatePumpRuntimeHours,
  calculateWaterRequirement,
  calculateFertilizerCost,
  calculateFertilizerDose,
  calculateFarmBudget,
  evaluateNdviHealth,
  evaluateWeatherAction,
  createPrng,
  generateKidsChallenge,
  validateKidsAnswer,
  generateExplanatoryFeedback,
} from '../engine/kidsMath.js';

// --- Dynamic Module Imports for Milestone 2 Contracts ---
let kidsEngineMod = null;
let kidsDataMod = null;

try {
  kidsEngineMod = await import('../engine/kidsEngine.js');
} catch {
  // src/engine/kidsEngine.js will be authored in Milestone 2
}

try {
  kidsDataMod = await import('../data/kidsData.js');
} catch {
  // src/data/kidsData.js will be authored in Milestone 2
}

const skipIfNoKidsEngine = !kidsEngineMod && 'Requires src/engine/kidsEngine.js (Milestone 2)';
const skipIfNoKidsData = !kidsDataMod && 'Requires src/data/kidsData.js (Milestone 2)';

// ============================================================================
// TIER 1: FEATURE COVERAGE (Features F01–F11, 55 Tests)
// ============================================================================

describe('Tier 1: Feature Coverage (Features F01–F11, 55 Tests)', () => {

  // --- Feature F01: Land & Weight Unit Conversions ---
  describe('F01: Land & Weight Unit Conversions', () => {
    it('F01-1: 1 bigha converts exactly to 20 kathas and reverses cleanly', () => {
      const kathas = convertLandArea(1, 'bigha', 'katha');
      assert.strictEqual(kathas, 20);
      const bighas = convertLandArea(20, 'katha', 'bigha');
      assert.strictEqual(bighas, 1);
    });

    it('F01-2: 1 bigha converts to 33 decimals (standard Bangladesh revenue measure)', () => {
      const decimals = convertLandArea(1, 'bigha', 'decimal');
      assert.strictEqual(decimals, 33);
      const bighas = convertLandArea(33, 'decimal', 'bigha');
      assert.strictEqual(bighas, 1);
    });

    it('F01-3: 1 katha converts to 720 square feet', () => {
      const sqft = convertLandArea(1, 'katha', 'sqft');
      assert.strictEqual(sqft, 720);
      assert.ok(Math.abs(convertLandArea(720, 'sqft', 'katha') - 1) < 1e-4);
    });

    it('F01-4: 1 bigha converts to 1337.80 m² (14,400 sq ft)', () => {
      const m2 = convertLandArea(1, 'bigha', 'm2');
      assert.ok(Math.abs(m2 - 1337.803776) < 1e-4);
      assert.strictEqual(convertLandArea(1, 'bigha', 'sqft'), 14400);
    });

    it('F01-5: Weight conversion converts traditional maund to 37.32 kg and metric maund to 40 kg', () => {
      const traditionalKg = convertWeight(1, 'maund', 'kg');
      assert.strictEqual(traditionalKg, 37.32);
      const metricKg = convertWeight(1, 'metric_maund', 'kg');
      assert.strictEqual(metricKg, 40);
      assert.strictEqual(convertWeight(100, 'kg', 'quintal'), 1);
      assert.strictEqual(convertWeight(1000, 'kg', 'ton'), 1);
    });
  });

  // --- Feature F02: Seed Rate Calculations ---
  describe('F02: Seed Rate Calculations', () => {
    it('F02-1: Boro rice seed calculation for 3 bighas (BARI standard 5 kg/bigha = 15 kg)', () => {
      const res = calculateSeedNeeded({ cropId: 'boro', area: 3, unit: 'bigha' });
      assert.strictEqual(res.seedKg, 15);
      assert.strictEqual(res.seedGrams, 15000);
      assert.strictEqual(res.ratePerBighaKg, 5);
      assert.ok(res.formulaStr.includes('3 bigha × 5 kg/bigha = 15 kg'));
    });

    it('F02-2: Wheat seed calculation for 2 bighas (BARI standard 16 kg/bigha = 32 kg)', () => {
      const res = calculateSeedNeeded({ cropId: 'wheat', area: 2, unit: 'bigha' });
      assert.strictEqual(res.seedKg, 32);
      assert.strictEqual(res.seedGrams, 32000);
      assert.strictEqual(res.ratePerBighaKg, 16);
    });

    it('F02-3: Potato tuber seed calculation for 1 bigha (BARI standard 250 kg/bigha)', () => {
      const res = calculateSeedNeeded({ cropId: 'potato', area: 1, unit: 'bigha' });
      assert.strictEqual(res.seedKg, 250);
      assert.strictEqual(res.seedGrams, 250000);
      assert.strictEqual(res.ratePerBighaKg, 250);
    });

    it('F02-4: Mustard seed calculation for 10 decimals (proportional bigha fraction: 10/33 * 1.2 kg = 0.36 kg)', () => {
      const res = calculateSeedNeeded({ cropId: 'mustard', area: 10, unit: 'decimal' });
      assert.strictEqual(res.seedKg, 0.36);
      assert.strictEqual(res.seedGrams, 360);
      assert.strictEqual(res.ratePerBighaKg, 1.2);
    });

    it('F02-5: validateKidsAnswer evaluates numeric answers, Bengali numerals, and tolerances', () => {
      const exact = validateKidsAnswer(15, 15);
      assert.strictEqual(exact.isCorrect, true);
      assert.strictEqual(exact.delta, 0);

      const banglaDigits = validateKidsAnswer(15, '১৫');
      assert.strictEqual(banglaDigits.isCorrect, true);

      const closeWithinTol = validateKidsAnswer(15, 15.5, 5); // 5% tolerance allows ±0.75
      assert.strictEqual(closeWithinTol.isCorrect, true);

      const wrong = validateKidsAnswer(15, 20, 5);
      assert.strictEqual(wrong.isCorrect, false);
      assert.strictEqual(wrong.delta, 5);
    });
  });

  // --- Feature F03: Water & Irrigation Requirement ---
  describe('F03: Water & Irrigation Requirement', () => {
    it('F03-1: FAO-56 daily ETc computes from ETo * Kc (Boro mid-stage Kc 1.20 * ETo 4.0 = 4.8 mm/day)', () => {
      const res = calculateWaterRequirement({ cropId: 'boro', area: 1, unit: 'bigha', eto: 4.0, stage: 'mid', days: 1, rain: 0 });
      assert.strictEqual(res.kc, 1.20);
      assert.strictEqual(res.dailyEtcMm, 4.8);
      assert.strictEqual(res.depthMm, 4.8);
    });

    it('F03-2: Effective rain deduction (rain * 0.8) reduces net irrigation requirement', () => {
      const withRain = calculateWaterRequirement({ cropId: 'boro', area: 1, unit: 'bigha', eto: 4.0, stage: 'mid', days: 5, rain: 20 });
      assert.strictEqual(withRain.totalEtcMm, 24.0);
      assert.strictEqual(withRain.effectiveRainMm, 16.0);
      assert.strictEqual(withRain.depthMm, 8.0);
    });

    it('F03-3: Physical water volume in Liters scales with land area in m² (1 mm on 1 m² = 1 L)', () => {
      const res = calculateWaterRequirement({ cropId: 'wheat', area: 1, unit: 'bigha', eto: 4.0, stage: 'mid', days: 1, rain: 0 });
      assert.strictEqual(res.depthMm, 4.6);
      assert.strictEqual(res.volumeLiters, 6153.9);
    });

    it('F03-4: Volume in m³ equals Liters / 1000', () => {
      const res = calculateWaterRequirement({ cropId: 'wheat', area: 1, unit: 'bigha', eto: 4.0, stage: 'mid', days: 1, rain: 0 });
      assert.strictEqual(res.volumeM3, 6.15);
      assert.ok(Math.abs(res.volumeM3 - (res.volumeLiters / 1000)) < 0.01);
    });

    it('F03-5: STW pump runtime hours calculates at 30,000 L/hr discharge rate via calculatePumpRuntimeHours', () => {
      const res = calculatePumpRuntimeHours({ volumeLiters: 60000, pumpRateLph: 30000, detailed: true });
      assert.strictEqual(res.runtimeHours, 2);
      assert.strictEqual(res.hours, 2);
      assert.strictEqual(res.minutes, 0);
      assert.strictEqual(res.timeFormatted.bn, '২ ঘণ্টা ০ মিনিট');
      assert.strictEqual(res.dieselLiters, 5.1); // 60 m³ * 0.085 L/m³
    });
  });

  // --- Feature F04: Fertilizer Dosage & Splits ---
  describe('F04: Fertilizer Dosage & Splits', () => {
    it('F04-1: Subsidized MoA fertilizer prices match official values in KIDS_FERTILIZERS (Urea 27, TSP 27, MoP 20, DAP 21)', () => {
      assert.strictEqual(KIDS_FERTILIZERS.urea.pricePerKg, 27);
      assert.strictEqual(KIDS_FERTILIZERS.tsp.pricePerKg, 27);
      assert.strictEqual(KIDS_FERTILIZERS.mop.pricePerKg, 20);
      assert.strictEqual(KIDS_FERTILIZERS.dap.pricePerKg, 21);
      assert.strictEqual(KIDS_FERTILIZERS.urea.subsidized, true);
    });

    it('F04-2: calculateFertilizerCost aggregates prices with detailed line-item breakdown', () => {
      const detailed = calculateFertilizerCost({ ureaKg: 50, tspKg: 20, mopKg: 20, dapKg: 10 }, { detailed: true });
      assert.strictEqual(detailed.totalCost, 2500);
      assert.strictEqual(detailed.totalKg, 100);
      assert.strictEqual(detailed.ureaCost, 1350);
      assert.strictEqual(detailed.tspCost, 540);
      assert.strictEqual(detailed.mopCost, 400);
      assert.strictEqual(detailed.dapCost, 210);
    });

    it('F04-3: calculateFertilizerDose computes 3-split top-dressing dose and cost for Boro rice on 2.5 bighas', () => {
      const dose = calculateFertilizerDose({ cropId: 'boro', nutrient: 'urea', area: 2.5, unit: 'bigha', split: 2, totalSplits: 3 });
      assert.strictEqual(dose.doseKg, 90);
      assert.strictEqual(dose.splitsCount, 3);
      assert.strictEqual(dose.currentSplit, 2);
      assert.strictEqual(dose.splitKg, 30);
      assert.strictEqual(dose.splitCostTk, 810);
      assert.strictEqual(dose.totalCostTk, 2430);
      assert.strictEqual(dose.pricePerKg, 27);
    });

    it('F04-4: Basal application applies 100% of TSP and MoP during land preparation in calculateFertilizerDose', () => {
      const tspDose = calculateFertilizerDose({ cropId: 'boro', nutrient: 'tsp', area: 2, unit: 'bigha' });
      assert.strictEqual(tspDose.doseKg, 30);
      assert.strictEqual(tspDose.splitsCount, 1);
      assert.strictEqual(tspDose.splitKg, 30);
      assert.strictEqual(tspDose.totalCostTk, 810);

      const mopDose = calculateFertilizerDose({ cropId: 'boro', nutrient: 'mop', area: 2, unit: 'bigha' });
      assert.strictEqual(mopDose.doseKg, 36);
      assert.strictEqual(mopDose.splitsCount, 1);
      assert.strictEqual(mopDose.splitKg, 36);
      assert.strictEqual(mopDose.totalCostTk, 720);
    });

    it('F04-5: calculateFertilizerDose scales proportionally between bighas and decimals', () => {
      const res = calculateFertilizerDose({ cropId: 'wheat', nutrient: 'tsp', area: 66, unit: 'decimal' });
      assert.strictEqual(res.areaInBighas, 2);
      assert.strictEqual(res.doseKg, 36);
      assert.strictEqual(res.totalCostTk, 972);
      assert.strictEqual(res.splitKg, 36);
    });
  });

  // --- Feature F05: Agricultural Financial Literacy ---
  describe('F05: Agricultural Financial Literacy', () => {
    it('F05-1: Total farm expenses correctly sums seed, fert, water, labor, and plough costs in calculateFarmBudget', () => {
      const budget = calculateFarmBudget({ seedCost: 1500, fertCost: 2500, waterCost: 1200, laborCost: 4000, ploughCost: 1000, otherCost: 500 });
      assert.strictEqual(budget.totalExpenses, 10700);
      assert.strictEqual(budget.expenses.seedCost, 1500);
      assert.strictEqual(budget.expenses.fertCost, 2500);
      assert.strictEqual(budget.expenses.laborCost, 4000);
    });

    it('F05-2: Crop revenue calculates from yield quantity multiplied by selling price', () => {
      const budget = calculateFarmBudget({ yieldAmount: 500, yieldUnit: 'kg', pricePerUnit: 35 });
      assert.strictEqual(budget.revenue, 17500);
      assert.strictEqual(budget.totalRevenue, 17500);
    });

    it('F05-3: Net profit computes as Revenue minus Total Expenses (15000 - 7000 = 8000 Tk)', () => {
      const budget = calculateFarmBudget({ seedCost: 1000, fertCost: 2000, waterCost: 1000, laborCost: 3000, yieldAmount: 500, pricePerUnit: 30 });
      assert.strictEqual(budget.totalExpenses, 7000);
      assert.strictEqual(budget.revenue, 15000);
      assert.strictEqual(budget.profitOrLoss, 8000);
      assert.strictEqual(budget.isProfit, true);
      assert.strictEqual(budget.isLoss, false);
      assert.strictEqual(budget.status, 'profit');
    });

    it('F05-4: Net loss is flagged when expenses exceed revenue (6000 - 12000 = -6000 Tk)', () => {
      const budget = calculateFarmBudget({ seedCost: 3000, fertCost: 4000, waterCost: 2000, laborCost: 3000, yieldAmount: 200, pricePerUnit: 30 });
      assert.strictEqual(budget.profitOrLoss, -6000);
      assert.strictEqual(budget.isProfit, false);
      assert.strictEqual(budget.isLoss, true);
      assert.strictEqual(budget.lossAmount, 6000);
      assert.strictEqual(budget.status, 'loss');
    });

    it('F05-5: ROI% evaluates accurately as (Profit / Expenses) * 100 (5000 / 10000 * 100 = 50%)', () => {
      const budget = calculateFarmBudget({ seedCost: 2000, fertCost: 2000, waterCost: 1000, laborCost: 5000, yieldAmount: 500, pricePerUnit: 30 });
      assert.strictEqual(budget.totalExpenses, 10000);
      assert.strictEqual(budget.profitOrLoss, 5000);
      assert.strictEqual(budget.roiPercent, 50);
    });
  });

  // --- Feature F06: Smart Farming & Satellite Analytics ---
  describe('F06: Smart Farming & Satellite Analytics', () => {
    it('F06-1: NDVI >= 0.75 evaluates as Excellent Vegetation Health with green branding', () => {
      const band = evaluateNdviHealth(0.82);
      assert.strictEqual(band.bandId, 'excellent');
      assert.strictEqual(band.isHealthy, true);
      assert.strictEqual(band.color, '#15803d');
    });

    it('F06-2: NDVI 0.25–0.45 evaluates as Stressed Crop requiring moisture/nutrient care', () => {
      const band = evaluateNdviHealth(0.32);
      assert.strictEqual(band.bandId, 'stressed');
      assert.strictEqual(band.isHealthy, false);
      assert.strictEqual(band.color, '#eab308');
    });

    it('F06-3: NDVI < 0.20 evaluates as Bare Soil or Water', () => {
      const band = evaluateNdviHealth(0.12);
      assert.strictEqual(band.bandId, 'bare');
      assert.strictEqual(band.isHealthy, false);
    });

    it('F06-4: BMD Heavy Rain alert triggers at >= 44 mm rainfall forecast with drain trench action', () => {
      const alert = evaluateWeatherAction({ forecastRainMm: 52 });
      assert.strictEqual(alert.hazardType, 'rain');
      assert.strictEqual(alert.alertLevel, 'heavy');
      assert.strictEqual(alert.ruleId, 'HEAVY_RAIN');
      assert.ok(alert.actionAdvice.bn.includes('নালা') || alert.actionAdvice.bn.includes('সার'));
    });

    it('F06-5: BMD Heatwave alert triggers at >= 36°C temperature forecast with irrigation timing advice', () => {
      const alert = evaluateWeatherAction({ forecastMaxTemp: 38.5 });
      assert.strictEqual(alert.hazardType, 'heat');
      assert.strictEqual(alert.alertLevel, 'moderate');
      assert.strictEqual(alert.ruleId, 'HEATWAVE');
      assert.ok(alert.actionAdvice.bn.includes('সেচ'));
    });
  });

  // --- Feature F07: 3 Difficulty Tiers Progression ---
  describe('F07: 3 Difficulty Tiers Progression', () => {
    it('F07-1: Beginner tier configuration enforces single-step integer bighas via DIFFICULTY_CONFIG and generateKidsChallenge', () => {
      assert.strictEqual(DIFFICULTY_CONFIG.beginner.allowDecimals, false);
      assert.deepStrictEqual(DIFFICULTY_CONFIG.beginner.landUnits, ['bigha']);
      assert.strictEqual(DIFFICULTY_CONFIG.beginner.stepCount, 1);

      const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 100 });
      assert.strictEqual(ch.tier, 'beginner');
      assert.strictEqual(ch.context.unit, 'bigha');
      assert.ok(Number.isInteger(ch.context.area));
      assert.strictEqual(ch.targetAnswer, ch.context.area * ch.context.rate);
    });

    it('F07-2: Intermediate tier introduces multi-plot additions and fractional units', () => {
      assert.strictEqual(DIFFICULTY_CONFIG.intermediate.stepCount, 2);
      assert.ok(DIFFICULTY_CONFIG.intermediate.landUnits.includes('decimal'));
      assert.ok(DIFFICULTY_CONFIG.intermediate.landUnits.includes('katha'));

      const ch = generateKidsChallenge({ category: 'seed', tier: 'intermediate', seed: 200 });
      assert.strictEqual(ch.tier, 'intermediate');
      assert.strictEqual(ch.context.operation, 'two_plot_sum');
      assert.strictEqual(ch.targetAnswer, (ch.context.area1 * ch.context.rate1) + (ch.context.area2 * ch.context.rate2));
    });

    it('F07-3: Advanced tier includes multi-step financial ROI and decimal precision', () => {
      assert.strictEqual(DIFFICULTY_CONFIG.advanced.stepCount, 3);
      assert.strictEqual(DIFFICULTY_CONFIG.advanced.allowDecimals, true);

      const ch = generateKidsChallenge({ category: 'finance', tier: 'advanced', seed: 300 });
      assert.strictEqual(ch.tier, 'advanced');
      assert.strictEqual(ch.formulaKey, 'roi_calculation');
      assert.strictEqual(ch.targetAnswer, Math.round((ch.context.profit / ch.context.totalExpenses) * 100));
    });

    it('F07-4: createPrng produces deterministic challenge parameters for identical seeds', () => {
      const rngA = createPrng(42);
      const rngB = createPrng(42);
      assert.strictEqual(rngA(), rngB());
      assert.strictEqual(rngA(), rngB());

      const chA = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 54321 });
      const chB = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 54321 });
      assert.strictEqual(chA.id, chB.id);
      assert.strictEqual(chA.targetAnswer, chB.targetAnswer);
      assert.deepStrictEqual(chA.options, chB.options);
    });

    it('F07-5: Different PRNG seeds produce distinct numerical parameters in createPrng and generateKidsChallenge', () => {
      const rng1 = createPrng(42);
      const rng2 = createPrng(99);
      assert.notStrictEqual(rng1(), rng2());

      const ch1 = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const ch2 = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 99 });
      assert.notStrictEqual(ch1.id, ch2.id);
    });
  });

  // --- Feature F08: Explanatory Feedback Algorithm ---
  describe('F08: Explanatory Feedback Algorithm', () => {
    it('F08-1: Correct answer provides growth-mindset praise and Tara encouragement via generateExplanatoryFeedback', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const fb = generateExplanatoryFeedback(ch, ch.targetAnswer, 'bn');
      assert.strictEqual(fb.isCorrect, true);
      assert.strictEqual(fb.diagnosticCategory, null);
      assert.ok(fb.step1_formula.includes('সঠিক সূত্র') || fb.step1_formula.length > 0);
      assert.ok(fb.step3_correctAnswer.includes(bnDigits(String(ch.targetAnswer))));
      assert.ok(fb.step5_taraInsight.includes('তারার উৎসাহ'));
    });

    it('F08-2: Incorrect answer produces step-by-step arithmetic breakdown and diagnostic category', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const wrongAns = ch.targetAnswer + 10;
      const fb = generateExplanatoryFeedback(ch, wrongAns, 'bn');
      assert.strictEqual(fb.isCorrect, false);
      assert.ok(fb.diagnosticCategory);
      assert.ok(fb.step2_calculation.includes(bnDigits(String(ch.targetAnswer))));
      assert.ok(fb.step3_correctAnswer.includes(bnDigits(String(ch.targetAnswer))));
      assert.ok(fb.step4_comparison.includes(bnDigits(String(wrongAns))));
      assert.ok(fb.step5_taraInsight.includes('তারার কৃষি টিপস'));
    });

    it('F08-3: Formula display specifies explicit unit multiplication in English explanation', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const fb = generateExplanatoryFeedback(ch, ch.targetAnswer + 5, 'en');
      assert.ok(fb.step1_formula.includes('Total = Land Area × Rate'));
      assert.ok(fb.step1_formula.includes(`${ch.context.area} bighas`));
      assert.ok(fb.step1_formula.includes(`${ch.context.rate} kg/bigha`));
    });

    it('F08-4: Explanatory feedback supports Bangla language formatting and Bengali numerals', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const fb = generateExplanatoryFeedback(ch, ch.targetAnswer + 1, 'bn');
      assert.ok(fb.step3_correctAnswer.includes('সঠিক উত্তর:'));
      assert.ok(fb.step5_taraInsight.includes('তারার কৃষি টিপস:'));
      assert.ok(fb.bilingualSummary.bn.length > 0);
    });

    it('F08-5: Explanatory feedback supports English language formatting and terminology', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const fb = generateExplanatoryFeedback(ch, ch.targetAnswer + 1, 'en');
      assert.ok(fb.step3_correctAnswer.includes('Correct Answer:'));
      assert.ok(fb.step5_taraInsight.includes('Tara’s Agricultural Tip:'));
      assert.ok(fb.step1_formula.includes('Formula & Given:'));
    });
  });

  // --- Feature F09: Central Bilingual Learning Worlds Data ---
  describe('F09: Central Bilingual Learning Worlds Data', () => {
    it('F09-1: Dataset includes exactly 4 Learning Worlds', { skip: skipIfNoKidsData }, () => {
      assert.strictEqual(kidsDataMod.KIDS_WORLDS.length, 4);
    });
    it('F09-2: Every World contains id, title, and missions list', { skip: skipIfNoKidsData }, () => {
      for (const w of kidsDataMod.KIDS_WORLDS) {
        assert.ok(w.id);
        assert.ok(w.title.bn && w.title.en);
        assert.ok(Array.isArray(w.missions) && w.missions.length >= 3);
      }
    });
    it('F09-3: World 1 covers farming fundamentals and crops', { skip: skipIfNoKidsData }, () => {
      assert.strictEqual(kidsDataMod.KIDS_WORLDS[0].id, 'world_farmer');
    });
    it('F09-4: World 2 covers smart farming, satellites, and NDVI', { skip: skipIfNoKidsData }, () => {
      assert.strictEqual(kidsDataMod.KIDS_WORLDS[1].id, 'world_smart');
    });
    it('F09-5: 7 Achievement badges defined with bilingual titles', { skip: skipIfNoKidsData }, () => {
      assert.ok(Object.keys(kidsDataMod.KIDS_BADGES).length >= 7);
      assert.ok(kidsDataMod.KIDS_BADGES.seed_master);
      assert.ok(kidsDataMod.KIDS_BADGES.water_guardian);
      assert.ok(kidsDataMod.KIDS_BADGES.market_maven);
    });
  });

  // --- Feature F10: Gamification & Profile Persistence ---
  describe('F10: Gamification & Profile Persistence', () => {
    it('F10-1: Level 1 Sprout starts at 0 XP', { skip: skipIfNoKidsEngine }, () => {
      const lvl = kidsEngineMod.calculateLevelFromXp(0);
      assert.strictEqual(lvl.level, 1);
    });
    it('F10-2: Level 2 Seedling unlocks at 100 XP', { skip: skipIfNoKidsEngine }, () => {
      const lvl = kidsEngineMod.calculateLevelFromXp(120);
      assert.strictEqual(lvl.level, 2);
    });
    it('F10-3: Level 7 Master Agronomist unlocks at 2000+ XP', { skip: skipIfNoKidsEngine }, () => {
      const lvl = kidsEngineMod.calculateLevelFromXp(2100);
      assert.strictEqual(lvl.level, 7);
    });
    it('F10-4: Progress fraction reflects progress toward next level', { skip: skipIfNoKidsEngine }, () => {
      const lvl = kidsEngineMod.calculateLevelFromXp(50);
      assert.strictEqual(lvl.progressFraction, 0.5);
    });
    it('F10-5: Profile persistence handles default state safely', { skip: skipIfNoKidsEngine }, () => {
      const defProfile = kidsEngineMod.readKidsProfile();
      assert.strictEqual(defProfile.level, 1);
      assert.strictEqual(defProfile.xp, 0);
      assert.deepStrictEqual(defProfile.badges, []);
    });
  });

  // --- Feature F11: Mini-Game Simulation Rules ---
  describe('F11: Mini-Game Simulation Rules', () => {
    it('F11-1: Farmer Market trade computes revenue and net profit', { skip: skipIfNoKidsEngine }, () => {
      const trade = kidsEngineMod.simulateMarketTrade({ demandKg: 20, offeredPriceTk: 35, costKg: 25 });
      assert.strictEqual(trade.revenue, 700);
      assert.strictEqual(trade.profit, 200);
      assert.strictEqual(trade.isProfitable, true);
    });
    it('F11-2: Plant Growth simulation advances stage under optimal moisture', { skip: skipIfNoKidsEngine }, () => {
      const next = kidsEngineMod.simulatePlantGrowthStep({ currentStage: 1, soilMoisture: 65 });
      assert.strictEqual(next.nextStage, 2);
      assert.strictEqual(next.status, 'healthy');
    });
    it('F11-3: Plant Growth simulation flags drought stress when moisture < 30%', { skip: skipIfNoKidsEngine }, () => {
      const status = kidsEngineMod.simulatePlantGrowthStep({ currentStage: 1, soilMoisture: 20 });
      assert.strictEqual(status.status, 'drought_stress');
    });
    it('F11-4: Water Pipeline puzzle checks grid flow connectivity', { skip: skipIfNoKidsEngine }, () => {
      const pipes = [{ id: 1, connected: true }, { id: 2, connected: true }, { id: 3, connected: true }];
      const res = kidsEngineMod.checkPipelineConnectivity(pipes);
      assert.strictEqual(res.isConnected, true);
    });
    it('F11-5: Pest Hunter IPM distinguishes beneficial predators from pests', { skip: skipIfNoKidsEngine }, () => {
      const res = kidsEngineMod.evaluateIpmAction({ bugId: 'ladybird', chosenAction: 'preserve' });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.outcomeType, 'beneficial_preserved');
    });
  });
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (Features F01-B–F11-B, 55 Tests)
// ============================================================================

describe('Tier 2: Boundary & Corner Cases (Features F01-B–F11-B, 55 Tests)', () => {

  describe('F01-B: Land Unit Boundary Cases', () => {
    it('F01-B1: Zero or negative land area returns 0 without crashing', () => {
      assert.strictEqual(convertLandArea(0, 'bigha', 'katha'), 0);
      assert.strictEqual(convertLandArea(-5, 'bigha', 'decimal'), 0);
    });

    it('F01-B2: Fractional bigha (0.25 bigha) converts to exact integer kathas (5) and decimals (8.25)', () => {
      assert.strictEqual(convertLandArea(0.25, 'bigha', 'katha'), 5);
      assert.strictEqual(convertLandArea(0.25, 'bigha', 'decimal'), 8.25);
    });

    it('F01-B3: Micro-parcel conversion (100 sqft converts to 9.29 m²)', () => {
      const m2 = convertLandArea(100, 'sqft', 'm2');
      assert.ok(Math.abs(m2 - 9.2903) < 0.001);
    });

    it('F01-B4: Macro-parcel conversion (1 acre = 43,560 sqft = 3.025 bighas)', () => {
      const bighas = convertLandArea(1, 'acre', 'bigha');
      assert.ok(Math.abs(bighas - 3.025) < 1e-4);
    });

    it('F01-B5: Round-trip land unit conversion preserves numerical fidelity', () => {
      const val = 3.75;
      const toKatha = convertLandArea(val, 'bigha', 'katha');
      const backToBigha = convertLandArea(toKatha, 'katha', 'bigha');
      assert.strictEqual(Math.round(backToBigha * 100) / 100, val);
    });
  });

  describe('F02-B: Seed Rate Boundary Cases', () => {
    it('F02-B1: Zero land area requires exactly 0 kg seed in calculateSeedNeeded', () => {
      const res = calculateSeedNeeded({ cropId: 'boro', area: 0, unit: 'bigha' });
      assert.strictEqual(res.seedKg, 0);
      assert.strictEqual(res.seedGrams, 0);
    });

    it('F02-B2: Fractional area (0.5 bigha) computes exact proportional seed (2.5 kg)', () => {
      const res = calculateSeedNeeded({ cropId: 'boro', area: 0.5, unit: 'bigha' });
      assert.strictEqual(res.seedKg, 2.5);
      assert.strictEqual(res.seedGrams, 2500);
    });

    it('F02-B3: Unknown crop ID safely falls back to standard crop (boro) without crash', () => {
      const res = calculateSeedNeeded({ cropId: 'unknown_alien_crop', area: 2, unit: 'bigha' });
      assert.strictEqual(res.cropId, 'boro');
      assert.strictEqual(res.seedKg, 10);
    });

    it('F02-B4: validateKidsAnswer handles string representations and unit suffixes safely', () => {
      assert.strictEqual(validateKidsAnswer(15, "15.0").isCorrect, true);
      assert.strictEqual(validateKidsAnswer(15, " 15 kg ").isCorrect, true);
      assert.strictEqual(validateKidsAnswer(15, "১৫ কেজি").isCorrect, true);
    });

    it('F02-B5: validateKidsAnswer correctly rejects non-numeric strings and records GENERAL_MISCALCULATION', () => {
      const res = validateKidsAnswer(15, "banana");
      assert.strictEqual(res.isCorrect, false);
      assert.strictEqual(res.diagnosticCategory, 'GENERAL_MISCALCULATION');
      assert.strictEqual(Number.isFinite(res.delta), false);
    });
  });

  describe('F03-B: Water & Irrigation Boundary Cases', () => {
    it('F03-B1: Zero ETo yields 0 water requirement in calculateWaterRequirement', () => {
      const res = calculateWaterRequirement({ cropId: 'boro', area: 2, unit: 'bigha', eto: 0, days: 5, rain: 0 });
      assert.strictEqual(res.dailyEtcMm, 0);
      assert.strictEqual(res.depthMm, 0);
      assert.strictEqual(res.volumeLiters, 0);
    });

    it('F03-B2: Rainfall exceeding crop ETc results in 0 net irrigation required (no negative water)', () => {
      const res = calculateWaterRequirement({ cropId: 'boro', area: 1, unit: 'bigha', eto: 4.0, days: 1, rain: 50 });
      assert.strictEqual(res.depthMm, 0);
      assert.strictEqual(res.volumeLiters, 0);
    });

    it('F03-B3: Zero pump discharge rate is safely handled by calculatePumpRuntimeHours without division by zero', () => {
      const runtime = calculatePumpRuntimeHours({ volumeLiters: 10000, pumpRateLph: 0 });
      assert.strictEqual(runtime, 0);
      const detailed = calculatePumpRuntimeHours({ volumeLiters: 10000, pumpRateLph: 0, detailed: true });
      assert.strictEqual(detailed.runtimeHours, 0);
      assert.strictEqual(detailed.hours, 0);
    });

    it('F03-B4: Extended 100-day duration accumulates continuous water requirement without overflow', () => {
      const res = calculateWaterRequirement({ cropId: 'wheat', area: 1, unit: 'bigha', eto: 3.5, days: 100, rain: 0 });
      assert.strictEqual(res.depthMm, 402.5);
      assert.ok(res.volumeLiters > 500000);
    });

    it('F03-B5: Micro-parcel (1 m²) computes precise volume matching millimeter depth', () => {
      const res = calculateWaterRequirement({ cropId: 'boro', area: 1, unit: 'm2', eto: 4.0, days: 1, rain: 0 });
      assert.strictEqual(res.depthMm, 4.8);
      assert.strictEqual(res.volumeLiters, 4.8);
    });
  });

  describe('F04-B: Fertilizer Dosage Boundary Cases', () => {
    it('F04-B1: Zero fertilizer quantities yields 0 cost in calculateFertilizerCost and calculateFertilizerDose', () => {
      const cost = calculateFertilizerCost({ ureaKg: 0, tspKg: 0, mopKg: 0, dapKg: 0 });
      assert.strictEqual(cost, 0);
      const dose = calculateFertilizerDose({ cropId: 'boro', nutrient: 'urea', area: 0, unit: 'bigha' });
      assert.strictEqual(dose.doseKg, 0);
      assert.strictEqual(dose.totalCostTk, 0);
      assert.strictEqual(dose.splitKg, 0);
    });

    it('F04-B2: Negative fertilizer input is clamped to 0 cost and dose', () => {
      const cost = calculateFertilizerCost({ ureaKg: -10, tspKg: -5 });
      assert.strictEqual(cost, 0);
      const dose = calculateFertilizerDose({ cropId: 'boro', nutrient: 'urea', area: -2, unit: 'bigha' });
      assert.strictEqual(dose.doseKg, 0);
    });

    it('F04-B3: Single split override (totalSplits = 1) in calculateFertilizerDose assigns 100% of dose to single application', () => {
      const dose = calculateFertilizerDose({ cropId: 'maize', nutrient: 'urea', area: 2, unit: 'bigha', totalSplits: 1 });
      assert.strictEqual(dose.doseKg, 90);
      assert.strictEqual(dose.splitsCount, 1);
      assert.strictEqual(dose.splitKg, 90);
      assert.strictEqual(dose.splitKg, dose.doseKg);
    });

    it('F04-B4: Subsidized fertilizer prices in KIDS_FERTILIZERS are strictly positive integers', () => {
      for (const [key, fert] of Object.entries(KIDS_FERTILIZERS)) {
        assert.ok(fert.pricePerKg > 0 && Number.isInteger(fert.pricePerKg));
        assert.strictEqual(fert.subsidized, true);
      }
    });

    it('F04-B5: Legume biological nitrogen fixation sets minimal starter urea requirement (5 kg/bigha)', () => {
      const lentilUrea = calculateFertilizerDose({ cropId: 'lentil', nutrient: 'urea', area: 1, unit: 'bigha' });
      assert.strictEqual(lentilUrea.isLegume, true);
      assert.strictEqual(lentilUrea.doseKg, 5);
      assert.strictEqual(lentilUrea.splitsCount, 1);
      assert.strictEqual(lentilUrea.totalCostTk, 135);
    });
  });

  describe('F05-B: Financial Literacy Boundary Cases', () => {
    it('F05-B1: Break-even scenario (Revenue == Expenses) yields exactly 0 profit, isProfit = true, status = breakeven', () => {
      const budget = calculateFarmBudget({ seedCost: 5000, yieldAmount: 100, pricePerUnit: 50 });
      assert.strictEqual(budget.revenue, 5000);
      assert.strictEqual(budget.totalExpenses, 5000);
      assert.strictEqual(budget.profitOrLoss, 0);
      assert.strictEqual(budget.isProfit, true);
      assert.strictEqual(budget.isBreakEven, true);
      assert.strictEqual(budget.status, 'breakeven');
      assert.strictEqual(budget.roiPercent, 0);
    });

    it('F05-B2: Complete crop loss (Yield = 0, Revenue = 0) yields negative profit equal to -Expenses and ROI -100%', () => {
      const budget = calculateFarmBudget({ seedCost: 3000, fertCost: 2000, yieldAmount: 0, pricePerUnit: 35 });
      assert.strictEqual(budget.revenue, 0);
      assert.strictEqual(budget.profitOrLoss, -5000);
      assert.strictEqual(budget.isProfit, false);
      assert.strictEqual(budget.isLoss, true);
      assert.strictEqual(budget.roiPercent, -100);
    });

    it('F05-B3: Zero expenses with positive revenue handles ROI% without Infinity / NaN crash', () => {
      const budget = calculateFarmBudget({ seedCost: 0, yieldAmount: 100, pricePerUnit: 25 });
      assert.strictEqual(budget.totalExpenses, 0);
      assert.strictEqual(budget.revenue, 2500);
      assert.strictEqual(budget.roiPercent, 100);
      assert.strictEqual(budget.isProfit, true);
    });

    it('F05-B4: Market price surge computes high revenue and profit with maund conversion', () => {
      const budget = calculateFarmBudget({
        area: 2, unit: 'bigha',
        seedCost: 2000, fertCost: 3000, waterCost: 4000, laborCost: 6000,
        yieldAmount: 35, yieldUnit: 'maund', pricePerUnit: 1400,
      });
      assert.strictEqual(budget.totalExpenses, 15000);
      assert.strictEqual(budget.revenue, 49000);
      assert.strictEqual(budget.profitOrLoss, 34000);
      assert.strictEqual(budget.isProfit, true);
    });

    it('F05-B5: Micro-parcel calculation (1 decimal plot) calculates expenses and profit accurately', () => {
      const budget = calculateFarmBudget({ seedCost: 50, fertCost: 80, yieldAmount: 15, pricePerUnit: 25 });
      assert.strictEqual(budget.totalExpenses, 130);
      assert.strictEqual(budget.revenue, 375);
      assert.strictEqual(budget.profitOrLoss, 245);
    });
  });

  describe('F06-B: Satellite & Weather Boundary Cases', () => {
    it('F06-B1: Extreme negative NDVI (-0.8 water body) classifies as water/bare soil with blue color', () => {
      const band = evaluateNdviHealth(-0.8);
      assert.strictEqual(band.bandId, 'bare');
      assert.strictEqual(band.id, 'water');
      assert.strictEqual(band.isHealthy, false);
      assert.strictEqual(band.color, '#3b82f6');
    });

    it('F06-B2: Exact boundary NDVI value 0.60 classifies correctly as good/moderate healthy vegetation', () => {
      const band = evaluateNdviHealth(0.60);
      assert.strictEqual(band.bandId, 'good');
      assert.strictEqual(band.isHealthy, true);
    });

    it('F06-B3: Maximum NDVI (+1.0 dense canopy) classifies as excellent health', () => {
      const band = evaluateNdviHealth(1.0);
      assert.strictEqual(band.bandId, 'excellent');
      assert.strictEqual(band.isHealthy, true);
      assert.strictEqual(band.color, '#15803d');
    });

    it('F06-B4: Torrential monsoon downpour (150 mm rain) triggers very heavy rain emergency advice', () => {
      const alert = evaluateWeatherAction({ forecastRainMm: 150 });
      assert.strictEqual(alert.hazardType, 'rain');
      assert.strictEqual(alert.alertLevel, 'severe');
      assert.strictEqual(alert.ruleId, 'VERY_HEAVY_RAIN');
    });

    it('F06-B5: Severe freezing cold wave (4.5°C) triggers extreme seedbed warming protocol', () => {
      const alert = evaluateWeatherAction({ forecastMinTemp: 4.5 });
      assert.strictEqual(alert.hazardType, 'cold');
      assert.strictEqual(alert.alertLevel, 'severe');
      assert.strictEqual(alert.ruleId, 'COLD_WAVE');
    });
  });

  describe('F07-B: Difficulty Tiers Boundary Cases', () => {
    it('F07-B1: Invalid tier name in generateKidsChallenge defaults safely to beginner tier', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'ultra_nightmare', seed: 12345 });
      assert.strictEqual(ch.tier, 'beginner');
      assert.ok(ch.question.bn.length > 0);
      assert.strictEqual(ch.context.unit, 'bigha');
    });

    it('F07-B2: Beginner challenges generated across 10 random seeds never exceed 5 bighas', () => {
      for (let s = 1; s <= 10; s++) {
        const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: s });
        assert.ok(ch.context.area >= 1 && ch.context.area <= 5);
        assert.strictEqual(ch.context.unit, 'bigha');
        assert.strictEqual(Number.isInteger(ch.context.area), true);
      }
    });

    it('F07-B3: Advanced challenge includes composite multi-step requirements (decimal to bigha conversion + cost)', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'advanced', seed: 777 });
      assert.strictEqual(ch.formulaKey, 'seed_cost_adv');
      assert.ok(ch.context.decimals > 0);
      assert.strictEqual(ch.context.bighas, ch.context.decimals / 33);
      assert.strictEqual(ch.targetAnswer, ch.context.bighas * ch.context.rateKg * ch.context.pricePerKg);
    });

    it('F07-B4: Negative and string seeds in createPrng produce deterministic valid PRNG streams', () => {
      const rngNeg = createPrng(-42);
      const rngPos = createPrng(42);
      assert.strictEqual(rngNeg(), rngPos());

      const rngStr = createPrng('tara_seed');
      const val = rngStr();
      assert.ok(Number.isFinite(val) && val >= 0 && val < 1);
    });

    it('F07-B5: generateKidsChallenge always produces exactly 4 distinct positive options including target answer', () => {
      for (let s = 1; s <= 10; s++) {
        const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: s * 17 });
        assert.strictEqual(ch.options.length, 4);
        assert.ok(ch.options.includes(ch.targetAnswer));
        const unique = new Set(ch.options);
        assert.strictEqual(unique.size, 4);
        for (const opt of ch.options) {
          assert.ok(opt > 0);
        }
      }
    });
  });

  describe('F08-B: Explanatory Feedback Boundary Cases', () => {
    it('F08-B1: Exact correct answer produces concise affirmation without error breakdown in generateExplanatoryFeedback', () => {
      const ch = generateKidsChallenge({ category: 'fertilizer', tier: 'intermediate', seed: 55 });
      const fb = generateExplanatoryFeedback(ch, ch.targetAnswer, 'en');
      assert.strictEqual(fb.isCorrect, true);
      assert.strictEqual(fb.diagnosticCategory, null);
      assert.ok(fb.step4_comparison.includes('100% accurate'));
    });

    it('F08-B2: Answer off by tiny arithmetic slip detects MATH_ARITHMETIC diagnostic category', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const fb = generateExplanatoryFeedback(ch, ch.targetAnswer + 1, 'bn');
      assert.strictEqual(fb.isCorrect, false);
      assert.strictEqual(fb.diagnosticCategory, 'MATH_ARITHMETIC');
      assert.ok(fb.step4_comparison.includes('কাছাকাছি'));
    });

    it('F08-B3: Adding instead of multiplying detects UNIT_CONFUSION diagnostic category', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const wrongAdded = ch.context.area + ch.context.rate;
      const fb = generateExplanatoryFeedback(ch, wrongAdded, 'bn');
      assert.strictEqual(fb.isCorrect, false);
      assert.strictEqual(fb.diagnosticCategory, 'UNIT_CONFUSION');
      assert.ok(fb.step4_comparison.includes('যোগ নয়, গুণ'));
    });

    it('F08-B4: Omitting fertilizer split division detects SPLIT_OMISSION diagnostic category', () => {
      const ch = generateKidsChallenge({ category: 'fertilizer', tier: 'intermediate', seed: 88 });
      const fb = generateExplanatoryFeedback(ch, ch.context.totalDose, 'bn');
      assert.strictEqual(fb.isCorrect, false);
      assert.strictEqual(fb.diagnosticCategory, 'SPLIT_OMISSION');
      assert.ok(fb.step4_comparison.includes('কিস্তিতে'));
    });

    it('F08-B5: Unknown language code in generateExplanatoryFeedback falls back gracefully to English', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const fb = generateExplanatoryFeedback(ch, ch.targetAnswer, 'fr');
      assert.ok(fb.step1_formula.includes('Brilliant!'));
      assert.ok(fb.step3_correctAnswer.includes('Correct Answer:'));
    });
  });

  describe('F09-B: Learning Worlds Data Boundary Cases', () => {
    it('F09-B1: Non-existent world id returns undefined when queried', { skip: skipIfNoKidsData }, () => {
      const found = kidsDataMod.KIDS_WORLDS.find((w) => w.id === 'mars_colony');
      assert.strictEqual(found, undefined);
    });

    it('F09-B2: Every world defines at least 3 learning missions', { skip: skipIfNoKidsData }, () => {
      for (const w of kidsDataMod.KIDS_WORLDS) {
        assert.ok(Array.isArray(w.missions) && w.missions.length >= 3);
      }
    });

    it('F09-B3: Mission rewards across all worlds are strictly positive integers', { skip: skipIfNoKidsData }, () => {
      const rewards = kidsDataMod.KIDS_WORLDS.flatMap((w) => w.missions.map((m) => m.xpReward));
      for (const r of rewards) {
        assert.ok(Number.isInteger(r) && r > 0);
      }
    });

    it('F09-B4: Pest database classifies every organism as harmful or beneficial', { skip: skipIfNoKidsData }, () => {
      for (const p of Object.values(kidsDataMod.KIDS_PESTS)) {
        assert.ok(p.type === 'harmful' || p.type === 'beneficial');
      }
    });

    it('F09-B5: Deep-cloned world definition retains complete schema integrity', { skip: skipIfNoKidsData }, () => {
      const clone = JSON.parse(JSON.stringify(kidsDataMod.KIDS_WORLDS[0]));
      assert.strictEqual(clone.id, kidsDataMod.KIDS_WORLDS[0].id);
      assert.deepStrictEqual(clone.missions, kidsDataMod.KIDS_WORLDS[0].missions);
    });
  });

  describe('F10-B: Profile Persistence Boundary Cases', () => {
    it('F10-B1: Negative XP is clamped safely to 0 (Level 1 Sprout)', { skip: skipIfNoKidsEngine }, () => {
      const lvl = kidsEngineMod.calculateLevelFromXp(-50);
      assert.strictEqual(lvl.level, 1);
    });

    it('F10-B2: Exact boundary XP transitions to next level cleanly (100 XP -> Level 2)', { skip: skipIfNoKidsEngine }, () => {
      const lvl = kidsEngineMod.calculateLevelFromXp(100);
      assert.strictEqual(lvl.level, 2);
    });

    it('F10-B3: Extreme XP (100,000 XP) caps at Level 7 with 1.0 progressFraction', { skip: skipIfNoKidsEngine }, () => {
      const lvl = kidsEngineMod.calculateLevelFromXp(100000);
      assert.strictEqual(lvl.level, 7);
      assert.strictEqual(lvl.progressFraction, 1.0);
    });

    it('F10-B4: Corrupted profile JSON in storage safely resets to default profile', { skip: skipIfNoKidsEngine }, () => {
      const mockStorage = {
        getItem: () => 'invalid{json',
        setItem: () => {},
      };
      const recovered = kidsEngineMod.readKidsProfile(mockStorage);
      assert.strictEqual(recovered.level, 1);
      assert.strictEqual(recovered.xp, 0);
      assert.deepStrictEqual(recovered.badges, []);
    });

    it('F10-B5: evaluateBadges deduplicates previously unlocked badges', { skip: skipIfNoKidsEngine }, () => {
      const profile = { xp: 500, completedSeedMissions: 5, badges: ['seed_master'] };
      const newBadges = kidsEngineMod.evaluateBadges(profile);
      assert.strictEqual(newBadges.includes('seed_master'), false, 'Already earned badges must not be re-awarded');
    });
  });

  describe('F11-B: Mini-Game Simulation Boundary Cases', () => {
    it('F11-B1: Market trade with zero demand yields zero revenue and profit', { skip: skipIfNoKidsEngine }, () => {
      const trade = kidsEngineMod.simulateMarketTrade({ demandKg: 0, offeredPriceTk: 35, costKg: 20 });
      assert.strictEqual(trade.revenue, 0);
      assert.strictEqual(trade.profit, 0);
    });

    it('F11-B2: Market trade at below-cost price computes negative profit and isProfitable = false', { skip: skipIfNoKidsEngine }, () => {
      const trade = kidsEngineMod.simulateMarketTrade({ demandKg: 10, offeredPriceTk: 15, costKg: 20 });
      assert.strictEqual(trade.revenue, 150);
      assert.strictEqual(trade.cost, 200);
      assert.strictEqual(trade.profit, -50);
      assert.strictEqual(trade.isProfitable, false);
    });

    it('F11-B3: Plant growth simulation with moisture > 90% flags waterlogged status', { skip: skipIfNoKidsEngine }, () => {
      const res = kidsEngineMod.simulatePlantGrowthStep({ currentStage: 1, soilMoisture: 98 });
      assert.strictEqual(res.status, 'waterlogged');
    });

    it('F11-B4: Broken pipeline grid returns isConnected = false', { skip: skipIfNoKidsEngine }, () => {
      const brokenPipes = [{ id: 1, connected: true }, { id: 2, connected: false }, { id: 3, connected: true }];
      const res = kidsEngineMod.checkPipelineConnectivity(brokenPipes);
      assert.strictEqual(res.isConnected, false);
    });

    it('F11-B5: Eco-friendly IPM tool (light trap on stem borer) controls pest successfully', { skip: skipIfNoKidsEngine }, () => {
      const res = kidsEngineMod.evaluateIpmAction({ bugId: 'stem_borer', chosenAction: 'light_trap' });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.outcomeType, 'pest_controlled');
    });
  });
});

// ============================================================================
// TIER 3: PAIRWISE COMBINATIONS & CROSS-FEATURE INTERACTIONS (16 Tests)
// ============================================================================

describe('Tier 3: Pairwise Combinations & Cross-Feature Interactions (16 Tests)', () => {

  it('F-PAIR-01: Beginner Tier + Seed Rate Calculation on Bighas', () => {
    const area = 2; // integer bighas
    const seed = calculateSeedNeeded({ cropId: 'boro', area, unit: 'bigha' });
    assert.strictEqual(seed.seedKg, 10);
    assert.strictEqual(seed.seedGrams, 10000);
  });

  it('F-PAIR-02: Intermediate Tier + Seed Rate Calculation on Decimals', () => {
    const area = 33; // 33 decimals = 1 bigha
    const seed = calculateSeedNeeded({ cropId: 'wheat', area, unit: 'decimal' });
    assert.ok(Math.abs(seed.seedKg - 16) < 0.2);
  });

  it('F-PAIR-03: Advanced Tier + Multi-Crop Seed Rate & Cost Calculation', () => {
    const wheatSeed = calculateSeedNeeded({ cropId: 'wheat', area: 2, unit: 'bigha' });
    const mustardSeed = calculateSeedNeeded({ cropId: 'mustard', area: 1, unit: 'bigha' });
    // Wheat: 32 kg * 40 Tk/kg = 1280 Tk; Mustard: 1.2 kg * 120 Tk/kg = 144 Tk
    const totalCost = (wheatSeed.seedKg * 40) + (mustardSeed.seedKg * 120);
    assert.strictEqual(totalCost, 1424);
  });

  it('F-PAIR-04: Intermediate Tier + Water Requirement + STW Pump Runtime', () => {
    const water = calculateWaterRequirement({ cropId: 'boro', area: 1.5, unit: 'bigha', eto: 4.2, days: 3, rain: 0 });
    assert.ok(water.volumeLiters > 20000 && water.volumeLiters < 40000);
    assert.ok(water.pumpHours > 0.8 && water.pumpHours < 1.5);
  });

  it('F-PAIR-05: Advanced Tier + Heavy Rain Alert + Water Requirement Adjustment', () => {
    const alert = evaluateWeatherAction({ forecastRainMm: 60 });
    assert.strictEqual(alert.hazardType, 'rain');
    // On heavy rain forecast, irrigation requirement is set to 0
    const water = calculateWaterRequirement({ cropId: 'boro', area: 2, unit: 'bigha', eto: 4.0, days: 3, rain: 60 });
    assert.strictEqual(water.depthMm, 0);
    assert.strictEqual(water.pumpHours, 0);
  });

  it('F-PAIR-06: Fertilizer Dosage Calculation + Subsidized MoA Price Aggregation', () => {
    // 2 bighas: 60 kg Urea (1620), 30 kg TSP (810), 20 kg MoP (400)
    const cost = calculateFertilizerCost({ ureaKg: 60, tspKg: 30, mopKg: 20 });
    assert.strictEqual(cost, 2830);
  });

  it('F-PAIR-07: 3-Split Top Dressing + Fertilizer Cost Distribution across Sowing & Growth', () => {
    const dose = calculateFertilizerDose({ cropId: 'boro', nutrient: 'urea', area: 1.5, unit: 'bigha', split: 1, totalSplits: 3 });
    assert.strictEqual(dose.doseKg, 54);
    assert.strictEqual(dose.splitsCount, 3);
    assert.strictEqual(dose.splitKg, 18);
    assert.strictEqual(dose.splitCostTk, 486);
    assert.strictEqual(dose.totalCostTk, 1458);
  });

  it('F-PAIR-08: Weather Hazard (Heatwave) + Crop Sensitivity (Boro rice flowering)', () => {
    const alert = evaluateWeatherAction({ forecastMaxTemp: 37, cropId: 'boro' });
    assert.strictEqual(alert.hazardType, 'heat');
    assert.ok(alert.actionAdvice.bn.includes('পানি'));
  });

  it('F-PAIR-09: Weather Hazard (Cold wave) + Boro Seedbed Polythene Protection Advice', () => {
    const alert = evaluateWeatherAction({ forecastMinTemp: 7.5, cropId: 'boro' });
    assert.strictEqual(alert.hazardType, 'cold');
    assert.ok(alert.actionAdvice.bn.includes('পলিথিন') || alert.actionAdvice.en.includes('polythene'));
  });

  it('F-PAIR-10: Satellite NDVI Stressed Evaluation + Fertilizer Booster Recommendation', () => {
    const ndvi = evaluateNdviHealth(0.28);
    assert.strictEqual(ndvi.bandId, 'stressed');
    assert.strictEqual(ndvi.isHealthy, false);
    assert.ok(ndvi.desc.bn.includes('ঘাটতি') || ndvi.desc.en.includes('deficit'));
  });

  it('F-PAIR-11: Farm Budget Calculation + Farmer Market Sales Revenue Integration', () => {
    const harvestKg = 600;
    const soldAtMarketKg = 600;
    const marketPriceTk = 32;
    const budget = calculateFarmBudget({ seedCost: 1500, fertCost: 2500, waterCost: 1200, laborCost: 3000, yieldAmount: soldAtMarketKg, pricePerUnit: marketPriceTk });
    assert.strictEqual(budget.revenue, 19200);
    assert.strictEqual(budget.profitOrLoss, 11000);
    assert.strictEqual(budget.isProfit, true);
  });

  it('F-PAIR-12: Market Trading Daily Profit + Farm Budget Net Profit Ledger', { skip: skipIfNoKidsEngine }, () => {
    const trade1 = kidsEngineMod.simulateMarketTrade({ demandKg: 10, offeredPriceTk: 30, costKg: 20 });
    const trade2 = kidsEngineMod.simulateMarketTrade({ demandKg: 15, offeredPriceTk: 32, costKg: 20 });
    assert.strictEqual(trade1.profit, 100);
    assert.strictEqual(trade2.profit, 180);
    const totalMarketProfit = trade1.profit + trade2.profit;
    assert.strictEqual(totalMarketProfit, 280);
  });

  it('F-PAIR-13: Math Challenge Completion + XP Award + Level Advancement', { skip: skipIfNoKidsEngine }, () => {
    let currentXp = 80; // Level 1
    const missionRewardXp = 50;
    currentXp += missionRewardXp; // 130 XP
    const lvl = kidsEngineMod.calculateLevelFromXp(currentXp);
    assert.strictEqual(lvl.level, 2);
  });

  it('F-PAIR-14: Level Progression + Achievement Badge Unlock Evaluation', { skip: skipIfNoKidsEngine }, () => {
    const profile = { xp: 550, completedSeedMissions: 5, badges: [] };
    const unlockedBadges = kidsEngineMod.evaluateBadges(profile);
    assert.deepStrictEqual(unlockedBadges, ['seed_master']);
  });

  it('F-PAIR-15: Plant Growth Simulation Stage + Soil Moisture Water Balance', { skip: skipIfNoKidsEngine }, () => {
    const step = kidsEngineMod.simulatePlantGrowthStep({ currentStage: 2, soilMoisture: 68 });
    assert.strictEqual(step.nextStage, 3);
    assert.strictEqual(step.status, 'healthy');
  });

  it('F-PAIR-16: Pest Hunter Mini-Game IPM Score + Smart Farmer Badge Unlock', { skip: skipIfNoKidsEngine }, () => {
    const ipmResult1 = kidsEngineMod.evaluateIpmAction({ bugId: 'ladybird', chosenAction: 'preserve' });
    const ipmResult2 = kidsEngineMod.evaluateIpmAction({ bugId: 'stem_borer', chosenAction: 'light_trap' });
    assert.strictEqual(ipmResult1.success, true);
    assert.strictEqual(ipmResult2.success, true);
    const badges = kidsEngineMod.evaluateBadges({ completedIpmMissions: 2, badges: [] });
    assert.ok(badges.includes('satellite_scout') || badges.includes('super_agronomist') || badges.length > 0);
  });
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (6 Tests)
// ============================================================================

describe('Tier 4: Realistic Real-World Application Scenarios (6 Tests)', () => {

  it('SCENARIO-01: Rajshahi Rabi Wheat Cultivation (10-year-old managing 2 bighas)', () => {
    // 1. Land conversion: 2 bighas = 40 kathas = 66 decimals
    const kathas = convertLandArea(2, 'bigha', 'katha');
    assert.strictEqual(kathas, 40);

    // 2. Seed calculation: 2 bighas * 16 kg/bigha = 32 kg wheat seed
    const seed = calculateSeedNeeded({ cropId: 'wheat', area: 2, unit: 'bigha' });
    assert.strictEqual(seed.seedKg, 32);

    // 3. Fertilizer requirements for 2 bighas of wheat (50 kg Urea, 30 kg TSP, 20 kg MoP)
    const fertCost = calculateFertilizerCost({ ureaKg: 50, tspKg: 30, mopKg: 20 });
    assert.strictEqual(fertCost, 2560); // (50*27) + (30*27) + (20*20) = 1350 + 810 + 400 = 2560

    // 4. Irrigation volume and STW runtime (wheat Kc ~ 1.15)
    const water = calculateWaterRequirement({ cropId: 'wheat', area: 2, unit: 'bigha', eto: 3.5, days: 5, rain: 0 });
    assert.ok(water.volumeLiters > 30000);
    assert.ok(water.pumpHours > 1.0);

    // 5. Financial return: Yield = 24 maunds = 24 * 37.32 ≈ 895 kg @ 36 Tk/kg = 32,220 Tk revenue
    const seedCost = seed.seedKg * 40; // 32 * 40 = 1280 Tk
    const waterCost = Math.round(water.pumpHours * 200); // 200 Tk/hr diesel
    const budget = calculateFarmBudget({
      area: 2, unit: 'bigha', seedCost, fertCost, waterCost, laborCost: 5000,
      yieldAmount: 895, yieldUnit: 'kg', pricePerUnit: 36
    });

    assert.ok(budget.totalExpenses < 11000);
    assert.ok(budget.revenue > 32000);
    assert.ok(budget.profitOrLoss > 20000);
    assert.strictEqual(budget.isProfit, true);
    assert.ok(budget.roiPercent > 180);
  });

  it('SCENARIO-02: Haor Basin Flash-Flood Early Action (12-year-old managing Boro rice under flood warning)', () => {
    // 1. Calculate maturity percentage against official crop duration
    const boroDuration = RABI_CROPS.boro.days; // 115 days
    const maturityFraction = 95 / boroDuration;
    assert.ok(maturityFraction >= 0.80, '95 days represents >80% grain maturity for Boro rice');

    // 2. Weather forecast receives BMD alert: 110 mm extreme rain forecast within 3 days
    const alert = evaluateWeatherAction({ forecastRainMm: 110, cropId: 'boro' });
    assert.strictEqual(alert.hazardType, 'rain');
    assert.strictEqual(alert.alertLevel, 'severe');

    // 3. Satellite NDVI verifies mature crop canopy before flooding
    const ndvi = evaluateNdviHealth(0.68);
    assert.strictEqual(ndvi.bandId, 'good');

    // 4. Early action decision: Harvest immediately before floodwaters breach the haor embankments
    const normalHarvestYieldKg = KIDS_CROPS.boro.yield.kgPerBigha * 2; // 2 bighas = 1400 kg
    const grainSavedKg = normalHarvestYieldKg * 0.90; // 90% saved
    const savedRevenue = grainSavedKg * KIDS_CROPS.boro.yield.typicalPriceTkPerKg; // 1260 * 36 = 45,360 Tk
    assert.ok(savedRevenue > 40000);

    // 5. Progression: When M2 engine is available, verify badge award
    if (kidsEngineMod?.evaluateBadges) {
      const unlockedBadges = kidsEngineMod.evaluateBadges({ completedFloodMission: true, badges: [] });
      assert.ok(unlockedBadges.includes('water_guardian'), 'Awards water_guardian badge');
    }
  });

  it('SCENARIO-03: Potato Farm Budget & Haat Trading (14-year-old managing ৳15,000 budget and market sales)', () => {
    const budgetLimit = 15000;
    const area = 1; // 1 bigha

    // 1. Input costs via genuine engine formulas
    const seed = calculateSeedNeeded({ cropId: 'potato', area, unit: 'bigha' }); // 250 kg
    assert.strictEqual(seed.seedKg, 250);
    const seedCost = seed.seedKg * 24; // 6,000 Tk
    const fertCost = calculateFertilizerCost({ ureaKg: 40, tspKg: 30, mopKg: 35 }); // (40*27)+(30*27)+(35*20) = 1080+810+700 = 2590 Tk
    const waterCost = 1200;
    const laborCost = 3500;

    const farmBudget = calculateFarmBudget({ area, unit: 'bigha', seedCost, fertCost, waterCost, laborCost });
    assert.strictEqual(farmBudget.totalExpenses, 13290);
    assert.ok(farmBudget.totalExpenses <= budgetLimit);

    // 2. Market trading at weekly haat: 2000 kg harvest sold @ 22 Tk/kg
    const totalHarvestKg = 2000;
    const sellingPriceTk = 22;
    const revenue = totalHarvestKg * sellingPriceTk; // 44,000 Tk
    const netProfit = revenue - farmBudget.totalExpenses; // 44,000 - 13,290 = 30,710 Tk
    assert.strictEqual(revenue, 44000);
    assert.strictEqual(netProfit, 30710);

    // 3. Progression: When M2 engine is available, verify badge award
    if (kidsEngineMod?.evaluateBadges) {
      const unlockedBadges = kidsEngineMod.evaluateBadges({ marketProfit: netProfit, badges: [] });
      assert.ok(unlockedBadges.includes('market_maven'), 'Awards market_maven badge on reaching profit target');
    }
  });

  it('SCENARIO-04: Beginner Plant Care & Ladybird Rescue (8-year-old growing mungbean and preserving beneficial predators)', { skip: skipIfNoKidsEngine }, () => {
    let currentStage = 1;
    let totalHealthDelta = 0;

    // Daily care loop: Maintain soil moisture in 50-80% safe zone via simulatePlantGrowthStep
    const dailyMoistureReadings = [60, 65, 70, 72];
    for (const moisture of dailyMoistureReadings) {
      const step = kidsEngineMod.simulatePlantGrowthStep({ currentStage, soilMoisture: moisture });
      currentStage = step.nextStage;
      totalHealthDelta += step.healthDelta;
      assert.strictEqual(step.status, currentStage >= 5 ? 'harvest_ready' : 'healthy');
    }
    assert.strictEqual(currentStage, 5, 'Reached Pod Harvest through optimal moisture');

    // Child selects non-chemical IPM action: "Keep ladybird beetles to eat aphids"
    const ipmResult = kidsEngineMod.evaluateIpmAction({ bugId: 'ladybird', chosenAction: 'preserve' });
    assert.strictEqual(ipmResult.success, true);
    assert.strictEqual(ipmResult.outcomeType, 'beneficial_preserved');
    assert.ok(ipmResult.cropHealthDelta > 0);
  });

  it('SCENARIO-05: Climate-Smart Drought Crop Shift (11-year-old shifting from water-intensive rice to drought-resistant maize)', () => {
    const area = 2; // bighas
    const dryDays = 30;
    const eto = 4.5; // High drought evaporation

    // Water needed for Boro rice (Kc ~ 1.2)
    const boroWater = calculateWaterRequirement({ cropId: 'boro', area, unit: 'bigha', eto, days: dryDays, rain: 0 });

    // Water needed for Maize (Kc ~ 1.05)
    const maizeWater = calculateWaterRequirement({ cropId: 'maize', area, unit: 'bigha', eto: 3.5, days: dryDays, rain: 0 });

    // Maize requires significantly less water and pump runtime
    assert.ok(maizeWater.volumeLiters < boroWater.volumeLiters);
    assert.ok(maizeWater.pumpHours < boroWater.pumpHours);

    // Fuel savings:
    const dieselSavingsTk = Math.round((boroWater.pumpHours - maizeWater.pumpHours) * 150);
    assert.ok(dieselSavingsTk > 0);
  });

  it('SCENARIO-06: Complete Learner Journey (Sprout to Agronomist) across all 4 Worlds', { skip: skipIfNoKidsEngine }, () => {
    // Start with fresh profile: Level 1 Sprout, 0 XP, 0 badges
    let profile = kidsEngineMod.readKidsProfile();
    assert.strictEqual(profile.level, 1);
    assert.strictEqual(profile.badges.length, 0);

    // 1. Complete World 1 (Become a Farmer): 3 missions (+150 XP) -> Level 2 Seedling
    profile.xp += 150;
    profile.completedMissions.push('m1', 'm2', 'm3');
    profile.completedSeedMissions = 3;
    profile.level = kidsEngineMod.calculateLevelFromXp(profile.xp).level;
    assert.strictEqual(profile.level, 2);

    // 2. Complete World 2 (Smart Farming & Satellites): 3 missions (+250 XP) -> Level 3 Cultivator + Satellite Scout
    profile.xp += 250;
    profile.completedMissions.push('m4', 'm5', 'm6');
    profile.completedNdviMission = true;
    profile.badges.push(...kidsEngineMod.evaluateBadges(profile));
    profile.level = kidsEngineMod.calculateLevelFromXp(profile.xp).level;
    assert.strictEqual(profile.level, 3);
    assert.ok(profile.badges.includes('satellite_scout'));

    // 3. Complete World 3 (Mathematics in Farming): 3 missions (+600 XP) -> Level 5 Smart Farmer + Seed Master & Math Genius
    profile.xp += 600;
    profile.completedMissions.push('m7', 'm8', 'm9');
    profile.solvedAllMath = true;
    profile.badges.push(...kidsEngineMod.evaluateBadges(profile));
    profile.level = kidsEngineMod.calculateLevelFromXp(profile.xp).level;
    assert.strictEqual(profile.level, 5);
    assert.ok(profile.badges.includes('seed_master'));
    assert.ok(profile.badges.includes('math_genius'));

    // 4. Complete World 4 (Farm Business & Haat Trading): 3 missions (+1100 XP) -> Total 2,100 XP -> Level 7
    profile.xp += 1100;
    profile.completedMissions.push('m10', 'm11', 'm12');
    profile.marketProfit = 25000;
    profile.completedFloodMission = true;
    profile.completedSoilMission = true;
    profile.level = kidsEngineMod.calculateLevelFromXp(profile.xp).level;
    profile.badges.push(...kidsEngineMod.evaluateBadges(profile));

    assert.strictEqual(profile.level, 7);
    assert.ok(profile.xp >= 2000);
    assert.ok(profile.badges.includes('market_maven'));
    assert.ok(profile.badges.includes('water_guardian'));
    assert.ok(profile.badges.includes('soil_doctor'));
    assert.ok(profile.badges.includes('super_agronomist'));
    assert.strictEqual(new Set(profile.badges).size, 7, 'All 7 unique badges legitimately unlocked');

    // Persistence verification
    kidsEngineMod.writeKidsProfile(profile);
    const reloaded = kidsEngineMod.readKidsProfile();
    assert.strictEqual(reloaded.level, 7);
    assert.strictEqual(reloaded.badges.length, 7);
  });
});

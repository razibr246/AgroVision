/**
 * FieldShift Kids – Learn, Play & Grow
 * Agricultural Mathematics & Calculation Engine Test Suite
 *
 * Comprehensive Node.js unit tests (node:test, node:assert/strict) covering:
 * - F01: Land & Weight Unit Conversions
 * - F02: Seed Rate Calculations across all 8 Crops & Input Validator
 * - F03: Crop Water Requirement (FAO-56) & STW Pump Hydraulics
 * - F04: Fertilizer Dosage, Top-Dressing Splits & Subsidized Prices
 * - F05: Agricultural Financial Literacy, Farm Budget & ROI%
 * - F06: Satellite NDVI Health Classification & BMD Weather Risk Rules
 * - F07: 3 Difficulty Tiers Challenge Generator (Mulberry32 PRNG)
 * - F08: Learner Answer Validator & 5-Step Growth-Mindset Feedback
 * - F09: Engine Integrity & Zero-Dependency Validation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  KIDS_LAND_UNITS,
  KIDS_WEIGHT_UNITS,
  KIDS_CROPS,
  KIDS_FERTILIZERS,
  KIDS_NDVI_BANDS,
  KIDS_WEATHER_RULES,
  DIFFICULTY_TIERS,
  DIFFICULTY_CONFIG,
  convertLandArea,
  convertWeight,
  calculateSeedNeeded,
  calculateWaterRequirement,
  calculatePumpRuntimeHours,
  calculateFertilizerDose,
  calculateFertilizerCost,
  calculateFarmBudget,
  evaluateNdviHealth,
  evaluateWeatherAction,
  createPrng,
  generateKidsChallenge,
  validateKidsAnswer,
  generateExplanatoryFeedback,
} from './kidsMath.js';

// Tolerance comparison helper
const approx = (actual, expected, tol = 1e-3) => Math.abs(actual - expected) <= tol;

describe('kidsMath: Agricultural Mathematics Engine', () => {

  // ==========================================================================
  // SUITE 1: Constants and Domain Lookup Tables
  // ==========================================================================
  describe('Suite 1: Constants and Domain Lookup Tables', () => {
    it('KIDS_LAND_UNITS contains standard Bangladesh units and exact ratios', () => {
      assert.ok(KIDS_LAND_UNITS.bigha);
      assert.ok(KIDS_LAND_UNITS.katha);
      assert.ok(KIDS_LAND_UNITS.decimal);
      assert.ok(KIDS_LAND_UNITS.sqft);
      assert.ok(KIDS_LAND_UNITS.m2);
      assert.ok(KIDS_LAND_UNITS.acre);

      assert.strictEqual(KIDS_LAND_UNITS.bigha.decimals, 33);
      assert.strictEqual(KIDS_LAND_UNITS.bigha.kathas, 20);
      assert.ok(Math.abs(KIDS_LAND_UNITS.katha.decimals - 1.65) < 0.01);

      // Verify bilingual labels on all land units
      for (const [key, u] of Object.entries(KIDS_LAND_UNITS)) {
        assert.ok(u.name.bn && u.name.en, `Unit ${key} must have bilingual name`);
        assert.ok(u.symbol.bn && u.symbol.en, `Unit ${key} must have bilingual symbol`);
      }
    });

    it('KIDS_CROPS contains all 8 authentic Bangladesh crops with seed and fertilizer rates', () => {
      const requiredCrops = ['boro', 'aman', 'wheat', 'maize', 'potato', 'mustard', 'lentil', 'mungbean'];
      for (const id of requiredCrops) {
        const crop = KIDS_CROPS[id];
        assert.ok(crop, `Crop ${id} must be defined`);
        assert.ok(crop.seedRateKgPerBigha > 0, `${id} must have seedRateKgPerBigha > 0`);
        assert.ok(crop.fertilizerKgPerBigha.urea > 0, `${id} must specify urea`);
        assert.ok(crop.fertilizerKgPerBigha.tsp > 0, `${id} must specify tsp`);
        assert.ok(crop.fertilizerKgPerBigha.mop > 0, `${id} must specify mop`);
        assert.ok(crop.water.kc.mid > 0, `${id} must have mid-stage Kc`);
        assert.ok(crop.yield.kgPerBigha > 0, `${id} must have yield.kgPerBigha`);
        assert.ok(crop.taraTip.bn && crop.taraTip.en, `${id} must have bilingual taraTip`);
      }

      // Specific agronomic benchmarks
      assert.strictEqual(KIDS_CROPS.boro.seedRateKgPerBigha, 5);
      assert.strictEqual(KIDS_CROPS.wheat.seedRateKgPerBigha, 16);
      assert.strictEqual(KIDS_CROPS.potato.seedRateKgPerBigha, 250);
      assert.strictEqual(KIDS_CROPS.maize.seedRateKgPerBigha, 3);
    });

    it('KIDS_FERTILIZERS matches official subsidized prices (Urea 27, TSP 27, MoP 20, DAP 21)', () => {
      assert.strictEqual(KIDS_FERTILIZERS.urea.pricePerKg, 27);
      assert.strictEqual(KIDS_FERTILIZERS.tsp.pricePerKg, 27);
      assert.strictEqual(KIDS_FERTILIZERS.mop.pricePerKg, 20);
      assert.strictEqual(KIDS_FERTILIZERS.dap.pricePerKg, 21);

      for (const [key, fert] of Object.entries(KIDS_FERTILIZERS)) {
        assert.ok(fert.name.bn && fert.name.en, `Fertilizer ${key} must have bilingual name`);
        assert.ok(fert.function.bn && fert.function.en, `Fertilizer ${key} must have bilingual function`);
        assert.ok(fert.applicationRule.bn && fert.applicationRule.en, `Fertilizer ${key} must have applicationRule`);
      }
    });

    it('KIDS_NDVI_BANDS contains 5 distinct agricultural health bands', () => {
      assert.strictEqual(KIDS_NDVI_BANDS.length, 5);
      for (const b of KIDS_NDVI_BANDS) {
        assert.ok(b.id);
        assert.ok(b.label.bn && b.label.en);
        assert.ok(b.status.bn && b.status.en);
        assert.ok(b.action.bn && b.action.en);
        assert.ok(b.taraTip.bn && b.taraTip.en);
      }
    });

    it('KIDS_WEATHER_RULES specifies BMD thresholds for rain, heat, and cold', () => {
      assert.strictEqual(KIDS_WEATHER_RULES.HEAVY_RAIN.thresholdMm, 44);
      assert.strictEqual(KIDS_WEATHER_RULES.HEAVY_RAIN.veryHeavyThresholdMm, 89);
      assert.strictEqual(KIDS_WEATHER_RULES.HEATWAVE.thresholdTempC, 36);
      assert.strictEqual(KIDS_WEATHER_RULES.COLD_WAVE.thresholdTempC, 10);
    });

    it('DIFFICULTY_TIERS defines beginner, intermediate, and advanced', () => {
      assert.strictEqual(DIFFICULTY_TIERS.beginner, 'beginner');
      assert.strictEqual(DIFFICULTY_TIERS.intermediate, 'intermediate');
      assert.strictEqual(DIFFICULTY_TIERS.advanced, 'advanced');
      assert.ok(DIFFICULTY_CONFIG.beginner);
      assert.ok(DIFFICULTY_CONFIG.intermediate);
      assert.ok(DIFFICULTY_CONFIG.advanced);
    });
  });

  // ==========================================================================
  // SUITE 2: Land Area Unit Conversions (Feature F01)
  // ==========================================================================
  describe('Suite 2: Land Area Unit Conversions (Feature F01)', () => {
    it('converts bighas to kathas and decimals cleanly', () => {
      assert.strictEqual(convertLandArea(1, 'bigha', 'katha'), 20);
      assert.strictEqual(convertLandArea(3, 'bigha', 'katha'), 60);
      assert.strictEqual(convertLandArea(1, 'bigha', 'decimal'), 33);
      assert.strictEqual(convertLandArea(2, 'bigha', 'decimal'), 66);
    });

    it('converts reverse land units (kathas/decimals to bighas)', () => {
      assert.strictEqual(convertLandArea(20, 'katha', 'bigha'), 1);
      assert.strictEqual(convertLandArea(33, 'decimal', 'bigha'), 1);
      assert.strictEqual(convertLandArea(20, 'katha', 'decimal'), 33);
      assert.ok(approx(convertLandArea(1, 'katha', 'decimal'), 1.65, 0.01));
      assert.ok(approx(convertLandArea(33, 'decimal', 'katha'), 20, 0.01));
    });

    it('converts bighas and decimals to square feet and square meters', () => {
      assert.strictEqual(convertLandArea(1, 'bigha', 'sqft'), 14400);
      assert.strictEqual(convertLandArea(1, 'katha', 'sqft'), 720);
      assert.ok(approx(convertLandArea(1, 'bigha', 'm2'), 1338, 2.0));
      assert.ok(approx(convertLandArea(1, 'decimal', 'm2'), 40.47, 0.1));
    });

    it('identity conversions and invalid/edge inputs handling', () => {
      assert.strictEqual(convertLandArea(15, 'bigha', 'bigha'), 15);
      assert.strictEqual(convertLandArea(7, 'decimal', 'decimal'), 7);
      assert.strictEqual(convertLandArea(0, 'bigha', 'decimal'), 0);
      assert.strictEqual(convertLandArea(-5, 'bigha', 'decimal'), 0);
      assert.strictEqual(convertLandArea(10, 'unknown', 'bigha'), 10);
      assert.strictEqual(convertLandArea(null, 'bigha', 'decimal'), 0);
    });
  });

  // ==========================================================================
  // SUITE 3: Weight Unit Conversions (Feature F01)
  // ==========================================================================
  describe('Suite 3: Weight Unit Conversions (Feature F01)', () => {
    it('converts maund to kg (both child-friendly 40 kg metric and traditional 37.32 kg)', () => {
      // Metric maund
      assert.strictEqual(convertWeight(1, 'maund', 'kg', { metricMaund: true }), 40);
      assert.strictEqual(convertWeight(3, 'maund', 'kg', { metricMaund: true }), 120);
      assert.strictEqual(convertWeight(40, 'kg', 'maund', { metricMaund: true }), 1);
      assert.strictEqual(convertWeight(100, 'kg', 'maund', { metricMaund: true }), 2.5);
      assert.strictEqual(convertWeight(1, 'metric_maund', 'kg'), 40);

      // Traditional commercial maund
      assert.ok(approx(convertWeight(1, 'maund', 'kg'), 37.32, 0.05));
      assert.ok(approx(convertWeight(1, 'maund', 'kg', { metricMaund: false }), 37.32, 0.05));
    });

    it('converts metric ton, quintal, and gram', () => {
      assert.strictEqual(convertWeight(1, 'ton', 'kg'), 1000);
      assert.strictEqual(convertWeight(1, 'quintal', 'kg'), 100);
      assert.strictEqual(convertWeight(500, 'g', 'kg'), 0.5);
      assert.strictEqual(convertWeight(2, 'kg', 'g'), 2000);
    });

    it('handles zero, negative, and invalid weight values gracefully', () => {
      assert.strictEqual(convertWeight(0, 'maund', 'kg'), 0);
      assert.strictEqual(convertWeight(-10, 'maund', 'kg'), 0);
      assert.strictEqual(convertWeight(undefined, 'kg', 'maund'), 0);
    });
  });

  // ==========================================================================
  // SUITE 4: Seed Rate Calculations across all 8 Crops (Feature F02)
  // ==========================================================================
  describe('Suite 4: Seed Rate Calculations across all 8 Crops (Feature F02)', () => {
    it('accurately computes seed required for all 8 crops in bighas', () => {
      assert.strictEqual(calculateSeedNeeded({ cropId: 'boro', area: 3, unit: 'bigha' }).seedKg, 15);
      assert.strictEqual(calculateSeedNeeded({ cropId: 'aman', area: 2, unit: 'bigha' }).seedKg, 10);
      assert.strictEqual(calculateSeedNeeded({ cropId: 'wheat', area: 1, unit: 'bigha' }).seedKg, 16);
      assert.strictEqual(calculateSeedNeeded({ cropId: 'maize', area: 4, unit: 'bigha' }).seedKg, 12);
      assert.strictEqual(calculateSeedNeeded({ cropId: 'potato', area: 2, unit: 'bigha' }).seedKg, 500);
      assert.ok(approx(calculateSeedNeeded({ cropId: 'mustard', area: 2, unit: 'bigha' }).seedKg, 2.4, 0.05));
      assert.ok(approx(calculateSeedNeeded({ cropId: 'lentil', area: 2, unit: 'bigha' }).seedKg, 9.0, 0.05));
      assert.ok(approx(calculateSeedNeeded({ cropId: 'mungbean', area: 3, unit: 'bigha' }).seedKg, 12.0, 0.05));
    });

    it('computes proportional seed needed for decimal units', () => {
      // 33 decimals = 1 bigha = 5 kg boro seed
      assert.ok(approx(calculateSeedNeeded({ cropId: 'boro', area: 33, unit: 'decimal' }).seedKg, 5.0, 0.05));
      assert.ok(approx(calculateSeedNeeded({ cropId: 'boro', area: 10, unit: 'decimal' }).seedKg, 1.515, 0.05));
    });

    it('returns well-formed payload with bilingual step-by-step formulas and taraTip', () => {
      const res = calculateSeedNeeded({ cropId: 'boro', area: 3, unit: 'bigha' });
      assert.strictEqual(res.seedKg, 15);
      assert.strictEqual(res.seedGrams, 15000);
      assert.strictEqual(res.unitOfSeed, 'kg');
      assert.ok(res.formula.includes('3'));
      assert.ok(res.formula.includes('15 kg'));
      assert.ok(res.stepByStep.step1.bn && res.stepByStep.step1.en);
      assert.ok(res.taraTip.bn && res.taraTip.en);
    });

    it('handles zero, negative area, string numbers, and unknown crops gracefully', () => {
      assert.strictEqual(calculateSeedNeeded({ cropId: 'boro', area: 0, unit: 'bigha' }).seedKg, 0);
      assert.strictEqual(calculateSeedNeeded({ cropId: 'boro', area: -5, unit: 'bigha' }).seedKg, 0);
      assert.strictEqual(calculateSeedNeeded({ cropId: 'boro', area: '3', unit: 'bigha' }).seedKg, 15);
      assert.ok(calculateSeedNeeded({ cropId: 'dragonfruit', area: 2, unit: 'bigha' }).seedKg > 0);
    });
  });

  // ==========================================================================
  // SUITE 5: Crop Water Requirement (FAO-56) & STW Pump Runtime (Feature F03)
  // ==========================================================================
  describe('Suite 5: Crop Water Requirement (FAO-56) & STW Pump Runtime (Feature F03)', () => {
    it('computes FAO-56 evapotranspiration and volumetric water demand without rain', () => {
      // 1 bigha wheat in mid stage: ETo = 4.0 mm/day, Kc = 1.15, 10 days
      // Daily ETc = 4.6 mm -> 46 mm in 10 days. Area = 1,338 m2 -> Volume = ~61,548 Liters
      const res = calculateWaterRequirement({ cropId: 'wheat', area: 1, unit: 'bigha', eto: 4.0, stage: 'mid', days: 10, rain: 0 });
      assert.ok(approx(res.volumeLiters, 61548, 800));
      assert.ok(approx(res.volumeM3, 61.55, 0.8));
      assert.ok(approx(res.pumpHours, 2.05, 0.05));
    });

    it('deducts effective rain to reduce net irrigation volume', () => {
      // Boro rice: 5 days, gross = 3.0 * 1.05 * 5 = 15.75 mm. Heavy rain = 50 mm. Net = 0 mm.
      const resFullRain = calculateWaterRequirement({ cropId: 'boro', area: 1, unit: 'bigha', eto: 3.0, stage: 'initial', days: 5, rain: 50 });
      assert.strictEqual(resFullRain.depthMm, 0);
      assert.strictEqual(resFullRain.volumeLiters, 0);
      assert.strictEqual(resFullRain.pumpHours, 0);

      // Partial rain
      const noRain = calculateWaterRequirement({ cropId: 'boro', area: 1, unit: 'bigha', eto: 4.0, days: 5, rain: 0 });
      const withRain = calculateWaterRequirement({ cropId: 'boro', area: 1, unit: 'bigha', eto: 4.0, days: 5, rain: 20 });
      assert.ok(withRain.depthMm < noRain.depthMm);
    });

    it('calculatePumpRuntimeHours computes exact running hours at 30,000 L/hr', () => {
      assert.strictEqual(calculatePumpRuntimeHours({ volumeLiters: 60000, pumpRateLph: 30000 }), 2.0);
      assert.strictEqual(calculatePumpRuntimeHours({ volumeLiters: 45000, pumpRateLph: 30000 }), 1.5);
      assert.strictEqual(calculatePumpRuntimeHours({ volumeLiters: 0, pumpRateLph: 30000 }), 0);
      assert.strictEqual(calculatePumpRuntimeHours({ volumeLiters: 50000, pumpRateLph: 0 }), 0);
      assert.strictEqual(calculatePumpRuntimeHours({ volumeLiters: -1000, pumpRateLph: 30000 }), 0);
    });

    it('zero area or zero ETo produces 0 water requirement without crashing', () => {
      const resZeroArea = calculateWaterRequirement({ cropId: 'boro', area: 0, unit: 'bigha' });
      assert.strictEqual(resZeroArea.volumeLiters, 0);
      assert.strictEqual(resZeroArea.depthMm, 0);

      const resZeroEto = calculateWaterRequirement({ cropId: 'boro', area: 2, unit: 'bigha', eto: 0, days: 5, rain: 0 });
      assert.strictEqual(resZeroEto.depthMm, 0);
      assert.strictEqual(resZeroEto.volumeLiters, 0);
    });

    it('returns complete detailed structure when volumeLiters is zero in calculatePumpRuntimeHours', () => {
      const res = calculatePumpRuntimeHours({ volumeLiters: 0, detailed: true });
      assert.strictEqual(res.volumeLiters, 0);
      assert.strictEqual(res.runtimeHours, 0);
      assert.ok(res.timeFormatted && res.timeFormatted.bn);
      assert.strictEqual(res.timeFormatted.bn, '০ ঘণ্টা ০ মিনিট');
    });
  });

  // ==========================================================================
  // SUITE 6: Fertilizer Dosage, Splits & Subsidized Prices (Feature F04)
  // ==========================================================================
  describe('Suite 6: Fertilizer Dosage, Splits & Subsidized Prices (Feature F04)', () => {
    it('calculateFertilizerCost computes exact subsidized prices', () => {
      assert.strictEqual(calculateFertilizerCost({ ureaKg: 10 }), 270);
      assert.strictEqual(calculateFertilizerCost({ tspKg: 10 }), 270);
      assert.strictEqual(calculateFertilizerCost({ mopKg: 10 }), 200);
      assert.strictEqual(calculateFertilizerCost({ dapKg: 10 }), 210);

      // Wheat 1 bigha: 30 kg urea (810) + 18 kg tsp (486) + 14 kg mop (280) = 1576 Tk
      assert.strictEqual(calculateFertilizerCost({ ureaKg: 30, tspKg: 18, mopKg: 14 }), 1576);
      // Zero and negative inputs clamp safely to 0
      assert.strictEqual(calculateFertilizerCost({ ureaKg: 0, tspKg: 0 }), 0);
      assert.strictEqual(calculateFertilizerCost({ ureaKg: -10, tspKg: -5 }), 0);
    });

    it('calculateFertilizerDose computes area dose, splits, and split cost', () => {
      // Boro rice full season urea on 2 bighas: 36 kg/bigha * 2 = 72 kg
      const dose = calculateFertilizerDose({ cropId: 'boro', nutrient: 'urea', area: 2, unit: 'bigha', split: 2, totalSplits: 3 });
      assert.strictEqual(dose.totalKg, 72);
      assert.strictEqual(dose.splitKg, 24);
      assert.strictEqual(dose.costTk, 648); // 24 kg * 27 Tk/kg = 648 Tk
      assert.strictEqual(dose.splitsCount, 3);
      assert.strictEqual(dose.currentSplit, 2);
    });

    it('handles legume biological nitrogen fixation (starter urea only)', () => {
      const lentilDose = calculateFertilizerDose({ cropId: 'lentil', nutrient: 'urea', area: 1, unit: 'bigha' });
      assert.strictEqual(lentilDose.totalKg, 5);
      assert.strictEqual(lentilDose.isLegume, true);
    });

    it('safely handles zero area and invalid split numbers', () => {
      const zeroArea = calculateFertilizerDose({ cropId: 'boro', nutrient: 'urea', area: 0, unit: 'bigha' });
      assert.strictEqual(zeroArea.totalKg, 0);
      assert.strictEqual(zeroArea.costTk, 0);

      const invalidSplits = calculateFertilizerDose({ cropId: 'boro', nutrient: 'urea', area: 1, unit: 'bigha', totalSplits: 0 });
      assert.strictEqual(invalidSplits.splitsCount, 1);
    });

    it('defensively handles NaN or non-positive totalSplits in calculateFertilizerDose', () => {
      const res = calculateFertilizerDose({ cropId: 'boro', area: 1, totalSplits: NaN });
      assert.strictEqual(Number.isFinite(res.splitKg), true);
      assert.strictEqual(res.splitsCount, 3);
      assert.strictEqual(res.splitKg, 12);
    });
  });

  // ==========================================================================
  // SUITE 7: Farm Financial Literacy & Budget Calculation (Feature F05)
  // ==========================================================================
  describe('Suite 7: Farm Financial Literacy & Budget Calculation (Feature F05)', () => {
    it('accurately aggregates expenses and calculates profitable farm budget', () => {
      const budget = calculateFarmBudget({
        area: 2,
        unit: 'bigha',
        cropId: 'boro',
        seedCost: 600,
        fertCost: 1944,
        waterCost: 2500,
        laborCost: 4000,
        otherCost: 500,
        yieldAmount: 38,
        yieldUnit: 'maund',
        pricePerUnit: 1000,
      });

      assert.strictEqual(budget.totalExpenses, 9544);
      assert.strictEqual(budget.revenue, 38000);
      assert.strictEqual(budget.profitOrLoss, 28456);
      assert.strictEqual(budget.isProfit, true);
      assert.strictEqual(budget.isLoss, false);
      assert.strictEqual(budget.isBreakEven, false);
      assert.ok(approx(budget.roiPct, 298.16, 0.5));
    });

    it('identifies financial net loss when expenses exceed revenue', () => {
      const budget = calculateFarmBudget({
        seedCost: 3000,
        fertCost: 4000,
        waterCost: 2000,
        laborCost: 2000,
        yieldAmount: 200,
        yieldUnit: 'kg',
        pricePerUnit: 25,
      });
      // Expenses = 11,000, Revenue = 5,000, Profit = -6,000
      assert.strictEqual(budget.totalExpenses, 11000);
      assert.strictEqual(budget.revenue, 5000);
      assert.strictEqual(budget.profitOrLoss, -6000);
      assert.strictEqual(budget.isProfit, false);
      assert.strictEqual(budget.isLoss, true);
      assert.strictEqual(budget.lossAmount, 6000);
      assert.ok(approx(budget.roiPct, -54.55, 0.5));
    });

    it('evaluates exact break-even (revenue == expenses)', () => {
      const budget = calculateFarmBudget({ seedCost: 5000, yieldAmount: 100, pricePerUnit: 50 });
      assert.strictEqual(budget.totalExpenses, 5000);
      assert.strictEqual(budget.revenue, 5000);
      assert.strictEqual(budget.profitOrLoss, 0);
      assert.strictEqual(budget.isProfit, true);
      assert.strictEqual(budget.isBreakEven, true);
      assert.strictEqual(budget.roiPercent, 0);
    });

    it('handles zero expenses without Infinity or NaN crash', () => {
      const budget = calculateFarmBudget({ seedCost: 0, yieldAmount: 100, pricePerUnit: 25 });
      assert.ok(Number.isFinite(budget.roiPercent));
      assert.strictEqual(budget.isProfit, true);
    });

    it('defensively handles NaN yieldAmount and pricePerUnit in calculateFarmBudget', () => {
      const res = calculateFarmBudget({ area: 1, seedCost: 1000, yieldAmount: NaN, pricePerUnit: NaN });
      assert.strictEqual(Number.isFinite(res.totalRevenue), true);
      assert.strictEqual(Number.isFinite(res.profitOrLoss), true);
      assert.strictEqual(typeof res.isProfit, 'boolean');
      assert.strictEqual(typeof res.isLoss, 'boolean');
      assert.notStrictEqual(res.isProfit, res.isLoss);
    });
  });

  // ==========================================================================
  // SUITE 8: Satellite NDVI Vegetation Health Classification (Feature F06)
  // ==========================================================================
  describe('Suite 8: Satellite NDVI Vegetation Health Classification (Feature F06)', () => {
    it('classifies NDVI values into correct 5 health bands', () => {
      assert.strictEqual(evaluateNdviHealth(-0.2).band, 'water');
      assert.strictEqual(evaluateNdviHealth(0.05).band, 'water');
      assert.strictEqual(evaluateNdviHealth(0.10).band, 'bare_soil');
      assert.strictEqual(evaluateNdviHealth(0.24).band, 'bare_soil');
      assert.strictEqual(evaluateNdviHealth(0.25).band, 'stressed');
      assert.strictEqual(evaluateNdviHealth(0.44).band, 'stressed');
      assert.strictEqual(evaluateNdviHealth(0.45).band, 'moderate');
      assert.strictEqual(evaluateNdviHealth(0.64).band, 'moderate');
      assert.strictEqual(evaluateNdviHealth(0.65).band, 'healthy');
      assert.strictEqual(evaluateNdviHealth(0.85).band, 'healthy');
    });

    it('matches bandId semantics for e2e interoperability', () => {
      assert.strictEqual(evaluateNdviHealth(0.82).bandId, 'excellent');
      assert.strictEqual(evaluateNdviHealth(0.32).bandId, 'stressed');
      assert.strictEqual(evaluateNdviHealth(0.12).bandId, 'bare');
      assert.strictEqual(evaluateNdviHealth(-0.8).bandId, 'bare');
    });

    it('contains non-empty bilingual labels, descriptions, and recommendations', () => {
      const band = evaluateNdviHealth(0.75);
      assert.ok(band.label.bn && band.label.en);
      assert.ok(band.description.bn && band.description.en);
      assert.ok(band.recommendation.bn && band.recommendation.en);
      assert.ok(band.taraTip.bn && band.taraTip.en);
    });

    it('clamps out-of-range and invalid NDVI inputs safely', () => {
      assert.strictEqual(evaluateNdviHealth(1.5).band, 'healthy');
      assert.strictEqual(evaluateNdviHealth(-2.0).band, 'water');
      assert.ok(evaluateNdviHealth(NaN).band);
      assert.ok(evaluateNdviHealth(null).band);
    });
  });

  // ==========================================================================
  // SUITE 9: BMD Weather Risk Actions & Farm Advisory Rules (Feature F06)
  // ==========================================================================
  describe('Suite 9: BMD Weather Risk Actions & Farm Advisory Rules (Feature F06)', () => {
    it('triggers Heavy Rain warning at >= 44 mm rainfall', () => {
      const alert = evaluateWeatherAction({ forecastRainMm: 50 });
      assert.ok(/HEAVY_RAIN|DELAY_FERT/.test(alert.ruleId));
      assert.strictEqual(alert.hazardType, 'rain');
      assert.strictEqual(alert.alertLevel, 'heavy');
      assert.ok(alert.action.bn && alert.action.en);
    });

    it('triggers Very Heavy Rain emergency alert at >= 89 mm rainfall', () => {
      const alert = evaluateWeatherAction({ forecastRainMm: 95 });
      assert.ok(/VERY_HEAVY_RAIN|FLOOD/.test(alert.ruleId));
      assert.strictEqual(alert.alertLevel, 'severe');
    });

    it('triggers Heatwave alert at >= 36°C temperature', () => {
      const alert = evaluateWeatherAction({ forecastRainMm: 0, forecastMaxTemp: 38 });
      assert.ok(/HEATWAVE/.test(alert.ruleId));
      assert.strictEqual(alert.hazardType, 'heat');
      assert.ok(alert.action.bn.includes('সেচ'));
    });

    it('triggers Cold Wave alert at <= 10°C temperature', () => {
      const alert = evaluateWeatherAction({ forecastRainMm: 0, forecastMinTemp: 8 });
      assert.ok(/COLD_WAVE/.test(alert.ruleId));
      assert.strictEqual(alert.hazardType, 'cold');
      assert.ok(alert.action.bn.includes('পলিথিন'));
    });

    it('reports Normal Weather when no thresholds are breached', () => {
      const alert = evaluateWeatherAction({ forecastRainMm: 10, forecastMaxTemp: 28, forecastMinTemp: 18 });
      assert.ok(/NORMAL/.test(alert.ruleId));
      assert.strictEqual(alert.hazardType, 'normal');
      assert.strictEqual(alert.alertLevel, 'none');
    });
  });

  // ==========================================================================
  // SUITE 10: Dynamic Challenge Generator across 3 Difficulty Tiers (Feature F07)
  // ==========================================================================
  describe('Suite 10: Dynamic Challenge Generator across 3 Difficulty Tiers (Feature F07)', () => {
    it('Mulberry32 PRNG provides deterministic challenge reproducibility with identical seed', () => {
      const ch1 = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 4242 });
      const ch2 = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 4242 });
      assert.deepEqual(ch1, ch2);

      const ch3 = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 9999 });
      assert.notDeepEqual(ch1.targetAnswer, ch3.targetAnswer);
    });

    it('beginner tier challenges strictly satisfy integer invariants and valid 4-option sets', () => {
      for (let s = 100; s < 120; s++) {
        const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: s });
        assert.ok(Number.isInteger(ch.correctAnswer), `Beginner seed answer must be integer (seed ${s})`);
        assert.strictEqual(ch.options.length, 4, 'Options must contain exactly 4 choices');
        assert.ok(ch.options.includes(ch.correctAnswer), 'Options must include the correct answer');
        assert.strictEqual(new Set(ch.options).size, 4, 'Options must have 4 distinct choices');
      }
    });

    it('generates intermediate and advanced challenges across multiple categories', () => {
      const intFert = generateKidsChallenge({ category: 'fertilizer', tier: 'intermediate', seed: 101 });
      assert.ok(intFert.targetAnswer > 0);
      assert.strictEqual(intFert.tier, 'intermediate');

      const advFin = generateKidsChallenge({ category: 'finance', tier: 'advanced', seed: 202 });
      assert.ok(advFin.targetAnswer > 0);
      assert.strictEqual(advFin.tier, 'advanced');

      const landCh = generateKidsChallenge({ category: 'land', tier: 'intermediate', seed: 303 });
      assert.ok(landCh.targetAnswer > 0);
    });

    it('falls back safely for unknown categories and tiers', () => {
      const fallback = generateKidsChallenge({ category: 'unknown_magic', tier: 'god_mode', seed: 555 });
      assert.ok(fallback.targetAnswer > 0);
      assert.strictEqual(fallback.tier, 'beginner');
    });
  });

  // ==========================================================================
  // SUITE 11: Learner Answer Validator & Error Categorization (Feature F08)
  // ==========================================================================
  describe('Suite 11: Learner Answer Validator & Error Categorization (Feature F08)', () => {
    it('validates correct answers across numbers, strings, whitespace, and Bangla numerals', () => {
      const ch = { targetAnswer: 15, correctAnswer: 15, tolerance: 0 };
      assert.strictEqual(validateKidsAnswer(ch, 15).isCorrect, true);
      assert.strictEqual(validateKidsAnswer(ch, '15').isCorrect, true);
      assert.strictEqual(validateKidsAnswer(ch, '  15  ').isCorrect, true);
      assert.strictEqual(validateKidsAnswer(ch, '১৫').isCorrect, true); // Bangla numeral 15
      assert.strictEqual(validateKidsAnswer(ch, '১৫ কেজি').isCorrect, true);
    });

    it('supports numeric signature and tolerance percentage evaluation', () => {
      const exact = validateKidsAnswer(15, 15);
      assert.strictEqual(exact.isCorrect, true);

      const close = validateKidsAnswer(15, 15.3, 5); // within 5%
      assert.strictEqual(close.isCorrect, true);

      const wrong = validateKidsAnswer(15, 20, 5);
      assert.strictEqual(wrong.isCorrect, false);
    });

    it('diagnoses educational misconceptions into specific categories', () => {
      // 1. UNIT_CONFUSION: Added 3 + 5 = 8 instead of multiplying 3 * 5 = 15
      const seedCh = {
        targetAnswer: 15,
        context: { operation: 'multiply', area: 3, rate: 5 },
      };
      assert.strictEqual(validateKidsAnswer(seedCh, 8).errorCategory, 'UNIT_CONFUSION');

      // 2. SPLIT_OMISSION: Gave full season dose 72 instead of 24 (1/3 split)
      const fertCh = {
        targetAnswer: 24,
        context: { operation: 'split_division', totalDose: 72, splits: 3 },
      };
      assert.strictEqual(validateKidsAnswer(fertCh, 72).errorCategory, 'SPLIT_OMISSION');

      // 3. MATH_ARITHMETIC: Near miss calculation slip (14 instead of 15)
      assert.strictEqual(validateKidsAnswer(seedCh, 14).errorCategory, 'MATH_ARITHMETIC');
    });

    it('handles empty, null, and non-numeric strings safely', () => {
      const ch = { targetAnswer: 15 };
      assert.strictEqual(validateKidsAnswer(ch, '').isCorrect, false);
      assert.strictEqual(validateKidsAnswer(ch, 'abc').isCorrect, false);
      assert.strictEqual(validateKidsAnswer(ch, null).isCorrect, false);
      assert.strictEqual(validateKidsAnswer(null, 15).isCorrect, false);
    });
  });

  // ==========================================================================
  // SUITE 12: 5-Step Growth-Mindset Explanatory Feedback (Feature F08)
  // ==========================================================================
  describe('Suite 12: 5-Step Growth-Mindset Explanatory Feedback (Feature F08)', () => {
    it('generates all 5 structural feedback steps for incorrect responses in Bangla', () => {
      const challenge = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const fb = generateExplanatoryFeedback(challenge, 8, 'bn');

      assert.strictEqual(fb.isCorrect, false);
      assert.ok(fb.step1_formula, 'Step 1 Formula must exist');
      assert.ok(fb.step2_calculation, 'Step 2 Calculation must exist');
      assert.ok(fb.step3_correctAnswer, 'Step 3 Correct Answer must exist');
      assert.ok(fb.step4_comparison, 'Step 4 Comparison must exist');
      assert.ok(fb.step5_taraInsight, 'Step 5 Tara Insight must exist');

      // Contains natural Bangla characters
      assert.ok(/[\u0980-\u09FF]/.test(fb.step1_formula));
      assert.ok(/[\u0980-\u09FF]/.test(fb.step4_comparison));
      assert.ok(/[\u0980-\u09FF]/.test(fb.step5_taraInsight));

      // No undefined, null, or NaN artifacts in text
      const allText = fb.step1_formula + fb.step2_calculation + fb.step3_correctAnswer + fb.step4_comparison + fb.step5_taraInsight;
      assert.ok(!/undefined|null|NaN/.test(allText), 'Feedback text must not contain undefined or NaN');
    });

    it('generates all 5 structural feedback steps in English', () => {
      const challenge = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const fb = generateExplanatoryFeedback(challenge, 8, 'en');

      assert.strictEqual(fb.isCorrect, false);
      assert.ok(fb.step1_formula.includes('Formula'));
      assert.ok(fb.step2_calculation.includes('Calculation'));
      assert.ok(fb.step3_correctAnswer.includes('Correct Answer'));
      assert.ok(fb.step5_taraInsight.includes('Tara'));
    });

    it('contains encouraging growth-mindset language and celebration for correct responses', () => {
      const challenge = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const fb = generateExplanatoryFeedback(challenge, challenge.targetAnswer, 'bn');

      assert.strictEqual(fb.isCorrect, true);
      assert.ok(fb.step4_comparison.includes('অভিনন্দন') || fb.bilingualSummary.bn.includes('সাবাশ'));
      assert.ok(fb.step5_taraInsight.includes('কৃষক'));
    });

    it('generates clean feedback across ALL 7 challenge categories without undefined, null, or NaN', () => {
      const categories = ['seed', 'water', 'fertilizer', 'finance', 'land', 'ndvi', 'weather'];
      const tiers = ['beginner', 'intermediate', 'advanced'];

      for (const cat of categories) {
        for (const tier of tiers) {
          const ch = generateKidsChallenge({ category: cat, tier, seed: 101 });
          const wrongAns = typeof ch.targetAnswer === 'number' ? ch.targetAnswer + 99 : 'wrong_choice';
          for (const lang of ['bn', 'en']) {
            const fb = generateExplanatoryFeedback(ch, wrongAns, lang);
            const allText = [
              fb.step1_formula,
              fb.step2_calculation,
              fb.step3_correctAnswer,
              fb.step4_comparison,
              fb.step5_taraInsight,
            ].join(' ');

            assert.ok(!/undefined|null|NaN|\[object Object\]/.test(allText),
              `Feedback for category "${cat}" tier "${tier}" (${lang}) must not contain technical artifacts. Found: "${allText}"`);
          }
        }
      }
    });

    it('sanitizes empty, null, undefined, NaN, and object inputs with child-friendly text', () => {
      const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
      const badInputs = [undefined, null, NaN, '', {}];

      for (const bad of badInputs) {
        const fbBn = generateExplanatoryFeedback(ch, bad, 'bn');
        const fbEn = generateExplanatoryFeedback(ch, bad, 'en');

        assert.ok(fbBn.step4_comparison.includes('তুমি কোনো সংখ্যা লেখনি'),
          `Bangla feedback for ${String(bad)} must display friendly warning`);
        assert.ok(fbEn.step4_comparison.includes('You did not enter a valid number'),
          `English feedback for ${String(bad)} must display friendly warning`);

        const allBn = Object.values(fbBn.steps).map((s) => s.bn).join(' ');
        const allEn = Object.values(fbEn.steps).map((s) => s.en).join(' ');
        assert.ok(!/undefined|null|NaN|\[object Object\]/.test(allBn));
        assert.ok(!/undefined|null|NaN|\[object Object\]/.test(allEn));
      }
    });

    it('localizes choice challenge options in step 3 and step 4 without leaking developer enums', () => {
      const chW = generateKidsChallenge({ category: 'weather', tier: 'beginner', seed: 100 });
      const fbW = generateExplanatoryFeedback(chW, 'routine_care', 'bn');

      assert.ok(!fbW.step3_correctAnswer.includes('drain_no_fert'), 'Step 3 must not leak drain_no_fert');
      assert.ok(fbW.step3_correctAnswer.includes('জমির নালা খুলে দেওয়া'), 'Step 3 must contain Bangla label');
      assert.ok(!fbW.step4_comparison.includes('routine_care'), 'Step 4 must not leak routine_care');
      assert.ok(fbW.step4_comparison.includes('মাঠে স্বাভাবিক পরিচর্যা'), 'Step 4 must contain Bangla label');

      const chN = generateKidsChallenge({ category: 'ndvi', tier: 'beginner', seed: 100 });
      const fbN = generateExplanatoryFeedback(chN, 'water', 'bn');

      assert.ok(!fbN.step3_correctAnswer.includes('bare_soil'), 'Step 3 must not leak bare_soil');
      assert.ok(fbN.step3_correctAnswer.includes('পতিত বা অনাবাদী মাটি'), 'Step 3 must contain Bangla label');
      assert.ok(!fbN.step4_comparison.includes('water'), 'Step 4 must not leak water');
      assert.ok(fbN.step4_comparison.includes('পানি বা প্লাবিত জমি'), 'Step 4 must contain Bangla label');
    });

    it('safely handles null or invalid challenge object without crashing', () => {
      const fbDefault = generateExplanatoryFeedback(null, 15);
      assert.strictEqual(fbDefault.isCorrect, false);
      assert.strictEqual(fbDefault.diagnosticCategory, 'MISSING_CHALLENGE');
      assert.ok(fbDefault.step1_formula.includes('No challenge provided'));
      assert.ok(!/[\u0980-\u09FF]/.test(fbDefault.step1_formula));

      const fbBn = generateExplanatoryFeedback(null, 15, 'bn');
      assert.strictEqual(fbBn.isCorrect, false);
      assert.strictEqual(fbBn.diagnosticCategory, 'MISSING_CHALLENGE');
      assert.ok(fbBn.step1_formula.includes('কোনো চ্যালেঞ্জ পাওয়া যায়নি'));

      const fbEn = generateExplanatoryFeedback(undefined, 15, 'en');
      assert.strictEqual(fbEn.isCorrect, false);
      assert.strictEqual(fbEn.diagnosticCategory, 'MISSING_CHALLENGE');
      assert.ok(fbEn.step1_formula.includes('No challenge provided'));
    });

    it('uses Bengali digits consistently in seed formulaBn and weather summary.bn', () => {
      const seed = calculateSeedNeeded({ cropId: 'boro', area: 2, unit: 'bigha' });
      assert.ok(/[০-৯]/.test(seed.formulaBn));
      assert.ok(!/[0-9]/.test(seed.formulaBn), `ASCII digits leaked into formulaBn: ${seed.formulaBn}`);
      const weather = evaluateWeatherAction({ cropId: 'boro', forecastRainMm: 65, forecastMaxTemp: 31, forecastMinTemp: 18 });
      assert.ok(/[০-৯]/.test(weather.bilingualSummary.bn));
      assert.ok(!/[0-9]/.test(weather.bilingualSummary.bn), `ASCII digits leaked into weather summaryBn: ${weather.bilingualSummary.bn}`);
    });
  });
});

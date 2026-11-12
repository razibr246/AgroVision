import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCEC,
  calculateBaseSaturation,
  calculateCarbonPools,
  calculateFossilDieselOffset,
  calculateNetEnvironmentalFootprint,
} from './soilChemistry.js';

test('soil chemistry: CEC increases with clay and organic matter', () => {
  const lowClay = calculateCEC({ clayPct: 15, omPct: 1.0, ph: 6.0 });
  const highClay = calculateCEC({ clayPct: 40, omPct: 2.5, ph: 6.0 });

  assert.ok(highClay > lowClay, 'High clay and OM soil must have higher CEC');
  assert.ok(lowClay >= 8 && lowClay <= 15, 'Sandy loam CEC should fall between 8 and 15 cmol/kg');
  assert.ok(highClay >= 20 && highClay <= 35, 'Clay loam CEC should fall between 20 and 35 cmol/kg');
});

test('soil chemistry: Base saturation scales sigmoidally with pH and partitions basic cations', () => {
  const acid = calculateBaseSaturation({ cec: 20, ph: 4.8, landform: 'barind' });
  const neutral = calculateBaseSaturation({ cec: 20, ph: 7.0, landform: 'alluvium' });

  assert.ok(neutral.baseSaturationPct > acid.baseSaturationPct, 'Neutral soil must have higher BS% than acidic soil');
  assert.ok(acid.baseSaturationPct < 50, 'pH 4.8 soil should be under 50% base saturated');
  assert.ok(neutral.baseSaturationPct > 80, 'pH 7.0 soil should be over 80% base saturated');

  // Sum of cations should match total bases
  const sumCations = acid.caCmol + acid.mgCmol + acid.kCmol + acid.naCmol;
  assert.ok(Math.abs(sumCations - acid.totalBasesCmol) <= 0.3, 'Cation fractions must sum to total bases');
});

test('carbon pools: ICBM steady-state young and old pools plus the RothC inert pool', () => {
  const res = calculateCarbonPools({ totalCarbonTHa: 30, landform: 'barind' });
  assert.equal(res.totalTHa, 30);
  // Falloon et al. (1998): IOM = 0.049 × 30^1.139 ≈ 2.36 t C/ha
  assert.ok(Math.abs(res.inert.tHa - 2.36) < 0.02, `inert ${res.inert.tHa}`);
  // ICBM steady state: young / old = k2 / (h k1) = 0.006 / 0.1 = 0.06
  assert.ok(Math.abs(res.labile.tHa / res.humus.tHa - 0.06) < 0.001);
  const poolSum = res.labile.tHa + res.humus.tHa + res.inert.tHa;
  assert.ok(Math.abs(poolSum - 30) <= 0.02, 'Carbon pools must sum to total carbon');
  assert.equal(res.humus.residenceYears, 167);

  const peat = calculateCarbonPools({ totalCarbonTHa: 50, landform: 'peat' });
  assert.equal(peat.mineralSoilOnly, true, 'the inert-pool equation is flagged outside mineral soils');
});

test('fossil fuel diesel offset: quantifies avoided diesel pumping and CO2 emissions', () => {
  const offset = calculateFossilDieselOffset({ waterSavedMm: 100, areaBigha: 1 });
  assert.equal(offset.waterSavedMm, 100);
  assert.equal(offset.m3Saved, 133);
  assert.ok(offset.dieselLitersSaved >= 10 && offset.dieselLitersSaved <= 13, 'Saving 100mm over 1 bigha saves ~11.3L diesel');
  assert.ok(offset.avoidedCo2Kg >= 28 && offset.avoidedCo2Kg <= 35, 'Avoided CO2 should be ~30.3 kg');
  assert.ok(offset.dieselCostSavedBdt > 1000, 'Avoided diesel expenditure should be over 1,000 BDT');
});

test('net environmental footprint: integrates soil carbon, methane avoidance, and diesel offsets', () => {
  const net = calculateNetEnvironmentalFootprint({
    icbmDeltaC: 0.5,
    ch4AvoidedKg: 20,
    waterSavedMm: 150,
    areaBigha: 1,
  });

  assert.ok(net.soilCo2eKg > 0, 'Soil carbon sequestration must be positive');
  assert.ok(net.ch4Co2eKg >= 500, '20 kg CH4 avoided * 28 GWP should exceed 500 kg CO2e');
  assert.ok(net.dieselCo2eKg > 0, 'Diesel fossil emissions avoided must be positive');
  assert.ok(net.netClimateMitigationCo2eKg >= 800, 'Combined climate mitigation should exceed 800 kg CO2e/bigha');
  assert.ok(net.netTonnesCo2e >= 0.8, 'Net tonnes CO2e should exceed 0.8 t');
});

test('calculateCarbonPools localizes turnover descriptions cleanly in English (default) and Bangla', () => {
  const enPools = calculateCarbonPools({ totalCarbonTHa: 28 });
  assert.ok(!/[\u0980-\u09ff]/.test(enPools.labile.turnoverYears));
  assert.ok(!/[\u0980-\u09ff]/.test(enPools.humus.turnoverYears));
  assert.ok(!/[\u0980-\u09ff]/.test(enPools.inert.turnoverYears));
  assert.ok(enPools.labile.turnoverLabel?.en && enPools.labile.turnoverLabel?.bn);

  const bnPools = calculateCarbonPools({ totalCarbonTHa: 28, lang: 'bn' });
  assert.ok(/[\u0980-\u09ff]/.test(bnPools.labile.turnoverYears));
  assert.ok(/[\u0980-\u09ff]/.test(bnPools.inert.turnoverYears));
});

/**
 * Adversarial Challenger 2 Test Suite (Milestone 1) - Extended
 *
 * Systematic stress-testing and fuzzing harness for `src/engine/kidsMath.js`:
 * 1. Fuzz generateKidsChallenge with 150+ seeds across all 7 categories & 3 tiers (3,150+ challenges)
 * 2. Verify strict beginner invariants: positive integers, 4 unique options
 * 3. Fuzz validateKidsAnswer with chaotic & adversarial inputs (Bangla numerals, whitespace, symbols, empty strings, negatives, malformed)
 * 4. Fuzz generateExplanatoryFeedback across 100+ erroneous answers in both Bangla and English:
 *    - Check for 'undefined', 'null', 'NaN', '[object Object]'
 *    - Verify 5-step feedback integrity
 *    - Check choice question formatting & localization
 * 5. Fuzz calculation functions with extreme/adversarial boundaries (negative, zero, NaN, huge numbers)
 */

import {
  generateKidsChallenge,
  validateKidsAnswer,
  generateExplanatoryFeedback,
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
  KIDS_LAND_UNITS,
  KIDS_CROPS,
  KIDS_FERTILIZERS,
  KIDS_NDVI_BANDS,
  KIDS_WEATHER_RULES,
  DIFFICULTY_TIERS,
} from '../src/engine/kidsMath.js';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBnNum(num) {
  return String(num).replace(/\d/g, (d) => BN_DIGITS[d]);
}

const CATEGORIES = ['seed', 'fertilizer', 'water', 'finance', 'land', 'ndvi', 'weather'];
const TIERS = ['beginner', 'intermediate', 'advanced'];

const stats = {
  totalGenerated: 0,
  beginnerChecked: 0,
  validationFuzzCount: 0,
  feedbackFuzzCount: 0,
  calcEdgeCount: 0,
  findings: [],
};

console.log('================================================================');
console.log('STARTING EXTENDED ADVERSARIAL STRESS TEST & FUZZING HARNESS');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: FUZZ generateKidsChallenge (150 seeds x 7 categories x 3 tiers = 3,150 challenges)
// -----------------------------------------------------------------------------
console.log('>>> [1/5] Fuzzing generateKidsChallenge with 150 seeds across all categories and tiers...');

let generatorErrors = 0;
let nonDeterministicCount = 0;

for (let seed = 1; seed <= 150; seed++) {
  for (const category of CATEGORIES) {
    for (const tier of TIERS) {
      stats.totalGenerated++;
      try {
        const ch1 = generateKidsChallenge({ category, tier, seed });
        const ch2 = generateKidsChallenge({ category, tier, seed });

        // Verify determinism
        if (JSON.stringify(ch1) !== JSON.stringify(ch2)) {
          nonDeterministicCount++;
          stats.findings.push({
            type: 'NON_DETERMINISTIC_PRNG',
            category,
            tier,
            seed,
          });
        }

        // Check essential challenge fields
        if (!ch1.id || !ch1.question || !ch1.question.bn || !ch1.question.en) {
          generatorErrors++;
          stats.findings.push({
            type: 'MALFORMED_CHALLENGE_STRUCTURE',
            category,
            tier,
            seed,
            details: 'Missing id or bilingual question',
          });
        }

        // Check targetAnswer existence
        if (ch1.targetAnswer === undefined && ch1.correctAnswer === undefined) {
          generatorErrors++;
          stats.findings.push({
            type: 'MISSING_TARGET_ANSWER',
            category,
            tier,
            seed,
          });
        }
      } catch (err) {
        generatorErrors++;
        stats.findings.push({
          type: 'GENERATOR_CRASH',
          category,
          tier,
          seed,
          error: err.message,
        });
      }
    }
  }
}

// Test edge-case seeds and categories
const seedEdgeCases = [0, -1, -99999, 'custom-seed', '', null, undefined, NaN];
for (const s of seedEdgeCases) {
  try {
    const ch = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: s });
    if (!ch || !ch.targetAnswer) {
      stats.findings.push({ type: 'GENERATOR_SEED_EDGE_FAILED', seed: s });
    }
  } catch (err) {
    stats.findings.push({ type: 'GENERATOR_SEED_EDGE_CRASH', seed: s, error: err.message });
  }
}

console.log(`Generated and validated ${stats.totalGenerated} challenges.`);
console.log(`Generator errors: ${generatorErrors}, Non-deterministic runs: ${nonDeterministicCount}\n`);

// -----------------------------------------------------------------------------
// TEST 2: VERIFY STRICT BEGINNER INVARIANTS
// -----------------------------------------------------------------------------
console.log('>>> [2/5] Testing Strict Beginner Invariants (Positive Integers & 4 Unique Options)...');

let beginnerTargetNotInt = 0;
let beginnerTargetNotPositive = 0;
let beginnerOptionsNot4 = 0;
let beginnerOptionsNotUnique = 0;
let beginnerOptionsNotInt = 0;
let beginnerOptionsNotPositive = 0;
let beginnerMissingCorrectInOptions = 0;

for (let seed = 1; seed <= 200; seed++) {
  for (const category of CATEGORIES) {
    stats.beginnerChecked++;
    const ch = generateKidsChallenge({ category, tier: 'beginner', seed });

    // Numeric challenges
    if (ch.answerType !== 'choice') {
      const target = ch.targetAnswer ?? ch.correctAnswer;
      // 1. Target answer must be a positive integer
      if (typeof target !== 'number' || !Number.isInteger(target)) {
        beginnerTargetNotInt++;
        stats.findings.push({
          type: 'BEGINNER_TARGET_NOT_INTEGER',
          category,
          seed,
          target,
        });
      }
      if (typeof target === 'number' && target <= 0) {
        beginnerTargetNotPositive++;
        stats.findings.push({
          type: 'BEGINNER_TARGET_NOT_POSITIVE',
          category,
          seed,
          target,
        });
      }

      // 2. Options must exist and have exactly 4 items
      if (!Array.isArray(ch.options) || ch.options.length !== 4) {
        beginnerOptionsNot4++;
        stats.findings.push({
          type: 'BEGINNER_OPTIONS_NOT_4',
          category,
          seed,
          length: ch.options ? ch.options.length : 0,
        });
      } else {
        // 3. Options must be unique
        const uniqueSet = new Set(ch.options);
        if (uniqueSet.size !== 4) {
          beginnerOptionsNotUnique++;
          stats.findings.push({
            type: 'BEGINNER_OPTIONS_NOT_UNIQUE',
            category,
            seed,
            options: ch.options,
          });
        }

        // 4. Options must all be positive integers
        for (const opt of ch.options) {
          if (typeof opt !== 'number' || !Number.isInteger(opt)) {
            beginnerOptionsNotInt++;
            stats.findings.push({
              type: 'BEGINNER_OPTION_NOT_INTEGER',
              category,
              seed,
              option: opt,
            });
          }
          if (typeof opt === 'number' && opt <= 0) {
            beginnerOptionsNotPositive++;
            stats.findings.push({
              type: 'BEGINNER_OPTION_NOT_POSITIVE',
              category,
              seed,
              option: opt,
            });
          }
        }

        // 5. Correct answer must be among the options
        if (!ch.options.includes(target)) {
          beginnerMissingCorrectInOptions++;
          stats.findings.push({
            type: 'BEGINNER_OPTIONS_MISSING_TARGET',
            category,
            seed,
            target,
            options: ch.options,
          });
        }
      }
    } else {
      // Choice questions (ndvi, weather)
      if (category === 'ndvi' && ch.options.length !== 4) {
        stats.findings.push({
          type: 'NDVI_CHOICE_OPTIONS_COUNT_VARIATION',
          category,
          seed,
          optionsLength: ch.options.length,
          note: 'NDVI returns 5 health bands as options rather than 4 choices',
        });
      }
    }
  }
}

console.log(`Beginner challenges checked: ${stats.beginnerChecked}`);
console.log(`Target not integer: ${beginnerTargetNotInt}, Target not positive: ${beginnerTargetNotPositive}`);
console.log(`Options not 4: ${beginnerOptionsNot4}, Options not unique: ${beginnerOptionsNotUnique}`);
console.log(`Options not integer: ${beginnerOptionsNotInt}, Options not positive: ${beginnerOptionsNotPositive}`);
console.log(`Options missing target: ${beginnerMissingCorrectInOptions}\n`);

// -----------------------------------------------------------------------------
// TEST 3: FUZZ validateKidsAnswer (Chaotic & Adversarial Inputs)
// -----------------------------------------------------------------------------
console.log('>>> [3/5] Fuzzing validateKidsAnswer with Malicious and Chaotic Inputs...');

const testChallenge = generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 42 });
const targetVal = testChallenge.targetAnswer; // 48
const targetBn = toBnNum(targetVal); // '৪৮'

let banglaMatches = 0;
let banglaFailures = 0;

// Test valid Bangla digit variations for target
const validVariations = [
  targetBn,
  `${targetBn} কেজি`,
  ` ${targetBn} `,
  `   ${targetBn}   kg  `,
  `${targetVal} kg`,
  `${targetVal}.0`,
  `${targetVal}.00 kg`,
  ` ${targetVal} `,
];

for (const input of validVariations) {
  stats.validationFuzzCount++;
  const res = validateKidsAnswer(testChallenge, input);
  if (res.isCorrect === true) {
    banglaMatches++;
  } else {
    banglaFailures++;
    stats.findings.push({
      type: 'VALID_BANGLA_INPUT_REJECTED',
      input,
      targetVal,
      res,
    });
  }
}

// Test chaotic & adversarial inputs
const chaoticInputs = [
  '',
  ' ',
  '   \t  \n  ',
  null,
  undefined,
  'abc',
  '!@#$%^&*()_+',
  'forty-eight',
  'NaN',
  'null',
  'undefined',
  'Infinity',
  '-Infinity',
  '{}',
  '[]',
  '-48',
  '--48',
  '48-0',
  '48/1',
  '48.0000000001',
  '1e2',
  '999999999999999999999999999999',
  '0',
  toBnNum(0),
  toBnNum(targetVal + 1),
  toBnNum(targetVal - 1),
  '1,000',
  '4,8',
];

let cleanRejections = 0;
let falseAcceptances = 0;

for (const input of chaoticInputs) {
  stats.validationFuzzCount++;
  try {
    const res = validateKidsAnswer(testChallenge, input);
    // If input was close or target
    if (input === toBnNum(targetVal + 1) || input === toBnNum(targetVal - 1) || input === '0' || input === toBnNum(0) || input === '-48') {
      if (res.isCorrect === false) {
        cleanRejections++;
      } else {
        falseAcceptances++;
        stats.findings.push({
          type: 'FALSE_ACCEPTANCE',
          input,
          targetVal,
          res,
        });
      }
    } else if (input === '4,8') {
      // In JS, '4,8' with [^\d.-] becomes '48' which equals target!
      if (res.isCorrect === true) {
        stats.findings.push({
          type: 'COMMA_STRIP_MATCH_ANOMALY',
          input: '4,8',
          parsed: res.submittedValue,
          targetVal,
          note: "Input '4,8' was stripped of comma and parsed as 48, matching target 48",
        });
      }
    } else {
      if (res.isCorrect === false) {
        cleanRejections++;
      } else {
        falseAcceptances++;
        stats.findings.push({
          type: 'FALSE_ACCEPTANCE',
          input,
          targetVal,
          res,
        });
      }
    }
  } catch (err) {
    stats.findings.push({
      type: 'VALIDATION_CRASH',
      input,
      error: err.message,
    });
  }
}

console.log(`Validation inputs tested: ${stats.validationFuzzCount}`);
console.log(`Valid Bangla/English parsed correctly: ${banglaMatches}/${validVariations.length}`);
console.log(`Clean rejections: ${cleanRejections}, False acceptances: ${falseAcceptances}\n`);

// -----------------------------------------------------------------------------
// TEST 4: FUZZ generateExplanatoryFeedback (Sanitization & 5-Step Structure)
// -----------------------------------------------------------------------------
console.log('>>> [4/5] Fuzzing generateExplanatoryFeedback across 100+ Erroneous Answers in EN & BN...');

const errorInputs = [
  '14', '16', '13', '17',
  '8',
  '0', '-15', '150', '30', '1', '100',
  '', '   ', null, undefined, 'abc', 'NaN', 'null', 'undefined',
  '15 kg wrong', '!@#', '০', '৯৯', '৮',
  false, true, {}, []
];

let feedbackCrashes = 0;
let feedbackWithNan = 0;
let feedbackWithNull = 0;
let feedbackWithUndef = 0;
let feedbackWithBrokenObject = 0;
let missing5StepsCount = 0;
let choiceRawEnumLeaked = 0;

const sampleChallenges = [
  generateKidsChallenge({ category: 'seed', tier: 'beginner', seed: 1 }),
  generateKidsChallenge({ category: 'fertilizer', tier: 'intermediate', seed: 2 }),
  generateKidsChallenge({ category: 'water', tier: 'intermediate', seed: 3 }),
  generateKidsChallenge({ category: 'finance', tier: 'beginner', seed: 4 }),
  generateKidsChallenge({ category: 'finance', tier: 'intermediate', seed: 5 }),
  generateKidsChallenge({ category: 'land', tier: 'beginner', seed: 6 }),
  generateKidsChallenge({ category: 'land', tier: 'intermediate', seed: 7 }),
  generateKidsChallenge({ category: 'weather', tier: 'beginner', seed: 8 }),
  generateKidsChallenge({ category: 'ndvi', tier: 'beginner', seed: 9 }),
];

for (const ch of sampleChallenges) {
  for (const errInput of errorInputs) {
    for (const lang of ['bn', 'en']) {
      stats.feedbackFuzzCount++;
      try {
        const fb = generateExplanatoryFeedback(ch, errInput, lang);

        if (
          !fb.step1_formula ||
          !fb.step2_calculation ||
          !fb.step3_correctAnswer ||
          !fb.step4_comparison ||
          !fb.step5_taraInsight
        ) {
          missing5StepsCount++;
          stats.findings.push({
            type: 'FEEDBACK_MISSING_5_STEPS',
            category: ch.category,
            tier: ch.tier,
            input: String(errInput),
            lang,
          });
        }

        const allText = [
          fb.step1_formula,
          fb.step2_calculation,
          fb.step3_correctAnswer,
          fb.step4_comparison,
          fb.step5_taraInsight,
          fb.explanationText,
          fb.taraInsight,
          fb.formulaDisplay,
        ].join(' ');

        if (allText.includes('NaN')) {
          feedbackWithNan++;
          stats.findings.push({
            type: 'FEEDBACK_CONTAINS_NAN',
            category: ch.category,
            input: String(errInput),
            lang,
            snippet: allText.substring(0, 120),
          });
        }

        if (/\bnull\b/.test(allText)) {
          feedbackWithNull++;
          stats.findings.push({
            type: 'FEEDBACK_CONTAINS_NULL_LITERAL',
            category: ch.category,
            input: String(errInput),
            lang,
            snippet: allText.substring(0, 120),
          });
        }

        if (allText.includes('undefined')) {
          feedbackWithUndef++;
          stats.findings.push({
            type: 'FEEDBACK_CONTAINS_UNDEFINED_LITERAL',
            category: ch.category,
            input: String(errInput),
            lang,
            snippet: allText.substring(0, 120),
          });
        }

        if (allText.includes('[object Object]')) {
          feedbackWithBrokenObject++;
          stats.findings.push({
            type: 'FEEDBACK_CONTAINS_OBJECT_STRING',
            category: ch.category,
            input: String(errInput),
            lang,
          });
        }

        if (ch.answerType === 'choice' && lang === 'bn') {
          if (ch.category === 'weather' && fb.step3_correctAnswer.includes('drain_no_fert')) {
            choiceRawEnumLeaked++;
            stats.findings.push({
              type: 'FEEDBACK_CHOICE_RAW_ENUM_LEAK',
              category: ch.category,
              step3: fb.step3_correctAnswer,
              lang,
            });
          }
        }
      } catch (err) {
        feedbackCrashes++;
        stats.findings.push({
          type: 'FEEDBACK_CRASH',
          category: ch.category,
          input: String(errInput),
          lang,
          error: err.message,
        });
      }
    }
  }
}

console.log(`Feedback instances tested: ${stats.feedbackFuzzCount}`);
console.log(`Feedback crashes: ${feedbackCrashes}`);
console.log(`Containing NaN: ${feedbackWithNan}`);
console.log(`Containing 'null': ${feedbackWithNull}`);
console.log(`Containing 'undefined': ${feedbackWithUndef}`);
console.log(`Containing '[object Object]': ${feedbackWithBrokenObject}`);
console.log(`Missing 5 steps: ${missing5StepsCount}`);
console.log(`Choice raw enum leaked: ${choiceRawEnumLeaked}\n`);

// -----------------------------------------------------------------------------
// TEST 5: ADVERSARIAL BOUNDARY FUZZING OF CORE CALCULATION ENGINES
// -----------------------------------------------------------------------------
console.log('>>> [5/5] Stress-testing Core Calculation Functions on Boundary Anomalies...');

const edgeValues = [
  -100, -1, 0, 0.0000001, 1, 999999, 1e12,
  NaN, Infinity, -Infinity, null, undefined, '', 'invalid',
];

for (const v of edgeValues) {
  stats.calcEdgeCount++;

  // 1. convertLandArea
  try {
    const res = convertLandArea(v, 'bigha', 'katha');
    if (typeof res !== 'number' || Number.isNaN(res)) {
      stats.findings.push({ type: 'CONVERT_LAND_NAN', value: v, res });
    }
  } catch (err) {
    stats.findings.push({ type: 'CONVERT_LAND_CRASH', value: v, error: err.message });
  }

  // 2. convertWeight
  try {
    const res = convertWeight(v, 'maund', 'kg');
    if (typeof res !== 'number' || Number.isNaN(res)) {
      stats.findings.push({ type: 'CONVERT_WEIGHT_NAN', value: v, res });
    }
  } catch (err) {
    stats.findings.push({ type: 'CONVERT_WEIGHT_CRASH', value: v, error: err.message });
  }

  // 3. calculateSeedNeeded
  try {
    const res = calculateSeedNeeded({ area: v, cropId: 'boro' });
    if (typeof res.seedKg !== 'number' || Number.isNaN(res.seedKg)) {
      stats.findings.push({ type: 'SEED_CALC_NAN', value: v, res });
    }
  } catch (err) {
    stats.findings.push({ type: 'SEED_CALC_CRASH', value: v, error: err.message });
  }

  // 4. calculateWaterRequirement
  try {
    const res = calculateWaterRequirement({ area: v, eto: v, rain: v });
    if (typeof res.volumeLiters !== 'number' || Number.isNaN(res.volumeLiters)) {
      stats.findings.push({ type: 'WATER_CALC_NAN', value: v, res });
    }
  } catch (err) {
    stats.findings.push({ type: 'WATER_CALC_CRASH', value: v, error: err.message });
  }

  // 5. calculatePumpRuntimeHours
  try {
    const res = calculatePumpRuntimeHours({ volumeLiters: v, pumpRateLph: v });
    if (typeof res !== 'number' || Number.isNaN(res)) {
      stats.findings.push({ type: 'PUMP_CALC_NAN', value: v, res });
    }
  } catch (err) {
    stats.findings.push({ type: 'PUMP_CALC_CRASH', value: v, error: err.message });
  }

  // 6. calculateFertilizerCost
  try {
    const res = calculateFertilizerCost({ ureaKg: v, tspKg: v });
    if (typeof res !== 'number' || Number.isNaN(res)) {
      stats.findings.push({ type: 'FERT_COST_NAN', value: v, res });
    }
  } catch (err) {
    stats.findings.push({ type: 'FERT_COST_CRASH', value: v, error: err.message });
  }

  // 7. calculateFarmBudget
  try {
    const res = calculateFarmBudget({ area: v, seedCost: v, fertCost: v });
    if (typeof res.netProfit !== 'number' || Number.isNaN(res.netProfit)) {
      stats.findings.push({ type: 'BUDGET_CALC_NAN', value: v, res });
    }
  } catch (err) {
    stats.findings.push({ type: 'BUDGET_CALC_CRASH', value: v, error: err.message });
  }

  // 8. evaluateNdviHealth
  try {
    const res = evaluateNdviHealth(v);
    if (!res || !res.band || !res.label) {
      stats.findings.push({ type: 'NDVI_EVAL_INVALID', value: v, res });
    }
  } catch (err) {
    stats.findings.push({ type: 'NDVI_EVAL_CRASH', value: v, error: err.message });
  }

  // 9. evaluateWeatherAction
  try {
    const res = evaluateWeatherAction({ forecastRainMm: v, forecastMaxTemp: v, forecastMinTemp: v });
    if (!res || !res.action || !res.hazardType) {
      stats.findings.push({ type: 'WEATHER_EVAL_INVALID', value: v, res });
    }
  } catch (err) {
    stats.findings.push({ type: 'WEATHER_EVAL_CRASH', value: v, error: err.message });
  }
}

console.log(`Core calculation boundary tests executed: ${stats.calcEdgeCount * 9}`);
console.log(`Calculation crashes: ${stats.findings.filter(f => f.type.endsWith('_CRASH')).length}`);
console.log(`Calculation NaN leaks: ${stats.findings.filter(f => f.type.endsWith('_NAN')).length}\n`);

// -----------------------------------------------------------------------------
// SUMMARY OF FINDINGS
// -----------------------------------------------------------------------------
console.log('================================================================');
console.log('FINAL ADVERSARIAL CHALLENGE FINDINGS MATRIX');
console.log('================================================================');

const grouped = {};
for (const f of stats.findings) {
  grouped[f.type] = (grouped[f.type] || 0) + 1;
}

for (const [type, count] of Object.entries(grouped)) {
  console.log(`- ${type}: ${count} occurrences`);
}

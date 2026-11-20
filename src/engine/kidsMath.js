/**
 * AgroVision Kids – Learn, Play & Grow (তারার স্বপ্ন-খামার / Tara's Dream Farm)
 * Pure Agricultural Mathematics & Calculation Engine
 *
 * Implements genuine Bangladesh agricultural formulas, BARI/BRRI seed rates,
 * FAO-56 crop water requirement, STW pump hydraulics, subsidized fertilizer schedules,
 * farm budgeting, NDVI satellite classification, and 5-step growth-mindset feedback.
 *
 * Zero DOM / React dependencies. Pure ES module tested via Node native test runner.
 */

import { bnDigits } from './dates.js';

const fmtEn = (v) => Number(v).toLocaleString('en-US');
const bnNum = (v) => bnDigits(fmtEn(v));

// ============================================================================
// 1. DOMAIN CONSTANTS & LOOKUP TABLES
// ============================================================================

export const SQFT_PER_M2 = 0.09290304;

export const KIDS_LAND_UNITS = {
  decimal: {
    id: 'decimal',
    name: { bn: 'শতক (ডেসিমল)', en: 'Decimal (shotok)' },
    symbol: { bn: 'শতক', en: 'dec' },
    toDecimals: 1,
    decimals: 1,
    kathas: 1 / 1.65,
    sqft: 435.6,
    m2: 40.468564,
  },
  katha: {
    id: 'katha',
    name: { bn: 'কাঠা', en: 'Katha' },
    symbol: { bn: 'কাঠা', en: 'katha' },
    toDecimals: 1.65, // 33 decimals / 20 kathas
    decimals: 1.65,
    kathas: 1,
    sqft: 720,
    m2: 66.890188,
  },
  bigha: {
    id: 'bigha',
    name: { bn: 'বিঘা', en: 'Bigha' },
    symbol: { bn: 'বিঘা', en: 'bigha' },
    toDecimals: 33, // 20 kathas * 1.65 = 33 decimals
    decimals: 33,
    kathas: 20,
    sqft: 14400,
    m2: 1337.803776, // 14400 * 0.09290304
  },
  acre: {
    id: 'acre',
    name: { bn: 'একর', en: 'Acre' },
    symbol: { bn: 'একর', en: 'acre' },
    toDecimals: 100,
    decimals: 100,
    kathas: 100 / 1.65,
    sqft: 43560,
    m2: 4046.8564224,
  },
  sqft: {
    id: 'sqft',
    name: { bn: 'বর্গফুট', en: 'Square feet' },
    symbol: { bn: 'বর্গফুট', en: 'sq ft' },
    toDecimals: 1 / 435.6,
    decimals: 1 / 435.6,
    kathas: 1 / 720,
    sqft: 1,
    m2: SQFT_PER_M2,
  },
  m2: {
    id: 'm2',
    name: { bn: 'বর্গমিটার', en: 'Square meters' },
    symbol: { bn: 'বর্গমি', en: 'm²' },
    toDecimals: 1 / 40.468564,
    decimals: 1 / 40.468564,
    kathas: 1 / 66.890188,
    sqft: 1 / SQFT_PER_M2,
    m2: 1,
  },
};

export const KIDS_WEIGHT_UNITS = {
  g: {
    id: 'g',
    name: { bn: 'গ্রাম', en: 'Gram' },
    toKg: 0.001,
  },
  kg: {
    id: 'kg',
    name: { bn: 'কেজি (কিলোগ্রাম)', en: 'Kilogram (kg)' },
    toKg: 1,
  },
  maund: {
    id: 'maund',
    name: { bn: 'মণ', en: 'Maund (mon)' },
    toKg: 37.32, // Traditional Bengal maund as in crops.js
    traditionalKg: 37.32,
    metricKg: 40,
  },
  quintal: {
    id: 'quintal',
    name: { bn: 'কুইন্টাল', en: 'Quintal' },
    toKg: 100,
  },
  ton: {
    id: 'ton',
    name: { bn: 'মেট্রিক টন', en: 'Metric Ton' },
    toKg: 1000,
  },
};

export const KIDS_FERTILIZERS = {
  urea: {
    id: 'urea',
    name: { bn: 'ইউরিয়া', en: 'Urea' },
    nutrient: { bn: 'নাইট্রোজেন (N)', en: 'Nitrogen (N)' },
    nutrientCode: 'N',
    color: '#f8fafc',
    pricePerKg: 27, // Ministry of Agriculture subsidized price
    subsidized: true,
    function: {
      bn: 'গাছ ঘন সবুজ করে এবং দ্রুত পাতা ও ডালপালা বাড়ায়।',
      en: 'Makes plants deep green and stimulates vegetative growth.',
    },
    applicationRule: {
      bn: 'একবারে না দিয়ে ২ থেকে ৩ কিস্তিতে (split) দিতে হয়। বৃষ্টির আগে ছিটানো নিষেধ।',
      en: 'Apply in 2 to 3 splits, never all at once. Never apply right before rain.',
    },
  },
  tsp: {
    id: 'tsp',
    name: { bn: 'টিএসপি', en: 'TSP (Triple Super Phosphate)' },
    nutrient: { bn: 'ফসফরাস (P)', en: 'Phosphorus (P)' },
    nutrientCode: 'P',
    color: '#94a3b8',
    pricePerKg: 27,
    subsidized: true,
    function: {
      bn: 'শিকড় শক্ত করে ও দ্রুত বিস্তার ঘটায়, ফুল ও ফল আসতে সাহায্য করে।',
      en: 'Strengthens roots and aids in flowering and grain development.',
    },
    applicationRule: {
      bn: 'জমি তৈরির শেষ চাষে (basal) সম্পূর্ণ প্রয়োগ করতে হয়।',
      en: 'Apply full dose as basal during final land preparation.',
    },
  },
  mop: {
    id: 'mop',
    name: { bn: 'এমওপি (পটাশ)', en: 'MoP (Muriate of Potash)' },
    nutrient: { bn: 'পটাশিয়াম (K)', en: 'Potassium (K)' },
    nutrientCode: 'K',
    color: '#f87171',
    pricePerKg: 20,
    subsidized: true,
    function: {
      bn: 'রোগবালাই ও খরা প্রতিরোধ ক্ষমতা বাড়ায় এবং দানা পুষ্ট করে।',
      en: 'Boosts resistance against diseases and drought, making grains plump.',
    },
    applicationRule: {
      bn: 'জমি তৈরির সময় বা ইউরিয়ার কিস্তির সাথে প্রয়োগ করা হয়।',
      en: 'Apply during land preparation or split with top-dressing.',
    },
  },
  dap: {
    id: 'dap',
    name: { bn: 'ডিএপি', en: 'DAP (Di-ammonium Phosphate)' },
    nutrient: { bn: 'নাইট্রোজেন ও ফসফরাস (N+P)', en: 'Nitrogen & Phosphorus (N+P)' },
    nutrientCode: 'NP',
    color: '#64748b',
    pricePerKg: 21,
    subsidized: true,
    function: {
      bn: 'একই সাথে শিকড় বৃদ্ধি এবং প্রাথমিক বৃদ্ধির খাদ্য যোগায়।',
      en: 'Supplies both root-developing phosphorus and starter nitrogen.',
    },
    applicationRule: {
      bn: 'ডিএপি দিলে ইউরিয়া ও টিএসপির পরিমাণ কিছুটা কমিয়ে দিতে হয়।',
      en: 'When DAP is used, reduced amounts of Urea and TSP are needed.',
    },
  },
};

export const KIDS_CROPS = {
  boro: {
    id: 'boro',
    name: { bn: 'বোরো ধান', en: 'Boro rice' },
    category: 'cereal',
    season: 'rabi',
    seasonName: { bn: 'রবি মৌসুম (শীতকাল)', en: 'Rabi season (Winter)' },
    seedRateKgPerBigha: 5,
    seedRate: {
      kgPerBigha: 5,
      kgPerDecimal: 0.1515,
      gramsPerDecimal: 152,
      note: { bn: 'বীজতলায় ৫ কেজি বীজ বপন করলে ১ বিঘার চারা হয়', en: '5 kg seeds in nursery yields seedlings for 1 bigha' },
    },
    fertilizerKgPerBigha: { urea: 36, tsp: 15, mop: 18, dap: 18 },
    water: {
      kc: { initial: 1.05, development: 1.12, mid: 1.20, late: 0.75 },
      typicalEto: 4.0,
      puddleMm: 200,
      typicalTotalWaterMm: 1100,
    },
    fertilizer: {
      ureaKgPerBigha: 36,
      tspKgPerBigha: 15,
      mopKgPerBigha: 18,
      dapKgPerBigha: 18,
      ureaSplits: 3,
      splitDescription: {
        bn: 'ইউরিয়া ৩ কিস্তিতে: চারা রোপণের ১৫ দিন পর, ৩০ দিন পর এবং ফুল আসার আগে।',
        en: 'Urea in 3 splits: 15 days after transplanting, 30 days, and panicle initiation.',
      },
      isLegume: false,
    },
    yield: {
      kgPerBigha: 700,
      maundsPerBigha: 17.5,
      typicalPriceTkPerKg: 36,
      typicalPriceTkPerMaund: 1440,
      typicalCostTkPerKg: 31.6,
      typicalProductionCostTkPerBigha: 22000,
    },
    taraTip: {
      bn: 'বোরো ধানে প্রচুর সেচের পানি লাগে। এডব্লিউডি (AWD) পাইপ ব্যবহার করলে ২৫% পানি ও ডিজেল খরচ বাঁচে!',
      en: 'Boro rice needs lots of water. Using AWD pipes saves up to 25% water and diesel costs!',
    },
  },

  aman: {
    id: 'aman',
    name: { bn: 'রোপা আমন ধান', en: 'T. Aman rice' },
    category: 'cereal',
    season: 'kharif2',
    seasonName: { bn: 'খরিপ-২ মৌসুম (বর্ষাকাল)', en: 'Kharif-2 season (Monsoon)' },
    seedRateKgPerBigha: 5,
    seedRate: {
      kgPerBigha: 5,
      kgPerDecimal: 0.1515,
      gramsPerDecimal: 152,
      note: { bn: '১ বিঘার জন্য বীজতলায় ৫ কেজি বীজ প্রয়োজন', en: '5 kg seed in seedbed for 1 bigha field' },
    },
    fertilizerKgPerBigha: { urea: 26, tsp: 12, mop: 14, dap: 14 },
    water: {
      kc: { initial: 1.05, development: 1.10, mid: 1.15, late: 0.75 },
      typicalEto: 4.2,
      puddleMm: 150,
      typicalTotalWaterMm: 800,
    },
    fertilizer: {
      ureaKgPerBigha: 26,
      tspKgPerBigha: 12,
      mopKgPerBigha: 14,
      dapKgPerBigha: 14,
      ureaSplits: 3,
      splitDescription: {
        bn: 'ইউরিয়া ৩ কিস্তিতে প্রয়োগ করুন।',
        en: 'Apply Urea in 3 equal splits.',
      },
      isLegume: false,
    },
    yield: {
      kgPerBigha: 550,
      maundsPerBigha: 13.75,
      typicalPriceTkPerKg: 34,
      typicalPriceTkPerMaund: 1360,
      typicalCostTkPerKg: 28.0,
      typicalProductionCostTkPerBigha: 15400,
    },
    taraTip: {
      bn: 'আমন ধানে বর্ষার বৃষ্টি কাজে লাগানো যায়, তাই সেচের খরচ অনেক কম হয়!',
      en: 'Aman rice relies on monsoon rains, dramatically cutting irrigation expenses!',
    },
  },

  wheat: {
    id: 'wheat',
    name: { bn: 'গম', en: 'Wheat' },
    category: 'cereal',
    season: 'rabi',
    seasonName: { bn: 'রবি মৌসুম (শীতকাল)', en: 'Rabi season (Winter)' },
    seedRateKgPerBigha: 16,
    seedRate: {
      kgPerBigha: 16,
      kgPerDecimal: 0.4848,
      gramsPerDecimal: 485,
      note: { bn: '১ বিঘা জমিতে ১৬ কেজি গমের বীজ লাগে', en: '16 kg wheat seed needed per bigha' },
    },
    fertilizerKgPerBigha: { urea: 30, tsp: 18, mop: 14, dap: 20 },
    water: {
      kc: { initial: 0.30, development: 0.72, mid: 1.15, late: 0.33 },
      typicalEto: 3.5,
      puddleMm: 0,
      typicalTotalWaterMm: 280,
    },
    fertilizer: {
      ureaKgPerBigha: 30,
      tspKgPerBigha: 18,
      mopKgPerBigha: 14,
      dapKgPerBigha: 20,
      ureaSplits: 2,
      splitDescription: {
        bn: 'ইউরিয়া ২ কিস্তিতে: দুই-তৃতীয়াংশ জমি তৈরিতে এবং এক-তৃতীয়াংশ প্রথম সেচের সময় (২০ দিনে)।',
        en: 'Urea in 2 splits: 2/3 at land prep and 1/3 at first irrigation (20 days).',
      },
      isLegume: false,
    },
    yield: {
      kgPerBigha: 500,
      maundsPerBigha: 12.5,
      typicalPriceTkPerKg: 36,
      typicalPriceTkPerMaund: 1440,
      typicalCostTkPerKg: 27.0,
      typicalProductionCostTkPerBigha: 13500,
    },
    taraTip: {
      bn: 'গমের শিকড় গজানোর সময় (রোপণের ১৭–২১ দিনে) প্রথম হালকা সেচ দেওয়া খুবই গুরুত্বপূর্ণ!',
      en: 'The first light irrigation at crown root initiation (17–21 days) is critical for wheat!',
    },
  },

  maize: {
    id: 'maize',
    name: { bn: 'ভুট্টা', en: 'Maize' },
    category: 'cereal',
    season: 'rabi',
    seasonName: { bn: 'রবি মৌসুম (শীতকাল)', en: 'Rabi season (Winter)' },
    seedRateKgPerBigha: 3,
    seedRate: {
      kgPerBigha: 3,
      kgPerDecimal: 0.0909,
      gramsPerDecimal: 91,
      note: { bn: 'হাইব্রিড ভুট্টার বীজ বিঘায় ৩ কেজি লাগে', en: 'Hybrid maize needs 3 kg seed per bigha' },
    },
    fertilizerKgPerBigha: { urea: 45, tsp: 25, mop: 20, dap: 25 },
    water: {
      kc: { initial: 0.30, development: 0.75, mid: 1.20, late: 0.35 },
      typicalEto: 3.8,
      puddleMm: 0,
      typicalTotalWaterMm: 450,
    },
    fertilizer: {
      ureaKgPerBigha: 45,
      tspKgPerBigha: 25,
      mopKgPerBigha: 20,
      dapKgPerBigha: 25,
      ureaSplits: 3,
      splitDescription: {
        bn: 'ইউরিয়া ৩ কিস্তিতে: এক-তৃতীয়াংশ জমিতে, এক-তৃতীয়াংশ হাঁটু সমান উচ্চতায় এবং এক-তৃতীয়াংশ মোচা আসার আগে।',
        en: 'Urea in 3 splits: 1/3 basal, 1/3 at knee-high, and 1/3 before tasseling.',
      },
      isLegume: false,
    },
    yield: {
      kgPerBigha: 900,
      maundsPerBigha: 22.5,
      typicalPriceTkPerKg: 28,
      typicalPriceTkPerMaund: 1120,
      typicalCostTkPerKg: 18.0,
      typicalProductionCostTkPerBigha: 16200,
    },
    taraTip: {
      bn: 'ভুট্টা পুষ্টিকর ও লাভজনক ফসল, পোল্ট্রি ও মাছের খাবারের জন্য বাজারে এর প্রচুর চাহিদা রয়েছে!',
      en: 'Maize is highly profitable with strong market demand for poultry and fish feed!',
    },
  },

  potato: {
    id: 'potato',
    name: { bn: 'গোল আলু', en: 'Potato' },
    category: 'tuber',
    season: 'rabi',
    seasonName: { bn: 'রবি মৌসুম (শীতকাল)', en: 'Rabi season (Winter)' },
    seedRateKgPerBigha: 250,
    seedRate: {
      kgPerBigha: 250,
      kgPerDecimal: 7.575,
      gramsPerDecimal: 7575,
      note: { bn: '১ বিঘায় ২৫০ কেজি বীজ আলু প্রয়োজন হয়', en: '250 kg seed tubers needed per bigha' },
    },
    fertilizerKgPerBigha: { urea: 40, tsp: 28, mop: 30, dap: 30 },
    water: {
      kc: { initial: 0.50, development: 0.82, mid: 1.15, late: 0.75 },
      typicalEto: 3.2,
      puddleMm: 0,
      typicalTotalWaterMm: 350,
    },
    fertilizer: {
      ureaKgPerBigha: 40,
      tspKgPerBigha: 28,
      mopKgPerBigha: 30,
      dapKgPerBigha: 30,
      ureaSplits: 2,
      splitDescription: {
        bn: 'ইউরিয়া ২ কিস্তিতে: অর্ধেক জমি তৈরিতে এবং অর্ধেক ৩০-৩৫ দিনে মাটি তোলার সময়।',
        en: 'Urea in 2 splits: half at land prep and half during earthing up at 30-35 days.',
      },
      isLegume: false,
    },
    yield: {
      kgPerBigha: 2500,
      maundsPerBigha: 62.5,
      typicalPriceTkPerKg: 22,
      typicalPriceTkPerMaund: 880,
      typicalCostTkPerKg: 10.0,
      typicalProductionCostTkPerBigha: 24000,
    },
    taraTip: {
      bn: 'আলু গাছে মাটি তুলে দিলে আলু রোদে সবুজ হয় না এবং বেশি ফলন হয়!',
      en: 'Earthing up prevents potatoes from turning green in the sun and increases yield!',
    },
  },

  mustard: {
    id: 'mustard',
    name: { bn: 'সরিষা', en: 'Mustard' },
    category: 'oilseed',
    season: 'rabi',
    seasonName: { bn: 'রবি মৌসুম (স্বল্পমেয়াদী)', en: 'Rabi season (Short-duration)' },
    seedRateKgPerBigha: 1.2,
    seedRate: {
      kgPerBigha: 1.2,
      kgPerDecimal: 0.0364,
      gramsPerDecimal: 36,
      note: { bn: 'বিঘায় ১.২ কেজি (শতকে ৩৬ গ্রাম) সরিষার বীজ লাগে', en: '1.2 kg per bigha (36 grams per decimal) seed needed' },
    },
    fertilizerKgPerBigha: { urea: 30, tsp: 20, mop: 12, dap: 20 },
    water: {
      kc: { initial: 0.35, development: 0.71, mid: 1.05, late: 0.35 },
      typicalEto: 3.4,
      puddleMm: 0,
      typicalTotalWaterMm: 180,
    },
    fertilizer: {
      ureaKgPerBigha: 30,
      tspKgPerBigha: 20,
      mopKgPerBigha: 12,
      dapKgPerBigha: 20,
      ureaSplits: 2,
      splitDescription: {
        bn: 'ইউরিয়া ২ কিস্তিতে: অর্ধেক শেষ চাষে এবং অর্ধেক ফুল আসার আগে।',
        en: 'Urea in 2 splits: half at final ploughing and half before flowering.',
      },
      isLegume: false,
    },
    yield: {
      kgPerBigha: 180,
      maundsPerBigha: 4.5,
      typicalPriceTkPerKg: 75,
      typicalPriceTkPerMaund: 3000,
      typicalCostTkPerKg: 40.0,
      typicalProductionCostTkPerBigha: 7200,
    },
    taraTip: {
      bn: 'সরিষা মাত্র ৭৫–৮৫ দিনে পাকে, আমন ও বোরোর মাঝের জমিতে সরিষা চাষ করলে বাড়তি লাভ হয়!',
      en: 'Mustard matures in just 75-85 days, perfect for the catch-crop window between Aman and Boro!',
    },
  },

  lentil: {
    id: 'lentil',
    name: { bn: 'মসুর ডাল', en: 'Lentil' },
    category: 'pulse',
    season: 'rabi',
    seasonName: { bn: 'রবি মৌসুম (শীতকাল)', en: 'Rabi season (Winter)' },
    seedRateKgPerBigha: 4.5,
    seedRate: {
      kgPerBigha: 4.5,
      kgPerDecimal: 0.1364,
      gramsPerDecimal: 136,
      note: { bn: '১ বিঘা জমিতে ৪.৫ কেজি মসুর বীজ প্রয়োজন', en: '4.5 kg lentil seed needed per bigha' },
    },
    fertilizerKgPerBigha: { urea: 5, tsp: 15, mop: 8, dap: 12 },
    water: {
      kc: { initial: 0.40, development: 0.75, mid: 1.05, late: 0.30 },
      typicalEto: 3.5,
      puddleMm: 0,
      typicalTotalWaterMm: 150,
    },
    fertilizer: {
      ureaKgPerBigha: 5, // starter nitrogen only!
      tspKgPerBigha: 15,
      mopKgPerBigha: 8,
      dapKgPerBigha: 12,
      ureaSplits: 1,
      splitDescription: {
        bn: 'ডাল ফসলের শিকড়ে রাইজোবিয়াম ব্যাকটেরিয়া বাতাস থেকে নাইট্রোজেন নেয়, তাই মাত্র ৫ কেজি ইউরিয়াই যথেষ্ট!',
        en: 'Lentil roots fix nitrogen naturally, so only 5 kg starter Urea is needed!',
      },
      isLegume: true,
    },
    yield: {
      kgPerBigha: 200,
      maundsPerBigha: 5,
      typicalPriceTkPerKg: 85,
      typicalPriceTkPerMaund: 3400,
      typicalCostTkPerKg: 41.0,
      typicalProductionCostTkPerBigha: 8200,
    },
    taraTip: {
      bn: 'ডাল ফসলের শিকড়ের ছোট ছোট গুটি মাটির উর্বরতা বাড়ায় এবং পরবর্তী ফসলের সারের খরচ কমায়!',
      en: 'Lentil root nodules naturally enrich the soil with nitrogen, cutting fertilizer costs for the next crop!',
    },
  },

  mungbean: {
    id: 'mungbean',
    name: { bn: 'মুগ ডাল', en: 'Mungbean' },
    category: 'pulse',
    season: 'kharif1',
    seasonName: { bn: 'খরিপ-১ মৌসুম (বসন্ত-গ্রীষ্ম)', en: 'Kharif-1 season (Spring-Summer)' },
    seedRateKgPerBigha: 4.0,
    seedRate: {
      kgPerBigha: 4.0,
      kgPerDecimal: 0.1212,
      gramsPerDecimal: 121,
      note: { bn: 'বিঘায় ৪ কেজি বীজ ছিটিয়ে বা সারিতে বোনা যায়', en: '4 kg seed per bigha broadcast or in rows' },
    },
    fertilizerKgPerBigha: { urea: 5, tsp: 15, mop: 8, dap: 12 },
    water: {
      kc: { initial: 0.40, development: 0.72, mid: 1.00, late: 0.35 },
      typicalEto: 4.5,
      puddleMm: 0,
      typicalTotalWaterMm: 180,
    },
    fertilizer: {
      ureaKgPerBigha: 5,
      tspKgPerBigha: 15,
      mopKgPerBigha: 8,
      dapKgPerBigha: 12,
      ureaSplits: 1,
      splitDescription: {
        bn: 'শিকড়ে নাইট্রোজেন সংবন্ধন হয় বলে শুধু প্রারম্ভিক ৫ কেজি ইউরিয়া শেষ চাষে দেওয়া হয়।',
        en: 'Natural nitrogen fixation means only 5 kg starter Urea at land preparation.',
      },
      isLegume: true,
    },
    yield: {
      kgPerBigha: 180,
      maundsPerBigha: 4.5,
      typicalPriceTkPerKg: 90,
      typicalPriceTkPerMaund: 3600,
      typicalCostTkPerKg: 42.0,
      typicalProductionCostTkPerBigha: 6720,
    },
    taraTip: {
      bn: 'মুগ ডাল তোলার পর গাছের অবশিষ্টাংশ সবুজ সার হিসেবে মাটিতে চাষ দিয়ে মিশিয়ে দিলে মাটির স্বাস্থ্য দারুণ বাড়ে!',
      en: 'Ploughing mungbean crop residues back into the soil serves as wonderful organic green manure!',
    },
  },
};

export const KIDS_NDVI_BANDS = [
  {
    id: 'water',
    bandId: 'bare',
    min: -1.0,
    max: 0.1,
    label: { bn: 'পানি বা প্লাবিত জমি', en: 'Water or flooded land' },
    status: { bn: 'পানির নিচে (হাওর বা জলাশয়)', en: 'Submerged (haor or wetland)' },
    description: { bn: 'ফসল নেই বা পানি জমে আছে', en: 'Standing water or submerged land' },
    color: '#3b82f6',
    isHealthy: false,
    action: {
      bn: 'জমি থেকে অতিরিক্ত পানি নিষ্কাশন করতে হবে অথবা মাছ ও হাঁস চাষের পরিকল্পনা করা যায়।',
      en: 'Drain excess water from the plot or prepare for fish and duck farming.',
    },
    taraTip: {
      bn: 'পানি সূর্যালোকের লাল ও অবলোহিত (ইনফ্রারেড) আলো শোষণ করে নেয়, তাই উপগ্রহের চোখে এনডিভিআই মান ঋণাত্মক বা খুব কম দেখায়!',
      en: 'Water absorbs red and infrared sunlight, making NDVI negative or very low from Tara’s satellite view!',
    },
  },
  {
    id: 'bare_soil',
    bandId: 'bare',
    min: 0.1,
    max: 0.25,
    label: { bn: 'পতিত বা অনাবাদী মাটি', en: 'Bare or uncultivated soil' },
    status: { bn: 'ফসলহীন শুকনো মাটি', en: 'Bare soil (no crop)' },
    description: { bn: 'অনাবাদী বা ফসলহীন মাটি', en: 'Bare uncultivated ground' },
    color: '#b45309',
    isHealthy: false,
    action: {
      bn: 'জমি চাষ দিয়ে বীজ বোনা বা চারা রোপণের প্রস্তুতি নিন। মাটির আর্দ্রতা ধরে রাখতে খড় দিয়ে মালচিং করুন।',
      en: 'Plough the soil and prepare for seeding or transplanting. Mulch with straw to retain moisture.',
    },
    taraTip: {
      bn: 'খালি মাটিতে কোনো সবুজ পাতা নেই। বৃষ্টি হলে মূল্যবান ওপরের মাটি ধুয়ে যায়, তাই দ্রুত মুগ ডালের মতো সবুজ কম্বল বিছিয়ে দিন!',
      en: 'Bare soil has no green leaves. Rain washes topsoil away, so plant a green blanket of mung beans quickly!',
    },
  },
  {
    id: 'stressed',
    bandId: 'stressed',
    min: 0.25,
    max: 0.45,
    label: { bn: 'অসুস্থ বা দুর্বল ফসল', en: 'Stressed or sparse crop' },
    status: { bn: 'পুষ্টিহীনতা বা পানির অভাব', en: 'Nutrient deficit or drought stress' },
    description: { bn: 'পানি বা পুষ্টি ঘাটতি', en: 'Moisture or nutrient deficit' },
    color: '#eab308',
    isHealthy: false,
    action: {
      bn: 'মাঠে গিয়ে দেখুন খরা নাকি পোকার আক্রমণ। পরিমিত সেচ দিন অথবা কৃষি কর্মকর্তার পরামর্শ নিন।',
      en: 'Inspect the field for drought or pests. Irrigate moderately or consult an agriculture officer.',
    },
    taraTip: {
      bn: 'গাছের পাতা হলুদ হলে বা পাতা ঝরে গেলে তারা উপগ্রহে কম ইনফ্রারেড আলো প্রতিফলিত হয়—এটাই বিপদের সংকেত!',
      en: 'When crop leaves turn yellow or drop, less infrared light bounces back to Tara—that is our distress signal!',
    },
  },
  {
    id: 'moderate',
    bandId: 'moderate',
    min: 0.45,
    max: 0.65,
    label: { bn: 'মাঝারি বাড়ন্ত ফসল', en: 'Moderate healthy growth' },
    status: { bn: 'স্বাভাবিক বৃদ্ধি', en: 'Normal vegetative growth' },
    description: { bn: 'স্বাভাবিক বৃদ্ধি ও হালকা চাপ', en: 'Normal growth and nutrition' },
    color: '#84cc16',
    isHealthy: true,
    action: {
      bn: 'ফসল স্বাভাবিকভাবে বাড়ছে। নির্ধারিত সময়ে পরবর্তী কিস্তির ইউরিয়া প্রয়োগ ও আগাছা দমন করুন।',
      en: 'Crop is growing normally. Apply the next scheduled fertilizer split and weed on time.',
    },
    taraTip: {
      bn: 'গাছগুলো বেশ সুন্দর সবুজ হয়ে উঠছে এবং সালোকসংশ্লেষণ দ্রুত গতিতে চলছে!',
      en: 'Plants are turning nicely green and actively photosynthesizing under the sun!',
    },
  },
  {
    id: 'dense',
    bandId: 'excellent',
    min: 0.65,
    max: 1.0,
    label: { bn: 'ঘন সবুজ সতেজ ফসল', en: 'Dense vigorous crop' },
    status: { bn: 'চমৎকার স্বাস্থ্য ও উচ্চ ফলনের সম্ভাবনা', en: 'Excellent health and high yield potential' },
    description: { bn: 'ঘন সবুজ ও পুষ্ট ফসল', en: 'Dense, vigorous vegetation' },
    color: '#15803d',
    isHealthy: true,
    action: {
      bn: 'ফসল চমৎকার অবস্থায় আছে! জমিতে রোগবালাই নজরদারি বজায় রাখুন এবং পাকা পর্যন্ত যত্ন নিন।',
      en: 'Crops look wonderful! Monitor for pests and maintain soil moisture until harvest.',
    },
    taraTip: {
      bn: 'ঘন সবুজ পাতার ক্লোরোফিল উপচে পড়ছে এবং মহাকাশে প্রচুর ইনফ্রারেড আলো ছড়াচ্ছে—এটি বাম্পার ফলনের লক্ষণ!',
      en: 'Dense chlorophyll bounces huge infrared light into space—the unmistakable signature of a bumper harvest!',
    },
  },
];

export const KIDS_WEATHER_RULES = {
  HEAVY_RAIN: {
    id: 'heavy_rain',
    ruleId: 'HEAVY_RAIN',
    thresholdMm: 44,
    veryHeavyThresholdMm: 89,
    rule: {
      bn: 'আবহাওয়া অধিদপ্তরের নিয়ম: ২৪ ঘণ্টায় ৪৪ মিমি বা বেশি বৃষ্টি হলে ভারী বৃষ্টি।',
      en: 'BMD rule: 44 mm or more rainfall in 24 hours is heavy rain.',
    },
    action: {
      bn: 'জমির নালা খুলে রাখুন যাতে পানি না জমে, বৃষ্টির আগে কোনোভাবেই ইউরিয়া সার বা কীটনাশক ছিটাবেন না!',
      en: 'Open field drainage trenches to prevent waterlogging; never spray pesticide or spread urea before downpours!',
    },
    taraTip: {
      bn: 'ভারী বৃষ্টিতে সার ছিটানো হলে বৃষ্টির পানি দামি সার ধুয়ে খালে নিয়ে যাবে—মাটির গাছ খাবে কী?',
      en: 'Heavy rain washes expensive fertilizer into canals before roots can absorb it—pure waste!',
    },
  },
  HEATWAVE: {
    id: 'heatwave',
    ruleId: 'HEATWAVE',
    thresholdTempC: 36,
    severeThresholdTempC: 40,
    rule: {
      bn: 'আবহাওয়া অধিদপ্তরের নিয়ম: তাপমাত্রা ৩৬ ডিগ্রি সেলসিয়াস বা বেশি হলে তাপপ্রবাহ।',
      en: 'BMD rule: Temperatures of 36°C or higher constitute a heatwave.',
    },
    action: {
      bn: 'সকালে বা বিকেলে সেচ দিন। ধানের জমিতে ২-৩ সেমি পানি ধরে রাখুন যাতে মাটির শিকড় ঠান্ডা থাকে।',
      en: 'Irrigate in early morning or evening. Keep 2–3 cm standing water on paddy fields to cool the roots.',
    },
    taraTip: {
      bn: 'দুপুরের চড়া রোদে পানি দিলে বাষ্পীভবনে পানি দ্রুত উড়ে যায় এবং গরম পানি ফসলের ক্ষতি করতে পারে!',
      en: 'Irrigating under scorching midday sun causes rapid evaporation and scalding water stresses roots!',
    },
  },
  COLD_WAVE: {
    id: 'cold_wave',
    ruleId: 'COLD_WAVE',
    thresholdTempC: 10,
    severeThresholdTempC: 6,
    rule: {
      bn: 'আবহাওয়া অধিদপ্তরের নিয়ম: তাপমাত্রা ১০ ডিগ্রি সেলসিয়াস বা তার নিচে নামলে শৈত্যপ্রবাহ।',
      en: 'BMD rule: Temperatures of 10°C or below constitute a cold wave.',
    },
    action: {
      bn: 'বোরো বীজতলা রাতে স্বচ্ছ পলিথিন দিয়ে ঢেকে রাখুন এবং সকালে তুলে ফেলুন। বীজতলায় হালকা সেচ ধরে রাখুন।',
      en: 'Cover young Boro nursery beds with clear polythene sheets at night and uncover in the morning; apply gentle irrigation.',
    },
    taraTip: {
      bn: 'তীব্র ঠান্ডায় ধানের কচি চারা হলুদ হয়ে বাড়ে না (কোল্ড ইনজুরি)। স্বচ্ছ পলিথিন গ্রিনহাউসের মতো ওম দেয়!',
      en: 'Severe chill stunts young rice seedlings (cold injury). Transparent polythene acts like a protective mini-greenhouse!',
    },
  },
  NORMAL: {
    id: 'normal',
    ruleId: 'NORMAL',
    rule: {
      bn: 'আবহাওয়া শান্ত ও অনুকূল।',
      en: 'Weather is calm and favorable.',
    },
    action: {
      bn: 'মাঠে নিয়মিত পরিচর্যা, আগাছা পরিষ্কার এবং সুষম সার প্রয়োগের জন্য চমৎকার দিন!',
      en: 'A wonderful day for routine weeding, intercultural operations, and scheduled fertilizer application!',
    },
    taraTip: {
      bn: 'অনুকূল আবহাওয়ায় পরিকল্পনা অনুযায়ী কাজ করলে ফসলের ফলন বাড়ে!',
      en: 'Steady work in good weather keeps crops healthy and promises great yields!',
    },
  },
};

export const DIFFICULTY_TIERS = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

export const DIFFICULTY_CONFIG = {
  beginner: {
    id: 'beginner',
    targetAges: '8–9',
    label: { bn: 'নতুন কৃষক (সহজ)', en: 'Novice Farmer (Beginner)' },
    description: {
      bn: '১-ধাপের সহজ গুণ, যোগ ও বিয়োগ। বিঘা এবং পূর্ণ সংখ্যা।',
      en: 'Single-step arithmetic. Bighas and clean round integers.',
    },
    landUnits: ['bigha'],
    areaRange: [1, 5],
    stepCount: 1,
    tolerance: 0,
    allowDecimals: false,
  },
  intermediate: {
    id: 'intermediate',
    targetAges: '10–11',
    label: { bn: 'অভিজ্ঞ কিষাণ (মাঝারি)', en: 'Skilled Farmer (Intermediate)' },
    description: {
      bn: '২-ধাপের হিসাব। কাঠা ও শতকের রূপান্তর, সারের কিস্তি (১/৩ ভাগ) এবং লাভ-লোকসান।',
      en: 'Two-step arithmetic. Katha/Decimal conversions, fertilizer 3-split, and profit/loss.',
    },
    landUnits: ['bigha', 'katha', 'decimal'],
    areaRange: [2, 10],
    stepCount: 2,
    tolerance: 0,
    allowDecimals: false,
  },
  advanced: {
    id: 'advanced',
    targetAges: '12–14',
    label: { bn: 'স্মার্ট কৃষিবিজ্ঞানী (কঠিন)', en: 'Smart Agronomist (Advanced)' },
    description: {
      bn: 'বহু-ধাপের বিজ্ঞান ও গণিত। বাষ্পীভবন (ETc), পাম্প চলার ঘণ্টা, শতক-বিঘা রূপান্তর এবং মুনাফার হার (ROI%)।',
      en: 'Multi-step STEM equations. Evapotranspiration (ETc), pump runtime, and ROI%.',
    },
    landUnits: ['bigha', 'decimal', 'katha'],
    areaRange: [10, 66],
    stepCount: 3,
    tolerance: 0.1,
    allowDecimals: true,
  },
};

// ============================================================================
// 2. UNIT CONVERSIONS (F01)
// ============================================================================

function normalizeLandUnit(u) {
  if (!u) return null;
  const s = String(u).trim().toLowerCase();
  if (['bigha', 'bighas', 'বিঘা'].includes(s)) return 'bigha';
  if (['katha', 'kathas', 'কাঠা'].includes(s)) return 'katha';
  if (['decimal', 'decimals', 'shotok', 'শতক', 'ডেসিমল', 'শতাংশ', 'dec'].includes(s)) return 'decimal';
  if (['acre', 'acres', 'একর'].includes(s)) return 'acre';
  if (['sqft', 'sq_ft', 'sq-ft', 'square_feet', 'square feet', 'বর্গফুট'].includes(s)) return 'sqft';
  if (['m2', 'sqm', 'sq_m', 'square_meter', 'square meters', 'বর্গমিটার', 'বর্গমি'].includes(s)) return 'm2';
  return null;
}

function normalizeWeightUnit(u) {
  if (!u) return null;
  const s = String(u).trim().toLowerCase();
  if (['kg', 'kilogram', 'kilograms', 'কেজি', 'কেজি (কিলোগ্রাম)'].includes(s)) return 'kg';
  if (['g', 'gram', 'grams', 'গ্রাম'].includes(s)) return 'g';
  if (['maund', 'maunds', 'mon', 'মণ'].includes(s)) return 'maund';
  if (['metric_maund'].includes(s)) return 'metric_maund';
  if (['quintal', 'quintals', 'কুইন্টাল'].includes(s)) return 'quintal';
  if (['ton', 'tons', 'metric ton', 'মেট্রিক টন'].includes(s)) return 'ton';
  return null;
}

/**
 * Bidirectional conversion between Bangladesh land units.
 * Supports: 'bigha', 'katha', 'decimal' (shotok), 'acre', 'sqft', 'm2'.
 */
export function convertLandArea(val, fromUnit, toUnit, options = {}) {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return 0;

  const from = normalizeLandUnit(fromUnit);
  const to = normalizeLandUnit(toUnit);
  if (!from || !to) return num;
  if (from === to) return num;

  // Direct clean standard pairs
  if (from === 'bigha' && to === 'katha') return num * 20;
  if (from === 'katha' && to === 'bigha') return num / 20;
  if (from === 'bigha' && to === 'decimal') return num * 33;
  if (from === 'decimal' && to === 'bigha') return num / 33;
  if (from === 'katha' && to === 'decimal') return num * 1.65;
  if (from === 'decimal' && to === 'katha') return num / 1.65;
  if (from === 'katha' && to === 'sqft') return num * 720;
  if (from === 'bigha' && to === 'sqft') return num * 14400;

  // Pivot to m²
  const fromM2 = KIDS_LAND_UNITS[from].m2;
  const toM2 = KIDS_LAND_UNITS[to].m2;
  const inM2 = num * fromM2;
  const result = inM2 / toM2;

  const precision = options.precision;
  if (precision != null) {
    const factor = Math.pow(10, precision);
    return Math.round(result * factor) / factor;
  }
  return result;
}

/**
 * Bidirectional conversion between agricultural weight units.
 * Supports: 'g', 'kg', 'maund' (37.32 kg traditional / 40 kg metric), 'quintal', 'ton'.
 */
export function convertWeight(val, fromUnit, toUnit, options = {}) {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return 0;

  const from = normalizeWeightUnit(fromUnit);
  const to = normalizeWeightUnit(toUnit);
  if (!from || !to) return num;
  if (from === to) return num;

  const maundKg = options.metricMaund === true ? 40 : 37.32;

  // Pivot to Kg
  let inKg = num;
  if (from === 'kg') inKg = num;
  else if (from === 'g') inKg = num / 1000;
  else if (from === 'maund') inKg = num * maundKg;
  else if (from === 'metric_maund') inKg = num * 40;
  else if (from === 'quintal') inKg = num * 100;
  else if (from === 'ton') inKg = num * 1000;
  else return num;

  // Convert Kg to Target
  let result = inKg;
  if (to === 'kg') result = inKg;
  else if (to === 'g') result = inKg * 1000;
  else if (to === 'maund') result = inKg / maundKg;
  else if (to === 'metric_maund') result = inKg / 40;
  else if (to === 'quintal') result = inKg / 100;
  else if (to === 'ton') result = inKg / 1000;
  else return num;

  const precision = options.precision;
  if (precision != null) {
    const factor = Math.pow(10, precision);
    return Math.round(result * factor) / factor;
  }
  return result;
}

// ============================================================================
// 3. AGRICULTURAL CALCULATIONS (F02–F05)
// ============================================================================

/**
 * Calculates seed required for a given crop and land area.
 */
export function calculateSeedNeeded({ cropId, area = 1, unit = 'bigha', tier = 'beginner' } = {}) {
  const crop = KIDS_CROPS[cropId] ?? KIDS_CROPS.boro;
  const numArea = Number(area);
  const areaVal = Number.isFinite(numArea) && numArea > 0 ? numArea : 0;
  if (areaVal === 0) {
    return {
      cropId: crop.id,
      cropName: crop.name,
      area: 0,
      unit: unit || 'bigha',
      areaInBighas: 0,
      areaInDecimals: 0,
      ratePerBighaKg: crop.seedRate.kgPerBigha,
      ratePerUnit: crop.seedRate.kgPerBigha,
      unitOfSeed: 'kg',
      seedKg: 0,
      seedGrams: 0,
      formula: '',
      formulaBn: '',
      formulaStr: '',
      steps: [],
      stepByStep: {},
      taraTip: crop.taraTip,
    };
  }

  const normalizedUnit = normalizeLandUnit(unit) || 'bigha';
  const areaInBighas = convertLandArea(areaVal, normalizedUnit, 'bigha');
  const ratePerBigha = crop.seedRate.kgPerBigha;
  const rawSeedKg = areaInBighas * ratePerBigha;

  const seedKg = cropId === 'mustard'
    ? Math.round(rawSeedKg * 100) / 100
    : Math.round(rawSeedKg * 100) / 100;

  const seedGrams = Math.round(seedKg * 1000);
  const formulaStr = `${areaVal} ${normalizedUnit} × ${ratePerBigha} kg/bigha = ${seedKg} kg`;
  const formulaBn = `${bnNum(areaVal)} ${KIDS_LAND_UNITS[normalizedUnit]?.symbol.bn ?? 'বিঘা'} × ${bnNum(ratePerBigha)} কেজি/বিঘা = ${bnNum(seedKg)} কেজি`;

  return {
    cropId: crop.id,
    cropName: crop.name,
    area: areaVal,
    unit: normalizedUnit,
    areaInBighas: Math.round(areaInBighas * 100) / 100,
    areaInDecimals: Math.round(areaInBighas * 33 * 10) / 10,
    ratePerBighaKg: ratePerBigha,
    ratePerUnit: ratePerBigha,
    ratePerDecimalKg: crop.seedRate.kgPerDecimal,
    unitOfSeed: 'kg',
    seedKg,
    seedGrams,
    formula: formulaStr,
    formulaBn,
    formulaStr,
    steps: [
      `Area in bighas: ${areaInBighas.toFixed(2)}`,
      `Rate: ${ratePerBigha} kg/bigha`,
      `Total: ${seedKg} kg`,
    ],
    stepByStep: {
      step1: {
        bn: `জমির পরিমাণ: ${bnNum(areaVal)} ${KIDS_LAND_UNITS[normalizedUnit]?.name.bn ?? 'বিঘা'}`,
        en: `Land area: ${areaVal} ${KIDS_LAND_UNITS[normalizedUnit]?.name.en ?? 'Bigha'}`,
      },
      step2: {
        bn: `প্রতি বিঘায় বীজের হার: ${bnNum(ratePerBigha)} কেজি`,
        en: `Seed rate per bigha: ${ratePerBigha} kg`,
      },
      step3: {
        bn: `মোট বীজ প্রয়োজন = ${bnNum(seedKg)} কেজি (${bnNum(seedGrams)} গ্রাম)`,
        en: `Total seed needed = ${seedKg} kg (${fmtEn(seedGrams)} grams)`,
      },
    },
    taraTip: crop.taraTip,
  };
}

/**
 * Calculates shallow tube well (STW) pump runtime in hours.
 */
export function calculatePumpRuntimeHours({ volumeLiters, pumpRateLph = 30000, detailed = false } = {}) {
  const vol = Math.max(0, Number(volumeLiters) || 0);
  const numRate = Number(pumpRateLph);
  const rate = pumpRateLph !== undefined && Number.isFinite(numRate) ? Math.max(0, numRate) : 30000;
  if (vol <= 0 || rate <= 0) {
    if (detailed) {
      return {
        volumeLiters: 0,
        pumpRateLph: rate,
        runtimeHours: 0,
        hours: 0,
        minutes: 0,
        timeFormatted: { bn: '০ ঘণ্টা ০ মিনিট', en: '0 hr 0 min' },
        dieselLiters: 0,
        dieselCostTk: 0,
        formula: '0 L / 30,000 L/hr = 0 hours',
        formulaBn: '০ লিটার ÷ ৩০,০০০ লিটার/ঘণ্টা = ০ ঘণ্টা',
      };
    }
    return 0;
  }

  const rawHours = vol / rate;
  const runtimeHours = Math.round(rawHours * 100) / 100;

  if (!detailed) {
    return runtimeHours;
  }

  let hours = Math.floor(rawHours);
  let minutes = Math.round((rawHours - hours) * 60);
  if (minutes === 60) {
    hours += 1;
    minutes = 0;
  }

  const volumeM3 = vol / 1000;
  const dieselLiters = Math.round(volumeM3 * 0.085 * 10) / 10;
  const dieselCostTk = Math.round(dieselLiters * 105);

  return {
    volumeLiters: vol,
    pumpRateLph: rate,
    runtimeHours,
    hours,
    minutes,
    timeFormatted: {
      bn: `${bnNum(hours)} ঘণ্টা ${bnNum(minutes)} মিনিট`,
      en: `${hours} hours ${minutes} minutes`,
    },
    dieselLiters,
    dieselCostTk,
    formula: `${fmtEn(vol)} Liters ÷ ${fmtEn(rate)} L/hr = ${runtimeHours} hours`,
    formulaBn: `${bnNum(vol)} লিটার ÷ ${bnNum(rate)} লিটার/ঘণ্টা = ${bnNum(runtimeHours)} ঘণ্টা`,
  };
}

/**
 * FAO-56 crop water requirement, net irrigation depth, and physical volume in Liters and m³.
 */
export function calculateWaterRequirement({
  cropId,
  area = 1,
  unit = 'bigha',
  eto = 4.0,
  stage = 'mid',
  days = 1,
  rain = 0,
  effectiveRainFactor = 0.8,
  puddle = false,
} = {}) {
  const crop = KIDS_CROPS[cropId] ?? KIDS_CROPS.boro;
  const numArea = Number(area);
  const areaVal = Number.isFinite(numArea) && numArea > 0 ? numArea : 0;
  if (areaVal === 0) {
    return {
      cropId: crop.id,
      cropName: crop.name,
      area: 0,
      unit: unit || 'bigha',
      areaM2: 0,
      depthMm: 0,
      netDepthMm: 0,
      volumeLiters: 0,
      volumeM3: 0,
      pumpHours: 0,
      pumpRuntimeHours: 0,
    };
  }

  const normalizedUnit = normalizeLandUnit(unit) || 'bigha';
  const areaM2 = convertLandArea(areaVal, normalizedUnit, 'm2');

  const kcTable = crop.water.kc;
  let kc = kcTable.mid;
  if (stage === 'initial') kc = kcTable.initial;
  else if (stage === 'late') kc = kcTable.late;
  else if (stage === 'development') kc = kcTable.development ?? (kcTable.initial + kcTable.mid) / 2;

  const numEto = Number(eto);
  const etoVal = Number.isFinite(numEto) && numEto >= 0 ? numEto : 4.0;
  const daysVal = Math.max(1, Math.round(Number(days) || 1));
  const rainVal = Math.max(0, Number(rain) || 0);

  const dailyEtc = etoVal * kc;
  const totalEtc = dailyEtc * daysVal;
  // Effective rainfall deduction
  const effRain = rainVal > 0 ? Math.min(rainVal * effectiveRainFactor, totalEtc) : 0;

  let netDepthMm = Math.max(0, totalEtc - effRain);
  if (puddle && crop.water.puddleMm) {
    netDepthMm += crop.water.puddleMm;
  }

  const netDepthRounded = Math.round(netDepthMm * 10) / 10;
  const volumeLiters = Math.round(netDepthRounded * areaM2 * 10) / 10;
  const volumeM3 = Math.round((volumeLiters / 1000) * 100) / 100;
  const pumpHours = Math.round((volumeLiters / 30000) * 100) / 100;

  return {
    cropId: crop.id,
    cropName: crop.name,
    area: areaVal,
    unit: normalizedUnit,
    areaM2: Math.round(areaM2 * 100) / 100,
    eto: etoVal,
    stage,
    kc: Math.round(kc * 100) / 100,
    dailyEtcMm: Math.round(dailyEtc * 100) / 100,
    days: daysVal,
    totalEtcMm: Math.round(totalEtc * 10) / 10,
    rainMm: rainVal,
    effectiveRainMm: Math.round(effRain * 10) / 10,
    depthMm: netDepthRounded,
    netDepthMm: netDepthRounded,
    volumeLiters,
    volumeM3,
    pumpHours,
    pumpRuntimeHours: pumpHours,
    formula: `ETc = ${etoVal} × ${kc.toFixed(2)} = ${dailyEtc.toFixed(1)} mm/day. Net Water = (${dailyEtc.toFixed(1)} × ${daysVal}) - ${effRain.toFixed(1)} = ${netDepthRounded} mm`,
    formulaBn: `ইটিসি = ${bnNum(etoVal)} × ${bnDigits(kc.toFixed(2))} = ${bnDigits(dailyEtc.toFixed(1))} মিমি/দিন। সেচ প্রয়োজন = (${bnDigits(dailyEtc.toFixed(1))} × ${bnNum(daysVal)}) - ${bnDigits(effRain.toFixed(1))} = ${bnNum(netDepthRounded)} মিমি`,
    stepByStep: {
      step1: {
        bn: `ফসল সহগ (Kc): ${bnDigits(kc.toFixed(2))}, দৈনিক বাষ্পীভবন (ETo): ${bnNum(etoVal)} মিমি`,
        en: `Crop coefficient (Kc): ${kc.toFixed(2)}, Daily ETo: ${etoVal} mm`,
      },
      step2: {
        bn: `দৈনিক ফসলের পানির চাহিদা (ETc) = ${bnNum(etoVal)} × ${bnDigits(kc.toFixed(2))} = ${bnDigits(dailyEtc.toFixed(1))} মিমি/দিন`,
        en: `Daily crop water demand (ETc) = ${etoVal} × ${kc.toFixed(2)} = ${dailyEtc.toFixed(1)} mm/day`,
      },
      step3: {
        bn: `${bnNum(daysVal)} দিনের মোট পানির চাহিদা = ${bnDigits(totalEtc.toFixed(1))} মিমি`,
        en: `Total demand for ${daysVal} days = ${totalEtc.toFixed(1)} mm`,
      },
      step4: {
        bn: `কার্যকর বৃষ্টি (${bnDigits(effRain.toFixed(1))} মিমি) বাদ দিয়ে সেচ প্রয়োজন = ${bnNum(netDepthRounded)} মিমি`,
        en: `Net irrigation required after rainfall = ${netDepthRounded} mm`,
      },
      step5: {
        bn: `মোট পানির পরিমাণ = ${bnNum(volumeLiters)} লিটার (${bnNum(volumeM3)} ঘনমিটার)`,
        en: `Total water volume = ${fmtEn(volumeLiters)} Liters (${fmtEn(volumeM3)} m³)`,
      },
    },
    taraTip: crop.taraTip,
  };
}

/**
 * Calculates total subsidized fertilizer cost based on official Ministry of Agriculture schedule:
 * Urea = 27 Tk/kg, TSP = 27 Tk/kg, MoP = 20 Tk/kg, DAP = 21 Tk/kg.
 */
export function calculateFertilizerCost({ ureaKg = 0, tspKg = 0, mopKg = 0, dapKg = 0 } = {}, options = {}) {
  const uKg = Math.max(0, Number(ureaKg) || 0);
  const tKg = Math.max(0, Number(tspKg) || 0);
  const mKg = Math.max(0, Number(mopKg) || 0);
  const dKg = Math.max(0, Number(dapKg) || 0);

  const ureaCost = Math.round(uKg * KIDS_FERTILIZERS.urea.pricePerKg);
  const tspCost = Math.round(tKg * KIDS_FERTILIZERS.tsp.pricePerKg);
  const mopCost = Math.round(mKg * KIDS_FERTILIZERS.mop.pricePerKg);
  const dapCost = Math.round(dKg * KIDS_FERTILIZERS.dap.pricePerKg);

  const totalCost = ureaCost + tspCost + mopCost + dapCost;

  if (options.detailed) {
    return {
      ureaKg: uKg, ureaCost,
      tspKg: tKg, tspCost,
      mopKg: mKg, mopCost,
      dapKg: dKg, dapCost,
      totalKg: Math.round((uKg + tKg + mKg + dKg) * 10) / 10,
      totalCost,
      formula: `(${uKg} × 27) + (${tKg} × 27) + (${mKg} × 20) + (${dKg} × 21) = ${totalCost} Tk`,
      formulaBn: `(${bnNum(uKg)} × ২৭) + (${bnNum(tKg)} × ২৭) + (${bnNum(mKg)} × ২০) + (${bnNum(dKg)} × ২১) = ${bnNum(totalCost)} টাকা`,
    };
  }

  return totalCost;
}

/**
 * Calculates fertilizer requirement, split applications, and subsidized cost.
 */
export function calculateFertilizerDose({
  cropId,
  nutrient = 'urea',
  area = 1,
  unit = 'bigha',
  split = 1,
  totalSplits = null,
} = {}) {
  const crop = KIDS_CROPS[cropId] ?? KIDS_CROPS.boro;
  const fert = KIDS_FERTILIZERS[nutrient] ?? KIDS_FERTILIZERS.urea;
  const numArea = Number(area);
  const areaVal = Number.isFinite(numArea) && numArea > 0 ? numArea : 0;

  if (areaVal === 0) {
    return {
      cropId: crop.id,
      cropName: crop.name,
      nutrient: fert.id,
      fertilizerName: fert.name,
      area: 0,
      unit: unit || 'bigha',
      areaInBighas: 0,
      ratePerBighaKg: 0,
      doseKg: 0,
      totalKg: 0,
      totalSeasonDoseKg: 0,
      splitsCount: 1,
      currentSplit: 1,
      splitKg: 0,
      splitDoseKg: 0,
      pricePerKg: fert.pricePerKg,
      totalCostTk: 0,
      costTk: 0,
      costTaka: 0,
      splitCostTk: 0,
      isLegume: crop.fertilizer.isLegume ?? false,
    };
  }

  const normalizedUnit = normalizeLandUnit(unit) || 'bigha';
  const areaInBighas = convertLandArea(areaVal, normalizedUnit, 'bigha');

  let baseKg = crop.fertilizer.ureaKgPerBigha;
  if (nutrient === 'tsp') baseKg = crop.fertilizer.tspKgPerBigha;
  else if (nutrient === 'mop') baseKg = crop.fertilizer.mopKgPerBigha;
  else if (nutrient === 'dap') baseKg = crop.fertilizer.dapKgPerBigha;

  const totalSeasonDoseKg = Math.round(baseKg * areaInBighas * 10) / 10;

  const rawSplits = totalSplits != null ? Number(totalSplits) : null;
  const numSplits = rawSplits != null && Number.isFinite(rawSplits)
    ? Math.max(1, Math.round(rawSplits))
    : (nutrient === 'urea' ? (crop.fertilizer.ureaSplits || 3) : 1);
  const splitDoseKg = Math.round((totalSeasonDoseKg / numSplits) * 10) / 10;

  const pricePerKg = fert.pricePerKg;
  const totalCostTk = Math.round(totalSeasonDoseKg * pricePerKg);
  const splitCostTk = Math.round(splitDoseKg * pricePerKg);

  return {
    cropId: crop.id,
    cropName: crop.name,
    nutrient: fert.id,
    fertilizerName: fert.name,
    area: areaVal,
    unit: normalizedUnit,
    areaInBighas: Math.round(areaInBighas * 100) / 100,
    ratePerBighaKg: baseKg,
    doseKg: totalSeasonDoseKg,
    totalKg: totalSeasonDoseKg,
    totalSeasonDoseKg,
    splitsCount: numSplits,
    currentSplit: split,
    splitKg: splitDoseKg,
    splitDoseKg,
    pricePerKg,
    totalCostTk,
    costTk: splitCostTk,
    costTaka: totalCostTk,
    splitCostTk,
    isLegume: crop.fertilizer.isLegume ?? false,
    formula: `${areaVal} ${normalizedUnit} × ${baseKg} kg/bigha = ${totalSeasonDoseKg} kg (Split ${split}/${numSplits}: ${splitDoseKg} kg)`,
    formulaBn: `${bnNum(areaVal)} ${KIDS_LAND_UNITS[normalizedUnit]?.symbol.bn ?? 'বিঘা'} × ${bnNum(baseKg)} কেজি/বিঘা = ${bnNum(totalSeasonDoseKg)} কেজি (কিস্তি ${bnNum(split)}/${bnNum(numSplits)}: ${bnNum(splitDoseKg)} কেজি)`,
    stepByStep: {
      step1: {
        bn: `ফসলের পুরো মৌসুমের সারের হার: প্রতি বিঘায় ${bnNum(baseKg)} কেজি`,
        en: `Full season rate: ${baseKg} kg per bigha`,
      },
      step2: {
        bn: `${bnNum(areaVal)} ${KIDS_LAND_UNITS[normalizedUnit]?.name.bn ?? 'বিঘা'} জমির মোট সার = ${bnNum(totalSeasonDoseKg)} কেজি (সরকারি দাম: ${bnNum(totalCostTk)} টাকা)`,
        en: `Total fertilizer for ${areaVal} ${KIDS_LAND_UNITS[normalizedUnit]?.name.en ?? 'Bigha'} = ${totalSeasonDoseKg} kg (Govt cost: ${totalCostTk} Tk)`,
      },
      step3: {
        bn: `${bnNum(numSplits)} কিস্তির প্রতি কিস্তিতে (split) প্রয়োগ করতে হবে = ${bnNum(splitDoseKg)} কেজি (খরচ: ${bnNum(splitCostTk)} টাকা)`,
        en: `Amount per split across ${numSplits} splits = ${splitDoseKg} kg (Cost: ${splitCostTk} Tk)`,
      },
    },
    taraTip: fert.function,
  };
}

/**
 * Farm business financial calculator: aggregates costs, computes revenue, net profit/loss, and ROI%.
 */
export function calculateFarmBudget({
  area = 1,
  unit = 'bigha',
  cropId = 'boro',
  seedCost = 0,
  fertCost = 0,
  waterCost = 0,
  laborCost = 0,
  ploughCost = 0,
  otherCost = 0,
  yieldAmount = null,
  yieldUnit = 'maund',
  pricePerUnit = null,
} = {}) {
  const crop = KIDS_CROPS[cropId] ?? KIDS_CROPS.boro;
  const numArea = Number(area);
  const areaVal = Number.isFinite(numArea) && numArea > 0 ? numArea : 1;
  const normalizedUnit = normalizeLandUnit(unit) || 'bigha';
  const areaInBighas = convertLandArea(areaVal, normalizedUnit, 'bigha');

  const sCost = Math.max(0, Number(seedCost) || 0);
  const fCost = Math.max(0, Number(fertCost) || 0);
  const wCost = Math.max(0, Number(waterCost) || 0);
  const lCost = Math.max(0, Number(laborCost) || 0);
  const pCost = Math.max(0, Number(ploughCost) || 0);
  const oCost = Math.max(0, Number(otherCost) || 0);

  const totalExpenses = sCost + fCost + wCost + lCost + pCost + oCost;

  const numYield = Number(yieldAmount);
  let harvestQty = yieldAmount != null && Number.isFinite(numYield) ? Math.max(0, numYield) : null;
  if (harvestQty == null) {
    const totalKg = areaInBighas * crop.yield.kgPerBigha;
    harvestQty = yieldUnit === 'maund'
      ? Math.round((totalKg / 40) * 10) / 10
      : Math.round(totalKg);
  }

  const numPrice = Number(pricePerUnit);
  let price = pricePerUnit != null && Number.isFinite(numPrice) ? Math.max(0, numPrice) : null;
  if (price == null) {
    price = yieldUnit === 'maund'
      ? crop.yield.typicalPriceTkPerMaund
      : crop.yield.typicalPriceTkPerKg;
  }

  const totalRevenue = Math.round(harvestQty * price);
  const profitOrLoss = totalRevenue - totalExpenses;
  const netProfit = profitOrLoss;
  const isProfit = profitOrLoss >= 0;
  const isLoss = profitOrLoss < 0;
  const isBreakEven = profitOrLoss === 0;
  const lossAmount = Math.abs(profitOrLoss);
  const status = isBreakEven ? 'breakeven' : isProfit ? 'profit' : 'loss';

  let roiPercent = 0;
  if (totalExpenses > 0) {
    roiPercent = Math.round((profitOrLoss / totalExpenses) * 100);
  } else if (totalRevenue > 0) {
    roiPercent = 100;
  }

  const roiPct = totalExpenses > 0 ? Math.round((profitOrLoss / totalExpenses) * 1000) / 10 : 0;
  const marginPct = totalRevenue > 0 ? Math.round((profitOrLoss / totalRevenue) * 1000) / 10 : 0;

  return {
    area: areaVal,
    unit: normalizedUnit,
    areaInBighas: Math.round(areaInBighas * 100) / 100,
    cropId: crop.id,
    cropName: crop.name,
    expenses: {
      seedCost: sCost,
      fertCost: fCost,
      waterCost: wCost,
      laborCost: lCost,
      ploughCost: pCost,
      otherCost: oCost,
      totalExpenses,
    },
    harvest: {
      amount: harvestQty,
      unit: yieldUnit,
      pricePerUnit: price,
    },
    totalExpenses,
    revenue: totalRevenue,
    totalRevenue,
    profitOrLoss,
    netProfit,
    status,
    isProfit,
    isLoss,
    isBreakEven,
    lossAmount,
    roiPercent,
    roiPct,
    marginPct,
    formula: `Revenue (${totalRevenue}) - Expenses (${totalExpenses}) = Profit (${profitOrLoss}) Tk`,
    formulaBn: `আয় (${bnNum(totalRevenue)}) - খরচ (${bnNum(totalExpenses)}) = লাভ (${bnNum(profitOrLoss)}) টাকা`,
    stepByStep: {
      step1: {
        bn: `মোট খরচ = বীজ (${bnNum(sCost)}) + সার (${bnNum(fCost)}) + সেচ (${bnNum(wCost)}) + শ্রমিক (${bnNum(lCost)}) + চাষ (${bnNum(pCost + oCost)}) = ${bnNum(totalExpenses)} টাকা`,
        en: `Total Expenses = Seed (${fmtEn(sCost)}) + Fert (${fmtEn(fCost)}) + Water (${fmtEn(wCost)}) + Labor (${fmtEn(lCost)}) + Ploughing (${fmtEn(pCost + oCost)}) = ${fmtEn(totalExpenses)} Tk`,
      },
      step2: {
        bn: `মোট আয় = ${bnNum(harvestQty)} ${yieldUnit === 'maund' ? 'মণ' : 'কেজি'} × ${bnNum(price)} টাকা = ${bnNum(totalRevenue)} টাকা`,
        en: `Total Revenue = ${fmtEn(harvestQty)} ${yieldUnit} × ${fmtEn(price)} Tk = ${fmtEn(totalRevenue)} Tk`,
      },
      step3: {
        bn: `${isProfit ? 'নিট লাভ' : 'লোকসান'} = আয় (${bnNum(totalRevenue)}) - খরচ (${bnNum(totalExpenses)}) = ${bnNum(lossAmount)} টাকা`,
        en: `${isProfit ? 'Net Profit' : 'Net Loss'} = Revenue (${fmtEn(totalRevenue)}) - Expenses (${fmtEn(totalExpenses)}) = ${fmtEn(lossAmount)} Tk`,
      },
      step4: {
        bn: `বিনিয়োগের মুনাফা (ROI) = (${bnNum(profitOrLoss)} ÷ ${bnNum(totalExpenses)}) × ১০০ = ${bnNum(roiPercent)}%`,
        en: `Return on Investment (ROI) = (${profitOrLoss} ÷ ${totalExpenses}) × 100 = ${roiPercent}%`,
      },
    },
    taraTip: {
      bn: 'আয় থেকে খরচ বাদ দিলে যা থাকে তা-ই নিট লাভ। একজন স্মার্ট কৃষক সব খরচের সঠিক হিসাব রাখে এবং আয়ের একটি অংশ পরবর্তী ফসলের জন্য সংরক্ষণ করে।',
      en: 'Profit is what remains after subtracting costs from revenue. A smart farmer maintains careful accounts and reinvests part of the harvest for the next cycle.',
    },
  };
}

// ============================================================================
// 4. SMART FARMING & SATELLITE EVALUATION (F06)
// ============================================================================

/**
 * Evaluates crop health from an NDVI satellite value (-1.0 to 1.0).
 */
export function evaluateNdviHealth(ndviVal) {
  const num = typeof ndviVal === 'number' ? ndviVal : parseFloat(ndviVal);
  const clamped = Number.isNaN(num) ? 0.2 : Math.max(-1.0, Math.min(1.0, num));

  // Determine band
  let band;
  if (clamped < 0.1) band = KIDS_NDVI_BANDS[0]; // water
  else if (clamped < 0.25) band = KIDS_NDVI_BANDS[1]; // bare_soil
  else if (clamped < 0.45) band = KIDS_NDVI_BANDS[2]; // stressed
  else if (clamped < 0.65) band = KIDS_NDVI_BANDS[3]; // moderate
  else band = KIDS_NDVI_BANDS[4]; // dense / healthy

  // Refined bandId matching e2e test suite:
  let bandId = 'bare';
  if (clamped >= 0.75) bandId = 'excellent';
  else if (clamped >= 0.60) bandId = 'good';
  else if (clamped >= 0.40) bandId = 'moderate';
  else if (clamped >= 0.20) bandId = 'stressed';
  else bandId = 'bare';

  // Explorer 3 band name
  let bandCategory = 'water';
  if (clamped >= 0.65) bandCategory = 'healthy';
  else if (clamped >= 0.45) bandCategory = 'moderate';
  else if (clamped >= 0.25) bandCategory = 'stressed';
  else if (clamped >= 0.10) bandCategory = 'bare_soil';
  else bandCategory = 'water';

  return {
    ndvi: Number(clamped.toFixed(2)),
    band: bandCategory,
    bandId,
    id: band.id,
    label: band.label,
    status: band.status,
    description: band.description,
    desc: band.description,
    isHealthy: clamped >= 0.40,
    color: band.color,
    action: band.action,
    recommendation: band.action,
    taraTip: band.taraTip,
  };
}

/**
 * Evaluates weather forecast hazards and prescribes agricultural actions.
 */
export function evaluateWeatherAction({ forecastRainMm = 0, forecastMaxTemp = 30, forecastMinTemp = 20, cropId = 'boro' } = {}) {
  const rain = Number(forecastRainMm) || 0;
  const maxT = Number(forecastMaxTemp) || 30;
  const minT = Number(forecastMinTemp) || 20;

  const risks = [];

  // Heavy rain check
  if (rain >= KIDS_WEATHER_RULES.HEAVY_RAIN.thresholdMm) {
    const isVeryHeavy = rain >= KIDS_WEATHER_RULES.HEAVY_RAIN.veryHeavyThresholdMm;
    risks.push({
      id: KIDS_WEATHER_RULES.HEAVY_RAIN.id,
      hazardType: 'rain',
      alertLevel: isVeryHeavy ? 'severe' : 'heavy',
      ruleId: isVeryHeavy ? 'VERY_HEAVY_RAIN' : 'HEAVY_RAIN',
      value: rain,
      unit: 'mm',
      title: {
        bn: isVeryHeavy ? 'অতি ভারী বৃষ্টির পূর্বাভাস' : 'ভারী বৃষ্টির পূর্বাভাস',
        en: isVeryHeavy ? 'Very Heavy Rain Alert' : 'Heavy Rain Alert',
      },
      rule: KIDS_WEATHER_RULES.HEAVY_RAIN.rule,
      action: KIDS_WEATHER_RULES.HEAVY_RAIN.action,
      actionAdvice: KIDS_WEATHER_RULES.HEAVY_RAIN.action,
      taraTip: KIDS_WEATHER_RULES.HEAVY_RAIN.taraTip,
    });
  }

  // Heatwave check
  if (maxT >= KIDS_WEATHER_RULES.HEATWAVE.thresholdTempC) {
    const isSevere = maxT >= KIDS_WEATHER_RULES.HEATWAVE.severeThresholdTempC;
    risks.push({
      id: KIDS_WEATHER_RULES.HEATWAVE.id,
      hazardType: 'heat',
      alertLevel: isSevere ? 'severe' : 'moderate',
      ruleId: 'HEATWAVE',
      value: maxT,
      unit: '°C',
      title: {
        bn: 'তাপপ্রবাহের পূর্বাভাস',
        en: 'Heatwave Alert',
      },
      rule: KIDS_WEATHER_RULES.HEATWAVE.rule,
      action: KIDS_WEATHER_RULES.HEATWAVE.action,
      actionAdvice: KIDS_WEATHER_RULES.HEATWAVE.action,
      taraTip: KIDS_WEATHER_RULES.HEATWAVE.taraTip,
    });
  }

  // Cold wave check
  if (minT <= KIDS_WEATHER_RULES.COLD_WAVE.thresholdTempC) {
    const isSevere = minT < KIDS_WEATHER_RULES.COLD_WAVE.severeThresholdTempC;
    risks.push({
      id: KIDS_WEATHER_RULES.COLD_WAVE.id,
      hazardType: 'cold',
      alertLevel: isSevere ? 'severe' : 'moderate',
      ruleId: 'COLD_WAVE',
      value: minT,
      unit: '°C',
      title: {
        bn: 'শৈত্যপ্রবাহের পূর্বাভাস',
        en: 'Cold Wave Alert',
      },
      rule: KIDS_WEATHER_RULES.COLD_WAVE.rule,
      action: KIDS_WEATHER_RULES.COLD_WAVE.action,
      actionAdvice: KIDS_WEATHER_RULES.COLD_WAVE.action,
      taraTip: KIDS_WEATHER_RULES.COLD_WAVE.taraTip,
    });
  }

  if (risks.length === 0) {
    return {
      hazardType: 'normal',
      alertLevel: 'none',
      ruleId: 'NORMAL',
      primaryRisk: KIDS_WEATHER_RULES.NORMAL.id,
      severity: 'none',
      risks: [],
      title: { bn: 'স্বাভাবিক আবহাওয়া', en: 'Normal Weather' },
      action: KIDS_WEATHER_RULES.NORMAL.action,
      actionAdvice: KIDS_WEATHER_RULES.NORMAL.action,
      recommendation: KIDS_WEATHER_RULES.NORMAL.action,
      taraTip: KIDS_WEATHER_RULES.NORMAL.taraTip,
      bilingualSummary: {
        bn: 'আবহাওয়া অনুকূল। মাঠে স্বাভাবিক পরিচর্যা চালিয়ে যান।',
        en: 'Weather is favorable. Continue routine field activities.',
      },
    };
  }

  // Priority: Rain > Heat > Cold
  const primary = risks.find((r) => r.hazardType === 'rain') || risks[0];

  const summaryBn = primary.hazardType === 'rain'
    ? `ভারী বৃষ্টির সম্ভাবনা (${bnNum(rain)} মিমি)। নালা খুলে রাখুন এবং সার প্রয়োগ বন্ধ রাখুন!`
    : primary.hazardType === 'heat'
    ? `তাপপ্রবাহের পূর্বাভাস (${bnNum(maxT)}°C)। সকালে/বিকেলে সেচ দিন এবং জমিতে পানি রাখুন।`
    : `শৈত্যপ্রবাহের পূর্বাভাস (${bnNum(minT)}°C)। বীজতলা রাতে স্বচ্ছ পলিথিনে ঢেকে রাখুন।`;

  const summaryEn = primary.hazardType === 'rain'
    ? `Heavy rain forecast (${rain} mm). Open drainage trenches and postpone fertilizer!`
    : primary.hazardType === 'heat'
    ? `Heatwave forecast (${maxT}°C). Irrigate in early morning/evening and keep standing water.`
    : `Cold wave forecast (${minT}°C). Cover seedbeds with clear polythene at night.`;

  return {
    hazardType: primary.hazardType,
    alertLevel: primary.alertLevel,
    ruleId: primary.ruleId,
    primaryRisk: primary.id,
    severity: primary.alertLevel,
    risks,
    title: primary.title,
    action: primary.action,
    actionAdvice: primary.actionAdvice,
    recommendation: primary.action,
    taraTip: primary.taraTip,
    bilingualSummary: {
      bn: summaryBn,
      en: summaryEn,
    },
  };
}

// ============================================================================
// 5. DETERMINISTIC PRNG & CHALLENGE GENERATOR (F07)
// ============================================================================

/**
 * Seedable 32-bit Mulberry32 PRNG.
 */
export function createPrng(seed = 123456789) {
  let s = 0;
  if (typeof seed === 'number') {
    s = Math.abs(Math.floor(seed)) >>> 0;
  } else {
    const str = String(seed);
    for (let i = 0; i < str.length; i++) {
      s = (Math.imul(31, s) + str.charCodeAt(i)) | 0;
    }
    s = (s >>> 0);
  }

  return function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates an agricultural math challenge scaled to tier with deterministic seed.
 */
export function generateKidsChallenge({ category = 'seed', tier = 'beginner', seed = 12345 } = {}) {
  const prng = createPrng(seed);
  const randInt = (min, max) => Math.floor(prng() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(prng() * arr.length)];

  // Tier normalization
  const selectedTier = DIFFICULTY_TIERS[tier] || DIFFICULTY_TIERS.beginner;

  // Category normalization
  let cat = category;
  if (['seed_rate', 'seed', 'seeds'].includes(cat)) cat = 'seed';
  else if (['fertilizer_split', 'fertilizer', 'fert'].includes(cat)) cat = 'fertilizer';
  else if (['water_irrigation', 'water', 'irrigation'].includes(cat)) cat = 'water';
  else if (['farm_finance', 'finance', 'budget', 'profit'].includes(cat)) cat = 'finance';
  else if (['land_conversion', 'land', 'area'].includes(cat)) cat = 'land';
  else if (['ndvi', 'satellite'].includes(cat)) cat = 'ndvi';
  else if (['weather', 'bmd'].includes(cat)) cat = 'weather';
  else cat = 'seed';

  let challenge = null;

  switch (cat) {
    case 'seed': {
      if (selectedTier === 'beginner') {
        const crops = [
          { id: 'boro', nameBn: 'বোরো ধান', nameEn: 'Boro rice', rate: 5 },
          { id: 'wheat', nameBn: 'গম', nameEn: 'Wheat', rate: 16 },
          { id: 'maize', nameBn: 'ভুট্টা', nameEn: 'Maize', rate: 3 },
        ];
        const crop = pick(crops);
        const area = randInt(2, 5);
        const targetAnswer = area * crop.rate;

        challenge = {
          id: `seed_${crop.id}_${area}b_${seed}`,
          category: 'seed',
          tier: selectedTier,
          seed,
          question: {
            bn: `রফিক কাকা ${bnNum(area)} বিঘা জমিতে ${crop.nameBn} চাষ করবেন। প্রতি বিঘায় ${bnNum(crop.rate)} কেজি বীজ লাগলে তার মোট কত কেজি বীজ কিনতে হবে?`,
            en: `Rafiq Uncle is planting ${crop.nameEn} on ${area} bighas. If ${crop.rate} kg of seed is needed per bigha, how many kg must he purchase in total?`,
          },
          context: {
            cropId: crop.id,
            area,
            unit: 'bigha',
            rate: crop.rate,
            operation: 'multiply',
          },
          inputs: { cropId: crop.id, area, unit: 'bigha', rate: crop.rate, operation: 'multiply' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'কেজি', en: 'kg' },
          formulaKey: 'area_x_rate',
        };
      } else if (selectedTier === 'intermediate') {
        const area1 = randInt(2, 3);
        const area2 = randInt(1, 2);
        const rateBoro = 5;
        const rateWheat = 16;
        const targetAnswer = (area1 * rateBoro) + (area2 * rateWheat);

        challenge = {
          id: `seed_multi_${area1}_${area2}_${seed}`,
          category: 'seed',
          tier: selectedTier,
          seed,
          question: {
            bn: `করিম কাকার দুটি ক্ষেত আছে: একটিতে ${bnNum(area1)} বিঘা বোরো ধান (বিঘায় ৫ কেজি) এবং অন্যটিতে ${bnNum(area2)} বিঘা গম (বিঘায় ১৬ কেজি)। দুই ক্ষেতের জন্য মোট কত কেজি বীজ লাগবে?`,
            en: `Karim Uncle has two fields: ${area1} bighas of Boro rice (5 kg/bigha) and ${area2} bighas of wheat (16 kg/bigha). How many kg of seeds does he need in total?`,
          },
          context: { area1, rate1: rateBoro, area2, rate2: rateWheat, operation: 'two_plot_sum' },
          inputs: { area1, rate1: rateBoro, area2, rate2: rateWheat, operation: 'two_plot_sum' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'কেজি', en: 'kg' },
          formulaKey: 'two_plot_seed',
        };
      } else {
        const bighas = randInt(2, 4);
        const decimals = bighas * 33;
        const rateKg = 5;
        const pricePerKg = 40;
        const totalKg = bighas * rateKg;
        const targetAnswer = totalKg * pricePerKg;

        challenge = {
          id: `seed_adv_${decimals}dec_${seed}`,
          category: 'seed',
          tier: selectedTier,
          seed,
          question: {
            bn: `একটি মাঠে ${bnNum(decimals)} শতক (১ বিঘা = ৩৩ শতক) জমিতে বোরো ধান বোনা হবে। প্রতি বিঘায় ৫ কেজি বীজ লাগে এবং প্রতি কেজি বীজের দাম ৪০ টাকা। মোট বীজের খরচ কত টাকা হবে?`,
            en: `A field of ${decimals} decimals (1 bigha = 33 decimals) is being sown with Boro rice. 5 kg of seed is needed per bigha at 40 BDT/kg. What is the total cost of seeds in Taka?`,
          },
          context: { decimals, bighas, rateKg, pricePerKg, operation: 'convert_then_cost' },
          inputs: { decimals, bighas, rateKg, pricePerKg, operation: 'convert_then_cost' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'টাকা', en: 'BDT' },
          formulaKey: 'seed_cost_adv',
        };
      }
      break;
    }

    case 'fertilizer': {
      if (selectedTier === 'beginner') {
        const area = randInt(2, 4);
        const rateTsp = 15;
        const targetAnswer = area * rateTsp;

        challenge = {
          id: `fert_beg_${area}b_${seed}`,
          category: 'fertilizer',
          tier: selectedTier,
          seed,
          question: {
            bn: `১ বিঘা জমিতে ১৫ কেজি টিএসপি সার দিতে হয়। ${bnNum(area)} বিঘা জমির জন্য মোট কত কেজি টিএসপি সার লাগবে?`,
            en: `1 bigha of land requires 15 kg of TSP fertilizer. How many kg of TSP are needed for ${area} bighas?`,
          },
          context: { area, rate: rateTsp, fertilizer: 'tsp', operation: 'multiply' },
          inputs: { area, rate: rateTsp, fertilizer: 'tsp', operation: 'multiply' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'কেজি', en: 'kg' },
          formulaKey: 'area_x_rate',
        };
      } else if (selectedTier === 'intermediate') {
        const area = randInt(2, 4);
        const totalUrea = area * 36;
        const splitDose = totalUrea / 3;

        challenge = {
          id: `fert_split_${area}b_${seed}`,
          category: 'fertilizer',
          tier: selectedTier,
          seed,
          question: {
            bn: `${bnNum(area)} বিঘা বোরো ধান ক্ষেতের জন্য মোট ${bnNum(totalUrea)} কেজি ইউরিয়া কেনা হয়েছে। কৃষি কর্মকর্তার পরামর্শে ইউরিয়া সার সমান ৩টি কিস্তিতে দিতে হবে। কুশি গজানোর সময় দ্বিতীয় কিস্তিতে কত কেজি ইউরিয়া দিতে হবে?`,
            en: `For ${area} bighas of Boro paddy, a total of ${totalUrea} kg of Urea was purchased. Following the agriculture officer’s advice, Urea must be applied in 3 equal splits. How many kg of Urea should be applied in the second split?`,
          },
          context: { area, totalDose: totalUrea, splits: 3, totalSplits: 3, fertilizer: 'urea', operation: 'split_division' },
          inputs: { area, totalDose: totalUrea, splits: 3, totalSplits: 3, fertilizer: 'urea', operation: 'split_division' },
          targetAnswer: splitDose,
          correctAnswer: splitDose,
          tolerance: 0,
          unit: { bn: 'কেজি', en: 'kg' },
          formulaKey: 'fertilizer_split',
        };
      } else {
        const ureaKg = randInt(20, 50);
        const tspKg = randInt(15, 30);
        const targetAnswer = (ureaKg * 27) + (tspKg * 27);

        challenge = {
          id: `fert_adv_cost_${seed}`,
          category: 'fertilizer',
          tier: selectedTier,
          seed,
          question: {
            bn: `সরকারি ভর্তুকি মূল্যে ইউরিয়া প্রতি কেজি ২৭ টাকা এবং টিএসপি প্রতি কেজি ২৭ টাকা। একজন কৃষক ${bnNum(ureaKg)} কেজি ইউরিয়া এবং ${bnNum(tspKg)} কেজি টিএসপি কিনলে মোট কত টাকা লাগবে?`,
            en: `At government subsidized prices, Urea is 27 BDT/kg and TSP is 27 BDT/kg. If a farmer buys ${ureaKg} kg of Urea and ${tspKg} kg of TSP, what is the total cost?`,
          },
          context: { ureaKg, tspKg, ureaPrice: 27, tspPrice: 27, operation: 'multi_fert_cost' },
          inputs: { ureaKg, tspKg, ureaPrice: 27, tspPrice: 27, operation: 'multi_fert_cost' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'টাকা', en: 'BDT' },
          formulaKey: 'fertilizer_cost_adv',
        };
      }
      break;
    }

    case 'water': {
      if (selectedTier === 'beginner') {
        const bucketsPerDay = randInt(4, 6);
        const days = randInt(3, 5);
        const targetAnswer = bucketsPerDay * days;

        challenge = {
          id: `water_beg_${seed}`,
          category: 'water',
          tier: selectedTier,
          seed,
          question: {
            bn: `একটি ছোট সবজি নার্সারিতে প্রতিদিন ${bnNum(bucketsPerDay)} বালতি পানি দিতে হয়। ${bnNum(days)} দিনে মোট কত বালতি পানি দেওয়া হবে?`,
            en: `A small vegetable nursery needs ${bucketsPerDay} buckets of water daily. How many buckets will be given in ${days} days?`,
          },
          context: { bucketsPerDay, days, operation: 'multiply' },
          inputs: { bucketsPerDay, days, operation: 'multiply' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'বালতি', en: 'buckets' },
          formulaKey: 'daily_water',
        };
      } else if (selectedTier === 'intermediate') {
        const hours = randInt(2, 4);
        const volumeLiters = hours * 30000;

        challenge = {
          id: `water_pump_${hours}h_${seed}`,
          category: 'water',
          tier: selectedTier,
          seed,
          question: {
            bn: `একটি শ্যালো টিউবওয়েল পাম্প প্রতি ঘণ্টায় ৩০,০০০ লিটার পানি তোলে। একটি বোরো ক্ষেতে ${bnNum(volumeLiters)} লিটার সেচের পানি দিতে পাম্পটি কত ঘণ্টা চালাতে হবে?`,
            en: `A shallow tube well pump lifts 30,000 Liters of water per hour. To deliver ${fmtEn(volumeLiters)} Liters of irrigation to a paddy field, how many hours must the pump run?`,
          },
          context: { volumeLiters, pumpRateLph: 30000, operation: 'division' },
          inputs: { volumeLiters, pumpRateLph: 30000, operation: 'division' },
          targetAnswer: hours,
          correctAnswer: hours,
          tolerance: 0,
          unit: { bn: 'ঘণ্টা', en: 'hours' },
          formulaKey: 'pump_runtime',
        };
      } else {
        const eto = 5.0;
        const kc = 1.2;
        const days = randInt(4, 7);
        const targetAnswer = Math.round(eto * kc * days);

        challenge = {
          id: `water_etc_${days}d_${seed}`,
          category: 'water',
          tier: selectedTier,
          seed,
          question: {
            bn: `বোরো ধানের থোড় আসার সময় ক্রপ কো-এফিশিয়েন্ট Kc = ১.২ এবং দৈনিক বাষ্পীভবন ETo = ৫.০ মিলিমিটার। ${bnNum(days)} দিনে ফসলের মোট পানির চাহিদা (ETc = ETo × Kc × দিন) কত মিলিমিটার?`,
            en: `During Boro rice booting stage, crop coefficient Kc = 1.2 and reference evapotranspiration ETo = 5.0 mm/day. What is the crop water requirement (ETc = ETo × Kc × days) in mm over ${days} days?`,
          },
          context: { eto, kc, days, operation: 'fao56_etc' },
          inputs: { eto, kc, days, operation: 'fao56_etc' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0.1,
          unit: { bn: 'মিলিমিটার', en: 'mm' },
          formulaKey: 'fao56_etc',
        };
      }
      break;
    }

    case 'finance': {
      if (selectedTier === 'beginner') {
        const revenue = randInt(6, 9) * 1000;
        const expenses = randInt(3, 5) * 1000;
        const targetAnswer = revenue - expenses;

        challenge = {
          id: `fin_beg_${seed}`,
          category: 'finance',
          tier: selectedTier,
          seed,
          question: {
            bn: `সুমি বেগমের টমেটো বিক্রি করে মোট আয় হলো ${bnNum(revenue)} টাকা। তার সার, বীজ ও সেচের মোট খরচ হয়েছিল ${bnNum(expenses)} টাকা। তার কত টাকা নিট লাভ হলো?`,
            en: `Sumi Begum earned ${fmtEn(revenue)} BDT selling tomatoes. Her total expenses for seeds, fertilizer, and irrigation were ${fmtEn(expenses)} BDT. What was her net profit?`,
          },
          context: { revenue, expenses, operation: 'profit_calc' },
          inputs: { revenue, expenses, operation: 'profit_calc' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'টাকা', en: 'BDT' },
          formulaKey: 'revenue_minus_expenses',
        };
      } else if (selectedTier === 'intermediate') {
        const maunds = randInt(20, 35);
        const pricePerMaund = 1000;
        const revenue = maunds * pricePerMaund;
        const expenses = randInt(12, 18) * 1000;
        const targetAnswer = revenue - expenses;

        challenge = {
          id: `fin_int_maund_${seed}`,
          category: 'finance',
          tier: selectedTier,
          seed,
          question: {
            bn: `আরিফের বাবা ২ বিঘা জমিতে ${bnNum(maunds)} মণ ধান পেলেন। তিনি প্রতি মণ ধান ১,০০০ টাকায় বিক্রি করলেন। চাষের মোট খরচ ${bnNum(expenses)} টাকা হলে তার লাভ কত টাকা?`,
            en: `Arif’s father harvested ${maunds} maunds of paddy from 2 bighas. He sold each maund for 1,000 BDT. If his total cultivation cost was ${fmtEn(expenses)} BDT, what is his profit?`,
          },
          context: { maunds, pricePerMaund, revenue, expenses, operation: 'maund_profit' },
          inputs: { maunds, pricePerMaund, revenue, expenses, operation: 'maund_profit' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'টাকা', en: 'BDT' },
          formulaKey: 'maund_revenue_profit',
        };
      } else {
        const seedCost = 1500;
        const fertCost = 3500;
        const waterCost = 2000;
        const laborCost = 3000;
        const totalExpenses = seedCost + fertCost + waterCost + laborCost; // 10,000 Tk
        const profit = 5000;
        const targetAnswer = Math.round((profit / totalExpenses) * 100); // 50%

        challenge = {
          id: `fin_adv_roi_${seed}`,
          category: 'finance',
          tier: selectedTier,
          seed,
          question: {
            bn: `একটি সরিষা ক্ষেতে বীজ খরচ ১,৫০০ টাকা, সার ৩,৫০০ টাকা, সেচ ২,০০০ টাকা এবং মজুরি ৩,০০০ টাকা (মোট খরচ ১০,০০০ টাকা)। ফসল বিক্রি করে ১৫,০০০ টাকা আয় হলে লাভের হার (ROI %) কত শতাংশ?`,
            en: `On a mustard farm, costs were: seeds 1,500 BDT, fertilizer 3,500 BDT, irrigation 2,000 BDT, and labor 3,000 BDT (Total cost 10,000 BDT). If crop sale revenue was 15,000 BDT, what is the Return on Investment (ROI %)?`,
          },
          context: { totalExpenses, profit, revenue: 15000, operation: 'roi_percent' },
          inputs: { totalExpenses, profit, revenue: 15000, operation: 'roi_percent' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0.1,
          unit: { bn: '%', en: '%' },
          formulaKey: 'roi_calculation',
        };
      }
      break;
    }

    case 'land': {
      if (selectedTier === 'beginner') {
        const bighas = randInt(2, 5);
        const targetAnswer = bighas * 20;

        challenge = {
          id: `land_bigha_katha_${seed}`,
          category: 'land',
          tier: selectedTier,
          seed,
          question: {
            bn: `সালমা আপার ${bnNum(bighas)} বিঘা জমি আছে। ১ বিঘা সমান ২০ কাঠা হলে, কাঠায় হিসাব করলে তার মোট কত কাঠা জমি আছে?`,
            en: `Salma Apa owns ${bighas} bighas of land. If 1 bigha equals 20 kathas, how many kathas of land does she have in total?`,
          },
          context: { bighas, factor: 20, operation: 'multiply' },
          inputs: { bighas, factor: 20, operation: 'multiply' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'কাঠা', en: 'kathas' },
          formulaKey: 'bigha_to_katha',
        };
      } else if (selectedTier === 'intermediate') {
        const bighas = randInt(2, 4);
        const targetAnswer = bighas * 33;

        challenge = {
          id: `land_bigha_dec_${seed}`,
          category: 'land',
          tier: selectedTier,
          seed,
          question: {
            bn: `বাংলাদেশে ১ বিঘা সমান ৩৩ শতক (ডেসিমল)। তুহিনের পরিবারের ${bnNum(bighas)} বিঘা জমি থাকলে শতকে হিসাব করলে এটি কত শতক জমি?`,
            en: `In Bangladesh, 1 bigha equals 33 decimals. If Tuhin’s family owns ${bighas} bighas, how many decimals of land is this?`,
          },
          context: { bighas, factor: 33, operation: 'multiply' },
          inputs: { bighas, factor: 33, operation: 'multiply' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'শতক', en: 'decimals' },
          formulaKey: 'bigha_to_decimal',
        };
      } else {
        const bighas = randInt(2, 4);
        const decimals = bighas * 33;
        const targetAnswer = bighas;

        challenge = {
          id: `land_dec_to_bigha_${seed}`,
          category: 'land',
          tier: selectedTier,
          seed,
          question: {
            bn: `একটি জমিতে ${bnNum(decimals)} শতক জায়গা আছে। ১ বিঘা সমান ৩৩ শতক হলে, জমিটি মোট কত বিঘা?`,
            en: `A plot of land measures ${decimals} decimals. If 1 bigha equals 33 decimals, how many bighas is this plot?`,
          },
          context: { decimals, factor: 33, operation: 'division' },
          inputs: { decimals, factor: 33, operation: 'division' },
          targetAnswer,
          correctAnswer: targetAnswer,
          tolerance: 0,
          unit: { bn: 'বিঘা', en: 'bighas' },
          formulaKey: 'decimal_to_bigha',
        };
      }
      break;
    }

    case 'ndvi': {
      const band = pick(KIDS_NDVI_BANDS);
      const val = Number((band.min + (band.max - band.min) * 0.5).toFixed(2));
      const targetAnswer = band.id;

      challenge = {
        id: `ndvi_challenge_${band.id}_${seed}`,
        category: 'ndvi',
        tier: selectedTier,
        seed,
        question: {
          bn: `তারা উপগ্রহের ইনফ্রারেড ক্যামেরায় একটি মাঠের এনডিভিআই (NDVI) মান পাওয়া গেল ${bnNum(val)}। এই জমির ফসল কী অবস্থায় আছে?`,
          en: `Tara’s infrared satellite camera detected an NDVI reading of ${val} for a field. What is the condition of this field?`,
        },
        context: { ndviValue: val, bandId: band.id, operation: 'classify' },
        inputs: { ndviValue: val, bandId: band.id, operation: 'classify' },
        targetAnswer,
        correctAnswer: targetAnswer,
        answerType: 'choice',
        options: KIDS_NDVI_BANDS.map((b) => b.id),
        tolerance: 0,
        unit: null,
        formulaKey: 'ndvi_classification',
      };
      break;
    }

    case 'weather': {
      const scenarios = [
        {
          params: { forecastRainMm: 55, forecastMaxTemp: 31, forecastMinTemp: 22 },
          correctActionId: 'drain_no_fert',
          qBn: 'আবহাওয়া পূর্বাভাসে আগামী ২৪ ঘণ্টায় ৫৫ মিলিমিটার ভারী বৃষ্টির সম্ভাবনা জানানো হয়েছে। একজন বুদ্ধিমান কৃষক হিসেবে আপনার কী করা উচিত?',
          qEn: 'A weather forecast predicts 55 mm of heavy rain in the next 24 hours. As a smart farmer, what should you do?',
          ansBn: 'জমির নালা খুলে দেওয়া এবং সার প্রয়োগ বন্ধ রাখা',
          ansEn: 'Open field drains and postpone fertilizer application',
        },
        {
          params: { forecastRainMm: 0, forecastMaxTemp: 38, forecastMinTemp: 24 },
          correctActionId: 'irrigate_dawn_dusk',
          qBn: 'আগামী দুই দিন তাপমাত্রা ৩৮ ডিগ্রি সেলসিয়াস (মাঝারি তাপপ্রবাহ) থাকবে। ফসলের সুরক্ষায় কোনটি সঠিক পদক্ষেপ?',
          qEn: 'Temperatures will reach 38°C (moderate heatwave) over the next two days. What is the correct protective action?',
          ansBn: 'সকালে বা বিকেলে সেচ দেওয়া এবং ধানের জমিতে ২-৩ সেমি পানি রাখা',
          ansEn: 'Irrigate in early morning or evening and maintain 2-3 cm water',
        },
        {
          params: { forecastRainMm: 0, forecastMaxTemp: 18, forecastMinTemp: 8 },
          correctActionId: 'cover_seedbed',
          qBn: 'শীতকালে রাতের সর্বনিম্ন তাপমাত্রা ৮ ডিগ্রি সেলসিয়াসে নেমে শৈত্যপ্রবাহ দেখা দিয়েছে। কচি বোরো বীজতলা বাঁচাতে কী করবেন?',
          qEn: 'Winter night temperatures drop to 8°C causing a cold wave. How will you protect tender Boro rice seedlings?',
          ansBn: 'রাতে স্বচ্ছ পলিথিন দিয়ে বীজতলা ঢেকে রাখা ও সকালে খুলে দেওয়া',
          ansEn: 'Cover nursery beds with clear polythene at night and remove in morning',
        },
      ];
      const sc = pick(scenarios);

      challenge = {
        id: `weather_challenge_${sc.correctActionId}_${seed}`,
        category: 'weather',
        tier: selectedTier,
        seed,
        question: { bn: sc.qBn, en: sc.qEn },
        context: { ...sc.params, correctActionId: sc.correctActionId, operation: 'decision' },
        inputs: { ...sc.params, correctActionId: sc.correctActionId, operation: 'decision' },
        targetAnswer: sc.correctActionId,
        correctAnswer: sc.correctActionId,
        answerType: 'choice',
        correctLabel: { bn: sc.ansBn, en: sc.ansEn },
        options: ['drain_no_fert', 'irrigate_dawn_dusk', 'cover_seedbed', 'routine_care'],
        tolerance: 0,
        unit: null,
        formulaKey: 'weather_action_rule',
      };
      break;
    }

    default:
      throw new Error(`Unknown challenge category: ${category}`);
  }

  // Generate 4 clean options if not already a choice question
  if (!challenge.options && typeof challenge.targetAnswer === 'number') {
    const ans = challenge.targetAnswer;
    const opts = new Set([ans]);
    const deltas = [1, -1, 2, -2, 5, -5, 10, -10, 3, -3, 4, -4];
    for (const d of deltas) {
      const candidate = ans + d;
      if (candidate > 0 && !opts.has(candidate)) {
        opts.add(candidate);
      }
      if (opts.size >= 4) break;
    }
    // Fallback if needed
    let counter = 1;
    while (opts.size < 4) {
      opts.add(ans + counter * 5);
      counter++;
    }
    const arr = Array.from(opts);
    // Deterministic shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    challenge.options = arr;
  }

  return challenge;
}

// ============================================================================
// 6. ANSWER VALIDATION & ERROR DIAGNOSTICS (F08)
// ============================================================================

const BN_DIGITS_MAP = { '০': 0, '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7, '৮': 8, '৯': 9 };

/**
 * Normalizes learner input and validates an answer against a challenge.
 * Supports both challenge object signature and direct (expected, submitted, tol) signature.
 */
export function validateKidsAnswer(challengeOrExpected, submittedAnswer, toleranceArg = 0) {
  if (challengeOrExpected == null) {
    return { isCorrect: false, error: 'MISSING_CHALLENGE', delta: Infinity, diagnosticCategory: 'MISSING_CHALLENGE', errorCategory: 'MISSING_CHALLENGE' };
  }

  // Polymorphic signature detection
  let challenge = challengeOrExpected;
  let isDirectNumeric = false;
  if (typeof challengeOrExpected === 'number' || (typeof challengeOrExpected === 'string' && !challengeOrExpected.targetAnswer && !challengeOrExpected.correctAnswer)) {
    isDirectNumeric = true;
    const expectedNum = Number(challengeOrExpected);
    challenge = {
      targetAnswer: expectedNum,
      correctAnswer: expectedNum,
      tolerance: toleranceArg || 0,
    };
  }

  const target = Number(challenge.targetAnswer ?? challenge.correctAnswer);

  // Normalize string numbers (e.g. '১৫' -> '15', ' 15 kg ' -> 15)
  let sanitized = String(submittedAnswer ?? '').trim();
  for (const [bnChar, enChar] of Object.entries(BN_DIGITS_MAP)) {
    sanitized = sanitized.replaceAll(bnChar, enChar);
  }

  if (challenge.answerType === 'choice') {
    const isCorrect = String(submittedAnswer).trim() === String(challenge.targetAnswer ?? challenge.correctAnswer).trim();
    return {
      isCorrect,
      submittedValue: submittedAnswer,
      expectedValue: challenge.targetAnswer ?? challenge.correctAnswer,
      diagnosticCategory: isCorrect ? null : 'INCORRECT_CHOICE',
      errorCategory: isCorrect ? null : 'INCORRECT_CHOICE',
    };
  }

  // Strip letters, units, currency symbols (keeping digits, dot, minus)
  sanitized = sanitized.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(sanitized);

  if (Number.isNaN(parsed)) {
    return {
      isCorrect: false,
      submittedValue: submittedAnswer,
      expectedValue: target,
      delta: Infinity,
      tolerance: toleranceArg || challenge.tolerance || 0,
      diagnosticCategory: 'GENERAL_MISCALCULATION',
      errorCategory: 'GENERAL_MISCALCULATION',
    };
  }

  // Calculate tolerance
  let tol = Number(toleranceArg || challenge.tolerance) || 0;
  // If called directly with a tolerance percentage parameter (e.g. 5 for 5%)
  if (isDirectNumeric && toleranceArg > 0 && toleranceArg <= 100) {
    tol = target === 0 ? 0.001 : Math.max(0.01, (target * toleranceArg) / 100);
  }

  const delta = Math.abs(parsed - target);
  const isCorrect = delta <= tol;

  if (isCorrect) {
    return {
      isCorrect: true,
      submittedValue: parsed,
      expectedValue: target,
      delta: 0,
      tolerance: tol,
      diagnosticCategory: null,
      errorCategory: null,
    };
  }

  // Diagnostic Categorization
  let diagnosticCategory = 'GENERAL_MISCALCULATION';
  const ctx = challenge.context || challenge.inputs || {};

  // 1. UNIT_CONFUSION / OPERATION_ERROR: Added instead of multiplied
  if (ctx.operation === 'multiply') {
    if (ctx.area !== undefined && ctx.rate !== undefined && parsed === (ctx.area + ctx.rate)) {
      diagnosticCategory = 'UNIT_CONFUSION';
    } else if (ctx.bucketsPerDay !== undefined && ctx.days !== undefined && parsed === (ctx.bucketsPerDay + ctx.days)) {
      diagnosticCategory = 'UNIT_CONFUSION';
    }
  }

  // 2. SPLIT_OMISSION: Forgot to divide by split count
  if ((ctx.operation === 'split_division' || ctx.splits) && ctx.totalDose !== undefined) {
    if (parsed === ctx.totalDose) {
      diagnosticCategory = 'SPLIT_OMISSION';
    }
  }

  // 3. INCOMPLETE_SUM: Missed an expense line item
  if (ctx.operation === 'roi_percent' || ctx.operation === 'two_plot_sum') {
    diagnosticCategory = 'INCOMPLETE_SUM';
  }

  // 4. NEGATIVE_PROFIT / CONFUSED_REVENUE_WITH_PROFIT
  if (ctx.operation === 'profit_calc' || ctx.operation === 'maund_profit') {
    if (ctx.revenue && (parsed === ctx.revenue || parsed === (ctx.expenses - ctx.revenue))) {
      diagnosticCategory = 'CONFUSED_REVENUE_WITH_PROFIT';
    }
  }

  // 5. MATH_ARITHMETIC: Near miss / calculation slip
  if (diagnosticCategory === 'GENERAL_MISCALCULATION') {
    const relativeError = target !== 0 ? delta / Math.abs(target) : delta;
    if (relativeError <= 0.25 || delta === 1 || delta === 2 || delta === 10) {
      diagnosticCategory = 'MATH_ARITHMETIC';
    }
  }

  return {
    isCorrect: false,
    submittedValue: parsed,
    expectedValue: target,
    delta,
    tolerance: tol,
    diagnosticCategory,
    errorCategory: diagnosticCategory,
  };
}

// ============================================================================
// 7. 5-STEP GROWTH-MINDSET EXPLANATORY FEEDBACK (F08)
// ============================================================================

/**
 * Generates a 5-step growth-mindset explanatory feedback structure in Bangla or English.
 */
export function generateExplanatoryFeedback(challenge, submittedAnswer, lang = 'en') {
  if (!challenge || typeof challenge !== 'object') {
    const isBn = lang === 'bn';
    const fallbackBn = 'কোনো চ্যালেঞ্জ পাওয়া যায়নি।';
    const fallbackEn = 'No challenge provided.';
    const tipBn = 'তারার পরামর্শ: একটি চ্যালেঞ্জ নির্বাচন করে উত্তর দাও।';
    const tipEn = 'Tara’s Tip: Select a challenge to begin.';
    const fallbackText = isBn ? fallbackBn : fallbackEn;
    const tipText = isBn ? tipBn : tipEn;
    return {
      isCorrect: false,
      diagnosticCategory: 'MISSING_CHALLENGE',
      errorCategory: 'MISSING_CHALLENGE',
      steps: {
        step1_formula: { bn: fallbackBn, en: fallbackEn },
        step2_calculation: { bn: fallbackBn, en: fallbackEn },
        step3_correctAnswer: { bn: fallbackBn, en: fallbackEn },
        step4_comparison: { bn: fallbackBn, en: fallbackEn },
        step5_taraInsight: { bn: tipBn, en: tipEn },
      },
      step1_formula: fallbackText,
      step2_calculation: fallbackText,
      step3_correctAnswer: fallbackText,
      step4_comparison: fallbackText,
      step5_taraInsight: tipText,
      bilingualSummary: {
        bn: fallbackBn,
        en: fallbackEn,
      },
      explanationText: fallbackText,
      taraInsight: tipText,
      formulaDisplay: fallbackText,
    };
  }

  const validation = validateKidsAnswer(challenge, submittedAnswer);
  const isBn = lang === 'bn';
  const unit = challenge.unit ? (isBn ? challenge.unit.bn : challenge.unit.en) : '';
  const target = challenge.targetAnswer ?? challenge.correctAnswer;

  const WEATHER_CHOICE_LABELS = {
    drain_no_fert: {
      bn: 'জমির নালা খুলে দেওয়া এবং সার প্রয়োগ বন্ধ রাখা',
      en: 'Open field drains and postpone fertilizer application',
    },
    irrigate_dawn_dusk: {
      bn: 'সকালে বা বিকেলে সেচ দেওয়া এবং ধানের জমিতে ২-৩ সেমি পানি রাখা',
      en: 'Irrigate in early morning or evening and maintain 2-3 cm water',
    },
    cover_seedbed: {
      bn: 'রাতে স্বচ্ছ পলিথিন দিয়ে বীজতলা ঢেকে রাখা ও সকালে খুলে দেওয়া',
      en: 'Cover nursery beds with clear polythene at night and remove in morning',
    },
    routine_care: {
      bn: 'মাঠে স্বাভাবিক পরিচর্যা চালিয়ে যাওয়া',
      en: 'Continue routine field activities',
    },
  };

  const resolveChoiceLabel = (choiceVal, isBengali) => {
    if (choiceVal == null || choiceVal === '' || typeof choiceVal === 'object') return null;
    const strVal = String(choiceVal).trim();
    const targetVal = challenge.targetAnswer ?? challenge.correctAnswer;
    if (strVal === String(targetVal).trim() && challenge.correctLabel) {
      return isBengali ? challenge.correctLabel.bn : challenge.correctLabel.en;
    }
    if (WEATHER_CHOICE_LABELS[strVal]) {
      return isBengali ? WEATHER_CHOICE_LABELS[strVal].bn : WEATHER_CHOICE_LABELS[strVal].en;
    }
    const ndviBand = KIDS_NDVI_BANDS.find((b) => b.id === strVal);
    if (ndviBand && ndviBand.label) {
      return isBengali ? ndviBand.label.bn : ndviBand.label.en;
    }
    return strVal;
  };

  const fmtBnVal = (v) => (typeof v === 'number' || /^-?\d+(\.\d+)?$/.test(String(v ?? '').trim())) ? bnNum(v) : String(v ?? '');
  const targetLabelBn = fmtBnVal(resolveChoiceLabel(target, true) ?? target);
  const targetLabelEn = resolveChoiceLabel(target, false) || target;

  const rawSubmittedBn = resolveChoiceLabel(validation.submittedValue, true);
  const submittedLabelBn = rawSubmittedBn != null ? fmtBnVal(rawSubmittedBn) : null;
  const submittedLabelEn = resolveChoiceLabel(validation.submittedValue, false);

  if (validation.isCorrect) {
    const steps = {
      step1_formula: {
        bn: 'চমৎকার! তুমি সঠিক সূত্রটি নিখুঁতভাবে প্রয়োগ করেছ।',
        en: 'Brilliant! You applied the formula perfectly.',
      },
      step2_calculation: {
        bn: unit ? `তোমার হিসাব: ${targetLabelBn} ${unit}` : `তোমার হিসাব: ${targetLabelBn}`,
        en: unit ? `Your calculation: ${targetLabelEn} ${unit}` : `Your calculation: ${targetLabelEn}`,
      },
      step3_correctAnswer: {
        bn: unit ? `সঠিক উত্তর: ${targetLabelBn} ${unit}` : `সঠিক উত্তর: ${targetLabelBn}`,
        en: unit ? `Correct Answer: ${targetLabelEn} ${unit}` : `Correct Answer: ${targetLabelEn}`,
      },
      step4_comparison: {
        bn: 'অভিনন্দন! তোমার উত্তর ১০০% সঠিক হয়েছে।',
        en: 'Congratulations! Your answer is 100% accurate.',
      },
      step5_taraInsight: {
        bn: 'তারার উৎসাহ: তুমি একজন দক্ষ ও আত্মবিশ্বাসী খুদে কৃষক হয়ে উঠছ!',
        en: 'Tara’s Encouragement: You are becoming a skilled and confident young farmer!',
      },
    };

    return {
      isCorrect: true,
      diagnosticCategory: null,
      errorCategory: null,
      steps,
      step1_formula: isBn ? steps.step1_formula.bn : steps.step1_formula.en,
      step2_calculation: isBn ? steps.step2_calculation.bn : steps.step2_calculation.en,
      step3_correctAnswer: isBn ? steps.step3_correctAnswer.bn : steps.step3_correctAnswer.en,
      step4_comparison: isBn ? steps.step4_comparison.bn : steps.step4_comparison.en,
      step5_taraInsight: isBn ? steps.step5_taraInsight.bn : steps.step5_taraInsight.en,
      bilingualSummary: {
        bn: 'সাবাশ! একদম সঠিক উত্তর!',
        en: 'Well done! Spot-on answer!',
      },
      explanationText: isBn ? steps.step4_comparison.bn : steps.step4_comparison.en,
      taraInsight: isBn ? steps.step5_taraInsight.bn : steps.step5_taraInsight.en,
      formulaDisplay: isBn ? steps.step1_formula.bn : steps.step1_formula.en,
    };
  }

  // Diagnostic error branching for incorrect response
  const diag = validation.diagnosticCategory || 'GENERAL_MISCALCULATION';
  const ctx = challenge.context || challenge.inputs || {};

  // Step 1: Formula and Given
  let step1Bn = 'সূত্র ও দেওয়া তথ্য: ';
  let step1En = 'Formula & Given: ';

  if (challenge.formulaKey === 'area_x_rate') {
    const area = ctx.area ?? '';
    const rate = ctx.rate ?? '';
    step1Bn += `মোট পরিমাণ = জমির পরিমাণ × প্রতি এককের হার। জমি = ${fmtBnVal(area)} বিঘা, হার = ${fmtBnVal(rate)} কেজি/বিঘা।`;
    step1En += `Total = Land Area × Rate per unit. Land = ${area} bighas, Rate = ${rate} kg/bigha.`;
  } else if (challenge.formulaKey === 'daily_water') {
    step1Bn += `মোট পানি = প্রতিদিনের বালতি × দিনের সংখ্যা। প্রতিদিন = ${fmtBnVal(ctx.bucketsPerDay)} বালতি, দিন = ${fmtBnVal(ctx.days)} দিন।`;
    step1En += `Total Water = Daily Buckets × Number of Days. Daily = ${ctx.bucketsPerDay} buckets, Days = ${ctx.days} days.`;
  } else if (challenge.formulaKey === 'fertilizer_split') {
    step1Bn += `কিস্তির পরিমাণ = মোট সারের পরিমাণ ÷ কিস্তির সংখ্যা। মোট ইউরিয়া = ${fmtBnVal(ctx.totalDose)} কেজি, কিস্তি = ৩টি।`;
    step1En += `Split Dose = Total Fertilizer ÷ Number of Splits. Total Urea = ${ctx.totalDose} kg, Splits = 3.`;
  } else if (challenge.formulaKey === 'pump_runtime') {
    step1Bn += `পাম্প চলার সময় = মোট পানির পরিমাণ ÷ পাম্পের গতি (প্রতি ঘণ্টায়)। পানি = ${fmtBnVal(ctx.volumeLiters)} লিটার, পাম্প = ৩০,০০০ লিটার/ঘণ্টা।`;
    step1En += `Runtime Hours = Water Volume ÷ Pump Discharge Rate. Water = ${fmtEn(ctx.volumeLiters)} L, Pump = 30,000 L/hr.`;
  } else if (challenge.formulaKey === 'revenue_minus_expenses' || challenge.formulaKey === 'maund_revenue_profit') {
    step1Bn += 'লাভ = মোট আয় − মোট খরচ।';
    step1En += 'Profit = Total Revenue − Total Expenses.';
  } else if (challenge.formulaKey === 'bigha_to_katha') {
    step1Bn += '১ বিঘা = ২০ কাঠা। মোট কাঠা = বিঘা × ২০।';
    step1En += '1 bigha = 20 kathas. Total Kathas = Bighas × 20.';
  } else if (challenge.formulaKey === 'bigha_to_decimal') {
    step1Bn += '১ বিঘা = ৩৩ শতক। মোট শতক = বিঘা × ৩৩।';
    step1En += '1 bigha = 33 decimals. Total Decimals = Bighas × 33.';
  } else if (challenge.formulaKey === 'ndvi_classification') {
    step1Bn += `উপগ্রহের এনডিভিআই (NDVI) সূচক -১.০ থেকে +১.০ এর মধ্যে উদ্ভিদের ঘনত্ব ও স্বাস্থ্য প্রকাশ করে। প্রাপ্ত মান = ${ctx.ndviValue != null ? fmtBnVal(ctx.ndviValue) : ''}।`;
    step1En += `Satellite NDVI index ranges from -1.0 to +1.0 indicating vegetation density and health. Observed value = ${ctx.ndviValue ?? ''}.`;
  } else if (challenge.formulaKey === 'weather_action_rule') {
    step1Bn += 'বাংলাদেশ আবহাওয়া অধিদপ্তরের সতর্কবার্তা ও কৃষি আবহাওয়া গাইডলাইন অনুসরণ করুন।';
    step1En += 'Follow Bangladesh Meteorological Department (BMD) agrometeorological risk advisories.';
  } else {
    step1Bn += 'সমস্যার মূল শর্ত এবং ধাপগুলো লক্ষ করো।';
    step1En += 'Review the given problem parameters and calculation steps.';
  }

  // Step 2: Step-by-step Calculation
  let step2Bn = 'হিসাব: ';
  let step2En = 'Calculation: ';

  if (challenge.formulaKey === 'area_x_rate') {
    step2Bn += `${fmtBnVal(ctx.area)} × ${fmtBnVal(ctx.rate)} = ${fmtBnVal(target)} ${unit}।`;
    step2En += `${ctx.area} × ${ctx.rate} = ${target} ${unit}.`;
  } else if (challenge.formulaKey === 'daily_water') {
    step2Bn += `${fmtBnVal(ctx.bucketsPerDay)} × ${fmtBnVal(ctx.days)} = ${fmtBnVal(target)} ${unit}।`;
    step2En += `${ctx.bucketsPerDay} × ${ctx.days} = ${target} ${unit}.`;
  } else if (challenge.formulaKey === 'fertilizer_split') {
    step2Bn += `${fmtBnVal(ctx.totalDose)} ÷ ৩ = ${fmtBnVal(target)} ${unit}।`;
    step2En += `${ctx.totalDose} ÷ 3 = ${target} ${unit}.`;
  } else if (challenge.formulaKey === 'pump_runtime') {
    step2Bn += `${fmtBnVal(ctx.volumeLiters)} ÷ ৩০,০০০ = ${fmtBnVal(target)} ${unit}।`;
    step2En += `${fmtEn(ctx.volumeLiters)} ÷ 30,000 = ${target} ${unit}.`;
  } else if (challenge.formulaKey === 'revenue_minus_expenses') {
    step2Bn += `${fmtBnVal(ctx.revenue)} − ${fmtBnVal(ctx.expenses)} = ${fmtBnVal(target)} ${unit}।`;
    step2En += `${fmtEn(ctx.revenue)} − ${fmtEn(ctx.expenses)} = ${fmtEn(target)} ${unit}.`;
  } else if (challenge.formulaKey === 'ndvi_classification' || challenge.formulaKey === 'weather_action_rule') {
    step2Bn += `সঠিক সিদ্ধান্ত হলো: ${targetLabelBn}।`;
    step2En += `The correct action is: ${targetLabelEn}.`;
  } else {
    step2Bn += unit ? `সঠিক নিয়ম অনুযায়ী ফলাফল আসে ${fmtBnVal(target)} ${unit}।` : `সঠিক নিয়ম অনুযায়ী ফলাফল আসে ${fmtBnVal(target)}।`;
    step2En += unit ? `Following standard formulas yields ${target} ${unit}.` : `Following standard formulas yields ${target}.`;
  }

  // Step 3: Correct Answer
  const step3Bn = unit ? `সঠিক উত্তর: ${targetLabelBn} ${unit}` : `সঠিক উত্তর: ${targetLabelBn}`;
  const step3En = unit ? `Correct Answer: ${targetLabelEn} ${unit}` : `Correct Answer: ${targetLabelEn}`;

  // Step 4: Comparison & Diagnostic Guidance
  const isInvalidInput = validation.submittedValue == null ||
    validation.submittedValue === '' ||
    Number.isNaN(validation.submittedValue) ||
    typeof validation.submittedValue === 'object';

  let step4Bn;
  let step4En;

  if (isInvalidInput) {
    step4Bn = 'তুমি কোনো সংখ্যা লেখনি। ';
    step4En = 'You did not enter a valid number. ';
  } else {
    const valDisplayBn = submittedLabelBn || fmtBnVal(validation.submittedValue);
    const valDisplayEn = submittedLabelEn || validation.submittedValue;
    step4Bn = unit ? `তোমার উত্তর ছিল ${valDisplayBn} ${unit}। ` : `তোমার উত্তর ছিল ${valDisplayBn}। `;
    step4En = unit ? `You entered ${valDisplayEn} ${unit}. ` : `You entered ${valDisplayEn}. `;
  }

  switch (diag) {
    case 'UNIT_CONFUSION':
      step4Bn += 'তুমি সংখ্যা দুটি যোগ করে ফেলেছ! মনে রেখো, প্রতিটি বিঘার জন্য আলাদাভাবে বীজ বা সার লাগে, তাই এখানে যোগ নয়, গুণ করতে হবে। তুমি খুব ভালো চেষ্টা করেছ!';
      step4En += 'You added the numbers instead of multiplying! Remember, each bigha needs seeds separately, so we multiply. Great attempt!';
      break;
    case 'SPLIT_OMISSION':
      step4Bn += 'তুমি পুরো মৌসুমের মোট সার লিখে ফেলেছ। মনে রেখো, ইউরিয়া ৩টি সমান কিস্তিতে দিতে হয়, তাই মোট সারকে ৩ দিয়ে ভাগ করতে হবে!';
      step4En += 'You entered the full season dose. Remember, Urea is split into 3 equal applications, so divide the total by 3!';
      break;
    case 'INCOMPLETE_SUM':
      step4Bn += 'তোমার হিসাবে খরচের একটি অংশ বাদ পড়ে গেছে। মোট খরচের সময় সবকটি উপাদানের খরচ যোগ করতে হয়। আরেকবার চেষ্টা করো!';
      step4En += 'One cost item was omitted in your summation. Total expenses must sum every single cost item. Try once more!';
      break;
    case 'NEGATIVE_PROFIT':
    case 'CONFUSED_REVENUE_WITH_PROFIT':
      step4Bn += 'তুমি খরচ থেকে আয় বিয়োগ করে ফেলেছ, বা মোট আয়কে লাভ মনে করেছ। লাভ = মোট আয় − মোট খরচ!';
      step4En += 'You subtracted income from expenses, or confused revenue with profit. Profit = Revenue − Expenses!';
      break;
    case 'MATH_ARITHMETIC':
      step4Bn += 'তুমি সঠিক উত্তরের খুবই কাছাকাছি ছিলে! সামান্য গুণ বা যোগে ছোট ভুল হয়েছে। আরেকটু মনযোগ দিলেই তুমি পারবে!';
      step4En += 'You were extremely close! Just a tiny arithmetic calculation slip. With a little focus, you’ve got this!';
      break;
    default:
      step4Bn += 'ভুল হওয়া শেখারই অংশ! উপরের ধাপগুলো দেখে আরেকবার চেষ্টা করে দেখো, তুমি অবশ্যই পারবে!';
      step4En += 'Mistakes are simply steps to learning! Review the calculation above and give it another shot—you can do it!';
      break;
  }

  // Step 5: Tara's Agricultural & Space Insight
  let step5Bn = 'তারার কৃষি টিপস: ';
  let step5En = 'Tara’s Agricultural Tip: ';

  if (challenge.category === 'seed') {
    step5Bn += 'জমিতে পরিমিত বীজ বোনা খুব জরুরি। বেশি বীজ দিলে গাছগুলো আলো-বাতাস না পেয়ে দুর্বল হয়, আর কম বীজ দিলে ফলন কমে যায়। সঠিক হিসাবেই লুকিয়ে আছে বাম্পার ফলন!';
    step5En += 'Exact seeding is crucial! Over-seeding crowds crops of sunlight and stunts growth, while under-seeding wastes precious land. Accurate math ensures a bumper harvest!';
  } else if (challenge.category === 'fertilizer') {
    step5Bn += 'গাছের বিভিন্ন বয়সে খাদ্য লাগে। তাই সব ইউরিয়া একসাথে না দিয়ে কিস্তিতে দিলে শিকড় সার সহজে গ্রহণ করে এবং অপচয় বাঁচে!';
    step5En += 'Crops need nutrients at different growth stages. Splitting Urea applications allows roots to feed steadily and prevents wasteful loss!';
  } else if (challenge.category === 'water') {
    step5Bn += 'পানির অপর নাম জীবন, কিন্তু অতিরিক্ত সেচে শিকড় পচে যায় এবং মাটির নিচের পানির অপচয় হয়। পরিমিত সেচ দিলে বিদ্যুৎ, ডিজেল ও পানি তিনটেই বাঁচে!';
    step5En += 'Water is life, but over-irrigation rots roots and depletes aquifers. Measured watering saves electricity, diesel, and groundwater!';
  } else if (challenge.category === 'finance') {
    step5Bn += 'একজন সফল কৃষক শুধু ফসল ফলান না, লাভ-লোকসানের হিসাবও রাখেন। মোট খরচ কমিয়ে বেশি দামে বিক্রি করাই বুদ্ধিমান কৃষকের কৌশল!';
    step5En += 'A successful farmer tracks every expense and income. Minimizing input costs and smart market timing creates a prosperous farm!';
  } else if (challenge.category === 'land') {
    step5Bn += 'শতক, কাঠা ও বিঘা হলো বাংলার সনাতন ঐতিহ্যবাহী ভূমি পরিমাপ। এই হিসাব জানা থাকলে কেউ কখনো ওজনে বা জমিতে ঠকাতে পারবে না!';
    step5En += 'Decimals, Kathas, and Bighas are the authentic land units of Bangladesh. Knowing them ensures fair trades and smart farming!';
  } else {
    step5Bn += 'মহাকাশ থেকে উপগ্রহ দিয়ে আমরা যখন মাঠ দেখি, বিজ্ঞানের এই সহজ হিসাবগুলো দিয়েই পুরো পৃথিবীর খাদ্য নিরাপত্তা নিশ্চিত হয়!';
    step5En += 'When we look at fields from satellite orbits, these simple STEM calculations safeguard food security across the Earth!';
  }

  const steps = {
    step1_formula: { bn: step1Bn, en: step1En },
    step2_calculation: { bn: step2Bn, en: step2En },
    step3_correctAnswer: { bn: step3Bn, en: step3En },
    step4_comparison: { bn: step4Bn, en: step4En },
    step5_taraInsight: { bn: step5Bn, en: step5En },
  };

  return {
    isCorrect: false,
    diagnosticCategory: diag,
    errorCategory: diag,
    steps,
    step1_formula: isBn ? steps.step1_formula.bn : steps.step1_formula.en,
    step2_calculation: isBn ? steps.step2_calculation.bn : steps.step2_calculation.en,
    step3_correctAnswer: isBn ? steps.step3_correctAnswer.bn : steps.step3_correctAnswer.en,
    step4_comparison: isBn ? steps.step4_comparison.bn : steps.step4_comparison.en,
    step5_taraInsight: isBn ? steps.step5_taraInsight.bn : steps.step5_taraInsight.en,
    bilingualSummary: {
      bn: step4Bn,
      en: step4En,
    },
    explanationText: isBn ? steps.step4_comparison.bn : steps.step4_comparison.en,
    taraInsight: isBn ? steps.step5_taraInsight.bn : steps.step5_taraInsight.en,
    formulaDisplay: isBn ? steps.step1_formula.bn : steps.step1_formula.en,
  };
}

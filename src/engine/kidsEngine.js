/**
 * FieldShift Kids – Learn, Play & Grow (তারার স্বপ্ন-খামার / Tara's Dream Farm)
 * Pure Gamification, Progression, Mini-Game & Science Simulation Engine
 *
 * Zero React or DOM dependencies. Safe for Node.js tests (`node --test`) and browsers.
 */

import {
  KIDS_WORLDS,
  KIDS_BADGES,
  KIDS_PESTS,
  KIDS_SCIENCE_MODULES,
} from '../data/kidsData.js';
import {
  KIDS_NDVI_BANDS,
  generateKidsChallenge,
} from './kidsMath.js';

export const KIDS_STORAGE_KEY = 'fieldshift-360.kids.v1';

// ============================================================================
// 1. LEVEL CURVE & GAMIFICATION (F11)
// ============================================================================

export const KIDS_LEVELS = [
  { level: 1, minXp: 0, icon: '🌱', title: { bn: 'অঙ্কুর', en: 'Sprout' } },
  { level: 2, minXp: 100, icon: '🌿', title: { bn: 'চারা', en: 'Seedling' } },
  { level: 3, minXp: 300, icon: '🌾', title: { bn: 'চাষি', en: 'Cultivator' } },
  { level: 4, minXp: 600, icon: '🚜', title: { bn: 'দক্ষ কৃষক', en: 'Skilled Grower' } },
  { level: 5, minXp: 950, icon: '🛰️', title: { bn: 'স্মার্ট কৃষক', en: 'Smart Farmer' } },
  { level: 6, minXp: 1400, icon: '🌟', title: { bn: 'খামার পথপ্রদর্শক', en: 'Farm Pathfinder' } },
  { level: 7, minXp: 2000, icon: '🏆', title: { bn: 'মহা কৃষিবিজ্ঞানী', en: 'Master Agronomist' } },
];

/**
 * Computes learner level, title, and progress bar fraction from XP.
 */
export function calculateLevelFromXp(xp = 0) {
  const numericXp = Number(xp);
  const safeXp = Number.isFinite(numericXp) && numericXp > 0 ? Math.floor(numericXp) : 0;

  let current = KIDS_LEVELS[0];
  for (const tier of KIDS_LEVELS) {
    if (safeXp >= tier.minXp) current = tier;
  }

  const next = KIDS_LEVELS.find((l) => l.level === current.level + 1) ?? null;
  if (!next) {
    return {
      level: current.level,
      title: current.title,
      icon: current.icon,
      xp: safeXp,
      currentLevelXp: current.minXp,
      nextLevelXp: current.minXp,
      xpIntoLevel: safeXp - current.minXp,
      xpNeededForNext: 0,
      isMaxLevel: true,
      progressFraction: 1.0,
    };
  }

  const span = next.minXp - current.minXp;
  const into = safeXp - current.minXp;
  const fraction = span > 0 ? Math.max(0, Math.min(1, into / span)) : 0;

  return {
    level: current.level,
    title: current.title,
    icon: current.icon,
    xp: safeXp,
    currentLevelXp: current.minXp,
    nextLevelXp: next.minXp,
    xpIntoLevel: into,
    xpNeededForNext: Math.max(0, next.minXp - safeXp),
    isMaxLevel: false,
    progressFraction: Math.round(fraction * 1000) / 1000,
  };
}

/**
 * Evaluates which badges should be newly unlocked given a learner profile state.
 * Never returns badges already present in `profileState.badges`.
 */
export function evaluateBadges(profileState = {}) {
  const p = profileState && typeof profileState === 'object' ? profileState : {};
  const existing = new Set(Array.isArray(p.badges) ? p.badges : []);
  const completed = new Set(Array.isArray(p.completedMissions) ? p.completedMissions : []);
  const mg = p.miniGames && typeof p.miniGames === 'object' ? p.miniGames : {};

  const hasAll = (ids) => ids.every((id) => completed.has(id));
  const newlyUnlocked = [];
  const grant = (id) => {
    if (KIDS_BADGES[id] && !existing.has(id) && !newlyUnlocked.includes(id)) {
      newlyUnlocked.push(id);
    }
  };

  // Core 7 progression badges
  if ((p.completedSeedMissions ?? 0) >= 3 || hasAll(['m1_crops', 'm2_soil', 'm3_seasons'])) {
    grant('seed_master');
  }
  if (p.completedFloodMission === true || (mg.pipelinesSolved ?? 0) >= 1 || completed.has('m8_water')) {
    grant('water_guardian');
  }
  if (p.completedSoilMission === true || (mg.chemLabsSolved?.length ?? 0) >= 1 || completed.has('m9_fert')) {
    grant('soil_doctor');
  }
  if (p.completedNdviMission === true || hasAll(['m4_satellites', 'm5_ndvi', 'm6_weather'])) {
    grant('satellite_scout');
  }
  if (
    (p.marketProfit ?? 0) >= 5000 ||
    (mg.marketBestProfit ?? 0) >= 500 ||
    (mg.marketTrades ?? 0) >= 3 ||
    hasAll(['m10_budget', 'm11_market', 'm12_profit'])
  ) {
    grant('market_maven');
  }
  if (p.solvedAllMath === true || hasAll(['m7_seeds', 'm8_water', 'm9_fert'])) {
    grant('math_genius');
  }
  if (
    completed.size >= 12 ||
    hasAll(KIDS_WORLDS.flatMap((w) => w.missions.map((m) => m.id)))
  ) {
    grant('super_agronomist');
  }

  // Science, Eco & Mini-Game specialty badges (earned strictly via those activities)
  if ((mg.bioLivingCorrect ?? 0) >= 4 || (mg.bioChainsSolved?.length ?? 0) >= 1) {
    grant('bio_detective');
  }
  if ((mg.chemLabsSolved?.length ?? 0) >= 2) {
    grant('chem_wizard');
  }
  const spaceCount =
    (mg.cubesatsLaunched?.length ?? 0) +
    (mg.waterCyclesSolved ?? 0) +
    (mg.rampRacesRun ?? 0) +
    (mg.paperPlanesFlown ?? 0);
  if (spaceCount >= 2) {
    grant('space_engineer');
  }
  if ((p.completedIpmMissions ?? 0) >= 2 || (mg.ipmCorrect ?? 0) >= 3) {
    grant('eco_defender');
  }
  if ((mg.plantsHarvested ?? 0) >= 1) {
    grant('climate_hero');
  }

  return newlyUnlocked;
}

// ============================================================================
// 2. SAFE STORAGE & PROFILE PERSISTENCE
// ============================================================================

const memoryStorageMap = new Map();
const memoryFallbackStorage = {
  getItem: (key) => (memoryStorageMap.has(key) ? memoryStorageMap.get(key) : null),
  setItem: (key, val) => { memoryStorageMap.set(key, String(val)); },
  removeItem: (key) => { memoryStorageMap.delete(key); },
};

function resolveStorage(customStorage) {
  if (customStorage && typeof customStorage.getItem === 'function') {
    return customStorage;
  }
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Restricted browser contexts fall back cleanly
  }
  return memoryFallbackStorage;
}

export function createDefaultKidsProfile() {
  return {
    version: 1,
    learnerName: '',
    avatarId: 'rahimu',
    difficulty: 'beginner',
    xp: 0,
    level: 1,
    badges: [],
    completedMissions: [],
    missionStars: {},
    completedSeedMissions: 0,
    completedNdviMission: false,
    completedFloodMission: false,
    completedSoilMission: false,
    completedIpmMissions: 0,
    solvedAllMath: false,
    marketProfit: 0,
    miniGames: {
      marketTrades: 0,
      marketBestProfit: 0,
      plantsHarvested: 0,
      pipelinesSolved: 0,
      ipmCorrect: 0,
      chemLabsSolved: [],
      bioLivingCorrect: 0,
      bioChainsSolved: [],
      cubesatsLaunched: [],
      waterCyclesSolved: 0,
      rampRacesRun: 0,
      paperPlanesFlown: 0,
    },
    dreamStars: {},
    updatedAt: null,
  };
}

function normalizeProfile(raw) {
  const base = createDefaultKidsProfile();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

  const difficulty = ['beginner', 'intermediate', 'advanced'].includes(raw.difficulty)
    ? raw.difficulty
    : 'beginner';
  const xpNum = Number(raw.xp);
  const xp = Number.isFinite(xpNum) && xpNum >= 0 ? Math.floor(xpNum) : 0;
  const lvlInfo = calculateLevelFromXp(xp);
  const rawMg = raw.miniGames && typeof raw.miniGames === 'object' ? raw.miniGames : {};

  return {
    ...base,
    learnerName: typeof raw.learnerName === 'string' ? raw.learnerName.slice(0, 48) : '',
    avatarId: typeof raw.avatarId === 'string' && raw.avatarId ? raw.avatarId : 'rahimu',
    difficulty,
    xp,
    level: lvlInfo.level,
    badges: Array.isArray(raw.badges) ? [...new Set(raw.badges.filter((b) => typeof b === 'string'))] : [],
    completedMissions: Array.isArray(raw.completedMissions)
      ? [...new Set(raw.completedMissions.filter((m) => typeof m === 'string'))]
      : [],
    missionStars: raw.missionStars && typeof raw.missionStars === 'object' && !Array.isArray(raw.missionStars)
      ? { ...raw.missionStars }
      : {},
    completedSeedMissions: Math.max(0, Number(raw.completedSeedMissions) || 0),
    completedNdviMission: Boolean(raw.completedNdviMission),
    completedFloodMission: Boolean(raw.completedFloodMission),
    completedSoilMission: Boolean(raw.completedSoilMission),
    completedIpmMissions: Math.max(0, Number(raw.completedIpmMissions) || 0),
    solvedAllMath: Boolean(raw.solvedAllMath),
    marketProfit: Number(raw.marketProfit) || 0,
    miniGames: {
      marketTrades: Math.max(0, Number(rawMg.marketTrades) || 0),
      marketBestProfit: Number(rawMg.marketBestProfit) || 0,
      plantsHarvested: Math.max(0, Number(rawMg.plantsHarvested) || 0),
      pipelinesSolved: Math.max(0, Number(rawMg.pipelinesSolved) || 0),
      ipmCorrect: Math.max(0, Number(rawMg.ipmCorrect) || 0),
      chemLabsSolved: Array.isArray(rawMg.chemLabsSolved) ? [...new Set(rawMg.chemLabsSolved)] : [],
      bioLivingCorrect: Math.max(0, Number(rawMg.bioLivingCorrect) || 0),
      bioChainsSolved: Array.isArray(rawMg.bioChainsSolved) ? [...new Set(rawMg.bioChainsSolved)] : [],
      cubesatsLaunched: Array.isArray(rawMg.cubesatsLaunched) ? [...new Set(rawMg.cubesatsLaunched)] : [],
      waterCyclesSolved: Math.max(0, Number(rawMg.waterCyclesSolved) || 0),
      rampRacesRun: Math.max(0, Number(rawMg.rampRacesRun) || 0),
      paperPlanesFlown: Math.max(0, Number(rawMg.paperPlanesFlown) || 0),
    },
    dreamStars: raw.dreamStars && typeof raw.dreamStars === 'object' && !Array.isArray(raw.dreamStars)
      ? { ...raw.dreamStars }
      : {},
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * Safely reads learner profile from localStorage (or in-memory store in Node).
 */
export function readKidsProfile(customStorage) {
  const storage = resolveStorage(customStorage);
  try {
    const rawStr = storage.getItem(KIDS_STORAGE_KEY);
    if (!rawStr) return createDefaultKidsProfile();
    const parsed = JSON.parse(rawStr);
    return normalizeProfile(parsed);
  } catch {
    return createDefaultKidsProfile();
  }
}

/**
 * Safely writes learner profile with quota protection.
 */
export function writeKidsProfile(profile, customStorage) {
  const storage = resolveStorage(customStorage);
  const clean = normalizeProfile({ ...profile, updatedAt: new Date().toISOString() });
  try {
    storage.setItem(KIDS_STORAGE_KEY, JSON.stringify(clean));
    return { ok: true, profile: clean };
  } catch (err) {
    return { ok: false, error: err?.name || 'STORAGE_WRITE_FAILED', profile: clean };
  }
}

/**
 * Clears learner profile and returns a fresh default profile.
 */
export function resetKidsProfile(customStorage) {
  const storage = resolveStorage(customStorage);
  try {
    storage.removeItem?.(KIDS_STORAGE_KEY);
  } catch {
    // ignore storage restriction
  }
  return createDefaultKidsProfile();
}

/**
 * Applies a mission completion, awards XP, updates progress flags, and unlocks any new badges.
 */
export function applyMissionCompletion(profile, { missionId, xpReward = 40, stars = 3, solvedMath = false } = {}) {
  const next = normalizeProfile(profile);
  const alreadyCompleted = next.completedMissions.includes(missionId);
  const earnedXp = alreadyCompleted ? Math.round(xpReward * 0.25) : xpReward;

  next.xp += Math.max(0, earnedXp);
  next.level = calculateLevelFromXp(next.xp).level;
  if (missionId && !alreadyCompleted) {
    next.completedMissions.push(missionId);
  }
  if (missionId) {
    next.missionStars[missionId] = Math.max(next.missionStars[missionId] ?? 0, Math.min(3, Math.max(1, stars)));
  }

  if (['m1_crops', 'm2_soil', 'm3_seasons', 'm7_seeds'].includes(missionId)) {
    next.completedSeedMissions += 1;
  }
  if (missionId === 'm5_ndvi' || missionId === 'm4_satellites') {
    next.completedNdviMission = true;
  }
  if (missionId === 'm6_weather' || missionId === 'm8_water') {
    next.completedFloodMission = true;
  }
  if (missionId === 'm2_soil' || missionId === 'm9_fert') {
    next.completedSoilMission = true;
  }
  if (solvedMath && next.completedMissions.filter((id) => ['m7_seeds', 'm8_water', 'm9_fert'].includes(id)).length >= 3) {
    next.solvedAllMath = true;
  }

  const newlyUnlocked = evaluateBadges(next);
  if (newlyUnlocked.length > 0) {
    next.badges = [...new Set([...next.badges, ...newlyUnlocked])];
  }

  return { profile: next, earnedXp, newlyUnlocked };
}

/**
 * Awards mini-game / science lab activity XP and evaluates newly unlocked badges.
 */
export function applyActivityProgress(profile, { xpDelta = 0, miniGamePatch = {}, flags = {} } = {}) {
  const next = normalizeProfile(profile);
  next.xp += Math.max(0, Math.round(Number(xpDelta) || 0));
  next.level = calculateLevelFromXp(next.xp).level;

  for (const [key, val] of Object.entries(miniGamePatch)) {
    if (Array.isArray(next.miniGames[key]) && typeof val === 'string') {
      if (!next.miniGames[key].includes(val)) next.miniGames[key].push(val);
    } else if (typeof next.miniGames[key] === 'number' && typeof val === 'number') {
      if (key === 'marketBestProfit') {
        next.miniGames[key] = Math.max(next.miniGames[key], val);
      } else {
        next.miniGames[key] += val;
      }
    }
  }

  if (typeof flags.marketProfit === 'number') {
    next.marketProfit += flags.marketProfit;
  }
  if (typeof flags.completedIpmMissions === 'number') {
    next.completedIpmMissions += flags.completedIpmMissions;
  }
  if (flags.completedSoilMission) next.completedSoilMission = true;
  if (flags.completedFloodMission) next.completedFloodMission = true;
  if (flags.completedNdviMission) next.completedNdviMission = true;

  const newlyUnlocked = evaluateBadges(next);
  if (newlyUnlocked.length > 0) {
    next.badges = [...new Set([...next.badges, ...newlyUnlocked])];
  }

  return { profile: next, newlyUnlocked };
}

// ============================================================================
// 3. WORLD PROGRESSION & MISSION CHALLENGE ADAPTER
// ============================================================================

export function getWorldProgress(world, profile, { strictUnlock = false } = {}) {
  const p = normalizeProfile(profile);
  const completedSet = new Set(p.completedMissions);
  const missions = Array.isArray(world?.missions) ? world.missions : [];
  const completedCount = missions.filter((m) => completedSet.has(m.id)).length;
  const totalCount = missions.length;
  const isCompleted = totalCount > 0 && completedCount >= totalCount;

  let prerequisiteMet = true;
  if (world?.unlockRequirement?.type === 'world') {
    const reqWorld = KIDS_WORLDS.find((w) => w.id === world.unlockRequirement.worldId);
    if (reqWorld) {
      prerequisiteMet = reqWorld.missions.every((m) => completedSet.has(m.id));
    }
  }

  const starsEarned = missions.reduce((sum, m) => sum + (p.missionStars[m.id] ?? 0), 0);
  const maxStars = totalCount * 3;

  return {
    worldId: world?.id,
    completedCount,
    totalCount,
    isCompleted,
    prerequisiteMet,
    isUnlocked: strictUnlock ? prerequisiteMet : true,
    starsEarned,
    maxStars,
  };
}

const WEATHER_CHOICE_CARDS = {
  drain_no_fert: {
    icon: '🚧',
    bn: 'জমির নালা খুলে দেওয়া ও সার না দেওয়া',
    en: 'Open field drains & postpone fertilizer',
  },
  irrigate_dawn_dusk: {
    icon: '🌅',
    bn: 'সকাল/বিকেলে সেচ ও জমিতে ২-৩ সেমি পানি রাখা',
    en: 'Irrigate at dawn/dusk & keep 2–3 cm water',
  },
  cover_seedbed: {
    icon: '🛡️',
    bn: 'রাতে স্বচ্ছ পলিথিনে বীজতলা ঢেকে রাখা',
    en: 'Cover seedbed with clear polythene at night',
  },
  routine_care: {
    icon: '🌾',
    bn: 'মাঠে স্বাভাবিক পরিচর্যা চালিয়ে যাওয়া',
    en: 'Continue routine field care',
  },
};

/**
 * Resolves a mission round's math_category into a concrete challenge object from kidsMath.js,
 * complete with bilingual choice cards for UI rendering when answerType === 'choice'.
 */
export function buildMissionRoundChallenge(round, tier = 'beginner', seed = 42) {
  if (!round || round.type !== 'math_category') return null;

  const catMap = {
    seed: 'seed',
    convert: 'land',
    land: 'land',
    profit: 'finance',
    finance: 'finance',
    water: 'water',
    fertilizer: 'fertilizer',
    ndvi: 'ndvi',
    weather: 'weather',
  };
  const mathCategory = catMap[round.category] || 'seed';
  const ch = generateKidsChallenge({ category: mathCategory, tier, seed });

  let choiceCards = null;
  if (ch.answerType === 'choice' && Array.isArray(ch.options)) {
    if (ch.category === 'ndvi') {
      choiceCards = ch.options.map((id) => {
        const band = KIDS_NDVI_BANDS.find((b) => b.id === id);
        return {
          id,
          icon: id === 'water' ? '🌊' : id === 'bare_soil' ? '🏜️' : id === 'stressed' ? '💛' : id === 'moderate' ? '🌱' : '🌿',
          label: band ? band.label : { bn: id, en: id },
        };
      });
    } else if (ch.category === 'weather') {
      choiceCards = ch.options.map((id) => {
        const info = WEATHER_CHOICE_CARDS[id] || { icon: '🌦️', bn: id, en: id };
        return {
          id,
          icon: info.icon,
          label: { bn: info.bn, en: info.en },
        };
      });
    }
  }

  return { ...ch, choiceCards };
}

// ============================================================================
// 4. MINI-GAME 1: FARMER'S MARKET TRADING (F12)
// ============================================================================

export function simulateMarketTrade({
  demandKg = 0,
  offeredPriceTk = 0,
  costKg = 0,
} = {}) {
  const qty = Math.max(0, Number(demandKg) || 0);
  const price = Math.max(0, Number(offeredPriceTk) || 0);
  const costPerKg = Math.max(0, Number(costKg) || 0);

  if (qty <= 0) {
    return {
      demandKg: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      isProfitable: false,
      marginPct: 0,
      summary: {
        bn: 'ক্রেতার কোনো চাহিদা ছিল না (০ কেজি)।',
        en: 'Zero customer demand (0 kg traded).',
      },
    };
  }

  const revenue = Math.round(qty * price);
  const cost = Math.round(qty * costPerKg);
  const profit = revenue - cost;
  const isProfitable = profit > 0;
  const marginPct = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  return {
    demandKg: qty,
    offeredPriceTk: price,
    costKg: costPerKg,
    revenue,
    cost,
    profit,
    isProfitable,
    marginPct,
    summary: isProfitable
      ? {
          bn: `দারুণ ব্যবসা! বিক্রি ${revenue} টাকা − খরচ ${cost} টাকা = ${profit} টাকা নিট লাভ!`,
          en: `Great deal! Revenue Tk ${revenue} − Cost Tk ${cost} = Tk ${profit} net profit!`,
        }
      : {
          bn: `সাবধান! বিক্রি ${revenue} টাকা < খরচ ${cost} টাকা = ${Math.abs(profit)} টাকা লোকসান হবে!`,
          en: `Watch out! Revenue Tk ${revenue} < Cost Tk ${cost} = Tk ${Math.abs(profit)} loss!`,
        },
  };
}

export const MARKET_ITEMS = [
  {
    id: 'boro_rice',
    icon: '🌾',
    name: { bn: 'বোরো চাল/ধান', en: 'Boro Rice' },
    costKg: 26,
    fairPriceKg: 36,
    minOfferKg: 22,
    maxOfferKg: 42,
  },
  {
    id: 'potato',
    icon: '🥔',
    name: { bn: 'গোল আলু', en: 'Fresh Potato' },
    costKg: 12,
    fairPriceKg: 22,
    minOfferKg: 10,
    maxOfferKg: 26,
  },
  {
    id: 'mustard',
    icon: '🌼',
    name: { bn: 'সরিষা দানা', en: 'Mustard Seed' },
    costKg: 45,
    fairPriceKg: 75,
    minOfferKg: 42,
    maxOfferKg: 84,
  },
  {
    id: 'lentil',
    icon: '🫘',
    name: { bn: 'মসুর ডাল', en: 'Red Lentil' },
    costKg: 50,
    fairPriceKg: 85,
    minOfferKg: 46,
    maxOfferKg: 94,
  },
];

// ============================================================================
// 5. MINI-GAME 2: GROW YOUR PLANT SIMULATION (F13)
// ============================================================================

export const PLANT_STAGES = [
  { stage: 1, icon: '🌰', name: { bn: 'বীজ বপন', en: 'Seed Sown' } },
  { stage: 2, icon: '🌱', name: { bn: 'কচি চারা', en: 'Tiny Sprout' } },
  { stage: 3, icon: '🌿', name: { bn: 'সবুজ পাতা', en: 'Leafy Growth' } },
  { stage: 4, icon: '🌼', name: { bn: 'ফুল ও দানা', en: 'Flowering' } },
  { stage: 5, icon: '🌾', name: { bn: 'পাকা ফসল!', en: 'Harvest Ready!' } },
];

/**
 * Advances plant growth one step based on soil moisture, sunlight, compost, and weeds.
 */
export function simulatePlantGrowthStep({
  currentStage = 1,
  soilMoisture = 60,
  sunlight = 80,
  compost = 60,
  weedLevel = 0,
} = {}) {
  const stage = Math.max(1, Math.min(5, Math.round(Number(currentStage) || 1)));
  const moisture = Math.max(0, Math.min(100, Number(soilMoisture) ?? 60));
  const sun = Math.max(0, Math.min(100, Number(sunlight) ?? 80));
  const weeds = Math.max(0, Math.min(100, Number(weedLevel) ?? 0));
  const organic = Math.max(0, Math.min(100, Number(compost) ?? 60));

  if (moisture < 30) {
    return {
      previousStage: stage,
      nextStage: stage,
      status: 'drought_stress',
      healthDelta: -15,
      moisture,
      advice: {
        bn: 'মাটি খুব শুকনো (<৩০%)! শিকড় পানি পাচ্ছে না—দ্রুত সেচ দাও!',
        en: 'Soil is too dry (<30%)! Roots are thirsty—irrigate soon!',
      },
    };
  }

  if (moisture > 90) {
    return {
      previousStage: stage,
      nextStage: stage,
      status: 'waterlogged',
      healthDelta: -15,
      moisture,
      advice: {
        bn: 'জলাবদ্ধতা (>৯০%)! অতিরিক্ত পানিতে শিকড় দম নিতে পারছে না—নালা খুলে পানি বের করো!',
        en: 'Waterlogged (>90%)! Roots cannot breathe—open field drainage!',
      },
    };
  }

  if (weeds > 65) {
    return {
      previousStage: stage,
      nextStage: stage,
      status: 'weed_competition',
      healthDelta: -10,
      moisture,
      advice: {
        bn: 'আগাছা ফসলের সার ও আলো কেড়ে নিচ্ছে! আগাছা পরিষ্কার করো।',
        en: 'Weeds are stealing nutrients and light! Weed the field first.',
      },
    };
  }

  if (sun < 35) {
    return {
      previousStage: stage,
      nextStage: stage,
      status: 'low_light',
      healthDelta: -6,
      moisture,
      advice: {
        bn: 'সূর্যের আলো কম! সালোকসংশ্লেষণের জন্য রোদ দরকার।',
        en: 'Too shady! Plants need bright sunshine for photosynthesis.',
      },
    };
  }

  if (moisture < 45) {
    return {
      previousStage: stage,
      nextStage: stage,
      status: 'slightly_dry',
      healthDelta: -3,
      moisture,
      advice: {
        bn: 'মাটির রস কমে যাচ্ছে (৩০–৪৪%)। হালকা সেচ দিলে গাছ তাড়াতাড়ি বাড়বে।',
        en: 'Moisture is getting low (30–44%). Add a gentle watering so growth continues.',
      },
    };
  }

  if (moisture > 80) {
    return {
      previousStage: stage,
      nextStage: stage,
      status: 'slightly_wet',
      healthDelta: -3,
      moisture,
      advice: {
        bn: 'মাটি একটু বেশি ভিজা (৮১–৯০%)। এখন সেচ থামিয়ে রোদে পানি কমতে দাও।',
        en: 'Soil is a bit too soggy (81–90%). Hold irrigation and let extra water drain.',
      },
    };
  }

  // Optimal moisture band: 45% to 80%
  const nextStage = Math.min(5, stage + 1);
  const bonusHealth = organic >= 50 ? 12 : 8;
  const isReady = nextStage >= 5;

  return {
    previousStage: stage,
    nextStage,
    status: isReady ? 'harvest_ready' : 'healthy',
    healthDelta: bonusHealth,
    moisture,
    advice: isReady
      ? {
          bn: 'অভিনন্দন! সঠিক পানি ও যত্নে ফসল সোনার মতো পেকে উঠেছে—এখন কাটার পালা!',
          en: 'Congratulations! Balanced moisture and care produced a golden harvest—ready to reap!',
        }
      : {
          bn: 'দারুণ! মাটির রস ঠিক ৪৫–৮০% আদর্শ সীমায় আছে, গাছ তরতর করে বাড়ছে!',
          en: 'Awesome! Soil moisture sits in the ideal 45–80% band—crop is thriving!',
        },
  };
}

// ============================================================================
// 6. MINI-GAME 3: WATER PIPELINE ROTATABLE GRID & BFS SOLVER (F14)
// ============================================================================

// Direction indices: 0 = North, 1 = East, 2 = South, 3 = West
const DIR_DELTAS = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

const BASE_OPENINGS = {
  source: [true, true, true, true],
  target: [true, true, true, true],
  straight: [true, false, true, false], // N-S at 0 deg; E-W at 90 deg
  elbow: [true, true, false, false], // N-E at 0 deg; E-S at 90 deg
  tee: [true, true, false, true], // N-E-W at 0 deg
  cross: [true, true, true, true],
  blocked: [false, false, false, false],
};

/**
 * Returns [N, E, S, W] boolean openings after clockwise rotation (0, 90, 180, 270).
 */
export function getPipeOpenings(type, rotation = 0) {
  const base = BASE_OPENINGS[type] ?? BASE_OPENINGS.blocked;
  const steps = ((Math.round((Number(rotation) || 0) / 90) % 4) + 4) % 4;
  const out = [false, false, false, false];
  for (let i = 0; i < 4; i++) {
    out[(i + steps) % 4] = base[i];
  }
  return out;
}

export function rotatePipeGridCell(grid, r, c) {
  return grid.map((row, ri) =>
    row.map((cell, ci) => {
      if (ri !== r || ci !== c) return cell;
      if (cell.locked || cell.type === 'source' || cell.type === 'target' || cell.type === 'blocked') {
        return cell;
      }
      return { ...cell, rotation: ((cell.rotation ?? 0) + 90) % 360 };
    })
  );
}

/**
 * Checks connectivity for either:
 *   1) Simple array of `{ id, connected }` pipe nodes, OR
 *   2) 2D rotatable pipe grid `{ grid, start, end, moves, par }` (or raw 2D grid array) via BFS.
 */
export function checkPipelineConnectivity(input) {
  // Polymorphic Form 1: Array of pipe objects [{ id, connected }]
  if (Array.isArray(input) && (input.length === 0 || !Array.isArray(input[0]))) {
    const total = input.length;
    const connectedCount = input.filter((p) => Boolean(p && p.connected)).length;
    const isConnected = total > 0 && connectedCount === total;
    return {
      isConnected,
      connectedCount,
      totalCount: total,
      flowPercent: total > 0 ? Math.round((connectedCount / total) * 100) : 0,
      stars: isConnected ? 3 : 0,
    };
  }

  // Polymorphic Form 2: 2D Grid BFS Flow Solver
  const grid = Array.isArray(input) ? input : input?.grid;
  if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
    return { isConnected: false, reachedCells: [], pathCells: [], flowPercent: 0, stars: 0 };
  }

  const rows = grid.length;
  const cols = grid[0].length;
  let start = input?.start ?? null;
  let end = input?.end ?? null;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!start && grid[r][c]?.type === 'source') start = [r, c];
      if (!end && grid[r][c]?.type === 'target') end = [r, c];
    }
  }
  if (!start) start = [0, 0];
  if (!end) end = [rows - 1, cols - 1];

  const keyOf = (r, c) => `${r},${c}`;
  const startKey = keyOf(start[0], start[1]);
  const endKey = keyOf(end[0], end[1]);

  const visited = new Set([startKey]);
  const parent = new Map();
  const queue = [start];

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const cell = grid[r][c];
    const openings = getPipeOpenings(cell?.type, cell?.rotation ?? 0);

    for (let d = 0; d < 4; d++) {
      if (!openings[d]) continue;
      const [dr, dc] = DIR_DELTAS[d];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const nextCell = grid[nr][nc];
      const nextOpenings = getPipeOpenings(nextCell?.type, nextCell?.rotation ?? 0);
      const opposite = (d + 2) % 4;
      if (!nextOpenings[opposite]) continue;

      const nKey = keyOf(nr, nc);
      if (!visited.has(nKey)) {
        visited.add(nKey);
        parent.set(nKey, keyOf(r, c));
        queue.push([nr, nc]);
      }
    }
  }

  const isConnected = visited.has(endKey);
  const pathCells = [];
  if (isConnected) {
    let cur = endKey;
    while (cur) {
      pathCells.unshift(cur);
      cur = parent.get(cur) ?? null;
    }
  }

  const moves = Number(input?.moves) || 0;
  const par = Number(input?.par) || Math.max(rows + cols, 4);
  const stars = !isConnected ? 0 : moves <= par ? 3 : moves <= par + 4 ? 2 : 1;
  const flowPercent = Math.round((visited.size / (rows * cols)) * 100);

  return {
    isConnected,
    reachedCells: Array.from(visited),
    pathCells,
    flowPercent,
    stars,
  };
}

export const PIPELINE_LEVELS = [
  {
    id: 'canal_easy',
    title: { bn: 'স্তর ১: ক্যানেল থেকে বীজতলা', en: 'Level 1: Canal to Seedbed' },
    par: 4,
    grid: [
      [{ type: 'source', rotation: 0, locked: true }, { type: 'straight', rotation: 0 }, { type: 'elbow', rotation: 0 }],
      [{ type: 'blocked', rotation: 0, locked: true }, { type: 'blocked', rotation: 0, locked: true }, { type: 'straight', rotation: 90 }],
      [{ type: 'elbow', rotation: 90 }, { type: 'straight', rotation: 0 }, { type: 'target', rotation: 0, locked: true }],
    ],
  },
  {
    id: 'boro_mid',
    title: { bn: 'স্তর ২: পাথর এড়িয়ে বোরো ক্ষেতে সেচ', en: 'Level 2: Around Rocks to Boro Field' },
    par: 8,
    grid: [
      [{ type: 'source', rotation: 0, locked: true }, { type: 'elbow', rotation: 0 }, { type: 'blocked', rotation: 0, locked: true }, { type: 'elbow', rotation: 90 }],
      [{ type: 'blocked', rotation: 0, locked: true }, { type: 'straight', rotation: 90 }, { type: 'elbow', rotation: 180 }, { type: 'straight', rotation: 90 }],
      [{ type: 'elbow', rotation: 0 }, { type: 'elbow', rotation: 90 }, { type: 'elbow', rotation: 90 }, { type: 'blocked', rotation: 0, locked: true }],
      [{ type: 'blocked', rotation: 0, locked: true }, { type: 'blocked', rotation: 0, locked: true }, { type: 'elbow', rotation: 270 }, { type: 'target', rotation: 0, locked: true }],
    ],
  },
  {
    id: 'awd_pro',
    title: { bn: 'স্তর ৩: স্মার্ট AWD সাশ্রয়ী সেচ নেটওয়ার্ক', en: 'Level 3: Smart AWD Irrigation Network' },
    par: 9,
    grid: [
      [{ type: 'source', rotation: 0, locked: true }, { type: 'straight', rotation: 0 }, { type: 'tee', rotation: 90 }, { type: 'elbow', rotation: 0 }],
      [{ type: 'blocked', rotation: 0, locked: true }, { type: 'blocked', rotation: 0, locked: true }, { type: 'straight', rotation: 90 }, { type: 'straight', rotation: 90 }],
      [{ type: 'elbow', rotation: 90 }, { type: 'straight', rotation: 0 }, { type: 'elbow', rotation: 180 }, { type: 'elbow', rotation: 0 }],
      [{ type: 'straight', rotation: 90 }, { type: 'blocked', rotation: 0, locked: true }, { type: 'elbow', rotation: 90 }, { type: 'target', rotation: 0, locked: true }],
    ],
  },
];

// ============================================================================
// 7. MINI-GAME 4: PEST HUNTER & ECO-IPM (F15)
// ============================================================================

const PROTECT_ACTIONS = new Set(['protect', 'preserve', 'keep']);
const ECO_CONTROL_ACTIONS = new Set(['eco_trap', 'light_trap', 'pheromone_trap', 'neem', 'perch', 'hand_remove']);
const CHEMICAL_ACTIONS = new Set(['chemical_spray', 'heavy_pesticide', 'spray']);

/**
 * Evaluates a learner's IPM decision against beneficial predators vs crop pests.
 */
export function evaluateIpmAction({ bugId, chosenAction } = {}) {
  const bug = KIDS_PESTS[bugId];
  if (!bug) {
    return {
      success: false,
      outcomeType: 'unknown_organism',
      cropHealthDelta: 0,
      feedback: { bn: 'পোকাটি চেনা যায়নি।', en: 'Organism not found.' },
    };
  }

  const action = String(chosenAction || '').trim().toLowerCase();
  const isBeneficial = bug.type === 'beneficial';

  if (isBeneficial) {
    if (PROTECT_ACTIONS.has(action)) {
      return {
        success: true,
        outcomeType: 'beneficial_preserved',
        cropHealthDelta: 12,
        bug,
        feedback: {
          bn: `সাবাশ! ${bug.name.bn} আমাদের বন্ধু পোকা! ${bug.ecoMethod.bn}`,
          en: `Great job! ${bug.name.en} is an ally! ${bug.ecoMethod.en}`,
        },
      };
    }
    return {
      success: false,
      outcomeType: 'beneficial_harmed',
      cropHealthDelta: -15,
      bug,
      feedback: {
        bn: `আহা! ${bug.name.bn} আসলে ক্ষতিকর পোকা খেয়ে ফসল বাঁচায়! একে তাড়ানো বা স্প্রে করা ঠিক হয়নি।`,
        en: `Oops! ${bug.name.en} actually eats crop pests for free! Always protect helpful predators.`,
      },
    };
  }

  // Harmful pest
  if (ECO_CONTROL_ACTIONS.has(action)) {
    return {
      success: true,
      outcomeType: 'pest_controlled',
      cropHealthDelta: 10,
      bug,
      feedback: {
        bn: `দারুণ ইকো-বুদ্ধি! ${bug.name.bn} নিরাপদ উপায়ে দমন হয়েছে! ${bug.ecoMethod.bn}`,
        en: `Smart Eco-IPM! Stopped ${bug.name.en} safely! ${bug.ecoMethod.en}`,
      },
    };
  }

  if (CHEMICAL_ACTIONS.has(action)) {
    return {
      success: false,
      outcomeType: 'over_sprayed',
      cropHealthDelta: -5,
      bug,
      feedback: {
        bn: `সতর্কতা! রাসায়নিক বিষ দিলে লেডিবার্ড ও ব্যাঙের মতো বন্ধুরাও মরে যায়! আলোক ফাঁদ বা নিম তেল ব্যবহার করো।`,
        en: `Caution! Broad chemical spray kills helpful ladybirds & frogs too! Use light traps or neem instead.`,
      },
    };
  }

  return {
    success: false,
    outcomeType: 'pest_ignored',
    cropHealthDelta: -15,
    bug,
    feedback: {
      bn: `সাবধান! ${bug.name.bn} ফসলের শত্রু—একে রেখে দিলে ফসল নষ্ট হবে! ${bug.ecoMethod.bn}`,
      en: `Watch out! ${bug.name.en} damages crops—use eco traps instead of leaving it alone!`,
    },
  };
}

// ============================================================================
// 8. CHEMISTRY & SOIL pH LAB
// ============================================================================

export function classifyLitmusPh(ph) {
  if (ph < 5.5) {
    return { id: 'strongly_acidic', color: '#ef4444', badgeBg: 'bg-red-100 text-red-800', label: { bn: 'তীব্র অম্লীয় (লাল লিটমাস)', en: 'Strongly Acidic (Red Litmus)' } };
  }
  if (ph < 6.0) {
    return { id: 'moderately_acidic', color: '#f97316', badgeBg: 'bg-orange-100 text-orange-800', label: { bn: 'হালকা অম্লীয় (কমলা)', en: 'Mildly Acidic (Orange)' } };
  }
  if (ph <= 7.2) {
    return { id: 'healthy_neutral', color: '#10b981', badgeBg: 'bg-emerald-100 text-emerald-800', label: { bn: 'ফসলের সেরা নিরপেক্ষ অঞ্চল (সবুজ)', en: 'Optimal Neutral Zone (Green)' } };
  }
  if (ph <= 7.8) {
    return { id: 'slightly_alkaline', color: '#0ea5e9', badgeBg: 'bg-sky-100 text-sky-800', label: { bn: 'হালকা ক্ষারীয় (আকাশী)', en: 'Slightly Alkaline (Blue)' } };
  }
  return { id: 'strongly_alkaline', color: '#6366f1', badgeBg: 'bg-indigo-100 text-indigo-800', label: { bn: 'বেশি ক্ষারীয় (বেগুনি-নীল)', en: 'Strongly Alkaline (Indigo)' } };
}

/**
 * Simulates soil chemistry titration reactions for a Bangladesh soil sample.
 */
export function simulateSoilChemistry(soilId, appliedAmendmentIds = []) {
  const soils = KIDS_SCIENCE_MODULES.chemistryLab.soils;
  const amendments = KIDS_SCIENCE_MODULES.chemistryLab.amendments;
  const soil = soils.find((s) => s.id === soilId) ?? soils[0];

  let ph = soil.initialPh;
  let ec = soil.initialEc;
  let om = soil.initialOm;
  let n = soil.initialN;
  let p = soil.initialP;
  let k = soil.initialK;

  const applied = [];
  for (const amId of appliedAmendmentIds) {
    const am = amendments.find((a) => a.id === amId);
    if (!am) continue;
    applied.push(am);

    if (am.buffersTowardNeutral) {
      if (ph < 6.6) ph = Math.min(6.6, ph + Math.abs(am.deltaPh));
      else if (ph > 6.6) ph = Math.max(6.6, ph - Math.abs(am.deltaPh));
    } else {
      ph += am.deltaPh;
    }

    ec += am.deltaEc;
    om += am.deltaOm;
    n += am.deltaN;
    p += am.deltaP;
    k += am.deltaK;
  }

  ph = Math.round(Math.max(3.5, Math.min(9.5, ph)) * 100) / 100;
  ec = Math.round(Math.max(0.1, Math.min(10.0, ec)) * 100) / 100;
  om = Math.round(Math.max(0.3, Math.min(6.0, om)) * 100) / 100;
  n = Math.round(Math.max(0, Math.min(100, n)));
  p = Math.round(Math.max(0, Math.min(100, p)));
  k = Math.round(Math.max(0, Math.min(100, k)));

  const litmus = classifyLitmusPh(ph);
  const isPhHealthy = ph >= soil.targetPhMin && ph <= soil.targetPhMax;
  const isEcHealthy = ec <= soil.targetEcMax;
  const isOmHealthy = om >= 1.8;
  const isHealthy = isPhHealthy && isEcHealthy;

  let tip;
  if (isHealthy && isOmHealthy) {
    tip = {
      bn: 'অসাধারণ রসায়ন! মাটির pH, লবণাক্ততা এবং জৈব পদার্থ তিনটেই ফসলের জন্য দারুণ অবস্থায় এসেছে!',
      en: 'Brilliant chemistry! Soil pH, salinity, and organic matter are all in the sweet spot for crops!',
    };
  } else if (!isPhHealthy && ph < soil.targetPhMin) {
    tip = {
      bn: `মাটি এখনো অম্লীয় (pH ${ph})। চুন (CaCO₃) বা কাঠের ছাই ও কম্পোস্ট যোগ করো।`,
      en: `Still acidic (pH ${ph}). Add Agricultural Lime (CaCO₃) or Wood Ash + Vermicompost.`,
    };
  } else if (!isEcHealthy) {
    tip = {
      bn: `লবণাক্ততা এখনো বেশি (EC ${ec} dS/m)। জিপসাম (CaSO₄) ও কেঁচো কম্পোস্ট দিয়ে লবণ কমাও!`,
      en: `Salinity is still high (EC ${ec} dS/m). Add Gypsum (CaSO₄) & Vermicompost to flush sodium!`,
    };
  } else if (!isPhHealthy) {
    tip = {
      bn: `pH ${ph} লক্ষ্যমাত্রার (${soil.targetPhMin}–${soil.targetPhMax}) বাইরে আছে। কম্পোস্ট বা জিপসাম দিয়ে সমন্বয় করো।`,
      en: `pH ${ph} is outside target (${soil.targetPhMin}–${soil.targetPhMax}). Adjust gently with Compost or Gypsum.`,
    };
  } else {
    tip = {
      bn: 'pH ও লবণ ঠিক হয়েছে! আরও একটু জৈব সার বা বায়োচার যোগ করলে মাটি আরও উর্বর হবে।',
      en: 'pH & salinity are healthy! Adding a bit more Vermicompost or Biochar makes soil extra rich!',
    };
  }

  return {
    soil,
    ph,
    ec,
    om,
    n,
    p,
    k,
    litmus,
    isPhHealthy,
    isEcHealthy,
    isOmHealthy,
    isHealthy,
    stepsApplied: applied.length,
    reactionTip: tip,
  };
}

// ============================================================================
// 9. BIOLOGY EXPLORER (Living vs Non-Living, Photosynthesis, Food Chains)
// ============================================================================

export function evaluateLivingClassification(itemId, chosenClass) {
  const item = KIDS_SCIENCE_MODULES.biologyLab.livingItems.find((x) => x.id === itemId);
  if (!item) return { isCorrect: false, error: 'ITEM_NOT_FOUND' };
  const isCorrect = item.classification === chosenClass;
  return {
    isCorrect,
    expectedClass: item.classification,
    item,
    fact: item.fact,
  };
}

export function evaluateFoodChainOrder(chainId, orderedIds = []) {
  const chain = KIDS_SCIENCE_MODULES.biologyLab.foodChains.find((c) => c.id === chainId);
  if (!chain) return { isCorrect: false, error: 'CHAIN_NOT_FOUND' };

  const expected = chain.correctOrder.map((x) => x.id);
  let correctPositions = 0;
  for (let i = 0; i < expected.length; i++) {
    if (orderedIds[i] === expected[i]) correctPositions += 1;
  }
  const isCorrect = expected.length === orderedIds.length && correctPositions === expected.length;

  return {
    isCorrect,
    correctPositions,
    totalCount: expected.length,
    expectedOrder: expected,
    pesticideLesson: chain.pesticideLesson,
  };
}

/**
 * Interactive Photosynthesis Leaf Factory calculator.
 * 6CO2 + 6H2O + Sunlight -> C6H12O6 (Glucose) + 6O2 (Oxygen)
 */
export function simulatePhotosynthesis({ sunlight = 75, water = 75, co2 = 75 } = {}) {
  const s = Math.max(0, Math.min(100, Number(sunlight) || 0));
  const w = Math.max(0, Math.min(100, Number(water) || 0));
  const c = Math.max(0, Math.min(100, Number(co2) || 0));

  // Liebig's Law of the Minimum: photosynthesis rate is limited by the scarcest input
  const limitingVal = Math.min(s, w, c);
  const avgVal = (s + w + c) / 3;
  const glucoseRate = Math.round(limitingVal * 0.75 + avgVal * 0.25);
  const oxygenBubbles = Math.max(0, Math.round(glucoseRate / 10));

  let limitingFactor = 'balanced';
  if (s <= w && s <= c && s < 50) limitingFactor = 'sunlight';
  else if (w <= s && w <= c && w < 50) limitingFactor = 'water';
  else if (c <= s && c <= w && c < 50) limitingFactor = 'co2';

  const statusText = limitingFactor === 'sunlight'
    ? { bn: 'রোদ কম! পাতার ক্লোরোফিল কারখানা ধীর হয়ে গেছে।', en: 'Low sunlight! Leaf chlorophyll slows down sugar production.' }
    : limitingFactor === 'water'
      ? { bn: 'পানি কম! শিকড় পানি না পেলে পাতার স্টোমাটা বন্ধ হয়ে যায়।', en: 'Low water! Leaves close tiny stomata pores to stop wilting.' }
      : limitingFactor === 'co2'
        ? { bn: 'কার্বন ডাই-অক্সাইড কম! বাতাস থেকে CO₂ পেলেই পাতা শর্করা বানাবে।', en: 'Low CO₂! Leaves need CO₂ from air to assemble glucose sugar.' }
        : { bn: 'দুর্দান্ত! রোদ, পানি ও CO₂ মিলে প্রচুর গ্লুকোজ (খাদ্য) ও অক্সিজেন তৈরি হচ্ছে!', en: 'Thriving! Sunlight + Water + CO₂ are building glucose sugar & fresh O₂!' };

  return {
    glucoseRate,
    oxygenBubbles,
    limitingFactor,
    statusText,
  };
}

// ============================================================================
// 10. NASA SPACE, WATER CYCLE & PHYSICS ARCADE
// ============================================================================

export function evaluateCubeSatBuild(missionId, selectedPartIds = []) {
  const { parts, missions } = KIDS_SCIENCE_MODULES.scienceArcade.cubesat;
  const mission = missions.find((m) => m.id === missionId) ?? missions[0];
  const selected = [...new Set(selectedPartIds)]
    .map((id) => parts.find((p) => p.id === id))
    .filter(Boolean);

  const totalMassKg = Math.round(selected.reduce((sum, p) => sum + p.massKg, 0) * 10) / 10;
  const netPowerW = selected.reduce((sum, p) => sum + p.powerW, 0);
  const hasDistractor = selected.some((p) => p.id === 'candy_box');
  const selectedSet = new Set(selected.map((p) => p.id));
  const missingParts = mission.requiredParts.filter((id) => !selectedSet.has(id));

  const withinMass = totalMassKg <= mission.maxMassKg;
  const hasPower = netPowerW > 0;
  const launchReady = !hasDistractor && missingParts.length === 0 && withinMass && hasPower;

  let feedback;
  if (hasDistractor) {
    feedback = {
      bn: 'মিষ্টির বাক্স রকেটের জায়গা নষ্ট করছে! মহাকাশে বিজ্ঞান যন্ত্রপাতি ছাড়া অপ্রয়োজনীয় জিনিস নেওয়া যায় না।',
      en: 'Candy Box wastes precious rocket payload mass! Swap it for science hardware.',
    };
  } else if (!withinMass) {
    feedback = {
      bn: `ওজন বেশি হয়ে গেছে (${totalMassKg} কেজি > সর্বোচ্চ ${mission.maxMassKg} কেজি)! শুধু মিশনের জরুরি ৩টি যন্ত্র রাখো।`,
      en: `Too heavy (${totalMassKg} kg > max ${mission.maxMassKg} kg)! Keep only the 3 required instruments.`,
    };
  } else if (!hasPower) {
    feedback = {
      bn: 'বিদ্যুৎ নেই! সোলার প্যানেল উইং যোগ না করলে স্যাটেলাইটের ব্যাটারি বন্ধ হয়ে যাবে।',
      en: 'Power deficit! Add Solar Panel Wings so instruments stay powered in orbit.',
    };
  } else if (missingParts.length > 0) {
    feedback = {
      bn: `মিশনের আরও ${missingParts.length}টি জরুরি যন্ত্র বাকি আছে। লক্ষ্যটা আরেকবার দেখো!`,
      en: `Still missing ${missingParts.length} essential part(s) for this NASA mission!`,
    };
  } else {
    feedback = {
      bn: `৩... ২... ১... উৎক্ষেপণ সফল! তোমার ${totalMassKg} কেজির কিউবস্যাট (+${netPowerW}W) কক্ষপথ থেকে মাঠে তথ্য পাঠাচ্ছে!`,
      en: `3... 2... 1... Liftoff! Your ${totalMassKg} kg CubeSat (+${netPowerW}W surplus) is orbiting Bangladesh!`,
    };
  }

  return {
    launchReady,
    totalMassKg,
    maxMassKg: mission.maxMassKg,
    netPowerW,
    missingParts,
    hasDistractor,
    feedback,
  };
}

export function evaluateWaterCycleOrder(orderedStageIds = []) {
  const stages = KIDS_SCIENCE_MODULES.scienceArcade.waterCycle.stages;
  const expected = stages.map((s) => s.id);
  let correctPositions = 0;
  for (let i = 0; i < expected.length; i++) {
    if (orderedStageIds[i] === expected[i]) correctPositions += 1;
  }
  const isCorrect = orderedStageIds.length === expected.length && correctPositions === expected.length;

  return {
    isCorrect,
    correctPositions,
    totalStages: expected.length,
    expectedOrder: expected,
    feedback: isCorrect
      ? {
          bn: 'চমৎকার! বাষ্পীভবন -> প্রস্বেদন (ETo) -> ঘনীভবন -> বৃষ্টিপাত (GPM) -> মাটিতে শোষণ—পানিচক্র একদম নিখুঁত!',
          en: 'Spot on! Evaporation -> Transpiration (ETo) -> Condensation -> Rain (GPM) -> Root Infiltration!',
        }
      : {
          bn: 'আবার চেষ্টা করো: প্রথমে সূর্য পানি বাষ্প করে ও পাতা প্রস্বেদন করে, তারপর মেঘ হয়ে বৃষ্টি ঝরে ও মাটিতে শোষে।',
          en: 'Try again: First sun evaporates & leaves transpire (ETo), then clouds condense, rain falls, and soil soaks it in.',
        },
  };
}

/**
 * Inclined-plane physics calculator for Ramp Race (Gravity & Friction).
 */
export function simulateRampRace({
  surfaceId = 'bamboo_smooth',
  objectId = 'watermelon',
  angleDeg = 25,
  rampLengthM = 4,
} = {}) {
  const { surfaces, objects } = KIDS_SCIENCE_MODULES.scienceArcade.rampRace;
  const surface = surfaces.find((s) => s.id === surfaceId) ?? surfaces[0];
  const obj = objects.find((o) => o.id === objectId) ?? objects[0];

  const angle = Math.max(5, Math.min(60, Number(angleDeg) || 25));
  const length = Math.max(1, Math.min(20, Number(rampLengthM) || 4));
  const rad = (angle * Math.PI) / 180;
  const g = 9.81;

  // Rolling objects experience much lower effective resistance than flat sliding friction
  const effectiveMu = obj.rollBonus ? surface.mu * 0.25 : surface.mu;
  const rawAccel = g * (Math.sin(rad) - effectiveMu * Math.cos(rad));
  const accel = rawAccel / (1 + (obj.inertiaFactor || 0));

  if (accel <= 0.05) {
    return {
      stalled: true,
      accelerationMs2: 0,
      timeSec: Infinity,
      speedMs: 0,
      effectiveMu: Math.round(effectiveMu * 100) / 100,
      surface,
      object: obj,
      explanation: {
        bn: `${obj.name.bn} ${surface.name.bn}-এ ${angle}° ঢালে আটকে গেছে! ঘর্ষণ বল (Friction) মাধ্যাকর্ষণের টানের চেয়ে বেশি। ঢাল বাড়াও বা গোল বস্তু নাও!`,
        en: `${obj.name.en} stalled on ${surface.name.en} at ${angle}°! Friction resisted gravity. Raise the slope or pick a rolling shape!`,
      },
    };
  }

  const timeSec = Math.round(Math.sqrt((2 * length) / accel) * 100) / 100;
  const speedMs = Math.round(Math.sqrt(2 * accel * length) * 100) / 100;

  return {
    stalled: false,
    accelerationMs2: Math.round(accel * 100) / 100,
    timeSec,
    speedMs,
    effectiveMu: Math.round(effectiveMu * 100) / 100,
    surface,
    object: obj,
    explanation: {
      bn: `${obj.name.bn} মাত্র ${timeSec} সেকেন্ডে ${speedMs} মি/সে বেগে ${surface.name.bn} বেয়ে নিচে নামল! ${obj.physicsTip.bn}`,
      en: `${obj.name.en} zipped down ${surface.name.en} in ${timeSec}s reaching ${speedMs} m/s! ${obj.physicsTip.en}`,
    },
  };
}

/**
 * Aerodynamics calculator for Paper Plane Flight (Lift, Drag, Center of Gravity).
 */
export function simulatePaperPlaneFlight({
  wingId = 'glider',
  noseId = 'balanced',
  throwStrength = 75,
  windHeadwind = 0,
} = {}) {
  const { wings, noseWeights } = KIDS_SCIENCE_MODULES.scienceArcade.paperPlane;
  const wing = wings.find((w) => w.id === wingId) ?? wings[0];
  const nose = noseWeights.find((n) => n.id === noseId) ?? noseWeights[1];

  const strength = Math.max(20, Math.min(100, Number(throwStrength) || 75));
  const headwind = Math.max(-10, Math.min(20, Number(windHeadwind) || 0));

  const glideRatio = (wing.liftFactor * nose.balanceFactor) / wing.dragFactor;
  // Throwing slightly too hard with an unbalanced light nose causes stalls
  const throwFactor = noseId === 'light' && strength > 80 ? 0.68 : strength / 70;
  const windPenalty = Math.max(0.4, 1 - headwind * 0.025);

  const distanceM = Math.round(Math.max(1.5, 11.5 * glideRatio * throwFactor * windPenalty) * 10) / 10;
  const flightTimeSec = Math.round((distanceM / (3.2 + (strength / 50))) * 10) / 10;
  const maxHeightM = Math.round((1.5 + wing.liftFactor * nose.balanceFactor * 1.4) * 10) / 10;

  let tip;
  if (noseId === 'light') {
    tip = {
      bn: 'নাক খুব হালকা হওয়ায় বিমানটি ওপর দিকে উঠেই ধপাস করে পড়ে গেল (Stall)! ১টি পেপার ক্লিপ যোগ করে ভারসাম্য (Center of Gravity) ঠিক করো।',
      en: 'Too tail-heavy! Without nose weight it pitched up and stalled. Add 1 paperclip for balanced Center of Gravity!',
    };
  } else if (noseId === 'heavy') {
    tip = {
      bn: 'সামনে ৩টি ক্লিপ দেওয়ায় নাক ভারী হয়ে দ্রুত নিচে নেমে গেছে! ১টি ক্লিপ হলেই সেরা গ্লাইড পাওয়া যায়।',
      en: '3 paperclips made the nose too heavy so gravity pulled it down fast! Try 1 paperclip for maximum glide.',
    };
  } else if (wingId === 'wide_kite') {
    tip = {
      bn: 'বর্গাকার ঘুড়ি ভাঁজে বাতাসের বাধা (Drag) বেশি হওয়ায় প্লেন বেশিদূর যেতে পারেনি। চওড়া গ্লাইডার ডানায় বাতাসের লিফট বেশি হয়!',
      en: 'Square box fold creates high Air Drag! Try the Wide-Wing Glider for high Lift-to-Drag flight.',
    };
  } else {
    tip = {
      bn: `দারুণ উড্ডয়ন! সুষম ভরকেন্দ্র ও ${wing.name.bn}-এর লিফট বাতাসের বাধাকে হারিয়ে ${distanceM} মিটার উড়েছে!`,
      en: `Awesome flight! Balanced Center of Gravity + ${wing.name.en} lift soared ${distanceM} meters!`,
    };
  }

  return {
    distanceM,
    flightTimeSec,
    maxHeightM,
    glideRatio: Math.round(glideRatio * 100) / 100,
    wing,
    nose,
    explanation: tip,
  };
}

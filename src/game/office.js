// The agriculture office of মাঠের মানুষ: the upazila agriculture office in Bangladesh, and the office a farmer goes to
// in each other place (a block office in Punjab, a township office in Myanmar, a USDA service centre in Nevada ...).
// Every one of the farmers can walk in and talk to the officer, who looks at the farm as it is now and helps:
//  - advice on what is going wrong right now (pests, thirst, dead plants, tired soil, the same crop again, weather);
//  - the real government programmes for that country, from the app's own checked list (src/data/support/), each
//    with where to go and its source — never a promise, because a committee or a bank decides;
//  - a few things the office does in the game: a free soil test, a farmer field school, and once a season, when
//    money is short, an incentive seed kit (a game version of programmes like Bangladesh's input incentive).
// Pure: no three.js and no React. The page shows it, sim.js opens it, layout.js places the building.
import { BD_SUPPORT } from '../data/support/bd_support.js';
import { ABROAD_SUPPORT } from '../data/support/abroad_support.js';

const q = (bn, en) => ({ bn, en });

// The office of each country, the board over its door in the local script, and the officer on duty (a sample person).
export const OFFICES = {
  bangladesh: {
    name: q('উপজেলা কৃষি অফিস', 'Upazila Agriculture Office'), sign: { t: 'উপজেলা কৃষি অফিস', sub: 'Upazila Agriculture Office' },
    officer: { name: q('উপসহকারী কৃষি কর্মকর্তা নাসরিন আক্তার', 'Sub-Assistant Agriculture Officer Nasrin Akter'), female: true },
  },
  india: {
    name: q('ব্লক কৃষি অফিস', 'Block Agriculture Office'), sign: { t: 'ਬਲਾਕ ਖੇਤੀਬਾੜੀ ਦਫ਼ਤਰ', sub: 'Block Agriculture Office' },
    officer: { name: q('কৃষি উন্নয়ন কর্মকর্তা গুরপ্রীত কৌর', 'Agriculture Development Officer Gurpreet Kaur'), female: true },
  },
  pakistan: {
    name: q('কৃষি সম্প্রসারণ অফিস', 'Agriculture Extension Office'), sign: { t: 'زرعی توسیع دفتر', sub: 'Agriculture Extension Office' }, rtl: true,
    officer: { name: q('কৃষি কর্মকর্তা আসিফ মেমন', 'Agriculture Officer Asif Memon'), female: false },
  },
  nepal: {
    name: q('কৃষি জ্ঞান কেন্দ্র', 'Agriculture Knowledge Centre'), sign: { t: 'कृषि ज्ञान केन्द्र', sub: 'Agriculture Knowledge Centre' },
    officer: { name: q('কৃষি প্রযুক্তিবিদ সুনীতা চৌধুরী', 'Agriculture Technician Sunita Chaudhary'), female: true },
  },
  bhutan: {
    name: q('গেওগ কৃষি সম্প্রসারণ অফিস', 'Gewog Agriculture Extension Office'), sign: { t: 'Gewog Agriculture Extension Office', sub: 'RNR Extension' },
    officer: { name: q('সম্প্রসারণ কর্মকর্তা দর্জি ওয়াংদি', 'Extension Officer Dorji Wangdi'), female: false },
  },
  myanmar: {
    name: q('টাউনশিপ কৃষি অফিস', 'Township Agriculture Office'), sign: { t: 'မြို့နယ်စိုက်ပျိုးရေးဦးစီးဌာန', sub: 'Township Department of Agriculture' },
    officer: { name: q('কৃষি কর্মকর্তা দাও খিন মার', 'Agriculture Officer Daw Khin Mar'), female: true },
  },
  usa: {
    name: q('USDA সার্ভিস সেন্টার', 'USDA Service Center'), sign: { t: 'USDA Service Center', sub: 'Farm Service Agency · NRCS' },
    officer: { name: q('কাউন্টি অফিসার মার্ক জেনসেন', 'County officer Mark Jensen'), female: false },
  },
  brazil: {
    name: q('গ্রামীণ কৃষি সহায়তা অফিস (EMPAER)', 'Rural extension office (EMPAER)'), sign: { t: 'EMPAER · Assistência Técnica Rural', sub: 'Rural extension' },
    officer: { name: q('কৃষিবিদ আনা পাওলা সিলভা', 'Agronomist Ana Paula Silva'), female: true },
  },
  spain: {
    name: q('আঞ্চলিক কৃষি অফিস (OCA)', 'District agriculture office (OCA)'), sign: { t: 'Oficina Comarcal Agraria', sub: 'Junta de Andalucía' },
    officer: { name: q('প্রযুক্তিবিদ হাভিয়ের মোরেনো', 'Technician Javier Moreno'), female: false },
  },
};
export const officeOf = (country) => OFFICES[country] ?? OFFICES.bangladesh;

// The officer's own look (a sample person): neat, in the clothes of the office in that place.
export function officerLook(country) {
  const o = officeOf(country), f = o.officer.female;
  const skin = { bangladesh: '#b98260', india: '#c08a66', pakistan: '#b07a55', nepal: '#c69872', bhutan: '#d1a27c', myanmar: '#c29068', usa: '#e2b48f', brazil: '#b98260', spain: '#d8a982' }[country] ?? '#b98260';
  if (country === 'bangladesh' && f) return { skin, hair: '#15100c', build: 0.94, female: true, head: 'hijab', headA: '#2e6b5a', headB: '#d9c48a', top: 'kameez', topA: '#e8eef0', topB: '#2e6b5a', lower: 'shalwar', lowA: '#2e6b5a', lowB: '#2e6b5a', feet: 'sandal', feetA: '#3a2a1e' };
  if (f) return { skin, hair: '#1a1411', build: 0.94, female: true, head: country === 'india' ? 'orhni' : 'short', headA: '#3b6ea5', headB: '#e2b84a', top: country === 'india' ? 'kameez' : 'shirt', topA: '#eef2f6', topB: '#3b6ea5', lower: country === 'india' ? 'shalwar' : 'cargo', lowA: '#2f3f55', lowB: '#2f3f55', feet: 'shoe', feetA: '#2a2420' };
  return { skin, hair: '#1a1411', build: 1, head: 'short', top: 'shirt', topA: '#e9eef3', topB: '#9db4cc', lower: 'cargo', lowA: '#3a4352', lowB: '#2e3542', feet: 'shoe', feetA: '#2a2420' };
}

const programmes = (country) => (country === 'bangladesh' ? BD_SUPPORT : ABROAD_SUPPORT[country]?.list ?? []).filter((p) => p.status !== 'announced');
// the kinds of programme that help with each kind of trouble
const KIND_FOR = { pests: ['advice', 'input'], dry: ['irrigation', 'advice'], dead: ['insurance', 'cash'], soil: ['soil', 'input'], repeat: ['advice', 'soil'], money: ['cash', 'input', 'credit'], storm: ['insurance', 'cash'], heat: ['advice', 'irrigation'], register: ['register'] };

// What the officer sees on this farm now: the troubles, worst first, each with what to do.
export function farmTroubles(g) {
  const P = g.plots, C = g.R.crops, out = [];
  const live = P.filter((p) => p.crop && !p.dead);
  const n = (f) => P.filter(f).length;
  const pests = n((p) => p.crop && p.pests > 0);
  if (pests) out.push({ id: 'pests', n: pests, tone: 'bad', text: q(`${pests}টি জমিতে পোকা লেগেছে। আজই দমন করুন, নইলে পাশের জমিতে ছড়াবে। আগে হাত দিয়ে বা জাল দিয়ে ধরুন, দরকার হলে অনুমোদিত বালাইনাশক, বাতাস কম থাকলে সকালে।`, `${pests} plots have pests. Treat them today or they will spread next door. Pick or net them first; use an approved pesticide only if needed, in the calm of the morning.`) });
  const dry = n((p) => p.crop && !p.dead && p.g < (g.perks?.early ? 0.8 : 1) && p.moist < 0.4);
  if (dry && !(g.ev.showerSoon > 0)) out.push({ id: 'dry', n: dry, tone: 'warn', text: q(`${dry}টি জমির মাটি শুকনো। সকালে বা বিকেলে গোড়ায় পানি দিন; দুপুরের রোদে দিলে বেশি উড়ে যায়।`, `${dry} plots are dry. Water at the roots in the morning or evening; at noon most of it evaporates.`) });
  if (dry && g.ev.showerSoon > 0) out.push({ id: 'rain', n: dry, tone: 'info', text: q('শুকনো জমি আছে, কিন্তু বৃষ্টি আসছে: এখন পানি দেবেন না, বৃষ্টির পানি কাজে লাগান।', 'Some plots are dry, but rain is coming: don’t water now, let the rain do it.') });
  const dead = n((p) => p.dead);
  if (dead) out.push({ id: 'dead', n: dead, tone: 'bad', text: q(`${dead}টি জমির ফসল মরে গেছে। গাছ তুলে ফেলুন, কারণ খুঁজুন (পানি, তাপ না পোকা), তারপর নতুন করে বুনুন। ক্ষতির কথা অফিসে লিখিয়ে রাখুন: সাহায্যের তালিকায় লাগে।`, `${dead} plots have died. Clear them, find out why (water, heat or pests), then sow again. Have the loss written down at the office: relief lists need it.`) });
  const repeats = n((p) => p.crop && p.repeat);
  if (repeats) out.push({ id: 'repeat', n: repeats, tone: 'warn', text: q(`${repeats}টি জমিতে একই ফসল আবার। এতে পোকা আর রোগ জমে, মাটি ক্লান্ত হয়। পরের বার ডাল জাতীয় ফসল দিন: মাটিতে নাইট্রোজেন ফেরে।`, `${repeats} plots have the same crop again. Pests and disease build up and the soil tires. Next time sow a legume: it puts nitrogen back.`) });
  if (g.soilHealth < 45) out.push({ id: 'soil', n: 0, tone: 'warn', text: q(`মাটির স্বাস্থ্য ${g.soilHealth}%। জৈব সার (কম্পোস্ট) দিন, ফসলের অবশিষ্ট মাটিতে মিশিয়ে দিন, আর ডাল ফসল ঘুরিয়ে দিন।`, `Soil health is ${g.soilHealth}%. Add compost, work crop residue back into the soil, and rotate in a legume.`) });
  const cheapest = Math.min(...Object.values(C).map((c) => c.cost));
  if (g.money < cheapest * 3 && !Object.values(g.basket).some(Boolean)) out.push({ id: 'money', n: 0, tone: 'warn', text: q('হাতে টাকা কম। নিচের সরকারি সহায়তাগুলো দেখুন, আর এই মৌসুমের প্রণোদনা বীজ নিতে পারেন।', 'Money is short. Look at the government support below, and you can take this season’s incentive seed.') });
  if (g.ev.zone || g.ev.storm > 0) out.push({ id: 'storm', n: 0, tone: 'bad', text: q('ঝড় চলছে: এখনই নিরাপদ জায়গায় যান। পরে ক্ষতির হিসাব নিয়ে আসবেন।', 'A storm is on: go to safe ground now. Come back with the damage afterwards.') });
  if (g.ev.heat > 0) out.push({ id: 'heat', n: 0, tone: 'warn', text: q('তাপপ্রবাহ চলছে: ভোরে আর সন্ধ্যায় পানি দিন, মালচ দিয়ে মাটি ঢেকে রাখুন, দুপুরে নিজে ছায়ায় থাকুন।', 'A heatwave is on: water at dawn and dusk, mulch the soil, and keep yourself in the shade at noon.') });
  if (!live.length && !dead) out.push({ id: 'empty', n: 0, tone: 'info', text: q('জমি এখন খালি। এই মৌসুমে আগের ফসল থেকে আলাদা কিছু বুনুন: উপগ্রহের মাটি-পানির হিসাব কিয়স্কে দেখে নিন।', 'The field is empty. Sow something different from last time this season: check the satellite soil and water numbers at the kiosk.') });
  if (!out.length) out.push({ id: 'fine', n: 0, tone: 'good', text: q('মাঠ ভালো আছে। এভাবেই ফসল ঘুরিয়ে চাষ করুন, আর আবহাওয়ার সতর্কতা দেখে কাজ করুন।', 'The field looks good. Keep rotating crops and act on the weather warnings.') });
  return out;
}

// The real programmes worth asking about for these troubles (running or "ask first" ones, never an announced-only
// scheme), the registration that opens the others always first. Up to n.
export function officePrograms(g, troubles = farmTroubles(g), n = 4) {
  const list = programmes(g.R.country);
  const want = ['register', ...troubles.flatMap((t) => KIND_FOR[t.id] ?? []), 'advice', 'input', 'insurance'];
  const out = [];
  for (const k of want) for (const p of list) if (p.kind === k && !out.includes(p) && out.length < n) out.push(p);
  for (const p of list) if (!out.includes(p) && out.length < n) out.push(p); // then whatever else the country has
  return out;
}

// What the office can do for the farmer in the game. Each once a season (`g.office.used`).
export const SERVICES = {
  soiltest: { title: q('বিনা মূল্যে মাটি পরীক্ষা', 'Free soil test'), body: q('প্রতিটি জমির উর্বরতা দেখাবে, আর কোথায় কী সার লাগবে।', 'Shows each plot’s fertility, and what it needs.') },
  school: { title: q('কৃষক মাঠ স্কুলে এক বেলা', 'A session at the farmer field school'), body: q('ফসলচক্র, পানি আর পোকা দমনের হাতে-কলমে শিক্ষা (+৪০ XP)।', 'Hands-on lessons on rotation, water and pest control (+40 XP).') },
  seedkit: { title: q('প্রণোদনার বীজ', 'Incentive seed kit'), body: q('টাকা কম থাকলে মৌসুমে একবার: ডাল ফসলের বীজ, বিনা মূল্যে (খেলার সুবিধা)।', 'Once a season when money is short: legume seed, free (a game benefit).') },
};

export function initOffice(g) { if (!g.office) g.office = { used: {}, visits: 0, soil: null }; return g.office; }

// can this service be had now? { ok, why }
export function canUse(g, id) {
  const o = initOffice(g);
  if (o.used[id]) return { ok: false, why: q('এই মৌসুমে নেওয়া হয়ে গেছে', 'Already had this season') };
  if (id === 'seedkit') {
    const cheapest = Math.min(...Object.values(g.R.crops).map((c) => c.cost));
    if (g.money >= cheapest * 3) return { ok: false, why: q('যাদের টাকা কম, তাদের জন্য', 'For farmers short of money') };
  }
  return { ok: true };
}

// do it: returns what happened, for the page to show
export function useService(g, id) {
  const c = canUse(g, id); if (!c.ok) return { ok: false, why: c.why };
  const o = initOffice(g); o.used[id] = true;
  if (id === 'soiltest') {
    o.soil = g.plots.map((p) => ({ i: p.i, fert: Math.round((0.4 + (p.fert ?? 0)) * 100) / 100, legume: !!(p.last && g.R.crops[p.last]?.soil) }));
    g.count.soilTests = (g.count.soilTests ?? 0) + 1;
    return { ok: true, soil: o.soil };
  }
  if (id === 'school') { g.xp = (g.xp ?? 0) + 40; g.count.fieldSchool = (g.count.fieldSchool ?? 0) + 1; return { ok: true, xp: 40 }; }
  if (id === 'seedkit') {
    const legumes = Object.entries(g.R.crops).filter(([, c]) => c.soil).map(([k]) => k);
    const k = legumes[0] ?? Object.keys(g.R.crops)[0], n = 3;
    g.seeds[k] = (g.seeds[k] ?? 0) + n; g.sel = k;
    return { ok: true, seed: k, n };
  }
  return { ok: false };
}

// One hazard list per field: everything that threatens this crop on this field, from the live 16-day forecast, the
// field's water balance and its soil test, ranked high first and then soonest. [MODEL forecast, RULE]
//
// It borrows every limit it can: heat from the crop's own rules (crops.js, via heatWatch), rain, heat-wave and
// cold-wave classes from BMD (weatherRisk.js), water from the FAO-56 balance (fieldwater.js). The few new limits are
// in docs/THRESHOLDS.md ("One hazard list per field"), each with its basis or marked as an assumption.
//
//   fieldHazards({ crop, plantT, today, wx, fw, soil, field, usualT }) → { hazards, clear, awd }
//     hazards: [{ id, severity: 'high'|'medium', daysAhead, date, trigger, rule, advice, source, tags }]
//     clear:   ids of the hazards checked and not found (so a page can say so)
//     awd:     awdAllowed() for this field
//   awdAllowed({ soil, field }) → { ok, because: 'saline'|'haor'|null, reason }
//
// A forecast is not a certainty and the list is redone each day. Nothing here diagnoses a disease or sets a dose.
import { parseISO, daysBetween } from './dates.js';
import { heatWatch } from './heatWatch.js';
import { BMD, COLD_CROPS } from './weatherRisk.js';

export const SALINE_EC = 4; // dS/m: a saline soil (USDA Handbook 60)
export const STRONG_EC = 8; // dS/m: strongly saline
export const LATE_DAYS = 21; // planted this many days or more after the usual date (assumption)
const ORDER = { high: 0, medium: 1 };

const daysFrom = (today, d) => daysBetween(today, parseISO(d));
const future = (wx, today) => (wx?.days ?? []).filter((x) => parseISO(x.d) > today);

export function awdAllowed({ soil = null, field = null } = {}) {
  if (soil?.ec_dsm != null && soil.ec_dsm >= SALINE_EC) {
    return { ok: false, because: 'saline', reason: {
      bn: `মাটি লবণাক্ত (পরীক্ষায় ইসি ${soil.ec_dsm} ডিএস/মি): জমি শুকাতে দেবেন না, সারা মৌসুম ২–৫ সেমি পানি রাখুন; শুকালে লবণ শিকড়ের কাছে জমে`,
      en: `The soil is saline (test EC ${soil.ec_dsm} dS/m): do not let the field dry; keep 2–5 cm of water all season, as drying draws salt up to the roots`,
    } };
  }
  if (field?.landform === 'haor') {
    return { ok: false, because: 'haor', reason: {
      bn: 'হাওরের জমি: পর্যায়ক্রমে শুকানো (AWD) এখানে চলে না; ২–৫ সেমি পানি রাখুন আর আগাম বন্যার আগে ধান কাটার প্রস্তুতি রাখুন',
      en: 'A haor field: alternate wetting and drying does not suit it; keep 2–5 cm of water and be ready to harvest before an early flash flood',
    } };
  }
  return { ok: true, because: null, reason: null };
}

function heat({ crop, plantT, today, wx }) {
  const hw = heatWatch({ crop, plantT, forecast: future(wx, today), today });
  const r = hw?.rules?.[0];
  if (!r || (r.level !== 'breach' && r.level !== 'near')) return null;
  const first = r.hotDays[0];
  return {
    id: 'heat', severity: r.level === 'breach' ? 'high' : 'medium',
    daysAhead: first ? daysFrom(today, first.d) : null, date: first?.d ?? null,
    trigger: { thr: r.thr, need: r.need, hotDays: r.hotDays.length, peak: r.peak, window: [r.from, r.to] },
    rule: r.rule, advice: hw.advice, source: `crops.js rule ${r.id}`, tags: ['MODEL', 'RULE'],
  };
}

function cold({ crop, today, wx }) {
  if (!COLD_CROPS.includes(crop.id)) return null;
  const cold = future(wx, today).filter((x) => x.tmin != null && x.tmin <= BMD.coldMild);
  if (!cold.length) return null;
  const low = cold.reduce((a, x) => (x.tmin < a.tmin ? x : a));
  return {
    id: 'cold', severity: low.tmin < BMD.coldModerate ? 'high' : 'medium',
    daysAhead: daysFrom(today, cold[0].d), date: cold[0].d,
    trigger: { minTmin: low.tmin, days: cold.length, thr: BMD.coldMild },
    rule: { bn: 'আবহাওয়া অধিদপ্তর: ৮–১০° মৃদু, ৬–৭.৯° মাঝারি, ৬°-এর নিচে তীব্র শৈত্যপ্রবাহ', en: 'BMD: 8–10 °C mild, 6–7.9 °C moderate, below 6 °C severe cold wave' },
    advice: [crop.id === 'boro'
      ? { bn: 'বীজতলা রাতে স্বচ্ছ পলিথিনে ঢাকুন, সকালে খুলুন; বীজতলায় পানি ধরে রাখুন', en: 'Cover the seedbed with clear polythene at night and open it in the morning; keep water in the seedbed' }
      : { bn: 'গাছের গোড়ায় হালকা সেচ দিন', en: 'Give the plants a light irrigation' }],
    source: 'weatherRisk.js BMD', tags: ['MODEL', 'RULE'],
  };
}

function rain({ today, wx, field }) {
  const wet = future(wx, today).filter((x) => (x.rain ?? 0) >= BMD.heavyRain);
  if (!wet.length) return null;
  const top = wet.reduce((a, x) => (x.rain > a.rain ? x : a));
  const haor = field?.landform === 'haor';
  const severity = top.rain >= BMD.veryHeavyRain || haor ? 'high' : 'medium';
  return {
    id: 'rain', severity, daysAhead: daysFrom(today, wet[0].d), date: wet[0].d,
    trigger: { maxRain: top.rain, days: wet.length, thr: BMD.heavyRain, haor },
    rule: { bn: 'আবহাওয়া অধিদপ্তর: ২৪ ঘণ্টায় ৪৪–৮৮ মিমি ভারী, ৮৯ মিমি বা বেশি অতি ভারী বৃষ্টি' + (haor ? '; হাওরে আগাম বন্যার ঝুঁকি বেশি' : ''), en: 'BMD: 44–88 mm in 24 h is heavy, 89 mm or more very heavy rain' + (haor ? '; on a haor, early flash floods are more likely' : '') },
    advice: [
      { bn: 'নালা খুলে রাখুন; বৃষ্টির আগে স্প্রে বা ইউরিয়া দেবেন না', en: 'Open the drains; do not spray or top-dress before the rain' },
      ...(haor ? [{ bn: 'ধান পেকে থাকলে আগেই কেটে উঁচু জায়গায় তুলুন; পানি উন্নয়ন বোর্ডের বন্যা সতর্কতা দেখুন', en: 'If the rice is ripe, cut it first and move it to high ground; follow the Water Development Board flood warning' }] : []),
    ],
    source: 'weatherRisk.js BMD', tags: ['MODEL', 'RULE'],
  };
}

function water({ fw, today }) {
  if (fw?.mode !== 'balance' || !fw.now) return null;
  if (fw.now.Dr >= fw.now.RAW) {
    return { id: 'water', severity: 'high', daysAhead: 0, date: null,
      trigger: { deficitMm: Math.round(fw.now.Dr), rawMm: Math.round(fw.now.RAW) },
      rule: { bn: 'ফসল যতটা পানি সহজে নিতে পারে (FAO-56-এর RAW) তা ফুরিয়েছে', en: 'The water the crop can take easily (FAO-56 RAW) is used up' },
      advice: [{ bn: 'আজই সেচ দিন, বা আজকের পাতার দুই সপ্তাহের পরিকল্পনা দেখুন', en: 'Irrigate today, or see the two-week plan on the Today page' }],
      source: 'fieldwater.js FAO-56', tags: ['MODEL', 'RULE'] };
  }
  const hit = (fw.horizon ?? []).find((x) => x.Dr >= x.RAW);
  if (!hit) return null;
  return { id: 'water', severity: 'medium', daysAhead: daysFrom(today, hit.d), date: hit.d,
    trigger: { deficitMm: Math.round(hit.Dr), rawMm: Math.round(hit.RAW) },
    rule: { bn: 'পূর্বাভাস ধরে মাটির সহজলভ্য পানি (FAO-56-এর RAW) ফুরিয়ে আসবে', en: 'On the forecast, the easily available soil water (FAO-56 RAW) runs out' },
    advice: [{ bn: 'আজকের পাতায় কবে কত সেচ দিতে হবে দেখুন', en: 'See when and how much to irrigate on the Today page' }],
    source: 'fieldwater.js FAO-56', tags: ['MODEL', 'RULE'] };
}

function salinity({ soil }) {
  const ec = soil?.ec_dsm;
  if (ec == null || ec < SALINE_EC) return null;
  return { id: 'salinity', severity: ec >= STRONG_EC ? 'high' : 'medium', daysAhead: null, date: null,
    trigger: { ec, thr: SALINE_EC, strong: STRONG_EC, tested: soil.tested?.date ?? null },
    rule: { bn: 'ইসি ৪ ডিএস/মি বা বেশি হলে মাটি লবণাক্ত, ৮ বা বেশি হলে তীব্র লবণাক্ত', en: 'EC of 4 dS/m or more is a saline soil, 8 or more strongly saline' },
    advice: [{ bn: 'লবণ সহনশীল জাত নিয়ে উপসহকারী কৃষি কর্মকর্তার সঙ্গে কথা বলুন; জমি শুকাতে দেবেন না', en: 'Ask the SAAO about salt-tolerant varieties; do not let the field dry out' }],
    source: 'soil test EC; USDA Handbook 60 classes', tags: ['RECORD', 'RULE'] };
}

function late({ crop, plantT, usualT }) {
  if (plantT == null || usualT == null) return null;
  const lateBy = daysBetween(usualT, plantT);
  if (lateBy < LATE_DAYS) return null;
  return { id: 'late', severity: 'medium', daysAhead: null, date: null,
    trigger: { lateBy, thr: LATE_DAYS },
    rule: { bn: `স্বাভাবিক সময়ের ${LATE_DAYS} দিন বা বেশি পরে লাগানো: ফুল আর কাটার সময় গরম বা বন্যার মাসের কাছে সরে যায়`, en: `Planted ${LATE_DAYS} days or more after the usual date: flowering and harvest move closer to the hot or flood months` },
    advice: [{ bn: 'কম দিনের জাতের কথা ভাবুন, আর ফুল আসার সময়ের আবহাওয়ার দিকে নজর রাখুন', en: 'Consider a shorter-duration variety, and watch the weather around flowering' }],
    source: `crops.js usual date (${crop.id})`, tags: ['RULE'] };
}

const CHECKS = [['heat', heat], ['cold', cold], ['rain', rain], ['water', water], ['salinity', salinity], ['late', late]];

export function fieldHazards({ crop, plantT = null, today, wx = null, fw = null, soil = null, field = null, usualT = null }) {
  if (!crop || today == null) return null;
  const ctx = { crop, plantT, today, wx, fw, soil, field, usualT };
  const hazards = [], clear = [];
  // A check without its input is not run, so it is neither found nor reported clear (no salinity test is not "not saline").
  const canCheck = {
    heat: !!wx?.days?.length && plantT != null, cold: !!wx?.days?.length, rain: !!wx?.days?.length,
    water: fw?.mode === 'balance' && !!fw.now, salinity: soil?.ec_dsm != null, late: plantT != null && usualT != null,
  };
  for (const [id, check] of CHECKS) {
    if (!canCheck[id]) continue;
    const h = check(ctx);
    if (h) hazards.push(h); else clear.push(id);
  }
  hazards.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || (a.daysAhead ?? 99) - (b.daysAhead ?? 99));
  return { hazards, clear, awd: crop.id === 'boro' ? awdAllowed({ soil, field }) : null };
}

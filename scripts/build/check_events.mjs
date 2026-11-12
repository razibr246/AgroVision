#!/usr/bin/env node
// Hindcast check: did the app's NASA data and crop rules flag real, documented crop disasters in Bangladesh?
//
//   node scripts/build/check_events.mjs        (npm run data:events)
//
// For each event, the same signal the app uses is worked out at the nearest of the seven upazilas for every season
// in the record, and the event year's rank is reported: rank 1 of 25 means the event season had the strongest
// signal of all. Two measures: the event season in the top 3 (a sharp warning), and above the usual (the median of
// the other seasons: pointing the right way). Every place tested is reported, hits and misses alike. Events and
// their sources are in EVENTS below (news and agency reports of damage; the dates and places are what is checked).
// Reads committed data only (station-corrected NASA POWER and IMERG, src/data/climate); prints the table and writes
// src/data/climate/event_check.json for the Science page.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClimate, stationCorrect, evalRule, plantDate, SEASONS } from '../../src/engine/climate.js';
import { RABI_CROPS } from '../../src/engine/crops.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));
const normals = read('src/data/climate/station_normals.json');
const climOf = (id) => makeClimate(stationCorrect(read(`src/data/climate/climate_${id}.json`), normals.stations[id]));
const DAY = 86400000, ymd = (y, m, d) => Date.UTC(y, m - 1, d);
const sum = (clim, v, a, b) => { let s = 0; for (let t = a; t <= b; t += DAY) { const x = clim.val(v, t); if (x == null) return null; s += x; } return s; };
const count = (clim, v, a, b, f) => { let n = 0; for (let t = a; t <= b; t += DAY) { const x = clim.val(v, t); if (x == null) return null; if (f(x)) n++; } return n; };
const max = (clim, v, a, b) => { let m = -Infinity; for (let t = a; t <= b; t += DAY) { const x = clim.val(v, t); if (x == null) return null; m = Math.max(m, x); } return m; };
// Boro's heat at flowering, as the app's rule counts it: days at or above the limit in days 75–95 after transplanting.
const boroHotDays = (clim, y) => {
  const rule = RABI_CROPS.boro.rules.find((r) => r.id === 'boro_heat');
  const t0 = plantDate(RABI_CROPS.boro, y);
  return count(clim, 'tmax', t0 + rule.from * DAY, t0 + rule.to * DAY, (x) => x >= rule.thr);
};

export const EVENTS = [
  {
    id: 'heat2024', places: ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat'], year: 2024,
    what: { bn: 'এপ্রিল ২০২৪-এর টানা তাপপ্রবাহ, রাজশাহীতে বোরোর ক্ষতি', en: 'The April 2024 heatwave: Boro hit in Rajshahi' },
    source: { label: 'Down To Earth, 26 Apr 2024: 30 days of heatwave from 1 April, longest since 1948; BAMIS bulletin of 24 Apr 2024 on severe heat over Rajshahi', url: 'https://www.downtoearth.org.in/climate-change/unusual-heat-scorches-bangladesh-as-april-s-consecutive-heatwave-breaks-76-year-record-96034' },
    signal: { bn: 'বোরোর ফুল আসার সময় ৩৬° সেলসিয়াস বা বেশি গরমের দিন (অ্যাপের নিয়ম)', en: 'Days at 36 °C or more while Boro flowers (the app’s rule)' },
    value: (c, y) => boroHotDays(c, y),
  },
  {
    id: 'heat2021', places: ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat'], year: 2021,
    what: { bn: '৪ এপ্রিল ২০২১-এর গরম বাতাস: ২৭–৩৬ জেলায় ৫০–৭০ হাজার হেক্টর বোরোতে চিটা', en: 'The hot wind of 4 April 2021: Boro sterility on 50,000–70,000 ha in 27–36 districts' },
    source: { label: 'Financial Express, Apr 2021: heat stress hits 30 districts (DAE figures)', url: 'https://old.thefinancialexpress.com.bd/national/heat-stress-hits-countrys-30-districts-1618291521' },
    signal: { bn: '১–১০ এপ্রিলের সবচেয়ে গরম দিন', en: 'The hottest day of 1–10 April' },
    value: (c, y) => max(c, 'tmax', ymd(y, 4, 1), ymd(y, 4, 10)),
    note: { bn: 'একদিনের গরম বাতাস; অ্যাপের ৩ দিনের নিয়ম এমন ঘটনা ধরে না', en: 'A one-day hot wind; the app’s three-day rule is not built to catch it' },
  },
  {
    id: 'flood2017', places: ['gowainghat'], year: 2017,
    what: { bn: 'এপ্রিল ২০১৭-এর আগাম পাহাড়ি ঢল: সিলেট বিভাগে ১ লাখ ১৪ হাজার হেক্টর বোরো ডুবেছে', en: 'The early flash flood of April 2017: 114,000 ha of Boro under water in Sylhet division' },
    source: { label: 'Dhaka Tribune, 23 Apr 2017 (DAE): 114,000 ha of Boro damaged in Sylhet division; OCHA: flooding from 28 March', url: 'https://www.dhakatribune.com/bangladesh/nation/19126/114-000-hectare-boro-crops-damaged-in-4-sylhet' },
    signal: { bn: '২৫ মার্চ–২০ এপ্রিলের মোট বৃষ্টি (নাসা IMERG)', en: 'Rain from 25 March to 20 April (NASA IMERG)' },
    value: (c, y) => sum(c, 'prec_imerg', ymd(y, 3, 25), ymd(y, 4, 20)),
    note: { bn: 'ঢলের পানির বড় অংশ আসে উজানের মেঘালয়ের বৃষ্টি থেকে, যা উপজেলার নিজের বৃষ্টিতে ধরা পড়ে না', en: 'Much of the flood water comes from rain upstream in Meghalaya, which the upazila’s own rain does not see' },
  },
  {
    id: 'flood2022', places: ['gowainghat'], year: 2022,
    what: { bn: 'এপ্রিল ২০২২-এর আগাম ঢল: সাত হাওর জেলায় বোরো ডুবেছে, সুনামগঞ্জে সবচেয়ে বেশি', en: 'The early flash flood of April 2022: Boro under water in seven haor districts, most in Sunamganj' },
    source: { label: 'Business Post, 11 Apr 2022 (DAE): 6,827 ha of Boro submerged in 7 districts; later reports over 30,000 ha in the Sylhet region', url: 'https://businesspostbd.com/back/2022-04-11/6827-hectares-of-boro-land-submerge-in-7-districts-2022-04-11' },
    signal: { bn: '২৫ মার্চ–২০ এপ্রিলের মোট বৃষ্টি (নাসা IMERG)', en: 'Rain from 25 March to 20 April (NASA IMERG)' },
    value: (c, y) => sum(c, 'prec_imerg', ymd(y, 3, 25), ymd(y, 4, 20)),
    note: { bn: 'ঢলের পানির বড় অংশ আসে উজানের মেঘালয়ের বৃষ্টি থেকে', en: 'Much of the flood water comes from rain upstream in Meghalaya' },
  },
  {
    id: 'cold2018', places: ['gangachara'], year: 2018,
    what: { bn: 'জানুয়ারি ২০১৮-এর শৈত্যপ্রবাহ: রংপুর অঞ্চলে প্রায় ৩০ হাজার হেক্টরে বোরোর বীজতলা নষ্ট', en: 'The cold wave of January 2018: Boro seedbeds damaged on about 30,000 ha in the Rangpur region' },
    source: { label: 'Financial Express, 24 Jan 2018 (DAE): seedbeds on about 29,710 ha in five Rangpur-region districts damaged by cold and fog', url: 'https://today.thefinancialexpress.com.bd/print/dense-fog-damages-boro-seedbeds-across-rangpur-region-1516720760' },
    signal: { bn: '১৫ ডিসেম্বর–৩১ জানুয়ারির ১০° সেলসিয়াস বা কম ঠান্ডা রাত (অ্যাপের ঠান্ডা রাতের মাপ)', en: 'Nights at 10 °C or below, 15 December – 31 January (the app’s cold-night measure)' },
    value: (c, y) => count(c, 'tmin', ymd(y - 1, 12, 15), ymd(y, 1, 31), (x) => x <= 10),
    note: { bn: 'ঘন কুয়াশাও বীজতলা নষ্ট করে, যা তাপমাত্রায় ধরা পড়ে না', en: 'Dense fog also harmed the seedbeds, which temperature does not capture' },
  },
];

const out = [];
for (const e of EVENTS) for (const place of e.places) {
  const clim = climOf(place);
  const series = SEASONS.map((y) => ({ y, v: e.value(clim, y) })).filter((r) => r.v != null);
  const sorted = [...series].sort((a, b) => b.v - a.v);
  const ev = series.find((r) => r.y === e.year);
  const rank = ev ? sorted.findIndex((r) => r.y === e.year) + 1 : null;
  const others = series.filter((r) => r.y !== e.year).map((r) => r.v).sort((a, b) => a - b);
  const median = others[Math.floor(others.length / 2)];
  out.push({ id: e.id, place, year: e.year, what: e.what, source: e.source, signal: e.signal, note: e.note ?? null,
    value: ev ? +ev.v.toFixed(1) : null, median: +median.toFixed(1), rank, of: series.length, hit: rank != null && rank <= 3, above: ev != null && ev.v > median,
    series: series.map((r) => [r.y, +r.v.toFixed(1)]) });
}
console.log('event        place        year  value   median  rank   top-3  above usual');
for (const r of out) console.log(`${r.id.padEnd(12)} ${r.place.padEnd(12)} ${r.year}  ${String(r.value).padStart(6)}  ${String(r.median).padStart(6)}  ${r.rank}/${r.of}   ${r.hit ? 'yes' : 'no '}    ${r.above ? 'yes' : 'no'}`);
const byEvent = EVENTS.map((e) => { const rows = out.filter((r) => r.id === e.id); return { id: e.id, places: rows.length, hits: rows.filter((r) => r.hit).length, above: rows.filter((r) => r.above).length }; });
console.log('\nper event:', byEvent.map((b) => `${b.id} top-3 ${b.hits}/${b.places}, above usual ${b.above}/${b.places}`).join('; '));
console.log(`all: top-3 in ${out.filter((r) => r.hit).length} of ${out.length}, above usual in ${out.filter((r) => r.above).length} of ${out.length}`);
writeFileSync(path.join(ROOT, 'src/data/climate/event_check.json'), JSON.stringify({
  provenance: { status: 'REAL', what: 'Documented crop disasters against the app’s NASA signals at the nearest upazila (scripts/build/check_events.mjs). top-3 = the event season ranks in the top 3 of the record; above usual = it is above the median of the other seasons.', data: 'NASA POWER daily (station-corrected) and NASA GPM IMERG daily via POWER', generated: new Date().toISOString().slice(0, 10) },
  results: out, summary: byEvent,
}, null, 1) + '\n');

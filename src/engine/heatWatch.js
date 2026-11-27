// Heat stress before it shows: the crop's own heat limits (crops.js, reviewed in docs/THRESHOLDS.md) laid over the
// live 16-day forecast at the field. [REAL forecast, RULE]
//
// A leaf wilts only after the damage is done; the grain or the flower is hurt on the hot days themselves. So this
// looks forward: for each heat rule of the crop (a run of days at or above a maximum temperature inside a growth
// window, e.g. Boro: 3+ days ≥ 36 °C on days 75–95), it counts the forecast days that fall inside that window and
// cross the limit. Levels:
//   breach - the forecast already holds enough hot days in the window to cross the limit
//   near   - one day short of it, or hot days are forecast just before the window opens
//   clear  - the window is in the forecast and stays under the limit
//   later  - the window starts after the forecast ends (with the number of days until it opens)
//   past   - the window is over
// A forecast is not a certainty, and each day it is redone. Days already past this season are not counted here
// (the season plan counts them); this is the look-ahead only.

import { parseISO, daysBetween } from './dates.js';

const LEVEL_ORDER = { breach: 0, near: 1, clear: 2, later: 3, past: 4 };

export function heatWatch({ crop, plantT, forecast, today }) {
  if (!crop?.rules || !forecast?.length || plantT == null) return null;
  const rules = crop.rules.filter((r) => r.v === 'tmax' && (r.type === 'count' || r.type === 'any'));
  if (!rules.length) return { crop: crop.id, rules: [], level: null };
  const days = forecast
    .map((x) => ({ d: x.d, tmax: x.tmax, dap: daysBetween(plantT, parseISO(x.d)) }))
    .filter((x) => x.tmax != null && (today == null || parseISO(x.d) > today));
  if (!days.length) return null;
  const lastDap = days[days.length - 1].dap, firstDap = days[0].dap;

  const out = rules.map((r) => {
    const need = r.type === 'any' ? 1 : r.min;
    const inWin = days.filter((x) => x.dap >= r.from && x.dap <= r.to);
    const hot = inWin.filter((x) => x.tmax >= r.thr);
    const hotBefore = days.filter((x) => x.dap >= r.from - 3 && x.dap < r.from && x.tmax >= r.thr);
    const peak = inWin.reduce((a, x) => Math.max(a, x.tmax), -Infinity);
    let level;
    if (firstDap > r.to) level = 'past';
    else if (lastDap < r.from) level = 'later';
    else if (hot.length >= need) level = 'breach';
    else if ((need > 1 && hot.length === need - 1) || hotBefore.length) level = 'near';
    else level = 'clear';
    return {
      id: r.id, thr: r.thr, need, from: r.from, to: r.to, rule: { bn: r.bn, en: r.en }, level,
      hotDays: hot.map((x) => ({ d: x.d, tmax: x.tmax, dap: x.dap })), firstHot: hot[0]?.d ?? null,
      inForecast: inWin.length, peak: Number.isFinite(peak) ? peak : null,
      opensIn: level === 'later' ? r.from - daysBetween(plantT, today ?? parseISO(days[0].d)) : null,
    };
  });
  out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  return { crop: crop.id, rules: out, level: out[0].level, advice: adviceFor(out[0]) };
}

// What a farmer can still do before hot days. General practice, not a crop-specific dose; the SAAO confirms.
function adviceFor(r) {
  if (r.level === 'breach' || r.level === 'near') {
    return [
      { bn: 'গরমের দিনগুলোর আগেই জমিতে পানি রাখুন: পানির টান আর গরম একসঙ্গে পড়লে ক্ষতি বেশি', en: 'Water before the hot days: heat on a crop that is also short of water does the most harm' },
      { bn: 'সেচ দিন বিকেলে বা সন্ধ্যায়, দুপুরের রোদে নয়', en: 'Irrigate in the late afternoon or evening, not in the midday sun' },
      { bn: 'এই কয়দিন কীটনাশক বা সার স্প্রে দুপুরে করবেন না', en: 'Do not spray pesticide or foliar fertiliser at midday on these days' },
      { bn: 'উপসহকারী কৃষি কর্মকর্তাকে জানান; এলাকায় একই গরম পড়লে তিনি সবাইকে সতর্ক করতে পারবেন', en: 'Tell the SAAO; if the heat covers the area, the office can warn everyone' },
    ];
  }
  return [];
}

// চক্র এজেন্ট in মাঠের মানুষ: the farmer's helper on the phone, like a companion in a big open-world game. The
// farmer taps a job ("water the dry plots", "harvest and sell", "do my rounds") and the agent does it: it walks the
// farmer to each plot or station and does the work there, one step at a time, while the farmer watches or takes
// over by moving. Pure: which jobs make sense now, what each would cost, and the next step of a running job. The
// stage walks and acts; this module only decides.
//
// The same rule as the app's Chakra Agent (src/engine/chakra.js): the agent may do free work on its own, but
// anything that spends the farmer's money needs the farmer's tap first, and every step goes in the job's log.
// It is also a careful farmer: it will not water when the forecast says rain is coming, and it sows a different
// crop from the last one on each plot (a legume where the soil is tired), as the missions teach.

import { ripeAt, priceOf } from './sim.js';
import { bnDigits } from '../engine/dates.js';

export const STEP_LIMIT = 30; // a runaway job stops after this many steps
export const STEP_TIMEOUT = 25; // seconds to reach one step before the agent gives up on it

const q = (bn, en) => ({ bn, en });

export const JOBS = {
  safe: { icon: 'shield', title: q('নিরাপদ জায়গায় নিয়ে যাও', 'Take me to safety'), done: q('নিরাপদ জায়গায় পৌঁছেছি।', 'We are on safe ground.') },
  rounds: { icon: 'sparkles', title: q('আমার সব কাজ সেরে দাও', 'Do my rounds'), done: q('মাঠের সব কাজ সারা।', 'The rounds are done.') },
  pests: { icon: 'bug', title: q('পোকা দমন করো', 'Treat the pests'), done: q('পোকা দমন হয়েছে।', 'Pests treated.') },
  harvest: { icon: 'wheat', title: q('পাকা ফসল তোলো', 'Harvest what is ripe'), done: q('পাকা ফসল তোলা হয়েছে।', 'Ripe crops harvested.') },
  water: { icon: 'droplets', title: q('শুকনো জমিতে পানি দাও', 'Water the dry plots'), done: q('শুকনো জমিতে পানি দেওয়া হয়েছে।', 'Dry plots watered.') },
  sell: { icon: 'coins', title: q('হাটে ফসল বেচো', 'Sell at the market'), done: q('হাটে বিক্রি হয়েছে।', 'Sold at the market.') },
  sow: { icon: 'sprout', title: q('খালি জমিতে বীজ বোনো', 'Sow the empty plots'), done: q('খালি জমিতে বোনা হয়েছে — ফসলচক্র মেনে।', 'Empty plots sown, crops rotated.') },
};

const live = (p) => p.crop && !p.dead;
const ripe = (g, p) => live(p) && p.g >= ripeAt(g);
const dry = (g, p) => live(p) && !ripe(g, p) && p.moist < 0.55;
const basketValue = (g) => Object.entries(g.basket).reduce((a, [k, n]) => a + n * priceOf(g, k), 0);
const nearest = (g, list) => list.reduce((b, p) => (!b || Math.hypot(p.x - g.me.x, p.z - g.me.z) < Math.hypot(b.x - g.me.x, b.z - g.me.z) ? p : b), null);
const plotStep = (g, p, extra = {}) => ({ kind: 'plot', i: g.plots.indexOf(p), x: p.x, z: p.z, ...extra });
const stationStep = (g, id, extra = {}) => ({ kind: 'station', id, x: g.S[id].x, z: g.S[id].z, ...extra });

// For each empty plot, the seed to sow: never the crop it just grew; a legume when the soil is tired.
export function sowPlan(g) {
  const C = g.R.crops, keys = Object.keys(C), legumes = keys.filter((k) => C[k].soil);
  const plan = [];
  for (const p of g.plots) {
    if (p.crop || p.dead) continue;
    const ok = keys.filter((k) => k !== p.last);
    const pick = (g.soilHealth < 55 && legumes.find((k) => k !== p.last)) || ok.sort((a, b) => C[a].cost - C[b].cost)[0] || keys[0];
    plan.push({ i: g.plots.indexOf(p), k: pick });
  }
  const need = {};
  for (const { k } of plan) need[k] = (need[k] ?? 0) + 1;
  const buy = Object.entries(need).map(([k, n]) => ({ k, n: Math.max(0, n - (g.seeds[k] ?? 0)) })).filter((b) => b.n > 0);
  const cost = buy.reduce((a, b) => a + C[b.k].cost * b.n, 0);
  return { plan, buy, cost };
}

// The jobs worth offering now, each with how many things it will do, what it costs, and why.
export function helperJobs(g) {
  const P = g.plots, out = [];
  const add = (id, n, extra = {}) => { if (n > 0) out.push({ id, n, cost: 0, ...JOBS[id], ...extra }); };
  if (g.ev.zone) add('safe', 1, { urgent: true });
  add('pests', P.filter((p) => live(p) && p.pests > 0).length, { urgent: P.some((p) => p.pests > 0) });
  add('harvest', P.filter((p) => ripe(g, p)).length);
  const thirsty = P.filter((p) => dry(g, p)).length;
  if (thirsty && g.ev.showerSoon > 0) out.push({ id: 'water', n: 0, cost: 0, ...JOBS.water, blocked: q('বৃষ্টি আসছে — এখন পানি দিলে নষ্ট হবে।', 'Rain is coming — watering now would be wasted.') });
  else add('water', thirsty);
  add('sell', basketValue(g) > 0 ? 1 : 0, { gain: basketValue(g) });
  const sp = sowPlan(g);
  if (sp.plan.length) add('sow', sp.plan.length, { cost: sp.cost, buy: sp.buy, afford: sp.cost <= g.money });
  const rounds = out.filter((j) => ['pests', 'harvest', 'water', 'sell'].includes(j.id) && !j.blocked).length;
  if (rounds >= 2) out.unshift({ id: 'rounds', n: rounds, cost: 0, ...JOBS.rounds });
  return out;
}

export const newJob = (id, { approved = false } = {}) => ({ id, steps: 0, bought: false, approved, log: [] });

// The next thing to do for a running job, or null when it is finished (or cannot go on).
export function nextStep(g, job) {
  if (job.steps >= STEP_LIMIT) return null;
  const P = g.plots;
  switch (job.id) {
    case 'safe': {
      const z = g.ev.zone; if (!z) return null;
      return Math.hypot(g.me.x - z.x, g.me.z - z.z) < z.r * 0.6 ? null : { kind: 'spot', x: z.x, z: z.z, r: z.r * 0.5 };
    }
    case 'pests': { const p = nearest(g, P.filter((x) => live(x) && x.pests > 0)); return p && plotStep(g, p); }
    case 'harvest': { const p = nearest(g, P.filter((x) => ripe(g, x))); return p && plotStep(g, p); }
    case 'water': {
      if (g.ev.showerSoon > 0) return null; // the agent checks the forecast before it carries water
      const p = nearest(g, P.filter((x) => dry(g, x))); if (!p) return null;
      return g.can > 0 ? plotStep(g, p) : stationStep(g, 'water');
    }
    case 'sell': return basketValue(g) > 0 ? stationStep(g, 'market') : null;
    case 'sow': {
      const sp = sowPlan(g); if (!sp.plan.length) return null;
      if (sp.buy.length && !job.bought) return job.approved && sp.cost <= g.money ? stationStep(g, 'shed', { buy: sp.buy }) : null;
      const s = sp.plan.find((x) => g.seeds[x.k] > 0); if (!s) return null;
      return plotStep(g, P[s.i], { sel: s.k });
    }
    case 'rounds': {
      if (g.ev.zone) return nextStep(g, { ...job, id: 'safe' });
      for (const id of ['pests', 'harvest', 'water', 'sell']) { const s = nextStep(g, { ...job, id }); if (s) return { ...s, part: id }; }
      return null;
    }
    default: return null;
  }
}

// a line for the job's log once a step is done; `what` is what the action button did there (target(g).what)
const DID = {
  spray: q('পোকা দমন করলাম', 'treated the pests'), harvest: q('পাকা ফসল তুললাম', 'harvested the ripe crop'),
  water: q('পানি দিলাম', 'watered it'), clear: q('মরা গাছ সাফ করলাম', 'cleared the dead plants'),
};
export function stepLine(g, s, what) {
  if (s.buy) return q(`বীজ কেনা: ${s.buy.map((b) => `${g.R.crops[b.k].bn} ×${b.n}`).join(', ')}`, `Bought seed: ${s.buy.map((b) => `${g.R.crops[b.k].en} ×${b.n}`).join(', ')}`);
  if (s.kind === 'station') return { water: q('বালতি ভরা হলো', 'Filled the can'), market: q('হাটে বিক্রি', 'Sold at the market'), shed: q('দোকানে', 'At the shop') }[s.id] ?? q('কাজ সারা', 'Done');
  if (s.kind === 'spot') return q('নিরাপদ জায়গায়', 'On safe ground');
  const n = s.i + 1, bn = bnDigits(String(n));
  if (s.sel) return q(`জমি ${bn}: ${g.R.crops[s.sel].bn} বুনলাম`, `Plot ${n}: sowed ${g.R.crops[s.sel].en}`);
  const d = DID[what] ?? q('কাজ সারলাম', 'done');
  return q(`জমি ${bn}: ${d.bn}`, `Plot ${n}: ${d.en}`);
}

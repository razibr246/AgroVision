// A 14-day irrigation plan for one field, chosen by stochastic dynamic programming on the FAO-56 water balance.
// [REAL in, MODEL + RULE]
//
// In: the field's own water balance from fieldwater.js (today's root-zone depletion Dr, and for each forecast day the
// crop's water use Kc·ET₀, the rain forecast, TAW and RAW, all from Open-Meteo and SoilGrids).
// Method: finite-horizon Bellman backward induction (the planning form of reinforcement learning: the "environment" is
// the FAO-56 balance, so the best policy is computed exactly instead of learned by trial). Each day the plan chooses
// "wait" or "refill to field capacity", knowing that tomorrow it can choose again after seeing the real rain.
// Rain forecasts are uncertain, more so further ahead, so each day's rain is one of three outcomes (as forecast, half,
// none) with weights that shift towards "none" with lead time (RAIN_OUTCOMES, an assumption: docs/THRESHOLDS.md).
// Cost of a day, in millimetres of water: water pumped + a fixed cost per irrigation (pump hire, labour) + a weight on
// the crop's lost transpiration ((1 − Ks)·Kc·ET₀, which drives yield loss in FAO-33's Ky relation). Weights are
// assumptions (COST, docs/THRESHOLDS.md); the planner's output changes with them, so they are shown on screen.
// The same probability model scores two simple rules for comparison: "refill when the crop starts to suffer" (the
// FAO-56 RAW trigger the Today card uses) and "water every 7 days".
// Boro is grown ponded under AWD (fieldwater.js), so it has no plan here.

import { FIELD_EFF } from './fieldwater.js';

export const HORIZON = 14;

// [lead days up to, [as forecast, half, none] weights]
export const RAIN_OUTCOMES = [
  [3, [0.6, 0.25, 0.15]],
  [7, [0.4, 0.3, 0.3]],
  [Infinity, [0.25, 0.35, 0.4]],
];
const FACTORS = [1, 0.5, 0];

// Rough ratio, an assumption (docs/THRESHOLDS.md): FAO-33 gives relative yield loss ≈ Ky × relative ET shortfall with
// Ky ≈ 1, so 1 mm of lost crop water use costs about yield/seasonal ET (wheat ≈ 3.5 t/ha ÷ 300 mm ≈ 12 kg/ha, about
// Tk 450/ha at Tk 38/kg), against roughly Tk 30/ha to pump 1 mm (10 m³) from a shallow tube well: about 15 to 1.
export const COST = { perIrrigation: 8, perMmPumped: 1, perMmStress: 15 };

const outcomesAt = (lead) => RAIN_OUTCOMES.find(([upTo]) => lead <= upTo)[1];

// One day of the balance from depletion Dr (mm), FAO-56 eq. 84–85; `refill` brings Dr to 0 before the day's rain.
function day(Dr, x, refill, rainFactor) {
  const start = refill ? 0 : Dr;
  const ks = start > x.RAW ? Math.max(0, (x.TAW - start) / (x.TAW - x.RAW)) : 1;
  const use = x.kc * x.et0;
  const next = Math.min(x.TAW, Math.max(0, start - rainFactor * x.rain + ks * use));
  return { next, stressMm: (1 - ks) * use, stressed: ks < 1 };
}

function stepCost(Dr, x, refill, rainFactor, cost) {
  const r = day(Dr, x, refill, rainFactor);
  const net = refill ? Dr : 0;
  const c = (refill ? cost.perIrrigation + cost.perMmPumped * (net / FIELD_EFF) : 0) + cost.perMmStress * r.stressMm;
  return { ...r, c, net };
}

const bin = (v) => Math.round(v);

// Best expected cost from each depletion (1 mm bins) on each day, and the decision that reaches it.
function solve(days, cost) {
  const n = days.length;
  const maxT = Math.ceil(Math.max(...days.map((x) => x.TAW)));
  // After the last day the field is left as it is; a field left below the stress point owes the refill it will need.
  const last = days[n - 1];
  let V = Array.from({ length: maxT + 1 }, (_, s) => (s >= last.RAW ? cost.perIrrigation + cost.perMmPumped * (s / FIELD_EFF) : 0));
  const act = [];
  for (let t = n - 1; t >= 0; t--) {
    const x = days[t], w = outcomesAt(t + 1);
    const nextV = V, Vt = new Array(maxT + 1).fill(0), At = new Array(maxT + 1).fill(false);
    for (let s = 0; s <= maxT; s++) {
      const q = [false, true].map((refill) => FACTORS.reduce((a, f, k) => {
        const r = stepCost(s, x, refill, f, cost);
        return a + w[k] * (r.c + nextV[Math.min(maxT, bin(r.next))]);
      }, 0));
      // Refill only when it is clearly better (ties wait: water not pumped is water saved).
      At[s] = s > 0.5 && q[1] < q[0] - 1e-9;
      Vt[s] = At[s] ? q[1] : q[0];
    }
    V = Vt; act[t] = At;
  }
  return { V, act, maxT };
}

// Expected totals of a policy over the same rain outcomes, by carrying the probability of each depletion forward.
function score(days, start, decide, cost) {
  const maxT = Math.ceil(Math.max(...days.map((x) => x.TAW)));
  let P = new Map([[bin(start), 1]]);
  const tot = { irrigations: 0, pumpedMm: 0, stressMm: 0, stressDays: 0, cost: 0 };
  days.forEach((x, t) => {
    const w = outcomesAt(t + 1), next = new Map();
    for (const [s, p] of P) {
      const refill = decide(t, s, x);
      FACTORS.forEach((f, k) => {
        const r = stepCost(s, x, refill, f, cost), pk = p * w[k];
        tot.irrigations += refill ? pk : 0;
        tot.pumpedMm += pk * (r.net / FIELD_EFF);
        tot.stressMm += pk * r.stressMm;
        tot.stressDays += r.stressed ? pk : 0;
        tot.cost += pk * r.c;
        const b = Math.min(maxT, bin(r.next));
        next.set(b, (next.get(b) ?? 0) + pk);
      });
    }
    P = next;
  });
  return tot;
}

// fw: the result of fieldWater() in 'balance' mode. Returns null when there is nothing to plan.
export function planIrrigation(fw, { horizon = HORIZON, cost = COST } = {}) {
  if (!fw || fw.mode !== 'balance' || !fw.now) return null;
  const src = (fw.horizon ?? fw.ahead ?? []).slice(0, horizon);
  if (!src.length) return null;
  const days = src.map((a) => ({ d: a.d, rain: a.rain ?? 0, et0: a.et0 ?? 0, kc: a.kc ?? 0, TAW: a.TAW, RAW: a.RAW }));
  const start = fw.now.Dr;
  const { act } = solve(days, cost);
  const best = score(days, start, (t, s) => act[t][s], cost);
  const atRaw = score(days, start, (t, s, x) => s >= x.RAW, cost);
  const weekly = score(days, start, (t) => t % 7 === 0, cost);

  // The plan along the forecast as given (rain arrives as forecast); it is re-made each day from the real soil.
  let Dr = start;
  const path = days.map((x, t) => {
    const refill = act[t][Math.min(act[t].length - 1, bin(Dr))];
    const before = Dr;
    const r = day(Dr, x, refill, 1);
    Dr = r.next;
    return { d: x.d, lead: t + 1, rain: x.rain, before, refill, netMm: refill ? before : 0, grossMm: refill ? before / FIELD_EFF : 0, after: Dr, stressed: r.stressed, RAW: x.RAW, TAW: x.TAW };
  });
  const first = path.find((p) => p.refill) ?? null;
  return {
    days: days.length, start, path, first, best, compare: { atRaw, weekly }, cost, outcomes: RAIN_OUTCOMES,
    savedVsRaw: { pumpedMm: atRaw.pumpedMm - best.pumpedMm, stressMm: atRaw.stressMm - best.stressMm, irrigations: atRaw.irrigations - best.irrigations },
    m3PerMm: fw.area_m2 / 1000,
  };
}

// Urea top-dress rain check: urea on the surface before heavy rain washes off or leaches. Picks, in the next `window`
// forecast days, the days whose own rain plus the next two days' stays under HEAVY_TOPDRESS_MM. [REAL forecast, RULE]
export const HEAVY_TOPDRESS_MM = 20;
export function topdressDays(forecast, { window = 7, limit = HEAVY_TOPDRESS_MM } = {}) {
  if (!forecast?.length) return null;
  const rows = forecast.slice(0, window).map((x, i) => {
    const wet = forecast.slice(i, i + 3).reduce((a, y) => a + (y.rain ?? 0), 0);
    return { d: x.d, lead: i + 1, rain48: wet, ok: wet < limit && (x.rain ?? 0) < 5 };
  });
  return { rows, best: rows.filter((r) => r.ok).sort((a, b) => a.rain48 - b.rain48 || a.lead - b.lead)[0] ?? null, limit };
}

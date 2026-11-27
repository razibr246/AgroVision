#!/usr/bin/env node
// Good and bad harvests of every Bangladeshi crop FAOSTAT records, and how far the season's weather explains them.
// [REAL data, MODEL]   npm run train:harvest
//
// Data (both real):
//   harvests  FAOSTAT national yield per crop and year (src/data/harvest/harvest_records.json, build_harvest_records.py)
//   weather   NASA POWER daily weather at the seven upazilas (src/data/climate/climate_*.json), averaged, over each
//             crop's own growing months (rainy, summer or winter season; months set per crop in the build script)
// Label: yields rise with better seed and fertiliser, so a year is judged against the crop's own trend: a straight
// line through the 7 years either side, leaving the year itself out. Anomaly = yield / trend − 1.
//   good ≥ +GOOD, bad ≤ −BAD, average in between; "very bad" (≤ −VERYBAD) is counted for the report.
// Clues: season rain, days of heavy rain (≥ 50 mm), longest dry spell, mean daily maximum, hot days (≥ 35 °C),
// cold nights (≤ 10 °C), mean humidity, mean sunshine (all-sky radiation), and the season (one-hot).
// Approaches, all scored the same way: LEAVE ONE YEAR OUT. Every year's harvests of every crop are predicted by a model
// that never saw that year, so a model cannot learn a year's weather from another crop's record of the same year.
//   base rate        always the most common class (the floor)
//   crop only        each crop's own most common class in the other years, no weather (the second floor)
//   logistic         multinomial logistic regression (softmax), L2
//   kNN              k nearest seasons, k = 15
//   tree             CART decision tree, depth 3
//   forest           random forest, 150 trees of depth 5, √features per split (seeded)
//   boosting         gradient-boosted trees, 60 rounds of depth-2 trees, learning rate 0.1
// Scores: accuracy, macro F1, per-class precision/recall, confusion matrix; recall of bad years; Brier score.
// Also: the 30 synthetic starter records (src/data/harvest/harvest_dataset.csv) scored the same way, reported
// separately and marked SYNTHETIC: they show the pipeline runs, not that any model works in the field.
// Writes src/data/models/harvest_model.json.
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p)));
const OUT = path.join(ROOT, 'src/data/models/harvest_model.json');

export const GOOD = 0.04, BAD = 0.04, VERYBAD = 0.12, HALF = 7;
const CLASSES = ['bad', 'average', 'good'];

// ── weather: national daily average of the seven upazilas ─────────────────────────────────────────────────────
const climDir = path.join(ROOT, 'src/data/climate');
const climates = readdirSync(climDir).filter((f) => /^climate_.*\.json$/.test(f)).map((f) => read(`src/data/climate/${f}`));
const day0 = Date.parse(climates[0].start + 'T00:00:00Z');
const nDays = Math.min(...climates.map((c) => c.tmax.length));
const avg = (k) => Array.from({ length: nDays }, (_, i) => {
  let s = 0, n = 0;
  for (const c of climates) { const v = c[k]?.[i]; if (v != null && v > -900) { s += v; n++; } }
  return n ? s / n : null;
});
const W = { tmax: avg('tmax'), tmin: avg('tmin'), prec: avg('prec'), rh: avg('rh'), srad: avg('srad') };
const dateOf = (i) => new Date(day0 + i * 86400000);
const lastDay = dateOf(nDays - 1);

// The growing months of a crop harvested in `year`: months after the window's last month belong to the year before
// (a winter crop harvested in 2024 grew from November 2023).
function seasonDays(months, year) {
  const last = months[months.length - 1];
  const wraps = months.some((m) => m > last);
  const want = new Set(months.map((m) => `${wraps && m > last ? year - 1 : year}-${m}`));
  const idx = [];
  for (let i = 0; i < nDays; i++) {
    const d = dateOf(i);
    if (want.has(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`)) idx.push(i);
  }
  const lastWant = Date.UTC(year, last, 0); // end of the window's last month
  return idx.length && lastWant <= lastDay.getTime() && idx.length >= months.length * 27 ? idx : null;
}

export const FEATURES = ['rain', 'heavyDays', 'dryRun', 'tmaxMean', 'hotDays', 'coldNights', 'rhMean', 'sradMean'];
function clues(idx) {
  let rain = 0, heavy = 0, run = 0, dry = 0, tx = 0, hot = 0, cold = 0, rh = 0, sr = 0;
  for (const i of idx) {
    const p = W.prec[i] ?? 0;
    rain += p; if (p >= 50) heavy++;
    run = p < 1 ? run + 1 : 0; dry = Math.max(dry, run);
    tx += W.tmax[i]; if (W.tmax[i] >= 35) hot++; if (W.tmin[i] <= 10) cold++;
    rh += W.rh[i]; sr += W.srad[i];
  }
  const n = idx.length;
  return { rain, heavyDays: heavy, dryRun: dry, tmaxMean: tx / n, hotDays: hot, coldNights: cold, rhMean: rh / n, sradMean: sr / n };
}

// ── labels: anomaly against the crop's own local trend ─────────────────────────────────────────────────────────
function trendAt(recs, year) {
  const pts = recs.filter((r) => r.year !== year && Math.abs(r.year - year) <= HALF);
  if (pts.length < 6) return null;
  const mx = pts.reduce((a, r) => a + r.year, 0) / pts.length, my = pts.reduce((a, r) => a + r.yieldTHa, 0) / pts.length;
  const sxx = pts.reduce((a, r) => a + (r.year - mx) ** 2, 0);
  const b = pts.reduce((a, r) => a + (r.year - mx) * (r.yieldTHa - my), 0) / sxx;
  return my + b * (year - mx);
}
const classOf = (a) => (a <= -BAD ? 'bad' : a >= GOOD ? 'good' : 'average');

const harvest = read('src/data/harvest/harvest_records.json');
const SEASONS = ['winter', 'summer', 'rainy', 'all'];
const rows = [];
const yearly = {};
for (const [crop, c] of Object.entries(harvest.crops)) {
  yearly[crop] = [];
  for (const r of c.records) {
    const t = trendAt(c.records, r.year);
    if (!t) continue;
    const anomaly = r.yieldTHa / t - 1;
    yearly[crop].push({ year: r.year, yieldTHa: r.yieldTHa, trend: +t.toFixed(3), anomaly: +anomaly.toFixed(4), cls: classOf(anomaly) });
    const idx = seasonDays(c.months, r.year);
    if (!idx) continue;
    rows.push({ crop, season: c.season, year: r.year, anomaly, y: classOf(anomaly), f: clues(idx), last: c.months[c.months.length - 1] });
  }
}

// ── --export <dir>: the same table for the Colab notebook (notebooks/agros_colab_training.ipynb), then stop ────────
// One row per crop-year with the label and the eight clues above, plus the twelve months of national weather that end
// with the crop's last growing month (rain total, mean tmax, tmin, humidity, sunshine) as a sequence for deep models.
const exportAt = process.argv.indexOf('--export');
if (exportAt > 0) {
  const dir = path.resolve(process.argv[exportAt + 1] ?? 'notebooks/data');
  const monthIdx = {};
  for (let i = 0; i < nDays; i++) { const d = dateOf(i); (monthIdx[`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`] ??= []).push(i); }
  const VARS = ['prec', 'tmax', 'tmin', 'rh', 'srad'];
  const seq = (year, last) => Array.from({ length: 12 }, (_, k) => {
    const m0 = year * 12 + (last - 1) - 11 + k; const ix = monthIdx[`${Math.floor(m0 / 12)}-${(m0 % 12) + 1}`];
    return VARS.map((v) => {
      if (!ix?.length) return '';
      const s = ix.reduce((a, i) => a + (W[v][i] ?? 0), 0);
      return (v === 'prec' ? s : s / ix.length).toFixed(2);
    });
  });
  const head = ['crop', 'season', 'year', 'anomaly', 'label', ...FEATURES, ...Array.from({ length: 12 }, (_, k) => VARS.map((v) => `m${k + 1}_${v}`)).flat()];
  const lines = [head.join(','), ...rows.map((r) => [r.crop, r.season, r.year, r.anomaly.toFixed(4), r.y, ...FEATURES.map((k) => r.f[k].toFixed(3)), ...seq(r.year, r.last).flat()].join(','))];
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'harvest_table.csv'), lines.join('\n') + '\n');
  console.log(`exported ${rows.length} crop-years to ${path.relative(ROOT, path.join(dir, 'harvest_table.csv'))}`);
  process.exit(0);
}

// ── features: standardised clues + season one-hot (scaling fitted on the training fold only) ───────────────────
function scaler(train) {
  return FEATURES.map((k) => {
    const v = train.map((r) => r.f[k]);
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const s = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1;
    return [m, s];
  });
}
// The crop itself is a clue too (one-hot): some crops have bad years far more often than others, and the weather is
// worth something only on top of that (see the "crop only" floor below).
const CROPS_ALL = Object.keys(harvest.crops);
const vec = (r, sc) => [...FEATURES.map((k, i) => (r.f[k] - sc[i][0]) / sc[i][1]), ...SEASONS.map((s) => (r.season === s ? 1 : 0)), ...CROPS_ALL.map((c) => (r.crop === c ? 1 : 0))];

// ── models ────────────────────────────────────────────────────────────────────────────────────────────────────────
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const K = CLASSES.length, ci = (y) => CLASSES.indexOf(y);
const softmax = (z) => { const m = Math.max(...z); const e = z.map((v) => Math.exp(v - m)); const s = e.reduce((a, b) => a + b); return e.map((v) => v / s); };
const mostCommon = (Y) => { const c = Array(K).fill(0); Y.forEach((y) => c[y]++); return c.map((v) => v / Y.length); };

const MODELS = {
  'base rate': (X, Y) => { const p = mostCommon(Y); const top = p.indexOf(Math.max(...p)); return () => CLASSES.map((_, k) => (k === top ? 1 : 0)); },
  logistic: (X, Y) => {
    const d = X[0].length; const Wt = Array.from({ length: K }, () => Array(d + 1).fill(0));
    for (let e = 0; e < 300; e++) {
      const G = Wt.map((w) => w.map(() => 0));
      X.forEach((x, n) => { const p = softmax(Wt.map((w) => w[0] + x.reduce((a, v, j) => a + v * w[j + 1], 0))); for (let k = 0; k < K; k++) { const g = p[k] - (Y[n] === k ? 1 : 0); G[k][0] += g; x.forEach((v, j) => { G[k][j + 1] += g * v; }); } });
      for (let k = 0; k < K; k++) for (let j = 0; j <= d; j++) Wt[k][j] -= 0.3 * (G[k][j] / X.length + (j ? 0.05 * Wt[k][j] : 0));
    }
    return (x) => softmax(Wt.map((w) => w[0] + x.reduce((a, v, j) => a + v * w[j + 1], 0)));
  },
  kNN: (X, Y) => (x) => {
    const near = X.map((t, n) => [t.reduce((a, v, j) => a + (v - x[j]) ** 2, 0), Y[n]]).sort((a, b) => a[0] - b[0]).slice(0, 15);
    const c = Array(K).fill(1e-3); near.forEach(([, y]) => c[y]++); const s = c.reduce((a, b) => a + b); return c.map((v) => v / s);
  },
  tree: (X, Y) => { const t = growTree(X, Y, 3, null, rng(1)); return (x) => leaf(t, x); },
  forest: (X, Y) => {
    const r = rng(7), trees = [];
    for (let b = 0; b < 150; b++) { const ix = X.map(() => Math.floor(r() * X.length)); trees.push(growTree(ix.map((i) => X[i]), ix.map((i) => Y[i]), 5, Math.max(1, Math.round(Math.sqrt(X[0].length))), r)); }
    return (x) => { const p = Array(K).fill(0); trees.forEach((t) => leaf(t, x).forEach((v, k) => { p[k] += v / trees.length; })); return p; };
  },
  boosting: (X, Y) => {
    const F = X.map(() => Array(K).fill(0)), rounds = [];
    for (let m = 0; m < 60; m++) {
      const P = F.map(softmax), stage = [];
      for (let k = 0; k < K; k++) {
        const res = Y.map((y, n) => (y === k ? 1 : 0) - P[n][k]);
        const t = growReg(X, res, 2);
        stage.push(t);
        X.forEach((x, n) => { F[n][k] += 0.1 * predReg(t, x); });
      }
      rounds.push(stage);
    }
    return (x) => softmax(CLASSES.map((_, k) => rounds.reduce((a, st) => a + 0.1 * predReg(st[k], x), 0)));
  },
};

// CART classification tree (Gini); `mtry` features tried per split (null = all).
function growTree(X, Y, depth, mtry, r) {
  const dist = mostCommon(Y);
  if (depth === 0 || Y.length < 10 || dist.some((p) => p === 1)) return { dist };
  const d = X[0].length; let feats = [...Array(d).keys()];
  if (mtry) { for (let i = feats.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [feats[i], feats[j]] = [feats[j], feats[i]]; } feats = feats.slice(0, mtry); }
  const gini = (ys) => { if (!ys.length) return 0; const c = Array(K).fill(0); ys.forEach((y) => c[y]++); return 1 - c.reduce((a, v) => a + (v / ys.length) ** 2, 0); };
  let best = null;
  for (const j of feats) {
    const vals = [...new Set(X.map((x) => x[j]))].sort((a, b) => a - b);
    const step = Math.max(1, Math.floor(vals.length / 16));
    for (let v = step; v < vals.length; v += step) {
      const thr = (vals[v - 1] + vals[v]) / 2, L = [], R = [];
      X.forEach((x, n) => (x[j] <= thr ? L : R).push(Y[n]));
      if (L.length < 5 || R.length < 5) continue;
      const g = (L.length * gini(L) + R.length * gini(R)) / Y.length;
      if (!best || g < best.g) best = { g, j, thr };
    }
  }
  if (!best || best.g >= gini(Y) - 1e-9) return { dist };
  const li = [], ri = []; X.forEach((x, n) => (x[best.j] <= best.thr ? li : ri).push(n));
  return { j: best.j, thr: best.thr, l: growTree(li.map((i) => X[i]), li.map((i) => Y[i]), depth - 1, mtry, r), r: growTree(ri.map((i) => X[i]), ri.map((i) => Y[i]), depth - 1, mtry, r) };
}
const leaf = (t, x) => (t.dist ? t.dist : leaf(x[t.j] <= t.thr ? t.l : t.r, x));
function growReg(X, y, depth) {
  const mean = y.reduce((a, b) => a + b, 0) / y.length;
  if (depth === 0 || y.length < 10) return { v: mean };
  let best = null;
  for (let j = 0; j < X[0].length; j++) {
    const vals = [...new Set(X.map((x) => x[j]))].sort((a, b) => a - b), step = Math.max(1, Math.floor(vals.length / 16));
    for (let v = step; v < vals.length; v += step) {
      const thr = (vals[v - 1] + vals[v]) / 2; let sl = 0, nl = 0, sr = 0, nr = 0;
      X.forEach((x, n) => { if (x[j] <= thr) { sl += y[n]; nl++; } else { sr += y[n]; nr++; } });
      if (nl < 5 || nr < 5) continue;
      const gain = sl * sl / nl + sr * sr / nr;
      if (!best || gain > best.gain) best = { gain, j, thr };
    }
  }
  if (!best) return { v: mean };
  const li = [], ri = []; X.forEach((x, n) => (x[best.j] <= best.thr ? li : ri).push(n));
  return { j: best.j, thr: best.thr, l: growReg(li.map((i) => X[i]), li.map((i) => y[i]), depth - 1), r: growReg(ri.map((i) => X[i]), ri.map((i) => y[i]), depth - 1) };
}
const predReg = (t, x) => (t.v !== undefined ? t.v : predReg(x[t.j] <= t.thr ? t.l : t.r, x));

// ── scoring ───────────────────────────────────────────────────────────────────────────────────────────────────────
function score(yTrue, probs) {
  const yPred = probs.map((p) => p.indexOf(Math.max(...p)));
  const cm = CLASSES.map(() => Array(K).fill(0)); yTrue.forEach((t, n) => { cm[t][yPred[n]]++; });
  const per = CLASSES.map((c, k) => {
    const tp = cm[k][k], fp = cm.reduce((a, r, i) => a + (i !== k ? r[k] : 0), 0), fn = cm[k].reduce((a, v, j) => a + (j !== k ? v : 0), 0);
    const precision = tp + fp ? tp / (tp + fp) : 0, recall = tp + fn ? tp / (tp + fn) : 0;
    return { cls: c, precision: +precision.toFixed(3), recall: +recall.toFixed(3), f1: +(precision + recall ? (2 * precision * recall) / (precision + recall) : 0).toFixed(3), n: tp + fn };
  });
  const brier = probs.reduce((a, p, n) => a + p.reduce((s, v, k) => s + (v - (yTrue[n] === k ? 1 : 0)) ** 2, 0), 0) / probs.length;
  return { accuracy: +(yPred.filter((p, n) => p === yTrue[n]).length / yTrue.length).toFixed(3), macroF1: +(per.reduce((a, r) => a + r.f1, 0) / K).toFixed(3), brier: +brier.toFixed(3), perClass: per, confusion: cm };
}

function leaveOneGroupOut(data, groupOf, toVec, fit) {
  const groups = [...new Set(data.map(groupOf))];
  const probs = Array(data.length), yTrue = data.map((r) => ci(r.y));
  for (const g of groups) {
    const train = data.filter((r) => groupOf(r) !== g), test = data.map((r, i) => [r, i]).filter(([r]) => groupOf(r) === g);
    const sc = scaler(train);
    const model = fit(train.map((r) => toVec(r, sc)), train.map((r) => ci(r.y)));
    for (const [r, i] of test) probs[i] = model(toVec(r, sc));
  }
  return score(yTrue, probs);
}

const results = {};
for (const [name, fit] of Object.entries(MODELS)) {
  results[name] = leaveOneGroupOut(rows, (r) => r.year, vec, fit);
  console.log(`${name.padEnd(10)} accuracy ${results[name].accuracy}  macro-F1 ${results[name].macroF1}  bad-year recall ${results[name].perClass[0].recall}`);
}
// A second floor that uses no weather at all: each test year gets the class its crop had most often in the other
// years. Some crops have bad years more often than others, so this alone catches some bad years; a weather model is
// worth something only by what it adds over this.
const CROP_IDS = [...new Set(rows.map((r) => r.crop))];
results['crop only'] = leaveOneGroupOut(rows, (r) => r.year, (r) => [CROP_IDS.indexOf(r.crop)], (X, Y) => {
  const c = CROP_IDS.map(() => Array(K).fill(0)); X.forEach(([i], n) => { c[i][Y[n]]++; });
  return ([i]) => { const t = c[i].reduce((a, b) => a + b, 0) || 1; return c[i].map((v) => v / t); };
});
console.log(`crop only  accuracy ${results['crop only'].accuracy}  macro-F1 ${results['crop only'].macroF1}  bad-year recall ${results['crop only'].perClass[0].recall}`);
const FLOORS = new Set(['base rate', 'crop only']);
const ranked = Object.entries(results).filter(([n]) => !FLOORS.has(n)).sort((a, b) => b[1].macroF1 - a[1].macroF1);
const best = ranked[0][0];

// ── the 30 synthetic starter records, scored the same way (leave one record out), reported apart ───────────────
const csv = readFileSync(path.join(ROOT, 'src/data/harvest/harvest_dataset.csv'), 'utf8').trim().split('\n');
const head = csv[0].split(',');
const syn = csv.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [head[i], v])));
const qClass = (q) => (q === 'Poor' ? 'bad' : q === 'Fair' ? 'average' : 'good');
const SF = ['temp_c', 'rain7_mm', 'humidity_pct', 'soil_moisture_pct'];
const synRows = syn.map((r) => ({ id: r.id, y: qClass(r.harvest_quality), f: Object.fromEntries(SF.map((k) => [k, +r[k]])), diseased: r.disease_status !== 'None' }));
const synVec = (r, sc) => [...SF.map((k, i) => (r.f[k] - sc[i][0]) / sc[i][1]), r.diseased ? 1 : 0];
const synScaler = (train) => SF.map((k) => { const v = train.map((r) => r.f[k]); const m = v.reduce((a, b) => a + b, 0) / v.length; return [m, Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1]; });
const synthetic = {};
for (const name of ['base rate', 'logistic', 'kNN', 'tree']) {
  const fit = name === 'kNN' ? (X, Y) => (x) => { const near = X.map((t, n) => [t.reduce((a, v, j) => a + (v - x[j]) ** 2, 0), Y[n]]).sort((a, b) => a[0] - b[0]).slice(0, 5); const c = Array(K).fill(1e-3); near.forEach(([, y]) => c[y]++); const s = c.reduce((a, b) => a + b); return c.map((v) => v / s); } : MODELS[name];
  const probs = [], yTrue = synRows.map((r) => ci(r.y));
  synRows.forEach((r, i) => { const train = synRows.filter((_, j) => j !== i); const sc = synScaler(train); const m = fit(train.map((t) => synVec(t, sc)), train.map((t) => ci(t.y))); probs.push(m(synVec(r, sc))); });
  synthetic[name] = score(yTrue, probs);
}

// ── per-crop record for the agent and the app: the worst and best years since 2001, with their weather ─────────
const crops = Object.fromEntries(Object.entries(harvest.crops).map(([crop, c]) => {
  const ys = yearly[crop].filter((r) => r.year >= 2001);
  const byA = [...ys].sort((a, b) => a.anomaly - b.anomaly);
  const w = (yr) => rows.find((r) => r.crop === crop && r.year === yr)?.f ?? null;
  const round = (f) => f && Object.fromEntries(Object.entries(f).map(([k, v]) => [k, +v.toFixed(1)]));
  return [crop, {
    name: c.name, season: c.season, months: c.months,
    latest: c.records[c.records.length - 1],
    counts: { good: ys.filter((r) => r.cls === 'good').length, average: ys.filter((r) => r.cls === 'average').length, bad: ys.filter((r) => r.cls === 'bad').length, veryBad: ys.filter((r) => r.anomaly <= -VERYBAD).length },
    worst: byA.slice(0, 3).map((r) => ({ ...r, weather: round(w(r.year)) })),
    best: byA.slice(-3).reverse().map((r) => ({ ...r, weather: round(w(r.year)) })),
    years: yearly[crop],
  }];
}));

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({
  provenance: {
    status: 'REAL',
    data: `FAOSTAT Bangladesh yields (${harvest.years[0]}–${harvest.years[1]}, ${Object.keys(harvest.crops).length} crops) and NASA POWER daily weather at the seven upazilas (${climates[0].start} to ${lastDay.toISOString().slice(0, 10)})`,
    trained: new Date().toISOString().slice(0, 10),
    method: `Each harvest judged against the crop's own trend (a line through the ${HALF} years either side, the year itself left out): good ≥ +${GOOD * 100}%, bad ≤ −${BAD * 100}%. Models scored leaving one whole year out at a time.`,
  },
  classes: CLASSES, features: FEATURES, thresholds: { GOOD, BAD, VERYBAD, HALF },
  n: { rows: rows.length, crops: new Set(rows.map((r) => r.crop)).size, years: new Set(rows.map((r) => r.year)).size, byClass: Object.fromEntries(CLASSES.map((c) => [c, rows.filter((r) => r.y === c).length])) },
  results, best, beatsBase: results[best].macroF1 > results['base rate'].macroF1 + 0.02,
  beatsCropOnly: results[best].macroF1 > results['crop only'].macroF1 + 0.02,
  synthetic: { status: 'SYNTHETIC', n: synRows.length, note: 'The 30 starter records of the brief, scored leaving one record out. They are made-up examples; these scores show the pipeline runs, not that a model works in the field.', results: synthetic },
  crops,
}, null, 1) + '\n');
console.log(`best: ${best} (macro-F1 ${results[best].macroF1} vs base ${results['base rate'].macroF1}); ${rows.length} crop-years; wrote ${path.relative(ROOT, OUT)}`);
console.log('synthetic 30:', Object.entries(synthetic).map(([k, v]) => `${k} ${v.accuracy}`).join(', '));

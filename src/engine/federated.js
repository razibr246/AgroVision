// Federated learning for pest-outbreak warnings, so farms help each other without handing over their records.
// [DEMO data, MODEL]
//
// What is real here is the protocol, not the data. The farms and their seasons are generated (makeFarms, seeded, so
// every run is the same) from weather-like features; no real farm's pest records exist in this app. The point is to
// show, with numbers that can be checked, how the office could build a shared outbreak model:
//   1. FedAvg (McMahan et al. 2017, "Communication-Efficient Learning of Deep Networks from Decentralized Data"):
//      each farm trains a small logistic-regression model on its own seasons, on its own phone; only the model's
//      weights go to the office, which averages them (weighted by how many seasons each farm has) and sends the
//      average back. Raw records never leave the farm.
//   2. Secure aggregation (Bonawitz et al. 2017, "Practical Secure Aggregation for Privacy-Preserving Machine
//      Learning"), in its simplest form: every pair of farms agrees on a random mask; one adds it, the other
//      subtracts it. The office sees only masked vectors that look like noise, but their sum is the true sum, because
//      the masks cancel. (The real protocol also handles farms dropping out; this one assumes all reply.)
//   3. Optional differential privacy (DP-FedAvg, McMahan et al. 2018): each update is clipped and Gaussian noise is
//      added, which bounds what any one farm's update can reveal, at some cost in accuracy.
// Compared on the same held-out seasons: each farm alone, the federated model, and (as the ceiling a privacy-
// ignoring system would reach) one model trained on everything pooled.

export const FEATURES = [
  { id: 'humid', bn: 'গরম-ভেজা দিন', en: 'Warm humid days' },
  { id: 'tmin', bn: 'রাতের তাপমাত্রা', en: 'Night temperature' },
  { id: 'rainDays', bn: 'বৃষ্টির দিন', en: 'Rainy days' },
  { id: 'susceptible', bn: 'রোগ-সংবেদনশীল জাত', en: 'Susceptible variety' },
];

// Small seeded generator (mulberry32) so results do not change between runs.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const dot = (w, x) => w.reduce((a, wi, i) => a + wi * (i === 0 ? 1 : x[i - 1]), 0);

// The hidden rule the DEMO data follows (unknown to the farms), and each farm's own climate (non-identical data).
const TRUE_W = [-3.2, 0.55, 0.25, 0.12, 1.4];

export function makeFarms({ seed = 7, farms = 8, minSeasons = 6, maxSeasons = 30, test = 40 } = {}) {
  const r = rng(seed);
  const season = (f) => {
    const x = [
      Math.max(0, f.humid + gauss(r) * 1.6),
      f.tmin + gauss(r) * 0.8,
      Math.max(0, f.rain + gauss(r) * 2),
      r() < f.susc ? 1 : 0,
    ];
    // Standardise to the scale the model uses.
    const z = [(x[0] - 4) / 2, (x[1] - 14) / 2, (x[2] - 6) / 3, x[3]];
    return { x: z, y: r() < sigmoid(dot(TRUE_W, z)) ? 1 : 0 };
  };
  return Array.from({ length: farms }, (_, i) => {
    const f = { humid: 2 + r() * 5, tmin: 11 + r() * 6, rain: 3 + r() * 6, susc: 0.2 + r() * 0.6 };
    const n = Math.round(minSeasons + r() * (maxSeasons - minSeasons));
    return { id: `F${i + 1}`, n, train: Array.from({ length: n }, () => season(f)), test: Array.from({ length: test }, () => season(f)), climate: f };
  });
}

// Plain gradient descent on the logistic loss with a little L2, from weights w.
export function trainLocal(w, data, { epochs = 20, lr = 0.2, l2 = 0.01 } = {}) {
  const v = w.slice();
  for (let e = 0; e < epochs; e++) {
    const g = new Array(v.length).fill(0);
    for (const { x, y } of data) {
      const err = sigmoid(dot(v, x)) - y;
      g[0] += err;
      for (let i = 1; i < v.length; i++) g[i] += err * x[i - 1];
    }
    for (let i = 0; i < v.length; i++) v[i] -= lr * (g[i] / data.length + (i ? l2 * v[i] : 0));
  }
  return v;
}

// Pairwise masks that cancel in the sum: farm i adds m_ij for j > i and subtracts m_ji for j < i.
export function maskUpdates(updates, seed = 99) {
  const k = updates.length, dim = updates[0].length;
  const masked = updates.map((u) => u.slice());
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const r = rng(seed * 1009 + i * 31 + j); // the pair's shared secret
      for (let d = 0; d < dim; d++) {
        const m = (r() - 0.5) * 200;
        masked[i][d] += m;
        masked[j][d] -= m;
      }
    }
  }
  return masked;
}

const sumVec = (vs) => vs.reduce((a, v) => a.map((x, i) => x + v[i]), new Array(vs[0].length).fill(0));

export function federate(farms, { rounds = 15, epochs = 5, lr = 0.2, secure = true, dp = null, seed = 3 } = {}) {
  const dim = FEATURES.length + 1;
  let w = new Array(dim).fill(0);
  const r = rng(seed);
  const history = [];
  let lastSeen = null;
  for (let round = 0; round < rounds; round++) {
    // Each farm sends n × (its new weights − the shared ones): the weighted FedAvg update.
    let updates = farms.map((f) => {
      const local = trainLocal(w, f.train, { epochs, lr });
      let delta = local.map((v, i) => v - w[i]);
      if (dp) {
        const norm = Math.hypot(...delta);
        const s = Math.min(1, dp.clip / (norm || 1));
        delta = delta.map((v) => v * s + gauss(r) * dp.noise * dp.clip);
      }
      return delta.map((v) => v * f.n);
    });
    if (secure) updates = maskUpdates(updates, seed + round);
    lastSeen = updates;
    const total = farms.reduce((a, f) => a + f.n, 0);
    const avg = sumVec(updates).map((v) => v / total);
    w = w.map((v, i) => v + avg[i]);
    history.push({ round: round + 1, accuracy: evaluate(w, farms.flatMap((f) => f.test)).accuracy });
  }
  return { w, history, lastSeen };
}

export function evaluate(w, data) {
  let correct = 0, tp = 0, fp = 0, fn = 0;
  for (const { x, y } of data) {
    const p = sigmoid(dot(w, x)) >= 0.5 ? 1 : 0;
    if (p === y) correct++;
    if (p && y) tp++; else if (p && !y) fp++; else if (!p && y) fn++;
  }
  return { accuracy: correct / data.length, recall: tp + fn ? tp / (tp + fn) : null, precision: tp + fp ? tp / (tp + fp) : null, n: data.length };
}

// The comparison shown on screen. Every model is scored on each farm's own held-out seasons.
export function compareFederated(opts = {}) {
  const farms = makeFarms(opts);
  const zero = new Array(FEATURES.length + 1).fill(0);
  const perFarm = (wOf) => farms.map((f) => ({ id: f.id, n: f.n, ...evaluate(wOf(f), f.test) }));
  const local = perFarm((f) => trainLocal(zero, f.train, { epochs: 100 }));
  const fed = federate(farms, { secure: true });
  const federated = perFarm(() => fed.w);
  const pooled = trainLocal(zero, farms.flatMap((f) => f.train), { epochs: 100 });
  const central = perFarm(() => pooled);
  const fedDp = federate(farms, { secure: true, dp: { clip: 40, noise: 0.05 } });
  const mean = (rows) => rows.reduce((a, r) => a + r.accuracy, 0) / rows.length;
  return {
    farms: farms.map((f) => ({ id: f.id, n: f.n })),
    local, federated, central, dp: perFarm(() => fedDp.w),
    mean: { local: mean(local), federated: mean(federated), central: mean(central), dp: mean(perFarm(() => fedDp.w)) },
    history: fed.history, officeSaw: fed.lastSeen, weights: fed.w,
  };
}

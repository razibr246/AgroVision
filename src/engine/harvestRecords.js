// Real harvest records (FAOSTAT) and the harvest model's measured skill, put into words. Pure: reads harvest_model.json
// (npm run train:harvest), predicts nothing on its own. [REAL data, MODEL]
//   cropHarvest(model, id)  - one crop's record: latest yield, good/bad year counts, worst and best years with weather
//   modelSkill(model)       - each approach's held-out scores, the best one, and whether it beats the two floors:
//                             always "average", and each crop's own usual class with no weather ("crop only")
//   bestCrops(model, season) - crops of a season ranked by how rarely they have a bad year (steadiest first)
//   harvestBrief(model, crop) - the compact national record sent to the crop doctor as context

export function cropHarvest(model, id) {
  const c = model?.crops?.[id];
  if (!c) return null;
  const n = c.counts.good + c.counts.average + c.counts.bad;
  return { ...c, id, n, badShare: n ? c.counts.bad / n : null };
}

export function modelSkill(model) {
  if (!model?.results) return null;
  const rows = Object.entries(model.results).map(([name, r]) => ({
    name, accuracy: r.accuracy, macroF1: r.macroF1, badRecall: r.perClass.find((p) => p.cls === 'bad')?.recall ?? 0, brier: r.brier,
  }));
  const base = rows.find((r) => r.name === 'base rate');
  const cropOnly = rows.find((r) => r.name === 'crop only') ?? null; // the floor that uses no weather
  const best = rows.find((r) => r.name === model.best);
  return { rows, base, cropOnly, best, n: model.n,
    beatsBase: !!(best && base && best.macroF1 > base.macroF1 + 0.02),
    beatsCropOnly: !!(best && cropOnly && best.macroF1 > cropOnly.macroF1 + 0.02) };
}

// The app's crop ids are seasons of rice for Boro, Aus and Aman; FAOSTAT has one rice series for all three.
const RECORD_OF = { boro: 'rice', aus: 'rice', aman: 'rice' };

// A short, plain record for the crop doctor's prompt: how often this crop has a bad national year, and what the
// weather was in its three worst. Context only: it is national and yearly, so it says nothing about one field.
export function harvestBrief(model, appCrop) {
  const id = RECORD_OF[appCrop] ?? appCrop;
  const c = cropHarvest(model, id);
  if (!c || !c.n) return null;
  return {
    crop: c.name.en, allSeasons: id !== appCrop, since: 2001, years: c.n, // the counts start in 2001, where the NASA POWER weather does (train_harvest_model.mjs)
    good: c.counts.good, bad: c.counts.bad, veryBad: c.counts.veryBad,
    latest: { year: c.latest.year, yieldTHa: c.latest.yieldTHa },
    worst: c.worst.slice(0, 3).map((w) => ({
      year: w.year, pct: Math.round(w.anomaly * 100),
      rain: w.weather ? Math.round(w.weather.rain) : null, hotDays: w.weather?.hotDays ?? null, rh: w.weather ? Math.round(w.weather.rhMean) : null,
    })),
  };
}

export function bestCrops(model, season) {
  return Object.keys(model?.crops ?? {})
    .map((id) => cropHarvest(model, id))
    .filter((c) => c && c.n >= 10 && (!season || c.season === season))
    .sort((a, b) => a.badShare - b.badShare);
}

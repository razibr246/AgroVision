// Who has reviewed the crop rules and soil assumptions, when, and what changed. Only real reviews, as the reviewer
// or the team reported them: nothing here may be filled in by guesswork. docs/REVIEW_LOG.md is the same record
// in prose; add a row there and here together.
//   { crop: 'lentil' | 'all', who: 'name, role, office', when: 'YYYY-MM-DD', what: 'rules or assumptions reviewed',
//     changed: 'what was changed, or "no change"' }
export const REVIEWS = [
  // As reported by the team (docs/REVIEW_LOG.md). The rules were not gone through one by one on record.
  // By phone, rule by rule, as the team reports it (docs/REVIEW_LOG.md).
  { crop: 'boro', who: 'Md. Omar Faruk, Upazila Agriculture Officer, Dhamrai', when: '2026-11-12', what: 'Flowering-heat limit', changed: '35 °C → 36 °C, 3 days' },
  { crop: 'wheat', who: 'Md. Omar Faruk, Upazila Agriculture Officer, Dhamrai', when: '2026-11-12', what: 'Grain-fill heat (32 °C, 5 days)', changed: 'No change: correct' },
  { crop: 'lentil', who: 'Md. Omar Faruk, Upazila Agriculture Officer, Dhamrai', when: '2026-11-12', what: 'Stemphylium blight (4 rainy days at flowering)', changed: 'No change: correct' },
  { crop: 'mustard', who: 'Md. Omar Faruk, Upazila Agriculture Officer, Dhamrai', when: '2026-11-12', what: 'Without a power tiller', changed: 'Flagged first: late mustard delays the Boro into the heat' },
  {
    crop: 'all',
    who: 'Omar Faruk, agriculture officer, Dhamrai Upazila Agriculture Office',
    when: '2026-11-04',
    what: 'The app as a whole (farmer and officer pages); individual rules not recorded',
    changed: 'No change: said everything is okay (100 out of 100)',
  },
];
export const reviewOf = (crop) => REVIEWS.filter((r) => r.crop === crop || r.crop === 'all');

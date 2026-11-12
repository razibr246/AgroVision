// Who has reviewed the crop rules and soil assumptions, when, and what changed. Only real reviews, as the reviewer
// or the team reported them: nothing here may be filled in by guesswork. docs/REVIEW_LOG.md is the same record
// in prose; add a row there and here together.
//   { crop: 'lentil' | 'all', who: 'name, role, office', when: 'YYYY-MM-DD', what: 'rules or assumptions reviewed',
//     changed: 'what was changed, or "no change"' }
export const REVIEWS = [
  // As reported by the team (docs/REVIEW_LOG.md). The rules were not gone through one by one on record.
  {
    crop: 'all',
    who: 'Omar Faruk, agriculture officer, Dhamrai Upazila Agriculture Office',
    when: '2026-11-04',
    what: 'The app as a whole (farmer and officer pages); individual rules not recorded',
    changed: 'No change: said everything is okay (100 out of 100)',
  },
];
export const reviewOf = (crop) => REVIEWS.filter((r) => r.crop === crop || r.crop === 'all');

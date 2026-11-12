// Writes every person of the farm game (the farmers in src/game/regions.js and their neighbours in
// src/game/places.js) as one JSON list for the Blender build (scripts/build/build_people.py): id, name, age, sex,
// build, skin and hair colours, beard, and what they wear (top, lower, head, with their colours and extras).
// usage: node scripts/build/people_specs.mjs [out.json]   (default: stdout)
import { writeFileSync } from 'node:fs';
import { REGIONS } from '../../src/game/regions.js';
import { PLACES } from '../../src/game/places.js';

const female = (l) => !!(l.female || l.sari || ['sari', 'ghagra', 'kira', 'blouse', 'choli'].includes(l.lower) || ['blouse', 'choli'].includes(l.top) || ['orhni', 'aanchal', 'hijab'].includes(l.head));
const ageOf = (l, fallback) => l.age ?? fallback ?? (l.beard && /^#[cdef]/i.test(l.beard) ? 64 : l.hair === '#efece6' ? 72 : 34);
const out = [];
for (const [id, r] of Object.entries(REGIONS)) {
  const f = r.farmer, l = f.look;
  out.push({ id, role: 'farmer', country: r.country, name: f.en, age: ageOf(l, f.age), female: female(l), look: l });
}
for (const [farm, p] of Object.entries(PLACES)) {
  for (const n of p.folk ?? []) out.push({ id: `${farm}_${n.id}`, role: 'villager', country: REGIONS[farm]?.country, name: n.name?.en, age: ageOf(n.look, n.age), female: female(n.look), look: n.look });
}
const json = JSON.stringify(out, null, 1);
if (process.argv[2]) { writeFileSync(process.argv[2], json); console.log(`${out.length} people → ${process.argv[2]}`); } else console.log(json);

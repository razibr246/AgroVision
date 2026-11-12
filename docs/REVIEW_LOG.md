# Review log: crop rules and soil assumptions

Who reviewed which rule or assumption, when, and what changed. Every crop rule in `src/engine/crops.js` starts from
published research (sources in `docs/THRESHOLDS.md`). A row below records who looked at them, when, what they looked
at and what changed; a single rule counts as checked one by one only when the row says so.

When a review happens, add a row here **and** the same entry to `src/data/reviews.js`, so the app shows it. Never fill this in on anyone's behalf.

## Reviews

| Date | Reviewer (role, office) | What was reviewed | What changed | Commit |
| --- | --- | --- | --- | --- |
| 2026-11-04 | Omar Faruk, agriculture officer, Dhamrai Upazila Agriculture Office | The app as a whole (farmer and officer pages), during the Dhamrai session with five farmers (`docs/USER_TESTING.md`) | No change. He said everything is okay and rated it 100 out of 100. Which crop rules he went through one by one was not recorded | — |
| 2026-11-12 | Md. Omar Faruk, Upazila Agriculture Officer, Dhamrai, Dhaka (by phone) | Boro flowering heat (35 °C, 3 days); wheat grain-fill heat (32 °C, 5 days); lentil Stemphylium (4 rainy days at flowering); the constraint rules for a power tiller and for labour | **Boro:** "36 °C is better to consider" → the limit is now 36 °C, 3 days. **Wheat, lentil:** correct, no change. **Power tiller:** not wheat, "mustard is the bigger issue here": a late mustard pushes the Boro after it into the April–May heat → no tiller now flags mustard first and wheat second, removing neither. **Labour:** correct ("that is common here"), no change. Agreed to be named | this commit |

The 12 November review went through the rules one by one, by phone, as the team reports it (answers in his words,
translated). Boro's flowering-heat limit moved from 35 °C to 36 °C on it; this still crosses in 11 of 13 recent
seasons at Godagari and 9 of 13 at Dacope (`node scripts/build/check_events.mjs` and `docs/EVIDENCE.md`), so the
question is not closed. The plan still shows the effect of 35 °C, 37 °C or 5 days (`BORO_HEAT_SENSITIVITIES`).

## What a reviewer should check

0. **First: Boro's flowering-heat limit.** It is crossed in 12–13 of 13 recent seasons at Godagari and Dacope and
   11 of 13 at Dhamrai and Gangachara, yet Boro is grown there every year (`docs/EVIDENCE.md`). Should the limit be
   higher, longer, or tied to a heat-tolerant variety (e.g. BRRI dhan 89)? This one rule moves many recommendations.

1. **Crop weather rules** (`docs/THRESHOLDS.md`): each heat, cold and rain limit and the growth-stage window it
   applies to, for local varieties (e.g. BARI Masur-8, BINA Sarisha-9, BRRI dhan 89).
2. **Sowing windows**: the usual date and the ±2-week alternatives per crop and upazila.
3. **Soil assumptions**: pH and texture preferences per crop; whether SoilGrids' values look right for the union
   (compare with SRDI's union guide and any recent soil tests).
4. **Rotation rules**: which crops can follow which, turnaround days before T. Aman, residue (straw) practice.
5. **Fertiliser**: that SRDI doses are read correctly for the union's land type.

A review that finds a rule right is worth recording too ("no change").

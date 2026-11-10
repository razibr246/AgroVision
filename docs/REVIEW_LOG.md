# Review log: crop rules and soil assumptions

Who reviewed which rule or assumption, when, and what changed. Every crop rule in `src/engine/crops.js` starts from
published research (sources in `docs/THRESHOLDS.md`). A rule counts as locally reviewed only when a row below names the
reviewer's role and office, the date, and the exact rules checked.

When a review happens, add a row here **and** the same entry to `src/data/reviews.js`, so the app shows it. Never fill this in on anyone's behalf.

## Reviews

| Date | Reviewer (role, office) | What was reviewed | What changed | Commit |
| --- | --- | --- | --- | --- |
| *To be filled in by the team* | *The team reports a real review; the reviewer's role and office, the date and the exact rules checked are still to be added* | | | |

Until that row is complete, the app shows the crop rules as not yet reviewed, and Boro's flowering-heat limit stays
listed below as an open problem. The farmer plan already shows how the advice changes if the limit is 36 °C or
37 °C for 3 days, or 35 °C for 5 days (`BORO_HEAT_SENSITIVITIES`, commit `69b0aad`); the default is unchanged.

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

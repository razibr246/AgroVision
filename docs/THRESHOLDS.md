# Thresholds and rules for agronomic review

Every threshold and rule the app uses to judge a crop, a date or a risk, with its basis. Most are **starting values**
from general agronomy, chosen to be reasonable and stated openly; none has yet been reviewed by an agriculture
officer. Please check each line, correct it where local experience or a BARI/BRRI/DAE guide says otherwise, and sign
the last column. The values live in `src/engine/crops.js` (crop rules), `src/engine/decision.js` (decision),
`src/engine/glut.js` (harvest glut), `scripts/build/build_aman_radar.mjs` (radar) and `scripts/onset/onset.mjs`
(rain onset).

"Consistent with" means the value agrees with the named source's general guidance; the exact number (a day count, a
window) is still our choice.

## Weather rules per crop (the 25-season backtest)

A season counts as unsafe for a crop and planting date if its rule is broken in that season's NASA POWER weather.
Days are counted from planting or transplanting.

| Crop | Rule | Window (days after planting) | Basis | Reviewed by |
| --- | --- | --- | --- | --- |
| Boro rice | 3 or more days with Tmax ≥ 36 °C during flowering cause empty grains (was 35 °C; set on the Dhamrai UAO's review, 12 Nov 2026) | 75–95 | Consistent with IRRI: spikelet sterility above 35 °C at anthesis (Yoshida 1981, *Fundamentals of Rice Crop Science*) | |
| Tomato | One day with ≥ 50 mm rain can rot the seedlings | 0–15 | Assumption | |
| Tomato | 5 or more days with Tmax ≥ 32 °C while fruit sets make flowers drop | 40–95 | Consistent with Sato, Peet & Thomas (2000), *Plant Cell Environ.* 23: fruit set fails under chronic mild heat (around 32 °C days) | |
| Wheat | 5 or more days with Tmax ≥ 32 °C while grain fills shrivel the grain | 85–115 | Consistent with Farooq et al. (2011), *Crit. Rev. Plant Sci.* 30, on terminal heat stress in wheat | |
| Lentil | One day with ≥ 40 mm rain at flowering knocks the flowers off | 55–85 | Assumption | |
| Lentil | 4 or more rainy days (≥ 5 mm) at flowering bring Stemphylium blight | 55–85 | Assumption; humid, wet weather at flowering favours Stemphylium blight (to confirm against BARI pulse guidance) | |
| Mustard | One day with ≥ 30 mm rain at flowering damages flowers and pods | 35–55 | Assumption | |
| Mung bean (rotation) | 3 or more days with Tmax ≥ 40 °C at flowering make flowers drop | 30–50 | Assumption | |
| Mung bean (rotation) | One day with ≥ 40 mm rain while pods ripen rots them | 50–65 | Assumption | |
| Sesame (rotation) | One day with ≥ 50 mm rain waterlogs the seedlings | 0–30 | Assumption | |
| Sesame (rotation) | One day with ≥ 60 mm rain while capsules ripen lodges the crop and shatters seed | 70–90 | Assumption | |
| Jute (rotation) | Less than 50 mm rain in total means it must be irrigated | 0–30 | Assumption | |
| Aus rice (rotation) | 3 or more days with Tmax ≥ 35 °C at flowering cause empty grains | 70–90 | As Boro (Yoshida 1981) | |

**Boro's flowering-heat limit (reviewed 12 November 2026).** At the old 35 °C the rule crossed in 13 of 13 seasons
2013–2025 at Godagari, 11 at Dacope and 10 at Dhamrai (station-corrected), yet Boro is the main crop there. The
Dhamrai Upazila Agriculture Officer advised 36 °C (`docs/REVIEW_LOG.md`); it now crosses in 11, 9 and 7. It still
warns more often than the crop fails, and the hindcast of real disasters (`docs/EVIDENCE.md`) shows a three-day
count does not single out the bad heat years well; this stays open. A season "counting as unsafe" here means a limit was crossed, not that the crop was lost.

The farmer plan also shows how the advice changes at 35 °C or 37 °C for 3 days, or 35 °C for 5 days
(`BORO_HEAT_SENSITIVITIES` in `src/engine/crops.js`). Questions for the reviewer are listed at the end of `docs/REVIEW_LOG.md`.

## Planting dates, duration and soil

The usual date is tested, and so are two weeks earlier and two weeks later (the planting band). A sowing day that
has already gone is not offered; when all three have gone for a crop, its latest stays in the list marked late and
ranks after every crop that can still be sown on time.

| Crop | Usual planting / transplanting | Days to harvest | Water need | Soil pH suited | Basis | Reviewed by |
| --- | --- | --- | --- | --- | --- | --- |
| Boro rice | 15 January (transplant) | 115 | High | 5.0–7.0 | Date consistent with BRRI's mid-January to early February transplanting; the rest assumption | |
| Tomato | 15 November (transplant) | 80 | Medium | 6.0–7.0 | Date consistent with BARI's October–November transplanting; the rest assumption | |
| Wheat | 20 November | 115 | Low–medium | 6.0–7.5 | Date consistent with the 15–30 November optimum sowing (BARI / Wheat Research Centre); the rest assumption | |
| Lentil | 5 November | 105 | Low | 6.0–8.0 | Date consistent with BARI's late October – mid November sowing; the rest assumption | |
| Mustard | 1 November | 85 | Low | 5.5–7.5 | Date consistent with BARI's late October – November sowing; the rest assumption | |
| Planting band | Usual date, −14 days, +14 days | — | — | — | Assumption (design choice) | |
| Well-drained crops (tomato, wheat, lentil, mustard) | Penalised on soil whose drainage is "poor" | — | — | — | Drainage class derived from the SoilGrids WRB soil group (`scripts/build/build_soil.py`); assumption | |

Yields are FAOSTAT 2024 national averages (real data), not thresholds.

## The keep / adjust / shift decision

| Rule | Value | Basis | Reviewed by |
| --- | --- | --- | --- |
| Score weights (climate, water, soil, profit, rotation, glut, earliness) | 0.30, 0.20, 0.15, 0.15, 0.10, 0.10, 0; the farmer's priorities multiply them, then they are rescaled to sum to 1 | Assumption (design choice) | |
| SHIFT | Another crop's best option scores at least 15 points above the usual crop's best | Assumption | |
| ADJUST | The usual crop at another date scores at least 10 points above its usual date | Assumption | |
| KEEP with caution | The usual crop at its usual date scores under 60 | Assumption | |

## Harvest glut (price-drop risk)

| Rule | Value | Basis | Reviewed by |
| --- | --- | --- | --- |
| Price-dip months | Months whose DAM farm-gate price is usually 10% or more below normal | Real data (DAM price history in `price_seasons.json`); the 10% cut-off is an assumption | |
| High-supply week | Planned harvest in a week above 1.3 × the normal weekly supply | Assumption | |
| Week risk | High: high supply in a dip month. Medium: high supply, or above-normal supply in a dip month | Assumption | |
| Plan risk | High if at least half the harvest falls in High weeks; Medium if at least 20% does, or half falls in High or Medium weeks | Assumption | |
| Normal crop shares (boro, tomato, wheat, lentil, mustard) | 0.35, 0.35, 0.10, 0.08, 0.12 | Assumption, to be replaced by DAE upazila crop statistics | |
| Tomato planting slots | 25 Oct – 7 Nov, 8–21 Nov, 22 Nov – 5 Dec, 6–19 Dec | Assumption | |

## Rain onset and Aman planting (radar)

| Rule | Value | Basis | Reviewed by |
| --- | --- | --- | --- |
| Rain onset | First day from 15 May starting a 5-day spell of at least the place's mean June–September 5-day rain (3+ rainy days), no 10-day window under 5 mm in the next 30 days, and at least half a monsoon month's rain in those 30 days | In the family of Stern et al. (1981) and Moron & Robertson (2014); start day from Han et al. (2024). Checked against BMD station-based onsets on 22 Oct 2026: within a week at Rajshahi, Barishal and Dinajpur (docs/RADAR.md) | |
| Transplanting detected | Sentinel-1 VH falls at least 3 dB, then rises at least 4 dB within 45 days | Assumption, in line with published Sentinel-1 rice-mapping methods | |
| Upazila date | Given only when at least 6 of 36 sample fields show transplanting | Assumption | |
| On time | Within ±7 days of the upazila's 2017–2025 median (about one radar revisit) | Assumption | |
| Drought: monsoon SPI | −1 or below = moderately to extremely dry | WMO SPI classes (McKee et al. 1993; WMO SPI User Guide 2012) | |
| Drought: rain before transplanting | Under half of normal in the 30 days before | Assumption | |
| Drought: dry spell while tillering | 15 or more consecutive days under 1 mm | Assumption | |
| Heat at flowering | Days at 35 °C or more | As Boro (Yoshida 1981) | |
| Heavy and very heavy rain | 44 mm or more, and 89 mm or more, in a day (June–September) | Bangladesh Meteorological Department rainfall classes | |
| Cold at flowering | Days with mean temperature below 20 °C | Consistent with BRRI's cold-injury guidance for rice at booting and flowering | |

## Infiltration (`ksatOf`, `infiltrationChange` in `src/engine/fieldwater.js`)

How fast rain soaks in is the saturated hydraulic conductivity of Saxton & Rawls (2006), eqs. 3–5 and 16, in mm/h,
from the field's SoilGrids sand, clay and organic matter (or the farmer's soil test). Field Future shows each
rotation's ten-year change, taking organic matter to move in proportion to its modelled soil carbon. Known limits: the
equations ignore structure and compaction, so the plough pan under puddled rice (which slows water far more below
15 cm) is not counted, and they hold only to 8% organic matter.

## Spraying weather (`src/engine/spray.js`)

Each daylight hour (6:00–18:00) of the next two days with daylight, from the live Open-Meteo forecast, is marked
"good", "take care" or "not now" before a pesticide, fungicide or foliar feed goes on (Today and the crop doctor).
The product label always decides; this only reads the weather.

| Rule | Good | Take care | Not now | Source |
| --- | --- | --- | --- | --- |
| Wind at 10 m | 3–15 km/h | under 3 km/h (still air, possible inversion) | over 15 km/h (drift) | GRDC "Managing spray drift"; Ontario OMAFA "Pesticide drift from ground applications" |
| Delta T (air minus wet-bulb, Stull 2011) | 2–8 °C | 8–10 °C (use coarse drops), under 2 °C (run-off) | over 10 °C (drops evaporate) | GRDC |
| Rain chance, this hour and the next 4 | under 30% | 30–49% | 50% or more (washed off) | Common label rain-fast advice; the label's own rain-fast time overrides |

A good window is two or more good hours in a row; the longest (then earliest) is named. Known limits: the forecast
wind is at 10 m over a 9–11 km grid cell, not at boom height in the field; the 4-hour rain window is a single rule
for products whose rain-fast times range from under an hour to a day.

## What a reviewer should send back

For each line: agree, or the corrected value with its source (a BARI/BRRI/DAE guide, a crop calendar, local
experience), and your name and post in "Reviewed by". Corrections go into the files named at the top; the tests
(`npm test`) show if a change breaks anything.

## Farmer constraints (assumptions for local review)

The farmer says what they have to work with (`/farmer/plan`, "What you have to work with"; `src/engine/constraints.js`).
A crop that cannot work without a missing resource leaves the plan and Field Future; one that only gets harder is
flagged. Water access is not here: it is the field's irrigation source, which the plan already reads. None of these
has been checked locally, except the power-tiller and labour rules, reviewed by the Dhamrai UAO on 12 November 2026.

| Constraint | Crop | Effect | Why (assumption) |
| --- | --- | --- | --- |
| No power tiller, none to hire | Mustard | Flagged first | Must go in by about 25 November; late mustard pushes the Boro after it into the April–May heat (Dhamrai UAO, 12 Nov 2026) |
| No power tiller, none to hire | Wheat | Flagged | Needs a ploughed seedbed soon after the Aman harvest, and threshing (was "left out"; changed on the same review) |
| No power tiller, none to hire | Boro | Flagged | Puddling by oxen or by hand is possible but heavy work |
| Labour short | Tomato | Left out | Staking, regular watering and many pickings |
| Labour short | Jute | Left out | Many hands to cut, ret and strip the fibre |
| Labour short | Boro | Flagged | Many hands at transplanting and harvest |
| Labour short | Mungbean | Flagged | Picked in several rounds |
| No vegetable market nearby | Tomato | Left out | Spoils fast; cannot be sold at a fair price far away |
| No water to ret jute | Jute | Left out | The stalks must soak for weeks to free the fibre |

## When the field lies bare

`src/engine/fieldcalendar.js` lays each rotation year's Rabi crop, Kharif-1 crop and T. Aman on the calendar, from
the same sowing and harvest dates Field Future uses (T. Aman on the upazila's radar-measured transplanting day where
it exists, 120 days to harvest). A day between a harvest and the next sowing counts as **bare**, or as **under straw**
when the rotation keeps its straw. The strip under each strategy shows the twelve months from November and the bare
days a year (averaged over a two-year cycle). It assumes the crops go in on those dates; seedbeds, weeds and
volunteer growth are not counted.

## Two-week field plan (Today page, `src/engine/irrigationPlan.js`, `src/engine/heatWatch.js`)

| Value | Setting | Source / status |
|---|---|---|
| Forecast length | 16 days from Open-Meteo (its maximum); the plan uses 14 | Open-Meteo API limit |
| Rain-outcome weights (as forecast / half / none) | days 1–3: 0.60 / 0.25 / 0.15; days 4–7: 0.40 / 0.30 / 0.30; days 8+: 0.25 / 0.35 / 0.40 | Assumption: forecast rain skill falls with lead time; to be fitted to Open-Meteo hindcasts at BMD stations |
| Cost of one irrigation (pump hire, labour) | 8 mm-equivalent | Assumption |
| Cost of 1 mm the crop goes short ((1 − Ks)·Kc·ET₀) | 15 × the cost of 1 mm pumped | Assumption from FAO-33 (Ky ≈ 1): wheat ≈ 3.5 t/ha over ≈ 300 mm seasonal ET ≈ 12 kg/ha per mm ≈ Tk 450/ha, against ≈ Tk 30/ha to pump 1 mm from a shallow tube well |
| Urea top-dress: heavy rain | 20 mm or more on the day and the next two, or 5 mm on the day itself | Assumption; urea on the surface before heavy rain washes off or leaches (to confirm against BARC Fertilizer Recommendation Guide 2018) |
| Heat watch | The crop heat rules above (Boro 36 °C × 3 days at days 75–95, wheat, tomato, mung, Aus) applied to the forecast; "near" = one hot day short, or a hot day within 3 days before the window | Same sources as the crop rules |
| Heat-watch advice | Water before the heat, irrigate late afternoon/evening, no midday spraying, tell the SAAO | General practice, not a crop-specific dose |

## One hazard list per field (`src/engine/hazards.js`)

The field's hazards in one list, built from the rules above and the live 16-day forecast. Most limits are borrowed,
not new: heat from the crop's own rules (`crops.js`, first table), rain, heat-wave and cold-wave classes from BMD
(`weatherRisk.js` `BMD`), water from the FAO-56 balance (`fieldwater.js`, readily available water `RAW`). The new
ones are listed here.

| Hazard | Rule | Basis | Reviewed by |
| --- | --- | --- | --- |
| Heat at flowering | The crop's own heat rule breached in the forecast → high; one day short, or hot days just before the window → medium | `crops.js` rules (first table) via `heatWatch.js` | |
| Cold | Forecast minimum ≤ 10 °C for Boro or tomato → medium; < 8 °C → high (moderate and severe cold wave) | BMD cold-wave classes (`weatherRisk.js`) | |
| Heavy rain / flood | A forecast day ≥ 44 mm → medium, ≥ 89 mm → high; one level higher on a haor field | BMD rainfall classes; the haor step-up is an assumption (early flash floods on haor Boro, e.g. Gowainghat, The Daily Star, 5 Apr 2017) | |
| Water shortage | The FAO-56 balance reaches the readily available water (RAW) on a forecast day → medium; already past it → high | FAO-56 (`fieldwater.js`) | |
| Salinity | Soil test EC 4–8 dS/m → medium (saline), ≥ 8 dS/m → high (strongly saline) | Saline soil above 4 dS/m: US Salinity Laboratory (1954), USDA Agriculture Handbook 60; 8 dS/m: "strongly saline" in the usual soil-salinity classes. Only a soil test sets it; no place default (Dacope's salinity could not be confirmed from a readable source, 27 Nov 2026) | |
| No drying (AWD off) | A Boro field that is saline (EC ≥ 4 dS/m) or marked as in a haor keeps 2–5 cm of water all season | Assumption, from the SMART-A blueprint (IRRI caution on AWD in saline soils and deep haor basins; not yet checked against IRRI/BRRI text) | |
| Late planting | Planted 21 days or more after the crop's usual date → medium (the hot or flood months move closer to flowering and harvest) | Assumption | |

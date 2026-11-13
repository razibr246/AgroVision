# FieldShift 360

[![NASA Space Apps 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-0B3D91?style=flat-square&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![Tests](https://img.shields.io/badge/npm%20test-1007%20passing-15803d?style=flat-square&logo=node.js&logoColor=white)](#verification)
[![Runs in the browser](https://img.shields.io/badge/compute-100%25%20in%20the%20browser-0284c7?style=flat-square)](#how-it-works)
[![বাংলা · English](https://img.shields.io/badge/language-বাংলা%20%C2%B7%20English-b45309?style=flat-square)](https://fieldshift360.vercel.app/#/)
[![License: MIT](https://img.shields.io/badge/license-MIT-6b7280?style=flat-square)](LICENSE)

**A crop-rotation decision tool for Bangladesh's smallholder farmers and upazila agriculture officers, built on 25 seasons of NASA Earth observations.** It answers one question for one field: *as the weather shifts, which rotation keeps the soil healthy, uses less water and still pays, and what is this season's first step?*

Challenge: **Field Shift: Adapting Farms with NASA Data** · Team: **BRM AstraX** (Barisal, Bangladesh)

| | |
| --- | --- |
| 🌐 **Live app** | [fieldshift360.vercel.app](https://fieldshift360.vercel.app/#/) |
| 🎬 **Judge's 5-minute tour** | [below](#a-five-minute-tour-for-judges) |
| 📊 **Evidence sheet** (every dataset, scale, limit, validation) | [docs/EVIDENCE.md](docs/EVIDENCE.md) |
| 📝 **Submission kit** (project description, challenge mapping) | [docs/SUBMISSION.md](docs/SUBMISSION.md) |
| 🔁 **Data register in the app** | [`/science#coverage`](https://fieldshift360.vercel.app/#/science#coverage) |

---

## Contents

1. [The problem](#the-problem)
2. [What FieldShift 360 does](#what-fieldshift-360-does)
3. [A five-minute tour for judges](#a-five-minute-tour-for-judges)
4. [NASA and partner data](#nasa-and-partner-data)
5. [Challenge statement, line by line](#challenge-statement-line-by-line)
6. [How it works](#how-it-works)
7. [Real, estimated or sample: the truthfulness rule](#real-estimated-or-sample-the-truthfulness-rule)
8. [Verification](#verification)
9. [What people said](#what-people-said)
10. [Run it yourself](#run-it-yourself)
11. [Repository map](#repository-map)
12. [Limits and what is still missing](#limits-and-what-is-still-missing)
13. [Licence and attribution](#licence-and-attribution)

---

## The problem

The crop calendar Bangladeshi farmers inherited no longer fits the weather. On the Barind tract around Godagari the risk is drought, spring heat at Boro flowering and a falling water table; on the low land of Dhamrai it is floods and waterlogging; on the coast at Dacope it is salt; in Sylhet, flash floods; in the north, cold waves. Most advice stops at one season, and when a whole union plants the same crop the price collapses at harvest.

A farmer needs to know what to plant *this* Rabi season **and** what sequence of crops will keep the field productive for the next ten years. An upazila officer needs to see the same thing for hundreds of farmers at once.

## What FieldShift 360 does

**For a farmer** (`/farmer/*`, Bangla first, voice and SMS mode included)

- **Field Future** (`/farmer/future`): every feasible one- and two-year rotation of a Rabi crop, a Kharif-1 crop and T. Aman (several hundred per field, with or without the straw kept) is run for ten years on the upazila's 25 seasons of NASA POWER weather. Each is scored on soil carbon (ICBM model, started from the field's SoilGrids carbon), the four NRCS soil-health principles, irrigation water (FAO-56), profit, weather risk and pest pressure. The farmer's priorities (more income, less water, less risk, better soil, early harvest) re-weight the ranking. Every strategy says **why**, with its evidence, benefits, gaps and risks.
- **Adapting to change**: the leading rotations are replayed in the 2040s with NASA NEX-GDDP-CMIP6 across eight climate models and five FAOSTAT yield years (a 40-run ensemble). These are scenario estimates, not probabilities.
- **This season's step** (`/farmer/plan`, `/farmer/today`): the rotation's first crop and date are tested against 25 seasons and answered as **KEEP, ADJUST or SHIFT**, with today's field tasks, a spray check against the live forecast, and watering advice.
- **My field** (`/farmer/farm`): the field drawn by its real boundary, Sentinel-2 green-cover history, SoilGrids soil, the farmer's own soil test laid over it, terrain and water-standing risk, and MODIS/Landsat greenness back to 1988.
- **Crop Doctor, government support, harvest and market**: a photo diagnosis with an offline fallback, the support programmes the farmer actually qualifies for (each with its source and check date), and price-drop risk when the neighbours plant the same crop.

**For an officer** (`/officer/*`)

- **Ropon Radar** (`/officer/radar`): when the rains set in each year (GPM IMERG) and when Aman was actually transplanted (Sentinel-1 radar) for every upazila of seven districts; the onset rule agrees with BMD station onsets within a week at three stations.
- Upazila dashboard, farmer register, pest-report hotspots, planting progress, supply planning, modelled scenarios for a share of Boro farmers switching crops (water, greenhouse gas and soil-carbon change), and **consent-first call notes** sealed with SHA-256.
- **চক্র এজেন্ট (Chakra Agent)**: an AI assistant whose every answer is checked against the app's own numbers before it is shown; anything sent in the office's name needs an officer's approval.

**For everyone** (`/`, `/science`, `/stories`, `/games`)

- `/science`: the data register with every dataset's scale and limit, a 3D satellite constellation, the spectral and multi-scale labs, trend maps (GRACE, SMAP, MODIS) and the crop-stress ML benchmark.
- `/stories`: five real past years in five districts replayed as decisions.
- `/farm` **Harvest Horizon**: a 3D farm game with 15 farmers in nine countries (VR-capable); `/kids` **Tara and the Dream Fields**: a children's game with a NASA satellite as the guide.
- `/abroad/:cc`: the same farmer and officer pages for sample farms in India, Pakistan, Nepal, Bhutan, Myanmar, the USA, Brazil and Spain, on their own soil, weather, crops and support programmes.

Seven upazilas, one in each division of Bangladesh, are covered by the full engine: Godagari, Dhamrai, Sitakunda, Dacope, Bakerganj, Gangachara and Gowainghat.

## A five-minute tour for judges

Everything runs in the browser from committed data: no sign-in, no key, nothing to install. The farmers are sample people; the weather, satellite, soil, price and yield data are real.

| Min | Open | What to look for |
| --- | --- | --- |
| 0–1 | [`/`](https://fieldshift360.vercel.app/#/) | The landing page: the live weather for Godagari, 25 seasons of change, and the decision sandbox. Switch **বাংলা / English** in the header. |
| 1–2 | [`/farmer/future`](https://fieldshift360.vercel.app/#/farmer/future) | Ten years for one field. Change a priority (less water, better soil) and watch the ranking move. Open a strategy's **why** card: evidence, benefit, gap, risk. Scroll to the eight-model 2040s test. |
| 2–3 | [`/farmer/plan`](https://fieldshift360.vercel.app/#/farmer/plan) | This season's step: KEEP / ADJUST / SHIFT, tested against 25 seasons, with the crop rule that decided it. |
| 3–4 | [`/officer/radar`](https://fieldshift360.vercel.app/#/officer/radar) | Rain onset (GPM IMERG) versus transplanting (Sentinel-1) by upazila, year by year. |
| 4–5 | [`/science#coverage`](https://fieldshift360.vercel.app/#/science#coverage) | Every dataset, what kind of evidence it is, its scale and its limit. Then `/kids` or `/farm` if there is a minute left. |

Hover any number's label (`SAT`, `STATION`, `MODEL`, `RECORD`, `RULE`, `AI`, `DEMO`) to see what produced it.

## NASA and partner data

From [docs/EVIDENCE.md](docs/EVIDENCE.md), which also lists the model assumptions and validation results. *Kind*: **SAT** observed by satellite · **STATION** weather station · **MODEL** model estimate · **RECORD** published record.

| Dataset | Kind | Used for | Years | Scale | Limit |
| --- | --- | --- | --- | --- | --- |
| NASA POWER daily (Tmax, Tmin, rain, humidity) | MODEL (MERRA-2 + satellites) | all season and rotation calculations | 2001–2026 | ~50 × 60 km | the upazila's weather, not the field's; corrected to BMD normals |
| GPM IMERG daily rain | SAT | monsoon onset; check on POWER rain | 2001–2026 | ~11 km | small storms missed or overstated |
| NASA NEX-GDDP-CMIP6 (8 models, SSP2-4.5 / SSP5-8.5) | MODEL | Field Future in the 2040s | 2041–2050 | ~25 km | models disagree; each is run separately |
| MODIS MOD13Q1 NDVI per field | SAT | stressed and bare seasons | 2001–2026 | 250 m | the field and its neighbours |
| Landsat WELD NDVI | SAT | Rabi greenness a generation ago | 1988–2001 | 30 m | a different sensor; only clear changes are read |
| MODIS monthly NDVI and LST, MERRA-2 evaporation | SAT / MODEL | regional trends | 2001–2026 | ~5–50 km | area averages |
| GRACE / GRACE-FO mascons | SAT | water stored under the region | 2002–2022 | hundreds of km | **a regional average, not a well or a field** |
| SMAP L4 root-zone soil moisture | MODEL (satellite assimilated) | this month's soil water | 2015–2026 | 9 km | cell average |
| SRTM + ASTER GDEM terrain | SAT | water standing, erosion | 2000–2013 | 30 m | sees crop and tree tops |
| NASA SEDAC population and elevation | RECORD | upazila context | 2020 | ~1 km | summary |
| Copernicus Sentinel-2 L2A | SAT | the field's green curve and starting rotation | 2025–2026 | 10 m | cloud gaps; crop name inferred |
| Copernicus Sentinel-1 RTC radar | SAT | Aman transplanting date | 2017–2026 | ~40 m | upazila median |
| ISRIC SoilGrids 2.0 (0–30 cm) | MODEL | soil carbon, pH, texture | 2020 map | 250 m | **a model estimate, not a soil test** |
| BMD station normals, SRDI fertiliser guides, FAOSTAT yields, DAM prices, BBS census | STATION / RECORD | correction, doses, yields, prices | varies | station / union / national | the nearest station, the union's typical soil, national averages |

Every number in the app carries one of these kinds as a label, and the register behind `/science#coverage` is [src/engine/provenance.js](src/engine/provenance.js). The full source list, with fetch dates, is [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Challenge statement, line by line

| The challenge asks for | Where FieldShift 360 answers it |
| --- | --- |
| A decision tool for crop rotation | `/farmer/future` ranks every feasible rotation for the field; `/farmer/plan` turns it into this season's step |
| NASA Earth observations | the 14 datasets above; audit at `/science#coverage` |
| Local soil information | SoilGrids per union and per field, SRDI doses, the farmer's own soil test (`/farmer/farm`) |
| Crop characteristics | the regional crops' duration, sowing windows, FAO-56 Kc, heat / cold / rain thresholds and residue in [src/engine/crops.js](src/engine/crops.js); the rules are in [docs/THRESHOLDS.md](docs/THRESHOLDS.md) |
| Farmer priorities and constraints | priority re-weighting; crops that need a power tiller, labour, a vegetable market or retting water leave the plan with the reason |
| Why, evidence, benefits, gaps and risks | the **why** card of every strategy ([src/engine/briefs.js](src/engine/briefs.js)) |
| Soil health over time | ICBM soil carbon and the NRCS principles for ten years; the months the field is under crop, straw or bare |
| Shifting temperatures and rainfall | 25 seasons of change on `/`, `/farmer/plan` and `/science#trends`; rain onset on `/officer/radar` |
| Water | FAO-56 irrigation per rotation, AWD for Boro, POWER root-zone wetness since 2002, GRACE and SMAP |
| Explaining the science and combining scales | `/science#multiscale`, `#spectral`, `#disagree`, `#methods` and the glossary |
| Long-term resilience | the 40-run NEX-GDDP-CMIP6 × FAOSTAT ensemble |
| Reaching farmers | Bangla first, voice ([docs/VOICE.md](docs/VOICE.md)), 70-character SMS mode, works offline after the first visit |
| Beyond one place | eight other countries under `/abroad/:cc`, built one at a time with the same engine |

## How it works

```
                 committed data (src/data/)                       the browser
  NASA POWER · IMERG · CMIP6 · MODIS · GRACE · SMAP · Sentinel     ┌─────────────────────────┐
  SoilGrids · SRDI · BMD normals · FAOSTAT · DAM prices   ──────►  │  src/engine/  (pure JS)  │
                                                                   │  climate → decision      │
  scripts/fetch/*  (re-run to refresh; never hand-edited)          │  rotation → soilfuture   │
                                                                   │  water · support · radar │
                                                                   └───────────┬─────────────┘
                                                                               ▼
                                              React pages: farmer · officer · public · abroad · games
```

- **Everything is computed in the browser** from committed data, so the demo works with no server and no key. Pages load on first visit only; after that a service worker serves the app offline.
- **The engine is pure** (`src/engine/`, `src/game/sim.js`, `src/game/saga.js`): no React, so every rule has a Node test.
- **Optional server parts** (`api/`, Vercel functions): the AI endpoints (Crop Doctor, Chakra Agent, voice, call transcription) run only with a key in `.env.local`; the shared boards return 503 in production until real authentication exists ([docs/SECURITY.md](docs/SECURITY.md)).
- **AI is checked, never trusted**: every answer from the model is verified against the app data it was given by [src/engine/replyCheck.js](src/engine/replyCheck.js) (rules such as `R1_RAIN_OFFSET`, `R3_OWN_DOSE`), asked for once more if it fails, then repaired. Actions are proposals; the office approves.

Stack: Vite 6, React 19, Tailwind 4, recharts, Leaflet / MapLibre, three.js (games and the science labs), WebXR.

## Real, estimated or sample: the truthfulness rule

This is a product rule, not a footnote.

| | Real | Sample |
| --- | --- | --- |
| Weather, rain, climate projections | NASA POWER, IMERG, BMD normals, CMIP6 | — |
| Satellite views | Sentinel-1/2, MODIS, Landsat, GRACE, SMAP | — |
| Soil | SoilGrids (a model estimate, labelled so), SRDI guides | the farmer's soil-test entries in the demo |
| Prices, yields, census | DAM, FAOSTAT, BBS | — |
| Places and boundaries | real upazilas, unions and field coordinates | the demo's field outlines (labelled "sample boundary") |
| People | the named officer in `docs/REVIEW_LOG.md`, who agreed to be named | every farmer, request, plan and message |

Nothing is invented to look better: [docs/USER_TESTING.md](docs/USER_TESTING.md) and [docs/REVIEW_LOG.md](docs/REVIEW_LOG.md) record only real sessions, and every claim in [docs/SUBMISSION.md](docs/SUBMISSION.md) and [docs/EVIDENCE.md](docs/EVIDENCE.md) points to a file or a script.

## Verification

```bash
npm test          # 1007 tests, 0 failures (Node's test runner; the suites are listed in package.json)
npm run build     # production build, chunk sizes reported
```

What the tests cover: the climate and decision engine, rotation ranking, ICBM carbon and FAO-56 water, the rain-onset rule, field geometry (geodesic area on WGS84), the support matcher (its question score is a floor), the AI reply checker, the call-note seal, the game simulations and story campaigns, and the API handlers' guards and rate limits.

Validation that exists today (details and numbers in [docs/EVIDENCE.md](docs/EVIDENCE.md)):

- the rain-onset rule against BMD station onsets at three stations (within a week);
- POWER rain against IMERG, and the soil-water balance against SMAP;
- the crop-stress model's skill reported per place, as measured, on `/science#ml`;
- the crop rules for Boro, wheat and lentil reviewed one by one by the Dhamrai Upazila Agriculture Officer (Boro's heat limit moved to 36 °C on his advice; [docs/REVIEW_LOG.md](docs/REVIEW_LOG.md)).

## What people said

Team-reported sessions, written up in [docs/USER_TESTING.md](docs/USER_TESTING.md):

- **4 November 2026, Dhamrai**: five farmers used the app; the Upazila Agriculture Officer went through it and rated it 100 out of 100; three people played the farm game and two children the kids' game. Tasks and timings were not recorded, so that session is reported as what it is.
- **12 November 2026, Dhamrai**: three farmers and a Sub-Assistant Agriculture Officer used the app; their answers are recorded in their own words. The same day the Upazila Agriculture Officer reviewed the crop rules by phone.

The in-app test kit (`/testkit`) records the next sessions with consent first, timings and an export, so later claims can be traced.

## Run it yourself

Needs Node 18 or newer.

```bash
git clone https://github.com/razibr246/fieldshift360.git
cd fieldshift360
npm install
npm run dev            # http://localhost:5173  (in-memory stand-ins for the shared boards)
npm test               # all Node suites
npm run build          # dist/: hash routing, works on any static host
npm run preview
npm run build:single   # dist-single/index.html with the app JS/CSS inlined
```

Optional features (AI doctor and agent, voice, call transcription, Auth0 sign-in, map keys) read `.env.local`; see [.env.example](.env.example). Nothing in the core app needs a key, and secrets are never committed.

Refreshing data: `npm run` lists the `fetch:*`, `data:*`, `photos:*` and `train:*` scripts ([scripts/README.md](scripts/README.md)). Generated data is never hand-edited; change the script and re-run it.

## Repository map

| Path | What is there |
| --- | --- |
| [src/engine/](src/engine/) | the pure engine: climate, decision, rotation, `soilfuture.js` (Field Future), water, support, provenance, AI reply checks, call notes, field geometry |
| [src/pages/](src/pages/) | farmer, officer, public and abroad pages; routes in [src/App.jsx](src/App.jsx) |
| [src/components/](src/components/) | shared UI, charts, maps, the Chakra Agent, the guided tours, the science labs |
| [src/data/](src/data/) | committed datasets by kind (`climate/`, `water/`, `soil/`, `radar/`, `fields/`, `market/`, `support/`, `abroad/`, `models/`); [src/data/README.md](src/data/README.md) |
| [src/game/](src/game/) | Harvest Horizon and Tara and the Dream Fields (pure simulations plus three.js scenes) |
| [src/voice/](src/voice/) | the voice and SMS brain, answering from the same engine numbers |
| [scripts/](scripts/) | fetch, build, onset, photo and training scripts; [scripts/README.md](scripts/README.md) |
| [api/](api/) | Vercel functions (AI endpoints with key pool and rate limits; demo boards guarded in production) |
| [docs/](docs/) | [EVIDENCE](docs/EVIDENCE.md) · [DATA_SOURCES](docs/DATA_SOURCES.md) · [THRESHOLDS](docs/THRESHOLDS.md) · [RADAR](docs/RADAR.md) · [VOICE](docs/VOICE.md) · [SECURITY](docs/SECURITY.md) · [REVIEW_LOG](docs/REVIEW_LOG.md) · [USER_TESTING](docs/USER_TESTING.md) · [SUBMISSION](docs/SUBMISSION.md) · [DEMO_SCRIPT](docs/DEMO_SCRIPT.md) · [CHANGELOG](docs/CHANGELOG.md) |
| [public/radar/](public/radar/) | the original Ropon Radar prototype (Apache-2.0) |

## Limits and what is still missing

Said plainly, because the app says it too:

- NASA POWER weather is a ~50 km model estimate and SoilGrids a 250 m model estimate: neither is a measurement of the farmer's field. GRACE is a regional average, not a well.
- The crop thresholds are published starting values; three crops' rules have been reviewed by an officer, the rest have not ([docs/REVIEW_LOG.md](docs/REVIEW_LOG.md)).
- The farmers, requests and plans are samples. The shared boards and sign-in are not authorised server-side yet, so they are off in production.
- No field trial has been run; the two Dhamrai sessions are team-reported, and the first was not recorded task by task.
- The crop-stress model's skill is modest and is shown per place as measured; the 2040s ensemble gives scenarios, not probabilities.

## Licence and attribution

- Application code: [MIT](LICENSE). Ropon Radar prototype in `public/radar/`: [Apache-2.0](public/radar/LICENSE). Rigged people in `public/models/people/`: CC0 ([LICENSE.md](public/models/people/LICENSE.md)); the MakeHuman-built farmers in `public/models/folk/` carry their own [LICENSE.md](public/models/folk/LICENSE.md).
- NASA data courtesy of NASA Earth Science, NASA POWER, NASA GIBS and Earthdata; contains modified Copernicus Sentinel data (2017–2026); soil from ISRIC – World Soil Information (SoilGrids 2.0); yields from FAOSTAT; Bangladesh records from BMD, SRDI, DAM and BBS. Each dataset keeps its own terms; see [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

<div align="center"><sub>Built for the NASA International Space Apps Challenge 2026 by BRM AstraX, for the farmers who feed Bangladesh.</sub></div>

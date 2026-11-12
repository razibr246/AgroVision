# FieldShift 360: guide for mentors and judges

A short, checked guide to what the project is, what it uses, and what is and is not proven. Every claim below
points to a file or a script in this repository; if a claim and the code disagree, the code is right and this guide
is wrong. The fuller record is [`EVIDENCE.md`](EVIDENCE.md); the submission text is [`SUBMISSION.md`](SUBMISSION.md).

- Challenge: **Field Shift: Adapting Farms with NASA Data** (NASA Space Apps 2026)
- Team: **BRM AstraX**, Barishal, Bangladesh (members and roles: [`SUBMISSION.md`](SUBMISSION.md#team-and-roles))
- Live site: https://fieldshift360.vercel.app · Code: https://github.com/razibr246/fieldshift360

## 1. In one paragraph

Bangladesh's farmers choose the Rabi crop and its sowing day by habit, but in 25 years of NASA POWER data the cold
nights, the hot days and the Rabi rain have all moved. For one field, FieldShift 360 replays five Rabi crops at three
sowing dates through those 25 seasons, adds a model estimate of the soil (ISRIC SoilGrids, not a soil test), water,
prices and the farmer's priorities, and answers **keep, change the date, or shift**, with the reason. It then runs
every feasible rotation on that field for ten years (soil carbon, water, profit, risk) and re-tests the best ones in
the 2040s across 8 climate models and 5 yield years. Farmers use it in Bangla, by voice or in SMS-length text; the
upazila agriculture officer sees the same numbers and answers their requests.

## 2. NASA data, and how each is read

| Dataset | How it reaches the app | Used for | Kind |
| --- | --- | --- | --- |
| NASA POWER daily (T2M_MAX/MIN, PRECTOTCORR, RH2M) | POWER API, `scripts/fetch/power.mjs` → `src/data/climate/climate_*.json` | The 25-season backtest, every score | MODEL |
| NASA POWER GWETROOT (MERRA-2) | POWER monthly API → `src/data/water/soil_wetness.json` | Rabi root-zone soil wetness 2001–2025 | MODEL |
| GPM IMERG rain | IMERG through POWER (not the 0.1° files) → `src/data/radar/onset_*.json` | Monsoon onset for Ropon Radar | SAT |
| NEX-GDDP-CMIP6, 8 models | NCCS THREDDS → `src/data/climate/cmip6_deltas.json` | The 2040s, the 40-future test | MODEL |
| MODIS MOD13Q1 NDVI, 250 m | ORNL DAAC → `src/data/land/field_ndvi.json` | Each field's stressed Rabi seasons | SAT |
| SRTM and ASTER GDEM | Terrain per field | Standing water, erosion, their disagreement | SAT |
| SEDAC (GPW, LECZ, croplands) | GIBS → `src/data/region/sedac.json` | Each upazila's density, low land, cropland | RECORD |
| GRACE/GRACE-FO, SMAP L4, monthly MODIS NDVI/LST, Landsat WELD | **Decoded from colour-mapped GIBS image tiles** (`scripts/fetch/gibs-water.mjs`, `gibs-land.mjs`) → `src/data/water/water_sat.json`, `src/data/land/land_sat.json` | Context beside the numbers | SAT, approximate |
| FIRMS | Only on the neighbouring-country pages | Straw burning and fires | SAT |

The GIBS-decoded values are approximate: GRACE's colour scale saturates in most years, so its trend direction is
more reliable than its size. Reading the gridded products from Earthdata instead is on the plan.

## 3. The methods, as the code has them

- **Season decision** (`src/engine/decision.js`): each crop at three sowing dates over 25 seasons against its rules
  (`docs/THRESHOLDS.md`); a weighted score that the farmer's priorities re-weight.
- **Field Future** (`src/engine/soilfuture.js`): every feasible one- and two-year rotation for ten years; soil carbon
  by **ICBM** (Andrén & Kätterer 1997) started from SoilGrids; irrigation by **FAO-56**; profit at FAOSTAT yields
  and published prices; the four NRCS soil-health principles.
- **Paddy methane**: **IPCC 2019 Refinement, Tier 1** (`src/engine/soilfuture.js`, line 484): AWD scaling factor
  0.55, GWP 27 (AR6). Set against the carbon the soil keeps.
- **Robustness** (`src/engine/explain.js`, line 112): the best rotations re-run in 8 CMIP6 models × 5 FAOSTAT yield
  years = 40 futures; **robust** when they beat the current practice in **≥ 80 %** of them, "mostly" 50–80 %,
  "sensitive" below 50 %.
- **Close calls**: a lead under 5 points of 100 is reported as a tie.

## 4. The AI, and what checks it

Full list in the README's [Use of AI](../README.md#use-of-ai). In short: the Chakra Agent talks through Gemini 3.8
Flash (fallbacks 3.5 and 3.1 Flash-Lite, Gemini 4 Argon for deep questions) or Claude Opus 5.5 / Fable 5.1
(`api/agent.js`); the crop doctor uses Claude Opus 5.5 or Gemini 3.8 Flash (`api/doctor.js`); call notes use Groq
Whisper large-v3-turbo and Gemini (`api/transcribe.js`); the natural voice is Gemini TTS (`api/tts.js`).

Every AI answer is checked against the app's own data before it is spoken (`src/engine/replyCheck.js`), with these
rules: `R1_RAIN_OFFSET`, `R1_WATER_ENOUGH`, `R2_STRESS_NOACTION`, `R3_OWN_DOSE`, `R4_CONFIDENCE_CEILING`, and
`P1_BAD_TARGET` for an action pointing nowhere. The model can only propose actions; anything sent in the office's
name needs an officer's approval in every mode (`src/engine/chakra.js`).

## 5. What has been checked, and what has not

| Check | Status |
| --- | --- |
| Automated tests | See the count, date and commit in [`SUBMISSION.md`](SUBMISSION.md#how-we-know-it-works-validity); quote only that one number |
| POWER rain against IMERG, 25 seasons | Rabi r = 0.67–0.82; monsoon r = 0.10–0.76, weak in the wet south (live at `/science#disagree`) |
| Rain-onset rule against BMD station onsets | Within a week at Rajshahi (−4 d), Barishal (+2 d), Dinajpur (−5 d) (`scripts/onset/compare_bmd.mjs`) |
| SMAP L4 against POWER root-zone wetness | r = 0.89–0.97 over 113 months (`npm run data:smap-check`). A **consistency check**, not independent validation: both come from NASA's GEOS land modelling |
| Machine learning on NASA data, seasons held out | AUC about 0.5: the weather record alone does not forecast a crop's year, except a little where Rabi crops follow the rain (`/science#ml`). Reported as a negative result |
| Usability with farmers and officers | **Team-reported**: Dhamrai, 4 November 2026. Five farmers used the website and app (highly positive), the agriculture officer rated it 100/100, three game players and two children gave the games 5 stars. Tasks and answers were not written down; the next session will be recorded with `/testkit` (consent script included) |
| Crop thresholds by a local officer or agronomist | **Team-reported**: Omar Faruk, Dhamrai agriculture officer, 4 November 2026, said everything is okay. Which rules he checked one by one was not recorded (`docs/REVIEW_LOG.md`) |
| Boro flowering-heat limit | **Open problem.** 3+ days ≥ 35 °C is crossed in 12–13 of 13 recent seasons at Godagari and Dacope, so it almost certainly over-warns. The plan shows the effect of 36 °C, 37 °C or 5 days; the default is unchanged |

## 6. What needs the network

The core engines run in the browser and keep working offline once the app has loaded. Map tiles, the live weather
(Open-Meteo), the satellite photos (HLS), ONNX Runtime for the photo clear-up (jsDelivr) and every AI feature need
the network. The crop-doctor photo and the agent's context are sent to Gemini or Claude only after the user agrees.
On the hosted site, shared plans and messages are switched off until real logins exist (`/api/plans` answers 503),
so requests and replies stay in the visitor's own browser.

## 7. Where things are

- Farmer pages `/farmer/*`, officer pages `/officer/*`, neighbouring and other countries `/abroad/:cc/*`
  (India, Pakistan, Nepal, Bhutan, Myanmar; the USA, Brazil and Spain), science `/science`, games `/games`.
- Engines `src/engine/`, data `src/data/` (see `src/data/README.md`), data scripts `scripts/` (see
  `scripts/README.md`), serverless functions `api/`.
- The dataset register behind every provenance label: `src/engine/provenance.js`.

## 8. Before and during the event

The repository existed before the event: the first commit (21 October 2026) already holds most of the app, and the
README's [What was built before and during the event](../README.md#what-was-built-before-and-during-the-event)
lists what came after the challenge statement. This is a disclosure, not a claim of eligibility; the team is putting
the timeline to the Barishal Local Lead in writing and will follow their ruling.

## 9. Questions worth asking the team

1. Which single decision would you show a farmer first, and what number would change their mind?
2. Boro's heat limit over-warns: who will set it, and how will you record that they did?
3. What would a second, recorded test session look like, and what would count as success?
4. Which of the GIBS-decoded layers would you replace with Earthdata first, and why?

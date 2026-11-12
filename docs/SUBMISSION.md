# NASA Space Apps 2026 submission kit

Challenge: **Field Shift: Adapting Farms with NASA Data**. Project: **FieldShift 360**.
Team: **BRM AstraX** (Barisal, Bangladesh).
Live site: https://fieldshift360.vercel.app · Code: https://github.com/razibr246/fieldshift360

Checked against the official challenge statement (rotation strategies for soil health and changing conditions) on 22 October 2026; the line-by-line table is in the README.

## Project description (for the Space Apps project page)

**FieldShift 360 helps Bangladesh's smallholder farmers explore crop rotations that may improve soil health and
resilience, using NASA Earth observations, crop characteristics, a model estimate of soil (ISRIC SoilGrids,
250 m; not a soil test), and farmer priorities.** This prototype uses sample farmer accounts and demo fields.
NASA POWER weather is upazila-scale, and Sentinel-2 crop sequences are inferred from green-cover observations;
neither is a field-level ground measurement.

The crop calendar farmers inherited no longer fits the weather. On the Barind around Godagari the risk is drought,
spring heat and a falling water table; on the low land of Dhamrai it is floods and waterlogging; elsewhere salt,
flash floods and cold waves. Most advice stops at one season. FieldShift 360 lets users explore ten-year
scenarios for a selected demo field:

- **Starting from satellite observations.** Sentinel-2 green-cover observations are used to infer a likely crop
  sequence for the selected demo field. Cloud gaps and classification uncertainty mean this is an estimate, not
  verified crop history; users can choose the registry value instead.
- **Every feasible rotation, ten years each.** All one- and two-year cycles of a Rabi crop, a Kharif-1 crop and
  T. Aman, with or without the straw kept (several hundred per field), run on the upazila's 25 seasons of NASA POWER
  weather. Each is scored on soil carbon (the ICBM model, started from the field's ISRIC SoilGrids carbon) and the
  four NRCS soil-health principles, irrigation water (FAO-56), profit, weather risk and pest pressure.
- **The farmer's priorities decide.** More income, less water, less risk, better soil or an early harvest
  re-weight the ranking. The best rotation is the top scorer among those that do not run the soil down.
- **Adapting to change.** Rotations are replayed in the 2040s with NASA NEX-GDDP-CMIP6. The leading alternatives
  are re-run across eight climate models and five FAOSTAT yield years (40 model/yield combinations). These are
  scenario estimates, not probabilities or field-validated outcomes.
- **Water and climate.** Irrigation per bigha for each rotation, AWD for Boro, the Rabi-season root-zone soil
  wetness from NASA POWER since 2002, the water stored under the region from GRACE (falling under the Barind),
  this month's root-zone soil moisture from SMAP, and a climate account that sets paddy methane (IPCC 2019) against the carbon
  stored in the soil.
- **This season's step.** The rotation's first step (which crop, which date) is tested against 25 seasons of NASA
  weather and answered as KEEP, ADJUST or SHIFT, with today's field tasks, in Bangla, by voice or typing, on a
  phone.

Farmers can watch a one-minute narrated story of a selected demo field's ten years and save it as a video, print the
rotation as a picture poster, or use SMS mode to compose messages. Upazila officers can explore modelled scenarios
for a share of Boro farmers switching crops, including estimated water, greenhouse gas and soil-carbon changes.
Farmer requests, officer replies and alerts are currently local demo records; the hosted messaging and shared-plan
endpoints return 503 until authenticated access and persistent storage are configured. Upazila officers see Ropon Radar,
when the rains set in each year (GPM IMERG) and when Aman was actually transplanted (Sentinel-1 radar), for every
upazila of seven districts; the rain-onset rule agrees with BMD station-based onsets within a week at three stations. The full engine
covers seven upazilas, one in each division of Bangladesh. Sample farms in India, Pakistan, Nepal, Bhutan and Myanmar
get ten-year rotation options on their SoilGrids soil estimate and their country's yields, with GRACE and SMAP water;
sample farms in the USA, Brazil and Spain show the same farmer and officer pages with their own crops and weather.

Every number says what produced it: observed by a satellite, reported by a station, estimated by a model, a
published record, a rule, AI, or sample. The weather (NASA POWER) and the soil (SoilGrids) are real data but model
estimates at upazila and 250 m scale, not field measurements; satellite, price and yield records are real; the farmers
and their plans are sample people. The crop thresholds are published starting values. On 4 November 2026 the
Dhamrai agriculture officer went through the app and said everything is okay; which rules he checked one by one was
not recorded (`docs/REVIEW_LOG.md`). Each rotation strategy is shown with
why it came up, its evidence, what it may offer, what is not known, its
risks and what needs local review, and the app says plainly that the farmer and the agriculture officer decide.

## Who it is for, and how many (impact)

- **16.88 million farm households** in Bangladesh (BBS Agriculture Census 2019) choose what to plant every season;
  FieldShift 360 is built for them, their union officers (SAAO) and upazila officers (UAO).
- **4.85 million ha of Boro rice** (BBS 2022-23), the country's thirstiest crop and the biggest chance to save
  groundwater; GRACE shows the water stored in the region round Godagari falling about 8.9 cm a decade (2003–2021,
  a regional figure read from saturating colour tiles, so its size is approximate).
- **2.51 million people** live in the seven upazilas, one per division, where the full engine runs today (BBS
  Census 2022): Dhamrai 517,135, Godagari 376,386, Bakerganj 356,022, Sitakunda 457,396, Dacope 159,369,
  Gangachara 286,730, Gowainghat 355,979.
- **The land itself, from NASA SEDAC:** more than half of Dhamrai, Bakerganj, Sitakunda and Dacope lies below 10 m
  in the low zone joined to the sea (LECZ v3), where floods drain slowly and, near the coast, salt comes in; cropland
  covers 31% (Sitakunda's hills) to 86% (Gangachara) of each upazila.
- **It scales by re-running scripts, not rewriting code:** NASA POWER, IMERG, NEX-GDDP-CMIP6, SMAP, GRACE, SEDAC and
  SoilGrids are global, so a new upazila or country is a data run. Five neighbouring countries already run on them.

## How we know it works (validity)

- **Automated checks:** on 11 November 2026, on a clean checkout of commit `710979d`, `npm test` passed
  368 tests with 0 failures and `npm run build` completed. These checks cover the calculation engines, GIS,
  rotations, voice, radar and game logic; they do not establish agronomic validity or user acceptance.
- **User validation status:** the team reports a Dhamrai session on 4 November 2026 with five farmers and one
  agriculture officer; participants reportedly tried all project features. Feedback themes included Ropon Radar,
  more NASA-data visualization, and access for farmers with limited internet/smartphone access. Exact tasks,
  structured outcomes, and resulting fixes were not recorded. Treat this as team-reported experience, not
  independently verifiable user validation; details are in `docs/USER_TESTING.md`.
- **Sources checked against each other:** NASA POWER rain against GPM IMERG over 25 seasons, r = 0.67–0.82 in the
  Rabi across the seven upazilas but only 0.10–0.76 in the monsoon (weak in the wet south, so monsoon-rain rules
  there are less certain); SMAP L4 against POWER root-zone wetness, r = 0.89–0.97 over 113 months (`scripts/build/check_smap_power.mjs`), a consistency
  check rather than independent validation since both draw on NASA's GEOS land modelling; SRTM against ASTER at the
  19 registered fields, 1.0–11.9 m apart, shown per field. Details: `docs/EVIDENCE.md`.
- **Machine learning, tested honestly:** ridge, logistic and decision-tree models trained on NASA POWER weather and
  soil wetness and tested on seasons they never saw. They find part of the crop's year in the weather only where
  Rabi crops follow the rain (Sitakunda, Gowainghat), and nothing at a single field; so the app keeps open rules and
  local review instead of a black-box forecast (`/science#ml`).
- **Checked against the ground:** the rain-onset rule agrees with Bangladesh Meteorological Department station-based
  onsets (Han et al. 2024) within a week at Rajshahi, Barishal and Dinajpur; POWER temperatures are corrected to the
  nearest BMD station's 1991–2020 normals.
- **Published science, named:** ICBM soil carbon (Andrén & Kätterer 1997), FAO-56 crop water, the NRCS soil-health
  principles, IPCC 2019 Tier 1 paddy methane, robust decision making over 8 CMIP6 models × 5 FAOSTAT yield years.
- **Tried in the field (team-reported):** in Dhamrai on 4 November 2026 five farmers used the website and the app
  and gave highly positive reviews; the Dhamrai agriculture officer, Omar Faruk, said everything is okay (100 out of
  100); three people played the 3D farm game and two children the children's game, each giving 5 stars. The tasks
  and answers were not written down (`docs/USER_TESTING.md`), so this shows the reception, not task results.
- **Honest about the rest:** the officer's review covered the app as a whole, not each rule on record. Boro's flowering-heat limit is a known open
  problem: it is crossed in nearly every recent season where Boro is the main crop, so it almost certainly
  over-warns; the plan shows how the advice changes at 36 °C, 37 °C or 5 days. Farmers are sample people, labelled
  as such on every screen.

## What is not done yet, and the plan

Nothing in the app or this kit claims these are resolved.

| Gap | Plan (about four weeks, one upazila) |
| --- | --- |
| The 4 November session's tasks and answers were not written down | Run the next session with `/testkit` (consent first, four timed tasks, three questions) and add its rows to `docs/USER_TESTING.md`: date, place, roles, answers in the participants' words, problems seen and the fix for each |
| The officer's review was of the app as a whole | Go through `docs/THRESHOLDS.md` rule by rule with the Dhamrai officer or a BARI/BRRI agronomist, starting with Boro's flowering-heat limit, and record each in `docs/REVIEW_LOG.md` |
| Soil is a model estimate | Soil tests (SRDI mobile lab) on 10 registered fields; compare pH and organic carbon with SoilGrids and publish the difference |
| Yields are national averages | Farmers' recorded harvests for the same fields against FAOSTAT; the backtest's "bad years" against farmers' recall of bad seasons |
| GRACE and SMAP come from colour-mapped GIBS tiles | Read the gridded products from NASA Earthdata instead (a token slot is in `.env.example`), so their sizes are exact rather than approximate |

## Team and roles

| Name | Role | What they did |
| --- | --- | --- |
| MD Jabir Hossain Sadi | Team lead | Leads the whole team |
| Razib Miah | Researcher, AI engineer | Web and game developer |
| MD. Rashedul Islam Shihab | Developer | |
| Minhajul Islam | App developer | |
| Meherun Necha Borsha | Storyteller | |
| Md Ariful Islam Abir | Video editor | |

Six members, as on the [NASA Space Apps team page](https://www.spaceappschallenge.org/2026/find-a-team/brm-astrax/?tab=details).
Teamwork is scored on this: before submitting, each person adds what they made, with a link (their commits, the files
or designs, the story, the video). Most commits so far are under one account.

## Datasets used

### NASA

| Dataset | Used for | Link |
| --- | --- | --- |
| NASA POWER daily point API (community AG): T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, ALLSKY_SFC_SW_DWN | 25-season backtest, rotation runs, scores, harvest timing, climate change "then vs now" | https://power.larc.nasa.gov |
| NASA POWER monthly GWETROOT, GWETTOP (root-zone and surface soil wetness, NASA GMAO MERRA-2) | Rabi-season soil water 2002–2025 and its trend, beside each rotation's irrigation need | https://power.larc.nasa.gov |
| NASA/JAXA GPM IMERG daily (IMERG_PRECTOT via POWER; GPM_3IMERGDF v07 at GES DISC) | Rain onset, June–July rain, drought/flood indices, rain cross-check | https://gpm.nasa.gov/data/imerg · https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary |
| NASA GRACE / GRACE-FO (JPL mascons, CRI) via NASA GIBS | Water stored on and under the land, yearly 2003–2021 (monthly Apr 2002 – Jul 2022), a regional average round each upazila and farm abroad | https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA SMAP Level 4 root-zone soil moisture via NASA GIBS | This month's root-zone soil moisture against normal; a check on POWER's soil wetness | https://smap.jpl.nasa.gov |
| NASA MODIS: MOD13Q1 250 m NDVI per registered field (ORNL DAAC), monthly NDVI and land surface temperature (GIBS) | Each field’s stressed Rabi seasons and its greenness against the area; bare months; ground heat; three statistical methods compared | https://modis.ornl.gov · https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA/USGS Landsat (WELD global monthly NDVI, 30 m, via GIBS) | Each field’s Rabi greenness in 1988–91 and 1998–2001 beside MODIS today | https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA SRTM and NASA/METI ASTER GDEM (30 m) | Standing water and erosion risk per field, with the two models’ disagreement | https://lpdaac.usgs.gov/products/srtmgl1v003/ |
| NASA GMAO MERRA-2 land evaporation (GIBS) | Monthly evapotranspiration beside the FAO-56 working | https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/ |
| NASA NEX-GDDP-CMIP6 v2.0 | The 2040s for every rotation; each of the 8 models on its own for the robustness test | https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6 |
| NASA GIBS, HLS (Harmonized Landsat Sentinel-2) | Satellite photos of the fields through the season | https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA FIRMS (neighbouring-country pages) | Fire detections | https://firms.modaps.eosdis.nasa.gov |
| NASA SEDAC via NASA GIBS: GPW v4.11 population density 2020, LECZ v3 (land below 10 m), Global Agricultural Lands croplands 2000 | Each upazila's population density, low-lying land and cropland share, summarised from the gridded layers inside its boundary (home page "Who it is for") | https://sedac.ciesin.columbia.edu |
| NASA Image and Video Library | The delta, the Sundarbans and Rupganj photographed from the Space Shuttle, the ISS and ASTER (home page) | https://images.nasa.gov |

### Partners and others

| Dataset | Used for | Link |
| --- | --- | --- |
| Copernicus Sentinel-1 RTC (via Microsoft Planetary Computer) | Aman transplanting dates, flooded fields | https://planetarycomputer.microsoft.com/dataset/sentinel-1-rtc |
| Copernicus Sentinel-2 L2A | Field watch (greenness, water) | https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a |
| Esri / Impact Observatory 10 m land cover | Cropland for the sample fields | https://livingatlas.arcgis.com/landcover/ |
| ISRIC SoilGrids 2.0 | Soil per union and field | https://soilgrids.org |
| SRDI Fertilizer Recommendation System | Fertilizer doses per union | http://frs-bd.com |
| Department of Agricultural Marketing (DAM) | Prices and price-dip months | https://market.dam.gov.bd |
| FAOSTAT | Yields | https://www.fao.org/faostat |
| geoBoundaries (BBS / OCHA) and GeoNames | Boundaries, unions, villages | https://www.geoboundaries.org · https://www.geonames.org |
| NOAA NCEI / WMO climate normals 1991–2020 (BMD stations) | Station correction of POWER temperatures | https://www.ncei.noaa.gov/products/wmo-climate-normals |
| ERA5 (Copernicus C3S, via Open-Meteo) | Neighbouring-country weather | https://open-meteo.com |
| BBS Population and Housing Census 2022; BBS Agriculture Census 2019 | People in each upazila; farm households in Bangladesh | https://www.citypopulation.de/en/bangladesh/admin/ · https://bbs.gov.bd |

Full list with dates and where each is used: [DATA_SOURCES.md](DATA_SOURCES.md).

## Demo and judging video

The 240-second local judging video and the 30-second global video follow one story: one farmer, one field, one
decision ([the video script](NASA_4MIN_JUDGING_VIDEO.md)). The [three-minute demo walkthrough](DEMO_SCRIPT.md) is
for a live demo. Both videos need burned-in English subtitles and no faces or voices of anyone under 18. The live plans/messages endpoints were unavailable (HTTP
503) during the 6 November 2026 check; do not present online officer messaging as a working live feature.

## Slide notes (short deck)

1. **Title.** FieldShift 360: comparing crop rotations for soil health and a changing climate. NASA data for
   Bangladesh's smallholders. Team, challenge name.
2. **The problem.** Shifting heat, changing rain, water shortages, extreme weather and tired soil; advice that
   stops at one season. Photo: cracked earth beside a flooded field.
3. **Who it is for.** 16.88 million farm households (Agriculture Census 2019) and 4.85 million ha of Boro; the farmer
   (Bangla, voice, phone, SMS), union officer (SAAO), upazila officer (UAO). 2.51 million people in the seven
   upazilas today; SEDAC shows which of them lie below 10 m.
4. **How it decides.** The field's estimated soil (SoilGrids, a 250 m model, not a soil test) + 25 seasons of NASA POWER + crop characteristics + the farmer's
   priorities → every rotation run for ten years → soil carbon, NRCS soil health, water, profit, risk, pests.
5. **Three strategies side by side.** Farming as now, the best rotation and the next alternative: why each, its
   evidence, what it may offer, what is unknown, its risks and what needs local review; then the soil time machine.
6. **Water and climate.** Irrigation per rotation, AWD, Rabi soil wetness since 2002, methane against soil carbon.
7. **Tested against 40 futures.** NEX-GDDP-CMIP6 2040s; the best rotations re-run in 8 models × 5 yield years = 40
   futures, each with the share in which it keeps the soil; what holds in any model is separated from what rests on
   an assumption. Field Future starts from the rotation Sentinel-2 appears to show on the field.
8. **For every farmer and officer.** A narrated story video and a picture poster of the farmer's own rotation; SMS
   for feature phones; the upazila-wide effect of a switch for the officer.
9. **This season's step.** KEEP / ADJUST / SHIFT on 25 seasons; voice in Bangla; officers see reports and Ropon
   Radar for seven districts.
10. **Honest data.** Every number labelled satellite, station, model, record, rule, AI or sample; a coverage-and-gaps
   table per field; where sources disagree; "a close call" when options are near; the evidence sheet.
11. **Next.** The four-week plan above (farmer and officer testing, threshold review, soil tests, recorded
    yields), BMD onset checks for Sylhet and Chattogram, a pilot with one union and an SMS short code; the same engine for any
    country, since POWER, SoilGrids and CMIP6 are global.

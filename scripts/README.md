# Scripts

Every script that makes the app's data and photos. The app itself never runs them: their output is committed, so a
build needs no network. Raw downloads are kept in `.cache/` (git-ignored) so a second run is fast. Where each dataset
comes from is in [docs/DATA_SOURCES.md](../docs/DATA_SOURCES.md).

## Training on Google Colab

`npm run colab:data` (`build/export_colab_data.mjs`) writes `notebooks/data/`: the harvest model's own table with a
12-month weather sequence per crop-year (`build/train_harvest_model.mjs --export`), the Chakra knowledge base's
retrieval chunks, and the hand-written retrieval questions (`build/chakra_retrieval_eval.json`). Open
`notebooks/agros_colab_training.ipynb` in Colab (T4 GPU) and run it top to bottom; it clones the repo or asks you to
upload those three files.

## Keeping the data current

`bash scripts/refresh-data.sh` re-fetches every dataset whose source keeps publishing (NASA POWER climate and soil
wetness, MODIS and MERRA-2 via GIBS, GRACE/SMAP, DAM prices, the Sentinel field watch, Aman radar, rain onset),
retrains the stress model and the Chakra knowledge base, and syncs the voice copies. `full` adds the long MODIS
per-field and South Asia trend pulls. Fixed releases (SoilGrids, SRTM, CMIP6, historical Landsat, boundaries) are left
alone. The GitHub Action `.github/workflows/refresh-data.yml` runs it every day at 03:30 Dhaka time, then the tests and
the build, and opens a pull request with the new data; it can also be started by hand from the Actions tab. Keys come from `.env.local` locally (loaded by the script) and from the repository secrets `NASA_API_KEY` and `EARTHDATA_TOKEN` in the Action; with `EARTHDATA_TOKEN` set, the Giovanni rain check runs too. To find a new NASA dataset, `npm run find:nasa -- <words>` searches data.nasa.gov.
The live forecast and the Sentinel-2 pictures on the Today page are fetched in the browser, so they are always current.

| Folder | What is in it |
| --- | --- |
| `fetch/` | Downloads from NASA and others, written straight into `src/data/` (Node, no login unless noted) |
| `build/` | Rebuilds boundaries, places, land use, soil, prices, field watch and the radar from public sources (Python and Node; [build/README.md](build/README.md)) |
| `onset/` | The rain-onset rule (`onset.mjs`, also used by the app's tests) and its check against BMD station onsets |
| `photos/` | Photo tools in Python: the upscaler, NASA images ([photos/README.md](photos/README.md)) |
| `lib/` | Shared helpers: NASA GIBS image decoding (`gibs.mjs`) |
| `sync-voice.mjs` | Copies the voice brain into `services/voice-agent` |

| npm | Script | Writes |
| --- | --- | --- |
| `fetch:power` | `fetch/power.mjs` | NASA POWER + GPM IMERG daily weather, `src/data/climate/climate_<upazila>.json` |
| `fetch:land` | `fetch/gibs-land.mjs` | NASA MODIS NDVI and land surface temperature and MERRA-2 evaporation, monthly since 2001, via GIBS: `src/data/land/land_sat.json` |
| `fetch:terrain` | `fetch/srtm.mjs` | NASA SRTM and ASTER 30 m heights averaged, hollows and slope at every registered field: `src/data/land/field_terrain.json` |
| `fetch:fields-ndvi` | `fetch/modis-fields.mjs` | NASA MODIS 250 m NDVI at every registered field, January–February since 2001 (ORNL DAAC, about half an hour): `src/data/land/field_ndvi.json` |
| `fetch:landsat` | `fetch/landsat-fields.mjs` | NASA/USGS Landsat WELD 30 m NDVI at every registered field, December–March of the 1984–86, 1988–91 and 1998–2001 epochs (NASA GIBS, no login): `src/data/land/field_landsat.json` |
| `train:stress` | `build/train_stress_model.mjs` | Trains and tests (leave one season out) ridge, logistic and decision-tree models of Rabi greenness and stress on NASA POWER weather and soil wetness: `src/data/models/stress_model.json` |
| `fetch:cmip6` | `fetch/cmip6.mjs` | NASA NEX-GDDP-CMIP6 change per month, 8 models, `src/data/climate/cmip6_deltas.json` |
| `fetch:wetness` | `fetch/soil-wetness.mjs` | NASA POWER root-zone soil wetness, `src/data/water/soil_wetness.json` |
| `fetch:water` | `fetch/gibs-water.mjs` | GRACE and SMAP through NASA GIBS, `src/data/water/water_sat.json` |
| `fetch:trend-fields` | `fetch/trend-fields.mjs` | GRACE, SMAP and MODIS NDVI for every pixel of South Asia, year by year, computed like the Trends map points (engine/trends.js) and drawn in its colours: `public/trends/` (pass `grace`, `smap` or `green` to build one) |
| `fetch:earth` | `fetch/earth-globe.mjs` | NASA Blue Marble, VIIRS Black Marble and one day of VIIRS true-colour clouds through NASA GIBS, for the Science page globe: `public/textures/earth/` (pass a date to pick the cloud day) |
| `fetch:sedac` | `fetch/sedac.mjs` | NASA SEDAC density, low coast, cropland per upazila, `src/data/region/sedac.json` |
| `fetch:giovanni` | `fetch/giovanni.mjs` | NASA Giovanni IMERG monthly rain check, `src/data/climate/giovanni.json` (needs `EARTHDATA_TOKEN` in `.env.local`) |
| `data:build` | `build/build_godagari_*.py`, `build/build_bangladesh_crops.py` | Boundaries, places, land use, national crop map, `src/data/geo/` |
| `data:soil` | `build/build_soil.py` | ISRIC SoilGrids per union and field, `src/data/soil/` |
| `data:field-shapes` | `build/sample_field_shapes.mjs` | Sample outlines for the demo fields: a real field's edge in the Esri photo near each pin (found by `src/engine/fielddetect.js`, or hand-traced in `build/sample_field_traces.json`), `src/data/fields/sample_shapes.json`. `--debug <dir>` writes each photo with the outline and a pixel grid |
| `data:srdi` | `build/build_srdi_frs.mjs` | SRDI fertilizer doses per union, `src/data/soil/srdi_frs.json` |
| `data:fields` | `build/build_field_watch.py` | Sentinel-2 field watch, `src/data/fields/field_watch.json` |
| `data:prices` | `build/build_market_prices.py` | DAM weekly prices, `src/data/market/market_dhaka.json` |
| `data:seasons` | `build/build_price_seasons.py` | Price-dip months and FAOSTAT yields, `src/data/market/` |
| `data:aman` | `build/build_aman_radar.mjs`, `build/build_aman_hazards.mjs` | Sentinel-1 Aman radar and hazards, `src/data/radar/`, `public/aman/` |
| `data:onset` | `onset/onset.mjs` | Rain onset per year for the seven upazilas, `src/data/radar/onset_<upazila>.json` |
| `data:onset-bmd` | `onset/compare_bmd.mjs` | The onset rule against BMD station onsets, `src/data/radar/onset_validation.json` |
| `data:smap-check` | `build/check_smap_power.mjs` | SMAP L4 against POWER root-zone wetness, per upazila (prints r; writes nothing) |
| `data:events` | `build/check_events.mjs` | Documented Boro disasters against the app's NASA signals at the nearest upazila, `src/data/climate/event_check.json` |
| `photos:nasa` | `photos/nasa_images.py` | NASA Image and Video Library photos, `src/assets/images/nasa/`, `src/data/media/nasa_images.json` |
| `photos:cards` | `photos/game_cards.py` | The two real game-card pictures on the play hub: a CC BY-SA farmer photo from Wikimedia Commons and NASA Terra MODIS true colour of Bangladesh (GIBS), `src/assets/images/{season-showdown,seven-fields}-*.webp` |
| `sync:voice` | `sync-voice.mjs` | The voice brain, into `services/voice-agent/` |
| `design:voice` | `design-bangla-voice.mjs` | Creates a reusable Gemini voice persona for conversational Bangladeshi female Bangla; saves a preview WAV to `.cache/voice/` and prints the voice ID to configure |

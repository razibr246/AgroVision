# App data

Everything the app reads, committed so the site builds and runs without a network. Do not edit a generated file by
hand: change its script in `scripts/` and run it again ([scripts/README.md](../../scripts/README.md)). Sources and
dates for every file: [docs/DATA_SOURCES.md](../../docs/DATA_SOURCES.md).

| Folder | Files | Made by |
| --- | --- | --- |
| `climate/` | `climate_<upazila>.json` (NASA POWER + IMERG daily, 2000–2026), `cmip6_deltas.json` (NEX-GDDP-CMIP6), `station_normals.json` (BMD station normals for the temperature correction) | `npm run fetch:power`, `fetch:cmip6`, `fetch:stories`; the station normals are copied from the NOAA/WMO 1991–2020 tables |
| `water/` | `soil_wetness.json` (POWER GWETROOT), `water_sat.json` (GRACE, SMAP) | `npm run fetch:wetness`, `fetch:water` |
| `land/` | `land_sat.json` (NASA MODIS NDVI and land surface temperature, MERRA-2 evaporation, monthly since 2001), `field_terrain.json` (NASA SRTM and ASTER height, hollows and slope at each registered field), `field_ndvi.json` (each field's MODIS 250 m NDVI, January–February since 2001), `field_landsat.json` (each field's Landsat WELD 30 m Rabi NDVI, 1984–2001 epochs) | `npm run fetch:land`, `fetch:terrain`, `fetch:fields-ndvi`, `fetch:landsat` |
| `models/` | `stress_model.json` (machine-learning models of Rabi greenness and stress, with their held-out scores) | `npm run train:stress` |
| `soil/` | `soil_<upazila>.json` and `soil_fields.json` (ISRIC SoilGrids), `srdi_frs.json` (SRDI doses) | `npm run data:soil`, `data:srdi` |
| `radar/` | `aman_radar.json`, `aman_hazards.json`, `aman_normals.json` (Sentinel-1, IMERG), `onset_<upazila>.json`, `onset_validation.json` | `npm run data:aman`, `data:onset`, `data:onset-bmd` |
| `fields/` | `field_watch.json` (Sentinel-2 per field), `parcels.json` (the upazila office's land register: real cropland, **sample** owners) | `npm run data:fields`; the register is written by hand |
| `market/` | `market_dhaka.json` (DAM weekly prices), `price_seasons.json`, `yield_history.json` (FAOSTAT), `crop_economics.json` (farm-gate prices and costs, each with its published source) | `npm run data:prices`, `data:seasons`; crop economics is collected by hand |
| `region/` | `sedac.json` (NASA SEDAC density, low coast, cropland), `census.json` (BBS censuses) | `npm run fetch:sedac`; the census figures are copied from BBS |
| `media/` | `nasa_images.json` (NASA Image and Video Library captions and credits) | `npm run photos:nasa` |
| `geo/` | boundaries, unions and villages, land use, the national crop map; `radar/` light maps for every radar upazila | `npm run data:build`, `scripts/build/build_radar_geo.py` |

The `.js` files here are data modules the app imports directly: `upazilas.js` (the seven upazilas and their officers),
`demo.js` (**sample** farmers and requests), `stories.js` (the seven upazilas' order and division names),
`parcels.js` (the register, with its satellite pictures), `advice.js`, `crop_problems.js` (BARI, BRRI and
DAE guidance), `crop_photos.js`, `crop_samples.js` (sample symptom leaves for the Crop Doctor) and `upazila_facts.js`.

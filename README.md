# FieldShift 360

[![NASA Space Apps Challenge 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-0B3D91?style=flat&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-15803d.svg)](LICENSE)

**FieldShift 360 helps farmers and agricultural officers explore crop rotations using local weather, soil, water, crop, and market information.** It was developed for the NASA Space Apps Challenge 2026, with Bangladesh as its primary setting.

- **Live app:** [fieldshift360.vercel.app](https://fieldshift360.vercel.app/#/)
- **Story demo:** [FieldShift stories](https://fieldshift360.vercel.app/#/stories)
- **Data sources and coverage:** [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)
- **Challenge mapping:** [docs/SUBMISSION.md](docs/SUBMISSION.md)

## What you can explore

- **Farmer tools** — a seasonal crop planner, field information, crop and water guidance, and a 10-year rotation comparison that can account for soil carbon, water, and farmer priorities.
- **Officer tools** — upazila views, rainfall onset and crop monitoring, farmer reports, and consent-based call notes.
- **Science and learning** — data coverage and methods, climate and satellite views, interactive farm simulations, and the children’s game *Tara and the Dream Fields*.
- **Regional examples** — sample farms for Bangladesh and selected South Asian and international locations.
- **Bangla and English** — the interface supports both languages.

The app calculates most decisions in the browser from committed datasets. Optional server features, such as AI-assisted answers, need deployment configuration and may be unavailable in a local demo.

## Challenge coverage

| Challenge area | Where to explore it | What the project provides |
| --- | --- | --- |
| Crop planning and farmer priorities | `#/farmer/plan`, `#/farmer/future` | Seasonal choices and comparisons of feasible crop rotations. |
| NASA Earth observations and local context | `#/science`, `#/science#coverage` | Data provenance, coverage, methods, and limitations. |
| Soil and crop information | `#/farmer/farm`, `#/farmer/future` | Regional soil estimates, crop guidance, and farmer-entered soil tests when supplied. |
| Weather, rainfall, and water risk | `#/farmer/today`, `#/officer/radar`, `#/science#trends` | Historical and recent weather, onset estimates, and regional satellite water signals. |
| Explainable recommendations | `#/farmer/future` | Strategy comparisons, assumptions, and evidence notes. |
| Learning and interactive exploration | `#/stories`, `#/science`, `#/farm`, `#/kids` | Story missions, science views, a 3D farm simulation, and a children’s learning game. |
| Agricultural officer workflows | `#/officer/*` | Upazila dashboards, sample farmer reports, crop monitoring, and call notes. |
| Broader geographic examples | `#/abroad/:cc/*` | The same tools applied to sample locations in other countries, with country-specific data where available. |

The route map is in [src/App.jsx](src/App.jsx); the challenge submission notes are in [docs/SUBMISSION.md](docs/SUBMISSION.md).

## Data: what is measured, estimated, and sample

Data coverage and source dates change as datasets are refreshed. The full register is maintained in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md), with additional method notes in [src/data/README.md](src/data/README.md).

| Kind | Examples | How to interpret it |
| --- | --- | --- |
| Sourced observations and records | GPM IMERG rainfall, MODIS vegetation and surface temperature, SMAP soil moisture, GRACE water storage, Sentinel imagery, market and crop statistics | These are real, sourced datasets, but their spatial and temporal resolution varies. A regional or satellite grid value is not a measurement from a farmer’s plot. |
| Model estimates | NASA POWER weather, MERRA-2 fields, SoilGrids soil properties, climate projections, crop and water simulations | Estimates and simulations carry model uncertainty; SoilGrids is not a soil test. |
| Rules and calculations | Crop thresholds, planting windows, rotation ranking, risk flags | Agronomic rules are assumptions for decision support and need local review before operational use. See [docs/THRESHOLDS.md](docs/THRESHOLDS.md). |
| Demo records | Farmer names, requests, and register owners | These are sample people and records. Demo parcel outlines are labelled as samples and are not surveyed boundaries. |

The app labels data according to its source. It is a planning and learning tool, not a substitute for field measurements or advice from local agricultural staff.

## Run locally

Requirements: Node.js 18 or newer and npm.

```bash
git clone https://github.com/razibr246/fieldshift360.git
cd fieldshift360
npm install
npm run dev
```

Vite prints the local development URL, usually `http://localhost:5173`. Development mode provides in-memory demo endpoints. The hosted demo does not require API keys for the core browser experience.

To make and preview a production build:

```bash
npm run build
npm run preview
```

`npm run build:single` creates an HTML bundle with the app JavaScript and CSS inlined. Workers and public assets remain separate, so it is not a fully self-contained offline copy.

## Development commands

```bash
npm test                 # Node test suites listed in package.json
npm run                  # list data, fetch, photo, and model scripts
npm run fetch:power      # refresh Godagari's POWER and IMERG climate data
npm run fetch:wetness     # refresh monthly root-zone and surface wetness
npm run fetch:water       # refresh SMAP and GRACE records from NASA GIBS
```

See [scripts/README.md](scripts/README.md) for the data pipeline and available commands. Generated data should be refreshed through its script rather than edited by hand. The standard validation path is `npm test` and `npm run build`.

## Configuration

Most app pages work without credentials. Optional map providers, AI features, voice, authentication, and Earthdata-only scripts use environment variables documented in [.env.example](.env.example). Put local values in `.env.local`; do not commit secrets. Some features require server-side configuration when deployed.

Auth0 is optional and currently provides a UI sign-in flow; it does not authorize production access to the demo boards. The project notes this and other security constraints in [docs/SECURITY.md](docs/SECURITY.md).

## Project layout

- `src/pages/` — farmer, officer, public, and regional pages.
- `src/components/` — shared interface, maps, charts, games, and visualizations.
- `src/engine/` — crop, climate, soil, water, rotation, and decision calculations.
- `src/data/` — committed datasets and demo records.
- `scripts/` — data fetching, building, and model generation.
- `api/` — Vercel serverless endpoints for optional hosted features.
- `docs/` — methods, thresholds, data sources, security, and submission materials.

## License and attribution

The application is released under the [MIT License](LICENSE). The original Ropon Radar prototype in `public/radar/` has its own [Apache-2.0 license](public/radar/LICENSE). Data products retain their source terms and attributions; consult the data register and the relevant source for each dataset.

---

Built for the **NASA International Space Apps Challenge 2026**.

# Repository Guidelines

Agros: a NASA Space Apps 2026 crop-rotation decision tool for Bangladeshi smallholders and agriculture
officers. A Vite + React 19 single-page app (HashRouter, Tailwind v4, recharts, Leaflet/MapLibre) that computes
everything in the browser from committed data; `README.md` maps each line of the challenge statement to a page.
This is the one guide for every coding agent, in the open [AGENTS.md](https://agents.md) format. Edit this file, not the
pointers: `CLAUDE.md` and `GEMINI.md` import it, `.github/copilot-instructions.md` links to it, `.gemini/settings.json`
and `.aider.conf.yml` load it, and Codex, Cursor and other AGENTS.md-aware tools read it directly. The nearest
AGENTS.md to the file being edited wins: `services/voice-agent/AGENTS.md` applies inside that folder. An instruction
in the chat overrides both. When you learn something every agent needs (a command, a trap, a rule), add it here.
The product name lives in `src/config/brand.js` (`PROJECT_NAME`, `PROJECT_NAME_PARTS`); use it rather than typing
the name, and note that renaming changes `STORAGE_PREFIX`, so saved demo state starts fresh.

## Commands

```bash
npm install
npm run dev                          # Vite dev server, with in-memory stand-ins for api/*
npm test                             # every Node test suite (list in package.json "test")
node --test src/engine/engine.test.js                                  # one suite
node --test --test-name-pattern="weights" src/engine/engine.test.js    # one test by name
npm run build && npm run preview     # production build in dist/, served locally
npm run build:single                 # inline app JS/CSS in dist-single/index.html; worker and public assets stay alongside it
npm run                              # list fetch:*, data:*, photos:* and train:* scripts (index in scripts/README.md)
bash scripts/refresh-data.sh         # daily data refresh + retrain (keys from .env.local)
```

Needs Node 18 or newer. There is no linter or formatter. `npm test` plus `npm run build` is the validation path; for UI
changes also open the affected farmer, officer or public page. Tests import engine modules and JSON (via
`readFileSync`) only: Node cannot import `.jsx`, so logic that needs a test belongs in `src/engine/` (e.g. `smsSplit`
lives in `engine/text.js`).
`npm test` runs an explicit file list in `package.json` `"test"`, not a glob: a new `*.test.js` runs only once it is
added there.

## Layout

- `src/App.jsx`: routes, every page lazy-loaded; three groups with their own layout in `src/layouts/`: public (`/`,
  the two games `/farm` and `/kids`), `/farmer/*` and `/officer/*`. The game hub, `/play`, `/saga`, `/stories` and `/people` were removed on
  request (27 Nov 2026), with the Field Future and Science pages; do not bring them back unless asked. The app covers Bangladesh only: the neighbouring-country and
  "beyond South Asia" section (`/abroad/:cc`) was removed on purpose, with its data, API, game farmers and scripts;
  do not bring it back unless asked.
- `src/store.jsx`: one context holds the selected farmer, field, priorities, requests and officer context, and derives
  the season decision (`engine/decision.js`), rotation (`engine/rotation.js`), field water and hotspots. NASA POWER
  climate per upazila loads lazily (`loadClimate(id)`) and is corrected to BMD station normals. The exported `clim` and
  `tm` stay `null` until `bootClimate()` finishes, so code that runs at import time must not read them; use
  `useStore().clim` or `loadClimate(id)`. Bilingual text goes
  through `T(bn, en)` and `L({ bn, en })`; numbers through `num()` / `bnDigits()` (`engine/dates.js`). Bangla first.
- Auth0 is optional and UI-only: `src/auth/AuthProvider.jsx` enables it only when `VITE_AUTH0_DOMAIN` and
  `VITE_AUTH0_CLIENT_ID` are set; otherwise `useAuth()` is a demo no-op and `/login` still offers sample accounts.
  No API route verifies an Auth0 token yet, so it does not authorise the shared boards.
- `src/engine/`: pure functions, no React. `soilfuture.js` (the Field Future page itself was removed; Signals, the plan and Chakra still use it): `fieldContext` → `fieldFuture` runs every
  feasible rotation for ten years (ICBM soil carbon, FAO-56 water, NRCS soil health), `rank()` re-weights by the
  farmer's priorities, `climateLedger` does IPCC paddy methane, `modelTest` the 40-future ensemble.
- `src/data/`: grouped by kind (`climate/`, `water/`, `land/`, `soil/`, `radar/`, `fields/`, `market/`, `region/`,
  `media/`, `geo/`, `models/`, `support/`) plus the data modules (`upazilas.js`, `demo.js`, `stories.js` ...);
  see `src/data/README.md`.
  Seven upazilas, one per division (`UPAZILAS`); `stories.js` `LEVELS` fixes their order everywhere.
  The build keeps only the series listed in `CLIMATE_IN_APP` (`vite.config.js`) from each `climate_*.json`; a new
  series reaches the app only once it is added there too.
- `scripts/`: `fetch/`, `build/`, `onset/` (the rain-onset rule, also imported by `src/radar/onset.test.js`),
  `photos/`, `lib/`; index in `scripts/README.md`. Do not hand-edit generated data: change the script and re-run it.
  Moving a script changes its depth, so check its `ROOT` path and relative imports. The crop-stress model is generated
  too: `npm run train:stress` (`scripts/build/train_stress_model.mjs`) writes `src/data/models/stress_model.json`,
  which `src/engine/stressModel.js` reads (no page shows it since the Science page was removed). Its skill is reported per place, as measured.
- `api/`: Vercel functions. `plans` and `messages` are demo boards: hosted/production builds return 503 for
  them (`api/runtime.js`) until real server-side auth exists; do not remove that guard without it. `vite.config.js`
  serves in-memory copies in dev only.
  The AI endpoints (`doctor`, `agent`, `tts`, `transcribe`) share `api/body.js`, `api/rateLimit.js` (Upstash,
  fail-closed in production) and `api/_keypool.js` (multiple Gemini keys; agent/doctor add provider fallbacks);
  reuse them, and add a test, for any new endpoint.
- চক্র এজেন্ট (Chakra Agent), in the farmer and officer headers: rules, permission policy and hash-chained audit log in
  `src/engine/chakra.js` (pure, tested), UI and agent loop in `src/components/chakra/`, conversation through `api/agent.js`
  (the model may only propose actions), and `src/voice/brain.js` + `src/engine/chakraLLM.js` as the offline fallback and
  RAG over `src/data/models/chakra_knowledge_base.json` (`npm run train:chakra`; regenerate when app data changes). Every
  AI answer is checked against the app data it was sent by `src/engine/replyCheck.js` (rule ids such as `R1_RAIN_OFFSET`,
  `R3_OWN_DOSE`), asked for once more if it fails, then repaired; new rules go there with a test. Anything sent in the office's
  name needs an officer's approval in every mode; keep it that way.
- Government support (`/farmer/support`): the programmes are hand-entered records in
  `src/data/support/` (each with its source URL and the `CHECKED` date; re-check them, never guess a figure), matched
  to the farmer's land, crops, water and place by `src/engine/support.js`. A pilot, announced or ended programme is never
  shown as a plain yes. The question box's score on `src/data/support/ask_eval.js` is a floor in the tests: add a
  question it fails rather than tuning keywords to that list.
- Call notes (`/officer/calls`, adapted from the Recordio app): the officer logs the farmer's consent first (no
  recording without it, `canRecord`), records or loads up to 5 minutes of audio, `api/transcribe.js` returns a transcript
  and note (inline audio only, never a URL), and `src/engine/callnote.js` keeps an amount only when its quoted words are
  in the transcript (`CN1_`–`CN3_` rules), then seals the record with SHA-256 (`verifyCallNote`). The audio is never
  stored, only its hash; a sealed note's `requestId` sits outside the seal. Keep checks in the engine, with a test.
- Field boundaries (`src/engine/landgeom.js`, pure and tested; UI in `components/fields/FieldBoundary.jsx` and
  `components/map/FieldShape.jsx`): a field is drawn by its boundary (GeoJSON `[lon, lat]`, any number of corners,
  holes, multi-part); never draw a field as a square or other shape made from its size (`plotSquare` is only the
  satellite's sampling window). The demo's sample fields carry a `sample` outline (`src/data/fields/sample_shapes.json`,
  `npm run data:field-shapes`): a real field's edge seen in the photo near the pin, labelled "নমুনা সীমানা (ডেমো)",
  never called measured; `measuredBoundaryOf()` skips it, so the satellite reading stays on the pin's window. Area and
  lengths are geodesic on WGS84; every boundary keeps its `source` (`survey`, `gps`, `file`, `drawn`) and is "verified"
  only when surveyed and checked by the office.
  `engine/fielddetect.js` finds a field's edge in the Esri photo from a point the person taps ("tap your field" in the
  trace mode); the result is a suggestion they check and adjust, kept as `drawn` with `aid: 'photo-edge'`. Unattended
  from a pin it picks a wrong patch about half the time, so the sample outlines were checked by eye and the bad ones
  hand-traced (`scripts/build/sample_field_traces.json`). A PostGIS schema for storing boundaries exists at
  `db/postgis/parcels.sql`, but the app does not write to it yet.
- A farmer's own soil test (`soilTests` in the store, `engine/soiltest.js`, entered on My field) is laid over the
  SoilGrids soil, so `soil.tested` is set and pH / organic matter / N are measured; code that says "estimate, not a
  soil test" must check `soil.tested`. The spray check (`engine/spray.js`, `components/fields/SprayCheck.jsx`) reads
  the live forecast; its limits are in `docs/THRESHOLDS.md`.
- The two-week field plan on Today (`components/fields/ClimateSmartPlan.jsx`) reads the 16-day Open-Meteo forecast:
  `engine/irrigationPlan.js` picks watering days by stochastic dynamic programming on the FAO-56 balance
  (`fieldWater().horizon`) and checks rain before a urea top-dress; `engine/heatWatch.js` lays the crop heat rules over
  the forecast. Their weights and assumptions are in `docs/THRESHOLDS.md`; tests in
  `src/engine/climateSmart.test.js`.
- Harvest records (no page of their own; used by the Chakra agent and the crop doctor): FAOSTAT national yields per crop (`npm run data:harvest`), each year judged good
  or bad against the crop's own trend, and six models scored leaving one year out (`npm run train:harvest`). Show the
  scores as measured (they are modest: national yields swing on more than weather); `engine/harvestRecords.js` `harvestBrief`
  feeds the Chakra knowledge base and the crop doctor's prompt. `src/data/harvest/harvest_dataset.csv` is SYNTHETIC
  starter rows, never used for a score.
- Colab training (`notebooks/agros_colab_training.ipynb`): harvest models (10 ML + 1D-CNN/GRU, leave one year out, with a
  crop-only floor and a shuffled-label check), a tomato image model for the crop doctor (trained on PlantVillage, scored
  on PlantDoc field photos) and BM25 against multilingual embeddings on `scripts/build/chakra_retrieval_eval.json`.
  `npm run colab:data` writes its inputs to `notebooks/data/`; rerun it after retraining. Its results go to
  `src/data/models/colab/` as measured; the retrieval floor is tested in `src/engine/chakraRetrieval.test.js`.
- `src/voice/brain.js` answers voice and SMS from the same engine numbers; `services/voice-agent/` is a separate
  project with its own guide. After editing `src/voice/{bn,lexicon,brain}.js`, run `npm run sync:voice`; the copies in
  `services/voice-agent/lib/agent/field/shared/` are generated, never edit them. `public/radar/` is the original Ropon
  Radar prototype (Apache-2.0); `src/radar/` is the in-app radar and onset logic.
- `src/components/`: shared UI (`ui.jsx`, `Motion.jsx`, `SectionNav.jsx` with `LazyMount`), charts in `charts/`, maps in
  `map/`, and the guided tours in `tour/` (demo, farmer, officer; the farmer tour's steps are `src/data/farmer_tour.js`).
  The farmer home has two modes (`s.farmerMode`), `pages/farmer/Dashboard.jsx` and
  `components/farmer/SimpleFarmerDashboard.jsx`; a change to the farmer home usually needs both.
  Every Leaflet map needs `<StopOnLeave />` (`map/StopOnLeave.jsx`, already inside `MapFrame`); without it, a
  zoom animation still running when the page changes throws `_leaflet_pos` / `getZoom` errors after the map is gone.
- `src/game/`: Harvest Horizon (ফসলের দিগন্ত; comments still say মাঠের মানুষ), the 3D farm game for the seven
  Bangladesh farmers, one per division (three.js in `game/three/`). Its simulation (`sim.js`) is pure and
  tested like the engine; keep rendering out of them. `three/stage.js` runs the loop through `renderer.setAnimationLoop`
  (WebXR needs it), so an exception in a frame stops the game rather than being skipped; AR/VR starts there, with rules
  in `three/xr.js` / `xrlogic.js`. People (`three/people.js`, `realPeople.js`; farmers and villagers) are built facing
  +z, so an opening for the face is centred at `phi = π/2` in a `SphereGeometry` and `theta = 0` in a
  `CylinderGeometry`. Rigged GLBs in `public/models/folk/` are generated from `scripts/build/people_specs.mjs` +
  `build_people.py`; do not hand-edit them. In dev, `window.__fsGame` (`{ g, buy, answerQuiz, stage() }`) and
  `window.__fsDream` let a script or headless browser drive a running game. The children's game "Tara and the Dream
  Fields" (তারা আর স্বপ্নের মাঠ, `/kids`) is separate: its story and rules are `game/dream.js` (pure, tested), its 3D
  world `game/three/dreamScene.js`, with rigged CC0 people in `public/models/people/` (see the LICENSE there).

## Rules of this project

- Finding NASA data: search the catalogue first with `npm run find:nasa -- <words>` (data.nasa.gov, NASA's dataset
  index; it links to where each dataset is hosted). Then write a fetch script for that host under `scripts/fetch/`,
  add it to `scripts/refresh-data.sh` if its source keeps publishing, and record it in `docs/DATA_SOURCES.md`.
  Keys: `NASA_API_KEY` (api.nasa.gov) and `EARTHDATA_TOKEN` live in `.env.local` (git-ignored; `refresh-data.sh`
  loads it) and as GitHub repository secrets for the daily Action. Read them from `process.env` in scripts only; never
  put a key in a committed file, in `src/` or behind a `VITE_` prefix.
- Real vs sample is a product rule: climate, rain, radar, soil, prices and yields are real; farmers, requests and the
  register's owners are sample. Every number carries a `<Tags list={[...]} />` label saying what produced it (`SAT`,
  `STATION`, `MODEL`, `RECORD`, `RULE`, `AI`, `DEMO`); NASA POWER weather and SoilGrids soil are `MODEL` (real data,
  not field measurements). Keep them truthful; the dataset register is
  `src/engine/provenance.js`.
- Never invent evidence. `docs/USER_TESTING.md` (filled from the `/testkit` export) and `docs/REVIEW_LOG.md` record
  only real sessions and real reviewers; claims in `docs/SUBMISSION.md` and `docs/EVIDENCE.md` must trace to a file
  or script. When something needs people, credentials or an expert, build the tooling and say what is missing.
- The redesign of the public, farmer and officer pages toward Congress Day (26 Dec 2026) follows
  `docs/REDESIGN_PLAN.md` one step at a time; tick a step only when its check passes.
- Before changing behaviour, check `docs/THRESHOLDS.md` (crop thresholds), `docs/DATA_SOURCES.md` (update it when
  data changes), `docs/RADAR.md` (onset rule), `docs/VOICE.md` and `docs/MERGE.md`; for API or deployment work,
  `docs/SECURITY.md`.
- Style: ES modules and JSX as the surrounding code; PascalCase component files, lowercase engine and script files;
  match indentation and quotes. Keep calculations in `src/engine/`, not in pages.
- Commits: short sentence-style subjects naming the user-visible change; call out generated data or config changes.
- Secrets live in `.env.local` (see `.env.example`), never in the repo.
- Several agents edit this repo at the same time. Before editing a file, check `git status` / `git diff` for another
  agent's unfinished work, and change only the lines you need; never write a whole file back from an older copy.

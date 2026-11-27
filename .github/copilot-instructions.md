# Copilot instructions for Agros

Read [AGENTS.md](../AGENTS.md) first. It is the repository-wide source of truth for
behaviour, data, and generated files. This file is a quick operational guide for Copilot;
when it conflicts with `AGENTS.md`, the nearest or more specific `AGENTS.md` wins.
Inside `services/voice-agent/`, follow
[`services/voice-agent/AGENTS.md`](../services/voice-agent/AGENTS.md) instead of
extending this app-level guide.

Claude, Gemini, and Aider already import or reference `AGENTS.md` (`CLAUDE.md`,
`GEMINI.md`, and `.aider.conf.yml`), so update `AGENTS.md` when adding a rule that every
coding agent needs.

## Commands

Use Node 18 or newer.

```bash
npm install
npm run dev
npm test
npm run build
npm run build:single
npm run preview
```

There is no linter or formatter. The baseline validation for code changes is
`npm test` plus `npm run build`; for UI changes, also open the affected public, farmer,
or officer route.

The test script is an explicit file list in `package.json`, not a glob. Adding a
`*.test.js` file requires adding it to `"test"` or it will not run in the normal suite.
Run one suite directly, or one named test inside a suite:

```bash
node --test src/engine/engine.test.js
node --test --test-name-pattern="weights" src/engine/engine.test.js
```

Useful repository operations:

```bash
npm run                  # list fetch:*, data:*, photos:*, and train:* scripts
bash scripts/refresh-data.sh
npm run sync:voice       # required after src/voice/{bn,lexicon,brain}.js changes
npm run find:nasa -- <words>
```

API and deployment work must follow `docs/SECURITY.md`. Behaviour thresholds belong in
`docs/THRESHOLDS.md`, and changes to datasets or data sources must update
`docs/DATA_SOURCES.md`.

## Architecture

Agros is a Vite, React 19, HashRouter single-page app for Bangladeshi crop decisions.
It computes from committed data in the browser:

- `src/App.jsx` owns the lazy-loaded route map. Public, farmer, and officer pages use
  separate layouts under `src/layouts/`.
- `src/store.jsx` is the app-wide context for the selected farmer, field, priorities,
  requests, officer context, and derived decisions. NASA POWER climate is lazy-loaded
  per upazila with `loadClimate(id)`; `clim` and `tm` remain `null` until
  `bootClimate()` finishes. Import-time code must not read those exports directly.
- `src/engine/` contains the pure decision, rotation, soil, water, radar, geometry,
  support, voice, and safety logic. React and UI rendering do not belong in engine
  modules. Pure engine and game rules have Node tests.
- `src/data/` contains committed climate, soil, market, field, radar, regional, model,
  and support datasets. Generated data is the output of `scripts/`; read
  `src/data/README.md` and `scripts/README.md` before changing a data pipeline.
- `api/` contains Vercel AI and demo-board handlers. Shared plans/messages are demo
  boards and return 503 in production until real server-side auth exists. Reuse
  `api/body.js`, `api/rateLimit.js`, and `api/_keypool.js` for AI endpoints.
- `src/game/` and `src/radar/` contain the 3D simulation/story logic and in-app radar
  onset logic. Keep simulation state/rendering separate and test pure modules.
- `public/radar/` is the original separate radar prototype and is copied as static
  assets; `src/radar/` is the app's implementation.
- `services/voice-agent/` is a separate TypeScript project and has its own nearest
  `AGENTS.md` and verification rules.

The app boots Bangla first. Hash routing and the service worker support offline use;
the first visit still needs to download a route that has never been opened.

## Repository conventions

- Put agronomic and domain calculations in `src/engine/`, never in JSX pages.
  The closest existing implementation is the pattern for the change.
- Keep engine dates as UTC-midnight timestamps. Use `DAY`, `ymd`, `addDays`, `iso`,
  and `daysBetween` from `src/engine/dates.js`; use `todayDhaka()` for the Bangladesh
  current date. Format bilingual text through `T(bn, en)` / `L({ bn, en })` and numbers
  through `num()` / `bnDigits()`.
- Preserve the real-versus-sample distinction. Weather, radar, soil, prices, and yields
  may be real or model estimates; demo farmers, requests, and ownership records are
  sample. Every displayed number needs the appropriate `<Tags>` provenance, such as
  `SAT`, `STATION`, `MODEL`, `RECORD`, `RULE`, `AI`, or `DEMO`. Never describe SoilGrids
  or NASA POWER as a field measurement.
- Do not hand-edit generated data. Change the script and rerun it. This also applies to
  generated voice copies: edit `src/voice/{bn,lexicon,brain}.js`, then run
  `npm run sync:voice`; never edit the generated copies under
  `services/voice-agent/lib/agent/field/shared/`.
- Check threshold and evidence documents before changing crop rules: at minimum
  `docs/THRESHOLDS.md`, `docs/DATA_SOURCES.md`, `docs/RADAR.md`, `docs/VOICE.md`,
  `docs/MERGE.md`, and `docs/SECURITY.md` for API work.
- For field boundaries, use GeoJSON `[lon, lat]` boundaries and geodesic WGS84 helpers
  in `src/engine/landgeom.js`. A sample outline is explicitly demo data; do not turn it
  into a measured boundary or derive a real field edge from its area. A boundary is
  verified only through the project's survey/office rules.
- The AI reply checker is a required safety path. Verify model answers through
  `src/engine/replyCheck.js`, repair failed answers, and keep Chakra actions
  proposal-only. Anything sent in the office's name requires officer approval.
- For Leaflet maps, preserve `<StopOnLeave />` through `MapFrame` so route changes
  cannot leave running zoom animations behind.
- The branch may contain unfinished work by several agents. Before editing, check
  `git status` and `git diff`, and touch only the lines required for the current task.

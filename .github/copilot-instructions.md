# Copilot instructions for FieldShift 360

Read [AGENTS.md](../AGENTS.md) first. It is the repository's single source of truth for commands, repo layout, data rules, and behavior constraints.

## Build, test, and validation commands

- Install dependencies: `npm install`
- Start the app locally: `npm run dev`
- Run the full test suite: `npm test`
- Run a single file: `node --test src/engine/engine.test.js` (or any `*.test.js` file directly)
- Run one named test: `node --test --test-name-pattern="weights" src/engine/engine.test.js`
- Run the voice suite: `node --test src/voice/voice.test.js`
- Build the static production bundle: `npm run build`
- Preview the production build locally: `npm run preview`
- Build the single-file export: `npm run build:single`
- Refresh generated voice agent files after touching `src/voice/{bn,lexicon,brain}.js`: `npm run sync:voice`
- Regenerate data or model outputs via the relevant `npm run fetch:*`, `npm run data:*`, or `npm run train:*` script when a dataset or rule changes.
- There is no separate linter or formatter script. The validation path is `npm test` plus `npm run build`.

Node 18+ is required. Tests use Node's built-in runner and import engine modules and JSON directly; do not move logic that needs unit coverage into JSX or UI-only files.

## High-level architecture

- This is a Vite + React 19 single-page app with hash-based routing and route groups for public, farmer, officer, and neighbouring-country flows.
- `src/App.jsx` is the route shell and lazy-loads page modules. Keep route-level orchestration thin and map to the existing portal structure instead of introducing new app-wide patterns.
- `src/store.jsx` is the app-wide state container. It holds the selected farmer, field, priorities, requests, officer context, and derived season/rotation decisions, and it loads upazila climate data while normalizing against BMD station baselines.
- `src/engine/` is the pure calculation layer. Crop, soil, water, climate, risk, and decision logic live here and are intentionally testable without React.
- `src/data/` contains committed datasets grouped by kind (`climate`, `water`, `soil`, `radar`, `market`, `geo`, `support`, etc.), plus maintenance modules such as `demo.js` and `upazilas.js`. These are source data, not UI state to be hand-edited.
- `scripts/` is the generation pipeline. `scripts/fetch/`, `scripts/build/`, and `scripts/onset/` write to `src/data/`, `public/`, and other committed outputs. Update the generator, then regenerate the data instead of editing generated JSON by hand.
- `api/` contains the Vercel serverless endpoints (`plans`, `messages`, `abroad`, `doctor`, `agent`, `tts`, `transcribe`, etc.). In local development, Vite serves in-memory stand-ins so the app can still render without a live backend.
- `src/voice/` and `services/voice-agent/` share the same voice/SMS logic. If you change the core voice logic under `src/voice/{bn,lexicon,brain}.js`, regenerate the mirrored service copy with `npm run sync:voice`.
- The Chakra agent policy and hash-chained audit log live in `src/engine/chakra.js`; the UI and action loop live in `src/components/chakra/`, with `api/agent.js` for online proposals and `src/voice/brain.js` as the offline fallback.
- `src/game/` and `src/components/` include the 3D agricultural game, story worlds, and UI layers. Keep rendering and app state concerns separate from the pure simulation and game rules.
- This project is intentionally offline-friendly after initial fetches and uses committed datasets rather than fetching everything on every build.

## Key conventions

- Real vs. sample data is product-critical: climate, rain, radar, soil, price, and yield data are real; farmers, requests, registry owners, and other identities are sample. Keep provenance labels truthful (`SAT`, `STATION`, `MODEL`, `RECORD`, `RULE`, `AI`, `DEMO`) and do not blur the line between measured data and model estimates.
- User-facing text is Bangla-first and bilingual. Use `T(bn, en)` / `L({ bn, en })` for labels and `num()` / `bnDigits()` for numbers instead of building ad hoc display logic.
- Keep calculations in `src/engine/`, not in pages or UI components. If a value reaches the user interface, it usually belongs in the engine and should be covered by a test when practical.
- Prefer the repo's data workflow: regenerate the relevant dataset with the matching `npm run fetch:*` / `npm run data:*` / `npm run train:*` script, then commit the generated output. Do not hand-edit generated data files or build artifacts.
- Before changing behavior, check the relevant docs: `docs/THRESHOLDS.md`, `docs/DATA_SOURCES.md`, `docs/RADAR.md`, `docs/VOICE.md`, and `docs/MERGE.md`.
- Keep UI code thin and orchestration-driven. Route and layout components should compose existing engine data and assets rather than re-implementing agronomic logic.
- Anything sent in the office's name requires officer approval in every mode; the AI may propose actions but must not execute them.
- This repo uses ES modules and JSX patterns consistent with surrounding code. Follow the existing naming and quoting conventions already in the project.
- `README.md` is the best place to understand the challenge story and product flow. It maps the challenge statement to the app pages and feature groups.

## Project-specific guardrails

- Do not edit generated data or build output by hand; regenerate it through the scripts in `scripts/`.
- Favor computing new values in `src/engine/` and exposing them through the existing store or route data flow instead of embedding logic in components.
- For climate, soil, rainfall, and radar rule changes, verify the relevant assumptions against the docs before adjusting thresholds or behavior.
- The AI crop doctor and server endpoints depend on server-side keys like `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`; the app should degrade gracefully when the key is absent.
- If a change affects data generation or source fidelity, update the relevant script and regenerated output together rather than patching single JSON files in place.

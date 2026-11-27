# Redesign plan: public, farmer and officer pages (to Congress Day, 26 Dec 2026)

Source: *SMART-A Climate-Smart Farming Blueprint* (PDF, Nov 2026). This plan takes what the blueprint asks for and
maps it onto the app as it is, step by step. Each step names its files and ends with a check that must pass before
the next step starts. Several agents edit this repo: take one step at a time, check `git status` first, and tick the
box here when the check passes.

## What we take from the blueprint, and what we don't

Take:
- One stage-aware hazard list per field (heat at flowering, cold, water deficit, flash flood, salinity, late planting),
  each with its trigger numbers and the rule's source.
- Advice cards that show three things apart: **calculated** numbers, **cited** research, **AI** wording.
- A curated, cited knowledge base (BRRI, FAO-56, IRRI, SRDI, DAE), so the Chakra agent can cite a page, not only app data.
- GloFAS river discharge for flood warnings (the app has none yet).
- An officer triage view that ranks farms by risk and drafts 160-character Bangla SMS.
- A sustainability page that sorts every number into measured, model estimate, projection or farmer-reported.
- Measured evidence (retrieval, faithfulness, FAO-56 parity, mobile and offline tests) before any claim.

Don't take:
- **The stack change** (Next.js, FastAPI, Neon, LangGraph). The app already runs on Vite + React + Vercel functions with
  967 passing tests; rebuilding it in four weeks would cost the month and risk the demo.
- **Numbers we cannot trace.** Any figure on screen or in a slide (farm counts, losses, savings, cost per farm) must
  come from a file or script in this repo, as `AGENTS.md` requires. The blueprint's figures are leads to check, not facts.
- **Target scores as claims.** "Faithfulness ≥ 0.85" is a goal; report what the tests measure.

## Facts checked for this plan (27 Nov 2026)

- Google's deprecations page (aistudio.google.com/docs/deprecations) lists gemini-2.5-flash and gemini-2.5-pro for
  1 Dec 2026, and gemini-2.5-flash-preview-tts and gemini-3.1-flash-tts-preview for 18 Dec 2026. The app's defaults
  (gemini-3.5-flash-lite, gemini-3.8-flash, gemini-3.8-flash-tts and -lite-tts) have no announced date;
  gemini-3.1-flash-lite, the agent's second choice, is listed for 7 May 2027. Only `api/tts.js` still has a branch for
  gemini-3.1-flash-tts-preview (an env override).
- Already in the app: Sentinel-1 and -2 readings, AWD logic, heat/cold/late-blight rules (`engine/weatherRisk.js`,
  `engine/heatWatch.js`), 16-day forecast and irrigation plan, consent before call recording, an offline service worker
  (`public/sw.js`), SMS splitting, provenance tags (`<Tags>`), and an answer checker (`engine/replyCheck.js`).
- Missing: GloFAS, a cited institutional corpus, one unified hazard list, an officer triage ranking, a sustainability
  page, and a visible "saved copy from …" badge when offline.

## Decision for you before step 1

- **Name.** The blueprint says "Agros" collides with agrosglobal.com and a Thai firm. Check those yourself; if you
  rename, change only `src/config/brand.js` (this resets saved demo state, see `AGENTS.md`). The plan works either way.

## Steps

Dates are targets. MVP freeze 10 Dec; feature freeze 18 Dec; after that only evidence, fixes and rehearsal.

### Step 0 — Ground work (27–28 Nov)
- [ ] Commit the current work in small commits.
- [ ] Remove the gemini-3.1-flash-tts-preview branch from `api/tts.js` and its test (it shuts down 18 Dec).
- [ ] Run the ui-consistency *finding-patterns* pass over `pages/farmer`, `pages/officer`, `pages/public/Home.jsx` and
      `components/ui.jsx`, and write the checklist it produces. Every later UI step is checked against it. Keep the
      current design system; take from the blueprint only what fits it: 48 px tap targets, tabular numerals, and
      high-contrast risk colours.
- Check: `npm test` and `npm run build` pass; the checklist exists.

### Step 1 — One hazard list per field (28 Nov – 2 Dec)
- [ ] `src/engine/hazards.js` (pure, tested): for one field, return the hazards above, each as
      `{ id, severity, daysAhead, trigger: {...numbers}, rule: {bn,en}, source }`. Build it from the existing
      `weatherRisk.js`, `heatWatch.js` and `fieldwater.js`; do not copy their thresholds. Any new threshold goes into
      `docs/THRESHOLDS.md` with its source first.
- [ ] Salinity and haor: a field in a saline zone or a haor is never told to dry its field (AWD off), with the reason.
- [ ] `src/engine/hazards.test.js`, one test per hazard and per boundary; add it to `package.json` "test".
- Check: tests pass; for each of the three demo places (Godagari = Barind, Gowainghat = haor field GOW-RU-0501,
  Dacope = coastal) the list matches a hand calculation written in the test.

### Step 2 — River flood from GloFAS (1–4 Dec)
- [ ] `scripts/fetch/glofas.mjs`: daily discharge history for each upazila's nearest river cell (Open-Meteo flood API),
      saved as data; record it in `docs/DATA_SOURCES.md` and add it to `scripts/refresh-data.sh`.
- [ ] The live forecast is fetched in the browser like the weather. The flood rule compares forecast discharge with the
      cell's own 90th percentile (discharge in m³/s is not a river level; never compare it with danger marks in metres).
- [ ] Add the flood hazard to `hazards.js`, tagged `MODEL`, and send people to BWDB/FFWC as the official warning.
- Check: tests with saved discharge pass; the rule fires on the 2017 and 2022 Sylhet flood weeks in the history.

### Step 3 — A cited knowledge base (1–7 Dec)
- [ ] `src/data/knowledge/` hand-entered passages from BRRI, FAO-56, IRRI (Safe AWD), SRDI and DAE documents: each with
      title, organisation, year, page, URL, crop and hazard tags, and a `CHECKED` date. Never invent a passage or a
      page number; if a document cannot be opened, leave it out.
- [ ] `scripts/build/train_chakra_brain.mjs` indexes them; answers show citation chips that open the passage.
- [ ] `engine/replyCheck.js`: a rule that every cited id was among the retrieved passages, with a test.
- [ ] Grow `scripts/build/chakra_retrieval_eval.json` to 60 questions (Bangla and English); keep the floor test.
- Check: retrieval floor test passes; Colab Part 3 rerun shows BM25 vs embeddings on the new set.

### Step 4 — Farmer pages (4–10 Dec) → MVP freeze 10 Dec
- [ ] Home (both modes: `pages/farmer/Dashboard.jsx` and `components/farmer/SimpleFarmerDashboard.jsx`): risk lights
      from `hazards.js` at the top, then the two most urgent actions.
- [ ] Action cards: three labelled parts — calculated numbers, cited passage, AI wording (when used) — plus
      "I did this" which logs the action as farmer-reported.
- [ ] A 16-day calendar of stage + hazards + watering days (reuse `ClimateSmartPlan.jsx`).
- [ ] "Saved copy from …" badge whenever data comes from the offline cache.
- [ ] `/farmer/impact`: water and pump cost saved (model estimate), methane range (projection, with the N₂O
      trade-off), hazards warned ahead (measured from the app's own log), actions done (farmer-reported).
- Check: the patterns checklist, `npm test`, `npm run build`, and a Playwright pass at 390×844 on every farmer page
  with no console errors; reload offline works.

### Step 5 — Officer and public pages (10–18 Dec) → feature freeze 18 Dec
- [ ] Officer triage (`pages/officer/Dashboard.jsx` or a new `Triage.jsx`): farms ranked by worst hazard, filter by
      union and hazard, map of clusters, "draft SMS" that stays ≤ 160 characters per part (`engine/text.js`). Sending in
      the office's name still needs an officer's approval.
- [ ] Officer flood panel from step 2.
- [ ] Public home (`pages/public/Home.jsx`): a live strip for the three demo places, one tap into each demo farm, a
      plain diagram of "calculated → cited → AI", and the sources strip. A demo switch for "April heat at flowering"
      must say SIMULATED on every number it changes.
- Check: as step 4, for officer and public pages; officer approval test still passes.

### Step 6 — Evidence (18–22 Dec)
- [ ] Measured, from scripts in the repo: retrieval (Colab notebook), answer-check pass rate on a fixed question set
      (`replyCheck`), FAO-56 unit checks (1 mm over 1 ha = 10 m³), harvest model scores, mobile and offline test runs.
- [ ] Write them into `docs/EVIDENCE.md` with the command that produced each number. Real users or reviewers only in
      `docs/USER_TESTING.md` / `docs/REVIEW_LOG.md`.
- Check: every number in the deck traces to `docs/EVIDENCE.md`.

### Step 7 — Deploy and rehearse (22–26 Dec)
- [ ] Production deploy on Vercel with the keys set there; health check of each AI endpoint.
- [ ] Local build ready as a backup (`npm run build && npm run preview`), plus a recorded demo video.
- [ ] Update `docs/DEMO_SCRIPT.md` to the new pages; rehearse the 2- and 5-minute versions.
- Check: a full demo run on the deployed site and one offline.

## Who does what

Engine steps (1, 2, 3) can run in parallel; UI steps (4, 5) start once step 1 lands because they read `hazards.js`.
Data in step 3 needs a person to open each source document; an agent may draft, but a person checks each passage.

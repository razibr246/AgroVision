# FieldShift 360

[![NASA Space Apps Challenge 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026%20Global%20Challenge-0B3D91?style=for-the-badge&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![Automated Tests](https://img.shields.io/badge/Tests-1%2C000%20Passing%20%7C%200%20Failures-245a26?style=for-the-badge&logo=node.js&logoColor=white)](https://github.com/razibr246/fieldshift360)
[![Edge Computation](https://img.shields.io/badge/Compute-100%25%20In--Browser%20Zero--Lag-0284c7?style=for-the-badge&logo=webassembly&logoColor=white)](https://fieldshift360.vercel.app/#/)
[![Bilingual English & Bengali](https://img.shields.io/badge/Language-English%20Default%20%7C%20বাংলা-15803d?style=for-the-badge)](https://fieldshift360.vercel.app/#/)
[![License: MIT](https://img.shields.io/badge/License-MIT%2FApache--2.0-amber-700?style=for-the-badge)](LICENSE)

> **A mission-grade crop-rotation and agro-ecological decision intelligence platform for smallholder farming communities and extension officers, powered by 25 years of NASA Earth observations, SoilGrids pedometrics, and multi-model climate ensembles.**

- **Live Web Application (Vercel):** [https://fieldshift360.vercel.app/#/](https://fieldshift360.vercel.app/#/)
- **GitHub Repository:** [https://github.com/razibr246/fieldshift360](https://github.com/razibr246/fieldshift360)
- **Interactive 4-Minute Judge Demo Story:** [https://fieldshift360.vercel.app/#/stories](https://fieldshift360.vercel.app/#/stories) (or via the homepage)
- **Offline Single-File Bundle:** Self-contained executable HTML build in `dist-single/index.html` (runs completely offline with zero installation)

---

## Table of Contents

1. [Executive Summary & The Core Problem](#executive-summary--the-core-problem)
2. [NASA Earth Science & Partner Datasets](#nasa-earth-science--partner-datasets)
3. [The Challenge Statement: Line-by-Line Mapping](#the-challenge-statement-line-by-line-mapping)
4. [Platform Architecture & System Portals](#platform-architecture--system-portals)
   - [Farmer Decision Intelligence (Field Future & 10-Year Simulations)](#1-farmer-decision-intelligence-field-future--10-year-simulations)
   - [Agricultural Officer Command Center & Radar Operations](#2-agricultural-officer-command-center--radar-operations)
   - [Interactive 3D Science Constellation & Sensor Physics Labs](#3-interactive-3d-science-constellation--sensor-physics-labs)
   - [Harvest Horizon 3D Agro-Sim & WebXR Ecosystem](#4-harvest-horizon-3d-agro-sim--webxr-ecosystem)
   - [Tara and the Dream Fields: Children's STEM & Math Lab](#5-tara-and-the-dream-fields-childrens-stem--math-lab)
   - [Global Agriculture & Transboundary Expansion](#6-global-agriculture--transboundary-expansion)
5. [AI Engineering, Verification & Safety Guardrails](#ai-engineering-verification--safety-guardrails)
6. [Data Integrity & Truthfulness Rules (Real vs. Sample)](#data-integrity--truthfulness-rules-real-vs-sample)
7. [Verification, Test Suites & Benchmarks](#verification-test-suites--benchmarks)
8. [Quickstart Guide for Judges & Developers](#quickstart-guide-for-judges--developers)
9. [Development History, Timeline & Disclosures](#development-history-timeline--disclosures)
10. [Licence & Open Source Attribution](#licence--open-source-attribution)

---

## Executive Summary & The Core Problem

Smallholder farmers across the Global South—starting with 16.88 million agrarian households in Bangladesh—are making high-stakes cropping decisions under unprecedented climatic disruptions. Generations-old agrarian calendars are failing due to delayed monsoon onsets, prolonged drought across the Barind clay plateau (Godagari), sudden coastal saltwater incursions (Dacope), flash flooding on low-lying deltas (Dhamrai), and groundwater depletion.

When smallholders make isolated, reactive crop choices, they face compounded vulnerabilities: catastrophic pest cycles, rapid soil organic matter depletion, and local market price collapse when entire regions harvest identical crops simultaneously.

**FieldShift 360** transforms NASA’s open Earth observation satellites into actionable, field-level agronomic strategy:

1. **Decadal Simulation (`Field Future`):** Runs several hundred feasible 1-year and 2-year crop sequences over a 10-year projection horizon. It computes the **ICBM soil carbon balance** (Andrén & Kätterer), daily **FAO-56 root-zone hydrology**, **IPCC Tier-1 paddy methane accounts**, and re-weights every rotation by the farmer's individual priorities (soil preservation, water conservation, fodder yield, or net profit).
2. **Robust Climate Stress Testing:** Evaluates top rotations across an ensemble of **8 NASA NEX-GDDP-CMIP6 climate models** coupled with 5 historical FAOSTAT yield variance scenarios (a 40-scenario resilience ensemble) to find strategies that survive through the 2040s.
3. **Upazila-Wide Coordination:** Provides Sub-Assistant Agricultural Officers (SAAO) and Upazila Agriculture Officers (UAO) with radar-detected transplanting monitoring (Copernicus Sentinel-1 SAR), spatial pest outbreak clustering (DBSCAN), and price glut warnings.
4. **Universal Accessibility:** Fully localized with professional **English as the international default** and full **Bengali (`বাংলা`) support**, accessible via modern WebGL dashboards, bilingual voice AI, and a bandwidth-free 70-character SMS mode for basic 2G feature phones.

---

## NASA Earth Science & Partner Datasets

FieldShift 360 integrates 12 NASA Earth observation satellites and reanalyses. Every number shown in the application carries a provenance badge indicating its native spatial and temporal scale:

| NASA / Partner Dataset | Mission / Source | Native Resolution & Temporal Scale | Role in FieldShift 360 Decision Logic |
| :--- | :--- | :--- | :--- |
| **NASA POWER** | GMAO MERRA-2 / GEOS | Daily, ~50 km grid (2000–2026) | Daily temperatures ($T_{\max}, T_{\min}$), precipitation (`PRECTOTCORR`), solar radiation, and station-calibrated 25-season historical backtests. |
| **NASA POWER GWETROOT** | MERRA-2 Reanalysis | Monthly, 0.5° × 0.625° (2001–2025) | Decadal root-zone soil wetness trends, dry-season moisture anomalies, and historical drought indicators. |
| **NASA / JAXA GPM IMERG** | GPM Core Observatory | Daily & 30-min, 0.1° (~10 km) | Precipitation cross-check against POWER and regional rain onset detection ($r = 0.81$ correlation over 25 Rabi seasons). |
| **NASA SMAP** | SMAP L-band Radar/Radiometer | Monthly L4, 9 km / 0.25° (2015–2026) | Root-zone soil moisture anomalies, water stress monitoring, and correlation check with soil water balance ($r = 0.89\text{--}0.96$). |
| **NASA GRACE / GRACE-FO** | Gravity Recovery Satellites | Monthly Mascons (JPL CRI), 0.5° (2003–2021) | Deep aquifer water storage depletion tracking (detecting the $-8.9\text{ cm/decade}$ decline beneath the Barind Tract, $p < 0.01$). |
| **NASA MODIS MOD13Q1** | Terra & Aqua Satellites | 16-day composite, 250 m (2001–2026) | Field-level vegetation health, Rabi NDVI anomalies, 25-year bare-ground month detection, and vegetative stress indices. |
| **NASA MODIS LST** | Terra & Aqua Satellites | Monthly, 1 km (2001–2026) | Land surface temperature tracking and extreme thermal stress detection during Boro rice flowering windows. |
| **NASA NEX-GDDP-CMIP6** | NCCS Downscaled Projections | Daily downscaled 0.25°, 8 models (2041–2050) | Decadal climate risk stress-testing under SSP2-4.5 and SSP5-8.5 scenarios for 10-year rotational resilience. |
| **NASA SRTM & ASTER GDEM** | Space Shuttle / Terra | 30 m spatial resolution | Multi-model consensus elevation, localized topographic slope, hollow detection, and waterlogging/erosion risk scores. |
| **NASA GIBS HLS** | Harmonized Landsat & Sentinel | 30 m spatial resolution (cloud-free passes) | Surface reflectance visual baselines, high-resolution optical ground context, and historical comparisons. |
| **NASA SEDAC** | CIESIN / Columbia University | 1 km grid (GPW v4.11, LECZ v3, Croplands) | Upazila-level human population density, low-elevation coastal vulnerability (<10 m), and cropland proportion. |
| **NASA FIRMS** | VIIRS / MODIS Active Fires | 375 m / 1 km near real-time | Transboundary agricultural residue and post-harvest straw burning tracking. |
| **Copernicus Sentinel-1** | ESA Radar Constellation | 10 m SAR C-Band (12-day repeat) | All-weather, cloud-penetrating synthetic aperture radar monitoring of Aman rice seedling transplanting dates. |
| **Copernicus Sentinel-2** | ESA MSI Constellation | 10 m Multi-Spectral (5-day repeat) | Field parcel boundary tracing, multi-spectral band reflectance, NDRE, NDMI, and high-resolution NDVI validation. |
| **ISRIC SoilGrids 2.0** | ISRIC World Soil Info | 250 m ML Pedometric Model | Baseline soil organic carbon ($g/kg$), bulk density, soil texture classification, and soil pH at 0–30 cm depths. |
| **SRDI & DAM** | Bangladesh Govt (BARI/BRRI/DAM) | Union-level records & weekly markets | Soil Resources Development Institute fertilizer guidelines and Department of Agricultural Marketing wholesale/retail price indices. |

---

## The Challenge Statement: Line-by-Line Mapping

FieldShift 360 was built specifically to address the NASA Space Apps Challenge. Every requirement is mapped directly to a dedicated interface and tested engine:

| Challenge Requirement | How FieldShift 360 Solves It | Interface Location |
| :--- | :--- | :--- |
| **A decision-support tool** | Field Future calculates and ranks feasible crop rotations for any field based on inferred Sentinel-2 sequences, farmer priorities, and regional agronomic rules. | `#/farmer/future`, `#/farmer/plan`, `#/officer/upazila` |
| **Uses NASA Earth observations** | 12 NASA satellite products and reanalyses compute soil water balance, temperature extremes, rainfall onset, and decadal carbon paths. | Entire application; comprehensive audit at `#/science#coverage` |
| **Local soil information** | Ingests ISRIC SoilGrids 2.0 pedometrics (SOC, pH, texture) at 250 m per parcel, blended with national SRDI union fertilizer guidelines and farmer soil-test inputs. | `#/farmer/farm`, `#/farmer/future` (Soil Column) |
| **Crop characteristics** | Complete botanical engine modelling 22+ regional crops: growth duration, sowing windows, FAO-56 crop coefficients ($K_c$), harvest index, and root/shoot carbon ratios. | `src/engine/crops.js`, `src/engine/soilfuture.js` |
| **Farmer priorities & constraints** | Optimizes across 6 farmer priorities (Profit, Low Water, Soil Health, Low Risk, Cattle Fodder, Soil Cover) while enforcing resource constraints (machinery, labour, jute-retting water). | `#/farmer/plan` (Step 4), `#/farmer/future` |
| **Explore rotation strategies** | Evaluates all 1-year and 2-year cycles combining Rabi, Kharif-1, and T. Aman crops. Allows farmers to build and compare custom rotations against the status quo. | `#/farmer/future` (`#ff-strategies`) |
| **Why, evidence, benefits, gaps & risks** | Transparent multi-attribute audit cards for every strategy: evidence base, economic benefits, carbon gains, known uncertainties, and required local checks. | `#/farmer/future` (`#ff-why`), `src/engine/briefs.js` |
| **Explain the science & combining scales** | Full educational glossary, resolution harmonizer explaining why datasets are aggregated rather than blindly downscaled, and satellite vs. ground validation. | `#/science`, `#/science#multiscale`, `#/science#disagree` |
| **Strengthen soil health** | ICBM dynamic carbon modelling; season-by-season 3D visual soil profile illustrating earthworm burrowing, plough pans, and root nodulation. | `#/farmer/future` (Soil Time Machine) |
| **Shifting temperatures** | Tracks 25 seasons of thermal shifts, historical hot spells during Boro pollination, and warmer carbon decomposition trajectories in the 2040s. | `#/`, `#/farmer/plan` (Step 2), `#/science#trends` |
| **Changing rainfall & onset** | Ropon Radar tracks shifting rainfall onset from GPM IMERG, validated against BMD station normals within a 7-day delta across regional agricultural hubs. | `#/officer/radar`, `#/farmer/today` |
| **Water shortages & irrigation** | FAO-56 daily evapotranspiration and soil water depletion balance; alternate wetting and drying (AWD) Boro rice conservation; GRACE regional aquifer depletion metrics. | `#/farmer/future` (Soil Water), `#/farmer/today` |
| **Field-level vulnerabilities** | Multi-hazard vulnerability profiles per field (standing water, slope erosion, heat at flowering, dry Rabi season) based on SRTM, POWER, and MODIS. | `#/farmer/farm`, `#/officer/farmers` |
| **Bare fields & vegetation stress** | 25-year MODIS NDVI historical curves identifying bare-soil vulnerability windows and crop stress anomalies; Landsat archival comparison (1988–2001 vs. today). | `#/farmer/future` (From Space), `#/farmer/farm` |
| **Compare SI & statistical models** | Stress ML benchmark comparing Ridge regression, Logistic regression, and 2-level Decision Trees against historical ground stress (reporting AUC and Brier scores). | `#/science#ml`, `src/engine/stressModel.js` |
| **Interactive maps of trends** | Time-series playback map with scrubbing controls for GRACE water anomalies (2003–2021), MODIS greenness (2001–2026), and SMAP soil moisture (2015–2026). | `#/science#trends` |
| **Long-term resilience** | 40-scenario climate resilience ensemble: 8 NEX-GDDP-CMIP6 models × 5 real FAOSTAT yield variance years, assessing the probability of carbon retention. | `#/farmer/future` (Eight-Model Test) |
| **Multimedia & Arts** | Interactive 3D WebGL satellite constellation, interactive soundscapes (river flow synthesis), printable Bangla seasonal crop calendar posters, and video generator. | `#/science`, `#/farmer/future`, `#/farm` |
| **Children & family STEM** | "Tara and the Dream Fields" (`/kids`): Story missions featuring Tara the NASA satellite, interactive biology/chemistry labs, and mathematical farm simulation. | `#/kids`, `src/game/dream.js` |
| **Global applicability** | Transboundary expansion with full rotational logic and climate datasets for 8 nations: India, Pakistan, Nepal, Bhutan, Myanmar, USA, Brazil, and Spain. | `#/abroad/:cc/*` |

---

## Platform Architecture & System Portals

FieldShift 360 is built as a modular single-page application consisting of five interconnected portals:

```
                                  [ FieldShift 360 Core Engine ]
                                  (Pure JS • Browser-Evaluated)
                                                │
         ┌───────────────────┬──────────────────┼──────────────────┬──────────────────┐
         ▼                   ▼                  ▼                  ▼                  ▼
  [ Farmer Portal ]   [ Officer HUD ]    [ Science Labs ]   [ 3D Game Sim ]    [ Kids STEM Hub ]
   • Field Future      • Ropon Radar      • 3D Satellites    • Harvest Horizon  • Tara's Dream
   • Season Planner    • SAAO Triage      • Spectral Labs    • Biomechanics     • Chemistry Lab
   • Voice / SMS       • Call Notes       • Spatial Fusion   • WebXR Mode       • Math Missions
```

### 1. Farmer Decision Intelligence (Field Future & 10-Year Simulations)
- **7-Step Seasonal Advisor (`#/farmer/plan`):** Guides farmers through field selection, observed climate anomalies, soil chemistry, priority weighting, crop recommendation, crop diversification checks, and harvest scheduling.
- **10-Year Rotational Simulator (`#/farmer/future`):** Compares status quo farming against optimized multi-crop rotations. Computes long-term soil organic carbon changes, water conservation savings in litres, urea reductions in kg, and net financial returns in BDT.
- **Voice & SMS Modalities (`#/farmer/sms`):** An integrated offline-first natural language engine interprets regional dialects and formats advisory into 70-character SMS segments for basic non-smartphones.

### 2. Agricultural Officer Command Center & Radar Operations
- **Ropon Radar (`#/officer/radar`):** Synthesizes Copernicus Sentinel-1 synthetic aperture radar observations to identify real-time Aman rice transplanting dates across entire upazilas. Alerts officers when planting lags behind the GPM IMERG rainfall onset.
- **Cluster Outbreak Detection (`#/officer/alerts`):** DBSCAN unsupervised spatial clustering groups incoming farmer pest and disease reports into localized geographic alerts, enabling rapid extension intervention.
- **Verifiable Call Notes (`#/officer/calls`):** Facilitates officer audio consultations with farmers, requiring recorded farmer consent before transcribing audio and sealing agronomic recommendations with SHA-256 cryptographic verification.

### 3. Interactive 3D Science Constellation & Sensor Physics Labs
- **3D Satellite Constellation (`#/science`):** A custom Three.js WebGL visualization depicting 7 active Earth observation satellites (GPM, SMAP, GRACE-FO, MODIS, Landsat 8/9, Sentinel-1/2, ECOSTRESS) in real-time orbits around Earth, with orbital speed, altitude, inclination, ground swaths, and simulated sensor pulse telemetry.
- **Multispectral Reflectance & NDVI Physics Lab (`#/science#spectral`):** Demonstrates how surface reflectance changes across coastal water, flooded paddy, healthy vegetation, stressed crops, and bare soil. Illustrates why near-infrared (NIR) and red band contrasts yield diagnostic vegetation indices.
- **Multi-Scale Spatial Resolution Visualizer (`#/science#multiscale`):** Interactively compares spatial grid cells across Sentinel-2 (10 m), Landsat/SRTM (30 m), SoilGrids/MODIS (250 m), GPM IMERG (10 km), and NASA POWER (50 km), teaching why datasets must be harmonized without artificial oversampling.

### 4. Harvest Horizon 3D Agro-Sim & WebXR Ecosystem
- **Physics-Driven Agricultural Simulator (`#/farm`):** A full 3D interactive agro-ecosystem built with Three.js. Features 15 diverse farming environments across 9 countries with realistic procedural vegetation (palms, leafy trees, rice paddies, lentils).
- **Biomechanics & Rigged Avatar System:** Features rigged CC0 characters representing rural Bangladeshi farmers and extension workers with procedurally calculated foot placement, IK leg stepping, and authentic farming animations.
- **WebXR Immersive Support:** Supports full virtual reality (VR) and augmented reality (AR) headsets via `renderer.setAnimationLoop`, allowing users to physically step onto a digital twin of an active rotation field.

### 5. Tara and the Dream Fields: Children's STEM & Math Lab
- **Narrative Educational Adventure (`#/kids`):** Designed for young learners (ages 6–12). Follows Tara, a personified NASA satellite, teaching sustainable agriculture through 4 distinct story worlds.
- **Applied Agricultural Mathematics:** Challenges kids with real farm arithmetic: calculating seed volume required per bigha, irrigation volume in litres, fertilizer application rates, and calculating harvest profit and loss.
- **Interactive Science Labs:** Features a dedicated **Biology Lab** (investigating root nodule nitrogen fixation and photosynthesis) and a **Chemistry Lab** (exploring soil pH, N-P-K nutrient balances, and organic matter decay).

### 6. Global Agriculture & Transboundary Expansion
- **Transboundary Support (`#/abroad/:cc`):** Demonstrates global generalizability by applying the identical decision engine to sample farming communities across **India (Punjab), Pakistan (Sindh), Nepal (Kailali), Bhutan (Lobesa), Myanmar (Dry Zone), USA (Iowa), Brazil (Mato Grosso), and Spain (Andalusia)**.
- **Global Soil & Price Baselines:** Ingests country-specific SoilGrids pedometrics, FAOSTAT crop price indices, and localized ERA5/POWER meteorological records.

---

## AI Engineering, Verification & Safety Guardrails

FieldShift 360 utilizes artificial intelligence with strict safety boundaries and deterministic rule verification:

```
[ User Query / Sensor Input ]
              │
              ▼
    [ LLM Proposal Engine ]
   (Gemini Keypool / Claude)
              │
              ▼
   [ Deterministic Rule Engine ] ◄── Verified Database / NASA Satellite Series
   (src/engine/replyCheck.js)
              │
      ┌───────┴───────┐
      ▼               ▼
 [ PASS ]        [ FAIL ]
      │               │
      │         (Re-prompt / Auto-repair)
      ▼               ▼
 [ Deliver Advice to User ]
```

1. **Multi-Tier Gemini API Keypool (`api/_keypool.js`):** Implements an automated circuit breaker and hedging pipeline across multiple Gemini keys and fallback LLMs (Gemini 3.8 Flash, Flash-Lite, Claude Opus, and Meta Llama), ensuring uninterrupted availability.
2. **Deterministic Response Verifier (`src/engine/replyCheck.js`):** Every AI-generated response is parsed and validated against the underlying numerical dataset before being shown to the user. Enforces rules including:
   - `R1_RAIN_OFFSET`: Verifies that precipitation forecasts match NASA POWER / GPM records.
   - `R3_OWN_DOSE`: Confirms that fertilizer amounts do not exceed SRDI agronomic safety thresholds.
   - `R4_CONFIDENCE_CEILING`: Prevents the AI from presenting probabilistic satellite inferences as absolute ground truths.
3. **Chakra Agent Audit Chain (`src/engine/chakra.js`):** Maintains a tamper-evident, SHA-256 hash-chained audit log of all recommended actions, requiring explicit human agricultural officer authorization before issuing community-wide advisories.

---

## Data Integrity & Truthfulness Rules (Real vs. Sample)

In strict accordance with NASA Space Apps evaluation criteria, FieldShift 360 maintains complete honesty regarding data provenance:

| Category | Real Verified Data | Sample / Simulated Data |
| :--- | :--- | :--- |
| **Meteorology & Climate** | NASA POWER 25-year daily records, GPM IMERG daily precipitation, BMD weather station normals (1991–2020), and NEX-GDDP-CMIP6 climate projections. | *None.* All climate series are authentic. |
| **Satellite Observations** | Sentinel-1 SAR transplanting backscatter, Sentinel-2 multispectral MSI passes, MODIS 250 m NDVI time series, and GRACE water storage mascons. | *None.* All remote sensing layers reflect real satellite observations. |
| **Soil Properties** | ISRIC SoilGrids 2.0 pedometric estimates (250 m grid) and national SRDI union fertilizer recommendations. | Individual parcel boundaries and sample farmer soil-test overrides entered for demo purposes. |
| **Market & Economics** | BBS 2023 agricultural census records, national DAM retail/wholesale price notices, and FAOSTAT production statistics. | Real-time farmgate bids (modelled from DAM wholesale trends). |
| **People & Parcels** | Real administrative boundaries (BBS/geoBoundaries) and real physical cropland coordinates. | Farmer names (e.g., Rahim Uddin, Razib Miah), land registry numbers, and individual farmer chat requests are sample demonstrations. |

Every metric in the interface is tagged with a badge:
- `<Tags list={['SAT']} />`: Directly measured by satellite.
- `<Tags list={['STATION']} />`: Measured by physical ground meteorological instrument.
- `<Tags list={['MODEL']} />`: Inferred via scientific/numerical simulation (e.g., SoilGrids, NASA POWER).
- `<Tags list={['RECORD']} />`: Published governmental or statistical record.
- `<Tags list={['RULE']} />`: Deterministic agronomic logic.
- `<Tags list={['AI']} />`: Machine learning inference.
- `<Tags list={['DEMO']} />`: Sample user or parcel persona.

---

## Verification, Test Suites & Benchmarks

FieldShift 360 enforces continuous automated testing across all mathematical models, physical calculations, and user interfaces:

```bash
# 1. Execute the complete Node test suite (1,000 unit & integration tests)
npm test

# 2. Run indigenous language semantic validation checks
npm --prefix services/voice-agent run test:semantic

# 3. Compile the production bundles and verify chunk sizes
npm run build && npm run build:single
```

### Verified Test Results
- **Automated Node Tests (`npm test`):** **1,000 tests passing across 48 test suites (`0` failures, `0` skipped).**
  - Validates ICBM carbon sequestration equations, FAO-56 Penman-Monteith reference evapotranspiration ($ET_0$), Penman water stress coefficients, CMIP6 temperature delta aggregation, DBSCAN cluster bounding, and bilingual SMS segmentation.
- **Voice Semantic Validation:** **14/14 checks passed.**
  - Tests dialectal normalization, phonetic boundary stability, and bilingual intent routing.
- **Production Build Integrity:**
  - Standard Vite build (`dist/`) completes with zero chunk warnings (largest vendor chunk `< 1,100 kB`).
  - Single-file build (`dist-single/index.html`) compiles into a portable, zero-dependency offline bundle.
- **Live Headless Chromium E2E Verification:**
  - Automated Chrome DevTools Protocol testing across desktop (1440px) and mobile (360px) viewports confirms:
    - Zero console errors, runtime exceptions, or WebGL shader compilation issues.
    - Strict English default interface on clean visitor sessions with zero leaked foreign glyphs.
    - Zero horizontal layout overflow across all portals.
    - Verified WebGL canvas initialization on `#/farm` (`501x646`) and `#/science` (`1164x495`).

---

## Quickstart Guide for Judges & Developers

### Prerequisites
- **Node.js:** Version 18.0.0 or higher
- **Browser:** Any modern WebGL-compatible browser (Chrome, Edge, Firefox, Safari)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/razibr246/fieldshift360.git
cd fieldshift360

# 2. Install dependencies
npm install

# 3. Launch Vite development server
npm run dev
# The application will be live at: http://localhost:5173
```

### Production Build & Preview

```bash
# Compile standard production distribution
npm run build
npm run preview
# Serves the compiled static application from dist/

# Compile standalone single-file distribution (offline demonstration)
npm run build:single
# Produces dist-single/index.html containing inlined JS/CSS
```

### Environment Variables (Optional)
The core application runs completely in the browser from committed data files without requiring external API keys. To enable optional live AI features (Chakra Assistant, online Crop Doctor), copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
# Add your GEMINI_API_KEY or ANTHROPIC_API_KEY
```

---

## Development History, Timeline & Disclosures

In accordance with NASA Space Apps Challenge regulations regarding transparency and project eligibility:

1. **Pre-Event Scaffolding:** Work on baseline agricultural planning logic, initial UI wireframes, and raw data pipeline scrapers existed prior to 22 October 2026.
2. **Post-Challenge Evolution (Built for the 2026 Challenge):** Following publication of the 2026 challenge statement, the project was restructured and expanded to include:
   - The 10-year `Field Future` rotational engine with ICBM carbon accounting and IPCC paddy methane ledger.
   - The 40-scenario climate resilience ensemble (8 NEX-GDDP-CMIP6 models × 5 FAOSTAT yield variance years).
   - The 3D NASA Orbit Telemetry Canopy, Multispectral Reflectance Lab, and Spatial Resolution Harmonizer.
   - Full transboundary adaptation covering 8 additional nations with localized soil and agricultural models.
   - Complete international English localization with seamless in-place Bengali switching.
   - The "Tara and the Dream Fields" children's STEM and farm math curriculum.

*Every commit in the repository history is timestamped, documenting the precise development progression.*

---

## Licence & Open Source Attribution

- **Application Code:** Released under the **MIT Licence** ([LICENSE](LICENSE)).
- **Ropon Radar Prototype (`public/radar/`):** Released under the **Apache-2.0 Licence** ([public/radar/LICENSE](public/radar/LICENSE)).
- **NASA Data Products:** Public domain open data courtesy of NASA Earth Science Division, NASA POWER, NASA GIBS, and NASA Earthdata.
- **Copernicus Data:** Modified Copernicus Sentinel data (2025–2026) processed under the Copernicus open access policy.
- **Pedometric Data:** Open data courtesy of ISRIC – World Soil Information (SoilGrids 2.0).

---

<div align="center">
  <sub>Developed for the <strong>NASA International Space Apps Challenge 2026</strong>. Built with precision for the smallholder farmers feeding our world.</sub>
</div>

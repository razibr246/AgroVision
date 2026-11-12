# Foreign farmer and officer feature parity

Bangladesh is the reference workflow. Foreign routes use the same feature where its evidence and local process exist; a missing source is shown as unavailable instead of being filled with a guess. This table is the progress record for the rollout.

| Bangladesh feature | Foreign route | Status | Country data needed |
| --- | --- | --- | --- |
| Farmer home and account | `/abroad/:cc` and `/abroad/:cc/profile` | Existing home; profile to build | Sample farmer, field, language, timezone, saved profile |
| My field, satellite watch and risk map | `/abroad/:cc/field` | Existing field view; risk layers to build | Field polygon/point, Sentinel series, land cover, Landsat/HLS where available |
| Season decision wizard, priorities and alternatives | `/abroad/:cc/plan` | Existing basic plan; parity upgrade to build | Local crop calendar, forecast, crop rules, cost/yield/price evidence, soil and water |
| Field water and live weather | `/abroad/:cc/today` | Existing | Local forecast, ERA5/IMERG normals, FAO-56 crop stage and Kc |
| Crop doctor and spray check | `/abroad/:cc/doctor` | To build | Sourced crop problems, crop list, photo diagnosis endpoint, local label and forecast timezone |
| Harvest timing and sell-or-wait | `/abroad/:cc/harvest` | To build | Crop plan dates, live rain forecast, FAOSTAT price series and local currency |
| Field signals | `/abroad/:cc/signals` | To build | Rain, SMAP, heat, Sentinel/MODIS, GRACE, and soil-model availability |
| My soil test | `/abroad/:cc/soil` | To build | Farmer-entered lab values, unit rules, persistence by country and farm |
| Ten-year rotations, soil time machine and climate stress | `/abroad/:cc/future` | Existing for supported crop systems; animated timeline and parity controls to build | SoilGrids, FAOSTAT yields, CMIP6, crop coefficients; otherwise an explicit unsupported-model note |
| Government support and question box | `/abroad/:cc/support` | Existing | Sourced programme records and country-specific eligibility rules |
| Help requests and messages | `/abroad/:cc/help` | Existing basic board; detail and inbox parity to build | Shared request board, response language, local office and consent |
| Voice assistant | `/abroad/:cc/voice` | To build | Place context, speech availability, checked local-language templates |
| Feature-phone SMS | `/abroad/:cc/sms` | To build | `smsSplit`, verified SMS language templates and local office signature |
| Guided farmer tour | Country farmer pages | To build | Bilingual tour steps linked to country routes |
| Chakra farmer agent | Farmer portal header, all countries | Available with country-scoped field context, checked replies, same-country navigation and local data fallback; no foreign write actions | Place context, sourced crop/problems/support, country language and verified local recommendations |
| Officer overview and area map | `/abroad/:cc/officer` and `/officer/area` | Existing overview/map; area route to build | Administrative boundary, villages, fires, zones, requests and hotspots |
| Officer alerts and approved broadcasts | `/abroad/:cc/officer/alerts` | Existing alerts; approval flow and hotspots to build | Forecast, fires, request clusters, country SMS and approval queue |
| Farmer requests and request detail | `/abroad/:cc/officer/requests/:id` | Existing list; detail route to build | Farmer evidence, request status, proposed reply and approval record |
| Call notes with consent and seal | `/abroad/:cc/officer/calls` | To build | Consent state, recording/transcription language, call-note validator and digest |
| Planting radar/onset | `/abroad/:cc/officer/radar` | To build | IMERG/ERA5 onset for monsoon crops, Sentinel-1 only when built, or a sourced non-monsoon signal |
| Planting calendar and area supply | `/abroad/:cc/officer/planting` and `/officer/supply` | Existing calendar; supply route to build | Crop area, crop plan dates, yields and clearly labelled area assumptions |
| Officer voice assistant | `/abroad/:cc/officer/voice` | To build | Place context and checked office-language templates |
| Chakra officer agent | Officer portal header, all countries | Available with country-scoped field and request context, checked replies, same-country navigation and local data fallback; no agent sends | Sourced hotspot evidence, country call-note flow and explicit approval UI for any agent-drafted office message |

## Country evidence coverage

| Country | Farm/weather and satellite data | Soil, water, yield, price | Crop/problem library | Local office, support and language |
| --- | --- | --- | --- | --- |
| India | `src/data/abroad/india.json` | SoilGrids, FAOSTAT, shared NASA water/land; foreign prices where present | Punjab rice–wheat; sourced additions needed | Punjab block agriculture office; Hindi/English records |
| Pakistan | `src/data/abroad/pakistan.json` | SoilGrids, FAOSTAT, shared NASA water/land; foreign prices where present | Sindh rice–wheat; sourced additions needed | Sindh agriculture office; Urdu/English records |
| Nepal | `src/data/abroad/nepal.json` | SoilGrids, FAOSTAT, shared NASA water/land; foreign prices where present | Terai rice–lentil/wheat; sourced additions needed | Local agriculture office; Nepali/English records |
| Bhutan | `src/data/abroad/bhutan.json` | SoilGrids, FAOSTAT, shared NASA water/land; foreign prices where present | Punakha red rice; sourced additions needed | Dzongkhag/gewog office; Dzongkha templates remain labelled draft |
| Myanmar | `src/data/abroad/myanmar.json` | SoilGrids, FAOSTAT, shared NASA water/land; foreign prices where present | Dry Zone sesame–chickpea; sourced additions needed | MADB/extension records; Burmese templates remain labelled draft |
| USA | `src/data/abroad/usa.json` | SoilGrids, FAOSTAT, shared NASA water/land | Nevada alfalfa; local problems to source | County extension; English |
| Brazil | `src/data/abroad/brazil.json` | SoilGrids/FAOSTAT only where generated; NASA land/water/CMIP6 | Sorriso soybean and second-crop maize; sourced additions needed | EMPAER-MT; Portuguese templates are not enabled |
| Spain | `src/data/abroad/spain.json` | SoilGrids/FAOSTAT only where generated; NASA land/water/CMIP6 | Martos olives; sourced additions needed | OCA Jaén; Spanish templates are not enabled |

The common place adapter is `src/engine/place.js`. The ten-year rotation page includes a slider and play/pause field illustration. Its organic-matter path interpolates between present and ten-year model outputs and is labelled as illustrative, not an annual forecast. Keep feature calculations in pure engine functions and attach source and limitation labels at the route that displays them.

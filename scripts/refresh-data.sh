#!/usr/bin/env bash
# Refresh every dataset whose source keeps publishing, rebuild what depends on it, and retrain the models.
# Used by the daily GitHub Action (.github/workflows/refresh-data.yml) and by hand:
#   bash scripts/refresh-data.sh          # daily set (about 15 minutes)
#   bash scripts/refresh-data.sh full     # also the long MODIS per-field and South Asia trend pulls (about 1 hour)
# Fixed releases (SoilGrids, SRTM, CMIP6, historical Landsat, boundaries) are not refetched: their sources do not change.
# Each step's log is in .cache/refresh/<step>.log and one line per step in .cache/refresh/status.log; a failed step
# is reported and the rest still run, so one source being down does not stop the others. Exit code 1 if any failed.
set -u
cd "$(dirname "$0")/.."
# Local keys (NASA_API_KEY, EARTHDATA_TOKEN ...) from .env.local, so every step gets them; in CI they come from secrets.
if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi
LOG=.cache/refresh; mkdir -p "$LOG"; : > "$LOG/status.log"
PY=${PYTHON:-python3}
failed=0
step() {
  local name=$1; shift; local t0=$SECONDS
  if "$@" > "$LOG/$name.log" 2>&1; then echo "ok   $name $((SECONDS - t0))s" | tee -a "$LOG/status.log"
  else echo "FAIL $name $((SECONDS - t0))s (see $LOG/$name.log)" | tee -a "$LOG/status.log"; failed=1; fi
}

# NASA POWER climate for every upazila, at the point recorded in its own file.
for f in src/data/climate/climate_*.json; do
  u=$(basename "$f" .json); u=${u#climate_}
  read -r lat lon < <(node -e "const p=require('./$f').provenance;console.log(p.lat,p.lon)")
  step "power-$u" node scripts/fetch/power.mjs --upazila "$u" --lat "$lat" --lon "$lon"
done
step wetness   node scripts/fetch/soil-wetness.mjs
step stories   node scripts/fetch/stories.mjs
step land      node scripts/fetch/gibs-land.mjs
step water     node scripts/fetch/gibs-water.mjs
step prices    "$PY" scripts/build/build_market_prices.py
step seasons   "$PY" scripts/build/build_price_seasons.py
step fields    "$PY" scripts/build/build_field_watch.py
step aman      bash -c 'node scripts/build/build_aman_radar.mjs && node scripts/build/build_aman_hazards.mjs'
step onset     node scripts/onset/onset.mjs godagari dhamrai sitakunda dacope bakerganj gangachara gowainghat
step onset-bmd node scripts/onset/compare_bmd.mjs
step events    node scripts/build/check_events.mjs
if [ -n "${EARTHDATA_TOKEN:-}" ]; then step giovanni node scripts/fetch/giovanni.mjs; fi
if [ "${1:-}" = full ]; then
  step fields-ndvi  node scripts/fetch/modis-fields.mjs
  step trend-fields node scripts/fetch/trend-fields.mjs
fi
step harvest      "$PY" scripts/build/build_harvest_records.py
step train-stress node scripts/build/train_stress_model.mjs
step train-harvest node scripts/build/train_harvest_model.mjs
step train-chakra node scripts/build/train_chakra_brain.mjs
step sync-voice   node scripts/sync-voice.mjs
exit $failed

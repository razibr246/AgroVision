#!/usr/bin/env node
// The three pictures of the whole Earth behind the Science page's satellite simulator globe, from NASA GIBS (no login),
// each one global equirectangular image (EPSG:4326, -180..180° lon, -90..90° lat):
//   day     BlueMarble_NextGeneration: NASA's cloud-free Blue Marble land and sea colour
//   night   VIIRS_Black_Marble: city lights seen by Suomi NPP VIIRS (2016)
//   clouds  VIIRS_NOAA20_CorrectedReflectance_TrueColor for one real day (two days ago by default, so the mosaic is
//           complete); the globe's shader keeps only its white cloud pixels as the cloud layer
// Writes public/textures/earth/{day,night,clouds}.jpg and meta.json (the cloud day and layer ids).
// Usage: npm run fetch:earth [-- YYYY-MM-DD]
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'public', 'textures', 'earth');
const WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const day = process.argv[2] || new Date(Date.now() - 2 * 86400e3).toISOString().slice(0, 10);

const IMAGES = {
  day: { layer: 'BlueMarble_NextGeneration', width: 4096 },
  night: { layer: 'VIIRS_Black_Marble', width: 4096 },
  clouds: { layer: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', width: 2048, time: day },
};

async function getGlobal({ layer, width, time }) {
  const q = new URLSearchParams({
    SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0', CRS: 'EPSG:4326', BBOX: '-90,-180,90,180',
    WIDTH: String(width), HEIGHT: String(width / 2), STYLES: '', FORMAT: 'image/jpeg', LAYERS: layer,
  });
  if (time) q.set('TIME', time);
  const res = await fetch(`${WMS}?${q}`);
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image/')) throw new Error(`${layer}: HTTP ${res.status} ${type} ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

await mkdir(OUT, { recursive: true });
for (const [name, spec] of Object.entries(IMAGES)) {
  const buf = await getGlobal(spec);
  await writeFile(path.join(OUT, `${name}.jpg`), buf);
  console.log(`${name}.jpg  ${spec.layer}${spec.time ? ` ${spec.time}` : ''}  ${Math.round(buf.length / 1024)} KB`);
}
const meta = {
  source: 'NASA GIBS WMS (https://nasa-gibs.github.io/gibs-api-docs/)',
  fetched: new Date().toISOString().slice(0, 10),
  cloudsDate: day,
  layers: Object.fromEntries(Object.entries(IMAGES).map(([k, v]) => [k, v.layer])),
};
await writeFile(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log('meta.json', meta.cloudsDate);

// Shared view of a farm and its local office. The adapter keeps UI features from
// reaching into Bangladesh-only store shapes directly.
const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

export function placeFromBangladesh(parts = {}) {
  const { farmer = {}, field = {}, upazila = {}, soil = null, water = null, weather = null, climate = null,
    landSat = null, forecast = null, programmes = [], crops = [], tz = 'Asia/Dhaka' } = parts;
  const center = upazila.center ?? field.center ?? {};
  return {
    id: farmer.id ?? field.id ?? upazila.id ?? 'bangladesh', country: 'BD', kind: 'bd',
    name: upazila.name ?? farmer.upazila ?? null, farmer,
    field: {
      id: field.id ?? farmer.id ?? null, lat: finite(field.lat ?? center.lat ?? center[0]),
      lon: finite(field.lon ?? center.lon ?? center[1]), area: finite(field.area_dec ?? field.area ?? farmer.area_dec),
      unit: field.unit ?? parts.unit ?? { bn: 'একর', en: 'acre' },
    },
    tz, crops, climate: { normals: climate?.normals ?? upazila.normals ?? null, recent: climate?.recent ?? weather ?? null, events: climate?.events ?? [] },
    soil, water, satellite: { series: field.series ?? [], land: landSat },
    forecast: forecast ?? (weather ? { source: weather.live === false ? 'cached' : 'live', value: weather } : null),
    office: { role: 'officer', area: upazila.name ?? null, signature: upazila.officer ?? null, sms: 'en' },
    programmes, currency: 'BDT', units: { area: field.unit ?? parts.unit ?? { bn: 'একর', en: 'acre' } },
    sources: { climate: climate?.source ?? 'NASA POWER', soil: soil?.source ?? 'SoilGrids' },
  };
}

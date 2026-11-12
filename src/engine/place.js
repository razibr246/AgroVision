// Shared view of a farm and its local office. Adapters keep UI features from
// reaching into Bangladesh-only store shapes or foreign-country JSON directly.
const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const pointOf = (data, country) => data?.points?.farm ?? data?.points?.[country?.id] ?? {};

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

export function placeFromAbroad(country = {}, data = {}, options = {}) {
  const farm = pointOf(data, country);
  const field = data.field ?? {};
  const area = data.area ?? {};
  const soil = data.soil ?? null;
  const water = options.water ?? data.water ?? null;
  const source = data.provenance ?? {};
  const cropNames = options.crops ?? country.crops ?? [];
  return {
    id: country.id ?? field.id ?? 'abroad', country: country.id ?? 'abroad', kind: 'abroad',
    name: country.name ?? null, farmer: country.farmer ?? null,
    field: {
      id: field.id ?? null, lat: finite(farm.lat ?? field.lat), lon: finite(farm.lon ?? field.lon),
      area: finite(field.area_dec ?? country.farmer?.farmDec), unit: country.unit ?? null,
    },
    tz: source.tz ?? country.tz ?? 'UTC', crops: cropNames,
    climate: { normals: farm.normals ?? null, recent: { rain30: farm.rain30 ?? null }, events: data.events ?? [] },
    soil, water,
    satellite: { series: field.series ?? [], land: options.landSat ?? null },
    forecast: options.forecast ?? null,
    office: { role: country.local?.role ?? null, area: country.local?.area ?? area.name ?? null, signature: country.local?.office ?? null, sms: country.local?.sms ?? 'en' },
    programmes: options.programmes ?? country.programmes ?? [], requests: options.requests ?? [], currency: country.currency ?? null,
    units: { area: country.unit ?? null, volume: country.volumeUnit ?? null },
    sources: { climate: source.climate ?? 'ERA5 and IMERG', soil: soil?.source ?? 'ISRIC SoilGrids', field: field.source ?? 'Sentinel-2' },
  };
}

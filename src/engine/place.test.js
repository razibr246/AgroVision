import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { placeFromAbroad, placeFromBangladesh } from './place.js';

const brazil = JSON.parse(readFileSync(new URL('../data/abroad/brazil.json', import.meta.url)));
const spain = JSON.parse(readFileSync(new URL('../data/abroad/spain.json', import.meta.url)));

test('Bangladesh adapter preserves the selected field, units and office context', () => {
  const raw = { farmer: { id: 'f1', area_dec: 45 }, field: { id: 'f1', lat: 24.4, lon: 88.3, area_dec: 45 },
    upazila: { id: 'godagari', name: { bn: 'গোদাগাড়ী', en: 'Godagari' }, center: [24.4667, 88.3306], officer: { en: 'Officer' } },
    soil: { ph: 6.2, tested: true }, water: { mm: 8 }, weather: { rain30: 43 }, crops: ['rice'] };
  const place = placeFromBangladesh(raw);
  assert.equal(place.kind, 'bd');
  assert.equal(place.field.area, raw.field.area_dec);
  assert.deepEqual([place.field.lat, place.field.lon], [raw.field.lat, raw.field.lon]);
  assert.equal(place.soil, raw.soil);
  assert.equal(place.water, raw.water);
  assert.equal(place.office.signature, raw.upazila.officer);
  assert.equal(place.office.sms, 'en');
  assert.deepEqual(place.crops, ['rice']);
});

test('foreign adapter maps each country field and evidence into the common place shape', () => {
  for (const [id, data] of [['brazil', brazil], ['spain', spain]]) {
    const country = { id, name: { en: id }, farmer: { id: `${id}-farmer`, farmDec: 10 }, unit: { en: 'hectare' }, local: { role: { en: 'extension officer' }, area: { en: data.area.name }, sms: 'en' } };
    const place = placeFromAbroad(country, data);
    assert.equal(place.kind, 'abroad');
    assert.equal(place.country, id);
    assert.equal(place.field.id, data.field.id);
    assert.equal(place.field.lat, data.points.farm.lat);
    assert.equal(place.field.lon, data.points.farm.lon);
    assert.equal(place.tz, data.provenance.tz);
    assert.equal(place.satellite.series.length, data.field.series.length);
    assert.equal(place.office.area.en, data.area.name);
  }
});

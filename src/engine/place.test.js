import test from 'node:test';
import assert from 'node:assert/strict';
import { placeFromBangladesh } from './place.js';


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

import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentsByLanguage, sentenceLang } from './langseg.js';

test('a Bangla reply with an English name in it stays one Bangla part', () => {
  assert.deepEqual(segmentsByLanguage('ফোনে FieldShift 360 খোলো। Landsat দিয়ে মাঠ দেখি।').map((s) => s.lang), ['bn']);
});

test('a mixed reply is cut into Bangla and English parts in order', () => {
  const s = segmentsByLanguage('আজ সেচ দেবেন না, বৃষ্টি আসছে। In English: please do not water today, rain is coming. ধন্যবাদ।');
  assert.deepEqual(s.map((x) => x.lang), ['bn', 'en', 'bn']);
  assert.match(s[1].text, /^In English/);
});

test('plain English is English; numbers alone follow the language around them', () => {
  assert.equal(sentenceLang('Water the field this evening.'), 'en');
  assert.equal(sentenceLang('৪২°', 'en'), 'en');
  assert.equal(sentenceLang('42°'), 'en');
  assert.equal(sentenceLang('42°', 'bn'), 'bn');
  assert.deepEqual(segmentsByLanguage('').length, 0);
});

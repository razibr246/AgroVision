import test from 'node:test';
import assert from 'node:assert/strict';
import { queryChakraLLM, detectIntent, resolveParcel, extractAreaMultiplier, searchRAG } from './chakraLLM.js';
import { checkReply } from './replyCheck.js';

test('detectIntent identifies all agronomic and land intents', () => {
  assert.equal(detectIntent('আমার জমির দাগ নম্বর কত?'), 'parcel_info');
  assert.equal(detectIntent('ইউরিয়া কয় কেজি দিমু?'), 'fertilizer_dose');
  assert.equal(detectIntent('মাটির পিএইচ কত?'), 'soil_chemistry');
  assert.equal(detectIntent('স্যাটেলাইট থেকে আমার জমি কেমন দেখাচ্ছে?'), 'satellite_ndvi');
  assert.equal(detectIntent('জমিতে কতটুকু কার্বন জমা হবে?'), 'carbon_climate');
  assert.equal(detectIntent('আজকে জমিতে সেচ দেওয়া লাগবে?'), 'water_irrigation');
  assert.equal(detectIntent('গাছে পোকা ধরছে কী করব?'), 'pest_disease');
  assert.equal(detectIntent('সরকারি সার বা প্রণোদনা কার্ড কীভাবে পাব?'), 'support_scheme');
});

test('resolveParcel matches parcel ID or farmer context correctly', () => {
  const p1 = resolveParcel('DHM-CH-0142 জমিতে সার কত দেব?');
  assert.equal(p1.id, 'DHM-CH-0142');
  assert.equal(p1.owner, 'RAZIB');

  const p2 = resolveParcel('পূর্বপাড়ার জমি কেমন আছে?', { farmer: { id: 'RAHIM' } });
  assert.ok(p2.id.startsWith('GDG'));

  const p3 = resolveParcel('আমার জমির সাইজ কত?', { farmer: { id: 'RAZIB' } });
  assert.equal(p3.id, 'DHM-CH-0142');
});

test('extractAreaMultiplier scales custom bighas and decimals', () => {
  const p = { areaBigha: 2, areaDec: 66 };
  const m1 = extractAreaMultiplier('আমার ৫ বিঘা জমিতে ইউরিয়া কত কেজি দেব?', p);
  assert.equal(m1.bighas, 5);
  assert.equal(m1.decimals, 165);
  assert.equal(m1.custom, true);

  const m2 = extractAreaMultiplier('১০০ শতক জমিতে সার লাগবে?', p);
  assert.equal(m2.decimals, 100);
  assert.equal(m2.custom, true);

  const m3 = extractAreaMultiplier('সার কতটুকু দেব?', p);
  assert.equal(m3.bighas, 2);
  assert.equal(m3.decimals, 66);
  assert.equal(m3.custom, false);
});

test('queryChakraLLM returns grounded parcel information in Bangla and English', () => {
  const rBn = queryChakraLLM('আমার জমির দাগ নম্বর এবং সাইজ কত?', {
    role: 'farmer',
    lang: 'bn',
    farmer: { id: 'RAHIM' },
  });
  assert.ok(rBn);
  assert.equal(rBn.intent, 'parcel_info');
  assert.ok(rBn.reply.includes('দাগ নম্বর'));
  assert.ok(rBn.reply.includes('শতক'));
  assert.ok(rBn.tags.includes('RECORD'));

  const rEn = queryChakraLLM('What is my parcel ID and area?', {
    role: 'farmer',
    lang: 'en',
    farmer: { id: 'RAHIM' },
  });
  assert.ok(rEn);
  assert.ok(rEn.reply.includes('registered parcel ID'));
  assert.ok(rEn.reply.includes('decimals'));
});

test('queryChakraLLM calculates SRDI fertilizer dosage with area scaling', () => {
  const r = queryChakraLLM('বোরো ধানে ইউরিয়া ও টিএসপি কত কেজি দেব?', {
    role: 'farmer',
    lang: 'bn',
    farmer: { id: 'RAHIM' },
  });
  assert.ok(r);
  assert.equal(r.intent, 'fertilizer_dose');
  assert.ok(r.reply.includes('মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট'));
  assert.ok(r.reply.includes('কেজি'));
  assert.ok(r.reply.includes('ইউরিয়া'));
});

test('queryChakraLLM provides Copernicus Sentinel-2 satellite vegetation metrics', () => {
  const r = queryChakraLLM('স্যাটেলাইট থেকে আমার ফসলের অবস্থা কেমন?', {
    role: 'farmer',
    lang: 'bn',
    farmer: { id: 'RAHIM' },
  });
  assert.ok(r);
  assert.equal(r.intent, 'satellite_ndvi');
  assert.ok(r.reply.includes('কোপার্নিকাস সেন্টিনেল-২'));
  assert.ok(r.reply.includes('এনডিভিআই'));
  assert.ok(r.tags.includes('SAT'));
});

test('queryChakraLLM provides ICBM soil carbon & diesel savings metrics', () => {
  const r = queryChakraLLM('আমার জমিতে কার্বন কতটুকু জমা হবে এবং ডিজেল কত সাশ্রয় হবে?', {
    role: 'farmer',
    lang: 'bn',
    farmer: { id: 'RAHIM' },
  });
  assert.ok(r);
  assert.equal(r.intent, 'carbon_climate');
  assert.ok(r.reply.includes('আইসিবিএম'));
  assert.ok(r.reply.includes('কার্বন'));
  assert.ok(r.reply.includes('ডিজেল'));
});

test('queryChakraLLM answers pass strict agronomic safety verification', () => {
  const r = queryChakraLLM('আজ জমিতে সেচ দেব কি?', {
    role: 'farmer',
    lang: 'bn',
    farmer: { id: 'RAHIM' },
    weather: { rainNext3: 8 }, // 8 mm rain forecast
    water: { color: 'YELLOW' },
  });
  assert.ok(r);
  // Verify with replyCheck that it holds off irrigation when rain is coming
  const check = checkReply({
    reply: r.reply,
    role: 'farmer',
    data: { today: { weather: { rainNext3: 8 }, water: { color: 'YELLOW' } } },
  });
  assert.equal(check.ok, true, JSON.stringify(check.problems));
});

test('searchRAG retrieves relevant chunks across 64 districts, climate change, and support', () => {
  const distHits = searchRAG('বাগেরহাট জেলায় আমন ধান কত হেক্টর?', { boostType: 'district', topK: 1 });
  assert.ok(distHits.length > 0);
  assert.equal(distHits[0].type, 'district');
  assert.ok(distHits[0].bn.includes('বাগেরহাট'));
  assert.ok(distHits[0].bn.includes('হেক্টর'));

  const cmipHits = searchRAG('CMIP6 ২০৪০ সালের জলবায়ু পরিবর্তন তাপমাত্রা বৃদ্ধি', { boostType: 'climate_change', topK: 1 });
  assert.ok(cmipHits.length > 0);
  assert.equal(cmipHits[0].type, 'climate_change');
  assert.ok(cmipHits[0].bn.includes('সিএমআইপি৬'));

  const hazHits = searchRAG('কেরানীগঞ্জ খরা ও চরম বৃষ্টিপাত', { boostType: 'hazard', topK: 1 });
  assert.ok(hazHits.length > 0);
  assert.equal(hazHits[0].type, 'hazard');
  assert.ok(hazHits[0].bn.includes('নাসা পাওয়ার'));
});

test('queryChakraLLM provides BBS rice census statistics for 64 districts', () => {
  const r = queryChakraLLM('বাগেরহাটে কত হেক্টর আমন ও বোরো চাষ হয়?', {
    role: 'officer',
    lang: 'bn',
  });
  assert.ok(r);
  assert.equal(r.intent, 'district_stats');
  assert.ok(r.reply.includes('বাগেরহাট'));
  assert.ok(r.reply.includes('হেক্টর'));
  assert.ok(r.tags.includes('RECORD'));
  assert.equal(r.nav, '/officer/supply');
});

test('queryChakraLLM provides NASA CMIP6 2040s climate change projections', () => {
  const r = queryChakraLLM('২০৪০ সালে জলবায়ু পরিবর্তনের ফলে তাপমাত্রা কত বৃদ্ধি পাবে?', {
    role: 'farmer',
    lang: 'bn',
  });
  assert.ok(r);
  assert.equal(r.intent, 'climate_change');
  assert.ok(r.reply.includes('সিএমআইপি৬'));
  assert.ok(r.reply.includes('১.৪°C'));
  assert.ok(r.tags.includes('MODEL'));
  assert.equal(r.nav, '/farmer/signals');
});

test('queryChakraLLM provides NASA 25-year SPI drought & extreme rainfall hazards', () => {
  const r = queryChakraLLM('গোয়াইনঘাটে ২৫ বছরের খরা ও বন্যার ইতিহাস কেমন?', {
    role: 'officer',
    lang: 'bn',
    parcel: { upazila: 'gowainghat' },
  });
  assert.ok(r);
  assert.equal(r.intent, 'hazards_spi');
  assert.ok(r.reply.includes('নাসা পাওয়ার'));
  assert.ok(r.reply.includes('এসপিআই'));
  assert.ok(r.tags.includes('SAT'));
});

test('queryChakraLLM fallback RAG answers support and agronomic questions accurately', () => {
  // Query without explicit intent keyword triggers BM25 semantic RAG fallback
  // (the old query here was answered by a neighbouring-country chunk, removed with that section)
  const r = queryChakraLLM('খারাপ আবহাওয়ায় ফসল নষ্ট হলে বিমা পাওয়া যায়?', {
    role: 'farmer',
    lang: 'bn',
  });
  assert.ok(r);
  assert.ok(r.intent.startsWith('rag_'));
  assert.ok(r.reply.includes('আবহাওয়া'));
  assert.ok(r.reply.includes('শস্যবিমা'), 'the weather-index crop insurance programme');
  assert.ok(r.tags.includes('RECORD'));
});

test('every English RAG & ChakraLLM answer stays free of Bangla leaks and undefined tokens', async () => {
  const { readFileSync } = await import('node:fs');
  const kb = JSON.parse(readFileSync(new URL('../data/models/chakra_knowledge_base.json', import.meta.url), 'utf8'));
  for (const chunk of kb.rag.chunks) {
    assert.ok(!/[\u0980-\u09ff]/.test(chunk.en), `Bangla leaked into chunk.en (${chunk.id}): ${chunk.en}`);
    assert.ok(!/\bundefined\b/.test(chunk.en) && !/\bundefined\b/.test(chunk.bn), `undefined token in ${chunk.id}`);
  }
  const enCrop = queryChakraLLM('Mustard sowing window and expected yield per bigha', { role: 'farmer', lang: 'en' });
  assert.ok(!/[\u0980-\u09ff]/.test(enCrop.reply), `Bangla leaked into English crop RAG: ${enCrop.reply}`);
  const enHaz = queryChakraLLM('25 year SPI drought history in Gowainghat', { role: 'officer', lang: 'en', parcel: { upazila: 'gowainghat' } });
  assert.ok(enHaz.reply.includes('Gowainghat'));
  assert.ok(!/GODAGARI|KERANIGANJ|[\u0980-\u09ff]/.test(enHaz.reply));
});

// "মাঠের মানুষ" — the game's shared settings: the day, the field, the season's missions and the satellite layers.
// The seven sample farmers, one per division of Bangladesh, are in regions_bd.js. Their fictional stories draw on
// regional references; they do not depict specific real people or farms. Everything is plain data, read by the
// simulation (sim.js) and the 3D world (three/*.js).

// Seconds of play per in-game day: 8 minutes (6 of daylight, 2 of night), near the 10-20 minute days of farming and
// survival games, so a season of about 10 minutes sees an evening or two rather than a flicker of days.
export const DAY = 480;

// The field: 6 × 3 plots around the origin; x runs east, z south (metres).
export const PLOT = 3.4, GAP = 0.6, FCOLS = 6, FROWS = 3;
export const FIELD_W = FCOLS * PLOT + (FCOLS - 1) * GAP, FIELD_D = FROWS * PLOT + (FROWS - 1) * GAP;

// Where things stand. The same spots in every world, so the routes are learnt once; what stands there differs.
export const SPOTS = {
  start: [-13, -9],
  shed: { x: -20, z: -1, r: 2.6 },
  water: { x: 18, z: -5, r: 2.6 },
  market: { x: -17, z: 15, r: 3 },
  kiosk: { x: 15, z: 13, r: 2.4 },
  safe: { x: 3, z: -29, r: 6.5 },
  house: { x: -21, z: -15 },
};
export const WORLD_R = 80; // the farmer can walk this far from the middle (the farm lies within about 44)

import { REGIONS_BD } from './regions_bd.js';

// Bangladesh's seven division farmers (regions_bd.js), one per division.
export const REGIONS = { ...REGIONS_BD };
export const FARMER_IDS = Object.keys(REGIONS);
export const BD_IDS = Object.keys(REGIONS_BD);

// The season, in order. A step with `quiz` asks that region's question first (if it has one).
// The season's missions are learning scenarios. `need` counts player actions (sim.js g.count); `problem` describes a
// real farming challenge and `how` explains the relevant Agros data or game mechanic. The satellite-style map itself
// is simulated; real local records are shown in the Agros kiosk.
const m = (bn, en) => ({ bn, en });
export const QUESTS = [
  { id: 'scan', need: { satViews: 1 }, go: 'field', bn: 'উপগ্রহের চোখে মাঠ দেখুন', en: 'See your field through the satellite’s eyes',
    problem: m('কোন জমি খালি, কোনটা চাপে আছে, চোখে বোঝা যায় না।', 'By eye you cannot tell which plots are bare or under stress.'),
    how: m('খেলার মানচিত্রে রং সিমুলেটেড, বাস্তব উপগ্রহ মাপ নয়। আসল Landsat/MODIS রেকর্ড দেখতে Agros কিয়স্ক খুলুন।', 'Map colours are simulated, not satellite measurements. Open the Agros kiosk for real Landsat/MODIS records.') },
  { id: 'buy', need: { advised: 1, bought: 3 }, go: 'kiosk', bn: 'Agros দেখে ঠিক বীজ কিনুন (৩টি)', en: 'Check Agros, then buy the right seeds (3)',
    problem: m('অভ্যাসে প্রতি বছর একই ফসল: মাটি ক্লান্ত হয়, পানি বেশি লাগে।', 'Habit grows the same crop every year: the soil tires and it needs more water.'),
    how: m('কিয়স্কের "ফসলচক্র": নাসার ২৫ মৌসুমের আবহাওয়ায় প্রতিটি পথের পানি, আয় আর মাটির হিসাব। তারপর দোকানে বীজ।', 'The kiosk’s Rotations: each option’s water, income and soil on 25 seasons of NASA weather. Then buy seed at the shop.') },
  { id: 'plant', quiz: 'plant', need: { planted: 3 }, go: 'field', bn: 'খালি জমি ঢাকুন: ৩টি জমিতে বুনুন', en: 'Cover the bare soil: sow 3 plots',
    problem: m('খালি জমির ওপরের উর্বর মাটি বৃষ্টি আর ঝড়ে ধুয়ে যায়।', 'Bare soil loses its rich top layer to rain and storms.'),
    how: m('আসল MODIS NDVI এলাকার সবুজের পরিবর্তন দেখায়; এই খেলার জমির রং সিমুলেটেড। বাস্তব রেকর্ড কিয়স্কে দেখুন।', 'Real MODIS NDVI tracks vegetation over an area; this game field’s colours are simulated. See the kiosk for real records.') },
  { id: 'water', quiz: 'water', need: { waterLayer: 1, watered: 3 }, go: 'field', bn: 'পানির চাপ খুঁজে ৩টি চারায় পানি দিন', en: 'Find the water stress, then water 3 seedlings',
    problem: m('পানি কম, পাম্পের খরচ বেশি: সব জমিতে নয়, যেখানে দরকার সেখানেই পানি।', 'Water is short and pumping is costly: water where it is needed, not everywhere.'),
    how: m('খেলার "পানির চাপ" স্তর সিমুলেটেড। আসল এলাকার SMAP মাটির আর্দ্রতার রেকর্ড Agros কিয়স্কে দেখুন।', 'The game’s Water stress layer is simulated. See the Agros kiosk for real local SMAP soil-moisture records.') },
  { id: 'harvest', need: { harvested: 3, rotated: 1 }, go: 'field', bn: 'ফসল তুলে সেই জমিতে অন্য ফসল বুনুন', en: 'Harvest 3, then sow a different crop where one grew',
    problem: m('একই জমিতে একই ফসল বারবার: সেই ফসলের রোগ-পোকা জমে থাকে, মাটির খাদ্য ফুরায়।', 'The same crop on the same plot again and again: its pests wait in the soil and its food runs out.'),
    how: m('খেলার "মাটির স্বাস্থ্য" স্তর ফসলচক্রে বদলায়; এটি মাপা মাটির তথ্য নয়। আসল SoilGrids তথ্য কিয়স্কে দেখুন।', 'The game’s Soil health layer changes with crop rotation; it is not measured soil data. See the kiosk for real SoilGrids records.') },
  { id: 'sell', need: { sold: 1 }, go: 'market', bn: 'হাটে ফসল বিক্রি করুন', en: 'Sell your harvest at the market',
    problem: m('ফসল ঘরে পড়ে থাকলে নষ্ট হয়, টাকা আটকে থাকে।', 'A harvest left at home spoils and ties up the money.'),
    how: m('Agros কিয়স্কে আজকের বাজারদর দেখে বেচুন।', 'Check today’s prices at the Agros kiosk before you sell.') },
  { id: 'office', need: { officeVisits: 1, soilTests: 1 }, go: 'office', bn: 'কৃষি অফিসে গিয়ে মাটি পরীক্ষা করান', en: 'Visit the agriculture office and get your soil tested',
    problem: m('কোন জমিতে কী সার লাগবে, কোন সরকারি সাহায্য পাওয়া যায়, অনেকেই জানেন না; আন্দাজে সার দিলে টাকা যায়, মাটিও নষ্ট হয়।', 'Many farmers don’t know which plot needs what, or which government help they can get; fertiliser by guesswork wastes money and harms the soil.'),
    how: m('কৃষি কর্মকর্তা বিনা মূল্যে মাটি পরীক্ষা করেন, মাঠের সমস্যার পরামর্শ দেন, আর দেশের আসল সহায়তা কর্মসূচি (উৎসসহ) দেখান।', 'The agriculture officer tests the soil for free, advises on the field’s problems, and shows the country’s real support programmes, with sources.') },
  { id: 'heat', quiz: 'heat', event: 'heat', go: 'field', bn: 'তাপপ্রবাহ পার করুন: চারা বাঁচিয়ে রাখুন', en: 'Get through the heatwave: keep the seedlings alive',
    problem: m('তাপমাত্রা বাড়ছে; গরমে মাটি দ্রুত শুকায়, ফুল আসা ফসল পুড়ে যায়।', 'Temperatures are rising; heat dries the soil fast and burns a flowering crop.'),
    how: m('কিয়স্কে আসল MODIS তাপের রেকর্ডে গরম মাস দেখুন। খেলার তাপ-সতর্কতা সিমুলেটেড; এটি দেখে সেচের অনুশীলন করুন।', 'The kiosk’s real MODIS heat record shows the hottest months. The game heat warning is simulated; use it to practise irrigation.') },
  { id: 'pests', quiz: 'pests', event: 'pests', go: 'field', bn: 'আক্রান্ত সব জমি সারিয়ে তুলুন', en: 'Deal with every affected plot',
    problem: m('পোকা আগে আসে যে জমিতে একই ফসল আবার বোনা হয়েছে।', 'Pests strike first where the same crop was sown again.'),
    how: m('সিমুলেটেড ফসল-স্বাস্থ্য স্তরে হলুদ-লাল জমি খুঁজুন; একই ফসল বারবার বুনলে খেলায় পোকার ঝুঁকি বাড়ে।', 'Find yellow and red plots on the simulated Crop health layer; repeating a crop raises pest risk in the game.') },
  { id: 'storm', quiz: 'storm', event: 'storm', go: 'safe', bn: 'পাকা ফসল তুলে নিরাপদ জায়গায় পৌঁছান', en: 'Bring in the ripe crop and reach safety',
    problem: m('বৃষ্টি অনিশ্চিত, চরম আবহাওয়া বাড়ছে: মাঠের পাকা ফসল আর খালি জমির মাটি দুটোই যায়।', 'Rain is less predictable and extremes are rising: ripe crop and bare soil are both lost.'),
    how: m('GPM IMERG-এর বৃষ্টি আর Agros-এর আগাম সতর্কতা: সময় থাকতে ফসল তুলুন, জমি ঢেকে রাখুন।', 'GPM IMERG rain and Agros’s early warning: harvest in time and keep the soil covered.') },
  { id: 'profit', quiz: 'profit', need: { earned: 1000 }, event: 'glut', go: 'market', bn: 'মৌসুমে মোট {cur}১,০০০ বিক্রি করুন', en: 'Sell {cur}1,000 in total this season',
    problem: m('সবাই একই ফসল একসঙ্গে বেচলে দাম পড়ে যায়।', 'When everyone sells the same crop at once, the price falls.'),
    how: m('Agros-এর ফসলচক্র: আলাদা ফসল, আলাদা সময়ে তুললে দাম বাঁচে।', 'Agros’s rotations: different crops, harvested at different times, keep the price.') },
];


// Each mission step as the player reads it on the mission card, beside a tick when it is done.
export const STEP_LABEL = {
  satViews: m('উপগ্রহ দৃশ্য খুলুন', 'Open the satellite view'), advised: m('Agros দেখুন', 'Check Agros'), bought: m('বীজ কিনুন', 'Buy seed'),
  planted: m('জমিতে বুনুন', 'Sow plots'), waterLayer: m('"পানির চাপ" স্তর খুলুন', 'Open the Water stress layer'), watered: m('চারায় পানি দিন', 'Water seedlings'),
  harvested: m('পাকা ফসল তুলুন', 'Harvest ripe crops'), officeVisits: m('কৃষি অফিসে যান', 'Go to the agriculture office'), soilTests: m('মাটি পরীক্ষা করান', 'Get the soil tested'), rotated: m('অন্য ফসল বুনুন', 'Sow a different crop'), sold: m('হাটে বিক্রি', 'Sell at the market'), earned: m('মোট বিক্রি', 'Total sold'),
};

// The satellite-style game view uses simulated colours. Real local NASA and SoilGrids records appear in the Agros kiosk.
export const SAT_LAYERS = [
  { id: 'health', sat: 'SIM · inspired by Landsat / MODIS NDVI', bn: 'ফসলের স্বাস্থ্য', en: 'Crop health', legend: [['#2e9d3a', 'সুস্থ', 'Healthy'], ['#c9c23a', 'চাপে আছে', 'Stressed'], ['#d6452f', 'বিপদে', 'In danger']] },
  { id: 'water', sat: 'SIM · inspired by SMAP L4', bn: 'পানির চাপ', en: 'Water stress', legend: [['#2f7fd0', 'ভেজা', 'Moist'], ['#c9c23a', 'শুকাচ্ছে', 'Drying'], ['#d6452f', 'পানির চাপের জায়গা', 'Water-stress hotspot']] },
  { id: 'temp', sat: 'SIM · inspired by ECOSTRESS / MODIS LST', bn: 'মাটির তাপমাত্রা', en: 'Land surface temperature', legend: [['#2ea87a', 'শীতল', 'Cool buffer'], ['#e0983a', 'উষ্ণ', 'Elevated heat'], ['#e03a3a', 'চরম তাপ হটস্পট', 'Extreme thermal hotspot']] },
  { id: 'infilt', sat: 'SIM · inspired by SRTM & Infiltration', bn: 'অনুপ্রবেশ ও ক্ষয় ঝুঁকি', en: 'Infiltration & runoff', legend: [['#2a98c8', 'দ্রুত শোষণ', 'Rapid infiltration'], ['#c9a23a', 'মাঝারি প্রবাহ', 'Ponding risk'], ['#d84b2e', 'ক্ষয়প্রবণ মাটি', 'Erosion prone']] },
  { id: 'soil', sat: 'SIM · inspired by SoilGrids', bn: 'মাটির স্বাস্থ্য', en: 'Soil health', legend: [['#2e9d3a', 'উর্বর', 'Rich'], ['#c9a23a', 'মাঝারি', 'Middling'], ['#8a5a3a', 'ক্ষয়ে যাওয়া', 'Worn out']] },
];

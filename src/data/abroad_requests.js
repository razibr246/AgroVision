// Seeded sample farmer requests for all 8 abroad country officers (4–7 open requests each).
// Marked `demo: true` so the UI displays them honestly as sample onboarding records alongside live user posts.

export const ABROAD_TOPICS = {
  pest: { bn: 'পোকা বা রোগ', en: 'Pest or disease' },
  seed: { bn: 'বীজ বা সার', en: 'Seed or fertiliser' },
  water: { bn: 'সেচ বা পানি', en: 'Irrigation or water' },
  machine: { bn: 'যন্ত্র', en: 'Machinery' },
  loss: { bn: 'ক্ষতি বা বিমা', en: 'Loss or insurance' },
  other: { bn: 'অন্য কিছু', en: 'Something else' },
};

const dhakaIsoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

const isoAt = (baseIso, daysAgo, hour = 9) => {
  const ms = Date.parse(`${baseIso}T00:00:00Z`) - daysAgo * 864e5 + hour * 36e5;
  return new Date(ms).toISOString();
};

const RAW_SEEDS = {
  india: [
    {
      id: 'IND-R1', daysAgo: 0, hour: 8, topic: 'water',
      farmer: { bn: 'হরজিন্দর সিং', en: 'Harjinder Singh' },
      village: { bn: 'বদরুখাঁ, সাংরুর', en: 'Badrurkhan, Sangrur' },
      text: { bn: 'ধান তোলার পর মাটিতে যে রস আছে তাতেই হ্যাপি সিডার দিয়ে গম বোনা যাবে, নাকি হালকা প্রাক-সেচ দেব?', en: 'Is leftover paddy moisture enough to sow wheat directly with a Happy Seeder, or should I run a light pre-sowing irrigation?' },
    },
    {
      id: 'IND-R2', daysAgo: 1, hour: 10, topic: 'machine',
      farmer: { bn: 'বলবিন্দর সিং', en: 'Balwinder Singh' },
      village: { bn: 'বদরুখাঁ, সাংরুর', en: 'Badrurkhan, Sangrur' },
      text: { bn: 'খড় না পুড়িয়ে চাষের জন্য সমবায় কেন্দ্রের হ্যাপি সিডার ও সুপার এসএমএস যন্ত্র কোন দিন খালি পাব?', en: 'Which day is the co-op’s Happy Seeder and Super SMS free so we can sow without burning stubble?' },
    },
    {
      id: 'IND-R3', daysAgo: 2, hour: 9, topic: 'seed',
      farmer: { bn: 'মনপ্রীত সিং', en: 'Manpreet Singh' },
      village: { bn: 'লঙ্গোয়াল, সাংরুর', en: 'Longowal, Sangrur' },
      text: { bn: 'মার্চের তাপের চাপ সামলাতে আগাম বপনের জন্য পিবিডব্লিউ-৮২৬ বা এইচডি-৩০৮৬ গমের প্রত্যয়িত বীজ কেন্দ্রে আছে কি?', en: 'Does the block store still have certified PBW-826 or HD-3086 wheat seed for early heat-safe sowing?' },
    },
    {
      id: 'IND-R4', daysAgo: 2, hour: 15, topic: 'loss',
      farmer: { bn: 'গুরপ্রীত কৌর', en: 'Gurpreet Kaur' },
      village: { bn: 'সুনাম, সাংরুর', en: 'Sunam, Sangrur' },
      text: { bn: 'গতকালের ঝোড়ো হাওয়া ও শিলাবৃষ্টিতে নুয়ে পড়া ফসলের ক্ষতির ছবি বিমা বা ক্ষতিপূরণের পোর্টালে কীভাবে দেব?', en: 'How should I log storm and hail lodging photos from yesterday’s squall for compensation assessment?' },
    },
    {
      id: 'IND-R5', daysAgo: 3, hour: 11, topic: 'pest',
      farmer: { bn: 'সুখচৈন কৌর', en: 'Sukhchain Kaur' },
      village: { bn: 'বদরুখাঁ, সাংরুর', en: 'Badrurkhan, Sangrur' },
      text: { bn: 'আগাম বোনা গমের খাড়ির পাশের সারিতে পাতার ডগা হলদে হচ্ছে — এটা কি জিংকের ঘাটতি না গোড়া পচা?', en: 'Leaf tips on early wheat near the straw strip are yellowing — is that zinc deficiency or root stress?' },
    },
    {
      id: 'IND-R6', daysAgo: 4, hour: 14, topic: 'other',
      farmer: { bn: 'হরজিন্দর সিং', en: 'Harjinder Singh' },
      village: { bn: 'বদরুখাঁ, সাংরুর', en: 'Badrurkhan, Sangrur' },
      text: { bn: 'ব্লক থেকে নলকূপের গভীরতার সঙ্গে নতুন মাটি পরীক্ষার রিপোর্ট কার্ড কবে হাতে পাব?', en: 'When will our updated soil-health report card and groundwater advisory be ready at the block office?' },
    },
  ],
  pakistan: [
    {
      id: 'PAK-R1', daysAgo: 0, hour: 9, topic: 'water',
      farmer: { bn: 'গোলাম নবী চান্ডিও', en: 'Ghulam Nabi Chandio' },
      village: { bn: 'গোঠ খারানি, দাদু', en: 'Goth Kharani, Dadu' },
      text: { bn: 'নিচু পকেটে বন্যার অবশিষ্ট পানি নামাতে রাইট ব্যাংক আউটফল ড্রেনের গেট কবে খোলা হবে, তারপরই গমের জমি বাঁধব?', en: 'When will the Right Bank Outfall drain sluice open for the low pockets so we can prepare beds for wheat?' },
    },
    {
      id: 'PAK-R2', daysAgo: 1, hour: 11, topic: 'seed',
      farmer: { bn: 'আল্লাহ দিনো', en: 'Allah Dino' },
      village: { bn: 'জোহি রোড, দাদু', en: 'Johi Road, Dadu' },
      text: { bn: 'পলি-জমা ও হালকা লবণাক্ত জমিতে কোন জাতের গম ও প্রতি একরে কত কেজি বীজ বোনা ঠিক হবে?', en: 'Which salt-tolerant wheat variety and seed rate per acre fit freshly silted flood-belt soil?' },
    },
    {
      id: 'PAK-R3', daysAgo: 2, hour: 8, topic: 'loss',
      farmer: { bn: 'মাই বখতাওয়ার', en: 'Mai Bakhtawar' },
      village: { bn: 'গোঠ খারানি, দাদু', en: 'Goth Kharani, Dadu' },
      text: { bn: 'ভাদ্রের ঢলে ভেঙে যাওয়া জমির আইল ও সেচের খাল মেরামতের জন্য জেলার সহায়তা ফর্মে কী কাগজ লাগবে?', en: 'Which field papers are needed on the district form to claim bund and watercourse repair support?' },
    },
    {
      id: 'PAK-R4', daysAgo: 3, hour: 13, topic: 'pest',
      farmer: { bn: 'সাজিদ হুসেন', en: 'Sajid Hussain' },
      village: { bn: 'মেহার, দাদু', en: 'Mehar, Dadu' },
      text: { bn: 'শুকনো উঁচু ভাগে বোনা প্রথম গমের চারার গোড়ায় উইপোকা ধরেছে — প্রথম সেচের সঙ্গে কী ব্যবস্থা নেব?', en: 'White ants are cutting early wheat shoots on dry ridges — how should we treat safely with first irrigation?' },
    },
    {
      id: 'PAK-R5', daysAgo: 4, hour: 10, topic: 'machine',
      farmer: { bn: 'ইমতিয়াজ আলি', en: 'Imtiaz Ali' },
      village: { bn: 'গোঠ খারানি, দাদু', en: 'Goth Kharani, Dadu' },
      text: { bn: 'পানি সরে যাওয়া নিচু জমি সমান করতে লেজার ল্যান্ড লেভেলারের সিরিয়াল কবে পাব?', en: 'When is the community laser land-leveller slot free to smooth out our drained depressions?' },
    },
  ],
  nepal: [
    {
      id: 'NPL-R1', daysAgo: 0, hour: 7, topic: 'loss',
      farmer: { bn: 'রামপ্যারী চৌধুরী', en: 'Rampyari Chaudhary' },
      village: { bn: 'দুর্গাউলি, কৈলালী', en: 'Durgauli, Kailali' },
      text: { bn: 'ধান পেকে হলুদ হয়েছে — আগামী তিন দিনের আবহাওয়া দেখে আজ কাটা নিরাপদ হবে, নাকি রোদ স্থির হওয়া পর্যন্ত অপেক্ষা করব?', en: 'Terai paddy is fully ripe — given the next three days’ sky, is it safe to cut today or wait for clear sun?' },
    },
    {
      id: 'NPL-R2', daysAgo: 1, hour: 9, topic: 'seed',
      farmer: { bn: 'ধন বাহাদুর থারু', en: 'Dhan Bahadur Tharu' },
      village: { bn: 'দুর্গাউলি, কৈলালী', en: 'Durgauli, Kailali' },
      text: { bn: 'ভেজা ধানের জমিতে কাদা থাকা অবস্থায় মসুর রিলে বপন করব, না শুকিয়ে গমের জমি চাষ দেব?', en: 'Should I relay-sow lentil into moist paddy stubble or wait a week for tilled wheat?' },
    },
    {
      id: 'NPL-R3', daysAgo: 1, hour: 16, topic: 'machine',
      farmer: { bn: 'সীতা চৌধুরী', en: 'Sita Chaudhary' },
      village: { bn: 'টিকাপুর সীমা, কৈলালী', en: 'Tikapur Border, Kailali' },
      text: { bn: 'সম্ভাব্য বৃষ্টির আগেই পাকা ধান তুলে ফেলতে গাউঁপালিকার মিনি রিপার ও থ্রেশারের পাল্লা কবে পাওয়া যাবে?', en: 'Can we book the municipality mini-reaper and thresher before the next rain band reaches Kailali?' },
    },
    {
      id: 'NPL-R4', daysAgo: 2, hour: 12, topic: 'water',
      farmer: { bn: 'প্রেম থারু', en: 'Prem Tharu' },
      village: { bn: 'দুর্গাউলি, কৈলালী', en: 'Durgauli, Kailali' },
      text: { bn: 'গত রাতের বৃষ্টিতে নিচু কোণে পানি জমেছে — পাঁকা ধান নুইয়ে পড়া ঠেকাতে আইলের নালা খুলে দেব কি?', en: 'Last night’s shower pooled in the low corner — should we breach the corner bund so ripe stalks don’t lodge?' },
    },
    {
      id: 'NPL-R5', daysAgo: 3, hour: 10, topic: 'pest',
      farmer: { bn: 'ফুলমায়া চৌধুরী', en: 'Phulmaya Chaudhary' },
      village: { bn: 'পাথরাইয়া, কৈলালী', en: 'Pathariya, Kailali' },
      text: { bn: 'খালের পাশের দেরিতে লাগানো ধানে বাদামি দাগ ও শীষ কাটা পোকা দেখা যাচ্ছে — কাটার আগে স্প্রে কি দরকার?', en: 'Late-planted paddy near the canal shows brown spot and ear-cutting caterpillars — safe to skip spray before harvest?' },
    },
    {
      id: 'NPL-R6', daysAgo: 4, hour: 11, topic: 'other',
      farmer: { bn: 'রামপ্যারী চৌধুরী', en: 'Rampyari Chaudhary' },
      village: { bn: 'দুর্গাউলি, কৈলালী', en: 'Durgauli, Kailali' },
      text: { bn: 'অসময়ের বৃষ্টিতে ক্ষতির তথ্য জানকী গাউঁপালিকার কৃষি শাখায় ও কৃষি জ্ঞান কেন্দ্রে নিবন্ধনের শেষ তারিখ কবে?', en: 'What is the filing window at Janaki Rural Municipality’s agriculture office for unseasonal rain crop-loss registration?' },
    },
  ],
  bhutan: [
    {
      id: 'BTN-R1', daysAgo: 0, hour: 8, topic: 'pest',
      farmer: { bn: 'কিনলে ওয়াংমো', en: 'Kinley Wangmo' },
      village: { bn: 'লোবেসা, পুনাখা', en: 'Lobesa, Punakha' },
      text: { bn: 'নিচের ধাপের লাল ধানের জমিতে রাতে বুনো শূকর ঢুকছে — সৌর বিদ্যুৎ-বেড়ার ব্যাটারি দুর্বল, মেরামতের সহায়তা পাব কি?', en: 'Wild boar broke into the lower red-rice terrace last night — our solar electric-fence battery is weak; can RNR inspect it?' },
    },
    {
      id: 'BTN-R2', daysAgo: 1, hour: 10, topic: 'water',
      farmer: { bn: 'পেমা শেরিং', en: 'Pema Tshering' },
      village: { bn: 'বাপিসা, পুনাখা', en: 'Bapisa, Punakha' },
      text: { bn: 'উপরের পাহাড়ি ঝরনার নালায় (ইয়ু-চু) কাঁদা-পাথর জমে পানি কমে গেছে — গেওগের পরিষ্কার কাজের দল কবে আসবে?', en: 'Soil slip partially blocked our upper yuu-chu irrigation channel; when is the gewog maintenance crew scheduled?' },
    },
    {
      id: 'BTN-R3', daysAgo: 2, hour: 9, topic: 'loss',
      farmer: { bn: 'দেকি চোডেন', en: 'Deki Choden' },
      village: { bn: 'লোবেসা, পুনাখা', en: 'Lobesa, Punakha' },
      text: { bn: 'পো-চু নদীর তীরের নিচু ধাপের কাটা ধান উঁচু গোলায় তোলার জন্য জরুরি সতর্ক-সাইরেন মহড়ার তারিখ কবে?', en: 'Checking the Pho Chhu valley GLOF siren schedule so we can move threshed red rice up above the terrace rim in time.' },
    },
    {
      id: 'BTN-R4', daysAgo: 3, hour: 14, topic: 'seed',
      farmer: { bn: 'সোনম দর্জি', en: 'Sonam Dorji' },
      village: { bn: 'চোকরথো, পুনাখা', en: 'Chokortho, Punakha' },
      text: { bn: 'লাল ধান তোলার পর শীতের আলু ও বাঁধাকপির চারা বাপিসা আরএনআর কেন্দ্রে কবে বিতরণ করা হবে?', en: 'When will winter potato and cole-crop seedlings be distributed at Bapisa RNR centre after the rice harvest?' },
    },
    {
      id: 'BTN-R5', daysAgo: 4, hour: 11, topic: 'other',
      farmer: { bn: 'কিনলে ওয়াংমো', en: 'Kinley Wangmo' },
      village: { bn: 'লোবেসা, পুনাখা', en: 'Lobesa, Punakha' },
      text: { bn: 'ধাপ-জমির ধান মাড়াইয়ের জন্য গেওগের ছোট পাওয়ার-থ্রেশারের পালা বণ্টনের তালিকা চূড়ান্ত হয়েছে কি?', en: 'Has the gewog shared power-thresher timetable for the Lobesa terraces been finalised?' },
    },
  ],
  myanmar: [
    {
      id: 'MMR-R1', daysAgo: 0, hour: 8, topic: 'seed',
      farmer: { bn: 'উ চ উইন', en: 'U Kyaw Win' },
      village: { bn: 'সিংগু, ন্যাং-উ', en: 'Singu, Nyaung-U' },
      text: { bn: 'বর্ষা শেষের মাটিতে এখনো যতটা ভেজা আছে, তাতে ছোলা বপনের সেরা গভীরতা ও শুষ্ক-সহনশীল জাত কোনটি?', en: 'Topsoil is drying after the last rain — what sowing depth and drought-hardy chickpea line fits our stored moisture best?' },
    },
    {
      id: 'MMR-R2', daysAgo: 1, hour: 11, topic: 'water',
      farmer: { bn: 'দাউ হ্লা মিন্ট', en: 'Daw Hla Myint' },
      village: { bn: 'ন্যাং-উ পশ্চিম', en: 'Nyaung-U West' },
      text: { bn: 'তিল কাটার পর জমির খড় আর তিলগাছের ডাঁটা কি সারির মাঝে মাল্চ হিসেবে বিছিয়ে রাখব মাটির রস ধরে রাখতে?', en: 'Should we spread sesame stalks as surface mulch along chickpea rows to conserve residual soil moisture?' },
    },
    {
      id: 'MMR-R3', daysAgo: 2, hour: 10, topic: 'pest',
      farmer: { bn: 'কো তুন অং', en: 'Ko Tun Aung' },
      village: { bn: 'সিংগু, ন্যাং-উ', en: 'Singu, Nyaung-U' },
      text: { bn: 'অড়হর ও চীনাবাদামের মিশ্র সারিতে ফুল আসার সময় শুঁটি ছিদ্রকারী পোকা দেখা যাচ্ছে — কীভাবে দমন করব?', en: 'Pod borers spotted at flowering on pigeon-pea intercrop strips — what threshold and safe treatment applies?' },
    },
    {
      id: 'MMR-R4', daysAgo: 3, hour: 13, topic: 'loss',
      farmer: { bn: 'মা খিন আয়ে', en: 'Ma Khin Aye' },
      village: { bn: 'চক উত্তর, মান্দালয়', en: 'North Chauk, Mandalay' },
      text: { bn: 'টানা গরমে নাবী তিলের শুঁটি ঝরে গেছে — দপ্তরের শুষ্ক-অঞ্চল ক্ষতি নথিতে কীভাবে তথ্য দেব?', en: 'Heat waves scorched late sesame capsules before maturity — how do we log Dry Zone weather loss with the township office?' },
    },
    {
      id: 'MMR-R5', daysAgo: 4, hour: 9, topic: 'other',
      farmer: { bn: 'উ চ উইন', en: 'U Kyaw Win' },
      village: { bn: 'সিংগু, ন্যাং-উ', en: 'Singu, Nyaung-U' },
      text: { bn: 'টাউনশিপ কৃষি দপ্তর থেকে জীবাণুসার (রাইজোবিয়াম) প্যাকেট ও ডাল চাষের পরামর্শ পত্র কবে সংগ্রহ করা যাবে?', en: 'When can farmers collect Rhizobium inoculant packets for chickpea from the Nyaung-U DOA office?' },
    },
  ],
  usa: [
    {
      id: 'USA-R1', daysAgo: 0, hour: 14, topic: 'water',
      farmer: { bn: 'এলেন হার্টলি', en: 'Ellen Hartley' },
      village: { bn: 'ডায়মন্ড ভ্যালি, নেভাডা', en: 'Diamond Valley, Nevada' },
      text: { bn: 'আদেশ ১৩০২ অনুযায়ী পাম্পিং বরাদ্দ কমায় আগামী মৌসুমে আলফালফায় ৪ কাটার বদলে ৩ কাটা দিলে জলের ঘাটতি কতটা কমবে?', en: 'With Order 1302 groundwater cuts tightening, how much pumping volume does dropping from 4 to 3 alfalfa cuttings save here?' },
    },
    {
      id: 'USA-R2', daysAgo: 1, hour: 15, topic: 'other',
      farmer: { bn: 'ডেল সোরেনসেন', en: 'Dale Sorensen' },
      village: { bn: 'ডায়মন্ড ভ্যালি, নেভাডা', en: 'Diamond Valley, Nevada' },
      text: { bn: 'আমার সেন্টার পিভটের ফ্লোমিটার হিসাবের সঙ্গে নাসা OpenET উপগ্রহের বাষ্পীভবন (ET) রিডিং মিলিয়ে দেখার সময় পাব কি?', en: 'Could we review our pivot flowmeter log side-by-side against the latest NASA OpenET satellite ET numbers?' },
    },
    {
      id: 'USA-R3', daysAgo: 2, hour: 16, topic: 'seed',
      farmer: { bn: 'এলেন হার্টলি', en: 'Ellen Hartley' },
      village: { bn: 'ডায়মন্ড ভ্যালি, নেভাডা', en: 'Diamond Valley, Nevada' },
      text: { bn: 'দক্ষিণের পিভট অংশে পানিসাশ্রয়ী শস্য হিসেবে শীতকালীন বার্লি নাকি সরগম-সুদানঘাস পরীক্ষা করলে ভালো হবে?', en: 'Which lower-water rotation strip — winter barley or sorghum-sudangrass — fits best on the south pivot quadrant?' },
    },
    {
      id: 'USA-R4', daysAgo: 3, hour: 13, topic: 'machine',
      farmer: { bn: 'কারেন হ্যালভর্সেন', en: 'Karen Halvorsen' },
      village: { bn: 'ইউরেকা উত্তর, নেভাডা', en: 'North Eureka, Nevada' },
      text: { bn: 'বিকেলের ঝোড়ো বাতাসে পানির অপচয় কমাতে মাঝের স্প্যানের LESA স্প্রিংকলার নজল বদলাতে স্থানীয় অনুদান প্রোগ্রাম চালু আছে কি?', en: 'Are conservation cost-share funds open for retrofitting mid-span nozzles to LESA drop tubes against afternoon wind drift?' },
    },
    {
      id: 'USA-R5', daysAgo: 4, hour: 12, topic: 'pest',
      farmer: { bn: 'টম লিন্ডস্ট্রম', en: 'Tom Lindstrom' },
      village: { bn: 'ডায়মন্ড ভ্যালি, নেভাডা', en: 'Diamond Valley, Nevada' },
      text: { bn: 'চাকার দাগের পাশে শীতের ঘুমন্ত আলফালফার গোড়ায় ইঁদুরের গর্ত আর বসন্তের উইভিল প্রতিরোধে আগে কী প্রস্তুতি নেব?', en: 'Spotted fresh meadow vole burrows near pivot wheel tracks — what dormant-season management keeps spring weevil and rodent loss down?' },
    },
  ],
  brazil: [
    {
      id: 'BRA-R1', daysAgo: 0, hour: 13, topic: 'water',
      farmer: { bn: 'কাইও মোরেইরা', en: 'Caio Moreira' },
      village: { bn: 'সোরিসো, মাতুগ্রোসু', en: 'Sorriso, Mato Grosso' },
      text: { bn: 'অক্টোবরের প্রথম দুই পশলা বৃষ্টির পর উপরের মাটিতে ভেজা আছে — এখনই সয়াবিন বোনা শুরু করব, নাকি আরও এক পশলা ভারী বৃষ্টির অপেক্ষা করব?', en: 'Moisture after the first two October showers reached 8 cm — should I start sowing soybean now or wait one more storm so stands hold?' },
    },
    {
      id: 'BRA-R2', daysAgo: 1, hour: 12, topic: 'seed',
      farmer: { bn: 'আনা পাউলা রিবেইরো', en: 'Ana Paula Ribeiro' },
      village: { bn: 'সোরিসো দক্ষিণ, মাতুগ্রোসু', en: 'South Sorriso, Mato Grosso' },
      text: { bn: 'সাফ্রিনিয়া ভুট্টা যেন শুকনো মৌসুমে না পড়ে, সেজন্য ১০৫ দিনের স্বল্পমেয়াদি সয়াবিন জাতের সুপারিশ ও বপনের ব্যবধান কত রাখব?', en: 'Which 105-day early soybean cycle keeps our second-crop safrinha maize inside the safe late-rain window?' },
    },
    {
      id: 'BRA-R3', daysAgo: 2, hour: 14, topic: 'pest',
      farmer: { bn: 'মার্কোস ভিনিসিউস', en: 'Marcos Vinícius' },
      village: { bn: 'সোরিসো, মাতুগ্রোসু', en: 'Sorriso, Mato Grosso' },
      text: { bn: 'দক্ষিণের বনের সীমানার কাছের ভেজা অংশে দুর্গন্ধি পোকা (পেরসেভেহো) আর মরিচার স্পোর ট্র্যাপে কী সতর্কতা দেখা যাচ্ছে?', en: 'What do local spore traps and EMPAER-MT alerts show for Asian soybean rust and stink bugs along the humid south border?' },
    },
    {
      id: 'BRA-R4', daysAgo: 2, hour: 17, topic: 'machine',
      farmer: { bn: 'কাইও মোরেইরা', en: 'Caio Moreira' },
      village: { bn: 'সোরিসো, মাতুগ্রোসু', en: 'Sorriso, Mato Grosso' },
      text: { bn: 'বাজরা আচ্ছাদনের মোটা খড় কাটতে জিরো-টিল প্ল্যান্টারের কুল্টার ডিস্ক ও গভীরতার সেটিং একটু যাচাই করে দেবেন?', en: 'Need quick extension check on coulter pressure and seed-trench closure through heavy millet mulch on no-till beds.' },
    },
    {
      id: 'BRA-R5', daysAgo: 3, hour: 15, topic: 'loss',
      farmer: { bn: 'ফের্নান্দা কস্তা', en: 'Fernanda Costa' },
      village: { bn: 'লুকাস সীমান্ত, মাতুগ্রোসু', en: 'Lucas Road, Mato Grosso' },
      text: { bn: 'গত মৌসুমের অক্টোবর–ফেব্রুয়ারি বৃষ্টির ঘাটতির উপগ্রহ রেকর্ড ZARC ও PROAGRO বিমা নথির সঙ্গে কীভাবে মেলাব?', en: 'How can we attach last season’s Oct–Feb rainfall deficit record to our ZARC window and PROAGRO documentation?' },
    },
    {
      id: 'BRA-R6', daysAgo: 4, hour: 11, topic: 'other',
      farmer: { bn: 'লুকাস মেন্দেস', en: 'Lucas Mendes' },
      village: { bn: 'সোরিসো, মাতুগ্রোসু', en: 'Sorriso, Mato Grosso' },
      text: { bn: 'সমবায় গোদামে সয়াবিন বীজের সঙ্গে মেশানোর ব্র্যাডিরাইজোবিয়াম জীবাণুসারের কোল্ড-চেইন ব্যাচ কি পৌঁছেছে?', en: 'Has the new cold-chain batch of Bradyrhizobium inoculant arrived at the Sorriso cooperative warehouse?' },
    },
  ],
  spain: [
    {
      id: 'ESP-R1', daysAgo: 0, hour: 10, topic: 'water',
      farmer: { bn: 'লুসিয়া গার্সিয়া', en: 'Lucía García' },
      village: { bn: 'মার্তোস, হায়েন', en: 'Martos, Jaén' },
      text: { bn: 'জলাধারের অবস্থা দেখে সমবায়ের সেচের পালা এবার ২৫% কমানো হয়েছে — অলিভের ফলের তেল জমার সময়ে ঘাটতি-সেচ কীভাবে ভাগ করব?', en: 'Our community irrigation turn was cut by 25% — which olive growth stage should get the limited deficit irrigation first?' },
    },
    {
      id: 'ESP-R2', daysAgo: 1, hour: 12, topic: 'other',
      farmer: { bn: 'কার্মেন মোরালেস', en: 'Carmen Morales' },
      village: { bn: 'মার্তোস পূর্ব, হায়েন', en: 'East Martos, Jaén' },
      text: { bn: 'মাটির রস টেনে নেওয়া ঠেকাতে এবং PEPAC ইকো-স্কিমের শর্ত বজায় রাখতে সারির মাঝের ঘাস-আচ্ছাদন কোন তারিখের মধ্যে কাটা দরকার?', en: 'What mowing cut-off keeps CAP PEPAC eco-scheme cover compliance while stopping spring weeds from draining olive soil moisture?' },
    },
    {
      id: 'ESP-R3', daysAgo: 2, hour: 9, topic: 'pest',
      farmer: { bn: 'আন্তোনিও পেরেজ', en: 'Antonio Pérez' },
      village: { bn: 'লস ভিলারেস, হায়েন', en: 'Los Villares, Jaén' },
      text: { bn: 'হালকা বৃষ্টির পর অলিভ বাগানের ফাঁদে মাছি (ব্যাকট্রোসেরা) ধরা বেড়েছে — কমার্কা অফিসের দমন সীমা কত পেরোল কি?', en: 'Olive fruit fly trap counts rose after autumn rain — has the OCA Jaén comarca threshold for bait treatment been crossed?' },
    },
    {
      id: 'ESP-R4', daysAgo: 3, hour: 14, topic: 'loss',
      farmer: { bn: 'লুসিয়া গার্সিয়া', en: 'Lucía García' },
      village: { bn: 'মার্তোস, হায়েন', en: 'Martos, Jaén' },
      text: { bn: 'পূর্ব ঢালের পুরোনো অলিভ সারির মাঝখান দিয়ে হঠাৎ ভারী বৃষ্টিতে মাটি ধুয়ে নালা তৈরি হয়েছে — কোন স্থায়ী আচ্ছাদন দেব?', en: 'Sudden downpour carved an erosion gully down our eastern olive slope — which stone check / perennial grass cover mix works here?' },
    },
    {
      id: 'ESP-R5', daysAgo: 4, hour: 11, topic: 'machine',
      farmer: { bn: 'হাভিয়ের রোমেরো', en: 'Javier Romero' },
      village: { bn: 'মার্তোস, হায়েন', en: 'Martos, Jaén' },
      text: { bn: 'বাগানের ছাঁটাই করা ডালপালা পুড়িয়ে না ফেলে গুঁড়ো করে মাটিতে মেশাতে সমবায়ের মাল্চার-শ্রেডার কবে পাব?', en: 'When can we reserve the cooperative flail shredder to chip olive prunings in-row as surface mulch?' },
    },
  ],
};

export function seedAbroadRequests(cc, { today = dhakaIsoToday() } = {}) {
  const rows = RAW_SEEDS[cc];
  if (!rows) return [];
  return rows.map((r) => ({
    id: r.id,
    t: isoAt(today, r.daysAgo, r.hour),
    topic: r.topic,
    farmer: r.farmer,
    village: r.village,
    text: r.text,
    demo: true,
    reply: null,
  }));
}

export function seedAbroadBoard(cc, opts) {
  const requests = {};
  for (const item of seedAbroadRequests(cc, opts)) requests[item.id] = item;
  return { requests, notices: {} };
}

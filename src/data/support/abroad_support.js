// Government support for the sample farmer in each neighbouring country (/abroad/:cc/support), in the shape of
// bd_support.js and matched by engine/support.js. Each entry is a RECORD read from the source in `src` on CHECKED; the
// farmer is told to confirm with the local office. Where a figure was only reported in the news, or a scheme's
// final terms were not found, it says so. India is in_support.js. `profile` is the sample farmer's place and crops
// (land comes from data/abroad.js farmDec).
import { IN_SUPPORT } from './in_support.js';

export const CHECKED = '2026-11-05';

const PAKISTAN = [
  {
    id: 'pk_wheat_sindh', kind: 'input', status: 'running',
    name: { bn: 'সিন্ধু গম চাষি সহায়তা কর্মসূচি (বেনজির হারি কার্ড)', en: 'Sindh Wheat Growers Support Programme (Benazir Hari Card)' },
    by: { bn: 'সিন্ধু সরকার, কৃষি বিভাগ', en: 'Government of Sindh, Agriculture Department' },
    benefit: { bn: 'গম চাষে একরপ্রতি সারের টাকা: ডিএপি আর ইউরিয়ার বস্তার দাম, সব মিলিয়ে একরে প্রায় ২৪,৭০০ রুপি (খবরে প্রকাশিত হিসাব)। নিবন্ধিত চাষির কাছ থেকেই সরকার গম কেনে।', en: 'Cash for wheat fertiliser per acre: the price of DAP and urea bags, about Rs 24,700 an acre in all (as reported). The government buys wheat only from registered growers.' },
    who: { bn: '১ থেকে ২৫ একরের মালিক গমচাষি, হারি কার্ড তালিকায় নিবন্ধিত', en: 'Wheat growers owning 1 to 25 acres, registered on the Hari Card list' },
    rule: { maxDec: 2500, crops: ['wheat'], states: ['Sindh'] },
    docs: [{ bn: 'সিএনআইসি (জাতীয় পরিচয়পত্র)', en: 'CNIC' }, { bn: 'জমির রাজস্ব রেকর্ড', en: 'Land revenue record' }],
    where: { bn: 'জেলা কৃষি সম্প্রসারণ অফিস; বেনজির হারি কার্ড নিবন্ধন', en: 'District agriculture extension office; Benazir Hari Card registration' },
    src: 'https://www.dawn.com/news/1944865',
    note: { bn: 'ইউরিয়ার টাকার অঙ্ক নিয়ে খবরে মতভেদ আছে; ২০২৬–২৭ মৌসুমে চলবে কি না জেলা অফিসে জানুন।', en: 'Reports differ on the urea amount; ask the district office whether it runs again for 2026–27.' },
    words: ['wheat', 'গম', 'fertiliser', 'fertilizer', 'সার', 'dap', 'urea', 'ইউরিয়া', 'hari', 'হারি', 'card', 'কার্ড'],
  },
  {
    id: 'pk_clis', kind: 'insurance', status: 'running',
    name: { bn: 'শস্য ঋণ বিমা (CLIS)', en: 'Crop Loan Insurance Scheme (CLIS)' },
    by: { bn: 'স্টেট ব্যাংক অব পাকিস্তান, ব্যাংকের মাধ্যমে', en: 'State Bank of Pakistan, through the banks' },
    benefit: { bn: 'কৃষিঋণ নিলে ফসল বন্যা, খরা, শিলা বা রোগে নষ্ট হলে বিমা ঋণ শোধ করে। প্রিমিয়াম মৌসুমে সর্বোচ্চ ২%; ছোট ও মাঝারি চাষির (২৫ একর পর্যন্ত) প্রিমিয়াম সরকার দেয়।', en: 'With a farm loan, insurance repays it if flood, drought, hail or disease ruins the crop. Premium at most 2% a season; the government pays it for small and medium farmers (up to 25 acres).' },
    who: { bn: 'ব্যাংক থেকে ফসল-ঋণ নেওয়া চাষি', en: 'Farmers who take a crop loan from a bank' },
    rule: { maxDec: 2500 },
    docs: [{ bn: 'সিএনআইসি', en: 'CNIC' }, { bn: 'জমির কাগজ (পাসবুক)', en: 'Land papers (passbook)' }],
    where: { bn: 'যে ব্যাংক থেকে কৃষিঋণ নেবেন', en: 'The bank giving the crop loan' },
    src: 'https://www.sbp.org.pk/Incen-others/pdf/CLIS.pdf',
    words: ['insurance', 'বিমা', 'বীমা', 'loan', 'ঋণ', 'flood', 'বন্যা', 'loss', 'ক্ষতি', 'clis'],
  },
  {
    id: 'pk_haris', kind: 'cash', status: 'check',
    name: { bn: 'হারি কার্ড: বর্গাচাষিদের সহায়তা', en: 'Hari Card: support for tenant farmers' },
    by: { bn: 'সিন্ধু সরকার', en: 'Government of Sindh' },
    benefit: { bn: 'গমের প্যাকেজ থেকে আলাদা: বর্গা ও ভাগচাষিদের (হারি) জন্য সিন্ধু সরকার ৮০০ কোটি রুপি রেখেছে বলে জানানো হয়েছে।', en: 'Separate from the wheat package: Sindh has reportedly set aside Rs 8 billion for tenant farmers (haris).' },
    who: { bn: 'যাঁরা অন্যের জমিতে চাষ করেন (হারি)', en: 'Those who farm someone else’s land (haris)' },
    rule: { states: ['Sindh'] },
    docs: [{ bn: 'সিএনআইসি', en: 'CNIC' }],
    where: { bn: 'জেলা কৃষি অফিস', en: 'District agriculture office' },
    src: 'https://english.aaj.tv/news/330440671',
    words: ['tenant', 'বর্গা', 'hari', 'হারি', 'cash', 'নগদ'],
  },
];

const NEPAL = [
  {
    id: 'np_insurance', kind: 'insurance', status: 'running',
    name: { bn: 'ফসল ও গবাদিপশুর বিমা (প্রিমিয়ামে ৮০% ভর্তুকি)', en: 'Crop and livestock insurance (80% premium subsidy)' },
    by: { bn: 'কৃষি ও পশুসম্পদ উন্নয়ন মন্ত্রণালয়; বিমা কোম্পানি', en: 'Ministry of Agriculture and Livestock Development; insurers' },
    benefit: { bn: 'ধান, গম, ডালসহ ফসল আর গবাদিপশুর বিমার প্রিমিয়ামের ৮০% সরকার দেয় (৫০ লাখ রুপি পর্যন্ত বিমায়; বেশি হলে ৬৫% বা ৫০%)।', en: 'The government pays 80% of the premium on crop and livestock insurance (on cover up to Rs 5 million; 65% or 50% above that).' },
    who: { bn: 'সব চাষি', en: 'Every farmer' },
    rule: {},
    docs: [{ bn: 'নাগরিকতা সনদ', en: 'Citizenship certificate' }, { bn: 'জমির পুর্জা', en: 'Land ownership certificate (lalpurja)' }],
    where: { bn: 'পৌরসভা/গাউঁপালিকার কৃষি শাখা বা বিমা কোম্পানির এজেন্ট', en: 'The municipality’s agriculture section or an insurer’s agent' },
    src: 'https://english.ratopati.com/story/64667/premium-subsidy-of-up-to-80-percent-on-agricultural-and-livestock-insurance',
    words: ['insurance', 'বিমা', 'বীমা', 'premium', 'প্রিমিয়াম', 'flood', 'বন্যা', 'loss', 'ক্ষতি', 'livestock', 'গরু'],
  },
  {
    id: 'np_fertiliser', kind: 'input', status: 'running',
    name: { bn: 'ভর্তুকির রাসায়নিক সার (সমবায়ের মাধ্যমে)', en: 'Subsidised chemical fertiliser (through cooperatives)' },
    by: { bn: 'কৃষি সামগ্রী কোম্পানি ও সল্ট ট্রেডিং কর্পোরেশন', en: 'Agriculture Inputs Company and Salt Trading Corporation' },
    benefit: { bn: 'ইউরিয়া, ডিএপি, পটাশ সরকারি ভর্তুকিতে কম দামে, কোটা ধরে সমবায় থেকে। মৌসুমের আগে প্রায়ই টান পড়ে, তাই আগে নাম লেখান।', en: 'Urea, DAP and potash at a subsidised price, by quota through cooperatives. Supplies often run short before the season, so register early.' },
    who: { bn: 'স্থানীয় কৃষি সমবায়ের সদস্য চাষি', en: 'Farmers who are members of a local agricultural cooperative' },
    rule: {},
    docs: [{ bn: 'সমবায়ের সদস্য কার্ড', en: 'Cooperative membership card' }, { bn: 'জমির পুর্জা', en: 'Lalpurja' }],
    where: { bn: 'কাছের কৃষি সমবায়', en: 'The nearest agricultural cooperative' },
    src: 'https://english.ratopati.com/story/61530',
    words: ['fertiliser', 'fertilizer', 'সার', 'urea', 'ইউরিয়া', 'dap', 'ডিএপি', 'cooperative', 'সমবায়', 'price', 'দাম'],
  },
];

const BHUTAN = [
  {
    id: 'bt_machinery', kind: 'machinery', status: 'running',
    name: { bn: 'যন্ত্র ভাড়ায় ৫০% সহায়তা (খরচ ভাগাভাগি ২০২৫)', en: '50% support to hire farm machines (Cost Sharing Mechanism 2025)' },
    by: { bn: 'কৃষি ও পশুসম্পদ মন্ত্রণালয়; ফার্ম মেশিনারি কর্পোরেশন (FMCL)', en: 'Ministry of Agriculture and Livestock; Farm Machinery Corporation (FMCL)' },
    benefit: { bn: 'ছোট (জীবিকানির্ভর) চাষি পাওয়ার টিলার, ধান কাটার যন্ত্রসহ যন্ত্র ভাড়ার অর্ধেক খরচ সরকার থেকে পান; জমি উন্নয়নেও কম খরচ।', en: 'Subsistence farmers get half the cost of hiring machines such as power tillers and harvesters from the government, and cheaper land development.' },
    who: { bn: 'জীবিকানির্ভর চাষি (বড় খামার নয়)', en: 'Subsistence farmers (not large farms)' },
    rule: {},
    docs: [{ bn: 'সিআইডি কার্ড', en: 'CID card' }, { bn: 'জমির থ্রাম', en: 'Land thram' }],
    where: { bn: 'গেওগের কৃষি সম্প্রসারণ কর্মকর্তা বা FMCL', en: 'The gewog agriculture extension officer or FMCL' },
    src: 'https://thebhutanese.bt/?p=39960',
    words: ['machine', 'যন্ত্র', 'tiller', 'টিলার', 'harvester', 'হারভেস্টার', 'hire', 'ভাড়া', 'fmcl'],
  },
  {
    id: 'bt_fencing', kind: 'input', status: 'running',
    name: { bn: 'বুনো প্রাণী ঠেকাতে চেইন-লিংক বেড়া', en: 'Chain-link fencing against wildlife' },
    by: { bn: 'কৃষি ও পশুসম্পদ মন্ত্রণালয়', en: 'Ministry of Agriculture and Livestock' },
    benefit: { bn: 'বুনো শুয়োর, হরিণ, বানর ফসল নষ্ট করলে গ্রামের জমি ঘিরে বেড়ার প্রকল্প; ২০২৫–২৬ সালে ১০৫টি প্রকল্প, প্রায় ৫,৯০০ পরিবার।', en: 'Where wild boar, deer and monkeys ruin crops, schemes fence a village’s fields; 105 schemes for about 5,900 households in 2025–26.' },
    who: { bn: 'যে গ্রাম বা চাষিদল প্রকল্পে নাম দেয়', en: 'Villages or farmer groups that apply for a scheme' },
    rule: {},
    docs: [{ bn: 'গেওগের প্রস্তাব', en: 'A proposal through the gewog' }],
    where: { bn: 'গেওগ প্রশাসন ও জোংখাগের কৃষি অফিস', en: 'The gewog administration and the dzongkhag agriculture office' },
    src: 'https://www.bbs.bt/moaf-to-distribute-chain-link-fencing-to-farmers',
    note: { bn: 'বাজেট কম বলে মন্ত্রণালয় অগ্রাধিকার ঠিক করছে; আপনার গ্রাম তালিকায় আছে কি না জেনে নিন।', en: 'The budget is short and the ministry is reprioritising; ask whether your village is on the list.' },
    words: ['fence', 'বেড়া', 'wildlife', 'বুনো', 'boar', 'শুয়োর', 'monkey', 'বানর', 'deer', 'হরিণ'],
  },
  {
    id: 'bt_seed', kind: 'input', status: 'running',
    name: { bn: 'নতুন জাতের বীজ ও সেচ নালা', en: 'New seed varieties and irrigation channels' },
    by: { bn: 'কৃষি ও পশুসম্পদ মন্ত্রণালয়', en: 'Ministry of Agriculture and Livestock' },
    benefit: { bn: 'নতুন জাতের বীজ আর সেচ নালার মতো সাধারণ অবকাঠামো খামারের আকার যা-ই হোক, সব চাষি সমানভাবে পান।', en: 'New seed varieties and shared works such as irrigation channels go to every farmer alike, whatever the farm size.' },
    who: { bn: 'সব চাষি', en: 'Every farmer' },
    rule: {},
    docs: [],
    where: { bn: 'গেওগের কৃষি সম্প্রসারণ কর্মকর্তা', en: 'The gewog agriculture extension officer' },
    src: 'https://thebhutanese.bt/?p=39960',
    words: ['seed', 'বীজ', 'variety', 'জাত', 'irrigation', 'সেচ', 'channel', 'নালা', 'water', 'পানি'],
  },
];

const MYANMAR = [
  {
    id: 'mm_madb', kind: 'credit', status: 'check',
    name: { bn: 'কৃষি উন্নয়ন ব্যাংকের মৌসুমি ঋণ (MADB)', en: 'Myanma Agricultural Development Bank seasonal loans (MADB)' },
    by: { bn: 'মিয়ানমা কৃষি উন্নয়ন ব্যাংক', en: 'Myanma Agricultural Development Bank' },
    benefit: { bn: '২০২৫ বর্ষায় ধানে একরপ্রতি ১,৫০,০০০ কিয়াত, ৫% সুদে, চাষিপ্রতি ১০ একর পর্যন্ত; শুকনো অঞ্চলের কয়েকটি টাউনশিপে বৃষ্টিনির্ভর অন্য ফসলেও ঋণ দেওয়া হয়েছে।', en: 'For 2025 monsoon paddy, 150,000 kyat an acre at 5% interest, up to 10 acres a farmer; several Dry Zone townships also lent for other rain-fed crops.' },
    who: { bn: 'আগের ঋণ পুরো শোধ করা চাষি; টাউনশিপের যাচাই কমিটির অনুমোদন লাগে', en: 'Farmers who repaid earlier loans in full, approved by the township screening committee' },
    rule: {},
    docs: [{ bn: 'জমির ফর্ম ৭', en: 'Land Form 7' }, { bn: 'জাতীয় পরিচয়পত্র', en: 'National registration card' }],
    where: { bn: 'টাউনশিপের MADB শাখা', en: 'The township MADB branch' },
    src: 'https://mdn.gov.mm/my/node/187776',
    note: { bn: 'ছোলা ও অড়হরের মতো শীতের ডালে এই ঋণ মেলে কি না, আর আপনার এলাকায় শাখা খোলা কি না, শাখায় জেনে নিন।', en: 'Ask the branch whether winter pulses such as chickpea and pigeon pea qualify, and whether the branch in your area is open.' },
    words: ['loan', 'ঋণ', 'credit', 'bank', 'ব্যাংক', 'madb', 'interest', 'সুদ', 'kyat', 'কিয়াত'],
  },
];

const USA = [
  {
    id: 'us_retire', kind: 'cash', status: 'check',
    name: { bn: 'ভূগর্ভের পানির অধিকার স্বেচ্ছায় বিক্রি (অবসর)', en: 'Voluntary groundwater-rights retirement' },
    by: { bn: 'সেন্ট্রাল নেভাডা আঞ্চলিক পানি কর্তৃপক্ষ ও হামবোল্ট রিভার বেসিন পানি কর্তৃপক্ষ, রাজ্যের অর্থে', en: 'Central Nevada Regional Water Authority and Humboldt River Basin Water Authority, with state funds' },
    benefit: { bn: 'অতিরিক্ত পাম্প হওয়া উপত্যকায় পানির অধিকার কিনে স্থায়ীভাবে বন্ধ করা হয়; ডায়মন্ড ভ্যালিতে একর-ফুট প্রতি ৮০০ ডলার। ২০২৪ সালে এখানে প্রায় ১২,০০০ একর-ফুট বিক্রির চুক্তি হয়।', en: 'Water rights in over-pumped valleys are bought and retired for good; Diamond Valley rights at $800 an acre-foot. In 2024 about 12,000 acre-feet were agreed for sale here.' },
    who: { bn: 'যাঁর ভূগর্ভের পানির অধিকার আছে, যিনি কিছুটা ছাড়তে চান', en: 'Holders of groundwater rights willing to give some up' },
    rule: { states: ['Nevada'] },
    docs: [{ bn: 'পানি অধিকারের কাগজ (পারমিট/সার্টিফিকেট)', en: 'Water-right permit or certificate' }],
    where: { bn: 'ইউরেকা কাউন্টি / পানি কর্তৃপক্ষের আবেদন রাউন্ড', en: 'Eureka County / the water authorities’ application round' },
    src: 'https://lasvegassun.com/news/2023/dec/29/to-tackle-overpumping-crisis-new-program-offers-ca/',
    note: { bn: 'এটি পরীক্ষামূলক রাউন্ডে চলেছে; ২০২৫ সালে স্থায়ী কর্মসূচির বিল উঠেছিল, পাস হয়েছে কি না জেনে নিন।', en: 'It ran as pilot rounds; bills for a permanent programme were heard in 2025 — check whether one passed.' },
    words: ['water', 'পানি', 'rights', 'অধিকার', 'sell', 'বিক্রি', 'retire', 'groundwater', 'debt', 'দেনা'],
  },
  {
    id: 'us_eqip', kind: 'irrigation', status: 'running',
    name: { bn: 'ইকিপ: দক্ষ সেচে খরচের ভাগ (EQIP)', en: 'EQIP: cost-share for efficient irrigation' },
    by: { bn: 'ইউএসডিএ ন্যাচারাল রিসোর্সেস কনজারভেশন সার্ভিস (NRCS)', en: 'USDA Natural Resources Conservation Service (NRCS)' },
    benefit: { bn: 'পিভটে নিচু নজল (LESA), মাটির ভেজা মাপার যন্ত্র, পানি বাঁচানো সেচ আর মাটি রক্ষার কাজে খরচের একটা অংশ সরকার দেয়, কাজ শেষে।', en: 'Pays part of the cost of low-pressure drop nozzles (LESA), soil-moisture sensors, water-saving irrigation and soil conservation, once the work is done.' },
    who: { bn: 'সেচের জমির চাষি (আগের কয়েক বছরে সেচ দেওয়া জমি)', en: 'Farmers with irrigated land (irrigated in recent years)' },
    rule: {},
    docs: [{ bn: 'খামারের রেকর্ড (FSA-তে নিবন্ধন)', en: 'Farm records (registered with FSA)' }],
    where: { bn: 'কাউন্টির ইউএসডিএ সার্ভিস সেন্টারে NRCS অফিস', en: 'The NRCS office at the county USDA Service Center' },
    src: 'https://www.nrcs.usda.gov/programs-initiatives/eqip-environmental-quality-incentives',
    words: ['irrigation', 'সেচ', 'pivot', 'পিভট', 'nozzle', 'lesa', 'cost', 'খরচ', 'conservation', 'eqip'],
  },
  {
    id: 'us_forage_ins', kind: 'insurance', status: 'running',
    name: { bn: 'গোখাদ্য ফসলের বিমা (আলফালফা)', en: 'Forage Production insurance (alfalfa)' },
    by: { bn: 'ইউএসডিএ রিস্ক ম্যানেজমেন্ট এজেন্সি (RMA), বিমা এজেন্টের মাধ্যমে', en: 'USDA Risk Management Agency (RMA), through crop-insurance agents' },
    benefit: { bn: 'জমে ওঠা আলফালফা খেতের ফলন খরা, ঠান্ডা বা অন্য প্রাকৃতিক কারণে কমলে টাকা দেয়; আগের ফলনের ৫০–৭৫% পর্যন্ত নিশ্চয়তা। নেভাডায় ২০২৪ সালে আলফালফার মাত্র প্রায় ১০% জমি বিমায় ছিল।', en: 'Pays when an established alfalfa stand yields less through drought, cold or other natural causes; cover from 50 to 75% of past yield. In 2024 only about 10% of Nevada’s alfalfa acres were insured.' },
    who: { bn: 'অন্তত এক বছর আগে বসানো আলফালফা খেত', en: 'Alfalfa stands at least a year old' },
    rule: {},
    docs: [{ bn: 'আগের বছরগুলোর ফলনের হিসাব', en: 'Records of past yields' }],
    where: { bn: 'অনুমোদিত শস্য-বিমা এজেন্ট; শেষ তারিখের আগে', en: 'A licensed crop-insurance agent, before the sales closing date' },
    src: 'https://www.rma.usda.gov/sites/default/files/2025-03/Nevada-State-Profile-2024.pdf',
    words: ['insurance', 'বিমা', 'বীমা', 'loss', 'ক্ষতি', 'drought', 'খরা', 'alfalfa', 'আলফালফা', 'forage'],
  },
  {
    id: 'us_fsa', kind: 'credit', status: 'running',
    name: { bn: 'এফএসএ খামার ঋণ (সরাসরি আর মাইক্রো)', en: 'FSA farm loans (direct and microloans)' },
    by: { bn: 'ইউএসডিএ ফার্ম সার্ভিস এজেন্সি (FSA)', en: 'USDA Farm Service Agency (FSA)' },
    benefit: { bn: 'ব্যাংকে ঋণ না পেলে সরকারের সরাসরি পরিচালন ঋণ ৪,০০,০০০ ডলার পর্যন্ত; ছোট খামারের জন্য সহজ মাইক্রো-ঋণ ৫০,০০০ ডলার পর্যন্ত।', en: 'If a bank won’t lend, direct operating loans from the government up to $400,000; simpler microloans up to $50,000 for small farms.' },
    who: { bn: 'যে পরিবার নিজে খামার চালায় আর অন্য কোথাও যথেষ্ট ঋণ পায় না', en: 'Family farms that run the farm themselves and can’t get enough credit elsewhere' },
    rule: {},
    docs: [{ bn: 'খামারের হিসাব আর পরিকল্পনা', en: 'Farm records and a farm plan' }],
    where: { bn: 'কাউন্টির ইউএসডিএ সার্ভিস সেন্টারে FSA অফিস', en: 'The FSA office at the county USDA Service Center' },
    src: 'https://www.fsa.usda.gov/sites/default/files/2025-11/FSA_farm_loan_info_chart%20%282%29.pdf',
    words: ['loan', 'ঋণ', 'credit', 'fsa', 'bank', 'ব্যাংক', 'microloan'],
  },
  {
    id: 'us_extension', kind: 'advice', status: 'running',
    name: { bn: 'এক্সটেনশন পরামর্শ ও উপত্যকার গবেষণা খামার', en: 'Extension advice and the valley’s research ranch' },
    by: { bn: 'ইউনিভার্সিটি অব নেভাডা, রেনো এক্সটেনশন', en: 'University of Nevada, Reno Extension' },
    benefit: { bn: 'কম পানিতে গোখাদ্য, সেচের সময় আর মাটি নিয়ে পরামর্শ; ডায়মন্ড ভ্যালির গ্রেট বেসিন রিসার্চ অ্যান্ড এক্সটেনশন সেন্টারে সীমিত পানিতে ফসলের পরীক্ষা।', en: 'Advice on forage with less water, irrigation timing and soil; trials of crops on limited water at the Great Basin Research & Extension Center in Diamond Valley.' },
    who: { bn: 'সবাই', en: 'Everyone' },
    rule: {},
    docs: [],
    where: { bn: 'ইউএনআর এক্সটেনশন, ইউরেকা কাউন্টি অফিস', en: 'UNR Extension, Eureka County office' },
    src: 'https://www.unr.edu/nevada-today/news/2020/great-basin-research-and-extension',
    words: ['advice', 'পরামর্শ', 'extension', 'research', 'trial', 'help', 'সাহায্য'],
  },
];

export const ABROAD_SUPPORT = {
  india: { list: IN_SUPPORT, checked: '2026-11-04', profile: { state: 'Punjab', crops: [['rice', 'ধান', 'Rice'], ['wheat', 'গম', 'Wheat']] } },
  pakistan: { list: PAKISTAN, checked: CHECKED, profile: { state: 'Sindh', crops: [['rice', 'ধান', 'Rice'], ['wheat', 'গম', 'Wheat']] } },
  nepal: { list: NEPAL, checked: CHECKED, profile: { state: 'Sudurpashchim', crops: [['rice', 'ধান', 'Rice'], ['wheat', 'গম', 'Wheat'], ['lentil', 'মসুর', 'Lentil']] } },
  bhutan: { list: BHUTAN, checked: CHECKED, profile: { state: 'Punakha', crops: [['rice', 'ধান', 'Rice'], ['vegetables', 'শীতের সবজি', 'Winter vegetables']] } },
  usa: { list: USA, checked: CHECKED, profile: { state: 'Nevada', crops: [['alfalfa', 'আলফালফা', 'Alfalfa']] } },
  myanmar: { list: MYANMAR, checked: CHECKED, profile: { state: 'Mandalay', crops: [['sesame', 'তিল', 'Sesame'], ['chickpea', 'ছোলা', 'Chickpea'], ['pigeonpea', 'অড়হর', 'Pigeon pea']] } },
};
// What a farmer in each country can call for advice (only where a public number was confirmed).
export const HOTLINE = { india: { bn: 'কিষাণ কল সেন্টার ১৮০০-১৮০-১৫৫১', en: 'Kisan Call Centre 1800-180-1551', tel: '18001801551' } };

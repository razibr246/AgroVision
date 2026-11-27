// How datasets of very different sizes and time steps are put together (the challenge's "harmonize to a common
// analysis grid"). Agros does not resample everything onto one fine grid: a 50 km weather cell or a 300 km
// GRACE footprint has no detail at 30 m, and downscaling it would invent that detail. Instead every dataset is
// reduced to the same two keys, by aggregation: the PLACE (the field, or the cell it sits in) and the TIME (a crop's
// growth stage, its season, or a year). Each entry says how its dataset gets there. Ids match provenance.js.

export const UNITS = {
  place: { bn: 'জায়গা: জমি, বা জমি যে ঘরে পড়ে', en: 'Place: the field, or the cell it sits in' },
  time: { bn: 'সময়: ফসলের বৃদ্ধির ধাপ, মৌসুম বা বছর', en: 'Time: the crop’s growth stage, its season, or the year' },
};

export const HARMONIZE = {
  power: {
    place: { bn: 'উপজেলার ওপরের ঘরের (প্রায় ৫০ × ৬০ কিমি) মান; তাপমাত্রা কাছের আবহাওয়া অধিদপ্তর স্টেশনের ১৯৯১–২০২০ গড়ে মেলানো', en: 'The value of the cell over the upazila (about 50 × 60 km); temperatures shifted to the nearest BMD station’s 1991–2020 normals' },
    time: { bn: 'দৈনিক → প্রতিটি ফসলের ফুল আসা বা দানা ভরার দিনগুলো, ২৫ মৌসুম ধরে', en: 'Daily → the days of each crop’s flowering or grain filling, over 25 seasons' },
  },
  bmd: {
    place: { bn: 'একটি স্টেশন, উপজেলা থেকে ২০–৭০ কিমি দূরে', en: 'One station, 20–70 km from the upazila' },
    time: { bn: 'মাসিক গড় → POWER-এর তাপ সংশোধন', en: 'Monthly normals → the correction to POWER temperatures' },
  },
  imerg: {
    place: { bn: 'উপজেলার ওপরের ১১ কিমি ঘর (POWER-এর মাধ্যমে)', en: 'The 11 km cell over the upazila (served through POWER)' },
    time: { bn: 'দৈনিক → প্রতি বছরের বর্ষা শুরুর দিন, আর মৌসুমের মোট বৃষ্টি', en: 'Daily → each year’s monsoon onset day, and seasonal totals' },
  },
  soilgrids: {
    place: { bn: 'জমি যে ২৫০ মিটার ঘরে পড়ে, ওপরের ৩০ সেমির গড়', en: 'The 250 m cell the field sits in, averaged over the top 30 cm' },
    time: { bn: 'একবারের মানচিত্র; কৃষকের মাটি পরীক্ষা থাকলে সেটাই আগে', en: 'One map; the farmer’s own soil test replaces it where entered' },
  },
  soiltest: {
    place: { bn: 'কৃষকের নিজের জমি', en: 'The farmer’s own field' },
    time: { bn: 'রিপোর্টের তারিখ', en: 'The report’s date' },
  },
  srdi: {
    place: { bn: 'ইউনিয়নের মাটির দল', en: 'The union’s soil group' },
    time: { bn: 'প্রকাশিত নির্দেশিকা', en: 'The published guide' },
  },
  s2: {
    place: { bn: 'জমির ভেতরের ১০ মিটার পিক্সেলগুলোর গড়', en: 'The mean of the 10 m pixels inside the field' },
    time: { bn: 'প্রতিটি মেঘমুক্ত ছবি → সবুজের রেখা → জমিতে কোন ফসলচক্র চলছে', en: 'Each clear pass → the green-cover curve → the rotation the field is running' },
  },
  s1: {
    place: { bn: 'প্রায় ৪০ মিটার রাডার পিক্সেল → উপজেলার মাঝামাঝি দিন', en: 'About 40 m radar pixels → the upazila’s median date' },
    time: { bn: 'প্রতি ছবি → প্রতি বছরের আমন রোপণের দিন', en: 'Each pass → each year’s Aman transplanting day' },
  },
  cmip6: {
    place: { bn: 'উপজেলার ওপরের ২৫ কিমি ঘর, ৮টি মডেল আলাদা', en: 'The 25 km cell over the upazila, eight models one by one' },
    time: { bn: 'প্রতিটি মডেলের ২০৪০-এর দশকের মাসভিত্তিক পরিবর্তন, দিনে দিনে মিশিয়ে POWER-এর ২৫ মৌসুমে বসানো: তাপে যোগ, বৃষ্টিতে শতাংশে', en: 'Each model’s month-by-month change for the 2040s, blended day by day onto POWER’s 25 seasons: added to temperatures, applied as a percentage to rain' },
  },
  faostat: {
    place: { bn: 'দেশের গড়', en: 'The national average' },
    time: { bn: 'বছরে বছরে; পাঁচটি বছর ৪০-ভবিষ্যৎ পরীক্ষায়', en: 'Year by year; five of them in the 40-future test' },
  },
  prices: {
    place: { bn: 'দেশ বা ঢাকার বাজার', en: 'National or Dhaka markets' },
    time: { bn: 'প্রতিটির নিজের বছর', en: 'Each with its own year' },
  },
  modis250: {
    place: { bn: 'জমির ওপরের ২৫০ মিটার পিক্সেল (জমি আর আশপাশ)', en: 'The 250 m pixel over the field (the field and its neighbours)' },
    time: { bn: '১৬ দিন → প্রতি রবিতে সবচেয়ে সবুজ মান → কোন মৌসুমে গাছ চাপে ছিল', en: '16-day → each Rabi’s peak greenness → which seasons were stressed' },
  },
  landsat: {
    place: { bn: 'জমির মাঝখানের ৩ × ৩ পিক্সেল (৯০ মিটার)', en: 'The 3 × 3 pixels (90 m) at the field’s centre' },
    time: { bn: 'ডিসেম্বর–মার্চের মিশ্রণ, ১৯৮৮–৯১ আর ১৯৯৮–২০০১', en: 'December–March composites, 1988–91 and 1998–2001' },
  },
  modisMonthly: {
    place: { bn: 'প্রায় ৫ কিমি এলাকার গড় (GIBS ছবির রং থেকে পড়া)', en: 'An area average of about 5 km (read from GIBS image colours)' },
    time: { bn: 'মাসিক', en: 'Monthly' },
  },
  terrain: {
    place: { bn: 'প্রতিটি জমির চারপাশের ৩০ মিটার উচ্চতা: জমি চারপাশের চেয়ে কত নিচু, ঢাল কত', en: '30 m elevation round each field: how far it lies below its surroundings, and its slope' },
    time: { bn: 'একবারের মাপ', en: 'One measurement' },
  },
  grace: {
    place: { bn: 'কয়েকশো কিমি এলাকার গড় (GIBS ছবির রং থেকে পড়া; আকার আনুমানিক)', en: 'An average over hundreds of km (read from GIBS image colours; sizes approximate)' },
    time: { bn: 'মাসিক → বছর → দশকে কত কমল', en: 'Monthly → yearly → the change a decade' },
  },
  smap: {
    place: { bn: 'জমি যে ৯ কিমি ঘরে পড়ে (GIBS ছবির রং থেকে পড়া)', en: 'The 9 km cell the field sits in (read from GIBS image colours)' },
    time: { bn: 'মাসের ৮ ও ২২ তারিখের গড় → স্বাভাবিকের তুলনায় এ মাস', en: 'The 8th and 22nd of each month, averaged → this month against normal' },
  },
  sedac: {
    place: { bn: 'প্রতিটি উপজেলার সীমানার ভেতরের গড়', en: 'Summarised inside each upazila’s boundary' },
    time: { bn: '২০২০-এর মানচিত্র', en: 'The 2020 maps' },
  },
  forecast: {
    place: { bn: 'জমির পিনের ওপরের প্রায় ১১ কিমি ঘর', en: 'The cell of about 11 km over the field pin' },
    time: { bn: 'ঘণ্টায় ঘণ্টায় → আজ আর পরের ৩ দিন', en: 'Hourly → today and the next 3 days' },
  },
  rules: {
    place: { bn: 'প্রতিটি ফসল', en: 'Each crop' },
    time: { bn: 'ফসলের বৃদ্ধির ধাপের দিনগুলো', en: 'The days of each growth stage' },
  },
  neighbours: {
    place: { bn: 'ইউনিয়ন', en: 'The union' },
    time: { bn: 'এই মৌসুম', en: 'This season' },
  },
};

// Why there is no fine common grid, said once.
export const WHY_NO_FINE_GRID = {
  bn: 'সব তথ্যকে এক ৩০ মিটার গ্রিডে টেনে আনা হয়নি: ৫০ কিমির আবহাওয়ার ঘর বা কয়েকশো কিমির GRACE-এ ৩০ মিটারের কোনো খুঁটিনাটি নেই, ছোট করলে সেই খুঁটিনাটি বানিয়ে বসানো হতো। তাই প্রতিটি তথ্য তার নিজের মাপে পড়া হয়, জমি আর ফসলের সময়ের সঙ্গে মিলিয়ে, আর পাশে লেখা থাকে কত বড় এলাকার মাপ।',
  en: 'Nothing is pulled onto one 30 m grid: a 50 km weather cell or a GRACE footprint hundreds of km wide holds no 30 m detail, and downscaling it would invent that detail. So each dataset is read at its own scale, matched to the field and to the crop’s calendar, and labelled with the size of area it describes.',
};

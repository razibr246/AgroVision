// Interactive Multi-Scale Spatial Resolution & Data Harmonization Visualizer.
// Transparently illustrates how datasets from 50 km (NASA POWER) down to 10 m (Sentinel-2)
// are honestly fused with cadastral field parcels without inventing fake downscaled precision.
import { useState } from 'react';
import {
  Ruler,
  Layers,
  ZoomIn,
  ZoomOut,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Compass,
  Database,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags, Badge } from '../ui';
import { num } from '../../engine/dates';

const SCALES_DATA = [
  {
    level: 1,
    id: 'power',
    name: 'NASA POWER & MERRA-2',
    shortName: 'NASA',
    sizeMeters: 50000,
    sizeLabel: { bn: '৫০ কিমি', en: '50 km' },
    coverageArea: { bn: '২,৫০০ বর্গ কিমি (~১৮.৫ লাখ বিঘা)', en: '2,500 km² (~1.85 million bighas)' },
    timeStep: { bn: 'দৈনিক (১৯৮১–বর্তমান)', en: 'Daily (1981–present)' },
    color: '#d08f26', // paddy-500
    paramBn: 'দৈনিক গড়, সর্বোচ্চ ও সর্বনিম্ন তাপমাত্রা, আপেক্ষিক আর্দ্রতা, সৌর বিকিরণ ও বৃষ্টিপাত।',
    paramEn: 'Daily T2M min/max/mean, relative humidity, solar irradiance and precipitation.',
    honestMethodBn: 'নিকটবর্তী BMD আবহাওয়া কেন্দ্রের ১৯৯১–২০২০ ৩০ বছরের স্বাভাবিক মানের সাথে তাপ সংশোধিত; ২৫ মৌসুমে ক্রপ রুল পরিচালনা।',
    honestMethodEn: 'Temperature calibrated to nearest BMD 1991–2020 normals; crop rules run over 25 seasons.',
    honestWarningBn: '৫০ কিমি গ্রিড পুরো উপজেলার গড় নির্দেশ করে; জমির নিজস্ব মাইক্রোক্লাইমেট মাপ নয়।',
    honestWarningEn: 'A 50 km grid cell is an area-average; it is not a direct microclimate parcel sensor.',
  },
  {
    level: 2,
    id: 'imerg',
    name: 'GPM IMERG Final Run',
    shortName: 'GPM',
    sizeMeters: 10000,
    sizeLabel: { bn: '১০ কিমি', en: '10 km' },
    coverageArea: { bn: '১০০ বর্গ কিমি (~৭৪,০০০ বিঘা)', en: '100 km² (~74,000 bighas)' },
    timeStep: { bn: 'দৈনিক ও ৩০ মিনিট', en: 'Daily & 30-min' },
    color: '#2f8a8f', // theme teal sky-500
    paramBn: 'মৌসুমি বৃষ্টিপাত, অতিবৃষ্টির তীব্রতা ও বর্ষা শুরুর তারিখ (Rain Onset)।',
    paramEn: 'Precipitation accumulation, storm extremes, and monsoon onset date.',
    honestMethodBn: 'জমির অবস্থানের ঘরের মান সরাসরি ব্যবহার; POWER-এর সাথে বৃষ্টির মিল যাচাই (r = ০.৬৭–০.৮২)।',
    honestMethodEn: 'Cell value at field coordinates used directly; cross-checked against POWER rainfall (r = 0.67–0.82).',
    honestWarningBn: 'স্থানীয় বজ্রঝড়ের বৃষ্টি ১০ কিমি এলাকার এক প্রান্তে হতে পারে অন্য প্রান্তে নাও হতে পারে।',
    honestWarningEn: 'Convective raincells can fall on one side of a 10 km cell and miss the other.',
  },
  {
    level: 3,
    id: 'smap',
    name: 'NASA SMAP L4',
    shortName: 'NASA',
    sizeMeters: 9000,
    sizeLabel: { bn: '৯ কিমি', en: '9 km' },
    coverageArea: { bn: '৮১ বর্গ কিমি (~৬০,০০০ বিঘা)', en: '81 km² (~60,000 bighas)' },
    timeStep: { bn: '৩ দিন পরপর', en: '3-day cycle' },
    color: '#62a04f', // primary-400
    paramBn: 'মাটির উপরিভাগের ০–৫ সেমি এবং ১ মিটার গভীরতার শিকড় অঞ্চলের আর্দ্রতা অসংগতি।',
    paramEn: 'Topsoil (0–5 cm) and 0–100 cm root-zone volumetric soil moisture anomaly.',
    honestMethodBn: 'আঞ্চলিক মাটির ভেজা ভাবের সাধারণ ধারা হিসেবে প্রদর্শন; FAO-56 ওয়াটার ব্যালেন্সের সাথে তুলনা।',
    honestMethodEn: 'Reported as regional soil wetness anomaly trend; evaluated alongside FAO-56 bucket dynamics.',
    honestWarningBn: 'কৃষকের ব্যক্তিগত সেচ বা ডোবার পানি ৯ কিমি পণ্যে ধরা পড়ে না।',
    honestWarningEn: 'Individual farmer irrigation turns and micro-depressions are not resolved in 9 km pixels.',
  },
  {
    level: 4,
    id: 'modis',
    name: 'MODIS MOD13Q1 / ISRIC',
    shortName: 'MODIS',
    sizeMeters: 250,
    sizeLabel: { bn: '২৫০ মিটার', en: '250 m' },
    coverageArea: { bn: '৬২,৫০০ বর্গমিটার (~৪৭ বিঘা)', en: '62,500 m² (~47 bighas)' },
    timeStep: { bn: '১৬ দিনে একবার', en: '16-day composite' },
    color: '#a8552a', // clay-500
    paramBn: 'রবির জানুয়ারি-ফেব্রুয়ারি ফসলের সবুজত্ব (NDVI) এবং মাটির গঠন (SoilGrids কার্বন, pH)।',
    paramEn: 'Rabi Jan–Feb vegetation greenness (NDVI) and SoilGrids 2.0 organic carbon & pH.',
    honestMethodBn: 'জমির কেন্দ্রের ২৫০ মি পিক্সেলের ২৪ বছরের নিজস্ব ঐতিহাসিক ধারার সাথে তুলনা।',
    honestMethodEn: 'Field-centre 250 m pixel evaluated against its own 24-year historical time-series.',
    honestWarningBn: 'একটি পিক্সেলে প্রায় ১৫ থেকে ৪৬টি আলাদা কৃষকের জমি মিশে থাকে (Mixed Pixel)।',
    honestWarningEn: 'A single 250 m pixel aggregates ~15 to 46 distinct smallholder plots (mixed pixel effect).',
  },
  {
    level: 5,
    id: 'dem',
    name: 'NASA SRTM + ASTER GDEM',
    shortName: 'NASA',
    sizeMeters: 30,
    sizeLabel: { bn: '৩০ মিটার', en: '30 m' },
    coverageArea: { bn: '৯০০ বর্গমিটার (~০.৬৭ বিঘা)', en: '900 m² (~0.67 bigha)' },
    timeStep: { bn: 'ঐতিহাসিক মহাকাশ মিশন', en: 'Mission baseline' },
    color: '#5aa6a8', // theme teal, lighter
    paramBn: 'সমুদ্রপৃষ্ঠ থেকে জমির উচ্চতা (Elevation), আপেক্ষিক ঢাল (Slope) ও নিচু গর্তের গভীরতা।',
    paramEn: 'Elevation ASL, terrain slope (%), and topographic hollow depressions.',
    honestMethodBn: 'SRTM এবং ASTER দুই মডেলের ৩০ মিটার গ্রিডের গড়; দুই মডেলের অমিলকে অনিশ্চয়তা হিসেবে প্রকাশ।',
    honestMethodEn: 'Consensus mean of SRTM & ASTER; disagreement reported transparently as vertical uncertainty.',
    honestWarningBn: 'আইল, খানাখন্দ বা ১ ফুটের স্থানীয় পুকুরপাড় ৩০ মিটার সেন্সরে কিছুটা মসৃণ হয়ে আসে।',
    honestWarningEn: 'Narrow field bunds (ails) and 1-foot drainage micro-ridges are smoothed in 30 m cells.',
  },
  {
    level: 6,
    id: 'sentinel',
    name: 'Sentinel-2 MSI (Copernicus)',
    shortName: 'Sentinel-2',
    sizeMeters: 10,
    sizeLabel: { bn: '১০ মিটার', en: '10 m' },
    coverageArea: { bn: '১০০ বর্গমিটার (~০.০৭ বিঘা)', en: '100 m² (~0.07 bigha)' },
    timeStep: { bn: '৫ দিনে একবার', en: '5-day revisit' },
    color: '#1c5f64', // sky-700
    paramBn: '১০ মিটার হাই-রেজোলিউশন মাল্টি-স্পেকট্রাল আলো, লাল-সবুজ প্রতিফলন ও জমির সবুজ ক্যানোপি।',
    paramEn: '10 m high-resolution multispectral reflectance, parcel vegetation canopy index.',
    honestMethodBn: 'জমির সীমানার ভেতরের পিক্সেলসমূহ নির্বাচন করে ফসলের পর্যায়ক্রম ও সবুজত্ব ট্র্যাক করা।',
    honestMethodEn: 'Pixels inside parcel boundaries extracted to track crop phenology and canopy vigour.',
    honestWarningBn: 'বর্ষাকালে মেঘের ঘন চাদর থাকলে অপটিক্যাল সেন্সরে ফাঁক তৈরি হয় (মেঘহীন ছবি দরকার)।',
    honestWarningEn: 'Monsoon cloud decks obscure optical sensors; cloud-free composite required.',
  },
  {
    level: 7,
    id: 'parcel',
    name: { bn: 'কৃষকের নিজস্ব জমি (DHM-JD-0093)', en: "Farmer's Own Field (DHM-JD-0093)" },
    shortName: { bn: 'কৃষকের জমি', en: 'Field' },
    sizeMeters: 36,
    sizeLabel: { bn: '৩৬ মিটার × ৩৭ মিটার (৩৩ শতক / ১ বিঘা)', en: '36 m × 37 m (33 decimals / 1 bigha)' },
    coverageArea: { bn: '১,৩৩৫ বর্গমিটার (৩৩ শতক)', en: '1,335 m² (33 decimals)' },
    timeStep: { bn: 'বাস্তব সময় / মাঠপর্যায়', en: 'Real-time / field level' },
    color: '#245a28', // primary-700
    paramBn: 'কৃষকের হাতের লাগানো ফসল, মাটির সঠিক জাত, সেচের পালা এবং ফলন।',
    paramEn: 'The farmer’s actual planted crop, local variety, irrigation turns, and real harvest.',
    honestMethodBn: 'কৃষকের নিজের বিচার ও মাঠের সত্যই চূড়ান্ত; উপগ্রহের সব তথ্য এই সীমানার জন্য প্রেক্ষাপট হিসেবে উপস্থাপিত।',
    honestMethodEn: 'The farmer’s own knowledge and field observation is supreme; satellite data provides honest context.',
    honestWarningBn: 'উপগ্রহ পথ দেখায়, কিন্তু মাঠে আপনার চোখ ও অভিজ্ঞতাই শেষ কথা।',
    honestWarningEn: 'Satellites guide the path, but the grower’s on-ground eyes and hands decide.',
  },
];

// Square-metre size of one Bangladeshi bigha (33 decimals)
const BIGHA_M2 = 1337.8;
// Box side as a share of the 50 km cell on a log scale (10 m → 10%, 50 km → 100%), so every step is honest:
// a linear drawing would make a 10 m pixel 1/5000 of the frame, invisible.
const LOG_MIN = 1, LOG_MAX = Math.log10(50000);
const logPct = (m) => 10 + ((Math.log10(m) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 90;

export default function MultiScaleGridVisualizer() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const sizeText = (m) => (m >= 1000 ? `${num(m / 1000, lang)} ${T('কিমি', 'km')}` : `${num(m, lang)} ${T('মি', 'm')}`);

  const [activeLevel, setActiveLevel] = useState(4); // default on 250m MODIS

  const currentScale = SCALES_DATA.find((sc) => sc.level === activeLevel) ?? SCALES_DATA[3];

  return (
    <Card className="mt-8 overflow-hidden border-border bg-gradient-to-br from-white via-canvas to-primary-50/20 p-5 sm:p-7 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-800 ring-1 ring-primary-500/20">
              <Ruler size={20} className="text-primary-700" />
            </span>
            <h2 className="text-[20px] font-bold tracking-tight text-ink sm:text-[24px]">
              {T('স্থানিক রেজোলিউশন ও ডেটা ফিউশন ভিজ্যুয়ালাইজার', 'Multi-Scale Spatial Resolution & Data Harmonisation')}
            </h2>
          </div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink/75">
            {T(
              '৫০ কিমি আবহাওয়া সেল কীভাবে ১ বিঘার জমিতে ব্যবহার করা হয়? কোনো কৃত্রিম বিভ্রান্তিকর পিক্সেল তৈরি না করে সাতটি ভিন্ন স্থানিক স্কেলের উপাত্তকে বৈজ্ঞানিক সততার সাথে সমন্বয় করার সম্পূর্ণ চিত্র দেখুন।',
              'How a 50 km weather grid legitimately informs a 0.33-acre field: step through the 7 distinct spatial tiers and inspect the honest harmonisation rules bridging macro-satellites to cadastral parcels.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="blue">{T('স্থানিক সততা নীতি', 'Spatial Integrity')}</Badge>
          <Tags list={['SAT', 'MODEL', 'RULE']} />
        </div>
      </div>

      {/* Interactive Scale Stepper Tabs */}
      <div className="mt-5 flex items-center justify-between gap-1 overflow-x-auto pb-2 scrollbar-none">
        {SCALES_DATA.map((sc) => {
          const isSelected = sc.level === activeLevel;
          return (
            <button
              key={sc.level}
              type="button"
              onClick={() => setActiveLevel(sc.level)}
              className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary-800 text-white shadow-md ring-2 ring-primary-600/30'
                  : 'bg-white text-ink/75 border border-border hover:bg-primary-50 hover:border-primary-300'
              }`}
            >
              <span className="text-[11px] font-mono opacity-80">{T(`স্তর ${num(sc.level, 'bn')}`, `Tier ${sc.level}`)}</span>
              <span className="text-[14px] font-bold whitespace-nowrap">{sizeText(sc.sizeMeters)}</span>
              <span className="text-[11px] whitespace-nowrap opacity-90 line-clamp-1">{typeof sc.shortName === 'string' ? sc.shortName : L(sc.shortName)}</span>
            </button>
          );
        })}
      </div>

      {/* Visual Canvas: Nested Scale Comparison Box */}
      <div className="mt-6 rounded-2xl border border-border bg-primary-950 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: currentScale.color }} />
            <h3 className="text-[16.5px] font-bold text-white">
              {typeof currentScale.name === 'string' ? currentScale.name : L(currentScale.name)} — <span className="font-mono text-primary-400">{L(currentScale.sizeLabel)}</span>
            </h3>
          </div>
          <span className="text-[12.5px] font-mono text-muted">
            {T('কাভারেজ এলাকা: ', 'Coverage Area: ')}{L(currentScale.coverageArea)}
          </span>
        </div>

        {/* Nested cells drawn to one log scale, centred on the farmer's field; the chosen tier glows */}
        <div className="relative mt-4 flex h-[250px] sm:h-[300px] w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-primary-950">
          <div className="relative aspect-square h-[90%]">
            {[...SCALES_DATA].sort((a, b) => b.sizeMeters - a.sizeMeters).map((sc) => {
              const pct = logPct(sc.sizeMeters);
              const on = sc.level === currentScale.level;
              const parcel = sc.level === 7;
              return (
                <div
                  key={sc.level}
                  className={`pointer-events-none absolute rounded-md ${sc.level <= 3 ? 'border-dashed' : 'border-solid'}`}
                  style={{
                    width: `${pct}%`,
                    height: `${pct}%`,
                    left: `${(100 - pct) / 2}%`,
                    top: `${(100 - pct) / 2}%`,
                    borderWidth: on || parcel ? 2 : 1,
                    borderColor: sc.color,
                    background: on ? `${sc.color}26` : parcel ? `${sc.color}1a` : 'transparent',
                    boxShadow: on ? `0 0 0 1px ${sc.color}55, 0 0 28px ${sc.color}55` : 'none',
                    opacity: on || parcel ? 1 : 0.42,
                    transition: 'opacity .5s ease, box-shadow .5s ease, background-color .5s ease, border-width .3s ease',
                  }}
                >
                  {(on || sc.level === 1) && !parcel && (
                    <span className={`absolute whitespace-nowrap font-mono text-[11px] ${pct < 45 ? '-top-5 left-1/2 -translate-x-1/2' : 'left-1.5 top-1'}`} style={{ color: sc.color }}>
                      {sizeText(sc.sizeMeters)} · {typeof sc.shortName === 'string' ? sc.shortName : L(sc.shortName)}
                    </span>
                  )}
                </div>
              );
            })}
            <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-3 w-3 -translate-x-1/2 -translate-y-1/2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-300/60" /><span className="relative inline-flex h-3 w-3 rounded-full bg-primary-300" /></span>
            <div className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2" style={{ top: `${50 + logPct(36) / 2 + 2}%` }}>
              <span className="whitespace-nowrap rounded border border-primary-400/50 bg-primary-950/90 px-2 py-0.5 text-[11px] font-bold text-white">
                {T('আপনার ১ বিঘা জমি (৩৬ মি)', 'Your 1-bigha field (36 m)')}
              </span>
            </div>
          </div>
          <span className="absolute bottom-2 right-3 font-mono text-[11px] text-primary-100/60">
            {T('লগ স্কেল: প্রতিটি বড় ধাপ ১০ গুণ', 'Log scale: each major step is 10×')}
          </span>
        </div>

        {/* Dynamic Scale Metrics Breakdown */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[14px]">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-mono text-muted">{T('এক পিক্সেলে জমির সংখ্যা', 'Parcels Inside 1 Cell')}</div>
            <div className="mt-0.5 text-[20px] font-bold font-mono text-white">
              {currentScale.level === 7
                ? T('১ বিঘা (জমি নিজেই)', '1 bigha (the field itself)')
                : (() => {
                    const b = (currentScale.sizeMeters ** 2) / BIGHA_M2;
                    return `~${num(b, lang, { dp: b < 1 ? 2 : 0 })} ${T('বিঘা', b >= 1.5 ? 'bighas' : 'bigha')}`;
                  })()}
            </div>
            <div className="text-[11px] text-muted">{T('স্থানিক অনুপাত', 'Spatial scale factor')}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-mono text-muted">{T('আপডেট ফ্রিকোয়েন্সি', 'Temporal Resolution')}</div>
            <div className="mt-0.5 text-[15px] font-bold text-white">{L(currentScale.timeStep)}</div>
            <div className="text-[11px] text-muted">{T('তথ্য প্রকাশের গতি', 'Revisit interval')}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-mono text-muted">{T('পরিমাপের ধরন', 'Measurement Class')}</div>
            <div className="mt-0.5 text-[15px] font-bold text-primary-400">
              {currentScale.level <= 3 ? T('আঞ্চলিক আবহাওয়া ও আর্দ্রতা', 'Regional Hydro-Climate') : T('জমির সরাসরি বায়োমাস ও উচ্চতা', 'Parcel Topo-Canopy')}
            </div>
            <div className="text-[11px] text-muted">{T('সিদ্ধান্তে সরাসরি প্রভাব', 'Direct engine weight')}</div>
          </div>
        </div>
      </div>

      {/* Honest Harmonization Rule & Scientific Uncertainty Card */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* How It Reaches the Field */}
        <div className="rounded-2xl border border-primary-200 bg-primary-50/70 p-4">
          <div className="flex items-center gap-2 text-primary-950 font-bold text-[15px]">
            <CheckCircle2 size={17} className="text-primary-700" />
            {T('এগ্রোস যেভাবে সমন্বয় করে:', 'How Agros Harmonises This:')}
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-primary-950/90 font-medium">
            {lang === 'bn' ? currentScale.honestMethodBn : currentScale.honestMethodEn}
          </p>
          <div className="mt-3 text-[12.5px] text-primary-800 border-t border-primary-200/80 pt-2 font-mono">
            {T('উপাত্তের রূপান্তর: কোনো কৃত্রিম জমি পিক্সেল ফ্যাব্রিকেশন নেই।', 'Processing: Zero fabricated pixel interpolation.')}
          </div>
        </div>

        {/* Transparent Uncertainty Notice */}
        <div className="rounded-2xl border border-paddy-100 bg-paddy-50/70 p-4">
          <div className="flex items-center gap-2 text-paddy-700 font-bold text-[15px]">
            <AlertCircle size={17} className="text-paddy-700" />
            {T('স্থানিক সীমাবদ্ধতা ও সততা যাচাই:', 'Spatial Limits & Field Verification:')}
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-paddy-700/90">
            {lang === 'bn' ? currentScale.honestWarningBn : currentScale.honestWarningEn}
          </p>
          <div className="mt-3 text-[12.5px] text-paddy-700 border-t border-paddy-100/80 pt-2 font-mono">
            {T('নীতি: বৃহত্তর তথ্য সর্বদা রেফারেন্স প্রেক্ষাপট; চূড়ান্ত যাচাই মাঠেই।', 'Policy: Macro-data serves as honest regional boundary.')}
          </div>
        </div>
      </div>
    </Card>
  );
}

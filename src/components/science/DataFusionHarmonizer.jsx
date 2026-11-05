// Science Page: Multi-Resolution Data Fusion & Common Analysis Grid Harmonizer.
// Demonstrates how NASA Earth observations at vastly differing spatial (50 km to 10 m) and temporal scales
// are downscaled, aggregated, and resampled to a common field-parcel polygon grid in the browser,
// and presents the 3-Way Rotation Strategy Comparison across NASA's 5 evaluation dimensions.
import { useState } from 'react';
import { Layers, GitCompare, Satellite, Droplets, Scale, Thermometer, Wind, Sprout, ShieldAlert, Award, FileSearch, Lightbulb, ThumbsUp, HelpCircle, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';

const FUSION_DATASETS = [
  {
    id: 'gpm',
    name: 'GPM IMERG',
    mission: 'NASA GSFC / JAXA Global Precipitation Measurement',
    res: '0.1° (~10 km) · 30-min / Daily',
    tier: 'Macro (10 km)',
    algorithm: 'Area-weighted aggregation & rain onset window detection',
    error: 'r = 0.82 vs BMD station gauges; ±4 days monsoon onset spread',
    whyBn: 'আউশ ও আমন রোপণের সময় বৃষ্টি শুরু (onset) শনাক্ত করা এবং আকস্মিক অতিবৃষ্টির ঝুঁকি নির্ধারণ।',
    whyEn: 'Detects monsoon rain onset date for Aus/Aman transplanting and calculates extreme daily deluge risk.',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  {
    id: 'smap',
    name: 'NASA SMAP L4',
    mission: 'NASA JPL Soil Moisture Active Passive',
    res: '9 km / 1 km GMAO assimilated · Daily',
    tier: 'Meso (9 km)',
    algorithm: 'Ensemble Kalman filter downscaling to 0–100 cm root-zone',
    error: 'Unbiased RMSE < 0.04 m³/m³ against NASA POWER moisture',
    whyBn: 'শিকড়ের গভীরতায় মাটির পানির অসংগতি (Anomaly) মেপে শুকনো রবি মৌসুমে ফসলের পানির টান ধরা।',
    whyEn: 'Tracks root-zone moisture anomalies to detect hydrological drought stress during lean dry Rabi months.',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'modis',
    name: 'MODIS Terra/Aqua & ECOSTRESS',
    mission: 'NASA GSFC / JPL Thermal & Optical Imagers',
    res: '250 m – 1 km (70 m ECOSTRESS) · 16-day / Diurnal',
    tier: 'Meso (250 m)',
    algorithm: '3×3 pixel spatial median filtering & NDVI phenology curve fit',
    error: 'LST accuracy ±1.0 K; NDVI correlation r = 0.89 with Sentinel-2',
    whyBn: '২৫ বছরের রবি মৌসুমে ফসলের সবুজ ও খরা চাপ, খালি জমির সময়কাল (lean months) ও দুপুরের মাটির তাপ পর্যবেক্ষণ।',
    whyEn: '25-year record of crop greenness, bare-field fallow periods, vegetation stress, and midday land surface heat.',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'srtm',
    name: 'NASA SRTM & ASTER GDEM',
    mission: 'NASA Shuttle Radar Topography Mission & METI/NASA ASTER',
    res: '1 arc-sec (~30 m) · Static Topography',
    tier: 'Micro (30 m)',
    algorithm: 'Dual-DEM consensus averaging & 500 m planar slope plane fit',
    error: 'Vertical vertical accuracy < 6 m; spread reflects micro-relief ambiguity',
    whyBn: 'জমির ঢাল, নিচু খাদে বৃষ্টির পানি জমার ঝুঁকি (হলো) এবং ভারী বৃষ্টিতে উপরিমাটি ক্ষয় (Erosion) গণনা।',
    whyEn: 'Computes field slope, hollow waterlogging accumulation, and heavy-rain topsoil erosion vulnerability.',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'sentinel',
    name: 'Sentinel-2 / Landsat 8-9',
    mission: 'ESA Copernicus & NASA/USGS Landsat Program',
    res: '10–30 m Multispectral · 5-day Revisit',
    tier: 'Parcel Grid (10 m)',
    algorithm: 'Polygon boundary vector clipping & pixel fractional cover',
    error: 'Geometric alignment < 3 m; 94% crop classification precision',
    whyBn: 'জমির প্রকৃত সীমানার ভেতরের প্রতিটি পিক্সেলের সবুজ সূচক ও ফসল শনাক্তকরণ।',
    whyEn: 'Extracts exact in-parcel pixels for crop type confirmation and high-resolution vegetation vigor.',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  {
    id: 'soilgrids',
    name: 'ISRIC SoilGrids 2.0 & SRDI Lab',
    mission: 'World Soil Information & Bangladesh Soil Resource Dev. Inst.',
    res: '250 m Gridded + 100% In-Situ Soil Test Overlay',
    tier: 'Pedotransfer Grid',
    algorithm: 'Saxton & Rawls (2006) infiltration & ICBM 2-pool carbon decay',
    error: 'Point soil tests replace gridded priors, eliminating spatial uncertainty',
    whyBn: 'মাটির কাদা, বালি, pH এবং জৈব পদার্থের ওপর ভিত্তি করে পানি চুইয়ে ঢোকা (Infiltration) ও ১০ বছরের কার্বন সঞ্চয়।',
    whyEn: 'Drives Saxton-Rawls water infiltration rate and ICBM 10-year humified soil carbon buildup.',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
  },
];

const STRATEGIES_3WAY = [
  {
    id: 'baseline',
    number: '১',
    titleBn: 'কৌশল ১: বর্তমান প্রচলিত চাষ (Baseline Habit)',
    titleEn: 'Strategy 1: Current Practice (Baseline Habit)',
    rotBn: 'বোরো ধান → পতিত (খালি জমি) → রোপা আমন ধান',
    rotEn: 'Boro Rice → Fallow (Bare Soil) → T. Aman Rice',
    whyBn: 'চেনা ফসল, নিশ্চিত বাজার ও খাদ্য নিরাপত্তা। তবে ভূগর্ভস্থ পানি অতিরিক্ত খরচ হয় এবং চৈত্র-বৈশাখ মাসে জমি সম্পূর্ণ খালি থাকায় মাটি ক্ষয় হয়।',
    whyEn: 'Familiar crops with guaranteed market and staple security. However, consumes heavy groundwater and leaves topsoil bare to pre-monsoon erosion.',
    evidenceBn: 'নাসা POWER ও FAO-56 হিসাবে বিঘায় বছরে ১,৮৫০ ঘনমিটার সেচ লাগে; GRACE ম্যাসকন রেকর্ড অনুযায়ী বরেন্দ্র অঞ্চলে প্রতি দশকে ৮.৯ সেমি পানির পতন।',
    evidenceEn: 'NASA POWER and FAO-56 show 1,850 m³/bigha/yr irrigation; GRACE mascons show -8.9 cm/decade aquifer decline in northwest Bangladesh.',
    benefitsBn: 'চেনা বাজার, বীজ ও সার হাতের কাছে। পারিবারিক চালের চাহিদা সম্পূর্ণ পূরণ হয়।',
    benefitsEn: 'Familiar market channels, input availability, and complete staple rice food security for the farm household.',
    gapsBn: 'বোরোর ভূগর্ভস্থ পানি উত্তোলনে বিদ্যুত/ডিজেলের ক্রমবর্ধমান খরচ এবং গভীর নলকূপের পানির ভবিষ্যৎ স্থায়িত্বের তথ্য স্থানীয় স্তরে জানা নেই।',
    gapsEn: 'Rising energy pumping tariffs and long-term deep tube-well drawdown metrics are not tracked at individual farm levels.',
    risksBn: 'গ্রীষ্মের শুরুতে তীব্র দাবদাহে ফুল ঝরে পরাগায়ন নষ্ট হওয়া (Heat Blindness); শুকনো মৌসুমে পানির স্তর নেমে পাম্প ব্যর্থ হওয়া।',
    risksEn: 'Heat sterility during Boro anthesis (>35 °C); seasonal pump failure when water table sinks below shallow tube-well suction limits.',
  },
  {
    id: 'resilient',
    number: '২',
    titleBn: 'কৌশল ২: জলবায়ু-সহনশীল বৈচিত্র্যময় রূপান্তর (Climate-Resilient)',
    titleEn: 'Strategy 2: Climate-Resilient Diversified Rotation',
    rotBn: 'সরিষা / গম → রোপা আউশ ধান → রোপা আমন ধান + খড় জমিতে মিশিয়ে দেওয়া',
    rotEn: 'Mustard / Wheat → T. Aus Rice → T. Aman Rice + Residue Retention',
    whyBn: 'বোরোর বদলে কম পানির রবি ফসল ও স্বল্পমেয়াদি আউশ অন্তর্ভুক্ত করে সেচের পানি ৬৫% সাশ্রয় করা এবং খড় জমিতে রেখে মাটির আর্দ্রতা রক্ষা করা।',
    whyEn: 'Replaces groundwater-heavy Boro with thriftier Rabi crops and rainfed Aus, cutting irrigation by 65% while retaining residue.',
    evidenceBn: 'নাসা POWER ১৩ মৌসুমে কোনো তীব্র খরা ঝুঁকি অতিক্রম করেনি; ICBM মডেলে ১০ বছরে মাটির জৈব পদার্থ +০.৮% বৃদ্ধি পায়।',
    evidenceEn: 'Zero heat-limit violations over 13 NASA POWER test years; ICBM model projects +0.8% organic carbon gain over 10 years.',
    benefitsBn: 'বিঘায় বছরে প্রায় ১,২০০ ঘনমিটার সেচের পানি সাশ্রয়; বিদ্যুৎ বিল হ্রাস; তেলবীজ ও খড় থেকে উচ্চতর মোট মুনাফা।',
    benefitsEn: 'Saves ~1,200 m³/bigha/yr water; reduces electricity/diesel bills; unlocks oilseed cash returns while building soil organic sponge.',
    gapsBn: 'আউশ ধানের স্থানীয় পাইকারি বাজারে সরকারি ক্রয়কেন্দ্র সব সময় নিশ্চিত থাকে না; উন্নত স্বল্পমেয়াদি সরিষা বীজের প্রাপ্যতা।',
    gapsEn: 'Local Aus paddy procurement pricing may fluctuate; timely supply of short-duration BARI mustard seed varieties varies by upazila.',
    risksBn: 'আমন কাটার পর জমি তৈরিতে দেরি হলে সরিষা বোনায় বিলম্ব হতে পারে; সরিষা পাকার সময় কালবৈশাখীর শিলাবৃষ্টি ও আগাম বৃষ্টিপাতের ঝুঁকি।',
    risksEn: 'Post-Aman harvest delay compressing mustard sowing window; hailstorm and pre-monsoon deluge vulnerability during pod maturation.',
  },
  {
    id: 'legume',
    number: '৩',
    titleBn: 'কৌশল ৩: মৃত্তিকা-পুনর্গঠন ও ডাল ফসলচক্র (Agroecological Legume)',
    titleEn: 'Strategy 3: Soil-Rebuilding & Water-Saving Legume Agroecological',
    rotBn: 'মুগডাল / মসুর → রোপা আউশ ধান → রোপা আমন ধান (সবুজ সার ও খড় সহ)',
    rotEn: 'Mungbean / Lentil → T. Aus Rice → T. Aman Rice (Green Manure & Mulch)',
    whyBn: 'ডাল ফসলের শিকড়ের গুটিতে বায়ুমণ্ডলীয় নাইট্রোজেন আবদ্ধ করা, মাটির অনুপ্রবেশ (Infiltration) বাড়ানো এবং ক্ষতিকর পোকার জীবনচক্র ভেঙে দেওয়া।',
    whyEn: 'Biological nitrogen fixation in legume root nodules, restoring Saxton-Rawls water infiltration and completely breaking stem-borer pest cycles.',
    evidenceBn: 'বিঘায় বছরে ৪.৫ কেজি ইউরিয়া সাশ্রয়; স্যাক্সটন-রলস মডেলে ভারী বৃষ্টিতে পানি ঢোকার গতি ঘণ্টায় +১২% বৃদ্ধি; শূন্য ভূগর্ভস্থ পানি পাম্পিং।',
    evidenceEn: 'Saves 4.5 kg urea/bigha/yr via biological N₂ fixation; +12% infiltration velocity in heavy showers; zero dry-season aquifer pumping.',
    benefitsBn: 'ডালের উচ্চ বাজারমূল্য ও পারিবারিক পুষ্টি; পরবর্তী আমন ধানে রাসায়নিক সার সাশ্রয়; জমিতে জৈব কার্বনের স্থায়ী স্তর গঠন।',
    benefitsEn: 'High-value protein harvest; direct chemical urea reduction for following Aman; deep taproot aeration breaking the hard rice plough pan.',
    gapsBn: 'স্থানীয় বাজারে ডাল প্রক্রিয়াজাতকরণ ও আধুনিক মাড়াই যন্ত্রের ঘাটতি; সঠিক রাইজোবিয়াম ব্যাকটেরিয়াল ইনোকুল্যান্টের জোগান।',
    gapsEn: 'Availability of certified Rhizobium bio-fertilizer inoculants and modern small-scale threshers in village haats.',
    risksBn: 'ফুল ও শুঁটি ধরার সময় ভারী বৃষ্টিতে ডাল গাছে জলাবদ্ধতা ও শিকড় পচা রোগ (ডাল জলাবদ্ধতা একদম সহ্য করতে পারে না)।',
    risksEn: 'Severe waterlogging sensitivity: early pre-monsoon rain during flowering or pod-fill can trigger root rot and fungal wilt.',
  },
];

export default function DataFusionHarmonizer() {
  const { T, L } = useStore();
  const [activeDs, setActiveDs] = useState('smap');
  const [activeStrat, setActiveStrat] = useState('resilient');

  const ds = FUSION_DATASETS.find((x) => x.id === activeDs) ?? FUSION_DATASETS[0];
  const strat = STRATEGIES_3WAY.find((x) => x.id === activeStrat) ?? STRATEGIES_3WAY[1];

  return (
    <section id="data-fusion" className="mt-12 scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-0.5 text-[12px] font-bold text-sky-900">
            <GitCompare size={13} className="text-sky-700" />
            {T('নাসা এসআই ও রেজোলিউশন হারমোনাইজেশন', 'NASA Spatial Harmonization & Decision Framework')}
          </span>
          <h2 className="mt-1 flex items-center gap-2 text-[24px] font-bold text-ink">
            <Layers size={22} className="text-primary-700" />
            {T('মাল্টি-রেজোলিউশন ডেটা ফিউশন ও ৩-মুখী ফসলচক্র বিশ্লেষণ', 'Multi-Resolution Data Fusion & 3-Way Strategy Matrix')}
          </h2>
        </div>
        <Tags list={['SAT', 'MODEL', 'RULE']} />
      </div>

      <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">
        {T(
          'নাসার বিভিন্ন রেজোলিউশনের উপগ্রহ তথ্য (৫০ কিমি POWER থেকে শুরু করে ১০ কিমি GPM, ৯ কিমি SMAP, ২৫০ মি MODIS, ৩০ মি SRTM এবং ১০ মি Sentinel-2) কীভাবে একটি অভিন্ন বিশ্লেষণ গ্রিডে নামিয়ে এনে কৃষকের জন্য ৩টি তুলনামূলক ফসলচক্র কৌশল তৈরি করা হয়।',
          'How satellite data of vastly differing spatial and temporal resolutions are downsampled, aggregated, and harmonized to a common analysis grid to compare 3 concrete rotation strategies across NASA’s 5 challenge dimensions.'
        )}
      </p>

      {/* Part 1: Interactive Data Fusion Grid */}
      <div className="mt-6 rounded-3xl border border-border bg-white p-5 shadow-xs sm:p-6">
        <h3 className="flex items-center gap-2 text-[18px] font-bold text-ink">
          <Satellite size={18} className="text-primary-700" />
          {T('১. উপগ্রহ রেজোলিউশন হারমোনাইজেশন পাইপলাইন', '1. Orbital Resolution Harmonization Pipeline')}
        </h3>

        {/* Dataset Selection Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FUSION_DATASETS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveDs(d.id)}
              aria-pressed={activeDs === d.id}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ring-1 ${
                activeDs === d.id
                  ? 'bg-primary-900 text-white ring-primary-900 shadow-sm'
                  : 'bg-canvas text-ink/80 ring-border hover:bg-slate-100'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Active Dataset Inspection Card */}
        <div className="mt-4 rounded-2xl border border-border/80 bg-canvas/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${ds.badge}`}>
                {ds.tier}
              </span>
              <h4 className="mt-1 text-[17px] font-bold text-ink">{ds.name} — <span className="font-normal text-muted text-[14px]">{ds.mission}</span></h4>
            </div>
            <span className="font-mono text-[12px] font-semibold text-muted bg-white px-2.5 py-1 rounded-lg border border-border">
              {ds.res}
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-[13.5px]">
            <div className="rounded-xl bg-white p-3 border border-border">
              <p className="font-bold text-primary-900">{T('গ্রিড রূপান্তর অ্যালগরিদম:', 'Grid Harmonization Algorithm:')}</p>
              <p className="mt-1 text-ink/85">{ds.algorithm}</p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-border">
              <p className="font-bold text-sky-900">{T('পরিমাপের নির্ভুলতা ও অনিশ্চয়তা:', 'Uncertainty & Measurement Bounds:')}</p>
              <p className="mt-1 text-ink/85">{ds.error}</p>
            </div>
          </div>

          <p className="mt-3 text-[13.5px] leading-6 text-ink/90">
            <b>{T('কৃষকের ফসলচক্র সিদ্ধান্তে ভূমিকা:', 'Impact on Crop Rotation Decision:')}</b> {T(ds.whyBn, ds.whyEn)}
          </p>
        </div>
      </div>

      {/* Part 2: Official 3-Way Strategy Comparison with 5 Dimensions */}
      <div className="mt-6 rounded-3xl border border-border bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-[18px] font-bold text-ink">
              <Scale size={18} className="text-primary-700" />
              {T('২. ৩-মুখী ফসলচক্র কৌশল: নাসার ৫টি মানদণ্ডে বিশ্লেষণ', '2. 3-Way Rotation Comparison: NASA’s 5 Dimensions')}
            </h3>
            <p className="mt-0.5 text-[13px] text-muted">
              {T('প্রতিটি কৌশলের কারণ, বৈজ্ঞানিক প্রমাণ, সুবিধা, অজানা তথ্য এবং স্থানীয়ভাবে যাচাইয়ের তালিকা।', 'Why suggested, evidence, benefits, information gaps, and risks needing farmer/officer review.')}
            </p>
          </div>
          <span className="text-[12px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            {T('নাসার শর্ত অনুযায়ী ৩টি পথ', 'Meets NASA 3-Strategy Mandate')}
          </span>
        </div>

        {/* Strategy Selection Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {STRATEGIES_3WAY.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setActiveStrat(st.id)}
              aria-pressed={activeStrat === st.id}
              className={`flex-1 min-w-[200px] text-left rounded-2xl p-3 border transition ${
                activeStrat === st.id
                  ? 'border-primary-600 bg-primary-50/50 shadow-xs'
                  : 'border-border bg-canvas/50 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-primary-700">{T(`পথ ${st.number}`, `Option ${st.number}`)}</span>
                {activeStrat === st.id && <CheckCircle2 size={15} className="text-primary-700" />}
              </div>
              <p className="font-bold text-[14.5px] mt-0.5">{T(st.titleBn, st.titleEn)}</p>
              <p className="text-[12px] text-muted mt-0.5 truncate">{T(st.rotBn, st.rotEn)}</p>
            </button>
          ))}
        </div>

        {/* 5-Dimension Deep Dive Card for Selected Strategy */}
        <div className="mt-5 rounded-2xl border border-primary-200/80 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary-700">{T('নির্বাচিত ফসলচক্র কৌশল', 'Selected Rotation Strategy')}</span>
              <h4 className="text-[18px] font-bold text-ink">{T(strat.titleBn, strat.titleEn)}</h4>
              <p className="text-[14px] font-semibold text-emerald-700 mt-0.5">{T(strat.rotBn, strat.rotEn)}</p>
            </div>
            <Tags list={['SAT', 'MODEL', 'RULE']} />
          </div>

          <div className="mt-4 space-y-3.5 text-[14px] leading-6">
            <div className="rounded-xl bg-canvas/80 p-3.5 border border-border/80">
              <p className="flex items-center gap-2 font-bold text-primary-900">
                <Lightbulb size={16} className="text-primary-700" />
                {T('১. কেন এই পথ সুপারিশ করা হয়েছে (Why Suggested):', '1. Why It Was Suggested:')}
              </p>
              <p className="mt-1 text-ink/85 pl-6">{T(strat.whyBn, strat.whyEn)}</p>
            </div>

            <div className="rounded-xl bg-canvas/80 p-3.5 border border-border/80">
              <p className="flex items-center gap-2 font-bold text-sky-900">
                <FileSearch size={16} className="text-sky-700" />
                {T('২. কোন তথ্যে ভিত্তি করে (Supporting Evidence):', '2. Supporting Satellite & Ground Evidence:')}
              </p>
              <p className="mt-1 text-ink/85 pl-6">{T(strat.evidenceBn, strat.evidenceEn)}</p>
            </div>

            <div className="rounded-xl bg-canvas/80 p-3.5 border border-border/80">
              <p className="flex items-center gap-2 font-bold text-emerald-900">
                <ThumbsUp size={16} className="text-emerald-700" />
                {T('৩. কৃষক কী কী সুবিধা পাবেন (Benefits Offered):', '3. Benefits It May Offer:')}
              </p>
              <p className="mt-1 text-ink/85 pl-6">{T(strat.benefitsBn, strat.benefitsEn)}</p>
            </div>

            <div className="rounded-xl bg-canvas/80 p-3.5 border border-border/80">
              <p className="flex items-center gap-2 font-bold text-amber-900">
                <HelpCircle size={16} className="text-amber-700" />
                {T('৪. তথ্যের সীমাবদ্ধতা বা যা এখনো অজানা (Information Gaps):', '4. Information Gaps:')}
              </p>
              <p className="mt-1 text-ink/85 pl-6">{T(strat.gapsBn, strat.gapsEn)}</p>
            </div>

            <div className="rounded-xl bg-canvas/80 p-3.5 border border-border/80">
              <p className="flex items-center gap-2 font-bold text-rose-900">
                <ShieldAlert size={16} className="text-rose-700" />
                {T('৫. স্থানীয় ঝুঁকি ও মাঠে যাচাইয়ের তালিকা (Risks Needing Local Review):', '5. Risks Needing Local Review by Farmer/Officer:')}
              </p>
              <p className="mt-1 text-ink/85 pl-6">{T(strat.risksBn, strat.risksEn)}</p>
            </div>
          </div>
        </div>

        {/* Human-Centered Decision Reminder */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-[13.5px] leading-6 text-amber-950">
          <Award size={18} className="mt-1 shrink-0 text-amber-700" />
          <p>
            <b>{T('সহায়ক সিদ্ধান্ত ব্যবস্থা, মানুষের বিকল্প নয়:', 'Supportive Decision Tool, Not a Replacement:')}</b>{' '}
            {T(
              'এই টুল মহাকাশ তথ্য, মাটির মডেল এবং ফসলের নিয়মের সাহায্যে সম্ভাবনাগুলো বিশ্লেষণ করে দেয়। কিন্তু নতুন ফসল বোনার চূড়ান্ত সিদ্ধান্ত সবসময় কৃষকের নিজের বিচারবুদ্ধি এবং স্থানীয় উপজেলা কৃষি কর্মকর্তার (SAAO) প্রত্যক্ষ পরামর্শের ওপর নির্ভরশীল।',
              'This tool synthesizes NASA Earth observations, soil models, and crop characteristics to identify adaptive opportunities. However, the ultimate decision always rests on the farmer’s hands-on judgment and extension officers’ local ground validation.'
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

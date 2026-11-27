// Science Page: NASA Challenge Compliance Dossier & Technical Verification Matrix.
// Directly cross-examines the official 2026 Space Apps Challenge statement ("Adapting Farms with NASA Data")
// against the live software implementation, test suite verification, and data provenance.
import { useState } from 'react';
import { Award, ShieldCheck, CheckCircle2, FileCheck2, Terminal, Code2, Cpu } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { num } from '../../engine/dates';

const CRITERIA = [
  {
    id: 'c1',
    number: 1,
    titleBn: 'নাসা পৃথিবী পর্যবেক্ষণ তথ্যের সরাসরি ব্যবহার',
    titleEn: 'Ingestion of NASA Earth Observations',
    nasaDemandBn: 'নাসার দীর্ঘমেয়াদি পরিবেশগত ডেটাসেট ব্যবহার করে স্থানীয় ফসলি পরিস্থিতি পর্যবেক্ষণ করা।',
    nasaDemandEn: 'Use NASA’s long-term environmental datasets to understand local growing conditions.',
    solutionBn: 'নাসা POWER (২৫ বছরের দৈনিক আবহাওয়া), GPM IMERG (বৃষ্টির শুরু ও পরিমাণ), SMAP (শিকড়ের আর্দ্রতা), এবং GRACE (ভূগর্ভস্থ পানির পতন) সরাসরি ব্রাউজারে ইনজেস্ট ও প্রসেস হয়।',
    solutionEn: 'Ingests NASA POWER (25-year daily heat/rain), GPM IMERG (daily rain/onset), SMAP (root wetness), and GRACE (aquifer trend) client-side in the browser.',
    codeRef: 'src/engine/soilfuture.js · src/engine/climate.js',
    verification: {
      bn: 'সংরক্ষিত নাসা উপাত্ত থেকে পঠিত; ইঞ্জিন পরীক্ষায় যাচাইকৃত',
      en: 'Read from committed NASA data; covered by the engine tests',
    },
  },
  {
    id: 'c2',
    number: 2,
    titleBn: 'স্থানীয় মাটির বৈশিষ্ট্য ও গুণমান বিশ্লেষণ',
    titleEn: 'Local Soil Information & Health Calibration',
    nasaDemandBn: 'স্থানীয় মাটির তথ্য সমন্বয় করে মাটির স্বাস্থ্য ও কার্বন বৃদ্ধির সঠিক পূর্বাভাস দেওয়া।',
    nasaDemandEn: 'Combine local soil information to strengthen soil health and resilience.',
    solutionBn: 'ISRIC SoilGrids 2.0 (২৫০ মিটার কাদা, বালি ও জৈব কার্বন) পেডোট্রান্সফার ফাংশন + কৃষকের নিজস্ব এসআরডিআই (SRDI) মোবাইল ল্যাব পরীক্ষার তথ্য সংযোজন।',
    solutionEn: 'Harmonises ISRIC SoilGrids 2.0 250m clay/sand/SOC pedotransfer functions with the farmer’s own SRDI mobile lab soil test overlay.',
    codeRef: 'src/engine/soiltest.js · src/engine/soil.js',
    verification: {
      bn: 'ল্যাব পরীক্ষার মানের সীমা যাচাইকৃত',
      en: 'Lab entries range-checked (soil test engine)',
    },
  },
  {
    id: 'c3',
    number: 3,
    titleBn: 'ফসলের বৈশিষ্ট্য ও বাস্তব ক্রমবর্ধমান মৌসুম',
    titleEn: 'Crop Characteristics & Phenological Windows',
    nasaDemandBn: 'ফসলের পানির চাহিদা, রোগবালাই ঝুঁকি এবং স্থানীয় রোপণ মৌসুমের সঙ্গে মানানসই করা।',
    nasaDemandEn: 'Account for crop water needs, disease risks, and local market/growing seasons.',
    solutionBn: 'প্রকাশিত গবেষণা থেকে নেওয়া ফসলের সীমা ও সময় (স্থানীয় যাচাই এখনো লেখা হয়নি); সেন্টিনেল-১ রাডারে মাপা আমন রোপণের মধ্যমা এবং ডিএএম (DAM) পাইকারি বাজার দর।',
    solutionEn: 'Crop limits and calendars from published research (local review not yet recorded); Sentinel-1 radar-measured Aman planting median; DAM wholesale market glut indicators.',
    codeRef: 'src/engine/crops.js · src/engine/rotation.js',
    verification: {
      bn: 'প্রকাশিত প্রারম্ভিক মান, স্থানীয় পর্যালোচনার জন্য উন্মুক্ত',
      en: 'Published starting values, open for local review',
    },
  },
  {
    id: 'c4',
    number: 4,
    titleBn: 'কৃষকের নিজস্ব অগ্রাধিকার ও প্যারেটো ট্রেড-অফ',
    titleEn: 'Farmer Priorities & Pareto Multi-Objective Optimisation',
    nasaDemandBn: 'কৃষকের অগ্রাধিকার (আয়, পানি সাশ্রয়, মাটির স্বাস্থ্য) অনুসারে ফসলচক্র নির্বাচন করা।',
    nasaDemandEn: 'Incorporate farmer priorities to explore adaptive rotation strategies.',
    solutionBn: 'দশ বছরের কয়েক শত সম্ভাব্য ফসলচক্রের মধ্যে আইসিবিএম (ICBM) কার্বন ও এফএও-৫৬ সেচ চালিয়ে কৃষকের পছন্দে প্যারেটো-অনুকূল সেরা ৩টি পথ (বর্তমান, সমন্বয়, পরিবর্তন) নির্ধারণ।',
    solutionEn: 'Runs hundreds of feasible 10-year cycles through ICBM soil carbon and FAO-56 irrigation, ranking top Pareto-optimal strategies (KEEP, ADJUST, SHIFT).',
    codeRef: 'src/engine/decision.js · src/components/future/ParetoFrontier.jsx',
    verification: {
      bn: 'মডেলের অনুমান (ICBM, FAO-56), সীমাবদ্ধতাসহ প্রদর্শিত',
      en: 'Model estimates (ICBM, FAO-56), shown with their limits',
    },
  },
  {
    id: 'c5',
    number: 5,
    titleBn: '২০৪০-এর জলবায়ু অভিযোজন ও অনিশ্চয়তা যাচাই',
    titleEn: 'Long-Term Climate Adaptation & CMIP6 Ensemble',
    nasaDemandBn: 'পরিবর্তনশীল তাপ, বৃষ্টি ও বৈরি আবহাওয়ায় টেকসই ফসলচক্র যাচাই করা।',
    nasaDemandEn: 'Adapt farms to changing conditions including extreme weather and shifting patterns.',
    solutionBn: 'নাসা NEX-GDDP-CMIP6 এর ৮টি বৈশ্বিক জলবায়ু মডেল × ৫টি ফলন বছর মিলিয়ে ৪০টি সম্ভাব্য ভবিষ্যতের ওপর স্ট্রেস টেস্ট + ডিজিটাল টুইন ক্যাওস ইনজেক্টর।',
    solutionEn: 'Replays rotations across 40 futures (8 NEX-GDDP-CMIP6 climate models × 5 FAOSTAT yield years) with interactive extreme shock injection.',
    codeRef: 'src/engine/soilfuture.js · src/components/future/StressChaosTest.jsx',
    verification: {
      bn: '৪০টি ভবিষ্যতের ≥ ৮০%-এ ভালো হলে টেকসই',
      en: 'Robust when better in ≥ 80% of 40 futures',
    },
  },
  {
    id: 'c6',
    number: 6,
    titleBn: 'সহজ, বহুমাধ্যম ও গ্রামীণ মানুষের উপযোগী ইন্টারফেস',
    titleEn: 'Farmer-Friendly Multichannel Delivery & Officer Triage',
    nasaDemandBn: 'জটিল মহাকাশ বিজ্ঞানকে কৃষকের বোধগম্য ও ব্যবহারযোগ্য সিদ্ধান্তে রূপান্তর করা।',
    nasaDemandEn: 'Translate satellite data into practical, farmer-friendly insights.',
    solutionBn: 'গ্রামীণ বাংলায় প্রাকৃতিক ভয়েস সহকারী (Google Gemini/Web Audio), বাটন ফোনের জন্য এসএমএস মোড এবং ইউনিয়ন কর্মকর্তার অডিট ট্রেইল।',
    solutionEn: 'Rural Bangla speech synthesis (built-in TTS API), button phone SMS mode, and SAAO officer hash-chained audit triage.',
    codeRef: 'src/voice/brain.js · src/engine/chakra.js',
    verification: {
      bn: 'নিয়মভিত্তিক উত্তর অফলাইনে চলে; কণ্ঠস্বর ও এআই-এর জন্য নেটওয়ার্ক দরকার',
      en: 'Rule answers work offline; voice and AI need the network',
    },
  },
];

export default function ChallengeDossier() {
  const { s, T, L } = useStore();

  return (
    <section id="challenge-dossier" className="mt-12 scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-0.5 text-[12.5px] font-bold text-primary-900">
            <Award size={13} className="text-primary-700" />
            {T('নাসা স্পেস অ্যাপস চ্যালেঞ্জ কমপ্লায়েন্স', 'NASA Challenge Statement Compliance')}
          </span>
          <h2 className="mt-1 flex items-center gap-2 text-[24px] font-bold text-ink">
            <FileCheck2 size={22} className="text-primary-700" />
            {T('চ্যালেঞ্জের ৬টি শর্ত ও বৈজ্ঞানিক প্রমাণের তালিকা', 'Official Challenge Requirements & Code Verification')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary-100 px-3 py-1 text-[12.5px] font-bold text-primary-900">
            {T('প্রতিটি দাবির পাশে কোড', 'Each claim points to its code')}
          </span>
          <Tags list={['SAT', 'MODEL', 'RULE']} />
        </div>
      </div>

      <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">
        {T(
          'নাসার অফিসিয়াল চ্যালেঞ্জ বিবরণীর প্রতিটি বাক্যের সঙ্গে এগ্রোসের সরাসরি কোড, টেস্ট ও ডেটাসেট ম্যাপিং:',
          'Direct line-by-line verification of the official NASA Space Apps 2026 challenge brief against Agros’s mathematical engines, test suites, and data models:'
        )}
      </p>

      {/* Verification Cards Grid */}
      <div className="mt-5 space-y-4">
        {CRITERIA.map((crit) => (
          <div
            key={crit.id}
            className="rounded-3xl border border-border bg-white p-5 shadow-xs transition hover:border-primary-400 hover:shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-100 text-[14px] font-bold text-primary-900">
                  {num(crit.number, s.lang)}
                </span>
                <div>
                  <h3 className="text-[16.5px] font-bold text-ink">{T(crit.titleBn, crit.titleEn)}</h3>
                  <div className="mt-1 rounded-lg bg-canvas px-3 py-1.5 text-[12.5px] font-medium text-muted">
                    <b>{T('নাসার প্রত্যাশা:', 'NASA Requirement:')}</b> {T(crit.nasaDemandBn, crit.nasaDemandEn)}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-200 px-3 py-1 text-[12.5px] font-bold text-primary-800">
                <CheckCircle2 size={13} className="text-primary-700" />
                {L(crit.verification)}
              </span>
            </div>

            <div className="mt-3.5 pl-11">
              <p className="text-[14px] leading-6 text-ink/90">
                <b>{T('এগ্রোস বাস্তবায়ন:', 'Agros Implementation:')}</b>{' '}
                {T(crit.solutionBn, crit.solutionEn)}
              </p>
              <div className="mt-2.5 flex items-center gap-2 text-[12.5px] font-mono text-muted">
                <Code2 size={14} className="text-primary-700" />
                <span>{crit.codeRef}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

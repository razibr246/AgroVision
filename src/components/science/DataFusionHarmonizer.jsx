import { useState } from 'react';
import { Layers, Satellite, HelpCircle } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';

const EVIDENCE = [
  {
    id: 'rain', name: 'GPM IMERG / rain onset', scale: 'Rainfall estimates; regional grid',
    useBn: 'বৃষ্টির সময় ও মৌসুমি বৃষ্টির ধরণ বোঝাতে ব্যবহৃত হয়।',
    useEn: 'Used as regional rainfall context and in the rain-onset workflow.',
    evidenceBn: 'রবি মৌসুমের মোট বৃষ্টিতে POWER ও IMERG-এর সহসম্পর্ক ০.৬৭–০.৮২; বর্ষায় ০.১০–০.৭৬। BMD-ভিত্তিক onset নিয়ম ৩টি স্থানে ১৭ বছরের মধ্যে ১ সপ্তাহের ব্যবধানে ছিল। এই দুটি আলাদা তুলনা।',
    evidenceEn: 'POWER–IMERG correlation for Rabi rainfall totals is 0.67–0.82; monsoon totals are 0.10–0.76. Separately, the onset rule was within one week of the BMD station-based date at three sites over 17 years each. These are distinct checks.',
    sources: [{ label: 'NASA POWER', href: 'https://power.larc.nasa.gov/' }, { label: 'NASA GPM IMERG', href: 'https://gpm.nasa.gov/data/imerg' }],
  },
  {
    id: 'smap', name: 'SMAP L4 / root-zone wetness', scale: 'Product grid; regional estimate',
    useBn: 'শিকড়-অঞ্চলের আর্দ্রতার আঞ্চলিক মডেল-অনুমান হিসেবে দেখানো হয়; জমির সরাসরি মাপ নয়।',
    useEn: 'Shown as a regional model estimate of root-zone wetness, not a direct field measurement.',
    evidenceBn: '৭টি স্থানে ১১৩ মাসে SMAP L4 ও POWER/MERRA-2 আর্দ্রতার সহসম্পর্ক ০.৮৯–০.৯৭। দুটিই GEOS মডেল-ব্যবস্থার সঙ্গে সম্পর্কিত, তাই এটি স্বাধীন মাঠ-যাচাই নয়।',
    evidenceEn: 'Across seven sites and 113 months, SMAP L4 and POWER/MERRA-2 root-zone wetness correlate at 0.89–0.97. Both are related to the GEOS modelling system, so this is not independent field validation.',
    sources: [{ label: 'NASA SMAP', href: 'https://smap.jpl.nasa.gov/' }, { label: 'NASA POWER', href: 'https://power.larc.nasa.gov/' }],
  },
  {
    id: 'land', name: 'MODIS / vegetation and surface context', scale: 'Coarse regional pixels; monthly summaries',
    useBn: 'বৃহৎ এলাকার উদ্ভিদ-সবুজত্ব ও ভূমিপৃষ্ঠের প্রেক্ষাপট; ছোট জমির নিশ্চিত ফসল-পরিচয় নয়।',
    useEn: 'Provides broad vegetation and land-surface context; it does not confirm crop identity on a small field.',
    evidenceBn: 'এই প্রকল্পে স্বতন্ত্র নির্ভুলতা-পরিমাপ নথিভুক্ত নেই। মেঘ, পিক্সেলের মিশ্রণ এবং রঙ-মানচিত্র থেকে মান পড়ার কারণে স্থানীয় নির্ভুলতা সীমিত।',
    evidenceEn: 'No independent accuracy statistic is documented for this project. Clouds, mixed pixels and values decoded from colour-map imagery limit local precision.',
    sources: [{ label: 'NASA MODIS', href: 'https://modis.gsfc.nasa.gov/' }, { label: 'NASA GIBS', href: 'https://nasa-gibs.github.io/gibs-api-docs/' }],
  },
  {
    id: 'terrain', name: 'SRTM / ASTER elevation', scale: 'About 30 m source grids',
    useBn: 'উচ্চতার পার্থক্য ও সম্ভাব্য নিচু স্থান চিহ্নিত করার প্রাথমিক প্রেক্ষাপট।',
    useEn: 'Used as screening context for elevation differences and possible low areas.',
    evidenceBn: '১৯টি নমুনা জমিতে দুই DEM-এর পার্থক্য ১.০–১১.৯ মিটার ছিল। এই পার্থক্য অনিশ্চয়তা বোঝায়; কোনো একটির নির্ভুলতার নিশ্চয়তা নয়।',
    evidenceEn: 'At 19 sample fields, the two DEMs differed by 1.0–11.9 m. That spread indicates uncertainty; it is not an accuracy guarantee for either product.',
    sources: [{ label: 'NASA SRTM', href: 'https://www.earthdata.nasa.gov/data/instruments/srtm' }, { label: 'Open Topo Data', href: 'https://www.opentopodata.org/' }],
  },
  {
    id: 'sentinel', name: 'Sentinel-2 / crop sequence', scale: '10–20 m optical pixels',
    useBn: 'উপলব্ধ পরিষ্কার ছবির সবুজত্বের ধারাবাহিকতা থেকে সম্ভাব্য ফসলের ক্রম অনুমান করা হয়।',
    useEn: 'Likely crop sequence is inferred from greenness in available clear observations.',
    evidenceBn: 'মেঘ ও পর্যবেক্ষণ-ফাঁক থাকে। প্রকল্পে এই অনুমানের মাঠ-যাচাইকৃত শ্রেণিবিন্যাস নির্ভুলতা নথিভুক্ত নেই।',
    evidenceEn: 'Clouds and observation gaps occur. The project has no documented field-verified crop-classification accuracy for this inference.',
    sources: [{ label: 'Copernicus Data Space', href: 'https://dataspace.copernicus.eu/' }],
  },
  {
    id: 'soil', name: 'SoilGrids / farmer-entered soil test', scale: 'SoilGrids: about 250 m; test: point entry',
    useBn: 'SoilGrids মাটির মডেল-অনুমান। কৃষকের দেওয়া পরীক্ষার মান থাকলে তা জমির তথ্যের সঙ্গে যোগ হয়, তবে অ্যাপ ল্যাব বা নমুনার পরিচয় যাচাই করে না।',
    useEn: 'SoilGrids is a model estimate. Farmer-entered test values can supplement it, but the app does not verify the lab or sample identity.',
    evidenceBn: 'মডেল-অনুমান ও ব্যবহারকারীর দেওয়া মাপ আলাদা উৎস। এক বিন্দুর পরীক্ষা পুরো জমির স্থানিক অনিশ্চয়তা দূর করে না।',
    evidenceEn: 'Model estimates and user-entered measurements are different evidence types. One point sample does not remove within-field spatial uncertainty.',
    sources: [{ label: 'ISRIC SoilGrids', href: 'https://soilgrids.org/' }],
  },
];

export default function DataFusionHarmonizer() {
  const { T } = useStore();
  const [active, setActive] = useState('smap');
  const item = EVIDENCE.find((entry) => entry.id === active) ?? EVIDENCE[0];

  return (
    <section id="data-fusion" className="mt-12 scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-0.5 text-[12.5px] font-bold text-sky-900">
            <Satellite size={13} className="text-sky-700" />
            {T('উৎস, স্কেল ও প্রমাণের সীমা', 'Data sources, scale and evidence limits')}
          </span>
          <h2 className="mt-1 flex items-center gap-2 text-[24px] font-bold text-ink">
            <Layers size={22} className="text-primary-700" />
            {T('বিভিন্ন তথ্য কীভাবে ব্যবহার হয়', 'How the different data are used')}
          </h2>
        </div>
        <Tags list={['SAT', 'MODEL', 'RULE']} />
      </div>

      <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">
        {T(
          'এই উৎসগুলোর স্থানিক ও সময়গত স্কেল এক নয়। অ্যাপ প্রতিটি তথ্যকে তার উপযোগী কাজে ব্যবহার করে; সব তথ্যকে একই জমি-রেজোলিউশনে রূপান্তর করা হয়েছে—এমন দাবি করা হয় না। নিচের তুলনাগুলো প্রকল্পের নথিভুক্ত সীমিত যাচাই, পূর্ণ মাঠ-যাচাই নয়।',
          'These sources have different spatial and temporal scales. The app uses each for suitable purposes; it does not claim that every source has been converted to a common field-resolution grid. The checks below are limited project checks, not full field validation.'
        )}
      </p>

      <div className="mt-6 rounded-3xl border border-border bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={T('তথ্যের উৎস বাছুন', 'Choose a data source')}>
          {EVIDENCE.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActive(entry.id)}
              aria-pressed={active === entry.id}
              className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition ring-1 ${active === entry.id ? 'bg-primary-900 text-white ring-primary-900 shadow-sm' : 'bg-canvas text-ink/80 ring-border hover:bg-canvas'}`}
            >
              {entry.name}
            </button>
          ))}
        </div>

        <article className="mt-4 rounded-2xl border border-border/80 bg-canvas/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[20px] font-bold text-ink">{item.name}</h3>
            <span className="rounded-lg border border-border bg-white px-2.5 py-1 text-[12.5px] font-semibold text-muted">{item.scale}</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-[14px]">
            <div className="rounded-xl border border-border bg-white p-3">
              <p className="font-bold text-primary-900">{T('ব্যবহার ও ব্যাখ্যা', 'Use and interpretation')}</p>
              <p className="mt-1 text-ink/85">{T(item.useBn, item.useEn)}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-3">
              <p className="font-bold text-sky-900">{T('প্রমাণ ও সীমাবদ্ধতা', 'Evidence and limitations')}</p>
              <p className="mt-1 text-ink/85">{T(item.evidenceBn, item.evidenceEn)}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
                {item.sources?.map((source) => (
                  <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="font-semibold text-primary-800 underline decoration-primary-300 underline-offset-2 hover:text-primary-950">
                    {source.label}
                  </a>
                ))}
                <a href="#coverage" className="font-semibold text-primary-800 underline decoration-primary-300 underline-offset-2 hover:text-primary-950">
                  {T('অ্যাপের তথ্য-রেজিস্টার', 'App data register')}
                </a>
              </div>
            </div>
          </div>
        </article>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-paddy-100 bg-paddy-50 p-4 text-[14px] leading-6 text-paddy-700">
          <HelpCircle size={18} className="mt-1 shrink-0 text-paddy-700" />
          <p>{T(
            'ফসলচক্রের ফলাফল মডেল ও নিয়মের ভিত্তিতে তৈরি সম্ভাব্যতা, মাঠ-পরীক্ষায় প্রমাণিত ফল নয়। প্রকল্পের মালিক স্থানীয় কৃষিবিদের মৌখিক সম্মতির কথা জানিয়েছেন; তবে কোন নিয়ম, কখন, কীভাবে পর্যালোচনা হয়েছে তার নথি নেই। তাই এটিকে নথিভুক্ত বৈজ্ঞানিক যাচাই বলা যায় না।',
            'Rotation results are model- and rule-based estimates, not proven field outcomes. The project owner reports verbal agreement from a local agronomist, but no review date, scope or findings are documented; this cannot yet be presented as documented scientific validation.'
          )}</p>
        </div>
      </div>
    </section>
  );
}

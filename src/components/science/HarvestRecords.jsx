// Science page: real harvest records of Bangladesh's crops (FAOSTAT) and how far each season's NASA weather explains
// the good and bad years. Scores are the measured held-out ones from scripts/build/train_harvest_model.mjs.
import { useMemo, useState } from 'react';
import { Wheat } from 'lucide-react';
import { useStore } from '../../store';
import { Tags, Note } from '../ui';
import model from '../../data/models/harvest_model.json';
import { cropHarvest, modelSkill } from '../../engine/harvestRecords';
import { num } from '../../engine/dates';

const NAMES = { 'base rate': { bn: 'সবসময় "মাঝারি"', en: 'Always "average"' }, 'crop only': { bn: 'শুধু ফসলের নিজের ইতিহাস (আবহাওয়া ছাড়া)', en: 'Crop’s own record only (no weather)' }, logistic: { bn: 'লজিস্টিক', en: 'Logistic' }, kNN: { bn: 'কাছের ১৫টি মৌসুম (kNN)', en: 'Nearest 15 seasons (kNN)' }, tree: { bn: 'সিদ্ধান্ত-গাছ', en: 'Decision tree' }, forest: { bn: 'র‍্যান্ডম ফরেস্ট', en: 'Random forest' }, boosting: { bn: 'গ্রেডিয়েন্ট বুস্টিং', en: 'Gradient boosting' } };
const SEASON = { winter: { bn: 'শীত', en: 'Winter' }, summer: { bn: 'গ্রীষ্ম', en: 'Summer' }, rainy: { bn: 'বর্ষা', en: 'Rainy' }, all: { bn: 'সারা বছর', en: 'All year' } };

export default function HarvestRecords() {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const skill = useMemo(() => modelSkill(model), []);
  const ids = Object.keys(model.crops);
  const [crop, setCrop] = useState(ids.includes('tomato') ? 'tomato' : ids[0]);
  const c = cropHarvest(model, crop);
  const pct = (v) => `${num(Math.round(100 * v), lang)}%`;
  const signed = (a) => `${a >= 0 ? '+' : '−'}${num(Math.abs(Math.round(a * 100)), lang)}%`;
  const best = skill.best;
  const floor = skill.cropOnly;
  const FLOORS = new Set(['base rate', 'crop only']);

  return (
    <section id="harvest" className="mt-12 scroll-mt-28">
      <h2 className="flex items-center gap-2 text-[24px] font-bold"><Wheat size={20} className="text-primary-700" />{T('ভালো আর খারাপ ফলনের বছর, আর আবহাওয়া কতটা বোঝায়', 'Good and bad harvest years, and how much the weather explains')} <Tags list={['RECORD', 'MODEL']} /></h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T(
        `FAOSTAT-এর ${num(model.n.crops, lang)}টি ফসলের জাতীয় ফলন, প্রতিটি বছর সেই ফসলের নিজের প্রবণতার সঙ্গে তুলনা করে ভালো (+${num(model.thresholds.GOOD * 100, lang)}% বা বেশি), মাঝারি বা খারাপ (−${num(model.thresholds.BAD * 100, lang)}% বা কম)। সেই মৌসুমের নাসার আবহাওয়া আর ফসল থেকে পাঁচটি পদ্ধতি শেখানো হয়েছে, আর দুটি তুলনার মাপকাঠি আবহাওয়া একেবারেই দেখে না; প্রতিটি বছর যাচাই হয়েছে এমন মডেলে যা সেই বছর দেখেনি (${num(model.n.rows, lang)}টি ফসল-বছর)।`,
        `National yields of ${model.n.crops} crops from FAOSTAT, each year compared with the crop's own trend: good (+${model.thresholds.GOOD * 100}% or more), average, or bad (−${model.thresholds.BAD * 100}% or less). Five approaches learn from that season's NASA weather and the crop, and two floors use no weather at all; every year is tested by a model that never saw it (${model.n.rows} crop-years).`)}</p>

      <div className="mt-4 overflow-x-auto rounded-[22px] border border-border bg-white">
        <table className="w-full min-w-[480px] text-left text-[14px]">
          <thead className="bg-canvas text-[12.5px] text-muted"><tr>
            <th className="px-3 py-2.5 font-semibold">{T('পদ্ধতি', 'Approach')}</th>
            <th className="px-3 py-2.5 font-semibold">{T('সঠিক', 'Accuracy')}</th>
            <th className="px-3 py-2.5 font-semibold">{T('ম্যাক্রো-F1', 'Macro F1')}</th>
            <th className="px-3 py-2.5 font-semibold">{T('খারাপ বছর ধরা', 'Bad years caught')}</th>
          </tr></thead>
          <tbody>{skill.rows.map((r) => (
            <tr key={r.name} className={`border-t border-border ${r.name === model.best ? 'bg-primary-50' : ''} ${FLOORS.has(r.name) ? 'text-ink/70' : ''}`}>
              <td className="px-3 py-2.5 font-semibold">{L(NAMES[r.name] ?? { bn: r.name, en: r.name })}{FLOORS.has(r.name) && <span className="ml-1.5 text-[12px] font-normal text-muted">{T('(তুলনার মাপকাঠি)', '(floor to beat)')}</span>}</td>
              <td className="px-3 py-2.5 tabular">{pct(r.accuracy)}</td>
              <td className="px-3 py-2.5 tabular">{num(r.macroF1, lang, { dp: 2 })}</td>
              <td className="px-3 py-2.5 tabular">{pct(r.badRecall)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Note tone={skill.beatsCropOnly ? 'gold' : 'warn'}>{floor && !skill.beatsCropOnly ? T(
        `শুধু ফসলটা কোনটা জানলেই, আবহাওয়া ছাড়া, খারাপ বছরের ${pct(floor.badRecall)} ধরা যায় (ম্যাক্রো-F1 ${num(floor.macroF1, lang, { dp: 2 })}); আবহাওয়া দেখা সেরা পদ্ধতি তার চেয়ে ভালো নয় (${num(best.macroF1, lang, { dp: 2 })})। অর্থাৎ দেশের পর্যায়ে এই মৌসুমের আবহাওয়া ফসলের নিজের ইতিহাসের চেয়ে বেশি কিছু বলে না; ফলনের ওঠানামার বড় অংশ বীজ, সার, পোকা, দাম আর নীতির ওপর। এই সংখ্যা যেমন মাপা হয়েছে তেমনই দেখানো হলো।`,
        `Knowing only which crop it is, with no weather, already catches ${pct(floor.badRecall)} of bad years (macro F1 ${num(floor.macroF1, lang, { dp: 2 })}); the best approach that reads the weather does no better (${num(best.macroF1, lang, { dp: 2 })}). At national scale, this season's weather says no more than the crop's own record: much of a yield's swing comes from seed, fertiliser, pests, prices and policy. These are the scores as measured.`) : T(
        `সেরা পদ্ধতি খারাপ বছরের ${pct(best.badRecall)} ধরে${floor ? `; শুধু ফসলের ইতিহাস দেখে ${pct(floor.badRecall)}` : ''}। তবু মোট সঠিকতা কম: দেশের ফলনের ওঠানামার বড় অংশ বীজ, সার, পোকা, দাম আর নীতির ওপর, যা আবহাওয়ায় দেখা যায় না। এই সংখ্যা যেমন মাপা হয়েছে তেমনই দেখানো হলো।`,
        `The best approach catches ${pct(best.badRecall)} of bad years${floor ? `, against ${pct(floor.badRecall)} from the crop's own record alone` : ''}. Overall accuracy stays low: much of a national yield's swing comes from seed, fertiliser, pests, prices and policy, which the weather does not show. These are the scores as measured.`)}</Note>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label htmlFor="harvest-crop" className="text-[14px] font-semibold">{T('ফসল', 'Crop')}</label>
        <select id="harvest-crop" value={crop} onChange={(e) => setCrop(e.target.value)} className="rounded-xl border border-border bg-white px-3 py-2 text-[14px]">
          {ids.map((id) => <option key={id} value={id}>{L(model.crops[id].name)}</option>)}
        </select>
      </div>
      {c && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] border border-border bg-white p-4">
            <div className="text-[13px] text-muted">{L(SEASON[c.season])} · {T('সর্বশেষ', 'Latest')} {num(c.latest.year, lang)}</div>
            <div className="font-display mt-1 text-[26px] font-bold tabular">{num(c.latest.yieldTHa, lang, { dp: 2 })} {T('টন/হেক্টর', 't/ha')}</div>
            <div className="mt-2 text-[14px]">{T(`২০০১ থেকে: ভালো ${num(c.counts.good, 'bn')}, মাঝারি ${num(c.counts.average, 'bn')}, খারাপ ${num(c.counts.bad, 'bn')} বছর (খুব খারাপ ${num(c.counts.veryBad, 'bn')})`, `Since 2001: ${c.counts.good} good, ${c.counts.average} average, ${c.counts.bad} bad years (${c.counts.veryBad} very bad)`)}</div>
          </div>
          <div className="rounded-[22px] border border-border bg-white p-4 text-[14px]">
            <div className="font-semibold">{T('সবচেয়ে খারাপ বছর', 'Worst years')}</div>
            <ul className="mt-1 space-y-1">{c.worst.map((w) => (
              <li key={w.year}><b className="tabular">{num(w.year, lang)}</b> {signed(w.anomaly)}{w.weather ? T(` · বৃষ্টি ${num(Math.round(w.weather.rain), 'bn')} মিমি, গরম দিন ${num(w.weather.hotDays, 'bn')}`, ` · rain ${Math.round(w.weather.rain)} mm, ${w.weather.hotDays} hot days`) : ''}</li>
            ))}</ul>
            <div className="mt-2 font-semibold">{T('সবচেয়ে ভালো বছর', 'Best years')}</div>
            <div>{c.best.map((b) => `${num(b.year, lang)} ${signed(b.anomaly)}`).join(' · ')}</div>
          </div>
        </div>
      )}
      <p className="mt-3 text-[12.5px] text-muted">{T('উৎস: FAOSTAT উৎপাদন (বাংলাদেশ, জাতীয় গড়, ধানের সব মৌসুম একসঙ্গে); নাসা পাওয়ার, সাতটি উপজেলার গড়। নতুন করে বানাতে: npm run data:harvest && npm run train:harvest', 'Sources: FAOSTAT production (Bangladesh, national average, all rice seasons together); NASA POWER, mean of the seven upazilas. Rebuild: npm run data:harvest && npm run train:harvest')}</p>
      <p className="mt-1 text-[12.5px] text-muted">{T(`নির্দেশনার ৩০টি নমুনা রেকর্ড আলাদা রাখা আছে (src/data/harvest/harvest_dataset.csv), বানানো বলে চিহ্নিত; সেগুলো কোনো মডেলের সঠিকতার প্রমাণ নয়।`, `The brief's 30 starter records are kept apart (src/data/harvest/harvest_dataset.csv), marked synthetic; they are not evidence of any model's accuracy.`)}</p>
    </section>
  );
}

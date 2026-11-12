// "Did it see the real disasters?": documented Bangladesh crop disasters checked against the app's own NASA signals
// at the nearest upazila (scripts/build/check_events.mjs → src/data/climate/event_check.json). Hits and misses both
// shown, each with its news or agency source.
import { Target, ExternalLink } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import check from '../../data/climate/event_check.json';

const PLACE = { godagari: ['গোদাগাড়ী', 'Godagari'], dhamrai: ['ধামরাই', 'Dhamrai'], sitakunda: ['সীতাকুণ্ড', 'Sitakunda'], dacope: ['দাকোপ', 'Dacope'], bakerganj: ['বাকেরগঞ্জ', 'Bakerganj'], gangachara: ['গঙ্গাচড়া', 'Gangachara'], gowainghat: ['গোয়াইনঘাট', 'Gowainghat'] };

export default function EventCheck() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const res = check.results;
  const above = res.filter((r) => r.above).length, top = res.filter((r) => r.hit).length;
  return (
    <section id="events" className="mt-12 scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[24px] font-bold"><Target size={20} className="text-primary-700" />{T('আসল দুর্যোগগুলো কি ধরা পড়ে?', 'Did it see the real disasters?')}</h2>
        <Tags list={['SAT', 'MODEL', 'RECORD']} />
      </div>
      <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T(
        'খবর আর কৃষি সম্প্রসারণ অধিদপ্তরের হিসাবে লেখা বোরোর পাঁচটি বড় ক্ষতি। প্রতিটির জন্য অ্যাপ যে নাসা তথ্য আর নিয়ম ব্যবহার করে, সেটা কাছের উপজেলায় ২৫ মৌসুম ধরে হিসাব করে দেখা হয়েছে, ক্ষতির বছর কোথায় দাঁড়ায়। জাতীয় তাপপ্রবাহ সাত উপজেলাতেই দেখা হয়েছে, বেছে নেওয়া হয়নি।',
        'Five documented Boro disasters, from news and DAE reports. For each, the NASA signal and rule the app uses were worked out at the nearest upazila for all 25 seasons, to see where the disaster year stands. The national heat events were checked at all seven upazilas, not picked.')}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-primary-50 p-4 ring-1 ring-primary-100"><p className="font-display text-[28px] font-bold text-primary-900">{T(`${num(above, 'bn')}/${num(res.length, 'bn')}`, `${above}/${res.length}`)}</p><p className="text-[14px] leading-6 text-ink/80">{T('বার ক্ষতির বছরের সংকেত স্বাভাবিকের (অন্য বছরগুলোর মাঝামাঝি) চেয়ে বেশি ছিল: দিক ঠিক', 'times the disaster year’s signal was above the usual (the median of the other years): the right direction')}</p></div>
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><p className="font-display text-[28px] font-bold text-amber-900">{T(`${num(top, 'bn')}/${num(res.length, 'bn')}`, `${top}/${res.length}`)}</p><p className="text-[14px] leading-6 text-ink/80">{T('বার ক্ষতির বছর ২৫ মৌসুমের প্রথম তিনে ছিল: স্পষ্ট সতর্কতা। একদিনের গরম বাতাস বা উজানের ঢল ধরতে আরও তীক্ষ্ণ নিয়ম লাগবে।', 'times the disaster year was in the top 3 of 25 seasons: a sharp warning. A one-day hot wind or an upstream flood needs a sharper rule.')}</p></div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-[22px] border border-border bg-white">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="bg-canvas text-[12.5px] text-muted"><tr>
            <th className="px-3 py-2.5 font-semibold">{T('ঘটনা', 'Event')}</th>
            <th className="px-3 py-2.5 font-semibold">{T('উপজেলা', 'Upazila')}</th>
            <th className="px-3 py-2.5 font-semibold">{T('সংকেত', 'Signal')}</th>
            <th className="px-3 py-2.5 font-semibold">{T('সেই বছর / স্বাভাবিক', 'That year / usual')}</th>
            <th className="px-3 py-2.5 font-semibold">{T('২৫-এর মধ্যে', 'Rank of 25')}</th>
          </tr></thead>
          <tbody>
            {res.map((r, k) => (
              <tr key={r.id + r.place} className={`align-top ${k && res[k - 1].id === r.id ? '' : 'border-t border-border'}`}>
                <td className="px-3 py-2.5 text-[13px]">{k && res[k - 1].id === r.id ? null : <><b>{T(bnDigits(String(r.year)), String(r.year))}</b> · {L(r.what)} <a href={r.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary-700 hover:underline" title={r.source.label}><ExternalLink size={12} />{T('উৎস', 'source')}</a></>}</td>
                <td className="px-3 py-2.5 text-[13px]">{T(PLACE[r.place][0], PLACE[r.place][1])}</td>
                <td className="px-3 py-2.5 text-[13px] text-ink/80">{L(r.signal)}</td>
                <td className="px-3 py-2.5 tabular text-[13px]">{num(r.value, lang, { dp: 1 })} / {num(r.median, lang, { dp: 1 })}</td>
                <td className="px-3 py-2.5 tabular text-[13px]"><span className={`rounded-full px-2 py-0.5 font-semibold ${r.hit ? 'bg-primary-100 text-primary-900' : r.above ? 'bg-amber-100 text-amber-900' : 'bg-red-50 text-red-800'}`}>{num(r.rank, lang)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 space-y-1 text-[13px] leading-6 text-muted">
        {[...new Map(res.filter((r) => r.note).map((r) => [r.id, r])).values()].map((r) => <li key={r.id}>{T(bnDigits(String(r.year)), String(r.year))}: {L(r.note)}</li>)}
        <li>{T('কেউ নিজে চালিয়ে দেখতে পারেন:', 'Anyone can re-run it:')} <code>npm run data:events</code> ({T('তৈরি', 'generated')} {check.provenance.generated}).</li>
      </ul>
    </section>
  );
}

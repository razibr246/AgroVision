// "How the data are put together": every dataset's own scale, and how it is brought to the same two keys as the
// others, the place (the field, or the cell it sits in) and the time (the crop's stage, season or year). This is the
// challenge's harmonization step, done by aggregation; the reason there is no fine common grid is said plainly.
import { Layers } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { DATASETS } from '../../engine/provenance';
import { HARMONIZE, UNITS, WHY_NO_FINE_GRID } from '../../engine/harmonize';

export default function HowCombined() {
  const { T, L } = useStore();
  const rows = DATASETS.filter((d) => HARMONIZE[d.id] && d.kind !== 'DEMO');
  return (
    <section id="harmonize" className="mt-12 scroll-mt-28">
      <h2 className="flex items-center gap-2 text-[24px] font-bold"><Layers size={20} className="text-primary-700" />{T('ভিন্ন মাপের তথ্য কীভাবে এক হয়', 'How data of different sizes are put together')}</h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T('৫০ কিমির আবহাওয়ার ঘর থেকে ১০ মিটারের উপগ্রহ পিক্সেল পর্যন্ত, প্রতিটি তথ্যকে একই দুটি চাবিতে আনা হয়, গড় করে:', 'From a 50 km weather cell to a 10 m satellite pixel, every dataset is brought to the same two keys, by aggregation:')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-primary-50 px-3 py-1.5 text-[14px] font-semibold text-primary-800 ring-1 ring-primary-200">{L(UNITS.place)}</span>
        <span className="rounded-full bg-sky-50 px-3 py-1.5 text-[14px] font-semibold text-sky-800 ring-1 ring-sky-200">{L(UNITS.time)}</span>
      </div>
      <div className="mt-4 overflow-x-auto rounded-[22px] border border-border bg-white">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="bg-canvas text-[12.5px] text-muted">
            <tr>
              <th className="px-3 py-2.5 font-semibold">{T('তথ্য', 'Dataset')}</th>
              <th className="px-3 py-2.5 font-semibold">{T('নিজের মাপ', 'Its own scale')}</th>
              <th className="px-3 py-2.5 font-semibold">{T('জায়গায় যেভাবে আসে', 'How it reaches the place')}</th>
              <th className="px-3 py-2.5 font-semibold">{T('সময়ে যেভাবে আসে', 'How it reaches the time')}</th>
              <th className="px-3 py-2.5 font-semibold">{T('ধরন', 'Kind')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-border align-top">
                <td className="px-3 py-2.5 font-semibold">{L(d.name)}</td>
                <td className="px-3 py-2.5 text-[13px] text-ink/80">{d.scale ? L(d.scale) : '—'}</td>
                <td className="px-3 py-2.5 text-[13px] text-ink/80">{L(HARMONIZE[d.id].place)}</td>
                <td className="px-3 py-2.5 text-[13px] text-ink/80">{L(HARMONIZE[d.id].time)}</td>
                <td className="px-3 py-2.5"><Tags list={[d.kind]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl rounded-xl bg-canvas px-3 py-2 text-[14px] leading-7 text-ink/80">{L(WHY_NO_FINE_GRID)}</p>
    </section>
  );
}

// The neighbouring-country farm's rotation options over ten years (engine/rotationAbroad.js): soil organic matter
// now and in the 2040s, legume nitrogen, paddy methane and the net greenhouse-gas balance, per hectare.
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { Note } from '../ui';
import { num } from '../../engine/dates';
import { climateChange } from '../../engine/soilfuture';
import { abroadRotations, cropAbroad } from '../../engine/rotationAbroad';
import soilYields from '../../data/soil/abroad_soil_yields.json';
import { TEXTURE } from '../../engine/soil';

const signed = (x, lang, dp = 1) => { const r = Math.round(x * 10 ** dp) / 10 ** dp; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${num(Math.abs(r), lang, { dp })}`; };

export default function AbroadRotations({ id, normals }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [deltas, setDeltas] = useState(null);
  const [year, setYear] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { import('../../data/climate/cmip6_deltas.json').then((m) => setDeltas(m.default)); }, []);
  useEffect(() => {
    if (!playing) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setPlaying(false); return undefined; }
    const timer = window.setInterval(() => setYear((y) => Math.min(10, y + 1)), 850);
    return () => window.clearInterval(timer);
  }, [playing]);
  useEffect(() => { if (year >= 10) setPlaying(false); }, [year]);
  const c = soilYields.countries[id];
  const res = useMemo(() => (c ? abroadRotations({ country: id, soil: c.soil, yields: c.yields, normals, change: deltas ? climateChange(deltas, `abroad_${id}`, 'ssp245') : null }) : null), [c, id, normals, deltas]);
  // A farm outside the model's crops (the Nevada alfalfa pivot: a perennial, not a kharif–rabi double crop) says so
  // instead of showing an empty card.
  if (!c) return <p className="text-[14px] leading-7 text-ink/75">{T('এই ১০ বছরের মডেলটি দক্ষিণ এশিয়ার ধানভিত্তিক দুই-মৌসুমের ফসলচক্রের জন্য বানানো। এই খামারের ফসল বহুবর্ষজীবী আলফালফা, তাই এখানে সেটা দেখানো হচ্ছে না — মৌসুমের পরিকল্পনা পাতায় এর পানির চাহিদা আর কাটার সময় দেখুন।', 'This ten-year model is built for South Asia’s rice-based two-season rotations. This farm grows perennial alfalfa, so it is not shown here — see the Season plan page for its water need and cutting times.')}</p>;
  if (!res) return null;
  const name = (o) => `${o.cycle.map((y) => y.map((k) => L(cropAbroad(k).name)).join(' → ')).join(T(' | পরের বছর ', ' | next year '))}`;
  const straw = (o) => (o.residue === 'retain' ? T('খড় জমিতে রেখে', 'straw kept') : T('খড়ের বেশির ভাগ তুলে বা পুড়িয়ে', 'most straw removed or burnt'));
  const soilOf = (o) => o.dSocFut ?? o.dSoc;
  const best = res.options.reduce((a, o) => (soilOf(o) > soilOf(a) ? o : a), res.options[0]);
  const habit = res.options.find((o) => o.habit);
  const crops = [...new Set(res.options.flatMap((o) => o.crops))].filter((k) => k !== 'fallow');
  const selected = best;
  const displayedOm = res.om0 + ((selected.om - res.om0) * year / 10);
  return (
    <div>
      <section className="mb-5 overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-950 via-primary-900 to-[#396c48] p-4 text-white sm:p-5" aria-label={T('দশ বছরের জমির ভবিষ্যৎ অ্যানিমেশন', 'Ten-year field future animation')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-paddy-200">{T('জমির ভবিষ্যৎ · মডেলের দুই প্রান্ত', 'Field future · model endpoints')}</p><h3 className="mt-1 text-lg font-bold">{T('দশ বছরে জমির পরিবর্তন', 'How the field changes over ten years')}</h3></div>
          <button type="button" onClick={() => { if (year >= 10) setYear(0); setPlaying((v) => !v); }} className="rounded-full bg-white px-3.5 py-2 text-sm font-bold text-primary-950">{playing ? T('থামান', 'Pause') : year >= 10 ? T('আবার চালান', 'Replay') : T('পরিবর্তন দেখুন', 'Play timeline')}</button>
        </div>
        <div className="relative mt-4 h-28 overflow-hidden rounded-xl border border-white/20 bg-sky-200/90" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-[#986e42] to-[#553d2c]" />
          <div className="absolute inset-x-0 bottom-[40%] h-[3px] bg-amber-200/75" />
          {Array.from({ length: 15 }, (_, i) => {
            const height = 17 + ((i * 17 + 23) % 27) * (0.45 + year / 18);
            return <span key={i} className="absolute bottom-[40%] w-[3px] origin-bottom rounded-full bg-emerald-800 transition-all duration-700" style={{ left: `${5 + i * 6.4}%`, height: `${height}px`, transform: `rotate(${i % 2 ? 12 : -12}deg)` }}><i className="absolute -left-1 top-1 h-2 w-3 -rotate-25 rounded-full bg-emerald-500" /><i className="absolute -right-1 top-2 h-2 w-3 rotate-25 rounded-full bg-lime-300" /></span>;
          })}
          <span className="absolute right-4 top-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-primary-950">{T(`বছর ${num(year, lang)}`, `Year ${year}`)}</span>
        </div>
        <input aria-label={T('দশ বছরের টাইমলাইন', 'Ten-year timeline')} type="range" min="0" max="10" value={year} onChange={(e) => { setPlaying(false); setYear(Number(e.target.value)); }} className="mt-3 w-full accent-lime-300" />
        <div className="flex justify-between text-xs text-white/70"><span>{T('আজ', 'Today')}</span><span>{T('১০ বছর', '10 years')}</span></div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-white/10 px-3 py-2"><span className="text-sm text-white/75">{T('সেরা মডেল করা ফসলচক্রে জৈব পদার্থের দৃশ্যায়িত ধারা', 'Illustrative organic-matter path for the best modelled rotation')}</span><b className="text-lg tabular-nums">{num(displayedOm, lang, { dp: 2 })}%</b></div>
        <p className="mt-2 text-[11.5px] leading-5 text-white/60">{T('দৃশ্যটি আজ ও দশ বছরের মডেল ফলের মাঝের সরল অ্যানিমেশন, বছরওয়ারি পূর্বাভাস নয়।', 'The animation interpolates between the modelled present and ten-year result; it is not an annual forecast.')}</p>
      </section>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13.5px]">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-2 pr-2 font-semibold">{T('ফসলচক্র (বর্ষা → শীত)', 'Rotation (monsoon → winter)')}</th>
              <th className="px-2 py-2 font-semibold">{T('১০ বছরে জৈব পদার্থ', 'Organic matter, 10 years')}</th>
              <th className="px-2 py-2 font-semibold">{T('২০৪০-এর দশকে', 'In the 2040s')}</th>
              <th className="px-2 py-2 font-semibold">{T('ডালের নাইট্রোজেন', 'Legume nitrogen')}</th>
              <th className="px-2 py-2 font-semibold">{T('ধানের মিথেন', 'Paddy methane')}</th>
              <th className="px-2 py-2 font-semibold">{T('নিট গ্রিনহাউস গ্যাস', 'Net greenhouse gas')}</th>
            </tr>
          </thead>
          <tbody>
            {res.options.map((o, i) => (
              <tr key={i} className={`border-t border-border ${o === best ? 'bg-primary-50/70' : ''}`}>
                <td className="py-2 pr-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {o.habit && <span className="rounded-full bg-[#6b7a72] px-1.5 py-0.5 text-[11px] font-bold text-white">{T('এখন যেমন', 'As now')}</span>}
                    {o === best && <span className="rounded-full bg-primary-700 px-1.5 py-0.5 text-[11px] font-bold text-white">{T('মাটির জন্য সেরা', 'Best for the soil')}</span>}
                  </div>
                  <div className="mt-0.5 font-semibold">{name(o)}</div>
                  <div className="text-[12px] text-muted">{straw(o)}</div>
                </td>
                <td className="px-2 py-2 tabular">{num(o.om, lang, { dp: 2 })}% <span className={o.dSoc >= 0 ? 'text-primary-800' : 'text-red-700'}>({signed(o.dSoc, lang)}%)</span></td>
                <td className={`px-2 py-2 tabular ${o.dSocFut != null && o.dSocFut < 0 ? 'text-red-700' : 'text-primary-800'}`}>{o.dSocFut != null ? `${signed(o.dSocFut, lang)}%` : '–'}</td>
                <td className="px-2 py-2 tabular">{o.nFix ? `${num(o.nFix, lang)} ${T('কেজি/হে.', 'kg/ha')}` : '–'}</td>
                <td className="px-2 py-2 tabular">{o.ch4 ? `${num(o.ch4, lang)} ${T('কেজি/হে.', 'kg/ha')}` : '–'}</td>
                <td className={`px-2 py-2 tabular font-semibold ${o.net > 0 ? 'text-red-700' : 'text-primary-800'}`}>{signed(o.net, lang, 2)} {T('টন CO₂e/হে.', 't CO₂e/ha')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {best !== habit && <Note tone="ok" className="mt-3">{T(`মাটির জন্য সেরা: ${name(best)}, ${straw(best)}। দশ বছরে জৈব পদার্থ ${signed(best.dSoc, 'bn')}%${best.dSocFut != null ? `, ২০৪০-এর দশকের গরমেও ${signed(best.dSocFut, 'bn')}%` : ''}; এখনকার চক্রে ২০৪০-এর দশকে ${signed(habit.dSocFut ?? habit.dSoc, 'bn')}%।`, `Best for the soil: ${name(best)}, ${straw(best)}. Organic matter ${signed(best.dSoc, 'en')}% in ten years${best.dSocFut != null ? `, ${signed(best.dSocFut, 'en')}% even in the warmer 2040s` : ''}; the current cycle in the 2040s: ${signed(habit.dSocFut ?? habit.dSoc, 'en')}%.`)}</Note>}
      <p className="mt-2 text-[12.5px] leading-5 text-muted">
        {T(`মাটি: SoilGrids, এই খামারে ${num(c.soil.soc_g_kg, 'bn', { dp: 1 })} গ্রাম/কেজি জৈব কার্বন (${num(res.om0, 'bn', { dp: 2 })}% জৈব পদার্থ), ${TEXTURE[c.soil.texture]?.bn ?? c.soil.texture} মাটি। ফলন (FAOSTAT, দেশের গড় ২০২০–২০২৪, টন/হেক্টর): `, `Soil: SoilGrids, ${num(c.soil.soc_g_kg, 'en', { dp: 1 })} g/kg organic carbon on this farm (${num(res.om0, 'en', { dp: 2 })}% organic matter), ${(TEXTURE[c.soil.texture]?.en ?? c.soil.texture).toLowerCase()}. Yields (FAOSTAT, national mean 2020–2024, t/ha): `)}
        {crops.map((k) => `${L(cropAbroad(k).name)} ${num(c.yields[k]?.tHa ?? 0, lang, { dp: 2 })}`).join(', ')}.
        {T(' এখনকার চক্রটি আজকের মাটির কার্বন ধরে রাখে ধরে নিয়ে হিসাব (বাংলাদেশের মতোই)। মিথেন: আইপিসিসি ২০১৯ টিয়ার-১।', ' The current cycle is taken as holding today’s soil carbon (as in Bangladesh). Methane: IPCC 2019 Tier 1.')}
        {res.proxy && T(' ছোলার নিজের সহগ মডেলে নেই, তাই মসুরেরটা ধরা (দুটোই শীতের ডাল)।', ' Chickpea has no coefficients of its own in the model, so lentil’s are used (both winter grain legumes).')}
        {T(' এগুলো তুলনার জন্য বিকল্প, স্থানীয় পরামর্শ নয়; পানির হিসাব মৌসুমের পরিকল্পনা পাতায়।', ' These are options to compare, not local advice; water is on the season plan page.')}
      </p>
    </div>
  );
}

// Inside the agriculture office of মাঠের মানুষ (src/game/office.js): the officer looks at this farmer's field as it is
// now and says what to do, lists the real government programmes worth asking about in this country (each with where
// to go and its source; a committee or a bank decides, so nothing is promised), and offers the office's own help in
// the game: a soil test, a farmer field school, and an incentive seed kit when money is short.
import { useState } from 'react';
import { X, ExternalLink, FlaskConical, GraduationCap, Sprout, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { officeOf, farmTroubles, officePrograms, SERVICES, canUse, useService, initOffice } from '../../game/office';
import { KINDS, STATUS } from '../../engine/support';
import { Tags } from '../ui';

const TONE = { bad: 'bg-red-500/15 ring-red-400/30', warn: 'bg-amber-500/15 ring-amber-400/30', info: 'bg-sky-500/15 ring-sky-400/30', good: 'bg-emerald-500/15 ring-emerald-400/30' };
const TONE_ICON = { bad: AlertTriangle, warn: AlertTriangle, info: Info, good: CheckCircle2 };
const SERVICE_ICON = { soiltest: FlaskConical, school: GraduationCap, seedkit: Sprout };

export default function OfficePanel({ g, R, T, L, onClose, onDone }) {
  const off = officeOf(R.country);
  const [, bump] = useState(0);
  const [msg, setMsg] = useState(null);
  initOffice(g);
  const troubles = farmTroubles(g);
  const progs = officePrograms(g, troubles);
  const soil = g.office.soil;
  const take = (id) => {
    const r = useService(g, id);
    if (!r.ok) { setMsg(r.why); return; }
    if (id === 'soiltest') setMsg({ bn: 'মাটি পরীক্ষা হয়েছে: নিচে প্রতিটি জমির ফল।', en: 'Soil tested: each plot’s result is below.' });
    if (id === 'school') setMsg({ bn: 'মাঠ স্কুলে এক বেলা শিখলেন: +৪০ XP।', en: 'A session at the field school: +40 XP.' });
    if (id === 'seedkit') setMsg({ bn: `প্রণোদনার বীজ পেলেন: ${R.crops[r.seed].bn} ×${r.n}। সিলেক্ট করা আছে, জমিতে বুনুন।`, en: `Incentive seed received: ${R.crops[r.seed].en} ×${r.n}. Selected and ready to sow.` });
    onDone?.(id);
    bump((k) => k + 1);
  };
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-black/45 p-3 backdrop-blur-[3px]">
      <div role="dialog" aria-modal="true" aria-label={L(off.name)} tabIndex={-1} className="outcome-in g3-panel w-full max-w-2xl rounded-[26px] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-400/20 text-[22px] ring-1 ring-sky-400/40">🏛️</span>
            <div>
              <p className="font-display text-[21px] font-semibold leading-tight">{L(off.name)}</p>
              <p className="text-[12.5px] font-medium text-sky-200">{L(off.officer.name)} · <span className="text-white/60">{T('নমুনা চরিত্র', 'sample character')}</span></p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={T('বন্ধ করুন', 'Close')} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X size={16} /></button>
        </div>

        <p className="mt-3 text-[13.5px] text-white/85">{T(`"আসুন ${R.farmer.bn}! আপনার মাঠ দেখে এলাম। যা দেখলাম আর যা করা যায়:"`, `"Welcome, ${R.farmer.en}! I’ve looked at your field. Here’s what I see and what we can do:"`)}</p>
        <ul className="mt-2 space-y-1.5">
          {troubles.map((t) => { const I = TONE_ICON[t.tone]; return (
            <li key={t.id} className={`flex gap-2 rounded-xl px-3 py-2 text-[13px] leading-5 ring-1 ${TONE[t.tone]}`}><I size={15} className="mt-0.5 shrink-0" /><span>{L(t.text)}</span></li>
          ); })}
        </ul>

        <p className="mt-4 text-[12px] font-bold uppercase tracking-wider text-white/60">{T('অফিস থেকে এখনই', 'From the office, now')}</p>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
          {Object.entries(SERVICES).map(([id, sv]) => { const c = canUse(g, id), I = SERVICE_ICON[id]; return (
            <button key={id} type="button" disabled={!c.ok} onClick={() => take(id)} className="rounded-2xl bg-white/8 p-3 text-left ring-1 ring-white/12 transition-colors hover:bg-white/15 disabled:opacity-55">
              <span className="flex items-center gap-2 text-[13.5px] font-semibold"><I size={16} />{L(sv.title)}</span>
              <span className="mt-1 block text-[11.5px] leading-4 text-white/70">{c.ok ? L(sv.body) : L(c.why)}</span>
            </button>
          ); })}
        </div>
        {msg && <p role="status" className="mt-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-[12.5px] ring-1 ring-emerald-400/30">{L(msg)}</p>}
        {soil && (
          <div className="mt-2 rounded-xl bg-white/6 p-3 ring-1 ring-white/10">
            <p className="flex items-center gap-2 text-[12px] font-semibold">{T('মাটি পরীক্ষার ফল (খেলার জমি)', 'Soil test result (game plots)')} <Tags list={['DEMO']} /></p>
            <div className="mt-1.5 grid grid-cols-6 gap-1">
              {soil.map((p) => { const lv = p.fert >= 0.7 ? 2 : p.fert >= 0.5 ? 1 : 0; return (
                <span key={p.i} title={T(`জমি ${p.i + 1}`, `Plot ${p.i + 1}`)} className={`rounded-md px-1 py-1 text-center text-[10.5px] font-semibold ${['bg-red-500/35', 'bg-amber-500/35', 'bg-emerald-500/40'][lv]}`}>
                  {p.i + 1}{p.legume ? ' 🌱' : ''}<br />{T(['কম', 'মাঝারি', 'ভালো'][lv], ['low', 'fair', 'good'][lv])}
                </span>
              ); })}
            </div>
            <p className="mt-1.5 text-[11px] text-white/65">{T('কম উর্বর জমিতে কম্পোস্ট আর ডাল ফসল দিন; 🌱 মানে আগের ফসল ডাল ছিল।', 'Give low plots compost and a legume; 🌱 means the last crop was a legume.')}</p>
          </div>
        )}

        <p className="mt-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-white/60">{T('সরকারি সহায়তা, যা জিজ্ঞেস করে দেখবেন', 'Government support worth asking about')} <Tags list={['RECORD']} /></p>
        {progs.length === 0 && <p className="mt-1 text-[12.5px] text-white/65">{T('এই দেশের কর্মসূচির তালিকা এখনো নেই।', 'No programme list for this country yet.')}</p>}
        <ul className="mt-1.5 space-y-2">
          {progs.map((p) => (
            <li key={p.id} className="rounded-2xl bg-white/6 p-3 ring-1 ring-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-semibold">{L(p.name)}</span>
                {KINDS[p.kind] && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10.5px]">{L(KINDS[p.kind])}</span>}
                {STATUS[p.status] && p.status !== 'running' && <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10.5px]">{L(STATUS[p.status])}</span>}
              </div>
              <p className="mt-1 text-[12px] leading-5 text-white/80">{L(p.benefit)}</p>
              {p.where && <p className="mt-1 text-[11.5px] text-sky-200">{T('কোথায়: ', 'Where: ')}{L(p.where)}</p>}
              {p.src && <a href={p.src} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/60 underline-offset-2 hover:underline"><ExternalLink size={11} />{T('সূত্র', 'Source')}</a>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-4 text-white/55">{T('কর্মসূচিগুলো আসল, অ্যাপের যাচাই করা তালিকা থেকে; পাবেন কি না কমিটি বা ব্যাংক ঠিক করে। অফিসার, মাটি পরীক্ষা, মাঠ স্কুল আর প্রণোদনার বীজ খেলার অংশ।', 'The programmes are real, from the app’s checked list; whether you get one is decided by a committee or a bank. The officer, the soil test, the field school and the seed kit are part of the game.')}</p>
      </div>
    </div>
  );
}

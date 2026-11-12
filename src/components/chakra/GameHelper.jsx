// চক্র এজেন্ট on the farmer's phone inside মাঠের মানুষ: a helper like the companions of big open-world games. The
// farmer taps a job and the agent does it in the world (src/game/helper.js decides, the stage walks and acts) while
// the game keeps running; the phone shows the conversation: what was asked, what the agent is doing, what it did.
// Spending money needs the farmer's tap on an "allow" button first, as in the app's Chakra Agent.
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Square, ShieldAlert, Sparkles, Bug, Wheat, Droplets, Coins, Sprout, Check, CloudRain } from 'lucide-react';
import ChakraLogo from './ChakraLogo';
import { helperJobs, JOBS } from '../../game/helper';
import { num } from '../../engine/dates';

const ICON = { shield: ShieldAlert, sparkles: Sparkles, bug: Bug, wheat: Wheat, droplets: Droplets, coins: Coins, sprout: Sprout };

export default function GameHelper({ g, stage, R, T, L, lang, tick, run, chat, onAsk, onClose }) {
  const [confirm, setConfirm] = useState(null); // the sow job waiting for the farmer's "allow"
  const jobs = useMemo(() => helperJobs(g), [g, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [chat.length]);
  const cur = R.cur;
  const start = (j, approved = false) => {
    if (j.cost > 0 && !approved) { setConfirm(j); return; }
    setConfirm(null);
    onAsk(j, approved);
  };
  return (
    <div role="dialog" aria-label={T('চক্র এজেন্ট — আপনার মাঠের সহকারী', 'Chakra Agent — your farm helper')}
      className="g3-helper g3-panel pointer-events-auto absolute bottom-[150px] right-3 z-20 flex max-h-[min(70vh,560px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-[26px] text-white shadow-2xl sm:bottom-auto sm:right-[76px] sm:top-[84px]">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
        <ChakraLogo size={34} spin={!!run} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16px] font-bold leading-tight">{T('চক্র এজেন্ট', 'Chakra Agent')}</p>
          <p className="truncate text-[11.5px] text-emerald-200/80">{run ? T('কাজ করছি — হাঁটলেই আপনি নিয়ন্ত্রণ নেবেন', 'Working — move and you take over') : T('বলুন কী করব, আমি করে দেব', 'Tell me what to do and I will do it')}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={T('বন্ধ করুন', 'Close')}><X size={16} /></button>
      </div>

      {/* the conversation */}
      <div className="min-h-[90px] flex-1 space-y-2 overflow-y-auto px-4 py-3 text-[13px] leading-5" aria-live="polite">
        {chat.length === 0 && <p className="text-white/65">{T(`নমস্কার! আমি ${L(R.farmer)}-এর মাঠ দেখছি। নিচের কোনো কাজ বেছে নিন — আমি হেঁটে গিয়ে নিজেই করে দেব।`, `Hello! I am watching ${L(R.farmer)}’s field. Pick a job below — I will walk there and do it myself.`)}</p>}
        {chat.map((m, k) => (
          <p key={k} className={m.me ? 'ml-8 rounded-2xl rounded-br-md bg-emerald-500/25 px-3 py-1.5 text-right' : 'mr-6 rounded-2xl rounded-bl-md bg-white/10 px-3 py-1.5'}>
            {!m.me && m.ok && <Check size={12} className="mr-1 inline text-emerald-300" />}{L(m.text)}
          </p>
        ))}
        <span ref={end} />
      </div>

      {run ? (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-[12.5px] text-white/80">{L(JOBS[run.id].title)} · {T(`${num(run.steps ?? 0, 'bn')}টি ধাপ`, `${run.steps ?? 0} steps`)}</p>
          <button type="button" onClick={() => stage.current?.stopJob()} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/12 px-4 py-2.5 text-[13.5px] font-semibold ring-1 ring-white/20 hover:bg-white/20"><Square size={14} />{T('থামো, আমি নিজে করব', 'Stop, I’ll do it myself')}</button>
        </div>
      ) : confirm ? (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-[13px]">{T(`বীজ কিনতে ${cur}${num(confirm.cost, 'bn')} লাগবে`, `Seed will cost ${cur}${confirm.cost}`)}: {confirm.buy.map((b) => `${L(R.crops[b.k])} ×${num(b.n, lang)}`).join(', ')}. {T('প্রতিটি জমিতে আগের ফসল থেকে আলাদা ফসল বুনব।', 'Each plot gets a different crop from its last one.')}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={!confirm.afford} onClick={() => start(confirm, true)} className="btn-gloss flex-1 rounded-full px-4 py-2.5 text-[13.5px] font-semibold disabled:opacity-40">{confirm.afford ? T('অনুমতি দিলাম', 'Allow') : T('টাকা কম', 'Not enough money')}</button>
            <button type="button" onClick={() => setConfirm(null)} className="rounded-full bg-white/10 px-4 py-2.5 text-[13.5px] font-semibold">{T('না', 'No')}</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-1.5 border-t border-white/10 px-3 py-3">
          {jobs.length === 0 && <p className="px-1 text-[12.5px] text-white/65">{T('এখন জরুরি কোনো কাজ নেই। ফসল বাড়ছে — একটু পরে আবার দেখুন।', 'Nothing needs doing right now. The crops are growing — check again soon.')}</p>}
          {jobs.map((j) => {
            const Icon = ICON[j.icon] ?? Sparkles;
            return (
              <button key={j.id} type="button" disabled={!!j.blocked} onClick={() => start(j)}
                className={`flex items-center gap-2.5 rounded-2xl px-3 py-2 text-left ring-1 transition-colors disabled:opacity-60 ${j.urgent ? 'bg-red-600/25 ring-red-300/40 hover:bg-red-600/35' : 'bg-white/8 ring-white/12 hover:bg-white/15'}`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10">{j.blocked ? <CloudRain size={16} /> : <Icon size={16} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold leading-tight">{L(j.title)}{j.n > 1 && j.id !== 'rounds' ? ` · ${num(j.n, lang)}` : ''}</span>
                  <span className="block truncate text-[11.5px] text-white/65">
                    {j.blocked ? L(j.blocked) : j.cost > 0 ? T(`খরচ ${cur}${num(j.cost, 'bn')} · অনুমতি লাগবে`, `Costs ${cur}${j.cost} · needs your OK`) : j.gain ? T(`আয় প্রায় ${cur}${num(j.gain, 'bn')}`, `About ${cur}${j.gain} in`) : j.id === 'rounds' ? T('পোকা, ফসল তোলা, পানি, বিক্রি — যা দরকার', 'Pests, harvest, water, sell — whatever is needed') : T('বিনা খরচে, এখনই', 'Free, right now')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

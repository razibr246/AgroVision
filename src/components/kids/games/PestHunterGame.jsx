import { useState } from 'react';
import { Bug, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useStore } from '../../../store';
import { KIDS_PESTS } from '../../../data/kidsData';
import { evaluateIpmAction } from '../../../engine/kidsEngine';
import { bnDigits, num } from '../../../engine/dates';

const BUG_IDS = Object.keys(KIDS_PESTS);

export default function PestHunterGame({ onRecordActivity, fx }) {
  const { s, T, L } = useStore();
  const [idx, setIdx] = useState(0);
  const [fieldHealth, setFieldHealth] = useState(80);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState(null);

  const bugId = BUG_IDS[idx % BUG_IDS.length];
  const bug = KIDS_PESTS[bugId];

  const handleAction = (chosenAction) => {
    if (result) return;
    const res = evaluateIpmAction({ bugId, chosenAction });
    setResult(res);
    setFieldHealth((h) => Math.max(10, Math.min(100, h + res.cropHealthDelta)));
    if (res.success) {
      fx?.('cheer');
      setCorrectCount((c) => c + 1);
      onRecordActivity?.({
        xpDelta: 20,
        miniGamePatch: { ipmCorrect: 1 },
        flags: { completedIpmMissions: 1 },
      });
    } else {
      fx?.('sad');
    }
  };

  const nextOrganism = () => {
    setResult(null);
    setIdx((i) => (i + 1) % BUG_IDS.length);
  };

  return (
    <div className="space-y-4" data-testid="kids-game-pest">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-lime-200 bg-gradient-to-br from-lime-50 to-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-xs">
            <Bug className="h-6 w-6 text-emerald-600" />
          </span>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              {T('পোকা বন্ধু না শত্রু? (ইকো-IPM শিকারি)', 'Pest Hunter & Eco-IPM')}
            </h3>
            <p className="text-xs text-slate-600">
              {T(
                'বন্ধু পোকাকে বাঁচাও আর শত্রু পোকাকে আলোক ফাঁদ বা নিম তেলে তাড়াও—রাসায়নিক বিষ এড়িয়ে চলো!',
                'Protect helpful predators and stop harmful crop pests with eco-traps instead of toxic spray!'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-extrabold tabular">
          <span className="rounded-2xl bg-white px-3 py-1.5 text-emerald-800 shadow-xs">
            {T(`মাঠের স্বাস্থ্য: ${bnDigits(fieldHealth)}%`, `Field Health: ${fieldHealth}%`)}
          </span>
          <span className="rounded-2xl bg-white px-3 py-1.5 text-amber-800 shadow-xs">
            {T(`সঠিক: ${bnDigits(correctCount)}`, `Correct: ${correctCount}`)}
          </span>
        </div>
      </div>

      {/* Organism Inspection Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-lime-50 text-6xl shadow-xs">
            {bug.displayIcon || bug.icon}
          </div>
          <div className="space-y-1">
            <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
              {bug.scientificName} • {T(`পর্যবেক্ষণ ${bnDigits(idx + 1)}/${bnDigits(BUG_IDS.length)}`, `Spotted ${idx + 1}/${BUG_IDS.length}`)}
            </span>
            <h4 className="text-xl font-extrabold text-slate-900">
              {L(bug.name)}
            </h4>
            <p className="text-sm leading-relaxed text-slate-700">
              {L(bug.desc)}
            </p>
          </div>
        </div>

        {!result ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              data-testid="ipm-protect-btn"
              onClick={() => handleAction('protect')}
              className="min-h-14 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-extrabold text-emerald-950 hover:bg-emerald-100 active:scale-95"
            >
              💚 {T('বন্ধু—রক্ষা করো!', 'Friend — Protect!')}
            </button>
            <button
              type="button"
              data-testid="ipm-ecotrap-btn"
              onClick={() => handleAction('eco_trap')}
              className="min-h-14 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm font-extrabold text-amber-950 hover:bg-amber-100 active:scale-95"
            >
              🏮 {T('ইকো-ফাঁদ / নিম দাও', 'Eco-Trap / Neem')}
            </button>
            <button
              type="button"
              data-testid="ipm-spray-btn"
              onClick={() => handleAction('chemical_spray')}
              className="min-h-14 rounded-2xl border-2 border-rose-200 bg-rose-50 px-3 py-2 text-sm font-extrabold text-rose-900 hover:bg-rose-100 active:scale-95"
            >
              ☠️ {T('কড়া বিষ স্প্রে করো', 'Chemical Spray')}
            </button>
          </div>
        ) : (
          <div
            className={`mt-5 space-y-3 rounded-2xl border p-4 ${
              result.success ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                <ShieldCheck className={`h-5 w-5 ${result.success ? 'text-emerald-600' : 'text-amber-600'}`} />
                {result.success ? T('বুদ্ধিমান সিদ্ধান্ত!', 'Eco-Smart Choice!') : T('সতর্কতা!', 'Careful!')}
              </span>
              {result.success && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5" />+{num(20, s.lang)} XP
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-slate-800">{L(result.feedback)}</p>
            <button
              type="button"
              onClick={nextOrganism}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              <span>{T('পরবর্তী পোকা দেখো', 'Inspect Next Bug')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

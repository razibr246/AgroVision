import { useState } from 'react';
import { Microscope, Leaf, Link2, ArrowUp, ArrowDown, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useStore } from '../../../store';
import { KIDS_SCIENCE_MODULES } from '../../../data/kidsData';
import {
  evaluateLivingClassification,
  evaluateFoodChainOrder,
  simulatePhotosynthesis,
} from '../../../engine/kidsEngine';
import { bnDigits, num } from '../../../engine/dates';

function makeScrambledIds(chain) {
  const ids = chain.correctOrder.map((x) => x.id);
  // Deterministic non-solved initial order: [2nd, 4th, 1st, 3rd]
  return ids.length >= 4 ? [ids[1], ids[3], ids[0], ids[2]] : [...ids].reverse();
}

export default function BiologyLab({ onRecordActivity, fx }) {
  const { s, T, L } = useStore();
  const { livingItems, foodChains } = KIDS_SCIENCE_MODULES.biologyLab;

  const [tab, setTab] = useState('living'); // 'living' | 'photosynthesis' | 'foodchain'

  // Sub-game 1: Living vs Non-Living
  const [itemIdx, setItemIdx] = useState(0);
  const [livingResult, setLivingResult] = useState(null);
  const [livingScore, setLivingScore] = useState(0);

  // Sub-game 2: Photosynthesis Leaf Factory
  const [sunlight, setSunlight] = useState(75);
  const [water, setWater] = useState(75);
  const [co2, setCo2] = useState(75);

  // Sub-game 3: Food Chain ordering
  const [chainIdx, setChainIdx] = useState(0);
  const activeChain = foodChains[chainIdx] || foodChains[0];
  const [orderedIds, setOrderedIds] = useState(() => makeScrambledIds(activeChain));
  const [chainResult, setChainResult] = useState(null);

  const currentLiving = livingItems[itemIdx % livingItems.length];
  const photo = simulatePhotosynthesis({ sunlight, water, co2 });

  const answerLiving = (chosenClass) => {
    if (livingResult) return;
    const res = evaluateLivingClassification(currentLiving.id, chosenClass);
    setLivingResult(res);
    if (res.isCorrect) {
      fx?.('cheer');
      setLivingScore((c) => c + 1);
      onRecordActivity?.({
        xpDelta: 15,
        miniGamePatch: { bioLivingCorrect: 1 },
      });
    } else {
      fx?.('sad');
    }
  };

  const nextLiving = () => {
    setLivingResult(null);
    setItemIdx((i) => (i + 1) % livingItems.length);
  };

  const moveChainItem = (pos, dir) => {
    const target = pos + dir;
    if (target < 0 || target >= orderedIds.length) return;
    fx?.('pop');
    const copy = [...orderedIds];
    [copy[pos], copy[target]] = [copy[target], copy[pos]];
    setOrderedIds(copy);
    setChainResult(null);
  };

  const switchChain = (idx) => {
    fx?.('pop');
    setChainIdx(idx);
    setOrderedIds(makeScrambledIds(foodChains[idx]));
    setChainResult(null);
  };

  const checkChain = () => {
    const res = evaluateFoodChainOrder(activeChain.id, orderedIds);
    setChainResult(res);
    if (res.isCorrect) {
      fx?.('cheer');
      onRecordActivity?.({
        xpDelta: 40,
        miniGamePatch: { bioChainsSolved: activeChain.id },
      });
    } else {
      fx?.('sad');
    }
  };

  return (
    <div className="space-y-4" data-testid="kids-science-biology">
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-xs">
            <Microscope className="h-6 w-6 text-emerald-600" />
          </span>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              {L(KIDS_SCIENCE_MODULES.biologyLab.title)}
            </h3>
            <p className="text-xs text-slate-600">
              {L(KIDS_SCIENCE_MODULES.biologyLab.subtitle)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('living')}
            className={`min-h-12 rounded-2xl border px-3.5 text-xs font-extrabold transition sm:text-sm ${
              tab === 'living'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-emerald-200 bg-white text-slate-700 hover:bg-emerald-50'
            }`}
          >
            🔍 {T('জীব বনাম জড়', 'Living vs Non-Living')}
          </button>
          <button
            type="button"
            onClick={() => setTab('photosynthesis')}
            className={`min-h-12 rounded-2xl border px-3.5 text-xs font-extrabold transition sm:text-sm ${
              tab === 'photosynthesis'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-emerald-200 bg-white text-slate-700 hover:bg-emerald-50'
            }`}
          >
            <Leaf className="mr-1 inline h-4 w-4" />
            {T('সালোকসংশ্লেষণ কারখানা', 'Photosynthesis Factory')}
          </button>
          <button
            type="button"
            onClick={() => setTab('foodchain')}
            className={`min-h-12 rounded-2xl border px-3.5 text-xs font-extrabold transition sm:text-sm ${
              tab === 'foodchain'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-emerald-200 bg-white text-slate-700 hover:bg-emerald-50'
            }`}
          >
            <Link2 className="mr-1 inline h-4 w-4" />
            {T('খাদ্যশিকল সাজাও', 'Food Chain Builder')}
          </button>
        </div>
      </div>

      {/* Sub-game 1: Living vs Non-Living */}
      {tab === 'living' && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 tabular">
              {T(`নমুনা ${bnDigits(itemIdx + 1)}/${bnDigits(livingItems.length)}`, `Item ${itemIdx + 1}/${livingItems.length}`)}
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-900 tabular">
              {T(`সঠিক উত্তর: ${bnDigits(livingScore)}`, `Solved: ${livingScore}`)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-50 p-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white text-6xl shadow-xs">
              {currentLiving.icon}
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-extrabold text-slate-900">
                {L(currentLiving.name)}
              </h4>
              <p className="text-xs font-bold text-emerald-800">
                {T(
                  '৩টি জাদুর প্রশ্ন ভাবো: (১) এটি কি খায়? (২) এটি কি শ্বাস নেয়? (৩) এটি কি বড় হয়?',
                  'Ask the 3 science questions: 1) Does it eat? 2) Does it breathe? 3) Does it grow?'
                )}
              </p>
            </div>
          </div>

          {!livingResult ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                data-testid="bio-btn-living"
                onClick={() => answerLiving('living')}
                className="min-h-14 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 text-base font-extrabold text-emerald-950 hover:bg-emerald-100 active:scale-95"
              >
                🌱 {T('জীব', 'Living Thing')}
              </button>
              <button
                type="button"
                data-testid="bio-btn-nonliving"
                onClick={() => answerLiving('nonliving')}
                className="min-h-14 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 text-base font-extrabold text-slate-900 hover:bg-slate-100 active:scale-95"
              >
                🪨 {T('জড়', 'Non-Living Thing')}
              </button>
            </div>
          ) : (
            <div
              data-testid="bio-living-feedback"
              className={`space-y-3 rounded-2xl border p-4 ${
                livingResult.isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">
                  {livingResult.isCorrect ? T('একদম সঠিক গোয়েন্দা!', 'Spot-On Detective!') : T('আরেকটু ভেবে দেখো!', 'Interesting Clue!')}
                </span>
                {livingResult.isCorrect && (
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">
                    +{num(15, s.lang)} XP
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-xl bg-white px-2.5 py-1">
                  {currentLiving.eats ? '✅' : '❌'} {T('খায়/পুষ্টি নেয়', 'Eats/Feeds')}
                </span>
                <span className="rounded-xl bg-white px-2.5 py-1">
                  {currentLiving.breathes ? '✅' : '❌'} {T('শ্বাস নেয়', 'Breathes')}
                </span>
                <span className="rounded-xl bg-white px-2.5 py-1">
                  {currentLiving.grows ? '✅' : '❌'} {T('বড় হয়', 'Grows')}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-800">{L(livingResult.fact)}</p>
              <button
                type="button"
                onClick={nextLiving}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-extrabold text-white hover:bg-slate-800"
              >
                <span>{T('পরবর্তী নমুনা দেখো', 'Next Specimen')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sub-game 2: Photosynthesis Leaf Factory */}
      {tab === 'photosynthesis' && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="rounded-2xl bg-emerald-50 p-3 text-center text-xs font-extrabold text-emerald-900 sm:text-sm">
            6CO₂ + 6H₂O + ☀️ {T('সূর্যালোক → গ্লুকোজ (খাদ্য) + 6O₂ (অক্সিজেন)', 'Sunlight → Glucose Food + 6O₂ Oxygen')}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              {[
                { label: { bn: '☀️ সূর্যের আলো', en: '☀️ Sunlight' }, val: sunlight, set: setSunlight, accent: 'accent-amber-500' },
                { label: { bn: '💧 মাটির পানি (H₂O)', en: '💧 Soil Water (H₂O)' }, val: water, set: setWater, accent: 'accent-sky-600' },
                { label: { bn: '🫧 বাতাসের CO₂', en: '🫧 Air CO₂' }, val: co2, set: setCo2, accent: 'accent-emerald-600' },
              ].map((ctrl, i) => (
                <div key={i} className="rounded-2xl bg-slate-50 p-3">
                  <div className="mb-1 flex justify-between text-xs font-bold text-slate-800">
                    <span>{L(ctrl.label)}</span>
                    <span className="tabular">{num(ctrl.val, s.lang)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={ctrl.val}
                    onChange={(e) => ctrl.set(Number(e.target.value))}
                    className={`h-3 w-full cursor-pointer ${ctrl.accent}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-4 text-center">
              <div>
                <div className="text-4xl">🌿</div>
                <div className="mt-2 text-2xl font-extrabold text-emerald-900 tabular">
                  {T(`গ্লুকোজ উৎপাদন: ${bnDigits(photo.glucoseRate)}%`, `Sugar Output: ${photo.glucoseRate}%`)}
                </div>
                <div className="mt-1 text-lg tracking-widest">
                  {'🫧'.repeat(Math.max(1, photo.oxygenBubbles))}
                </div>
                <p className="mt-1 text-xs font-bold text-sky-800 tabular">
                  {T(`অক্সিজেন বুদবুদ: ${bnDigits(photo.oxygenBubbles)}`, `O₂ Bubbles Released: ${photo.oxygenBubbles}`)}
                </p>
              </div>
              <p className="mt-3 rounded-xl bg-white/90 p-2.5 text-xs font-semibold text-slate-800">
                {L(photo.statusText)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-game 3: Food Chain Ordering */}
      {tab === 'foodchain' && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap gap-2">
            {foodChains.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onClick={() => switchChain(idx)}
                className={`min-h-11 rounded-2xl border px-3.5 text-xs font-extrabold ${
                  idx === chainIdx
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {L(c.title)}
              </button>
            ))}
          </div>

          <p className="text-sm font-bold text-slate-800">{L(activeChain.prompt)}</p>

          <div className="space-y-2">
            {orderedIds.map((id, pos) => {
              const node = activeChain.correctOrder.find((x) => x.id === id);
              if (!node) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-extrabold text-emerald-700 shadow-xs tabular">
                      {s.lang === 'bn' ? bnDigits(pos + 1) : pos + 1}
                    </span>
                    <span className="text-2xl">{node.icon}</span>
                    <span className="text-xs font-extrabold text-slate-900 sm:text-sm">
                      {L(node.label).replace(/^\d+\.\s*/, '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pos === 0}
                      onClick={() => moveChainItem(pos, -1)}
                      aria-label={T('উপরে তুলুন', 'Move up')}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={pos === orderedIds.length - 1}
                      onClick={() => moveChainItem(pos, 1)}
                      aria-label={T('নিচে নামান', 'Move down')}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={checkChain}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{T('খাদ্যশিকল যাচাই করো', 'Check Food Chain Order')}</span>
          </button>

          {chainResult && (
            <div
              className={`rounded-2xl border p-4 text-sm ${
                chainResult.isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'
              }`}
            >
              <p className="font-extrabold">
                {chainResult.isCorrect ? (
                  <>
                    <Sparkles className="mr-1 inline h-4 w-4 text-emerald-600" />
                    {T('নিখুঁত খাদ্যশিকল! +৪০ XP', 'Perfect Ecosystem Chain! +40 XP')}
                  </>
                ) : (
                  T(
                    `${bnDigits(chainResult.totalCount)}টির মধ্যে ${bnDigits(chainResult.correctPositions)}টি সঠিক জায়গায় আছে—গাছ সবার প্রথমে রাখো!`,
                    `${chainResult.correctPositions} of ${chainResult.totalCount} in place—start with the Producer plant!`
                  )
                )}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                {L(chainResult.pesticideLesson)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

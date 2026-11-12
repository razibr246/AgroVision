import { Sparkles, ArrowRight, RotateCcw, BookOpen } from 'lucide-react';
import { useStore } from '../../store';
import { bnDigits } from '../../engine/dates';

export default function FeedbackModal({
  feedback,
  onTryAgain,
  onContinue,
}) {
  const { s, T, L } = useStore();
  if (!feedback) return null;

  const { isCorrect, taraNote, mathSteps, explanationText } = feedback;

  const stepList = mathSteps
    ? [
        { num: 1, title: { bn: '১. সূত্র ও তথ্য', en: '1. Formula & Given' }, body: mathSteps.step1_formula },
        { num: 2, title: { bn: '২. ধাপে ধাপে হিসাব', en: '2. Calculation' }, body: mathSteps.step2_calculation },
        { num: 3, title: { bn: '৩. সঠিক উত্তর', en: '3. Target Answer' }, body: mathSteps.step3_correctAnswer },
        { num: 4, title: { bn: '৪. তোমার উত্তর বিশ্লেষণ', en: '4. Your Comparison' }, body: mathSteps.step4_comparison },
        { num: 5, title: { bn: '৫. তারার কৃষি পরামর্শ', en: '5. Tara’s Insight' }, body: mathSteps.step5_taraInsight },
      ]
    : null;

  return (
    <div
      data-testid="kids-feedback"
      className={`rounded-3xl border-2 p-4 shadow-md transition-all sm:p-5 ${
        isCorrect
          ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-lime-50'
          : 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-xs ${
            isCorrect ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'
          }`}
        >
          {isCorrect ? '🌟' : '🛰️'}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-lg font-extrabold text-slate-900">
            {isCorrect
              ? T('সাবাশ! একদম সঠিক উত্তর!', 'Awesome! Spot-On Answer!')
              : T('চিন্তা নেই! চলো একসাথে শিখি', 'Good Try! Let’s Learn Step by Step')}
          </h4>
          <p className="text-sm leading-relaxed text-slate-700">
            {explanationText || taraNote}
          </p>
        </div>
      </div>

      {/* 5-step Explanatory Feedback Card when wrong on Math Challenge */}
      {!isCorrect && stepList && (
        <div
          data-testid="kids-five-step-explanation"
          className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-white/90 p-3.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-amber-800">
            <BookOpen className="h-4 w-4" />
            <span>{T('তারার ৫-ধাপের ব্যাখ্যা', 'Tara’s 5-Step Explanation')}</span>
          </div>
          <ol className="space-y-2">
            {stepList.map((st) => (
              <li key={st.num} className="rounded-xl bg-amber-50/70 px-3 py-2 text-xs sm:text-sm">
                <div className="font-bold text-amber-950">{L(st.title)}</div>
                <div className="mt-0.5 text-slate-800">{typeof st.body === 'object' ? L(st.body) : st.body}</div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Non-math concise hint when wrong */}
      {!isCorrect && !stepList && taraNote && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800">
          <strong className="text-amber-900">{T('তারার ইঙ্গিত: ', 'Tara’s Clue: ')}</strong>
          {taraNote}
        </div>
      )}

      {/* Celebratory bonus insight */}
      {isCorrect && taraNote && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-white/80 px-3.5 py-2.5 text-sm text-emerald-950">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{taraNote}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {!isCorrect && onTryAgain && (
          <button
            type="button"
            data-testid="kids-try-again"
            onClick={onTryAgain}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-amber-500 bg-white px-4 text-sm font-extrabold text-amber-900 hover:bg-amber-50 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{T('আবার চেষ্টা করো', 'Try Again')}</span>
          </button>
        )}

        <button
          type="button"
          data-testid="kids-next-round"
          onClick={onContinue}
          className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold text-white shadow-sm transition active:scale-95 ${
            isCorrect
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-slate-700 hover:bg-slate-800'
          }`}
        >
          <span>
            {isCorrect
              ? T('পরবর্তী ধাপ', 'Next Round')
              : T(`পরের ধাপে যাও (${s.lang === 'bn' ? bnDigits(1) : '1'}টি বাদ দিয়ে)`, 'Continue Anyway')}
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

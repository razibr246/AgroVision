import { useState, useEffect } from 'react';
import { CheckCircle2, Delete, RotateCcw } from 'lucide-react';
import { useStore } from '../../store';
import { bnDigits, num } from '../../engine/dates';

const DIGITS_EN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
const DIGITS_BN = ['১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '.', '০', '⌫'];

export default function ChallengeInput({
  mode, // 'choice' | 'number' | 'slider'
  prompt,
  choices = [],
  unit,
  sliderConfig,
  hintText,
  disabled = false,
  onSubmit,
}) {
  const { s, T, L } = useStore();
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [textValue, setTextValue] = useState('');
  const [sliderValue, setSliderValue] = useState(() =>
    sliderConfig ? Math.round(((sliderConfig.min + sliderConfig.max) / 2) * 100) / 100 : 0
  );

  useEffect(() => {
    setSelectedChoice(null);
    setTextValue('');
    if (sliderConfig) {
      const mid = Math.round(((sliderConfig.min + sliderConfig.max) / 2) * 100) / 100;
      setSliderValue(mid);
    }
  }, [mode, prompt, sliderConfig?.min, sliderConfig?.max]);

  const handlePadTap = (key) => {
    if (disabled) return;
    if (key === '⌫') {
      setTextValue((prev) => prev.slice(0, -1));
      return;
    }
    const normalizedKey = DIGITS_BN.includes(key) && key !== '.' ? DIGITS_EN[DIGITS_BN.indexOf(key)] : key;
    if (normalizedKey === '.' && textValue.includes('.')) return;
    if (textValue.length >= 10) return;
    setTextValue((prev) => `${prev}${normalizedKey}`);
  };

  const submitForm = (e) => {
    e?.preventDefault?.();
    if (disabled) return;
    if (mode === 'choice' && selectedChoice != null) {
      onSubmit(selectedChoice);
    } else if (mode === 'number' && textValue.trim() !== '') {
      onSubmit(textValue.trim());
    } else if (mode === 'slider') {
      onSubmit(sliderValue);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold leading-relaxed text-slate-900 sm:text-lg">
        {prompt}
      </h3>

      {hintText && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          💡 {hintText}
        </p>
      )}

      {mode === 'choice' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {choices.map((opt) => {
            const active = selectedChoice === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`kids-choice-${opt.id}`}
                disabled={disabled}
                onClick={() => {
                  setSelectedChoice(opt.id);
                  onSubmit(opt.id);
                }}
                className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${
                  active
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40'
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                  {opt.icon || '🌱'}
                </span>
                <span className="text-sm font-bold leading-snug sm:text-base">
                  {typeof opt.label === 'object' ? L(opt.label) : opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {mode === 'number' && (
        <form onSubmit={submitForm} className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                data-testid="kids-number-input"
                value={textValue}
                disabled={disabled}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder={T('উত্তর লেখো (যেমন: ১৫ বা 15)...', 'Type your answer (e.g. 15)...')}
                className="min-h-14 w-full rounded-2xl border-2 border-emerald-300 bg-white px-4 pr-24 text-xl font-extrabold text-slate-900 tabular focus:border-emerald-600 focus:outline-none"
              />
              {unit && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
                  {typeof unit === 'object' ? L(unit) : unit}
                </span>
              )}
            </div>
            <button
              type="submit"
              data-testid="kids-submit-answer"
              disabled={disabled || textValue.trim() === ''}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-base font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>{T('উত্তর যাচাই করো', 'Check Answer')}</span>
            </button>
          </div>

          {/* Child-friendly Tactile Keypad */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{T('ট্যাপ করে সংখ্যা বসাও:', 'Tap numbers to answer:')}</span>
              <button
                type="button"
                onClick={() => setTextValue('')}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {T('মুছো', 'Clear')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(s.lang === 'bn' ? DIGITS_BN : DIGITS_EN).map((k, idx) => (
                <button
                  key={`${idx}-${k}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePadTap(k)}
                  className="flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-extrabold text-slate-900 shadow-xs transition hover:bg-emerald-50 active:scale-95"
                >
                  {k === '⌫' ? <Delete className="h-5 w-5 text-rose-600" /> : k}
                </button>
              ))}
            </div>
          </div>
        </form>
      )}

      {mode === 'slider' && sliderConfig && (
        <form onSubmit={submitForm} className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 tabular">
              {num(sliderConfig.min, s.lang)} {sliderConfig.unit}
            </span>
            <span className="rounded-2xl bg-white px-4 py-1.5 text-2xl font-extrabold text-emerald-700 shadow-xs tabular">
              {s.lang === 'bn' ? bnDigits(sliderValue) : sliderValue} {sliderConfig.unit}
            </span>
            <span className="text-xs font-bold text-slate-600 tabular">
              {num(sliderConfig.max, s.lang)} {sliderConfig.unit}
            </span>
          </div>

          <input
            type="range"
            min={sliderConfig.min}
            max={sliderConfig.max}
            step={sliderConfig.step || 0.1}
            value={sliderValue}
            disabled={disabled}
            onChange={(e) => setSliderValue(parseFloat(e.target.value))}
            className="h-4 w-full cursor-pointer accent-emerald-600"
          />

          <button
            type="submit"
            data-testid="kids-submit-slider"
            disabled={disabled}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-base font-extrabold text-white shadow-sm hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>{T('স্লাইডার মান যাচাই করো', 'Check Slider Value')}</span>
          </button>
        </form>
      )}
    </div>
  );
}

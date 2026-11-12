import { useState } from 'react';
import { Droplets, Sun, Sprout, Sparkles, RotateCcw } from 'lucide-react';
import { useStore } from '../../../store';
import { PLANT_STAGES, simulatePlantGrowthStep } from '../../../engine/kidsEngine';
import { bnDigits, num } from '../../../engine/dates';

export default function PlantGrowthGame({ onRecordActivity, fx }) {
  const { s, T, L } = useStore();
  const [stage, setStage] = useState(1);
  const [moisture, setMoisture] = useState(55);
  const [sunlight, setSunlight] = useState(80);
  const [compost, setCompost] = useState(55);
  const [weeds, setWeeds] = useState(20);
  const [health, setHealth] = useState(75);
  const [day, setDay] = useState(1);
  const [stepResult, setStepResult] = useState(null);
  const [harvested, setHarvested] = useState(false);

  const currentStageObj = PLANT_STAGES.find((st) => st.stage === stage) || PLANT_STAGES[0];

  const handleGrowDay = () => {
    const res = simulatePlantGrowthStep({
      currentStage: stage,
      soilMoisture: moisture,
      sunlight,
      compost,
      weedLevel: weeds,
    });
    setStepResult(res);
    setDay((d) => d + 1);
    setHealth((h) => Math.max(10, Math.min(100, h + res.healthDelta)));

    if (res.nextStage > stage) {
      setStage(res.nextStage);
      fx?.(res.status === 'harvest_ready' ? 'cheer' : 'sprout');
    } else if (res.healthDelta < 0) {
      fx?.('sad');
    }

    // Natural daily evaporation + slight weed growth so learner manages the ecosystem
    setMoisture((m) => Math.max(10, m - 12));
    setWeeds((w) => Math.min(95, w + 10));

    if (res.status === 'harvest_ready' && !harvested) {
      setHarvested(true);
      onRecordActivity?.({
        xpDelta: 65,
        miniGamePatch: { plantsHarvested: 1 },
      });
    }
  };

  const resetCrop = () => {
    fx?.('pop');
    setStage(1);
    setMoisture(55);
    setSunlight(80);
    setCompost(55);
    setWeeds(20);
    setHealth(75);
    setDay(1);
    setStepResult(null);
    setHarvested(false);
  };

  const moistureOptimal = moisture >= 45 && moisture <= 80;

  return (
    <div className="space-y-4" data-testid="kids-game-plant">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            {T('নিজের হাতে ফসল ফলাও (৫ ধাপ)', 'Grow Your Plant (5 Growth Stages)')}
          </h3>
          <p className="text-xs text-slate-600">
            {T(
              'মাটির রস ৪৫–৮০% আদর্শ সীমায় রাখো, আগাছা পরিষ্কার করো এবং সোনালি ফসল কাটো!',
              'Keep soil moisture inside 45–80% green band, clear weeds & harvest golden grain!'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-2xl bg-white px-3 py-1.5 text-xs font-extrabold text-emerald-800 shadow-xs tabular">
            {T(`দিন ${bnDigits(day)}`, `Day ${day}`)}
          </span>
          <span className="rounded-2xl bg-white px-3 py-1.5 text-xs font-extrabold text-amber-800 shadow-xs tabular">
            {T(`স্বাস্থ্য ${bnDigits(health)}%`, `Health ${health}%`)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Visual Plant Plot SVG Stage */}
        <div className="flex flex-col items-center justify-between rounded-3xl border border-emerald-200 bg-gradient-to-b from-sky-100 via-sky-50 to-amber-100 p-5 text-center">
          <div className="flex w-full items-center justify-between text-xs font-bold text-slate-700">
            <span>{T(`ধাপ ${bnDigits(stage)}/৫`, `Stage ${stage}/5`)}</span>
            <span className="rounded-full bg-white/90 px-3 py-1 font-extrabold text-emerald-900">
              {currentStageObj.icon} {L(currentStageObj.name)}
            </span>
          </div>

          <div className="my-6 flex flex-col items-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-emerald-50/90 text-7xl shadow-md transition-transform duration-300">
              {currentStageObj.icon}
            </div>
            <div className="mt-3 h-4 w-56 rounded-full bg-amber-800/80 shadow-inner" />
          </div>

          {/* Soil Moisture Gauge */}
          <div className="w-full space-y-1.5 rounded-2xl bg-white/90 p-3 text-left">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="inline-flex items-center gap-1 text-sky-800">
                <Droplets className="h-4 w-4 text-sky-600" />
                {T('মাটির রস (আদর্শ ৪৫–৮০%)', 'Soil Moisture (Ideal 45–80%)')}
              </span>
              <span className={`tabular ${moistureOptimal ? 'text-emerald-700' : 'text-rose-600'}`}>
                {num(moisture, s.lang)}%
              </span>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-200">
              {/* Green ideal zone highlight 45-80% */}
              <div
                className="absolute inset-y-0 bg-emerald-200/70"
                style={{ left: '45%', width: '35%' }}
              />
              <div
                className={`relative h-full rounded-full transition-all ${
                  moisture < 30 || moisture > 90
                    ? 'bg-rose-500'
                    : moistureOptimal
                      ? 'bg-emerald-600'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${moisture}%` }}
              />
            </div>
          </div>
        </div>

        {/* Field Care Controls */}
        <div className="flex flex-col justify-between space-y-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-testid="plant-water-btn"
              onClick={() => {
                fx?.('splash');
                setMoisture((m) => Math.min(100, m + 18));
              }}
              className="min-h-12 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs font-extrabold text-sky-900 hover:bg-sky-100 active:scale-95 sm:text-sm"
            >
              💧 {T('সেচ দাও (+১৮%)', 'Water (+18%)')}
            </button>
            <button
              type="button"
              onClick={() => {
                fx?.('splash');
                setMoisture((m) => Math.max(0, m - 18));
              }}
              className="min-h-12 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100 active:scale-95 sm:text-sm"
            >
              🚧 {T('পানি সরাও (-১৮%)', 'Drain (-18%)')}
            </button>
            <button
              type="button"
              onClick={() => {
                fx?.('pop');
                setWeeds((w) => Math.max(0, w - 30));
              }}
              className="min-h-12 rounded-2xl border border-lime-200 bg-lime-50 px-3 py-2.5 text-xs font-extrabold text-lime-900 hover:bg-lime-100 active:scale-95 sm:text-sm"
            >
              🌿 {T(`আগাছা সাফ (${bnDigits(weeds)}%)`, `Clear Weeds (${weeds}%)`)}
            </button>
            <button
              type="button"
              onClick={() => {
                fx?.('pop');
                setCompost((c) => Math.min(100, c + 20));
              }}
              className="min-h-12 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-extrabold text-emerald-900 hover:bg-emerald-100 active:scale-95 sm:text-sm"
            >
              🪱 {T(`কম্পোস্ট (${bnDigits(compost)}%)`, `Compost (${compost}%)`)}
            </button>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="inline-flex items-center gap-1">
                <Sun className="h-4 w-4 text-amber-500" />
                {T('সূর্যের আলো', 'Sunlight')}
              </span>
              <span className="tabular">{num(sunlight, s.lang)}%</span>
            </div>
            <input
              type="range"
              min={15}
              max={100}
              value={sunlight}
              onChange={(e) => setSunlight(Number(e.target.value))}
              className="h-3 w-full cursor-pointer accent-amber-500"
            />
          </div>

          {stepResult && (
            <div
              className={`rounded-2xl border px-3.5 py-2.5 text-xs font-medium leading-relaxed sm:text-sm ${
                stepResult.healthDelta > 0
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : 'border-amber-300 bg-amber-50 text-amber-950'
              }`}
            >
              {L(stepResult.advice)}
            </div>
          )}

          {harvested ? (
            <div className="space-y-2 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-center">
              <div className="inline-flex items-center gap-1.5 text-base font-extrabold text-amber-950">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <span>{T('বাম্পার ফসল সংগ্রহ সম্পন্ন! +৬৫ XP', 'Harvest Collected! +65 XP')}</span>
              </div>
              <button
                type="button"
                onClick={resetCrop}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-extrabold text-white hover:bg-emerald-700"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{T('আবার নতুন চারা লাগাও', 'Plant New Crop')}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="plant-grow-day-btn"
              onClick={handleGrowDay}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-base font-extrabold text-white shadow-sm hover:bg-emerald-700 active:scale-95"
            >
              <Sprout className="h-5 w-5" />
              <span>{T('পরের দিন এগিয়ে যাও (বৃদ্ধি দেখো)', 'Advance Next Day')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

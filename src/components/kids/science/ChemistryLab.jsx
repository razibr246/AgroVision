import { useState } from 'react';
import { FlaskConical, RotateCcw, Sparkles, CheckCircle2, Undo2 } from 'lucide-react';
import { useStore } from '../../../store';
import { KIDS_SCIENCE_MODULES } from '../../../data/kidsData';
import { simulateSoilChemistry } from '../../../engine/kidsEngine';
import { bnDigits, num } from '../../../engine/dates';

export default function ChemistryLab({ profile, onRecordActivity, fx }) {
  const { s, T, L } = useStore();
  const { soils, amendments } = KIDS_SCIENCE_MODULES.chemistryLab;

  const [selectedSoilId, setSelectedSoilId] = useState(soils[0].id);
  const [appliedIds, setAppliedIds] = useState([]);
  const [solvedNow, setSolvedNow] = useState(false);

  const sim = simulateSoilChemistry(selectedSoilId, appliedIds);
  const solvedSoils = profile?.miniGames?.chemLabsSolved || [];

  const switchSoil = (soilId) => {
    fx?.('pop');
    setSelectedSoilId(soilId);
    setAppliedIds([]);
    setSolvedNow(false);
  };

  const addAmendment = (amId) => {
    if (appliedIds.length >= 8) return;
    fx?.('splash');
    const next = [...appliedIds, amId];
    setAppliedIds(next);
    const check = simulateSoilChemistry(selectedSoilId, next);
    if (check.isHealthy) {
      fx?.('cheer');
      if (!solvedNow) {
        setSolvedNow(true);
        onRecordActivity?.({
          xpDelta: 45,
          miniGamePatch: { chemLabsSolved: selectedSoilId },
          flags: { completedSoilMission: true },
        });
      }
    }
  };

  const undoLast = () => {
    if (appliedIds.length === 0) return;
    fx?.('pop');
    setAppliedIds((prev) => prev.slice(0, -1));
  };

  const phPct = Math.max(0, Math.min(100, ((sim.ph - 3.5) / (9.5 - 3.5)) * 100));

  return (
    <div className="space-y-4" data-testid="kids-science-chemistry">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-purple-50 to-amber-50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-xs">
            <FlaskConical className="h-6 w-6 text-fuchsia-600" />
          </span>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              {L(KIDS_SCIENCE_MODULES.chemistryLab.title)}
            </h3>
            <p className="text-xs text-slate-600">
              {L(KIDS_SCIENCE_MODULES.chemistryLab.subtitle)}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-fuchsia-900 shadow-xs tabular">
          {T(
            `মাটি সুস্থ হয়েছে: ${bnDigits(solvedSoils.length)}/${bnDigits(soils.length)}`,
            `Soils Healed: ${solvedSoils.length}/${soils.length}`
          )}
        </span>
      </div>

      {/* Soil Sample Picker */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        {soils.map((soil) => {
          const active = soil.id === selectedSoilId;
          const alreadySolved = solvedSoils.includes(soil.id);
          return (
            <button
              key={soil.id}
              type="button"
              data-testid={`chem-soil-${soil.id}`}
              onClick={() => switchSoil(soil.id)}
              className={`min-h-14 rounded-2xl border-2 p-3 text-left transition active:scale-95 ${
                active
                  ? 'border-fuchsia-600 bg-fuchsia-50 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-extrabold text-slate-900 sm:text-sm">
                  {L(soil.name)}
                </span>
                {alreadySolved && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
              </div>
              <p className="mt-1 text-[11px] font-semibold text-slate-600 tabular">
                pH {num(soil.initialPh, s.lang)} • EC {num(soil.initialEc, s.lang)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Interactive Litmus & Chemistry Readout */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
            <strong className="text-slate-900">{T('লক্ষ্য: ', 'Mission Goal: ')}</strong>
            {L(sim.soil.challengeNote)}
          </div>

          {/* Litmus Strip Indicator */}
          <div className="space-y-2 rounded-2xl border border-slate-200 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                {T('লিটমাস পেপার (pH স্কেল)', 'Litmus Strip (pH Scale)')}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${sim.litmus.badgeBg}`}>
                pH {num(sim.ph, s.lang, { maximumFractionDigits: 2 })} — {L(sim.litmus.label)}
              </span>
            </div>

            <div className="relative h-5 w-full rounded-full bg-gradient-to-r from-red-500 via-emerald-500 to-indigo-600 p-0.5">
              <div
                className="h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-slate-950 shadow transition-all"
                style={{ marginLeft: `${phPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500 tabular">
              <span>{T('তীব্র অম্ল (৩.৫)', 'Acidic (3.5)')}</span>
              <span className="text-emerald-700">
                {T(
                  `লক্ষ্য: ${bnDigits(sim.soil.targetPhMin)}–${bnDigits(sim.soil.targetPhMax)}`,
                  `Target: ${sim.soil.targetPhMin}–${sim.soil.targetPhMax}`
                )}
              </span>
              <span>{T('ক্ষারীয় (৯.৫)', 'Alkaline (9.5)')}</span>
            </div>
          </div>

          {/* Salinity, OM, NPK */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className={`rounded-2xl border p-3 ${sim.isEcHealthy ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="font-semibold text-slate-600">{T('লবণাক্ততা (EC)', 'Salinity (EC)')}</div>
              <div className="mt-1 text-base font-extrabold text-slate-900 tabular">
                {num(sim.ec, s.lang, { maximumFractionDigits: 2 })} dS/m
              </div>
              <div className="text-[11px] text-slate-600 tabular">
                {T(`সর্বোচ্চ সুস্থ: ≤ ${bnDigits(sim.soil.targetEcMax)}`, `Healthy: ≤ ${sim.soil.targetEcMax}`)}
              </div>
            </div>

            <div className={`rounded-2xl border p-3 ${sim.isOmHealthy ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="font-semibold text-slate-600">{T('জৈব পদার্থ (OM)', 'Organic Matter')}</div>
              <div className="mt-1 text-base font-extrabold text-slate-900 tabular">
                {num(sim.om, s.lang, { maximumFractionDigits: 2 })}%
              </div>
              <div className="text-[11px] text-slate-600 tabular">
                N:{num(sim.n, s.lang)} P:{num(sim.p, s.lang)} K:{num(sim.k, s.lang)}
              </div>
            </div>
          </div>

          {/* Reaction Tip */}
          <div
            data-testid="chem-reaction-tip"
            className={`rounded-2xl border p-3.5 text-xs font-medium leading-relaxed sm:text-sm ${
              sim.isHealthy
                ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
                : 'border-sky-200 bg-sky-50 text-slate-800'
            }`}
          >
            {sim.isHealthy && <Sparkles className="mr-1.5 inline h-4 w-4 text-emerald-600" />}
            {L(sim.reactionTip)}
          </div>
        </div>

        {/* Chemistry Reagents / Amendments */}
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-slate-900">
              {T('উপাদান যোগ করে বিক্রিয়া দেখো:', 'Add Soil Amendments & Watch Reaction:')}
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={undoLast}
                disabled={appliedIds.length === 0}
                className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <Undo2 className="h-3.5 w-3.5" />
                {T('পিছনে', 'Undo')}
              </button>
              <button
                type="button"
                onClick={() => switchSoil(selectedSoilId)}
                className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {T('ধোও', 'Clear')}
              </button>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {amendments.map((am) => (
              <button
                key={am.id}
                type="button"
                data-testid={`chem-add-${am.id}`}
                onClick={() => addAmendment(am.id)}
                disabled={appliedIds.length >= 8}
                className="flex min-h-16 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-fuchsia-400 hover:bg-fuchsia-50/40 active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{am.icon}</span>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 sm:text-sm">
                      {L(am.name)}
                    </div>
                    <div className="text-[11px] font-bold text-fuchsia-700">{am.formula}</div>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-600">{L(am.desc)}</p>
              </button>
            ))}
          </div>

          {appliedIds.length > 0 && (
            <div className="text-xs text-slate-600">
              {T(`ব্যবহৃত ডোজ (${bnDigits(appliedIds.length)}/৮): `, `Added doses (${appliedIds.length}/8): `)}
              {appliedIds
                .map((id) => amendments.find((a) => a.id === id)?.icon || '🧪')
                .join(' ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

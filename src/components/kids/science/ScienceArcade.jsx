import { useState } from 'react';
import { Rocket, CloudRain, Gauge, Wind, ArrowUp, ArrowDown, Sparkles, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../../store';
import { KIDS_SCIENCE_MODULES } from '../../../data/kidsData';
import {
  evaluateCubeSatBuild,
  evaluateWaterCycleOrder,
  simulateRampRace,
  simulatePaperPlaneFlight,
} from '../../../engine/kidsEngine';
import { bnDigits, num } from '../../../engine/dates';

export default function ScienceArcade({ onRecordActivity, fx }) {
  const { s, T, L } = useStore();
  const arcade = KIDS_SCIENCE_MODULES.scienceArcade;

  const [gameTab, setGameTab] = useState('cubesat'); // 'cubesat' | 'watercycle' | 'ramprace' | 'paperplane'

  // 1. CubeSat State
  const [csMissionId, setCsMissionId] = useState(arcade.cubesat.missions[0].id);
  const [csParts, setCsParts] = useState(['solar_panels']);
  const [csResult, setCsResult] = useState(null);

  // 2. Water Cycle State
  const [wcOrder, setWcOrder] = useState(() => {
    const ids = arcade.waterCycle.stages.map((st) => st.id);
    return [ids[2], ids[0], ids[4], ids[1], ids[3]];
  });
  const [wcResult, setWcResult] = useState(null);

  // 3. Ramp Race State
  const [surfaceId, setSurfaceId] = useState(arcade.rampRace.surfaces[0].id);
  const [objectId, setObjectId] = useState(arcade.rampRace.objects[0].id);
  const [angleDeg, setAngleDeg] = useState(25);
  const [rampResult, setRampResult] = useState(null);

  // 4. Paper Plane State
  const [wingId, setWingId] = useState('glider');
  const [noseId, setNoseId] = useState('balanced');
  const [throwStrength, setThrowStrength] = useState(75);
  const [headwind, setHeadwind] = useState(0);
  const [planeResult, setPlaneResult] = useState(null);

  const activeMission = arcade.cubesat.missions.find((m) => m.id === csMissionId) || arcade.cubesat.missions[0];

  const togglePart = (pid) => {
    fx?.('pop');
    setCsResult(null);
    setCsParts((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    );
  };

  const launchCubeSat = () => {
    const res = evaluateCubeSatBuild(csMissionId, csParts);
    setCsResult(res);
    if (res.launchReady) {
      fx?.('stardust');
      onRecordActivity?.({
        xpDelta: 45,
        miniGamePatch: { cubesatsLaunched: csMissionId },
      });
    } else {
      fx?.('sad');
    }
  };

  const moveWc = (pos, dir) => {
    const t = pos + dir;
    if (t < 0 || t >= wcOrder.length) return;
    fx?.('pop');
    const copy = [...wcOrder];
    [copy[pos], copy[t]] = [copy[t], copy[pos]];
    setWcOrder(copy);
    setWcResult(null);
  };

  const checkWaterCycle = () => {
    const res = evaluateWaterCycleOrder(wcOrder);
    setWcResult(res);
    if (res.isCorrect) {
      fx?.('cheer');
      onRecordActivity?.({
        xpDelta: 40,
        miniGamePatch: { waterCyclesSolved: 1 },
      });
    } else {
      fx?.('sad');
    }
  };

  const runRampRace = () => {
    const res = simulateRampRace({ surfaceId, objectId, angleDeg, rampLengthM: 4 });
    setRampResult(res);
    fx?.(res.stalled ? 'sad' : 'boing');
    onRecordActivity?.({
      xpDelta: 15,
      miniGamePatch: { rampRacesRun: 1 },
    });
  };

  const flyPaperPlane = () => {
    const res = simulatePaperPlaneFlight({
      wingId,
      noseId,
      throwStrength,
      windHeadwind: headwind,
    });
    setPlaneResult(res);
    fx?.('cheer');
    onRecordActivity?.({
      xpDelta: 15,
      miniGamePatch: { paperPlanesFlown: 1 },
    });
  };

  return (
    <div className="space-y-4" data-testid="kids-science-arcade">
      <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-sky-50 to-violet-50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-xs">
            <Rocket className="h-6 w-6 text-indigo-600" />
          </span>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              {L(arcade.title)}
            </h3>
            <p className="text-xs text-slate-600">{L(arcade.subtitle)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { id: 'cubesat', icon: Rocket, label: { bn: 'কিউবস্যাট (NASA)', en: 'NASA CubeSat' } },
            { id: 'watercycle', icon: CloudRain, label: { bn: 'পানিচক্র (Water Cycle)', en: 'Water Cycle' } },
            { id: 'ramprace', icon: Gauge, label: { bn: 'র্যাম্প রেস (ঘর্ষণ)', en: 'Ramp Race (Physics)' } },
            { id: 'paperplane', icon: Wind, label: { bn: 'কাগজের প্লেন (এরো)', en: 'Paper Plane Glider' } },
          ].map((t) => {
            const Icon = t.icon;
            const active = gameTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setGameTab(t.id)}
                className={`inline-flex min-h-12 items-center gap-1.5 rounded-2xl border px-3.5 text-xs font-extrabold transition sm:text-sm ${
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-indigo-200 bg-white text-slate-700 hover:bg-indigo-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{L(t.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: NASA CubeSat Builder */}
      {gameTab === 'cubesat' && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap gap-2">
            {arcade.cubesat.missions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setCsMissionId(m.id);
                  setCsResult(null);
                }}
                className={`min-h-11 rounded-2xl border px-3.5 text-xs font-extrabold ${
                  m.id === csMissionId
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {L(m.title)}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-indigo-50 p-3 text-xs font-bold text-indigo-950 sm:text-sm">
            🛰️ {L(activeMission.goal)}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {arcade.cubesat.parts.map((part) => {
              const selected = csParts.includes(part.id);
              return (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => togglePart(part.id)}
                  className={`flex min-h-16 flex-col justify-between rounded-2xl border-2 p-3 text-left transition ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{part.icon}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 tabular">
                      {num(part.massKg, s.lang)} kg • {part.powerW >= 0 ? `+${part.powerW}W` : `${part.powerW}W`}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-extrabold text-slate-900 sm:text-sm">{L(part.name)}</div>
                    <div className="text-[11px] text-slate-600">{L(part.role)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            data-testid="cubesat-launch-btn"
            onClick={launchCubeSat}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-base font-extrabold text-white shadow-sm hover:bg-indigo-700"
          >
            <Rocket className="h-5 w-5" />
            <span>{T('রকেটে কিউবস্যাট উৎক্ষেপণ করো!', 'Launch CubeSat Mission!')}</span>
          </button>

          {csResult && (
            <div
              className={`rounded-2xl border p-4 text-sm ${
                csResult.launchReady
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
                  : 'border-amber-300 bg-amber-50 text-amber-950'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 font-extrabold">
                <span>
                  {csResult.launchReady ? '🚀 LIFTOFF!' : '🔧 Hold Countdown'}
                </span>
                <span className="text-xs tabular">
                  {num(csResult.totalMassKg, s.lang)} / {num(csResult.maxMassKg, s.lang)} kg • {csResult.netPowerW >= 0 ? `+${csResult.netPowerW}W` : `${csResult.netPowerW}W`}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed sm:text-sm">{L(csResult.feedback)}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Water Cycle */}
      {gameTab === 'watercycle' && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-bold text-slate-800">
            {T(
              'সূর্যের বাষ্পীভবন থেকে মাটির শোষণ পর্যন্ত ৫টি ধাপ ওপর-নিচ করে সাজাও:',
              'Arrange all 5 Water Cycle stages in order from sun warmth to soil root soak:'
            )}
          </p>
          <div className="space-y-2">
            {wcOrder.map((id, pos) => {
              const st = arcade.waterCycle.stages.find((x) => x.id === id);
              if (!st) return null;
              return (
                <div key={id} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-sky-50/50 px-3.5 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-extrabold text-sky-700 shadow-xs tabular">
                      {s.lang === 'bn' ? bnDigits(pos + 1) : pos + 1}
                    </span>
                    <span className="text-2xl">{st.icon}</span>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 sm:text-sm">{L(st.name)}</div>
                      <div className="text-[11px] text-slate-600">{L(st.desc)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pos === 0}
                      onClick={() => moveWc(pos, -1)}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-sky-50 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={pos === wcOrder.length - 1}
                      onClick={() => moveWc(pos, 1)}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-sky-50 disabled:opacity-30"
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
            onClick={checkWaterCycle}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-sky-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{T('পানিচক্র পরীক্ষা করো', 'Verify Water Cycle')}</span>
          </button>

          {wcResult && (
            <div className={`rounded-2xl border p-4 text-sm ${wcResult.isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
              <p className="font-semibold text-slate-900">{L(wcResult.feedback)}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Ramp Race (Gravity & Friction) */}
      {gameTab === 'ramprace' && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-700">{T('ঢালের পথ বেছে নাও:', 'Choose Ramp Surface:')}</div>
              {arcade.rampRace.surfaces.map((sf) => (
                <button
                  key={sf.id}
                  type="button"
                  onClick={() => setSurfaceId(sf.id)}
                  className={`flex min-h-12 w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs font-bold ${
                    surfaceId === sf.id ? 'border-indigo-600 bg-indigo-50 text-indigo-950' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <span>{sf.icon} {L(sf.name)}</span>
                  <span className="text-[11px] text-slate-500">{L(sf.note)}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="text-xs font-extrabold text-slate-700">{T('কোন বস্তুটি গড়াবে/পিছলাবে?', 'Pick Object to Race:')}</div>
              {arcade.rampRace.objects.map((ob) => (
                <button
                  key={ob.id}
                  type="button"
                  onClick={() => setObjectId(ob.id)}
                  className={`flex min-h-12 w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-bold ${
                    objectId === ob.id ? 'border-indigo-600 bg-indigo-50 text-indigo-950' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <span className="text-xl">{ob.icon}</span>
                  <span>{L(ob.name)}</span>
                </button>
              ))}

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="mb-1 flex justify-between text-xs font-bold">
                  <span>{T('ঢালের কোণ (Angle)', 'Ramp Angle')}</span>
                  <span className="tabular">{num(angleDeg, s.lang)}°</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={angleDeg}
                  onChange={(e) => setAngleDeg(Number(e.target.value))}
                  className="h-3 w-full cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={runRampRace}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700"
          >
            <Gauge className="h-4 w-4" />
            <span>{T('৪ মিটার র্যাম্প রেস শুরু করো!', 'Run 4m Ramp Race!')}</span>
          </button>

          {rampResult && (
            <div className={`rounded-2xl border p-4 ${rampResult.stalled ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
              {!rampResult.stalled && (
                <div className="mb-2 flex flex-wrap gap-3 text-xs font-extrabold text-emerald-900 tabular">
                  <span>⏱️ {num(rampResult.timeSec, s.lang)} s</span>
                  <span>⚡ {num(rampResult.speedMs, s.lang)} m/s</span>
                  <span>📉 μ_eff = {num(rampResult.effectiveMu, s.lang)}</span>
                </div>
              )}
              <p className="text-sm font-medium text-slate-800">{L(rampResult.explanation)}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Paper Plane Aerodynamics */}
      {gameTab === 'paperplane' && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-700">{T('প্লেনের ডানার ভাঁজ:', 'Wing Fold Design:')}</div>
              {arcade.paperPlane.wings.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWingId(w.id)}
                  className={`flex min-h-12 w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-bold ${
                    wingId === w.id ? 'border-indigo-600 bg-indigo-50 text-indigo-950' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <span className="text-xl">{w.icon}</span>
                  <span>{L(w.name)}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="text-xs font-extrabold text-slate-700">{T('সামনের ভরকেন্দ্র (পেপার ক্লিপ):', 'Nose Weight (Center of Gravity):')}</div>
              {arcade.paperPlane.noseWeights.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNoseId(n.id)}
                  className={`flex min-h-11 w-full items-center rounded-2xl border px-3 py-2 text-left text-xs font-bold ${
                    noseId === n.id ? 'border-indigo-600 bg-indigo-50 text-indigo-950' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  📎 {L(n.name)}
                </button>
              ))}

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 p-2.5">
                  <div className="text-[11px] font-bold">{T(`ছোঁড়ার জোর: ${bnDigits(throwStrength)}%`, `Throw: ${throwStrength}%`)}</div>
                  <input type="range" min={30} max={100} value={throwStrength} onChange={(e) => setThrowStrength(Number(e.target.value))} className="w-full accent-indigo-600" />
                </div>
                <div className="rounded-2xl bg-slate-50 p-2.5">
                  <div className="text-[11px] font-bold">{T(`বাতাস: ${bnDigits(headwind)} কিমি/ঘ`, `Headwind: ${headwind} km/h`)}</div>
                  <input type="range" min={-5} max={15} value={headwind} onChange={(e) => setHeadwind(Number(e.target.value))} className="w-full accent-sky-600" />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={flyPaperPlane}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700"
          >
            <Wind className="h-4 w-4" />
            <span>{T('কাগজের প্লেন ওড়াও!', 'Throw Paper Plane!')}</span>
          </button>

          {planeResult && (
            <div className="rounded-2xl border border-sky-300 bg-sky-50 p-4">
              <div className="mb-2 flex flex-wrap gap-3 text-sm font-extrabold text-sky-950 tabular">
                <span>✈️ {T(`দূরত্ব: ${bnDigits(planeResult.distanceM)} মিটার`, `Distance: ${planeResult.distanceM} m`)}</span>
                <span>⏱️ {num(planeResult.flightTimeSec, s.lang)} s</span>
                <span>📈 {T(`উচ্চতা: ${bnDigits(planeResult.maxHeightM)} মিটার`, `Peak: ${planeResult.maxHeightM} m`)}</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-800 sm:text-sm">
                <Sparkles className="mr-1 inline h-4 w-4 text-sky-600" />
                {L(planeResult.explanation)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

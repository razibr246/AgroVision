// The people of মাঠের মানুষ, one at a time on a studio stage, the way an open-world game shows its characters: a big
// slanted name, where they farm and what threatens it, what they wear, and their child. From here, play the
// grown-ups' game or the child's dream. Stage: game/three/characterStage.js; people: game/regions.js and dream.js.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Gamepad2, Sparkles, CloudLightning, MapPin, Shirt,
  UserRound, Zap, Droplets, Footprints, Eye, RotateCw, RotateCcw, Play, Pause,
  Compass, Dumbbell, Heart, Flame, ShieldCheck, ChevronRight, Activity, Camera
} from 'lucide-react';
import { useStore } from '../../store';
import { LangToggle } from '../../components/chrome';
import { REGIONS } from '../../game/regions';
import { CHILDREN, CHILD_IDS } from '../../game/dream';
import { bnDigits, num } from '../../engine/dates';
import { play } from '../../game/sound';
import { GAMES } from '../../data/games';
import usePageMeta from '../../components/usePageMeta';

// 8 agricultural and emotional postures with simulated biomechanical parameters
const ACTIONS = [
  { id: 'Idle', bn: 'স্বাভাবিক', en: 'Idle Stance', sound: 'tap', l4l5: 1100, bpm: 72, kcal: 95, loop: true },
  { id: 'PickUp', bn: 'ধান রোপণ', en: 'Transplant', sound: 'plant', l4l5: 1980, bpm: 108, kcal: 345, loop: false },
  { id: 'SwordSlash', bn: 'ফসল কাটা', en: 'Sickle Reap', sound: 'harvest', l4l5: 2450, bpm: 124, kcal: 390, loop: false },
  { id: 'Walk_Carry', bn: 'ঝুড়ি বহন', en: 'Carry Load', sound: 'step', l4l5: 2200, bpm: 118, kcal: 360, loop: true },
  { id: 'Walk', bn: 'জমিতে হাঁটা', en: 'Field Walk', sound: 'step', l4l5: 1450, bpm: 92, kcal: 210, loop: true },
  { id: 'Run', bn: 'ঝড়ে দৌড়', en: 'Storm Run', sound: 'step', l4l5: 1850, bpm: 135, kcal: 480, loop: true },
  { id: 'SitDown', bn: 'আইলে বিশ্রাম', en: 'Ridge Rest', sound: 'tap', l4l5: 850, bpm: 68, kcal: 80, loop: false },
  { id: 'Victory', bn: 'ফলন উল্লাস', en: 'Harvest Cheer', sound: 'good', l4l5: 1300, bpm: 110, kcal: 260, loop: false },
];

export default function People() {
  const { T, L, s } = useStore();
  usePageMeta(L(GAMES.people.name), T('কৃষকদের সাথে পরিচয়: বাংলাদেশের সাত বিভাগের ৭ জন ৩ডি কৃষক ও তাঁদের সন্তান, এবং তাঁদের প্রত্যেকের আবহাওয়া-ভীতি।', GAMES.people.seo.en));
  const host = useRef(null), stage = useRef(null);
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const [stageError, setStageError] = useState(false);
  const [activeAction, setActiveAction] = useState('Victory');
  const [camMode, setCamMode] = useState('full'); // full | portrait | action
  const [autoSpin, setAutoSpin] = useState(true);
  const [showVitals, setShowVitals] = useState(false);

  const id = CHILD_IDS[i], r = REGIONS[id], kid = CHILDREN[id], f = r.farmer;

  useEffect(() => {
    let alive = true, st = null;
    import('../../game/three/characterStage').then(({ createCharacterStage }) => {
      if (!alive) return;
      st = stage.current = createCharacterStage(host.current);
      setReady(true);
    }).catch(() => { if (alive) setStageError(true); });
    return () => { alive = false; st?.dispose(); stage.current = null; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    import('../../game/three/dreamScene').then(({ bodyFor, kidBody }) => {
      stage.current?.show(bodyFor(id, r), kidBody(kid, r));
      setActiveAction('Victory');
    });
  }, [ready, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === ' ') {
        e.preventDefault();
        toggleSpin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (d) => {
    setI((x) => (x + d + CHILD_IDS.length) % CHILD_IDS.length);
    try { play('tap'); } catch { /* audio unlock */ }
  };

  const handleAction = (act) => {
    setActiveAction(act.id);
    stage.current?.playAction(act.id, 'adult', act.loop);
    try { play(act.sound); } catch { /* audio unlock */ }
  };

  const handleCameraMode = (mode) => {
    setCamMode(mode);
    stage.current?.setCameraMode(mode);
    try { play('tap'); } catch { /* audio unlock */ }
  };

  const toggleSpin = () => {
    setAutoSpin((prev) => {
      const next = !prev;
      stage.current?.setAutoRotate(next);
      return next;
    });
    try { play('tap'); } catch { /* audio unlock */ }
  };

  const rotateBy = (dir) => {
    stage.current?.rotateBy(dir * (Math.PI / 4));
    try { play('tap'); } catch { /* audio unlock */ }
  };

  // Physiological stress computations for current action & farmer profile
  const curAct = ACTIONS.find((a) => a.id === activeAction) ?? ACTIONS[0];
  const ageFactor = f.age > 45 ? 1 + (f.age - 45) * 0.009 : 1;
  const isFemale = ['rahima'].includes(id);
  const displayL4L5 = Math.round(curAct.l4l5 * ageFactor);
  const displayBpm = Math.min(180, Math.round(curAct.bpm * (f.age > 50 ? 1.08 : 1.0)));
  const displayKcal = Math.round(curAct.kcal * (isFemale ? 0.92 : 1.0));

  return (
    <div className="fixed inset-0 z-[70] bg-[#0d1712] text-white">
      {/* 3D WebGL Turntable Stage */}
      <div ref={host} className="absolute inset-0" />

      {stageError && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 pb-40 pt-24 text-center" role="status" aria-live="polite">
          <div className="max-w-sm rounded-3xl border border-white/15 bg-black/45 p-6 backdrop-blur-sm">
            <UserRound size={56} className="mx-auto mb-3 text-white/80" aria-hidden="true" />
            <p className="text-[15px] leading-6 text-white/90">{T('৩ডি চরিত্রটি লোড করা যায়নি। নাম, এলাকা ও পোশাকের তথ্য নিচে আছে।', 'The 3D character could not be loaded. Their name, place and clothing details are still shown below.')}</p>
          </div>
        </div>
      )}

      {/* Atmospheric vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,transparent_35%,rgba(0,0,0,.55)_100%)]" />

      {/* HUD UI Layer */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-y-auto overscroll-contain">
        {/* Top Header Bar */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 p-3 sm:p-5">
          <div className="flex items-center gap-2">
            <Link to="/games" className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25 active:scale-95 transition" aria-label={T('খেলাগুলোয় ফিরুন', 'Back to the games')}>
              <ArrowLeft size={20} />
            </Link>
            <span className="rounded-full bg-white/15 px-4 py-2 text-[13.5px] font-semibold backdrop-blur ring-1 ring-white/15">
              {L(GAMES.people.name)} · {num(i + 1, s.lang)}/{num(CHILD_IDS.length, s.lang)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LangToggle dark />
            {/* Quick Turntable Spin & Camera Controls */}
            <div className="flex items-center gap-1.5 rounded-full bg-black/40 p-1 backdrop-blur-md ring-1 ring-white/20">
            <button
              type="button"
              onClick={() => rotateBy(-1)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition active:scale-90"
              title={T('বাঁয়ে ঘোরান (৪৫°)', 'Rotate Left 45°')}
              aria-label={T('বাঁয়ে ঘোরান', 'Rotate Left')}
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={toggleSpin}
              className={`grid h-9 w-9 place-items-center rounded-full transition active:scale-90 ${autoSpin ? 'bg-primary-600 text-white shadow-sm' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              title={autoSpin ? T('ঘূর্ণন থামান', 'Pause Spin') : T('ঘূর্ণন চালু করুন', 'Start Spin')}
              aria-label={T('ঘূর্ণন টগল', 'Toggle Spin')}
            >
              {autoSpin ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              onClick={() => rotateBy(1)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition active:scale-90"
              title={T('ডানে ঘোরান (৪৫°)', 'Rotate Right 45°')}
              aria-label={T('ডানে ঘোরান', 'Rotate Right')}
            >
              <RotateCw size={16} />
            </button>

            <span className="mx-0.5 h-4 w-[1px] bg-white/20" />

            {/* Camera View Switcher */}
            {[
              { id: 'full', label: T('মঞ্চ', 'Full'), icon: Eye },
              { id: 'portrait', label: T('মুখ', 'Face'), icon: UserRound },
              { id: 'action', label: T('ভঙ্গি', 'Work'), icon: Activity },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleCameraMode(m.id)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold transition active:scale-95 ${camMode === m.id ? 'bg-[#2f6e2f] text-white shadow-sm ring-1 ring-white/30' : 'text-white/75 hover:bg-white/15'}`}
              >
                <m.icon size={12} />
                <span>{m.label}</span>
              </button>
            ))}
            </div>
          </div>
        </div>

        {/* Center / Body Section: Left Character Bio & Right Interactive Console */}
        <div className="grid gap-6 px-4 py-2 sm:px-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: Character Dossier & Traits */}
          <div className="max-w-[560px]">
            <p className="text-[13px] font-bold tracking-[.04em] text-[#8be08a]">{r.flag ?? '🇧🇩'} {L(r.place)}</p>
            <h1 key={id} className="hero-rise mt-1 -skew-x-6 text-[44px] font-black uppercase leading-[.95] tracking-tight [text-shadow:0_4px_0_#000,0_0_24px_rgba(0,0,0,.6)] sm:text-[68px]" style={{ WebkitTextStroke: '1.5px #000' }}>
              {T(f.bn, f.en)}
            </h1>
            <p className="mt-1 text-[20px] font-bold text-white/90 sm:text-[24px]">
              {T(`${f.bn}, ${bnDigits(f.age)} বছর`, `${f.en}, ${num(f.age, 'en')} years old`)}
            </p>
            {f.trait && <p className="mt-1 text-[14.5px] text-white/80">{L(f.trait)}</p>}

            {/* Special Skill & Locomotion Stats */}
            {f.skill && (
              <div className="mt-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-md">
                <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-[#8be08a]">
                  <Zap size={13} className="text-yellow-400" />
                  {T('বিশেষ কৃষি দক্ষতা', 'Special Farming Skill')}
                </p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/90">{L(f.skill)}</p>
              </div>
            )}

            <div className="mt-2.5 flex flex-wrap gap-2 text-[12px] font-semibold text-white/85">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15 backdrop-blur">
                <Footprints size={12} className="text-emerald-300" />
                {T(`গতি ${num(f.speed, s.lang)} · দৌড় ${num(f.run, s.lang)} m/s`, `Walk ${f.speed} · Run ${f.run} m/s`)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15 backdrop-blur">
                <Droplets size={12} className="text-sky-300" />
                {T(`বালতি: ${num(f.can, s.lang)} বার`, `Can: ${f.can} fills`)}
              </span>
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-[13.5px] text-white/85 sm:hidden">
              <CloudLightning size={15} className="text-amber-300" />{L(r.storm)}
            </p>
            <ul className="mt-3 hidden space-y-1.5 text-[13.5px] text-white/85 sm:block">
              <li className="flex items-start gap-2"><CloudLightning size={15} className="mt-0.5 shrink-0 text-amber-300" />{L(r.storm)}</li>
              {r.place.area && <li className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-sky-300" />{L(r.place.area)}</li>}
              {f.dress?.length > 0 && <li className="flex items-start gap-2"><Shirt size={15} className="mt-0.5 shrink-0 text-pink-300" />{f.dress.map((d) => L(d)).join(' · ')}</li>}
              <li className="flex items-start gap-2"><Sparkles size={15} className="mt-0.5 shrink-0 text-yellow-300" />{T(`পাশে সন্তান: ${kid.name.bn}, ${kid.rel.bn}`, `Beside: child ${kid.name.en}, ${kid.rel.en}`)}</li>
            </ul>
          </div>

          {/* Right: Interactive Agricultural Action Bar & Biomechanics Console */}
          <div className="pointer-events-auto flex flex-col justify-start lg:items-end">
            <div className="w-full max-w-sm rounded-[24px] border border-white/20 bg-black/45 p-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 border-b border-white/15">
                <p className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wider text-emerald-300">
                  <Activity size={14} className="text-emerald-400" />
                  {T('কৃষি ক্রিয়া ও কঙ্কাল অ্যানিমেশন', 'Realtime Actions & Kinematics')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowVitals(!showVitals)}
                  className="text-[11.5px] font-semibold text-white/70 hover:text-white underline"
                >
                  {showVitals ? T('সংক্ষিপ্ত', 'Simple') : T('শারীরবৃত্ত', 'Vitals')}
                </button>
              </div>

              {/* Action Chips */}
              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-2">
                {ACTIONS.map((act) => {
                  const on = activeAction === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => handleAction(act)}
                      className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-left text-[12px] font-semibold transition active:scale-95 ${on ? 'bg-primary-600 text-white shadow-md ring-1 ring-emerald-300' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
                    >
                      <span>{T(act.bn, act.en)}</span>
                      {on && <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />}
                    </button>
                  );
                })}
              </div>

              {/* Biomechanical Live Vitals HUD */}
              <div className="mt-3.5 rounded-2xl bg-white/[0.08] p-3 ring-1 ring-white/15">
                <div className="flex items-center justify-between text-[11.5px] text-white/70">
                  <span className="font-semibold uppercase tracking-wider">{T('লাইভ বায়োমেকানিক্স লোড', 'Live Biomechanical Load')}</span>
                  <span className="text-emerald-300 font-bold">{T(curAct.bn, curAct.en)}</span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-black/30 p-2">
                    <p className="flex items-center justify-center gap-1 text-[10.5px] text-white/60">
                      <Dumbbell size={11} className="text-amber-300" />
                      L4/L5
                    </p>
                    <p className="font-mono text-[14px] font-bold text-amber-200">{num(displayL4L5, s.lang)} N</p>
                    <p className="text-[9.5px] text-white/50">{displayL4L5 > 2200 ? T('উচ্চ চাপ', 'High') : T('স্বাভাবিক', 'Norm')}</p>
                  </div>
                  <div className="rounded-xl bg-black/30 p-2">
                    <p className="flex items-center justify-center gap-1 text-[10.5px] text-white/60">
                      <Heart size={11} className="text-rose-400" />
                      BPM
                    </p>
                    <p className="font-mono text-[14px] font-bold text-rose-300">{num(displayBpm, s.lang)}</p>
                    <p className="text-[9.5px] text-white/50">{T('হৃৎস্পন্দন', 'Heart rate')}</p>
                  </div>
                  <div className="rounded-xl bg-black/30 p-2">
                    <p className="flex items-center justify-center gap-1 text-[10.5px] text-white/60">
                      <Flame size={11} className="text-orange-400" />
                      Kcal/h
                    </p>
                    <p className="font-mono text-[14px] font-bold text-orange-200">{num(displayKcal, s.lang)}</p>
                    <p className="text-[9.5px] text-white/50">{T('শক্তি ক্ষয়', 'Burn')}</p>
                  </div>
                </div>

                {showVitals && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] leading-4 text-white/75">
                    <p>
                      {isFemale
                        ? T('মহিলা কৃষকের শ্রোণীচক্র (pelvis) ও মাধ্যাকর্ষণ কেন্দ্র অনুকূল: হালকা সরঞ্জামে ক্লান্তি কম।', 'Female pelvic kinematics & lower CoG reduce lumbar torsion with ergonomic tools.')
                        : T('পুরুষ কৃষকের কাঁধের লিভার দীর্ঘ: ভারী কোদাল ও বহন দক্ষতায় অগ্রণী।', 'Greater deltoid lever arm facilitates heavy hoe and basket striking loads.')}
                    </p>
                    <p className="mt-1 text-emerald-300">
                      {T(`বয়স ${bnDigits(f.age)} বছর: দীর্ঘ কাজের পর প্রতি ২০ মিনিটে বিশ্রাম বাঞ্ছনীয়।`, `Age ${f.age}: NIOSH standard recommends 5m rest per 20m high-strain work.`)}
                    </p>
                  </div>
                )}
              </div>

              {/* Lab Link */}
              <Link
                to="/games#biomechanics"
                className="mt-3 flex items-center justify-between rounded-xl bg-emerald-500/20 px-3 py-2 text-[12px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/30 transition"
              >
                <span className="flex items-center gap-1.5">
                  <Compass size={14} className="text-emerald-300" />
                  {T('বায়োমেকানিক্স ও মাটির পদার্থবিজ্ঞান ল্যাব', 'Biomechanics & Soil Physics Lab')}
                </span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Character Navigation & Game Play CTA */}
        <div className="pointer-events-auto p-3 sm:p-5">
          <div className="mx-auto flex max-w-[980px] flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25 active:scale-95 transition"
              aria-label={T('আগের জন', 'Previous')}
            >
              <ArrowLeft size={22} />
            </button>
            <Link
              to={`/farm?who=${id}&play=1`}
              className="flex h-12 items-center gap-2 rounded-full bg-[#2f6e2f] px-6 text-[15.5px] font-bold shadow-lg hover:bg-[#3b833b] active:scale-95 transition"
            >
              <Gamepad2 size={19} />
              {T(`${f.bn} হয়ে খামারে খেলুন`, `Play as ${f.en}`)}
            </Link>
            <Link
              to={`/kids?who=${id}`}
              className="flex h-12 items-center gap-2 rounded-full bg-[#e2b84a] px-5 text-[15.5px] font-bold text-[#1b2620] shadow-lg hover:bg-[#ecc860] active:scale-95 transition"
            >
              <Sparkles size={19} />
              {T(`${kid.name.bn}র স্বপ্ন (3D)`, `${kid.name.en}’s dream (3D)`)}
            </Link>
            <button
              type="button"
              onClick={() => go(1)}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25 active:scale-95 transition"
              aria-label={T('পরের জন', 'Next')}
            >
              <ArrowRight size={22} />
            </button>
          </div>

          {/* Roster Strip */}
          <ol className="hide-scrollbar mx-auto mt-3 flex max-w-[980px] gap-1.5 overflow-x-auto pb-1" aria-label={T('সব মানুষ', 'Everyone')}>
            {CHILD_IDS.map((x, k) => (
              <li key={x} className="shrink-0">
                <button
                  type="button"
                  onClick={() => { setI(k); try { play('tap'); } catch {} }}
                  aria-current={k === i ? 'true' : undefined}
                  className={`min-h-11 rounded-full px-3.5 py-2 text-[13px] font-semibold backdrop-blur transition active:scale-95 ${k === i ? 'bg-white text-[#1b2620] shadow-md ring-2 ring-primary-500' : 'bg-white/12 text-white/80 hover:bg-white/25'}`}
                >
                  {REGIONS[x].flag ?? '🇧🇩'} {L(REGIONS[x].farmer)}
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-center text-[11.5px] text-white/50">
            {T('মাউস বা আঙুল দিয়ে টেনে ৩৬০° ঘুরিয়ে দেখুন · মানুষের দেহের 3D মডেল Quaternius (CC0)।', 'Drag with mouse or touch to inspect 360° · 3D body models by Quaternius (CC0).')}
          </p>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, Unlock, Star, Sparkles, Gamepad2, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import { KIDS_WORLDS, KIDS_BADGES } from '../../data/kidsData';
import { getWorldProgress, buildMissionRoundChallenge } from '../../engine/kidsEngine';
import { validateKidsAnswer, generateExplanatoryFeedback } from '../../engine/kidsMath';
import { bnDigits } from '../../engine/dates';
import { ProgressBar } from '../ui.jsx';
import ChallengeInput from './ChallengeInput.jsx';
import FeedbackModal from './FeedbackModal.jsx';

export default function WorldRunner({
  profile,
  onCompleteMission,
  onOpenActivity,
  fx,
}) {
  const { s, T, L } = useStore();
  const [strictUnlock, setStrictUnlock] = useState(false);
  const [activeWorldId, setActiveWorldId] = useState(null);
  const [activeMissionId, setActiveMissionId] = useState(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [roundSeed, setRoundSeed] = useState(42);
  const [mistakes, setMistakes] = useState(0);
  const [hadMathSolved, setHadMathSolved] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [missionSummary, setMissionSummary] = useState(null);

  const activeWorld = useMemo(
    () => KIDS_WORLDS.find((w) => w.id === activeWorldId) || null,
    [activeWorldId]
  );

  const activeMission = useMemo(
    () => activeWorld?.missions.find((m) => m.id === activeMissionId) || null,
    [activeWorld, activeMissionId]
  );

  const currentRound = activeMission?.rounds?.[roundIdx] || null;

  const mathChallenge = useMemo(() => {
    if (!currentRound || currentRound.type !== 'math_category') return null;
    return buildMissionRoundChallenge(currentRound, profile.difficulty, roundSeed);
  }, [currentRound, profile.difficulty, roundSeed]);

  const startMission = (worldId, missionId) => {
    fx?.('pop');
    setActiveWorldId(worldId);
    setActiveMissionId(missionId);
    setRoundIdx(0);
    setRoundSeed((prev) => prev + 17);
    setMistakes(0);
    setHadMathSolved(false);
    setFeedback(null);
    setMissionSummary(null);
  };

  const exitMission = () => {
    setActiveMissionId(null);
    setFeedback(null);
    setMissionSummary(null);
  };

  const handleRoundSubmit = (submitted) => {
    if (!currentRound) return;

    if (currentRound.type === 'choice') {
      const picked = currentRound.choices.find((c) => c.id === submitted);
      const isCorrect = Boolean(picked?.isCorrect);
      if (isCorrect) {
        fx?.('cheer');
        setFeedback({
          isCorrect: true,
          explanationText: T('দারুণ বেছেছ! উত্তরটি একদম সঠিক।', 'Great pick! That is completely right.'),
          taraNote: L(currentRound.hint),
        });
      } else {
        fx?.('sad');
        setMistakes((m) => m + 1);
        setFeedback({
          isCorrect: false,
          explanationText: T('এটি সঠিক উত্তর ছিল না—চলো তারার সূত্র দেখে আবার ভাবি!', 'Not quite that one—let’s check Tara’s clue!'),
          taraNote: L(currentRound.hint),
        });
      }
      return;
    }

    if (currentRound.type === 'slider') {
      const val = Number(submitted);
      const isCorrect = Math.abs(val - currentRound.targetAnswer) <= (currentRound.tolerance ?? 0.5);
      if (isCorrect) {
        fx?.('cheer');
        setFeedback({
          isCorrect: true,
          explanationText: T(
            `সাবাশ! ${bnDigits(val)} ${currentRound.unit} আদর্শ সীমার ভেতরে আছে।`,
            `Spot on! ${val} ${currentRound.unit} is right inside the healthy target range!`
          ),
          taraNote: L(currentRound.hint),
        });
      } else {
        fx?.('sad');
        setMistakes((m) => m + 1);
        setFeedback({
          isCorrect: false,
          explanationText: T(
            `তুমি দিয়েছ ${bnDigits(val)} ${currentRound.unit}, কিন্তু আদর্শ লক্ষ্য ${bnDigits(currentRound.targetAnswer)} ${currentRound.unit} (±${bnDigits(currentRound.tolerance)})।`,
            `You picked ${val} ${currentRound.unit}, while target is ${currentRound.targetAnswer} ${currentRound.unit} (±${currentRound.tolerance}).`
          ),
          taraNote: L(currentRound.hint),
        });
      }
      return;
    }

    if (currentRound.type === 'math_category' && mathChallenge) {
      const validation = validateKidsAnswer(mathChallenge, submitted);
      const expl = generateExplanatoryFeedback(mathChallenge, submitted, s.lang);
      if (validation.isCorrect) {
        fx?.('cheer');
        setHadMathSolved(true);
        setFeedback({
          isCorrect: true,
          explanationText: expl.bilingualSummary ? L(expl.bilingualSummary) : expl.explanationText,
          taraNote: expl.taraInsight,
        });
      } else {
        fx?.('sad');
        setMistakes((m) => m + 1);
        setFeedback({
          isCorrect: false,
          explanationText: expl.explanationText,
          taraNote: expl.taraInsight,
          mathSteps: expl.steps,
        });
      }
    }
  };

  const advanceRound = () => {
    if (!activeMission) return;
    setFeedback(null);
    if (roundIdx + 1 < activeMission.rounds.length) {
      setRoundIdx((i) => i + 1);
      setRoundSeed((prev) => prev + 7);
    } else {
      const stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
      const result = onCompleteMission({
        missionId: activeMission.id,
        xpReward: activeMission.xpReward,
        stars,
        solvedMath: hadMathSolved,
      });
      fx?.('stardust');
      setMissionSummary({
        mission: activeMission,
        stars,
        earnedXp: result.earnedXp,
        newlyUnlocked: result.newlyUnlocked,
      });
    }
  };

  // Screen 3: Active Mission Play View
  if (activeMission && currentRound) {
    if (missionSummary) {
      return (
        <div className="space-y-4 rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-amber-50 p-5 shadow-md sm:p-6" data-testid="kids-mission-complete">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-4xl shadow-sm">
              🏆
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-900">
              {T('মিশন সম্পন্ন!', 'Mission Complete!')}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              {L(missionSummary.mission.title)}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-2xl">
              {[1, 2, 3].map((st) => (
                <Star
                  key={st}
                  className={`h-8 w-8 ${
                    st <= missionSummary.stars ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-extrabold text-white">
              <Sparkles className="h-4 w-4" />
              <span>+{s.lang === 'bn' ? bnDigits(missionSummary.earnedXp) : missionSummary.earnedXp} XP</span>
            </div>
          </div>

          {missionSummary.newlyUnlocked?.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-white p-4 text-center">
              <p className="text-xs font-extrabold uppercase text-amber-800">
                {T('নতুন ব্যাজ অর্জিত!', 'New Badge Unlocked!')}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {missionSummary.newlyUnlocked.map((bId) => {
                  const b = KIDS_BADGES[bId];
                  if (!b) return null;
                  return (
                    <span
                      key={bId}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-950"
                    >
                      <span>{b.icon}</span>
                      <span>{L(b.title)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exitMission}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{T('মিশন তালিকায় ফিরো', 'Back to Missions')}</span>
            </button>
            {missionSummary.mission.miniGameId && onOpenActivity && (
              <button
                type="button"
                onClick={() => onOpenActivity(missionSummary.mission.miniGameId)}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700"
              >
                <Gamepad2 className="h-4 w-4" />
                <span>{T('এ সম্পর্কিত ল্যাব/গেম খেলো!', 'Play Matching Lab/Game!')}</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    const totalRounds = activeMission.rounds.length;
    const isMath = currentRound.type === 'math_category' && mathChallenge;
    const inputMode = isMath
      ? mathChallenge.answerType === 'choice'
        ? 'choice'
        : 'number'
      : currentRound.type;

    const inputChoices = isMath
      ? mathChallenge.choiceCards || []
      : currentRound.choices || [];

    const inputPrompt = isMath ? L(mathChallenge.question) : L(currentRound.prompt);

    return (
      <div className="space-y-4" data-testid={`kids-active-mission-${activeMission.id}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={exitMission}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{T('সব মিশন', 'All Missions')}</span>
          </button>

          <div className="rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-extrabold text-emerald-900 tabular">
            {T(
              `রাউন্ড ${bnDigits(roundIdx + 1)} / ${bnDigits(totalRounds)}`,
              `Round ${roundIdx + 1} / ${totalRounds}`
            )}
          </div>
        </div>

        {/* Story Briefing */}
        <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-xs">
              {activeMission.icon}
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                {L(activeMission.title)}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {L(activeMission.story)}
              </p>
              <p className="mt-2 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-sky-900">
                🛰️ {L(activeMission.taraTip)}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Challenge Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <ChallengeInput
            mode={inputMode}
            prompt={inputPrompt}
            choices={inputChoices}
            unit={isMath ? mathChallenge.unit : null}
            sliderConfig={currentRound.type === 'slider' ? currentRound : null}
            disabled={Boolean(feedback)}
            onSubmit={handleRoundSubmit}
          />
        </div>

        {feedback && (
          <FeedbackModal
            feedback={feedback}
            onTryAgain={() => setFeedback(null)}
            onContinue={advanceRound}
          />
        )}
      </div>
    );
  }

  // Screen 2: Selected World's Mission List
  if (activeWorld) {
    const wp = getWorldProgress(activeWorld, profile, { strictUnlock });
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setActiveWorldId(null)}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{T('সব বিশ্ব', 'All Worlds')}</span>
          </button>
          <span className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 tabular">
            {T(
              `${bnDigits(wp.completedCount)}/${bnDigits(wp.totalCount)} মিশন সম্পন্ন`,
              `${wp.completedCount}/${wp.totalCount} Missions Done`
            )}
          </span>
        </div>

        <div className={`rounded-3xl border p-5 ${activeWorld.theme?.surface || 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{activeWorld.icon}</span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{L(activeWorld.title)}</h2>
              <p className="text-sm text-slate-700">{L(activeWorld.description)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {activeWorld.missions.map((m) => {
            const done = profile.completedMissions.includes(m.id);
            const stars = profile.missionStars[m.id] || 0;
            return (
              <div
                key={m.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                      {m.icon}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-900 tabular">
                      +{s.lang === 'bn' ? bnDigits(m.xpReward) : m.xpReward} XP
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-slate-900">
                    {L(m.title)}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                    {L(m.story)}
                  </p>
                </div>

                <div className="mt-4 space-y-2.5">
                  {done && (
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {T('সম্পন্ন', 'Completed')}
                      </span>
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3].map((idx) => (
                          <Star
                            key={idx}
                            className={`h-4 w-4 ${idx <= stars ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`}
                          />
                        ))}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    data-testid={`kids-start-mission-${m.id}`}
                    onClick={() => startMission(activeWorld.id, m.id)}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-4 text-sm font-extrabold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                  >
                    <span>{done ? T('আবার খেলো', 'Replay Mission') : T('মিশন শুরু করো', 'Start Mission')}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Screen 1: Worlds 1-4 Grid Overview
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
            {T('বিশ্ব ১–৪ শেখার অভিযান', 'Worlds 1–4 Learning Missions')}
          </h2>
          <p className="text-xs text-slate-600 sm:text-sm">
            {T(
              'কৃষি, নাসার উপগ্রহ, গণিত আর বাজারের লাভ-ক্ষতি গল্পে গল্পে শেখো!',
              'Learn farming, NASA satellites, crop math, and farm profits through interactive stories!'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStrictUnlock((v) => !v)}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
        >
          {strictUnlock ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-emerald-600" />}
          <span>
            {strictUnlock ? T('ধাপে ধাপে আনলক চালু', 'Sequential Unlock On') : T('সব বিশ্ব উন্মুক্ত (ফ্রি মোড)', 'Free Explore Mode')}
          </span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {KIDS_WORLDS.map((w) => {
          const wp = getWorldProgress(w, profile, { strictUnlock });
          const pct = wp.totalCount > 0 ? Math.round((wp.completedCount / wp.totalCount) * 100) : 0;
          return (
            <div
              key={w.id}
              data-testid={`kids-world-card-${w.id}`}
              className={`flex flex-col justify-between rounded-3xl border-2 p-5 transition ${
                wp.isUnlocked
                  ? `${w.theme?.surface || 'border-emerald-200 bg-emerald-50'} shadow-sm`
                  : 'border-slate-200 bg-slate-100/80 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-xs">
                    {w.icon}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold tabular ${w.theme?.badgeBg || 'bg-emerald-100 text-emerald-900'}`}>
                      {T(`${bnDigits(wp.completedCount)}/${bnDigits(wp.totalCount)} মিশন`, `${wp.completedCount}/${wp.totalCount} Missions`)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 tabular">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      {s.lang === 'bn' ? `${bnDigits(wp.starsEarned)}/${bnDigits(wp.maxStars)}` : `${wp.starsEarned}/${wp.maxStars}`}
                    </span>
                  </div>
                </div>

                <h3 className="mt-3 text-lg font-extrabold text-slate-900">
                  {L(w.title)}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-700 sm:text-sm">
                  {L(w.subtitle)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {L(w.description)}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <ProgressBar value={pct} max={100} tone="primary" />
                <button
                  type="button"
                  data-testid={`kids-open-world-${w.id}`}
                  disabled={!wp.isUnlocked}
                  onClick={() => {
                    fx?.('pop');
                    setActiveWorldId(w.id);
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {wp.isUnlocked ? (
                    <>
                      <span>{T('বিশ্ব ঘুরে দেখো', 'Open World')}</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>{T('আগের বিশ্ব সম্পন্ন করো', 'Complete Previous World')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

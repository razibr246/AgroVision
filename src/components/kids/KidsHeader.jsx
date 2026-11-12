import { useState } from 'react';
import { Volume2, VolumeX, RotateCcw, Sparkles, Edit3, Check, CloudRain, ThermometerSun, Sprout } from 'lucide-react';
import { useStore } from '../../store';
import { calculateLevelFromXp } from '../../engine/kidsEngine';
import { DIFFICULTY_TIERS, DIFFICULTY_CONFIG } from '../../engine/kidsMath';
import { CHILD_IDS, CHILDREN } from '../../game/dream';
import { bnDigits, num } from '../../engine/dates';
import { Tags, ProgressBar } from '../ui.jsx';

export default function KidsHeader({
  profile,
  onUpdateProfile,
  onResetProfile,
  muted,
  onToggleMute,
}) {
  const { s, dispatch, T, L, upazila, soil, weather, liveWeather } = useStore();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.learnerName || '');
  const [confirmReset, setConfirmReset] = useState(false);
  const [showAvatars, setShowAvatars] = useState(false);

  const lvlInfo = calculateLevelFromXp(profile.xp);
  const activeAvatar = CHILDREN[profile.avatarId] || CHILDREN[CHILD_IDS[0]];
  const displayName = profile.learnerName?.trim() || L(activeAvatar?.name) || T('খুদে কৃষিবিজ্ঞানী', 'Young Scientist');

  const saveName = (e) => {
    e?.preventDefault?.();
    onUpdateProfile({ learnerName: nameDraft.trim().slice(0, 32) });
    setEditingName(false);
  };

  const toggleLang = () => {
    dispatch({ type: 'set', patch: { lang: s.lang === 'bn' ? 'en' : 'bn' } });
  };

  const handleResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    onResetProfile();
  };

  return (
    <header className="space-y-3">
      {/* Main Hero & Learner Profile Card */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Avatar + Identity + Level Pill */}
          <div className="flex flex-wrap items-start gap-3 sm:items-center">
            <button
              type="button"
              onClick={() => setShowAvatars((v) => !v)}
              title={T('অবতার বদলাও', 'Change avatar')}
              className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-300 bg-white text-3xl shadow-sm transition hover:scale-105 active:scale-95"
            >
              <span>{lvlInfo.icon}</span>
              <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white tabular">
                {s.lang === 'bn' ? `লে.${bnDigits(lvlInfo.level)}` : `L${lvlInfo.level}`}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                  <Sparkles className="h-3.5 w-3.5" />
                  {T('তারা আর স্বপ্নের মাঠ', 'Tara and the Dream Fields')}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                  {L(lvlInfo.title)}
                </span>
              </div>

              {editingName ? (
                <form onSubmit={saveName} className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder={T('তোমার নাম লেখো...', 'Enter your name...')}
                    maxLength={32}
                    className="min-h-12 w-48 rounded-xl border border-emerald-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Check className="h-4 w-4" />
                    {T('সংরক্ষণ', 'Save')}
                  </button>
                </form>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                    {displayName}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(profile.learnerName || '');
                      setEditingName(true);
                    }}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    {T('নাম দাও', 'Edit Name')}
                  </button>
                </div>
              )}

              {/* XP Progress Bar */}
              <div className="mt-2 max-w-md space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 tabular">
                  <span data-testid="kids-xp-readout">
                    {T(`মোট XP: ${bnDigits(profile.xp)}`, `Total XP: ${profile.xp}`)}
                  </span>
                  <span>
                    {lvlInfo.isMaxLevel
                      ? T('সর্বোচ্চ স্তর অর্জিত!', 'Max Level Reached!')
                      : T(
                          `পরের স্তরে আরও ${bnDigits(lvlInfo.xpNeededForNext)} XP`,
                          `${lvlInfo.xpNeededForNext} XP to next level`
                        )}
                  </span>
                </div>
                <ProgressBar value={Math.round(lvlInfo.progressFraction * 100)} max={100} tone="primary" />
              </div>
            </div>
          </div>

          {/* Action Toolbar: Lang, Sound, Reset */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="kids-lang-toggle"
              onClick={toggleLang}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-95"
            >
              <span>🌐</span>
              <span>{s.lang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-pressed={!muted}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-95"
            >
              {muted ? <VolumeX className="h-4 w-4 text-rose-500" /> : <Volume2 className="h-4 w-4 text-emerald-600" />}
              <span>{muted ? T('শব্দ বন্ধ', 'Muted') : T('শব্দ চালু', 'Sound On')}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetClick}
                className={`inline-flex min-h-12 items-center gap-1.5 rounded-2xl border px-3.5 text-xs font-bold shadow-sm transition active:scale-95 ${
                  confirmReset
                    ? 'border-rose-400 bg-rose-600 text-white hover:bg-rose-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                <span>{confirmReset ? T('নিশ্চিত রিসেট?', 'Confirm Reset?') : T('নতুন শুরু', 'Reset')}</span>
              </button>
              {confirmReset && (
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="inline-flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                >
                  {T('থাক', 'Cancel')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Avatar Picker Drawer */}
        {showAvatars && (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-white/90 p-3">
            <p className="mb-2 text-xs font-bold text-slate-700">
              {T('তোমার খামার চরিত্র বেছে নাও:', 'Pick your Dream Farm character:')}
            </p>
            <div className="flex flex-wrap gap-2">
              {CHILD_IDS.slice(0, 8).map((cid) => {
                const c = CHILDREN[cid];
                const selected = profile.avatarId === cid;
                return (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => {
                      onUpdateProfile({ avatarId: cid });
                      setShowAvatars(false);
                    }}
                    className={`min-h-12 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {L(c.name)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Difficulty Tier Selector */}
        <div className="mt-4 flex flex-col gap-2 border-t border-emerald-200/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-slate-700">
            {T('অঙ্কের ও মিশনের কঠিনতা:', 'Challenge Difficulty Tier:')}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex" role="group" aria-label={T('কঠিনতা স্তর', 'Difficulty tier')}>
            {Object.values(DIFFICULTY_TIERS).map((tier) => {
              const cfg = DIFFICULTY_CONFIG[tier];
              const active = profile.difficulty === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  data-testid={`kids-tier-${tier}`}
                  aria-pressed={active}
                  onClick={() => onUpdateProfile({ difficulty: tier })}
                  className={`min-h-12 rounded-2xl border px-3 py-2 text-xs font-bold transition active:scale-95 sm:px-4 sm:text-sm ${
                    active
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50'
                  }`}
                >
                  {L(cfg.label)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live FieldShift Weather & Satellite Soil Insight Banner */}
      <div className="flex flex-col gap-2 rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-xs text-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 font-bold text-sky-900">
            <Sprout className="h-4 w-4 text-emerald-600" />
            {T('লাইভ খামার প্রেক্ষাপট:', 'Live Farm Context:')} {L(upazila?.name)}
          </span>
          <span className="inline-flex items-center gap-1 font-medium tabular">
            <ThermometerSun className="h-3.5 w-3.5 text-amber-600" />
            {weather?.tmax != null
              ? T(`তাপমাত্রা ${num(weather.tmax, s.lang, { maximumFractionDigits: 0 })}°C`, `Max ${num(weather.tmax, s.lang, { maximumFractionDigits: 0 })}°C`)
              : T('আবহাওয়া তথ্য প্রস্তুত হচ্ছে', 'Weather syncing')}
          </span>
          <span className="inline-flex items-center gap-1 font-medium tabular">
            <CloudRain className="h-3.5 w-3.5 text-sky-600" />
            {weather?.rainNext3 != null
              ? T(`৩ দিনে বৃষ্টি ${num(weather.rainNext3, s.lang, { maximumFractionDigits: 1 })} মিমি`, `3-day rain ${num(weather.rainNext3, s.lang, { maximumFractionDigits: 1 })} mm`)
              : T('বৃষ্টি রাডার সংযুক্ত', 'Rain radar active')}
          </span>
          {soil?.ph != null && (
            <span className="font-medium tabular">
              {T(`মাটির pH ${num(soil.ph, s.lang, { maximumFractionDigits: 1 })}`, `Soil pH ${num(soil.ph, s.lang, { maximumFractionDigits: 1 })}`)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tags list={[liveWeather ? 'STATION' : 'MODEL', 'RULE']} />
          <span className="text-[11px] font-medium text-slate-600">
            {T(
              'শিশুদের গেম ও দর-দাম শিক্ষামূলক অনুশীলন—আসল কৃষি পরামর্শ নয়।',
              'Kids games use educational simulations—not verified farm advisories.'
            )}
          </span>
        </div>
      </div>
    </header>
  );
}

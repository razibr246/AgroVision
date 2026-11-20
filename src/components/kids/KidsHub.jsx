import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Compass,
  Gamepad2,
  FlaskConical,
  Box,
  Award,
  Store,
  Sprout,
  Droplets,
  Bug,
  Microscope,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../store';
import {
  readKidsProfile,
  writeKidsProfile,
  resetKidsProfile,
  applyMissionCompletion,
  applyActivityProgress,
} from '../../engine/kidsEngine';
import { KIDS_BADGES } from '../../data/kidsData';
import { GAMES } from '../../data/games';
import { createDreamSound } from '../../game/dreamSound';
import usePageMeta from '../usePageMeta';
import KidsHeader from './KidsHeader.jsx';
import WorldRunner from './WorldRunner.jsx';
import BadgeGallery from './BadgeGallery.jsx';
import MarketGame from './games/MarketGame.jsx';
import PlantGrowthGame from './games/PlantGrowthGame.jsx';
import PipelineGame from './games/PipelineGame.jsx';
import PestHunterGame from './games/PestHunterGame.jsx';
import ChemistryLab from './science/ChemistryLab.jsx';
import BiologyLab from './science/BiologyLab.jsx';
import ScienceArcade from './science/ScienceArcade.jsx';

const KID_SECTIONS = ['worlds', 'minigames', 'labs', 'dream3d', 'badges'];

export default function KidsHub({ dreamSlot }) {
  const { T, L, toast } = useStore();
  usePageMeta(
    L(GAMES.kids.name),
    T(
      'শিশুদের জন্য খামার, গণিত ও বিজ্ঞান খেলার জগৎ: বীজ-পানি-সার হিসাব, জীববিজ্ঞান ও রসায়ন ল্যাব এবং ৩ডি স্বপ্ন-খামার।',
      GAMES.kids.seo.en
    )
  );

  const [profile, setProfile] = useState(() => readKidsProfile());
  const [params] = useSearchParams(); // /kids?section=dream3d opens the 3D VR story tab
  const [section, setSection] = useState(() => (KID_SECTIONS.includes(params.get('section')) ? params.get('section') : 'worlds')); // 'worlds' | 'minigames' | 'labs' | 'dream3d' | 'badges'
  const tabsRef = useRef(null);
  useEffect(() => {
    if (params.get('section')) tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [params]);
  const [miniGameTab, setMiniGameTab] = useState('market'); // 'market' | 'plant' | 'pipeline' | 'pest'
  const [labTab, setLabTab] = useState('chemistry'); // 'chemistry' | 'biology' | 'science'
  const [muted, setMuted] = useState(false);

  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      soundRef.current?.dispose?.();
      soundRef.current = null;
    };
  }, []);

  const ensureSound = useCallback(() => {
    if (!soundRef.current) {
      try {
        soundRef.current = createDreamSound();
        soundRef.current.setMuted(muted);
      } catch {
        // Safe fallback when WebAudio is unavailable
      }
    }
    return soundRef.current;
  }, [muted]);

  const playFx = useCallback(
    (name) => {
      if (muted) return;
      const snd = ensureSound();
      try {
        snd?.fx?.(name);
      } catch {
        // Ignore audio resume edge cases
      }
    },
    [muted, ensureSound]
  );

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundRef.current?.setMuted?.(nextMuted);
  };

  const persistProfile = (nextProfile) => {
    const saved = writeKidsProfile(nextProfile);
    setProfile(saved.profile);
    if (!saved.ok) {
      toast(
        'ব্রাউজার স্টোরেজ পূর্ণ—অগ্রগতি এই সেশনে চালু আছে।',
        'Browser storage is full—progress stays active for this session.'
      );
    }
    return saved.profile;
  };

  const handleUpdateProfile = (patch) => {
    playFx('pop');
    persistProfile({ ...profile, ...patch });
  };

  const handleResetProfile = () => {
    playFx('pop');
    const fresh = resetKidsProfile();
    setProfile(fresh);
    toast('খামার নতুন করে শুরু হলো!', 'Dream Farm profile reset!');
  };

  const notifyNewBadges = (newlyUnlocked = []) => {
    if (!newlyUnlocked || newlyUnlocked.length === 0) return;
    const first = KIDS_BADGES[newlyUnlocked[0]];
    if (first) {
      toast(
        `নতুন ব্যাজ: ${first.icon} ${first.title.bn}`,
        `New Badge: ${first.icon} ${first.title.en}`
      );
    }
  };

  const handleCompleteMission = (payload) => {
    const res = applyMissionCompletion(profile, payload);
    persistProfile(res.profile);
    notifyNewBadges(res.newlyUnlocked);
    return res;
  };

  const handleRecordActivity = (payload) => {
    const res = applyActivityProgress(profile, payload);
    persistProfile(res.profile);
    notifyNewBadges(res.newlyUnlocked);
    return res;
  };

  const handleOpenActivity = (activityId) => {
    playFx('pop');
    if (['market', 'plant', 'pipeline', 'pest'].includes(activityId)) {
      setSection('minigames');
      setMiniGameTab(activityId);
    } else if (['chemistry', 'biology', 'science'].includes(activityId)) {
      setSection('labs');
      setLabTab(activityId);
    }
  };

  const mainTabs = [
    { id: 'worlds', icon: Compass, label: { bn: 'বিশ্ব ১–৪ অভিযান', en: 'Worlds 1–4' } },
    { id: 'minigames', icon: Gamepad2, label: { bn: 'মিনি-গেম (৪টি)', en: 'Mini-Games' } },
    { id: 'labs', icon: FlaskConical, label: { bn: 'রসায়ন ও বিজ্ঞান ল্যাব', en: 'Science Labs' } },
    { id: 'dream3d', icon: Box, label: { bn: '3D তারার স্বপ্ন', en: '3D Dream VR' } },
    { id: 'badges', icon: Award, label: { bn: 'ব্যাজ ও সনদ', en: 'Badges & Cert' } },
  ];

  return (
    <div className="page-shell overflow-x-hidden pb-24 pt-[98px] sm:pt-[116px]">
      <div className="space-y-5">
        <KidsHeader
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onResetProfile={handleResetProfile}
          muted={muted}
          onToggleMute={toggleMute}
        />

        {/* Main Portal Navigation ("আমি তারার স্বপ্ন-খামারে কী খেলব?") */}
        <nav
          ref={tabsRef}
          aria-label={T('তারা আর স্বপ্নের মাঠ বিভাগ', 'AgroVision Kids Hub Tabs')}
          className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xs"
        >
          <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-extrabold text-emerald-900">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>{T('স্বপ্নের মাঠে আজ কী খেলব?', 'What would you like to explore today?')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const active = section === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`kids-tab-${tab.id}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    playFx('pop');
                    setSection(tab.id);
                  }}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition active:scale-95 sm:text-sm ${
                    active
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-emerald-50'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{L(tab.label)}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Section 1: Worlds 1-4 Learning Missions */}
        {section === 'worlds' && (
          <WorldRunner
            profile={profile}
            onCompleteMission={handleCompleteMission}
            onOpenActivity={handleOpenActivity}
            fx={playFx}
          />
        )}

        {/* Section 2: 4 Interactive Mini-Games */}
        {section === 'minigames' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: 'market', icon: Store, label: { bn: 'ফার্মার্স মার্কেট', en: 'Farmer’s Market' } },
                { id: 'plant', icon: Sprout, label: { bn: 'গাছ বড় করো', en: 'Grow Plant' } },
                { id: 'pipeline', icon: Droplets, label: { bn: 'সেচ পাইপলাইন', en: 'Water Pipeline' } },
                { id: 'pest', icon: Bug, label: { bn: 'পেস্ট হান্টার', en: 'Pest Hunter' } },
              ].map((g) => {
                const Icon = g.icon;
                const active = miniGameTab === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    data-testid={`kids-minigame-${g.id}`}
                    onClick={() => {
                      playFx('pop');
                      setMiniGameTab(g.id);
                    }}
                    className={`flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border px-3 text-xs font-extrabold transition sm:text-sm ${
                      active
                        ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-violet-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{L(g.label)}</span>
                  </button>
                );
              })}
            </div>

            {miniGameTab === 'market' && (
              <MarketGame onRecordActivity={handleRecordActivity} fx={playFx} />
            )}
            {miniGameTab === 'plant' && (
              <PlantGrowthGame onRecordActivity={handleRecordActivity} fx={playFx} />
            )}
            {miniGameTab === 'pipeline' && (
              <PipelineGame onRecordActivity={handleRecordActivity} fx={playFx} />
            )}
            {miniGameTab === 'pest' && (
              <PestHunterGame onRecordActivity={handleRecordActivity} fx={playFx} />
            )}
          </div>
        )}

        {/* Section 3: Chemistry, Biology & NASA Science Arcade */}
        {section === 'labs' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { id: 'chemistry', icon: FlaskConical, label: { bn: 'রসায়ন ও মাটি-pH ল্যাব', en: 'Chemistry Soil pH Lab' } },
                { id: 'biology', icon: Microscope, label: { bn: 'জীববিজ্ঞান এক্সপ্লোরার', en: 'Biology Explorer' } },
                { id: 'science', icon: Rocket, label: { bn: 'নাসা স্পেস ও পদার্থবিজ্ঞান', en: 'NASA & Physics Arcade' } },
              ].map((lab) => {
                const Icon = lab.icon;
                const active = labTab === lab.id;
                return (
                  <button
                    key={lab.id}
                    type="button"
                    data-testid={`kids-lab-${lab.id}`}
                    onClick={() => {
                      playFx('pop');
                      setLabTab(lab.id);
                    }}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-extrabold transition sm:text-sm ${
                      active
                        ? 'border-fuchsia-600 bg-fuchsia-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-fuchsia-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{L(lab.label)}</span>
                  </button>
                );
              })}
            </div>

            {labTab === 'chemistry' && (
              <ChemistryLab
                profile={profile}
                onRecordActivity={handleRecordActivity}
                fx={playFx}
              />
            )}
            {labTab === 'biology' && (
              <BiologyLab onRecordActivity={handleRecordActivity} fx={playFx} />
            )}
            {labTab === 'science' && (
              <ScienceArcade onRecordActivity={handleRecordActivity} fx={playFx} />
            )}
          </div>
        )}

        {/* Section 4: Preserved 3D Tara's Dream VR/AR Story */}
        {section === 'dream3d' && (
          <div className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6">
            {dreamSlot}
          </div>
        )}

        {/* Section 5: Badges & Certificate */}
        {section === 'badges' && <BadgeGallery profile={profile} />}
      </div>
    </div>
  );
}

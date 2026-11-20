// "স্বপ্নের মাঠ": the children's version of মাঠের মানুষ. Pick a farmer's child, then play the dream: a worried night,
// Tara the NASA satellite, three mini-games on real NASA records (GPM rain, MODIS bare months, SMAP soil water), two
// doors (the season without the data and with it), and the morning. Story and rules: game/dream.js; the 3D world,
// people and VR/AR: game/three/dreamScene.js. Lines can be read aloud for children who do not read yet.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Volume2, VolumeX, Mic, Star, Heart, Glasses, Smartphone, RotateCcw, Sparkles, Droplets, Award, Download, Languages } from 'lucide-react';
import { useStore } from '../../store';
import { LangToggle } from '../../components/chrome.jsx';
import { REGIONS } from '../../game/regions';
import { CHILDREN, CHILD_IDS, MOODS, BADGES, dreamFor, cloudStars, blanketStars, healthStars, coolStars, waterResult, WATER_BAND, badgesFor, totalStars } from '../../game/dream';
import { landSummary } from '../../engine/landsat';
import { createDreamSound } from '../../game/dreamSound';
import { dreamSpeaker } from '../../engine/voices';
import { bnDigits, num } from '../../engine/dates';
import { GAMES } from '../../data/games';
import usePageMeta from '../../components/usePageMeta';
import KidsHub from '../../components/kids/KidsHub.jsx';

const WHO = {
  parent: { bg: 'bg-amber-100', ring: 'ring-amber-300' },
  child: { bg: 'bg-sky-100', ring: 'ring-sky-300' },
  tara: { bg: 'bg-yellow-100', ring: 'ring-yellow-300' },
  frog: { bg: 'bg-green-100', ring: 'ring-green-300' },
};
const FACE = { tara: '🛰️', frog: '🐸' };
const GAME_SECONDS = { clouds: 26, blanket: 30, health: 26, cool: 26 };

export default function KidsDream() {
  const [params] = useSearchParams(); // /kids?who=rahimu opens that child's dream straight away
  const [who, setWho] = useState(() => (CHILDREN[params.get('who')] ? params.get('who') : null));
  if (who) return <Dream id={who} onExit={() => setWho(null)} />;
  return <KidsHub dreamSlot={<Picker onPick={setWho} embedded />} />;
}

function Picker({ onPick, embedded = false }) {
  const { T, L } = useStore();
  return (
    <div className={embedded ? '' : 'page-shell pb-24 pt-[110px] sm:pt-[124px]'}>
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><Sparkles size={15} />{T('ছোটদের জন্য', 'For children')}</p>
          <LangToggle glass />
        </div>
      )}
      <h2 className={embedded ? 'text-xl font-extrabold text-slate-900 sm:text-2xl' : 'mt-4 text-[38px] font-semibold leading-tight sm:text-[52px]'}>{L(GAMES.kids.name)} — {T('3D গল্প ও VR/AR', '3D Story & VR/AR')}</h2>
      <p className="mt-2 max-w-2xl text-[17px] leading-8 text-ink/75">{T('এক রাতে বাবা-মায়ের চিন্তা শুনে ঘুমিয়ে পড়ো। স্বপ্নে নাসার উপগ্রহ "তারা" তোমাকে আকাশে নিয়ে যাবে, তোমাদের মাঠ বাঁচাতে খেলবে, আর দেখাবে আগে জানলে কী বদলায়। কার ছেলে বা মেয়ে হয়ে খেলবে?', 'One night you fall asleep hearing your family worry. In your dream Tara, a NASA satellite, flies you into the sky, you play to save your field, and you see what changes when people know in time. Whose child will you be?')}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CHILD_IDS.map((id) => {
          const c = CHILDREN[id], r = REGIONS[id];
          return (
            <li key={id} className="cv-auto">
              <button type="button" data-testid={`kids-dream-pick-${id}`} onClick={() => onPick(id)} className="lift flex w-full items-center gap-3 rounded-[22px] border border-border bg-white p-4 text-left shadow-[var(--shadow-card)] transition hover:border-primary-300">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-50 text-[30px]" aria-hidden="true">{c.girl ? '👧🏽' : '👦🏽'}</span>
                <span className="min-w-0">
                  <span className="block text-[18px] font-bold">{L(c.name)}, {T(`${bnDigits(c.age)} বছর`, `${c.age} years`)}</span>
                  <span className="block text-[13.5px] text-ink/70">{L(c.rel)}</span>
                  <span className="block text-[12.5px] text-muted">{r.flag ?? '🇧🇩'} {L(r.place)} · {L(r.storm)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 max-w-2xl text-[13px] leading-6 text-muted">{T('গল্পের মানুষেরা বানানো, কিন্তু তারা যা বলে (কোন মাসে মাঠ খালি থাকে, কোন বছর ফসল কষ্টে ছিল, মাটি কতটা গরম হয়েছে) তা ওই জায়গার আসল নাসা উপগ্রহের তথ্য। বড়দের জন্য পুরো খেলা "মাঠের মানুষ"।', `The people in the story are made up, but what Tara says (which months the fields lie bare, which year the crops struggled, how much hotter the ground has become) is that place’s real NASA satellite record. The full game for grown-ups is “${GAMES.farm.name.en}”.`)} <Link to="/farm" className="font-semibold text-primary-800 underline-offset-2 hover:underline">{T('বড়দের খেলা', 'The grown-ups’ game')}</Link></p>
    </div>
  );
}

function Dream({ id, onExit }) {
  const { T, L, s, dispatch } = useStore();
  const lang = s.lang;
  const dream = useMemo(() => dreamFor(id, REGIONS[id], landSummary(CHILDREN[id].land)), [id]);
  const host = useRef(null), overlay = useRef(null), world = useRef({ tap: () => {} }), sound = useRef(null), pumpTimer = useRef(null), hudRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [k, setK] = useState(0); // scene
  const [n, setN] = useState(0); // line within the scene
  const [phase, setPhase] = useState('lines'); // lines | action | game | won
  const [stars, setStars] = useState({});
  const [hud, setHud] = useState({ time: 0, caught: 0, dark: 0, covered: 0, eaten: 0, water: 20, healed: 0, totalHealth: 6, temp: 42 });
  const [winLine, setWinLine] = useState(null);
  const [muted, setMuted] = useState(false);
  const [read, setRead] = useState(true);
  const [xr, setXr] = useState({ vr: false, ar: false });
  const [done, setDone] = useState(false);
  const [sparkles, setSparkles] = useState([]);
  const onPointerSparkle = useCallback((e) => {
    if (Math.random() > 0.4) return;
    const icons = ['✨', '⭐', '🌟', '💫', '🌸'];
    const ch = icons[Math.floor(Math.random() * icons.length)];
    const sp = { id: Math.random(), x: e.clientX, y: e.clientY, ch };
    setSparkles((prev) => [...prev.slice(-10), sp]);
    setTimeout(() => {
      setSparkles((prev) => prev.filter((p) => p.id !== sp.id));
    }, 650);
  }, []);
  hudRef.current = hud; // the game timer reads the latest score, not the one from when it started
  const scene = dream.scenes[k];
  const line = phase === 'won' ? winLine : scene.lines[Math.min(n, scene.lines.length - 1)];
  const moodName = line?.mood ?? scene.mood;

  // the world
  useEffect(() => {
    const snd = createDreamSound(); sound.current = snd;
    const w = world.current;
    let alive = true;
    import('../../game/three/dreamScene').then(async ({ createDreamScene, bodyFor, kidBody }) => {
      if (!alive) return;
      const sc = createDreamScene(host.current, { onTap: (e) => w.tap(e) });
      w.scene = sc;
      window.__fsDream = sc; // lets a script or headless browser drive the dream, like window.__fsGame
      await sc.cast(bodyFor(id, REGIONS[id]), kidBody(CHILDREN[id], REGIONS[id]));
      if (!alive) return;
      sc.setScene(dream.scenes[0].id, dream.scenes[0].mood);
      setReady(true);
      if (navigator.xr) {
        const [vr, ar] = await Promise.all([navigator.xr.isSessionSupported('immersive-vr').catch(() => false), navigator.xr.isSessionSupported('immersive-ar').catch(() => false)]);
        if (alive) setXr({ vr, ar });
      }
    });
    return () => { alive = false; clearInterval(pumpTimer.current); w.scene?.dispose(); w.scene = null; snd.dispose(); if (speech.current?.stopSpeaking) speech.current.stopSpeaking(); else window.speechSynthesis?.cancel(); };
  }, [id, dream]);

  // music and the people follow the mood
  useEffect(() => { sound.current?.music(MOODS[moodName]?.music); }, [moodName]);
  useEffect(() => { sound.current?.setMuted(muted); }, [muted]);
  useEffect(() => { if (ready) world.current.scene?.setScene(scene.id, scene.mood); }, [k, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // each line: the 3D bubble (for VR), a close-up when it matters, and the feeling made visible
  useEffect(() => {
    const sc = world.current.scene;
    if (!sc || !line) return;
    sc.say({ text: L(line), who: line.who });
    const strong = (line.mood === 'sad' || line.mood === 'joy') && (line.who === 'parent' || line.who === 'child');
    if (strong) sc.closeUp(line.who); else sc.wide();
    if (line.mood === 'sad' && line.who === 'child') sc.burst('tears', 'child');
    if (line.mood === 'sad' && line.who === 'parent') sc.burst('tears', 'parent');
    if (line.mood === 'joy' && line.who === 'child') sc.burst('confetti', 'child');
  }, [line, ready, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // read each line aloud: the natural Gemini voice from voice/speech.js when that version is there (it falls back to
  // the browser's voice by itself), otherwise the browser's voice directly
  const speech = useRef(null);
  useEffect(() => { import('../../voice/speech').then((m) => { speech.current = m; }).catch(() => {}); }, []);
  const hush = () => { if (speech.current?.stopSpeaking) speech.current.stopSpeaking(); else window.speechSynthesis?.cancel(); };
  const [noVoice, setNoVoice] = useState(false);
  useEffect(() => {
    const check = () => { const v = window.speechSynthesis?.getVoices() ?? []; setNoVoice(lang === 'bn' && v.length > 0 && !v.some((x) => /^bn/i.test(x.lang))); };
    check(); window.speechSynthesis?.addEventListener?.('voiceschanged', check);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', check);
  }, [lang]);
  useEffect(() => {
    if (!read || !line) return;
    hush();
    const pitch = line.who === 'child' ? 1.35 : line.who === 'tara' ? 1.2 : line.who === 'frog' ? 1.6 : 0.95;
    // Each character speaks in their own voice (api/tts.js SPEAKERS): Bangladeshi Bangla, or British English in English.
    // a boy or a man in a male voice, a girl or a woman in a female one (engine/voices.js)
    const voiceOf = (l) => dreamSpeaker(l.who, { girl: dream.child.girl, parentWoman: dream.parent.woman });
    const ahead = [scene.lines[n + 1], scene.win, scene.action?.after, dream.scenes[k + 1]?.lines?.[0]].filter(Boolean).slice(0, 2);
    const say = (m) => {
      m.speakNatural(L(line), lang, { rate: 0.92, pitch, speaker: voiceOf(line) });
      // While this line plays, make the next ones (this scene's next line, its win line, the next scene's first) ready.
      for (const l of ahead) m.prefetchNatural?.(L(l), lang, voiceOf(l));
    };
    if (speech.current?.speakNatural) { say(speech.current); return; }
    // The voice module still loading (the first line of the dream): wait for it rather than drop to the device voice.
    let alive = true;
    import('../../voice/speech').then((m) => { speech.current = m; if (alive) say(m); }, () => {
      if (!alive || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(L(line));
      u.lang = lang === 'bn' ? 'bn-BD' : 'en-GB';
      u.rate = 0.92; u.pitch = pitch;
      window.speechSynthesis.speak(u);
    });
    return () => { alive = false; };
  }, [line, read, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // taps in the world
  useEffect(() => {
    const w = world.current;
    w.tap = (e) => {
      const snd = sound.current;
      if (e.kind === 'home' && phase === 'action') { snd.fx('stardust'); w.scene?.burst('stars', 'tara'); w.scene?.holdEarth(false); next(); }
      if (e.kind === 'tara') { snd.fx('stardust'); w.scene?.burst('stars', 'tara'); w.scene?.spinTara?.(); }
      if (e.kind === 'frog') { snd.fx('ribbit'); w.scene?.burst('waterdrop', 'child'); w.scene?.jumpFrog?.(); }
      if (e.kind === 'cloud') { snd.fx(e.dark ? 'rainbow' : 'pop'); w.scene?.burst(e.dark ? 'rainbow' : 'sparkle', 'tara'); setHud((h) => ({ ...h, caught: h.caught + 1, dark: h.dark + (e.dark ? 1 : 0) })); }
      if (e.kind === 'plant') { snd.fx('sprout'); setHud((h) => ({ ...h, covered: h.covered + 1 })); }
      if (e.kind === 'goat') { snd.fx('boing'); w.scene?.shooGoat(); }
      if (e.kind === 'rooster') { snd.fx('rooster'); w.scene?.crowRooster?.(); }
      if (e.kind === 'duckling') { snd.fx('twinkle'); w.scene?.burst('sparkle', 'child'); w.scene?.spinDuckling?.(); }
      if (e.kind === 'heal') { snd.fx('twinkle'); w.scene?.burst('stars', 'tara'); setHud((h) => ({ ...h, healed: h.healed + 1 })); }
      if (e.kind === 'cool') { snd.fx('splash'); w.scene?.burst('waterdrop', 'child'); setHud((h) => ({ ...h, temp: Math.max(24, h.temp - 3) })); }
      if (e.kind === 'eaten') { snd.fx('goat'); setHud((h) => ({ ...h, eaten: h.eaten + 1 })); }
      if (e.kind === 'next') next();
    };
  });

  // game timers
  useEffect(() => {
    if (phase !== 'game' || scene.game === 'water') return undefined;
    const end = Date.now() + GAME_SECONDS[scene.game] * 1000;
    const iv = setInterval(() => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setHud((h) => ({ ...h, time: left }));
      if (left === 0) finishGame();
    }, 250);
    return () => clearInterval(iv);
  }, [phase, k]); // eslint-disable-line react-hooks/exhaustive-deps

  function finishGame() {
    clearInterval(pumpTimer.current);
    const hud = hudRef.current, sc = world.current.scene;
    let st = 1, say = scene.win;
    if (scene.game === 'clouds') st = cloudStars(hud.caught, hud.dark, 5);
    if (scene.game === 'blanket') { const b = sc?.blanketState(); st = blanketStars(b?.covered ?? 0, b?.total ?? 12, 0); }
    if (scene.game === 'health') st = healthStars(hud.healed, hud.totalHealth);
    if (scene.game === 'cool') st = coolStars(hud.temp);
    if (scene.game === 'water') { const r = waterResult(hud.water); st = r.stars; if (r.kind !== 'just') say = { who: r.kind === 'flood' ? 'frog' : 'tara', mood: 'play', ...r.say }; }
    sc?.stopGame();
    setStars((x) => ({ ...x, [scene.game]: st }));
    sound.current.fx('cheer');
    sc?.burst(st >= 3 ? 'stars' : 'sparkle', 'child');
    if (st >= 2) sc?.burst('confetti', 'parent');
    setWinLine(say); setPhase('won');
  }

  function next() {
    hush();
    if (phase === 'lines' && n < scene.lines.length - 1) { setN(n + 1); return; }
    if (phase === 'lines' && scene.action) { if (scene.action.kind === 'find') world.current.scene?.holdEarth(true); setPhase('action'); return; }
    if (phase === 'lines' && scene.kind === 'game') {
      setHud({ time: GAME_SECONDS[scene.game] ?? 0, caught: 0, dark: 0, covered: 0, eaten: 0, water: 20, healed: 0, totalHealth: 6, temp: 42 });
      world.current.scene?.startGame(scene.game); setPhase('game'); return;
    }
    if (k < dream.scenes.length - 1) { setK(k + 1); setN(0); setPhase('lines'); setWinLine(null); return; }
    setDone(true);
    sound.current.fx('cheer');
    sound.current.fx('rooster');
    world.current.scene?.burst('confetti', 'child');
    world.current.scene?.burst('stars', 'parent');
  }
  function act() {
    const a = scene.action, sc = world.current.scene;
    if (a.kind === 'hug') { sc?.burst('hearts', 'child'); sc?.burst('hearts', 'parent'); sc?.play('child', 'Walk'); setTimeout(() => sc?.play('parent', 'StandUp', { once: true }), 300); sound.current.fx('ting'); setWinLine(a.after); setPhase('won'); return; }
    if (a.kind === 'comfort') { sc?.play('child', 'PickUp', { once: true }); sc?.burst('hearts', 'parent'); sound.current.fx('sad'); }
    if (a.kind === 'dance') { sc?.burst('confetti', 'parent'); sc?.burst('stars', 'child'); sc?.play('child', 'Jump'); sc?.play('parent', 'Victory'); sound.current.fx('cheer'); }
    if (a.kind === 'run') { sc?.burst('hearts', 'parent'); sc?.play('child', 'Run'); setTimeout(() => sc?.play('parent', 'Victory'), 600); sound.current.fx('cheer'); }
    if (a.kind === 'find') { sound.current.fx('ting'); world.current.scene?.holdEarth(false); next(); return; } // or taps the Earth itself
    setTimeout(next, 1400);
  }

  const downloadCertificate = () => {
    sound.current?.fx('cheer');
    sound.current?.fx('stardust');
    world.current.scene?.burst('confetti', 'child');
    world.current.scene?.burst('stars', 'parent');
    const c = document.createElement('canvas');
    c.width = 1600;
    c.height = 1100;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    // Background gradient: Elegant parchment ivory to cream
    const bg = ctx.createLinearGradient(0, 0, 1600, 1100);
    bg.addColorStop(0, '#fffbf0');
    bg.addColorStop(0.5, '#fef9ec');
    bg.addColorStop(1, '#fff6e5');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1600, 1100);

    // Decorative Borders
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 14;
    ctx.strokeRect(36, 36, 1600 - 72, 1100 - 72);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.strokeRect(56, 56, 1600 - 112, 1100 - 112);

    // Corner decorative rosettes
    const corners = [
      [56, 56],
      [1600 - 56, 56],
      [56, 1100 - 56],
      [1600 - 56, 1100 - 56],
    ];
    ctx.fillStyle = '#b45309';
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Top Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e3a8a';
    ctx.font = '700 36px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? '🚀 নাসা স্পেস অ্যাপস চ্যালেঞ্জ ২০২৬' : '🚀 NASA SPACE APPS CHALLENGE 2026', 800, 130);

    ctx.fillStyle = '#059669';
    ctx.font = '600 28px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? 'AgroVision · তারা আর স্বপ্নের মাঠ' : 'AgroVision · Tara and the Dream Fields', 800, 175);

    // Certificate Title
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 56px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? 'খুদে তারা-কৃষিবিজ্ঞানী সম্মাননা সনদ' : 'Junior Star-Farmer Award of Excellence', 800, 260);

    // Subtitle
    ctx.fillStyle = '#4b5563';
    ctx.font = '500 26px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? 'গর্বের সাথে এই সম্মাননা সনদ প্রদান করা হচ্ছে:' : 'This certificate of achievement is proudly presented to:', 800, 315);

    // Child's Name in Large Display Typography
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 74px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(L(dream.child.name), 800, 410);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(420, 435);
    ctx.lineTo(1180, 435);
    ctx.stroke();

    // Achievement Description
    ctx.fillStyle = '#334155';
    ctx.font = '500 28px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    const descLine1 = lang === 'bn'
      ? 'নাসার উপগ্রহ (GPM, MODIS, Landsat, ECOSTRESS, SMAP) দিয়ে মেঘ চেনা, সবুজ চাদর,'
      : 'For outstanding curiosity and success in satellite cloud-spotting, soil-cover protection,';
    const descLine2 = lang === 'bn'
      ? 'ফসলের স্বাস্থ্য স্ক্যান, রোদের উত্তাপ প্রশমন ও পরিমিত পানির সুরক্ষায় অসামান্য মেধার স্বীকৃতিস্বরূপ।'
      : 'Landsat NDVI scanning, heatwave cooling, and optimal water-balance stewardship in Tara\'s Dream Farm.';
    ctx.fillText(descLine1, 800, 495);
    ctx.fillText(descLine2, 800, 540);

    // Stars & Badges Section
    const starCount = Object.values(stars).filter(Boolean).length;
    const starString = '⭐ '.repeat(Math.max(1, starCount)).trim();
    ctx.font = '40px system-ui';
    ctx.fillText(starString, 800, 615);

    const earnedBadges = badgesFor(stars);
    const badgeText = earnedBadges.map((b) => `🏅 ${L(BADGES[b])}`).join('    ');
    ctx.fillStyle = '#92400e';
    ctx.font = '600 24px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(badgeText, 800, 665);

    // Golden Official Seal on the center-bottom
    const sealX = 800, sealY = 820;
    ctx.save();
    ctx.beginPath();
    ctx.arc(sealX, sealY, 68, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 16px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? '★ নাসা অনুমোদিত ★' : '★ OFFICIAL NASA ★', sealX, sealY - 20);
    ctx.font = 'bold 22px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? 'স্পেস অ্যাপস' : 'SPACE APPS', sealX, sealY + 8);
    ctx.font = 'bold 16px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? '★ ২০২৬ সিল ★' : '★ 2026 SEAL ★', sealX, sealY + 32);
    ctx.restore();

    // Signatures
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(260, 890);
    ctx.lineTo(540, 890);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? 'তারা (নাসা উপগ্রহ) 🛰️' : 'Tara (NASA Satellite) 🛰️', 400, 925);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 20px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? 'প্রধান গবেষক ও পথপ্রদর্শক' : 'Lead Explorer & Guide', 400, 955);

    ctx.beginPath();
    ctx.moveTo(1060, 890);
    ctx.lineTo(1340, 890);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? 'উপসহকারী কৃষি কর্মকর্তা 🏛️' : 'Sub-Assistant Agriculture Officer 🏛️', 1200, 925);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 20px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? 'কৃষি সম্প্রসারণ অধিদপ্তর' : 'Department of Agricultural Extension', 1200, 955);

    const certId = `NASA-FS360-${Date.now().toString(36).toUpperCase()}`;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? `সনদ আইডি: ${certId} · AgroVision` : `Certificate ID: ${certId} · AgroVision`, 800, 1030);

    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NASA-Junior-Star-Farmer-${dream.child.name.en || 'Award'}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  };
  function pump(on) {
    const sc = world.current.scene;
    clearInterval(pumpTimer.current);
    if (!on) return;
    sound.current.fx('splash');
    pumpTimer.current = setInterval(() => setHud((h) => {
      const water = Math.min(100, h.water + 2);
      sc?.setWater(water);
      if (water >= WATER_BAND[0] && water <= WATER_BAND[1] && Math.random() < 0.22) {
        sound.current.fx('ribbit');
      }
      return { ...h, water };
    }), 90);
  }

  const vrEnter = async (mode) => {
    const r = world.current.scene?.renderer;
    if (!r || !navigator.xr) return;
    const opts = mode === 'immersive-ar' ? { optionalFeatures: ['dom-overlay', 'local-floor'], domOverlay: { root: overlay.current } } : { optionalFeatures: ['local-floor'] };
    try { const session = await navigator.xr.requestSession(mode, opts); r.xr.setReferenceSpaceType('local-floor'); await r.xr.setSession(session); setRead(true); } catch { /* the device said no */ }
  };

  const grey = moodName === 'sad';
  return (
    <div data-testid="kids-dream-overlay" onPointerMove={onPointerSparkle} className="fixed inset-0 z-[120] bg-black select-none">
      <div ref={host} className={`absolute inset-0 transition-[filter] duration-1000 ${grey ? 'saturate-[.35]' : ''}`} />
      {sparkles.map((s) => (
        <span
          key={s.id}
          aria-hidden="true"
          className="pointer-events-none fixed z-50 text-[18px] animate-ping opacity-80"
          style={{ left: s.x - 9, top: s.y - 9 }}
        >
          {s.ch}
        </span>
      ))}
      <div ref={overlay} className="pointer-events-none absolute inset-0 flex flex-col">
        {/* top bar */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 p-3">
          <button type="button" onClick={onExit} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow" aria-label={T('বেরিয়ে যাও', 'Leave the dream')}><ArrowLeft size={20} /></button>
          <div className="rounded-full bg-white/90 px-4 py-2 text-[15px] font-bold shadow">{L(dream.child.name)} · {L(scene.title)}</div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'set', patch: { lang: lang === 'bn' ? 'en' : 'bn' } })}
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-[14px] font-bold shadow transition hover:bg-white active:scale-95 cursor-pointer text-ink"
              aria-label={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
              title={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
            >
              <Languages size={17} className="text-primary-700" />
              <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-[15px] font-bold shadow"><Star size={17} className="fill-yellow-400 text-yellow-500" />{lang === 'bn' ? String(totalStars(stars)).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]) : totalStars(stars)}</span>
            <button type="button" onClick={() => setRead(!read)} aria-pressed={read} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow" aria-label={T('পড়ে শোনাও', 'Read aloud')} title={noVoice ? T('এই যন্ত্রে বাংলা কণ্ঠ নেই; বড়দের পড়ে শোনাতে বলো', 'This device has no Bangla voice; ask a grown-up to read aloud') : undefined}>{read ? <Mic size={19} /> : <Mic size={19} className="opacity-40" />}</button>
            <button type="button" onClick={() => setMuted(!muted)} aria-pressed={muted} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow" aria-label={T('গান বন্ধ/চালু', 'Music on or off')}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
            {xr.vr && <button type="button" onClick={() => vrEnter('immersive-vr')} className="flex h-11 items-center gap-1.5 rounded-full bg-primary-700 px-4 font-bold text-white shadow"><Glasses size={18} />VR</button>}
            {xr.ar && <button type="button" onClick={() => vrEnter('immersive-ar')} className="flex h-11 items-center gap-1.5 rounded-full bg-primary-700 px-4 font-bold text-white shadow"><Smartphone size={18} />AR</button>}
          </div>
        </div>

        {!ready && <div className="m-auto rounded-2xl bg-white/90 px-6 py-4 text-[17px] font-semibold">{T('স্বপ্ন শুরু হচ্ছে…', 'The dream is starting…')}</div>}

        {/* game HUD */}
        {ready && phase === 'game' && (
          <div className="pointer-events-auto mx-auto mt-2 rounded-2xl bg-white/95 px-5 py-3 text-center shadow-lg">
            {scene.game === 'clouds' && <p className="text-[17px] font-bold">☁️ {T('কালো মেঘে চাপো!', 'Tap the dark clouds!')} · ⛈️ {num(hud.dark, lang)}/{num(5, lang)} · ⏱ {num(hud.time, lang)}</p>}
            {scene.game === 'blanket' && <p className="text-[17px] font-bold">🌱 {T('বাদামি জমিতে চাপো, ছাগলটাকে তাড়াও!', 'Tap the brown plots, shoo the goat!')} · 🐐 {num(hud.eaten, lang)} · ⏱ {num(hud.time, lang)}</p>}
            {scene.game === 'health' && (
              <div className="w-[300px] sm:w-[350px]">
                <p className="text-[16px] font-bold text-emerald-900">🛰️ {T('ল্যান্ডস্যাট ইনফ্রারেড স্ক্যানার', 'Landsat Infrared Scanner')}</p>
                <p className="mt-0.5 text-[12.5px] text-ink/75">{T('হলুদ বা দুর্বল গাছে চাপো, সবুজ সুস্থ বানাও!', 'Tap yellow/stressed plants to heal with green!')}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-amber-100 ring-1 ring-amber-300/60">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-lime-500 to-emerald-500 transition-all duration-300" style={{ width: `${Math.min(100, (hud.healed / (hud.totalHealth || 6)) * 100)}%` }} />
                  </div>
                  <span className="font-mono text-[13px] font-bold text-emerald-800 tabular">{num(hud.healed, lang)}/{num(hud.totalHealth || 6, lang)} · ⏱{num(hud.time, lang)}</span>
                </div>
              </div>
            )}
            {scene.game === 'cool' && (
              <div className="w-[300px] sm:w-[350px]">
                <div className="flex items-center justify-between text-[15px] font-bold">
                  <span className="flex items-center gap-1 text-amber-900">🌡️ {T('ইকোস্ট্রেস তাপ প্রশমন', 'ECOSTRESS Heat Cooling')}</span>
                  <span className="tabular text-[13px] text-muted">⏱ {num(hud.time, lang)}{T('সে', 's')}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[12.5px]">
                  <span className={hud.temp <= 30 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>{T(`তাপমাত্রা: ${num(hud.temp, 'bn')}°C`, `Temp: ${hud.temp} °C`)}</span>
                  <span className="text-emerald-700 font-semibold text-[11.5px]">{T('লক্ষ্য: ≤ ৩০°C (নিরাপদ)', 'Goal: ≤ 30 °C (Safe)')}</span>
                </div>
                <div className="relative mt-1.5 h-3.5 overflow-hidden rounded-full bg-sky-100 ring-1 ring-sky-300/60">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(10, ((hud.temp - 20) / (45 - 20)) * 100))}%`, backgroundColor: hud.temp <= 30 ? '#10b981' : hud.temp <= 36 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => { world.current.scene?.dropMist?.(); sound.current?.fx('splash'); setHud((h) => ({ ...h, temp: Math.max(24, h.temp - 3) })); }} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-sky-600 py-2 text-[13px] font-bold text-white shadow active:scale-95 transition">
                    <span>💧</span>{T('ঠান্ডা কুয়াশা ও ছায়া ঢালো', 'Drop Cool Mist & Shade')}
                  </button>
                </div>
              </div>
            )}
            {scene.game === 'water' && (
              <div className="w-[280px]">
                <p className="text-[17px] font-bold">💧 {T('সবুজ দাগে থামো', 'Stop in the green')}</p>
                <div className="relative mt-2 h-5 overflow-hidden rounded-full bg-amber-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hud.water} aria-label={T('মাটির পানি', 'Soil water')}>
                  <div className="absolute inset-y-0 bg-primary-200" style={{ left: `${WATER_BAND[0]}%`, width: `${WATER_BAND[1] - WATER_BAND[0]}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-sky-500/80 transition-[width]" style={{ width: `${hud.water}%` }} />
                </div>
                {hud.water >= WATER_BAND[0] && hud.water <= WATER_BAND[1] && (
                  <p className="mt-1.5 text-[12.5px] font-bold text-emerald-700 animate-pulse">🐸 {T('চমৎকার! ঠিক মাপে পানি!', 'Perfect water!')}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button type="button" onPointerDown={() => pump(true)} onPointerUp={() => pump(false)} onPointerLeave={() => pump(false)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-[16px] font-bold text-white active:scale-95"><Droplets size={18} />{T('চেপে ধরে পাম্প', 'Hold to pump')}</button>
                  <button type="button" onClick={finishGame} className="rounded-xl bg-primary-700 px-4 py-3 text-[16px] font-bold text-white">{T('থামো!', 'Stop!')}</button>
                </div>
              </div>
            )}
            {scene.game !== 'water' && <button type="button" onClick={finishGame} className="mt-1 text-[13px] font-semibold text-primary-800 underline">{T('শেষ করো', 'Finish')}</button>}
          </div>
        )}

        {/* the dialogue */}
        {ready && !done && line && phase !== 'game' && (
          <div className="pointer-events-auto mx-auto mb-4 mt-auto w-[min(720px,calc(100%-24px))]">
            <div className={`flex items-start gap-3 rounded-[26px] p-4 shadow-2xl ring-2 ${WHO[line.who].bg} ${WHO[line.who].ring} ${moodName === 'joy' ? 'animate-[pulse_1.6s_ease-in-out_2]' : ''}`}>
              <div className="relative">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-[30px] shadow-sm" aria-hidden="true">{FACE[line.who] ?? (line.who === 'child' ? (dream.child.girl ? '👧🏽' : '👦🏽') : dream.parent.woman ? '👩🏽‍🌾' : '👨🏽‍🌾')}</span>
                {read && <span className="absolute -bottom-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600 text-[8px] text-white items-center justify-center">🔊</span></span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold uppercase tracking-wide text-ink/60">{line.who === 'tara' ? T('তারা', 'Tara') : line.who === 'frog' ? T('ব্যাঙ', 'Frog') : line.who === 'child' ? L(dream.child.name) : L(dream.parent.name)}</p>
                <p className="mt-0.5 text-[19px] font-semibold leading-8 text-ink sm:text-[21px]">{L(line)}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              {phase === 'action'
                ? <button type="button" onClick={act} className="flex items-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 text-[18px] font-bold text-white shadow-xl active:scale-95"><Heart size={20} className="fill-white" />{L(scene.action.prompt)}</button>
                : <button type="button" onClick={next} className="flex items-center gap-2 rounded-full bg-primary-700 px-6 py-3.5 text-[18px] font-bold text-white shadow-xl active:scale-95">{scene.kind === 'game' && phase === 'lines' && n >= scene.lines.length - 1 ? T('খেলা শুরু!', 'Let’s play!') : T('এরপর', 'Next')}<ArrowRight size={20} /></button>}
            </div>
          </div>
        )}

        {done && (
          <div className="relative pointer-events-auto m-auto w-[min(560px,calc(100%-24px))] rounded-[28px] bg-white p-6 text-center shadow-2xl animate-[fadeIn_0.5s_ease-out]">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="confetti pointer-events-none"
                style={{
                  '--a': `${(i / 24) * 360}deg`,
                  '--r': `${110 + (i % 5) * 30}px`,
                  background: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'][i % 6],
                  left: '50%',
                  top: '18%',
                }}
              />
            ))}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-[36px] shadow-inner ring-4 ring-amber-300/60" aria-hidden="true">🌅</div>
            <h2 className="mt-3 text-[26px] font-bold text-ink">{T(`শুভ সকাল, ${L(dream.child.name)}!`, `Good morning, ${L(dream.child.name)}!`)}</h2>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-4 py-1.5 text-[14.5px] font-bold text-amber-800 ring-1 ring-amber-300">
              <span>⭐</span>
              <span>{T(`মোট ${num(Object.values(stars).filter(Boolean).length, 'bn')}টি তারা অর্জিত!`, `${Object.values(stars).filter(Boolean).length} stars collected!`)}</span>
              <span>✨</span>
            </div>

            {/* NASA Space Apps Junior Star-Farmer Award Card */}
            <div className="mt-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-4 text-left shadow-2xs">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-amber-800">
                  <span>🚀</span> {T('নাসা স্পেস অ্যাপস শিশু সনদ', 'NASA Space Apps Junior Award')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'set', patch: { lang: lang === 'bn' ? 'en' : 'bn' } })}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-amber-950 shadow-xs hover:bg-amber-100 transition cursor-pointer"
                    title={T('ভাষা পরিবর্তন করুন', 'Change language')}
                  >
                    <Languages size={11} className="text-amber-800" />
                    <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
                  </button>
                  <span className="rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-950">
                    {T('খুদে তারা-বিজ্ঞানী', 'Junior Star Scientist')}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[14px] font-bold text-slate-800">
                {T(`${L(dream.child.name)} স্বপ্নের মাঠের পুরো অভিযান শেষ করেছে!`, `${L(dream.child.name)} finished the whole Dream Fields adventure!`)}
              </p>
              <p className="text-[12px] text-slate-600">
                {T('নাসার উপগ্রহের চোখ দিয়ে মেঘ চেনা, মাটির সবুজ চাদর এবং পরিমিত পানি দেওয়ার কৌশল শিখেছে।', 'Learned satellite-based cloud spotting, soil blankets, and optimal water balance.')}
              </p>
              <button
                type="button"
                onClick={downloadCertificate}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-[13.5px] font-bold text-white shadow-sm hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] transition"
              >
                <Download size={16} />
                {T('সনদপত্র ডাউনলোড করুন (PNG)', 'Download Certificate (PNG)')}
              </button>
            </div>

            <p className="mt-3 text-[15px] font-semibold text-ink/75">{T('স্বপ্নে তুমি যা শিখলে:', 'What you learned in your dream:')}</p>
            <ul className="mt-2.5 flex flex-wrap justify-center gap-2">
              {badgesFor(stars).map((b) => <li key={b} className="flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 px-4 py-2 text-[14.5px] font-bold text-yellow-900 shadow-sm ring-1 ring-yellow-400">🏅 {L(BADGES[b])}</li>)}
            </ul>
            <p className="mt-4 rounded-2xl bg-primary-50 p-3.5 text-[14.5px] leading-7 text-primary-900 shadow-sm ring-1 ring-primary-200/50">{T('বাবা-মা বা বড়দের সঙ্গে এগ্রোভিশন খুলে দেখো: তোমাদের মাঠের জন্য নাসার উপগ্রহ কী বলছে। আর কৃষি কর্মকর্তার সঙ্গে কথা বলতে বলো।', 'Open AgroVision with your parents or grown-ups: see what NASA’s satellites say about your field. And ask them to talk to the agriculture officer.')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to="/farmer" className="rounded-full bg-primary-700 px-5 py-3 text-[16px] font-bold text-white shadow-md hover:bg-primary-800">{T('বড়দের অ্যাপ খোলো', 'Open the grown-ups’ app')}</Link>
              <button type="button" onClick={() => { setDone(false); setK(0); setN(0); setPhase('lines'); setStars({}); }} className="flex items-center gap-1.5 rounded-full bg-white px-5 py-3 text-[16px] font-bold shadow-sm ring-1 ring-border hover:bg-slate-50"><RotateCcw size={17} />{T('আবার স্বপ্ন দেখো', 'Dream again')}</button>
              <button type="button" onClick={onExit} className="rounded-full bg-white px-5 py-3 text-[16px] font-bold shadow-sm ring-1 ring-border hover:bg-slate-50">{T('অন্য শিশু', 'Another child')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

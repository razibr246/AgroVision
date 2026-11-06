// The play-to-learn hub, laid out for someone arriving for the first time: where to start (three ways in, by time
// and by who is playing), then two clear sections: "Play as a farmer" (the 3D people games: the grown-ups' season and
// the children's dream, with the character gallery) and "Stories and challenges" (decision games on real NASA
// weather), then the science lab. Names, audiences and times come from data/games.js.
import { Link } from 'react-router-dom';
import { Swords, Sprout, ArrowRight, BookOpen, Gamepad2, MapPinned, Sparkles, Users, Droplets, Bug, CloudLightning, Coins, Clock, UserRound, Compass, FlaskConical } from 'lucide-react';
import Photo from '../../components/Photo';
import { IMAGES } from '../../assets/images';
import { useStore } from '../../store';
import BiomechanicsLab from '../../components/game/BiomechanicsLab';
import usePageMeta from '../../components/usePageMeta';
import { GAMES, SECTIONS, START_HERE } from '../../data/games';

const ICON = { farm: Gamepad2, kids: Sparkles, people: Users, saga: BookOpen, stories: MapPinned, play: Swords };
const PHOTO = { farm: 'farmGame', kids: 'taraDream', people: 'meetFarmers', saga: 'dhamraiBridge', stories: 'sevenFields', play: 'seasonShowdown' };

function Chips({ g }) {
  const { L } = useStore();
  return (
    <span className="flex flex-wrap gap-1.5 text-[12.5px] font-semibold">
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-primary-800"><UserRound size={13} />{L(g.audience)}</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-paddy-50 px-2.5 py-1 text-paddy-700"><Clock size={13} />{L(g.time)}</span>
    </span>
  );
}

function Card({ id, text, n }) {
  const { T, L } = useStore();
  const g = GAMES[id], Icon = ICON[id];
  return (
    <Link to={g.to} style={{ '--n': n }} className="tool-card tool-deal glass flat group flex flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/80 shadow-md backdrop-blur-md transition-all duration-300 hover:border-primary-400/60 hover:shadow-2xl">
      <div className="relative aspect-[16/9] overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-[1.2s] ease-[var(--ease-smooth)] group-hover:scale-110"><Photo name={PHOTO[id]} fill sizes="(min-width: 768px) 600px, 100vw" decorative /></div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,14,0)_30%,rgba(8,26,14,.8)_100%)]" />
        {IMAGES[PHOTO[id]]?.credit && <span className="absolute right-3 top-3 max-w-[75%] truncate rounded-full bg-black/35 px-2.5 py-0.5 text-[11px] font-medium text-white/85 backdrop-blur">{IMAGES[PHOTO[id]].credit.ai ? T('এআই ছবি', 'AI image') : <>{T('ছবি', 'Image')}: {IMAGES[PHOTO[id]].credit.artist} · {IMAGES[PHOTO[id]].credit.license}</>}</span>}
        <span className="absolute bottom-4 left-5 grid h-14 w-14 place-items-center rounded-2xl bg-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_8px_20px_rgba(0,0,0,.3)] backdrop-blur-xl transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-primary-600/70"><Icon size={26} /></span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-[13px] font-semibold tracking-tight text-primary-700">{L(g.kind)}</p>
        <h3 className="font-display mt-1 text-[26px] font-bold tracking-tight text-ink transition-colors group-hover:text-primary-800">{L(g.name)}</h3>
        <div className="mt-2"><Chips g={g} /></div>
        <p className="mt-3 text-[15px] leading-7 text-ink/75">{text}</p>
        <span className="mt-auto inline-flex items-center gap-2 pt-4 font-semibold text-primary-700 transition-colors group-hover:text-primary-800">{T('খেলুন', 'Play')}<ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1.5" /></span>
      </div>
    </Link>
  );
}

function SectionHead({ id, icon: Icon, n }) {
  const { L, T } = useStore();
  const sec = SECTIONS.find((x) => x.id === id);
  return (
    <div className="mt-14 flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-700 text-white shadow-md"><Icon size={22} /></span>
      <div>
        <p className="text-[13px] font-bold uppercase tracking-wide text-primary-700">{T(`ভাগ ${n}`, `Part ${n}`)}</p>
        <h2 id={`sec-${id}`} className="text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">{L(sec.name)}</h2>
        <p className="mt-1 max-w-2xl text-[15.5px] leading-7 text-ink/70">{L(sec.line)}</p>
      </div>
    </div>
  );
}

export default function Games() {
  const { T, L } = useStore();
  usePageMeta(T('খেলে শিখুন', 'Learn by playing'), 'Climate-smart farming games built on real NASA data: Harvest Horizon (3D farm), Tara’s Dream Farm (kids, VR/AR), The Ten-Year Inheritance, Seven Fields Challenge and Season Showdown.');
  const farm = GAMES.farm;
  return (
    <div className="page-shell pb-24 pt-[110px] sm:pt-[124px]">
      <div className="hero-rise max-w-3xl">
        <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><BookOpen size={15} />{T('খেলে শিখুন', 'Learn by playing')}</p>
        <h1 className="mt-5 text-[44px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[62px]">
          <span className="block">{T('খেলতে খেলতে', 'Learn the field')}</span>
          <span className="block bg-[linear-gradient(100deg,#245a28_0%,#43863a_45%,#237479_100%)] bg-clip-text pb-2 text-transparent">{T('মাঠ চিনুন।', 'by playing.')}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[18px] leading-[1.65] text-ink/70">{T('ছয়টি খেলা, দুই ভাগে, একটাই শিক্ষা: বিপদ আসার আগে জানলে ফসল বাঁচে। সব খেলা আসল নাসা আবহাওয়ার ওপর।', 'Six games in two parts, one lesson: know before trouble arrives and the crop survives. Every game runs on real NASA weather.')}</p>
      </div>

      {/* Where to start: three ways in for someone who has just arrived */}
      <section aria-labelledby="start-here" className="mt-8 rounded-[28px] border border-primary-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <h2 id="start-here" className="flex items-center gap-2 text-[18px] font-bold"><Compass size={19} className="text-primary-700" />{T('কোথা থেকে শুরু করবেন?', 'Where to start?')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {START_HERE.map(({ game, why }) => {
            const g = GAMES[game], Icon = ICON[game];
            return (
              <Link key={game} to={g.to} className="lift group flex items-center gap-3 rounded-2xl border border-primary-100 bg-canvas/70 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-800"><Icon size={21} /></span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-muted">{L(why)}</span>
                  <span className="block text-[16.5px] font-bold leading-6 text-ink">{L(g.name)}</span>
                  <span className="block text-[12.5px] text-primary-700">{L(g.time)}</span>
                </span>
                <ArrowRight size={17} className="ml-auto shrink-0 text-primary-600 transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] text-muted">{T('নিচে দুই ভাগে সব খেলা: ১. কৃষক হয়ে ৩D খামারে খেলুন, ২. গল্প আর চ্যালেঞ্জ।', 'All the games are below in two parts: 1. play as a farmer on a 3D farm, 2. stories and challenges.')}</p>
      </section>

      {/* Part 1: the people games */}
      <SectionHead id="people" icon={Gamepad2} n={T('১', '1')} />
      <section aria-labelledby="sec-people" className="relative isolate mt-5 overflow-hidden rounded-[30px] bg-primary-950 text-white shadow-[var(--shadow-lift)]">
        <div className="absolute inset-0 -z-10 opacity-45"><Photo name="farmGame" fill sizes="100vw" decorative /></div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-950 via-primary-950/90 to-primary-950/45" />
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end lg:p-10">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-paddy-300 px-3 py-1 text-[13px] font-bold text-primary-950"><Gamepad2 size={15} />{L(farm.kind)} · {L(farm.time)}</p>
            <h3 className="font-display mt-3 text-[30px] font-bold leading-tight sm:text-[40px]">{T(`${farm.name.bn}: সিদ্ধান্ত নিন, ফল দেখুন`, `${farm.name.en}: make the call, live with the season`)}</h3>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-white/80">{T('বাংলাদেশ, প্রতিবেশী পাঁচ দেশ, যুক্তরাষ্ট্র, ব্রাজিল আর স্পেনের ১৫ জন কৃষকের একজন হয়ে বীজ কিনুন, জমি লাগান, পানি ও পোকা সামলান, সতর্কতা পেলে ফসল বাঁচান। শেষে আপনার ফসলচক্র আর শেখা বিষয়গুলোর হিসাব পাবেন।', 'Be one of 15 farmers from Bangladesh, five neighbouring countries, the USA, Brazil and Spain. Buy seed, plant, manage water and pests, and protect the crop when warnings arrive. Finish with a rotation summary and a review of what you learned.')}</p>
            <ul className="mt-4 grid gap-2 text-[13.5px] text-white/85 sm:grid-cols-2">
              {[[Droplets, T('পানি ভাগ করে ব্যবহার', 'Use limited water well')], [Bug, T('পোকা দেখে ব্যবস্থা', 'Respond to pest reports')], [CloudLightning, T('ঝড়ে নিরাপদ আশ্রয়', 'Reach shelter before storms')], [Coins, T('ফসল তুলে বাজারে বিক্রি', 'Harvest and sell at market')]].map(([Icon, text]) => <li key={text} className="flex items-center gap-2"><Icon size={16} className="shrink-0 text-paddy-300" />{text}</li>)}
            </ul>
            <p className="mt-4 text-[12.5px] text-white/70">{T('ফোনে: বাঁয়ের চাকা দিয়ে হাঁটুন, ডানে টেনে দেখুন, কাজের বোতাম চাপুন। কম্পিউটারে: WASD হাঁটা · E/F/Space কাজ।', 'Phone: move with the left stick, drag on the right to look, tap Act. Computer: WASD to move · E/F/Space to act.')}</p>
          </div>
          <Link to={farm.to} className="btn-gloss inline-flex items-center justify-center gap-2 self-start rounded-full px-6 py-3.5 font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[.98] lg:self-end">{T('মাঠে নামুন', 'Enter the field')}<ArrowRight size={18} /></Link>
        </div>
      </section>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card id="kids" n={0} text={T('কৃষক বাবা-মায়ের চিন্তা শুনে ঘুমিয়ে পড়া শিশু স্বপ্নে নাসার উপগ্রহ "তারা"-র সঙ্গে আকাশে ওড়ে: মেঘ ধরে, খালি মাটিতে সবুজ কম্বল দেয়, ঠিক মাপে পানি দেয়, আর দুই দরজা পেরিয়ে দেখে আগে জানলে কী বদলায়। হাসি, কান্না আর সকালের আনন্দ।', 'A child falls asleep hearing the family worry, and in a dream flies with Tara, a NASA satellite: catching clouds, giving bare soil a green blanket, watering just right, and walking through two doors to see what changes when you know in time. Laughter, tears and a happy morning.')} />
        <Card id="people" n={1} text={T('প্রত্যেক কৃষক নিজের পোশাকে, নিজের সন্তানের পাশে, মঞ্চের আলোয়: কোথায় চাষ করেন, কোন ঝড়ের ভয়। এখান থেকেই বড়দের খেলা বা শিশুর স্বপ্ন শুরু করুন।', 'Each farmer in their own clothes, beside their own child, under stage lights: where they farm and which storm they fear. Start the grown-ups’ game or the child’s dream from here.')} />
      </div>

      {/* Part 2: stories and challenges */}
      <SectionHead id="stories" icon={BookOpen} n={T('২', '2')} />
      <Link to={GAMES.saga.to} aria-labelledby="sec-stories" className="lift group relative isolate mt-5 flex min-h-[320px] items-end overflow-hidden rounded-[32px] bg-primary-950 text-white shadow-[var(--shadow-lift)]">
        <div className="absolute inset-0 -z-10 transition-transform duration-[1.4s] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"><Photo name="dhamraiBridge" fill sizes="100vw" decorative /></div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(8,20,12,.92)_0%,rgba(8,20,12,.6)_55%,rgba(8,20,12,.15)_100%)]" />
        <div className="max-w-2xl p-7 sm:p-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-paddy-300 px-3 py-1 text-[13px] font-bold text-primary-950"><BookOpen size={14} />{L(GAMES.saga.kind)} · {L(GAMES.saga.time)}</p>
          <h3 className="font-display mt-3 text-[34px] font-bold leading-tight sm:text-[48px]">{L(GAMES.saga.name)}</h3>
          <p className="mt-2 text-[16px] leading-7 text-white/85">{T('অসুস্থ বাবার দুই বিঘা জমি আর চল্লিশ বছরের পুরোনো খাতা এখন আপনার। ধামরাইয়ের তিনটি আসল নাসা-আবহাওয়ার মৌসুম, পরিবার আর গ্রামের কঠিন সিদ্ধান্ত, আর ২০৪৫ সালে আপনার মেয়ে পাবে যা আপনি রেখে যাবেন।', 'Your ailing father’s two bigha and forty-year-old notebook are yours now. Three seasons of Dhamrai’s real NASA weather, hard choices for family and village, and in 2045 your daughter inherits what you leave.')}</p>
          <span className="mt-4 inline-flex items-center gap-2 font-semibold text-paddy-300">{T('গল্প শুরু করুন', 'Begin the story')}<ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" /></span>
        </div>
      </Link>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card id="play" n={0} text={T('এক রবি মৌসুমের ছয়টি সত্যিকারের বিপদ। প্রতিবার বেছে নিন — আগের অভ্যাস, নাকি FieldShift-এর ঠিক হাতিয়ার। প্রথমবার এলে এখান থেকেই শুরু করুন।', 'Six real problems across one Rabi season. Each time choose — the old habit, or the right FieldShift tool. If you are new, start here.')} />
        <Card id="stories" n={1} text={T('সিলেটের পাহাড়ি ঢল, খুলনার লবণ, বরিশালের জোয়ার, রংপুরের কুয়াশা-ব্লাইট, চট্টগ্রামের মেঘভাঙা বৃষ্টি। আপনার সিদ্ধান্ত চলে সেই এলাকার একটি আসল পুরোনো বছরে।', 'Sylhet’s flash floods, Khulna’s salt, Barishal’s tides, Rangpur’s fog and blight, Chattogram’s cloudbursts. Your choices are played through a real past year of that place.')} />
      </div>

      {/* The science lab, for the curious */}
      <div className="mt-14 flex items-center gap-2 text-[22px] font-semibold"><FlaskConical size={22} className="text-primary-700" />{T('বিজ্ঞানের খেলাঘর: মাটি আর শরীরের ভৌতবিদ্যা', 'Science lab: soil and body physics')}</div>
      <div id="biomechanics">
        <BiomechanicsLab />
      </div>

      <p className="mt-8 flex items-center gap-2 text-[13.5px] text-muted"><Sprout size={15} />{T('খেলার টাকা আর সংখ্যা শেখানোর জন্য বানানো, আসল হিসাব নয়।', 'Money and numbers in the games are for learning, not real estimates.')}</p>
    </div>
  );
}

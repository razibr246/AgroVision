// "Tried in the field": what the team reports from the Dhamrai session of 4 November 2026 (an agriculture officer,
// five farmers, three game players and two children), and the team behind the app. The figures are the team's own
// account of that day, kept exactly as reported; the tasks and answers were not written down, which the section says.
// The same record is in docs/USER_TESTING.md and docs/REVIEW_LOG.md.
import { ShieldCheck, Sprout, Swords, Sparkles, Star, Users } from 'lucide-react';
import { useStore } from '../../store';
import { num } from '../../engine/dates';

const Stars = ({ n = 5 }) => (
  <span className="inline-flex gap-0.5" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => <Star key={i} size={15} className="fill-amber-400 text-amber-400" />)}
  </span>
);

export const TEAM = [
  { name: 'MD Jabir Hossain Sadi', role: { bn: 'দলনেতা', en: 'Team lead' }, did: { bn: 'পুরো দল পরিচালনা', en: 'Leads the whole team' } },
  { name: 'Razib Miah', role: { bn: 'গবেষক ও AI প্রকৌশলী', en: 'Researcher and AI engineer' }, did: { bn: 'ওয়েব ও গেম ডেভেলপার', en: 'Web and game developer' } },
  { name: 'MD. Rashedul Islam Shihab', role: { bn: 'ডেভেলপার', en: 'Developer' } },
  { name: 'Minhajul Islam', role: { bn: 'অ্যাপ ডেভেলপার', en: 'App developer' } },
  { name: 'Meherun Necha Borsha', role: { bn: 'গল্পকার', en: 'Storyteller' } },
  { name: 'Md Ariful Islam Abir', role: { bn: 'ভিডিও সম্পাদক', en: 'Video editor' } },
];

export default function FieldReview() {
  const { T, L } = useStore();
  const cards = [
    { Icon: ShieldCheck, tone: 'from-primary-100 to-primary-50 text-primary-700', big: T('১০০/১০০', '100/100'), who: T('ধামরাই উপজেলার কৃষি কর্মকর্তা', 'Agriculture officer, Dhamrai upazila'), said: T('অ্যাপ দেখে বললেন, সব ঠিক আছে।', 'Went through the app and said everything is okay.') },
    { Icon: Sprout, tone: 'from-emerald-100 to-emerald-50 text-emerald-700', big: T(`${num(5, 'bn')} জন কৃষক`, '5 farmers'), who: T('ওয়েবসাইট আর অ্যাপ ব্যবহার করেছেন', 'Used the website and the app'), said: T('তাঁদের মত খুবই ইতিবাচক।', 'Their reviews were highly positive.') },
    { Icon: Swords, tone: 'from-amber-100 to-amber-50 text-amber-700', big: T(`${num(3, 'bn')} জন`, '3 players'), who: T('৩D খামারের খেলা খেলেছেন', 'Played the 3D farm game'), stars: 5 },
    { Icon: Sparkles, tone: 'from-sky-100 to-sky-50 text-sky-700', big: T(`${num(2, 'bn')}টি শিশু`, '2 children'), who: T('ছোটদের খেলা খেলেছে', 'Played the children’s game'), stars: 5 },
  ];
  return (
    <section id="reviews" className="scroll-mt-20 py-16 sm:py-20">
      <div className="page-shell">
        <div data-reveal className="max-w-3xl">
          <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><Users size={15} />{T('মাঠে ব্যবহার করে দেখা', 'Tried in the field')}</p>
          <h2 className="mt-4 text-[32px] font-bold sm:text-[40px]">{T('ধামরাইয়ে যাঁরা ব্যবহার করে দেখলেন', 'Who tried it in Dhamrai')}</h2>
          <p className="mt-3 text-[16.5px] leading-8 text-muted">{T('৪ নভেম্বর ২০২৬, ধামরাই: একজন কৃষি কর্মকর্তা, পাঁচজন কৃষক, আর খেলাগুলো খেলেছেন তিনজন বড় ও দুটি শিশু।', '4 November 2026, Dhamrai: an agriculture officer, five farmers, and three grown-ups and two children who played the games.')}</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ Icon, tone, big, who, said, stars }, i) => (
            <div key={i} data-reveal style={{ '--d': `${i * 80}ms` }} className="lift glass flat flex flex-col rounded-[24px] p-6">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${tone}`}><Icon size={21} /></span>
              <p className="font-display mt-4 text-[28px] font-bold leading-tight text-primary-950">{big}</p>
              <p className="mt-1 text-[15px] font-semibold leading-6">{who}</p>
              {said && <p className="mt-2 text-[14.5px] leading-6 text-muted">{said}</p>}
              {stars && <p className="mt-2 flex items-center gap-2 text-[14px] font-semibold text-muted"><Stars n={stars} />{T(`${num(stars, 'bn')} তারা`, `${stars} stars`)}</p>}
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13.5px] leading-6 text-muted">{T('দলের দেওয়া হিসাব; ৪ নভেম্বরের প্রত্যেকের উত্তর লিখে রাখা হয়নি।', 'As reported by the team; each person’s answers on 4 November were not written down.')}</p>
        <div data-reveal className="glass flat mt-4 rounded-[22px] p-5">
          <p className="text-[15.5px] font-semibold">{T('১২ নভেম্বর, ধামরাই: উত্তর লিখে রাখা সেশন', '12 November, Dhamrai: a session with the answers written down')}</p>
          <p className="mt-1.5 text-[14.5px] leading-7 text-muted">{T('তিনজন কৃষক আর কুল্লা ব্লকের উপসহকারী কৃষি কর্মকর্তা অ্যাপ চালিয়েছেন; প্রত্যেকে নিজের ভাষায় বলেছেন অ্যাপ কী বলছে আর কেন। একই দিন উপজেলা কৃষি অফিসার ফসলের নিয়মগুলো এক এক করে দেখে বোরোর গরমের সীমা ৩৫° থেকে ৩৬° সেলসিয়াস করতে বলেছেন, আর অ্যাপে তা-ই করা হয়েছে।', 'Three farmers and the Kulla block’s Sub-Assistant Agriculture Officer used the app; each said in their own words what it advised and why. The same day the Upazila Agriculture Officer went through the crop rules one by one and advised moving Boro’s heat limit from 35 °C to 36 °C, which the app now uses.')}</p>
          <p className="mt-2 text-[14px] italic leading-6 text-ink/75">{T('“আমন কাটার পর সরিষা ২৫শে নভেম্বরের পরে গেলে বোরোও দেরি হবে, এপ্রিল-মের গরমে পড়বে।” — সোমভাগের এক কৃষক', '“If mustard goes in after 25 November, the Boro is late too and meets the April–May heat.” — a farmer in Sombhag')}</p>
        </div>

        <div data-reveal className="glass flat mt-10 rounded-[26px] p-6 sm:p-8">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-primary-800"><Users size={17} />{T('দল BRM AstraX, বরিশাল', 'Team BRM AstraX, Barishal')}</p>
          <ul className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((m) => (
              <li key={m.name} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-700 text-[14px] font-bold text-white" aria-hidden="true">{m.name.replace(/^(MD\.?|Md)\s+/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}</span>
                <span className="min-w-0"><span className="block text-[15.5px] font-semibold leading-6">{m.name}</span><span className="block text-[14px] leading-6 text-muted">{L(m.role)}{m.did ? ` · ${L(m.did)}` : ''}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

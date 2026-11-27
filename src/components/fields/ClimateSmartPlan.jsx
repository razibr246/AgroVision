// The next two weeks at the field: when to water (14-day plan from engine/irrigationPlan.js), heat ahead at the
// crop's sensitive stage (engine/heatWatch.js) and a dry day for a urea top-dress. All numbers come from the engine.
import { useMemo } from 'react';
import { Droplets, ThermometerSun, Sprout } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Note, Tags, WhyButton } from '../ui';
import { planIrrigation, topdressDays, COST, HEAVY_TOPDRESS_MM } from '../../engine/irrigationPlan';
import { heatWatch } from '../../engine/heatWatch';
import { num, fmtDate, parseISO, bnDigits } from '../../engine/dates';

const HEAT_TONE = { breach: 'warn', near: 'gold', clear: 'ok' };

export default function ClimateSmartPlan({ fw, crop, plantT, wx, today }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const plan = useMemo(() => planIrrigation(fw), [fw]);
  const forecast = useMemo(() => (wx?.days ? wx.days.slice(wx.today + 1) : null), [wx]);
  const heat = useMemo(() => heatWatch({ crop, plantT, forecast, today }), [crop, plantT, forecast, today]);
  const urea = useMemo(() => topdressDays(forecast), [forecast]);
  if (!forecast) return null;
  const mm = (v) => `${num(v, lang, { dp: 0 })} ${T('মিমি', 'mm')}`;
  const day = (d) => fmtDate(parseISO(d), lang);
  const top = heat?.rules?.[0];

  return (
    <Card className="spotlight-card lift cv-auto p-5 sm:p-6" data-tour="today-two-weeks">
      <h2 className="text-[20px] font-bold">{T('আগামী দুই সপ্তাহ', 'The next two weeks')}</h2>
      <p className="mt-1 text-[13.5px] text-muted">{T('১৬ দিনের পূর্বাভাস আর আপনার জমির মাটির পানির হিসাব থেকে। প্রতিদিন নতুন করে হিসাব হয়।', 'From the 16-day forecast and your field’s soil water. It is worked out again every day.')}</p>

      {plan && (
        <div className="mt-4 rounded-2xl bg-canvas p-4">
          <div className="flex items-center gap-2 font-semibold"><Droplets size={18} className="text-sky-600" />{T('সেচের পরিকল্পনা', 'Watering plan')} <Tags list={['MODEL', 'RULE']} /></div>
          <p className="mt-2 text-[15px]">
            {plan.first
              ? T(`${day(plan.first.d)} তারিখে প্রায় ${bnDigits(Math.round(plan.first.grossMm))} মিমি সেচ দিন (জমিতে প্রায় ${bnDigits(Math.round(plan.first.grossMm * plan.m3PerMm))} ঘনমিটার)।`,
                `Water on ${day(plan.first.d)}, about ${Math.round(plan.first.grossMm)} mm (about ${Math.round(plan.first.grossMm * plan.m3PerMm)} m³ on the field).`)
              : T(`আগামী ${bnDigits(plan.days)} দিনে সেচ লাগবে না, যদি পূর্বাভাসের মতো বৃষ্টি হয়।`, `No watering needed in the next ${plan.days} days if the rain comes as forecast.`)}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[12.5px]">
            {[[T('এই পরিকল্পনা', 'This plan'), plan.best], [T('টান পড়লে সেচ', 'Water at stress point'), plan.compare.atRaw], [T('প্রতি ৭ দিনে', 'Every 7 days'), plan.compare.weekly]].map(([label, r], i) => (
              <div key={label} className={`rounded-xl p-2.5 ${i === 0 ? 'bg-sky-50 ring-1 ring-sky-200' : 'bg-white'}`}>
                <div className="text-muted">{label}</div>
                <div className="font-display mt-0.5 text-[17px] font-bold tabular">{mm(r.pumpedMm)}</div>
                <div className="text-muted">{T(`টানের দিন ${num(r.stressDays, 'bn', { dp: 1 })}`, `${num(r.stressDays, 'en', { dp: 1 })} stress days`)}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">{T('গড় হিসাব: বৃষ্টি পূর্বাভাসের মতো, অর্ধেক বা একদম না হলে কী হয়, তিনটিই ধরে।', 'Expected values, counting the rain arriving as forecast, half of it, or none.')}</p>
          <div className="mt-2"><WhyButton small payload={{ title: T('পরিকল্পনা কীভাবে হয়', 'How the plan is made'), tags: ['MODEL', 'RULE'], blocks: [
            { h: T('পদ্ধতি', 'Method'), lines: [T('প্রতিদিন দুটি পথ: অপেক্ষা, নাকি মাটি পুরো ভিজিয়ে দেওয়া। গতিশীল প্রোগ্রামিং (রিইনফোর্সমেন্ট লার্নিংয়ের পরিকল্পনা-রূপ) সব দিনের সব সম্ভাবনা হিসাব করে কম খরচের পথ বের করে; কাল আসল বৃষ্টি দেখে আবার বাছা যায়।', 'Each day there are two choices: wait, or refill the root zone. Dynamic programming (the planning form of reinforcement learning) works through every day and every rain outcome for the cheapest path, knowing tomorrow it can choose again after the real rain.'),
              T('মাটির পানি: FAO-56 হিসাব, আপনার জমির SoilGrids মাটি আর Open-Meteo-র বৃষ্টি ও ET₀।', 'Soil water: the FAO-56 balance with your field’s SoilGrids soil and Open-Meteo rain and ET₀.')] },
            { h: T('ধরে নেওয়া', 'Assumptions'), lines: [T(`খরচ মিলিমিটার পানির হিসাবে: প্রতি সেচ ${bnDigits(COST.perIrrigation)}, প্রতি মিমি পাম্প ${bnDigits(COST.perMmPumped)}, ফসলের প্রতি মিমি পানির টান ${bnDigits(COST.perMmStress)} (FAO-33 Ky ≈ ১)। এগুলো বদলালে পরিকল্পনাও বদলায়।`, `Costs in millimetres of water: ${COST.perIrrigation} per irrigation, ${COST.perMmPumped} per mm pumped, ${COST.perMmStress} per mm the crop goes short (FAO-33 Ky ≈ 1). The plan changes if these do.`)] },
          ], sources: ['FAO Irrigation and Drainage Paper 56 (1998); FAO-33 Yield response to water (1979); Bellman (1957) dynamic programming'] }} /></div>
        </div>
      )}

      {heat?.level && top && top.level !== 'past' && (
        <div className="mt-3 rounded-2xl bg-canvas p-4">
          <div className="flex items-center gap-2 font-semibold"><ThermometerSun size={18} className="text-orange-600" />{T('ফুল-ফলের সময়ের গরম', 'Heat at the sensitive stage')} <Tags list={['RULE']} /></div>
          {top.level === 'later'
            ? <p className="mt-2 text-[14px] text-muted">{T(`স্পর্শকাতর সময় শুরু হবে প্রায় ${bnDigits(top.opensIn)} দিন পরে; তখনকার পূর্বাভাস এখনো নেই।`, `The sensitive stage starts in about ${top.opensIn} days; the forecast does not reach it yet.`)}</p>
            : <Note tone={HEAT_TONE[top.level]}>
              {top.level === 'breach' ? T(`${day(top.firstHot)} থেকে ${bnDigits(top.hotDays.length)} দিন ${bnDigits(top.thr)}° বা বেশি গরমের পূর্বাভাস, ঠিক স্পর্শকাতর সময়ে। গাছ ঝিমিয়ে পড়ার আগেই ক্ষতি হয়।`, `${top.hotDays.length} days at ${top.thr} °C or more forecast from ${day(top.firstHot)}, right in the sensitive stage. The damage comes before the plant wilts.`)
                : top.level === 'near' ? T(`স্পর্শকাতর সময়ে গরম সীমার কাছে (${bnDigits(top.thr)}°)। পূর্বাভাসে চোখ রাখুন।`, `Heat close to the limit (${top.thr} °C) in the sensitive stage. Watch the forecast.`)
                  : T(`পূর্বাভাসের দিনগুলোতে গরম সীমার নিচে (সর্বোচ্চ ${bnDigits(Math.round(top.peak))}°)।`, `The forecast stays under the heat limit (peak ${Math.round(top.peak)} °C).`)}
            </Note>}
          <p className="mt-2 text-[12.5px] text-muted">{L(top.rule)}</p>
          {heat.advice.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-[13.5px]">{heat.advice.map((a, i) => <li key={i}>{L(a)}</li>)}</ul>}
        </div>
      )}

      {urea && crop.id !== 'boro' && (
        <div className="mt-3 rounded-2xl bg-canvas p-4">
          <div className="flex items-center gap-2 font-semibold"><Sprout size={18} className="text-primary-700" />{T('ইউরিয়া উপরি-প্রয়োগের দিন', 'A day for the urea top-dress')} <Tags list={['RULE']} /></div>
          <p className="mt-2 text-[14px]">{urea.best
            ? T(`উপরি-প্রয়োগ এই সপ্তাহে দিলে ${day(urea.best.d)} ভালো: সেদিন আর পরের দুই দিনে বৃষ্টি ${bnDigits(Math.round(urea.best.rain48))} মিমি।`, `If the top-dress is due this week, ${day(urea.best.d)} is best: ${Math.round(urea.best.rain48)} mm of rain that day and the next two.`)
            : T(`এই সপ্তাহে প্রায় প্রতিদিনই ভারী বৃষ্টির (${bnDigits(HEAVY_TOPDRESS_MM)} মিমি+) পূর্বাভাস; ইউরিয়া ধুয়ে যেতে পারে, পরে দিন।`, `Heavy rain (${HEAVY_TOPDRESS_MM} mm+) is forecast on nearly every day this week; urea may wash off, so wait.`)}</p>
        </div>
      )}
    </Card>
  );
}

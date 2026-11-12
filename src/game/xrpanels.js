// What each world-space panel says in VR (three/xr.js draws them, xrlogic.js lays them out): the seed shed, the
// FieldShift kiosk, the mission questions, the agriculture office, the Chakra helper's jobs, the VR menu, the wrist,
// the end-of-season report and the out-of-money card. The same game state and the same rules as the page's panels
// (FarmGame.jsx, OfficePanel.jsx), in the player's language. Pure: no three.js and no React.
import { priceOf, quizOf, canMax, dayOf, clock, ripeAt, agriScorecard } from './sim.js';
import { QUESTS, SAT_LAYERS } from './regions.js';
import { FERT, priceTrend } from './village.js';
import { officeOf, farmTroubles, officePrograms, SERVICES, canUse, initOffice } from './office.js';
import { helperJobs } from './helper.js';
import { seasonReport } from './fieldshift.js';
import { num } from '../engine/dates.js';

const q = (bn, en) => ({ bn, en });
// pick the language: a { bn, en } text, or two strings
const tr = (lang) => (o, en) => (en !== undefined ? (lang === 'en' ? en : o) : o ? o[lang] ?? o.bn ?? '' : '');
const close = (lang) => ({ id: 'close', label: lang === 'en' ? 'Back to the field' : 'মাঠে ফিরি', tone: 'go' });

export function shopSpec(g, lang) {
  const T = tr(lang), R = g.R, n = (v) => num(v, lang), cur = R.cur;
  const rows = [];
  for (const [k, c] of Object.entries(R.crops)) {
    const tags = [c.soil ? T('ডাল: মাটিতে নাইট্রোজেন', 'legume: fixes N') : '', c.thirst <= 1 ? T('কম পানি', 'low water') : ''].filter(Boolean).join(' · ');
    rows.push({ buttons: [3, 6].map((m) => ({
      id: `buy:${k}:${m}`, on: g.money >= c.cost * m,
      label: T(`${c.bn} ×${n(m)} · ${cur}${n(c.cost * m)}`, `${c.en} ×${m} · ${cur}${c.cost * m}`),
      sub: m === 3 ? T(`বিক্রি ${cur}${n(priceOf(g, k))} · পাকে ~${n(c.grow)} সে.${tags ? ` · ${tags}` : ''}`, `sells ${cur}${priceOf(g, k)} · ripens ~${c.grow}s${tags ? ` · ${tags}` : ''}`) : T(`হাতে আছে ${n(g.seeds[k] ?? 0)}টি`, `you have ${g.seeds[k] ?? 0}`),
    })), cols: 2 });
  }
  rows.push({ text: T('সার: একটা বেছে নিন। বেড়ে ওঠা ফসলের জমিতে দাঁড়িয়ে মেনু থেকে দিন।', 'Fertiliser: choose one. Stand on a growing crop and feed it from the menu.'), size: 'small' });
  rows.push({ buttons: Object.entries(FERT).map(([k, f]) => ({ id: `fert:${k}:1`, on: g.money >= f.cost, label: `${T(f.name)} · ${cur}${n(f.cost)}`, sub: T(`হাতে ${n(g.fertilizer?.[k] ?? 0)}টি`, `you have ${g.fertilizer?.[k] ?? 0}`) })), cols: 2 });
  rows.push({ text: T('দাম আর প্রভাব খেলার নিয়ম, আসল দাম নয়।', 'Prices and effects are game rules, not real prices.'), size: 'small' });
  return { id: 'shop', title: T(R.names.shed), sub: T(`হাতে নগদ ${cur}${n(g.money)} · দোকানদার রফিক ভাই: "খাঁটি বীজ আর সার মজুত আছে।"`, `Cash ${cur}${g.money} · Shopkeeper Rafiq: "Fresh certified seed and fertiliser in stock."`), rows, foot: [close(lang)] };
}

export function kioskSpec(g, lang, facts = []) {
  const T = tr(lang), R = g.R, n = (v) => num(v, lang), ev = g.ev;
  const weather = ev.heat > 0 ? T('তাপপ্রবাহ: ঘন ঘন পানি দিন', 'Heatwave: water often') : ev.storm > 0 ? T(R.storm) : ev.zone ? T(`${R.storm.bn} আসছে: নিরাপদ বৃত্তে যান`, `${R.storm.en} coming: get to the safe circle`) : T('স্বাভাবিক, পরিষ্কার আকাশ', 'Normal, clear sky');
  const prices = Object.keys(R.crops).map((k) => { const d = priceTrend(g, k); return `${T(R.crops[k])} ${R.cur}${n(priceOf(g, k))}${d > 0 ? ' ▲' : d < 0 ? ' ▼' : ''}`; }).join('   ');
  const rows = [
    { text: `${T('এখনকার আবহাওয়া', 'Weather now')}: ${weather}`, tone: ev.heat > 0 || ev.zone ? 'warn' : 'info' },
    { text: `${T('আজকের বাজারদর', "Today's prices")}: ${prices}` },
  ];
  const next = QUESTS[g.quest];
  if (next) rows.push({ text: `${T('পরের কাজ', 'Next')}: ${T(next).replace('{cur}', R.cur)}${next.how ? ` — ${T(next.how)}` : ''}`, tone: 'good' });
  for (const f of facts.slice(0, 3)) rows.push({ text: `${T(f.title)} (${f.sat}, ${f.tag === 'REAL' ? T('আসল উপগ্রহ রেকর্ড', 'real satellite record') : f.tag}): ${T(f.value)}`, size: 'small' });
  const perks = Object.values(R.quiz ?? {}).filter((x) => g.perks[x.perk]).map((x) => T(x.perkText));
  if (perks.length) rows.push({ text: `${T('আপনার অর্জন', 'Earned')}: ${perks.join(' · ')}`, size: 'small' });
  return { id: 'kiosk', title: `FieldShift · ${T(R.names.kiosk)}`, sub: T('উপসহকারী কৃষি কর্মকর্তা: "নাসা উপগ্রহ ও আবহাওয়ার রেকর্ড দেখে পরামর্শ নিন।"', 'Extension officer: "Get advice from NASA satellite and weather records."'), rows, foot: [close(lang)] };
}

// pick: the option chosen, or null before the player answers
export function quizSpec(g, lang, pick = null) {
  const T = tr(lang), Q = quizOf(g);
  if (!Q) return { id: 'quiz', title: T('প্রশ্ন নেই', 'No question'), rows: [], foot: [{ id: 'quiz:done', label: T('মাঠে ফিরি', 'Back to the field'), tone: 'go' }] };
  const rows = [{ buttons: Q.options.map((o, k) => ({ id: `quiz:${k}`, on: pick === null, label: `${num(k + 1, lang)}. ${T(o)}`, tone: pick === null ? null : o.ok ? 'good' : k === pick ? 'bad' : null })), cols: 1 }];
  if (pick !== null) {
    rows.push({ text: `${Q.options[pick].ok ? T('ঠিক!', 'Right!') : T('ঠিক হয়নি।', 'Not quite.')} ${T(Q.why)}`, tone: Q.options[pick].ok ? 'good' : 'warn' });
    if (Q.options[pick].ok && Q.perkText) rows.push({ text: T(Q.perkText), tone: 'good', size: 'small' });
  }
  return { id: 'quiz', title: T(Q.q), sub: T('FieldShift-এর প্রশ্ন', 'A question from FieldShift'), rows, foot: pick === null ? [] : [{ id: 'quiz:done', label: T('মাঠে ফিরি', 'Back to the field'), tone: 'go' }] };
}

const SOIL_LV = [q('কম', 'low'), q('মাঝারি', 'fair'), q('ভালো', 'good')];
export function officeSpec(g, lang, msg = null) {
  const T = tr(lang), R = g.R, off = officeOf(R.country);
  initOffice(g);
  const troubles = farmTroubles(g), progs = officePrograms(g, troubles);
  const rows = troubles.map((t) => ({ text: T(t.text), tone: t.tone === 'bad' ? 'bad' : t.tone === 'warn' ? 'warn' : t.tone === 'good' ? 'good' : 'info', size: 'small' }));
  rows.push({ buttons: Object.entries(SERVICES).map(([id, sv]) => { const c = canUse(g, id); return { id: `svc:${id}`, on: c.ok, label: T(sv.title), sub: c.ok ? T(sv.body) : T(c.why) }; }), cols: 3 });
  if (msg) rows.push({ text: T(msg), tone: 'good', size: 'small' });
  if (g.office.soil) rows.push({ text: `${T('মাটি পরীক্ষা (খেলার জমি)', 'Soil test (game plots)')}: ${g.office.soil.map((p) => `${num(p.i + 1, lang)} ${T(SOIL_LV[p.fert >= 0.7 ? 2 : p.fert >= 0.5 ? 1 : 0])}${p.legume ? '*' : ''}`).join(' · ')}`, size: 'small' });
  rows.push({ text: T('সরকারি সহায়তা, যা জিজ্ঞেস করে দেখবেন (আসল কর্মসূচি; পাবেন কি না কমিটি বা ব্যাংক ঠিক করে):', 'Government support worth asking about (real programmes; a committee or a bank decides):'), size: 'small' });
  for (const p of progs) rows.push({ text: `${T(p.name)}: ${T(p.benefit)}${p.where ? ` ${T('কোথায়', 'Where')}: ${T(p.where)}` : ''}`, size: 'small', tone: 'info' });
  if (!progs.length) rows.push({ text: T('এই দেশের কর্মসূচির তালিকা এখনো নেই।', 'No programme list for this country yet.'), size: 'small' });
  return { id: 'office', title: T(off.name), sub: `${T(off.officer.name)} · ${T('নমুনা চরিত্র', 'sample character')}`, rows, foot: [close(lang)] };
}

// running: the stage's job ({ id, steps } or null)
export function helperSpec(g, lang, running = null, jobs = helperJobs(g)) {
  const T = tr(lang), R = g.R, n = (v) => num(v, lang);
  const rows = [];
  if (running) rows.push({ text: T(`চলছে: ${jobs.find((j) => j.id === running.id)?.title?.bn ?? running.id} (${n(running.steps)} ধাপ)`, `Running: ${jobs.find((j) => j.id === running.id)?.title?.en ?? running.id} (${running.steps} steps)`), tone: 'info' });
  if (!jobs.length) rows.push({ text: T('এখন করার মতো কোনো কাজ নেই।', 'Nothing needs doing right now.') });
  rows.push({ buttons: jobs.map((j) => ({
    id: `job:${j.id}`, on: !j.blocked && (j.afford ?? true), tone: j.urgent ? 'bad' : null,
    label: j.cost > 0 ? T(`${j.title.bn} · অনুমতি দিন ${R.cur}${n(j.cost)}`, `${j.title.en} · approve ${R.cur}${j.cost}`) : T(j.title),
    sub: j.blocked ? T(j.blocked) : j.gain ? T(`আয় ${R.cur}${n(j.gain)}`, `earns ${R.cur}${j.gain}`) : T(`${n(j.n)}টি কাজ`, `${j.n} to do`),
  })), cols: 2 });
  rows.push({ text: T('টাকা খরচের কাজ আপনার অনুমতি ছাড়া হয় না। হাঁটলে বা কাজ করলে এজেন্ট থামে।', 'A job that spends money needs your tap. Moving or acting yourself stops the agent.'), size: 'small' });
  const foot = [close(lang)];
  if (running) foot.unshift({ id: 'job:stop', label: T('থামাও', 'Stop'), tone: 'bad' });
  return { id: 'helper', title: T('চক্র এজেন্ট', 'Chakra Agent'), sub: T('আপনার সহকারী: কাজ বেছে দিন', 'Your helper: pick a job'), rows, foot };
}

const OPT = {
  view: { first: q('দৃষ্টি: নিজের চোখে', 'View: first person'), third: q('দৃষ্টি: পেছন থেকে', 'View: third person') },
  move: { head: q('হাঁটা: মাথা যেদিকে', 'Walk: where you look'), hand: q('হাঁটা: বাঁ হাত যেদিকে', 'Walk: where left hand points') },
  turn: { 30: q('ঘোরা: ৩০°', 'Snap turn: 30°'), 45: q('ঘোরা: ৪৫°', 'Snap turn: 45°') },
  smoothTurn: { false: q('ধাপে ধাপে ঘোরা', 'Snap turning'), true: q('মসৃণ ঘোরা', 'Smooth turning') },
  vignette: { true: q('আরামের ছায়া: চালু', 'Comfort vignette: on'), false: q('আরামের ছায়া: বন্ধ', 'Comfort vignette: off') },
  seated: { false: q('দাঁড়িয়ে খেলছি', 'Standing'), true: q('বসে খেলছি', 'Seated') },
};
// s: the XR settings; sat: is the satellite view on; layer: its layer id
export function menuSpec(g, lang, s, { sat = false, layer = 'health' } = {}) {
  const T = tr(lang), R = g.R, n = (v) => num(v, lang);
  const rows = [
    { buttons: Object.keys(OPT).map((k) => ({ id: `set:${k}`, label: T(OPT[k][String(s[k])]) })), cols: 3 },
    { text: T('বীজ বেছে নিন (Y বোতামেও বদলায়)', 'Choose the seed (Y also cycles it)'), size: 'small' },
    { buttons: Object.keys(R.crops).map((k) => ({ id: `seed:${k}`, label: `${T(R.crops[k])} · ${n(g.seeds[k] ?? 0)}`, tone: g.sel === k ? 'go' : null })), cols: Math.min(4, Object.keys(R.crops).length) },
    { buttons: [
      ...Object.entries(FERT).map(([k, f]) => ({ id: `feed:${k}`, on: (g.fertilizer?.[k] ?? 0) > 0, label: T(`এই জমিতে ${f.name.bn} (${n(g.fertilizer?.[k] ?? 0)})`, `${f.name.en} on this plot (${g.fertilizer?.[k] ?? 0})`) })),
      { id: 'sat', label: sat ? T('উপগ্রহের চোখ: চালু ✓', 'Satellite eyes: on ✓') : T('উপগ্রহের চোখ: বন্ধ', 'Satellite eyes: off'), tone: sat ? 'go' : null },
    ], cols: 3 },
  ];
  if (sat) rows.push({ buttons: SAT_LAYERS.map((l) => ({ id: `layer:${l.id}`, label: T(l), tone: layer === l.id ? 'go' : null })), cols: SAT_LAYERS.length > 4 ? 3 : SAT_LAYERS.length });
  rows.push({ buttons: [
    { id: 'open:helper', label: T('চক্র এজেন্ট', 'Chakra Agent') },
    { id: 'open:kiosk', label: 'FieldShift' },
    { id: 'lang', label: lang === 'en' ? 'বাংলা' : 'English' },
    { id: 'exit', label: T('VR থেকে বের হোন', 'Leave VR'), tone: 'bad' },
  ], cols: 4 });
  return { id: 'menu', title: T('মেনু', 'Menu'), sub: T(`${R.farmer.bn}-এর মাঠ · খেলা থেমে আছে`, `${R.farmer.en}’s field · the game waits`), rows, foot: [close(lang)] };
}

// The small card on the inside of the left wrist: money, the day and time, water in the can, seed, basket, mission.
export function wristSpec(g, lang) {
  const T = tr(lang), R = g.R, n = (v) => num(v, lang);
  const [h, m] = clock(g), basket = Object.values(g.basket).reduce((a, b) => a + b, 0);
  const seeds = Object.keys(R.crops).filter((k) => g.seeds[k] > 0 || k === g.sel).map((k) => `${k === g.sel ? '▸' : ''}${T(R.crops[k])} ${n(g.seeds[k] ?? 0)}`).join('  ');
  const qn = QUESTS[g.quest];
  const ripe = g.plots.filter((p) => p.crop && !p.dead && p.g >= ripeAt(g)).length;
  return {
    id: 'wrist',
    title: `${R.cur}${n(g.money)}  ·  ${T('দিন', 'Day')} ${n(dayOf(g))}  ${n(String(h).padStart(2, '0'))}:${n(String(m).padStart(2, '0'))}`,
    rows: [
      { text: `${T('পানি', 'Water')} ${n(g.can)}/${n(canMax(g))}   ${T('ঝুড়ি', 'Basket')} ${n(basket)}${ripe ? `   ${T('পাকা', 'Ripe')} ${n(ripe)}` : ''}` },
      { text: seeds || T('বীজ নেই', 'No seed') },
      { text: g.won ? T('মৌসুম শেষ!', 'Season done!') : qn ? `${T('মিশন', 'Mission')} ${n(g.quest + 1)}: ${T(qn).replace('{cur}', R.cur)}` : '', tone: 'good' },
    ],
    foot: [{ id: 'menu', label: T('মেনু', 'Menu') }],
  };
}

export function reportSpec(g, lang) {
  const T = tr(lang), R = g.R, n = (v) => num(v, lang), c = g.count;
  const rep = seasonReport(g), sc = agriScorecard(g);
  const correct = g.answers.filter((a) => a.ok).length;
  const rows = [
    { text: `${'★'.repeat(sc.stars)}${'☆'.repeat(3 - sc.stars)}   ${T('স্কোর', 'Score')} ${n(sc.overall)}/${n(100)}`, size: 'big', tone: 'good' },
    { text: T(`বিক্রি ${R.cur}${n(c.earned)} · ফসল তোলা ${n(c.harvested)} · হারানো গাছ ${n(c.lost)} · ${n(dayOf(g))} দিন · প্রশ্নে ${n(correct)}/${n(g.answers.length)}`, `Sold ${R.cur}${c.earned} · harvested ${c.harvested} · plants lost ${c.lost} · ${dayOf(g)} days · quiz ${correct}/${g.answers.length}`) },
    { text: T(`ফসলচক্র ${n(sc.rotScore)} · পানি ${n(sc.waterScore)} · বৈচিত্র্য ${n(sc.diversityScore)} · আয় ${n(sc.econScore)} · মাটি ${n(rep.soil)}%`, `Rotation ${sc.rotScore} · water ${sc.waterScore} · diversity ${sc.diversityScore} · income ${sc.econScore} · soil ${rep.soil}%`), size: 'small' },
    ...rep.tips.map((t) => ({ text: T(t), tone: 'info', size: 'small' })),
  ];
  return { id: 'report', title: T('মৌসুম শেষ!', 'Season complete!'), sub: T(`${R.farmer.bn}-এর মাঠের হিসাব`, `${R.farmer.en}’s season`), rows, foot: [{ id: 'finish', label: T('পুরো হিসাব দেখুন (VR থেকে বের হবে)', 'Full report (leaves VR)'), tone: 'go' }] };
}

export function brokeSpec(g, lang) {
  const T = tr(lang);
  return { id: 'broke', title: T('টাকা আর বীজ — দুটোই শেষ', 'Out of money and seed'), rows: [{ text: T('খরচের আগে হিসাব — এটাই FieldShift-এর মূল কথা। আবার শুরু করতে VR থেকে বের হোন।', 'Plan before you spend — that is the heart of FieldShift. Leave VR to start again.') }], foot: [{ id: 'exit', label: T('VR থেকে বের হোন', 'Leave VR'), tone: 'go' }] };
}

// the short messages that float in front of the player: what the farmer says, toasts, alerts and new missions
export function toastSpec(e, g, lang) {
  const T = tr(lang);
  if (e.type === 'alert') return { title: T(e.title), body: T(e.body), tone: e.tone === 'hot' ? 'bad' : e.tone === 'ok' ? 'good' : 'warn', secs: 7 };
  if (e.type === 'quest') { const qn = QUESTS[e.index]; return { title: `${T('মিশন', 'Mission')} ${num(e.index + 1, lang)}`, body: qn ? T(qn).replace('{cur}', g.R.cur) : '', tone: 'good', secs: 6 }; }
  if (e.type === 'questDone') return { title: T('মিশন সম্পন্ন!', 'Mission complete!'), body: '', tone: 'good', secs: 3 };
  if (e.type === 'say' || e.type === 'toast') return { title: '', body: T(e.text), tone: 'info', secs: e.long ? 6 : 3.5 };
  if (e.type === 'hurt') return { title: T('ঝড়ে আহত!', 'Caught in the storm!'), body: '', tone: 'bad', secs: 3 };
  return null;
}

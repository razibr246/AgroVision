// "Your agriculture officer, in the loop", acted out: a farmer's report leaves the field for the upazila office, the
// officer looks at it with the field's satellite pass and weather record, the advice travels back to the phone, and
// when neighbours report the same thing one advisory reaches them all. One 12-second loop, drawn in SVG: the two
// packets ride SMIL motion paths, everything else is CSS keyframes, so nothing runs in JavaScript each frame. The
// parent is told which phase is playing (onPhase) so the three step cards beside it light up in time. With reduced
// motion, or while scrolled out of view, the scene stands still at its finished state.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';

export const PHASES = ['report', 'review', 'advice', 'alert'];
const CYCLE = 12; // seconds
const AT = { report: 0, review: 3.2, advice: 7, alert: 9.8 }; // when each phase starts, in seconds

// A tall picture (the figure beside the text is nearly square on a desktop, taller on a phone) with the action in the
// middle band, so "slice" cropping at any screen size only trims sky and land.
const W = 620, H = 660, TOP = 90; // the drawing below is laid out in a 620 × 480 band starting TOP px down
// the route between the farmer's phone and the office door
const ROUTE = 'M 216 268 C 262 214, 340 186, 468 220';
// the farmer's plot, the two neighbours' plots and the office, in scene pixels
const PLOT = [[70, 262], [214, 236], [262, 304], [122, 342]];
const NEAR = [[[246, 236], [340, 226], [372, 272], [284, 290]], [[20, 350], [112, 352], [96, 396], [8, 392]]];
const TILES = []; // the satellite's view of the plot, tile by tile
for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) TILES.push([c, r]);

const pct = (sec) => `${((sec / CYCLE) * 100).toFixed(2)}%`;

// Keyframes for the whole loop. Every element animates for CYCLE seconds, so the percentages are moments in the loop.
const CSS = `
@keyframes ol-route { 0%,2% { stroke-dashoffset: 1; opacity: 0 } 6% { opacity: .9 } 22% { stroke-dashoffset: 0 } 56% { opacity: .9 } 60% { opacity: .35 } 100% { opacity: .35 } }
@keyframes ol-flash { 0% { opacity: 0 } 1.5% { opacity: .95 } 4% { opacity: 0 } 100% { opacity: 0 } }
@keyframes ol-phone { 0%,1% { transform: translateY(0) } 2.5% { transform: translateY(-6px) } 4% { transform: translateY(0) } 100% { transform: translateY(0) } }
@keyframes ol-spot { 0% { opacity: 0; transform: scale(.6) } 2% { opacity: 1; transform: scale(1) } 55% { opacity: 1 } 60% { opacity: 0 } 100% { opacity: 0 } }
@keyframes ol-pop { 0% { opacity: 0; transform: translateY(8px) scale(.92) } 100% { opacity: 1; transform: translateY(0) scale(1) } }
@keyframes ol-office { 0%,${pct(3)} { opacity: .15 } ${pct(3.6)} { opacity: 1 } ${pct(9.8)} { opacity: 1 } ${pct(10.6)} { opacity: .15 } 100% { opacity: .15 } }
@keyframes ol-sat { 0%,${pct(3.1)} { transform: translateX(-80px); opacity: 0 } ${pct(3.6)} { opacity: 1 } ${pct(6.6)} { opacity: 1 } ${pct(7)} { transform: translateX(700px); opacity: 0 } 100% { transform: translateX(700px); opacity: 0 } }
@keyframes ol-swath { 0%,${pct(3.3)} { transform: translateX(-130px); opacity: 0 } ${pct(3.7)} { opacity: .55 } ${pct(6.3)} { opacity: .55 } ${pct(6.7)} { transform: translateX(230px); opacity: 0 } 100% { transform: translateX(230px); opacity: 0 } }
@keyframes ol-tile { 0%,${pct(3.4)} { opacity: 0 } ${pct(3.9)} { opacity: .95 } ${pct(9.6)} { opacity: .95 } ${pct(10.4)} { opacity: 0 } 100% { opacity: 0 } }
@keyframes ol-chip { 0%,${pct(4.4)} { opacity: 0; transform: translateY(8px) } ${pct(4.9)} { opacity: 1; transform: translateY(0) } ${pct(9.8)} { opacity: 1; transform: translateY(0) } ${pct(10.4)} { opacity: 0; transform: translateY(-6px) } 100% { opacity: 0 } }
@keyframes ol-ring { 0%,${pct(3.4)} { stroke-dashoffset: 1 } ${pct(6.8)} { stroke-dashoffset: 0 } ${pct(9.8)} { stroke-dashoffset: 0 } ${pct(10.2)} { stroke-dashoffset: 1 } 100% { stroke-dashoffset: 1 } }
@keyframes ol-done { 0%,${pct(9.4)} { opacity: 0; transform: scale(.6) } ${pct(9.8)} { opacity: 1; transform: scale(1) } ${pct(11.6)} { opacity: 1 } 100% { opacity: 0 } }
@keyframes ol-bubble { 0%,${pct(9.5)} { opacity: 0; transform: translateY(10px) scale(.9) } ${pct(9.9)} { opacity: 1; transform: translateY(0) scale(1) } ${pct(11.7)} { opacity: 1 } 100% { opacity: 0 } }
@keyframes ol-near { 0%,${pct(9.9)} { opacity: 0 } ${pct(10.2)} { opacity: 1 } ${pct(10.5)} { opacity: .45 } ${pct(10.8)} { opacity: 1 } ${pct(11.8)} { opacity: 1 } 100% { opacity: 0 } }
@keyframes ol-wave { 0%,${pct(10.6)} { transform: scale(.2); opacity: 0 } ${pct(10.8)} { opacity: .7 } ${pct(11.9)} { transform: scale(1); opacity: 0 } 100% { opacity: 0 } }
@keyframes ol-bell { 0%,${pct(10.5)} { opacity: 0; transform: translateY(6px) } ${pct(10.8)} { opacity: 1; transform: translateY(0) } ${pct(11.8)} { opacity: 1 } 100% { opacity: 0 } }
@keyframes ol-badge { 0%,${pct(.6)} { opacity: 0 } ${pct(1)} { opacity: 1 } ${pct(2.8)} { opacity: 1 } ${pct(3.2)} { opacity: 0 } 100% { opacity: 0 } }
@keyframes ol-badge2 { 0%,${pct(7.2)} { opacity: 0 } ${pct(7.6)} { opacity: 1 } ${pct(9.4)} { opacity: 1 } ${pct(9.8)} { opacity: 0 } 100% { opacity: 0 } }
@keyframes ol-sun { 0% { transform: translateY(0) } 50% { transform: translateY(-3px) } 100% { transform: translateY(0) } }
@keyframes ol-bird { 0% { transform: translate(0,0) } 100% { transform: translate(-700px,-40px) } }
.ol * { transform-box: fill-box; transform-origin: center; }
.ol-run * { animation-duration: ${CYCLE}s; animation-timing-function: cubic-bezier(.22,1,.36,1); animation-iteration-count: infinite; }
.ol-still .ol-show { opacity: 1 !important; transform: none !important; stroke-dashoffset: 0 !important; }
`;

// A small, clean figure: head, shirt, lungi or trousers, arms as rounded strokes. Origin at the top of the head.
function Person({ x, y, scale = 1, cloth = '#e9eef2', lower = '#5b4636', skin = '#a8713f', wrap = '#b23b3b', hair = '#2b2420', flip = false, children }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx="0" cy="62" rx="15" ry="3.5" fill="#0d2614" opacity=".22" />
      <rect x="-9" y="38" width="18" height="24" rx="3" fill={lower} />
      <path d="M-3 46 v16 M3 46 v16" stroke="#0d2614" strokeOpacity=".18" strokeWidth="1.2" />
      <rect x="-11" y="16" width="22" height="25" rx="6" fill={cloth} />
      <path d="M-11 22 q-7 6 -9 16 M11 22 q7 6 9 16" fill="none" stroke={cloth} strokeWidth="6" strokeLinecap="round" />
      <circle cx="-20" cy="39" r="3.2" fill={skin} /><circle cx="20" cy="39" r="3.2" fill={skin} />
      <rect x="-3" y="12" width="6" height="6" fill={skin} />
      <circle cx="0" cy="7" r="8" fill={skin} />
      <path d="M-8 6 q8 -10 16 0 v-2 q-8 -9 -16 0 z" fill={hair} />
      {wrap && <path d="M-9 3 q9 -11 18 0 q-4 -4 -9 -4 q-5 0 -9 4 z" fill={wrap} />}
      {children}
    </g>
  );
}

export default function OfficerLoopScene({ onPhase }) {
  const { T, s } = useStore();
  const bn = s.lang === 'bn';
  const ref = useRef(null);
  const [still, setStill] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [seen, setSeen] = useState(false);

  // start when the scene scrolls into view, stand still when it leaves (also stops the SMIL packets)
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => setStill(mq.matches);
    mq.addEventListener?.('change', onMq);
    return () => { io.disconnect(); mq.removeEventListener?.('change', onMq); };
  }, []);
  const running = seen && !still;
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    if (running) { svg.setCurrentTime(0); svg.unpauseAnimations(); } else svg.pauseAnimations();
  }, [running]);
  // tell the parent which step is playing, from the same clock as the loop
  useEffect(() => {
    if (!running) { onPhase?.(null); return undefined; }
    const t0 = performance.now();
    let raf = 0, last = null;
    const tick = () => {
      const t = ((performance.now() - t0) / 1000) % CYCLE;
      const ph = PHASES.filter((p) => t >= AT[p]).at(-1);
      if (ph !== last) { last = ph; onPhase?.(ph); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, onPhase]);

  const pts = (poly) => poly.map((p) => p.join(',')).join(' ');
  // CSS animations start the moment their name is set, so they are given it only while running: that keeps the CSS
  // clock, the SMIL packets (setCurrentTime(0)) and the phase timer above on the same zero. Standing still, the
  // "ol-show" parts stay at their finished state instead.
  const a = (name) => (running ? { animationName: name } : undefined);
  const cls = `ol ${running ? 'ol-run' : 'ol-still'}`;
  const font = bn ? '"Noto Sans Bengali Variable", "Noto Sans Bengali", sans-serif' : '"Inter Variable", Inter, system-ui, sans-serif';

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={`${cls} absolute inset-0 h-full w-full select-none`} role="img"
      aria-label={T('একজন কৃষকের সমস্যা উপজেলা কৃষি অফিসে যায়, কর্মকর্তা উপগ্রহ আর আবহাওয়ার তথ্যসহ দেখেন, পরামর্শ ফোনে ফিরে আসে', 'A farmer’s problem goes to the upazila agriculture office, the officer reviews it with satellite and weather data, and advice comes back to the phone')}
      style={{ fontFamily: font }}>
      <style>{CSS}</style>
      <defs>
        <linearGradient id="ol-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6e3c3" /><stop offset=".55" stopColor="#dfe9cf" /><stop offset="1" stopColor="#b9d49f" /></linearGradient>
        <linearGradient id="ol-land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9cc47c" /><stop offset="1" stopColor="#5f9a4a" /></linearGradient>
        <linearGradient id="ol-paddy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7fb85f" /><stop offset="1" stopColor="#4f8f3c" /></linearGradient>
        <linearGradient id="ol-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".98" /><stop offset="1" stopColor="#f3f7ef" stopOpacity=".98" /></linearGradient>
        <radialGradient id="ol-sunglow"><stop offset="0" stopColor="#ffd98a" stopOpacity=".9" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></radialGradient>
        <filter id="ol-soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0d2614" floodOpacity=".18" /></filter>
        <filter id="ol-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" /></filter>
        <clipPath id="ol-plot"><polygon points={pts(PLOT)} /></clipPath>
        <path id="ol-route" d={ROUTE} />
      </defs>

      {/* ---- the land at dusk ---- */}
      <rect width={W} height={H} fill="url(#ol-sky)" />
      <rect y={TOP + 200} width={W} height={H - TOP - 200} fill="url(#ol-land)" />
      <g transform={`translate(0 ${TOP})`}>
      <circle cx="420" cy="80" r="80" fill="url(#ol-sunglow)" />
      <g style={{ ...a('ol-sun'), animationDuration: '6s', animationTimingFunction: 'ease-in-out' }}><circle cx="420" cy="80" r="22" fill="#ffcf6b" /></g>
      <path d="M0 150 Q 90 110 180 142 T 360 136 T 540 128 T 620 140 V 200 H 0 Z" fill="#a9c99a" opacity=".55" />
      <path d="M0 176 Q 120 150 240 170 T 470 160 T 620 168 V 230 H 0 Z" fill="#8fb97f" opacity=".6" />
      {/* a flight of birds, slow */}
      <g style={{ ...a('ol-bird'), animationDuration: '46s', animationTimingFunction: 'linear' }} transform="translate(640 70)">
        {[0, 18, 34, 52].map((dx, i) => <path key={i} d={`M${dx} ${(i % 2) * 6} q4 -4 8 0 q4 -4 8 0`} fill="none" stroke="#5b5b4e" strokeWidth="1.4" opacity=".55" />)}
      </g>
      {/* field rows */}
      {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M-20 ${216 + i * 20} Q 310 ${206 + i * 20} 640 ${220 + i * 20}`} fill="none" stroke="#3f7a32" strokeWidth="1" opacity=".16" />)}
      {/* the river */}
      <path d="M-10 452 C 120 420, 230 470, 360 440 S 560 400, 640 430" fill="none" stroke="#8ec5dc" strokeWidth="18" opacity=".8" strokeLinecap="round" />
      <path d="M-10 452 C 120 420, 230 470, 360 440 S 560 400, 640 430" fill="none" stroke="#cfe9f3" strokeWidth="4" opacity=".7" strokeLinecap="round" />
      {/* trees along the road */}
      {[[388, 268], [416, 262], [596, 262], [40, 230], [70, 224]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}><rect x="-2" y="0" width="4" height="18" fill="#6b4a2b" /><circle cx="0" cy="-6" r="13" fill="#3f7a32" /><circle cx="-7" cy="-1" r="9" fill="#4c8a3c" /><circle cx="8" cy="-2" r="9" fill="#4c8a3c" /></g>
      ))}

      {/* ---- the neighbours' plots (they light up for the area alert) ---- */}
      {NEAR.map((poly, i) => (
        <g key={i}>
          <polygon points={pts(poly)} fill="#86b864" stroke="#2f6e2f" strokeWidth="1.5" strokeOpacity=".5" />
          <polygon points={pts(poly)} fill="#f6c453" style={{ ...a('ol-near'), animationDelay: `${i * 0.25}s` }} opacity="0" />
        </g>
      ))}

      {/* ---- the farmer's plot ---- */}
      <polygon points={pts(PLOT)} fill="url(#ol-paddy)" stroke="#245a28" strokeWidth="2" />
      {Array.from({ length: 6 }, (_, i) => <line key={i} x1={78 + i * 24} y1={262 - i * 4} x2={128 + i * 24} y2={338 - i * 4} stroke="#2f6e2f" strokeWidth="1" opacity=".35" clipPath="url(#ol-plot)" />)}
      {/* the trouble spot the farmer photographs */}
      <g transform="translate(150 300)" style={a('ol-spot')} opacity="0">
        <circle r="18" fill="#c98a12" opacity=".35" filter="url(#ol-blur)" />
        <circle r="9" fill="#e0a52a" stroke="#fff" strokeWidth="2" />
        <circle r="3" fill="#fff" />
      </g>
      {/* the satellite's view: tiles over the plot, then the review ring */}
      <g clipPath="url(#ol-plot)">
        {TILES.map(([c, r], i) => {
          const sick = (c === 3 && r === 2) || (c === 2 && r === 2) || (c === 3 && r === 1);
          return <rect key={i} x={66 + c * 34} y={234 + r * 28} width="33" height="27" fill={sick ? '#e0a52a' : c % 3 === 1 ? '#6fb352' : '#8fcf6c'} stroke="#ffffff" strokeWidth="1.2" strokeOpacity=".8"
            className="ol-show" style={{ ...a('ol-tile'), animationDelay: `${(r * 6 + c) * 0.045}s` }} opacity="0" />;
        })}
        <rect x="40" y="220" width="46" height="140" fill="#dff7ff" style={a('ol-swath')} opacity="0" />
      </g>
      <polygon points={pts(PLOT)} fill="none" stroke="#ffffff" strokeWidth="3" pathLength="1" strokeDasharray="1" className="ol-show" style={a('ol-ring')} strokeDashoffset="1" strokeLinejoin="round" />

      {/* the farmer at the edge of the plot, phone up */}
      <Person x="196" y="252" scale=".9" wrap="#b23b3b" lower="#3f6f8f">
        <g style={a('ol-phone')}>
          <path d="M20 39 q6 -8 4 -18" fill="none" stroke="#e9eef2" strokeWidth="6" strokeLinecap="round" />
          <rect x="19" y="12" width="9" height="15" rx="2" fill="#1f2937" stroke="#9ca3af" strokeWidth="1" />
          <rect x="20.5" y="14" width="6" height="10" fill="#9fd3ff" />
          <circle cx="23.5" cy="19" r="8" fill="#fff" style={a('ol-flash')} opacity="0" />
        </g>
      </Person>
      <g style={a('ol-badge')} opacity="0" filter="url(#ol-soft)">
        <rect x="130" y="212" width={bn ? 150 : 152} height="26" rx="13" fill="url(#ol-glass)" />
        <circle cx="146" cy="225" r="6" fill="#e0a52a" />
        <text x="158" y="229.5" fontSize="12.5" fontWeight="600" fill="#1c2b1f">{T('ছবি + জায়গা পাঠানো হচ্ছে', 'Photo + location sent')}</text>
      </g>

      {/* ---- the upazila office ---- */}
      <g transform="translate(420 150)">
        <ellipse cx="68" cy="94" rx="90" ry="10" fill="#0d2614" opacity=".14" />
        <rect x="0" y="36" width="136" height="58" rx="4" fill="#f7f3e8" stroke="#c9b99a" strokeWidth="1.5" />
        <path d="M-6 38 L68 6 L142 38 Z" fill="#b9553a" />
        <path d="M-6 38 L68 6 L142 38 L136 44 L68 14 L0 44 Z" fill="#9a4330" />
        <rect x="56" y="58" width="24" height="36" rx="2" fill="#245a28" />
        <rect x="66" y="74" width="3" height="3" fill="#ffd98a" />
        {[12, 100].map((x) => <g key={x}><rect x={x} y="52" width="22" height="18" rx="2" fill="#9fd3ff" stroke="#c9b99a" /><rect x={x} y="52" width="22" height="18" rx="2" fill="#ffe29a" style={a('ol-office')} opacity=".15" /></g>)}
        <rect x="128" y="-4" width="2" height="42" fill="#6b4a2b" /><path d="M130 -4 L152 2 L130 8 Z" fill="#2f6e2f" /><circle cx="140" cy="2" r="2.4" fill="#d33" />
        <rect x="4" y="20" width="128" height="15" rx="4" fill="#245a28" />
        <text x="68" y="31" textAnchor="middle" fontSize={bn ? 9.5 : 8} fontWeight="700" letterSpacing=".2" fill="#fff">{T('উপজেলা কৃষি অফিস', 'UPAZILA AGRICULTURE OFFICE')}</text>
      </g>
      {/* the officer at the door, with the review chips beside her */}
      <Person x="470" y="196" scale=".85" cloth="#245a28" lower="#1f2937" wrap={null} flip skin="#8a5a33" hair="#1f1a17">
        <rect x="-14" y="22" width="8" height="11" rx="1.5" fill="#f3e9d2" stroke="#c9b99a" strokeWidth=".8" />
      </Person>
      <g className="ol-show" style={a('ol-chip')} opacity="0" filter="url(#ol-soft)">
        <rect x="426" y="258" width="140" height="30" rx="10" fill="url(#ol-glass)" />
        <path d="M438 276 q-6 0 -6 -6 q0 -6 6 -6 q2 -6 9 -5 q7 1 7 7 q5 0 5 5 q0 5 -5 5 z" fill="#8ec5dc" />
        <text x="458" y="273" fontSize="11.5" fontWeight="700" fill="#1c2b1f">{T('৩ দিনে ৪২ মিমি বৃষ্টি', '42 mm rain in 3 days')}</text>
        <text x="458" y="284" fontSize="9" fill="#5b6b5e">{T('নাসা পাওয়ার · মডেল', 'NASA POWER · MODEL')}</text>
      </g>
      <g className="ol-show" style={{ ...a('ol-chip'), animationDelay: '.5s' }} opacity="0" filter="url(#ol-soft)">
        <rect x="426" y="294" width="140" height="30" rx="10" fill="url(#ol-glass)" />
        <rect x="434" y="302" width="14" height="14" rx="3" fill="#e0a52a" /><rect x="437" y="305" width="8" height="8" fill="#fff" opacity=".8" />
        <text x="458" y="309" fontSize="11.5" fontWeight="700" fill="#1c2b1f">{T('সবুজ কমেছে ২ সপ্তাহে', 'Greenness down, 2 weeks')}</text>
        <text x="458" y="320" fontSize="9" fill="#5b6b5e">{T('সেন্টিনেল-২ · উপগ্রহ', 'Sentinel-2 · SAT')}</text>
      </g>
      <g className="ol-show" style={a('ol-badge2')} opacity="0" filter="url(#ol-soft)">
        <rect x="372" y="118" width={bn ? 118 : 110} height="26" rx="13" fill="#245a28" />
        <path d="M382 131 l5 5 l9 -10" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <text x="402" y="135.5" fontSize="12.5" fontWeight="600" fill="#fff">{T('পরামর্শ পাঠানো হলো', 'Advice sent back')}</text>
      </g>

      {/* ---- the satellite pass ---- */}
      <g style={a('ol-sat')} opacity="0" transform="translate(0 48)">
        <g transform="translate(0 0)">
          <rect x="-26" y="-4" width="20" height="9" fill="#9fd3ff" stroke="#1f2937" strokeWidth="1" />
          <rect x="6" y="-4" width="20" height="9" fill="#9fd3ff" stroke="#1f2937" strokeWidth="1" />
          <rect x="-6" y="-7" width="12" height="15" rx="2" fill="#e5e7eb" stroke="#1f2937" strokeWidth="1" />
          <circle cx="0" cy="12" r="3" fill="#f6c453" />
          <path d="M-12 14 L0 190 L12 14 Z" fill="#dff7ff" opacity=".35" />
        </g>
      </g>

      {/* ---- the route and the two packets ---- */}
      <path d={ROUTE} fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="1" pathLength="1" strokeLinecap="round" className="ol-show" style={a('ol-route')} strokeDashoffset="1" opacity=".35" />
      <path d={ROUTE} fill="none" stroke="#245a28" strokeWidth="1" strokeDasharray="4 6" opacity=".35" />
      {/* the report: a photo card going to the office */}
      <g filter="url(#ol-soft)">
        <g>
          <rect x="-22" y="-16" width="44" height="32" rx="7" fill="url(#ol-glass)" stroke="#c9d6c4" />
          <rect x="-17" y="-11" width="18" height="14" rx="2" fill="#7fb85f" /><circle cx="-6" cy="-5" r="3" fill="#e0a52a" />
          <rect x="4" y="-10" width="14" height="3" rx="1.5" fill="#9ca3af" /><rect x="4" y="-4" width="10" height="3" rx="1.5" fill="#9ca3af" />
          <path d="M11 4 c-3 0 -5 2 -5 5 c0 4 5 7 5 7 s5 -3 5 -7 c0 -3 -2 -5 -5 -5 z" fill="#b23b3b" />
          {running && <animateMotion dur={`${CYCLE}s`} repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;0.03;0.25;1" calcMode="linear" rotate="0"><mpath href="#ol-route" /></animateMotion>}
          {running ? <animate attributeName="opacity" dur={`${CYCLE}s`} repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;0.03;0.25;0.28;1" /> : null}
          {!running && <set attributeName="opacity" to="0" />}
        </g>
      </g>
      {/* the advice: a green card coming back to the phone */}
      <g filter="url(#ol-soft)">
        <g>
          <rect x="-22" y="-16" width="44" height="32" rx="7" fill="#245a28" />
          <path d="M-13 1 l5 5 l10 -11" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="4" y="-9" width="14" height="3" rx="1.5" fill="#bfe3b0" /><rect x="4" y="-3" width="12" height="3" rx="1.5" fill="#bfe3b0" /><rect x="4" y="3" width="8" height="3" rx="1.5" fill="#bfe3b0" />
          {running && <animateMotion dur={`${CYCLE}s`} repeatCount="indefinite" keyPoints="1;1;0;0" keyTimes="0;0.585;0.8;1" calcMode="linear" rotate="0"><mpath href="#ol-route" /></animateMotion>}
          {running ? <animate attributeName="opacity" dur={`${CYCLE}s`} repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0;0.585;0.6;0.8;0.83;1" /> : null}
          {!running && <set attributeName="opacity" to="0" />}
        </g>
      </g>

      {/* ---- advice arrives: the phone's bubble, then the area alert ---- */}
      <g className="ol-show" style={a('ol-done')} opacity="0"><circle cx="228" cy="258" r="9" fill="#245a28" stroke="#fff" strokeWidth="2" /><path d="M223.5 258 l3 3 l6 -7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
      <g className="ol-show" style={a('ol-bubble')} opacity="0" filter="url(#ol-soft)">
        <path d="M236 206 h226 a10 10 0 0 1 10 10 v34 a10 10 0 0 1 -10 10 h-194 l-14 10 v-10 h-18 a10 10 0 0 1 -10 -10 v-34 a10 10 0 0 1 10 -10 z" fill="url(#ol-glass)" stroke="#c9d6c4" />
        <text x="248" y="226" fontSize="12.5" fontWeight="700" fill="#1c2b1f">{T('পাতার দাগ: ব্লাস্ট নয়, ছত্রাক', 'Leaf spots: a fungus, not blast')}</text>
        <text x="248" y="244" fontSize="10.5" fill="#3f4f43">{T('বৃষ্টির পর স্প্রে · অ্যাপে, এসএমএসে, ফোনে', 'Spray after the rain · app, SMS, call')}</text>
        <g transform="translate(436 236)"><rect x="0" y="-9" width="12" height="18" rx="2" fill="#1f2937" /><circle cx="22" cy="0" r="7" fill="#245a28" /><path d="M19 -2 q3 5 7 5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /></g>
      </g>
      {/* the alert ring from the office over the neighbours */}
      <g style={a('ol-wave')} opacity="0" transform="translate(488 246)"><circle r="150" fill="none" stroke="#f6c453" strokeWidth="3" /><circle r="110" fill="none" stroke="#f6c453" strokeWidth="2" opacity=".6" /></g>
      <g style={a('ol-bell')} opacity="0" filter="url(#ol-soft)">
        <rect x="300" y="148" width={bn ? 200 : 236} height="28" rx="14" fill="#1c2b1f" />
        <path d="M316 168 a6 6 0 0 0 6 -6 v-3 a6 6 0 0 0 -12 0 v3 a6 6 0 0 0 6 6 z M314 169 h4" fill="#f6c453" />
        <text x="330" y="166.5" fontSize="12" fontWeight="600" fill="#fff">{T('৩ জন, একই সমস্যা · একটাই পরামর্শ সবাইকে', '3 farmers, one problem · one advisory to all')}</text>
      </g>
      </g>
      <text x="40" y={TOP + 30} fontSize="10.5" fill="#1c2b1f" opacity=".6">{T('দৃশ্যটি উদাহরণ · তথ্যের ধরন লেবেলে', 'An illustration · data kinds as labelled')}</text>
    </svg>
  );
}

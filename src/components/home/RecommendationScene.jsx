/**
 * A small, illustrative explanation of how the recommendation is formed.
 * The field and timeline are conceptual; no measured field values are shown.
 */
export default function RecommendationScene({ T }) {
  return (
    <div
      className="recommendation-scene relative isolate aspect-[1.28] w-full overflow-hidden rounded-[24px] border border-[#d9e6d7] shadow-[var(--shadow-card)] sm:aspect-[1.55] lg:aspect-[1.5]"
      role="img"
      aria-label={T('২৫ মৌসুমের আবহাওয়া, মাটি ও পানির হিসাব থেকে ফসলের তিন ধরনের পরামর্শ', 'An illustration of 25 seasons of weather, soil and water informing three crop recommendations')}
    >
      <div className="recommendation-scene-glow absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#55715c] sm:text-[11px]">{T('মাঠের সিদ্ধান্ত', 'FIELD DECISION')}</p>
          <p className="mt-1 text-[15px] font-semibold tracking-[-.02em] text-[#173522] sm:text-[18px]">{T('২৫ মৌসুম · ৫ ফসল · ৩ সময়', '25 seasons · 5 crops · 3 dates')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/80 bg-white/65 px-2.5 py-1.5 text-[10px] font-semibold text-[#49634f] shadow-sm backdrop-blur sm:px-3 sm:text-[11px]">
          <span className="recommendation-live-dot h-1.5 w-1.5 rounded-full bg-[#3e8b50]" />
          {T('তথ্য থেকে পরামর্শ', 'DATA TO ADVICE')}
        </div>
      </div>

      <svg className="recommendation-landscape absolute inset-x-0 top-[12%] h-[70%] w-full" viewBox="0 0 800 390" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="recSky" x1="400" y1="0" x2="400" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#e7f1e8"/><stop offset=".58" stopColor="#f6f4df"/><stop offset="1" stopColor="#f3e6bf"/></linearGradient>
          <linearGradient id="recField" x1="402" y1="175" x2="403" y2="390" gradientUnits="userSpaceOnUse"><stop stopColor="#7cae65"/><stop offset=".48" stopColor="#52834d"/><stop offset="1" stopColor="#214d35"/></linearGradient>
          <radialGradient id="recSun" cx="0" cy="0" r="1" gradientTransform="matrix(0 122 -122 0 623 112)" gradientUnits="userSpaceOnUse"><stop stopColor="#fff9dc" stopOpacity=".95"/><stop offset=".35" stopColor="#fff0bb" stopOpacity=".46"/><stop offset="1" stopColor="#fff0bb" stopOpacity="0"/></radialGradient>
          <linearGradient id="recData" x1="80" y1="0" x2="700" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#3e8050" stopOpacity="0"/><stop offset=".52" stopColor="#f7fff0"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
        </defs>
        <path fill="url(#recSky)" d="M0 0h800v244H0z" />
        <circle cx="623" cy="112" r="122" fill="url(#recSun)" />
        <circle cx="623" cy="112" r="28" fill="#fff6ce" />
        <path d="M0 188c75-26 126-17 191 2 83 24 139-12 217-5 75 6 135 33 207 5 64-25 113-16 185 5v80H0v-87Z" fill="#a3bd8a" opacity=".55" />
        <path d="M0 210c89-28 147-15 224 3 80 18 140-12 213-5 73 7 121 24 188 3 73-23 117-10 175 6v66H0v-73Z" fill="#6f9869" opacity=".75" />
        <path d="M0 242c155-40 232-21 333-6 109 17 168-28 280-8 73 13 112 15 187-5v167H0V242Z" fill="url(#recField)" />
        {/* Soft contour lines make the scene read as planted plots, not a stock photo. */}
        <g stroke="#d2e4a5" strokeOpacity=".48" strokeWidth="2">
          <path d="M0 278c129-24 252-11 385 3 150 16 271-31 415-29" />
          <path d="M0 309c132-22 258-7 386 8 151 18 265-29 414-28" />
          <path d="M0 344c129-19 257 0 384 14 150 16 268-24 416-26" />
          <path d="M0 380c139-14 258 4 389 18 151 17 265-18 411-21" />
        </g>
        {/* Seedlings appear in staggered rows as the field settles into view. */}
        <g className="recommendation-sprouts" stroke="#edf4bd" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M125 311v-19m0 10c-13 0-17-10-18-17 11 0 17 5 18 14m0-1c11-1 15-9 15-16-10 1-15 5-15 13" />
          <path d="M265 295v-21m0 11c-13 0-18-10-18-18 11 0 17 5 18 14m0-1c12-1 16-9 16-17-10 1-15 6-16 14" />
          <path d="M410 315v-24m0 13c-14 0-19-11-19-20 12 0 18 6 19 16m0-1c13-1 17-10 17-18-11 1-16 6-17 15" />
          <path d="M552 290v-21m0 11c-13 0-17-10-18-18 11 0 17 5 18 14m0-1c12-1 16-9 16-17-10 1-15 5-16 14" />
          <path d="M691 307v-23m0 12c-13 0-18-10-18-19 11 0 17 6 18 15m0-1c12-1 16-9 16-17-10 1-15 5-16 14" />
        </g>
        {/* Animated comparison trace across the plots. */}
        <path className="recommendation-trace" d="M44 254c95-28 167 12 263-4 107-19 160-38 253-6 78 27 141 15 207-8" stroke="url(#recData)" strokeWidth="3" strokeDasharray="12 12" />
        <g fill="#f7f6db" stroke="#47764c" strokeWidth="2">
          <circle cx="126" cy="245" r="6"/><circle cx="267" cy="250" r="6"/><circle cx="410" cy="229" r="6"/><circle cx="560" cy="248" r="6"/><circle cx="700" cy="231" r="6"/>
        </g>
        <circle className="recommendation-signal" cx="410" cy="229" r="14" stroke="#fff8c8" strokeWidth="2" />
      </svg>

      <div className="absolute inset-x-3 bottom-3 z-10 grid grid-cols-3 gap-2 sm:inset-x-5 sm:bottom-5 sm:gap-3">
        {[
          ['KEEP', T('ফসল রাখুন', 'Keep crop'), '#246238', '#eaf4e8'],
          ['ADJUST', T('সময় বদলান', 'Adjust date'), '#95600c', '#fbf1dc'],
          ['SHIFT', T('ফসল বদলান', 'Shift crop'), '#17666b', '#e3f1ef'],
        ].map(([key, label, color, tint], i) => (
          <div key={key} className={`recommendation-choice recommendation-choice-${i + 1} min-w-0 rounded-[13px] border border-white/80 px-2.5 py-2.5 shadow-[0_8px_22px_rgba(21,51,34,.12)] backdrop-blur-md sm:rounded-[17px] sm:px-4 sm:py-3.5`} style={{ '--choice-color': color, '--choice-tint': tint }}>
            <span className="mb-1.5 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.13em] text-[#6c7f6e] sm:mb-2 sm:text-[9px]">
              <span className="recommendation-choice-mark h-1.5 w-1.5 rounded-full" />
              {T('সম্ভাব্য ফল', 'POSSIBLE OUTCOME')}
            </span>
            <span className="block truncate text-[12px] font-bold tracking-[-.02em] sm:text-[16px]" style={{ color }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

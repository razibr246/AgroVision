/** Lightweight decorative game-world scene for the Harvest Horizon teaser. */
export default function HarvestHorizonScene() {
  return (
    <svg className="harvest-horizon-scene absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="hh-sky" x1="760" y1="0" x2="760" y2="500" gradientUnits="userSpaceOnUse"><stop stopColor="#163c2c"/><stop offset=".52" stopColor="#47744a"/><stop offset="1" stopColor="#d39b50"/></linearGradient>
        <linearGradient id="hh-field" x1="934" y1="304" x2="1128" y2="737" gradientUnits="userSpaceOnUse"><stop stopColor="#6b9d54"/><stop offset="1" stopColor="#214c32"/></linearGradient>
        <radialGradient id="hh-sun" cx="0" cy="0" r="1" gradientTransform="matrix(0 275 -275 0 1110 226)" gradientUnits="userSpaceOnUse"><stop stopColor="#ffd981" stopOpacity=".9"/><stop offset=".35" stopColor="#f3bc62" stopOpacity=".32"/><stop offset="1" stopColor="#f3bc62" stopOpacity="0"/></radialGradient>
        <linearGradient id="hh-river" x1="984" y1="426" x2="1386" y2="573" gradientUnits="userSpaceOnUse"><stop stopColor="#6cb6a2" stopOpacity=".65"/><stop offset="1" stopColor="#92c9b1" stopOpacity=".1"/></linearGradient>
      </defs>
      <path fill="url(#hh-sky)" d="M0 0h1440v720H0z" />
      <circle cx="1110" cy="226" r="275" fill="url(#hh-sun)" />
      <circle cx="1110" cy="226" r="48" fill="#f8d47e" fillOpacity=".76" />
      <g className="hh-cloud hh-cloud-one" fill="#e8d69d" fillOpacity=".42">
        <ellipse cx="935" cy="145" rx="46" ry="12"/><ellipse cx="916" cy="141" rx="20" ry="17"/><ellipse cx="944" cy="136" rx="25" ry="21"/><ellipse cx="963" cy="143" rx="19" ry="13"/>
      </g>
      <g className="hh-cloud hh-cloud-two" fill="#e8d69d" fillOpacity=".3">
        <ellipse cx="1283" cy="112" rx="38" ry="10"/><ellipse cx="1267" cy="109" rx="17" ry="13"/><ellipse cx="1288" cy="105" rx="21" ry="17"/><ellipse cx="1303" cy="111" rx="17" ry="10"/>
      </g>
      {/* Tree line, village roofs and a small field shelter */}
      <path d="M0 366c86-37 135-15 203-28 65-13 114-45 189-25 71 19 126 12 203-4 71-15 108 30 180 18 77-13 128-40 213-12 81 27 130-3 204-12 87-10 158 30 248 4v170H0V366Z" fill="#214b35" fillOpacity=".74"/>
      <g fill="#173a2b" fillOpacity=".92">
        <path d="M76 347c-2-39 15-62 34-73 17 20 26 42 19 73h-53Z"/><path d="M103 348c0-52 23-85 48-97 22 25 30 58 19 97h-67Z"/>
        <path d="M267 331c0-45 20-71 43-83 21 22 28 49 20 83h-63Z"/><path d="M1328 343c0-52 21-79 48-95 24 24 32 58 21 95h-69Z"/>
        <path d="M1178 350v-74l43-31 48 31v74h-91Z" fill="#805633"/><path d="m1166 280 55-44 61 44h-116Z" fill="#b77c45"/><path d="M1210 298h22v52h-22z" fill="#294d39"/>
      </g>
      {/* Terraced field plots in the game's isometric perspective */}
      <path d="m520 452 477-161 443 127v302H520V452Z" fill="url(#hh-field)"/>
      <path d="m520 452 477-161 443 127" stroke="#c2d58a" strokeOpacity=".26" strokeWidth="3"/>
      <g stroke="#d6d991" strokeOpacity=".28" strokeWidth="2">
        <path d="m520 505 477-151 443 127"/><path d="m520 561 477-141 443 127"/><path d="m520 620 477-130 443 127"/><path d="m520 679 477-120 443 127"/>
        <path d="m655 720 458-429M807 720l391-385M968 720l325-340M1131 720l249-306M1291 720l169-265"/>
      </g>
      {/* Irrigation channel catches the late light between plots. */}
      <path d="m892 400 130-41 107 33-131 46-106-38Z" fill="url(#hh-river)"/>
      <path d="m923 400 95-30m-46 49 96-31" stroke="#b7ddbb" strokeOpacity=".52" strokeWidth="2" strokeLinecap="round"/>
      {/* Crop tufts sway gently above the field rows. */}
      <g className="hh-crops" stroke="#d1e88a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M704 494v-25m0 15c-18 0-24-14-25-25 15 1 23 8 25 20m0-1c16-2 22-14 22-24-14 1-21 8-22 19"/>
        <path d="M864 467v-29m0 17c-19 0-25-15-26-27 16 1 24 9 26 22m0-1c17-2 23-15 23-26-14 1-22 8-23 20"/>
        <path d="M1048 491v-35m0 20c-21 0-28-16-29-29 17 1 27 10 29 24m0-1c19-2 26-17 26-29-16 1-24 9-26 23"/>
        <path d="M1233 462v-31m0 18c-19 0-25-14-26-27 16 1 24 9 26 22m0-1c17-2 23-15 23-26-14 1-21 8-23 20"/>
        <path d="M1382 492v-39m0 23c-22 0-29-17-30-31 18 1 28 10 30 25m0-1c20-2 27-18 27-31-16 1-25 9-27 24"/>
      </g>
      <g className="hh-crops hh-crops-back" stroke="#a9ce72" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".8">
        <path d="M620 427v-22m0 13c-14 0-19-11-20-20 12 1 18 7 20 16m0-1c13-1 18-11 18-20-11 1-17 6-18 15"/>
        <path d="M961 397v-23m0 14c-15 0-20-12-21-21 13 1 19 7 21 17m0-1c14-1 19-12 19-21-12 1-18 7-19 16"/>
        <path d="M1158 411v-25m0 15c-16 0-21-12-22-22 13 1 20 8 22 18m0-1c14-1 19-12 20-22-12 1-18 7-20 17"/>
        <path d="M1320 421v-24m0 14c-15 0-20-12-21-21 13 1 19 7 21 17m0-1c14-1 19-12 19-21-12 1-18 7-19 16"/>
      </g>
      {/* A farmer checks the new planting; the small idle animation keeps the scene calm. */}
      <g className="hh-farmer">
        <ellipse cx="1105" cy="548" rx="17" ry="5" fill="#102a20" fillOpacity=".48"/>
        <path d="m1098 511 5-20 15 3 2 21-22-4Z" fill="#edc067"/><path d="m1099 513 20 2-3 26-18-3 1-25Z" fill="#2f6e4b"/>
        <path d="m1100 539-5 14m18-12 4 13" stroke="#d8c394" strokeWidth="5" strokeLinecap="round"/>
        <path d="m1100 517-12 15m30-13 8 8" stroke="#e0c28b" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="1107" cy="485" r="9" fill="#b9794c"/><path d="M1095 484c2-11 23-13 25-1l-25 1Z" fill="#edc067"/><path d="M1093 484h29" stroke="#b78029" strokeWidth="3" strokeLinecap="round"/>
      </g>
      <g fill="#edc067" opacity=".8"><circle className="hh-firefly hh-firefly-one" cx="1008" cy="326" r="3"/><circle className="hh-firefly hh-firefly-two" cx="1262" cy="378" r="2.5"/><circle className="hh-firefly hh-firefly-three" cx="1350" cy="299" r="2"/></g>
    </svg>
  );
}

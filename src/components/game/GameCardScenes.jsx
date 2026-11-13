/** Small, decorative scenes for the games hub cards. */
export default function GameCardScene({ game }) {
  if (game === 'kids') return <DreamFieldsScene />;
  if (game === 'people') return <FacesScene />;
  if (game === 'play') return <SeasonShowdownScene />;
  return <SevenFieldsScene />;
}

export function GameStoryScene() {
  return (
    <svg viewBox="0 0 1440 620" preserveAspectRatio="xMidYMid slice" className="game-story-scene absolute inset-0 -z-10 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="story-sky" x1="720" y1="0" x2="720" y2="620" gradientUnits="userSpaceOnUse"><stop stopColor="#273d45"/><stop offset=".5" stopColor="#9b9a69"/><stop offset="1" stopColor="#d5ad68"/></linearGradient>
        <linearGradient id="story-water" x1="710" y1="280" x2="730" y2="620" gradientUnits="userSpaceOnUse"><stop stopColor="#668f8a"/><stop offset="1" stopColor="#244e4c"/></linearGradient>
        <radialGradient id="story-sun"><stop stopColor="#ffe9a5" stopOpacity=".84"/><stop offset="1" stopColor="#ffe9a5" stopOpacity="0"/></radialGradient>
      </defs>
      <path fill="url(#story-sky)" d="M0 0h1440v620H0z"/><circle cx="1124" cy="180" r="250" fill="url(#story-sun)"/><circle cx="1124" cy="180" r="43" fill="#ffe7a2" fillOpacity=".75"/>
      <path d="M0 237c155-67 250-12 399-53 126-34 230 24 359-11 133-36 261-8 370-35 116-29 200 3 312-24v190H0V237Z" fill="#3c5b42"/>
      <path d="M0 282c134-39 249 7 386-25 150-35 266 26 405-7 133-31 250-8 368-21 103-12 185 6 281-22v141H0V282Z" fill="#59764a"/>
      <path d="M0 320h1440v300H0z" fill="url(#story-water)"/>
      <g className="story-water-lines" stroke="#c3d9b3" strokeOpacity=".28" strokeWidth="2"><path d="M840 353c128-15 239 12 414-5m-517 45c166-15 325 14 575-5m-398 43c138-10 250 10 405-3m-548 47c182-16 345 9 576-5"/></g>
      {/* Bridge, old family land and the river carried through the story. */}
      <path d="M0 352h1440v29H0z" fill="#b29d77"/><path d="M0 380h1440v10H0z" fill="#3d4b42"/>
      <g fill="#6b6555"><path d="M155 352V206h34v146Zm-22-146 39-30 39 30h-78Zm453 146V183h38v169Zm-25-169 44-34 44 34h-88Zm612 169V206h36v146Zm-22-146 40-31 40 31h-80Z"/></g>
      <g stroke="#d5bd8e" strokeWidth="5" opacity=".86"><path d="M0 339h1440M0 321h1440"/><path d="M0 290v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62m90-62v62"/></g>
      <g className="story-crops" fill="#a7c46a"><path d="M57 294v-35m0 21c-18 0-24-14-25-25 15 1 23 9 25 20m0-1c17-1 23-14 23-24-15 1-21 8-23 19"/><path d="M302 277v-34m0 20c-18 0-24-13-25-24 15 1 23 8 25 19m0-1c16-1 22-13 22-23-14 1-21 8-22 18"/><path d="M1310 282v-37m0 22c-19 0-25-14-26-26 16 1 24 9 26 21m0-1c17-2 23-15 23-25-15 1-22 8-23 19"/></g>
      {/* A notebook and a ten-season trail sit in the foreground as the light moves. */}
      <g className="story-notebook" transform="translate(1050 414) rotate(-8)">
        <rect width="118" height="145" rx="8" fill="#e9d39d"/><path d="M12 0v145" stroke="#b78043" strokeWidth="5"/><path d="M26 33h74M26 53h66M26 73h72M26 93h54" stroke="#738360" strokeWidth="3" strokeLinecap="round"/><path d="M85 145v-29l12 10 12-10v29" fill="#c7694b"/>
      </g>
      <path className="story-time-path" d="M1060 574c-110-51-205-55-319-34-91 17-162 10-247-13" stroke="#f3cf79" strokeWidth="3" strokeDasharray="5 12" strokeLinecap="round"/>
      <g className="story-time-dots" fill="#ffe6a0"><circle cx="1060" cy="574" r="5"/><circle cx="934" cy="546" r="4"/><circle cx="799" cy="541" r="4"/><circle cx="660" cy="527" r="4"/><circle cx="510" cy="527" r="5"/></g>
    </svg>
  );
}

function DreamFieldsScene() {
  return (
    <svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" className="game-card-scene game-card-dream absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="dream-sky" x1="470" y1="0" x2="470" y2="520" gradientUnits="userSpaceOnUse"><stop stopColor="#563f83"/><stop offset=".42" stopColor="#ed9b9c"/><stop offset=".7" stopColor="#f6c47b"/><stop offset="1" stopColor="#427451"/></linearGradient>
        <linearGradient id="dream-hill" x1="450" y1="327" x2="500" y2="540" gradientUnits="userSpaceOnUse"><stop stopColor="#7db65b"/><stop offset="1" stopColor="#285844"/></linearGradient>
        <radialGradient id="dream-moon"><stop stopColor="#fff6cf" stopOpacity=".85"/><stop offset="1" stopColor="#fff6cf" stopOpacity="0"/></radialGradient>
      </defs>
      <path fill="url(#dream-sky)" d="M0 0h960v540H0z"/><circle cx="196" cy="196" r="125" fill="url(#dream-moon)"/><circle cx="196" cy="196" r="37" fill="#fff2c2"/>
      <g fill="#fff8db" opacity=".8"><circle cx="94" cy="108" r="2"/><circle cx="279" cy="79" r="2.5"/><circle cx="381" cy="161" r="1.8"/><circle cx="745" cy="95" r="2.2"/><circle cx="858" cy="183" r="1.8"/></g>
      <g className="gcs-cloud gcs-cloud-a" fill="#ffe3d1" opacity=".58"><ellipse cx="457" cy="190" rx="81" ry="20"/><ellipse cx="431" cy="184" rx="34" ry="25"/><ellipse cx="472" cy="177" rx="39" ry="31"/><ellipse cx="505" cy="188" rx="34" ry="19"/></g>
      <g className="gcs-cloud gcs-cloud-b" fill="#f5bfd2" opacity=".5"><ellipse cx="794" cy="253" rx="72" ry="17"/><ellipse cx="770" cy="247" rx="28" ry="24"/><ellipse cx="805" cy="241" rx="34" ry="29"/><ellipse cx="831" cy="251" rx="31" ry="17"/></g>
      <path d="M0 355c115-63 210-39 315-63 107-24 163 17 263-10 106-28 205-3 382-47v305H0V355Z" fill="#4a7050"/>
      <path d="M0 402c124-70 233-27 365-56 136-29 218 7 339-25 101-27 163-2 256-43v262H0V402Z" fill="url(#dream-hill)"/>
      <path d="M0 467c184-61 309-35 466-55 183-24 323-9 494-68v196H0V467Z" fill="#326348"/>
      <g fill="#b4d46d" opacity=".82"><path d="M96 540v-60m0 37c-26 0-34-18-35-34 22 1 32 12 35 28m0-2c22-2 31-18 32-32-20 1-29 10-32 25"/><path d="M210 540v-73m0 43c-28 0-37-21-38-39 24 2 35 13 38 32m0-2c24-2 34-20 35-37-22 1-32 12-35 29"/><path d="M772 540v-62m0 38c-26 0-35-19-36-35 23 1 33 12 36 29m0-2c23-2 32-19 33-33-20 1-30 11-33 26"/><path d="M877 540v-78m0 46c-29 0-39-22-40-41 25 2 37 14 40 33m0-2c25-2 35-21 36-39-23 2-33 12-36 31"/></g>
      {/* Tara's satellite friend floats above the field. */}
      <g className="gcs-satellite">
        <path d="M615 211 561 178l-5 33 54 17m22-17 54-34 5 33-54 18" fill="#4c8d9b" stroke="#b9e7e0" strokeWidth="3"/>
        <path d="m570 181 42 26m-48-5 47 10m30-6 47-26m-42 41 46-11" stroke="#bde5d6" strokeWidth="2"/>
        <rect x="608" y="187" width="42" height="53" rx="18" fill="#f3f1df" stroke="#80d8dc" strokeWidth="4"/><path d="M620 187c2-14 16-19 19 0" stroke="#e8f7e9" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="622" cy="211" r="4" fill="#356287"/><circle cx="638" cy="211" r="4" fill="#356287"/><path d="M621 224c5 5 12 5 17 0" stroke="#e88e80" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="630" cy="178" r="4" fill="#fff1a1" className="gcs-beacon"/>
      </g>
      {/* A child dreams into flight, arms reaching toward Tara. */}
      <g className="gcs-child">
        <path d="m347 258-38-34m38 34 43-15" stroke="#8f573d" strokeWidth="14" strokeLinecap="round"/>
        <path d="m347 253-29 44 32 22 27-41-30-25Z" fill="#e64d78"/><path d="m350 316-31 38m42-39 37 17" stroke="#f2c18a" strokeWidth="13" strokeLinecap="round"/>
        <circle cx="349" cy="237" r="20" fill="#b87550"/><path d="M329 236c0-28 43-30 43-2-12-7-25-9-43 2Z" fill="#211c2d"/><path d="M331 248c-9 1-13 9-15 17m43-19c11 1 15 9 16 17" stroke="#221b2c" strokeWidth="5" strokeLinecap="round"/>
        <path d="M315 271c-19-6-32-20-41-34m68 33c18-12 28-25 38-42" stroke="#f0a4b0" strokeWidth="4" strokeLinecap="round"/>
      </g>
      <path className="gcs-flight-path" d="M373 250c60-53 125-62 213-20" stroke="#fff0b7" strokeWidth="2" strokeDasharray="5 10" strokeLinecap="round"/>
      <g className="gcs-fireflies" fill="#ffe69b"><circle cx="520" cy="340" r="3"/><circle cx="692" cy="365" r="2.5"/><circle cx="426" cy="387" r="2"/></g>
    </svg>
  );
}

function FacesScene() {
  const people = [
    { x: 95, y: 325, s: 1.02, skin: '#a96e4d', cloth: '#d45f45', hat: '#d7a54f' },
    { x: 202, y: 346, s: .88, skin: '#8b563c', cloth: '#378477', hat: '#c53f45' },
    { x: 314, y: 324, s: 1.08, skin: '#b87a54', cloth: '#e0ae42', hat: '#416e54' },
    { x: 426, y: 340, s: .93, skin: '#754934', cloth: '#915e9b', hat: '#e0c278' },
    { x: 536, y: 319, s: 1.06, skin: '#c4875f', cloth: '#39719a', hat: '#ad6544' },
    { x: 650, y: 344, s: .91, skin: '#9b6141', cloth: '#d45d78', hat: '#4e754d' },
    { x: 760, y: 324, s: 1.04, skin: '#b87954', cloth: '#c28d3c', hat: '#a34c48' },
    { x: 867, y: 344, s: .9, skin: '#83543c', cloth: '#398c78', hat: '#dfb660' },
  ];
  return (
    <svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" className="game-card-scene game-card-faces absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="faces-sky" x1="480" y1="0" x2="480" y2="380" gradientUnits="userSpaceOnUse"><stop stopColor="#f5c98c"/><stop offset=".54" stopColor="#f3dfad"/><stop offset="1" stopColor="#87aa6b"/></linearGradient>
        <linearGradient id="faces-field" x1="480" y1="290" x2="480" y2="540" gradientUnits="userSpaceOnUse"><stop stopColor="#9bb755"/><stop offset="1" stopColor="#426d3e"/></linearGradient>
      </defs>
      <path fill="url(#faces-sky)" d="M0 0h960v540H0z"/><circle cx="721" cy="148" r="71" fill="#fff0bb" fillOpacity=".78"/>
      <path d="M0 273c129-100 230-33 325-73 88-36 173-16 249 15 73 29 135-26 202-23 72 3 118 35 184 19v184H0V273Z" fill="#627e63"/>
      <path d="M0 317c110-60 207-38 326-64 123-26 211 2 329 15 113 12 190-38 305-18v290H0V317Z" fill="url(#faces-field)"/>
      <g stroke="#dbe28e" strokeOpacity=".44" strokeWidth="3"><path d="M0 380c180-48 342-26 491-12 170 17 312-27 469-20"/><path d="M0 428c180-39 341-17 493-2 173 17 310-18 467-14"/><path d="M0 478c183-32 343-9 492 5 174 16 313-10 468-8"/></g>
      <g fill="#305a3c" opacity=".65"><path d="M31 296c2-47 19-75 42-90 22 22 31 52 26 90H31Z"/><path d="M126 282c3-38 17-60 37-74 20 18 27 43 24 74h-61Z"/><path d="M828 291c2-44 18-70 41-85 22 21 30 48 26 85h-67Z"/><path d="M906 278c2-36 16-58 35-71 18 17 25 41 22 71h-57Z"/></g>
      {/* A welcoming, stylized gathering of farmers and young growers. */}
      <g className="gcs-people">
        {people.map((p, i) => (
          <g key={p.x} transform={`translate(${p.x} ${p.y}) scale(${p.s})`} className={`gcs-person gcs-person-${i + 1}`}>
            <ellipse cy="156" rx="27" ry="7" fill="#183a2b" fillOpacity=".25"/>
            <path d="M-22 74Q0 61 22 74l10 75h-64l10-75Z" fill={p.cloth}/>
            <path d="M-12 135h12v22h-15m25-22h12l4 22H12" fill="#543e32"/>
            <path d="M-13 79-34 121m47-42 22 38" stroke={p.skin} strokeWidth="10" strokeLinecap="round"/>
            <rect x="-9" y="53" width="18" height="24" rx="8" fill={p.skin}/>
            <ellipse cy="34" rx="21" ry="25" fill={p.skin}/>
            <path d="M-23 30c3-29 42-32 47-2-17-8-32-9-47 2Z" fill={p.hat}/>
            <path d="M-27 30h54" stroke={p.hat} strokeWidth="6" strokeLinecap="round"/>
            <circle cx="-7" cy="36" r="2" fill="#271f1b"/><circle cx="7" cy="36" r="2" fill="#271f1b"/>
            <path d="M-5 46q5 4 10 0" stroke="#633d30" strokeWidth="1.8" strokeLinecap="round"/>
          </g>
        ))}
      </g>
      <g className="gcs-field-glints" fill="#f6db83"><circle cx="126" cy="408" r="2.5"/><circle cx="293" cy="447" r="2"/><circle cx="726" cy="392" r="2.5"/><circle cx="850" cy="451" r="2"/></g>
    </svg>
  );
}

function SeasonShowdownScene() {
  return (
    <svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" className="game-card-scene game-card-showdown absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="showdown-sky" x1="480" y1="0" x2="480" y2="540" gradientUnits="userSpaceOnUse"><stop stopColor="#e9a45e"/><stop offset=".48" stopColor="#e9c77e"/><stop offset="1" stopColor="#456d43"/></linearGradient>
        <radialGradient id="showdown-sun"><stop stopColor="#fff1bd" stopOpacity=".9"/><stop offset="1" stopColor="#fff1bd" stopOpacity="0"/></radialGradient>
      </defs>
      <path fill="url(#showdown-sky)" d="M0 0h960v540H0z"/><circle cx="763" cy="164" r="178" fill="url(#showdown-sun)"/><circle cx="763" cy="164" r="33" fill="#fff0b9"/>
      <path d="M0 302c102-60 193-38 282-54 111-21 197 15 300-5 115-22 218-9 378-45v342H0V302Z" fill="#72904f"/>
      <path d="M0 371c164-61 294-25 430-53 145-29 313 8 530-54v276H0V371Z" fill="#426f43"/>
      <g stroke="#c5d679" strokeOpacity=".58" strokeWidth="3"><path d="M0 413c186-45 331-23 480-43 166-22 309 4 480-40"/><path d="M0 465c187-41 330-16 481-36 168-22 308 3 479-32"/><path d="M0 518c188-35 331-9 481-28 170-21 308 1 479-25"/></g>
      <g className="showdown-cloud" fill="#dce1d2" fillOpacity=".9"><ellipse cx="333" cy="153" rx="71" ry="20"/><ellipse cx="308" cy="147" rx="30" ry="25"/><ellipse cx="348" cy="141" rx="38" ry="30"/><ellipse cx="379" cy="152" rx="29" ry="20"/></g>
      <g className="showdown-rain" stroke="#b5dce0" strokeWidth="4" strokeLinecap="round"><path d="m301 186-9 20m37-20-9 20m39-20-9 20m37-20-9 20"/></g>
      <g className="showdown-crops" stroke="#c5df7d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M116 450v-31m0 19c-19 0-25-14-26-26 16 1 24 9 26 21m0-1c17-2 23-15 23-25-15 1-22 8-23 20"/><path d="M249 426v-37m0 22c-20 0-26-15-27-28 17 1 25 10 27 23m0-1c18-2 24-16 24-27-15 1-23 9-24 21"/><path d="M688 436v-34m0 20c-19 0-25-14-26-26 16 1 24 9 26 21m0-1c17-2 23-15 23-25-14 1-22 8-23 20"/><path d="M841 400v-41m0 25c-22 0-29-17-30-31 18 1 28 11 30 26m0-2c19-2 26-17 26-30-16 1-24 9-26 23"/></g>
      {/* Small weather emblems orbit the field: rain, sun and a warning cloud. */}
      <g className="showdown-weather showdown-weather-one"><circle cx="184" cy="201" r="26" fill="#f5d47b" fillOpacity=".92"/><path d="M184 185v32m-16-16h32m-27-11 22 22m0-22-22 22" stroke="#fff4ca" strokeWidth="2.5" strokeLinecap="round"/></g>
      <g className="showdown-weather showdown-weather-two"><path d="M584 196c0-15 12-26 27-26 12 0 21 7 25 17 13 0 23 10 23 22 0 13-10 22-24 22h-50c-13 0-23-9-23-21 0-10 8-19 22-21Z" fill="#5a6470"/><path d="m600 237-7 17m31-17-7 17m31-17-7 17" stroke="#d0e4e8" strokeWidth="4" strokeLinecap="round"/></g>
      <circle className="showdown-warning" cx="640" cy="176" r="43" stroke="#f5d47b" strokeWidth="2" strokeDasharray="4 7"/>
      <path className="showdown-route" d="M197 267c127-42 253-43 405-16" stroke="#fff2c3" strokeWidth="2" strokeDasharray="5 9" strokeLinecap="round"/>
    </svg>
  );
}

function SevenFieldsScene() {
  const cells = [[499, 126], [447, 191], [550, 212], [390, 274], [492, 292], [588, 318], [443, 382]];
  return (
    <svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" className="game-card-scene game-card-seven absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="seven-sky" x1="480" y1="0" x2="480" y2="540" gradientUnits="userSpaceOnUse"><stop stopColor="#557d82"/><stop offset=".6" stopColor="#b9b977"/><stop offset="1" stopColor="#486f47"/></linearGradient>
        <linearGradient id="seven-map" x1="491" y1="128" x2="483" y2="421" gradientUnits="userSpaceOnUse"><stop stopColor="#d6cf83"/><stop offset="1" stopColor="#6d9e58"/></linearGradient>
        <radialGradient id="seven-glow"><stop stopColor="#ffe49a" stopOpacity=".8"/><stop offset="1" stopColor="#ffe49a" stopOpacity="0"/></radialGradient>
      </defs>
      <path fill="url(#seven-sky)" d="M0 0h960v540H0z"/><circle cx="763" cy="146" r="200" fill="url(#seven-glow)"/>
      <path d="M0 307c132-66 242-24 350-59 132-42 215 11 340-19 96-22 169 5 270-33v344H0V307Z" fill="#345c42"/>
      <path d="M0 383c127-55 239-23 366-50 127-27 237 12 361-20 86-22 150-3 233-32v259H0V383Z" fill="#54804a"/>
      {/* Seven linked field tiles, drawn as an abstract mission map rather than a geographic claim. */}
      <path d="m505 103 104 51 21 94-35 98-83 91-95-51-42-93 39-104 91-86Z" fill="url(#seven-map)" stroke="#f3e4ae" strokeWidth="4" strokeLinejoin="round"/>
      <g className="seven-grid" stroke="#f7edc7" strokeOpacity=".5" strokeWidth="2"><path d="m505 103-3 334m-127-244 255 55m-273 47 238 51m-176-198 201 202"/></g>
      <path className="seven-route" d="M499 139 465 203l83 9-158 63 102 17 96 26-95 65" stroke="#fff0ae" strokeWidth="3" strokeDasharray="5 9" strokeLinecap="round" strokeLinejoin="round"/>
      {cells.map(([x, y], i) => (
        <g key={i} className={`seven-cell seven-cell-${i + 1}`}>
          <circle cx={x} cy={y} r="17" fill={i === 3 ? '#d58d42' : i === 5 ? '#3f9291' : '#397849'} stroke="#f9f0ca" strokeWidth="3"/>
          <circle cx={x} cy={y} r="5" fill="#fff7d9"/>
          <circle className="seven-cell-pulse" cx={x} cy={y} r="24" stroke="#ffe7a0" strokeWidth="2"/>
        </g>
      ))}
      <g className="seven-satellite" transform="translate(739 174)"><path d="M-35-8h-24v24h24m70-24h24v24H35" fill="#3d8290" stroke="#d4efdc" strokeWidth="3"/><rect x="-22" y="-19" width="44" height="45" rx="12" fill="#e8e5c8" stroke="#b5e1d1" strokeWidth="3"/><circle cx="-8" cy="1" r="3" fill="#42697a"/><circle cx="8" cy="1" r="3" fill="#42697a"/><path d="M-7 12q7 6 14 0" stroke="#ca8267" strokeWidth="2.5" strokeLinecap="round"/></g>
      <g fill="#f7dc92"><circle cx="708" cy="287" r="3"/><circle cx="816" cy="352" r="2.5"/><circle cx="669" cy="401" r="2"/></g>
    </svg>
  );
}

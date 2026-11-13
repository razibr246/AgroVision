/** Small, decorative scenes for the games hub cards. */
export default function GameCardScene({ game }) {
  return game === 'kids' ? <DreamFieldsScene /> : <FacesScene />;
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

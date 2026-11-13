/** Decorative view of satellite observations resolving into distinct data layers. */
export default function DataLayersScene() {
  return (
    <svg viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid slice" className="data-layers-scene absolute inset-0 -z-10 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="data-earth" x1="720" y1="0" x2="720" y2="760" gradientUnits="userSpaceOnUse"><stop stopColor="#15382b"/><stop offset=".62" stopColor="#1d4a36"/><stop offset="1" stopColor="#0d2c22"/></linearGradient>
        <radialGradient id="data-glow"><stop stopColor="#6caa76" stopOpacity=".34"/><stop offset="1" stopColor="#6caa76" stopOpacity="0"/></radialGradient>
        <linearGradient id="data-scan" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#d5b65d" stopOpacity="0"/><stop offset=".5" stopColor="#d5b65d" stopOpacity=".7"/><stop offset="1" stopColor="#83c7ad" stopOpacity="0"/></linearGradient>
        <pattern id="data-grid" width="88" height="62" patternUnits="userSpaceOnUse"><path d="M88 0H0v62" fill="none" stroke="#b6d1a4" strokeOpacity=".14" strokeWidth="1"/></pattern>
      </defs>
      <path fill="url(#data-earth)" d="M0 0h1440v760H0z"/>
      <circle cx="1090" cy="260" r="460" fill="url(#data-glow)"/>
      {/* Contoured farmland seen from orbit */}
      <path d="M0 156c122 42 205 33 291 67 89 35 145 12 246 35 96 22 173 75 262 70 102-5 155-66 247-44 116 28 214 93 394 32v444H0V156Z" fill="#28593d" fillOpacity=".64"/>
      <path d="M0 232c129 47 205 31 293 69 89 38 171 32 250 52 91 24 161 65 256 62 101-4 164-53 247-32 112 27 215 89 394 39v338H0V232Z" fill="#356846" fillOpacity=".54"/>
      <g className="data-contours" fill="none" stroke="#b6d88f" strokeOpacity=".34" strokeWidth="2">
        <path d="M-60 171c142 14 175 64 300 69 119 5 173 53 296 52 147-1 187-67 321-34 117 29 180 90 332 73 101-11 171 4 311 47"/>
        <path d="M-50 207c143 14 176 64 301 69 119 5 173 53 296 52 147-1 187-67 321-34 117 29 180 90 332 73 101-11 171 4 311 47"/>
        <path d="M-35 247c144 14 177 64 302 69 119 5 173 53 296 52 147-1 187-67 321-34 117 29 180 90 332 73 101-11 171 4 311 47"/>
        <path d="M-10 292c144 14 177 64 302 69 119 5 173 53 296 52 147-1 187-67 321-34 117 29 180 90 332 73 101-11 171 4 311 47"/>
      </g>
      <path d="M0 0h1440v760H0z" fill="url(#data-grid)"/>
      {/* Agricultural parcels glow under the passing sensor */}
      <g className="data-parcels" stroke="#d1d889" strokeWidth="2">
        <path d="m180 371 112-36 76 29-116 39-72-32Z" fill="#b1b967" fillOpacity=".68"/>
        <path d="m376 425 130-40 93 35-136 45-87-40Z" fill="#88b779" fillOpacity=".7"/>
        <path d="m656 385 126-39 90 33-131 44-85-38Z" fill="#b5bf6b" fillOpacity=".62"/>
        <path d="m935 455 135-42 101 38-140 47-96-43Z" fill="#8eb77a" fillOpacity=".72"/>
        <path d="m276 526 127-40 85 31-132 44-80-35Z" fill="#79a76d" fillOpacity=".58"/>
        <path d="m710 547 143-44 95 36-147 48-91-40Z" fill="#c1be6e" fillOpacity=".62"/>
      </g>
      {/* Scanner track and its moving light curtain */}
      <path d="M226 91c240-68 516-23 724 112 129 84 222 187 325 329" stroke="#edc067" strokeOpacity=".48" strokeWidth="2" strokeDasharray="6 12" fill="none"/>
      <path className="data-scan-beam" d="m1008 202 432 284v108L936 234Z" fill="url(#data-scan)" fillOpacity=".22"/>
      <path className="data-scan-line" d="M970 207 1440 516" stroke="#edc067" strokeWidth="2" strokeOpacity=".85"/>
      <g className="data-satellite" transform="translate(952 192)">
        <path d="M-32-7h-46v32h46m64-32h46v32H32" fill="#39869a" stroke="#c5e6d4" strokeWidth="3"/>
        <path d="m-70-7 30 32m-30 0 30-32m40-7 30 39m-30 0 30-39m40 7 30 32m-30 0 30-32m40-7 30 39m-30 0 30-39" stroke="#b8e1d0" strokeWidth="2"/>
        <rect x="-24" y="-22" width="48" height="60" rx="12" fill="#e5e8d2" stroke="#f0d07c" strokeWidth="3"/>
        <path d="M-12-22c2-18 22-19 24 0" stroke="#c5e6d4" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="-8" cy="1" r="3" fill="#397a8a"/><circle cx="8" cy="1" r="3" fill="#397a8a"/><path d="M-7 13q7 5 14 0" stroke="#9d6950" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="0" cy="-31" r="5" fill="#edc067" className="data-beacon"/>
      </g>
      {/* Observation traces resolve into separate, clearly bounded layers */}
      <g className="data-streams" fill="none" strokeLinecap="round">
        <path d="M996 247c100 75 158 104 254 121" stroke="#d4c078" strokeWidth="2" strokeDasharray="4 10"/>
        <path d="M1002 257c80 118 125 193 218 244" stroke="#77c0ad" strokeWidth="2" strokeDasharray="4 10"/>
        <path d="M986 261c34 139 47 221 122 326" stroke="#9cc77c" strokeWidth="2" strokeDasharray="4 10"/>
      </g>
      <g className="data-nodes" stroke="#f0d07c" strokeWidth="2"><circle cx="1250" cy="368" r="9"/><circle cx="1220" cy="501" r="9"/><circle cx="1108" cy="587" r="9"/></g>
      <g className="data-layer-pulses" fill="none" stroke="#edc067"><circle cx="1250" cy="368" r="19"/><circle cx="1220" cy="501" r="19"/><circle cx="1108" cy="587" r="19"/></g>
    </svg>
  );
}

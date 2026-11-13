import { useId } from 'react';

const MOOD = {
  choose: { sky: ['#426c76', '#e7b66d'], ground: '#608b4d', field: '#356b43', accent: '#e8c46d' },
  glut: { sky: ['#536f77', '#deae72'], ground: '#718b4d', field: '#4b7444', accent: '#e9c879' },
  blight: { sky: ['#536c78', '#a9b3a0'], ground: '#70804c', field: '#426845', accent: '#bdd0a5' },
  dry: { sky: ['#b87749', '#f1cb77'], ground: '#a38648', field: '#65743c', accent: '#f0d47e' },
  storm: { sky: ['#35485d', '#85928b'], ground: '#63794a', field: '#3d6844', accent: '#c2d9c8' },
  bugs: { sky: ['#334f5a', '#c38e60'], ground: '#5d7948', field: '#386344', accent: '#e4bf70' },
};

const SCENE_ID = { choose: 0, glut: 1, blight: 2, dry: 3, storm: 4, bugs: 5 };

/** Illustrated, month-specific scenery for the six short Rabi game chapters. */
export default function PlaySeasonScene({ scene, thumbnail = false }) {
  const uid = useId().replace(/:/g, '');
  const mood = MOOD[scene.id] ?? MOOD.choose;
  const chapter = SCENE_ID[scene.id] ?? 0;
  return (
    <svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" className={`play-season-scene play-season-${scene.id} absolute inset-0 h-full w-full ${thumbnail ? 'is-thumbnail' : ''}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="480" y1="0" x2="480" y2="540" gradientUnits="userSpaceOnUse"><stop stopColor={mood.sky[0]}/><stop offset=".62" stopColor={mood.sky[1]}/><stop offset="1" stopColor={mood.ground}/></linearGradient>
        <linearGradient id={`${uid}-field`} x1="480" y1="290" x2="480" y2="540" gradientUnits="userSpaceOnUse"><stop stopColor={mood.ground}/><stop offset="1" stopColor={mood.field}/></linearGradient>
        <radialGradient id={`${uid}-sun`}><stop stopColor={mood.accent} stopOpacity=".7"/><stop offset="1" stopColor={mood.accent} stopOpacity="0"/></radialGradient>
      </defs>
      <path fill={`url(#${uid}-sky)`} d="M0 0h960v540H0z"/>
      <circle cx="758" cy="152" r="205" fill={`url(#${uid}-sun)`}/>
      <circle className="ps-sun-core" cx="758" cy="152" r={scene.id === 'dry' ? 43 : 31} fill={mood.accent} fillOpacity=".72"/>
      <path d="M0 290c106-55 207-25 322-58 112-33 202 14 308-8 112-24 214-12 330-48v364H0V290Z" fill="#314f3c" fillOpacity=".78"/>
      <path d="M0 356c130-57 257-24 380-48 136-27 263 13 389-23 68-19 128-22 191-36v291H0V356Z" fill={`url(#${uid}-field)`}/>
      <g stroke={mood.accent} strokeOpacity=".36" strokeWidth="3"><path d="M0 401c179-46 333-24 481-41 172-20 310-1 479-42"/><path d="M0 455c180-41 334-14 482-32 173-21 309 0 478-34"/><path d="M0 508c180-35 333-6 482-24 174-21 310 1 478-27"/></g>
      <path d="M0 327c179-37 327-21 478-6 158 16 316-17 482-33" stroke="#dae2a1" strokeOpacity=".25" strokeWidth="2" strokeDasharray="8 9"/>
      <g className="ps-crops" stroke="#d4e286" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M117 435v-35m0 22c-20 0-26-15-27-27 17 1 25 9 27 22m0-1c18-2 24-15 24-26-15 1-22 8-24 21"/>
        <path d="M275 405v-40m0 24c-21 0-28-16-29-29 18 1 27 10 29 24m0-1c19-2 26-16 26-28-16 1-24 9-26 22"/>
        <path d="M471 437v-37m0 22c-20 0-27-15-28-28 17 1 26 10 28 23m0-1c18-2 25-15 25-27-15 1-23 9-25 21"/>
        <path d="M675 405v-42m0 25c-22 0-29-17-30-31 19 1 28 10 30 25m0-1c20-2 27-17 27-29-17 1-25 9-27 23"/>
        <path d="M853 428v-38m0 23c-20 0-27-15-28-28 17 1 26 9 28 23m0-1c18-2 25-16 25-27-15 1-23 9-25 21"/>
      </g>
      <g className="ps-village" fill="#263f31"><path d="M118 286v-45l37-26 39 26v45h-76Zm-7-43 44-34 45 34h-89Z"/><path d="M187 272v-39l31-23 34 23v39h-65Zm-5-38 36-28 38 28h-74Z"/><path d="M811 281v-44l36-25 38 25v44h-74Z"/></g>
      <g className="ps-season-overlay">
        {chapter === 0 && <g className="ps-seeds" fill={mood.accent}><circle cx="385" cy="301" r="4"/><circle cx="423" cy="287" r="3"/><circle cx="460" cy="313" r="3.5"/><circle cx="498" cy="293" r="3"/><path d="M370 322c80-29 162-27 240-2" stroke={mood.accent} strokeWidth="2" strokeDasharray="4 9" fill="none"/></g>}
        {chapter === 1 && <g className="ps-tomatoes"><path d="M605 333h163l-10 74H615l-10-74Z" fill="#9d653e" stroke="#e2bb73" strokeWidth="3"/><path d="M619 333v74m34-74v74m34-74v74m34-74v74" stroke="#d7a967" strokeWidth="2"/><circle cx="632" cy="323" r="13" fill="#df6850"/><circle cx="665" cy="319" r="14" fill="#d95546"/><circle cx="700" cy="324" r="13" fill="#e8734c"/><path d="m632 309 4 7 8-2m21-9 3 8 9-2m20 5 3 7 9-2" stroke="#78a455" strokeWidth="3" strokeLinecap="round"/><path className="ps-price-line" d="M642 278c22-11 34-21 54-16s26 11 39 15 19 9 27 19" stroke="#ffb4a0" strokeWidth="4" fill="none" strokeLinecap="round"/></g>}
        {chapter === 2 && <g className="ps-leaf"><path d="M489 410c-6-62 22-111 101-125 4 64-24 106-101 125Z" fill="#8db257" stroke="#d6e2a4" strokeWidth="3"/><path d="m490 410 73-106m-54 77-1-42m17 16 28-4" stroke="#e7e6ad" strokeWidth="3" strokeLinecap="round"/><g className="ps-spots" fill="#815246"><circle cx="520" cy="365" r="6"/><circle cx="548" cy="336" r="5"/><circle cx="537" cy="380" r="4"/><circle cx="567" cy="316" r="4"/></g></g>}
        {chapter === 3 && <g className="ps-well"><ellipse cx="763" cy="385" rx="68" ry="21" fill="#4a5544"/><path d="M704 385v80q59 35 118 0v-80" fill="#8b7956" stroke="#d2bd89" strokeWidth="4"/><ellipse cx="763" cy="385" rx="59" ry="15" fill="#335c62"/><path d="M721 378v-89m84 89v-89m-87 0h90m-70-2 14-35 14 35" stroke="#6f5137" strokeWidth="8" strokeLinecap="round"/><path className="ps-well-level" d="M711 410q52-14 104 0v43q-52 28-104 0Z" fill="#4ba7a4" fillOpacity=".8"/></g>}
        {chapter === 4 && <g className="ps-storm-cloud" fill="#4c5c65"><ellipse cx="360" cy="196" rx="115" ry="29"/><ellipse cx="328" cy="185" rx="45" ry="38"/><ellipse cx="378" cy="174" rx="54" ry="48"/><ellipse cx="422" cy="191" rx="47" ry="32"/><path d="m331 230-12 36m57-33-12 38m59-34-12 37" stroke="#c7e4ec" strokeWidth="6" strokeLinecap="round"/></g>}
        {chapter === 5 && <g className="ps-alert-rings" fill="none" stroke="#f1cb71"><circle cx="504" cy="314" r="26" strokeWidth="3"/><circle cx="504" cy="314" r="51" strokeWidth="2"/><circle cx="504" cy="314" r="77" strokeWidth="1.5"/><path d="M504 300v20m-10-10h20" strokeWidth="3" strokeLinecap="round"/></g>}
      </g>
      {!thumbnail && <g className="ps-fireflies" fill={mood.accent}><circle cx="216" cy="325" r="3"/><circle cx="560" cy="269" r="2.5"/><circle cx="877" cy="347" r="2"/></g>}
    </svg>
  );
}

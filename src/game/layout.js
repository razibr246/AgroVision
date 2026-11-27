// Where everything stands in each farmer's world, with no 3D code: the simulation uses it for collisions and the
// ground height, the renderer (three/world.js) for what to draw. Positions are metres; x east, z south.
// The field is always at the middle, but each place is laid out the way that place is: where the house stands, which
// way the road runs, where the water comes from, where people run to in a storm — Dhamrai's shops on a paved road
// under the kiln smoke, Godagari's mango orchards on the Barind, the haor below the Meghalaya hills. `air` is the haze, dust or
// fog of the place, and `smoke` where smoke rises. Randomness is seeded so a world looks the same every time.
import { SPOTS, FIELD_W, FIELD_D, WORLD_R } from './regions.js';

export function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const smooth = (t) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const bump = (x, z, cx, cz, r, h) => { const d = Math.hypot(x - cx, z - cz); return d >= r ? 0 : h * smooth(1 - d / r); };
const ridge = (v, c, half, h) => { const d = Math.abs(v - c); return d >= half ? 0 : h * smooth(1 - d / half); };
// Gentle rolling ground, flat where the field is.
const roll = (x, z) => (Math.sin(x * 0.11) * Math.cos(z * 0.09) + Math.sin((x + z) * 0.05)) * 0.18;
const nearField = (x, z) => smooth((Math.max(Math.abs(x) - FIELD_W / 2, Math.abs(z) - FIELD_D / 2) - 2) / 8);
// turned to face a point (the field's middle unless told)
const face = (x, z, tx = 0, tz = 0) => Math.atan2(tx - x, tz - z);

// A world's stations: the shared radii, at the places this world puts them.
function stations(at) {
  const S = {};
  for (const [k, v] of Object.entries(at)) S[k] = { x: v[0], z: v[1], r: SPOTS[k]?.r ?? 0 };
  return S;
}
// d metres beyond a station, away from the field, turned to face the field: where its building or pump stands.
const behind = (S, id, d) => { const s = S[id], l = Math.hypot(s.x, s.z) || 1; const x = s.x + (s.x / l) * d, z = s.z + (s.z / l) * d; return [x, z, face(x, z)]; };

function maker(seed, S) {
  const r = seeded(seed), props = [];
  const add = (type, x, z, o = {}) => props.push({ type, x, z, rot: o.rot ?? r() * Math.PI * 2, s: o.s ?? 0.85 + r() * 0.3, ...o });
  const addBehind = (type, id, d, o = {}) => { const [x, z, rot] = behind(S, id, d); add(type, x, z, { rot, s: 1, ...o }); };
  // the home, the shop and the kiosk every world has, in its own style
  const common = (o) => {
    add(o.house, S.house.x, S.house.z, { rot: face(S.house.x, S.house.z, S.start.x, S.start.z), s: 1, main: true });
    for (const [x, z] of o.neighbours ?? []) add(o.house, x, z, { rot: face(x, z, S.house.x, S.house.z) + (r() - 0.5) * 0.8, s: 0.85 });
    add('shed', S.shed.x, S.shed.z, { rot: face(S.shed.x, S.shed.z, ...(o.shedFaces ?? [0, 0])), s: 1, style: o.shed });
    addBehind('kiosk', 'kiosk', 2.2, { style: o.kiosk });
    for (let k = 0; k < (o.hens ?? 6); k++) add('chicken', S.house.x + (r() - 0.5) * 6, S.house.z + 3 + r() * 3, { s: 1 });
  };
  return { r, props, add, addBehind, common };
}

// Neighbouring fields stretching away beyond the farm: [x0, x1, z0, z1, kind].
const patchwork = (r, kinds, n = 26) => {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = r() * Math.PI * 2, d = 50 + r() * 70, w = 14 + r() * 16, h = 10 + r() * 14;
    out.push([Math.cos(a) * d - w / 2, Math.cos(a) * d + w / 2, Math.sin(a) * d - h / 2, Math.sin(a) * d + h / 2, kinds[Math.floor(r() * kinds.length)]]);
  }
  return out;
};
// trees in a row from a to b, every `step` metres, leaving a gap round any of the given points
const row = (add, type, [ax, az], [bx, bz], step, gaps = [], o = {}) => {
  const n = Math.floor(Math.hypot(bx - ax, bz - az) / step);
  for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n; if (!gaps.some(([gx, gz, gr = 4]) => Math.hypot(x - gx, z - gz) < gr)) add(type, x, z, o); }
};

const WORLDS = {
  // ---- Bangladesh ----
  // Dhamrai, on Dhaka's edge: a paved road north of the field with the shop and the digital centre on it, the van
  // stand at its east end, the school beyond; the home on its raised plinth to the west; brick kilns smoking on the
  // skyline; the Bangshi to the south.
  dhamrai: () => {
    const S = stations({ start: [-17, -4], house: [-26, -2], shed: [-8, -19], kiosk: [9, -19], water: [17, 5], market: [31, -12], safe: [-3, -33] });
    const { r, props, add, addBehind, common } = maker(61, S);
    common({ house: 'tinhouse', shed: 'brick', kiosk: 'udc', neighbours: [[-31, 8], [-20, -22], [20, -22]], shedFaces: [-8, -10] });
    [[-34, -8], [-32, 3], [-14, -26], [14, -27], [36, -22]].forEach(([x, z]) => add('bamboo', x, z));
    [[-22, 8], [-36, -1], [24, -26], [-36, -19]].forEach(([x, z]) => add('banana', x, z));
    [[30, 14], [-26, 16], [8, 24], [-8, 24], [22, 22]].forEach(([x, z]) => add('mango', x, z));
    add('banyan', 28, -26, { s: 1.1 });
    add('kup', -30, 2.5, { s: 0.9 }); add('cow', -31, -5, { rot: 1.2, s: 1 });
    add('chicken', -24, -3); add('chicken', -22, -4);
    addBehind('stw', 'water', 1.8);
    add('van', S.market.x, S.market.z, { rot: face(S.market.x, S.market.z) + 0.6, s: 1 });
    addBehind('school', 'safe', 4.6);
    [[-30, -14], [-22, -14], [14, -14], [24, -14]].forEach(([x, z]) => add('pole', x, z - 1.6, { rot: 0, s: 1 }));
    for (let k = 0; k < 3; k++) add('kiln', -60 + k * 42, -70 - k * 8, { rot: 0, s: 1 });
    for (let k = 0; k < 4; k++) add('duck', -4 + r() * 8, 40 + r() * 3, { s: 1 });
    add('egret', 12, 36, { rot: 0.8 });
    return {
      spots: S, grass: '#7fae4c', soil: '#7a6248', path: '#a08868', sky: 'hazy',
      paths: [[[-44, -14], [44, -14]], [[-26, -2], [-17, -4], [-13, -14]], [[-3, -14], [-3, -28]], [[11.7, 3], [17, 5]], [[0, 5.7], [0, 32]], [[-11.7, -3], [-17, -4]], [[-8, -14], [-8, -17]], [[9, -14], [9, -17]], [[31, -14], [31, -12]], [[0, -5.7], [0, -14]]],
      water: [{ kind: 'river', x0: -160, x1: 160, z0: 38, z1: 160, y: -0.5, color: '#6f9a9a' }],
      sandbank: { z0: 33, z1: 38 }, far: 'dhaka',
      air: { fog: '#c9c0aa', near: 34, far: 170 },
      smoke: [[-60, 18.5, -70, 1.4], [-18, 18.5, -78, 1.4], [24, 18.5, -86, 1.4], [S.house.x + 2, 2.6, S.house.z - 1, 0.5]],
      patches: patchwork(r, ['mustard', 'paddy', 'mustard', 'wheat']),
      props, height: (x, z) => roll(x, z) * nearField(x, z) + bump(x, z, S.house.x, S.house.z, 8, 0.9) + ridge(z, -14, 1.6, 0.3) + (z > 33 ? -0.5 * smooth((z - 33) / 5) : 0),
    };
  },
  // Godagari, on the Barind: red undulating land, a deep tube well north of the field with a concrete channel down to
  // it, the house on the high ground to the east, mango orchards west and south, the road south to Kakanhat, palmyras
  // along the bunds, the Padma beyond the char to the north.
  barind: () => {
    const S = stations({ start: [16, -10], house: [25, -17], shed: [27, 6], kiosk: [-21, 12], water: [-3, -17], market: [-8, 24], safe: [-27, -20] });
    const { r, props, add, addBehind, common } = maker(11, S);
    common({ house: 'tinhouse', shed: 'brick', kiosk: 'udc', neighbours: [[34, -8]] });
    props.forEach((p) => { if (p.type === 'tinhouse') p.mud = true; });
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) add('mango', -43 + j * 5 + r() * 1.2, 0 + i * 5 + r() * 1.2);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) add('mango', 10 + j * 6 + r() * 1.5, 26 + i * 5 + r() * 1.5);
    [[-14, -9], [14, -9], [-15, 9], [15, 9], [36, -2], [-14, -32], [22, -31], [8, -28], [36, 17], [-28, 34]].forEach(([x, z]) => add('toddy', x, z, { s: 0.8 }));
    add('kup', 30, -12, { s: 1 }); add('kup', 32.5, -14.5, { s: 0.8 }); add('cow', 31, -21, { rot: 2.2, s: 1 });
    addBehind('pumphouse', 'water', 2);
    add('channel', -3, -10.6, { len: 9, rot: 0 });
    add('van', S.market.x, S.market.z, { rot: face(S.market.x, S.market.z) + 0.5, s: 1 });
    addBehind('school', 'safe', 4.6);
    [[-8, 30], [-8, 37], [20, -10], [28, 0]].forEach(([x, z]) => add('pole', x + 1.6, z, { rot: 0, s: 1 }));
    return {
      spots: S, grass: '#a8a456', soil: '#b9693d', path: '#c47a48', sand: '#e3cf9f', sky: 'dusty',
      paths: [[[16, -10], [25, -14]], [[11.7, -3], [16, -10]], [[11.7, 3], [27, 6]], [[-3, -5.7], [-3, -15]], [[0, 5.7], [-8, 22], [-8, 44]], [[-11.7, 3], [-21, 12]], [[-11.7, -4], [-24, -17]]],
      water: [{ kind: 'river', x0: -160, x1: 160, z0: -160, z1: -52, y: -0.6, color: '#5d8fa6' }],
      sandbank: { z0: -52, z1: -44 }, far: 'plain',
      air: { fog: '#dcc7a0', near: 55, far: 230 },
      smoke: [[S.house.x - 2, 2.6, S.house.z - 1, 0.5]],
      patches: patchwork(r, ['wheat', 'bare', 'mustard', 'stubble']),
      props, height: (x, z) => roll(x, z) * 1.6 * nearField(x, z) + (x > 16 ? Math.min(1.4, (x - 16) * 0.12) * nearField(x, z) : 0) + (z < -44 ? -0.5 * smooth((-44 - z) / 8) : 0),
    };
  },
  // Sitakunda: a strip between the hills and the sea. The Dhaka–Chattogram highway runs north–south west of the
  // field with the shop and the wholesalers' depot on it; the house sits at the foot of the hills to the east with the
  // bean trellises below it; the cyclone shelter stands to the south.
  sitakunda: () => {
    const S = stations({ start: [14, -9], house: [22, -15], shed: [-25, -5], kiosk: [-12, -21], water: [7, -13], market: [-25, 15], safe: [2, 30] });
    const { r, props, add, addBehind, common } = maker(67, S);
    common({ house: 'tinhouse', shed: 'thatch', kiosk: 'udc', neighbours: [[30, -24], [-33, 22]], shedFaces: [-22, -5] });
    [[16, -22], [28, -8], [-31, 6], [-31, -14], [10, 24], [-14, 26], [26, 24], [-31, 28]].forEach(([x, z]) => add('coconut', x, z));
    [[19, -26], [31, -18], [-14, -30], [16, 30]].forEach(([x, z]) => add('betelnut', x, z));
    for (let k = 0; k < 3; k++) add('trellis', 20 + k * 4.2, 2 + (k % 2) * 4, { rot: 0, s: 1 });
    add('trellis', 22, 12, { rot: 0.3, s: 1 });
    add('banyan', -18, 26, { s: 1.15 });
    add('cow', 27, -12, { rot: 1.2, s: 1 }); add('goat', 26, -10, { rot: 0.4, s: 1 });
    add('chicken', 24, -13);
    add('egret', -48, 10, { rot: 1.2 });
    addBehind('stw', 'water', 1.8);
    add('truck', -28.5, 15, { rot: 0, s: 1 }); add('van', S.market.x + 2, S.market.z - 3, { rot: 1.2, s: 1 });
    addBehind('shelter', 'safe', 1);
    [[-28, -30], [-28, -16], [-28, 2], [-28, 28]].forEach(([x, z]) => add('pole', x, z, { rot: 0, s: 1 }));
    return {
      spots: S, grass: '#79aa4a', soil: '#7a5e44', path: '#9c8462', sky: 'clear',
      paths: [[[-25, -44], [-25, 44]], [[-11.7, 0], [-25, 0]], [[14, -9], [22, -12]], [[11.7, -3], [14, -9]], [[7, -5.7], [7, -11]], [[0, 5.7], [2, 25]], [[-11.7, -4], [-12, -18]]],
      water: [{ kind: 'river', x0: -170, x1: -54, z0: -170, z1: 170, y: -0.6, color: '#5f8fa8' }],
      far: 'chittagong',
      air: { fog: '#d3e3ea', near: 80, far: 320 },
      smoke: [[S.house.x - 1, 2.6, S.house.z - 1, 0.5]],
      patches: patchwork(r, ['paddy', 'paddy', 'mustard']),
      props, height: (x, z) => roll(x, z) * nearField(x, z) + (x > 18 ? Math.min(2.2, (x - 18) * 0.25) * nearField(x, z) : 0) + (x > 32 ? Math.min(9, (x - 32) * 0.7) : 0) + ridge(x, -25, 1.8, 0.35) + (x < -46 ? -0.6 : 0),
    };
  },
  // Dacope, inside the embankment: the market is the ghat on the Pasur, over the embankment to the north, where the
  // boats leave for Chalna; the sweet-water pond and the shrimp ghers lie east; the cyclone shelter south; the
  // golpata house west, and the canal along the south with its bamboo bridge.
  coast: () => {
    const S = stations({ start: [-16, -8], house: [-25, -10], shed: [-26, 6], kiosk: [-8, 15], water: [18, -5], market: [-14, -38], safe: [16, 24] });
    const { r, props, add, addBehind, common } = maker(23, S);
    common({ house: 'thatchhouse', shed: 'thatch', kiosk: 'udc', neighbours: [[-34, -2], [-30, -22]] });
    [[-30, -16], [-20, -17], [-34, 4], [-20, 2], [6, 26], [28, 18], [-24, 14], [-38, 12], [2, -24], [-30, -30]].forEach(([x, z]) => add('coconut', x, z));
    for (let k = 0; k < 12; k++) add('nipa', -44 + k * 3 + r(), 25.6 + r() * 0.8);
    add('kup', -30, -6, { s: 0.85 }); add('goat', -21, -14, { rot: 0.4, s: 1 }); add('goat', -23, -15.5, { rot: 2, s: 0.8 });
    add('chicken', -24, -8);
    add('pond', S.water.x + 6.5, S.water.z - 1, { rot: 0, s: 1 });
    add('egret', S.water.x + 3, S.water.z - 2, { rot: -0.5 });
    add('ghat', S.water.x + 1.6, S.water.z - 0.4, { rot: -Math.PI / 2, s: 1 });
    add('ghat', S.market.x, S.market.z - 4.2, { rot: Math.PI, s: 1 });
    add('boat', S.market.x + 1, S.market.z - 9.5, { rot: Math.PI / 2 + 0.1, s: 1.1, cargo: '#3f8a34' });
    add('boat', S.market.x + 12, S.market.z - 11, { rot: Math.PI / 2 - 0.2, s: 1, cargo: false });
    add('bamboobridge', -32, 21, { rot: 0, s: 1 });
    add('boat', -20, 22, { rot: Math.PI / 2, s: 0.9, cargo: '#3f8a34' });
    addBehind('shelter', 'safe', 1);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) add('gher', 30 + j * 9, -24 + i * 9, { rot: 0, s: 1 });
    add('stilthut', 34.5, 2.5, { rot: -0.6, s: 1 });
    for (let k = 0; k < 6; k++) add('duck', S.water.x + 4 + r() * 5, S.water.z - 3 + r() * 4, { s: 1 });
    for (let k = 0; k < 60; k++) add('mangrove', -120 + k * 4 + r() * 3, -88 - r() * 14, { s: 1.3 + r() * 0.9 });
    return {
      spots: S, grass: '#7aa84c', soil: '#76604a', path: '#9a8566', sand: '#8d8a66', sky: 'clear',
      paths: [[[-44, -39], [44, -39]], [[-16, -8], [-25, -8]], [[-11.7, -3], [-16, -8]], [[-11.7, 2], [-26, 6]], [[-4, -5.7], [-14, -36]], [[11.7, -3], [18, -5]], [[0, 5.7], [-8, 15]], [[11.7, 4], [16, 20]]],
      water: [
        { kind: 'river', x0: -160, x1: 160, z0: -150, z1: -46, y: -0.5, color: '#6f8a7d' },
        { kind: 'canal', x0: -70, x1: -6, z0: 19.4, z1: 24.2, y: -0.35, color: '#5f8c7c' },
        { kind: 'pond', cx: S.water.x + 6.5, cz: S.water.z - 1, r: 5.2, y: -0.25, color: '#4f8d86' },
        ...[0, 1, 2].flatMap((i) => [0, 1].map((j) => ({ kind: 'gher', x0: 26.4 + j * 9, x1: 33.6 + j * 9, z0: -27.6 + i * 9, z1: -20.4 + i * 9, y: -0.15, color: '#7c9c8a' }))),
      ],
      far: 'mangrove',
      air: { fog: '#d5e0d8', near: 60, far: 260 },
      smoke: [[S.house.x + 2, 2.6, S.house.z - 1, 0.5]],
      props, height: (x, z) => roll(x, z) * 0.6 * nearField(x, z) + ridge(z, -39, 5, 2.4) + bump(x, z, S.house.x, S.house.z, 8, 0.8) + (z < -44 ? -0.6 : 0),
    };
  },
  // Bakerganj: the canals are the roads. The market is a boat ghat on the east canal, the low-lift pump draws from it,
  // the raised embankment road runs along the north, the house stands on its plinth between the canals in the south-
  // west, and a guava garden grows south of the west canal.
  tidal: () => {
    const S = stations({ start: [-14, 9], house: [-22, 11], shed: [-24, -6], kiosk: [6, 15], water: [19, 4], market: [19, -16], safe: [-6, -29] });
    const { r, props, add, addBehind, common } = maker(71, S);
    common({ house: 'tinhouse', shed: 'thatch', kiosk: 'udc', neighbours: [[-32, 6], [-14, 16]] });
    [[-28, 2], [-16, 4], [-32, 14], [-26, -16], [-36, -6], [10, -22], [12, 24], [-14, -18]].forEach(([x, z]) => add('coconut', x, z));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) add('guava', -2 + j * 5 + r(), 28 + i * 4.5 + r());
    for (let k = 0; k < 14; k++) add('nipa', -44 + k * 3 + r(), 25.8 + r() * 0.8);
    add('kup', -27, 7, { s: 0.85 }); add('cow', -17, 6, { rot: 1.2, s: 1 });
    add('chicken', -21, 9);
    add('egret', 16, -2, { rot: 1.4 });
    addBehind('llp', 'water', 2.1);
    add('ghat', 21.5, S.market.z, { rot: Math.PI / 2, s: 1 });
    add('boat', 24.1, S.market.z + 3, { rot: 0.05, s: 1, cargo: '#b5d06a' });
    add('boat', 24.1, S.market.z - 7, { rot: -0.05, s: 0.9, cargo: '#b5d06a' });
    for (let k = 0; k < 3; k++) add('boat', -40 + k * 9, 22 + r() * 1.5, { rot: Math.PI / 2 + r() * 0.3, s: 0.9, cargo: '#b5d06a' });
    add('bamboobridge', -32, 21, { rot: 0, s: 1 });
    addBehind('tilashed', 'safe', 1, { s: 1.2 });
    for (let k = 0; k < 8; k++) add('duck', 23 + r() * 2, -20 + r() * 30, { s: 1 });
    return {
      spots: S, grass: '#76aa48', soil: '#6e5a44', path: '#9a8566', sky: 'clear',
      paths: [[[-44, -29], [22, -29]], [[-14, 9], [-22, 9]], [[-11.7, 3], [-14, 9]], [[-11.7, -2], [-24, -6]], [[11.7, 3], [19, 4]], [[11.7, -4], [19, -16]], [[0, 5.7], [6, 15]], [[-3, -5.7], [-6, -25]]],
      water: [
        { kind: 'canal', x0: -70, x1: -6, z0: 19.4, z1: 24.2, y: -0.35, color: '#5f8c84' },
        { kind: 'canal', x0: 22.6, x1: 25.6, z0: -60, z1: 60, y: -0.35, color: '#5f8c84' },
        { kind: 'river', x0: -160, x1: 160, z0: -160, z1: -48, y: -0.5, color: '#6a9590' },
      ],
      far: 'rivers',
      air: { fog: '#d3e2d9', near: 60, far: 260 },
      smoke: [[S.house.x + 2, 2.6, S.house.z - 1, 0.5]],
      props, height: (x, z) => roll(x, z) * 0.5 * nearField(x, z) + ridge(z, S.safe.z, 4.2, 2.2) * (x < 22 ? 1 : 0) + bump(x, z, S.house.x, S.house.z, 7, 0.8) + (z < -44 ? -0.5 : 0),
    };
  },
  // Gangachara, on a Teesta char: everything is sand and wind. The house sits on its plinth out towards the river, the
  // mainland bazar and the Union Parishad are north, the market road leaves west, and winter fog lies thick.
  char: () => {
    const S = stations({ start: [8, 12], house: [15, 21], shed: [-8, -21], kiosk: [21, -17], water: [-18, -6], market: [-29, 10], safe: [-25, -28] });
    const { r, props, add, addBehind, common } = maker(73, S);
    common({ house: 'tinhouse', shed: 'thatch', kiosk: 'udc', neighbours: [[25, 17], [4, 24]] });
    [[22, 26], [8, 28], [-30, -12], [-14, -30], [30, -26], [-36, 20]].forEach(([x, z]) => add('bamboo', x, z));
    [[30, 4], [-30, 22], [-4, -30], [24, -6], [-36, -6], [10, -28]].forEach(([x, z]) => add('mango', x, z));
    add('kup', 20, 16, { s: 0.9 }); add('kup', 10, 18, { s: 0.75 }); add('cow', 22, 22, { rot: 1.2, s: 1 });
    addBehind('stw', 'water', 1.8);
    add('van', S.market.x, S.market.z, { rot: face(S.market.x, S.market.z) + 0.5, s: 1 });
    addBehind('school', 'safe', 4.6);
    return {
      spots: S, grass: '#8fae58', soil: '#9a8462', path: '#c2ad84', sand: '#e6dcc0', sky: 'foggy',
      paths: [[[8, 12], [15, 18]], [[2, 5.7], [8, 12]], [[-4, -5.7], [-8, -18]], [[-11.7, -3], [-18, -6]], [[-11.7, 4], [-29, 10]], [[11.7, -3], [21, -14]], [[-8, -21], [-22, -26]], [[15, 22], [15, 40]]],
      water: [{ kind: 'river', x0: -160, x1: 160, z0: 44, z1: 160, y: -0.5, color: '#7aa0a6' }],
      sandbank: { z0: 26, z1: 44 }, far: 'char',
      air: { fog: '#e1e5e2', near: 12, far: 80 },
      smoke: [[S.house.x - 2, 2.4, S.house.z - 1, 0.6]],
      patches: patchwork(r, ['bare', 'mustard', 'wheat', 'bare']),
      props, height: (x, z) => roll(x, z) * nearField(x, z) + bump(x, z, S.house.x, S.house.z, 8, 1.1) + (z > 36 ? -0.5 * smooth((z - 36) / 8) : 0),
    };
  },
  // Gowainghat: the homestead stands on its own raised mound at the haor's edge to the south, the market is a boat
  // ghat on the haor, the pump draws from the canal to the east, the shelter hillock with its tea bushes rises to the
  // north-west, and the stony Piyain runs under the Meghalaya hills to the north.
  haor: () => {
    const S = stations({ start: [-4, 12], house: [-9, 21], shed: [-26, -4], kiosk: [-22, 13], water: [19, 6], market: [14, 25], safe: [-22, -27] });
    const { r, props, add, addBehind, common } = maker(37, S);
    common({ house: 'tinhouse', shed: 'thatch', kiosk: 'udc', neighbours: [[-17, 24]] });
    [[-28, -12], [-12, -20], [-32, 2], [-32, 18], [10, -18], [4, 22]].forEach(([x, z]) => add('bamboo', x, z));
    [[-15, 16], [-3, 25], [-34, -16], [8, -26]].forEach(([x, z]) => add('betelnut', x, z));
    for (let k = 0; k < 10; k++) add('hijal', -30 + k * 7 + r() * 3, 36 + r() * 8, { s: 1 + r() * 0.4 });
    add('kup', -14, 22.5, { s: 0.9 }); add('cow', -2, 17, { rot: 2.2, s: 0.95 });
    add('chicken', -12, 19);
    add('egret', -4, 33, { rot: 0.6 }); add('egret', 10, 36, { rot: -0.8 });
    addBehind('llp', 'water', 2.1);
    add('ghat', S.market.x, 28, { rot: 0, s: 1 });
    add('boat', S.market.x + 0.5, 32.5, { rot: Math.PI / 2, s: 1.1, cargo: '#e2c23a' });
    for (let k = 0; k < 4; k++) add('boat', -20 + k * 12 + r() * 4, 42 + r() * 6, { rot: r() * 3, s: 1, cargo: false });
    addBehind('tilashed', 'safe', 1.5);
    for (let k = 0; k < 4; k++) add('stoneboat', -30 + k * 16 + r() * 5, -51 + r() * 2, { rot: 0.2 + r() * 0.3, s: 1 });
    for (let k = 0; k < 7; k++) add('duck', -10 + r() * 12, 34 + r() * 4, { s: 1 });
    for (let k = 0; k < 120; k++) add('stone', -60 + r() * 120, -45 - r() * 4, { s: 0.3 + r() * 0.7 });
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) add('tea', 30 + j * 2.2, -26 + i * 4.4 + (j % 2) * 1.1, { s: 1 });
    for (let a = 0; a < 26; a++) { const ang = (a / 26) * Math.PI * 2, d = 7.6 + (a % 2) * 1.6; add('tea', S.safe.x + Math.cos(ang) * d, S.safe.z + Math.sin(ang) * d, { s: 0.95 }); }
    return {
      spots: S, grass: '#6aa646', soil: '#5c4632', path: '#8b7655', sand: '#b8b3a0', sky: 'clear',
      paths: [[[-4, 12], [-8, 18]], [[0, 5.7], [-4, 12]], [[-11.7, -2], [-26, -4]], [[11.7, 3], [19, 6]], [[8, 5.7], [14, 23]], [[-11.7, 4], [-22, 13]], [[-11.7, -4], [-19, -21]], [[0, -5.7], [0, -42]]],
      water: [
        { kind: 'canal', x0: 22.6, x1: 25.4, z0: -44, z1: 30, y: -0.4, color: '#5e93a0' },
        { kind: 'haor', x0: -160, x1: 160, z0: 30, z1: 160, y: -0.3, color: '#6ca2b0' },
        { kind: 'river', x0: -160, x1: 160, z0: -150, z1: -48, y: -0.55, color: '#6fa9ad' },
      ],
      far: 'meghalaya',
      air: { fog: '#c9d6dc', near: 45, far: 220 },
      smoke: [[S.house.x + 2, 2.6, S.house.z - 1, 0.5]],
      props,
      height: (x, z) => roll(x, z) * nearField(x, z) + bump(x, z, S.safe.x, S.safe.z, 11, 3.2) + bump(x, z, S.house.x, S.house.z, 9, 1.2) + (x > 27 ? Math.min(4, (x - 27) * 0.25) * smooth((z + 32) / 6) * smooth((28 - z) / 6) : 0) + (z > 30 ? -0.5 : 0) + (z < -45 ? -0.5 : 0),
    };
  },

};

// Things the farmer walks round: houses, sheds, trees. Water is handled separately (it is never walked into).
const SOLID = {
  brickhouse: (p) => ({ box: [3.4 * p.s, 2.6 * p.s] }), mudhouse: (p) => ({ box: [3.2 * p.s, 2.4 * p.s] }), tharuhouse: (p) => ({ box: [4 * p.s, 2.2 * p.s] }),
  bhutanhouse: (p) => ({ box: [3.2 * p.s, 2.6 * p.s] }), stilthouse: (p) => ({ box: [3 * p.s, 2.4 * p.s] }),
  shed: () => ({ box: [2.2, 2.6] }), kiosk: () => ({ box: [1.5, 1.3] }),
  upazila: () => ({ box: [3.4, 2.5] }), gurdwara: () => ({ box: [4.2, 3] }), wardoffice: () => ({ box: [5, 1.9] }), lhakhang: () => ({ box: [2.4, 2] }), kyaung: () => ({ box: [3.2, 2.4] }), dhaba: () => ({ box: [1.6, 1.4] }),
  tinhouse: (p) => ({ box: [3.5 * p.s, 2.7 * p.s] }), thatchhouse: (p) => ({ box: [3.5 * p.s, 2.7 * p.s] }), school: () => ({ box: [7, 1.9] }), shelter: () => ({ pillars: true }), tilashed: () => ({ circle: 1.6 }), van: () => ({ circle: 1.1 }), llp: () => ({ circle: 0.9 }), trellis: () => ({ box: [1.5, 1.5] }), stilthut: () => ({ circle: 1.4 }),
  banyan: (p) => ({ circle: 1.4 * (p?.s ?? 1) }), coconut: () => ({ circle: 0.4 }), betelnut: () => ({ circle: 0.25 }), bamboo: () => ({ circle: 1 }), guava: () => ({ circle: 0.4 }),
  pumphouse: () => ({ box: [1.4, 1.4] }), stw: () => ({ circle: 0.8 }), mogha: () => ({ circle: 0.6 }), stream: () => ({ circle: 0.6 }),
  trolley: () => ({ box: [1.3, 3] }), donkeycart: () => ({ circle: 1.3 }), oxcart: () => ({ circle: 1.5 }), stall: () => ({ box: [1.6, 1.2] }), truck: () => ({ box: [1.4, 3.6] }), tractor: () => ({ circle: 1.5 }),
  kup: (p) => ({ circle: 1.4 * p.s }), dehari: () => ({ circle: 0.35 }), machan: () => ({ circle: 1.2 }), chorten: (p) => ({ circle: 1.2 * p.s }), zedi: () => ({ circle: 2.2 }), waterpots: () => ({ box: [0.9, 0.4] }), charpai: () => ({ box: [1, 0.5] }),
  eucalyptus: () => ({ circle: 0.3 }), poplar: () => ({ circle: 0.25 }), date: () => ({ circle: 0.35 }), kikar: () => ({ circle: 0.35 }), sal: () => ({ circle: 0.45 }),
  mango: (p) => ({ circle: 0.55 * p.s }), banana: () => ({ circle: 0.4 }), bluepine: () => ({ circle: 0.4 }), toddy: () => ({ circle: 0.35 }), tamarind: () => ({ circle: 0.6 }),
  pole: () => ({ circle: 0.2 }), // the animals are not here: they wander, so they are bodies that move (footing.js keepApart)
  kiln: (p) => ({ box: [5 * p.s, 3 * p.s] }), stone: (p) => ({ circle: 0.55 * p.s }), lungdar: () => ({ circle: 0.12 }),
  mangrove: () => ({ circle: 0.45 }), hijal: () => ({ circle: 0.45 }), nipa: () => ({ circle: 0.5 }),
};

// Beyond the farm, out to the edge the farmer can walk to: the world's own trees in clumps and lines, a few more
// homesteads with their haystacks, and animals grazing, kept out of the water, the neighbours' fields and the paths.
const TREES = ['banyan', 'mango', 'bamboo', 'banana', 'coconut', 'betelnut', 'guava', 'toddy', 'eucalyptus', 'poplar', 'date', 'kikar', 'sal', 'bluepine', 'tamarind', 'hijal', 'mangrove'];
const ANIMALS = ['cow', 'goat', 'buffalo', 'ox', 'chicken', 'duck', 'egret'];
const segDist = (x, z, [ax, az], [bx, bz]) => { const vx = bx - ax, vz = bz - az, l = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l)); return Math.hypot(x - ax - vx * t, z - az - vz * t); };
function outerRing(L, seed) {
  const r = seeded(seed * 7 + 3), count = {};
  for (const p of L.props) count[p.type] = (count[p.type] ?? 0) + 1;
  const trees = TREES.filter((t) => count[t]).sort((a, b) => count[b] - count[a]);
  const animals = ANIMALS.filter((t) => count[t]);
  const house = L.props.find((p) => p.main)?.type;
  if (!trees.length) return;
  const wet = (x, z) => L.water.some((w) => (w.r ? Math.hypot(x - w.cx, z - w.cz) < w.r + 2 : x > w.x0 - 2 && x < w.x1 + 2 && z > w.z0 - 2 && z < w.z1 + 2));
  const inField = (x, z) => (L.patches ?? []).some(([x0, x1, z0, z1]) => x > x0 - 1 && x < x1 + 1 && z > z0 - 1 && z < z1 + 1);
  const onPath = (x, z) => L.paths.some((p) => p.some((pt, i) => i && segDist(x, z, p[i - 1], pt) < 3));
  const taken = (x, z, d) => L.props.some((p) => Math.hypot(p.x - x, p.z - z) < d);
  const free = (x, z, d = 3) => Math.hypot(x, z) > 47 && Math.hypot(x, z) < WORLD_R - 2 && !wet(x, z) && !inField(x, z) && !onPath(x, z) && !taken(x, z, d);
  const spot = (min = 48) => { for (let k = 0; k < 30; k++) { const a = r() * Math.PI * 2, d = min + r() * (WORLD_R - 4 - min); const x = Math.cos(a) * d, z = Math.sin(a) * d; if (free(x, z)) return [x, z]; } return null; };
  const add = (type, x, z, o = {}) => L.props.push({ type, x, z, rot: o.rot ?? r() * Math.PI * 2, s: o.s ?? 0.85 + r() * 0.3, outer: true });
  // tree clumps: a homestead's grove, a roadside line
  for (let c = 0; c < 14; c++) {
    const at = spot(); if (!at) continue;
    const t = trees[c % Math.min(trees.length, 3)];
    for (let k = 0, n = 3 + Math.floor(r() * 4); k < n; k++) { const x = at[0] + (r() - 0.5) * 9, z = at[1] + (r() - 0.5) * 9; if (free(x, z, 2.2)) add(t, x, z); }
  }
  // homesteads: a house facing the farm, a haystack and a tree or two
  if (house) for (let k = 0; k < 4; k++) {
    const at = spot(54); if (!at) continue;
    const [x, z] = at;
    add(house, x, z, { rot: Math.atan2(-x, -z) + (r() - 0.5) * 0.6, s: 0.8 + r() * 0.15 });
    if (count.kup && free(x + 5, z + 2, 2)) add('kup', x + 5, z + 2, { s: 0.85 });
    if (free(x - 5, z - 3, 2)) add(trees[0], x - 5, z - 3);
  }
  // animals grazing in the open
  for (let k = 0; k < 6 && animals.length; k++) { const at = spot(); if (at) add(animals[k % animals.length], at[0], at[1], { s: 1 }); }
}

const cache = {};
const SEEDS = Object.fromEntries(Object.keys(WORLDS).map((w, i) => [w, 101 + i * 37]));
// The agriculture office (office.js), placed the same way in every world: on free dry ground between the farm and
// the village edge, close beside a road or path but not on it, clear of the field, the water, the other stations and
// buildings. The station is where the farmer stands at the door; the building is a few metres behind, facing the farm.
function placeOffice(L) {
  const S = L.spots;
  if (S.office) return;
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };
  const pathD = (x, z) => { let d = 99; for (const p of L.paths ?? []) for (let k = 1; k < p.length; k++) d = Math.min(d, segD(x, z, p[k - 1], p[k])); return d; };
  const clear = (x, z, room) => {
    if (Math.abs(x) < FIELD_W / 2 + 5 && Math.abs(z) < FIELD_D / 2 + 5) return false;
    if (inWater(L, x, z) || inWater(L, x + 3, z) || inWater(L, x - 3, z) || inWater(L, x, z + 3) || inWater(L, x, z - 3)) return false;
    for (const [k, st] of Object.entries(S)) if (Math.hypot(x - st.x, z - st.z) < (k === 'house' || k === 'start' ? 9 : (st.r ?? 2) + room + 3)) return false; // never across the way home
    for (const p of L.props) if (SOLID[p.type]?.(p) && Math.hypot(x - p.x, z - p.z) < room + 3.5) return false;
    return true;
  };
  let best = null;
  for (let rad = 22; rad <= 44; rad += 2) for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const bx = x + Math.cos(a) * 3.4, bz = z + Math.sin(a) * 3.4; // the building, behind the door, away from the farm
    if (!clear(x, z, 1.5) || !clear(bx, bz, 3.2)) continue;
    const pd = pathD(x, z), score = (pd < 1.5 ? 20 : Math.abs(pd - 3)) + rad * 0.05;
    if (!best || score < best.score) best = { x, z, bx, bz, score };
  }
  if (!best) return;
  S.office = { x: best.x, z: best.z, r: 2.6 };
  // clear the yard: no tree, bamboo or bush grows through the office or over its door
  const SOFT = new Set([...TREES, 'bamboo', 'banana', 'tea', 'nipa']);
  for (let k = L.props.length - 1; k >= 0; k--) {
    const p = L.props[k];
    if (SOFT.has(p.type) && (Math.hypot(p.x - best.bx, p.z - best.bz) < 7.5 || Math.hypot(p.x - best.x, p.z - best.z) < 4)) L.props.splice(k, 1);
  }
  L.props.push({ type: 'upazila', x: best.bx, z: best.bz, rot: face(best.bx, best.bz), s: 1 });
}

export function layoutFor(world) {
  if (cache[world]) return cache[world];
  const L = WORLDS[world]();
  placeOffice(L);
  outerRing(L, SEEDS[world]);
  L.S = L.spots;
  L.blockers = [];
  for (const p of L.props) {
    const s = SOLID[p.type]?.(p);
    if (!s) continue;
    if (s.circle) L.blockers.push({ x: p.x, z: p.z, r: s.circle });
    else if (s.pillars) { for (const dx of [-5, 0, 5]) for (const dz of [-2.6, 2.6]) L.blockers.push({ x: p.x + dx, z: p.z + dz, r: 0.4 }); }
    else { const c = Math.cos(p.rot), sn = Math.sin(p.rot); L.blockers.push({ x: p.x, z: p.z, hw: s.box[0], hd: s.box[1], c, s: sn }); }
  }
  // The ground dips under every pond, canal and river, so their water lies in a bed.
  const base = L.height;
  L.ground = (x, z) => {
    let h = base(x, z);
    for (const w of L.water) {
      const d = w.r ? w.r - Math.hypot(x - w.cx, z - w.cz) : Math.min(x - w.x0, w.x1 - x, z - w.z0, w.z1 - z);
      if (d > -1.2) { const t = smooth((d + 1.2) / 2.7); h = h * (1 - t) + (w.y - 0.6) * t; }
    }
    return h;
  };
  cache[world] = L;
  return L;
}
export const WORLD_IDS = Object.keys(WORLDS);

export function inWater(L, x, z) {
  for (const w of L.water) {
    if (w.r) { if (Math.hypot(x - w.cx, z - w.cz) < w.r - 0.3) return w; }
    else if (x > w.x0 + 0.3 && x < w.x1 - 0.3 && z > w.z0 + 0.3 && z < w.z1 - 0.3) return w;
  }
  return null;
}

// Push a point out of every blocker; keep it inside the walkable circle.
export function resolve(L, x, z, rad = 0.35) {
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const b of L.blockers) {
      if (b.r) {
        const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz), m = b.r + rad;
        if (d < m - 1e-6) {
          if (d > 1e-4) { x = b.x + (dx / d) * m; z = b.z + (dz / d) * m; }
          else { x = b.x + m; z = b.z; }
          moved = true;
        }
      } else {
        // into the box's own frame (a rotation `rot` about the vertical axis), out to the nearest side, and back
        const dx = x - b.x, dz = z - b.z;
        let u = dx * b.c - dz * b.s, v = dx * b.s + dz * b.c;
        const hw = b.hw + rad, hd = b.hd + rad;
        if (Math.abs(u) < hw - 1e-6 && Math.abs(v) < hd - 1e-6) {
          if (hw - Math.abs(u) < hd - Math.abs(v)) u = Math.sign(u || 1) * hw; else v = Math.sign(v || 1) * hd;
          x = b.x + u * b.c + v * b.s; z = b.z - u * b.s + v * b.c;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  const d = Math.hypot(x, z);
  if (d > WORLD_R) { x *= WORLD_R / d; z *= WORLD_R / d; }
  return [x, z];
}

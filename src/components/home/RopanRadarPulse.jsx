// Home page radar card: every upazila the Ropan Radar covers, drawn from its real boundary and coloured by this
// season's Sentinel-1 transplanting date against its own 2017–2025 normal (radar/aman.js), with a sweep passing over.
// Loaded lazily: the Aman summary is a third of a megabyte and the home page should not wait for it.
import { useMemo } from 'react';
import { AMAN, CAT, LATEST } from '../../radar/aman';
import { useStore } from '../../store';
import { num } from '../../engine/dates';

const W = 260, H = 236, PAD = 10;

export default function RopanRadarPulse() {
  const { T, L, s } = useStore();
  const { shapes, counts, total, cx, cy, season } = useMemo(() => {
    const ups = Object.values(AMAN.districts).flatMap((d) => d.upazilas);
    const pts = ups.flatMap((u) => u.ring);
    const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
    const kx = Math.cos((((y0 + y1) / 2) * Math.PI) / 180); // shrink longitude so the map keeps its shape
    const scale = Math.min((W - 2 * PAD) / ((x1 - x0) * kx), (H - 2 * PAD) / (y1 - y0));
    const ox = (W - (x1 - x0) * kx * scale) / 2, oy = (H - (y1 - y0) * scale) / 2;
    const px = ([lon, lat]) => [ox + (lon - x0) * kx * scale, oy + (y1 - lat) * scale];
    const c = { early: 0, 'on track': 0, late: 0, none: 0 };
    const centre = px([(x0 + x1) / 2, (y0 + y1) / 2]);
    const shapes = ups.map((u) => {
      c[u.category] = (c[u.category] ?? 0) + 1;
      const d = u.ring.map((p, i) => `${i ? 'L' : 'M'}${px(p).map((v) => v.toFixed(1)).join(',')}`).join('') + 'Z';
      const [mx, my] = px(u.point);
      // the sweep turns clockwise from 12 o'clock; each upazila lights as it passes
      const ang = ((Math.atan2(mx - centre[0], -(my - centre[1])) * 180) / Math.PI + 360) % 360;
      return { id: u.id, d, mx, my, cat: u.category, delay: (ang / 360) * 4, name: L(u) };
    });
    const latest = ups.map((u) => u.seasons?.[LATEST]).find(Boolean);
    return { shapes, counts: c, total: ups.length, cx: centre[0], cy: centre[1], season: { year: LATEST, done: latest?.complete !== false } };
  }, [L]);

  return (
    <div className="ropan-pulse relative overflow-hidden rounded-2xl border border-primary-900/10 bg-[#0b2015] p-3 text-white">
      <div className="flex items-start gap-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[196px] w-auto shrink-0" role="img"
          aria-label={T(`${num(total, 'bn')}টি উপজেলায় এবারের রোপণ, উপগ্রহ রাডারে`, `Transplanting this season in ${total} upazilas, from satellite radar`)}>
          <defs>
            <radialGradient id="rp-sweep-fade" cx="0" cy="0" r="1">
              <stop offset="0" stopColor="#7cc06a" stopOpacity="0.45" />
              <stop offset="1" stopColor="#7cc06a" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[0.32, 0.62, 0.92].map((r) => (
            <circle key={r} cx={cx} cy={cy} r={r * (H / 2)} fill="none" stroke="#7cc06a" strokeOpacity="0.14" />
          ))}
          {shapes.map((u) => (
            <path key={u.id} d={u.d} fill={CAT[u.cat].color} stroke="#0b2015" strokeWidth="0.6"
              className="ropan-cell" style={{ '--d': `${u.delay}s` }}>
              <title>{`${u.name}: ${L(CAT[u.cat])}`}</title>
            </path>
          ))}
          {/* sweep: a soft wedge behind a bright arm, turning once every 4 s */}
          <g className="ropan-sweep" style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <path d={`M${cx},${cy} L${cx},${cy - H * 0.62} A${H * 0.62},${H * 0.62} 0 0 0 ${cx - H * 0.62 * Math.sin(0.6)},${cy - H * 0.62 * Math.cos(0.6)} Z`} fill="#7cc06a" fillOpacity="0.14" />
            <line x1={cx} y1={cy} x2={cx} y2={cy - H * 0.62} stroke="#b9e3a8" strokeWidth="1.4" strokeOpacity="0.85" />
          </g>
          <circle cx={cx} cy={cy} r="2.4" fill="#e8a83e" />
        </svg>

        <div className="min-w-0 flex-1 py-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-primary-200/80">
            Sentinel-1 · {num(season.year, s.lang).replace(/,/g, '')} {season.done ? '' : T('· চলছে', '· in progress')}
          </p>
          <p className="mt-1 text-[12.5px] leading-5 text-primary-50/80">{T(`${num(total, 'bn')}টি উপজেলা, প্রতিটির নিজের স্বাভাবিকের তুলনায়`, `${total} upazilas, each against its own usual date`)}</p>
          <ul className="mt-2.5 space-y-1.5">
            {['late', 'on track', 'early', 'none'].map((k) => (
              <li key={k} className="flex items-center gap-2 text-[12.5px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CAT[k].color }} />
                <span className="flex-1 truncate text-primary-50/90">{L(CAT[k])}</span>
                <span className="font-mono tabular font-bold">{num(counts[k] ?? 0, s.lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

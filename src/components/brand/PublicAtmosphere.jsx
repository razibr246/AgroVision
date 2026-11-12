import { memo, useEffect, useState } from 'react';

const MOTES = [
  { x: '8%', y: '18%', s: 4, d: '0s', t: '15s' },
  { x: '19%', y: '68%', s: 3, d: '-4s', t: '18s' },
  { x: '28%', y: '34%', s: 5, d: '-7s', t: '16s' },
  { x: '42%', y: '78%', s: 3.5, d: '-2s', t: '20s' },
  { x: '54%', y: '22%', s: 4.5, d: '-9s', t: '17s' },
  { x: '66%', y: '56%', s: 3, d: '-5s', t: '19s' },
  { x: '76%', y: '28%', s: 5, d: '-11s', t: '16s' },
  { x: '86%', y: '72%', s: 3.5, d: '-3s', t: '21s' },
  { x: '91%', y: '42%', s: 4, d: '-8s', t: '15s' },
  { x: '14%', y: '88%', s: 4, d: '-6s', t: '18s' },
];

const matchPrefix = (route, prefix) => route === prefix || route.startsWith(`${prefix}/`);

export function publicPortalMood(portal = 'public', route = '/') {
  if (portal === 'science' || matchPrefix(route, '/science')) return 'science';
  if (matchPrefix(route, '/stories')) return 'stories';
  if (matchPrefix(route, '/kids')) return 'kids';
  if (portal === 'games' || ['/games', '/saga', '/play', '/farm'].some((p) => matchPrefix(route, p))) return 'games';
  return 'public';
}

/**
 * PublicAtmosphere — Unified ambient backdrop across /, /stories, /science, /games, /kids and public routes.
 * Renders glowing portal-adaptive mesh gradients, subtle orbital/contour lines, and gentle floating motes
 * on an isolated pointer-events-none strict-containment compositor layer.
 */
function PublicAtmosphere({ portal = 'public', route = '/' }) {
  const [hidden, setHidden] = useState(() => (typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false));
  const mood = publicPortalMood(portal, route);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVis = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div
      data-portal={mood}
      data-hidden={hidden ? 'true' : 'false'}
      className="public-atmosphere pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Glowing portal-adaptive mesh gradient orbs */}
      <div className="public-mesh-orb public-mesh-a" />
      <div className="public-mesh-orb public-mesh-b" />
      <div className="public-mesh-orb public-mesh-c" />
      <div className="public-mesh-orb public-mesh-d" />

      {/* Subtle vector topography / orbital grid */}
      <svg
        className="public-grid-overlay absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="public-orbital-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.65" strokeOpacity="0.032" />
            <circle cx="24" cy="24" r="0.8" fill="currentColor" fillOpacity="0.05" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#public-orbital-grid)" />
      </svg>

      {/* Gentle floating motes */}
      <div className="public-motes absolute inset-0">
        {MOTES.map((m, idx) => (
          <span
            key={idx}
            className="public-mote"
            style={{
              '--mx': m.x,
              '--my': m.y,
              '--ms': `${m.s}px`,
              '--md': m.d,
              '--mt': m.t,
            }}
          />
        ))}
      </div>

      {/* Soft perimeter focus vignette */}
      <div className="public-atmosphere-vignette absolute inset-0" />
    </div>
  );
}

export default memo(PublicAtmosphere);

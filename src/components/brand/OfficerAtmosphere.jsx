import { memo, useEffect, useState } from 'react';

/**
 * OfficerAtmosphere — Command-centre ambient telemetry backdrop for the Officer portal.
 * Combines geodetic coordinate grid lines, orbital telemetry crosshairs, deep-teal & forest
 * aura orbs, and a subtle radar station sweep on an isolated, GPU-composited strict-containment layer.
 */
function OfficerAtmosphere({ alertsCount = 0 }) {
  const [hidden, setHidden] = useState(() => (typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false));

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVis = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div
      data-hidden={hidden ? 'true' : 'false'}
      data-alert={alertsCount > 0 ? 'active' : 'nominal'}
      className="officer-atmosphere pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Deep-teal, forest & telemetry aura orbs */}
      <div className="officer-aura-orb officer-aura-forest" />
      <div className="officer-aura-orb officer-aura-teal" />
      <div className="officer-aura-orb officer-aura-amber" />

      {/* Subtle radar station sweep overlay in upper-right command quadrant */}
      <div className="officer-radar-station">
        <div className="officer-radar-ring officer-radar-ring-outer" />
        <div className="officer-radar-ring officer-radar-ring-mid" />
        <div className="officer-radar-sweep" />
        <span className="officer-radar-core" />
      </div>

      {/* Geodetic graticule grid & orbital telemetry crosshairs */}
      <svg
        className="officer-geodetic-grid absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="officer-geo-minor" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#184d52" strokeWidth="0.55" strokeOpacity="0.036" />
          </pattern>
          <pattern id="officer-geo-major" width="160" height="160" patternUnits="userSpaceOnUse">
            <rect width="160" height="160" fill="url(#officer-geo-minor)" />
            <path d="M 160 0 L 0 0 0 160" fill="none" stroke="#1c4722" strokeWidth="0.85" strokeOpacity="0.055" />
            <path d="M 75 80 H 85 M 80 75 V 85" fill="none" stroke="#184d52" strokeWidth="0.9" strokeOpacity="0.11" />
            <circle cx="80" cy="80" r="1.15" fill="#2f8a8f" fillOpacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#officer-geo-major)" />

        {/* Orbital crosshair arcs aligned to upper-right command sector */}
        <g className="officer-orbital-crosshairs" stroke="#184d52" fill="none" opacity="0.12">
          <circle cx="82%" cy="18%" r="130" strokeWidth="0.8" strokeDasharray="4 8" />
          <circle cx="82%" cy="18%" r="220" strokeWidth="0.7" strokeDasharray="2 10" />
          <circle cx="82%" cy="18%" r="320" strokeWidth="0.6" strokeOpacity="0.55" />
          <line x1="82%" y1="4%" x2="82%" y2="32%" strokeWidth="0.75" strokeDasharray="3 6" />
          <line x1="72%" y1="18%" x2="92%" y2="18%" strokeWidth="0.75" strokeDasharray="3 6" />
        </g>
      </svg>

      {/* Soft perimeter focus vignette */}
      <div className="officer-atmosphere-vignette absolute inset-0" />
    </div>
  );
}

export default memo(OfficerAtmosphere);

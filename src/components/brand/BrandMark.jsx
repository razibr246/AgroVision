// Logo: the sun rising behind the A of Agros, whose two legs are field rows meeting at the horizon, with a gold
// irrigation channel for the crossbar. From the sky down to one field: the app's whole idea in one mark.
// Geometry on a 64-unit grid; the same shapes are in public/icon.svg, the PNG icons (scripts/build/render_icons.mjs)
// and the boot splash in index.html, so change them together. The name comes from src/config/brand.js.
// Motion (index.css, .agros-mark): on first paint the sun rises, the rows grow down from the horizon and the channel
// fills; on hover the sun glows. Nothing moves under prefers-reduced-motion.
import { useId } from 'react';
import { PROJECT_NAME, PROJECT_NAME_PARTS } from '../../config/brand';

export const MARK = {
  sun: 'M17 28a15 15 0 0 1 30 0Z',
  legLeft: 'M32 14 11.5 53h10.2L32 32.5Z',
  legRight: 'M32 14 52.5 53H42.3L32 32.5Z',
  bar: { x: 24.6, y: 41.6, width: 14.8, height: 3.6, rx: 1.8 },
};

export function LogoGlyph({ size = 40, animate = false, title }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}
      className={`agros-mark shrink-0 ${animate ? 'agros-mark--intro' : ''}`}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#174a2c" /><stop offset="1" stopColor="#0a2413" /></linearGradient>
        <linearGradient id={`${id}row`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c8ee9f" /><stop offset="1" stopColor="#4f9a44" /></linearGradient>
        <linearGradient id={`${id}sun`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8d98a" /><stop offset="1" stopColor="#e3a63c" /></linearGradient>
        <clipPath id={`${id}sky`}><rect width="64" height="28.05" /></clipPath>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id}bg)`} />
      <g clipPath={`url(#${id}sky)`}><path className="am-sun" d={MARK.sun} fill={`url(#${id}sun)`} /></g>
      <path className="am-row am-row--l" d={MARK.legLeft} fill={`url(#${id}row)`} />
      <path className="am-row am-row--r" d={MARK.legRight} fill={`url(#${id}row)`} />
      <rect className="am-bar" {...MARK.bar} fill="#edc067" />
    </svg>
  );
}

export default function BrandMark({ compact = false, inverse = false, sub, size = 40, animate = true }) {
  return (
    <span className="group flex items-center gap-2.5 transition-transform duration-200 active:scale-95" aria-label={PROJECT_NAME}>
      <LogoGlyph size={size} animate={animate} />
      {!compact && (
        <span className="leading-none">
          <span className={`font-display block text-[21px] font-bold tracking-[-0.015em] transition-colors duration-200 ${inverse ? 'text-white' : 'text-ink group-hover:text-primary-900'}`}>
            {PROJECT_NAME_PARTS.main}{PROJECT_NAME_PARTS.accent && <span className={inverse ? 'text-paddy-300' : 'text-primary-600'}>{PROJECT_NAME_PARTS.space ? ' ' : ''}{PROJECT_NAME_PARTS.accent}</span>}
          </span>
          {sub && <span className={`mt-1 block text-[12px] font-medium ${inverse ? 'text-primary-200' : 'text-muted'}`}>{sub}</span>}
        </span>
      )}
    </span>
  );
}

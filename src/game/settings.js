// The player's own settings for মাঠের মানুষ: how fast the camera turns, whether looking up and down is inverted, how
// wide the view is, and how big the on-screen text is. Pure: the page reads and writes them through localStorage, the
// stage applies them. Anything stored that is missing, of the wrong type or out of range falls back to the default.

export const SETTINGS_KEY = 'fs360.game.settings';

export const SETTING_RANGES = {
  look: { min: 0.4, max: 2, step: 0.1 },  // camera turn speed, times the default
  fov: { min: -8, max: 14, step: 2 },     // degrees added to the default view angle
  text: { min: 0.9, max: 1.3, step: 0.1 }, // HUD text size, times the default
};

export const DEFAULT_SETTINGS = { look: 1, invertY: false, fov: 0, text: 1, fastWalk: false };

const round = (v, step) => Math.round(v / step) * step;

// one setting, clamped to its range and snapped to its step; anything unusable gives the default
export function cleanSetting(key, v) {
  if (key === 'invertY' || key === 'fastWalk') return typeof v === 'boolean' ? v : DEFAULT_SETTINGS[key];
  const r = SETTING_RANGES[key];
  if (!r) return undefined;
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS[key];
  return +round(Math.min(r.max, Math.max(r.min, n)), r.step).toFixed(2);
}

export function cleanSettings(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((k) => [k, cleanSetting(k, o[k])]));
}

export function parseSettings(text) {
  try { return cleanSettings(JSON.parse(text)); } catch { return { ...DEFAULT_SETTINGS }; }
}

export const isDefault = (s) => Object.keys(DEFAULT_SETTINGS).every((k) => s[k] === DEFAULT_SETTINGS[k]);

// the camera's turn for a pointer or stick movement: dx, dy in pixels (or stick units already scaled)
export function lookDelta(dx, dy, base, s) {
  return { yaw: -dx * base * s.look, pitch: dy * base * s.look * (s.invertY ? -1 : 1) };
}

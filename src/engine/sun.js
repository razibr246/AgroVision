// Where the sun is overhead, and how satellites move, for the Science page's orbit simulator.
// Low-precision solar position (NOAA / Meeus approximations, good to about 0.5°), plenty for drawing day and night.

const DEG = Math.PI / 180;
export const MU_EARTH_KM3_S2 = 398600.4418;
export const R_EARTH_KM = 6371;
export const SIDEREAL_DAY_S = 86164.0905;

// Day of year, 1 = 1 January (UTC)
export function dayOfYear(date) {
  const d = new Date(date);
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400e3);
}

// The subsolar point (latitude = solar declination, longitude where it is local solar noon), in degrees.
export function subsolarPoint(date) {
  const d = new Date(date);
  const n = dayOfYear(d);
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const g = (2 * Math.PI / 365) * (n - 1 + (hours - 12) / 24); // fractional year, radians
  // Spencer (1971) declination and equation of time
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const eotMin = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  let lon = -15 * (hours - 12 + eotMin / 60);
  lon = ((lon + 540) % 360) - 180;
  return { lat: decl / DEG, lon, eotMin };
}

// Is the sun up at (lat, lon)? Cosine of the solar zenith angle, > 0 by day.
export function sunCosZenith(date, lat, lon) {
  const s = subsolarPoint(date);
  return Math.sin(lat * DEG) * Math.sin(s.lat * DEG) + Math.cos(lat * DEG) * Math.cos(s.lat * DEG) * Math.cos((lon - s.lon) * DEG);
}

// Circular-orbit mechanics from altitude: mean motion (rad/s), period (min), speed (km/s)
export function circularOrbit(altitudeKm) {
  const r = R_EARTH_KM + altitudeKm;
  const n = Math.sqrt(MU_EARTH_KM3_S2 / (r * r * r));
  return { radiusKm: r, meanMotion: n, periodMin: (2 * Math.PI) / n / 60, speedKmS: n * r };
}

// Earth's spin relative to the stars, rad/s
export const EARTH_SPIN_RAD_S = (2 * Math.PI) / SIDEREAL_DAY_S;

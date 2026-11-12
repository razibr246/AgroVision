// Daylight for মাঠের মানুষ, as numbers only (no three.js), so it can be tested. The sun's light reaches the field
// through more air the lower it is (the air mass, Kasten & Young 1989), and air takes out blue light much more than
// red (Rayleigh scattering) and some of all of it (haze, dust). So a low sun is weaker and orange, a high one strong
// and nearly white; the sky's own light (blue, from all round) is a larger share of the light when the sun is low.
// world.js sets the directional sun and the hemisphere sky light from these numbers.
//
// sinEl: sine of the sun's height above the horizon; haze: 0 for clear air, up to about 0.3 for a hazy, dusty or
// foggy place (layout.js `air`, the sky tint's strength). Returns linear RGB for the sun's colour (its brightest
// channel 1) and the two lights' strengths in the game's units (noon: sun about 3, sky about 1).
const K = [0.085, 0.15, 0.29]; // extinction per air mass for red, green, blue (clear tropical air with a little haze)
export function airMass(sinEl) {
  const el = Math.asin(Math.max(0, Math.min(1, sinEl))) * (180 / Math.PI);
  return 1 / (Math.sin((el * Math.PI) / 180) + 0.50572 * Math.pow(el + 6.07995, -1.6364));
}
export function daylight(sinEl, haze = 0) {
  const m = airMass(sinEl), h = 1 + haze * 2;
  const t = K.map((k) => Math.exp(-k * m * h));
  const top = Math.max(...t), lum = 0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2];
  const up = Math.max(0, Math.min(1, sinEl / 0.6)), soft = up * up * (3 - 2 * up);
  return {
    r: t[0] / top, g: t[1] / top, b: t[2] / top,
    // a game keeps its low sun brighter than a photograph would (the eye adapts): strength follows lum^0.55
    sun: 3.1 * Math.pow(lum, 0.55),
    sky: 0.6 + 0.4 * soft,
  };
}

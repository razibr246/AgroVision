// Development only: Meta's WebXR emulator (IWER) standing in for a headset, so the VR game can be entered and driven
// on a computer without one. Loaded by the game page when the address carries ?xremu=quest3 (or quest2, questpro);
// the production build never includes it (FarmGame.jsx imports this file behind import.meta.env.DEV).
// A script then moves the head and controllers through window.__xrDevice (see iwer's XRDevice).
export async function maybeEmulate() {
  if (typeof window === 'undefined' || navigator.xr?.__fsEmu) return;
  const m = /[?&]xremu=(quest3|quest2|questpro)/.exec(window.location.search + window.location.hash);
  if (!m) return;
  const iwer = await import('iwer');
  const cfg = { quest3: iwer.metaQuest3, quest2: iwer.metaQuest2, questpro: iwer.metaQuestPro }[m[1]];
  const dev = new iwer.XRDevice(cfg);
  dev.installRuntime({ forceInstall: true });
  dev.position.set(0, 1.6, 0);
  window.__xrDevice = dev;
  if (navigator.xr) navigator.xr.__fsEmu = true;
}

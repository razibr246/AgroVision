import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECT_NAME, PROJECT_DESCRIPTION } from './src/config/brand.js';
import { slimStoriesClimate } from './src/engine/storyClimate.js';

// Fills %PROJECT_NAME% / %PROJECT_DESCRIPTION% in index.html from src/config/brand.js.
const brandHtml = () => ({
  name: 'brand-html',
  transformIndexHtml: (html) => html.replaceAll('%PROJECT_NAME%', PROJECT_NAME).replaceAll('%PROJECT_DESCRIPTION%', PROJECT_DESCRIPTION),
});

// public/radar/ is a copy of the radar project, including its .git history. Vite copies public/ as is, so take the
// .git folder back out of the build output: it must never be published.
const dropGitHistory = () => {
  let out = 'dist';
  return {
    name: 'drop-git-history',
    apply: 'build',
    configResolved(c) { out = resolve(c.root, c.build.outDir); },
    closeBundle() { rmSync(resolve(out, 'radar/.git'), { recursive: true, force: true }); },
  };
};

// npm run dev: a stand-in for api/plans.js with an in-memory board, so the shared plan board can be tried across
// browser tabs without Upstash. Same checks as the real function; the board is forgotten when the dev server stops.
const devPlansApi = () => ({
  name: 'dev-plans-api',
  apply: 'serve',
  configureServer(server) {
    const board = new Map();
    server.middlewares.use('/api/plans', async (req, res) => {
      const { clean } = await import('./api/plans.js');
      const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
      if (req.method === 'GET') return send(200, { plans: [...board.values()], at: Date.now() });
      if (req.method !== 'POST') return send(405, { error: 'method not allowed' });
      let raw = '';
      for await (const c of req) raw += c;
      let body;
      try { body = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'bad json' }); }
      const plan = clean(body.plan, Number(body.season) || 2027);
      if (!plan) return send(400, { error: 'invalid plan' });
      board.set(plan.plot_id, plan);
      return send(200, { ok: true, plan });
    });
  },
});

// npm run dev: an in-memory stand-in for api/messages.js (same checks), so officer → farmer messages can be tried
// across two tabs (officer in one, farmer in the other).
const devMessagesApi = () => ({
  name: 'dev-messages-api',
  apply: 'serve',
  configureServer(server) {
    const box = new Map(); // farmerId -> Map(id -> message)
    server.middlewares.use('/api/messages', async (req, res) => {
      const { cleanAdv } = await import('./api/messages.js');
      const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
      if (req.method === 'GET') {
        const to = new URL(req.url, 'http://x').searchParams.get('to') || '';
        return send(200, { messages: [...(box.get(to)?.values() ?? [])].map((m) => ({ ...m, to: [to] })).sort((a, b) => b.sent - a.sent), at: Date.now() });
      }
      if (req.method !== 'POST') return send(405, { error: 'method not allowed' });
      let raw = '';
      for await (const c of req) raw += c;
      let body;
      try { body = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'bad json' }); }
      const adv = cleanAdv(body.adv);
      if (!adv) return send(400, { error: 'invalid message' });
      const { to, ...rest } = adv;
      for (const f of to) { if (!box.has(f)) box.set(f, new Map()); box.get(f).set(adv.id, rest); }
      return send(200, { ok: true, n: to.length });
    });
  },
});

// npm run dev: serves api/doctor.js and api/agent.js themselves (the real AI call), reading GEMINI_API_KEY (or ANTHROPIC_API_KEY) from .env.local.
// Without a key it answers 503, just like the deployed function, and the page says the AI doctor is off.
const devDoctorApi = (env) => ({
  name: 'dev-doctor-api',
  apply: 'serve',
  configureServer(server) {
    for (const k of ['GEMINI_API_KEY', 'GEMINI_API_KEYS', 'GEMINI_MODEL', 'GEMINI_AGENT_MODEL', 'GEMINI_DEEP_MODEL', 'GEMINI_TTS_MODEL', 'GEMINI_TTS_VOICE', 'GEMINI_TTS_VOICES_BN', 'GEMINI_TTS_VOICE_BN', 'GEMINI_TTS_VOICE_EN', 'ANTHROPIC_API_KEY', 'ANTHROPIC_DEEP_MODEL', 'GROQ_API_KEY', 'HF_TOKEN', 'HF_AGENT_MODEL', 'META_API_KEYS', 'META_AGENT_MODEL', 'AGENT_PROVIDER_HEDGE_MS']) if (env[k] && !process.env[k]) process.env[k] = env[k];
    // api/agent.js (Chakra Agent), api/tts.js (its natural voice) and api/transcribe.js (call notes, also GROQ_API_KEY)
    // are served the same way, with the same keys.
    for (const name of ['doctor', 'agent', 'tts', 'transcribe']) server.middlewares.use(`/api/${name}`, async (req, res) => {
      const { default: handler } = await import(`./api/${name}.js`);
      let raw = '';
      for await (const c of req) raw += c;
      const out = { statusCode: 200, setHeader: (k, v) => res.setHeader(k, v), status(c) { this.statusCode = c; return this; }, json(b) { res.statusCode = this.statusCode; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); } };
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch { /* handler reports it */ }
      await handler({ method: req.method, body, query: {} }, out);
    });
  },
});

// The upazila climate files keep every NASA POWER series that was fetched (humidity and solar radiation too), but the
// app reads only temperature and rain from them, so the built site leaves the other two out: about 40 KB less over the
// wire for each of Godagari and Dhamrai. The committed files are unchanged.
const CLIMATE_IN_APP = new Set(['provenance', 'start', 'tmax', 'tmin', 'prec', 'prec_imerg']);
const slimClimate = () => ({
  name: 'slim-climate',
  enforce: 'pre',
  transform(code, id) {
    if (id.replaceAll('\\', '/').endsWith('/src/data/climate/stories_climate.json')) {
      return { code: JSON.stringify(slimStoriesClimate(JSON.parse(code))), map: null };
    }
    if (!/[\\/]src[\\/]data[\\/]climate[\\/]climate_[a-z]+\.json$/.test(id)) return null;
    const j = JSON.parse(code);
    return { code: JSON.stringify(Object.fromEntries(Object.entries(j).filter(([k]) => CLIMATE_IN_APP.has(k)))), map: null };
  },
});

// First paint: the app waits for Godagari's NASA climate (bootClimate in main.jsx) before it renders, and the hero
// text needs the Latin Inter font. Both are only discovered after the main script has run, one round trip late, so
// the built index.html preloads them next to the main script instead.
const preloadFirstPaint = () => ({
  name: 'preload-first-paint',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, { bundle }) {
      if (!bundle) return html;
      const tags = [];
      for (const [name, out] of Object.entries(bundle)) {
        if (out.type === 'chunk' && /climate_godagari/.test(name)) tags.push({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: `./${name}` }, injectTo: 'head' });
        if (out.type === 'asset' && /inter-latin-opsz-normal.*\.woff2$/.test(name)) tags.push({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: true, href: `./${name}` }, injectTo: 'head' });
      }
      return tags;
    },
  },
});

// npm run build        -> static site in dist/ (hash routing, works on any static host)
// npm run build:single -> inline app JS/CSS in one HTML; public assets and the MapLibre worker remain alongside it
const manualChunks = (id) => {
  if (!id.includes('node_modules')) return undefined;
  const norm = id.replace(/\\/g, '/');
  if (norm.includes('/node_modules/three/')) return 'vendor-three';
  if (norm.includes('/node_modules/maplibre-gl/')) return 'vendor-maplibre';
  if (norm.includes('/node_modules/leaflet/') || norm.includes('/node_modules/react-leaflet/') || norm.includes('/node_modules/@react-leaflet/') || norm.includes('/node_modules/@maplibre/')) return 'vendor-leaflet';
  if (norm.includes('/node_modules/recharts/') || norm.includes('/node_modules/victory-vendor/') || norm.includes('/node_modules/d3-') || norm.includes('/node_modules/react-smooth/')) return 'vendor-charts';
  if (norm.includes('/node_modules/lucide-react/')) return 'vendor-icons';
  if (norm.includes('/node_modules/@auth0/')) return 'vendor-auth';
  if (norm.includes('/node_modules/react/') || norm.includes('/node_modules/react-dom/') || norm.includes('/node_modules/react-router') || norm.includes('/node_modules/scheduler/') || norm.includes('/node_modules/use-sync-external-store/')) return 'vendor-react';
  return undefined;
};

export default defineConfig(({ mode }) => ({
  plugins: [slimClimate(), react(), tailwindcss(), brandHtml(), preloadFirstPaint(), dropGitHistory(), devPlansApi(), devMessagesApi(), devDoctorApi(loadEnv(mode, process.cwd(), '')), ...(mode === 'single' ? [viteSingleFile()] : [])],
  base: './',
  build: mode === 'single'
    ? { outDir: 'dist-single', chunkSizeWarningLimit: 6000 }
    : {
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          output: { manualChunks },
        },
      },
}));

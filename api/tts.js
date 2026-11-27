import { parseBody } from './body.js';
import { rateLimitResponse } from './rateLimit.js';
import { poolCall, geminiKeys } from './_keypool.js';

// The voice of চক্র এজেন্ট: natural speech from Google Gemini's text-to-speech model, a young Bangladeshi woman's Bangla
// or fluent British English. Vercel serverless function; needs GEMINI_API_KEY. GEMINI_TTS_VOICE_BN / _EN / GEMINI_TTS_VOICE
// and GEMINI_TTS_MODEL override the choices below. Without a key, or once the day's quota is used, it answers an error
// and the browser speaks with its own voice (src/voice/speech.js).
//   POST /api/tts  { text, lang: 'bn'|'en', speaker? }  → { audio: <base64 WAV>, mime: 'audio/wav', voice, model }
// Every key in GEMINI_API_KEYS is tried in turn (api/_keypool.js); each key's project has its own copy of the designed
// Bangladeshi voice, listed in GEMINI_TTS_VOICES_BN in the same order.
const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_TEXT = 900;

const STYLE = {
  bn: 'A naturally warm, expressive adult Bangladeshi woman speaking clear, everyday standard Bangla from Bangladesh. Use native Bangladeshi pronunciation, gentle local intonation, flowing speech, naturally varied pitch, soft sentence endings, realistic rhythm and short breaths. Sound like a kind, confident woman talking to one person, not a newsreader, announcer, advertisement, synthetic assistant, or West Bengali speaker. Keep the delivery relaxed, clear, and human; do not exaggerate the accent.',
  en: 'Warm, friendly British English with relaxed, conversational pacing.',
};
const FALLBACK_STYLE = {
  bn: 'A warm, natural Bangladeshi female voice speaking clear, everyday Bangladeshi Bangla at a relaxed conversational pace.',
  en: 'Warm, fluent British English, spoken naturally with relaxed pacing.',
};
// Google's guidance: a designed voice carries its accent and age itself, so its style stays empty for Bangla (tested so).
const DESIGNED_VOICE_STYLE = {
  bn: '',
  en: 'Warm, conversational and gently expressive, with natural pauses.',
};
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const INTERACTIONS_API = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const DEFAULT_VOICE = 'Aoede';
const regionalVoices = new Map();

// The Bangla voice was designed for this app with Gemini voice design (language bn-BD), because Google's catalogue has
// only West Bengal (Kolkata) Bangla voices. Its description: "A cheerful, expressive young Bangladeshi woman of
// twenty-four, a university graduate from Dhaka, speaking natural modern Bangladeshi Bangla with a gentle smile in her
// voice and lively, flowing rhythm." Six Bangladeshi women's voices were designed and read the same farmer message; a
// panel of Gemini audio judges asked to listen as native Dhaka listeners rated this one most Bangladeshi and most human
// (9–10 of 10 in every round, no Kolkata or robotic features heard) (Oct 2026). A designed voice lives in the API key's
// Google project and expires on 2027-10-30; with another key, or after that, the prebuilt fallback speaks instead.
const BN_DESIGNED = 'voice_zajpkutxwrdt';
const BN_FALLBACK = 'Sulafat'; // a warm prebuilt voice, steered towards Bangladeshi Bangla by the style line
const HEDGE_MS = 5_000; // a key that has not answered by then gets a second key alongside

// The gender of each speaker, and of each prebuilt voice in Google's catalogue (GET /v1beta/voices, Nov 2026): a man
// must speak with a male voice and a woman with a female one (checked in api/tts.test.js).
export const SPEAKER_GENDER = { agent: 'female', tara: 'female', father: 'male', mother: 'female', boy: 'male', girl: 'female', frog: 'male', youngman: 'male', cousin: 'male', oldman: 'male', oldwoman: 'female', teengirl: 'female', youngwoman: 'female' };
export const VOICE_GENDER = { Iapetus: 'male', Achernar: 'female', Leda: 'female', Puck: 'male', Rasalgethi: 'male', Achird: 'male', Zubenelgenubi: 'male', Algenib: 'male', Gacrux: 'female', Laomedeia: 'female', Sulafat: 'female', Aoede: 'female' };

// Who is speaking. The agent and Tara (the satellite in the children's dream) use the designed Bangladeshi woman's voice
// in Bangla; the other characters have their own prebuilt voices, steered by a short style line, and everyone speaks
// British English in English. null = the default voice for that language.
export const SPEAKERS = {
  agent: { bn: null, en: null },
  tara: { bn: null, en: { voice: 'Leda', style: 'A bright, kind young woman, delighted and gently playful, in warm, natural British English.' } },
  father: {
    bn: { voice: 'Iapetus', style: 'A Bangladeshi farmer in his forties from a village, warm and a little weary, speaking everyday Bangladeshi Bangla.' },
    en: { voice: 'Iapetus', style: 'A warm, slightly weary farmer in his forties, in natural British English.' },
  },
  mother: {
    bn: { voice: 'Achernar', style: 'A Bangladeshi farming mother in her late thirties, soft and caring, speaking everyday Bangladeshi Bangla.' },
    en: { voice: 'Achernar', style: 'A soft, caring mother in her late thirties, in natural British English.' },
  },
  // Google has no child voices: a boy speaks with a male voice of medium pitch, a girl with a female voice of high pitch,
  // each steered young by the style line. (Genders from Google's voice catalogue, GET /v1beta/voices, Nov 2026.)
  boy: {
    bn: { voice: 'Rasalgethi', style: 'A curious, lively nine-year-old Bangladeshi boy with a light young voice, speaking simple everyday Bangladeshi Bangla.' },
    en: { voice: 'Rasalgethi', style: 'A curious, lively nine-year-old boy with a light young voice, in natural British English.' },
  },
  girl: {
    bn: { voice: 'Leda', style: 'A curious, lively nine-year-old Bangladeshi girl, speaking simple everyday Bangladeshi Bangla.' },
    en: { voice: 'Leda', style: 'A curious, lively nine-year-old girl, in natural British English.' },
  },
  youngman: {
    bn: { voice: 'Achird', style: 'A friendly Bangladeshi young farmer of about thirty, speaking everyday Bangladeshi Bangla.' },
    en: { voice: 'Achird', style: 'A friendly young farmer of about thirty, in natural British English.' },
  },
  cousin: {
    bn: { voice: 'Zubenelgenubi', style: 'A relaxed Bangladeshi young man who works in a Dhaka factory, speaking casual everyday Bangladeshi Bangla.' },
    en: { voice: 'Zubenelgenubi', style: 'A relaxed young man who works in a city factory, in casual British English.' },
  },
  oldman: {
    bn: { voice: 'Algenib', style: 'A Bangladeshi farmer in his sixties, slow and grounded, speaking everyday village Bangladeshi Bangla.' },
    en: { voice: 'Algenib', style: 'An old farmer in his sixties, slow and grounded, in natural British English.' },
  },
  oldwoman: {
    bn: { voice: 'Gacrux', style: 'A Bangladeshi grandmother in her eighties, slow, warm and wise, speaking village Bangladeshi Bangla.' },
    en: { voice: 'Gacrux', style: 'A grandmother in her eighties, slow, warm and wise, in natural British English.' },
  },
  teengirl: {
    bn: { voice: 'Laomedeia', style: 'A bright Bangladeshi girl of fifteen, eager and hopeful, speaking everyday Bangladeshi Bangla.' },
    en: { voice: 'Laomedeia', style: 'A bright girl of fifteen, eager and hopeful, in natural British English.' },
  },
  youngwoman: {
    bn: { voice: 'Leda', style: 'A confident Bangladeshi young woman of eighteen, speaking modern everyday Bangladeshi Bangla.' },
    en: { voice: 'Leda', style: 'A confident young woman of eighteen, in natural British English.' },
  },
  frog: {
    bn: { voice: 'Puck', style: 'A cheeky cartoon frog, playful and a little croaky, speaking Bangladeshi Bangla.' },
    en: { voice: 'Puck', style: 'A cheeky cartoon frog, playful and a little croaky, in British English.' },
  },
};
// The full model first; the free tier allows each TTS model 10 requests a day, so the Lite model takes over when it is used.
const models = () => [...new Set([process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'])];

function spokenTranscript(text, lang) {
  if (lang !== 'bn') return text;
  return text
    .replace(/\bNASA\s+POWER\b/gi, 'নাসা পাওয়ার')
    .replace(/\bNASA\s+IMERG\b/gi, 'নাসা আইমার্জ')
    .replace(/\bNASA\b/gi, 'নাসা')
    .replace(/\bSentinel[-\s]?1\b/gi, 'সেন্টিনেল এক')
    .replace(/\bSentinel[-\s]?2\b/gi, 'সেন্টিনেল দুই')
    .replace(/\bMODIS\b/gi, 'মোডিস')
    .replace(/\bSoilGrids?\b/gi, 'সয়েলগ্রিডস')
    .replace(/\bBMD\b/gi, 'আবহাওয়া অধিদপ্তর')
    .replace(/\bBRRI\b/gi, 'ব্রি')
    .replace(/\bBARI\b/gi, 'বারি')
    .replace(/\bDAE\b/gi, 'কৃষি সম্প্রসারণ অধিদপ্তর')
    .replace(/\bDAM\b/gi, 'কৃষি বিপণন অধিদপ্তর')
    .replace(/\bSRDI\b/gi, 'মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট')
    .replace(/\bBBS\b/gi, 'পরিসংখ্যান ব্যুরো')
    .replace(/\bMERRA-?2\b/gi, 'মেরা টু')
    .replace(/\bICBM\b/gi, 'আইসিবিএম')
    .replace(/\bIPCC\b/gi, 'আইপিসিসি')
    .replace(/\bFAO-?56\b/gi, 'এফএও ছাপ্পান্ন')
    .replace(/\bNDVI\b/gi, 'এনডিভিআই')
    .replace(/\bSPI\b/gi, 'এসপিআই')
    .replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 শতাংশ')
    .replace(/[0-9]/g, (digit) => BN_DIGITS[Number(digit)]);
}

async function voiceFor(lang, key = process.env.GEMINI_API_KEY) {
  const override = lang === 'bn' ? process.env.GEMINI_TTS_VOICE_BN : process.env.GEMINI_TTS_VOICE_EN;
  if (override || process.env.GEMINI_TTS_VOICE) {
    const name = override || process.env.GEMINI_TTS_VOICE;
    return { name, regional: false, designed: /^voice_[\w-]+$/i.test(name) };
  }
  if (lang === 'bn') return { name: BN_DESIGNED, designed: true };
  if (regionalVoices.has(lang)) return regionalVoices.get(lang);

  const pending = (async () => {
    try {
      const params = new URLSearchParams({ type: 'prebuilt', gender: 'female', page_size: '100' });
      const locales = lang === 'bn' ? ['bn-BD', 'bn-IN', 'bn'] : ['en-GB'];
      for (const locale of locales) params.append('language_code', locale);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/voices?${params}`, {
        headers: { 'x-goog-api-key': key },
        signal: AbortSignal.timeout(1800),
      });
      if (!response.ok) return { name: DEFAULT_VOICE, regional: false };
      const { voices = [] } = await response.json();
      const locale = lang === 'bn' ? /^bn(?:-|$)/i : /^en-GB$/i;
      const femaleVoices = voices.filter((voice) => voice.id && (!voice.gender || /^female$/i.test(voice.gender)));
      const matches = femaleVoices.filter((voice) => locale.test(voice.language_code ?? ''));
      const preferredPersona = (voice) => /warm|friendly|gentle|casual|easy-going|breezy|companion|assistant/i.test(`${voice.persona ?? ''} ${voice.description ?? ''}`);
      const preferredRegion = (voice) => lang === 'bn'
        ? /^bd$/i.test(voice.region_code ?? '') || /^bn-bd$/i.test(voice.language_code ?? '')
        : /^gb$/i.test(voice.region_code ?? '') || /british/i.test(voice.accent ?? '');
      const voice = matches.find((item) => preferredRegion(item) && preferredPersona(item))
        ?? matches.find(preferredRegion)
        ?? matches.find(preferredPersona)
        ?? matches[0];
      return voice?.id ? { name: voice.id, regional: true } : { name: DEFAULT_VOICE, regional: false };
    } catch {
      return { name: DEFAULT_VOICE, regional: false };
    }
  })();
  regionalVoices.set(lang, pending);
  return pending;
}

// Gemini 3.8 returns WAV; older configurable models may return headerless PCM.
export function wav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// The audio in an Interactions response sits in a model_output step (the SDKs surface it as output_audio).
function findAudio(o) {
  if (!o || typeof o !== 'object') return null;
  if (o.output_audio?.data) return o.output_audio;
  if (o.type === 'audio' && o.data) return o;
  if (o.inlineData?.data) return o.inlineData;
  for (const v of Object.values(o)) { const f = findAudio(v); if (f) return f; }
  return null;
}

// One attempt: a designed voice goes through the Interactions API, a prebuilt or catalogue voice through generateContent.
async function synthesize({ key, signal, model, voice, designed, transcript, style }) {
  const body = designed
    ? {
        model,
        input: [{ type: 'user_input', content: [{ type: 'text', text: transcript, ...(style ? { annotations: [{ type: 'speech_metadata', style }] } : {}) }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice }] },
      }
    : {
        contents: [{ role: 'user', parts: [{ text: transcript, ...(style ? { speech_metadata: { style } } : {}) }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voice } } },
      };
  const r = await fetch(designed ? INTERACTIONS_API : `${API}/${model}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) return { status: r.status, body: typeof r.text === 'function' ? await r.text().catch(() => '') : '' };
  const j = await r.json();
  const part = findAudio(j);
  if (!part?.data) return { status: 502 };
  const audio = Buffer.from(part.data, 'base64');
  const mime = part.mime_type ?? part.mimeType ?? '';
  const out = /wav/i.test(mime) || audio.toString('ascii', 0, 4) === 'RIFF' ? audio : wav(audio, Number(/rate=(\d+)/i.exec(mime)?.[1]) || 24000);
  return { status: 200, audio: out, model: j.modelVersion || j.model || model };
}

// The voice for this speaker, language and key: the Bangladeshi designed voice of that key's project for the agent and
// Tara in Bangla, the British catalogue voice for the agent in English, a character's own voice otherwise.
async function voiceFor2(speaker, lang, index, key) {
  const role = SPEAKERS[speaker]?.[lang];
  if (role) return { name: role.voice, designed: false, style: role.style };
  if (lang === 'bn') {
    const own = String(process.env.GEMINI_TTS_VOICES_BN ?? '').split(',').map((v) => v.trim())[index];
    const id = process.env.GEMINI_TTS_VOICE_BN || own || (index === 0 ? BN_DESIGNED : '');
    return id ? { name: id, designed: /^voice_[\w-]+$/i.test(id), style: DESIGNED_VOICE_STYLE.bn } : { name: BN_FALLBACK, designed: false, style: FALLBACK_STYLE.bn };
  }
  const v = await voiceFor('en', key);
  return { name: v.name, designed: !!v.designed, style: v.designed ? DESIGNED_VOICE_STYLE.en : v.regional ? STYLE.en : FALLBACK_STYLE.en };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method not allowed' }); }
  if (!geminiKeys().length) return res.status(503).json({ error: 'voice not configured' });
  const parsed = parseBody(req.body);
  if (!parsed.ok) return res.status(400).json({ error: 'bad json' });
  const body = parsed.value;
  const lang = body?.lang === 'en' ? 'en' : 'bn';
  const asked = body?.speaker === 'child' ? 'girl' : body?.speaker; // 'child' was the old name, before boys had their own voice
  const speaker = Object.hasOwn(SPEAKERS, asked ?? '') ? asked : 'agent';
  const text = String(body?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
  if (!text) return res.status(400).json({ error: 'empty text' });
  const blocked = await rateLimitResponse(req, res, { scope: 'tts', limit: 240, windowSeconds: 3600 });
  if (blocked) return blocked;
  try {
    const transcript = spokenTranscript(text, lang);
    let last = 502;
    // Each model in turn, each key in turn within it. A designed voice this key's project does not have (another key,
    // or expired) is replaced by the prebuilt one on the same key, so the line is still spoken.
    for (const model of models()) {
      const r = await poolCall(`tts:${model}`, async (key, index, signal) => {
        const v = await voiceFor2(speaker, lang, index, key);
        let out = await synthesize({ key, signal, model, voice: v.name, designed: v.designed, transcript, style: v.style });
        if ((out.status === 400 || out.status === 404) && v.designed) {
          out = await synthesize({ key, signal, model, voice: lang === 'bn' ? BN_FALLBACK : DEFAULT_VOICE, designed: false, transcript, style: FALLBACK_STYLE[lang] });
          if (out.status === 200) out.voice = lang === 'bn' ? BN_FALLBACK : DEFAULT_VOICE;
        }
        return out.status === 200 ? { status: 200, value: { ...out, voice: out.voice ?? v.name } } : { status: out.status, body: out.body };
      }, { hedgeMs: HEDGE_MS, timeoutMs: 25_000 });
      if (r.ok) return res.status(200).json({ audio: r.value.audio.toString('base64'), mime: 'audio/wav', voice: r.value.voice, model: r.value.model, speaker, key: r.index + 1 });
      last = r.status;
    }
    return res.status(last === 429 ? 429 : last === 503 ? 503 : 502).json({ error: last === 429 ? 'voice quota used for today' : `voice service error ${last}` });
  } catch (e) {
    return res.status(e?.name === 'TimeoutError' ? 504 : 502).json({ error: 'voice service unreachable' });
  }
}

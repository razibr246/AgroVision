# Voice assistant (Bangla, farmer and officer)

## Try it

`npm run dev`, open `/farmer/voice` or `/officer/voice`. Tap the mic (Chrome, Edge or Android Chrome; Bangla listening needs an internet connection because the browser sends audio to its own recogniser). You can always type instead.

Spoken replies first try `api/tts.js` (Gemini 3.8 Flash TTS). Bangla uses a designed Bangladeshi woman's voice (below; `GEMINI_TTS_VOICE_BN` overrides it); British English filters the catalogue for a female `en-GB` voice. Replies use Bengali digits and localize “NASA POWER” pronunciation while leaving the on-screen transcript unchanged. Set the server-side `GEMINI_API_KEY` to enable it; optional model and voice overrides are in `.env.example`. Spoken reply text is sent to Gemini for audio generation. If the service is unavailable, unconfigured or playback fails, replies fall back to the best matching installed device voice; where the device labels a feminine voice, it is preferred, with a small pause between sentences. The same service is used by the narrated field story.

## Natural Bangladeshi female voice

Google's voice catalogue has only West Bengal (Kolkata) Bangla voices, so the Bangla voice is designed with Gemini voice
design (`language_code: bn-BD`). In October 2026 six Bangladeshi women's voices were designed from short descriptions
(Google's guide: one or two sentences with the permanent traits) and each read the same farmer message. A panel of
Gemini audio judges, asked to listen as native Dhaka listeners, rated each for Bangladeshi accent, human naturalness,
pronunciation and warmth. The winner, `voice_zajpkutxwrdt` ("a cheerful, expressive young Bangladeshi woman of
twenty-four … from Dhaka"), scored 9–10 of 10 in every round with no Kolkata or robotic features heard, and is the
default in `api/tts.js`. Voices described as older, Sylheti or Rajshahi were heard as Kolkata-leaning or flat. A
judge model is not a person: ask Bangladeshi listeners before a launch.

A designed voice lives in the Google project of the key that made it and expires after a year (this one 2027-10-30).
With another key, run `npm run design:voice` (it uses the winning description) and set the printed
`GEMINI_TTS_VOICE_BN=voice_...` in `.env.local` and the Vercel environment; until then the prebuilt `Sulafat` voice
speaks, steered towards Bangladeshi Bangla by a style line. A designed voice carries its accent itself, so its style
stays empty. The free Gemini tier allows each TTS model 10 requests a day (and Flash-Lite 3 a minute): the full model
is tried first, then `gemini-3.8-flash-lite-tts`, then the device voice, where Edge's Nabanita (Bangladesh) is
preferred. A paid tier lifts the limit.

The voice is generated from a general description, not copied from a real speaker. Replies are sent to Gemini for speech generation.

## Several keys, one voice, every character (Nov 2026)

- **Keys in turn.** `GEMINI_API_KEYS` lists the Gemini keys in priority order; `api/_keypool.js` tries them one after
  another for each model. A key Google refuses for quota rests (per minute ~1 min, per day 6 h) and is skipped, three
  failures in a row rest it 5 min, and a key slow to answer gets a second key started alongside (2.5 s for the agent,
  5 s for voice); the first good answer wins. The agent, voice, crop doctor and call notes all use it. Rotating keys is
  for reliability; Google's terms apply to each key, and a paid key is the supported way to more quota.
- **The same Bangladeshi voice on every key.** A designed voice belongs to the project that made it, so each key's
  project has its own copy from the winning description; `GEMINI_TTS_VOICES_BN` lists them in key order. Key 1's
  voice, the one rated in the listening comparison, is tried first; the others sound close to it, not identical.
  An override pointing at the older `bn-IN` (Indian Bengali) voice was removed.
- **Characters.** `api/tts.js` takes `speaker`: `agent` and `tara` speak in the designed Bangladeshi voice, `father`,
  `mother`, `child` and `frog` have their own voices with a short style line, and everyone speaks British English in
  English. The children's dream (`/kids`) picks the speaker from each line and makes the next lines' audio while the
  current one plays (`prefetchNatural`), so a child does not wait between lines.
- **Mixed replies.** `src/engine/langseg.js` cuts a reply into Bangla and English sentences, and each is spoken in its
  own voice; an English name inside a Bangla sentence stays Bangla.
- **Meta AI alongside Gemini.** `META_API_KEYS` (api.meta.ai, OpenAI-style, model `muse-spark-1.3` by default): when
  Gemini has not answered in 2 s (8 s in deep mode) Meta starts too and the first good answer wins (`firstGood` in
  `api/agent.js`); if Gemini fails first, Meta starts at once. On 2026-11-12 all three keys listed ten models but every
  chat call answered 402 `billing_not_configured`, so Meta is wired but silent until billing is set up at
  dev.meta.ai/billing; a refused key rests 30 min and costs no time.
- **Measured (Nov 2026, free keys).** Agent: 3.5 Flash-Lite answered in 1.9 s, 3.1 Flash-Lite in 1.6 s; 3.8 Flash hung
  90 s and is not used for the agent; Gemini 4 Argon and 3.1 Pro are refused on the free tier (quota 0), so deep mode
  reaches them only with a paid key. Voice: 3.6–7.9 s per line. The Hugging Face fallback needs credits (402 without).



| Say | Answer comes from |
| --- | --- |
| কী লাগাব? / কবে লাগাব? / কেন? | `decide()` Keep / Adjust / Shift on 25 seasons of NASA POWER backtest, soil, water source, harvest-glut |
| আজ সেচ লাগবে? / আবহাওয়া | `waterAdvice()` colour and reasons; live Open-Meteo weather or the sample scenario (the voice says which) |
| ফসল কবে উঠবে, কত মণ? | `harvestWindow()` (growing-degree days) and `yieldRange()` for the saved field size |
| দাম পড়বে? | harvest-glut level. It never forecasts prices |
| পরের ফসল কী? | `recommendRotation()` |
| মাটি কেমন? | union soil values and notes |
| সমস্যা জানাতে চাই | multi-turn report, read back, sent on "yes" to the SAAO as a normal request |
| অফিসার, আমার অনুরোধ, তথ্য কোথা থেকে এল | contacts, request status and advice received, data provenance |

## What officers can do

Briefing, list and read requests, send the drafted or a dictated reply, ask for more photos, mark resolved, area alerts, advise everyone in a cluster, tell the UAO, harvest timing per crop, tomato planting slots, crop share. UAO only: union ranking, what field officers sent up (mark seen), advice to the whole upazila. The Aman radar summary is available to both.

## Safety rules built in

1. Nothing that changes data is done without a spoken yes. Tests assert zero effects before confirmation.
2. Danger-to-life words (snake bite, poison, fire, electric shock) get 999 immediately.
3. The assistant never gives pesticide or fertiliser doses and never forecasts prices; it routes to the SAAO and the Krishi Call Centre (16123, verify before launch).
4. If climate data is the placeholder, the first plan, harvest or briefing answer says so.
5. A SAAO cannot send whole-upazila advice; that is the UAO's action.

## Phone line (services/voice-agent)

The preserved legal voice agent already does phone-grade Bangla: Soniox speech-to-text and text-to-speech, barge-in, DTMF, a Groq-hosted model. Switch it to farming with `AGENT_DOMAIN=field` (or `domain: "field"` and `fieldRole` in the `/api/llm` body). The model has one tool, `askFieldAssistant`, which runs the same brain on a snapshot the app POSTs to `/api/field/session`; effects the brain queues are fetched with `GET /api/field/session?sessionId=...` and applied by the app. Keys 1-6 per role are in `lib/agent/field/field-prompt.ts`.

Re-sync after editing the brain: `npm run sync:voice`.

## Extending the vocabulary

Add everyday phrases to `src/voice/lexicon.js` (Bangla script, as speech recognisers return it) and a test in `src/voice/voice.test.js`. Keywords of three characters or fewer match only at the start of a word, so "দাম" does not fire inside "বাদামি". Ask farmers and SAAOs how they actually say things; the lists here are a starting point.

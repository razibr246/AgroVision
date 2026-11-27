# AgroVision Mobile: Design Specification (phases 1–5, no code yet)

Status: **draft for review**. No Figma file or prototype exists yet. This document is the Figma-ready specification:
every frame, token and flow below can be built in Figma one to one. Nothing here has been user-tested; personas are
working assumptions from the web app's own farmer and officer roles, to be checked with real farmers and officers
(see `docs/USER_TESTING.md` for what has actually been recorded).

## 1. Concept and objectives

AgroVision Mobile puts the web app's season decision, field tasks, crop doctor and officer inbox in a phone,
Bangla first, usable outdoors on a low-end Android with a weak connection.

Objectives:
1. A farmer opens the app and, in under 10 seconds, knows what to do on the field this week.
2. A farmer can report a problem (photo, voice) and see the officer's answer without typing much.
3. A field officer can triage requests and send an approved advisory from the field.
4. Works offline for the last synced field, plan and tasks; queues reports until the network returns.

Out of scope for v1 (stays on the web app): the 3D farm game, `/science`, Field Future's full ten-year comparison. The mobile app links out to them.

Real vs sample stays a product rule: every number keeps its tag (`SAT`, `STATION`, `MODEL`, `RECORD`, `RULE`, `AI`,
`DEMO`), shown as a small chip on the card.

## 2. Audience and roles

| Role | Who | Main need | Device assumption |
| --- | --- | --- | --- |
| Farmer | Smallholder, Bangla speaker, low literacy possible | What to do now; ask for help | Budget Android, 360×800, patchy data |
| Union officer (SAAO) | Answers farmers' reports | Triage, reply, visit notes | Mid Android or iPhone |
| Upazila officer (UAO) | Sees the whole upazila | Alerts, planting, supply | Tablet or phone |
| Admin | Project staff | Users, data refresh, audit log | Web only (not on mobile) |

Permissions: farmer sees only their own fields and requests. SAAO sees farmers in their union. UAO sees the upazila.
Anything sent in the office's name needs an officer's approval in every mode (existing rule, keep it).

## 3. Sitemap and navigation

Bottom navigation, 4 tabs for farmers (large icons, labels in Bangla with English under in small type):

```
Farmer
├─ আজ Today           (home)
│   ├─ This week's tasks (list → task detail → mark done)
│   ├─ Season decision card (KEEP / ADJUST / SHIFT) → Plan detail
│   ├─ Weather warning banner (7-day, spray check)
│   └─ Field signals (6 cards) → signal detail
├─ আমার মাঠ My field
│   ├─ Field map + boundary (draw, GPS walk, tap-to-detect)
│   ├─ Soil (SoilGrids estimate, own soil test entry)
│   ├─ Field risks
│   └─ Satellite photo / greenness history
├─ সাহায্য Help
│   ├─ Crop doctor (camera → result)
│   ├─ Report a problem (photo, voice note, text) → request thread
│   ├─ Chakra agent (voice + chat)
│   └─ Government support (match, ask a question)
└─ আমি Me
    ├─ Profile, fields list, priorities
    ├─ Language (বাংলা / English), text size, audio
    ├─ Notifications settings
    └─ Data and privacy, sign out
```

Officer (SAAO/UAO), 5 tabs: Inbox (requests) · Farmers · Map · Alerts · More (Planting, Supply, Radar, Call notes, Profile).

Global: top bar with field switcher and sync status; floating mic button (voice) on Today and Help; command search
(farmers, fields, crops) on officer screens.

## 4. Screen inventory (about 60 frames)

**A. Onboarding and auth (9)**
1. Splash (logo, language toggle)
2. Welcome 1–3 (what it does, real data not a guess, works with weak signal)
3. Choose role (farmer / officer)
4. Phone number entry
5. OTP verification (6 boxes, resend timer, error)
6. Officer sign-in (ID + OTP; approval pending state)
7. Permissions primer (location, camera, microphone, notifications; each skippable)
8. Set up first field (use GPS / pick on map / skip: demo field, labelled sample)
9. Priorities (income, water, risk, soil, early harvest, cattle feed, soil cover; sliders or tap-to-rank)

**B. Farmer core (24)**
Today · task detail · season decision detail (KEEP/ADJUST/SHIFT with why, evidence chips, gaps) · weather warning
detail · spray check · signals list · signal detail · My field home · boundary editor (draw / GPS walk / photo-edge
suggestion with "check and adjust") · soil detail · soil test entry · field risks · greenness history · Crop doctor
camera · Crop doctor result (AI tag, "send to officer") · New report (photo, voice, text) · Request thread · Chakra
agent · Voice session · Support list · Support detail (pilot/announced/ended shown honestly, never a plain yes) ·
Support ask-a-question · Harvest and market prices · Rotation summary (read-only, "open full on web")

**C. Officer (14)**
Inbox · Request detail + reply composer (approval step before sending) · Farmers list · Farmer detail · Area map
(risk layers) · Alerts list · Alert compose → approve → send · Planting (Aman onset brief) · Supply (glut watch) ·
Radar brief · Call notes list · Call note: consent → record/load → transcript → sealed note · Visit note · Upazila
overview

**D. Shared (10)**
Notifications centre · Profile · Settings · Language and text size · Offline and sync status · About data sources
(provenance register) · Privacy and consent · Help and feedback · Terms · Delete account

**E. States (every list and detail gets these; specified once as components)**
Loading skeleton · Empty (illustration + one action) · Error (what happened, retry) · Offline banner (shows
"last synced 2 h ago") · No permission (explains why, button to settings) · Sample-data banner (when `DEMO`) ·
Pending officer approval · Session expired · Update required.

## 5. Key user flows

1. **First run (farmer):** Splash → Welcome → Role → Phone → OTP → Permissions → First field → Priorities → Today.
2. **Daily check:** Open → Today (offline-first from cache) → tap task → Done (haptic, small confetti-free check) → next.
3. **Report a problem:** Help → Report → take photo → hold-to-record voice → pick field → Send (queued if offline) → thread
   shows "waiting for officer" → push when answered.
4. **Crop doctor:** Camera → result with `AI` tag and reply check → "Not sure? Send to officer" creates a request.
5. **Officer reply:** Inbox → request → read photo + field context → draft reply → **Approve & send** (explicit step) →
   audit entry.
6. **Officer advisory:** Planting → onset brief → choose farmers → preview → approve → send as push + SMS.
7. **Call note:** Farmer detail → Call note → record consent (blocks recording until given) → record ≤5 min → transcript →
   check quoted amounts → seal.

## 6. UI/UX direction

Premium, calm and legible outdoors. High contrast, big targets, few words, icons that carry meaning without text.

- **Layout:** 16 px gutters, 8 px grid, cards with 16–20 px radius, one primary action per screen, thumb-zone actions
  at the bottom. Works from 320×640 to tablets; officer tablet uses a two-pane list/detail.
- **Motion (all respect "reduce motion"):** 200 ms ease-out screen transitions, shared-element from card to detail,
  pull-to-refresh, task-complete tick, skeleton shimmer. No motion longer than 300 ms.
- **Accessibility:** WCAG AA contrast (4.5:1 text, 3:1 UI), 48×48 dp touch targets, dynamic type to 200%, screen-reader
  labels in both languages, never colour alone (icons + words for KEEP/ADJUST/SHIFT and risk levels), audio read-aloud
  for every card (Bangla TTS already exists in `api/tts.js`).
- **Bangla first:** Bangla numerals by default (`bnDigits`), a Bangla-capable typeface sized up (Bangla needs about 10%
  more line height than Latin).

## 7. Design system (tokens to define as Figma variables)

Colour (proposed; reconcile with the web app's Tailwind theme before building so both look related):

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `primary` | #1F7A4D | #5BC48A | Main actions, active tab |
| `primary-container` | #DDF3E6 | #14382A | Selected, success surfaces |
| `secondary` (earth) | #A8612A | #E2A06B | Accents, soil/field |
| `water` | #1E6FB8 | #6DB1EC | Rain, irrigation |
| `warn` | #B7791F | #F0C060 | ADJUST, caution |
| `danger` | #B3261E | #F2877F | SHIFT, errors |
| `surface` / `surface-2` | #FFFFFF / #F4F6F2 | #111613 / #1A211C | Backgrounds, cards |
| `text` / `text-muted` | #14201A / #55645B | #E8EEE9 / #9AA89F | Body |

Tag chips: `SAT`, `STATION`, `MODEL`, `RECORD`, `RULE`, `AI`, `DEMO` each have a neutral outlined chip and an icon, so
they never rely on colour. Contrast values above must be checked in Figma before sign-off.

Typography: Bangla **Noto Sans Bengali** (or Hind Siliguri), Latin **Inter**. Scale: Display 28/36, Title 22/30,
Heading 18/26, Body 16/26, Label 14/20 (medium), Caption 12/16. Weights 400, 500, 700. Minimum body size 16.

Spacing: 4, 8, 12, 16, 24, 32, 48. Radius: 8 (chips, inputs), 16 (cards), 28 (sheets), full (buttons, FAB).
Elevation: 0 / 1 / 3 (cards flat with 1 px border; elevation only on sheets and FAB).

Components (each with default, pressed, disabled, focus, error): primary / secondary / text / destructive buttons,
mic FAB, text field, OTP field, number stepper (acres, bigha, kg), segmented control, chips and tag chips, list row,
task card, decision card (KEEP/ADJUST/SHIFT), signal card with sparkline, map card, photo tile, bottom tab bar,
top bar with field switcher, bottom sheet, dialog, toast/snackbar, banner (offline, sample, approval), skeleton,
empty state, progress (sync, upload).

Icons: one outline icon set at 24 dp, 2 px stroke (Lucide-style), custom crop and field glyphs drawn to match.

Dark mode: yes, follows the system; tokens above.

## 8. Technical architecture (recommendation, to confirm after design review)

- **Stack:** React Native with Expo. The team already writes React and the engine in `src/engine/` is plain
  JavaScript, so it can run on the phone unchanged, which is what makes offline decisions possible. Alternative:
  Flutter (better animation, but the engine would have to be rewritten or called over the network).
- **Frontend:** feature folders (today, field, help, officer), a shared package for `src/engine/`, `src/voice/` and the
  data JSON, TanStack Query for server state, SQLite (WatermelonDB or op-sqlite) for the offline cache, Zustand for
  UI state, i18n through the same `T(bn, en)` pattern.
- **Backend:** keep the existing Vercel functions (`plans`, `messages`, `doctor`, `agent`, `tts`,
  `transcribe`). Add: `auth` (phone OTP), `devices` (push tokens), `reports` (upload photo/voice), `sync`.
  A database is needed because the web app's storage is demo-grade: Postgres (Neon or Supabase) with row-level security
  by role.
- **Data model (core tables):** `users(id, role, phone, union_id, locale)`, `farmers(user_id, name, upazila_id)`,
  `fields(id, farmer_id, boundary geojson, boundary_source, verified, area_m2)`, `soil_tests(field_id, ph, om, n, date)`,
  `priorities(farmer_id, weights jsonb)`, `plans(field_id, season, decision, payload jsonb)`,
  `tasks(id, field_id, due, done_at)`, `requests(id, field_id, kind, status, created_by)`,
  `messages(request_id, author_id, body, media_url, approved_by, approved_at)`, `call_notes(id, request_id,
  consent_at, transcript, note, hash)` (no audio stored), `devices(user_id, token, platform)`,
  `audit_log(seq, actor, action, prev_hash, hash)`.
- **API (REST, JSON):** `POST /auth/otp`, `POST /auth/verify`, `GET /me`, `GET/POST /fields`, `PUT /fields/:id/boundary`,
  `GET /fields/:id/plan`, `GET /fields/:id/tasks`, `PATCH /tasks/:id`, `POST /requests`, `GET /requests/:id`,
  `POST /requests/:id/messages`, `POST /requests/:id/approve`, `POST /doctor`, `POST /agent`, `POST /tts`,
  `POST /transcribe`, `GET /officer/inbox`, `POST /devices`, `GET /sync?since=`.
- **Auth:** phone OTP via SMS (Twilio Verify or a Bangladesh gateway), short-lived JWT + refresh token in the OS
  keychain/keystore, role in the token, server enforces it. Officers need approval by an admin.
- **Push:** FCM (Android) and APNs (iOS) through Expo notifications; SMS fallback for farmers without data. Topics by
  union for advisories.
- **Integrations:** Gemini/Anthropic (doctor, agent), Gemini/Groq (transcribe), Gemini TTS, maps (MapLibre native),
  existing NASA/partner data already committed as JSON.
- **Security:** TLS only, tokens in secure storage, photos stripped of EXIF location unless the farmer attaches the
  field, consent record before any recording, audio never stored, hash-chained audit log, data deletion on request,
  rate limits on AI and OTP endpoints. Secrets stay server-side.
- **Offline:** read cache of the active field, plan, tasks and last 20 messages; write queue for reports, task ticks and
  field edits with retry and conflict rule "server wins, show the farmer what changed".
- **Performance:** target cold start under 3 s on a budget Android, lazy screens, image compression before upload
  (about 300 KB), maps use cached vector tiles, bundle splitting for the engine.

## 9. Workflow and what I need from you

| Phase | Output | Status |
| --- | --- | --- |
| 1 Requirements | Sections 1–2 above | **Needs your confirmation** (see questions) |
| 2 A–Z structure | Sections 3–5 | Drafted |
| 3 Figma UI | Figma file from sections 4–7 | **Blocked here:** I can't sign in to Figma. Options below |
| 4 Prototype | Clickable flows from section 5 | Not started |
| 5 Review | Your sign-off | Waiting |
| 6–9 Build, backend, test, ship | After sign-off only | Not started |

Ways to get the Figma file:
1. You authorize the Figma connector (claude.ai connector settings or `/mcp` in an interactive session), and I build
   the frames and prototype links directly in your file.
2. I make a **clickable HTML prototype** of the main flows in this repo that you can open on a phone, as a stand-in
   until the Figma file exists.
3. You or a designer build the Figma file from sections 4–7; I can write a frame-by-frame brief per screen.

Open questions: Is this the AgroVision mobile app, or a different app? Farmers first, or officers first? Android
only for v1? Is SMS-based login acceptable and which gateway? Who is the approving officer for advisories?

The "production-ready mobile application" is not something I can deliver before design sign-off, and I haven't
started it.

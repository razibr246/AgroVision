# Testing with farmers and officers

A protocol and record for testing the main flow with Bangladeshi farmers and agriculture officers. The team reports
a Dhamrai session on 4 November 2026 with five farmers and one agriculture officer; participants reportedly tried
all project features. Feedback themes included Ropon Radar, more NASA-data visualization, and a more farmer-centered
experience for people with limited internet or smartphone access. The exact tasks, participant responses, specific
findings, and resulting fixes were not recorded. Treat this as team-reported experience, not independently
verifiable field validation; do not infer results from the protocol below.

**Run it with the kit in the app: `/testkit`.** The kit requires an explicit yes before collecting session data;
declining exits without saving. It times the four tasks, records the three questions and problems, and exports a CSV
and ready-made rows for the results table below. Do not enter names, phone numbers, or identifying details in any
free-text field. Results stay on the device until exported. Older saved sessions without a recorded consent flag are
excluded from counts and exports.

## Who

- 6–8 farmers across two upazilas, including at least two who read little or no Bangla, at least two women, and at
  least two using a low-end Android phone (2 GB RAM or less, a slow 3G/4G connection).
- 2–3 Sub-Assistant Agriculture Officers (SAAO) and one Upazila Agriculture Officer.
- Consent read aloud in Bangla; no names or phone numbers recorded; the farmer may stop at any time.

## The task (farmers, 15 minutes, no help)

Start on the farmer home page. The four-step path on it is the whole task:

1. Choose your field (on the map).
2. Say what matters this season.
3. Compare the options.
4. Try to share it with your officer. If the hosted service is unavailable, mark the task **blocked by app/service**
and record the observed error; do not score this as a participant failure.

The test kit reports participant difficulty separately from product-blocked tasks. Report both; do not omit a blocked
task from the study summary.

The hosted plans/messages endpoints were returning HTTP 503 on 6 November 2026. Until availability is rechecked,
the online officer-sharing task is expected to be blocked; test only a local demo if it is clearly identified as
local and actually works.

Then ask, without showing the screen, the three questions. Record the answer in their words:

| Question | Counts as understood when the farmer… |
| --- | --- |
| **What is recommended?** | names the crop and roughly when to sow |
| **Why?** | gives at least one real reason shown (weather in past seasons, water, profit, soil) |
| **What should you check before acting?** | names at least one check (soil test, seed, water turn, drain, talk to the officer) |

Repeat the three questions once by **voice** (`/farmer/voice`, "বিকল্পগুলোর তুলনা") and once by **SMS mode**
(`/farmer/sms`) for the farmers who prefer them.

## What to watch

- Bangla wording a farmer does not use or misreads; Bangla numerals read correctly; dates in Bangla months.
- Touch targets missed (the app aims for 44 px), text too small outdoors, glare.
- Loading time on the slow phone (first page, the plan, Field Future); what happens offline (airplane mode after load).
- Screen reader (TalkBack in Bangla) on the plan page: are the score rings, the "why" bar and the checklist read out?
- Whether "a close call" and "estimate, not a soil test" are understood, and whether anyone takes a ranking as a promise.

## Officers (20 minutes)

Open a farmer's sent comparison in the officer view and answer it only in a verified working test environment; then
review the crop rules at `/science#rules` (record anything they would change in `docs/REVIEW_LOG.md`). If officer
sharing is unavailable, record that product blocker separately from the officer's usability result.

## Results

| Date | Place | Who (role, no names) | Phone | Q1 recommended | Q2 why | Q3 check | Problems seen | Fixed in |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-04 | Dhamrai | 5 farmers, 1 agriculture officer (team-reported) | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded (team recalls requests for Ropon Radar, more NASA-data views, and access for farmers without smartphones or steady internet) | — |

The next session goes in a new row from the `/testkit` export: a real date, place, roles, the answers in the
participants' own words, the problems seen and the commit that fixed each one. Never fill a row from memory.

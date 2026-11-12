# Testing with farmers and officers

A protocol and record for testing the main flow with Bangladeshi farmers and agriculture officers.

**12 November 2026, Dhamrai (team-reported, answers written down).** Three farmers (one on Aman–mustard–Boro land,
one in Sombhag, one in Suapur) and a Sub-Assistant Agriculture Officer of the Kulla block used the app; the farmers'
answers to the three questions are below in their own words (translated from Bangla), with the problems they raised.
The same day the Upazila Agriculture Officer reviewed the crop rules one by one (`docs/REVIEW_LOG.md`). The test
kit's timings were not used, so how long each task took is not known.

**4 November 2026, Dhamrai (team-reported).** Five farmers used the website and the app and gave highly positive
reviews. The Dhamrai agriculture officer, Omar Faruk, went through the app, said everything is okay and rated it 100
out of 100 (`docs/REVIEW_LOG.md`). Three people played the 3D farm game and gave it 5 stars; two children played the
children's game and gave it 5 stars. The team also recalls requests for Ropon Radar, more NASA-data views, and
access for farmers without smartphones or steady internet. The tasks, each person's answers and any problems seen
were not written down, so the session cannot show which tasks people completed; the next one is recorded with
`/testkit` below.

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
| 2026-11-04 | Dhamrai | 5 farmers (website and app), 1 agriculture officer; also 3 game players and 2 children (games) (team-reported) | Not recorded | Not recorded | Not recorded | Not recorded | None recorded. Ratings as reported: officer 100/100; farmers highly positive; 3D game 5 stars (3 players); children's game 5 stars (2 children) | — |
| 2026-11-12 | Dhamrai: Sombhag union | Farmer, 60 decimals, medium highland; Aman → mustard → Boro | Not recorded | "Plough with a power tiller right after the Aman harvest and sow BARI Sarisha-14 or 17 by 25 November, then transplant Boro on time." | "If mustard goes in after 25 November, Boro goes in late too, meets the April–May heat and yields less." | Liked the logic | A power tiller is hard to get in mid-November, when everyone hires one at once | The constraint rules: no tiller now flags mustard first (officer review, same day) |
| 2026-11-12 | Dhamrai: Suapur union | Farmer, 85 decimals, highland/medium highland; set labour short | Not recorded | "If labour is scarce, avoid tomato and jute; go for low-labour crops, or keep Aman–mustard–Boro." | "Jute needs many hands to weed, ret and strip; tomato needs staking and repeated picking. Labourers are hard to find and wages are high." | Agreed; already short of labour at the jute harvest | Asked whether the app could suggest machines that lighten the work instead of dropping jute altogether | Open |
| 2026-11-12 | Dhamrai: farmer 1 | Farmer; Aman–mustard–Boro land | Not recorded | Not in the part of the note received | "There is a risk of empty grains in late Boro, and as the heat rises in late April, the diesel cost for irrigation rises a lot." | Agreed that maize or an early Boro after mustard avoids the heat; early seed or seedlings can be hard to get | Seed and seedling timing | Open |
| 2026-11-12 | Dhamrai: Kulla block | Sub-Assistant Agriculture Officer | Not recorded | Usability review | "We always tell farmers in the block to sow mustard right after the Aman. This app will make our job much faster." | — | Older farmers cannot read the text quickly; asked for voice guidance and colour icons for each threat (sun for heat, cloud for blight); weak network in low-lying parts of the unions, so an offline or downloadable summary | Open: voice guidance and threat icons. The app already works offline once loaded, and the rotation poster can be printed |

The next session goes in a new row from the `/testkit` export: a real date, place, roles, the answers in the
participants' own words, the problems seen and the commit that fixed each one. Never fill a row from memory.

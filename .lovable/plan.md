# Vision Screening App — 3 Day Build Plan

An anonymous-first vision screening web app: land on a home page, take the test without signing up, then log in at the end to save results. A separate AI eye-disease detection tool and a downloadable report round it out.

## Core flow

```text
Home (instructions + 2 entry points)
   |
   |-- Start Vision Test ----> Round 1..5 (adaptive) --> Results --> "Log in to save"
   |                                                        |            |
   |                                                        |            v
   |                                                    Report PDF   Dashboard (history)
   |
   `-- Eye Disease Detection --> Upload eye photo --> AI analysis --> Risk output --> save on login
```

Key rule: the whole test runs in browser state with no account. On finishing, results sit in local storage; the moment the user logs in (even after the test), they are flushed to the database and attached to their account. Nothing is lost.

## The test rounds

You weren't sure of the round list, so here's a proposed set — five short rounds, roughly 4 minutes total. Say the word if you want any swapped.

1. **Calibration** — user sizes an on-screen credit card / holds a set distance so letter sizes are meaningful. **Optional stretch (your camera idea):** before the test, request webcam access and use in-browser face detection (MediaPipe) to estimate interpupillary distance and keep the user near the target viewing distance — a subtle "move closer / farther" hint. If permission is denied or detection fails, it silently falls back to manual calibration. Scheduled only if Days 1-2 land on time; never blocks the test.
2. **Visual acuity** — shrinking Snellen-style letters, one eye at a time.
3. **Color vision** — Ishihara-style plates (rendered, not photos).
4. **Astigmatism** — radial fan dial; user reports darker lines.
5. **Contrast sensitivity** — fading letters/gratings on low contrast steps.

Each round: instruction card -> the test -> auto-advance. A progress bar shows round x of 5.

## The six features, kept simple

- **Adaptive test difficulty** — a staircase rule per round: correct answer makes the next item harder, wrong makes it easier, stop after 2 reversals. This is what produces the acuity score, not extra UI.
- **Anomaly detection** — flags inconsistencies (left/right eye gap, impossibly fast answers, contradictory answers). Shown as a single "confidence in this result" line, plus a retake prompt if confidence is low.
- **Eye Health Risk Score** — 0-100 composite from all round scores plus a short lifestyle questionnaire (screen hours, age, family history). One dial on the results page with a green/amber/red band.
- **Interactive lens** — a slider on the results page that blurs a sample photo/text to show what the user's estimated vision looks like, and what corrected vision would look like. Pure CSS blur driven by the acuity score.
- **Eye disease detection** — separate card on the home page, its own route. User uploads an eye photo, AI vision model returns likely conditions with confidence and a "see a doctor" disposition. Independent of the test.
- **Prescription generation** — estimated SPH/CYL-style values derived from acuity + astigmatism results, plus an AI-written advisory summary, together in one downloadable report. Prominent non-medical disclaimer.

## Avoiding clumsiness

- One screen at a time. Test screens are full-bleed with nothing but the stimulus and answer buttons.
- Home page has exactly two calls to action: Start Vision Test, Check Eye Photo. Everything else (how it works, disclaimer) is below the fold.
- Results are one scrollable page: score dial -> per-round breakdown -> lens simulator -> prescription estimate -> save/download.
- Keyboard-answerable rounds; large tap targets for mobile.

## 3-day schedule (two people)

**Day 1**
- Person A: design system, home page, results page shell, layout of all routes.
- Person B: Lovable Cloud enabled, database schema, auth page, anonymous-result-to-account flush logic.
- End of day: you can walk the whole app with fake results.

**Day 2**
- Person A: the five test rounds with adaptive staircase, progress, calibration.
- Person B: eye disease detection upload + AI call, risk score computation, anomaly rules.

**Day 3**
- Together: prescription generation + report download, lens simulator, polish, mobile pass, disclaimers, demo run-through.
- Buffer: if you fall behind, eye disease detection is the first thing dropped (per your answer) — the home page card becomes "coming soon" and everything else still demos cleanly.

## Technical notes

- TanStack Start routes: `/`, `/test`, `/results`, `/detect`, `/auth`, `/_authenticated/dashboard`.
- Lovable Cloud (Postgres + auth + storage) for backend. Tables: `test_sessions` (scores per round, adaptive trace, anomaly flags, risk score), `detections` (image path, AI verdict, confidence), `profiles`. RLS scoped to `auth.uid()`, with grants for `authenticated`.
- Anonymous results stored in local storage under a session id; on auth state change a server function inserts them and clears local storage. Works whether the user logs in immediately or later.
- Eye photos go to a private storage bucket; the AI call runs in a server function with the image passed as base64, so the key never reaches the browser.
- AI usage: vision model for disease detection, text model for the advisory paragraph. Both server-side via Lovable AI.
- Report is generated client-side from the results object (print-to-PDF styling), so no PDF library risk on day 3.
- Not a medical device: disclaimer on home, results, and detection pages, and in the report.

## Open decisions

- Round list above is my proposal — confirm or swap.
- Optional: skip the lifestyle questionnaire and compute the risk score from test results only, saving ~2 hours.

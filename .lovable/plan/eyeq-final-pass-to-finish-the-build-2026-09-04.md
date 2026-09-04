# EyeQ — final pass to finish the build

All routes (`/`, `/test`, `/results`, `/detect`, `/auth`, `/dashboard`), the vision engine, AI screening, and the backend tables/bucket are in place and the latest build is clean. What's left is one verification-and-polish pass, kept deliberately small.

## Steps

1. Walk the real app in a headless browser: home → all 5 test rounds → results (risk dial, lens slider, prescription, report download) → detect upload screen. Capture screenshots and console errors.
2. Fix whatever that walkthrough surfaces — layout breaks, dead buttons, runtime errors. No new features.
3. Confirm each route has its own unique title/description metadata.
4. Re-check the build log, then tick off `roadmap.md`.

## Out of scope

- Camera-based distance check in calibration (optional stretch, stays unbuilt).
- Any redesign or new screens.

## Notes

Cost is kept low by doing a single browser pass plus targeted fixes rather than re-reading or rewriting existing files.

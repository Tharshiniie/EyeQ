# Roadmap — EyeQ

- [x] Brand/name: EyeQ throughout
- [x] Backend: tables (profiles, test_sessions, detections), storage bucket (eye-photos), Google auth
- [x] Home page `/`: instructions, 2 CTAs (Start Vision Test, Check Eye Photo), disclaimer
- [x] Auth `/auth`: email/password + Google; anonymous result flush on login
- [x] Test `/test`: 5 adaptive rounds (calibration, acuity, color, astigmatism, contrast)
- [x] Results `/results`: risk score dial, round breakdown, interactive lens, prescription estimate, report download, login-to-save
- [x] Disease detection `/detect`: photo upload + AI analysis, save on login
- [x] Dashboard `/_authenticated/dashboard`: history of sessions + detections
- [ ] Optional stretch: camera distance check in calibration (not built)
- [x] Verify build + full browser walkthrough, no console errors

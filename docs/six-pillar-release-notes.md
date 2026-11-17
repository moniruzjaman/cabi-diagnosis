# Six-Pillar Transformation — Deployment & Release Notes

## Deploying the feature branch

Standard Vercel flow (no config changes needed — `vercel.json` untouched):

```bash
# From the feature branch
git push origin feature/six-pillar-crop-health

# Vercel auto-deploys the branch preview (existing project settings).
# After PR review and merge to main, production deploys automatically.
```

Environment variables: **none added, none changed.** The six-pillar feature
is entirely frontend + local storage; it uses the same `/api/diagnose`,
`/api/analytics` endpoints as before. See `.env.example` for the existing set.

Rollback: revert the merge commit — no database migration exists to undo
(cases are local-first by design).

## QA results (executed on this branch)

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors (1 pre-existing warning in `cropDiseases.js:1471`, present on main) |
| `npm run format:check` | ✅ all files pass |
| `npm run build` | ✅ built in 8.6s |
| `npm run test:offline` | ✅ ALL PASS |

Functional verification (headless browser, mobile 390×844 + desktop 1440×900):

1. ✅ All 5 navigation destinations work (Home / Calendar / Diagnose / Learn / Pesticide)
2. ✅ All 6 pillars accessible from the Home grid; badges show live case counts
3. ✅ Case workflow end-to-end: create case (crop/variety/district/severity) → add observation → add treatment → set reminder → evaluate → promote insight to Learn
4. ✅ Severity progression chart renders (50% → 25%, "উন্নতি")
5. ✅ Prevention plan renders documented rice varieties (BR-11/22/34, IR-64), hygiene, seasonal disease calendar
6. ✅ Promoted lesson appears in Learn hub → মাঠ-কেস শিক্ষা with personal-experience label
7. ✅ Home dashboard: active case widget, reminders, recent diagnoses, seasonal risk, learning picks
8. ✅ Light/dark mode toggle works across new views
9. ✅ PWA manifest + service worker serve correctly (`/sw.js`, `/manifest.json`)
10. ✅ AgriChem pesticide tab intact (MoA & Rotation Planner loads)
11. ✅ Online AI diagnosis requires provider keys (not available in this sandbox) — engine, request signing and UI flow unchanged from main; offline engine verified by `test:offline`

## Screenshots

In `docs/screenshots/`:
- `mobile-home.png` — six-pillar dashboard, mobile (390×844)
- `mobile-home-dark.png` — dark mode
- `mobile-prevent.png` — prevention plan for rice
- `mobile-diagnose.png` — diagnose flow
- `desktop-home.png` — desktop layout (1440×900)
- `desktop-diagnose.png` — diagnose flow, desktop

## Known limitations & remaining tasks

1. **Online diagnosis untested live** — sandbox has no AI provider keys; the
   waterfall, signing and prompt are byte-identical to main, and the offline
   engine passes its suite. Verify once on a Vercel branch preview with keys.
2. **Case server sync not implemented** (by design, documented in
   `docs/six-pillar-architecture.md`): cases are device-local. Path: extend
   `api/community.js` + `ensureSchema()` when wanted.
3. **Follow-up reminders are in-app only** — they show on the Home dashboard;
   no push notifications (would need a push service + permissions work).
4. **Case photos** — thumbnails stored only with per-case consent, max 6 per
   case, ~240px JPEG; original photos are never persisted.
5. **Prevention plan language** — derived from Bengali recommendation strings
   in the datasets; crops without documented data show an honest empty state
   with general hygiene guidance.
6. **Bundle size warning** — pre-existing on main (single 2.9 MB chunk); not
   worsened materially by this feature (new code ~40 KB before gzip).

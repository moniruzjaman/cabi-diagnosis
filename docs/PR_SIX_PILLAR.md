# Pull Request: Six-Pillar Crop Health Intelligence Transformation

**Branch:** `feature/six-pillar-crop-health` → `main`

## Summary

Transforms উদ্ভিদ গোয়েন্দা from an image-based diagnosis app into a unified,
mobile-first **Crop Health Intelligence Platform** built on one connected
workflow:

**DETECT → TREAT → PREVENT → MONITOR → EVALUATE → LEARN**

One crop, one connected case, one continuous intelligence cycle: a diagnosis
report becomes a crop-health case; the case collects treatments, follow-up
observations and reminders; its evaluation promotes a verified personal
lesson into the Learn hub — closing the loop.

Nothing was rebuilt: the diagnosis waterfall, offline ONNX engine, AgriChem
pesticide database, PWA, API security and the 5-tab navigation are all
preserved (see `docs/implementation-audit.md`).

## What changed

### Phase 1 — Audit (`docs/implementation-audit.md`)
Full repository audit: functionality to preserve, components to enhance vs
create, DB decision (local-first, no migration), risks (App.jsx size, Hobby
function cap, privacy commitments), baseline QA.

### Phase 2 — Brand & UI foundation
- **SixPillarHomeDashboard** (App.jsx): branded welcome header with crop /
  location / season context, prominent **Scan & Diagnose** action,
  six-pillar navigation grid (badged with live case counts), follow-up
  reminders, active cases, seasonal risk alerts, recent diagnoses,
  recommended learning — composing the existing TodayDecisionView and
  MarketPriceTicker rather than duplicating them.
- **SixPillarGrid** + shared `sixPillars.js` config (single source of truth).
- Existing theme tokens and light/dark mode reused throughout.

### Phase 3 — Detect / Treat / Prevent
- DETECT & TREAT engines untouched. The diagnosis report now carries
  **"কেসে সংরক্ষণ করুন"** (Save to Case) and **"প্রতিরোধ দেখুন"** (View
  Prevention) actions, turning a one-off report into a managed case with
  full evidence (source, provider, confidence, alternatives).
- **PreventionPlan** (new view): documented resistant varieties, hygiene &
  sanitation, rotation practices, seasonal disease calendar and weather-risk
  note — every line derived from the existing `cropDiseases.js` /
  `cropCalendar.js` datasets via `resolveCropKey`; nothing invented.

### Phase 4 — Monitor & Evaluate
- **`src/data/cropHealthCases.js`** — local-first case store mirroring the
  logical entity model (crop_health_cases, case_observations,
  diagnosis_evidence, treatment_records, prevention_actions,
  monitoring_records, evaluation_results, learning_insights) with stable IDs,
  timestamps, source/confidence/verification fields.
- **CaseManager** — create/update cases (crop, variety, district, growth
  stage, GPS with permission), severity progression chart, unified timeline,
  follow-up observations with optional photos, treatment records (type,
  product, MoA group, cost), monitoring reminders, status lifecycle.
- **Evaluation** — before/after severity comparison, outcome, cost, lessons,
  user-verification flag, and an explicit causality disclaimer (image
  comparison alone never claimed as treatment-effectiveness proof).
- **Privacy**: photos only persisted as small on-device thumbnails with
  explicit per-case consent (default off); never uploaded — honouring the
  app's existing privacy policy.

### Phase 5 — Learn
- New **"মাঠ-কেস শিক্ষা"** sub-view in UnifiedLearnResourceHub shows the
  farmer's own promoted case lessons — always labelled personal field
  experience, never CABI guidance; unverified feedback is never
  auto-promoted into authoritative knowledge.

### Phases 6–7 — QA & deployment readiness
All gates executed and passing (details in `docs/six-pillar-release-notes.md`):

| Gate | Result |
|---|---|
| `npm run lint` | ✅ 0 errors (1 pre-existing warning, also on main) |
| `npm run format:check` | ✅ pass |
| `npm run build` | ✅ 8.6s |
| `npm run test:offline` | ✅ ALL PASS |
| Browser functional pass | ✅ full case lifecycle, all pillars, dark mode, PWA, pesticide tab |

Screenshots: `docs/screenshots/` (mobile home/dark/prevent/diagnose +
desktop home/diagnose).

## Engineering constraints honoured

- React 18 / Vite 5 / Turso / Vercel / ONNX offline / PWA / API signing — untouched.
- No new dependencies; no new serverless functions (Hobby 12-cap respected).
- 5-tab bottom navigation preserved; pillars live inside Home + workflows.
- `App.jsx` extended incrementally (~370 lines added, all new UI in separate
  component files).
- No secrets exposed; env conventions unchanged; no DB migration required.

## Known limitations

1. Online AI diagnosis not exercised live in the sandbox (no provider keys) —
   code path identical to main; verify on a Vercel branch preview.
2. Case sync is local-first only; the documented server path extends
   `community.js` + `ensureSchema()` without new functions.
3. Follow-up reminders are in-app (no push notifications yet).
4. Prevention plan shows an honest empty state for crops without documented
   data in the agronomic datasets.

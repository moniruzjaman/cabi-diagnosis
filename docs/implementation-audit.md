# Implementation Audit — Six-Pillar Crop Health Intelligence Transformation

**Repository:** cabi-diagnosis (`main` @ b46e984)
**Branch:** `feature/six-pillar-crop-health`
**Date:** 2026-11-17

---

## 1. What exists today (verified by reading the code)

| Area | Finding |
|---|---|
| **Stack** | React 18.3 + Vite 5.4, single 10,374-line `src/App.jsx`, Lucide icons available via `lucide-react` but current UI mostly uses emoji. |
| **Navigation** | Exactly 5 bottom-nav tabs: Home, Calendar, Diagnose, Learn, Pesticide (`navTabs` in App.jsx:7964). Hidden legacy tabs (`today`, `guide`, `game`, `library`, `history`, `apps`) still render for compatibility. |
| **Theme** | `src/data/themes.js` — `lightThemeFull`/`darkThemeFull` with CSS-variable sync in App.jsx. Palette already matches the requested brand (primary #046A1A, XDark #023E11, leaf #2D9D14, accent gold #F0B90B, danger #E6010A). There are duplicate keys in the objects (harmless — later values win, and the winning values are already the new brand palette). |
| **Detection (Pillar 1)** | Online: `/api/diagnose` → provider waterfall (Gemini → OpenRouter → Groq → text fallbacks), CABI 5-step protocol system prompt, structured JSON output (`structuredResult`), ViT on-device grounding. Offline: `src/offline/` — diagnosticEngine, ViT + PlantVillage ONNX classifiers, leaf ensemble, vision router, visual enrichment (278 CABI reference images). Multi-image upload (max 4), crop auto-detect from image, symptom chips, speech input + TTS. |
| **Treatment (Pillar 2)** | `DiagnosisResultDashboard` renders IPM recommendations, chemical options with FRAC/IRAC groups + PHI, field confirmation. `src/data/moaDatabase.js` (FRAC + IRAC groups with rotation guidance), `src/data/pesticideRegistry.js` → synced Bangladesh registered product DB (`src/agrichem/data/all_pesticides.ts`, ~via sync script), full AgriChem app embedded as the Pesticide tab (`AgriChemApp`) with dosage calculator, safety checklists, rotation planner. |
| **Prevention (Pillar 3)** | Partial: `prevention_bn` in structured result, resistant-variety recommendations inside cropDiseases.js, seasonal risk alerts (`getCurrentRiskAlerts`), crop calendar with sowing/harvest windows, weather disease pressure (`weatherService.forecastDiseasePressure`). No dedicated prevention surface. |
| **Monitoring (Pillar 4)** | **Gap.** No case entity exists. Only `ud-history` (last 10 diagnosis previews in localStorage) and server-side `diagnoses` table (analytics-oriented, no follow-ups). |
| **Evaluation (Pillar 5)** | **Gap.** Nothing. |
| **Learning (Pillar 6)** | Strong: `UnifiedLearnResourceHub.jsx` (3,282 lines — 4 internal pillars: protocol, science/atlas, audio-visual, 5 games), `VisualDiagnosisLibrary.jsx` (278-image offline CABI field guide), `learnResourceData.js`. |
| **Persistence** | Turso (LibSQL) via `api/_lib/turso.js` with `ensureSchema()` auto-migrations. Tables: `analytics_state`, `market_prices`, `feedback_entries`, `presence_log`, `diagnoses`, `outbreak_reports`, `users`. Falls back to local JSON when Turso env vars absent. localStorage: `ud-form`, `ud-history`, `ud-dark`, `ud-onboarded`, `ud-user-email`, `ud-visitor-id`. localforage used only by `offlineLoader.js`. |
| **API surface** | Vercel serverless, **Hobby-plan constrained to 12 functions** — 8 exist (`diagnose`, `crop-prices`, `weather`, `health`, `dashboard`, `auth/google`, `auth/logout`, `auth/me`, `community` = 9 files). `vercel.json` rewrites merge 5 legacy URLs into `community.js` to stay under the limit. HMAC request signing (`requestSigning.js`), rate limiting, validation, CORS allowlist, HTML escaping. |
| **QA gates** | `npm run lint` (1 pre-existing warning in cropDiseases.js), `format:check` ✓, `build` ✓ (8.3 s), `test:offline` ✓. All verified green on the fresh clone before any changes. |

## 2. Functionality to preserve (do not touch)

- The 5-tab navigation and all hidden-tab compatibility mappings.
- `/api/diagnose` waterfall, system prompt, free-tier policy, signing, rate limits.
- Offline ONNX engine + `test:offline` suite.
- AgriChem pesticide app + sync script + registry.
- PWA (`sw.js`, manifest), service-worker caching, install prompts.
- Dark mode + theme-token system, onboarding flow, feedback panel, copilot FAB.
- All existing Turso tables and the `community.js` consolidation pattern.

## 3. Components to enhance

- `src/App.jsx` Home tab → six-pillar dashboard (keep `TodayDecisionView`, market ticker, risk alerts as dashboard widgets).
- `DiagnosisResultDashboard` → add "Save to Case" (Treat/Monitor entry point) and prevention extraction.
- `SavedReportsView` → keep as-is (legacy history); new Case Manager is the primary surface.
- `themes.js` → add pillar tokens (gold `#F0B90B`, highlight `#F8E36F`, canvas `#F4F6F8` already present).

## 4. New components required

1. `src/data/cropHealthCases.js` — local-first case store (localStorage; entities: cases, observations, treatments, evaluations) with stable IDs + timestamps; mirrors the logical entity model (crop_health_cases, case_observations, diagnosis_evidence, treatment_records, prevention_actions, monitoring_records, evaluation_results, learning_insights) as JSON documents so no DB migration is forced.
2. `src/components/cases/CaseManager.jsx` — list + create + detail (Pillar 4 MONITOR).
3. `src/components/cases/CaseDetail.jsx` — case timeline: observations, treatments, evaluations, follow-up photo, severity progression.
4. `src/components/cases/CaseEvaluation.jsx` — before/after comparison (Pillar 5 EVALUATE) with explicit "images alone do not prove causality" framing.
5. `src/components/cases/PreventionPlan.jsx` — Pillar 3 view built from cropDiseases + calendar + weather risk.
6. `src/components/dashboard/SixPillarGrid.jsx` — pillar navigation grid + shared pillar config.
7. API: **no new serverless function** (Hobby limit). Case sync piggybacks the existing `diagnoses` POST (already fires) — cases stay local-first by design (privacy: photos never uploaded; the existing privacy policy explicitly promises photos are not stored server-side).

## 5. Existing APIs to reuse

- `signedFetch("/api/diagnose")` — unchanged.
- `postJson("/api/analytics" | "/api/presence")` — pillar visit tracking.
- `getDiagnoses` filters via `/api/diagnoses` GET — recent-history widget.
- `getCurrentRiskAlerts`, `CROP_CALENDAR`, weather service — prevention/risk widgets.

## 6. Database changes

Cases remain **local-first** — the device copy is always the source of truth and works fully offline. Metadata-only sync to the server is now **implemented** (was "none required / documented decision"): the offline sync queue (`src/intelligence/syncQueue.js`) flushes records to a `cases` resource inside the existing `community.js` function (no new serverless function — Hobby cap respected), which writes an idempotent (`client_record_id` primary key) row into a new `crop_health_cases` table created by `ensureSchema()`. Photos, thumbnails and precise GPS coordinates are never synced — enforced client-side (`syncQueue.sanitizePayload`) and server-side (`validateCaseSyncRecord` whitelist). Covered by `src/intelligence/__tests__/caseSyncApi.test.mjs` (real handler + real SQLite via libsql `file:` URL).

## 7. Technical risks & dependencies

- **App.jsx size (10.4k lines)** — all new UI goes into separate component files; App.jsx gets a thin integration layer only.
- **Hobby plan function cap** — no new API functions; anything server-side must extend `community.js`.
- **Privacy commitment** — photos stay in-memory/localStorage-free (never persisted); case records store metadata + thumbnails only if the user opts in (default off).
- **Bengali content** — all new UI strings written bilingually (bn primary, en secondary) consistent with the app.
- **Prettier/ESLint gates** — strict; will run after each phase.

## 8. Baseline QA (executed on fresh clone, before changes)

```
npm run lint          → 0 errors, 1 pre-existing warning (cropDiseases.js:1471)
npm run format:check  → All files pass
npm run build         → ✓ built in 8.34s
npm run test:offline  → ALL PASS
```

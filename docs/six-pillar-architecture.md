# Six-Pillar Crop Health Intelligence — Architecture

**Branch:** `feature/six-pillar-crop-health`

## The connected workflow

```
DETECT → TREAT → PREVENT → MONITOR → EVALUATE → LEARN
  │         │        │         │          │         │
  └── existing diagnose flow (AI + offline ONNX), unchanged
            │        │         │          │         │
            └── IPM/chemical panels + "Save to Case"
                     │         │          │         │
                     └── PreventionPlan (Pillar 3 view)
                               │          │         │
                               └── CaseManager (Pillar 4)
                                          │         │
                                          └── evaluation + verified insights
                                                    │
                                                    └── Field-case insights
                                                        in UnifiedLearnResourceHub
```

One crop, one connected case, one continuous intelligence cycle. A diagnosis
report becomes a case; the case collects treatments, follow-up observations
and reminders; its evaluation promotes a *verified personal lesson* into the
Learn hub — closing the loop.

## Component map

| File | Pillar | Purpose |
|---|---|---|
| `src/components/dashboard/sixPillars.js` | all | Shared pillar config (labels, colors, routing targets) |
| `src/components/dashboard/SixPillarGrid.jsx` | all | Responsive 6-card navigation grid with case badges |
| `SixPillarHomeDashboard` (in App.jsx) | all | Redesigned Home: welcome context, Scan & Diagnose, pillar grid, reminders, active cases, risk alerts, recent diagnoses, learning picks |
| Existing diagnose flow + `DiagnosisResultDashboard` | DETECT / TREAT | Unchanged engines; report gains "কেসে সংরক্ষণ" + "প্রতিরোধ দেখুন" actions |
| `src/components/cases/PreventionPlan.jsx` | PREVENT | Documented resistant varieties, hygiene, rotation, seasonal disease calendar (derived from cropDiseases.js + cropCalendar.js via `resolveCropKey`) |
| `src/components/cases/CaseManager.jsx` | MONITOR / EVALUATE | Case list, creation form (crop/variety/district/GPS), timeline, severity progression chart, follow-up observations, treatment records, reminders, evaluation |
| `FieldCaseInsights` (in UnifiedLearnResourceHub.jsx) | LEARN | Farmer's own promoted case lessons, labelled personal field experience |
| `src/data/cropHealthCases.js` | backbone | Local-first case store |

## Data model (local-first, JSON documents)

`src/data/cropHealthCases.js` mirrors the logical entity model as JSON
documents in `localStorage` (`udh-crop-cases-v1`):

| Logical entity | Stored as |
|---|---|
| `crop_health_cases` | case object (id, status, crop, variety, district, GPS, timestamps) |
| `case_observations` | `case.observations[]` (severity, notes, optional thumbnail) |
| `diagnosis_evidence` | `case.diagnosisEvidence` (disease, confidence, provider, source, alternatives) |
| `treatment_records` | `case.treatments[]` (type, product, MoA group, dosage, cost) |
| `prevention_actions` | `case.preventionActions[]` |
| `monitoring_records` | `case.monitoring[]` (reminders with dueAt/status) |
| `evaluation_results` | `case.evaluation` (outcome, severity delta, cost, lessons, verified flag) |
| `learning_insights` | separate registry (`udh-learning-insights-v1`, max 50) |

### Why local-first (no DB migration)

1. **Privacy commitment** — the app's public privacy policy promises crop
   photos are never stored server-side. Cases honour this: photos are only
   kept as small on-device thumbnails with **explicit per-case consent**
   (default off), and never uploaded.
2. **Offline-first product** — cases must be recordable in the field with no
   connectivity; localStorage works everywhere the PWA works.
3. **No forced migration** — the Turso schema is untouched; existing tables
   and the `community.js` consolidation pattern are preserved.

### Future server sync path (documented, not implemented)

If sync is later wanted: extend `api/community.js` with a `cases` resource
(rewrite `/api/cases` → `/api/community?resource=cases` — **no new serverless
function**, Vercel Hobby caps deployments at 12) and add a
`crop_health_cases` table in `ensureSchema()` following the existing
auto-migration pattern. Respect: photo consent flags (never sync photos
without consent), `source`/`confidence`/`verification` fields, and the rule
that unverified user feedback is never auto-promoted into authoritative
agricultural knowledge.

## Safeguards built in

- **No fabricated pesticide data** — treatment records instruct users to copy
  registered product info from the AgriChem tab; PreventionPlan only shows
  lines that exist in the agronomic datasets.
- **Causality honesty** — evaluation UI states that image/severity comparison
  alone does not prove treatment effectiveness (weather, growth stage and new
  infections are confounders).
- **Insight labelling** — promoted lessons are always shown as
  "ব্যক্তিগত মাঠ-অভিজ্ঞতা" (personal field experience), never as CABI guidance.
- **Verification status** — diagnosis evidence records source (ai/offline/manual),
  provider and confidence; evaluations carry a user-verified flag.

## Navigation (unchanged 5 tabs)

The six pillars live **inside** the Home dashboard and workflows — no new
bottom-nav tabs. `handlePillarNavigation` routes: DETECT/TREAT → diagnose
(TREAT opens the live report when one exists), PREVENT → prevention view,
MONITOR/EVALUATE → case manager, LEARN → learning hub.

## Backend data boundary

Supabase is the authoritative store for authenticated user identity/profile rows
in `public.app_users`. The server uses only `SUPABASE_SERVICE_ROLE_KEY` for these
writes; browser clients never receive that key. Turso remains the application-data
store for diagnoses, analytics, market prices, outbreak reports, feedback,
presence and shared crop-health intelligence. Authentication keeps the stable
Google subject in the signed session so a temporary Supabase outage can fail over
to Turso without losing the user's identity, then resolve back to Supabase after
recovery. Crop photos remain transient inference inputs and are not persisted in
either database.

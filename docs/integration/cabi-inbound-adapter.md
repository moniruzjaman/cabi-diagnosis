# CABI Inbound Context Adapter — Phase 1 implementation notes

**Status:** Implemented as a validated pure module; UI auto-wiring intentionally deferred until the draft contract is approved by the owner.

> **Limitation (Phase 1 review, documented explicitly):** the inbound context
> PARSER ships and is fully tested, but it is **NOT wired into any UI or app
> startup path** in Phase 1. No code reads query parameters on launch, so an
> inbound deep link currently has **no automatic effect** on the diagnose form.
> This separation is deliberate — the contract is a draft (`1.0.0`) and the
> owner has not approved the wiring semantics. Enforcement: a CI regression
> guard (`inboundContext.test.mjs` §9) fails if `src/main.jsx`, `src/App.jsx`
> or `index.html` ever reference the adapter before approval. Intended wiring
> after approval is specified in §3 below.

**Contract:** Diagnostic Context Contract v1 (`1.0.0`, draft — owner review required)
**Snapshots pinned:** `docs/integration/crop-registry-v1.json` (1.1.0-draft), `docs/integration/symptom-registry-v1.json` (1.0.0-draft)
**Module:** `src/integration/inboundContext.js` (+ `src/integration/contractSnapshot.js`)
**Tests:** `src/intelligence/__tests__/inboundContext.test.mjs`

## 1. What Phase 1 delivers

- A pure, allowlisted parser/validator `parseInboundContext(input, opts)` for inbound cross-app contexts. Input may be a query string, `URLSearchParams`, or a plain object.
- Pinned local snapshots of the contract IDs (no runtime fetch of mutable JSON; integration spec §6). A CI test (`inboundContext.test.mjs`) reads the draft JSON files directly and fails if the JS snapshot drifts.
- Explicit privacy enforcement: parameters that look like photos, GPS, names, phones, tokens or notes are rejected **without being read**, and reported in `rejectedPrivacyParams`.
- Fail-closed identity handling: unknown crop IDs produce `unknown cropId … — not mapped to any other crop`; the ambiguous bare token `pepper` is rejected with the four distinct pepper identities listed.

## 2. Documented entry parameters (the only ones read)

| Parameter | Validation | Result field |
|---|---|---|
| `v` | must be `1.0.0` if present | `context.schemaVersion` |
| `source` | one of the three app IDs, ≠ `cabi-diagnosis` | `context.sourceApp` |
| `cropId` | canonical ID or known alias → canonical (crop-registry snapshot); ambiguous/unknown rejected | `context.cropId` (+ `cropSeason` for rice seasons) |
| `plantPartId` | `^[a-z][a-z0-9_]{1,63}$` | `context.plantPartId` |
| `symptomIds` | comma list, ≤20, each in symptom-registry snapshot; unknown → warning (error in `strict`) | `context.symptomIds` |
| `causeGroupIds` | comma list, ≤20, each of `pest/fungal/bacterial/viral/nutrition/water` | `context.causeGroupIds` |
| `guideId` + `guidePage` (+ `chapterId`) | both required together; page 1..10000; treated as an opaque Field Guide reference (never resolved locally) | `context.guideReference` |
| `trainingTopicId` | `^[a-z][a-z0-9_-]{1,63}$` | `context.trainingTopicId` |
| `returnTo` | app ID enum only. Any URL/path-shaped value (`/`, `:`, `.`, `%2f`, `http`) is rejected | `returnTo` |

Anything not listed above lands in `ignoredParams` and is never interpreted.

## 3. Actual route entry points (documentation duty, integration spec §5)

CABI is a tab-driven Vite SPA (no router library). The app entry point is `index.html` → `src/main.jsx` → `src/App.jsx`; the diagnose workflow lives in the tab state of `App.jsx`.

- **Current wiring in Phase 1: none.** No startup code reads query parameters yet, so existing direct entries, tab behaviour and browser-back semantics are untouched.
- **Intended wiring (contract approved):** on app start, call `parseInboundContext(window.location.search, { strict: false })`. On `ok`, pre-select `context.cropId` (via `resolveCanonicalCrop` → the existing crop selector display string) in the diagnose tab and show a Bangla notice that the context came from `<sourceApp>`. On `!ok`, show the Bangla `errors` summary and continue with a clean form. `returnTo` is only ever rendered as a labelled link back to the companion app's documented home URL (static, per-app constant) — never constructed from input.
- Route shapes stay unfrozen until Phase 4 per the integration spec.

## 4. Non-goals honoured

- No shared database, no cross-app writes, no case creation/marking from companions.
- No arbitrary return URLs.
- No photos / GPS / identity / tokens / free-text through the contract.
- No runtime dependency on `main`-branch JSON.

## 5. Unresolved decisions flagged for the owner

1. `tomato` is model-coverage-validated but absent from `crop-registry-v1.json`; the adapter accepts it (`contractSnapshot.CROP_IDS`). Registry entry pending owner review.
2. 177 further selector crops carry phase-1 local derived IDs (`canonicalCrops.DERIVED_CROPS`); they are NOT accepted as inbound `cropId` values until the registry publishes them (the inbound allowlist is the registry-backed 24 + tomato).
3. Contract is `1.0.0` draft: the adapter enforces the draft semantics but the UI wiring stays off until approval.

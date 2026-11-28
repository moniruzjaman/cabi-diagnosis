# Phase 1 — Acceptance Review Follow-ups (F1–F4)

**Review:** [#86 acceptance review — A1–A6](https://github.com/moniruzjaman/cabi-diagnosis/pull/86#pullrequestreview-6096377127)
**Verdict addressed:** conditional pass → all required follow-ups implemented (additive).
**Base head at time of work:** `4632b07`.

This document records how each required follow-up was resolved and the
evidence. All changes are additive and backward-compatible; no existing step,
control, validation rule, result field, or entry point was removed.

---

## F1 — Persist canonical crop id in saved cases (+ round-trip test)

**Problem:** `saveCase` persisted only the Bengali display string; the saved
case carried no canonical identity, breaking the A2 identity chain.

**Fix (additive):**
- `src/data/cropHealthCases.js` — `createCase` now persists
  `diagnosisEvidence.canonicalCropId` (+ optional `cropSeason` / `cropVariant`),
  defaulting to `null` for legacy payloads. Also persists
  `diagnosisEvidence.topDisease` (previously dropped here even though the wizard
  set it — this restores the field-copilot chain for saved cases).
- `src/components/diagnose/StructuredIntakeWizard.jsx` — `saveCase` resolves the
  selected crop once via `resolveCanonicalCrop(cropBn)` and stores the stable id
  (+ season/variant). Resolution failure never blocks the save.

**Test:** `src/intelligence/__tests__/wizardCaseRoundTrip.test.mjs` (22 asserts) —
creates a wizard-shaped case (incl. `diagnosisEvidence.topDisease`), reopens it
via `getCaseById` and `loadCases`, and asserts every field + the canonical id
survive; also proves a legacy payload without `canonicalCropId` still round-trips
(field defaults to `null`). Covers **A6 item 3**.

---

## F2 — Disclose the bell-pepper → মরিচ symptom-path alias

**Problem:** the non-vision symptom path used the legacy `resolveCropKey`, which
substring-matches pepper-family display strings to the chilli section (মরিচ)
with no disclosure — a silent cross-crop map for a selectable crop.

**Fix (additive):** `src/offline/diagnosticEngine.js` now computes
`cropIdentityDisclosure` — a one-line Bangla notice shown only when the selected
crop's canonical identity differs from the resolved disease section's identity
(e.g. `capsicum_bell` → মরিচ). Identity-true crops (chilli, rice, potato, …)
get `null` (no false positives). `src/App.jsx` renders the notice at the top of
the offline Bangla result. Blocking the diagnosis is not required.

> বেল পেপারের জন্য আলাদা রোগ তালিকা এখনো নেই — কাছাকাছি ফসল মরিচের তালিকা রেফারেন্স হিসেবে দেখানো হচ্ছে।

**Test:** `src/intelligence/__tests__/cropIdentityDisclosure.test.mjs` — bell-pepper
variants disclose; identity-true crops do not; additive (core fields intact).

---

## F3 — Ambiguous-route Bangla copy names the entered token

**Problem:** `visionRouter.resolveVisionRoute` ambiguous `reasonBn` hardcoded
`'"মরিচ" শব্দটি…'`, but bare `মরিচ` resolves to `chili` (source-backed); only
bare English `pepper` is ambiguous.

**Fix:** `src/offline/visionRouter.js` — the ambiguous `reasonBn` now quotes the
entered name generically (`"${cropHint}" নামটি একাধিক ভিন্ন ফসল…`).

**Test:** covered in `cropIdentityDisclosure.test.mjs` (copy quotes `pepper`, no
longer hardcodes মরিচ; bare মরিচ is not ambiguous).

---

## F4 — Missing A6 regression tests + manual mobile/Bangla QA

**Tests added:**
- `wizardNavigation.test.mjs` (40 asserts) — **A6 items 1, 2, 4**: back/forward
  navigation preserves selections and clears errors; inline `STEP_ERROR_BN`
  validation blocks advance on missing required inputs; a no-photo (symptom-only)
  diagnosis produces a complete result shape (top + alternatives + merged +
  candidate status + evidence).
- `wizardCaseRoundTrip.test.mjs` — **A6 item 3** (see F1).
- `cropIdentityDisclosure.test.mjs` — F2/F3.

To make the wizard logic testable without a React renderer, the pure step
model / navigation / scoring was extracted to
`src/components/diagnose/wizardLogic.js`; `StructuredIntakeWizard.jsx` imports
it (behaviour unchanged).

**A6 item 5 (mobile viewport + Bangla rendering) — manual QA record.**
The repo has no e2e/visual infra (acknowledged in the review). Record the
result of running the Vercel preview on a mobile viewport against this checklist:

| # | Check (mobile viewport, Bangla) | Result |
|---|----------------------------------|--------|
| 1 | Step 1–5 Bangla labels render (no tofu/mojibake) | ☐ |
| 2 | Selectable pills ≥ 44px touch target | ☐ |
| 3 | Sticky Back / Continue reachable with thumb | ☐ |
| 4 | Inline validation message shows on empty required step | ☐ |
| 5 | Step 5 renders candidate note, uncertainty, সমর্থনকারী প্রমাণ, বিরোধী লক্ষণ, পরবর্তী যাচাই ধাপ | ☐ |
| 6 | Unsupported crop → "Vision Not Available" card (no fabricated result) | ☐ |
| 7 | F2 disclosure line visible for bell pepper on the detailed form | ☐ |

> Preview (redeploy this branch first): `cabi-diagnosis-…vercel.app` /
> `cabi-diagnosis-v11-…vercel.app`. Record the deployment URL + date + tester.

**A6 item 6 (offline/PWA service-worker regression):** pre-existing gap; no
service-worker change in this PR. Noted explicitly rather than claimed.

---

## Validation

- `node scripts/run-tests.mjs` → **2470 passed, 0 failed across 31 suites**
  (incl. the 3 new suites; the offline ONNX ensemble + vision routing run with
  real inference).
- `npm run build` → success.
- `eslint` + `prettier --check` on all changed files → clean.
// Save → reopen round-trip test for the structured intake wizard case payload.
// Acceptance review F1 / A6 item 3:
//   - A case created with the exact wizard payload (incl. the merger-era
//     diagnosisEvidence.topDisease) round-trips through save → reopen with no
//     field loss.
//   - The canonical identity chain reaches the saved case: a wizard-shaped
//     save persists diagnosisEvidence.canonicalCropId (+ optional season /
//     variant) and it survives the round-trip.
//   - Additive/backward-compatible: a legacy payload WITHOUT canonicalCropId
//     still saves and reopens (field defaults to null, nothing else changes).
// Uses a Map-based localStorage mock; no React, no network.
const STORE = new Map();
globalThis.localStorage = {
  getItem: (k) => STORE.get(k) ?? null,
  setItem: (k, v) => void STORE.set(k, String(v)),
  removeItem: (k) => void STORE.delete(k),
};

const { createCase, getCaseById, loadCases } = await import("../../data/cropHealthCases.js");
const { resolveCanonicalCrop } = await import("../../data/canonicalCrops.js");

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FAIL:", msg);
  }
}

// The exact shape StructuredIntakeWizard.saveCase() builds for a rice case.
// (cropBn is the Bengali display label; canonicalCropId is resolved once at
// save time via resolveCanonicalCrop.)
const riceBn = "ধান";
const riceCanonical = resolveCanonicalCrop(riceBn);
const wizardEvidence = {
  diseaseName: "Rice Blast",
  diseaseNameBn: "ধানের ব্লাস্ট",
  cause: "fungal",
  confidence: "high",
  confidencePct: 0.82,
  provider: "symptom-wizard",
  source: "manual",
  alternatives: [{ diseaseName: "Brown Spot", diseaseNameBn: "ব্রাউন স্পট" }],
  keySymptoms: ["পাতা", "গাছ"],
  topDisease: "rice_blast",
  canonicalCropId: riceCanonical.ok ? riceCanonical.cropId : null,
  cropSeason: riceCanonical.ok ? riceCanonical.season || null : null,
  cropVariant: riceCanonical.ok ? riceCanonical.variant || null : null,
};

const { case: created } = createCase({
  crop: riceBn,
  diagnosisEvidence: wizardEvidence,
});
assert(!!created?.id, "wizard-shaped case is created with an id");

// ── Reopen the case exactly as the cases UI does (getCaseById). ────────────
const reopened = getCaseById(created.id);
assert(!!reopened, "saved case can be reopened by id");
assert(reopened.id === created.id, "reopened id matches");
assert(reopened.crop === riceBn, "crop display string survives the round-trip");

const ev = reopened.diagnosisEvidence;
assert(!!ev, "diagnosisEvidence survives the round-trip");
assert(ev.topDisease === "rice_blast", "merger-era topDisease survives the round-trip");
assert(ev.diseaseNameBn === "ধানের ব্লাস্ট", "diseaseNameBn survives");
assert(ev.provider === "symptom-wizard" && ev.source === "manual", "provider + source survive");
assert(ev.confidencePct === 0.82, "confidencePct survives");
assert(Array.isArray(ev.alternatives) && ev.alternatives.length === 1, "alternatives survive");
assert(ev.alternatives[0].diseaseName === "Brown Spot", "alternative disease name survives");
assert(Array.isArray(ev.keySymptoms) && ev.keySymptoms.join(",") === "পাতা,গাছ", "keySymptoms survive");

// ── F1: the canonical identity chain reaches the saved case. ───────────────
assert(riceCanonical.ok, "rice display resolves to a canonical id (precondition)");
assert(
  ev.canonicalCropId === riceCanonical.cropId,
  `canonicalCropId persisted + survives round-trip (${ev.canonicalCropId})`,
);
assert("cropSeason" in ev && "cropVariant" in ev, "season/variant fields present (additive)");
assert(ev.recordedAt && !Number.isNaN(Date.parse(ev.recordedAt)), "recordedAt is a valid timestamp");

// The persisted canonical id is itself re-resolvable (stable identity).
assert(
  resolveCanonicalCrop(ev.canonicalCropId).ok && resolveCanonicalCrop(ev.canonicalCropId).cropId === ev.canonicalCropId,
  "persisted canonicalCropId re-resolves to itself",
);

// ── loadCases() (the list view path) also carries the identity. ────────────
const list = loadCases();
const fromList = list.find((c) => c.id === created.id);
assert(!!fromList, "case appears in loadCases() list");
assert(
  fromList.diagnosisEvidence?.canonicalCropId === riceCanonical.cropId,
  "canonicalCropId present via loadCases() list path too",
);

// ── Backward compatibility: a legacy payload without canonicalCropId. ──────
const { case: legacy } = createCase({
  crop: "আলু",
  diagnosisEvidence: {
    diseaseName: "Late Blight",
    diseaseNameBn: "আলুর লেট ব্লাইট",
    source: "offline",
  },
});
const legacyReopened = getCaseById(legacy.id);
assert(!!legacyReopened, "legacy (no canonicalCropId) case still saves + reopens");
assert(
  legacyReopened.diagnosisEvidence.canonicalCropId === null,
  "legacy case canonicalCropId defaults to null (additive, non-breaking)",
);
assert(legacyReopened.diagnosisEvidence.diseaseName === "Late Blight", "legacy case existing fields untouched");

console.log(`\nwizardCaseRoundTrip.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

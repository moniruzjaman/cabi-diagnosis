// Pinned contract/registry snapshots for the CABI inbound adapter
// (Phase 1, Workstream D).
//
// These constants are a LOCAL PINNED SNAPSHOT of the draft Phase 0 registries:
//   - docs/integration/diagnostic-contract-v1.schema.json  (schemaVersion 1.0.0)
//   - docs/integration/crop-registry-v1.json               (1.1.0-draft)
//   - docs/integration/symptom-registry-v1.json            (1.0.0-draft)
//
// They are intentionally duplicated as JS constants (no runtime fetch of
// mutable JSON — integration spec §6) and kept in sync by
// src/intelligence/__tests__/inboundContext.test.mjs, which reads the JSON
// files directly and fails CI on drift.
//
// PRIVACY (integration spec §7): only stable machine IDs and app/version
// identifiers may cross the contract. Photos, GPS, farmer identity, phone
// numbers, tokens and free-text notes are never accepted by the adapter.

export const CONTRACT_SNAPSHOT = {
  contract: "krishiai-diagnostic-context-contract",
  schemaVersion: "1.0.0",
  status: "draft-owner-review-required",
  schemaPath: "docs/integration/diagnostic-contract-v1.schema.json",
};

// Known app IDs (diagnostic-contract-v1.schema.json enums). CABI is the
// inbound destination; it never accepts writes from companions.
export const APP_IDS = ["cabi-diagnosis", "diagnostic-field-guide", "diagnosis-assistant"];
export const DESTINATION_APP = "cabi-diagnosis";

// Crop IDs: the 25 canonical identities of src/data/canonicalCrops.js
// (24 registry-backed from crop-registry-v1.json + tomato, which is
// model-coverage-validated but registry-pending — flagged to the owner).
export const CROP_IDS = [
  "rice",
  "wheat",
  "maize",
  "mustard",
  "soybean",
  "sesame",
  "chili",
  "turmeric",
  "ginger",
  "lentil",
  "chickpea",
  "black_gram",
  "mango",
  "jackfruit",
  "litchi",
  "potato",
  "brinjal",
  "cabbage",
  "cotton",
  "tea",
  "tobacco",
  "capsicum_bell",
  "ornamental_pepper",
  "black_pepper",
  "tomato",
];

// Visual symptom IDs (symptom-registry-v1.json). Symptom ≠ disease: an
// inbound symptom is a hint for the manual workflow, never a diagnosis.
export const SYMPTOM_IDS = [
  "wilt",
  "leaf_spot",
  "witches_broom",
  "canker",
  "mosaic",
  "yellowing",
  "distortion",
  "little_leaf",
  "galls",
  "drying_necrosis_blight",
];

// Cause-group namespace owned by diagnostic-field-guide (unchanged local IDs).
export const CAUSE_GROUP_IDS = ["pest", "fungal", "bacterial", "viral", "nutrition", "water"];

// Contract field patterns (diagnostic-contract-v1.schema.json).
export const ID_PATTERNS = {
  crop: /^[a-z][a-z0-9_]{1,63}$/,
  plantPart: /^[a-z][a-z0-9_]{1,63}$/,
  symptom: /^[a-z][a-z0-9_]{1,63}$/,
  causeGroup: /^[a-z][a-z0-9_]{1,63}$/,
  guide: /^[a-z][a-z0-9_-]{1,63}$/,
  trainingTopic: /^[a-z][a-z0-9_-]{1,63}$/,
};

export const LIMITS = {
  maxSymptomIds: 20,
  maxCauseGroupIds: 20,
  guidePageMin: 1,
  guidePageMax: 10000,
};

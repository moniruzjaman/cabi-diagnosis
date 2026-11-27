// Evidence-based vision routing — Phase 1, Workstream B.
//
// Replaces the old token-substring heuristic (which silently routed
// chilli/মরিচ, brinjal/বেগুন, bare "pepper" and even black pepper to the
// PlantVillage bell-pepper classes, and all cereals to the unverified ViT).
//
// Sources of truth:
//   - docs/integration/model-coverage-v1.json (1.0.0-draft): a crop is served
//     by a model only when the canonical crop ID is listed in
//     validatedCropIds AND a matching class map exists.
//   - docs/integration/crop-registry-v1.json (1.1.0-draft) via
//     src/data/canonicalCrops.js: aliases resolve to canonical IDs BEFORE any
//     engine selection.
//
// Routing outcomes (engine values):
//   "plantvillage" — validated PlantVillage 15-class engines
//                    (capsicum_bell, potato, tomato only).
//   "unavailable"  — known crop with NO validated engine: the caller must
//                    continue with the manual/structured workflow and show a
//                    truthful "not available" state. Never a silent fallback.
//   "ambiguous"    — deliberately ambiguous crop token (bare "pepper"); the
//                    caller must ask the user instead of guessing a model.
//   "auto"         — no crop identity resolved (empty/unknown hint); the
//                    ensemble may run the validated PlantVillage model whose
//                    own label declares the crop.
//
// The ViT engine ("crop-leaf-diseases-vit") is UNVERIFIED
// (status: unverified-disabled-for-crop-specific-routing; validatedCropIds is
// empty). pickVisionEngine never returns "vit", and no fallback path may
// route to ViT based on a crop hint.

import { resolveCanonicalCrop, resolveCropId, CROP_REGISTRY_SNAPSHOT } from "../data/canonicalCrops.js";

// Pinned snapshot of the draft model-coverage registry.
export const MODEL_COVERAGE_SNAPSHOT = {
  registry: "krishiai-vision-model-coverage",
  version: "1.0.0-draft",
  status: "evidence-reviewed-not-runtime-authoritative",
  pinnedFrom: "docs/integration/model-coverage-v1.json",
};

// Canonical crop -> engine eligibility, built strictly from the validatedCropIds
// + cropClassMap of model-coverage-v1.json. Membership here is the ONLY way a
// crop hint selects an engine.
export const PLANTVILLAGE_VALIDATED_CROPS = ["capsicum_bell", "potato", "tomato"];

export const UNVERIFIED_ENGINES = {
  vit: {
    id: "crop-leaf-diseases-vit",
    status: "unverified-disabled-for-crop-specific-routing",
    validatedCropIds: [],
    missingEvidence: [
      "Exact ordered 13-class labels",
      "Verified model artifact provenance/hash",
      "Output-to-crop mapping",
      "Evaluation evidence tied to this exact artifact",
    ],
  },
};

export const VISION_ENGINES = ["plantvillage", "unavailable", "ambiguous", "auto"];

function canonicalFor(hint) {
  const r = resolveCanonicalCrop(hint);
  return r;
}

/**
 * Rich routing decision for a crop hint (display string, alias or canonical ID).
 * @returns {{
 *   engine: "plantvillage"|"unavailable"|"ambiguous"|"auto",
 *   cropId: string|null,
 *   season?: string,
 *   variant?: string,
 *   labelEn?: string,
 *   labelBn?: string|null,
 *   coverage: "validated"|"none"|"ambiguous"|"unresolved",
 *   reason: string,
 *   reasonBn: string,
 * }}
 */
export function resolveVisionRoute(cropHint) {
  if (cropHint == null || !String(cropHint).trim()) {
    return {
      engine: "auto",
      cropId: null,
      coverage: "unresolved",
      reason: "no crop hint; validated PlantVillage model may classify by its own labels",
      reasonBn: "ফসল নির্বাচন করা হয়নি — যাচাইকৃত মডেল নিজের ক্লাস অনুযায়ী ফসল চিনবে।",
    };
  }
  const resolved = canonicalFor(cropHint);
  if (!resolved.ok) {
    if (resolved.reason === "ambiguous") {
      return {
        engine: "ambiguous",
        cropId: null,
        coverage: "ambiguous",
        reason: `ambiguous crop token; distinct identities: ${resolved.candidates.join(", ")}`,
        reasonBn:
          '"মরিচ" শব্দটি একাধিক ভিন্ন ফসল বোঝাতে পারে (মিষ্টি মরিচ, লঙ্কা/মরিচ, অর্নামেন্টাল মরিচ, গোলমরিচ) — আগে সঠিক ফসল বেছে নিন।',
      };
    }
    return {
      engine: "auto",
      cropId: null,
      coverage: "unresolved",
      reason: `unrecognized crop hint (${resolved.reason}); validated PlantVillage model may classify by its own labels`,
      reasonBn: "ফসলের নাম শনাক্ত হয়নি — যাচাইকৃত মডেল নিজের ক্লাস অনুযায়ী ফসল চিনবে।",
    };
  }
  const { cropId, labelEn, labelBn, season, variant } = resolved;
  if (PLANTVILLAGE_VALIDATED_CROPS.includes(cropId)) {
    return {
      engine: "plantvillage",
      cropId,
      labelEn,
      labelBn,
      ...(season ? { season } : {}),
      ...(variant ? { variant } : {}),
      coverage: "validated",
      reason: `${cropId} is in model-coverage validatedCropIds (PlantVillage 15-class)`,
      reasonBn: `${labelBn || labelEn} — যাচাইকৃত PlantVillage মডেল সমর্থিত।`,
    };
  }
  return {
    engine: "unavailable",
    cropId,
    labelEn,
    labelBn,
    ...(season ? { season } : {}),
    ...(variant ? { variant } : {}),
    coverage: "none",
    reason: `${cropId} has no validated vision engine; manual/structured workflow continues`,
    reasonBn: `${labelBn || labelEn} ফসলের জন্য এখনো কোনো যাচাইকৃত ছবি-মডেল নেই — লক্ষণ লিখে ম্যানুয়াল ডায়াগনোসিস চালিয়ে যান।`,
  };
}

/**
 * Backward-compatible engine picker used by leafEnsemble and tests.
 * Never returns "vit": the ViT engine is unverified for crop-specific
 * predictions (model-coverage-v1.json).
 * @returns {"plantvillage"|"unavailable"|"ambiguous"|"auto"}
 */
export function pickVisionEngine(cropHint) {
  return resolveVisionRoute(cropHint).engine;
}

/** Canonical crop ID for a hint, or null. Convenience wrapper. */
export function canonicalCropIdForHint(cropHint) {
  return resolveCropId(cropHint);
}

/** Full coverage info for tests, UI badges and debugging. */
export function getVisionCoverage() {
  return {
    modelCoverage: MODEL_COVERAGE_SNAPSHOT,
    cropRegistry: CROP_REGISTRY_SNAPSHOT,
    plantvillageValidatedCropIds: [...PLANTVILLAGE_VALIDATED_CROPS],
    engines: {
      plantvillage: {
        modelIds: ["plantvillage-mobilenetv3-light", "plantvillage-trained-128"],
        classCount: 15,
        verified: true,
      },
      vit: UNVERIFIED_ENGINES.vit,
    },
  };
}

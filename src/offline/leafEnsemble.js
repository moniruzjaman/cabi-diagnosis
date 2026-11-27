// Vision ensemble — Phase 1 (Workstream B).
//
// Routing is evidence-based (see visionRouter.js / model-coverage-v1.json):
//   - Only the verified PlantVillage 15-class engines are used, and only for
//     their validated crops (capsicum_bell, potato, tomato).
//   - Crops without a validated engine return an explicit
//     CROP_NOT_SUPPORTED / CROP_AMBIGUOUS result — the app continues with the
//     existing manual/structured/AI workflow. There is no silent cross-engine
//     fallback and no unverified model is presented as suitable.
//   - The ViT engine ("crop-leaf-diseases-vit") is UNVERIFIED:
//     unverified-disabled-for-crop-specific-routing. classifyLeafSmart never
//     routes to it via a crop hint, never falls back to it, and never
//     preloads its 22 MB artifact. Direct programmatic use requires the
//     explicit allowUnverifiedVit flag (no in-app caller sets it); this keeps
//     the code path testable without enabling it in production flows.
//
// Confidence honesty: model outputs carry raw softmax scores. They are NOT
// calibrated field confidences (model-coverage-v1.json routing rule 4).

import { classifyLeaf, isModelReady as isVitReady } from "./vitClassifier.js";
import {
  classifyPlantVillage,
  preloadPlantVillageModel,
  isPlantVillageReady,
  getPlantVillagePreset,
  isPlantVillageLabelTableValid,
} from "./plantVillageClassifier.js";
import { PLANTVILLAGE_LABELS, PLANTVILLAGE_VALIDATED_CROP_IDS } from "./plantVillageLabels.js";
import { pickVisionEngine, resolveVisionRoute } from "./visionRouter.js";

export { pickVisionEngine, resolveVisionRoute };

function annotate(result, engine, modelId, route) {
  if (!result || !result.ok) return result;
  return {
    ...result,
    engine,
    modelId: modelId || result.modelId || engine,
    cropId: route?.cropId ?? result.cropId ?? null,
    route: route
      ? { engine: route.engine, cropId: route.cropId, coverage: route.coverage, reason: route.reason }
      : undefined,
    topK: (result.topK || []).map((entry) => ({
      ...entry,
      engine,
      modelId: modelId || result.modelId || engine,
    })),
  };
}

/**
 * Explicitly gated unverified-ViT run. Never reachable from crop-based
 * routing; requires allowUnverifiedVit=true from the caller.
 */
async function runVit(imageDataUrl, opts) {
  const result = await classifyLeaf(imageDataUrl, opts);
  return annotate(result, "vit", "crop-leaf-diseases-vit", null);
}

async function runPlantVillage(imageDataUrl, opts, route) {
  const result = await classifyPlantVillage(imageDataUrl, opts);
  return annotate(result, "plantvillage", result.modelId, route);
}

function unsupportedResult(route, code) {
  return {
    ok: false,
    code, // CROP_NOT_SUPPORTED | CROP_AMBIGUOUS
    engine: null,
    cropId: route.cropId || null,
    coverage: route.coverage,
    reason: route.reason,
    reasonBn: route.reasonBn,
    error: route.reason,
  };
}

export async function classifyLeafSmart(imageDataUrl, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 30000;

  // Explicit developer override only. No crop hint may ever select ViT.
  if (opts.engine === "vit") {
    if (!opts.allowUnverifiedVit) {
      return {
        ok: false,
        code: "ENGINE_UNVERIFIED",
        engine: "vit",
        error:
          "crop-leaf-diseases-vit is unverified (no ordered labels/artifact provenance); crop-specific routing is disabled",
      };
    }
    return runVit(imageDataUrl, { ...opts, timeoutMs });
  }

  const route = resolveVisionRoute(opts.cropHint);
  const preferred = opts.engine === "plantvillage" ? "plantvillage" : pickVisionEngine(opts.cropHint);

  // Fail closed for unsupported/ambiguous crops — no model run, truthful state.
  if (preferred === "unavailable") return unsupportedResult(route, "CROP_NOT_SUPPORTED");
  if (preferred === "ambiguous") return unsupportedResult(route, "CROP_AMBIGUOUS");

  // Bundled label table must be consistent; otherwise fail closed to the
  // existing non-ML workflow.
  const labelsOk = isPlantVillageLabelTableValid();
  if (!labelsOk.ok) {
    return {
      ok: false,
      code: "LABEL_VALIDATION_FAILED",
      engine: null,
      coverage: route.coverage,
      cropId: route.cropId || null,
      errors: labelsOk.errors,
      reason: "bundled PlantVillage label table failed consistency validation",
      reasonBn: "মডেলের লেবেল তালিকা যাচাই ব্যর্থ হয়েছে — ম্যানুয়াল ডায়াগনোসিস চালিয়ে যান।",
      error: "plantvillage label validation failed: " + labelsOk.errors.join("; "),
    };
  }

  // "plantvillage" (validated crop) and "auto" (no resolved identity) both run
  // the verified PlantVillage engine only. There is deliberately NO fallback
  // to the unverified ViT on failure.
  const pv = await runPlantVillage(imageDataUrl, { ...opts, timeoutMs }, route);
  return pv;
}

export function preloadLeafModels(cropHint) {
  const engine = pickVisionEngine(cropHint);
  if (engine === "unavailable" || engine === "ambiguous") {
    // Do not download any model artifact for crops we cannot serve.
    return Promise.resolve(false);
  }
  return preloadPlantVillageModel();
}

export function isLeafModelReady(cropHint) {
  const engine = pickVisionEngine(cropHint);
  if (engine === "unavailable" || engine === "ambiguous") return false;
  return isPlantVillageReady();
}

export function getLeafModelInfo() {
  const labelValidation = isPlantVillageLabelTableValid();
  return {
    engines: ["plantvillage"],
    validatedCropIds: [...PLANTVILLAGE_VALIDATED_CROP_IDS],
    disabledEngines: [
      {
        id: "crop-leaf-diseases-vit",
        reason: "unverified: ordered labels and artifact provenance not confirmed",
      },
    ],
    plantVillagePreset: getPlantVillagePreset(),
    plantVillageClasses: PLANTVILLAGE_LABELS.length,
    labelValidation,
    vitReady: isVitReady(),
  };
}

import { classifyLeaf, preloadModel as preloadVit, isModelReady as isVitReady } from "./vitClassifier.js";
import {
  classifyPlantVillage,
  preloadPlantVillageModel,
  isPlantVillageReady,
  getPlantVillagePreset,
} from "./plantVillageClassifier.js";
import { PLANTVILLAGE_LABELS } from "./plantVillageLabels.js";
import { pickVisionEngine } from "./visionRouter.js";

export { pickVisionEngine };

function annotate(result, engine, modelId) {
  if (!result || !result.ok) return result;
  return {
    ...result,
    engine,
    modelId: modelId || result.modelId || engine,
    topK: (result.topK || []).map((entry) => ({
      ...entry,
      engine,
      modelId: modelId || result.modelId || engine,
    })),
  };
}

async function runVit(imageDataUrl, opts) {
  const result = await classifyLeaf(imageDataUrl, opts);
  return annotate(result, "vit", "crop-leaf-diseases-vit");
}

async function runPlantVillage(imageDataUrl, opts) {
  const result = await classifyPlantVillage(imageDataUrl, opts);
  return annotate(result, "plantvillage", result.modelId);
}

export async function classifyLeafSmart(imageDataUrl, opts = {}) {
  const preferred = opts.engine || pickVisionEngine(opts.cropHint);
  const timeoutMs = opts.timeoutMs ?? 30000;

  if (preferred === "vit") {
    const vit = await runVit(imageDataUrl, { ...opts, timeoutMs });
    if (vit.ok) return vit;
    const pv = await runPlantVillage(imageDataUrl, { ...opts, timeoutMs: Math.min(timeoutMs, 20000) });
    return pv.ok ? pv : vit;
  }

  if (preferred === "plantvillage") {
    const pv = await runPlantVillage(imageDataUrl, { ...opts, timeoutMs });
    if (pv.ok) return pv;
    const vit = await runVit(imageDataUrl, { ...opts, timeoutMs: Math.min(timeoutMs, 25000) });
    return vit.ok ? vit : pv;
  }

  const first = await runPlantVillage(imageDataUrl, { ...opts, timeoutMs: Math.min(timeoutMs, 18000) });
  if (first.ok && first.topK?.[0]?.confidence >= 0.45) return first;
  const vit = await runVit(imageDataUrl, { ...opts, timeoutMs });
  if (vit.ok) return vit;
  return first;
}

export function preloadLeafModels(cropHint) {
  const engine = pickVisionEngine(cropHint);
  if (engine === "vit") return preloadVit();
  if (engine === "plantvillage") return preloadPlantVillageModel();
  preloadPlantVillageModel().catch(() => {});
  return preloadVit();
}

export function isLeafModelReady(cropHint) {
  const engine = pickVisionEngine(cropHint);
  if (engine === "vit") return isVitReady();
  if (engine === "plantvillage") return isPlantVillageReady();
  return isPlantVillageReady() || isVitReady();
}

export function getLeafModelInfo() {
  return {
    engines: ["vit", "plantvillage"],
    plantVillagePreset: getPlantVillagePreset(),
    plantVillageClasses: PLANTVILLAGE_LABELS.length,
  };
}

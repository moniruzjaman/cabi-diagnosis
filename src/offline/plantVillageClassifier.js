import { recordTelemetry } from "../utils/performanceTelemetry.js";
import { createOnnxSession, imageToTensor, loadImage, softmax } from "./onnxRuntime.js";
import { PLANTVILLAGE_LABELS, PLANTVILLAGE_MODEL_PRESETS, entryFromLabel } from "./plantVillageLabels.js";

const TOP_K_DEFAULT = 3;

let _activePresetId = "light";
const _sessions = {
  light: { promise: null, session: null, lastError: null },
  tiny: { promise: null, session: null, lastError: null },
};

function slot(presetId = _activePresetId) {
  return _sessions[presetId] || _sessions.light;
}

export function setPlantVillagePreset(presetId) {
  if (PLANTVILLAGE_MODEL_PRESETS[presetId]) {
    _activePresetId = presetId;
  }
  return _activePresetId;
}

export function getPlantVillagePreset() {
  return _activePresetId;
}

export function preloadPlantVillageModel(presetId = _activePresetId) {
  const id = PLANTVILLAGE_MODEL_PRESETS[presetId] ? presetId : "light";
  const state = slot(id);
  if (!state.promise) {
    state.promise = (async () => {
      try {
        const session = await createOnnxSession(PLANTVILLAGE_MODEL_PRESETS[id].url);
        state.session = session;
        state.lastError = null;
        return session;
      } catch (err) {
        state.lastError = err;
        state.promise = null;
        throw err;
      }
    })();
  }
  return state.promise;
}

export function isPlantVillageReady(presetId = _activePresetId) {
  return slot(presetId).session !== null;
}

export function getPlantVillageInfo(presetId = _activePresetId) {
  const preset = PLANTVILLAGE_MODEL_PRESETS[presetId] || PLANTVILLAGE_MODEL_PRESETS.light;
  const state = slot(presetId);
  return {
    modelUrl: preset.url,
    imageSize: preset.imageSize,
    numClasses: PLANTVILLAGE_LABELS.length,
    labels: PLANTVILLAGE_LABELS.map((l) => l.raw),
    ready: state.session !== null,
    lastError: state.lastError ? String(state.lastError.message || state.lastError) : null,
    preset: preset.id,
  };
}

export async function classifyPlantVillage(imageDataUrl, opts = {}) {
  const presetId = opts.preset || _activePresetId;
  const preset = PLANTVILLAGE_MODEL_PRESETS[presetId] || PLANTVILLAGE_MODEL_PRESETS.light;
  const topK = Math.max(1, Math.min(opts.topK ?? TOP_K_DEFAULT, PLANTVILLAGE_LABELS.length));
  const timeoutMs = opts.timeoutMs ?? 25000;

  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    return { ok: false, code: "BAD_INPUT", error: "imageDataUrl is required" };
  }

  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

  try {
    const work = (async () => {
      const session = await preloadPlantVillageModel(presetId);
      const img = await loadImage(imageDataUrl);
      const tensor = imageToTensor(img, preset.imageSize, { resizeShort: preset.resizeShort, centerCrop: true });
      const feeds = { [session.inputNames[0]]: tensor };
      const results = await session.run(feeds);
      const logits = results[session.outputNames[0]].data;
      return logits;
    })();

    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("PlantVillage inference timeout")), timeoutMs);
    });
    const logits = await Promise.race([work, timeout]);
    const probs = softmax(Array.from(logits));
    const ranked = probs.map((p, idx) => ({ idx, confidence: p })).sort((a, b) => b.confidence - a.confidence);
    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = Math.round(t1 - t0);

    const topKResults = ranked.slice(0, topK).map(({ idx, confidence }) => entryFromLabel(idx, confidence));
    const allScores = ranked.map(({ idx, confidence }) => ({
      idx,
      label: PLANTVILLAGE_LABELS[idx]?.raw || `class_${idx}`,
      confidence,
    }));

    recordTelemetry("plantvillage_inference", {
      durationMs,
      preset: preset.id,
      topPrediction: topKResults[0]?.label || "unknown",
      topConfidence: topKResults[0]?.confidence || 0,
    });

    return {
      ok: true,
      engine: "plantvillage",
      modelId: preset.id,
      topK: topKResults,
      allScores,
      inferenceMs: durationMs,
    };
  } catch (err) {
    return {
      ok: false,
      engine: "plantvillage",
      modelId: preset.id,
      code: err && err.name === "AbortError" ? "TIMEOUT" : "INFERENCE_FAILED",
      error: err && err.message ? err.message : String(err),
    };
  }
}

export async function disposePlantVillageModel(presetId) {
  const ids = presetId ? [presetId] : Object.keys(_sessions);
  for (const id of ids) {
    const state = _sessions[id];
    if (state?.session) {
      try {
        await state.session.release();
      } catch {
        /* ignore */
      }
      state.session = null;
      state.promise = null;
    }
  }
}

export { PLANTVILLAGE_LABELS };

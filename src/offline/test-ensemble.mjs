import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ort from "onnxruntime-web";
import { pickVisionEngine, resolveVisionRoute } from "./visionRouter.js";
import {
  PLANTVILLAGE_LABELS,
  entryFromLabel,
  PLANTVILLAGE_MODEL_PRESETS,
  validatePlantVillageLabels,
  PLANTVILLAGE_CROP_CLASS_MAP,
} from "./plantVillageLabels.js";
import { findCropDiseaseForVitPrediction, computeVitBoost, applyVitBoostToMatches } from "./vitIntegration.js";
import { resolveCropKey, CROP_DISEASES } from "../data/cropDiseases.js";
import { resolveCanonicalCrop } from "../data/canonicalCrops.js";
import { softmax } from "./onnxRuntime.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ── Phase 1 routing matrix (evidence-based; model-coverage-v1.json) ─────
// Validated PlantVillage crops: capsicum_bell, potato, tomato ONLY.
assert(pickVisionEngine("টমাটো / Tomato") === "plantvillage", "tomato -> plantvillage");
assert(pickVisionEngine("Tomato") === "plantvillage", "tomato en -> plantvillage");
assert(pickVisionEngine("আলু / Potato") === "plantvillage", "potato -> plantvillage");
assert(pickVisionEngine("আলু") === "plantvillage", "potato bn -> plantvillage");
assert(pickVisionEngine("বাটি মরিচ / Bell Pepper") === "plantvillage", "bell pepper -> plantvillage");
assert(pickVisionEngine("শিমলা মরিচ / Capsicum") === "plantvillage", "capsicum -> plantvillage");
assert(pickVisionEngine("capsicum_bell") === "plantvillage", "capsicum_bell id -> plantvillage");

// Pepper-family and other unsupported crops must NEVER select a vision model.
assert(pickVisionEngine("মরিচ / Chilli") === "unavailable", "chilli -> unavailable (never plantvillage)");
assert(pickVisionEngine("chilli") === "unavailable", "chilli en -> unavailable");
assert(pickVisionEngine("গোলমরিচ / Black Pepper") === "unavailable", "black pepper -> unavailable");
assert(pickVisionEngine("বেগুন / Brinjal") === "unavailable", "brinjal -> unavailable (was plantvillage before)");
assert(pickVisionEngine("ধান (বোরো) / Rice - Boro") === "unavailable", "rice boro -> unavailable (was vit before)");
assert(pickVisionEngine("ধান / Rice") === "unavailable", "rice -> unavailable (was vit before)");
assert(pickVisionEngine("ধান") === "unavailable", "bangla rice -> unavailable");
assert(pickVisionEngine("Rice") === "unavailable", "rice en -> unavailable");
assert(pickVisionEngine("গম / Wheat") === "unavailable", "wheat -> unavailable");
assert(pickVisionEngine("ভুট্টা / Maize") === "unavailable", "maize -> unavailable");

// Bare "pepper" is deliberately ambiguous — never auto-routed.
assert(pickVisionEngine("Pepper") === "ambiguous", "bare pepper -> ambiguous");
assert(pickVisionEngine("pepper") === "ambiguous", "bare pepper lc -> ambiguous");
assert(resolveCanonicalCrop("pepper").reason === "ambiguous", "pepper resolves as ambiguous");

// No crop hint → auto (validated model may classify by its own labels).
assert(pickVisionEngine("") === "auto", "empty -> auto");

// pickVisionEngine must never return the unverified engine for ANY selector crop.
const { CROP_FLAT } = await import("../data/cropRegistry.js");
for (const display of CROP_FLAT) {
  const engine = pickVisionEngine(display);
  assert(engine !== "vit", `no selector crop may route to vit (${display})`);
  assert(
    ["plantvillage", "unavailable", "ambiguous", "auto"].includes(engine),
    `engine value valid for ${display}: ${engine}`,
  );
}
const route = resolveVisionRoute("মরিচ / Chilli");
assert(route.engine === "unavailable" && route.cropId === "chili", "chilli route detail");
assert(route.reasonBn && route.reasonBn.length > 0, "bangla reason present for unsupported crops");

assert(PLANTVILLAGE_LABELS.length === 15, "15 plantvillage classes");
assert(entryFromLabel(6, 0.9).diseaseEn === "Early Blight", "tomato early blight label");
assert(entryFromLabel(12, 0.8).category === "viral", "tylcv is viral");
assert(entryFromLabel(0, 0.7).canonicalCropId === "capsicum_bell", "pepper bacterial spot -> capsicum_bell");
assert(entryFromLabel(1, 0.7).cropBn === "মিষ্টি মরিচ", "bell pepper healthy displayed as মিষ্টি মরিচ (not মরিচ)");
assert(entryFromLabel(4, 0.7).canonicalCropId === "potato", "potato healthy -> potato");

// Label-table consistency + fail-closed behavior.
const labelCheck = validatePlantVillageLabels();
assert(labelCheck.ok, "bundled label table passes validation: " + (labelCheck.errors || []).join("; "));
const corrupted = PLANTVILLAGE_LABELS.map((l, i) => (i === 0 ? { ...l, canonicalCropId: "chili" } : l));
const corruptCheck = validatePlantVillageLabels(corrupted);
assert(!corruptCheck.ok, "pepper class mis-mapped to chili must fail validation");
const shortCheck = validatePlantVillageLabels(PLANTVILLAGE_LABELS.slice(0, 14));
assert(!shortCheck.ok, "wrong class count must fail validation");
assert(PLANTVILLAGE_CROP_CLASS_MAP["capsicum_bell"].length === 2, "2 capsicum_bell classes");
assert(PLANTVILLAGE_CROP_CLASS_MAP["potato"].length === 3, "3 potato classes");
assert(PLANTVILLAGE_CROP_CLASS_MAP["tomato"].length === 10, "10 tomato classes");
// Legacy general-flow crop-key map is unchanged (documented Phase 1 open item:
// CROP_NAME_MAP still aliases Capsicum/Pepper to মরিচ — owner decision needed
// because CROP_DISEASES has no bell-pepper section). The VISION path is
// guarded, below.
assert(resolveCropKey("Pepper") === "মরিচ", "pepper crop key (legacy map unchanged)");
assert(resolveCropKey("Tomato") === "টমেটো", "tomato crop key");

// Vision→DB identity guard: bell pepper output must NEVER match the chilli DB.
const bellPepperEntry = {
  canonicalCropId: "capsicum_bell",
  cropEn: "Bell pepper",
  cropBn: "মিষ্টি মরিচ",
  diseaseEn: "Bacterial Spot",
  diseaseBn: "ব্যাকটেরিয়াল স্পট",
  confidence: 0.9,
  category: "bacterial",
  isHealthy: false,
};
assert(findCropDiseaseForVitPrediction(bellPepperEntry) === null, "bell pepper prediction gets NO chilli DB match");
const legacyPepperEntry = { ...bellPepperEntry, canonicalCropId: undefined, cropEn: "Pepper" };
assert(findCropDiseaseForVitPrediction(legacyPepperEntry) === null, "legacy Pepper entry also guarded");
const brinjalBoostProbe = findCropDiseaseForVitPrediction({
  canonicalCropId: "brinjal",
  cropEn: "Brinjal",
  diseaseEn: "Bacterial Spot",
  confidence: 0.9,
  category: "bacterial",
  isHealthy: false,
});
assert(brinjalBoostProbe === null || brinjalBoostProbe.cropKey === "বেগুন", "brinjal never resolves to মরিচ");
assert(
  CROP_DISEASES.টমেটো.diseases.some((d) => d.name === "Septoria Leaf Spot"),
  "septoria in tomato db",
);
assert(
  CROP_DISEASES.টমেটো.diseases.some((d) => d.name === "Tomato Mosaic"),
  "mosaic in tomato db",
);
assert(
  CROP_DISEASES.মরিচ.diseases.some((d) => d.name === "Bacterial Spot"),
  "pepper bacterial spot",
);

const vitEntry = {
  cropEn: "Tomato",
  cropBn: "টমেটো",
  diseaseEn: "Tomato Yellow Leaf Curl",
  diseaseBn: "হলুদ পাতা কুঁকড়ানো ভাইরাস",
  confidence: 0.9,
  category: "viral",
  isHealthy: false,
};
const match = findCropDiseaseForVitPrediction(vitEntry);
assert(match && match.disease && match.disease.name === "Tomato Leaf Curl", "TYLCV aliases to Tomato Leaf Curl");
assert(computeVitBoost(vitEntry, match) > 0.3, "exact boost is meaningful");

const matches = applyVitBoostToMatches(
  [
    { disease: { name: "Tomato Leaf Curl" }, matchRatio: 0.4, score: 1 },
    { disease: { name: "Early Blight" }, matchRatio: 0.5, score: 1 },
  ],
  vitEntry,
  { clone: true },
);
assert(matches[0].disease.name === "Tomato Leaf Curl", "boosted disease sorts first");

const probs = softmax([-1, 2, 0.5]);
assert(Math.abs(probs.reduce((s, p) => s + p, 0) - 1) < 1e-5, "softmax sums to 1");
assert(probs[1] > probs[2] && probs[2] > probs[0], "softmax ranking");

for (const preset of Object.values(PLANTVILLAGE_MODEL_PRESETS)) {
  const labelFile = path.join(REPO_ROOT, "public", preset.classNamesUrl.replace(/^\//, ""));
  const names = JSON.parse(fs.readFileSync(labelFile, "utf8"));
  assert(names.length === PLANTVILLAGE_LABELS.length, `${preset.id} class count`);
  for (let i = 0; i < names.length; i++) {
    assert(names[i] === PLANTVILLAGE_LABELS[i].raw, `${preset.id} label ${i}`);
  }
}

async function inferOnnx(relPath, imageSize, expectedClasses) {
  const modelPath = path.join(REPO_ROOT, "public", relPath.replace(/^\//, ""));
  const buf = fs.readFileSync(modelPath);
  const session = await ort.InferenceSession.create(buf, { executionProviders: ["wasm"] });
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const tensor = new ort.Tensor("float32", new Float32Array(1 * 3 * imageSize * imageSize), [
    1,
    3,
    imageSize,
    imageSize,
  ]);
  const results = await session.run({ [inputName]: tensor });
  const data = results[outputName].data;
  assert(data.length === expectedClasses, `${relPath} output classes`);
  const out = softmax(Array.from(data));
  assert(Math.abs(out.reduce((s, p) => s + p, 0) - 1) < 1e-4, `${relPath} softmax`);
  await session.release();
  return { inputName, outputName, classes: data.length };
}

const light = await inferOnnx(PLANTVILLAGE_MODEL_PRESETS.light.url, 224, 15);
assert(light.inputName === "input" && light.outputName === "logits", "mobilenetv3-light io names");
const tiny = await inferOnnx(PLANTVILLAGE_MODEL_PRESETS.tiny.url, 128, 15);
assert(tiny.inputName === "input" && tiny.outputName === "logits", "trained-128 io names");

console.log("offline ensemble tests: ALL PASS");

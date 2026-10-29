import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ort from "onnxruntime-web";
import { pickVisionEngine } from "./visionRouter.js";
import { PLANTVILLAGE_LABELS, entryFromLabel, PLANTVILLAGE_MODEL_PRESETS } from "./plantVillageLabels.js";
import { findCropDiseaseForVitPrediction, computeVitBoost, applyVitBoostToMatches } from "./vitIntegration.js";
import { resolveCropKey, CROP_DISEASES } from "../data/cropDiseases.js";
import { softmax } from "./onnxRuntime.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(pickVisionEngine("Rice") === "vit", "rice -> vit");
assert(pickVisionEngine("ধান") === "vit", "bangla rice -> vit");
assert(pickVisionEngine("Tomato") === "plantvillage", "tomato -> plantvillage");
assert(pickVisionEngine("আলু") === "plantvillage", "potato -> plantvillage");
assert(pickVisionEngine("Pepper") === "plantvillage", "pepper -> plantvillage");
assert(pickVisionEngine("") === "auto", "empty -> auto");

assert(PLANTVILLAGE_LABELS.length === 15, "15 plantvillage classes");
assert(entryFromLabel(6, 0.9).diseaseEn === "Early Blight", "tomato early blight label");
assert(entryFromLabel(12, 0.8).category === "viral", "tylcv is viral");
assert(resolveCropKey("Pepper") === "মরিচ", "pepper crop key");
assert(resolveCropKey("Tomato") === "টমেটো", "tomato crop key");
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

import { pickVisionEngine } from "./visionRouter.js";
import { PLANTVILLAGE_LABELS, entryFromLabel } from "./plantVillageLabels.js";
import { findCropDiseaseForVitPrediction, computeVitBoost, applyVitBoostToMatches } from "./vitIntegration.js";
import { resolveCropKey, CROP_DISEASES } from "../data/cropDiseases.js";

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
assert(CROP_DISEASES.টমেটো.diseases.some((d) => d.name === "Septoria Leaf Spot"), "septoria in tomato db");
assert(CROP_DISEASES.টমেটো.diseases.some((d) => d.name === "Tomato Mosaic"), "mosaic in tomato db");
assert(CROP_DISEASES.মরিচ.diseases.some((d) => d.name === "Bacterial Spot"), "pepper bacterial spot");

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

console.log("offline ensemble tests: ALL PASS");

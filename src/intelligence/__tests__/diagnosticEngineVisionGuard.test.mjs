// Diagnostic engine vision-identity guard tests — Phase 1 review fix.
//  - A bell-pepper vision prediction can NEVER corroborate a chilli disease
//    (the legacy resolveCropKey map substring-matches "Pepper"/"Capsicum"/
//    "bell pepper" — and even "মিষ্টি মরিচ" contains "মরিচ" — to the chilli
//    section মরিচ; the engine now uses the shared canonical guard
//    cropKeyForVisionEntry instead).
//  - Same guard for brinjal / black pepper / ornamental pepper vision names.
//  - Identity-TRUE corroboration (tomato vision + tomato form) still works.
//  - cropKeyForVisionEntry unit matrix.
import { diagnoseOffline } from "../../offline/diagnosticEngine.js";
import { cropKeyForVisionEntry } from "../../offline/vitIntegration.js";
import { CROP_DISEASES } from "../../data/cropDiseases.js";

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FAIL:", msg);
  }
}

const CHILLI_FORM = "মরিচ / Chilli";
const TOMATO_FORM = "টমাটো / Tomato";

function run({ crop, vision }) {
  return diagnoseOffline({
    crop,
    symptoms: {
      leafSymptoms: "পাতায় ছোট গাঢ় দাগ, দাগের চারপাশে হলুদ বলয়",
      distribution: "কিছু পাতায়",
      progression: "ধীরে ধীরে বাড়ছে",
      signs: "N/A",
    },
    hostInfo: { varietySusceptibility: "medium", growthStage: "vegetative" },
    pathogenInfo: { inoculumPressure: "low", season: "রবি", recentHistory: "none" },
    envInfo: null,
    vitPrediction: vision || undefined,
  });
}

// Baseline: chilli form without vision.
const chilliBase = run({ crop: CHILLI_FORM });
assert(chilliBase.cropDiseaseMatches.every((m) => !m.visionCorroborated), "baseline has no corroboration");

// ── 1. Bell pepper vision × chilli form: guarded in every shape ──────────────
const bellPepperShapes = [
  { name: "canonical PlantVillage entry", vision: { crop: "Bell pepper", cropBn: "মিষ্টি মরিচ", canonicalCropId: "capsicum_bell", disease: "Bacterial Spot", diseaseBn: "ব্যাকটেরিয়াল স্পট", confidence: 0.92, engine: "plantvillage" } },
  { name: "legacy snapshot without canonicalCropId", vision: { crop: "Bell pepper", cropBn: "মিষ্টি মরিচ", disease: "Bacterial Spot", diseaseBn: "ব্যাকটেরিয়াল স্পট", confidence: 0.92 } },
  { name: "legacy bare 'Pepper' cropEn", vision: { crop: "Pepper", disease: "Bacterial Spot", diseaseBn: "ব্যাকটেরিয়াল স্পট", confidence: 0.9 } },
  { name: "legacy 'Capsicum' cropEn", vision: { crop: "Capsicum", disease: "Bacterial Spot", diseaseBn: "ব্যাকটেরিয়াল স্পট", confidence: 0.9 } },
  { name: "Bangla bell pepper মিষ্টি মরিচ", vision: { crop: "মিষ্টি মরিচ", disease: "Bacterial Spot", diseaseBn: "ব্যাকটেরিয়াল স্পট", confidence: 0.9 } },
  { name: "Bangla selector display বাটি মরিচ / Bell Pepper", vision: { crop: "বাটি মরিচ / Bell Pepper", disease: "Bacterial Spot", diseaseBn: "ব্যাকটেরিয়াল স্পট", confidence: 0.9 } },
];
for (const { name, vision } of bellPepperShapes) {
  const res = run({ crop: CHILLI_FORM, vision });
  assert(
    res.cropDiseaseMatches.every((m) => !m.visionCorroborated),
    `bell pepper vision does NOT corroborate chilli diseases (${name})`,
  );
  assert(res.visionAgreement === 0, `no cross-identity vision agreement (${name})`);
  assert(res.visionCandidate === null, `bell pepper hint not surfaced as chilli candidate (${name})`);
  // ratios identical to the no-vision baseline — no boost at all.
  const baseRatios = chilliBase.cropDiseaseMatches.map((m) => m.matchRatio).join(",");
  const resRatios = res.cropDiseaseMatches.map((m) => m.matchRatio).join(",");
  assert(baseRatios === resRatios, `match ratios unchanged vs baseline (${name})`);
}

// ── 2. Brinjal / black pepper / ornamental pepper vision names ───────────────
const otherFamily = [
  ["Brinjal", "বেগুন"],
  ["বেগুন / Brinjal", "বেগুন"],
  ["Black pepper", "গোলমরিচ"],
  ["গোলমরিচ / Black Pepper", "গোলমরিচ"],
  ["Ornamental pepper", "অর্নামেন্টাল মরিচ"],
];
for (const [cropName, disease] of otherFamily) {
  const res = run({
    crop: CHILLI_FORM,
    vision: { crop: cropName, disease: "Bacterial Spot", diseaseBn: "ব্যাকটেরিয়াল স্পট", confidence: 0.9 },
  });
  assert(
    res.cropDiseaseMatches.every((m) => !m.visionCorroborated),
    `${cropName} vision does not corroborate chilli diseases`,
  );
  assert(res.visionCandidate === null && res.visionAgreement === 0, `${cropName} vision fully skipped for chilli form`);
}

// ── 3. Identity-TRUE corroboration still works (behavior preserved) ──────────
const tomatoDb = CROP_DISEASES["টমেটো"].diseases;
const lateBlight = tomatoDb.find((d) => d.name === "Late Blight");
assert(!!lateBlight, "tomato DB has Late Blight");
const symptomText = (lateBlight.symptoms || lateBlight.symptomsBn || []).slice(0, 2).join(", ") || "পাতায় দাগ";
const tomatoNoVision = diagnoseOffline({
  crop: TOMATO_FORM,
  symptoms: { leafSymptoms: symptomText, distribution: "কিছু পাতায়", progression: "দ্রুত বাড়ছে", signs: "N/A" },
  hostInfo: { varietySusceptibility: "medium", growthStage: "vegetative" },
  pathogenInfo: { inoculumPressure: "low", season: "রবি", recentHistory: "none" },
  envInfo: null,
});
const tomatoWithVision = diagnoseOffline({
  crop: TOMATO_FORM,
  symptoms: { leafSymptoms: symptomText, distribution: "কিছু পাতায়", progression: "দ্রুত বাড়ছে", signs: "N/A" },
  hostInfo: { varietySusceptibility: "medium", growthStage: "vegetative" },
  pathogenInfo: { inoculumPressure: "low", season: "রবি", recentHistory: "none" },
  envInfo: null,
  vitPrediction: { crop: "Tomato", canonicalCropId: "tomato", disease: "Late Blight", diseaseBn: "বিলম্বিত ঝলসা", confidence: 0.9, engine: "plantvillage" },
});
assert(
  tomatoWithVision.cropDiseaseMatches.some((m) => m.visionCorroborated) || tomatoWithVision.visionAgreement > 0,
  "identity-true tomato vision still corroborates (or records agreement)",
);
const baseTop = tomatoNoVision.cropDiseaseMatches[0]?.matchRatio ?? 0;
const boostedTop = tomatoWithVision.cropDiseaseMatches[0]?.matchRatio ?? 0;
assert(boostedTop >= baseTop, "identity-true vision never lowers the top match ratio");

// ── 4. cropKeyForVisionEntry unit matrix ─────────────────────────────
assert(cropKeyForVisionEntry({ cropEn: "Bell pepper" }) === null, "cropKey guard: Bell pepper -> null");
assert(cropKeyForVisionEntry({ crop: "Bell pepper" }) === null, "cropKey guard: crop alias also guarded");
assert(cropKeyForVisionEntry({ canonicalCropId: "capsicum_bell" }) === null, "cropKey guard: canonical capsicum_bell -> null (no bell section)");
assert(cropKeyForVisionEntry({ crop: "মিষ্টি মরিচ" }) === null, "cropKey guard: মিষ্টি মরিচ -> null");
assert(cropKeyForVisionEntry({ crop: "Pepper" }) === null, "cropKey guard: bare Pepper -> null");
assert(cropKeyForVisionEntry({ crop: "Potato", canonicalCropId: "potato" }) === "আলু", "cropKey guard: potato -> আলু");
assert(cropKeyForVisionEntry({ crop: "Tomato", canonicalCropId: "tomato" }) === "টমেটো", "cropKey guard: tomato -> টমেটো");
assert(cropKeyForVisionEntry({ crop: "Brinjal", canonicalCropId: "brinjal" }) === "বেগুন", "cropKey guard: brinjal -> বেগুন");
assert(cropKeyForVisionEntry({ crop: "Black pepper", canonicalCropId: "black_pepper" }) === null, "cropKey guard: black pepper -> null");
assert(cropKeyForVisionEntry({ crop: "Ornamental pepper", canonicalCropId: "ornamental_pepper" }) === null, "cropKey guard: ornamental pepper -> null");
assert(cropKeyForVisionEntry(null) === null, "cropKey guard: null entry -> null");

console.log(`\ndiagnosticEngineVisionGuard.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

// Vision routing tests — Phase 1 Workstream B.
//  - Evidence-based engine matrix (capsicum_bell/potato/tomato -> plantvillage)
//  - chilli / black pepper / ornamental pepper / brinjal / cereals NEVER select
//    PlantVillage or the unverified ViT
//  - bare "pepper" ambiguous; empty hint -> auto
//  - ViT gated behind explicit allowUnverifiedVit flag only
//  - label table fail-closed validation
//  - vision->DB identity guard (bell pepper never matches chilli diseases)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  pickVisionEngine,
  resolveVisionRoute,
  PLANTVILLAGE_VALIDATED_CROPS,
  UNVERIFIED_ENGINES,
  getVisionCoverage,
} from "../../offline/visionRouter.js";
import { classifyLeafSmart, getLeafModelInfo } from "../../offline/leafEnsemble.js";
import {
  PLANTVILLAGE_LABELS,
  PLANTVILLAGE_CROP_CLASS_MAP,
  validatePlantVillageLabels,
  entryFromLabel,
} from "../../offline/plantVillageLabels.js";
import { findCropDiseaseForVitPrediction, computeVitBoost, applyVitBoostToMatches } from "../../offline/vitIntegration.js";
import { CROP_FLAT } from "../../data/cropRegistry.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FAIL:", msg);
  }
}

// ── 1. Validated routing matrix ───────────────────────────────────────────────
assert(PLANTVILLAGE_VALIDATED_CROPS.join(",") === "capsicum_bell,potato,tomato", "validated crops: capsicum_bell,potato,tomato ONLY");
assert(pickVisionEngine("বাটি মরিচ / Bell Pepper") === "plantvillage", "bell pepper -> plantvillage");
assert(pickVisionEngine("আলু / Potato") === "plantvillage", "potato -> plantvillage");
assert(pickVisionEngine("টমাটো / Tomato") === "plantvillage", "tomato -> plantvillage");
const bellRoute = resolveVisionRoute("বাটি মরিচ / Bell Pepper");
assert(bellRoute.cropId === "capsicum_bell" && bellRoute.coverage === "validated", "bell pepper route detail");

// ── 2. Forbidden routing: pepper family + cereals ───────────────────────
const forbidden = [
  ["মরিচ / Chilli", "chili"],
  ["chilli", "chili"],
  ["মরিচ", "chili"],
  ["গোলমরিচ / Black Pepper", "black_pepper"],
  ["অর্নামেন্টাল মরিচ / Ornamental Pepper", "ornamental_pepper"],
  ["বেগুন / Brinjal", "brinjal"],
  ["ধান (বোরো) / Rice - Boro", "rice"],
  ["ধান / Rice", "rice"],
  ["গম / Wheat", "wheat"],
  ["ভুট্টা / Maize", "maize"],
  ["পাট / Jute", "jute"],
];
for (const [display, cropId] of forbidden) {
  const r = resolveVisionRoute(display);
  assert(r.engine === "unavailable", `${display} -> unavailable (got ${r.engine})`);
  assert(r.cropId === cropId, `${display} resolves to ${cropId} (got ${r.cropId})`);
  assert(r.engine !== "vit", `${display} never -> vit`);
  assert(r.engine !== "plantvillage", `${display} never -> plantvillage`);
  assert(r.reasonBn && r.reasonBn.length > 0, `${display} has Bangla reason`);
}
assert(pickVisionEngine("Pepper") === "ambiguous", "bare Pepper -> ambiguous");
assert(pickVisionEngine("") === "auto", "empty -> auto");
assert(pickVisionEngine("magical unicorn plant") === "auto", "unknown hint -> auto (model self-identifies)");

// ── 3. Whole-selector invariant: no selector crop routes to vit ──────────────
for (const display of CROP_FLAT) {
  const engine = pickVisionEngine(display);
  assert(engine !== "vit", `no selector crop routes to vit: ${display}`);
}
// Only the three validated crops may reach plantvillage.
const pvDisplays = CROP_FLAT.filter((d) => pickVisionEngine(d) === "plantvillage");
const pvIds = new Set(pvDisplays.map((d) => resolveVisionRoute(d).cropId));
assert(pvIds.size === 3, `exactly 3 crops reach plantvillage (got ${[...pvIds].join(",")})`);
for (const id of pvIds) assert(PLANTVILLAGE_VALIDATED_CROPS.includes(id), `pv crop validated: ${id}`);

// ── 4. ViT is disabled for crop-specific routing ─────────────────────────────
assert(UNVERIFIED_ENGINES.vit.status === "unverified-disabled-for-crop-specific-routing", "vit status disabled");
assert(UNVERIFIED_ENGINES.vit.validatedCropIds.length === 0, "vit has no validated crops");
assert(UNVERIFIED_ENGINES.vit.missingEvidence.length >= 3, "vit missing evidence documented");
const cov = getVisionCoverage();
assert(cov.engines.vit.status === "unverified-disabled-for-crop-specific-routing", "coverage exposes vit disabled");
assert(cov.engines.plantvillage.verified === true, "coverage marks plantvillage verified");

// explicit vit request without flag -> refused
const vitRefused = await classifyLeafSmart("data:image/png;base64,iVBORw0KGgo=", { engine: "vit" });
assert(vitRefused.ok === false && vitRefused.code === "ENGINE_UNVERIFIED", "engine:'vit' refused without allowUnverifiedVit");

// ── 5. Unsupported crops fail closed without a model run ─────────────────────
const unsupported = await classifyLeafSmart("data:image/png;base64,iVBORw0KGgo=", { cropHint: "মরিচ / Chilli" });
assert(unsupported.ok === false && unsupported.code === "CROP_NOT_SUPPORTED", "chilli -> CROP_NOT_SUPPORTED");
assert(unsupported.cropId === "chili", "unsupported result carries cropId");
const ambiguous = await classifyLeafSmart("data:image/png;base64,iVBORw0KGgo=", { cropHint: "pepper" });
assert(ambiguous.ok === false && ambiguous.code === "CROP_AMBIGUOUS", "bare pepper -> CROP_AMBIGUOUS");
const unsupportedBn = await classifyLeafSmart("data:image/png;base64,iVBORw0KGgo=", { cropHint: "বেগুন / Brinjal" });
assert(unsupportedBn.ok === false && unsupportedBn.reasonBn, "brinjal unsupported with Bangla reason");

// model info reflects the corrected engines
const info = getLeafModelInfo();
assert(info.engines.includes("plantvillage") && info.engines.length === 1, "active engines: plantvillage only");
assert(info.disabledEngines.some((e) => e.id === "crop-leaf-diseases-vit"), "leaf model info documents disabled vit");
assert(info.validatedCropIds.join(",") === "capsicum_bell,potato,tomato", "leaf model info validated crops");

// ── 6. Label table validation (fail-closed) ──────────────────────────────
assert(PLANTVILLAGE_LABELS.length === 15, "15 labels");
const good = validatePlantVillageLabels();
assert(good.ok, `bundled labels pass: ${(good.errors || []).join(";")}`);
const wrongCount = validatePlantVillageLabels(PLANTVILLAGE_LABELS.slice(1));
assert(!wrongCount.ok, "wrong count fails");
const wrongOrder = validatePlantVillageLabels(
  PLANTVILLAGE_LABELS.map((l, i) => ({ ...l, idx: l.idx === 3 ? 99 : l.idx })).filter((l) => l.idx !== 99).concat([PLANTVILLAGE_LABELS[3]]),
);
assert(!wrongOrder.ok, "idx disorder fails");
const chiliMapped = validatePlantVillageLabels(
  PLANTVILLAGE_LABELS.map((l, i) => (i === 0 ? { ...l, canonicalCropId: "chili" } : l)),
);
assert(!chiliMapped.ok, "Pepper__bell mapped to chili fails validation");
const brinjalMapped = validatePlantVillageLabels(
  PLANTVILLAGE_LABELS.map((l, i) => (i === 1 ? { ...l, canonicalCropId: "brinjal" } : l)),
);
assert(!brinjalMapped.ok, "Pepper__bell mapped to brinjal fails validation");

// class map counts (mirror of model-coverage-v1.json cropClassMap)
assert(PLANTVILLAGE_CROP_CLASS_MAP.capsicum_bell.length === 2, "2 bell pepper classes");
assert(PLANTVILLAGE_CROP_CLASS_MAP.potato.length === 3, "3 potato classes");
assert(PLANTVILLAGE_CROP_CLASS_MAP.tomato.length === 10, "10 tomato classes");
assert(entryFromLabel(0, 0.9).canonicalCropId === "capsicum_bell", "idx0 canonical");
assert(entryFromLabel(1, 0.9).cropBn === "মিষ্টি মরিচ", "idx1 displayed as মিষ্টি মরিচ (bell pepper, NOT মরিচ)");

// ── 7. Deployed class_names.json match (artifact/label consistency) ──────────
const presets = JSON.parse(readFileSync(join(ROOT, "public/models/manifest.json"), "utf8")).engines.filter(
  (e) => e.kind.startsWith("mobilenetv3"),
);
for (const e of presets) {
  const names = JSON.parse(readFileSync(join(ROOT, "public", e.labels.replace(/^\//, "")), "utf8"));
  assert(names.length === 15, `${e.id}: 15 deployed labels`);
  for (let i = 0; i < 15; i++) assert(names[i] === PLANTVILLAGE_LABELS[i].raw, `${e.id}: label ${i} order match`);
}

// ── 8. Vision→DB identity guard (vitIntegration) ──────────────────────────────
const bellSpot = {
  canonicalCropId: "capsicum_bell",
  cropEn: "Bell pepper",
  cropBn: "মিষ্টি মরিচ",
  diseaseEn: "Bacterial Spot",
  diseaseBn: "ব্যাকটেরিয়াল স্পট",
  confidence: 0.92,
  category: "bacterial",
  isHealthy: false,
};
assert(findCropDiseaseForVitPrediction(bellSpot) === null, "bell pepper bacterial spot -> NO chilli DB match");
assert(findCropDiseaseForVitPrediction({ ...bellSpot, canonicalCropId: undefined }) === null, "legacy bell pepper (no canonical id) also guarded");
assert(findCropDiseaseForVitPrediction({ ...bellSpot, cropEn: "Pepper", canonicalCropId: undefined }) === null, "legacy 'Pepper' cropEn guarded");
assert(
  findCropDiseaseForVitPrediction({ ...bellSpot, isHealthy: true, diseaseEn: "Healthy" }) === null,
  "bell pepper healthy -> no DB match (no capsicum section)",
);
const brinjalProbe = findCropDiseaseForVitPrediction({ ...bellSpot, canonicalCropId: "brinjal", cropEn: "Brinjal" });
assert(brinjalProbe === null || brinjalProbe.cropKey === "বেগুন", "brinjal (if matched) lands in বেগুন only");
// identity-true matches still work: potato early blight
const potatoSpot = {
  canonicalCropId: "potato",
  cropEn: "Potato",
  diseaseEn: "Early Blight",
  confidence: 0.8,
  category: "fungal",
  isHealthy: false,
};
const potatoMatch = findCropDiseaseForVitPrediction(potatoSpot);
assert(potatoMatch && potatoMatch.cropKey === "আলু", "potato -> আলু section");
assert(computeVitBoost(potatoSpot, potatoMatch) > 0, "potato boost works");
const tomatoSpot = { ...potatoSpot, canonicalCropId: "tomato", cropEn: "Tomato", diseaseEn: "Tomato Mosaic" };
const tomatoMatch = findCropDiseaseForVitPrediction(tomatoSpot);
assert(tomatoMatch && tomatoMatch.cropKey === "টমেটো", "tomato -> টমেটো section");
// boost application unchanged for identity-true matches
const boosted = applyVitBoostToMatches(
  [
    { disease: { name: "Early Blight" }, matchRatio: 0.4, score: 1 },
    { disease: { name: "Late Blight" }, matchRatio: 0.5, score: 1 },
  ],
  potatoSpot,
  { clone: true },
);
assert(boosted.some((m) => m.vitBoost > 0), "identity-true boost applies");

// ── 10. Explicit engine selection can NEVER widen canonical eligibility ──────
// Phase 1 review (critical): before the fix, opts.engine:"plantvillage"
// bypassed pickVisionEngine and ran the bell-pepper-capable model for
// ineligible crops. Both AUTOMATIC (no engine) and EXPLICIT engine selection
// must fail closed identically for every ineligible crop.
const IMG = "data:image/png;base64,iVBORw0KGgo=";
const ineligibleMatrix = [
  ["মরিচ / Chilli", "CROP_NOT_SUPPORTED"],
  ["chilli", "CROP_NOT_SUPPORTED"],
  ["মরিচ", "CROP_NOT_SUPPORTED"],
  ["বেগুন / Brinjal", "CROP_NOT_SUPPORTED"],
  ["গোলমরিচ / Black Pepper", "CROP_NOT_SUPPORTED"],
  ["অর্নামেন্টাল মরিচ / Ornamental Pepper", "CROP_NOT_SUPPORTED"],
  ["ধান / Rice", "CROP_NOT_SUPPORTED"],
  ["Pepper", "CROP_AMBIGUOUS"],
];
for (const [hint, expectedCode] of ineligibleMatrix) {
  const autoRes = await classifyLeafSmart(IMG, { cropHint: hint });
  assert(autoRes.ok === false && autoRes.code === expectedCode, `auto engine fail-closed for ${hint} (got ${autoRes.code})`);
  const explicitRes = await classifyLeafSmart(IMG, { cropHint: hint, engine: "plantvillage" });
  assert(
    explicitRes.ok === false && explicitRes.code === expectedCode,
    `explicit engine:"plantvillage" fail-closed for ${hint} (got ${explicitRes.code || explicitRes.ok})`,
  );
  assert(explicitRes.engine !== "plantvillage", `explicit engine does not run plantvillage for ${hint}`);
  const vitRes = await classifyLeafSmart(IMG, { cropHint: hint, engine: "vit" });
  assert(vitRes.ok === false && vitRes.code === "ENGINE_UNVERIFIED", `explicit vit stays gated for ${hint}`);
}
// Eligible crop with explicit engine keeps its validated route (in Node the
// ONNX fetch fails, but the rejection must be INFERENCE_FAILED — proof the
// crop passed eligibility — never CROP_NOT_SUPPORTED).
const tomatoExplicit = await classifyLeafSmart(IMG, { cropHint: "টমাটো / Tomato", engine: "plantvillage" });
assert(
  tomatoExplicit.ok === false && tomatoExplicit.code !== "CROP_NOT_SUPPORTED" && tomatoExplicit.code !== "CROP_AMBIGUOUS",
  `explicit engine:"plantvillage" keeps validated tomato route (got ${tomatoExplicit.code})`,
);
assert(tomatoExplicit.engine === "plantvillage", "explicit run annotates plantvillage engine");

// ── 11. Manifest reconciled with the verified coverage policy ────────────────
// Phase 1 review: public/models/manifest.json must not advertise generic
// "pepper" or any unverified ViT crop support as available.
const manifest = JSON.parse(readFileSync(join(ROOT, "public/models/manifest.json"), "utf8"));
for (const eng of manifest.engines) {
  if (eng.kind.startsWith("mobilenetv3")) {
    assert(eng.coverage === "verified", `${eng.id} marked verified`);
    assert(
      eng.crops.every((c) => PLANTVILLAGE_VALIDATED_CROPS.includes(c)),
      `${eng.id} crops ⊆ validated canonical IDs (got ${eng.crops.join(",")})`,
    );
    assert(!eng.crops.includes("pepper"), `${eng.id} does not advertise generic pepper`);
  } else {
    assert(eng.crops.length === 0, `${eng.id} advertises NO crops (unverified)`);
    assert(eng.coverage === "unverified", `${eng.id} marked unverified`);
    assert(eng.status === "unverified-disabled-for-crop-specific-routing", `${eng.id} status disabled`);
    assert(eng.precache === false, `${eng.id} not precached`);
  }
}
assert(
  !JSON.stringify(manifest).match(/"pepper"/),
  "manifest never contains a generic pepper crop token",
);
assert(
  !manifest.engines.some((e) => ["rice", "wheat", "corn"].some((c) => (e.crops || []).includes(c))),
  "manifest does not advertise unverified ViT cereal support",
);

console.log(`\nvisionRouting.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

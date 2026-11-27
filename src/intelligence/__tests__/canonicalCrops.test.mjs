// Canonical crop identity tests — Phase 1 Workstream A.
//  - Four pepper identities are distinct and resolve exactly
//  - Bare "pepper" is ambiguous (never auto-resolved)
//  - Rice seasons stay attributes of rice
//  - All 205 CABI selector display strings resolve deterministically
//  - Unknown inputs are rejected, never silently mapped
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  resolveCanonicalCrop,
  resolveCropId,
  normalizeCropAlias,
  CANONICAL_CROPS,
  DERIVED_CROPS,
  DISPLAY_CROP_MAP,
  PEPPER_IDENTITY_IDS,
  AMBIGUOUS_CROP_TOKENS,
  listCanonicalCropIds,
} from "../../data/canonicalCrops.js";
import { CROP_FLAT } from "../../data/cropRegistry.js";
import { pickVisionEngine as pickVisionEngineShared } from "../../offline/visionRouter.js";

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

// 1. The four pepper identities are distinct.
assert(new Set(PEPPER_IDENTITY_IDS).size === 4, "four distinct pepper identity IDs");
assert(
  resolveCropId("মরিচ") === "chili" && resolveCropId("মরিচ / Chilli") === "chili",
  "bare মরিচ + Chilli display -> chili (source-backed)",
);
assert(resolveCropId("মিষ্টি মরিচ") === "capsicum_bell", "মিষ্টি মরিচ -> capsicum_bell");
assert(resolveCropId("অর্নামেন্টাল মরিচ") === "ornamental_pepper", "অর্নামেন্টাল মরিচ -> ornamental_pepper");
assert(resolveCropId("গোলমরিচ") === "black_pepper", "গোলমরিচ -> black_pepper");
assert(resolveCropId("bell pepper") === "capsicum_bell", "bell pepper -> capsicum_bell");
assert(resolveCropId("sweet pepper") === "capsicum_bell", "sweet pepper -> capsicum_bell");
assert(resolveCropId("capsicum") === "capsicum_bell", "capsicum -> capsicum_bell");
assert(resolveCropId("শিমলা মরিচ / Capsicum") === "capsicum_bell", "Capsicum display -> capsicum_bell");
assert(resolveCropId("বাটি মরিচ / Bell Pepper") === "capsicum_bell", "Bell Pepper display -> capsicum_bell");
assert(resolveCropId("chilli") === "chili", "chilli -> chili");
assert(resolveCropId("hot pepper") === "chili", "hot pepper -> chili");
assert(resolveCropId("black pepper") === "black_pepper", "black pepper -> black_pepper");
const pepperIds = PEPPER_IDENTITY_IDS.map((id) => resolveCropId(id));
assert(new Set(pepperIds).size === 4, "each pepper ID resolves to itself");
for (const id of ["chili", "ornamental_pepper", "black_pepper"]) {
  assert(resolveCropId("মিষ্টি মরিচ") !== id, `মিষ্টি মরিচ never maps to ${id}`);
  assert(resolveCropId("মরিচ / Chilli") !== "capsicum_bell", "chilli display never maps to capsicum_bell");
  assert(resolveCropId("গোলমরিচ") !== "chili", "গোলমরিচ never maps to chili");
}

// 2. Bare "pepper" is deliberately ambiguous.
assert(AMBIGUOUS_CROP_TOKENS.includes("pepper"), "bare pepper listed ambiguous");
const amb = resolveCanonicalCrop("pepper");
assert(!amb.ok && amb.reason === "ambiguous", "pepper -> ambiguous");
assert(amb.candidates && amb.candidates.length === 4, "ambiguous pepper lists 4 candidates");
assert(resolveCropId("pepper") === null, "ambiguous pepper has no crop id");

// 3. Rice seasons remain attributes of rice.
const boro = resolveCanonicalCrop("ধান (বোরো) / Rice - Boro");
assert(boro.ok && boro.cropId === "rice" && boro.season === "boro", "boro -> rice+season boro");
const aman = resolveCanonicalCrop("ধান (আমন) / Rice - Aman");
assert(aman.ok && aman.cropId === "rice" && aman.season === "aman", "aman -> rice+season aman");
const aus = resolveCanonicalCrop("Rice - Aus");
assert(aus.ok && aus.cropId === "rice" && aus.season === "aus", "Rice - Aus -> rice+season aus");
assert(resolveCropId("ধান") === "rice" && resolveCropId("Rice") === "rice", "plain rice both languages");
assert(resolveCropId("wheat") === "wheat" && resolveCropId("গম") === "wheat", "wheat both languages");
assert(resolveCropId("tomato") === "tomato" && resolveCropId("টমেটো") === "tomato" && resolveCropId("টমাটো") === "tomato", "tomato all spellings");
assert(resolveCropId("brinjal") === "brinjal" && resolveCropId("বেগুন / Brinjal") === "brinjal", "brinjal distinct from peppers");

// 4. Variants are attributes, not separate crop identities.
const khira = resolveCanonicalCrop("খিরা / Cucumber - Khira");
assert(khira.ok && khira.cropId === "cucumber" && khira.variant === "khira", "Cucumber - Khira -> cucumber + variant");
const round = resolveCanonicalCrop("গোল আলু / Potato - Round");
assert(round.ok && round.cropId === "potato" && round.variant === "round", "Potato - Round -> potato + variant");

// 5. Full selector coverage: every display string resolves exactly once.
assert(CROP_FLAT.length === 205, `205 selector crops (got ${CROP_FLAT.length})`);
for (const display of CROP_FLAT) {
  const r = resolveCanonicalCrop(display);
  assert(r.ok, `display resolves: ${display}`);
  if (r.ok) {
    assert(listCanonicalCropIds().includes(r.cropId), `resolved id is canonical: ${display} -> ${r.cropId}`);
    assert(r.labelEn && r.labelEn.length > 0, `labelEn present: ${display}`);
  }
  const r2 = resolveCanonicalCrop(display);
  assert(r2.ok === r.ok && r2.cropId === r.cropId, `deterministic: ${display}`);
}
assert(Object.keys(DISPLAY_CROP_MAP).length === CROP_FLAT.length, "DISPLAY_CROP_MAP covers all display strings");

// 6. Unknown inputs are rejected, never mapped.
for (const unknown of ["martian weed", "unknowncrop", "peppermint tree", "xyz_abc"]) {
  const r = resolveCanonicalCrop(unknown);
  assert(!r.ok && r.reason === "unknown", `unknown rejected: ${unknown}`);
}
assert(resolveCropId(null) === null && resolveCropId("") === null && resolveCropId(42) === null, "empty/invalid inputs -> null");

// 7. Normalization is deterministic.
assert(normalizeCropAlias("  Bell   PEPPER ") === "bell pepper", "whitespace+case normalization");
assert(normalizeCropAlias("মিষ্টি  মরিচ") === "মিষ্টি মরিচ", "bangla whitespace collapsed");
assert(resolveCropId("  CHILLI  ") === "chili", "padded uppercase input resolves");

// 8. Registry snapshot metadata + identity fields.
assert(CANONICAL_CROPS.capsicum_bell.labelBn === "মিষ্টি মরিচ", "capsicum_bell Bangla label");
assert(CANONICAL_CROPS.chili.labelBn === "মরিচ", "chili Bangla label");
assert(CANONICAL_CROPS.black_pepper.labelBn === "গোলমরিচ", "black_pepper Bangla label");
assert(CANONICAL_CROPS.ornamental_pepper.labelBn === "অর্নামেন্টাল মরিচ", "ornamental_pepper Bangla label");
assert(CANONICAL_CROPS.tomato.registry === false, "tomato flagged registry-pending");
assert(CANONICAL_CROPS.capsicum_bell.modelCoverageRef === "plantvillage-mobilenetv3-light", "capsicum_bell coverage ref");
assert(CANONICAL_CROPS.chili.modelCoverageRef === null, "chili has NO model coverage ref");
assert(CANONICAL_CROPS.brinjal.modelCoverageRef === null, "brinjal has NO model coverage ref");

// 9. Snapshot sync: registry-backed IDs must exist in the draft registry JSON
// (tomato documented exception).
const cropRegistry = JSON.parse(readFileSync(join(ROOT, "docs/integration/crop-registry-v1.json"), "utf8"));
const registryIds = new Set(cropRegistry.crops.map((c) => c.id));
for (const [id, meta] of Object.entries(CANONICAL_CROPS)) {
  if (id === "tomato") continue; // flagged exception, see PR notes
  assert(registryIds.has(id), `canonical id exists in crop-registry-v1.json: ${id}`);
  const entry = cropRegistry.crops.find((c) => c.id === id);
  assert(entry.labelEn === meta.labelEn, `labelEn matches registry for ${id}`);
}
// Aliases come verbatim from the registry (case-insensitive).
for (const alias of cropRegistry.crops.find((c) => c.id === "capsicum_bell").aliases) {
  assert(resolveCropId(alias) === "capsicum_bell", `registry alias resolves: ${alias}`);
}
for (const alias of cropRegistry.crops.find((c) => c.id === "chili").aliases) {
  assert(resolveCropId(alias) === "chili", `chili registry alias resolves: ${alias}`);
}
assert(Object.keys(DERIVED_CROPS).length > 150, "derived selector crops present");
for (const id of Object.keys(DERIVED_CROPS)) {
  assert(!registryIds.has(id), `derived id is NOT a registry id (documented): ${id}`);
}

assert(pickVisionEngineShared("pepper") === "ambiguous", "ambiguous pepper would be rejected by vision router too");

console.log(`\ncanonicalCrops.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

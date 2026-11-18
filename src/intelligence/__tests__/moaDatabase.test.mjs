// MoA Database tests — asserts the FRAC/IRAC MoA group database is complete,
// cited, and the free-text resolver + recommendNextMoa work correctly.
import {
  getAllMoaGroups,
  getMoaGroup,
  resolveMoaCode,
  getMoaCodesForDisease,
  recommendNextMoa,
} from "../moaDatabase.js";

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("FAIL:", msg);
  }
}

// 1. Database has ≥ 10 MoA groups covering the key FRAC classes
const all = getAllMoaGroups();
assert(all.length >= 10, `≥ 10 MoA groups (got ${all.length})`);

// 2. Every group has a sources field (cited or "uncited" — never missing)
assert(
  all.every((g) => Array.isArray(g.sources) && g.sources.length > 0),
  "every MoA group has sources[]",
);

// 3. Key FRAC groups present
assert(getMoaGroup("FRAC_1") != null, "FRAC_1 (MBC) present");
assert(getMoaGroup("FRAC_3") != null, "FRAC_3 (DMI/triazoles) present");
assert(getMoaGroup("FRAC_11") != null, "FRAC_11 (QoI/strobilurins) present");
assert(getMoaGroup("FRAC_M") != null, "FRAC_M (multi-site) present");
assert(getMoaGroup("FRAC_P1") != null, "FRAC_P1 (MBI — rice blast) present");

// 4. Resistance risk classifications (public-domain FRAC ratings)
assert(getMoaGroup("FRAC_1").resistanceRisk === "high", "FRAC_1 (benzimidazoles) = high risk");
assert(getMoaGroup("FRAC_11").resistanceRisk === "high", "FRAC_11 (QoI) = high risk");
assert(getMoaGroup("FRAC_4").resistanceRisk === "high", "FRAC_4 (phenylamides) = high risk");
assert(getMoaGroup("FRAC_M").resistanceRisk === "low", "FRAC_M (multi-site) = low risk");
assert(getMoaGroup("FRAC_P1").resistanceRisk === "low", "FRAC_P1 = low risk");

// 5. Season caps + rotation windows are set (not magic 0)
assert(getMoaGroup("FRAC_11").maxAppsPerSeason === 2, "FRAC_11 max 2/season (FRAC guideline)");
assert(getMoaGroup("FRAC_11").rotationWindowDays >= 14, "FRAC_11 rotation window ≥ 14 days");
assert(getMoaGroup("FRAC_M").maxAppsPerSeason >= 4, "FRAC_M generous cap (low risk)");

// 6. Free-text resolver handles common farmer spellings
assert(resolveMoaCode("FRAC 3") === "FRAC_3", "'FRAC 3' → FRAC_3");
assert(resolveMoaCode("triazole") === "FRAC_3", "'triazole' → FRAC_3");
assert(resolveMoaCode("propiconazole") === "FRAC_3", "'propiconazole' → FRAC_3");
assert(resolveMoaCode("mancozeb") === "FRAC_M", "'mancozeb' → FRAC_M");
assert(resolveMoaCode("azoxystrobin") === "FRAC_11", "'azoxystrobin' → FRAC_11");
assert(resolveMoaCode("tricyclazole") === "FRAC_P1", "'tricyclazole' → FRAC_P1");
assert(resolveMoaCode("carbendazim") === "FRAC_1", "'carbendazim' → FRAC_1");
assert(resolveMoaCode("") === null, "empty → null");
assert(resolveMoaCode("unknown stuff") === null, "unknown → null");

// 7. Disease → MoA mapping covers all 14 Phase 1 diseases
const diseases = [
  "rice_blast",
  "bacterial_leaf_blight",
  "sheath_blight",
  "rice_brown_spot",
  "wheat_rust",
  "powdery_mildew",
  "jute_stem_rot",
  "potato_late_blight",
  "tomato_early_blight",
  "chili_anthracnose",
  "mustard_alternaria",
  "onion_purple_blotch",
  "maize_downy_mildew",
  "brinjal_phomopsis",
];
for (const d of diseases) {
  assert(getMoaCodesForDisease(d).length > 0, `${d} has ≥ 1 MoA option`);
}

// 8. recommendNextMoa rotates to an unused group first
const rec1 = recommendNextMoa("rice_blast", []);
assert(rec1 !== null, "recommendNextMoa returns a rec for empty history");
assert(rec1.code === "FRAC_P1", `first rec for rice_blast is FRAC_P1 (got ${rec1.code})`);

// 9. recommendNextMoa skips used groups
const rec2 = recommendNextMoa("rice_blast", ["FRAC_P1"]);
assert(rec2.code === "FRAC_M", `with FRAC_P1 used, next is FRAC_M (got ${rec2.code})`);

// 10. recommendNextMoa falls back to multi-site when all preferred used
const rec3 = recommendNextMoa("sheath_blight", ["FRAC_3", "FRAC_11", "FRAC_M"]);
assert(rec3 !== null, "recommendNextMoa still returns a rec when all preferred used");

// 11. FRAC_4 (phenylamides) requires a mixing partner (FRAC guideline)
assert(getMoaGroup("FRAC_4").mixingPartnerRequired === true, "FRAC_4 requires mixing partner");
assert(getMoaGroup("FRAC_11").mixingPartnerRequired === true, "FRAC_11 requires mixing partner");

console.log(`\nmoaDatabase.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

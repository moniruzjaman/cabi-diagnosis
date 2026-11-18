// Product Validator tests (Phase 4) — a trade name / active ingredient / MoA
// alone must NOT establish registration for the target crop+pest. Missing
// registration data must NOT pass validation.
const { validateProductForTarget } = await import("../productValidator.js");

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FAIL:", msg);
  }
}

// 1. Product registered for the target crop + pest → verified
const ok = validateProductForTarget(
  {
    regNo: "R-123",
    activeIngredient: "Tricyclazole",
    crops: "Rice, Wheat",
    pest: "Rice Blast, Brown Spot",
    moaCode: "FRAC P1",
    dosage: "15 g/10L water",
    phiDays: 14,
    reiHours: 24,
  },
  { crop: "Rice", pest: "Rice Blast" },
);
assert(ok.verified === true, "matching product → verified");
assert(ok.registrationValid === true, "registration identity present");
assert(ok.cropMatch === true, "crop matched");
assert(ok.pestMatch === true, "pest matched");
assert(ok.moaResolved === true, "MoA resolved");
assert(ok.missingData.length === 0, "no missing data");

// 2. Wrong crop → NOT verified (even with valid registration)
const wrongCrop = validateProductForTarget(
  {
    regNo: "R-124",
    activeIngredient: "Mancozeb",
    crops: "Potato, Tomato",
    pest: "Late Blight",
    moaCode: "FRAC M",
  },
  { crop: "Rice", pest: "Late Blight" },
);
assert(wrongCrop.registrationValid === true, "wrongCrop: registration still valid");
assert(wrongCrop.cropMatch === false, "wrongCrop: crop not matched");
assert(wrongCrop.verified === false, "wrong crop → not verified");
assert(wrongCrop.noteBn.includes("নিশ্চিত নয়"), "wrongCrop: Bangla 'not verified' note");
assert(wrongCrop.note.includes("not verified"), "wrongCrop: English 'not verified' note");

// 3. Missing registration data (no regNo / no activeIngredient) → NOT verified
const noReg = validateProductForTarget(
  { regNo: "", activeIngredient: "", crops: "Rice", pest: "Blast", moaCode: "FRAC P1" },
  { crop: "Rice", pest: "Blast" },
);
assert(noReg.registrationValid === false, "missing regNo+AI → registration invalid");
assert(noReg.verified === false, "missing registration → not verified");
assert(noReg.missingData.includes("regNo"), "missingData lists regNo");
assert(noReg.missingData.includes("activeIngredient"), "missingData lists activeIngredient");

// 4. No target supplied → registration-only check (cannot confirm eligibility)
const regOnly = validateProductForTarget({
  regNo: "R-1",
  activeIngredient: "X",
  crops: "",
  pest: "",
  moaCode: "",
});
assert(regOnly.registrationValid === true, "reg identity present");
assert(regOnly.cropMatch === null, "no crop target → null cropMatch");
assert(regOnly.pestMatch === null, "no pest target → null pestMatch");
assert(regOnly.verified === false, "no target → not verified (cannot confirm eligibility)");
assert(regOnly.missingData.includes("moaCode"), "missingData lists moaCode");

// 5. No product at all → not verified
const none = validateProductForTarget(null);
assert(none.verified === false, "null product → not verified");
assert(none.missingData.includes("product"), "missingData lists 'product'");

// 6. Pest target present but missing on product → not verified
const noPestList = validateProductForTarget(
  { regNo: "R-9", activeIngredient: "Copper", crops: "Rice", pest: "", moaCode: "FRAC M" },
  { crop: "Rice", pest: "Blast" },
);
assert(noPestList.pestMatch === false, "pest target but empty pest list → false");
assert(noPestList.verified === false, "missing pest list → not verified");

console.log(`\nproductValidator.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

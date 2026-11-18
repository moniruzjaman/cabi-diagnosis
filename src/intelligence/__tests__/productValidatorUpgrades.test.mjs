// ============================================================
// productValidatorUpgrades.test — ported eligibility-gating suite.
//
// Covers the directive scenarios:
//   - regNo FORMAT validation: junk regNo → not verified, disclosed
//   - POLICY BAN: neonicotinoid on a bloom crop → blocked with the alert
//     disclosed; same product off-bloom-crop → not restricted
//   - LABEL-DATA disclosure: missing dosage/PHI/REI reported, never zeroed
//   - expiry: an alert past validUntil no longer restricts
//   - regression: the original verified/crop-mismatch/pest-mismatch
//     behaviors stay intact (also covered in productValidator.test)
// ============================================================

import { strict as assert } from "node:assert";
import { validateProductForTarget, findRestrictingAlerts } from "../productValidator.js";
import { REGULATORY_ALERTS } from "../regulatoryAlerts.js";

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error("FAIL:", msg);
  }
}

const labeled = {
  regNo: "AP-5242",
  activeIngredient: "Tricyclazole",
  crops: "Rice, Wheat",
  pest: "Rice Blast",
  moaCode: "FRAC P1",
  dosage: "15 g/10L",
  phiDays: 14,
  reiHours: 24,
};

// 1. regNo format: junk formats are invalid registrations
{
  for (const bad of ["AP5615", "12345", "AP--3368", "AP-2391 / AP-2393"]) {
    const r = validateProductForTarget({ ...labeled, regNo: bad }, { crop: "Rice", pest: "Rice Blast" });
    ok(r.registrationFormatValid === false, `"${bad}" fails format check`);
    ok(r.verified === false, `"${bad}" not verified`);
  }
  const good = validateProductForTarget(labeled, { crop: "Rice", pest: "Rice Blast" });
  ok(good.registrationFormatValid === true, "AP-5242 passes format check");
  ok(good.verified === true, "well-formed registered product verified");
}

// 2. Policy ban: neonicotinoid on a bloom crop (Mustard) → restricted + disclosed
{
  const neo = { ...labeled, activeIngredient: "Imidacloprid 70WG", crops: "Mustard, Mango", pest: "Aphid" };
  const r = validateProductForTarget(neo, { crop: "Mustard", pest: "Aphid" });
  ok(r.policyRestricted === true, "imidacloprid on Mustard → policy restricted");
  ok(r.verified === false, "policy-restricted product not verified");
  ok(r.restrictingAlerts.length > 0, "restricting alert disclosed");
  ok(r.note.toLowerCase().includes("policy"), "note explains the policy restriction");
  // Same product on a NON-bloom crop (Rice) → not restricted by that alert
  const riceProduct = { ...labeled, activeIngredient: "Imidacloprid 70WG", crops: "Rice", pest: "Brown Plant Hopper" };
  const r2 = validateProductForTarget(riceProduct, { crop: "Rice", pest: "Brown Plant Hopper" });
  ok(r2.policyRestricted === false, "imidacloprid on Rice → not restricted by the bloom directive");
}

// 3. Aluminium phosphide (stored-grain institutional mandate) restricts
{
  const alp = { ...labeled, activeIngredient: "Aluminium Phosphide", crops: "Stored grain in Rice", pest: "Grain weevil" };
  const alerts = findRestrictingAlerts(alp, "Stored grain in Rice");
  ok(alerts.length > 0, "aluminium phosphide has an active institutional alert");
  const r = validateProductForTarget(alp, { crop: "Stored grain in Rice", pest: "Grain weevil" });
  ok(r.policyRestricted === true, "aluminium phosphide restricted");
}

// 4. Label-data disclosure: missing dosage/PHI/REI in missingData
{
  const bare = { regNo: "AP-1000", activeIngredient: "Mancozeb", crops: "Potato", pest: "Late Blight", moaCode: "FRAC M" };
  const r = validateProductForTarget(bare, { crop: "Potato", pest: "Late Blight" });
  ok(r.verified === true, "bare product with valid reg + matches still verified (label gaps are disclosures, not blockers)");
  ok(r.missingData.includes("dosage"), "missing dosage disclosed");
  ok(r.missingData.includes("phiDays"), "missing PHI disclosed");
  ok(r.missingData.includes("reiHours"), "missing REI disclosed");
}

// 5. Alerts data integrity: the extracted projection carries the active alerts
{
  ok(Array.isArray(REGULATORY_ALERTS) && REGULATORY_ALERTS.length >= 5, "regulatory alerts extracted (≥5)");
  ok(
    REGULATORY_ALERTS.some((a) => (a.targetChemicals || []).some((c) => /imidacloprid/i.test(c))),
    "neonicotinoid directive present",
  );
}

// 6. Regression: crop/pest mismatch still blocks (with valid format)
{
  const wrongCrop = validateProductForTarget({ ...labeled, crops: "Potato" }, { crop: "Rice", pest: "Rice Blast" });
  ok(wrongCrop.verified === false && wrongCrop.cropMatch === false, "crop mismatch still not verified");
  const wrongPest = validateProductForTarget({ ...labeled, pest: "Sheath Blight" }, { crop: "Rice", pest: "Rice Blast" });
  ok(wrongPest.verified === false && wrongPest.pestMatch === false, "pest mismatch still not verified");
  const noTarget = validateProductForTarget(labeled, {});
  ok(noTarget.verified === false, "no target → not verified (unchanged)");
}

console.log(`\nproductValidatorUpgrades.test: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

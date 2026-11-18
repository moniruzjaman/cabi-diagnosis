// End-to-end integration test — proves the Diagnosis → Risk → Protection →
// Ledger → Registry spine works as one system (Phase 9 integration scenarios).
//
// Covers: diagnosis produces a case; unconfirmed diagnosis blocks chemical
// approval (R3); confirmation unlocks it; the 5-gate engine reads the active
// case + risk; recording a treatment updates the ledger with a CANONICAL MoA
// code (R2) so rotation tracking actually sees it; a repeated MoA is blocked
// at gate 3 with a reason; product validation rejects an unregistered-for-target
// product (R4).
const STORE = new Map();
globalThis.localStorage = {
  getItem: (k) => STORE.get(k) ?? null,
  setItem: (k, v) => void STORE.set(k, String(v)),
  removeItem: (k) => void STORE.delete(k),
};

const { createCase, setConfirmationStatus } = await import("../../data/cropHealthCases.js");
const { addTreatment } = await import("../../data/cropHealthCases.js");
const { evaluateProtectionDecision } = await import("../protectionDecisionEngine.js");
const { getTreatmentHistory, wasMoaUsedRecently, getMoaUsageThisSeason } = await import("../treatmentLedger.js");
const { assessMoaRotation } = await import("../moaStewardship.js");
const { getMoaGroup } = await import("../moaDatabase.js");
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

// A high-risk radar stub: disease risk 80 (>= threshold 50) + a suitable spray
// window. (Weather fetch is async/exercised in riskRadar.test.mjs; here we feed
// the engine the radar result the way CropProtectionPanel does in production.)
const highRiskRadar = {
  overallRiskScore: 78,
  diseaseForecast: { diseases: [{ disease: { id: "rice_blast" }, risk: 80 }] },
  operationWindows: { spray: [{ suitable: true, start: "2026-11-19T06:00" }] },
};
const proposed = { moaCode: "FRAC_P1", activeIngredient: "Tricyclazole", productName: "Sivic" };

// ── 1. Diagnosis produces a case with diagnosis evidence. ─────────────────
const { case: c1 } = createCase({
  crop: "Rice",
  district: "Dhaka",
  growthStage: "tillering",
  diagnosisEvidence: {
    diseaseName: "Rice Blast",
    diseaseNameBn: "ধানের ব্লাস্ট",
    confidencePct: 78,
    source: "ai",
    keySymptoms: ["পাতায় মাকু আকৃতির দাগ"],
  },
  initialSeverity: "moderate",
});
assert(c1.diagnosisEvidence && c1.diagnosisEvidence.diseaseName === "Rice Blast", "case carries diagnosis evidence");
assert(c1.confirmationStatus === "unconfirmed", "fresh case is unconfirmed by default");
assert(c1.observations.length >= 1, "baseline observation recorded");

// ── 2. Unconfirmed diagnosis BLOCKS chemical approval at gate 1 (R3). ──────
const blocked = evaluateProtectionDecision({
  caseObj: c1,
  diseaseId: "rice_blast",
  riskRadar: highRiskRadar,
  proposedTreatment: proposed,
});
assert(blocked.approved === false, "unconfirmed → not approved");
assert(blocked.gates[0].id === "diagnosis_confirmed" && blocked.gates[0].passed === false, "gate 1 blocks unconfirmed");
assert(blocked.blockedGateId === "diagnosis_confirmed", "blocked at diagnosis_confirmed");
assert(blocked.blockedReason != null && blocked.blockedReason.length > 0, "blocked gate has a reason");

// ── 3. Confirm the diagnosis → gate 1 now passes. ──────────────────────────
const confirmed = setConfirmationStatus(c1.id, "confirmed");
assert(confirmed && confirmed.confirmationStatus === "confirmed", "confirmationStatus set to confirmed");

// ── 4. With confirmation + high risk + suitable window → APPROVED. ─────────
const approved = evaluateProtectionDecision({
  caseObj: confirmed,
  diseaseId: "rice_blast",
  riskRadar: highRiskRadar,
  proposedTreatment: proposed,
});
assert(approved.approved === true, "confirmed + high risk → approved");
assert(
  approved.gates.every((g) => g.passed),
  "all 5 gates pass",
);
assert(approved.approvedTreatment.moaCode === "FRAC_P1", "approved treatment MoA = FRAC_P1");

// ── 5. Record the approved treatment with the CANONICAL MoA code (R2). ────
addTreatment(confirmed.id, {
  type: "chemical",
  description: "Approved spray",
  productName: "Sivic",
  activeIngredient: "Tricyclazole",
  moaGroup: "FRAC_P1", // canonical — resolveMoaCode resolves it (R2 fix)
  targetDisease: "rice_blast",
});

// ── 6. The ledger loads the treatment + resolves its MoA (R2). ─────────────
const history = getTreatmentHistory(confirmed.id);
assert(history.length === 1, "ledger has 1 treatment");
assert(history[0].moaCode === "FRAC_P1", "treatment MoA resolved canonically (R2: not dropped as '')");
assert(
  getMoaUsageThisSeason(confirmed.id).some((u) => u.code === "FRAC_P1"),
  "MoA usage this season sees FRAC_P1",
);
const grp = getMoaGroup("FRAC_P1");
assert(
  wasMoaUsedRecently(confirmed.id, "FRAC_P1", grp.rotationWindowDays).usedRecently === true,
  "rotation window sees the just-recorded treatment",
);

// ── 7. Re-evaluate protection with the SAME MoA → gate 3 blocks (rotation). ─
const repeat = evaluateProtectionDecision({
  caseObj: confirmed,
  diseaseId: "rice_blast",
  riskRadar: highRiskRadar,
  proposedTreatment: proposed, // same FRAC_P1 again
});
assert(repeat.approved === false, "repeated MoA → not approved");
const moaGate = repeat.gates.find((g) => g.id === "moa_rotation");
assert(moaGate && moaGate.passed === false, "gate 3 (moa_rotation) blocks repeated MoA");
assert(repeat.blockedReason != null && repeat.blockedReason.length > 0, "repeated-MoA block has a reason");

// Stewardship agrees directly.
const rotation = assessMoaRotation(confirmed.id, "FRAC_P1");
assert(rotation.compliant === false, "assessMoaRotation: FRAC_P1 not compliant right after use");
assert(rotation.blockedReason != null, "assessMoaRotation explains the block");

// ── 8. Product validation: a product NOT registered for the target → not verified (R4).
const potatoProduct = {
  regNo: "R-999",
  activeIngredient: "Tricyclazole",
  crops: "Potato, Tomato",
  pest: "Late Blight",
  moaCode: "FRAC P1",
};
const vv = validateProductForTarget(potatoProduct, { crop: "Rice", pest: "Rice Blast" });
assert(vv.registrationValid === true, "potato product has valid registration identity");
assert(vv.cropMatch === false, "potato product not registered for Rice");
assert(vv.verified === false, "unregistered-for-target product → NOT verified (R4)");
assert(vv.noteBn.includes("নিশ্চিত নয়"), "not-verified Bangla note");

// ── 9. A product registered for the target → verified. ─────────────────────
const riceProduct = {
  regNo: "R-123",
  activeIngredient: "Tricyclazole",
  crops: "Rice",
  pest: "Rice Blast",
  moaCode: "FRAC P1",
};
const ok = validateProductForTarget(riceProduct, { crop: "Rice", pest: "Rice Blast" });
assert(ok.verified === true, "registered-for-target product → verified");

console.log(`\nintegrationFlow.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

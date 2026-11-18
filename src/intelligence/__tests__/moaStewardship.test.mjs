// MoA Stewardship tests — asserts rotation-window enforcement, season-cap
// enforcement, resistance-risk scoring, and recommendNextMoa.
// Uses a localStorage mock to seed the case store for treatmentLedger.
const STORE = new Map();
globalThis.localStorage = {
  getItem: (k) => STORE.get(k) ?? null,
  setItem: (k, v) => void STORE.set(k, String(v)),
  removeItem: (k) => void STORE.delete(k),
};

const { saveCases } = await import("../../data/cropHealthCases.js");
const { assessMoaRotation, getResistanceRisk, recommendNextMoa, getAlternativeMoaOptions } =
  await import("../moaStewardship.js");
const { getMoaGroup } = await import("../moaDatabase.js");

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

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// Seed a case with treatment history
function seedCase(id, treatments) {
  saveCases([
    {
      id,
      crop: "rice",
      growthStage: "tillering",
      observations: [],
      treatments,
      monitoring: [],
      evaluation: null,
      riskAssessment: null,
      scoutingAction: null,
      createdAt: daysAgo(60),
      updatedAt: daysAgo(1),
    },
  ]);
}

// 1. Clean case (no treatments) — MoA rotation is compliant
seedCase("case-clean", []);
const clean = assessMoaRotation("case-clean", "FRAC_3");
assert(clean.compliant === true, "clean case → FRAC_3 compliant");
assert(clean.usesThisSeason === 0, "clean case → 0 uses");
assert(clean.daysSinceLast === null, "clean case → daysSince null");

// 2. Same MoA used 5 days ago (within 14-day window) → BLOCKED
seedCase("case-recent", [
  { id: "t1", date: daysAgo(5), type: "chemical", moaGroup: "FRAC 3", productName: "Propiconazole", description: "" },
]);
const recent = assessMoaRotation("case-recent", "FRAC_3");
assert(recent.compliant === false, "FRAC_3 used 5d ago → blocked (rotation window 14d)");
assert(recent.rotationWindowOk === false, "rotationWindowOk false");
assert(recent.daysSinceLast === 5, "daysSinceLast = 5");
assert(recent.blockedReason != null, "blockedReason set");

// 3. Same MoA used 20 days ago (outside 14-day window) → compliant
seedCase("case-old", [{ id: "t1", date: daysAgo(20), type: "chemical", moaGroup: "FRAC 3", description: "" }]);
const old = assessMoaRotation("case-old", "FRAC_3");
assert(old.compliant === true, "FRAC_3 used 20d ago → compliant (outside 14d window)");
assert(old.rotationWindowOk === true, "rotationWindowOk true");

// 4. Season cap: FRAC_11 max 2/season — 3rd use blocked
seedCase("case-cap", [
  { id: "t1", date: daysAgo(40), type: "chemical", moaGroup: "FRAC 11", description: "" },
  { id: "t2", date: daysAgo(25), type: "chemical", moaGroup: "azoxystrobin", description: "" },
]);
const cap = assessMoaRotation("case-cap", "FRAC_11");
assert(cap.usesThisSeason === 2, "2 uses this season");
assert(cap.compliant === false, "3rd FRAC_11 use blocked by season cap");
assert(cap.seasonCapOk === false, "seasonCapOk false");
assert(cap.maxApps === 2, "maxApps = 2 for FRAC_11");

// 5. Unknown MoA code → blocked with clear reason
const unknown = assessMoaRotation("case-clean", "NONEXISTENT");
assert(unknown.compliant === false, "unknown MoA code → blocked");
assert(unknown.blockedReason != null, "unknown MoA → blockedReason set");

// 6. Resistance risk: clean case → low
const riskClean = getResistanceRisk("case-clean");
assert(riskClean.level === "low", "clean case → low resistance risk");
assert(riskClean.score === 0, "clean case → risk score 0");

// 7. Resistance risk: high-risk group used 2x → high
seedCase("case-highrisk", [
  { id: "t1", date: daysAgo(30), type: "chemical", moaGroup: "FRAC 11", description: "" },
  { id: "t2", date: daysAgo(15), type: "chemical", moaGroup: "strobilurin", description: "" },
]);
const riskHigh = getResistanceRisk("case-highrisk");
assert(riskHigh.level === "high", "FRAC_11 used 2x → high resistance risk");
assert(riskHigh.score >= 40, `high-risk score ≥ 40 (got ${riskHigh.score})`);
assert(riskHigh.findings.length > 0, "findings populated");

// 8. Resistance risk: no multi-site partner → penalty
seedCase("case-nomultisite", [{ id: "t1", date: daysAgo(10), type: "chemical", moaGroup: "FRAC 3", description: "" }]);
const riskNoMulti = getResistanceRisk("case-nomultisite");
assert(
  riskNoMulti.findings.some((f) => f.includes("মাল্টি-সাইট")),
  "no multi-site → finding flagged",
);
assert(riskNoMulti.score >= 15, "no multi-site → score penalty (≥15)");

// 9. recommendNextMoa with history skips used groups
const rec = recommendNextMoa("case-old", "rice_blast");
assert(rec !== null, "recommendNextMoa returns a rec");
assert(rec.code === "FRAC_P1", `rice_blast with FRAC_3 used → recommends FRAC_P1 (got ${rec.code})`);
// FRAC_P1 hasn't been used on case-old, so it should be rotation-compliant
assert(rec.rotationCompliant === true, "recommended MoA is rotation-compliant");

// 10. getAlternativeMoaOptions lists disease-preferred groups with compliance status
const alts = getAlternativeMoaOptions("case-cap", "sheath_blight");
assert(alts.length > 0, "alternative options populated");
assert(
  alts.every((a) => typeof a.compliant === "boolean"),
  "every alt has compliant flag",
);

// 11. modelLimitations always present
assert(riskClean.modelLimitations.length > 0, "resistance risk has modelLimitations");

// 12. REGRESSION (PR #66 review): a treatment recorded with the CANONICAL
//     code (e.g. "IRAC_4A", as the panel writes via
//     approvedTreatment.moaCode) must count toward rotation checks. Before
//     the fix, resolveMoaCode("IRAC_4A") → null, the ledger dropped the
//     MoA, and assessMoaRotation wrongly reported a clean history.
seedCase("case-canonical", [
  { id: "tc1", date: daysAgo(5), type: "chemical", moaGroup: "IRAC_4A", productName: "Imidacloprid", description: "" },
]);
const canon = assessMoaRotation("case-canonical", "IRAC_4A");
assert(canon.usesThisSeason === 1, `canonical-code treatment counts (usesThisSeason=${canon.usesThisSeason})`);
assert(canon.compliant === false, "canonical-code treatment within rotation window → blocked");
assert(canon.rotationWindowOk === false, "rotationWindowOk false for canonical-code history");
// And a DIFFERENT group stays compliant (the history is seen, not ignored wholesale)
const canonOther = assessMoaRotation("case-canonical", "IRAC_28");
assert(canonOther.compliant === true, "different group unaffected → compliant");

console.log(`\nmoaStewardship.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

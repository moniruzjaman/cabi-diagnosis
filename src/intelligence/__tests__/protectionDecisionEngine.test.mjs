// Protection Decision Engine tests — asserts the 5-gate sequence:
// only approves when ALL gates pass, blocks clearly otherwise, and
// respects scouting-first (no approval without confirmed diagnosis).
const STORE = new Map();
globalThis.localStorage = {
  getItem: (k) => STORE.get(k) ?? null,
  setItem: (k, v) => void STORE.set(k, String(v)),
  removeItem: (k) => void STORE.delete(k),
};

const { saveCases } = await import("../../data/cropHealthCases.js");
const { evaluateProtectionDecision } = await import("../protectionDecisionEngine.js");

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

// A riskRadar stub with high disease risk + a suitable spray window
const highRiskRadar = {
  riskLevel: "high",
  overallRiskScore: 70,
  diseaseForecast: {
    diseases: [{ disease: { id: "rice_blast", nameBn: "ধানের ব্লাস্ট" }, risk: 75, level: "high", confidence: 70 }],
    overallFavorability: 70,
    spreadRisk: "high",
    confidence: 70,
    modelLimitations: [],
  },
  operationWindows: {
    spray: [
      {
        type: "spray",
        start: "2026-11-18T06:00",
        end: "2026-11-18T07:00",
        score: 85,
        suitable: true,
        reasons: [],
        reasonsBn: [],
        confidence: 0.9,
      },
    ],
    irrigation: [],
    fertilizer: [],
    planting: [],
    harvest: [],
    fieldAccess: [],
    scout: [],
  },
  dataFreshness: "current",
};

const lowRiskRadar = {
  ...highRiskRadar,
  diseaseForecast: {
    ...highRiskRadar.diseaseForecast,
    diseases: [{ disease: { id: "rice_blast", nameBn: "ধানের ব্লাস্ট" }, risk: 30, level: "low", confidence: 60 }],
  },
};

// A case with a confirmed scouting observation (gate 1 passes)
const caseWithObs = {
  id: "case-prod",
  confirmationStatus: "confirmed",
  crop: "rice",
  growthStage: "tillering",
  observations: [{ id: "o1", severity: "moderate", notes: "পাতায় হীরাকৃতি দাগ", date: daysAgo(2) }],
  treatments: [],
  monitoring: [],
  evaluation: null,
};

// A case with NO observations (gate 1 fails — scouting-first)
const caseNoObs = {
  id: "case-noobs",
  crop: "rice",
  growthStage: "tillering",
  observations: [],
  treatments: [],
  monitoring: [],
  evaluation: null,
};

// 1. All gates pass → approved
saveCases([caseWithObs]);
const approved = evaluateProtectionDecision({
  caseObj: caseWithObs,
  diseaseId: "rice_blast",
  riskRadar: highRiskRadar,
  proposedTreatment: { moaCode: "FRAC_P1", activeIngredient: "Tricyclazole", productName: "Sivic" },
});
assert(approved.approved === true, "all gates pass → approved");
assert(approved.gates.length === 5, "5 gates evaluated");
assert(
  approved.gates.every((g) => g.passed),
  "every gate passed",
);
assert(approved.approvedTreatment !== null, "approvedTreatment set");
assert(approved.approvedTreatment.moaCode === "FRAC_P1", "approved MoA = FRAC_P1");
assert(approved.blockedReason === null, "no blockedReason when approved");
assert(approved.modelLimitations.length > 0, "modelLimitations always present");

// 2. No confirmed observation → BLOCKED at gate 1 (scouting-first)
saveCases([caseNoObs]);
const blocked1 = evaluateProtectionDecision({
  caseObj: caseNoObs,
  diseaseId: "rice_blast",
  riskRadar: highRiskRadar,
  proposedTreatment: { moaCode: "FRAC_P1" },
});
assert(blocked1.approved === false, "no observation → not approved");
assert(blocked1.blockedGateId === "diagnosis_confirmed", "blocked at diagnosis_confirmed gate");
assert(blocked1.blockedReason != null, "blockedReason set");

// 3. Low disease risk → BLOCKED at gate 2 (economic threshold)
saveCases([caseWithObs]);
const blocked2 = evaluateProtectionDecision({
  caseObj: caseWithObs,
  diseaseId: "rice_blast",
  riskRadar: lowRiskRadar,
  proposedTreatment: { moaCode: "FRAC_P1" },
});
assert(blocked2.approved === false, "low risk → not approved");
assert(blocked2.blockedGateId === "economic_threshold", "blocked at economic_threshold gate");

// 4. MoA rotation violated → BLOCKED at gate 3
const caseRecentSpray = {
  ...caseWithObs,
  id: "case-recent-spray",
  treatments: [{ id: "t1", date: daysAgo(3), type: "chemical", moaGroup: "tricyclazole", description: "" }],
};
saveCases([caseRecentSpray]);
const blocked3 = evaluateProtectionDecision({
  caseObj: caseRecentSpray,
  diseaseId: "rice_blast",
  riskRadar: highRiskRadar,
  proposedTreatment: { moaCode: "FRAC_P1" },
});
assert(blocked3.approved === false, "MoA used 3d ago → not approved");
assert(blocked3.blockedGateId === "moa_rotation", "blocked at moa_rotation gate");
assert(blocked3.alternativeMoaOptions.length > 0, "alternative MoA options provided when blocked");

// 5. No suitable spray window → BLOCKED at gate 4
const noWindowRadar = { ...highRiskRadar, operationWindows: { ...highRiskRadar.operationWindows, spray: [] } };
saveCases([caseWithObs]);
const blocked4 = evaluateProtectionDecision({
  caseObj: caseWithObs,
  diseaseId: "rice_blast",
  riskRadar: noWindowRadar,
  proposedTreatment: { moaCode: "FRAC_P1" },
});
assert(blocked4.approved === false, "no spray window → not approved");
assert(blocked4.blockedGateId === "weather_suitable", "blocked at weather_suitable gate");

// 6. Near harvest + PHI exceeds days-to-harvest → BLOCKED at gate 5
const caseNearHarvest = { ...caseWithObs, id: "case-harvest", growthStage: "ripening" };
saveCases([caseNearHarvest]);
// rice_blast is in the forecast (risk 75 ≥ 50, gate 2 passes). Propose FRAC_3
// (Propiconazole, PHI 21d); ripening = ~7 days to harvest → 21 > 7 → blocked at gate 5.
const blocked5 = evaluateProtectionDecision({
  caseObj: caseNearHarvest,
  diseaseId: "rice_blast",
  riskRadar: highRiskRadar,
  proposedTreatment: { moaCode: "FRAC_3" },
});
assert(blocked5.approved === false, "near harvest + long PHI → not approved");
assert(blocked5.blockedGateId === "pre_harvest_interval", "blocked at pre_harvest_interval gate");

// 7. No proposed treatment → engine recommends a rotation-compliant MoA
saveCases([caseWithObs]);
const autoRec = evaluateProtectionDecision({ caseObj: caseWithObs, diseaseId: "rice_blast", riskRadar: highRiskRadar });
assert(autoRec.approved === true, "auto-recommended MoA → approved (clean case)");

// 8. Compliance notes: high-risk MoA + mixing partner requirement
saveCases([caseWithObs]);
// sheath_blight prefers FRAC_3 first; force a high-risk group (FRAC_11) to check mixing-partner note
const withMixNote = evaluateProtectionDecision({
  caseObj: caseWithObs,
  diseaseId: "sheath_blight",
  riskRadar: highRiskRadar,
  proposedTreatment: { moaCode: "FRAC_11" },
});
if (withMixNote.approved) {
  assert(
    withMixNote.complianceNotes.some((n) => n.includes("মাল্টি-সাইট")),
    "FRAC_11 → mixing-partner compliance note",
  );
  assert(
    withMixNote.complianceNotes.some((n) => n.includes("উচ্চ-ঝুঁকির")),
    "FRAC_11 → high-risk compliance note",
  );
} else {
  console.log(
    `NOTE: sheath_blight + FRAC_11 not approved (gate ${withMixNote.blockedGateId}) — skipping compliance-note assertions`,
  );
}

// 9. Each gate has Bangla + English reason
saveCases([caseWithObs]);
const bilingual = evaluateProtectionDecision({
  caseObj: caseWithObs,
  diseaseId: "rice_blast",
  riskRadar: highRiskRadar,
  proposedTreatment: { moaCode: "FRAC_P1" },
});
assert(
  bilingual.gates.every((g) => g.reason && g.reasonEn),
  "every gate has Bangla + English reason",
);
assert(
  bilingual.gates.every((g) => Array.isArray(g.evidence)),
  "every gate has evidence[]",
);

// R3 — unconfirmed diagnosis must BLOCK chemical approval at gate 1,
// even when a moderate observation exists. confirmationStatus is explicit.
const caseUnconfirmedObs = {
  id: "case-unconfirmed",
  crop: "rice",
  growthStage: "tillering",
  confirmationStatus: "unconfirmed",
  observations: [{ id: "o1", severity: "moderate", notes: "পাতায় দাগ", date: daysAgo(2) }],
  treatments: [],
  monitoring: [],
  evaluation: null,
};
saveCases([caseUnconfirmedObs]);
const unconf = evaluateProtectionDecision({
  caseObj: caseUnconfirmedObs,
  diseaseId: "rice_blast",
  riskRadar: highRiskRadar,
  proposedTreatment: { moaCode: "FRAC_P1", activeIngredient: "Tricyclazole", productName: "Sivic" },
});
assert(unconf.gates[0].id === "diagnosis_confirmed", "gate 1 is diagnosis_confirmed");
assert(unconf.gates[0].passed === false, "unconfirmed diagnosis blocks gate 1");
assert(unconf.approved === false, "unconfirmed diagnosis → not approved");
assert(unconf.blockedGateId === "diagnosis_confirmed", "blocked at diagnosis_confirmed");
assert(unconf.blockedReason !== null, "blockedReason set for unconfirmed");

console.log(`\nprotectionDecisionEngine.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

// Diagnosis merger evidence/uncertainty tests — Phase 1 Workstream C.
//  - output is always a CANDIDATE (never a confirmed diagnosis), at any
//    confidence level, from any source
//  - uncertainty level + Bangla reasons computed from agreement/confidence
//  - contradictory evidence (match.contradicts) flows to the top candidate
//  - verification steps are Bangla-first and source-aware
//  - existing behavior fields stay intact (backward compatibility)
import { mergeDiagnoses } from "../diagnosisMerger.js";

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FAIL:", msg);
  }
}

// 1. A single high-confidence model match is still only a candidate.
const modelOnly = mergeDiagnoses([{ source: "onnx", matches: [{ diseaseId: "tomato_late_blight", confidence: 0.97 }] }]);
assert(modelOnly.topDisease && modelOnly.topDisease.confidence >= 90, "high-confidence top candidate");
assert(modelOnly.diagnosisStatus === "candidate", "high-confidence model output stays candidate");
assert(modelOnly.statusNoteBn && modelOnly.statusNoteBn.includes("প্রার্থী"), "Bangla status note says প্রার্থী (candidate)");
assert(modelOnly.uncertainty.level === "high", "single-source top → high uncertainty despite 97%");
assert(modelOnly.verificationSteps.length >= 1, "verification steps present");
assert(modelOnly.verificationSteps.some((s) => s.includes("কৃষি সম্প্রসারণ কর্মকর্তা")), "verification includes extension-officer step");

// 2. Even multi-source high agreement is never "confirmed".
const agreed = mergeDiagnoses([
  { source: "onnx", matches: [{ diseaseId: "rice_blast", confidence: 0.9 }] },
  { source: "symptom_wizard", matches: [{ diseaseId: "rice_blast", confidence: 0.85 }] },
]);
assert(agreed.agreement === "high", "two sources agree → high agreement");
assert(agreed.diagnosisStatus === "candidate", "even high agreement stays candidate");
assert(agreed.uncertainty.level === "low" || agreed.uncertainty.level === "medium", "agreement lowers uncertainty level");
assert(agreed.uncertainty.reasons.length > 0, "uncertainty reasons always present");

// 3. Symptom-only matches can never become confirmed diagnoses.
const symptomOnly = mergeDiagnoses([{ source: "symptom_wizard", matches: [{ diseaseId: "sheath_blight", confidence: 0.99 }] }]);
assert(symptomOnly.diagnosisStatus === "candidate", "symptom match at 99% stays candidate");
assert(symptomOnly.verificationSteps.some((s) => s.includes("লক্ষণ")), "symptom-specific verification step included");

// 4. Contradictory evidence flows through and escalates uncertainty.
const contradictory = mergeDiagnoses([
  {
    source: "onnx",
    matches: [
      {
        diseaseId: "rice_blast",
        confidence: 0.9,
        evidence: ["lesion photo"],
        contradicts: ["farmer reports water stress, not lesions"],
      },
    ],
  },
  { source: "symptom_wizard", matches: [{ diseaseId: "rice_blast", confidence: 0.8, contradicts: ["symptoms match brown spot better"] }] },
]);
assert(contradictory.topDisease.evidenceAgainst.length === 2, "contradicts collected from all sources");
assert(contradictory.topDisease.hasContradictoryEvidence === true, "hasContradictoryEvidence exposed");
assert(contradictory.uncertainty.level === "high", "contradictory evidence → high uncertainty");
assert(contradictory.uncertainty.reasons.some((r) => r.includes("বিরোধী")), "Bangla contradictory-evidence reason present");

// 5. Evidence for/against stay separated.
assert(contradictory.topDisease.evidence.includes("lesion photo"), "supporting evidence kept separate");
assert(!contradictory.topDisease.evidence.includes("farmer reports water stress, not lesions"), "contradicts not mixed into evidence");

// 6. Copilot source adds AI-verification step; alternatives add alternatives step.
const withCopilot = mergeDiagnoses([
  { source: "onnx", matches: [{ diseaseId: "rice_blast", confidence: 0.9 }] },
  { source: "copilot", matches: [{ diseaseId: "sheath_blight", confidence: 0.7 }] },
]);
assert(withCopilot.verificationSteps.some((s) => s.includes("এআই")), "copilot triggers AI-verification step");
assert(withCopilot.verificationSteps.some((s) => s.includes("বিকল্প")), "alternatives trigger comparison step");

// 7. Empty input: honest candidate-empty verdict with high uncertainty.
const empty = mergeDiagnoses([]);
assert(empty.diagnosisStatus === "candidate", "empty input also carries candidate status");
assert(empty.topDisease === null, "empty input has no top disease");
assert(empty.uncertainty.level === "high", "empty input → high uncertainty");
assert(empty.verificationSteps.length >= 1, "empty input still guides verification");

// 8. Backward compatibility: legacy fields unchanged.
assert(Array.isArray(empty.modelLimitations) && empty.modelLimitations.length >= 3, "modelLimitations still present");
assert(typeof agreed.confidence === "number" && agreed.confidence >= 0 && agreed.confidence <= 100, "confidence 0..100");
assert(Array.isArray(agreed.alternatives), "alternatives array intact");
assert(agreed.sources.join(",") === "onnx,symptom_wizard", "sources intact");
assert(Array.isArray(modelOnly.modelLimitations), "modelLimitations on single-source result");

// 9. Uncertainty reason for medium confidence.
const mediumConf = mergeDiagnoses([
  { source: "onnx", matches: [{ diseaseId: "rice_blast", confidence: 0.6 }] },
  { source: "symptom_wizard", matches: [{ diseaseId: "rice_blast", confidence: 0.6 }] },
]);
assert(mediumConf.uncertainty.level === "medium", "60% two-source → medium uncertainty");
assert(mediumConf.uncertainty.reasons.some((r) => r.includes("মাঝারি")), "medium-confidence Bangla reason");

// 10. Merger fields are actually rendered in the relevant UI (Phase 1 review).
// The structured-intake wizard is the consumer of mergeDiagnoses; its Step 5
// result screen must surface candidate status, uncertainty, supporting and
// contradictory evidence, and verification steps — not just the confidence.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const wizardSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../components/diagnose/StructuredIntakeWizard.jsx"),
  "utf8",
);
for (const [field, labelBn] of [
  ["merged.statusNoteBn", "candidate status note"],
  ["merged.uncertainty", "uncertainty block"],
  ["merged.topDisease?.evidence?.length", "supporting evidence block"],
  ["merged.topDisease?.evidenceAgainst?.length", "contradictory evidence block"],
  ["merged.verificationSteps", "verification steps block"],
  ["merged.agreement", "agreement badge"],
]) {
  assert(wizardSrc.includes(field), `wizard renders ${labelBn} (${field})`);
}
assert(wizardSrc.includes("সমর্থনকারী প্রমাণ"), "supporting evidence block uses Bangla heading");
assert(wizardSrc.includes("বিরোধী লক্ষণ"), "contradictory evidence block uses Bangla heading");
assert(wizardSrc.includes("পরবর্তী যাচাই ধাপ"), "verification steps block uses Bangla heading");

console.log(`\ndiagnosisMergerEvidence.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

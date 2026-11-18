// Diagnosis Merger tests (Phase 5) — asserts:
//  - two sources agreeing on the top disease → high agreement + combined confidence
//  - sources disagreeing → low agreement
//  - dedup by diseaseId across sources
//  - single source works (low/medium agreement depending on spread)
//  - empty / malformed sources handled (honest "unknown" verdict)
//  - modelLimitations always present
//  - source weights applied (onnx 0.5 > symptom_wizard 0.3 > copilot 0.2)
import { mergeDiagnoses, SOURCE_WEIGHTS } from "../diagnosisMerger.js";

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

// 1. Two sources agree on the top disease → HIGH agreement.
const agreeing = mergeDiagnoses([
  { source: "onnx", matches: [{ diseaseId: "rice_blast", confidence: 0.9, evidence: ["leaf photo"] }] },
  { source: "symptom_wizard", matches: [{ diseaseId: "rice_blast", confidence: 0.8 }] },
]);
assert(agreeing.topDisease?.diseaseId === "rice_blast", "agreeing sources → top = rice_blast");
assert(agreeing.agreement === "high", `two sources agree → agreement HIGH (got ${agreeing.agreement})`);
assert(agreeing.sources.length === 2, "both sources recorded");

// 2. Combined confidence is a weighted average (onnx 0.5*90 + sw 0.3*80)/(0.5+0.3) = (45+24)/0.8 = 86.25 → 86
const expectedConf = Math.round((0.5 * 90 + 0.3 * 80) / (0.5 + 0.3));
assert(
  agreeing.confidence === expectedConf,
  `combined confidence = weighted avg (got ${agreeing.confidence}, expected ${expectedConf})`,
);

// 3. Sources disagree on the top disease → LOW agreement.
const disagreeing = mergeDiagnoses([
  { source: "onnx", matches: [{ diseaseId: "rice_blast", confidence: 0.85 }] },
  { source: "copilot", matches: [{ diseaseId: "sheath_blight", confidence: 0.7 }] },
]);
assert(disagreeing.topDisease?.diseaseId === "rice_blast", "disagreeing → higher-weight onnx wins top");
assert(disagreeing.agreement === "low", `disagreeing top picks → LOW (got ${disagreeing.agreement})`);
assert(disagreeing.alternatives.length === 1, "disagreeing → other disease is an alternative");

// 4. Dedup by diseaseId: same disease from two sources is one candidate.
const deduped = mergeDiagnoses([
  { source: "onnx", matches: [{ diseaseId: "rice_blast", confidence: 0.9 }] },
  { source: "symptom_wizard", matches: [{ diseaseId: "rice_blast", confidence: 0.6 }] },
]);
assert(deduped.alternatives.length === 0, "dedup: single diseaseId → no alternatives");
assert(deduped.topDisease.sources.length === 2, "dedup: top disease lists both sources");

// 5. Three sources, two agree on top → HIGH; the outlier is an alternative.
const threeWay = mergeDiagnoses([
  { source: "onnx", matches: [{ diseaseId: "potato_late_blight", confidence: 0.88 }] },
  { source: "symptom_wizard", matches: [{ diseaseId: "potato_late_blight", confidence: 0.75 }] },
  { source: "copilot", matches: [{ diseaseId: "tomato_early_blight", confidence: 0.6 }] },
]);
assert(threeWay.agreement === "high", "3 sources, 2 agree on top → HIGH");
assert(threeWay.topDisease.diseaseId === "potato_late_blight", "3-way → agreed disease wins");
assert(
  threeWay.alternatives.some((a) => a.diseaseId === "tomato_early_blight"),
  "3-way → outlier is an alternative",
);

// 6. Single source → LOW agreement (only one source's top pick).
const single = mergeDiagnoses([{ source: "onnx", matches: [{ diseaseId: "rice_blast", confidence: 0.9 }] }]);
assert(single.agreement === "low", "single source → LOW agreement");
assert(single.topDisease.diseaseId === "rice_blast", "single source → its top wins");
assert(single.sources.length === 1, "single source recorded");

// 7. Empty sources → honest "unknown" (no top disease, confidence 0).
const empty = mergeDiagnoses([]);
assert(empty.topDisease === null, "empty sources → no top disease");
assert(empty.confidence === 0, "empty sources → confidence 0");
assert(empty.agreement === "low", "empty sources → low agreement");

// 8. Sources with empty matches arrays → treated as no input.
const noMatches = mergeDiagnoses([{ source: "onnx", matches: [] }]);
assert(noMatches.topDisease === null, "empty matches → no top disease");

// 9. modelLimitations always present (even on empty).
assert(empty.modelLimitations.length >= 2, "modelLimitations present on empty result");
assert(
  agreeing.modelLimitations.some((m) => m.includes("weighted heuristic")),
  "merger limitation notes weighted heuristic",
);
assert(
  agreeing.modelLimitations.some((m) => m.includes("author-chosen")),
  "merger limitation notes author-chosen weights",
);

// 10. Source weights are the documented defaults.
assert(SOURCE_WEIGHTS.onnx === 0.5, "onnx weight = 0.5");
assert(SOURCE_WEIGHTS.symptom_wizard === 0.3, "symptom_wizard weight = 0.3");
assert(SOURCE_WEIGHTS.copilot === 0.2, "copilot weight = 0.2");

// 11. Confidence clamps: out-of-range confidence values don't break the merge.
const clamped = mergeDiagnoses([
  { source: "onnx", matches: [{ diseaseId: "rice_blast", confidence: 5 }] }, // >1
  { source: "symptom_wizard", matches: [{ diseaseId: "rice_blast", confidence: -1 }] }, // <0
]);
assert(clamped.topDisease.diseaseId === "rice_blast", "out-of-range confidence still merges");
assert(clamped.confidence >= 0 && clamped.confidence <= 100, "merged confidence within 0..100");

// 12. Evidence is collected + deduplicated across sources.
const withEvidence = mergeDiagnoses([
  { source: "onnx", matches: [{ diseaseId: "rice_blast", confidence: 0.8, evidence: ["leaf lesion", "leaf lesion"] }] },
  { source: "symptom_wizard", matches: [{ diseaseId: "rice_blast", confidence: 0.7, evidence: ["leaf lesion"] }] },
]);
assert(
  withEvidence.topDisease.evidence.length === 1,
  `evidence deduplicated (got ${withEvidence.topDisease.evidence.length})`,
);

// 13. Unknown source id is ignored (weight 0) — does not skew the merge.
const unknownSrc = mergeDiagnoses([
  { source: "onnx", matches: [{ diseaseId: "rice_blast", confidence: 0.9 }] },
  { source: "unknown_source", matches: [{ diseaseId: "sheath_blight", confidence: 1.0 }] },
]);
assert(unknownSrc.topDisease.diseaseId === "rice_blast", "unknown source (weight 0) ignored — onnx wins");

console.log(`\ndiagnosisMerger.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

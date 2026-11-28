// Structured Intake Wizard — navigation, inline validation, and no-photo flow.
// Acceptance review F4 / A6 items 1, 2, 4:
//   1. Back/forward navigation preserves selections; validation blocks advance.
//   2. Inline STEP_ERROR_BN flow fires on missing required inputs.
//   4. A symptom-only (no photo) diagnosis produces a complete result shape.
// Exercises the pure wizardLogic helpers (the same functions the .jsx uses).
import {
  CROPS,
  PARTS,
  SYMPTOM_TYPES,
  STEP_REQUIRED,
  STEP_ERROR_BN,
  canAdvance,
  nextNav,
  backNav,
  completeAnalysis,
  diagnose,
  cropLabelBn,
} from "../../components/diagnose/wizardLogic.js";

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FAIL:", msg);
  }
}

// ── A6.2: inline validation blocks advance on missing required inputs. ─────
// Step 1 with no crop → blocked, showError set, stays on step 1.
let s = { step: 1, cropId: null, partId: null, symptomTypeId: null, showError: false };
let n = nextNav(s);
assert(n.step === 1 && n.showError === true, "step 1 without crop blocks + shows error");
assert(STEP_ERROR_BN[1] && STEP_ERROR_BN[1].includes("ফসল"), "step 1 error copy present");

// Step 2 without part → blocked.
s = { step: 2, cropId: "rice", partId: null, symptomTypeId: null, showError: false };
n = nextNav(s);
assert(n.step === 2 && n.showError === true, "step 2 without part blocks + shows error");
assert(STEP_ERROR_BN[2] && STEP_ERROR_BN[2].includes("অংশ"), "step 2 error copy present");

// Step 3 without symptom → blocked.
s = { step: 3, cropId: "rice", partId: "leaf", symptomTypeId: null, showError: false };
n = nextNav(s);
assert(n.step === 3 && n.showError === true, "step 3 without symptom blocks + shows error");
assert(STEP_ERROR_BN[3] && STEP_ERROR_BN[3].includes("লক্ষণ"), "step 3 error copy present");

// canAdvance mirrors the gating.
assert(canAdvance(1, {}) === false, "canAdvance step1 false without crop");
assert(canAdvance(1, { cropId: "rice" }) === true, "canAdvance step1 true with crop");
assert(canAdvance(4, {}) === true, "photo step is always optional (canAdvance true)");

// ── A6.1: forward navigation advances and preserves earlier selections. ───
s = { step: 1, cropId: null, partId: null, symptomTypeId: null, showError: false };
s = nextNav({ ...s, cropId: "rice" }); // select crop, advance
assert(s.step === 2 && s.cropId === "rice" && s.showError === false, "step 1→2 keeps crop, clears error");
s = nextNav({ ...s, partId: "leaf" });
assert(s.step === 3 && s.cropId === "rice" && s.partId === "leaf", "step 2→3 keeps crop + part");
s = nextNav({ ...s, symptomTypeId: "spots" });
assert(
  s.step === 4 && s.cropId === "rice" && s.partId === "leaf" && s.symptomTypeId === "spots",
  "step 3→4 keeps all selections",
);

// Step 4 (photo optional) → transitions to pendingAnalysis (no required input).
assert(STEP_REQUIRED[3] === false, "photo step is not required");
n = nextNav(s);
assert(n.pendingAnalysis === true && n.step === 4, "step 4 next → pendingAnalysis (photo optional)");
n = completeAnalysis(n);
assert(n.step === 5 && n.pendingAnalysis === false, "completeAnalysis → step 5 result");

// ── A6.1: back navigation preserves selections and clears errors. ─────────
let back = backNav({ step: 4, cropId: "rice", partId: "leaf", symptomTypeId: "spots", showError: true });
assert(back.step === 3 && back.showError === false, "back 4→3 clears error");
assert(
  back.cropId === "rice" && back.partId === "leaf" && back.symptomTypeId === "spots",
  "back preserves all selections",
);
// Step 4 → 2 directly (the review's example) still preserves selections.
back = backNav(backNav({ step: 4, cropId: "rice", partId: "leaf", symptomTypeId: "spots", showError: false }));
assert(back.step === 2 && back.cropId === "rice" && back.symptomTypeId === "spots", "back 4→2 preserves selections");
// Back at step 1 is a floor (no negative step).
back = backNav({ step: 1, cropId: "rice", showError: true });
assert(back.step === 1 && back.showError === false, "back at step 1 stays at 1, clears error");

// ── A6.4: no-photo (symptom-only) diagnosis produces a full result shape. ──
// The wizard runs diagnose() after the optional photo step; with no photo the
// result must still be complete (top + alternatives + merged + evidence).
const result = diagnose({ cropId: "rice", partId: "leaf", symptomTypeId: "spots" });
assert(!!result, "no-photo diagnosis returns a result");
assert(!!result.merged, "result carries merged diagnosis");
assert(!!result.top, "result has a top disease (symptom-only is sufficient)");
assert(typeof result.candidatesCount === "number" && result.candidatesCount > 0, "result has candidate count");
assert(Array.isArray(result.alternatives), "result has an alternatives array");
assert(result.merged.diagnosisStatus === "candidate", "no-photo result is a candidate (never a confirmed disease)");
assert(Array.isArray(result.merged.modelLimitations), "result carries modelLimitations");
// Evidence is present for the top disease (rendered in Step 5).
const topEvidence = result.merged.topDisease?.evidence;
assert(Array.isArray(topEvidence) && topEvidence.length > 0, "top disease carries supporting evidence");

// not_sure symptom still yields a (low-confidence) candidate, never empty.
const unsure = diagnose({ cropId: "tomato", partId: "leaf", symptomTypeId: "not_sure" });
assert(!!unsure.top, "not_sure symptom still produces a top candidate");

// Every structured crop id is a real crop offered in Step 1.
const cropIds = new Set(CROPS.map((c) => c.id));
for (const id of ["rice", "potato", "tomato", "brinjal", "chili", "mustard", "jute", "wheat", "onion", "maize"]) {
  assert(cropIds.has(id), `structured crop offered: ${id}`);
}
assert(PARTS.length === 5 && SYMPTOM_TYPES.length === 8, "5 parts + 8 symptom types present");
assert(cropLabelBn("rice") === "ধান", "cropLabelBn maps id → Bangla label");

console.log(`\nwizardNavigation.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

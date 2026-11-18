// Validation API tests (Phase 4) — request/approve/reject lifecycle,
// advisory role check, and pending-task filtering. Mocks localStorage
// with a Map; no React, no network.
const STORE = new Map();
globalThis.localStorage = {
  getItem: (k) => STORE.get(k) ?? null,
  setItem: (k, v) => void STORE.set(k, String(v)),
  removeItem: (k) => void STORE.delete(k),
};

const { saveCases, createCase, getCaseById } = await import("../../data/cropHealthCases.js");
const {
  requestValidation,
  approveValidation,
  rejectValidation,
  getValidationStatus,
  getPendingValidations,
  getValidationTask,
  modelLimitations,
} = await import("../validationApi.js");
const { setOfficerProfile, clearOfficerProfile } = await import("../officerProfile.js");

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

// Start clean + make sure we are an officer for the happy-path tests.
STORE.clear();
setOfficerProfile({ nameBn: "অফিসার এক", upazila: "সাভার", role: "officer" });

// 1. requestValidation creates a pending task with id + caseId
const { case: caseA } = createCase({ crop: "ধান", upazila: "সাভার", district: "ঢাকা" });
const taskA = requestValidation(caseA.id);
assert(taskA && typeof taskA.id === "string", "requestValidation returns a task with an id");
assert(taskA.status === "pending", "new task status is pending");
assert(taskA.caseId === caseA.id, "task.caseId matches");

// 2. requestValidation writes case.verification (pending + taskId)
const verA = getValidationStatus(caseA.id);
assert(verA && verA.status === "pending", "case.verification.status is pending after request");
assert(verA.taskId === taskA.id, "case.verification.taskId matches the task");

// 3. requestValidation on a missing case returns null
assert(requestValidation("case-does-not-exist") === null, "requestValidation returns null for missing case");

// 4. getValidationStatus on a missing case returns null
assert(getValidationStatus("case-does-not-exist") === null, "getValidationStatus null for missing case");

// 5. getValidationTask looks up by id
assert(getValidationTask(taskA.id)?.id === taskA.id, "getValidationTask finds the task");

// 6. approveValidation (as officer) sets approved + remarks + decidedAt
const approved = approveValidation(taskA.id, getOfficerId(), "লক্ষণ ও আবহাওয়া মিলে যায়");
assert(approved.status === "approved", "approveValidation sets status approved");
assert(approved.remarks === "লক্ষণ ও আবহাওয়া মিলে যায়", "approveValidation stores remarks");
assert(typeof approved.decidedAt === "string", "approveValidation sets decidedAt");

// 7. approveValidation updates case.verification to approved + officerId
const verAAfter = getValidationStatus(caseA.id);
assert(verAAfter.status === "approved", "case.verification.status is approved after approve");
assert(typeof verAAfter.officerId === "string", "case.verification.officerId is set after approve");

// 8. approveValidation on a missing task returns {error}
assert(approveValidation("val-nope", "o").error, "approveValidation returns {error} for missing task");

// 9. Role check blocks a non-officer (farmer) from approving
const { case: caseB } = createCase({ crop: "ধান", upazila: "সাভার" });
const taskB = requestValidation(caseB.id);
setOfficerProfile({ nameBn: "কৃষক", role: "farmer" });
const blocked = approveValidation(taskB.id, "farmer-id", "ok");
assert(blocked && typeof blocked.error === "string", "farmer cannot approve → {error}");

// 10. Role check also blocks a non-officer from rejecting
const blockedReject = rejectValidation(taskB.id, "farmer-id", "no");
assert(blockedReject && typeof blockedReject.error === "string", "farmer cannot reject → {error}");

// Back to officer for the remaining tests.
setOfficerProfile({ nameBn: "অফিসার এক", upazila: "সাভার", role: "officer" });

// 11. rejectValidation (as officer) sets rejected + remarks
const rejected = rejectValidation(taskB.id, getOfficerId(), "লক্ষণ স্পষ্ট নয়");
assert(rejected.status === "rejected", "rejectValidation sets status rejected");
assert(rejected.remarks === "লক্ষণ স্পষ্ট নয়", "rejectValidation stores remarks");

// 12. rejectValidation updates case.verification to rejected
assert(getValidationStatus(caseB.id).status === "rejected", "case.verification.status is rejected after reject");

// 13. getPendingValidations returns only still-pending tasks
//     (taskA approved, taskB rejected → none pending from these two)
const pendingAfterDecisions = getPendingValidations();
assert(
  pendingAfterDecisions.every((t) => t.status === "pending"),
  "getPendingValidations only returns pending",
);
assert(pendingAfterDecisions.length === 0, "no pending tasks after both were decided");

// 14. getPendingValidations(upazila) filters by the officer's upazila
const { case: caseX } = createCase({ crop: "ধান", upazila: "সাভার" });
const { case: caseY } = createCase({ crop: "পেঁয়াজ", upazila: "বোয়ালখালী" });
requestValidation(caseX.id);
requestValidation(caseY.id);
assert(getPendingValidations().length === 2, "two pending tasks across upazilas");
assert(getPendingValidations("সাভার").length === 1, "upazila filter returns only matching tasks");

// 15. modelLimitations are present and honest
assert(Array.isArray(modelLimitations) && modelLimitations.length === 2, "modelLimitations has 2 entries");
assert(
  modelLimitations.some((m) => m.includes("local-only")) && modelLimitations.some((m) => m.includes("self-declared")),
  "modelLimitations mention local-only + self-declared",
);

console.log(`\nvalidationApi.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

// Helper: read the current local officer profile's id.
function getOfficerId() {
  const p = JSON.parse(STORE.get("ud-officer-profile-v1") ?? "null");
  return p?.id ?? "officer-id";
}

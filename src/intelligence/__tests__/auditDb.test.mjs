// Audit DB tests — asserts the append-only audit log + validation-task store:
//  - logAction appends + normalises (id, timestamp)
//  - getAuditLog filters by caseId and sorts oldest-first
//  - createValidationTask defaults to pending
//  - updateValidationTask transitions status + sets decidedAt
//  - getValidationTasks filters by status
// Uses a Map-based localStorage mock.
const STORE = new Map();
globalThis.localStorage = {
  getItem: (k) => STORE.get(k) ?? null,
  setItem: (k, v) => void STORE.set(k, String(v)),
  removeItem: (k) => void STORE.delete(k),
};

const {
  logAction,
  getAuditLog,
  createValidationTask,
  getValidationTasks,
  updateValidationTask,
  AUDIT_MODEL_LIMITATIONS,
} = await import("../auditDb.js");

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

// 1. logAction appends + normalises the entry
const e1 = logAction({
  actor: "farmer",
  action: "set_field_location",
  caseId: "case-1",
  after: { lat: 23.8, lng: 90.4 },
});
assert(e1.id != null, "logAction assigns id");
assert(e1.timestamp != null, "logAction sets timestamp");
assert(e1.caseId === "case-1", "logAction preserves caseId");
assert(e1.actor === "farmer", "logAction preserves actor");

// 2. Two more entries (different cases) so filtering is testable
logAction({ actor: "system", action: "sync", caseId: "case-2" });
logAction({ actor: "farmer", action: "treatment_added", caseId: "case-1" });

// 3. getAuditLog filters by caseId
const case1Log = getAuditLog("case-1");
assert(case1Log.length === 2, `getAuditLog(case-1) length 2 (got ${case1Log.length})`);
assert(
  case1Log.every((e) => e.caseId === "case-1"),
  "filtered log entries all case-1",
);

// 4. getAuditLog() returns everything, sorted oldest-first
const allLog = getAuditLog();
assert(allLog.length === 3, `getAuditLog() all length 3 (got ${allLog.length})`);
assert(new Date(allLog[0].timestamp) <= new Date(allLog[allLog.length - 1].timestamp), "audit log sorted oldest-first");

// 5. createValidationTask defaults
const t1 = createValidationTask({ caseId: "case-1", assignedOfficer: "SAA-1" });
assert(t1.id != null, "createValidationTask assigns id");
assert(t1.status === "pending", "createValidationTask defaults to pending");
assert(t1.decidedAt === null, "createValidationTask decidedAt null");
assert(t1.assignedOfficer === "SAA-1", "createValidationTask preserves officer");
assert(t1.createdAt != null, "createValidationTask sets createdAt");

// 6. Second task in a different case
createValidationTask({ caseId: "case-2", assignedOfficer: "SAA-2" });

// 7. getValidationTasks filters by status
const pending = getValidationTasks("pending");
assert(pending.length === 2, `getValidationTasks(pending) length 2 (got ${pending.length})`);
assert(getValidationTasks("approved").length === 0, "getValidationTasks(approved) empty before any decision");

// 8. updateValidationTask status transition + decidedAt
const updated = updateValidationTask(t1.id, { status: "approved", remarks: "verified on site" });
assert(updated.status === "approved", "updateValidationTask → approved");
assert(updated.remarks === "verified on site", "updateValidationTask preserves remarks");
assert(updated.decidedAt != null, "updateValidationTask sets decidedAt on approval");

// 9. getValidationTasks reflects the transition
const approved = getValidationTasks("approved");
assert(approved.length === 1, `getValidationTasks(approved) length 1 (got ${approved.length})`);
assert(getValidationTasks("pending").length === 1, "pending count drops to 1 after approval");

// 10. updateValidationTask on unknown id → null
assert(updateValidationTask("nope", { status: "rejected" }) === null, "updateValidationTask unknown id → null");

// 11. Reject transition also sets decidedAt
const t2 = getValidationTasks("pending")[0];
const rejected = updateValidationTask(t2.id, { status: "rejected", remarks: "could not verify" });
assert(rejected.status === "rejected", "updateValidationTask → rejected");
assert(rejected.decidedAt != null, "rejected task gets decidedAt");
assert(getValidationTasks("pending").length === 0, "no pending tasks after rejecting the last one");

// 12. modelLimitations present
assert(AUDIT_MODEL_LIMITATIONS.length > 0, "auditDb exposes modelLimitations");
assert(
  AUDIT_MODEL_LIMITATIONS.some((l) => l.includes("ডিভাইস")),
  "modelLimitations notes device-local storage",
);

console.log(`\nauditDb.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

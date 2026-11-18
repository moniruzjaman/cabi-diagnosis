// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 3)
// Audit DB — append-only audit log + validation-task store on
// localStorage. Backs the "who changed what, when" trail for the
// Field Health Passport and the field-officer verification workflow.
//
// Original design. Append-only log + task store are standard patterns.
// No code ported from any repository.
// ============================================================

import "./auditTypes.js";

const AUDIT_LOG_KEY = "udh-audit-log-v1";
const VALIDATION_TASKS_KEY = "udh-validation-tasks-v1";

const AUDIT_LIMITATIONS = [
  "অডিট লগ শুধু এই ডিভাইসে — সার্ভারে সংরক্ষিত নয়, ডিভাইস পরিবর্তনে হারিয়ে যাবে।",
  "ভ্যালিডেশন টাস্ক অফলাইন ওয়ার্কফ্লো — কোনো রিয়েল-টাইম অফিসার নোটিফিকেশন নেই।",
];

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

// ─── Audit log (append-only) ─────────────────────────────────────────────────

/**
 * Append an audit log entry. The entry is normalised (id + timestamp) and
 * pushed onto the end of the log — the log is never rewritten or reordered.
 * @param {Partial<import('./auditTypes.js').AuditLogEntry>} entry
 * @returns {import('./auditTypes.js').AuditLogEntry} the stored entry
 */
export function logAction(entry = {}) {
  const log = readList(AUDIT_LOG_KEY);
  const stored = {
    id: entry.id || makeId("aud"),
    timestamp: entry.timestamp || nowIso(),
    actor: entry.actor || "system",
    action: entry.action || "unknown",
    caseId: entry.caseId || "",
    before: entry.before ?? null,
    after: entry.after ?? null,
    metadata: entry.metadata ?? {},
  };
  log.push(stored);
  writeList(AUDIT_LOG_KEY, log);
  return stored;
}

/**
 * Read the audit log, optionally filtered by caseId. Sorted oldest-first.
 * @param {string} [caseId] - if provided, only entries for this case
 * @returns {import('./auditTypes.js').AuditLogEntry[]}
 */
export function getAuditLog(caseId) {
  const log = readList(AUDIT_LOG_KEY);
  const filtered = caseId ? log.filter((e) => e.caseId === caseId) : log;
  return [...filtered].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// ─── Validation tasks ────────────────────────────────────────────────────────

/**
 * Create a validation task for a case. Defaults to status 'pending'.
 * @param {Partial<import('./auditTypes.js').ValidationTask>} task
 * @returns {import('./auditTypes.js').ValidationTask} the stored task
 */
export function createValidationTask(task = {}) {
  const list = readList(VALIDATION_TASKS_KEY);
  const stored = {
    id: task.id || makeId("val"),
    caseId: task.caseId || "",
    assignedOfficer: task.assignedOfficer || "",
    status: "pending",
    remarks: task.remarks || "",
    createdAt: task.createdAt || nowIso(),
    decidedAt: null,
  };
  list.push(stored);
  writeList(VALIDATION_TASKS_KEY, list);
  return stored;
}

/**
 * Read validation tasks, optionally filtered by status.
 * @param {"pending"|"approved"|"rejected"} [status]
 * @returns {import('./auditTypes.js').ValidationTask[]}
 */
export function getValidationTasks(status) {
  const list = readList(VALIDATION_TASKS_KEY);
  const filtered = status ? list.filter((t) => t.status === status) : list;
  return [...filtered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Update a validation task's decision fields (status, remarks, decidedAt).
 * Only the supplied fields are patched; id + caseId are immutable.
 * @param {string} id
 * @param {{status?: "pending"|"approved"|"rejected", remarks?: string, decidedAt?: string|null}} patch
 * @returns {import('./auditTypes.js').ValidationTask|null} updated task, or null if not found
 */
export function updateValidationTask(id, patch = {}) {
  const list = readList(VALIDATION_TASKS_KEY);
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const next = { ...list[idx] };
  if (patch.status != null) next.status = patch.status;
  if (patch.remarks != null) next.remarks = patch.remarks;
  if (patch.decidedAt !== undefined) next.decidedAt = patch.decidedAt ?? nowIso();
  // A decision sets decidedAt automatically when moving out of pending.
  if (patch.status && patch.status !== "pending" && !next.decidedAt) {
    next.decidedAt = nowIso();
  }
  list[idx] = next;
  writeList(VALIDATION_TASKS_KEY, list);
  return next;
}

export const AUDIT_MODEL_LIMITATIONS = AUDIT_LIMITATIONS;

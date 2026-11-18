// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 4)
// Validation API — local-first case verification for extension officers.
//
// An extension officer can be asked to verify a farmer-submitted crop
// health case (e.g. "is this really rice blast?"). This module owns the
// validation-task lifecycle:
//
//   requestValidation  → case.verification = {status:'pending',  taskId, requestedAt}
//   approveValidation  → case.verification = {status:'approved', taskId, officerId, remarks, decidedAt}
//   rejectValidation   → case.verification = {status:'rejected', taskId, officerId, remarks, decidedAt}
//
// Tasks live in localStorage under UDH_VALIDATION_KEY. Case verification
// state is written back onto the case via cropHealthCases (so the
// VerificationPanel + CaseManager stay in sync). Every decision is also
// appended to a simple audit trail (console + localStorage log).
//
// Role check is ADVISORY only (see officerProfile.modelLimitations) — it
// stops the UI offering approve/reject to non-officers; it is NOT a
// server-enforced security boundary.
//
// License note: reimplemented from the Phase 4 design description. The
// audit traced the original app to "Plantation Tracker" (UNLICENSED);
// no code was copied from any repository.
// ============================================================

import { updateCase, getCaseById } from "../data/cropHealthCases.js";
import { getOfficerProfile, isOfficer } from "./officerProfile.js";

const UDH_VALIDATION_KEY = "ud-validation-tasks-v1";
const UDH_AUDIT_KEY = "ud-validation-audit-v1";
const AUDIT_CAP = 200;

/**
 * Honest caveats — surfaced in the UI so "officer approved" is never
 * mistaken for a cross-device, authenticated verdict.
 * @type {string[]}
 */
export const modelLimitations = [
  "local-only — no cross-device sync of verification decisions",
  "officer identity is self-declared, not authenticated",
];

// ─── IDs & time ──────────────────────────────────────────────────────────────

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

// ─── Store primitives ────────────────────────────────────────────────────────

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function loadTasks() {
  try {
    return safeParse(localStorage.getItem(UDH_VALIDATION_KEY), []);
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(UDH_VALIDATION_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}

// ─── Audit trail ─────────────────────────────────────────────────────────────

/**
 * Append an audit entry. Always logs to console; also persists to
 * localStorage (best-effort) so a later session can show a decision log.
 * @param {string} event
 * @param {object} payload
 */
function logAudit(event, payload = {}) {
  const entry = { id: makeId("audit"), event, at: nowIso(), ...payload };
  console.log("[validation-audit]", event, entry);
  try {
    const log = safeParse(localStorage.getItem(UDH_AUDIT_KEY), []);
    log.unshift(entry);
    localStorage.setItem(UDH_AUDIT_KEY, JSON.stringify(log.slice(0, AUDIT_CAP)));
  } catch {
    // localStorage unavailable — console log above is still the source of truth.
  }
}

/**
 * Read the persisted audit log (newest first).
 * @returns {object[]}
 */
export function getAuditLog() {
  try {
    return safeParse(localStorage.getItem(UDH_AUDIT_KEY), []);
  } catch {
    return [];
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Request officer validation for a case. Creates a pending validation
 * task and marks case.verification = {status:'pending', taskId, requestedAt}.
 *
 * @param {string} caseId
 * @param {string} [officerId] - optional id of the officer this is routed to
 * @returns {import('./types.js').ValidationTask|null} the created task, or null if the case is missing
 */
export function requestValidation(caseId, officerId) {
  const c = getCaseById(caseId);
  if (!c) return null;

  const ts = nowIso();
  const task = {
    id: makeId("val"),
    caseId,
    status: "pending",
    assignedOfficer: officerId || null,
    // Denormalized from the case so getPendingValidations(upazila) can
    // filter without re-reading every case.
    upazila: c.upazila || "",
    district: c.district || "",
    crop: c.crop || "",
    createdAt: ts,
  };

  const tasks = loadTasks();
  tasks.push(task);
  saveTasks(tasks);

  updateCase(caseId, {
    verification: {
      status: "pending",
      taskId: task.id,
      requestedAt: ts,
    },
  });

  logAudit("validation_requested", { caseId, taskId: task.id, officerId: officerId || null });
  return task;
}

/**
 * Approve a pending validation task. Requires the local officer profile
 * to be an officer/admin (advisory role check).
 * @param {string} taskId
 * @param {string} officerId
 * @param {string} [remarks]
 * @returns {import('./types.js').ValidationTask|{error: string}}
 */
export function approveValidation(taskId, officerId, remarks = "") {
  const roleError = guardOfficer();
  if (roleError) return roleError;
  return decideValidation(taskId, "approved", officerId, remarks);
}

/**
 * Reject a pending validation task. Same advisory role check as approve.
 * @param {string} taskId
 * @param {string} officerId
 * @param {string} [remarks]
 * @returns {import('./types.js').ValidationTask|{error: string}}
 */
export function rejectValidation(taskId, officerId, remarks = "") {
  const roleError = guardOfficer();
  if (roleError) return roleError;
  return decideValidation(taskId, "rejected", officerId, remarks);
}

/**
 * Internal: apply an approve/reject decision to a task + its case.
 * @param {string} taskId
 * @param {"approved"|"rejected"} status
 * @param {string} officerId
 * @param {string} remarks
 * @returns {import('./types.js').ValidationTask|{error: string}}
 */
function decideValidation(taskId, status, officerId, remarks) {
  const tasks = loadTasks();
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return { error: "যাচাই কাজটি খুঁজে পাওয়া যায়নি।" };

  const decidedAt = nowIso();
  const task = {
    ...tasks[idx],
    status,
    officerId,
    remarks: remarks || "",
    decidedAt,
  };
  tasks[idx] = task;
  saveTasks(tasks);

  updateCase(task.caseId, {
    verification: {
      status,
      taskId: task.id,
      officerId,
      remarks: remarks || "",
      decidedAt,
    },
  });

  logAudit(`validation_${status}`, { taskId, caseId: task.caseId, officerId, remarks: remarks || "" });
  return task;
}

/**
 * Advisory role guard used by approve/reject. Returns an {error} object
 * when the local profile is not an officer/admin (or is absent).
 * @returns {{error: string}|null}
 */
function guardOfficer() {
  const profile = getOfficerProfile();
  if (!isOfficer(profile)) {
    return {
      error: "অফিসার অনুমতি প্রয়োজন — শুধুমাত্র উপসহকারী অফিসার/অ্যাডমিন যাচাই করতে পারবেন।",
    };
  }
  return null;
}

/**
 * Read the verification state recorded on a case.
 * @param {string} caseId
 * @returns {import('./types.js').CaseVerification|null}
 */
export function getValidationStatus(caseId) {
  const c = getCaseById(caseId);
  return c?.verification || null;
}

/**
 * Pending validation tasks, optionally filtered by upazila (so an officer
 * only sees cases from their own area). When no upazila is given, every
 * pending task is returned.
 * @param {string} [upazila]
 * @returns {import('./types.js').ValidationTask[]}
 */
export function getPendingValidations(upazila) {
  const tasks = loadTasks().filter((t) => t.status === "pending");
  if (!upazila) return tasks;
  return tasks.filter((t) => t.upazila === upazila);
}

/**
 * Look up a single validation task by id.
 * @param {string} taskId
 * @returns {import('./types.js').ValidationTask|null}
 */
export function getValidationTask(taskId) {
  return loadTasks().find((t) => t.id === taskId) || null;
}

/**
 * All validation tasks (any status). Mostly for the audit/log view.
 * @returns {import('./types.js').ValidationTask[]}
 */
export function getValidationTasks() {
  return loadTasks();
}

export { UDH_VALIDATION_KEY, UDH_AUDIT_KEY };

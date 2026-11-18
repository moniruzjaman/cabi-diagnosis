// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 3)
// Audit + Validation type definitions (JSDoc).
//
// Original design. Standard audit-log + validation-task shapes.
// No code ported from any repository.
// ============================================================

/**
 * An append-only audit log entry. `before`/`after` capture the changed
 * slice of state so every mutation is reversible and explainable.
 * @typedef {Object} AuditLogEntry
 * @property {string} id
 * @property {string} timestamp - ISO 8601
 * @property {string} actor - who/what made the change (e.g. "farmer", "system:sync")
 * @property {string} action - verb, e.g. "set_field_location", "treatment_added"
 * @property {string} caseId - related crop health case id
 * @property {object|null} before - prior value (null for creates)
 * @property {object|null} after - new value (null for deletes)
 * @property {object} [metadata] - extra context (e.g. { accuracyMeters })
 */

/**
 * A field-officer validation task. A case (or a field location) may need
 * human verification before it is treated as authoritative. Status flows
 * pending → approved | rejected.
 * @typedef {Object} ValidationTask
 * @property {string} id
 * @property {string} caseId
 * @property {string} assignedOfficer
 * @property {"pending"|"approved"|"rejected"} status
 * @property {string} remarks
 * @property {string} createdAt - ISO 8601
 * @property {string|null} decidedAt - ISO 8601, set when approved/rejected
 */

export {}; // type-only module

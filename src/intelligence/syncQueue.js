// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 3)
// Sync Queue — offline-first sync state machine on localStorage.
//
// Each record flows: pending → syncing → synced | failed.
// On failure the record is retried with exponential backoff
// (delay = 2^attempts seconds), up to MAX_ATTEMPTS (5) before it is
// marked terminally 'failed'. retryFailed() re-queues failed records.
//
// SCAFFOLD NOTE: there is no backend yet, so processQueue() marks every
// pending record synced after a 100 ms mock delay. This keeps the offline
// contract honest: data is captured locally first, and the queue tracks
// sync state so a real backend can be dropped in later without changing
// the component contract.
//
// Original design. Offline-sync state machine + exponential backoff are
// standard engineering patterns. No code ported from any repository.
// ============================================================

import "./auditTypes.js"; // pull in JSDoc typedefs for tooling

const SYNC_QUEUE_KEY = "udh-sync-queue-v1";
const MAX_ATTEMPTS = 5;
const MOCK_DELAY_MS = 100; // scaffold only — see SCAFFOLD NOTE above

const SYNC_LIMITATIONS = [
  "এখনও কোনো ব্যাকএন্ড নেই — সিঙ্ক সফল হয়েছে হিসাবে স্ক্যাফোল্ড দেখানো হচ্ছে।",
  "ব্যাকঅফ কেবল ক্লায়েন্ট-সাইডে — সার্ভারের সত্যিকারের লোড বা রেট-লিমিট বিবেচনা করে না।",
];

// ─── IDs & storage ───────────────────────────────────────────────────────────

function makeId() {
  return `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function readQueue() {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeQueue(q) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(q));
    return true;
  } catch {
    return false;
  }
}

// ─── Exponential backoff ─────────────────────────────────────────────────────

/**
 * Backoff delay in seconds for a given attempt count.
 * delay = 2^attempts (1s, 2s, 4s, 8s, 16s …). Attempts are 0-indexed.
 * @param {number} attempts
 * @returns {number} seconds
 */
export function computeBackoffDelay(attempts) {
  const n = Math.max(0, attempts | 0);
  return 2 ** n;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Enqueue a sync record. Assigns an id + initial state if missing.
 * @param {{id?: string, caseId: string, type: string, payload: object}} record
 * @returns {import('./auditTypes.js').AuditLogEntry & {syncStatus: string}} the stored record
 */
export function enqueue(record) {
  const q = readQueue();
  const entry = {
    id: record.id || makeId(),
    caseId: record.caseId || "",
    type: record.type || "unknown",
    payload: record.payload ?? null,
    syncStatus: "pending",
    attempts: 0,
    lastAttemptAt: null,
    error: null,
    createdAt: nowIso(),
  };
  q.push(entry);
  writeQueue(q);
  return entry;
}

/**
 * All records currently awaiting sync (syncStatus === 'pending').
 * @returns {object[]}
 */
export function getPending() {
  return readQueue().filter((r) => r.syncStatus === "pending");
}

/**
 * Mark a record as actively syncing (in-flight). Records the attempt time.
 * @param {string} id
 * @returns {object|null} updated record, or null if not found
 */
export function markSyncing(id) {
  const q = readQueue();
  const idx = q.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  q[idx] = {
    ...q[idx],
    syncStatus: "syncing",
    lastAttemptAt: nowIso(),
    attempts: (q[idx].attempts || 0) + 1,
  };
  writeQueue(q);
  return q[idx];
}

/**
 * Mark a record as successfully synced. Clears any prior error.
 * @param {string} id
 * @returns {object|null} updated record, or null if not found
 */
export function markSynced(id) {
  const q = readQueue();
  const idx = q.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  q[idx] = { ...q[idx], syncStatus: "synced", error: null, lastAttemptAt: nowIso() };
  writeQueue(q);
  return q[idx];
}

/**
 * Mark a record as failed for this attempt. Increments the attempt count
 * and records the error. If attempts reach MAX_ATTEMPTS the record moves
 * to terminal 'failed'; otherwise it returns to 'pending' so the next
 * processQueue pass retries it (subject to backoff).
 * @param {string} id
 * @param {string} error
 * @returns {object|null} updated record, or null if not found
 */
export function markFailed(id, error) {
  const q = readQueue();
  const idx = q.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const attempts = (q[idx].attempts || 0) + 1;
  const terminal = attempts >= MAX_ATTEMPTS;
  q[idx] = {
    ...q[idx],
    attempts,
    syncStatus: terminal ? "failed" : "pending",
    error: error || "unknown error",
    lastAttemptAt: nowIso(),
  };
  writeQueue(q);
  return q[idx];
}

/**
 * Aggregate counts by sync status.
 * @returns {{pending: number, syncing: number, synced: number, failed: number}}
 */
export function getStats() {
  const q = readQueue();
  const stats = { pending: 0, syncing: 0, synced: 0, failed: 0 };
  for (const r of q) {
    if (stats[r.syncStatus] != null) stats[r.syncStatus] += 1;
  }
  return stats;
}

/**
 * Re-queue every terminally-failed record for another attempt cycle.
 * Resets attempts to 0 and status to 'pending'. Returns the count re-queued.
 * @returns {number}
 */
export function retryFailed() {
  const q = readQueue();
  let count = 0;
  for (const r of q) {
    if (r.syncStatus === "failed") {
      r.syncStatus = "pending";
      r.attempts = 0;
      r.error = null;
      r.lastAttemptAt = null;
      count += 1;
    }
  }
  writeQueue(q);
  return count;
}

/**
 * SCFFOLD: process the pending queue. With no backend, each pending record
 * is marked syncing then synced after a 100 ms mock delay. Returns the count
 * of records processed. Replace the mock delay with a real network call when
 * a backend exists.
 * @returns {Promise<number>}
 */
export async function processQueue() {
  const pending = getPending();
  for (const r of pending) {
    markSyncing(r.id);
    // Scaffold mock delay (no real backend). Sequential awaits are
    // intentional — each record is processed one at a time.
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    markSynced(r.id);
  }
  return pending.length;
}

export const SYNC_MODEL_LIMITATIONS = SYNC_LIMITATIONS;
export { MAX_ATTEMPTS };

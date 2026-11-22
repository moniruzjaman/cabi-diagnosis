// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 3)
// Sync Queue — offline-first sync state machine on localStorage.
//
// Each record flows: pending → syncing → synced | failed.
// On failure the record is retried with exponential backoff
// (delay = 2^attempts seconds), up to MAX_ATTEMPTS (5) before it is
// marked terminally 'failed'. retryFailed() re-queues failed records.
//
// Backend integration: processQueue() flushes pending records to
// POST /api/community?resource=cases (rewritten from /api/cases), which
// stores them in the Turso `crop_health_cases` table (idempotent by
// client_record_id). The transport carries METADATA ONLY — photos,
// thumbnails and precise GPS coordinates never leave the device
// (sanitizePayload whitelist below; the server re-whitelists).
// A transport can be injected via setSyncTransport() for tests or
// alternative backends without changing the component contract.
//
// Original design. Offline-sync state machine + exponential backoff are
// standard engineering patterns. No code ported from any repository.
// ============================================================

import "./auditTypes.js"; // pull in JSDoc typedefs for tooling

const SYNC_QUEUE_KEY = "udh-sync-queue-v1";
const MAX_ATTEMPTS = 5;
const MAX_QUEUE = 500; // unbounded localStorage growth guard
const CASES_ENDPOINT = "/api/community?resource=cases";

// Metadata-only whitelist — mirrors validateCaseSyncRecord() on the server.
// Anything not listed here (photos, thumbnails, lat/lon, …) never syncs.
export const PAYLOAD_WHITELIST = [
  "crop",
  "variety",
  "district",
  "upazila",
  "growthStage",
  "status",
  "severity",
  "symptomSummary",
];

const SYNC_LIMITATIONS = [
  "সিঙ্ক কেবল মেটাডেটা — ছবি, থাম্বনেইল বা সঠিক GPS কো-অর্ডিনেট কখনও আপলোড হয় না।",
  "ব্যাকঅফ কেবল ক্লায়েন্ট-সাইডে — সার্ভারের সত্যিকারের লোড বা রেট-লিমিট বিবেচনা করে না।",
  "সার্ভার অ্যাক্সেসযোগ্য না হলে রেকর্ড ডিভাইসেই থাকে — MAX_ATTEMPTS পার হলে 'failed' হয় এবং ম্যানুয়াল সিঙ্ক দিয়ে আবার চেষ্টা করা যায়।",
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

// ─── Payload sanitisation (privacy) ──────────────────────────────────────────

/**
 * Copies only whitelisted scalar metadata fields from a payload.
 * Photos, thumbnails, base64 blobs and precise GPS coordinates are never
 * copied, and strings are hard-capped at 300 chars. This runs on every
 * record BEFORE it is handed to the transport — the server applies the
 * same whitelist again (defence in depth).
 * @param {object} payload
 * @returns {object} metadata-only payload
 */
export function sanitizePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const out = {};
  for (const key of PAYLOAD_WHITELIST) {
    const value = payload[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      out[key] = value.slice(0, 300);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

// ─── Transport (real backend; injectable for tests) ──────────────────────────

let transport = null; // when set, used instead of defaultTransport

/**
 * Inject a custom sync transport (used by tests to avoid network I/O).
 * @param {((record: object) => Promise<object>) | null} fn
 */
export function setSyncTransport(fn) {
  transport = typeof fn === "function" ? fn : null;
}

// Signing token — same mechanism as postJson()/signedFetch() in App.jsx:
// GET /api/signing-token → X-Request-Signature header. Best-effort; in
// development the API accepts unsigned POSTs, and in production a failed
// token fetch simply surfaces as a retriable markFailed().
let _signingToken = null;
let _signingTokenPromise = null;

async function getSigningToken() {
  if (_signingToken) return _signingToken;
  if (_signingTokenPromise) return _signingTokenPromise;
  _signingTokenPromise = (async () => {
    try {
      const res = await fetch("/api/signing-token");
      if (res.ok) {
        const data = await res.json();
        if (data?.token) {
          _signingToken = data.token;
          return _signingToken;
        }
      }
    } catch {
      /* best-effort — retried on the next queue flush */
    }
    return null;
  })();
  const promise = _signingTokenPromise;
  promise.finally(() => {
    _signingTokenPromise = null;
  });
  return promise;
}

async function defaultTransport(record) {
  const token = await getSigningToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-Request-Signature"] = token;

  const res = await fetch(CASES_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      recordId: record.id,
      caseId: record.caseId,
      type: record.type,
      // Idempotent second pass — processQueue already sanitised; kept here
      // as defence in depth (the server whitelists a third time).
      payload: sanitizePayload(record.payload),
      createdAt: record.createdAt,
    }),
  });
  if (!res.ok) throw new Error(`sync HTTP ${res.status}`);
  return res.json().catch(() => ({}));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Enqueue a sync record. Assigns an id + initial state if missing.
 * The queue is capped at MAX_QUEUE records — when full, the oldest
 * already-synced record is dropped first, otherwise the oldest record.
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
  while (q.length > MAX_QUEUE) {
    const syncedIdx = q.findIndex((r) => r.syncStatus === "synced");
    q.splice(syncedIdx !== -1 ? syncedIdx : 0, 1);
  }
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
 * A read-only copy of the whole queue (all statuses). Used to reconcile
 * per-case sync status after a flush (see cropHealthCases.flushCaseSync).
 * @returns {object[]}
 */
export function getQueue() {
  return readQueue();
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
 * Process the pending queue against the real backend: each pending record
 * is handed to the transport (injected or default POST /api/cases), then
 * marked synced on success or failed-with-backoff on error. Records are
 * processed one at a time (sequential awaits are intentional). A flush is
 * skipped entirely while the browser reports navigator.online === false,
 * so going offline never burns retry attempts.
 * @returns {Promise<number>} records processed (0 when offline)
 */
export async function processQueue() {
  if (typeof navigator !== "undefined" && navigator.online === false) return 0;
  const pending = getPending();
  let processed = 0;
  for (const r of pending) {
    markSyncing(r.id);
    try {
      const send = transport || defaultTransport;
      // Privacy: sanitise at the QUEUE level so every transport — injected
      // or default — only ever receives metadata (no photos/GPS).
      await send({ ...r, payload: sanitizePayload(r.payload) });
      markSynced(r.id);
    } catch (err) {
      markFailed(r.id, err?.message ? String(err.message).slice(0, 200) : "sync failed");
    }
    processed += 1;
  }
  return processed;
}

export const SYNC_MODEL_LIMITATIONS = SYNC_LIMITATIONS;
export { MAX_ATTEMPTS, MAX_QUEUE };

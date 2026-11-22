// Sync Queue tests — asserts the offline-first sync state machine:
//  - enqueue → pending (id + attempts assigned)
//  - markSyncing → syncing (attempts incremented, lastAttemptAt set)
//  - markSynced → synced (error cleared)
//  - markFailed → pending while attempts < MAX, failed at MAX_ATTEMPTS
//  - getStats counts pending/syncing/synced/failed
//  - retryFailed re-queues terminally-failed records
//  - computeBackoffDelay = 2^attempts
// Uses a Map-based localStorage mock.
const STORE = new Map();
globalThis.localStorage = {
  getItem: (k) => STORE.get(k) ?? null,
  setItem: (k, v) => void STORE.set(k, String(v)),
  removeItem: (k) => void STORE.delete(k),
};

const {
  enqueue,
  getPending,
  markSyncing,
  markSynced,
  markFailed,
  getStats,
  retryFailed,
  computeBackoffDelay,
  MAX_ATTEMPTS,
  SYNC_MODEL_LIMITATIONS,
  processQueue,
} = await import("../syncQueue.js");

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

// 1. enqueue → pending with id + attempts 0
const r1 = enqueue({ caseId: "case-1", type: "field_location", payload: { lat: 23.8, lng: 90.4 } });
assert(r1.syncStatus === "pending", "enqueue → syncStatus pending");
assert(r1.attempts === 0, "enqueue → attempts 0");
assert(r1.id != null && typeof r1.id === "string", "enqueue assigns string id");

// 2. getPending sees the enqueued record
assert(getPending().length === 1, "getPending length 1 after one enqueue");

// 3. markSyncing → syncing + attempts incremented + lastAttemptAt set
const syncing = markSyncing(r1.id);
assert(syncing.syncStatus === "syncing", "markSyncing → syncing");
assert(syncing.attempts === 1, "markSyncing → attempts 1");
assert(syncing.lastAttemptAt != null, "markSyncing sets lastAttemptAt");

// 4. markSynced → synced + error cleared
const synced = markSynced(r1.id);
assert(synced.syncStatus === "synced", "markSynced → synced");
assert(synced.error === null, "markSynced clears error");

// 5. markSynced on unknown id → null
assert(markSynced("does-not-exist") === null, "markSynced unknown id → null");

// 6. Failure path: a single markFailed (< MAX) keeps the record retryable (pending)
const r2 = enqueue({ caseId: "case-2", type: "treatment", payload: {} });
const mid = markFailed(r2.id, "transient error");
assert(mid.attempts === 1, "single markFailed → attempts 1");
assert(mid.syncStatus === "pending", "single markFailed (< MAX) → still pending (retryable)");

// 7. Failure path: MAX_ATTEMPTS markFailed calls on a FRESH record → terminal 'failed'
const r3 = enqueue({ caseId: "case-3", type: "observation", payload: {} });
let last;
for (let i = 0; i < MAX_ATTEMPTS; i++) {
  last = markFailed(r3.id, "mock network error");
}
assert(last.syncStatus === "failed", `markFailed x${MAX_ATTEMPTS} → failed`);
assert(last.attempts === MAX_ATTEMPTS, "attempts reached MAX_ATTEMPTS");
assert(last.error === "mock network error", "error recorded on terminal failure");

// 8. getStats counts (r1 synced, r2 pending, r3 failed)
const stats = getStats();
assert(stats.synced === 1, `getStats synced 1 (got ${stats.synced})`);
assert(stats.failed === 1, `getStats failed 1 (got ${stats.failed})`);
assert(stats.pending === 1, `getStats pending 1 (r2 retryable) (got ${stats.pending})`);

// 9. retryFailed re-queues the failed record → pending, attempts reset
const requeued = retryFailed();
assert(requeued === 1, "retryFailed returns 1 (one failed record re-queued)");
const stats2 = getStats();
assert(stats2.failed === 0, `after retryFailed → failed 0 (got ${stats2.failed})`);
assert(stats2.pending === 2, `after retryFailed → pending 2 (r2 + r3) (got ${stats2.pending})`);

// 10. computeBackoffDelay = 2^attempts seconds
assert(computeBackoffDelay(0) === 1, "backoff 2^0 = 1s");
assert(computeBackoffDelay(3) === 8, "backoff 2^3 = 8s");
assert(computeBackoffDelay(4) === 16, "backoff 2^4 = 16s");

// 11. modelLimitations present + honest about scaffold backend
assert(SYNC_MODEL_LIMITATIONS.length > 0, "syncQueue exposes modelLimitations");
assert(
  SYNC_MODEL_LIMITATIONS.some((l) => l.includes("API এখনো সংযুক্ত নয়")),
  "modelLimitations says server sync is not connected",
);
const pendingBeforeNoAdapter = getStats().pending;
assert(await processQueue() === 0, "processQueue without adapter persists nothing");
assert(getStats().pending === pendingBeforeNoAdapter, "no adapter never marks records synced");

const persisted = await processQueue({ persist: async () => ({ ok: true }) });
assert(persisted === pendingBeforeNoAdapter, "processQueue counts confirmed persistence callbacks");
assert(getStats().pending === 0, "confirmed persistence marks records synced");
assert(
  SYNC_MODEL_LIMITATIONS.some((l) => l.includes("নিশ্চিত সফল লেখার প্রমাণ")),
  "modelLimitations requires confirmed server persistence",
);

console.log(`\nsyncQueue.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

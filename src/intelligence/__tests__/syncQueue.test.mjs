// Sync Queue tests — asserts the offline-first sync state machine AND the
// real backend transport:
//  - enqueue → pending (id + attempts assigned)
//  - markSyncing → syncing (attempts incremented, lastAttemptAt set)
//  - markSynced → synced (error cleared)
//  - markFailed → pending while attempts < MAX, failed at MAX_ATTEMPTS
//  - getStats counts pending/syncing/synced/failed
//  - retryFailed re-queues terminally-failed records
//  - computeBackoffDelay = 2^attempts
//  - processQueue flushes via the injected transport (no network in CI):
//      success → synced; failure → markFailed with backoff to pending
//  - sanitizePayload strips media/location keys (metadata-only sync)
//  - offline guard: navigator.online === false → queue untouched
//  - MAX_QUEUE cap prunes the queue
// Uses a Map-based localStorage mock and an injected sync transport.
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
  getQueue,
  retryFailed,
  computeBackoffDelay,
  processQueue,
  setSyncTransport,
  sanitizePayload,
  MAX_ATTEMPTS,
  MAX_QUEUE,
  SYNC_MODEL_LIMITATIONS,
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

// 11. modelLimitations present + honest about the metadata-only contract
assert(SYNC_MODEL_LIMITATIONS.length > 0, "syncQueue exposes modelLimitations");
assert(
  SYNC_MODEL_LIMITATIONS.some((l) => l.includes("মেটাডেটা")),
  "modelLimitations notes metadata-only sync",
);
assert(
  SYNC_MODEL_LIMITATIONS.some((l) => l.includes("ক্লায়েন্ট-সাইডে")),
  "modelLimitations notes client-side backoff",
);

// ─── Real-backend transport tests (injected transport — no network) ──────────

// Deterministic state: settle the pending leftovers from sections 1-11.
markSynced(r2.id);
markSynced(r3.id);

// 12. sanitizePayload — whitelist copy, media/location stripped, strings capped
const sp = sanitizePayload({
  crop: "ধান",
  variety: "BR-28",
  district: "বগুড়া",
  status: "active",
  photo: "data:image/jpeg;base64,AAAA",
  thumbnail: "data:image/jpeg;base64,BBBB",
  lat: 23.8,
  lon: 90.4,
  longitude: 90.4,
  location: { village: "x" },
  symptomSummary: "পাতায় বাদামি দাগ".padEnd(400, "x"),
});
assert(sp.crop === "ধান", "sanitizePayload keeps whitelisted crop");
assert(sp.variety === "BR-28" && sp.district === "বগুড়া", "sanitizePayload keeps whitelisted scalars");
assert(!("photo" in sp), "sanitizePayload strips photo");
assert(!("thumbnail" in sp), "sanitizePayload strips thumbnail");
assert(!("lat" in sp) && !("lon" in sp) && !("longitude" in sp), "sanitizePayload strips precise location");
assert(!("location" in sp), "sanitizePayload strips non-whitelisted objects");
assert(sp.symptomSummary.length === 300, `sanitizePayload caps strings at 300 (got ${sp.symptomSummary.length})`);
assert(Object.keys(sanitizePayload(null)).length === 0, "sanitizePayload(null) → empty");
assert(Object.keys(sanitizePayload([1, 2])).length === 0, "sanitizePayload(array) → empty");

// 13. processQueue success path — transport called with sanitized envelope
const sent = [];
setSyncTransport(async (record) => {
  sent.push(record);
  return { ok: true };
});
const t1 = enqueue({ caseId: "case-t1", type: "observation", payload: { crop: "ধান", photo: "data:image/jpeg;base64,AAAA", lat: 23.8 } });
const t2 = enqueue({ caseId: "case-t1", type: "treatment", payload: { crop: "ধান" } });
const processed = await processQueue();
assert(processed === 2, `processQueue processed 2 pending records (got ${processed})`);
assert(sent.length === 2, "transport called once per pending record");
assert(sent[0].caseId === "case-t1" && sent[0].type === "observation", "transport receives record envelope");
assert(sent[0].id === t1.id, "transport receives the queue record id");
assert("payload" in sent[0] && "createdAt" in sent[0], "transport record carries payload + createdAt");
assert(!("photo" in sent[0].payload) && !("lat" in sent[0].payload), "transport payload sanitized (no photo/lat)");
assert(sent[0].payload.crop === "ধান", "transport payload keeps whitelisted metadata");
const stats3 = getStats();
assert(stats3.synced === 5, `records marked synced after successful flush (got ${stats3.synced})`);

// 14. processQueue failure path — markFailed with error, back to pending
setSyncTransport(async () => {
  throw new Error("network down");
});
const f1 = enqueue({ caseId: "case-f1", type: "evaluation", payload: { crop: "গম" } });
await processQueue();
const f1After = getQueue().find((r) => r.id === f1.id);
assert(f1After.syncStatus === "pending", "failed transport → back to pending (< MAX_ATTEMPTS)");
assert(f1After.attempts === 2, "failed attempt recorded (markSyncing + markFailed each count one)");
assert(f1After.error === "network down", "transport error message recorded");

// 15. repeated failures → terminal failed at MAX_ATTEMPTS
for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
  await processQueue(); // each pass counts 2 attempts (syncing + failed)
}
const f1Final = getQueue().find((r) => r.id === f1.id);
assert(f1Final.syncStatus === "failed", "repeated transport failures → terminal failed");
assert(f1Final.attempts >= MAX_ATTEMPTS, `terminal failure recorded >= MAX_ATTEMPTS (got ${f1Final.attempts})`);

// 16. retryFailed + successful transport recovers the record
setSyncTransport(async () => ({ ok: true }));
retryFailed();
await processQueue();
assert(getStats().failed === 0, "after retry + successful flush → no failed records");
assert(getQueue().find((r) => r.id === f1.id).syncStatus === "synced", "recovered record synced");

// 17. offline guard — navigator.online === false → queue untouched
let offlineTested = false;
try {
  Object.defineProperty(globalThis, "navigator", { value: { online: false }, configurable: true });
  offlineTested = true;
} catch {
  /* navigator not redefinable in this runtime — skip the offline assertions */
}
if (offlineTested) {
  const offGuard = enqueue({ caseId: "case-off", type: "observation", payload: {} });
  const processedOffline = await processQueue();
  assert(processedOffline === 0, "offline → processQueue returns 0");
  assert(
    getQueue().find((r) => r.id === offGuard.id).syncStatus === "pending",
    "offline → record untouched (still pending, no attempt burned)",
  );
  Object.defineProperty(globalThis, "navigator", { value: { online: true }, configurable: true });
  await processQueue();
  assert(
    getQueue().find((r) => r.id === offGuard.id).syncStatus === "synced",
    "back online → record syncs on the next flush",
  );
}

// 18. MAX_QUEUE cap — oldest records pruned when over the limit
for (let i = 0; i < MAX_QUEUE + 5; i++) {
  enqueue({ caseId: "case-prune", type: "case_created", payload: {} });
}
assert(getQueue().length <= MAX_QUEUE, `queue capped at MAX_QUEUE (got ${getQueue().length})`);

setSyncTransport(null);

console.log(`\nsyncQueue.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

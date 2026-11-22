# Case metadata sync — completing the database architecture integration

Closes the last scaffold in the six-pillar database architecture: the offline
sync queue's mock transport is replaced with the real backend path, and the
missing `cases` API resource + `crop_health_cases` table are implemented —
exactly the path documented in `docs/implementation-audit.md` §6.

## What was incomplete (before this PR)

- `src/intelligence/syncQueue.js` `processQueue()` was an explicit scaffold:
  every pending record was marked `synced` after a 100 ms mock delay — no
  network call, no server table (`SYNC_MODEL_LIMITATIONS` honestly said
  "এখনও কোনো ব্যাকএন্ড নেই").
- `api/community.js` had no `cases` resource; `ensureSchema()` had no
  `crop_health_cases` table.
- Nothing in the app enqueued or flushed sync records.

## Integration design (unchanged constraints respected)

- **No new serverless function** (Vercel Hobby cap): `cases` resource added
  to the consolidated `api/community.js`; rewrite `/api/cases → /api/community?resource=cases`.
- **Local-first preserved**: the device case store remains the source of
  truth; sync is metadata-only and best-effort. New table
  `crop_health_cases` is idempotent by `client_record_id` PRIMARY KEY
  (`ON CONFLICT DO NOTHING`), so offline retries never duplicate rows.
- **Privacy enforced at 3 layers**: (1) producer builds metadata payloads,
  (2) `syncQueue.sanitizePayload` whitelist runs at the QUEUE level before
  any transport, (3) `validateCaseSyncRecord` re-whitelists server-side —
  photos, thumbnails and precise GPS coordinates never leave the device.
  Server identity is a truncated SHA-256 of the client IP (`visitor_hash`),
  same pattern as `outbreak_reports.reporter_hash`.
- **Auth/rate limiting**: `requireSignedRequest` (HMAC token, VERCEL=1) +
  dedicated `casesLimiter` (20 req/min closure, tier-capped at 10/min
  anonymous per IP like the other resources).
- **Wiring**: producer hooks in `createCase` / `addObservation` /
  `addTreatment` / `recordEvaluation`; `flushCaseSync()` reconciles each
  case's `syncStatus` with the queue; `SyncStatusChip` flushes on mount,
  on `online` events, and via the manual-sync button.
- **State machine intact**: `pending → syncing → synced | failed`,
  exponential backoff (`2^attempts`), `MAX_ATTEMPTS` 5, plus a new
  `MAX_QUEUE` (500) cap and an offline guard (`navigator.online === false`
  → flush skipped, no retry attempts burned).

## Testing (all executed locally — full evidence)

| Gate | Result |
|---|---|
| `npm test` (intelligence suites) | ✅ **679 passed, 0 failed across 23 suites** (was 622/22; +57 from the two sync suites) |
| `syncQueue.test.mjs` (rewritten) | ✅ 55 assertions — state machine, transport success/failure/backoff, metadata-only sanitisation (photo/lat/lon stripped), offline guard, MAX_QUEUE prune |
| `caseSyncApi.test.mjs` (new) | ✅ 29 assertions — REAL handler + REAL SQLite (libsql `file:` URL, same client path as Turso cloud): signed POST → saved row, replay → `duplicate:true`, smuggling attempt stripped, 403 unsigned/bad-token, 400 invalid recordId/type/body, 404/405, DB row contents verified |
| `npm run lint` | ✅ 0 errors (1 pre-existing `cropDiseases.js` warning, present on `main`) |
| `npm run format:check` | ✅ all files clean |
| `npm run test:offline` | ✅ ALL PASS |
| `npm run build` | ✅ 8.97 s, stamped v5.0.0 |
| `init-turso.mjs` + `verify-turso-config.mjs` (file: DB) | ✅ `ensureSchema()` created all 8 tables incl. `crop_health_cases`; verifier now reports expected-table inventory (8/8) |

Live-Turso note: no production credentials exist in this sandbox (no `.env`),
so the wire-level proof uses the documented `file:` libsql path — the same
approach `scripts/verify-turso-config.mjs` uses. Post-merge, the first
request to `/api/cases` on the real deployment runs the identical SQL path
against Turso cloud, and `ensureSchema()` auto-creates the table there.

## Files changed

```
api/_lib/turso.js                  + crop_health_cases table (ensureSchema) + saveCaseRecord (idempotent)
api/_lib/validation.js             + validateCaseSyncRecord (whitelist validator)
api/_lib/rateLimit.js              + casesLimiter
api/community.js                   + cases resource (POST, signed, rate-limited)
vercel.json                        + /api/cases rewrite
src/intelligence/syncQueue.js      mock transport → real backend transport, queue-level sanitisation,
                                   MAX_QUEUE prune, offline guard, updated limitations
src/data/cropHealthCases.js        + sync producer hooks + flushCaseSync() reconciliation
src/components/cases/SyncStatusChip.jsx   flush on mount/online/manual + pending-aware button
src/intelligence/__tests__/syncQueue.test.mjs   rewritten (+27 assertions)
src/intelligence/__tests__/caseSyncApi.test.mjs new (29 assertions, real DB path)
scripts/verify-turso-config.mjs    + expected-table inventory (read-only)
docs/implementation-audit.md       §6 updated: sync implemented as documented
README.md                          + Offline-First Case Sync feature bullet
```

## Regression safety

Six pillars, offline ONNX ensemble, online diagnosis waterfall, AgriChem tab,
navigation, PWA/SW behaviour and privacy commitments are untouched — no
changes to any pillar component; the only behavioural change is that the sync
queue now talks to the real backend instead of faking success.

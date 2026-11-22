# Database Integration Audit and Remediation Plan

**Repository:** `moniruzjaman/cabi-diagnosis`
**Audit baseline:** current `main` at 2026-11-23; remediation PR #81
**Scope:** tab-to-tab data flow, persistence, authentication, offline synchronization, and deployment configuration.

## Executive finding

The application is not yet a single connected data system. The UI contains connected workflows in places, but the persistence boundary is fragmented:

- Supabase stores authenticated user identity/profile rows (`public.app_users`).
- Turso stores selected application data: diagnoses, analytics, feedback, presence, market prices, and outbreak reports.
- Crop-health cases, observations, treatments, prevention actions, monitoring reminders, evaluations, learning insights, validation tasks, audit entries, and officer profiles are stored in browser `localStorage`.
- The sync queue is also local-only. Its former mock processor marked records as synced without a server write; that behavior is removed by this remediation.
- AgriChem's pesticide registry is a versioned, GitHub-synced static reference dataset. It is not a live relational database and should remain read-only reference data. User-applied treatments should reference its product identifiers and be stored in the case record.

## Verified gaps

| Area | Current behavior | Consequence |
|---|---|---|
| Turso environment | Vercel has `TURSO_DB_URL`; the API previously read only `TURSO_DATABASE_URL` | Runtime could incorrectly report Turso as unconfigured |
| Cases | `src/data/cropHealthCases.js` uses `localStorage` | Cases do not follow a user across devices |
| Sync queue | `src/intelligence/syncQueue.js` was a mock processor | UI could claim success without durable server persistence |
| Audit / validation | `auditDb.js`, `validationApi.js`, `officerProfile.js` use local browser storage | No shared officer review, authoritative audit, or server-enforced role |
| Main-app identity | Google session provider is mounted inside embedded AgriChem, not as a shared root identity provider | Main diagnosis/case flows do not yet have a consistent authenticated owner context |
| AgriChem registry | `pesticideMapper` dynamically loads a bundled static dataset | Product reference data is separate from user case records by design |

## Target data ownership

1. **Supabase Auth/profile boundary:** authenticated identity, stable user subject, profile attributes, and server-managed role/organization mapping. Service-role credentials remain server-only.
2. **Turso application-data boundary:** user-owned case aggregates and events, diagnosis history, monitoring, treatment records, prevention actions, evaluation results, validation tasks, and append-only audit events. All records must carry an authenticated owner/tenant key.
3. **Static reference-data boundary:** DAE pesticide registry, MoA/FRAC/IRAC mappings, crop/disease reference datasets, and other curated knowledge remain versioned, source-attributed read-only datasets. The database stores references/snapshots needed to explain a decision, not duplicate the entire catalogue on every case.
4. **Device boundary:** local storage is an offline cache/outbox, not the authoritative shared database. Never label a local-only record as server-synced.

## Required implementation phases

### Phase 1 — Database configuration and truthful status

- Resolve Turso URL from `TURSO_DATABASE_URL` or the Vercel integration name `TURSO_DB_URL`.
- Use the same resolver in the DB client, health status, auth diagnostics, request signing, analytics/presence reporting, and DB verification script.
- A health response must distinguish configured from actually reachable. A configured flag alone is not a connection test.
- Production writes must not silently appear durable when they fall back to Vercel `/tmp`. Responses and logs must expose the persistence mode without leaking credentials.
- Schema initialization failures must remain observable and must not set the initialized flag.

### Phase 2 — One shared identity and authorization layer

- Mount one application-level auth provider above all primary tabs, not only the embedded AgriChem subtree.
- Verify the signed session cookie on every private API operation; never trust a client-supplied user ID, email, role, or district.
- Resolve stable `google_sub` / authenticated subject server-side.
- Create server-managed roles and scope rules for farmer, officer, district administrator, and national administrator. Local self-declared officer profiles are UI hints only and must not authorize verification.
- Keep public reference datasets available without login; require identity for private case persistence and officer decisions.

### Phase 3 — Canonical case schema and migrations

Create versioned, repeatable migrations (not ad-hoc silent DDL) for:

- `crop_health_cases`: stable case ID, owner subject, crop/location/season, status, schema version, created/updated timestamps, optimistic version, soft-delete marker.
- `crop_health_case_events`: immutable, idempotent events for diagnosis evidence, observations, treatments, prevention actions, reminders, evaluations, and verification changes.
- `case_validation_tasks`: case ID, requester, assigned officer, status, decision, timestamps, and role/organization scope.
- `case_audit_events`: append-only actor, action, entity, before/after or safe diff, timestamp, and request/correlation ID.
- Add indexes for owner + updated time, district/upazila + status, case ID + event time, and task assignment + status.

Use parameterized SQL, unique event IDs/idempotency keys, foreign keys where supported, and explicit migration versions. Do not store original crop photographs in these tables. Store a thumbnail only when consent and policy explicitly allow it.

### Phase 4 — Shared API and offline outbox

- Extend the existing consolidated `api/community.js` dispatcher with a `cases` resource to preserve the Vercel function limit.
- Implement authenticated list/read/create/update/event/soft-delete/validation operations with owner checks and server-side role checks.
- Keep case event writes idempotent. A retried event must not duplicate a treatment or observation.
- Replace mock queue processing with a real adapter. A record becomes `synced` only after the API confirms a durable database commit and returns the acknowledged event/version.
- Use retry/backoff, conflict detection, and an explicit conflict-resolution path. Keep unsynced local records until server acknowledgement.
- Add cursor pagination and bounded payload validation; never download every user's full case history on each tab change.

### Phase 5 — Connect every tab to the same case identity

- Diagnose: create or open the canonical case and attach diagnosis evidence.
- Treat / AgriChem: choose a product from the static registry; record the selected registered-product identifier, active ingredient, MoA code, label/source snapshot, dosage, and application details against the same case ID.
- Prevent: write actions to that same case's prevention events.
- Monitor: read and append observations/reminders against that case.
- Evaluate: record outcome and verification status against that case.
- Learn: derive personal insights only from that user's evaluated cases; keep them clearly labelled as personal field experience unless independently verified and approved.
- Every tab should use one case service/query cache and refresh from acknowledged events, not maintain a parallel local copy with independent IDs.

## Data migration and safety rules

1. Do not delete or overwrite existing local cases during rollout.
2. On sign-in, offer a one-time migration of local cases to the authenticated account.
3. Upload each case and its events with stable IDs/idempotency keys; exclude original photos and unconsented thumbnails.
4. Verify server row counts and payload hashes/versions before marking the local copy migrated.
5. Keep a user-exportable backup and a rollback window.
6. Do not merge anonymous local cases into another user's account automatically.
7. Never treat unverified farmer reports or personal learning insights as authoritative agricultural recommendations.

## Acceptance criteria

- A case created in Diagnose appears in Monitor, Treat, Prevent, Evaluate, and Learn under the same stable case ID.
- An authenticated user sees their cases on a second device after sign-in.
- A different user cannot read, modify, export, or verify another user's cases.
- An officer decision is enforced by server-side role/assignment checks and appears in the immutable audit trail.
- Offline edits remain pending until a real server commit is acknowledged; airplane-mode testing never produces a false synced badge.
- Simultaneous edits produce a visible version conflict rather than silent data loss.
- Health diagnostics prove an actual database read/write probe in a protected admin context, without exposing secrets or personal records.
- Existing diagnosis, pesticide reference, offline inference, PWA, and Vercel function-count constraints continue to pass CI.

## Current PR scope

This PR addresses the confirmed Turso environment-name mismatch and removes false mock-sync success. It does **not** claim that case synchronization or the complete cross-tab database migration is finished. Those require the shared identity/authorization layer and versioned case migrations above.

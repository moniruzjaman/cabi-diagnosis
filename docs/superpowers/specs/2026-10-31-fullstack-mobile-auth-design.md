# Full-Stack Mobile-First Auth and Data Split

Date: 2026-10-31
Status: Draft pending user review
App: উদ্ভিদ গোয়েন্দা (Plant Detective)

## Goal

Turn the existing React/Vite PWA into a full-stack mobile-first web app with a hard three-store split:

- Supabase: authentication and user profile rows only
- Turso: all other server data
- IndexedDB: on-device source of truth (offline bundles, diagnosis outbox, device enrollment)

Farmers can use the whole app as guests. Login is one-time per device: Google when the network is available, otherwise collect a Bangladesh phone now and complete OTP later. After success, this device never asks again. Guest diagnoses on the phone attach to the account. The same Google or phone on a second phone restores Turso history.

## Non-goals

- Phone OTP as a fully offline verification method (SMS needs a network)
- Passwords, magic links, or Facebook login
- Storing diagnosis images, model weights, or reports in Supabase
- Splitting App.jsx into a new architecture in this workstream
- Logout as a primary farmer action
- A separate backend repo or new test framework

## Current state

- Frontend: React 18 + Vite 5 PWA, Vercel serverless `/api/*`
- Operational data already in Turso: diagnoses, analytics, feedback, presence, outbreaks, market prices
- Google Sign-In exists only inside the AgriChem tab (`src/agrichem/hooks/useAuth.tsx`)
- Identity is dual-written: Turso `users` is primary, optional Supabase REST fallback in `api/_lib/userStore.js`
- IndexedDB via localforage is used only for offline image bundle indexes
- `src/App.jsx` is a large shell (~10k lines); new auth/sync code must not grow it

## Architecture

```text
[PWA / IndexedDB] -- /api/* --> [Vercel]
                                  |-- Supabase Auth + app_users (identity only)
                                  |-- Turso (diagnoses, analytics, outbreaks, feedback, presence, prices)
                                  +-- AI providers (transient image inference, never persisted)
```

Frontend never talks to Turso or Supabase directly. Google GIS runs in the browser only to obtain an ID token. Phone collect, OTP send/verify, profile upsert, and session cookies all go through `/api/auth/*`. No `VITE_SUPABASE_*` keys. AI keys remain server-only. HMAC request signing on existing APIs stays.

### Store ownership

| Store | Owns | Never owns |
| --- | --- | --- |
| Supabase Auth + `app_users` | Google/phone identity, name, email, picture, locale, login timestamps | Diagnoses, images, analytics, outbreaks |
| Turso | Diagnoses, outbreaks, feedback, presence, market prices, analytics | Passwords, OTP, Google tokens, profile photos as source of truth |
| IndexedDB | Offline bundles, diagnosis outbox, pending phone, device enrollment flag | Cloud secrets, AI keys |

## Auth model

Supabase Auth is the only identity provider.

### Methods

1. **Google** if the device is online on first login attempt.
2. **Phone OTP** if Google is skipped, fails, or the farmer has no Google account. Phone is collected immediately, including offline.
3. **Guest** until either method succeeds. Guest can use Calendar, Learn, Diagnose, Library, and Copilot.

Phone format: Bangladesh national `01XXXXXXXXX`, stored as E.164 `+8801XXXXXXXXX`. Invalid numbers get an inline Bangla hint and are not saved.

### Device states

- `guest` — no Supabase user. Diagnoses in IndexedDB with `user_id = null`.
- `pending_phone` — phone saved locally, OTP not verified. Same data rules as guest, plus a thin online banner.
- `enrolled` — Supabase `user.id` is canonical. IndexedDB `auth_device` plus an httpOnly refresh cookie. This device never shows login again.

### One-time login

After Google success or OTP verify:

1. Upsert `app_users` in Supabase.
2. Set a long-lived httpOnly refresh cookie (~1 year) from `/api/auth/*`.
3. Write IndexedDB `auth_device = { userId, phone?, enrolledAt }`.
4. Attach every local diagnosis/outbox row to `userId`.
5. Sync outbox to Turso.
6. Dismiss all login UI on this device forever.

No passwords. Farmer UI has no logout. A later settings “switch account” is out of scope.

### Pending OTP while offline

If the farmer enters a phone with no network:

1. Save phone in IndexedDB (`pendingOtp: true`).
2. Keep the app fully usable as guest.
3. When online, send OTP once automatically (with a thin banner, not a modal).
4. On verify, follow the one-time login steps above.

OTP cannot be verified offline. Do not fake a signed-in user before Supabase confirms the OTP.

### Second device

A new phone starts as guest. One-time Google or the same phone OTP enrolls it. Turso rows for that `user_id` download into IndexedDB. No extra PIN.

### Account merge

`app_users` may hold `google_sub` and/or `phone`.

- Same Google account always maps to one user.
- Same verified phone always maps to one user.
- If a phone-first user later signs in with Google on a device that already has that verified phone, merge into the existing user.
- If Google and phone cannot be proven as the same person, keep two users. Do not merge on name or unverified phone.

## Data model

### Supabase `public.app_users`

Identity only. Columns:

- `id` uuid primary key, matches `auth.users.id`
- `google_sub` text unique nullable
- `phone` text unique nullable (E.164)
- `email` text
- `email_verified` boolean
- `name` text
- `picture_url` text
- `locale` text
- `created_at` timestamptz
- `last_login_at` timestamptz
- `login_count` integer

RLS: a user can select/update their own row. Service role is used only from Vercel. No diagnosis columns, no image URLs of crop photos, no storage buckets for reports.

Replace `supabase/users.sql` so `id` is `uuid` referencing `auth.users`, not a bigint identity with `google_sub` as the only key.

### Turso

Keep existing tables. Changes:

- `diagnoses.user_id` text nullable (Supabase uid)
- `feedback_entries.user_id` text nullable
- `outbreak_reports.user_id` text nullable
- Indexes on `user_id`
- Stop using Turso `users` as the identity source. Leave the table in place during rollout; new code must not read/write it. Drop in a later cleanup.

Analytics and presence stay anonymous visitor hashes. Do not put Supabase uids into `presence_log`.

### IndexedDB (localforage)

- `offline_image_bundles_v1` — unchanged
- `diagnoses_outbox` — local reports with `{ localId, payload, user_id, syncState: pending|synced|error, created_at, updated_at }`
- `auth_device` — `{ userId, phone, pendingOtp, enrolledAt }`

Crop images are transient AI input only. They are not stored in Supabase, Turso, or the outbox payload.

## Data flow

1. Diagnose writes IndexedDB first, always.
2. If enrolled and online, `/api/diagnoses` upserts to Turso with `user_id` from the verified session, not from the client body.
3. If Turso is down, outbox stays `pending`. UI chip: “saved on phone”.
4. On login success, every local row with `user_id = null` is stamped with the new uid, then flushed.
5. Online history reads merge Turso + local. Conflict rule: newest `created_at` wins. Never delete local data to resolve a conflict. Never overwrite a synced Turso row with an older local copy.
6. Second device pull: `GET /api/diagnoses` filtered by session `user_id`, then insert missing rows into IndexedDB.

`userStore` writes identity only to Supabase. Diagnoses APIs never write `app_users`.

## Mobile-first shell

Keep tabs: Calendar, Learn, Diagnose, Library. Copilot remains a FAB.

- One-thumb layout, 44px tap targets, large Bangla type, high-contrast cards, sticky bottom nav, safe-area padding.
- No login wall.
- Header avatar opens a compact sheet: Google if online, else phone field and “continue as guest”.
- Pending OTP is a thin top banner, not a modal.
- Enrolled state shows avatar + name only.
- Cloud AI degrades to the on-device engine when offline.
- PWA install prompt fires after the first successful diagnosis, not on first paint.
- Request persistent storage (`navigator.storage.persist`) after enrollment so IndexedDB is less likely to be evicted.

## API and code shape

Keep Vite + React + Vercel. Do not add a new backend.

| Area | Change |
| --- | --- |
| `src/auth/` | App-wide `AuthProvider`, Google button, phone collect/OTP, device enrollment. Lift out of AgriChem. |
| `src/offline/sync.js` | Outbox, attach-on-login, Turso pull. Diagnosis UI calls this only. |
| `api/auth/*` | Google + phone OTP through Supabase Auth. Long-lived httpOnly cookie. `/api/auth/me` is the only session read. |
| `api/_lib/userStore.js` | Supabase `app_users` only. No Turso identity writes. |
| `api/diagnoses.js`, feedback, outbreaks | Optional `user_id` from verified session. Guests stay null. |
| `src/App.jsx` | Mount `AuthProvider` and small chrome (avatar, OTP banner, sync chip). No new feature blocks inside the monolith. |
| AgriChem | Consume the app-wide auth context. Remove the tab-local provider as source of truth. |

Cookie name can stay `agrichem_session` during rollout or become `cabi_session`; pick `cabi_session` and accept the old cookie until it expires.

Server derives `user_id` from the cookie/Supabase session. Clients must not send a raw `user_id` that the server trusts.

## Error handling

| Case | Behavior |
| --- | --- |
| Google fails or popup blocked | Fall through to phone. Diagnose stays usable. |
| OTP send/verify fails | Keep pending phone. Retry with backoff. Stay guest. |
| No network | All writes IndexedDB. Banner “saved on phone”. |
| Turso 503 | Queue outbox. Read local history. |
| Supabase Auth down | Skip login. Do not create a fake user. |
| Sync conflict | Newest `created_at` wins. Log skipped row. Never delete local. |
| Invalid BD phone | Inline Bangla hint. Do not submit. |
| Enrolled device missing cookie | Silent refresh. If that fails, restore from `auth_device` and re-issue cookie when online. Do not show login. |

Fail closed for identity. Fail open for farming.

## Security

- No secrets in `VITE_` except the public Google client id (`VITE_GOOGLE_CLIENT_ID`).
- Supabase URL and service role key only on Vercel. No anon key in the frontend.
- HMAC signing remains on existing APIs.
- Session cookie: httpOnly, Secure, SameSite=Lax, long max-age.
- Crop images are never persisted in either cloud database.
- RLS on `app_users` so a farmer cannot read another profile even if the anon key is in the client.

## Testing

No new test runner. Use `npm run lint`, `npm run check`, `npm run test:offline`, plus focused Node checks against handlers.

Must cover:

- Google success
- Google fail → phone path
- Phone saved offline, OTP later
- OTP verify attaches IndexedDB outbox
- `/api/auth/me` with cookie
- Enrolled device with missing cookie does not force login UI
- Guest diagnosis stays local
- After login, all local rows get `user_id`
- Second device pull does not duplicate the same `created_at` + crop + disease
- Turso 503 leaves outbox `pending`
- `userStore` never writes diagnosis fields to Supabase
- Diagnoses API never writes `app_users`

Manual mobile pass: first open offline → save phone → diagnose → reconnect → OTP → history attached; second browser profile with same Google/phone sees Turso history.

## Rollout order

1. Supabase `app_users` schema + RLS
2. `userStore` writes to Supabase only
3. App-wide `AuthProvider` and guest-first UI
4. IndexedDB outbox and attach-on-login
5. Phone pending + OTP
6. Turso `user_id` columns and session-scoped reads
7. Second-device pull
8. Remove AgriChem-local auth as source of truth

Each step must keep guest Diagnose working.

## Improvements included

These are in scope because they are required for the split to work on a farmer phone:

- Persistent device session instead of default short JWTs
- Local-first outbox so rural connectivity does not drop reports
- Attach-on-login so guest work is not lost
- Header avatar + OTP banner instead of a login wall
- Install prompt after first diagnosis
- Persistent IndexedDB after enrollment

Out of scope improvements (do not do in this workstream):

- Refactoring `src/App.jsx` into route modules
- Phone-number change flow
- Multi-account switcher
- Push notifications for OTP
)

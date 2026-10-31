# Implementation Plan: Full-Stack Mobile Auth and Data Split

> **For agentic workers:** Follow the tasks in order. Each task is a complete unit with files, steps, and a verification command. Do not start a later task until the current one is green. Guest Diagnose must keep working after every task.

**Spec:** `docs/superpowers/specs/2026-10-31-fullstack-mobile-auth-design.md`  
**Branch:** continue on `261031-docs-fullstack-mobile-auth-design` or cut a feat branch from it.  
**Date:** 2026-10-31

## Goal

Make Plant Detective a guest-first, one-time-login PWA:

- Supabase = Auth + `app_users` only
- Turso = diagnoses / feedback / outbreaks / analytics (no identity)
- IndexedDB = device source of truth (outbox, pending phone, enrollment)

Google when online; otherwise save a BD phone now and complete OTP later. Attach all local diagnoses on success. Same Google/phone on a second phone restores Turso history. This device never shows login again.

## Architecture (locked)

```text
PWA (IndexedDB) -- /api/* --> Vercel
                               |-- Supabase Auth + app_users
                               |-- Turso app data
                               +-- AI providers (images never stored)
```

Browser never talks to Turso or Supabase. Google GIS only produces an ID token. Phone OTP, profile upsert, and cookies go through `/api/auth/*`. Session `user_id` is taken from the cookie, never from a trusted client body field.

Cookie: `cabi_session` (httpOnly, Secure, SameSite=Lax, Max-Age=1 year). Still read `agrichem_session` until it expires.

## File map

| Create | Why |
| --- | --- |
| `supabase/users.sql` (replace) | uuid `app_users` + RLS |
| `api/_lib/supabase.js` | REST helper, no Turso |
| `api/_lib/session.js` | cookie name, read session uid, set/clear cookie |
| `api/auth/phone.js` | collect / send OTP / verify |
| `api/auth/refresh.js` | re-issue cookie from enrolled device hint |
| `src/auth/AuthProvider.jsx` | app-wide guest / pending_phone / enrolled |
| `src/auth/phone.js` | BD phone normalize + validate |
| `src/auth/AuthSheet.jsx` | header avatar sheet |
| `src/auth/OtpBanner.jsx` | thin pending-OTP banner |
| `src/offline/sync.js` | outbox + attach-on-login + pull |
| `src/components/SyncChip.jsx` | “saved on phone” |
| `scripts/test-auth-store.mjs` | Node checks for store boundary + sanitizer |

| Modify | Why |
| --- | --- |
| `api/_lib/userStore.js` | Supabase-only identity; stop Turso `users` writes |
| `api/_lib/turso.js` | `user_id` columns; `getDiagnoses({ userId })`; stop identity use |
| `api/auth/google.js` | cookie rename; uid is Supabase uuid |
| `api/auth/me.js` | restore without forcing login UI |
| `api/community.js` | session-scoped diagnoses GET/POST |
| `src/main.jsx` | wrap `AuthProvider` |
| `src/App.jsx` | mount chrome; route history through `sync.js` only (minimal edits) |
| `src/agrichem/AgriChemApp.jsx` | drop local AuthProvider |
| `src/agrichem/hooks/useAuth.tsx` | re-export app-wide hook |
| `.env.example` | required Supabase server vars; no anon key |

Do **not** split `src/App.jsx`. Touch only the history load (~7105), history save (~7781), and a small header slot for avatar/banner/chip.

---

## Task 1: Supabase `app_users` schema

**Files:** `supabase/users.sql`

Replace the bigint/`google_sub`-only table with:

```sql
create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  google_sub text unique,
  phone text unique,
  email text,
  email_verified boolean default false,
  name text,
  picture_url text,
  locale text,
  created_at timestamptz default now(),
  last_login_at timestamptz default now(),
  login_count integer default 1
);

alter table public.app_users enable row level security;

create policy "users can read own row"
  on public.app_users for select
  using (auth.uid() = id);

create policy "users can update own row"
  on public.app_users for update
  using (auth.uid() = id);

create policy "service role all"
  on public.app_users for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

No diagnosis columns. No storage buckets.

**Verify:** file contains `uuid primary key` and does not mention diagnoses/images.

---

## Task 2: Session helper + cookie rename

**Files:** create `api/_lib/session.js`; modify `api/auth/google.js`, `api/auth/me.js`, `api/auth/logout.js`

- `SESSION_COOKIE = "cabi_session"`
- `LEGACY_COOKIE = "agrichem_session"`
- `SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60`
- `setSessionCookie(res, token)`
- `clearSessionCookie(res)` (clear both names)
- `readSessionToken(req)` — prefer `cabi_session`, fall back to legacy
- `getSessionUserId(req)` — verify JWT, check `exp`, return `payload.uid` or null

`google.js` / `me.js` / `logout.js` must import these helpers. JWT `uid` will become the Supabase uuid in Task 3.

**Verify:** `grep -n "agrichem_session" api/auth` only appears as `LEGACY_COOKIE` in `session.js`.

---

## Task 3: `userStore` writes Supabase only

**Files:** create `api/_lib/supabase.js`; rewrite `api/_lib/userStore.js`; update `.env.example`

`.env.example`:

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_USERS_TABLE=app_users
```

Remove `SUPABASE_ANON_KEY` from the example. Keep `VITE_GOOGLE_CLIENT_ID`.

`userStore` rules:

- `upsertUserProfile` writes **only** to Supabase `app_users` (service role).
- If Google login: create/find `auth.users` via Admin API (`POST /auth/v1/admin/users` with `email` + `email_confirm`, user metadata `google_sub`), then upsert `app_users` with `id = auth user uuid`.
- If phone verify: Admin API finds/creates user by `phone`, then upsert `app_users`.
- `id` returned to the client is the uuid string, never a Turso integer.
- In-memory Map remains for local/CI when Supabase is unset. Backend name: `"supabase"` or `"preview"`.
- Delete all Turso `INSERT INTO users` / `FROM users` from this file.
- `getUserById` reads Supabase (or memory). Never Turso.

Do not add `@supabase/supabase-js` unless REST becomes unreadable; prefer `fetch` like today.

**Verify:**

```bash
rg "FROM users|INTO users" api/_lib/userStore.js
# no matches
rg "SUPABASE_ANON_KEY" .env.example
# no matches
```

---

## Task 4: Phone OTP API

**Files:** create `api/auth/phone.js`; add Vercel rewrite if needed (file under `api/auth/` already maps to `/api/auth/phone`)

Endpoints on one handler, `action` in JSON body:

1. `POST { action: "send", phone: "01XXXXXXXXX" }`
   - Normalize to `+8801XXXXXXXXX`.
   - Reject invalid with 400 `{ error: "invalid_phone" }`.
   - Call Supabase Auth `POST /auth/v1/otp` with `{ phone }` using **service role**.
   - Return `{ ok: true, phone }` — never create `app_users` yet.

2. `POST { action: "verify", phone, token }`
   - `POST /auth/v1/verify` with `{ type: "sms", phone, token }`.
   - On success, `upsertUserProfile` with verified phone.
   - Set `cabi_session` cookie (1 year).
   - Return `{ user }`.

Rate-limit: 5 sends / phone / 10 min (reuse `createRateLimiter` or an in-memory map). CORS + credentials like `google.js`.

If Supabase is down: 503, no fake user.

**Verify:** invalid phone returns 400 without calling fetch (unit-test the normalizer in Task 10). Handler exports default function.

---

## Task 5: Silent refresh

**Files:** create `api/auth/refresh.js`; tweak `api/auth/me.js`

Enrolled-device restore must not trust a naked `userId`.

On first successful Google/OTP, server also creates a device enrollment:

- Generate `device_secret` (32 random bytes, hex).
- Store **only the SHA-256 hash** in Turso `device_enrollments(user_id, device_hash, created_at)`.
- Return `device_secret` once; client saves it in IndexedDB `auth_device`.

`POST /api/auth/refresh` body: `{ userId, deviceSecret }`.

1. If a still-valid cookie exists, rotate it and return `{ user }`.
2. Else hash `deviceSecret`, look up `device_enrollments`. Mismatch → `{ user: null }`.
3. Match → load `app_users`, issue a new 1-year cookie. No login UI.

`GET /api/auth/me` stays cookie-only. Never clear IndexedDB from the server. Never store `device_secret` in Supabase.

**Verify:** `me.js` still returns 200 `{ user: null }` on missing cookie (not 401). `refresh.js` refuses missing `deviceSecret`. Naked `{ userId }` does not set a cookie.

---

## Task 6: Turso `user_id` (no identity table use)

**Files:** `api/_lib/turso.js`, `api/community.js`

In `ensureSchema`:

```sql
ALTER TABLE diagnoses ADD COLUMN user_id TEXT;
ALTER TABLE feedback_entries ADD COLUMN user_id TEXT;
ALTER TABLE outbreak_reports ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_diagnoses_user ON diagnoses(user_id);
CREATE TABLE IF NOT EXISTS device_enrollments (
  device_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Wrap ALTERs in try/catch like `vit_prediction`.

`saveDiagnosis(entry)` inserts `user_id` (nullable).  
`getDiagnoses(filters)` accepts `userId`. When `userId` is set, `WHERE user_id = ?`. When not set, **do not** return other users’ rows to the PWA. Unauthenticated GET returns `[]` (analytics/dashboard can keep unscoped internal queries).

`handleDiagnosesPost`:

```js
const uid = await getSessionUserId(req);
entry.user_id = uid; // ignore body.user_id
```

`handleDiagnosesGet`:

```js
const uid = await getSessionUserId(req);
if (!uid) return res.status(200).json({ diagnoses: [], count: 0, persistence: "local" });
```

Same `user_id` stamping for feedback and outbreak POSTs. Presence stays hashed.

**Verify:** `rg "body.user_id" api/community.js` has no trusted assignment. Schema init still succeeds if columns already exist.

---

## Task 7: IndexedDB outbox + sync module

**Files:** create `src/offline/sync.js`

localforage stores:

- `diagnoses_outbox` — array of `{ localId, payload, user_id, syncState, created_at, updated_at }`
- `auth_device` — `{ userId, phone, pendingOtp, enrolledAt, deviceSecret }`

API (all async):

- `queueDiagnosis(payload)` — write IndexedDB first, `syncState: "pending"`, `user_id` from `auth_device` or null. No images in payload.
- `flushOutbox()` — POST pending rows to `/api/diagnoses` with credentials + existing HMAC helper. On 2xx mark `synced`. On 503/network leave `pending`.
- `attachLocalToUser(userId)` — stamp every row with `user_id == null`, then `flushOutbox()`.
- `pullRemoteHistory()` — GET `/api/diagnoses?limit=50` with credentials; merge by `created_at + crop + disease_name`; newest `created_at` wins; never delete local.
- `getLocalHistory()` — merged list for UI.
- `getAuthDevice()` / `setAuthDevice(partial)`
- `requestPersistentStorage()` — `navigator.storage?.persist()` after enrollment.

Conflict: never overwrite a `synced` Turso-backed row with an older local copy.

**Verify:** module has zero React imports. Payload keys match `sanitizeDiagnosisEntry` (`session_id`, `crop`, …).

---

## Task 8: App-wide AuthProvider + phone helper

**Files:**

- create `src/auth/phone.js`
- create `src/auth/AuthProvider.jsx`
- modify `src/main.jsx`
- modify `src/agrichem/hooks/useAuth.tsx` to re-export
- modify `src/agrichem/AgriChemApp.jsx` to remove nested provider

`src/auth/phone.js`:

- `isBdPhone(raw)` — `^01[3-9]\d{8}$` after stripping spaces/dashes
- `toE164(raw)` — `+880` + national without leading 0

`AuthProvider` state: `{ status: "guest"|"pending_phone"|"enrolled", user, loading, error }`

On mount:

1. `GET /api/auth/me` with credentials.
2. If user → `enrolled`, write `auth_device`, `requestPersistentStorage()`, `attachLocalToUser`, `pullRemoteHistory`.
3. If no user but `auth_device.userId` → `POST /api/auth/refresh`. Still no login UI.
4. If `auth_device.pendingOtp` and `navigator.onLine` → auto `send` OTP (Task 9 UI).

`loginWithGoogle(credential)` — existing `/api/auth/google`, then attach+flush+persist.

`savePhone(raw)` — validate, store `{ phone, pendingOtp: true }`, status `pending_phone`. If online, call send OTP.

`verifyOtp(token)` — `/api/auth/phone` verify, then same post-login sequence as Google.

No logout in the farmer UI. Keep `logout()` on the hook for AgriChem compatibility but do not render it in Plant Detective chrome.

Wrap in `src/main.jsx`:

```jsx
<ErrorBoundary>
  <AuthProvider>
    <App />
  </AuthProvider>
</ErrorBoundary>
```

AgriChem: delete `<AuthProvider>` wrapper; import `useAuth` from `src/auth/AuthProvider.jsx` (re-export from the old hook file so existing imports compile).

**Verify:** `rg "from \"./hooks/useAuth\"" src/agrichem/AgriChemApp.jsx` is gone. App still boots as guest if `/api/auth/me` fails.

---

## Task 9: Mobile chrome (avatar, OTP banner, sync chip)

**Files:**

- create `src/auth/AuthSheet.jsx`
- create `src/auth/OtpBanner.jsx`
- create `src/components/SyncChip.jsx`
- minimal `src/App.jsx` mounts

**AuthSheet** (header avatar):

- Guest + online → Google button (reuse GIS pattern from `src/agrichem/components/GoogleSignInButton.tsx`, move shared init into `src/auth/` if needed).
- Guest + offline or Google fail/skip → phone field `01…` + Continue as guest.
- `enrolled` → avatar + name only. No logout.

**OtpBanner:** only `pending_phone` && online. Copy in Bangla: “ফোন নিশ্চিত করুন” + 6-digit input. Not a modal.

**SyncChip:** visible when any outbox row is `pending` or `error`. Text: “ফোনে সংরক্ষিত” / “saved on phone”.

Mount points in `src/App.jsx`:

- Banner above the existing top bar
- Avatar on the existing header row
- Chip near Diagnose result / history

Also: PWA install prompt only after the first successful `queueDiagnosis` (gate the existing install logic; do not add a new library).

**Verify:** Diagnose tab usable with `status === "guest"`. No full-screen login.

---

## Task 10: Wire Diagnose save/load through sync.js

**Files:** `src/App.jsx` only around history

Replace the mount fetch (`~7105`) with:

```js
getLocalHistory().then(setHistory)
flushOutbox()
if (enrolled) pullRemoteHistory().then(...)
```

Replace the POST block (`~7781`) with `queueDiagnosis(entry)` then `flushOutbox()`. Keep writing a short `ud-history` localStorage mirror if other UI still reads it; prefer IndexedDB as source.

Do not put image base64 in the outbox payload.

**Verify:** turning off network, running a diagnosis (or calling `queueDiagnosis` from the console) leaves a `pending` row; restoring network flushes it.

---

## Task 11: Focused Node checks

**Files:** create `scripts/test-auth-store.mjs`; add `"test:auth": "node scripts/test-auth-store.mjs"` to `package.json`

Cover without a live Supabase/Turso:

1. `isBdPhone` / `toE164` — good `01712345678` → `+8801712345678`; reject `123`.
2. `sanitizeDiagnosisEntry` ignores `user_id` in body (add assertion in the test by importing the sanitizer).
3. `userStore.authStatus` / a mocked upsert path never includes diagnosis keys (`crop`, `symptoms`, `image`).
4. Cookie helper: `readSessionToken` prefers `cabi_session`.

Keep tests side-effect free. No network.

Then:

```bash
npm run test:auth
npm run lint
npm run check
```

**Verify:** all three exit 0.

---

## Task 12: Manual mobile pass (do not skip)

1. Offline first open → guest Diagnose works.
2. Save phone `01…` while offline → banner appears when back online.
3. OTP success → local history attached, chip clears after flush.
4. Kill cookie in DevTools, reload → no login sheet (`refresh` + `auth_device`).
5. Second browser profile, same Google or phone → history appears after one-time login.
6. AgriChem tab still shows the signed-in user (shared provider).

Record any failure in the PR description; do not ship if step 1 regresses.

---

## Env checklist (Vercel)

Required for production auth:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_CLIENT_ID`
- `SESSION_SECRET` (32+ hex)
- existing Turso + AI keys

Enable Supabase Auth providers: Google, Phone. SMS provider (Twilio/MessageBird/etc.) must be configured in the Supabase project. This repo does not vendor SMS credentials.

## Out of scope (do not do)

- Split `src/App.jsx`
- Logout button in farmer chrome
- Phone change / multi-account
- Push OTP
- Dropping Turso `users` table (leave it; stop writing)
- `@supabase/supabase-js` in the browser
)

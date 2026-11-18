# Production Hardening Audit — Root-Cause Report & Implementation

**Branch:** `feature/production-hardening` (from `main` @ `6d0a98c`)
**Date:** 2026-11-18
**Scope:** version-metadata centralization, cache-discrepancy root cause + minimal fix, deployment observability. Six-Pillar functionality untouched.

---

## 1. Issues reported from the live deployment

| # | Observed in production | Verified during this audit |
|---|---|---|
| 1 | `package.json` reports 4.1.0 | ✅ confirmed (main @ `6d0a98c`) |
| 2 | `/api/health` reports 4.0.0 | ✅ confirmed live: `"version": "4.0.0"` |
| 3 | Homepage & manifest show CDN cache HIT, age ≈ 30,000 s | ✅ root-caused (see §3); headers now MISS/age 0 at audit time, but the *rule gap* that allowed the HIT remained in the config |
| 4 | Service worker updated more recently than homepage/manifest | ✅ explained by §3.3 — `sw.js` requests bypass the browser HTTP cache (`updateViaCache: 'none'`) and are revalidated per registration update, while the HTML shell could be served stale from the CDN edge |
| 5 | Six-pillar code confirmed in production bundle, deployment READY | ✅ confirmed: bundle contains "কেসে সংরক্ষণ" (Save to Case); deployment is `6d0a98c` |

Note on the title: production serves `স্মার্ট ফসল রোগ নির্ণয় | CABI Smart Crop Diagnosis`. That is correct — the v5 rebrand exists only in the separate `cro-health-intelligence` repo; `cabi-diagnosis` main never rebranded. No action needed.

---

## 2. Task 1 — Version metadata centralization

### Before (three independent sources)

- `package.json` → `4.1.0` (bumped by hand, used by nobody at runtime)
- `api/health.js` → `version: "4.0.0"` **hardcoded string** — drifted two minor versions behind package.json; nothing tied them together
- `public/manifest.json` → no `version` field at all
- Frontend → no version anywhere (About/PWA info impossible)

### After (single source of truth)

`scripts/generate-build-meta.mjs` runs at the start of every `npm run build`:

```
package.json version ─┐
git rev-parse HEAD ───┼─→ src/buildMeta.js      (frontend: APP_VERSION, BUILD_COMMIT, BUILD_TIME, BUILD_META)
VERCEL_GIT_COMMIT_SHA ┘    api/_lib/buildInfo.js (API: BUILD_INFO {version, commit, buildTime})
```

Consumers:

| Surface | Before | After |
|---|---|---|
| `/api/health` | `"4.0.0"` hardcoded | `version: BUILD_INFO.version` + new `build: {commit, buildTime}` block |
| About panel (new) | — | `BUILD_META.appVersion / commit / buildTime` |
| HTML shell | — | `<meta name="app-version">`, `<meta name="build-commit">`, `<meta name="build-time">` stamped into `dist/index.html` post-build (readable by curl/uptime monitors without executing the bundle) |
| PWA manifest | no version | `version: "5.0.0"`, `version_name: "v5.0.0"` (source manifest + stamped dist manifest) |
| package.json | 4.1.0 | **5.0.0** (semver: new About feature + new API response field) |

Robustness: `VERCEL_GIT_COMMIT_SHA` env override → `git rev-parse` → `"unknown"` fallback (shallow CI clones still produce meaningful output). The generated files are committed, so `npm run build` regeneration and the committed state stay consistent; regeneration is deterministic apart from the timestamp, which only changes when a build actually runs.

Verification (all surfaces agree):

```
package.json                 5.0.0
src/buildMeta.js             APP_VERSION="5.0.0", BUILD_COMMIT="6d0a98c"
api/_lib/buildInfo.js        version="5.0.0", commit="6d0a98c"
dist/index.html              <meta name="app-version" content="5.0.0">, build-commit 6d0a98c
dist/manifest.json           version=5.0.0, version_name=v5.0.0
/api/health (dry-run)        {"version":"5.0.0","build":{"commit":"6d0a98c","buildTime":"…"}}
```

---

## 3. Task 2 — Caching root-cause analysis

### 3.1 The mechanism (why `/` was cached at the edge)

`vercel.json` header rules are matched **against the incoming request path**, before rewrites are applied. The SPA fallback rewrite:

```json
{ "source": "/(.*)", "destination": "/index.html" }
```

means a request to `/` *becomes* `/index.html` internally — but the header rule `"source": "/index.html"` only ever matches a literal `/index.html` request. Requests to `/` fell through to **Vercel's platform default**:

```
cache-control: public, max-age=0, must-revalidate
x-vercel-cache: HIT         (age ≈ 30,000 s during the earlier audit)
```

`max-age=0, must-revalidate` should force revalidation per HTTP semantics — but `public` marks the response shareable, and Vercel's edge is entitled to serve a HIT without forwarding the conditional request until its internal s-maxage window (observed ≈ 8.3 h) expires. That is exactly the stale-shell symptom: users could load a days-old HTML shell referencing yesterday's hashed assets. The meta `http-equiv` cache directives in `<head>` do not override real HTTP response headers, so they were decorative.

Live confirmation at audit time (after the most recent deploy had rotated the edge): `/` → `x-vercel-cache: MISS`, but **still** `cache-control: public, max-age=0, must-revalidate` — proving the rule gap, not a transient: the no-store rule for `/index.html` never applied to `/`.

### 3.2 Why the service worker looked "newer" than the shell

`sw.js` is fetched with `updateViaCache: 'none'` and re-checked on every page load + 60 s poll, so the browser always revalidates it. The HTML shell had no such guarantee — it could come from the CDN edge HIT. Result: a *fresh SW* running against a *stale shell*, which also explains issue #4 in the audit (SW newer than homepage/manifest).

### 3.3 The minimal fix (one rule + one reload guard)

**`vercel.json`** — add the missing rule; nothing else changed:

```json
{ "source": "/", "headers": [
    { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0" },
    { "key": "X-Content-Type-Options", "value": "nosniff" } ] }
```

`s-maxage=0` explicitly zeroes the shared/edge cache window — the part `max-age=0` alone could not guarantee. Hashed `/assets/*` keep `public, max-age=31536000, immutable` (content-addressed, correctness preserved); `/api/*` keep `no-store`; `/sw.js` and `/manifest.json` keep their no-store rules.

**`index.html`** — PWA update guard so existing installed users land on a new deployment without a manual refresh:

```js
const wasControlledAtLoad = !!navigator.serviceWorker.controller;
let firstClaimSkipped = wasControlledAtLoad;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (!wasControlledAtLoad && !firstClaimSkipped) { firstClaimSkipped = true; return; }
  window.location.reload();
});
```

- Returning user (page already controlled): any mid-session `controllerchange` is a real deployment → reload once.
- Fresh user: the first `controllerchange` is this session's own install claiming the page; the shell was just fetched, so skip it (prevents the reload-loop footgun of a naive listener).
- Combined with the SW's existing `skipWaiting()` + 60 s `registration.update()` poll, an open PWA now converges on the latest deployment within ~60 s, and the next navigation gets a fresh shell via the `/` no-store rule.

### 3.4 What was deliberately NOT changed

- No `no-store` on hashed assets or images — `immutable` caching preserved (Task: "do not blindly disable caching").
- No change to the SW's network-first navigation strategy or cache-versioning scheme (`cabi-v6-*` date-based names already force full cache refresh on deploy).
- No `cleanUrls`/trailing-slash or rewrite changes — rewrite table untouched.
- The `http-equiv` meta tags stay (harmless belt-and-braces for exotic proxies).

### 3.5 Regression guard

`scripts/verify-cache-headers.mjs` re-implements the path-to-regexp matching for our rules and asserts the intended `Cache-Control` for `/`, `/index.html`, `?source=pwa` variant, `/sw.js`, `/manifest.json`, hashed assets (immutable) and `/api/*` (no-store). Run locally in CI-style:

```
node scripts/verify-cache-headers.mjs
→ All 8 checks passed (matrix printed in output)
```

---

## 4. Task 3 — About/System Information panel

`src/components/AboutPanel.jsx` — lightweight modal, opened by the new ℹ️ button in the app header (next to the dark-mode toggle). **Not** on the Home dashboard; zero changes to Home.

Contents:

- **বিল্ড তথ্য · BUILD** — app version (v5.0.0), commit (6d0a98c), build time (bn-BD locale), stale-shell warning if the HTML shell's stamped version ≠ bundle version (cache regression made visible in the field)
- **সিস্টেম · SYSTEM** — network online/offline (live), app mode (installed PWA vs browser, via `display-mode: standalone`), service-worker state, "check for update" button (calls `registration.update()`; shows a notice when a waiting worker exists)
- **Privacy line** — the app's existing photo-privacy commitment

Verified in-browser (light + dark): dialog opens from the header, shows correct values, update button works, no console errors. Screenshots: `docs/screenshots/about-panel-light.png`, `about-panel-dark.png`.

---

## 5. Task 4 — Regression safeguards (all preserved)

| Safeguard | Status |
|---|---|
| Six pillars, Case Management, Detect/Treat/Prevent/Monitor/Evaluate/Learn | ✅ untouched — no changes to any six-pillar component |
| Offline ONNX diagnosis | ✅ `test:offline` ALL PASS |
| Online diagnosis waterfall | ✅ no API/SDK changes; `/api/health` gained a `build` field (additive) |
| AgriChem pesticide tab | ✅ untouched |
| Five primary navigation destinations | ✅ untouched (About is a header modal, not a tab) |
| PWA installation | ✅ manifest gains `version`/`version_name` only |
| SW offline behavior | ✅ network-first strategy unchanged; auto-reload verified end-to-end (new SW → activation → exactly one reload, no loop, new cache active) |
| Privacy commitments | ✅ reiterated in the About panel; no new data collection |
| API signing/security | ✅ untouched (HMAC signing, CORS, rate limits) |
| Turso/Supabase integrations | ✅ untouched |

## 6. Task 5 — Tests & verification results

| Gate | Result |
|---|---|
| `npm run lint` | ✅ 0 errors, 1 pre-existing warning (`hasKeywordOverlap` in cropDiseases.js — present on main) |
| `npm run format:check` | ✅ all files clean |
| `npm run build` | ✅ 7.9 s, build-meta generation + HTML/manifest stamping confirmed in output |
| `npm run test:offline` | ✅ ALL PASS |
| Version consistency | ✅ 6/6 surfaces report 5.0.0 @ 6d0a98c (package.json, buildMeta.js, buildInfo.js, health dry-run, dist HTML stamps, dist manifest) |
| Cache headers (offline simulation) | ✅ 8/8 checks pass (`scripts/verify-cache-headers.mjs`) |
| About panel (browser) | ✅ light + dark verified, values correct, no console errors |
| PWA update lifecycle (browser) | ✅ controlled page + new SW → single auto-reload, no loop, cache rotated, offline fallback intact |

**Production-preview validation:** header behavior on the real edge requires a Vercel deployment; the `/` rule is config-only and takes effect on the next deploy of this branch. Recommend verifying on the PR's preview URL with:
`curl -sI https://<preview>.vercel.app/ | grep -iE "cache-control|x-vercel-cache"` → expect `no-cache, no-store, must-revalidate, max-age=0, s-maxage=0` and `x-vercel-cache: MISS`.
Note: verification of the deployed `/` header is only possible after merge/deploy (this task explicitly forbids deploying); the preview check command is included here for the reviewer.

## 7. Files changed

```
api/health.js                        version from BUILD_INFO + build block
api/_lib/buildInfo.js                (new, generated) API build metadata
index.html                           SW controllerchange auto-reload guard
package.json                         5.0.0; build runs generate-build-meta first
public/manifest.json                 version + version_name
scripts/generate-build-meta.mjs      (new) single source of truth generator
scripts/strip-crossorigin.js         + version stamping (HTML meta + manifest)
scripts/verify-cache-headers.mjs     (new) cache rule regression guard
src/App.jsx                          AboutPanel import, state, header ℹ️ button, modal
src/buildMeta.js                     (new, generated) frontend build metadata
src/components/AboutPanel.jsx        (new) About/System Information modal
vercel.json                          `/` no-store rule
docs/production-hardening-report.md  (new) this report
docs/screenshots/about-panel-*.png   (new) UI evidence
README.md                            badge + v5.0.0 changelog entry
```

## 8. Deployment notes (post-merge, requires authorization)

1. Merge → Vercel auto-deploys `main`.
2. Verify: `curl -sI https://cabi.krishiai.live/` shows the no-store header and `x-vercel-cache: MISS`; `curl -s https://cabi.krishiai.live/api/health` reports `"version": "5.0.0"` with the `build.commit` matching the merged SHA.
3. Existing installed PWA users: next app open fetches a fresh shell (no-store `/`), and any open instance picks up the new SW within ~60 s and reloads once.
4. Rollback: single-purpose commits — revert the vercel.json commit alone if any edge anomaly appears.

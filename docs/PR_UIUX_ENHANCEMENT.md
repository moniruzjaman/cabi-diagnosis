# PR: উদ্ভিদ গোয়েন্দা UI/UX Enhancement Plan — Execution

Executes the attached **UI/UX Enhancement Report** (`উদ্ভিদ_গোয়েন্দা_UI_UX_Enhancement_Report.pdf`)
as code on branch `feat/uiux-enhancement-plan`, following its Phase 1–5 handoff
sequence and its Must-have priority list. Everything is verified: lint, prettier,
the full test suite (incl. a new design-token regression suite), the offline
ensemble tests, and the production build.

## What changed (mapped to the report)

### Phase 1 — Design foundations
- `src/data/themes.js` is now the **single token source**: removed the
  duplicate object keys (primary/primaryDark/primaryLight/danger/border/shadow
  were declared twice with the last value silently winning) while keeping the
  surviving runtime values exactly — zero visual change.
- Added structural tokens: `SPACING` (8-point), `TYPOGRAPHY`, `RADII`,
  `TOUCH_TARGET` (44px minimum), plus status/severity conventions
  (`STATUS_TONES`, `SEVERITY_LEVELS`, `toneColors`) that always pair
  **icon + Bangla label + tone color** (never color-only, report §8).
- `App.jsx` `C_LIGHT` is now `{ ...lightThemeFull }` — the static palette can
  no longer drift from the runtime theme (it had: `#006A4E` vs `#046A1A`).
- CSS `:root` variables in `GLOBAL_STYLE` aligned to the runtime palette so
  `.bottom-nav` and friends match the JS theme.

### Phase 2 — Reusable components (new `src/components/ui/`)
`Button`, `Badge`, `StatusBadge`, `SeverityBadge`, `Card`, `EmptyState`,
`ActionBlock` ("এখন যা করবেন" block, §5.2), `OfflineBanner` + barrel + usage
README. All theme-aware via a `C` prop, all ≥44px touch targets.

### Phase 3 — Core workflow (report §7)
- **§7.1 Home dashboard** — section order now: greeting/crop context →
  primary CTA → **new urgent "এখন প্রয়োজন" strip** (due follow-ups or active
  cases, one glanceable line) → **today's decision card moved up** → six-pillar
  grid → seasonal risk → reminders/cases/recent → learning → market ticker.
- **§7.2 Diagnosis wizard** — sticky fixed Back/Continue footer, inline
  validation messages (no more silently disabled button), required/optional
  chips on every step title, one-line "কেন জরুরি" per step, information
  preview chips before submission, meaningful offline analysis loading state,
  explicit offline promise, low-confidence uncertainty badge, dominant
  next-action block, 44px pills.
- **§7.3 Diagnosis results** — dominant next-action block keyed off urgency,
  low-confidence (<40%) uncertainty warning; non-chemical IPM options remain
  ahead of chemical options.
- **§7.4 Case management** — case status and severity now use the shared
  `StatusBadge`/`SeverityBadge` conventions (icon + label + color), empty case
  list becomes an `EmptyState` with one obvious next action.

### Phase 4 — Supporting surfaces
- **§7.5 "আরও" tools sheet** — grouped into পরিকল্পনা ও ঝুঁকি /
  শনাক্তকরণ ও নিরাপদ প্রয়োগ / ইতিহাস ও শেখা; open tool marked with border +
  "✓ এখন খোলা" (`aria-current`), no dead ends.
- **Global offline banner** on every tab ("অফলাইনে আছেন — নির্ণয় ও কেস
  ব্যবস্থাপনা চালু থাকবে; সিঙ্ক পরে হবে"), reusing `useNetworkStatus`.

### Phase 5 — Quality assurance
- `npm run lint` — clean
- `npm run format:check` — clean
- `npm test` — all suites pass (incl. new `designTokens.test.mjs` guarding
  the token consolidation, case-status coverage and 44px touch targets)
- `npm run test:offline` — ensemble tests pass
- `npm run build` — production build succeeds
- Turso: `scripts/verify-turso-config.mjs` added — smoke-checks the **existing**
  env-driven Turso/libsql configuration (`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`),
  documents the documented local-JSON fallback when unset, and proves the
  client path with a read-only `SELECT 1` (works with `file:` URLs too — no
  migrations, no production config changes).

## Scope boundary respected (report §14)
No new navigation tab, no schema/DB migrations, no diagnosis-model or privacy
changes, offline-first case strategy untouched, AgriChem (TypeScript) module
untouched, photos still never leave the browser.

## Success criteria check (report §12)
- Home, wizard, result and case screens each expose one obvious next action ✔
- Journey (JourneyProgress) and six-pillar model preserved; no new tab ✔
- Warnings/uncertainty readable (icon + text + color) ✔
- Offline/sync states explicit and trustworthy ✔
- Bengali-first copy maintained throughout ✔

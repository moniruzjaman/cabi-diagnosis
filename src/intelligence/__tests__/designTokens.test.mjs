// Design-token tests — guards the UI/UX Enhancement Plan Phase 1
// consolidation:
//  - themes.js keeps the runtime palette (no silent duplicate-key drift)
//  - STATUS_TONES covers the crop-health case lifecycle (CASE_STATUSES)
//  - SEVERITY_LEVELS covers every NewCaseForm severity option
//  - toneColors resolves all five tones with icon+label+color conventions
//  - touch-target token respects the 44px minimum (plan §8)
import {
  lightTheme,
  darkTheme,
  lightThemeFull,
  darkThemeFull,
  SPACING,
  TYPOGRAPHY,
  RADII,
  TOUCH_TARGET,
  STATUS_TONES,
  SEVERITY_LEVELS,
  toneColors,
  getTheme,
} from "../../data/themes.js";
import { CASE_STATUSES, STATUS_LABELS_BN } from "../../data/cropHealthCases.js";

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

// 1. Runtime palette preserved after de-duplication (last-value wins).
assert(lightTheme.primary === "#046A1A", `lightTheme.primary is runtime green, got ${lightTheme.primary}`);
assert(lightTheme.primaryDark === "#023E11", `lightTheme.primaryDark is #023E11, got ${lightTheme.primaryDark}`);
assert(lightTheme.danger === "#E6010A", `lightTheme.danger is runtime red, got ${lightTheme.danger}`);
assert(darkTheme.primary === "#2D9D14", `darkTheme.primary is dark green, got ${darkTheme.primary}`);
assert(lightThemeFull.heroGradient.includes("#046A1A"), "lightThemeFull.heroGradient keeps the runtime gradient");
assert(lightThemeFull.primaryXDark === "#011a08", "lightThemeFull exposes primaryXDark");
assert(darkThemeFull.bgHeader === "#1e293b", "darkThemeFull keeps dark header surface");

// 2. Full themes extend the core palettes (no key loss from the rewrite).
for (const key of Object.keys(lightTheme)) {
  assert(key in lightThemeFull, `lightThemeFull inherits core key ${key}`);
}
for (const key of Object.keys(darkTheme)) {
  assert(key in darkThemeFull, `darkThemeFull inherits core key ${key}`);
}

// 3. Every case status has a status convention (icon + tone + Bangla label).
for (const status of CASE_STATUSES) {
  const cfg = STATUS_TONES[status];
  assert(!!cfg, `STATUS_TONES covers case status ${status}`);
  assert(!!cfg && typeof cfg.labelBn === "string" && cfg.labelBn.length > 0, `status ${status} has Bangla label`);
  assert(!!cfg && typeof cfg.icon === "string" && cfg.icon.length > 0, `status ${status} has an icon (no color-only)`);
}
// Each case status label matches the existing cropHealthCases copy.
assert(STATUS_TONES.active.labelBn === STATUS_LABELS_BN.active, "active label matches cropHealthCases copy");
assert(STATUS_TONES.closed.labelBn === STATUS_LABELS_BN.closed, "closed label matches cropHealthCases copy");

// 4. Severity conventions cover the field severities used by NewCaseForm.
for (const sev of ["none", "low", "moderate", "high", "severe"]) {
  const cfg = SEVERITY_LEVELS[sev];
  assert(!!cfg && !!cfg.labelBn && !!cfg.icon, `SEVERITY_LEVELS covers ${sev} with icon+label`);
}

// 5. toneColors resolves every tone for both themes (bg/border/fg/solid).
for (const theme of [lightThemeFull, darkThemeFull]) {
  for (const tone of ["success", "warning", "danger", "info", "neutral"]) {
    const t = toneColors(theme, tone);
    assert(
      !!t.bg && !!t.border && !!t.fg && !!t.solid,
      `${tone} resolves on ${theme === lightThemeFull ? "light" : "dark"} theme`,
    );
  }
}
assert(toneColors(lightThemeFull, "unknown-tone").fg != null, "unknown tone falls back to neutral");

// 6. Structural tokens exist and respect accessibility floors (plan §8).
assert(TOUCH_TARGET.minHeight >= 44, `touch target minHeight >= 44, got ${TOUCH_TARGET.minHeight}`);
assert(TOUCH_TARGET.minWidth >= 44, `touch target minWidth >= 44, got ${TOUCH_TARGET.minWidth}`);
assert(SPACING.sm === 8 && SPACING.md === 12 && SPACING.lg === 16, "8-point spacing scale present");
assert(RADII.pill === 999, "pill radius token present");
assert(
  typeof TYPOGRAPHY.fontFamily === "string" && TYPOGRAPHY.fontFamily.includes("Noto Sans Bengali"),
  "Bengali-first font stack token",
);

// 7. getTheme still resolves both named themes (public API unchanged).
assert(getTheme("light") === lightThemeFull, "getTheme('light') unchanged");
assert(getTheme("dark") === darkThemeFull, "getTheme('dark') unchanged");

console.log(`\ndesignTokens.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

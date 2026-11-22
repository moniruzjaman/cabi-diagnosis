/**
 * Dark Mode Theme System for CABI Plant Detective
 *
 * Single source of truth for design tokens (UI/UX Enhancement Plan —
 * Phase 1 "Design foundations"). Tokens are aligned with C_LIGHT in
 * App.jsx for visual consistency. Includes tinted backgrounds and
 * borders for dark-mode compatibility.
 * Bangladesh Flag Colors: Green #046A1A (runtime primary), Red #E6010A
 * (runtime danger); the original flag-palette variants #006A4E / #F42A41
 * remain documented in the git history.
 *
 * Palette rationale (Sep 2026 logo refresh): primary green + danger red
 * are drawn from the app icon; accent gold is sampled from the logo's
 * leaf highlight. Backgrounds stay white/near-white as the neutral
 * canvas the green/red/gold sit on.
 *
 * NOTE: this file previously contained duplicate object keys (primary,
 * primaryDark, primaryLight, danger, border, shadow and heroGradient
 * were each declared twice; JavaScript silently keeps the LAST value).
 * The duplicates have been removed and the surviving values are exactly
 * the ones the runtime used before, so appearance is unchanged.
 */

// ─── Core palettes ─────────────────────────────────────────────────────────────

export const lightTheme = {
  bg: "#f4f6f8",
  bgCard: "#ffffff",
  bgMuted: "#f0f2f5",
  text: "#1a1d21",
  textMuted: "#5f6672",
  textLight: "#8e95a2",
  primary: "#046A1A",
  primaryDark: "#023E11",
  primaryLight: "#2D9D14",
  border: "#e2e5ea",
  shadow: "0 2px 8px rgba(0,0,0,0.06)",
  danger: "#E6010A",
  warning: "#d97706",
  success: "#16a34a",
  blue: "#2563eb",
};

export const darkTheme = {
  bg: "#0f172a",
  bgCard: "#1e293b",
  bgMuted: "#334155",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textLight: "#94a3b8",
  primary: "#2D9D14",
  primaryDark: "#1a7a3a",
  primaryLight: "#8fdb2c",
  border: "#475569",
  shadow: "0 1px 3px rgba(0,0,0,0.3)",
  danger: "#ff4d4a",
  warning: "#f59e0b",
  success: "#4ade80",
  blue: "#3b82f6",
};

// ─── Tinted backgrounds & borders for dark-mode compatibility ─────────────────
// Light theme uses soft pastels; dark theme uses deep muted tones.

const lightTints = {
  bgDanger: "#fef2f2",
  bgSuccess: "#f0fdf4",
  bgWarning: "#fffbeb",
  bgInfo: "#eff6ff",
  bgBlue: "#f0f9ff",
  bgPurple: "#faf5ff",
  bgTeal: "#ecfeff",
  bgOrange: "#fff7ed",
  borderDanger: "#fecaca",
  borderSuccess: "#bbf7d0",
  borderWarning: "#fcd34d",
  borderInfo: "#bfdbfe",
  borderBlue: "#bae6fd",
  borderPurple: "#e9d5ff",
  borderTeal: "#a5f3fc",
  borderOrange: "#fed7aa",
  badgeSuccess: "#dcfce7",
  badgeWarning: "#fef3c7",
  textSuccess: "#14532d",
  textDanger: "#991b1b",
  textWarning: "#92400e",
  textInfo: "#1e40af",
  textBlue: "#0369a1",
  textPurple: "#6b21a8",
  textTeal: "#155e75",
  textOrange: "#9a3412",
};

const darkTints = {
  bgDanger: "#450a0a",
  bgSuccess: "#052e16",
  bgWarning: "#451a03",
  bgInfo: "#172554",
  bgBlue: "#0c4a6e",
  bgPurple: "#3b0764",
  bgTeal: "#134e4a",
  bgOrange: "#431407",
  borderDanger: "#7f1d1d",
  borderSuccess: "#166534",
  borderWarning: "#92400e",
  borderInfo: "#1e40af",
  borderBlue: "#075985",
  borderPurple: "#7e22ce",
  borderTeal: "#0f766e",
  borderOrange: "#c2410c",
  badgeSuccess: "#166534",
  badgeWarning: "#92400e",
  textSuccess: "#4ade80",
  textDanger: "#fca5a5",
  textWarning: "#fcd34d",
  textInfo: "#93c5fd",
  textBlue: "#7dd3fc",
  textPurple: "#c084fc",
  textTeal: "#5eead4",
  textOrange: "#fb923c",
};

export const lightThemeFull = {
  ...lightTheme,
  primaryXDark: "#011a08",
  accent: "#F0B90B",
  accentLight: "#F8E36F",
  accentDark: "#B8860B",
  bgHeader: "#ffffff",
  bgNav: "#f0f2f5",
  borderFocus: "#1a8a5e",
  shadowMd: "0 4px 16px rgba(0,0,0,0.08)",
  shadowLg: "0 8px 32px rgba(0,0,0,0.12)",
  heroGradient: "linear-gradient(135deg, #023E11 0%, #046A1A 50%, #2D9D14 100%)",
  game1: "#7c3aed",
  game2: "#0891b2",
  game3: "#ea580c",
  ...lightTints,
};

export const darkThemeFull = {
  ...darkTheme,
  primaryXDark: "#052e16",
  accent: "#f7d354",
  accentLight: "#F8E36F",
  accentDark: "#B8860B",
  bgHeader: "#1e293b",
  bgNav: "#1e293b",
  borderFocus: "#4ade80",
  shadowMd: "0 4px 16px rgba(0,0,0,0.3)",
  shadowLg: "0 8px 32px rgba(0,0,0,0.4)",
  heroGradient: "linear-gradient(135deg, #052e16 0%, #0a6b1f 50%, #2D9D14 100%)",
  game1: "#8b5cf6",
  game2: "#06b6d4",
  game3: "#f97316",
  ...darkTints,
};

// ─── Structural tokens (Phase 1) ───────────────────────────────────────────────
// 8-point spacing system and shared scales for the atomic UI kit
// (src/components/ui). All Bangla-first screens use these so rhythm is
// consistent across mobile / tablet / desktop breakpoints.

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const TYPOGRAPHY = {
  fontFamily: "Inter, 'Noto Sans Bengali', sans-serif",
  fontFamilyHeadline: "'Plus Jakarta Sans', 'Noto Sans Bengali', sans-serif",
  size: { xs: 10, sm: 12, md: 13.5, lg: 15, xl: 17, hero: 21 },
  lineHeightTight: 1.3,
  lineHeightBody: 1.6,
};

export const RADII = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

/** Minimum interactive touch target (plan §8: 44–48px touch targets). */
export const TOUCH_TARGET = { minHeight: 44, minWidth: 44 };

// ─── Tone conventions (Phase 1) ────────────────────────────────────────────────
// Status/severity are NEVER communicated by color alone (plan §8): every
// tone resolves to an icon + label + color triple.

/**
 * Resolve a semantic tone to concrete colors from the active theme.
 * @param {Object} C - active theme tokens (lightThemeFull / darkThemeFull)
 * @param {"success"|"warning"|"danger"|"info"|"neutral"} tone
 * @returns {{bg: string, border: string, fg: string, solid: string}}
 */
export function toneColors(C, tone) {
  const t = C || {};
  const map = {
    success: {
      bg: t.bgSuccess || "#f0fdf4",
      border: t.borderSuccess || "#bbf7d0",
      fg: t.textSuccess || "#14532d",
      solid: t.success || "#16a34a",
    },
    warning: {
      bg: t.bgWarning || "#fffbeb",
      border: t.borderWarning || "#fcd34d",
      fg: t.textWarning || "#92400e",
      solid: t.warning || "#d97706",
    },
    danger: {
      bg: t.bgDanger || "#fef2f2",
      border: t.borderDanger || "#fecaca",
      fg: t.textDanger || "#991b1b",
      solid: t.danger || "#E6010A",
    },
    info: {
      bg: t.bgInfo || "#eff6ff",
      border: t.borderInfo || "#bfdbfe",
      fg: t.textInfo || "#1e40af",
      solid: t.blue || "#2563eb",
    },
    neutral: {
      bg: t.bgMuted || "#f0f2f5",
      border: t.border || "#e2e5ea",
      fg: t.textMuted || "#5f6672",
      solid: t.textMuted || "#5f6672",
    },
  };
  return map[tone] || map.neutral;
}

/** Status badge conventions (plan §5.1): icon + tone + Bangla label. */
export const STATUS_TONES = {
  new: { tone: "info", icon: "🆕", labelBn: "নতুন" },
  in_progress: { tone: "info", icon: "🔄", labelBn: "চলছে" },
  needs_attention: { tone: "warning", icon: "⚠️", labelBn: "মনোযোগ দরকার" },
  improving: { tone: "success", icon: "📈", labelBn: "উন্নতি হচ্ছে" },
  resolved: { tone: "success", icon: "✅", labelBn: "সমাধান হয়েছে" },
  // Crop-health case lifecycle (cropHealthCases.CASE_STATUSES)
  active: { tone: "danger", icon: "🔴", labelBn: "চলমান" },
  monitoring: { tone: "info", icon: "👀", labelBn: "পর্যবেক্ষণে" },
  closed: { tone: "neutral", icon: "📁", labelBn: "বন্ধ" },
};

/** Severity conventions (plan §5.1/§8): icon + tone + Bangla label. */
export const SEVERITY_LEVELS = {
  none: { tone: "neutral", icon: "🟢", labelBn: "নেই" },
  low: { tone: "success", icon: "🟢", labelBn: "হালকা" },
  moderate: { tone: "warning", icon: "🟡", labelBn: "মাঝারি" },
  high: { tone: "warning", icon: "🟠", labelBn: "মারাত্মক" },
  severe: { tone: "danger", icon: "🔴", labelBn: "খুব মারাত্মক" },
};

// ─── Theme resolution ──────────────────────────────────────────────────────────

export function getPreferredTheme() {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("cabi-theme");
  if (stored === "dark" || stored === "light") return stored;
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function getTheme(name) {
  return name === "dark" ? darkThemeFull : lightThemeFull;
}

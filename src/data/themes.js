/**
 * Dark Mode Theme System for CABI Plant Detective
 *
 * Provides light and dark theme tokens compatible with the existing C color object.
 * Usage: Import and merge into the C object or use with a ThemeContext.
 */

export const lightTheme = {
  bg: '#f4f6f8',
  bgCard: '#ffffff',
  bgMuted: '#f0f2f5',
  text: '#1a1a2e',
  textMuted: '#6b7280', // fixed from #8e95a2 for WCAG AA contrast
  textLight: '#6b7280',
  primary: '#0d9e4c',
  primaryDark: '#065f22',
  primaryLight: '#34d399',
  border: '#e5e7eb',
  shadow: '0 1px 3px rgba(0,0,0,0.08)',
  danger: '#dc2626',
  warning: '#d97706',
  success: '#16a34a',
  blue: '#2563eb',
};

export const darkTheme = {
  bg: '#0f172a',
  bgCard: '#1e293b',
  bgMuted: '#334155',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textLight: '#94a3b8',
  primary: '#22c55e',
  primaryDark: '#16a34a',
  primaryLight: '#4ade80',
  border: '#475569',
  shadow: '0 1px 3px rgba(0,0,0,0.3)',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  blue: '#3b82f6',
};

/**
 * Extended light theme that maps to existing App.jsx C tokens
 * for a drop-in replacement when switching themes.
 */
export const lightThemeFull = {
  ...lightTheme,
  primaryLight: '#1a7a3a',
  primaryDark: '#005322',
  primaryXDark: '#002109',
  accent: '#f59e0b',
  accentLight: '#fbbf24',
  accentDark: '#d97706',
  bgHeader: '#ffffff',
  bgNav: '#f0f2f5',
  textFull: '#1a1d21',
  textMutedFull: '#5f6672',
  borderFocus: '#1a7a3a',
  shadowMd: '0 4px 16px rgba(0,0,0,0.08)',
  shadowLg: '0 8px 32px rgba(0,0,0,0.12)',
  heroGradient: 'linear-gradient(135deg, #006028 0%, #0a8c3f 50%, #16a34a 100%)',
  game1: '#7c3aed',
  game2: '#0891b2',
  game3: '#ea580c',
};

/**
 * Extended dark theme that maps to existing App.jsx C tokens
 * for a drop-in replacement when switching themes.
 */
export const darkThemeFull = {
  ...darkTheme,
  primaryLight: '#1a7a3a',
  primaryDark: '#16a34a',
  primaryXDark: '#052e16',
  accent: '#f59e0b',
  accentLight: '#fbbf24',
  accentDark: '#d97706',
  bgHeader: '#1e293b',
  bgNav: '#1e293b',
  textFull: '#e2e8f0',
  textMutedFull: '#94a3b8',
  borderFocus: '#22c55e',
  shadowMd: '0 4px 16px rgba(0,0,0,0.3)',
  shadowLg: '0 8px 32px rgba(0,0,0,0.4)',
  heroGradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
  game1: '#8b5cf6',
  game2: '#06b6d4',
  game3: '#f97316',
};

/**
 * Helper to get the current theme based on user preference.
 * Checks localStorage first, then system preference.
 */
export function getPreferredTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('cabi-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Get the full theme object by name.
 */
export function getTheme(name) {
  return name === 'dark' ? darkThemeFull : lightThemeFull;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Theme provider for the AgriChem tab — supports light, dark, and system modes.
 *
 * Implementation:
 *   - Persisted to localStorage('agrichem-theme')
 *   - Defaults to 'system' (follows OS preference)
 *   - Applies 'dark' class to the document root for Tailwind dark: variants
 *   - Listens to OS preference changes when in 'system' mode
 *
 * Note: The host app (src/App.jsx) is a light-only monolith with inline
 * styles. Dark mode here only applies to the AgriChem subtree (which uses
 * Tailwind classes with dark: variants). The host app continues to render
 * in light mode. This is a deliberate scope decision — retrofitting dark
 * mode to 10,000 lines of inline-styled JSX is out of scope for this pass.
 */

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Graceful fallback
    return {
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
};

const STORAGE_KEY = 'agrichem-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDom(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return saved || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved && saved !== 'system') return saved;
    return getSystemTheme();
  });

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyThemeToDom(resolved);
  }, [theme]);

  // Listen to OS preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyThemeToDom(resolved);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, t);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const resolved = prev === 'system' ? getSystemTheme() : prev;
      const next = resolved === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;

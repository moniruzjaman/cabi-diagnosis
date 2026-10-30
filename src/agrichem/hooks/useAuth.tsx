import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

/**
 * Auth hook + context for the AgriChem tab.
 *
 * Wraps the Google Sign-In flow + session restoration via /api/auth/me.
 * The session is stored as an httpOnly cookie (set by /api/auth/google)
 * so JS can never read it directly — eliminating XSS session theft.
 *
 * Usage:
 *   const { user, loading, loginWithGoogle, logout } = useAuth();
 *
 *   // Sign in
 *   await loginWithGoogle(googleIdToken);
 *
 *   // Sign out
 *   await logout();
 *
 *   // Show user info
 *   {user && <p>{user.email} (last login: {user.last_login_at})</p>}
 */

export interface User {
  id: number;
  email: string;
  name: string | null;
  picture_url: string | null;
  locale: string | null;
  created_at: string;
  last_login_at: string;
  login_count: number;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: (credential: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Graceful fallback if used outside provider — prevents crashes during
    // testing or if a component is reused outside AgriChemApp.
    return {
      user: null,
      loading: false,
      error: null,
      loginWithGoogle: async () => {
        throw new Error('AuthProvider not mounted');
      },
      logout: async () => {},
      refresh: async () => {},
    };
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Restore session on mount ──────────────────────────────────────
  // /api/auth/me reads the httpOnly cookie (which JS can't see) and
  // returns the user profile if the session is still valid.
  const refresh = useCallback(async () => {
    try {
      const resp = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      const data = await resp.json();
      setUser(data.user || null);
      setError(null);
    } catch (e: any) {
      // Network error — leave user as null but don't crash
      setUser(null);
      setError(e?.message || 'Failed to check session');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Sign in with Google ID token ──────────────────────────────────
  const loginWithGoogle = useCallback(async (credential: string): Promise<User> => {
    setError(null);
    const resp = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      const msg = data.error || 'Sign-in failed';
      setError(msg);
      throw new Error(msg);
    }
    setUser(data.user);
    return data.user as User;
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Even if the network call fails, clear local state
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, loginWithGoogle, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export default useAuth;

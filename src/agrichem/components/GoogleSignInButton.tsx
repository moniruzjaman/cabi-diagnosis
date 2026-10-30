import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './Toast';
import { useLanguage } from '../context/LanguageContext';

/**
 * Google Identity Services "Sign in with Google" button.
 *
 * Loads the GIS script once, then renders Google's official button
 * (which handles the popup/redirect/one-tap flow). When the user
 * signs in, Google returns a JWT ID token that we POST to
 * /api/auth/google — the server verifies it, upserts the user in
 * the DB (auto-fetching email + profile), and sets an httpOnly
 * session cookie.
 *
 * Required env var (Vite-exposed):
 *   VITE_GOOGLE_CLIENT_ID — from https://console.cloud.google.com/apis/credentials
 */

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let gisScriptPromise: Promise<void> | null = null;

function loadGISScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = GIS_SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisScriptPromise = null; // allow retry on next render
      resolve();
    };
    document.head.appendChild(s);
  });
  return gisScriptPromise;
}

// Extend window type for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  /** Visual size of the button. */
  size?: 'medium' | 'large';
  /** Optional callback after successful sign-in. */
  onSuccess?: () => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  size = 'large',
  onSuccess,
}) => {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const btnRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  // Load GIS script on mount
  useEffect(() => {
    loadGISScript().then(() => setScriptReady(true));
  }, []);

  // Initialize + render the button once script is ready
  useEffect(() => {
    if (!scriptReady || !clientId || !btnRef.current) return;
    if (!window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          const user = await loginWithGoogle(response.credential);
          toast({
            title: language === 'bn' ? `স্বাগতম, ${user.name || user.email}!` : `Welcome, ${user.name || user.email}!`,
            description: language === 'bn'
              ? `সর্বশেষ লগইন: ${new Date(user.last_login_at).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`
              : `Last login: ${new Date(user.last_login_at).toLocaleString()}`,
            variant: 'success',
          });
          onSuccess?.();
        } catch (e: any) {
          toast({
            title: language === 'bn' ? 'সাইন-ইন ব্যর্থ' : 'Sign-in failed',
            description: e?.message || 'Unknown error',
            variant: 'error',
          });
        }
      },
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: 'outline',
      size,
      shape: 'pill',
      text: 'signin_with',
      locale: language === 'bn' ? 'bn' : 'en',
      width: 240,
    });
  }, [scriptReady, clientId, loginWithGoogle, toast, language, size, onSuccess]);

  // If no client ID is configured, show a developer-facing placeholder
  if (!clientId) {
    return (
      <div className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 max-w-xs">
        <strong>Google Sign-In not configured.</strong>
        <br />
        Set <code className="font-mono bg-rose-100 px-1">VITE_GOOGLE_CLIENT_ID</code> in .env.local
      </div>
    );
  }

  return <div ref={btnRef} className="google-signin-btn" data-cy="google-signin-btn" />;
};

export default GoogleSignInButton;

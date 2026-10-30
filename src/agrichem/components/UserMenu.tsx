import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, User as UserIcon, Clock, Calendar, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './Toast';
import { useLanguage } from '../context/LanguageContext';
import { GoogleSignInButton } from './GoogleSignInButton';

/**
 * User profile menu for the Navbar.
 *
 * Three states:
 *   1. Loading session (initial mount) → small spinner
 *   2. Not signed in → "Sign in" pill that opens a modal with GoogleSignInButton
 *   3. Signed in → avatar + chevron; click opens dropdown with profile info
 *      (email, last login, login count, registered date) + logout button
 *
 * The dropdown closes on outside-click or Escape key.
 */

function formatRelativeTime(iso: string, language: 'en' | 'bn'): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (language === 'bn') {
    if (diffMin < 1) return 'এইমাত্র';
    if (diffMin < 60) return `${diffMin} মিনিট আগে`;
    if (diffHr < 24) return `${diffHr} ঘণ্টা আগে`;
    if (diffDay < 30) return `${diffDay} দিন আগে`;
    return date.toLocaleDateString('bn-BD');
  }
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay < 30) return `${diffDay} days ago`;
  return date.toLocaleDateString('en-US');
}

function formatDate(iso: string, language: 'en' | 'bn'): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const UserMenu: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    toast({
      title: language === 'bn' ? 'সাইন-আউট সম্পন্ন' : 'Signed out',
      variant: 'info',
    });
  };

  // ── State 1: Loading session ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400">
        <div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-emerald-600 animate-spin" />
        <span className="hidden sm:inline">{language === 'bn' ? 'সেশন...' : 'Session...'}</span>
      </div>
    );
  }

  // ── State 2: Not signed in → Sign in button ──────────────────────
  if (!user) {
    return (
      <>
        <button
          id="signin-btn"
          onClick={() => setShowSignInModal(true)}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer select-none"
          title={language === 'bn' ? 'গুগল দিয়ে সাইন-ইন করুন' : 'Sign in with Google'}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{language === 'bn' ? 'সাইন-ইন' : 'Sign in'}</span>
        </button>

        {showSignInModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={() => setShowSignInModal(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {language === 'bn' ? 'সাইন-ইন করুন' : 'Sign in'}
                </h3>
                <button
                  onClick={() => setShowSignInModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-6 space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                    <UserIcon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {language === 'bn' ? 'বালাইনাশক নির্দেশিকায় স্বাগতম' : 'Welcome to Pesticide Guide'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'bn'
                      ? 'আপনার ইমেইল স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে। সাইন-ইন করতে গুগল অ্যাকাউন্ট ব্যবহার করুন।'
                      : 'Your email is auto-fetched from Google. No password needed.'}
                  </p>
                </div>

                <div className="flex justify-center">
                  <GoogleSignInButton onSuccess={() => setShowSignInModal(false)} />
                </div>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                  {language === 'bn'
                    ? 'সাইন-ইন করলে আপনি গোপনীয়তা নীতি ও শর্তাবলীতে সম্মত হন। ইমেইল ও প্রোফাইল শুধুমাত্র সেশন ট্র্যাকিংয়ের জন্য ব্যবহৃত হয়।'
                    : 'By signing in you agree to our Privacy Policy. Email and profile are used only for session tracking.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── State 3: Signed in → avatar + dropdown ───────────────────────
  const initials = (user.name || user.email)
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="user-menu-btn"
        onClick={() => setDropdownOpen((o) => !o)}
        className="flex items-center gap-1.5 p-1 pr-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer select-none"
        aria-label={language === 'bn' ? 'ব্যবহারকারী মেনু' : 'User menu'}
        aria-expanded={dropdownOpen}
      >
        {user.picture_url ? (
          <img
            src={user.picture_url}
            alt={user.name || user.email}
            className="w-7 h-7 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
            {initials}
          </div>
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden z-50">
          {/* Header — name + email */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {user.name || user.email}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <UserIcon className="w-3 h-3 shrink-0" />
              {user.email}
            </p>
          </div>

          {/* Stats — last login, registered, login count */}
          <div className="p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {language === 'bn' ? 'সর্বশেষ লগইন' : 'Last login'}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200" title={new Date(user.last_login_at).toLocaleString()}>
                {formatRelativeTime(user.last_login_at, language)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {language === 'bn' ? 'নিবন্ধন' : 'Registered'}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatDate(user.created_at, language)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                {language === 'bn' ? 'মোট লগইন' : 'Total logins'}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {user.login_count}
              </span>
            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-100 dark:border-slate-800 p-2">
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'সাইন-আউট' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

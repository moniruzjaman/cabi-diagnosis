import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Error boundary for the AgriChem tab.
 *
 * Catches any uncaught render-time error in the AgriChem subtree and
 * shows a friendly recovery UI instead of a blank white screen. The
 * user can reload the page to retry.
 *
 * This is defense-in-depth — most errors should be handled at the
 * component level (e.g., the database load error state in App.tsx).
 * But if something unexpected throws during render (e.g., a malformed
 * product entry), this boundary prevents the whole tab from going blank.
 */

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for debugging — in production this would go to a
    // monitoring service like Sentry.
    console.error('[AgriChem ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    // Force a fresh load of the current tab by toggling location hash
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}

const ErrorFallback: React.FC<{ error: Error | null; onReload: () => void }> = ({
  error,
  onReload,
}) => {
  // useLanguage must be called inside a component that's inside the
  // LanguageProvider — ErrorFallback is, so this is safe.
  let language: 'en' | 'bn' = 'en';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const lang = useLanguage();
    language = lang.language;
  } catch {
    // If LanguageProvider is also broken, fall back to English
    language = 'en';
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-8 text-center shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="w-7 h-7 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          {language === 'bn' ? 'কিছু সমস্যা হয়েছে' : 'Something went wrong'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {language === 'bn'
            ? 'অ্যাপ্লিকেশন লোড করতে সমস্যা হয়েছে। পেইজ রিলোড করে আবার চেষ্টা করুন। যদি সমস্যা থাকে, ব্রাউজার ক্যাশে মুছে আবার চেষ্টা করুন।'
            : 'The app encountered an error while loading. Please reload the page to try again. If the problem persists, try clearing your browser cache.'}
        </p>
        {error && process.env.NODE_ENV === 'development' && (
          <pre className="text-[10px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg mb-4 text-left overflow-x-auto font-mono">
            {error.message}
          </pre>
        )}
        <button
          onClick={onReload}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{language === 'bn' ? 'পেইজ রিলোড করুন' : 'Reload page'}</span>
        </button>
      </div>
    </div>
  );
};

export default ErrorBoundary;

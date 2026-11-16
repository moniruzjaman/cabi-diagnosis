import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { FlaskConical, Database, Loader2 } from 'lucide-react';

/**
 * Branded loading screen shown while the 5,624-record DAE pesticide
 * database is downloading. Used by App.tsx for the database / calculator /
 * rotation / safety / guidebook tabs.
 *
 * Visual hierarchy:
 *   1. Animated spinner with branded icon
 *   2. Status headline (bilingual)
 *   3. One-line description of what's loading
 *   4. Subtle progress hint at the bottom
 *
 * Designed to feel "instant" — the spinner appears within 100ms of the
 * tab being clicked, even on slow connections, because it renders
 * synchronously without waiting for any data.
 */
export const LoadingScreen: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        {/* Animated branded icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <FlaskConical className="w-10 h-10 text-white" />
          </div>
          {/* Spinning ring overlay */}
          <Loader2 className="w-7 h-7 text-emerald-600 absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm animate-spin" />
        </div>

        {/* Status headline */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {language === 'bn'
              ? 'বালাইনাশক ডাটাবেস লোড হচ্ছে'
              : 'Loading pesticide database'}
          </h2>
          <p className="text-sm text-slate-500 max-w-md">
            {language === 'bn'
              ? 'কৃষি সম্প্রসারণ অধিদপ্তর (DAE) অনুমোদিত অফিসিয়াল নিবন্ধিত বালাইনাশক ডাটাবেস ডাউনলোড হচ্ছে। প্রথমবার একটু সময় নেবে, এরপর ব্রাউজার ক্যাশে থাকবে।'
              : 'Downloading the official DAE registry of registered pesticides. First load takes a moment, then it caches in your browser for instant access.'}
          </p>
        </div>

        {/* Progress hint */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Database className="w-3.5 h-3.5" />
          <span>
            {language === 'bn'
              ? '৮১তম PTAC সভা পর্যন্ত অনুমোদিত'
              : 'Approved up to 81st PTAC meeting'}
          </span>
        </div>

        {/* Skeleton card grid — gives the user a sense of what's coming */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl mt-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex justify-between mb-3">
                <div className="h-5 w-20 bg-slate-200 rounded-full" />
                <div className="h-5 w-12 bg-slate-200 rounded" />
              </div>
              <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
              <div className="h-3 w-full bg-slate-100 rounded mb-1.5" />
              <div className="h-3 w-5/6 bg-slate-100 rounded mb-4" />
              <div className="h-10 w-full bg-emerald-50 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

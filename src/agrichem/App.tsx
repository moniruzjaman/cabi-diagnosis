import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChemicalProduct, RegulatoryAlert, AppTab } from './types';
import { INITIAL_REGULATORY_ALERTS } from './data/regulatoryAlertsData';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { ShareModal } from './components/ShareModal';
import { DatabaseView } from './components/DatabaseView';
import { DosageCalculatorModal } from './components/DosageCalculatorModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SafetyChecklistModal } from './components/SafetyChecklistModal';
import { RotationPlanner } from './components/RotationPlanner';
import { SafetyView } from './components/SafetyView';
import { Guidebook } from './components/Guidebook';
import { NotificationCenter } from './components/NotificationCenter';
import { DocumentMeta } from './components/DocumentMeta';
import { useLanguage } from './context/LanguageContext';
import { LoadingScreen } from './components/LoadingScreen';
import { SourceDisclaimer } from './components/SourceDisclaimer';
import {
  FlaskConical,
  ShieldCheck,
  BookOpen,
  RotateCw,
  Calculator,
  Bell,
  FileDown,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Share2
} from 'lucide-react';

/**
 * The 5,624-record DAE pesticide database is loaded via a dynamic
 * `import('./data/pesticideMapper')` inside useEffect (see below).
 *
 * The mapper module is ~5 MB unminified (~650 KB gzipped) because it
 * embeds all_pesticides.ts inline. By importing it dynamically we keep
 * the host app's initial bundle small and let the database download in
 * parallel with the rest of the page render. Vite automatically code-splits
 * the dynamic import into a separate chunk (assets/pesticideMapper-[hash].js).
 */

export default function App() {
  const { language } = useLanguage();

  // The 5,624-record DAE database — loaded asynchronously so the host
  // app's initial bundle stays small. `products` starts empty and gets
  // populated when the dynamic import resolves.
  const [products, setProducts] = useState<ChemicalProduct[]>([]);
  const [databaseLoaded, setDatabaseLoaded] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('./data/pesticideMapper');
        if (!cancelled) {
          setProducts(mod.PESTICIDES_DATABASE_OFFICIAL);
          setDatabaseLoaded(true);
        }
      } catch (e: any) {
        if (!cancelled) {
          setDatabaseError(e?.message || 'Failed to load pesticide database');
          setDatabaseLoaded(true); // stop loading state even on error
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Modals state
  const [detailProduct, setDetailProduct] = useState<ChemicalProduct | null>(null);
  const [calcProduct, setCalcProduct] = useState<ChemicalProduct | null>(null);
  const [safetyProduct, setSafetyProduct] = useState<ChemicalProduct | null>(null);

  // Alerts & Notifications state with localStorage persistence
  const [alerts, setAlerts] = useState<RegulatoryAlert[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agrichem_alerts');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn('Failed to parse alerts from storage:', e);
        }
      }
    }
    return INITIAL_REGULATORY_ALERTS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agrichem_alerts', JSON.stringify(alerts));
    }
  }, [alerts]);

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  const handleMarkAlertRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  };

  const handleAddCustomAlert = (alert: RegulatoryAlert) => {
    setAlerts((prev) => [alert, ...prev]);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Loading & error states ──────────────────────────────────────────────
  //
  // While the 5,624-record database downloads, the Database/Calculator/
  // Rotation/Safety/Guidebook tabs would otherwise render empty. We show
  // a branded loading screen instead. The Home, Alerts, and Share tabs
  // don't need the database and render normally.
  const tabsNeedingDatabase: AppTab[] = ['database', 'calculator', 'rotation', 'safety', 'guidebook'];
  const currentTabNeedsDatabase = tabsNeedingDatabase.includes(activeTab);
  const showLoadingScreen = currentTabNeedsDatabase && !databaseLoaded;
  const showDatabaseError = currentTabNeedsDatabase && databaseError && products.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 selection:bg-emerald-100 dark:selection:bg-emerald-900/50 selection:text-emerald-900 dark:selection:text-emerald-100 transition-colors duration-200">
      {/* Dynamic Tab & SEO Meta */}
      <DocumentMeta activeTab={activeTab} />

      {/* Accessibility: Skip-to-content link — visible only when focused via keyboard */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:bg-emerald-700 focus:text-white focus:rounded-xl focus:text-sm focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        {language === 'bn' ? 'মূল কন্টেন্টে যান' : 'Skip to main content'}
      </a>

      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        unreadAlertCount={unreadAlertCount}
        onOpenAlerts={() => setActiveTab('alerts')}
        onOpenShare={() => setIsShareModalOpen(true)}
        totalProductsCount={products.length}
      />

      {/* Main View Area — wrapped in AnimatePresence for subtle tab transitions */}
      <main id="main-content" className="flex-1" role="main">
        <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
        {activeTab === 'home' && (
          <HomeView
            products={products}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectCropFilter={(crop) => {
              setSearchQuery(crop);
              setActiveTab('database');
            }}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            totalProductsCount={products.length}
            databaseLoaded={databaseLoaded}
          />
        )}

        {activeTab === 'database' && (
          showLoadingScreen ? <LoadingScreen /> :
          showDatabaseError ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
              <p className="text-rose-700 font-semibold">
                {language === 'bn' ? 'বালাইনাশক ডাটাবেস লোড করতে সমস্যা হয়েছে' : 'Failed to load pesticide database'}
              </p>
              <p className="text-xs text-slate-500 mt-2">{databaseError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                {language === 'bn' ? 'পেইজ রিলোড করুন' : 'Reload page'}
              </button>
            </div>
          ) : (
            <DatabaseView
              products={products}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectProduct={(p) => setDetailProduct(p)}
              onOpenCalculator={(p) => setCalcProduct(p)}
              onOpenSafety={(p) => setSafetyProduct(p)}
            />
          )
        )}

        {activeTab === 'calculator' && (
          showLoadingScreen ? <LoadingScreen /> : (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-teal-600" />
                    {language === 'bn' ? 'ইন্টারেক্টিভ মাঠপর্যায়ের মাত্রা ও ট্যাংক মিক্সিং স্টেশন' : 'Interactive Field Dosage & Tank Mix Station'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'bn'
                      ? 'ন্যাপস্যাক স্প্রেয়ার ট্যাংক, পানির পরিমাণ এবং জমির আয়তন অনুযায়ী নির্ভুল মাত্রা হিসাব করতে যেকোনো নিবন্ধিত বালাইনাশক নির্বাচন করুন।'
                      : 'Select any registered chemical to calculate precise knapsack tank mix rates, water volume, and area conversions.'}
                  </p>
                </div>

                <button
                  onClick={() => setCalcProduct(products[0])}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  {language === 'bn' ? 'ক্যালকুলেটর ডায়ালগ খুলুন' : 'Launch Knapsack Calculator Dialog'}
                </button>
              </div>

              {/* Render calculator directly */}
              <DosageCalculatorModal
                products={products}
                selectedProduct={calcProduct || products[0]}
                onClose={() => setActiveTab('database')}
                onSelectProduct={(p) => setCalcProduct(p)}
              />
            </div>
          )
        )}

        {activeTab === 'rotation' && (
          showLoadingScreen ? <LoadingScreen /> : <RotationPlanner products={products} />
        )}

        {activeTab === 'safety' && (
          showLoadingScreen ? <LoadingScreen /> : (
            <SafetyView
              products={products}
              onOpenSafetyModal={(p) => setSafetyProduct(p)}
            />
          )
        )}

        {activeTab === 'guidebook' && (
          showLoadingScreen ? <LoadingScreen /> : <Guidebook products={products} />
        )}

        {activeTab === 'alerts' && (
          <NotificationCenter
            alerts={alerts}
            onMarkRead={handleMarkAlertRead}
            onAddCustomAlert={handleAddCustomAlert}
            onDeleteAlert={handleDeleteAlert}
          />
        )}
        </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Modals */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onOpenDosageCalculator={(p) => {
            setDetailProduct(null);
            setCalcProduct(p);
          }}
        />
      )}

      {calcProduct && activeTab !== 'calculator' && (
        <DosageCalculatorModal
          products={products}
          selectedProduct={calcProduct}
          onClose={() => setCalcProduct(null)}
          onSelectProduct={(p) => setCalcProduct(p)}
        />
      )}

      {safetyProduct && (
        <SafetyChecklistModal
          product={safetyProduct}
          onClose={() => setSafetyProduct(null)}
        />
      )}

      {/* Social & Meta Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        activeTab={activeTab}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto py-8 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Brand + Quick Nav */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm transition-transform hover:scale-105">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  {language === 'bn' ? 'বালাইনাশক নির্দেশিকা' : 'Pesticide Guide'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {language === 'bn'
                    ? 'ফিল্ড কন্ট্রোলস ও ডাটাবেস গাইডবুক'
                    : 'Field Controls & Database Guidebook'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <button
                onClick={() => setActiveTab('home')}
                className="group relative hover:text-emerald-700 cursor-pointer font-bold text-slate-800 transition"
              >
                {language === 'bn' ? 'হোম' : 'Home'}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all" />
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className="group relative hover:text-emerald-700 cursor-pointer transition"
              >
                {language === 'bn' ? 'রাসায়নিক ডিরেক্টরি' : 'Chemical Directory'}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all" />
              </button>
              <button
                onClick={() => setActiveTab('rotation')}
                className="group relative hover:text-emerald-700 cursor-pointer transition"
              >
                {language === 'bn' ? 'MoA ঘূর্ণন' : 'MoA Rotation'}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all" />
              </button>
              <button
                onClick={() => setActiveTab('safety')}
                className="group relative hover:text-emerald-700 cursor-pointer transition"
              >
                {language === 'bn' ? 'পিপিই চেকলিস্ট' : 'PPE Checklists'}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all" />
              </button>
              <button
                onClick={() => setActiveTab('guidebook')}
                className="group relative hover:text-emerald-700 cursor-pointer transition"
              >
                {language === 'bn' ? 'ফিল্ড ক্যালিব্রেশন' : 'Field Calibration'}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all" />
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className="group relative hover:text-emerald-700 cursor-pointer transition"
              >
                {language === 'bn' ? 'নিয়ন্ত্রক নোটিফিকেশন' : 'Compliance Alerts'}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all" />
              </button>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:shadow-sm font-bold border border-emerald-200 cursor-pointer transition"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600 transition-transform group-hover:rotate-12" />
                <span>{language === 'bn' ? 'শেয়ার করুন' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Source attribution disclaimer — single source of truth */}
          <SourceDisclaimer variant="compact" />

          {/* Bottom copyright line */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500">
            <span>
              {language === 'bn'
                ? '© কৃষি সম্প্রসারণ অধিদপ্তর (DAE) — অনুমোদিত তথ্য ভাণ্ডার'
                : '© Department of Agricultural Extension (DAE) — Approved Reference'}
            </span>
            <span className="font-mono">
              {language === 'bn' ? 'সংস্করণ 4.0.0' : 'v4.0.0'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

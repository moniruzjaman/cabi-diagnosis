import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, Calendar, FileText, ExternalLink } from 'lucide-react';

/**
 * Reusable source-attribution disclaimer for the AgriChem tab.
 *
 * Citates:
 *   - Department of Agricultural Extension (DAE), Bangladesh
 *   - Pesticide Technical Advisory Committee (PTAC) registry
 *   - The 81st PTAC meeting as the data cutoff
 *
 * Why this component exists
 * ------------------------
 * Before this existed, the AgriChem tab had 7+ inconsistent mentions of
 * "DAE" scattered across components, but only LoadingScreen.tsx mentioned
 * the PTAC meeting number — and that disappears the moment the database
 * finishes loading. Users who never see the loading screen never see the
 * PTAC attribution, which is a data-provenance compliance issue.
 *
 * This component gives every tab a single, consistent, bilingual
 * source-attribution footer so users always know:
 *   1. Where the data came from (DAE)
 *   2. Which committee approved it (PTAC)
 *   3. The cutoff date (81st PTAC meeting)
 *   4. That this is a knowledge-sharing tool, NOT an official DAE directive
 *
 * Usage
 * -----
 *   <SourceDisclaimer />                       // default: compact variant
 *   <SourceDisclaimer variant="full" />        // full-width banner variant
 *   <SourceDisclaimer variant="inline" />      // single-line inline variant
 */

type SourceDisclaimerVariant = 'compact' | 'full' | 'inline';

interface SourceDisclaimerProps {
  variant?: SourceDisclaimerVariant;
  className?: string;
}

export const SourceDisclaimer: React.FC<SourceDisclaimerProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { language } = useLanguage();

  // Single source of truth for the citation — used by all variants.
  // If the PTAC meeting number changes, update it here once.
  const PTAC_MEETING = '81st';
  const PTAC_MEETING_BN = '৮১তম';
  const DAE_URL = 'https://dae.gov.bd';

  const en = {
    source: 'Data Source',
    body: `Official DAE registry of registered pesticides, approved up to the ${PTAC_MEETING} Pesticide Technical Advisory Committee (PTAC) meeting.`,
    disclaimer:
      'Knowledge-sharing field guide. Always read the product label before application.',
    view: 'View DAE',
  };

  const bn = {
    source: 'তথ্যসূত্র',
    body: `কৃষি সম্প্রসারণ অধিদপ্তর (DAE) এর অফিসিয়াল নিবন্ধিত বালাইনাশক তালিকা, ${PTAC_MEETING_BN} কীটনাশক টেকনিক্যাল অ্যাডভাইজরি কমিটি (PTAC) সভা পর্যন্ত অনুমোদিত।`,
    disclaimer:
      'জ্ঞান বিনিময় ফিল্ড গাইড। প্রয়োগের পূর্বে অবশ্যই পণ্যের লেবেল পড়ুন।',
    view: 'DAE দেখুন',
  };

  const t = language === 'bn' ? bn : en;

  // ── Variant: inline (single line, smallest) ──────────────────────────
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-1.5 text-[10px] text-slate-500 ${className}`}>
        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>
          {t.source}: <span className="font-semibold text-slate-700">DAE</span>
          <span className="mx-1 text-slate-300">•</span>
          {language === 'bn' ? `${PTAC_MEETING_BN} PTAC সভা পর্যন্ত` : `Up to ${PTAC_MEETING} PTAC`}
        </span>
      </div>
    );
  }

  // ── Variant: compact (default — used at the bottom of tab views) ────
  if (variant === 'compact') {
    return (
      <div
        className={`bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 rounded-xl p-3.5 flex items-start gap-3 transition-colors duration-200 ${className}`}
      >
        <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-400">
              {t.source}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/60 px-1.5 py-0.5 rounded-full">
              <Calendar className="w-2.5 h-2.5" />
              {language === 'bn' ? `${PTAC_MEETING_BN} PTAC` : `${PTAC_MEETING} PTAC`}
            </span>
          </div>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed mt-1.5">
            {t.body}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 italic flex items-start gap-1">
            <FileText className="w-3 h-3 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <span>{t.disclaimer}</span>
          </p>
        </div>
        <a
          href={DAE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 hover:bg-white dark:hover:bg-slate-800 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/60 transition"
          title={language === 'bn' ? 'DAE ওয়েবসাইট খুলুন' : 'Open DAE website'}
        >
          <span>{t.view}</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    );
  }

  // ── Variant: full (wide banner — used at top of HomeView) ───────────
  return (
    <div
      className={`bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${className}`}
    >
      <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
        <ShieldCheck className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs uppercase font-bold tracking-wider text-emerald-800">
            {t.source}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-emerald-700 px-2 py-0.5 rounded-full">
            <Calendar className="w-2.5 h-2.5" />
            {language === 'bn' ? `${PTAC_MEETING_BN} PTAC সভা` : `${PTAC_MEETING} PTAC Meeting`}
          </span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          {t.body}
        </p>
        <p className="text-[11px] text-slate-500 mt-1.5 italic flex items-start gap-1">
          <FileText className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
          <span>{t.disclaimer}</span>
        </p>
      </div>
      <a
        href={DAE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-2 rounded-xl border border-emerald-600 transition shadow-sm"
      >
        <span>{t.view}</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
};

export default SourceDisclaimer;

import { useLanguage } from '../context/LanguageContext';
import { AGRICHEM_UPSTREAM } from '../data/upstreamMeta';

/**
 * Small provenance badge showing which upstream commit the embedded pesticide
 * database was last synced from (see scripts/sync_agrichem.mjs).
 * Renders nothing if metadata is unavailable.
 */
export function DataSyncBadge() {
  const { language } = useLanguage();
  if (!AGRICHEM_UPSTREAM?.sha) return null;

  const syncedDate = (() => {
    try {
      return new Date(AGRICHEM_UPSTREAM.syncedAt).toLocaleDateString(
        language === 'bn' ? 'bn-BD' : 'en-CA'
      );
    } catch {
      return AGRICHEM_UPSTREAM.syncedAt?.slice(0, 10) ?? '';
    }
  })();

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 dark:text-slate-500"
      title={
        language === 'bn'
          ? `উৎস ডাটাবেস: ${AGRICHEM_UPSTREAM.url} (কমিট ${AGRICHEM_UPSTREAM.sha.slice(0, 7)})`
          : `Source database: ${AGRICHEM_UPSTREAM.url} (commit ${AGRICHEM_UPSTREAM.sha.slice(0, 7)})`
      }
    >
      <span aria-hidden>🔄</span>
      {language === 'bn' ? 'ডাটা সিঙ্ক' : 'DB synced'}{' '}
      {syncedDate && <>({syncedDate})</>}{' '}
      <span className="opacity-70">· {AGRICHEM_UPSTREAM.sha.slice(0, 7)}</span>
    </span>
  );
}

export default DataSyncBadge;

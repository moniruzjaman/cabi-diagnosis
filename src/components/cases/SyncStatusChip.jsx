import { useState, useCallback, useEffect } from "react";
import { getStats, retryFailed } from "../../intelligence/syncQueue.js";
import { flushCaseSync } from "../../data/cropHealthCases.js";

// ────────────────────────────────────────────────────────────────────────────
// SyncStatusChip — a compact offline-sync status indicator.
//
// Reads syncQueue.getStats() and shows pending / synced / failed counts as
// colour-coded chips. The queue is flushed to the real backend
// (POST /api/cases → Turso crop_health_cases) on mount, on window 'online'
// events, and from the "ম্যানুয়াল সিঙ্ক" button (which also re-queues
// failed records via retryFailed()). Stats are read once on mount (lazy
// useState initialiser) and refreshed from event handlers only — no
// setState-in-render, so no cascading renders.
// ────────────────────────────────────────────────────────────────────────────

const CHIP_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
};

const ZERO_STATS = { pending: 0, syncing: 0, synced: 0, failed: 0 };

function readStats() {
  try {
    return getStats();
  } catch {
    // localStorage unavailable (SSR) — return the zeroed default.
    return ZERO_STATS;
  }
}

export default function SyncStatusChip({ C }) {
  const [stats, setStats] = useState(readStats);

  // Flush once on mount and whenever connectivity returns. flushCaseSync
  // is offline-safe (processQueue no-ops while navigator.online is false)
  // and reconciles each case's syncStatus after the flush.
  useEffect(() => {
    let alive = true;
    const flush = () => {
      flushCaseSync()
        .catch(() => {})
        .finally(() => {
          if (alive) setStats(readStats());
        });
    };
    flush();
    window.addEventListener("online", flush);
    return () => {
      alive = false;
      window.removeEventListener("online", flush);
    };
  }, []);

  const handleManualSync = useCallback(() => {
    try {
      retryFailed();
    } catch {
      // ignore — flush still runs
    }
    flushCaseSync()
      .catch(() => {})
      .finally(() => setStats(readStats()));
  }, []);

  const { pending, synced, failed } = stats;
  const hasActivity = pending > 0 || synced > 0 || failed > 0;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: C.bgMuted,
        borderRadius: 999,
        padding: "3px 8px",
        border: `1px solid ${C.border}`,
      }}
    >
      {pending > 0 ? (
        <span style={{ ...CHIP_STYLE, background: "#ffedd5", color: C.warning }}>⏳ {pending} অপেক্ষমাণ</span>
      ) : null}
      {synced > 0 ? (
        <span style={{ ...CHIP_STYLE, background: "#dcfce7", color: C.success }}>✓ {synced} সিঙ্কড</span>
      ) : null}
      {failed > 0 ? (
        <span style={{ ...CHIP_STYLE, background: "#fee2e2", color: C.danger }}>✗ {failed} ব্যর্থ</span>
      ) : null}
      {!hasActivity ? <span style={{ fontSize: 10, color: C.textMuted }}>সিঙ্ক সারি খালি</span> : null}

      <button
        onClick={handleManualSync}
        disabled={failed === 0 && pending === 0}
        style={{
          fontSize: 10,
          color: failed > 0 || pending > 0 ? C.primary : C.textMuted,
          background: "none",
          border: "none",
          cursor: failed > 0 || pending > 0 ? "pointer" : "default",
          padding: 0,
          textDecoration: failed > 0 || pending > 0 ? "underline" : "none",
        }}
        title="ব্যর্থ বা অপেক্ষমাণ রেকর্ড এখনই সিঙ্ক করুন"
      >
        ম্যানুয়াল সিঙ্ক
      </button>
    </div>
  );
}

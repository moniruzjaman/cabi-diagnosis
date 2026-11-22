import { useState } from "react";
import { getStats } from "../../intelligence/syncQueue.js";

// ────────────────────────────────────────────────────────────────────────────
// SyncStatusChip — a compact offline-sync status indicator.
//
// Shows local queue counts without claiming that server sync is connected.
// Only a future authenticated persistence adapter may report a record synced.
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
  const [stats] = useState(readStats);

  const { pending, failed } = stats;
  const hasActivity = pending > 0 || failed > 0;

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
      {failed > 0 ? (
        <span style={{ ...CHIP_STYLE, background: "#fee2e2", color: C.danger }}>✗ {failed} ব্যর্থ</span>
      ) : null}
      {!hasActivity ? <span style={{ fontSize: 10, color: C.textMuted }}>সিঙ্ক সারি খালি</span> : null}
      <span style={{ fontSize: 10, color: C.textMuted }}>সার্ভার সিঙ্ক এখনো সংযুক্ত নয়</span>
    </div>
  );
}

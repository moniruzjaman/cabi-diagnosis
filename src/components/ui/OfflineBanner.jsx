// ============================================================
// Plant Detective — Atomic UI kit (UI/UX Enhancement Plan, Phase 2/4)
// OfflineBanner — trustworthy offline state (plan §4 obj. 6, §9):
// a single global banner explaining that the app keeps working
// offline (diagnosis runs on-device) instead of a silent failure.
// Uses the shared useNetworkStatus hook; renders nothing when online.
// ============================================================

import { lightThemeFull } from "../../data/themes.js";
import { useNetworkStatus } from "../../intelligence/useNetworkStatus.js";

/**
 * @param {Object} [props.C] - active theme tokens; defaults to the light theme
 */
export default function OfflineBanner({ C = lightThemeFull }) {
  const { online } = useNetworkStatus();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: C.bgWarning,
        border: `1px solid ${C.borderWarning}`,
        color: C.textWarning,
        borderRadius: 12,
        padding: "8px 12px",
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 10,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16 }}>
        📴
      </span>
      <span>
        অফলাইনে আছেন — নির্ণয় ও কেস ব্যবস্থাপনা চালু থাকবে। কেসের তথ্য এই ডিভাইসের ব্রাউজারেই সংরক্ষিত থাকে; অন্য ডিভাইসে স্বয়ংক্রিয়ভাবে সিঙ্ক হয় না।
      </span>
    </div>
  );
}

// ============================================================
// Plant Detective — Atomic UI kit (UI/UX Enhancement Plan, Phase 2)
// StatusBadge — case / progress status per the Phase 1 conventions
// in data/themes.js (STATUS_TONES): icon + Bangla label + tone color.
// Unknown statuses fall back to "neutral" so new states never render
// as bare color codes.
// ============================================================

import { lightThemeFull, STATUS_TONES } from "../../data/themes.js";
import Badge from "./Badge.jsx";

/**
 * @param {Object} props
 * @param {Object} [props.C] - active theme tokens; defaults to the light theme
 * @param {string} props.status - key of STATUS_TONES (e.g. "active", "monitoring")
 * @param {string} [props.label] - override the conventional Bangla label
 */
export default function StatusBadge({ C = lightThemeFull, status, label, solid = false }) {
  const cfg = STATUS_TONES[status] || { tone: "neutral", icon: "•", labelBn: status };
  return (
    <Badge C={C} tone={cfg.tone} icon={cfg.icon} solid={solid}>
      {label || cfg.labelBn}
    </Badge>
  );
}

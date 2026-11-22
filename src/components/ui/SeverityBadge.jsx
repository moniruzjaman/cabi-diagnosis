// ============================================================
// Plant Detective — Atomic UI kit (UI/UX Enhancement Plan, Phase 2)
// SeverityBadge — disease severity as icon + Bangla label + percent,
// per the Phase 1 SEVERITY_LEVELS conventions. Percent is optional
// (shown when a field observation provided one).
// ============================================================

import { lightThemeFull, SEVERITY_LEVELS } from "../../data/themes.js";
import Badge from "./Badge.jsx";

/**
 * @param {Object} props
 * @param {Object} [props.C] - active theme tokens; defaults to the light theme
 * @param {string} props.severity - key of SEVERITY_LEVELS ("low"|"moderate"|…)
 * @param {number|null} [props.pct] - optional observed severity percentage
 */
export default function SeverityBadge({ C = lightThemeFull, severity, pct = null }) {
  const cfg = SEVERITY_LEVELS[severity] || { tone: "neutral", icon: "•", labelBn: severity || "—" };
  const text = pct != null ? `${cfg.labelBn} ${pct}%` : cfg.labelBn;
  return (
    <Badge C={C} tone={cfg.tone} icon={cfg.icon}>
      {text}
    </Badge>
  );
}

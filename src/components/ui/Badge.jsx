// ============================================================
// Plant Detective — Atomic UI kit (UI/UX Enhancement Plan, Phase 2)
// Badge — tinted status pill. Status is icon + text + color, never
// color alone (plan §8 accessibility requirement).
// ============================================================

import { lightThemeFull, toneColors } from "../../data/themes.js";

/**
 * @param {Object} props
 * @param {Object} [props.C] - active theme tokens; defaults to the light theme
 * @param {"success"|"warning"|"danger"|"info"|"neutral"} [props.tone="neutral"]
 * @param {string} [props.icon] - optional leading icon (aria-hidden)
 * @param {boolean} [props.solid=false] - solid fill (for emphasis on dark surfaces)
 * @param {string} props.children - badge text
 */
export default function Badge({ C = lightThemeFull, tone = "neutral", icon, solid = false, children, style }) {
  const t = toneColors(C, tone);
  return (
    <span
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.6,
        padding: "3px 10px",
        borderRadius: 999,
        background: solid ? t.solid : t.bg,
        border: `1px solid ${solid ? t.solid : t.border}`,
        color: solid ? "#fff" : t.fg,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icon && (
        <span aria-hidden="true" style={{ fontSize: 11 }}>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

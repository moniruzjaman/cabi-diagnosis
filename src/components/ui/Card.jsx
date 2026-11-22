// ============================================================
// Plant Detective — Atomic UI kit (UI/UX Enhancement Plan, Phase 2)
// Card — flat surface with modest elevation (plan §4.2: restrained
// elevation, no heavy glassmorphism). Optional accent border reuse
// keeps the existing MONITOR/PREVENT section styling.
// ============================================================

import { lightThemeFull } from "../../data/themes.js";

/**
 * @param {Object} props
 * @param {Object} [props.C] - active theme tokens; defaults to the light theme
 * @param {string} [props.title] - section heading (icon + title row)
 * @param {string} [props.icon] - heading icon (aria-hidden)
 * @param {string} [props.accent] - border color override (tinted borders)
 * @param {React.ReactNode} props.children
 */
export default function Card({ C = lightThemeFull, title, icon, accent, children, style }) {
  return (
    <div
      style={{
        background: C.bgCard,
        border: `1px solid ${accent || C.border}`,
        borderRadius: 16,
        padding: 14,
        boxShadow: C.shadow,
        ...style,
      }}
    >
      {(title || icon) && (
        <div
          style={{
            fontWeight: 800,
            fontSize: 13,
            color: C.primaryDark,
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {icon && <span aria-hidden="true">{icon}</span>}
          <span>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

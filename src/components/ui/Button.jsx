// ============================================================
// Plant Detective — Atomic UI kit (UI/UX Enhancement Plan, Phase 2)
// Button — primary / secondary / danger / accent actions.
// Every button keeps the 44px minimum touch target (plan §8) and
// stays readable in bright outdoor light (solid fills, no gradients).
// ============================================================

import { lightThemeFull } from "../../data/themes.js";
import { TOUCH_TARGET, RADII } from "../../data/themes.js";

/**
 * @param {Object} props
 * @param {Object} [props.C] - active theme tokens; defaults to the light theme
 * @param {"primary"|"secondary"|"danger"|"accent"} [props.variant="primary"]
 * @param {boolean} [props.block=false] - full-width action (one dominant next action per screen)
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.icon] - leading emoji/icon (decorative, aria-hidden)
 * @param {string} [props.sub] - one-line secondary Bangla hint under the label
 * @param {React.ReactNode} props.children
 */
export default function Button({
  C = lightThemeFull,
  variant = "primary",
  block = false,
  disabled = false,
  icon,
  sub,
  onClick,
  style,
  children,
  ...rest
}) {
  const palette = {
    primary: { background: C.primary, color: "#fff", border: "transparent" },
    secondary: { background: C.bgMuted, color: C.text, border: C.border },
    danger: { background: C.danger, color: "#fff", border: "transparent" },
    accent: { background: C.accent, color: "#231a00", border: "transparent" },
  }[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: TOUCH_TARGET.minHeight,
        padding: "10px 18px",
        borderRadius: RADII.md,
        border: `1.5px solid ${palette.border}`,
        background: disabled ? C.border : palette.background,
        color: disabled ? C.textLight : palette.color,
        fontWeight: 700,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: block ? "100%" : undefined,
        fontFamily: "inherit",
        ...style,
      }}
      {...rest}
    >
      {icon && (
        <span aria-hidden="true" style={{ fontSize: 16 }}>
          {icon}
        </span>
      )}
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.3 }}>
        <span>{children}</span>
        {sub && <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.85, whiteSpace: "normal" }}>{sub}</span>}
      </span>
    </button>
  );
}

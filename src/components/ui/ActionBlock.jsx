// ============================================================
// Plant Detective — Atomic UI kit (UI/UX Enhancement Plan, Phase 2)
// ActionBlock — the "What should I do now?" block (plan §5.2/§7.3):
// one dominant, specific next action at the top of result and case
// screens. Icon + bold headline + short Bangla body; optional action
// button. Used on diagnosis results, wizard results and the home
// dashboard so every screen has an obvious next step.
// ============================================================

import { lightThemeFull } from "../../data/themes.js";
import { TOUCH_TARGET, RADII } from "../../data/themes.js";

/**
 * @param {Object} props
 * @param {Object} [props.C] - active theme tokens; defaults to the light theme
 * @param {"success"|"warning"|"danger"|"info"|"neutral"} [props.tone="info"]
 * @param {string} [props.icon] - decorative icon; defaults by tone
 * @param {string} props.titleBn - Bangla headline ("এখন যা করবেন")
 * @param {string} props.bodyBn - the specific next action in Bangla
 * @param {string} [props.actionLabelBn] - optional button label
 * @param {() => void} [props.onAction]
 */
export default function ActionBlock({
  C = lightThemeFull,
  tone = "info",
  icon,
  titleBn = "এখন যা করবেন",
  bodyBn,
  actionLabelBn,
  onAction,
}) {
  const tonePalette = {
    success: { bg: C.bgSuccess, border: C.borderSuccess, fg: C.textSuccess },
    warning: { bg: C.bgWarning, border: C.borderWarning, fg: C.textWarning },
    danger: { bg: C.bgDanger, border: C.borderDanger, fg: C.textDanger },
    info: { bg: C.bgInfo, border: C.borderInfo, fg: C.textInfo },
    neutral: { bg: C.bgMuted, border: C.border, fg: C.text },
  }[tone];
  const resolvedIcon = icon || { success: "✅", warning: "⚠️", danger: "🚨", info: "👉", neutral: "📝" }[tone];

  return (
    <div
      style={{
        background: tonePalette.bg,
        border: `1px solid ${tonePalette.border}`,
        borderRadius: RADII.md,
        padding: 12,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 20, flexShrink: 0 }}>
        {resolvedIcon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 12.5, color: tonePalette.fg }}>{titleBn}</div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, marginTop: 2 }}>{bodyBn}</div>
        {actionLabelBn && onAction && (
          <button
            type="button"
            onClick={onAction}
            style={{
              marginTop: 8,
              minHeight: TOUCH_TARGET.minHeight - 8,
              padding: "6px 14px",
              borderRadius: 10,
              border: `1.5px solid ${tonePalette.fg}`,
              background: "transparent",
              color: tonePalette.fg,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {actionLabelBn}
          </button>
        )}
      </div>
    </div>
  );
}

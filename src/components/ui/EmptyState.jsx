// ============================================================
// Plant Detective — Atomic UI kit (UI/UX Enhancement Plan, Phase 2)
// EmptyState — recovery-state pattern (plan §5.1): explains what the
// screen would show, why it is empty, and offers ONE obvious next
// action so the user is never at a dead end (plan §7.5).
// ============================================================

import { lightThemeFull } from "../../data/themes.js";
import Button from "./Button.jsx";

/**
 * @param {Object} props
 * @param {Object} [props.C] - active theme tokens; defaults to the light theme
 * @param {string} props.icon - large decorative emoji
 * @param {string} props.titleBn - Bangla title
 * @param {string} props.bodyBn - Bangla explanation
 * @param {string} [props.actionLabelBn] - optional dominant next action
 * @param {() => void} [props.onAction]
 */
export default function EmptyState({ C = lightThemeFull, icon, titleBn, bodyBn, actionLabelBn, onAction }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "22px 16px",
        border: `1px dashed ${C.border}`,
        borderRadius: 16,
        background: C.bgCard,
      }}
    >
      <div aria-hidden="true" style={{ fontSize: 34, marginBottom: 8 }}>
        {icon}
      </div>
      <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>{titleBn}</div>
      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7, maxWidth: 420, margin: "0 auto" }}>{bodyBn}</div>
      {actionLabelBn && onAction && (
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
          <Button C={C} variant="primary" icon="➕" onClick={onAction}>
            {actionLabelBn}
          </Button>
        </div>
      )}
    </div>
  );
}

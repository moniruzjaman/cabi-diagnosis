import { useState } from "react";
import { addMonitoringReminder, addObservation } from "../../data/cropHealthCases.js";

// ────────────────────────────────────────────────────────────────────────────
// ScoutingScheduler — renders a scouting action produced by the Risk Radar
// and lets the farmer (a) schedule a monitoring reminder, or (b) record a
// scouting observation immediately. No reminders are created without an
// explicit button click (user consent).
// ────────────────────────────────────────────────────────────────────────────

const inputStyle = (C) => ({
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  fontSize: 12,
});

export default function ScoutingScheduler({ C, caseId, scoutingAction }) {
  const [done, setDone] = useState(null);

  if (!scoutingAction) return null;

  // Format the target scouting date for display (no impure calls in render).
  const targetDate = (() => {
    try {
      return new Date(scoutingAction.windowEnd).toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  })();

  const scheduleReminder = () => {
    // Compute due-in-days inside the handler (impure Date.now() allowed here).
    let dueDays = 1;
    try {
      const ms = new Date(scoutingAction.windowEnd).getTime() - Date.now();
      dueDays = Math.max(1, Math.round(ms / 86400000));
    } catch {
      dueDays = 1;
    }
    addMonitoringReminder(caseId, {
      dueInDays: dueDays,
      title: scoutingAction.titleBn || scoutingAction.title,
      note: scoutingAction.descriptionBn || scoutingAction.description,
    });
    setDone("reminder");
  };

  const recordNow = () => {
    addObservation(caseId, {
      severity: "moderate",
      notes: `স্বয়ংক্রিয় স্কাউটিং: ${scoutingAction.titleBn || scoutingAction.title}`,
      symptoms: scoutingAction.descriptionBn || scoutingAction.description,
    });
    setDone("observation");
  };

  return (
    <div
      style={{
        background: C.bgMuted,
        borderRadius: 12,
        padding: "10px 12px",
        border: `1px solid ${C.border}`,
        marginTop: 8,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 4 }}>
        🔭 {scoutingAction.titleBn || scoutingAction.title}
      </div>
      <div style={{ fontSize: 11, color: C.text, lineHeight: 1.6, marginBottom: 8 }}>
        {scoutingAction.descriptionBn || scoutingAction.description}
      </div>

      {/* What to inspect */}
      {scoutingAction.alternativeActions && scoutingAction.alternativeActions.length > 0 && (
        <div style={{ fontSize: 10.5, color: C.textMuted, marginBottom: 8, lineHeight: 1.6 }}>
          <b>কী দেখবেন:</b>
          <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
            {scoutingAction.alternativeActions.slice(0, 3).map((a, i) => (
              <li key={i}>{a.actionBn || a.action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions — explicit consent required */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          onClick={scheduleReminder}
          style={{
            ...inputStyle(C),
            width: "auto",
            cursor: "pointer",
            fontWeight: 700,
            background: C.primary,
            color: "#fff",
            border: "none",
          }}
        >
          ⏰ {targetDate ? `${targetDate} পর্যন্ত` : ""} পর্যবেক্ষণ নির্ধারণ করুন
        </button>
        <button
          onClick={recordNow}
          style={{
            ...inputStyle(C),
            width: "auto",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          👁️ এখনই পর্যবেক্ষণ করুন
        </button>
      </div>

      {done === "reminder" && (
        <div style={{ fontSize: 11, color: C.primary, marginTop: 6, fontWeight: 700 }}>
          ✓ পর্যবেক্ষণের রিমাইন্ডার যোগ করা হয়েছে{targetDate ? ` (${targetDate})` : ""}।
        </div>
      )}
      {done === "observation" && (
        <div style={{ fontSize: 11, color: C.primary, marginTop: 6, fontWeight: 700 }}>
          ✓ পর্যবেক্ষণ কেসে রেকর্ড করা হয়েছে।
        </div>
      )}
    </div>
  );
}

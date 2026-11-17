import { SIX_PILLARS } from "./sixPillars";

/**
 * SixPillarGrid — the pillar navigation grid on the Home dashboard.
 *
 * Renders the DETECT → TREAT → PREVENT → MONITOR → EVALUATE → LEARN
 * workflow as a responsive card grid (2 columns on phones, 3 on tablets,
 * 6 across on desktop). Cards carry the step number so the connected
 * lifecycle is visible at a glance.
 *
 * Props:
 *   C          — theme tokens
 *   onPillar   — (pillar) => void  navigation callback
 *   caseStats  — optional { active, monitoring, dueReminders } for badges
 */
export default function SixPillarGrid({ C, onPillar, caseStats }) {
  const badge = (id) => {
    if (!caseStats) return null;
    if (id === "monitor") {
      const n = (caseStats.active || 0) + (caseStats.monitoring || 0);
      return n > 0 ? { text: `${n}`, bg: C.primary, fg: "#fff" } : null;
    }
    if (id === "evaluate") {
      return caseStats.dueReminders > 0 ? { text: `${caseStats.dueReminders} ⏰`, bg: C.accent, fg: "#3b2f00" } : null;
    }
    return null;
  };

  return (
    <section aria-label="ছয় স্তম্ভ নেভিগেশন">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 800, color: C.primaryDark, margin: 0 }}>🌿 ফসল স্বাস্থ্য ব্যবস্থাপনা</h2>
        <span style={{ fontSize: 10, color: C.textMuted, letterSpacing: 0.3 }}>Crop Health Intelligence · ৬ ধাপ</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        {SIX_PILLARS.map((p) => {
          const b = badge(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onPillar?.(p)}
              aria-label={`${p.labelEn}: ${p.descBn}`}
              style={{
                position: "relative",
                textAlign: "left",
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: "12px 12px 10px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                boxShadow: C.shadow,
                transition: "transform .15s ease, box-shadow .15s ease",
                minWidth: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = C.shadowMd;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = C.shadow;
              }}
            >
              {b && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "1px 7px",
                    borderRadius: 999,
                    background: b.bg,
                    color: b.fg,
                    lineHeight: 1.6,
                  }}
                >
                  {b.text}
                </span>
              )}
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: p.bg,
                  border: `1px solid ${p.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                }}
                aria-hidden="true"
              >
                {p.icon}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: p.color, lineHeight: 1.2 }}>
                {p.step}. {p.labelBn}
              </span>
              <span style={{ fontSize: 9.5, color: C.textMuted, lineHeight: 1.35 }}>{p.descBn}</span>
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  color: C.textLight,
                  marginTop: "auto",
                }}
              >
                {p.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

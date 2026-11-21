import React from "react";

const JOURNEY = [
  { id: "detect", label: "শনাক্ত", short: "লক্ষণ ও ছবি" },
  { id: "treat", label: "ব্যবস্থা", short: "এখন কী করবেন" },
  { id: "monitor", label: "পর্যবেক্ষণ", short: "কেসের অগ্রগতি" },
  { id: "learn", label: "শিখুন", short: "পরের বার আরও ভালো" },
];

const TAB_TO_STEP = {
  diagnose: "detect",
  pesticide: "treat",
  prevent: "treat",
  cases: "monitor",
  risk: "monitor",
  learn: "learn",
  guide: "learn",
  game: "learn",
};

export default function JourneyProgress({ C, activeTab, onNavigate }) {
  const activeId = TAB_TO_STEP[activeTab] || "detect";
  const activeIndex = JOURNEY.findIndex((step) => step.id === activeId);

  return (
    <section
      aria-label="আপনার ফসল স্বাস্থ্য যাত্রা"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        marginBottom: 12,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        background: C.bgCard,
        boxShadow: C.shadow,
        overflowX: "auto",
      }}
    >
      <div style={{ flexShrink: 0, paddingRight: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: C.textLight, letterSpacing: 0.7 }}>আপনার পথ</div>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: C.primaryDark, whiteSpace: "nowrap" }}>
          {activeIndex + 1}/৪ ধাপ
        </div>
      </div>
      <div aria-hidden="true" style={{ width: 1, height: 28, background: C.border, flexShrink: 0 }} />
      {JOURNEY.map((item, index) => {
        const isActive = item.id === activeId;
        const isDone = index < activeIndex;
        return (
          <React.Fragment key={item.id}>
            <button
              type="button"
              onClick={() => onNavigate?.(item.id)}
              aria-current={isActive ? "step" : undefined}
              title={item.short}
              style={{
                border: `1px solid ${isActive ? C.primary : isDone ? `${C.primary}55` : C.border}`,
                background: isActive ? C.primary : isDone ? `${C.primary}12` : C.bgMuted,
                color: isActive ? "#fff" : isDone ? C.primaryDark : C.textMuted,
                borderRadius: 999,
                padding: "6px 10px",
                minHeight: 36,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: onNavigate ? "pointer" : "default",
                whiteSpace: "nowrap",
                fontSize: 10.5,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 20,
                  height: 20,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: isActive ? "rgba(255,255,255,.18)" : isDone ? `${C.primary}18` : C.bgCard,
                  fontSize: 10,
                }}
              >
                {isDone ? "✓" : index + 1}
              </span>
              {item.label}
            </button>
            {index < JOURNEY.length - 1 && (
              <span
                aria-hidden="true"
                style={{ color: index < activeIndex ? C.primary : C.border, fontSize: 14, flexShrink: 0 }}
              >
                →
              </span>
            )}
          </React.Fragment>
        );
      })}
    </section>
  );
}

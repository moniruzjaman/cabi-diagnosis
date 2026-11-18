import { useState, useMemo } from "react";
import { evaluateProtectionDecision } from "../../intelligence/protectionDecisionEngine.js";
import { getMoaGroup } from "../../intelligence/moaDatabase.js";
import { addTreatment } from "../../data/cropHealthCases.js";

// ────────────────────────────────────────────────────────────────────────────
// CropProtectionPanel — renders the 5-gate Crop Protection Decision sequence.
// Shown when disease risk ≥ 60 (high) on the RiskRadarWidget. A chemical
// treatment is NEVER shown as "approved" unless ALL gates pass.
//
// Gates: diagnosis_confirmed → economic_threshold → moa_rotation →
//        weather_suitable → pre_harvest_interval
//
// When the MoA gate blocks, alternative rotation-compliant groups are listed.
// When all gates pass, the farmer can record the approved treatment
// (explicit-consent button → addTreatment with the MoA code).
// ────────────────────────────────────────────────────────────────────────────

const GATE_ICONS = {
  diagnosis_confirmed: "🔬",
  economic_threshold: "💰",
  moa_rotation: "🔄",
  weather_suitable: "🌤️",
  pre_harvest_interval: "⏳",
};

const GATE_ORDER = [
  "diagnosis_confirmed",
  "economic_threshold",
  "moa_rotation",
  "weather_suitable",
  "pre_harvest_interval",
];

export default function CropProtectionPanel({ C, caseObj, riskRadar }) {
  const [showLimitations, setShowLimitations] = useState(false);
  const [recorded, setRecorded] = useState(false);

  // Derive the target disease id from the radar's top disease.
  const diseaseId = riskRadar?.diseaseForecast?.diseases?.[0]?.disease?.id ?? null;

  const decision = useMemo(() => {
    if (!diseaseId || !riskRadar) return null;
    return evaluateProtectionDecision({ caseObj, diseaseId, riskRadar });
  }, [caseObj, diseaseId, riskRadar]);

  if (!decision) return null;

  const recordApprovedTreatment = () => {
    if (!decision.approved || !decision.approvedTreatment) return;
    const group = getMoaGroup(decision.approvedTreatment.moaCode);
    addTreatment(caseObj.id, {
      type: "chemical",
      description: `ক্রপ প্রোটেকশন ডিসিশন ইঞ্জিন অনুমোদিত: ${group?.nameBn || decision.approvedTreatment.moaCode}`,
      productName: decision.approvedTreatment.productName || "",
      activeIngredient: decision.approvedTreatment.activeIngredient || "",
      moaGroup: group?.shortCode || decision.approvedTreatment.moaCode,
      targetDisease: diseaseId,
    });
    setRecorded(true);
  };

  return (
    <div
      style={{
        background: decision.approved ? "#f0fdf4" : "#fff7ed",
        borderRadius: 12,
        padding: "12px 14px",
        border: `1px solid ${decision.approved ? "#86efac" : "#fdba74"}`,
        marginTop: 8,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>🛡️ ক্রপ প্রোটেকশন ডিসিশন</div>
        <div
          style={{
            background: decision.approved ? "#16a34a" : "#ea580c",
            color: "#fff",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {decision.approved ? "✓ অনুমোদিত" : "✗ অবরুদ্ধ"}
        </div>
      </div>

      {/* Blocked reason (if any) */}
      {decision.blockedReason && (
        <div
          style={{
            fontSize: 11,
            color: "#9a3412",
            background: "#fff7ed",
            borderRadius: 8,
            padding: "6px 10px",
            marginBottom: 8,
            lineHeight: 1.5,
          }}
        >
          ⚠️ {decision.blockedReason}
        </div>
      )}

      {/* Gate sequence */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {GATE_ORDER.map((gateId) => {
          const gate = decision.gates.find((g) => g.id === gateId);
          if (!gate) return null;
          return (
            <div
              key={gateId}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 6,
                background: gate.passed ? "#dcfce7" : "#fee2e2",
              }}
            >
              <span style={{ fontSize: 13 }}>{GATE_ICONS[gate.id]}</span>
              <span style={{ fontWeight: 700, color: gate.passed ? "#166534" : "#991b1b", minWidth: 90 }}>
                {gate.passed ? "✓" : "✗"} {gate.nameBn}
              </span>
              <span style={{ color: C.textMuted, flex: 1, lineHeight: 1.4 }}>{gate.reason}</span>
            </div>
          );
        })}
      </div>

      {/* Approved treatment */}
      {decision.approved && decision.approvedTreatment && (
        <div
          style={{
            fontSize: 11,
            background: "#dcfce7",
            borderRadius: 8,
            padding: "8px 10px",
            marginBottom: 8,
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: "#166534" }}>অনুমোদিত চিকিৎসা:</b>{" "}
          {(() => {
            const g = getMoaGroup(decision.approvedTreatment.moaCode);
            return g
              ? `${g.shortCode} (${g.nameBn}) — ${decision.approvedTreatment.activeIngredient}`
              : decision.approvedTreatment.moaCode;
          })()}
        </div>
      )}

      {/* Compliance notes */}
      {decision.complianceNotes.length > 0 && (
        <div style={{ fontSize: 10.5, color: C.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
          <b>মান্যতা নোট:</b>
          <ul style={{ margin: "4px 0 0 14px", padding: 0 }}>
            {decision.complianceNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternative MoA options (when MoA gate blocked) */}
      {decision.alternativeMoaOptions.length > 0 && !decision.approved && (
        <div style={{ fontSize: 10.5, color: C.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
          <b>বিকল্প MoA গ্রুপ:</b>
          <ul style={{ margin: "4px 0 0 14px", padding: 0 }}>
            {decision.alternativeMoaOptions.map((a, i) => (
              <li key={i}>
                {a.shortCode} ({a.nameBn}) —{" "}
                {a.compliant ? (
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>রোটেশন-সম্মত ✓</span>
                ) : (
                  <span style={{ color: "#dc2626" }}>অবরুদ্ধ</span>
                )}{" "}
                <span style={{ fontSize: 9 }}>(ঝুঁকি: {a.resistanceRisk})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Record treatment button (explicit consent) */}
      {decision.approved && !recorded && (
        <button
          onClick={recordApprovedTreatment}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 10,
            border: "none",
            background: C.primary,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✓ অনুমোদিত চিকিৎসা কেসে রেকর্ড করুন
        </button>
      )}
      {recorded && (
        <div style={{ fontSize: 11, color: C.primary, marginTop: 6, fontWeight: 700 }}>
          ✓ চিকিৎসা কেসে রেকর্ড করা হয়েছে। MoA গ্রুপ রোটেশন ট্র্যাকিংয়ে যোগ হয়েছে।
        </div>
      )}

      {/* Model limitations (expandable) */}
      <button
        onClick={() => setShowLimitations((s) => !s)}
        style={{
          fontSize: 10,
          color: C.textMuted,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginTop: 6,
          textDecoration: "underline",
        }}
      >
        {showLimitations ? "▼ সীমাবদ্ধতা লুকান" : "▶ সীমাবদ্ধতা দেখুন"}
      </button>
      {showLimitations && (
        <div
          style={{
            fontSize: 10,
            color: C.textMuted,
            background: C.bgMuted,
            borderRadius: 8,
            padding: "8px 10px",
            marginTop: 4,
            lineHeight: 1.6,
          }}
        >
          <ul style={{ margin: 0, paddingLeft: 14 }}>
            {decision.modelLimitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

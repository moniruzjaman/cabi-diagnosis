import { useMemo } from "react";
import { CROP_DISEASES, resolveCropKey } from "../../data/cropDiseases";
import { CROP_CALENDAR, getCurrentRiskAlerts } from "../../data/cropCalendar";

/**
 * PreventionPlan — Pillar 3 (PREVENT).
 *
 * Builds a preventive crop-health plan for a selected crop from:
 *   - resistant varieties documented in cropDiseases.js recommendations
 *   - cultural/hygiene practices from disease recommendations
 *   - seasonal risk alerts from the crop calendar (getCurrentRiskAlerts)
 *   - crop calendar season windows (what to do this month)
 *
 * Nothing is invented here — every line shown is derived from the existing
 * agronomic datasets (cropDiseases.js / cropCalendar.js) or the diagnosis
 * context passed in. Where a crop has no documented data, we say so.
 */

const HYGIENE_KEYWORDS = [
  "সরিয়ে",
  "পরিষ্কার",
  "শোধন",
  "সান",
  "পুড়িয়ে",
  "সরান",
  "নষ্ট",
  "আগাছা",
  "স্যানিটাইজ",
  "বীজ শোধন",
];
const VARIETY_KEYWORDS = ["জাত", "প্রতিরোধী"];
const ROTATION_KEYWORDS = ["চষা", "ক্রম", "ফসল পরিবর্তন", "রোটেশন", "পালা", "বর্ষা"];

function isPreventionLine(rec) {
  const r = rec || "";
  return (
    HYGIENE_KEYWORDS.some((k) => r.includes(k)) ||
    ROTATION_KEYWORDS.some((k) => r.includes(k)) ||
    r.includes("দূরত্ব") ||
    r.includes("নিষ্কাশন") ||
    r.includes("জল") ||
    r.includes("সেচ")
  );
}

function isVarietyLine(rec) {
  const r = rec || "";
  return VARIETY_KEYWORDS.some((k) => r.includes(k));
}

export default function PreventionPlan({ C, crop, district, weatherRisk }) {
  const data = useMemo(() => {
    // form.crop may be bilingual ("Rice / ধান") — resolveCropKey maps any
    // format to the CROP_DISEASES key, exactly like the diagnose flow does.
    const cropKey = crop ? (CROP_DISEASES[crop] ? crop : resolveCropKey(crop)) : null;
    if (!cropKey || !CROP_DISEASES[cropKey]) return null;

    const varieties = new Set();
    const hygiene = new Set();
    const rotation = new Set();
    const seasonalDiseases = [];

    for (const d of CROP_DISEASES[cropKey].diseases || []) {
      for (const rec of d.recommendations || []) {
        if (isVarietyLine(rec)) varieties.add(rec);
        else if (ROTATION_KEYWORDS.some((k) => rec.includes(k))) rotation.add(rec);
        else if (isPreventionLine(rec)) hygiene.add(rec);
      }
      seasonalDiseases.push({
        name: d.nameBn || d.name,
        season: (d.season || []).join(", "),
        conditions: d.conditions || "",
      });
    }

    const cal = CROP_CALENDAR.find((c) => c.crop === cropKey);
    return {
      cropKey,
      cropEn: CROP_DISEASES[cropKey].en,
      varieties: [...varieties],
      hygiene: [...hygiene],
      rotation: [...rotation],
      seasonalDiseases,
      calendar: cal || null,
    };
  }, [crop]);

  const alerts = useMemo(() => {
    try {
      return getCurrentRiskAlerts();
    } catch {
      return [];
    }
  }, []);

  const cropAlert = alerts.find((a) => a.crop === (data?.cropKey || crop));

  if (!crop) {
    return (
      <div
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 18,
          boxShadow: C.shadow,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 34, marginBottom: 8 }} aria-hidden="true">
          🛡️
        </div>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.primaryDark, marginBottom: 6 }}>
          প্রতিরোধ পরিকল্পনা (PREVENT)
        </div>
        <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7, margin: 0 }}>
          প্রথমে <b>নির্ণয়</b> ট্যাবে গিয়ে ফসল নির্বাচন করুন বা একটি রোগ নির্ণয় সম্পন্ন করুন — তারপর এখানে সেই ফসলের
          জন্য মৌসুমভিত্তিক প্রতিরোধ পরিকল্পনা দেখতে পাবেন।
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 18,
          boxShadow: C.shadow,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 14, color: C.primaryDark, marginBottom: 8 }}>
          🛡️ {crop} — প্রতিরোধ নির্দেশনা
        </div>
        <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7, margin: 0 }}>
          এই ফসলের জন্য ডেটাবেজে নথিভুক্ত প্রতিরোধ তথ্য এখনো নেই। সাধারণ স্বাস্থ্যবিধি মেনে চলুন — আক্রান্ত গাছ অপসারণ,
          বীজ শোধন, সেচ নিষ্কাশন ও পরিষ্কার-পরিচ্ছন্ন যন্ত্রপাতি। DAE কর্মীর পরামর্শ নিন।
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, #1D4ED8 0%, #2563eb 100%)`,
          borderRadius: 16,
          padding: "16px 18px",
          color: "#fff",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16 }}>🛡️ প্রতিরোধ পরিকল্পনা — {data.cropKey}</div>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
          PREVENT · {data.cropEn} {district ? `· ${district}` : ""} · রোগ আসার আগেই প্রস্তুতি
        </div>
      </div>

      {/* Seasonal risk */}
      {cropAlert && (
        <div
          style={{
            background: C.bgDanger,
            border: `1px solid ${C.borderDanger}`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 13, color: C.textDanger, marginBottom: 6 }}>
            ⚠️ এই মৌসুমে ঝুঁকি ({cropAlert.riskPeriod || "চলতি মৌসুম"})
          </div>
          {cropAlert.keyDiseases?.length > 0 && (
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>
              <b>মূল রোগ:</b> {cropAlert.keyDiseases.join(", ")}
            </div>
          )}
          {cropAlert.keyPests?.length > 0 && (
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, marginTop: 2 }}>
              <b>মূল কীট:</b> {cropAlert.keyPests.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Weather risk (from diagnosis context) */}
      {weatherRisk && (
        <div
          style={{
            background: C.bgWarning,
            border: `1px solid ${C.borderWarning}`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 13, color: C.textWarning, marginBottom: 4 }}>
            🌦️ আবহাওয়া ঝুঁকি সতর্কতা
          </div>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{weatherRisk}</div>
        </div>
      )}

      {/* Resistant varieties */}
      {data.varieties.length > 0 && (
        <Section C={C} icon="🌱" title="প্রতিরোধী জাত (নথিভুক্ত)" bg="#f0fdf4" border="#bbf7d0">
          {data.varieties.slice(0, 6).map((v, i) => (
            <li key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.7, marginLeft: 16 }}>
              {v}
            </li>
          ))}
          <div style={{ fontSize: 9.5, color: C.textLight, marginTop: 6 }}>
            উৎস: অ্যাপের রোগ-ডেটাবেজে নথিভুক্ত সুপারিশ — চূড়ান্ত জাত নির্বাচনে DAE/গবেষণা কেন্দ্রের সাথে যাচাই করুন।
          </div>
        </Section>
      )}

      {/* Hygiene & sanitation */}
      {data.hygiene.length > 0 && (
        <Section C={C} icon="🧹" title="স্বাস্থ্যবিধি ও পরিচ্ছন্নতা" bg="#eff6ff" border="#bfdbfe">
          {data.hygiene.slice(0, 8).map((v, i) => (
            <li key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.7, marginLeft: 16 }}>
              {v}
            </li>
          ))}
        </Section>
      )}

      {/* Rotation / agronomy */}
      {data.rotation.length > 0 && (
        <Section C={C} icon="🔄" title="চাষাবাদ ও ফসল পরিবর্তন" bg="#ecfeff" border="#a5f3fc">
          {data.rotation.slice(0, 6).map((v, i) => (
            <li key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.7, marginLeft: 16 }}>
              {v}
            </li>
          ))}
        </Section>
      )}

      {/* Seasonal disease calendar */}
      <Section C={C} icon="📅" title="মৌসুমভিত্তিক রোগ-পঞ্জিকা" bg="#faf5ff" border="#e9d5ff">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 380 }}>
            <thead>
              <tr style={{ textAlign: "left", color: C.textMuted }}>
                <th style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>রোগ</th>
                <th style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>মৌসুম</th>
              </tr>
            </thead>
            <tbody>
              {data.seasonalDiseases.map((d, i) => (
                <tr key={i}>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${C.border}`,
                      color: C.text,
                      fontWeight: 600,
                    }}
                  >
                    {d.name}
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, color: C.textMuted }}>
                    {d.season}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 9.5, color: C.textLight, marginTop: 6 }}>
          প্রতিটি রোগের অনুকূল অবস্থা জানতে “নির্ণয়” ট্যাবে লক্ষণ মিলিয়ে দেখুন।
        </div>
      </Section>

      {/* Monitoring advice */}
      <Section C={C} icon="👁️" title="নিয়মিত পর্যবেক্ষণের পরামর্শ" bg="#fffbeb" border="#fcd34d">
        {[
          "সপ্তাহে অন্তত একবার মাঠ পরিদর্শন করুন — বিশেষত উপরের ঝুঁকিপূর্ণ মৌসুমে।",
          "প্রথম লক্ষণ দেখা দিলে ছবি তুলে “নির্ণয়” চালান এবং কেস খুলে রেকর্ড রাখুন।",
          "প্রতিবেশী কৃষকদের সাথে তথ্য বিনিময় করুন — প্রাদুর্ভাব এলাকায় আগে জানা গেলে প্রতিরোধ সহজ।",
          "“ক্যালেন্ডার” ট্যাবে আবহাওয়া-ভিত্তিক রোগ চাপ (disease pressure) দেখুন।",
        ].map((t, i) => (
          <li key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.7, marginLeft: 16 }}>
            {t}
          </li>
        ))}
      </Section>
    </div>
  );
}

function Section({ C, icon, title, bg, border, children }) {
  return (
    <div
      style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 14,
        boxShadow: C.shadow,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 800,
          fontSize: 13,
          color: C.primaryDark,
          marginBottom: 8,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: bg,
            border: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          {icon}
        </span>
        {title}
      </div>
      <ul style={{ margin: 0, padding: 0 }}>{children}</ul>
    </div>
  );
}

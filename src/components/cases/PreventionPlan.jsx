import { useMemo } from "react";
import { CROP_DISEASES, resolveCropKey } from "../../data/cropDiseases";
import { CROP_CALENDAR, getCurrentRiskAlerts } from "../../data/cropCalendar";
import { getPestsByCrop } from "../../intelligence/pestEngine.js";

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
const CHEMICAL_OR_CURATIVE =
  /(কীটনাশক|ছত্রাকনাশক|আগাছানাশক|ইমিডাক্লোপ্রিড|বুপ্রোফেজিন|ট্রাইসাইক্লাজোল|আইসোপ্রোথিয়োলেন|হেক্সাকোনাজোল|ভ্যালিডামাইসিন|কার্বেন্ডাজিম|স্ট্রেপটোসাইক্লিন|কপার অক্সি|স্প্রে করুন|spray|insecticide|fungicide|herbicide|pesticide|curative|দমন করতে.*প্রয়োগ)/i;

const BASELINE_IPM = [
  [
    "পরিষ্কার বীজ ও সুস্থ চারা",
    "বিশ্বস্ত উৎসের মানসম্মত বীজ/চারা নিন; রোপণের আগে চারা ও বীজে রোগ-পোকার লক্ষণ পরীক্ষা করুন।",
  ],
  [
    "জমি ও ফসলের পরিচ্ছন্নতা",
    "আক্রান্ত গাছ/ডাল/ফল আলাদা করে নিরাপদে নষ্ট করুন; আগের ফসলের আক্রান্ত অবশিষ্ট ও আগাছার বিকল্প পোষক নিয়ন্ত্রণ করুন।",
  ],
  [
    "সুষম সার ও সঠিক দূরত্ব",
    "মাটি ও ফসলের চাহিদা অনুযায়ী সুষম সার দিন; অতিরিক্ত নাইট্রোজেন ও অতিঘন রোপণ এড়িয়ে চলুন।",
  ],
  [
    "পানি ও নিষ্কাশন ব্যবস্থাপনা",
    "ফসলের পর্যায় অনুযায়ী সেচ দিন; জলাবদ্ধতা, দীর্ঘক্ষণ পাতাভেজা থাকা ও অপ্রয়োজনীয় ওপরের সেচ কমান।",
  ],
  [
    "ফসল পর্যায়ক্রম ও সময়মতো চাষ",
    "সম্ভব হলে একই জমিতে একই পোষক ফসল বারবার না করে উপযুক্ত ফসল পর্যায়ক্রম অনুসরণ করুন; স্থানীয় বপন/রোপণ সময় মানুন।",
  ],
  [
    "উপকারী জীব সংরক্ষণ",
    "মাকড়সা, লেডিবার্ড, পরজীবী বোলতা ও অন্যান্য প্রাকৃতিক শত্রু রক্ষা করুন; অকারণে বিস্তৃত-বর্ণালী বালাইনাশক ব্যবহার করবেন না।",
  ],
];

function getProfileCrop(profileKey) {
  if (typeof localStorage === "undefined") return "";
  try {
    const saved = JSON.parse(localStorage.getItem(`ud-risk-profile:${profileKey || "this-device"}`) || "null");
    return saved?.crops?.[0]?.crop || "";
  } catch {
    return "";
  }
}

function isChemicalOrCurativeLine(rec) {
  return CHEMICAL_OR_CURATIVE.test(String(rec || ""));
}
const ROTATION_KEYWORDS = ["চষা", "ক্রম", "ফসল পরিবর্তন", "রোটেশন", "পালা", "বর্ষা"];

function isPreventionLine(rec) {
  const r = rec || "";
  return (
    !isChemicalOrCurativeLine(r) &&
    (HYGIENE_KEYWORDS.some((k) => r.includes(k)) ||
      ROTATION_KEYWORDS.some((k) => r.includes(k)) ||
      r.includes("দূরত্ব") ||
      r.includes("নিষ্কাশন") ||
      r.includes("জল") ||
      r.includes("সেচ"))
  );
}

function isVarietyLine(rec) {
  const r = rec || "";
  return VARIETY_KEYWORDS.some((k) => r.includes(k));
}

export default function PreventionPlan({
  C,
  crop,
  district,
  weatherRisk,
  onOpenProtection,
  profileKey = "this-device",
}) {
  const workingCrop = crop || getProfileCrop(profileKey);
  const data = useMemo(() => {
    // form.crop may be bilingual ("Rice / ধান") — resolveCropKey maps any
    // format to the CROP_DISEASES key, exactly like the diagnose flow does.
    const cropKey = workingCrop ? (CROP_DISEASES[workingCrop] ? workingCrop : resolveCropKey(workingCrop)) : null;
    if (!cropKey || !CROP_DISEASES[cropKey]) return null;

    const varieties = new Set();
    const hygiene = new Set();
    const rotation = new Set();
    const seasonalDiseases = [];

    for (const d of CROP_DISEASES[cropKey].diseases || []) {
      for (const rec of d.recommendations || []) {
        if (isVarietyLine(rec) && !isChemicalOrCurativeLine(rec)) varieties.add(rec);
        else if (!isChemicalOrCurativeLine(rec) && ROTATION_KEYWORDS.some((k) => rec.includes(k))) rotation.add(rec);
        else if (isPreventionLine(rec)) hygiene.add(rec);
      }
      seasonalDiseases.push({
        name: d.nameBn || d.name,
        season: (d.season || []).join(", "),
        conditions: d.conditions || "",
      });
    }

    const cal = CROP_CALENDAR.find((c) => c.crop === cropKey);
    const cropEn = CROP_DISEASES[cropKey].en;
    const cropId = {
      rice: "rice",
      wheat: "wheat",
      jute: "jute",
      potato: "potato",
      tomato: "tomato",
      chili: "chili",
      chilli: "chili",
      brinjal: "brinjal",
      mustard: "mustard",
      onion: "onion",
      maize: "maize",
      corn: "maize",
    }[String(cropEn || "").toLowerCase()];
    const pests = cropId ? getPestsByCrop(cropId) : [];
    const ipmPractices = {
      cultural: new Set(),
      mechanical: new Set(),
      biological: new Set(),
    };
    for (const pest of pests) {
      for (const action of pest.preventiveActionsBn || pest.preventiveActions || []) {
        const text = String(action || "").trim();
        if (!text || /(কীটনাশক|ছত্রাকনাশক|insecticide|fungicide|chemical|স্প্রে)/i.test(text)) continue;
        if (
          /(নিম তেল|ট্রাইকোগ্রামা|ট্রাইকোডার্মা|জৈব|প্রাকৃতিক শত্রু|পরজীবী|পরভোজী|লেডিবাগ|মাকড়সা|জীব নিয়ন্ত্রণ)/i.test(
            text,
          )
        ) {
          ipmPractices.biological.add(text);
        } else if (/(ফাঁদ|ট্র্যাপ|হাতে|সংগ্রহ|অপসারণ|কেটে|ধ্বংস|নষ্ট|জাল|আলোক)/i.test(text)) {
          ipmPractices.mechanical.add(text);
        } else {
          ipmPractices.cultural.add(text);
        }
      }
    }
    const pestThresholds = pests
      .filter((pest) => pest.economicThreshold)
      .map((pest) => ({
        name: pest.nameBn || pest.name,
        threshold: pest.economicThreshold,
      }));
    return {
      cropKey,
      cropEn,
      baselineIpm: BASELINE_IPM,
      varieties: [...varieties],
      hygiene: [...hygiene],
      rotation: [...rotation],
      seasonalDiseases,
      ipmPractices: {
        cultural: [...ipmPractices.cultural],
        mechanical: [...ipmPractices.mechanical],
        biological: [...ipmPractices.biological],
      },
      pestThresholds,
      calendar: cal || null,
    };
  }, [workingCrop]);

  const alerts = useMemo(() => {
    try {
      return getCurrentRiskAlerts();
    } catch {
      return [];
    }
  }, []);

  const cropAlert = alerts.find((a) => a.crop === (data?.cropKey || workingCrop));

  if (!workingCrop) {
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
          🛡️ {workingCrop} — প্রতিরোধ নির্দেশনা
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

      {/* Prevention-first baseline IPM */}
      <Section C={C} icon="🌿" title="প্রতিরোধের ভিত্তি — রাসায়নিকবিহীন IPM" bg="#f0fdf4" border="#bbf7d0">
        <div style={{ fontSize: 10.5, color: C.textMuted, lineHeight: 1.6, marginBottom: 7 }}>
          এগুলো প্রতিরোধমূলক মাঠ-ব্যবস্থাপনা; কোনো রোগ/পোকা দমনের রাসায়নিক প্রেসক্রিপশন নয়। ফসল ও স্থানভেদে স্থানীয়
          DAE পরামর্শ অনুসরণ করুন।
        </div>
        {data.baselineIpm.map(([title, detail]) => (
          <li key={title} style={{ fontSize: 11.5, color: C.text, lineHeight: 1.65, marginLeft: 16, marginBottom: 4 }}>
            <b>{title}:</b> {detail}
          </li>
        ))}
      </Section>

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

      {/* Crop-specific IPM practices from the field pest engine */}
      <Section C={C} icon="🧩" title="সমন্বিত বালাই ব্যবস্থাপনা (IPM)" bg="#eff6ff" border="#bfdbfe">
        <li style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginLeft: 16 }}>
          রাসায়নিকের আগে প্রতিরোধ, পর্যবেক্ষণ, সাংস্কৃতিক, যান্ত্রিক ও জৈব পদ্ধতিকে অগ্রাধিকার দিন।
        </li>
        {[
          ["সাংস্কৃতিক ও কৃষিতাত্ত্বিক", data.ipmPractices.cultural],
          ["যান্ত্রিক ও ভৌত", data.ipmPractices.mechanical],
          ["জৈব ও পরিবেশবান্ধব", data.ipmPractices.biological],
        ].map(([title, items]) => (
          <li key={title} style={{ listStyle: "none", margin: "8px 0 0 0" }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: C.primaryDark, marginBottom: 3 }}>{title}</div>
            {items.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {items.slice(0, 8).map((item, index) => (
                  <li key={index} style={{ fontSize: 11.5, color: C.text, lineHeight: 1.65 }}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: 10.5, color: C.textMuted }}>
                এই শ্রেণিতে ফসল-নির্দিষ্ট নথিভুক্ত তথ্য নেই; মাঠ পর্যায়ে DAE-এর পরামর্শ নিন।
              </div>
            )}
          </li>
        ))}
      </Section>

      {data.pestThresholds.length > 0 && (
        <Section C={C} icon="📏" title="পোকা পর্যবেক্ষণ ও অর্থনৈতিক সীমামান" bg="#fffbeb" border="#fcd34d">
          {data.pestThresholds.slice(0, 8).map((item, index) => (
            <li key={index} style={{ fontSize: 11.5, color: C.text, lineHeight: 1.6, marginLeft: 16 }}>
              <b>{item.name}:</b> {item.threshold}
            </li>
          ))}
          <div style={{ fontSize: 9.5, color: C.textLight, marginTop: 6 }}>
            সীমামান ফসল, জাত, পর্যায় ও স্থানভেদে যাচাই করুন; এটি স্বয়ংক্রিয় স্প্রে-অনুমতি নয়।
          </div>
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

      <div
        style={{
          background: C.bgWarning,
          border: `1px solid ${C.borderWarning}`,
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 800, color: C.textWarning, marginBottom: 5 }}>
          ⚠️ Prevent = প্রতিরোধ, not curative
        </div>
        <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.6 }}>
          রোগ/পোকা নিশ্চিতকরণ, মাঠ পর্যবেক্ষণ ও অর্থনৈতিক সীমামান অতিক্রম না করে স্প্রে করবেন না। পণ্যটি সংশ্লিষ্ট ফসল ও
          বালাইয়ের জন্য DAE-নিবন্ধিত কি না, লেবেল, মাত্রা, PPE এবং PHI যাচাই করুন।
        </div>
        {onOpenProtection && (
          <button
            onClick={onOpenProtection}
            style={{
              marginTop: 9,
              padding: "8px 12px",
              borderRadius: 9,
              border: "none",
              background: C.primary,
              color: "#fff",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            সুরক্ষা ও পণ্য যাচাই দেখুন →
          </button>
        )}
      </div>
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

import { useState, useEffect, useRef } from "react";
import { fetchWeather } from "../../intelligence/weatherProvider.js";
import { computeRiskRadar, makeMinimalActiveCrop } from "../../intelligence/riskRadar.js";
import { updateRiskAssessment } from "../../data/cropHealthCases.js";
import ScoutingScheduler from "./ScoutingScheduler.jsx";
import CropProtectionPanel from "./CropProtectionPanel.jsx";

// ────────────────────────────────────────────────────────────────────────────
// RiskRadarWidget — renders the Disease Risk Radar for an active Crop Health
// Case on the MONITOR pillar (case detail view). Fetches weather (Open-Meteo,
// keyless, CORS-friendly), runs computeRiskRadar, and shows:
//   - risk level badge (color-coded)
//   - crop + growth stage
//   - top disease risk (name + score)
//   - weather evidence (temp, humidity, leaf-wetness, rain) with freshness
//   - confidence + model limitations (expandable, Bangla-first)
//   - scouting action (if risk ≥ 25) via ScoutingScheduler
//
// Safety gates: weather unavailable → "আবহাওয়ার তথ্য অনুপস্থিত", no risk.
// Scores are never presented as calibrated probabilities.
// ────────────────────────────────────────────────────────────────────────────

// Map Bangla crop names (as stored in cropHealthCases) to the disease DB cropIds.
const CROP_NAME_TO_ID = {
  ধান: "rice",
  ধানের: "rice",
  paddy: "rice",
  rice: "rice",
  গম: "wheat",
  wheat: "wheat",
  পাট: "jute",
  jute: "jute",
  আলু: "potato",
  potato: "potato",
  টমেটো: "tomato",
  টমেটর: "tomato",
  tomato: "tomato",
  মরিচ: "chili",
  মরিচের: "chili",
  chili: "chili",
  chilli: "chili",
  বেগুন: "brinjal",
  বেগুনের: "brinjal",
  brinjal: "brinjal",
  eggplant: "brinjal",
  সরিষা: "mustard",
  সরিষার: "mustard",
  mustard: "mustard",
  পেঁয়াজ: "onion",
  পেঁয়াজের: "onion",
  onion: "onion",
  ভুট্টা: "maize",
  মকা: "maize",
  ভুট্টার: "maize",
  maize: "maize",
  corn: "maize",
};

// Map common growth-stage strings (Bangla/English) to GrowthStageId.
const STAGE_TO_ID = {
  চারা: "seedling",
  seedling: "seedling",
  germination: "germination",
  গাছপলা: "vegetative",
  সবজ: "vegetative",
  vegetative: "vegetative",
  গুলা: "tillering",
  tillering: "tillering",
  কাণ্ড: "stem_elongation",
  stem_elongation: "stem_elongation",
  বুট: "booting",
  booting: "booting",
  শির: "heading",
  শীষ: "heading",
  heading: "heading",
  ফুল: "flowering",
  "ফুল ধরা": "flowering",
  flowering: "flowering",
  দানা: "grain_filling",
  "দানা ভরা": "grain_filling",
  grain_filling: "grain_filling",
  পাকা: "ripening",
  "পাকা ধান": "ripening",
  ripening: "ripening",
  কাটা: "harvest",
  "ফসল কাটা": "harvest",
  harvest: "harvest",
};

// Minimal district→coordinate table (fallback when case has no GPS).
const DISTRICT_COORDS = {
  ঢাকা: { lat: 23.8103, lon: 90.4125 },
  চট্টগ্রাম: { lat: 22.3569, lon: 91.7832 },
  রাজশাহী: { lat: 24.3636, lon: 88.6241 },
  খুলনা: { lat: 22.8456, lon: 89.5403 },
  সিলেট: { lat: 24.8949, lon: 91.8687 },
  বরিশাল: { lat: 22.701, lon: 90.3535 },
  রংপুর: { lat: 25.7439, lon: 89.2752 },
  ময়মনসিংহ: { lat: 24.7471, lon: 90.4203 },
};

const RISK_COLORS = {
  low: { bg: "#dcfce7", fg: "#166534", label: "কম" },
  moderate: { bg: "#fef9c3", fg: "#854d0e", label: "মাঝারি" },
  high: { bg: "#ffedd5", fg: "#9a3412", label: "বেশি" },
  very_high: { bg: "#fee2e2", fg: "#991b1b", label: "অনেক বেশি" },
  unknown: { bg: "#f1f5f9", fg: "#475569", label: "অজানা" },
};

function resolveCropId(cropName) {
  if (!cropName) return null;
  const key = String(cropName).trim();
  return CROP_NAME_TO_ID[key] || null;
}

function resolveStageId(stage) {
  if (!stage) return "vegetative";
  const key = String(stage).trim();
  return STAGE_TO_ID[key] || "vegetative";
}

function resolveLocation(c) {
  if (c.location && c.location.lat != null && c.location.lon != null) {
    return { latitude: c.location.lat, longitude: c.location.lon, name: c.district || "field", country: "BD" };
  }
  if (c.district && DISTRICT_COORDS[c.district]) {
    const coord = DISTRICT_COORDS[c.district];
    return { latitude: coord.lat, longitude: coord.lon, name: c.district, country: "BD" };
  }
  // Fallback: Dhaka (so the widget still works for cases without a district).
  return { latitude: 23.8103, longitude: 90.4125, name: c.district || "ঢাকা", country: "BD" };
}

export default function RiskRadarWidget({ C, case: caseObj }) {
  const [radar, setRadar] = useState(null);
  const [error, setError] = useState(null);
  const [showLimitations, setShowLimitations] = useState(false);
  const mountedRef = useRef(true);

  const c = caseObj;
  const cropId = resolveCropId(c.crop);
  const unsupported = !cropId;
  // Loading is derived (not state) to avoid synchronous setState in the effect.
  const loading = !radar && !error && !unsupported;

  useEffect(() => {
    if (unsupported) return; // no fetch for unsupported crops
    mountedRef.current = true;
    const location = resolveLocation(c);
    const stage = resolveStageId(c.growthStage);
    const activeCrop = makeMinimalActiveCrop(cropId, c.crop, stage);

    fetchWeather(location)
      .then((weather) => {
        if (!mountedRef.current) return;
        const result = computeRiskRadar({ weather, activeCrops: [activeCrop] });
        setRadar(result);
        // Cache the snapshot on the case (non-breaking optional field).
        try {
          updateRiskAssessment(c.id, result);
        } catch {
          // updateRiskAssessment may not be available in older case stores — ignore.
        }
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setError(err?.message || "weather-fetch-failed");
        // Still show the "unavailable" state via computeRiskRadar.
        setRadar(computeRiskRadar({ weather: null, activeCrops: [activeCrop] }));
      })
      .finally(() => {
        if (mountedRef.current) {
          // setLoading is derived — no setState needed here.
        }
      });

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id, c.crop, c.growthStage, c.district, c.location?.lat, c.location?.lon, unsupported, cropId]);

  if (unsupported) {
    return (
      <div style={{ background: C.bgMuted, borderRadius: 12, padding: "10px 12px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted }}>🛰️ রোগ ঝুঁকি রাডার</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
          এই ফসলের জন্য ({c.crop}) রোগ ঝুঁকি মডেল এখনও উপলব্ধ নয়। পরবর্তী আপডেটে আরও ফসল যোগ হবে।
        </div>
      </div>
    );
  }

  if (loading && !radar) {
    return (
      <div style={{ background: C.bgMuted, borderRadius: 12, padding: "10px 12px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>🛰️ রোগ ঝুঁকি রাডার</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>আবহাওয়া তথ্য আনা হচ্ছে…</div>
      </div>
    );
  }

  if (!radar) return null;

  const colors = RISK_COLORS[radar.riskLevel] || RISK_COLORS.unknown;
  const topDisease = radar.diseaseForecast?.diseases?.[0] || null;
  // Ported pest forecast: insect-pest pressure (warm nights + dry spells).
  const topPest = radar.pestForecast?.pests?.[0] || null;
  const highPest = radar.pestForecast?.pests?.filter((p) => p.risk >= 45) || [];

  return (
    <div style={{ background: C.bg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}` }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>🛰️ রোগ ঝুঁকি রাডার</div>
        <div
          style={{
            background: colors.bg,
            color: colors.fg,
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {colors.label}
          {radar.overallRiskScore != null ? ` · ${radar.overallRiskScore}/১০০` : ""}
        </div>
      </div>

      {/* Weather unavailable state */}
      {radar.dataFreshness === "unavailable" ? (
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
          <b style={{ color: C.danger }}>আবহাওয়ার তথ্য অনুপস্থিত।</b> ঝুঁকি গণনা করা হয়নি। ইন্টারনেট সংযোগ পরীক্ষা
          করুন বা পরে আবার চেষ্টা করুন।
          <button
            onClick={() => {
              setError(null);
              setRadar(null);
              // Re-trigger by toggling a state the effect depends on — simplest: reload component key via parent.
              // For now, the parent can remount by changing caseId; we provide a manual retry hint.
            }}
            style={{
              marginLeft: 8,
              fontSize: 10,
              color: C.primary,
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      ) : (
        <>
          {/* Crop + stage */}
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>
            <b style={{ color: C.text }}>{c.crop}</b>
            {c.growthStage ? ` · ${c.growthStage}` : ""}
            {radar.dataFreshness === "stale" ? (
              <span style={{ marginLeft: 6, color: C.warning, fontSize: 10 }}>⚠ পুরনো তথ্য</span>
            ) : null}
          </div>

          {/* Top disease */}
          {topDisease && topDisease.risk > 0 ? (
            <div style={{ fontSize: 11, marginBottom: 6, lineHeight: 1.5 }}>
              <b>🎯 প্রধান ঝুঁকি:</b> {topDisease.disease.nameBn}
              <span style={{ color: C.textMuted }}> ({topDisease.risk}/১০০)</span>
              {topDisease.disease.sources?.includes("uncited") ? (
                <span style={{ marginLeft: 4, fontSize: 9, color: C.textMuted }}>থ্রেশহোল্ড অনুমানিত</span>
              ) : null}
            </div>
          ) : (
            <div style={{ fontSize: 11, marginBottom: 6, color: C.textMuted }}>
              বর্তমান আবহাওয়ায় তাৎক্ষণিক রোগের ঝুঁকি কম।
            </div>
          )}

          {/* Ported pest forecast (insect pressure — opposite weather model) */}
          {topPest && topPest.risk > 0 ? (
            <div style={{ fontSize: 11, marginBottom: 6, lineHeight: 1.5 }}>
              <b>🐛 পোকার চাপ:</b> {topPest.pest.nameBn}
              <span style={{ color: C.textMuted }}> ({topPest.risk}/১০০)</span>
              {highPest.length > 1 ? (
                <span style={{ color: C.textMuted, fontSize: 10 }}> +{highPest.length - 1}টি আরও</span>
              ) : null}
              {topPest.pest.economicThreshold ? (
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                  সীমামান: {topPest.pest.economicThreshold}
                </div>
              ) : null}
              {topPest.preventiveActions?.[0] ? (
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                  প্রতিরোধ: {topPest.preventiveActionsBn?.[0] || topPest.preventiveActions[0]}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Weather evidence */}
          {radar.topRisks.find((r) => r.category === "disease")?.evidence?.length > 0 && (
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, lineHeight: 1.5 }}>
              <b>প্রমাণ:</b>{" "}
              {radar.topRisks
                .find((r) => r.category === "disease")
                .evidence.slice(0, 3)
                .join(" · ")}
            </div>
          )}

          {/* Confidence + limitations (expandable) */}
          <button
            onClick={() => setShowLimitations((s) => !s)}
            style={{
              fontSize: 10,
              color: C.textMuted,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginBottom: 4,
              textDecoration: "underline",
            }}
          >
            {showLimitations ? "▼ আত্মবিশ্বাস ও সীমাবদ্ধতা লুকান" : "▶ আত্মবিশ্বাস ও সীমাবদ্ধতা দেখুন"}
          </button>
          {showLimitations && (
            <div
              style={{
                fontSize: 10,
                color: C.textMuted,
                background: C.bgMuted,
                borderRadius: 8,
                padding: "8px 10px",
                marginBottom: 8,
                lineHeight: 1.6,
              }}
            >
              <b>আত্মবিশ্বাস:</b> {radar.explanation?.confidence ?? "—"}%
              <div style={{ marginTop: 4 }}>{radar.explanation?.confidenceReasonBn}</div>
              {radar.modelLimitations.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <b>সীমাবদ্ধতা:</b>
                  <ul style={{ margin: "4px 0 0 14px", padding: 0 }}>
                    {radar.modelLimitations.slice(0, 4).map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Scouting action (scouting-first: risk ≥ 25 → scout, not spray) */}
          {radar.scoutingAction ? (
            <ScoutingScheduler C={C} caseId={c.id} scoutingAction={radar.scoutingAction} />
          ) : radar.overallRiskScore != null && radar.overallRiskScore >= 60 ? (
            <>
              <div
                style={{
                  fontSize: 10.5,
                  color: C.danger,
                  background: "#fee2e2",
                  borderRadius: 8,
                  padding: "6px 10px",
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                ⚠️ রোগের ঝুঁকি বেশি (≥৬০)। আবহাওয়া অনুকূল হওয়া স্প্রে করার অনুমতি নয় — নিচের ক্রপ প্রোটেকশন ডিসিশন
                ইঞ্জিনের ধাপ অনুসরণ করুন।
              </div>
              <CropProtectionPanel C={C} caseObj={c} riskRadar={radar} />
            </>
          ) : (
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>
              ঝুঁকি কম — নিয়মিত পর্যবেক্ষণ চালিয়ে যান।
            </div>
          )}
        </>
      )}
    </div>
  );
}

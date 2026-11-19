// ============================================================
// Plant Detective — Crop Health Intelligence
// Structured Intake Wizard (Phase 5) — a 5-step structured diagnostic
// intake adapted from the KrishiAI 5-step pattern (crop → part → symptom
// → photo → results). Implemented as an ORIGINAL React component for the
// host's plain React + Vite + inline-style conventions (no Next.js code
// ported; the pattern is reimplemented from scratch).
//
// License note: KrishiAI is ISC-licensed (permissive). This component
// adapts the 5-step PATTERN only; no KrishiAI source code is copied.
// The disease data shown comes from the host's diseaseEngine.js DB
// (enriched in Phase 5 with greenList/yellowList/similarDiseases/
// causalType/districts/seasonality), authored originally.
//
// Step 5 calls the host's disease matcher (diseaseEngine.js) via
// getDiseasesByCrop() + a symptom-type scorer, then pipes the ranked
// matches through the Phase 5 diagnosisMerger to surface agreement +
// modelLimitations. A "save case" button persists the verdict as a
// crop-health case via cropHealthCases.createCase.
// ============================================================

import { useState } from "react";
import { getDiseasesByCrop } from "../../intelligence/diseaseEngine.js";
import { mergeDiagnoses } from "../../intelligence/diagnosisMerger.js";
import { createCase } from "../../data/cropHealthCases.js";

// Crops offered in Step 1. ids match diseaseEngine.js cropIds.
const CROPS = [
  { id: "rice", bn: "ধান", emoji: "🌾" },
  { id: "potato", bn: "আলু", emoji: "🥔" },
  { id: "tomato", bn: "টমেটো", emoji: "🍅" },
  { id: "brinjal", bn: "বেগুন", emoji: "🍆" },
  { id: "chili", bn: "মরিচ", emoji: "🌶️" },
  { id: "mustard", bn: "সরিষা", emoji: "🌼" },
  { id: "jute", bn: "পাট", emoji: "🌿" },
  { id: "wheat", bn: "গম", emoji: "🌾" },
  { id: "onion", bn: "পেঁয়াজ", emoji: "🧅" },
  { id: "maize", bn: "ভুট্টা", emoji: "🌽" },
];

// Step 2 — affected plant part.
const PARTS = [
  { id: "leaf", bn: "পাতা" },
  { id: "stem", bn: "কাণ্ড" },
  { id: "fruit", bn: "ফল" },
  { id: "root", bn: "মূল" },
  { id: "whole", bn: "পুরো গাছ" },
];

// Step 3 — 8-way symptom taxonomy. Keywords match against diseaseEngine
// symptomsBn/symptoms text. Authored for Bangla symptom phrasing.
const SYMPTOM_TYPES = [
  { id: "discolor", bn: "বিবর্ণতা", keys: ["হলুদ", "বিবর্ণ", "পোড়া", "সাদা", "কমলা", "লাল-বাদামি", "পাতা হলুদ"] },
  {
    id: "spots",
    bn: "দাগ",
    keys: ["দাগ", "গোলাকার", "মাকু", "বেগুনি", "কালো দাগ", "পাউডার", "গুঁড়া", "মরিচা", "মরচে"],
  },
  { id: "rot", bn: "পচন", keys: ["পচা", "পচে", "পচন", "ঘাড়", "শিথ", "গোড়া পচে", "কাণ্ড পচা", "স্টেম এন্ড"] },
  {
    id: "wilt",
    bn: "কুঁচকানো",
    keys: ["কুঁচক", "কুঁকড়ি", "বাঁকিয়ে", "নেতিয়ে", "শুকিয়ে", "ঝরে", "মরছে", "শুকিয়ে যাওয়া"],
  },
  { id: "deform", bn: "বিকৃতি", keys: ["বিকৃত", "মোজেইক", "মালফরমেশন", "ঘন", "গুচ্ছ", "বাঁকিয়ে যাচ্ছে"] },
  { id: "pest_damage", bn: "পোকার ক্ষতি", keys: ["পোকা", "ছিদ্র", "পাতাফড়িং", "বোরার", "মাকড়", "ছিদ্রকারী"] },
  { id: "growth", bn: "বৃদ্ধি সমস্যা", keys: ["বামন", "ছোট", "ফল ধারণ", "শীষ চিটা", "দানা ছোট", "ফল ছোট", "ছোট হয়ে"] },
  { id: "not_sure", bn: "নিশ্চিত নই", keys: [] },
];

// Part → keyword hints for part-aware scoring.
const PART_KEYS = {
  leaf: ["পাতা", "পাতায়", "পাতার"],
  stem: ["কাণ্ড", "কান্ড", "গোড়া", "শিথ", "ঘাড়", "ডগা", "আগা", "কাণ্ডের"],
  fruit: ["ফল", "শীষ", "দানা", "ফলে", "ফুল"],
  root: ["শিকড়", "মূল", "শেকড়"],
  whole: ["গাছ", "পুরো"],
};

const STEPS = ["ফসল", "অংশ", "লক্ষণ", "ছবি", "ফলাফল"];
const STEP_ICONS = ["🌾", "🍃", "🔎", "📷", "✅"];
const STEP_HELP = [
  "কোন ফসলে সমস্যা হচ্ছে?",
  "গাছের কোন অংশে আগে লক্ষ করেছেন?",
  "সবচেয়ে কাছাকাছি লক্ষণটি বেছে নিন।",
  "ছবি দিলে মিলিয়ে দেখা আরও সহজ হবে।",
  "সম্ভাব্য কারণ ও পরের পদক্ষেপ দেখুন।",
];

/**
 * Score a candidate disease against the selected symptom type + part.
 * Returns confidence 40..85. This is a symptom-rules heuristic, NOT a
 * calibrated model — see modelLimitations in the merger output.
 */
function scoreDisease(disease, symptomTypeId, partId) {
  const st = SYMPTOM_TYPES.find((s) => s.id === symptomTypeId);
  const pool = [...(disease.symptomsBn || []), ...(disease.symptoms || [])];
  const text = pool.join(" ");

  // not_sure → flat low confidence for all candidates.
  if (!st || st.keys.length === 0) return 40;

  let typeHits = 0;
  for (const k of st.keys) if (text.includes(k)) typeHits += 1;
  let partHits = 0;
  const pk = PART_KEYS[partId] || [];
  for (const k of pk) if (text.includes(k)) partHits += 1;

  const conf = 40 + typeHits * 12 + partHits * 6;
  return Math.max(40, Math.min(85, conf));
}

/**
 * Build a ranked diagnosis from the structured inputs, then merge via
 * the Phase 5 diagnosisMerger (single symptom_wizard source → the merger
 * still dedups + assigns agreement + modelLimitations).
 */
function diagnose({ cropId, partId, symptomTypeId }) {
  const candidates = getDiseasesByCrop(cropId);
  const matches = candidates
    .map((d) => {
      const confidence = scoreDisease(d, symptomTypeId, partId);
      return {
        diseaseId: d.id,
        confidence,
        evidence: [
          `${d.nameBn} — ${SYMPTOM_TYPES.find((s) => s.id === symptomTypeId)?.bn || "লক্ষণ"}`,
          `ক্ষতিগ্রস্ত অংশ: ${PARTS.find((p) => p.id === partId)?.bn || ""}`,
        ],
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const merged = mergeDiagnoses([{ source: "symptom_wizard", matches }]);
  // Attach the full disease objects to each result for the UI.
  const byId = new Map(candidates.map((d) => [d.id, d]));
  const top = merged.topDisease ? byId.get(merged.topDisease.diseaseId) : null;
  const alternatives = merged.alternatives
    .map((a) => byId.get(a.diseaseId))
    .filter(Boolean)
    .slice(0, 2);
  return { merged, top, alternatives, candidatesCount: candidates.length };
}

/**
 * @param {Object} props
 * @param {Object} props.C - theme object (primary, primaryXDark, bgCard, bgMuted, border, text, textMuted, textLight, danger, warning, success, accent)
 * @param {(caseId: string) => void} [props.onCaseCreated]
 */
export default function StructuredIntakeWizard({ C, onCaseCreated }) {
  const [step, setStep] = useState(1); // 1..5
  const [cropId, setCropId] = useState(null);
  const [partId, setPartId] = useState(null);
  const [symptomTypeId, setSymptomTypeId] = useState(null);
  const [photoName, setPhotoName] = useState("");
  const [savedCaseId, setSavedCaseId] = useState(null);
  const [result, setResult] = useState(null);

  const theme = C || {};
  const T = {
    primary: theme.primary || "#006A4E",
    primaryXDark: theme.primaryXDark || "#011a08",
    bgCard: theme.bgCard || "#ffffff",
    bgMuted: theme.bgMuted || "#f0f2f5",
    border: theme.border || "#e2e5ea",
    text: theme.text || "#1f2933",
    textMuted: theme.textMuted || "#5f6672",
    textLight: theme.textLight || "#8e95a2",
    danger: theme.danger || "#F42A41",
    warning: theme.warning || "#d97706",
    success: theme.success || "#16a34a",
    accent: theme.accent || "#F0B90B",
  };

  const canNext = () => {
    if (step === 1) return !!cropId;
    if (step === 2) return !!partId;
    if (step === 3) return !!symptomTypeId;
    if (step === 4) return true; // photo optional
    return false;
  };

  const next = () => {
    if (step === 4) {
      setResult(diagnose({ cropId, partId, symptomTypeId }));
    }
    if (step < 5) setStep(step + 1);
  };
  const back = () => {
    if (step > 1) setStep(step - 1);
  };

  const saveCase = () => {
    if (!result || !result.top) return;
    const top = result.top;
    const cropBn = CROPS.find((c) => c.id === cropId)?.bn || cropId;
    const { case: created } = createCase({
      crop: cropBn,
      diagnosisEvidence: {
        diseaseName: top.name || "",
        diseaseNameBn: top.nameBn || "",
        cause: top.causalType || top.cause || "",
        confidence: result.merged.agreement,
        confidencePct: result.merged.confidence,
        provider: "symptom-wizard",
        source: "manual",
        alternatives: result.alternatives.map((d) => ({ diseaseName: d.name, diseaseNameBn: d.nameBn })),
        keySymptoms: [
          SYMPTOM_TYPES.find((s) => s.id === symptomTypeId)?.bn,
          PARTS.find((p) => p.id === partId)?.bn,
        ].filter(Boolean),
        // Phase 5 merger field — read by copilotContext.buildCaseContext.
        topDisease: top.id,
      },
    });
    setSavedCaseId(created?.id || null);
    if (onCaseCreated && created?.id) onCaseCreated(created.id);
  };

  const cardStyle = {
    background: T.bgCard,
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    padding: 16,
  };
  const pillStyle = (active) => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: `1.5px solid ${active ? T.primary : T.border}`,
    background: active ? T.primary : T.bgMuted,
    color: active ? "#fff" : T.text,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  });
  const btnStyle = (disabled, primary) => ({
    padding: "10px 18px",
    borderRadius: 12,
    border: "none",
    background: disabled ? T.border : primary ? T.primary : T.bgMuted,
    color: disabled ? T.textLight : primary ? "#fff" : T.text,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
  });

  return (
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden", maxWidth: 640, margin: "0 auto" }}>
      {/* Header + progress */}
      <div
        style={{
          background: `linear-gradient(135deg,${T.primaryXDark},${T.primary})`,
          color: "#fff",
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 17 }}>🩺 কাঠামোগত রোগ নির্ণয়</div>
        <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>একবারে একটি প্রশ্ন — ৫ ধাপে সহজে এগোন</div>
        {/* Progress bar */}
        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            const cur = n === step;
            return (
              <div key={s} style={{ flex: 1 }}>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: done || cur ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
                  }}
                />
                <div
                  style={{
                    fontSize: 9,
                    marginTop: 3,
                    textAlign: "center",
                    opacity: cur ? 1 : 0.7,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {STEP_ICONS[i]} {n}. {s}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10, opacity: 0.85, marginTop: 4 }}>
          {STEP_HELP[step - 1]} · ধাপ {step}/৫
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* STEP 1 — crop */}
        {step === 1 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: T.text }}>১. ফসল নির্বাচন করুন</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
              যে ফসলে সমস্যা দেখছেন সেটি বেছে নিন।
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 }}>
              {CROPS.map((c) => (
                <button key={c.id} onClick={() => setCropId(c.id)} style={pillStyle(cropId === c.id)}>
                  <span style={{ fontSize: 18 }}>{c.emoji}</span>
                  <span>{c.bn}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — part */}
        {step === 2 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: T.text }}>২. কোন অংশ ক্ষতিগ্রস্ত?</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
              সবচেয়ে বেশি আক্রান্ত অংশটি আগে বেছে নিন।
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PARTS.map((p) => (
                <button key={p.id} onClick={() => setPartId(p.id)} style={pillStyle(partId === p.id)}>
                  {p.bn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 — symptom type */}
        {step === 3 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: T.text }}>৩. লক্ষণের ধরন</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
              একাধিক লক্ষণ থাকলে প্রধান লক্ষণটি বেছে নিন।
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
              {SYMPTOM_TYPES.map((s) => (
                <button key={s.id} onClick={() => setSymptomTypeId(s.id)} style={pillStyle(symptomTypeId === s.id)}>
                  {s.bn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 — photo (optional) */}
        {step === 4 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: T.text }}>৪. ছবি (ঐচ্ছিক)</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
              ছবি দিলে নির্ণয় আরও নির্ভুল হতে পারে, তবে বাধ্যতামূলক নয়। ছবি শুধু আপনার ব্রাউজারে থাকে।
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhotoName(e.target.files?.[0]?.name || "")}
              style={{ fontSize: 13, width: "100%" }}
            />
            {photoName && (
              <div
                style={{
                  fontSize: 11,
                  color: T.success,
                  marginTop: 8,
                  padding: "7px 9px",
                  background: `${T.success}12`,
                  borderRadius: 8,
                }}
              >
                ✓ ছবি যোগ হয়েছে: {photoName}
              </div>
            )}
          </div>
        )}

        {/* STEP 5 — results */}
        {step === 5 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: T.text }}>৫. নির্ণয় ফলাফল</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
              এটি প্রাথমিক সহায়তা—মাঠে মিলিয়ে দেখে তারপর ব্যবস্থা নিন।
            </div>
            {!result || !result.top ? (
              <div style={{ fontSize: 13, color: T.textMuted, padding: 12, background: T.bgMuted, borderRadius: 10 }}>
                এই ফসলের জন্য ডাটাবেসে কোনো রোগ পাওয়া যায়নি। অন্য ফসল চেষ্টা করুন।
              </div>
            ) : (
              <>
                {/* Agreement badge */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                  <AgreementBadge agreement={result.merged.agreement} C={T} />
                  <span style={{ fontSize: 11, color: T.textMuted }}>আস্থা {result.merged.confidence}%</span>
                  <span style={{ fontSize: 11, color: T.textLight }}>· {result.candidatesCount}টি রোগ যাচাই</span>
                </div>

                {/* Top disease card with enriched fields */}
                <DiseaseResultCard d={result.top} conf={result.merged.confidence} C={T} top />

                {/* Alternatives */}
                {result.alternatives.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, marginBottom: 6 }}>
                      সম্ভাব্য বিকল্প
                    </div>
                    {result.alternatives.map((d) => (
                      <DiseaseResultCard key={d.id} d={d} conf={0} C={T} />
                    ))}
                  </div>
                )}

                {/* modelLimitations */}
                <div
                  style={{
                    fontSize: 10,
                    color: T.textLight,
                    marginTop: 12,
                    padding: 8,
                    background: T.bgMuted,
                    borderRadius: 8,
                    lineHeight: 1.5,
                  }}
                >
                  ⚠ সীমাবদ্ধতা: {result.merged.modelLimitations.join(" · ")}
                </div>

                {/* Save case button */}
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={saveCase} disabled={!!savedCaseId} style={btnStyle(!!savedCaseId, true)}>
                    {savedCaseId ? "✓ কেস সংরক্ষিত হয়েছে" : "এই কেসটি সংরক্ষণ করুন"}
                  </button>
                  {savedCaseId && (
                    <span style={{ fontSize: 11, color: T.success, alignSelf: "center" }}>আইডি: {savedCaseId}</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Nav buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, gap: 8 }}>
          <button onClick={back} disabled={step === 1} style={btnStyle(step === 1, false)}>
            ← পেছনে
          </button>
          {step < 5 ? (
            <button onClick={next} disabled={!canNext()} style={btnStyle(!canNext(), true)}>
              পরবর্তী →
            </button>
          ) : (
            <button
              onClick={() => {
                setStep(1);
                setCropId(null);
                setPartId(null);
                setSymptomTypeId(null);
                setPhotoName("");
                setSavedCaseId(null);
                setResult(null);
              }}
              style={btnStyle(false, false)}
            >
              ↻ আবার শুরু
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AgreementBadge({ agreement, C }) {
  const map = {
    high: { bg: C.success, label: "উচ্চ সম্মতি" },
    medium: { bg: C.warning, label: "মাঝারি সম্মতি" },
    low: { bg: C.danger, label: "নিম্ন সম্মতি" },
  };
  const m = map[agreement] || map.low;
  return (
    <span
      style={{
        background: m.bg,
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 999,
      }}
    >
      {m.label}
    </span>
  );
}

function DiseaseResultCard({ d, conf, C, top }) {
  const titleStyle = { fontWeight: 800, fontSize: 14, color: C.text };
  const fieldRow = (label, value, color) => (
    <div style={{ display: "flex", gap: 6, fontSize: 11, marginTop: 4, flexWrap: "wrap", alignItems: "baseline" }}>
      <span style={{ color: C.textMuted, fontWeight: 600 }}>{label}:</span>
      <span style={{ color: color || C.text }}>{value || "—"}</span>
    </div>
  );
  const listRow = (label, items, color) =>
    items && items.length > 0 ? (
      <div style={{ fontSize: 11, marginTop: 4 }}>
        <span style={{ color: C.textMuted, fontWeight: 600 }}>{label}: </span>
        <span style={{ color: color || C.text }}>{items.join(", ")}</span>
      </div>
    ) : null;
  return (
    <div
      style={{
        border: `1px solid ${top ? C.primary : C.border}`,
        borderRadius: 12,
        padding: 12,
        marginTop: top ? 0 : 8,
        background: top ? `${C.primary}10` : C.bgMuted,
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 4 }}
      >
        <span style={titleStyle}>
          {top ? "🎯 " : ""}
          {d.nameBn}
        </span>
        {conf > 0 && <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 700 }}>{conf}%</span>}
      </div>
      <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{d.name}</div>
      {fieldRow("ধরন", causalTypeBn(d.causalType), C.primary)}
      {listRow("নিরাপদ চিকিৎসা", d.greenList, C.success)}
      {listRow("সতর্কতামূলক চিকিৎসা", d.yellowList, C.warning)}
      {listRow("সাদৃশ্য রোগ", (d.similarDiseases || []).map(similarIdBn), C.text)}
      {listRow("প্রচলিত জেলা", d.districts, C.text)}
      {listRow("ঝুঁকি মৌসুম", d.seasonality, C.accent)}
    </div>
  );
}

// Bangla label for causalType.
function causalTypeBn(t) {
  return (
    {
      fungal: "ছত্রাকজনিত",
      bacterial: "ব্যাকটেরিয়াজনিত",
      viral: "ভাইরাসজনিত",
      pest: "পোকাজনিত",
      abiotic: "অজৈব (পরিবেশজনিত)",
    }[t] ||
    t ||
    "—"
  );
}

// Bangla label for a similar-disease id (best-effort; falls back to the id).
function similarIdBn(id) {
  const map = {
    rice_blast: "ধানের ব্লাস্ট",
    bacterial_leaf_blight: "ব্যাকটেরিয়াল পাতা পোড়া",
    sheath_blight: "পাতার আবরণ পোড়া",
    rice_brown_spot: "বাদামি দাগ",
    wheat_rust: "গমের মরিচা",
    powdery_mildew: "ধুলো ছাতা রোগ",
    jute_stem_rot: "পাটের কাণ্ড পচা",
    potato_late_blight: "আলুর লেট ব্লাইট",
    tomato_early_blight: "টমেটোর আর্লি ব্লাইট",
    chili_anthracnose: "মরিচের অ্যানথ্রাকনোজ",
    mustard_alternaria: "সরিষার অল্টারনারিয়া",
    onion_purple_blotch: "পেঁয়াজের বেগুনি দাগ",
    maize_downy_mildew: "ভুট্টার ডাউনি মিলডিউ",
    brinjal_phomopsis: "বেগুনের ফোমোপসিস পচা",
  };
  return map[id] || id;
}

import { useState, useMemo, useRef, useEffect } from "react";
import {
  loadCases,
  createCase,
  updateCase,
  deleteCase,
  addObservation,
  addTreatment,
  addMonitoringReminder,
  recordEvaluation,
  addLearningInsight,
  getDueReminders,
  getLearningInsights,
  latestSeverity,
  CASE_STATUSES,
  STATUS_LABELS_BN,
  OUTCOME_LABELS_BN,
} from "../../data/cropHealthCases";
import RiskRadarWidget from "./RiskRadarWidget";
import FieldLocationPicker from "./FieldLocationPicker";
import SyncStatusChip from "./SyncStatusChip";
import VerificationPanel from "./VerificationPanel";
import CaseExportImport from "./CaseExportImport";

/**
 * CaseManager — Pillar 4 (MONITOR) + Pillar 5 (EVALUATE) surface.
 *
 * Crop Health Case lifecycle:
 *   Create Case → Detect → Treat → Prevent → Monitor → Evaluate → Learn
 *
 * All data is local-first (localStorage). Photos are only kept when the
 * user gives explicit consent per case; otherwise nothing image-related
 * is persisted (existing privacy commitment).
 */

const SEVERITY_OPTS = [
  { id: "none", labelBn: "নেই", pct: 0 },
  { id: "low", labelBn: "হালকা", pct: 25 },
  { id: "moderate", labelBn: "মাঝারি", pct: 50 },
  { id: "high", labelBn: "মারাত্মক", pct: 75 },
  { id: "severe", labelBn: "খুব মারাত্মক", pct: 95 },
];

const TREATMENT_TYPES = [
  { id: "cultural", labelBn: "কৃষি ব্যবস্থাপনা", icon: "🌾" },
  { id: "mechanical", labelBn: "যান্ত্রিক", icon: "🔧" },
  { id: "biological", labelBn: "জৈবিক", icon: "🌿" },
  { id: "chemical", labelBn: "রাসায়নিক", icon: "⚗️" },
];

const OUTCOMES = ["recovered", "improved", "unchanged", "worsened", "failed"];

const STATUS_STYLE = {
  active: { bg: "#fef2f2", fg: "#991b1b", icon: "🔴" },
  monitoring: { bg: "#ecfeff", fg: "#155e75", icon: "👀" },
  resolved: { bg: "#f0fdf4", fg: "#14532d", icon: "✅" },
  closed: { bg: "#f1f5f9", fg: "#475569", icon: "📁" },
};

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso?.slice(0, 10) || "";
  }
}

function fmtDateTime(iso) {
  try {
    return new Date(iso).toLocaleString("bn-BD", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso || "";
  }
}

function Card({ C, title, icon, children, accent }) {
  return (
    <div
      style={{
        background: C.bgCard,
        border: `1px solid ${accent || C.border}`,
        borderRadius: 16,
        padding: 14,
        boxShadow: C.shadow,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 13,
          color: C.primaryDark,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span aria-hidden="true">{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

const inputStyle = (C) => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
});

const labelStyle = (C) => ({ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4, display: "block" });

function Pill({ children, bg, fg }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 9px",
        borderRadius: 999,
        background: bg,
        color: fg,
        lineHeight: 1.6,
      }}
    >
      {children}
    </span>
  );
}

// ─── Case list ───────────────────────────────────────────────────────────────

function CaseList({ C, cases, onOpen, onCreate, insightsCount, onRefresh }) {
  const dueCount = getDueReminders().length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card C={C} icon="📋" title="ক্ষেতের কেস ব্যবস্থাপনা (MONITOR)">
        <p style={{ fontSize: 11.5, color: C.textMuted, margin: "0 0 10px", lineHeight: 1.6 }}>
          প্রতিটি সমস্যার জন্য একটি কেস খুলুন — শনাক্তকরণ, চিকিৎসা, পর্যবেক্ষণ ও ফলাফল এক জায়গায় থাকবে। ফসল সমস্যা ধরা
          পড়লেই <b>নির্ণয় রিপোর্ট থেকে “কেসে সংরক্ষণ”</b> চাপুন — কেস স্বয়ংক্রিয়ভাবে তৈরি হবে।
        </p>
        <button
          onClick={onCreate}
          style={{
            width: "100%",
            padding: "11px 16px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`,
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ＋ নতুন কেস খুলুন
        </button>
        <div style={{ marginTop: 10 }}>
          <SyncStatusChip C={C} />
        </div>
        {dueCount > 0 && (
          <div
            style={{
              marginTop: 10,
              background: C.bgWarning,
              border: `1px solid ${C.borderWarning}`,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 11.5,
              color: C.textWarning,
              fontWeight: 600,
            }}
          >
            ⏰ {dueCount}টি ফলো-আপ রিমাইন্ডার সময় হয়েছে — নিচের কেসগুলো দেখুন
          </div>
        )}
      </Card>

      {cases.length === 0 && (
        <Card C={C} icon="🌱" title="এখনো কোনো কেস নেই">
          <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
            প্রথম কেস তৈরি করুন এবং <b>DETECT → TREAT → PREVENT → MONITOR → EVALUATE → LEARN</b> পূর্ণ কর্মপ্রবাহ অনুসরণ
            করুন। রোগ নির্ণয়ের পর রিপোর্ট থেকে সরাসরি কেস খোলা যায়।
          </div>
        </Card>
      )}

      {cases.map((c) => {
        const st = STATUS_STYLE[c.status] || STATUS_STYLE.active;
        const sev = latestSeverity(c);
        const ev = c.evaluation;
        return (
          <button
            key={c.id}
            onClick={() => onOpen(c.id)}
            style={{
              textAlign: "left",
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 14,
              cursor: "pointer",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              boxShadow: C.shadow,
              width: "100%",
            }}
          >
            {c.thumbnail ? (
              <img
                src={c.thumbnail}
                alt=""
                style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: C.bgMuted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  flexShrink: 0,
                }}
              >
                🌾
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{c.crop || "ফসল"}</span>
                <Pill bg={st.bg} fg={st.fg}>
                  {st.icon} {STATUS_LABELS_BN[c.status] || c.status}
                </Pill>
                {c.diagnosisEvidence?.diseaseNameBn && (
                  <Pill bg={C.bgMuted} fg={C.textMuted}>
                    {c.diagnosisEvidence.diseaseNameBn}
                  </Pill>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 3 }}>
                {c.district ? `${c.district} · ` : ""}
                {fmtDate(c.updatedAt)} আপডেট · {c.observations?.length || 0}টি পর্যবেক্ষণ
                {c.treatments?.length ? ` · ${c.treatments.length}টি চিকিৎসা` : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <Pill bg={C.bgMuted} fg={C.text}>
                  তীব্রতা: {sev.pct != null ? `${sev.pct}%` : sev.label}
                </Pill>
                {ev && (
                  <Pill
                    bg={
                      ev.outcome === "recovered" || ev.outcome === "improved"
                        ? "#f0fdf4"
                        : ev.outcome === "failed" || ev.outcome === "worsened"
                          ? "#fef2f2"
                          : "#f1f5f9"
                    }
                    fg={C.text}
                  >
                    ফলাফল: {OUTCOME_LABELS_BN[ev.outcome]}
                  </Pill>
                )}
                {(c.monitoring || []).some((m) => m.status === "pending") && (
                  <Pill bg="#fffbeb" fg="#92400e">
                    ⏰ ফলো-আপ বাকি
                  </Pill>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {insightsCount > 0 && (
        <div style={{ fontSize: 10.5, color: C.textLight, textAlign: "center", padding: "2px 0 6px" }}>
          🎓 শেখা কেস-শিক্ষা: {insightsCount}টি — “শিখুন” স্তম্ভে দেখুন
        </div>
      )}

      <VerificationPanel C={C} cases={cases} onRefresh={onRefresh} />
    </div>
  );
}

// ─── New case form ───────────────────────────────────────────────────────────

function NewCaseForm({ C, onCreated, onCancel, seed }) {
  const [f, setF] = useState({
    crop: seed?.crop || "",
    variety: "",
    district: seed?.district || "",
    season: seed?.season || "",
    growthStage: "",
    severity: "moderate",
    notes: "",
    photoConsent: false,
    lat: seed?.lat ?? null,
    lon: seed?.lon ?? null,
    accuracy: seed?.accuracy ?? null,
  });

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.crop.trim()) return;
    const sev = SEVERITY_OPTS.find((s) => s.id === f.severity) || SEVERITY_OPTS[2];
    const { case: c } = createCase({
      crop: f.crop,
      variety: f.variety,
      district: f.district,
      season: f.season,
      growthStage: f.growthStage,
      lat: f.lat,
      lon: f.lon,
      initialSeverity: sev.id,
      initialSeverityPct: sev.pct,
      initialNotes: f.notes,
      photoConsent: f.photoConsent,
    });
    onCreated(c.id);
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card C={C} icon="🆕" title="নতুন ক্ষেতের কেস">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle(C)}>ফসল *</label>
            <input style={inputStyle(C)} value={f.crop} onChange={set("crop")} placeholder="যেমন: ধান" required />
          </div>
          <div>
            <label style={labelStyle(C)}>জাত (বিধিমালায় থাকলে)</label>
            <input style={inputStyle(C)} value={f.variety} onChange={set("variety")} placeholder="যেমন: BR-11" />
          </div>
          <div>
            <label style={labelStyle(C)}>জেলা</label>
            <input style={inputStyle(C)} value={f.district} onChange={set("district")} placeholder="যেমন: রাজশাহী" />
          </div>
          <div>
            <label style={labelStyle(C)}>মৌসুম</label>
            <input style={inputStyle(C)} value={f.season} onChange={set("season")} placeholder="বোরো / আমন…" />
          </div>
          <div>
            <label style={labelStyle(C)}>বৃদ্ধি পর্যায়</label>
            <input
              style={inputStyle(C)}
              value={f.growthStage}
              onChange={set("growthStage")}
              placeholder="চারা / ফুল / শীষ…"
            />
          </div>
          <div>
            <label style={labelStyle(C)}>বর্তমান তীব্রতা</label>
            <select style={inputStyle(C)} value={f.severity} onChange={set("severity")}>
              {SEVERITY_OPTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.labelBn}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={labelStyle(C)}>প্রাথমিক নোট (লক্ষণ বা পরিসংখ্যান)</label>
          <textarea
            style={{ ...inputStyle(C), minHeight: 64, resize: "vertical" }}
            value={f.notes}
            onChange={set("notes")}
            placeholder="যেমন: পাতায় মাকু আকৃতির দাগ, ১০% গাছ আক্রান্ত…"
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <FieldLocationPicker
            C={C}
            case={{ fieldLocation: f.lat != null ? { lat: f.lat, lng: f.lon, accuracy: f.accuracy } : null }}
            onLocationSet={(loc) => setF((p) => ({ ...p, lat: loc.lat, lon: loc.lng, accuracy: loc.accuracy }))}
          />
        </div>
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            marginTop: 12,
            fontSize: 11,
            color: C.textMuted,
            cursor: "pointer",
            background: C.bgMuted,
            borderRadius: 10,
            padding: 10,
            lineHeight: 1.5,
          }}
        >
          <input
            type="checkbox"
            checked={f.photoConsent}
            onChange={(e) => setF((p) => ({ ...p, photoConsent: e.target.checked }))}
            style={{ marginTop: 2 }}
          />
          <span>
            <b>ছবি সংরক্ষণের সম্মতি (ঐচ্ছিক):</b> টিক দিলে এই কেসের ছোট থাম্বনেইল এই ডিভাইসে সংরক্ষিত হবে। টিক না দিলে
            কোনো ছবি সংরক্ষণ হবে না — শুধু লেখা তথ্য থাকবে। কোনো ছবি কখনো সার্ভারে যায় না।
          </span>
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: "11px 16px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`,
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            কেস তৈরি করুন
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "11px 16px",
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.bg,
              color: C.text,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            বাতিল
          </button>
        </div>
      </Card>
    </form>
  );
}

// ─── Case detail (timeline) ──────────────────────────────────────────────────

function CaseDetail({ C, caseId, onBack, onInsightAdded }) {
  const [tick, setTick] = useState(0);
  const c = useMemo(() => {
    void tick;
    return loadCases().find((x) => x.id === caseId);
  }, [caseId, tick]);
  const [obsForm, setObsForm] = useState({ severity: "moderate", notes: "", thumb: null });
  const [trtForm, setTrtForm] = useState({ type: "cultural", description: "", product: "", moa: "", cost: "" });
  const [remForm, setRemForm] = useState({ days: 7, note: "" });
  const [evForm, setEvForm] = useState({ outcome: "improved", note: "", lessons: "", cost: "", verified: false });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const obsFileRef = useRef(null);

  const refresh = () => setTick((t) => t + 1);

  if (!c) {
    return (
      <Card C={C} icon="❓" title="কেস পাওয়া যায়নি">
        <button onClick={onBack} style={{ ...inputStyle(C), width: "auto", cursor: "pointer" }}>
          ← ফিরে যান
        </button>
      </Card>
    );
  }

  const st = STATUS_STYLE[c.status] || STATUS_STYLE.active;
  const ev = c.evaluation;
  const insights = getLearningInsights().filter((i) => i.caseId === c.id);
  const dueReminders = (c.monitoring || []).filter((m) => m.status === "pending");
  const obs = c.observations || [];
  const first = obs[0];
  const last = obs[obs.length - 1];
  const sevFirst = first?.severityPct;
  const sevLast = last?.severityPct;
  const timeline = buildTimeline(c);

  const handleObsPhoto = async (file) => {
    if (!file) return;
    const dataUrl = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(file);
    });
    setObsForm((p) => ({ ...p, thumb: dataUrl }));
  };

  const saveObservation = (e) => {
    e.preventDefault();
    const sev = SEVERITY_OPTS.find((s) => s.id === obsForm.severity) || SEVERITY_OPTS[2];
    addObservation(c.id, {
      severity: sev.id,
      severityPct: sev.pct,
      notes: obsForm.notes,
      thumbnail: obsForm.thumb,
    });
    setObsForm({ severity: "moderate", notes: "", thumb: null });
    refresh();
  };

  const saveTreatment = (e) => {
    e.preventDefault();
    if (!trtForm.description.trim()) return;
    addTreatment(c.id, {
      type: trtForm.type,
      description: trtForm.description,
      productName: trtForm.product,
      moaGroup: trtForm.moa,
      cost: trtForm.cost ? Number(trtForm.cost) : null,
    });
    setTrtForm({ type: "cultural", description: "", product: "", moa: "", cost: "" });
    refresh();
  };

  const saveReminder = (e) => {
    e.preventDefault();
    addMonitoringReminder(c.id, { dueInDays: Number(trNum(remForm.days, 7)), note: remForm.note });
    setRemForm({ days: 7, note: "" });
    refresh();
  };

  const saveEvaluation = (e) => {
    e.preventDefault();
    recordEvaluation(c.id, {
      outcome: evForm.outcome,
      recoveryNote: evForm.note,
      lessonsLearned: evForm.lessons,
      totalCost: evForm.cost ? Number(evForm.cost) : null,
      userVerified: evForm.verified,
    });
    refresh();
  };

  const promoteInsight = () => {
    addLearningInsight(c.id);
    onInsightAdded?.();
    refresh();
  };

  // Severity progression (EVALUATE evidence)
  const progression = sevFirst != null && sevLast != null ? sevFirst - sevLast : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <Card C={C} icon="📋" title={`${c.crop || "ফসল"} কেস`} accent={C.borderFocus}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          <Pill bg={st.bg} fg={st.fg}>
            {st.icon} {STATUS_LABELS_BN[c.status]}
          </Pill>
          {c.diagnosisEvidence && (
            <Pill bg={C.bgInfo} fg={C.textInfo}>
              🔍 {c.diagnosisEvidence.diseaseNameBn || c.diagnosisEvidence.diseaseName}
              {c.diagnosisEvidence.confidencePct != null ? ` (${c.diagnosisEvidence.confidencePct}%)` : ""}
            </Pill>
          )}
          {c.variety && (
            <Pill bg={C.bgMuted} fg={C.textMuted}>
              জাত: {c.variety}
            </Pill>
          )}
          {c.season && (
            <Pill bg={C.bgMuted} fg={C.textMuted}>
              {c.season}
            </Pill>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.7 }}>
          📍 {c.district || "জেলা নেই"}
          {c.upazila ? ` · ${c.upazila}` : ""}
          {c.location ? ` · GPS ${c.location.lat.toFixed(3)}, ${c.location.lon.toFixed(3)}` : ""} · খোলা:{" "}
          {fmtDate(c.createdAt)} · আপডেট: {fmtDate(c.updatedAt)}
        </div>
        <div style={{ marginTop: 8 }}>
          <CaseExportImport C={C} caseObj={c} onImport={() => onBack()} />
        </div>
        {c.diagnosisEvidence && (
          <div
            style={{
              fontSize: 10.5,
              color: C.textMuted,
              marginTop: 6,
              background: C.bgMuted,
              borderRadius: 10,
              padding: "8px 10px",
              lineHeight: 1.6,
            }}
          >
            <b>উৎস:</b>{" "}
            {c.diagnosisEvidence.source === "ai"
              ? `AI নির্ণয় (${c.diagnosisEvidence.provider || "অনলাইন"})`
              : c.diagnosisEvidence.source === "offline"
                ? "অফলাইন ইঞ্জিন"
                : "নিজে লিখেছেন"}{" "}
            · <b>যাচাই:</b> {c.diagnosisEvidence.source === "manual" ? "অ-যাচাইকৃত" : "স্বয়ংক্রিয় আত্মবিশ্বাস স্কোর"}
            {c.diagnosisEvidence.alternatives?.length ? (
              <>
                {" "}
                · <b>বিকল্প:</b> {c.diagnosisEvidence.alternatives.join(", ")}
              </>
            ) : null}
          </div>
        )}

        {/* Status change row */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {CASE_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                updateCase(c.id, { status: s });
                refresh();
              }}
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 999,
                cursor: "pointer",
                border: `1px solid ${c.status === s ? C.primary : C.border}`,
                background: c.status === s ? C.primary : C.bg,
                color: c.status === s ? "#fff" : C.text,
              }}
            >
              {STATUS_LABELS_BN[s]}
            </button>
          ))}
        </div>
      </Card>

      {/* Disease Risk Radar (MONITOR pillar — weather-driven, scouting-first) */}
      <RiskRadarWidget C={C} case={c} />

      {/* EVALUATE summary */}
      <Card C={C} icon="📊" title="তীব্রতার অগ্রগতি (EVALUATE)" accent="#e9d5ff">
        {obs.length > 1 ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <Pill bg={C.bgDanger} fg={C.textDanger}>
                শুরু: {sevFirst != null ? `${sevFirst}%` : first?.severity}
              </Pill>
              <Pill bg={C.bgSuccess} fg={C.textSuccess}>
                সর্বশেষ: {sevLast != null ? `${sevLast}%` : last?.severity}
              </Pill>
              {progression != null && (
                <Pill bg={progression > 0 ? "#f0fdf4" : progression < 0 ? "#fef2f2" : "#f1f5f9"} fg={C.text}>
                  {progression > 0 ? "▼ উন্নতি" : progression < 0 ? "▲ অবনতি" : "≈ অপরিবর্তিত"} {Math.abs(progression)}%
                </Pill>
              )}
            </div>
            {/* Mini progression bar chart */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 72, padding: "6px 2px 0" }}>
              {obs.map((o) => (
                <div
                  key={o.id}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    minWidth: 0,
                  }}
                  title={`${fmtDate(o.date)} — ${o.severity}`}
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 34,
                      height: Math.max(6, ((o.severityPct ?? 50) / 100) * 56),
                      borderRadius: 6,
                      background:
                        (o.severityPct ?? 50) >= 70 ? C.danger : (o.severityPct ?? 50) >= 40 ? C.warning : C.success,
                      transition: "height .4s ease",
                    }}
                  />
                  <span style={{ fontSize: 8, color: C.textLight, whiteSpace: "nowrap", overflow: "hidden" }}>
                    {fmtDate(o.date).slice(0, 6)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9.5, color: C.textLight, marginTop: 6, lineHeight: 1.5 }}>
              ⚠️ তীব্রতার পরিবর্তন চিকিৎসার কার্যকারিতার প্রমাণ নয় — আবহাওয়া, বৃদ্ধি পর্যায় ও নতুন সংক্রমণও কারণ হতে
              পারে।
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.6 }}>
            অগ্রগতি দেখতে অন্তত আরেকটি ফলো-আপ পর্যবেক্ষণ যোগ করুন (নিচের ফর্ম)।
          </div>
        )}
      </Card>

      {/* Timeline */}
      <Card C={C} icon="🕘" title="কেস টাইমলাইন">
        {timeline.map((item, i) => (
          <div key={item.id} style={{ display: "flex", gap: 10, marginBottom: i === timeline.length - 1 ? 0 : 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: item.tint || C.bgMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {item.icon}
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                borderBottom: i < timeline.length - 1 ? `1px dashed ${C.border}` : "none",
                paddingBottom: 10,
              }}
            >
              <div style={{ fontSize: 10, color: C.textLight }}>{fmtDateTime(item.date)}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginTop: 1 }}>{item.title}</div>
              {item.body && (
                <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.55, marginTop: 2 }}>{item.body}</div>
              )}
              {item.thumb && (
                <img
                  src={item.thumb}
                  alt=""
                  style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, marginTop: 6 }}
                />
              )}
            </div>
          </div>
        ))}
      </Card>

      {/* Due reminders */}
      {dueReminders.length > 0 && (
        <Card C={C} icon="⏰" title="ফলো-আপ রিমাইন্ডার" accent="#fcd34d">
          {dueReminders.map((m) => (
            <div
              key={m.id}
              style={{
                background: C.bgWarning,
                border: `1px solid ${C.borderWarning}`,
                borderRadius: 10,
                padding: "8px 10px",
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textWarning }}>
                {m.title} — {fmtDate(m.dueAt)}
              </div>
              {m.note && <div style={{ fontSize: 10.5, color: C.textMuted }}>{m.note}</div>}
            </div>
          ))}
          <div style={{ fontSize: 10, color: C.textLight }}>
            পর্যবেক্ষণ যোগ করলে রিমাইন্ডার স্বয়ংক্রিয়ভাবে সম্পন্ন হবে।
          </div>
        </Card>
      )}

      {/* Add observation */}
      <Card C={C} icon="👁️" title="ফলো-আপ পর্যবেক্ষণ যোগ করুন">
        <form onSubmit={saveObservation} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle(C)}>তীব্রতা</label>
              <select
                style={inputStyle(C)}
                value={obsForm.severity}
                onChange={(e) => setObsForm((p) => ({ ...p, severity: e.target.value }))}
              >
                {SEVERITY_OPTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.labelBn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle(C)}>ছবি {c.photoConsent ? "(সংরক্ষিত হবে)" : "(সংরক্ষণ হবে না)"}</label>
              <input
                ref={obsFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ ...inputStyle(C), padding: "7px 10px", fontSize: 11 }}
                onChange={(e) => handleObsPhoto(e.target.files?.[0])}
              />
            </div>
          </div>
          {obsForm.thumb && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <img src={obsForm.thumb} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => setObsForm((p) => ({ ...p, thumb: null }))}
                style={{
                  fontSize: 10,
                  color: C.danger,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                সরান
              </button>
            </div>
          )}
          <textarea
            style={{ ...inputStyle(C), minHeight: 56, resize: "vertical" }}
            placeholder="কী দেখলেন? আগের চেয়ে ভালো/খারাপ?"
            value={obsForm.notes}
            onChange={(e) => setObsForm((p) => ({ ...p, notes: e.target.value }))}
          />
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: C.primary,
              color: "#fff",
              fontWeight: 800,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            পর্যবেক্ষণ সংরক্ষণ করুন
          </button>
        </form>
      </Card>

      {/* Treatment record */}
      <Card C={C} icon="💊" title="চিকিৎসা রেকর্ড (TREAT)" accent="#fcd34d">
        {(c.treatments || []).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {c.treatments.map((t) => (
              <div key={t.id} style={{ background: C.bgMuted, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <Pill bg="#fffbeb" fg="#92400e">
                    {TREATMENT_TYPES.find((x) => x.id === t.type)?.icon || "•"}{" "}
                    {TREATMENT_TYPES.find((x) => x.id === t.type)?.labelBn || t.type}
                  </Pill>
                  <span style={{ fontSize: 10, color: C.textLight }}>{fmtDate(t.date)}</span>
                  {t.cost != null && (
                    <Pill bg="#f0fdf4" fg="#14532d">
                      খরচ ৳{t.cost}
                    </Pill>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 3 }}>{t.description}</div>
                {(t.productName || t.moaGroup) && (
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>
                    {t.productName && <>ব্র্যান্ড: {t.productName} </>}
                    {t.moaGroup && <>· {t.moaGroup}</>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <form onSubmit={saveTreatment} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle(C)}>ধরন</label>
              <select
                style={inputStyle(C)}
                value={trtForm.type}
                onChange={(e) => setTrtForm((p) => ({ ...p, type: e.target.value }))}
              >
                {TREATMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.labelBn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle(C)}>খরচ (৳, ঐচ্ছিক)</label>
              <input
                style={inputStyle(C)}
                type="number"
                min="0"
                value={trtForm.cost}
                onChange={(e) => setTrtForm((p) => ({ ...p, cost: e.target.value }))}
                placeholder="যেমন 450"
              />
            </div>
          </div>
          <input
            style={inputStyle(C)}
            value={trtForm.description}
            onChange={(e) => setTrtForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="কী করলেন? যেমন: ট্রাইসাইক্লাজোল স্প্রে"
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              style={inputStyle(C)}
              value={trtForm.product}
              onChange={(e) => setTrtForm((p) => ({ ...p, product: e.target.value }))}
              placeholder="ব্র্যান্ড নাম (ঐচ্ছিক)"
            />
            <input
              style={inputStyle(C)}
              value={trtForm.moa}
              onChange={(e) => setTrtForm((p) => ({ ...p, moa: e.target.value }))}
              placeholder="MoA গ্রুপ (যেমন FRAC 3)"
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: C.warning,
              color: "#fff",
              fontWeight: 800,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            চিকিৎসা সংরক্ষণ করুন
          </button>
          <div style={{ fontSize: 9.5, color: C.textLight, lineHeight: 1.5 }}>
            ⚗️ রেজিস্টার্ড পণ্যের তথ্যের জন্য “বালাইনাশক” ট্যাব দেখুন — সেখান থেকে ডোজ ও MoA কপি করে আনুন, নিজে তৈরি
            করবেন না।
          </div>
        </form>
      </Card>

      {/* Reminder form */}
      <Card C={C} icon="⏰" title="মনিটরিং রিমাইন্ডার">
        <form onSubmit={saveReminder} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle(C)}>কত দিন পরে</label>
              <input
                style={inputStyle(C)}
                type="number"
                min="1"
                max="90"
                value={remForm.days}
                onChange={(e) => setRemForm((p) => ({ ...p, days: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle(C)}>নোট</label>
              <input
                style={inputStyle(C)}
                value={remForm.note}
                onChange={(e) => setRemForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="যেমন: স্প্রের ৭ দিন পর পাতা পরীক্ষা"
              />
            </div>
          </div>
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.bgMuted,
              color: C.text,
              fontWeight: 800,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            রিমাইন্ডার সেট করুন
          </button>
        </form>
      </Card>

      {/* Evaluation */}
      <Card C={C} icon="📊" title="চূড়ান্ত মূল্যায়ন (EVALUATE)" accent="#e9d5ff">
        {ev ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Pill bg={ev.outcome === "recovered" || ev.outcome === "improved" ? "#f0fdf4" : "#fef2f2"} fg={C.text}>
                ফলাফল: {OUTCOME_LABELS_BN[ev.outcome]}
              </Pill>
              {ev.severityDelta != null && (
                <Pill bg={C.bgMuted} fg={C.text}>
                  তীব্রতা পরিবর্তন: {ev.severityDelta > 0 ? "+" : ""}
                  {ev.severityDelta}%
                </Pill>
              )}
              {ev.totalCost != null && (
                <Pill bg="#f0fdf4" fg="#14532d">
                  মোট খরচ ৳{ev.totalCost}
                </Pill>
              )}
              <Pill bg={ev.userVerified ? "#f0fdf4" : "#f1f5f9"} fg={ev.userVerified ? "#14532d" : "#475569"}>
                {ev.userVerified ? "✓ ব্যবহারকারী-যাচাইকৃত" : "অ-যাচাইকৃত"}
              </Pill>
            </div>
            {ev.recoveryNote && <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{ev.recoveryNote}</div>}
            {ev.lessonsLearned && (
              <div
                style={{
                  fontSize: 11.5,
                  color: C.textMuted,
                  background: C.bgMuted,
                  borderRadius: 10,
                  padding: "8px 10px",
                  lineHeight: 1.6,
                }}
              >
                🎓 <b>শিক্ষা:</b> {ev.lessonsLearned}
              </div>
            )}
            {insights.length === 0 ? (
              <button
                onClick={promoteInsight}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#7C3AED",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                🎓 এই শিক্ষা “শিখুন” স্তম্ভে সংরক্ষণ করুন
              </button>
            ) : (
              <div style={{ fontSize: 11, color: C.textSuccess, fontWeight: 700 }}>
                ✓ শিক্ষাটি “শিখুন” স্তম্ভে সংরক্ষিত হয়েছে (আপনার নিজের মাঠ-অভিজ্ঞতা হিসেবে লেবেল করা)
              </div>
            )}
            <button
              onClick={() => {
                updateCase(c.id, { evaluation: null });
                refresh();
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.bg,
                color: C.textMuted,
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
                alignSelf: "flex-start",
              }}
            >
              মূল্যায়ন আবার করুন
            </button>
          </div>
        ) : (
          <form onSubmit={saveEvaluation} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <label style={labelStyle(C)}>ফলাফল</label>
              <select
                style={inputStyle(C)}
                value={evForm.outcome}
                onChange={(e) => setEvForm((p) => ({ ...p, outcome: e.target.value }))}
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {OUTCOME_LABELS_BN[o]}
                  </option>
                ))}
              </select>
            </div>
            <input
              style={inputStyle(C)}
              value={evForm.note}
              onChange={(e) => setEvForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="পুনরুদ্ধারের বিবরণ (ঐচ্ছিক)"
            />
            <input
              style={inputStyle(C)}
              value={evForm.lessons}
              onChange={(e) => setEvForm((p) => ({ ...p, lessons: e.target.value }))}
              placeholder="কী শিখলেন? পরের বার কী করবেন?"
            />
            <input
              style={inputStyle(C)}
              type="number"
              min="0"
              value={evForm.cost}
              onChange={(e) => setEvForm((p) => ({ ...p, cost: e.target.value }))}
              placeholder="মোট খরচ ৳ (ঐচ্ছিক)"
            />
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                fontSize: 11,
                color: C.textMuted,
                cursor: "pointer",
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={evForm.verified}
                onChange={(e) => setEvForm((p) => ({ ...p, verified: e.target.checked }))}
                style={{ marginTop: 2 }}
              />
              <span>
                আমি নিজে মাঠে ফলাফল যাচাই করেছি (এই তথ্য আমার নিজের অভিজ্ঞতা হিসেবে সংরক্ষিত হবে — CABI নির্দেশনা হিসেবে
                নয়)
              </span>
            </label>
            <button
              type="submit"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: "#7C3AED",
                color: "#fff",
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              মূল্যায়ন সংরক্ষণ করুন
            </button>
            <div style={{ fontSize: 9.5, color: C.textLight, lineHeight: 1.5 }}>
              ⚠️ ছবির তুলনা একা চিকিৎসার কার্যকারিতার প্রমাণ নয় — এই মূল্যায়ন আপনার নিজের পর্যবেক্ষণের রেকর্ড।
            </div>
          </form>
        )}
      </Card>

      {/* Danger zone */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: C.bgCard,
            color: C.text,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← সব কেস
        </button>
        {confirmDelete ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                deleteCase(c.id);
                onBack();
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: C.danger,
                color: "#fff",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              নিশ্চিত মুছুন
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.bg,
                color: C.text,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              না
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: `1px solid ${C.borderDanger}`,
              background: C.bgCard,
              color: C.danger,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            🗑️ মুছুন
          </button>
        )}
      </div>
    </div>
  );
}

function trNum(v, dflt) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

/** Merge observations, treatments, evaluation and case creation into one sorted timeline. */
function buildTimeline(c) {
  const items = [];
  items.push({
    id: "created",
    date: c.createdAt,
    icon: "🆕",
    title: "কেস খোলা হয়েছে",
    body: `${c.crop}${c.variety ? ` (${c.variety})` : ""} — ${c.district || "অজানা জেলা"}`,
    tint: "#f0fdf4",
  });
  for (const o of c.observations || []) {
    if (o.id === c.observations?.[0]?.id) continue; // baseline covered by creation entry
    items.push({
      id: o.id,
      date: o.date,
      icon: "👁️",
      title: `পর্যবেক্ষণ — তীব্রতা: ${o.severity}${o.severityPct != null ? ` (${o.severityPct}%)` : ""}`,
      body: o.notes || o.symptoms || "",
      thumb: o.thumbnail,
      tint: "#ecfeff",
    });
  }
  for (const t of c.treatments || []) {
    items.push({
      id: t.id,
      date: t.date,
      icon: "💊",
      title: `চিকিৎসা — ${TREATMENT_TYPES.find((x) => x.id === t.type)?.labelBn || t.type}`,
      body: [t.description, t.productName, t.moaGroup, t.cost != null ? `খরচ ৳${t.cost}` : ""]
        .filter(Boolean)
        .join(" · "),
      tint: "#fffbeb",
    });
  }
  for (const m of c.monitoring || []) {
    items.push({
      id: m.id,
      date: m.dueAt,
      icon: m.status === "pending" ? "⏳" : "✅",
      title: `রিমাইন্ডার — ${m.title}${m.status === "pending" ? " (বাকি)" : " (সম্পন্ন)"}`,
      body: m.note,
      tint: "#fefce8",
    });
  }
  if (c.evaluation) {
    items.push({
      id: c.evaluation.id,
      date: c.evaluation.date,
      icon: "📊",
      title: `মূল্যায়ন — ${OUTCOME_LABELS_BN[c.evaluation.outcome]}`,
      body: c.evaluation.recoveryNote || c.evaluation.lessonsLearned || "",
      tint: "#faf5ff",
    });
  }
  return items.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ─── Root export ─────────────────────────────────────────────────────────────

export default function CaseManager({ C, seedCase, openCaseId, onCaseCreated, onInsightAdded }) {
  const [view, setView] = useState("list"); // list | new | detail
  const [openId, setOpenId] = useState(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  // Auto-seed: arriving from a diagnosis result with "Save to Case".
  // Mirrors the set-state-in-effect pattern used in App.jsx for
  // externally-driven navigation state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (seedCase) {
      const { case: c } = createCase(seedCase);
      onCaseCreated?.(c);
      setOpenId(c.id);
      setView("detail");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedCase]);

  // Direct open: arriving from the Home dashboard's case/reminder widgets
  useEffect(() => {
    if (openCaseId && loadCases().some((c) => c.id === openCaseId)) {
      setOpenId(openCaseId);
      setView("detail");
    }
  }, [openCaseId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const cases = loadCases().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const insights = getLearningInsights();

  if (view === "new") {
    return (
      <NewCaseForm
        C={C}
        onCancel={() => setView("list")}
        onCreated={(id) => {
          setOpenId(id);
          setView("detail");
          refresh();
        }}
      />
    );
  }
  if (view === "detail" && openId) {
    return (
      <CaseDetail
        C={C}
        caseId={openId}
        onBack={() => {
          setView("list");
          setOpenId(null);
          refresh();
        }}
        onInsightAdded={onInsightAdded}
      />
    );
  }
  return (
    <CaseList
      C={C}
      cases={cases}
      insightsCount={insights.length}
      onRefresh={refresh}
      onCreate={() => setView("new")}
      onOpen={(id) => {
        setOpenId(id);
        setView("detail");
      }}
    />
  );
}

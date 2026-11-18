import { useState, useMemo, useCallback } from "react";
import {
  getOfficerProfile,
  setOfficerProfile,
  isOfficer,
  modelLimitations as officerLimitations,
} from "../../intelligence/officerProfile.js";
import { approveValidation, rejectValidation, getPendingValidations } from "../../intelligence/validationApi.js";

// ────────────────────────────────────────────────────────────────────────────
// VerificationPanel — extension-officer view for verifying farmer-submitted
// crop health cases. Local-only: the officer profile is self-declared and
// stored on this device (NO authentication — see officerProfile limitations).
//
// Shows:
//   - officer profile banner (name + upazila + role badge), or a simple
//     form to set nameBn + upazila + role when no profile exists;
//   - pending validation tasks (cases awaiting verification) with crop,
//     disease (from riskAssessment when present) and requested date;
//   - approve (অনুমোদন) / reject (প্রত্যাখ্যান) buttons → inline remarks
//     editor → calls approveValidation / rejectValidation;
//   - verification status badge on each case.
//
// Props: { C, cases, onRefresh }
// ────────────────────────────────────────────────────────────────────────────

const ROLE_LABELS_BN = {
  officer: "অফিসার",
  admin: "অ্যাডমিন",
  farmer: "কৃষক",
};

const STATUS_BADGE = {
  pending: { bg: "#fffbeb", fg: "#92400e", label: "অপেক্ষমাণ" },
  approved: { bg: "#f0fdf4", fg: "#166534", label: "অনুমোদিত" },
  rejected: { bg: "#fef2f2", fg: "#991b1b", label: "প্রত্যাখ্যাত" },
};

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso?.slice(0, 10) || "";
  }
}

export default function VerificationPanel({ C, cases = [], onRefresh }) {
  const [profile, setProfile] = useState(() => getOfficerProfile());
  // Form state for the no-profile setup form.
  const [form, setForm] = useState({ nameBn: "", upazila: "", role: "officer" });
  // Inline remarks editor: { taskId, action, remarks } | null.
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);
  // Bump to re-read pending tasks after a decision (only the setter is needed).
  const [, setVersion] = useState(0);
  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
    setMessage(null);
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  const officer = isOfficer(profile);
  const upazila = profile?.upazila || "";

  // Pending tasks for this officer's upazila (all pending if no upazila set).
  // Read fresh from localStorage on every render; setVersion() above forces a
  // re-read after an approve/reject decision mutates the store.
  const pending = officer ? getPendingValidations(upazila) : [];

  // caseId → case lookup so we can surface the disease name.
  const caseMap = useMemo(() => {
    const m = new Map();
    for (const c of cases) m.set(c.id, c);
    return m;
  }, [cases]);

  const saveProfile = () => {
    if (!form.nameBn.trim()) {
      setMessage({ type: "error", text: "নাম লিখুন।" });
      return;
    }
    const stored = setOfficerProfile({
      nameBn: form.nameBn.trim(),
      upazila: form.upazila.trim(),
      role: form.role,
    });
    setProfile(stored);
    setMessage({ type: "success", text: "অফিসার প্রোফাইল সেট করা হয়েছে।" });
  };

  const startDecision = (taskId, action) => {
    setEditing({ taskId, action, remarks: "" });
    setMessage(null);
  };

  const confirmDecision = () => {
    if (!editing) return;
    const officerId = profile?.id || "";
    const fn = editing.action === "approve" ? approveValidation : rejectValidation;
    const res = fn(editing.taskId, officerId, editing.remarks);
    if (res && res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({
        type: "success",
        text: editing.action === "approve" ? "কেস অনুমোদিত হয়েছে।" : "কেস প্রত্যাখ্যাত হয়েছে।",
      });
      setEditing(null);
      refresh();
    }
  };

  const inputStyle = {
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
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4, display: "block" };
  const btn = (bg) => ({
    padding: "7px 12px",
    borderRadius: 9,
    border: "none",
    background: bg,
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Officer profile banner / setup form */}
      <div
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 14,
          boxShadow: C.shadow,
        }}
      >
        {profile ? (
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }} aria-hidden="true">
                🧑‍🌾
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{profile.nameBn || "অফিসার"}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  {profile.upazila ? `${profile.upazila}` : "উপজেলা নেই"}
                  {profile.district ? ` · ${profile.district}` : ""}
                </div>
              </div>
            </div>
            <span
              style={{
                background: officer ? C.primary : C.bgMuted,
                color: officer ? "#fff" : C.textMuted,
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {ROLE_LABELS_BN[profile.role] || "কৃষক"}
            </span>
          </div>
        ) : (
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.primaryDark, marginBottom: 10 }}>
              🧑‍🌾 অফিসার প্রোফাইল সেট করুন
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
              <div>
                <label style={labelStyle}>নাম (বাংলা)</label>
                <input
                  style={inputStyle}
                  value={form.nameBn}
                  onChange={(e) => setForm({ ...form, nameBn: e.target.value })}
                  placeholder="যেমন: করিম আহমেদ"
                />
              </div>
              <div>
                <label style={labelStyle}>উপজেলা</label>
                <input
                  style={inputStyle}
                  value={form.upazila}
                  onChange={(e) => setForm({ ...form, upazila: e.target.value })}
                  placeholder="যেমন: সাভার"
                />
              </div>
              <div>
                <label style={labelStyle}>ভূমিকা</label>
                <select
                  style={inputStyle}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="officer">অফিসার</option>
                  <option value="admin">অ্যাডমিন</option>
                  <option value="farmer">কৃষক</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <button style={btn(C.primary)} onClick={saveProfile}>
                প্রোফাইল সংরক্ষণ করুন
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback message */}
      {message && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: message.type === "error" ? C.danger : C.success,
            background: message.type === "error" ? "#fef2f2" : "#f0fdf4",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Pending validations list (officers only) */}
      {officer ? (
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
              fontWeight: 800,
              fontSize: 13,
              color: C.primaryDark,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span aria-hidden="true">📋</span>
            <span>যাচাইয়ের অপেক্ষায় কেস ({pending.length})</span>
          </div>

          {pending.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
              এই উপজেলায় অপেক্ষমাণ কোনো কেস নেই। নতুন কেস এলে এখানে দেখা যাবে।
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pending.map((t) => {
                const c = caseMap.get(t.caseId);
                const disease = c?.riskAssessment?.topDiseaseNameBn || c?.diagnosisEvidence?.diseaseNameBn || "—";
                const badge = STATUS_BADGE[t.status] || STATUS_BADGE.pending;
                const isEditingThis = editing?.taskId === t.id;
                return (
                  <div
                    key={t.id}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 10,
                      background: C.bgMuted,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>
                        🌾 {t.crop || c?.crop || "ফসল অজানা"} · রোগ: {disease}
                      </div>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.fg,
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                      অনুরোধ তারিখ: {fmtDate(t.createdAt)}
                      {t.upazila ? ` · উপজেলা: ${t.upazila}` : ""}
                    </div>

                    {isEditingThis ? (
                      <div style={{ marginTop: 8 }}>
                        <label style={labelStyle}>
                          {editing.action === "approve" ? "অনুমোদনের মন্তব্য" : "প্রত্যাখ্যানের কারণ"}
                        </label>
                        <textarea
                          style={{ ...inputStyle, minHeight: 56, resize: "vertical" }}
                          value={editing.remarks}
                          onChange={(e) => setEditing({ ...editing, remarks: e.target.value })}
                          placeholder={
                            editing.action === "approve"
                              ? "যেমন: লক্ষণ ও আবহাওয়া মিলে যায়।"
                              : "যেমন: লক্ষণ স্পষ্ট নয়, আবার পর্যবেক্ষণ করুন।"
                          }
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            style={btn(editing.action === "approve" ? C.success : C.danger)}
                            onClick={confirmDecision}
                          >
                            {editing.action === "approve" ? "✓ অনুমোদন নিশ্চিত" : "✗ প্রত্যাখ্যান নিশ্চিত"}
                          </button>
                          <button style={{ ...btn(C.bgMuted), color: C.text }} onClick={() => setEditing(null)}>
                            বাতিল
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button style={btn(C.success)} onClick={() => startDecision(t.id, "approve")}>
                          ✓ অনুমোদন
                        </button>
                        <button style={btn(C.danger)} onClick={() => startDecision(t.id, "reject")}>
                          ✗ প্রত্যাখ্যান
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Honest model limitations */}
          <ul style={{ margin: "12px 0 0 14px", padding: 0, fontSize: 10, color: C.textMuted, lineHeight: 1.6 }}>
            {[...officerLimitations].map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          style={{
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 14,
            boxShadow: C.shadow,
            fontSize: 12,
            color: C.textMuted,
            lineHeight: 1.6,
          }}
        >
          যাচাই করার জন্য অফিসার প্রোফাইল প্রয়োজন। উপরে নাম, উপজেলা ও ভূমিকা দিয়ে প্রোফাইল সেট করুন।
        </div>
      )}
    </div>
  );
}

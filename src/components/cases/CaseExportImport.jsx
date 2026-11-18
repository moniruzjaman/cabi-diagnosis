import { useRef, useState } from "react";
import { loadCases, saveCases } from "../../data/cropHealthCases.js";

// ────────────────────────────────────────────────────────────────────────────
// CaseExportImport — farmer ↔ officer case transfer via a JSON file.
//
// Export: serializes the selected case to a .json file download
// (Blob + URL.createObjectURL + a temporary <a> click). Photos and
// personal data are deliberately stripped — the file carries case
// metadata only (see the privacy note rendered below).
//
// Import: reads a .json file via <input type="file">, parses it,
// validates the shape, strips thumbnails, assigns a fresh id and
// persists it with saveCases. onImport(newCase) lets the parent refresh.
//
// Props: { C, caseObj, onImport }
//
// License note: reimplemented from the Phase 4 design description. The
// audit traced the original app to "Plantation Tracker" (UNLICENSED);
// no code was copied from any repository.
// ────────────────────────────────────────────────────────────────────────────

const EXPORT_FORMAT = "ud-case-v1";

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Strip photos + personal fields so the exported file carries case
 * metadata only. Honours the existing privacy commitment.
 * @param {object} c
 * @returns {object}
 */
function sanitizeCase(c) {
  return {
    ...c,
    // No images or consent state travel with the file.
    thumbnail: null,
    photoConsent: false,
    observations: (c.observations || []).map((o) => ({ ...o, thumbnail: null })),
    treatments: (c.treatments || []).map((t) => ({ ...t })),
    preventionActions: (c.preventionActions || []).map((p) => ({ ...p })),
    monitoring: (c.monitoring || []).map((m) => ({ ...m })),
  };
}

/**
 * Minimal shape validation for an imported case object. Accepts either a
 * raw case ({crop, observations}) or a wrapped export ({format, case}).
 * Returns the case object or null when the shape is invalid.
 * @param {unknown} parsed
 * @returns {object|null}
 */
function extractCase(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  let caseObj = parsed;
  if (parsed.format === EXPORT_FORMAT && parsed.case && typeof parsed.case === "object") {
    caseObj = parsed.case;
  }
  if (!caseObj || typeof caseObj !== "object") return null;
  // Require at least a crop name or an observations array — otherwise the
  // file is not a recognizable crop health case.
  const hasCrop = typeof caseObj.crop === "string";
  const hasObs = Array.isArray(caseObj.observations);
  if (!hasCrop && !hasObs) return null;
  return caseObj;
}

export default function CaseExportImport({ C, caseObj, onImport }) {
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null);

  const inputStyle = { display: "none" };
  const btn = (bg, disabled) => ({
    padding: "9px 14px",
    borderRadius: 10,
    border: "none",
    background: disabled ? C.bgMuted : bg,
    color: disabled ? C.textMuted : "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const handleExport = () => {
    if (!caseObj) {
      setMessage({ type: "error", text: "রপ্তানি করার জন্য একটি কেস নির্বাচন করুন।" });
      return;
    }
    try {
      const payload = {
        format: EXPORT_FORMAT,
        exportedAt: nowIso(),
        case: sanitizeCase(caseObj),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `case-${caseObj.id || "export"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "কেস ফাইল রপ্তানি করা হয়েছে।" });
    } catch {
      setMessage({ type: "error", text: "রপ্তানি ব্যর্থ হয়েছে — আবার চেষ্টা করুন।" });
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const raw = extractCase(parsed);
      if (!raw) {
        setMessage({ type: "error", text: "ফাইলটি বৈধ কেস নয় — আকৃতি মেলে না।" });
        return;
      }
      // Fresh id + timestamps; strip any photos that snuck in.
      const ts = nowIso();
      const imported = sanitizeCase({
        ...raw,
        id: makeId("case"),
        createdAt: ts,
        updatedAt: ts,
      });
      const cases = loadCases();
      cases.push(imported);
      const ok = saveCases(cases);
      if (!ok) {
        setMessage({ type: "error", text: "সংরক্ষণ ব্যর্থ — স্টোরেজ পূর্ণ হতে পারে।" });
        return;
      }
      setMessage({ type: "success", text: "কেস আমদানি সম্পন্ন হয়েছে।" });
      if (onImport) onImport(imported);
    } catch {
      setMessage({ type: "error", text: "ফাইল পড়া যায়নি — বৈধ JSON নয়।" });
    } finally {
      // Allow re-selecting the same file later.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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
      <div style={{ fontWeight: 800, fontSize: 13, color: C.primaryDark, marginBottom: 8 }}>📤 কেস স্থানান্তর</div>

      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
        এই ফাইল শুধু কেস তথ্য বহন করে, ছবি বা ব্যক্তিগত তথ্য নয়।
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={btn(C.primary, !caseObj)} onClick={handleExport} disabled={!caseObj}>
          📤 কেস রপ্তানি করুন
        </button>
        <button style={btn(C.blue, false)} onClick={() => fileRef.current?.click()}>
          📥 কেস আমদানি করুন
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={inputStyle} onChange={handleFile} />
      </div>

      {message && (
        <div
          style={{
            marginTop: 10,
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
    </div>
  );
}

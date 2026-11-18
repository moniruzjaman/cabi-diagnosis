import { useState, useRef } from "react";
import { getAccuracyTier, shouldRejectReading, tierLabelBn } from "../../intelligence/gpsPrecision.js";
import { formatLatLon } from "../../intelligence/gpsUtils.js";

// ────────────────────────────────────────────────────────────────────────────
// FieldLocationPicker — opt-in GPS capture for a crop health case.
//
// Consent model: the browser's geolocation permission prompt is the consent
// surface. This component never reads location silently — the farmer taps
// the button, the browser asks, and only on grant + acceptable accuracy is
// the location stored. Low-accuracy readings (>25 m) are rejected with a
// clear Bangla warning and NOT stored.
//
// Privacy: the location is stored only on this device (localStorage) and is
// never sent to a server. The privacy note is always visible.
// ────────────────────────────────────────────────────────────────────────────

const TIER_COLORS = {
  high: { bg: "#dcfce7", fg: "#166534" },
  medium: { bg: "#fef9c3", fg: "#854d0e" },
  low: { bg: "#ffedd5", fg: "#9a3412" },
  rejected: { bg: "#fee2e2", fg: "#991b1b" },
};

function geolocationErrorBn(err) {
  if (!err) return "GPS তথ্য আনা যায়নি।";
  if (err.code === 1) return "অনুমতি দেওয়া হয়নি — ব্রাউজার সেটিংয়ে লোকেশন অনুমতি চালু করুন।";
  if (err.code === 2) return "GPS সংকেত পাওয়া যাচ্ছে না — খোলা আকাশের নিচে চেষ্টা করুন।";
  if (err.code === 3) return "GPS সময়মতো তথ্য দিতে পারেনি — আবার চেষ্টা করুন।";
  return "GPS তথ্য আনা যায়নি।";
}

export default function FieldLocationPicker({ C, case: caseObj, onLocationSet }) {
  const [status, setStatus] = useState("idle"); // idle | locating | accepted | rejected | error | unsupported
  const [reading, setReading] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const mountedRef = useRef(true);

  const existing = caseObj?.fieldLocation || null;

  function handleLocate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    mountedRef.current = true;
    setStatus("locating");
    setErrorMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return;
        const { latitude, longitude, accuracy } = pos.coords;
        const loc = { lat: latitude, lng: longitude, accuracy: Math.round(accuracy ?? 0) };
        setReading(loc);
        if (shouldRejectReading(loc.accuracy)) {
          // Accuracy too low — do NOT store, warn the farmer.
          setStatus("rejected");
          return;
        }
        setStatus("accepted");
        if (typeof onLocationSet === "function") {
          onLocationSet(loc);
        }
      },
      (err) => {
        if (!mountedRef.current) return;
        setStatus("error");
        setErrorMsg(geolocationErrorBn(err));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  const tier = reading ? getAccuracyTier(reading.accuracy) : null;
  const tierColor = tier ? TIER_COLORS[tier] : null;

  return (
    <div style={{ background: C.bg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>📍 ক্ষেতের অবস্থান</div>

      {/* Existing recorded location */}
      {existing ? (
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, lineHeight: 1.5 }}>
          <b style={{ color: C.text }}>সংরক্ষিত:</b> {formatLatLon(existing.lat, existing.lng)}
          {existing.accuracy != null ? <span style={{ marginLeft: 4 }}>· ±{existing.accuracy}মি</span> : null}
        </div>
      ) : null}

      {/* Accuracy tier badge after a reading */}
      {reading && tier ? (
        <div style={{ marginBottom: 6 }}>
          <span
            style={{
              background: tierColor.bg,
              color: tierColor.fg,
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {tierLabelBn(tier)} · ±{reading.accuracy}মি
          </span>
        </div>
      ) : null}

      {/* Accepted confirmation */}
      {status === "accepted" && reading ? (
        <div style={{ fontSize: 11, color: C.success, marginBottom: 6, lineHeight: 1.5 }}>
          ✓ অবস্থান সংরক্ষিত — {formatLatLon(reading.lat, reading.lng)}
        </div>
      ) : null}

      {/* Rejected: low accuracy */}
      {status === "rejected" && reading ? (
        <div
          style={{
            fontSize: 11,
            color: C.danger,
            background: "#fee2e2",
            borderRadius: 8,
            padding: "6px 10px",
            marginBottom: 6,
            lineHeight: 1.5,
          }}
        >
          GPS নির্ভুলতা কম ({reading.accuracy}মি) — আবার চেষ্টা করুন।
        </div>
      ) : null}

      {/* Error / unsupported */}
      {status === "error" ? (
        <div style={{ fontSize: 11, color: C.danger, marginBottom: 6, lineHeight: 1.5 }}>{errorMsg}</div>
      ) : null}
      {status === "unsupported" ? (
        <div style={{ fontSize: 11, color: C.danger, marginBottom: 6, lineHeight: 1.5 }}>
          এই ডিভাইসে GPS সমর্থিত নয়।
        </div>
      ) : null}

      {/* Locate button */}
      <button
        onClick={handleLocate}
        disabled={status === "locating"}
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.primary,
          background: "none",
          border: `1px solid ${C.primary}`,
          borderRadius: 8,
          padding: "6px 12px",
          cursor: status === "locating" ? "wait" : "pointer",
          opacity: status === "locating" ? 0.6 : 1,
        }}
      >
        {status === "locating" ? "অবস্থান আনা হচ্ছে…" : "এই ক্ষেতের অবস্থান রেকর্ড করুন"}
      </button>

      {/* Privacy note — always visible */}
      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>
        🔒 অবস্থান শুধু এই ডিভাইসে সংরক্ষিত, সার্ভারে পাঠানো হয় না।
      </div>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "./AuthProvider.jsx";

export default function OtpBanner() {
  const { status, verifyOtp, sendOtp, error, otpSending } = useAuth();
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState("");
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  if (status !== "pending_phone" || !online) return null;

  return (
    <div
      style={{
        background: "#ecfdf3",
        borderBottom: "1px solid #bbf7d0",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: "#14532d" }}>ফোন নিশ্চিত করুন</span>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
        inputMode="numeric"
        placeholder="OTP"
        aria-label="OTP"
        style={{
          width: 88,
          minHeight: 36,
          border: "1px solid #86efac",
          borderRadius: 8,
          padding: "6px 8px",
          fontSize: 16,
          letterSpacing: 2,
        }}
      />
      <button
        type="button"
        disabled={otpSending}
        onClick={async () => {
          setLocalError("");
          try {
            await verifyOtp(code);
          } catch (e) {
            setLocalError(e.message);
          }
        }}
        style={{
          minHeight: 36,
          padding: "0 12px",
          border: "none",
          borderRadius: 8,
          background: "#046A1A",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        নিশ্চিত
      </button>
      <button
        type="button"
        disabled={otpSending}
        onClick={() => sendOtp().catch((e) => setLocalError(e.message))}
        style={{
          minHeight: 36,
          padding: "0 10px",
          border: "none",
          background: "none",
          color: "#166534",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        আবার পাঠান
      </button>
      {(localError || error) && <span style={{ color: "#b91c1c", fontSize: 12 }}>{localError || error}</span>}
    </div>
  );
}

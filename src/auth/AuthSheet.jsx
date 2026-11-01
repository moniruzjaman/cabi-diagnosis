import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider.jsx";
import { isBdPhone } from "./phone.js";

const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";
let gisScriptPromise = null;

function loadGISScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = GIS_SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisScriptPromise = null;
      resolve();
    };
    document.head.appendChild(s);
  });
  return gisScriptPromise;
}

function GoogleButton({ onFail }) {
  const { loginWithGoogle } = useAuth();
  const btnRef = useRef(null);
  const [ready, setReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    loadGISScript().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !clientId || !btnRef.current || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          await loginWithGoogle(response.credential);
        } catch (e) {
          onFail?.(e);
        }
      },
    });
    btnRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline",
      size: "medium",
      shape: "pill",
      text: "signin_with",
      locale: "bn",
      width: 220,
    });
  }, [ready, clientId, loginWithGoogle, onFail]);

  if (!clientId) return null;
  return <div ref={btnRef} />;
}

export default function AuthSheet() {
  const { user, status, savePhone, error } = useAuth();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [googleFailed, setGoogleFailed] = useState(false);
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  if (status === "enrolled" && user) {
    const label = user.name || user.phone || user.email || "";
    const initial = (label || "U").trim().charAt(0).toUpperCase();
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} title={label}>
        {user.picture_url ? (
          <img
            src={user.picture_url}
            alt=""
            width={36}
            height={36}
            style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: "#046A1A",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {initial}
          </div>
        )}
      </div>
    );
  }

  const showPhone = !online || googleFailed || status === "pending_phone";

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-label="Account"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "1px solid var(--c-border, #e5e7eb)",
          background: "var(--c-bg-muted, #f3f4f6)",
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        {status === "pending_phone" ? "P" : "?"}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 44,
            width: 260,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            padding: 12,
            zIndex: 300,
          }}
        >
          {online && !showPhone && (
            <>
              <GoogleButton onFail={() => setGoogleFailed(true)} />
              <button
                type="button"
                onClick={() => setGoogleFailed(true)}
                style={{
                  marginTop: 8,
                  width: "100%",
                  border: "none",
                  background: "none",
                  color: "#6b7280",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Google নেই? ফোন ব্যবহার করুন
              </button>
            </>
          )}
          {showPhone && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!isBdPhone(phone)) {
                  setPhoneError("সঠিক নম্বর লিখুন (01XXXXXXXXX)");
                  return;
                }
                setPhoneError("");
                try {
                  await savePhone(phone);
                  setOpen(false);
                } catch (err) {
                  setPhoneError(err.message);
                }
              }}
            >
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>মোবাইল নম্বর</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                inputMode="numeric"
                autoComplete="tel"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 16,
                }}
              />
              {(phoneError || error) && (
                <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>{phoneError || error}</div>
              )}
              <button
                type="submit"
                style={{
                  marginTop: 10,
                  width: "100%",
                  minHeight: 44,
                  border: "none",
                  borderRadius: 10,
                  background: "#046A1A",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ফোন সেভ করুন
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              marginTop: 8,
              width: "100%",
              border: "none",
              background: "none",
              color: "#6b7280",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            অতিথি হিসেবে চালিয়ে যান
          </button>
        </div>
      )}
    </div>
  );
}

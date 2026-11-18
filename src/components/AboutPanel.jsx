import { useState, useEffect } from "react";
import { BUILD_META } from "../buildMeta.js";

/**
 * AboutPanel — lightweight system-information modal (production observability).
 *
 * Opened from the app header (ℹ️ button) or the footer link; NOT part of the
 * Home dashboard. Shows the build identity (version / commit / build time
 * from the single source of truth in src/buildMeta.js), runtime environment
 * (online status, PWA/service-worker state) and quick PWA diagnostics
 * (installed version vs deployed version mismatch hint).
 *
 * The panel is read-only: no settings, no actions beyond "check for update".
 */

function Row({ C, label, value, muted = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        padding: "9px 0",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <span style={{ fontSize: 12.5, color: C.textMuted, flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 12.5,
          color: muted ? C.textMuted : C.text,
          fontWeight: 600,
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function AboutPanel({ open, onClose, C, darkMode }) {
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [swActive, setSwActive] = useState(false);
  const [swWaiting, setSwWaiting] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Live online/offline status + service-worker state
  useEffect(() => {
    if (!open) return undefined;
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    let cancelled = false;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (cancelled || !reg) return;
        setSwActive(!!reg.active);
        setSwWaiting(!!reg.waiting);
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, [open]);

  if (!open) return null;

  const handleCheckUpdate = async () => {
    if (!("serviceWorker" in navigator)) return;
    setCheckingUpdate(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
      setSwWaiting(!!reg?.waiting);
    } catch {
      /* update check is best-effort */
    } finally {
      setCheckingUpdate(false);
    }
  };

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);

  // Detect shell staleness: the HTML shell's stamped version vs the bundle's
  const shellVersion =
    typeof document !== "undefined" ? document.querySelector('meta[name="app-version"]')?.content : null;
  const staleShell = shellVersion && shellVersion !== BUILD_META.appVersion;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="System information"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg,
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          width: "100%",
          maxWidth: 420,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: darkMode ? "0 24px 64px rgba(0,0,0,0.6)" : "0 24px 64px rgba(4,106,26,0.18)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 18px",
            borderBottom: `1px solid ${C.border}`,
            position: "sticky",
            top: 0,
            background: C.bg,
          }}
        >
          <span style={{ fontSize: 26 }}>🌿</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>উদ্ভিদ গোয়েন্দা</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>Plant Detective · CABI Plantwise</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              border: `1px solid ${C.border}`,
              background: C.bgMuted,
              cursor: "pointer",
              fontSize: 15,
              color: C.text,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "6px 18px 18px" }}>
          {/* Build identity */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, margin: "12px 0 2px", letterSpacing: 0.4 }}>
            বিল্ড তথ্য · BUILD
          </div>
          <Row C={C} label="অ্যাপ সংস্করণ" value={`v${BUILD_META.appVersion}`} />
          <Row C={C} label="কমিট" value={BUILD_META.commit} />
          <Row
            C={C}
            label="বিল্ড সময়"
            value={new Date(BUILD_META.buildTime).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" })}
          />
          {staleShell && (
            <div
              style={{
                marginTop: 10,
                fontSize: 11.5,
                padding: "8px 10px",
                borderRadius: 8,
                background: darkMode ? "rgba(255,193,7,0.12)" : "rgba(255,193,7,0.15)",
                color: darkMode ? "#ffd54f" : "#8a6d00",
              }}
            >
              ⚠️ পেজটি পুরোনো ক্যাশ থেকে চলছে (শেল v{shellVersion}) — একবার রিফ্রেশ করুন।
            </div>
          )}

          {/* Runtime environment */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, margin: "18px 0 2px", letterSpacing: 0.4 }}>
            সিস্টেম · SYSTEM
          </div>
          <Row C={C} label="নেটওয়ার্ক" value={online ? "🟢 অনলাইন" : "🔴 অফলাইন"} muted={!online} />
          <Row C={C} label="অ্যাপ মোড" value={isStandalone ? "📲 ইনস্টলড অ্যাপ (PWA)" : "🌐 ব্রাউজার"} />
          <Row C={C} label="সার্ভিস ওয়ার্কার" value={swActive ? "সক্রিয়" : "নিষ্ক্রিয়"} muted={!swActive} />

          {/* PWA update controls */}
          {swActive && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: C.bgMuted,
                  color: C.primary,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: checkingUpdate ? "wait" : "pointer",
                }}
              >
                {checkingUpdate ? "পরীক্ষা চলছে…" : "🔄 আপডেট পরীক্ষা করুন"}
              </button>
              {swWaiting && (
                <div
                  style={{
                    flex: "100%",
                    fontSize: 11.5,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: darkMode ? "rgba(33,150,243,0.14)" : "rgba(33,150,243,0.1)",
                    color: darkMode ? "#90caf9" : "#1565c0",
                  }}
                >
                  নতুন সংস্করণ ডাউনলোড হয়েছে — পেজ রিফ্রেশ করলেই লাগবে।
                </div>
              )}
            </div>
          )}

          {/* Privacy note */}
          <div style={{ marginTop: 16, fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
            🔒 গোপনীয়তা: ফসলের ছবি কখনো সার্ভারে জমা রাখা হয় না; কেসের ছবি শুধু আপনার ডিভাইসে সংরক্ষিত থাকে।
          </div>
        </div>
      </div>
    </div>
  );
}

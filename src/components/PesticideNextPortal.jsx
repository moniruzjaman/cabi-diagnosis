import React from "react";

const APP_URL = "https://pesticide.krishiai.live/";

/**
 * CABI's returnable entry point to the standalone PesticideNext application.
 * The parent navigation remains outside the iframe, so users can always
 * return to CABI even if the external app has a loading or framing problem.
 */
export default function PesticideNextPortal({ onBack }) {
  return (
    <section
      aria-label="PesticideNext application"
      style={{
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        paddingBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          padding: "10px 12px",
          border: "1px solid var(--c-border, #e2e5ea)",
          borderRadius: 14,
          background: "var(--c-bg-card, #fff)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "9px 14px",
            border: 0,
            borderRadius: 11,
            background: "#046A1A",
            color: "#fff",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
          }}
          aria-label="Back to CABI Diagnosis home"
        >
          <span aria-hidden="true">←</span>
          CABI Diagnosis-এ ফিরুন
        </button>
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <div style={{ color: "var(--c-text, #1a1d21)", fontSize: 13, fontWeight: 800 }}>
            PesticideNext
          </div>
          <div style={{ color: "var(--c-text-muted, #5f6672)", fontSize: 11 }}>
            DAE বালাইনাশক তথ্য, নিরাপদ ব্যবহার ও MoA ব্যবস্থাপনা
          </div>
        </div>
        <a
          href={APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            minHeight: 40,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 12px",
            border: "1px solid var(--c-border, #d1d5db)",
            borderRadius: 10,
            color: "#046A1A",
            background: "transparent",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          নতুন ট্যাবে খুলুন ↗
        </a>
      </div>

      <div
        style={{
          width: "100%",
          height: "min(76svh, 900px)",
          minHeight: "560px",
          overflow: "hidden",
          border: "1px solid var(--c-border, #e2e5ea)",
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 4px 18px rgba(0,0,0,.07)",
        }}
      >
        <iframe
          title="PesticideNext — বালাইনাশক ব্যবস্থাপনা"
          src={APP_URL}
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="camera; microphone; geolocation; clipboard-read; clipboard-write"
          allowFullScreen
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            border: 0,
            background: "#fff",
          }}
        />
      </div>
      <p style={{ margin: 0, padding: "0 4px", color: "var(--c-text-muted, #5f6672)", fontSize: 11, lineHeight: 1.6 }}>
        এম্বেড করা অ্যাপ লোড না হলে “নতুন ট্যাবে খুলুন” ব্যবহার করুন। CABI-তে ফিরতে উপরের সবুজ বাটনটি চাপুন।
      </p>
    </section>
  );
}

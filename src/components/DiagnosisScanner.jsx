import React, { useEffect, useState, useCallback } from 'react';

const DURATION = 3000;

export default function DiagnosisScanner({ active = false, onComplete }) {
  const [progress, setProgress] = useState(0);
  const rafRef = React.useRef(null);
  const startTimeRef = React.useRef(null);

  const animate = useCallback((timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const pct = Math.min(100, Math.round((elapsed / DURATION) * 100));
    setProgress(pct);
    if (pct < 100) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  }, [onComplete]);

  useEffect(() => {
    if (active) {
      setProgress(0);
      startTimeRef.current = null;
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, animate]);

  if (!active) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.12)',
        borderRadius: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        zIndex: 10,
        animation: 'fadeIn .2s ease',
        pointerEvents: 'none',
      }}
      aria-busy="true"
      aria-label="Diagnosis scanning in progress"
    >
      <div
        style={{
          position: 'absolute',
          left: 18,
          right: 18,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #9bf7a8, #9bf7a8, transparent)',
          boxShadow: '0 0 20px rgba(26,122,58,0.6), 0 0 40px rgba(26,122,58,0.25)',
          top: 0,
          animation: 'scanLine 2s linear infinite',
          zIndex: 11,
        }}
      />
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#fff',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          background: 'linear-gradient(90deg, #fff 0%, #fff 40%, #9bf7a8 50%, #fff 60%, #fff 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          display: 'inline-block',
          animation: 'shimmer 2s ease-in-out infinite',
        }}
      >
        বিশ্লেষণ চলছে...
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.9)',
          fontWeight: 600,
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {progress}%
      </div>
    </div>
  );
}

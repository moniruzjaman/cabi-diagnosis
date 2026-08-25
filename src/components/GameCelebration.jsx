import React, { useEffect, useRef, useState } from 'react';
import Confetti from './ui/Confetti';

export default function GameCelebration({
  show,
  score,
  maxScore,
  message,
  emoji,
  onPlayAgain,
  onBackToHub,
}) {
  const playAgainRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        playAgainRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(false);
    }
  }, [show]);

  if (!shouldRender || !show) return null;

  const bengaliScore = score.toLocaleString('bn-BD');
  const bengaliMax = maxScore.toLocaleString('bn-BD');

  return (
    <>
      <Confetti active={true} />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          padding: 20,
          animation: 'gc-fadeIn 0.35s ease-out',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Game Complete"
      >
        <div
          style={{
            background: 'var(--c-bg-card, #ffffff)',
            borderRadius: 'var(--c-radius-xl, 24px)',
            padding: 'clamp(24px, 5vw, 40px)',
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            boxShadow: 'var(--c-shadow-lg, 0 8px 32px rgba(0,0,0,0.12))',
            border: '1.5px solid var(--c-border, #e2e5ea)',
            animation: 'gc-slideUp 0.4s ease-out',
            fontFamily: "var(--c-font-sans, 'Inter', 'Noto Sans Bengali', sans-serif)",
          }}
        >
          <div
            style={{
              fontSize: 'clamp(48px, 12vw, 72px)',
              marginBottom: 12,
              animation: 'gc-bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              lineHeight: 1,
            }}
            aria-hidden="true"
          >
            {emoji}
          </div>

          <div
            style={{
              fontSize: 'clamp(14px, 3.5vw, 18px)',
              fontWeight: 800,
              color: 'var(--c-text, #1a1d21)',
              marginBottom: 4,
              lineHeight: 1.3,
            }}
          >
            মিসনে সম্পূর্ণ হয়েছে!
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 'clamp(36px, 9vw, 52px)',
                fontWeight: 900,
                color: 'var(--c-primary, #006028)',
                lineHeight: 1,
              }}
            >
              {bengaliScore}
            </span>
            <span
              style={{
                fontSize: 'clamp(14px, 3.5vw, 18px)',
                color: 'var(--c-text-muted, #5f6672)',
                fontWeight: 600,
              }}
            >
              / {bengaliMax}
            </span>
          </div>

          <div
            style={{
              fontSize: 'clamp(13px, 3vw, 15px)',
              color: 'var(--c-text-muted, #5f6672)',
              fontWeight: 600,
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            {message}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <button
              ref={playAgainRef}
              onClick={onPlayAgain}
              style={{
                width: '100%',
                minHeight: 48,
                border: 'none',
                borderRadius: 'var(--c-radius-md, 14px)',
                background: 'linear-gradient(135deg, var(--c-primary, #006028), var(--c-primary-light, #1a7a3a))',
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,96,40,0.3)',
                fontFamily: "var(--c-font-sans, 'Inter', 'Noto Sans Bengali', sans-serif)",
                transition: 'transform 0.15s ease',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              আবার খেলুন
            </button>

            <button
              onClick={onBackToHub}
              style={{
                width: '100%',
                minHeight: 48,
                border: '1.5px solid var(--c-border, #e2e5ea)',
                borderRadius: 'var(--c-radius-md, 14px)',
                background: 'var(--c-bg-card, #ffffff)',
                color: 'var(--c-text, #1a1d21)',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "var(--c-font-sans, 'Inter', 'Noto Sans Bengali', sans-serif)",
                transition: 'transform 0.15s ease',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              হাবে ফিরুন
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

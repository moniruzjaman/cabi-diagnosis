import React, { useEffect, useRef, useState } from 'react';

const CONFETTI_COUNT = 40;
const DURATION = 2800;

const COLORS = [
  '#006028', '#1a7a3a', '#16a34a',
  '#f59e0b', '#fbbf24', '#d97706',
  '#dc2626', '#ef4444',
  '#7c3aed', '#0891b2',
  '#2563eb', '#3b82f6',
  '#ea580c', '#f97316',
];

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

export default function Confetti({ active = false, onComplete, colors }) {
  const [particles, setParticles] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (active) {
      const palette = colors || COLORS;
      const newParticles = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: i,
        left: `${randomRange(5, 95)}%`,
        color: palette[Math.floor(Math.random() * palette.length)],
        size: randomRange(6, 12),
        delay: randomRange(0, 400),
        duration: randomRange(2200, DURATION + 600),
        rotate: randomRange(360, 1080),
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }));
      setParticles(newParticles);

      timerRef.current = setTimeout(() => {
        setParticles([]);
        onComplete && onComplete();
      }, DURATION + 700);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-12px',
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.borderRadius,
            animation: `confettiFall ${p.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}ms forwards`,
            '--confetti-rotate': `${p.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

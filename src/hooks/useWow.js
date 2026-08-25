import React, { useCallback, useState } from 'react';

export function useConfetti() {
  const [active, setActive] = useState(false);

  const trigger = useCallback(() => {
    setActive(false);
    requestAnimationFrame(() => {
      setActive(true);
    });
  }, []);

  const handleComplete = useCallback(() => {
    setActive(false);
  }, []);

  const ConfettiComponent = active ? (
    <ConfettiEffect active={active} onComplete={handleComplete} />
  ) : null;

  return { trigger, active, ConfettiComponent };
}

function ConfettiEffect({ active, onComplete }) {
  const [particles, setParticles] = useState([]);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (active) {
      const colors = [
        '#006028', '#1a7a3a', '#16a34a',
        '#f59e0b', '#fbbf24', '#d97706',
        '#dc2626', '#ef4444', '#7c3aed',
      ];
      const newParticles = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        delay: Math.random() * 300,
        duration: Math.random() * 1500 + 2200,
        rotate: Math.random() * 720 + 360,
      }));
      setParticles(newParticles);
      timerRef.current = setTimeout(() => {
        setParticles([]);
        onComplete();
      }, 3500);
    }
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [active, onComplete]);

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
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confettiFall ${p.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}ms forwards`,
            '--confetti-rotate': `${p.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function useHaptic() {
  return useCallback((element) => {
    if (!element) return;
    element.style.transition = 'transform 0.1s ease';
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 100);
  }, []);
}

export function useStagger(items = [], baseDelay = 60) {
  return items.map((_, index) => ({
    '--stagger-delay': `${index * baseDelay}ms`,
    '--stagger-index': index,
  }));
}

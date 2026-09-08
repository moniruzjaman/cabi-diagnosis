import React from 'react';
import { useStagger } from '../hooks/useWow.js';

const LEAF_EMOJIS = ['🍃', '🌿', '🍂', '☘️', '🌱', '🍀'];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function FloatingLeaves({ count = 7, className = '' }) {
  const leaves = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: LEAF_EMOJIS[i % LEAF_EMOJIS.length],
      left: `${randomBetween(5, 95)}%`,
      delay: `${randomBetween(0, 4)}s`,
      duration: `${randomBetween(4, 8)}s`,
      size: `${randomBetween(40, 90)}px`,
      opacity: randomBetween(0.06, 0.12).toFixed(2),
    }));
  }, [count]);

  return (
    <div
      className={`floating-leaves ${className}`.trim()}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {leaves.map((leaf) => (
        <span
          key={leaf.id}
          style={{
            position: 'absolute',
            left: leaf.left,
            top: `${randomBetween(-10, 90)}%`,
            fontSize: leaf.size,
            opacity: leaf.opacity,
            animation: `floatGentle ${leaf.duration} ease-in-out infinite`,
            animationDelay: leaf.delay,
            willChange: 'transform',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {leaf.emoji}
        </span>
      ))}
    </div>
  );
}

export function StaggerContainer({ children, baseDelay = 80, className = '', as = 'div', ...rest }) {
  const staggerProps = useStagger(React.Children.toArray(children), baseDelay);
  const Component = as;

  return (
    <Component className={className} {...rest}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className="ud-stagger-item"
          style={staggerProps[index]}
        >
          {child}
        </div>
      ))}
    </Component>
  );
}

export function ShimmerText({ text = '', className = '', as: Component = 'span', color, ...rest }) {
  const textColor = color || 'var(--c-text, #1a1d21)';
  return (
    <Component
      className={`ud-shimmer-text ${className}`.trim()}
      {...rest}
      style={{
        background: `linear-gradient(90deg, ${textColor} 0%, ${textColor} 40%, var(--c-accent, #f59e0b) 50%, ${textColor} 60%, ${textColor} 100%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s ease-in-out infinite',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        display: 'inline-block',
        ...rest.style,
      }}
    >
      {text}
    </Component>
  );
}

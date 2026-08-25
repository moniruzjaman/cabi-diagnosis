import React from 'react';

export default function ProgressBar({
  value = 0,
  color = null,
  height = 8,
  showLabel = false,
  animated = true,
  className = '',
  style = {},
  ...rest
}) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`ud-progress ${className}`.trim()}
      style={{ '--progress-height': `${height}px`, ...style } as React.CSSProperties}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      <div
        className={`ud-progress__bar${animated ? ' ud-progress__bar--animated' : ''}`}
        style={{
          width: `${clampedValue}%`,
          '--progress-color': color || undefined,
        } as React.CSSProperties}
      />
      {showLabel && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--c-text-muted, #5f6672)',
            marginTop: 4,
            display: 'block',
          }}
        >
          {clampedValue}%
        </span>
      )}
    </div>
  );
}

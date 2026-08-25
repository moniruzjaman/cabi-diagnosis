import React from 'react';

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
  variant = 'text',
  className = '',
  style = {},
  ...rest
}) {
  const variantClass = `ud-skeleton--${variant}`;

  return (
    <div
      className={`ud-skeleton ${variantClass} ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius: borderRadius !== undefined ? borderRadius : undefined,
        ...style,
      }}
      role="status"
      aria-label="Loading"
      {...rest}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

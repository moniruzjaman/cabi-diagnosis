import React from 'react';

export default function Card({
  children,
  className = '',
  style = {},
  hover = false,
  padding = 16,
  shadow = 'sm',
  ...rest
}) {
  const shadowMap = {
    sm: 'var(--c-shadow, 0 2px 8px rgba(0,0,0,0.06))',
    md: 'var(--c-shadow-md, 0 4px 16px rgba(0,0,0,0.08))',
    lg: 'var(--c-shadow-lg, 0 8px 32px rgba(0,0,0,0.12))',
  };

  const classes = [
    'ud-card',
    hover ? '' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      data-hover={hover ? 'true' : undefined}
      data-padding={padding !== 16 ? padding : undefined}
      style={{
        padding: padding !== 16 ? `${padding}px` : undefined,
        boxShadow: shadow !== 'sm' ? shadowMap[shadow] : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

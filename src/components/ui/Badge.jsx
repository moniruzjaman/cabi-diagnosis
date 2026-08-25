import React from 'react';

const variantColors = {
  success: 'ud-badge--success',
  warning: 'ud-badge--warning',
  danger: 'ud-badge--danger',
  info: 'ud-badge--info',
  neutral: 'ud-badge--neutral',
};

export default function Badge({
  text,
  variant = 'neutral',
  size = 'sm',
  className = '',
  ...rest
}) {
  const classes = [
    'ud-badge',
    `ud-badge--${variant}`,
    `ud-badge--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...rest}>
      {text}
    </span>
  );
}

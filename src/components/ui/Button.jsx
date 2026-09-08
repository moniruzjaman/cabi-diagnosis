import React from 'react';

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  fullWidth = false,
  className = '',
  style = {},
  type = 'button',
  ...rest
}) {
  const classes = [
    'ud-btn',
    `ud-btn--${variant}`,
    `ud-btn--${size}`,
    fullWidth ? 'ud-btn--fullWidth' : '',
    loading ? 'ud-btn--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      style={style}
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className="ud-btn__spinner" aria-hidden="true" />}
      {!loading && icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

import React from 'react';

export default function Chip({
  label,
  selected = false,
  onClick,
  color = null,
  icon = null,
  className = '',
  ...rest
}) {
  const classes = [
    'ud-chip',
    selected ? 'ud-chip--selected' : '',
    className,
  ].filter(Boolean).join(' ');

  const style = color && !selected ? { borderColor: color, color } : undefined;

  return (
    <button
      className={classes}
      onClick={onClick}
      aria-pressed={selected}
      style={style}
      type="button"
      {...rest}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </button>
  );
}

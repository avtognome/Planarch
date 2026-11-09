import React from 'react';

export type ArcheronBrandProps = {
  mode?: 'light' | 'dark';
  compact?: boolean;
  variant?: 'horizontal' | 'stacked';
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
};

export function ArcheronBrand({
  mode = 'light',
  compact = false,
  variant = 'horizontal',
  className = '',
  style,
  alt = 'Archeron',
}: ArcheronBrandProps) {
  const isDark = mode === 'dark';
  let src: string;

  if (compact) {
    src = isDark
      ? '/branding/archeron-seal-gold.svg'
      : '/branding/archeron-seal-on-ivory.svg';
  } else if (variant === 'stacked') {
    src = isDark
      ? '/branding/archeron-logo-stacked-on-dark.svg'
      : '/branding/archeron-logo-stacked-on-light.svg';
  } else {
    src = isDark
      ? '/branding/archeron-logo-horizontal-on-dark.svg'
      : '/branding/archeron-logo-horizontal-on-light.svg';
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      draggable={false}
    />
  );
}

export default ArcheronBrand;

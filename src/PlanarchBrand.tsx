import React from 'react';

export type PlanarchBrandProps = {
  mode?: 'light' | 'dark';
  compact?: boolean;
  variant?: 'horizontal' | 'stacked';
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
};

export function PlanarchBrand({
  mode = 'light',
  compact = false,
  variant = 'horizontal',
  className = '',
  style,
  alt = 'Planarch',
}: PlanarchBrandProps) {
  const isDark = mode === 'dark';
  let src: string;

  if (compact) {
    src = isDark
      ? '/branding/planarch-seal-gold.svg'
      : '/branding/planarch-seal-on-ivory.svg';
  } else if (variant === 'stacked') {
    src = isDark
      ? '/branding/planarch-logo-stacked-on-dark.svg'
      : '/branding/planarch-logo-stacked-on-light.svg';
  } else {
    src = isDark
      ? '/branding/planarch-logo-horizontal-on-dark.svg'
      : '/branding/planarch-logo-horizontal-on-light.svg';
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

export default PlanarchBrand;

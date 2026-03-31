import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: '#0A84FF', color: '#FFF', border: '1px solid #0A84FF' },
  secondary: { background: '#161B22', color: '#E6EDF3', border: '1px solid #30363D' },
  ghost: { background: 'transparent', color: '#8B949E', border: '1px solid transparent' },
  danger: { background: '#F85149', color: '#FFF', border: '1px solid #F85149' },
  success: { background: '#3FB950', color: '#FFF', border: '1px solid #3FB950' },
};

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  xs: { padding: '2px 8px', fontSize: 11, borderRadius: 4, height: 24 },
  sm: { padding: '4px 10px', fontSize: 12, borderRadius: 5, height: 28 },
  md: { padding: '6px 14px', fontSize: 13, borderRadius: 6, height: 32 },
  lg: { padding: '8px 18px', fontSize: 14, borderRadius: 7, height: 40 },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, icon, iconPosition = 'left', fullWidth, children, disabled, style, ...rest }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          transition: 'all 150ms ease',
          outline: 'none',
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.5 : 1,
          ...VARIANT_STYLES[variant],
          ...SIZE_STYLES[size],
          ...style,
        }}
        {...rest}
      >
        {loading && <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;

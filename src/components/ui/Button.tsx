import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const baseStyles = `
  inline-flex items-center justify-center gap-2
  font-medium rounded-lg
  transition-all duration-200 ease-out
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary
  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  active:scale-[0.98]
`;

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-accent-teal text-bg-primary
    hover:bg-accent-teal/90 hover:shadow-lg hover:shadow-accent-teal/20
    focus:ring-accent-teal
    active:bg-accent-teal/80
  `,
  secondary: `
    bg-bg-secondary text-text-primary border border-border
    hover:bg-bg-card hover:border-text-muted
    focus:ring-text-muted
    active:bg-bg-primary
  `,
  ghost: `
    text-text-secondary bg-transparent
    hover:bg-bg-secondary hover:text-text-primary
    focus:ring-text-muted
    active:bg-bg-card
  `,
  danger: `
    bg-accent-red text-white
    hover:bg-accent-red/90 hover:shadow-lg hover:shadow-accent-red/20
    focus:ring-accent-red
    active:bg-accent-red/80
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const LoadingSpinner = () => (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}

// Icon button variant for toolbar-style buttons
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-3',
};

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${iconSizeStyles[size]}
        rounded-lg
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
}

// Link-styled button for text actions
interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  underline?: boolean;
}

export function TextButton({
  children,
  underline = false,
  className = '',
  ...props
}: TextButtonProps) {
  return (
    <button
      className={`
        text-accent-teal font-medium
        transition-all duration-200
        hover:text-accent-teal/80
        focus:outline-none focus:ring-2 focus:ring-accent-teal/50 focus:ring-offset-2 focus:ring-offset-bg-primary rounded
        active:text-accent-teal/70
        disabled:opacity-50 disabled:cursor-not-allowed
        ${underline ? 'underline underline-offset-2' : 'hover:underline hover:underline-offset-2'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </button>
  );
}

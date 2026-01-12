import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightContent?: ReactNode;
  className?: string;
}

/**
 * Reusable card wrapper for charts
 */
export function ChartCard({
  title,
  subtitle,
  children,
  rightContent,
  className = '',
}: ChartCardProps) {
  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
        {rightContent && (
          <div className="flex items-center gap-2">
            {rightContent}
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

/**
 * Toggle button group for chart controls
 */
export function ChartToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            value === option.value
              ? 'bg-accent-teal text-bg-primary'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

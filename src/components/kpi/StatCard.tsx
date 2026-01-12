import { memo } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: string;
  variant?: 'default' | 'highlight' | 'warning' | 'critical';
}

const variantStyles = {
  default: 'border-border',
  highlight: 'border-accent-teal',
  warning: 'border-accent-amber',
  critical: 'border-accent-red',
};

const variantTextStyles = {
  default: 'text-accent-teal',
  highlight: 'text-accent-teal',
  warning: 'text-accent-amber',
  critical: 'text-accent-red',
};

export const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
}: StatCardProps) {
  return (
    <article
      className={`glass-card p-6 border-l-4 ${variantStyles[variant]} animate-slide-up`}
      data-stat-card
      role="region"
      aria-label={`${title}: ${value}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm text-text-secondary font-medium">{title}</h3>
          <p
            className={`text-3xl font-bold mt-2 number-br ${variantTextStyles[variant]}`}
            aria-label={`Valor: ${value}`}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-text-muted mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2" role="status" aria-live="polite">
              <span
                className={`text-sm font-medium ${
                  trend.value >= 0 ? 'text-status-low' : 'text-accent-red'
                }`}
                aria-label={`Tendencia: ${trend.value >= 0 ? 'aumento' : 'queda'} de ${Math.abs(trend.value)} porcento`}
              >
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-text-muted">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && <span className="text-3xl opacity-50" aria-hidden="true">{icon}</span>}
      </div>
    </article>
  );
});

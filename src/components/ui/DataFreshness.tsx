import { useMemo } from 'react';
import { TouchTooltip } from './TouchTooltip';

interface DataFreshnessProps {
  lastUpdated?: string; // ISO date string
  period?: {
    start: string;
    end: string;
  };
  className?: string;
}

/**
 * Shows when the data was last updated and covers what period
 */
export function DataFreshness({ lastUpdated, period, className = '' }: DataFreshnessProps) {
  const { displayDate, freshnessLevel, freshnessColor } = useMemo(() => {
    if (!lastUpdated) {
      return {
        displayDate: 'Desconhecido',
        freshnessLevel: 'unknown',
        freshnessColor: 'text-text-muted',
      };
    }

    const updateDate = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - updateDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Format the actual date for display
    const displayDate = updateDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });

    let freshnessLevel: string;
    let freshnessColor: string;

    if (diffDays < 7) {
      freshnessLevel = 'fresh';
      freshnessColor = 'text-accent-teal';
    } else if (diffDays < 30) {
      freshnessLevel = 'recent';
      freshnessColor = 'text-accent-teal';
    } else if (diffDays < 90) {
      freshnessLevel = 'moderate';
      freshnessColor = 'text-accent-amber';
    } else {
      freshnessLevel = 'stale';
      freshnessColor = 'text-accent-red';
    }

    return { displayDate, freshnessLevel, freshnessColor };
  }, [lastUpdated]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const freshnessIcons = {
    fresh: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    recent: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
    moderate: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    stale: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    unknown: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <TouchTooltip
      content={
        <div className="space-y-2">
          <div>
            <p className="text-xs text-text-muted">Última atualização</p>
            <p className="font-medium">
              {lastUpdated ? formatDate(lastUpdated) : 'Desconhecido'}
            </p>
          </div>
          {period && (
            <div>
              <p className="text-xs text-text-muted">Período dos dados</p>
              <p className="font-medium">
                {formatDate(period.start)} - {formatDate(period.end)}
              </p>
            </div>
          )}
          <div className="pt-1 border-t border-border">
            <p className="text-xs text-text-muted">
              Fonte: Dados Abertos da Câmara dos Deputados
            </p>
          </div>
        </div>
      }
      position="bottom"
    >
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-secondary text-xs ${freshnessColor} ${className}`}
      >
        {freshnessIcons[freshnessLevel as keyof typeof freshnessIcons]}
        <span>{displayDate}</span>
      </div>
    </TouchTooltip>
  );
}

/**
 * Compact version for headers/footers
 */
export function DataFreshnessCompact({ lastUpdated, className = '' }: { lastUpdated?: string; className?: string }) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  return (
    <span className={`text-xs text-text-muted ${className}`}>
      Atualizado: {lastUpdated ? formatDate(lastUpdated) : '-'}
    </span>
  );
}

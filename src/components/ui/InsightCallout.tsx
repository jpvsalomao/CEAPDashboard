import type { ReactNode } from 'react';

type InsightVariant = 'discovery' | 'warning' | 'comparison' | 'fun-fact';

interface InsightCalloutProps {
  variant?: InsightVariant;
  title?: string;
  children: ReactNode;
  source?: string;
}

const variantStyles: Record<InsightVariant, { icon: ReactNode; border: string; bg: string }> = {
  discovery: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    border: 'border-accent-teal',
    bg: 'bg-accent-teal/10',
  },
  warning: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    border: 'border-accent-amber',
    bg: 'bg-accent-amber/10',
  },
  comparison: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    border: 'border-accent-blue',
    bg: 'bg-accent-blue/10',
  },
  'fun-fact': {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    border: 'border-text-secondary',
    bg: 'bg-bg-secondary',
  },
};

export function InsightCallout({
  variant = 'discovery',
  title,
  children,
  source,
}: InsightCalloutProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`rounded-lg border-l-4 ${styles.border} ${styles.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${variant === 'warning' ? 'text-accent-amber' : variant === 'comparison' ? 'text-accent-blue' : 'text-accent-teal'}`}>
          {styles.icon}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-medium text-text-primary mb-1">
              {title}
            </h4>
          )}
          <div className="text-sm text-text-secondary">{children}</div>
          {source && (
            <p className="text-xs text-text-muted mt-2">Fonte: {source}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface DidYouKnowProps {
  fact: string;
  value?: string | number;
  comparison?: string;
}

export function DidYouKnow({ fact, value, comparison }: DidYouKnowProps) {
  return (
    <InsightCallout variant="fun-fact" title="Voce sabia?">
      <p>
        {fact}
        {value && (
          <span className="font-mono text-accent-teal ml-1">{value}</span>
        )}
        {comparison && (
          <span className="text-text-muted"> ({comparison})</span>
        )}
      </p>
    </InsightCallout>
  );
}

interface KeyFindingProps {
  finding: string;
  metric?: string;
  context?: string;
  severity?: 'critical' | 'high' | 'medium';
}

export function KeyFinding({ finding, metric, context, severity = 'medium' }: KeyFindingProps) {
  const variant = severity === 'critical' ? 'warning' : severity === 'high' ? 'warning' : 'discovery';

  return (
    <InsightCallout
      variant={variant}
      title={severity === 'critical' ? 'Descoberta critica' : severity === 'high' ? 'Atencao' : 'Descoberta'}
    >
      <p>
        {finding}
        {metric && (
          <span className={`font-mono ml-1 ${severity === 'critical' ? 'text-accent-red' : severity === 'high' ? 'text-accent-amber' : 'text-accent-teal'}`}>
            {metric}
          </span>
        )}
      </p>
      {context && <p className="text-xs text-text-muted mt-1">{context}</p>}
    </InsightCallout>
  );
}

interface ComparisonInsightProps {
  subject: string;
  subjectValue: string | number;
  baseline: string;
  baselineValue: string | number;
  interpretation: string;
}

export function ComparisonInsight({
  subject,
  subjectValue,
  baseline,
  baselineValue,
  interpretation,
}: ComparisonInsightProps) {
  return (
    <InsightCallout variant="comparison" title="Comparacao">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span>{subject}</span>
          <span className="font-mono text-accent-teal">{subjectValue}</span>
        </div>
        <div className="flex justify-between items-center text-text-muted">
          <span>{baseline}</span>
          <span className="font-mono">{baselineValue}</span>
        </div>
        <p className="text-xs border-t border-border pt-2 mt-2">
          {interpretation}
        </p>
      </div>
    </InsightCallout>
  );
}

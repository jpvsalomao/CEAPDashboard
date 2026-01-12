/**
 * DeepDive Metrics Components
 * Reusable metric comparison and display components
 */

import { formatReais, formatNumber, formatPercent } from '../../utils/formatters';

interface MetricComparisonProps {
  label: string;
  deputyValue: number;
  avgValue: number;
  format?: 'currency' | 'number' | 'percent';
}

export function MetricComparison({
  label,
  deputyValue,
  avgValue,
  format = 'currency',
}: MetricComparisonProps) {
  const diff = avgValue > 0 ? ((deputyValue - avgValue) / avgValue) * 100 : 0;
  const isHigher = diff > 0;

  const formatValue = (v: number) => {
    switch (format) {
      case 'currency':
        return formatReais(v);
      case 'percent':
        return formatPercent(v);
      default:
        return formatNumber(v);
    }
  };

  return (
    <div className="bg-bg-card rounded-lg p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary">{formatValue(deputyValue)}</p>
      <p className={`text-xs ${isHigher ? 'text-accent-red' : 'text-accent-teal'}`}>
        {isHigher ? '+' : ''}
        {diff.toFixed(1)}% vs media
      </p>
    </div>
  );
}

interface AveragesData {
  spending: number;
  transactions: number;
  hhi: number;
  suppliers: number;
}

export function calculateAverages(deputies: {
  name: string;
  transactionCount: number;
  totalSpending: number;
  hhi: { value: number };
  supplierCount: number;
}[]): AveragesData {
  const filtered = deputies.filter(
    d => !d.name.includes('LIDERANCA') && d.transactionCount > 10
  );

  if (filtered.length === 0) {
    return { spending: 0, transactions: 0, hhi: 0, suppliers: 0 };
  }

  return {
    spending: filtered.reduce((s, d) => s + d.totalSpending, 0) / filtered.length,
    transactions: filtered.reduce((s, d) => s + d.transactionCount, 0) / filtered.length,
    hhi: filtered.reduce((s, d) => s + d.hhi.value, 0) / filtered.length,
    suppliers: filtered.reduce((s, d) => s + d.supplierCount, 0) / filtered.length,
  };
}

/**
 * SpotlightComparison - Comparative context for deputy metrics
 * Shows how the deputy ranks among peers
 */

import { formatReais, formatNumber, formatPercent } from '../../utils/formatters';
import type { Deputy } from '../../types/data';

interface RankingMetric {
  label: string;
  value: number;
  rank: number;
  total: number;
  format: 'currency' | 'number' | 'percent';
  higherIsBetter?: boolean;
  description?: string;
}

interface SpotlightComparisonProps {
  deputy: Deputy;
  allDeputies: Deputy[];
}

export function SpotlightComparison({ deputy, allDeputies }: SpotlightComparisonProps) {
  // Filter out leadership accounts
  const validDeputies = allDeputies.filter(
    d => !d.name.includes('LIDERANCA') && d.transactionCount > 10
  );
  const total = validDeputies.length;

  // Calculate rankings
  const sortedBySpending = [...validDeputies].sort((a, b) => b.totalSpending - a.totalSpending);
  const sortedByHHI = [...validDeputies].sort((a, b) => b.hhi.value - a.hhi.value);
  const sortedByBenford = [...validDeputies].sort((a, b) => b.benford.chi2 - a.benford.chi2);
  const sortedBySuppliers = [...validDeputies].sort((a, b) => b.supplierCount - a.supplierCount);

  const spendingRank = sortedBySpending.findIndex(d => d.id === deputy.id) + 1;
  const hhiRank = sortedByHHI.findIndex(d => d.id === deputy.id) + 1;
  const benfordRank = sortedByBenford.findIndex(d => d.id === deputy.id) + 1;
  const suppliersRank = sortedBySuppliers.findIndex(d => d.id === deputy.id) + 1;

  // Count deputies with significant Benford deviation
  const significantBenfordCount = validDeputies.filter(d => d.benford.significant).length;

  const metrics: RankingMetric[] = [
    {
      label: 'Gasto Total',
      value: deputy.totalSpending,
      rank: spendingRank,
      total,
      format: 'currency',
      description: `${spendingRank}º maior gastador entre ${total} deputados`,
    },
    {
      label: 'Concentração HHI',
      value: deputy.hhi.value,
      rank: hhiRank,
      total,
      format: 'number',
      higherIsBetter: false,
      description: `${hhiRank}º maior índice de concentração`,
    },
    {
      label: 'Desvio Benford',
      value: deputy.benford.chi2,
      rank: benfordRank,
      total,
      format: 'number',
      higherIsBetter: false,
      description: `${benfordRank}º maior desvio entre ${total} deputados`,
    },
    {
      label: 'Fornecedores',
      value: deputy.supplierCount,
      rank: suppliersRank,
      total,
      format: 'number',
      higherIsBetter: true,
      description: `${suppliersRank}º em diversificação`,
    },
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return formatReais(value);
      case 'percent':
        return formatPercent(value);
      default:
        return formatNumber(value);
    }
  };

  const getPercentile = (rank: number, total: number) => {
    return ((total - rank) / total) * 100;
  };

  const getRankColor = (rank: number, total: number, higherIsBetter = true) => {
    const percentile = getPercentile(rank, total);
    if (higherIsBetter) {
      if (percentile >= 90) return 'text-accent-red';
      if (percentile >= 75) return 'text-accent-amber';
      return 'text-text-primary';
    } else {
      // For metrics where lower is better (like HHI), invert
      if (rank <= total * 0.1) return 'text-accent-red';
      if (rank <= total * 0.25) return 'text-accent-amber';
      return 'text-text-primary';
    }
  };

  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
        <span>📈</span>
        Ranking Comparativo
      </h3>
      <p className="text-xs text-text-muted mb-6">
        Como {deputy.name.split(' ')[0]} se compara aos {total} deputados analisados
      </p>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, i) => {
          const percentile = getPercentile(metric.rank, metric.total);
          const isTopQuartile = metric.higherIsBetter
            ? percentile >= 75
            : metric.rank <= metric.total * 0.25;

          return (
            <div key={i} className="bg-bg-card rounded-lg p-4">
              <p className="text-xs text-text-muted mb-1">{metric.label}</p>
              <p className={`text-xl font-bold ${getRankColor(metric.rank, metric.total, metric.higherIsBetter)}`}>
                {formatValue(metric.value, metric.format)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isTopQuartile ? 'bg-accent-amber' : 'bg-accent-teal'
                    }`}
                    style={{ width: `${((metric.total - metric.rank + 1) / metric.total) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted shrink-0">
                  #{metric.rank}/{metric.total}
                </span>
              </div>
              {metric.description && (
                <p className="text-[10px] text-text-muted mt-1">{metric.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Contextual stats */}
      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="text-sm font-medium text-text-primary mb-3">Contexto Adicional</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Deputados com Benford significativo:</span>
            <span className="text-text-primary font-medium">
              {significantBenfordCount} de {total}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Percentual com desvio:</span>
            <span className="text-text-primary font-medium">
              {formatPercent((significantBenfordCount / total) * 100)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">HHI médio do dataset:</span>
            <span className="text-text-primary font-medium">
              {formatNumber(validDeputies.reduce((s, d) => s + d.hhi.value, 0) / total)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Gasto médio por deputado:</span>
            <span className="text-text-primary font-medium">
              {formatReais(validDeputies.reduce((s, d) => s + d.totalSpending, 0) / total)}
            </span>
          </div>
        </div>
      </div>

      {/* Interpretation note */}
      <div className="mt-4 p-3 bg-bg-card rounded text-xs text-text-muted">
        <strong className="text-text-secondary">Nota:</strong> Rankings altos em métricas como HHI
        ou Benford não são, por si só, indicadores de irregularidade. São sinais que merecem
        contexto adicional para interpretação adequada.
      </div>
    </div>
  );
}

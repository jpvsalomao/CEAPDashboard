import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { colors, getRiskLevelColor } from '../../utils/colors';

interface IndividualRiskRadarProps {
  deputy: Deputy;
  /** Array of all deputies to calculate averages for comparison */
  allDeputies?: Deputy[];
  /** Show comparison overlay with average */
  showComparison?: boolean;
  /** Height of the chart */
  height?: number;
}

interface RiskMetrics {
  hhi: number; // 0-100 normalized HHI score
  benford: number; // 0-100 Benford deviation
  roundNumbers: number; // 0-100 round number %
  topSupplier: number; // 0-100 top supplier concentration
  avgTicket: number; // 0-100 average ticket vs median
  volatility: number; // 0-100 spending volatility
  compositeScore: number; // Overall risk 0-100
}

// Normalize HHI to 0-100 scale (0=0, 10000=100)
function normalizeHHI(hhi: number): number {
  return Math.min(100, (hhi / 10000) * 100);
}

// Calculate risk metrics for a deputy
function calculateRiskMetrics(deputy: Deputy, allDeputies?: Deputy[]): RiskMetrics {
  // HHI - directly from data
  const hhi = normalizeHHI(deputy.hhi.value);

  // Benford deviation - use chi2 if available
  // Chi2 threshold for significance is ~15.5 for df=8
  // We normalize chi2: 0 = normal, 50+ = very deviant
  const benfordChi2 = deputy.benford?.chi2 || 0;
  const benford = Math.min(100, (benfordChi2 / 50) * 100);

  // Round numbers - from data
  const roundNumbers = deputy.roundValuePct ?? 0;

  // Top supplier concentration
  const topSupplier = deputy.topSuppliers?.[0]?.pct ?? 0;

  // Average ticket compared to median
  let avgTicket = 0;
  if (allDeputies && allDeputies.length > 0) {
    const allTickets = allDeputies
      .filter(d => d.transactionCount > 10)
      .map(d => d.avgTicket)
      .sort((a, b) => a - b);
    const median = allTickets[Math.floor(allTickets.length / 2)] || 1;
    // Normalize: 0 = median, 100 = 3x median or more
    avgTicket = Math.min(100, Math.max(0, ((deputy.avgTicket / median) - 0.5) * 66.67));
  } else {
    // Without comparison, use absolute scale
    // Avg ticket R$2000+ is considered high
    avgTicket = Math.min(100, (deputy.avgTicket / 3000) * 100);
  }

  // Volatility - coefficient of variation in monthly spending
  let volatility = 0;
  if (deputy.byMonth && deputy.byMonth.length > 3) {
    const values = deputy.byMonth.map(m => m.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    if (avg > 0) {
      const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
      const cv = Math.sqrt(variance) / avg;
      // CV of 0.5 (50%) is moderate, 1.0 (100%) is high
      volatility = Math.min(100, cv * 100);
    }
  }

  // Composite score - weighted average
  const compositeScore = (
    hhi * 0.25 +
    benford * 0.15 +
    roundNumbers * 0.15 +
    topSupplier * 0.20 +
    avgTicket * 0.10 +
    volatility * 0.15
  );

  return {
    hhi,
    benford,
    roundNumbers,
    topSupplier,
    avgTicket,
    volatility,
    compositeScore,
  };
}

const DIMENSIONS = [
  { key: 'hhi', label: 'Concentração HHI', color: '#DC4A4A', description: 'Concentracao de fornecedores' },
  { key: 'benford', label: 'Desvio Benford', color: '#E5A84B', description: 'Desvio da distribuicao esperada' },
  { key: 'roundNumbers', label: 'Valores Redondos', color: '#4A7C9B', description: '% de valores terminados em 0' },
  { key: 'topSupplier', label: 'Top Fornecedor', color: '#9B59B6', description: '% do top fornecedor' },
  { key: 'avgTicket', label: 'Ticket Medio', color: '#4AA3A0', description: 'Valor medio por transacao' },
  { key: 'volatility', label: 'Volatilidade', color: '#E74C3C', description: 'Variacao mensal de gastos' },
] as const;

export function IndividualRiskRadar({
  deputy,
  allDeputies = [],
  showComparison = true,
  height = 350,
}: IndividualRiskRadarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const deputyMetrics = useMemo(() => calculateRiskMetrics(deputy, allDeputies), [deputy, allDeputies]);

  // Calculate average metrics from all deputies
  const averageMetrics = useMemo(() => {
    if (!showComparison || allDeputies.length === 0) return null;

    const filteredDeputies = allDeputies
      .filter(d => !d.name.includes('LIDERANÇA') && d.transactionCount > 10);

    if (filteredDeputies.length === 0) return null;

    const allMetrics = filteredDeputies.map(d => calculateRiskMetrics(d, allDeputies));

    const sum = allMetrics.reduce(
      (acc, m) => ({
        hhi: acc.hhi + m.hhi,
        benford: acc.benford + m.benford,
        roundNumbers: acc.roundNumbers + m.roundNumbers,
        topSupplier: acc.topSupplier + m.topSupplier,
        avgTicket: acc.avgTicket + m.avgTicket,
        volatility: acc.volatility + m.volatility,
        compositeScore: acc.compositeScore + m.compositeScore,
      }),
      { hhi: 0, benford: 0, roundNumbers: 0, topSupplier: 0, avgTicket: 0, volatility: 0, compositeScore: 0 }
    );

    const count = allMetrics.length;
    return {
      hhi: sum.hhi / count,
      benford: sum.benford / count,
      roundNumbers: sum.roundNumbers / count,
      topSupplier: sum.topSupplier / count,
      avgTicket: sum.avgTicket / count,
      volatility: sum.volatility / count,
      compositeScore: sum.compositeScore / count,
    };
  }, [allDeputies, showComparison]);

  useEffect(() => {
    if (!containerRef.current || !tooltipRef.current) return;

    const tooltip = d3.select(tooltipRef.current);
    d3.select(containerRef.current).selectAll('svg').remove();

    const containerWidth = containerRef.current.clientWidth;
    const size = Math.min(containerWidth, height);
    const margin = 60;
    const radius = (size - margin * 2) / 2;
    const centerX = size / 2;
    const centerY = size / 2;

    const svg = d3
      .select(containerRef.current)
      .append('svg')
      .attr('width', size)
      .attr('height', size);

    const g = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);

    const angleSlice = (Math.PI * 2) / DIMENSIONS.length;
    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    // Draw concentric circles
    const levels = [20, 40, 60, 80, 100];
    levels.forEach(level => {
      g.append('circle')
        .attr('r', rScale(level))
        .attr('fill', 'none')
        .attr('stroke', colors.bgSecondary)
        .attr('stroke-dasharray', level === 100 ? 'none' : '2,2');

      g.append('text')
        .attr('x', 5)
        .attr('y', -rScale(level))
        .attr('fill', colors.textMuted)
        .attr('font-size', '9px')
        .text(`${level}`);
    });

    // Draw axes
    DIMENSIONS.forEach((dim, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', colors.bgSecondary);

      // Axis labels
      const labelRadius = radius + 25;
      const labelX = Math.cos(angle) * labelRadius;
      const labelY = Math.sin(angle) * labelRadius;

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', dim.color)
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .text(dim.label);
    });

    // Radar line generator
    const radarLine = d3.lineRadial<{ key: string; value: number }>()
      .radius(d => rScale(d.value))
      .angle((_, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    // Draw average comparison first (behind)
    if (averageMetrics) {
      const avgDataPoints = DIMENSIONS.map(dim => ({
        key: dim.key,
        value: (averageMetrics as unknown as Record<string, number>)[dim.key] || 0,
      }));

      // Average area
      g.append('path')
        .datum(avgDataPoints)
        .attr('d', radarLine)
        .attr('fill', 'rgba(74, 163, 160, 0.1)')
        .attr('stroke', colors.accentTeal)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0)
        .transition()
        .duration(400)
        .attr('opacity', 0.6);
    }

    // Draw deputy's radar polygon
    const dataPoints = DIMENSIONS.map(dim => ({
      key: dim.key,
      value: (deputyMetrics as unknown as Record<string, number>)[dim.key] || 0,
    }));

    // Deputy area
    g.append('path')
      .datum(dataPoints)
      .attr('d', radarLine)
      .attr('fill', `rgba(220, 74, 74, 0.2)`)
      .attr('stroke', colors.accentRed)
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .transition()
      .delay(200)
      .duration(600)
      .attr('opacity', 1);

    // Data points with tooltips
    dataPoints.forEach((point, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * rScale(point.value);
      const y = Math.sin(angle) * rScale(point.value);
      const dim = DIMENSIONS[i];

      const circle = g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 5)
        .attr('fill', dim.color)
        .attr('stroke', colors.bgPrimary)
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .style('cursor', 'pointer');

      circle
        .transition()
        .delay(700)
        .duration(300)
        .attr('opacity', 1);

      circle
        .on('mouseenter', function(event: MouseEvent) {
          d3.select(this).attr('r', 7);
          const avgValue = averageMetrics
            ? (averageMetrics as unknown as Record<string, number>)[dim.key] || 0
            : null;

          tooltip
            .style('opacity', 1)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .html(`
              <div class="tooltip-title">${dim.label}</div>
              <div class="text-xs text-text-muted mb-2">${dim.description}</div>
              <div class="space-y-1">
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">Valor:</span>
                  <span class="font-mono font-semibold">${point.value.toFixed(1)}</span>
                </div>
                ${avgValue !== null ? `
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">Media:</span>
                  <span class="font-mono">${avgValue.toFixed(1)}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">Diferenca:</span>
                  <span class="font-mono ${point.value - avgValue > 10 ? 'text-accent-amber' : ''}">${(point.value - avgValue) > 0 ? '+' : ''}${(point.value - avgValue).toFixed(1)}</span>
                </div>
                ` : ''}
              </div>
            `);
        })
        .on('mousemove', function(event: MouseEvent) {
          tooltip
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`);
        })
        .on('mouseleave', function() {
          d3.select(this).attr('r', 5);
          tooltip.style('opacity', 0);
        });
    });

    // Center score
    const scoreColor = deputyMetrics.compositeScore > 50
      ? colors.accentRed
      : deputyMetrics.compositeScore > 30
        ? colors.accentAmber
        : colors.accentTeal;

    g.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('fill', scoreColor)
      .attr('font-size', '28px')
      .attr('font-weight', 'bold')
      .attr('opacity', 0)
      .text(Math.round(deputyMetrics.compositeScore))
      .transition()
      .delay(900)
      .duration(300)
      .attr('opacity', 1);

    g.append('text')
      .attr('x', 0)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.textMuted)
      .attr('font-size', '10px')
      .text('Score');

  }, [deputy, deputyMetrics, averageMetrics, height]);

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div ref={containerRef} className="flex justify-center" />
      <div ref={tooltipRef} className="tooltip" style={{ opacity: 0 }} />

      {/* Legend */}
      {showComparison && averageMetrics && (
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-accent-red" />
            <span className="text-text-secondary">{deputy.name.split(' ')[0]}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t border-accent-teal border-dashed" />
            <span className="text-text-secondary">Media geral</span>
          </div>
        </div>
      )}

      {/* Dimension breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {DIMENSIONS.map((dim) => {
          const value = (deputyMetrics as unknown as Record<string, number>)[dim.key] || 0;
          const avgValue = averageMetrics
            ? (averageMetrics as unknown as Record<string, number>)[dim.key] || 0
            : null;
          const diff = avgValue !== null ? value - avgValue : null;

          return (
            <div
              key={dim.key}
              className="bg-bg-secondary rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: dim.color }}
                />
                <span className="text-xs text-text-muted">{dim.label}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span
                  className="text-lg font-bold"
                  style={{ color: value > 50 ? colors.accentRed : value > 30 ? colors.accentAmber : colors.textPrimary }}
                >
                  {Math.round(value)}
                </span>
                {diff !== null && (
                  <span
                    className={`text-xs ${diff > 10 ? 'text-accent-red' : diff < -10 ? 'text-accent-teal' : 'text-text-muted'}`}
                  >
                    {diff > 0 ? '+' : ''}{Math.round(diff)} vs media
                  </span>
                )}
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1 bg-bg-card rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${value}%`,
                    backgroundColor: dim.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk level indicator */}
      <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
        <div>
          <p className="text-sm text-text-muted">Nivel de Risco Composto</p>
          <p className="text-lg font-semibold" style={{ color: getRiskLevelColor(deputy.riskLevel) }}>
            {deputy.riskLevel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-text-muted">Score</p>
          <p className="text-2xl font-bold" style={{
            color: deputyMetrics.compositeScore > 50
              ? colors.accentRed
              : deputyMetrics.compositeScore > 30
                ? colors.accentAmber
                : colors.accentTeal
          }}>
            {Math.round(deputyMetrics.compositeScore)}
          </p>
        </div>
      </div>

      {/* Data source note */}
      <p className="text-xs text-text-muted text-center">
        Todas as metricas sao calculadas a partir de dados reais: HHI, Benford, valores redondos,
        concentracao de fornecedores, ticket medio e volatilidade mensal.
      </p>
    </div>
  );
}

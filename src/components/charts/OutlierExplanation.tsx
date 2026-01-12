import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais, formatNumber, formatPercent } from '../../utils/formatters';

interface OutlierExplanationProps {
  deputy: Deputy;
  allDeputies: Deputy[];
  height?: number;
}

interface MetricAnalysis {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  mean: number;
  stdDev: number;
  zScore: number;
  percentile: number;
  isOutlier: boolean;
  direction: 'high' | 'low' | 'normal';
  severity: 'critical' | 'high' | 'medium' | 'low';
  explanation: string;
}

// Metrics to analyze for outlier detection
const METRICS_CONFIG = [
  {
    id: 'totalSpending',
    label: 'Gasto Total',
    getValue: (d: Deputy) => d.totalSpending,
    format: (v: number) => formatReais(v, true),
    higherIsBad: true,
    explanation: (z: number, pct: number) =>
      z > 0
        ? `Gasto ${formatPercent(pct)} maior que ${(100 - pct).toFixed(0)}% dos deputados`
        : `Gasto abaixo da média (top ${pct.toFixed(0)}%)`,
  },
  {
    id: 'avgTicket',
    label: 'Ticket Médio',
    getValue: (d: Deputy) => d.avgTicket,
    format: (v: number) => formatReais(v, true),
    higherIsBad: true,
    explanation: (z: number, pct: number) =>
      z > 0
        ? `Valor médio por transação ${formatPercent(pct)} acima do comum`
        : `Ticket médio dentro do esperado`,
  },
  {
    id: 'hhi',
    label: 'Concentração HHI',
    getValue: (d: Deputy) => d.hhi.value,
    format: (v: number) => formatNumber(v),
    higherIsBad: true,
    explanation: (z: number, _pct: number) =>
      z > 2
        ? `Alta concentração em poucos fornecedores (HHI > 2500)`
        : z > 1
          ? `Concentração moderada de fornecedores`
          : `Diversificação saudável de fornecedores`,
  },
  {
    id: 'benfordChi2',
    label: 'Desvio Benford',
    getValue: (d: Deputy) => d.benford.chi2,
    format: (v: number) => v.toFixed(1),
    higherIsBad: true,
    explanation: (z: number, _pct: number) =>
      z > 2
        ? `Distribuição de dígitos significativamente diferente do esperado`
        : `Padrão de dígitos dentro do normal`,
  },
  {
    id: 'roundValuePct',
    label: 'Valores Redondos',
    getValue: (d: Deputy) => d.roundValuePct,
    format: (v: number) => formatPercent(v),
    higherIsBad: true,
    explanation: (z: number, pct: number) =>
      z > 2
        ? `${formatPercent(pct)} de valores redondos (esperado ~10%)`
        : `Proporção de valores redondos dentro do normal`,
  },
  {
    id: 'transactionCount',
    label: 'Num. Transações',
    getValue: (d: Deputy) => d.transactionCount,
    format: (v: number) => formatNumber(v),
    higherIsBad: false, // More transactions is not necessarily bad
    explanation: (z: number, _pct: number) =>
      z > 2
        ? `Volume de transações muito acima da média`
        : z < -2
          ? `Poucas transações comparado a média`
          : `Volume de transações dentro do esperado`,
  },
  {
    id: 'supplierCount',
    label: 'Fornecedores',
    getValue: (d: Deputy) => d.supplierCount,
    format: (v: number) => formatNumber(v),
    higherIsBad: false,
    explanation: (z: number, _pct: number) =>
      z < -2
        ? `Poucos fornecedores - possível concentração`
        : `Número de fornecedores adequado`,
  },
];

function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function calculatePercentile(value: number, sortedValues: number[]): number {
  const idx = sortedValues.findIndex((v) => v >= value);
  if (idx === -1) return 100;
  return (idx / sortedValues.length) * 100;
}

function getSeverity(zScore: number, higherIsBad: boolean): 'critical' | 'high' | 'medium' | 'low' {
  const absZ = Math.abs(zScore);
  const isBad = higherIsBad ? zScore > 0 : zScore < 0;

  if (absZ > 3 && isBad) return 'critical';
  if (absZ > 2 && isBad) return 'high';
  if (absZ > 1.5 && isBad) return 'medium';
  return 'low';
}

export function OutlierExplanation({
  deputy,
  allDeputies,
  height = 400,
}: OutlierExplanationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate statistics and outlier analysis
  const analysis = useMemo((): MetricAnalysis[] => {
    const validDeputies = allDeputies.filter(
      (d) => !d.name.includes('LIDERANCA') && d.transactionCount > 10
    );

    return METRICS_CONFIG.map((config) => {
      const values = validDeputies.map(config.getValue);
      const sortedValues = [...values].sort((a, b) => a - b);
      const mean = d3.mean(values) || 0;
      const stdDev = d3.deviation(values) || 1;
      const value = config.getValue(deputy);
      const zScore = calculateZScore(value, mean, stdDev);
      const percentile = calculatePercentile(value, sortedValues);
      const absZ = Math.abs(zScore);

      return {
        id: config.id,
        label: config.label,
        value,
        formattedValue: config.format(value),
        mean,
        stdDev,
        zScore,
        percentile,
        isOutlier: absZ > 2,
        direction: zScore > 1.5 ? 'high' : zScore < -1.5 ? 'low' : 'normal',
        severity: getSeverity(zScore, config.higherIsBad),
        explanation: config.explanation(zScore, percentile),
      };
    });
  }, [deputy, allDeputies]);

  // Count outliers by severity
  const outlierCounts = useMemo(() => {
    return {
      critical: analysis.filter((a) => a.severity === 'critical').length,
      high: analysis.filter((a) => a.severity === 'high').length,
      medium: analysis.filter((a) => a.severity === 'medium').length,
      total: analysis.filter((a) => a.isOutlier).length,
    };
  }, [analysis]);

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();

    const margin = { top: 30, right: 40, bottom: 20, left: 120 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const barHeight = Math.min(40, chartHeight / analysis.length - 8);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Z-score scale (centered at 0)
    const xScale = d3
      .scaleLinear()
      .domain([-4, 4])
      .range([0, chartWidth]);

    // Y scale for metrics
    const yScale = d3
      .scaleBand()
      .domain(analysis.map((a) => a.id))
      .range([0, chartHeight])
      .padding(0.2);

    // Background reference zones
    const zones = [
      { start: -4, end: -2, label: 'Muito baixo', color: 'rgba(74, 163, 160, 0.1)' },
      { start: -2, end: -1, label: 'Baixo', color: 'rgba(74, 163, 160, 0.05)' },
      { start: -1, end: 1, label: 'Normal', color: 'rgba(160, 163, 177, 0.05)' },
      { start: 1, end: 2, label: 'Alto', color: 'rgba(229, 168, 75, 0.05)' },
      { start: 2, end: 4, label: 'Muito alto', color: 'rgba(220, 74, 74, 0.1)' },
    ];

    zones.forEach((zone) => {
      g.append('rect')
        .attr('x', xScale(zone.start))
        .attr('y', 0)
        .attr('width', xScale(zone.end) - xScale(zone.start))
        .attr('height', chartHeight)
        .attr('fill', zone.color);
    });

    // Center line (mean = 0)
    g.append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', '#A0A3B1')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // Threshold lines
    [-2, 2].forEach((z) => {
      g.append('line')
        .attr('x1', xScale(z))
        .attr('x2', xScale(z))
        .attr('y1', 0)
        .attr('y2', chartHeight)
        .attr('stroke', z > 0 ? '#DC4A4A' : '#4AA3A0')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .attr('opacity', 0.5);
    });

    // Bars for each metric
    analysis.forEach((metric) => {
      const y = yScale(metric.id) || 0;
      const clampedZ = Math.max(-4, Math.min(4, metric.zScore));
      const barX = clampedZ > 0 ? xScale(0) : xScale(clampedZ);
      const barWidth = Math.abs(xScale(clampedZ) - xScale(0));

      // Color based on severity
      const color =
        metric.severity === 'critical'
          ? '#DC4A4A'
          : metric.severity === 'high'
            ? '#E5A84B'
            : metric.severity === 'medium'
              ? '#F5C56D'
              : '#4AA3A0';

      // Bar
      g.append('rect')
        .attr('x', barX)
        .attr('y', y + (yScale.bandwidth() - barHeight) / 2)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('fill', color)
        .attr('rx', 4)
        .attr('opacity', 0.8)
        .attr('cursor', 'pointer')
        .on('mouseenter', function (event) {
          d3.select(this).attr('opacity', 1);

          tooltip
            .style('opacity', 1)
            .style('left', `${event.pageX - container.getBoundingClientRect().left + 10}px`)
            .style('top', `${event.pageY - container.getBoundingClientRect().top - 10}px`)
            .html(`
              <div class="tooltip-title">${metric.label}</div>
              <div class="tooltip-value">${metric.formattedValue}</div>
              <div style="margin-top: 8px; border-top: 1px solid #3a3b45; padding-top: 8px;">
                <div class="tooltip-label">Z-Score: ${metric.zScore.toFixed(2)}</div>
                <div class="tooltip-label">Percentil: ${metric.percentile.toFixed(0)}%</div>
              </div>
              <div style="margin-top: 8px;">
                <div class="tooltip-label" style="font-style: italic;">${metric.explanation}</div>
              </div>
            `);
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', `${event.pageX - container.getBoundingClientRect().left + 10}px`)
            .style('top', `${event.pageY - container.getBoundingClientRect().top - 10}px`);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', 0.8);
          tooltip.style('opacity', 0);
        });

      // Marker dot at exact position
      g.append('circle')
        .attr('cx', xScale(clampedZ))
        .attr('cy', y + yScale.bandwidth() / 2)
        .attr('r', 6)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      // Label (metric name)
      g.append('text')
        .attr('x', -8)
        .attr('y', y + yScale.bandwidth() / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#E8E9ED')
        .attr('font-size', '12px')
        .attr('font-weight', metric.isOutlier ? 600 : 400)
        .text(metric.label);

      // Value on the right
      g.append('text')
        .attr('x', chartWidth + 8)
        .attr('y', y + yScale.bandwidth() / 2)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .attr('fill', metric.isOutlier ? color : '#A0A3B1')
        .attr('font-size', '11px')
        .attr('font-weight', metric.isOutlier ? 600 : 400)
        .text(metric.formattedValue);
    });

    // X-axis labels
    g.append('text')
      .attr('x', xScale(-3))
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text('Abaixo');

    g.append('text')
      .attr('x', xScale(0))
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text('Média');

    g.append('text')
      .attr('x', xScale(3))
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text('Acima');
  }, [analysis, height]);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Análise de Outliers</h3>
          <p className="text-sm text-text-muted">
            Comparação com a população de {allDeputies.length} deputados
          </p>
        </div>
        <div className="flex gap-2">
          {outlierCounts.critical > 0 && (
            <span className="px-2 py-1 bg-risk-critical/20 text-risk-critical text-xs rounded">
              {outlierCounts.critical} crítico
            </span>
          )}
          {outlierCounts.high > 0 && (
            <span className="px-2 py-1 bg-risk-high/20 text-risk-high text-xs rounded">
              {outlierCounts.high} alto
            </span>
          )}
          {outlierCounts.medium > 0 && (
            <span className="px-2 py-1 bg-accent-gold/20 text-accent-gold text-xs rounded">
              {outlierCounts.medium} médio
            </span>
          )}
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <svg ref={svgRef} width="100%" height={height} className="overflow-visible" />
        <div
          ref={tooltipRef}
          className="tooltip"
          style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
        />
      </div>

      {/* Explanations for outliers */}
      {outlierCounts.total > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold text-text-secondary">
            Métricas atípicas identificadas:
          </h4>
          {analysis
            .filter((a) => a.isOutlier || a.severity !== 'low')
            .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
            .map((metric) => (
              <div
                key={metric.id}
                className={`p-3 rounded-lg border ${
                  metric.severity === 'critical'
                    ? 'bg-risk-critical/10 border-risk-critical/30'
                    : metric.severity === 'high'
                      ? 'bg-risk-high/10 border-risk-high/30'
                      : metric.severity === 'medium'
                        ? 'bg-accent-gold/10 border-accent-gold/30'
                        : 'bg-bg-secondary border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">{metric.label}</span>
                  <span
                    className={`text-sm font-mono ${
                      metric.severity === 'critical'
                        ? 'text-risk-critical'
                        : metric.severity === 'high'
                          ? 'text-risk-high'
                          : metric.severity === 'medium'
                            ? 'text-accent-gold'
                            : 'text-text-secondary'
                    }`}
                  >
                    {metric.formattedValue}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1">{metric.explanation}</p>
              </div>
            ))}
        </div>
      )}

      {outlierCounts.total === 0 && (
        <div className="mt-4 p-4 bg-accent-teal/10 border border-accent-teal/30 rounded-lg">
          <p className="text-sm text-accent-teal">
            Nenhuma métrica significativamente atípica identificada para este deputado.
          </p>
        </div>
      )}

      {/* Methodology note */}
      <div className="mt-4 p-3 bg-bg-card border border-border rounded-lg">
        <p className="text-xs text-text-muted">
          <span className="font-medium text-text-secondary">Metodologia:</span> Outliers são
          identificados usando Z-score (desvios-padrão da média). Valores com |Z| &gt; 2 são
          considerados atípicos. A cor indica severidade baseada no contexto de cada métrica.
        </p>
      </div>
    </div>
  );
}

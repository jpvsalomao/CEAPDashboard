import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { MonthlyData } from '../../types/data';
import { useThemeColors } from '../../utils/colors';
import { formatReais } from '../../utils/formatters';
import {
  enrichTemporalData,
  calculateStats,
  generateAnnotations,
  getAnnotationForMonth,
  formatPercent,
  formatMonthYear,
  TEMPORAL_CONFIG,
  type EnrichedDataPoint,
  type TemporalStats,
  type TemporalAnnotation,
} from '../../utils/temporalAnalytics';

interface SpendingTimelineProps {
  data: MonthlyData[];
  height?: number;
  showAnomalies?: boolean;
  showAnnotations?: boolean;
}

export function SpendingTimeline({
  data,
  height = 300,
  showAnomalies = true,
  showAnnotations = true,
}: SpendingTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const themeColors = useThemeColors();

  // Compute enriched data and statistics
  const { enrichedData, stats, annotations } = useMemo(() => {
    if (!data.length) {
      return {
        enrichedData: [] as EnrichedDataPoint[],
        stats: { mean: 0, stdDev: 0, min: 0, max: 0, total: 0, count: 0, median: 0 } as TemporalStats,
        annotations: [] as TemporalAnnotation[],
      };
    }
    const enriched = enrichTemporalData(data);
    const values = data.map(d => d.value);
    const computed = calculateStats(values);
    const annots = generateAnnotations(data);
    return { enrichedData: enriched, stats: computed, annotations: annots };
  }, [data]);

  useEffect(() => {
    if (!data.length || !containerRef.current || !svgRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const margin = { top: 30, right: 30, bottom: 50, left: 70 };
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const sortedData = [...enrichedData].sort((a, b) => a.month.localeCompare(b.month));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('width', containerWidth)
      .attr('height', height)
      .attr('viewBox', `0 0 ${containerWidth} ${height}`);

    const defs = svg.append('defs');

    // Main gradient
    const gradientId = 'spending-gradient';
    const gradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', themeColors.accentTeal)
      .attr('stop-opacity', 0.3);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', themeColors.accentTeal)
      .attr('stop-opacity', 0);


    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(sortedData, d => d.date) as [Date, Date])
      .range([0, width]);

    const yMax = d3.max(sortedData, d => d.value) || 0;

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.1])
      .range([chartHeight, 0]);

    // Draw grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', themeColors.bgSecondary)
      .attr('stroke-dasharray', '3,3');


    // Line and area generators
    const line = d3
      .line<EnrichedDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area<EnrichedDataPoint>()
      .x(d => xScale(d.date))
      .y0(chartHeight)
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Draw area
    g.append('path')
      .datum(sortedData)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', area);

    // Draw average line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yScale(stats.mean))
      .attr('y2', yScale(stats.mean))
      .attr('stroke', themeColors.textMuted)
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 1);

    // Average label
    g.append('text')
      .attr('x', width - 5)
      .attr('y', yScale(stats.mean) - 8)
      .attr('text-anchor', 'end')
      .attr('fill', themeColors.textMuted)
      .attr('font-size', '10px')
      .text(`Média: ${formatReais(stats.mean, true)}`);

    // Draw main line with animation
    const path = g
      .append('path')
      .datum(sortedData)
      .attr('fill', 'none')
      .attr('stroke', themeColors.accentTeal)
      .attr('stroke-width', 2.5)
      .attr('d', line);

    const pathLength = path.node()?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
      .attr('stroke-dashoffset', pathLength)
      .transition()
      .duration(1500)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Create tooltip appended to body to avoid overflow clipping
    const tooltip = d3
      .select('body')
      .selectAll('.spending-timeline-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'spending-timeline-tooltip tooltip')
      .style('opacity', 0)
      .style('z-index', 9999)
      .style('position', 'fixed')
      .style('pointer-events', 'none');

    // Draw dots with anomaly highlighting (smaller sizes)
    g.selectAll('.dot')
      .data(sortedData)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.value))
      .attr('r', d => (showAnomalies && d.isAnomaly ? 4 : 3))
      .attr('fill', d => {
        if (!showAnomalies) return themeColors.bgPrimary;
        if (d.isSpike) return TEMPORAL_CONFIG.colors.spike;
        if (d.isDrop) return TEMPORAL_CONFIG.colors.drop;
        return themeColors.bgPrimary;
      })
      .attr('stroke', d => {
        if (!showAnomalies) return themeColors.accentTeal;
        if (d.isSpike) return TEMPORAL_CONFIG.colors.spike;
        if (d.isDrop) return TEMPORAL_CONFIG.colors.drop;
        return themeColors.accentTeal;
      })
      .attr('stroke-width', d => (showAnomalies && d.isAnomaly ? 2 : 1.5))
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(200).attr('r', 6);

        const annotation = showAnnotations
          ? getAnnotationForMonth(d.month, annotations)
          : undefined;

        tooltip
          .style('opacity', 1)
          .html(buildTooltipHtml(d, stats, annotation))
          .style('left', `${event.clientX + 15}px`)
          .style('top', `${event.clientY - 10}px`);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.clientX + 15}px`)
          .style('top', `${event.clientY - 10}px`);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', showAnomalies && d.isAnomaly ? 4 : 3);
        tooltip.style('opacity', 0);
      });

    // Draw annotation markers
    if (showAnnotations) {
      const annotatedMonths = sortedData.filter(d =>
        annotations.some(a => a.month === d.month)
      );

      annotatedMonths.forEach(d => {
        const annotation = annotations.find(a => a.month === d.month);
        if (!annotation) return;

        // Small marker below the point
        g.append('line')
          .attr('x1', xScale(d.date))
          .attr('x2', xScale(d.date))
          .attr('y1', yScale(d.value) + 10)
          .attr('y2', chartHeight)
          .attr('stroke', themeColors.textMuted)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2')
          .attr('opacity', 0.4);
      });
    }

    // X Axis - responsive tick frequency based on width
    const tickInterval = containerWidth < 400 ? 6 : containerWidth < 640 ? 4 : 3;
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat(d => d3.timeFormat('%b %y')(d as Date))
      .ticks(d3.timeMonth.every(tickInterval));

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', themeColors.textMuted)
      .attr('font-size', containerWidth < 400 ? '8px' : '10px')
      .attr('transform', containerWidth < 400 ? 'rotate(-45)' : 'rotate(0)')
      .attr('text-anchor', containerWidth < 400 ? 'end' : 'middle')
      .attr('dx', containerWidth < 400 ? '-0.5em' : '0')
      .attr('dy', containerWidth < 400 ? '0.5em' : '0.71em');

    g.selectAll('.x-axis path, .x-axis line').attr('stroke', themeColors.bgSecondary);

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat(d => formatReais(d as number, true))
      .ticks(5);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', themeColors.textMuted)
      .attr('font-size', '10px');

    g.selectAll('.y-axis path, .y-axis line').attr('stroke', themeColors.bgSecondary);

    return () => {
      d3.select('body').selectAll('.spending-timeline-tooltip').remove();
    };
  }, [data, height, enrichedData, stats, annotations, showAnomalies, showAnnotations, themeColors]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (enrichedData.length === 0) return null;

    const anomalies = enrichedData.filter(d => d.isAnomaly);
    const spikes = anomalies.filter(d => d.isSpike);
    const drops = anomalies.filter(d => d.isDrop);

    // Find peak and lowest
    const sorted = [...enrichedData].sort((a, b) => b.value - a.value);
    const peak = sorted[0];
    const lowest = sorted[sorted.length - 1];

    return {
      anomalyCount: anomalies.length,
      spikeCount: spikes.length,
      dropCount: drops.length,
      peak,
      lowest,
      volatility: stats.stdDev > 0 ? (stats.stdDev / stats.mean) * 100 : 0,
    };
  }, [enrichedData, stats]);

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Sem dados disponíveis
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: Title + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Evolução Mensal
          </h3>
          <p className="text-sm text-text-muted">
            Gastos ao longo do tempo com detecção de anomalias
          </p>
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} className="chart-container relative">
        <svg ref={svgRef} />
      </div>

      {/* Summary metrics panel */}
      {summaryMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border">
          <MetricCard
            label="Pico"
            value={formatMonthYear(summaryMetrics.peak.month)}
            subvalue={formatReais(summaryMetrics.peak.value, true)}
            comparison={formatPercent(summaryMetrics.peak.percentFromMean)}
            comparisonLabel="vs média"
            color="text-accent-red"
          />
          <MetricCard
            label="Menor"
            value={formatMonthYear(summaryMetrics.lowest.month)}
            subvalue={formatReais(summaryMetrics.lowest.value, true)}
            comparison={formatPercent(summaryMetrics.lowest.percentFromMean)}
            comparisonLabel="vs média"
            color="text-accent-teal"
          />
          <MetricCard
            label="Volatilidade"
            value={`${summaryMetrics.volatility.toFixed(1)}%`}
            subvalue="desvio padrão"
            comparison={summaryMetrics.volatility > 20 ? 'Alta variação' : 'Variação normal'}
            color={summaryMetrics.volatility > 20 ? 'text-accent-red' : 'text-text-secondary'}
          />
          <MetricCard
            label="Anomalias"
            value={`${summaryMetrics.anomalyCount}`}
            subvalue={`de ${enrichedData.length} meses`}
            comparison={summaryMetrics.spikeCount > 0 ? `${summaryMetrics.spikeCount} picos` : 'Nenhum pico'}
            comparisonLabel={summaryMetrics.dropCount > 0 ? ` • ${summaryMetrics.dropCount} quedas` : ''}
            color={summaryMetrics.anomalyCount > 0 ? 'text-accent-red' : 'text-status-low'}
          />
        </div>
      )}
    </div>
  );
}

// Helper component for metric cards
function MetricCard({
  label,
  value,
  subvalue,
  comparison,
  comparisonLabel,
  color = 'text-text-primary',
}: {
  label: string;
  value: string;
  subvalue?: string;
  comparison?: string;
  comparisonLabel?: string;
  color?: string;
}) {
  return (
    <div className="p-3 bg-bg-secondary rounded-lg">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${color}`}>{value}</p>
      {subvalue && <p className="text-xs text-text-secondary">{subvalue}</p>}
      {comparison && (
        <p className="text-xs text-text-muted mt-1">
          {comparison}
          {comparisonLabel && <span>{comparisonLabel}</span>}
        </p>
      )}
    </div>
  );
}

// Build rich tooltip HTML
function buildTooltipHtml(
  point: EnrichedDataPoint,
  _stats: TemporalStats,
  annotation?: TemporalAnnotation
): string {
  const percentStr = formatPercent(point.percentFromMean);
  const percentClass = point.percentFromMean > 0 ? 'text-accent-red' : 'text-status-low';

  let anomalyBadge = '';
  if (point.isAnomaly) {
    const badgeColor = point.isSpike ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-amber/20 text-accent-amber';
    const badgeText = point.isSpike ? '⚠ Pico atípico' : '⚠ Queda atípica';
    anomalyBadge = `<div class="mt-2 px-2 py-1 rounded text-xs ${badgeColor}">${badgeText}</div>`;
  }

  let annotationHtml = '';
  if (annotation) {
    annotationHtml = `
      <div class="mt-2 pt-2 border-t border-border">
        <div class="text-xs text-text-muted">
          <span class="font-medium">${annotation.label}:</span> ${annotation.description}
        </div>
      </div>
    `;
  }

  return `
    <div class="tooltip-title">${formatMonthYear(point.month)}</div>
    <div class="space-y-1 mt-2">
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">Valor:</span>
        <span class="font-mono font-medium">${formatReais(point.value)}</span>
      </div>
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">vs Média:</span>
        <span class="font-mono ${percentClass}">${percentStr}</span>
      </div>
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">Ranking:</span>
        <span>${point.rankLabel}</span>
      </div>
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">Transações:</span>
        <span>${point.transactionCount.toLocaleString('pt-BR')}</span>
      </div>
    </div>
    ${anomalyBadge}
    ${annotationHtml}
  `;
}

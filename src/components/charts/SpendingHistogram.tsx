import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { useThemeColors } from '../../utils/colors';
import { formatReais, formatNumber } from '../../utils/formatters';
import { getStandardMargins, getResponsiveFontSizes } from '../../utils/responsive';

type MetricMode = 'spending' | 'transactions';

interface SpendingHistogramProps {
  deputies: Deputy[];
  bins?: number;
  height?: number;
}

export function SpendingHistogram({
  deputies,
  bins = 20,
  height = 350,
}: SpendingHistogramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<MetricMode>('spending');
  const themeColors = useThemeColors();

  // Compute histogram data
  const histogramData = useMemo(() => {
    if (!deputies.length) return { bins: [], median: 0, p25: 0, p75: 0, max: 0, binWidth: 0 };

    const values = deputies.map((d) =>
      mode === 'spending' ? d.totalSpending : d.transactionCount
    );
    const sorted = [...values].sort((a, b) => a - b);

    const median = d3.quantile(sorted, 0.5) || 0;
    const p25 = d3.quantile(sorted, 0.25) || 0;
    const p75 = d3.quantile(sorted, 0.75) || 0;
    const max = d3.max(values) || 0;

    // Create uniform bin thresholds to ensure all bars have equal width
    const binWidth = max / bins;
    const thresholds = d3.range(0, max + binWidth, binWidth).slice(1, bins + 1);

    // Create histogram generator with explicit thresholds
    const histogram = d3.bin<number, number>()
      .domain([0, max + binWidth * 0.01] as [number, number]) // Slightly extend to include max value
      .thresholds(thresholds);

    const binnedData = histogram(values);

    return {
      bins: binnedData,
      median,
      p25,
      p75,
      max,
      binWidth,
    };
  }, [deputies, bins, mode]);

  useEffect(() => {
    if (!deputies.length || !containerRef.current || !svgRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    // Responsive margins based on container width
    const baseMargin = getStandardMargins(containerWidth);
    // Add extra right margin for histogram to prevent last bar clipping
    const margin = { ...baseMargin, right: baseMargin.right + 10 };
    const fontSizes = getResponsiveFontSizes(containerWidth);
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', containerWidth)
      .attr('height', height)
      .attr('viewBox', `0 0 ${containerWidth} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales - use uniform bin width for consistent bar sizing
    // Domain extends slightly beyond max to ensure last bin is fully visible
    const xMax = histogramData.max + histogramData.binWidth * 0.01;
    const xScale = d3
      .scaleLinear()
      .domain([0, xMax])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(histogramData.bins, (d) => d.length) || 0])
      .range([chartHeight, 0])
      .nice();

    // Create tooltip
    const tooltip = d3
      .select(containerRef.current)
      .selectAll('.tooltip')
      .data([null])
      .join('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    // Draw bars - add small gap between bars for visual separation
    const barGap = 2;
    g.selectAll('.bar')
      .data(histogramData.bins)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.x0 ?? 0) + barGap / 2)
      .attr('width', (d) => Math.max(0, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - barGap))
      .attr('y', chartHeight)
      .attr('height', 0)
      .attr('fill', themeColors.accentTeal)
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill', themeColors.accentAmber);
        const rangeLabel = mode === 'spending'
          ? `${formatReais(d.x0 ?? 0, true)} - ${formatReais(d.x1 ?? 0, true)}`
          : `${formatNumber(d.x0 ?? 0)} - ${formatNumber(d.x1 ?? 0)}`;

        tooltip
          .style('opacity', 1)
          .html(
            `<div class="tooltip-title">${d.length} deputado${d.length !== 1 ? 's' : ''}</div>
             <div class="tooltip-label">${rangeLabel}</div>
             <div class="tooltip-value">${((d.length / deputies.length) * 100).toFixed(1)}% do total</div>`
          );

        // Position tooltip - flip to left side if near right edge
        const tooltipWidth = 150; // approximate tooltip width
        const isNearRightEdge = event.offsetX > containerWidth - tooltipWidth - 30;
        tooltip
          .style('left', isNearRightEdge ? `${event.offsetX - tooltipWidth - 10}px` : `${event.offsetX + 15}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mousemove', function (event) {
        const tooltipWidth = 150;
        const isNearRightEdge = event.offsetX > containerWidth - tooltipWidth - 30;
        tooltip
          .style('left', isNearRightEdge ? `${event.offsetX - tooltipWidth - 10}px` : `${event.offsetX + 15}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill', themeColors.accentTeal);
        tooltip.style('opacity', 0);
      })
      .transition()
      .duration(600)
      .delay((_, i) => i * 30)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => yScale(d.length))
      .attr('height', (d) => chartHeight - yScale(d.length));

    // Draw median line
    const medianX = xScale(histogramData.median);
    g.append('line')
      .attr('class', 'median-line')
      .attr('x1', medianX)
      .attr('x2', medianX)
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', themeColors.accentRed)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3')
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .delay(400)
      .attr('opacity', 1);

    // Median label - responsive and positioned to not overflow
    const medianLabel = mode === 'spending'
      ? `Mediana: ${formatReais(histogramData.median, true)}`
      : `Mediana: ${formatNumber(histogramData.median)}`;
    g.append('text')
      .attr('x', Math.min(medianX, width - 60))
      .attr('y', -8)
      .attr('text-anchor', medianX > width - 80 ? 'end' : 'middle')
      .attr('fill', themeColors.accentRed)
      .attr('font-size', `${fontSizes.axis}px`)
      .attr('font-weight', '600')
      .attr('opacity', 0)
      .text(containerWidth < 400 ? medianLabel.replace('Mediana: ', '') : medianLabel)
      .transition()
      .duration(600)
      .delay(500)
      .attr('opacity', 1);

    // Draw IQR zone (25th to 75th percentile)
    const p25X = xScale(histogramData.p25);
    const p75X = xScale(histogramData.p75);
    g.append('rect')
      .attr('x', p25X)
      .attr('y', 0)
      .attr('width', p75X - p25X)
      .attr('height', chartHeight)
      .attr('fill', themeColors.accentBlue)
      .attr('opacity', 0)
      .style('pointer-events', 'none')
      .transition()
      .duration(600)
      .delay(300)
      .attr('opacity', 0.1);

    // X-axis - responsive tick count
    const xTickCount = containerWidth < 400 ? 4 : containerWidth < 640 ? 5 : 6;
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(xTickCount)
      .tickFormat((d) =>
        mode === 'spending'
          ? formatReais(d as number, true)
          : formatNumber(d as number)
      );

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', themeColors.textSecondary)
      .attr('font-size', `${fontSizes.axis}px`);

    g.select('.x-axis')
      .selectAll('line, path')
      .attr('stroke', themeColors.textMuted);

    // X-axis label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', chartHeight + margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', themeColors.textSecondary)
      .attr('font-size', `${fontSizes.label}px`)
      .text(mode === 'spending' ? 'Gasto Total (R$)' : 'Número de Transações');

    // Y-axis
    const yAxis = d3.axisLeft(yScale).ticks(containerWidth < 400 ? 4 : 5);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', themeColors.textSecondary)
      .attr('font-size', `${fontSizes.axis}px`);

    g.select('.y-axis')
      .selectAll('line, path')
      .attr('stroke', themeColors.textMuted);

    // Y-axis label - hide on very small screens
    if (containerWidth >= 400) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -margin.left + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', themeColors.textSecondary)
        .attr('font-size', `${fontSizes.label}px`)
        .text('Deputados');
    }

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [deputies, height, histogramData, mode, themeColors]);

  if (!deputies.length) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Sem dados disponíveis
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header: Title + Toggle + Export - all in one row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Distribuição de Gastos
          </h3>
          <p className="text-sm text-text-muted">
            {deputies.length} deputados analisados
          </p>
        </div>

        {/* Controls: Toggle + Export button */}
        <div className="flex items-center gap-2">
          <div className="flex bg-bg-secondary rounded-lg p-1 gap-1">
            <button
              onClick={() => setMode('spending')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === 'spending'
                  ? 'bg-accent-teal/20 text-accent-teal font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Gastos (R$)
            </button>
            <button
              onClick={() => setMode('transactions')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === 'transactions'
                  ? 'bg-accent-teal/20 text-accent-teal font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Transações
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="chart-container relative">
        <svg ref={svgRef} />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="text-center">
          <p className="text-xs text-text-muted">Mínimo</p>
          <p className="text-sm font-semibold text-text-primary">
            {mode === 'spending'
              ? formatReais(d3.min(deputies, (d) => d.totalSpending) ?? 0, true)
              : formatNumber(d3.min(deputies, (d) => d.transactionCount) ?? 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">P25</p>
          <p className="text-sm font-semibold text-text-secondary">
            {mode === 'spending'
              ? formatReais(histogramData.p25, true)
              : formatNumber(histogramData.p25)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">P75</p>
          <p className="text-sm font-semibold text-text-secondary">
            {mode === 'spending'
              ? formatReais(histogramData.p75, true)
              : formatNumber(histogramData.p75)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">Máximo</p>
          <p className="text-sm font-semibold text-text-primary">
            {mode === 'spending'
              ? formatReais(histogramData.max, true)
              : formatNumber(histogramData.max)}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-accent-blue/30" />
          <span>Intervalo interquartil (25%-75%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-accent-red" style={{ borderTop: '2px dashed' }} />
          <span>Mediana</span>
        </div>
      </div>
    </div>
  );
}

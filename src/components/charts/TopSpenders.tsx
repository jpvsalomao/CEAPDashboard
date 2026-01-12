import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Link } from 'react-router-dom';
import type { Deputy } from '../../types/data';
import { useThemeColors, getRiskLevelColor } from '../../utils/colors';
import { formatReais, abbreviateName } from '../../utils/formatters';
import { FEATURES } from '../../config/features';
import { getHorizontalBarMargins, getResponsiveFontSizes, truncateText } from '../../utils/responsive';

type SortMode = 'spending' | 'transactions' | 'hhi';

interface TopSpendersProps {
  data: Deputy[];
  height?: number;
  maxItems?: number;
  /** Enable expandable list with pagination */
  expandable?: boolean;
  /** Initial items to show when expandable */
  initialItems?: number;
}

const PAGE_SIZES = [10, 25, 50] as const;

export function TopSpenders({
  data,
  height = 450,
  maxItems = 10,
  expandable = false,
  initialItems = 10,
}: TopSpendersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [visibleCount, setVisibleCount] = useState(expandable ? initialItems : maxItems);
  const [sortMode, setSortMode] = useState<SortMode>('spending');
  const themeColors = useThemeColors();

  // Sort data based on mode
  const sortedData = useMemo(() => {
    const sorted = [...data];
    switch (sortMode) {
      case 'spending':
        return sorted.sort((a, b) => b.totalSpending - a.totalSpending);
      case 'transactions':
        return sorted.sort((a, b) => b.transactionCount - a.transactionCount);
      case 'hhi':
        return sorted.sort((a, b) => b.hhi.value - a.hhi.value);
      default:
        return sorted;
    }
  }, [data, sortMode]);

  const chartData = useMemo(() => {
    return sortedData.slice(0, visibleCount);
  }, [sortedData, visibleCount]);

  // Calculate dynamic height based on visible items
  const dynamicHeight = useMemo(() => {
    const itemHeight = 45;
    const margins = 40;
    return Math.min(chartData.length * itemHeight + margins, height);
  }, [chartData.length, height]);

  useEffect(() => {
    if (!chartData.length || !containerRef.current || !svgRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    // Responsive margins based on container width
    const baseMargin = getHorizontalBarMargins(containerWidth);
    const margin = { ...baseMargin, right: Math.max(15, baseMargin.right - 20) };
    const fontSizes = getResponsiveFontSizes(containerWidth);
    const maxLabelWidth = margin.left - 35; // Leave room for rank
    const width = containerWidth - margin.left - margin.right;
    // Limit bar width to 70% to leave room for value labels
    const maxBarWidth = width * 0.7;
    const chartHeight = dynamicHeight - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', containerWidth)
      .attr('height', dynamicHeight)
      .attr('viewBox', `0 0 ${containerWidth} ${dynamicHeight}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Get max value based on sort mode
    const getMetricValue = (d: Deputy) => {
      switch (sortMode) {
        case 'spending':
          return d.totalSpending;
        case 'transactions':
          return d.transactionCount;
        case 'hhi':
          return d.hhi.value;
        default:
          return d.totalSpending;
      }
    };

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, getMetricValue) || 0])
      .range([0, maxBarWidth]);

    const yScale = d3
      .scaleBand<string>()
      .domain(chartData.map((d) => d.name))
      .range([0, chartHeight])
      .padding(0.25);

    // Create tooltip (appended to body for proper z-index above all elements)
    const tooltip = d3
      .select('body')
      .selectAll('.topspenders-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'topspenders-tooltip tooltip')
      .style('opacity', 0)
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('z-index', '9999');

    // Draw background bars
    g.selectAll('.bar-bg')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar-bg')
      .attr('y', (d) => yScale(d.name) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', maxBarWidth)
      .attr('fill', themeColors.bgSecondary)
      .attr('rx', 4)
      .attr('ry', 4);

    // Draw main bars
    g.selectAll('.bar')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', (d) => yScale(d.name) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', 0)
      .attr('fill', (d) => getRiskLevelColor(d.riskLevel))
      .attr('rx', 4)
      .attr('ry', 4)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.85);
        const topSupplier = d.topSuppliers[0];
        tooltip
          .style('opacity', 1)
          .html(
            `<div class="tooltip-title">${d.name}</div>
             <div class="tooltip-value">${formatReais(d.totalSpending)}</div>
             <div class="tooltip-label">
               ${d.party}-${d.uf} • ${d.transactionCount.toLocaleString('pt-BR')} transações<br/>
               HHI: ${d.hhi.value.toFixed(0)} (${d.hhi.level})<br/>
               ${topSupplier ? `Top fornecedor: ${topSupplier.pct.toFixed(1)}%` : ''}
             </div>
             ${d.redFlags.length > 0 ? `<div class="mt-2 text-accent-red text-xs">${d.redFlags.length} alerta(s)</div>` : ''}`
          )
          .style('left', `${event.clientX + 15}px`)
          .style('top', `${event.clientY - 10}px`);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.clientX + 15}px`)
          .style('top', `${event.clientY - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        tooltip.style('opacity', 0);
      })
      .transition()
      .duration(600)
      .delay((_, i) => Math.min(i * 40, 400))
      .ease(d3.easeCubicOut)
      .attr('width', (d) => xScale(getMetricValue(d)));

    // Draw rank numbers (hide on very small screens)
    if (containerWidth >= 360) {
      g.selectAll('.rank')
        .data(chartData)
        .join('text')
        .attr('class', 'rank')
        .attr('x', -margin.left + 8)
        .attr('y', (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('fill', themeColors.textMuted)
        .attr('font-size', `${fontSizes.label}px`)
        .attr('font-weight', '600')
        .text((_, i) => `#${i + 1}`);
    }

    // Draw deputy names (clickable links) - truncated based on available space
    g.selectAll('.label-name')
      .data(chartData)
      .join('text')
      .attr('class', 'label-name')
      .attr('x', -8)
      .attr('y', (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 - 6)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', themeColors.textPrimary)
      .attr('font-size', `${fontSizes.label}px`)
      .attr('font-weight', '500')
      .style('cursor', 'pointer')
      .text((d) => truncateText(abbreviateName(d.name), maxLabelWidth, fontSizes.label))
      .on('mouseenter', function () {
        d3.select(this).attr('fill', themeColors.accentTeal);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill', themeColors.textPrimary);
      });

    // Draw party-state labels
    g.selectAll('.label-party')
      .data(chartData)
      .join('text')
      .attr('class', 'label-party')
      .attr('x', -8)
      .attr('y', (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 + 8)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', themeColors.textMuted)
      .attr('font-size', `${fontSizes.axis}px`)
      .text((d) => `${d.party}-${d.uf}`);

    // Draw value labels
    const formatValue = (d: Deputy) => {
      switch (sortMode) {
        case 'spending':
          return formatReais(d.totalSpending, true);
        case 'transactions':
          return d.transactionCount.toLocaleString('pt-BR');
        case 'hhi':
          return d.hhi.value.toFixed(0);
        default:
          return formatReais(d.totalSpending, true);
      }
    };

    g.selectAll('.label-value')
      .data(chartData)
      .join('text')
      .attr('class', 'label-value')
      .attr('x', (d) => xScale(getMetricValue(d)) + 6)
      .attr('y', (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', themeColors.textPrimary)
      .attr('font-size', `${fontSizes.label}px`)
      .attr('font-weight', '600')
      .attr('font-family', 'var(--font-mono)')
      .attr('opacity', 0)
      .text(formatValue)
      .transition()
      .duration(400)
      .delay((_, i) => Math.min(i * 40, 400) + 300)
      .attr('opacity', 1);

    // Cleanup
    return () => {
      d3.select('body').selectAll('.topspenders-tooltip').remove();
    };
  }, [chartData, dynamicHeight, sortMode, themeColors]);

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Sem dados disponíveis
      </div>
    );
  }

  const hasMore = visibleCount < data.length;
  const canShowLess = visibleCount > initialItems;

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Maiores Gastos por Deputado
          </h3>
          <p className="text-sm text-text-muted">
            Exibindo {visibleCount} de {data.length} deputados
          </p>
        </div>

        {/* Sort controls + Export */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted hidden sm:inline">Ordenar:</span>
          <div className="flex bg-bg-secondary rounded-lg p-1 gap-1">
            <button
              onClick={() => setSortMode('spending')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                sortMode === 'spending'
                  ? 'bg-accent-teal/20 text-accent-teal font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => setSortMode('transactions')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                sortMode === 'transactions'
                  ? 'bg-accent-teal/20 text-accent-teal font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Transações
            </button>
            <button
              onClick={() => setSortMode('hhi')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                sortMode === 'hhi'
                  ? 'bg-accent-teal/20 text-accent-teal font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              HHI
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="chart-container relative">
        <svg ref={svgRef} />
      </div>

      {/* Risk level legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-text-muted">
        <span className="font-medium">Nível de Risco:</span>
        {(['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'] as const).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: getRiskLevelColor(level) }}
            />
            <span>{level.charAt(0) + level.slice(1).toLowerCase()}</span>
          </div>
        ))}
      </div>

      {/* Clickable deputy links (only when Deputies tab is enabled) */}
      {FEATURES.SHOW_DEPUTIES_TAB && (
        <div className="flex flex-wrap gap-2 text-xs">
          {chartData.slice(0, 5).map((deputy) => (
            <Link
              key={deputy.id}
              to={`/deputado/${deputy.id}`}
              className="text-accent-teal hover:text-accent-teal/80 hover:underline"
            >
              Ver {abbreviateName(deputy.name)} →
            </Link>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {expandable && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Exibir:</span>
            {PAGE_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setVisibleCount(size)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  visibleCount === size
                    ? 'bg-accent-teal/20 text-accent-teal font-medium'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {size}
              </button>
            ))}
            <button
              onClick={() => setVisibleCount(data.length)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                visibleCount === data.length
                  ? 'bg-accent-teal/20 text-accent-teal font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              Todos
            </button>
          </div>

          <div className="flex items-center gap-2">
            {canShowLess && (
              <button
                onClick={() => setVisibleCount(Math.max(initialItems, visibleCount - 10))}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Ver menos
              </button>
            )}
            {hasMore && (
              <button
                onClick={() => setVisibleCount(Math.min(data.length, visibleCount + 10))}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 rounded transition-colors"
              >
                Ver mais
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

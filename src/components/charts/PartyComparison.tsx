import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { formatReais, formatNumber } from '../../utils/formatters';
import { getChartColor, useThemeColors } from '../../utils/colors';
import { getHorizontalBarMargins, getResponsiveFontSizes } from '../../utils/responsive';

interface PartyDataItem {
  party: string;
  value: number;
  deputyCount: number;
  avgPerDeputy: number;
}

interface EnrichedPartyData extends PartyDataItem {
  rank: number;
  rankByAvg: number;
  percentFromAvg: number;
  percentFromAvgPerDeputy: number;
  efficiencyRank: number; // 1 = lowest avg per deputy (most "efficient")
}

type SortOption = 'total' | 'average' | 'deputies' | 'alphabetical';

interface PartyComparisonProps {
  data: PartyDataItem[];
  height?: number;
  maxItems?: number;
  metric?: 'total' | 'average';
}

export function PartyComparison({
  data,
  height = 400,
  maxItems = 15,
  metric = 'total',
}: PartyComparisonProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<SortOption>(metric === 'average' ? 'average' : 'total');
  const themeColors = useThemeColors();

  // Compute enriched data with rankings and statistics
  const { enrichedData, stats } = useMemo(() => {
    if (data.length === 0) {
      return {
        enrichedData: [] as EnrichedPartyData[],
        stats: { avgTotal: 0, avgPerDeputy: 0, totalDeputies: 0, grandTotal: 0 },
      };
    }

    // Calculate overall statistics
    const grandTotal = data.reduce((sum, d) => sum + d.value, 0);
    const totalDeputies = data.reduce((sum, d) => sum + d.deputyCount, 0);
    const avgTotal = grandTotal / data.length;
    const avgPerDeputy = grandTotal / totalDeputies;

    // Sort by value and avg for rankings
    const sortedByValue = [...data].sort((a, b) => b.value - a.value);
    const sortedByAvg = [...data].sort((a, b) => b.avgPerDeputy - a.avgPerDeputy);
    const sortedByEfficiency = [...data].sort((a, b) => a.avgPerDeputy - b.avgPerDeputy);

    const enriched: EnrichedPartyData[] = data.map(d => ({
      ...d,
      rank: sortedByValue.findIndex(x => x.party === d.party) + 1,
      rankByAvg: sortedByAvg.findIndex(x => x.party === d.party) + 1,
      percentFromAvg: avgTotal > 0 ? ((d.value - avgTotal) / avgTotal) * 100 : 0,
      percentFromAvgPerDeputy: avgPerDeputy > 0 ? ((d.avgPerDeputy - avgPerDeputy) / avgPerDeputy) * 100 : 0,
      efficiencyRank: sortedByEfficiency.findIndex(x => x.party === d.party) + 1,
    }));

    return {
      enrichedData: enriched,
      stats: { avgTotal, avgPerDeputy, totalDeputies, grandTotal },
    };
  }, [data]);

  // Sort data based on current sort option
  const sortedData = useMemo(() => {
    const sorted = [...enrichedData];
    switch (sortBy) {
      case 'total':
        sorted.sort((a, b) => b.value - a.value);
        break;
      case 'average':
        sorted.sort((a, b) => b.avgPerDeputy - a.avgPerDeputy);
        break;
      case 'deputies':
        sorted.sort((a, b) => b.deputyCount - a.deputyCount);
        break;
      case 'alphabetical':
        sorted.sort((a, b) => a.party.localeCompare(b.party));
        break;
    }
    return sorted.slice(0, maxItems);
  }, [enrichedData, sortBy, maxItems]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || sortedData.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    // Responsive margins and font sizes
    const baseMargin = getHorizontalBarMargins(width);
    const margin = {
      top: 10,
      right: width < 480 ? 50 : 100, // Reduce right margin on mobile (no deputy count badge)
      bottom: 40,
      left: baseMargin.left
    };
    const fontSizes = getResponsiveFontSizes(width);
    const isMobile = width < 480;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);

    // Clear previous
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const getValue = (d: EnrichedPartyData) => (metric === 'average' ? d.avgPerDeputy : d.value);
    const maxValue = d3.max(sortedData, getValue) || 0;

    const xScale = d3.scaleLinear().domain([0, maxValue * 1.05]).range([0, innerWidth]);

    const yScale = d3
      .scaleBand<string>()
      .domain(sortedData.map((d) => d.party))
      .range([0, innerHeight])
      .padding(0.25);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickSize(innerHeight)
          .tickFormat(() => '')
      )
      .call((sel) => sel.select('.domain').remove())
      .call((sel) => sel.selectAll('.tick line').attr('stroke', themeColors.bgSecondary).attr('stroke-opacity', 0.5));

    // Benchmark line (overall average)
    const benchmarkValue = metric === 'average' ? stats.avgPerDeputy : stats.avgTotal;
    if (benchmarkValue > 0 && xScale(benchmarkValue) <= innerWidth) {
      g.append('line')
        .attr('x1', xScale(benchmarkValue))
        .attr('x2', xScale(benchmarkValue))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', themeColors.accentRed)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.7);

      g.append('text')
        .attr('x', xScale(benchmarkValue))
        .attr('y', -4)
        .attr('text-anchor', 'middle')
        .attr('fill', themeColors.accentRed)
        .attr('font-size', '9px')
        .attr('font-weight', '500')
        .text(`Média: ${formatReais(benchmarkValue, true)}`);
    }

    // X axis - responsive tick count
    const xTickCount = isMobile ? 3 : 5;
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(xTickCount)
          .tickFormat((d) => formatReais(d as number, true))
      )
      .call((sel) => sel.select('.domain').attr('stroke', themeColors.border))
      .call((sel) => sel.selectAll('.tick line').attr('stroke', themeColors.border))
      .call((sel) => sel.selectAll('.tick text').attr('fill', themeColors.textSecondary).attr('font-size', `${fontSizes.axis}px`));

    // Y axis - responsive font size
    g.append('g')
      .call(d3.axisLeft(yScale))
      .call((sel) => sel.select('.domain').remove())
      .call((sel) => sel.selectAll('.tick line').remove())
      .call((sel) =>
        sel
          .selectAll('.tick text')
          .attr('fill', themeColors.textPrimary)
          .attr('font-size', `${fontSizes.label}px`)
          .attr('font-weight', '500')
      );

    // Bars with efficiency indicator (border color when in total view)
    const barHeight = yScale.bandwidth();

    const bars = g
      .selectAll('.bar')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.party) || 0)
      .attr('height', barHeight)
      .attr('fill', (_, i) => getChartColor(i))
      .attr('rx', 3)
      .attr('width', 0)
      .style('cursor', 'pointer');

    // Animate bars
    bars
      .transition()
      .duration(800)
      .delay((_, i) => i * 40)
      .ease(d3.easeCubicOut)
      .attr('width', (d) => xScale(getValue(d)));

    // Dual encoding: money bags showing per-deputy spending level (hide on mobile)
    if (metric === 'total' && !isMobile) {
      g.selectAll('.spending-indicator')
        .data(sortedData)
        .enter()
        .append('text')
        .attr('class', 'spending-indicator')
        .attr('x', (d) => Math.min(xScale(getValue(d)) - 6, innerWidth - 6))
        .attr('y', (d) => (yScale(d.party) || 0) + barHeight / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('opacity', 0)
        .text((d) => {
          // Money bags based on per-deputy spending rank (more bags = higher spending)
          const ratio = d.efficiencyRank / enrichedData.length;
          if (ratio <= 0.33) return '💰'; // Low spending per deputy
          if (ratio <= 0.66) return '💰💰'; // Medium
          return '💰💰💰'; // High spending per deputy
        })
        .transition()
        .duration(400)
        .delay((_, i) => 800 + i * 40)
        .attr('opacity', 1);
    }

    // Value labels
    g.selectAll('.value-label')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', (d) => xScale(getValue(d)) + 6)
      .attr('y', (d) => (yScale(d.party) || 0) + barHeight / 2)
      .attr('dy', '0.35em')
      .attr('fill', themeColors.textSecondary)
      .attr('font-size', `${fontSizes.axis}px`)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('opacity', 0)
      .text((d) => formatReais(getValue(d), true))
      .transition()
      .duration(400)
      .delay((_, i) => 800 + i * 40)
      .attr('opacity', 1);

    // Deputy count badges (hide on mobile)
    if (!isMobile) {
      g.selectAll('.deputy-badge')
        .data(sortedData)
        .enter()
        .append('text')
        .attr('class', 'deputy-badge')
        .attr('x', innerWidth + 50)
        .attr('y', (d) => (yScale(d.party) || 0) + barHeight / 2)
        .attr('dy', '0.35em')
        .attr('fill', themeColors.textMuted)
        .attr('font-size', '9px')
        .attr('text-anchor', 'middle')
        .text((d) => `${d.deputyCount} dep.`);
    }

    // Create tooltip element (appended to body for proper z-index)
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip';
    tooltipEl.style.opacity = '0';
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.zIndex = '9999';
    document.body.appendChild(tooltipEl);

    // Tooltip interactions
    bars
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.8);

        const percentStr = (val: number) => {
          const sign = val > 0 ? '+' : '';
          return `${sign}${val.toFixed(1)}%`;
        };

        const percentClass = d.percentFromAvg > 0 ? 'text-accent-red' : 'text-status-low';
        const percentAvgClass = d.percentFromAvgPerDeputy > 0 ? 'text-accent-red' : 'text-status-low';

        tooltipEl.innerHTML = `
          <div class="tooltip-title">${d.party}</div>
          <div class="space-y-1 mt-2">
            <div class="flex justify-between gap-4">
              <span class="text-text-muted">Total:</span>
              <span class="font-mono font-medium">${formatReais(d.value)}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-text-muted">vs Média:</span>
              <span class="font-mono ${percentClass}">${percentStr(d.percentFromAvg)}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-text-muted">Ranking:</span>
              <span>${d.rank}º de ${enrichedData.length}</span>
            </div>
          </div>
          <div class="mt-2 pt-2 border-t border-border space-y-1">
            <div class="flex justify-between gap-4">
              <span class="text-text-muted">Deputados:</span>
              <span>${formatNumber(d.deputyCount)}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-text-muted">Média/dep:</span>
              <span class="font-mono">${formatReais(d.avgPerDeputy, true)}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-text-muted">vs Média geral:</span>
              <span class="font-mono ${percentAvgClass}">${percentStr(d.percentFromAvgPerDeputy)}</span>
            </div>
          </div>
        `;
        tooltipEl.style.opacity = '1';
        tooltipEl.style.left = `${event.clientX + 15}px`;
        tooltipEl.style.top = `${event.clientY - 10}px`;
      })
      .on('mousemove', function (event) {
        tooltipEl.style.left = `${event.clientX + 15}px`;
        tooltipEl.style.top = `${event.clientY - 10}px`;
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        tooltipEl.style.opacity = '0';
      });

    // Cleanup tooltip on unmount
    return () => {
      document.body.removeChild(tooltipEl);
    };
  }, [sortedData, height, metric, stats, enrichedData.length, themeColors]);

  // Update sort when metric prop changes (only react to metric changes, not sortBy)
  useEffect(() => {
    // When metric changes, update sort to match the new metric
    // This allows users to manually override with other sort options
    setSortBy(metric === 'average' ? 'average' : 'total');
  }, [metric]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Sem dados disponíveis
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header: Title + Controls + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Distribuição por Partido
          </h3>
          <p className="text-sm text-text-muted">
            {enrichedData.length} partidos · {formatReais(enrichedData.reduce((sum, d) => sum + d.value, 0), true)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted hidden sm:inline">Ordenar:</span>
          <div className="flex bg-bg-secondary rounded-lg p-0.5 gap-0.5">
            {[
              { value: 'total' as SortOption, label: 'Total' },
              { value: 'average' as SortOption, label: 'Média' },
              { value: 'deputies' as SortOption, label: 'Dep.' },
              { value: 'alphabetical' as SortOption, label: 'A-Z' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  sortBy === opt.value
                    ? 'bg-accent-teal/20 text-accent-teal font-medium'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" ref={containerRef} style={{ maxWidth: '95%' }}>
        <svg ref={svgRef} className="w-full" />
      </div>

      {/* Legend for spending indicators (only in total view, hidden on mobile) */}
      {metric === 'total' && (
        <div className="hidden sm:flex items-center gap-4 text-xs text-text-muted pt-1">
          <span className="font-medium">Média/deputado:</span>
          <div className="flex items-center gap-1.5">
            <span>💰</span>
            <span>Baixa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>💰💰</span>
            <span>Média</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>💰💰💰</span>
            <span>Alta</span>
          </div>
        </div>
      )}
    </div>
  );
}

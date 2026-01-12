import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { Deputy, MonthlyData } from '../../types/data';
import { formatReais } from '../../utils/formatters';
import { colors } from '../../utils/colors';

interface TemporalAnalysisIndividualProps {
  deputy: Deputy;
  aggregatedMonthly: MonthlyData[];
  height?: number;
}

type ViewMode = 'line' | 'heatmap' | 'both';

interface HeatmapMonthData {
  month: number;
  monthStr: string;
  value: number;
  avgValue: number;
  transactionCount: number;
  hasData: boolean;
}

const monthNames = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function TemporalAnalysisIndividual({
  deputy,
  aggregatedMonthly,
  height = 350,
}: TemporalAnalysisIndividualProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const heatmapRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('both');

  // Process and merge data
  const { chartData, insights } = useMemo(() => {
    if (!deputy.byMonth?.length) {
      return { chartData: [], insights: null };
    }

    // Create map of overall monthly values
    const overallByMonth: Record<string, { value: number; count: number }> = {};
    aggregatedMonthly.forEach((m) => {
      overallByMonth[m.month] = { value: m.value, count: m.transactionCount };
    });

    // Calculate average monthly spending across all deputies
    const totalDeputies = 847; // From meta
    const avgMonthlyByMonth: Record<string, number> = {};
    Object.entries(overallByMonth).forEach(([month, data]) => {
      avgMonthlyByMonth[month] = data.value / totalDeputies;
    });

    // Merge deputy data with averages
    const chartData = deputy.byMonth.map((dm) => ({
      month: dm.month,
      deputyValue: dm.value,
      avgValue: avgMonthlyByMonth[dm.month] || 0,
      transactionCount: dm.transactionCount,
      year: dm.month.split('-')[0],
      monthNum: parseInt(dm.month.split('-')[1]) - 1,
    }));

    // Calculate insights
    const totalSpending = chartData.reduce((sum, d) => sum + d.deputyValue, 0);
    const avgMonthly = totalSpending / chartData.length;
    const maxMonth = chartData.reduce((max, d) => d.deputyValue > max.deputyValue ? d : max, chartData[0]);
    const minMonth = chartData.reduce((min, d) => d.deputyValue < min.deputyValue ? d : min, chartData[0]);

    // Volatility (standard deviation)
    const variance = chartData.reduce((sum, d) => sum + Math.pow(d.deputyValue - avgMonthly, 2), 0) / chartData.length;
    const stdDev = Math.sqrt(variance);
    const volatilityPct = (stdDev / avgMonthly) * 100;

    // Trend (simple linear regression slope)
    const n = chartData.length;
    const sumX = chartData.reduce((sum, _, i) => sum + i, 0);
    const sumY = chartData.reduce((sum, d) => sum + d.deputyValue, 0);
    const sumXY = chartData.reduce((sum, d, i) => sum + i * d.deputyValue, 0);
    const sumX2 = chartData.reduce((sum, _, i) => sum + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trendDirection = slope > 1000 ? 'crescente' : slope < -1000 ? 'decrescente' : 'estavel';

    // Prepare heatmap data (organized by year and month)
    const years = [...new Set(chartData.map(d => d.year))].sort();
    const heatmapData = years.map(year => ({
      year,
      months: Array.from({ length: 12 }, (_, i) => {
        const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
        const data = chartData.find(d => d.month === monthStr);
        return {
          month: i,
          monthStr,
          value: data?.deputyValue || 0,
          avgValue: data?.avgValue || 0,
          transactionCount: data?.transactionCount || 0,
          hasData: !!data,
        };
      }),
    }));

    return {
      chartData,
      heatmapData,
      insights: {
        avgMonthly,
        maxMonth,
        minMonth,
        volatilityPct,
        trendDirection,
        totalMonths: chartData.length,
        maxValue: maxMonth.deputyValue,
        minValue: minMonth.deputyValue,
      },
    };
  }, [deputy.byMonth, aggregatedMonthly]);

  useEffect(() => {
    if (!chartData.length || !svgRef.current || !containerRef.current || !tooltipRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const margin = { top: 20, right: 30, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scalePoint<string>()
      .domain(chartData.map((d) => d.month))
      .range([0, innerWidth])
      .padding(0.5);

    const maxValue = Math.max(
      d3.max(chartData, (d) => d.deputyValue) || 0,
      d3.max(chartData, (d) => d.avgValue) || 0
    );

    const yScale = d3.scaleLinear().domain([0, maxValue * 1.1]).range([innerHeight, 0]).nice();

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').attr('stroke', '#2a2b35').attr('stroke-opacity', 0.5));

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale).tickFormat((d) => {
          const [year, month] = d.split('-');
          return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
        })
      )
      .call((g) => g.select('.domain').attr('stroke', '#3a3b45'))
      .call((g) => g.selectAll('.tick line').attr('stroke', '#3a3b45'))
      .call((g) =>
        g
          .selectAll('.tick text')
          .attr('fill', '#A0A3B1')
          .attr('font-size', '9px')
          .attr('transform', 'rotate(-45)')
          .attr('text-anchor', 'end')
      );

    // Y axis
    g.append('g')
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat((d) => formatReais(d as number, true))
      )
      .call((g) => g.select('.domain').attr('stroke', '#3a3b45'))
      .call((g) => g.selectAll('.tick line').attr('stroke', '#3a3b45'))
      .call((g) => g.selectAll('.tick text').attr('fill', '#A0A3B1').attr('font-size', '11px'));

    // Average line (dashed)
    const avgLine = d3.line<typeof chartData[0]>()
      .x((d) => xScale(d.month) || 0)
      .y((d) => yScale(d.avgValue))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', colors.textMuted)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4')
      .attr('d', avgLine);

    // Deputy line
    const deputyLine = d3.line<typeof chartData[0]>()
      .x((d) => xScale(d.month) || 0)
      .y((d) => yScale(d.deputyValue))
      .curve(d3.curveMonotoneX);

    const path = g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', colors.accentTeal)
      .attr('stroke-width', 2.5)
      .attr('d', deputyLine);

    // Animate line
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1500)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0);

    // Area under deputy line
    const area = d3.area<typeof chartData[0]>()
      .x((d) => xScale(d.month) || 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.deputyValue))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', colors.accentTeal)
      .attr('fill-opacity', 0.1)
      .attr('d', area);

    // Data points
    const points = g.selectAll('.point')
      .data(chartData)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', (d) => xScale(d.month) || 0)
      .attr('cy', (d) => yScale(d.deputyValue))
      .attr('r', 0)
      .attr('fill', colors.accentTeal)
      .attr('stroke', colors.bgPrimary)
      .attr('stroke-width', 2);

    points.transition()
      .delay(1500)
      .duration(300)
      .attr('r', 4);

    // Tooltip interactions
    points
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('r', 7);

        const diff = d.deputyValue - d.avgValue;
        const diffPct = d.avgValue > 0 ? (diff / d.avgValue) * 100 : 0;

        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`).html(`
            <div class="tooltip-title">${monthNames[d.monthNum]} ${d.year}</div>
            <div class="space-y-1 mt-2">
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">${deputy.name.split(' ')[0]}:</span>
                <span class="font-mono">${formatReais(d.deputyValue, true)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Média geral:</span>
                <span class="font-mono">${formatReais(d.avgValue, true)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Diferença:</span>
                <span class="font-mono ${diffPct > 20 ? 'text-accent-amber' : diffPct < -20 ? 'text-accent-teal' : ''}">${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Transações:</span>
                <span>${d.transactionCount}</span>
              </div>
            </div>
          `);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('r', 4);
        tooltip.style('opacity', 0);
      });

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${margin.left + 10}, ${margin.top})`);

    legend.append('line')
      .attr('x1', 0)
      .attr('x2', 20)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', colors.accentTeal)
      .attr('stroke-width', 2.5);

    legend.append('text')
      .attr('x', 25)
      .attr('y', 4)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text(deputy.name.split(' ')[0]);

    legend.append('line')
      .attr('x1', 100)
      .attr('x2', 120)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', colors.textMuted)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4');

    legend.append('text')
      .attr('x', 125)
      .attr('y', 4)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text('Média Geral');

  }, [chartData, height, deputy.name, viewMode]);

  // Heatmap effect
  const { heatmapData } = useMemo(() => {
    if (!deputy.byMonth?.length) {
      return { heatmapData: [] };
    }

    const years = [...new Set(deputy.byMonth.map(d => d.month.split('-')[0]))].sort();
    return {
      heatmapData: years.map(year => ({
        year,
        months: Array.from({ length: 12 }, (_, i) => {
          const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
          const data = deputy.byMonth?.find(d => d.month === monthStr);
          const avgData = aggregatedMonthly.find(d => d.month === monthStr);
          return {
            month: i,
            monthStr,
            value: data?.value || 0,
            avgValue: avgData ? avgData.value / 847 : 0,
            transactionCount: data?.transactionCount || 0,
            hasData: !!data,
          };
        }),
      })),
    };
  }, [deputy.byMonth, aggregatedMonthly]);

  useEffect(() => {
    if (!heatmapData.length || !heatmapRef.current || !heatmapContainerRef.current || !tooltipRef.current) return;
    if (viewMode === 'line') return;

    const container = heatmapContainerRef.current;
    const width = container.clientWidth;
    const cellSize = Math.min(40, (width - 60) / 12);
    const heatmapHeight = heatmapData.length * (cellSize + 4) + 40;

    const svg = d3.select(heatmapRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', heatmapHeight);

    const margin = { top: 25, right: 20, bottom: 10, left: 50 };
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Find max value for color scale
    const allValues = heatmapData.flatMap(y => y.months.filter(m => m.hasData).map(m => m.value));
    const maxValue = d3.max(allValues) || 1;

    // Color scale
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, maxValue]);

    // Month labels
    g.selectAll('.month-label')
      .data(monthNames)
      .enter()
      .append('text')
      .attr('class', 'month-label')
      .attr('x', (_, i) => i * (cellSize + 2) + cellSize / 2)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '9px')
      .text(d => d);

    // Year rows
    heatmapData.forEach((yearData, yi) => {
      const rowG = g.append('g')
        .attr('transform', `translate(0, ${yi * (cellSize + 4)})`);

      // Year label
      rowG.append('text')
        .attr('x', -8)
        .attr('y', cellSize / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#A0A3B1')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .text(yearData.year);

      // Month cells
      rowG.selectAll('.cell')
        .data(yearData.months)
        .enter()
        .append('rect')
        .attr('class', 'cell')
        .attr('x', d => d.month * (cellSize + 2))
        .attr('y', 0)
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('rx', 3)
        .attr('fill', d => d.hasData ? colorScale(d.value) : '#1a1b23')
        .attr('stroke', d => d.hasData ? 'none' : '#2a2b35')
        .attr('stroke-width', 1)
        .style('cursor', d => d.hasData ? 'pointer' : 'default')
        .style('opacity', 0)
        .transition()
        .delay((_, i) => i * 30 + yi * 100)
        .duration(300)
        .style('opacity', 1);

      // Add interactions separately (after transition)
      rowG.selectAll<SVGRectElement, HeatmapMonthData>('.cell')
        .on('mouseenter', function(event: MouseEvent, d: HeatmapMonthData) {
          if (!d.hasData) return;

          d3.select(this)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

          const diff = d.value - d.avgValue;
          const diffPct = d.avgValue > 0 ? (diff / d.avgValue) * 100 : 0;

          tooltip
            .style('opacity', 1)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .html(`
              <div class="tooltip-title">${monthNames[d.month]} ${yearData.year}</div>
              <div class="space-y-1 mt-2">
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">Gasto:</span>
                  <span class="font-mono font-semibold">${formatReais(d.value, true)}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">Média geral:</span>
                  <span class="font-mono">${formatReais(d.avgValue, true)}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">vs Média:</span>
                  <span class="font-mono ${diffPct > 20 ? 'text-accent-amber' : diffPct < -20 ? 'text-accent-teal' : ''}">${diffPct > 0 ? '+' : ''}${diffPct.toFixed(0)}%</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">Transações:</span>
                  <span>${d.transactionCount}</span>
                </div>
              </div>
            `);
        })
        .on('mousemove', function(event: MouseEvent) {
          tooltip
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`);
        })
        .on('mouseleave', function(_event: MouseEvent, d: HeatmapMonthData) {
          if (!d.hasData) return;
          d3.select(this)
            .attr('stroke', 'none')
            .attr('stroke-width', 0);
          tooltip.style('opacity', 0);
        });
    });

    // Legend
    const legendWidth = 120;
    const legendHeight = 10;
    const legendG = svg.append('g')
      .attr('transform', `translate(${width - legendWidth - margin.right}, ${margin.top - 20})`);

    const legendScale = d3.scaleLinear().domain([0, maxValue]).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(3).tickFormat(d => formatReais(d as number, true));

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', colorScale(0));
    gradient.append('stop').attr('offset', '50%').attr('stop-color', colorScale(maxValue / 2));
    gradient.append('stop').attr('offset', '100%').attr('stop-color', colorScale(maxValue));

    legendG.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#heatmap-gradient)')
      .attr('rx', 2);

    legendG.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').remove())
      .call(g => g.selectAll('.tick text').attr('fill', '#A0A3B1').attr('font-size', '8px'));

  }, [heatmapData, viewMode, aggregatedMonthly]);

  if (!deputy.byMonth?.length) {
    return (
      <div className="p-4 text-center text-text-muted">
        Dados temporais não disponíveis para este deputado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Evolução Temporal de Gastos
          </h3>
          <p className="text-sm text-text-muted">
            Gastos mensais de {deputy.name} comparados à média geral
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
          <button
            onClick={() => setViewMode('line')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'line'
                ? 'bg-accent-teal text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Linha
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'heatmap'
                ? 'bg-accent-teal text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Heatmap
          </button>
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'both'
                ? 'bg-accent-teal text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Ambos
          </button>
        </div>
      </div>

      {/* Insights */}
      {insights && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-bg-secondary rounded-lg">
            <p className="text-xs text-text-muted uppercase tracking-wide">Média Mensal</p>
            <p className="text-lg font-semibold text-accent-teal mt-1 font-mono">
              {formatReais(insights.avgMonthly, true)}
            </p>
          </div>
          <div className="p-3 bg-bg-secondary rounded-lg">
            <p className="text-xs text-text-muted uppercase tracking-wide">Pico</p>
            <p className="text-lg font-semibold text-accent-amber mt-1 font-mono">
              {formatReais(insights.maxMonth.deputyValue, true)}
            </p>
            <p className="text-xs text-text-secondary">
              {monthNames[insights.maxMonth.monthNum]}/{insights.maxMonth.year}
            </p>
          </div>
          <div className="p-3 bg-bg-secondary rounded-lg">
            <p className="text-xs text-text-muted uppercase tracking-wide">Mínimo</p>
            <p className="text-lg font-semibold text-text-primary mt-1 font-mono">
              {formatReais(insights.minMonth.deputyValue, true)}
            </p>
            <p className="text-xs text-text-secondary">
              {monthNames[insights.minMonth.monthNum]}/{insights.minMonth.year}
            </p>
          </div>
          <div className="p-3 bg-bg-secondary rounded-lg">
            <p className="text-xs text-text-muted uppercase tracking-wide">Tendência</p>
            <p className={`text-lg font-semibold mt-1 ${
              insights.trendDirection === 'crescente' ? 'text-accent-amber' :
              insights.trendDirection === 'decrescente' ? 'text-accent-teal' : 'text-text-primary'
            }`}>
              {insights.trendDirection === 'crescente' ? '↑' :
               insights.trendDirection === 'decrescente' ? '↓' : '→'} {insights.trendDirection}
            </p>
            <p className="text-xs text-text-secondary">
              Volatilidade: {insights.volatilityPct.toFixed(0)}%
            </p>
          </div>
        </div>
      )}

      {/* Line Chart */}
      {(viewMode === 'line' || viewMode === 'both') && (
        <div ref={containerRef} className="relative">
          <svg ref={svgRef} className="w-full" />
        </div>
      )}

      {/* Calendar Heatmap */}
      {(viewMode === 'heatmap' || viewMode === 'both') && (
        <div className="space-y-2">
          {viewMode === 'both' && (
            <h4 className="text-sm font-medium text-text-secondary">
              Calendário de Gastos
            </h4>
          )}
          <div ref={heatmapContainerRef} className="relative">
            <svg ref={heatmapRef} className="w-full" />
          </div>
          <p className="text-xs text-text-muted">
            Cores mais intensas indicam meses com maiores gastos. Células escuras indicam meses sem dados.
          </p>
        </div>
      )}

      {/* Shared Tooltip */}
      <div ref={tooltipRef} className="tooltip" style={{ opacity: 0 }} />

      <p className="text-xs text-text-muted text-center">
        {insights?.totalMonths} meses analisados
        {viewMode !== 'heatmap' && '. Linha tracejada representa a média de todos os deputados'}.
      </p>
    </div>
  );
}

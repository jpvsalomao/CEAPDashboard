import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { formatReais } from '../../utils/formatters';
import {
  calculateStats,
  formatPercent,
  TEMPORAL_CONFIG,
} from '../../utils/temporalAnalytics';
import { getStandardMargins, getResponsiveFontSizes } from '../../utils/responsive';

interface MonthlyDataItem {
  month: string;
  value: number;
  transactionCount: number;
}

interface TemporalAnalysisProps {
  data: MonthlyDataItem[];
  height?: number;
  initialView?: 'yearly' | 'monthly';
}

const monthNames = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const yearColors: Record<string, string> = {
  '2023': '#4AA3A0',  // Teal
  '2024': '#E5A84B',  // Amber
  '2025': '#DC4A4A',  // Red
};

// Processed data point with statistical context
interface EnrichedYearDataPoint {
  month: number;
  value: number;
  count: number;
  // Statistical context
  percentFromMonthlyAvg: number;  // vs average for this calendar month
  rank: number;                    // rank within same calendar month across years
  isAnomaly: boolean;
  isSpike: boolean;
  isDrop: boolean;
}

export function TemporalAnalysis({
  data,
  height = 400,
  initialView = 'yearly',
}: TemporalAnalysisProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'yearly' | 'monthly'>(initialView);

  // Process data by year and month with enrichment
  const { processedData, monthlyAverages } = useMemo(() => {
    const byYear: Record<string, EnrichedYearDataPoint[]> = {};
    const yearTotals: Record<string, number> = {};

    // First pass: collect raw data
    data.forEach((d) => {
      const [year, monthStr] = d.month.split('-');
      const month = parseInt(monthStr) - 1;

      if (!byYear[year]) {
        byYear[year] = [];
        yearTotals[year] = 0;
      }

      byYear[year].push({
        month,
        value: d.value,
        count: d.transactionCount,
        percentFromMonthlyAvg: 0,
        rank: 0,
        isAnomaly: false,
        isSpike: false,
        isDrop: false,
      });
      yearTotals[year] += d.value;
    });

    // Sort each year's data by month
    Object.values(byYear).forEach((arr) => arr.sort((a, b) => a.month - b.month));

    // Calculate monthly averages (average for each calendar month across all years)
    const monthlyAvgs: Record<number, { mean: number; stdDev: number; values: number[] }> = {};
    for (let m = 0; m < 12; m++) {
      const values: number[] = [];
      Object.values(byYear).forEach(yearData => {
        const found = yearData.find(d => d.month === m);
        if (found) values.push(found.value);
      });
      if (values.length > 0) {
        const stats = calculateStats(values);
        monthlyAvgs[m] = { mean: stats.mean, stdDev: stats.stdDev, values };
      }
    }

    // Second pass: enrich with statistical context
    const years = Object.keys(byYear).sort();
    years.forEach(year => {
      byYear[year].forEach(d => {
        const monthStats = monthlyAvgs[d.month];
        if (monthStats && monthStats.mean > 0) {
          d.percentFromMonthlyAvg = ((d.value - monthStats.mean) / monthStats.mean) * 100;

          // Calculate deviation in standard deviations
          const deviation = monthStats.stdDev > 0
            ? (d.value - monthStats.mean) / monthStats.stdDev
            : 0;

          d.isSpike = deviation >= TEMPORAL_CONFIG.anomaly.spike;
          d.isDrop = deviation <= TEMPORAL_CONFIG.anomaly.drop;
          d.isAnomaly = d.isSpike || d.isDrop;

          // Calculate rank for this month across years
          const sortedValues = [...monthStats.values].sort((a, b) => b - a);
          d.rank = sortedValues.indexOf(d.value) + 1;
        }
      });
    });

    return {
      processedData: { byYear, yearTotals },
      monthlyAverages: monthlyAvgs,
    };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    // Responsive margins - reduce right margin on mobile (legend moves below chart)
    const baseMargin = getStandardMargins(width);
    const isMobile = width < 480;
    const margin = {
      top: baseMargin.top,
      right: isMobile ? 15 : 100, // No legend on right side on mobile
      bottom: baseMargin.bottom,
      left: baseMargin.left
    };
    const fontSizes = getResponsiveFontSizes(width);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const { byYear } = processedData;
    const years = Object.keys(byYear).sort();

    if (view === 'yearly') {
      const allValues = Object.values(byYear).flatMap((arr) => arr.map((d) => d.value));
      const maxValue = d3.max(allValues) || 0;

      const xScale = d3.scaleLinear().domain([0, 11]).range([0, innerWidth]);
      const yScale = d3.scaleLinear().domain([0, maxValue * 1.1]).range([innerHeight, 0]);

      // X axis (months) - responsive tick count
      const xTickCount = isMobile ? 6 : 12;
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3.axisBottom(xScale)
            .ticks(xTickCount)
            .tickFormat((d) => monthNames[d as number] || '')
        )
        .call((g) => g.select('.domain').attr('stroke', '#3a3b45'))
        .call((g) => g.selectAll('.tick line').attr('stroke', '#3a3b45'))
        .call((g) => g.selectAll('.tick text').attr('fill', '#A0A3B1').attr('font-size', `${fontSizes.axis}px`));

      // Y axis - responsive tick count
      const yTickCount = isMobile ? 4 : 5;
      g.append('g')
        .call(
          d3.axisLeft(yScale)
            .ticks(yTickCount)
            .tickFormat((d) => formatReais(d as number, true))
        )
        .call((g) => g.select('.domain').attr('stroke', '#3a3b45'))
        .call((g) => g.selectAll('.tick line').attr('stroke', '#3a3b45'))
        .call((g) => g.selectAll('.tick text').attr('fill', '#A0A3B1').attr('font-size', `${fontSizes.axis}px`));

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

      // Line generator
      const line = d3.line<EnrichedYearDataPoint>()
        .x((d) => xScale(d.month))
        .y((d) => yScale(d.value))
        .curve(d3.curveMonotoneX);

      // Draw lines for each year
      years.forEach((year) => {
        const yearData = byYear[year];
        const color = yearColors[year] || '#6B7280';

        const path = g.append('path')
          .datum(yearData)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2.5)
          .attr('d', line);

        const totalLength = path.node()?.getTotalLength() || 0;
        path
          .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(1500)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0);

        // Data points with anomaly highlighting
        const points = g.selectAll(`.point-${year}`)
          .data(yearData)
          .enter()
          .append('circle')
          .attr('class', `point-${year}`)
          .attr('cx', (d) => xScale(d.month))
          .attr('cy', (d) => yScale(d.value))
          .attr('r', 0)
          .attr('fill', (d) => {
            if (d.isSpike) return TEMPORAL_CONFIG.colors.spike;
            if (d.isDrop) return TEMPORAL_CONFIG.colors.drop;
            return color;
          })
          .attr('stroke', '#0D0D0F')
          .attr('stroke-width', 2);

        points.transition()
          .delay(1500)
          .duration(300)
          .attr('r', (d) => d.isAnomaly ? 7 : 5);

        // Enhanced tooltip
        points
          .on('mouseenter', function (event, d) {
            d3.select(this).attr('r', 10);

            const monthAvg = monthlyAverages[d.month];
            const yearsInMonth = monthAvg?.values.length || 1;

            tooltip
              .style('opacity', 1)
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`)
              .html(buildYearlyTooltip(d, year, monthAvg, yearsInMonth));
          })
          .on('mouseleave', function (_, d) {
            d3.select(this).attr('r', d.isAnomaly ? 7 : 5);
            tooltip.style('opacity', 0);
          });
      });

      // Legend (hide on mobile - shown in React component below)
      if (!isMobile) {
        const legend = svg.append('g')
          .attr('transform', `translate(${width - margin.right + 15}, ${margin.top})`);

        years.forEach((year, i) => {
          const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);

          legendRow.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 5)
            .attr('y2', 5)
            .attr('stroke', yearColors[year] || '#6B7280')
            .attr('stroke-width', 2.5);

          legendRow.append('circle')
            .attr('cx', 10)
            .attr('cy', 5)
            .attr('r', 4)
            .attr('fill', yearColors[year] || '#6B7280');

          legendRow.append('text')
            .attr('x', 28)
            .attr('y', 9)
            .attr('fill', '#FAFAFA')
            .attr('font-size', '12px')
            .text(year);
        });
      }
    } else {
      // Monthly view: grouped bar chart
      const groupedData: { month: number; values: { year: string; value: number; percentFromAvg: number }[] }[] = [];

      for (let m = 0; m < 12; m++) {
        const monthData: { year: string; value: number; percentFromAvg: number }[] = [];
        years.forEach((year) => {
          const found = byYear[year].find((d) => d.month === m);
          if (found) {
            monthData.push({
              year,
              value: found.value,
              percentFromAvg: found.percentFromMonthlyAvg,
            });
          }
        });
        if (monthData.length > 0) {
          groupedData.push({ month: m, values: monthData });
        }
      }

      const allValues = groupedData.flatMap((g) => g.values.map((v) => v.value));
      const maxValue = d3.max(allValues) || 0;

      const x0Scale = d3.scaleBand()
        .domain(groupedData.map((d) => d.month.toString()))
        .range([0, innerWidth])
        .paddingInner(0.2)
        .paddingOuter(0.1);

      const x1Scale = d3.scaleBand()
        .domain(years)
        .range([0, x0Scale.bandwidth()])
        .padding(0.1);

      const yScale = d3.scaleLinear().domain([0, maxValue * 1.1]).range([innerHeight, 0]);

      // X axis - responsive font size
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3.axisBottom(x0Scale).tickFormat((d) => isMobile ? monthNames[parseInt(d)]?.charAt(0) : monthNames[parseInt(d)] || '')
        )
        .call((g) => g.select('.domain').attr('stroke', '#3a3b45'))
        .call((g) => g.selectAll('.tick line').attr('stroke', '#3a3b45'))
        .call((g) => g.selectAll('.tick text').attr('fill', '#A0A3B1').attr('font-size', `${fontSizes.axis}px`));

      // Y axis - responsive
      const yBarTickCount = isMobile ? 4 : 5;
      g.append('g')
        .call(
          d3.axisLeft(yScale)
            .ticks(yBarTickCount)
            .tickFormat((d) => formatReais(d as number, true))
        )
        .call((g) => g.select('.domain').attr('stroke', '#3a3b45'))
        .call((g) => g.selectAll('.tick line').attr('stroke', '#3a3b45'))
        .call((g) => g.selectAll('.tick text').attr('fill', '#A0A3B1').attr('font-size', `${fontSizes.axis}px`));

      // Grid lines
      g.append('g')
        .call(
          d3.axisLeft(yScale)
            .ticks(5)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .call((g) => g.select('.domain').remove())
        .call((g) => g.selectAll('.tick line').attr('stroke', '#2a2b35').attr('stroke-opacity', 0.5));

      // Bars
      const monthGroups = g.selectAll('.month-group')
        .data(groupedData)
        .enter()
        .append('g')
        .attr('class', 'month-group')
        .attr('transform', (d) => `translate(${x0Scale(d.month.toString())},0)`);

      monthGroups.selectAll('rect')
        .data((d) => d.values.map((v) => ({ ...v, month: d.month })))
        .enter()
        .append('rect')
        .attr('x', (d) => x1Scale(d.year) || 0)
        .attr('width', x1Scale.bandwidth())
        .attr('y', innerHeight)
        .attr('height', 0)
        .attr('fill', (d) => yearColors[d.year] || '#6B7280')
        .attr('rx', 2)
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('opacity', 0.8);
          const monthAvg = monthlyAverages[d.month];
          tooltip
            .style('opacity', 1)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .html(buildBarTooltip(d, monthAvg));
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', 1);
          tooltip.style('opacity', 0);
        })
        .transition()
        .duration(800)
        .delay((_, i) => i * 50)
        .attr('y', (d) => yScale(d.value))
        .attr('height', (d) => innerHeight - yScale(d.value));

      // Legend (hide on mobile - shown in React component below)
      if (!isMobile) {
        const legend = svg.append('g')
          .attr('transform', `translate(${width - margin.right + 15}, ${margin.top})`);

        years.forEach((year, i) => {
          const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);

          legendRow.append('rect')
            .attr('width', 16)
            .attr('height', 12)
            .attr('rx', 2)
            .attr('fill', yearColors[year] || '#6B7280');

          legendRow.append('text')
            .attr('x', 24)
            .attr('y', 10)
            .attr('fill', '#FAFAFA')
            .attr('font-size', '12px')
            .text(year);
        });
      }
    }

    // X axis label
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '11px')
      .text('Mês');
  }, [data, height, view, processedData, monthlyAverages]);

  // Calculate enhanced insights
  const insights = useMemo(() => {
    const { byYear, yearTotals } = processedData;
    const years = Object.keys(byYear).sort();

    // Find peak and lowest
    let peakMonth = { month: 0, year: '', value: 0, percentFromAvg: 0 };
    let lowestMonth = { month: 0, year: '', value: Infinity, percentFromAvg: 0 };

    years.forEach((year) => {
      byYear[year].forEach((d) => {
        if (d.value > peakMonth.value) {
          peakMonth = { month: d.month, year, value: d.value, percentFromAvg: d.percentFromMonthlyAvg };
        }
        if (d.value < lowestMonth.value) {
          lowestMonth = { month: d.month, year, value: d.value, percentFromAvg: d.percentFromMonthlyAvg };
        }
      });
    });

    // YoY growth - compute dynamically based on available years
    let yoyGrowth: { from: string; to: string; percent: number } | null = null;
    if (years.length >= 2) {
      const latestYear = years[years.length - 1];
      const previousYear = years[years.length - 2];
      if (yearTotals[previousYear] && yearTotals[latestYear]) {
        yoyGrowth = {
          from: previousYear,
          to: latestYear,
          percent: ((yearTotals[latestYear] - yearTotals[previousYear]) / yearTotals[previousYear]) * 100,
        };
      }
    }

    // Count anomalies
    let anomalyCount = 0;
    years.forEach(year => {
      byYear[year].forEach(d => {
        if (d.isAnomaly) anomalyCount++;
      });
    });

    return {
      peakMonth,
      lowestMonth,
      yoyGrowth,
      yearTotals,
      anomalyCount,
      totalMonths: data.length,
    };
  }, [processedData, data.length]);

  // Extract years for mobile legend
  const availableYears = useMemo(() => {
    return Object.keys(processedData.byYear).sort();
  }, [processedData]);

  return (
    <div className="space-y-4">
      {/* Header: Title + Controls + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Comparativo Anual
          </h3>
          <p className="text-sm text-text-muted">
            Gastos por ano com análise de sazonalidade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-bg-secondary rounded-lg p-1 gap-1">
            <button
              onClick={() => setView('yearly')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                view === 'yearly'
                  ? 'bg-accent-teal/20 text-accent-teal font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Linhas
            </button>
            <button
              onClick={() => setView('monthly')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                view === 'monthly'
                  ? 'bg-accent-teal/20 text-accent-teal font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Barras
            </button>
          </div>
        </div>
      </div>

      <div className="relative" ref={containerRef}>
        <svg ref={svgRef} className="w-full" />
        <div ref={tooltipRef} className="tooltip" style={{ opacity: 0, zIndex: 50, position: 'absolute', pointerEvents: 'none' }} />
      </div>

      {/* Mobile legend - shown only on small screens */}
      <div className="flex sm:hidden items-center justify-center gap-4 text-xs">
        {availableYears.map((year) => (
          <div key={year} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: yearColors[year] || '#6B7280' }}
            />
            <span className="text-text-primary">{year}</span>
          </div>
        ))}
      </div>

      {/* Insights Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="p-3 bg-bg-secondary rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wide">Pico de Gastos</p>
          <p className="text-lg font-semibold text-accent-amber mt-1">
            {monthNames[insights.peakMonth.month]} {insights.peakMonth.year}
          </p>
          <p className="text-xs text-text-secondary">
            {formatReais(insights.peakMonth.value, true)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {formatPercent(insights.peakMonth.percentFromAvg)} vs média do mês
          </p>
        </div>

        <div className="p-3 bg-bg-secondary rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wide">Menor Gasto</p>
          <p className="text-lg font-semibold text-accent-teal mt-1">
            {monthNames[insights.lowestMonth.month]} {insights.lowestMonth.year}
          </p>
          <p className="text-xs text-text-secondary">
            {formatReais(insights.lowestMonth.value, true)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {formatPercent(insights.lowestMonth.percentFromAvg)} vs média do mês
          </p>
        </div>

        {insights.yoyGrowth !== null && (
          <div className="p-3 bg-bg-secondary rounded-lg">
            <p className="text-xs text-text-muted uppercase tracking-wide">
              Variação {insights.yoyGrowth.from}→{insights.yoyGrowth.to}
            </p>
            <p className={`text-lg font-semibold mt-1 ${
              insights.yoyGrowth.percent > 0 ? 'text-accent-red' : 'text-status-low'
            }`}>
              {insights.yoyGrowth.percent > 0 ? '+' : ''}{insights.yoyGrowth.percent.toFixed(1)}%
            </p>
            <p className="text-xs text-text-secondary">
              {insights.yoyGrowth.percent > 0 ? 'Aumento' : 'Redução'} nos gastos
            </p>
            {insights.anomalyCount > 0 && (
              <p className="text-xs text-accent-amber mt-1">
                {insights.anomalyCount} meses atípicos
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Build enhanced tooltip for yearly view
function buildYearlyTooltip(
  d: EnrichedYearDataPoint,
  year: string,
  monthAvg: { mean: number; stdDev: number; values: number[] } | undefined,
  yearsInMonth: number
): string {
  const percentStr = formatPercent(d.percentFromMonthlyAvg);
  const percentClass = d.percentFromMonthlyAvg > 0 ? 'text-accent-red' : 'text-status-low';

  let anomalyBadge = '';
  if (d.isAnomaly) {
    const badgeColor = d.isSpike ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-amber/20 text-accent-amber';
    const badgeText = d.isSpike ? '⚠ Pico atípico' : '⚠ Queda atípica';
    anomalyBadge = `<div class="mt-2 px-2 py-1 rounded text-xs ${badgeColor}">${badgeText}</div>`;
  }

  const rankLabel = yearsInMonth > 1 ? `${d.rank}º de ${yearsInMonth} anos` : '—';

  return `
    <div class="tooltip-title">${monthNames[d.month]} ${year}</div>
    <div class="space-y-1 mt-2">
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">Valor:</span>
        <span class="font-mono font-medium">${formatReais(d.value, true)}</span>
      </div>
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">vs Média do Mês:</span>
        <span class="font-mono ${percentClass}">${percentStr}</span>
      </div>
      ${monthAvg ? `
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">Média Histórica:</span>
        <span class="font-mono">${formatReais(monthAvg.mean, true)}</span>
      </div>
      ` : ''}
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">Ranking:</span>
        <span>${rankLabel}</span>
      </div>
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">Transações:</span>
        <span>${d.count.toLocaleString('pt-BR')}</span>
      </div>
    </div>
    ${anomalyBadge}
  `;
}

// Build tooltip for bar chart
function buildBarTooltip(
  d: { month: number; year: string; value: number; percentFromAvg: number },
  monthAvg: { mean: number; stdDev: number; values: number[] } | undefined
): string {
  const percentStr = formatPercent(d.percentFromAvg);
  const percentClass = d.percentFromAvg > 0 ? 'text-accent-red' : 'text-status-low';

  return `
    <div class="tooltip-title">${monthNames[d.month]} ${d.year}</div>
    <div class="space-y-1 mt-2">
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">Valor:</span>
        <span class="font-mono font-medium">${formatReais(d.value, true)}</span>
      </div>
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">vs Média do Mês:</span>
        <span class="font-mono ${percentClass}">${percentStr}</span>
      </div>
      ${monthAvg ? `
      <div class="flex justify-between gap-4">
        <span class="text-text-muted">Média Histórica:</span>
        <span class="font-mono">${formatReais(monthAvg.mean, true)}</span>
      </div>
      ` : ''}
    </div>
  `;
}

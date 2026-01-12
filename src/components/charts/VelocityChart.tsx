import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy, MonthlyData } from '../../types/data';
import { formatReais } from '../../utils/formatters';
import { colors } from '../../utils/colors';

interface VelocityChartProps {
  deputy: Deputy;
  aggregatedMonthly: MonthlyData[];
  allDeputies: Deputy[];
  height?: number;
}

const monthNames = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function VelocityChart({
  deputy,
  aggregatedMonthly,
  allDeputies,
  height = 300,
}: VelocityChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate velocity metrics and cumulative data
  const { cumulativeData, velocityMetrics, avgCumulativeData } = useMemo(() => {
    if (!deputy.byMonth?.length) {
      return { cumulativeData: [], velocityMetrics: null, avgCumulativeData: [] };
    }

    // Sort by month
    const sortedMonths = [...deputy.byMonth].sort((a, b) => a.month.localeCompare(b.month));

    // Calculate cumulative spending for deputy
    let cumulative = 0;
    const cumulativeData = sortedMonths.map(m => {
      cumulative += m.value;
      return {
        month: m.month,
        value: m.value,
        cumulative,
        transactionCount: m.transactionCount,
      };
    });

    // Calculate average cumulative (average deputy per month)
    const totalDeputies = allDeputies.filter(d => d.transactionCount > 10).length || 847;
    const sortedAggregated = [...aggregatedMonthly].sort((a, b) => a.month.localeCompare(b.month));

    let avgCumulative = 0;
    const avgCumulativeData = sortedAggregated.map(m => {
      const avgMonthly = m.value / totalDeputies;
      avgCumulative += avgMonthly;
      return {
        month: m.month,
        value: avgMonthly,
        cumulative: avgCumulative,
      };
    });

    // Calculate velocity metrics
    const totalMonths = sortedMonths.length;
    const monthlyAvg = deputy.totalSpending / totalMonths;
    const txPerMonth = deputy.transactionCount / totalMonths;

    // Calculate spending acceleration (slope of cumulative)
    const n = cumulativeData.length;
    if (n < 2) {
      return { cumulativeData, velocityMetrics: null, avgCumulativeData };
    }

    // Linear regression for velocity trend
    const xValues = cumulativeData.map((_, i) => i);
    const yValues = cumulativeData.map(d => d.value);
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Velocity trend: positive = accelerating, negative = decelerating
    const velocityTrend = slope > monthlyAvg * 0.05 ? 'acelerando' :
      slope < -monthlyAvg * 0.05 ? 'desacelerando' : 'estavel';

    // Compare to average velocity
    const avgMonthlyAll = aggregatedMonthly.reduce((sum, m) => sum + m.value, 0) / totalDeputies / aggregatedMonthly.length;
    const velocityRatio = monthlyAvg / avgMonthlyAll;

    // Peak month velocity
    const peakMonth = sortedMonths.reduce((max, m) => m.value > max.value ? m : max, sortedMonths[0]);
    const lowestMonth = sortedMonths.reduce((min, m) => m.value < min.value ? m : min, sortedMonths[0]);

    const velocityMetrics = {
      monthlyAvg,
      txPerMonth,
      velocityTrend,
      velocityRatio,
      slope,
      peakMonth,
      lowestMonth,
      totalMonths,
    };

    return { cumulativeData, velocityMetrics, avgCumulativeData };
  }, [deputy, aggregatedMonthly, allDeputies]);

  useEffect(() => {
    if (!cumulativeData.length || !svgRef.current || !containerRef.current || !tooltipRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scalePoint<string>()
      .domain(cumulativeData.map(d => d.month))
      .range([0, innerWidth])
      .padding(0.5);

    const maxCumulative = Math.max(
      d3.max(cumulativeData, d => d.cumulative) || 0,
      d3.max(avgCumulativeData, d => d.cumulative) || 0
    );

    const yScale = d3.scaleLinear()
      .domain([0, maxCumulative * 1.1])
      .range([innerHeight, 0])
      .nice();

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', '#2a2b35').attr('stroke-opacity', 0.5));

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale).tickFormat(d => {
          const [year, month] = d.split('-');
          return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
        })
      )
      .call(g => g.select('.domain').attr('stroke', '#3a3b45'))
      .call(g => g.selectAll('.tick line').attr('stroke', '#3a3b45'))
      .call(g => g.selectAll('.tick text')
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
          .tickFormat(d => formatReais(d as number, true))
      )
      .call(g => g.select('.domain').attr('stroke', '#3a3b45'))
      .call(g => g.selectAll('.tick line').attr('stroke', '#3a3b45'))
      .call(g => g.selectAll('.tick text').attr('fill', '#A0A3B1').attr('font-size', '11px'));

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -60)
      .attr('x', -innerHeight / 2)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle')
      .text('Gasto Acumulado');

    // Average cumulative area (behind)
    const avgArea = d3.area<typeof avgCumulativeData[0]>()
      .x(d => xScale(d.month) || 0)
      .y0(innerHeight)
      .y1(d => yScale(d.cumulative))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(avgCumulativeData)
      .attr('fill', colors.textMuted)
      .attr('fill-opacity', 0.1)
      .attr('d', avgArea);

    // Average cumulative line
    const avgLine = d3.line<typeof avgCumulativeData[0]>()
      .x(d => xScale(d.month) || 0)
      .y(d => yScale(d.cumulative))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(avgCumulativeData)
      .attr('fill', 'none')
      .attr('stroke', colors.textMuted)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4')
      .attr('d', avgLine);

    // Deputy cumulative area
    const deputyArea = d3.area<typeof cumulativeData[0]>()
      .x(d => xScale(d.month) || 0)
      .y0(innerHeight)
      .y1(d => yScale(d.cumulative))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(cumulativeData)
      .attr('fill', colors.accentTeal)
      .attr('fill-opacity', 0.15)
      .attr('d', deputyArea);

    // Deputy cumulative line
    const deputyLine = d3.line<typeof cumulativeData[0]>()
      .x(d => xScale(d.month) || 0)
      .y(d => yScale(d.cumulative))
      .curve(d3.curveMonotoneX);

    const path = g.append('path')
      .datum(cumulativeData)
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

    // Data points with tooltips
    cumulativeData.forEach((d, i) => {
      const x = xScale(d.month) || 0;
      const y = yScale(d.cumulative);

      const circle = g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 0)
        .attr('fill', colors.accentTeal)
        .attr('stroke', colors.bgPrimary)
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');

      circle
        .transition()
        .delay(1500 + i * 50)
        .duration(200)
        .attr('r', 4);

      const [year, month] = d.month.split('-');
      const avgCumulative = avgCumulativeData[i]?.cumulative || 0;
      const diff = d.cumulative - avgCumulative;
      const diffPct = avgCumulative > 0 ? (diff / avgCumulative) * 100 : 0;

      circle
        .on('mouseenter', function(event: MouseEvent) {
          d3.select(this).attr('r', 7);

          tooltip
            .style('opacity', 1)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .html(`
              <div class="tooltip-title">${monthNames[parseInt(month) - 1]} ${year}</div>
              <div class="space-y-1 mt-2">
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">Gasto no mês:</span>
                  <span class="font-mono">${formatReais(d.value, true)}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">Acumulado:</span>
                  <span class="font-mono font-semibold">${formatReais(d.cumulative, true)}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">Média acumulada:</span>
                  <span class="font-mono">${formatReais(avgCumulative, true)}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-text-muted">vs Média:</span>
                  <span class="font-mono ${diffPct > 20 ? 'text-accent-amber' : diffPct < -20 ? 'text-accent-teal' : ''}">${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%</span>
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
        .on('mouseleave', function() {
          d3.select(this).attr('r', 4);
          tooltip.style('opacity', 0);
        });
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
      .attr('x1', 120)
      .attr('x2', 140)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', colors.textMuted)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4');

    legend.append('text')
      .attr('x', 145)
      .attr('y', 4)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text('Média');

  }, [cumulativeData, avgCumulativeData, height, deputy.name]);

  if (!deputy.byMonth?.length) {
    return (
      <div className="p-4 text-center text-text-muted">
        Dados de velocidade não disponíveis para este deputado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">
          Velocidade de Gastos
        </h3>
        <p className="text-sm text-text-muted">
          Acumulado mensal de gastos comparado à média geral
        </p>
      </div>

      {/* Velocity Metrics */}
      {velocityMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-bg-secondary rounded-lg">
            <p className="text-xs text-text-muted uppercase tracking-wide">Média Mensal</p>
            <p className="text-lg font-semibold text-accent-teal mt-1 font-mono">
              {formatReais(velocityMetrics.monthlyAvg, true)}
            </p>
          </div>
          <div className="p-3 bg-bg-secondary rounded-lg">
            <p className="text-xs text-text-muted uppercase tracking-wide">Transações/Mês</p>
            <p className="text-lg font-semibold text-text-primary mt-1 font-mono">
              {velocityMetrics.txPerMonth.toFixed(1)}
            </p>
          </div>
          <div className="p-3 bg-bg-secondary rounded-lg">
            <p className="text-xs text-text-muted uppercase tracking-wide">vs Média Geral</p>
            <p className={`text-lg font-semibold mt-1 font-mono ${
              velocityMetrics.velocityRatio > 1.2 ? 'text-accent-amber' :
              velocityMetrics.velocityRatio < 0.8 ? 'text-accent-teal' : 'text-text-primary'
            }`}>
              {velocityMetrics.velocityRatio.toFixed(2)}x
            </p>
          </div>
          <div className="p-3 bg-bg-secondary rounded-lg">
            <p className="text-xs text-text-muted uppercase tracking-wide">Tendência</p>
            <p className={`text-lg font-semibold mt-1 ${
              velocityMetrics.velocityTrend === 'acelerando' ? 'text-accent-amber' :
              velocityMetrics.velocityTrend === 'desacelerando' ? 'text-accent-teal' : 'text-text-primary'
            }`}>
              {velocityMetrics.velocityTrend === 'acelerando' ? '↑' :
               velocityMetrics.velocityTrend === 'desacelerando' ? '↓' : '→'} {velocityMetrics.velocityTrend}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div ref={containerRef} className="relative">
        <svg ref={svgRef} className="w-full" />
        <div ref={tooltipRef} className="tooltip" style={{ opacity: 0 }} />
      </div>

      {/* Peak/Low info */}
      {velocityMetrics && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Pico:</span>
            <span className="font-mono text-accent-amber">
              {formatReais(velocityMetrics.peakMonth.value, true)}
            </span>
            <span className="text-text-secondary">
              ({monthNames[parseInt(velocityMetrics.peakMonth.month.split('-')[1]) - 1]}/{velocityMetrics.peakMonth.month.split('-')[0].slice(2)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Minimo:</span>
            <span className="font-mono text-text-primary">
              {formatReais(velocityMetrics.lowestMonth.value, true)}
            </span>
            <span className="text-text-secondary">
              ({monthNames[parseInt(velocityMetrics.lowestMonth.month.split('-')[1]) - 1]}/{velocityMetrics.lowestMonth.month.split('-')[0].slice(2)})
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-text-muted">
        O gráfico mostra o acumulado de gastos ao longo do tempo. A área sombreada representa
        a diferença em relação à média de todos os deputados.
      </p>
    </div>
  );
}

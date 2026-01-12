import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { formatNumber } from '../../utils/formatters';

interface DeputyData {
  name: string;
  party: string;
  uf: string;
  roundValuePct: number;
  transactionCount: number;
  totalSpending: number;
}

interface RoundNumberChartProps {
  data: DeputyData[];
  height?: number;
  threshold?: number;
}

// Expected natural round number percentage (based on statistical analysis)
const NATURAL_ROUND_PCT = 10;
const SUSPICIOUS_THRESHOLD = 30;

export function RoundNumberChart({
  data,
  height = 450,
  threshold = SUSPICIOUS_THRESHOLD,
}: RoundNumberChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Filter and sort data - only show deputies with high round value percentages
  const chartData = useMemo(() => {
    return data
      .filter((d) => d.roundValuePct > 0 && d.name && !d.name.startsWith('LIDERANÇA'))
      .sort((a, b) => b.roundValuePct - a.roundValuePct)
      .slice(0, 20);
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    const allValues = data.filter((d) => d.roundValuePct > 0 && !d.name.startsWith('LIDERANÇA'));
    const avg = allValues.reduce((sum, d) => sum + d.roundValuePct, 0) / allValues.length;
    const suspicious = allValues.filter((d) => d.roundValuePct > threshold).length;
    const veryHigh = allValues.filter((d) => d.roundValuePct > 50).length;
    return { avg, suspicious, veryHigh, total: allValues.length };
  }, [data, threshold]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || chartData.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const margin = { top: 20, right: 80, bottom: 40, left: 180 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);

    const yScale = d3
      .scaleBand<string>()
      .domain(chartData.map((d) => d.name))
      .range([0, innerHeight])
      .padding(0.25);

    // Color scale based on round value percentage
    const colorScale = (pct: number) => {
      if (pct > 50) return '#DC4A4A'; // Critical red
      if (pct > threshold) return '#E5A84B'; // Warning amber
      if (pct > NATURAL_ROUND_PCT) return '#4A7C9B'; // Elevated blue
      return '#4AA3A0'; // Normal teal
    };

    // Background zones
    const zones = [
      { x: 0, width: xScale(NATURAL_ROUND_PCT), color: 'rgba(46, 204, 113, 0.1)', label: 'Normal' },
      { x: xScale(NATURAL_ROUND_PCT), width: xScale(threshold) - xScale(NATURAL_ROUND_PCT), color: 'rgba(74, 124, 155, 0.1)', label: 'Elevado' },
      { x: xScale(threshold), width: xScale(50) - xScale(threshold), color: 'rgba(229, 168, 75, 0.15)', label: 'Suspeito' },
      { x: xScale(50), width: innerWidth - xScale(50), color: 'rgba(220, 74, 74, 0.15)', label: 'Crítico' },
    ];

    zones.forEach((zone) => {
      g.append('rect')
        .attr('x', zone.x)
        .attr('y', 0)
        .attr('width', zone.width)
        .attr('height', innerHeight)
        .attr('fill', zone.color);
    });

    // Threshold lines
    [NATURAL_ROUND_PCT, threshold, 50].forEach((val, idx) => {
      const colors = ['#2ECC71', '#E5A84B', '#DC4A4A'];
      g.append('line')
        .attr('x1', xScale(val))
        .attr('x2', xScale(val))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', colors[idx])
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.7);
    });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(10)
          .tickFormat((d) => `${d}%`)
      )
      .call((g) => g.select('.domain').attr('stroke', '#3a3b45'))
      .call((g) => g.selectAll('.tick line').attr('stroke', '#3a3b45'))
      .call((g) => g.selectAll('.tick text').attr('fill', '#A0A3B1').attr('font-size', '11px'));

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').remove())
      .call((g) =>
        g
          .selectAll('.tick text')
          .attr('fill', '#FAFAFA')
          .attr('font-size', '11px')
          .text((d) => {
            const name = d as string;
            return name.length > 22 ? name.substring(0, 20) + '...' : name;
          })
      );

    // Bars
    const bars = g
      .selectAll('.bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.name) || 0)
      .attr('height', yScale.bandwidth())
      .attr('fill', (d) => colorScale(d.roundValuePct))
      .attr('rx', 3)
      .attr('width', 0);

    // Animate bars
    bars
      .transition()
      .duration(800)
      .delay((_, i) => i * 40)
      .ease(d3.easeCubicOut)
      .attr('width', (d) => xScale(d.roundValuePct));

    // Value labels
    g.selectAll('.value-label')
      .data(chartData)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', (d) => xScale(d.roundValuePct) + 8)
      .attr('y', (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('opacity', 0)
      .text((d) => `${d.roundValuePct.toFixed(1)}%`)
      .transition()
      .duration(400)
      .delay((_, i) => 800 + i * 40)
      .attr('opacity', 1);

    // Party/UF badges
    g.selectAll('.party-badge')
      .data(chartData)
      .enter()
      .append('text')
      .attr('class', 'party-badge')
      .attr('x', -5)
      .attr('y', (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#6B7280')
      .attr('font-size', '9px')
      .text((d) => `${d.party}-${d.uf}`);

    // Tooltip interactions
    bars
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.8);

        const riskLevel =
          d.roundValuePct > 50
            ? 'CRÍTICO'
            : d.roundValuePct > threshold
            ? 'SUSPEITO'
            : d.roundValuePct > NATURAL_ROUND_PCT
            ? 'ELEVADO'
            : 'NORMAL';

        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`).html(`
            <div class="tooltip-title">${d.name}</div>
            <div class="text-xs text-text-muted">${d.party}-${d.uf}</div>
            <div class="space-y-1 mt-2">
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Valores redondos:</span>
                <span class="font-mono font-semibold" style="color: ${colorScale(d.roundValuePct)}">${d.roundValuePct.toFixed(1)}%</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Transações:</span>
                <span>${formatNumber(d.transactionCount)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Status:</span>
                <span style="color: ${colorScale(d.roundValuePct)}">${riskLevel}</span>
              </div>
            </div>
          `);
      })
      .on('mousemove', function (event) {
        tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        tooltip.style('opacity', 0);
      });

    // X axis label
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '11px')
      .text('Porcentagem de valores redondos (divisíveis por 100)');
  }, [chartData, height, threshold]);

  return (
    <div className="space-y-4">
      <div className="relative" ref={containerRef}>
        <svg ref={svgRef} className="w-full" />
        <div ref={tooltipRef} className="tooltip" style={{ opacity: 0 }} />
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
        <div className="p-3 bg-bg-secondary rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wide">Média Geral</p>
          <p className="text-lg font-semibold text-text-primary mt-1">
            {stats.avg.toFixed(1)}%
          </p>
          <p className="text-xs text-text-secondary">
            Esperado: ~{NATURAL_ROUND_PCT}%
          </p>
        </div>

        <div className="p-3 bg-bg-secondary rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wide">Acima de {threshold}%</p>
          <p className="text-lg font-semibold text-accent-amber mt-1">
            {stats.suspicious}
          </p>
          <p className="text-xs text-text-secondary">
            deputados suspeitos
          </p>
        </div>

        <div className="p-3 bg-bg-secondary rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wide">Acima de 50%</p>
          <p className="text-lg font-semibold text-accent-red mt-1">
            {stats.veryHigh}
          </p>
          <p className="text-xs text-text-secondary">
            casos críticos
          </p>
        </div>

        <div className="p-3 bg-bg-secondary rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wide">Total Analisado</p>
          <p className="text-lg font-semibold text-text-primary mt-1">
            {stats.total}
          </p>
          <p className="text-xs text-text-secondary">
            deputados com dados
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#4AA3A0' }} />
          <span className="text-text-secondary">Normal (&lt;{NATURAL_ROUND_PCT}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#4A7C9B' }} />
          <span className="text-text-secondary">Elevado ({NATURAL_ROUND_PCT}-{threshold}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#E5A84B' }} />
          <span className="text-text-secondary">Suspeito ({threshold}-50%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#DC4A4A' }} />
          <span className="text-text-secondary">Crítico (&gt;50%)</span>
        </div>
      </div>
    </div>
  );
}

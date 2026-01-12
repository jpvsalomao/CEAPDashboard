import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais } from '../../utils/formatters';

interface EndOfMonthPatternProps {
  deputies: Deputy[];
  height?: number;
  maxItems?: number;
}

interface MonthEndData {
  deputy: Deputy;
  lastWeekPct: number; // % of monthly spending in last 7 days
  lastDayPct: number; // % on last day of month
  monthEndSpikes: number; // Count of months with >50% in last week
  avgTicketLastWeek: number;
  avgTicketRest: number;
  anomalyScore: number;
}

// Simulate end-of-month spending patterns (in real app, would come from backend)
function calculateMonthEndMetrics(deputy: Deputy): MonthEndData {
  // Use deputy characteristics to simulate realistic patterns
  const seed = deputy.id + deputy.totalSpending;
  const random = (n: number) => ((seed * n) % 100) / 100;

  // Expected last week % is around 25% (7/28 days = 25%)
  // Some deputies might rush spending at month end
  const baseLastWeekPct = 25;
  const noise = (random(1) - 0.3) * 40; // Can push up to ~55%
  const lastWeekPct = Math.max(5, Math.min(70, baseLastWeekPct + noise));

  // Last day typically 3-4% (1/28), but can spike
  const basLastDayPct = 3.5;
  const dayNoise = (random(2) - 0.4) * 15;
  const lastDayPct = Math.max(0, Math.min(30, basLastDayPct + dayNoise));

  // Count of months with significant spikes (simulated)
  const monthEndSpikes = Math.floor(random(3) * 12);

  // Average ticket comparison
  const avgTicket = deputy.totalSpending / deputy.transactionCount;
  const ticketMultiplier = 1 + (random(4) - 0.4) * 0.5; // 0.8x to 1.3x
  const avgTicketLastWeek = avgTicket * ticketMultiplier;
  const avgTicketRest = avgTicket * (1 / ticketMultiplier);

  // Anomaly score: how much above expected last week %
  const anomalyScore = Math.max(0, lastWeekPct - 25) + Math.max(0, lastDayPct - 3.5) * 2;

  return {
    deputy,
    lastWeekPct,
    lastDayPct,
    monthEndSpikes,
    avgTicketLastWeek,
    avgTicketRest,
    anomalyScore,
  };
}

export function EndOfMonthPattern({ deputies, height = 500, maxItems = 20 }: EndOfMonthPatternProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<'anomaly' | 'lastWeek' | 'lastDay'>('anomaly');
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: MonthEndData | null;
  }>({ visible: false, x: 0, y: 0, content: null });

  // Calculate month-end metrics for all deputies
  const monthEndData = deputies
    .filter(d => !d.name.includes('LIDERANÇA') && d.transactionCount > 50)
    .map(d => calculateMonthEndMetrics(d));

  // Sort based on selected metric
  const sortedData = [...monthEndData]
    .sort((a, b) => {
      if (sortBy === 'anomaly') return b.anomalyScore - a.anomalyScore;
      if (sortBy === 'lastWeek') return b.lastWeekPct - a.lastWeekPct;
      return b.lastDayPct - a.lastDayPct;
    })
    .slice(0, maxItems);

  useEffect(() => {
    if (!containerRef.current || sortedData.length === 0) return;

    d3.select(containerRef.current).selectAll('*').remove();

    const margin = { top: 40, right: 80, bottom: 30, left: 150 };
    const width = containerRef.current.clientWidth;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3
      .select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Y scale for deputy names
    const yScale = d3
      .scaleBand()
      .domain(sortedData.map(d => d.deputy.name))
      .range([0, innerHeight])
      .padding(0.2);

    // X scale based on sort metric
    let maxVal: number;
    let xLabel: string;
    let getValue: (d: MonthEndData) => number;

    if (sortBy === 'lastDay') {
      maxVal = Math.max(...sortedData.map(d => d.lastDayPct), 15);
      xLabel = '% Gasto no Último Dia';
      getValue = d => d.lastDayPct;
    } else {
      maxVal = Math.max(...sortedData.map(d => d.lastWeekPct), 50);
      xLabel = '% Gasto na Última Semana';
      getValue = d => d.lastWeekPct;
    }

    const xScale = d3.scaleLinear().domain([0, maxVal]).range([0, innerWidth]).nice();

    // Reference lines for expected values
    if (sortBy === 'lastDay') {
      // Expected ~3.5% on last day
      g.append('line')
        .attr('x1', xScale(3.5))
        .attr('x2', xScale(3.5))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#4AA3A0')
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.6);

      g.append('text')
        .attr('x', xScale(3.5))
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#4AA3A0')
        .attr('font-size', '10px')
        .text('Esperado (3.5%)');

      if (maxVal > 10) {
        g.append('line')
          .attr('x1', xScale(10))
          .attr('x2', xScale(10))
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', '#DC4A4A')
          .attr('stroke-dasharray', '4,4')
          .attr('opacity', 0.6);

        g.append('text')
          .attr('x', xScale(10))
          .attr('y', -8)
          .attr('text-anchor', 'middle')
          .attr('fill', '#DC4A4A')
          .attr('font-size', '10px')
          .text('Critico (10%)');
      }
    } else {
      // Expected ~25% in last week
      g.append('line')
        .attr('x1', xScale(25))
        .attr('x2', xScale(25))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#4AA3A0')
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.6);

      g.append('text')
        .attr('x', xScale(25))
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#4AA3A0')
        .attr('font-size', '10px')
        .text('Esperado (25%)');

      if (maxVal > 40) {
        g.append('line')
          .attr('x1', xScale(40))
          .attr('x2', xScale(40))
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', '#E5A84B')
          .attr('stroke-dasharray', '4,4')
          .attr('opacity', 0.6);

        g.append('text')
          .attr('x', xScale(40))
          .attr('y', -8)
          .attr('text-anchor', 'middle')
          .attr('fill', '#E5A84B')
          .attr('font-size', '10px')
          .text('Alerta (40%)');
      }

      if (maxVal > 50) {
        g.append('line')
          .attr('x1', xScale(50))
          .attr('x2', xScale(50))
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', '#DC4A4A')
          .attr('stroke-dasharray', '4,4')
          .attr('opacity', 0.6);

        g.append('text')
          .attr('x', xScale(50))
          .attr('y', -8)
          .attr('text-anchor', 'middle')
          .attr('fill', '#DC4A4A')
          .attr('font-size', '10px')
          .text('Critico (50%)');
      }
    }

    // Draw bars
    g.selectAll('rect.bar')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.deputy.name) ?? 0)
      .attr('height', yScale.bandwidth())
      .attr('rx', 3)
      .attr('fill', d => {
        const val = getValue(d);
        if (sortBy === 'lastDay') {
          if (val > 10) return '#DC4A4A';
          if (val > 5) return '#E5A84B';
          return '#4AA3A0';
        }
        if (val > 50) return '#DC4A4A';
        if (val > 40) return '#E5A84B';
        if (val > 25) return '#4A7C9B';
        return '#4AA3A0';
      })
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('opacity', 1);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            visible: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            content: d,
          });
        }
      })
      .on('mousemove', function(event) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip(prev => ({ ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top }));
        }
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 0.8);
        setTooltip({ visible: false, x: 0, y: 0, content: null });
      })
      .attr('width', 0)
      .transition()
      .duration(600)
      .delay((_, i) => i * 25)
      .attr('width', d => xScale(getValue(d)));

    // Deputy names on left
    g.selectAll('text.name')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('class', 'name')
      .attr('x', -8)
      .attr('y', d => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => {
        if (d.anomalyScore > 30) return '#DC4A4A';
        if (d.anomalyScore > 15) return '#E5A84B';
        return '#A0A3B1';
      })
      .attr('font-size', '11px')
      .text(d => d.deputy.name.length > 18 ? d.deputy.name.substring(0, 16) + '...' : d.deputy.name);

    // Percentage labels on right
    g.selectAll('text.pct')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('class', 'pct')
      .attr('x', d => xScale(getValue(d)) + 8)
      .attr('y', d => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('opacity', 0)
      .text(d => `${getValue(d).toFixed(1)}%`)
      .transition()
      .delay((_, i) => i * 25 + 400)
      .attr('opacity', 1);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}%`))
      .selectAll('text')
      .attr('fill', '#A0A3B1');

    // X axis label
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '11px')
      .text(xLabel);

  }, [sortedData, height, sortBy]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('anomaly')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'anomaly'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            Anomalia
          </button>
          <button
            onClick={() => setSortBy('lastWeek')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'lastWeek'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            Última Semana
          </button>
          <button
            onClick={() => setSortBy('lastDay')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'lastDay'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            Último Dia
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-accent-red" />
            <span>Critico</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-accent-amber" />
            <span>Alerta</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-accent-teal" />
            <span>Normal</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div ref={containerRef} />
        {tooltip.visible && tooltip.content && (
          <div
            className="absolute z-50 px-3 py-2 bg-bg-card border border-border rounded-lg shadow-lg pointer-events-none"
            style={{ left: Math.min(tooltip.x + 10, 300), top: tooltip.y - 10 }}
          >
            <p className="text-sm font-medium text-text-primary">{tooltip.content.deputy.name}</p>
            <p className="text-xs text-text-secondary">{tooltip.content.deputy.party}-{tooltip.content.deputy.uf}</p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">% Última Semana:</span>
                <span className={`font-mono ${tooltip.content.lastWeekPct > 40 ? 'text-accent-red' : 'text-text-primary'}`}>
                  {tooltip.content.lastWeekPct.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">% Último Dia:</span>
                <span className={`font-mono ${tooltip.content.lastDayPct > 10 ? 'text-accent-red' : 'text-accent-amber'}`}>
                  {tooltip.content.lastDayPct.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Ticket Fim Mês:</span>
                <span className="font-mono text-text-secondary">{formatReais(tooltip.content.avgTicketLastWeek, true)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Ticket Normal:</span>
                <span className="font-mono text-text-secondary">{formatReais(tooltip.content.avgTicketRest, true)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Meses c/ Pico:</span>
                <span className="font-mono text-accent-amber">{tooltip.content.monthEndSpikes}/12</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Methodology note */}
      <div className="text-xs text-text-muted p-3 bg-bg-secondary rounded-lg">
        <strong className="text-text-secondary">Padrão de Fim de Mês:</strong> Gastos concentrados nos últimos dias do mês
        podem indicar "corrida" para uso da cota antes do vencimento. O esperado é ~25% na última semana e ~3.5% no último dia.
        Picos recorrentes sugerem planejamento inadequado ou uso artificial da cota.
      </div>
    </div>
  );
}

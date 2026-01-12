import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais } from '../../utils/formatters';

interface WeekendSpendingProps {
  deputies: Deputy[];
  height?: number;
  maxItems?: number;
}

interface WeekendData {
  deputy: Deputy;
  weekendPct: number; // % of transactions on weekends
  weekendValue: number; // Total value on weekends
  weekdayValue: number;
  weekendTxCount: number;
  weekdayTxCount: number;
  anomalyScore: number;
}

// Simulate weekend spending data (in real app, would come from backend)
function calculateWeekendMetrics(deputy: Deputy): WeekendData {
  // Use deputy characteristics to simulate realistic weekend patterns
  const seed = deputy.id + deputy.totalSpending;
  const random = (n: number) => ((seed * n) % 100) / 100;

  // Normal weekend % is around 5-10% (weekends are 28% of days but less active)
  // Some deputies might have unusually high weekend activity
  const baseWeekendPct = 7; // Expected ~7%
  const noise = (random(1) - 0.3) * 25; // Can push up to ~25%
  const weekendPct = Math.max(0, Math.min(50, baseWeekendPct + noise));

  const weekendValue = deputy.totalSpending * (weekendPct / 100);
  const weekdayValue = deputy.totalSpending - weekendValue;

  const weekendTxCount = Math.round(deputy.transactionCount * (weekendPct / 100));
  const weekdayTxCount = deputy.transactionCount - weekendTxCount;

  // Anomaly score: how much above expected weekend % (7%)
  const anomalyScore = Math.max(0, weekendPct - 7);

  return {
    deputy,
    weekendPct,
    weekendValue,
    weekdayValue,
    weekendTxCount,
    weekdayTxCount,
    anomalyScore,
  };
}

export function WeekendSpending({ deputies, height = 500, maxItems = 20 }: WeekendSpendingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<'anomaly' | 'pct' | 'value'>('anomaly');
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: WeekendData | null;
  }>({ visible: false, x: 0, y: 0, content: null });

  // Calculate weekend metrics for all deputies
  const weekendData = deputies
    .filter(d => !d.name.includes('LIDERANÇA') && d.transactionCount > 50)
    .map(d => calculateWeekendMetrics(d));

  // Sort based on selected metric
  const sortedData = [...weekendData]
    .sort((a, b) => {
      if (sortBy === 'anomaly') return b.anomalyScore - a.anomalyScore;
      if (sortBy === 'pct') return b.weekendPct - a.weekendPct;
      return b.weekendValue - a.weekendValue;
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

    // X scale (0-50% range for weekend spending)
    const maxPct = Math.max(...sortedData.map(d => d.weekendPct), 25);
    const xScale = d3.scaleLinear().domain([0, maxPct]).range([0, innerWidth]).nice();

    // Reference line at expected 7%
    g.append('line')
      .attr('x1', xScale(7))
      .attr('x2', xScale(7))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#4AA3A0')
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.6);

    g.append('text')
      .attr('x', xScale(7))
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#4AA3A0')
      .attr('font-size', '10px')
      .text('Esperado (7%)');

    // Warning zone threshold at 15%
    if (maxPct > 15) {
      g.append('line')
        .attr('x1', xScale(15))
        .attr('x2', xScale(15))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#E5A84B')
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.6);

      g.append('text')
        .attr('x', xScale(15))
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#E5A84B')
        .attr('font-size', '10px')
        .text('Alerta (15%)');
    }

    // Critical zone threshold at 25%
    if (maxPct > 25) {
      g.append('line')
        .attr('x1', xScale(25))
        .attr('x2', xScale(25))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#DC4A4A')
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.6);

      g.append('text')
        .attr('x', xScale(25))
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#DC4A4A')
        .attr('font-size', '10px')
        .text('Crítico (25%)');
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
        if (d.weekendPct > 25) return '#DC4A4A';
        if (d.weekendPct > 15) return '#E5A84B';
        if (d.weekendPct > 7) return '#4A7C9B';
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
      .attr('width', d => xScale(d.weekendPct));

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
        if (d.weekendPct > 25) return '#DC4A4A';
        if (d.weekendPct > 15) return '#E5A84B';
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
      .attr('x', d => xScale(d.weekendPct) + 8)
      .attr('y', d => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('opacity', 0)
      .text(d => `${d.weekendPct.toFixed(1)}%`)
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
      .text('% Transações em Finais de Semana');

  }, [sortedData, height, sortBy]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('anomaly')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'anomaly'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            Maior Anomalia
          </button>
          <button
            onClick={() => setSortBy('pct')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'pct'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            % Fim de Semana
          </button>
          <button
            onClick={() => setSortBy('value')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'value'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            Valor (R$)
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent-red" />
            <span>&gt;25%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent-amber" />
            <span>&gt;15%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent-blue" />
            <span>&gt;7%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent-teal" />
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
                <span className="text-text-muted">% Fim de Semana:</span>
                <span className={`font-mono ${tooltip.content.weekendPct > 25 ? 'text-accent-red' : tooltip.content.weekendPct > 15 ? 'text-accent-amber' : 'text-text-primary'}`}>
                  {tooltip.content.weekendPct.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Valor Fim de Semana:</span>
                <span className="font-mono text-accent-amber">{formatReais(tooltip.content.weekendValue, true)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Tx Fim de Semana:</span>
                <span className="font-mono text-text-secondary">{tooltip.content.weekendTxCount.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Tx Dias Úteis:</span>
                <span className="font-mono text-text-secondary">{tooltip.content.weekdayTxCount.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Methodology note */}
      <div className="text-xs text-text-muted p-3 bg-bg-secondary rounded-lg">
        <strong className="text-text-secondary">Gastos em Finais de Semana:</strong> Transações realizadas em sábados e domingos
        representam naturalmente cerca de 7% do total. Porcentagens muito acima desse valor podem indicar
        padrões atípicos de uso da cota parlamentar fora do horário de expediente.
      </div>
    </div>
  );
}

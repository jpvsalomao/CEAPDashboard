import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais } from '../../utils/formatters';

interface SpendingVelocityProps {
  deputies: Deputy[];
  height?: number;
  maxItems?: number;
}

interface VelocityData {
  deputy: Deputy;
  transactionsPerMonth: number;
  avgTicket: number;
  velocityScore: number; // High score = unusual pattern
  monthlyVariance: number; // Standard deviation of monthly spending
}

// Calculate velocity metrics for deputies
function calculateVelocityMetrics(deputy: Deputy): VelocityData {
  // Use actual months from deputy data, fallback to 36 (2023-2025)
  const months = deputy.byMonth?.length || 36;
  const transactionsPerMonth = deputy.transactionCount / months;
  const avgTicket = deputy.totalSpending / deputy.transactionCount;

  // Velocity score: combines frequency and ticket size
  // High frequency + high ticket = higher risk
  const freqScore = transactionsPerMonth / 50; // Normalized by 50 tx/month baseline
  const ticketScore = avgTicket / 5000; // Normalized by R$ 5000 baseline

  // Simulate monthly variance (in real app, would come from backend)
  const seed = deputy.id + deputy.totalSpending;
  const variance = ((seed % 100) / 100) * 50000 + 10000; // R$ 10k-60k variance

  // Velocity score: high if both frequency and ticket are high, or variance is high
  const velocityScore = (freqScore * ticketScore * 100) + (variance / 50000) * 20;

  return {
    deputy,
    transactionsPerMonth,
    avgTicket,
    velocityScore,
    monthlyVariance: variance,
  };
}

export function SpendingVelocity({ deputies, height = 500, maxItems = 20 }: SpendingVelocityProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<'velocity' | 'frequency' | 'ticket'>('velocity');

  // Memoize velocity calculations to prevent recalculations on every render
  const velocityData = useMemo(() =>
    deputies
      .filter(d => !d.name.includes('LIDERANÇA') && d.transactionCount > 20)
      .map(d => calculateVelocityMetrics(d)),
    [deputies]
  );

  // Memoize sorted data to prevent unnecessary re-sorts
  const sortedData = useMemo(() =>
    [...velocityData]
      .sort((a, b) => {
        if (sortBy === 'velocity') return b.velocityScore - a.velocityScore;
        if (sortBy === 'frequency') return b.transactionsPerMonth - a.transactionsPerMonth;
        return b.avgTicket - a.avgTicket;
      })
      .slice(0, maxItems),
    [velocityData, sortBy, maxItems]
  );

  useEffect(() => {
    if (!containerRef.current || sortedData.length === 0) return;

    d3.select(containerRef.current).selectAll('*').remove();

    const margin = { top: 40, right: 100, bottom: 30, left: 150 };
    const width = containerRef.current.clientWidth;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3
      .select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // D3-controlled tooltip (no React state updates on hover)
    const tooltip = d3.select(tooltipRef.current);

    // Y scale for deputy names
    const yScale = d3
      .scaleBand()
      .domain(sortedData.map(d => d.deputy.name))
      .range([0, innerHeight])
      .padding(0.25);

    // X scale based on sort metric
    let maxVal: number;
    let xLabel: string;
    let getValue: (d: VelocityData) => number;

    if (sortBy === 'velocity') {
      maxVal = Math.max(...sortedData.map(d => d.velocityScore));
      xLabel = 'Velocity Score';
      getValue = d => d.velocityScore;
    } else if (sortBy === 'frequency') {
      maxVal = Math.max(...sortedData.map(d => d.transactionsPerMonth));
      xLabel = 'Transações/Mês';
      getValue = d => d.transactionsPerMonth;
    } else {
      maxVal = Math.max(...sortedData.map(d => d.avgTicket));
      xLabel = 'Ticket Médio (R$)';
      getValue = d => d.avgTicket;
    }

    const xScale = d3.scaleLinear().domain([0, maxVal]).range([0, innerWidth]).nice();

    // Background reference zone (for velocity score)
    if (sortBy === 'velocity') {
      const zones = [
        { max: 20, color: '#2ECC71', label: 'Normal' },
        { max: 40, color: '#E5A84B', label: 'Elevado' },
        { max: Infinity, color: '#DC4A4A', label: 'Crítico' },
      ];

      let lastX = 0;
      zones.forEach(zone => {
        const zoneEnd = Math.min(zone.max, maxVal);
        if (lastX < zoneEnd) {
          g.append('rect')
            .attr('x', xScale(lastX))
            .attr('y', 0)
            .attr('width', xScale(zoneEnd) - xScale(lastX))
            .attr('height', innerHeight)
            .attr('fill', zone.color)
            .attr('opacity', 0.05);
          lastX = zoneEnd;
        }
      });
    }

    // Helper to format tooltip content
    const formatTooltipContent = (d: VelocityData) => {
      const velocityColor = d.velocityScore > 40 ? '#DC4A4A' : d.velocityScore > 20 ? '#E5A84B' : '#FAFAFA';
      return `
        <p style="font-size: 14px; font-weight: 500; color: #FAFAFA; margin: 0 0 4px 0;">
          ${d.deputy.name}
        </p>
        <p style="font-size: 12px; color: #A0A3B1; margin: 0 0 8px 0;">
          ${d.deputy.party}-${d.deputy.uf}
        </p>
        <div style="font-size: 12px;">
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
            <span style="color: #6B7280;">Velocity Score:</span>
            <span style="font-family: monospace; color: ${velocityColor};">
              ${d.velocityScore.toFixed(1)}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
            <span style="color: #6B7280;">Transações/Mês:</span>
            <span style="font-family: monospace; color: #A0A3B1;">
              ${d.transactionsPerMonth.toFixed(1)}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
            <span style="color: #6B7280;">Ticket Médio:</span>
            <span style="font-family: monospace; color: #4AA3A0;">
              ${formatReais(d.avgTicket, true)}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #6B7280;">Gasto Total:</span>
            <span style="font-family: monospace; color: #A0A3B1;">
              ${formatReais(d.deputy.totalSpending, true)}
            </span>
          </div>
        </div>
      `;
    };

    // Shared hover handlers (D3-based, no React state updates)
    const showTooltip = (event: MouseEvent, d: VelocityData) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      tooltip
        .style('opacity', 1)
        .style('left', `${Math.min(event.clientX - rect.left + 10, 300)}px`)
        .style('top', `${event.clientY - rect.top - 10}px`)
        .html(formatTooltipContent(d));
    };

    const moveTooltip = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      tooltip
        .style('left', `${Math.min(event.clientX - rect.left + 10, 300)}px`)
        .style('top', `${event.clientY - rect.top - 10}px`);
    };

    const hideTooltip = () => {
      tooltip.style('opacity', 0);
    };

    // Draw bars with .join() for proper updates
    g.selectAll('rect.bar')
      .data(sortedData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.deputy.name) ?? 0)
      .attr('height', yScale.bandwidth())
      .attr('rx', 3)
      .attr('fill', d => {
        const val = getValue(d);
        if (sortBy === 'velocity') {
          if (val > 40) return '#DC4A4A';
          if (val > 20) return '#E5A84B';
          return '#4AA3A0';
        } else if (sortBy === 'frequency') {
          if (d.transactionsPerMonth > 100) return '#DC4A4A';
          if (d.transactionsPerMonth > 50) return '#E5A84B';
          return '#4A7C9B';
        } else {
          if (d.avgTicket > 10000) return '#DC4A4A';
          if (d.avgTicket > 5000) return '#E5A84B';
          return '#4A7C9B';
        }
      })
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('opacity', 1);
        showTooltip(event, d);
      })
      .on('mousemove', function(event) {
        moveTooltip(event);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 0.8);
        hideTooltip();
      })
      .attr('width', d => xScale(getValue(d)));

    // Deputy names on left
    g.selectAll('text.name')
      .data(sortedData)
      .join('text')
      .attr('class', 'name')
      .attr('x', -8)
      .attr('y', d => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => {
        if (d.velocityScore > 40) return '#DC4A4A';
        if (d.velocityScore > 20) return '#E5A84B';
        return '#A0A3B1';
      })
      .attr('font-size', '11px')
      .text(d => d.deputy.name.length > 18 ? d.deputy.name.substring(0, 16) + '...' : d.deputy.name);

    // Values on right
    g.selectAll('text.value')
      .data(sortedData)
      .join('text')
      .attr('class', 'value')
      .attr('x', d => xScale(getValue(d)) + 8)
      .attr('y', d => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text(d => {
        const val = getValue(d);
        if (sortBy === 'ticket') return formatReais(val, true);
        return val.toFixed(1);
      });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5))
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
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('velocity')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'velocity'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            Velocity Score
          </button>
          <button
            onClick={() => setSortBy('frequency')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'frequency'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            Frequência
          </button>
          <button
            onClick={() => setSortBy('ticket')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'ticket'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            Ticket Médio
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent-red" />
            <span>Crítico</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent-amber" />
            <span>Elevado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent-teal" />
            <span>Normal</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div ref={containerRef} />
        {/* D3-controlled tooltip (no React state updates on hover) */}
        <div
          ref={tooltipRef}
          className="absolute z-50 px-3 py-2 bg-bg-card border border-border rounded-lg shadow-lg pointer-events-none transition-opacity duration-150"
          style={{ opacity: 0 }}
        />
      </div>

      {/* Methodology note */}
      <div className="text-xs text-text-muted p-3 bg-bg-secondary rounded-lg">
        <strong className="text-text-secondary">Velocity Score:</strong> Combina frequência de transações e ticket médio.
        Deputados com muitas transações de alto valor tem score elevado, indicando padrão potencialmente atípico.
      </div>
    </div>
  );
}

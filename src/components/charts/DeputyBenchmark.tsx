import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais } from '../../utils/formatters';

interface DeputyBenchmarkProps {
  deputies: Deputy[];
  partyData: Array<{ party: string; value: number; deputyCount: number; avgPerDeputy: number }>;
  stateData: Array<{ uf: string; value: number; deputyCount: number; avgPerDeputy: number }>;
  height?: number;
  maxItems?: number;
}

interface BenchmarkData {
  deputy: Deputy;
  partyAvg: number;
  stateAvg: number;
  vsPartyPct: number;
  vsStatePct: number;
  anomalyScore: number;
}

export function DeputyBenchmark({
  deputies,
  partyData,
  stateData,
  height = 500,
  maxItems = 20,
}: DeputyBenchmarkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<'anomaly' | 'vsParty' | 'vsState'>('anomaly');

  // Memoize party averages map
  const partyAvgMap = useMemo(() => {
    const map = new Map<string, number>();
    partyData.forEach((p) => map.set(p.party, p.avgPerDeputy));
    return map;
  }, [partyData]);

  // Memoize state averages map
  const stateAvgMap = useMemo(() => {
    const map = new Map<string, number>();
    stateData.forEach((s) => map.set(s.uf, s.avgPerDeputy));
    return map;
  }, [stateData]);

  // Calculate global average
  const globalAvg = useMemo(() =>
    deputies.length
      ? deputies.reduce((sum, d) => sum + d.totalSpending, 0) / deputies.length
      : 800000,
    [deputies]
  );

  // Memoize benchmark data to prevent unnecessary recalculations
  const sortedData = useMemo(() => {
    const benchmarkData: BenchmarkData[] = deputies
      .filter((d) => !d.name.includes('LIDERANÇA'))
      .map((deputy) => {
        const partyAvg = partyAvgMap.get(deputy.party) || globalAvg;
        const stateAvg = stateAvgMap.get(deputy.uf) || globalAvg;
        const vsPartyPct = ((deputy.totalSpending - partyAvg) / partyAvg) * 100;
        const vsStatePct = ((deputy.totalSpending - stateAvg) / stateAvg) * 100;
        // Anomaly score combines both deviations, weighted
        const anomalyScore = Math.abs(vsPartyPct) * 0.5 + Math.abs(vsStatePct) * 0.5;

        return {
          deputy,
          partyAvg,
          stateAvg,
          vsPartyPct,
          vsStatePct,
          anomalyScore,
        };
      });

    return [...benchmarkData]
      .sort((a, b) => {
        if (sortBy === 'anomaly') return b.anomalyScore - a.anomalyScore;
        if (sortBy === 'vsParty') return b.vsPartyPct - a.vsPartyPct;
        return b.vsStatePct - a.vsStatePct;
      })
      .slice(0, maxItems);
  }, [deputies, partyAvgMap, stateAvgMap, globalAvg, sortBy, maxItems]);

  useEffect(() => {
    if (!containerRef.current || sortedData.length === 0) return;

    // Clear previous content
    d3.select(containerRef.current).selectAll('*').remove();

    const margin = { top: 40, right: 100, bottom: 20, left: 150 };
    const width = containerRef.current.clientWidth;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3
      .select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Create D3 tooltip (not React state - prevents re-renders)
    const tooltip = d3.select(tooltipRef.current);

    // Scale for deviation (centered at 0)
    // FIX: Use symmetric padding instead of .nice() to keep center at 0
    const maxDev = Math.max(
      ...sortedData.map((d) => Math.max(Math.abs(d.vsPartyPct), Math.abs(d.vsStatePct)))
    );
    const padding = maxDev * 0.1; // 10% padding for breathing room
    const domainMax = maxDev + padding;
    const xScale = d3
      .scaleLinear()
      .domain([-domainMax, domainMax])  // Symmetric domain around 0
      .range([0, innerWidth]);
    // Note: Removed .nice() which was causing asymmetric scale

    const yScale = d3
      .scaleBand()
      .domain(sortedData.map((d) => d.deputy.name))
      .range([0, innerHeight])
      .padding(0.2);

    // Center line (0% deviation)
    const zeroX = xScale(0);
    g.append('line')
      .attr('x1', zeroX)
      .attr('x2', zeroX)
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#6B7280')
      .attr('stroke-dasharray', '4,4');

    // Column headers
    g.append('text')
      .attr('x', zeroX)
      .attr('y', -25)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-text-muted text-xs')
      .text('Media (0%)');

    g.append('text')
      .attr('x', 0)
      .attr('y', -25)
      .attr('text-anchor', 'start')
      .attr('class', 'fill-status-low text-xs')
      .text(`-${Math.round(domainMax)}% abaixo`);

    g.append('text')
      .attr('x', innerWidth)
      .attr('y', -25)
      .attr('text-anchor', 'end')
      .attr('class', 'fill-accent-red text-xs')
      .text(`+${Math.round(domainMax)}% acima`);

    // Helper to format tooltip content
    const formatTooltipContent = (d: BenchmarkData) => {
      const partyPctColor = d.vsPartyPct > 0 ? '#DC4A4A' : '#2ECC71';
      const statePctColor = d.vsStatePct > 0 ? '#DC4A4A' : '#2ECC71';
      return `
        <p style="font-size: 14px; font-weight: 500; color: #FAFAFA; margin: 0 0 4px 0;">
          ${d.deputy.name}
        </p>
        <p style="font-size: 12px; color: #A0A3B1; margin: 0 0 8px 0;">
          ${d.deputy.party}-${d.deputy.uf}
        </p>
        <div style="font-size: 12px;">
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
            <span style="color: #6B7280;">Gasto total:</span>
            <span style="font-family: monospace; color: #FAFAFA;">
              ${formatReais(d.deputy.totalSpending, true)}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
            <span style="color: #6B7280;">Media ${d.deputy.party}:</span>
            <span style="font-family: monospace; color: #A0A3B1;">
              ${formatReais(d.partyAvg, true)}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px;">
            <span style="color: #6B7280;">Media ${d.deputy.uf}:</span>
            <span style="font-family: monospace; color: #A0A3B1;">
              ${formatReais(d.stateAvg, true)}
            </span>
          </div>
          <div style="padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
              <span style="color: #E5A84B;">vs Partido:</span>
              <span style="font-family: monospace; color: ${partyPctColor};">
                ${d.vsPartyPct >= 0 ? '+' : ''}${d.vsPartyPct.toFixed(1)}%
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #4A7C9B;">vs Estado:</span>
              <span style="font-family: monospace; color: ${statePctColor};">
                ${d.vsStatePct >= 0 ? '+' : ''}${d.vsStatePct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      `;
    };

    // Shared hover handlers (D3-based, no React state updates)
    const showTooltip = (event: MouseEvent, d: BenchmarkData) => {
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

    // Draw party deviation bars
    g.selectAll('rect.party-bar')
      .data(sortedData)
      .join('rect')  // Use .join() instead of .enter() for proper updates
      .attr('class', 'party-bar')
      .attr('x', (d) => (d.vsPartyPct >= 0 ? zeroX : xScale(d.vsPartyPct)))
      .attr('y', (d) => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() * 0.1)
      .attr('width', (d) => Math.abs(xScale(d.vsPartyPct) - zeroX))
      .attr('height', yScale.bandwidth() * 0.35)
      .attr('rx', 2)
      .attr('fill', (d) => (d.vsPartyPct > 30 ? '#DC4A4A' : d.vsPartyPct > 0 ? '#E5A84B' : '#2ECC71'))
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1);
        showTooltip(event, d);
      })
      .on('mousemove', function (event) {
        moveTooltip(event);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.8);
        hideTooltip();
      });

    // Draw state deviation bars (offset below party)
    g.selectAll('rect.state-bar')
      .data(sortedData)
      .join('rect')  // Use .join() instead of .enter() for proper updates
      .attr('class', 'state-bar')
      .attr('x', (d) => (d.vsStatePct >= 0 ? zeroX : xScale(d.vsStatePct)))
      .attr('y', (d) => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() * 0.55)
      .attr('width', (d) => Math.abs(xScale(d.vsStatePct) - zeroX))
      .attr('height', yScale.bandwidth() * 0.35)
      .attr('rx', 2)
      .attr('fill', (d) => (d.vsStatePct > 30 ? '#DC4A4A' : d.vsStatePct > 0 ? '#4A7C9B' : '#2ECC71'))
      .attr('opacity', 0.6)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1);
        showTooltip(event, d);
      })
      .on('mousemove', function (event) {
        moveTooltip(event);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.6);
        hideTooltip();
      });

    // Deputy names on Y axis
    g.append('g')
      .selectAll('text')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('x', -8)
      .attr('y', (d) => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d) => {
        if (d.deputy.riskLevel === 'CRITICO') return '#DC4A4A';
        if (d.deputy.riskLevel === 'ALTO') return '#E5A84B';
        return '#A0A3B1';
      })
      .attr('font-size', '11px')
      .text((d) => {
        const name = d.deputy.name;
        return name.length > 18 ? name.substring(0, 16) + '...' : name;
      });

    // Deviation value labels on right
    g.append('g')
      .selectAll('text')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('x', innerWidth + 10)
      .attr('y', (d) => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d) => {
        const avg = (d.vsPartyPct + d.vsStatePct) / 2;
        if (avg > 30) return '#DC4A4A';
        if (avg > 0) return '#E5A84B';
        return '#2ECC71';
      })
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text((d) => {
        const sign = d.vsPartyPct >= 0 ? '+' : '';
        return `${sign}${d.vsPartyPct.toFixed(0)}%`;
      });

  }, [sortedData, height]);

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
            onClick={() => setSortBy('vsParty')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'vsParty'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            vs Partido
          </button>
          <button
            onClick={() => setSortBy('vsState')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'vsState'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            vs Estado
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="w-3 h-2 rounded bg-accent-amber opacity-80" />
            <span>vs Partido</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-2 rounded bg-accent-blue opacity-60" />
            <span>vs Estado</span>
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
    </div>
  );
}

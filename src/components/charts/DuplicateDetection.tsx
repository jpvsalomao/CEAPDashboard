import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais } from '../../utils/formatters';

interface DuplicateDetectionProps {
  deputies: Deputy[];
  height?: number;
  maxItems?: number;
}

interface DuplicateData {
  deputy: Deputy;
  exactDuplicates: number; // Same value, same supplier, same day
  nearDuplicates: number; // Same value, same supplier, within 7 days
  sameValuePct: number; // % of transactions with repeated exact values
  suspiciousPatterns: number; // Total suspicious patterns found
  largestDuplicateValue: number; // Largest duplicated amount
}

// Simulate duplicate detection (in real app, would come from backend)
function detectDuplicates(deputy: Deputy): DuplicateData {
  // Use deputy characteristics to simulate realistic patterns
  const seed = deputy.id + deputy.totalSpending;
  const random = (n: number) => ((seed * n) % 100) / 100;

  // Simulate duplicate counts based on transaction volume
  const txCount = deputy.transactionCount;
  const baseExactRate = 0.005; // 0.5% exact duplicates expected
  const baseNearRate = 0.02; // 2% near duplicates expected

  // Add some variation
  const exactMultiplier = 1 + (random(1) - 0.3) * 3; // 0.4x to 2.2x
  const nearMultiplier = 1 + (random(2) - 0.3) * 2;

  const exactDuplicates = Math.max(0, Math.floor(txCount * baseExactRate * exactMultiplier));
  const nearDuplicates = Math.max(0, Math.floor(txCount * baseNearRate * nearMultiplier));

  // Same value percentage (how many transactions share exact amounts)
  const baseSameValuePct = 5; // 5% expected
  const sameValueNoise = (random(3) - 0.3) * 15;
  const sameValuePct = Math.max(0, Math.min(40, baseSameValuePct + sameValueNoise));

  // Suspicious patterns total
  const suspiciousPatterns = exactDuplicates * 3 + nearDuplicates;

  // Largest duplicated value (simulate based on average ticket)
  const avgTicket = deputy.totalSpending / txCount;
  const largestDuplicateValue = avgTicket * (2 + random(4) * 5); // 2x to 7x avg

  return {
    deputy,
    exactDuplicates,
    nearDuplicates,
    sameValuePct,
    suspiciousPatterns,
    largestDuplicateValue,
  };
}

export function DuplicateDetection({ deputies, height = 500, maxItems = 20 }: DuplicateDetectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<'patterns' | 'exact' | 'sameValue'>('patterns');
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: DuplicateData | null;
  }>({ visible: false, x: 0, y: 0, content: null });

  // Detect duplicates for all deputies
  const duplicateData = deputies
    .filter(d => !d.name.includes('LIDERANÇA') && d.transactionCount > 50)
    .map(d => detectDuplicates(d));

  // Sort based on selected metric
  const sortedData = [...duplicateData]
    .sort((a, b) => {
      if (sortBy === 'patterns') return b.suspiciousPatterns - a.suspiciousPatterns;
      if (sortBy === 'exact') return b.exactDuplicates - a.exactDuplicates;
      return b.sameValuePct - a.sameValuePct;
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
    let getValue: (d: DuplicateData) => number;

    if (sortBy === 'exact') {
      maxVal = Math.max(...sortedData.map(d => d.exactDuplicates), 10);
      xLabel = 'Duplicatas Exatas';
      getValue = d => d.exactDuplicates;
    } else if (sortBy === 'sameValue') {
      maxVal = Math.max(...sortedData.map(d => d.sameValuePct), 20);
      xLabel = '% Valores Repetidos';
      getValue = d => d.sameValuePct;
    } else {
      maxVal = Math.max(...sortedData.map(d => d.suspiciousPatterns), 50);
      xLabel = 'Padroes Suspeitos';
      getValue = d => d.suspiciousPatterns;
    }

    const xScale = d3.scaleLinear().domain([0, maxVal]).range([0, innerWidth]).nice();

    // Draw stacked bars for patterns view (exact + near duplicates)
    if (sortBy === 'patterns') {
      // Near duplicates (background, lighter)
      g.selectAll('rect.near')
        .data(sortedData)
        .enter()
        .append('rect')
        .attr('class', 'near')
        .attr('x', 0)
        .attr('y', d => yScale(d.deputy.name) ?? 0)
        .attr('height', yScale.bandwidth())
        .attr('rx', 3)
        .attr('fill', '#4A7C9B')
        .attr('opacity', 0.5)
        .attr('width', 0)
        .transition()
        .duration(600)
        .delay((_, i) => i * 25)
        .attr('width', d => xScale(d.suspiciousPatterns));

      // Exact duplicates (foreground, accent)
      g.selectAll('rect.exact')
        .data(sortedData)
        .enter()
        .append('rect')
        .attr('class', 'exact')
        .attr('x', 0)
        .attr('y', d => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() * 0.2)
        .attr('height', yScale.bandwidth() * 0.6)
        .attr('rx', 2)
        .attr('fill', d => d.exactDuplicates > 10 ? '#DC4A4A' : d.exactDuplicates > 5 ? '#E5A84B' : '#4AA3A0')
        .attr('opacity', 0.9)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event, d) {
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
          setTooltip({ visible: false, x: 0, y: 0, content: null });
        })
        .attr('width', 0)
        .transition()
        .duration(600)
        .delay((_, i) => i * 25 + 200)
        .attr('width', d => xScale(d.exactDuplicates * 3)); // Weighted by 3x
    } else {
      // Single bar for other sort modes
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
          if (sortBy === 'exact') {
            if (d.exactDuplicates > 10) return '#DC4A4A';
            if (d.exactDuplicates > 5) return '#E5A84B';
            return '#4AA3A0';
          }
          if (d.sameValuePct > 15) return '#DC4A4A';
          if (d.sameValuePct > 8) return '#E5A84B';
          return '#4A7C9B';
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
    }

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
        if (d.exactDuplicates > 10) return '#DC4A4A';
        if (d.exactDuplicates > 5) return '#E5A84B';
        return '#A0A3B1';
      })
      .attr('font-size', '11px')
      .text(d => d.deputy.name.length > 18 ? d.deputy.name.substring(0, 16) + '...' : d.deputy.name);

    // Value labels on right
    g.selectAll('text.value')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('class', 'value')
      .attr('x', d => xScale(getValue(d)) + 8)
      .attr('y', d => (yScale(d.deputy.name) ?? 0) + yScale.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('opacity', 0)
      .text(d => {
        if (sortBy === 'sameValue') return `${getValue(d).toFixed(1)}%`;
        return getValue(d).toFixed(0);
      })
      .transition()
      .delay((_, i) => i * 25 + 400)
      .attr('opacity', 1);

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('patterns')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'patterns'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            Padroes Suspeitos
          </button>
          <button
            onClick={() => setSortBy('exact')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'exact'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            Duplicatas Exatas
          </button>
          <button
            onClick={() => setSortBy('sameValue')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'sameValue'
                ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
            }`}
          >
            % Valores Iguais
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-accent-red" />
            <span>Critico</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-accent-amber" />
            <span>Alto</span>
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
                <span className="text-text-muted">Duplicatas Exatas:</span>
                <span className={`font-mono ${tooltip.content.exactDuplicates > 10 ? 'text-accent-red' : 'text-text-primary'}`}>
                  {tooltip.content.exactDuplicates}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Quase-Duplicatas:</span>
                <span className="font-mono text-accent-amber">{tooltip.content.nearDuplicates}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">% Valores Repetidos:</span>
                <span className="font-mono text-text-secondary">{tooltip.content.sameValuePct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Maior Duplicado:</span>
                <span className="font-mono text-accent-red">{formatReais(tooltip.content.largestDuplicateValue, true)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Total Transacoes:</span>
                <span className="font-mono text-text-secondary">{tooltip.content.deputy.transactionCount.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Methodology note */}
      <div className="text-xs text-text-muted p-3 bg-bg-secondary rounded-lg">
        <strong className="text-text-secondary">Deteccao de Duplicatas:</strong> Transacoes identicas (mesmo valor, fornecedor e data)
        ou quase-identicas (dentro de 7 dias) podem indicar lancamentos duplicados, erros ou tentativas de fraude.
        Alta porcentagem de valores exatamente iguais tambem e um sinal de alerta.
      </div>
    </div>
  );
}

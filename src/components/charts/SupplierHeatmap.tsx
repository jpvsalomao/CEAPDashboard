import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais } from '../../utils/formatters';

interface SupplierHeatmapProps {
  data: Deputy[];
  height?: number;
  maxDeputies?: number;
}

interface HeatmapCell {
  deputyId: number;
  deputyName: string;
  supplierRank: number;
  supplierName: string;
  value: number;
  pct: number;
  riskLevel: string;
}

export function SupplierHeatmap({ data, height = 500, maxDeputies = 20 }: SupplierHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: HeatmapCell | null;
  }>({ visible: false, x: 0, y: 0, content: null });

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // Clear previous content
    d3.select(containerRef.current).selectAll('*').remove();

    // Sort by HHI (most concentrated first) and take top N
    const sortedDeputies = [...data]
      .filter(d => !d.name.includes('LIDERANÇA'))
      .sort((a, b) => b.hhi.value - a.hhi.value)
      .slice(0, maxDeputies);

    // Build heatmap data: each deputy's top 5 suppliers
    const cells: HeatmapCell[] = [];
    sortedDeputies.forEach((deputy) => {
      deputy.topSuppliers.slice(0, 5).forEach((supplier, idx) => {
        cells.push({
          deputyId: deputy.id,
          deputyName: deputy.name,
          supplierRank: idx + 1,
          supplierName: supplier.name,
          value: supplier.value,
          pct: supplier.pct,
          riskLevel: deputy.riskLevel,
        });
      });
    });

    // Dimensions
    const margin = { top: 40, right: 120, bottom: 20, left: 180 };
    const width = containerRef.current.clientWidth;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const cellHeight = innerHeight / sortedDeputies.length;
    const cellWidth = innerWidth / 5;

    // Create SVG
    const svg = d3
      .select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale for concentration percentage
    const colorScale = d3
      .scaleSequential()
      .domain([0, 80])
      .interpolator(d3.interpolateRgb('#1a1a2e', '#DC4A4A'));

    // Y axis - deputies
    const yScale = d3
      .scaleBand()
      .domain(sortedDeputies.map((d) => d.name))
      .range([0, innerHeight])
      .padding(0.1);

    // X axis - supplier rank
    const xScale = d3
      .scaleBand()
      .domain(['1', '2', '3', '4', '5'])
      .range([0, innerWidth])
      .padding(0.1);

    // Column headers
    g.append('g')
      .selectAll('text')
      .data(['1o Forn.', '2o Forn.', '3o Forn.', '4o Forn.', '5o Forn.'])
      .enter()
      .append('text')
      .attr('x', (_, i) => (xScale(String(i + 1)) ?? 0) + cellWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-text-muted text-xs')
      .text((d) => d);

    // Draw cells
    g.selectAll('rect.cell')
      .data(cells)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', (d) => xScale(String(d.supplierRank)) ?? 0)
      .attr('y', (d) => yScale(d.deputyName) ?? 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 2)
      .attr('fill', (d) => colorScale(d.pct))
      .attr('stroke', '#0D0D0F')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('stroke', '#4AA3A0').attr('stroke-width', 2);
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
      .on('mousemove', function (event) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip((prev) => ({
            ...prev,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          }));
        }
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', '#0D0D0F').attr('stroke-width', 1);
        setTooltip({ visible: false, x: 0, y: 0, content: null });
      });

    // Cell text (percentage)
    g.selectAll('text.cell-label')
      .data(cells)
      .enter()
      .append('text')
      .attr('class', 'cell-label')
      .attr('x', (d) => (xScale(String(d.supplierRank)) ?? 0) + cellWidth / 2)
      .attr('y', (d) => (yScale(d.deputyName) ?? 0) + cellHeight / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.pct > 40 ? '#FAFAFA' : '#A0A3B1'))
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .text((d) => (d.pct > 5 ? `${d.pct.toFixed(0)}%` : ''));

    // Deputy names on Y axis
    g.append('g')
      .selectAll('text')
      .data(sortedDeputies)
      .enter()
      .append('text')
      .attr('x', -8)
      .attr('y', (d) => (yScale(d.name) ?? 0) + cellHeight / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('fill', (d) => {
        if (d.riskLevel === 'CRITICO') return '#DC4A4A';
        if (d.riskLevel === 'ALTO') return '#E5A84B';
        return '#A0A3B1';
      })
      .attr('font-size', '11px')
      .text((d) => {
        const name = d.name;
        return name.length > 22 ? name.substring(0, 20) + '...' : name;
      });

    // HHI values on right side
    g.append('g')
      .selectAll('text')
      .data(sortedDeputies)
      .enter()
      .append('text')
      .attr('x', innerWidth + 10)
      .attr('y', (d) => (yScale(d.name) ?? 0) + cellHeight / 2 + 4)
      .attr('text-anchor', 'start')
      .attr('fill', (d) => {
        if (d.hhi.value > 3000) return '#DC4A4A';
        if (d.hhi.value > 2500) return '#E5A84B';
        return '#A0A3B1';
      })
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text((d) => `HHI ${d.hhi.value.toFixed(0)}`);

    // Legend
    const legendWidth = 100;
    const legendHeight = 10;
    const legendX = innerWidth - legendWidth;
    const legendY = -30;

    // Gradient for legend
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#1a1a2e');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#DC4A4A');

    g.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#heatmap-gradient)')
      .attr('rx', 2);

    g.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 4)
      .attr('text-anchor', 'start')
      .attr('class', 'fill-text-muted text-[10px]')
      .text('0%');

    g.append('text')
      .attr('x', legendX + legendWidth)
      .attr('y', legendY - 4)
      .attr('text-anchor', 'end')
      .attr('class', 'fill-text-muted text-[10px]')
      .text('80%+');

  }, [data, height, maxDeputies]);

  return (
    <div className="relative">
      <div ref={containerRef} />
      {tooltip.visible && tooltip.content && (
        <div
          className="absolute z-50 px-3 py-2 bg-bg-card border border-border rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: tooltip.x > 400 ? 'translateX(-110%)' : 'none',
          }}
        >
          <p className="text-sm font-medium text-text-primary mb-1">
            {tooltip.content.deputyName}
          </p>
          <p className="text-xs text-text-secondary mb-2">
            {tooltip.content.supplierRank}o Fornecedor
          </p>
          <p className="text-xs text-text-muted truncate max-w-[200px]">
            {tooltip.content.supplierName}
          </p>
          <div className="flex justify-between mt-2 pt-2 border-t border-border">
            <span className="text-xs text-text-muted">Valor:</span>
            <span className="text-xs font-mono text-accent-teal">
              {formatReais(tooltip.content.value, true)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-text-muted">Concentracao:</span>
            <span
              className={`text-xs font-mono ${
                tooltip.content.pct > 50
                  ? 'text-accent-red'
                  : tooltip.content.pct > 30
                    ? 'text-accent-amber'
                    : 'text-text-primary'
              }`}
            >
              {tooltip.content.pct.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais, abbreviateName } from '../../utils/formatters';
import { useThemeColors } from '../../utils/colors';

interface HHIChartProps {
  data: Deputy[];
  height?: number;
  maxItems?: number;
}

export function HHIChart({ data, height = 400, maxItems = 15 }: HHIChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const themeColors = useThemeColors();

  // Sort by HHI and take top items
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => b.hhi.value - a.hhi.value)
      .slice(0, maxItems);
  }, [data, maxItems]);

  useEffect(() => {
    if (!svgRef.current || chartData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    const container = svgRef.current.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const margin = { top: 20, right: 120, bottom: 40, left: 150 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    svg.selectAll('*').remove();

    // Set dimensions
    svg.attr('width', width).attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, 10000]) // HHI max is 10000
      .range([0, innerWidth]);

    const yScale = d3.scaleBand()
      .domain(chartData.map((d) => d.name))
      .range([0, innerHeight])
      .padding(0.2);

    // HHI threshold zones (background)
    const thresholds = [
      { start: 0, end: 1500, color: themeColors.statusLow, label: 'Baixo', opacity: 0.1 },
      { start: 1500, end: 2500, color: themeColors.accentTeal, label: 'Medio', opacity: 0.1 },
      { start: 2500, end: 3000, color: themeColors.accentAmber, label: 'Alto', opacity: 0.1 },
      { start: 3000, end: 10000, color: themeColors.accentRed, label: 'Critico', opacity: 0.1 },
    ];

    thresholds.forEach((t) => {
      g.append('rect')
        .attr('x', xScale(t.start))
        .attr('y', 0)
        .attr('width', xScale(t.end) - xScale(t.start))
        .attr('height', innerHeight)
        .attr('fill', t.color)
        .attr('opacity', t.opacity);
    });

    // Threshold lines
    [1500, 2500, 3000].forEach((threshold) => {
      g.append('line')
        .attr('x1', xScale(threshold))
        .attr('x2', xScale(threshold))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', themeColors.chartGrid)
        .attr('stroke-dasharray', '4');
    });

    // Bars
    g.selectAll('.bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.name)!)
      .attr('height', yScale.bandwidth())
      .attr('fill', (d) => {
        if (d.hhi.value >= 3000) return themeColors.accentRed;
        if (d.hhi.value >= 2500) return themeColors.accentAmber;
        if (d.hhi.value >= 1500) return themeColors.accentTeal;
        return themeColors.statusLow;
      })
      .attr('rx', 4)
      .attr('width', 0)
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.8);
        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .html(`
            <div class="tooltip-title">${d.name}</div>
            <div class="text-text-muted text-xs mb-2">${d.party}-${d.uf}</div>
            <div class="tooltip-value">HHI: ${d.hhi.value.toFixed(0)}</div>
            <div class="tooltip-label">${d.hhi.level}</div>
            <div class="mt-2 text-xs text-text-secondary">
              Total: ${formatReais(d.totalSpending, true)}<br/>
              Top fornecedor: ${d.topSuppliers[0]?.pct.toFixed(1) || 0}%
            </div>
          `);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        tooltip.style('opacity', 0);
      })
      .transition()
      .duration(800)
      .delay((_, i) => i * 50)
      .attr('width', (d) => xScale(d.hhi.value));

    // Y axis (deputy names)
    g.append('g')
      .attr('class', 'y-axis')
      .call(
        d3.axisLeft(yScale)
          .tickFormat((d) => abbreviateName(d as string))
      )
      .selectAll('text')
      .attr('fill', themeColors.chartAxis)
      .style('font-size', '11px');

    g.selectAll('.y-axis path, .y-axis line').attr('stroke', themeColors.chartGrid);

    // X axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickFormat((d) => `${d}`)
      )
      .selectAll('text')
      .attr('fill', themeColors.chartAxis);

    g.selectAll('.x-axis path, .x-axis line').attr('stroke', themeColors.chartGrid);

    // HHI value labels
    g.selectAll('.hhi-label')
      .data(chartData)
      .enter()
      .append('text')
      .attr('class', 'hhi-label')
      .attr('x', (d) => xScale(d.hhi.value) + 8)
      .attr('y', (d) => yScale(d.name)! + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', themeColors.chartAxis)
      .attr('font-size', '11px')
      .attr('font-family', '"JetBrains Mono", monospace')
      .attr('opacity', 0)
      .text((d) => d.hhi.value.toFixed(0))
      .transition()
      .duration(800)
      .delay((_, i) => i * 50 + 400)
      .attr('opacity', 1);

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 110}, ${margin.top})`);

    const legendItems = [
      { label: 'Critico (>3000)', color: themeColors.accentRed },
      { label: 'Alto (2500-3000)', color: themeColors.accentAmber },
      { label: 'Medio (1500-2500)', color: themeColors.accentTeal },
      { label: 'Baixo (<1500)', color: themeColors.statusLow },
    ];

    legendItems.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 22})`);

      legendRow.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', item.color)
        .attr('rx', 2);

      legendRow.append('text')
        .attr('x', 18)
        .attr('y', 10)
        .attr('fill', themeColors.chartAxis)
        .attr('font-size', '10px')
        .text(item.label);
    });

  }, [chartData, height, themeColors]);

  return (
    <div className="relative chart-container">
      <svg ref={svgRef} />
      <div
        ref={tooltipRef}
        className="tooltip"
        style={{ opacity: 0 }}
      />
    </div>
  );
}

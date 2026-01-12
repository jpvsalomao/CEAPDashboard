import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy, CategoryData } from '../../types/data';
import { formatReais } from '../../utils/formatters';
import { colors } from '../../utils/colors';

interface CategoryBreakdownIndividualProps {
  deputy: Deputy;
  aggregatedCategories: CategoryData[];
  height?: number;
}

const categoryColors = [
  '#4AA3A0', // Teal
  '#E5A84B', // Amber
  '#4A7C9B', // Blue
  '#DC4A4A', // Red
  '#2ECC71', // Green
  '#9B59B6', // Purple
  '#3498DB', // Light blue
  '#E67E22', // Orange
  '#1ABC9C', // Cyan
  '#F39C12', // Yellow
];

export function CategoryBreakdownIndividual({
  deputy,
  aggregatedCategories,
  height = 400,
}: CategoryBreakdownIndividualProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Merge deputy categories with overall averages
  const mergedData = useMemo(() => {
    if (!deputy.byCategory?.length || !aggregatedCategories.length) {
      return [];
    }

    // Create map of overall category percentages
    const overallPcts: Record<string, number> = {};
    aggregatedCategories.forEach((c) => {
      overallPcts[c.category] = c.pct;
    });

    // Merge and calculate differences
    return deputy.byCategory
      .map((dc) => ({
        category: dc.category,
        deputyValue: dc.value,
        deputyPct: dc.pct,
        overallPct: overallPcts[dc.category] || 0,
        difference: dc.pct - (overallPcts[dc.category] || 0),
        transactionCount: dc.transactionCount,
      }))
      .sort((a, b) => b.deputyPct - a.deputyPct)
      .slice(0, 10); // Top 10 categories
  }, [deputy.byCategory, aggregatedCategories]);

  // Find significant deviations
  const insights = useMemo(() => {
    if (!mergedData.length) return null;

    const highDeviation = mergedData.filter((d) => d.difference > 10);
    const lowDeviation = mergedData.filter((d) => d.difference < -10);
    const topCategory = mergedData[0];

    return {
      highDeviation,
      lowDeviation,
      topCategory,
      hasDeviations: highDeviation.length > 0 || lowDeviation.length > 0,
    };
  }, [mergedData]);

  useEffect(() => {
    if (!mergedData.length || !svgRef.current || !containerRef.current || !tooltipRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const margin = { top: 20, right: 150, bottom: 40, left: 200 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const maxPct = Math.max(
      d3.max(mergedData, (d) => d.deputyPct) || 0,
      d3.max(mergedData, (d) => d.overallPct) || 0
    );

    const xScale = d3.scaleLinear().domain([0, maxPct * 1.1]).range([0, innerWidth]);

    const yScale = d3
      .scaleBand<string>()
      .domain(mergedData.map((d) => d.category))
      .range([0, innerHeight])
      .padding(0.3);

    // Color scale
    const colorScale = d3.scaleOrdinal<string>().domain(mergedData.map((d) => d.category)).range(categoryColors);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickSize(innerHeight)
          .tickFormat(() => '')
      )
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g.selectAll('.tick line').attr('stroke', '#2a2b35').attr('stroke-opacity', 0.5)
      );

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickFormat((d) => `${d}%`)
      )
      .call((g) => g.select('.domain').attr('stroke', '#3a3b45'))
      .call((g) => g.selectAll('.tick line').attr('stroke', '#3a3b45'))
      .call((g) => g.selectAll('.tick text').attr('fill', '#A0A3B1').attr('font-size', '11px'));

    // Y axis (category names)
    g.append('g')
      .call(d3.axisLeft(yScale))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').remove())
      .call((g) =>
        g
          .selectAll('.tick text')
          .attr('fill', '#FAFAFA')
          .attr('font-size', '11px')
          .each(function () {
            const text = d3.select(this);
            const fullText = text.text();
            if (fullText.length > 25) {
              text.text(fullText.substring(0, 22) + '...');
            }
          })
      );

    // Overall average bars (background)
    g.selectAll('.bar-overall')
      .data(mergedData)
      .enter()
      .append('rect')
      .attr('class', 'bar-overall')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.category) || 0)
      .attr('height', yScale.bandwidth())
      .attr('fill', colors.bgSecondary)
      .attr('rx', 3)
      .attr('width', 0)
      .transition()
      .duration(600)
      .attr('width', (d) => xScale(d.overallPct));

    // Deputy bars (foreground)
    const bars = g
      .selectAll('.bar-deputy')
      .data(mergedData)
      .enter()
      .append('rect')
      .attr('class', 'bar-deputy')
      .attr('x', 0)
      .attr('y', (d) => (yScale(d.category) || 0) + yScale.bandwidth() * 0.2)
      .attr('height', yScale.bandwidth() * 0.6)
      .attr('fill', (d) => colorScale(d.category))
      .attr('rx', 3)
      .attr('width', 0);

    bars
      .transition()
      .duration(800)
      .delay((_, i) => i * 50)
      .attr('width', (d) => xScale(d.deputyPct));

    // Difference indicators
    g.selectAll('.diff-indicator')
      .data(mergedData)
      .enter()
      .append('text')
      .attr('class', 'diff-indicator')
      .attr('x', (d) => xScale(Math.max(d.deputyPct, d.overallPct)) + 8)
      .attr('y', (d) => (yScale(d.category) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', (d) =>
        d.difference > 5 ? '#E5A84B' : d.difference < -5 ? '#4AA3A0' : '#6B7280'
      )
      .attr('opacity', 0)
      .text((d) => `${d.difference > 0 ? '+' : ''}${d.difference.toFixed(1)}%`)
      .transition()
      .duration(400)
      .delay((_, i) => 800 + i * 50)
      .attr('opacity', 1);

    // Tooltip interactions
    bars
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.8);

        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`).html(`
            <div class="tooltip-title">${d.category}</div>
            <div class="space-y-1 mt-2">
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">${deputy.name}:</span>
                <span class="font-mono">${d.deputyPct.toFixed(1)}%</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Valor:</span>
                <span class="font-mono">${formatReais(d.deputyValue, true)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Media geral:</span>
                <span class="font-mono">${d.overallPct.toFixed(1)}%</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Diferenca:</span>
                <span class="font-mono ${d.difference > 5 ? 'text-accent-amber' : d.difference < -5 ? 'text-accent-teal' : ''}">${d.difference > 0 ? '+' : ''}${d.difference.toFixed(1)}%</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Transacoes:</span>
                <span>${d.transactionCount.toLocaleString('pt-BR')}</span>
              </div>
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
      });

    // Legend
    const legend = svg
      .append('g')
      .attr('transform', `translate(${width - margin.right + 20}, ${margin.top})`);

    legend
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 16)
      .attr('height', 12)
      .attr('rx', 2)
      .attr('fill', colors.accentTeal);

    legend
      .append('text')
      .attr('x', 22)
      .attr('y', 10)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text('Deputado');

    legend
      .append('rect')
      .attr('x', 0)
      .attr('y', 20)
      .attr('width', 16)
      .attr('height', 12)
      .attr('rx', 2)
      .attr('fill', colors.bgSecondary);

    legend
      .append('text')
      .attr('x', 22)
      .attr('y', 30)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text('Media Geral');

    // X axis label
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '11px')
      .text('Porcentagem do Total de Gastos');
  }, [mergedData, height, deputy.name]);

  if (!deputy.byCategory?.length) {
    return (
      <div className="p-4 text-center text-text-muted">
        Dados de categoria nao disponiveis para este deputado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">
          Distribuicao por Categoria
        </h3>
        <p className="text-sm text-text-muted">
          Como {deputy.name} distribui gastos comparado a media geral
        </p>
      </div>

      {/* Insights */}
      {insights?.hasDeviations && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.highDeviation.length > 0 && (
            <div className="p-3 bg-accent-amber/10 border border-accent-amber/30 rounded-lg">
              <p className="text-xs text-accent-amber uppercase tracking-wide font-medium">
                Acima da Media
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {insights.highDeviation
                  .slice(0, 3)
                  .map((d) => d.category.split(' ').slice(0, 3).join(' '))
                  .join(', ')}
              </p>
            </div>
          )}
          {insights.lowDeviation.length > 0 && (
            <div className="p-3 bg-accent-teal/10 border border-accent-teal/30 rounded-lg">
              <p className="text-xs text-accent-teal uppercase tracking-wide font-medium">
                Abaixo da Media
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {insights.lowDeviation
                  .slice(0, 3)
                  .map((d) => d.category.split(' ').slice(0, 3).join(' '))
                  .join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div ref={containerRef} className="relative">
        <svg ref={svgRef} className="w-full" />
        <div ref={tooltipRef} className="tooltip" style={{ opacity: 0 }} />
      </div>

      <p className="text-xs text-text-muted text-center">
        Barras escuras mostram a media geral. Diferenca em destaque quando {'>'} 5%.
      </p>
    </div>
  );
}

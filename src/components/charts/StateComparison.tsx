import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { formatReais } from '../../utils/formatters';

interface StateDataItem {
  uf: string;
  value: number;
  deputyCount: number;
  avgPerDeputy: number;
}

interface StateComparisonProps {
  data: StateDataItem[];
  height?: number;
  metric?: 'total' | 'average';
}

// Brazilian state to region mapping
const stateToRegion: Record<string, string> = {
  // Norte
  AC: 'Norte', AM: 'Norte', AP: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  // Nordeste
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste',
  PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  // Centro-Oeste
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MS: 'Centro-Oeste', MT: 'Centro-Oeste',
  // Sudeste
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  // Sul
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
};

const regionColors: Record<string, string> = {
  Norte: '#4AA3A0',      // Teal
  Nordeste: '#E5A84B',   // Amber
  'Centro-Oeste': '#4A7C9B', // Blue
  Sudeste: '#DC4A4A',    // Red
  Sul: '#2ECC71',        // Green
};

const regionOrder = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

export function StateComparison({
  data,
  height = 500,
  metric = 'total',
}: StateComparisonProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const margin = { top: 20, right: 100, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Add region to data and sort
    const enrichedData = data.map((d) => ({
      ...d,
      region: stateToRegion[d.uf] || 'Outros',
    }));

    // Group by region, then sort by value within each region
    const sortedData = enrichedData
      .sort((a, b) => {
        const regionDiff = regionOrder.indexOf(a.region) - regionOrder.indexOf(b.region);
        if (regionDiff !== 0) return regionDiff;
        const aVal = metric === 'average' ? a.avgPerDeputy : a.value;
        const bVal = metric === 'average' ? b.avgPerDeputy : b.value;
        return bVal - aVal;
      });

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    // Clear previous
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const getValue = (d: typeof sortedData[0]) =>
      metric === 'average' ? d.avgPerDeputy : d.value;
    const maxValue = d3.max(sortedData, getValue) || 0;

    const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, innerWidth]);

    const yScale = d3
      .scaleBand<string>()
      .domain(sortedData.map((d) => d.uf))
      .range([0, innerHeight])
      .padding(0.2);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickFormat((d) => formatReais(d as number, true))
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
          .attr('font-weight', '500')
      );

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickSize(innerHeight)
          .tickFormat(() => '')
      )
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g.selectAll('.tick line').attr('stroke', '#2a2b35').attr('stroke-opacity', 0.5)
      );

    // Region separators and labels
    let currentRegion = '';
    let regionStartY = 0;
    const regionBounds: { region: string; startY: number; endY: number }[] = [];

    sortedData.forEach((d, i) => {
      if (d.region !== currentRegion) {
        if (currentRegion) {
          regionBounds.push({
            region: currentRegion,
            startY: regionStartY,
            endY: (yScale(sortedData[i - 1].uf) || 0) + yScale.bandwidth(),
          });
        }
        currentRegion = d.region;
        regionStartY = yScale(d.uf) || 0;
      }
      if (i === sortedData.length - 1) {
        regionBounds.push({
          region: currentRegion,
          startY: regionStartY,
          endY: (yScale(d.uf) || 0) + yScale.bandwidth(),
        });
      }
    });

    // Draw region labels on right side
    regionBounds.forEach((rb) => {
      const midY = (rb.startY + rb.endY) / 2;
      g.append('text')
        .attr('x', innerWidth + 50)
        .attr('y', midY)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', regionColors[rb.region] || '#6B7280')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('transform', `rotate(-90, ${innerWidth + 50}, ${midY})`)
        .text(rb.region);

      // Region indicator line
      g.append('line')
        .attr('x1', innerWidth + 25)
        .attr('x2', innerWidth + 25)
        .attr('y1', rb.startY)
        .attr('y2', rb.endY)
        .attr('stroke', regionColors[rb.region] || '#6B7280')
        .attr('stroke-width', 3)
        .attr('opacity', 0.6);
    });

    // Bars
    const bars = g
      .selectAll('.bar')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.uf) || 0)
      .attr('height', yScale.bandwidth())
      .attr('fill', (d) => regionColors[d.region] || '#4AA3A0')
      .attr('rx', 3)
      .attr('width', 0);

    // Animate bars
    bars
      .transition()
      .duration(800)
      .delay((_, i) => i * 30)
      .ease(d3.easeCubicOut)
      .attr('width', (d) => xScale(getValue(d)));

    // Value labels
    g.selectAll('.value-label')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', (d) => xScale(getValue(d)) + 8)
      .attr('y', (d) => (yScale(d.uf) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('opacity', 0)
      .text((d) => formatReais(getValue(d), true))
      .transition()
      .duration(400)
      .delay((_, i) => 800 + i * 30)
      .attr('opacity', 1);

    // Tooltip interactions
    bars
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.8);

        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`).html(`
            <div class="tooltip-title">${d.uf} - ${d.region}</div>
            <div class="space-y-1 mt-2">
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Total:</span>
                <span class="font-mono">${formatReais(d.value, true)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Deputados:</span>
                <span>${d.deputyCount}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-text-muted">Media/dep:</span>
                <span class="font-mono">${formatReais(d.avgPerDeputy, true)}</span>
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

    // Axis label
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '11px')
      .text(metric === 'average' ? 'Gasto medio por deputado' : 'Gasto total do estado');
  }, [data, height, metric]);

  return (
    <div className="relative" ref={containerRef}>
      <svg ref={svgRef} className="w-full" />
      <div ref={tooltipRef} className="tooltip" style={{ opacity: 0 }} />
    </div>
  );
}

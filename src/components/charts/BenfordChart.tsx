import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useThemeColors } from '../../utils/colors';

interface BenfordChartProps {
  height?: number;
  // Optional observed data - if not provided, shows expected distribution
  observedData?: { digit: number; observed: number }[];
}

// Benford's Law expected distribution
const expectedBenford = [
  { digit: 1, expected: 30.1 },
  { digit: 2, expected: 17.6 },
  { digit: 3, expected: 12.5 },
  { digit: 4, expected: 9.7 },
  { digit: 5, expected: 7.9 },
  { digit: 6, expected: 6.7 },
  { digit: 7, expected: 5.8 },
  { digit: 8, expected: 5.1 },
  { digit: 9, expected: 4.6 },
];

export function BenfordChart({ height = 300, observedData }: BenfordChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const themeColors = useThemeColors();

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    const container = svgRef.current.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    svg.selectAll('*').remove();

    // Set dimensions
    svg.attr('width', width).attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Merge expected with observed data
    const chartData = expectedBenford.map((d) => {
      const obs = observedData?.find((o) => o.digit === d.digit);
      return {
        digit: d.digit,
        expected: d.expected,
        observed: obs?.observed ?? d.expected, // Default to expected if no observed
      };
    });

    // Scales
    const xScale = d3.scaleBand()
      .domain(chartData.map((d) => d.digit.toString()))
      .range([0, innerWidth])
      .padding(0.3);

    const maxVal = Math.max(
      d3.max(chartData, (d) => Math.max(d.expected, d.observed)) || 35,
      35
    );

    const yScale = d3.scaleLinear()
      .domain([0, maxVal])
      .nice()
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', themeColors.chartGrid)
      .attr('stroke-dasharray', '2');

    g.selectAll('.grid path').attr('stroke', 'none');

    // Expected distribution bars (background)
    g.selectAll('.bar-expected')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar-expected')
      .attr('x', (d) => xScale(d.digit.toString())!)
      .attr('y', innerHeight)
      .attr('width', xScale.bandwidth())
      .attr('fill', themeColors.accentTeal)
      .attr('opacity', 0.3)
      .attr('rx', 4)
      .transition()
      .duration(800)
      .attr('y', (d) => yScale(d.expected))
      .attr('height', (d) => innerHeight - yScale(d.expected));

    // Observed distribution bars (foreground)
    if (observedData) {
      const barWidth = xScale.bandwidth() * 0.6;
      const barOffset = (xScale.bandwidth() - barWidth) / 2;

      g.selectAll('.bar-observed')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar-observed')
        .attr('x', (d) => xScale(d.digit.toString())! + barOffset)
        .attr('y', innerHeight)
        .attr('width', barWidth)
        .attr('rx', 3)
        .attr('fill', (d) => {
          // Highlight significant deviations
          const deviation = Math.abs(d.observed - d.expected);
          if (deviation > 5) return themeColors.accentRed;
          if (deviation > 2) return themeColors.accentAmber;
          return themeColors.accentBlue;
        })
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('opacity', 0.8);
          const deviation = d.observed - d.expected;
          tooltip
            .style('opacity', 1)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .html(`
              <div class="tooltip-title">Digito ${d.digit}</div>
              <div class="tooltip-value">${d.observed.toFixed(1)}%</div>
              <div class="tooltip-label">observado</div>
              <div class="mt-2 text-xs text-text-secondary">
                Esperado: ${d.expected.toFixed(1)}%<br/>
                Desvio: ${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%
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
        .attr('y', (d) => yScale(d.observed))
        .attr('height', (d) => innerHeight - yScale(d.observed));
    }

    // Expected line (connecting dots)
    const line = d3.line<(typeof chartData)[0]>()
      .x((d) => xScale(d.digit.toString())! + xScale.bandwidth() / 2)
      .y((d) => yScale(d.expected))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', themeColors.accentTeal)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', line);

    // Expected dots
    g.selectAll('.dot-expected')
      .data(chartData)
      .enter()
      .append('circle')
      .attr('class', 'dot-expected')
      .attr('cx', (d) => xScale(d.digit.toString())! + xScale.bandwidth() / 2)
      .attr('cy', (d) => yScale(d.expected))
      .attr('r', 4)
      .attr('fill', themeColors.accentTeal)
      .attr('stroke', themeColors.chartDotStroke)
      .attr('stroke-width', 2);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', themeColors.chartAxis)
      .style('font-size', '12px');

    g.selectAll('.domain').attr('stroke', themeColors.chartGrid);

    // Y axis
    g.append('g')
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat((d) => `${d}%`)
      )
      .selectAll('text')
      .attr('fill', themeColors.chartAxis);

    // X axis label
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', themeColors.chartAxis)
      .attr('font-size', '12px')
      .text('Primeiro Digito');

    // Y axis label
    svg.append('text')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('fill', themeColors.chartAxis)
      .attr('font-size', '12px')
      .text('Frequencia (%)');

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${margin.left + 10}, ${margin.top})`);

    legend.append('line')
      .attr('x1', 0)
      .attr('x2', 20)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', themeColors.accentTeal)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

    legend.append('text')
      .attr('x', 25)
      .attr('y', 4)
      .attr('fill', themeColors.chartAxis)
      .attr('font-size', '11px')
      .text('Esperado (Lei de Benford)');

    if (observedData) {
      legend.append('rect')
        .attr('x', 0)
        .attr('y', 15)
        .attr('width', 20)
        .attr('height', 10)
        .attr('fill', themeColors.accentBlue)
        .attr('rx', 2);

      legend.append('text')
        .attr('x', 25)
        .attr('y', 23)
        .attr('fill', themeColors.chartAxis)
        .attr('font-size', '11px')
        .text('Observado');
    }

  }, [height, observedData, themeColors]);

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

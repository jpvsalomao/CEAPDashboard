import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import type { StateData } from '../../types/data';
import { formatReais, formatNumber } from '../../utils/formatters';

// Brazil GeoJSON simplified - all 27 states with approximate centroids
// Each state represented as a simplified polygon for visualization
const BRAZIL_STATES: Record<string, { name: string; centroid: [number, number]; region: string }> = {
  AC: { name: 'Acre', centroid: [-70.5, -9.0], region: 'Norte' },
  AL: { name: 'Alagoas', centroid: [-36.6, -9.5], region: 'Nordeste' },
  AM: { name: 'Amazonas', centroid: [-64.0, -4.0], region: 'Norte' },
  AP: { name: 'Amapa', centroid: [-51.5, 1.5], region: 'Norte' },
  BA: { name: 'Bahia', centroid: [-41.5, -12.5], region: 'Nordeste' },
  CE: { name: 'Ceara', centroid: [-39.5, -5.0], region: 'Nordeste' },
  DF: { name: 'Distrito Federal', centroid: [-47.9, -15.8], region: 'Centro-Oeste' },
  ES: { name: 'Espirito Santo', centroid: [-40.5, -19.5], region: 'Sudeste' },
  GO: { name: 'Goias', centroid: [-49.5, -16.0], region: 'Centro-Oeste' },
  MA: { name: 'Maranhao', centroid: [-45.0, -5.0], region: 'Nordeste' },
  MG: { name: 'Minas Gerais', centroid: [-44.5, -18.5], region: 'Sudeste' },
  MS: { name: 'Mato Grosso do Sul', centroid: [-55.0, -21.0], region: 'Centro-Oeste' },
  MT: { name: 'Mato Grosso', centroid: [-55.5, -13.0], region: 'Centro-Oeste' },
  PA: { name: 'Para', centroid: [-52.5, -4.0], region: 'Norte' },
  PB: { name: 'Paraiba', centroid: [-36.5, -7.0], region: 'Nordeste' },
  PE: { name: 'Pernambuco', centroid: [-37.5, -8.5], region: 'Nordeste' },
  PI: { name: 'Piaui', centroid: [-42.5, -7.5], region: 'Nordeste' },
  PR: { name: 'Parana', centroid: [-51.5, -25.0], region: 'Sul' },
  RJ: { name: 'Rio de Janeiro', centroid: [-43.2, -22.5], region: 'Sudeste' },
  RN: { name: 'Rio Grande do Norte', centroid: [-36.5, -5.5], region: 'Nordeste' },
  RO: { name: 'Rondonia', centroid: [-63.0, -10.5], region: 'Norte' },
  RR: { name: 'Roraima', centroid: [-61.0, 2.0], region: 'Norte' },
  RS: { name: 'Rio Grande do Sul', centroid: [-53.5, -29.5], region: 'Sul' },
  SC: { name: 'Santa Catarina', centroid: [-49.5, -27.5], region: 'Sul' },
  SE: { name: 'Sergipe', centroid: [-37.5, -10.5], region: 'Nordeste' },
  SP: { name: 'Sao Paulo', centroid: [-48.5, -22.5], region: 'Sudeste' },
  TO: { name: 'Tocantins', centroid: [-48.0, -10.0], region: 'Norte' },
};

// Region colors
const REGION_COLORS: Record<string, string> = {
  Norte: '#4AA3A0',
  Nordeste: '#E5A84B',
  'Centro-Oeste': '#DC4A4A',
  Sudeste: '#4A7C9B',
  Sul: '#2ECC71',
};

interface BrazilChoroplethProps {
  data: StateData[];
  height?: number;
  metric?: 'total' | 'average' | 'deputies';
}

export function BrazilChoropleth({
  data,
  height = 500,
  metric = 'total',
}: BrazilChoroplethProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Process data for visualization
  const processedData = useMemo(() => {
    const dataMap = new Map<string, StateData>();
    data.forEach(d => dataMap.set(d.uf, d));

    return Object.entries(BRAZIL_STATES).map(([uf, info]) => {
      const stateData = dataMap.get(uf);
      return {
        uf,
        ...info,
        value: stateData?.value ?? 0,
        deputyCount: stateData?.deputyCount ?? 0,
        avgPerDeputy: stateData?.avgPerDeputy ?? 0,
      };
    });
  }, [data]);

  // Calculate min/max for color scale
  const { minValue, maxValue, colorScale } = useMemo(() => {
    const values = processedData.map(d => {
      if (metric === 'total') return d.value;
      if (metric === 'average') return d.avgPerDeputy;
      return d.deputyCount;
    }).filter(v => v > 0);

    const min = d3.min(values) ?? 0;
    const max = d3.max(values) ?? 1;

    const scale = d3.scaleSequential()
      .domain([min, max])
      .interpolator(d3.interpolateBlues);

    return { minValue: min, maxValue: max, colorScale: scale };
  }, [processedData, metric]);

  // Get value based on metric
  const getValue = (d: typeof processedData[0]) => {
    if (metric === 'total') return d.value;
    if (metric === 'average') return d.avgPerDeputy;
    return d.deputyCount;
  };

  // Format value for display
  const formatValue = (value: number) => {
    if (metric === 'deputies') return formatNumber(value);
    return formatReais(value, true);
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('*').remove();

    // Brazil bounds (approximate)
    const xMin = -74;
    const xMax = -34;
    const yMin = -34;
    const yMax = 6;

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([50, width - 50]);

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([height - 50, 50]);

    // Circle size scale
    const sizeScale = d3.scaleSqrt()
      .domain([0, maxValue])
      .range([15, 50]);

    // Main group
    const g = svg.append('g');

    // Draw state bubbles
    const bubbles = g.selectAll('.state-bubble')
      .data(processedData)
      .join('g')
      .attr('class', 'state-bubble')
      .attr('transform', d => `translate(${xScale(d.centroid[0])}, ${yScale(d.centroid[1])})`);

    // Background circle (region color)
    bubbles.append('circle')
      .attr('r', d => sizeScale(getValue(d)) + 2)
      .attr('fill', d => REGION_COLORS[d.region])
      .attr('opacity', 0.3);

    // Main circle (value color)
    bubbles.append('circle')
      .attr('r', d => Math.max(sizeScale(getValue(d)), 12))
      .attr('fill', d => {
        const val = getValue(d);
        return val > 0 ? colorScale(val) : '#2a2b33';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 3);

        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX - container.getBoundingClientRect().left + 10}px`)
          .style('top', `${event.pageY - container.getBoundingClientRect().top - 10}px`)
          .html(`
            <div class="tooltip-title">${d.name} (${d.uf})</div>
            <div class="tooltip-label">${d.region}</div>
            <div style="margin-top: 8px;">
              <div class="tooltip-value">${formatReais(d.value, true)}</div>
              <div class="tooltip-label">Total de gastos</div>
            </div>
            <div style="margin-top: 4px;">
              <div class="tooltip-value">${formatNumber(d.deputyCount)}</div>
              <div class="tooltip-label">Deputados</div>
            </div>
            <div style="margin-top: 4px;">
              <div class="tooltip-value">${formatReais(d.avgPerDeputy, true)}</div>
              <div class="tooltip-label">Média por deputado</div>
            </div>
          `);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', `${event.pageX - container.getBoundingClientRect().left + 10}px`)
          .style('top', `${event.pageY - container.getBoundingClientRect().top - 10}px`);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 1.5);

        tooltip.style('opacity', 0);
      });

    // State labels
    bubbles.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text(d => d.uf);

    // Legend
    const legendWidth = 200;
    const legendHeight = 12;
    const legendX = width - legendWidth - 20;
    const legendY = height - 40;

    // Legend gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'choropleth-gradient');

    const gradientStops = d3.range(0, 1.01, 0.1);
    gradientStops.forEach(t => {
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(minValue + t * (maxValue - minValue)));
    });

    // Legend rect
    svg.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#choropleth-gradient)')
      .attr('rx', 2);

    // Legend labels
    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 5)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text(formatValue(minValue));

    svg.append('text')
      .attr('x', legendX + legendWidth)
      .attr('y', legendY - 5)
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .attr('text-anchor', 'end')
      .text(formatValue(maxValue));

    // Region legend
    const regionLegendY = 30;
    const regions = Object.entries(REGION_COLORS);

    regions.forEach(([region, color], i) => {
      const x = 20 + i * 100;
      svg.append('circle')
        .attr('cx', x)
        .attr('cy', regionLegendY)
        .attr('r', 6)
        .attr('fill', color)
        .attr('opacity', 0.7);

      svg.append('text')
        .attr('x', x + 12)
        .attr('y', regionLegendY + 4)
        .attr('fill', '#A0A3B1')
        .attr('font-size', '11px')
        .text(region);
    });

  }, [processedData, metric, height, colorScale, minValue, maxValue, formatValue]);

  // Metric labels
  const metricLabels = {
    total: 'Total de Gastos',
    average: 'Média por Deputado',
    deputies: 'Número de Deputados',
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Distribuição Geográfica
          </h3>
          <p className="text-sm text-text-muted">
            {metricLabels[metric]} por estado
          </p>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="overflow-visible"
        />
        <div
          ref={tooltipRef}
          className="tooltip"
          style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
        />
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
        {['Sudeste', 'Nordeste', 'Sul', 'Norte', 'Centro-Oeste'].map(region => {
          const regionData = processedData.filter(d => d.region === region);
          const total = regionData.reduce((sum, d) => sum + d.value, 0);
          return (
            <div key={region} className="bg-bg-secondary rounded-lg p-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: REGION_COLORS[region] }}
                />
                <span className="text-xs text-text-muted">{region}</span>
              </div>
              <p className="text-sm font-semibold text-text-primary">
                {formatReais(total, true)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

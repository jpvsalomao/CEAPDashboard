import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import type { Deputy } from '../../types/data';
import { colors, getRiskLevelColor } from '../../utils/colors';
import { formatReais, formatNumber } from '../../utils/formatters';
import { FEATURES } from '../../config/features';
import { getStandardMargins, getResponsiveFontSizes, isTouchDevice } from '../../utils/responsive';

type XMetric = 'spending' | 'transactions' | 'supplierCount' | 'attendanceRate' | 'mandateCount';
type YMetric = 'hhi' | 'roundValuePct' | 'benfordChi2' | 'attendanceRate' | 'age' | 'spending';
type ColorBy = 'riskLevel' | 'party' | 'uf';

interface ScatterPlotProps {
  deputies: Deputy[];
  height?: number;
}

const X_METRIC_LABELS: Record<XMetric, string> = {
  spending: 'Gasto Total (R$)',
  transactions: 'Número de Transações',
  supplierCount: 'Número de Fornecedores',
  attendanceRate: 'Taxa de Presença (%)',
  mandateCount: 'Número de Mandatos',
};

const Y_METRIC_LABELS: Record<YMetric, string> = {
  hhi: 'Índice HHI',
  roundValuePct: '% Valores Redondos',
  benfordChi2: 'Chi-quadrado Benford',
  attendanceRate: 'Taxa de Presença (%)',
  age: 'Idade (anos)',
  spending: 'Gasto Total (R$)',
};

export function ScatterPlot({ deputies, height = 400 }: ScatterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [xMetric, setXMetric] = useState<XMetric>('spending');
  const [yMetric, setYMetric] = useState<YMetric>('hhi');
  const [colorBy, setColorBy] = useState<ColorBy>('riskLevel');

  // Prepare data with computed values
  const scatterData = useMemo(() => {
    if (!deputies.length) return [];

    // Helper to get X metric value - defined INSIDE useMemo to avoid stale closures
    const getXValue = (d: Deputy): number | null => {
      switch (xMetric) {
        case 'spending': return d.totalSpending;
        case 'transactions': return d.transactionCount;
        case 'supplierCount': return d.supplierCount;
        case 'attendanceRate': return d.attendance?.rate ?? null;
        case 'mandateCount': return d.mandateCount ?? null;
      }
    };

    // Helper to get Y metric value - defined INSIDE useMemo to avoid stale closures
    const getYValue = (d: Deputy): number | null => {
      switch (yMetric) {
        case 'hhi': return d.hhi.value;
        case 'roundValuePct': return d.roundValuePct ?? 0;
        case 'benfordChi2': return d.benford?.chi2 ?? 0;
        case 'attendanceRate': return d.attendance?.rate ?? null;
        case 'age': return d.age ?? null;
        case 'spending': return d.totalSpending;
      }
    };

    return deputies
      .filter((d) => d.name && !d.name.includes('LIDERANCA'))
      .map((d) => {
        const x = getXValue(d);
        const y = getYValue(d);
        return {
          id: d.id,
          name: d.name,
          party: d.party,
          uf: d.uf,
          riskLevel: d.riskLevel,
          x,
          y,
          colorValue: colorBy === 'riskLevel'
            ? d.riskLevel
            : colorBy === 'party'
              ? d.party
              : d.uf,
        };
      })
      .filter((d): d is typeof d & { x: number; y: number } =>
        d.x !== null && d.y !== null && d.x >= 0 && d.y >= 0
      );
  }, [deputies, xMetric, yMetric, colorBy]);

  // Color scale based on colorBy selection
  const colorScale = useMemo(() => {
    if (colorBy === 'riskLevel') {
      return (value: string) => getRiskLevelColor(value);
    }

    // For party/state, use a categorical scale
    const uniqueValues = [...new Set(scatterData.map((d) => d.colorValue))];
    const scale = d3.scaleOrdinal<string>()
      .domain(uniqueValues)
      .range(d3.schemeTableau10);

    return (value: string) => scale(value);
  }, [colorBy, scatterData]);

  // Calculate correlation and stats
  const { correlation, xStats, yStats } = useMemo(() => {
    if (scatterData.length < 3) {
      return {
        correlation: 0,
        xStats: { min: 0, max: 0, avg: 0 },
        yStats: { min: 0, max: 0, avg: 0 },
      };
    }

    const xValues = scatterData.map((d) => d.x);
    const yValues = scatterData.map((d) => d.y);

    const xMean = d3.mean(xValues) ?? 0;
    const yMean = d3.mean(yValues) ?? 0;

    let numerator = 0;
    let xDenom = 0;
    let yDenom = 0;

    for (let i = 0; i < scatterData.length; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      numerator += xDiff * yDiff;
      xDenom += xDiff * xDiff;
      yDenom += yDiff * yDiff;
    }

    const denom = Math.sqrt(xDenom * yDenom);
    const r = denom === 0 ? 0 : numerator / denom;

    return {
      correlation: r,
      xStats: {
        min: d3.min(xValues) ?? 0,
        max: d3.max(xValues) ?? 0,
        avg: xMean,
      },
      yStats: {
        min: d3.min(yValues) ?? 0,
        max: d3.max(yValues) ?? 0,
        avg: yMean,
      },
    };
  }, [scatterData]);

  useEffect(() => {
    if (!scatterData.length || !containerRef.current || !svgRef.current || !tooltipRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    // Responsive margins based on container width
    const margin = getStandardMargins(containerWidth);
    const fontSizes = getResponsiveFontSizes(containerWidth);
    const isTouch = isTouchDevice();
    const pointRadius = isTouch ? 8 : 5;
    const hoverRadius = isTouch ? 11 : 8;
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', containerWidth)
      .attr('height', height)
      .attr('viewBox', `0 0 ${containerWidth} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xExtent = d3.extent(scatterData, (d) => d.x) as [number, number];
    const yExtent = d3.extent(scatterData, (d) => d.y) as [number, number];

    const xScale = d3
      .scaleLinear()
      .domain([0, xExtent[1] * 1.05])
      .range([0, width])
      .nice();

    const yScale = d3
      .scaleLinear()
      .domain([0, yExtent[1] * 1.05])
      .range([chartHeight, 0])
      .nice();

    // Tooltip reference
    const tooltip = d3.select(tooltipRef.current);

    // Draw points with touch-friendly sizes
    g.selectAll('.point')
      .data(scatterData)
      .join('circle')
      .attr('class', 'point')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', chartHeight)
      .attr('r', 0)
      .attr('fill', (d) => colorScale(d.colorValue))
      .attr('opacity', 0.7)
      .attr('stroke', colors.bgPrimary)
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter touchstart', function (event, d) {
        event.preventDefault();
        d3.select(this)
          .attr('r', hoverRadius)
          .attr('opacity', 1)
          .attr('stroke-width', 2);

        const xLabel = X_METRIC_LABELS[xMetric];
        const yLabel = Y_METRIC_LABELS[yMetric];

        tooltip
          .style('opacity', 1)
          .html(
            `<div class="tooltip-title font-semibold">${d.name}</div>
             <div class="tooltip-label text-text-muted">${d.party} - ${d.uf}</div>
             <div class="tooltip-divider border-t border-bg-tertiary my-1"></div>
             <div class="tooltip-row flex justify-between gap-4">
               <span class="text-text-muted">${xLabel.split(' ')[0]}:</span>
               <span class="font-medium">${formatMetricValue(d.x, xMetric)}</span>
             </div>
             <div class="tooltip-row flex justify-between gap-4">
               <span class="text-text-muted">${yLabel.split(' ')[0]}:</span>
               <span class="font-medium">${formatMetricValue(d.y, yMetric)}</span>
             </div>
             <div class="tooltip-row flex justify-between gap-4">
               <span class="text-text-muted">Risco:</span>
               <span class="font-medium" style="color: ${getRiskLevelColor(d.riskLevel)}">${d.riskLevel}</span>
             </div>`
          )
          .style('left', `${event.offsetX + 15}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.offsetX + 15}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave touchend', function () {
        d3.select(this)
          .attr('r', pointRadius)
          .attr('opacity', 0.7)
          .attr('stroke-width', 1);
        tooltip.style('opacity', 0);
      })
      .on('click', (_, d) => {
        if (FEATURES.SHOW_DEPUTIES_TAB) {
          navigate(`/deputado/${d.id}`);
        }
      })
      .transition()
      .duration(600)
      .delay((_, i) => Math.min(i * 2, 500))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', pointRadius);

    // X-axis - responsive tick count
    const xTickCount = containerWidth < 400 ? 4 : containerWidth < 640 ? 5 : 6;
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(xTickCount)
      .tickFormat((d) => formatAxisLabel(d as number, xMetric));

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', colors.textSecondary)
      .attr('font-size', `${fontSizes.axis}px`);

    g.select('.x-axis')
      .selectAll('line, path')
      .attr('stroke', colors.textMuted);

    // X-axis label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', chartHeight + margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.textSecondary)
      .attr('font-size', `${fontSizes.label}px`)
      .text(X_METRIC_LABELS[xMetric]);

    // Y-axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(containerWidth < 400 ? 4 : 6)
      .tickFormat((d) => formatAxisLabel(d as number, yMetric));

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', colors.textSecondary)
      .attr('font-size', `${fontSizes.axis}px`);

    g.select('.y-axis')
      .selectAll('line, path')
      .attr('stroke', colors.textMuted);

    // Y-axis label - hide on very small screens
    if (containerWidth >= 400) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -margin.left + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', colors.textSecondary)
        .attr('font-size', `${fontSizes.label}px`)
        .text(Y_METRIC_LABELS[yMetric]);
    }

  }, [scatterData, height, xMetric, yMetric, colorScale, navigate]);

  // Helper functions
  function formatAxisLabel(value: number, metric: XMetric | YMetric): string {
    if (metric === 'spending') {
      return formatReais(value, true);
    }
    if (metric === 'hhi' || metric === 'benfordChi2') {
      return formatNumber(value);
    }
    if (metric === 'roundValuePct' || metric === 'attendanceRate') {
      return `${value.toFixed(0)}%`;
    }
    if (metric === 'mandateCount') {
      return `${value.toFixed(0)}`;
    }
    if (metric === 'age') {
      return `${value.toFixed(0)}`;
    }
    return formatNumber(value);
  }

  function formatMetricValue(value: number, metric: XMetric | YMetric): string {
    if (metric === 'spending') {
      return formatReais(value);
    }
    if (metric === 'roundValuePct' || metric === 'attendanceRate') {
      return `${value.toFixed(1)}%`;
    }
    if (metric === 'mandateCount') {
      return `${value.toFixed(0)} mandato${value !== 1 ? 's' : ''}`;
    }
    if (metric === 'age') {
      return `${value.toFixed(0)} anos`;
    }
    return formatNumber(value);
  }

  if (!deputies.length) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Sem dados disponíveis
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: Title + Controls + Export */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              Correlação de Métricas
            </h3>
            <p className="text-sm text-text-muted">
              {scatterData.length} deputados | Correlação:{' '}
              <span className={`font-medium ${correlation > 0.3 ? 'text-accent-amber' : correlation < -0.3 ? 'text-accent-teal' : 'text-text-secondary'}`}>
                r = {correlation.toFixed(3)}
              </span>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <select
            value={xMetric}
            onChange={(e) => setXMetric(e.target.value as XMetric)}
            className="px-3 py-1.5 text-sm bg-bg-secondary text-text-primary border border-bg-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-teal/50"
          >
            <option value="spending">Eixo X: Gastos</option>
            <option value="transactions">Eixo X: Transações</option>
            <option value="supplierCount">Eixo X: Fornecedores</option>
            <option value="attendanceRate">Eixo X: Presença (%)</option>
            <option value="mandateCount">Eixo X: Mandatos</option>
          </select>

          <select
            value={yMetric}
            onChange={(e) => setYMetric(e.target.value as YMetric)}
            className="px-3 py-1.5 text-sm bg-bg-secondary text-text-primary border border-bg-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-teal/50"
          >
            <option value="hhi">Eixo Y: HHI</option>
            <option value="roundValuePct">Eixo Y: % Redondos</option>
            <option value="benfordChi2">Eixo Y: Benford Chi2</option>
            <option value="attendanceRate">Eixo Y: Presença (%)</option>
            <option value="age">Eixo Y: Idade</option>
            <option value="spending">Eixo Y: Gastos</option>
          </select>

          <select
            value={colorBy}
            onChange={(e) => setColorBy(e.target.value as ColorBy)}
            className="px-3 py-1.5 text-sm bg-bg-secondary text-text-primary border border-bg-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-teal/50"
          >
            <option value="riskLevel">Cor: Risco</option>
            <option value="party">Cor: Partido</option>
            <option value="uf">Cor: Estado</option>
          </select>
        </div>
      </div>

      {/* Quick Stats - Responsive layout that stacks on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-3 py-2 bg-bg-secondary/50 rounded-lg text-xs overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-text-muted uppercase w-full sm:w-auto">GASTO</span>
          <span className="text-text-muted">Min: <span className="font-mono text-text-secondary">{formatMetricValue(xStats.min, xMetric)}</span></span>
          <span className="text-text-muted">Média: <span className="font-mono text-accent-teal">{formatMetricValue(xStats.avg, xMetric)}</span></span>
          <span className="text-text-muted">Max: <span className="font-mono text-text-secondary">{formatMetricValue(xStats.max, xMetric)}</span></span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-text-muted uppercase w-full sm:w-auto">ÍNDICE</span>
          <span className="text-text-muted">Min: <span className="font-mono text-text-secondary">{formatMetricValue(yStats.min, yMetric)}</span></span>
          <span className="text-text-muted">Média: <span className="font-mono text-accent-teal">{formatMetricValue(yStats.avg, yMetric)}</span></span>
          <span className="text-text-muted">Max: <span className="font-mono text-text-secondary">{formatMetricValue(yStats.max, yMetric)}</span></span>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="chart-container relative">
        <svg ref={svgRef} />
        <div
          ref={tooltipRef}
          className="tooltip absolute pointer-events-none bg-bg-secondary border border-bg-tertiary rounded-lg px-3 py-2 text-sm shadow-lg z-10"
          style={{ opacity: 0 }}
        />
      </div>

      {/* Legend */}
      {colorBy === 'riskLevel' && (
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          {['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'].map((level) => (
            <div key={level} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getRiskLevelColor(level) }}
              />
              <span className="text-text-muted">{level}</span>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      {FEATURES.SHOW_DEPUTIES_TAB && (
        <p className="text-xs text-text-muted text-center">
          Clique em um ponto para ver o perfil do deputado.
        </p>
      )}
    </div>
  );
}

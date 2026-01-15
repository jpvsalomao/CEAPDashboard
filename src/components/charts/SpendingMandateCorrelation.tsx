import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import type { Deputy } from '../../types/data';
import { colors, getRiskLevelColor } from '../../utils/colors';
import { formatReais, formatNumber } from '../../utils/formatters';
import { FEATURES } from '../../config/features';
import { getStandardMargins, getResponsiveFontSizes, isTouchDevice } from '../../utils/responsive';

interface SpendingMandateCorrelationProps {
  deputies: Deputy[];
  height?: number;
  minSpending?: number; // Minimum spending threshold to exclude outliers
}

interface DataPoint {
  id: number;
  name: string;
  party: string;
  uf: string;
  mandateCount: number;
  totalSpending: number;
  riskLevel: string;
}

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  correlation: number;
  pValue: number;
  n: number;
}

// Calculate linear regression
function calculateRegression(data: DataPoint[]): RegressionResult {
  const n = data.length;
  if (n < 3) {
    return { slope: 0, intercept: 0, rSquared: 0, correlation: 0, pValue: 1, n };
  }

  const xValues = data.map(d => d.mandateCount);
  const yValues = data.map(d => d.totalSpending);

  const xMean = d3.mean(xValues) ?? 0;
  const yMean = d3.mean(yValues) ?? 0;

  let ssXX = 0;
  let ssYY = 0;
  let ssXY = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    ssXX += xDiff * xDiff;
    ssYY += yDiff * yDiff;
    ssXY += xDiff * yDiff;
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = yMean - slope * xMean;

  // R-squared (coefficient of determination)
  const correlation = ssXX === 0 || ssYY === 0 ? 0 : ssXY / Math.sqrt(ssXX * ssYY);
  const rSquared = correlation * correlation;

  // T-statistic for slope significance
  const sse = ssYY - slope * ssXY; // Sum of squared errors
  const mse = n > 2 ? sse / (n - 2) : 0; // Mean squared error
  const seSlope = ssXX > 0 && mse > 0 ? Math.sqrt(mse / ssXX) : 0;
  const tStat = seSlope > 0 ? Math.abs(slope / seSlope) : 0;

  // Approximate p-value using t-distribution (simplified)
  // For n > 30, t-distribution approximates normal
  const df = n - 2;
  let pValue = 1;
  if (tStat > 0 && df > 0) {
    // Simple approximation: p ≈ 2 * (1 - Φ(t)) for large df
    // Using a rough approximation for demonstration
    if (tStat > 3.5) pValue = 0.001;
    else if (tStat > 2.5) pValue = 0.01;
    else if (tStat > 2.0) pValue = 0.05;
    else if (tStat > 1.65) pValue = 0.1;
    else pValue = 0.5;
  }

  return { slope, intercept, rSquared, correlation, pValue, n };
}

export function SpendingMandateCorrelation({
  deputies,
  height = 400,
  minSpending = 100000
}: SpendingMandateCorrelationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const navigate = useNavigate();

  // Prepare and filter data
  const { scatterData, regression, stats } = useMemo(() => {
    const validData: DataPoint[] = deputies
      .filter(d =>
        d.name &&
        !d.name.includes('LIDERANCA') &&
        d.mandateCount !== undefined &&
        d.mandateCount > 0 &&
        d.totalSpending >= minSpending
      )
      .map(d => ({
        id: d.id,
        name: d.name,
        party: d.party,
        uf: d.uf,
        mandateCount: d.mandateCount!,
        totalSpending: d.totalSpending,
        riskLevel: d.riskLevel,
      }));

    const regression = calculateRegression(validData);

    // Calculate stats by mandate count
    const byMandate = d3.group(validData, d => d.mandateCount);
    const mandateStats = Array.from(byMandate.entries())
      .map(([mandate, deps]) => ({
        mandate,
        count: deps.length,
        avgSpending: d3.mean(deps, d => d.totalSpending) ?? 0,
        medianSpending: d3.median(deps, d => d.totalSpending) ?? 0,
      }))
      .sort((a, b) => a.mandate - b.mandate);

    return {
      scatterData: validData,
      regression,
      stats: {
        mandateStats,
        excludedCount: deputies.filter(d => d.totalSpending < minSpending && d.mandateCount).length,
      }
    };
  }, [deputies, minSpending]);

  useEffect(() => {
    if (!scatterData.length || !containerRef.current || !svgRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const margin = getStandardMargins(containerWidth);
    const fontSizes = getResponsiveFontSizes(containerWidth);
    const isTouch = isTouchDevice();
    const pointRadius = isTouch ? 7 : 5;
    const hoverRadius = isTouch ? 10 : 8;
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
    const xExtent = d3.extent(scatterData, d => d.mandateCount) as [number, number];
    const yExtent = d3.extent(scatterData, d => d.totalSpending) as [number, number];

    const xScale = d3.scaleLinear()
      .domain([0.5, (xExtent[1] ?? 7) + 0.5])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, (yExtent[1] ?? 0) * 1.05])
      .range([chartHeight, 0])
      .nice();

    // Create tooltip element (appended to body for proper z-index)
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip';
    tooltipEl.style.opacity = '0';
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.zIndex = '9999';
    document.body.appendChild(tooltipEl);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(xExtent[1] - 1)
          .tickSize(-chartHeight)
          .tickFormat(() => '')
      )
      .call(sel => sel.select('.domain').remove())
      .call(sel => sel.selectAll('.tick line')
        .attr('stroke', colors.bgSecondary)
        .attr('stroke-opacity', 0.5));

    // Regression line
    const xMin = xScale.domain()[0];
    const xMax = xScale.domain()[1];
    const yMin = regression.intercept + regression.slope * xMin;
    const yMax = regression.intercept + regression.slope * xMax;

    // Clamp regression line to chart bounds
    const yMinClamped = Math.max(0, Math.min(yScale.domain()[1], yMin));
    const yMaxClamped = Math.max(0, Math.min(yScale.domain()[1], yMax));

    // Draw regression line with animation
    const regressionLine = g.append('line')
      .attr('class', 'regression-line')
      .attr('x1', xScale(xMin))
      .attr('y1', yScale(yMinClamped))
      .attr('x2', xScale(xMin))
      .attr('y2', yScale(yMinClamped))
      .attr('stroke', colors.accentTeal)
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '8,4')
      .attr('opacity', 0.8);

    regressionLine.transition()
      .duration(1000)
      .delay(500)
      .attr('x2', xScale(xMax))
      .attr('y2', yScale(yMaxClamped));

    // Confidence band (simplified - shows general area)
    if (regression.rSquared > 0.01) {
      const bandWidth = (yExtent[1] - yExtent[0]) * (1 - regression.rSquared) * 0.3;

      const areaGenerator = d3.area<number>()
        .x(d => xScale(d))
        .y0(d => yScale(Math.max(0, regression.intercept + regression.slope * d - bandWidth)))
        .y1(d => yScale(Math.min(yScale.domain()[1], regression.intercept + regression.slope * d + bandWidth)))
        .curve(d3.curveLinear);

      g.append('path')
        .datum(d3.range(xMin, xMax + 0.1, 0.1))
        .attr('fill', colors.accentTeal)
        .attr('opacity', 0)
        .attr('d', areaGenerator)
        .transition()
        .duration(800)
        .delay(600)
        .attr('opacity', 0.1);
    }

    // Draw points
    g.selectAll('.point')
      .data(scatterData)
      .join('circle')
      .attr('class', 'point')
      .attr('cx', d => xScale(d.mandateCount))
      .attr('cy', chartHeight)
      .attr('r', 0)
      .attr('fill', d => getRiskLevelColor(d.riskLevel))
      .attr('opacity', 0.7)
      .attr('stroke', colors.bgPrimary)
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter touchstart', function(event, d) {
        event.preventDefault();
        d3.select(this)
          .attr('r', hoverRadius)
          .attr('opacity', 1)
          .attr('stroke-width', 2);

        // Calculate residual (distance from regression line)
        const predicted = regression.intercept + regression.slope * d.mandateCount;
        const residual = d.totalSpending - predicted;
        const residualPct = (residual / predicted) * 100;

        tooltipEl.innerHTML = `
          <div class="tooltip-title font-semibold">${d.name}</div>
          <div class="tooltip-label text-text-muted">${d.party} - ${d.uf}</div>
          <div class="tooltip-divider border-t border-bg-tertiary my-1"></div>
          <div class="tooltip-row flex justify-between gap-4">
            <span class="text-text-muted">Mandatos:</span>
            <span class="font-medium">${d.mandateCount}º mandato</span>
          </div>
          <div class="tooltip-row flex justify-between gap-4">
            <span class="text-text-muted">Gasto Total:</span>
            <span class="font-medium">${formatReais(d.totalSpending)}</span>
          </div>
          <div class="tooltip-row flex justify-between gap-4">
            <span class="text-text-muted">Esperado:</span>
            <span class="font-mono text-text-muted">${formatReais(predicted)}</span>
          </div>
          <div class="tooltip-row flex justify-between gap-4">
            <span class="text-text-muted">Desvio:</span>
            <span class="font-mono ${residual > 0 ? 'text-accent-red' : 'text-[#2ECC71]'}">
              ${residual > 0 ? '+' : ''}${residualPct.toFixed(0)}%
            </span>
          </div>
        `;
        tooltipEl.style.opacity = '1';
        tooltipEl.style.left = `${event.clientX + 15}px`;
        tooltipEl.style.top = `${event.clientY - 10}px`;
      })
      .on('mousemove', function(event) {
        tooltipEl.style.left = `${event.clientX + 15}px`;
        tooltipEl.style.top = `${event.clientY - 10}px`;
      })
      .on('mouseleave touchend', function() {
        d3.select(this)
          .attr('r', pointRadius)
          .attr('opacity', 0.7)
          .attr('stroke-width', 1);
        tooltipEl.style.opacity = '0';
      })
      .on('click', (_, d) => {
        if (FEATURES.SHOW_DEPUTIES_TAB) {
          navigate(`/deputado/${d.id}`);
        }
      })
      .transition()
      .duration(600)
      .delay((_, i) => Math.min(i * 3, 400))
      .attr('cy', d => yScale(d.totalSpending))
      .attr('r', pointRadius);

    // X-axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(xExtent[1])
      .tickFormat(d => `${d}º`);

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
      .text('Número do Mandato');

    // Y-axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d => formatReais(d as number, true));

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', colors.textSecondary)
      .attr('font-size', `${fontSizes.axis}px`);

    g.select('.y-axis')
      .selectAll('line, path')
      .attr('stroke', colors.textMuted);

    // Y-axis label
    if (containerWidth >= 400) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -margin.left + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', colors.textSecondary)
        .attr('font-size', `${fontSizes.label}px`)
        .text('Gasto Total (R$)');
    }

    // Cleanup tooltip on unmount
    return () => {
      document.body.removeChild(tooltipEl);
    };
  }, [scatterData, regression, height, navigate]);

  if (!deputies.length || scatterData.length < 10) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Dados insuficientes para análise de correlação
      </div>
    );
  }

  // Interpret correlation
  const correlationStrength = Math.abs(regression.correlation);
  let correlationLabel = '';
  let correlationColor = '';
  if (correlationStrength >= 0.7) {
    correlationLabel = 'forte';
    correlationColor = 'text-accent-teal';
  } else if (correlationStrength >= 0.4) {
    correlationLabel = 'moderada';
    correlationColor = 'text-accent-amber';
  } else if (correlationStrength >= 0.2) {
    correlationLabel = 'fraca';
    correlationColor = 'text-text-secondary';
  } else {
    correlationLabel = 'muito fraca';
    correlationColor = 'text-text-muted';
  }

  const isPositive = regression.slope > 0;
  const spendingIncrease = regression.slope; // R$ increase per mandate

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Gastos vs Experiência Parlamentar
          </h3>
          <p className="text-sm text-text-muted">
            {formatNumber(scatterData.length)} deputados · Mínimo: {formatReais(minSpending, true)}
          </p>
        </div>
      </div>

      {/* Key Insight Card */}
      <div className="p-4 bg-bg-secondary/50 rounded-lg border-l-4 border-accent-teal">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📈</div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-text-primary">
              Correlação <span className={`font-semibold ${correlationColor}`}>{correlationLabel}</span>{' '}
              ({isPositive ? 'positiva' : 'negativa'})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-text-muted">Correlação (r)</p>
                <p className={`text-lg font-bold font-mono ${correlationColor}`}>
                  {regression.correlation.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-text-muted">R² (explicado)</p>
                <p className="text-lg font-bold font-mono text-text-primary">
                  {(regression.rSquared * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-text-muted">Inclinação</p>
                <p className={`text-lg font-bold font-mono ${isPositive ? 'text-accent-amber' : 'text-[#2ECC71]'}`}>
                  {isPositive ? '+' : ''}{formatReais(spendingIncrease, true)}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Por mandato</p>
                <p className="text-text-secondary text-sm">
                  {isPositive ? 'mais gasto' : 'menos gasto'}
                </p>
              </div>
            </div>
            <p className="text-xs text-text-muted pt-1">
              {regression.pValue < 0.05
                ? `Relação estatisticamente significativa (p < ${regression.pValue <= 0.01 ? '0.01' : '0.05'})`
                : 'Relação não é estatisticamente significativa (p > 0.05)'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="chart-container relative">
        <svg ref={svgRef} />
      </div>

      {/* Legend and notes */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-accent-teal rounded" style={{ borderStyle: 'dashed' }} />
            <span className="text-text-muted">Linha de regressão</span>
          </div>
          <div className="flex items-center gap-3">
            {['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'].map(level => (
              <div key={level} className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getRiskLevelColor(level) }}
                />
                <span className="text-text-muted">{level}</span>
              </div>
            ))}
          </div>
        </div>
        {stats.excludedCount > 0 && (
          <p className="text-text-muted">
            {stats.excludedCount} deputados excluídos (gasto &lt; {formatReais(minSpending, true)})
          </p>
        )}
      </div>

      {/* Mean spending by mandate */}
      {stats.mandateStats.length > 1 && (
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-text-muted mb-2">Gasto médio por número de mandato:</p>
          <div className="flex flex-wrap gap-2">
            {stats.mandateStats.map(s => (
              <div key={s.mandate} className="px-2 py-1 bg-bg-secondary rounded text-xs">
                <span className="text-text-muted">{s.mandate}º:</span>{' '}
                <span className="font-mono text-text-primary">{formatReais(s.avgSpending, true)}</span>
                <span className="text-text-muted ml-1">({s.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {FEATURES.SHOW_DEPUTIES_TAB && (
        <p className="text-xs text-text-muted text-center">
          Clique em um ponto para ver o perfil completo do deputado
        </p>
      )}
    </div>
  );
}

import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy, BenfordDigit } from '../../types/data';
import { colors } from '../../utils/colors';

interface BenfordIndividualProps {
  deputy: Deputy;
  /** Show expected Benford distribution */
  showExpected?: boolean;
  /** Height of the chart */
  height?: number;
}

// Benford's Law expected distribution (fallback)
const BENFORD_EXPECTED: BenfordDigit[] = [
  { digit: 1, observed: 0, expected: 30.1 },
  { digit: 2, observed: 0, expected: 17.6 },
  { digit: 3, observed: 0, expected: 12.5 },
  { digit: 4, observed: 0, expected: 9.7 },
  { digit: 5, observed: 0, expected: 7.9 },
  { digit: 6, observed: 0, expected: 6.7 },
  { digit: 7, observed: 0, expected: 5.8 },
  { digit: 8, observed: 0, expected: 5.1 },
  { digit: 9, observed: 0, expected: 4.6 },
];

// Get digit distribution from deputy data or return fallback
function getDigitDistribution(deputy: Deputy): BenfordDigit[] {
  // Use real data from deputy if available
  if (deputy.benford?.digitDistribution && deputy.benford.digitDistribution.length > 0) {
    return deputy.benford.digitDistribution;
  }

  // Fallback: return expected values with zeros (indicates no data)
  return BENFORD_EXPECTED;
}

// Calculate chi-squared statistic
function calculateChiSquared(data: { digit: number; observed: number; expected: number }[]): number {
  return data.reduce((sum, d) => {
    const diff = d.observed - d.expected;
    return sum + (diff * diff) / d.expected;
  }, 0);
}

// Get significance level from chi-squared (df=8)
function getSignificance(chi2: number): { level: string; color: string; description: string } {
  if (chi2 > 20.09) {
    return {
      level: 'p < 0.01',
      color: colors.accentRed,
      description: 'Desvio altamente significativo da distribuição esperada',
    };
  } else if (chi2 > 15.51) {
    return {
      level: 'p < 0.05',
      color: colors.accentAmber,
      description: 'Desvio significativo da distribuição esperada',
    };
  } else {
    return {
      level: 'Não significativo',
      color: colors.accentTeal,
      description: 'Distribuição consistente com Benford\'s Law',
    };
  }
}

export function BenfordIndividual({
  deputy,
  showExpected = true,
  height = 300,
}: BenfordIndividualProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use real digit distribution from data
  const digitData = useMemo(() => getDigitDistribution(deputy), [deputy]);

  // Use real chi2 from data, fallback to calculated
  const chi2 = useMemo(() => deputy.benford?.chi2 ?? calculateChiSquared(digitData), [deputy.benford?.chi2, digitData]);
  const significance = useMemo(() => getSignificance(chi2), [chi2]);

  // Check if we have real data
  const hasRealData = deputy.benford?.digitDistribution && deputy.benford.digitDistribution.length > 0;

  useEffect(() => {
    if (!containerRef.current || !digitData.length) return;

    const containerWidth = containerRef.current.clientWidth;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(containerRef.current);
    svg.selectAll('*').remove();

    const chart = svg
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(digitData.map(d => d.digit.toString()))
      .range([0, width])
      .padding(0.3);

    const maxValue = Math.max(
      d3.max(digitData, d => d.observed) || 0,
      d3.max(digitData, d => d.expected) || 0
    ) * 1.1;

    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue])
      .range([chartHeight, 0])
      .nice();

    // Create tooltip
    const tooltip = d3
      .select(containerRef.current)
      .selectAll('.tooltip')
      .data([null])
      .join('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    // Draw expected bars (background)
    if (showExpected) {
      chart
        .selectAll('.bar-expected')
        .data(digitData)
        .join('rect')
        .attr('class', 'bar-expected')
        .attr('x', d => xScale(d.digit.toString()) || 0)
        .attr('y', d => yScale(d.expected))
        .attr('width', xScale.bandwidth())
        .attr('height', d => chartHeight - yScale(d.expected))
        .attr('fill', colors.accentTeal)
        .attr('opacity', 0.2)
        .attr('rx', 2);
    }

    // Draw observed bars
    chart
      .selectAll('.bar-observed')
      .data(digitData)
      .join('rect')
      .attr('class', 'bar-observed')
      .attr('x', d => (xScale(d.digit.toString()) || 0) + (showExpected ? xScale.bandwidth() / 4 : 0))
      .attr('y', chartHeight)
      .attr('width', showExpected ? xScale.bandwidth() / 2 : xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', d => {
        const diff = Math.abs(d.observed - d.expected);
        if (diff > 5) return colors.accentRed;
        if (diff > 2) return colors.accentAmber;
        return colors.accentTeal;
      })
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.8);
        const diff = d.observed - d.expected;
        tooltip
          .style('opacity', 1)
          .html(
            `<div class="tooltip-title">Dígito ${d.digit}</div>
             <div class="tooltip-label">
               Observado: ${d.observed.toFixed(1)}%<br/>
               Esperado: ${d.expected.toFixed(1)}%<br/>
               Diferença: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%
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
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        tooltip.style('opacity', 0);
      })
      .transition()
      .duration(600)
      .delay((_, i) => i * 50)
      .ease(d3.easeCubicOut)
      .attr('y', d => yScale(d.observed))
      .attr('height', d => chartHeight - yScale(d.observed));

    // X-axis
    chart
      .append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', colors.textSecondary)
      .attr('font-size', '12px');

    chart
      .selectAll('.domain, .tick line')
      .attr('stroke', colors.textMuted);

    // X-axis label
    chart
      .append('text')
      .attr('x', width / 2)
      .attr('y', chartHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.textSecondary)
      .attr('font-size', '11px')
      .text('Primeiro Dígito');

    // Y-axis
    chart
      .append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}%`))
      .selectAll('text')
      .attr('fill', colors.textSecondary)
      .attr('font-size', '11px');

    // Expected line
    if (showExpected) {
      const line = d3
        .line<{ digit: number; expected: number }>()
        .x(d => (xScale(d.digit.toString()) || 0) + xScale.bandwidth() / 2)
        .y(d => yScale(d.expected))
        .curve(d3.curveMonotoneX);

      chart
        .append('path')
        .datum(digitData)
        .attr('fill', 'none')
        .attr('stroke', colors.accentTeal)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,3')
        .attr('d', line)
        .attr('opacity', 0)
        .transition()
        .delay(600)
        .duration(400)
        .attr('opacity', 1);
    }

    return () => {
      tooltip.remove();
    };
  }, [digitData, height, showExpected]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Análise de Benford
          </h3>
          <p className="text-sm text-text-muted">
            Distribuição do primeiro dígito das transações
          </p>
        </div>
        <div className="text-right">
          <div
            className="px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: `${significance.color}20`,
              color: significance.color,
            }}
          >
            {significance.level}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="chart-container relative" />

      {/* Legend */}
      {showExpected && (
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: colors.accentTeal, opacity: 0.3 }} />
            <span className="text-text-secondary">Esperado (Benford)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: colors.accentAmber }} />
            <span className="text-text-secondary">Observado</span>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-secondary rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">Chi-quadrado (χ²)</p>
          <p className="text-2xl font-bold text-text-primary">
            {chi2.toFixed(2)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            df=8, limiar 5%: 15.51
          </p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">Interpretação</p>
          <p
            className="text-sm font-medium"
            style={{ color: significance.color }}
          >
            {significance.description}
          </p>
        </div>
      </div>

      {/* Warning if no real data */}
      {!hasRealData && (
        <div className="p-3 bg-accent-amber/10 border border-accent-amber/30 rounded-lg">
          <p className="text-xs text-accent-amber">
            ⚠️ Dados de distribuição não disponíveis. Execute o script de preparação de dados para ver a análise real.
          </p>
        </div>
      )}

      {/* Explanation */}
      <div className="p-4 bg-bg-secondary rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <div className="text-lg">📊</div>
          <div className="text-xs text-text-secondary">
            <p className="font-medium text-text-primary mb-1">O que é a Lei de Benford?</p>
            <p>
              Em dados naturais, o primeiro dígito não é uniformemente distribuído.
              O dígito 1 aparece em ~30% dos casos, enquanto o 9 aparece em apenas ~5%.
              Desvios significativos podem indicar dados manipulados ou padrões incomuns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

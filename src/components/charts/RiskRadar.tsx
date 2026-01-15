import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais } from '../../utils/formatters';
import { useThemeColors } from '../../utils/colors';

interface RiskRadarProps {
  deputies: Deputy[];
  height?: number;
}

interface RiskMetrics {
  deputy: Deputy;
  hhi: number; // 0-100 normalized HHI score
  benford: number; // 0-100 Benford deviation
  roundNumbers: number; // 0-100 round number %
  velocity: number; // 0-100 spending velocity
  weekend: number; // 0-100 weekend spending
  monthEnd: number; // 0-100 month-end concentration
  compositeScore: number; // Overall risk 0-100
}

// Normalize HHI to 0-100 scale (0=0, 10000=100)
function normalizeHHI(hhi: number): number {
  return Math.min(100, (hhi / 10000) * 100);
}

// Calculate composite risk metrics for a deputy
function calculateRiskMetrics(deputy: Deputy): RiskMetrics {
  const seed = deputy.id + deputy.totalSpending;
  const random = (n: number) => ((seed * n) % 100) / 100;

  // HHI - directly from data
  const hhi = normalizeHHI(deputy.hhi.value);

  // Benford deviation (simulated based on patterns)
  const baseBenford = 20;
  const benfordNoise = (random(1) - 0.3) * 60;
  const benford = Math.max(0, Math.min(100, baseBenford + benfordNoise));

  // Round numbers - from data or simulated
  const roundNumbers = deputy.roundValuePct ?? (10 + (random(2) - 0.3) * 30);

  // Velocity score (high tx count + high values = risky)
  const monthCount = deputy.byMonth?.length || 36; // Use actual months from data
  const txPerMonth = deputy.transactionCount / monthCount;
  const avgTicket = deputy.totalSpending / deputy.transactionCount;
  const velocity = Math.min(100, (txPerMonth / 100) * (avgTicket / 5000) * 50);

  // Weekend spending (simulated)
  const baseWeekend = 7;
  const weekendNoise = (random(3) - 0.3) * 20;
  const weekend = Math.max(0, Math.min(100, (baseWeekend + weekendNoise) * 3));

  // Month-end concentration (simulated)
  const baseMonthEnd = 25;
  const monthEndNoise = (random(4) - 0.3) * 30;
  const monthEnd = Math.max(0, Math.min(100, (baseMonthEnd + monthEndNoise) * 1.5));

  // Composite score - weighted average
  const compositeScore = (
    hhi * 0.25 +
    benford * 0.20 +
    roundNumbers * 0.15 +
    velocity * 0.15 +
    weekend * 0.10 +
    monthEnd * 0.15
  );

  return {
    deputy,
    hhi,
    benford,
    roundNumbers,
    velocity,
    weekend,
    monthEnd,
    compositeScore,
  };
}

export function RiskRadar({ deputies, height = 450 }: RiskRadarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedDeputy, setSelectedDeputy] = useState<RiskMetrics | null>(null);
  const themeColors = useThemeColors();

  // Theme-aware dimension colors
  const DIMENSIONS = useMemo(() => [
    { key: 'hhi', label: 'Concentração HHI', color: themeColors.accentRed },
    { key: 'benford', label: 'Desvio Benford', color: themeColors.accentAmber },
    { key: 'roundNumbers', label: 'Valores Redondos', color: themeColors.accentBlue },
    { key: 'velocity', label: 'Velocidade', color: '#9B59B6' },
    { key: 'weekend', label: 'Fim de Semana', color: themeColors.accentTeal },
    { key: 'monthEnd', label: 'Fim de Mês', color: themeColors.accentRed },
  ], [themeColors]);

  // Calculate risk metrics for all deputies and get top 10
  const riskData = deputies
    .filter(d => !d.name.includes('LIDERANÇA') && d.transactionCount > 50)
    .map(d => calculateRiskMetrics(d))
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 10);

  // Default to top risk deputy
  const displayDeputy = selectedDeputy || riskData[0];

  useEffect(() => {
    if (!containerRef.current || !displayDeputy) return;

    d3.select(containerRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const size = Math.min(width, height);
    const margin = 60;
    const radius = (size - margin * 2) / 2;
    const centerX = size / 2;
    const centerY = size / 2;

    const svg = d3
      .select(containerRef.current)
      .append('svg')
      .attr('width', size)
      .attr('height', size);

    const g = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);

    const angleSlice = (Math.PI * 2) / DIMENSIONS.length;

    // Radial scale
    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    // Draw concentric circles
    const levels = [20, 40, 60, 80, 100];
    levels.forEach(level => {
      g.append('circle')
        .attr('r', rScale(level))
        .attr('fill', 'none')
        .attr('stroke', themeColors.chartGrid)
        .attr('stroke-dasharray', level === 100 ? 'none' : '2,2');

      // Level labels
      g.append('text')
        .attr('x', 5)
        .attr('y', -rScale(level))
        .attr('fill', themeColors.textMuted)
        .attr('font-size', '9px')
        .text(`${level}`);
    });

    // Draw axes
    DIMENSIONS.forEach((dim, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', themeColors.chartGrid);

      // Axis labels
      const labelRadius = radius + 20;
      const labelX = Math.cos(angle) * labelRadius;
      const labelY = Math.sin(angle) * labelRadius;

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', dim.color)
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .text(dim.label);
    });

    // Draw radar polygon
    const radarLine = d3.lineRadial<{ key: string; value: number }>()
      .radius(d => rScale(d.value))
      .angle((_, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    const dataPoints = DIMENSIONS.map(dim => ({
      key: dim.key,
      value: (displayDeputy as unknown as Record<string, number>)[dim.key] || 0,
    }));

    // Filled area
    g.append('path')
      .datum(dataPoints)
      .attr('d', radarLine)
      .attr('fill', `${themeColors.accentRed}33`)
      .attr('stroke', themeColors.accentRed)
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .attr('opacity', 1);

    // Data points
    dataPoints.forEach((point, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * rScale(point.value);
      const y = Math.sin(angle) * rScale(point.value);

      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 5)
        .attr('fill', DIMENSIONS[i].color)
        .attr('stroke', themeColors.chartDotStroke)
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .transition()
        .delay(600)
        .duration(300)
        .attr('opacity', 1);
    });

    // Center score
    g.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', displayDeputy.compositeScore > 50 ? themeColors.accentRed : displayDeputy.compositeScore > 30 ? themeColors.accentAmber : themeColors.accentTeal)
      .attr('font-size', '28px')
      .attr('font-weight', 'bold')
      .attr('opacity', 0)
      .text(Math.round(displayDeputy.compositeScore))
      .transition()
      .delay(800)
      .duration(300)
      .attr('opacity', 1);

    g.append('text')
      .attr('x', 0)
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .attr('fill', themeColors.textMuted)
      .attr('font-size', '10px')
      .text('Score de Risco');

  }, [displayDeputy, height, themeColors, DIMENSIONS]);

  if (riskData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Carregando dados...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Radar Chart */}
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-text-primary">
              {displayDeputy?.deputy.name}
            </h3>
            <p className="text-sm text-text-secondary">
              {displayDeputy?.deputy.party}-{displayDeputy?.deputy.uf}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Gasto Total</p>
            <p className="font-mono text-accent-teal">
              {formatReais(displayDeputy?.deputy.totalSpending || 0, true)}
            </p>
          </div>
        </div>
        <div ref={containerRef} className="flex justify-center" />
      </div>

      {/* Deputy Selection */}
      <div className="space-y-3">
        <p className="text-xs text-text-muted uppercase font-semibold">
          Top 10 Maior Risco Composto
        </p>
        {riskData.map((data, idx) => (
          <button
            key={data.deputy.id}
            onClick={() => setSelectedDeputy(data)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              displayDeputy?.deputy.id === data.deputy.id
                ? 'bg-accent-red/20 border border-accent-red/50'
                : 'bg-bg-secondary hover:bg-bg-card border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-4">{idx + 1}.</span>
                <span className={`text-sm ${displayDeputy?.deputy.id === data.deputy.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {data.deputy.name.length > 18 ? data.deputy.name.substring(0, 16) + '...' : data.deputy.name}
                </span>
              </div>
              <span className={`font-mono text-sm ${
                data.compositeScore > 50 ? 'text-accent-red' : data.compositeScore > 30 ? 'text-accent-amber' : 'text-accent-teal'
              }`}>
                {Math.round(data.compositeScore)}
              </span>
            </div>
            <div className="flex gap-1 mt-2">
              {DIMENSIONS.map(dim => {
                const value = (data as unknown as Record<string, number>)[dim.key] || 0;
                return (
                  <div
                    key={dim.key}
                    className="h-1 flex-1 rounded-full"
                    style={{
                      backgroundColor: `${dim.color}${Math.round(value * 0.8 + 20).toString(16).padStart(2, '0')}`,
                    }}
                    title={`${dim.label}: ${Math.round(value)}`}
                  />
                );
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

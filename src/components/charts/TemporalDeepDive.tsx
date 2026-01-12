import { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais, formatNumber } from '../../utils/formatters';
import { colors } from '../../utils/colors';

interface TemporalDeepDiveProps {
  deputy: Deputy;
  allDeputies: Deputy[];
}

interface MonthMetrics {
  month: string;
  year: number;
  monthNum: number;
  value: number;
  transactionCount: number;
  avgValue: number;
  deviation: number;
  isAnomaly: boolean;
  isSpike: boolean;
  isDrop: boolean;
}

interface YearSummary {
  year: number;
  total: number;
  transactions: number;
  avgPerMonth: number;
  monthsActive: number;
}

export function TemporalDeepDive({ deputy, allDeputies }: TemporalDeepDiveProps) {
  const chartRef = useRef<SVGSVGElement>(null);

  // Calculate monthly metrics with anomaly detection
  const monthlyMetrics = useMemo((): MonthMetrics[] => {
    if (!deputy.byMonth?.length) return [];

    // Calculate average and std dev
    const values = deputy.byMonth.map(m => m.value);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length
    );

    return deputy.byMonth.map(m => {
      const [year, monthNum] = m.month.split('-').map(Number);
      const deviation = stdDev > 0 ? (m.value - avg) / stdDev : 0;
      const isSpike = deviation > 2;
      const isDrop = deviation < -1.5;

      return {
        month: m.month,
        year,
        monthNum,
        value: m.value,
        transactionCount: m.transactionCount,
        avgValue: avg,
        deviation,
        isAnomaly: isSpike || isDrop,
        isSpike,
        isDrop,
      };
    });
  }, [deputy.byMonth]);

  // Year summaries
  const yearSummaries = useMemo((): YearSummary[] => {
    if (!monthlyMetrics.length) return [];

    const byYear = new Map<number, MonthMetrics[]>();
    monthlyMetrics.forEach(m => {
      const existing = byYear.get(m.year) || [];
      existing.push(m);
      byYear.set(m.year, existing);
    });

    return Array.from(byYear.entries())
      .map(([year, months]) => ({
        year,
        total: months.reduce((s, m) => s + m.value, 0),
        transactions: months.reduce((s, m) => s + m.transactionCount, 0),
        avgPerMonth: months.reduce((s, m) => s + m.value, 0) / months.length,
        monthsActive: months.length,
      }))
      .sort((a, b) => a.year - b.year);
  }, [monthlyMetrics]);

  // YoY growth
  const yoyGrowth = useMemo(() => {
    if (yearSummaries.length < 2) return null;
    const current = yearSummaries[yearSummaries.length - 1];
    const previous = yearSummaries[yearSummaries.length - 2];
    const growth = ((current.total - previous.total) / previous.total) * 100;
    return {
      current: current.year,
      previous: previous.year,
      growth,
      currentTotal: current.total,
      previousTotal: previous.total,
    };
  }, [yearSummaries]);

  // Average deputy monthly spending for comparison
  const avgMonthlyByAll = useMemo(() => {
    const filtered = allDeputies.filter(
      d => !d.name.includes('LIDERANCA') && d.transactionCount > 10 && d.byMonth?.length
    );
    if (filtered.length === 0) return new Map<string, number>();

    const monthlyTotals = new Map<string, { sum: number; count: number }>();
    filtered.forEach(d => {
      d.byMonth?.forEach(m => {
        const existing = monthlyTotals.get(m.month) || { sum: 0, count: 0 };
        existing.sum += m.value;
        existing.count += 1;
        monthlyTotals.set(m.month, existing);
      });
    });

    const avgByMonth = new Map<string, number>();
    monthlyTotals.forEach((val, key) => {
      avgByMonth.set(key, val.sum / val.count);
    });
    return avgByMonth;
  }, [allDeputies]);

  // Seasonality analysis (average by month number)
  const seasonality = useMemo(() => {
    if (!monthlyMetrics.length) return [];

    const byMonthNum = new Map<number, number[]>();
    monthlyMetrics.forEach(m => {
      const existing = byMonthNum.get(m.monthNum) || [];
      existing.push(m.value);
      byMonthNum.set(m.monthNum, existing);
    });

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    return Array.from(byMonthNum.entries())
      .map(([monthNum, values]) => ({
        monthNum,
        name: monthNames[monthNum - 1],
        avg: values.reduce((s, v) => s + v, 0) / values.length,
        count: values.length,
      }))
      .sort((a, b) => a.monthNum - b.monthNum);
  }, [monthlyMetrics]);

  // Anomalies list
  const anomalies = useMemo(() => {
    return monthlyMetrics
      .filter(m => m.isAnomaly)
      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
  }, [monthlyMetrics]);

  // D3 timeline chart
  useEffect(() => {
    if (!chartRef.current || !monthlyMetrics.length) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3
      .scalePoint<string>()
      .domain(monthlyMetrics.map(m => m.month))
      .range([0, width])
      .padding(0.5);

    const maxVal = Math.max(
      ...monthlyMetrics.map(m => m.value),
      ...Array.from(avgMonthlyByAll.values())
    );

    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([height, 0]);

    // Area for deputy spending
    const area = d3
      .area<MonthMetrics>()
      .x(d => x(d.month) || 0)
      .y0(height)
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Line for average
    const avgLine = d3
      .line<[string, number]>()
      .x(d => x(d[0]) || 0)
      .y(d => y(d[1]))
      .curve(d3.curveMonotoneX)
      .defined(d => avgMonthlyByAll.has(d[0]));

    // Draw area
    g.append('path')
      .datum(monthlyMetrics)
      .attr('fill', `${colors.accentTeal}40`)
      .attr('d', area);

    // Draw deputy line
    g.append('path')
      .datum(monthlyMetrics)
      .attr('fill', 'none')
      .attr('stroke', colors.accentTeal)
      .attr('stroke-width', 2)
      .attr(
        'd',
        d3
          .line<MonthMetrics>()
          .x(d => x(d.month) || 0)
          .y(d => y(d.value))
          .curve(d3.curveMonotoneX)
      );

    // Draw average line
    const avgData = monthlyMetrics.map(m => [m.month, avgMonthlyByAll.get(m.month) || 0] as [string, number]);
    g.append('path')
      .datum(avgData)
      .attr('fill', 'none')
      .attr('stroke', colors.textMuted)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .attr('d', avgLine);

    // Anomaly markers - tooltip appended to body to avoid overflow clipping
    const tooltip = d3
      .select('body')
      .selectAll('.temporal-deep-dive-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'temporal-deep-dive-tooltip')
      .style('position', 'fixed')
      .style('visibility', 'hidden')
      .style('background', colors.bgCard)
      .style('border', `1px solid ${colors.bgCardSolid}`)
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '9999')
      .style('max-width', '250px')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');

    g.selectAll('.anomaly-marker')
      .data(monthlyMetrics.filter(m => m.isAnomaly))
      .enter()
      .append('circle')
      .attr('class', 'anomaly-marker')
      .attr('cx', d => x(d.month) || 0)
      .attr('cy', d => y(d.value))
      .attr('r', 6)
      .attr('fill', d => (d.isSpike ? colors.accentRed : colors.accentAmber))
      .attr('stroke', colors.bgPrimary)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        tooltip
          .style('visibility', 'visible')
          .style('left', `${event.clientX + 10}px`)
          .style('top', `${event.clientY - 10}px`)
          .html(`
          <div class="space-y-1">
            <p class="font-medium" style="color: ${colors.textPrimary}">${d.month}</p>
            <p style="color: ${colors.textSecondary}">Valor: ${formatReais(d.value)}</p>
            <p style="color: ${colors.textMuted}">Transações: ${d.transactionCount}</p>
            <p style="color: ${d.isSpike ? colors.accentRed : colors.accentAmber}">
              ${d.isSpike ? '⬆️ Pico' : '⬇️ Queda'} (${d.deviation.toFixed(1)}σ)
            </p>
          </div>
        `);
      })
      .on('mousemove', function (event) {
        tooltip.style('left', `${event.clientX + 10}px`).style('top', `${event.clientY - 10}px`);
      })
      .on('mouseleave', function () {
        tooltip.style('visibility', 'hidden');
      });

    // X axis (show only some labels)
    const tickValues = monthlyMetrics
      .filter((_, i) => i % Math.ceil(monthlyMetrics.length / 8) === 0)
      .map(m => m.month);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickValues(tickValues))
      .selectAll('text')
      .attr('fill', colors.textMuted)
      .attr('font-size', '10px')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end');

    g.selectAll('.domain, .tick line').attr('stroke', colors.textMuted).attr('opacity', 0.3);

    // Y axis
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat(d => `R$${(Number(d) / 1000).toFixed(0)}k`)
      )
      .selectAll('text')
      .attr('fill', colors.textMuted)
      .attr('font-size', '10px');

    // Cleanup tooltip on unmount
    return () => {
      d3.select('body').selectAll('.temporal-deep-dive-tooltip').remove();
    };
  }, [monthlyMetrics, avgMonthlyByAll]);

  if (!deputy.byMonth?.length) {
    return (
      <div className="p-6 text-center text-text-muted">
        Dados temporais não disponíveis para este deputado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary">Análise Temporal</h3>
        <p className="text-sm text-text-muted">
          {monthlyMetrics.length} meses de atividade analisados
        </p>
      </div>

      {/* YoY Growth */}
      {yoyGrowth && (
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor:
              yoyGrowth.growth > 20
                ? `${colors.accentRed}20`
                : yoyGrowth.growth < -10
                  ? `${colors.accentTeal}20`
                  : `${colors.accentAmber}20`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Variação Ano-a-Ano</p>
              <p className="text-2xl font-bold text-text-primary">
                {yoyGrowth.growth > 0 ? '+' : ''}
                {yoyGrowth.growth.toFixed(1)}%
              </p>
              <p className="text-xs text-text-muted mt-1">
                {yoyGrowth.previous} → {yoyGrowth.current}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">{yoyGrowth.previous}</p>
              <p className="text-lg font-semibold text-text-secondary">
                {formatReais(yoyGrowth.previousTotal, true)}
              </p>
              <p className="text-sm text-text-muted mt-2">{yoyGrowth.current}</p>
              <p className="text-lg font-semibold text-text-primary">
                {formatReais(yoyGrowth.currentTotal, true)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Chart */}
      <div className="bg-bg-card rounded-lg p-4">
        <h4 className="text-sm font-medium text-text-primary mb-3">
          Evolução Mensal vs Média Geral
        </h4>
        <svg ref={chartRef} className="w-full" />
        <div className="flex items-center justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-accent-teal" />
            <span className="text-text-muted">Deputado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-text-muted" />
            <span className="text-text-muted">Média Geral</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-accent-red" />
            <span className="text-text-muted">Pico</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-accent-amber" />
            <span className="text-text-muted">Queda</span>
          </div>
        </div>
      </div>

      {/* Year Summaries */}
      <div className="bg-bg-card rounded-lg p-4">
        <h4 className="text-sm font-medium text-text-primary mb-3">Resumo por Ano</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {yearSummaries.map(year => (
            <div key={year.year} className="bg-bg-secondary rounded-lg p-3">
              <p className="text-lg font-bold text-text-primary">{year.year}</p>
              <p className="text-sm text-text-secondary">{formatReais(year.total, true)}</p>
              <p className="text-xs text-text-muted mt-1">
                {formatNumber(year.transactions)} tx em {year.monthsActive} meses
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonality */}
      {seasonality.length > 0 && (
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="text-sm font-medium text-text-primary mb-3">Sazonalidade</h4>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
            {seasonality.map(s => {
              const maxAvg = Math.max(...seasonality.map(x => x.avg));
              const intensity = s.avg / maxAvg;
              return (
                <div
                  key={s.monthNum}
                  className="text-center p-2 rounded"
                  style={{
                    backgroundColor: `rgba(74, 163, 160, ${intensity * 0.8})`,
                  }}
                >
                  <p className="text-xs font-medium text-text-primary">{s.name}</p>
                  <p className="text-[10px] text-text-secondary">
                    {formatReais(s.avg, true).replace('R$', '')}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-text-muted mt-2">
            Intensidade indica média de gastos históricos por mês
          </p>
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="text-sm font-medium text-text-primary mb-3">
            Periodos Atipicos ({anomalies.length})
          </h4>
          <div className="space-y-2">
            {anomalies.slice(0, 5).map((a, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: a.isSpike ? colors.accentRed : colors.accentAmber,
                    }}
                  />
                  <div>
                    <p className="text-sm text-text-primary">{a.month}</p>
                    <p className="text-xs text-text-muted">
                      {a.isSpike ? 'Pico de gastos' : 'Queda de gastos'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-text-secondary">
                    {formatReais(a.value, true)}
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      color: a.isSpike ? colors.accentRed : colors.accentAmber,
                    }}
                  >
                    {a.deviation > 0 ? '+' : ''}
                    {a.deviation.toFixed(1)}σ
                  </p>
                </div>
              </div>
            ))}
          </div>
          {anomalies.length > 5 && (
            <p className="text-xs text-text-muted mt-2">
              +{anomalies.length - 5} outros periodos atipicos
            </p>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-bg-card rounded-lg p-3">
          <p className="text-xl font-bold text-text-primary">
            {formatReais(monthlyMetrics.reduce((s, m) => s + m.value, 0) / monthlyMetrics.length, true)}
          </p>
          <p className="text-xs text-text-muted">Média Mensal</p>
        </div>
        <div className="bg-bg-card rounded-lg p-3">
          <p className="text-xl font-bold text-text-primary">
            {anomalies.filter(a => a.isSpike).length}
          </p>
          <p className="text-xs text-text-muted">Picos Detectados</p>
        </div>
        <div className="bg-bg-card rounded-lg p-3">
          <p className="text-xl font-bold text-text-primary">{yearSummaries.length}</p>
          <p className="text-xs text-text-muted">Anos Analisados</p>
        </div>
      </div>
    </div>
  );
}

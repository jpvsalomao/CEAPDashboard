import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import type { Deputy, Aggregations } from '../../types/data';
import { formatNumber, formatReais, formatPercent } from '../../utils/formatters';

interface DataQualityDashboardProps {
  deputies: Deputy[];
  aggregations: Aggregations;
  height?: number;
}

interface QualityMetric {
  id: string;
  label: string;
  value: number;
  total: number;
  pct: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
}

interface DataIssue {
  type: 'missing' | 'outlier' | 'suspicious' | 'incomplete';
  severity: 'high' | 'medium' | 'low';
  message: string;
  count: number;
}

export function DataQualityDashboard({
  deputies,
  aggregations,
  height = 300,
}: DataQualityDashboardProps) {
  const completenessRef = useRef<HTMLDivElement>(null);
  const distributionRef = useRef<SVGSVGElement>(null);

  // Calculate data quality metrics
  const qualityMetrics = useMemo((): QualityMetric[] => {
    const total = deputies.length;
    const validDeputies = deputies.filter(
      (d) => !d.name.includes('LIDERANCA') && d.transactionCount > 0
    );

    return [
      {
        id: 'deputies_with_data',
        label: 'Deputados com dados',
        value: validDeputies.length,
        total,
        pct: (validDeputies.length / total) * 100,
        status: validDeputies.length / total > 0.95 ? 'good' : 'warning',
        description: 'Deputados com pelo menos 1 transacao registrada',
      },
      {
        id: 'deputies_with_categories',
        label: 'Dados por categoria',
        value: deputies.filter((d) => d.byCategory && d.byCategory.length > 0).length,
        total,
        pct: (deputies.filter((d) => d.byCategory && d.byCategory.length > 0).length / total) * 100,
        status:
          deputies.filter((d) => d.byCategory && d.byCategory.length > 0).length / total > 0.9
            ? 'good'
            : deputies.filter((d) => d.byCategory && d.byCategory.length > 0).length / total > 0.7
              ? 'warning'
              : 'critical',
        description: 'Deputados com detalhamento de gastos por categoria',
      },
      {
        id: 'deputies_with_monthly',
        label: 'Dados mensais',
        value: deputies.filter((d) => d.byMonth && d.byMonth.length > 0).length,
        total,
        pct: (deputies.filter((d) => d.byMonth && d.byMonth.length > 0).length / total) * 100,
        status:
          deputies.filter((d) => d.byMonth && d.byMonth.length > 0).length / total > 0.9
            ? 'good'
            : deputies.filter((d) => d.byMonth && d.byMonth.length > 0).length / total > 0.7
              ? 'warning'
              : 'critical',
        description: 'Deputados com serie temporal de gastos',
      },
      {
        id: 'deputies_with_suppliers',
        label: 'Fornecedores mapeados',
        value: deputies.filter((d) => d.topSuppliers && d.topSuppliers.length > 0).length,
        total,
        pct:
          (deputies.filter((d) => d.topSuppliers && d.topSuppliers.length > 0).length / total) *
          100,
        status:
          deputies.filter((d) => d.topSuppliers && d.topSuppliers.length > 0).length / total > 0.95
            ? 'good'
            : 'warning',
        description: 'Deputados com lista de principais fornecedores',
      },
      {
        id: 'benford_calculated',
        label: 'Benford calculado',
        value: deputies.filter((d) => d.benford && d.benford.chi2 > 0).length,
        total,
        pct: (deputies.filter((d) => d.benford && d.benford.chi2 > 0).length / total) * 100,
        status:
          deputies.filter((d) => d.benford && d.benford.chi2 > 0).length / total > 0.9
            ? 'good'
            : 'warning',
        description: 'Deputados com analise de Benford disponivel',
      },
    ];
  }, [deputies]);

  // Calculate data issues
  const dataIssues = useMemo((): DataIssue[] => {
    const issues: DataIssue[] = [];

    // Zero spending deputies
    const zeroSpending = deputies.filter((d) => d.totalSpending === 0);
    if (zeroSpending.length > 0) {
      issues.push({
        type: 'suspicious',
        severity: 'medium',
        message: `${zeroSpending.length} deputados com gasto total zero`,
        count: zeroSpending.length,
      });
    }

    // Very low transaction counts
    const lowTransactions = deputies.filter(
      (d) => d.transactionCount > 0 && d.transactionCount < 5
    );
    if (lowTransactions.length > 0) {
      issues.push({
        type: 'incomplete',
        severity: 'low',
        message: `${lowTransactions.length} deputados com menos de 5 transacoes`,
        count: lowTransactions.length,
      });
    }

    // Missing category breakdown
    const missingCategories = deputies.filter(
      (d) => d.totalSpending > 0 && (!d.byCategory || d.byCategory.length === 0)
    );
    if (missingCategories.length > 0) {
      issues.push({
        type: 'missing',
        severity: 'medium',
        message: `${missingCategories.length} deputados sem detalhamento por categoria`,
        count: missingCategories.length,
      });
    }

    // Missing monthly data
    const missingMonthly = deputies.filter(
      (d) => d.totalSpending > 0 && (!d.byMonth || d.byMonth.length === 0)
    );
    if (missingMonthly.length > 0) {
      issues.push({
        type: 'missing',
        severity: 'medium',
        message: `${missingMonthly.length} deputados sem serie temporal`,
        count: missingMonthly.length,
      });
    }

    // Extreme HHI values (perfect concentration)
    const perfectHHI = deputies.filter((d) => d.hhi.value === 10000);
    if (perfectHHI.length > 0) {
      issues.push({
        type: 'outlier',
        severity: 'high',
        message: `${perfectHHI.length} deputados com HHI = 10000 (fornecedor unico)`,
        count: perfectHHI.length,
      });
    }

    // Very high round value percentages
    const extremeRound = deputies.filter((d) => d.roundValuePct > 80);
    if (extremeRound.length > 0) {
      issues.push({
        type: 'suspicious',
        severity: 'high',
        message: `${extremeRound.length} deputados com >80% valores redondos`,
        count: extremeRound.length,
      });
    }

    return issues.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [deputies]);

  // Calculate overall data quality score
  const qualityScore = useMemo(() => {
    const weights = {
      deputies_with_data: 30,
      deputies_with_categories: 20,
      deputies_with_monthly: 20,
      deputies_with_suppliers: 15,
      benford_calculated: 15,
    };

    let score = 0;
    qualityMetrics.forEach((m) => {
      const weight = weights[m.id as keyof typeof weights] || 0;
      score += (m.pct / 100) * weight;
    });

    // Deduct points for issues
    const issueDeductions = {
      high: 5,
      medium: 2,
      low: 1,
    };
    dataIssues.forEach((issue) => {
      score -= issueDeductions[issue.severity];
    });

    return Math.max(0, Math.min(100, score));
  }, [qualityMetrics, dataIssues]);

  // Data coverage by time
  const dataCoverage = useMemo(() => {
    const months = aggregations.byMonth || [];
    if (months.length === 0) return null;

    const sortedMonths = [...months].sort((a, b) => a.month.localeCompare(b.month));
    const firstMonth = sortedMonths[0]?.month;
    const lastMonth = sortedMonths[sortedMonths.length - 1]?.month;
    const monthsWithData = months.filter((m) => m.transactionCount > 0).length;

    return {
      firstMonth,
      lastMonth,
      totalMonths: months.length,
      monthsWithData,
      coverage: (monthsWithData / months.length) * 100,
    };
  }, [aggregations]);

  // D3 distribution chart
  useEffect(() => {
    if (!distributionRef.current) return;

    const svg = d3.select(distributionRef.current);
    svg.selectAll('*').remove();

    const containerWidth = distributionRef.current.parentElement?.clientWidth || 300;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create histogram of transaction counts
    const validDeputies = deputies.filter((d) => d.transactionCount > 0);
    const transactionCounts = validDeputies.map((d) => d.transactionCount);

    const histogram = d3
      .bin()
      .domain([0, d3.max(transactionCounts) || 1000])
      .thresholds(20);

    const bins = histogram(transactionCounts);

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(transactionCounts) || 1000])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (d) => d.length) || 10])
      .range([chartHeight, 0]);

    // Bars
    g.selectAll('.bar')
      .data(bins)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.x0 || 0))
      .attr('y', (d) => yScale(d.length))
      .attr('width', (d) => Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 1))
      .attr('height', (d) => chartHeight - yScale(d.length))
      .attr('fill', '#4AA3A0')
      .attr('rx', 2);

    // X-axis
    g.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .selectAll('text')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', chartHeight + 25)
      .attr('text-anchor', 'middle')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px')
      .text('Transacoes');

    // Y-axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', '#A0A3B1')
      .attr('font-size', '10px');

    // Style axis lines
    svg.selectAll('.domain, .tick line').attr('stroke', '#3a3b45');
  }, [deputies, height]);

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'text-accent-teal';
      case 'warning':
        return 'text-risk-high';
      case 'critical':
        return 'text-risk-critical';
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Qualidade dos Dados</h3>
          <p className="text-sm text-text-muted">
            Analise de completude e consistencia do dataset
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            qualityScore >= 80
              ? 'bg-accent-teal/20'
              : qualityScore >= 60
                ? 'bg-risk-high/20'
                : 'bg-risk-critical/20'
          }`}
        >
          <span className="text-xs text-text-muted">Score:</span>
          <span
            className={`text-lg font-bold ${
              qualityScore >= 80
                ? 'text-accent-teal'
                : qualityScore >= 60
                  ? 'text-risk-high'
                  : 'text-risk-critical'
            }`}
          >
            {qualityScore.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completeness Metrics */}
        <div>
          <h4 className="text-sm font-semibold text-text-secondary mb-3">Completude dos Dados</h4>
          <div className="space-y-3" ref={completenessRef}>
            {qualityMetrics.map((metric) => (
              <div key={metric.id} className="bg-bg-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-primary">{metric.label}</span>
                  <span className={`text-sm font-mono ${getStatusColor(metric.status)}`}>
                    {formatNumber(metric.value)} / {formatNumber(metric.total)}
                  </span>
                </div>
                <div className="relative h-2 bg-bg-card rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      metric.status === 'good'
                        ? 'bg-accent-teal'
                        : metric.status === 'warning'
                          ? 'bg-risk-high'
                          : 'bg-risk-critical'
                    }`}
                    style={{ width: `${metric.pct}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Distribution Chart */}
        <div>
          <h4 className="text-sm font-semibold text-text-secondary mb-3">
            Distribuicao de Transacoes
          </h4>
          <div className="bg-bg-secondary rounded-lg p-4">
            <svg
              ref={distributionRef}
              width="100%"
              height={height}
              className="overflow-visible"
            />
          </div>
        </div>
      </div>

      {/* Data Coverage */}
      {dataCoverage && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-text-secondary mb-3">Cobertura Temporal</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-secondary rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-text-primary">{dataCoverage.firstMonth}</p>
              <p className="text-xs text-text-muted">Primeiro mes</p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-text-primary">{dataCoverage.lastMonth}</p>
              <p className="text-xs text-text-muted">Ultimo mes</p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-text-primary">{dataCoverage.totalMonths}</p>
              <p className="text-xs text-text-muted">Meses totais</p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-accent-teal">
                {formatPercent(dataCoverage.coverage)}
              </p>
              <p className="text-xs text-text-muted">Cobertura</p>
            </div>
          </div>
        </div>
      )}

      {/* Data Issues */}
      {dataIssues.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-text-secondary mb-3">
            Alertas de Qualidade ({dataIssues.length})
          </h4>
          <div className="space-y-2">
            {dataIssues.map((issue, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  issue.severity === 'high'
                    ? 'bg-risk-critical/10 border-risk-critical/30'
                    : issue.severity === 'medium'
                      ? 'bg-risk-high/10 border-risk-high/30'
                      : 'bg-bg-secondary border-border'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    issue.severity === 'high'
                      ? 'bg-risk-critical'
                      : issue.severity === 'medium'
                        ? 'bg-risk-high'
                        : 'bg-text-muted'
                  }`}
                />
                <span className="text-sm text-text-primary flex-1">{issue.message}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    issue.type === 'missing'
                      ? 'bg-accent-teal/20 text-accent-teal'
                      : issue.type === 'outlier'
                        ? 'bg-risk-critical/20 text-risk-critical'
                        : issue.type === 'suspicious'
                          ? 'bg-risk-high/20 text-risk-high'
                          : 'bg-bg-card text-text-muted'
                  }`}
                >
                  {issue.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 p-4 bg-bg-secondary rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-text-primary">
              {formatNumber(aggregations.meta.totalDeputies)}
            </p>
            <p className="text-xs text-text-muted">Deputados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent-teal">
              {formatNumber(aggregations.meta.totalTransactions)}
            </p>
            <p className="text-xs text-text-muted">Transacoes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">
              {formatNumber(aggregations.meta.totalSuppliers)}
            </p>
            <p className="text-xs text-text-muted">Fornecedores</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent-gold">
              {formatReais(aggregations.meta.totalSpending, true)}
            </p>
            <p className="text-xs text-text-muted">Total</p>
          </div>
        </div>
      </div>

      {/* Methodology note */}
      <div className="mt-4 p-3 bg-bg-card border border-border rounded-lg">
        <p className="text-xs text-text-muted">
          <span className="font-medium text-text-secondary">Metodologia:</span> Score de qualidade
          calculado com base em completude dos campos, cobertura temporal e ausencia de anomalias.
          Valores acima de 80% indicam dados de alta qualidade.
        </p>
      </div>
    </div>
  );
}

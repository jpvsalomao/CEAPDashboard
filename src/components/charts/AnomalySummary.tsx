import { useMemo, useState } from 'react';
import type { Deputy } from '../../types/data';
import { formatReais } from '../../utils/formatters';

interface AnomalySummaryProps {
  deputies: Deputy[];
}

interface AnomalyType {
  id: string;
  label: string;
  description: string;
  check: (d: Deputy) => boolean;
  severity: 'high' | 'medium' | 'low';
  color: string;
}

const ANOMALY_TYPES: AnomalyType[] = [
  {
    id: 'hhi_critical',
    label: 'HHI Crítico',
    description: 'Concentração de fornecedores acima de 3000',
    check: (d) => d.hhi.value > 3000,
    severity: 'high',
    color: '#DC4A4A',
  },
  {
    id: 'hhi_high',
    label: 'HHI Alto',
    description: 'Concentração de fornecedores entre 2500-3000',
    check: (d) => d.hhi.value > 2500 && d.hhi.value <= 3000,
    severity: 'medium',
    color: '#E5A84B',
  },
  {
    id: 'benford_significant',
    label: 'Benford Significativo',
    description: 'Chi-quadrado acima do limiar crítico (21.7)',
    check: (d) => (d.benford?.chi2 ?? 0) > 21.7,
    severity: 'high',
    color: '#DC4A4A',
  },
  {
    id: 'benford_elevated',
    label: 'Benford Elevado',
    description: 'Chi-quadrado acima da média esperada (15.5)',
    check: (d) => (d.benford?.chi2 ?? 0) > 15.5 && (d.benford?.chi2 ?? 0) <= 21.7,
    severity: 'medium',
    color: '#E5A84B',
  },
  {
    id: 'round_high',
    label: 'Valores Redondos',
    description: 'Mais de 30% das transações com valores redondos',
    check: (d) => (d.roundValuePct ?? 0) > 30,
    severity: 'medium',
    color: '#E5A84B',
  },
  {
    id: 'single_supplier',
    label: 'Fornecedor Único',
    description: 'Mais de 70% do gasto com um único fornecedor',
    check: (d) => d.topSuppliers.length > 0 && d.topSuppliers[0].pct > 70,
    severity: 'high',
    color: '#DC4A4A',
  },
  {
    id: 'few_suppliers',
    label: 'Poucos Fornecedores',
    description: 'Menos de 5 fornecedores distintos',
    check: (d) => d.supplierCount < 5,
    severity: 'low',
    color: '#4AA3A0',
  },
  {
    id: 'high_ticket',
    label: 'Ticket Elevado',
    description: 'Ticket médio acima de R$ 5.000',
    check: (d) => d.avgTicket > 5000,
    severity: 'medium',
    color: '#E5A84B',
  },
];

interface DeputyAnomalies {
  deputy: Deputy;
  anomalies: string[];
  anomalyCount: number;
  severityScore: number;
}

export function AnomalySummary({ deputies }: AnomalySummaryProps) {
  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Calculate anomaly counts and affected deputies
  const analysis = useMemo(() => {
    const anomalyCounts: Record<string, { count: number; deputies: Deputy[] }> = {};
    const deputyAnomalies: DeputyAnomalies[] = [];

    // Initialize counts
    ANOMALY_TYPES.forEach((type) => {
      anomalyCounts[type.id] = { count: 0, deputies: [] };
    });

    // Check each deputy
    deputies.forEach((deputy) => {
      const foundAnomalies: string[] = [];
      let severityScore = 0;

      ANOMALY_TYPES.forEach((type) => {
        if (type.check(deputy)) {
          anomalyCounts[type.id].count++;
          anomalyCounts[type.id].deputies.push(deputy);
          foundAnomalies.push(type.id);
          severityScore += type.severity === 'high' ? 3 : type.severity === 'medium' ? 2 : 1;
        }
      });

      if (foundAnomalies.length > 0) {
        deputyAnomalies.push({
          deputy,
          anomalies: foundAnomalies,
          anomalyCount: foundAnomalies.length,
          severityScore,
        });
      }
    });

    // Sort by severity score then anomaly count
    deputyAnomalies.sort((a, b) => b.severityScore - a.severityScore || b.anomalyCount - a.anomalyCount);

    // Calculate summary stats
    const totalAnomalies = Object.values(anomalyCounts).reduce((sum, c) => sum + c.count, 0);
    const deputiesWithAnomalies = deputyAnomalies.length;
    const highSeverityCount = deputyAnomalies.filter((d) => d.severityScore >= 6).length;
    const multiAnomalyCount = deputyAnomalies.filter((d) => d.anomalyCount >= 3).length;

    return {
      anomalyCounts,
      deputyAnomalies,
      totalAnomalies,
      deputiesWithAnomalies,
      highSeverityCount,
      multiAnomalyCount,
    };
  }, [deputies]);

  // Filter deputies by selected anomaly
  const filteredDeputies = useMemo(() => {
    if (!selectedAnomaly) return analysis.deputyAnomalies;
    return analysis.deputyAnomalies.filter((d) => d.anomalies.includes(selectedAnomaly));
  }, [selectedAnomaly, analysis.deputyAnomalies]);

  const displayDeputies = showAll ? filteredDeputies : filteredDeputies.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-bg-secondary p-4 rounded-lg text-center">
          <p className="text-3xl font-bold text-text-primary">{analysis.deputiesWithAnomalies}</p>
          <p className="text-xs text-text-muted mt-1">Deputados com anomalias</p>
          <p className="text-xs text-text-secondary">
            {((analysis.deputiesWithAnomalies / deputies.length) * 100).toFixed(1)}% do total
          </p>
        </div>
        <div className="bg-bg-secondary p-4 rounded-lg text-center">
          <p className="text-3xl font-bold text-risk-critical">{analysis.highSeverityCount}</p>
          <p className="text-xs text-text-muted mt-1">Alta severidade</p>
          <p className="text-xs text-text-secondary">Score &gt;= 6</p>
        </div>
        <div className="bg-bg-secondary p-4 rounded-lg text-center">
          <p className="text-3xl font-bold text-risk-high">{analysis.multiAnomalyCount}</p>
          <p className="text-xs text-text-muted mt-1">Múltiplas anomalias</p>
          <p className="text-xs text-text-secondary">3+ indicadores</p>
        </div>
        <div className="bg-bg-secondary p-4 rounded-lg text-center">
          <p className="text-3xl font-bold text-accent-teal">{analysis.totalAnomalies}</p>
          <p className="text-xs text-text-muted mt-1">Total de detecções</p>
          <p className="text-xs text-text-secondary">Todos os tipos</p>
        </div>
      </div>

      {/* Anomaly Type Breakdown */}
      <div className="bg-bg-secondary p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-text-primary mb-4">Detecções por Tipo</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ANOMALY_TYPES.map((type) => {
            const count = analysis.anomalyCounts[type.id].count;
            const pct = deputies.length > 0 ? (count / deputies.length) * 100 : 0;
            const isSelected = selectedAnomaly === type.id;

            return (
              <button
                key={type.id}
                onClick={() => setSelectedAnomaly(isSelected ? null : type.id)}
                className={`p-3 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'ring-2 ring-accent-teal bg-accent-teal/10'
                    : 'bg-bg-card hover:bg-bg-primary'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-lg font-bold text-text-primary">{count}</span>
                </div>
                <p className="text-xs font-medium text-text-secondary truncate">{type.label}</p>
                <p className="text-xs text-text-muted">{pct.toFixed(1)}%</p>
              </button>
            );
          })}
        </div>
        {selectedAnomaly && (
          <div className="mt-3 p-2 bg-bg-card rounded text-xs text-text-secondary">
            {ANOMALY_TYPES.find((t) => t.id === selectedAnomaly)?.description}
          </div>
        )}
      </div>

      {/* Deputies with Anomalies */}
      <div className="bg-bg-secondary p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-text-primary">
            Deputados com Anomalias
            {selectedAnomaly && (
              <span className="ml-2 text-xs text-text-muted font-normal">
                (filtrado: {ANOMALY_TYPES.find((t) => t.id === selectedAnomaly)?.label})
              </span>
            )}
          </h4>
          <span className="text-xs text-text-muted">{filteredDeputies.length} deputados</span>
        </div>

        <div className="space-y-2">
          {displayDeputies.map((item, idx) => (
            <div
              key={item.deputy.id}
              className="flex items-center gap-3 p-3 bg-bg-card rounded-lg"
            >
              {/* Rank */}
              <div className="w-6 text-center text-xs text-text-muted">{idx + 1}</div>

              {/* Deputy Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {item.deputy.name}
                </p>
                <p className="text-xs text-text-muted">
                  {item.deputy.party}-{item.deputy.uf} | {formatReais(item.deputy.totalSpending, true)}
                </p>
              </div>

              {/* Anomaly Indicators */}
              <div className="flex items-center gap-1">
                {item.anomalies.slice(0, 4).map((anomalyId) => {
                  const type = ANOMALY_TYPES.find((t) => t.id === anomalyId);
                  return (
                    <div
                      key={anomalyId}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: type?.color }}
                      title={type?.label}
                    />
                  );
                })}
                {item.anomalies.length > 4 && (
                  <span className="text-xs text-text-muted">+{item.anomalies.length - 4}</span>
                )}
              </div>

              {/* Severity Score */}
              <div className="flex items-center gap-2">
                <div
                  className={`px-2 py-1 rounded text-xs font-mono ${
                    item.severityScore >= 6
                      ? 'bg-risk-critical/20 text-risk-critical'
                      : item.severityScore >= 4
                        ? 'bg-risk-high/20 text-risk-high'
                        : 'bg-risk-medium/20 text-risk-medium'
                  }`}
                >
                  {item.severityScore}
                </div>
                <span className="text-xs text-text-muted">{item.anomalyCount} tipos</span>
              </div>
            </div>
          ))}
        </div>

        {filteredDeputies.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 w-full py-2 text-xs text-accent-teal hover:text-accent-gold transition-colors"
          >
            {showAll ? 'Mostrar menos' : `Ver todos os ${filteredDeputies.length} deputados`}
          </button>
        )}
      </div>

      {/* Severity Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-risk-critical" />
          <span className="text-text-muted">Alta severidade (3 pts)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-risk-high" />
          <span className="text-text-muted">Média severidade (2 pts)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-teal" />
          <span className="text-text-muted">Baixa severidade (1 pt)</span>
        </div>
      </div>

      {/* Interpretation */}
      <div className="text-xs text-text-muted p-3 bg-bg-card rounded-lg">
        <p className="font-medium text-text-secondary mb-1">Sobre o Score de Severidade:</p>
        <p>
          O score é calculado somando pontos por cada anomalia detectada: Alta (3 pts), Média (2 pts), Baixa (1 pt).
          Deputados com score &gt;= 6 são considerados de alta prioridade para análise.
        </p>
      </div>
    </div>
  );
}

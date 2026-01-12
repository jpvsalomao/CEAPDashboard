/**
 * Overview Tab Content
 * Main overview dashboard for the Analysis page
 */

import { RiskRadar } from '../../components/charts/RiskRadar';
import { PatternCorrelation } from '../../components/charts/PatternCorrelation';
import { ChartCard } from '../../components/ui/ChartCard';
import { getRiskColor } from '../../utils/formatters';
import type { Deputy, FraudFlag } from '../../types/data';

interface RiskStats {
  total: number;
  avgRiskScore: number;
  byRiskLevel: Record<string, FraudFlag[]>;
}

interface OverviewTabProps {
  deputies: Deputy[];
  riskStats: RiskStats;
}

export function OverviewTab({ deputies, riskStats }: OverviewTabProps) {
  return (
    <>
      {/* Risk Radar */}
      <ChartCard
        title="Radar de Analise Multidimensional"
        subtitle="Visualizacao composta de 6 dimensoes: Concentracao HHI, Desvio Benford, Valores Redondos, Velocidade de Gastos, Fim de Semana e Fim de Mes."
      >
        {deputies.length > 0 ? (
          <RiskRadar deputies={deputies} height={400} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </ChartCard>

      {/* Pattern Correlation Matrix */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Matriz de Correlacao de Padroes
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Analise de como os diferentes indicadores de risco se relacionam entre si.
            Clique em uma celula para ver o scatter plot.
          </p>
        </div>
        {deputies.length > 0 ? (
          <PatternCorrelation deputies={deputies} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>

      {/* Risk Level Distribution */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Distribuicao por Nivel de Risco
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(riskStats.byRiskLevel).map(([level, items]) => (
            <div key={level} className="text-center">
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-xl font-bold ${getRiskColor(level)}`}
                style={{
                  backgroundColor:
                    level === 'CRITICO'
                      ? 'rgba(220, 74, 74, 0.2)'
                      : level === 'ALTO'
                        ? 'rgba(229, 168, 75, 0.2)'
                        : level === 'MEDIO'
                          ? 'rgba(74, 163, 160, 0.2)'
                          : 'rgba(46, 204, 113, 0.2)',
                }}
              >
                {items.length}
              </div>
              <p className="text-sm text-text-secondary mt-2">{level}</p>
              <p className="text-xs text-text-muted">
                {((items.length / riskStats.total) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology Section */}
      <div className="glass-card p-6 border-l-4 border-accent-teal">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Metodologia de Analise
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h3 className="font-medium text-accent-teal mb-2">Indice HHI</h3>
            <p className="text-text-secondary">
              Mede a concentracao de gastos com fornecedores. Valores acima de 2500 indicam alta concentracao.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-accent-teal mb-2">Lei de Benford</h3>
            <p className="text-text-secondary">
              Analisa a distribuicao do primeiro digito. Desvios podem indicar manipulacao.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-accent-teal mb-2">Validacao CNAE</h3>
            <p className="text-text-secondary">
              Compara atividade economica das empresas com categorias de despesa recebidas.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

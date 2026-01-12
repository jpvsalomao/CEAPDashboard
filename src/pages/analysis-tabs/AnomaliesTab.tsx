/**
 * Anomalies Tab Content
 * Benford's Law analysis, round number detection, and anomaly summary
 */

import { BenfordChart } from '../../components/charts/BenfordChart';
import { BenfordPerDeputy } from '../../components/charts/BenfordPerDeputy';
import { RoundNumberChart } from '../../components/charts/RoundNumberChart';
import { AnomalySummary } from '../../components/charts/AnomalySummary';
import type { Deputy } from '../../types/data';

interface BenfordDeviation {
  deputyName: string;
  party: string;
  uf: string;
  details?: {
    benfordChi2?: number;
  };
}

interface BenfordAnalysis {
  topDeviations: BenfordDeviation[];
}

interface AnomaliesTabProps {
  deputies: Deputy[];
  benfordAnalysis: BenfordAnalysis;
}

export function AnomaliesTab({ deputies, benfordAnalysis }: AnomaliesTabProps) {
  return (
    <>
      {/* Anomaly Summary Dashboard */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Resumo de Anomalias</h2>
          <p className="text-sm text-text-secondary mt-1">
            Visão consolidada de todas as anomalias detectadas. Clique em um tipo para filtrar.
          </p>
        </div>
        {deputies.length > 0 ? (
          <AnomalySummary deputies={deputies} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>

      {/* Benford's Law Chart */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Lei de Benford</h2>
          <p className="text-sm text-text-secondary mt-1">
            A Lei de Benford preve a distribuicao esperada do primeiro digito em dados financeiros.
            Desvios significativos podem indicar manipulacao.
          </p>
        </div>
        <BenfordChart height={350} />

        {/* Top Deviations */}
        {benfordAnalysis.topDeviations.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              Deputados com maior desvio (Chi-quadrado)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {benfordAnalysis.topDeviations.slice(0, 6).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-bg-secondary rounded"
                >
                  <div>
                    <span className="text-sm text-text-primary">{item.deputyName}</span>
                    <span className="text-xs text-text-muted ml-2">
                      {item.party}-{item.uf}
                    </span>
                  </div>
                  <span className="font-mono text-sm text-risk-high">
                    {(item.details?.benfordChi2 ?? 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Benford Per Deputy */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Benford: Ranking por Deputado</h2>
          <p className="text-sm text-text-secondary mt-1">
            Classificacao pelo desvio chi-quadrado. Valores acima de 21.7 indicam desvio significativo (p&lt;0.01).
          </p>
        </div>
        {deputies.length > 0 ? (
          <BenfordPerDeputy deputies={deputies} height={550} maxItems={20} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>

      {/* Round Number Detection */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Deteccao de Valores Redondos</h2>
          <p className="text-sm text-text-secondary mt-1">
            Valores divisiveis por 100 ocorrem naturalmente em ~10% dos casos.
            Porcentagens muito altas podem indicar valores artificiais.
          </p>
        </div>
        {deputies.length > 0 ? (
          <RoundNumberChart data={deputies} height={500} threshold={30} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Patterns Tab Content
 * Temporal patterns, spending velocity, and behavioral analysis
 */

import { TemporalAnalysis } from '../../components/charts/TemporalAnalysis';
import { SpendingVelocity } from '../../components/charts/SpendingVelocity';
import { WeekendSpending } from '../../components/charts/WeekendSpending';
import { EndOfMonthPattern } from '../../components/charts/EndOfMonthPattern';
import { DuplicateDetection } from '../../components/charts/DuplicateDetection';
import type { Deputy, MonthlyData } from '../../types/data';

interface PatternsTabProps {
  deputies: Deputy[];
  monthlyData: MonthlyData[];
}

export function PatternsTab({ deputies, monthlyData }: PatternsTabProps) {
  return (
    <>
      {/* Temporal Analysis */}
      <div className="glass-card p-6">
        {monthlyData.length > 0 ? (
          <TemporalAnalysis data={monthlyData} height={400} initialView="yearly" />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>

      {/* Spending Velocity */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Velocidade de Gastos</h2>
          <p className="text-sm text-text-secondary mt-1">
            Analise de frequencia e ticket medio. Alta frequencia + tickets elevados = velocity score alto.
          </p>
        </div>
        {deputies.length > 0 ? (
          <SpendingVelocity deputies={deputies} height={550} maxItems={20} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>

      {/* Weekend Spending */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Gastos em Finais de Semana</h2>
          <p className="text-sm text-text-secondary mt-1">
            Transacoes em sabados e domingos. O esperado e ~7% do total.
          </p>
        </div>
        {deputies.length > 0 ? (
          <WeekendSpending deputies={deputies} height={550} maxItems={20} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>

      {/* End of Month Pattern */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Padrao de Fim de Mes</h2>
          <p className="text-sm text-text-secondary mt-1">
            Concentracao nos ultimos dias pode indicar "corrida" para uso da cota.
            Esperado: ~25% na ultima semana, ~3.5% no ultimo dia.
          </p>
        </div>
        {deputies.length > 0 ? (
          <EndOfMonthPattern deputies={deputies} height={550} maxItems={20} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>

      {/* Duplicate Detection */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Deteccao de Duplicatas</h2>
          <p className="text-sm text-text-secondary mt-1">
            Transacoes identicas ou muito similares podem indicar lancamentos duplicados.
          </p>
        </div>
        {deputies.length > 0 ? (
          <DuplicateDetection deputies={deputies} height={550} maxItems={20} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>
    </>
  );
}

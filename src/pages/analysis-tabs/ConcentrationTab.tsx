/**
 * Concentration Tab Content
 * HHI and supplier concentration analysis
 */

import { HHIChart } from '../../components/charts/HHIChart';
import { SupplierHeatmap } from '../../components/charts/SupplierHeatmap';
import { ChartCard } from '../../components/ui/ChartCard';
import type { Deputy } from '../../types/data';

interface ConcentrationTabProps {
  deputies: Deputy[];
  highHHIDeputies: Deputy[];
}

export function ConcentrationTab({ deputies, highHHIDeputies }: ConcentrationTabProps) {
  return (
    <>
      {/* HHI Concentration Chart */}
      <ChartCard
        title="Concentração de Fornecedores (HHI)"
        subtitle="O Índice Herfindahl-Hirschman mede a concentração de gastos com fornecedores. Valores acima de 2500 indicam alta concentração, acima de 3000 é crítico."
      >
        {highHHIDeputies.length > 0 ? (
          <HHIChart data={highHHIDeputies} height={500} maxItems={15} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </ChartCard>

      {/* Supplier Concentration Heatmap */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Mapa de Calor: Concentração por Fornecedor
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Visualização matricial dos 5 principais fornecedores de cada deputado.
            Cores mais intensas indicam maior concentração. Deputados ordenados por HHI.
          </p>
        </div>
        {deputies.length > 0 ? (
          <SupplierHeatmap data={deputies} height={600} maxDeputies={25} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>
    </>
  );
}

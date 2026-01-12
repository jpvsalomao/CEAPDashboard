/**
 * Comparisons Tab Content
 * Party, state, category comparisons and benchmarking
 */

import { PartyComparison } from '../../components/charts/PartyComparison';
import { StateComparison } from '../../components/charts/StateComparison';
import { CategoryDeepDive } from '../../components/charts/CategoryDeepDive';
import { DeputyBenchmark } from '../../components/charts/DeputyBenchmark';
import { SimilarityMatrix } from '../../components/charts/SimilarityMatrix';
import { ChartCard, ChartToggle } from '../../components/ui/ChartCard';
import type { Deputy, PartyData, StateData, CategoryData } from '../../types/data';

interface ComparisonsTabProps {
  deputies: Deputy[];
  partyData: PartyData[];
  stateData: StateData[];
  categoryData: CategoryData[];
  partyMetric: 'total' | 'average';
  stateMetric: 'total' | 'average';
  onPartyMetricChange: (metric: 'total' | 'average') => void;
  onStateMetricChange: (metric: 'total' | 'average') => void;
}

export function ComparisonsTab({
  deputies,
  partyData,
  stateData,
  categoryData,
  partyMetric,
  stateMetric,
  onPartyMetricChange,
  onStateMetricChange,
}: ComparisonsTabProps) {
  return (
    <>
      {/* Party Spending Comparison */}
      <ChartCard
        title="Gastos por Partido"
        subtitle={`Comparacao de gastos entre partidos.${partyMetric === 'total' ? ' Ordenado pelo valor total.' : ' Ordenado pela media por deputado.'}`}
        rightContent={
          <ChartToggle
            options={[
              { value: 'total', label: 'Total' },
              { value: 'average', label: 'Media/Dep' },
            ]}
            value={partyMetric}
            onChange={onPartyMetricChange}
          />
        }
      >
        {partyData.length > 0 ? (
          <PartyComparison data={partyData} height={450} maxItems={15} metric={partyMetric} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </ChartCard>

      {/* State Spending Comparison */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Gastos por Estado</h2>
            <p className="text-sm text-text-secondary mt-1">
              Comparacao por UF, agrupados por regiao.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onStateMetricChange('total')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                stateMetric === 'total'
                  ? 'bg-accent-teal text-bg-primary'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => onStateMetricChange('average')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                stateMetric === 'average'
                  ? 'bg-accent-teal text-bg-primary'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'
              }`}
            >
              Media/Dep
            </button>
          </div>
        </div>
        {stateData.length > 0 ? (
          <StateComparison data={stateData} height={600} metric={stateMetric} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>

      {/* Category Risk Analysis */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Analise de Risco por Categoria</h2>
          <p className="text-sm text-text-secondary mt-1">
            Categorias classificadas por nivel de risco. Divulgacao e Veiculos concentram mais casos.
          </p>
        </div>
        {categoryData.length > 0 ? (
          <CategoryDeepDive deputies={deputies} categories={categoryData} height={380} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>

      {/* Deputy Benchmarking */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Benchmarking: Deputados vs Medias</h2>
          <p className="text-sm text-text-secondary mt-1">
            Comparacao de gastos individuais com medias do partido e estado.
          </p>
        </div>
        {deputies.length > 0 && partyData.length > 0 ? (
          <DeputyBenchmark
            deputies={deputies}
            partyData={partyData}
            stateData={stateData}
            height={550}
            maxItems={20}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>

      {/* Similarity Matrix */}
      <div className="glass-card p-6">
        {deputies.length > 0 ? (
          <SimilarityMatrix deputies={deputies} height={600} maxDeputies={30} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            Carregando dados...
          </div>
        )}
      </div>
    </>
  );
}

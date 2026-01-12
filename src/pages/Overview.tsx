import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/kpi/StatCard';
import { CategoryBreakdown } from '../components/charts/CategoryBreakdown';
import { SpendingTimeline } from '../components/charts/SpendingTimeline';
import { SpendingHistogram } from '../components/charts/SpendingHistogram';
import { ScatterPlot } from '../components/charts/ScatterPlot';
import { PartyComparison } from '../components/charts/PartyComparison';
import { StateTreemap } from '../components/charts/StateTreemap';
import { TemporalAnalysis } from '../components/charts/TemporalAnalysis';
import { StatisticalInsights } from '../components/charts/StatisticalInsights';
import { TopSpenders } from '../components/charts/TopSpenders';
import { FilterBar } from '../components/filters/FilterBar';
import { ChartSkeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import { ChartErrorBoundary, SectionErrorBoundary } from '../components/ui/ErrorBoundary';
import { ErrorState } from '../components/ui/EmptyState';
import { ChartAnimation } from '../components/ui/ChartAnimation';
import { FavoritesSection } from '../components/ui/FavoritesSection';
import { DataFreshness } from '../components/ui/DataFreshness';
import { useTopDeputies, useDeputyStats, useFilteredDeputies, useFilteredAggregations } from '../hooks/useDeputies';
import { useFiltersStore } from '../store/filters';
import { formatReais, formatNumber } from '../utils/formatters';

// Section header component
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-8 bg-accent-teal rounded-full" />
      <div>
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Overview() {
  // Use filtered aggregations that respond to all filters
  const { data: aggregations, isLoading } = useFilteredAggregations();
  const { data: allDeputies } = useFilteredDeputies();
  const topDeputies = useTopDeputies(10);
  const deputyStats = useDeputyStats();
  const hasFilters = useFiltersStore((s) => s.hasActiveFilters());
  const [partyMetric, setPartyMetric] = useState<'total' | 'average'>('total');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="Visão Geral" subtitle="Carregando dados..." />
        <StatCardSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <div className="animate-pulse bg-bg-secondary h-6 w-48 rounded mb-4" />
            <ChartSkeleton type="bar" height={400} />
          </div>
          <div className="glass-card p-6">
            <div className="animate-pulse bg-bg-secondary h-6 w-48 rounded mb-4" />
            <ChartSkeleton type="line" height={400} />
          </div>
        </div>
      </div>
    );
  }

  if (!aggregations || aggregations.meta.totalDeputies === 0) {
    return (
      <div className="glass-card p-6">
        <ErrorState message="Nenhum dado encontrado para os filtros selecionados." />
      </div>
    );
  }

  const { meta, byCategory, byMonth, byParty, byState } = aggregations;
  const avgPerDeputy = meta.totalSpending / meta.totalDeputies;
  const avgPerTransaction = meta.totalSpending / meta.totalTransactions;
  const topTenTotal = topDeputies.reduce((sum, d) => sum + d.totalSpending, 0);

  return (
    <div className="space-y-8 pt-4">
      {/* ===== HEADER ===== */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Header
            title="Visão Geral"
            subtitle={`Periodo: ${meta.period.start || '...'} a ${meta.period.end || '...'}`}
            showSearch={false}
          />
          <DataFreshness
            lastUpdated={meta.lastUpdated}
            period={meta.period}
            className="self-start sm:self-auto"
          />
        </div>
        <p className="text-text-secondary text-sm max-w-2xl">
          Análise interativa de gastos parlamentares (CEAP) com detecção de anomalias, padrões de concentração e indicadores de risco.
        </p>
      </div>

      {/* ===== FILTERS ===== */}
      <FilterBar />

      {hasFilters && (
        <div className="flex items-center gap-2 px-4 py-2 bg-accent-teal/10 border border-accent-teal/30 rounded-lg">
          <svg className="w-4 h-4 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm text-accent-teal">
            Exibindo {formatNumber(deputyStats.total)} deputados filtrados
          </span>
        </div>
      )}

      {/* ===== SECTION 1: RESUMO ===== */}
      <section>
        <SectionHeader
          title="Resumo dos Dados"
          subtitle="Números gerais do período analisado"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard
            title="Total Analisado"
            value={formatReais(meta.totalSpending, true)}
            subtitle="em gastos parlamentares"
            icon="💰"
            variant="highlight"
          />
          <StatCard
            title="Transações"
            value={formatNumber(meta.totalTransactions)}
            subtitle="reembolsos processados"
            icon="📋"
          />
          <StatCard
            title="Deputados"
            value={formatNumber(meta.totalDeputies)}
            subtitle="parlamentares ativos"
            icon="👤"
          />
          <StatCard
            title="Fornecedores"
            value={formatNumber(meta.totalSuppliers)}
            subtitle="empresas e prestadores distintos"
            icon="🏢"
          />
        </div>

        {/* Quick Stats Bar */}
        <div className="glass-card p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-accent-teal">{formatReais(avgPerDeputy, true)}</p>
              <p className="text-xs text-text-muted">Média por Deputado</p>
            </div>
            <div>
              <p className="text-lg font-bold text-accent-amber">{formatReais(avgPerTransaction, true)}</p>
              <p className="text-xs text-text-muted">Média por Transação</p>
            </div>
            <div>
              <p className="text-lg font-bold text-accent-blue">{formatNumber(meta.totalTransactions / meta.totalDeputies)}</p>
              <p className="text-xs text-text-muted">Transações/Deputado</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{((topTenTotal / meta.totalSpending) * 100).toFixed(1)}%</p>
              <p className="text-xs text-text-muted">Top 10 do Total</p>
            </div>
          </div>
        </div>
      </section>

      {/* Favorites (if any) */}
      <FavoritesSection showEmpty={false} />

      {/* ===== SECTION 2: DISTRIBUICAO ===== */}
      <section>
        <SectionHeader
          title="Distribuição por Deputado"
          subtitle="Como os gastos se distribuem entre os parlamentares"
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Histogram */}
          <ChartAnimation delay={0} className="h-full">
            <div className="glass-card p-6 h-full">
              <ChartErrorBoundary chartName="histograma de distribuição">
                
                  <SpendingHistogram deputies={allDeputies} height={350} bins={20} />
                
              </ChartErrorBoundary>
            </div>
          </ChartAnimation>

          {/* Top Spenders Compact */}
          <ChartAnimation delay={50} className="h-full">
            <div className="glass-card p-6 h-full">
              <ChartErrorBoundary chartName="maiores gastos">
                
                  <TopSpenders
                    data={allDeputies}
                    height={350}
                    expandable={false}
                    initialItems={10}
                  />
                
              </ChartErrorBoundary>
            </div>
          </ChartAnimation>
        </div>
      </section>

      {/* ===== SECTION 3: GEOGRAFIA ===== */}
      <section>
        <SectionHeader
          title="Distribuição Geográfica"
          subtitle="Gastos por estado e região"
        />

        <ChartAnimation delay={100}>
          <div className="glass-card p-6">
            <ChartErrorBoundary chartName="treemap geográfico">
              
                <StateTreemap data={byState} height={400} />
              
            </ChartErrorBoundary>
          </div>
        </ChartAnimation>
      </section>

      {/* ===== SECTION 4: CATEGORIAS ===== */}
      <section>
        <SectionHeader
          title="Onde o Dinheiro Vai"
          subtitle="Categorias de despesa com análise de concentração"
        />

        <ChartAnimation delay={150}>
          <div className="glass-card p-6">
            <ChartErrorBoundary chartName="gastos por categoria">
              
                <CategoryBreakdown data={byCategory} height={420} maxItems={10} />
              
            </ChartErrorBoundary>
          </div>
        </ChartAnimation>
      </section>

      {/* ===== SECTION 5: TEMPORAL ===== */}
      <section>
        <SectionHeader
          title="Evolução Temporal"
          subtitle="Como os gastos variam ao longo do tempo"
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Monthly Timeline */}
          <ChartAnimation delay={200} className="h-full">
            <div className="glass-card p-6 h-full">
              <ChartErrorBoundary chartName="evolução mensal">
                
                  <SpendingTimeline data={byMonth} height={350} />
                
              </ChartErrorBoundary>
            </div>
          </ChartAnimation>

          {/* YoY Comparison */}
          <ChartAnimation delay={250} className="h-full">
            <div className="glass-card p-6 h-full">
              <ChartErrorBoundary chartName="análise temporal">
                
                  <TemporalAnalysis data={byMonth} height={350} />
                
              </ChartErrorBoundary>
            </div>
          </ChartAnimation>
        </div>
      </section>

      {/* ===== SECTION 6: PARTIDOS ===== */}
      <section>
        <SectionHeader
          title="Distribuição Partidária"
          subtitle="Gastos agregados por partido político"
        />

        <ChartAnimation delay={300}>
          <div className="glass-card p-6">
            <ChartErrorBoundary chartName="comparativo de partidos">
              
                <div className="flex items-center justify-end mb-3">
                  <div className="flex bg-bg-secondary rounded-lg p-0.5 gap-0.5">
                    <button
                      onClick={() => setPartyMetric('total')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        partyMetric === 'total'
                          ? 'bg-accent-teal/20 text-accent-teal font-medium'
                          : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      Total
                    </button>
                    <button
                      onClick={() => setPartyMetric('average')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        partyMetric === 'average'
                          ? 'bg-accent-teal/20 text-accent-teal font-medium'
                          : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      Média/Deputado
                    </button>
                  </div>
                </div>
                <PartyComparison data={byParty} height={380} maxItems={15} metric={partyMetric} />
              
            </ChartErrorBoundary>
          </div>
        </ChartAnimation>
      </section>

      {/* ===== SECTION 7: CORRELACOES ===== */}
      <section>
        <SectionHeader
          title="Correlações"
          subtitle="Relação entre gastos, transações e concentração"
        />

        <ChartAnimation delay={350}>
          <div className="glass-card p-6">
            <ChartErrorBoundary chartName="gráfico de correlação">
              
                <ScatterPlot deputies={allDeputies} height={420} />
              
            </ChartErrorBoundary>
          </div>
        </ChartAnimation>
      </section>

      {/* ===== SECTION 8: INSIGHTS ===== */}
      <section>
        <SectionHeader
          title="Insights Estatísticos"
          subtitle="Análises e correlações identificadas nos dados"
        />

        <ChartAnimation delay={400}>
          <div className="glass-card p-6">
            <SectionErrorBoundary sectionName="insights estatísticos">
              <StatisticalInsights deputies={allDeputies} />
            </SectionErrorBoundary>
          </div>
        </ChartAnimation>
      </section>
    </div>
  );
}

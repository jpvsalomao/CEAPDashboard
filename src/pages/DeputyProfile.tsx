import { useParams, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/kpi/StatCard';
import { ChartSkeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/EmptyState';
import { ComparisonInsight } from '../components/ui/InsightCallout';
import { IndividualRiskRadar } from '../components/charts/IndividualRiskRadar';
import { OutlierExplanation } from '../components/charts/OutlierExplanation';
import { BenfordIndividual } from '../components/charts/BenfordIndividual';
import { CategoryBreakdownIndividual } from '../components/charts/CategoryBreakdownIndividual';
import { TemporalAnalysisIndividual } from '../components/charts/TemporalAnalysisIndividual';
import { AtypicalPatterns } from '../components/charts/AtypicalPatterns';
import { SimilarDeputies } from '../components/charts/SimilarDeputies';
import { VelocityChart } from '../components/charts/VelocityChart';
import { useDeputies } from '../hooks/useDeputies';
import { useAggregations, usePartyData, useStateData } from '../hooks/useAggregations';
import { formatReais, formatNumber, getRiskColor } from '../utils/formatters';

export function DeputyProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: deputies = [], isLoading } = useDeputies();
  const { data: aggregations } = useAggregations();
  const partyData = usePartyData();
  const stateData = useStateData();

  const deputy = deputies.find((d) => d.id === Number(id));

  // Calculate comprehensive comparisons
  const comparisons = useMemo(() => {
    if (!deputy || !aggregations) return null;

    const avgSpending = aggregations.meta.totalSpending / aggregations.meta.totalDeputies;

    // Party average
    const partyInfo = partyData.find(p => p.party === deputy.party);
    const partyAvg = partyInfo?.avgPerDeputy || avgSpending;

    // State average
    const stateInfo = stateData.find(s => s.uf === deputy.uf);
    const stateAvg = stateInfo?.avgPerDeputy || avgSpending;

    // Calculate percentiles
    const sortedBySpending = [...deputies].sort((a, b) => b.totalSpending - a.totalSpending);
    const spendingRank = sortedBySpending.findIndex(d => d.id === deputy.id) + 1;
    const spendingPercentile = 100 - (spendingRank / deputies.length * 100);

    const sortedByHHI = [...deputies].sort((a, b) => b.hhi.value - a.hhi.value);
    const hhiRank = sortedByHHI.findIndex(d => d.id === deputy.id) + 1;

    return {
      avgSpending,
      partyAvg,
      stateAvg,
      vsOverall: ((deputy.totalSpending - avgSpending) / avgSpending) * 100,
      vsParty: ((deputy.totalSpending - partyAvg) / partyAvg) * 100,
      vsState: ((deputy.totalSpending - stateAvg) / stateAvg) * 100,
      spendingPercentile,
      spendingRank,
      hhiRank,
      partyDeputyCount: partyInfo?.deputyCount || 0,
      stateDeputyCount: stateInfo?.deputyCount || 0,
    };
  }, [deputy, deputies, aggregations, partyData, stateData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="Carregando..." subtitle="Buscando dados do deputado" />
        <StatCardSkeleton count={4} />
        <div className="glass-card p-6">
          <ChartSkeleton type="bar" height={300} />
        </div>
      </div>
    );
  }

  if (!deputy || !comparisons) {
    return (
      <div className="space-y-6">
        <Header title="Deputado não encontrado" subtitle="ID inválido ou deputado inexistente" />
        <div className="glass-card p-6">
          <ErrorState message="O deputado solicitado não foi encontrado na base de dados." />
        </div>
        <Link
          to="/deputados"
          className="inline-flex items-center gap-2 text-accent-teal hover:underline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para lista de deputados
        </Link>
      </div>
    );
  }

  const avgTicket = deputy.totalSpending / deputy.transactionCount;

  // Calculate actual number of months from deputy's monthly data
  const monthCount = deputy.byMonth?.length || 36; // Fallback to 36 months (2023-2025)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link to="/deputados" className="hover:text-accent-teal transition-colors">
          Deputados
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-text-secondary">{deputy.name}</span>
      </div>

      {/* Section 1: Profile Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-bg-secondary flex items-center justify-center text-3xl font-bold text-text-secondary">
            {deputy.name.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text-primary">{deputy.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <span className="text-lg text-text-secondary">
                {deputy.party}-{deputy.uf}
              </span>
              {comparisons.spendingPercentile >= 90 && (
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-accent-amber/20 text-accent-amber">
                  Top {Math.round(100 - comparisons.spendingPercentile)}% em gastos
                </span>
              )}
            </div>
          </div>

          {/* External Links */}
          <div className="flex gap-2">
            <a
              href={`https://www.camara.leg.br/deputados/${deputy.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-card transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Câmara
            </a>
            <a
              href={`https://www.google.com/search?q="${encodeURIComponent(deputy.name)}"+deputado+${deputy.party}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-card transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Notícias
            </a>
          </div>
        </div>
      </div>

      {/* Section 2: Profile & Attendance Summary */}
      {(deputy.education || deputy.profession || deputy.attendance) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Profile Info */}
          {(deputy.education || deputy.profession || deputy.mandateCount) && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Perfil</h3>
              <div className="grid grid-cols-2 gap-4">
                {deputy.education && (
                  <div>
                    <p className="text-xs text-text-muted">Escolaridade</p>
                    <p className="text-sm text-text-primary">{deputy.education}</p>
                  </div>
                )}
                {deputy.profession && (
                  <div>
                    <p className="text-xs text-text-muted">Profissão</p>
                    <p className="text-sm text-text-primary">{deputy.profession}</p>
                  </div>
                )}
                {deputy.age && (
                  <div>
                    <p className="text-xs text-text-muted">Idade</p>
                    <p className="text-sm text-text-primary">{deputy.age} anos</p>
                  </div>
                )}
                {deputy.mandateCount && deputy.mandateCount > 1 && (
                  <div>
                    <p className="text-xs text-text-muted">Mandatos</p>
                    <p className="text-sm text-text-primary">{deputy.mandateCount}º mandato</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendance Info */}
          {deputy.attendance && deputy.attendance.totalEvents > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Presença em Eventos</h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">Taxa de presença</span>
                    <span className={`text-lg font-bold font-mono ${
                      deputy.attendance.rate >= 70 ? 'text-[#2ECC71]' :
                      deputy.attendance.rate >= 50 ? 'text-accent-amber' :
                      'text-accent-red'
                    }`}>
                      {deputy.attendance.rate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        deputy.attendance.rate >= 70 ? 'bg-[#2ECC71]' :
                        deputy.attendance.rate >= 50 ? 'bg-accent-amber' :
                        'bg-accent-red'
                      }`}
                      style={{ width: `${Math.min(100, deputy.attendance.rate)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-bg-secondary rounded-lg p-2">
                  <p className="text-lg font-bold text-text-primary font-mono">{deputy.attendance.events2023}</p>
                  <p className="text-xs text-text-muted">2023</p>
                </div>
                <div className="bg-bg-secondary rounded-lg p-2">
                  <p className="text-lg font-bold text-text-primary font-mono">{deputy.attendance.events2024}</p>
                  <p className="text-xs text-text-muted">2024</p>
                </div>
                <div className="bg-bg-secondary rounded-lg p-2">
                  <p className="text-lg font-bold text-text-primary font-mono">{deputy.attendance.events2025}</p>
                  <p className="text-xs text-text-muted">2025</p>
                </div>
              </div>
              <p className="text-xs text-text-muted mt-2 text-center">
                {deputy.attendance.totalEvents} eventos totais ({deputy.attendance.uniqueEvents} únicos)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Section 3: KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Gasto"
          value={formatReais(deputy.totalSpending, true)}
          subtitle={`#${comparisons.spendingRank} de ${deputies.length}`}
          icon="💰"
          variant={comparisons.spendingPercentile >= 90 ? 'highlight' : 'default'}
        />
        <StatCard
          title="Transações"
          value={formatNumber(deputy.transactionCount)}
          subtitle={`Ticket médio: ${formatReais(avgTicket)}`}
          icon="📋"
        />
        <StatCard
          title="Fornecedores"
          value={formatNumber(deputy.supplierCount)}
          subtitle="empresas contratadas"
          icon="🏢"
        />
        <StatCard
          title="Concentração (HHI)"
          value={deputy.hhi.value.toFixed(0)}
          subtitle={`#${comparisons.hhiRank} mais concentrado`}
          icon="📊"
          variant={deputy.hhi.value > 2500 ? 'highlight' : 'default'}
        />
      </div>

      {/* Section 3: Comparisons */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Comparação com Pares
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ComparisonInsight
            subject={deputy.name}
            subjectValue={formatReais(deputy.totalSpending, true)}
            baseline="Média geral"
            baselineValue={formatReais(comparisons.avgSpending, true)}
            interpretation={
              comparisons.vsOverall > 0
                ? `${comparisons.vsOverall.toFixed(1)}% acima da média geral`
                : `${Math.abs(comparisons.vsOverall).toFixed(1)}% abaixo da média geral`
            }
          />
          <ComparisonInsight
            subject={deputy.name}
            subjectValue={formatReais(deputy.totalSpending, true)}
            baseline={`Média ${deputy.party} (${comparisons.partyDeputyCount} dep.)`}
            baselineValue={formatReais(comparisons.partyAvg, true)}
            interpretation={
              comparisons.vsParty > 0
                ? `${comparisons.vsParty.toFixed(1)}% acima do partido`
                : `${Math.abs(comparisons.vsParty).toFixed(1)}% abaixo do partido`
            }
          />
          <ComparisonInsight
            subject={deputy.name}
            subjectValue={formatReais(deputy.totalSpending, true)}
            baseline={`Média ${deputy.uf} (${comparisons.stateDeputyCount} dep.)`}
            baselineValue={formatReais(comparisons.stateAvg, true)}
            interpretation={
              comparisons.vsState > 0
                ? `${comparisons.vsState.toFixed(1)}% acima do estado`
                : `${Math.abs(comparisons.vsState).toFixed(1)}% abaixo do estado`
            }
          />
        </div>
      </div>

      {/* Section 4: Risk Radar Analysis */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Perfil de Risco Multidimensional
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Análise em 6 dimensões comparada à média de todos os deputados.
          Valores mais altos indicam maior desvio da norma.
        </p>
        <IndividualRiskRadar
          deputy={deputy}
          allDeputies={deputies}
          showComparison={true}
          height={350}
        />
      </div>

      {/* Section 5: Outlier Explanation */}
      <div className="glass-card p-6">
        <OutlierExplanation
          deputy={deputy}
          allDeputies={deputies}
          height={350}
        />
      </div>

      {/* Section 6: Benford Analysis */}
      <div className="glass-card p-6">
        <BenfordIndividual
          deputy={deputy}
          showExpected={true}
          height={280}
        />
      </div>

      {/* Section 6: Category Breakdown */}
      {aggregations?.byCategory && (
        <div className="glass-card p-6">
          <CategoryBreakdownIndividual
            deputy={deputy}
            aggregatedCategories={aggregations.byCategory}
            height={450}
          />
        </div>
      )}

      {/* Section 7: Temporal Analysis */}
      {aggregations?.byMonth && (
        <div className="glass-card p-6">
          <TemporalAnalysisIndividual
            deputy={deputy}
            aggregatedMonthly={aggregations.byMonth}
            height={380}
          />
        </div>
      )}

      {/* Section 8: Velocity Chart */}
      {aggregations?.byMonth && (
        <div className="glass-card p-6">
          <VelocityChart
            deputy={deputy}
            aggregatedMonthly={aggregations.byMonth}
            allDeputies={deputies}
            height={320}
          />
        </div>
      )}

      {/* Section 9: Atypical Patterns */}
      <div className="glass-card p-6">
        <AtypicalPatterns
          deputy={deputy}
          allDeputies={deputies}
          aggregatedCategories={aggregations?.byCategory}
        />
      </div>

      {/* Section 10: Similar Deputies */}
      <div className="glass-card p-6">
        <SimilarDeputies
          deputy={deputy}
          allDeputies={deputies}
          maxResults={5}
        />
      </div>

      {/* Section 11: HHI Concentration Analysis */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Concentracao de Fornecedores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-muted">Indice HHI</span>
                <span className={`text-2xl font-bold font-mono ${getRiskColor(deputy.hhi.level)}`}>
                  {deputy.hhi.value.toFixed(0)}
                </span>
              </div>
              {/* HHI Gauge */}
              <div className="relative h-3 bg-bg-secondary rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="h-full bg-[#2ECC71]" style={{ width: '15%' }} />
                  <div className="h-full bg-[#4AA3A0]" style={{ width: '10%' }} />
                  <div className="h-full bg-[#E5A84B]" style={{ width: '5%' }} />
                  <div className="h-full bg-[#DC4A4A]" style={{ width: '70%' }} />
                </div>
                {/* Marker */}
                <div
                  className="absolute top-0 w-1 h-full bg-white shadow-md"
                  style={{ left: `${Math.min(99, deputy.hhi.value / 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>0</span>
                <span>1500</span>
                <span>2500</span>
                <span>3000</span>
                <span>10000</span>
              </div>
            </div>
            <p className="text-sm text-text-secondary">
              O HHI mede a concentracao de gastos entre fornecedores.
              Valores mais altos indicam maior dependencia de poucos fornecedores.
              {deputy.hhi.value > 2500 && (
                <span className="text-accent-amber block mt-2">
                  Este valor indica concentracao {deputy.hhi.value > 3000 ? 'muito alta' : 'alta'}.
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted mb-3">Escala de referencia:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#2ECC71]" />
                <span className="text-sm text-text-secondary">{'<'} 1500: Concentracao baixa</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#4AA3A0]" />
                <span className="text-sm text-text-secondary">1500-2500: Concentracao moderada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#E5A84B]" />
                <span className="text-sm text-text-secondary">2500-3000: Concentracao alta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#DC4A4A]" />
                <span className="text-sm text-text-secondary">{'>'} 3000: Concentracao muito alta</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 12: All Suppliers */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Fornecedores ({deputy.supplierCount} total)
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Top fornecedores por valor contratado. A barra mostra a porcentagem do gasto total.
        </p>
        <div className="space-y-3">
          {deputy.topSuppliers.map((supplier, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="w-6 h-6 rounded-full bg-accent-teal/20 text-accent-teal text-xs flex items-center justify-center font-medium flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-text-primary block truncate">{supplier.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-text-muted text-sm hidden sm:block">
                  {formatReais(supplier.value, true)}
                </span>
                <div className="w-24 bg-bg-primary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      supplier.pct > 50
                        ? 'bg-accent-red'
                        : supplier.pct > 30
                          ? 'bg-accent-amber'
                          : 'bg-accent-teal'
                    }`}
                    style={{ width: `${Math.min(100, supplier.pct)}%` }}
                  />
                </div>
                <span className="font-mono text-sm text-text-secondary w-14 text-right">
                  {supplier.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        {deputy.supplierCount > deputy.topSuppliers.length && (
          <p className="text-xs text-text-muted mt-4 text-center">
            Mostrando {deputy.topSuppliers.length} de {deputy.supplierCount} fornecedores
          </p>
        )}
      </div>

      {/* Section 13: Spending Metrics */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Metricas de Gastos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-bg-secondary p-4 rounded-lg">
            <p className="text-xs text-text-muted uppercase mb-1">Ticket Medio</p>
            <p className="text-xl font-bold text-text-primary font-mono">
              {formatReais(avgTicket, true)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              por transação
            </p>
          </div>
          <div className="bg-bg-secondary p-4 rounded-lg">
            <p className="text-xs text-text-muted uppercase mb-1">Transações/Mês</p>
            <p className="text-xl font-bold text-accent-teal font-mono">
              {(deputy.transactionCount / monthCount).toFixed(1)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              em média ({monthCount} meses)
            </p>
          </div>
          <div className="bg-bg-secondary p-4 rounded-lg">
            <p className="text-xs text-text-muted uppercase mb-1">Gasto/Mês</p>
            <p className="text-xl font-bold text-accent-amber font-mono">
              {formatReais(deputy.totalSpending / monthCount, true)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              em média ({monthCount} meses)
            </p>
          </div>
          <div className="bg-bg-secondary p-4 rounded-lg">
            <p className="text-xs text-text-muted uppercase mb-1">Top Fornecedor</p>
            <p className="text-xl font-bold text-text-primary font-mono">
              {deputy.topSuppliers[0]?.pct.toFixed(1)}%
            </p>
            <p className="text-xs text-text-secondary mt-1">
              do total
            </p>
          </div>
        </div>
      </div>

      {/* Section 14: Data Quality Note (conditional) */}
      {deputy.roundValuePct !== undefined && deputy.roundValuePct > 20 && (
        <div className="glass-card p-6 border-l-4 border-accent-amber">
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Nota sobre os Dados
          </h2>
          <p className="text-sm text-text-secondary">
            {deputy.roundValuePct.toFixed(1)}% das transações deste deputado possuem valores redondos
            (terminados em .00). A média geral é de aproximadamente 17%.
            Isso pode ter diversas explicações, incluindo arredondamentos por conveniência ou
            valores padronizados de contratos.
          </p>
        </div>
      )}

      {/* Section 15: About This Analysis */}
      <div className="glass-card p-6 bg-bg-secondary/50">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Sobre Esta Análise
        </h2>
        <div className="prose prose-sm prose-invert max-w-none">
          <p className="text-text-secondary">
            Os dados apresentados são provenientes da API de Dados Abertos da Câmara dos Deputados
            e referem-se à Cota para Exercício da Atividade Parlamentar (CEAP).
          </p>
          <p className="text-text-secondary mt-2">
            <strong className="text-text-primary">O que é a CEAP?</strong> É uma cota mensal
            destinada a custear despesas típicas do exercício do mandato parlamentar,
            como passagens, hospedagem, alimentação, combustível, e divulgação.
          </p>
          <p className="text-text-secondary mt-2">
            <strong className="text-text-primary">Limitações:</strong> Esta análise é puramente
            descritiva. Valores altos ou padrões atípicos não indicam necessariamente irregularidades.
            Cada deputado tem necessidades diferentes baseadas em sua atuação, distância do estado
            de origem, e atividades parlamentares.
          </p>
        </div>
      </div>

      {/* Back Link */}
      <Link
        to="/deputados"
        className="inline-flex items-center gap-2 text-accent-teal hover:underline"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Voltar para lista de deputados
      </Link>
    </div>
  );
}

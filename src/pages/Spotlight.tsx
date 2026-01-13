import { useParams, Link } from 'react-router-dom';
import { useMemo, useRef } from 'react';
import { useFilteredDeputies } from '../hooks/useDeputies';
import { useMismatches } from '../hooks/useFraudFlags';
import { formatReais, formatPercent } from '../utils/formatters';
import { colors, getRiskLevelColor } from '../utils/colors';
import { TransactionExplorer } from '../components/charts/TransactionExplorer';
import { SupplierAnalysis } from '../components/charts/SupplierAnalysis';
import { TemporalDeepDive } from '../components/charts/TemporalDeepDive';
import { SpotlightExport } from '../components/ui/SpotlightExport';
import { SpotlightDebate } from '../components/spotlight/SpotlightDebate';
import { SpotlightTimeline } from '../components/spotlight/SpotlightTimeline';
import { SpotlightBenford } from '../components/spotlight/SpotlightBenford';
import { SpotlightTransactions } from '../components/spotlight/SpotlightTransactions';
import { SpotlightComparison } from '../components/spotlight/SpotlightComparison';
import { SpotlightCategories } from '../components/spotlight/SpotlightCategories';
import { ChartSkeleton, Skeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import type { Deputy } from '../types/data';

// Import decomposed modules
import {
  SPOTLIGHT_CONTENT,
  CATEGORY_LABELS,
} from './spotlight/SpotlightContent';
import { SpotlightIndex } from './spotlight/SpotlightIndex';
import { MetricComparison, calculateAverages } from './spotlight/SpotlightMetrics';

// Helper to find deputy by ID
function findDeputyById(deputies: Deputy[], id?: number): Deputy | undefined {
  if (!id) return undefined;
  return deputies.find(d => d.id === id);
}

export function Spotlight() {
  const { slug } = useParams<{ slug: string }>();
  const { data: allDeputies = [], isLoading: deputiesLoading } = useFilteredDeputies();
  const { data: mismatches = [], isLoading: mismatchesLoading } = useMismatches();
  const isLoading = deputiesLoading || mismatchesLoading;

  // Ref for export functionality - must be declared before any conditional returns
  const contentRef = useRef<HTMLDivElement>(null);

  const content = slug ? SPOTLIGHT_CONTENT[slug] : undefined;

  const deputy = useMemo(() => {
    if (!content?.deputyId) return undefined;
    return findDeputyById(allDeputies, content.deputyId);
  }, [allDeputies, content?.deputyId]);

  const averages = useMemo(() => calculateAverages(allDeputies), [allDeputies]);

  // For CNAE mismatches spotlight
  const topMismatches = useMemo(() => {
    if (slug !== 'ceap-vs-cnae') return [];
    return mismatches.slice(0, 10);
  }, [slug, mismatches]);

  // For top HHI spotlight
  const topHHIDeputies = useMemo(() => {
    if (slug !== 'top-hhi-casos') return [];
    return allDeputies
      .filter(d => !d.name.includes('LIDERANCA') && d.transactionCount > 10)
      .sort((a, b) => b.hhi.value - a.hhi.value)
      .slice(0, 6);
  }, [slug, allDeputies]);

  // For weekend anomalies - data not yet available
  const weekendDataAvailable = false;

  // INDEX VIEW - when no slug provided, use the decomposed component
  if (!slug) {
    return <SpotlightIndex />;
  }

  // NOT FOUND VIEW - when slug is invalid
  if (!content) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-6xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Spotlight nao encontrado</h1>
          <p className="text-text-secondary mb-6">
            O caso "{slug}" nao existe ou foi removido.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/spotlight"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-teal text-bg-primary rounded-lg hover:opacity-90 transition"
            >
              Ver Todos os Casos
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-card transition"
            >
              Ir para Visao Geral
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // LOADING VIEW - when data is still loading
  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-4" />
          <span className="text-text-muted">/</span>
          <Skeleton className="w-32 h-4" />
          <span className="text-text-muted">/</span>
          <Skeleton className="w-40 h-4" />
        </div>

        {/* Header skeleton */}
        <header className="border-b border-border pb-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="w-48 h-8 mb-2" />
              <Skeleton className="w-64 h-5" />
            </div>
          </div>
        </header>

        {/* Summary skeleton */}
        <div className="glass-card p-6">
          <Skeleton className="w-full h-4 mb-2" />
          <Skeleton className="w-3/4 h-4 mb-2" />
          <Skeleton className="w-1/2 h-4" />
        </div>

        {/* Stats skeleton */}
        <StatCardSkeleton count={4} />

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <Skeleton className="w-40 h-6 mb-4" />
            <ChartSkeleton type="bar" height={300} />
          </div>
          <div className="glass-card p-6">
            <Skeleton className="w-40 h-6 mb-4" />
            <ChartSkeleton type="line" height={300} />
          </div>
        </div>
      </div>
    );
  }

  // Get prev/next spotlights for navigation
  const allSlugs = Object.keys(SPOTLIGHT_CONTENT);
  const currentIndex = allSlugs.indexOf(slug);
  const prevSlug = currentIndex > 0 ? allSlugs[currentIndex - 1] : null;
  const nextSlug = currentIndex < allSlugs.length - 1 ? allSlugs[currentIndex + 1] : null;

  return (
    <div className="space-y-8" ref={contentRef}>
      {/* Breadcrumb */}
      <nav className="text-sm text-text-muted flex items-center justify-between">
        <div>
          <Link to="/" className="hover:text-accent-teal transition">
            Visao Geral
          </Link>
          <span className="mx-2">/</span>
          <Link to="/spotlight" className="hover:text-accent-teal transition">
            Spotlight
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text-primary">{content.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {prevSlug && (
            <Link
              to={`/spotlight/${prevSlug}`}
              className="px-2 py-1 text-xs bg-bg-secondary rounded hover:bg-bg-card transition"
              title={SPOTLIGHT_CONTENT[prevSlug].title}
            >
              ← Anterior
            </Link>
          )}
          {nextSlug && (
            <Link
              to={`/spotlight/${nextSlug}`}
              className="px-2 py-1 text-xs bg-bg-secondary rounded hover:bg-bg-card transition"
              title={SPOTLIGHT_CONTENT[nextSlug].title}
            >
              Proximo →
            </Link>
          )}
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-border pb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-accent-teal/20 flex items-center justify-center text-2xl">
            {content.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-text-primary">{content.title}</h1>
              {!content.dataAvailable && (
                <span className="px-2 py-0.5 bg-accent-amber/20 text-accent-amber text-xs rounded-full">
                  Dados em processamento
                </span>
              )}
            </div>
            <p className="text-lg text-text-secondary mt-1">{content.subtitle}</p>
          </div>
          {deputy && (
            <div className="flex items-center gap-2">
              <SpotlightExport
                deputy={deputy}
                spotlightTitle={content.title}
              />
              <Link
                to={`/deputados/${deputy.id}`}
                className="px-4 py-2 bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-card hover:text-text-primary transition text-sm"
              >
                Ver Perfil Completo
              </Link>
            </div>
          )}
        </div>
        <p className="mt-4 text-text-secondary leading-relaxed">{content.summary}</p>

        {/* Category badge */}
        <div className="mt-4 flex items-center gap-2">
          <span className="px-3 py-1 bg-bg-secondary rounded-full text-sm text-text-muted">
            {CATEGORY_LABELS[content.category].icon} {CATEGORY_LABELS[content.category].title}
          </span>
        </div>
      </header>

      {/* External Context */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="text-accent-amber">📰</span>
          {content.externalContext.title}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {content.externalContext.items.map((item, i) => (
            <div key={i} className="bg-bg-secondary rounded-lg p-4">
              <h3 className="font-medium text-text-primary mb-2">{item.label}</h3>
              <p className="text-sm text-text-secondary">{item.description}</p>
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-teal text-sm hover:underline mt-2 inline-block"
                >
                  Saber mais →
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Data Section - Varies by spotlight type */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="text-accent-teal">📊</span>
          O Que os Dados Mostram
        </h2>

        {/* Deputy-specific metrics */}
        {deputy && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricComparison
                label="Gasto Total"
                deputyValue={deputy.totalSpending}
                avgValue={averages.spending}
              />
              <MetricComparison
                label="Transacoes"
                deputyValue={deputy.transactionCount}
                avgValue={averages.transactions}
                format="number"
              />
              <MetricComparison
                label="HHI"
                deputyValue={deputy.hhi.value}
                avgValue={averages.hhi}
                format="number"
              />
              <MetricComparison
                label="Fornecedores"
                deputyValue={deputy.supplierCount}
                avgValue={averages.suppliers}
                format="number"
              />
            </div>

            {/* Top suppliers */}
            <div className="bg-bg-secondary rounded-lg p-4">
              <h3 className="font-medium text-text-primary mb-3">Principais Fornecedores</h3>
              <div className="space-y-2">
                {deputy.topSuppliers.slice(0, 5).map((supplier, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-text-muted text-sm w-4">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-primary truncate max-w-[300px]">
                          {supplier.name}
                        </span>
                        <span className="text-text-secondary">
                          {formatPercent(supplier.pct)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-bg-card rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${supplier.pct}%`,
                            backgroundColor:
                              supplier.pct > 50
                                ? colors.accentRed
                                : supplier.pct > 25
                                  ? colors.accentAmber
                                  : colors.accentTeal,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Explorer - only for non-debate spotlights */}
            {content.category !== 'debate' && (
              <>
                <div className="bg-bg-secondary rounded-lg p-4">
                  <TransactionExplorer deputy={deputy} allDeputies={allDeputies} />
                </div>

                <div className="bg-bg-secondary rounded-lg p-4">
                  <SupplierAnalysis deputy={deputy} allDeputies={allDeputies} />
                </div>

                <div className="bg-bg-secondary rounded-lg p-4">
                  <TemporalDeepDive deputy={deputy} allDeputies={allDeputies} />
                </div>
              </>
            )}

            {/* Enriched data for debate spotlights */}
            {content.category === 'debate' && content.enrichedData && (
              <>
                {/* Timeline */}
                {content.enrichedData.timeline && (
                  <SpotlightTimeline events={content.enrichedData.timeline} />
                )}

                {/* Two column layout for Benford and Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Benford Analysis */}
                  {content.enrichedData.benfordDigits && (
                    <SpotlightBenford
                      digits={content.enrichedData.benfordDigits}
                      chi2={deputy.benford.chi2}
                      pValue={deputy.benford.pValue}
                      significant={deputy.benford.significant}
                    />
                  )}

                  {/* Category breakdown */}
                  {deputy.byCategory && (
                    <SpotlightCategories
                      categories={deputy.byCategory.map(c => ({
                        category: c.category,
                        value: c.value,
                        pct: c.pct,
                        highlight: c.category.toLowerCase().includes('veículo') ||
                                  c.category.toLowerCase().includes('locação'),
                      }))}
                      total={deputy.totalSpending}
                    />
                  )}
                </div>

                {/* Key transactions */}
                {content.enrichedData.transactionGroups && (
                  <SpotlightTransactions
                    groups={content.enrichedData.transactionGroups}
                    periodLabel={content.enrichedData.periodLabel || 'Periodo analisado'}
                    periodTotal={content.enrichedData.periodTotal || 0}
                  />
                )}

                {/* Comparative ranking */}
                <SpotlightComparison deputy={deputy} allDeputies={allDeputies} />
              </>
            )}
          </div>
        )}

        {/* CNAE Mismatches list */}
        {slug === 'ceap-vs-cnae' && topMismatches.length > 0 && (
          <div className="bg-bg-secondary rounded-lg p-4">
            <h3 className="font-medium text-text-primary mb-3">
              Top 10 Incompatibilidades Detectadas
            </h3>
            <div className="space-y-3">
              {topMismatches.map((m, i) => (
                <div key={i} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-text-primary font-medium">{m.supplierName}</p>
                      <p className="text-xs text-text-muted mt-1">
                        CNAE: {m.cnaePrincipal}
                      </p>
                      <p className="text-xs text-accent-red mt-1">
                        Cobrou: {m.expenseCategory}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-text-primary">
                        {formatReais(m.totalValue)}
                      </p>
                      <p className="text-xs text-text-muted">{m.transactionCount} transacoes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top HHI deputies */}
        {slug === 'top-hhi-casos' && topHHIDeputies.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topHHIDeputies.map((d, i) => (
              <Link
                key={d.id}
                to={`/deputado/${d.id}`}
                className="bg-bg-secondary rounded-lg p-4 hover:bg-bg-card transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: getRiskLevelColor(d.riskLevel) + '20',
                      color: getRiskLevelColor(d.riskLevel),
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span className="text-lg font-bold text-accent-red">{d.hhi.value.toFixed(0)}</span>
                </div>
                <h4 className="font-medium text-text-primary group-hover:text-accent-teal transition">
                  {d.name}
                </h4>
                <p className="text-xs text-text-muted mt-1">
                  {d.party} - {d.uf}
                </p>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-text-secondary">
                    Top fornecedor: <span className="text-text-primary">{d.topSuppliers[0]?.name}</span>
                  </p>
                  <p className="text-xs text-accent-red mt-1">
                    {formatPercent(d.topSuppliers[0]?.pct || 0)} dos gastos
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Weekend anomalies - data not yet available */}
        {slug === 'weekend-anomalies' && !weekendDataAvailable && (
          <div className="bg-bg-secondary rounded-lg p-8 text-center">
            <p className="text-4xl mb-4">📅</p>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Dados em Processamento
            </h3>
            <p className="text-text-secondary max-w-md mx-auto">
              A analise de gastos por dia da semana ainda esta sendo processada.
              Esta funcionalidade estara disponivel em breve com dados reais
              extraidos das transacoes.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-accent-amber/20 text-accent-amber rounded-full text-sm">
              <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse" />
              Em desenvolvimento
            </div>
          </div>
        )}
      </section>

      {/* Debate Section - for debate category spotlights */}
      {content.category === 'debate' && content.debate && (
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span>⚖️</span>
            Duas Leituras dos Mesmos Dados
          </h2>
          <SpotlightDebate debate={content.debate} slug={slug} />
        </section>
      )}

      {/* Methodology */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="text-accent-blue">🔬</span>
          Metodologia
        </h2>
        <div className="bg-bg-secondary rounded-lg p-6 space-y-4">
          <div>
            <h3 className="font-medium text-text-primary mb-2">Abordagem</h3>
            <p className="text-sm text-text-secondary">{content.methodology.approach}</p>
          </div>
          <div>
            <h3 className="font-medium text-text-primary mb-2">Thresholds Utilizados</h3>
            <ul className="list-disc list-inside space-y-1">
              {content.methodology.thresholds.map((t, i) => (
                <li key={i} className="text-sm text-text-secondary">
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-accent-amber mb-2">Limitacoes</h3>
            <ul className="list-disc list-inside space-y-1">
              {content.methodology.limitations.map((l, i) => (
                <li key={i} className="text-sm text-text-muted">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Related Spotlights */}
      {content.relatedSlugs.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span>🔗</span>
            Casos Relacionados
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {content.relatedSlugs.map(relatedSlug => {
              const related = SPOTLIGHT_CONTENT[relatedSlug];
              if (!related) return null;
              return (
                <Link
                  key={relatedSlug}
                  to={`/spotlight/${relatedSlug}`}
                  className="bg-bg-secondary rounded-lg p-4 hover:bg-bg-card transition group"
                >
                  <h3 className="font-medium text-text-primary group-hover:text-accent-teal transition">
                    {related.title}
                  </h3>
                  <p className="text-sm text-text-muted mt-1">{related.subtitle}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <aside className="bg-bg-card border border-border rounded-lg p-4 text-sm">
        <p className="text-text-muted">
          <span className="font-medium text-text-secondary">Nota:</span> Esta analise utiliza dados
          publicos do Portal de Dados Abertos da Camara dos Deputados. Os padroes identificados nao
          constituem prova de irregularidades e servem apenas para fins de transparencia e
          acompanhamento cidadao. Para denuncias formais, utilize os canais oficiais de controle.
        </p>
      </aside>
    </div>
  );
}

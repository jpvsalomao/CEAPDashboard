import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useDeputies } from '../hooks/useDeputies';
import { useAggregations } from '../hooks/useAggregations';
import { formatNumber } from '../utils/formatters';

/**
 * Methodology Page - "Comece Aqui" (Start Here)
 *
 * Welcoming onboarding experience that:
 * - Explains what the dashboard offers
 * - Shows key stats as a teaser
 * - Guides users on how to explore
 * - Provides methodology details (collapsible)
 */
export function Methodology() {
  const { data: deputies = [] } = useDeputies();
  const { data: aggregations } = useAggregations();
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  return (
    <div className="space-y-8">
      <Header
        title="Comece Aqui"
        subtitle="Seu guia para entender os gastos parlamentares"
        showSearch={false}
      />

      {/* ===== HERO SECTION ===== */}
      <section className="glass-card p-6 border-l-4 border-accent-teal">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🎯</div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Cada Deputado Tem Direito a R$ 45 mil/mês
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-3">
              A <strong>Cota para Exercício da Atividade Parlamentar</strong> (CEAP) cobre
              passagens, combustível, alimentação, divulgação e mais. Esse dinheiro vem do
              seu bolso — e todos os gastos são públicos.
            </p>
            <p className="text-text-secondary text-sm leading-relaxed">
              Aqui, aplicamos{' '}
              <span className="text-accent-teal font-semibold">estatística forense</span>{' '}
              nos dados reais: medimos concentração de fornecedores, comparamos gastos entre
              pares, e identificamos padrões atípicos. O resultado?{' '}
              <strong>Você entende onde o dinheiro público está indo</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ===== KEY STATS TEASER ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="📝"
          value={aggregations?.meta.totalTransactions ? formatNumber(aggregations.meta.totalTransactions) : '662K'}
          label="Transações"
          detail="analisadas"
        />
        <StatCard
          icon="💰"
          value={aggregations?.meta.totalSpending ? `R$ ${(aggregations.meta.totalSpending / 1e6).toFixed(0)}M` : 'R$ 686M'}
          label="Volume Total"
          detail="em gastos"
        />
        <StatCard
          icon="👤"
          value={formatNumber(deputies.length) || '847'}
          label="Deputados"
          detail="monitorados"
        />
        <StatCard
          icon="🔬"
          value="5+"
          label="Técnicas"
          detail="de análise"
        />
      </div>

      {/* ===== SECTION 01: O QUE VOCÊ VAI ENCONTRAR ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="01"
          title="O Que Você Vai Encontrar"
          subtitle="Três camadas de análise"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon="📊"
            title="Dados Reais"
            description="Extraídos diretamente da API oficial da Câmara dos Deputados. Atualizados mensalmente."
            highlight="Fonte oficial"
          />
          <FeatureCard
            icon="🔬"
            title="Análise Estatística"
            description="Lei de Benford, índice HHI, z-scores comparativos. Técnicas usadas em auditoria forense."
            highlight="5 indicadores"
          />
          <FeatureCard
            icon="🚩"
            title="Alertas de Risco"
            description="Score composto de 0 a 1 que prioriza casos para investigação humana. Não é acusação."
            highlight="Priorização"
          />
        </div>
      </section>

      {/* ===== SECTION 02: COMO FUNCIONA ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="02"
          title="Como Funciona"
          subtitle="De dados brutos a insights"
        />

        <div className="glass-card p-6">
          {/* Pipeline visual */}
          <div className="flex flex-col md:flex-row items-stretch gap-4 mb-6">
            <PipelineStep
              icon="🏛️"
              title="API da Câmara"
              description="Dados públicos oficiais"
              detail="662K+ transações"
              color="text-accent-blue"
            />
            <PipelineArrow />
            <PipelineStep
              icon="🐍"
              title="Pipeline Python"
              description="Limpeza e análise"
              detail="Benford, HHI, Z-Score"
              color="text-accent-amber"
            />
            <PipelineArrow />
            <PipelineStep
              icon="📊"
              title="Dashboard"
              description="Visualização interativa"
              detail="Você está aqui"
              color="text-accent-teal"
              active
            />
          </div>

          {/* Key insight */}
          <div className="bg-bg-secondary p-4 rounded-lg">
            <p className="text-sm text-text-secondary">
              <span className="text-accent-teal font-semibold">💡 Transparência total:</span>{' '}
              Todos os dados são públicos. Todas as técnicas são documentadas.
              Qualquer pessoa pode reproduzir esta análise.
            </p>
          </div>
        </div>
      </section>

      {/* ===== SECTION 03: COMECE A EXPLORAR ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="03"
          title="Comece a Explorar"
          subtitle="Escolha seu caminho"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NavigationCard
            to="/"
            icon="📊"
            title="Visão Geral"
            description="Panorama dos gastos, maiores gastadores, e distribuição por categoria"
            primary
          />
          <NavigationCard
            to="/modelo-de-dados"
            icon="🗄️"
            title="Modelo de Dados"
            description="Entenda a arquitetura técnica e os campos disponíveis"
          />
          <NavigationCard
            to="/votar"
            icon="🗳️"
            title="Votar"
            description="Escolha qual deputado devemos investigar a fundo"
          />
        </div>
      </section>

      {/* ===== SECTION 04: METODOLOGIA (COLLAPSIBLE) ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="04"
          title="Metodologia"
          subtitle="Detalhes técnicos das análises"
        />

        <div className="glass-card overflow-hidden">
          {/* Collapsible header */}
          <button
            onClick={() => setMethodologyOpen(!methodologyOpen)}
            className="w-full p-6 flex items-center justify-between hover:bg-bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📐</span>
              <div className="text-left">
                <p className="font-semibold text-text-primary">
                  Técnicas de Detecção de Anomalias
                </p>
                <p className="text-sm text-text-muted">
                  HHI, Lei de Benford, Z-Score, e mais
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-text-muted transition-transform ${methodologyOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Collapsible content */}
          {methodologyOpen && (
            <div className="px-6 pb-6 space-y-6 border-t border-border">
              {/* HHI */}
              <MethodologyCard
                title="Índice HHI (Herfindahl-Hirschman)"
                description="Mede a concentração de gastos com fornecedores. Um valor alto indica que poucos fornecedores recebem a maior parte dos recursos."
                formula="HHI = Soma(participação²) × 10.000"
                levels={[
                  { label: '< 1500', risk: 'Baixo', color: 'text-status-low', desc: 'Mercado competitivo' },
                  { label: '1500-2500', risk: 'Médio', color: 'text-accent-teal', desc: 'Concentração moderada' },
                  { label: '2500-3000', risk: 'Alto', color: 'text-accent-amber', desc: 'Concentração elevada' },
                  { label: '> 3000', risk: 'Crítico', color: 'text-accent-red', desc: 'Concentração extrema' },
                ]}
              />

              {/* Benford */}
              <MethodologyCard
                title="Lei de Benford"
                description="Prevê que em dados naturais, o dígito 1 aparece como primeiro dígito em ~30% dos casos. Desvios significativos podem indicar manipulação."
                formula="χ² teste com α = 0.05 (crítico: 15.51)"
                extra={
                  <div className="flex flex-wrap gap-2 text-xs font-mono mt-2">
                    {[
                      { d: 1, p: '30.1%' },
                      { d: 2, p: '17.6%' },
                      { d: 3, p: '12.5%' },
                      { d: 4, p: '9.7%' },
                      { d: 5, p: '7.9%' },
                      { d: 6, p: '6.7%' },
                      { d: 7, p: '5.8%' },
                      { d: 8, p: '5.1%' },
                      { d: 9, p: '4.6%' },
                    ].map(({ d, p }) => (
                      <span key={d} className="bg-bg-primary px-2 py-1 rounded">
                        {d}: {p}
                      </span>
                    ))}
                  </div>
                }
              />

              {/* Z-Score */}
              <MethodologyCard
                title="Análise Comparativa (Z-Score)"
                description="Mede quantos desvios-padrão um deputado está acima ou abaixo da média do seu grupo (partido ou estado). Z > 2 = outlier estatístico."
                formula="z = (valor - média) / desvio_padrão"
                levels={[
                  { label: 'vs Partido', risk: '', color: 'text-text-secondary', desc: 'Compara com média do partido' },
                  { label: 'vs Estado', risk: '', color: 'text-text-secondary', desc: 'Compara com média do estado' },
                ]}
              />

              {/* Risk Score */}
              <MethodologyCard
                title="Score de Risco Composto"
                description="Combina múltiplos indicadores em um score de 0.0 a 1.0. NÃO é probabilidade de fraude — é índice de priorização."
                formula="min(base_hhi + penalidades, 1.0)"
                levels={[
                  { label: '≥ 0.75', risk: 'CRÍTICO', color: 'text-accent-red', desc: '' },
                  { label: '0.55-0.74', risk: 'ALTO', color: 'text-accent-amber', desc: '' },
                  { label: '0.35-0.54', risk: 'MÉDIO', color: 'text-accent-teal', desc: '' },
                  { label: '< 0.35', risk: 'BAIXO', color: 'text-status-low', desc: '' },
                ]}
                extra={
                  <div className="mt-3 text-xs text-text-muted space-y-1">
                    <p><strong>Penalidades:</strong></p>
                    <ul className="ml-4 space-y-0.5">
                      <li>• +0.15 se Benford significativo</li>
                      <li>• +0.10 se valores redondos &gt; 20%</li>
                      <li>• +0.10 se top fornecedor &gt; 50%</li>
                      <li>• +0.08 se z-score partido &gt; 2</li>
                      <li>• +0.08 se z-score estado &gt; 2</li>
                    </ul>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </section>

      {/* ===== SECTION 05: TRANSPARÊNCIA ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="05"
          title="Transparência e Limitações"
          subtitle="O que você precisa saber"
        />

        <div className="glass-card p-6 border-l-4 border-accent-amber">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>
            <div className="space-y-3 text-text-secondary text-sm">
              <p>
                <strong className="text-text-primary">Anomalias não são provas.</strong>{' '}
                Os indicadores estatísticos destacam casos que merecem investigação adicional,
                não acusações.
              </p>
              <p>
                Cada caso pode ter explicações legítimas:
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Contratos fixos geram valores redondos legitimamente</li>
                <li>Deputados de estados grandes podem ter gastos maiores</li>
                <li>Nichos específicos podem ter poucos fornecedores disponíveis</li>
              </ul>
              <p className="text-text-muted pt-2">
                Este projeto tem fins educativos e de transparência. Os dados são
                públicos e qualquer pessoa pode reproduzir a análise.
              </p>
            </div>
          </div>
        </div>

        {/* Data source link */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔗</span>
              <div>
                <p className="font-medium text-text-primary text-sm">Fonte dos Dados</p>
                <p className="text-xs text-text-muted">API Dados Abertos da Câmara dos Deputados</p>
              </div>
            </div>
            <a
              href="https://dadosabertos.camara.leg.br/swagger/api.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent-teal hover:underline"
            >
              Ver documentação →
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER CTA ===== */}
      <section className="glass-card p-6 text-center">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Pronto para explorar?
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Comece pela Visão Geral para ver os dados em ação.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent-teal text-bg-primary font-semibold rounded-lg hover:bg-accent-teal/90 transition-colors"
        >
          Ir para Visão Geral
          <span>→</span>
        </Link>
      </section>
    </div>
  );
}

// ============= Helper Components =============

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="text-3xl font-bold text-accent-teal/30 font-mono">{number}</span>
      <div>
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, detail }: { icon: string; value: string; label: string; detail: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-text-muted uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{detail}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description, highlight }: {
  icon: string;
  title: string;
  description: string;
  highlight: string;
}) {
  return (
    <div className="glass-card p-5 hover:border-accent-teal/30 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-semibold text-text-primary">{title}</h3>
      </div>
      <p className="text-sm text-text-secondary mb-3">{description}</p>
      <span className="inline-block text-xs bg-accent-teal/10 text-accent-teal px-2 py-1 rounded">
        {highlight}
      </span>
    </div>
  );
}

function PipelineStep({ icon, title, description, detail, color, active }: {
  icon: string;
  title: string;
  description: string;
  detail: string;
  color: string;
  active?: boolean;
}) {
  return (
    <div className={`flex-1 p-4 rounded-lg ${active ? 'bg-accent-teal/10 border border-accent-teal/30' : 'bg-bg-secondary'}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className={`font-semibold text-sm ${color}`}>{title}</h4>
      <p className="text-xs text-text-muted">{description}</p>
      <p className="text-xs text-text-secondary mt-1">{detail}</p>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="hidden md:flex items-center text-text-muted text-2xl">→</div>
  );
}

function NavigationCard({ to, icon, title, description, primary }: {
  to: string;
  icon: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`glass-card p-5 block hover:border-accent-teal/50 transition-colors group ${
        primary ? 'border-accent-teal/30 bg-accent-teal/5' : ''
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-semibold text-text-primary group-hover:text-accent-teal transition-colors">
          {title}
        </h3>
        <span className="ml-auto text-text-muted group-hover:text-accent-teal transition-colors">→</span>
      </div>
      <p className="text-sm text-text-muted">{description}</p>
    </Link>
  );
}

function MethodologyCard({ title, description, formula, levels, extra }: {
  title: string;
  description: string;
  formula: string;
  levels?: Array<{ label: string; risk: string; color: string; desc: string }>;
  extra?: React.ReactNode;
}) {
  return (
    <div className="pt-6">
      <h4 className="text-base font-semibold text-text-primary mb-2">{title}</h4>
      <p className="text-sm text-text-secondary mb-3">{description}</p>

      <div className="bg-bg-secondary p-3 rounded-lg mb-3">
        <p className="text-xs text-text-muted mb-1">Fórmula:</p>
        <code className="text-sm text-accent-teal font-mono">{formula}</code>
      </div>

      {levels && levels.length > 0 && (
        <div className="space-y-1">
          {levels.map((level) => (
            <div key={level.label} className="flex items-center gap-2 text-sm">
              <span className={`font-mono ${level.color}`}>{level.label}</span>
              {level.risk && <span className={`font-semibold ${level.color}`}>{level.risk}</span>}
              {level.desc && <span className="text-text-muted">— {level.desc}</span>}
            </div>
          ))}
        </div>
      )}

      {extra}
    </div>
  );
}

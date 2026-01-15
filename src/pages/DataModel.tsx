import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { EntityDiagram } from '../components/methodology/EntityDiagram';
import { FieldGlossary } from '../components/methodology/FieldGlossary';
import { useDeputies } from '../hooks/useDeputies';
import { useAggregations } from '../hooks/useAggregations';
import { formatReais, formatNumber } from '../utils/formatters';

/**
 * DataModel Page - Technical documentation with real data examples
 *
 * Educational + Transparent + Engaging:
 * - Teaches concepts through real examples
 * - Shows exact implementation with live data
 * - Interactive exploration of the data model
 */
export function DataModel() {
  const { data: deputies = [] } = useDeputies();
  const { data: aggregations } = useAggregations();
  const [selectedDeputy, setSelectedDeputy] = useState<number>(0);

  // Get a sample deputy for examples (highest risk score for interesting data)
  const sampleDeputies = [...deputies]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);
  const exampleDeputy = sampleDeputies[selectedDeputy] || deputies[0];

  return (
    <div className="space-y-8 pt-4">
      <Header
        title="Modelo de Dados"
        subtitle="A arquitetura por tras da analise de gastos parlamentares"
        showSearch={false}
      />

      {/* ===== HERO: The Big Picture ===== */}
      <section className="glass-card p-6 border-l-4 border-accent-teal">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🏗️</div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Por que entender o modelo de dados?
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Todo dashboard conta uma historia. Esta pagina revela <strong>como</strong> essa
              historia e construida: de onde vem os dados, como sao transformados, e quais
              decisoes de design permitem identificar padroes suspeitos em meio a mais de
              <span className="text-accent-teal font-semibold"> 662 mil transacoes</span>.
            </p>
          </div>
        </div>
      </section>

      {/* ===== SECTION 1: Data Journey ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="01"
          title="A Jornada dos Dados"
          subtitle="Da API publica ate o seu navegador"
        />

        <div className="glass-card p-6">
          {/* Pipeline visualization */}
          <div className="flex flex-col md:flex-row items-stretch gap-4 mb-6">
            <PipelineStep
              icon="🏛️"
              title="API da Camara"
              description="Dados brutos de despesas"
              detail="662.938 transacoes"
              color="text-accent-blue"
            />
            <PipelineArrow />
            <PipelineStep
              icon="🐍"
              title="Pipeline Python"
              description="Limpeza + Analise"
              detail="HHI, Benford, Z-Score"
              color="text-accent-amber"
            />
            <PipelineArrow />
            <PipelineStep
              icon="📦"
              title="JSON Estatico"
              description="Pre-computado"
              detail="~7.3 MB total"
              color="text-accent-teal"
            />
            <PipelineArrow />
            <PipelineStep
              icon="📊"
              title="Dashboard"
              description="Visualizacao"
              detail="Voce esta aqui"
              color="text-status-low"
              active
            />
          </div>

          {/* Key insight */}
          <div className="bg-bg-secondary p-4 rounded-lg">
            <p className="text-sm text-text-secondary">
              <span className="text-accent-amber font-semibold">💡 Decisao de design:</span>{' '}
              Pre-computar todos os indicadores no Python permite que o dashboard carregue
              instantaneamente, sem necessidade de banco de dados ou servidor.
            </p>
          </div>
        </div>
      </section>

      {/* ===== LOCKED SECTIONS WRAPPER ===== */}
      <div className="relative">
        {/* Lock overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-bg-primary/90 to-bg-primary pointer-events-none" />
        <div className="absolute inset-x-0 top-16 z-20 flex flex-col items-center pointer-events-none">
          <div className="glass-card p-6 text-center max-w-md pointer-events-auto border border-border">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-teal/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Em Breve
            </h3>
            <p className="text-sm text-text-secondary">
              Esta seção está em desenvolvimento. Acompanhe as atualizações!
            </p>
          </div>
        </div>

        {/* Blurred content - sections 02-08 */}
        <div className="blur-[2px] opacity-40 select-none pointer-events-none space-y-8">

      {/* ===== SECTION 2: Live Data Stats ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="02"
          title="Os Numeros Reais"
          subtitle="Dados carregados neste momento"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Deputados"
            value={formatNumber(deputies.length)}
            detail="mandato atual"
            icon="👤"
          />
          <StatCard
            label="Transacoes"
            value={aggregations?.meta.totalTransactions ? formatNumber(aggregations.meta.totalTransactions) : '—'}
            detail="2023-2025"
            icon="📝"
          />
          <StatCard
            label="Volume Total"
            value={aggregations?.meta.totalSpending ? `R$ ${(aggregations.meta.totalSpending / 1e6).toFixed(0)}M` : '—'}
            detail="em gastos"
            icon="💰"
          />
          <StatCard
            label="Fornecedores"
            value={aggregations?.meta.totalSuppliers ? formatNumber(aggregations.meta.totalSuppliers) : '—'}
            detail="unicos"
            icon="🏢"
          />
        </div>
      </section>

      {/* ===== SECTION 3: Entity Relationships ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="03"
          title="Entidades e Relacionamentos"
          subtitle="Como os dados se conectam"
        />

        <div className="glass-card p-6">
          <EntityDiagram height={400} />

          {/* Entity cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <EntityCard
              name="Deputy"
              icon="👤"
              fields={18}
              description="O protagonista. Cada deputado tem gastos, fornecedores, e indicadores de risco calculados."
              example="João Silva (PT-SP)"
            />
            <EntityCard
              name="SupplierShare"
              icon="🏢"
              fields={4}
              description="Quanto cada fornecedor representa nos gastos de um deputado. Base para o calculo do HHI."
              example="Auto Locadora XYZ: 45.2%"
            />
            <EntityCard
              name="FraudFlag"
              icon="🚩"
              fields={7}
              description="Alertas calculados: Benford, valores redondos, concentracao. Nao e prova, e sinal."
              example="['HHI_ALTO', 'BENFORD']"
            />
            <EntityCard
              name="Aggregations"
              icon="📊"
              fields={5}
              description="Visao macro: totais por mes, categoria, partido e estado. Permite comparacoes."
              example="byParty: PT gastou R$ 89M"
            />
            <EntityCard
              name="CNPJMismatch"
              icon="⚠️"
              fields={9}
              description="Empresas cuja atividade (CNAE) nao bate com o tipo de despesa declarada."
              example="Clinica faturando 'Divulgacao'"
            />
            <EntityCard
              name="DataManifest"
              icon="📋"
              fields={6}
              description="Metadados para reproducibilidade: versao, hash SHA256, thresholds usados."
              example="version: 2.1.0"
            />
          </div>
        </div>
      </section>

      {/* ===== SECTION 4: Live Example ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="04"
          title="Exemplo Real"
          subtitle="Veja um registro completo de Deputy"
        />

        <div className="glass-card p-6">
          {/* Deputy selector */}
          {sampleDeputies.length > 0 && (
            <div className="mb-4">
              <label className="text-sm text-text-muted mb-2 block">
                Selecione um deputado para explorar:
              </label>
              <div className="flex flex-wrap gap-2">
                {sampleDeputies.map((d, idx) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDeputy(idx)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedDeputy === idx
                        ? 'bg-accent-teal text-bg-primary'
                        : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                    }`}
                  >
                    {d.name.split(' ').slice(0, 2).join(' ')}
                    <span className={`ml-1 text-xs ${
                      d.riskLevel === 'CRITICO' ? 'text-accent-red' :
                      d.riskLevel === 'ALTO' ? 'text-accent-amber' : ''
                    }`}>
                      ({d.riskLevel})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {exampleDeputy && (
            <div className="space-y-4">
              {/* Deputy header */}
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-accent-teal/20 flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{exampleDeputy.name}</h3>
                  <p className="text-sm text-text-muted">{exampleDeputy.party}-{exampleDeputy.uf}</p>
                </div>
                <div className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold ${
                  exampleDeputy.riskLevel === 'CRITICO' ? 'bg-accent-red/20 text-accent-red' :
                  exampleDeputy.riskLevel === 'ALTO' ? 'bg-accent-amber/20 text-accent-amber' :
                  exampleDeputy.riskLevel === 'MEDIO' ? 'bg-accent-teal/20 text-accent-teal' :
                  'bg-status-low/20 text-status-low'
                }`}>
                  {exampleDeputy.riskLevel}
                </div>
              </div>

              {/* JSON-like display */}
              <div className="bg-bg-secondary rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <pre className="text-text-secondary">
                  <span className="text-text-muted">{'{'}</span>{'\n'}
                  <JsonLine field="id" value={exampleDeputy.id} type="number" />
                  <JsonLine field="name" value={`"${exampleDeputy.name}"`} type="string" />
                  <JsonLine field="party" value={`"${exampleDeputy.party}"`} type="string" />
                  <JsonLine field="uf" value={`"${exampleDeputy.uf}"`} type="string" />
                  <JsonLine field="totalSpending" value={exampleDeputy.totalSpending} type="number" comment={formatReais(exampleDeputy.totalSpending)} />
                  <JsonLine field="transactionCount" value={exampleDeputy.transactionCount} type="number" />
                  <JsonLine field="avgTicket" value={exampleDeputy.avgTicket.toFixed(2)} type="number" comment={formatReais(exampleDeputy.avgTicket)} />
                  <JsonLine field="supplierCount" value={exampleDeputy.supplierCount} type="number" />
                  <span className="text-text-muted">  </span>
                  <span className="text-accent-blue">"hhi"</span>
                  <span className="text-text-muted">: {'{'}</span>{'\n'}
                  <span className="text-text-muted">    </span>
                  <span className="text-accent-blue">"value"</span>
                  <span className="text-text-muted">: </span>
                  <span className="text-accent-amber">{exampleDeputy.hhi.value}</span>
                  <span className="text-text-muted">,</span>
                  <span className="text-text-muted/50 ml-2">// {exampleDeputy.hhi.level}</span>{'\n'}
                  <span className="text-text-muted">    </span>
                  <span className="text-accent-blue">"level"</span>
                  <span className="text-text-muted">: </span>
                  <span className="text-status-low">"{exampleDeputy.hhi.level}"</span>{'\n'}
                  <span className="text-text-muted">  {'}'}</span>,{'\n'}
                  <span className="text-text-muted">  </span>
                  <span className="text-accent-blue">"benford"</span>
                  <span className="text-text-muted">: {'{'}</span>{'\n'}
                  <span className="text-text-muted">    </span>
                  <span className="text-accent-blue">"chi2"</span>
                  <span className="text-text-muted">: </span>
                  <span className="text-accent-amber">{exampleDeputy.benford.chi2.toFixed(2)}</span>
                  <span className="text-text-muted">,</span>
                  <span className="text-text-muted/50 ml-2">// {exampleDeputy.benford.chi2 > 15.51 ? '⚠️ > 15.51 critico' : '✓ normal'}</span>{'\n'}
                  <span className="text-text-muted">    </span>
                  <span className="text-accent-blue">"significant"</span>
                  <span className="text-text-muted">: </span>
                  <span className={exampleDeputy.benford.significant ? 'text-accent-red' : 'text-status-low'}>
                    {exampleDeputy.benford.significant ? 'true' : 'false'}
                  </span>{'\n'}
                  <span className="text-text-muted">  {'}'}</span>,{'\n'}
                  <JsonLine field="roundValuePct" value={exampleDeputy.roundValuePct.toFixed(1)} type="number" comment={`${exampleDeputy.roundValuePct.toFixed(1)}% valores redondos`} />
                  <JsonLine field="riskScore" value={exampleDeputy.riskScore.toFixed(2)} type="number" highlight />
                  <JsonLine field="riskLevel" value={`"${exampleDeputy.riskLevel}"`} type="string" />
                  <span className="text-text-muted">  </span>
                  <span className="text-accent-blue">"topSuppliers"</span>
                  <span className="text-text-muted">: [</span>
                  <span className="text-text-muted/50 ml-2">// {exampleDeputy.topSuppliers?.length || 0} fornecedores</span>{'\n'}
                  {exampleDeputy.topSuppliers?.slice(0, 2).map((s, i) => (
                    <span key={i}>
                      <span className="text-text-muted">    {'{'} </span>
                      <span className="text-accent-blue">"name"</span>
                      <span className="text-text-muted">: </span>
                      <span className="text-status-low">"{s.name.substring(0, 25)}..."</span>
                      <span className="text-text-muted">, </span>
                      <span className="text-accent-blue">"pct"</span>
                      <span className="text-text-muted">: </span>
                      <span className="text-accent-amber">{s.pct.toFixed(1)}</span>
                      <span className="text-text-muted"> {'}'}</span>
                      {i < 1 && <span className="text-text-muted">,</span>}{'\n'}
                    </span>
                  ))}
                  <span className="text-text-muted">  ]</span>,{'\n'}
                  <span className="text-text-muted">  </span>
                  <span className="text-accent-blue">"redFlags"</span>
                  <span className="text-text-muted">: </span>
                  <span className="text-status-low">[{exampleDeputy.redFlags?.map(f => `"${f}"`).join(', ')}]</span>{'\n'}
                  <span className="text-text-muted">{'}'}</span>
                </pre>
              </div>

              {/* Interpretation */}
              <div className="bg-bg-secondary/50 p-4 rounded-lg border border-border">
                <h4 className="text-sm font-semibold text-text-primary mb-2">📖 Como ler este registro:</h4>
                <ul className="text-xs text-text-secondary space-y-1">
                  <li>
                    <strong>HHI {exampleDeputy.hhi.value}:</strong>{' '}
                    {exampleDeputy.hhi.value > 3000 ? 'Concentracao extrema em poucos fornecedores' :
                     exampleDeputy.hhi.value > 2500 ? 'Alta concentracao de fornecedores' :
                     exampleDeputy.hhi.value > 1500 ? 'Concentracao moderada' : 'Distribuicao saudavel de fornecedores'}
                  </li>
                  <li>
                    <strong>Benford χ² {exampleDeputy.benford.chi2.toFixed(1)}:</strong>{' '}
                    {exampleDeputy.benford.significant ? 'Distribuicao de digitos ANORMAL - merece investigacao' : 'Distribuicao de digitos dentro do esperado'}
                  </li>
                  <li>
                    <strong>Risk Score {exampleDeputy.riskScore.toFixed(2)}:</strong>{' '}
                    Metrica composta considerando todos os indicadores acima
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== SECTION 5: Risk Score Deep Dive ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="05"
          title="Anatomia do Risk Score"
          subtitle="Como calculamos o indice de atencao"
        />

        <div className="glass-card p-6">
          <p className="text-sm text-text-secondary mb-6">
            O <strong>risk_score</strong> nao e uma probabilidade de fraude. E um{' '}
            <span className="text-accent-teal font-semibold">indice de priorizacao</span>{' '}
            que combina multiplos sinais estatisticos para destacar casos que merecem
            atencao humana.
          </p>

          {/* Visual formula - centered layout */}
          <div className="bg-bg-secondary rounded-lg p-6 mb-6">
            <div className="max-w-xl mx-auto space-y-4">
              {/* Base HHI */}
              <div className="text-center">
                <p className="text-xs text-text-muted mb-3 uppercase tracking-wide">Base (nivel HHI):</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <FormulaChip value="0.90" label="CRITICO" color="red" />
                  <FormulaChip value="0.70" label="ALTO" color="amber" />
                  <FormulaChip value="0.40" label="MEDIO" color="teal" />
                  <FormulaChip value="0.20" label="BAIXO" color="green" />
                </div>
              </div>

              {/* Plus sign */}
              <div className="text-center text-2xl text-text-muted font-light">+</div>

              {/* Penalties */}
              <div className="text-center">
                <p className="text-xs text-text-muted mb-3 uppercase tracking-wide">Penalidades:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <FormulaChip value="+0.15" label="Benford significativo" color="amber" />
                  <FormulaChip value="+0.10" label="Redondos > 20%" color="amber" />
                  <FormulaChip value="+0.10" label="Top fornecedor > 50%" color="amber" />
                  <FormulaChip value="+0.08" label="Z-score partido > 2" color="amber" />
                  <FormulaChip value="+0.08" label="Z-score estado > 2" color="amber" />
                </div>
              </div>

              {/* Equals sign */}
              <div className="text-center text-2xl text-text-muted font-light">=</div>

              {/* Result */}
              <div className="text-center py-2">
                <span className="text-xl font-bold text-accent-teal">min(soma, 1.0)</span>
                <p className="text-xs text-text-muted mt-2">Score final limitado entre 0 e 1</p>
              </div>
            </div>
          </div>

          {/* Risk levels - responsive grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RiskLevelCard level="CRITICO" range="≥ 0.75" color="red" />
            <RiskLevelCard level="ALTO" range="0.55-0.74" color="amber" />
            <RiskLevelCard level="MEDIO" range="0.35-0.54" color="teal" />
            <RiskLevelCard level="BAIXO" range="< 0.35" color="green" />
          </div>
        </div>
      </section>

      {/* ===== SECTION 6: Data Files ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="06"
          title="Arquivos JSON"
          subtitle="O que e servido para o navegador"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataFileCard
            filename="deputies.json"
            size="~7 MB"
            icon="👤"
            description="Todos os deputados com analises completas"
            fields={['id', 'name', 'party', 'hhi', 'benford', 'riskScore', 'topSuppliers', '...']}
            highlight
          />
          <DataFileCard
            filename="aggregations.json"
            size="~13 KB"
            icon="📊"
            description="Totais e breakdowns por dimensao"
            fields={['meta', 'byMonth', 'byCategory', 'byParty', 'byState']}
          />
          <DataFileCard
            filename="fraud-flags.json"
            size="~200 KB"
            icon="🚩"
            description="Alertas e indicadores detalhados"
            fields={['deputyId', 'flags', 'details', 'riskScore']}
          />
          <DataFileCard
            filename="mismatches.json"
            size="~50 KB"
            icon="⚠️"
            description="Incompatibilidades CNPJ/CNAE"
            fields={['cnpj', 'razaoSocial', 'cnaePrincipal', 'reason']}
          />
        </div>
      </section>

      {/* ===== SECTION 7: Field Glossary ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="07"
          title="Glossario de Campos"
          subtitle="Referencia tecnica completa"
        />

        <div className="glass-card p-6">
          <FieldGlossary searchable />
        </div>
      </section>

      {/* ===== SECTION 8: For Developers ===== */}
      <section className="space-y-4">
        <SectionHeader
          number="08"
          title="Para Desenvolvedores"
          subtitle="TypeScript types e integracao"
        />

        <div className="glass-card p-6">
          <p className="text-sm text-text-secondary mb-4">
            Todos os tipos estao definidos em{' '}
            <code className="px-1.5 py-0.5 bg-bg-secondary rounded text-accent-teal text-xs">
              src/types/data.ts
            </code>
            . Aqui estao os principais:
          </p>

          <div className="space-y-4">
            <CodeBlock
              title="Deputy (interface principal)"
              language="typescript"
              code={`interface Deputy {
  id: number;
  name: string;
  party: string;
  uf: string;
  totalSpending: number;
  transactionCount: number;
  avgTicket: number;
  supplierCount: number;
  hhi: { value: number; level: RiskLevel };
  benford: { chi2: number; pValue: number; significant: boolean };
  roundValuePct: number;
  riskScore: number;       // 0.0 - 1.0
  riskLevel: RiskLevel;    // CRITICO | ALTO | MEDIO | BAIXO
  topSuppliers: SupplierShare[];
  redFlags: string[];
  zScoreParty?: number;    // desvios da media do partido
  zScoreState?: number;    // desvios da media do estado
}`}
            />

            <CodeBlock
              title="Como buscar dados"
              language="typescript"
              code={`// React Query hooks disponiveis
import { useDeputies, useAggregations } from './hooks/useDeputies';

function MyComponent() {
  const { data: deputies, isLoading } = useDeputies();
  const { data: aggregations } = useAggregations();

  // Filtrar por risco
  const critical = deputies.filter(d => d.riskLevel === 'CRITICO');

  // Ordenar por gasto
  const topSpenders = [...deputies].sort((a, b) =>
    b.totalSpending - a.totalSpending
  );
}`}
            />
          </div>
        </div>
      </section>

      {/* ===== Footer CTA ===== */}
      <section className="glass-card p-6 text-center">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Quer ir mais fundo?
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Os notebooks Python que geram estes dados estao documentados na pagina de Metodologia.
        </p>
        <a
          href="/metodologia"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-teal text-bg-primary font-semibold rounded-lg hover:bg-accent-teal/90 transition-colors"
        >
          Ver Metodologia
          <span>→</span>
        </a>
      </section>

        </div>{/* End blurred content */}
      </div>{/* End locked sections wrapper */}
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

function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: string }) {
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

function EntityCard({ name, icon, fields, description, example }: {
  name: string;
  icon: string;
  fields: number;
  description: string;
  example: string;
}) {
  return (
    <div className="bg-bg-secondary p-4 rounded-lg hover:bg-bg-tertiary transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <code className="text-accent-teal font-semibold">{name}</code>
        <span className="text-xs bg-bg-tertiary px-1.5 py-0.5 rounded text-text-muted ml-auto">
          {fields} campos
        </span>
      </div>
      <p className="text-xs text-text-secondary mb-2">{description}</p>
      <p className="text-xs text-text-muted font-mono">ex: {example}</p>
    </div>
  );
}

function JsonLine({ field, value, type, comment, highlight }: {
  field: string;
  value: string | number;
  type: 'string' | 'number';
  comment?: string;
  highlight?: boolean;
}) {
  return (
    <>
      <span className="text-text-muted">  </span>
      <span className="text-accent-blue">"{field}"</span>
      <span className="text-text-muted">: </span>
      <span className={highlight ? 'text-accent-teal font-bold' : type === 'string' ? 'text-status-low' : 'text-accent-amber'}>
        {value}
      </span>
      <span className="text-text-muted">,</span>
      {comment && <span className="text-text-muted/50 ml-2">// {comment}</span>}
      {'\n'}
    </>
  );
}

function FormulaChip({ value, label, color }: { value: string; label: string; color: 'red' | 'amber' | 'teal' | 'green' }) {
  const colorClasses = {
    red: 'text-accent-red',
    amber: 'text-accent-amber',
    teal: 'text-accent-teal',
    green: 'text-status-low',
  };
  return (
    <div className="bg-bg-tertiary px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5">
      <span className={`font-bold ${colorClasses[color]}`}>{value}</span>
      <span className="text-text-muted">({label})</span>
    </div>
  );
}

function RiskLevelCard({ level, range, color }: { level: string; range: string; color: 'red' | 'amber' | 'teal' | 'green' }) {
  const styles = {
    red: 'bg-accent-red/10 border-accent-red/30 text-accent-red',
    amber: 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber',
    teal: 'bg-accent-teal/10 border-accent-teal/30 text-accent-teal',
    green: 'bg-status-low/10 border-status-low/30 text-status-low',
  };
  return (
    <div className={`p-3 rounded-lg text-center border ${styles[color]}`}>
      <p className="font-bold">{level}</p>
      <p className="text-xs text-text-muted mt-0.5">{range}</p>
    </div>
  );
}

function DataFileCard({ filename, size, icon, description, fields, highlight }: {
  filename: string;
  size: string;
  icon: string;
  description: string;
  fields: string[];
  highlight?: boolean;
}) {
  return (
    <div className={`glass-card p-4 ${highlight ? 'border-l-4 border-accent-teal' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <code className="text-accent-teal font-semibold text-sm">{filename}</code>
        <span className="text-xs bg-bg-secondary px-1.5 py-0.5 rounded text-text-muted ml-auto">{size}</span>
      </div>
      <p className="text-xs text-text-secondary mb-2">{description}</p>
      <div className="flex flex-wrap gap-1">
        {fields.map((f) => (
          <span key={f} className="text-xs font-mono bg-bg-secondary px-1.5 py-0.5 rounded text-text-muted">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function CodeBlock({ title, language, code }: { title: string; language: string; code: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        <span className="text-xs bg-bg-secondary px-2 py-0.5 rounded text-text-muted">{language}</span>
      </div>
      <pre className="bg-bg-secondary p-4 rounded-lg overflow-x-auto text-xs">
        <code className="text-accent-teal font-mono">{code}</code>
      </pre>
    </div>
  );
}

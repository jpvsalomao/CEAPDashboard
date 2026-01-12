import { useParams, Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useDeputies } from '../hooks/useDeputies';
import { useAggregations } from '../hooks/useAggregations';
import { formatReais, formatNumber, getRiskColor } from '../utils/formatters';

// Featured case studies with additional context
const caseStudyContext: Record<string, { title: string; summary: string; findings: string[] }> = {
  'gabriel-mota': {
    title: 'Gabriel Mota - Concentração Crítica em Serviços de Mídia',
    summary:
      'Gabriel Mota (REPUBLICANOS-RR) apresenta um dos maiores índices de concentração de fornecedores, com 60.9% dos gastos direcionados a uma única empresa de design e mídia social.',
    findings: [
      'HHI de 3972 - Nível Crítico de concentração',
      '50.7% dos valores são números redondos - muito acima da média',
      'Principal fornecedor CK INFO DESIGN recebeu R$ 985 mil',
      'Padrão de pagamentos mensais regulares ao mesmo fornecedor',
    ],
  },
  'eunicio-oliveira': {
    title: 'Eunício Oliveira - Dependência Extrema de Único Fornecedor',
    summary:
      'Ex-presidente do Senado, Eunício Oliveira possui o maior HHI entre os deputados analisados, com 82.9% de todos os gastos concentrados em uma única empresa de assessoria.',
    findings: [
      'HHI de 6795 - O mais alto entre todos os deputados',
      '82.9% dos gastos para CARNAÚBA ASSESSORIA DE COM E PUBLICIDADE',
      'Empresa recebeu R$ 1.17 milhão em pagamentos',
      'Padrão atípico de concentração para escala de gastos',
    ],
  },
  'dorinaldo-malafaia': {
    title: 'Dorinaldo Malafaia - Monopólio de Serviços de Produção',
    summary:
      'Dorinaldo Malafaia (PDT-AP) tem o segundo maior índice de concentração, com mais de 70% dos gastos direcionados a uma produtora de serviços.',
    findings: [
      'HHI de 4986 - Nível crítico de concentração',
      '70.8% concentrado em ORBE PRODUTORA & SERVIÇOS',
      'Empresa do Amapá recebeu mais de R$ 1 milhão',
      'Possível falta de competição no mercado local',
    ],
  },
  'adail-filho': {
    title: 'Adail Filho - Monopólio em Publicidade no Amazonas',
    summary:
      'Adail Filho (REPUBLICANOS-AM) concentra mais de 80% de seus gastos em apenas 3 fornecedores, sendo 38% em uma única empresa de publicidade de Manaus.',
    findings: [
      'HHI de 2545 - Nível Alto de concentração',
      '38.3% concentrado em ANIMAÇÃO PROMOÇÕES E PUBLICIDADE',
      'Top 3 fornecedores somam 80.6% dos gastos totais',
      'Mercado local com pouca competição - apenas 117 fornecedores',
      'Gasto total de R$ 1.6 milhão em 647 transações',
    ],
  },
  'giacobo': {
    title: 'Giacobo - Dependência de Gráfica no Paraná',
    summary:
      'Giacobo (PL-PR) apresenta concentração crítica com mais de 55% dos gastos direcionados a uma única editora gráfica.',
    findings: [
      'HHI de 3406 - Nível Crítico de concentração',
      '55.6% concentrado em GALZON EDITORA GRÁFICA LTDA',
      'Apenas 24 fornecedores no total - baixa diversificação',
      'Top 5 fornecedores representam 87% dos gastos',
      'Gasto total de R$ 1.45 milhão em 330 transações',
    ],
  },
  'tiririca': {
    title: 'Tiririca - Alta Concentração em Aéreas',
    summary:
      'Tiririca (PL-SP) apresenta concentração muito alta com 38% dos gastos em passagens aéreas pela TAM e 88% em apenas 3 fornecedores.',
    findings: [
      'HHI de 2948 - Nível Alto de concentração',
      '38.4% concentrado em passagens TAM',
      'Top 3 fornecedores somam 88% dos gastos',
      'Alto volume de viagens: 580 transações',
      'Gasto total de R$ 1.27 milhão',
    ],
  },
  'sostenes-cavalcante': {
    title: 'Sostenes Cavalcante - Caso Investigado (Operação)',
    summary:
      'Sostenes Cavalcante (PL-RJ) foi alvo de investigação por suspeitas de irregularidades em gastos com a cota parlamentar, incluindo aluguel de veículos.',
    findings: [
      'Caso real de investigação policial - não detectado pelo HHI',
      'Suspeita de uso irregular de verba para aluguel de veículos',
      'Alto volume de gastos com locação: R$ 430 mil encontrados em espécie',
      'Gasto 119% acima da média em categorias específicas',
      'IMPORTANTE: Demonstra limitações de análise automatizada',
    ],
  },
  'carlos-jordy': {
    title: 'Carlos Jordy - Caso Investigado (Desvio de Benford)',
    summary:
      'Carlos Jordy (PL-RJ) apresenta desvio significativo da Lei de Benford, pior que Sostenes Cavalcante, indicando possíveis anomalias nos valores declarados.',
    findings: [
      'Desvio da Lei de Benford pior que deputados investigados',
      'Padrão de valores atípico - suspeita de arredondamento',
      'Compartilha fornecedores com outros deputados investigados',
      'HHI baixo (799) não captura todas as anomalias',
      'Caso ilustra importância de múltiplas metodologias de análise',
    ],
  },
};

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICO: 'bg-accent-red/20 text-accent-red border-accent-red',
    ALTO: 'bg-accent-amber/20 text-accent-amber border-accent-amber',
    MEDIO: 'bg-accent-teal/20 text-accent-teal border-accent-teal',
    BAIXO: 'bg-status-low/20 text-status-low border-status-low',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${colors[level] || colors.MEDIO}`}>
      {level}
    </span>
  );
}

function SupplierBar({ name, value, pct }: { name: string; value: number; pct: number }) {
  const width = Math.min(pct, 100);
  const color =
    pct > 50
      ? 'bg-accent-red'
      : pct > 30
      ? 'bg-accent-amber'
      : pct > 15
      ? 'bg-accent-teal'
      : 'bg-accent-blue';

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-text-primary truncate max-w-[60%]">{name}</span>
        <span className="text-sm text-text-secondary">
          {formatReais(value, true)} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  comparison,
  isWarning,
}: {
  label: string;
  value: string | number;
  comparison?: string;
  isWarning?: boolean;
}) {
  return (
    <div className="p-4 bg-bg-secondary rounded-lg">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${isWarning ? 'text-accent-amber' : 'text-text-primary'}`}>
        {value}
      </p>
      {comparison && <p className="text-xs text-text-secondary mt-1">{comparison}</p>}
    </div>
  );
}

export function CaseStudy() {
  const { slug } = useParams<{ slug: string }>();
  const { data: deputies = [], isLoading } = useDeputies();
  const { data: aggregations } = useAggregations();

  // Find deputy by slug (name converted to slug) or by direct name match
  const deputy = deputies.find((d) => {
    const deputySlug = d.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    return deputySlug === slug || d.name.toLowerCase().includes(slug?.replace(/-/g, ' ') || '');
  });

  // Get context if available
  const context = slug ? caseStudyContext[slug] : null;

  // Calculate averages for comparison
  const avgSpending = aggregations
    ? aggregations.meta.totalSpending / aggregations.meta.totalDeputies
    : 800000;
  const avgHHI = deputies.length
    ? deputies.reduce((sum, d) => sum + d.hhi.value, 0) / deputies.length
    : 1500;
  const avgRoundPct = deputies.length
    ? deputies.reduce((sum, d) => sum + d.roundValuePct, 0) / deputies.length
    : 15;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="Estudo de Caso" subtitle="Carregando..." />
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-bg-secondary rounded-lg" />
          <div className="h-80 bg-bg-secondary rounded-lg" />
        </div>
      </div>
    );
  }

  if (!deputy) {
    return (
      <div className="space-y-6">
        <Header title="Estudo de Caso" subtitle="Deputado não encontrado" />
        <div className="glass-card p-8 text-center">
          <p className="text-text-secondary mb-4">
            O deputado "{slug}" não foi encontrado no banco de dados.
          </p>
          <Link to="/deputados" className="text-accent-teal hover:underline">
            Ver todos os deputados
          </Link>
        </div>

        {/* Show available case studies */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Estudos de Caso Disponíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(caseStudyContext).map(([studySlug, info]) => (
              <Link
                key={studySlug}
                to={`/caso/${studySlug}`}
                className="p-4 bg-bg-secondary rounded-lg hover:bg-bg-card transition-colors"
              >
                <h3 className="font-medium text-text-primary">{info.title.split(' - ')[0]}</h3>
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">{info.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const spendingVsAvg = ((deputy.totalSpending - avgSpending) / avgSpending) * 100;
  const hhiVsAvg = ((deputy.hhi.value - avgHHI) / avgHHI) * 100;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-text-muted">
        <Link to="/" className="hover:text-text-secondary">
          Início
        </Link>
        <span className="mx-2">/</span>
        <Link to="/analise" className="hover:text-text-secondary">
          Análise
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text-secondary">{deputy.name}</span>
      </nav>

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary">{deputy.name}</h1>
              <RiskBadge level={deputy.riskLevel} />
            </div>
            <p className="text-text-secondary">
              {deputy.party} - {deputy.uf}
            </p>
            {context && (
              <p className="text-sm text-text-muted mt-3 max-w-2xl">{context.summary}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              to={`/deputado/${deputy.id}`}
              className="px-4 py-2 bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-card transition-colors text-sm"
            >
              Ver Perfil Completo
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Gasto"
          value={formatReais(deputy.totalSpending, true)}
          comparison={`${spendingVsAvg > 0 ? '+' : ''}${spendingVsAvg.toFixed(0)}% vs média`}
          isWarning={spendingVsAvg > 50}
        />
        <MetricCard
          label="Índice HHI"
          value={deputy.hhi.value.toFixed(0)}
          comparison={`${hhiVsAvg > 0 ? '+' : ''}${hhiVsAvg.toFixed(0)}% vs média`}
          isWarning={deputy.hhi.value > 2500}
        />
        <MetricCard
          label="Valores Redondos"
          value={`${deputy.roundValuePct.toFixed(1)}%`}
          comparison={`Média: ${avgRoundPct.toFixed(1)}%`}
          isWarning={deputy.roundValuePct > 30}
        />
        <MetricCard
          label="Transações"
          value={formatNumber(deputy.transactionCount)}
          comparison={`${deputy.supplierCount} fornecedores`}
        />
      </div>

      {/* Findings (if available) */}
      {context && context.findings.length > 0 && (
        <div className="glass-card p-6 border-l-4 border-accent-red">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Principais Descobertas</h2>
          <ul className="space-y-3">
            {context.findings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-accent-red mt-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span className="text-text-secondary">{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Red Flags */}
      {deputy.redFlags.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Alertas Identificados</h2>
          <div className="flex flex-wrap gap-2">
            {deputy.redFlags.map((flag, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-accent-red/10 text-accent-red rounded-lg text-sm"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Supplier Concentration */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Concentracao de Fornecedores
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Distribuicao dos gastos entre os principais fornecedores. Concentracao acima de 50% em um
          unico fornecedor indica possivel problema de dependencia.
        </p>

        {deputy.topSuppliers.map((supplier, idx) => (
          <SupplierBar
            key={idx}
            name={supplier.name}
            value={supplier.value}
            pct={supplier.pct}
          />
        ))}

        {/* HHI Reference Scale */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-text-muted mb-2">Escala de Referencia HHI</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-status-low/20 text-status-low rounded">
              &lt;1500 Baixo
            </span>
            <span className="px-2 py-1 bg-accent-teal/20 text-accent-teal rounded">
              1500-2500 Medio
            </span>
            <span className="px-2 py-1 bg-accent-amber/20 text-accent-amber rounded">
              2500-3000 Alto
            </span>
            <span className="px-2 py-1 bg-accent-red/20 text-accent-red rounded">
              &gt;3000 Critico
            </span>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Este deputado: <span className={getRiskColor(deputy.hhi.level)}>{deputy.hhi.value.toFixed(0)}</span> ({deputy.hhi.level})
          </p>
        </div>
      </div>

      {/* Related Case Studies */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Outros Estudos de Caso</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(caseStudyContext)
            .filter(([studySlug]) => studySlug !== slug)
            .map(([studySlug, info]) => (
              <Link
                key={studySlug}
                to={`/caso/${studySlug}`}
                className="p-4 bg-bg-secondary rounded-lg hover:bg-bg-card transition-colors"
              >
                <h3 className="font-medium text-text-primary text-sm">
                  {info.title.split(' - ')[0]}
                </h3>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                  {info.summary.substring(0, 100)}...
                </p>
              </Link>
            ))}
        </div>
      </div>

      {/* Methodology */}
      <div className="glass-card p-6 border-l-4 border-accent-teal">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Metodologia</h2>
        <p className="text-sm text-text-secondary">
          Esta analise utiliza o Indice Herfindahl-Hirschman (HHI) para medir concentracao de
          fornecedores, analise de valores redondos para detectar possíveis estimativas, e
          comparacao com medias do dataset de {formatNumber(deputies.length)} deputados para
          contextualizar os resultados.
        </p>
      </div>
    </div>
  );
}

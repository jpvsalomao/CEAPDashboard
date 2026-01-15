/**
 * SpotlightDeputyComparison - Comparação lado a lado dos deputados
 * Mostra que métricas estatísticas não contam toda a história
 */

import { formatReais } from '../../utils/formatters';

interface DeputyData {
  name: string;
  party: string;
  ceap: {
    total: number;
    transactions: number;
    suppliers: number;
    hhi: number;
    hhiLevel: string;
    benford: {
      chi2: number;
      significant: boolean;
    };
  };
  emendas: {
    total: number;
    beneficiaryCount: number;
    hhi: number;
    hhiLevel: string;
    bancoBrasil: {
      total: number;
      pct: number;
    };
  };
}

interface ComparisonMetric {
  metric: string;
  elmar: number;
  felix: number;
  winner: string;
  insight: string;
  unit?: string;
}

interface Props {
  elmar: DeputyData;
  felix: DeputyData;
  paradoxMetrics: ComparisonMetric[];
  explanation: string;
}

// Explicações das métricas para fins didáticos
const METRIC_EXPLANATIONS: Record<string, { short: string; interpretation: string }> = {
  'HHI CEAP': {
    short: 'Concentração de gastos entre fornecedores',
    interpretation: 'Maior = mais dependente de poucos fornecedores (risco de superfaturamento)',
  },
  'Benford Chi²': {
    short: 'Desvio estatístico nos valores das notas',
    interpretation: 'Maior = valores menos "naturais" (pode indicar valores fabricados)',
  },
  'Fornecedores': {
    short: 'Quantidade de empresas diferentes contratadas',
    interpretation: 'Menor = menos diversificação (mais fácil de controlar/fraudar)',
  },
  'HHI Emendas': {
    short: 'Concentração de destino das emendas',
    interpretation: 'Maior = emendas mais concentradas em poucos beneficiários',
  },
  'Beneficiarios': {
    short: 'Entidades que receberam emendas',
    interpretation: 'Menor = dinheiro mais concentrado em menos destinos',
  },
};

export function SpotlightDeputyComparison({ elmar, felix, paradoxMetrics, explanation }: Props) {
  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{'\u{1F50D}'}</span>
        <h3 className="text-lg font-semibold text-text-primary">Métricas Não Contam Toda a História</h3>
      </div>

      <p className="text-sm text-text-secondary mb-4">
        Se você olhasse apenas para estatísticas de gabinete, qual deputado pareceria mais arriscado?
        Compare as métricas dos dois:
      </p>

      {/* Introdução educativa às métricas */}
      <div className="mb-6 p-4 bg-bg-card rounded-lg border border-border">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Entenda as Métricas</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-text-muted text-xs mt-0.5">{'\u{2022}'}</span>
            <p className="text-xs text-text-secondary">
              <strong className="text-text-primary">HHI (Herfindahl-Hirschman)</strong>: Mede concentração.
              De 0 (totalmente disperso) a 10.000 (um único fornecedor). Acima de 2.500 é considerado alto.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-text-muted text-xs mt-0.5">{'\u{2022}'}</span>
            <p className="text-xs text-text-secondary">
              <strong className="text-text-primary">Benford (Chi²)</strong>: Testa se os valores seguem
              um padrão natural. Números fabricados tendem a ter desvios maiores. Acima de 16 é significativo.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-text-muted text-xs mt-0.5">{'\u{2022}'}</span>
            <p className="text-xs text-text-secondary">
              <strong className="text-text-primary">Fornecedores/Beneficiários</strong>: Quantidade de
              entidades diferentes. Menos = maior concentração = mais fácil de ocultar irregularidades.
            </p>
          </div>
        </div>
      </div>

      {/* Cabeçalho dos deputados */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        <div className="text-right text-sm text-text-muted">Métrica</div>
        <div className="text-center">
          <div className="inline-flex flex-col items-center">
            <span className="text-base sm:text-lg font-bold text-text-primary">{elmar.name.split(' ')[0]}</span>
            <span className="text-[10px] sm:text-xs text-text-muted">{elmar.party}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="inline-flex flex-col items-center">
            <span className="text-base sm:text-lg font-bold text-accent-amber">{felix.name.split(' ')[0]}</span>
            <span className="text-[10px] sm:text-xs text-accent-amber">{felix.party} - Alvo Fase 9</span>
          </div>
        </div>
      </div>

      {/* Comparação de métricas com tooltips */}
      <div className="space-y-2">
        {paradoxMetrics.map((m, idx) => {
          const elmarWorse = m.winner === 'felix';
          const unit = m.unit || '';
          const metricInfo = METRIC_EXPLANATIONS[m.metric];

          return (
            <div key={idx} className="group">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center py-2 border-b border-border last:border-0">
                <div className="text-right">
                  <span className="text-xs sm:text-sm text-text-muted">{m.metric}</span>
                  {metricInfo && (
                    <p className="text-xs text-text-muted/70 hidden group-hover:block">
                      {metricInfo.short}
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <span className={`font-mono text-sm sm:text-base font-medium ${elmarWorse ? 'text-accent-amber' : 'text-text-primary'}`}>
                    {m.elmar.toLocaleString('pt-BR')}{unit}
                  </span>
                  {elmarWorse && <span className="ml-1 text-xs text-accent-amber">{'\u{26A0}'}</span>}
                </div>
                <div className="text-center">
                  <span className={`font-mono text-sm sm:text-base font-medium ${!elmarWorse ? 'text-accent-amber' : 'text-text-primary'}`}>
                    {m.felix.toLocaleString('pt-BR')}{unit}
                  </span>
                  {!elmarWorse && <span className="ml-1 text-xs text-accent-amber">{'\u{26A0}'}</span>}
                </div>
              </div>
              {/* Insight ao passar o mouse */}
              <div className="hidden group-hover:block px-2 py-1 bg-bg-card rounded text-xs text-text-muted">
                {'\u{2192}'} {m.insight}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumo */}
      <div className="mt-6 p-4 bg-bg-card rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{'\u{1F3AF}'}</span>
          <span className="font-medium text-text-primary">O Que os Números Mostram</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="text-center p-3 bg-bg-secondary rounded">
            <p className="text-2xl font-bold text-accent-amber">
              {paradoxMetrics.filter(m => m.winner === 'felix').length}
            </p>
            <p className="text-xs text-text-muted">Métricas piores para Elmar</p>
          </div>
          <div className="text-center p-3 bg-bg-secondary rounded">
            <p className="text-2xl font-bold text-text-primary">
              {paradoxMetrics.filter(m => m.winner === 'elmar').length}
            </p>
            <p className="text-xs text-text-muted">Métrica pior para Félix</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          Se usássemos apenas essas métricas, Elmar pareceria mais "suspeito".
          Mas a investigação segue outro caminho.
        </p>
      </div>

      {/* Insight principal */}
      <div className="mt-4 p-4 bg-bg-card rounded-lg border-l-4 border-accent-teal">
        <p className="text-sm font-medium text-text-primary mb-2">
          {'\u{1F4A1}'} O Que Isso Significa
        </p>
        <p className="text-sm text-text-secondary">
          {explanation}
        </p>
        <p className="text-sm text-text-secondary mt-3">
          As emendas movimentam <strong className="text-text-primary">146x mais dinheiro</strong> que o CEAP.
          Investigações seguem o dinheiro grande, não estatísticas de gabinete.
        </p>
      </div>

      {/* Cards resumo */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-bg-card rounded-lg">
          <p className="text-xs text-text-muted mb-2">CEAP (ambos)</p>
          <p className="text-lg font-bold text-text-primary">{formatReais(elmar.ceap.total + felix.ceap.total, { noCents: true })}</p>
          <p className="text-xs text-text-secondary">O que analisamos aqui</p>
        </div>
        <div className="p-4 bg-bg-card rounded-lg border border-accent-amber/30">
          <p className="text-xs text-text-muted mb-2">Emendas (ambos)</p>
          <p className="text-lg font-bold text-accent-amber">{formatReais(elmar.emendas.total + felix.emendas.total, { noCents: true })}</p>
          <p className="text-xs text-accent-amber">O que a PF está investigando</p>
        </div>
      </div>
    </div>
  );
}

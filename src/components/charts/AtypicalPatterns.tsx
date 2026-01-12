import { useMemo } from 'react';
import type { Deputy, MonthlyData, CategoryData } from '../../types/data';
import { formatReais } from '../../utils/formatters';

interface AtypicalPatternsProps {
  deputy: Deputy;
  allDeputies: Deputy[];
  aggregatedMonthly?: MonthlyData[];
  aggregatedCategories?: CategoryData[];
}

interface Pattern {
  id: string;
  title: string;
  description: string;
  value: string;
  comparison?: string;
  severity: 'info' | 'moderate' | 'high';
  icon: string;
}

const monthNames = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function AtypicalPatterns({
  deputy,
  allDeputies,
  aggregatedCategories,
}: AtypicalPatternsProps) {
  const patterns = useMemo(() => {
    const detected: Pattern[] = [];

    // Calculate statistics from all deputies
    const allHHI = allDeputies.map(d => d.hhi.value);
    const avgHHI = allHHI.reduce((a, b) => a + b, 0) / allHHI.length;
    const hhiStd = Math.sqrt(allHHI.reduce((sum, v) => sum + Math.pow(v - avgHHI, 2), 0) / allHHI.length);

    const allRoundPct = allDeputies.map(d => d.roundValuePct);
    const avgRoundPct = allRoundPct.reduce((a, b) => a + b, 0) / allRoundPct.length;
    const roundStd = Math.sqrt(allRoundPct.reduce((sum, v) => sum + Math.pow(v - avgRoundPct, 2), 0) / allRoundPct.length);

    const allAvgTicket = allDeputies.map(d => d.avgTicket);
    const avgTicketAll = allAvgTicket.reduce((a, b) => a + b, 0) / allAvgTicket.length;
    const ticketStd = Math.sqrt(allAvgTicket.reduce((sum, v) => sum + Math.pow(v - avgTicketAll, 2), 0) / allAvgTicket.length);

    // 1. Check HHI concentration
    const hhiZScore = (deputy.hhi.value - avgHHI) / hhiStd;
    if (hhiZScore > 2) {
      detected.push({
        id: 'high-hhi',
        title: 'Alta Concentração de Fornecedores',
        description: `O índice HHI de ${deputy.hhi.value.toFixed(0)} está ${hhiZScore.toFixed(1)} desvios-padrão acima da média. Isso indica que uma parcela significativa dos gastos está concentrada em poucos fornecedores.`,
        value: deputy.hhi.value.toFixed(0),
        comparison: `Média: ${avgHHI.toFixed(0)}`,
        severity: hhiZScore > 3 ? 'high' : 'moderate',
        icon: '🎯',
      });
    }

    // 2. Check round value percentage
    const roundZScore = (deputy.roundValuePct - avgRoundPct) / roundStd;
    if (roundZScore > 1.5) {
      detected.push({
        id: 'round-values',
        title: 'Frequência de Valores Redondos',
        description: `${deputy.roundValuePct.toFixed(1)}% das transações possuem valores redondos (terminados em .00). Isso pode refletir contratos padronizados, estimativas, ou arredondamentos por conveniência.`,
        value: `${deputy.roundValuePct.toFixed(1)}%`,
        comparison: `Média: ${avgRoundPct.toFixed(1)}%`,
        severity: roundZScore > 2.5 ? 'high' : roundZScore > 2 ? 'moderate' : 'info',
        icon: '💯',
      });
    }

    // 3. Check average ticket
    const ticketZScore = (deputy.avgTicket - avgTicketAll) / ticketStd;
    if (Math.abs(ticketZScore) > 2) {
      const isHigh = ticketZScore > 0;
      detected.push({
        id: 'ticket-size',
        title: isHigh ? 'Ticket Médio Elevado' : 'Ticket Médio Baixo',
        description: isHigh
          ? `O valor médio por transação de ${formatReais(deputy.avgTicket)} é ${Math.abs(ticketZScore).toFixed(1)} desvios-padrão acima da média. Pode indicar transações de maior vulto.`
          : `O valor médio por transação de ${formatReais(deputy.avgTicket)} é ${Math.abs(ticketZScore).toFixed(1)} desvios-padrão abaixo da média. Pode indicar maior fracionamento de despesas.`,
        value: formatReais(deputy.avgTicket),
        comparison: `Média: ${formatReais(avgTicketAll)}`,
        severity: Math.abs(ticketZScore) > 3 ? 'high' : 'moderate',
        icon: isHigh ? '📈' : '📉',
      });
    }

    // 4. Check Benford's Law deviation
    if (deputy.benford.significant) {
      detected.push({
        id: 'benford-deviation',
        title: 'Desvio da Lei de Benford',
        description: `A distribuição dos primeiros dígitos das transações apresenta desvio estatisticamente significativo (p < 0.05) em relação ao padrão esperado. Isso pode ocorrer por diversos motivos, incluindo características específicas dos contratos ou tipos de despesas.`,
        value: `Chi²: ${deputy.benford.chi2.toFixed(1)}`,
        comparison: `p-value: ${deputy.benford.pValue.toFixed(4)}`,
        severity: deputy.benford.pValue < 0.01 ? 'high' : 'moderate',
        icon: '📊',
      });
    }

    // 5. Check top supplier dependency
    if (deputy.topSuppliers.length > 0) {
      const topSupplierPct = deputy.topSuppliers[0].pct;
      const allTopSupplierPcts = allDeputies.map(d => d.topSuppliers[0]?.pct || 0);
      const avgTopSupplierPct = allTopSupplierPcts.reduce((a, b) => a + b, 0) / allTopSupplierPcts.length;

      if (topSupplierPct > 40) {
        detected.push({
          id: 'supplier-dependency',
          title: 'Dependência de Fornecedor',
          description: `O principal fornecedor (${deputy.topSuppliers[0].name}) representa ${topSupplierPct.toFixed(1)}% do total de gastos. Isso indica alta dependência de um único fornecedor.`,
          value: `${topSupplierPct.toFixed(1)}%`,
          comparison: `Média: ${avgTopSupplierPct.toFixed(1)}%`,
          severity: topSupplierPct > 60 ? 'high' : 'moderate',
          icon: '🏢',
        });
      }
    }

    // 6. Check monthly spending volatility
    if (deputy.byMonth && deputy.byMonth.length > 3) {
      const monthlyValues = deputy.byMonth.map(m => m.value);
      const avgMonthly = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
      const variance = monthlyValues.reduce((sum, v) => sum + Math.pow(v - avgMonthly, 2), 0) / monthlyValues.length;
      const cv = Math.sqrt(variance) / avgMonthly; // Coefficient of variation

      // Calculate CV for all deputies
      const allCVs = allDeputies
        .filter(d => d.byMonth && d.byMonth.length > 3)
        .map(d => {
          const vals = d.byMonth!.map(m => m.value);
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const va = vals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / vals.length;
          return Math.sqrt(va) / avg;
        });

      const avgCV = allCVs.reduce((a, b) => a + b, 0) / allCVs.length;

      if (cv > avgCV * 1.8) {
        detected.push({
          id: 'high-volatility',
          title: 'Alta Variabilidade Mensal',
          description: `Os gastos mensais apresentam coeficiente de variação de ${(cv * 100).toFixed(0)}%, indicando grande oscilação entre meses. Pode ser resultado de projetos específicos ou sazonalidade nas atividades.`,
          value: `CV: ${(cv * 100).toFixed(0)}%`,
          comparison: `Média: ${(avgCV * 100).toFixed(0)}%`,
          severity: cv > avgCV * 2.5 ? 'high' : 'moderate',
          icon: '📈',
        });
      }

      // Check for spike months
      const threshold = avgMonthly * 2.5;
      const spikes = deputy.byMonth.filter(m => m.value > threshold);
      if (spikes.length > 0) {
        const topSpike = spikes.reduce((max, m) => m.value > max.value ? m : max, spikes[0]);
        const [year, month] = topSpike.month.split('-');
        const spikeRatio = topSpike.value / avgMonthly;

        detected.push({
          id: 'spending-spike',
          title: 'Pico de Gasto Identificado',
          description: `Em ${monthNames[parseInt(month) - 1]}/${year}, o gasto foi ${spikeRatio.toFixed(1)}x maior que a média mensal do deputado. ${spikes.length > 1 ? `Foram identificados ${spikes.length} meses com gastos acima de 2.5x a média.` : ''}`,
          value: formatReais(topSpike.value, true),
          comparison: `Média: ${formatReais(avgMonthly, true)}`,
          severity: spikeRatio > 4 ? 'high' : 'moderate',
          icon: '⚡',
        });
      }
    }

    // 7. Check category concentration
    if (deputy.byCategory && deputy.byCategory.length > 0 && aggregatedCategories) {
      const topCategory = deputy.byCategory[0];
      const overallCategory = aggregatedCategories.find(c => c.category === topCategory.category);

      if (topCategory.pct > 50 && overallCategory) {
        const deviation = topCategory.pct - overallCategory.pct;
        if (deviation > 20) {
          detected.push({
            id: 'category-concentration',
            title: 'Concentração em Categoria',
            description: `${topCategory.pct.toFixed(1)}% dos gastos estão na categoria "${topCategory.category}". Isso está ${deviation.toFixed(1)} pontos percentuais acima da distribuição média.`,
            value: `${topCategory.pct.toFixed(1)}%`,
            comparison: `Média: ${overallCategory.pct.toFixed(1)}%`,
            severity: deviation > 35 ? 'high' : 'moderate',
            icon: '📂',
          });
        }
      }
    }

    // 8. Check few transactions with high values
    const avgTransactionsAll = allDeputies.reduce((sum, d) => sum + d.transactionCount, 0) / allDeputies.length;
    const transactionZScore = (deputy.transactionCount - avgTransactionsAll) /
      Math.sqrt(allDeputies.reduce((sum, d) => sum + Math.pow(d.transactionCount - avgTransactionsAll, 2), 0) / allDeputies.length);

    if (transactionZScore < -1.5 && ticketZScore > 1.5) {
      detected.push({
        id: 'few-high-transactions',
        title: 'Poucas Transações de Alto Valor',
        description: `Combinação de número reduzido de transações (${deputy.transactionCount}) com ticket médio elevado. Pode indicar preferência por contratos consolidados ou serviços de maior valor.`,
        value: `${deputy.transactionCount} trans.`,
        comparison: `Média: ${avgTransactionsAll.toFixed(0)} trans.`,
        severity: 'info',
        icon: '💎',
      });
    }

    return detected;
  }, [deputy, allDeputies, aggregatedCategories]);

  if (patterns.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Padrões Atípicos
          </h3>
          <p className="text-sm text-text-muted">
            Análise de padrões que se desviam do comportamento típico
          </p>
        </div>
        <div className="p-6 bg-bg-secondary/50 rounded-lg text-center">
          <div className="text-3xl mb-2">✓</div>
          <p className="text-text-secondary">
            Nenhum padrão atípico significativo foi identificado para este deputado.
          </p>
          <p className="text-sm text-text-muted mt-1">
            Os indicadores analisados estão dentro dos parâmetros esperados.
          </p>
        </div>
      </div>
    );
  }

  const getSeverityStyles = (severity: Pattern['severity']) => {
    switch (severity) {
      case 'high':
        return {
          border: 'border-accent-amber/50',
          bg: 'bg-accent-amber/10',
          badge: 'bg-accent-amber/20 text-accent-amber',
          badgeText: 'Destaque',
        };
      case 'moderate':
        return {
          border: 'border-accent-teal/30',
          bg: 'bg-accent-teal/5',
          badge: 'bg-accent-teal/20 text-accent-teal',
          badgeText: 'Moderado',
        };
      default:
        return {
          border: 'border-bg-secondary',
          bg: 'bg-bg-secondary/30',
          badge: 'bg-bg-secondary text-text-secondary',
          badgeText: 'Info',
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Padrões Atípicos
          </h3>
          <p className="text-sm text-text-muted">
            {patterns.length} {patterns.length === 1 ? 'padrão identificado' : 'padrões identificados'} que se desviam do comportamento típico
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-accent-amber/20 text-accent-amber">
            {patterns.filter(p => p.severity === 'high').length} destaque
          </span>
          <span className="px-2 py-1 rounded bg-accent-teal/20 text-accent-teal">
            {patterns.filter(p => p.severity === 'moderate').length} moderado
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {patterns.map((pattern) => {
          const styles = getSeverityStyles(pattern.severity);
          return (
            <div
              key={pattern.id}
              className={`p-4 rounded-lg border ${styles.border} ${styles.bg} transition-colors hover:border-text-muted/30`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{pattern.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-text-primary">{pattern.title}</h4>
                    <span className={`px-1.5 py-0.5 text-xs rounded ${styles.badge}`}>
                      {styles.badgeText}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-3">
                    {pattern.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-text-muted">Valor: </span>
                      <span className="font-mono font-semibold text-text-primary">{pattern.value}</span>
                    </div>
                    {pattern.comparison && (
                      <div>
                        <span className="text-text-muted">{pattern.comparison}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-muted">
        Nota: Padrões atípicos são identificados por comparação estatística com todos os deputados.
        Eles não indicam necessariamente irregularidades, apenas comportamentos que diferem da média.
        Cada situação pode ter explicações legítimas baseadas nas especificidades da atividade parlamentar.
      </p>
    </div>
  );
}

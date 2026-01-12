/**
 * DeepDive content definitions and types
 * Extracted from DeepDive.tsx for better maintainability
 */

export interface DeepDiveContent {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  icon: string;
  category: 'case-study' | 'analysis' | 'methodology';
  dataAvailable: boolean;
  deputyId?: number;
  externalContext: {
    title: string;
    items: { label: string; description: string; link?: string }[];
  };
  methodology: {
    approach: string;
    thresholds: string[];
    limitations: string[];
  };
  relatedSlugs: string[];
}

export const DEEP_DIVE_CONTENT: Record<string, DeepDiveContent> = {
  'sostenes-cavalcante': {
    slug: 'sostenes-cavalcante',
    title: 'Sostenes Cavalcante',
    subtitle: 'Aluguel de Veiculos e Operacao Policial',
    summary: 'Analise dos gastos com aluguel de veiculos do deputado Sostenes Cavalcante (PL-RJ), que foi alvo de operacao policial em 2023. Este caso ilustra como os dados publicos podem revelar padroes que merecem atencao, mesmo quando os indicadores tradicionais de concentracao (HHI) nao sinalizam anomalias.',
    icon: '\u{1F697}',
    category: 'case-study',
    dataAvailable: true,
    deputyId: 204554,
    externalContext: {
      title: 'Contexto Externo',
      items: [
        {
          label: 'Operacao Policial',
          description: 'Em dezembro de 2023, a Policia Federal realizou operacao que investigou gastos com aluguel de veiculos pelo gabinete do deputado.',
        },
        {
          label: 'Categoria Investigada',
          description: 'Os gastos com "Locacao ou fretamento de veiculos automotores" representam uma das categorias mais vulneraveis a fraudes no CEAP.',
        },
        {
          label: 'Resultado',
          description: 'O caso ainda esta em andamento no sistema judicial. Nenhuma condenacao foi registrada ate o momento.',
        },
      ],
    },
    methodology: {
      approach: 'Este deep dive analisa os gastos do deputado no periodo 2023-2025, com foco especial na categoria de veiculos. Comparamos os valores com a media do partido (PL) e do estado (RJ).',
      thresholds: [
        'HHI > 2500 indica concentracao moderada de fornecedores',
        'Gastos com veiculos > 30% do total merecem atencao',
        'Ticket medio acima de R$ 5.000 em veiculos e incomum',
      ],
      limitations: [
        'Os dados publicos nao incluem detalhes sobre os servicos prestados',
        'Nao temos acesso as notas fiscais originais',
        'O HHI baixo nao significa ausencia de irregularidades',
        'A analise estatistica nao substitui auditoria formal',
      ],
    },
    relatedSlugs: ['top-hhi-casos', 'ceap-vs-cnae'],
  },
  'carlos-jordy': {
    slug: 'carlos-jordy',
    title: 'Carlos Jordy',
    subtitle: 'Desvio Significativo na Lei de Benford',
    summary: 'O deputado Carlos Jordy (PL-RJ) apresenta um dos maiores desvios da Lei de Benford no conjunto de dados analisado. A Lei de Benford descreve a distribuicao esperada de primeiros digitos em conjuntos de dados naturais, e desvios significativos podem indicar padroes que merecem investigacao adicional.',
    icon: '\u{1F4CA}',
    category: 'case-study',
    dataAvailable: true,
    deputyId: 204548,
    externalContext: {
      title: 'Contexto Externo',
      items: [
        {
          label: 'Lei de Benford',
          description: 'Tambem conhecida como Lei do Primeiro Digito, descreve que em muitos conjuntos de dados numericos, o primeiro digito 1 aparece com frequencia de ~30%, enquanto o 9 aparece apenas ~5%.',
        },
        {
          label: 'Uso Forense',
          description: 'A Lei de Benford e utilizada por auditores e investigadores para detectar possiveis fraudes contabeis, pois numeros fabricados frequentemente nao seguem esta distribuicao natural.',
        },
        {
          label: 'Limitacoes',
          description: 'Desvios da Lei de Benford nao sao prova de fraude. Podem ocorrer por razoes legitimas, como concentracao em faixas de precos especificas.',
        },
      ],
    },
    methodology: {
      approach: 'Analisamos a distribuicao dos primeiros digitos de todas as transacoes do deputado e calculamos o valor chi-quadrado para medir o desvio da distribuicao esperada de Benford.',
      thresholds: [
        'Chi-quadrado > 15.51 indica desvio significativo (p<0.05)',
        'Chi-quadrado > 21.67 indica desvio muito significativo (p<0.01)',
        'Desvio > 5% em qualquer digito merece atencao',
      ],
      limitations: [
        'Necessario minimo de 100 transacoes para analise confiavel',
        'Valores arredondados (como tabelas de precos) podem causar desvios',
        'A Lei de Benford funciona melhor em dados que abrangem varias ordens de magnitude',
        'Desvio estatistico nao e evidencia de irregularidade',
      ],
    },
    relatedSlugs: ['sostenes-cavalcante', 'weekend-anomalies'],
  },
  'ceap-vs-cnae': {
    slug: 'ceap-vs-cnae',
    title: 'CEAP vs CNAE',
    subtitle: 'Analise Sistematica de Incompatibilidades',
    summary: 'Esta analise identifica casos onde a atividade economica declarada do fornecedor (CNAE) parece incompativel com o tipo de servico cobrado no CEAP. Por exemplo, uma empresa de construcao civil emitindo notas fiscais para "divulgacao da atividade parlamentar".',
    icon: '\u{1F3E2}',
    category: 'analysis',
    dataAvailable: true,
    externalContext: {
      title: 'Contexto Externo',
      items: [
        {
          label: 'O que e CNAE',
          description: 'Classificacao Nacional de Atividades Economicas. Define o ramo de atuacao de cada empresa registrada no Brasil.',
        },
        {
          label: 'Por que importa',
          description: 'Empresas devem emitir notas fiscais condizentes com sua atividade registrada. Discrepancias podem indicar uso de empresas de fachada.',
        },
        {
          label: 'Fontes de dados',
          description: 'Cruzamos dados do CEAP com a base de CNPJs da Receita Federal para verificar as atividades declaradas.',
        },
      ],
    },
    methodology: {
      approach: 'Cruzamos o CNAE principal de cada fornecedor com a categoria de gasto declarada no CEAP. Identificamos incompatibilidades obvias (ex: construcao civil x divulgacao).',
      thresholds: [
        'Incompatibilidade total: CNAE completamente diferente da categoria',
        'Incompatibilidade parcial: CNAE relacionado mas nao especifico',
        'Valores acima de R$ 50.000 em fornecedores incompativeis',
      ],
      limitations: [
        'Empresas podem ter CNAEs secundarios nao capturados',
        'Alguns servicos sao legitimamente terceirizados',
        'Base de CNAE pode estar desatualizada',
        'Nao temos acesso ao objeto especifico de cada nota fiscal',
      ],
    },
    relatedSlugs: ['top-hhi-casos', 'sostenes-cavalcante'],
  },
  'top-hhi-casos': {
    slug: 'top-hhi-casos',
    title: 'Top HHI',
    subtitle: '6 Casos de Maior Concentracao de Fornecedores',
    summary: 'O Indice Herfindahl-Hirschman (HHI) mede a concentracao de gastos entre fornecedores. Valores muito altos indicam dependencia excessiva de um unico fornecedor, o que pode representar risco de superfaturamento ou relacionamento improprio.',
    icon: '\u{1F4C8}',
    category: 'analysis',
    dataAvailable: true,
    externalContext: {
      title: 'Contexto Externo',
      items: [
        {
          label: 'O que e HHI',
          description: 'Indice de concentracao de mercado. Varia de 0 (disperso) a 10.000 (monopolio). No contexto CEAP, medimos concentracao de fornecedores.',
        },
        {
          label: 'Faixas de Referencia',
          description: 'HHI < 1500: Baixa concentracao. 1500-2500: Moderada. 2500-5000: Alta. > 5000: Muito alta (quase monopolio).',
        },
        {
          label: 'Implicacoes',
          description: 'Alta concentracao nao e ilegal, mas aumenta riscos. Pode indicar exclusividade justificada ou dependencia excessiva.',
        },
      ],
    },
    methodology: {
      approach: 'Calculamos o HHI para cada deputado somando os quadrados das participacoes de cada fornecedor. Ranqueamos os 6 deputados com maior concentracao.',
      thresholds: [
        'HHI > 5000: Concentracao muito alta (featured neste deep dive)',
        'HHI > 2500: Alta concentracao (merece atencao)',
        'Top fornecedor > 70%: Dependencia critica',
      ],
      limitations: [
        'Deputados com poucas transacoes naturalmente tem HHI mais alto',
        'Alguns servicos especializados justificam concentracao',
        'Gabinetes novos podem ter menos diversificacao inicial',
        'HHI nao considera qualidade ou preco dos servicos',
      ],
    },
    relatedSlugs: ['ceap-vs-cnae', 'sostenes-cavalcante'],
  },
  'weekend-anomalies': {
    slug: 'weekend-anomalies',
    title: 'Anomalias de Fim de Semana',
    subtitle: 'Deputados com Gastos Atipicos em Fins de Semana',
    summary: 'A maioria das despesas parlamentares ocorre em dias uteis. Deputados com percentual elevado de gastos em fins de semana merecem atencao, pois este padrao e atipico para atividade parlamentar regular.',
    icon: '\u{1F4C5}',
    category: 'analysis',
    dataAvailable: false,
    externalContext: {
      title: 'Contexto Externo',
      items: [
        {
          label: 'Padrao Esperado',
          description: 'Aproximadamente 7-10% das transacoes em fins de semana (2 de 7 dias). Valores muito acima indicam padrao atipico.',
        },
        {
          label: 'Tipos de Gasto',
          description: 'Alguns gastos de fim de semana sao legitimos: viagens, eventos. Outros levantam questoes: servicos administrativos, aluguel de veiculos.',
        },
        {
          label: 'Contexto Politico',
          description: 'Deputados frequentemente trabalham em fins de semana em suas bases eleitorais. Alguns gastos de fim de semana sao esperados.',
        },
      ],
    },
    methodology: {
      approach: 'Analisamos a data de cada transacao e calculamos o percentual que ocorreu em sabados e domingos. Ranqueamos os deputados com maior concentracao de gastos em fins de semana.',
      thresholds: [
        '> 15%: Acima do esperado',
        '> 25%: Significativamente atipico',
        '> 40%: Requer investigacao',
      ],
      limitations: [
        'Data da transacao pode nao ser a data do servico',
        'Sistemas de pagamento podem agrupar transacoes',
        'Atividade parlamentar inclui eventos de fim de semana',
        'Amostra pequena pode distorcer percentuais',
      ],
    },
    relatedSlugs: ['carlos-jordy', 'top-hhi-casos'],
  },
};

export const CATEGORY_LABELS: Record<string, { title: string; icon: string }> = {
  'case-study': { title: 'Estudos de Caso', icon: '\u{1F4CB}' },
  analysis: { title: 'Analises Sistematicas', icon: '\u{1F4CA}' },
  methodology: { title: 'Metodologias', icon: '\u{1F52C}' },
};

export function getDeepDivesByCategory() {
  const all = Object.values(DEEP_DIVE_CONTENT);
  return {
    'case-study': all.filter(d => d.category === 'case-study'),
    analysis: all.filter(d => d.category === 'analysis'),
    methodology: all.filter(d => d.category === 'methodology'),
  };
}

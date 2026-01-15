/**
 * Spotlight content definitions and types
 * Extracted from Spotlight.tsx for better maintainability
 */

import type { TimelineEvent } from '../../components/spotlight/SpotlightTimeline';
import type { HighlightTransaction } from '../../components/spotlight/SpotlightTransactions';

// Debate-specific types
export interface DebateEvidence {
  title: string;
  detail: string;
}

export interface DebateCounterpoint {
  allegation: string;
  alternative: string;
}

export interface DebateContent {
  promotor: {
    title: string;
    centralArgument: string;
    evidence: DebateEvidence[];
  };
  defesa: {
    title: string;
    centralArgument: string;
    counterpoints: DebateCounterpoint[];
  };
  openQuestions: string[];
}

// Benford digit distribution
export interface BenfordDigitData {
  digit: number;
  expected: number;
  observed: number;
}

// Transaction group for display
export interface TransactionGroupData {
  title: string;
  icon: string;
  transactions: HighlightTransaction[];
  total?: number;
}

// Enriched data for debate spotlights
export interface SpotlightEnrichedData {
  timeline?: TimelineEvent[];
  benfordDigits?: BenfordDigitData[];
  transactionGroups?: TransactionGroupData[];
  periodLabel?: string;
  periodTotal?: number;
  // For investigation deep-dives like Overclean
  externalDataUrl?: string;
}

export interface SpotlightContent {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  icon: string;
  category: 'case-study' | 'analysis' | 'methodology' | 'debate';
  dataAvailable: boolean;
  addedDate: string; // Format: "YYYY-MM" e.g., "2026-01"
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
  // Debate-specific field
  debate?: DebateContent;
  // Enriched data for detailed analysis
  enrichedData?: SpotlightEnrichedData;
}

export const SPOTLIGHT_CONTENT: Record<string, SpotlightContent> = {
  // DEBATE CASES - News-driven investigations
  'operacao-overclean': {
    slug: 'operacao-overclean',
    title: 'Operação Overclean',
    subtitle: 'R$ 220 mil voando pela janela, o "Rei do Lixo" e a trilha de R$ 406 milhões',
    summary: 'Julho de 2025. Campo Formoso, Bahia. Enquanto agentes da PF batem na porta, R$ 220 mil em dinheiro vivo são jogados pela janela. O dono da casa? Francisquinho Nascimento, primo de um deputado federal. A origem do dinheiro? Possivelmente, os R$ 23 milhões em emendas que o deputado enviou para o município. Esta é a história de como seguimos o dinheiro — R$ 406 milhões em emendas de dois deputados baianos — e o que descobrimos cruzando dados públicos.',
    icon: '\u{1F50D}',
    category: 'debate',
    dataAvailable: true,
    addedDate: '2026-01',
    externalContext: {
      title: 'Os Personagens',
      items: [
        {
          label: 'O "Rei do Lixo"',
          description: 'José Marcos de Moura controla empresas de limpeza urbana em 17 estados. Preso em dezembro de 2024, é apontado como o operador de um esquema de R$ 1,4 bilhão. Suas empresas recebiam contratos de prefeituras que, por sua vez, recebiam emendas de deputados aliados.',
          link: 'https://www.metropoles.com/brasil/quem-e-o-rei-do-lixo-da-bahia-empresario-influente-preso-pela-pf',
        },
        {
          label: 'Elmar Nascimento (União Brasil)',
          description: 'Deputado federal pela Bahia. R$ 197 milhões em emendas entre 2014-2025. Seu irmão Elmo era prefeito de Campo Formoso, que recebeu R$ 23,5M em emendas de Elmar. Na Fase 5, a PF foi à casa do primo Francisquinho. Foi quando os R$ 220 mil voaram pela janela.',
        },
        {
          label: 'Félix Mendonça Jr. (PDT)',
          description: 'Deputado federal pela Bahia. R$ 209 milhões em emendas. Apesar de ter estatísticas de gabinete "melhores" que Elmar, tornou-se o alvo principal da Fase 9 (janeiro de 2026). R$ 24 milhões bloqueados. Por que ele e não Elmar? É uma das perguntas que os dados ajudam a responder.',
        },
        {
          label: 'O Banco do Brasil',
          description: 'O que Elmar e Félix têm em comum? Ambos canalizaram cerca de 40% de suas emendas através do Banco do Brasil. Juntos, R$ 164 milhões passaram pelo mesmo intermediário. Coincidência ou padrão?',
        },
      ],
    },
    debate: {
      promotor: {
        title: 'A Tese da Acusação',
        centralArgument: 'Excelências, os dados falam por si. Estamos diante de um padrão sistemático que transcende a coincidência. Quando dois deputados da mesma região canalizam 40% de centenas de milhões de reais através do mesmo banco, direcionam recursos para municípios de familiares e compartilham 55 beneficiários em comum — isso não é acaso. Isso é coordenação.',
        evidence: [
          {
            title: 'Evidência 1: A Desproporção',
            detail: 'Os gastos de gabinete (CEAP) somam R$ 2,8M. As emendas somam R$ 406M. Uma diferença de 146 vezes. Se houvesse desvio no CEAP, seria trocar R$ 100 pelo risco de perder R$ 14.600. Os números não mentem: o dinheiro está nas emendas.',
          },
          {
            title: 'Evidência 2: O Banco',
            detail: 'Elmar Nascimento: 43,5% das emendas via Banco do Brasil (R$ 85,7M). Félix Mendonça Jr: 37,8% via Banco do Brasil (R$ 79,1M). Dois deputados, mesma região, mesmo padrão, mesmo banco. Juntos, R$ 164 milhões passaram por este único intermediário.',
          },
          {
            title: 'Evidência 3: A Família',
            detail: 'Campo Formoso recebeu R$ 23,5 milhões em emendas de Elmar Nascimento. O prefeito? Elmo Nascimento — irmão do deputado. Na Fase 5 da operação, a PF foi à casa de Francisquinho Nascimento, primo do deputado e ex-secretário/vereador. Durante a busca, R$ 220 mil foram jogados pela janela. Dinheiro inocente não precisa de janelas.',
          },
          {
            title: 'Evidência 4: A Rede',
            detail: '55 entidades receberam emendas de AMBOS os deputados. Total: R$ 232 milhões. Esses não são municípios aleatórios — são nós de uma mesma rede. A pergunta não é se existe coordenação, mas como ela funciona.',
          },
          {
            title: 'Evidência 5: O Mecanismo',
            detail: '25-30% das emendas são Transferências Especiais — as "Emendas PIX" (Elmar: 24,2%, Félix: 29%). Dinheiro que vai direto para a conta, sem convênio, sem projeto, sem prestação de contas ao governo federal. Por que um quarto dos recursos usa justamente o mecanismo com menos controle?',
          },
        ],
      },
      defesa: {
        title: 'A Tese da Defesa',
        centralArgument: 'Meritíssimo, o que a acusação apresenta como "provas" são, na verdade, padrões normais da atividade parlamentar pintados com cores suspeitas. Deputados federais representam suas regiões — direcionar emendas para suas bases eleitorais não é crime, é trabalho. O que vemos aqui é criminalização da política.',
        counterpoints: [
          {
            allegation: 'Sobre a concentração no Banco do Brasil',
            alternative: 'O Banco do Brasil é o banco oficial do governo federal para transferências. É o intermediário natural para emendas parlamentares. Pergunte a qualquer especialista em finanças públicas: usar o BB para repassar recursos federais é o procedimento padrão, não a exceção.',
          },
          {
            allegation: 'Sobre Campo Formoso e a família',
            alternative: 'Irmãos nascem da mesma família. Deputados representam suas regiões. Elmar Nascimento foi eleito para representar a Bahia, e Campo Formoso é um município baiano com 70 mil habitantes. Que o prefeito seja parente não torna as emendas ilegais — torna humano.',
          },
          {
            allegation: 'Sobre os beneficiários compartilhados',
            alternative: 'Dois deputados baianos direcionam recursos para a Bahia. Isso é crime ou é óbvio? Os 55 beneficiários compartilhados são municípios e entidades da mesma região. A sobreposição geográfica é consequência natural, não evidência de conspiração.',
          },
          {
            allegation: 'Sobre as Emendas PIX',
            alternative: 'As Transferências Especiais foram criadas pela Emenda Constitucional 105/2019, aprovada pelo Congresso Nacional e sancionada pelo Presidente. Usar um instrumento legal criado pelo próprio Estado não é fraude — é exercer uma prerrogativa constitucional.',
          },
        ],
      },
      openQuestions: [
        'Qual a real conexão entre os beneficiários de emendas e as empresas do "Rei do Lixo"?',
        'O que exatamente acontece com o dinheiro depois que chega ao Banco do Brasil?',
        'Os 55 beneficiários compartilhados têm contratos com empresas investigadas?',
        'Como uma empresa em recuperação judicial (Bakof Plásticos) recebeu R$ 2,9M em recursos públicos?',
        'Qual o percentual de concentração BB para outros deputados baianos? O padrão é incomum ou normal?',
      ],
    },
    methodology: {
      approach: 'Esta análise cruza duas bases de dados públicas: CEAP (gastos de gabinete, 2023-2025) e Emendas Parlamentares (transferências, 2014-2025). O objetivo não é provar fraude — isso cabe à Justiça — mas identificar padrões que merecem atenção e explicar como profissionais de dados analisam informações públicas.',
      thresholds: [
        'HHI (Herfindahl-Hirschman Index): Mede concentração. Imagine dividir R$ 100 entre fornecedores. Se for para um só, HHI = 10.000 (monopólio). Se for igual para 100, HHI = 100 (disperso). Acima de 2.500 é considerado alta concentração.',
        'Lei de Benford: Em dados naturais, o dígito 1 aparece primeiro ~30% das vezes, enquanto 9 aparece apenas ~5%. Números fabricados frequentemente não seguem esse padrão. Um chi-quadrado alto indica desvio dessa distribuição natural.',
        'Concentração BB > 25%: Quando mais de 25% das emendas de um deputado passam por um único intermediário (neste caso, Banco do Brasil), isso representa concentração significativa que merece explicação.',
        'Empresa em recuperação judicial: Entidade com dificuldades financeiras sérias recebendo recursos públicos é um sinal de alerta (red flag) que auditores investigam.',
        'Escala emendas/CEAP > 100x: Normal para deputados ativos. Mostra que análise de fraude focada só em CEAP pode perder o quadro completo.',
      ],
      limitations: [
        'Dados públicos não mostram kickbacks, propinas ou pagamentos informais — a "parte escura" do esquema',
        'Não temos acesso à estrutura societária das empresas (quem são os donos reais, possíveis laranjas)',
        'Matching de nomes entre bases tem ~80% de precisão — alguns beneficiários podem ter sido identificados incorretamente',
        'Estatísticas não provam fraude — apenas mostram padrões que merecem investigação. A prova cabe à Justiça.',
        'A investigação está em andamento — não sabemos o desfecho. Todos são inocentes até prova em contrário.',
        'A PF tem acesso a informações que não são públicas (interceptações, depoimentos, documentos sigilosos)',
      ],
    },
    relatedSlugs: [],
    enrichedData: {
      externalDataUrl: '/data/spotlights/operacao-overclean.json',
      periodLabel: 'CEAP: 2023-2025 | Emendas: 2014-2025',
      periodTotal: 406092283,
    },
  },

  'eduardo-bolsonaro-debate': {
    slug: 'eduardo-bolsonaro-debate',
    title: 'Eduardo Bolsonaro',
    subtitle: 'Aluguel de Carro em Brasília Enquanto nos EUA',
    summary: 'Em janeiro de 2026, o Metrópoles revelou que Eduardo Bolsonaro solicitou reembolso por aluguel de carro em Brasília enquanto estava nos EUA. Fomos aos dados verificar: a transação existe. Mas os mesmos dados permitem duas leituras diferentes.',
    icon: '⚖️',
    category: 'debate',
    dataAvailable: true,
    addedDate: '2026-01',
    deputyId: 245,
    externalContext: {
      title: 'O Contexto',
      items: [
        {
          label: 'A Reportagem',
          description: 'Metrópoles revelou em 11/01/2026 que Eduardo Bolsonaro pediu reembolso de R$ 5.333 por aluguel de Jeep Commander em Brasília durante período nos EUA.',
          link: 'https://www.metropoles.com/brasil/nos-eua-eduardo-bolsonaro-alugou-carro-em-brasilia-e-pediu-reembolso',
        },
        {
          label: 'O TCU',
          description: 'Em agosto de 2025, o Tribunal de Contas da União recomendou que a Câmara investigasse os gastos do deputado.',
        },
        {
          label: 'O Desfecho',
          description: 'Eduardo Bolsonaro foi cassado em setembro de 2025 por absenteísmo, após solicitar licença de 122 dias em março de 2025.',
        },
      ],
    },
    debate: {
      promotor: {
        title: 'Leitura 1: Pontos de Atenção',
        centralArgument: 'Os dados mostram padrões que justificam esclarecimento formal: transação de aluguel de veículo em Brasília durante período documentado de ausência do país, combinada com desvio estatístico significativo na Lei de Benford e concentração atípica em um único fornecedor.',
        evidence: [
          {
            title: 'Transação geograficamente inconsistente',
            detail: 'Aluguel de R$ 8.000 (reembolso R$ 5.333) na Novacar em 05/03/2025, data em que o deputado estava nos EUA segundo múltiplas fontes.',
          },
          {
            title: 'Desvio significativo da Lei de Benford',
            detail: 'Chi-quadrado de 84,43 com p < 0,0001. O dígito 8 aparece em 11,3% das transações vs 5,1% esperado.',
          },
          {
            title: 'Concentração em fornecedor único',
            detail: 'R$ 169.333 (20,2% do total) para Novacar em 26 transações. Pagamentos mensais regulares de R$ 5.000-8.000.',
          },
          {
            title: 'Evidência de uso físico',
            detail: '11 pedágios em 08/03 mapeiam trajeto pelo interior de SP (Via Rondon, Tietê, Colinas). Combustível abastecido em postos paulistas.',
          },
        ],
      },
      defesa: {
        title: 'Leitura 2: Explicações Alternativas',
        centralArgument: 'Os mesmos dados são consistentes com operação normal de gabinete parlamentar. A CEAP permite gastos de equipe mesmo com titular ausente, e os indicadores estatísticos requerem contexto comparativo.',
        counterpoints: [
          {
            allegation: 'Transação durante ausência',
            alternative: 'Gabinetes continuam operando com titular ausente. Funcionários podem usar veículos para atividades parlamentares.',
          },
          {
            allegation: 'Desvio de Benford',
            alternative: 'Contratos com valores fixos (R$ 5.000, R$ 8.000 mensais) naturalmente geram desvio. Sem comparativo, não sabemos se é incomum.',
          },
          {
            allegation: 'Concentração em Novacar',
            alternative: 'Contrato de longo prazo reduz burocracia e pode ter melhor preço. HHI geral de 1.113 é classificado como BAIXO.',
          },
          {
            allegation: 'Pedágios e combustível',
            alternative: 'Equipes parlamentares regularmente viajam pelo estado para atender constituintes e participar de eventos.',
          },
        ],
      },
      openQuestions: [
        'Quem utilizou o veículo alugado em março de 2025?',
        'Havia funcionário do gabinete ativo no período?',
        'Quantos deputados têm desvio Benford similar?',
        'Novacar atende outros parlamentares com frequência similar?',
        'A licença do deputado proibia gastos de gabinete?',
      ],
    },
    methodology: {
      approach: 'Esta análise partiu de uma reportagem do Metrópoles (11/01/2026) e foi verificada nos dados públicos do Portal de Dados Abertos da Câmara. Baixamos todas as transações CEAP do deputado Eduardo Bolsonaro (ID 245) no período 2023-2025, totalizando 836 transações e R$ 837.765,76 em gastos. Aplicamos três técnicas de análise: (1) Lei de Benford para detectar anomalias na distribuição de valores, (2) Índice HHI para medir concentração de fornecedores, e (3) análise temporal para verificar a consistência geográfica das transações.',
      thresholds: [
        'Lei de Benford: Em conjuntos de dados naturais (preços, populações, contas), o dígito 1 aparece primeiro ~30% das vezes, enquanto o 9 aparece apenas ~5%. Usamos o teste chi-quadrado para medir o desvio: valores acima de 15,51 (p<0,05) indicam desvio significativo. Eduardo apresentou chi² = 84,43 (p<0,0001), com o dígito 8 aparecendo em 11,3% vs 5,1% esperado.',
        'HHI (Herfindahl-Hirschman Index): Mede concentração de fornecedores. Varia de 0 (totalmente disperso) a 10.000 (monopólio). Exemplo: se você divide R$ 100 igualmente entre 10 fornecedores, HHI = 1.000. Se vai tudo para 1, HHI = 10.000. Eduardo tem HHI = 1.113, classificado como BAIXO (<1.500).',
        'Concentração em fornecedor único > 20%: Quando mais de 20% dos gastos vão para um único fornecedor, isso indica dependência que merece explicação. A Novacar recebeu R$ 169.333 (20,2% do total) em 26 transações regulares.',
        'Consistência geográfica: Verificamos se as datas/locais das transações são coerentes com a localização conhecida do deputado. Pedágios em SP em 08/03/2025 indicam uso físico do veículo, mas não identificam o motorista.',
        'Contratos de longa duração: Pagamentos mensais fixos (R$ 5.000-8.000) para o mesmo fornecedor podem indicar contrato regular, o que é legítimo, ou podem mascarar valores fixados artificialmente.',
      ],
      limitations: [
        'Dados públicos não identificam quem utilizou o veículo — o deputado, um funcionário do gabinete, ou terceiro. A CEAP permite gastos de equipe.',
        'Não temos acesso ao contrato firmado com a Novacar: prazo, condições, veículo específico, quilometragem, ou justificativa de uso.',
        'A ausência do deputado nos EUA é baseada em reportagens jornalísticas, não em registro oficial de embarque/desembarque.',
        'Falta contexto comparativo: não sabemos quantos deputados têm desvio Benford similar ou contratos de longa duração com locadoras.',
        'O desvio Benford pode ter explicação legítima: contratos com valores fixos naturalmente concentram em certos dígitos (5.000, 8.000).',
        'A cassação do mandato por absenteísmo (Set/2025) não tem relação direta comprovada com os gastos analisados.',
      ],
    },
    relatedSlugs: [], // Other cases hidden for now
    // Enriched data with timeline, Benford analysis, and key transactions
    enrichedData: {
      timeline: [
        {
          date: 'Jan 2025',
          title: 'Viagem aos EUA',
          description: 'Eduardo viaja para os Estados Unidos para participar da posse de Donald Trump.',
          type: 'news',
        },
        {
          date: 'Fev 2025',
          title: 'Início de período prolongado nos EUA',
          description: 'Segundo reportagens, deputado permanece nos EUA após a posse.',
          type: 'news',
        },
        {
          date: '05/03/2025',
          title: 'Aluguel de veículo na Novacar',
          description: 'Transação de R$ 8.000 (reembolso R$ 5.333,34) para aluguel de Jeep Commander.',
          type: 'transaction',
          highlight: true,
        },
        {
          date: '08/03/2025',
          title: '11 pedágios em rodovias de SP',
          description: 'Trajeto pelo interior paulista: Via Rondon, Tietê, Colinas. Total: R$ 119,60.',
          type: 'transaction',
        },
        {
          date: '09/03/2025',
          title: 'Abastecimento em postos paulistas',
          description: 'Combustível em Auto Posto Alvorada Paulista e Posto Sem Limites.',
          type: 'transaction',
        },
        {
          date: 'Mar 2025',
          title: 'Solicitação de licença de 122 dias',
          description: 'Deputado solicita licença formal de suas atividades parlamentares.',
          type: 'official',
        },
        {
          date: 'Ago 2025',
          title: 'TCU recomenda investigação',
          description: 'Tribunal de Contas da União recomenda que a Câmara investigue os gastos.',
          type: 'investigation',
          highlight: true,
        },
        {
          date: 'Set 2025',
          title: 'Cassação do mandato',
          description: 'Eduardo Bolsonaro é cassado por absenteísmo após período prolongado de ausência.',
          type: 'official',
          highlight: true,
        },
        {
          date: '11/01/2026',
          title: 'Reportagem do Metrópoles',
          description: 'Veículo revela a transação de aluguel de carro durante período nos EUA.',
          type: 'news',
          highlight: true,
        },
      ],
      benfordDigits: [
        { digit: 1, expected: 30.1, observed: 34.1 },
        { digit: 2, expected: 17.6, observed: 14.5 },
        { digit: 3, expected: 12.5, observed: 8.3 },
        { digit: 4, expected: 9.7, observed: 8.4 },
        { digit: 5, expected: 7.9, observed: 7.7 },
        { digit: 6, expected: 6.7, observed: 5.0 },
        { digit: 7, expected: 5.8, observed: 6.0 },
        { digit: 8, expected: 5.1, observed: 11.3 },
        { digit: 9, expected: 4.6, observed: 4.7 },
      ],
      transactionGroups: [
        {
          title: 'Aluguel de Veículo',
          icon: '🚗',
          total: 5333.34,
          transactions: [
            {
              date: '05/03/2025',
              supplier: 'Novacar Locadora de Veículos Ltda',
              category: 'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES',
              documentValue: 8000.00,
              reimbursedValue: 5333.34,
              highlight: true,
              verificationNote: 'Transação confirmada - mesma reportada pelo Metrópoles',
              documentUrl: 'https://www.camara.leg.br/cota-parlamentar/documentos/publ/2907/2025/7878813.pdf',
            },
          ],
        },
        {
          title: 'Manutenção de Escritório',
          icon: '🏢',
          total: 8614.74,
          transactions: [
            {
              date: '05/03/2025',
              supplier: 'Maria Luiza Paula Adm. e Participações',
              category: 'MANUTENÇÃO DE ESCRITÓRIO',
              documentValue: 9557.46,
              reimbursedValue: 6371.64,
              documentUrl: 'https://www.camara.leg.br/cota-parlamentar/documentos/publ/2907/2025/7879886.pdf',
            },
            {
              date: '03/03/2025',
              supplier: 'FAS Desenvolvimento de Software',
              category: 'MANUTENÇÃO DE ESCRITÓRIO',
              documentValue: 2400.00,
              reimbursedValue: 1600.00,
              documentUrl: 'https://www.camara.leg.br/cota-parlamentar/documentos/publ/2907/2025/7877932.pdf',
            },
            {
              date: '11/03/2025',
              supplier: 'Enel Eletropaulo',
              category: 'MANUTENÇÃO DE ESCRITÓRIO',
              documentValue: 114.89,
              reimbursedValue: 114.89,
            },
            {
              date: '19/03/2025',
              supplier: 'Telefonia Brasil S/A',
              category: 'MANUTENÇÃO DE ESCRITÓRIO',
              documentValue: 528.21,
              reimbursedValue: 528.21,
            },
          ],
        },
        {
          title: 'Combustíveis',
          icon: '⛽',
          total: 642.09,
          transactions: [
            {
              date: '09/03/2025',
              supplier: 'Auto Posto Alvorada Paulista Ltda',
              category: 'COMBUSTÍVEIS E LUBRIFICANTES',
              documentValue: 195.68,
              reimbursedValue: 195.68,
              highlight: true,
              verificationNote: 'Mesma data e valor reportados pelo Metrópoles',
            },
            {
              date: '09/03/2025',
              supplier: 'Posto Sem Limites Ltda',
              category: 'COMBUSTÍVEIS E LUBRIFICANTES',
              documentValue: 150.00,
              reimbursedValue: 150.00,
            },
            {
              date: '11/03/2025',
              supplier: 'Auto Posto Alvorada Paulista Ltda',
              category: 'COMBUSTÍVEIS E LUBRIFICANTES',
              documentValue: 136.37,
              reimbursedValue: 136.37,
            },
            {
              date: '17/03/2025',
              supplier: 'R Três Auto Posto Lt',
              category: 'COMBUSTÍVEIS E LUBRIFICANTES',
              documentValue: 160.04,
              reimbursedValue: 160.04,
            },
          ],
        },
        {
          title: 'Pedágios (11 transações em 08/03)',
          icon: '🛣️',
          total: 119.60,
          transactions: [
            {
              date: '08/03/2025',
              supplier: 'Via Rondon Concessionária (4x)',
              category: 'SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO',
              documentValue: 34.90,
              reimbursedValue: 34.90,
              verificationNote: 'Trajeto pelo interior de SP',
            },
            {
              date: '08/03/2025',
              supplier: 'Conc. Rod. Integradas do Oeste (2x)',
              category: 'SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO',
              documentValue: 36.60,
              reimbursedValue: 36.60,
            },
            {
              date: '08/03/2025',
              supplier: 'Conc. Rodovias do Tietê (3x)',
              category: 'SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO',
              documentValue: 23.40,
              reimbursedValue: 23.40,
            },
            {
              date: '08/03/2025',
              supplier: 'Rodovia das Colinas + Oeste de SP',
              category: 'SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO',
              documentValue: 24.70,
              reimbursedValue: 24.70,
            },
          ],
        },
      ],
      periodLabel: 'Março de 2025 - 22 transações',
      periodTotal: 15615.82,
    },
  },

  /* HIDDEN CASES - Uncomment to enable
  'sostenes-cavalcante': {
    slug: 'sostenes-cavalcante',
    title: 'Sóstenes Cavalcante',
    subtitle: 'Aluguel de Veículos e Operação Policial',
    summary: 'Análise dos gastos com aluguel de veículos do deputado Sóstenes Cavalcante (PL-RJ), que foi alvo de operação policial em 2023. Este caso ilustra como os dados públicos podem revelar padrões que merecem atenção, mesmo quando os indicadores tradicionais de concentração (HHI) não sinalizam anomalias.',
    icon: '🚗',
    category: 'case-study',
    dataAvailable: true,
    deputyId: 204554,
    externalContext: {
      title: 'Contexto Externo',
      items: [
        {
          label: 'Operação Policial',
          description: 'Em dezembro de 2023, a Polícia Federal realizou operação que investigou gastos com aluguel de veículos pelo gabinete do deputado.',
        },
        {
          label: 'Categoria Investigada',
          description: 'Os gastos com "Locação ou fretamento de veículos automotores" representam uma das categorias mais vulneráveis a fraudes no CEAP.',
        },
        {
          label: 'Resultado',
          description: 'O caso ainda está em andamento no sistema judicial. Nenhuma condenação foi registrada até o momento.',
        },
      ],
    },
    methodology: {
      approach: 'Este spotlight analisa os gastos do deputado no período 2023-2025, com foco especial na categoria de veículos. Comparamos os valores com a média do partido (PL) e do estado (RJ).',
      thresholds: [
        'HHI > 2500 indica concentração moderada de fornecedores',
        'Gastos com veículos > 30% do total merecem atenção',
        'Ticket médio acima de R$ 5.000 em veículos é incomum',
      ],
      limitations: [
        'Os dados públicos não incluem detalhes sobre os serviços prestados',
        'Não temos acesso às notas fiscais originais',
        'O HHI baixo não significa ausência de irregularidades',
        'A análise estatística não substitui auditoria formal',
      ],
    },
    relatedSlugs: ['top-hhi-casos', 'ceap-vs-cnae'],
  },
  'carlos-jordy': {
    slug: 'carlos-jordy',
    title: 'Carlos Jordy',
    subtitle: 'Desvio Significativo na Lei de Benford',
    summary: 'O deputado Carlos Jordy (PL-RJ) apresenta um dos maiores desvios da Lei de Benford no conjunto de dados analisado. A Lei de Benford descreve a distribuição esperada de primeiros dígitos em conjuntos de dados naturais, e desvios significativos podem indicar padrões que merecem investigação adicional.',
    icon: '📊',
    category: 'case-study',
    dataAvailable: true,
    deputyId: 204548,
    externalContext: {
      title: 'Contexto Externo',
      items: [
        {
          label: 'Lei de Benford',
          description: 'Também conhecida como Lei do Primeiro Dígito, descreve que em muitos conjuntos de dados numéricos, o primeiro dígito 1 aparece com frequência de ~30%, enquanto o 9 aparece apenas ~5%.',
        },
        {
          label: 'Uso Forense',
          description: 'A Lei de Benford é utilizada por auditores e investigadores para detectar possíveis fraudes contábeis, pois números fabricados frequentemente não seguem esta distribuição natural.',
        },
        {
          label: 'Limitações',
          description: 'Desvios da Lei de Benford não são prova de fraude. Podem ocorrer por razões legítimas, como concentração em faixas de preços específicas.',
        },
      ],
    },
    methodology: {
      approach: 'Analisamos a distribuição dos primeiros dígitos de todas as transações do deputado e calculamos o valor chi-quadrado para medir o desvio da distribuição esperada de Benford.',
      thresholds: [
        'Chi-quadrado > 15.51 indica desvio significativo (p<0.05)',
        'Chi-quadrado > 21.67 indica desvio muito significativo (p<0.01)',
        'Desvio > 5% em qualquer dígito merece atenção',
      ],
      limitations: [
        'Necessário mínimo de 100 transações para análise confiável',
        'Valores arredondados (como tabelas de preços) podem causar desvios',
        'A Lei de Benford funciona melhor em dados que abrangem várias ordens de magnitude',
        'Desvio estatístico não é evidência de irregularidade',
      ],
    },
    relatedSlugs: ['sostenes-cavalcante', 'eduardo-bolsonaro-debate'],
  },

  // SYSTEMATIC ANALYSES
  'ceap-vs-cnae': {
    slug: 'ceap-vs-cnae',
    title: 'CEAP vs CNAE',
    subtitle: 'Análise Sistemática de Incompatibilidades',
    summary: 'Esta análise identifica casos onde a atividade econômica declarada do fornecedor (CNAE) parece incompatível com o tipo de serviço cobrado no CEAP. Por exemplo, uma empresa de construção civil emitindo notas fiscais para "divulgação da atividade parlamentar".',
    icon: '🏢',
    category: 'analysis',
    dataAvailable: true,
    externalContext: {
      title: 'Contexto Externo',
      items: [
        {
          label: 'O que é CNAE',
          description: 'Classificação Nacional de Atividades Econômicas. Define o ramo de atuação de cada empresa registrada no Brasil.',
        },
        {
          label: 'Por que importa',
          description: 'Empresas devem emitir notas fiscais condizentes com sua atividade registrada. Discrepâncias podem indicar uso de empresas de fachada.',
        },
        {
          label: 'Fontes de dados',
          description: 'Cruzamos dados do CEAP com a base de CNPJs da Receita Federal para verificar as atividades declaradas.',
        },
      ],
    },
    methodology: {
      approach: 'Cruzamos o CNAE principal de cada fornecedor com a categoria de gasto declarada no CEAP. Identificamos incompatibilidades óbvias (ex: construção civil x divulgação).',
      thresholds: [
        'Incompatibilidade total: CNAE completamente diferente da categoria',
        'Incompatibilidade parcial: CNAE relacionado mas não específico',
        'Valores acima de R$ 50.000 em fornecedores incompatíveis',
      ],
      limitations: [
        'Empresas podem ter CNAEs secundários não capturados',
        'Alguns serviços são legitimamente terceirizados',
        'Base de CNAE pode estar desatualizada',
        'Não temos acesso ao objeto específico de cada nota fiscal',
      ],
    },
    relatedSlugs: ['top-hhi-casos', 'sostenes-cavalcante'],
  },
  'top-hhi-casos': {
    slug: 'top-hhi-casos',
    title: 'Top HHI',
    subtitle: '6 Casos de Maior Concentração de Fornecedores',
    summary: 'O Índice Herfindahl-Hirschman (HHI) mede a concentração de gastos entre fornecedores. Valores muito altos indicam dependência excessiva de um único fornecedor, o que pode representar risco de superfaturamento ou relacionamento impróprio.',
    icon: '📈',
    category: 'analysis',
    dataAvailable: true,
    externalContext: {
      title: 'Contexto Externo',
      items: [
        {
          label: 'O que é HHI',
          description: 'Índice de concentração de mercado. Varia de 0 (disperso) a 10.000 (monopólio). No contexto CEAP, medimos concentração de fornecedores.',
        },
        {
          label: 'Faixas de Referência',
          description: 'HHI < 1500: Baixa concentração. 1500-2500: Moderada. 2500-5000: Alta. > 5000: Muito alta (quase monopólio).',
        },
        {
          label: 'Implicações',
          description: 'Alta concentração não é ilegal, mas aumenta riscos. Pode indicar exclusividade justificada ou dependência excessiva.',
        },
      ],
    },
    methodology: {
      approach: 'Calculamos o HHI para cada deputado somando os quadrados das participações de cada fornecedor. Ranqueamos os 6 deputados com maior concentração.',
      thresholds: [
        'HHI > 5000: Concentração muito alta (featured neste spotlight)',
        'HHI > 2500: Alta concentração (merece atenção)',
        'Top fornecedor > 70%: Dependência crítica',
      ],
      limitations: [
        'Deputados com poucas transações naturalmente têm HHI mais alto',
        'Alguns serviços especializados justificam concentração',
        'Gabinetes novos podem ter menos diversificação inicial',
        'HHI não considera qualidade ou preço dos serviços',
      ],
    },
    relatedSlugs: ['ceap-vs-cnae', 'sostenes-cavalcante'],
  },
  'weekend-anomalies': {
    slug: 'weekend-anomalies',
    title: 'Anomalias de Fim de Semana',
    subtitle: 'Deputados com Gastos Atípicos em Fins de Semana',
    summary: 'A maioria das despesas parlamentares ocorre em dias úteis. Deputados com percentual elevado de gastos em fins de semana merecem atenção, pois este padrão é atípico para atividade parlamentar regular.',
    icon: '📅',
    category: 'analysis',
    dataAvailable: false,
    externalContext: {
      title: 'Contexto Externo',
      items: [
        {
          label: 'Padrão Esperado',
          description: 'Aproximadamente 7-10% das transações em fins de semana (2 de 7 dias). Valores muito acima indicam padrão atípico.',
        },
        {
          label: 'Tipos de Gasto',
          description: 'Alguns gastos de fim de semana são legítimos: viagens, eventos. Outros levantam questões: serviços administrativos, aluguel de veículos.',
        },
        {
          label: 'Contexto Político',
          description: 'Deputados frequentemente trabalham em fins de semana em suas bases eleitorais. Alguns gastos de fim de semana são esperados.',
        },
      ],
    },
    methodology: {
      approach: 'Analisamos a data de cada transação e calculamos o percentual que ocorreu em sábados e domingos. Ranqueamos os deputados com maior concentração de gastos em fins de semana.',
      thresholds: [
        '> 15%: Acima do esperado',
        '> 25%: Significativamente atípico',
        '> 40%: Requer investigação',
      ],
      limitations: [
        'Data da transação pode não ser a data do serviço',
        'Sistemas de pagamento podem agrupar transações',
        'Atividade parlamentar inclui eventos de fim de semana',
        'Amostra pequena pode distorcer percentuais',
      ],
    },
    relatedSlugs: ['carlos-jordy', 'top-hhi-casos'],
  },
  END OF HIDDEN CASES */
};

export const CATEGORY_LABELS: Record<string, { title: string; icon: string }> = {
  debate: { title: 'Debates', icon: '⚖️' },
  'case-study': { title: 'Estudos de Caso', icon: '📋' },
  analysis: { title: 'Análises Sistemáticas', icon: '📊' },
  methodology: { title: 'Metodologias', icon: '🔬' },
};

export function getSpotlightsByCategory() {
  const all = Object.values(SPOTLIGHT_CONTENT);
  return {
    debate: all.filter(d => d.category === 'debate'),
    'case-study': all.filter(d => d.category === 'case-study'),
    analysis: all.filter(d => d.category === 'analysis'),
    methodology: all.filter(d => d.category === 'methodology'),
  };
}

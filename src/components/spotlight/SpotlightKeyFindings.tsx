/**
 * SpotlightKeyFindings - Descobertas principais em formato narrativo
 * Conecta os pontos como uma história, não como fatos isolados
 */

interface Finding {
  id: string;
  title: string;
  finding: string;
  explanation: string;
  icon: string;
}

interface Props {
  findings: Finding[];
}

// Note: findings prop is kept for API compatibility but content is currently hardcoded
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SpotlightKeyFindings({ findings: _findings }: Props) {
  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      {/* Header com visual editorial */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{'\u{1F9F5}'}</span>
          <h3 className="text-lg font-semibold text-text-primary">Conectando os Pontos</h3>
        </div>
        <span className="text-xs px-2 py-1 bg-bg-card text-text-muted rounded">
          5 capítulos
        </span>
      </div>

      <p className="text-sm text-text-secondary mb-6">
        A história que os dados contam não está em números isolados, mas em como eles se conectam:
      </p>

      {/* Narrativa em capítulos */}
      <div className="space-y-4">
        {/* Capítulo 1: O Banco */}
        <div className="p-4 bg-bg-card rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 bg-text-muted/20 text-text-muted rounded-full font-medium">
              Capítulo 1
            </span>
            <span className="text-sm font-medium text-text-primary">O Banco que Aparece em Tudo</span>
          </div>
          <p className="text-sm text-text-secondary">
            Quando olhamos para onde foi o dinheiro das emendas, um nome salta aos olhos:{' '}
            <strong className="text-text-primary">Banco do Brasil</strong>. Elmar canalizou{' '}
            <strong className="text-text-primary">43,5%</strong> de todas as suas emendas via BB.
            Félix, <strong className="text-text-primary">37,8%</strong>. Juntos, R$ 164 milhões passaram
            pelo mesmo banco. Isso é normal? É uma pergunta que a PF parece estar fazendo.
          </p>
        </div>

        {/* Capítulo 2: A Família */}
        <div className="p-4 bg-bg-card rounded-lg border-l-4 border-text-secondary">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 bg-text-muted/20 text-text-muted rounded-full font-medium">
              Capítulo 2
            </span>
            <span className="text-sm font-medium text-text-primary">A Cidade do Irmão</span>
          </div>
          <p className="text-sm text-text-secondary">
            Campo Formoso, município baiano de 70 mil habitantes, recebeu{' '}
            <strong className="text-text-primary">R$ 23,5 milhões</strong> em emendas de Elmar Nascimento.
            Detalhe: o prefeito era Elmo Nascimento, <strong>irmão</strong> do deputado.
            Na Fase 5 da Overclean (julho de 2025), a PF bateu na porta de Elmo.
            Durante a busca, R$ 220 mil foram jogados pela janela.
          </p>
        </div>

        {/* Capítulo 3: O PIX */}
        <div className="p-4 bg-bg-card rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 bg-text-muted/20 text-text-muted rounded-full font-medium">
              Capítulo 3
            </span>
            <span className="text-sm font-medium text-text-primary">O Dinheiro "PIX"</span>
          </div>
          <p className="text-sm text-text-secondary">
            Nem todas as emendas são iguais. Cerca de{' '}
            <strong className="text-text-primary">24%</strong> das emendas de ambos os deputados
            foram "Transferências Especiais" — as famosas <strong>Emendas PIX</strong>.
            A diferença? Esse dinheiro vai direto para a conta da prefeitura, sem convênio,
            sem projeto, sem necessidade de prestar contas ao governo federal sobre o que será feito com ele.
          </p>
        </div>

        {/* Capítulo 4: A Empresa */}
        <div className="p-4 bg-bg-card rounded-lg border-l-4 border-text-secondary">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 bg-text-muted/20 text-text-muted rounded-full font-medium">
              Capítulo 4
            </span>
            <span className="text-sm font-medium text-text-primary">A Empresa Quebrada</span>
          </div>
          <p className="text-sm text-text-secondary">
            Entre centenas de beneficiários, um nome chama atenção:{' '}
            <strong className="text-text-primary">Bakof Plásticos LTDA em Recuperação Judicial</strong>.
            Essa empresa, do Rio Grande do Sul, em dificuldades financeiras sérias,
            recebeu <strong>R$ 2,9 milhões</strong> de Elmar. Por que recursos públicos
            federais vão para uma empresa em processo de falência?
          </p>
        </div>

        {/* Capítulo 5: O Paradoxo */}
        <div className="p-4 bg-bg-card rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 bg-text-muted/20 text-text-muted rounded-full font-medium">
              Capítulo 5
            </span>
            <span className="text-sm font-medium text-text-primary">A Grande Ironia</span>
          </div>
          <p className="text-sm text-text-secondary">
            Se você olhasse apenas para o CEAP, Elmar pareceria o mais arriscado:
            mais concentrado, mais desvio estatístico, menos fornecedores.
            Mas é <strong>Félix</strong> quem se tornou o alvo principal da Fase 9.
            A investigação não segue métricas de gabinete. Segue o dinheiro grande.
            E esse dinheiro está nas emendas.
          </p>
        </div>
      </div>

      {/* O fio da meada */}
      <div className="mt-6 p-4 bg-bg-card rounded-lg">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">O fio da meada</p>
        <p className="text-sm text-text-secondary">
          Cada peça se conecta: emendas gigantes {'\u{2192}'} passando pelo mesmo banco {'\u{2192}'}{' '}
          chegando a municípios de familiares {'\u{2192}'} parte via mecanismos com menos controle {'\u{2192}'}{' '}
          alguns beneficiários questionáveis. Isso não prova crime. Mas explica por que a PF
          está olhando.
        </p>
      </div>
    </div>
  );
}

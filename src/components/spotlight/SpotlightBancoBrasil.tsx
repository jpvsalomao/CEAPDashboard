/**
 * SpotlightBancoBrasil - Highlights the Banco do Brasil concentration
 * Shows both deputies funneling ~40% through BB
 */

import { formatReais, formatPercent } from '../../utils/formatters';

interface BBData {
  elmar: {
    total: number;
    pct: number;
    count: number;
  };
  felix: {
    total: number;
    pct: number;
    count: number;
  };
}

interface Props {
  data: BBData;
}

export function SpotlightBancoBrasil({ data }: Props) {
  const totalBB = data.elmar.total + data.felix.total;

  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{'\u{1F3E6}'}</span>
        <h3 className="text-lg font-semibold text-text-primary">A Questão do Banco do Brasil</h3>
      </div>

      <p className="text-sm text-text-secondary mb-6">
        Ambos os deputados canalizaram cerca de 40% de todas as emendas através do Banco do Brasil.
      </p>

      {/* BB concentration bars */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-primary font-medium">Elmar via BB</span>
            <span className="text-text-primary font-bold">{formatPercent(data.elmar.pct)}</span>
          </div>
          <div className="h-6 bg-bg-card rounded-lg overflow-hidden">
            <div
              className="h-full bg-accent-amber flex items-center justify-end pr-2"
              style={{ width: `${data.elmar.pct}%` }}
            >
              <span className="text-xs font-medium text-bg-primary">{formatReais(data.elmar.total, { noCents: true })}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-primary font-medium">Félix via BB</span>
            <span className="text-text-primary font-bold">{formatPercent(data.felix.pct)}</span>
          </div>
          <div className="h-6 bg-bg-card rounded-lg overflow-hidden">
            <div
              className="h-full bg-accent-amber/80 flex items-center justify-end pr-2"
              style={{ width: `${data.felix.pct}%` }}
            >
              <span className="text-xs font-medium text-bg-primary">{formatReais(data.felix.total, { noCents: true })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="p-4 bg-bg-card rounded-lg text-center mb-6">
        <p className="text-xs text-text-muted mb-1">Total via Banco do Brasil</p>
        <p className="text-2xl font-bold text-accent-amber">{formatReais(totalBB, { noCents: true })}</p>
        <p className="text-sm text-text-secondary mt-1">de apenas 2 deputados</p>
      </div>

      {/* The question */}
      <div className="p-4 bg-bg-card rounded-lg border border-border">
        <p className="text-sm font-medium text-text-primary mb-3">
          Perguntas em aberto
        </p>
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-text-muted">{'\u{2022}'}</span>
            O que significa usar o BB como intermediário?
          </li>
          <li className="flex items-start gap-2">
            <span className="text-text-muted">{'\u{2022}'}</span>
            É normal para deputados baianos ter ~40% via BB?
          </li>
          <li className="flex items-start gap-2">
            <span className="text-text-muted">{'\u{2022}'}</span>
            O que acontece com o dinheiro depois de chegar ao BB?
          </li>
          <li className="flex items-start gap-2">
            <span className="text-text-muted">{'\u{2022}'}</span>
            O BB está ciente de que é usado como intermediário?
          </li>
        </ul>
      </div>

      {/* Limitation note */}
      <div className="mt-4 p-4 bg-bg-card rounded-lg border-l-4 border-accent-teal">
        <p className="text-sm font-medium text-text-primary mb-2">
          {'\u{2139}'} Limitação importante
        </p>
        <p className="text-sm text-text-secondary">
          <strong>Não temos dados comparativos</strong> de outros deputados baianos para saber se ~40% via BB é incomum.
          O Banco do Brasil é o banco oficial para transferências federais, então pode ser prática comum.
          Sem essa comparação, não podemos concluir se o padrão é atípico.
        </p>
      </div>
    </div>
  );
}

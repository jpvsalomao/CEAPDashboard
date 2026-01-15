/**
 * SpotlightEmendasPix - Explains Emendas PIX and shows deputy usage
 */

import { formatReais, formatPercent } from '../../utils/formatters';

interface EmendasPixData {
  title: string;
  description: string;
  growth: {
    '2020': number;
    '2024': number;
    growthPct: number;
  };
  risks: string[];
  deputiesData: {
    elmar: { total: number; pct: number };
    felix: { total: number; pct: number };
  };
}

interface Props {
  data: EmendasPixData;
}

export function SpotlightEmendasPix({ data }: Props) {
  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{'\u{26A1}'}</span>
        <h3 className="text-lg font-semibold text-text-primary">{data.title}</h3>
      </div>

      <p className="text-sm text-text-secondary mb-6">
        {data.description}
      </p>

      {/* Growth visualization */}
      <div className="p-4 bg-bg-card rounded-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-text-muted">Crescimento das Emendas PIX</span>
          <span className="px-2 py-0.5 bg-bg-secondary text-text-primary text-xs rounded-full font-medium">
            +{data.growth.growthPct}%
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">2020</span>
              <span className="text-text-primary">{formatReais(data.growth['2020'], { noCents: true })}</span>
            </div>
            <div className="h-3 bg-bg-secondary rounded overflow-hidden">
              <div
                className="h-full bg-text-muted rounded"
                style={{ width: `${(data.growth['2020'] / data.growth['2024']) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">2024</span>
              <span className="text-accent-amber font-medium">{formatReais(data.growth['2024'], { noCents: true })}</span>
            </div>
            <div className="h-3 bg-bg-secondary rounded overflow-hidden">
              <div className="h-full bg-accent-amber rounded w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Deputies usage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-bg-card rounded-lg">
          <p className="text-xs text-text-muted mb-1">Elmar - Emendas PIX</p>
          <p className="text-lg font-bold text-text-primary">{formatReais(data.deputiesData.elmar.total, { noCents: true })}</p>
          <p className="text-xs text-text-secondary">{formatPercent(data.deputiesData.elmar.pct)} do total</p>
        </div>
        <div className="p-4 bg-bg-card rounded-lg">
          <p className="text-xs text-text-muted mb-1">Félix - Emendas PIX</p>
          <p className="text-lg font-bold text-text-primary">{formatReais(data.deputiesData.felix.total, { noCents: true })}</p>
          <p className="text-xs text-text-secondary">{formatPercent(data.deputiesData.felix.pct)} do total</p>
        </div>
      </div>

      {/* Risks */}
      <div className="p-4 bg-bg-card rounded-lg border border-border">
        <p className="text-sm font-medium text-text-primary mb-3">
          Por que as Emendas PIX são preocupantes?
        </p>
        <ul className="space-y-2">
          {data.risks.map((risk, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="text-text-muted mt-0.5">{'\u{2022}'}</span>
              {risk}
            </li>
          ))}
        </ul>
      </div>

      {/* How it works */}
      <div className="mt-6 p-4 bg-bg-card rounded-lg">
        <p className="text-sm font-medium text-text-primary mb-2">Como funciona?</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <span className="px-2 py-1 bg-bg-secondary rounded text-xs">Deputado</span>
          <span>{'\u{2192}'}</span>
          <span className="px-2 py-1 bg-accent-amber/10 text-accent-amber rounded text-xs">Emenda PIX</span>
          <span>{'\u{2192}'}</span>
          <span className="px-2 py-1 bg-bg-secondary rounded text-xs">Prefeitura</span>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Sem convênio, sem projeto prévio, direto na conta. Por isso o apelido "PIX".
        </p>
      </div>
    </div>
  );
}

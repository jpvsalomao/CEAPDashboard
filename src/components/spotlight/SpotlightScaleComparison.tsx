/**
 * SpotlightScaleComparison - Visualização de escala CEAP vs Emendas
 * Design refinado usando sistema de cores do app
 */

import { formatReais } from '../../utils/formatters';

interface ScaleData {
  ceapTotal: number;
  emendasTotal: number;
  ratio: number;
  ceapPeriod: string;
  emendasPeriod: string;
  insight: string;
}

interface Props {
  data: ScaleData;
}

export function SpotlightScaleComparison({ data }: Props) {
  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Onde Está o Dinheiro de Verdade?
        </h3>
        <span className="text-xs px-2 py-1 bg-bg-card rounded text-text-muted">
          Elmar + Félix
        </span>
      </div>

      <p className="text-sm text-text-secondary mb-6 max-w-2xl">
        Para entender por que a investigação foca nas emendas e não no CEAP,
        veja a escala. Cada quadrado = R$ 2,8 milhões:
      </p>

      {/* Visualization container */}
      <div className="bg-bg-card rounded-lg p-4">
        {/* Block grid - compact, showing all 147 blocks */}
        <div className="flex flex-wrap gap-[3px]">
          {/* CEAP block - single, distinct */}
          <div
            className="w-[10px] h-[10px] rounded-[2px] bg-accent-teal"
            title={`CEAP: ${formatReais(data.ceapTotal, { noCents: true })}`}
          />

          {/* ALL Emendas blocks */}
          {Array.from({ length: data.ratio }).map((_, i) => (
            <div
              key={i}
              className="w-[10px] h-[10px] rounded-[2px] bg-accent-amber"
              title={`Emendas: ${i + 1} de ${data.ratio}`}
            />
          ))}
        </div>

        {/* Legend - below the blocks */}
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-[10px] h-[10px] rounded-[2px] bg-accent-teal" />
            <span className="text-text-muted">
              CEAP <span className="text-text-primary font-medium">(1)</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[10px] h-[10px] rounded-[2px] bg-accent-amber" />
            <span className="text-text-muted">
              Emendas <span className="text-text-primary font-medium">({data.ratio})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Values comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="p-4 bg-bg-card rounded-lg">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
            CEAP ({data.ceapPeriod})
          </p>
          <p className="text-xl font-bold text-accent-teal">{formatReais(data.ceapTotal, { noCents: true })}</p>
          <p className="text-xs text-text-muted mt-2">
            Passagens, combustível, escritório...
          </p>
        </div>
        <div className="p-4 bg-bg-card rounded-lg border border-accent-amber/30">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
            Emendas ({data.emendasPeriod})
          </p>
          <p className="text-xl font-bold text-accent-amber">{formatReais(data.emendasTotal, { noCents: true })}</p>
          <p className="text-xs text-text-muted mt-2">
            Transferências para municípios...
          </p>
        </div>
      </div>

      {/* Insight callout */}
      <div className="mt-6 p-4 bg-bg-card rounded-lg border-l-2 border-accent-amber">
        <p className="text-sm text-text-secondary">
          <span className="text-accent-amber font-semibold">{data.ratio}x de diferença.</span>{' '}
          {data.insight}
        </p>
      </div>
    </div>
  );
}

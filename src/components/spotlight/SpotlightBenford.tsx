/**
 * SpotlightBenford - Benford's Law analysis visualization
 * Shows expected vs observed first-digit distribution
 */

import { colors } from '../../utils/colors';

export interface BenfordDigit {
  digit: number;
  expected: number;
  observed: number;
}

interface SpotlightBenfordProps {
  digits: BenfordDigit[];
  chi2: number;
  pValue: number;
  significant: boolean;
}

export function SpotlightBenford({ digits, chi2, pValue, significant }: SpotlightBenfordProps) {
  const maxPct = Math.max(...digits.flatMap(d => [d.expected, d.observed]));

  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <span>📊</span>
            Lei de Benford
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Distribuição do primeiro dígito das transações
          </p>
        </div>
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
              significant
                ? 'bg-accent-red/20 text-accent-red'
                : 'bg-accent-teal/20 text-accent-teal'
            }`}
          >
            <span>{significant ? '⚠️' : '✓'}</span>
            {significant ? 'Desvio Significativo' : 'Dentro do Esperado'}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="space-y-3">
        {digits.map(digit => {
          const deviation = digit.observed - digit.expected;
          const isAnomaly = Math.abs(deviation) > 3; // More than 3pp difference

          return (
            <div key={digit.digit} className="group">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-mono text-text-muted">
                  {digit.digit}
                </span>
                <div className="flex-1 h-6 bg-bg-card rounded relative overflow-hidden">
                  {/* Expected bar (background) */}
                  <div
                    className="absolute h-full bg-text-muted/20 rounded"
                    style={{ width: `${(digit.expected / maxPct) * 100}%` }}
                  />
                  {/* Observed bar */}
                  <div
                    className="absolute h-full rounded transition-all"
                    style={{
                      width: `${(digit.observed / maxPct) * 100}%`,
                      backgroundColor: isAnomaly
                        ? deviation > 0
                          ? colors.accentRed
                          : colors.accentAmber
                        : colors.accentTeal,
                    }}
                  />
                  {/* Expected marker line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-text-primary/50"
                    style={{ left: `${(digit.expected / maxPct) * 100}%` }}
                  />
                </div>
                <div className="w-24 text-right">
                  <span
                    className={`text-xs font-mono ${
                      isAnomaly ? 'text-accent-red font-semibold' : 'text-text-muted'
                    }`}
                  >
                    {digit.observed.toFixed(1)}%
                  </span>
                  <span className="text-xs text-text-muted ml-1">
                    ({deviation > 0 ? '+' : ''}{deviation.toFixed(1)})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <div className="w-3 h-3 rounded bg-text-muted/20" />
          <span>Esperado (Benford)</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.accentTeal }} />
          <span>Observado</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <div className="w-0.5 h-3 bg-text-primary/50" />
          <span>Marca Esperada</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-lg font-bold text-text-primary">{chi2.toFixed(1)}</p>
          <p className="text-xs text-text-muted">Chi-quadrado</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-text-primary">
            {pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4)}
          </p>
          <p className="text-xs text-text-muted">p-value</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-text-primary">8</p>
          <p className="text-xs text-text-muted">g.l.</p>
        </div>
      </div>

      {/* Interpretation */}
      <div className={`mt-4 p-3 rounded text-xs ${significant ? 'bg-accent-amber/10' : 'bg-accent-teal/10'}`}>
        <p className="text-text-secondary">
          {significant ? (
            <>
              <strong className="text-accent-amber">Interpretação:</strong> A distribuição de dígitos
              difere significativamente do esperado pela Lei de Benford. Isso pode indicar padrões
              não-naturais nos valores, mas também pode ser explicado por contratos com valores fixos
              ou faixas de preço limitadas.
            </>
          ) : (
            <>
              <strong className="text-accent-teal">Interpretação:</strong> A distribuição de dígitos
              está dentro do esperado pela Lei de Benford, sugerindo padrões naturais de gastos.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

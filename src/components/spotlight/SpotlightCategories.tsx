/**
 * SpotlightCategories - Category breakdown visualization
 * Shows spending by category with horizontal bars
 */

import { formatReais, formatPercent } from '../../utils/formatters';

interface CategoryBreakdown {
  category: string;
  value: number;
  pct: number;
  highlight?: boolean;
}

interface SpotlightCategoriesProps {
  categories: CategoryBreakdown[];
  total: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Manutencao de Escritorio': '🏢',
  'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR': '🏢',
  'Locacao de Veiculos': '🚗',
  'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES': '🚗',
  'Passagem Aerea': '✈️',
  'PASSAGEM AÉREA - SIGEPA': '✈️',
  'PASSAGEM AÉREA - RPA': '✈️',
  'Combustiveis': '⛽',
  'COMBUSTÍVEIS E LUBRIFICANTES.': '⛽',
  'Telefonia': '📞',
  'TELEFONIA': '📞',
  'Hospedagem': '🏨',
  'HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.': '🏨',
};

const getCategoryIcon = (category: string): string => {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return '📁';
};

export function SpotlightCategories({ categories, total }: SpotlightCategoriesProps) {
  const sortedCategories = [...categories].sort((a, b) => b.value - a.value);
  const maxValue = sortedCategories[0]?.value || 0;

  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <span>📂</span>
            Gastos por Categoria
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Distribuicao dos gastos por tipo de despesa
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">{formatReais(total, { noCents: true })}</p>
          <p className="text-xs text-text-muted">Total</p>
        </div>
      </div>

      <div className="space-y-3">
        {sortedCategories.slice(0, 8).map((cat, i) => {
          const barWidth = (cat.value / maxValue) * 100;
          const isVehicle = cat.category.toLowerCase().includes('veículo') ||
                           cat.category.toLowerCase().includes('veiculo') ||
                           cat.category.toLowerCase().includes('locação');

          return (
            <div key={i} className="group">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm">{getCategoryIcon(cat.category)}</span>
                <span className={`text-sm flex-1 truncate ${cat.highlight ? 'text-accent-amber font-medium' : 'text-text-primary'}`}>
                  {cat.category.length > 40
                    ? cat.category.substring(0, 40) + '...'
                    : cat.category}
                </span>
                <span className="text-sm text-text-muted shrink-0">
                  {formatPercent(cat.pct)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5" /> {/* Spacer for icon alignment */}
                <div className="flex-1 h-4 bg-bg-card rounded overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${
                      cat.highlight
                        ? 'bg-accent-amber'
                        : isVehicle
                          ? 'bg-accent-red/70'
                          : 'bg-accent-teal'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-xs text-text-secondary w-24 text-right shrink-0">
                  {formatReais(cat.value, { noCents: true })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vehicle highlight */}
      {sortedCategories.some(c =>
        c.category.toLowerCase().includes('veículo') ||
        c.category.toLowerCase().includes('locação')
      ) && (
        <div className="mt-6 p-3 bg-accent-red/10 rounded text-xs">
          <p className="text-text-secondary">
            <span className="text-accent-red font-medium">Destaque:</span> Gastos com veiculos
            (aluguel + combustivel) somam{' '}
            <strong>
              {formatReais(
                sortedCategories
                  .filter(c =>
                    c.category.toLowerCase().includes('veículo') ||
                    c.category.toLowerCase().includes('locação') ||
                    c.category.toLowerCase().includes('combustí')
                  )
                  .reduce((s, c) => s + c.value, 0),
                { noCents: true }
              )}
            </strong>{' '}
            ({formatPercent(
              sortedCategories
                .filter(c =>
                  c.category.toLowerCase().includes('veículo') ||
                  c.category.toLowerCase().includes('locação') ||
                  c.category.toLowerCase().includes('combustí')
                )
                .reduce((s, c) => s + c.pct, 0)
            )}{' '}
            do total).
          </p>
        </div>
      )}
    </div>
  );
}

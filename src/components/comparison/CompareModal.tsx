import { useState, useMemo } from 'react';
import { useDeputies } from '../../hooks/useDeputies';
import { formatReais, formatNumber, formatPercent } from '../../utils/formatters';
import type { Deputy } from '../../types/data';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDeputy?: Deputy;
}

export function CompareModal({ isOpen, onClose, initialDeputy }: CompareModalProps) {
  const { data: deputies } = useDeputies();
  const [selectedIds, setSelectedIds] = useState<number[]>(
    initialDeputy ? [initialDeputy.id] : []
  );
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDeputies = useMemo(() => {
    if (!deputies) return [];
    return deputies
      .filter(d =>
        !d.name.includes('LIDERANÇA') &&
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 20);
  }, [deputies, searchTerm]);

  const selectedDeputies = useMemo(() => {
    if (!deputies) return [];
    return selectedIds.map(id => deputies.find(d => d.id === id)).filter(Boolean) as Deputy[];
  }, [deputies, selectedIds]);

  const toggleDeputy = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-bg-secondary border border-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-bg-secondary">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Comparar Deputados</h2>
            <p className="text-sm text-text-muted">Selecione até 4 deputados para comparar</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Search and selection */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar deputado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal"
            />

            {/* Search results */}
            {searchTerm && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                {filteredDeputies.map(deputy => (
                  <button
                    key={deputy.id}
                    onClick={() => toggleDeputy(deputy.id)}
                    disabled={selectedIds.length >= 4 && !selectedIds.includes(deputy.id)}
                    className={`p-2 text-left text-sm rounded-lg border transition-colors ${
                      selectedIds.includes(deputy.id)
                        ? 'border-accent-teal bg-accent-teal/20 text-accent-teal'
                        : 'border-border hover:border-accent-teal/50 text-text-secondary disabled:opacity-50'
                    }`}
                  >
                    <div className="font-medium truncate">{deputy.name}</div>
                    <div className="text-xs text-text-muted">{deputy.party}-{deputy.uf}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected deputies chips */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedDeputies.map(deputy => (
                <div
                  key={deputy.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-accent-teal/20 border border-accent-teal rounded-full"
                >
                  <span className="text-sm text-accent-teal">{deputy.name}</span>
                  <button
                    onClick={() => toggleDeputy(deputy.id)}
                    className="text-accent-teal hover:text-accent-red"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Comparison table */}
          {selectedDeputies.length >= 2 ? (
            <ComparisonTable deputies={selectedDeputies} />
          ) : (
            <div className="text-center py-12 text-text-muted">
              <p className="text-lg mb-2">Selecione pelo menos 2 deputados</p>
              <p className="text-sm">Use a busca acima para encontrar deputados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComparisonTable({ deputies }: { deputies: Deputy[] }) {
  // Calculate max values for bar widths
  const maxTotal = Math.max(...deputies.map(d => d.totalSpending));
  const maxTx = Math.max(...deputies.map(d => d.transactionCount));
  const maxHHI = Math.max(...deputies.map(d => d.hhi.value));
  const maxSuppliers = Math.max(...deputies.map(d => d.supplierCount));

  const metrics = [
    {
      label: 'Gasto Total',
      getValue: (d: Deputy) => d.totalSpending,
      format: (v: number) => formatReais(v, true),
      max: maxTotal,
      color: 'bg-accent-teal',
    },
    {
      label: 'Transações',
      getValue: (d: Deputy) => d.transactionCount,
      format: formatNumber,
      max: maxTx,
      color: 'bg-accent-blue',
    },
    {
      label: 'HHI',
      getValue: (d: Deputy) => d.hhi.value,
      format: (v: number) => v.toFixed(0),
      max: maxHHI,
      color: 'bg-accent-red',
      higherIsBad: true,
    },
    {
      label: 'Fornecedores',
      getValue: (d: Deputy) => d.supplierCount,
      format: formatNumber,
      max: maxSuppliers,
      color: 'bg-accent-amber',
    },
    {
      label: 'Top Fornecedor %',
      getValue: (d: Deputy) => d.topSuppliers[0]?.pct || 0,
      format: (v: number) => formatPercent(v / 100),
      max: 100,
      color: 'bg-accent-red',
      higherIsBad: true,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-text-muted font-medium">Métrica</th>
            {deputies.map(deputy => (
              <th key={deputy.id} className="text-left py-3 px-4">
                <div className="font-semibold text-text-primary">{deputy.name}</div>
                <div className="text-xs text-text-muted">{deputy.party}-{deputy.uf}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => (
            <tr key={metric.label} className="border-b border-border/50">
              <td className="py-4 px-4 text-text-secondary font-medium">{metric.label}</td>
              {deputies.map(deputy => {
                const value = metric.getValue(deputy);
                const pct = (value / metric.max) * 100;
                const isMax = value === metric.max;

                return (
                  <td key={deputy.id} className="py-4 px-4">
                    <div className="space-y-1">
                      <div className={`font-mono text-sm ${
                        isMax
                          ? (metric.higherIsBad ? 'text-accent-red' : 'text-accent-teal')
                          : 'text-text-primary'
                      }`}>
                        {metric.format(value)}
                        {isMax && <span className="ml-1 text-xs">(max)</span>}
                      </div>
                      <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${metric.color} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Top suppliers row */}
          <tr>
            <td className="py-4 px-4 text-text-secondary font-medium">Top 3 Fornecedores</td>
            {deputies.map(deputy => (
              <td key={deputy.id} className="py-4 px-4">
                <div className="space-y-1">
                  {deputy.topSuppliers.slice(0, 3).map((supplier, i) => (
                    <div key={i} className="text-xs">
                      <div className="text-text-secondary truncate" title={supplier.name}>
                        {supplier.name.slice(0, 25)}{supplier.name.length > 25 ? '...' : ''}
                      </div>
                      <div className="text-text-muted">
                        {formatReais(supplier.value)} ({formatPercent(supplier.pct / 100)})
                      </div>
                    </div>
                  ))}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

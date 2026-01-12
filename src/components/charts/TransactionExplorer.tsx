import { useMemo, useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { Deputy } from '../../types/data';
import { formatReais, formatNumber, formatPercent } from '../../utils/formatters';
import { colors } from '../../utils/colors';

interface TransactionExplorerProps {
  deputy: Deputy;
  allDeputies: Deputy[];
}

type ViewMode = 'summary' | 'category' | 'month' | 'supplier';
type SortField = 'name' | 'value' | 'pct' | 'count';
type SortOrder = 'asc' | 'desc';

export function TransactionExplorer({ deputy, allDeputies }: TransactionExplorerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate averages for comparison
  const averages = useMemo(() => {
    const filtered = allDeputies.filter(
      d => !d.name.includes('LIDERANCA') && d.transactionCount > 10
    );
    if (filtered.length === 0) {
      return { spending: 0, transactions: 0, avgTicket: 0, supplierCount: 0 };
    }

    return {
      spending: filtered.reduce((s, d) => s + d.totalSpending, 0) / filtered.length,
      transactions: filtered.reduce((s, d) => s + d.transactionCount, 0) / filtered.length,
      avgTicket: filtered.reduce((s, d) => s + d.avgTicket, 0) / filtered.length,
      supplierCount: filtered.reduce((s, d) => s + d.supplierCount, 0) / filtered.length,
    };
  }, [allDeputies]);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Sorted categories
  const sortedCategories = useMemo(() => {
    if (!deputy.byCategory?.length) return [];
    return [...deputy.byCategory].sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return a.category.localeCompare(b.category) * multiplier;
        case 'value':
          return (a.value - b.value) * multiplier;
        case 'pct':
          return (a.pct - b.pct) * multiplier;
        case 'count':
          return (a.transactionCount - b.transactionCount) * multiplier;
        default:
          return 0;
      }
    });
  }, [deputy.byCategory, sortField, sortOrder]);

  // Sorted months
  const sortedMonths = useMemo(() => {
    if (!deputy.byMonth?.length) return [];
    return [...deputy.byMonth].sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return a.month.localeCompare(b.month) * multiplier;
        case 'value':
          return (a.value - b.value) * multiplier;
        case 'count':
          return (a.transactionCount - b.transactionCount) * multiplier;
        default:
          return 0;
      }
    });
  }, [deputy.byMonth, sortField, sortOrder]);

  // Sorted suppliers
  const sortedSuppliers = useMemo(() => {
    if (!deputy.topSuppliers?.length) return [];
    return [...deputy.topSuppliers].sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return a.name.localeCompare(b.name) * multiplier;
        case 'value':
          return (a.value - b.value) * multiplier;
        case 'pct':
          return (a.pct - b.pct) * multiplier;
        default:
          return 0;
      }
    });
  }, [deputy.topSuppliers, sortField, sortOrder]);

  // D3 tooltips
  useEffect(() => {
    const tooltip = d3
      .select(tooltipRef.current)
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', colors.bgCard)
      .style('border', `1px solid ${colors.bgCardSolid}`)
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('max-width', '300px')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');

    return () => {
      tooltip.style('visibility', 'hidden');
    };
  }, []);

  const showTooltip = (event: React.MouseEvent, content: string) => {
    d3.select(tooltipRef.current)
      .style('visibility', 'visible')
      .html(content)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 10}px`);
  };

  const hideTooltip = () => {
    d3.select(tooltipRef.current).style('visibility', 'hidden');
  };

  // Max values for bars
  const maxCategoryValue = Math.max(...(deputy.byCategory?.map(c => c.value) || [1]));
  const maxMonthValue = Math.max(...(deputy.byMonth?.map(m => m.value) || [1]));
  const maxSupplierPct = Math.max(...(deputy.topSuppliers?.map(s => s.pct) || [1]));

  // Summary stats
  const summaryStats = useMemo(() => {
    const categories = deputy.byCategory?.length || 0;
    const months = deputy.byMonth?.length || 0;
    const suppliers = deputy.supplierCount;
    const topCategoryPct = deputy.byCategory?.[0]?.pct || 0;
    const topSupplierPct = deputy.topSuppliers?.[0]?.pct || 0;

    return {
      categories,
      months,
      suppliers,
      topCategoryPct,
      topSupplierPct,
      avgPerMonth: months > 0 ? deputy.totalSpending / months : 0,
      avgPerSupplier: suppliers > 0 ? deputy.totalSpending / suppliers : 0,
    };
  }, [deputy]);

  const renderSortHeader = (label: string, field: SortField) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-accent-teal transition ${
        sortField === field ? 'text-accent-teal' : 'text-text-muted'
      }`}
    >
      {label}
      {sortField === field && (
        <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Tooltip container */}
      <div ref={tooltipRef} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Explorador de Transações</h3>
          <p className="text-sm text-text-muted">
            {formatNumber(deputy.transactionCount)} transações totalizando{' '}
            {formatReais(deputy.totalSpending, true)}
          </p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-1 p-1 bg-bg-secondary rounded-lg">
        {(
          [
            { key: 'summary', label: 'Resumo' },
            { key: 'category', label: 'Por Categoria' },
            { key: 'month', label: 'Por Mês' },
            { key: 'supplier', label: 'Por Fornecedor' },
          ] as const
        ).map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition ${
              viewMode === tab.key
                ? 'bg-bg-card text-accent-teal font-medium'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary View */}
      {viewMode === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-bg-secondary rounded-lg p-4">
              <p className="text-xs text-text-muted mb-1">Total Gasto</p>
              <p className="text-lg font-bold text-text-primary">
                {formatReais(deputy.totalSpending, true)}
              </p>
              <p
                className={`text-xs ${deputy.totalSpending > averages.spending ? 'text-accent-red' : 'text-accent-teal'}`}
              >
                {((deputy.totalSpending / averages.spending - 1) * 100).toFixed(0)}% vs média
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-4">
              <p className="text-xs text-text-muted mb-1">Transações</p>
              <p className="text-lg font-bold text-text-primary">
                {formatNumber(deputy.transactionCount)}
              </p>
              <p
                className={`text-xs ${deputy.transactionCount > averages.transactions ? 'text-accent-red' : 'text-accent-teal'}`}
              >
                {((deputy.transactionCount / averages.transactions - 1) * 100).toFixed(0)}% vs média
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-4">
              <p className="text-xs text-text-muted mb-1">Ticket Médio</p>
              <p className="text-lg font-bold text-text-primary">
                {formatReais(deputy.avgTicket, true)}
              </p>
              <p
                className={`text-xs ${deputy.avgTicket > averages.avgTicket ? 'text-accent-red' : 'text-accent-teal'}`}
              >
                {((deputy.avgTicket / averages.avgTicket - 1) * 100).toFixed(0)}% vs média
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-4">
              <p className="text-xs text-text-muted mb-1">Fornecedores</p>
              <p className="text-lg font-bold text-text-primary">
                {formatNumber(deputy.supplierCount)}
              </p>
              <p
                className={`text-xs ${deputy.supplierCount < averages.supplierCount ? 'text-accent-amber' : 'text-accent-teal'}`}
              >
                {((deputy.supplierCount / averages.supplierCount - 1) * 100).toFixed(0)}% vs média
              </p>
            </div>
          </div>

          {/* Concentration Summary */}
          <div className="bg-bg-secondary rounded-lg p-4">
            <h4 className="text-sm font-medium text-text-primary mb-3">Concentração</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted mb-1">Principal Categoria</p>
                <p className="text-sm text-text-primary truncate">
                  {deputy.byCategory?.[0]?.category || 'N/A'}
                </p>
                <div className="h-2 bg-bg-card rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-teal"
                    style={{ width: `${summaryStats.topCategoryPct}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {formatPercent(summaryStats.topCategoryPct)} do total
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Principal Fornecedor</p>
                <p className="text-sm text-text-primary truncate">
                  {deputy.topSuppliers?.[0]?.name || 'N/A'}
                </p>
                <div className="h-2 bg-bg-card rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${summaryStats.topSupplierPct}%`,
                      backgroundColor:
                        summaryStats.topSupplierPct > 50
                          ? colors.accentRed
                          : summaryStats.topSupplierPct > 25
                            ? colors.accentAmber
                            : colors.accentTeal,
                    }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {formatPercent(summaryStats.topSupplierPct)} do total
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-bg-secondary/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-text-primary">{summaryStats.categories}</p>
              <p className="text-xs text-text-muted">Categorias</p>
            </div>
            <div className="bg-bg-secondary/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-text-primary">{summaryStats.months}</p>
              <p className="text-xs text-text-muted">Meses Ativos</p>
            </div>
            <div className="bg-bg-secondary/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-text-primary">{summaryStats.suppliers}</p>
              <p className="text-xs text-text-muted">Fornecedores</p>
            </div>
          </div>
        </div>
      )}

      {/* Category View */}
      {viewMode === 'category' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary/50 rounded-lg">
            <div className="flex-1">{renderSortHeader('Categoria', 'name')}</div>
            <div className="w-28 text-right">{renderSortHeader('Valor', 'value')}</div>
            <div className="w-16 text-right">{renderSortHeader('%', 'pct')}</div>
            <div className="w-16 text-right">{renderSortHeader('Qtd', 'count')}</div>
          </div>

          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {sortedCategories.map((cat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg hover:bg-bg-card transition cursor-pointer"
                onMouseEnter={e =>
                  showTooltip(
                    e,
                    `<div class="space-y-1">
                      <p class="font-medium text-text-primary">${cat.category}</p>
                      <p>Valor: ${formatReais(cat.value)}</p>
                      <p>Transações: ${formatNumber(cat.transactionCount)}</p>
                      <p>Ticket médio: ${formatReais(cat.value / cat.transactionCount)}</p>
                      <p>${formatPercent(cat.pct)} do total</p>
                    </div>`
                  )
                }
                onMouseLeave={hideTooltip}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{cat.category}</p>
                  <div className="h-1.5 bg-bg-card rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-teal"
                      style={{ width: `${(cat.value / maxCategoryValue) * 100}%` }}
                    />
                  </div>
                </div>
                <p className="w-28 text-right text-sm font-mono text-text-secondary">
                  {formatReais(cat.value, true)}
                </p>
                <p className="w-16 text-right text-sm text-text-muted">
                  {formatPercent(cat.pct)}
                </p>
                <p className="w-16 text-right text-sm text-text-muted">
                  {formatNumber(cat.transactionCount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary/50 rounded-lg">
            <div className="flex-1">{renderSortHeader('Mês', 'name')}</div>
            <div className="w-28 text-right">{renderSortHeader('Valor', 'value')}</div>
            <div className="w-16 text-right">{renderSortHeader('Qtd', 'count')}</div>
          </div>

          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {sortedMonths.map((month, idx) => {
              const avgValue = deputy.totalSpending / (deputy.byMonth?.length || 1);
              const isAboveAvg = month.value > avgValue * 1.5;

              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg hover:bg-bg-card transition cursor-pointer"
                  onMouseEnter={e =>
                    showTooltip(
                      e,
                      `<div class="space-y-1">
                        <p class="font-medium text-text-primary">${month.month}</p>
                        <p>Valor: ${formatReais(month.value)}</p>
                        <p>Transações: ${formatNumber(month.transactionCount)}</p>
                        <p>Ticket médio: ${formatReais(month.value / month.transactionCount)}</p>
                        <p>${isAboveAvg ? '⚠️ Acima da média mensal' : '✓ Dentro da média'}</p>
                      </div>`
                    )
                  }
                  onMouseLeave={hideTooltip}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{month.month}</p>
                    <div className="h-1.5 bg-bg-card rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(month.value / maxMonthValue) * 100}%`,
                          backgroundColor: isAboveAvg ? colors.accentAmber : colors.accentTeal,
                        }}
                      />
                    </div>
                  </div>
                  <p className="w-28 text-right text-sm font-mono text-text-secondary">
                    {formatReais(month.value, true)}
                  </p>
                  <p className="w-16 text-right text-sm text-text-muted">
                    {formatNumber(month.transactionCount)}
                  </p>
                </div>
              );
            })}
          </div>

          {sortedMonths.length === 0 && (
            <div className="p-6 text-center text-text-muted">
              Dados mensais não disponíveis para este deputado.
            </div>
          )}
        </div>
      )}

      {/* Supplier View */}
      {viewMode === 'supplier' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary/50 rounded-lg">
            <div className="flex-1">{renderSortHeader('Fornecedor', 'name')}</div>
            <div className="w-28 text-right">{renderSortHeader('Valor', 'value')}</div>
            <div className="w-16 text-right">{renderSortHeader('%', 'pct')}</div>
          </div>

          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {sortedSuppliers.map((supplier, idx) => {
              const concentration =
                supplier.pct > 50 ? 'high' : supplier.pct > 25 ? 'medium' : 'low';

              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg hover:bg-bg-card transition cursor-pointer"
                  onMouseEnter={e =>
                    showTooltip(
                      e,
                      `<div class="space-y-1">
                        <p class="font-medium text-text-primary">${supplier.name}</p>
                        <p class="text-text-muted text-[10px]">CNPJ: ${supplier.cnpj || 'N/A'}</p>
                        <p>Valor: ${formatReais(supplier.value)}</p>
                        <p>${formatPercent(supplier.pct)} do total</p>
                        <p class="${concentration === 'high' ? 'text-accent-red' : concentration === 'medium' ? 'text-accent-amber' : 'text-accent-teal'}">
                          ${concentration === 'high' ? '⚠️ Alta concentração' : concentration === 'medium' ? '⚡ Concentração moderada' : '✓ Concentração normal'}
                        </p>
                      </div>`
                    )
                  }
                  onMouseLeave={hideTooltip}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          concentration === 'high'
                            ? colors.accentRed
                            : concentration === 'medium'
                              ? colors.accentAmber
                              : colors.accentTeal,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary truncate">{supplier.name}</p>
                      <div className="h-1.5 bg-bg-card rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(supplier.pct / maxSupplierPct) * 100}%`,
                            backgroundColor:
                              concentration === 'high'
                                ? colors.accentRed
                                : concentration === 'medium'
                                  ? colors.accentAmber
                                  : colors.accentTeal,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="w-28 text-right text-sm font-mono text-text-secondary">
                    {formatReais(supplier.value, true)}
                  </p>
                  <p className="w-16 text-right text-sm text-text-muted">
                    {formatPercent(supplier.pct)}
                  </p>
                </div>
              );
            })}
          </div>

          {sortedSuppliers.length === 0 && (
            <div className="p-6 text-center text-text-muted">
              Dados de fornecedores não disponíveis para este deputado.
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-text-muted text-center pt-2">
        Dados agregados do periodo 2023-2025. Clique nas linhas para mais detalhes.
      </p>
    </div>
  );
}

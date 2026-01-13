import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FilterBar } from '../components/filters/FilterBar';
import { NoResults } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { CompareModal } from '../components/comparison/CompareModal';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { RiskTooltip, InfoTooltip } from '../components/ui/TouchTooltip';
import { useFilteredDeputies, useDeputyStats } from '../hooks/useDeputies';
import { useFiltersStore } from '../store/filters';
import {
  formatReais,
  formatNumber,
  abbreviateName,
  getRiskColor,
} from '../utils/formatters';
import type { Deputy } from '../types/data';

type SortKey = 'name' | 'party' | 'uf' | 'totalSpending' | 'transactionCount' | 'hhi' | 'riskLevel';
type SortDirection = 'asc' | 'desc';

const riskOrder: Record<string, number> = {
  CRITICO: 4,
  ALTO: 3,
  MEDIO: 2,
  BAIXO: 1,
};

export function Deputies() {
  const { data: deputies = [], isLoading } = useFilteredDeputies();
  const stats = useDeputyStats();
  const { clearFilters, hasActiveFilters, searchQuery, setSearchQuery } = useFiltersStore();
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const activeFilterCount = useFiltersStore((s) => {
    let count = 0;
    if (s.years.length > 0) count++;
    if (s.states.length > 0) count++;
    if (s.parties.length > 0) count++;
    if (s.riskLevels.length > 0) count++;
    if (s.searchQuery.length > 0) count++;
    return count;
  });
  const [sortKey, setSortKey] = useState<SortKey>('totalSpending');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Sort deputies
  const sortedDeputies = useMemo(() => {
    return [...deputies].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortKey) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'party':
          aVal = a.party;
          bVal = b.party;
          break;
        case 'uf':
          aVal = a.uf;
          bVal = b.uf;
          break;
        case 'totalSpending':
          aVal = a.totalSpending;
          bVal = b.totalSpending;
          break;
        case 'transactionCount':
          aVal = a.transactionCount;
          bVal = b.transactionCount;
          break;
        case 'hhi':
          aVal = a.hhi.value;
          bVal = b.hhi.value;
          break;
        case 'riskLevel':
          aVal = riskOrder[a.riskLevel] || 0;
          bVal = riskOrder[b.riskLevel] || 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'pt-BR')
          : bVal.localeCompare(aVal, 'pt-BR');
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [deputies, sortKey, sortDirection]);

  // Paginate
  const paginatedDeputies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDeputies.slice(start, start + pageSize);
  }, [sortedDeputies, currentPage]);

  const totalPages = Math.ceil(sortedDeputies.length / pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const SortHeader = ({
    label,
    sortKeyName,
    className = '',
  }: {
    label: string;
    sortKeyName: SortKey;
    className?: string;
  }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary transition-colors ${className}`}
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName && (
          <svg
            className={`w-3 h-3 transition-transform ${
              sortDirection === 'asc' ? 'rotate-180' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Header
          title="Deputados"
          subtitle={`Explorando gastos de ${formatNumber(stats.total)} parlamentares`}
        />
        <button
          onClick={() => setCompareModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-teal/20 hover:bg-accent-teal/30 text-accent-teal border border-accent-teal/50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="hidden sm:inline">Comparar</span>
        </button>
      </div>

      {/* Compare Modal */}
      <CompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
      />

      {/* Filter Bar */}
      <FilterBar />

      {/* Name Search */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, partido ou estado..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-10 py-2.5 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-3 flex items-center text-text-muted hover:text-text-primary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-sm text-text-secondary whitespace-nowrap">
              {deputies.length} resultado{deputies.length !== 1 ? 's' : ''} para "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-text-primary">
            {formatNumber(stats.total)}
          </p>
          <p className="text-sm text-text-secondary">Deputados</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-accent-teal">
            {formatReais(stats.avgSpending, true)}
          </p>
          <p className="text-sm text-text-secondary">Gasto médio</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-accent-red">
            {stats.criticalCount}
          </p>
          <p className="text-sm text-text-secondary">Casos críticos</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-accent-amber">
            {stats.highRiskCount}
          </p>
          <p className="text-sm text-text-secondary">Alto risco</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={10} columns={7} />
        ) : sortedDeputies.length === 0 ? (
          <NoResults
            filterCount={hasActiveFilters() ? activeFilterCount : 0}
            onClearFilters={clearFilters}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-bg-secondary">
                  <tr>
                    <SortHeader label="Deputado" sortKeyName="name" />
                    <SortHeader label="Partido" sortKeyName="party" className="hidden md:table-cell" />
                    <SortHeader label="UF" sortKeyName="uf" />
                    <SortHeader label="Total Gasto" sortKeyName="totalSpending" />
                    <SortHeader label="Transações" sortKeyName="transactionCount" className="hidden lg:table-cell" />
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary transition-colors hidden lg:table-cell"
                      onClick={() => handleSort('hhi')}
                    >
                      <div className="flex items-center gap-1">
                        <span>HHI</span>
                        <InfoTooltip
                          content={
                            <div className="space-y-1">
                              <p className="font-medium">Índice Herfindahl-Hirschman</p>
                              <p className="text-xs text-text-secondary">
                                Mede a concentração de gastos com fornecedores. Quanto maior, maior a dependência de poucos fornecedores.
                              </p>
                              <div className="text-xs text-text-muted">
                                <p>&lt; 1500: Baixo</p>
                                <p>1500-2500: Médio</p>
                                <p>2500-3000: Alto</p>
                                <p>&gt; 3000: Crítico</p>
                              </div>
                            </div>
                          }
                        />
                        {sortKey === 'hhi' && (
                          <svg
                            className={`w-3 h-3 transition-transform ${
                              sortDirection === 'asc' ? 'rotate-180' : ''
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </th>
                    <SortHeader label="Risco" sortKeyName="riskLevel" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedDeputies.map((deputy) => (
                    <DeputyRow key={deputy.id} deputy={deputy} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <div className="text-sm text-text-muted">
                  Mostrando {(currentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(currentPage * pageSize, sortedDeputies.length)} de{' '}
                  {sortedDeputies.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm rounded-lg border border-border hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-text-secondary">
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm rounded-lg border border-border hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Proxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DeputyRow({ deputy }: { deputy: Deputy }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-bg-secondary/50 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <FavoriteButton deputyId={deputy.id} size="sm" />
            <div className="w-8 h-8 rounded-full bg-bg-card flex items-center justify-center text-sm font-semibold text-text-secondary">
              {deputy.name.charAt(0)}
            </div>
            <div>
              <Link
                to={`/deputado/${deputy.id}`}
                className="font-medium text-text-primary hover:text-accent-teal transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {abbreviateName(deputy.name)}
              </Link>
              <div className="text-xs text-text-muted md:hidden">
                {deputy.party}-{deputy.uf}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 hidden md:table-cell">
          <span className="text-text-secondary">{deputy.party}</span>
        </td>
        <td className="px-4 py-4">
          <span className="text-text-secondary">{deputy.uf}</span>
        </td>
        <td className="px-4 py-4">
          <span className="font-mono text-text-primary">
            {formatReais(deputy.totalSpending, true)}
          </span>
        </td>
        <td className="px-4 py-4 hidden lg:table-cell">
          <span className="text-text-secondary">
            {formatNumber(deputy.transactionCount)}
          </span>
        </td>
        <td className="px-4 py-4 hidden lg:table-cell">
          <span
            className={`font-mono ${
              deputy.hhi.value > 3000
                ? 'text-accent-red'
                : deputy.hhi.value > 2500
                  ? 'text-accent-amber'
                  : 'text-text-secondary'
            }`}
          >
            {deputy.hhi.value.toFixed(0)}
          </span>
        </td>
        <td className="px-4 py-4">
          <RiskTooltip
            level={deputy.riskLevel as 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO'}
            value={deputy.hhi.value}
          />
        </td>
      </tr>

      {/* Expanded details */}
      {isExpanded && (
        <tr className="bg-bg-secondary/30">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Top suppliers */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-2">
                  Principais Fornecedores
                </h4>
                <div className="space-y-2">
                  {deputy.topSuppliers.slice(0, 3).map((supplier, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-text-muted truncate max-w-[200px]">
                        {supplier.name}
                      </span>
                      <span className="text-accent-teal font-mono">
                        {supplier.pct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* HHI details */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-2">
                  Indice de Concentracao (HHI)
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Valor:</span>
                    <span className="font-mono text-text-primary">
                      {deputy.hhi.value.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Classificacao:</span>
                    <span className={getRiskColor(deputy.hhi.level)}>
                      {deputy.hhi.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-2">
                  Resumo
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Fornecedores:</span>
                    <span className="text-text-primary">
                      {formatNumber(deputy.supplierCount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Ticket medio:</span>
                    <span className="font-mono text-text-primary">
                      {formatReais(
                        deputy.totalSpending / deputy.transactionCount
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Score de risco:</span>
                    <span className="text-text-primary">
                      {deputy.riskScore.toFixed(1)}
                    </span>
                  </div>
                  {deputy.attendance && deputy.attendance.rate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Presença:</span>
                      <span className={`font-mono ${
                        deputy.attendance.rate >= 70 ? 'text-[#2ECC71]' :
                        deputy.attendance.rate >= 50 ? 'text-accent-amber' :
                        'text-accent-red'
                      }`}>
                        {deputy.attendance.rate.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

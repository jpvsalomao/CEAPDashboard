import { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { useFiltersStore } from '../../store/filters';
import { useAggregations } from '../../hooks/useAggregations';
import type { RiskLevel } from '../../types/data';

interface FilterDropdownProps {
  label: string;
  options: { value: string; label: string; count?: number }[];
  selected: string[];
  onToggle: (value: string) => void;
  colorMap?: Record<string, string>;
}

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  colorMap,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm
          border transition-colors
          ${
            selected.length > 0
              ? 'bg-accent-teal/20 border-accent-teal text-accent-teal'
              : 'bg-bg-secondary border-border hover:border-border-hover text-text-secondary'
          }
        `}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-accent-teal text-bg-primary text-xs px-1.5 py-0.5 rounded-full font-medium">
            {selected.length}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-20 min-w-48 max-h-64 overflow-y-auto bg-bg-card-solid border border-border rounded-lg shadow-lg">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => onToggle(option.value)}
                className={`
                  w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left
                  hover:bg-bg-secondary transition-colors
                  ${selected.includes(option.value) ? 'bg-accent-teal/10' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center
                      ${
                        selected.includes(option.value)
                          ? 'bg-accent-teal border-accent-teal'
                          : 'border-border'
                      }
                    `}
                  >
                    {selected.includes(option.value) && (
                      <svg className="w-3 h-3 text-bg-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`${
                      colorMap?.[option.value] || 'text-text-primary'
                    }`}
                  >
                    {option.label}
                  </span>
                </div>
                {option.count !== undefined && (
                  <span className="text-text-muted text-xs">{option.count}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FilterBar() {
  const { data: aggregations } = useAggregations();

  const {
    years,
    states,
    parties,
    categories,
    riskLevels,
    toggleYear,
    toggleState,
    toggleParty,
    toggleCategory,
    toggleRiskLevel,
    clearFilters,
    hasActiveFilters,
  } = useFiltersStore();

  // Extract available years from monthly data
  const yearOptions = useMemo(() => {
    if (!aggregations) return [];
    const yearsSet = new Set<number>();
    aggregations.byMonth.forEach((m) => {
      const year = parseInt(m.month.split('-')[0]);
      yearsSet.add(year);
    });
    return Array.from(yearsSet)
      .sort()
      .reverse()
      .map((y) => ({
        value: y.toString(),
        label: y.toString(),
      }));
  }, [aggregations]);

  // State options from aggregations
  const stateOptions = useMemo(() => {
    if (!aggregations) return [];
    return aggregations.byState.map((s) => ({
      value: s.uf,
      label: s.uf,
      count: s.deputyCount,
    }));
  }, [aggregations]);

  // Party options from aggregations
  const partyOptions = useMemo(() => {
    if (!aggregations) return [];
    return aggregations.byParty.map((p) => ({
      value: p.party,
      label: p.party,
      count: p.deputyCount,
    }));
  }, [aggregations]);

  // Category options from aggregations
  const categoryOptions = useMemo(() => {
    if (!aggregations) return [];
    return aggregations.byCategory
      .sort((a, b) => b.value - a.value)
      .map((c) => ({
        value: c.category,
        label: c.category,
        count: c.transactionCount,
      }));
  }, [aggregations]);

  // Risk level options
  const riskLevelOptions: { value: RiskLevel; label: string }[] = [
    { value: 'CRITICO', label: 'Critico' },
    { value: 'ALTO', label: 'Alto' },
    { value: 'MEDIO', label: 'Medio' },
    { value: 'BAIXO', label: 'Baixo' },
  ];

  const riskColorMap: Record<string, string> = {
    CRITICO: 'text-accent-red',
    ALTO: 'text-accent-amber',
    MEDIO: 'text-accent-teal',
    BAIXO: 'text-status-low',
  };

  const activeFilters = hasActiveFilters();

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-bg-secondary rounded-lg border border-border">
      <span className="text-text-muted text-sm font-medium">Filtros:</span>

      <FilterDropdown
        label="Ano"
        options={yearOptions}
        selected={years.map(String)}
        onToggle={(v) => toggleYear(parseInt(v))}
      />

      <FilterDropdown
        label="Estado"
        options={stateOptions}
        selected={states}
        onToggle={toggleState}
      />

      <FilterDropdown
        label="Partido"
        options={partyOptions}
        selected={parties}
        onToggle={toggleParty}
      />

      <FilterDropdown
        label="Categoria"
        options={categoryOptions}
        selected={categories}
        onToggle={toggleCategory}
      />

      <FilterDropdown
        label="Risco"
        options={riskLevelOptions}
        selected={riskLevels}
        onToggle={(v) => toggleRiskLevel(v as RiskLevel)}
        colorMap={riskColorMap}
      />

      {activeFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
          className="text-accent-red hover:text-accent-red hover:bg-accent-red/10"
        >
          Limpar
        </Button>
      )}
    </div>
  );
}

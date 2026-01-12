import { useState, useEffect, useRef, useMemo } from 'react';
import { useDeputies } from '../../hooks/useDeputies';
import { useFiltersStore } from '../../store/filters';
import { formatReais, abbreviateName, getRiskColor } from '../../utils/formatters';
import type { Deputy } from '../../types/data';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDeputy?: (deputy: Deputy) => void;
}

export function SearchModal({ isOpen, onClose, onSelectDeputy }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: deputies = [] } = useDeputies();
  const setSearchQuery = useFiltersStore((s) => s.setSearchQuery);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Filter deputies based on query
  const filteredDeputies = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return deputies
      .filter(
        (d) =>
          d.name.toLowerCase().includes(lowerQuery) ||
          d.party.toLowerCase().includes(lowerQuery) ||
          d.uf.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 10);
  }, [deputies, query]);

  const handleSelect = (deputy: Deputy) => {
    if (onSelectDeputy) {
      onSelectDeputy(deputy);
    } else {
      // Default behavior: add to filter
      setSearchQuery(deputy.name);
    }
    setQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
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
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar deputado por nome, partido ou estado..."
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-lg"
          />
          <kbd className="hidden sm:inline-block px-2 py-1 text-xs text-text-muted bg-bg-card rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.trim() && filteredDeputies.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-text-muted">
                Nenhum deputado encontrado para "{query}"
              </p>
            </div>
          )}

          {filteredDeputies.map((deputy) => (
            <button
              key={deputy.id}
              onClick={() => handleSelect(deputy)}
              className="w-full flex items-center gap-4 p-4 hover:bg-bg-card transition-colors text-left"
            >
              {/* Avatar placeholder */}
              <div className="w-12 h-12 rounded-full bg-bg-card flex items-center justify-center text-lg font-semibold text-text-secondary">
                {deputy.name.charAt(0)}
              </div>

              {/* Deputy info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary truncate">
                    {abbreviateName(deputy.name)}
                  </span>
                  <span className="text-text-muted text-sm">
                    {deputy.party}-{deputy.uf}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-text-secondary">
                    {formatReais(deputy.totalSpending, true)}
                  </span>
                  <span className="text-xs text-text-muted">
                    {deputy.transactionCount.toLocaleString('pt-BR')} transações
                  </span>
                </div>
              </div>

              {/* Risk indicator */}
              <div className="flex flex-col items-end">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${getRiskColor(
                    deputy.riskLevel
                  )} bg-opacity-20`}
                >
                  {deputy.riskLevel}
                </span>
                <span className="text-xs text-text-muted mt-1">
                  HHI: {deputy.hhi.value.toFixed(0)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        {!query.trim() && (
          <div className="p-4 border-t border-border">
            <p className="text-sm text-text-muted text-center">
              Digite para buscar entre {deputies.length.toLocaleString('pt-BR')}{' '}
              deputados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Search trigger button component
export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-muted hover:text-text-secondary hover:border-border-hover transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span className="text-sm">Buscar deputado...</span>
      <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs bg-bg-card rounded border border-border ml-2">
        /
      </kbd>
    </button>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { SearchModal, SearchTrigger } from '../search/SearchModal';
import { ThemeToggle } from '../ui/ThemeToggle';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showPrint?: boolean;
  showSearch?: boolean;
  showThemeToggle?: boolean;
}

export function Header({ title, subtitle, showPrint = true, showSearch = true, showThemeToggle = true }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Handle keyboard shortcut for search
  useEffect(() => {
    if (!showSearch) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Open search with "/" key (when not in an input)
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showThemeToggle && (
            <div className="no-print">
              <ThemeToggle compact />
            </div>
          )}
          {showPrint && (
            <button
              onClick={handlePrint}
              className="no-print p-2 text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
              title="Imprimir pagina (Ctrl+P)"
              aria-label="Imprimir pagina"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
            </button>
          )}
          {showSearch && <SearchTrigger onClick={() => setIsSearchOpen(true)} />}
        </div>
      </header>

      {/* Print-only header */}
      <div className="print-only print-header hidden">
        <h1>Onde Foi Parar a Cota - {title}</h1>
        <p className="print-date">
          Gerado em {new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {showSearch && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </>
  );
}

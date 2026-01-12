import { useEffect, useState, useCallback } from 'react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['/'], description: 'Abrir busca de deputados', category: 'Navegação' },
  { keys: ['?'], description: 'Mostrar atalhos de teclado', category: 'Ajuda' },
  { keys: ['Esc'], description: 'Fechar modal', category: 'Geral' },
  { keys: ['g', 'h'], description: 'Ir para Visão Geral', category: 'Navegação' },
  { keys: ['g', 'd'], description: 'Ir para Deputados', category: 'Navegação' },
  { keys: ['g', 'a'], description: 'Ir para Análise', category: 'Navegação' },
  { keys: ['g', 'n'], description: 'Ir para Rede', category: 'Navegação' },
  { keys: ['g', 'm'], description: 'Ir para Metodologia', category: 'Navegação' },
];

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group shortcuts by category
  const categories = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Atalhos de Teclado
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 bg-bg-secondary rounded-lg"
                  >
                    <span className="text-sm text-text-secondary">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          <kbd className="px-2 py-1 bg-bg-primary border border-border rounded text-xs font-mono text-text-primary">
                            {key}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="text-text-muted mx-1">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-bg-secondary">
          <p className="text-xs text-text-muted text-center">
            Pressione <kbd className="px-1.5 py-0.5 bg-bg-primary border border-border rounded text-xs font-mono">?</kbd> a qualquer momento para ver esta tela
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook to handle keyboard shortcuts globally
export function useKeyboardShortcuts(navigate: (path: string) => void) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = e.key.toLowerCase();

    // ? opens shortcuts
    if (key === '?' || (e.shiftKey && key === '/')) {
      e.preventDefault();
      setShortcutsOpen(true);
      return;
    }

    // Handle 'g' prefix shortcuts
    if (pendingKey === 'g') {
      e.preventDefault();
      switch (key) {
        case 'h':
          navigate('/');
          break;
        case 'd':
          navigate('/deputados');
          break;
        case 'a':
          navigate('/padrões');
          break;
        case 'n':
          navigate('/rede');
          break;
        case 'm':
          navigate('/metodologia');
          break;
      }
      setPendingKey(null);
      return;
    }

    // Set pending key for 'g' prefix
    if (key === 'g') {
      setPendingKey('g');
      // Clear after 1 second if no follow-up
      setTimeout(() => setPendingKey(null), 1000);
      return;
    }
  }, [pendingKey, navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcutsOpen,
    setShortcutsOpen,
    pendingKey,
  };
}

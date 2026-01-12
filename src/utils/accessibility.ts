/**
 * Accessibility utilities for CEAP Dashboard
 * WCAG 2.1 AA compliance helpers
 */

/**
 * Generate unique IDs for aria-labelledby and aria-describedby
 */
let idCounter = 0;
export function generateAriaId(prefix = 'aria'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Announce message to screen readers via live region
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const existing = document.getElementById('sr-announcer');
  if (existing) {
    existing.textContent = message;
    return;
  }

  const announcer = document.createElement('div');
  announcer.id = 'sr-announcer';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;
  document.body.appendChild(announcer);

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

/**
 * Format number for screen readers (Brazilian Portuguese)
 */
export function formatNumberForSR(value: number, type: 'currency' | 'percent' | 'number' = 'number'): string {
  if (type === 'currency') {
    return `${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  }
  if (type === 'percent') {
    return `${value.toFixed(1)} por cento`;
  }
  return value.toLocaleString('pt-BR');
}

/**
 * Create accessible chart description for screen readers
 */
export function generateChartDescription(
  chartType: string,
  dataPoints: number,
  highlights?: string[]
): string {
  let description = `Grafico de ${chartType} com ${dataPoints} pontos de dados.`;

  if (highlights && highlights.length > 0) {
    description += ' Destaques: ' + highlights.join('. ');
  }

  return description;
}

/**
 * Focus trap for modals and overlays
 * Returns cleanup function
 */
export function createFocusTrap(containerElement: HTMLElement): () => void {
  const focusableElements = containerElement.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  containerElement.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => {
    containerElement.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Check if event is activation key (Enter or Space)
 */
export function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === KeyboardKeys.ENTER || event.key === KeyboardKeys.SPACE;
}

/**
 * Generate table caption for data tables
 */
export function generateTableCaption(
  tableName: string,
  rowCount: number,
  sortedBy?: string,
  sortDirection?: 'asc' | 'desc'
): string {
  let caption = `${tableName} com ${rowCount} registros`;
  if (sortedBy) {
    const direction = sortDirection === 'asc' ? 'crescente' : 'decrescente';
    caption += `, ordenado por ${sortedBy} em ordem ${direction}`;
  }
  return caption;
}

/**
 * Risk level descriptions for screen readers
 */
export const riskLevelDescriptions: Record<string, string> = {
  critical: 'Nivel critico de risco',
  high: 'Nivel alto de risco',
  medium: 'Nivel medio de risco',
  low: 'Nivel baixo de risco',
};

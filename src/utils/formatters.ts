// Brazilian number and currency formatters

/**
 * Format number as Brazilian Reais (R$)
 * @param value - Number to format
 * @param compact - Use compact notation (M, k)
 */
export function formatReais(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000) {
      return `R$ ${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (Math.abs(value) >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `R$ ${(value / 1_000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format number with Brazilian locale (dots as thousands separator)
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format as percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date as Brazilian locale
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Format month-year as Brazilian locale
 */
export function formatMonthYear(monthString: string): string {
  // Input: YYYY-MM
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Format short month name
 */
export function formatShortMonth(monthString: string): string {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
  }).format(date);
}

/**
 * Abbreviate name to first and last
 */
export function abbreviateName(fullName: string): string {
  const parts = fullName.split(' ');
  if (parts.length <= 2) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Get color class for risk level
 */
export function getRiskColor(level: string): string {
  const colors: Record<string, string> = {
    'CRITICO': 'text-accent-red',
    'ALTO': 'text-accent-amber',
    'MEDIO': 'text-accent-teal',
    'BAIXO': 'text-status-low',
  };
  return colors[level] || 'text-text-secondary';
}

/**
 * Get background color class for risk level
 */
export function getRiskBgColor(level: string): string {
  const colors: Record<string, string> = {
    'CRITICO': 'bg-accent-red/20',
    'ALTO': 'bg-accent-amber/20',
    'MEDIO': 'bg-accent-teal/20',
    'BAIXO': 'bg-status-low/20',
  };
  return colors[level] || 'bg-bg-card';
}

/**
 * Format CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  // Remove non-digits
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

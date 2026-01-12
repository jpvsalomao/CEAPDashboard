// Color utilities for D3 charts
// Design System: Dark Editorial / Data Journalism
// Supports Light / Dark themes

// Dark theme colors (default)
export const darkColors = {
  // Backgrounds - Deep noir with warmth
  bgPrimary: '#0A0A0C',
  bgSecondary: '#111114',
  bgTertiary: '#1a1a1f',
  bgCard: 'rgba(17, 17, 20, 0.85)',
  bgCardSolid: '#141417',

  // Accents - Refined jewel tones
  accentRed: '#E04545',
  accentAmber: '#D4A03A',
  accentTeal: '#3D9996',
  accentBlue: '#4682B4',

  // Text - Warm whites
  textPrimary: '#F5F5F3',
  textSecondary: '#9A9CA8',
  textMuted: '#5C5E6A',

  // Status
  statusCritical: '#E04545',
  statusHigh: '#D4A03A',
  statusMedium: '#3D9996',
  statusLow: '#34A853',

  // Borders
  border: '#232328',
  borderHover: '#35353d',

  // Chart specific
  chartGrid: '#2a2b33',
  chartAxis: '#A0A3B1',
  chartDotStroke: '#0D0D0F',

  // Chart palette - Sophisticated, editorial
  chartPalette: [
    '#3D9996', // teal - primary
    '#D4A03A', // amber - highlight
    '#E04545', // red - alert
    '#4682B4', // steel blue
    '#7B6B8D', // muted purple
    '#4A8C59', // forest green
    '#C97B4A', // terracotta
    '#5B7AA1', // slate blue
    '#A66B7A', // dusty rose
    '#7A9B5F', // olive
  ],

  // Gradient stops
  gradientTeal: ['#3D9996', '#2A6B69'],
  gradientRed: ['#E04545', '#8B2F2F'],
  gradientAmber: ['#D4A03A', '#8B6B26'],
} as const;

// Light theme colors
export const lightColors = {
  // Backgrounds - Warm paper tones
  bgPrimary: '#FAFAF8',
  bgSecondary: '#F2F1EF',
  bgTertiary: '#E8E7E4',
  bgCard: 'rgba(255, 255, 253, 0.92)',
  bgCardSolid: '#FFFFFF',

  // Accents - Deeper for contrast on light
  accentRed: '#C93B3B',
  accentAmber: '#B8872E',
  accentTeal: '#2D7A77',
  accentBlue: '#3A6D96',

  // Text - Rich blacks with warm undertones
  textPrimary: '#1A1918',
  textSecondary: '#5C5A56',
  textMuted: '#8A8884',

  // Status - Adjusted for light background
  statusCritical: '#C93B3B',
  statusHigh: '#B8872E',
  statusMedium: '#2D7A77',
  statusLow: '#2D8A47',

  // Borders - Subtle warm definition
  border: '#E0DFDC',
  borderHover: '#CFCECA',

  // Chart specific
  chartGrid: '#E0DFDC',
  chartAxis: '#5C5A56',
  chartDotStroke: '#FFFFFF',

  // Chart palette - Same colors work well on light
  chartPalette: [
    '#2D7A77', // teal - primary (darker)
    '#B8872E', // amber - highlight
    '#C93B3B', // red - alert
    '#3A6D96', // steel blue
    '#6B5A7D', // muted purple
    '#3A7C49', // forest green
    '#B96B3A', // terracotta
    '#4B6A91', // slate blue
    '#966B6A', // dusty rose
    '#6A8B4F', // olive
  ],

  // Gradient stops
  gradientTeal: ['#2D7A77', '#1A5B59'],
  gradientRed: ['#C93B3B', '#7B2525'],
  gradientAmber: ['#B8872E', '#7B5B1E'],
} as const;

// Default export for backward compatibility (dark theme)
export const colors = darkColors;

// Type for theme colors (using interface for flexibility between themes)
export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCard: string;
  bgCardSolid: string;
  accentRed: string;
  accentAmber: string;
  accentTeal: string;
  accentBlue: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  statusCritical: string;
  statusHigh: string;
  statusMedium: string;
  statusLow: string;
  border: string;
  borderHover: string;
  chartGrid: string;
  chartAxis: string;
  chartDotStroke: string;
  chartPalette: readonly string[];
  gradientTeal: readonly [string, string];
  gradientRed: readonly [string, string];
  gradientAmber: readonly [string, string];
}

/**
 * Get colors based on current theme
 * Uses the data-theme attribute on the document element
 */
export function getThemeColors(): ThemeColors {
  if (typeof document === 'undefined') return darkColors;
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'light' ? lightColors : darkColors;
}

/**
 * Hook to get theme-aware colors for D3 charts
 * Re-renders when theme changes
 */
import { useSyncExternalStore } from 'react';

function subscribeToTheme(callback: () => void) {
  // Create observer for data-theme attribute changes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'data-theme'
      ) {
        callback();
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  return () => observer.disconnect();
}

// Cache for theme colors to ensure proper reference equality for useSyncExternalStore
let cachedTheme: string | null = null;
let cachedColors: ThemeColors = darkColors;

function getThemeSnapshot(): ThemeColors {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme !== cachedTheme) {
    cachedTheme = currentTheme;
    cachedColors = currentTheme === 'light' ? lightColors : darkColors;
  }
  return cachedColors;
}

function getServerSnapshot(): ThemeColors {
  return darkColors;
}

export function useThemeColors(): ThemeColors {
  return useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerSnapshot
  );
}

/**
 * Get color by index from chart palette
 */
export function getChartColor(index: number, themeColors?: ThemeColors): string {
  const c = themeColors || getThemeColors();
  return c.chartPalette[index % c.chartPalette.length];
}

/**
 * Get risk level color
 */
export function getRiskLevelColor(level: string, themeColors?: ThemeColors): string {
  const c = themeColors || getThemeColors();
  const levelColors: Record<string, string> = {
    'CRITICO': c.statusCritical,
    'ALTO': c.statusHigh,
    'MEDIO': c.statusMedium,
    'BAIXO': c.statusLow,
  };
  return levelColors[level] || c.textSecondary;
}

/**
 * Create a color scale function for values
 */
export function createColorScale(
  domain: [number, number],
  range?: [string, string],
  themeColors?: ThemeColors
): (value: number) => string {
  const c = themeColors || getThemeColors();
  const [startColor, endColor] = range || [c.accentTeal, c.accentRed];
  const [min, max] = domain;

  return (value: number) => {
    const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
    return interpolateColor(startColor, endColor, t);
  };
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Lighten a hex color
 */
export function lighten(hex: string, amount: number): string {
  return interpolateColor(hex, '#FFFFFF', amount);
}

/**
 * Darken a hex color
 */
export function darken(hex: string, amount: number): string {
  return interpolateColor(hex, '#000000', amount);
}

/**
 * Add alpha to hex color
 */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

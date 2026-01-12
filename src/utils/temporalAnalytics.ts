/**
 * Temporal Analytics Utilities
 *
 * Provides statistical analysis, anomaly detection, and contextual annotations
 * for temporal spending data.
 */

import type { MonthlyData } from '../types/data';

// ============================================================================
// Configuration (easily adjustable thresholds)
// ============================================================================

export const TEMPORAL_CONFIG = {
  // Anomaly detection thresholds (in standard deviations)
  anomaly: {
    spike: 1.5,      // Values > mean + 1.5σ are spikes
    drop: -1.5,      // Values < mean - 1.5σ are drops
    extreme: 2.0,    // Values beyond 2σ are extreme
  },
  // Number formatting
  decimals: 1,
  // Colors for annotations
  colors: {
    spike: '#E04545',
    drop: '#D4A03A',
    normal: '#3D9996',
    annotation: '#5C5E6A',
  },
} as const;

// ============================================================================
// Types
// ============================================================================

export interface TemporalStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  total: number;
  count: number;
  median: number;
}

export interface EnrichedDataPoint {
  // Original data
  month: string;
  value: number;
  transactionCount: number;
  // Computed fields
  year: number;
  monthIndex: number;  // 0-11
  date: Date;
  // Statistical context
  deviation: number;          // How many std devs from mean
  percentFromMean: number;    // % above/below mean
  rank: number;               // 1 = highest spending
  rankLabel: string;          // "1º maior", "5º menor"
  // Anomaly flags
  isAnomaly: boolean;
  isSpike: boolean;
  isDrop: boolean;
  isExtreme: boolean;
  anomalyType: 'spike' | 'drop' | 'extreme-spike' | 'extreme-drop' | null;
}

export interface TemporalAnnotation {
  month: string;
  label: string;
  description: string;
  type: 'recesso' | 'legislatura' | 'fiscal' | 'info';
  color: string;
}

export interface YearSummary {
  year: string;
  total: number;
  mean: number;
  count: number;
  growth: number | null;  // vs previous year
  peakMonth: { month: string; value: number };
  lowestMonth: { month: string; value: number };
}

// ============================================================================
// Core Statistical Functions
// ============================================================================

/**
 * Calculate basic statistics for a series of values
 */
export function calculateStats(values: number[]): TemporalStats {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0, min: 0, max: 0, total: 0, count: 0, median: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((sum, v) => sum + v, 0);
  const mean = total / values.length;

  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const median = values.length % 2 === 0
    ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
    : sorted[Math.floor(values.length / 2)];

  return {
    mean,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    total,
    count: values.length,
    median,
  };
}

/**
 * Calculate standard deviation using population formula
 */
export function standardDeviation(values: number[], mean?: number): number {
  if (values.length === 0) return 0;
  const avg = mean ?? values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Calculate how many standard deviations a value is from the mean
 */
export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

// ============================================================================
// Data Enrichment
// ============================================================================

/**
 * Parse month string (YYYY-MM) to components
 */
export function parseMonth(monthStr: string): { year: number; monthIndex: number; date: Date } {
  const [yearStr, monthNum] = monthStr.split('-');
  const year = parseInt(yearStr);
  const monthIndex = parseInt(monthNum) - 1;
  return {
    year,
    monthIndex,
    date: new Date(year, monthIndex, 1),
  };
}

/**
 * Enrich raw monthly data with statistical context
 */
export function enrichTemporalData(data: MonthlyData[]): EnrichedDataPoint[] {
  if (data.length === 0) return [];

  // Sort chronologically
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));

  // Calculate global stats
  const values = sorted.map(d => d.value);
  const stats = calculateStats(values);

  // Create value-to-rank mapping (1 = highest)
  const sortedByValue = [...sorted].sort((a, b) => b.value - a.value);
  const rankMap = new Map<string, number>();
  sortedByValue.forEach((d, i) => rankMap.set(d.month, i + 1));

  // Enrich each data point
  return sorted.map(d => {
    const { year, monthIndex, date } = parseMonth(d.month);
    const deviation = zScore(d.value, stats.mean, stats.stdDev);
    const percentFromMean = stats.mean > 0
      ? ((d.value - stats.mean) / stats.mean) * 100
      : 0;

    const rank = rankMap.get(d.month) || 0;
    const isTop = rank <= Math.ceil(sorted.length / 4);
    const isBottom = rank > Math.floor(sorted.length * 0.75);

    // Anomaly detection
    const isSpike = deviation >= TEMPORAL_CONFIG.anomaly.spike;
    const isDrop = deviation <= TEMPORAL_CONFIG.anomaly.drop;
    const isExtreme = Math.abs(deviation) >= TEMPORAL_CONFIG.anomaly.extreme;
    const isAnomaly = isSpike || isDrop;

    let anomalyType: EnrichedDataPoint['anomalyType'] = null;
    if (isExtreme && deviation > 0) anomalyType = 'extreme-spike';
    else if (isExtreme && deviation < 0) anomalyType = 'extreme-drop';
    else if (isSpike) anomalyType = 'spike';
    else if (isDrop) anomalyType = 'drop';

    // Generate rank label
    let rankLabel: string;
    if (isTop) {
      rankLabel = `${rank}º maior`;
    } else if (isBottom) {
      const fromBottom = sorted.length - rank + 1;
      rankLabel = `${fromBottom}º menor`;
    } else {
      rankLabel = `${rank}º de ${sorted.length}`;
    }

    return {
      month: d.month,
      value: d.value,
      transactionCount: d.transactionCount,
      year,
      monthIndex,
      date,
      deviation,
      percentFromMean,
      rank,
      rankLabel,
      isAnomaly,
      isSpike,
      isDrop,
      isExtreme,
      anomalyType,
    };
  });
}

// ============================================================================
// Year-over-Year Analysis
// ============================================================================

/**
 * Group data by year and calculate yearly summaries
 */
export function calculateYearSummaries(data: MonthlyData[]): YearSummary[] {
  const byYear: Record<string, MonthlyData[]> = {};

  data.forEach(d => {
    const year = d.month.split('-')[0];
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(d);
  });

  const years = Object.keys(byYear).sort();
  const summaries: YearSummary[] = [];

  years.forEach((year, idx) => {
    const yearData = byYear[year];
    const values = yearData.map(d => d.value);
    const total = values.reduce((sum, v) => sum + v, 0);
    const mean = total / values.length;

    // Find peak and lowest
    const sorted = [...yearData].sort((a, b) => b.value - a.value);
    const peakMonth = sorted[0];
    const lowestMonth = sorted[sorted.length - 1];

    // Calculate YoY growth
    let growth: number | null = null;
    if (idx > 0) {
      const prevYear = years[idx - 1];
      const prevTotal = byYear[prevYear].reduce((sum, d) => sum + d.value, 0);
      if (prevTotal > 0) {
        growth = ((total - prevTotal) / prevTotal) * 100;
      }
    }

    summaries.push({
      year,
      total,
      mean,
      count: yearData.length,
      growth,
      peakMonth: { month: peakMonth.month, value: peakMonth.value },
      lowestMonth: { month: lowestMonth.month, value: lowestMonth.value },
    });
  });

  return summaries;
}

// ============================================================================
// Contextual Annotations
// ============================================================================

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

/**
 * Generate contextual annotations for temporal data
 * These explain why certain patterns might exist
 */
export function generateAnnotations(data: MonthlyData[]): TemporalAnnotation[] {
  const annotations: TemporalAnnotation[] = [];
  const years = new Set(data.map(d => d.month.split('-')[0]));

  years.forEach(year => {
    // January - Recesso de Janeiro
    annotations.push({
      month: `${year}-01`,
      label: 'Recesso',
      description: 'Periodo de recesso parlamentar - gastos tipicamente menores',
      type: 'recesso',
      color: TEMPORAL_CONFIG.colors.annotation,
    });

    // July - Recesso de Julho
    annotations.push({
      month: `${year}-07`,
      label: 'Recesso',
      description: 'Periodo de recesso parlamentar - gastos tipicamente menores',
      type: 'recesso',
      color: TEMPORAL_CONFIG.colors.annotation,
    });

    // December - End of fiscal year
    annotations.push({
      month: `${year}-12`,
      label: 'Fim do Ano',
      description: 'Cota parlamentar nao acumula - incentivo a usar antes de "perder"',
      type: 'fiscal',
      color: TEMPORAL_CONFIG.colors.annotation,
    });

    // February - First full month
    if (parseInt(year) === 2023) {
      annotations.push({
        month: `${year}-02`,
        label: 'Nova Legislatura',
        description: 'Inicio da 57ª legislatura - novos parlamentares assumindo',
        type: 'legislatura',
        color: TEMPORAL_CONFIG.colors.annotation,
      });
    }
  });

  // Filter to only include months that exist in data
  const dataMonths = new Set(data.map(d => d.month));
  return annotations.filter(a => dataMonths.has(a.month));
}

/**
 * Check if a month has an annotation
 */
export function getAnnotationForMonth(
  month: string,
  annotations: TemporalAnnotation[]
): TemporalAnnotation | undefined {
  return annotations.find(a => a.month === month);
}

// ============================================================================
// Tooltip Formatters
// ============================================================================

/**
 * Format percentage with sign
 */
export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format deviation as human-readable text
 */
export function formatDeviation(deviation: number): string {
  const abs = Math.abs(deviation);
  if (abs < 0.5) return 'na media';
  if (abs < 1) return deviation > 0 ? 'levemente acima' : 'levemente abaixo';
  if (abs < 1.5) return deviation > 0 ? 'acima da media' : 'abaixo da media';
  if (abs < 2) return deviation > 0 ? 'bem acima da media' : 'bem abaixo da media';
  return deviation > 0 ? 'muito acima da media' : 'muito abaixo da media';
}

/**
 * Generate rich tooltip content for a data point
 */
export function generateTooltipContent(
  point: EnrichedDataPoint,
  formatCurrency: (value: number, compact?: boolean) => string,
  stats: TemporalStats,
  annotation?: TemporalAnnotation
): {
  title: string;
  value: string;
  comparison: string;
  ranking: string;
  deviation: string;
  annotation?: { label: string; description: string };
  anomaly?: { type: string; color: string };
} {
  const monthName = MONTH_NAMES[point.monthIndex];

  return {
    title: `${monthName} ${point.year}`,
    value: formatCurrency(point.value, false),
    comparison: `${formatPercent(point.percentFromMean)} vs media (${formatCurrency(stats.mean, true)})`,
    ranking: point.rankLabel,
    deviation: formatDeviation(point.deviation),
    annotation: annotation ? {
      label: annotation.label,
      description: annotation.description
    } : undefined,
    anomaly: point.isAnomaly ? {
      type: point.isSpike ? 'Pico atipico' : 'Queda atipica',
      color: point.isSpike ? TEMPORAL_CONFIG.colors.spike : TEMPORAL_CONFIG.colors.drop,
    } : undefined,
  };
}

// ============================================================================
// Band Calculations (for std dev visualization)
// ============================================================================

export interface StdDevBand {
  month: string;
  date: Date;
  mean: number;
  upper1: number;  // mean + 1σ
  lower1: number;  // mean - 1σ
  upper15: number; // mean + 1.5σ
  lower15: number; // mean - 1.5σ
}

/**
 * Calculate standard deviation bands for visualization
 */
export function calculateStdDevBands(data: MonthlyData[], stats: TemporalStats): StdDevBand[] {
  return data.map(d => {
    const { date } = parseMonth(d.month);
    return {
      month: d.month,
      date,
      mean: stats.mean,
      upper1: stats.mean + stats.stdDev,
      lower1: Math.max(0, stats.mean - stats.stdDev),
      upper15: stats.mean + stats.stdDev * 1.5,
      lower15: Math.max(0, stats.mean - stats.stdDev * 1.5),
    };
  });
}

// ============================================================================
// Month Name Utilities
// ============================================================================

export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex] || '';
}

export function getFullMonthName(monthIndex: number): string {
  const fullNames = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return fullNames[monthIndex] || '';
}

export function formatMonthYear(month: string): string {
  const { year, monthIndex } = parseMonth(month);
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

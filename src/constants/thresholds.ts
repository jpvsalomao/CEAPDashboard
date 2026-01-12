/**
 * Statistical thresholds and risk scoring constants for CEAP analysis.
 *
 * These thresholds are used across the dashboard and analysis pipeline.
 * Changes here should be reflected in:
 * - Python analysis scripts (analysis/lib/metrics.py)
 * - Data preparation (dashboard/scripts/prepare-data.py)
 * - Methodology documentation (dashboard/src/pages/Methodology.tsx)
 *
 * @see https://www.justice.gov/atr/herfindahl-hirschman-index for HHI reference
 * @see Benford's Law: https://en.wikipedia.org/wiki/Benford%27s_law
 */

import type { RiskLevel } from '../types/data';

// ============================================================================
// HHI (Herfindahl-Hirschman Index) Thresholds
// ============================================================================

/**
 * HHI measures supplier concentration. Range: 0 to 10,000.
 *
 * - 0: Perfect competition (many suppliers with equal shares)
 * - 10,000: Monopoly (single supplier has 100%)
 *
 * Based on US DOJ antitrust guidelines, adapted for CEAP analysis.
 */
export const HHI_THRESHOLDS = {
  /** Below this: Competitive market, low concentration risk */
  LOW: 1500,
  /** 1500-2500: Moderate concentration, warrants monitoring */
  MODERATE: 2500,
  /** 2500-3000: High concentration, significant risk */
  HIGH: 3000,
  /** Above 5000: Very high concentration, near-monopoly conditions */
  VERY_HIGH: 5000,
} as const;

/**
 * Map HHI value to risk level label.
 */
export function getHHIRiskLevel(hhi: number): RiskLevel {
  if (hhi > HHI_THRESHOLDS.HIGH) return 'CRITICO';
  if (hhi > HHI_THRESHOLDS.MODERATE) return 'ALTO';
  if (hhi > HHI_THRESHOLDS.LOW) return 'MEDIO';
  return 'BAIXO';
}

// ============================================================================
// Benford's Law Thresholds
// ============================================================================

/**
 * Chi-squared critical values for Benford's Law test.
 *
 * With 8 degrees of freedom (digits 1-9, df = 9-1 = 8):
 * - 15.51: p = 0.05 (95% confidence)
 * - 20.09: p = 0.01 (99% confidence)
 *
 * A chi-squared value above these thresholds suggests the distribution
 * of first digits deviates significantly from Benford's Law.
 */
export const BENFORD_THRESHOLDS = {
  /** Chi-squared critical value for p < 0.05 */
  CHI2_CRITICAL_005: 15.51,
  /** Chi-squared critical value for p < 0.01 */
  CHI2_CRITICAL_001: 20.09,
  /** Degrees of freedom for 9 digits (1-9) */
  DEGREES_OF_FREEDOM: 8,
  /** Minimum transactions required for reliable Benford analysis */
  MIN_TRANSACTIONS: 50,
} as const;

/**
 * Expected frequency of each first digit according to Benford's Law.
 * P(d) = log10(1 + 1/d)
 */
export const BENFORD_EXPECTED_FREQUENCIES = {
  1: 0.301,
  2: 0.176,
  3: 0.125,
  4: 0.097,
  5: 0.079,
  6: 0.067,
  7: 0.058,
  8: 0.051,
  9: 0.046,
} as const;

// ============================================================================
// Round Value Detection Thresholds
// ============================================================================

/**
 * Thresholds for detecting suspiciously round expense values.
 *
 * While some round values are normal (monthly rent, fixed contracts),
 * a high percentage may indicate fabricated expenses.
 */
export const ROUND_VALUE_THRESHOLDS = {
  /** Below this percentage: Normal, no concern */
  NORMAL_PERCENT: 15,
  /** 15-20%: Elevated, worth monitoring */
  ELEVATED_PERCENT: 20,
  /** 20-30%: High, potential red flag */
  HIGH_PERCENT: 30,
  /** Above 30%: Very high, strong indicator of anomaly */
  VERY_HIGH_PERCENT: 30,
} as const;

// ============================================================================
// Risk Score Calculation
// ============================================================================

/**
 * Base risk scores by HHI level.
 *
 * The risk score is a composite metric (0.0 to 1.0) combining:
 * - HHI concentration (base score)
 * - Benford deviation (additive penalty)
 * - Round value percentage (additive penalty)
 */
export const RISK_SCORE_BASE = {
  CRITICO: 0.9,
  ALTO: 0.7,
  MEDIO: 0.4,
  BAIXO: 0.2,
} as const;

/**
 * Additive penalties for risk score calculation.
 */
export const RISK_SCORE_PENALTIES = {
  /** Added if Benford test is significant (p < 0.05) */
  BENFORD_SIGNIFICANT: 0.15,
  /** Added if round value percentage exceeds ROUND_VALUE_THRESHOLDS.ELEVATED_PERCENT */
  ROUND_VALUES_HIGH: 0.10,
} as const;

/**
 * Maximum risk score (capped at 1.0).
 */
export const RISK_SCORE_MAX = 1.0;

/**
 * Calculate composite risk score from individual metrics.
 */
export function calculateRiskScore(
  hhi: number,
  benfordSignificant: boolean,
  roundValuePct: number
): number {
  // Base score from HHI
  let score: number;
  if (hhi > HHI_THRESHOLDS.HIGH) {
    score = RISK_SCORE_BASE.CRITICO;
  } else if (hhi > HHI_THRESHOLDS.MODERATE) {
    score = RISK_SCORE_BASE.ALTO;
  } else if (hhi > HHI_THRESHOLDS.LOW) {
    score = RISK_SCORE_BASE.MEDIO;
  } else {
    score = RISK_SCORE_BASE.BAIXO;
  }

  // Add penalties
  if (benfordSignificant) {
    score += RISK_SCORE_PENALTIES.BENFORD_SIGNIFICANT;
  }

  if (roundValuePct > ROUND_VALUE_THRESHOLDS.ELEVATED_PERCENT) {
    score += RISK_SCORE_PENALTIES.ROUND_VALUES_HIGH;
  }

  // Cap at maximum
  return Math.min(score, RISK_SCORE_MAX);
}

// ============================================================================
// Display Colors for Risk Levels
// ============================================================================

export const RISK_LEVEL_COLORS = {
  CRITICO: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500',
    hex: '#ef4444',
  },
  ALTO: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500',
    hex: '#f97316',
  },
  MEDIO: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500',
    hex: '#eab308',
  },
  BAIXO: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500',
    hex: '#22c55e',
  },
} as const;

// ============================================================================
// Expense Categories
// ============================================================================

/**
 * CEAP expense category codes and descriptions.
 * Source: Dados Abertos da Camara dos Deputados
 */
export const EXPENSE_CATEGORIES = {
  1: 'MANUTENCAO DE ESCRITORIO DE APOIO A ATIVIDADE PARLAMENTAR',
  2: 'LOCACAO OU FRETAMENTO DE AERONAVES',
  3: 'COMBUSTIVEIS E LUBRIFICANTES',
  4: 'CONSULTORIAS, PESQUISAS E TRABALHOS TECNICOS',
  5: 'DIVULGACAO DA ATIVIDADE PARLAMENTAR',
  6: 'PASSAGEM AEREA - REEMBOLSO',
  7: 'PASSAGEM AEREA - RPA',
  8: 'PASSAGEM AEREA - SIGEPA',
  9: 'PASSAGENS TERRESTRES, MARITIMAS OU FLUVIAIS',
  10: 'SERVICO DE SEGURANCA PRESTADO POR EMPRESA ESPECIALIZADA',
  11: 'TELEFONIA',
  12: 'SERVICOS POSTAIS',
  13: 'ASSINATURA DE PUBLICACOES',
  14: 'FORNECIMENTO DE ALIMENTACAO DO PARLAMENTAR',
  15: 'HOSPEDAGEM, EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL',
  119: 'LOCACAO OU FRETAMENTO DE EMBARCACOES',
  120: 'LOCACAO OU FRETAMENTO DE VEICULOS AUTOMOTORES',
  121: 'LOCACAO DE VEICULOS AUTOMOTORES OU FRETAMENTO DE EMBARCACOES',
  122: 'SERVICO DE TAXI, PEDAGIO E ESTACIONAMENTO',
  123: 'PARTICIPACAO EM CURSO, PALESTRA, SEMINARIO, SIMPOSIO, CONGRESSO OU EVENTO CONGENERE',
} as const;

/**
 * Get category name by code.
 */
export function getCategoryName(code: number): string {
  return EXPENSE_CATEGORIES[code as keyof typeof EXPENSE_CATEGORIES] || `Categoria ${code}`;
}

// Risk scoring thresholds and weights
// These values must match the Python prepare-data.py script

export const RISK_SCORING = {
  // Base score from HHI concentration
  baseWeights: {
    hhi_critical: 0.9,  // HHI > 3000
    hhi_high: 0.7,      // HHI > 2500
    hhi_moderate: 0.4,  // HHI > 1500
    hhi_low: 0.2,       // HHI <= 1500
  },

  // Additive penalties
  penalties: {
    benford_significant: 0.15,
    round_values_above_20pct: 0.10,
    top_supplier_above_50pct: 0.10,
    zscore_party_above_2std: 0.08,
    zscore_state_above_2std: 0.08,
  },

  // Risk level thresholds
  levels: {
    critico: 0.75,
    alto: 0.55,
    medio: 0.35,
    baixo: 0.0,
  },

  maxScore: 1.0,
} as const;

export const HHI_THRESHOLDS = {
  low: 1500,
  moderate: 2500,
  high: 3000,
  very_high: 5000,
} as const;

export const BENFORD_THRESHOLDS = {
  chi2_critical_001: 20.09,
  chi2_critical_005: 15.51,
  degrees_of_freedom: 8,
} as const;

// Z-score threshold for outlier detection
export const ZSCORE_THRESHOLD = 2.0;

// Get risk level label from score
export function getRiskLevelFromScore(score: number): 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO' {
  if (score >= RISK_SCORING.levels.critico) return 'CRITICO';
  if (score >= RISK_SCORING.levels.alto) return 'ALTO';
  if (score >= RISK_SCORING.levels.medio) return 'MEDIO';
  return 'BAIXO';
}

// Get HHI level label
export function getHHILevel(hhi: number): 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO' {
  if (hhi >= HHI_THRESHOLDS.high) return 'CRITICO';
  if (hhi >= HHI_THRESHOLDS.moderate) return 'ALTO';
  if (hhi >= HHI_THRESHOLDS.low) return 'MEDIO';
  return 'BAIXO';
}

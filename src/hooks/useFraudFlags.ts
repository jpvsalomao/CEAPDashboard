import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { FraudFlag, CNPJMismatch } from '../types/data';

async function fetchFraudFlags(): Promise<FraudFlag[]> {
  const response = await fetch('/data/fraud-flags.json');
  if (!response.ok) {
    throw new Error('Failed to fetch fraud flags');
  }
  return response.json();
}

async function fetchMismatches(): Promise<CNPJMismatch[]> {
  const response = await fetch('/data/mismatches.json');
  if (!response.ok) {
    throw new Error('Failed to fetch mismatches');
  }
  return response.json();
}

export function useFraudFlags() {
  return useQuery({
    queryKey: ['fraud-flags'],
    queryFn: fetchFraudFlags,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useMismatches() {
  return useQuery({
    queryKey: ['mismatches'],
    queryFn: fetchMismatches,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

// Aggregate Benford's Law data from fraud flags
export function useBenfordAnalysis() {
  const { data: fraudFlags = [] } = useFraudFlags();

  return useMemo(() => {
    // Expected Benford distribution
    const expectedBenford = [
      { digit: 1, expected: 30.1 },
      { digit: 2, expected: 17.6 },
      { digit: 3, expected: 12.5 },
      { digit: 4, expected: 9.7 },
      { digit: 5, expected: 7.9 },
      { digit: 6, expected: 6.7 },
      { digit: 7, expected: 5.8 },
      { digit: 8, expected: 5.1 },
      { digit: 9, expected: 4.6 },
    ];

    // Aggregate chi2 values and deviations
    const withDeviations = fraudFlags.filter((f) => f.details?.benfordDeviation);
    const avgChi2 = fraudFlags.length > 0
      ? fraudFlags.reduce((sum, f) => sum + (f.details?.benfordChi2 ?? 0), 0) / fraudFlags.length
      : 0;

    return {
      expectedBenford,
      deviationCount: withDeviations.length,
      totalCount: fraudFlags.length,
      avgChi2,
      topDeviations: [...fraudFlags]
        .sort((a, b) => (b.details?.benfordChi2 ?? 0) - (a.details?.benfordChi2 ?? 0))
        .slice(0, 10),
    };
  }, [fraudFlags]);
}

// Risk level statistics
export function useRiskStats() {
  const { data: fraudFlags = [] } = useFraudFlags();

  return useMemo(() => {
    const byRiskLevel = {
      CRITICO: fraudFlags.filter((f) => f.riskLevel === 'CRITICO'),
      ALTO: fraudFlags.filter((f) => f.riskLevel === 'ALTO'),
      MEDIO: fraudFlags.filter((f) => f.riskLevel === 'MEDIO'),
      BAIXO: fraudFlags.filter((f) => f.riskLevel === 'BAIXO'),
    };

    const avgRiskScore = fraudFlags.length > 0
      ? fraudFlags.reduce((sum, f) => sum + f.riskScore, 0) / fraudFlags.length
      : 0;

    return {
      byRiskLevel,
      avgRiskScore,
      total: fraudFlags.length,
    };
  }, [fraudFlags]);
}

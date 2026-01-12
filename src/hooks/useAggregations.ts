import { useQuery } from '@tanstack/react-query';
import type { Aggregations } from '../types/data';

async function fetchAggregations(): Promise<Aggregations> {
  const response = await fetch('/data/aggregations.json');
  if (!response.ok) {
    throw new Error('Failed to fetch aggregations');
  }
  return response.json();
}

export function useAggregations() {
  return useQuery({
    queryKey: ['aggregations'],
    queryFn: fetchAggregations,
    staleTime: Infinity, // Static data, never refetch
    gcTime: Infinity,
  });
}

// Derived hooks for specific data slices
export function useTotalSpending() {
  const { data } = useAggregations();
  return data?.meta.totalSpending ?? 0;
}

export function useTotalTransactions() {
  const { data } = useAggregations();
  return data?.meta.totalTransactions ?? 0;
}

export function useTotalDeputies() {
  const { data } = useAggregations();
  return data?.meta.totalDeputies ?? 0;
}

export function useMonthlyData() {
  const { data } = useAggregations();
  return data?.byMonth ?? [];
}

export function useCategoryData() {
  const { data } = useAggregations();
  return data?.byCategory ?? [];
}

export function usePartyData() {
  const { data } = useAggregations();
  return data?.byParty ?? [];
}

export function useStateData() {
  const { data } = useAggregations();
  return data?.byState ?? [];
}

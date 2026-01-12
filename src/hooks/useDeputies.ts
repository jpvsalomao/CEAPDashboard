import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Deputy, CategoryData, PartyData, StateData, MonthlyData, Aggregations } from '../types/data';
import { useFiltersStore } from '../store/filters';

// Fetch original aggregations for totalSuppliers
async function fetchAggregations(): Promise<Aggregations> {
  const response = await fetch('/data/aggregations.json');
  if (!response.ok) throw new Error('Failed to fetch aggregations');
  return response.json();
}

async function fetchDeputies(): Promise<Deputy[]> {
  const response = await fetch('/data/deputies.json');
  if (!response.ok) {
    throw new Error('Failed to fetch deputies');
  }
  return response.json();
}

export function useDeputies() {
  return useQuery({
    queryKey: ['deputies'],
    queryFn: fetchDeputies,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Check if deputy has data in current mandato (2024 or 2025)
 * Deputies who only have 2023 data ended their mandato and should be excluded
 */
function hasCurrentMandatoData(deputy: Deputy): boolean {
  // If byMonth data exists, check for 2024/2025 entries
  if (deputy.byMonth && deputy.byMonth.length > 0) {
    return deputy.byMonth.some(m => {
      const year = parseInt(m.month.split('-')[0], 10);
      return year >= 2024;
    });
  }

  // No monthly data available - exclude to be safe
  // (Data should always have byMonth now that prepare-data.py is fixed)
  return false;
}

/**
 * Base hook that returns only current mandato deputies (2024-2025)
 * Excludes deputies who ended their mandato in 2023
 */
export function useCurrentMandatoDeputies() {
  const { data: deputies = [], ...rest } = useDeputies();

  const filtered = useMemo(() => {
    return deputies.filter(d =>
      !d.name.includes('LIDERANCA') && hasCurrentMandatoData(d)
    );
  }, [deputies]);

  return { data: filtered, ...rest };
}

export function useFilteredDeputies() {
  const { data: deputies = [], ...rest } = useCurrentMandatoDeputies();
  const { states, parties, riskLevels, categories, searchQuery, years } = useFiltersStore();

  const filtered = useMemo(() => {
    let result = deputies;

    // Filter by state
    if (states.length > 0) {
      result = result.filter((d) => states.includes(d.uf));
    }

    // Filter by party
    if (parties.length > 0) {
      result = result.filter((d) => parties.includes(d.party));
    }

    // Filter by risk level
    if (riskLevels.length > 0) {
      result = result.filter((d) => riskLevels.includes(d.riskLevel));
    }

    // Filter by year (check if deputy has data in selected years)
    if (years.length > 0) {
      result = result.filter((d) => {
        if (!d.byMonth || d.byMonth.length === 0) return true;
        return d.byMonth.some(m => {
          const year = parseInt(m.month.split('-')[0], 10);
          return years.includes(year);
        });
      });
    }

    // Filter by category (check if deputy has spending in selected categories)
    if (categories.length > 0) {
      result = result.filter((d) => {
        if (!d.byCategory || d.byCategory.length === 0) return true;
        return d.byCategory.some(c => categories.includes(c.category));
      });
    }

    // Filter by search query (only for Deputies page, not Overview)
    if (searchQuery.length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.party.toLowerCase().includes(query) ||
          d.uf.toLowerCase().includes(query)
      );
    }

    // IMPORTANT: Recalculate spending values when year/category filters are active
    // This ensures charts like TopSpenders show filtered spending, not total lifetime spending
    const needsRecalculation = years.length > 0 || categories.length > 0;

    if (needsRecalculation) {
      result = result.map(d => {
        let filteredSpending = d.totalSpending;
        let filteredTransactions = d.transactionCount;
        let filteredAvgTicket = d.avgTicket;

        // Recalculate based on year filter
        if (years.length > 0 && d.byMonth && d.byMonth.length > 0) {
          const filteredMonths = d.byMonth.filter(m => {
            const monthYear = parseInt(m.month.split('-')[0], 10);
            return years.includes(monthYear);
          });
          filteredSpending = filteredMonths.reduce((sum, m) => sum + m.value, 0);
          filteredTransactions = filteredMonths.reduce((sum, m) => sum + m.transactionCount, 0);
        }

        // Recalculate based on category filter (takes precedence if both are set)
        if (categories.length > 0 && d.byCategory && d.byCategory.length > 0) {
          const filteredCats = d.byCategory.filter(c => categories.includes(c.category));
          filteredSpending = filteredCats.reduce((sum, c) => sum + c.value, 0);
          filteredTransactions = filteredCats.reduce((sum, c) => sum + c.transactionCount, 0);
        }

        // Recalculate average ticket
        filteredAvgTicket = filteredTransactions > 0 ? filteredSpending / filteredTransactions : 0;

        // Return deputy with recalculated values
        return {
          ...d,
          totalSpending: filteredSpending,
          transactionCount: filteredTransactions,
          avgTicket: filteredAvgTicket,
        };
      });

      // Filter out deputies with zero spending after recalculation
      result = result.filter(d => d.totalSpending > 0);
    }

    return result;
  }, [deputies, states, parties, riskLevels, categories, searchQuery, years]);

  return { data: filtered, ...rest };
}

/**
 * Hook that computes aggregations from filtered deputies
 * This ensures all charts respect the active filters
 */
export function useFilteredAggregations() {
  const { data: deputies = [], isLoading } = useFilteredDeputies();
  const { years, states, parties, riskLevels, categories } = useFiltersStore();
  // Check if any filter is active
  const hasAnyFilters = states.length > 0 || parties.length > 0 || riskLevels.length > 0 || years.length > 0 || categories.length > 0;

  // Fetch original aggregations for totalSuppliers
  const { data: originalAggregations } = useQuery({
    queryKey: ['aggregations'],
    queryFn: fetchAggregations,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const aggregations = useMemo(() => {
    if (deputies.length === 0) {
      return {
        meta: {
          totalTransactions: 0,
          totalSpending: 0,
          totalDeputies: 0,
          totalSuppliers: 0,
          period: { start: '', end: '' },
          lastUpdated: new Date().toISOString(),
        },
        byMonth: [] as MonthlyData[],
        byCategory: [] as CategoryData[],
        byParty: [] as PartyData[],
        byState: [] as StateData[],
      };
    }

    // Helper to get filtered spending/transactions for a deputy based on year/category filters
    const getFilteredDeputyData = (d: Deputy) => {
      let spending = d.totalSpending;
      let transactions = d.transactionCount;

      // If year filter is active, calculate from byMonth data
      if (years.length > 0 && d.byMonth && d.byMonth.length > 0) {
        const filteredMonths = d.byMonth.filter(m => {
          const monthYear = parseInt(m.month.split('-')[0], 10);
          return years.includes(monthYear);
        });
        spending = filteredMonths.reduce((sum, m) => sum + m.value, 0);
        transactions = filteredMonths.reduce((sum, m) => sum + m.transactionCount, 0);
      }

      // If category filter is active, calculate from byCategory data
      if (categories.length > 0 && d.byCategory && d.byCategory.length > 0) {
        const filteredCats = d.byCategory.filter(c => categories.includes(c.category));
        spending = filteredCats.reduce((sum, c) => sum + c.value, 0);
        transactions = filteredCats.reduce((sum, c) => sum + c.transactionCount, 0);
      }

      return { spending, transactions };
    };

    // Calculate totals using filtered data
    let totalSpending = 0;
    let totalTransactions = 0;
    deputies.forEach(d => {
      const { spending, transactions } = getFilteredDeputyData(d);
      totalSpending += spending;
      totalTransactions += transactions;
    });

    // Compute unique suppliers from supplierCnpjs arrays (accurate count even with filters)
    // When no filters, use original aggregations; with filters, compute from filtered deputies
    let totalSuppliers: number;
    if (!hasAnyFilters && originalAggregations?.meta?.totalSuppliers) {
      totalSuppliers = originalAggregations.meta.totalSuppliers;
    } else {
      // Collect all unique supplier CNPJs from filtered deputies
      const allCnpjs = new Set<string>();
      deputies.forEach(d => {
        if (d.supplierCnpjs && Array.isArray(d.supplierCnpjs)) {
          d.supplierCnpjs.forEach(cnpj => allCnpjs.add(cnpj));
        }
      });
      // If supplierCnpjs data available, use unique count; otherwise fallback to sum
      totalSuppliers = allCnpjs.size > 0
        ? allCnpjs.size
        : deputies.reduce((sum, d) => sum + (d.supplierCount || 0), 0);
    }

    // Calculate byParty using filtered data
    const partyMap = new Map<string, { value: number; deputyCount: number }>();
    deputies.forEach(d => {
      const { spending } = getFilteredDeputyData(d);
      const existing = partyMap.get(d.party) || { value: 0, deputyCount: 0 };
      partyMap.set(d.party, {
        value: existing.value + spending,
        deputyCount: existing.deputyCount + 1,
      });
    });
    const byParty: PartyData[] = Array.from(partyMap.entries())
      .map(([party, data]) => ({
        party,
        value: data.value,
        deputyCount: data.deputyCount,
        avgPerDeputy: data.value / data.deputyCount,
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate byState using filtered data
    const stateMap = new Map<string, { value: number; deputyCount: number }>();
    deputies.forEach(d => {
      const { spending } = getFilteredDeputyData(d);
      const existing = stateMap.get(d.uf) || { value: 0, deputyCount: 0 };
      stateMap.set(d.uf, {
        value: existing.value + spending,
        deputyCount: existing.deputyCount + 1,
      });
    });
    const byState: StateData[] = Array.from(stateMap.entries())
      .map(([uf, data]) => ({
        uf,
        value: data.value,
        deputyCount: data.deputyCount,
        avgPerDeputy: data.value / data.deputyCount,
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate byCategory from deputy category breakdowns (filtered by category selection)
    const categoryMap = new Map<string, { value: number; transactionCount: number }>();
    deputies.forEach(d => {
      d.byCategory?.forEach(cat => {
        // If category filter is active, only include selected categories
        if (categories.length > 0 && !categories.includes(cat.category)) return;
        const existing = categoryMap.get(cat.category) || { value: 0, transactionCount: 0 };
        categoryMap.set(cat.category, {
          value: existing.value + cat.value,
          transactionCount: existing.transactionCount + cat.transactionCount,
        });
      });
    });
    const totalCategoryValue = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.value, 0);
    const byCategory: CategoryData[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        categoryCode: 0, // Not needed for display
        value: data.value,
        pct: totalCategoryValue > 0 ? (data.value / totalCategoryValue) * 100 : 0,
        transactionCount: data.transactionCount,
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate byMonth from deputy monthly breakdowns (filtered by year)
    const monthMap = new Map<string, { value: number; transactionCount: number }>();
    deputies.forEach(d => {
      d.byMonth?.forEach(month => {
        // If year filter is active, only include matching months
        if (years.length > 0) {
          const monthYear = parseInt(month.month.split('-')[0], 10);
          if (!years.includes(monthYear)) return;
        }
        const existing = monthMap.get(month.month) || { value: 0, transactionCount: 0 };
        monthMap.set(month.month, {
          value: existing.value + month.value,
          transactionCount: existing.transactionCount + month.transactionCount,
        });
      });
    });
    const byMonth: MonthlyData[] = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        value: data.value,
        transactionCount: data.transactionCount,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Get period from months
    const period = {
      start: byMonth[0]?.month || '',
      end: byMonth[byMonth.length - 1]?.month || '',
    };

    return {
      meta: {
        totalTransactions,
        totalSpending,
        totalDeputies: deputies.length,
        totalSuppliers,
        period,
        lastUpdated: new Date().toISOString(),
      },
      byMonth,
      byCategory,
      byParty,
      byState,
    };
  }, [deputies, years, categories, hasAnyFilters, originalAggregations]);

  return { data: aggregations, isLoading };
}

export function useDeputyById(id: number) {
  const { data: deputies = [] } = useDeputies();
  return deputies.find((d) => d.id === id);
}

export function useTopDeputies(limit = 10) {
  const { data: deputies = [] } = useFilteredDeputies();

  return useMemo(() => {
    return [...deputies]
      .sort((a, b) => b.totalSpending - a.totalSpending)
      .slice(0, limit);
  }, [deputies, limit]);
}

export function useCriticalCases() {
  const { data: deputies = [] } = useFilteredDeputies();

  return useMemo(() => {
    return deputies
      .filter((d) => d.riskLevel === 'CRITICO')
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [deputies]);
}

export function useDeputyStats() {
  const { data: deputies = [] } = useFilteredDeputies();

  return useMemo(() => {
    if (deputies.length === 0) {
      return {
        total: 0,
        avgSpending: 0,
        avgHHI: 0,
        criticalCount: 0,
        highRiskCount: 0,
      };
    }

    const totalSpending = deputies.reduce((sum, d) => sum + d.totalSpending, 0);
    const totalHHI = deputies.reduce((sum, d) => sum + d.hhi.value, 0);

    return {
      total: deputies.length,
      avgSpending: totalSpending / deputies.length,
      avgHHI: totalHHI / deputies.length,
      criticalCount: deputies.filter((d) => d.riskLevel === 'CRITICO').length,
      highRiskCount: deputies.filter((d) => d.riskLevel === 'ALTO').length,
    };
  }, [deputies]);
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilterState, RiskLevel } from '../types/data';

interface FiltersStore extends FilterState {
  // Actions
  setYears: (years: number[]) => void;
  toggleYear: (year: number) => void;
  setStates: (states: string[]) => void;
  toggleState: (state: string) => void;
  setParties: (parties: string[]) => void;
  toggleParty: (party: string) => void;
  setCategories: (categories: string[]) => void;
  toggleCategory: (category: string) => void;
  setRiskLevels: (levels: RiskLevel[]) => void;
  toggleRiskLevel: (level: RiskLevel) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;
}

const initialState: FilterState = {
  years: [],
  states: [],
  parties: [],
  categories: [],
  riskLevels: [],
  searchQuery: '',
};

export const useFiltersStore = create<FiltersStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setYears: (years) => set({ years }),

      toggleYear: (year) => set((state) => ({
        years: state.years.includes(year)
          ? state.years.filter((y) => y !== year)
          : [...state.years, year],
      })),

      setStates: (states) => set({ states }),

      toggleState: (stateCode) => set((state) => ({
        states: state.states.includes(stateCode)
          ? state.states.filter((s) => s !== stateCode)
          : [...state.states, stateCode],
      })),

      setParties: (parties) => set({ parties }),

      toggleParty: (party) => set((state) => ({
        parties: state.parties.includes(party)
          ? state.parties.filter((p) => p !== party)
          : [...state.parties, party],
      })),

      setCategories: (categories) => set({ categories }),

      toggleCategory: (category) => set((state) => ({
        categories: state.categories.includes(category)
          ? state.categories.filter((c) => c !== category)
          : [...state.categories, category],
      })),

      setRiskLevels: (riskLevels) => set({ riskLevels }),

      toggleRiskLevel: (level) => set((state) => ({
        riskLevels: state.riskLevels.includes(level)
          ? state.riskLevels.filter((l) => l !== level)
          : [...state.riskLevels, level],
      })),

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      clearFilters: () => set(initialState),

      hasActiveFilters: () => {
        const state = get();
        return (
          state.years.length > 0 ||
          state.states.length > 0 ||
          state.parties.length > 0 ||
          state.categories.length > 0 ||
          state.riskLevels.length > 0 ||
          state.searchQuery.length > 0
        );
      },
    }),
    {
      name: 'ceap-filters',
      partialize: (state) => ({
        years: state.years,
        states: state.states,
        parties: state.parties,
        categories: state.categories,
        riskLevels: state.riskLevels,
      }),
    }
  )
);

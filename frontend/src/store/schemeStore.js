import { create } from 'zustand'

export const useSchemeStore = create((set) => ({
  allSchemes: [],
  eligibleSchemes: [],
  partialSchemes: [],
  filteredSchemes: [],
  selectedScheme: null,
  isLoading: false,

  setAllSchemes: (schemes) => set({ allSchemes: schemes }),
  setEligibleSchemes: (schemes) => set({ eligibleSchemes: schemes }),
  setPartialSchemes: (schemes) => set({ partialSchemes: schemes }),
  setFilteredSchemes: (schemes) => set({ filteredSchemes: schemes }),
  setSelectedScheme: (scheme) => set({ selectedScheme: scheme }),
  setLoading: (isLoading) => set({ isLoading }),
}))

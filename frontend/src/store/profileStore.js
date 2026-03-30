import { create } from 'zustand'

export const useProfileStore = create((set) => ({
  profile: null,
  completeness: 0,
  isLoading: false,

  setProfile: (profile) => set({ profile }),
  setCompleteness: (completeness) => set({ completeness }),
  setLoading: (isLoading) => set({ isLoading }),
}))

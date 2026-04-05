/**
 * Application store - State management for saved applications
 */
import { create } from 'zustand'

export const useApplicationStore = create((set) => ({
  // State
  applications: [],
  savedApplicationIds: new Set(),
  stats: {
    total_saved: 0,
    total_started: 0,
    total_submitted: 0,
    total_acknowledged: 0,
    total_rejected: 0,
    total_benefit_value: 0,
  },
  loading: false,
  filter: 'all', // all, saved, started, submitted, acknowledged, rejected

  // Actions
  setSavedApplicationIds: (ids) =>
    set({
      savedApplicationIds: new Set(
        (ids || []).map((entry) => (typeof entry === 'string' ? entry : entry?.scheme_id || entry?.id)).filter(Boolean)
      ),
    }),

  isSaved: (schemeId) => {
    const state = useApplicationStore.getState()
    return state.savedApplicationIds.has(schemeId)
  },

  setApplications: (applications) =>
    set({ applications }),

  setStats: (stats) =>
    set({ stats }),

  addApplication: (application) =>
    set((state) => ({
      applications: [application, ...state.applications],
      savedApplicationIds: new Set([
        ...Array.from(state.savedApplicationIds),
        application.scheme_id,
      ]),
    })),

  updateApplication: (applicationId, updates) =>
    set((state) => ({
      applications: state.applications.map((app) =>
        app.id === applicationId ? { ...app, ...updates } : app
      ),
    })),

  removeApplication: (applicationId) =>
    set((state) => ({
      applications: state.applications.filter((app) => app.id !== applicationId),
      savedApplicationIds: new Set(
        state.applications
          .filter((app) => app.id !== applicationId)
          .map((app) => app.scheme_id)
          .filter(Boolean)
      ),
    })),

  setFilter: (filter) =>
    set({ filter }),

  setLoading: (loading) =>
    set({ loading }),

  reset: () =>
    set({
      applications: [],
      savedApplicationIds: new Set(),
      stats: {
        total_saved: 0,
        total_started: 0,
        total_submitted: 0,
        total_acknowledged: 0,
        total_rejected: 0,
        total_benefit_value: 0,
      },
      filter: 'all',
    }),
}))

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const isValidToken = (value) =>
  typeof value === 'string' && value.trim().length > 0 && value !== 'undefined' && value !== 'null'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      userRole: null,
      userId: null,

      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken, userRole = null, userId = null, onboardingIncomplete = null) => {
        const normalizedAccessToken = isValidToken(accessToken) ? accessToken : null
        const normalizedRefreshToken = isValidToken(refreshToken) ? refreshToken : null

        if (!normalizedAccessToken || !normalizedRefreshToken) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user_role')
          localStorage.removeItem('user_id')
          localStorage.removeItem('onboarding_incomplete')
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, userRole: null, userId: null })
          return
        }

        localStorage.setItem('access_token', normalizedAccessToken)
        localStorage.setItem('refresh_token', normalizedRefreshToken)
        if (userRole) {
          localStorage.setItem('user_role', userRole)
        } else {
          localStorage.removeItem('user_role')
        }
        if (userId) {
          localStorage.setItem('user_id', userId)
        } else {
          localStorage.removeItem('user_id')
        }
        if (onboardingIncomplete === null || onboardingIncomplete === undefined) {
          localStorage.removeItem('onboarding_incomplete')
        } else {
          localStorage.setItem('onboarding_incomplete', String(Boolean(onboardingIncomplete)))
        }
        localStorage.setItem('last_auth_success_at', String(Date.now()))
        set({ 
          accessToken: normalizedAccessToken,
          refreshToken: normalizedRefreshToken,
          isAuthenticated: true,
          userRole: userRole || localStorage.getItem('user_role'),
          userId: userId || localStorage.getItem('user_id')
        })
      },
      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_role')
        localStorage.removeItem('user_id')
        localStorage.removeItem('onboarding_incomplete')
        localStorage.removeItem('last_auth_success_at')
        localStorage.removeItem('user')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, userRole: null, userId: null })
      },
      setUserRole: (role) => {
        localStorage.setItem('user_role', role)
        set({ userRole: role })
      }
    }),
    { name: 'auth-storage', skipHydration: true }
  )
)

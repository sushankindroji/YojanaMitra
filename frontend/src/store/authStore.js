import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      setTokens: (accessToken, refreshToken, userRole = null, userId = null) => {
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
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
        set({ 
          accessToken, 
          refreshToken, 
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

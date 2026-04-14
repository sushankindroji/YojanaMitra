import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useState } from 'react'

const isValidToken = (value) =>
  typeof value === 'string' && value.trim().length > 0 && value !== 'undefined' && value !== 'null'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const setTokens = useAuthStore((state) => state.setTokens)
  const [isLoading, setIsLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const token = accessToken || localStorage.getItem('access_token')
    const storedRefreshToken = refreshToken || localStorage.getItem('refresh_token')
    const userRole = localStorage.getItem('user_role')
    const userId = localStorage.getItem('user_id')
    const onboardingIncomplete = localStorage.getItem('onboarding_incomplete')

    if (isValidToken(token) && isValidToken(storedRefreshToken)) {
      setTokens(
        token,
        storedRefreshToken,
        userRole,
        userId,
        onboardingIncomplete === null ? null : onboardingIncomplete === 'true'
      )
      setHasSession(true)
    } else {
      setHasSession(false)
    }

    setIsLoading(false)
  }, [accessToken, refreshToken, setTokens])

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return hasSession
    ? children
    : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}

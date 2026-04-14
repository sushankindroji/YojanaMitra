// frontend/src/components/common/ProtectedAdminRoute.jsx
/**
 * ProtectedAdminRoute - Route protection for admin-only pages
 * Checks if user is authenticated AND has admin role
 * Uses stored role when available and falls back to /auth/me for stale sessions
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useMemo, useState } from 'react'
import authService from '../../services/authService'
import LoadingSpinner from './LoadingSpinner'

const isValidToken = (value) =>
  typeof value === 'string' && value.trim().length > 0 && value !== 'undefined' && value !== 'null'

function getRoleFromStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.role || null
  } catch {
    return null
  }
}

export default function ProtectedAdminRoute({ children }) {
  const location = useLocation()
  const token = useAuthStore((state) => state.accessToken)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const userRole = useAuthStore((state) => state.userRole)
  const setUserRole = useAuthStore((state) => state.setUserRole)
  const setTokens = useAuthStore((state) => state.setTokens)
  const [isHydratingToken, setIsHydratingToken] = useState(true)
  const [hasStoredToken, setHasStoredToken] = useState(false)
  const [isCheckingRole, setIsCheckingRole] = useState(false)

  useEffect(() => {
    const storedAccessToken = localStorage.getItem('access_token')
    const storedRefreshToken = localStorage.getItem('refresh_token')
    const storedRole = localStorage.getItem('user_role') || null
    const storedUserId = localStorage.getItem('user_id') || null
    const storedOnboarding = localStorage.getItem('onboarding_incomplete')

    if (isValidToken(storedAccessToken) && isValidToken(storedRefreshToken)) {
      setTokens(
        storedAccessToken,
        storedRefreshToken,
        storedRole,
        storedUserId,
        storedOnboarding === null ? null : storedOnboarding === 'true'
      )
      setHasStoredToken(true)
    } else {
      setHasStoredToken(false)
    }

    setIsHydratingToken(false)
  }, [setTokens])

  const persistedRole = useMemo(
    () => localStorage.getItem('user_role') || getRoleFromStoredUser(),
    [userRole]
  )

  const effectiveToken = token || (hasStoredToken ? localStorage.getItem('access_token') : null)
  const effectiveRefreshToken = refreshToken || (hasStoredToken ? localStorage.getItem('refresh_token') : null)
  const effectiveRole = userRole || persistedRole
  const hasValidSession = isValidToken(effectiveToken) && isValidToken(effectiveRefreshToken)
  const needsRoleResolution = hasValidSession && !effectiveRole

  useEffect(() => {
    if (!effectiveToken) return

    if (persistedRole) {
      if (userRole !== persistedRole) {
        setUserRole(persistedRole)
      }
      return
    }

    // Fallback for old sessions that don't have role persisted yet.
    let isMounted = true
    setIsCheckingRole(true)

    authService
      .getCurrentUser()
      .then((response) => {
        if (!isMounted) return
        const apiRole = response?.data?.role
        if (apiRole) {
          setUserRole(apiRole)
          localStorage.setItem('user_role', apiRole)
          localStorage.setItem('user', JSON.stringify(response.data))
        }
      })
      .catch((error) => {
        console.warn('Could not resolve user role for admin route:', error)
      })
      .finally(() => {
        if (isMounted) setIsCheckingRole(false)
      })

    return () => {
      isMounted = false
    }
  }, [effectiveToken, userRole, persistedRole, setUserRole])

  const isAdmin = effectiveRole === 'admin'

  if (isHydratingToken) {
    return <LoadingSpinner />
  }

  if (!hasValidSession) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (isCheckingRole || needsRoleResolution) {
    return <LoadingSpinner />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

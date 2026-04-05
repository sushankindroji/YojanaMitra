// frontend/src/components/common/ProtectedAdminRoute.jsx
/**
 * ProtectedAdminRoute - Route protection for admin-only pages
 * Checks if user is authenticated AND has admin role
 * Uses stored role when available and falls back to /auth/me for stale sessions
 */

import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useMemo, useState } from 'react'
import authService from '../../services/authService'
import LoadingSpinner from './LoadingSpinner'

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
  const token = useAuthStore((state) => state.accessToken)
  const userRole = useAuthStore((state) => state.userRole)
  const setUserRole = useAuthStore((state) => state.setUserRole)
  const [isCheckingRole, setIsCheckingRole] = useState(false)

  const persistedRole = useMemo(
    () => localStorage.getItem('user_role') || getRoleFromStoredUser(),
    [userRole]
  )

  const effectiveRole = userRole || persistedRole
  const needsRoleResolution = Boolean(token) && !effectiveRole

  useEffect(() => {
    if (!token) return

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
  }, [token, userRole, persistedRole, setUserRole])

  const isAdmin = effectiveRole === 'admin'

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (isCheckingRole || needsRoleResolution) {
    return <LoadingSpinner />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

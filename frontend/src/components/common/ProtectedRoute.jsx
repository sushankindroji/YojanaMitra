import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useState } from 'react'

const isValidToken = (value) =>
  typeof value === 'string' && value.trim().length > 0 && value !== 'undefined' && value !== 'null'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const setTokens = useAuthStore((state) => state.setTokens)
  const [isLoading, setIsLoading] = useState(true)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')
    const userRole = localStorage.getItem('user_role')
    const userId = localStorage.getItem('user_id')
    
    if (isValidToken(token) && isValidToken(refreshToken)) {
      setTokens(token, refreshToken, userRole, userId)
      setHasToken(true)
    } else {
      setHasToken(false)
    }
    setIsLoading(false)
  }, [setTokens])

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return hasToken ? children : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}

import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useState } from 'react'

export default function ProtectedRoute({ children }) {
  const setTokens = useAuthStore((state) => state.setTokens)
  const [isLoading, setIsLoading] = useState(true)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')
    
    if (token && refreshToken) {
      setTokens(token, refreshToken)
      setHasToken(true)
    }
    setIsLoading(false)
  }, [setTokens])

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return hasToken ? children : <Navigate to="/login" replace />
}

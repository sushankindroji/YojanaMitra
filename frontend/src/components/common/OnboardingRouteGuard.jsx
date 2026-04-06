import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import onboardingService from '../../services/onboardingService'

export default function OnboardingRouteGuard({ children, requireComplete = true }) {
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    const fetchStatus = async () => {
      try {
        const response = await onboardingService.getStatus()
        if (!mounted) return
        const isCompleted = Boolean(response.data?.completed)
        setCompleted(isCompleted)
        setError(null)
      } catch (err) {
        if (!mounted) return
        setError(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchStatus()

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  if (error) {
    if (requireComplete) {
      return <Navigate to="/onboarding" replace />
    }
    return children
  }

  if (requireComplete && !completed) {
    return <Navigate to="/onboarding" replace />
  }

  if (!requireComplete && completed) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

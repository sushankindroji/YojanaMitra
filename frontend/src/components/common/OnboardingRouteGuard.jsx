import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import onboardingService from '../../services/onboardingService'
import profileService from '../../services/profileService'

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
        let isCompleted = Boolean(response.data?.completed)

        // Fallback: if onboarding flag is stale but profile is fully complete,
        // do not block protected pages like Apply.
        if (!isCompleted) {
          try {
            const completenessRes = await profileService.getCompleteness()
            const completeness = Number(completenessRes?.data?.total_percentage || 0)
            if (completeness >= 95) {
              isCompleted = true
            }
          } catch {
            // Ignore fallback errors; primary status still applies.
          }
        }

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
    // Do not hard-block route when status check itself fails.
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

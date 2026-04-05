// frontend/src/pages/Onboarding.jsx
/**
 * Onboarding Page - Full-page wrapper for the Onboarding wizard
 */

import { useNavigate } from 'react-router-dom'
import Onboarding from '../components/profile/Onboarding'

export default function OnboardingPage() {
  const navigate = useNavigate()

  const handleOnboardingComplete = () => {
    navigate('/dashboard', {
      replace: true,
      state: { toast: 'onboarding.complete' },
    })
  }

  return <Onboarding onComplete={handleOnboardingComplete} />
}

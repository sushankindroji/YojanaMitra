// frontend/src/pages/Apply.jsx
/**
 * Apply Page - Wrapper for the ApplyGuide component
 */

import { useNavigate, useParams } from 'react-router-dom'
import ApplyGuide from '../components/applications/ApplyGuide'

export default function ApplyPage() {
  const navigate = useNavigate()
  const { schemeId } = useParams()

  const handleComplete = () => {
    navigate('/applications', { replace: true })
  }

  return <ApplyGuide schemeId={schemeId} onComplete={handleComplete} />
}

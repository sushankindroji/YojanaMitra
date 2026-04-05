import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import authService from '../services/authService'

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authService.getCurrentUser()
        setUser(response.data)
      } catch (error) {
        console.error('Failed to fetch user:', error)
        toast.error('Failed to load user info')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen">{t('common.loading')}</div>

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="tricolor-bar"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-[#1A1A2E]">{t('dashboard.welcomeBack')}, {user?.name || user?.email}!</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="font-bold text-lg mb-4">{t('dashboard.profileStatus')}</h2>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div className="bg-[#138808] h-4 rounded-full" style={{width: '45%'}}></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">45% {t('dashboard.complete')}</p>
          </div>

          <div className="card">
            <h2 className="font-bold text-lg mb-4">{t('dashboard.eligibleSchemes')}</h2>
            <p className="text-3xl font-bold text-[#FF6B00]">24</p>
            <button 
              onClick={() => navigate('/schemes')}
              className="btn-primary mt-4 w-full"
            >
              {t('dashboard.viewSchemes')}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-8 mt-8">
          <div className="card">
            <h3 className="font-bold text-lg mb-2">📄 {t('dashboard.uploadDocuments')}</h3>
            <button 
              onClick={() => navigate('/upload')}
              className="btn-secondary w-full text-sm"
            >
              {t('dashboard.upload')}
            </button>
          </div>

          <div className="card">
            <h3 className="font-bold text-lg mb-2">👤 {t('dashboard.completeProfile')}</h3>
            <button 
              onClick={() => navigate('/profile')}
              className="btn-primary w-full text-sm"
            >
              {t('dashboard.editProfile')}
            </button>
          </div>

          <div className="card">
            <h3 className="font-bold text-lg mb-2">✓ {t('dashboard.checkEligibility')}</h3>
            <button 
              onClick={() => navigate('/eligibility')}
              className="btn-primary w-full text-sm"
            >
              {t('dashboard.checkNow')}
            </button>
          </div>

          <div className="card">
            <h3 className="font-bold text-lg mb-2">📋 {t('dashboard.viewApplications')}</h3>
            <button 
              onClick={() => navigate('/applications')}
              className="btn-primary w-full text-sm"
            >
              {t('common.view')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

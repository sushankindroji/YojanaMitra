import { useTranslation } from 'react-i18next'
import RegisterForm from '../components/auth/RegisterForm'
import LanguageSelector from '../components/common/LanguageSelector'

export default function Register() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="tricolor-bar"></div>
      <nav className="bg-white shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#1A3A6B]">YojanaMitra</h1>
          <LanguageSelector />
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <RegisterForm />
          <div className="mt-6 text-center">
            <p className="text-gray-600">{t('auth.hasAccount')} <a href="/login" className="text-[#FF6B00] font-bold">{t('auth.loginLink')}</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}

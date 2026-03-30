import { useTranslation } from 'react-i18next'
import LanguageSelector from '../components/common/LanguageSelector'

export default function Landing() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Tricolor Bar */}
      <div className="tricolor-bar"></div>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#1A3A6B]">YojanaMitra</h1>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <div className="space-x-4">
              <a href="/login" className="btn-primary">{t('nav.login')}</a>
              <a href="/register" className="btn-secondary">{t('nav.register')}</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4 text-[#1A1A2E]">
          {t('landing.heroTitle')}
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          {t('landing.heroDesc')}
          <br />
          <span className="font-bold text-[#FF6B00]">{t('landing.tagline')}</span>
        </p>
        <div className="space-x-4">
          <a href="/register" className="btn-primary text-lg">{t('landing.getStarted')}</a>
          <a href="/login" className="btn-secondary text-lg">{t('landing.alreadyMember')}</a>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold mb-12 text-center">{t('landing.howItWorks')}</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-4xl mb-4">📄</div>
              <h4 className="font-bold text-lg mb-2">{t('landing.uploadTitle')}</h4>
              <p className="text-gray-600">{t('landing.uploadDesc')}</p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h4 className="font-bold text-lg mb-2">{t('landing.aiTitle')}</h4>
              <p className="text-gray-600">{t('landing.aiDesc')}</p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">✅</div>
              <h4 className="font-bold text-lg mb-2">{t('landing.trackTitle')}</h4>
              <p className="text-gray-600">{t('landing.trackDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#1A3A6B] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-5xl font-bold mb-2">4,200+</p>
          <p className="text-xl">{t('landing.statsDesc')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2025 YojanaMitra. {t('landing.tagline')}</p>
        </div>
      </footer>
    </div>
  )
}

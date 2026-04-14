import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Languages, ShieldCheck, Sparkles } from 'lucide-react'
import LanguageSelector from '../components/common/LanguageSelector'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const quickStats = [
  { label: 'Total Schemes Indexed', value: '4,504+' },
  { label: 'Languages Supported', value: '7' },
  { label: 'API Endpoints', value: '26+' },
]

export default function Landing() {
  const { t, i18n } = useTranslation()
  const language = (i18n.language || 'en').split('-')[0]
  const greeting =
    {
      en: 'Namaste',
      hi: 'नमस्ते',
      te: 'నమస్తే',
      ta: 'வணக்கம்',
      mr: 'नमस्कार',
      bn: 'নমস্কার',
      kn: 'ನಮಸ್ಕಾರ',
    }[language] || 'Namaste'

  return (
    <div className="min-h-screen pb-12">
      <div className="tricolor-bar" />

      <header className="mx-auto max-w-7xl px-4 py-5 md:px-8">
        <div className="ds-surface flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3">
          <div>
            <p className="text-micro font-medium uppercase tracking-wider text-orange-700">YojanaMitra</p>
            <p className="text-body-sm text-stone-600">Your scheme, your right</p>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Link to="/login">
              <Button variant="ghost">{t('nav.login', { defaultValue: 'Login' })}</Button>
            </Link>
            <Link to="/register">
              <Button>{t('nav.register', { defaultValue: 'Register' })}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-5 max-w-7xl px-4 md:px-8">
        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="relative overflow-hidden border-orange-200 bg-gradient-to-br from-orange-50 via-white to-green-50 p-7 md:p-10">
            <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-orange-200/30" />
            <div className="absolute -bottom-16 right-20 h-44 w-44 rounded-full bg-green-200/30" />

            <p className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/75 px-3 py-1 text-caption font-medium text-orange-700">
              <Sparkles className="h-3.5 w-3.5" />
              {greeting}
            </p>

            <h1 className="relative text-h1 font-medium leading-tight text-stone-900 md:text-h1">
              {t('landing.heroTitle', {
                defaultValue: 'Find every government scheme you deserve, in your own language.',
              })}
            </h1>

            <p className="relative mt-4 max-w-2xl text-body-lg text-stone-600 md:text-body-lg">
              {t('landing.heroDesc', {
                defaultValue:
                  'YojanaMitra maps your profile to verified central and state schemes so you can discover, compare, and apply with confidence.',
              })}
            </p>

            <div className="relative mt-6 flex flex-wrap gap-3">
              <Link to="/schemes">
                <Button variant="secondary" size="lg">
                  {t('landing.browseSchemes', { defaultValue: 'Browse Schemes' })}
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg">
                  {t('landing.getStarted', { defaultValue: 'Get Started' })}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  {t('landing.alreadyMember', { defaultValue: 'I already have an account' })}
                </Button>
              </Link>
            </div>
          </Card>

          <div className="space-y-4">
            <Card variant="elevated" className="!bg-blue-950 !text-white border-blue-900">
              <p className="mb-1 text-label font-medium text-blue-100">Trust & Security</p>
              <h2 className="text-h3 font-medium">Built for citizen-first privacy and transparent eligibility checks.</h2>
              <ul className="mt-4 space-y-2 text-body-sm text-blue-50">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Encrypted document processing pipeline
                </li>
                <li className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  Multilingual interface and explainers
                </li>
              </ul>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {quickStats.map((stat) => (
                <Card key={stat.label} className="p-4">
                  <p className="text-micro font-medium uppercase tracking-wider text-stone-500">{stat.label}</p>
                  <p className="mt-1 text-h2 font-medium text-stone-900">{stat.value}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

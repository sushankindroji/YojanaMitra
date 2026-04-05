import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import LoginForm from '../components/auth/LoginForm'
import LanguageSelector from '../components/common/LanguageSelector'

export default function Login() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      <div className="tricolor-bar" />

      <nav className="mx-auto max-w-7xl px-4 py-5 md:px-8">
        <div className="ds-surface flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3">
          <Link to="/" className="text-lg font-bold text-stone-900">
            YojanaMitra
          </Link>
          <LanguageSelector />
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:px-8 lg:grid-cols-2 lg:py-14">
        <section className="hidden rounded-3xl border border-blue-100 bg-blue-950 p-8 text-white shadow-xl lg:block">
          <p className="inline-flex items-center rounded-full border border-blue-300/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
            Secure Citizen Access
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight">Continue where you left off.</h1>
          <p className="mt-4 text-blue-100">
            Track application progress, review eligibility decisions, and discover fresh schemes tailored to your profile.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-blue-100">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Personalized recommendations
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Multilingual support across workflows
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Protected authentication and secure session handling
            </li>
          </ul>
        </section>

        <section className="mx-auto w-full max-w-md lg:max-w-none lg:self-center">
          <LoginForm />
          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              {t('auth.noAccount', { defaultValue: 'Do not have an account?' })}{' '}
              <Link to="/register" className="font-semibold text-orange-700 hover:text-orange-800">
                {t('auth.registerLink', { defaultValue: 'Create one now' })}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

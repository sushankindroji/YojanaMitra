import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CheckCircle2, Users } from 'lucide-react'
import RegisterForm from '../components/auth/RegisterForm'
import LanguageSelector from '../components/common/LanguageSelector'

export default function Register() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="tricolor-bar" />

      <nav className="mx-auto max-w-7xl px-4 py-5 md:px-8">
        <div className="ds-surface flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3">
          <Link to="/" className="text-h3 font-medium text-stone-900">
            YojanaMitra
          </Link>
          <LanguageSelector />
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:px-8 lg:grid-cols-2 lg:py-14">
        <section className="hidden rounded-3xl border border-green-100 bg-green-900 p-8 text-white shadow-xl lg:block">
          <p className="inline-flex items-center rounded-full border border-green-300/30 px-3 py-1 text-caption font-medium uppercase tracking-[0.14em] text-green-100">
            Citizens First
          </p>
          <h1 className="mt-4 text-h1 font-medium leading-tight">Build your welfare profile in minutes.</h1>
          <p className="mt-4 text-green-100">
            Register once and unlock recommendations, eligibility insights, and application tracking across schemes.
          </p>

          <ul className="mt-8 space-y-3 text-body-sm text-green-100">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Guided onboarding tailored to your language
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Profile-driven scheme matching
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Support for families and dependents
            </li>
          </ul>
        </section>

        <section className="mx-auto w-full max-w-md lg:max-w-none lg:self-center">
          <RegisterForm />
          <div className="mt-6 text-center">
            <p className="text-body-sm text-stone-600">
              {t('auth.hasAccount', { defaultValue: 'Already have an account?' })}{' '}
              <Link to="/login" className="font-medium text-orange-700 hover:text-orange-800">
                {t('auth.loginLink', { defaultValue: 'Sign in' })}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

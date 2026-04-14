import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuthStore } from '../../store/authStore'
import authService from '../../services/authService'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Input from '../ui/Input'

export default function LoginForm() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [inlineError, setInlineError] = useState('')

  const extractAuthPayload = (responseData) => {
    if (responseData?.access_token && responseData?.refresh_token) {
      return responseData
    }

    if (responseData?.data?.access_token && responseData?.data?.refresh_token) {
      return responseData.data
    }

    return null
  }

  const getRedirectPath = (role) => {
    const queryParams = new URLSearchParams(location.search)
    const nextPath = queryParams.get('next') || location.state?.from

    if (typeof nextPath === 'string' && nextPath.startsWith('/')) {
      return nextPath
    }

    return role === 'admin' ? '/admin/dashboard' : '/dashboard'
  }

  const parseLoginError = (error) => {
    const status = Number(error?.response?.status || 0)
    if (status === 401 || status === 403) {
      return 'Incorrect email or password. Please try again.'
    }

    const detail = error?.response?.data?.detail
    const detailText = typeof detail === 'string' ? detail.toLowerCase() : ''
    if (detailText.includes('invalid') || detailText.includes('incorrect') || detailText.includes('credentials')) {
      return 'Incorrect email or password. Please try again.'
    }

    return t('auth.loginFailed', { defaultValue: 'Could not sign in right now. Please try again.' })
  }

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (inlineError) {
      setInlineError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isLoading) {
      return
    }

    if (!formData.email || !formData.password) {
      toast.error(t('validation.required', { defaultValue: 'Please fill in all required fields' }))
      return
    }

    setInlineError('')
    setIsLoading(true)

    try {
      const response = await authService.login(formData)
      const payload = extractAuthPayload(response.data)

      if (!payload) {
        throw new Error('Login response is invalid. Check backend URL and auth API response.')
      }

      const { access_token, refresh_token, user_id, role, onboarding_incomplete } = payload

      setTokens(access_token, refresh_token, role, user_id, onboarding_incomplete)
      toast.success(t('auth.loginSuccess'))
      
      const redirectPath = getRedirectPath(role)
      navigate(redirectPath, { replace: true })

      // Fallback only if router navigation does not leave /login quickly.
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          if (window.location.pathname === '/login') {
            window.location.replace(redirectPath)
          }
        }, 1200)
      }
    } catch (error) {
      const errorMsg = parseLoginError(error)
      setInlineError(errorMsg)
      toast.error(errorMsg, { autoClose: 5000 })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="elevated" className="mx-auto w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="text-h2 font-medium text-stone-900">{t('auth.signIn', { defaultValue: 'Sign In' })}</h2>
          <p className="mt-1 text-body-sm text-stone-600">
            {t('auth.loginDescription', { defaultValue: 'Access your personalized scheme dashboard.' })}
          </p>
        </div>

        <Input
          label={t('auth.email', { defaultValue: 'Email' })}
          name="email"
          type="email"
          value={formData.email}
          onChange={(event) => handleFieldChange('email', event.target.value)}
          placeholder={t('auth.emailPlaceholder', { defaultValue: 'you@example.com' })}
          leadingIcon={Mail}
          autoComplete="email"
          autoFocus
          inputMode="email"
          required
        />

        <div className="w-full">
          <label htmlFor="login-password" className="mb-1.5 block text-label font-medium text-stone-700">
            {t('auth.password', { defaultValue: 'Password' })}
          </label>
          <div className="group flex h-10 items-center rounded-xl border border-stone-300 bg-white px-3 transition-colors focus-within:border-orange-500 focus-within:ring-[3px] focus-within:ring-orange-500/20">
            <Lock className="mr-2 h-4 w-4 text-stone-500" aria-hidden="true" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(event) => handleFieldChange('password', event.target.value)}
              placeholder={t('auth.passwordPlaceholder', { defaultValue: 'Enter password' })}
              autoComplete="current-password"
              className="h-10 w-full bg-transparent text-body text-stone-900 placeholder:text-stone-400 focus:outline-none"
              required
              maxLength={72}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="rounded-md p-1 text-stone-600 transition-colors hover:bg-stone-100"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {inlineError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-700" role="alert">
            {inlineError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" loading={isLoading}>
          {isLoading
            ? t('auth.signingIn', { defaultValue: 'Signing in...' })
            : t('auth.signIn', { defaultValue: 'Sign In' })}
        </Button>

        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-body-sm text-stone-500 opacity-50"
          aria-disabled="true"
        >
          Forgot password (coming soon)
        </button>
      </form>
    </Card>
  )
}

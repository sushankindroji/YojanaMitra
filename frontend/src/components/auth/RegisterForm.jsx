import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuthStore } from '../../store/authStore'
import authService from '../../services/authService'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Input from '../ui/Input'

export default function RegisterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: '',
  })

  const extractAuthPayload = (responseData) => {
    if (responseData?.access_token && responseData?.refresh_token) {
      return responseData
    }

    if (responseData?.data?.access_token && responseData?.data?.refresh_token) {
      return responseData.data
    }

    return null
  }

  const passwordChecks = {
    minLength: formData.password.length >= 8,
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
  }

  const passwordMissingMessages = []
  if (!passwordChecks.minLength) passwordMissingMessages.push('Use at least 8 characters')
  if (!passwordChecks.hasUpper) passwordMissingMessages.push('Add a capital letter')
  if (!passwordChecks.hasLower) passwordMissingMessages.push('Add a lowercase letter')
  if (!passwordChecks.hasNumber) passwordMissingMessages.push('Add a number')

  const passwordStrength =
    !formData.password
      ? ''
      : passwordMissingMessages.length <= 1
        ? 'strong'
        : passwordMissingMessages.length <= 2
          ? 'medium'
          : 'weak'

  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev
      return { ...prev, [fieldName]: '' }
    })
  }

  const setFieldError = (fieldName, message) => {
    setFieldErrors((prev) => ({ ...prev, [fieldName]: message }))
  }

  const validateConfirmPassword = () => {
    if (!formData.confirmPassword) {
      setFieldError('confirmPassword', 'Please confirm your password')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setFieldError('confirmPassword', t('validation.passwordMismatch', { defaultValue: 'Passwords do not match' }))
      return false
    }

    clearFieldError('confirmPassword')
    return true
  }

  const validateEmail = () => {
    if (!formData.email) {
      setFieldError('email', t('validation.required', { defaultValue: 'Please fill in all required fields' }))
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setFieldError('email', 'Please enter a valid email address')
      return false
    }

    clearFieldError('email')
    return true
  }

  const validatePassword = () => {
    if (!formData.password) {
      setFieldError('password', t('validation.required', { defaultValue: 'Please fill in all required fields' }))
      return false
    }

    if (passwordMissingMessages.length > 0) {
      setFieldError('password', passwordMissingMessages[0])
      return false
    }

    clearFieldError('password')
    return true
  }

  const validateTerms = () => {
    if (!formData.agreeTerms) {
      setFieldError('agreeTerms', t('auth.mustAgreeTerms', { defaultValue: 'You must agree to the terms' }))
      return false
    }

    clearFieldError('agreeTerms')
    return true
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    const fieldValue = type === 'checkbox' ? checked : value
    setFormData((prev) => ({ ...prev, [name]: fieldValue }))
    clearFieldError(name)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isLoading) {
      return
    }

    const emailOk = validateEmail()
    const passwordOk = validatePassword()
    const confirmOk = validateConfirmPassword()
    const termsOk = validateTerms()
    if (!emailOk || !passwordOk || !confirmOk || !termsOk) return

    setIsLoading(true)

    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        preferred_lang: 'en',
      })
      const payload = extractAuthPayload(response.data)
      if (!payload) {
        throw new Error('Registration response is invalid. Check backend URL and auth API response.')
      }

      const { access_token, refresh_token, user_id, role, onboarding_incomplete } = payload

      setTokens(access_token, refresh_token, role, user_id, onboarding_incomplete)
      toast.success(t('auth.registerSuccess'))
      navigate('/onboarding', { replace: true })
    } catch (error) {
      const status = Number(error?.response?.status || 0)
      const detail = String(error?.response?.data?.detail || '')

      if (status === 409 || detail.toLowerCase().includes('already')) {
        const duplicateMessage = 'This email is already registered. Sign in instead.'
        setFieldError('email', duplicateMessage)
        toast.error(duplicateMessage, { autoClose: 5000 })
        return
      }

      const errorMsg = detail || t('auth.registerFailed')
      toast.error(errorMsg, { autoClose: 5000 })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="elevated" className="mx-auto w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="text-h2 font-medium text-stone-900">{t('auth.createAccount', { defaultValue: 'Create Account' })}</h2>
          <p className="mt-1 text-body-sm text-stone-600">
            {t('auth.registerDescription', { defaultValue: 'Create your citizen profile and start discovering schemes.' })}
          </p>
        </div>

        <Input
          label={t('auth.email', { defaultValue: 'Email' })}
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder={t('auth.emailPlaceholder', { defaultValue: 'you@example.com' })}
          leadingIcon={Mail}
          autoComplete="email"
          inputMode="email"
          error={fieldErrors.email}
          required
        />

        <div>
          <label htmlFor="register-password" className="mb-1.5 block text-label font-medium text-stone-700">
            {t('auth.password', { defaultValue: 'Password' })}
          </label>
          <div className="group flex h-10 items-center rounded-xl border border-stone-300 bg-white px-3 transition-colors focus-within:border-orange-500 focus-within:ring-[3px] focus-within:ring-orange-500/20">
            <Lock className="mr-2 h-4 w-4 text-stone-500" aria-hidden="true" />
            <input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder={t('auth.passwordPlaceholder', { defaultValue: 'Choose a secure password' })}
              className="h-10 w-full bg-transparent text-body text-stone-900 placeholder:text-stone-400 focus:outline-none"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
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
          {fieldErrors.password ? <p className="mt-1 text-caption font-medium text-red-700">{fieldErrors.password}</p> : null}

          {passwordStrength ? (
            <div className="mt-2">
              <Badge variant={passwordStrength === 'strong' ? 'success' : passwordStrength === 'medium' ? 'warning' : 'neutral'}>
                Password strength: {passwordStrength}
              </Badge>
            </div>
          ) : null}

          {formData.password ? (
            <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-2">
              <p className="text-caption font-medium text-stone-700">Password checks</p>
              <ul className="mt-1 space-y-1 text-caption text-stone-600">
                <li className={passwordChecks.minLength ? 'text-green-700' : 'text-red-700'}>At least 8 characters</li>
                <li className={passwordChecks.hasUpper ? 'text-green-700' : 'text-red-700'}>Add a capital letter</li>
                <li className={passwordChecks.hasLower ? 'text-green-700' : 'text-red-700'}>Add a lowercase letter</li>
                <li className={passwordChecks.hasNumber ? 'text-green-700' : 'text-red-700'}>Add a number</li>
              </ul>
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="mb-1.5 block text-label font-medium text-stone-700">
            {t('auth.confirmPassword', { defaultValue: 'Confirm Password' })}
          </label>
          <div className="group flex h-10 items-center rounded-xl border border-stone-300 bg-white px-3 transition-colors focus-within:border-orange-500 focus-within:ring-[3px] focus-within:ring-orange-500/20">
            <CheckCircle className="mr-2 h-4 w-4 text-stone-500" aria-hidden="true" />
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={validateConfirmPassword}
              placeholder={t('auth.confirmPasswordPlaceholder', { defaultValue: 'Re-enter your password' })}
              className="h-10 w-full bg-transparent text-body text-stone-900 placeholder:text-stone-400 focus:outline-none"
              autoComplete="new-password"
              maxLength={72}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="rounded-md p-1 text-stone-600 transition-colors hover:bg-stone-100"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword ? <p className="mt-1 text-caption font-medium text-red-700">{fieldErrors.confirmPassword}</p> : null}
        </div>

        <label className="flex items-start gap-2 text-label text-stone-600">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleChange}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-300"
            required
          />
          <span>{t('auth.agreeTerms', { defaultValue: 'I agree to the terms and conditions' })}</span>
        </label>
        {fieldErrors.agreeTerms ? <p className="text-caption font-medium text-red-700">{fieldErrors.agreeTerms}</p> : null}

        <Button type="submit" className="w-full" loading={isLoading} disabled={!formData.agreeTerms || isLoading}>
          {isLoading
            ? t('auth.creatingAccount', { defaultValue: 'Creating account...' })
            : t('auth.signUp', { defaultValue: 'Sign Up' })}
        </Button>
      </form>
    </Card>
  )
}

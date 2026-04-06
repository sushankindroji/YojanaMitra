import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Lock, Mail } from 'lucide-react'
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

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    const fieldValue = type === 'checkbox' ? checked : value
    setFormData((prev) => ({ ...prev, [name]: fieldValue }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error(t('validation.required', { defaultValue: 'Please fill in all required fields' }))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('validation.passwordMismatch', { defaultValue: 'Passwords do not match' }))
      return
    }

    if (formData.password.length < 8) {
      toast.error(t('validation.passwordMinLength', { defaultValue: 'Password must be at least 8 characters' }))
      return
    }

    if (!formData.agreeTerms) {
      toast.error(t('auth.mustAgreeTerms', { defaultValue: 'You must agree to the terms' }))
      return
    }

    setIsLoading(true)

    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        preferred_lang: 'en',
      })
      const { access_token, refresh_token, user_id, role } = response.data

      setTokens(access_token, refresh_token, role, user_id)
      toast.success(t('auth.registerSuccess'))
      navigate('/onboarding')
    } catch (error) {
      const errorMsg = error.response?.data?.detail || t('auth.registerFailed')
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength =
    formData.password.length >= 12 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password)
      ? 'strong'
      : formData.password.length >= 8
        ? 'medium'
        : formData.password
          ? 'weak'
          : ''

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
          required
        />

        <div>
          <Input
            label={t('auth.password', { defaultValue: 'Password' })}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={t('auth.passwordPlaceholder', { defaultValue: 'Choose a secure password' })}
            leadingIcon={Lock}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
          {passwordStrength ? (
            <div className="mt-2">
              <Badge variant={passwordStrength === 'strong' ? 'success' : passwordStrength === 'medium' ? 'warning' : 'neutral'}>
                Password strength: {passwordStrength}
              </Badge>
            </div>
          ) : null}
        </div>

        <Input
          label={t('auth.confirmPassword', { defaultValue: 'Confirm Password' })}
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder={t('auth.confirmPasswordPlaceholder', { defaultValue: 'Re-enter your password' })}
          leadingIcon={CheckCircle}
          autoComplete="new-password"
          maxLength={72}
          required
        />

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

        <Button type="submit" className="w-full" loading={isLoading}>
          {isLoading
            ? t('auth.creatingAccount', { defaultValue: 'Creating account...' })
            : t('auth.signUp', { defaultValue: 'Sign Up' })}
        </Button>
      </form>
    </Card>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, Mail } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuthStore } from '../../store/authStore'
import authService from '../../services/authService'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Input from '../ui/Input'

export default function LoginForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      toast.error(t('validation.required', { defaultValue: 'Please fill in all required fields' }))
      return
    }

    setIsLoading(true)

    try {
      const response = await authService.login(formData)
      const { access_token, refresh_token, user_id, role } = response.data

      setTokens(access_token, refresh_token, role, user_id)
      toast.success(t('auth.loginSuccess'))
      
      const redirectPath = role === 'admin' ? '/admin/dashboard' : '/dashboard'
      navigate(redirectPath)
    } catch (error) {
      console.error('Login error:', error)
      const errorMsg = error.response?.data?.detail || error.message || t('auth.loginFailed')
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="elevated" className="mx-auto w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">{t('auth.signIn', { defaultValue: 'Sign In' })}</h2>
          <p className="mt-1 text-sm text-stone-600">
            {t('auth.loginDescription', { defaultValue: 'Access your personalized scheme dashboard.' })}
          </p>
        </div>

        <Input
          label={t('auth.email', { defaultValue: 'Email' })}
          name="email"
          type="email"
          value={formData.email}
          onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
          placeholder={t('auth.emailPlaceholder', { defaultValue: 'you@example.com' })}
          leadingIcon={Mail}
          autoComplete="email"
          required
        />

        <Input
          label={t('auth.password', { defaultValue: 'Password' })}
          name="password"
          type="password"
          value={formData.password}
          onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
          placeholder={t('auth.passwordPlaceholder', { defaultValue: 'Enter password' })}
          leadingIcon={Lock}
          autoComplete="current-password"
          required
          maxLength={72}
        />

        <Button type="submit" className="w-full" loading={isLoading}>
          {isLoading
            ? t('auth.signingIn', { defaultValue: 'Signing in...' })
            : t('auth.signIn', { defaultValue: 'Sign In' })}
        </Button>
      </form>
    </Card>
  )
}

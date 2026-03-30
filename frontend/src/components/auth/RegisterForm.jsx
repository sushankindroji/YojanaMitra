import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import { toast } from 'react-toastify'

export default function RegisterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'))
      return
    }

    setIsLoading(true)

    try {
      const response = await authService.register({
        name,
        email,
        password,
        preferred_lang: 'en',
      })
      const { access_token, refresh_token } = response.data

      setTokens(access_token, refresh_token)
      toast.success(t('auth.registerSuccess'))
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.registerFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t('auth.createAccount')}</h2>

      <input
        type="text"
        placeholder={t('auth.namePlaceholder')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-2 border rounded-xl mb-4"
        required
      />

      <input
        type="email"
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 border rounded-xl mb-4"
        required
      />

      <input
        type="password"
        placeholder={t('auth.passwordPlaceholder')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 border rounded-xl mb-4"
        minLength="8"
        maxLength="72"
        required
      />

      <input
        type="password"
        placeholder={t('auth.confirmPasswordPlaceholder')}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full px-4 py-2 border rounded-xl mb-4"
        maxLength="72"
        required
      />

      <label className="flex items-center mb-6">
        <input type="checkbox" required className="mr-2" />
        <span className="text-sm text-gray-600">{t('auth.agreeTerms')}</span>
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? t('auth.creatingAccount') : t('auth.signUp')}
      </button>
    </form>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import { toast } from 'react-toastify'

export default function LoginForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await authService.login({ email, password })
      const { access_token, refresh_token, user_id } = response.data

      setTokens(access_token, refresh_token)
      toast.success(t('auth.loginSuccess'))
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      console.error('Response:', error.response?.data)
      const errorMsg = error.response?.data?.detail || error.message || t('auth.loginFailed')
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t('auth.signIn')}</h2>

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
        maxLength="72"
        required
      />

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? t('auth.signingIn') : t('auth.signIn')}
      </button>
    </form>
  )
}

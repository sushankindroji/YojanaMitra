import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import authService from '../../services/authService'
import { toast } from 'react-toastify'
import FormInput from '../common/FormInput'
import { validateField } from '../../utils/formValidation'

export default function LoginForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Real-time validation
    if (touched[name]) {
      const error = validateField(name, value, name === 'email' ? 'email' : 'password', t)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    
    const error = validateField(name, value, name === 'email' ? 'email' : 'password', t)
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate all fields
    const emailError = validateField('email', formData.email, 'email', t)
    const passwordError = validateField('password', formData.password, 'password', t)
    
    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError })
      setTouched({ email: true, password: true })
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
    <form onSubmit={handleSubmit} className="card max-w-md mx-auto animate-slide-up">
      <h2 className="text-2xl font-bold mb-2 text-[#1A3A6B]">{t('auth.signIn')}</h2>
      <p className="text-gray-600 text-sm mb-6">{t('auth.loginDescription', 'Sign in to access your schemes')}</p>

      <FormInput
        label={t('auth.email', 'Email')}
        name="email"
        type="email"
        placeholder={t('auth.emailPlaceholder')}
        value={formData.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.email}
        touched={touched.email}
        required
        icon={Mail}
        autoComplete="email"
      />

      <FormInput
        label={t('auth.password', 'Password')}
        name="password"
        type="password"
        placeholder={t('auth.passwordPlaceholder')}
        value={formData.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.password}
        touched={touched.password}
        required
        icon={Lock}
        autoComplete="current-password"
        maxLength="72"
      />

      <button
        type="submit"
        disabled={isLoading || !formData.email || !formData.password}
        className="btn-primary w-full mt-2"
        aria-label={isLoading ? t('auth.signingIn') : t('auth.signIn')}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('auth.signingIn')}
          </span>
        ) : (
          t('auth.signIn')
        )}
      </button>
    </form>
  )
}

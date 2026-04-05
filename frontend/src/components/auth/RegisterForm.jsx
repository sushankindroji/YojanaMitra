import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, Mail, Lock, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import authService from '../../services/authService'
import { toast } from 'react-toastify'
import FormInput from '../common/FormInput'
import FormCheckbox from '../common/FormCheckbox'
import { validateField } from '../../utils/formValidation'

export default function RegisterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })
  
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const fieldValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: fieldValue }))
    
    // Real-time validation
    if (touched[name]) {
      let error = ''
      if (name === 'name') {
        error = validateField(name, value, 'name', t)
      } else if (name === 'email') {
        error = validateField(name, value, 'email', t)
      } else if (name === 'password') {
        error = validateField(name, value, 'password', t)
      } else if (name === 'confirmPassword') {
        error = validateField(name, value, (val, translator) => {
          if (!val) return translator('validation.confirmPasswordRequired', 'Please confirm your password')
          if (val !== formData.password) return translator('validation.passwordMismatch', 'Passwords do not match')
          return ''
        }, t)
      }
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    
    let error = ''
    if (name === 'name') {
      error = validateField(name, value, 'name', t)
    } else if (name === 'email') {
      error = validateField(name, value, 'email', t)
    } else if (name === 'password') {
      error = validateField(name, value, 'password', t)
    } else if (name === 'confirmPassword') {
      error = validateField(name, value, (val, translator) => {
        if (!val) return translator('validation.confirmPasswordRequired', 'Please confirm your password')
        if (val !== formData.password) return translator('validation.passwordMismatch', 'Passwords do not match')
        return ''
      }, t)
    }
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate all fields
    const nameError = validateField('name', formData.name, 'name', t)
    const emailError = validateField('email', formData.email, 'email', t)
    const passwordError = validateField('password', formData.password, 'password', t)
    const confirmError = formData.password !== formData.confirmPassword 
      ? t('validation.passwordMismatch', 'Passwords do not match')
      : ''
    
    const newErrors = { name: nameError, email: emailError, password: passwordError, confirmPassword: confirmError }
    
    if (Object.values(newErrors).some(err => err)) {
      setErrors(newErrors)
      setTouched({ name: true, email: true, password: true, confirmPassword: true })
      return
    }

    if (!formData.agreeTerms) {
      toast.error(t('auth.mustAgreeTerms', 'You must agree to the terms'))
      return
    }

    setIsLoading(true)

    try {
      const response = await authService.register({
        name: formData.name,
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

  const passwordStrength = formData.password ? 
    (formData.password.length >= 12 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) ? 'strong' :
     formData.password.length >= 8 ? 'medium' : 'weak') : ''

  return (
    <form onSubmit={handleSubmit} className="card max-w-md mx-auto animate-slide-up">
      <h2 className="text-2xl font-bold mb-2 text-[#1A3A6B]">{t('auth.createAccount')}</h2>
      <p className="text-gray-600 text-sm mb-6">{t('auth.registerDescription', 'Create an account to get started')}</p>

      <FormInput
        label={t('auth.fullName', 'Full Name')}
        name="name"
        placeholder={t('auth.namePlaceholder')}
        value={formData.name}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.name}
        touched={touched.name}
        required
        icon={User}
        autoComplete="name"
      />

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
        autoComplete="new-password"
        minLength="6"
        maxLength="72"
        helperText={passwordStrength ? `Strength: ${passwordStrength}` : 'At least 6 characters'}
      />

      <FormInput
        label={t('auth.confirmPassword', 'Confirm Password')}
        name="confirmPassword"
        type="password"
        placeholder={t('auth.confirmPasswordPlaceholder')}
        value={formData.confirmPassword}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.confirmPassword}
        touched={touched.confirmPassword}
        required
        icon={CheckCircle}
        autoComplete="new-password"
        maxLength="72"
      />

      <FormCheckbox
        name="agreeTerms"
        label={t('auth.agreeTerms', 'I agree to the terms and conditions')}
        checked={formData.agreeTerms}
        onChange={handleChange}
        required
      />

      <button
        type="submit"
        disabled={isLoading || !formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.agreeTerms}
        className="btn-primary w-full mt-4"
        aria-label={isLoading ? t('auth.creatingAccount') : t('auth.signUp')}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('auth.creatingAccount')}
          </span>
        ) : (
          t('auth.signUp')
        )}
      </button>
    </form>
  )
}

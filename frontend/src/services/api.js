import axios from 'axios'
import { toast } from 'react-toastify'
import { API_BASE_URL } from './constants'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,  // Increased from 10s to 30s (bcrypt is slow)
  headers: {
    'Content-Type': 'application/json',
  },
})

const clearAuthStorage = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_role')
  localStorage.removeItem('user_id')
  localStorage.removeItem('user')
}

const shouldAttemptRefresh = (url = '') => {
  const normalized = String(url)
  return !['/auth/login', '/auth/register', '/auth/refresh'].some((path) => normalized.includes(path))
}

// Request interceptor for JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for token refresh + error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const requestUrl = originalRequest?.url || ''

    if (status === 401 && !originalRequest?._retry && shouldAttemptRefresh(requestUrl)) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          const { access_token, refresh_token, role } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          if (role) {
            localStorage.setItem('user_role', role)
          }

          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        clearAuthStorage()
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }

    if (status === 401 && shouldAttemptRefresh(requestUrl)) {
      clearAuthStorage()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    if (status === 403) {
      toast.error('Access forbidden. You do not have permission for this action.', {
        toastId: 'api-forbidden',
      })
    }

    if (status >= 500) {
      toast.error('Server error. Please try again in a moment.', {
        toastId: 'api-server-error',
      })
    }

    return Promise.reject(error)
  }
)

export default api

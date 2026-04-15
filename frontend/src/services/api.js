import axios from 'axios'
import axiosRetry from 'axios-retry'
import { toast } from 'react-toastify'
import i18n from '../i18n'
import { useAuthStore } from '../store/authStore'
import { API_BASE_URL } from './constants'

const API_BASE = API_BASE_URL

if (!API_BASE) {
  // Fail loudly in development while allowing main.jsx env screen to guide setup.
  console.error('VITE_API_BASE_URL is not set. Copy frontend/.env.example to frontend/.env')
}

const baseApiConfig = {
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
}

const api = axios.create(baseApiConfig)
const publicApi = axios.create(baseApiConfig)

const clearAuthStorage = () => {
  useAuthStore.getState().logout()
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_role')
  localStorage.removeItem('user_id')
  localStorage.removeItem('user')
  localStorage.removeItem('onboarding_incomplete')
  localStorage.removeItem('last_auth_success_at')
}

const shouldAttemptRefresh = (url = '') => {
  const normalized = String(url)
  return !['/auth/login', '/auth/register', '/auth/refresh'].some((path) => normalized.includes(path))
}

const isWithinPostLoginGracePeriod = () => {
  const raw = localStorage.getItem('last_auth_success_at')
  const lastAuthSuccessAt = Number(raw || 0)
  if (!Number.isFinite(lastAuthSuccessAt) || lastAuthSuccessAt <= 0) return false
  return Date.now() - lastAuthSuccessAt <= 15000
}

const redirectToLogin = (reason = 'session_expired') => {
  if (typeof window === 'undefined' || window.location.pathname === '/login') return

  const nextPath = `${window.location.pathname}${window.location.search}`
  const next = encodeURIComponent(nextPath)
  const why = encodeURIComponent(reason)
  window.location.href = `/login?next=${next}&reason=${why}`
}

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((pending) => {
    if (error) pending.reject(error)
    else pending.resolve(token)
  })
  failedQueue = []
}

const handleError = (error) => {
  const status = error.response?.status
  if (status === 403) {
    toast.error('Access forbidden. You do not have permission for this action.', {
      toastId: 'api-forbidden',
    })
  }

  if (status === 422) {
    toast.error('Some fields are invalid. Please review and try again.', {
      toastId: 'api-validation-error',
    })
  }

  if (status === 429) {
    const retryAfter = error.response?.data?.retry_after
    const suffix = retryAfter ? ` Please retry in ${retryAfter}s.` : ''
    toast.error(`Too many requests.${suffix}`, {
      toastId: 'api-rate-limit',
    })
  }

  if (status >= 500) {
    toast.error('Server error. Please try again in a moment.', {
      toastId: 'api-server-error',
    })
  }

  if (!error.response) {
    toast.error('Network error. Please check your internet connection.', {
      toastId: 'api-network-error',
    })
  }

  return Promise.reject(error)
}

const addLanguageParam = (config) => {
  const currentLang = i18n.language || 'en'
  config.params = config.params || {}
  if (!config.params.lang) {
    config.params.lang = currentLang
  }
  config.headers['Accept-Language'] = currentLang
  return config
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return addLanguageParam(config)
  },
  (error) => Promise.reject(error)
)

publicApi.interceptors.request.use(
  (config) => {
    return addLanguageParam(config)
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const requestUrl = originalRequest?.url || ''

    if (!originalRequest) {
      return handleError(error)
    }

    if (status === 401 && !originalRequest?._retry && shouldAttemptRefresh(requestUrl)) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        const response = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        const { access_token, refresh_token, role, user_id, onboarding_incomplete } = response.data || {}

        if (!access_token || !refresh_token) {
          throw new Error('Refresh response missing tokens')
        }

        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        if (role) localStorage.setItem('user_role', role)
        if (user_id) localStorage.setItem('user_id', user_id)
        if (onboarding_incomplete !== undefined) {
          localStorage.setItem('onboarding_incomplete', String(Boolean(onboarding_incomplete)))
        }
        localStorage.setItem('last_auth_success_at', String(Date.now()))

        useAuthStore.getState().setTokens(
          access_token,
          refresh_token,
          role || null,
          user_id || null,
          onboarding_incomplete ?? null
        )

        api.defaults.headers.common.Authorization = `Bearer ${access_token}`
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        processQueue(null, access_token)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        if (isWithinPostLoginGracePeriod()) {
          isRefreshing = false
          return Promise.reject(refreshError)
        }

        clearAuthStorage()
        redirectToLogin('session_expired')
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 401 && shouldAttemptRefresh(requestUrl)) {
      if (isWithinPostLoginGracePeriod()) {
        return Promise.reject(error)
      }

      clearAuthStorage()
      redirectToLogin('session_expired')
    }

    return handleError(error)
  }
)

publicApi.interceptors.response.use((response) => response, handleError)

axiosRetry(api, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error)
    || (error.response?.status >= 500 && error.response?.status < 600),
  onRetry: (retryCount, error) => {
    console.warn(`Retry ${retryCount} for ${error.config?.url}`)
  },
})

axiosRetry(publicApi, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error)
    || (error.response?.status >= 500 && error.response?.status < 600),
})

export default api
export { publicApi }

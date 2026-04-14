const normalizeApiBaseUrl = (rawValue) => {
	const value = (rawValue || '').trim()
	if (!value) {
		return '/api/v1'
	}

	const stripped = value.replace(/\/+$/, '')
	if (stripped.endsWith('/api/v1')) {
		return stripped
	}

	if (stripped === '/api' || stripped.startsWith('/api/')) {
		return '/api/v1'
	}

	return `${stripped}/api/v1`
}

const getFallbackApiBaseUrl = () => {
	if (typeof window === 'undefined') {
		return '/api/v1'
	}

	const host = window.location.hostname
	if (host === 'localhost' || host === '127.0.0.1') {
		return '/api/v1'
	}

	// Production fallback for hosted frontend when env vars are missing.
	return 'https://yojanamitra-backend.onrender.com/api/v1'
}

const runtimeBaseUrl =
	typeof window !== 'undefined' && window.__APP_CONFIG__
		? window.__APP_CONFIG__.VITE_API_BASE_URL
		: undefined

export const API_BASE_URL = normalizeApiBaseUrl(
	runtimeBaseUrl || import.meta.env.VITE_API_BASE_URL || getFallbackApiBaseUrl()
)
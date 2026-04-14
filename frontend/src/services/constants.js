const normalizeApiBaseUrl = (rawValue) => {
	const value = (rawValue || '').trim()
	if (!value) {
		return ''
	}

	const stripped = value.replace(/\/+$/, '')
	if (stripped.endsWith('/api/v1')) {
		return stripped
	}

	return `${stripped}/api/v1`
}

const runtimeBaseUrl =
	typeof window !== 'undefined' && window.__APP_CONFIG__
		? window.__APP_CONFIG__.VITE_API_BASE_URL
		: undefined

export const API_BASE_URL = normalizeApiBaseUrl(
	runtimeBaseUrl || import.meta.env.VITE_API_BASE_URL
)

if (!API_BASE_URL) {
	console.error('VITE_API_BASE_URL is not set. Copy frontend/.env.example to frontend/.env')
}
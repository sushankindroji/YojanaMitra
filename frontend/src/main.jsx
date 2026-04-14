import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'
import './index.css'

const runtimeApiBase =
  typeof window !== 'undefined' && window.__APP_CONFIG__
    ? String(window.__APP_CONFIG__.VITE_API_BASE_URL || '').trim()
    : ''
const envApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim()
const hasConfiguredApiBase = Boolean(runtimeApiBase || envApiBase)

function ConfigErrorScreen() {
  return (
    <div className="min-h-screen bg-stone-50 px-6 py-10 text-stone-900">
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Missing frontend API configuration</h1>
        <p className="mt-3 text-sm text-stone-700">
          Set <strong>VITE_API_BASE_URL</strong> in your frontend env file to continue.
        </p>
        <div className="mt-4 rounded-md bg-stone-100 p-3 font-mono text-xs text-stone-800">
          VITE_API_BASE_URL=http://localhost:8000
        </div>
      </div>
    </div>
  )
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    event.preventDefault()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {hasConfiguredApiBase ? <App /> : <ConfigErrorScreen />}
  </React.StrictMode>
)

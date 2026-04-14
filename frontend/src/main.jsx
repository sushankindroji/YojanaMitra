import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'
import './index.css'

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    event.preventDefault()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

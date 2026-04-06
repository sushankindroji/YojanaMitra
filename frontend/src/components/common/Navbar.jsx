// frontend/src/components/common/Navbar.jsx
/**
 * Navbar - Main navigation bar
 * Features:
 * - Logo and branding
 * - Navigation links
 * - Language selector
 * - User profile menu
 * - Mobile responsive
 * - Active link indicator
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, LogOut, User, Settings } from 'lucide-react'
import LanguageSelector from './LanguageSelector'
import authService from '../../services/authService'
import { useAuthStore } from '../../store/authStore'

const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Find Schemes', path: '/schemes', icon: '🎯' },
  { label: 'My Documents', path: '/upload', icon: '📄' },
  { label: 'My Profile', path: '/profile', icon: '👤' },
]

export default function Navbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const logout = useAuthStore((state) => state.logout)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [userState, setUserState] = useState(null)

  // Refresh the current user from the active session so old admin data cannot leak across logins.
  useEffect(() => {
    if (!accessToken) {
      setUserState(null)
      return
    }

    authService.getCurrentUser()
      .then((response) => {
        const userData = response.data
        setUserState(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      })
      .catch((error) => console.warn('Could not fetch user data:', error))
  }, [accessToken])

  const user = userState || {}

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      logout()
      localStorage.removeItem('user')
      navigate('/login')
    }
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      {/* Tricolor bar at the top */}
      <div className="h-1 flex">
        <div className="flex-1 bg-orange-500"></div>
        <div className="flex-1 bg-white border-b border-gray-200"></div>
        <div className="flex-1 bg-green-600"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-medium text-body-sm">
              Y
            </div>
            <div>
              <h1 className="text-body font-medium text-gray-900">YojanaMitra</h1>
              <p className="text-caption text-gray-600">Government Schemes Made Easy</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-body font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </button>
            ))}

          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-body-sm">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:inline text-body-sm font-medium text-gray-700">
                  {user.full_name || 'User'}
                </span>
              </button>

              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-body-sm font-medium text-gray-900">{user.full_name || user.name || user.email || 'User'}</p>
                    <p className="text-caption text-gray-600">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      navigate('/profile')
                      setIsProfileMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left text-body-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <User size={16} />
                    My Profile
                  </button>

                  <button
                    onClick={() => {
                      navigate('/settings')
                      setIsProfileMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left text-body-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Settings
                  </button>

                  <div className="border-t border-gray-200 my-2"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-body-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200 space-y-2">
            {NAV_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path)
                  setIsMobileMenuOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-body font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-blue-100 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </button>
            ))}

            {/* Mobile Language Selector */}
            <div className="px-4 py-2">
              <LanguageSelector />
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

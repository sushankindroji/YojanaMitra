// frontend/src/components/admin/AdminLayout.jsx
/**
 * AdminLayout - Wrapper component for admin pages with sidebar navigation
 * Features:
 * - Admin navigation sidebar
 * - Active route highlighting
 * - Logout button
 * - Mobile responsive menu
 */

import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, LogOut, BarChart3, Users, Briefcase, FileText, Settings } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export default function AdminLayout({ children }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const menuItems = [
    {
      label: 'Dashboard',
      icon: BarChart3,
      path: '/admin/dashboard',
      badge: null,
    },
    {
      label: 'Users',
      icon: Users,
      path: '/admin/users',
      badge: null,
    },
    {
      label: 'Schemes',
      icon: Briefcase,
      path: '/admin/schemes',
      badge: null,
    },
    {
      label: 'Applications',
      icon: FileText,
      path: '/admin/applications',
      badge: null,
    },
    {
      label: 'Settings',
      icon: Settings,
      path: '/admin/settings',
      badge: null,
    },
  ]

  const handleLogout = () => {
    if (window.confirm('Logout from admin panel?')) {
      logout()
      navigate('/login')
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">
              YM
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-bold text-white">YojanaMitra</p>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                title={sidebarOpen ? '' : item.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            title={sidebarOpen ? 'Collapse' : 'Expand'}
          >
            {sidebarOpen ? (
              <>
                <X size={20} />
                <span>Collapse</span>
              </>
            ) : (
              <Menu size={20} className="mx-auto" />
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 border-b border-purple-700 px-8 py-4 flex items-center justify-between shadow-lg">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden md:hidden text-white hover:text-purple-100"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                  ADMIN
                </span>
              </div>
              <p className="font-semibold text-white mt-1">Admin Control Panel</p>
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              ⚙️
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="overflow-auto">{children}</div>
      </div>
    </div>
  )
}

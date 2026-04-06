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
import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export default function AdminLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

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

  const currentLabel = menuItems.find((item) => location.pathname.startsWith(item.path))?.label || 'Admin'

  return (
    <div className="flex min-h-screen bg-stone-50">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`${collapsed ? 'w-16' : 'w-60'} fixed inset-y-0 left-0 z-40 flex -translate-x-full flex-col border-r border-stone-200 bg-white transition-all duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-stone-200 px-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-body-sm font-medium text-orange-700">
              YM
            </div>
            {!collapsed ? (
              <div>
                <p className="font-medium text-stone-900">YojanaMitra</p>
                <p className="text-caption text-stone-500">Admin Control</p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-stone-500 hover:bg-stone-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : ''}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-body font-medium transition ${
                  isActive
                    ? 'bg-orange-50 font-medium text-orange-700 before:absolute before:left-0 before:top-2 before:h-6 before:w-1 before:rounded-r before:bg-orange-600'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed ? (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="ml-auto rounded-full bg-red-600 px-2 py-1 text-caption font-medium text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-stone-200 p-2">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-body text-stone-600 transition hover:bg-stone-100"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed ? <span>{collapsed ? 'Expand' : 'Collapse'}</span> : null}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-body text-red-700 transition hover:bg-red-50"
          >
            <LogOut size={18} />
            {!collapsed ? <span>Logout</span> : null}
          </button>
        </div>
      </aside>

      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-white/90 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            className="rounded-md p-2 text-stone-700 hover:bg-stone-100 lg:hidden"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-micro font-medium uppercase tracking-wider text-stone-500">Admin Panel</p>
              <p className="text-h3 font-medium text-stone-900">{currentLabel}</p>
            </div>
            <span className="rounded-full bg-red-100 px-3 py-1 text-caption font-medium text-red-700">ADMIN</span>
          </div>
        </div>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

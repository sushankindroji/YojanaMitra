import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Compass,
  Home,
  Layers,
  LogOut,
  MoreHorizontal,
  UserCircle,
  WalletCards,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import authService from '../../services/authService'
import LanguageSelector from '../common/LanguageSelector'
import Avatar from '../ui/Avatar'

const desktopItems = [
  { label: 'Home', to: '/dashboard', icon: Home },
  { label: 'Schemes', to: '/schemes', icon: Compass },
  { label: 'Eligibility', to: '/eligibility', icon: Layers },
  { label: 'My Schemes', to: '/applications', icon: WalletCards },
  { label: 'Profile', to: '/profile', icon: UserCircle },
]

const mobileTabs = [
  { label: 'Home', to: '/dashboard', icon: Home },
  { label: 'Schemes', to: '/schemes', icon: Compass },
  { label: 'My Schemes', to: '/applications', icon: WalletCards },
  { label: 'Profile', to: '/profile', icon: UserCircle },
  { label: 'More', to: '/upload', icon: MoreHorizontal },
]

const toTitle = (slug) =>
  slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    authService
      .getCurrentUser()
      .then((response) => {
        if (!mounted) return
        setUser(response.data)
        localStorage.setItem('user', JSON.stringify(response.data))
      })
      .catch(() => {
        const raw = localStorage.getItem('user')
        if (!mounted || !raw) return
        try {
          setUser(JSON.parse(raw))
        } catch {
          setUser(null)
        }
      })

    return () => {
      mounted = false
    }
  }, [location.pathname])

  const breadcrumb = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    const items = [{ label: 'Home', to: '/dashboard' }]

    let cumulative = ''
    parts.forEach((part) => {
      cumulative += `/${part}`
      if (part === 'dashboard') return
      items.push({ label: toTitle(part), to: cumulative })
    })

    return items
  }, [location.pathname])

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // Ignore API logout failure and clear local auth state.
    }
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen md:flex">
      <aside
        className={`hidden border-r border-stone-200 bg-white/85 backdrop-blur md:block ${
          collapsed ? 'w-16' : 'w-60'
        } transition-[width] duration-300`}
      >
        <div className="flex h-16 items-center justify-between border-b border-stone-100 px-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-left"
            aria-label="Go to dashboard"
          >
            <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">YM</span>
            {!collapsed ? <span className="text-sm font-semibold text-stone-800">YojanaMitra</span> : null}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((state) => !state)}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="p-2" aria-label="Primary navigation">
          {desktopItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-orange-50 font-semibold text-orange-700 before:absolute before:left-0 before:top-2 before:h-6 before:w-1 before:rounded-r before:bg-orange-500'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div>
              <nav className="text-xs text-stone-500" aria-label="Breadcrumb">
                {breadcrumb.map((item, index) => (
                  <span key={`${item.to}-${index}`}>
                    <button
                      type="button"
                      className="hover:text-stone-700"
                      onClick={() => navigate(item.to)}
                    >
                      {item.label}
                    </button>
                    {index < breadcrumb.length - 1 ? <span className="px-1">/</span> : null}
                  </span>
                ))}
              </nav>
              <p className="mt-1 text-sm font-semibold text-stone-800">{breadcrumb[breadcrumb.length - 1]?.label || 'Home'}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <LanguageSelector />
              </div>

              <button
                type="button"
                className="rounded-full p-2 text-stone-600 hover:bg-stone-100"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((state) => !state)}
                  className="rounded-full"
                  aria-label="User menu"
                >
                  <Avatar name={user?.full_name || user?.email || 'User'} size="md" />
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                    <p className="px-2 py-1 text-sm font-semibold text-stone-800">{user?.full_name || 'Citizen User'}</p>
                    <p className="px-2 pb-2 text-xs text-stone-500">{user?.email || ''}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        navigate('/profile')
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
                    >
                      <UserCircle className="h-4 w-4" />
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-20 pt-4 md:px-6 md:pb-6 md:pt-5">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/90 px-2 py-2 backdrop-blur md:hidden"
        aria-label="Mobile tab navigation"
      >
        <ul className="grid grid-cols-5 gap-1">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon
            const active = location.pathname.startsWith(tab.to)
            return (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  className={`flex flex-col items-center justify-center rounded-lg px-1 py-2 text-[11px] ${
                    active ? 'bg-orange-50 text-orange-700' : 'text-stone-600'
                  }`}
                >
                  <Icon className="mb-1 h-4 w-4" />
                  <span>{tab.label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

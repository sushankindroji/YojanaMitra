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
  Settings,
  UserCircle,
  WalletCards,
} from 'lucide-react'
import { toast } from 'react-toastify'
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
  { label: 'Eligibility', to: '/eligibility', icon: Layers },
  { label: 'My Schemes', to: '/applications', icon: WalletCards },
  { label: 'Profile', to: '/profile', icon: UserCircle },
]

const toTitle = (slug) =>
  slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('ym_sidebar_collapsed') === 'true'
  })
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('ym_sidebar_collapsed', String(collapsed))
  }, [collapsed])

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
    const confirmed = window.confirm('Are you sure you want to log out?')
    if (!confirmed) return

    try {
      await authService.logout()
    } catch {
      // Ignore API logout failure and clear local auth state.
    }
    logout()
    navigate('/login', { replace: true })
  }

  const unreadNotifications = Number(
    user?.notification_count
    || user?.pending_notifications
    || (typeof window !== 'undefined' ? window.localStorage.getItem('ym_unread_notifications') : 0)
    || 0
  )

  const mySchemesBadge = Number(
    user?.new_eligible_schemes
    || (typeof window !== 'undefined' ? window.localStorage.getItem('ym_new_eligible_schemes') : 0)
    || 0
  )

  return (
    <div className="min-h-screen md:flex">
      <aside
        className={`hidden border-r border-stone-200 bg-white/85 backdrop-blur md:sticky md:top-0 md:block md:h-screen md:flex-shrink-0 md:overflow-y-auto ${
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
            <span className="rounded-md bg-orange-100 px-2 py-1 text-caption font-medium text-orange-700">YM</span>
            {!collapsed ? <span className="text-body font-medium text-stone-800">YojanaMitra</span> : null}
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

        <div className="mx-2 mt-2 rounded-xl border border-stone-200 bg-stone-50 p-2">
          <div className="flex items-center gap-2">
            <Avatar name={user?.full_name || user?.email || 'User'} size={collapsed ? 'sm' : 'md'} />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium text-stone-800">{user?.full_name || 'Citizen User'}</p>
                <p className="truncate text-caption text-stone-500">{user?.email || 'Signed in'}</p>
              </div>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2" aria-label="Primary navigation">
          {desktopItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `relative mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-body font-medium transition ${
                    isActive
                      ? 'bg-orange-50 font-medium text-orange-700 before:absolute before:left-0 before:top-2 before:h-6 before:w-1 before:rounded-r before:bg-orange-500'
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

        <div className="border-t border-stone-200 p-2">
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-body font-medium text-red-700 transition hover:bg-red-50"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {!collapsed ? <span>Logout</span> : null}
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div>
              <nav className="text-body-sm text-stone-500" aria-label="Breadcrumb">
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
              <p className="mt-1 text-h3 font-medium text-stone-800">{breadcrumb[breadcrumb.length - 1]?.label || 'Home'}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <LanguageSelector />
              </div>

              <button
                type="button"
                className="relative rounded-full p-2 text-stone-600 hover:bg-stone-100"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 ? (
                  <span className="absolute right-1 top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                ) : null}
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
                    <p className="px-2 py-1 text-body-sm font-medium text-stone-800">{user?.full_name || 'Citizen User'}</p>
                    <p className="px-2 pb-2 text-caption text-stone-500">{user?.email || ''}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        navigate('/profile')
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-body text-stone-700 hover:bg-stone-100"
                    >
                      <UserCircle className="h-4 w-4" />
                      My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        toast.info('Settings will be available soon.', { autoClose: 4000 })
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-body text-stone-700 hover:bg-stone-100"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-body text-red-700 hover:bg-red-50"
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
                  className={`relative flex min-h-11 flex-col items-center justify-center rounded-lg border-t-2 px-1 py-2 text-body-sm font-medium ${
                    active ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-transparent text-stone-600'
                  }`}
                >
                  <Icon className="mb-1 h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.to === '/applications' && mySchemesBadge > 0 ? (
                    <span className="absolute right-1 top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-medium text-white">
                      {mySchemesBadge > 9 ? '9+' : mySchemesBadge}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

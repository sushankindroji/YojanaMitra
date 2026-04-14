import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Compass, SlidersHorizontal } from 'lucide-react'
import SchemeFilter from '../components/schemes/SchemeFilter'
import SchemeResults from '../components/schemes/SchemeResults'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import { useAuthStore } from '../store/authStore'

const FILTERS_STORAGE_KEY = 'ym_schemes_filters'
const SORT_STORAGE_KEY = 'ym_schemes_sort'

export default function Schemes() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const storedAccessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const effectiveAuthenticated = Boolean(isAuthenticated || accessToken || storedAccessToken)
  const [filters, setFilters] = useState(() => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(window.sessionStorage.getItem(FILTERS_STORAGE_KEY) || '{}')
    } catch {
      return {}
    }
  })
  const [sortBy, setSortBy] = useState(() => {
    if (typeof window === 'undefined') return 'name'
    return window.sessionStorage.getItem(SORT_STORAGE_KEY) || 'name'
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [resultsLoading, setResultsLoading] = useState(false)

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.sectors?.length || 0) +
    (filters.states?.length || 0)

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1)
      return
    }
    navigate('/')
  }

  useEffect(() => {
    const onKeyPress = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        const searchInput = document.querySelector('input[type="text"]')
        if (searchInput) {
          searchInput.focus()
        }
      }
    }

    window.addEventListener('keydown', onKeyPress)
    return () => window.removeEventListener('keydown', onKeyPress)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters || {}))
  }, [filters])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(SORT_STORAGE_KEY, sortBy || 'name')
  }, [sortBy])

  return (
    <div className="mx-auto w-full max-w-[118rem] space-y-4 sm:space-y-5">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center text-body-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
      >
        {t('common.back', { defaultValue: '← Back' })}
      </button>

      <PageHeader
        title={t('schemes.title', { defaultValue: 'Government Schemes' })}
        description={effectiveAuthenticated
          ? t('schemes.subtitle', { defaultValue: 'Discover government schemes you are eligible for' })
          : t('schemes.publicSubtitle', { defaultValue: 'Browse all government schemes' })}
        actions={
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <Badge variant="neutral" className="hidden md:inline-flex">{t('schemes.shortcutSearch', { defaultValue: 'Ctrl/Cmd + K search' })}</Badge>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 px-3 py-2 text-body-sm font-medium text-stone-700 hover:bg-stone-100 sm:w-auto"
              onClick={() => navigate(effectiveAuthenticated ? '/dashboard' : '/login')}
            >
              <Compass className="h-4 w-4" />
              {effectiveAuthenticated
                ? t('nav.dashboard', { defaultValue: 'Dashboard' })
                : t('auth.login', { defaultValue: 'Login' })}
            </button>
          </div>
        }
      />

      <div className="space-y-4 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-5 lg:space-y-0 xl:grid-cols-[19rem_minmax(0,1fr)] 2xl:grid-cols-[20rem_minmax(0,1fr)] 2xl:gap-6">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((state) => !state)}
            className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white px-4 py-3 text-body-sm font-medium text-stone-700"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              {t('schemes.filters', { defaultValue: 'Filters' })}
            </span>
            <Badge variant={activeFilterCount > 0 ? 'warning' : 'neutral'}>
              {t('schemes.activeCount', { count: activeFilterCount, defaultValue: '{{count}} active' })}
            </Badge>
          </button>

          {mobileFiltersOpen ? (
            <div className="mt-3 max-h-[70vh] overflow-y-auto">
              <SchemeFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClear={handleClearFilters}
                isLoading={resultsLoading}
              />
            </div>
          ) : null}
        </div>

        <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <div className="lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-1">
            <SchemeFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              onClear={handleClearFilters}
              isLoading={resultsLoading}
            />
          </div>
        </div>

        <div className="min-w-0">
          <SchemeResults
            filters={filters}
            sortBy={sortBy}
            onSortChange={setSortBy}
            isAuthenticated={effectiveAuthenticated}
            accessToken={accessToken}
            onLoadingChange={setResultsLoading}
          />
        </div>
      </div>
    </div>
  )
}

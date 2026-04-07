import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Compass, SlidersHorizontal } from 'lucide-react'
import SchemeFilter from '../components/schemes/SchemeFilter'
import SchemeResults from '../components/schemes/SchemeResults'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'

export default function Schemes() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isLoggedIn = Boolean(localStorage.getItem('access_token'))
  const [filters, setFilters] = useState({})
  const [sortBy, setSortBy] = useState('name')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

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

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('schemes.title', { defaultValue: 'Find Schemes' })}
        description={t('schemes.subtitle', { defaultValue: 'Discover government schemes you are eligible for' })}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{t('schemes.shortcutSearch', { defaultValue: 'Ctrl/Cmd + K search' })}</Badge>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-2 text-body-sm font-medium text-stone-700 hover:bg-stone-100"
              onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')}
            >
              <Compass className="h-4 w-4" />
              {isLoggedIn
                ? t('nav.dashboard', { defaultValue: 'Dashboard' })
                : t('auth.login', { defaultValue: 'Login' })}
            </button>
          </div>
        }
      />

      <div className="space-y-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-4 lg:space-y-0 xl:grid-cols-[20rem_minmax(0,1fr)]">
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
            <div className="mt-3">
              <SchemeFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClear={handleClearFilters}
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
            />
          </div>
        </div>

        <div className="min-w-0">
          <SchemeResults
            filters={filters}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>
      </div>
    </div>
  )
}

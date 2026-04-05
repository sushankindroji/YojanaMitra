import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Compass } from 'lucide-react'
import SchemeFilter from '../components/schemes/SchemeFilter'
import SchemeResults from '../components/schemes/SchemeResults'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'

export default function Schemes() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [filters, setFilters] = useState({})
  const [sortBy, setSortBy] = useState('name')

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
        const searchInput = document.querySelector('input[placeholder*="Search"]')
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
        title={t('schemes.title') || 'Find Schemes'}
        description={t('schemes.subtitle') || 'Discover government schemes you are eligible for'}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">Ctrl/Cmd + K search</Badge>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              onClick={() => navigate('/dashboard')}
            >
              <Compass className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[19rem_1fr]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <div className="max-h-[calc(100vh-7rem)] overflow-auto pr-1">
            <SchemeFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              onClear={handleClearFilters}
            />
          </div>
        </div>

        <div>
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

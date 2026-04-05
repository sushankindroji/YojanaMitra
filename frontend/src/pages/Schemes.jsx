import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import SchemeFilter from '../components/schemes/SchemeFilter'
import SchemeResults from '../components/schemes/SchemeResults'
import LanguageSelector from '../components/common/LanguageSelector'

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              {t('common.back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('schemes.title') || 'Find Schemes'}</h1>
              <p className="text-gray-600 text-sm mt-1">{t('schemes.subtitle') || 'Discover government schemes you are eligible for'}</p>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <SchemeFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              onClear={handleClearFilters}
            />
          </div>

          {/* Main - Results */}
          <div className="lg:col-span-3">
            <SchemeResults
              filters={filters}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

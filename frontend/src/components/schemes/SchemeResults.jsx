// frontend/src/components/schemes/SchemeResults.jsx
/**
 * SchemeResults - Main schemes list with filtering & pagination
 * Features:
 * - Display list of schemes matching filters
 * - Show SchemeCard for each
 * - Pagination (20 per page)
 * - Sort by eligibility
 * - No results message
 */

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Loader, AlertCircle } from 'lucide-react'
import SchemeCard from './SchemeCard'
import schemeService from '../../services/schemeService'

const ITEMS_PER_PAGE = 20

export default function SchemeResults({
  filters = {},
  sortBy = 'name',
  onSortChange = () => {},
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const filterKeyRef = useRef('')

  const [schemes, setSchemes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch schemes when filters, sort, or page change
  useEffect(() => {
    const filterKey = JSON.stringify({ filters, sortBy })

    if (filterKeyRef.current !== filterKey) {
      filterKeyRef.current = filterKey

      if (currentPage !== 1) {
        setCurrentPage(1)
        return
      }
    }

    fetchSchemes()
  }, [filters, sortBy, currentPage])

  const fetchSchemes = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await schemeService.getSchemes({
        search: filters.search || '',
        sector: filters.sectors?.join(',') || '',
        state: filters.states?.join(',') || '',
        skip: (currentPage - 1) * ITEMS_PER_PAGE,
        limit: ITEMS_PER_PAGE,
      })

      let schemesData = response.data.schemes || []
      const total = response.data.total ?? schemesData.length

      // Sort based on sortBy
      if (sortBy === 'eligibility') {
        schemesData = schemesData.sort((a, b) => {
          const aScore = a.eligibility_percentage || 0
          const bScore = b.eligibility_percentage || 0
          return bScore - aScore
        })
      } else if (sortBy === 'name') {
        schemesData = schemesData.sort((a, b) =>
          (a.name_en || a.name || '').localeCompare(b.name_en || b.name || '')
        )
      } else if (sortBy === 'benefit') {
        schemesData = schemesData.sort((a, b) => {
          const aValue = a.benefit_amount ? parseInt(a.benefit_amount) : 0
          const bValue = b.benefit_amount ? parseInt(b.benefit_amount) : 0
          return bValue - aValue
        })
      }

      setSchemes(schemesData)
      setTotalCount(total)
    } catch (err) {
      console.error('Error fetching schemes:', err)
      setError(t('schemes.fetchError') || 'Failed to load schemes')
    } finally {
      setIsLoading(false)
    }
  }

  // Pagination
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE

  const handleViewDetails = (schemeId) => {
    navigate(`/schemes/${schemeId}`)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-gray-600">{t('common.loading') || 'Loading schemes...'}</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="h-10 w-10 text-red-600 mb-4" />
        <p className="text-red-800 font-medium">{error}</p>
        <button
          onClick={fetchSchemes}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  // No results state
  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-lg border border-gray-200">
        <AlertCircle className="h-10 w-10 text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium">{t('schemes.noResults') || 'No schemes found'}</p>
        <p className="text-gray-500 text-sm mt-2">
          {t('schemes.tryAdjustingFilters') || 'Try adjusting your filters'}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Results Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('schemes.availableSchemes') || 'Available Schemes'}
          </h2>
          <p className="text-gray-600 mt-2">
            {t('schemes.showing')} {totalCount} {t('schemes.schemeFound', { count: totalCount })}
          </p>
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => {
            onSortChange(e.target.value)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="eligibility">{t('schemes.sortByEligibility', { defaultValue: 'Eligibility %' })}</option>
          <option value="name">{t('schemes.sortByName', { defaultValue: 'Name A-Z' })}</option>
          <option value="benefit">{t('schemes.sortByBenefit', { defaultValue: 'Benefit Amount' })}</option>
        </select>
      </div>

      {/* Schemes Grid */}
      <div className="space-y-4">
        {schemes.map((scheme) => (
          <SchemeCard
            key={scheme.id}
            scheme={scheme}
            onViewDetails={() => handleViewDetails(scheme.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t('common.previous')}
          </button>

          {/* Page Numbers */}
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t('common.next')}
          </button>
        </div>
      )}

      {/* Page Info */}
      <div className="mt-6 text-center text-sm text-gray-600">
        {totalCount > 0
          ? `${t('schemes.showing')} ${startIdx + 1}-${Math.min(startIdx + ITEMS_PER_PAGE, totalCount)} ${t('schemes.of')} ${totalCount}`
          : t('schemes.noResults') || 'No schemes found'}
      </div>
    </div>
  )
}

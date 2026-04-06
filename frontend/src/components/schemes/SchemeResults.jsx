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
import { AlertCircle, Loader, SearchX } from 'lucide-react'
import SchemeCard from './SchemeCard'
import schemeService from '../../services/schemeService'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Select from '../ui/Select'
import Skeleton from '../ui/Skeleton'

const ITEMS_PER_PAGE = 20

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const items = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) items.push('...')
  for (let page = start; page <= end; page += 1) {
    items.push(page)
  }
  if (end < totalPages - 1) items.push('...')

  items.push(totalPages)
  return items
}

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
  const paginationItems = getPaginationItems(currentPage, totalPages)

  const handleViewDetails = (schemeId) => {
    if (!schemeId) return
    navigate(`/schemes/${schemeId}`)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <div className="flex items-center justify-center gap-2 text-body-sm text-stone-500">
          <Loader className="h-4 w-4 animate-spin" />
          {t('common.loading', { defaultValue: 'Loading schemes...' })}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center border border-red-200 bg-red-50 py-14 text-center">
        <AlertCircle className="h-9 w-9 text-red-600" />
        <p className="mt-3 font-medium text-red-800">{error}</p>
        <Button onClick={fetchSchemes} className="mt-4" variant="danger">
          {t('common.retry', { defaultValue: 'Retry' })}
        </Button>
      </Card>
    )
  }

  // No results state
  if (totalCount === 0) {
    return (
      <Card className="flex flex-col items-center justify-center border border-stone-200 bg-stone-50 py-14 text-center">
        <SearchX className="h-9 w-9 text-stone-500" />
        <p className="mt-3 font-medium text-stone-700">{t('schemes.noResults', { defaultValue: 'No schemes found' })}</p>
        <p className="mt-1 text-body-sm text-stone-500">
          {t('schemes.tryAdjustingFilters', { defaultValue: 'Try adjusting your filters' })}
        </p>
      </Card>
    )
  }

  return (
    <div>
      {/* Results Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-h2 font-medium text-stone-900">
            {t('schemes.availableSchemes', { defaultValue: 'Available Schemes' })}
          </h2>
          <p className="mt-1 text-body-sm text-stone-600">
            {totalCount} {totalCount === 1 ? 'scheme found' : 'schemes found'}
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="w-full max-w-[14rem]">
          <Select
            value={sortBy}
            onChange={(value) => onSortChange(value)}
            options={[
              { value: 'eligibility', label: t('schemes.sortByEligibility', { defaultValue: 'Eligibility %' }) },
              { value: 'name', label: t('schemes.sortByName', { defaultValue: 'Name A-Z' }) },
              { value: 'benefit', label: t('schemes.sortByBenefit', { defaultValue: 'Benefit Amount' }) },
            ]}
          />
        </div>
      </div>

      {/* Schemes Grid */}
      <div className="space-y-4">
        {schemes.map((scheme) => (
          <SchemeCard
            key={scheme.id || scheme.scheme_id}
            scheme={scheme}
            onViewDetails={() => handleViewDetails(scheme.id || scheme.scheme_id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            variant="ghost"
          >
            {t('common.previous', { defaultValue: 'Previous' })}
          </Button>

          {/* Page Numbers */}
          <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
            {paginationItems.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-1 text-body-sm font-medium text-stone-500">
                    ...
                  </span>
                )
              }

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 min-w-[2.25rem] rounded-lg px-2 text-body-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-orange-600 text-white'
                      : 'border border-stone-300 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>

          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            variant="ghost"
          >
            {t('common.next', { defaultValue: 'Next' })}
          </Button>
        </div>
      )}

      {/* Page Info */}
      <div className="mt-4 text-center text-caption text-stone-500">
        {totalCount > 0
          ? `Showing ${startIdx + 1}-${Math.min(startIdx + ITEMS_PER_PAGE, totalCount)} of ${totalCount}`
          : t('schemes.noResults', { defaultValue: 'No schemes found' })}
      </div>
    </div>
  )
}

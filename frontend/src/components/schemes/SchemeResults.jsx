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
  isAuthenticated = false,
  accessToken = null,
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const filterKeyRef = useRef('')

  const [schemes, setSchemes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [didTriggerEligibilityRefresh, setDidTriggerEligibilityRefresh] = useState(false)
  const [didHydrateMissingEligibility, setDidHydrateMissingEligibility] = useState(false)
  const storedAccessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const effectiveAuthenticated = Boolean(isAuthenticated || accessToken || storedAccessToken)

  const hasEligibilityFields = (scheme) => {
    if (!scheme || typeof scheme !== 'object') return false

    const hasScore = scheme.eligibility_score !== undefined && scheme.eligibility_score !== null
      || scheme.eligibility_percentage !== undefined && scheme.eligibility_percentage !== null
    const hasStatus = scheme.is_eligible !== undefined && scheme.is_eligible !== null
      || scheme.is_partially_eligible !== undefined && scheme.is_partially_eligible !== null
    const hasConditions = Array.isArray(scheme.condition_results)
      ? scheme.condition_results.length > 0
      : typeof scheme.condition_results === 'object' && scheme.condition_results !== null

    return hasScore || hasStatus || hasConditions
  }

  useEffect(() => {
    if (!effectiveAuthenticated && sortBy === 'eligibility') {
      onSortChange('name')
    }
  }, [effectiveAuthenticated, onSortChange, sortBy])

  useEffect(() => {
    setDidTriggerEligibilityRefresh(false)
    setDidHydrateMissingEligibility(false)
  }, [effectiveAuthenticated])

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
  }, [currentPage, filters, i18n?.language, i18n?.resolvedLanguage, isAuthenticated, sortBy])

  const fetchSchemes = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const authToken = accessToken || localStorage.getItem('access_token') || null
      const requestParams = {
        search: filters.search || '',
        sector: filters.sectors?.join(',') || '',
        state: filters.states?.join(',') || '',
        skip: (currentPage - 1) * ITEMS_PER_PAGE,
        limit: ITEMS_PER_PAGE,
        lang: (i18n?.resolvedLanguage || i18n?.language || 'en').split('-')[0],
      }

      const response = await schemeService.getPublicSchemes(requestParams, effectiveAuthenticated ? authToken : null)

      let schemesData = response.data.schemes || []
      const total = response.data.total ?? schemesData.length

      // If logged in and all cards lack eligibility values, trigger one refresh
      // of computed eligibility and refetch once.
      if (effectiveAuthenticated && !didTriggerEligibilityRefresh && schemesData.length > 0) {
        const hasEligibility = schemesData.some((scheme) => hasEligibilityFields(scheme))

        if (!hasEligibility) {
          try {
            await schemeService.checkEligibilitySafe(true, authToken)
            const refreshedAuthToken = localStorage.getItem('access_token') || authToken
            const refreshed = await schemeService.getPublicSchemes(requestParams, refreshedAuthToken)
            schemesData = refreshed.data.schemes || schemesData
            setDidTriggerEligibilityRefresh(true)
          } catch (refreshError) {
            console.warn('Eligibility refresh fallback failed', refreshError)
          }
        }
      }

      if (effectiveAuthenticated && !didHydrateMissingEligibility && schemesData.length > 0) {
        const missingIds = schemesData
          .filter((scheme) => !hasEligibilityFields(scheme))
          .map((scheme) => scheme.id || scheme.scheme_id)
          .filter(Boolean)

        if (missingIds.length > 0) {
          try {
            const hydratedAuthToken = localStorage.getItem('access_token') || authToken
            const eligibilityResponses = await Promise.all(
              missingIds.map(async (schemeId) => {
                try {
                  const eligibilityResponse = await schemeService.getPublicSchemeEligibility(schemeId, hydratedAuthToken)
                  return { schemeId, payload: eligibilityResponse.data || {} }
                } catch {
                  return { schemeId, payload: null }
                }
              })
            )

            const hydratedBySchemeId = new Map()
            for (const item of eligibilityResponses) {
              if (!item.payload) continue

              const payload = item.payload
              const userResult = payload.user_result || {}
              const score = payload.eligible_percentage ?? payload.eligibility_percentage ?? payload.eligibility_score
              const hasScore = score !== undefined && score !== null

              const statusFromConditions = Array.isArray(payload.conditions)
                ? payload.conditions.map((condition) => {
                    const result = String(condition?.status || '').toLowerCase()
                    const status = result === 'met' ? 'PASS' : result === 'not_met' ? 'FAIL' : 'UNKNOWN'
                    return {
                      status,
                      label_en: `${condition?.label || 'Condition'}: ${condition?.value || ''}`.trim(),
                      is_mandatory: true,
                    }
                  })
                : []

              if (userResult.available || hasScore || statusFromConditions.length > 0) {
                hydratedBySchemeId.set(String(item.schemeId), {
                  eligibility_score: payload.eligibility_score,
                  eligibility_percentage: payload.eligible_percentage ?? payload.eligibility_percentage,
                  is_eligible: payload.is_eligible,
                  is_partially_eligible: payload.is_partially_eligible,
                  condition_results: payload.condition_results || statusFromConditions,
                })
              }
            }

            if (hydratedBySchemeId.size > 0) {
              schemesData = schemesData.map((scheme) => {
                const schemeId = String(scheme.id || scheme.scheme_id || '')
                if (!schemeId || !hydratedBySchemeId.has(schemeId)) return scheme
                return {
                  ...scheme,
                  ...hydratedBySchemeId.get(schemeId),
                }
              })
            }

            setDidHydrateMissingEligibility(true)
          } catch (hydrateError) {
            console.warn('Eligibility hydration fallback failed', hydrateError)
          }
        }
      }

      // Sort based on sortBy
      if (sortBy === 'eligibility' && effectiveAuthenticated) {
        schemesData = schemesData.sort((a, b) => {
          const aScore = a.eligibility_percentage || 0
          const bScore = b.eligibility_percentage || 0
          return bScore - aScore
        })
      } else if (sortBy === 'name') {
        schemesData = schemesData.sort((a, b) =>
          (a.name || a.name_en || '').localeCompare(b.name || b.name_en || '')
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
      setError(t('schemes.fetchError', { defaultValue: 'Failed to load schemes' }))
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-h2 font-medium text-stone-900">
            {t('schemes.availableSchemes', { defaultValue: 'Available Schemes' })}
          </h2>
          <p className="mt-1 text-body-sm text-stone-600">
            {totalCount === 1
              ? t('schemes.schemeFoundSingle', { count: totalCount, defaultValue: '1 scheme found' })
              : t('schemes.schemeFoundPlural', { count: totalCount, defaultValue: '{{count}} schemes found' })}
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="w-full sm:w-auto sm:min-w-[13rem] sm:max-w-[14rem]">
          <Select
            value={sortBy}
            onChange={(value) => onSortChange(value)}
            options={effectiveAuthenticated
              ? [
                  { value: 'eligibility', label: t('schemes.sortByEligibility', { defaultValue: 'Eligibility %' }) },
                  { value: 'name', label: t('schemes.sortByName', { defaultValue: 'Name A-Z' }) },
                  { value: 'benefit', label: t('schemes.sortByBenefit', { defaultValue: 'Benefit Amount' }) },
                ]
              : [
                  { value: 'name', label: t('schemes.sortByName', { defaultValue: 'Name A-Z' }) },
                  { value: 'benefit', label: t('schemes.sortByBenefit', { defaultValue: 'Benefit Amount' }) },
                ]}
          />
        </div>
      </div>

      <Card className={`mb-4 ${effectiveAuthenticated ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-stone-50'}`}>
        <p className={`text-body-sm ${effectiveAuthenticated ? 'text-emerald-900' : 'text-stone-700'}`}>
          {effectiveAuthenticated
            ? t('schemes.personalizedModeNote', {
                defaultValue: 'Personalized mode is active. Match score, eligibility details, and save options are shown using your profile data.',
              })
            : t('schemes.publicModeNote', {
                defaultValue: 'Public mode is active. You can browse scheme details, benefits, and official portals without login. Personal eligibility appears after sign in.',
              })}
        </p>
      </Card>

      {/* Schemes Grid */}
      <div className="space-y-4">
        {schemes.map((scheme) => (
          <SchemeCard
            key={scheme.id || scheme.scheme_id}
            scheme={scheme}
            isAuthenticated={effectiveAuthenticated}
            isEligible={
              effectiveAuthenticated
                ? scheme.is_eligible === true || scheme.is_eligible === 1 || scheme.is_eligible === '1'
                  ? true
                  : scheme.is_eligible === false || scheme.is_eligible === 0 || scheme.is_eligible === '0'
                    ? false
                    : scheme.is_partially_eligible === true || scheme.is_partially_eligible === 1 || scheme.is_partially_eligible === '1'
                      ? false
                      : undefined
                : undefined
            }
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
          ? t('schemes.showingRange', {
              from: startIdx + 1,
              to: Math.min(startIdx + ITEMS_PER_PAGE, totalCount),
              total: totalCount,
              defaultValue: 'Showing {{from}}-{{to}} of {{total}}',
            })
          : t('schemes.noResults', { defaultValue: 'No schemes found' })}
      </div>
    </div>
  )
}

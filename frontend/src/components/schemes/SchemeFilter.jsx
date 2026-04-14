// frontend/src/components/schemes/SchemeFilter.jsx
/**
 * SchemeFilter - Sidebar filter for schemes
 * Features:
 * - Filter by sector
 * - Filter by state
 * - Search by name
 * - Apply/clear filters
 * - Show active filter count
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, ChevronDown, Loader2 } from 'lucide-react'
import Badge from '../ui/Badge'
import Card from '../ui/Card'

const SECTORS = [
  'Agriculture',
  'Education',
  'Health',
  'Employment',
  'Business',
  'Housing',
  'Social Security',
  'Infrastructure',
  'Energy',
  'Environment',
]

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

export default function SchemeFilter({
  filters = {},
  onFilterChange,
  onClear,
  isLoading = false,
}) {
  const { t } = useTranslation()
  const [localFilters, setLocalFilters] = useState(filters)
  const [searchInput, setSearchInput] = useState(filters.search || '')
  const [expandedSections, setExpandedSections] = useState({
    sector: false,
    state: false,
    search: true,
  })

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters)
    setSearchInput(filters.search || '')
  }, [filters])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalizedSearch = searchInput.trim()
      const nextSearch = normalizedSearch.length >= 2 ? normalizedSearch : ''
      const currentSearch = String(localFilters.search || '')
      if (currentSearch === nextSearch) return

      const updated = { ...localFilters, search: nextSearch }
      setLocalFilters(updated)
      onFilterChange(updated)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput, localFilters, onFilterChange])

  const handleSearchChange = (value) => {
    setSearchInput(value)
  }

  const handleSectorToggle = (sector) => {
    const sectors = localFilters.sectors || []
    const updated = sectors.includes(sector)
      ? sectors.filter((s) => s !== sector)
      : [...sectors, sector]

    const newFilters = { ...localFilters, sectors: updated }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleStateToggle = (state) => {
    const states = localFilters.states || []
    const updated = states.includes(state)
      ? states.filter((s) => s !== state)
      : [...states, state]

    const newFilters = { ...localFilters, states: updated }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const activeFilterCount =
    (searchInput.trim() ? 1 : 0) +
    (localFilters.sectors?.length || 0) +
    (localFilters.states?.length || 0)

  const activeCountLabel = t('schemes.activeCount', { count: activeFilterCount, defaultValue: '{{count}} active' })
  const activeFiltersLabel =
    activeFilterCount === 1
      ? t('schemes.activeFilterSingle', { defaultValue: '1 active filter' })
      : t('schemes.activeFilterPlural', { count: activeFilterCount, defaultValue: '{{count}} active filters' })

  return (
    <Card className="w-full border border-stone-200 p-4 sm:p-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-2 sm:mb-6 sm:items-center">
        <h3 className="text-h3 font-medium text-stone-900">
          {t('schemes.filter', { defaultValue: 'Filter' })}
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="neutral">{activeCountLabel}</Badge>
          {activeFilterCount > 0 ? (
            <button
              onClick={onClear}
              className="text-body-sm text-orange-700 hover:text-orange-800 font-medium flex items-center gap-1"
            >
              <X size={16} />
              {t('common.clearAll', { defaultValue: 'Clear all' })}
            </button>
          ) : null}
        </div>
      </div>

      {/* Active Filter Count */}
      {activeFilterCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
          <p className="text-body-sm text-orange-800">
            {activeFiltersLabel}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-5 sm:mb-6">
        <button
          onClick={() => toggleSection('search')}
          className="w-full flex items-center justify-between py-3 px-4 bg-stone-50 hover:bg-stone-100 rounded-lg font-medium text-stone-900 transition-colors mb-3"
        >
          <span className="inline-flex items-center gap-2">
            <span>{t('common.search', { defaultValue: 'Search' })}</span>
            <span className="rounded-full bg-orange-600 px-2 py-0.5 text-caption text-white">{searchInput.trim() ? 1 : 0}</span>
          </span>
          {expandedSections.search ? <ChevronDown size={18} /> : <ChevronDown size={18} className="rotate-180" />}
        </button>

        {expandedSections.search && (
          <div>
            <div className="flex h-10 items-center rounded-xl border border-stone-300 bg-white px-3 focus-within:border-orange-500 focus-within:ring-[3px] focus-within:ring-orange-500/20">
              <Search className="mr-2 h-4 w-4 text-stone-500" aria-hidden="true" />
              <input
                type="text"
                placeholder={t('schemes.searchByName', { defaultValue: 'Search scheme name...' })}
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-10 w-full bg-transparent text-body text-stone-900 placeholder:text-stone-400 focus:outline-none"
              />
              {isLoading && searchInput.trim().length >= 2 ? (
                <Loader2 className="h-4 w-4 animate-spin text-stone-500" aria-label="Searching" />
              ) : null}
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="ml-1 rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-100"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {searchInput.trim().length > 0 && searchInput.trim().length < 2 ? (
              <p className="mt-1 text-caption text-amber-700">Type at least 2 characters to search</p>
            ) : null}
            {isLoading && searchInput.trim().length >= 2 ? (
              <p className="mt-1 text-caption text-stone-500">Searching...</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Sector Filter */}
      <div className="mb-5 sm:mb-6">
        <button
          onClick={() => toggleSection('sector')}
          className="w-full flex items-center justify-between py-3 px-4 bg-stone-50 hover:bg-stone-100 rounded-lg font-medium text-stone-900 transition-colors"
        >
          <span>{t('schemes.sector', { defaultValue: 'Sector' })}</span>
          <span className="text-caption bg-orange-600 text-white px-2 py-1 rounded-full">
            {localFilters.sectors?.length || 0}
          </span>
        </button>

        {expandedSections.sector && (
          <div className="mt-3 space-y-2">
            {SECTORS.map((sector) => (
              <label key={sector} className="flex items-center gap-3 cursor-pointer rounded-lg border border-transparent p-2 hover:border-orange-200 hover:bg-orange-50">
                <input
                  type="checkbox"
                  checked={(localFilters.sectors || []).includes(sector)}
                  onChange={() => handleSectorToggle(sector)}
                  className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-300"
                />
                <span className="text-body-sm text-stone-700">{sector}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* State Filter */}
      <div>
        <button
          onClick={() => toggleSection('state')}
          className="w-full flex items-center justify-between py-3 px-4 bg-stone-50 hover:bg-stone-100 rounded-lg font-medium text-stone-900 transition-colors"
        >
          <span>{t('schemes.state', { defaultValue: 'State' })}</span>
          <span className="text-caption bg-orange-600 text-white px-2 py-1 rounded-full">
            {localFilters.states?.length || 0}
          </span>
        </button>

        {expandedSections.state && (
          <div className="mt-3 space-y-2 max-h-52 overflow-y-auto sm:max-h-60 md:max-h-72 lg:max-h-[22rem]">
            {STATES.map((state) => (
              <label key={state} className="flex items-center gap-3 cursor-pointer rounded-lg border border-transparent p-2 hover:border-orange-200 hover:bg-orange-50">
                <input
                  type="checkbox"
                  checked={(localFilters.states || []).includes(state)}
                  onChange={() => handleStateToggle(state)}
                  className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-300"
                />
                <span className="text-body-sm text-stone-700">{state}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

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
import { Search, X, ChevronDown } from 'lucide-react'

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
}) {
  const { t } = useTranslation()
  const [localFilters, setLocalFilters] = useState(filters)
  const [expandedSections, setExpandedSections] = useState({
    sector: true,
    state: true,
    search: true,
  })

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleSearchChange = (value) => {
    const updated = { ...localFilters, search: value }
    setLocalFilters(updated)
    onFilterChange(updated)
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
    (localFilters.search ? 1 : 0) +
    (localFilters.sectors?.length || 0) +
    (localFilters.states?.length || 0)

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          {t('schemes.filter') || 'Filter Schemes'}
        </h3>
        {activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <X size={16} />
            {t('common.clear')}
          </button>
        )}
      </div>

      {/* Active Filter Count */}
      {activeFilterCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-blue-800">
            {t('common.active')} {activeFilterCount} {t('common.filter', { count: activeFilterCount })}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('search')}
          className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg font-medium text-gray-900 transition-colors mb-3"
        >
          <span>{t('common.search') || 'Search'}</span>
          {expandedSections.search ? <ChevronDown size={18} /> : <ChevronDown size={18} className="rotate-180" />}
        </button>

        {expandedSections.search && (
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('schemes.searchByName') || 'Search scheme name...'}
              value={localFilters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Sector Filter */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('sector')}
          className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg font-medium text-gray-900 transition-colors"
        >
          <span>{t('schemes.sector') || 'Sector'}</span>
          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
            {localFilters.sectors?.length || 0}
          </span>
        </button>

        {expandedSections.sector && (
          <div className="mt-3 space-y-2">
            {SECTORS.map((sector) => (
              <label key={sector} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={(localFilters.sectors || []).includes(sector)}
                  onChange={() => handleSectorToggle(sector)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">{sector}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* State Filter */}
      <div>
        <button
          onClick={() => toggleSection('state')}
          className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg font-medium text-gray-900 transition-colors"
        >
          <span>{t('schemes.state') || 'State'}</span>
          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
            {localFilters.states?.length || 0}
          </span>
        </button>

        {expandedSections.state && (
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {STATES.map((state) => (
              <label key={state} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={(localFilters.states || []).includes(state)}
                  onChange={() => handleStateToggle(state)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">{state}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

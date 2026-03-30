import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import LanguageSelector from '../components/common/LanguageSelector'
import { schemeService } from '../services/schemeService'

export default function Schemes() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [schemes, setSchemes] = useState([])
  const [eligibleSchemes, setEligibleSchemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        setLoading(true)
        
        // Fetch all schemes
        const allResponse = await schemeService.getSchemes({ limit: 100 })
        const allSchemesData = allResponse.data.schemes || []
        setSchemes(allSchemesData)

        // Fetch eligible schemes
        try {
          const eligibleResponse = await schemeService.getEligibleSchemes({ limit: 100 })
          const eligibleData = eligibleResponse.data.schemes || []
          setEligibleSchemes(eligibleData)
        } catch (error) {
          // If eligible endpoint fails, just use empty list
          setEligibleSchemes([])
        }

      } catch (error) {
        console.error('Failed to fetch schemes:', error)
        toast.error('Failed to load schemes')
      } finally {
        setLoading(false)
      }
    }

    fetchSchemes()
  }, [])

  // Filter schemes based on selected filter and search query
  let filteredSchemes = filter === 'eligible' ? eligibleSchemes : schemes
  
  if (search.trim()) {
    filteredSchemes = filteredSchemes.filter((s) =>
      s.name_en?.toLowerCase().includes(search.toLowerCase()) ||
      s.description_en?.toLowerCase().includes(search.toLowerCase()) ||
      s.sector?.toLowerCase().includes(search.toLowerCase())
    )
  }

  if (loading) return <div className="flex items-center justify-center h-screen">{t('common.loading')}</div>

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="tricolor-bar"></div>

      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 mr-4"
            >
              ← {t('common.back')}
            </button>
            <h2 className="text-2xl font-bold text-[#1A3A6B]">{t('schemes.title')}</h2>
          </div>
          <LanguageSelector />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={t('schemes.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-full font-semibold transition ${
              filter === 'all'
                ? 'btn-primary'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-500'
            }`}
          >
            {t('schemes.allSchemes')} ({schemes.length})
          </button>
          <button
            onClick={() => setFilter('eligible')}
            className={`px-6 py-2 rounded-full font-semibold transition ${
              filter === 'eligible'
                ? 'btn-primary'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-500'
            }`}
          >
            {t('schemes.eligible')} ({eligibleSchemes.length})
          </button>
        </div>

        {/* Schemes Grid */}
        {filteredSchemes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchemes.map((scheme) => (
              <div key={scheme.id} className="card hover:shadow-lg transition">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">{scheme.name_en}</h3>
                    {scheme.sector && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full mb-2">
                        {scheme.sector}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{scheme.description_en}</p>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  {scheme.ministry && (
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Ministry:</span> {scheme.ministry}
                    </p>
                  )}
                  {scheme.benefit_amount && (
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Benefit:</span> ₹{scheme.benefit_amount.toLocaleString()} {scheme.benefit_frequency && `(${scheme.benefit_frequency.toLowerCase()})`}
                    </p>
                  )}
                  {scheme.application_mode && (
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Mode:</span> {scheme.application_mode}
                    </p>
                  )}
                </div>

                {/* Button */}
                <button className="btn-secondary w-full text-sm">View Details</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              {search ? 'No schemes found matching your search' : 'No schemes available'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="btn-primary"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

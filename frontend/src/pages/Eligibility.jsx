import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi'
import LanguageSelector from '../components/common/LanguageSelector'
import SchemeCard from '../components/schemes/SchemeCard'
import schemeService from '../services/schemeService'

export default function Eligibility() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [eligibleSchemes, setEligibleSchemes] = useState([])
  const [partiallyEligibleSchemes, setPartiallyEligibleSchemes] = useState([])
  const [activeTab, setActiveTab] = useState('eligible')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [sectors, setSectors] = useState([])

  // Fetch eligible schemes on mount
  useEffect(() => {
    fetchEligibleSchemes()
  }, [])

  // Extract unique sectors
  useEffect(() => {
    const allSchemes = [...eligibleSchemes, ...partiallyEligibleSchemes]
    const uniqueSectors = [...new Set(allSchemes.map(s => s.sector))].filter(Boolean).sort()
    setSectors(uniqueSectors)
  }, [eligibleSchemes, partiallyEligibleSchemes])

  const fetchEligibleSchemes = async () => {
    try {
      setLoading(true)
      
      // Fetch fully eligible schemes
      const eligibleResponse = await schemeService.getEligibleSchemes({ limit: 100 })
      setEligibleSchemes(eligibleResponse.data.schemes || [])

      // Fetch partially eligible schemes
      const partialResponse = await schemeService.getPartiallyEligibleSchemes({ limit: 100 })
      setPartiallyEligibleSchemes(partialResponse.data.schemes || [])

    } catch (error) {
      console.error('Failed to fetch schemes:', error)
      toast.error('Failed to load matching schemes')
    } finally {
      setLoading(false)
    }
  }

  const handleRunCheck = async () => {
    try {
      setChecking(true)
      await schemeService.checkEligibility()
      toast.success('Eligibility check completed!')
      await fetchEligibleSchemes()
    } catch (error) {
      console.error('Failed to run check:', error)
      toast.error('Failed to run eligibility check')
    } finally {
      setChecking(false)
    }
  }

  // Filter schemes based on selected tab and sector
  const getCurrentSchemes = () => {
    const schemes = activeTab === 'eligible' ? eligibleSchemes : partiallyEligibleSchemes
    return sectorFilter === 'all'
      ? schemes
      : schemes.filter(s => s.sector === sectorFilter)
  }

  const currentSchemes = getCurrentSchemes()
  const totalEligible = eligibleSchemes.length
  const totalPartial = partiallyEligibleSchemes.length
  const totalBenefit = eligibleSchemes.reduce((sum, s) => sum + (s.benefit_amount || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F7FA]">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-[#1A3A6B] border-t-orange-500 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-700">{t('eligibility.finding')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="tricolor-bar"></div>

      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition"
              title="Back to Dashboard"
            >
              <FiArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-[#1A3A6B]">{t('eligibility.title')}</h1>
          </div>

          <button
            onClick={handleRunCheck}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A3A6B] text-white rounded-lg hover:bg-[#2A5A9B] transition disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{t('eligibility.recheck')}</span>
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-600 font-semibold mb-2">{t('eligibility.fullyEligible')}</p>
            <p className="text-4xl font-bold text-green-600">{totalEligible}</p>
            <p className="text-xs text-gray-500 mt-2">{t('eligibility.fullyEligibleDesc')}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-orange-500">
            <p className="text-sm text-gray-600 font-semibold mb-2">{t('eligibility.partiallyEligible')}</p>
            <p className="text-4xl font-bold text-orange-600">{totalPartial}</p>
            <p className="text-xs text-gray-500 mt-2">{t('eligibility.partiallyEligibleDesc')}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 font-semibold mb-2">{t('eligibility.totalBenefit')}</p>
            <p className="text-4xl font-bold text-blue-600">
              {totalBenefit > 0 ? `₹${(totalBenefit / 100000).toFixed(1)}L+` : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-2">Combined annual/one-time benefits</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('eligible')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              activeTab === 'eligible'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Fully Eligible ({totalEligible})
          </button>
          <button
            onClick={() => setActiveTab('partial')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              activeTab === 'partial'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Partially Eligible ({totalPartial})
          </button>
        </div>

        {/* Sector Filter */}
        {sectors.length > 0 && (
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Filter by Sector:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSectorFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  sectorFilter === 'all'
                    ? 'bg-[#1A3A6B] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-500'
                }`}
              >
                All Sectors ({eligibleSchemes.length + partiallyEligibleSchemes.length})
              </button>
              {sectors.map(sector => {
                const count = currentSchemes.filter(s => s.sector === sector).length
                return (
                  <button
                    key={sector}
                    onClick={() => setSectorFilter(sector)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      sectorFilter === sector
                        ? 'bg-[#1A3A6B] text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {sector} ({eligibleSchemes.filter(s => s.sector === sector).length + partiallyEligibleSchemes.filter(s => s.sector === sector).length})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Schemes List */}
        <div>
          {currentSchemes.length > 0 ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Showing {currentSchemes.length} scheme{currentSchemes.length !== 1 ? 's' : ''} 
                {sectorFilter !== 'all' ? ` in ${sectorFilter}` : ''}
              </p>
              <div>
                {currentSchemes.map(scheme => (
                  <SchemeCard
                    key={scheme.scheme_id}
                    scheme={scheme}
                    isEligible={activeTab === 'eligible'}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
              <p className="text-lg text-gray-600 font-semibold mb-2">
                {activeTab === 'eligible'
                  ? 'No fully eligible schemes found'
                  : 'No partially eligible schemes found'}
              </p>
              <p className="text-gray-500 mb-6">
                {activeTab === 'eligible'
                  ? 'Try filling out more profile information to match more schemes.'
                  : 'You do not partially qualify for any schemes.'}
              </p>
              {activeTab === 'eligible' && (
                <button
                  onClick={() => navigate('/profile')}
                  className="btn-primary"
                >
                  Complete Your Profile
                </button>
              )}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-[#1A3A6B] mb-3">💡 How It Works</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ <strong>Fully Eligible:</strong> You meet all the mandatory requirements</li>
            <li>⚠️ <strong>Partially Eligible:</strong> You meet some requirements, may qualify with additional documents</li>
            <li>💰 <strong>Benefit Amount:</strong> Schemes are ranked by highest benefit amount</li>
            <li>📋 <strong>How to Apply:</strong> Click "How to Apply" for step-by-step instructions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

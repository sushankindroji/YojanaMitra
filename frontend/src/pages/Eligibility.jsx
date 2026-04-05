import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { ArrowLeft, RefreshCw, Wallet } from 'lucide-react'
import SchemeCard from '../components/schemes/SchemeCard'
import schemeService from '../services/schemeService'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'

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

  const normalizeScore = (value) => {
    const score = Number(value || 0)
    return score > 0 && score <= 1 ? Math.round(score * 100) : Math.round(score)
  }

  const normalizeScheme = (scheme) => {
    const eligibilityPercentage = normalizeScore(
      scheme.eligibility_percentage ?? scheme.eligibility_score
    )

    const isEligible = Boolean(scheme.is_eligible) || eligibilityPercentage >= 80
    const isPartiallyEligible =
      Boolean(scheme.is_partially_eligible) || (!isEligible && eligibilityPercentage >= 10)

    return {
      ...scheme,
      id: scheme.id || scheme.scheme_id,
      scheme_id: scheme.scheme_id || scheme.id,
      name_en: scheme.name_en || scheme.scheme_name || scheme.name,
      description_en: scheme.description_en || scheme.description || '',
      benefit_amount: Number(scheme.benefit_amount || 0),
      benefit_type: scheme.benefit_type || scheme.benefitType || '',
      official_portal_url: scheme.official_portal_url || scheme.official_website || '',
      eligibility_percentage: eligibilityPercentage,
      is_eligible: isEligible,
      is_partially_eligible: isPartiallyEligible,
      condition_results: scheme.condition_results || [],
    }
  }

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

      let eligible = []
      let partial = []

      try {
        const recommendationResponse = await schemeService.getEligibilityRecommendations({
          limit: 100,
          min_score: 0.3,
        })

        const recommendations = (recommendationResponse.data.schemes || []).map(normalizeScheme)
        eligible = recommendations.filter((scheme) => scheme.is_eligible)
        partial = recommendations.filter((scheme) => scheme.is_partially_eligible && !scheme.is_eligible)
      } catch (recommendationError) {
        console.warn(
          'Recommendation endpoint failed, falling back to stored results:',
          recommendationError
        )
      }

      if (eligible.length === 0 && partial.length === 0) {
        const eligibleResponse = await schemeService.getEligibleSchemes({ limit: 100 })
        const partialResponse = await schemeService.getPartiallyEligibleSchemes({ limit: 100 })
        eligible = (eligibleResponse.data.schemes || []).map(normalizeScheme)
        partial = (partialResponse.data.schemes || []).map(normalizeScheme)
      }

      setEligibleSchemes(eligible)
      setPartiallyEligibleSchemes(partial)

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
      await schemeService.checkEligibility(true)
      toast.success('Eligibility check completed!')
    } catch (error) {
      console.error('Failed to run check:', error)
      toast.warning(error.response?.data?.detail || 'Using the latest recommendations instead')
    } finally {
      await fetchEligibleSchemes()
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
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <p className="text-center text-sm text-stone-500">{t('eligibility.finding')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('eligibility.title')}
        description="See all schemes where you qualify fully or partially based on your latest profile and documents."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
            <Button
              onClick={handleRunCheck}
              loading={checking}
              disabled={checking}
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              {t('eligibility.recheck')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-white">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-700">{t('eligibility.fullyEligible')}</p>
          <p className="mt-2 text-4xl font-bold text-green-700">{totalEligible}</p>
          <p className="mt-1 text-xs text-green-800/80">{t('eligibility.fullyEligibleDesc')}</p>
        </Card>

        <Card className="border border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">{t('eligibility.partiallyEligible')}</p>
          <p className="mt-2 text-4xl font-bold text-amber-700">{totalPartial}</p>
          <p className="mt-1 text-xs text-amber-800/80">{t('eligibility.partiallyEligibleDesc')}</p>
        </Card>

        <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{t('eligibility.totalBenefit')}</p>
          <p className="mt-2 flex items-center gap-1 text-4xl font-bold text-blue-700">
            <Wallet className="h-7 w-7" />
            {totalBenefit > 0 ? `Rs ${(totalBenefit / 100000).toFixed(1)}L+` : 'N/A'}
          </p>
          <p className="mt-1 text-xs text-blue-800/80">Combined annual/one-time benefits</p>
        </Card>
      </div>

      <Card className="border border-stone-200 p-0">
        <div className="border-b border-stone-200 px-2">
          <div className="flex flex-wrap gap-1 p-2">
            <button
              onClick={() => setActiveTab('eligible')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'eligible'
                  ? 'bg-green-600 text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              Fully Eligible ({totalEligible})
            </button>
            <button
              onClick={() => setActiveTab('partial')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'partial'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              Partially Eligible ({totalPartial})
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {sectors.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Filter by Sector</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSectorFilter('all')}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    sectorFilter === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'border border-stone-300 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  All ({eligibleSchemes.length + partiallyEligibleSchemes.length})
                </button>
                {sectors.map((sector) => (
                  <button
                    key={sector}
                    onClick={() => setSectorFilter(sector)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      sectorFilter === sector
                        ? 'bg-stone-900 text-white'
                        : 'border border-stone-300 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {sector} ({eligibleSchemes.filter((s) => s.sector === sector).length + partiallyEligibleSchemes.filter((s) => s.sector === sector).length})
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {currentSchemes.length > 0 ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <p className="text-sm text-stone-600">
                  Showing {currentSchemes.length} scheme{currentSchemes.length !== 1 ? 's' : ''}
                </p>
                {sectorFilter !== 'all' ? <Badge variant="neutral">Sector: {sectorFilter}</Badge> : null}
              </div>

              <div>
                {currentSchemes.map((scheme) => (
                  <SchemeCard
                    key={scheme.scheme_id}
                    scheme={scheme}
                    isEligible={activeTab === 'eligible'}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card className="border border-stone-200 py-12 text-center">
              <p className="text-lg font-semibold text-stone-700">
                {activeTab === 'eligible'
                  ? 'No fully eligible schemes found'
                  : 'No partially eligible schemes found'}
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm text-stone-500">
                {activeTab === 'eligible'
                  ? 'Try filling out more profile information to match more schemes.'
                  : 'You do not partially qualify for any schemes.'}
              </p>
              {activeTab === 'eligible' && (
                <Button
                  onClick={() => navigate('/profile', { state: { returnTo: '/eligibility' } })}
                  className="mt-5"
                >
                  Complete Your Profile
                </Button>
              )}
            </Card>
          )}
        </div>
      </Card>

      <Card className="border border-blue-200 bg-blue-50">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-800">How Eligibility Works</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-blue-900">
          <li>Fully eligible means mandatory conditions are satisfied.</li>
          <li>Partially eligible means some conditions are met and additional documents may help.</li>
          <li>Benefit value estimates are aggregated from available scheme metadata.</li>
          <li>Use View Details inside each card for specific application guidance.</li>
        </ul>
      </Card>
    </div>
  )
}

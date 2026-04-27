import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { ArrowLeft, RefreshCw, Wallet, X, Download } from 'lucide-react'
import SchemeCard from '../components/schemes/SchemeCard'
import schemeService from '../services/schemeService'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'

const LAST_CHECKED_KEY = 'ym_eligibility_last_checked'

const formatDateTime = (value) => {
  if (!value) return 'Never checked'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never checked'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Eligibility() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [eligibleSchemes, setEligibleSchemes] = useState([])
  const [partiallyEligibleSchemes, setPartiallyEligibleSchemes] = useState([])
  const [totalEligibleCount, setTotalEligibleCount] = useState(0)
  const [totalPartialCount, setTotalPartialCount] = useState(0)
  const [activeTab, setActiveTab] = useState('all')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [sectors, setSectors] = useState([])
  const [sortBy, setSortBy] = useState('match')
  const [progressPct, setProgressPct] = useState(0)
  const [progressSchemeCount, setProgressSchemeCount] = useState(0)
  const [lastCheckedAt, setLastCheckedAt] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(LAST_CHECKED_KEY) || ''
  })
  const [hasCheckedAtLeastOnce, setHasCheckedAtLeastOnce] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(window.localStorage.getItem(LAST_CHECKED_KEY))
  })
  const progressTimerRef = useRef(null)

  const normalizeScore = (value) => {
    const score = Number(value || 0)
    return score > 0 && score <= 1 ? Math.round(score * 100) : Math.round(score)
  }

  const normalizeScheme = (scheme) => {
    const eligibilityPercentage = normalizeScore(
      scheme.eligibility_percentage ?? scheme.eligibility_score
    )

    const isEligible = Boolean(scheme.is_eligible)
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

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
      }
    }
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
      let eligibleCount = 0
      let partialCount = 0

      try {
        const summaryResponse = await schemeService.getEligibilitySummary().catch(() => ({ data: {} }))
        const recommendationResponse = await schemeService.getEligibilityRecommendations({
          limit: 500,
          min_score: 0.3,
        })

        const recommendationsPayload = recommendationResponse.data || {}
        const recommendations = (recommendationsPayload.schemes || []).map(normalizeScheme)
        const summary = summaryResponse.data || {}

        eligible = recommendations.filter((scheme) => scheme.is_eligible)
        partial = recommendations.filter((scheme) => scheme.is_partially_eligible && !scheme.is_eligible)

        const apiEligibleCount = Number(recommendationsPayload.eligible_count)
        const summaryEligibleCount = Number(summary.eligible_schemes)
        const summaryPartialCount = Number(summary.partially_eligible)

        eligibleCount = Number.isFinite(apiEligibleCount) ? apiEligibleCount : eligible.length
        if (!Number.isFinite(apiEligibleCount) && Number.isFinite(summaryEligibleCount)) {
          eligibleCount = summaryEligibleCount
        }

        partialCount = Number.isFinite(summaryPartialCount) ? summaryPartialCount : partial.length
      } catch (recommendationError) {
        globalThis.logger?.warn?.(
          'Recommendation endpoint failed, falling back to stored results:',
          recommendationError
        )
      }

      if (eligible.length === 0 && partial.length === 0) {
        const eligibleResponse = await schemeService.getEligibleSchemes({ limit: 100 })
        const partialResponse = await schemeService.getPartiallyEligibleSchemes({ limit: 100 })
        const eligiblePayload = eligibleResponse.data || {}
        const partialPayload = partialResponse.data || {}

        eligible = (eligiblePayload.schemes || []).map(normalizeScheme)
        partial = (partialPayload.schemes || []).map(normalizeScheme)

        eligibleCount = Number(eligiblePayload.eligible_count ?? eligiblePayload.total ?? eligible.length)
        partialCount = Number(partialPayload.partially_eligible_count ?? partialPayload.total ?? partial.length)
      }

      setEligibleSchemes(eligible)
      setPartiallyEligibleSchemes(partial)
      setTotalEligibleCount(Number.isFinite(eligibleCount) ? eligibleCount : eligible.length)
      setTotalPartialCount(Number.isFinite(partialCount) ? partialCount : partial.length)
      if (eligible.length > 0 || partial.length > 0) {
        setHasCheckedAtLeastOnce(true)
      }

    } catch (error) {
      globalThis.logger?.error?.('Failed to fetch schemes:', error)
      toast.error('Failed to load matching schemes')
    } finally {
      setLoading(false)
    }
  }

  const handleRunCheck = async () => {
    if (checking) return

    try {
      setChecking(true)
      setProgressPct(5)
      setProgressSchemeCount(120)

      progressTimerRef.current = window.setInterval(() => {
        setProgressPct((prev) => {
          const next = Math.min(prev + 4, 95)
          return next
        })
        setProgressSchemeCount((prev) => {
          const next = Math.min(prev + 180, 4504)
          return next
        })
      }, 450)

      await schemeService.checkEligibility(true)
      setProgressPct(100)
      setProgressSchemeCount(4504)
      toast.success('Eligibility check completed!', { autoClose: 3000 })

      const nowIso = new Date().toISOString()
      setLastCheckedAt(nowIso)
      setHasCheckedAtLeastOnce(true)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_CHECKED_KEY, nowIso)
      }
    } catch (error) {
      globalThis.logger?.error?.('Failed to run check:', error)
      toast.warning(error.response?.data?.detail || 'Using the latest recommendations instead')
    } finally {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
      }
      await fetchEligibleSchemes()
      setChecking(false)
    }
  }

  const handleCancelRun = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current)
    }
    setChecking(false)
    toast.warning('Eligibility check cancelled on this screen.')
  }

  // Filter schemes based on selected tab and sector
  const highlyEligibleSchemes = useMemo(
    () => eligibleSchemes.filter((scheme) => Number(scheme.eligibility_percentage || 0) >= 85),
    [eligibleSchemes]
  )

  const oneStepAwaySchemes = useMemo(
    () => partiallyEligibleSchemes.filter((scheme) => Number(scheme.eligibility_percentage || 0) >= 70),
    [partiallyEligibleSchemes]
  )

  const getCurrentSchemes = () => {
    let schemes
    if (activeTab === 'eligible') schemes = eligibleSchemes
    else if (activeTab === 'partial') schemes = partiallyEligibleSchemes
    else if (activeTab === 'one-step') schemes = oneStepAwaySchemes
    else schemes = [...eligibleSchemes, ...partiallyEligibleSchemes]

    const bySector = sectorFilter === 'all' ? schemes : schemes.filter((s) => s.sector === sectorFilter)
    const sorted = [...bySector]

    if (sortBy === 'benefit') {
      sorted.sort((a, b) => Number(b.benefit_amount || 0) - Number(a.benefit_amount || 0))
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => String(a.name_en || '').localeCompare(String(b.name_en || '')))
    } else {
      sorted.sort((a, b) => Number(b.eligibility_percentage || 0) - Number(a.eligibility_percentage || 0))
    }

    return sorted
  }

  const currentSchemes = useMemo(getCurrentSchemes, [activeTab, eligibleSchemes, partiallyEligibleSchemes, oneStepAwaySchemes, sectorFilter, sortBy])
  const totalEligible = totalEligibleCount
  const totalPartial = totalPartialCount
  const totalOneStep = oneStepAwaySchemes.length
  const totalHighlyEligible = highlyEligibleSchemes.length
  const totalBenefit = eligibleSchemes.reduce((sum, s) => sum + (s.benefit_amount || 0), 0)

  if (!loading && !hasCheckedAtLeastOnce && totalEligible === 0 && totalPartial === 0 && !checking) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={t('eligibility.title')}
          description="Run one check to find schemes that match your profile."
        />

        <Card className="border border-stone-200 bg-stone-50 py-12 text-center">
          <p className="text-h2 font-medium text-stone-900">You haven't checked your eligibility yet</p>
          <p className="mt-2 text-body-sm text-stone-600">Checks against 4,504 government schemes</p>
          <Button className="mt-5" onClick={handleRunCheck} loading={checking}>
            Check Eligibility
          </Button>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <p className="text-center text-body-sm text-stone-500">{t('eligibility.finding')}</p>
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

      <Card className="border border-stone-200 bg-stone-50">
        <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-stone-700">
          <p>Last checked: {formatDateTime(lastCheckedAt)}</p>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4" />
            Export list
          </Button>
        </div>
      </Card>

      {checking ? (
        <Card className="border border-blue-200 bg-blue-50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-body-sm font-medium text-blue-900">
              Checking scheme {progressSchemeCount.toLocaleString('en-IN')} of 4,504...
            </p>
            <Button variant="ghost" size="sm" onClick={handleCancelRun}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
          <div className="mt-3 h-2 rounded-full bg-blue-200">
            <div className="h-2 rounded-full bg-blue-700 transition-all duration-150" style={{ width: `${progressPct}%` }} />
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-white">
          <p className="text-micro font-medium uppercase tracking-wider text-green-700">{t('eligibility.fullyEligible')}</p>
          <p className="mt-2 text-h2 font-medium text-green-700">{totalEligible}</p>
          <p className="mt-1 text-caption text-green-800/80">{t('eligibility.fullyEligibleDesc')}</p>
        </Card>

        <Card className="border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <p className="text-micro font-medium uppercase tracking-wider text-emerald-700">Highly Eligible</p>
          <p className="mt-2 text-h2 font-medium text-emerald-700">{totalHighlyEligible}</p>
          <p className="mt-1 text-caption text-emerald-800/80">Top match score candidates</p>
        </Card>

        <Card className="border border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <p className="text-micro font-medium uppercase tracking-wider text-amber-700">{t('eligibility.partiallyEligible')}</p>
          <p className="mt-2 text-h2 font-medium text-amber-700">{totalPartial}</p>
          <p className="mt-1 text-caption text-amber-800/80">{t('eligibility.partiallyEligibleDesc')}</p>
        </Card>

        <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <p className="text-micro font-medium uppercase tracking-wider text-blue-700">{t('eligibility.totalBenefit')}</p>
          <p className="mt-2 flex items-center gap-1 text-h2 font-medium text-blue-700">
            <Wallet className="h-7 w-7" />
            {totalBenefit > 0 ? `Rs ${(totalBenefit / 100000).toFixed(1)}L+` : 'N/A'}
          </p>
          <p className="mt-1 text-caption text-blue-800/80">One Step Away: {totalOneStep}</p>
        </Card>
      </div>

      <Card className="border border-stone-200 p-0">
        <div className="border-b border-stone-200 px-2">
          <div className="flex flex-wrap gap-1 p-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-4 py-2 text-body-sm font-medium transition ${
                activeTab === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              All ({eligibleSchemes.length + partiallyEligibleSchemes.length})
            </button>
            <button
              onClick={() => setActiveTab('eligible')}
              className={`rounded-lg px-4 py-2 text-body-sm font-medium transition ${
                activeTab === 'eligible'
                  ? 'bg-green-600 text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              Fully Eligible ({totalEligible})
            </button>
            <button
              onClick={() => setActiveTab('partial')}
              className={`rounded-lg px-4 py-2 text-body-sm font-medium transition ${
                activeTab === 'partial'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              Partially Eligible ({totalPartial})
            </button>
            <button
              onClick={() => setActiveTab('one-step')}
              className={`rounded-lg px-4 py-2 text-body-sm font-medium transition ${
                activeTab === 'one-step'
                  ? 'bg-blue-600 text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              One Step Away ({totalOneStep})
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">Sort:</Badge>
            <button
              type="button"
              onClick={() => setSortBy('match')}
              className={`rounded-full px-3 py-1.5 text-caption font-medium ${sortBy === 'match' ? 'bg-stone-900 text-white' : 'border border-stone-300 text-stone-700'}`}
            >
              by Match %
            </button>
            <button
              type="button"
              onClick={() => setSortBy('benefit')}
              className={`rounded-full px-3 py-1.5 text-caption font-medium ${sortBy === 'benefit' ? 'bg-stone-900 text-white' : 'border border-stone-300 text-stone-700'}`}
            >
              by Benefit Amount
            </button>
            <button
              type="button"
              onClick={() => setSortBy('name')}
              className={`rounded-full px-3 py-1.5 text-caption font-medium ${sortBy === 'name' ? 'bg-stone-900 text-white' : 'border border-stone-300 text-stone-700'}`}
            >
              by Scheme Name
            </button>
          </div>

          {sectors.length > 0 ? (
            <div>
              <p className="mb-2 text-micro font-medium uppercase tracking-wider text-stone-500">Filter by Sector</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSectorFilter('all')}
                  className={`rounded-full px-3 py-1.5 text-caption font-medium transition ${
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
                    className={`rounded-full px-3 py-1.5 text-caption font-medium transition ${
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
                <p className="text-body-sm text-stone-600">
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
              <p className="text-h3 font-medium text-stone-700">
                {activeTab === 'eligible'
                  ? 'No fully eligible schemes found'
                  : activeTab === 'partial'
                    ? 'No partially eligible schemes found'
                    : activeTab === 'one-step'
                      ? 'No one-step-away schemes found'
                      : 'No schemes found'}
              </p>
              <p className="mx-auto mt-2 max-w-xl text-body-sm text-stone-500">
                {activeTab === 'eligible'
                  ? 'Try filling out more profile information to match more schemes.'
                  : activeTab === 'partial'
                    ? 'You do not partially qualify for any schemes.'
                    : 'Run a fresh check after updating profile details.'}
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
        <h3 className="text-micro font-medium uppercase tracking-wider text-blue-800">How Eligibility Works</h3>
        <ul className="mt-3 space-y-1.5 text-body-sm text-blue-900">
          <li>Fully eligible means mandatory conditions are satisfied.</li>
          <li>Partially eligible means some conditions are met and additional documents may help.</li>
          <li>Benefit value estimates are aggregated from available scheme metadata.</li>
          <li>Use View Details inside each card for specific application guidance.</li>
        </ul>
      </Card>
    </div>
  )
}


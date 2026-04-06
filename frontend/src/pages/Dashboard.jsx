import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { ArrowRight, FileText, Fingerprint, Search, UploadCloud } from 'lucide-react'
import eligibilityService from '../services/eligibilityService'
import documentService from '../services/documentService'
import applicationService from '../services/applicationService'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import ProgressRing from '../components/ui/ProgressRing'

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  if (amount <= 0) return 'N/A'
  return `Rs ${amount.toLocaleString('en-IN')}`
}

const formatDateTime = (value) => {
  if (!value) return 'Never checked'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never checked'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const waitForJobCompletion = async (jobId, timeoutMs = 90000) => {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const response = await eligibilityService.getStatus(jobId)
    const status = response.data?.status

    if (status === 'complete') return
    if (status === 'failed') {
      throw new Error(response.data?.error || 'Eligibility run failed')
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1500))
  }

  throw new Error('Eligibility run timed out. Please try again.')
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  const [dashboard, setDashboard] = useState(null)
  const [documentsCount, setDocumentsCount] = useState(0)
  const [applicationsCount, setApplicationsCount] = useState(0)

  const loadDashboard = async () => {
    try {
      setLoading(true)

      const [dashboardResponse, docsResponse, appsStatsResponse] = await Promise.all([
        eligibilityService.getDashboard(),
        documentService.getDocuments(),
        applicationService.getApplicationStats().catch(() => ({ data: {} })),
      ])

      const dashboardPayload = dashboardResponse.data || {}
      setDashboard(dashboardPayload)

      const docs = Array.isArray(docsResponse.data) ? docsResponse.data : []
      setDocumentsCount(docs.length)

      const appStats = appsStatsResponse.data || {}
      const appCountFromStats =
        Number(appStats.total_saved || 0) +
        Number(appStats.total_started || 0) +
        Number(appStats.total_submitted || 0) +
        Number(appStats.total_acknowledged || 0)

      setApplicationsCount(
        appCountFromStats || Number(dashboardPayload?.quick_stats?.applied || 0)
      )
    } catch (error) {
      console.error('Failed to load dashboard:', error)
      toast.error('Failed to load personalized dashboard data')
      setDashboard(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const handleCheckNow = async () => {
    try {
      setChecking(true)
      const runResponse = await eligibilityService.run()
      const jobId = runResponse.data?.job_id
      if (!jobId) {
        throw new Error('No job id returned by eligibility run endpoint')
      }

      await waitForJobCompletion(jobId)
      await loadDashboard()
      toast.success('Eligibility results refreshed')
    } catch (error) {
      console.error('Eligibility refresh failed:', error)
      toast.error(error.message || 'Could not refresh eligibility now')
    } finally {
      setChecking(false)
    }
  }

  const greetingName = dashboard?.greeting_name || ''
  const welcomeTitle = greetingName
    ? `${t('dashboard.welcomeBack', { defaultValue: 'Welcome back' })}, ${greetingName}!`
    : `${t('dashboard.welcomeBack', { defaultValue: 'Welcome back' })}!`

  const completeness = Number(dashboard?.profile_completeness?.pct || 0)
  const missingFields = Array.isArray(dashboard?.profile_completeness?.missing_fields)
    ? dashboard.profile_completeness.missing_fields
    : []

  const quickStats = dashboard?.quick_stats || {}
  const insight = dashboard?.scheme_insight || {}
  const sectorBreakdown = dashboard?.sector_breakdown || {}
  const sectorEntries = Object.entries(sectorBreakdown)

  const topScheme = dashboard?.top_scheme || null
  const featuredSchemes = Array.isArray(dashboard?.featured_schemes)
    ? dashboard.featured_schemes
    : []

  const profileCardBadges = useMemo(() => {
    if (completeness >= 85) return [{ text: 'Excellent', variant: 'success' }]
    if (completeness >= 60) return [{ text: 'Good progress', variant: 'warning' }]
    return [{ text: 'Needs attention', variant: 'warning' }]
  }, [completeness])

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center">{t('common.loading')}</div>
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={welcomeTitle}
        description="Your dashboard is personalized from verified profile data and latest eligibility results."
        actions={
          <Button onClick={() => navigate('/schemes')}>
            {t('dashboard.viewSchemes', { defaultValue: 'View Schemes' })}
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-gradient-to-br from-white via-orange-50 to-green-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Profile Completion</p>
              <h2 className="mt-1 text-2xl font-bold text-stone-900">{completeness}% complete</h2>
              <p className="mt-2 max-w-xl text-sm text-stone-600">
                {dashboard?.profile_completeness?.message || 'Add missing profile fields to unlock more schemes.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profileCardBadges.map((badge) => (
                  <Badge key={badge.text} variant={badge.variant}>{badge.text}</Badge>
                ))}
                {missingFields.length > 0 ? (
                  <Badge variant="neutral">
                    Missing: {missingFields.slice(0, 2).join(', ')}{missingFields.length > 2 ? '...' : ''}
                  </Badge>
                ) : (
                  <Badge variant="success">All key fields completed</Badge>
                )}
              </div>
            </div>

            <ProgressRing value={completeness} size={108} strokeWidth={10} label="Profile" />
          </div>
        </Card>

        <Card variant="elevated" className="bg-blue-950 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">Scheme Insight</p>
          <h2 className="mt-1 text-3xl font-bold">{dashboard?.total_eligible_count || 0}</h2>
          <p className="mt-2 text-sm text-blue-100">{insight.headline || 'No eligibility run found yet.'}</p>
          <p className="mt-2 text-xs text-blue-200">{insight.highlight || 'Run eligibility check to see personalized scheme insight.'}</p>

          {topScheme ? (
            <div className="mt-3 rounded-lg border border-blue-700 bg-blue-900/50 p-3 text-xs text-blue-100">
              Top scheme: {topScheme.name || 'N/A'} ({formatCurrency(topScheme.benefit)})
            </div>
          ) : null}

          {sectorEntries.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {sectorEntries.slice(0, 4).map(([sector, count]) => {
                const max = Math.max(...sectorEntries.map((entry) => Number(entry[1] || 0)), 1)
                const widthPct = Math.max(8, Math.round((Number(count || 0) / max) * 100))
                return (
                  <div key={sector}>
                    <div className="flex items-center justify-between text-[10px] text-blue-200">
                      <span>{sector}</span>
                      <span>{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-blue-900">
                      <div className="h-1.5 rounded-full bg-cyan-300" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          <Button className="mt-4 w-full" variant="secondary" onClick={handleCheckNow} loading={checking} disabled={checking}>
            {checking ? 'Refreshing...' : 'Check Now'}
          </Button>
        </Card>
      </section>

      {featuredSchemes.length > 0 ? (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Featured Schemes</p>
          <div className="grid gap-3 md:grid-cols-3">
            {featuredSchemes.slice(0, 3).map((scheme) => (
              <Card key={scheme.scheme_id || scheme.scheme_code} className="border border-stone-200">
                <h3 className="text-sm font-semibold text-stone-900">{scheme.scheme_name || 'Scheme'}</h3>
                <p className="mt-1 text-xs text-stone-600">{scheme.benefit_summary || 'Benefit details available in scheme page.'}</p>
                <p className="mt-2 text-xs font-medium text-stone-700">Score: {Math.round(Number(scheme.match_score || 0) * 100)}%</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="flex h-full flex-col">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <UploadCloud className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-stone-900">Upload documents</h3>
          <p className="mt-1 flex-1 text-sm text-stone-600">{documentsCount} document{documentsCount !== 1 ? 's' : ''} uploaded.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/upload')}>Continue</Button>
        </Card>

        <Card className="flex h-full flex-col">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Fingerprint className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-stone-900">Complete profile</h3>
          <p className="mt-1 flex-1 text-sm text-stone-600">
            {completeness}% complete. {missingFields.length > 0 ? `Missing: ${missingFields.slice(0, 2).join(', ')}` : 'No key fields missing.'}
          </p>
          <Button className="mt-4 w-full" onClick={() => navigate('/profile')}>Continue</Button>
        </Card>

        <Card className="flex h-full flex-col">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Search className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-stone-900">Check eligibility</h3>
          <p className="mt-1 flex-1 text-sm text-stone-600">Last checked: {formatDateTime(dashboard?.last_checked)}</p>
          <Button className="mt-4 w-full" onClick={handleCheckNow} loading={checking} disabled={checking}>
            Continue
          </Button>
        </Card>

        <Card className="flex h-full flex-col">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-stone-900">Track applications</h3>
          <p className="mt-1 flex-1 text-sm text-stone-600">{applicationsCount} application{applicationsCount !== 1 ? 's' : ''} in your tracker.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/applications')}>Continue</Button>
        </Card>
      </section>
    </div>
  )
}

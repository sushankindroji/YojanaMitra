import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { ArrowRight, FileText, Fingerprint, Search, UploadCloud } from 'lucide-react'
import eligibilityService from '../services/eligibilityService'
import documentService from '../services/documentService'
import applicationService from '../services/applicationService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  if (amount <= 0) return 'Not specified'
  return `Rs ${amount.toLocaleString('en-IN')}`
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

const parseNaiveTimestampAsIST = (raw) => {
  const match = String(raw).trim().match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/
  )

  if (!match) return null

  const [, year, month, day, hour, minute, second = '0', millisecond = '0'] = match
  const utcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(millisecond.padEnd(3, '0'))
  ) - IST_OFFSET_MS

  return new Date(utcMs)
}

const formatDateTimeIST = (value) => {
  if (!value) return 'Never checked'

  const raw = String(value).trim()
  const hasTimezone = /[zZ]|[-+]\d{2}:?\d{2}$/.test(raw)
  const parsedFromNaive = hasTimezone ? null : parseNaiveTimestampAsIST(raw)
  const date = parsedFromNaive || new Date(raw)

  if (Number.isNaN(date.getTime())) return 'Never checked'

  const formatted = date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })

  const normalizedMeridiem = formatted
    .replace(/\bAM\b/g, 'am')
    .replace(/\bPM\b/g, 'pm')

  return `${normalizedMeridiem} IST`
}

const countUploadedDocumentTypes = (documents = []) => {
  const uploadedTypes = new Set()

  documents.forEach((doc) => {
    const type = String(doc?.doc_type || '').trim().toLowerCase()
    const status = String(doc?.extraction_status || '').trim().toLowerCase()

    if (!type || status === 'failed') return
    uploadedTypes.add(type)
  })

  return uploadedTypes.size
}

const hasAadhaarDocument = (documents = []) =>
  documents.some((doc) => {
    const type = String(doc?.doc_type || '').trim().toLowerCase()
    const status = String(doc?.extraction_status || '').trim().toLowerCase()
    if (type !== 'aadhaar') return false
    return status !== 'failed'
  })

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
  const [hasAadhaarUploaded, setHasAadhaarUploaded] = useState(false)
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
      setDocumentsCount(countUploadedDocumentTypes(docs))
      setHasAadhaarUploaded(hasAadhaarDocument(docs))

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
      navigate('/eligibility')
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
  const fullyEligibleCount = Number(quickStats?.fully_eligible || 0)
  const highlyEligibleCount = Number(quickStats?.highly_eligible || 0)
  const partialMatchCount = Number(quickStats?.partially_eligible || 0)
  const sectorBreakdown = dashboard?.sector_breakdown || {}
  const sectorEntries = Object.entries(sectorBreakdown)

  const topScheme = dashboard?.top_scheme || null
  const featuredSchemes = Array.isArray(dashboard?.featured_schemes)
    ? dashboard.featured_schemes
    : []

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

      <section className="grid gap-4">
        <Card variant="elevated" className="!bg-blue-950 !text-white border-blue-900">
          <p className="text-micro font-medium uppercase tracking-wider text-blue-200">Matched Schemes (Full + High)</p>
          <h2 className="mt-1 text-h2 font-medium">{dashboard?.total_eligible_count || 0}</h2>
          <p className="mt-2 text-body-sm text-blue-100">{insight.headline || 'No eligibility run found yet.'}</p>
          <p className="mt-2 text-caption text-blue-200">{insight.highlight || 'Run eligibility check to see personalized scheme insight.'}</p>
          <p className="mt-2 text-caption text-blue-300">Last checked (IST): {formatDateTimeIST(dashboard?.last_checked)}</p>
          <p className="mt-2 text-caption text-blue-300">Fully Eligible is a stricter subset of this total.</p>
          {(fullyEligibleCount > 0 || highlyEligibleCount > 0) ? (
            <p className="mt-2 text-caption text-blue-200">
              Breakdown: {fullyEligibleCount} fully eligible + {highlyEligibleCount} highly matched
            </p>
          ) : null}

          {topScheme ? (
            <div className="mt-3 rounded-lg border border-blue-700 bg-blue-900/50 p-3 text-caption text-blue-100">
              Top scheme: {topScheme.name || 'N/A'} ({formatCurrency(topScheme.benefit)})
            </div>
          ) : null}

          <div className="mt-3 rounded-lg border border-blue-700 bg-blue-900/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-caption text-blue-100">Profile completion: {completeness}%</p>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="text-caption font-medium text-cyan-200 hover:text-cyan-100"
              >
                Update profile
              </button>
            </div>
            {missingFields.length > 0 ? (
              <p className="mt-1 text-caption text-blue-200">
                Missing: {missingFields.slice(0, 2).join(', ')}{missingFields.length > 2 ? '...' : ''}
              </p>
            ) : (
              <p className="mt-1 text-caption text-blue-200">All key profile fields are complete.</p>
            )}
          </div>

          {sectorEntries.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {sectorEntries.slice(0, 4).map(([sector, count]) => {
                const max = Math.max(...sectorEntries.map((entry) => Number(entry[1] || 0)), 1)
                const widthPct = Math.max(8, Math.round((Number(count || 0) / max) * 100))
                return (
                  <div key={sector}>
                    <div className="flex items-center justify-between text-caption text-blue-200">
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

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button className="w-full" variant="secondary" onClick={handleCheckNow} loading={checking} disabled={checking}>
              {checking ? 'Refreshing...' : 'Check eligibility'}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => navigate('/eligibility')}>
              View matching schemes
            </Button>
          </div>
        </Card>
      </section>

      {featuredSchemes.length > 0 ? (
        <section>
          <p className="mb-2 text-micro font-medium uppercase tracking-wider text-stone-500">Featured Schemes</p>
          <div className="grid gap-3 md:grid-cols-3">
            {featuredSchemes.slice(0, 3).map((scheme) => (
              <Card key={scheme.scheme_id || scheme.scheme_code} className="border border-stone-200">
                <h3 className="text-h4 font-medium text-stone-900">{scheme.scheme_name || 'Scheme'}</h3>
                <p className="mt-1 text-body-sm text-stone-600">{scheme.benefit_summary || 'Benefit details available in scheme page.'}</p>
                <p className="mt-2 text-label font-medium text-stone-700">Score: {Math.round(Number(scheme.match_score || 0) * 100)}%</p>
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
          <h3 className="text-h3 font-medium text-stone-900">Upload documents</h3>
          <p className="mt-1 flex-1 text-body-sm text-stone-600">{documentsCount} document type{documentsCount !== 1 ? 's' : ''} uploaded.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/upload')} disabled={!hasAadhaarUploaded}>Continue</Button>
          {!hasAadhaarUploaded ? (
            <p className="mt-2 text-caption text-stone-500">Upload Aadhaar to continue.</p>
          ) : null}
        </Card>

        <Card className="flex h-full flex-col">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Fingerprint className="h-5 w-5" />
          </div>
          <h3 className="text-h3 font-medium text-stone-900">View matching schemes</h3>
          <p className="mt-1 flex-1 text-body-sm text-stone-600">
            {dashboard?.total_eligible_count || 0} full/high matches and {partialMatchCount} partial matches are ready to view.
          </p>
          <Button className="mt-4 w-full" onClick={() => navigate('/eligibility')}>Open Matches</Button>
        </Card>

        <Card className="flex h-full flex-col">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Search className="h-5 w-5" />
          </div>
          <h3 className="text-h3 font-medium text-stone-900">Check eligibility</h3>
          <p className="mt-1 flex-1 text-body-sm text-stone-600">Last checked (IST): {formatDateTimeIST(dashboard?.last_checked)}</p>
          <Button className="mt-4 w-full" onClick={handleCheckNow} loading={checking} disabled={checking}>
            {checking ? 'Refreshing...' : 'Check eligibility'}
          </Button>
        </Card>

        <Card className="flex h-full flex-col">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="text-h3 font-medium text-stone-900">Track applications</h3>
          <p className="mt-1 flex-1 text-body-sm text-stone-600">{applicationsCount} application{applicationsCount !== 1 ? 's' : ''} in your tracker.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/applications')}>Continue</Button>
        </Card>
      </section>
    </div>
  )
}

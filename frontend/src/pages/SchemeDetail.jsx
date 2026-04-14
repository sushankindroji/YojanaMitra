import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Circle,
  ExternalLink,
  HelpCircle,
  Loader,
  MapPin,
  PhoneCall,
  Square,
  XCircle,
} from 'lucide-react'

import applicationService from '../services/applicationService'
import schemeService from '../services/schemeService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'

const CSC_NAME_BY_STATE = {
  telangana: 'Mee Seva Centre',
  'andhra pradesh': 'Mee Seva Centre',
  'tamil nadu': 'e-Sevai Centre',
  karnataka: 'Nadakacheri / CSC',
  kerala: 'Akshaya Centre',
  maharashtra: 'Aaple Sarkar / CSC',
  'west bengal': 'Tathya Mitra Kendra',
  rajasthan: 'e-Mitra Kiosk',
  'uttar pradesh': 'Jan Seva Kendra / CSC',
  bihar: 'VASUDHA Kendra / CSC',
}

const DEFAULT_CSC_NAME = 'CSC / Common Service Centre'

const statusStyle = {
  met: {
    icon: CheckCircle2,
    rowClass: 'border-emerald-200 bg-emerald-50',
    textClass: 'text-emerald-900',
    label: 'You meet this',
  },
  not_met: {
    icon: XCircle,
    rowClass: 'border-rose-200 bg-rose-50',
    textClass: 'text-rose-900',
    label: 'You do not meet this',
  },
  unknown: {
    icon: HelpCircle,
    rowClass: 'border-amber-200 bg-amber-50',
    textClass: 'text-amber-900',
    label: 'We need more details',
  },
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function formatCurrencyINR(amount) {
  const numeric = Number(amount || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'Varies by state'
  }
  return `₹${Math.round(numeric).toLocaleString('en-IN')}`
}

function derivePaymentMethod(benefitType) {
  const text = normalizeText(benefitType)
  if (text.includes('cash') || text.includes('bank')) return 'Direct bank transfer'
  if (text.includes('subsid')) return 'Reimbursement'
  if (text.includes('free') || text.includes('service') || text.includes('training')) return 'In kind'
  return 'Direct bank transfer'
}

function safeText(value, fallback) {
  const text = String(value || '').trim()
  return text || fallback
}

function formatDateDMY(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleDateString('en-GB')
}

function getCscNameByState(stateValue) {
  const normalized = String(stateValue || '').trim().toLowerCase()
  if (!normalized) return DEFAULT_CSC_NAME
  return CSC_NAME_BY_STATE[normalized] || DEFAULT_CSC_NAME
}

export default function SchemeDetail() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()

  const [scheme, setScheme] = useState(null)
  const [eligibilityData, setEligibilityData] = useState(null)
  const [applyInfo, setApplyInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyInfoLoading, setIsApplyInfoLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const authToken = localStorage.getItem('access_token')
  const isLoggedIn = Boolean(authToken)
  const schemeId = params.schemeId || params.id

  const tabs = [
    { id: 'overview', label: t('schemes.tabOverview', { defaultValue: 'Overview' }) },
    { id: 'eligibility', label: t('schemes.tabEligibility', { defaultValue: 'Eligibility' }) },
    { id: 'howToApply', label: t('schemes.tabHowToApply', { defaultValue: 'How to Apply' }) },
  ]

  useEffect(() => {
    if (!schemeId) return

    const fetchDetails = async () => {
      try {
        setIsLoading(true)
        setIsApplyInfoLoading(true)
        setError(null)

        const fetchWithOptionalToken = async (withTokenRequest, publicRequest) => {
          if (!authToken) {
            return publicRequest()
          }

          try {
            return await withTokenRequest(authToken)
          } catch (requestError) {
            const status = requestError?.response?.status
            if ([401, 403].includes(status)) {
              return publicRequest()
            }
            throw requestError
          }
        }

        const languageCode = (i18n?.resolvedLanguage || i18n?.language || 'en').split('-')[0]
        const schemeResponse = await schemeService.getPublicSchemeDetail(schemeId, { lang: languageCode })
        setScheme(schemeResponse.data)

        const [applyResult, eligibilityResult] = await Promise.allSettled([
          fetchWithOptionalToken(
            (token) => schemeService.getPublicApplyInfo(schemeId, undefined, token),
            () => schemeService.getPublicApplyInfo(schemeId)
          ),
          fetchWithOptionalToken(
            (token) => schemeService.getPublicSchemeEligibility(schemeId, token),
            () => schemeService.getPublicSchemeEligibility(schemeId)
          ),
        ])

        if (applyResult.status === 'fulfilled') {
          setApplyInfo(applyResult.value?.data || null)
        } else {
          const status = applyResult.reason?.response?.status
          if (![401, 403, 404].includes(status)) {
            console.warn('Failed to load apply info', applyResult.reason)
          }
        }

        if (eligibilityResult.status === 'fulfilled') {
          setEligibilityData(eligibilityResult.value?.data || null)
        } else {
          const status = eligibilityResult.reason?.response?.status
          if (![401, 403, 404].includes(status)) {
            console.warn('Failed to load eligibility data', eligibilityResult.reason)
          }
        }
      } catch (fetchError) {
        console.error('Error loading scheme detail', fetchError)
        setError(t('schemes.fetchError', { defaultValue: 'Failed to load scheme details' }))
      } finally {
        setIsLoading(false)
        setIsApplyInfoLoading(false)
      }
    }

    fetchDetails()
  }, [authToken, schemeId, i18n?.language, i18n?.resolvedLanguage, t])

  const schemeName = scheme?.name || scheme?.name_en || t('schemes.schemeLabel', { defaultValue: 'Scheme' })
  const overviewDescription =
    safeText(scheme?.full_description, '') ||
    safeText(scheme?.description, '') ||
    safeText(scheme?.description_en, 'Information not available. Please call the helpline or visit your nearest service centre.')

  const officialPortalUrl =
    applyInfo?.portal_url ||
    scheme?.official_portal_url ||
    scheme?.state_portal_url ||
    null

  const localCscName = safeText(
    applyInfo?.local_csc_name || scheme?.state_service_center,
    getCscNameByState(scheme?.state)
  )
  const cscLocatorUrl = safeText(applyInfo?.csc_url, 'https://locator.csccloud.in/')
  const requiredDocuments = Array.isArray(applyInfo?.required_documents) ? applyInfo.required_documents : []
  const faqItems = Array.isArray(applyInfo?.faq) ? applyInfo.faq : Array.isArray(scheme?.faq) ? scheme.faq : []

  const documentsUserHasSet = useMemo(() => {
    const docs = Array.isArray(applyInfo?.documents_user_has) ? applyInfo.documents_user_has : []
    return new Set(docs.map((doc) => normalizeText(doc)))
  }, [applyInfo?.documents_user_has])

  const eligibilityCriteria =
    eligibilityData?.criteria ||
    scheme?.eligibility_criteria_list ||
    []

  const eligibilityConditions =
    eligibilityData?.conditions ||
    eligibilityCriteria.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      status: 'unknown',
    }))

  const criteriaUnavailable =
    eligibilityData?.criteria_unavailable ||
    eligibilityCriteria.length === 0

  const userResult = eligibilityData?.user_result || {}
  const metCount = Number.isFinite(userResult?.met_count)
    ? userResult.met_count
    : eligibilityConditions.filter((item) => item.status === 'met').length
  const totalCount = Number.isFinite(userResult?.total_count)
    ? userResult.total_count
    : eligibilityConditions.length
  const unmetCriteria = Array.isArray(userResult?.unmet_criteria) ? userResult.unmet_criteria : []
  const actionHints = Array.isArray(userResult?.action_hints) ? userResult.action_hints : []

  const whatYouGet = {
    amount: formatCurrencyINR(scheme?.benefit_amount),
    type: safeText(scheme?.benefit_type, 'Cash support / free service (as per scheme rules)'),
    frequency: safeText(scheme?.benefit_frequency, 'As per scheme schedule'),
    paymentMethod: derivePaymentMethod(scheme?.benefit_type),
  }

  const keyDetails = [
    {
      label: 'Scheme level',
      value:
        safeText(scheme?.state, '').toLowerCase() === 'central'
          ? 'Central scheme'
          : safeText(scheme?.state, 'Central / State as per scheme') + ' scheme',
    },
    { label: 'Ministry', value: safeText(scheme?.ministry, 'Relevant government department') },
    {
      label: 'Last date to apply',
      value: safeText(scheme?.last_date || scheme?.application_deadline, 'No deadline - apply anytime'),
    },
    {
      label: 'Processing time',
      value: safeText(scheme?.processing_time || applyInfo?.processing_time, 'Usually 15-30 working days'),
    },
    {
      label: 'Validity',
      value: safeText(scheme?.validity_period || applyInfo?.validity_period, 'As per scheme guidelines'),
    },
  ]

  const handleApply = () => {
    if (!isLoggedIn) {
      navigate(`/login?next=/schemes/${scheme?.id || scheme?.scheme_id}`)
      return
    }
    navigate(`/apply/${scheme?.id || scheme?.scheme_id}`)
  }

  const updatedDate = formatDateDMY(scheme?.updated_at || scheme?.last_updated || scheme?.created_at)

  const handleSaveScheme = async () => {
    if (!isLoggedIn) {
      navigate(`/login?next=/schemes/${scheme?.id || scheme?.scheme_id}`)
      return
    }

    try {
      await applicationService.saveApplication(scheme?.id || scheme?.scheme_id)
      toast.success(t('schemes.saved', { defaultValue: 'Scheme saved to your list.' }))
    } catch {
      toast.error(t('schemes.saveError', { defaultValue: 'Could not save this scheme right now.' }))
    }
  }

  const openPortalLink = (url) => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <div className="flex items-center justify-center gap-2 text-body-sm text-stone-500">
          <Loader className="h-4 w-4 animate-spin" />
          {t('common.loading', { defaultValue: 'Loading' })}
        </div>
      </div>
    )
  }

  if (error || !scheme) {
    return (
      <Card className="border border-red-200 bg-red-50 py-10 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-600" />
        <h2 className="mt-3 text-h2 font-medium text-red-900">{t('schemes.errorLoadingTitle', { defaultValue: 'Error Loading Scheme' })}</h2>
        <p className="mx-auto mt-2 max-w-xl text-body-sm text-red-800">{error || t('schemes.notFound', { defaultValue: 'Scheme not found' })}</p>
        <Button onClick={() => navigate('/schemes')} className="mt-5">
          <ArrowLeft className="h-4 w-4" />
          {t('schemes.backToSchemes', { defaultValue: 'Back to Schemes' })}
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-5 pb-20">
      <button
        type="button"
        onClick={() => navigate('/schemes')}
        className="inline-flex items-center gap-1 text-body-sm font-medium text-stone-700 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to schemes
      </button>

      <PageHeader
        title={schemeName}
        description={safeText(scheme?.description || scheme?.description_en, 'Government scheme details in simple language.')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={handleSaveScheme}>
              {isLoggedIn
                ? t('schemes.saveScheme', { defaultValue: 'Save Scheme' })
                : t('schemes.loginToSave', { defaultValue: 'Login to Save' })}
            </Button>
            <Button onClick={handleApply}>
              {isLoggedIn ? t('schemes.applyNow', { defaultValue: 'Apply Now' }) : 'Sign in to apply'}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card className="border border-stone-200 bg-stone-50">
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center gap-1 text-body-sm font-medium text-stone-800">
            <Building2 className="h-4 w-4 text-stone-500" />
            {safeText(scheme?.ministry, 'Relevant government department')}
          </p>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-caption font-medium text-blue-800">
            {safeText(scheme?.sector, 'General')}
          </span>
          <span className="rounded-full bg-stone-200 px-2 py-1 text-caption font-medium text-stone-700">
            {String(scheme?.state || '').trim().toLowerCase() === 'central' ? 'Central' : safeText(scheme?.state, 'Central')}
          </span>
          <span className="text-caption text-stone-500">Last updated: {updatedDate}</span>
        </div>
      </Card>

      {!isLoggedIn ? (
        <Card className="border border-blue-200 bg-blue-50">
          <p className="text-body-sm font-medium text-blue-900">
            You are viewing as a guest. Sign in to see if you personally qualify and to track your documents.
          </p>
          <div className="mt-3">
            <Button variant="secondary" onClick={() => navigate(`/login?next=/schemes/${scheme?.id || scheme?.scheme_id}`)}>
              {t('auth.login', { defaultValue: 'Login' })}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="border border-stone-200 p-0">
        <div className="border-b border-stone-200 px-2">
          <div className="flex flex-wrap gap-1 p-2" role="tablist" aria-label="Scheme detail tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-body-sm font-medium transition ${
                  activeTab === tab.id ? 'bg-orange-600 text-white' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'overview' ? (
            <div className="space-y-6">
              <section>
                <h2 className="text-h3 font-medium text-stone-900">About this scheme</h2>
                <p className="mt-2 whitespace-pre-line text-body-sm leading-relaxed text-stone-700">
                  {overviewDescription}
                </p>
              </section>

              <section>
                <h2 className="text-h3 font-medium text-stone-900">What you will get</h2>
                <Card className="mt-3 border border-emerald-200 bg-emerald-50">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <p className="text-body-sm text-emerald-900"><span className="font-medium">Benefit amount:</span> {whatYouGet.amount}</p>
                    <p className="text-body-sm text-emerald-900"><span className="font-medium">Benefit type:</span> {whatYouGet.type}</p>
                    <p className="text-body-sm text-emerald-900"><span className="font-medium">Frequency:</span> {whatYouGet.frequency}</p>
                    <p className="text-body-sm text-emerald-900"><span className="font-medium">Payment method:</span> {whatYouGet.paymentMethod}</p>
                  </div>
                  {safeText(scheme?.benefits_description, '') ? (
                    <p className="mt-3 text-body-sm text-emerald-900/90">{scheme.benefits_description}</p>
                  ) : null}
                </Card>
              </section>

              <section>
                <h2 className="text-h3 font-medium text-stone-900">Who is this for</h2>
                <p className="mt-2 text-body-sm text-stone-700">
                  {safeText(scheme?.target_beneficiaries, 'This scheme is for eligible families as per government rules.')}
                </p>
              </section>

              <section>
                <h2 className="text-h3 font-medium text-stone-900">Key details</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {keyDetails.map((item) => (
                    <div key={item.label} className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
                      <p className="text-caption uppercase tracking-wider text-stone-500">{item.label}</p>
                      <p className="mt-1 text-body-sm font-medium text-stone-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'eligibility' ? (
            <div className="space-y-5">
              <h2 className="text-h3 font-medium text-stone-900">Who can apply for this scheme?</h2>

              {criteriaUnavailable ? (
                <Card className="border border-amber-200 bg-amber-50">
                  <p className="text-body-sm text-amber-900">
                    Eligibility criteria for this scheme are not available in our database yet. Please visit the official portal or your nearest CSC / Jan Seva Kendra for details.
                  </p>
                  <p className="mt-2 text-body-sm font-medium text-amber-900">
                    Helpline: {safeText(applyInfo?.helpline || scheme?.helpline_number, '1800-11-0001')}
                  </p>
                </Card>
              ) : null}

              {!criteriaUnavailable && !isLoggedIn ? (
                <Card className="border border-stone-200">
                  <div className="space-y-3">
                    {eligibilityCriteria.map((item) => (
                      <p key={item.key} className="text-body-sm text-stone-700">
                        <span className="mr-2 font-medium text-emerald-700">✓</span>
                        <span className="font-medium">{item.label}:</span> {item.value}
                      </p>
                    ))}
                  </div>
                  <div className="mt-5">
                    <Button onClick={() => navigate(`/login?next=/schemes/${scheme?.id || scheme?.scheme_id}`)}>
                      Sign in to check if YOU are eligible
                    </Button>
                  </div>
                </Card>
              ) : null}

              {!criteriaUnavailable && isLoggedIn ? (
                <>
                  <div className="space-y-3">
                    {eligibilityConditions.map((condition) => {
                      const tone = statusStyle[condition.status] || statusStyle.unknown
                      const Icon = tone.icon
                      return (
                        <div key={`${condition.key}-${condition.label}`} className={`rounded-lg border px-4 py-3 ${tone.rowClass}`}>
                          <div className="flex items-start gap-2">
                            <Icon className={`mt-0.5 h-5 w-5 ${tone.textClass}`} />
                            <div className="min-w-0">
                              <p className={`text-body-sm font-medium ${tone.textClass}`}>
                                {condition.label}: {condition.value}
                              </p>
                              <p className={`text-caption ${tone.textClass}`}>{tone.label}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <Card className="border border-blue-200 bg-blue-50">
                    <p className="text-body-sm font-medium text-blue-900">You meet {metCount} out of {totalCount} criteria</p>

                    {unmetCriteria.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-body-sm text-blue-900"><span className="font-medium">You are missing:</span> {unmetCriteria.join(', ')}</p>
                        {actionHints.length > 0 ? (
                          <div>
                            <p className="text-body-sm font-medium text-blue-900">How to qualify:</p>
                            <ul className="mt-1 space-y-1">
                              {actionHints.map((hint) => (
                                <li key={hint} className="text-body-sm text-blue-900">- {hint}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                </>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'howToApply' ? (
            <div className="space-y-5">
              <Card className="border border-blue-200 bg-blue-50">
                <h2 className="text-h3 font-medium text-blue-900">How to apply</h2>
                <p className="mt-2 text-body-sm text-blue-900/90">
                  Visit your nearest <span className="font-medium">{localCscName}</span> if you need help.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => openPortalLink(officialPortalUrl)} disabled={!officialPortalUrl || isApplyInfoLoading}>
                    Apply on Official Portal
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" onClick={() => openPortalLink(cscLocatorUrl)} disabled={!cscLocatorUrl || isApplyInfoLoading}>
                    Find nearest {localCscName}
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
                {applyInfo?.myscheme_fallback ? (
                  <p className="mt-3 text-body-sm text-blue-900/90">
                    Information not available for direct portal - please call helpline or visit your nearest {localCscName}.
                  </p>
                ) : null}
              </Card>

              {isApplyInfoLoading ? (
                <div className="flex items-center gap-2 text-body-sm text-stone-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  Preparing scheme-specific application steps...
                </div>
              ) : null}

              <Card className="border border-stone-200">
                <h3 className="font-medium text-stone-900">Step-by-step application process</h3>
                {Array.isArray(applyInfo?.steps) && applyInfo.steps.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {applyInfo.steps.map((step, index) => (
                      <div key={`${step}-${index}`} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
                        <p className="text-body-sm font-medium text-orange-700">Step {index + 1}</p>
                        <p className="mt-1 text-body-sm text-stone-700">{step}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-body-sm text-stone-700">
                    Information not available - please call {safeText(applyInfo?.helpline, '1800-11-0001')} or visit your nearest {localCscName}.
                  </p>
                )}
              </Card>

              <Card className="border border-stone-200">
                <h3 className="font-medium text-stone-900">Documents you will need</h3>
                {requiredDocuments.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {requiredDocuments.map((doc) => {
                      const normalizedDoc = normalizeText(doc)
                      const hasDoc = Array.from(documentsUserHasSet).some(
                        (uploadedDoc) => uploadedDoc.includes(normalizedDoc) || normalizedDoc.includes(uploadedDoc),
                      )

                      if (!isLoggedIn) {
                        return (
                          <div key={doc} className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2">
                            <Square className="h-4 w-4 text-stone-500" />
                            <span className="text-body-sm text-stone-700">{doc}</span>
                          </div>
                        )
                      }

                      return (
                        <div key={doc} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2">
                          <span className="text-body-sm text-stone-700">{doc}</span>
                          {hasDoc ? (
                            <span className="inline-flex items-center gap-1 text-body-sm font-medium text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Uploaded
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate('/upload')}
                              className="inline-flex items-center gap-1 text-body-sm font-medium text-stone-600 hover:text-stone-900"
                            >
                              <Circle className="h-4 w-4" />
                              Upload
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-body-sm text-stone-700">
                    Information not available - please call {safeText(applyInfo?.helpline, '1800-11-0001')} or visit your nearest {localCscName}.
                  </p>
                )}
              </Card>

              {faqItems.length > 0 ? (
                <Card className="border border-stone-200">
                  <h3 className="font-medium text-stone-900">Frequently asked questions</h3>
                  <div className="mt-3 space-y-3">
                    {faqItems.slice(0, 3).map((faq, index) => (
                      <div key={`${faq.q || faq.question}-${index}`} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
                        <p className="text-body-sm font-medium text-stone-900">{faq.q || faq.question}</p>
                        <p className="mt-1 text-body-sm text-stone-700">{faq.a || faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              <Card className="border border-indigo-200 bg-indigo-50">
                <h3 className="text-h3 font-medium text-indigo-900">Need help?</h3>
                <p className="mt-2 inline-flex items-center gap-2 text-body-sm text-indigo-900">
                  <PhoneCall className="h-4 w-4" />
                  Call {safeText(applyInfo?.helpline || scheme?.helpline_number, '1800-11-0001')} - Free, {safeText(applyInfo?.helpline_hours || scheme?.helpline_hours, 'Monday to Friday 9AM to 6PM')}
                </p>
                {safeText(applyInfo?.state_service_helpline, '') ? (
                  <p className="mt-1 text-body-sm text-indigo-900">
                    {localCscName} help: {applyInfo.state_service_helpline}
                  </p>
                ) : null}
                {safeText(applyInfo?.alternate_helpline || scheme?.alternate_helpline, '') ? (
                  <p className="mt-1 text-body-sm text-indigo-900">Alternate: {applyInfo?.alternate_helpline || scheme?.alternate_helpline}</p>
                ) : null}
                <p className="mt-2 text-body-sm text-indigo-900">Or visit your nearest {localCscName}</p>
              </Card>

              <Button className="w-full" onClick={handleApply}>
                {isLoggedIn ? 'Proceed to apply' : 'Sign in to apply'}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <Button className="w-full" onClick={handleApply}>
          {isLoggedIn ? 'Apply Now' : 'Sign in to apply'}
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

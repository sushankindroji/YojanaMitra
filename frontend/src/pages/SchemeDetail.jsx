// frontend/src/pages/SchemeDetail.jsx
/**
 * SchemeDetail - Full scheme details page
 * Features:
 * - Display complete scheme information
 * - Show eligibility conditions & summary
 * - Application guide steps
 * - "How to Apply" button
 * - Related schemes
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileWarning,
  Loader,
  MapPin,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import EligibilityBadges from '../components/schemes/EligibilityBadges'
import EligibilitySummary from '../components/schemes/EligibilitySummary'
import schemeService from '../services/schemeService'
import applicationService from '../services/applicationService'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'

export default function SchemeDetail() {
  const { t, i18n } = useTranslation()
  const params = useParams()
  const navigate = useNavigate()

  const [scheme, setScheme] = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [applyInfo, setApplyInfo] = useState(null)
  const [isApplyInfoLoading, setIsApplyInfoLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // overview, eligibility, howToApply

  const tabs = [
    { id: 'overview', label: t('schemes.tabOverview', { defaultValue: 'Overview' }) },
    { id: 'eligibility', label: t('schemes.tabEligibility', { defaultValue: 'Eligibility' }) },
    { id: 'howToApply', label: t('schemes.tabHowToApply', { defaultValue: 'How to Apply' }) },
  ]

  // Fetch scheme details
  useEffect(() => {
    const schemeId = params.schemeId || params.id
    if (!schemeId) return

    const fetchSchemeDetails = async () => {
      try {
        setIsLoading(true)
        setIsApplyInfoLoading(true)
        setError(null)
        setEligibility(null)
        setApplyInfo(null)

        const languageCode = (i18n?.resolvedLanguage || i18n?.language || 'en').split('-')[0]

        // Fetch scheme details
        const schemeResponse = await schemeService.getSchemeDetail(schemeId, { lang: languageCode })
        setScheme(schemeResponse.data)

        try {
          const applyInfoResponse = await schemeService.getApplyInfo(schemeId)
          if (applyInfoResponse?.data) {
            setApplyInfo(applyInfoResponse.data)
          }
        } catch (applyInfoError) {
          const status = applyInfoError?.response?.status
          if (![401, 403, 404].includes(status)) {
            console.warn('Error fetching application info:', applyInfoError)
          }
        } finally {
          setIsApplyInfoLoading(false)
        }

        // Eligibility is optional here. Many schemes may not have computed eligibility yet.
        try {
          const eligibilityResponse = await schemeService.getSchemeEligibility?.(schemeId)
          if (eligibilityResponse?.data) {
            setEligibility(eligibilityResponse.data)
          }
        } catch (eligibilityError) {
          const status = eligibilityError?.response?.status
          if (![401, 403, 404].includes(status)) {
            console.warn('Error fetching scheme eligibility:', eligibilityError)
          }
        }
      } catch (err) {
        console.error('Error fetching scheme details:', err)
        setError(t('schemes.fetchError', { defaultValue: 'Failed to load scheme details' }))
      } finally {
        setIsLoading(false)
        setIsApplyInfoLoading(false)
      }
    }

    fetchSchemeDetails()
  }, [i18n?.language, i18n?.resolvedLanguage, params.id, params.schemeId, t])

  const handleApply = () => {
    if (!isLoggedIn) {
      navigate(`/login?next=/schemes/${scheme?.id || scheme?.scheme_id}`)
      return
    }

    // Navigate to application with scheme ID
    navigate(`/apply/${scheme?.id || scheme?.scheme_id}`)
  }

  const handleSaveScheme = async () => {
    if (!isLoggedIn) {
      navigate(`/login?next=/schemes/${scheme?.id || scheme?.scheme_id}`)
      return
    }

    try {
      await applicationService.saveApplication(scheme?.id || scheme?.scheme_id)
      toast.success(t('schemes.saved') || 'Scheme saved to your favorites')
    } catch (error) {
      toast.error(t('schemes.saveError') || 'Failed to save scheme')
    }
  }

  const openPortalLink = (url) => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <div className="flex items-center justify-center gap-2 text-body-sm text-stone-500">
          <Loader className="h-4 w-4 animate-spin" />
          {t('common.loading')}
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

  const schemeName = scheme.name || scheme.name_en || t('schemes.schemeLabel', { defaultValue: 'Scheme' })
  const schemeDescription = scheme.description || scheme.description_en
  const isLoggedIn = Boolean(localStorage.getItem('access_token'))
  const requiredDocuments = applyInfo?.required_documents || []
  const documentsUserHas = applyInfo?.documents_user_has || []
  const documentsUserMissing = applyInfo?.documents_user_missing || []
  const normalizedDocumentsUserHas = new Set(documentsUserHas.map((doc) => String(doc).toLowerCase()))
  const isReadyToApply = Boolean(applyInfo?.is_ready_to_apply) || documentsUserMissing.length === 0

  return (
    <div className="space-y-5">
      <PageHeader
        title={schemeName}
        description={schemeDescription || t('schemes.detailDescriptionFallback', { defaultValue: 'Detailed scheme information and eligibility guidance.' })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/schemes')}>
              <ArrowLeft className="h-4 w-4" />
              {t('common.back', { defaultValue: 'Back' })}
            </Button>
            <Button variant="secondary" onClick={handleSaveScheme}>
              {isLoggedIn
                ? t('schemes.saveScheme', { defaultValue: 'Save Scheme' })
                : t('schemes.loginToSave', { defaultValue: 'Login to Save' })}
            </Button>
            <Button onClick={handleApply}>
              {isLoggedIn
                ? t('schemes.applyNow', { defaultValue: 'Apply Now' })
                : t('schemes.checkEligibilityLogin', { defaultValue: 'Check Eligibility (Login)' })}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {!isLoggedIn ? (
        <Card className="border border-blue-200 bg-blue-50">
          <p className="text-body-sm font-medium text-blue-900">
            {t('schemes.publicBrowseNotice', { defaultValue: 'You are browsing as a guest. Sign in to save schemes, check personalized eligibility, and start applications.' })}
          </p>
          <div className="mt-3">
            <Button variant="secondary" onClick={() => navigate(`/login?next=/schemes/${scheme?.id || scheme?.scheme_id}`)}>
              {t('auth.login', { defaultValue: 'Login' })}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="border border-stone-200">
        <div className="flex flex-wrap gap-2">
          {scheme.sector ? (
            <Badge variant="info">
              <Zap className="h-3.5 w-3.5" />
              {scheme.sector}
            </Badge>
          ) : null}
          {scheme.state ? (
            <Badge variant="success">
              <MapPin className="h-3.5 w-3.5" />
              {scheme.state}
            </Badge>
          ) : null}
          {scheme.benefit_amount ? (
            <Badge variant="warning">
              <Award className="h-3.5 w-3.5" />
              {(scheme.currency || 'Rs') + ' ' + scheme.benefit_amount}
            </Badge>
          ) : null}
          {scheme.ministry ? <Badge variant="neutral">{t('schemes.ministry', { defaultValue: 'Ministry' })}: {scheme.ministry}</Badge> : null}
        </div>
      </Card>

      <Card className="border border-stone-200 p-0">
        <div className="border-b border-stone-200 px-2">
          <div className="flex flex-wrap gap-1 p-2" role="tablist" aria-label={t('schemes.detailTabsAria', { defaultValue: 'Scheme detail tabs' })}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-body-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-orange-600 text-white'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'overview' ? (
            <div className="space-y-5">
              {schemeDescription ? (
                <div>
                  <h2 className="text-h3 font-medium text-stone-900">{t('schemes.aboutScheme', { defaultValue: 'About This Scheme' })}</h2>
                  <p className="mt-2 whitespace-pre-line text-body-sm leading-relaxed text-stone-700">{schemeDescription}</p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                {scheme.eligibility_criteria ? (
                  <Card className="h-full border border-stone-200 bg-stone-50">
                    <h3 className="font-medium text-stone-900">{t('schemes.eligibilityCriteria', { defaultValue: 'Eligibility Criteria' })}</h3>
                    <p className="mt-2 whitespace-pre-line text-body-sm text-stone-700">{scheme.eligibility_criteria}</p>
                  </Card>
                ) : null}

                {scheme.benefits ? (
                  <Card className="h-full border border-stone-200 bg-stone-50">
                    <h3 className="font-medium text-stone-900">{t('schemes.benefits', { defaultValue: 'Benefits' })}</h3>
                    <p className="mt-2 whitespace-pre-line text-body-sm text-stone-700">{scheme.benefits}</p>
                  </Card>
                ) : null}
              </div>

              {scheme.application_deadline ? (
                <Card className="border border-amber-200 bg-amber-50">
                  <p className="text-body-sm font-medium text-amber-900">{t('schemes.deadline', { defaultValue: 'Deadline' })}: {scheme.application_deadline}</p>
                </Card>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'eligibility' ? (
            <div className="space-y-6">
              {eligibility?.conditions && eligibility.conditions.length > 0 ? (
                <>
                  <EligibilityBadges conditions={eligibility.conditions} title={t('schemes.yourEligibilityStatus', { defaultValue: 'Your Eligibility Status' })} />
                  <EligibilitySummary
                    explanation={eligibility.explanation}
                    explanationUserLang={eligibility.explanation_user_lang}
                    missingDocuments={eligibility.missing_documents}
                    eligibilityPercentage={eligibility.eligibility_percentage}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <AlertCircle className="h-10 w-10 text-stone-400" />
                  <p className="mt-3 text-body-sm text-stone-600">
                    {eligibility
                      ? t('schemes.eligibilityNotAvailable', { defaultValue: 'Eligibility information not available' })
                      : t('schemes.unableDetermineEligibility', { defaultValue: 'Unable to determine eligibility' })}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {activeTab === 'howToApply' ? (
            <div className="space-y-5">
              <Card className="border border-blue-200 bg-blue-50">
                <h2 className="text-h3 font-medium text-blue-900">{t('schemes.tabHowToApply', { defaultValue: 'How to Apply' })}</h2>
                <p className="mt-2 text-body-sm text-blue-900/90">
                  {t('schemes.applyGuidanceIntro', { defaultValue: 'Use the official portal whenever possible. If online application is unavailable, visit your nearest CSC.' })}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={() => openPortalLink(applyInfo?.portal_url)}
                    disabled={!applyInfo?.portal_url || isApplyInfoLoading}
                  >
                    {t('schemes.applyOnOfficialPortal', { defaultValue: 'Apply on Official Portal' })}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => openPortalLink(applyInfo?.csc_url)}
                    disabled={!applyInfo?.csc_url || isApplyInfoLoading}
                  >
                    {t('schemes.findNearestCsc', { defaultValue: 'Find Nearest CSC' })}
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
                {!isLoggedIn ? (
                  <p className="mt-3 text-body-sm text-blue-900/80">
                    {t('schemes.signInForReadiness', { defaultValue: 'Sign in to see personalized document readiness and eligibility context.' })}
                  </p>
                ) : null}
              </Card>

              {isApplyInfoLoading ? (
                <div className="flex items-center gap-2 text-body-sm text-stone-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  {t('schemes.preparingGuidance', { defaultValue: 'Preparing application guidance...' })}
                </div>
              ) : null}

              {isLoggedIn && !isApplyInfoLoading ? (
                <Card className={isReadyToApply ? 'border border-emerald-200 bg-emerald-50' : 'border border-amber-200 bg-amber-50'}>
                  <div className="flex items-start gap-3">
                    {isReadyToApply ? (
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                    ) : (
                      <FileWarning className="mt-0.5 h-5 w-5 text-amber-700" />
                    )}
                    <div>
                      <p className={isReadyToApply ? 'text-body-sm font-medium text-emerald-900' : 'text-body-sm font-medium text-amber-900'}>
                        {isReadyToApply
                          ? t('schemes.readyToApply', { defaultValue: 'You are ready to apply for this scheme.' })
                          : t('schemes.docsStillMissing', { defaultValue: 'Some required documents are still missing.' })}
                      </p>
                      {!isReadyToApply ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-body-sm text-amber-900">
                            {t('schemes.missingLabel', { defaultValue: 'Missing' })}: {documentsUserMissing.join(', ')}
                          </span>
                          <Button variant="ghost" onClick={() => navigate('/upload')}>
                            {t('dashboard.uploadDocuments', { defaultValue: 'Upload Documents' })}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ) : null}

              <Card className="border border-stone-200">
                <h3 className="font-medium text-stone-900">{t('schemes.stepByStep', { defaultValue: 'Step-by-Step Instructions' })}</h3>
                {applyInfo?.steps?.length > 0 ? (
                  <ol className="mt-3 space-y-3">
                    {applyInfo.steps.map((step, index) => (
                      <li key={`${step}-${index}`} className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-body-sm font-medium text-orange-700">
                          {index + 1}
                        </span>
                        <p className="text-body-sm text-stone-700">{step}</p>
                      </li>
                    ))}
                  </ol>
                ) : scheme.application_procedure ? (
                  <p className="mt-2 whitespace-pre-line text-body-sm leading-relaxed text-stone-700">
                    {scheme.application_procedure}
                  </p>
                ) : (
                  <p className="mt-2 text-body-sm text-stone-600">{t('schemes.stepsUpdating', { defaultValue: 'Application steps are being updated.' })}</p>
                )}
              </Card>

              <Card className="border border-stone-200">
                <h3 className="font-medium text-stone-900">{t('schemes.requiredDocuments', { defaultValue: 'Required Documents' })}</h3>
                {requiredDocuments.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {requiredDocuments.map((doc) => {
                      const normalizedDoc = String(doc).toLowerCase()
                      const hasDoc = normalizedDocumentsUserHas.has(normalizedDoc)
                      return (
                        <div key={doc} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2">
                          <span className="text-body-sm text-stone-700">{doc}</span>
                          <span className={hasDoc ? 'inline-flex items-center gap-1 text-emerald-700' : 'inline-flex items-center gap-1 text-stone-500'}>
                            {hasDoc ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                            {hasDoc
                              ? t('schemes.documentAvailable', { defaultValue: 'Available' })
                              : t('schemes.documentMissing', { defaultValue: 'Missing' })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-body-sm text-stone-600">{t('schemes.documentChecklistUnavailable', { defaultValue: 'Document checklist is currently unavailable for this scheme.' })}</p>
                )}
              </Card>

              {applyInfo?.helpline ? (
                <Card className="border border-indigo-200 bg-indigo-50">
                  <p className="text-body-sm font-medium text-indigo-900">{t('schemes.helpline', { defaultValue: 'Helpline' })}</p>
                  <p className="mt-1 text-body-sm text-indigo-800">{applyInfo.helpline}</p>
                </Card>
              ) : null}

              <Button className="w-full" onClick={handleApply}>
                {isLoggedIn
                  ? t('schemes.proceedToApply', { defaultValue: 'Proceed to Apply' })
                  : t('schemes.applyNowLogin', { defaultValue: 'Apply Now (Login)' })}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

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
  BookOpen,
  ExternalLink,
  Loader,
  MapPin,
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

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'howToApply', label: 'How to Apply' },
]

export default function SchemeDetail() {
  const { t } = useTranslation()
  const params = useParams()
  const navigate = useNavigate()

  const [scheme, setScheme] = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // overview, eligibility, howToApply

  // Fetch scheme details
  useEffect(() => {
    const schemeId = params.schemeId || params.id
    if (!schemeId) return

    const fetchSchemeDetails = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setEligibility(null)

        // Fetch scheme details
        const schemeResponse = await schemeService.getSchemeDetail(schemeId)
        setScheme(schemeResponse.data)

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
      }
    }

    fetchSchemeDetails()
  }, [params.id, params.schemeId, t])

  const handleApply = () => {
    // Navigate to application with scheme ID
    navigate(`/apply/${scheme?.id || scheme?.scheme_id}`)
  }

  const handleSaveScheme = async () => {
    try {
      await applicationService.saveApplication(scheme?.id || scheme?.scheme_id)
      toast.success(t('schemes.saved') || 'Scheme saved to your favorites')
    } catch (error) {
      toast.error(t('schemes.saveError') || 'Failed to save scheme')
    }
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
        <h2 className="mt-3 text-h2 font-medium text-red-900">Error Loading Scheme</h2>
        <p className="mx-auto mt-2 max-w-xl text-body-sm text-red-800">{error || 'Scheme not found'}</p>
        <Button onClick={() => navigate('/schemes')} className="mt-5">
          <ArrowLeft className="h-4 w-4" />
          Back to Schemes
        </Button>
      </Card>
    )
  }

  const schemeName = scheme.name_en || scheme.name || 'Scheme'
  const schemeDescription = scheme.description_en || scheme.description

  return (
    <div className="space-y-5">
      <PageHeader
        title={schemeName}
        description={schemeDescription || 'Detailed scheme information and eligibility guidance.'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/schemes')}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="secondary" onClick={handleSaveScheme}>
              Save Scheme
            </Button>
            <Button onClick={handleApply}>
              Apply Now
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        }
      />

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
          {scheme.ministry ? <Badge variant="neutral">Ministry: {scheme.ministry}</Badge> : null}
        </div>
      </Card>

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
                  <h2 className="text-h3 font-medium text-stone-900">About This Scheme</h2>
                  <p className="mt-2 whitespace-pre-line text-body-sm leading-relaxed text-stone-700">{schemeDescription}</p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                {scheme.eligibility_criteria ? (
                  <Card className="h-full border border-stone-200 bg-stone-50">
                    <h3 className="font-medium text-stone-900">Eligibility Criteria</h3>
                    <p className="mt-2 whitespace-pre-line text-body-sm text-stone-700">{scheme.eligibility_criteria}</p>
                  </Card>
                ) : null}

                {scheme.benefits ? (
                  <Card className="h-full border border-stone-200 bg-stone-50">
                    <h3 className="font-medium text-stone-900">Benefits</h3>
                    <p className="mt-2 whitespace-pre-line text-body-sm text-stone-700">{scheme.benefits}</p>
                  </Card>
                ) : null}
              </div>

              {scheme.application_deadline ? (
                <Card className="border border-amber-200 bg-amber-50">
                  <p className="text-body-sm font-medium text-amber-900">Deadline: {scheme.application_deadline}</p>
                </Card>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'eligibility' ? (
            <div className="space-y-6">
              {eligibility?.conditions && eligibility.conditions.length > 0 ? (
                <>
                  <EligibilityBadges conditions={eligibility.conditions} title="Your Eligibility Status" />
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
                    {eligibility ? 'Eligibility information not available' : 'Unable to determine eligibility'}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {activeTab === 'howToApply' ? (
            <div>
              {scheme.application_procedure ? (
                <div>
                  <h2 className="text-h3 font-medium text-stone-900">How to Apply</h2>
                  <p className="mt-2 whitespace-pre-line text-body-sm leading-relaxed text-stone-700">
                    {scheme.application_procedure}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <BookOpen className="h-10 w-10 text-stone-400" />
                  <p className="mt-3 text-body-sm text-stone-600">Application procedure details not available</p>
                </div>
              )}

              {scheme.official_website ? (
                <Card className="mt-5 border border-blue-200 bg-blue-50">
                  <p className="text-body-sm text-blue-900">For more details, visit the official website:</p>
                  <a
                    href={scheme.official_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-body-sm font-medium text-blue-700 hover:text-blue-800"
                  >
                    {scheme.official_website}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Card>
              ) : null}

              <Button className="mt-5 w-full" onClick={handleApply}>
                Proceed to Apply
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BadgeIndianRupee,
  BookmarkPlus,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import applicationService from '../../services/applicationService'
import { useApplicationStore } from '../../store/applicationStore'
import { toast } from 'react-toastify'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Card from '../ui/Card'

export default function SchemeCard({ scheme, isEligible = true, onViewDetails }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const { addApplication } = useApplicationStore()
  const isLoggedIn = Boolean(localStorage.getItem('access_token'))
  const schemeId = scheme.id || scheme.scheme_id
  const schemeName = scheme.name || scheme.name_en || scheme.scheme_name || t('schemes.schemeLabel', { defaultValue: 'Scheme' })
  const schemeDescription = scheme.description || scheme.description_en || ''
  const benefitAmount = Number(scheme.benefit_amount || 0)
  const rawScore = Number(scheme.eligibility_percentage ?? scheme.eligibility_score ?? 0)
  const eligibilityPercentage = rawScore > 0 && rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore)
  const officialPortalUrl = scheme.official_portal_url || scheme.official_website
  const conditionResults = Array.isArray(scheme.condition_results)
    ? scheme.condition_results
    : typeof scheme.condition_results === 'string'
      ? (() => {
          try {
            return JSON.parse(scheme.condition_results)
          } catch {
            return []
          }
        })()
      : []

  const eligibilityTone = isEligible ? 'success' : 'warning'

  const handleApplyClick = () => {
    if (onViewDetails) {
      onViewDetails(schemeId)
      return
    }

    navigate(`/schemes/${schemeId}`)
  }

  const handleSaveApplication = async () => {
    if (!isLoggedIn) {
      navigate(`/login?next=/schemes/${schemeId}`)
      return
    }

    try {
      setSaving(true)
      const response = await applicationService.saveApplication(schemeId)
      addApplication(response.data)
      toast.success(t('schemes.savedToApplications', { defaultValue: 'Scheme saved! View in My Applications' }))
    } catch (error) {
      console.error('Save error:', error)
      const message = error.response?.data?.detail || t('schemes.saveFailed', { defaultValue: 'Failed to save application' })
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  // Format benefit amount
  const formatAmount = (amount) => {
    if (!amount) return t('common.na', { defaultValue: 'N/A' })
    const rs = t('common.currencyRs', { defaultValue: 'Rs' })
    if (amount >= 100000) return `${rs} ${(amount / 100000).toFixed(1)}L+`
    return `${rs} ${amount.toLocaleString()}`
  }

  return (
    <Card className="mb-4 border border-stone-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-h3 font-medium text-stone-900">{schemeName}</h3>
          <p className="mt-1 flex items-center gap-1 text-body-sm text-stone-600">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{scheme.ministry || scheme.sector || t('schemes.general', { defaultValue: 'General' })}</span>
          </p>
          <p className="mt-3 text-body-sm leading-relaxed text-stone-600">{schemeDescription || t('schemes.noDescription', { defaultValue: 'No description available.' })}</p>
        </div>

        <div className="flex items-center gap-2">
          {isEligible ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <ShieldAlert className="h-5 w-5 text-amber-600" />}
          <Badge variant={eligibilityTone}>{isEligible ? t('schemes.eligible', { defaultValue: 'Eligible' }) : t('schemes.partiallyEligible', { defaultValue: 'Partially Eligible' })}</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-micro font-medium uppercase tracking-wider text-stone-500">{t('schemes.benefitAmount', { defaultValue: 'Benefit Amount' })}</p>
          <p className="mt-1 flex items-center gap-1 text-body-sm font-medium text-stone-900">
            <BadgeIndianRupee className="h-4 w-4 text-green-700" />
            {formatAmount(benefitAmount)}
          </p>
        </div>

        <div>
          <p className="text-micro font-medium uppercase tracking-wider text-stone-500">{t('schemes.benefitType', { defaultValue: 'Benefit Type' })}</p>
          <p className="mt-1 text-body-sm font-medium text-stone-800">{scheme.benefit_type || t('schemes.cash', { defaultValue: 'Cash' })}</p>
        </div>

        <div>
          <p className="text-micro font-medium uppercase tracking-wider text-stone-500">{t('schemes.frequency', { defaultValue: 'Frequency' })}</p>
          <p className="mt-1 text-body-sm font-medium text-stone-800">{scheme.benefit_frequency || t('schemes.oneTime', { defaultValue: 'One-time' })}</p>
        </div>

        <div>
          <p className="text-micro font-medium uppercase tracking-wider text-stone-500">{t('schemes.matchScore', { defaultValue: 'Match Score' })}</p>
          <p className="mt-1 text-body-sm font-medium text-green-700">{eligibilityPercentage || 100}%</p>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-2 text-body-sm font-medium text-orange-700 hover:text-orange-800"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {t('schemes.eligibilityDetails', { defaultValue: 'Eligibility Details' })}
        </button>

        {expanded ? (
          <div className="mt-3 space-y-2 rounded-lg border border-stone-200 bg-white p-3">
            {conditionResults.length > 0 ? (
              conditionResults.map((condition, idx) => {
                const passed = condition.status === 'PASS'
                return (
                  <div key={idx} className="flex items-start gap-2 text-body-sm">
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-caption font-medium text-white ${
                        passed ? 'bg-green-600' : 'bg-amber-600'
                      }`}
                    >
                      {passed ? 'Y' : 'N'}
                    </span>
                    <div>
                      <p className={passed ? 'text-green-800' : 'text-amber-800'}>{condition.label_en || condition.field}</p>
                      {condition.is_mandatory ? (
                        <p className="text-caption text-stone-500">{t('schemes.mandatoryRequirement', { defaultValue: 'Mandatory requirement' })}</p>
                      ) : null}
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-body-sm text-stone-500">{t('schemes.noConditions', { defaultValue: 'No specific conditions available.' })}</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={handleApplyClick}>
          {t('common.viewDetails', { defaultValue: 'View Details' })}
          <ExternalLink className="h-4 w-4" />
        </Button>

        <Button variant="ghost" className="flex-1" onClick={handleSaveApplication} loading={saving}>
          <BookmarkPlus className="h-4 w-4" />
          {saving
            ? t('common.saving', { defaultValue: 'Saving...' })
            : isLoggedIn
              ? t('schemes.saveScheme', { defaultValue: 'Save Scheme' })
              : t('schemes.loginToSave', { defaultValue: 'Login to Save' })}
        </Button>

        {officialPortalUrl ? (
          <a
            href={officialPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 min-w-[6rem] flex-1 items-center justify-center gap-2 rounded-full bg-green-700 px-4 text-body-sm font-medium text-white transition-all duration-150 hover:bg-green-800"
          >
            {t('schemes.officialPortal', { defaultValue: 'Official Portal' })}
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      <p className="mt-3 text-caption text-stone-500">
        {t('schemes.applicationMode', { defaultValue: 'Application mode' })}:{' '}
        <span className="font-medium text-stone-700">{scheme.application_mode || t('schemes.online', { defaultValue: 'Online' })}</span>
      </p>
    </Card>
  )
}

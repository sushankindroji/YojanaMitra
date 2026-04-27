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
import { formatINR, formatPct } from '../../services/formatters'
import { useApplicationStore } from '../../store/applicationStore'
import { toast } from 'react-toastify'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Card from '../ui/Card'

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const sectorTone = (sector) => {
  const normalized = String(sector || '').toLowerCase()
  if (normalized.includes('agri')) return 'bg-green-100 text-green-800'
  if (normalized.includes('health')) return 'bg-red-100 text-red-800'
  if (normalized.includes('educat')) return 'bg-blue-100 text-blue-800'
  if (normalized.includes('social')) return 'bg-purple-100 text-purple-800'
  return 'bg-stone-100 text-stone-700'
}

export default function SchemeCard({ scheme, isEligible = null, onViewDetails, isAuthenticated, searchTerm = '' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const { addApplication } = useApplicationStore()
  const isLoggedIn = typeof isAuthenticated === 'boolean'
    ? isAuthenticated
    : Boolean(localStorage.getItem('access_token'))
  const schemeId = scheme.id || scheme.scheme_id
  const schemeName = scheme.name || scheme.name_en || scheme.scheme_name || t('schemes.schemeLabel', { defaultValue: 'Scheme' })
  const schemeDescription = scheme.description || scheme.description_en || ''
  const rawBenefitAmount = scheme.benefit_amount
  const parsedBenefitAmount = Number(rawBenefitAmount)
  const benefitAmount = Number.isFinite(parsedBenefitAmount) ? parsedBenefitAmount : null
  const scoreCandidate = scheme.eligibility_percentage ?? scheme.eligibility_score
  const hasEligibilityScore = scoreCandidate !== undefined && scoreCandidate !== null && scoreCandidate !== ''
  const rawScore = hasEligibilityScore ? Number(scoreCandidate) : 0
  const normalizedRawScore = Number.isFinite(rawScore) ? rawScore : 0
  const eligibilityPercentage = normalizedRawScore > 0 && normalizedRawScore <= 1
    ? Math.round(normalizedRawScore * 100)
    : Math.round(normalizedRawScore)
  const officialPortalUrl = scheme.official_portal_url || scheme.official_website

  const highlightMatch = (text, query) => {
    const safeText = String(text || '')
    const normalizedQuery = String(query || '').trim()
    if (normalizedQuery.length < 2) return safeText

    const regex = new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'ig')
    const parts = safeText.split(regex)
    return parts.map((part, idx) => {
      if (part.toLowerCase() === normalizedQuery.toLowerCase()) {
        return (
          <mark key={`${part}-${idx}`} className="rounded bg-amber-200 px-0.5 text-stone-900">
            {part}
          </mark>
        )
      }
      return <span key={`${part}-${idx}`}>{part}</span>
    })
  }

  const normalizedConditionPayload = (() => {
    if (Array.isArray(scheme.condition_results)) {
      return { list: scheme.condition_results }
    }

    if (typeof scheme.condition_results === 'string') {
      try {
        const parsed = JSON.parse(scheme.condition_results)
        return typeof parsed === 'object' && parsed !== null ? parsed : { list: [] }
      } catch {
        return { list: [] }
      }
    }

    if (typeof scheme.condition_results === 'object' && scheme.condition_results !== null) {
      return scheme.condition_results
    }

    return { list: [] }
  })()

  const conditionResults = (() => {
    if (Array.isArray(normalizedConditionPayload.list)) {
      return normalizedConditionPayload.list
    }

    const matched = Array.isArray(normalizedConditionPayload.matched_conditions)
      ? normalizedConditionPayload.matched_conditions
      : []
    const failed = Array.isArray(normalizedConditionPayload.failed_conditions)
      ? normalizedConditionPayload.failed_conditions
      : []
    const unknown = Array.isArray(normalizedConditionPayload.unknown_conditions)
      ? normalizedConditionPayload.unknown_conditions
      : []

    const toLabel = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())

    return [
      ...matched.map((field) => ({ status: 'PASS', label_en: toLabel(field), is_mandatory: true })),
      ...failed.map((field) => ({ status: 'FAIL', label_en: toLabel(field), is_mandatory: true })),
      ...unknown.map((field) => ({ status: 'UNKNOWN', label_en: toLabel(field), is_mandatory: false })),
    ]
  })()

  const fallbackCriteriaConditions = Array.isArray(scheme.eligibility_criteria_list)
    ? scheme.eligibility_criteria_list
        .filter((criterion) => criterion && (criterion.label || criterion.value))
        .map((criterion) => ({
          status: 'UNKNOWN',
          label_en: criterion.value
            ? `${criterion.label || 'Condition'}: ${criterion.value}`
            : criterion.label || 'Condition',
          is_mandatory: true,
        }))
    : []

  const displayConditionResults = conditionResults.length > 0 ? conditionResults : fallbackCriteriaConditions

  const eligibilityKnown = typeof isEligible === 'boolean'
  const eligibilityTone = !eligibilityKnown ? 'neutral' : isEligible ? 'success' : 'warning'

  const handleApplyClick = () => {
    if (onViewDetails) {
      onViewDetails(schemeId)
      return
    }

    navigate(`/schemes/${schemeId}`)
  }

  const handleSaveApplication = async () => {
    if (!isLoggedIn) {
      navigate('/register')
      return
    }

    try {
      setSaving(true)
      const response = await applicationService.saveApplication(schemeId)
      addApplication(response.data)
      toast.success(t('schemes.savedToApplications', { defaultValue: 'Scheme saved! View in My Applications' }))
    } catch (error) {
      globalThis.logger?.error?.('Save error:', error)
      const message = error.response?.data?.detail || t('schemes.saveFailed', { defaultValue: 'Failed to save application' })
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  // Format benefit amount
  const formatAmount = (amount) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      const normalizedState = String(scheme.state || '').trim().toLowerCase()
      const normalizedMode = String(scheme.application_mode || '').trim().toLowerCase()
      const isCentralMultiState =
        normalizedState.includes('central') ||
        normalizedState.includes('all india') ||
        normalizedState.includes('pan india') ||
        normalizedState.includes('national')

      if (isCentralMultiState) {
        return t('schemes.amountVariesByState', { defaultValue: 'Varies by state' })
      }

      if (normalizedMode.includes('department')) {
        return t('schemes.amountContactDepartment', { defaultValue: 'Contact department' })
      }

      return t('schemes.amountNotSpecified', { defaultValue: 'Not specified' })
    }

    return formatINR(amount)
  }

  return (
    <Card className="mb-4 cursor-pointer border border-stone-200 bg-white transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-h3 font-medium text-stone-900">{highlightMatch(schemeName, searchTerm)}</h3>
          <p className="mt-1 flex items-center gap-1 text-body-sm text-stone-600">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{scheme.ministry || scheme.sector || t('schemes.general', { defaultValue: 'General' })}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-caption font-medium ${sectorTone(scheme.sector)}`}>
              {scheme.sector || 'General'}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-1 text-caption font-medium text-stone-700">
              {String(scheme.state || '').trim().toLowerCase() === 'central' ? 'Central' : (scheme.state || 'Central')}
            </span>
          </div>
          <p className="mt-3 text-body-sm leading-relaxed text-stone-600">{schemeDescription || t('schemes.noDescription', { defaultValue: 'No description available.' })}</p>
          {!isLoggedIn ? (
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="mt-2 text-body-sm font-medium text-orange-700 hover:text-orange-800"
            >
              Check eligibility {'->'}
            </button>
          ) : null}
        </div>

        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            {eligibilityKnown && isEligible
              ? <CheckCircle2 className="h-5 w-5 text-green-600" />
              : <ShieldAlert className={`h-5 w-5 ${eligibilityKnown ? 'text-amber-600' : 'text-stone-500'}`} />}
            <Badge variant={eligibilityTone}>
              {!eligibilityKnown
                ? t('schemes.eligibilityPending', { defaultValue: 'Checking eligibility' })
                : isEligible
                  ? t('schemes.eligible', { defaultValue: 'Eligible' })
                  : t('schemes.partiallyEligible', { defaultValue: 'Partially Eligible' })}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className={`mt-4 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 ${isLoggedIn ? 'sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'}`}>
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

        {isLoggedIn ? (
          <div>
            <p className="text-micro font-medium uppercase tracking-wider text-stone-500">{t('schemes.matchScore', { defaultValue: 'Match Score' })}</p>
            <p className="mt-1 text-body-sm font-medium text-green-700">
              {hasEligibilityScore
                ? formatPct(eligibilityPercentage)
                : t('schemes.matchScorePending', { defaultValue: 'Computing...' })}
            </p>
          </div>
        ) : null}
      </div>

      {isLoggedIn ? (
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
              {displayConditionResults.length > 0 ? (
                displayConditionResults.map((condition, idx) => {
                  const status = String(condition.status || '').toUpperCase()
                  const passed = status === 'PASS'
                  const unknown = status === 'UNKNOWN'
                  return (
                    <div key={idx} className="flex items-start gap-2 text-body-sm">
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-caption font-medium text-white ${
                          passed ? 'bg-green-600' : unknown ? 'bg-stone-500' : 'bg-amber-600'
                        }`}
                      >
                        {passed ? 'Y' : unknown ? '?' : 'N'}
                      </span>
                      <div>
                        <p className={passed ? 'text-green-800' : unknown ? 'text-stone-700' : 'text-amber-800'}>
                          {condition.label_en || condition.label || condition.field}
                        </p>
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
      ) : null}

      <div className={`mt-5 gap-2 ${isLoggedIn ? 'flex flex-col sm:flex-row' : 'grid grid-cols-2'}`}>
        <Button className={isLoggedIn ? 'flex-1' : 'w-full'} onClick={handleApplyClick}>
          {t('common.viewDetails', { defaultValue: 'View Details' })}
          <ExternalLink className="h-4 w-4" />
        </Button>

        {isLoggedIn ? (
          <Button variant="ghost" className="flex-1" onClick={handleSaveApplication} loading={saving}>
            <BookmarkPlus className="h-4 w-4" />
            {saving
              ? t('common.saving', { defaultValue: 'Saving...' })
              : t('schemes.saveScheme', { defaultValue: 'Save Scheme' })}
          </Button>
        ) : null}

        {officialPortalUrl ? (
          <a
            href={officialPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex h-10 min-w-[6rem] items-center justify-center gap-2 rounded-full bg-green-700 px-4 text-body-sm font-medium text-white transition-all duration-150 hover:bg-green-800 ${isLoggedIn ? 'flex-1' : 'w-full'}`}
          >
            {t('schemes.officialPortal', { defaultValue: 'Official Portal' })}
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={`inline-flex h-10 min-w-[6rem] items-center justify-center gap-2 rounded-full bg-stone-200 px-4 text-body-sm font-medium text-stone-500 ${isLoggedIn ? 'flex-1' : 'w-full'}`}
          >
            {t('schemes.officialPortal', { defaultValue: 'Official Portal' })}
          </button>
        )}
      </div>

      <p className="mt-3 text-caption text-stone-500">
        {t('schemes.applicationMode', { defaultValue: 'Application mode' })}:{' '}
        <span className="font-medium text-stone-700">{scheme.application_mode || t('schemes.online', { defaultValue: 'Online' })}</span>
      </p>
    </Card>
  )
}


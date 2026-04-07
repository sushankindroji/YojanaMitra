import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { CheckCircle2, Loader2, UploadCloud } from 'lucide-react'
import onboardingService from '../services/onboardingService'
import eligibilityService from '../services/eligibilityService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const STEP_TITLES = {
  1: 'Step 1: Aadhaar Upload',
  2: 'Step 2: Additional Documents',
  3: 'Step 3: Quick Questions',
  4: 'Step 4: Building Your Scheme Profile',
}

const OPTIONAL_DOCUMENTS = [
  { id: 'pan_card', label: 'PAN Card', category: 'Identity', hint: 'PAN number and name cross-check' },
  { id: 'voter_id', label: 'Voter ID', category: 'Identity', hint: 'Voter ID number and address cross-check' },
  { id: 'passport', label: 'Passport', category: 'Identity', hint: 'Passport number and nationality' },
  { id: 'income_certificate', label: 'Income Certificate', category: 'Income', hint: 'Annual income and issuing authority' },
  { id: 'ration_card', label: 'BPL / Ration Card', category: 'Income', hint: 'BPL status, family size, and card details' },
  { id: 'bank_passbook', label: 'Bank Passbook', category: 'Income', hint: 'Bank name, masked account, and IFSC' },
  { id: 'tenth_marksheet', label: '10th Marksheet', category: 'Education', hint: 'Board, year, percentage' },
  { id: 'twelfth_marksheet', label: '12th Marksheet', category: 'Education', hint: 'Board, year, percentage' },
  { id: 'degree_certificate', label: 'Degree Certificate', category: 'Education', hint: 'Degree, institution, percentage' },
  { id: 'kisan_credit_card', label: 'Kisan Credit Card', category: 'Agriculture', hint: 'KCC number and credit limit' },
  { id: 'land_records', label: 'Land Records / Patta', category: 'Agriculture', hint: 'Land area, survey number, land type' },
  { id: 'pm_kisan_registration', label: 'PM-KISAN Registration', category: 'Agriculture', hint: 'Registration status and farmer ID' },
  { id: 'disability_certificate', label: 'Disability Certificate', category: 'Special Category', hint: 'Type and disability percentage' },
  { id: 'caste_certificate', label: 'Caste Certificate', category: 'Special Category', hint: 'SC/ST/OBC and certificate number' },
  { id: 'minority_certificate', label: 'Minority Certificate', category: 'Special Category', hint: 'Religion and minority status' },
  { id: 'soil_health_card', label: 'Soil Health Card', category: 'Farmer Specific', hint: 'Soil type and recommendations' },
  { id: 'crop_insurance_policy', label: 'Crop Insurance Policy', category: 'Farmer Specific', hint: 'Policy number and sum insured' },
  { id: 'senior_citizen_card', label: 'Senior Citizen Card', category: 'Senior Citizen', hint: 'Age confirmation and authority' },
]

const OCCUPATION_OPTIONS = [
  'Farmer',
  'Agricultural Laborer',
  'Government Employee',
  'Private Employee',
  'Self-Employed',
  'Student',
  'Homemaker',
  'Unemployed',
  'Other',
]

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

const safeError = (error, fallback) => {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  return fallback
}

const sanitizeFields = (obj = {}) => {
  const normalized = {}
  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      normalized[key] = ''
      return
    }
    normalized[key] = String(value)
  })
  return normalized
}

export default function OnboardingPage() {
  const navigate = useNavigate()

  const [statusLoading, setStatusLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(1)

  const [aadhaarFile, setAadhaarFile] = useState(null)
  const [aadhaarData, setAadhaarData] = useState({})
  const [aadhaarConfidence, setAadhaarConfidence] = useState({})
  const [aadhaarConfirmed, setAadhaarConfirmed] = useState(false)

  const [selectedDocType, setSelectedDocType] = useState('')
  const [optionalDocFile, setOptionalDocFile] = useState(null)
  const [optionalDocData, setOptionalDocData] = useState({})
  const [optionalDocConfidence, setOptionalDocConfidence] = useState({})
  const [uploadedDocTypes, setUploadedDocTypes] = useState([])
  const [incomeDone, setIncomeDone] = useState(false)
  const [manualIncomeFallback, setManualIncomeFallback] = useState({
    enabled: false,
    declaredAnnualIncome: '',
    reason: '',
  })

  const [quickData, setQuickData] = useState({
    mobile_number: '',
    occupation: '',
    owns_agricultural_land: 'no',
    land_area_acres: '',
    is_household_head: 'no',
    family_size: '',
    is_woman_headed_household: 'no',
    has_bank_account: 'yes',
  })

  const [jobId, setJobId] = useState('')
  const [jobProgress, setJobProgress] = useState(0)
  const [jobStatus, setJobStatus] = useState('running')

  const stepProgressPct = useMemo(() => {
    if (step === 4) {
      return Math.max(75, Math.min(100, jobProgress || 75))
    }
    return ((step - 1) / 3) * 100
  }, [step, jobProgress])

  useEffect(() => {
    let mounted = true

    const loadStatus = async () => {
      try {
        const response = await onboardingService.getStatus()
        if (!mounted) return

        const {
          completed,
          step: backendStep,
          aadhaar_done: aadhaarDone,
          income_done: incomeDoneFromBackend,
          job,
        } = response.data || {}
        if (completed) {
          navigate('/dashboard', { replace: true })
          return
        }

        if (aadhaarDone) {
          setAadhaarConfirmed(true)
        }

        if (incomeDoneFromBackend) {
          setIncomeDone(true)
        }

        if (job?.status === 'running' && job?.job_id) {
          setJobId(job.job_id)
          setStep(4)
          setJobStatus('running')
          setJobProgress(Number(job.progress_pct || 0))
        } else {
          const normalizedStep = Math.max(1, Math.min(4, Number(backendStep || 1)))
          setStep(normalizedStep)
          if (normalizedStep === 4) {
            setJobStatus('failed')
          }
        }
      } catch (error) {
        toast.error(safeError(error, 'Could not load onboarding status'))
      } finally {
        if (mounted) {
          setStatusLoading(false)
        }
      }
    }

    loadStatus()

    return () => {
      mounted = false
    }
  }, [navigate])

  useEffect(() => {
    if (step !== 4 || !jobId) return

    let active = true
    const timer = window.setInterval(async () => {
      try {
        const response = await eligibilityService.getStatus(jobId)
        if (!active) return

        const status = response.data?.status || 'running'
        const progressPct = Number(response.data?.progress_pct || 0)

        setJobStatus(status)
        setJobProgress(progressPct)

        if (status === 'complete') {
          window.clearInterval(timer)
          toast.success('Your personalized dashboard is ready')
          navigate('/dashboard', { replace: true })
        }

        if (status === 'failed') {
          window.clearInterval(timer)
          toast.error(response.data?.error || 'Eligibility pipeline failed. Please try again.')
        }
      } catch (error) {
        if (!active) return
        console.error('Job polling failed:', error)
      }
    }, 2000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [jobId, step, navigate])

  const uploadAadhaar = async () => {
    if (!aadhaarFile) {
      toast.error('Please select Aadhaar file first')
      return
    }

    try {
      setBusy(true)
      const response = await onboardingService.uploadAadhaar(aadhaarFile)
      setAadhaarData(sanitizeFields(response.data?.extracted_data || {}))
      setAadhaarConfidence(response.data?.confidence_scores || {})
      toast.success('Aadhaar extracted. Please confirm details below.')
    } catch (error) {
      toast.error(safeError(error, 'Aadhaar upload failed'))
    } finally {
      setBusy(false)
    }
  }

  const confirmAadhaar = async () => {
    if (!aadhaarData.full_name || !aadhaarData.dob || !aadhaarData.gender) {
      toast.error('Please confirm name, DOB, and gender before continuing')
      return
    }

    try {
      setBusy(true)
      await onboardingService.confirmAadhaar(aadhaarData)
      setAadhaarConfirmed(true)
      setStep(2)
      toast.success('Aadhaar confirmed. You can now upload optional documents.')
    } catch (error) {
      toast.error(safeError(error, 'Failed to confirm Aadhaar data'))
    } finally {
      setBusy(false)
    }
  }

  const uploadOptionalDocument = async () => {
    if (!selectedDocType) {
      toast.error('Select a document type first')
      return
    }

    if (!optionalDocFile) {
      toast.error('Choose a file to upload')
      return
    }

    try {
      setBusy(true)
      const response = await onboardingService.uploadDocument(optionalDocFile, selectedDocType)
      setOptionalDocData(sanitizeFields(response.data?.extracted_data || {}))
      setOptionalDocConfidence(response.data?.confidence_scores || {})
      toast.success('Document extracted. Please review and confirm.')
    } catch (error) {
      toast.error(safeError(error, 'Optional document upload failed'))
    } finally {
      setBusy(false)
    }
  }

  const confirmOptionalDocument = async () => {
    if (!selectedDocType) {
      toast.error('Select a document type first')
      return
    }

    try {
      setBusy(true)
      await onboardingService.confirmDocument(selectedDocType, optionalDocData)
      setUploadedDocTypes((prev) => {
        if (prev.includes(selectedDocType)) return prev
        return [...prev, selectedDocType]
      })
      if (selectedDocType === 'income_certificate') {
        setIncomeDone(true)
      }
      setOptionalDocData({})
      setOptionalDocConfidence({})
      setOptionalDocFile(null)
      toast.success('Document confirmed and profile updated')
    } catch (error) {
      toast.error(safeError(error, 'Failed to confirm document data'))
    } finally {
      setBusy(false)
    }
  }

  const continueToQuestions = () => {
    if (manualIncomeFallback.enabled) {
      if (!manualIncomeFallback.declaredAnnualIncome) {
        toast.error('Enter your declared annual income for manual fallback.')
        return
      }

      if (!manualIncomeFallback.reason.trim()) {
        toast.error('Please provide a reason for manual income fallback.')
        return
      }
    }

    setStep(3)
  }

  const completeOnboarding = async () => {
    if (!quickData.mobile_number || !quickData.occupation || !quickData.family_size) {
      toast.error('Please fill mobile number, occupation, and family size')
      return
    }

    try {
      setBusy(true)

      const payload = {
        mobile_number: quickData.mobile_number,
        occupation: quickData.occupation,
        owns_agricultural_land: quickData.owns_agricultural_land,
        land_area_acres:
          quickData.owns_agricultural_land === 'yes' ? quickData.land_area_acres || '0' : '0',
        is_household_head: quickData.is_household_head,
        family_size: quickData.family_size,
        is_woman_headed_household: quickData.is_woman_headed_household,
        has_bank_account: quickData.has_bank_account,
        manual_income_fallback: !incomeDone && manualIncomeFallback.enabled ? 'yes' : 'no',
        declared_annual_income: !incomeDone && manualIncomeFallback.enabled
          ? manualIncomeFallback.declaredAnnualIncome
          : undefined,
        income_fallback_reason: !incomeDone && manualIncomeFallback.enabled
          ? manualIncomeFallback.reason
          : undefined,
      }

      const response = await onboardingService.completeOnboarding(payload)
      const newJobId = response.data?.job_id
      setJobId(newJobId || '')
      setJobStatus('running')
      setJobProgress(10)
      setStep(4)
    } catch (error) {
      toast.error(safeError(error, 'Could not complete onboarding'))
    } finally {
      setBusy(false)
    }
  }

  const retryPipeline = async () => {
    try {
      setBusy(true)
      const response = await eligibilityService.run()
      const newJobId = response.data?.job_id
      setJobId(newJobId || '')
      setJobStatus('running')
      setJobProgress(5)
      toast.info('Retrying profile build...')
    } catch (error) {
      toast.error(safeError(error, 'Could not restart eligibility pipeline'))
    } finally {
      setBusy(false)
    }
  }

  if (statusLoading) {
    return <div className="flex h-screen items-center justify-center">Loading onboarding...</div>
  }

  const selectedDocMeta = OPTIONAL_DOCUMENTS.find((doc) => doc.id === selectedDocType)

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-orange-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-micro font-medium uppercase tracking-wider text-stone-500">YojanaMitra Onboarding</p>
              <h1 className="mt-1 text-h2 font-medium text-stone-900">Document-first profile setup</h1>
              <p className="mt-1 text-body-sm text-stone-600">{STEP_TITLES[step]}</p>
            </div>
            <div className="w-full max-w-sm">
              <div className="h-2 rounded-full bg-stone-200">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-green-600 transition-all"
                  style={{ width: `${Math.max(5, Math.min(100, stepProgressPct))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {step === 1 ? (
          <Card className="space-y-6 border border-stone-200">
            <div>
              <h2 className="text-h3 font-medium text-stone-900">Upload your Aadhaar card to get started</h2>
              <p className="mt-1 text-body-sm text-stone-600">
                Aadhaar is mandatory. We use it to auto-fill your profile and avoid manual forms.
              </p>
            </div>

            <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50 p-4">
              <label className="block text-label font-medium text-stone-800">Aadhaar file (JPG, PNG, PDF)</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="mt-2 block w-full text-body-sm"
                onChange={(event) => setAadhaarFile(event.target.files?.[0] || null)}
              />
              <Button className="mt-4" onClick={uploadAadhaar} loading={busy}>
                <UploadCloud className="h-4 w-4" />
                Upload and Extract Aadhaar
              </Button>
            </div>

            {Object.keys(aadhaarData).length > 0 ? (
              <div className="rounded-xl border border-stone-200 p-4">
                <h3 className="mb-3 text-h3 font-medium text-stone-900">We found this information. Is this correct?</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(aadhaarData).map(([key, value]) => (
                    <label key={key} className="block">
                      <span className="mb-1 block text-caption font-medium uppercase tracking-wide text-stone-500">
                        {key.replace(/_/g, ' ')}
                        {aadhaarConfidence[key] !== undefined ? (
                          <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-caption text-stone-600">
                            {Math.round(Number(aadhaarConfidence[key]) * 100)}%
                          </span>
                        ) : null}
                      </span>
                      <input
                        value={value}
                        onChange={(event) =>
                          setAadhaarData((prev) => ({
                            ...prev,
                            [key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                      />
                    </label>
                  ))}
                </div>

                <Button className="mt-4" onClick={confirmAadhaar} loading={busy}>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Aadhaar Details
                </Button>
              </div>
            ) : null}

            {aadhaarConfirmed ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-body-sm text-green-800">
                Aadhaar confirmed. Continue to optional documents.
              </div>
            ) : null}
          </Card>
        ) : null}

        {step === 2 ? (
          <Card className="space-y-5 border border-stone-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-h3 font-medium text-stone-900">Upload any additional documents you have</h2>
                <p className="mt-1 text-body-sm text-stone-600">
                  Income proof is recommended for better scheme matching, but onboarding can continue without it.
                </p>
              </div>
              <Button variant="ghost" onClick={continueToQuestions}>
                Continue to questions
              </Button>
            </div>

            <div className={incomeDone ? 'rounded-lg border border-green-200 bg-green-50 p-3 text-body-sm text-green-800' : 'rounded-lg border border-amber-200 bg-amber-50 p-3 text-body-sm text-amber-900'}>
              {incomeDone
                ? 'Income proof recorded.'
                : 'Optional but recommended: upload Income Certificate or provide manual income fallback.'}
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {OPTIONAL_DOCUMENTS.map((doc) => {
                const active = selectedDocType === doc.id
                const uploaded = uploadedDocTypes.includes(doc.id)
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocType(doc.id)
                      setOptionalDocData({})
                      setOptionalDocConfidence({})
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-orange-400 bg-orange-50'
                        : uploaded
                          ? 'border-green-300 bg-green-50'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <p className="text-micro font-medium uppercase tracking-wider text-stone-500">{doc.category}</p>
                    <p className="mt-1 text-h4 font-medium text-stone-900">{doc.label}</p>
                    <p className="mt-1 text-caption text-stone-600">{doc.hint}</p>
                  </button>
                )
              })}
            </div>

            <div className="rounded-xl border border-stone-200 p-4">
              <p className="text-body-sm font-medium text-stone-900">
                {selectedDocMeta ? `Selected: ${selectedDocMeta.label}` : 'Select a document type above'}
              </p>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="mt-3 block w-full text-body-sm"
                onChange={(event) => setOptionalDocFile(event.target.files?.[0] || null)}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={uploadOptionalDocument} loading={busy}>
                  <UploadCloud className="h-4 w-4" />
                  Upload and Extract
                </Button>
                <Button variant="secondary" onClick={continueToQuestions}>
                  Continue to questions
                </Button>
              </div>
            </div>

            {!incomeDone ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <label className="flex items-center gap-2 text-body-sm font-medium text-stone-800">
                  <input
                    type="checkbox"
                    checked={manualIncomeFallback.enabled}
                    onChange={(event) =>
                      setManualIncomeFallback((prev) => ({
                        ...prev,
                        enabled: event.target.checked,
                      }))
                    }
                  />
                  I do not have an income certificate right now (manual fallback)
                </label>

                {manualIncomeFallback.enabled ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-label font-medium text-stone-700">Declared annual income (INR)</span>
                      <input
                        type="number"
                        min="0"
                        value={manualIncomeFallback.declaredAnnualIncome}
                        onChange={(event) =>
                          setManualIncomeFallback((prev) => ({
                            ...prev,
                            declaredAnnualIncome: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-label font-medium text-stone-700">Reason for manual fallback</span>
                      <input
                        value={manualIncomeFallback.reason}
                        onChange={(event) =>
                          setManualIncomeFallback((prev) => ({
                            ...prev,
                            reason: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                        placeholder="e.g. Certificate under processing"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            {Object.keys(optionalDocData).length > 0 ? (
              <div className="rounded-xl border border-stone-200 p-4">
                <h3 className="mb-3 text-h3 font-medium text-stone-900">Confirm extracted document fields</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(optionalDocData).map(([key, value]) => (
                    <label key={key} className="block">
                      <span className="mb-1 block text-caption font-medium uppercase tracking-wide text-stone-500">
                        {key.replace(/_/g, ' ')}
                        {optionalDocConfidence[key] !== undefined ? (
                          <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-caption text-stone-600">
                            {Math.round(Number(optionalDocConfidence[key]) * 100)}%
                          </span>
                        ) : null}
                      </span>
                      <input
                        value={value}
                        onChange={(event) =>
                          setOptionalDocData((prev) => ({
                            ...prev,
                            [key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                      />
                    </label>
                  ))}
                </div>

                <Button className="mt-4" onClick={confirmOptionalDocument} loading={busy}>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Document
                </Button>
              </div>
            ) : null}

            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-body-sm text-stone-700">
              Uploaded documents: {uploadedDocTypes.length}
            </div>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card className="space-y-5 border border-stone-200">
            <div>
              <h2 className="text-h3 font-medium text-stone-900">Quick additional questions</h2>
              <p className="mt-1 text-body-sm text-stone-600">Only details that documents usually cannot provide.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-label font-medium text-stone-700">Mobile number</span>
                <input
                  value={quickData.mobile_number}
                  onChange={(event) =>
                    setQuickData((prev) => ({ ...prev, mobile_number: event.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                  placeholder="10-digit mobile number"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-label font-medium text-stone-700">Occupation type</span>
                <select
                  value={quickData.occupation}
                  onChange={(event) =>
                    setQuickData((prev) => ({ ...prev, occupation: event.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                >
                  <option value="">Select occupation</option>
                  {OCCUPATION_OPTIONS.map((occupation) => (
                    <option key={occupation} value={occupation}>
                      {occupation}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-label font-medium text-stone-700">Do you own agricultural land?</span>
                <select
                  value={quickData.owns_agricultural_land}
                  onChange={(event) =>
                    setQuickData((prev) => ({ ...prev, owns_agricultural_land: event.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                >
                  {YES_NO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-label font-medium text-stone-700">Land area (acres)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickData.land_area_acres}
                  disabled={quickData.owns_agricultural_land !== 'yes'}
                  onChange={(event) =>
                    setQuickData((prev) => ({ ...prev, land_area_acres: event.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm disabled:bg-stone-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-label font-medium text-stone-700">Are you the head of household?</span>
                <select
                  value={quickData.is_household_head}
                  onChange={(event) =>
                    setQuickData((prev) => ({ ...prev, is_household_head: event.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                >
                  {YES_NO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-label font-medium text-stone-700">Number of family members</span>
                <input
                  type="number"
                  min="1"
                  value={quickData.family_size}
                  onChange={(event) =>
                    setQuickData((prev) => ({ ...prev, family_size: event.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-label font-medium text-stone-700">Is the household woman-headed?</span>
                <select
                  value={quickData.is_woman_headed_household}
                  onChange={(event) =>
                    setQuickData((prev) => ({ ...prev, is_woman_headed_household: event.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                >
                  {YES_NO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-label font-medium text-stone-700">Bank account linked to Aadhaar?</span>
                <select
                  value={quickData.has_bank_account}
                  onChange={(event) =>
                    setQuickData((prev) => ({ ...prev, has_bank_account: event.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                >
                  {YES_NO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back to documents
              </Button>
              <Button onClick={completeOnboarding} loading={busy}>
                Complete onboarding and build profile
              </Button>
            </div>
          </Card>
        ) : null}

        {step === 4 ? (
          <Card className="space-y-5 border border-stone-200 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>

            <div>
              <h2 className="text-h2 font-medium text-stone-900">Building your scheme profile...</h2>
              <p className="mt-2 text-body-sm text-stone-600">
                Running the eligibility agent pipeline across all schemes. This may take a few seconds.
              </p>
            </div>

            <div className="mx-auto max-w-xl rounded-xl border border-stone-200 p-4">
              <p className="text-body-sm text-stone-700">Status: {jobStatus}</p>
              <div className="mt-2 h-2 rounded-full bg-stone-200">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-green-600 transition-all"
                  style={{ width: `${Math.max(5, Math.min(100, jobProgress || 5))}%` }}
                />
              </div>
              <p className="mt-2 text-caption text-stone-500">{Math.round(jobProgress || 0)}% complete</p>
            </div>

            {jobStatus === 'failed' ? (
              <div className="space-y-3">
                <p className="text-body-sm text-red-700">Eligibility pipeline failed. Please retry.</p>
                <Button onClick={retryPipeline} loading={busy}>
                  Retry pipeline
                </Button>
              </div>
            ) : null}

            <p className="text-caption text-stone-500">Do not close this tab until your dashboard is ready.</p>
          </Card>
        ) : null}

        <div className="mt-4 text-caption text-stone-500">
          Need help? You can continue later; your progress is saved securely.
        </div>
      </div>
    </div>
  )
}

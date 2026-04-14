import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileImage,
  FileText,
  Loader2,
  Pencil,
  RefreshCcw,
  Trash2,
  UploadCloud,
  WifiOff,
  XCircle,
} from 'lucide-react'
import documentService from '../services/documentService'
import profileService from '../services/profileService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

const DOCUMENT_TYPES = [
  { id: 'aadhaar', name: 'Aadhaar Card', category: 'Identity', description: 'Unique 12-digit identity number' },
  { id: 'pan_card', name: 'PAN Card', category: 'Identity', description: 'PAN number and name verification' },
  { id: 'voter_id', name: 'Voter ID', category: 'Identity', description: 'Voter ID and address details' },
  { id: 'passport', name: 'Passport', category: 'Identity', description: 'Passport number and identity details' },
  { id: 'income_certificate', name: 'Income Certificate', category: 'Income', description: 'Annual income and authority details' },
  { id: 'ration_card', name: 'BPL / Ration Card', category: 'Income', description: 'BPL status, family size, and card details' },
  { id: 'bank_passbook', name: 'Bank Passbook', category: 'Income', description: 'Bank name, account mask, and IFSC' },
  { id: 'tenth_marksheet', name: '10th Marksheet', category: 'Education', description: 'Board, year, and percentage' },
  { id: 'twelfth_marksheet', name: '12th Marksheet', category: 'Education', description: 'Board, year, and percentage' },
  { id: 'degree_certificate', name: 'Degree Certificate', category: 'Education', description: 'Degree, institution, and score' },
  { id: 'kisan_credit_card', name: 'Kisan Credit Card', category: 'Agriculture', description: 'KCC number and credit limit' },
  { id: 'land_records', name: 'Land Records / Patta', category: 'Agriculture', description: 'Land area, survey number, and type' },
  { id: 'pm_kisan_registration', name: 'PM-KISAN Registration', category: 'Agriculture', description: 'Registration status and farmer ID' },
  { id: 'soil_health_card', name: 'Soil Health Card', category: 'Agriculture', description: 'Soil type and recommendations' },
  { id: 'crop_insurance_policy', name: 'Crop Insurance Policy', category: 'Agriculture', description: 'Policy number and insured amount' },
  { id: 'disability_certificate', name: 'Disability Certificate', category: 'Special Category', description: 'Type, percentage, and authority' },
  { id: 'caste_certificate', name: 'Caste Certificate', category: 'Special Category', description: 'SC/ST/OBC certificate details' },
  { id: 'minority_certificate', name: 'Minority Certificate', category: 'Special Category', description: 'Religion and minority status proof' },
  { id: 'senior_citizen_card', name: 'Senior Citizen Card', category: 'Special Category', description: 'Age confirmation and issuing authority' },
]

const DOC_REVIEW_FIELD_ORDER = {
  aadhaar: ['full_name', 'dob', 'gender', 'aadhaar_number', 'state', 'district', 'pincode'],
  pan_card: ['full_name', 'pan_number', 'state', 'district', 'pincode'],
  voter_id: ['full_name', 'voter_id_number', 'address', 'state', 'district', 'pincode'],
  passport: ['full_name', 'passport_number', 'dob', 'gender', 'state', 'district', 'pincode'],
  income_certificate: ['full_name', 'annual_income', 'financial_year', 'issuing_authority', 'certificate_number', 'date_of_issue', 'state', 'district', 'pincode'],
  ration_card: ['full_name', 'ration_card_number', 'ration_card_category', 'bpl_status', 'family_size', 'state', 'district', 'pincode'],
  caste_certificate: ['full_name', 'caste_category', 'sub_caste', 'caste_certificate_number', 'caste_issuing_authority', 'state', 'district', 'pincode'],
  disability_certificate: ['full_name', 'disability_type', 'disability_percentage', 'disability_issuing_authority', 'state', 'district'],
  land_records: ['full_name', 'land_area_acres', 'land_survey_number', 'land_type', 'state', 'district'],
  kisan_credit_card: ['full_name', 'kcc_number', 'kcc_credit_limit', 'bank_name', 'state', 'district'],
  bank_passbook: ['full_name', 'bank_name', 'account_number_masked', 'ifsc', 'state', 'district'],
  degree_certificate: ['full_name', 'degree_name', 'institution_name', 'education_year', 'education_percentage'],
  tenth_marksheet: ['full_name', 'education_board', 'education_year', 'education_percentage'],
  twelfth_marksheet: ['full_name', 'education_board', 'education_year', 'education_percentage'],
  pm_kisan_registration: ['full_name', 'pm_kisan_registered', 'pm_kisan_farmer_id', 'state', 'district'],
  minority_certificate: ['full_name', 'religion', 'minority_status', 'state', 'district'],
  soil_health_card: ['full_name', 'soil_type', 'state', 'district'],
  crop_insurance_policy: ['full_name', 'crop_insurance_policy_number', 'crop_insurance_sum_insured', 'insured_crops', 'state', 'district'],
  senior_citizen_card: ['full_name', 'dob', 'age', 'senior_citizen_issuing_authority', 'state', 'district'],
}

const CATEGORY_ORDER = ['Identity', 'Income', 'Education', 'Agriculture', 'Special Category']

const DOC_TYPE_TO_CATEGORY = DOCUMENT_TYPES.reduce((acc, doc) => {
  acc[doc.id] = doc.category
  return acc
}, {})

const REQUIRED_CHECKLIST_ORDER = ['aadhaar', 'income_certificate', 'caste_certificate']

const REQUIRED_LABELS = {
  aadhaar: 'Aadhaar',
  income_certificate: 'Income Certificate',
  caste_certificate: 'Caste Certificate',
}

const OPTIONAL_DOC_UNLOCK_COUNTS = {
  caste_certificate: 'Unlocks 340 SC/ST schemes',
}

const getApiErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }
  if (Array.isArray(detail) && detail.length) {
    return detail.map((item) => item?.msg || 'Validation error').join(', ')
  }
  return error?.message || fallback
}

const normalizeExtractedData = (rawData, fallbackConfidence = 0) => {
  if (!rawData || typeof rawData !== 'object') {
    return {}
  }

  return Object.entries(rawData).reduce((acc, [field, value]) => {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      ('value' in value || 'confidence' in value)
    ) {
      acc[field] = {
        value: value.value ?? '',
        confidence: Number(value.confidence ?? fallbackConfidence) || 0,
        edited: Boolean(value.edited),
      }
      return acc
    }

    acc[field] = {
      value: value ?? '',
      confidence: Number(fallbackConfidence) || 0,
      edited: false,
    }
    return acc
  }, {})
}

const withExpectedReviewFields = (normalizedData, docType) => {
  const output = { ...(normalizedData || {}) }
  const orderedFields = DOC_REVIEW_FIELD_ORDER[docType] || []

  orderedFields.forEach((field) => {
    if (!(field in output)) {
      output[field] = { value: '', confidence: 0, edited: false }
    }
  })

  const orderedOutput = {}
  orderedFields.forEach((field) => {
    if (field in output) {
      orderedOutput[field] = output[field]
    }
  })
  Object.keys(output).forEach((field) => {
    if (!(field in orderedOutput)) {
      orderedOutput[field] = output[field]
    }
  })

  return orderedOutput
}

const hasMeaningfulExtractedData = (normalizedData) => {
  if (!normalizedData || typeof normalizedData !== 'object') {
    return false
  }

  const invalidValues = new Set(['', 'error', 'none', 'null', 'n/a', 'na', 'unknown'])

  return Object.values(normalizedData).some((entry) => {
    const rawValue = entry?.value
    if (rawValue === null || rawValue === undefined) {
      return false
    }
    const value = String(rawValue).trim().toLowerCase()
    if (!value || invalidValues.has(value) || value.startsWith('error:')) {
      return false
    }
    return true
  })
}

const formatFileSize = (bytes) => {
  if (!bytes || Number.isNaN(Number(bytes))) return '0 KB'
  const mb = Number(bytes) / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(2)} MB`
  const kb = Number(bytes) / 1024
  return `${kb.toFixed(1)} KB`
}

const parseDocumentExtractedData = (doc) => {
  if (!doc?.extracted_data) {
    return {}
  }
  if (typeof doc.extracted_data === 'object') {
    return doc.extracted_data
  }
  if (typeof doc.extracted_data === 'string') {
    try {
      return JSON.parse(doc.extracted_data)
    } catch {
      return {}
    }
  }
  return {}
}

const isImageFile = (filename = '') => /\.(jpg|jpeg|png|webp)$/i.test(filename)
const isPdfFile = (filename = '') => /\.pdf$/i.test(filename)

const toText = (value) => (value === null || value === undefined ? '' : String(value).trim())

const normalizeGender = (value) => {
  const lowered = toText(value).toLowerCase()
  if (!lowered) return ''
  if (lowered.startsWith('m')) return 'male'
  if (lowered.startsWith('f')) return 'female'
  if (lowered.startsWith('o')) return 'other'
  return ''
}

const normalizeDobToIso = (value) => {
  const raw = toText(value)
  if (!raw) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) {
    const dd = dmy[1].padStart(2, '0')
    const mm = dmy[2].padStart(2, '0')
    const yyyy = dmy[3]
    return `${yyyy}-${mm}-${dd}`
  }

  const ymd = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (ymd) {
    const yyyy = ymd[1]
    const mm = ymd[2].padStart(2, '0')
    const dd = ymd[3].padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  return ''
}

const calculateAgeFromDob = (isoDob) => {
  if (!isoDob) return null
  const dobDate = new Date(`${isoDob}T00:00:00`)
  if (Number.isNaN(dobDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - dobDate.getFullYear()
  const monthDiff = today.getMonth() - dobDate.getMonth()
  const dayDiff = today.getDate() - dobDate.getDate()
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1
  }
  return age >= 0 && age <= 120 ? age : null
}

const normalizeIncome = (value) => {
  const raw = toText(value)
  if (!raw) return null
  const numeric = raw.replace(/[^\d.]/g, '')
  if (!numeric) return null
  const parsed = Number.parseFloat(numeric)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const normalizePincode = (value) => {
  const digits = toText(value).replace(/\D/g, '')
  return digits.length === 6 ? digits : ''
}

const normalizeSocialCategory = (value) => {
  const lowered = toText(value).toLowerCase()
  if (!lowered) return ''
  if (lowered.includes('sc')) return 'sc'
  if (lowered.includes('st')) return 'st'
  if (lowered.includes('obc')) return 'obc'
  if (lowered.includes('ews')) return 'ews'
  if (lowered.includes('general')) return 'general'
  return ''
}

const deriveProfilePatchFromExtraction = (confirmedData, docType) => {
  if (!confirmedData || typeof confirmedData !== 'object') return {}

  const normalizedDocType = toText(docType).toLowerCase()

  const valueFor = (...keys) => {
    for (const key of keys) {
      if (key in confirmedData) {
        const text = toText(confirmedData[key])
        if (text) return text
      }
    }
    return ''
  }

  const patch = {}

  const fullName = valueFor('full_name', 'name')
  if (fullName) patch.full_name = fullName

  const dobIso = normalizeDobToIso(valueFor('dob', 'date_of_birth'))
  if (dobIso) {
    patch.dob = dobIso
    const age = calculateAgeFromDob(dobIso)
    if (age !== null) {
      patch.age = age
      if (age >= 60) patch.is_senior_citizen = 1
    }
  }

  const gender = normalizeGender(valueFor('gender', 'sex'))
  if (gender) patch.gender = gender

  const state = valueFor('state')
  if (state) patch.state = state

  const district = valueFor('district')
  if (district) patch.district = district

  const pincode = normalizePincode(valueFor('pincode', 'postal_code', 'zip_code'))
  if (pincode) patch.pincode = pincode

  const annualIncome = normalizeIncome(valueFor('annual_income', 'income'))
  if (annualIncome !== null) patch.annual_income = annualIncome

  const occupation = valueFor('occupation', 'employment', 'profession')
  if (occupation) {
    patch.occupation = occupation
    const loweredOccupation = occupation.toLowerCase()
    if (loweredOccupation.includes('farmer') || loweredOccupation.includes('agri')) patch.is_farmer = 1
    if (loweredOccupation.includes('student')) patch.is_student = 1
  }

  const socialCategory = normalizeSocialCategory(valueFor('social_category', 'category', 'caste_category'))
  if (socialCategory) patch.social_category = socialCategory

  if (normalizedDocType === 'ration' || normalizedDocType === 'ration_card') patch.has_ration_card = 1

  const rationCardType = valueFor('ration_card_type', 'ration_card_category').toLowerCase()
  if (['apl', 'bpl', 'phh', 'antyodaya'].includes(rationCardType)) {
    patch.ration_card_type = rationCardType
    if (['bpl', 'phh', 'antyodaya'].includes(rationCardType)) patch.is_bpl = 1
  }

  const explicitBpl = toText(confirmedData.is_bpl || confirmedData.bpl_status).toLowerCase()
  if (explicitBpl === '1' || explicitBpl === 'true' || explicitBpl === 'yes') patch.is_bpl = 1

  if ((normalizedDocType === 'caste' || normalizedDocType === 'caste_certificate') && socialCategory) {
    patch.social_category = socialCategory
  }

  if (normalizedDocType === 'bank_passbook') {
    patch.has_bank_account = 1
    patch.bank_account_linked = 1
  }
  if (normalizedDocType === 'minority_certificate') patch.is_minority = 1
  if (normalizedDocType === 'disability_certificate') patch.has_disability = 1

  if (normalizedDocType === 'kisan_credit_card') {
    patch.kcc_holder = 1
    patch.is_farmer = 1
  }

  if (normalizedDocType === 'crop_insurance_policy') patch.crop_insurance = 1

  if (normalizedDocType === 'pm_kisan_registration') {
    const pmKisanRegistered = toText(confirmedData.pm_kisan_registered).toLowerCase()
    if (pmKisanRegistered === '1' || pmKisanRegistered === 'true' || pmKisanRegistered === 'yes') {
      patch.pm_kisan_registered = 1
      patch.is_farmer = 1
    }
  }

  if (normalizedDocType === 'senior_citizen_card') patch.is_senior_citizen = 1

  return patch
}

const getConfidenceStyle = (confidence) => {
  const value = Number(confidence || 0)
  if (value >= 85) return { dot: 'bg-green-500', label: 'High', row: '' }
  if (value >= 60) return { dot: 'bg-amber-500', label: 'Medium', row: 'bg-amber-50/50' }
  return { dot: 'bg-red-500', label: 'Low', row: 'bg-amber-100/60 border border-amber-300' }
}

const getStatusBadge = (doc) => {
  if (doc.extraction_status === 'failed') {
    return {
      label: 'Upload Failed',
      cls: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle,
      iconClass: 'text-red-600',
    }
  }

  if (doc.extraction_status === 'processing' || doc.extraction_status === 'pending') {
    return {
      label: 'Extracting',
      cls: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Loader2,
      iconClass: 'animate-spin text-blue-600',
    }
  }

  if (doc.extraction_status === 'completed' && Number(doc.is_verified || 0) === 1) {
    return {
      label: 'Details Extracted',
      cls: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle2,
      iconClass: 'text-green-600',
    }
  }

  if (doc.extraction_status === 'completed') {
    return {
      label: 'Please Review',
      cls: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: AlertTriangle,
      iconClass: 'text-amber-600',
    }
  }

  return {
    label: 'Pending',
    cls: 'bg-stone-100 text-stone-700 border-stone-200',
    icon: AlertTriangle,
    iconClass: 'text-stone-500',
  }
}

const getDocTypeMeta = (docType) => DOCUMENT_TYPES.find((item) => item.id === docType)

const getLatestDocumentForType = (docType, uploadedDocs) => {
  const docs = (uploadedDocs || [])
    .filter((doc) => doc.doc_type === docType)
    .sort((a, b) => String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || '')))

  return docs[0] || null
}

const getChecklistStatus = (docType, uploadedDocs) => {
  const latestDoc = getLatestDocumentForType(docType, uploadedDocs)
  if (!latestDoc) {
    return { status: 'not_uploaded', latestDoc: null }
  }

  const extractionStatus = String(latestDoc.extraction_status || '').toLowerCase()

  if (extractionStatus === 'failed') {
    return { status: 'failed', latestDoc }
  }

  if (extractionStatus === 'processing' || extractionStatus === 'pending') {
    return { status: 'processing', latestDoc }
  }

  if (extractionStatus === 'completed' && Number(latestDoc.is_verified || 0) === 1) {
    return { status: 'completed_verified', latestDoc }
  }

  if (extractionStatus === 'completed') {
    return { status: 'completed_review', latestDoc }
  }

  return { status: 'uploaded', latestDoc }
}

export default function UploadDocuments() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const tr = (key, fallback) => {
    const value = t(key)
    return value && value !== key ? value : fallback
  }

  const [selectedDocType, setSelectedDocType] = useState('aadhaar')
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [extractionState, setExtractionState] = useState('idle')
  const [activeDocId, setActiveDocId] = useState(null)
  const [extractedData, setExtractedData] = useState({})
  const [editingField, setEditingField] = useState(null)
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [profile, setProfile] = useState(null)
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)

  const selectedDocMeta = getDocTypeMeta(selectedDocType)

  const loadUploadedDocs = async () => {
    try {
      const response = await documentService.getDocuments()
      const docs = Array.isArray(response.data) ? response.data : []
      docs.sort((a, b) => String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || '')))
      setUploadedDocs(docs)
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('documents.fetchListError', 'Failed to load uploaded documents')))
    }
  }

  const loadProfile = async () => {
    try {
      const response = await profileService.getProfile()
      setProfile(response.data || null)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    const init = async () => {
      setIsLoadingDocs(true)
      await Promise.all([loadUploadedDocs(), loadProfile()])
      setIsLoadingDocs(false)
    }
    init()
  }, [])

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true)
      toast.error(tr('documents.offlineMessage', 'You are offline. Reconnect and try again.'), {
        toastId: 'documents-offline',
      })
    }

    const handleOnline = () => {
      setIsOffline(false)
      toast.success(tr('documents.onlineMessage', 'Connection restored.'), {
        toastId: 'documents-online',
      })
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [t])

  const resetCurrentUploadState = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    setExtractionState('idle')
    setActiveDocId(null)
    setExtractedData({})
    setEditingField(null)
  }

  const focusUploadForDocType = (docType) => {
    setSelectedDocType(docType)
    resetCurrentUploadState()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const shouldOfferManualEntry = (message) => {
    const lowered = String(message || '').toLowerCase()
    return (
      lowered.includes('tesseract')
      || lowered.includes('ocr engine unavailable')
      || lowered.includes('pytesseract')
    )
  }

  const openManualEntryFallback = (docId, docType, message) => {
    setSelectedDocType(docType)
    setActiveDocId(docId)
    setExtractedData(withExpectedReviewFields({}, docType))
    setExtractionState('needs_review')
    setEditingField(null)
    setSelectedFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast.warn(
      message || tr('documents.manualEntryFallback', 'Auto extraction is unavailable. Please enter details manually.'),
      { toastId: `manual-${docId}` }
    )
  }

  const onSelectFile = (file) => {
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      toast.error(tr('documents.validationError.invalidType', 'Invalid file type. Use JPG, PNG, or PDF.'))
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(tr('documents.validationError.fileTooLarge', 'File too large. Max 10MB per file.'))
      return
    }

    setSelectedFile(file)
    setExtractionState('idle')
    setUploadProgress(0)
    setExtractedData({})
    setActiveDocId(null)
    setEditingField(null)
  }

  const pollExtractionStatus = async (docId, docType) => {
    let attempts = 0
    const maxAttempts = 60

    const check = async () => {
      attempts += 1
      try {
        const response = await documentService.getDocument(docId)
        const doc = response.data

        if (doc.extraction_status === 'completed') {
          const confidenceScore = Number(doc.confidence_score || 0)
          const normalizedConfidence =
            confidenceScore > 0 && confidenceScore <= 1
              ? Math.round(confidenceScore * 100)
              : Math.round(confidenceScore)

          const normalized = normalizeExtractedData(parseDocumentExtractedData(doc), normalizedConfidence)
          const reviewReady = withExpectedReviewFields(normalized, docType)

          if (!hasMeaningfulExtractedData(reviewReady)) {
            const fallbackMessage = doc.error_message || tr('documents.extractionSparse', 'Extraction is incomplete. Please review manually.')
            openManualEntryFallback(doc.id, docType, fallbackMessage)
          } else {
            setExtractedData(reviewReady)
            const hasLowConfidence = Object.values(reviewReady).some((field) => Number(field?.confidence || 0) < 60)
            setExtractionState(hasLowConfidence ? 'needs_review' : 'completed')
            toast.success(tr('documents.extractionComplete', 'Extraction complete'))
          }

          await loadUploadedDocs()
          return
        }

        if (doc.extraction_status === 'failed') {
          const failureMessage = doc.error_message || tr('documents.extractionFailed', 'Extraction failed. Please try re-upload.')
          if (shouldOfferManualEntry(failureMessage)) {
            openManualEntryFallback(doc.id, docType, tr('documents.manualEntryFallback', 'OCR unavailable. Please enter details manually.'))
          } else {
            setExtractionState('failed')
            toast.error(failureMessage)
          }
          await loadUploadedDocs()
          return
        }

        if (attempts < maxAttempts) {
          setTimeout(check, 2000)
        } else {
          setExtractionState('failed')
          toast.error(tr('documents.networkTimeout', 'Network timeout while checking extraction. Please retry.'))
        }
      } catch (error) {
        if (attempts < maxAttempts) {
          setTimeout(check, 2000)
        } else {
          setExtractionState('failed')
          const isOfflineNow = typeof navigator !== 'undefined' && !navigator.onLine
          const code = String(error?.code || '').toLowerCase()
          const status = Number(error?.response?.status || 0)

          if (isOfflineNow || code === 'err_network') {
            toast.error(tr('documents.offlineMessage', 'You are offline. Reconnect and try again.'))
          } else if (code === 'econnaborted' || /timeout/i.test(String(error?.message || ''))) {
            toast.error(tr('documents.networkTimeout', 'Network timeout while checking extraction. Please retry.'))
          } else if (status >= 500) {
            toast.error(tr('documents.serverRetryMessage', 'Server error while checking status. Please retry.'))
          } else {
            toast.error(getApiErrorMessage(error, tr('documents.statusError', 'Failed to check extraction status')))
          }
        }
      }
    }

    check()
  }

  const handleUploadAndExtract = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error(tr('documents.offlineMessage', 'You are offline. Reconnect and try again.'))
      return
    }

    if (!selectedDocType) {
      toast.error(tr('documents.validationError.docTypeRequired', 'Please select document type first.'))
      return
    }
    if (!selectedFile) {
      toast.error(tr('documents.validationError.fileRequired', 'Please choose a file first.'))
      return
    }

    setIsUploading(true)
    setExtractionState('uploading')
    setUploadProgress(0)

    try {
      const response = await documentService.uploadDocument(selectedFile, selectedDocType, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(Math.min(100, Math.max(0, percent)))
        },
      })

      const docId = response?.data?.doc_id
      if (!docId) {
        throw new Error('Document upload did not return document id')
      }

      setActiveDocId(docId)
      setIsUploading(false)
      setExtractionState('extracting')
      setUploadProgress(100)
      await pollExtractionStatus(docId, selectedDocType)
    } catch (error) {
      setIsUploading(false)
      setExtractionState('failed')
      const code = String(error?.code || '').toLowerCase()
      const status = Number(error?.response?.status || 0)
      const isOfflineNow = typeof navigator !== 'undefined' && !navigator.onLine

      if (isOfflineNow || code === 'err_network') {
        toast.error(tr('documents.offlineMessage', 'You are offline. Reconnect and try again.'))
      } else if (code === 'econnaborted' || /timeout/i.test(String(error?.message || ''))) {
        toast.error(tr('documents.networkTimeout', 'Network timeout during upload. Please retry.'))
      } else if (status >= 500) {
        toast.error(tr('documents.serverRetryMessage', 'Server error during upload. Please retry.'))
      } else {
        toast.error(getApiErrorMessage(error, tr('documents.uploadFailed', 'Upload failed')))
      }
    }
  }

  const handleRetryExtraction = async (doc) => {
    if (!doc?.id) return

    try {
      setSelectedDocType(doc.doc_type)
      setActiveDocId(doc.id)
      setExtractionState('extracting')
      setExtractedData({})
      setEditingField(null)

      await documentService.reprocessDocument(doc.id)
      toast.info(tr('documents.retryStarted', 'Retry started. Extracting again...'))
      await pollExtractionStatus(doc.id, doc.doc_type)
    } catch (error) {
      setExtractionState('failed')
      const status = Number(error?.response?.status || 0)
      if (status >= 500) {
        toast.error(tr('documents.serverRetryMessage', 'Server error while retrying extraction. Please retry.'))
        return
      }
      toast.error(getApiErrorMessage(error, tr('documents.retryFailed', 'Failed to retry extraction')))
    }
  }

  const handleFieldEdit = (field, value) => {
    setExtractedData((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] || {}),
        value,
        edited: true,
      },
    }))
  }

  const handleConfirmAndSave = async () => {
    if (!activeDocId) {
      toast.error(tr('documents.noActiveDocument', 'No document selected for saving'))
      return
    }

    const cleanedData = Object.entries(extractedData).reduce((acc, [field, item]) => {
      acc[field] = item?.value ?? ''
      return acc
    }, {})

    setIsSavingReview(true)
    try {
      await documentService.updateExtraction(activeDocId, cleanedData)

      const profilePatch = deriveProfilePatchFromExtraction(cleanedData, selectedDocType)
      if (Object.keys(profilePatch).length > 0) {
        await profileService.updateProfile(profilePatch)
      }

      toast.success(tr('documents.savedSuccess', 'Extracted data confirmed and saved'))
      setExtractionState('completed')
      await Promise.all([loadUploadedDocs(), loadProfile()])
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('documents.saveFailed', 'Failed to save extraction data')))
    } finally {
      setIsSavingReview(false)
    }
  }

  const handleDeleteDocument = async (docId) => {
    const confirmDelete = window.confirm(tr('documents.confirmDelete', 'Delete this uploaded document?'))
    if (!confirmDelete) return

    try {
      await documentService.deleteDocument(docId)
      toast.success(tr('documents.deleteSuccess', 'Document deleted successfully'))

      if (activeDocId === docId) {
        resetCurrentUploadState()
      }

      await loadUploadedDocs()
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('documents.deleteFailed', 'Failed to delete document')))
    }
  }

  const handleViewExtractedData = (doc) => {
    const normalized = normalizeExtractedData(parseDocumentExtractedData(doc), Number(doc.confidence_score || 0) * 100)
    const reviewReady = withExpectedReviewFields(normalized, doc.doc_type)

    setSelectedDocType(doc.doc_type)
    setActiveDocId(doc.id)
    setExtractedData(reviewReady)
    setSelectedFile(null)
    const hasLowConfidence = Object.values(reviewReady).some((field) => Number(field?.confidence || 0) < 60)
    setExtractionState(hasLowConfidence ? 'needs_review' : 'completed')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const groupedDocuments = useMemo(() => {
    const groups = {
      Identity: [],
      Income: [],
      Education: [],
      Agriculture: [],
      'Special Category': [],
    }

    uploadedDocs.forEach((doc) => {
      const category = DOC_TYPE_TO_CATEGORY[doc.doc_type] || 'Special Category'
      const normalizedCategory = CATEGORY_ORDER.includes(category) ? category : 'Special Category'
      groups[normalizedCategory].push(doc)
    })

    return groups
  }, [uploadedDocs])

  const checklistItems = useMemo(() => {
    const socialCategory = String(profile?.social_category || profile?.caste_category || '').toLowerCase()
    const casteRequired = ['sc', 'st', 'obc'].includes(socialCategory)

    return REQUIRED_CHECKLIST_ORDER.map((docType) => {
      const statusInfo = getChecklistStatus(docType, uploadedDocs)

      if (docType === 'caste_certificate') {
        return {
          docType,
          label: REQUIRED_LABELS[docType],
          required: casteRequired,
          uploaded: statusInfo.status !== 'not_uploaded' && statusInfo.status !== 'failed',
          status: statusInfo.status,
          latestDoc: statusInfo.latestDoc,
          unlockHint: !casteRequired ? OPTIONAL_DOC_UNLOCK_COUNTS[docType] : '',
        }
      }

      return {
        docType,
        label: REQUIRED_LABELS[docType],
        required: true,
        uploaded: statusInfo.status !== 'not_uploaded' && statusInfo.status !== 'failed',
        status: statusInfo.status,
        latestDoc: statusInfo.latestDoc,
        unlockHint: '',
      }
    })
  }, [profile, uploadedDocs])

  const aadhaarChecklistItem = checklistItems.find((item) => item.docType === 'aadhaar')
  const isAadhaarUploaded = Boolean(
    aadhaarChecklistItem
    && ['processing', 'completed_verified', 'completed_review', 'uploaded'].includes(aadhaarChecklistItem.status)
  )

  const allDocumentTypeItems = useMemo(() => {
    return DOCUMENT_TYPES.map((docMeta) => {
      const statusInfo = getChecklistStatus(docMeta.id, uploadedDocs)
      return {
        ...docMeta,
        status: statusInfo.status,
        latestDoc: statusInfo.latestDoc,
        unlockHint: OPTIONAL_DOC_UNLOCK_COUNTS[docMeta.id] || '',
      }
    })
  }, [uploadedDocs])

  const extractionIndicator = (() => {
    if (extractionState === 'extracting' || extractionState === 'uploading') {
      return {
        cls: 'bg-blue-50 border-blue-200 text-blue-800',
        text: tr('documents.extracting', 'Extracting information...'),
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
      }
    }
    if (extractionState === 'completed') {
      return {
        cls: 'bg-green-50 border-green-200 text-green-800',
        text: tr('documents.extractionComplete', 'Extraction complete'),
        icon: <CheckCircle2 className="h-4 w-4" />,
      }
    }
    if (extractionState === 'needs_review') {
      return {
        cls: 'bg-amber-50 border-amber-200 text-amber-900',
        text: tr('documents.extractionNeedsReview', 'Extraction needs review'),
        icon: <AlertTriangle className="h-4 w-4" />,
      }
    }
    if (extractionState === 'failed') {
      return {
        cls: 'bg-red-50 border-red-200 text-red-700',
        text: tr('documents.extractionFailed', 'Extraction failed. Please re-upload.'),
        icon: <AlertTriangle className="h-4 w-4" />,
      }
    }
    return null
  })()

  const handleDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setDragOver(false)
    const file = event.dataTransfer?.files?.[0]
    onSelectFile(file)
  }

  const getChecklistStatusMeta = (status) => {
    if (status === 'completed_verified') {
      return {
        label: 'Details extracted',
        tone: 'text-green-700',
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      }
    }

    if (status === 'completed_review') {
      return {
        label: 'Please review',
        tone: 'text-amber-700',
        icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
      }
    }

    if (status === 'failed') {
      return {
        label: 'Upload failed',
        tone: 'text-red-700',
        icon: <XCircle className="h-4 w-4 text-red-600" />,
      }
    }

    if (status === 'processing') {
      return {
        label: 'Extracting',
        tone: 'text-blue-700',
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-600" />,
      }
    }

    if (status === 'uploaded') {
      return {
        label: 'Uploaded',
        tone: 'text-blue-700',
        icon: <CheckCircle2 className="h-4 w-4 text-blue-600" />,
      }
    }

    return {
      label: 'Not uploaded',
      tone: 'text-stone-600',
      icon: <AlertTriangle className="h-4 w-4 text-stone-500" />,
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('uploadDocuments.title', 'Upload Documents')}
        description={tr('uploadDocuments.subtitle', 'Upload and verify your documents to improve eligibility matching accuracy')}
        actions={<Button variant="ghost" onClick={() => navigate('/dashboard')}>{tr('common.back', 'Back')}</Button>}
      />

      {isOffline ? (
        <Card className="border border-amber-300 bg-amber-50">
          <div className="flex items-start gap-2 text-body-sm text-amber-900">
            <WifiOff className="mt-0.5 h-4 w-4" />
            <p>{tr('documents.offlineMessage', 'You are offline. Reconnect and try again.')}</p>
          </div>
        </Card>
      ) : null}

      <Card className="border border-stone-200 bg-gradient-to-r from-orange-50 via-white to-green-50">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-h3 font-medium text-stone-900">Upload these documents to unlock more scheme matches</h2>
              <p className="mt-1 text-body-sm text-stone-600">Required and recommended checklist based on your profile.</p>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <Button onClick={() => navigate('/eligibility')} disabled={!isAadhaarUploaded}>
                Continue
              </Button>
              {!isAadhaarUploaded ? (
                <p className="text-caption text-stone-600">Upload Aadhaar first to continue.</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {checklistItems.map((item) => {
              const statusMeta = getChecklistStatusMeta(item.status)
              return (
                <div key={item.docType} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-body-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-stone-900">{item.label}</p>
                    <span className="text-caption text-stone-500">{item.required ? 'Required' : 'Optional'}</span>
                  </div>

                  <div className={`mt-1 inline-flex items-center gap-1 text-caption font-medium ${statusMeta.tone}`}>
                    {statusMeta.icon}
                    <span>{statusMeta.label}</span>
                  </div>

                  {item.unlockHint ? (
                    <p className="mt-1 text-caption text-stone-600">{item.unlockHint}</p>
                  ) : null}

                  {item.status === 'failed' && item.latestDoc?.error_message ? (
                    <p className="mt-1 line-clamp-2 text-caption text-red-700">{item.latestDoc.error_message}</p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.status === 'not_uploaded' ? (
                      <button
                        type="button"
                        className="rounded-md border border-blue-200 px-2 py-1 text-caption font-medium text-blue-700 hover:bg-blue-50"
                        onClick={() => focusUploadForDocType(item.docType)}
                      >
                        Upload
                      </button>
                    ) : null}

                    {item.status === 'failed' && item.latestDoc ? (
                      <button
                        type="button"
                        className="rounded-md border border-red-200 px-2 py-1 text-caption font-medium text-red-700 hover:bg-red-50"
                        onClick={() => handleRetryExtraction(item.latestDoc)}
                      >
                        Retry
                      </button>
                    ) : null}

                    {item.status === 'completed_review' && item.latestDoc ? (
                      <button
                        type="button"
                        className="rounded-md border border-amber-200 px-2 py-1 text-caption font-medium text-amber-700 hover:bg-amber-50"
                        onClick={() => handleViewExtractedData(item.latestDoc)}
                      >
                        Review
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="border border-stone-200">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-label font-medium text-stone-800">Document type</label>
                <select
                  value={selectedDocType}
                  onChange={(event) => {
                    setSelectedDocType(event.target.value)
                    resetCurrentUploadState()
                  }}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-body-sm text-stone-800"
                >
                  {DOCUMENT_TYPES.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.category})
                    </option>
                  ))}
                </select>
                {selectedDocMeta ? (
                  <p className="mt-2 text-body-sm text-stone-600">{selectedDocMeta.description}</p>
                ) : null}
              </div>

              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setDragOver(true)
                }}
                onDragLeave={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setDragOver(false)
                }}
                onDrop={handleDrop}
                onClick={() => document.getElementById('upload-doc-file-input')?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                  dragOver
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-stone-300 bg-stone-50 hover:border-orange-400 hover:bg-orange-50/60'
                }`}
              >
                <UploadCloud className="mx-auto h-12 w-12 text-orange-700" />
                <h3 className="mt-3 text-h3 font-medium text-stone-900">Drag files here or click to browse</h3>
                <p className="mt-1 text-body-sm text-stone-600">JPG, PNG, PDF · Max 10MB per file</p>
              </div>

              <input
                id="upload-doc-file-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                className="hidden"
                onChange={(event) => onSelectFile(event.target.files?.[0])}
              />

              {selectedFile ? (
                <div className="rounded-xl border border-stone-200 bg-white p-3">
                  <div className="flex items-center gap-3">
                    {isImageFile(selectedFile.name) ? <FileImage className="h-5 w-5 text-blue-700" /> : <FileText className="h-5 w-5 text-red-700" />}
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-stone-900">{selectedFile.name}</p>
                      <p className="text-caption text-stone-600">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleUploadAndExtract} loading={isUploading}>
                  <UploadCloud className="h-4 w-4" />
                  Upload & Extract
                </Button>
                <Button variant="secondary" onClick={resetCurrentUploadState}>
                  <RefreshCcw className="h-4 w-4" />
                  Re-upload
                </Button>
              </div>

              {(isUploading || extractionState === 'uploading' || extractionState === 'extracting') ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-body-sm text-stone-700">
                    <span>Upload progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-200">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-green-600 transition-all"
                      style={{ width: `${Math.max(2, uploadProgress)}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {extractionIndicator ? (
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-body-sm ${extractionIndicator.cls}`}>
                  {extractionIndicator.icon}
                  <span>{extractionIndicator.text}</span>
                </div>
              ) : null}

              <p className="text-caption text-stone-500">Supported formats shown below: JPG, PNG, PDF · Max 10MB per file</p>
            </div>
          </Card>

          {Object.keys(extractedData).length > 0 ? (
            <Card className="border border-stone-200">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-h3 font-medium text-stone-900">Extracted data review</h3>
                <span className="text-caption text-stone-500">Click the edit icon to correct values</span>
              </div>

              <div className="space-y-2">
                {Object.entries(extractedData).map(([field, item]) => {
                  const style = getConfidenceStyle(item?.confidence)
                  const isEditing = editingField === field
                  return (
                    <div key={field} className={`rounded-lg px-3 py-2 ${style.row || 'border border-stone-200'}`}>
                      <div className="grid items-center gap-2 md:grid-cols-[1.1fr_2fr_auto]">
                        <p className="text-body-sm font-medium capitalize text-stone-800">{field.replace(/_/g, ' ')}</p>
                        {isEditing ? (
                          <input
                            value={item?.value ?? ''}
                            onChange={(event) => handleFieldEdit(field, event.target.value)}
                            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-body-sm"
                            onBlur={() => setEditingField(null)}
                          />
                        ) : (
                          <p className="text-body-sm text-stone-700">{toText(item?.value) || '—'}</p>
                        )}

                        <div className="flex items-center gap-2 justify-self-end">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot}`} />
                          <span className="text-caption text-stone-600">{style.label}</span>
                          <button
                            type="button"
                            onClick={() => setEditingField(isEditing ? null : field)}
                            className="rounded-md p-1 text-stone-600 hover:bg-stone-100"
                            title="Edit field"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {Number(item?.confidence || 0) < 50 ? (
                        <p className="mt-1 text-caption text-amber-800">We couldn't read this clearly - please enter manually.</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={handleConfirmAndSave} loading={isSavingReview}>
                  Confirm & Save
                </Button>
                <Button variant="secondary" onClick={resetCurrentUploadState}>
                  Re-upload
                </Button>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card className="border border-stone-200">
            <h3 className="text-h3 font-medium text-stone-900">Document checklist</h3>
            <p className="mt-1 text-body-sm text-stone-600">Each document type with current status.</p>

            <div className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
              {allDocumentTypeItems.map((item) => {
                const statusMeta = getChecklistStatusMeta(item.status)
                return (
                  <div key={item.id} className="rounded-lg border border-stone-200 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-body-sm font-medium text-stone-900">{item.name}</p>
                        <p className="text-caption text-stone-500">{item.category}</p>
                      </div>
                      <div className={`inline-flex items-center gap-1 text-caption font-medium ${statusMeta.tone}`}>
                        {statusMeta.icon}
                        <span>{statusMeta.label}</span>
                      </div>
                    </div>

                    {item.unlockHint ? (
                      <p className="mt-1 text-caption text-stone-600">{item.unlockHint}</p>
                    ) : null}

                    {item.status === 'failed' && item.latestDoc?.error_message ? (
                      <p className="mt-1 line-clamp-2 text-caption text-red-700">{item.latestDoc.error_message}</p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.status === 'not_uploaded' ? (
                        <button
                          type="button"
                          className="rounded-md border border-blue-200 px-2 py-1 text-caption font-medium text-blue-700 hover:bg-blue-50"
                          onClick={() => focusUploadForDocType(item.id)}
                        >
                          Upload
                        </button>
                      ) : null}

                      {item.status === 'failed' && item.latestDoc ? (
                        <button
                          type="button"
                          className="rounded-md border border-red-200 px-2 py-1 text-caption font-medium text-red-700 hover:bg-red-50"
                          onClick={() => handleRetryExtraction(item.latestDoc)}
                        >
                          Retry
                        </button>
                      ) : null}

                      {item.status === 'completed_review' && item.latestDoc ? (
                        <button
                          type="button"
                          className="rounded-md border border-amber-200 px-2 py-1 text-caption font-medium text-amber-700 hover:bg-amber-50"
                          onClick={() => handleViewExtractedData(item.latestDoc)}
                        >
                          Review
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="border border-stone-200">
            <h3 className="text-h3 font-medium text-stone-900">Uploaded documents</h3>
            <p className="mt-1 text-body-sm text-stone-600">Grouped by category with extraction status and actions.</p>

            {isLoadingDocs ? (
              <div className="mt-4 flex items-center gap-2 text-body-sm text-stone-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading documents...
              </div>
            ) : uploadedDocs.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-stone-400" />
                <p className="mt-2 text-body-sm font-medium text-stone-700">No documents uploaded yet.</p>
                <p className="text-caption text-stone-500">Start with your Aadhaar card.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {CATEGORY_ORDER.map((category) => {
                  const docs = groupedDocuments[category] || []
                  if (!docs.length) return null

                  return (
                    <div key={category}>
                      <p className="mb-2 text-caption font-medium uppercase tracking-wider text-stone-500">{category}</p>
                      <div className="space-y-2">
                        {docs.map((doc) => {
                          const meta = getDocTypeMeta(doc.doc_type)
                          const statusBadge = getStatusBadge(doc)
                          const extractedPayload = parseDocumentExtractedData(doc)
                          const canView = Boolean(extractedPayload && Object.keys(extractedPayload).length)
                          const isFailed = String(doc.extraction_status || '').toLowerCase() === 'failed'
                          const StatusIcon = statusBadge.icon
                          return (
                            <div key={doc.id} className="rounded-xl border border-stone-200 bg-white p-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-lg bg-stone-100">
                                  {isImageFile(doc.file_name) ? (
                                    <FileImage className="h-5 w-5 text-blue-700" />
                                  ) : isPdfFile(doc.file_name) ? (
                                    <FileText className="h-5 w-5 text-red-700" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-stone-600" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-orange-100 px-2 py-1 text-caption font-medium text-orange-800">
                                      {meta?.name || doc.doc_type}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-caption font-medium ${statusBadge.cls}`}>
                                      <StatusIcon className={`h-3.5 w-3.5 ${statusBadge.iconClass || ''}`} />
                                      {statusBadge.label}
                                    </span>
                                  </div>

                                  <p className="mt-2 truncate text-body-sm font-medium text-stone-900">{doc.file_name}</p>
                                  <p className="text-caption text-stone-500">Uploaded: {new Date(doc.uploaded_at).toLocaleString()}</p>

                                  {isFailed ? (
                                    <p className="mt-1 text-caption text-red-700">
                                      {doc.error_message || tr('documents.serverRetryMessage', 'Upload failed due to a server error. Please retry.')}
                                    </p>
                                  ) : null}

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={!canView}
                                      className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-caption text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                                      onClick={() => handleViewExtractedData(doc)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      View extracted data
                                    </button>
                                    {isFailed ? (
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-caption text-red-700"
                                        onClick={() => handleRetryExtraction(doc)}
                                      >
                                        <RefreshCcw className="h-3.5 w-3.5" />
                                        Retry
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-caption text-stone-700"
                                      onClick={() => focusUploadForDocType(doc.doc_type)}
                                    >
                                      <RefreshCcw className="h-3.5 w-3.5" />
                                      Re-upload
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-caption text-red-700"
                                      onClick={() => handleDeleteDocument(doc.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
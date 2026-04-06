// frontend/src/pages/UploadDocuments.jsx
/**
 * UploadDocuments - Complete document upload workflow
 * Workflow:
 * Step 1: Select document type
 * Step 2: Upload via drag-drop or camera
 * Step 3: Show processing status
 * Step 4: Review extracted data
 * Step 5: Success confirmation
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { Camera, CheckCircle, FileText, Image as ImageIcon, Loader } from 'lucide-react'
import DocumentUploader from '../components/documents/DocumentUploader'
import CameraCapture from '../components/documents/CameraCapture'
import ExtractionReview from '../components/documents/ExtractionReview'
import documentService from '../services/documentService'
import profileService from '../services/profileService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

const DOCUMENT_TYPES = [
  {
    id: 'aadhaar',
    name: 'Aadhaar Card',
    description: 'Unique 12-digit number',
    icon: FileText,
  },
  {
    id: 'income',
    name: 'Income Certificate',
    description: 'Latest tax or salary certificate',
    icon: FileText,
  },
  {
    id: 'caste',
    name: 'Caste Certificate',
    description: 'SC/ST/OBC certificate if applicable',
    icon: FileText,
  },
  {
    id: 'ration',
    name: 'Ration Card',
    description: 'BPL or APL ration card',
    icon: FileText,
  },
]

const DOC_REVIEW_FIELD_ORDER = {
  aadhaar: ['full_name', 'dob', 'gender', 'aadhaar_number', 'state', 'district', 'pincode'],
  income: ['full_name', 'annual_income', 'occupation', 'state', 'district', 'pincode'],
  caste: ['full_name', 'social_category', 'state', 'district', 'pincode'],
  ration: ['full_name', 'ration_card_number', 'ration_card_type', 'is_bpl', 'state', 'district', 'pincode'],
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
      output[field] = {
        value: '',
        confidence: 0,
        edited: false,
      }
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

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
  if (!confirmedData || typeof confirmedData !== 'object') {
    return {}
  }

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
  if (fullName) {
    patch.full_name = fullName
  }

  const dobIso = normalizeDobToIso(valueFor('dob', 'date_of_birth'))
  if (dobIso) {
    patch.dob = dobIso
    const age = calculateAgeFromDob(dobIso)
    if (age !== null) {
      patch.age = age
      if (age >= 60) {
        patch.is_senior_citizen = 1
      }
    }
  }

  const gender = normalizeGender(valueFor('gender', 'sex'))
  if (gender) {
    patch.gender = gender
  }

  const state = valueFor('state')
  if (state) {
    patch.state = state
  }

  const district = valueFor('district')
  if (district) {
    patch.district = district
  }

  const pincode = normalizePincode(valueFor('pincode', 'postal_code', 'zip_code'))
  if (pincode) {
    patch.pincode = pincode
  }

  const annualIncome = normalizeIncome(valueFor('annual_income', 'income'))
  if (annualIncome !== null) {
    patch.annual_income = annualIncome
  }

  const occupation = valueFor('occupation', 'employment', 'profession')
  if (occupation) {
    patch.occupation = occupation
    const loweredOccupation = occupation.toLowerCase()
    if (loweredOccupation.includes('farmer') || loweredOccupation.includes('agri')) {
      patch.is_farmer = 1
    }
    if (loweredOccupation.includes('student')) {
      patch.is_student = 1
    }
  }

  const socialCategory = normalizeSocialCategory(valueFor('social_category', 'category', 'caste_category'))
  if (socialCategory) {
    patch.social_category = socialCategory
  }

  if (docType === 'ration') {
    patch.has_ration_card = 1
  }

  const rationCardType = valueFor('ration_card_type').toLowerCase()
  if (['apl', 'bpl', 'phh', 'antyodaya'].includes(rationCardType)) {
    patch.ration_card_type = rationCardType
    if (['bpl', 'phh', 'antyodaya'].includes(rationCardType)) {
      patch.is_bpl = 1
    }
  }

  const explicitBpl = toText(confirmedData.is_bpl).toLowerCase()
  if (explicitBpl === '1' || explicitBpl === 'true' || explicitBpl === 'yes') {
    patch.is_bpl = 1
  }

  if (docType === 'caste' && socialCategory) {
    patch.social_category = socialCategory
  }

  return patch
}

export default function UploadDocuments() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const tr = (key, fallback) => {
    const value = t(key)
    return value && value !== key ? value : fallback
  }
  const [step, setStep] = useState(1) // 1: select, 2: upload, 3: processing, 4: review, 5: success
  const [selectedDocType, setSelectedDocType] = useState(null)
  const [useCamera, setUseCamera] = useState(false)
  const [docId, setDocId] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)

  /**
   * Step 1: Select document type
   */
  const handleSelectDocType = (docType) => {
    setSelectedDocType(docType)
    setUseCamera(false)
    setStep(2)
  }

  /**
   * Step 2: Upload document
   */
  const handleUploadSuccess = (uploadDocId) => {
    setDocId(uploadDocId)
    setStep(3) // Go to processing
    pollExtractionStatus(uploadDocId)
  }

  const handleUploadError = (error) => {
    console.error('Upload error:', error)
    const message =
      typeof error === 'string'
        ? error
        : getApiErrorMessage(error, tr('documents.uploadFailed', 'Upload failed'))
    toast.error(message)
  }

  /**
   * Step 3: Poll for extraction completion
   */
  const pollExtractionStatus = async (docIdToPoll) => {
    setIsProcessing(true)
    let attempts = 0
    const maxAttempts = 60 // 5 minutes (5 sec * 60)

    const poll = async () => {
      attempts++

      try {
        const response = await documentService.getDocument(docIdToPoll)
        const doc = response.data

        // Check if processing complete
        if (doc.extraction_status === 'completed') {
          const confidenceScore = Number(doc.confidence_score || 0)
          const normalizedConfidence =
            confidenceScore > 0 && confidenceScore <= 1
              ? Math.round(confidenceScore * 100)
              : Math.round(confidenceScore)

          let parsedExtractionData = {}
          if (typeof doc.extracted_data === 'string') {
            try {
              parsedExtractionData = JSON.parse(doc.extracted_data || '{}')
            } catch {
              parsedExtractionData = {}
            }
          } else if (doc.extracted_data && typeof doc.extracted_data === 'object') {
            parsedExtractionData = doc.extracted_data
          }

          const normalizedData = normalizeExtractedData(
            parsedExtractionData,
            normalizedConfidence
          )
          const reviewReadyData = withExpectedReviewFields(
            normalizedData,
            selectedDocType
          )

          if (!hasMeaningfulExtractedData(reviewReadyData)) {
            setIsProcessing(false)
            toast.error(
              doc.error_message ||
                tr(
                  'documents.extractionFailed',
                  'Extraction failed. Please try again with a clearer document.'
                )
            )
            setStep(2)
            return
          }

          setExtractedData(reviewReadyData)
          setIsProcessing(false)
          setStep(4) // Go to review
          toast.success(tr('documents.extractionComplete', 'Extraction complete!'))
        } else if (doc.extraction_status === 'failed') {
          setIsProcessing(false)
          toast.error(
            doc.error_message ||
              tr('documents.extractionFailed', 'Extraction failed. Please try again.')
          )
          setStep(2) // Back to upload
        } else if (attempts < maxAttempts) {
          // Still processing, poll again in 5 seconds
          setTimeout(poll, 5000)
        } else {
          // Timeout
          setIsProcessing(false)
          toast.error(
            tr('documents.extractionTimeout', 'Extraction took too long. Please try again.')
          )
          setStep(2)
        }
      } catch (error) {
        console.error('Poll error:', error)
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          setIsProcessing(false)
          toast.error(getApiErrorMessage(error, 'Error checking extraction status'))
          setStep(2)
        }
      }
    }

    poll()
  }

  /**
   * Step 4: Confirm extracted data
   */
  const handleConfirmExtraction = async (confirmedData) => {
    try {
      if (docId) {
        await documentService.updateExtraction(docId, confirmedData)
      }

      const profilePatch = deriveProfilePatchFromExtraction(
        confirmedData,
        selectedDocType
      )

      if (Object.keys(profilePatch).length > 0) {
        await profileService.updateProfile(profilePatch)
        toast.success(
          tr(
            'documents.dataSavedWithAutofill',
            `Document data saved and ${Object.keys(profilePatch).length} profile fields were auto-filled!`
          )
        )
      } else {
        toast.info(
          tr(
            'documents.dataSavedNoAutofill',
            'Document data saved. No matching profile fields found to auto-fill.'
          )
        )
      }

      setUploadedCount((prev) => prev + 1)
      setStep(5) // Go to success
    } catch (error) {
      console.error('Save error:', error)
      toast.error(getApiErrorMessage(error, tr('documents.saveFailed', 'Failed to save data')))
    }
  }

  /**
   * Step 5: Success screen
   */
  const handleContinue = () => {
    // Reset for next document or go to profile
    setStep(1)
    setSelectedDocType(null)
    setDocId(null)
    setExtractedData(null)
    setUseCamera(false)
  }

  const handleDeleteUploadedDocument = async () => {
    if (!docId) {
      toast.info(tr('documents.noDocumentToDelete', 'No uploaded document to delete'))
      return
    }

    const shouldDelete = window.confirm(
      tr('documents.confirmDelete', 'Delete this uploaded document?')
    )
    if (!shouldDelete) {
      return
    }

    try {
      await documentService.deleteDocument(docId)
      toast.success(tr('documents.deleteSuccess', 'Document deleted successfully'))
      setDocId(null)
      setExtractedData(null)
      setStep(2)
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('documents.deleteFailed', 'Failed to delete document')))
    }
  }

  /**
   * Go back to previous step
   */
  const handleBack = () => {
    if (step === 2) {
      setSelectedDocType(null)
      setUseCamera(false)
      setStep(1)
    } else if (step === 4) {
      setStep(2)
    } else {
      setStep(Math.max(1, step - 1))
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('uploadDocuments.title', 'Upload Your Documents')}
        description={tr(
          'uploadDocuments.subtitle',
          'Upload government ID and income documents to find eligible schemes'
        )}
        actions={
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            {tr('common.back', 'Back')}
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">
            {tr('uploadDocuments.title', 'Upload Your Documents')}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Step {step} of 5</p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-5 flex justify-between items-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs transition ${
                  step >= s
                    ? 'bg-orange-600 text-white'
                    : 'bg-stone-300 text-stone-600'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 5 && (
                <div
                  className={`h-1 w-8 transition md:w-12 ${
                    step > s ? 'bg-orange-600' : 'bg-stone-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="mb-5 grid grid-cols-5 gap-2 text-[11px] font-semibold text-center">
          <div className={step === 1 ? 'text-orange-700' : 'text-stone-500'}>
            {tr('uploadDocuments.selectType', 'Select')}
          </div>
          <div className={step === 2 ? 'text-orange-700' : 'text-stone-500'}>
            {tr('uploadDocuments.upload', 'Upload')}
          </div>
          <div className={step === 3 ? 'text-orange-700' : 'text-stone-500'}>
            {tr('uploadDocuments.processing', 'Processing')}
          </div>
          <div className={step === 4 ? 'text-orange-700' : 'text-stone-500'}>
            {tr('uploadDocuments.review', 'Review')}
          </div>
          <div className={step === 5 ? 'text-orange-700' : 'text-stone-500'}>
            {tr('uploadDocuments.complete', 'Complete')}
          </div>
        </div>

        {/* Content */}
        <Card className="border border-stone-200">
          {/* Step 1: Select Document Type */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {tr('uploadDocuments.selectDocType', 'What would you like to upload?')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DOCUMENT_TYPES.map((doc) => {
                  const Icon = doc.icon
                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectDocType(doc.id)}
                      className="rounded-xl border-2 border-stone-200 p-5 text-left transition hover:border-orange-300 hover:bg-orange-50"
                    >
                      <Icon size={28} className="mb-3 text-orange-700" />
                      <h3 className="font-bold text-stone-900">{doc.name}</h3>
                      <p className="mt-1 text-sm text-stone-600">{doc.description}</p>
                    </button>
                  )
                })}
              </div>

              <p className="text-center text-sm text-stone-600">
                {tr(
                  'uploadDocuments.optionalNote',
                  'You can upload these documents later if needed'
                )}
              </p>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {tr('uploadDocuments.uploadDoc', 'Upload Your Document')}
                </h2>
                <p className="text-gray-600">
                  {DOCUMENT_TYPES.find((d) => d.id === selectedDocType)?.name}
                </p>
              </div>

              {/* Tab: Upload vs Camera */}
              <div className="flex gap-2 border-b">
                <button
                  onClick={() => setUseCamera(false)}
                  className={`px-4 py-2 font-semibold border-b-2 transition ${
                    !useCamera
                      ? 'border-orange-600 text-orange-700'
                      : 'border-transparent text-stone-600'
                  }`}
                >
                  <ImageIcon size={18} className="inline mr-2" />
                  {tr('uploadDocuments.uploadFile', 'Upload File')}
                </button>
                <button
                  onClick={() => setUseCamera(true)}
                  className={`px-4 py-2 font-semibold border-b-2 transition ${
                    useCamera
                      ? 'border-orange-600 text-orange-700'
                      : 'border-transparent text-stone-600'
                  }`}
                >
                  <Camera size={18} className="inline mr-2" />
                  {tr('uploadDocuments.takePhoto', 'Take Photo')}
                </button>
              </div>

              {/* Upload or Camera Component */}
              {!useCamera ? (
                <DocumentUploader
                  docType={selectedDocType}
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
              ) : (
                <CameraCapture
                  onCapture={async (blob) => {
                    try {
                      const response = await documentService.uploadDocument(blob, selectedDocType)
                      handleUploadSuccess(response.data.doc_id)
                    } catch (error) {
                      handleUploadError(error)
                    }
                  }}
                  onCancel={() => setUseCamera(false)}
                />
              )}
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 3 && (
            <div className="text-center py-12">
              <div className="inline-block">
                <Loader size={48} className="mb-4 animate-spin text-orange-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {tr('uploadDocuments.extractingData', 'Extracting Data')}
              </h2>
              <p className="text-gray-600">
                {tr(
                  'uploadDocuments.processingMessage',
                  'Please wait while we analyze your document...'
                )}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                {tr('uploadDocuments.timeEstimate', 'This usually takes 30-60 seconds')}
              </p>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <ExtractionReview
              docId={docId}
              extractedData={extractedData}
              onConfirm={handleConfirmExtraction}
              onCancel={handleBack}
              isLoading={false}
            />
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div className="text-center py-12">
              <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {tr('uploadDocuments.success', 'Document Uploaded Successfully!')}
              </h2>
              <p className="text-gray-600 mb-4">
                {tr(
                  'uploadDocuments.successMessage',
                  'Your document data has been saved and will help us find better schemes for you.'
                )}
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-800">
                  <strong>{tr('uploadDocuments.documentsUploaded', 'Documents uploaded:')}</strong>{' '}
                  {uploadedCount} / {DOCUMENT_TYPES.length}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleContinue}
                  className="w-full"
                  size="lg"
                >
                  {uploadedCount < DOCUMENT_TYPES.length
                    ? tr('uploadDocuments.uploadMore', 'Upload Another Document')
                    : tr('uploadDocuments.viewSchemes', 'View Available Schemes')}
                </Button>
                <Button
                  onClick={() => navigate('/schemes')}
                  className="w-full"
                  variant="ghost"
                  size="lg"
                >
                  {tr('uploadDocuments.skipForNow', 'Skip for Now')}
                </Button>
                {docId && (
                  <Button
                    onClick={handleDeleteUploadedDocument}
                    className="w-full"
                    variant="danger"
                    size="lg"
                  >
                    {tr('documents.deleteUploaded', 'Delete Uploaded Document')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Back Button (except on step 1) */}
        {step > 1 && step !== 3 && (
          <div className="mt-4 flex justify-start">
            <Button
              onClick={handleBack}
              variant="ghost"
            >
              {tr('common.back', 'Back')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

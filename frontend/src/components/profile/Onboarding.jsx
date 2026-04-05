// frontend/src/components/profile/Onboarding.jsx
/**
 * Onboarding - 6-step wizard for profile completion
 * Features:
 * - Step 1: Welcome + skip option
 * - Step 2: Upload documents (DocumentUploader)
 * - Step 3: Processing... (check extraction_status)
 * - Step 4: Review extracted data (ExtractionReview)
 * - Step 5: Complete profile (ProfileForm)
 * - Step 6: Optional questions (OptionalQuestions)
 * - Summary + finish button
 * 
 * Usage:
 * <Onboarding onComplete={() => navigate('/dashboard')} />
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader,
  Upload,
  FileText,
  User,
  HelpCircle,
  Flag,
} from 'lucide-react'

import DocumentUploader from './DocumentUploader'
import ExtractionReview from './ExtractionReview'
import ProfileForm from './ProfileForm'
import OptionalQuestions from './OptionalQuestions'
import documentService from '../../services/documentService'
import profileService from '../../services/profileService'

const STEPS = [
  {
    id: 1,
    title: 'Welcome',
    description: 'Let\'s get your profile set up',
    icon: Flag,
    optional: false,
  },
  {
    id: 2,
    title: 'Upload Documents',
    description: 'Upload identity documents for auto-fill',
    icon: Upload,
    optional: true,
  },
  {
    id: 3,
    title: 'Processing',
    description: 'Extracting information from documents',
    icon: Loader,
    optional: false,
  },
  {
    id: 4,
    title: 'Review Extraction',
    description: 'Verify and correct extracted data',
    icon: FileText,
    optional: false,
  },
  {
    id: 5,
    title: 'Complete Profile',
    description: 'Fill in your personal information',
    icon: User,
    optional: false,
  },
  {
    id: 6,
    title: 'Summary',
    description: 'Review and finish setup',
    icon: CheckCircle,
    optional: false,
  },
]

const EXTRACTION_TO_PROFILE_KEY = {
  date_of_birth: 'dob',
  postal_code: 'pincode',
  zip_code: 'pincode',
  category: 'social_category',
  caste_category: 'social_category',
  sex: 'gender',
  income: 'annual_income',
}

const getExtractionValue = (entry) => {
  if (entry && typeof entry === 'object' && 'value' in entry) {
    return entry.value
  }
  return entry
}

const buildPrefilledProfile = (currentProfile, correctedData) => {
  const prefilled = { ...currentProfile }

  Object.entries(correctedData || {}).forEach(([rawKey, rawValue]) => {
    const mappedKey = EXTRACTION_TO_PROFILE_KEY[rawKey] || rawKey
    const value = getExtractionValue(rawValue)
    if (value === null || value === undefined || value === '') return
    prefilled[mappedKey] = value
  })

  if (prefilled.gender) {
    prefilled.gender = String(prefilled.gender).toLowerCase()
  }
  if (prefilled.social_category) {
    prefilled.social_category = String(prefilled.social_category).toLowerCase()
  }
  if (prefilled.pincode) {
    prefilled.pincode = String(prefilled.pincode).replace(/\D/g, '').slice(0, 6)
  }

  return prefilled
}

const toBinaryFlag = (value) => Number(value || 0) === 1

const resolveOptionalUserType = (profileData) => {
  if (toBinaryFlag(profileData.has_disability)) return 'disability'
  if (toBinaryFlag(profileData.is_farmer)) return 'farmer'
  if (toBinaryFlag(profileData.is_student)) return 'student'
  return ''
}

export default function Onboarding({ onComplete }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // State management
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [skippedDocuments, setSkippedDocuments] = useState(false)

  // Document & extraction state
  const [uploadedDocumentId, setUploadedDocumentId] = useState(null)
  const [extractedData, setExtractedData] = useState({})
  const [extractionAttempts, setExtractionAttempts] = useState(0)

  // Profile state
  const [profileData, setProfileData] = useState({})
  const [optionalAnswers, setOptionalAnswers] = useState({})

  // Progress tracking
  const [completedSteps, setCompletedSteps] = useState([])

  // Get current step config
  const currentStepConfig = STEPS.find((s) => s.id === currentStep)
  const CurrentStepIcon = currentStepConfig?.icon

  /**
   * Step 1: Welcome
   */
  const handleWelcomeNext = () => {
    setCompletedSteps([1])
    setCurrentStep(2)
  }

  const handleSkipDocuments = () => {
    setSkippedDocuments(true)
    setCompletedSteps([1, 2])
    setCurrentStep(5) // Skip to profile
    toast.info(t('onboarding.skipped') || 'Skipped document upload. You can upload later.')
  }

  /**
   * Step 2: Upload Documents
   */
  const handleDocumentUploadSuccess = (docId) => {
    setUploadedDocumentId(docId)
    setCompletedSteps([1, 2])
    setCurrentStep(3) // Go to processing
    pollExtractionStatus(docId)
  }

  const handleDocumentUploadError = (error) => {
    toast.error(error || t('documents.uploadFailed') || 'Upload failed')
  }

  /**
   * Step 3: Poll for extraction completion
   */
  const pollExtractionStatus = async (docId) => {
    setIsLoading(true)
    let attempts = 0
    const maxAttempts = 60 // 5 minutes

    const poll = async () => {
      attempts++
      setExtractionAttempts(attempts)

      try {
        const response = await documentService.getDocument(docId)
        const doc = response.data

        if (doc.extraction_status === 'completed') {
          // Extraction done
          const extracted = JSON.parse(doc.extracted_data || '{}')
          setExtractedData(extracted)
          setCompletedSteps([1, 2, 3])
          setCurrentStep(4) // Go to review
          setIsLoading(false)
          toast.success(t('documents.extractionComplete') || 'Extraction complete!')
        } else if (doc.extraction_status === 'failed') {
          setIsLoading(false)
          toast.error(t('documents.extractionFailed') || 'Extraction failed')
          setCurrentStep(2) // Back to upload
        } else if (attempts >= maxAttempts) {
          setIsLoading(false)
          toast.error(t('documents.extractionTimeout') || 'Extraction timeout')
          setCurrentStep(2) // Back to upload
        } else {
          // Still processing, wait and poll again
          setTimeout(poll, 5000) // Poll every 5 seconds
        }
      } catch (error) {
        console.error('Polling error:', error)
        if (attempts >= maxAttempts) {
          setIsLoading(false)
          toast.error(t('documents.extractionTimeout') || 'Extraction timeout')
          setCurrentStep(2)
        } else {
          setTimeout(poll, 5000)
        }
      }
    }

    poll()
  }

  /**
   * Step 4: Review Extraction
   */
  const handleExtractionReviewConfirm = async (correctedData) => {
    setIsLoading(true)
    setExtractedData(correctedData)

    const prefilled = buildPrefilledProfile(profileData, correctedData)

    try {
      if (uploadedDocumentId) {
        await documentService.updateExtraction(uploadedDocumentId, correctedData)
      }

      try {
        const refreshed = await profileService.getProfile()
        setProfileData({
          ...prefilled,
          ...(refreshed.data || {}),
        })
      } catch (refreshError) {
        console.warn('Could not refresh profile after extraction update:', refreshError)
        setProfileData(prefilled)
      }

      toast.success(
        t('onboarding.autofillReady') ||
          'Major fields were auto-filled from your document. Please review once and continue.'
      )
    } catch (error) {
      console.error('Failed to persist extraction review:', error)
      setProfileData(prefilled)
      toast.warn(
        t('onboarding.autofillLocalOnly') ||
          'Auto-fill is ready for this session. It will be fully saved when you finish onboarding.'
      )
    } finally {
      setCompletedSteps([1, 2, 3, 4])
      setCurrentStep(5)
      setIsLoading(false)
    }
  }

  const handleExtractionReviewCancel = () => {
    setCurrentStep(2) // Back to upload
  }

  /**
   * Step 5: Complete Profile
   */
  const handleProfileSave = (formData) => {
    setProfileData(formData)
    setCompletedSteps([1, 2, 3, 4, 5])

    // Show optional questions only when a matching profile category is selected.
    if (resolveOptionalUserType(formData)) {
      setCurrentStep(6)
    } else {
      // No user type, skip optional questions and go to summary
      setOptionalAnswers({})
      goToSummary()
    }
  }

  /**
   * Step 6: Optional Questions
   */
  const handleOptionalQuestionsSave = (answers) => {
    setOptionalAnswers(answers)
    goToSummary()
  }

  const goToSummary = () => {
    setCompletedSteps([1, 2, 3, 4, 5, 6])
    setCurrentStep(7) // Summary screen
  }

  /**
   * Final: Save to backend and complete
   */
  const handleFinishOnboarding = async () => {
    try {
      setIsLoading(true)

      // Prepare complete profile data
      const completeProfile = {
        ...profileData,
        ...optionalAnswers,
      }

      // Save to backend
      await profileService.updateProfile(completeProfile)

      toast.success(t('onboarding.complete') || 'Onboarding complete!')
      setCompletedSteps([1, 2, 3, 4, 5, 6, 7])

      // Callback or navigate
      if (onComplete) {
        onComplete()
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error(t('profile.saveError') || 'Failed to save profile')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Navigation handlers
   */
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkipToProfile = () => {
    setSkippedDocuments(true)
    setCompletedSteps([1, 2])
    setCurrentStep(5)
  }

  /**
   * Render methods
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderWelcomeStep()
      case 2:
        return renderDocumentUploadStep()
      case 3:
        return renderProcessingStep()
      case 4:
        return renderExtractionReviewStep()
      case 5:
        return renderProfileStep()
      case 6:
        return renderOptionalQuestionsStep()
      case 7:
        return renderSummaryStep()
      default:
        return null
    }
  }

  /**
   * Step 1: Welcome
   */
  const renderWelcomeStep = () => (
    <div className="text-center space-y-6 py-12">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center text-white text-4xl">
        🎯
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          {t('onboarding.welcome') || 'Welcome to YojanaMitra'}
        </h2>
        <p className="text-gray-600 text-lg">
          {t('onboarding.welcomeDesc') ||
            "Let's set up your profile to find government schemes you're eligible for"}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
        <h3 className="font-semibold text-gray-900 mb-3">What you'll do:</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-center gap-2">
            <span className="text-lg">📄</span> Upload documents (optional)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg">👤</span> Complete your profile
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg">❓</span> Answer optional questions
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg">✨</span> Get scheme recommendations
          </li>
        </ul>
      </div>

      <p className="text-sm text-gray-500">
        {t('onboarding.takesAbout') || 'Takes about 5-10 minutes'}
      </p>
    </div>
  )

  /**
   * Step 2: Document Upload
   */
  const renderDocumentUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {t('onboarding.uploadDocuments') || 'Upload Identity Document'}
        </h3>
        <p className="text-gray-600">
          {t('onboarding.uploadDesc') ||
            'Upload a document to auto-fill major fields like name, DOB, gender, state, district, and pincode'}
        </p>
      </div>

      <DocumentUploader
        docType="aadhaar"
        onUploadSuccess={handleDocumentUploadSuccess}
        onUploadError={handleDocumentUploadError}
      />

      <div className="flex gap-3 pt-6">
        <button
          onClick={handleSkipToProfile}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
        >
          {t('onboarding.skipDocuments') || 'Skip & Continue'}
        </button>
      </div>
    </div>
  )

  /**
   * Step 3: Processing
   */
  const renderProcessingStep = () => (
    <div className="text-center py-12 space-y-6">
      <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
        <Loader className="animate-spin h-8 w-8 text-blue-600" />
      </div>

      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {t('onboarding.processing') || 'Processing Your Document'}
        </h3>
        <p className="text-gray-600">Please wait while we extract information...</p>
      </div>

      <div className="bg-gray-100 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          {t('onboarding.processingNote') ||
            'This usually takes 30-60 seconds. We will not close this page.'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
        <span className="text-xs bg-gray-200 px-3 py-1 rounded-full">
          Attempt {extractionAttempts}/60
        </span>
      </div>
    </div>
  )

  /**
   * Step 4: Extraction Review
   */
  const renderExtractionReviewStep = () => (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        {t('onboarding.reviewExtraction') || 'Review Extracted Information'}
      </h3>
      <ExtractionReview
        docId={uploadedDocumentId}
        extractedData={extractedData}
        onConfirm={handleExtractionReviewConfirm}
        onCancel={handleExtractionReviewCancel}
      />
    </div>
  )

  /**
   * Step 5: Profile Form
   */
  const renderProfileStep = () => (
    <div>
        {Object.keys(extractedData || {}).length > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-900">
            Most major fields are auto-filled from your document. Please review and save.
          </div>
        )}
      <ProfileForm
        profile={profileData}
        extractedFields={extractedData}
        onSave={handleProfileSave}
        isLoading={isLoading}
      />
    </div>
  )

  /**
   * Step 6: Optional Questions
   */
  const renderOptionalQuestionsStep = () => {
    const userType = resolveOptionalUserType(profileData)

    if (!userType) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-6">
            {t('onboarding.noUserType') ||
              'Select farmer, student, or disability category in profile to see relevant questions.'}
          </p>
          <button
            onClick={() => setCurrentStep(5)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {t('common.back')} Back
          </button>
        </div>
      )
    }

    return (
      <OptionalQuestions
        userType={userType}
        questions={optionalAnswers}
        onSave={handleOptionalQuestionsSave}
        isLoading={isLoading}
      />
    )
  }

  /**
   * Step 7: Summary
   */
  const renderSummaryStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
          <CheckCircle className="text-green-600" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('onboarding.almostDone') || 'Almost Done!'}
        </h2>
        <p className="text-gray-600 mt-2">
          {t('onboarding.summaryDesc') || 'Review your information before finishing'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        {/* Profile Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            {t('profile.personalInfo') || 'Personal Information'}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {profileData.full_name && (
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium text-gray-900">{profileData.full_name}</p>
              </div>
            )}
            {profileData.gender && (
              <div>
                <p className="text-gray-600">Gender</p>
                <p className="font-medium text-gray-900">{profileData.gender}</p>
              </div>
            )}
            {profileData.state && (
              <div>
                <p className="text-gray-600">State</p>
                <p className="font-medium text-gray-900">{profileData.state}</p>
              </div>
            )}
            {profileData.district && (
              <div>
                <p className="text-gray-600">District</p>
                <p className="font-medium text-gray-900">{profileData.district}</p>
              </div>
            )}
            {profileData.annual_income && (
              <div>
                <p className="text-gray-600">Annual Income</p>
                <p className="font-medium text-gray-900">{profileData.annual_income}</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents Summary */}
        {!skippedDocuments && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText size={18} className="text-green-600" />
              {t('onboarding.documentEncrypted') || 'Documents'}
            </h3>
            <p className="text-sm text-gray-700">
              ✅ {t('onboarding.documentSecure') || 'Document uploaded and encrypted'}
            </p>
          </div>
        )}

        {/* Optional Answers Summary */}
        {Object.keys(optionalAnswers).length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <HelpCircle size={18} className="text-purple-600" />
              {t('onboarding.additionalInfo') || 'Additional Information'}
            </h3>
            <p className="text-sm text-gray-700">
              ✅ {Object.keys(optionalAnswers).length} answers provided
            </p>
          </div>
        )}
      </div>

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
        <h4 className="font-semibold text-gray-900 mb-2">Ready?</h4>
        <p className="text-gray-600 text-sm mb-4">
          {t('onboarding.finishDesc') ||
            "Click finish to complete your setup and start discovering schemes!"}
        </p>
      </div>
    </div>
  )

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-6">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex-1 flex flex-col items-center ${
                  step.id < STEPS.length ? 'relative' : ''
                }`}
              >
                {/* Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm mb-2 transition-all ${
                    completedSteps.includes(step.id)
                      ? 'bg-green-600 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {completedSteps.includes(step.id) ? '✓' : step.id}
                </div>

                {/* Label (hidden on small screens, show on medium) */}
                <span className="hidden md:inline text-xs text-center text-gray-600 leading-tight max-w-[80px]">
                  {step.title}
                </span>

                {/* Connector Line */}
                {step.id < STEPS.length && (
                  <div
                    className={`hidden md:block absolute top-5 left-1/2 w-full h-0.5 transition-all ${
                      completedSteps.includes(step.id + 1)
                        ? 'bg-green-600'
                        : 'bg-gray-300'
                    }`}
                    style={{ marginLeft: '-50%', width: 'calc(100% - 2.5rem)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Progress Text */}
          <div className="text-center text-sm text-gray-600">
            Step {currentStep} of {STEPS.length}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Step Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            {CurrentStepIcon && (
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CurrentStepIcon className="text-blue-600" size={24} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentStepConfig?.title}
              </h1>
              <p className="text-gray-600">{currentStepConfig?.description}</p>
            </div>
          </div>

          {/* Step Content */}
          <div className="mt-8">{renderStepContent()}</div>

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <ChevronLeft size={18} />
              {t('common.back')}
            </button>

            {currentStep === 7 ? (
              <button
                onClick={handleFinishOnboarding}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    {t('onboarding.finishing')}
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    {t('onboarding.finish')}
                  </>
                )}
              </button>
            ) : (
              currentStep !== 2 &&
              currentStep !== 3 && (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {t('common.next')}
                  <ChevronRight size={18} />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

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

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { FileText, Camera, Image as ImageIcon, CheckCircle, Loader } from 'lucide-react'
import LanguageSelector from '../components/common/LanguageSelector'
import DocumentUploader from '../components/documents/DocumentUploader'
import CameraCapture from '../components/documents/CameraCapture'
import ExtractionReview from '../components/documents/ExtractionReview'
import documentService from '../services/documentService'

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

export default function UploadDocuments() {
  const { t } = useTranslation()
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
    toast.error(error || t('documents.uploadFailed') || 'Upload failed')
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
          setExtractedData(JSON.parse(doc.extracted_data || '{}'))
          setIsProcessing(false)
          setStep(4) // Go to review
          toast.success(t('documents.extractionComplete') || 'Extraction complete!')
        } else if (doc.extraction_status === 'failed') {
          setIsProcessing(false)
          toast.error(t('documents.extractionFailed') || 'Extraction failed. Please try again.')
          setStep(2) // Back to upload
        } else if (attempts < maxAttempts) {
          // Still processing, poll again in 5 seconds
          setTimeout(poll, 5000)
        } else {
          // Timeout
          setIsProcessing(false)
          toast.error(t('documents.extractionTimeout') || 'Extraction took too long. Please try again.')
          setStep(2)
        }
      } catch (error) {
        console.error('Poll error:', error)
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          setIsProcessing(false)
          toast.error(error.message || 'Error checking extraction status')
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
      // TODO: Save confirmed data to profile
      // await profileService.updateProfileFromDocument(selectedDocType, confirmedData)

      setUploadedCount((prev) => prev + 1)
      toast.success(t('documents.dataSaved') || 'Document data saved successfully!')
      setStep(5) // Go to success
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error.message || t('documents.saveFailed') || 'Failed to save data')
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
    <div className="min-h-screen bg-gray-50">
      <div className="tricolor-bar"></div>
    
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#1A3A6B]">YojanaMitra</h2>
          <LanguageSelector />
        </div>
      </nav>

      <div className="py-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('uploadDocuments.title') || 'Upload Your Documents'}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('uploadDocuments.subtitle') ||
              'Upload government ID and income documents to find eligible schemes'}
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-8 flex justify-between items-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                  step >= s
                    ? 'bg-primary text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 5 && (
                <div
                  className={`w-12 h-1 transition ${
                    step > s ? 'bg-primary' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="mb-8 grid grid-cols-5 gap-2 text-xs font-semibold text-center">
          <div className={step === 1 ? 'text-primary' : 'text-gray-600'}>
            {t('uploadDocuments.selectType') || 'Select'}
          </div>
          <div className={step === 2 ? 'text-primary' : 'text-gray-600'}>
            {t('uploadDocuments.upload') || 'Upload'}
          </div>
          <div className={step === 3 ? 'text-primary' : 'text-gray-600'}>
            {t('uploadDocuments.processing') || 'Processing'}
          </div>
          <div className={step === 4 ? 'text-primary' : 'text-gray-600'}>
            {t('uploadDocuments.review') || 'Review'}
          </div>
          <div className={step === 5 ? 'text-primary' : 'text-gray-600'}>
            {t('uploadDocuments.complete') || 'Complete'}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Step 1: Select Document Type */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {t('uploadDocuments.selectDocType') || 'What would you like to upload?'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DOCUMENT_TYPES.map((doc) => {
                  const Icon = doc.icon
                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectDocType(doc.id)}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-blue-50 transition text-left"
                    >
                      <Icon size={32} className="text-primary mb-3" />
                      <h3 className="font-bold text-gray-900">{doc.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                    </button>
                  )
                })}
              </div>

              <p className="text-sm text-gray-600 text-center">
                {t('uploadDocuments.optionalNote') ||
                  'You can upload these documents later if needed'}
              </p>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {t('uploadDocuments.uploadDoc') || 'Upload Your Document'}
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
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600'
                  }`}
                >
                  <ImageIcon size={18} className="inline mr-2" />
                  {t('uploadDocuments.uploadFile') || 'Upload File'}
                </button>
                <button
                  onClick={() => setUseCamera(true)}
                  className={`px-4 py-2 font-semibold border-b-2 transition ${
                    useCamera
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600'
                  }`}
                >
                  <Camera size={18} className="inline mr-2" />
                  {t('uploadDocuments.takePhoto') || 'Take Photo'}
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
                    // Create FormData and upload
                    const formData = new FormData()
                    formData.append('file', blob, 'camera_capture.jpg')
                    formData.append('doc_type', selectedDocType)
                    try {
                      const response = await documentService.uploadDocument(formData)
                      handleUploadSuccess(response.data.doc_id)
                    } catch (error) {
                      handleUploadError(error.message)
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
                <Loader size={48} className="text-primary animate-spin mb-4" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('uploadDocuments.extractingData') || 'Extracting Data'}
              </h2>
              <p className="text-gray-600">
                {t('uploadDocuments.processingMessage') ||
                  'Please wait while we analyze your document...'}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                {t('uploadDocuments.timeEstimate') || 'This usually takes 30-60 seconds'}
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
                {t('uploadDocuments.success') || 'Document Uploaded Successfully!'}
              </h2>
              <p className="text-gray-600 mb-4">
                {t('uploadDocuments.successMessage') ||
                  'Your document data has been saved and will help us find better schemes for you.'}
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-800">
                  <strong>{t('uploadDocuments.documentsUploaded') || 'Documents uploaded:'}</strong>{' '}
                  {uploadedCount} / {DOCUMENT_TYPES.length}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleContinue}
                  className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition font-semibold"
                >
                  {uploadedCount < DOCUMENT_TYPES.length
                    ? t('uploadDocuments.uploadMore') || 'Upload Another Document'
                    : t('uploadDocuments.viewSchemes') || 'View Available Schemes'}
                </button>
                <button
                  onClick={() => {
                    /* Navigate to schemes page */
                  }}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                >
                  {t('uploadDocuments.skipForNow') || 'Skip for Now'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back Button (except on step 1) */}
        {step > 1 && step !== 3 && (
          <div className="mt-6 flex justify-start">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-primary font-semibold hover:bg-blue-50 rounded transition"
            >
              ← {t('common.back') || 'Back'}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

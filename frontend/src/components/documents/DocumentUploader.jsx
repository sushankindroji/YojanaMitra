// frontend/src/components/documents/DocumentUploader.jsx
/**
 * DocumentUploader - Drag-and-drop or file select for document upload
 * Features:
 * - Drag-and-drop support
 * - File input for device without drag support
 * - Progress bar during upload
 * - Error handling with retry
 * - Support for: JPEG, PNG, PDF
 * 
 * Usage:
 * <DocumentUploader 
 *   docType="aadhaar" 
 *   onUploadSuccess={(docId) => navigate(`/extraction/${docId}`)}
 *   onUploadError={(error) => toast.error(error)}
 * />
 */

import { useState, useRef } from 'react'
import { Upload, Camera, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import documentService from '../../services/documentService'

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

export default function DocumentUploader({ 
  docType, 
  onUploadSuccess, 
  onUploadError,
  acceptedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.pdf']
}) {
  const { t } = useTranslation()
  const tr = (key, fallback) => {
    const value = t(key)
    return value && value !== key ? value : fallback
  }
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      toast.error(tr('documents.validationError.invalidType', 'Invalid file type. Use JPG, PNG, WEBP, or PDF.'))
      onUploadError?.('Invalid file type. Use JPG, PNG, or PDF.')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(tr('documents.validationError.fileTooLarge', 'File too large. Maximum 10MB.'))
      onUploadError?.('File too large. Maximum 10MB.')
      return
    }

    // Show preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(file)
    }

    // Upload
    await uploadFile(file)
  }

  const uploadFile = async (file) => {
    if (!docType) {
      const msg = tr('documents.validationError.docTypeRequired', 'Please select document type first.')
      toast.error(msg)
      onUploadError?.(msg)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    let progressInterval = null

    try {
      // Simulate progress (since axios doesn't easily expose upload progress)
      progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 90) return prev + Math.random() * 30
          clearInterval(progressInterval)
          return prev
        })
      }, 200)

      const response = await documentService.uploadDocument(file, docType)

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Wait 1 second to show 100%
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.info(
        tr('documents.uploadStartedProcessing', 'Document uploaded. Processing extraction...')
      )
      onUploadSuccess?.(response.data.doc_id)

      // Reset
      setIsUploading(false)
      setUploadProgress(0)
      setPreview(null)
    } catch (error) {
      console.error('Upload error:', error)
      const message = getApiErrorMessage(error, tr('documents.uploadError', 'Upload failed'))
      toast.error(message)
      onUploadError?.(message)
      setIsUploading(false)
      setUploadProgress(0)
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files)
  }

  const handleCameraClick = () => {
    // TODO: Integrate with CameraCapture component
    // For now, just open file input camera mode
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*'
      fileInputRef.current.capture = 'environment'
      fileInputRef.current.click()
    }
  }

  const handleRemovePreview = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Preview Section */}
      {preview && (
        <div className="mb-6 relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full rounded-lg border-2 border-primary shadow-md max-h-96 object-cover"
          />
          <button
            onClick={handleRemovePreview}
            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition"
            aria-label="Remove preview"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Upload Area */}
      {!preview && !isUploading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors duration-200
            ${
              isDragging
                ? 'border-primary bg-blue-50'
                : 'border-gray-300 hover:border-primary hover:bg-blue-50'
            }
          `}
        >
          <Upload
            size={48}
            className={`mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-gray-400'}`}
          />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {tr('documents.uploadHeader', 'Drag and drop your document')}
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            {tr('documents.uploadSubtext', 'Or click to select from your device')}
          </p>
          <p className="text-xs text-gray-400">
            {tr('documents.supportedFormats', `Supported: ${acceptedFormats.join(', ')}`)}
          </p>
        </div>
      )}

      {/* Camera Button (Alternative) */}
      {!preview && !isUploading && (
        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={handleCameraClick}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-opacity-90 transition"
          >
            <Camera size={20} />
            {tr('documents.takePhoto', 'Take Photo')}
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {isUploading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {tr('common.uploading', 'Uploading...')}
            </p>
            <span className="text-sm text-gray-500">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary to-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            {tr(
              'documents.processingMessage',
              'Document is being uploaded and processed. This may take a minute...'
            )}
          </p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="File input"
      />
    </div>
  )
}

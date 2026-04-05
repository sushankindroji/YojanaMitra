import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Camera, X, CheckCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import documentService from '../../services/documentService'

/**
 * DocumentUploader - File upload component with drag & drop support
 * Props:
 * - docType: string (e.g., 'aadhaar', 'pan', 'passport')
 * - onUploadSuccess: function(docId)
 * - onUploadError: function(error)
 */
export default function DocumentUploader({ docType = 'aadhaar', onUploadSuccess, onUploadError }) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)

  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  const validateFile = (file) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(t('documents.invalidFileType') || 'Invalid file type. Please upload JPG, PNG, or PDF.')
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('documents.fileTooLarge') || 'File size exceeds 5MB limit.')
      return false
    }
    return true
  }

  const handleFileSelect = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file)
    }
  }

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

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleInputChange = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.warning(t('documents.selectFile') || 'Please select a file first.')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 30
        })
      }, 200)

      const response = await documentService.uploadDocument(selectedFile, docType)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      const docId = response.data.doc_id || response.data.id
      setUploadedFile(response.data)

      setTimeout(() => {
        setIsUploading(false)
        toast.success(t('documents.uploadSuccess') || 'Document uploaded successfully!')
        // Call success callback with doc ID
        if (onUploadSuccess) {
          onUploadSuccess(docId)
        }
      }, 500)
    } catch (error) {
      setIsUploading(false)
      setUploadProgress(0)
      const errorMsg = error.response?.data?.detail || t('documents.uploadFailed') || 'Upload failed'
      toast.error(errorMsg)
      if (onUploadError) {
        onUploadError(errorMsg)
      }
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setUploadProgress(0)
  }

  // Show uploaded file state
  if (uploadedFile) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="text-green-600" size={32} />
          </div>
        </div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">
          {t('documents.uploadComplete') || 'Upload Complete!'}
        </h4>
        <p className="text-gray-600 text-sm mb-4">{selectedFile?.name}</p>
        <p className="text-gray-600 text-sm">
          {t('documents.extractionStarting') || 'Your document is being processed...'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* File Selection Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <div className="space-y-4">
          {selectedFile ? (
            <>
              <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
                <Upload className="text-gray-600" size={24} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {t('documents.dragAndDrop') || 'Drag and drop your document here'}
                </p>
                <p className="text-sm text-gray-600">
                  {t('documents.orClick') || 'or click to browse'}
                </p>
              </div>
            </>
          )}

          {/* File Input */}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleInputChange}
            disabled={isUploading}
            className="hidden"
            id="file-upload"
          />
          {!selectedFile && (
            <label
              htmlFor="file-upload"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer font-medium text-sm"
            >
              {t('documents.browse') || 'Browse Files'}
            </label>
          )}

          <p className="text-xs text-gray-500">
            {t('documents.supportedFormats') || 'JPG, PNG, PDF (Max 5MB)'}
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 text-center">
            {Math.round(uploadProgress)}% {t('documents.uploading') || 'Uploading...'}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {selectedFile && !isUploading && (
        <div className="flex gap-3">
          <button
            onClick={handleRemove}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            {t('common.remove') || 'Remove'}
          </button>
          <button
            onClick={handleUpload}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            {t('documents.upload') || 'Upload Document'}
          </button>
        </div>
      )}

      {/* Camera Option */}
      <details className="text-sm text-gray-600">
        <summary className="cursor-pointer font-medium hover:text-gray-900">
          <Camera className="inline mr-2" size={16} />
          {t('documents.captureWithCamera') || 'Capture with Camera'}
        </summary>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p>{t('documents.cameraNotAvailable') || 'Camera capture coming soon'}</p>
        </div>
      </details>
    </div>
  )
}

// frontend/src/components/documents/ExtractionReview.jsx
/**
 * ExtractionReview - Review and confirm extracted data from OCR
 * Features:
 * - Display extracted fields with confidence scores
 * - Allow manual field corrections
 * - Batch upload to profile
 * - Show extraction quality indicators
 * 
 * Usage:
 * <ExtractionReview
 *   docId={documentId}
 *   extractedData={{
 *     aadhaar_number: { value: "123456789012", confidence: 95 },
 *     name: { value: "John Doe", confidence: 87 },
 *   }}
 *   onConfirm={(correctedData) => updateProfile(correctedData)}
 *   onCancel={() => navigate('/upload')}
 * />
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { AlertCircle, CheckCircle, Edit2, Save, X } from 'lucide-react'

const normalizeExtractionData = (rawData = {}) => {
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
        confidence: Number(value.confidence ?? 0) || 0,
        edited: Boolean(value.edited),
      }
      return acc
    }

    acc[field] = {
      value: value ?? '',
      confidence: 0,
      edited: false,
    }
    return acc
  }, {})
}

export default function ExtractionReview({
  docId,
  extractedData = {},
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  const { t } = useTranslation()
  const tr = (key, fallback) => {
    const value = t(key)
    return value && value !== key ? value : fallback
  }
  const [editedData, setEditedData] = useState(normalizeExtractionData(extractedData))
  const [editingField, setEditingField] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setEditedData(normalizeExtractionData(extractedData))
    setEditingField(null)
    setErrors({})
  }, [extractedData])

  /**
   * Get confidence badge color and label
   */
  const getConfidenceBadge = (confidence) => {
    if (confidence >= 90) {
      return { color: 'bg-green-100 text-green-800', label: 'High', icon: '✓' }
    }
    if (confidence >= 70) {
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Medium', icon: '⚠' }
    }
    return { color: 'bg-red-100 text-red-800', label: 'Low', icon: '✗' }
  }

  /**
   * Handle field edit
   */
  const handleFieldChange = (field, value) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] || { confidence: 0 }),
        value,
        edited: true,
      },
    }))
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }

  /**
   * Validate all fields
   */
  const validateFields = () => {
    const hasAnyValue = Object.values(editedData).some((data) =>
      String(data?.value ?? '').trim().length > 0
    )

    if (!hasAnyValue) {
      setErrors({
        _global: tr('validation.atLeastOneField', 'Please provide at least one field'),
      })
      return false
    }

    setErrors({})
    return true
  }

  /**
   * Handle confirm
   */
  const handleConfirm = () => {
    if (!validateFields()) {
      toast.error(tr('validation.pleaseFillRequired', 'Please correct errors'))
      return
    }

    // Extract only the values (not confidence/edited metadata)
    const cleanData = {}
    Object.entries(editedData).forEach(([field, data]) => {
      cleanData[field] = data?.value ?? ''
    })

    onConfirm?.(cleanData)
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">{tr('common.processing', 'Processing...')}</p>
      </div>
    )
  }

  if (!extractedData || Object.keys(extractedData).length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 text-center border-2 border-dashed rounded-lg">
        <AlertCircle size={48} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600">
          {tr('documents.noExtractionData', 'No data extracted. Please try uploading again.')}
        </p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
        >
          {tr('common.cancel', 'Cancel')}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-h2 font-medium text-gray-800">
          {tr('documents.reviewExtracted', 'Review Extracted Data')}
        </h2>
        <p className="text-gray-600 text-body-sm mt-1">
          {tr(
            'documents.reviewMessage',
            'Review the information extracted from your document. You can edit any field if needed.'
          )}
        </p>
      </div>

      {/* Fields List */}
      <div className="space-y-4 mb-6">
        {Object.entries(editedData).map(([field, data]) => {
          const confidence = Number(data?.confidence || 0)
          const badge = getConfidenceBadge(confidence)
          const hasError = errors[field]
          const isEditing = editingField === field

          return (
            <div
              key={field}
              className={`p-4 border rounded-lg transition ${
                hasError
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Field Header */}
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-gray-700 capitalize">
                  {field.replace(/_/g, ' ')}
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-caption px-2 py-1 rounded ${badge.color}`}>
                    {badge.icon} {confidence}% - {badge.label}
                  </span>
                  {!isEditing && (
                    <button
                      onClick={() => setEditingField(field)}
                      className="p-1 hover:bg-gray-200 rounded transition"
                      title="Edit field"
                    >
                      <Edit2 size={16} className="text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Field Value Display/Edit */}
              {!isEditing ? (
                <p className="text-gray-800">{data?.value || '--'}</p>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={data?.value ?? ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingField(null)}
                      className="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded text-body-sm hover:bg-opacity-90 transition"
                    >
                      <Save size={14} />
                      {tr('common.save', 'Save')}
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-300 text-gray-800 rounded text-body-sm hover:bg-gray-400 transition"
                    >
                      <X size={14} />
                      {tr('common.cancel', 'Cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {hasError && (
                <p className="text-red-600 text-body-sm mt-2">
                  <AlertCircle size={14} className="inline mr-1" />
                  {hasError}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {errors._global && (
        <p className="text-red-600 text-body-sm mb-4">
          <AlertCircle size={14} className="inline mr-1" />
          {errors._global}
        </p>
      )}

      {/* Quality Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">
          {tr('documents.extractionQuality', 'Extraction Quality')}
        </h3>
        <div className="space-y-1 text-body-sm text-blue-800">
          <p>
            • Average confidence:{' '}
            <strong>
              {Math.round(
                Object.values(editedData).reduce((sum, d) => sum + (d.confidence || 0), 0) /
                  Math.max(Object.values(editedData).length, 1)
              )}
              %
            </strong>
          </p>
          <p>
            • Fields extracted: <strong>{Object.keys(editedData).length}</strong>
          </p>
          <p>
            • Fields edited:{' '}
            <strong>
              {Object.values(editedData).filter((d) => d.edited).length}
            </strong>
          </p>
        </div>
      </div>

      {/* Manual Field Addition (Optional) */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <details className="cursor-pointer">
          <summary className="font-medium text-gray-700 hover:text-gray-900">
            {tr('documents.addMoreFields', '+ Add Missing Fields')}
          </summary>
          <p className="text-body-sm text-gray-600 mt-2">
            {tr(
              'documents.addFieldsNote',
              'If the OCR missed any fields, you can manually add them here.'
            )}
          </p>
          {/* Note: Here you could add more form fields if needed */}
        </details>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
        >
          {tr('common.cancel', 'Cancel')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
        >
          <CheckCircle size={18} />
          {tr('common.confirm', 'Confirm & Continue')}
        </button>
      </div>
    </div>
  )
}

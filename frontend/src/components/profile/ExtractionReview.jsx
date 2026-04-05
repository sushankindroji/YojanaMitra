import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2, Check, X, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import documentService from '../../services/documentService'

/**
 * ExtractionReview - Review and edit extracted document data
 * Props:
 * - docId: string (document ID)
 * - extractedData: object (extracted fields)
 * - onConfirm: function(correctedData)
 * - onCancel: function()
 */
export default function ExtractionReview({ docId, extractedData = {}, onConfirm, onCancel }) {
  const { t } = useTranslation()
  const [fields, setFields] = useState([])
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Initialize fields from extractedData
  useEffect(() => {
    const parsedFields = Object.entries(extractedData).map(([key, value]) => ({
      key,
      original: value?.value || value || '',
      corrected: value?.value || value || '',
      confidence: value?.confidence || 0.5,
      label: formatFieldLabel(key),
    }))
    setFields(parsedFields)
  }, [extractedData])

  const formatFieldLabel = (key) => {
    // Convert snake_case to Title Case
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return t('extraction.highConfidence') || 'High'
    if (confidence >= 0.6) return t('extraction.mediumConfidence') || 'Medium'
    return t('extraction.lowConfidence') || 'Low'
  }

  const handleEditField = (field) => {
    setEditingField(field.key)
    setEditValue(field.corrected)
  }

  const handleSaveEdit = (fieldKey) => {
    setFields(
      fields.map((f) =>
        f.key === fieldKey ? { ...f, corrected: editValue } : f
      )
    )
    setEditingField(null)
    toast.success(t('extraction.fieldUpdated') || 'Field updated')
  }

  const handleCancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  const handleConfirm = () => {
    if (onConfirm) {
      const correctedData = fields.reduce((acc, field) => {
        acc[field.key] = {
          value: field.corrected,
          confidence: field.confidence,
          was_corrected: field.original !== field.corrected,
        }
        return acc
      }, {})
      onConfirm(correctedData)
    }
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">
          {t('extraction.noData') || 'No data extracted yet'}
        </p>
      </div>
    )
  }

  const lowConfidenceFields = fields.filter((f) => f.confidence < 0.8)

  return (
    <div className="space-y-6">
      {/* Confidence Alert */}
      {lowConfidenceFields.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
          <div className="text-sm">
            <p className="font-semibold text-yellow-900">
              {t('extraction.reviewRequested') || 'Please review low-confidence fields'}
            </p>
            <p className="text-yellow-700 text-xs mt-1">
              {lowConfidenceFields.length} field(s) need verification
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          {t('extraction.instructions') ||
            'Review the extracted information below. Correct any errors by clicking the edit icon.'}
        </p>
      </div>

      {/* Extracted Fields */}
      <div className="space-y-3">
        {fields.map((field) => (
          <div
            key={field.key}
            className={`border rounded-lg p-4 transition-colors ${
              editingField === field.key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {editingField === field.key ? (
              // Edit Mode
              <div className="space-y-3">
                <label className="block">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {field.label}
                  </p>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </label>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    <X size={16} className="inline mr-1" />
                    {t('common.cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={() => handleSaveEdit(field.key)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    <Check size={16} className="inline mr-1" />
                    {t('common.save') || 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {field.label}
                  </p>
                  <p className="text-gray-900 font-medium break-words">
                    {field.corrected || (
                      <span className="text-gray-400 italic">
                        {t('extraction.notProvided') || 'Not provided'}
                      </span>
                    )}
                  </p>
                  {field.original !== field.corrected && (
                    <p className="text-xs text-gray-600 mt-1">
                      {t('extraction.original') || 'Original'}: {field.original}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  {/* Confidence Badge */}
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getConfidenceColor(
                      field.confidence
                    )}`}
                  >
                    {getConfidenceLabel(field.confidence)}
                    <br />
                    {Math.round(field.confidence * 100)}%
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => handleEditField(field)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    title={t('common.edit') || 'Edit'}
                  >
                    <Edit2 size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{fields.length}</p>
          <p className="text-xs text-gray-600">
            {t('extraction.fieldsExtracted') || 'Fields Extracted'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {fields.filter((f) => f.confidence >= 0.8).length}
          </p>
          <p className="text-xs text-gray-600">
            {t('extraction.highConfidence') || 'High Confidence'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {fields.filter((f) => f.original !== f.corrected).length}
          </p>
          <p className="text-xs text-gray-600">
            {t('extraction.corrected') || 'Corrections Made'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {t('common.cancel') || 'Cancel'}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {isLoading ? (
            <>
              <span className="animate-spin inline-block mr-2">⏳</span>
              {t('common.processing') || 'Processing...'}
            </>
          ) : (
            <>
              <Check size={18} className="inline mr-2" />
              {t('extraction.confirmAndContinue') || 'Confirm & Continue'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// frontend/src/components/documents/DocumentPreview.jsx
/**
 * DocumentPreview - Display and interact with uploaded document image
 * Features:
 * - Display full document image
 * - Zoom in/out
 * - Rotate image
 * - Download option
 * - Loading state
 * 
 * Usage:
 * <DocumentPreview
 *   imageUrl="https://..."
 *   docType="aadhaar"
 *   onConfirm={() => navigate('/extraction')}
 *   onRetake={() => setPreview(null)}
 * />
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ZoomIn, ZoomOut, RotateCw, Download, Check, RotateCcw } from 'lucide-react'
import { toast } from 'react-toastify'

export default function DocumentPreview({
  imageUrl,
  docType,
  onConfirm,
  onRetake,
  isLoading = false,
}) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 20, 200))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 20, 50))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleDownload = async () => {
    try {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `${docType}-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(t('documents.downloadSuccess') || 'Document downloaded')
    } catch (error) {
      console.error('Download error:', error)
      toast.error(t('documents.downloadFailed') || 'Failed to download')
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-h2 font-medium text-gray-900 mb-2">
          {t('documents.preview') || 'Document Preview'}
        </h2>
        <p className="text-body text-gray-600">
          {t('documents.previewDesc') || 'Review your document before confirming'}
        </p>
      </div>

      {/* Image Viewer */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4 flex justify-center items-center min-h-96 border-2 border-gray-200">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={docType}
            style={{
              maxHeight: '500px',
              maxWidth: '100%',
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease',
              objectFit: 'contain',
            }}
            className="rounded-lg shadow"
          />
        ) : (
          <div className="text-center">
            <p className="text-body text-gray-500">{t('documents.noImage') || 'No image to display'}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-100 p-4 rounded-lg">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 200}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ZoomIn size={18} />
          {t('documents.zoomIn') || 'Zoom In'}
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 50}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ZoomOut size={18} />
          {t('documents.zoomOut') || 'Zoom Out'}
        </button>
        <button
          onClick={handleRotate}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RotateCw size={18} />
          {t('documents.rotate') || 'Rotate'}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download size={18} />
          {t('documents.download') || 'Download'}
        </button>
      </div>

      {/* Zoom Level Indicator */}
      <div className="mb-6 flex items-center justify-center gap-2 text-gray-600">
        <span className="text-label font-medium">{t('documents.zoom') || 'Zoom'}:</span>
        <span className="text-body-sm font-medium text-blue-600">{zoom}%</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        <button
          onClick={onRetake}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <RotateCcw size={20} />
          {t('documents.retake') || 'Retake'}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading || !imageUrl}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Check size={20} />
          {isLoading ? t('documents.confirming') : t('documents.confirm')}
        </button>
      </div>

      {/* Info Message */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-body-sm text-blue-800">
          {t('documents.previewInfo') || 'Ensure the document is clear, well-lit, and fully visible. Low quality images may result in poor data extraction.'}
        </p>
      </div>
    </div>
  )
}

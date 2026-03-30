// frontend/src/components/documents/CameraCapture.jsx
/**
 * CameraCapture - Real-time camera capture for document photography
 * Features:
 * - Real-time camera view
 * - Capture photo
 * - Flip camera (front/back)
 * - Retake ability
 * - Returns captured image blob
 * 
 * Usage:
 * const [showCamera, setShowCamera] = useState(false)
 * if (showCamera) {
 *   return <CameraCapture 
 *     onCapture={(blob) => { handleUpload(blob); setShowCamera(false) }}
 *     onCancel={() => setShowCamera(false)}
 *   />
 * }
 */

import { useRef, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, RotateCcw, Check, X, FlipHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'

export default function CameraCapture({ onCapture, onCancel }) {
  const { t } = useTranslation()
  const webcamRef = useRef(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [isFacingMode, setIsFacingMode] = useState('environment') // 'user' or 'environment'
  const [hasCamera, setHasCamera] = useState(true)

  useEffect(() => {
    // Check if user has allowed camera permission
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: isFacingMode } })
      .catch(() => {
        toast.error(t('camera.permissionDenied') || 'Camera permission denied')
        setHasCamera(false)
      })
  }, [t, isFacingMode])

  const capturePhoto = () => {
    try {
      const imageSrc = webcamRef.current?.getScreenshot()
      if (imageSrc) {
        setCapturedImage(imageSrc)
      }
    } catch (error) {
      console.error('Capture failed:', error)
      toast.error(t('camera.captureFailed') || 'Failed to capture photo')
    }
  }

  const confirmCapture = async () => {
    if (!capturedImage) return

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      onCapture(blob)
    } catch (error) {
      console.error('Error converting image:', error)
      toast.error(t('camera.conversionFailed') || 'Failed to process image')
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
  }

  const toggleFacingMode = () => {
    setIsFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }

  if (!hasCamera) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 text-center">
        <p className="text-red-600 font-semibold">
          {t('camera.notAvailable') || 'Camera is not available'}
        </p>
        <p className="text-gray-600 text-sm mt-2">
          {t('camera.permissionRequired') || 'Please enable camera permissions and try again'}
        </p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
        >
          {t('common.cancel') || 'Cancel'}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Camera View or Captured Image */}
      <div className="relative rounded-lg overflow-hidden mb-4 shadow-lg">
        {/* Camera Feed */}
        {!capturedImage && (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: isFacingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }}
            className="w-full"
          />
        )}

        {/* Captured Image */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full object-cover"
          />
        )}

        {/* Focus Guide Overlay (optional) */}
        {!capturedImage && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute border-2 border-yellow-400"
              style={{
                top: '10%',
                left: '10%',
                right: '10%',
                bottom: '10%',
                opacity: 0.5,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="text-yellow-400 text-4xl opacity-50"
                style={{
                  textShadow: '0 0 10px rgba(200, 200, 0, 0.5)',
                }}
              >
                ✓
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className="text-center text-sm text-gray-600 mb-4">
        {!capturedImage &&
          (t('camera.instructions') ||
            'Position your document within the frame. Ensure good lighting and clarity.')}
        {capturedImage &&
          (t('camera.reviewInstructions') ||
            'Review the captured image. Click confirm to proceed or retake.')}
      </p>

      {/* Controls */}
      <div className="flex justify-center gap-3 flex-wrap">
        {!capturedImage && (
          <>
            {/* Capture Button */}
            <button
              onClick={capturePhoto}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition font-semibold"
            >
              <Camera size={20} />
              {t('camera.capture') || 'Capture'}
            </button>

            {/* Flip Camera Button */}
            <button
              onClick={toggleFacingMode}
              className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              title={
                isFacingMode === 'user'
                  ? 'Switch to back camera'
                  : 'Switch to front camera'
              }
            >
              <FlipHorizontal size={20} />
              {t('camera.flip') || 'Flip'}
            </button>

            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
            >
              <X size={20} />
              {t('common.cancel') || 'Cancel'}
            </button>
          </>
        )}

        {capturedImage && (
          <>
            {/* Confirm Button */}
            <button
              onClick={confirmCapture}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              <Check size={20} />
              {t('common.confirm') || 'Confirm'}
            </button>

            {/* Retake Button */}
            <button
              onClick={retakePhoto}
              className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-lg hover:bg-opacity-90 transition"
            >
              <RotateCcw size={20} />
              {t('camera.retake') || 'Retake'}
            </button>

            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
            >
              <X size={20} />
              {t('common.cancel') || 'Cancel'}
            </button>
          </>
        )}
      </div>

      {/* Permissions Reminder */}
      <p className="text-xs text-gray-500 text-center mt-4">
        {t('camera.permissionsNote') ||
          'Make sure your browser has permission to access the camera'}
      </p>
    </div>
  )
}

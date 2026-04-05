// frontend/src/components/common/LoadingSpinner.jsx
/**
 * LoadingSpinner - Reusable loading indicator component
 * Features:
 * - Different sizes (sm, md, lg)
 * - Optional text below spinner
 * - Customizable color
 * - Full page or inline versions
 */

import { Loader } from 'lucide-react'

export default function LoadingSpinner({
  size = 'md', // 'sm', 'md', 'lg'
  text = null,
  color = 'text-blue-600',
  fullPage = false,
}) {
  const sizeMap = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <Loader className={`${sizeMap[size]} ${color} animate-spin`} />
      {text && <p className="mt-3 text-gray-600 font-medium">{text}</p>}
    </div>
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          {spinner}
        </div>
      </div>
    )
  }

  return spinner
}

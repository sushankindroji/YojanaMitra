// frontend/src/components/schemes/EligibilityBadges.jsx
/**
 * EligibilityBadges - Show per-condition eligibility status
 * Features:
 * - Color-coded badges (✅ green, ❌ red, ⚠️ yellow)
 * - Hover tooltip with condition details
 * - Show which conditions are met/not met
 * - Confidence indicators
 */

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'

export default function EligibilityBadges({
  conditions = [],
  title = 'Eligibility Conditions',
}) {
  const [hoveredId, setHoveredId] = useState(null)

  if (!conditions || conditions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No conditions specified</p>
      </div>
    )
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'met':
      case 'eligible':
      case 'yes':
        return {
          color: 'bg-green-100 border-green-300',
          text: 'text-green-800',
          icon: CheckCircle,
          label: 'Met',
        }
      case 'not_met':
      case 'ineligible':
      case 'no':
        return {
          color: 'bg-red-100 border-red-300',
          text: 'text-red-800',
          icon: XCircle,
          label: 'Not Met',
        }
      default:
        return {
          color: 'bg-yellow-100 border-yellow-300',
          text: 'text-yellow-800',
          icon: AlertCircle,
          label: 'Unknown',
        }
    }
  }

  return (
    <div className="w-full">
      <h3 className="text-h3 font-medium text-gray-900 mb-4">{title}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {conditions.map((condition, idx) => {
          const status = getStatusInfo(condition.status || condition.result)
          const StatusIcon = status.icon

          return (
            <div
              key={idx}
              className="relative group"
              onMouseEnter={() => setHoveredId(idx)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className={`flex items-center gap-2 p-4 rounded-lg border ${status.color} cursor-help transition-all hover:shadow-md`}
              >
                <StatusIcon className={`flex-shrink-0 ${status.text}`} size={20} />
                <div className="flex-1">
                  <p className={`font-medium ${status.text}`}>{condition.name || condition.condition_name}</p>
                  <p className={`text-body-sm opacity-75 ${status.text}`}>{condition.description}</p>
                </div>
                <span className={`text-caption font-medium px-2 py-1 rounded ${status.color}`}>
                  {status.label}
                </span>
              </div>

              {/* Tooltip with Details */}
              {hoveredId === idx && (
                <div className="absolute left-0 top-full mt-2 bg-gray-900 text-white rounded-lg p-3 text-body-sm shadow-lg z-50 w-64">
                  <p className="font-medium mb-2">{condition.name}</p>
                  {condition.details && <p className="mb-2">{condition.details}</p>}
                  {condition.user_value && (
                    <p className="border-t border-gray-700 pt-2 mt-2">
                      <span className="text-gray-400">Your value:</span> {condition.user_value}
                    </p>
                  )}
                  {condition.required_value && (
                    <p className="border-t border-gray-700 pt-2 mt-2">
                      <span className="text-gray-400">Required:</span> {condition.required_value}
                    </p>
                  )}
                  {condition.confidence && (
                    <p className="border-t border-gray-700 pt-2 mt-2">
                      <span className="text-gray-400">Confidence:</span> {condition.confidence}%
                    </p>
                  )}

                  {/* Arrow pointer */}
                  <div className="absolute bottom-full left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

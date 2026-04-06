// frontend/src/components/schemes/EligibilitySummary.jsx
/**
 * EligibilitySummary - Plain-language eligibility explanation
 * Features:
 * - Display explanation in user's language
 * - Show bullet points of requirements
 * - Highlight missing documents
 * - Action items
 */

import {  AlertCircle, CheckCircle, FileText , Lightbulb } from 'lucide-react'

export default function EligibilitySummary({
  explanation = '',
  explanationUserLang = '',
  missingDocuments = [],
  eligibilityPercentage = 0,
}) {
  // Use user's language explanation if available, otherwise English
  const displayText = explanationUserLang || explanation || 'No explanation available'

  // Parse bullet points from explanation if it's a string
  const points = displayText
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, 5) // Show top 5 points

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
            <Lightbulb className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-h3 font-medium text-gray-900">
              Eligibility Summary
            </h3>
            <p className="text-body-sm text-gray-600">Based on your profile information</p>
          </div>
        </div>

        {/* Eligibility Percentage */}
        {eligibilityPercentage > 0 && (
          <div className="flex items-center gap-3 mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-medium">
                {eligibilityPercentage}%
              </div>
            </div>
            <div className="flex-1">
              <p className="text-body-sm font-medium text-gray-900">Eligibility Match</p>
              <p className="text-caption text-gray-600">Your profile matches this scheme requirements</p>
            </div>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-body-sm text-gray-800 leading-relaxed whitespace-pre-line">
          {displayText}
        </p>
      </div>

      {/* Key Points */}
      {points.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            Key Requirements
          </h4>
          <ul className="space-y-2">
            {points.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-body-sm text-gray-700">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5"></span>
                <span>{point.trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing Documents */}
      {missingDocuments && missingDocuments.length > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="flex-shrink-0 text-orange-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-orange-900 mb-2">
                Missing Documents
              </h4>
              <ul className="space-y-1">
                {missingDocuments.map((doc, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-body-sm text-orange-800">
                    <FileText size={16} className="flex-shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
              <p className="text-caption text-orange-700 mt-2">
                Upload these documents to improve your eligibility match
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Missing Documents */}
      {(!missingDocuments || missingDocuments.length === 0) && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-600" size={20} />
            <p className="text-body-sm text-green-800 font-medium">
              All required documents are uploaded
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

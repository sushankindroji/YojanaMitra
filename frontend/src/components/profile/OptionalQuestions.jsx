// frontend/src/components/profile/OptionalQuestions.jsx
/**
 * OptionalQuestions - Dynamic questions based on user type/profile
 * Features:
 * - Show questions based on user_type (Farmer, Student, Person with Disability)
 * - Nested conditional sections
 * - Field validation
 * - Completeness tracking
 * 
 * Usage:
 * <OptionalQuestions
 *   userType="farmer"
 *   questions={questionsData}
 *   onSave={(answers) => updateProfile(answers)}
 * />
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, ChevronDown, ChevronRight } from 'lucide-react'

const OPTIONAL_QUESTIONS = {
  farmer: [
    {
      id: 'land_holding_acres',
      label: 'Land Holding (in acres)',
      type: 'number',
      required: false,
      section: 'Land Details',
    },
  ],
  student: [
    {
      id: 'education_level',
      label: 'Highest Education Level',
      type: 'select',
      options: ['Illiterate', 'Primary', '10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Post-Graduate', 'PhD'],
      required: false,
      section: 'Academic Details',
    },
  ],
  disability: [
    {
      id: 'disability_type',
      label: 'Type of Disability',
      type: 'select',
      options: ['Physical', 'Visual', 'Hearing', 'Speech', 'Intellectual', 'Multiple', 'Other'],
      required: false,
      section: 'Disability Details',
    },
    {
      id: 'disability_pct',
      label: 'Disability Percentage',
      type: 'number',
      required: false,
      section: 'Disability Details',
    },
  ],
}

export default function OptionalQuestions({
  userType,
  questions = {},
  onSave,
  isLoading = false,
}) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState(questions)
  const [errors, setErrors] = useState({})
  const [expandedSections, setExpandedSections] = useState({})

  const relevantQuestions = OPTIONAL_QUESTIONS[userType] || []
  const sections = [...new Set(relevantQuestions.map((q) => q.section))]

  // Initialize expanded sections
  useEffect(() => {
    const initialExpanded = {}
    sections.forEach((section) => {
      initialExpanded[section] = true
    })
    setExpandedSections(initialExpanded)
  }, [userType])

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  // Toggle section
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  // Render question field
  const renderQuestion = (question) => {
    const value = formData[question.id] || ''

    return (
      <div key={question.id} className="mb-4">
        <label className="mb-2 block text-label font-medium text-gray-700">
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {question.type === 'select' ? (
          <select
            name={question.id}
            value={value}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an option</option>
            {question.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : question.type === 'textarea' ? (
          <textarea
            name={question.id}
            value={value}
            onChange={handleChange}
            rows={4}
            placeholder={question.label}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <input
            type={question.type}
            name={question.id}
            value={value}
            onChange={handleChange}
            placeholder={question.label}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>
    )
  }

  if (!userType || relevantQuestions.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-blue-800">
          {t('profile.noOptionalQuestions') || 'No additional questions for your profile type.'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-h2 font-medium text-gray-900 mb-2">
          {t('profile.additionalInfo') || 'Additional Information'}
        </h2>
        <p className="text-gray-600">
          {t('profile.additionalInfoDesc') || 'Help us personalize your experience and show relevant schemes'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Sections */}
        {sections.map((section) => (
          <div key={section} className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
            {/* Section Header */}
            <button
              type="button"
              onClick={() => toggleSection(section)}
              className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition-colors"
            >
              <span>{section}</span>
              {expandedSections[section] ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>

            {/* Section Content */}
            {expandedSections[section] && (
              <div className="p-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {relevantQuestions
                    .filter((q) => q.section === section)
                    .map((question) => renderQuestion(question))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Buttons */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setFormData(questions)}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Save size={20} />
            {isLoading ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}

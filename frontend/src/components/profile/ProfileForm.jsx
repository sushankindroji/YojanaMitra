// frontend/src/components/profile/ProfileForm.jsx
/**
 * ProfileForm - Comprehensive user profile form
 * Features:
 * - Organized in tabs (Personal, Address, Employment/Education, Documents)
 * - Auto-fill from extracted documents
 * - Confidence badges for extracted data
 * - Form validation
 * - Field-level error display
 * - Completeness progress indicator
 * 
 * Usage:
 * <ProfileForm
 *   profile={profileData}
 *   extractedFields={extractionData}
 *   onSave={(updatedProfile) => updateProfile(updatedProfile)}
 * />
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { Save, AlertCircle } from 'lucide-react'
import FormInput from '../common/FormInput'
import FormSelect from '../common/FormSelect'
import FormCheckbox from '../common/FormCheckbox'

const TABS = ['personal', 'address', 'economic', 'categories']

const INDIA_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

const PROFILE_FIELDS = {
  personal: [
    { name: 'full_name', label: 'Full Name', type: 'text', required: true },
    { name: 'dob', label: 'Date of Birth', type: 'date', sourceKeys: ['date_of_birth'], required: false },
    { name: 'age', label: 'Age', type: 'number', required: false },
    {
      name: 'gender',
      label: 'Gender',
      type: 'select',
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' },
      ],
      sourceKeys: ['sex'],
      required: false,
    },
    { name: 'religion', label: 'Religion', type: 'text', required: false },
    {
      name: 'social_category',
      label: 'Social Category',
      type: 'select',
      options: [
        { value: 'general', label: 'General' },
        { value: 'obc', label: 'OBC' },
        { value: 'sc', label: 'SC' },
        { value: 'st', label: 'ST' },
        { value: 'ews', label: 'EWS' },
      ],
      sourceKeys: ['category', 'caste_category'],
      required: false,
    },
  ],
  address: [
    { name: 'state', label: 'State', type: 'select', options: INDIA_STATES, required: true },
    { name: 'district', label: 'District', type: 'text', required: true },
    { name: 'pincode', label: 'Pincode', type: 'text', sourceKeys: ['postal_code', 'zip_code'], required: false },
  ],
  economic: [
    { name: 'annual_income', label: 'Annual Income (Rs)', type: 'number', sourceKeys: ['income'], required: true },
    { name: 'occupation', label: 'Occupation', type: 'text', required: false },
    {
      name: 'education_level',
      label: 'Education Level',
      type: 'select',
      options: ['Illiterate', 'Primary', '10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Post-Graduate', 'PhD'],
      required: false,
    },
  ],
  categories: [
    { name: 'is_farmer', label: 'Farmer', type: 'checkbox', required: false },
    { name: 'is_student', label: 'Student', type: 'checkbox', required: false },
    { name: 'is_senior_citizen', label: 'Senior Citizen', type: 'checkbox', required: false },
    { name: 'has_disability', label: 'Has Disability', type: 'checkbox', required: false },
    { name: 'is_bpl', label: 'BPL Family', type: 'checkbox', required: false },
    { name: 'is_minority', label: 'Minority', type: 'checkbox', required: false },
    { name: 'is_woman_headed', label: 'Woman Headed Household', type: 'checkbox', required: false },
    { name: 'has_ration_card', label: 'Has Ration Card', type: 'checkbox', required: false },
    {
      name: 'ration_card_type',
      label: 'Ration Card Type',
      type: 'select',
      options: [
        { value: 'apl', label: 'APL' },
        { value: 'bpl', label: 'BPL' },
        { value: 'antyodaya', label: 'Antyodaya' },
        { value: 'phh', label: 'PHH' },
      ],
      required: false,
    },
    { name: 'land_holding_acres', label: 'Land Holding (Acres)', type: 'number', required: false },
    { name: 'disability_type', label: 'Disability Type', type: 'text', required: false },
    { name: 'disability_pct', label: 'Disability Percentage', type: 'number', required: false },
  ],
}

const CHECKBOX_FIELDS = new Set(
  Object.values(PROFILE_FIELDS)
    .flat()
    .filter((field) => field.type === 'checkbox')
    .map((field) => field.name)
)

const INTEGER_FIELDS = new Set(['age', 'disability_pct'])
const FLOAT_FIELDS = new Set(['annual_income', 'land_holding_acres'])

const ALIAS_TO_CANONICAL = {
  date_of_birth: 'dob',
  postal_code: 'pincode',
  zip_code: 'pincode',
  caste_category: 'social_category',
  category: 'social_category',
  income: 'annual_income',
  sex: 'gender',
}

const normalizeDateForInput = (value) => {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (!raw) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const dmy = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (dmy) {
    return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  }

  return raw
}

const normalizeStateValue = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const matched = INDIA_STATES.find((state) => state.toLowerCase() === raw.toLowerCase())
  return matched || raw
}

const parseBinaryFlag = (value) => {
  if (value === null || value === undefined || value === '') return undefined
  if (value === true || value === 1 || value === '1') return 1
  if (value === false || value === 0 || value === '0') return 0

  const lowered = String(value).trim().toLowerCase()
  if (['yes', 'true', 'y'].includes(lowered)) return 1
  if (['no', 'false', 'n'].includes(lowered)) return 0
  return undefined
}

const normalizeExtractedFields = (extractedFields = {}) => {
  const normalized = {}

  Object.entries(extractedFields).forEach(([rawKey, rawEntry]) => {
    const key = ALIAS_TO_CANONICAL[rawKey] || rawKey
    const value = rawEntry && typeof rawEntry === 'object' && 'value' in rawEntry
      ? rawEntry.value
      : rawEntry

    if (value === null || value === undefined || value === '') return

    if (CHECKBOX_FIELDS.has(key)) {
      const parsed = parseBinaryFlag(value)
      if (parsed !== undefined) {
        normalized[key] = parsed
      }
      return
    }

    if (key === 'dob') {
      normalized.dob = normalizeDateForInput(value)
      return
    }

    if (key === 'gender') {
      const lowered = String(value).trim().toLowerCase()
      if (['male', 'female', 'other'].includes(lowered)) {
        normalized.gender = lowered
      }
      return
    }

    if (key === 'social_category') {
      normalized.social_category = String(value).trim().toLowerCase()
      return
    }

    if (key === 'state') {
      normalized.state = normalizeStateValue(value)
      return
    }

    if (key === 'pincode') {
      const digits = String(value).replace(/\D/g, '').slice(0, 6)
      if (digits) {
        normalized.pincode = digits
      }
      return
    }

    if (key === 'annual_income') {
      const parsed = Number.parseFloat(String(value).replace(/,/g, '').trim())
      if (!Number.isNaN(parsed)) {
        normalized.annual_income = parsed
      }
      return
    }

    normalized[key] = value
  })

  return normalized
}

const buildInitialFormData = (profile, extractedFields) => {
  const merged = {
    ...DEFAULT_FORM_DATA,
    ...normalizeIncomingProfile(profile),
  }

  const extracted = normalizeExtractedFields(extractedFields)
  let autoFilledCount = 0

  Object.entries(extracted).forEach(([fieldName, value]) => {
    if (value === null || value === undefined || value === '') return

    const current = merged[fieldName]
    const isEmpty = CHECKBOX_FIELDS.has(fieldName)
      ? Number(current || 0) === 0
      : current === '' || current === null || current === undefined

    if (isEmpty) {
      merged[fieldName] = value
      autoFilledCount += 1
    }
  })

  return { merged, autoFilledCount }
}

const DEFAULT_FORM_DATA = Object.values(PROFILE_FIELDS)
  .flat()
  .reduce((acc, field) => {
    acc[field.name] = field.type === 'checkbox' ? 0 : ''
    return acc
  }, {})

const normalizeIncomingProfile = (profile) => {
  const normalized = { ...profile }

  Object.entries(ALIAS_TO_CANONICAL).forEach(([alias, canonical]) => {
    if (normalized[canonical] === undefined && normalized[alias] !== undefined) {
      normalized[canonical] = normalized[alias]
    }
  })

  CHECKBOX_FIELDS.forEach((fieldName) => {
    const value = normalized[fieldName]
    if (value === true) {
      normalized[fieldName] = 1
    } else if (value === false) {
      normalized[fieldName] = 0
    }
  })

  return normalized
}

export default function ProfileForm({
  profile = {},
  extractedFields = {},
  onSave,
  isLoading = false,
}) {
  const { t } = useTranslation()
  const initialData = buildInitialFormData(profile, extractedFields)
  const [activeTab, setActiveTab] = useState('personal')
  const [formData, setFormData] = useState(initialData.merged)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [completeness, setCompleteness] = useState(0)
  const [autoFilledCount, setAutoFilledCount] = useState(initialData.autoFilledCount)

  useEffect(() => {
    const next = buildInitialFormData(profile, extractedFields)
    setFormData(next.merged)
    setAutoFilledCount(next.autoFilledCount)
  }, [profile, extractedFields])

  // Calculate completeness percentage
  useEffect(() => {
    const allFields = Object.values(PROFILE_FIELDS).flat()
    const requiredFields = allFields.filter((f) => f.required)
    const completedRequired = requiredFields.filter((f) => formData[f.name]).length
    const percentage = Math.round((completedRequired / requiredFields.length) * 100)
    setCompleteness(Math.min(percentage, 100))
  }, [formData])

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  // Handle field blur
  const handleBlur = (e) => {
    const { name } = e.target
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }))
    validateField(name, formData[name])
  }

  // Validate single field
  const validateField = (name, value) => {
    const field = Object.values(PROFILE_FIELDS)
      .flat()
      .find((f) => f.name === name)

    if (!field) return

    if (field.required && !value) {
      setErrors((prev) => ({
        ...prev,
        [name]: `${field.label} is required`,
      }))
      return false
    }

    if (name === 'pincode' && value && !/^\d{6}$/.test(String(value).replace(/\D/g, ''))) {
      setErrors((prev) => ({
        ...prev,
        [name]: 'Pincode must be 6 digits',
      }))
      return false
    }

    if (name === 'disability_pct' && value !== '' && (Number(value) < 0 || Number(value) > 100)) {
      setErrors((prev) => ({
        ...prev,
        [name]: 'Disability percentage must be between 0 and 100',
      }))
      return false
    }

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }))
    return true
  }

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault()

    // Validate all required fields
    const allFields = Object.values(PROFILE_FIELDS).flat()
    const requiredFields = allFields.filter((f) => f.required)

    let hasErrors = false
    requiredFields.forEach((field) => {
      if (!formData[field.name]) {
        setErrors((prev) => ({
          ...prev,
          [field.name]: `${field.label} is required`,
        }))
        hasErrors = true
      }
    })

    if (hasErrors) {
      toast.error(t('profile.completeRequired') || 'Please fill in all required fields')
      return
    }

    const submitData = {}

    Object.values(PROFILE_FIELDS)
      .flat()
      .forEach((field) => {
        const rawValue = formData[field.name]

        if (field.type === 'checkbox') {
          submitData[field.name] = Number(rawValue) === 1 ? 1 : 0
          return
        }

        if (rawValue === '' || rawValue === null || rawValue === undefined) {
          return
        }

        if (INTEGER_FIELDS.has(field.name)) {
          const parsed = Number.parseInt(rawValue, 10)
          if (!Number.isNaN(parsed)) {
            submitData[field.name] = parsed
          }
          return
        }

        if (FLOAT_FIELDS.has(field.name)) {
          const parsed = Number.parseFloat(rawValue)
          if (!Number.isNaN(parsed)) {
            submitData[field.name] = parsed
          }
          return
        }

        submitData[field.name] = String(rawValue).trim()
      })

    if (submitData.gender) {
      submitData.gender = submitData.gender.toLowerCase()
    }
    if (submitData.social_category) {
      submitData.social_category = submitData.social_category.toLowerCase()
    }
    if (submitData.ration_card_type) {
      submitData.ration_card_type = submitData.ration_card_type.toLowerCase()
    }
    if (submitData.pincode) {
      submitData.pincode = submitData.pincode.replace(/\D/g, '').slice(0, 6)
    }

    onSave(submitData)
  }

  const getExtractedFieldData = (field) => {
    const keys = [field.name, ...(field.sourceKeys || [])]
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(extractedFields, key)) {
        const entry = extractedFields[key]
        if (entry && typeof entry === 'object' && 'value' in entry) {
          return entry
        }
        return { value: entry, confidence: 0 }
      }
    }
    return null
  }

  // Get confidence badge for extracted field
  const getExtractedFieldBadge = (extracted) => {
    if (!extracted) return null

    const rawConfidence = Number(extracted.confidence ?? 0)
    const confidence = rawConfidence > 0 && rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence

    if (confidence >= 80) {
      return <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">High confidence</span>
    } else if (confidence >= 60) {
      return <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Medium confidence</span>
    }
    return <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Low confidence</span>
  }

  // Render input field
  const renderField = (field) => {
    const value = formData[field.name] || ''
    const error = touched[field.name] ? errors[field.name] : ''
    const extracted = getExtractedFieldData(field)

    if (field.type === 'checkbox') {
      return (
        <FormCheckbox
          key={field.name}
          name={field.name}
          label={field.label}
          checked={Number(value) === 1}
          onChange={handleChange}
          required={field.required}
        />
      )
    }

    if (field.type === 'select') {
      return (
        <FormSelect
          key={field.name}
          label={field.label}
          name={field.name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          options={(field.options || []).map((opt) => ({
            value: typeof opt === 'object' ? opt.value : opt,
            label: typeof opt === 'object' ? opt.label : opt,
          }))}
          error={error}
          touched={touched[field.name] || false}
          required={field.required}
          placeholder={`Select ${field.label}`}
          helperText={extracted ? `Auto-filled from document${extracted.confidence >= 80 ? ' (high confidence)' : ''}` : undefined}
        />
      )
    }

    return (
      <FormInput
        key={field.name}
        label={field.label}
        name={field.name}
        type={field.type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        error={error}
        touched={touched[field.name] || false}
        required={field.required}
        placeholder={field.label}
        helperText={extracted ? `Auto-filled from document${extracted.confidence >= 80 ? ' (high confidence)' : ''}` : undefined}
      />
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      {/* Header with Completeness */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('profile.editProfile') || 'Edit Your Profile'}
        </h2>

        {autoFilledCount > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-900">
            {`Auto-filled ${autoFilledCount} field(s) from uploaded document. Please review and save.`}
          </div>
        )}

        {/* Completeness Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {t('profile.completeness') || 'Profile Completeness'}
            </span>
            <span className="text-sm font-bold text-blue-600">{completeness}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t(`profile.tab.${tab}`) || tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {PROFILE_FIELDS[activeTab]?.map((field) => renderField(field))}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...DEFAULT_FORM_DATA,
                ...normalizeIncomingProfile(profile),
              })
            }
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
            {isLoading ? t('common.saving') : t('profile.save')}
          </button>
        </div>
      </form>
    </div>
  )
}

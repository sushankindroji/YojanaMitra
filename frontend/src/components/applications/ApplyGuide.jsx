// frontend/src/components/applications/ApplyGuide.jsx
/**
 * ApplyGuide - Multi-step guided application wizard for schemes
 * Features:
 * - Scheme overview & eligibility check
 * - 5-step application form wizard
 * - Pre-fill from profile/extracted documents
 * - Save as draft or submit
 * - Acknowledgement receipt
 * 
 * Usage:
 * <ApplyGuide schemeId="scheme-123" onComplete={() => navigate('/applications')} />
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader,
  AlertCircle,
  FileText,
  Download,
  Save,
  SendIcon,
} from 'lucide-react'

import schemeService from '../../services/schemeService'
import applicationService from '../../services/applicationService'
import profileService from '../../services/profileService'
import EligibilityBadges from '../schemes/EligibilityBadges'
import LoadingSpinner from '../common/LoadingSpinner'
import FormInput from '../common/FormInput'
import FormSelect from '../common/FormSelect'
import FormCheckbox from '../common/FormCheckbox'

const FORM_STEPS = [
  {
    id: 1,
    title: 'Personal Details',
    description: 'Confirm your personal information',
    icon: '👤',
  },
  {
    id: 2,
    title: 'Employment Info',
    description: 'Provide employment details',
    icon: '💼',
  },
  {
    id: 3,
    title: 'Bank Account',
    description: 'Bank details for benefit transfer',
    icon: '🏦',
  },
  {
    id: 4,
    title: 'Additional Info',
    description: 'Scheme-specific requirements',
    icon: '📋',
  },
  {
    id: 5,
    title: 'Review & Submit',
    description: 'Review and submit application',
    icon: '✅',
  },
]

export default function ApplyGuide({ schemeId, onComplete }) {
  const { t } = useTranslation()
  const tr = (key, fallback) => {
    const translated = t(key)
    return translated && translated !== key ? translated : fallback
  }

  // State management
  const [currentStep, setCurrentStep] = useState(1)
  const [scheme, setScheme] = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [applicationId, setApplicationId] = useState(null)
  const [submissionStatus, setSubmissionStatus] = useState(null)

  // Form data state
  const [formData, setFormData] = useState({
    personal: {
      full_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
    },
    employment: {
      employment_status: '',
      occupation: '',
      annual_income: '',
      employer_name: '',
    },
    bank: {
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      bank_name: '',
    },
    additional: {
      notes: '',
      terms_agreed: false,
    },
  })

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!schemeId) {
          throw new Error('Missing scheme identifier')
        }

        const fetchSchemeDetail = async () => {
          try {
            return await schemeService.getSchemeDetail?.(schemeId)
          } catch (detailError) {
            const status = detailError?.response?.status
            if ([401, 403].includes(status) && schemeService.getPublicSchemeDetail) {
              return schemeService.getPublicSchemeDetail(schemeId)
            }
            throw detailError
          }
        }

        const [schemeResult, eligibilityResult, profileResult] = await Promise.allSettled([
          fetchSchemeDetail(),
          schemeService.getSchemeEligibility?.(schemeId),
          profileService.getProfile?.(),
        ])

        if (schemeResult.status === 'fulfilled' && schemeResult.value?.data) {
          setScheme(schemeResult.value.data)
        } else {
          throw new Error('Scheme details unavailable')
        }

        if (eligibilityResult.status === 'fulfilled' && eligibilityResult.value?.data) {
          setEligibility(eligibilityResult.value.data)
        } else if (eligibilityResult.status === 'rejected') {
          const status = eligibilityResult.reason?.response?.status
          if (![401, 403, 404].includes(status)) {
            console.warn('Could not fetch eligibility for apply guide', eligibilityResult.reason)
          }
        }

        if (profileResult.status === 'fulfilled' && profileResult.value?.data) {
          const profileData = profileResult.value.data
          setUserProfile(profileData)
          setFormData((prev) => ({
            ...prev,
            personal: {
              full_name: profileData.full_name || profileData.name || '',
              email: profileData.email || '',
              phone: profileData.phone || profileData.phone_number || profileData.mobile || '',
              date_of_birth: profileData.date_of_birth || profileData.dob || '',
            },
            employment: {
              employment_status: profileData.employment_status || profileData.occupation_status || '',
              occupation: profileData.occupation || '',
              annual_income: profileData.annual_income || '',
              employer_name: profileData.employer_name || '',
            },
            bank: {
              account_holder_name: profileData.account_holder_name || profileData.bank_account_holder || '',
              account_number: profileData.account_number || profileData.bank_account_number || '',
              ifsc_code: profileData.ifsc_code || profileData.bank_ifsc || '',
              bank_name: profileData.bank_name || '',
            },
          }))
        } else if (profileResult.status === 'rejected') {
          const status = profileResult.reason?.response?.status
          if (![401, 403, 404].includes(status)) {
            console.warn('Could not fetch profile for apply prefill', profileResult.reason)
          }
        }
      } catch (err) {
        console.error('Error fetching application data:', err)
        setError(tr('applications.fetchError', 'Failed to load application'))
      } finally {
        setIsLoading(false)
      }
    }

    if (schemeId) {
      fetchData()
    }
  }, [schemeId, t])

  /**
   * Form handlers
   */
  const handleInputChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const handleCheckboxChange = (section, field, checked) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: checked,
      },
    }))
  }

  /**
   * Save as draft
   */
  const handleSaveDraft = async () => {
    try {
      setIsSaving(true)

      // First save/create the application
      if (!applicationId) {
        const res = await applicationService.saveApplication(schemeId, '')
        setApplicationId(res.data.id)
        if (!res.data.id) throw new Error('Failed to create application')
      }

      // Update with form data
      await applicationService.updateApplication(applicationId, {
        status: 'started',
        prefilled_data: formData,
      })

      toast.success(tr('applications.savedAsDraft', 'Saved as draft'))
    } catch (err) {
      console.error('Error saving draft:', err)
      toast.error(tr('applications.saveDraftError', 'Failed to save draft'))
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Submit application
   */
  const handleSubmitApplication = async () => {
    try {
      setIsSaving(true)

      // Validate required fields
      if (
        !formData.personal.full_name ||
        !formData.personal.email ||
        !formData.personal.phone
      ) {
        toast.error(tr('applications.missingRequired', 'Please fill required fields'))
        setCurrentStep(1)
        setIsSaving(false)
        return
      }

      if (!formData.bank.account_number || !formData.bank.ifsc_code) {
        toast.error(tr('applications.missingBankDetails', 'Please complete bank details'))
        setCurrentStep(3)
        setIsSaving(false)
        return
      }

      if (!formData.additional.terms_agreed) {
        toast.error(tr('applications.agreeTerms', 'Please agree to terms'))
        setCurrentStep(5)
        setIsSaving(false)
        return
      }

      // Create or update application
      let appId = applicationId
      if (!appId) {
        const res = await applicationService.saveApplication(schemeId, '')
        appId = res.data.id
        setApplicationId(appId)
      }

      // Submit application
      const submitRes = await applicationService.updateApplication(appId, {
        status: 'submitted',
        prefilled_data: formData,
      })

      // Show success and move to confirmation
      setSubmissionStatus({
        status: 'submitted',
        acknowledgementNo: submitRes.data.acknowledgement_no || 'ACK-' + Date.now(),
        timestamp: new Date().toLocaleString(),
      })

      toast.success(
        tr('applications.submitted', 'Application submitted successfully')
      )
    } catch (err) {
      console.error('Error submitting application:', err)
      toast.error(tr('applications.submitError', 'Failed to submit application'))
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Step navigation
   */
  const handleNext = () => {
    if (currentStep < FORM_STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  /**
   * Render step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalDetailsStep()
      case 2:
        return renderEmploymentStep()
      case 3:
        return renderBankStep()
      case 4:
        return renderAdditionalInfoStep()
      case 5:
        return renderReviewStep()
      default:
        return null
    }
  }

  /**
   * Step 1: Personal Details
   */
  const renderPersonalDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="mb-2 block text-label font-medium text-gray-900">
            Full Name *
          </label>
          <input
            type="text"
            value={formData.personal.full_name}
            onChange={(e) =>
              handleInputChange('personal', 'full_name', e.target.value)
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="mb-2 block text-label font-medium text-gray-900">
            Email *
          </label>
          <input
            type="email"
            value={formData.personal.email}
            onChange={(e) => handleInputChange('personal', 'email', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="your.email@example.com"
          />
        </div>

        <div>
          <label className="mb-2 block text-label font-medium text-gray-900">
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.personal.phone}
            onChange={(e) => handleInputChange('personal', 'phone', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="+91 XXXXX XXXXX"
          />
        </div>

        <div>
          <label className="mb-2 block text-label font-medium text-gray-900">
            Date of Birth
          </label>
          <input
            type="date"
            value={formData.personal.date_of_birth}
            onChange={(e) =>
              handleInputChange('personal', 'date_of_birth', e.target.value)
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )

  /**
   * Step 2: Employment
   */
  const renderEmploymentStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="mb-2 block text-label font-medium text-gray-900">
            Employment Status
          </label>
          <select
            value={formData.employment.employment_status}
            onChange={(e) =>
              handleInputChange('employment', 'employment_status', e.target.value)
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select status</option>
            <option value="employed">Employed</option>
            <option value="self-employed">Self Employed</option>
            <option value="student">Student</option>
            <option value="farmer">Farmer</option>
            <option value="unemployed">Unemployed</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-label font-medium text-gray-900">
            Occupation
          </label>
          <input
            type="text"
            value={formData.employment.occupation}
            onChange={(e) =>
              handleInputChange('employment', 'occupation', e.target.value)
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Software Engineer, Farmer, etc."
          />
        </div>

        <div>
          <label className="mb-2 block text-label font-medium text-gray-900">
            Annual Income
          </label>
          <input
            type="number"
            value={formData.employment.annual_income}
            onChange={(e) =>
              handleInputChange('employment', 'annual_income', e.target.value)
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Amount in INR"
          />
        </div>

        <div>
          <label className="mb-2 block text-label font-medium text-gray-900">
            Employer/Organization Name
          </label>
          <input
            type="text"
            value={formData.employment.employer_name}
            onChange={(e) =>
              handleInputChange('employment', 'employer_name', e.target.value)
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Company Name, Farm, etc."
          />
        </div>
      </div>
    </div>
  )

  /**
   * Step 3: Bank Details
   */
  const renderBankStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-body-sm text-blue-800">
          💡 Bank details are needed for benefit transfer. Ensure accuracy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="mb-2 block text-label font-medium text-gray-900">
            Account Holder Name *
          </label>
          <input
            type="text"
            value={formData.bank.account_holder_name}
            onChange={(e) =>
              handleInputChange('bank', 'account_holder_name', e.target.value)
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Name as per bank records"
          />
        </div>

        <div>
          <label className="mb-2 block text-label font-medium text-gray-900">
            Bank Account Number *
          </label>
          <input
            type="text"
            value={formData.bank.account_number}
            onChange={(e) =>
              handleInputChange('bank', 'account_number', e.target.value)
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="XXXXX XXXXX XXXXX 1234"
          />
        </div>

        <div>
          <label className="mb-2 block text-label font-medium text-gray-900">
            IFSC Code *
          </label>
          <input
            type="text"
            value={formData.bank.ifsc_code}
            onChange={(e) =>
              handleInputChange('bank', 'ifsc_code', e.target.value)
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., SBIN0000001"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-label font-medium text-gray-900">
            Bank Name
          </label>
          <input
            type="text"
            value={formData.bank.bank_name}
            onChange={(e) => handleInputChange('bank', 'bank_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., State Bank of India"
          />
        </div>
      </div>
    </div>
  )

  /**
   * Step 4: Additional Info
   */
  const renderAdditionalInfoStep = () => (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-label font-medium text-gray-900">
          Additional Notes or Comments
        </label>
        <textarea
          value={formData.additional.notes}
          onChange={(e) => handleInputChange('additional', 'notes', e.target.value)}
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Any additional information you'd like to provide..."
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-900 mb-3">Document Checklist</h4>
        <ul className="space-y-2 text-body-sm text-amber-800">
          <li className="flex items-center gap-2">
            <span className="text-h4">📄</span> Aadhar/ID Proof
          </li>
          <li className="flex items-center gap-2">
            <span className="text-h4">💰</span> Income Certificate (if required)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-h4">🏠</span> Address Proof
          </li>
          <li className="flex items-center gap-2">
            <span className="text-h4">🏦</span> Bank Passbook/Statement
          </li>
        </ul>
        <p className="text-caption text-amber-600 mt-3">
          Keep these documents ready for submission
        </p>
      </div>
    </div>
  )

  /**
   * Step 5: Review & Submit
   */
  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Scheme Info Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-3">Scheme Information</h4>
        {scheme && (
          <div className="space-y-2 text-body-sm text-gray-700">
            <div>
              <span className="font-medium">Scheme Name:</span> {scheme.name}
            </div>
            {scheme.ministry && (
              <div>
                <span className="font-medium">Ministry:</span> {scheme.ministry}
              </div>
            )}
            {scheme.benefit_amount && (
              <div>
                <span className="font-medium">Benefit Amount:</span> ₹
                {(scheme.benefit_amount / 100000).toFixed(1)}L+
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal Details Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm text-gray-700">
          <div>
            <span className="font-medium">Name:</span> {formData.personal.full_name}
          </div>
          <div>
            <span className="font-medium">Email:</span> {formData.personal.email}
          </div>
          <div>
            <span className="font-medium">Phone:</span> {formData.personal.phone}
          </div>
          <div>
            <span className="font-medium">DOB:</span>{' '}
            {formData.personal.date_of_birth || 'Not provided'}
          </div>
        </div>
      </div>

      {/* Bank Details Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-3">Bank Details (Masked)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm text-gray-700">
          <div>
            <span className="font-medium">Account Holder:</span>{' '}
            {formData.bank.account_holder_name}
          </div>
          <div>
            <span className="font-medium">Account Number:</span>{' '}
            {formData.bank.account_number.slice(-4).padStart(
              formData.bank.account_number.length,
              '*'
            )}
          </div>
          <div>
            <span className="font-medium">IFSC:</span> {formData.bank.ifsc_code}
          </div>
          <div>
            <span className="font-medium">Bank:</span> {formData.bank.bank_name}
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.additional.terms_agreed}
            onChange={(e) =>
              handleCheckboxChange('additional', 'terms_agreed', e.target.checked)
            }
            className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
          />
          <div className="flex-1">
            <p className="text-body-sm text-gray-700">
              I confirm that the information provided is true and correct. I agree to
              the scheme terms and conditions and authorize the scheme authority to
              verify my details.
            </p>
          </div>
        </label>
      </div>

      {!formData.additional.terms_agreed && (
        <div className="text-body-sm text-red-600 font-medium">
          Please agree to terms before submitting
        </div>
      )}
    </div>
  )

  // Loading state
  if (isLoading) {
    return <LoadingSpinner />
  }

  // Submission success state
  if (submissionStatus?.status === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle className="text-green-600" size={40} />
            </div>

            <div>
              <h2 className="text-h1 font-medium text-gray-900 mb-2">
                Application Submitted!
              </h2>
              <p className="text-gray-600">
                Your application has been successfully submitted
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-left">
              <h4 className="font-medium text-green-900 mb-3">
                Acknowledgement Details
              </h4>
              <div className="space-y-2 text-body-sm text-green-800">
                <div>
                  <span className="font-medium">Acknowledgement No:</span>{' '}
                  {submissionStatus.acknowledgementNo}
                </div>
                <div>
                  <span className="font-medium">Submission Time:</span>{' '}
                  {submissionStatus.timestamp}
                </div>
                <div>
                  <span className="font-medium">Scheme:</span> {scheme?.name}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
              <ul className="text-body-sm text-blue-800 space-y-1">
                <li>✓ Your application is now under review</li>
                <li>✓ You will receive email updates on progress</li>
                <li>✓ Check your Applications dashboard for status updates</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                onClick={() => onComplete?.()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Back to Applications
              </button>
              <button
                onClick={() => {
                  const element = document.createElement('a')
                  element.href = `data:text/plain;charset=utf-8,${encodeURIComponent(
                    `Acknowledgement No: ${submissionStatus.acknowledgementNo}\nScheme: ${scheme?.name}\nSubmission Time: ${submissionStatus.timestamp}`
                  )}`
                  element.download = 'acknowledgement.txt'
                  element.click()
                }}
                className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium flex items-center gap-2"
              >
                <Download size={18} />
                Download Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
            <h2 className="text-h2 font-medium text-gray-900">Error Loading Application</h2>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-h2 font-medium text-gray-900">Apply for Scheme</h1>
              {scheme && <p className="text-gray-600">{scheme.name}</p>}
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
            >
              ✕ Close
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-body-sm transition-all ${
                    currentStep >= step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.id}
                </div>
                {idx < FORM_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-all ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Scheme Eligibility Check */}
        {eligibility && currentStep === 1 && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h3 className="font-medium text-gray-900 mb-4">Eligibility Status</h3>
            {eligibility.conditions && Array.isArray(eligibility.conditions) && (
              <EligibilityBadges conditions={eligibility.conditions} compact />
            )}
            {eligibility.eligible_percentage && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-body-sm text-blue-800">
                  You appear to be <strong>{eligibility.eligible_percentage}%</strong>{' '}
                  eligible for this scheme
                </p>
              </div>
            )}
          </div>
        )}

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <div className="mb-8">
            <h2 className="text-h2 font-medium text-gray-900 mb-2">
              {FORM_STEPS[currentStep - 1].title}
            </h2>
            <p className="text-gray-600">
              {FORM_STEPS[currentStep - 1].description}
            </p>
          </div>

          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || isSaving}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <div className="flex gap-3">
            {currentStep < FORM_STEPS.length && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-6 py-3 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Save Draft
                    </>
                  )}
                </button>

                <button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {currentStep === FORM_STEPS.length && (
              <button
                onClick={handleSubmitApplication}
                disabled={isSaving || !formData.additional.terms_agreed}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <SendIcon size={20} />
                    Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


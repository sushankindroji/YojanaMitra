// frontend/src/pages/SchemeDetail.jsx
/**
 * SchemeDetail - Full scheme details page
 * Features:
 * - Display complete scheme information
 * - Show eligibility conditions & summary
 * - Application guide steps
 * - "How to Apply" button
 * - Related schemes
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ArrowLeft, MapPin, Award, Zap, Loader, AlertCircle, BookOpen, ExternalLink } from 'lucide-react'
import EligibilityBadges from '../components/schemes/EligibilityBadges'
import EligibilitySummary from '../components/schemes/EligibilitySummary'
import schemeService from '../services/schemeService'
import { applicationService } from '../services/applicationService'

export default function SchemeDetail() {
  const { t } = useTranslation()
  const params = useParams()
  const navigate = useNavigate()

  const [scheme, setScheme] = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // overview, eligibility, howToApply

  // Fetch scheme details
  useEffect(() => {
    const schemeId = params.schemeId || params.id
    if (!schemeId) return

    const fetchSchemeDetails = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch scheme details
        const schemeResponse = await schemeService.getSchemeDetail(schemeId)
        setScheme(schemeResponse.data)

        // Fetch eligibility info
        const eligibilityResponse = await schemeService.getSchemeEligibility?.(schemeId)
        if (eligibilityResponse?.data) {
          setEligibility(eligibilityResponse.data)
        }
      } catch (err) {
        console.error('Error fetching scheme details:', err)
        setError(t('schemes.fetchError') || 'Failed to load scheme details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchemeDetails()
  }, [params])

  const handleApply = () => {
    // Navigate to application with scheme ID
    navigate(`/apply/${scheme?.id || scheme?.scheme_id}`)
  }

  const handleSaveScheme = async () => {
    try {
      await applicationService.saveApplication(scheme?.id || scheme?.scheme_id)
      toast.success(t('schemes.saved') || 'Scheme saved to your favorites')
    } catch (error) {
      toast.error(t('schemes.saveError') || 'Failed to save scheme')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !scheme) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/schemes')}
            className="mb-6 flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Schemes
          </button>

          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Scheme</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/schemes')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Back to Schemes
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto p-6">
          <button
            onClick={() => navigate('/schemes')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6"
          >
            <ArrowLeft size={20} />
            Back to Schemes
          </button>

          {/* Scheme Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{scheme.name_en || scheme.name}</h1>
              {scheme.ministry && (
                <p className="text-gray-600 mb-4">Ministry: {scheme.ministry}</p>
              )}

              {/* Key Stats */}
              <div className="flex flex-wrap gap-4 mt-6">
                {scheme.sector && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    <Zap size={16} />
                    {scheme.sector}
                  </div>
                )}
                {scheme.state && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <MapPin size={16} />
                    {scheme.state}
                  </div>
                )}
                {scheme.benefit_amount && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    <Award size={16} />
                    {scheme.currency || '₹'} {scheme.benefit_amount}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleApply}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                <ExternalLink size={20} />
                Apply Now
              </button>
              <button
                onClick={handleSaveScheme}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition-colors"
              >
                Save Scheme
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 bg-white rounded-t-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('eligibility')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'eligibility'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Eligibility
          </button>
          <button
            onClick={() => setActiveTab('howToApply')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'howToApply'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            How to Apply
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-b-lg shadow p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {(scheme.description_en || scheme.description) && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Scheme</h2>
                  <p className="text-gray-700 whitespace-pre-line">{scheme.description_en || scheme.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {scheme.eligibility_criteria && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Eligibility Criteria</h3>
                    <p className="text-gray-700 whitespace-pre-line text-sm">{scheme.eligibility_criteria}</p>
                  </div>
                )}

                {scheme.benefits && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Benefits</h3>
                    <p className="text-gray-700 whitespace-pre-line text-sm">{scheme.benefits}</p>
                  </div>
                )}
              </div>

              {scheme.application_deadline && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                  <p className="text-sm font-medium text-yellow-900">
                    <strong>Deadline:</strong> {scheme.application_deadline}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Eligibility Tab */}
          {activeTab === 'eligibility' && (
            <div className="space-y-6">
              {eligibility?.conditions && eligibility.conditions.length > 0 ? (
                <>
                  <EligibilityBadges
                    conditions={eligibility.conditions}
                    title="Your Eligibility Status"
                  />
                  <EligibilitySummary
                    explanation={eligibility.explanation}
                    explanationUserLang={eligibility.explanation_user_lang}
                    missingDocuments={eligibility.missing_documents}
                    eligibilityPercentage={eligibility.eligibility_percentage}
                  />
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    {eligibility ? 'Eligibility information not available' : 'Unable to determine eligibility'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* How to Apply Tab */}
          {activeTab === 'howToApply' && (
            <div>
              {scheme.application_procedure ? (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Apply</h2>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-line">{scheme.application_procedure}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Application procedure details not available</p>
                </div>
              )}

              {scheme.official_website && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 mb-2">For more information, visit the official website:</p>
                  <a
                    href={scheme.official_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                  >
                    {scheme.official_website}
                    <ExternalLink size={16} />
                  </a>
                </div>
              )}

              <button
                onClick={handleApply}
                className="mt-6 flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold w-full"
              >
                <ExternalLink size={20} />
                Proceed to Apply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

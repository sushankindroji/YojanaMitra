import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { applicationService } from '../../services/applicationService'
import { useApplicationStore } from '../../store/applicationStore'
import { toast } from 'react-toastify'
import { FiExternalLink, FiChevronDown, FiChevronUp, FiCheck, FiAlertCircle, FiBookmark } from 'react-icons/fi'

export default function SchemeCard({ scheme, isEligible = true }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const { addApplication } = useApplicationStore()
  const schemeId = scheme.id || scheme.scheme_id
  
  const eligibilityColor = isEligible ? 'text-green-600' : 'text-orange-600'
  const eligibilityBg = isEligible ? 'bg-green-50' : 'bg-orange-50'
  const eligibilityBorder = isEligible ? 'border-green-200' : 'border-orange-200'

  const handleApplyClick = () => {
    navigate(`/apply/${schemeId}`)
  }

  const handleSaveApplication = async () => {
    try {
      setSaving(true)
      const response = await applicationService.saveApplication(schemeId)
      addApplication(response.data)
      toast.success('✅ Scheme saved! View in My Applications')
    } catch (error) {
      console.error('Save error:', error)
      const message = error.response?.data?.detail || 'Failed to save application'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  // Format benefit amount
  const formatAmount = (amount) => {
    if (!amount) return 'N/A'
    return `₹${(amount / 100000).toFixed(1)}L+` || `₹${amount.toLocaleString()}`
  }

  return (
    <div className={`border rounded-xl p-6 mb-4 transition hover:shadow-lg ${eligibilityBg} ${eligibilityBorder}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {/* Scheme Name */}
          <h3 className="text-xl font-bold text-[#1A3A6B] mb-2">
            {scheme.name_en}
          </h3>
          
          {/* Ministry/Sector */}
          <p className="text-sm text-gray-600 mb-3">
            <span className="font-semibold">{scheme.ministry || scheme.sector}</span>
          </p>

          {/* Description */}
          <p className="text-gray-700 mb-4">
            {scheme.description_en}
          </p>
        </div>

        {/* Eligibility Badge */}
        <div className={`flex items-center gap-2 ml-4 ${eligibilityColor}`}>
          {isEligible ? (
            <>
              <FiCheck className="w-5 h-5" />
              <span className="font-semibold">Eligible</span>
            </>
          ) : (
            <>
              <FiAlertCircle className="w-5 h-5" />
              <span className="font-semibold">Partial</span>
            </>
          )}
        </div>
      </div>

      {/* Benefit Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-white rounded-lg">
        <div>
          <p className="text-xs text-gray-600 font-semibold uppercase">Benefit Amount</p>
          <p className="text-lg font-bold text-[#1A3A6B]">{formatAmount(scheme.benefit_amount)}</p>
        </div>
        
        <div>
          <p className="text-xs text-gray-600 font-semibold uppercase">Type</p>
          <p className="text-lg font-bold text-[#1A3A6B]">{scheme.benefit_type || 'Cash'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-600 font-semibold uppercase">Frequency</p>
          <p className="text-lg font-bold text-[#1A3A6B]">{scheme.benefit_frequency || 'One-time'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-600 font-semibold uppercase">Match %</p>
          <p className="text-lg font-bold text-green-600">{scheme.eligibility_percentage || 100}%</p>
        </div>
      </div>

      {/* Condition Details */}
      <div className="mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[#1A3A6B] font-semibold hover:text-[#2A5A9B] transition"
        >
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
          <span>Eligibility Details</span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-2 pl-6 border-l-2 border-gray-300">
            {scheme.condition_results && scheme.condition_results.length > 0 ? (
              scheme.condition_results.map((condition, idx) => (
                <div
                  key={idx}
                  className={`text-sm py-2 ${
                    condition.status === 'PASS' ? 'text-green-700' : 'text-orange-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white
                      ${condition.status === 'PASS' ? 'bg-green-500' : 'bg-orange-500'}`}
                    >
                      {condition.status === 'PASS' ? '✓' : '✗'}
                    </span>
                    <span>{condition.label_en || condition.field}</span>
                  </div>
                  {condition.is_mandatory && (
                    <p className="text-xs text-gray-600 ml-8">(Mandatory requirement)</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600">No specific conditions</p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-6">
        <div className="flex gap-3">
          <button
            onClick={handleApplyClick}
            className="flex-1 btn-primary flex items-center justify-center gap-2 hover:shadow-lg transition"
          >
            <span>How to Apply</span>
            <FiExternalLink className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaveApplication}
            disabled={saving}
            className="flex-1 bg-blue-50 border-2 border-blue-600 text-blue-600 px-4 py-3 rounded-lg font-semibold hover:bg-blue-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FiBookmark className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>

        {scheme.official_portal_url && (
          <a
            href={scheme.official_portal_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-white border border-[#1A3A6B] text-[#1A3A6B] px-4 py-3 rounded-lg font-semibold hover:bg-[#F5F7FA] transition flex items-center justify-center gap-2"
          >
            <span>Official Portal</span>
            <FiExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Application Mode */}
      <p className="text-xs text-gray-600 mt-4 text-center">
        Application Mode: <span className="font-semibold">{scheme.application_mode || 'Online'}</span>
      </p>
    </div>
  )
}

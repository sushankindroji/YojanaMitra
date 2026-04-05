import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import LanguageSelector from '../components/common/LanguageSelector'
import profileService from '../services/profileService'

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completeness, setCompleteness] = useState(0)
  
  const [formData, setFormData] = useState({
    full_name: '',
    dob: '',
    age: '',
    gender: '',
    state: '',
    district: '',
    pincode: '',
    annual_income: '',
    occupation: '',
    social_category: '',
    is_farmer: 0,
    is_student: 0,
    is_senior_citizen: 0,
    has_disability: 0,
    is_bpl: 0,
    is_minority: 0,
    is_woman_headed: 0,
  })

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const response = await profileService.getProfile()
        const profileData = response.data
        
        setFormData({
          full_name: profileData.full_name || '',
          dob: profileData.dob || '',
          age: profileData.age || '',
          gender: profileData.gender || '',
          state: profileData.state || '',
          district: profileData.district || '',
          pincode: profileData.pincode || '',
          annual_income: profileData.annual_income || '',
          occupation: profileData.occupation || '',
          social_category: profileData.social_category || '',
          is_farmer: profileData.is_farmer || 0,
          is_student: profileData.is_student || 0,
          is_senior_citizen: profileData.is_senior_citizen || 0,
          has_disability: profileData.has_disability || 0,
          is_bpl: profileData.is_bpl || 0,
          is_minority: profileData.is_minority || 0,
          is_woman_headed: profileData.is_woman_headed || 0,
        })
        
        setCompleteness(profileData.profile_complete_pct || 0)
      } catch (error) {
        console.error('Failed to load profile:', error)
        toast.error(t('profile.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Convert empty strings to null for numeric fields
      const submitData = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        annual_income: formData.annual_income ? parseFloat(formData.annual_income) : null,
      }
      
      const response = await profileService.updateProfile(submitData)
      setCompleteness(response.data.profile_complete_pct || 0)
      toast.success(t('profile.updateSuccess'))
      
      // Redirect after 1.5 seconds to let user see the success message
      setTimeout(() => {
        navigate(location.state?.returnTo || '/dashboard', { replace: true })
      }, 1500)
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error(error.response?.data?.detail || t('profile.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen">{t('common.loading')}</div>

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="tricolor-bar"></div>

      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 mr-4"
            >
              ← {t('common.back')}
            </button>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#1A3A6B]">{t('profile.title')}</h2>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-64 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#138808] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completeness}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-700">{completeness}% {t('profile.complete')}</span>
              </div>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8">
          {/* Basic Information Section */}
          <h3 className="text-xl font-bold mb-6 text-[#1A1A2E]">👤 {t('profile.basicInfo')}</h3>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold mb-2">{t('profile.fullName')} *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
                placeholder={t('profile.enterFullName')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('profile.dob')} *</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('profile.age')}</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
                placeholder={t('profile.enterAge')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('profile.gender')} *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
                required
              >
                <option value="">{t('profile.selectGender')}</option>
                <option value="male">{t('profile.male')}</option>
                <option value="female">{t('profile.female')}</option>
                <option value="other">{t('profile.other')}</option>
              </select>
            </div>
          </div>

          {/* Address Section */}
          <h3 className="text-xl font-bold mb-6 text-[#1A1A2E]">📍 {t('profile.address')}</h3>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold mb-2">{t('profile.state')} *</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
                placeholder={t('profile.enterState')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('profile.district')}</label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
                placeholder={t('profile.enterDistrict')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('profile.pincode')}</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
                placeholder={t('profile.enterPincode')}
              />
            </div>
          </div>

          {/* Economic Information */}
          <h3 className="text-xl font-bold mb-6 text-[#1A1A2E]">💰 {t('profile.economicInfo')}</h3>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold mb-2">{t('profile.annualIncome')} *</label>
              <input
                type="number"
                name="annual_income"
                value={formData.annual_income}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
                placeholder={t('profile.enterIncome')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('profile.occupation')}</label>
              <input
                type="text"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
                placeholder={t('profile.enterOccupation')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('profile.socialCategory')}</label>
              <select
                name="social_category"
                value={formData.social_category}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]"
              >
                <option value="">{t('profile.selectCategory')}</option>
                <option value="general">{t('profile.general')}</option>
                <option value="obc">{t('profile.obc')}</option>
                <option value="sc">{t('profile.sc')}</option>
                <option value="st">{t('profile.st')}</option>
                <option value="ews">{t('profile.ews')}</option>
              </select>
            </div>
          </div>

          {/* Categories Section */}
          <h3 className="text-xl font-bold mb-6 text-[#1A1A2E]">✓ {t('profile.yourCategories')}</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_farmer"
                checked={formData.is_farmer === 1}
                onChange={handleChange}
                className="w-4 h-4 mr-3"
              />
              <span className="text-gray-700">{t('profile.isFarmer')}</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_student"
                checked={formData.is_student === 1}
                onChange={handleChange}
                className="w-4 h-4 mr-3"
              />
              <span className="text-gray-700">{t('profile.isStudent')}</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_senior_citizen"
                checked={formData.is_senior_citizen === 1}
                onChange={handleChange}
                className="w-4 h-4 mr-3"
              />
              <span className="text-gray-700">{t('profile.isSeniorCitizen')}</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="has_disability"
                checked={formData.has_disability === 1}
                onChange={handleChange}
                className="w-4 h-4 mr-3"
              />
              <span className="text-gray-700">{t('profile.hasDisability')}</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_bpl"
                checked={formData.is_bpl === 1}
                onChange={handleChange}
                className="w-4 h-4 mr-3"
              />
              <span className="text-gray-700">{t('profile.isBpl')}</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_woman_headed"
                checked={formData.is_woman_headed === 1}
                onChange={handleChange}
                className="w-4 h-4 mr-3"
              />
              <span className="text-gray-700">{t('profile.isWomanHeaded')}</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_minority"
                checked={formData.is_minority === 1}
                onChange={handleChange}
                className="w-4 h-4 mr-3"
              />
              <span className="text-gray-700">{t('profile.isMinority')}</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full py-3 text-lg"
          >
            {saving ? t('profile.saving') : t('profile.saveProfile')}
          </button>
        </form>
      </div>
    </div>
  )
}

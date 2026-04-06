import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { ArrowLeft, BadgeCheck, MapPin, UserCircle2, Wallet } from 'lucide-react'
import profileService from '../services/profileService'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import PageHeader from '../components/ui/PageHeader'
import ProgressRing from '../components/ui/ProgressRing'
import Skeleton from '../components/ui/Skeleton'

const categoryFlags = [
  { key: 'is_farmer', labelKey: 'profile.isFarmer', fallback: 'Farmer' },
  { key: 'is_student', labelKey: 'profile.isStudent', fallback: 'Student' },
  { key: 'is_senior_citizen', labelKey: 'profile.isSeniorCitizen', fallback: 'Senior Citizen' },
  { key: 'has_disability', labelKey: 'profile.hasDisability', fallback: 'Disability' },
  { key: 'is_bpl', labelKey: 'profile.isBpl', fallback: 'BPL Family' },
  { key: 'is_woman_headed', labelKey: 'profile.isWomanHeaded', fallback: 'Woman-headed household' },
  { key: 'is_minority', labelKey: 'profile.isMinority', fallback: 'Minority' },
]
const educationLevelOptions = [
  'No Formal Schooling',
  'Primary',
  'Middle School',
  'Secondary (10th)',
  'Higher Secondary (12th)',
  'Diploma',
  'Graduate',
  'Postgraduate',
  'Doctorate',
  'Other',
]

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
    education_level: '',
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
          education_level: profileData.education_level || '',
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

      navigate(location.state?.returnTo || '/dashboard', { replace: true })
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error(error.response?.data?.detail || t('profile.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('profile.title')}
        description="Complete your demographic and eligibility profile to improve recommendation quality."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
            <div className="rounded-2xl border border-stone-200 bg-white p-2">
              <ProgressRing value={completeness} size={72} strokeWidth={8} label="Profile" />
            </div>
            <Badge variant={completeness >= 70 ? 'success' : 'warning'}>
              {completeness}% {t('profile.complete')}
            </Badge>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border border-stone-200">
          <div className="mb-4 flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-orange-700" />
            <h3 className="text-h3 font-medium text-stone-900">{t('profile.basicInfo')}</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={`${t('profile.fullName')} *`}
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder={t('profile.enterFullName')}
              required
            />

            <Input
              label={`${t('profile.dob')} *`}
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              required
            />

            <Input
              label={t('profile.age')}
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder={t('profile.enterAge')}
            />

            <div>
              <label className="mb-1.5 block text-label font-medium text-stone-700">{t('profile.gender')} *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-body text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
                required
              >
                <option value="">{t('profile.selectGender')}</option>
                <option value="male">{t('profile.male')}</option>
                <option value="female">{t('profile.female')}</option>
                <option value="other">{t('profile.other')}</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="border border-stone-200">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-700" />
            <h3 className="text-h3 font-medium text-stone-900">{t('profile.address')}</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={`${t('profile.state')} *`}
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder={t('profile.enterState')}
              required
            />

            <Input
              label={t('profile.district')}
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              placeholder={t('profile.enterDistrict')}
            />

            <Input
              label={t('profile.pincode')}
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder={t('profile.enterPincode')}
            />
          </div>
        </Card>

        <Card className="border border-stone-200">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-700" />
            <h3 className="text-h3 font-medium text-stone-900">{t('profile.economicInfo')}</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={`${t('profile.annualIncome')} *`}
              type="number"
              name="annual_income"
              value={formData.annual_income}
              onChange={handleChange}
              placeholder={t('profile.enterIncome')}
              required
            />

            <Input
              label={t('profile.occupation')}
              type="text"
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              placeholder={t('profile.enterOccupation')}
            />

            <div>
              <label className="mb-1.5 block text-label font-medium text-stone-700">
                {t('profile.educationLevel', { defaultValue: 'Education Level' })}
              </label>
              <select
                name="education_level"
                value={formData.education_level}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-body text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="">{t('profile.selectEducationLevel', { defaultValue: 'Select education level' })}</option>
                {educationLevelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-label font-medium text-stone-700">{t('profile.socialCategory')}</label>
              <select
                name="social_category"
                value={formData.social_category}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-body text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
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
        </Card>

        <Card className="border border-stone-200">
          <div className="mb-4 flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-purple-700" />
            <h3 className="text-h3 font-medium text-stone-900">{t('profile.yourCategories')}</h3>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categoryFlags.map((item) => {
              const checked = formData[item.key] === 1
              return (
                <label
                  key={item.key}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-body-sm transition ${
                    checked
                      ? 'border-orange-300 bg-orange-50 text-orange-800'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    name={item.key}
                    checked={checked}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-300"
                  />
                  <span>{t(item.labelKey, { defaultValue: item.fallback })}</span>
                </label>
              )
            })}
          </div>
        </Card>

        <Button
          type="submit"
          loading={saving}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? t('profile.saving') : t('profile.saveProfile')}
        </Button>
      </form>
    </div>
  )
}

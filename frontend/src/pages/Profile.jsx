import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

const occupationOptions = [
  'Farmer',
  'Agricultural Laborer',
  'Government Employee',
  'Private Employee',
  'Self-Employed',
  'Student',
  'Homemaker',
  'Unemployed',
  'Other',
]

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
].sort((a, b) => a.localeCompare(b))

const formatPhoneNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)} ${digits.slice(5)}`
}

const normalizeIncome = (value) => {
  const digits = String(value || '').replace(/[^\d]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-IN')
}

const parseIncome = (value) => {
  const digits = String(value || '').replace(/[^\d]/g, '')
  if (!digits) return null
  const parsed = Number(digits)
  return Number.isFinite(parsed) ? parsed : null
}

const formatSavedTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `Saved at ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
}

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [completeness, setCompleteness] = useState(0)
  const [lastSavedAt, setLastSavedAt] = useState('')
  const [dirty, setDirty] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [isHydrated, setIsHydrated] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: '',
    dob: '',
    age: '',
    gender: '',
    mobile_number: '',
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
        setIsHydrated(false)
        const response = await profileService.getProfile()
        const profileData = response.data
        
        setFormData({
          full_name: profileData.full_name || '',
          dob: profileData.dob || '',
          age: profileData.age || '',
          gender: profileData.gender || '',
          mobile_number: formatPhoneNumber(profileData.mobile_number || ''),
          state: profileData.state || '',
          district: profileData.district || '',
          pincode: profileData.pincode || '',
          annual_income: profileData.annual_income ? Number(profileData.annual_income).toLocaleString('en-IN') : '',
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
        setDirty(false)
        setFieldErrors({})
      } catch (error) {
        console.error('Failed to load profile:', error)
        toast.error(t('profile.loadFailed'))
      } finally {
        setLoading(false)
        setIsHydrated(true)
      }
    }

    loadProfile()
  }, [])

  const validateField = (name, rawValue) => {
    const value = String(rawValue || '').trim()

    if (name === 'pincode' && value && !/^\d{6}$/.test(value)) {
      setFieldErrors((prev) => ({ ...prev, pincode: 'Pincode must be exactly 6 digits' }))
      return false
    }

    if (name === 'mobile_number' && value) {
      const digits = value.replace(/\D/g, '')
      if (digits.length !== 10) {
        setFieldErrors((prev) => ({ ...prev, mobile_number: 'Mobile number must be 10 digits' }))
        return false
      }
    }

    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    return true
  }

  const buildSubmitData = () => ({
    ...formData,
    age: formData.age ? parseInt(formData.age, 10) : null,
    annual_income: parseIncome(formData.annual_income),
    mobile_number: formData.mobile_number.replace(/\D/g, '') || null,
  })

  const persistProfile = async ({ silent = false } = {}) => {
    const submitData = buildSubmitData()
    const response = await profileService.updateProfile(submitData)
    setCompleteness(response.data.profile_complete_pct || 0)
    setLastSavedAt(new Date().toISOString())
    setDirty(false)
    if (!silent) {
      toast.success('Profile updated', { autoClose: 3000 })
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    setFormData((prev) => {
      const next = { ...prev }
      if (type === 'checkbox') {
        next[name] = checked ? 1 : 0
      } else if (name === 'annual_income') {
        next.annual_income = normalizeIncome(value)
      } else if (name === 'mobile_number') {
        next.mobile_number = formatPhoneNumber(value)
      } else if (name === 'pincode') {
        next.pincode = value.replace(/\D/g, '').slice(0, 6)
      } else if (name === 'dob') {
        next.dob = value
        if (value) {
          const birthDate = new Date(`${value}T00:00:00`)
          if (!Number.isNaN(birthDate.getTime())) {
            const now = new Date()
            let computedAge = now.getFullYear() - birthDate.getFullYear()
            const monthDiff = now.getMonth() - birthDate.getMonth()
            const dayDiff = now.getDate() - birthDate.getDate()
            if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) computedAge -= 1
            next.age = computedAge >= 0 ? computedAge : ''
          }
        }
      } else {
        next[name] = value
      }
      return next
    })

    setDirty(true)
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  useEffect(() => {
    if (loading || !isHydrated || !dirty) return

    const timer = window.setTimeout(async () => {
      try {
        setAutoSaving(true)
        await persistProfile({ silent: true })
      } catch (error) {
        toast.error(error?.response?.data?.detail || t('profile.updateFailed'), { autoClose: 5000 })
      } finally {
        setAutoSaving(false)
      }
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [formData, dirty, isHydrated, loading])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      await persistProfile({ silent: false })
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error(error.response?.data?.detail || t('profile.updateFailed'), { autoClose: 5000 })
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
            <span className="text-caption text-stone-600">
              {autoSaving ? 'Saving...' : lastSavedAt ? formatSavedTime(lastSavedAt) : 'Autosave enabled'}
            </span>
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
              onBlur={(e) => validateField('full_name', e.target.value)}
              placeholder={t('profile.enterFullName')}
              error={fieldErrors.full_name}
              required
            />

            <Input
              label={`${t('profile.dob')} *`}
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              onBlur={(e) => validateField('dob', e.target.value)}
              error={fieldErrors.dob}
              required
            />

            <Input
              label={t('profile.age')}
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              onBlur={(e) => validateField('age', e.target.value)}
              placeholder={t('profile.enterAge')}
              error={fieldErrors.age}
            />

            <Input
              label="Mobile Number"
              type="text"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleChange}
              onBlur={(e) => validateField('mobile_number', e.target.value)}
              placeholder="98765 43210"
              inputMode="numeric"
              maxLength={11}
              error={fieldErrors.mobile_number}
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
            <div>
              <label className="mb-1.5 block text-label font-medium text-stone-700">{`${t('profile.state')} *`}</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                onBlur={(e) => validateField('state', e.target.value)}
                placeholder={t('profile.enterState')}
                className="h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-body text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
                list="profile-state-options"
                required
              />
              <datalist id="profile-state-options">
                {indianStates.map((stateName) => (
                  <option key={stateName} value={stateName} />
                ))}
              </datalist>
              {fieldErrors.state ? <p className="mt-1 text-caption font-medium text-red-700">{fieldErrors.state}</p> : null}
            </div>

            <Input
              label={t('profile.district')}
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              onBlur={(e) => validateField('district', e.target.value)}
              placeholder={t('profile.enterDistrict')}
              error={fieldErrors.district}
            />

            <Input
              label={t('profile.pincode')}
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              onBlur={(e) => validateField('pincode', e.target.value)}
              placeholder={t('profile.enterPincode')}
              inputMode="numeric"
              maxLength={6}
              error={fieldErrors.pincode}
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
              type="text"
              name="annual_income"
              value={formData.annual_income}
              onChange={handleChange}
              onBlur={(e) => validateField('annual_income', e.target.value)}
              placeholder={t('profile.enterIncome')}
              inputMode="numeric"
              error={fieldErrors.annual_income}
              required
            />

            <div>
              <label className="mb-1.5 block text-label font-medium text-stone-700">{t('profile.occupation')}</label>
              <select
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-body text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="">{t('profile.enterOccupation')}</option>
                {occupationOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

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

        <Card className="border border-stone-200">
          <h3 className="text-h3 font-medium text-stone-900">Documents summary</h3>
          <p className="mt-1 text-body-sm text-stone-600">Review uploaded documents and update any missing items.</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => navigate('/documents')}>
            Open documents
          </Button>
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

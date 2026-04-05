export { API_BASE_URL } from '../services/constants'

export const LANGUAGES = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  mr: 'मराठी',
  bn: 'বাংলা',
  kn: 'ಕನ್ನಡ',
}

export const SECTORS = [
  'Agriculture & Farmers',
  'Education & Scholarships',
  'Health & Insurance',
  'Housing & Infrastructure',
  'Women & Children',
  'Social Welfare & BPL',
  'Employment & Skill',
  'Entrepreneurship & MSME',
  'Disability',
  'Elderly',
  'Minority',
  'Tribal',
]

export const SOCIAL_CATEGORIES = [
  'general',
  'obc',
  'sc',
  'st',
  'ews',
]

export const DISABILITY_TYPES = [
  'Visual Impairment',
  'Hearing Impairment',
  'Speech Impairment',
  'Locomotive',
  'Mental Illness',
  'Mental Retardation',
  'Multiple Disabilities',
]

export const EDUCATION_LEVELS = [
  'Below 5th',
  '5th to 10th',
  '12th',
  'Diploma',
  'Bachelor',
  'Master',
  'PhD',
]

export const THRESHOLD_VALUES = {
  profileCompleteness: {
    excellent: 90,
    good: 70,
    fair: 50,
  },
  eligibilityScore: {
    eligible: 100,
    partial: 50,
    notEligible: 0,
  },
}

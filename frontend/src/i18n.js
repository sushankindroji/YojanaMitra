import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enTranslation from './locales/en/translation.json'
import hiTranslation from './locales/hi/translation.json'
import mrTranslation from './locales/mr/translation.json'
import taTranslation from './locales/ta/translation.json'
import teTranslation from './locales/te/translation.json'
import knTranslation from './locales/kn/translation.json'
import bnTranslation from './locales/bn/translation.json'

const LANGUAGE_STORAGE_KEY = 'yojana_mitra_lang'

if (typeof window !== 'undefined') {
  const legacyLanguage = window.localStorage.getItem('preferredLanguage')
  const currentLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (!currentLanguage && legacyLanguage) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, legacyLanguage)
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'te', 'ta', 'mr', 'bn', 'kn'],
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: enTranslation },
      hi: { translation: hiTranslation },
      te: { translation: teTranslation },
      ta: { translation: taTranslation },
      mr: { translation: mrTranslation },
      bn: { translation: bnTranslation },
      kn: { translation: knTranslation },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

export default i18n

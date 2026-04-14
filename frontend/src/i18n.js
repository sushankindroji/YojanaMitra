import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enTranslation from './locales/en.json'
import hiTranslation from './locales/hi.json'
import mrTranslation from './locales/mr.json'
import taTranslation from './locales/ta.json'
import teTranslation from './locales/te.json'
import knTranslation from './locales/kn.json'
import bnTranslation from './locales/bn.json'
import esTranslation from './locales/es.json'

const LANGUAGE_STORAGE_KEY = 'yojanamitra_language'
const LEGACY_LANGUAGE_KEYS = ['yojana_mitra_lang', 'preferredLanguage']

if (typeof window !== 'undefined') {
  const currentLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (!currentLanguage) {
    const legacyLanguage = LEGACY_LANGUAGE_KEYS
      .map((key) => window.localStorage.getItem(key))
      .find((value) => Boolean(value))

    if (legacyLanguage) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, legacyLanguage)
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'te', 'ta', 'mr', 'bn', 'kn', 'es'],
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: enTranslation },
      hi: { translation: hiTranslation },
      te: { translation: teTranslation },
      ta: { translation: taTranslation },
      mr: { translation: mrTranslation },
      bn: { translation: bnTranslation },
      kn: { translation: knTranslation },
      es: { translation: esTranslation },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

export default i18n

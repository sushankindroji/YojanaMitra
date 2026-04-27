import React from 'react'
import { useTranslation } from 'react-i18next'
import { FiChevronDown } from 'react-icons/fi'

const LanguageSelector = () => {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef(null)
  const languageStorageKey = 'yojanamitra_language'

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
    { code: 'es', name: 'Espanol', flag: '🇪🇸' },
  ]

  const activeLanguage = (i18n.language || 'en').split('-')[0]
  const currentLang = languages.find(l => l.code === activeLanguage) || languages[0]

  const applyLanguageFont = (code) => {
    const indicFonts = {
      hi: 'Noto Sans Devanagari',
      mr: 'Noto Sans Devanagari',
      ta: 'Noto Sans Tamil',
      te: 'Noto Sans Telugu',
      bn: 'Noto Sans Bengali',
      kn: 'Noto Sans Kannada',
    }

    if (typeof document === 'undefined') return

    const selectedFont = indicFonts[code] ? `'${indicFonts[code]}', sans-serif` : "'Inter', sans-serif"
    document.documentElement.style.setProperty('--font-primary', selectedFont)
  }

  React.useEffect(() => {
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [])

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
    localStorage.setItem(languageStorageKey, langCode)
    localStorage.setItem('preferredLanguage', langCode)
    localStorage.setItem('i18nextLng', langCode)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = langCode
    }
    applyLanguageFont(langCode)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-10 min-w-[9.5rem] items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-body-sm text-stone-700 transition-colors hover:bg-stone-50"
        aria-label="Select language"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span>{currentLang.flag}</span>
        <span className="font-medium">{currentLang.name}</span>
        <FiChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-stone-200 bg-white shadow-lg" role="menu" aria-label="Language options">
          {languages.map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-body-sm transition-colors hover:bg-stone-50 ${
                activeLanguage === lang.code ? 'bg-orange-50 text-orange-700' : 'text-stone-700'
              }`}
              role="menuitem"
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              {activeLanguage === lang.code && <span className="ml-auto text-orange-700">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSelector

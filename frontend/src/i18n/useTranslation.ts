import { useState, useEffect, useCallback } from 'react'
import { translations, Language, LANGUAGE_KEY, TranslationKey } from './translations'

export function useTranslation() {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en'
    const stored = localStorage.getItem(LANGUAGE_KEY)
    return (stored === 'es' ? 'es' : 'en') as Language
  })

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<{ language: Language }>) => {
      setLanguageState(event.detail.language)
    }

    window.addEventListener('languageChanged', handleLanguageChange as EventListener)
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(LANGUAGE_KEY, lang)
    setLanguageState(lang)
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }))
  }, [])

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key
  }, [language])

  return { t, language, setLanguage }
}

export default useTranslation

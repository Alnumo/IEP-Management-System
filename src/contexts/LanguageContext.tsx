import React, { createContext, useContext, useState, useEffect } from 'react'
import { Language, I18nContext } from '@/lib/i18n'

const LanguageContext = createContext<I18nContext | null>(null)

interface LanguageProviderProps {
  children: React.ReactNode
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguage] = useState<Language>('ar')

  // Load saved language from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage && ['ar', 'en'].includes(savedLanguage)) {
      setLanguage(savedLanguage)
    }
  }, [])

  // Update document attributes when language changes
  useEffect(() => {
    const html = document.documentElement
    const isRTL = language === 'ar'
    
    html.setAttribute('lang', language)
    html.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
    
    // Update font family
    document.body.style.fontFamily = language === 'ar' 
      ? "'Tajawal', 'Cairo', system-ui, sans-serif"
      : "system-ui, -apple-system, sans-serif"
    
    // Save to localStorage
    localStorage.setItem('language', language)
  }, [language])

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar')
  }

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
  }

  const value: I18nContext = {
    language,
    isRTL: language === 'ar',
    toggleLanguage,
    setLanguage: handleSetLanguage,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = (): I18nContext => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
import React, { createContext, useContext, useState, useEffect } from 'react'
import { Language, I18nContext, translate } from '@/lib/i18n'

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
    
    // Force sidebar icon positioning for RTL
    if (isRTL) {
      // Remove any existing style first
      const existingStyle = document.getElementById('rtl-icon-fix')
      if (existingStyle) {
        existingStyle.remove()
      }
      
      const style = document.createElement('style')
      style.id = 'rtl-icon-fix'
      style.textContent = `
        [dir="rtl"] aside nav svg,
        [dir="rtl"] .sidebar nav svg,
        [dir="rtl"] .nav-item svg {
          order: -1 !important;
          margin-left: 0 !important;
          margin-right: 0.5rem !important;
        }
        [dir="rtl"] aside nav span,
        [dir="rtl"] .sidebar nav span,
        [dir="rtl"] .nav-item span {
          order: 1 !important;
        }
        [dir="rtl"] aside nav a,
        [dir="rtl"] .sidebar nav a,
        [dir="rtl"] .nav-item {
          display: flex !important;
          flex-direction: row !important;
        }
      `
      document.head.appendChild(style)
    } else {
      // Remove RTL styles when switching to English
      const existingStyle = document.getElementById('rtl-icon-fix')
      if (existingStyle) {
        existingStyle.remove()
      }
    }
    
    // Save to localStorage
    localStorage.setItem('language', language)
  }, [language])

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar')
  }

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
  }

  const t = (key: string, fallback?: string) => translate(key, fallback, language)

  const value: I18nContext = {
    language,
    isRTL: language === 'ar',
    toggleLanguage,
    setLanguage: handleSetLanguage,
    t
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
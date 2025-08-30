/**
 * useLanguage Hook
 * 
 * Why: Demonstrates language management patterns for Arabic/English therapy applications:
 * - Language state management with persistence
 * - RTL detection and direction utilities
 * - Font family switching for Arabic text
 * - Text formatting and alignment helpers
 * - Integration with React Context
 * - Type-safe language operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react'

// Types for language management
export type Language = 'ar' | 'en'

export interface LanguageConfig {
  language: Language
  isRTL: boolean
  direction: 'rtl' | 'ltr'
  textAlign: 'right' | 'left'
  fontFamily: string
}

export interface LanguageHookReturn {
  // Current language state
  language: Language
  isRTL: boolean
  config: LanguageConfig
  
  // Language switching functions
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  
  // Formatting utilities
  formatText: (text: string) => string
  getDirection: () => 'rtl' | 'ltr'
  getTextAlign: () => 'right' | 'left'
  getFontFamily: () => string
  
  // Conditional rendering helpers
  isArabic: boolean
  isEnglish: boolean
  
  // CSS class helpers
  directionClass: string
  alignmentClass: string
  fontClass: string
}

// Font family mappings
const FONT_FAMILIES: Record<Language, string> = {
  ar: "'Tajawal', 'Cairo', 'Amiri', system-ui, sans-serif",
  en: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
}

// Text alignment mappings
const TEXT_ALIGNMENTS: Record<Language, 'right' | 'left'> = {
  ar: 'right',
  en: 'left'
}

// Direction mappings
const DIRECTIONS: Record<Language, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  en: 'ltr'
}

/**
 * Custom hook for managing language state and formatting
 * Provides comprehensive language utilities for Arabic/English applications
 */
export const useLanguage = (
  initialLanguage: Language = 'ar',
  persistKey: string = 'app-language'
): LanguageHookReturn => {
  // Initialize language state with persistence
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(persistKey) as Language
      if (saved && ['ar', 'en'].includes(saved)) {
        return saved
      }
    }
    return initialLanguage
  })

  // Memoized language configuration
  const config = useMemo<LanguageConfig>(() => ({
    language,
    isRTL: language === 'ar',
    direction: DIRECTIONS[language],
    textAlign: TEXT_ALIGNMENTS[language],
    fontFamily: FONT_FAMILIES[language]
  }), [language])

  // Update document attributes when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement
      
      // Set language and direction attributes
      html.setAttribute('lang', language)
      html.setAttribute('dir', config.direction)
      
      // Update body font family
      document.body.style.fontFamily = config.fontFamily
      
      // Persist language preference
      localStorage.setItem(persistKey, language)
    }
  }, [language, config, persistKey])

  // Language switching functions
  const setLanguage = useCallback((newLanguage: Language) => {
    if (['ar', 'en'].includes(newLanguage)) {
      setLanguageState(newLanguage)
    }
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => prev === 'ar' ? 'en' : 'ar')
  }, [])

  // Text formatting utilities
  const formatText = useCallback((text: string): string => {
    if (!text) return ''
    
    // Apply language-specific formatting
    if (language === 'ar') {
      // Ensure proper Arabic text formatting
      return text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    }
    
    return text.trim()
  }, [language])

  // Direction and alignment getters
  const getDirection = useCallback(() => config.direction, [config.direction])
  const getTextAlign = useCallback(() => config.textAlign, [config.textAlign])
  const getFontFamily = useCallback(() => config.fontFamily, [config.fontFamily])

  // Conditional rendering helpers
  const isArabic = useMemo(() => language === 'ar', [language])
  const isEnglish = useMemo(() => language === 'en', [language])

  // CSS class helpers
  const directionClass = useMemo(() => `dir-${config.direction}`, [config.direction])
  const alignmentClass = useMemo(() => `text-${config.textAlign}`, [config.textAlign])
  const fontClass = useMemo(() => `font-${language}`, [language])

  return {
    // State
    language,
    isRTL: config.isRTL,
    config,
    
    // Actions
    setLanguage,
    toggleLanguage,
    
    // Utilities
    formatText,
    getDirection,
    getTextAlign,
    getFontFamily,
    
    // Conditionals
    isArabic,
    isEnglish,
    
    // CSS helpers
    directionClass,
    alignmentClass,
    fontClass
  }
}

/**
 * Hook for Arabic text formatting and validation
 * Specialized utilities for Arabic text handling
 */
export const useArabicText = () => {
  const { language, isArabic } = useLanguage()

  // Arabic text validation
  const isArabicText = useCallback((text: string): boolean => {
    if (!text) return false
    // Check for Arabic Unicode range
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/
    return arabicRegex.test(text)
  }, [])

  // Arabic text normalization
  const normalizeArabicText = useCallback((text: string): string => {
    if (!text || !isArabicText(text)) return text
    
    return text
      // Normalize Arabic characters
      .replace(/ي/g, 'ی') // Normalize Yeh
      .replace(/ك/g, 'ک') // Normalize Kaf
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
  }, [isArabicText])

  // Get text direction based on content
  const getTextDirection = useCallback((text: string): 'rtl' | 'ltr' => {
    if (!text) return language === 'ar' ? 'rtl' : 'ltr'
    return isArabicText(text) ? 'rtl' : 'ltr'
  }, [language, isArabicText])

  // Format mixed Arabic/English text
  const formatMixedText = useCallback((text: string): string => {
    if (!text) return ''
    
    // Split text into segments and apply appropriate formatting
    const segments = text.split(/(\s+)/)
    
    return segments
      .map(segment => {
        if (segment.trim() === '') return segment
        
        const direction = getTextDirection(segment)
        if (direction === 'rtl' && isArabic) {
          return normalizeArabicText(segment)
        }
        return segment
      })
      .join('')
  }, [isArabic, getTextDirection, normalizeArabicText])

  return {
    isArabicText,
    normalizeArabicText,
    getTextDirection,
    formatMixedText,
    isArabic
  }
}

/**
 * Hook for responsive text sizing based on language
 * Handles different font size requirements for Arabic vs English
 */
export const useResponsiveText = () => {
  const { language, isArabic } = useLanguage()

  // Get responsive font size based on language and screen size
  const getResponsiveFontSize = useCallback((
    baseSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl',
    screenSize: 'mobile' | 'tablet' | 'desktop' = 'mobile'
  ): string => {
    const arabicMultiplier = isArabic ? 1.1 : 1 // Arabic text needs slightly larger size
    
    const baseSizes = {
      xs: { mobile: 12, tablet: 13, desktop: 14 },
      sm: { mobile: 14, tablet: 15, desktop: 16 },
      base: { mobile: 16, tablet: 17, desktop: 18 },
      lg: { mobile: 18, tablet: 20, desktop: 22 },
      xl: { mobile: 20, tablet: 22, desktop: 24 },
      '2xl': { mobile: 24, tablet: 28, desktop: 32 }
    }
    
    const pixelSize = baseSizes[baseSize][screenSize] * arabicMultiplier
    return `${pixelSize}px`
  }, [isArabic])

  // Get responsive line height for better Arabic text readability
  const getResponsiveLineHeight = useCallback((
    baseSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl'
  ): number => {
    const arabicLineHeightBoost = isArabic ? 0.2 : 0
    
    const baseLineHeights = {
      xs: 1.4,
      sm: 1.5,
      base: 1.6,
      lg: 1.7,
      xl: 1.7,
      '2xl': 1.6
    }
    
    return baseLineHeights[baseSize] + arabicLineHeightBoost
  }, [isArabic])

  return {
    getResponsiveFontSize,
    getResponsiveLineHeight,
    language,
    isArabic
  }
}

// Usage Examples:

/*
// Basic language management
function TherapyCard() {
  const { 
    language, 
    isRTL, 
    toggleLanguage, 
    formatText,
    directionClass 
  } = useLanguage()
  
  return (
    <div className={`therapy-card ${directionClass}`}>
      <button onClick={toggleLanguage}>
        {language === 'ar' ? 'English' : 'العربية'}
      </button>
      <h3>{formatText('جلسة العلاج الطبيعي')}</h3>
    </div>
  )
}

// Arabic text handling
function ArabicTextInput() {
  const { isArabicText, formatMixedText } = useArabicText()
  const [text, setText] = useState('')
  
  const handleTextChange = (value: string) => {
    const formatted = formatMixedText(value)
    setText(formatted)
  }
  
  return (
    <input
      value={text}
      onChange={(e) => handleTextChange(e.target.value)}
      dir={isArabicText(text) ? 'rtl' : 'ltr'}
      placeholder="اكتب النص هنا..."
    />
  )
}

// Responsive text sizing
function ResponsiveTitle() {
  const { getResponsiveFontSize, getResponsiveLineHeight } = useResponsiveText()
  
  const titleStyle = {
    fontSize: getResponsiveFontSize('2xl', 'desktop'),
    lineHeight: getResponsiveLineHeight('2xl')
  }
  
  return (
    <h1 style={titleStyle}>
      خطة العلاج الفردية
    </h1>
  )
}

// Integration with Context
function LanguageProvider({ children }: { children: React.ReactNode }) {
  const languageHook = useLanguage('ar', 'therapy-app-language')
  
  return (
    <LanguageContext.Provider value={languageHook}>
      {children}
    </LanguageContext.Provider>
  )
}
*/

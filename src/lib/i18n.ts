export type Language = 'ar' | 'en'

export interface I18nContext {
  language: Language
  isRTL: boolean
  toggleLanguage: () => void
  setLanguage: (lang: Language) => void
}

export const defaultLanguage: Language = 'ar'

export const isRTL = (lang: Language): boolean => lang === 'ar'

export const getDirection = (lang: Language): 'rtl' | 'ltr' => 
  isRTL(lang) ? 'rtl' : 'ltr'

export const getTextAlign = (lang: Language): 'right' | 'left' => 
  isRTL(lang) ? 'right' : 'left'

// Font configuration for different languages
export const getFontFamily = (lang: Language): string => {
  switch (lang) {
    case 'ar':
      return "'Tajawal', 'Cairo', system-ui, sans-serif"
    case 'en':
      return "system-ui, -apple-system, sans-serif"
    default:
      return "'Tajawal', 'Cairo', system-ui, sans-serif"
  }
}
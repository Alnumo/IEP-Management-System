export type Language = 'ar' | 'en'

export interface I18nContext {
  language: Language
  isRTL: boolean
  toggleLanguage: () => void
  setLanguage: (lang: Language) => void
  t: (key: string, fallback?: string) => string
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

// Basic translation function (placeholder for actual translations)
export const translate = (key: string, fallback?: string, language: Language = 'en'): string => {
  // Simple translation map for testing purposes
  const translations: Record<Language, Record<string, string>> = {
    ar: {
      'auth.2fa.setup.success': 'تم تمكين المصادقة الثنائية بنجاح',
      'auth.2fa.verify.invalid': 'رمز التحقق غير صحيح',
      'auth.2fa.backup.success': 'تم التحقق من رمز النسخ الاحتياطي بنجاح',
      'common.cancel': 'إلغاء',
      'common.continue': 'متابعة'
    },
    en: {
      'auth.2fa.setup.success': 'Two-factor authentication enabled successfully',
      'auth.2fa.verify.invalid': 'Invalid verification code',
      'auth.2fa.backup.success': 'Backup code verified successfully',
      'common.cancel': 'Cancel',
      'common.continue': 'Continue'
    }
  }
  
  return translations[language]?.[key] || fallback || key
}
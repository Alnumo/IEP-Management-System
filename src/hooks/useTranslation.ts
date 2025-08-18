import { useLanguage } from '@/contexts/LanguageContext'
import arTranslations from '@/locales/ar.json'
import enTranslations from '@/locales/en.json'

type TranslationKey = string
type TranslationValue = string | Record<string, any>

const translations = {
  ar: arTranslations,
  en: enTranslations,
}

export const useTranslation = () => {
  const { language } = useLanguage()

  const t = (key: TranslationKey): string => {
    const keys = key.split('.')
    let value: TranslationValue = translations[language]

    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = value[k]
      } else {
        // Fallback to Arabic if key not found in current language
        if (language !== 'ar') {
          let fallbackValue: TranslationValue = translations.ar
          for (const fallbackKey of keys) {
            if (typeof fallbackValue === 'object' && fallbackValue !== null && fallbackKey in fallbackValue) {
              fallbackValue = fallbackValue[fallbackKey]
            } else {
              return key // Return key if not found in fallback either
            }
          }
          return typeof fallbackValue === 'string' ? fallbackValue : key
        }
        return key // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key
  }

  return { t, language }
}
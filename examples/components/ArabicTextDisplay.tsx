import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ArabicTextDisplayProps {
  title: string
  content: string
  englishTranslation?: string
  showTranslation?: boolean
  variant?: 'default' | 'highlighted' | 'quote' | 'heading'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * ArabicTextDisplay - Demonstrates Arabic text rendering patterns
 * 
 * Why: Shows how to properly display Arabic text with:
 * - Correct RTL text direction and alignment
 * - Proper Arabic font family (Tajawal, Cairo)
 * - Text size scaling for Arabic readability
 * - Translation display options
 * - Different text variants (headings, quotes, highlights)
 * - Proper line height for Arabic text
 * - Mixed content handling (Arabic + English)
 * 
 * Pattern: Arabic text component with RTL support and typography
 */
export const ArabicTextDisplay: React.FC<ArabicTextDisplayProps> = ({
  title,
  content,
  englishTranslation,
  showTranslation = false,
  variant = 'default',
  size = 'md',
  className
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm leading-6'
      case 'md':
        return 'text-base leading-7'
      case 'lg':
        return 'text-lg leading-8'
      case 'xl':
        return 'text-xl leading-9'
      default:
        return 'text-base leading-7'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'highlighted':
        return 'bg-teal-50 border-r-4 border-teal-400 pr-4 py-3 rounded-lg'
      case 'quote':
        return 'border-r-4 border-gray-300 pr-4 py-2 italic bg-gray-50 rounded-lg'
      case 'heading':
        return 'font-bold text-gray-900 border-b-2 border-teal-200 pb-2'
      default:
        return 'text-gray-800'
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        {title}
      </h3>

      {/* Arabic Content */}
      <div
        dir="rtl"
        className={cn(
          'font-arabic text-right',
          getSizeClasses(),
          getVariantClasses(),
          'transition-all duration-200'
        )}
      >
        {content}
      </div>

      {/* English Translation */}
      {showTranslation && englishTranslation && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Badge variant="secondary" className="mb-2 text-xs">
            Translation
          </Badge>
          <p className="text-sm text-gray-600 italic leading-6">
            {englishTranslation}
          </p>
        </div>
      )}
    </div>
  )
}

// Mixed Content Component for Arabic + English
interface MixedContentDisplayProps {
  sections: Array<{
    type: 'arabic' | 'english'
    content: string
    label?: string
  }>
  className?: string
}

export const MixedContentDisplay: React.FC<MixedContentDisplayProps> = ({
  sections,
  className
}) => {
  return (
    <Card className={cn('backdrop-blur-sm bg-white/90', className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Mixed Content Example
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="space-y-2">
            {section.label && (
              <Badge variant="outline" className="text-xs">
                {section.label}
              </Badge>
            )}
            <div
              dir={section.type === 'arabic' ? 'rtl' : 'ltr'}
              className={cn(
                'p-3 rounded-lg border',
                section.type === 'arabic'
                  ? 'font-arabic text-right bg-teal-50 border-teal-200'
                  : 'text-left bg-blue-50 border-blue-200'
              )}
            >
              {section.content}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Usage Examples:
export const ArabicTextDisplayUsage = () => {
  return (
    <div className="space-y-8 p-6">
      {/* Basic Arabic Text */}
      <ArabicTextDisplay
        title="Basic Arabic Text"
        content="مرحباً بكم في نظام إدارة خطط العلاج. هذا النظام مصمم لمساعدة المعالجين وأولياء الأمور في متابعة تقدم الأطفال."
        englishTranslation="Welcome to the therapy plan management system. This system is designed to help therapists and parents track children's progress."
        showTranslation={true}
      />

      {/* Highlighted Arabic Text */}
      <ArabicTextDisplay
        title="Highlighted Important Text"
        content="تنبيه: يجب حضور جميع الجلسات المقررة لضمان تحقيق أفضل النتائج العلاجية."
        englishTranslation="Notice: All scheduled sessions must be attended to ensure the best therapeutic results."
        variant="highlighted"
        showTranslation={true}
      />

      {/* Arabic Quote */}
      <ArabicTextDisplay
        title="Arabic Quote"
        content="التعليم هو أقوى سلاح يمكنك استخدامه لتغيير العالم."
        englishTranslation="Education is the most powerful weapon which you can use to change the world."
        variant="quote"
        size="lg"
        showTranslation={true}
      />

      {/* Arabic Heading */}
      <ArabicTextDisplay
        title="Section Heading"
        content="أهداف العلاج الأساسية"
        englishTranslation="Primary Therapy Goals"
        variant="heading"
        size="xl"
        showTranslation={true}
      />

      {/* Mixed Content Example */}
      <MixedContentDisplay
        sections={[
          {
            type: 'arabic',
            content: 'اسم الطفل: أحمد محمد علي',
            label: 'Patient Info (Arabic)'
          },
          {
            type: 'english',
            content: 'Therapist: Dr. Sarah Johnson, M.A., CCC-SLP',
            label: 'Therapist Info (English)'
          },
          {
            type: 'arabic',
            content: 'نوع العلاج: علاج النطق واللغة',
            label: 'Treatment Type (Arabic)'
          },
          {
            type: 'english',
            content: 'Session Duration: 45 minutes',
            label: 'Duration (English)'
          }
        ]}
      />

      {/* Different Sizes Example */}
      <Card className="backdrop-blur-sm bg-white/90">
        <CardHeader>
          <CardTitle>Arabic Text Size Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ArabicTextDisplay
            title="Small Text"
            content="هذا نص صغير للملاحظات والتفاصيل الإضافية."
            size="sm"
          />
          <ArabicTextDisplay
            title="Medium Text (Default)"
            content="هذا النص الافتراضي المناسب لمعظم المحتوى."
            size="md"
          />
          <ArabicTextDisplay
            title="Large Text"
            content="هذا نص كبير للعناوين الفرعية المهمة."
            size="lg"
          />
          <ArabicTextDisplay
            title="Extra Large Text"
            content="هذا نص كبير جداً للعناوين الرئيسية."
            size="xl"
          />
        </CardContent>
      </Card>
    </div>
  )
}

import React from 'react'
import { cn } from '@/lib/utils'

interface RTLWrapperProps {
  children: React.ReactNode
  isRTL?: boolean
  className?: string
  enableAutoDetection?: boolean
}

/**
 * RTLWrapper - Demonstrates RTL layout wrapping patterns
 * 
 * Why: Shows how to create RTL-aware wrapper components with:
 * - Automatic text direction detection based on content
 * - Proper CSS direction and text-align properties
 * - Flex direction reversal for RTL layouts
 * - Spacing adjustments for Arabic text
 * - Font family switching based on language
 * - Container queries for responsive RTL behavior
 * 
 * Pattern: Universal RTL wrapper for any content
 */
export const RTLWrapper: React.FC<RTLWrapperProps> = ({
  children,
  isRTL = false,
  className,
  enableAutoDetection = false
}) => {
  // Auto-detect RTL based on content if enabled
  const detectRTL = (content: React.ReactNode): boolean => {
    if (!enableAutoDetection) return isRTL
    
    const textContent = React.Children.toArray(content)
      .map(child => {
        if (typeof child === 'string') return child
        if (React.isValidElement(child) && typeof child.props.children === 'string') {
          return child.props.children
        }
        return ''
      })
      .join('')
    
    // Simple Arabic character detection
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/
    return arabicRegex.test(textContent)
  }

  const shouldUseRTL = detectRTL(children)
  const direction = shouldUseRTL ? 'rtl' : 'ltr'

  return (
    <div
      dir={direction}
      className={cn(
        'transition-all duration-200',
        shouldUseRTL && [
          'text-right',
          'font-arabic',
          '[&_*]:text-right',
          '[&_.flex]:flex-row-reverse',
          '[&_.space-x-*]:space-x-reverse',
          '[&_input]:text-right',
          '[&_textarea]:text-right'
        ],
        className
      )}
      style={{
        direction,
        textAlign: shouldUseRTL ? 'right' : 'left'
      }}
    >
      {children}
    </div>
  )
}

// Flex Container with RTL Support
interface RTLFlexProps {
  children: React.ReactNode
  direction?: 'row' | 'col'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  gap?: number
  isRTL?: boolean
  className?: string
}

export const RTLFlex: React.FC<RTLFlexProps> = ({
  children,
  direction = 'row',
  align = 'start',
  justify = 'start',
  gap = 4,
  isRTL = false,
  className
}) => {
  const getFlexClasses = () => {
    const baseClasses = ['flex']
    
    // Direction
    if (direction === 'col') {
      baseClasses.push('flex-col')
    } else {
      baseClasses.push(isRTL ? 'flex-row-reverse' : 'flex-row')
    }
    
    // Alignment
    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch'
    }
    baseClasses.push(alignMap[align])
    
    // Justification
    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around'
    }
    baseClasses.push(justifyMap[justify])
    
    // Gap
    baseClasses.push(`gap-${gap}`)
    
    return baseClasses.join(' ')
  }

  return (
    <div 
      className={cn(getFlexClasses(), className)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {children}
    </div>
  )
}

// Grid Container with RTL Support
interface RTLGridProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4 | 6 | 12
  gap?: number
  isRTL?: boolean
  className?: string
}

export const RTLGrid: React.FC<RTLGridProps> = ({
  children,
  cols = 1,
  gap = 4,
  isRTL = false,
  className
}) => {
  const getGridClasses = () => {
    const baseClasses = ['grid']
    
    // Columns
    const colsMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      6: 'grid-cols-6',
      12: 'grid-cols-12'
    }
    baseClasses.push(colsMap[cols])
    
    // Gap
    baseClasses.push(`gap-${gap}`)
    
    return baseClasses.join(' ')
  }

  return (
    <div 
      className={cn(
        getGridClasses(),
        isRTL && 'direction-rtl',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {children}
    </div>
  )
}

// Text Container with RTL Support
interface RTLTextProps {
  children: React.ReactNode
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  color?: 'gray-600' | 'gray-900' | 'teal-600' | 'red-600'
  isRTL?: boolean
  className?: string
}

export const RTLText: React.FC<RTLTextProps> = ({
  children,
  size = 'base',
  weight = 'normal',
  color = 'gray-900',
  isRTL = false,
  className
}) => {
  const getTextClasses = () => {
    const baseClasses = []
    
    // Size
    const sizeMap = {
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl'
    }
    baseClasses.push(sizeMap[size])
    
    // Weight
    const weightMap = {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold'
    }
    baseClasses.push(weightMap[weight])
    
    // Color
    baseClasses.push(`text-${color}`)
    
    // RTL specific
    if (isRTL) {
      baseClasses.push('font-arabic', 'text-right')
    }
    
    return baseClasses.join(' ')
  }

  return (
    <div 
      className={cn(getTextClasses(), className)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {children}
    </div>
  )
}

// Usage Examples:
export const RTLWrapperUsage = () => {
  return (
    <div className="space-y-8 p-6">
      {/* Auto-detection Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Auto-detection RTL Wrapper</h3>
        
        <RTLWrapper enableAutoDetection={true}>
          <p>This is English text that should be left-aligned.</p>
        </RTLWrapper>
        
        <RTLWrapper enableAutoDetection={true}>
          <p>هذا نص عربي يجب أن يكون محاذياً لليمين تلقائياً.</p>
        </RTLWrapper>
      </div>

      {/* Manual RTL Control */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Manual RTL Control</h3>
        
        <RTLWrapper isRTL={false}>
          <RTLFlex direction="row" justify="between" align="center">
            <span>Left aligned content</span>
            <span>Right side</span>
          </RTLFlex>
        </RTLWrapper>
        
        <RTLWrapper isRTL={true}>
          <RTLFlex direction="row" justify="between" align="center" isRTL={true}>
            <span>محتوى محاذي لليمين</span>
            <span>الجانب الأيسر</span>
          </RTLFlex>
        </RTLWrapper>
      </div>

      {/* Grid Layout Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">RTL Grid Layouts</h3>
        
        <RTLGrid cols={3} gap={4} isRTL={false}>
          <div className="bg-blue-100 p-4 rounded">Item 1</div>
          <div className="bg-blue-100 p-4 rounded">Item 2</div>
          <div className="bg-blue-100 p-4 rounded">Item 3</div>
        </RTLGrid>
        
        <RTLGrid cols={3} gap={4} isRTL={true}>
          <div className="bg-teal-100 p-4 rounded font-arabic">عنصر 1</div>
          <div className="bg-teal-100 p-4 rounded font-arabic">عنصر 2</div>
          <div className="bg-teal-100 p-4 rounded font-arabic">عنصر 3</div>
        </RTLGrid>
      </div>

      {/* Text Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">RTL Text Components</h3>
        
        <RTLText size="lg" weight="bold" isRTL={false}>
          English Heading
        </RTLText>
        
        <RTLText size="lg" weight="bold" isRTL={true}>
          عنوان عربي
        </RTLText>
        
        <RTLText size="base" color="gray-600" isRTL={false}>
          This is a paragraph of English text that demonstrates left-to-right reading direction.
        </RTLText>
        
        <RTLText size="base" color="gray-600" isRTL={true}>
          هذه فقرة من النص العربي التي تظهر اتجاه القراءة من اليمين إلى اليسار.
        </RTLText>
      </div>

      {/* Complex Layout Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Complex RTL Layout</h3>
        
        <RTLWrapper isRTL={true} className="bg-white p-6 rounded-lg shadow-sm border">
          <RTLText size="xl" weight="bold" isRTL={true} className="mb-4">
            تقرير تقدم الطالب
          </RTLText>
          
          <RTLFlex direction="row" justify="between" align="start" isRTL={true} className="mb-6">
            <div>
              <RTLText size="base" weight="medium" isRTL={true}>اسم الطالب:</RTLText>
              <RTLText size="base" color="gray-600" isRTL={true}>أحمد محمد علي</RTLText>
            </div>
            <div>
              <RTLText size="base" weight="medium" isRTL={true}>التاريخ:</RTLText>
              <RTLText size="base" color="gray-600" isRTL={true}>2024-03-15</RTLText>
            </div>
          </RTLFlex>
          
          <RTLGrid cols={2} gap={6} isRTL={true}>
            <div className="bg-teal-50 p-4 rounded-lg">
              <RTLText size="base" weight="semibold" isRTL={true} className="mb-2">
                النطق الواضح
              </RTLText>
              <RTLText size="sm" color="gray-600" isRTL={true}>
                تحسن ملحوظ في وضوح النطق
              </RTLText>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <RTLText size="base" weight="semibold" isRTL={true} className="mb-2">
                المفردات
              </RTLText>
              <RTLText size="sm" color="gray-600" isRTL={true}>
                زيادة في عدد المفردات المستخدمة
              </RTLText>
            </div>
          </RTLGrid>
        </RTLWrapper>
      </div>
    </div>
  )
}

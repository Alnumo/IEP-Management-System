import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowRight, ArrowLeft, Download, Save, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BaseButtonProps {
  children: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  isLoading?: boolean
  disabled?: boolean
  icon?: 'arrow' | 'download' | 'save' | 'send' | 'none'
  iconPosition?: 'left' | 'right'
  isRTL?: boolean
  className?: string
  onClick?: () => void
}

/**
 * BaseButton - Demonstrates the project's button design patterns
 * 
 * Why: Shows how to create consistent, accessible buttons with:
 * - Arabic/RTL text support with proper icon positioning
 * - Loading states with spinner animations
 * - Gradient styling matching the design system
 * - Icon integration with proper spacing
 * - Touch-friendly sizing for mobile
 * - Accessibility features (focus states, disabled states)
 * 
 * Pattern: Gradient buttons with hover effects and loading states
 */
export const BaseButton: React.FC<BaseButtonProps> = ({
  children,
  variant = 'default',
  size = 'default',
  isLoading = false,
  disabled = false,
  icon = 'none',
  iconPosition = 'right',
  isRTL = false,
  className,
  onClick
}) => {
  const getIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }

    switch (icon) {
      case 'arrow':
        return isRTL ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />
      case 'download':
        return <Download className="h-4 w-4" />
      case 'save':
        return <Save className="h-4 w-4" />
      case 'send':
        return <Send className="h-4 w-4" />
      default:
        return null
    }
  }

  const iconElement = getIcon()
  const shouldShowIcon = iconElement && !isLoading
  const shouldShowSpinner = isLoading

  // Determine icon positioning based on RTL and iconPosition
  const showIconLeft = (!isRTL && iconPosition === 'left') || (isRTL && iconPosition === 'right')
  const showIconRight = (!isRTL && iconPosition === 'right') || (isRTL && iconPosition === 'left')

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={cn(
        'transition-all duration-200 active:scale-95',
        isRTL && 'font-arabic',
        // Custom gradient for primary buttons
        variant === 'default' && 'bg-gradient-to-r from-teal-500 to-green-400 hover:from-teal-600 hover:to-green-500 shadow-lg hover:shadow-xl',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className={cn(
        'flex items-center gap-2',
        isRTL && 'flex-row-reverse'
      )}>
        {/* Loading spinner or left icon */}
        {shouldShowSpinner && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        {!shouldShowSpinner && shouldShowIcon && showIconLeft && iconElement}
        
        {/* Button text */}
        <span className={cn(
          'font-medium',
          isRTL && 'text-right'
        )}>
          {children}
        </span>
        
        {/* Right icon */}
        {!shouldShowSpinner && shouldShowIcon && showIconRight && iconElement}
      </div>
    </Button>
  )
}

// Usage Examples:
export const BaseButtonUsage = () => {
  const [loading, setLoading] = React.useState(false)

  const handleAsyncAction = async () => {
    setLoading(true)
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLoading(false)
  }

  return (
    <div className="space-y-8 p-6">
      {/* Primary Action Buttons with Arabic Text */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Primary Action Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <BaseButton
            variant="default"
            icon="arrow"
            isRTL={true}
          >
            حفظ الخطة العلاجية
          </BaseButton>
          
          <BaseButton
            variant="default"
            icon="send"
            iconPosition="left"
          >
            Send Message
          </BaseButton>
          
          <BaseButton
            variant="default"
            icon="download"
            size="lg"
          >
            Download Report
          </BaseButton>
        </div>
      </div>

      {/* Loading States */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Loading States</h3>
        <div className="flex flex-wrap gap-4">
          <BaseButton
            variant="default"
            isLoading={loading}
            onClick={handleAsyncAction}
            isRTL={true}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ البيانات'}
          </BaseButton>
          
          <BaseButton
            variant="outline"
            isLoading={true}
          >
            Processing...
          </BaseButton>
        </div>
      </div>

      {/* Secondary and Outline Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Secondary Actions</h3>
        <div className="flex flex-wrap gap-4">
          <BaseButton
            variant="outline"
            icon="arrow"
            isRTL={true}
          >
            عرض التفاصيل
          </BaseButton>
          
          <BaseButton
            variant="secondary"
            icon="save"
            iconPosition="left"
          >
            Save Draft
          </BaseButton>
          
          <BaseButton
            variant="ghost"
            size="sm"
          >
            Cancel
          </BaseButton>
        </div>
      </div>

      {/* Disabled States */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Disabled States</h3>
        <div className="flex flex-wrap gap-4">
          <BaseButton
            variant="default"
            disabled={true}
            icon="arrow"
            isRTL={true}
          >
            غير متاح حالياً
          </BaseButton>
          
          <BaseButton
            variant="outline"
            disabled={true}
          >
            Not Available
          </BaseButton>
        </div>
      </div>

      {/* Size Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Size Variants</h3>
        <div className="flex flex-wrap items-center gap-4">
          <BaseButton
            variant="default"
            size="sm"
            icon="arrow"
          >
            Small
          </BaseButton>
          
          <BaseButton
            variant="default"
            size="default"
            icon="arrow"
          >
            Default
          </BaseButton>
          
          <BaseButton
            variant="default"
            size="lg"
            icon="arrow"
          >
            Large
          </BaseButton>
        </div>
      </div>
    </div>
  )
}

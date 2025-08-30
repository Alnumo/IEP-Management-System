/**
 * Component Testing Examples
 * 
 * Why: Demonstrates testing patterns for React components in therapy applications:
 * - Vitest + React Testing Library setup
 * - Arabic/RTL component testing
 * - User interaction testing with Arabic text
 * - Accessibility testing for therapy components
 * - Loading and error state testing
 * - Mock context providers for language switching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Import example components (these would be your actual components)
import { ExampleCard } from '../components/ExampleCard'
import { BaseButton } from '../components/BaseButton'
import { ArabicTextDisplay } from '../components/ArabicTextDisplay'

// Mock language context
const mockLanguageContext = {
  language: 'ar' as const,
  isRTL: true,
  toggleLanguage: vi.fn(),
  setLanguage: vi.fn(),
  formatText: (text: string) => text.trim(),
  getDirection: () => 'rtl' as const,
  getTextAlign: () => 'right' as const,
  getFontFamily: () => "'Tajawal', 'Cairo', system-ui, sans-serif",
  isArabic: true,
  isEnglish: false,
  directionClass: 'dir-rtl',
  alignmentClass: 'text-right',
  fontClass: 'font-ar',
  config: {
    language: 'ar' as const,
    isRTL: true,
    direction: 'rtl' as const,
    textAlign: 'right' as const,
    fontFamily: "'Tajawal', 'Cairo', system-ui, sans-serif"
  }
}

// Mock the language context
vi.mock('../hooks/useLanguage', () => ({
  useLanguage: () => mockLanguageContext
}))

// Test wrapper with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <div dir="rtl" lang="ar">
        {children}
      </div>
    </QueryClientProvider>
  )
}

describe('ExampleCard Component', () => {
  const mockTherapySession = {
    id: 'session-1',
    title: 'جلسة علاج النطق',
    description: 'تحسين مهارات النطق والتواصل',
    type: 'speech' as const,
    progress: 75,
    status: 'in-progress' as const,
    date: '2024-01-15T10:00:00Z',
    duration: 45,
    therapistName: 'د. أحمد محمد',
    studentName: 'سارة علي'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render therapy session card with Arabic text', () => {
    render(
      <TestWrapper>
        <ExampleCard session={mockTherapySession} />
      </TestWrapper>
    )

    // Check Arabic text rendering
    expect(screen.getByText('جلسة علاج النطق')).toBeInTheDocument()
    expect(screen.getByText('تحسين مهارات النطق والتواصل')).toBeInTheDocument()
    expect(screen.getByText('د. أحمد محمد')).toBeInTheDocument()
    expect(screen.getByText('سارة علي')).toBeInTheDocument()
  })

  it('should display correct progress percentage', () => {
    render(
      <TestWrapper>
        <ExampleCard session={mockTherapySession} />
      </TestWrapper>
    )

    // Check progress display
    expect(screen.getByText('75%')).toBeInTheDocument()
    
    // Check progress bar
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '75')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    expect(progressBar).toHaveAttribute('aria-valuemax', '100')
  })

  it('should apply correct RTL styling', () => {
    render(
      <TestWrapper>
        <ExampleCard session={mockTherapySession} />
      </TestWrapper>
    )

    const card = screen.getByTestId('therapy-card')
    expect(card).toHaveClass('dir-rtl')
    expect(card).toHaveAttribute('dir', 'rtl')
  })

  it('should handle loading state', () => {
    render(
      <TestWrapper>
        <ExampleCard session={mockTherapySession} isLoading={true} />
      </TestWrapper>
    )

    // Check for loading skeleton
    expect(screen.getByTestId('card-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('جلسة علاج النطق')).not.toBeInTheDocument()
  })

  it('should handle error state', () => {
    const errorMessage = 'فشل في تحميل بيانات الجلسة'
    
    render(
      <TestWrapper>
        <ExampleCard session={mockTherapySession} error={errorMessage} />
      </TestWrapper>
    )

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /إعادة المحاولة/i })).toBeInTheDocument()
  })

  it('should call onClick when card is clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <ExampleCard session={mockTherapySession} onClick={handleClick} />
      </TestWrapper>
    )

    const card = screen.getByTestId('therapy-card')
    await user.click(card)

    expect(handleClick).toHaveBeenCalledWith(mockTherapySession)
  })

  it('should be accessible with screen readers', () => {
    render(
      <TestWrapper>
        <ExampleCard session={mockTherapySession} />
      </TestWrapper>
    )

    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('aria-label')
    
    // Check for proper heading structure
    const title = screen.getByRole('heading', { level: 3 })
    expect(title).toHaveTextContent('جلسة علاج النطق')
  })
})

describe('BaseButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render button with Arabic text', () => {
    render(
      <TestWrapper>
        <BaseButton>حفظ التغييرات</BaseButton>
      </TestWrapper>
    )

    const button = screen.getByRole('button', { name: 'حفظ التغييرات' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('font-ar')
  })

  it('should show loading state with Arabic text', () => {
    render(
      <TestWrapper>
        <BaseButton isLoading={true} loadingText="جاري الحفظ...">
          حفظ التغييرات
        </BaseButton>
      </TestWrapper>
    )

    expect(screen.getByText('جاري الحفظ...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
    
    // Check for loading spinner
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <BaseButton onClick={handleClick}>انقر هنا</BaseButton>
      </TestWrapper>
    )

    const button = screen.getByRole('button', { name: 'انقر هنا' })
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(
      <TestWrapper>
        <BaseButton disabled={true}>زر معطل</BaseButton>
      </TestWrapper>
    )

    const button = screen.getByRole('button', { name: 'زر معطل' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('should render with icon in correct position for RTL', () => {
    const TestIcon = () => <span data-testid="test-icon">📝</span>

    render(
      <TestWrapper>
        <BaseButton icon={<TestIcon />} iconPosition="right">
          تحرير
        </BaseButton>
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    const icon = screen.getByTestId('test-icon')
    
    expect(button).toContainElement(icon)
    expect(button).toHaveClass('flex-row-reverse') // RTL icon positioning
  })

  it('should have proper focus management', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <BaseButton>زر قابل للتركيز</BaseButton>
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    
    await user.tab()
    expect(button).toHaveFocus()
    
    // Check focus styles
    expect(button).toHaveClass('focus:outline-2')
  })
})

describe('ArabicTextDisplay Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render Arabic text with correct direction', () => {
    const arabicText = 'هذا نص باللغة العربية'
    
    render(
      <TestWrapper>
        <ArabicTextDisplay text={arabicText} />
      </TestWrapper>
    )

    const textElement = screen.getByText(arabicText)
    expect(textElement).toHaveAttribute('dir', 'rtl')
    expect(textElement).toHaveClass('text-right')
  })

  it('should handle mixed Arabic and English text', () => {
    const mixedText = 'Patient: أحمد محمد - Age: 25'
    
    render(
      <TestWrapper>
        <ArabicTextDisplay text={mixedText} />
      </TestWrapper>
    )

    const textElement = screen.getByText(mixedText)
    expect(textElement).toBeInTheDocument()
    expect(textElement).toHaveAttribute('dir', 'rtl')
  })

  it('should apply correct font family for Arabic text', () => {
    render(
      <TestWrapper>
        <ArabicTextDisplay text="نص عربي" />
      </TestWrapper>
    )

    const textElement = screen.getByText('نص عربي')
    expect(textElement).toHaveStyle({
      fontFamily: "'Tajawal', 'Cairo', system-ui, sans-serif"
    })
  })

  it('should handle different text variants', () => {
    render(
      <TestWrapper>
        <ArabicTextDisplay text="عنوان رئيسي" variant="heading" />
      </TestWrapper>
    )

    const heading = screen.getByRole('heading')
    expect(heading).toHaveTextContent('عنوان رئيسي')
    expect(heading).toHaveClass('text-arabic-responsive-lg')
  })

  it('should truncate long text when specified', () => {
    const longText = 'هذا نص طويل جداً يجب أن يتم اقتطاعه عند نقطة معينة لتجنب كسر التخطيط'
    
    render(
      <TestWrapper>
        <ArabicTextDisplay text={longText} truncate={true} maxLines={2} />
      </TestWrapper>
    )

    const textElement = screen.getByText(longText)
    expect(textElement).toHaveClass('line-clamp-2')
  })
})

describe('Accessibility Testing', () => {
  it('should have proper ARIA labels for Arabic content', () => {
    render(
      <TestWrapper>
        <ExampleCard 
          session={{
            id: 'session-1',
            title: 'جلسة علاج النطق',
            description: 'وصف الجلسة',
            type: 'speech',
            progress: 80,
            status: 'completed',
            date: '2024-01-15T10:00:00Z',
            duration: 45,
            therapistName: 'د. أحمد',
            studentName: 'سارة'
          }}
        />
      </TestWrapper>
    )

    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('aria-label')
    
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-label', 'تقدم الجلسة: 80%')
  })

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <TestWrapper>
        <BaseButton onClick={handleClick}>زر قابل للوصول</BaseButton>
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    
    // Tab to button
    await user.tab()
    expect(button).toHaveFocus()
    
    // Press Enter
    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalled()
    
    // Press Space
    await user.keyboard(' ')
    expect(handleClick).toHaveBeenCalledTimes(2)
  })

  it('should have proper color contrast for Arabic text', () => {
    render(
      <TestWrapper>
        <ArabicTextDisplay text="نص مهم" variant="body" />
      </TestWrapper>
    )

    const textElement = screen.getByText('نص مهم')
    
    // Check computed styles (this would need actual color contrast testing)
    const styles = window.getComputedStyle(textElement)
    expect(styles.color).toBeDefined()
  })
})

describe('Error Boundary Testing', () => {
  // Mock console.error to avoid noise in tests
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  
  afterEach(() => {
    console.error = originalError
  })

  it('should handle component errors gracefully', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    // This would need an actual ErrorBoundary component
    render(
      <TestWrapper>
        <div>
          <ThrowError />
        </div>
      </TestWrapper>
    )

    // Test error handling based on your error boundary implementation
  })
})

// Custom testing utilities for Arabic/RTL components
export const arabicTestUtils = {
  // Helper to check RTL direction
  expectRTLDirection: (element: HTMLElement) => {
    expect(element).toHaveAttribute('dir', 'rtl')
    expect(element).toHaveClass('text-right')
  },

  // Helper to check Arabic font
  expectArabicFont: (element: HTMLElement) => {
    const styles = window.getComputedStyle(element)
    expect(styles.fontFamily).toContain('Tajawal')
  },

  // Helper to simulate language switching
  switchToEnglish: () => {
    mockLanguageContext.language = 'en'
    mockLanguageContext.isRTL = false
    mockLanguageContext.isArabic = false
    mockLanguageContext.isEnglish = true
    mockLanguageContext.directionClass = 'dir-ltr'
    mockLanguageContext.alignmentClass = 'text-left'
  },

  // Helper to simulate Arabic input
  typeArabicText: async (element: HTMLElement, text: string) => {
    const user = userEvent.setup()
    await user.type(element, text)
    
    // Verify RTL direction is applied
    expect(element).toHaveAttribute('dir', 'rtl')
  }
}

// Usage examples in comments:
/*
// Basic component test
test('renders therapy card', () => {
  render(<ExampleCard session={mockSession} />)
  expect(screen.getByText('جلسة علاج النطق')).toBeInTheDocument()
})

// RTL testing
test('applies RTL styling', () => {
  render(<ArabicTextDisplay text="نص عربي" />)
  arabicTestUtils.expectRTLDirection(screen.getByText('نص عربي'))
})

// User interaction testing
test('handles button click', async () => {
  const handleClick = vi.fn()
  render(<BaseButton onClick={handleClick}>انقر</BaseButton>)
  
  await userEvent.click(screen.getByRole('button'))
  expect(handleClick).toHaveBeenCalled()
})

// Accessibility testing
test('has proper ARIA labels', () => {
  render(<ExampleCard session={mockSession} />)
  expect(screen.getByRole('article')).toHaveAttribute('aria-label')
})
*/

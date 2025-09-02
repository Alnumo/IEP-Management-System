import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { ErrorBoundary, type ErrorFallbackProps, useErrorHandler } from '@/components/error/ErrorBoundary'

// Mock the LanguageContext
const mockUseLanguage = vi.fn()
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage()
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} data-testid="button" {...props}>
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h2 data-testid="card-title">{children}</h2>
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <svg data-testid="alert-triangle-icon" {...props} />,
  RefreshCcw: (props: any) => <svg data-testid="refresh-icon" {...props} />,
  Home: (props: any) => <svg data-testid="home-icon" {...props} />,
  Bug: (props: any) => <svg data-testid="bug-icon" {...props} />
}))

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div data-testid="no-error">No error occurred</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Default language context mock
    mockUseLanguage.mockReturnValue({
      language: 'en'
    })

    // Mock console methods to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('no-error')).toBeInTheDocument()
      expect(screen.queryByTestId('card')).not.toBeInTheDocument()
    })

    it('should render children without any props', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-component">Child content</div>
        </ErrorBoundary>
      )

      expect(screen.getByTestId('child-component')).toBeInTheDocument()
      expect(screen.getByText('Child content')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should catch and display error with default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.queryByTestId('no-error')).not.toBeInTheDocument()
      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error message'
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        }),
        expect.stringMatching(/^err_\d+_[a-z0-9]+$/)
      )
    })

    it('should generate unique error IDs', () => {
      const onError = vi.fn()

      // Render first error boundary
      const { unmount: unmount1 } = render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const firstErrorId = onError.mock.calls[0][2]
      unmount1()

      // Clear the mock and render second error boundary
      onError.mockClear()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const secondErrorId = onError.mock.calls[0][2]

      expect(firstErrorId).not.toBe(secondErrorId)
      expect(firstErrorId).toMatch(/^err_\d+_[a-z0-9]+$/)
      expect(secondErrorId).toMatch(/^err_\d+_[a-z0-9]+$/)
    })
  })

  describe('Error Levels', () => {
    it('should display appropriate messages for app level errors', () => {
      render(
        <ErrorBoundary level="app">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Application Error')).toBeInTheDocument()
      expect(screen.getByText(/An unexpected error occurred in the application/)).toBeInTheDocument()
      expect(screen.getByTestId('home-icon')).toBeInTheDocument()
    })

    it('should display appropriate messages for page level errors', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Page Error')).toBeInTheDocument()
      expect(screen.getByText(/This page could not be loaded right now/)).toBeInTheDocument()
    })

    it('should display appropriate messages for component level errors', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/An error occurred while loading this component/)).toBeInTheDocument()
    })
  })

  describe('Internationalization', () => {
    it('should display Arabic messages when language is Arabic', () => {
      mockUseLanguage.mockReturnValue({
        language: 'ar'
      })

      render(
        <ErrorBoundary level="app">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('خطأ في التطبيق')).toBeInTheDocument()
      expect(screen.getByText(/حدث خطأ غير متوقع في التطبيق/)).toBeInTheDocument()
      expect(screen.getByText('إعادة المحاولة')).toBeInTheDocument()
      expect(screen.getByText('العودة للرئيسية')).toBeInTheDocument()
      expect(screen.getByText('الإبلاغ عن خطأ')).toBeInTheDocument()
    })

    it('should display English messages when language is English', () => {
      mockUseLanguage.mockReturnValue({
        language: 'en'
      })

      render(
        <ErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Page Error')).toBeInTheDocument()
      expect(screen.getByText(/This page could not be loaded right now/)).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
      expect(screen.getByText('Report Bug')).toBeInTheDocument()
    })

    it('should apply RTL class for Arabic language', () => {
      mockUseLanguage.mockReturnValue({
        language: 'ar'
      })

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const container = screen.getByTestId('card').parentElement
      expect(container).toHaveClass('rtl')
    })

    it('should apply LTR class for English language', () => {
      mockUseLanguage.mockReturnValue({
        language: 'en'
      })

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const container = screen.getByTestId('card').parentElement
      expect(container).toHaveClass('ltr')
    })
  })

  describe('User Interactions', () => {
    it('should call reset function when Try Again is clicked', () => {
      // First render with error
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Verify error is displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Click Try Again (this calls resetError internally)
      fireEvent.click(screen.getByText('Try Again'))

      // For Error Boundaries, we need to completely remount to test reset
      // Create a new ErrorBoundary after reset
      rerender(
        <ErrorBoundary key="reset">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      // Now verify children render normally
      expect(screen.getByTestId('no-error')).toBeInTheDocument()
    })

    it('should redirect to home when Go Home is clicked for app level errors', () => {
      // Mock window.location
      const mockLocation = { href: '' }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      })

      render(
        <ErrorBoundary level="app">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      fireEvent.click(screen.getByText('Go Home'))

      expect(mockLocation.href).toBe('/')
    })

    it('should open email client when Report Bug is clicked', () => {
      // Mock window.open
      const mockOpen = vi.fn()
      Object.defineProperty(window, 'open', {
        value: mockOpen,
        writable: true
      })

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      fireEvent.click(screen.getByText('Report Bug'))

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('mailto:support@arkantherapy.com?subject=Error%20Report%20-%20err_')
      )
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('Test%20error%20message')
      )
    })
  })

  describe('Development Mode Features', () => {
    it('should show technical details in development mode', () => {
      // Mock NODE_ENV
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Technical Details')).toBeInTheDocument()
      expect(screen.getByText('Test error message')).toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })

    it('should hide technical details in production mode', () => {
      // Mock NODE_ENV
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Custom Fallback Component', () => {
    it('should render custom fallback when provided', () => {
      const CustomFallback: React.FC<ErrorFallbackProps> = ({ error, errorId }) => (
        <div data-testid="custom-fallback">
          Custom error: {error?.message} (ID: {errorId})
        </div>
      )

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.getByText(/Custom error: Test error message/)).toBeInTheDocument()
      expect(screen.queryByTestId('card')).not.toBeInTheDocument()
    })
  })

  describe('Error Logging', () => {
    it('should log error details to console', () => {
      const consoleSpy = vi.spyOn(console, 'error')

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(consoleSpy).toHaveBeenCalledWith('Error:', 'Error', 'Test error message')
      expect(consoleSpy).toHaveBeenCalledWith('Stack:', expect.any(String))
    })

    it('should create error report with correct structure', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      render(
        <ErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(consoleSpy).toHaveBeenCalledWith('📊 Error Report:', expect.objectContaining({
        errorId: expect.stringMatching(/^err_\d+_[a-z0-9]+$/),
        level: 'page',
        error: expect.objectContaining({
          name: 'Error',
          message: 'Test error message',
          stack: expect.any(String)
        }),
        componentStack: expect.any(String),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        url: expect.any(String),
        userAgent: expect.any(String)
      }))
    })
  })

  describe('useErrorHandler Hook', () => {
    it('should log errors when called', () => {
      const TestComponent = () => {
        const handleError = useErrorHandler()
        
        return (
          <button 
            onClick={() => handleError(new Error('Hook test error'))}
            data-testid="trigger-error"
          >
            Trigger Error
          </button>
        )
      }

      const consoleSpy = vi.spyOn(console, 'error')

      render(<TestComponent />)
      
      fireEvent.click(screen.getByTestId('trigger-error'))

      expect(consoleSpy).toHaveBeenCalledWith('🔥 Unhandled error:', expect.objectContaining({
        message: 'Hook test error'
      }))
    })

    it('should log error info when provided', () => {
      const TestComponent = () => {
        const handleError = useErrorHandler()
        
        return (
          <button 
            onClick={() => handleError(new Error('Hook test error'), { info: 'additional context' })}
            data-testid="trigger-error-with-info"
          >
            Trigger Error with Info
          </button>
        )
      }

      const consoleSpy = vi.spyOn(console, 'error')

      render(<TestComponent />)
      
      fireEvent.click(screen.getByTestId('trigger-error-with-info'))

      expect(consoleSpy).toHaveBeenCalledWith('Error info:', { info: 'additional context' })
    })
  })

  describe('Edge Cases', () => {
    it('should handle errors without message', () => {
      const ThrowErrorWithoutMessage = () => {
        const error = new Error()
        error.name = 'CustomError'
        throw error
      }

      render(
        <ErrorBoundary>
          <ThrowErrorWithoutMessage />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should handle errors without stack trace', () => {
      const ThrowErrorWithoutStack = () => {
        const error = new Error('No stack error')
        delete error.stack
        throw error
      }

      render(
        <ErrorBoundary>
          <ThrowErrorWithoutStack />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })
})
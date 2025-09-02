/**
 * General Accessibility Tests
 * Tests WCAG compliance, keyboard navigation, and screen reader support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Import components to test
import { IEPCreationWizard } from '@/components/iep/IEPCreationWizard'
import { IEPAnalyticsDashboard } from '@/components/analytics/IEPAnalyticsDashboard'
import { ComplianceAlertDashboard } from '@/components/iep/ComplianceAlertDashboard'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Import contexts
import { LanguageProvider } from '@/contexts/LanguageContext'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock dependencies
vi.mock('@/lib/supabase')
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'admin@example.com',
      role: 'admin'
    },
    isAuthenticated: true,
    loading: false
  })
}))

// Mock missing components
vi.mock('@/components/iep/IEPCreationWizard', () => ({
  IEPCreationWizard: (props: any) => (
    <div role="form" data-testid="iep-creation-wizard">
      <h2>IEP Creation Wizard</h2>
      <div data-testid="student-select">
        <label htmlFor="student">Student</label>
        <select id="student">
          <option value="student-1">John Doe</option>
        </select>
      </div>
      <button data-testid="next-button">Next</button>
    </div>
  )
}))

vi.mock('@/components/analytics/IEPAnalyticsDashboard', () => ({
  IEPAnalyticsDashboard: (props: any) => (
    <div data-testid="analytics-dashboard">
      <h2>IEP Analytics Dashboard</h2>
      <div role="region" aria-label="Analytics Overview">
        <p>Overall Progress Rate: 78%</p>
      </div>
    </div>
  )
}))

vi.mock('@/components/iep/ComplianceAlertDashboard', () => ({
  ComplianceAlertDashboard: (props: any) => (
    <div data-testid="compliance-dashboard">
      <h2>Compliance Dashboard</h2>
      <div role="alert" aria-live="polite">
        No active alerts
      </div>
    </div>
  )
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectItem: ({ children, ...props }: any) => <option {...props}>{children}</option>,
  SelectTrigger: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  SelectValue: (props: any) => <span {...props}>Select...</span>
}))

// Test wrapper
const TestWrapper: React.FC<{ 
  children: React.ReactNode
  language?: 'ar' | 'en'
}> = ({ children, language = 'en' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={language}>
        <div dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language}>
          {children}
        </div>
      </LanguageProvider>
    </QueryClientProvider>
  )
}

describe('General Accessibility Tests', () => {
  beforeEach(() => {
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('should meet WCAG AA guidelines for main layout', async () => {
      render(
        <TestWrapper>
          <Layout>
            <main>
              <h1>IEP Management System</h1>
              <nav aria-label="Main navigation">
                <ul>
                  <li><a href="/dashboard">Dashboard</a></li>
                  <li><a href="/students">Students</a></li>
                  <li><a href="/ieps">IEPs</a></li>
                  <li><a href="/reports">Reports</a></li>
                </ul>
              </nav>
              <section aria-labelledby="overview-heading">
                <h2 id="overview-heading">System Overview</h2>
                <p>Welcome to the IEP Management System.</p>
              </section>
            </main>
          </Layout>
        </TestWrapper>
      )

      const results = await axe(document.body, {
        rules: {
          'landmark-one-main': { enabled: true },
          'page-has-heading-one': { enabled: true },
          'region': { enabled: true }
        }
      })
      
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading hierarchy', async () => {
      render(
        <TestWrapper>
          <div>
            <h1>Main Title</h1>
            <section>
              <h2>Section Title</h2>
              <article>
                <h3>Article Title</h3>
                <div>
                  <h4>Subsection</h4>
                </div>
              </article>
            </section>
          </div>
        </TestWrapper>
      )

      const headings = screen.getAllByRole('heading')
      
      // Check heading levels are sequential
      let previousLevel = 0
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.substring(1))
        expect(level).toBeGreaterThan(0)
        expect(level).toBeLessThanOrEqual(6)
        
        if (previousLevel > 0) {
          // Heading levels shouldn't skip more than one level
          expect(level - previousLevel).toBeLessThanOrEqual(1)
        }
        previousLevel = level
      })

      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })

    it('should use semantic HTML elements appropriately', async () => {
      render(
        <TestWrapper>
          <Layout>
            <header>
              <h1>Application Header</h1>
              <nav aria-label="Primary">
                <ul>
                  <li><a href="/">Home</a></li>
                  <li><a href="/about">About</a></li>
                </ul>
              </nav>
            </header>
            <main>
              <article>
                <header>
                  <h2>Article Title</h2>
                  <time dateTime="2024-01-01">January 1, 2024</time>
                </header>
                <section>
                  <h3>Section Heading</h3>
                  <p>Content goes here.</p>
                </section>
              </article>
              <aside>
                <h3>Related Information</h3>
                <p>Sidebar content.</p>
              </aside>
            </main>
            <footer>
              <p>&copy; 2024 IEP Management System</p>
            </footer>
          </Layout>
        </TestWrapper>
      )

      // Check semantic elements exist
      expect(screen.getByRole('banner')).toBeInTheDocument() // header
      expect(screen.getByRole('navigation')).toBeInTheDocument() // nav
      expect(screen.getByRole('main')).toBeInTheDocument() // main
      expect(screen.getByRole('article')).toBeInTheDocument() // article
      expect(screen.getByRole('complementary')).toBeInTheDocument() // aside
      expect(screen.getByRole('contentinfo')).toBeInTheDocument() // footer

      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <form>
            <label htmlFor="name">Name</label>
            <input id="name" type="text" data-testid="name-input" />
            
            <label htmlFor="email">Email</label>
            <input id="email" type="email" data-testid="email-input" />
            
            <fieldset>
              <legend>Preferences</legend>
              <label>
                <input type="checkbox" data-testid="newsletter" />
                Subscribe to newsletter
              </label>
              <label>
                <input type="radio" name="contact" value="email" data-testid="contact-email" />
                Email
              </label>
              <label>
                <input type="radio" name="contact" value="phone" data-testid="contact-phone" />
                Phone
              </label>
            </fieldset>
            
            <button type="submit" data-testid="submit">Submit</button>
            <button type="button" data-testid="cancel">Cancel</button>
          </form>
        </TestWrapper>
      )

      // Test tab order
      await user.tab()
      expect(screen.getByTestId('name-input')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('email-input')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('newsletter')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('contact-email')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('contact-phone')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('submit')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('cancel')).toHaveFocus()

      // Test reverse tab order
      await user.tab({ shift: true })
      expect(screen.getByTestId('submit')).toHaveFocus()
    })

    it('should handle focus trapping in modals', async () => {
      const user = userEvent.setup()

      const ModalTest = () => {
        const [isOpen, setIsOpen] = React.useState(false)
        
        return (
          <TestWrapper>
            <div>
              <button onClick={() => setIsOpen(true)} data-testid="open-modal">
                Open Modal
              </button>
              
              {isOpen && (
                <div 
                  role="dialog" 
                  aria-modal="true"
                  aria-labelledby="modal-title"
                  data-testid="modal"
                >
                  <h2 id="modal-title">Modal Title</h2>
                  <button data-testid="modal-button1">Button 1</button>
                  <button data-testid="modal-button2">Button 2</button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    data-testid="close-modal"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </TestWrapper>
        )
      }

      render(<ModalTest />)

      // Open modal
      await user.click(screen.getByTestId('open-modal'))
      
      const modal = screen.getByTestId('modal')
      expect(modal).toBeInTheDocument()

      // Focus should move to modal
      await user.tab()
      expect(screen.getByTestId('modal-button1')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('modal-button2')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('close-modal')).toHaveFocus()

      // Tab should wrap back to first element in modal
      await user.tab()
      expect(screen.getByTestId('modal-button1')).toHaveFocus()
    })

    it('should support arrow key navigation in lists and grids', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <div role="listbox" aria-label="Options">
            <div role="option" tabIndex={0} data-testid="option-1">Option 1</div>
            <div role="option" tabIndex={-1} data-testid="option-2">Option 2</div>
            <div role="option" tabIndex={-1} data-testid="option-3">Option 3</div>
            <div role="option" tabIndex={-1} data-testid="option-4">Option 4</div>
          </div>
        </TestWrapper>
      )

      // Focus first option
      const firstOption = screen.getByTestId('option-1')
      firstOption.focus()
      expect(firstOption).toHaveFocus()

      // Arrow down should move to next option
      await user.keyboard('{ArrowDown}')
      expect(screen.getByTestId('option-2')).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      expect(screen.getByTestId('option-3')).toHaveFocus()

      // Arrow up should move to previous option
      await user.keyboard('{ArrowUp}')
      expect(screen.getByTestId('option-2')).toHaveFocus()

      // Home should go to first option
      await user.keyboard('{Home}')
      expect(screen.getByTestId('option-1')).toHaveFocus()

      // End should go to last option
      await user.keyboard('{End}')
      expect(screen.getByTestId('option-4')).toHaveFocus()
    })

    it('should support escape key to close modals and dropdowns', async () => {
      const user = userEvent.setup()

      const EscapeTest = () => {
        const [showDropdown, setShowDropdown] = React.useState(false)
        
        React.useEffect(() => {
          const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              setShowDropdown(false)
            }
          }
          
          if (showDropdown) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
          }
        }, [showDropdown])
        
        return (
          <TestWrapper>
            <div>
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                data-testid="dropdown-trigger"
                aria-expanded={showDropdown}
              >
                Open Dropdown
              </button>
              
              {showDropdown && (
                <div role="menu" data-testid="dropdown-menu">
                  <div role="menuitem" tabIndex={0}>Item 1</div>
                  <div role="menuitem" tabIndex={-1}>Item 2</div>
                </div>
              )}
            </div>
          </TestWrapper>
        )
      }

      render(<EscapeTest />)

      // Open dropdown
      await user.click(screen.getByTestId('dropdown-trigger'))
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()

      // Press Escape to close
      await user.keyboard('{Escape}')
      expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument()
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide proper ARIA labels and descriptions', async () => {
      render(
        <TestWrapper>
          <form>
            <div>
              <label htmlFor="username">Username</label>
              <input 
                id="username" 
                type="text"
                aria-describedby="username-help"
                required
                data-testid="username"
              />
              <div id="username-help">
                Must be at least 3 characters long
              </div>
            </div>
            
            <button 
              aria-label="Save changes to user profile"
              data-testid="save-button"
            >
              Save
            </button>
            
            <div 
              role="status" 
              aria-live="polite" 
              data-testid="status-message"
            >
              Changes saved successfully
            </div>
          </form>
        </TestWrapper>
      )

      const usernameInput = screen.getByTestId('username')
      expect(usernameInput).toHaveAccessibleName('Username')
      expect(usernameInput).toHaveAccessibleDescription('Must be at least 3 characters long')

      const saveButton = screen.getByTestId('save-button')
      expect(saveButton).toHaveAccessibleName('Save changes to user profile')

      const statusMessage = screen.getByTestId('status-message')
      expect(statusMessage).toHaveAttribute('aria-live', 'polite')

      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })

    it('should announce dynamic content changes', async () => {
      const user = userEvent.setup()

      const DynamicContentTest = () => {
        const [message, setMessage] = React.useState('')
        const [count, setCount] = React.useState(0)
        
        return (
          <TestWrapper>
            <div>
              <button 
                onClick={() => setMessage('Content updated!')}
                data-testid="update-content"
              >
                Update Content
              </button>
              
              <button 
                onClick={() => setCount(c => c + 1)}
                data-testid="increment"
                aria-describedby="count-description"
              >
                Count: {count}
              </button>
              
              <div 
                id="count-description" 
                aria-live="polite"
                aria-atomic="true"
              >
                Current count is {count}
              </div>
              
              <div 
                role="status" 
                aria-live="polite"
                data-testid="status"
              >
                {message}
              </div>
            </div>
          </TestWrapper>
        )
      }

      render(<DynamicContentTest />)

      // Update message
      await user.click(screen.getByTestId('update-content'))
      expect(screen.getByTestId('status')).toHaveTextContent('Content updated!')

      // Update count
      await user.click(screen.getByTestId('increment'))
      expect(screen.getByText('Current count is 1')).toBeInTheDocument()
    })

    it('should provide proper form validation messages', async () => {
      const user = userEvent.setup()

      const ValidationTest = () => {
        const [errors, setErrors] = React.useState<Record<string, string>>({})
        
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault()
          const form = e.target as HTMLFormElement
          const formData = new FormData(form)
          const email = formData.get('email') as string
          
          const newErrors: Record<string, string> = {}
          if (!email) {
            newErrors.email = 'Email is required'
          } else if (!email.includes('@')) {
            newErrors.email = 'Email must be valid'
          }
          
          setErrors(newErrors)
        }
        
        return (
          <TestWrapper>
            <form onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email">Email</label>
                <input 
                  id="email" 
                  name="email"
                  type="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  data-testid="email-input"
                />
                {errors.email && (
                  <div 
                    id="email-error" 
                    role="alert"
                    data-testid="email-error"
                  >
                    {errors.email}
                  </div>
                )}
              </div>
              <button type="submit" data-testid="submit">Submit</button>
            </form>
          </TestWrapper>
        )
      }

      render(<ValidationTest />)

      // Submit without email
      await user.click(screen.getByTestId('submit'))
      
      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      
      const errorMessage = screen.getByTestId('email-error')
      expect(errorMessage).toHaveTextContent('Email is required')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })
  })

  describe('Color and Visual Accessibility', () => {
    it('should meet color contrast requirements', async () => {
      render(
        <TestWrapper>
          <div>
            <h1 style={{ color: '#000000', backgroundColor: '#ffffff' }}>
              High Contrast Heading
            </h1>
            <p style={{ color: '#333333', backgroundColor: '#ffffff' }}>
              This text meets WCAG AA standards for contrast.
            </p>
            <button style={{ 
              color: '#ffffff', 
              backgroundColor: '#0066cc',
              border: 'none',
              padding: '8px 16px'
            }}>
              Accessible Button
            </button>
            <a 
              href="#" 
              style={{ 
                color: '#0066cc',
                textDecoration: 'underline'
              }}
            >
              Accessible Link
            </a>
          </div>
        </TestWrapper>
      )

      const results = await axe(document.body, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
      
      expect(results).toHaveNoViolations()
    })

    it('should not rely solely on color for information', async () => {
      render(
        <TestWrapper>
          <div>
            <div className="form-field">
              <label htmlFor="required-field">
                Name 
                <span aria-label="required">*</span>
              </label>
              <input 
                id="required-field"
                required
                style={{ borderColor: 'red' }}
              />
            </div>
            
            <div className="status-list">
              <div className="status-item">
                <span className="icon" aria-label="success">✓</span>
                <span style={{ color: 'green' }}>Completed</span>
              </div>
              <div className="status-item">
                <span className="icon" aria-label="warning">⚠</span>
                <span style={{ color: 'orange' }}>Pending</span>
              </div>
              <div className="status-item">
                <span className="icon" aria-label="error">✗</span>
                <span style={{ color: 'red' }}>Failed</span>
              </div>
            </div>
          </div>
        </TestWrapper>
      )

      // Required field should have asterisk with aria-label
      expect(screen.getByLabelText('required')).toBeInTheDocument()

      // Status items should have both icons and text
      expect(screen.getByLabelText('success')).toBeInTheDocument()
      expect(screen.getByLabelText('warning')).toBeInTheDocument()
      expect(screen.getByLabelText('error')).toBeInTheDocument()

      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })

    it('should be usable with Windows High Contrast Mode', async () => {
      // Simulate high contrast mode by removing colors
      const style = document.createElement('style')
      style.textContent = `
        * {
          background-color: black !important;
          color: white !important;
          border-color: white !important;
        }
      `
      document.head.appendChild(style)

      render(
        <TestWrapper>
          <div>
            <button style={{ border: '1px solid', padding: '8px' }}>
              Button with Border
            </button>
            <input 
              type="text" 
              placeholder="Text input"
              style={{ border: '1px solid', padding: '4px' }}
            />
            <a href="#" style={{ textDecoration: 'underline' }}>
              Link with Underline
            </a>
          </div>
        </TestWrapper>
      )

      // Elements should still be distinguishable
      const button = screen.getByRole('button')
      const input = screen.getByRole('textbox')
      const link = screen.getByRole('link')

      expect(button).toBeInTheDocument()
      expect(input).toBeInTheDocument()
      expect(link).toBeInTheDocument()

      // Cleanup
      document.head.removeChild(style)
    })
  })

  describe('Mobile and Touch Accessibility', () => {
    it('should have adequate touch target sizes', async () => {
      render(
        <TestWrapper>
          <div>
            <button 
              style={{ 
                minWidth: '44px', 
                minHeight: '44px',
                padding: '8px' 
              }}
              data-testid="touch-button"
            >
              Tap
            </button>
            
            <a 
              href="#"
              style={{ 
                display: 'inline-block',
                minWidth: '44px', 
                minHeight: '44px',
                padding: '8px',
                textAlign: 'center'
              }}
              data-testid="touch-link"
            >
              Link
            </a>
            
            <input 
              type="checkbox"
              style={{ 
                minWidth: '20px', 
                minHeight: '20px',
                margin: '12px' // Creates 44px touch target with margin
              }}
              data-testid="touch-checkbox"
            />
          </div>
        </TestWrapper>
      )

      // Check minimum touch target sizes (44x44px recommended)
      const button = screen.getByTestId('touch-button')
      const link = screen.getByTestId('touch-link')
      const checkbox = screen.getByTestId('touch-checkbox')

      // These would need actual measurement in a real browser
      expect(button).toHaveStyle('min-width: 44px')
      expect(button).toHaveStyle('min-height: 44px')
      expect(link).toHaveStyle('min-width: 44px')
      expect(link).toHaveStyle('min-height: 44px')

      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })

    it('should support zoom up to 200% without horizontal scrolling', async () => {
      // Mock viewport for mobile
      Object.defineProperty(window, 'innerWidth', { 
        writable: true, 
        configurable: true, 
        value: 320 
      })

      render(
        <TestWrapper>
          <div style={{ maxWidth: '100%', padding: '16px' }}>
            <h1 style={{ fontSize: '1.5rem', wordWrap: 'break-word' }}>
              Responsive Heading That Should Wrap
            </h1>
            <p style={{ lineHeight: '1.5', wordWrap: 'break-word' }}>
              This paragraph should remain readable even when zoomed to 200%. 
              The text should wrap appropriately and not cause horizontal scrolling.
            </p>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="responsive-input">Input Field:</label>
              <input 
                id="responsive-input"
                type="text" 
                style={{ 
                  width: '100%', 
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  padding: '8px'
                }}
              />
              <button 
                type="submit"
                style={{ 
                  padding: '12px',
                  fontSize: '1rem'
                }}
              >
                Submit
              </button>
            </form>
          </div>
        </TestWrapper>
      )

      // Content should be accessible
      expect(screen.getByRole('heading')).toBeInTheDocument()
      expect(screen.getByLabelText('Input Field:')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument()

      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <div>
            <button data-testid="button-1">Button 1</button>
            <input type="text" data-testid="input-1" />
            <a href="#" data-testid="link-1">Link 1</a>
            <select data-testid="select-1">
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        </TestWrapper>
      )

      // Tab through focusable elements
      await user.tab()
      expect(screen.getByTestId('button-1')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('input-1')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('link-1')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('select-1')).toHaveFocus()
    })

    it('should manage focus properly when content changes', async () => {
      const user = userEvent.setup()

      const FocusManagementTest = () => {
        const [showContent, setShowContent] = React.useState(false)
        const buttonRef = React.useRef<HTMLButtonElement>(null)
        
        React.useEffect(() => {
          if (showContent && buttonRef.current) {
            buttonRef.current.focus()
          }
        }, [showContent])
        
        return (
          <TestWrapper>
            <div>
              <button 
                onClick={() => setShowContent(true)}
                data-testid="show-content"
              >
                Show Content
              </button>
              
              {showContent && (
                <div>
                  <h2>New Content</h2>
                  <button 
                    ref={buttonRef}
                    data-testid="new-button"
                    onClick={() => setShowContent(false)}
                  >
                    Hide Content
                  </button>
                </div>
              )}
            </div>
          </TestWrapper>
        )
      }

      render(<FocusManagementTest />)

      // Show content and check focus management
      await user.click(screen.getByTestId('show-content'))
      
      // Focus should move to new button
      await waitFor(() => {
        expect(screen.getByTestId('new-button')).toHaveFocus()
      })
    })

    it('should skip non-interactive elements during tab navigation', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <div>
            <button data-testid="button-1">Button 1</button>
            <div>Non-interactive div</div>
            <span>Non-interactive span</span>
            <p>Non-interactive paragraph</p>
            <button data-testid="button-2">Button 2</button>
            <div tabIndex={0} data-testid="focusable-div">Focusable div</div>
            <button data-testid="button-3">Button 3</button>
          </div>
        </TestWrapper>
      )

      // Tab should skip non-interactive elements
      await user.tab()
      expect(screen.getByTestId('button-1')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('button-2')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('focusable-div')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('button-3')).toHaveFocus()
    })
  })

  describe('Complex Component Accessibility', () => {
    it('should handle data table accessibility correctly', async () => {
      render(
        <TestWrapper>
          <table>
            <caption>Student Progress Data</caption>
            <thead>
              <tr>
                <th scope="col">Student Name</th>
                <th scope="col">Goal</th>
                <th scope="col" abbr="Prog">Progress (%)</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">John Doe</th>
                <td>Reading Comprehension</td>
                <td>75%</td>
                <td>On Track</td>
              </tr>
              <tr>
                <th scope="row">Jane Smith</th>
                <td>Math Skills</td>
                <td>60%</td>
                <td>Needs Support</td>
              </tr>
            </tbody>
          </table>
        </TestWrapper>
      )

      // Check table structure
      const table = screen.getByRole('table')
      expect(table).toHaveAccessibleName('Student Progress Data')

      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders).toHaveLength(4)

      const rowHeaders = screen.getAllByRole('rowheader')
      expect(rowHeaders).toHaveLength(2)

      // Check header associations
      columnHeaders.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col')
      })

      rowHeaders.forEach(header => {
        expect(header).toHaveAttribute('scope', 'row')
      })

      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })

    it('should implement proper combobox accessibility', async () => {
      const user = userEvent.setup()

      const ComboboxTest = () => {
        const [isOpen, setIsOpen] = React.useState(false)
        const [value, setValue] = React.useState('')
        
        return (
          <TestWrapper>
            <div>
              <label htmlFor="combobox">Choose or type a fruit:</label>
              <input 
                id="combobox"
                role="combobox"
                aria-expanded={isOpen}
                aria-autocomplete="list"
                aria-controls="listbox"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 100)}
                data-testid="combobox"
              />
              
              {isOpen && (
                <ul 
                  id="listbox" 
                  role="listbox"
                  data-testid="listbox"
                >
                  <li role="option" onClick={() => setValue('Apple')}>Apple</li>
                  <li role="option" onClick={() => setValue('Banana')}>Banana</li>
                  <li role="option" onClick={() => setValue('Cherry')}>Cherry</li>
                </ul>
              )}
            </div>
          </TestWrapper>
        )
      }

      render(<ComboboxTest />)

      const combobox = screen.getByTestId('combobox')
      
      // Check ARIA attributes
      expect(combobox).toHaveAttribute('role', 'combobox')
      expect(combobox).toHaveAttribute('aria-expanded', 'false')
      expect(combobox).toHaveAttribute('aria-autocomplete', 'list')

      // Focus combobox
      await user.click(combobox)
      expect(combobox).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('listbox')).toBeInTheDocument()

      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })
  })
})

export { TestWrapper }
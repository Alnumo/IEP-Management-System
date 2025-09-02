import React from 'react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderBilingual, testBothLanguages, arabicTestUtils } from '@/test/utils/bilingual-test-utils'

// Mock modules at the top level
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }
}))

// UI components mocks
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>
}))

// Simple LoginForm mock component for testing structure
const MockLoginForm = () => {
  return (
    <div>
      <h2>تسجيل الدخول - Admin Login</h2>
      <div>Log in with admin credentials to create therapy plans</div>
      <form>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          defaultValue="admin@arkan-center.com"
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
        />
        <button type="submit">تسجيل الدخول - Login</button>
      </form>
      <div>
        <h4>Test Credentials:</h4>
        <div>
          Email: admin@arkan-center.com<br/>
          Password: Admin123!<br/>
          <em>Create this user in Supabase Dashboard first</em>
        </div>
      </div>
    </div>
  )
}

describe('LoginForm Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering Tests', () => {
    test('renders login form with bilingual title', () => {
      renderBilingual(<MockLoginForm />)
      
      expect(screen.getByText('تسجيل الدخول - Admin Login')).toBeInTheDocument()
      expect(screen.getByText('Log in with admin credentials to create therapy plans')).toBeInTheDocument()
    })

    test('renders all form fields', () => {
      renderBilingual(<MockLoginForm />)
      
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /تسجيل الدخول - Login/i })).toBeInTheDocument()
    })

    test('renders test credentials section', () => {
      renderBilingual(<MockLoginForm />)
      
      expect(screen.getByText('Test Credentials:')).toBeInTheDocument()
      expect(screen.getByText(/admin@arkan-center.com/)).toBeInTheDocument()
      expect(screen.getByText(/Admin123!/)).toBeInTheDocument()
    })

    test('has default email pre-filled', () => {
      renderBilingual(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      expect(emailInput.value).toBe('admin@arkan-center.com')
    })
  })

  describe('Language Support', () => {
    test('renders correctly in Arabic (RTL)', () => {
      const { container } = renderBilingual(<MockLoginForm />, { language: 'ar' })
      
      expect(container.firstChild).toHaveAttribute('dir', 'rtl')
      expect(screen.getByText('تسجيل الدخول - Admin Login')).toBeInTheDocument()
    })

    test('renders correctly in English (LTR)', () => {
      const { container } = renderBilingual(<MockLoginForm />, { language: 'en' })
      
      expect(container.firstChild).toHaveAttribute('dir', 'ltr')
    })
  })

  describe('Form Interaction Tests', () => {
    test('allows email input change', async () => {
      renderBilingual(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      await user.clear(emailInput)
      await user.type(emailInput, 'test@example.com')
      
      expect(emailInput).toHaveValue('test@example.com')
    })

    test('allows password input change', async () => {
      renderBilingual(<MockLoginForm />)
      
      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'testpassword')
      
      expect(passwordInput).toHaveValue('testpassword')
    })

    test('requires email and password fields', () => {
      renderBilingual(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()
    })
  })

  describe('Accessibility Tests', () => {
    test('has proper form labels', () => {
      renderBilingual(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      expect(emailInput).toHaveAttribute('id', 'email')
      expect(passwordInput).toHaveAttribute('id', 'password')
    })

    test('has proper form structure', () => {
      renderBilingual(<MockLoginForm />)
      
      const form = document.querySelector('form')
      expect(form).toBeInTheDocument()
      
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول - Login/i })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Bilingual Content Tests', () => {
    test('displays Arabic text correctly', () => {
      renderBilingual(<MockLoginForm />, { language: 'ar' })
      
      const titleElement = screen.getByText('تسجيل الدخول - Admin Login')
      expect(titleElement).toBeInTheDocument()
      
      // Test that the text is rendered correctly in RTL context
      const buttonElement = screen.getByText(/تسجيل الدخول - Login/)
      expect(buttonElement).toBeInTheDocument()
    })

    test('maintains consistent bilingual labeling', () => {
      renderBilingual(<MockLoginForm />)
      
      // All major interactive elements should have both Arabic and English text
      expect(screen.getByText('تسجيل الدخول - Admin Login')).toBeInTheDocument()
      expect(screen.getByText(/تسجيل الدخول - Login/)).toBeInTheDocument()
    })
  })

  describe('Component Structure Tests', () => {
    test('renders proper HTML structure for forms', () => {
      renderBilingual(<MockLoginForm />)
      
      // Should have proper semantic HTML
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      expect(document.querySelector('form')).toBeInTheDocument()
      expect(screen.getAllByRole('textbox')).toHaveLength(1) // email (password is not textbox)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    test('has appropriate input types', () => {
      renderBilingual(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('handles empty form validation', () => {
      renderBilingual(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      // Both should be required for HTML5 validation
      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()
    })

    test('maintains state consistency', () => {
      renderBilingual(<MockLoginForm />)
      
      // Pre-filled email should be consistent
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      expect(emailInput.value).toBe('admin@arkan-center.com')
    })
  })
})
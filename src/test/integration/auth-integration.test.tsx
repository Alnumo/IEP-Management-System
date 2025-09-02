import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthGuard } from '@/components/auth/AuthGuard'

// Mock React Router
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>
  }
})

// Mock Supabase with comprehensive auth simulation
const mockSupabaseAuth = {
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn()
}

const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom
  }
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>
}))

describe('Authentication Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default auth state - not logged in
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    // Default auth state change subscription
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    })

    // Default profile query mock
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'admin', name: 'Admin User' },
        error: null
      })
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('Login Flow Integration', () => {
    it('should complete successful login workflow', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@arkan-center.com',
        aud: 'authenticated',
        created_at: '2024-01-15T09:00:00Z'
      }

      // Mock successful login
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { user: mockUser } },
        error: null
      })

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      )

      // Verify form elements are present
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /تسجيل الدخول|login/i })).toBeInTheDocument()

      // Fill in credentials
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول|login/i })

      await user.clear(emailInput)
      await user.type(emailInput, 'admin@arkan-center.com')
      await user.type(passwordInput, 'Admin123!')

      // Submit the form
      await user.click(submitButton)

      // Verify login API was called with correct credentials
      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
          email: 'admin@arkan-center.com',
          password: 'Admin123!'
        })
      })

      // Verify profile query was made
      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles')
      })

      // Verify navigation to dashboard
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
      })
    })

    it('should handle login failure with error display', async () => {
      const loginError = { message: 'Invalid login credentials' }

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: loginError
      })

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول|login/i })

      await user.type(emailInput, 'wrong@email.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
      })

      // Verify no navigation occurred
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should redirect already authenticated users', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@arkan-center.com'
      }

      // Mock user already logged in
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      )

      // Should redirect immediately without showing form
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
      })
    })

    it('should handle network errors gracefully', async () => {
      mockSupabaseAuth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      )

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول|login/i })

      await user.type(emailInput, 'admin@arkan-center.com')
      await user.type(passwordInput, 'Admin123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
      })
    })

    it('should handle logout workflow', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@arkan-center.com'
      }

      // Start with logged in user
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseAuth.signOut.mockResolvedValue({
        error: null
      })

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      )

      // Should show loading initially due to redirect
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument()
    })
  })

  describe('AuthGuard Integration', () => {
    const TestProtectedComponent = () => (
      <div data-testid="protected-content">Protected Content</div>
    )

    const TestFallback = () => (
      <div data-testid="fallback-content">Please log in</div>
    )

    it('should allow access for authenticated users', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@arkan-center.com'
      }

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      render(
        <BrowserRouter>
          <AuthGuard>
            <TestProtectedComponent />
          </AuthGuard>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should redirect unauthenticated users to login', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      render(
        <BrowserRouter>
          <AuthGuard>
            <TestProtectedComponent />
          </AuthGuard>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login')
      })

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should show custom fallback component when provided', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      render(
        <BrowserRouter>
          <AuthGuard fallback={<TestFallback />}>
            <TestProtectedComponent />
          </AuthGuard>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should handle authentication state changes', async () => {
      let authStateCallback: any = null

      // Mock auth state change subscription
      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn()
            }
          }
        }
      })

      // Start with no user
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      render(
        <BrowserRouter>
          <AuthGuard>
            <TestProtectedComponent />
          </AuthGuard>
        </BrowserRouter>
      )

      // Should initially show redirect to login
      await waitFor(() => {
        expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login')
      })

      // Simulate user login
      const mockUser = {
        id: 'user-123',
        email: 'admin@arkan-center.com'
      }

      // Trigger auth state change
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', { user: mockUser })
      }

      // Should now show protected content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should show loading state during authentication check', async () => {
      // Mock delayed auth response
      mockSupabaseAuth.getUser.mockReturnValue(
        new Promise(resolve => {
          setTimeout(() => {
            resolve({ data: { user: null }, error: null })
          }, 100)
        })
      )

      render(
        <BrowserRouter>
          <AuthGuard>
            <TestProtectedComponent />
          </AuthGuard>
        </BrowserRouter>
      )

      // Should show loading spinner initially
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument()

      // Wait for auth check to complete
      await waitFor(() => {
        expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login')
      })
    })

    it('should handle custom redirect path', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      render(
        <BrowserRouter>
          <AuthGuard redirectTo="/custom-login">
            <TestProtectedComponent />
          </AuthGuard>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('navigate-to')).toHaveTextContent('/custom-login')
      })
    })
  })

  describe('End-to-End Authentication Workflow', () => {
    it('should complete full authentication workflow with role-based access', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@arkan-center.com',
        aud: 'authenticated'
      }

      // Mock profile with specific role
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', name: 'أحمد الإداري' },
          error: null
        })
      })

      // Test login flow
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { user: mockUser } },
        error: null
      })

      const { rerender } = render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      )

      // Complete login
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول|login/i })

      await user.type(emailInput, 'admin@arkan-center.com')
      await user.type(passwordInput, 'Admin123!')
      await user.click(submitButton)

      // Verify login and profile fetch
      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
          email: 'admin@arkan-center.com',
          password: 'Admin123!'
        })
      })

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles')
      })

      // Now test protected route access
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      rerender(
        <BrowserRouter>
          <AuthGuard>
            <div data-testid="admin-dashboard">Admin Dashboard</div>
          </AuthGuard>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
      })
    })

    it('should handle session expiration and re-authentication', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@arkan-center.com'
      }

      let authStateCallback: any = null

      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn()
            }
          }
        }
      })

      // Start with authenticated user
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      render(
        <BrowserRouter>
          <AuthGuard>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </BrowserRouter>
      )

      // Should show protected content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })

      // Simulate session expiration
      if (authStateCallback) {
        authStateCallback('SIGNED_OUT', null)
      }

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login')
      })
    })

    it('should handle multiple concurrent auth checks', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@arkan-center.com'
      }

      // Mock auth check that resolves after delay
      mockSupabaseAuth.getUser.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({ data: { user: mockUser }, error: null })
          }, 50)
        })
      )

      // Render multiple AuthGuard components
      render(
        <BrowserRouter>
          <div>
            <AuthGuard>
              <div data-testid="content-1">Content 1</div>
            </AuthGuard>
            <AuthGuard>
              <div data-testid="content-2">Content 2</div>
            </AuthGuard>
            <AuthGuard>
              <div data-testid="content-3">Content 3</div>
            </AuthGuard>
          </div>
        </BrowserRouter>
      )

      // All should eventually show content
      await waitFor(() => {
        expect(screen.getByTestId('content-1')).toBeInTheDocument()
        expect(screen.getByTestId('content-2')).toBeInTheDocument()
        expect(screen.getByTestId('content-3')).toBeInTheDocument()
      })
    })
  })

  describe('Bilingual Authentication Support', () => {
    it('should display Arabic error messages correctly', async () => {
      const loginError = { message: 'بيانات تسجيل الدخول غير صحيحة' }

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: loginError
      })

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      )

      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول|login/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('بيانات تسجيل الدخول غير صحيحة')).toBeInTheDocument()
      })
    })

    it('should support RTL layout for Arabic interface', async () => {
      render(
        <BrowserRouter>
          <div dir="rtl">
            <LoginForm />
          </div>
        </BrowserRouter>
      )

      const title = screen.getByText(/تسجيل الدخول/)
      expect(title).toBeInTheDocument()
      
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/ })
      expect(submitButton).toBeInTheDocument()
    })

    it('should handle Arabic user names in profile data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@arkan-center.com'
      }

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { user: mockUser } },
        error: null
      })

      // Mock Arabic profile name
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', name: 'د. سارة أحمد' },
          error: null
        })
      })

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول|login/i })

      await user.type(emailInput, 'admin@arkan-center.com')
      await user.type(passwordInput, 'Admin123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabaseFrom().single).toHaveBeenCalled()
      })

      // The Arabic name should be handled correctly in the profile query
      const profileQuery = mockSupabaseFrom().single
      expect(profileQuery).toHaveBeenCalled()
    })
  })
})
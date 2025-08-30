import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'

// Mock the auth utils
vi.mock('@/lib/auth-utils', () => ({
  checkAuth: vi.fn(),
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  },
}))

// Mock react-router-dom Navigate component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">Redirecting to {to}</div>,
  }
})

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', async () => {
    const { checkAuth } = await import('@/lib/auth-utils')
    
    // Mock checkAuth to never resolve to simulate loading
    vi.mocked(checkAuth).mockImplementation(() => new Promise(() => {}))

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    )

    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should render children when user is authenticated', async () => {
    const { checkAuth } = await import('@/lib/auth-utils')
    const mockUser = { id: 'test-user-id', email: 'test@example.com' }
    
    vi.mocked(checkAuth).mockResolvedValue(mockUser)

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('should redirect to login when user is not authenticated', async () => {
    const { checkAuth } = await import('@/lib/auth-utils')
    
    vi.mocked(checkAuth).mockResolvedValue(null)

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toHaveTextContent('Redirecting to /login')
    })
  })

  it('should show fallback when provided and user not authenticated', async () => {
    const { checkAuth } = await import('@/lib/auth-utils')
    
    vi.mocked(checkAuth).mockResolvedValue(null)

    render(
      <MemoryRouter>
        <AuthGuard fallback={<div>Please login</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Please login')).toBeInTheDocument()
    })
  })
})
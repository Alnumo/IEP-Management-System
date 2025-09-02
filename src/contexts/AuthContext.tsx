import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { AuthenticatedUser, UserRole } from '@/lib/auth-utils'
import { 
  requireAuthWithRole,
  checkAuth,
  is2FARequiredForUser,
  is2FAEnabledForUser,
  check2FASessionVerification,
  needs2FAVerification
} from '@/lib/auth-utils'

interface AuthContextType {
  user: AuthenticatedUser | null
  isLoading: boolean
  isAuthenticated: boolean
  role: UserRole | null
  parentProfile: {
    id: string
    student_id: string
    preferred_language: 'ar' | 'en'
  } | null
  requires2FA: boolean
  is2FAVerified: boolean
  needs2FAVerification: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  checkPermission: (resource: string, action: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [requires2FA, setRequires2FA] = useState(false)
  const [is2FAVerified, setIs2FAVerified] = useState(false)
  const [needs2FAVerificationState, setNeeds2FAVerificationState] = useState(false)

  // Load user data and 2FA status
  const loadUser = async () => {
    try {
      setIsLoading(true)
      const authUser = await checkAuth()
      
      if (authUser) {
        const userWithRole = await requireAuthWithRole()
        setUser(userWithRole)

        // Check 2FA requirements
        const requires2fa = await is2FARequiredForUser(userWithRole)
        const is2faEnabled = await is2FAEnabledForUser(userWithRole)
        const is2faVerified = await check2FASessionVerification(userWithRole.id)
        const needsVerification = await needs2FAVerification(userWithRole)

        setRequires2FA(requires2fa)
        setIs2FAVerified(is2faVerified && is2faEnabled)
        setNeeds2FAVerificationState(needsVerification)
      } else {
        setUser(null)
        setRequires2FA(false)
        setIs2FAVerified(false)
        setNeeds2FAVerificationState(false)
      }
    } catch (error) {
      console.error('Error loading user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize auth state
  useEffect(() => {
    loadUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setRequires2FA(false)
        setIs2FAVerified(false)
        setNeeds2FAVerificationState(false)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      await loadUser()
      return {}
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign in failed' }
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
    } catch (error) {
      console.error('Error during sign out:', error)
    }
  }

  const refreshUser = async (): Promise<void> => {
    await loadUser()
  }

  // Basic permission check (can be extended)
  const checkPermission = (resource: string, action: string): boolean => {
    if (!user || !user.role) return false

    // Admin has all permissions
    if (user.role === 'admin') return true

    // Manager has most permissions
    if (user.role === 'manager') {
      return !['user_management', 'system_settings'].includes(resource)
    }

    // Parent permissions
    if (user.role === 'parent') {
      const allowedResources = ['own_child_data', 'messaging', 'home_programs', 'documents']
      return allowedResources.includes(resource) && ['read', 'update'].includes(action)
    }

    // Therapist permissions
    if (user.role === 'therapist_lead') {
      const allowedResources = ['students', 'therapy_sessions', 'assessments', 'progress_tracking']
      return allowedResources.includes(resource) && ['read', 'create', 'update'].includes(action)
    }

    // Receptionist permissions
    if (user.role === 'receptionist') {
      const allowedResources = ['appointments', 'basic_student_info', 'attendance']
      return allowedResources.includes(resource) && ['read', 'create', 'update'].includes(action)
    }

    return false
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    role: user?.role || null,
    parentProfile: user?.parent_profile || null,
    requires2FA,
    is2FAVerified,
    needs2FAVerification: needs2FAVerificationState,
    signIn,
    signOut,
    refreshUser,
    checkPermission
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Higher-order component for protecting routes
interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: UserRole
  requiresAuth?: boolean
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  requiresAuth = true 
}: ProtectedRouteProps) => {
  const { user, isLoading, isAuthenticated, needs2FAVerification } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (requiresAuth && !isAuthenticated) {
    // Redirect to login or show unauthorized
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p>Please sign in to access this page.</p>
        </div>
      </div>
    )
  }

  if (needs2FAVerification) {
    // Redirect to 2FA verification
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Two-Factor Authentication Required</h2>
          <p>Please verify your identity to continue.</p>
        </div>
      </div>
    )
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Show unauthorized for wrong role
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
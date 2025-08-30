/**
 * Authentication utilities for React Query hooks
 * Centralized auth checking to ensure consistency across all data fetching
 */

import { supabase } from '@/lib/supabase'

export interface AuthenticatedUser {
  id: string
  email?: string
  user_metadata?: any
}

/**
 * Checks if user is authenticated and returns user data
 * Throws error if authentication fails or user is not found
 */
export const requireAuth = async (): Promise<AuthenticatedUser> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    console.error('❌ Authentication error:', authError)
    throw new Error('Authentication failed')
  }
  
  if (!user) {
    console.error('❌ No user found - authentication required')
    throw new Error('User not authenticated')
  }
  
  return user
}

/**
 * Checks authentication without throwing errors
 * Returns user data or null if not authenticated
 */
export const checkAuth = async (): Promise<AuthenticatedUser | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return null
    }
    return user
  } catch (error) {
    console.warn('⚠️ Auth check failed:', error)
    return null
  }
}

/**
 * Creates a query function wrapper that requires authentication
 * Use this to wrap any query function that needs auth
 */
export const withAuth = <T>(queryFn: (user: AuthenticatedUser) => Promise<T>) => {
  return async (): Promise<T> => {
    const user = await requireAuth()
    return queryFn(user)
  }
}
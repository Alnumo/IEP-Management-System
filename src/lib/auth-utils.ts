/**
 * Authentication utilities for React Query hooks
 * Centralized auth checking to ensure consistency across all data fetching
 * Enhanced with parent portal authentication capabilities
 */

import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js';
import { SecurityService } from '@/services/security-service'

export type UserRole = 'admin' | 'manager' | 'medical_consultant' | 'therapist_lead' | 'receptionist' | 'parent';

export interface AuthenticatedUser {
  id: string
  email?: string
  role?: UserRole;
  parent_profile?: {
    id: string;
    student_id: string;
    preferred_language: 'ar' | 'en';
  };
  user_metadata?: any;
  requires_2fa?: boolean;
  is_2fa_verified?: boolean;
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

/**
 * Enhanced auth check with role information for parent portal
 */
export const requireAuthWithRole = async (): Promise<AuthenticatedUser> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    console.error('❌ Authentication error:', authError)
    throw new Error('Authentication failed')
  }
  
  if (!user) {
    console.error('❌ No user found - authentication required')
    throw new Error('User not authenticated')
  }

  // Get user role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role_name')
    .eq('user_id', user.id)
    .single();

  // Get parent profile if user is a parent
  let parentProfile = null;
  if (roleData?.role_name === 'parent') {
    const { data: profileData } = await supabase
      .from('parent_profiles')
      .select('id, student_id, preferred_language')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    
    parentProfile = profileData;
  }

  return {
    ...user,
    role: roleData?.role_name as UserRole,
    parent_profile: parentProfile
  };
}

/**
 * Check if current user is a parent
 */
export const requireParentAuth = async (): Promise<AuthenticatedUser> => {
  const user = await requireAuthWithRole();
  
  if (user.role !== 'parent') {
    throw new Error('Parent authentication required');
  }
  
  if (!user.parent_profile) {
    throw new Error('Parent profile not found');
  }

  return user;
}

/**
 * Check if current user can access specific student data
 */
export const canAccessStudent = async (studentId: string): Promise<boolean> => {
  try {
    const user = await requireAuthWithRole();
    
    // Admins and managers can access all students
    if (user.role === 'admin' || user.role === 'manager') {
      return true;
    }

    // Parents can only access their own child's data
    if (user.role === 'parent') {
      return user.parent_profile?.student_id === studentId;
    }

    // Therapists can access students they work with
    if (user.role === 'therapist_lead') {
      const { count } = await supabase
        .from('therapy_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('therapist_id', user.id);
      
      return (count || 0) > 0;
    }

    return false;
  } catch (error) {
    console.error('Error checking student access:', error);
    return false;
  }
}

/**
 * Creates a query function wrapper that requires parent authentication
 */
export const withParentAuth = <T>(queryFn: (user: AuthenticatedUser) => Promise<T>) => {
  return async (): Promise<T> => {
    const user = await requireParentAuth()
    return queryFn(user)
  }
}

/**
 * Check if 2FA is required for user based on their role
 */
export const is2FARequiredForUser = async (user: AuthenticatedUser): Promise<boolean> => {
  if (!user.role) return false
  
  try {
    return await SecurityService.is2FARequiredForRole(user.role)
  } catch (error) {
    console.error('Error checking 2FA role requirements:', error)
    return false
  }
}

/**
 * Check if user has 2FA enabled
 */
export const is2FAEnabledForUser = async (user: AuthenticatedUser): Promise<boolean> => {
  try {
    return await SecurityService.is2FAEnabled(user.id)
  } catch (error) {
    console.error('Error checking 2FA status:', error)
    return false
  }
}

/**
 * Enhanced auth check that includes 2FA requirements
 */
export const requireAuthWith2FA = async (): Promise<AuthenticatedUser> => {
  const user = await requireAuthWithRole()
  
  // Check if 2FA is required for this user's role
  const requires2fa = await is2FARequiredForUser(user)
  const is2faEnabled = await is2FAEnabledForUser(user)
  
  // Store session-based 2FA verification status
  const is2faVerified = await check2FASessionVerification(user.id)
  
  return {
    ...user,
    requires_2fa: requires2fa,
    is_2fa_verified: is2faVerified && is2faEnabled
  }
}

/**
 * Check if user's current session has been verified with 2FA
 * This checks for a session flag that indicates 2FA was verified during login
 */
export const check2FASessionVerification = async (userId: string): Promise<boolean> => {
  try {
    // Check if there's a valid session with 2FA verification
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) return false
    
    // Check for 2FA verification flag in session metadata or user metadata
    const twoFactorVerified = session.user.user_metadata?.two_factor_verified
    const sessionTimestamp = session.user.user_metadata?.two_factor_verified_at
    
    if (!twoFactorVerified || !sessionTimestamp) return false
    
    // Check if verification is still valid (within session timeout period)
    const verificationTime = new Date(sessionTimestamp).getTime()
    const currentTime = Date.now()
    const sessionTimeout = 8 * 60 * 60 * 1000 // 8 hours in milliseconds
    
    return (currentTime - verificationTime) < sessionTimeout
  } catch (error) {
    console.error('Error checking 2FA session verification:', error)
    return false
  }
}

/**
 * Mark user's session as 2FA verified
 */
export const mark2FASessionVerified = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('No user found')
    
    // Update user metadata to include 2FA verification
    await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        two_factor_verified: true,
        two_factor_verified_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error marking 2FA session verified:', error)
    throw error
  }
}

/**
 * Clear 2FA session verification (for logout)
 */
export const clear2FASessionVerification = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    // Remove 2FA verification from user metadata
    const updatedMetadata = { ...user.user_metadata }
    delete updatedMetadata.two_factor_verified
    delete updatedMetadata.two_factor_verified_at
    
    await supabase.auth.updateUser({
      data: updatedMetadata
    })
  } catch (error) {
    console.error('Error clearing 2FA session verification:', error)
    // Don't throw here as this is cleanup
  }
}

/**
 * Check if user needs 2FA verification before accessing protected resources
 */
export const needs2FAVerification = async (user: AuthenticatedUser): Promise<boolean> => {
  const requires2fa = await is2FARequiredForUser(user)
  
  if (!requires2fa) return false
  
  const is2faEnabled = await is2FAEnabledForUser(user)
  const is2faVerified = await check2FASessionVerification(user.id)
  
  // User needs 2FA if:
  // 1. Their role requires 2FA, AND
  // 2. They have 2FA enabled, AND  
  // 3. Their current session is not 2FA verified
  return requires2fa && is2faEnabled && !is2faVerified
}

/**
 * Enhanced require auth that enforces 2FA for protected roles
 */
export const requireAuthWithEnforced2FA = async (): Promise<AuthenticatedUser> => {
  const user = await requireAuthWith2FA()
  
  // Check if user needs 2FA verification
  const needsVerification = await needs2FAVerification(user)
  
  if (needsVerification) {
    throw new Error('Two-factor authentication required')
  }
  
  return user
}

/**
 * Creates a query function wrapper that requires 2FA authentication
 */
export const withEnforced2FA = <T>(queryFn: (user: AuthenticatedUser) => Promise<T>) => {
  return async (): Promise<T> => {
    const user = await requireAuthWithEnforced2FA()
    return queryFn(user)
  }
}
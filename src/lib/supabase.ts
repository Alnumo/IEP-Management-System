import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper function to get the current user's role
export async function getCurrentUserRole(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (error) {
    console.error('Error fetching user role:', error)
    return null
  }
  
  return data?.role || null
}

// Helper function to check if user has permission
export async function checkUserPermission(
  resource: string,
  action: string
): Promise<boolean> {
  const role = await getCurrentUserRole()
  
  if (!role) return false
  
  // Admin has all permissions
  if (role === 'admin') return true
  
  // Manager has most permissions except user management
  if (role === 'manager') {
    if (resource === 'users') return action === 'read'
    return ['create', 'read', 'update', 'delete'].includes(action)
  }
  
  // Therapist lead and receptionist can only read
  if (['therapist_lead', 'receptionist'].includes(role)) {
    return action === 'read'
  }
  
  return false
}
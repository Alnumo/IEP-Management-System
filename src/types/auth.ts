export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_url?: string
  created_at: string
  updated_at: string
}

export type UserRole = 'admin' | 'manager' | 'therapist_lead' | 'receptionist'

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  role: UserRole
}

// Role permissions
export const ROLE_PERMISSIONS = {
  admin: {
    plans: { create: true, read: true, update: true, delete: true },
    categories: { create: true, read: true, update: true, delete: true },
    users: { create: true, read: true, update: true, delete: true },
  },
  manager: {
    plans: { create: true, read: true, update: true, delete: true },
    categories: { create: true, read: true, update: true, delete: true },
    users: { create: false, read: true, update: false, delete: false },
  },
  therapist_lead: {
    plans: { create: false, read: true, update: false, delete: false },
    categories: { create: false, read: true, update: false, delete: false },
    users: { create: false, read: false, update: false, delete: false },
  },
  receptionist: {
    plans: { create: false, read: true, update: false, delete: false },
    categories: { create: false, read: true, update: false, delete: false },
    users: { create: false, read: false, update: false, delete: false },
  },
} as const

export type Permission = 'create' | 'read' | 'update' | 'delete'
export type Resource = 'plans' | 'categories' | 'users'

export function hasPermission(
  role: UserRole,
  resource: Resource,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[role][resource][permission]
}
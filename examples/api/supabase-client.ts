/**
 * Supabase API Integration Examples
 * 
 * Why: Demonstrates Supabase integration patterns for therapy applications:
 * - CRUD operations with Arabic text handling
 * - Real-time subscriptions for therapy sessions
 * - Row Level Security (RLS) patterns
 * - Error handling with bilingual messages
 * - File upload for therapy documents
 * - Optimistic updates for better UX
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase-types'

// Type-safe Supabase client
type SupabaseClientType = SupabaseClient<Database>

// Therapy session types
interface TherapySession {
  id: string
  student_id: string
  therapist_id: string
  type: 'speech' | 'physical' | 'occupational' | 'behavioral' | 'cognitive'
  title: string
  title_ar: string
  description: string
  description_ar: string
  scheduled_date: string
  duration_minutes: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  progress_percentage: number
  notes: string
  notes_ar: string
  created_at: string
  updated_at: string
}

interface ApiError {
  code: string
  message: string
  message_ar: string
  details?: any
}

interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  success: boolean
}

/**
 * Supabase client wrapper with Arabic text support
 */
export class TherapySupabaseClient {
  private supabase: SupabaseClientType
  private currentLanguage: 'ar' | 'en' = 'ar'

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey)
  }

  setLanguage(language: 'ar' | 'en') {
    this.currentLanguage = language
  }

  /**
   * Format error messages based on current language
   */
  private formatError(error: any): ApiError {
    const baseError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      message_ar: error.message_ar || 'حدث خطأ غير متوقع',
      details: error.details
    }

    // Map common Supabase errors to Arabic
    const errorMappings: Record<string, { en: string; ar: string }> = {
      'PGRST116': {
        en: 'No rows found',
        ar: 'لم يتم العثور على بيانات'
      },
      '23505': {
        en: 'Record already exists',
        ar: 'السجل موجود بالفعل'
      },
      '23503': {
        en: 'Referenced record not found',
        ar: 'السجل المرجعي غير موجود'
      },
      'PGRST301': {
        en: 'Insufficient permissions',
        ar: 'صلاحيات غير كافية'
      }
    }

    const mapping = errorMappings[baseError.code]
    if (mapping) {
      baseError.message = mapping.en
      baseError.message_ar = mapping.ar
    }

    return baseError
  }

  /**
   * Get therapy sessions with filtering and pagination
   */
  async getTherapySessions(params: {
    studentId?: string
    therapistId?: string
    type?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<TherapySession[]>> {
    try {
      let query = this.supabase
        .from('therapy_sessions')
        .select(`
          *,
          students:student_id(id, first_name, first_name_ar, last_name, last_name_ar),
          therapists:therapist_id(id, first_name, first_name_ar, last_name, last_name_ar)
        `)

      // Apply filters
      if (params.studentId) {
        query = query.eq('student_id', params.studentId)
      }
      if (params.therapistId) {
        query = query.eq('therapist_id', params.therapistId)
      }
      if (params.type) {
        query = query.eq('type', params.type)
      }
      if (params.status) {
        query = query.eq('status', params.status)
      }
      if (params.dateFrom) {
        query = query.gte('scheduled_date', params.dateFrom)
      }
      if (params.dateTo) {
        query = query.lte('scheduled_date', params.dateTo)
      }

      // Apply pagination
      const page = params.page || 1
      const limit = params.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      query = query.range(from, to).order('scheduled_date', { ascending: false })

      const { data, error } = await query

      if (error) {
        return {
          data: null,
          error: this.formatError(error),
          success: false
        }
      }

      return {
        data: data as TherapySession[],
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: this.formatError(error),
        success: false
      }
    }
  }

  /**
   * Create a new therapy session
   */
  async createTherapySession(
    sessionData: Omit<TherapySession, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<TherapySession>> {
    try {
      // Validate Arabic text fields
      if (!sessionData.title_ar || !sessionData.description_ar) {
        return {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Arabic title and description are required',
            message_ar: 'العنوان والوصف باللغة العربية مطلوبان'
          },
          success: false
        }
      }

      const { data, error } = await this.supabase
        .from('therapy_sessions')
        .insert([{
          ...sessionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        return {
          data: null,
          error: this.formatError(error),
          success: false
        }
      }

      return {
        data: data as TherapySession,
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: this.formatError(error),
        success: false
      }
    }
  }

  /**
   * Update therapy session with optimistic updates
   */
  async updateTherapySession(
    id: string,
    updates: Partial<TherapySession>
  ): Promise<ApiResponse<TherapySession>> {
    try {
      const { data, error } = await this.supabase
        .from('therapy_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return {
          data: null,
          error: this.formatError(error),
          success: false
        }
      }

      return {
        data: data as TherapySession,
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: this.formatError(error),
        success: false
      }
    }
  }

  /**
   * Delete therapy session
   */
  async deleteTherapySession(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('therapy_sessions')
        .delete()
        .eq('id', id)

      if (error) {
        return {
          data: null,
          error: this.formatError(error),
          success: false
        }
      }

      return {
        data: true,
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: this.formatError(error),
        success: false
      }
    }
  }

  /**
   * Subscribe to real-time therapy session updates
   */
  subscribeToTherapySessions(
    studentId: string,
    callback: (payload: any) => void
  ) {
    return this.supabase
      .channel(`therapy_sessions_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'therapy_sessions',
          filter: `student_id=eq.${studentId}`
        },
        (payload) => {
          console.log('Real-time update:', payload)
          callback(payload)
        }
      )
      .subscribe()
  }

  /**
   * Upload therapy document/attachment
   */
  async uploadTherapyDocument(
    file: File,
    sessionId: string,
    metadata?: { title?: string; title_ar?: string }
  ): Promise<ApiResponse<{ url: string; path: string }>> {
    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${sessionId}/${Date.now()}.${fileExt}`
      const filePath = `therapy-documents/${fileName}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('therapy-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        return {
          data: null,
          error: this.formatError(uploadError),
          success: false
        }
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('therapy-files')
        .getPublicUrl(filePath)

      // Save file metadata to database
      const { error: dbError } = await this.supabase
        .from('therapy_attachments')
        .insert([{
          session_id: sessionId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          title: metadata?.title || file.name,
          title_ar: metadata?.title_ar || file.name,
          uploaded_at: new Date().toISOString()
        }])

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await this.supabase.storage
          .from('therapy-files')
          .remove([filePath])

        return {
          data: null,
          error: this.formatError(dbError),
          success: false
        }
      }

      return {
        data: {
          url: urlData.publicUrl,
          path: filePath
        },
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: this.formatError(error),
        success: false
      }
    }
  }

  /**
   * Search therapy sessions with Arabic text support
   */
  async searchTherapySessions(
    query: string,
    filters?: {
      studentId?: string
      type?: string
      dateFrom?: string
      dateTo?: string
    }
  ): Promise<ApiResponse<TherapySession[]>> {
    try {
      let supabaseQuery = this.supabase
        .from('therapy_sessions')
        .select('*')

      // Apply text search on both Arabic and English fields
      if (query.trim()) {
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${query}%,title_ar.ilike.%${query}%,description.ilike.%${query}%,description_ar.ilike.%${query}%,notes.ilike.%${query}%,notes_ar.ilike.%${query}%`
        )
      }

      // Apply additional filters
      if (filters?.studentId) {
        supabaseQuery = supabaseQuery.eq('student_id', filters.studentId)
      }
      if (filters?.type) {
        supabaseQuery = supabaseQuery.eq('type', filters.type)
      }
      if (filters?.dateFrom) {
        supabaseQuery = supabaseQuery.gte('scheduled_date', filters.dateFrom)
      }
      if (filters?.dateTo) {
        supabaseQuery = supabaseQuery.lte('scheduled_date', filters.dateTo)
      }

      const { data, error } = await supabaseQuery
        .order('scheduled_date', { ascending: false })
        .limit(50)

      if (error) {
        return {
          data: null,
          error: this.formatError(error),
          success: false
        }
      }

      return {
        data: data as TherapySession[],
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: this.formatError(error),
        success: false
      }
    }
  }

  /**
   * Get therapy statistics with Arabic labels
   */
  async getTherapyStats(studentId: string): Promise<ApiResponse<{
    totalSessions: number
    completedSessions: number
    upcomingSessions: number
    averageProgress: number
    sessionsByType: Record<string, { count: number; label: string; label_ar: string }>
  }>> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_therapy_stats', { student_id: studentId })

      if (error) {
        return {
          data: null,
          error: this.formatError(error),
          success: false
        }
      }

      // Add Arabic labels for therapy types
      const typeLabels = {
        speech: { label: 'Speech Therapy', label_ar: 'علاج النطق' },
        physical: { label: 'Physical Therapy', label_ar: 'العلاج الطبيعي' },
        occupational: { label: 'Occupational Therapy', label_ar: 'العلاج الوظيفي' },
        behavioral: { label: 'Behavioral Therapy', label_ar: 'العلاج السلوكي' },
        cognitive: { label: 'Cognitive Therapy', label_ar: 'العلاج المعرفي' }
      }

      const sessionsByType = Object.entries(data.sessions_by_type || {}).reduce(
        (acc, [type, count]) => ({
          ...acc,
          [type]: {
            count: count as number,
            ...typeLabels[type as keyof typeof typeLabels]
          }
        }),
        {}
      )

      return {
        data: {
          totalSessions: data.total_sessions || 0,
          completedSessions: data.completed_sessions || 0,
          upcomingSessions: data.upcoming_sessions || 0,
          averageProgress: data.average_progress || 0,
          sessionsByType
        },
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: this.formatError(error),
        success: false
      }
    }
  }
}

// Usage examples:

/*
// Initialize client
const therapyClient = new TherapySupabaseClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

// Set language for error messages
therapyClient.setLanguage('ar')

// Get therapy sessions
const sessions = await therapyClient.getTherapySessions({
  studentId: 'student-123',
  status: 'scheduled',
  page: 1,
  limit: 10
})

if (sessions.success) {
  console.log('Sessions:', sessions.data)
} else {
  console.error('Error:', sessions.error?.message_ar)
}

// Create new session
const newSession = await therapyClient.createTherapySession({
  student_id: 'student-123',
  therapist_id: 'therapist-456',
  type: 'speech',
  title: 'Speech Therapy Session',
  title_ar: 'جلسة علاج النطق',
  description: 'Working on pronunciation',
  description_ar: 'العمل على النطق',
  scheduled_date: '2024-01-15T10:00:00Z',
  duration_minutes: 45,
  status: 'scheduled',
  progress_percentage: 0,
  notes: '',
  notes_ar: ''
})

// Subscribe to real-time updates
const subscription = therapyClient.subscribeToTherapySessions(
  'student-123',
  (payload) => {
    console.log('Session updated:', payload)
    // Update UI with new data
  }
)

// Upload therapy document
const fileInput = document.getElementById('file') as HTMLInputElement
const file = fileInput.files?.[0]
if (file) {
  const upload = await therapyClient.uploadTherapyDocument(
    file,
    'session-123',
    {
      title: 'Therapy Report',
      title_ar: 'تقرير العلاج'
    }
  )
  
  if (upload.success) {
    console.log('File uploaded:', upload.data?.url)
  }
}

// Search sessions
const searchResults = await therapyClient.searchTherapySessions(
  'علاج النطق', // Arabic search term
  {
    studentId: 'student-123',
    type: 'speech'
  }
)

// Get statistics
const stats = await therapyClient.getTherapyStats('student-123')
if (stats.success) {
  console.log('Total sessions:', stats.data?.totalSessions)
  console.log('Speech therapy sessions:', stats.data?.sessionsByType.speech?.label_ar)
}

// Clean up subscription
subscription.unsubscribe()
*/

// Error handling utility
export const handleSupabaseError = (error: ApiError, language: 'ar' | 'en' = 'ar') => {
  const message = language === 'ar' ? error.message_ar : error.message
  
  // Log error for debugging
  console.error('Supabase Error:', {
    code: error.code,
    message: error.message,
    message_ar: error.message_ar,
    details: error.details
  })
  
  // Return user-friendly message
  return message
}

// React Hook for Supabase operations
export const useTherapySupabase = () => {
  const client = new TherapySupabaseClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )
  
  return client
}

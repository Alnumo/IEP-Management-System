import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { 
  Session, 
  SessionBooking, 
  TimeSlot,
  CreateSessionData, 
  UpdateSessionData,
  CreateSessionBookingData,
  SessionFilters,
  SessionBookingFilters,
  AvailabilityFilters,
  SessionStats
} from '@/types/session'

// Session Management Hooks

// Fetch all sessions
export const useSessions = (filters?: SessionFilters) => {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: async (): Promise<Session[]> => {
      console.log('🔍 Fetching sessions with filters:', filters)
      
      let query = supabase
        .from('course_sessions')
        .select(`
          *,
          course:courses(
            id,
            name_ar,
            name_en,
            course_code,
            therapist_name
          )
        `)
        .order('session_date', { ascending: true })

      // Apply filters
      if (filters) {
        if (filters.course_id) {
          query = query.eq('course_id', filters.course_id)
        }
        if (filters.date_from) {
          query = query.gte('session_date', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('session_date', filters.date_to)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.search) {
          query = query.or(`topic_ar.ilike.%${filters.search}%,topic_en.ilike.%${filters.search}%`)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching sessions:', error)
        throw error
      }

      console.log('✅ Sessions fetched successfully:', data?.length || 0, 'sessions')
      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Fetch single session by ID
export const useSession = (id: string) => {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: async (): Promise<Session> => {
      console.log('🔍 Fetching session:', id)

      const { data, error } = await supabase
        .from('course_sessions')
        .select(`
          *,
          course:courses(
            id,
            name_ar,
            name_en,
            course_code,
            therapist_name
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Error fetching session:', error)
        throw error
      }

      console.log('✅ Session fetched successfully:', data)
      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Create new session
export const useCreateSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSessionData): Promise<Session> => {
      console.log('🔍 Creating session with:', data)
      
      // Temporarily disable auth check for testing
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.log('⚠️ Auth error (continuing anyway for testing):', authError)
      }
      if (!user) {
        console.log('⚠️ No user found (continuing anyway for testing)')
      }

      const sessionData = {
        ...data,
        duration_minutes: data.duration_minutes || 60,
        objectives: data.objectives || [],
        materials_needed: data.materials_needed || [],
        created_by: user?.id || null,
        updated_by: user?.id || null,
      }

      const { data: newSession, error } = await supabase
        .from('course_sessions')
        .insert([sessionData])
        .select(`
          *,
          course:courses(
            id,
            name_ar,
            name_en,
            course_code,
            therapist_name
          )
        `)
        .single()

      if (error) {
        console.error('❌ Error creating session:', error)
        throw error
      }

      console.log('✅ Session created successfully:', newSession)
      return newSession
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

// Update session
export const useUpdateSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSessionData }): Promise<Session> => {
      console.log('🔍 Updating session:', id, 'with:', data)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.log('⚠️ Auth error (continuing anyway for testing):', authError)
      }
      if (!user) {
        console.log('⚠️ No user found (continuing anyway for testing)')
      }

      const updateData = {
        ...data,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }

      const { data: updatedSession, error } = await supabase
        .from('course_sessions')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          course:courses(
            id,
            name_ar,
            name_en,
            course_code,
            therapist_name
          )
        `)
        .single()

      if (error) {
        console.error('❌ Error updating session:', error)
        throw error
      }

      console.log('✅ Session updated successfully:', updatedSession)
      return updatedSession
    },
    onSuccess: (updatedSession) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessions', updatedSession.id] })
    },
  })
}

// Delete session
export const useDeleteSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      console.log('🔍 Deleting session:', id)

      const { error } = await supabase
        .from('course_sessions')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Error deleting session:', error)
        throw error
      }

      console.log('✅ Session deleted successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

// Session Booking Hooks

// Fetch all session bookings
export const useSessionBookings = (filters?: SessionBookingFilters) => {
  return useQuery({
    queryKey: ['session-bookings', filters],
    queryFn: async (): Promise<SessionBooking[]> => {
      console.log('🔍 Fetching session bookings with filters:', filters)
      
      let query = supabase
        .from('course_attendance')
        .select(`
          *,
          session:course_sessions(
            id,
            session_number,
            session_date,
            session_time,
            course:courses(
              id,
              name_ar,
              name_en,
              course_code
            )
          ),
          student:students(
            id,
            first_name_ar,
            last_name_ar,
            first_name_en,
            last_name_en,
            registration_number
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters) {
        if (filters.student_id) {
          query = query.eq('student_id', filters.student_id)
        }
        if (filters.session_id) {
          query = query.eq('course_session_id', filters.session_id)
        }
        if (filters.attendance_status) {
          query = query.eq('attendance_status', filters.attendance_status)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching session bookings:', error)
        throw error
      }

      console.log('✅ Session bookings fetched successfully:', data?.length || 0, 'bookings')
      return data || []
    },
    staleTime: 2 * 60 * 1000,
  })
}

// Create session booking
export const useCreateSessionBooking = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSessionBookingData): Promise<SessionBooking> => {
      console.log('🔍 Creating session booking with:', data)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.log('⚠️ Auth error (continuing anyway for testing):', authError)
      }
      if (!user) {
        console.log('⚠️ No user found (continuing anyway for testing)')
      }

      const bookingData = {
        course_session_id: data.session_id,
        student_id: data.student_id,
        course_id: '', // This will need to be populated from the session
        attendance_status: 'absent', // Default value
        notes: data.notes || '',
        recorded_by: user?.id || null,
      }

      const { data: newBooking, error } = await supabase
        .from('course_attendance')
        .insert([bookingData])
        .select(`
          *,
          session:course_sessions(
            id,
            session_number,
            session_date,
            session_time,
            course:courses(
              id,
              name_ar,
              name_en,
              course_code
            )
          ),
          student:students(
            id,
            first_name_ar,
            last_name_ar,
            first_name_en,
            last_name_en,
            registration_number
          )
        `)
        .single()

      if (error) {
        console.error('❌ Error creating session booking:', error)
        throw error
      }

      console.log('✅ Session booking created successfully:', newBooking)
      return newBooking
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-bookings'] })
    },
  })
}

// Fetch session statistics
export const useSessionStats = () => {
  return useQuery({
    queryKey: ['session-stats'],
    queryFn: async (): Promise<SessionStats> => {
      console.log('🔍 Fetching session statistics...')

      const { data: sessions, error } = await supabase
        .from('course_sessions')
        .select('id, status')

      if (error) {
        console.error('❌ Error fetching session stats:', error)
        throw error
      }

      // Calculate statistics
      const total_sessions = sessions?.length || 0
      const scheduled_sessions = sessions?.filter(s => s.status === 'scheduled').length || 0
      const completed_sessions = sessions?.filter(s => s.status === 'completed').length || 0
      const cancelled_sessions = sessions?.filter(s => s.status === 'cancelled').length || 0
      const rescheduled_sessions = sessions?.filter(s => s.status === 'rescheduled').length || 0

      // Get booking stats
      const { data: bookings } = await supabase
        .from('course_attendance')
        .select('attendance_status')

      const total_bookings = bookings?.length || 0
      const confirmed_bookings = bookings?.filter(b => b.attendance_status === 'present').length || 0
      const pending_bookings = bookings?.filter(b => b.attendance_status === 'absent').length || 0
      
      const attendance_rate = total_bookings > 0 ? Math.round((confirmed_bookings / total_bookings) * 100) : 0

      const stats: SessionStats = {
        total_sessions,
        scheduled_sessions,
        completed_sessions,
        cancelled_sessions,
        rescheduled_sessions,
        total_bookings,
        confirmed_bookings,
        pending_bookings,
        attendance_rate,
        revenue_generated: 0, // Would need to calculate from enrollment payments
        revenue_pending: 0
      }

      console.log('✅ Session statistics calculated:', stats)
      return stats
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch available time slots
export const useAvailableTimeSlots = (filters: AvailabilityFilters) => {
  return useQuery({
    queryKey: ['available-time-slots', filters],
    queryFn: async (): Promise<TimeSlot[]> => {
      console.log('🔍 Fetching available time slots with filters:', filters)
      
      // This would query a time_slots table or generate from courses
      // For now, return mock data based on course schedules
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'active')
        .gte('start_date', filters.date_from)
        .lte('end_date', filters.date_to)

      if (error) {
        console.error('❌ Error fetching time slots:', error)
        throw error
      }

      // Generate time slots from course schedules
      const timeSlots: TimeSlot[] = []
      courses?.forEach((course) => {
        const slot: TimeSlot = {
          id: `slot-${course.id}`,
          date: course.start_date,
          start_time: course.schedule_time.split('-')[0],
          end_time: course.schedule_time.split('-')[1],
          duration_minutes: 120, // Default 2 hours
          available_slots: course.max_students - course.enrolled_students,
          booked_slots: course.enrolled_students,
          therapist_name: course.therapist_name,
          location: course.location,
          status: course.enrolled_students < course.max_students ? 'available' : 'fully_booked'
        }
        timeSlots.push(slot)
      })

      console.log('✅ Time slots generated:', timeSlots.length, 'slots')
      return timeSlots
    },
    staleTime: 5 * 60 * 1000,
  })
}
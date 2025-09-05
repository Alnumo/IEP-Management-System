import { supabase } from '@/lib/supabase'
import type { 
  StudentEnrollment, 
  ProgramTemplate, 
  Student,
  TherapySession 
} from '@/types/enrollment'

export interface EnrollmentCustomization {
  intensity_level: 'low' | 'medium' | 'high'
  session_frequency: number
  duration_weeks: number
  specific_goals: string[]
  accommodations: string[]
  preferred_schedule: {
    days_of_week: string[]
    time_slots: string[]
  }
  therapist_requirements: string[]
}

export interface IndividualizedEnrollmentRequest {
  student_id: string
  program_template_id: string
  customizations: EnrollmentCustomization
  parent_notes?: string
  priority_level: 'standard' | 'high' | 'urgent'
}

export class IndividualizedEnrollmentService {
  async createIndividualizedEnrollment(
    request: IndividualizedEnrollmentRequest
  ): Promise<{
    success: boolean
    enrollment?: StudentEnrollment
    message: string
  }> {
    try {
      // Validate student and template exist
      const [studentResult, templateResult] = await Promise.all([
        supabase.from('students').select('*').eq('id', request.student_id).single(),
        supabase.from('program_templates').select('*').eq('id', request.program_template_id).single()
      ])

      if (studentResult.error || templateResult.error) {
        return {
          success: false,
          message: 'Student or program template not found'
        }
      }

      // Check for existing active enrollment
      const { data: existingEnrollment } = await supabase
        .from('student_enrollments')
        .select('*')
        .eq('student_id', request.student_id)
        .eq('program_template_id', request.program_template_id)
        .eq('status', 'active')
        .single()

      if (existingEnrollment) {
        return {
          success: false,
          message: 'Student already has an active enrollment in this program'
        }
      }

      // Calculate program timeline based on customizations
      const startDate = new Date()
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + (request.customizations.duration_weeks * 7))

      // Create enrollment record
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .insert({
          student_id: request.student_id,
          program_template_id: request.program_template_id,
          enrollment_date: startDate.toISOString(),
          expected_completion_date: endDate.toISOString(),
          status: 'active',
          customizations: request.customizations,
          priority_level: request.priority_level,
          parent_notes: request.parent_notes,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (enrollmentError) {
        return {
          success: false,
          message: `Failed to create enrollment: ${enrollmentError.message}`
        }
      }

      // Generate individualized sessions based on customizations
      await this.generateIndividualizedSessions(enrollment.id, request.customizations)

      return {
        success: true,
        enrollment: enrollment as StudentEnrollment,
        message: 'Individualized enrollment created successfully'
      }
    } catch (error) {
      console.error('Error creating individualized enrollment:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while creating enrollment'
      }
    }
  }

  async updateEnrollmentCustomizations(
    enrollmentId: string,
    customizations: Partial<EnrollmentCustomization>
  ): Promise<{
    success: boolean
    enrollment?: StudentEnrollment
    message: string
  }> {
    try {
      const { data: enrollment, error } = await supabase
        .from('student_enrollments')
        .update({
          customizations: customizations,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId)
        .select('*')
        .single()

      if (error) {
        return {
          success: false,
          message: `Failed to update enrollment: ${error.message}`
        }
      }

      return {
        success: true,
        enrollment: enrollment as StudentEnrollment,
        message: 'Enrollment customizations updated successfully'
      }
    } catch (error) {
      console.error('Error updating enrollment customizations:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while updating enrollment'
      }
    }
  }

  async getEnrollmentProgress(enrollmentId: string): Promise<{
    success: boolean
    progress?: {
      completed_sessions: number
      total_sessions: number
      progress_percentage: number
      upcoming_sessions: TherapySession[]
      last_session_date?: string
      next_session_date?: string
    }
    message: string
  }> {
    try {
      // Get enrollment details
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single()

      if (enrollmentError) {
        return {
          success: false,
          message: 'Enrollment not found'
        }
      }

      // Get session statistics
      const [completedResult, totalResult, upcomingResult] = await Promise.all([
        supabase
          .from('therapy_sessions')
          .select('id')
          .eq('enrollment_id', enrollmentId)
          .eq('status', 'completed'),
        supabase
          .from('therapy_sessions')
          .select('id')
          .eq('enrollment_id', enrollmentId),
        supabase
          .from('therapy_sessions')
          .select('*')
          .eq('enrollment_id', enrollmentId)
          .eq('status', 'scheduled')
          .order('scheduled_date', { ascending: true })
          .limit(5)
      ])

      const completedCount = completedResult.data?.length || 0
      const totalCount = totalResult.data?.length || 0
      const upcomingSessions = upcomingResult.data || []

      // Get last and next session dates
      const { data: lastSession } = await supabase
        .from('therapy_sessions')
        .select('scheduled_date')
        .eq('enrollment_id', enrollmentId)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })
        .limit(1)
        .single()

      const { data: nextSession } = await supabase
        .from('therapy_sessions')
        .select('scheduled_date')
        .eq('enrollment_id', enrollmentId)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .single()

      const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

      return {
        success: true,
        progress: {
          completed_sessions: completedCount,
          total_sessions: totalCount,
          progress_percentage: progressPercentage,
          upcoming_sessions: upcomingSessions as TherapySession[],
          last_session_date: lastSession?.scheduled_date,
          next_session_date: nextSession?.scheduled_date
        },
        message: 'Progress retrieved successfully'
      }
    } catch (error) {
      console.error('Error getting enrollment progress:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while retrieving progress'
      }
    }
  }

  private async generateIndividualizedSessions(
    enrollmentId: string,
    customizations: EnrollmentCustomization
  ): Promise<void> {
    try {
      // Get the program template to understand base session structure
      const { data: enrollment } = await supabase
        .from('student_enrollments')
        .select('*, program_templates(*)')
        .eq('id', enrollmentId)
        .single()

      if (!enrollment) return

      // Generate sessions based on frequency and duration
      const sessionsToGenerate = customizations.session_frequency * customizations.duration_weeks
      const startDate = new Date(enrollment.enrollment_date)
      
      const sessions: Partial<TherapySession>[] = []
      
      for (let i = 0; i < sessionsToGenerate; i++) {
        const sessionDate = new Date(startDate)
        
        // Calculate session date based on frequency
        const weekNumber = Math.floor(i / customizations.session_frequency)
        const sessionInWeek = i % customizations.session_frequency
        
        sessionDate.setDate(sessionDate.getDate() + (weekNumber * 7) + sessionInWeek)
        
        sessions.push({
          enrollment_id: enrollmentId,
          scheduled_date: sessionDate.toISOString(),
          duration_minutes: this.getDurationByIntensity(customizations.intensity_level),
          status: 'scheduled',
          session_type: 'individual',
          goals: customizations.specific_goals,
          created_at: new Date().toISOString()
        })
      }

      // Batch insert sessions
      await supabase.from('therapy_sessions').insert(sessions)
    } catch (error) {
      console.error('Error generating individualized sessions:', error)
    }
  }

  private getDurationByIntensity(intensity: string): number {
    switch (intensity) {
      case 'high': return 90
      case 'medium': return 60
      case 'low': return 45
      default: return 60
    }
  }

  async getActiveEnrollments(studentId?: string): Promise<{
    success: boolean
    enrollments?: StudentEnrollment[]
    message: string
  }> {
    try {
      let query = supabase
        .from('student_enrollments')
        .select('*, students(*), program_templates(*)')
        .eq('status', 'active')

      if (studentId) {
        query = query.eq('student_id', studentId)
      }

      const { data: enrollments, error } = await query

      if (error) {
        return {
          success: false,
          message: `Failed to retrieve enrollments: ${error.message}`
        }
      }

      return {
        success: true,
        enrollments: enrollments as StudentEnrollment[],
        message: 'Enrollments retrieved successfully'
      }
    } catch (error) {
      console.error('Error getting active enrollments:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while retrieving enrollments'
      }
    }
  }
}

export const individualizedEnrollmentService = new IndividualizedEnrollmentService()
/**
 * Assignment Workflow Validation Service
 * Automated validation for therapist assignments with conflict detection
 * Arkan Al-Numo Center - Assignment Management System
 */

import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'
import type { 
  AssignmentValidationResult, 
  AlternativeAssignmentOption, 
  AssignmentWorkflowRule 
} from '@/types/communication'
import type { 
  CourseAssignment, 
  TimeSlot, 
  ScheduleConflict, 
  SessionBooking,
  TherapySpecialization 
} from '@/types/session'
import type { Therapist } from '@/types/therapist'
import type { Student } from '@/types/student'

// =====================================================
// VALIDATION RULES ENGINE
// =====================================================

export class AssignmentValidationEngine {
  private rules: AssignmentWorkflowRule[] = []

  constructor() {
    this.initializeDefaultRules()
  }

  private initializeDefaultRules() {
    // Default rules for assignment validation
    this.rules = [
      {
        id: 'one-therapist-per-session-type',
        rule_type: 'one_therapist_per_session_type',
        conditions: { 
          max_concurrent_sessions: 1,
          session_types: ['individual', 'assessment']
        },
        actions: ['block_assignment', 'suggest_alternatives'],
        priority: 10,
        enabled: true
      },
      {
        id: 'capacity-limit-check',
        rule_type: 'capacity_limit',
        conditions: { 
          max_students_per_therapist: 25,
          max_sessions_per_day: 8,
          min_break_between_sessions: 15 // minutes
        },
        actions: ['warn_capacity', 'suggest_alternatives'],
        priority: 8,
        enabled: true
      },
      {
        id: 'specialization-matching',
        rule_type: 'specialization_required',
        conditions: { 
          match_required: true,
          allow_secondary_specialization: true
        },
        actions: ['validate_specialization', 'suggest_qualified_alternatives'],
        priority: 9,
        enabled: true
      }
    ]
  }

  // Add custom rule
  addRule(rule: AssignmentWorkflowRule): void {
    this.rules.push(rule)
    this.rules.sort((a, b) => b.priority - a.priority)
  }

  // Get active rules
  getActiveRules(): AssignmentWorkflowRule[] {
    return this.rules.filter(rule => rule.enabled)
  }

  // Validate assignment against all rules
  async validateAssignment(
    therapistId: string, 
    courseId: string, 
    sessionDate: string,
    sessionTime: string,
    assignmentType: 'primary' | 'assistant' | 'substitute' = 'primary'
  ): Promise<AssignmentValidationResult> {
    
    try {
      // Get therapist and course data
      const [therapist, course, existingAssignments, timeSlots] = await Promise.all([
        this.getTherapistData(therapistId),
        this.getCourseData(courseId),
        this.getExistingAssignments(therapistId, sessionDate),
        this.getTimeSlots(sessionDate, sessionTime)
      ])

      if (!therapist) {
        return {
          isValid: false,
          requiresSubstitution: true,
          recommendedAction: 'escalate_to_supervisor',
          alternativeOptions: []
        }
      }

      // Run validation rules
      for (const rule of this.getActiveRules()) {
        const validationResult = await this.applyRule(rule, {
          therapist,
          course,
          existingAssignments,
          timeSlots,
          sessionDate,
          sessionTime,
          assignmentType
        })

        if (!validationResult.isValid) {
          return validationResult
        }
      }

      // All validations passed
      return {
        isValid: true,
        requiresSubstitution: false,
        recommendedAction: 'notify_parent_of_change',
        alternativeOptions: []
      }

    } catch (error) {
      console.error('Assignment validation error:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'AssignmentValidationEngine',
        action: 'validate_assignment',
        therapistId,
        courseId
      })

      return {
        isValid: false,
        requiresSubstitution: true,
        recommendedAction: 'escalate_to_supervisor',
        alternativeOptions: []
      }
    }
  }

  // Apply individual rule
  private async applyRule(
    rule: AssignmentWorkflowRule, 
    context: any
  ): Promise<AssignmentValidationResult> {
    
    switch (rule.rule_type) {
      case 'one_therapist_per_session_type':
        return await this.validateConcurrentSessions(context, rule.conditions)
      
      case 'capacity_limit':
        return await this.validateCapacityLimits(context, rule.conditions)
      
      case 'specialization_required':
        return await this.validateSpecializationMatch(context, rule.conditions)
      
      default:
        return { isValid: true, requiresSubstitution: false, recommendedAction: 'notify_parent_of_change', alternativeOptions: [] }
    }
  }

  // =====================================================
  // SPECIFIC VALIDATION METHODS
  // =====================================================

  private async validateConcurrentSessions(context: any, conditions: any): Promise<AssignmentValidationResult> {
    const { therapist, existingAssignments, sessionDate, sessionTime } = context
    
    // Check for concurrent sessions at the same time
    const concurrentSessions = existingAssignments.filter((assignment: any) => {
      return assignment.session_time === sessionTime && 
             assignment.session_date === sessionDate &&
             assignment.assignment_type === 'primary'
    })

    if (concurrentSessions.length > 0) {
      const alternatives = await this.findAlternativeTherapists(context)
      
      return {
        isValid: false,
        conflictType: 'therapist_already_assigned',
        currentTherapist: therapist.first_name_ar + ' ' + therapist.last_name_ar,
        requiresSubstitution: true,
        recommendedAction: 'suggest_alternative_time',
        alternativeOptions: alternatives
      }
    }

    return { isValid: true, requiresSubstitution: false, recommendedAction: 'notify_parent_of_change', alternativeOptions: [] }
  }

  private async validateCapacityLimits(context: any, conditions: any): Promise<AssignmentValidationResult> {
    const { therapist, existingAssignments, sessionDate } = context
    
    // Count daily sessions
    const dailySessions = existingAssignments.filter((assignment: any) => 
      assignment.session_date === sessionDate
    )

    if (dailySessions.length >= conditions.max_sessions_per_day) {
      const alternatives = await this.findAlternativeTherapists(context)
      
      return {
        isValid: false,
        conflictType: 'capacity_exceeded',
        requiresSubstitution: true,
        recommendedAction: 'suggest_alternative_time',
        alternativeOptions: alternatives
      }
    }

    // Check student capacity
    const uniqueStudents = new Set(dailySessions.map((a: any) => a.student_id))
    if (uniqueStudents.size >= conditions.max_students_per_therapist) {
      return {
        isValid: false,
        conflictType: 'capacity_exceeded',
        requiresSubstitution: true,
        recommendedAction: 'suggest_alternative_time',
        alternativeOptions: await this.findAlternativeTherapists(context)
      }
    }

    return { isValid: true, requiresSubstitution: false, recommendedAction: 'notify_parent_of_change', alternativeOptions: [] }
  }

  private async validateSpecializationMatch(context: any, conditions: any): Promise<AssignmentValidationResult> {
    const { therapist, course } = context
    
    // Get required specialization from course
    const requiredSpec = course?.required_specialization || course?.category
    
    if (requiredSpec && conditions.match_required) {
      const therapistSpecs = [therapist.specialization_ar, therapist.specialization_en]
      const hasMatch = therapistSpecs.some(spec => 
        spec?.toLowerCase().includes(requiredSpec.toLowerCase())
      )

      if (!hasMatch) {
        const alternatives = await this.findSpecializedTherapists(requiredSpec, context)
        
        return {
          isValid: false,
          requiresSubstitution: true,
          recommendedAction: 'suggest_qualified_alternatives',
          alternativeOptions: alternatives
        }
      }
    }

    return { isValid: true, requiresSubstitution: false, recommendedAction: 'notify_parent_of_change', alternativeOptions: [] }
  }

  // =====================================================
  // DATA FETCHING METHODS
  // =====================================================

  private async getTherapistData(therapistId: string): Promise<Therapist | null> {
    const { data, error } = await supabase
      .from('therapists')
      .select('*')
      .eq('id', therapistId)
      .eq('status', 'active')
      .single()

    if (error) {
      console.error('Error fetching therapist:', error)
      return null
    }
    
    return data
  }

  private async getCourseData(courseId: string): Promise<any> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (error) {
      console.error('Error fetching course:', error)
      return null
    }
    
    return data
  }

  private async getExistingAssignments(therapistId: string, date: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        course:courses(therapist_id, required_specialization)
      `)
      .eq('course.therapist_id', therapistId)
      .eq('session_date', date)
      .eq('status', 'scheduled')

    return data || []
  }

  private async getTimeSlots(date: string, time: string): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('date', date)
      .gte('start_time', time)
      .lte('end_time', time)

    return data || []
  }

  // =====================================================
  // ALTERNATIVE RECOMMENDATIONS
  // =====================================================

  private async findAlternativeTherapists(context: any): Promise<AlternativeAssignmentOption[]> {
    const { course, sessionDate, sessionTime } = context
    
    try {
      // Get available therapists for the time slot
      const { data: availableTherapists, error } = await supabase
        .from('therapists')
        .select(`
          *,
          assignments:course_assignments!inner(*)
        `)
        .eq('status', 'active')
        .not('assignments.therapist_id', 'eq', context.therapist.id)

      if (error) throw error

      const alternatives: AlternativeAssignmentOption[] = []

      for (const therapist of availableTherapists || []) {
        // Check availability for the specific time
        const isAvailable = await this.checkTherapistAvailability(
          therapist.id, 
          sessionDate, 
          sessionTime
        )

        if (isAvailable) {
          // Calculate specialization match score
          const specializationMatch = this.calculateSpecializationMatch(
            therapist,
            course?.required_specialization || course?.category
          )

          // Get available times for this therapist
          const availableTimes = await this.getTherapistAvailableTimes(
            therapist.id, 
            sessionDate
          )

          alternatives.push({
            therapist_id: therapist.id,
            therapist_name: `${therapist.first_name_ar} ${therapist.last_name_ar}`,
            available_times: availableTimes,
            specialization_match: specializationMatch,
            experience_level: this.getExperienceLevel(therapist.experience_years)
          })
        }
      }

      // Sort by specialization match and experience
      return alternatives.sort((a, b) => {
        if (a.specialization_match !== b.specialization_match) {
          return b.specialization_match - a.specialization_match
        }
        
        const experienceOrder = { expert: 3, senior: 2, junior: 1 }
        return experienceOrder[b.experience_level] - experienceOrder[a.experience_level]
      })

    } catch (error) {
      console.error('Error finding alternatives:', error)
      return []
    }
  }

  private async findSpecializedTherapists(
    requiredSpec: string, 
    context: any
  ): Promise<AlternativeAssignmentOption[]> {
    
    const { sessionDate, sessionTime } = context

    try {
      const { data: therapists, error } = await supabase
        .from('therapists')
        .select('*')
        .eq('status', 'active')
        .or(`specialization_ar.ilike.%${requiredSpec}%,specialization_en.ilike.%${requiredSpec}%`)

      if (error) throw error

      const alternatives: AlternativeAssignmentOption[] = []

      for (const therapist of therapists || []) {
        const isAvailable = await this.checkTherapistAvailability(
          therapist.id, 
          sessionDate, 
          sessionTime
        )

        if (isAvailable) {
          alternatives.push({
            therapist_id: therapist.id,
            therapist_name: `${therapist.first_name_ar} ${therapist.last_name_ar}`,
            available_times: await this.getTherapistAvailableTimes(therapist.id, sessionDate),
            specialization_match: 1.0, // Perfect match since we filtered by specialization
            experience_level: this.getExperienceLevel(therapist.experience_years)
          })
        }
      }

      return alternatives

    } catch (error) {
      console.error('Error finding specialized therapists:', error)
      return []
    }
  }

  // =====================================================
  // AVAILABILITY CHECKING
  // =====================================================

  private async checkTherapistAvailability(
    therapistId: string, 
    date: string, 
    time: string
  ): Promise<boolean> {
    
    try {
      // Check for existing assignments at the same time
      const { data: conflicts, error } = await supabase
        .from('sessions')
        .select(`
          *,
          course:courses!inner(therapist_id)
        `)
        .eq('course.therapist_id', therapistId)
        .eq('session_date', date)
        .eq('session_time', time)
        .eq('status', 'scheduled')

      if (error) throw error

      return (conflicts || []).length === 0

    } catch (error) {
      console.error('Error checking availability:', error)
      return false
    }
  }

  private async getTherapistAvailableTimes(
    therapistId: string, 
    date: string
  ): Promise<string[]> {
    
    try {
      // Get all time slots for the day
      const { data: allSlots, error: slotsError } = await supabase
        .from('time_slots')
        .select('start_time')
        .eq('date', date)
        .eq('status', 'available')

      if (slotsError) throw slotsError

      // Get occupied slots for this therapist
      const { data: occupiedSlots, error: occupiedError } = await supabase
        .from('sessions')
        .select(`
          session_time,
          course:courses!inner(therapist_id)
        `)
        .eq('course.therapist_id', therapistId)
        .eq('session_date', date)
        .eq('status', 'scheduled')

      if (occupiedError) throw occupiedError

      const occupiedTimes = new Set(occupiedSlots?.map(slot => slot.session_time) || [])
      const availableTimes = (allSlots || [])
        .map(slot => slot.start_time)
        .filter(time => !occupiedTimes.has(time))

      return availableTimes.sort()

    } catch (error) {
      console.error('Error getting available times:', error)
      return []
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private calculateSpecializationMatch(therapist: Therapist, requiredSpec?: string): number {
    if (!requiredSpec) return 0.8 // Default good match if no specific requirement
    
    const therapistSpecs = [
      therapist.specialization_ar?.toLowerCase(),
      therapist.specialization_en?.toLowerCase()
    ].filter(Boolean)

    const required = requiredSpec.toLowerCase()
    
    // Check for exact match
    if (therapistSpecs.some(spec => spec === required)) return 1.0
    
    // Check for partial match
    if (therapistSpecs.some(spec => spec?.includes(required) || required.includes(spec!))) {
      return 0.7
    }
    
    // Check for related specialization
    const relatedSpecs = this.getRelatedSpecializations(required)
    if (therapistSpecs.some(spec => relatedSpecs.includes(spec!))) {
      return 0.5
    }

    return 0.2 // Minimal match
  }

  private getRelatedSpecializations(specialization: string): string[] {
    const relatedMap: Record<string, string[]> = {
      'speech': ['communication', 'language', 'تخاطب', 'لغة'],
      'occupational': ['motor', 'sensory', 'وظيفي', 'حركي'],
      'physical': ['motor', 'mobility', 'طبيعي', 'حركة'],
      'behavioral': ['aba', 'autism', 'سلوكي', 'توحد'],
      'developmental': ['early_intervention', 'تطويري', 'تدخل_مبكر']
    }

    return relatedMap[specialization] || []
  }

  private getExperienceLevel(years: number): 'junior' | 'senior' | 'expert' {
    if (years >= 10) return 'expert'
    if (years >= 5) return 'senior'
    return 'junior'
  }

  // =====================================================
  // CONFLICT DETECTION
  // =====================================================

  async detectScheduleConflicts(
    therapistId: string,
    sessionDate: string,
    sessionTime: string,
    duration: number = 60
  ): Promise<ScheduleConflict[]> {
    
    try {
      const conflicts: ScheduleConflict[] = []
      
      // Calculate end time
      const startTime = new Date(`${sessionDate} ${sessionTime}`)
      const endTime = new Date(startTime.getTime() + duration * 60000)

      // Check for overlapping sessions
      const { data: overlappingSessions, error } = await supabase
        .from('sessions')
        .select(`
          *,
          course:courses!inner(therapist_id, name_ar)
        `)
        .eq('course.therapist_id', therapistId)
        .eq('session_date', sessionDate)
        .eq('status', 'scheduled')

      if (error) throw error

      for (const session of overlappingSessions || []) {
        const sessionStart = new Date(`${session.session_date} ${session.session_time}`)
        const sessionEnd = new Date(sessionStart.getTime() + session.duration_minutes * 60000)

        // Check for time overlap
        if ((startTime < sessionEnd) && (endTime > sessionStart)) {
          conflicts.push({
            type: 'instructor_double_booking',
            message: `تعارض في موعد المعالج: جلسة أخرى مجدولة من ${session.session_time}`,
            conflicting_sessions: [session.id]
          })
        }
      }

      return conflicts

    } catch (error) {
      console.error('Error detecting conflicts:', error)
      return []
    }
  }

  // =====================================================
  // WORKFLOW AUTOMATION
  // =====================================================

  async autoAssignTherapist(
    courseId: string,
    sessionDate: string,
    sessionTime: string,
    requiredSpecialization?: string
  ): Promise<AssignmentValidationResult> {
    
    try {
      // Get available therapists with matching specialization
      const query = supabase
        .from('therapists')
        .select('*')
        .eq('status', 'active')

      if (requiredSpecialization) {
        query.or(`specialization_ar.ilike.%${requiredSpecialization}%,specialization_en.ilike.%${requiredSpecialization}%`)
      }

      const { data: therapists, error } = await query

      if (error) throw error

      // Find the best available therapist
      for (const therapist of therapists || []) {
        const validation = await this.validateAssignment(
          therapist.id,
          courseId,
          sessionDate,
          sessionTime,
          'primary'
        )

        if (validation.isValid) {
          // Auto-assign the therapist
          await this.createAssignment(therapist.id, courseId, sessionDate, 'primary')
          
          return {
            isValid: true,
            currentTherapist: `${therapist.first_name_ar} ${therapist.last_name_ar}`,
            requiresSubstitution: false,
            recommendedAction: 'notify_parent_of_change',
            alternativeOptions: []
          }
        }
      }

      // No suitable therapist found
      const alternatives = await this.findAlternativeTherapists({
        course: await this.getCourseData(courseId),
        sessionDate,
        sessionTime
      })

      return {
        isValid: false,
        requiresSubstitution: true,
        recommendedAction: 'escalate_to_supervisor',
        alternativeOptions: alternatives
      }

    } catch (error) {
      console.error('Error in auto-assignment:', error)
      return {
        isValid: false,
        requiresSubstitution: true,
        recommendedAction: 'escalate_to_supervisor',
        alternativeOptions: []
      }
    }
  }

  private async createAssignment(
    therapistId: string,
    courseId: string,
    assignmentDate: string,
    assignmentType: 'primary' | 'assistant' | 'substitute'
  ): Promise<void> {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    await supabase
      .from('course_assignments')
      .insert({
        therapist_id: therapistId,
        course_id: courseId,
        assignment_date: assignmentDate,
        assignment_type: assignmentType,
        status: 'active',
        created_by: user.id
      })
  }
}

// =====================================================
// SERVICE EXPORT
// =====================================================

export const assignmentWorkflowService = {
  // Create validation engine instance
  createValidationEngine(): AssignmentValidationEngine {
    return new AssignmentValidationEngine()
  },

  // Quick validation for single assignment
  async validateAssignment(
    therapistId: string,
    courseId: string,
    sessionDate: string,
    sessionTime: string
  ): Promise<AssignmentValidationResult> {
    
    const engine = new AssignmentValidationEngine()
    return await engine.validateAssignment(therapistId, courseId, sessionDate, sessionTime)
  },

  // Batch validate multiple assignments
  async validateBatchAssignments(assignments: Array<{
    therapistId: string
    courseId: string
    sessionDate: string
    sessionTime: string
  }>): Promise<AssignmentValidationResult[]> {
    
    const engine = new AssignmentValidationEngine()
    const results: AssignmentValidationResult[] = []

    for (const assignment of assignments) {
      const result = await engine.validateAssignment(
        assignment.therapistId,
        assignment.courseId,
        assignment.sessionDate,
        assignment.sessionTime
      )
      results.push(result)
    }

    return results
  },

  // Find optimal assignments for a course
  async findOptimalAssignment(
    courseId: string,
    sessionDate: string,
    preferredTime?: string
  ): Promise<AssignmentValidationResult> {
    
    const engine = new AssignmentValidationEngine()
    return await engine.autoAssignTherapist(courseId, sessionDate, preferredTime || '09:00')
  },

  // Get validation rules for display
  async getAssignmentRules(): Promise<AssignmentWorkflowRule[]> {
    const engine = new AssignmentValidationEngine()
    return engine.getActiveRules()
  },

  // Check therapist workload
  async getTherapistWorkload(therapistId: string, date: string): Promise<{
    totalSessions: number
    totalDuration: number
    capacityUtilization: number
    recommendations: string[]
  }> {
    
    try {
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          duration_minutes,
          course:courses!inner(therapist_id)
        `)
        .eq('course.therapist_id', therapistId)
        .eq('session_date', date)
        .eq('status', 'scheduled')

      if (error) throw error

      const totalSessions = sessions?.length || 0
      const totalDuration = sessions?.reduce((sum, s) => sum + s.duration_minutes, 0) || 0
      const maxDailyMinutes = 8 * 60 // 8 hours
      const capacityUtilization = Math.min((totalDuration / maxDailyMinutes) * 100, 100)

      const recommendations: string[] = []
      
      if (capacityUtilization > 90) {
        recommendations.push('إنذار: تجاوز 90% من الطاقة الاستيعابية اليومية')
      } else if (capacityUtilization > 75) {
        recommendations.push('تحذير: اقتراب من الحد الأقصى للطاقة الاستيعابية')
      }

      if (totalSessions > 8) {
        recommendations.push('عدد الجلسات يتجاوز الحد المسموح (8 جلسات/يوم)')
      }

      return {
        totalSessions,
        totalDuration,
        capacityUtilization,
        recommendations
      }

    } catch (error) {
      console.error('Error calculating workload:', error)
      return {
        totalSessions: 0,
        totalDuration: 0,
        capacityUtilization: 0,
        recommendations: ['خطأ في حساب عبء العمل']
      }
    }
  }
}
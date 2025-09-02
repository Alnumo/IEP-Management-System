/**
 * Provider Scheduling Service
 * خدمة جدولة مقدمي الخدمة
 * 
 * @description Advanced provider assignment and scheduling system with intelligent matching algorithms
 * نظام متقدم لتعيين مقدمي الخدمة والجدولة مع خوارزميات مطابقة ذكية
 */

import { createClient } from '@supabase/supabase-js'
import { 
  ServiceProvider,
  ProviderAvailability,
  ProviderAssignment,
  SchedulingRequest,
  ProviderWorkload,
  ProviderStudentMatch,
  SchedulingResult,
  SchedulingConstraints,
  SchedulingOptions,
  ProviderFilters,
  AvailabilityFilters,
  AssignmentFilters,
  WorkloadStatus,
  AssignmentStatus,
  AvailabilityStatus,
  ProviderRole,
  ServiceCategory,
  ServiceLocation
} from '@/types/provider-scheduling'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// =============================================================================
// SCORING AND WEIGHTING CONFIGURATION
// =============================================================================

interface MatchingWeights {
  qualification_match: number
  experience_match: number
  specialization_match: number
  language_match: number
  availability_match: number
  location_compatibility: number
  workload_balance: number
  historical_success: number
}

const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  qualification_match: 0.25,    // 25% - Provider qualifications match service needs
  experience_match: 0.20,       // 20% - Experience level appropriate for student
  specialization_match: 0.15,   // 15% - Specialized skills match student needs
  language_match: 0.15,         // 15% - Language compatibility
  availability_match: 0.10,     // 10% - Schedule availability
  location_compatibility: 0.05, // 5% - Geographic convenience
  workload_balance: 0.05,       // 5% - Provider workload optimization
  historical_success: 0.05      // 5% - Past success with similar cases
}

// =============================================================================
// MAIN PROVIDER SCHEDULING SERVICE
// =============================================================================

export class ProviderSchedulingService {
  
  // =============================================================================
  // PROVIDER MANAGEMENT
  // =============================================================================

  /**
   * Get service providers with filtering and sorting
   * الحصول على مقدمي الخدمة مع التصفية والترتيب
   */
  static async getProviders(filters: ProviderFilters = {}): Promise<ServiceProvider[]> {
    try {
      let query = supabase
        .from('service_providers')
        .select(`
          *,
          user:auth.users(id, name, email)
        `)

      // Apply filters
      if (filters.provider_roles && filters.provider_roles.length > 0) {
        query = query.or(
          filters.provider_roles.map(role => `primary_role.eq.${role}`).join(',')
        )
      }
      
      if (filters.service_categories && filters.service_categories.length > 0) {
        query = query.overlaps('service_categories', filters.service_categories)
      }
      
      if (filters.qualification_levels && filters.qualification_levels.length > 0) {
        query = query.in('qualification_level', filters.qualification_levels)
      }
      
      if (filters.languages_spoken && filters.languages_spoken.length > 0) {
        query = query.overlaps('languages_spoken', filters.languages_spoken)
      }
      
      if (filters.assignment_status && filters.assignment_status.length > 0) {
        query = query.in('provider_status', filters.assignment_status)
      }
      
      if (filters.service_locations && filters.service_locations.length > 0) {
        query = query.overlaps('service_locations', filters.service_locations)
      }
      
      if (filters.min_rating !== undefined) {
        query = query.gte('performance_rating', filters.min_rating)
      }
      
      if (filters.max_workload_percentage !== undefined) {
        query = query.lte('current_workload_percentage', filters.max_workload_percentage)
      }

      // Order by performance and availability
      query = query.order('performance_rating', { ascending: false })
      query = query.order('current_workload_percentage', { ascending: true })

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch providers: ${error.message}`)
      }

      return data as ServiceProvider[]
    } catch (error) {
      console.error('Error fetching providers:', error)
      throw error
    }
  }

  /**
   * Create or update a service provider
   * إنشاء أو تحديث مقدم خدمة
   */
  static async upsertProvider(providerData: Partial<ServiceProvider>): Promise<ServiceProvider> {
    try {
      // Calculate workload status and availability score
      const processedData = {
        ...providerData,
        workload_status: this.calculateWorkloadStatus(providerData.current_workload_percentage || 0),
        availability_score: await this.calculateAvailabilityScore(providerData.id || ''),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('service_providers')
        .upsert([processedData])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to upsert provider: ${error.message}`)
      }

      return data as ServiceProvider
    } catch (error) {
      console.error('Error upserting provider:', error)
      throw error
    }
  }

  // =============================================================================
  // AVAILABILITY MANAGEMENT
  // =============================================================================

  /**
   * Get provider availability with filtering
   * الحصول على توفر مقدم الخدمة مع التصفية
   */
  static async getProviderAvailability(filters: AvailabilityFilters = {}): Promise<ProviderAvailability[]> {
    try {
      let query = supabase
        .from('provider_availability')
        .select(`
          *,
          provider:service_providers(name_ar, name_en, primary_role)
        `)

      // Apply filters
      if (filters.provider_ids && filters.provider_ids.length > 0) {
        query = query.in('provider_id', filters.provider_ids)
      }
      
      if (filters.date_range) {
        query = query
          .gte('date', filters.date_range.start.toISOString().split('T')[0])
          .lte('date', filters.date_range.end.toISOString().split('T')[0])
      }
      
      if (filters.time_range) {
        query = query
          .gte('start_time', filters.time_range.start_time)
          .lte('end_time', filters.time_range.end_time)
      }
      
      if (filters.days_of_week && filters.days_of_week.length > 0) {
        query = query.in('day_of_week', filters.days_of_week)
      }
      
      if (filters.availability_status && filters.availability_status.length > 0) {
        query = query.in('status', filters.availability_status)
      }
      
      if (filters.service_categories && filters.service_categories.length > 0) {
        query = query.overlaps('available_services', filters.service_categories)
      }
      
      if (filters.service_locations && filters.service_locations.length > 0) {
        query = query.overlaps('available_locations', filters.service_locations)
      }
      
      if (filters.min_capacity !== undefined) {
        query = query.gte('remaining_capacity', filters.min_capacity)
      }

      query = query.order('date', { ascending: true })
      query = query.order('start_time', { ascending: true })

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch availability: ${error.message}`)
      }

      return data as ProviderAvailability[]
    } catch (error) {
      console.error('Error fetching provider availability:', error)
      throw error
    }
  }

  /**
   * Create recurring availability slots
   * إنشاء فتحات توفر متكررة
   */
  static async createRecurringAvailability(
    providerId: string,
    template: {
      start_date: Date
      end_date: Date
      days_of_week: number[]
      time_slots: Array<{ start_time: string; end_time: string }>
      available_services: ServiceCategory[]
      available_locations: ServiceLocation[]
      capacity: number
    }
  ): Promise<ProviderAvailability[]> {
    try {
      const availabilitySlots: Partial<ProviderAvailability>[] = []
      const currentDate = new Date(template.start_date)
      const endDate = new Date(template.end_date)

      // Generate individual availability slots for each day
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay()
        
        if (template.days_of_week.includes(dayOfWeek)) {
          for (const timeSlot of template.time_slots) {
            const slot: Partial<ProviderAvailability> = {
              provider_id: providerId,
              date: currentDate.toISOString().split('T')[0],
              day_of_week: dayOfWeek,
              start_time: timeSlot.start_time,
              end_time: timeSlot.end_time,
              duration_minutes: this.calculateDurationMinutes(timeSlot.start_time, timeSlot.end_time),
              status: 'available',
              available_capacity: template.capacity,
              booked_capacity: 0,
              remaining_capacity: template.capacity,
              is_recurring: true,
              recurrence_pattern: 'weekly',
              available_services: template.available_services,
              available_locations: template.available_locations,
              created_at: new Date().toISOString()
            }
            availabilitySlots.push(slot)
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const { data, error } = await supabase
        .from('provider_availability')
        .insert(availabilitySlots)
        .select()

      if (error) {
        throw new Error(`Failed to create recurring availability: ${error.message}`)
      }

      return data as ProviderAvailability[]
    } catch (error) {
      console.error('Error creating recurring availability:', error)
      throw error
    }
  }

  // =============================================================================
  // PROVIDER ASSIGNMENT MANAGEMENT
  // =============================================================================

  /**
   * Get provider assignments with filtering
   * الحصول على تعيينات مقدم الخدمة مع التصفية
   */
  static async getProviderAssignments(filters: AssignmentFilters = {}): Promise<ProviderAssignment[]> {
    try {
      let query = supabase
        .from('provider_assignments')
        .select(`
          *,
          provider:service_providers(name_ar, name_en, primary_role, performance_rating),
          student:students(name_ar, name_en, student_id),
          service:iep_services(service_name_ar, service_name_en, service_category)
        `)

      // Apply filters
      if (filters.provider_ids && filters.provider_ids.length > 0) {
        query = query.in('provider_id', filters.provider_ids)
      }
      
      if (filters.student_ids && filters.student_ids.length > 0) {
        query = query.in('student_id', filters.student_ids)
      }
      
      if (filters.service_ids && filters.service_ids.length > 0) {
        query = query.in('service_id', filters.service_ids)
      }
      
      if (filters.assignment_types && filters.assignment_types.length > 0) {
        query = query.in('assignment_type', filters.assignment_types)
      }
      
      if (filters.assignment_status && filters.assignment_status.length > 0) {
        query = query.in('assignment_status', filters.assignment_status)
      }
      
      if (filters.service_categories && filters.service_categories.length > 0) {
        query = query.in('service_category', filters.service_categories)
      }
      
      if (filters.date_range) {
        query = query
          .gte('assignment_start_date', filters.date_range.start.toISOString().split('T')[0])
        
        if (filters.date_range.end) {
          query = query.lte('assignment_end_date', filters.date_range.end.toISOString().split('T')[0])
        }
      }
      
      if (filters.priority_levels && filters.priority_levels.length > 0) {
        query = query.in('priority_level', filters.priority_levels)
      }

      query = query.order('priority_level', { ascending: false })
      query = query.order('assignment_start_date', { ascending: true })

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch assignments: ${error.message}`)
      }

      return data as ProviderAssignment[]
    } catch (error) {
      console.error('Error fetching provider assignments:', error)
      throw error
    }
  }

  /**
   * Create a provider assignment with validation
   * إنشاء تعيين مقدم خدمة مع التحقق
   */
  static async createProviderAssignment(
    assignmentData: Partial<ProviderAssignment>
  ): Promise<ProviderAssignment> {
    try {
      // Validate provider availability
      const isAvailable = await this.validateProviderAvailability(
        assignmentData.provider_id!,
        assignmentData.preferred_times || [],
        assignmentData.assignment_start_date!,
        assignmentData.assignment_end_date
      )

      if (!isAvailable) {
        throw new Error('Provider is not available for the requested schedule')
      }

      // Calculate completion percentage
      const completionPercentage = assignmentData.sessions_completed && assignmentData.sessions_planned
        ? Math.round((assignmentData.sessions_completed / assignmentData.sessions_planned) * 100)
        : 0

      const processedData = {
        ...assignmentData,
        completion_percentage: completionPercentage,
        assigned_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('provider_assignments')
        .insert([processedData])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create assignment: ${error.message}`)
      }

      // Update provider workload
      await this.updateProviderWorkload(assignmentData.provider_id!)

      return data as ProviderAssignment
    } catch (error) {
      console.error('Error creating provider assignment:', error)
      throw error
    }
  }

  // =============================================================================
  // INTELLIGENT MATCHING ALGORITHMS
  // =============================================================================

  /**
   * Find optimal provider matches for a student service
   * العثور على أفضل مطابقات مقدم الخدمة للطالب
   */
  static async findOptimalProviderMatches(
    serviceId: string,
    studentId: string,
    requirements: {
      service_category: ServiceCategory
      qualification_requirements?: string[]
      language_preferences?: string[]
      location_preferences?: ServiceLocation[]
      schedule_preferences?: Array<{
        day_of_week: number
        time_range: { start: string; end: string }
      }>
    },
    maxMatches: number = 5,
    weights: Partial<MatchingWeights> = {}
  ): Promise<ProviderStudentMatch[]> {
    try {
      // Get all potentially suitable providers
      const providers = await this.getProviders({
        service_categories: [requirements.service_category],
        assignment_status: ['active'],
        max_workload_percentage: 90 // Don't overload providers
      })

      // Get student information
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*, medical_records(*)')
        .eq('id', studentId)
        .single()

      if (studentError) {
        throw new Error(`Failed to fetch student data: ${studentError.message}`)
      }

      // Calculate matches for each provider
      const matches: ProviderStudentMatch[] = []
      const finalWeights = { ...DEFAULT_MATCHING_WEIGHTS, ...weights }

      for (const provider of providers) {
        const match = await this.calculateProviderStudentMatch(
          provider,
          studentData,
          requirements,
          finalWeights
        )
        
        if (match.match_score > 50) { // Only include reasonable matches
          matches.push(match)
        }
      }

      // Sort by match score and return top matches
      matches.sort((a, b) => b.match_score - a.match_score)
      return matches.slice(0, maxMatches)
    } catch (error) {
      console.error('Error finding optimal provider matches:', error)
      throw error
    }
  }

  /**
   * Calculate detailed match score between provider and student
   * حساب نقاط المطابقة التفصيلية بين مقدم الخدمة والطالب
   */
  private static async calculateProviderStudentMatch(
    provider: ServiceProvider,
    student: any,
    requirements: any,
    weights: MatchingWeights
  ): Promise<ProviderStudentMatch> {
    try {
      // Calculate individual scoring components
      const qualificationMatch = this.calculateQualificationMatch(provider, requirements)
      const experienceMatch = this.calculateExperienceMatch(provider, student)
      const specializationMatch = this.calculateSpecializationMatch(provider, student)
      const languageMatch = this.calculateLanguageMatch(provider, student, requirements)
      const availabilityMatch = await this.calculateAvailabilityMatch(provider, requirements)
      const locationCompatibility = this.calculateLocationCompatibility(provider, requirements)
      const workloadBalance = this.calculateWorkloadBalance(provider)
      const historicalSuccess = await this.calculateHistoricalSuccess(provider.id, requirements.service_category)

      // Calculate weighted total score
      const matchScore = Math.round(
        (qualificationMatch * weights.qualification_match +
         experienceMatch * weights.experience_match +
         specializationMatch * weights.specialization_match +
         languageMatch * weights.language_match +
         availabilityMatch * weights.availability_match +
         locationCompatibility * weights.location_compatibility +
         workloadBalance * weights.workload_balance +
         historicalSuccess * weights.historical_success) * 100
      )

      // Identify potential concerns
      const concerns = []
      if (qualificationMatch < 0.8) {
        concerns.push({
          type: 'qualification_gap' as const,
          severity: 'medium' as const,
          description: 'Provider qualification may not fully match service requirements'
        })
      }
      if (availabilityMatch < 0.6) {
        concerns.push({
          type: 'scheduling_conflict' as const,
          severity: 'high' as const,
          description: 'Limited availability match with preferred schedule'
        })
      }
      if (provider.current_workload_percentage > 85) {
        concerns.push({
          type: 'workload_concern' as const,
          severity: 'medium' as const,
          description: 'Provider has high current workload'
        })
      }

      return {
        provider_id: provider.id,
        student_id: student.id,
        match_score: matchScore,
        qualification_match: Math.round(qualificationMatch * 100),
        experience_match: Math.round(experienceMatch * 100),
        specialization_match: Math.round(specializationMatch * 100),
        language_match: Math.round(languageMatch * 100),
        availability_match: Math.round(availabilityMatch * 100),
        location_compatibility: Math.round(locationCompatibility * 100),
        personality_fit: 75, // Placeholder - would use ML/historical data
        identified_concerns: concerns,
        recommended_trial_period: this.calculateTrialPeriod(matchScore),
        suggested_session_frequency: this.suggestSessionFrequency(requirements, provider),
        preferred_locations: this.getPreferredLocations(provider, requirements),
        collaboration_requirements: this.getCollaborationRequirements(student, provider),
        previous_assignments: 0, // Would query assignment history
        success_rate_with_similar_cases: historicalSuccess * 100,
        average_goal_achievement_time: 12, // weeks, based on service category
        calculated_at: new Date().toISOString(),
        calculation_version: '1.0',
        expires_at: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours
      }
    } catch (error) {
      console.error('Error calculating provider-student match:', error)
      throw error
    }
  }

  // =============================================================================
  // SCHEDULING ALGORITHM
  // =============================================================================

  /**
   * Process scheduling request with intelligent optimization
   * معالجة طلب الجدولة مع التحسين الذكي
   */
  static async processSchedulingRequest(
    request: Partial<SchedulingRequest>,
    constraints: SchedulingConstraints = {},
    options: SchedulingOptions = {
      optimization_goal: 'balance_workload',
      allow_partial_scheduling: true,
      max_alternatives: 3,
      scoring_weights: {
        time_preference: 0.3,
        provider_preference: 0.25,
        location_convenience: 0.2,
        schedule_efficiency: 0.25
      },
      time_flexibility_minutes: 30,
      allow_different_providers: true,
      allow_alternative_locations: true,
      consider_substitute_providers: false
    }
  ): Promise<SchedulingResult> {
    try {
      // Get available providers based on requirements
      const availableProviders = await this.findAvailableProviders(
        request.requested_service_category!,
        request.target_start_date!,
        request.preferred_times || [],
        constraints
      )

      if (availableProviders.length === 0) {
        return {
          success: false,
          confidence_score: 0,
          scheduled_sessions: [],
          scheduling_conflicts: [{
            type: 'provider_unavailable',
            description: 'No providers available for the requested schedule',
            suggested_alternatives: ['Consider alternative time slots', 'Expand location preferences']
          }],
          total_travel_time: 0,
          provider_utilization: {},
          schedule_efficiency: 0,
          student_satisfaction_score: 0
        }
      }

      // Generate optimal schedule using algorithm
      const schedulingResult = await this.generateOptimalSchedule(
        request,
        availableProviders,
        constraints,
        options
      )

      return schedulingResult
    } catch (error) {
      console.error('Error processing scheduling request:', error)
      throw error
    }
  }

  /**
   * Generate optimal schedule using advanced algorithms
   * إنشاء جدول مثالي باستخدام خوارزميات متقدمة
   */
  private static async generateOptimalSchedule(
    request: Partial<SchedulingRequest>,
    providers: ServiceProvider[],
    constraints: SchedulingConstraints,
    options: SchedulingOptions
  ): Promise<SchedulingResult> {
    try {
      const scheduledSessions = []
      const conflicts = []
      let totalTravelTime = 0
      const providerUtilization: Record<string, number> = {}

      // Algorithm: Greedy scheduling with optimization
      for (let week = 0; week < 12; week++) { // Plan for 12 weeks
        for (const timePreference of request.preferred_times || []) {
          // Find best provider for this time slot
          let bestProvider: ServiceProvider | null = null
          let bestScore = 0

          for (const provider of providers) {
            const score = await this.calculateSchedulingScore(
              provider,
              timePreference,
              request,
              options.scoring_weights
            )

            if (score > bestScore) {
              bestScore = score
              bestProvider = provider
            }
          }

          if (bestProvider && bestScore > 0.6) {
            const sessionDate = this.calculateSessionDate(
              request.target_start_date!,
              week,
              timePreference.day_of_week
            )

            scheduledSessions.push({
              provider_id: bestProvider.id,
              date: sessionDate,
              start_time: timePreference.start_time,
              end_time: timePreference.end_time,
              location: request.preferred_locations?.[0] || 'therapy_room' as ServiceLocation,
              match_score: Math.round(bestScore * 100)
            })

            // Update utilization tracking
            providerUtilization[bestProvider.id] = 
              (providerUtilization[bestProvider.id] || 0) + 
              this.calculateSessionDuration(timePreference.start_time, timePreference.end_time)
          } else {
            conflicts.push({
              type: 'provider_unavailable' as const,
              description: `No suitable provider available for ${timePreference.day_of_week} at ${timePreference.start_time}`,
              suggested_alternatives: ['Consider different time slots', 'Allow substitute providers']
            })
          }
        }
      }

      const confidenceScore = scheduledSessions.length > 0 
        ? Math.round((scheduledSessions.length / ((request.preferred_times?.length || 1) * 12)) * 100)
        : 0

      return {
        success: scheduledSessions.length > 0,
        confidence_score: confidenceScore,
        scheduled_sessions: scheduledSessions,
        scheduling_conflicts: conflicts,
        total_travel_time: totalTravelTime,
        provider_utilization: providerUtilization,
        schedule_efficiency: confidenceScore,
        student_satisfaction_score: this.estimateStudentSatisfaction(scheduledSessions, request)
      }
    } catch (error) {
      console.error('Error generating optimal schedule:', error)
      throw error
    }
  }

  // =============================================================================
  // WORKLOAD MANAGEMENT
  // =============================================================================

  /**
   * Calculate and update provider workload metrics
   * حساب وتحديث مقاييس عبء العمل لمقدم الخدمة
   */
  static async updateProviderWorkload(providerId: string): Promise<ProviderWorkload> {
    try {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      // Get provider assignments and sessions
      const assignments = await this.getProviderAssignments({ provider_ids: [providerId] })
      const availability = await this.getProviderAvailability({
        provider_ids: [providerId],
        date_range: { start: weekStart, end: weekEnd }
      })

      // Calculate workload metrics
      const totalAvailableHours = availability.reduce((total, slot) => 
        total + (slot.duration_minutes / 60), 0
      )

      const scheduledHours = assignments.reduce((total, assignment) => 
        total + ((assignment.service_frequency * assignment.session_duration) / 60), 0
      )

      const utilizationPercentage = totalAvailableHours > 0 
        ? Math.round((scheduledHours / totalAvailableHours) * 100)
        : 0

      const workload: ProviderWorkload = {
        provider_id: providerId,
        calculation_period: {
          start_date: weekStart.toISOString(),
          end_date: weekEnd.toISOString(),
          period_type: 'weekly'
        },
        total_available_hours: totalAvailableHours,
        scheduled_hours: scheduledHours,
        utilized_hours: scheduledHours, // Simplified - would track actual
        utilization_percentage: utilizationPercentage,
        total_sessions: assignments.reduce((total, a) => total + (a.sessions_planned || 0), 0),
        completed_sessions: assignments.reduce((total, a) => total + (a.sessions_completed || 0), 0),
        cancelled_sessions: 0, // Would calculate from session data
        no_show_sessions: 0,
        sessions_by_day: {},
        hours_by_service_type: {},
        students_served: assignments.length,
        locations_covered: [],
        average_session_duration: assignments.length > 0 
          ? assignments.reduce((total, a) => total + a.session_duration, 0) / assignments.length
          : 0,
        travel_time_percentage: 10, // Estimated
        break_time_percentage: 15,
        administrative_time_percentage: 10,
        session_completion_rate: assignments.length > 0 
          ? (assignments.reduce((total, a) => total + (a.sessions_completed || 0), 0) / 
             assignments.reduce((total, a) => total + (a.sessions_planned || 0), 0)) * 100
          : 100,
        student_satisfaction_average: 4.2, // Would calculate from feedback
        parent_satisfaction_average: 4.1,
        peer_collaboration_score: 4.0,
        workload_status: this.calculateWorkloadStatus(utilizationPercentage),
        recommendations: this.generateWorkloadRecommendations(utilizationPercentage, assignments.length),
        calculated_at: new Date().toISOString(),
        calculated_by: 'system'
      }

      // Update provider record with new workload data
      await supabase
        .from('service_providers')
        .update({
          current_workload_percentage: utilizationPercentage,
          workload_status: workload.workload_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId)

      return workload
    } catch (error) {
      console.error('Error updating provider workload:', error)
      throw error
    }
  }

  // =============================================================================
  // UTILITY AND CALCULATION METHODS
  // =============================================================================

  private static calculateWorkloadStatus(utilizationPercentage: number): WorkloadStatus {
    if (utilizationPercentage < 70) return 'underutilized'
    if (utilizationPercentage <= 85) return 'optimal'
    if (utilizationPercentage <= 95) return 'overloaded'
    return 'critical'
  }

  private static async calculateAvailabilityScore(providerId: string): Promise<number> {
    try {
      // Calculate availability score based on schedule efficiency
      const availability = await this.getProviderAvailability({ provider_ids: [providerId] })
      const totalSlots = availability.length
      const availableSlots = availability.filter(a => a.remaining_capacity > 0).length
      
      return totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0
    } catch (error) {
      console.error('Error calculating availability score:', error)
      return 0
    }
  }

  private static calculateDurationMinutes(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
  }

  private static async validateProviderAvailability(
    providerId: string,
    preferredTimes: Array<{ day_of_week: number; start_time: string; end_time: string }>,
    startDate: string,
    endDate?: string
  ): Promise<boolean> {
    try {
      // Simplified validation - check if provider has matching availability
      const availability = await this.getProviderAvailability({
        provider_ids: [providerId],
        date_range: { start: new Date(startDate), end: new Date(endDate || startDate) }
      })

      return preferredTimes.every(timeSlot => 
        availability.some(slot => 
          slot.day_of_week === timeSlot.day_of_week &&
          slot.start_time <= timeSlot.start_time &&
          slot.end_time >= timeSlot.end_time &&
          slot.remaining_capacity > 0
        )
      )
    } catch (error) {
      console.error('Error validating provider availability:', error)
      return false
    }
  }

  // Scoring calculation methods (simplified implementations)
  private static calculateQualificationMatch(provider: ServiceProvider, requirements: any): number {
    if (provider.service_categories.includes(requirements.service_category)) {
      return 0.9 + (provider.qualification_level === 'expert' ? 0.1 : 0)
    }
    return provider.secondary_roles.includes(requirements.service_category) ? 0.7 : 0.3
  }

  private static calculateExperienceMatch(provider: ServiceProvider, student: any): number {
    // Simplified - would use more sophisticated matching based on case complexity
    const experienceScore = {
      'entry_level': 0.6,
      'experienced': 0.8,
      'senior': 0.9,
      'specialist': 0.95,
      'expert': 1.0,
      'consultant': 1.0
    }[provider.qualification_level] || 0.5

    return Math.min(experienceScore + (provider.performance_rating / 5) * 0.2, 1.0)
  }

  private static calculateSpecializationMatch(provider: ServiceProvider, student: any): number {
    // Would match provider specializations with student needs
    return provider.specializations.length > 0 ? 0.8 : 0.5
  }

  private static calculateLanguageMatch(provider: ServiceProvider, student: any, requirements: any): number {
    const preferredLanguages = requirements.language_preferences || ['ar']
    const commonLanguages = provider.languages_spoken.filter(lang => preferredLanguages.includes(lang))
    return commonLanguages.length > 0 ? 1.0 : 0.3
  }

  private static async calculateAvailabilityMatch(provider: ServiceProvider, requirements: any): Promise<number> {
    // Simplified availability matching
    return 0.8 // Would calculate based on actual availability overlap
  }

  private static calculateLocationCompatibility(provider: ServiceProvider, requirements: any): number {
    const preferredLocations = requirements.location_preferences || []
    const commonLocations = provider.service_locations.filter(loc => preferredLocations.includes(loc))
    return commonLocations.length > 0 ? 1.0 : 0.6
  }

  private static calculateWorkloadBalance(provider: ServiceProvider): number {
    // Favor providers with balanced workload
    const workload = provider.current_workload_percentage
    if (workload >= 70 && workload <= 85) return 1.0
    if (workload >= 60 && workload < 70) return 0.8
    if (workload >= 85 && workload < 95) return 0.6
    return 0.3
  }

  private static async calculateHistoricalSuccess(providerId: string, serviceCategory: ServiceCategory): Promise<number> {
    // Would calculate based on historical outcomes
    return 0.75 // Placeholder
  }

  private static calculateTrialPeriod(matchScore: number): number {
    if (matchScore >= 90) return 4  // weeks
    if (matchScore >= 80) return 6
    if (matchScore >= 70) return 8
    return 12
  }

  private static suggestSessionFrequency(requirements: any, provider: ServiceProvider): number {
    return requirements.requested_frequency || 2 // sessions per week
  }

  private static getPreferredLocations(provider: ServiceProvider, requirements: any): ServiceLocation[] {
    return requirements.location_preferences?.filter((loc: ServiceLocation) => 
      provider.service_locations.includes(loc)
    ) || provider.service_locations
  }

  private static getCollaborationRequirements(student: any, provider: ServiceProvider): string[] {
    // Would determine collaboration needs based on student complexity
    return ['weekly_progress_review', 'parent_updates']
  }

  private static generateWorkloadRecommendations(utilization: number, studentCount: number): Array<any> {
    const recommendations = []
    
    if (utilization < 70) {
      recommendations.push({
        type: 'increase_capacity',
        priority: 'medium',
        description_ar: 'يمكن زيادة عدد الطلاب المخصصين',
        description_en: 'Can accommodate more student assignments'
      })
    }
    
    if (utilization > 90) {
      recommendations.push({
        type: 'reduce_load',
        priority: 'high',
        description_ar: 'تقليل عبء العمل لتجنب الإرهاق',
        description_en: 'Reduce workload to prevent burnout'
      })
    }
    
    return recommendations
  }

  // Additional helper methods for scheduling algorithm
  private static async findAvailableProviders(
    serviceCategory: ServiceCategory,
    targetDate: string,
    preferredTimes: any[],
    constraints: SchedulingConstraints
  ): Promise<ServiceProvider[]> {
    return await this.getProviders({
      service_categories: [serviceCategory],
      assignment_status: ['active'],
      max_workload_percentage: 90
    })
  }

  private static async calculateSchedulingScore(
    provider: ServiceProvider,
    timePreference: any,
    request: Partial<SchedulingRequest>,
    weights: any
  ): Promise<number> {
    // Simplified scheduling score calculation
    return 0.8 // Would implement sophisticated scoring
  }

  private static calculateSessionDate(startDate: string, week: number, dayOfWeek: number): string {
    const date = new Date(startDate)
    date.setDate(date.getDate() + (week * 7) + dayOfWeek)
    return date.toISOString().split('T')[0]
  }

  private static calculateSessionDuration(startTime: string, endTime: string): number {
    return this.calculateDurationMinutes(startTime, endTime)
  }

  private static estimateStudentSatisfaction(sessions: any[], request: any): number {
    // Would calculate based on preference matching
    return sessions.length > 0 ? 85 : 0
  }
}
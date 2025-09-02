import { supabase } from '@/lib/supabase'
import type {
  StudentEnrollment,
  TherapyPlan,
  ScheduledSession,
  ProgramModification,
  ModificationImpactAnalysis,
  ScheduleAdjustment,
  ImpactSeverity,
  ModificationType,
  ResourceReallocation,
  TherapistWorkloadAdjustment
} from '@/types/scheduling'

/**
 * Program Modification Impact Analysis Service
 * 
 * Analyzes the impact of program modifications on existing schedules,
 * therapist workloads, resource allocations, and student progress.
 * Provides detailed impact assessments and adjustment recommendations.
 */

// Impact analysis configuration
const IMPACT_ANALYSIS_CONFIG = {
  // Thresholds for severity classification
  severity_thresholds: {
    low: { affected_sessions: 5, therapist_count: 1, schedule_disruption: 0.1 },
    medium: { affected_sessions: 15, therapist_count: 3, schedule_disruption: 0.3 },
    high: { affected_sessions: 30, therapist_count: 5, schedule_disruption: 0.5 }
  },
  
  // Analysis time horizons
  analysis_periods: {
    immediate: 7, // days
    short_term: 30, // days
    long_term: 90 // days
  },
  
  // Modification types and their typical impacts
  modification_impact_weights: {
    frequency_change: 0.8,
    duration_change: 0.6,
    therapist_change: 0.9,
    location_change: 0.4,
    time_slot_change: 0.7,
    service_type_change: 1.0
  }
} as const

/**
 * Analyzes the comprehensive impact of program modifications
 */
export async function analyzeModificationImpact(
  modificationRequest: {
    enrollment_id: string
    modification_type: ModificationType[]
    proposed_changes: {
      new_frequency?: number
      new_duration?: number
      new_therapist_id?: string
      new_location_id?: string
      new_time_preferences?: string[]
      new_service_types?: string[]
      effective_date: string
    }
    analysis_scope: 'immediate' | 'short_term' | 'long_term' | 'all'
    include_alternatives: boolean
  }
): Promise<{
  success: boolean
  data?: {
    impact_analysis: ModificationImpactAnalysis
    affected_sessions: ScheduledSession[]
    therapist_impacts: TherapistWorkloadAdjustment[]
    resource_reallocations: ResourceReallocation[]
    schedule_adjustments: ScheduleAdjustment[]
    cost_implications: {
      additional_costs: number
      cost_savings: number
      net_impact: number
    }
    timeline_impact: {
      immediate: ModificationImpactAnalysis
      short_term?: ModificationImpactAnalysis
      long_term?: ModificationImpactAnalysis
    }
    recommendations: {
      priority: 'high' | 'medium' | 'low'
      actions: string[]
      alternatives: string[]
      risks: string[]
    }
  }
  error?: string
}> {
  try {
    // Get current enrollment and related data
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_enrollments')
      .select(`
        *,
        students(*),
        therapy_plans(*),
        scheduled_sessions(*)
      `)
      .eq('id', modificationRequest.enrollment_id)
      .single()

    if (enrollmentError || !enrollment) {
      return { success: false, error: 'Enrollment not found' }
    }

    // Analyze different time horizons
    const timelineAnalysis = await Promise.all([
      analyzeImpactForPeriod(enrollment, modificationRequest, 'immediate'),
      modificationRequest.analysis_scope !== 'immediate' ? 
        analyzeImpactForPeriod(enrollment, modificationRequest, 'short_term') : 
        Promise.resolve(null),
      modificationRequest.analysis_scope === 'all' || modificationRequest.analysis_scope === 'long_term' ? 
        analyzeImpactForPeriod(enrollment, modificationRequest, 'long_term') : 
        Promise.resolve(null)
    ])

    const [immediate, shortTerm, longTerm] = timelineAnalysis

    // Get affected sessions across all periods
    const affectedSessions = await getAffectedSessions(
      enrollment,
      modificationRequest,
      modificationRequest.analysis_scope
    )

    // Analyze therapist workload impacts
    const therapistImpacts = await analyzeTherapistWorkloadImpacts(
      enrollment,
      modificationRequest,
      affectedSessions
    )

    // Analyze resource reallocation needs
    const resourceReallocations = await analyzeResourceReallocations(
      enrollment,
      modificationRequest,
      affectedSessions
    )

    // Generate schedule adjustments
    const scheduleAdjustments = await generateScheduleAdjustments(
      enrollment,
      modificationRequest,
      affectedSessions
    )

    // Calculate cost implications
    const costImplications = await calculateCostImplications(
      enrollment,
      modificationRequest,
      affectedSessions
    )

    // Generate recommendations
    const recommendations = await generateModificationRecommendations(
      immediate,
      shortTerm,
      longTerm,
      therapistImpacts,
      resourceReallocations,
      costImplications
    )

    // Compile comprehensive analysis
    const impactAnalysis: ModificationImpactAnalysis = {
      modification_id: crypto.randomUUID(),
      enrollment_id: modificationRequest.enrollment_id,
      modification_types: modificationRequest.modification_type,
      analysis_date: new Date().toISOString(),
      overall_severity: calculateOverallSeverity(immediate, shortTerm, longTerm),
      affected_session_count: affectedSessions.length,
      affected_therapist_count: new Set(therapistImpacts.map(t => t.therapist_id)).size,
      schedule_disruption_percentage: immediate.schedule_disruption_percentage,
      estimated_adjustment_time: calculateAdjustmentTime(immediate, therapistImpacts, resourceReallocations),
      stakeholder_notifications_required: generateStakeholderNotifications(
        immediate,
        therapistImpacts,
        affectedSessions
      )
    }

    return {
      success: true,
      data: {
        impact_analysis: impactAnalysis,
        affected_sessions: affectedSessions,
        therapist_impacts: therapistImpacts,
        resource_reallocations: resourceReallocations,
        schedule_adjustments: scheduleAdjustments,
        cost_implications: costImplications,
        timeline_impact: {
          immediate,
          short_term: shortTerm || undefined,
          long_term: longTerm || undefined
        },
        recommendations
      }
    }

  } catch (error) {
    console.error('Error analyzing modification impact:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Analyzes impact for a specific time period
 */
async function analyzeImpactForPeriod(
  enrollment: any,
  modificationRequest: any,
  period: 'immediate' | 'short_term' | 'long_term'
): Promise<ModificationImpactAnalysis> {
  const periodDays = IMPACT_ANALYSIS_CONFIG.analysis_periods[period]
  const effectiveDate = new Date(modificationRequest.proposed_changes.effective_date)
  const endDate = new Date(effectiveDate.getTime() + (periodDays * 24 * 60 * 60 * 1000))

  // Get sessions in this period
  const { data: periodSessions } = await supabase
    .from('scheduled_sessions')
    .select('*')
    .eq('enrollment_id', enrollment.id)
    .gte('session_date', effectiveDate.toISOString().split('T')[0])
    .lte('session_date', endDate.toISOString().split('T')[0])
    .order('session_date', { ascending: true })

  const sessionsInPeriod = periodSessions || []
  
  // Calculate disruption metrics
  const totalSessionsInPeriod = sessionsInPeriod.length
  const affectedSessionsCount = calculateAffectedSessionsInPeriod(
    sessionsInPeriod,
    modificationRequest.modification_type
  )
  
  const disruptionPercentage = totalSessionsInPeriod > 0 ? 
    (affectedSessionsCount / totalSessionsInPeriod) : 0

  // Analyze specific modification impacts
  const modificationImpacts = await analyzeSpecificModificationImpacts(
    enrollment,
    modificationRequest,
    sessionsInPeriod
  )

  return {
    modification_id: crypto.randomUUID(),
    enrollment_id: enrollment.id,
    modification_types: modificationRequest.modification_type,
    analysis_date: new Date().toISOString(),
    overall_severity: calculateSeverityForPeriod(disruptionPercentage, affectedSessionsCount),
    affected_session_count: affectedSessionsCount,
    affected_therapist_count: modificationImpacts.affected_therapists.length,
    schedule_disruption_percentage: disruptionPercentage,
    estimated_adjustment_time: modificationImpacts.estimated_hours,
    stakeholder_notifications_required: modificationImpacts.notifications_needed
  }
}

/**
 * Gets all sessions affected by the modification
 */
async function getAffectedSessions(
  enrollment: any,
  modificationRequest: any,
  scope: string
): Promise<ScheduledSession[]> {
  const effectiveDate = new Date(modificationRequest.proposed_changes.effective_date)
  let endDate: Date

  switch (scope) {
    case 'immediate':
      endDate = new Date(effectiveDate.getTime() + (7 * 24 * 60 * 60 * 1000))
      break
    case 'short_term':
      endDate = new Date(effectiveDate.getTime() + (30 * 24 * 60 * 60 * 1000))
      break
    case 'long_term':
    case 'all':
      endDate = new Date(effectiveDate.getTime() + (90 * 24 * 60 * 60 * 1000))
      break
    default:
      endDate = new Date(effectiveDate.getTime() + (30 * 24 * 60 * 60 * 1000))
  }

  const { data: sessions, error } = await supabase
    .from('scheduled_sessions')
    .select(`
      *,
      therapists(*),
      therapy_rooms(*)
    `)
    .eq('enrollment_id', enrollment.id)
    .gte('session_date', effectiveDate.toISOString().split('T')[0])
    .lte('session_date', endDate.toISOString().split('T')[0])
    .order('session_date', { ascending: true })

  if (error) {
    console.error('Error fetching affected sessions:', error)
    return []
  }

  return sessions || []
}

/**
 * Analyzes therapist workload impacts
 */
async function analyzeTherapistWorkloadImpacts(
  enrollment: any,
  modificationRequest: any,
  affectedSessions: ScheduledSession[]
): Promise<TherapistWorkloadAdjustment[]> {
  const therapistIds = new Set<string>()
  
  // Collect current therapists
  affectedSessions.forEach(session => {
    if (session.therapist_id) {
      therapistIds.add(session.therapist_id)
    }
  })

  // Add proposed new therapist if changing
  if (modificationRequest.proposed_changes.new_therapist_id) {
    therapistIds.add(modificationRequest.proposed_changes.new_therapist_id)
  }

  const workloadAdjustments: TherapistWorkloadAdjustment[] = []

  for (const therapistId of therapistIds) {
    // Get current workload for this therapist
    const { data: currentSessions } = await supabase
      .from('scheduled_sessions')
      .select('*')
      .eq('therapist_id', therapistId)
      .gte('session_date', new Date().toISOString().split('T')[0])

    const currentWorkload = currentSessions?.length || 0
    
    // Calculate impact based on modification type
    let workloadChange = 0
    let impactSeverity: ImpactSeverity = 'low'

    if (modificationRequest.modification_type.includes('frequency_change')) {
      const currentFreq = enrollment.frequency_per_week
      const newFreq = modificationRequest.proposed_changes.new_frequency || currentFreq
      workloadChange = (newFreq - currentFreq) * 4 // Monthly impact
    }

    if (modificationRequest.modification_type.includes('therapist_change')) {
      if (modificationRequest.proposed_changes.new_therapist_id === therapistId) {
        // This therapist is gaining sessions
        workloadChange += affectedSessions.length
      } else if (affectedSessions.some(s => s.therapist_id === therapistId)) {
        // This therapist is losing sessions
        workloadChange -= affectedSessions.filter(s => s.therapist_id === therapistId).length
      }
    }

    // Determine impact severity
    const workloadChangePercentage = currentWorkload > 0 ? Math.abs(workloadChange) / currentWorkload : 0
    if (workloadChangePercentage > 0.3) {
      impactSeverity = 'high'
    } else if (workloadChangePercentage > 0.15) {
      impactSeverity = 'medium'
    }

    workloadAdjustments.push({
      therapist_id: therapistId,
      current_workload: currentWorkload,
      workload_change: workloadChange,
      new_projected_workload: currentWorkload + workloadChange,
      impact_severity: impactSeverity,
      adjustment_required: Math.abs(workloadChange) > 0,
      affected_time_slots: affectedSessions
        .filter(s => s.therapist_id === therapistId)
        .map(s => ({ date: s.session_date, start_time: s.start_time, end_time: s.end_time }))
    })
  }

  return workloadAdjustments
}

/**
 * Analyzes resource reallocation needs
 */
async function analyzeResourceReallocations(
  enrollment: any,
  modificationRequest: any,
  affectedSessions: ScheduledSession[]
): Promise<ResourceReallocation[]> {
  const reallocations: ResourceReallocation[] = []

  // Analyze room changes
  if (modificationRequest.modification_type.includes('location_change')) {
    const currentRooms = new Set(affectedSessions.map(s => s.room_id).filter(Boolean))
    
    for (const roomId of currentRooms) {
      const { data: roomData } = await supabase
        .from('therapy_rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (roomData) {
        reallocations.push({
          resource_type: 'room',
          resource_id: roomId,
          current_allocation: affectedSessions.filter(s => s.room_id === roomId).length,
          required_reallocation: affectedSessions.filter(s => s.room_id === roomId).length,
          impact_severity: calculateResourceImpactSeverity(
            affectedSessions.filter(s => s.room_id === roomId).length,
            'room'
          ),
          alternative_resources: await findAlternativeRooms(roomId, affectedSessions),
          reallocation_timeline: calculateReallocationTimeline('room')
        })
      }
    }
  }

  // Analyze equipment needs
  if (modificationRequest.modification_type.includes('service_type_change')) {
    // Get equipment requirements for new service types
    const newServiceTypes = modificationRequest.proposed_changes.new_service_types || []
    
    for (const serviceType of newServiceTypes) {
      const equipmentNeeds = await getEquipmentRequirements(serviceType)
      
      for (const equipment of equipmentNeeds) {
        reallocations.push({
          resource_type: 'equipment',
          resource_id: equipment.id,
          current_allocation: 0,
          required_reallocation: affectedSessions.length,
          impact_severity: 'medium',
          alternative_resources: await findAlternativeEquipment(equipment.id),
          reallocation_timeline: calculateReallocationTimeline('equipment')
        })
      }
    }
  }

  return reallocations
}

/**
 * Generates schedule adjustments needed for the modification
 */
async function generateScheduleAdjustments(
  enrollment: any,
  modificationRequest: any,
  affectedSessions: ScheduledSession[]
): Promise<ScheduleAdjustment[]> {
  const adjustments: ScheduleAdjustment[] = []

  // Generate adjustments based on modification type
  for (const modificationType of modificationRequest.modification_type) {
    switch (modificationType) {
      case 'frequency_change':
        adjustments.push(...await generateFrequencyAdjustments(
          enrollment,
          modificationRequest,
          affectedSessions
        ))
        break

      case 'duration_change':
        adjustments.push(...await generateDurationAdjustments(
          enrollment,
          modificationRequest,
          affectedSessions
        ))
        break

      case 'therapist_change':
        adjustments.push(...await generateTherapistAdjustments(
          enrollment,
          modificationRequest,
          affectedSessions
        ))
        break

      case 'time_slot_change':
        adjustments.push(...await generateTimeSlotAdjustments(
          enrollment,
          modificationRequest,
          affectedSessions
        ))
        break

      case 'location_change':
        adjustments.push(...await generateLocationAdjustments(
          enrollment,
          modificationRequest,
          affectedSessions
        ))
        break

      case 'service_type_change':
        adjustments.push(...await generateServiceTypeAdjustments(
          enrollment,
          modificationRequest,
          affectedSessions
        ))
        break
    }
  }

  return adjustments
}

/**
 * Calculates cost implications of the modification
 */
async function calculateCostImplications(
  enrollment: any,
  modificationRequest: any,
  affectedSessions: ScheduledSession[]
): Promise<{
  additional_costs: number
  cost_savings: number
  net_impact: number
}> {
  let additionalCosts = 0
  let costSavings = 0

  // Calculate frequency change costs
  if (modificationRequest.modification_type.includes('frequency_change')) {
    const currentFreq = enrollment.frequency_per_week
    const newFreq = modificationRequest.proposed_changes.new_frequency || currentFreq
    const frequencyDiff = newFreq - currentFreq
    const sessionCost = enrollment.session_rate || 0

    if (frequencyDiff > 0) {
      additionalCosts += frequencyDiff * sessionCost * 4 // Monthly additional cost
    } else {
      costSavings += Math.abs(frequencyDiff) * sessionCost * 4 // Monthly savings
    }
  }

  // Calculate duration change costs
  if (modificationRequest.modification_type.includes('duration_change')) {
    const currentDuration = enrollment.session_duration
    const newDuration = modificationRequest.proposed_changes.new_duration || currentDuration
    const durationDiff = newDuration - currentDuration
    const hourlyRate = (enrollment.session_rate || 0) / (currentDuration / 60)

    if (durationDiff > 0) {
      additionalCosts += (durationDiff / 60) * hourlyRate * affectedSessions.length
    } else {
      costSavings += Math.abs(durationDiff / 60) * hourlyRate * affectedSessions.length
    }
  }

  // Calculate therapist change costs
  if (modificationRequest.modification_type.includes('therapist_change')) {
    // Therapist change may incur administrative costs
    additionalCosts += 50 // Administrative fee for therapist changes
  }

  return {
    additional_costs: additionalCosts,
    cost_savings: costSavings,
    net_impact: additionalCosts - costSavings
  }
}

/**
 * Generates modification recommendations
 */
async function generateModificationRecommendations(
  immediate: ModificationImpactAnalysis,
  shortTerm: ModificationImpactAnalysis | null,
  longTerm: ModificationImpactAnalysis | null,
  therapistImpacts: TherapistWorkloadAdjustment[],
  resourceReallocations: ResourceReallocation[],
  costImplications: any
): Promise<{
  priority: 'high' | 'medium' | 'low'
  actions: string[]
  alternatives: string[]
  risks: string[]
}> {
  const actions: string[] = []
  const alternatives: string[] = []
  const risks: string[] = []

  // Determine priority based on overall impact
  let priority: 'high' | 'medium' | 'low' = 'low'
  
  if (immediate.overall_severity === 'high' || 
      therapistImpacts.some(t => t.impact_severity === 'high') ||
      resourceReallocations.some(r => r.impact_severity === 'high')) {
    priority = 'high'
  } else if (immediate.overall_severity === 'medium' || 
             therapistImpacts.some(t => t.impact_severity === 'medium')) {
    priority = 'medium'
  }

  // Generate actions
  if (immediate.affected_session_count > 10) {
    actions.push('إشعار جميع الأطراف المعنية قبل 48 ساعة على الأقل من التغيير')
    actions.push('Notify all stakeholders at least 48 hours before the change')
  }

  if (therapistImpacts.some(t => t.workload_change > 5)) {
    actions.push('مراجعة أعباء العمل للمعالجين المتأثرين')
    actions.push('Review workload for affected therapists')
  }

  if (resourceReallocations.length > 0) {
    actions.push('التأكد من توفر الموارد البديلة')
    actions.push('Ensure alternative resources are available')
  }

  // Generate alternatives
  if (priority === 'high') {
    alternatives.push('تنفيذ التغيير على مراحل لتقليل التأثير')
    alternatives.push('Implement change in phases to reduce impact')
    alternatives.push('تأجيل التنفيذ لفترة أقل ازدحاماً')
    alternatives.push('Delay implementation to less busy period')
  }

  // Generate risks
  if (immediate.schedule_disruption_percentage > 0.3) {
    risks.push('اضطراب كبير في الجدولة قد يؤثر على جودة الخدمة')
    risks.push('Major schedule disruption may affect service quality')
  }

  if (costImplications.net_impact > 1000) {
    risks.push('تأثير مالي كبير على التكاليف')
    risks.push('Significant financial impact on costs')
  }

  return { priority, actions, alternatives, risks }
}

// Helper functions

function calculateAffectedSessionsInPeriod(
  sessions: any[],
  modificationTypes: ModificationType[]
): number {
  return sessions.filter(session => {
    return modificationTypes.some(type => {
      switch (type) {
        case 'frequency_change':
        case 'duration_change':
        case 'time_slot_change':
        case 'service_type_change':
          return true
        case 'therapist_change':
          return session.therapist_id !== null
        case 'location_change':
          return session.room_id !== null
        default:
          return false
      }
    })
  }).length
}

function calculateSeverityForPeriod(
  disruptionPercentage: number,
  affectedSessionsCount: number
): ImpactSeverity {
  const thresholds = IMPACT_ANALYSIS_CONFIG.severity_thresholds
  
  if (disruptionPercentage >= thresholds.high.schedule_disruption || 
      affectedSessionsCount >= thresholds.high.affected_sessions) {
    return 'high'
  } else if (disruptionPercentage >= thresholds.medium.schedule_disruption || 
             affectedSessionsCount >= thresholds.medium.affected_sessions) {
    return 'medium'
  }
  
  return 'low'
}

function calculateOverallSeverity(
  immediate: ModificationImpactAnalysis,
  shortTerm: ModificationImpactAnalysis | null,
  longTerm: ModificationImpactAnalysis | null
): ImpactSeverity {
  const severities = [immediate.overall_severity]
  if (shortTerm) severities.push(shortTerm.overall_severity)
  if (longTerm) severities.push(longTerm.overall_severity)
  
  if (severities.includes('high')) return 'high'
  if (severities.includes('medium')) return 'medium'
  return 'low'
}

function calculateAdjustmentTime(
  impact: ModificationImpactAnalysis,
  therapistImpacts: TherapistWorkloadAdjustment[],
  resourceReallocations: ResourceReallocation[]
): number {
  let baseTime = impact.affected_session_count * 0.5 // 30 minutes per affected session
  
  // Add time for therapist adjustments
  baseTime += therapistImpacts.length * 1 // 1 hour per therapist
  
  // Add time for resource reallocations
  baseTime += resourceReallocations.length * 2 // 2 hours per resource
  
  return Math.ceil(baseTime)
}

function generateStakeholderNotifications(
  impact: ModificationImpactAnalysis,
  therapistImpacts: TherapistWorkloadAdjustment[],
  affectedSessions: ScheduledSession[]
): string[] {
  const notifications: string[] = []
  
  // Always notify student/parent
  notifications.push('student_parent')
  
  // Notify affected therapists
  if (therapistImpacts.length > 0) {
    notifications.push('affected_therapists')
  }
  
  // Notify managers if high impact
  if (impact.overall_severity === 'high') {
    notifications.push('therapy_managers')
    notifications.push('administration')
  }
  
  // Notify billing if cost impact
  if (affectedSessions.length > 5) {
    notifications.push('billing_department')
  }
  
  return notifications
}

// Additional helper functions for specific modification types

async function analyzeSpecificModificationImpacts(
  enrollment: any,
  modificationRequest: any,
  sessionsInPeriod: any[]
): Promise<{
  affected_therapists: string[]
  estimated_hours: number
  notifications_needed: string[]
}> {
  const affectedTherapists = new Set<string>()
  let estimatedHours = 0
  const notificationsNeeded: string[] = []

  // Analyze each modification type
  for (const modificationType of modificationRequest.modification_type) {
    const weight = IMPACT_ANALYSIS_CONFIG.modification_impact_weights[modificationType]
    estimatedHours += sessionsInPeriod.length * weight * 0.5 // Base time per session

    switch (modificationType) {
      case 'therapist_change':
        sessionsInPeriod.forEach(session => {
          if (session.therapist_id) affectedTherapists.add(session.therapist_id)
        })
        if (modificationRequest.proposed_changes.new_therapist_id) {
          affectedTherapists.add(modificationRequest.proposed_changes.new_therapist_id)
        }
        notificationsNeeded.push('therapist_change')
        break

      case 'frequency_change':
        notificationsNeeded.push('frequency_change')
        break

      case 'service_type_change':
        notificationsNeeded.push('service_change')
        affectedTherapists.add(enrollment.primary_therapist_id)
        break
    }
  }

  return {
    affected_therapists: Array.from(affectedTherapists),
    estimated_hours: Math.ceil(estimatedHours),
    notifications_needed: notificationsNeeded
  }
}

function calculateResourceImpactSeverity(
  affectedCount: number,
  resourceType: 'room' | 'equipment' | 'therapist'
): ImpactSeverity {
  const thresholds = {
    room: { low: 2, medium: 5, high: 10 },
    equipment: { low: 1, medium: 3, high: 6 },
    therapist: { low: 5, medium: 15, high: 25 }
  }

  const threshold = thresholds[resourceType]
  
  if (affectedCount >= threshold.high) return 'high'
  if (affectedCount >= threshold.medium) return 'medium'
  return 'low'
}

async function findAlternativeRooms(
  currentRoomId: string,
  affectedSessions: ScheduledSession[]
): Promise<string[]> {
  // Get rooms with similar capabilities
  const { data: currentRoom } = await supabase
    .from('therapy_rooms')
    .select('*')
    .eq('id', currentRoomId)
    .single()

  if (!currentRoom) return []

  const { data: alternativeRooms } = await supabase
    .from('therapy_rooms')
    .select('id')
    .eq('room_type', currentRoom.room_type)
    .gte('capacity', currentRoom.capacity)
    .neq('id', currentRoomId)
    .eq('is_active', true)

  return alternativeRooms?.map(r => r.id) || []
}

async function findAlternativeEquipment(equipmentId: string): Promise<string[]> {
  const { data: currentEquipment } = await supabase
    .from('therapy_equipment')
    .select('*')
    .eq('id', equipmentId)
    .single()

  if (!currentEquipment) return []

  const { data: alternatives } = await supabase
    .from('therapy_equipment')
    .select('id')
    .eq('equipment_type', currentEquipment.equipment_type)
    .neq('id', equipmentId)
    .eq('is_available', true)

  return alternatives?.map(e => e.id) || []
}

async function getEquipmentRequirements(serviceType: string): Promise<any[]> {
  const { data: requirements } = await supabase
    .from('service_equipment_requirements')
    .select(`
      therapy_equipment(*)
    `)
    .eq('service_type', serviceType)

  return requirements?.map(r => r.therapy_equipment) || []
}

function calculateReallocationTimeline(resourceType: 'room' | 'equipment'): number {
  const baseTimelines = {
    room: 2, // 2 hours for room changes
    equipment: 1 // 1 hour for equipment changes
  }
  
  return baseTimelines[resourceType]
}

// Specific adjustment generators

async function generateFrequencyAdjustments(
  enrollment: any,
  modificationRequest: any,
  affectedSessions: ScheduledSession[]
): Promise<ScheduleAdjustment[]> {
  const adjustments: ScheduleAdjustment[] = []
  
  const currentFreq = enrollment.frequency_per_week
  const newFreq = modificationRequest.proposed_changes.new_frequency || currentFreq
  
  if (newFreq !== currentFreq) {
    adjustments.push({
      adjustment_id: crypto.randomUUID(),
      enrollment_id: enrollment.id,
      adjustment_type: 'frequency_change',
      original_value: currentFreq.toString(),
      new_value: newFreq.toString(),
      affected_sessions: affectedSessions.map(s => s.id),
      implementation_date: modificationRequest.proposed_changes.effective_date,
      estimated_completion_time: Math.abs(newFreq - currentFreq) * 2, // 2 hours per frequency unit change
      requires_approval: Math.abs(newFreq - currentFreq) > 1,
      impact_severity: Math.abs(newFreq - currentFreq) > 2 ? 'high' : 
                      Math.abs(newFreq - currentFreq) > 1 ? 'medium' : 'low'
    })
  }
  
  return adjustments
}

async function generateDurationAdjustments(
  enrollment: any,
  modificationRequest: any,
  affectedSessions: ScheduledSession[]
): Promise<ScheduleAdjustment[]> {
  const adjustments: ScheduleAdjustment[] = []
  
  const currentDuration = enrollment.session_duration
  const newDuration = modificationRequest.proposed_changes.new_duration || currentDuration
  
  if (newDuration !== currentDuration) {
    adjustments.push({
      adjustment_id: crypto.randomUUID(),
      enrollment_id: enrollment.id,
      adjustment_type: 'duration_change',
      original_value: currentDuration.toString(),
      new_value: newDuration.toString(),
      affected_sessions: affectedSessions.map(s => s.id),
      implementation_date: modificationRequest.proposed_changes.effective_date,
      estimated_completion_time: affectedSessions.length * 0.5, // 30 minutes per session
      requires_approval: Math.abs(newDuration - currentDuration) > 30,
      impact_severity: Math.abs(newDuration - currentDuration) > 60 ? 'high' : 
                      Math.abs(newDuration - currentDuration) > 30 ? 'medium' : 'low'
    })
  }
  
  return adjustments
}

async function generateTherapistAdjustments(
  enrollment: any,
  modificationRequest: any,
  affectedSessions: ScheduledSession[]
): Promise<ScheduleAdjustment[]> {
  const adjustments: ScheduleAdjustment[] = []
  
  const newTherapistId = modificationRequest.proposed_changes.new_therapist_id
  
  if (newTherapistId) {
    adjustments.push({
      adjustment_id: crypto.randomUUID(),
      enrollment_id: enrollment.id,
      adjustment_type: 'therapist_change',
      original_value: enrollment.primary_therapist_id || '',
      new_value: newTherapistId,
      affected_sessions: affectedSessions.map(s => s.id),
      implementation_date: modificationRequest.proposed_changes.effective_date,
      estimated_completion_time: affectedSessions.length * 1, // 1 hour per session for therapist transition
      requires_approval: true,
      impact_severity: 'high' // Therapist changes always high impact
    })
  }
  
  return adjustments
}

async function generateTimeSlotAdjustments(
  enrollment: any,
  modificationRequest: any,
  affectedSessions: ScheduledSession[]
): Promise<ScheduleAdjustment[]> {
  const adjustments: ScheduleAdjustment[] = []
  
  const newTimePreferences = modificationRequest.proposed_changes.new_time_preferences
  
  if (newTimePreferences && newTimePreferences.length > 0) {
    adjustments.push({
      adjustment_id: crypto.randomUUID(),
      enrollment_id: enrollment.id,
      adjustment_type: 'time_slot_change',
      original_value: JSON.stringify(enrollment.preferred_times || []),
      new_value: JSON.stringify(newTimePreferences),
      affected_sessions: affectedSessions.map(s => s.id),
      implementation_date: modificationRequest.proposed_changes.effective_date,
      estimated_completion_time: affectedSessions.length * 0.75, // 45 minutes per session
      requires_approval: affectedSessions.length > 10,
      impact_severity: affectedSessions.length > 15 ? 'high' : 
                      affectedSessions.length > 5 ? 'medium' : 'low'
    })
  }
  
  return adjustments
}

async function generateLocationAdjustments(
  enrollment: any,
  modificationRequest: any,
  affectedSessions: ScheduledSession[]
): Promise<ScheduleAdjustment[]> {
  const adjustments: ScheduleAdjustment[] = []
  
  const newLocationId = modificationRequest.proposed_changes.new_location_id
  
  if (newLocationId) {
    adjustments.push({
      adjustment_id: crypto.randomUUID(),
      enrollment_id: enrollment.id,
      adjustment_type: 'location_change',
      original_value: enrollment.preferred_location_id || '',
      new_value: newLocationId,
      affected_sessions: affectedSessions.map(s => s.id),
      implementation_date: modificationRequest.proposed_changes.effective_date,
      estimated_completion_time: affectedSessions.length * 0.25, // 15 minutes per session
      requires_approval: affectedSessions.length > 20,
      impact_severity: affectedSessions.length > 25 ? 'high' : 
                      affectedSessions.length > 10 ? 'medium' : 'low'
    })
  }
  
  return adjustments
}

async function generateServiceTypeAdjustments(
  enrollment: any,
  modificationRequest: any,
  affectedSessions: ScheduledSession[]
): Promise<ScheduleAdjustment[]> {
  const adjustments: ScheduleAdjustment[] = []
  
  const newServiceTypes = modificationRequest.proposed_changes.new_service_types
  
  if (newServiceTypes && newServiceTypes.length > 0) {
    adjustments.push({
      adjustment_id: crypto.randomUUID(),
      enrollment_id: enrollment.id,
      adjustment_type: 'service_type_change',
      original_value: JSON.stringify(enrollment.service_types || []),
      new_value: JSON.stringify(newServiceTypes),
      affected_sessions: affectedSessions.map(s => s.id),
      implementation_date: modificationRequest.proposed_changes.effective_date,
      estimated_completion_time: affectedSessions.length * 1.5, // 1.5 hours per session for service changes
      requires_approval: true,
      impact_severity: 'high' // Service type changes always high impact
    })
  }
  
  return adjustments
}

/**
 * Validates a modification request before analysis
 */
export async function validateModificationRequest(
  modificationRequest: any
): Promise<{
  valid: boolean
  errors: string[]
}> {
  const errors: string[] = []

  // Check required fields
  if (!modificationRequest.enrollment_id) {
    errors.push('رقم التسجيل مطلوب / Enrollment ID is required')
  }

  if (!modificationRequest.modification_type || modificationRequest.modification_type.length === 0) {
    errors.push('نوع التعديل مطلوب / Modification type is required')
  }

  if (!modificationRequest.proposed_changes.effective_date) {
    errors.push('تاريخ التنفيذ مطلوب / Effective date is required')
  }

  // Validate effective date is in the future
  const effectiveDate = new Date(modificationRequest.proposed_changes.effective_date)
  if (effectiveDate <= new Date()) {
    errors.push('تاريخ التنفيذ يجب أن يكون في المستقبل / Effective date must be in the future')
  }

  // Validate modification-specific requirements
  if (modificationRequest.modification_type.includes('frequency_change')) {
    if (!modificationRequest.proposed_changes.new_frequency || 
        modificationRequest.proposed_changes.new_frequency <= 0) {
      errors.push('التكرار الجديد مطلوب ويجب أن يكون أكبر من صفر / New frequency is required and must be greater than zero')
    }
  }

  if (modificationRequest.modification_type.includes('duration_change')) {
    if (!modificationRequest.proposed_changes.new_duration || 
        modificationRequest.proposed_changes.new_duration <= 0) {
      errors.push('المدة الجديدة مطلوبة ويجب أن تكون أكبر من صفر / New duration is required and must be greater than zero')
    }
  }

  if (modificationRequest.modification_type.includes('therapist_change')) {
    if (!modificationRequest.proposed_changes.new_therapist_id) {
      errors.push('معرف المعالج الجديد مطلوب / New therapist ID is required')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
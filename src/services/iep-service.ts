/**
 * IEP Management Service
 * IDEA 2024 Compliant - Business logic and data operations for IEP system
 * Arkan Al-Numo Center - Service Layer
 */

import { supabase } from '@/lib/supabase'
import { requireAuth, type AuthenticatedUser } from '@/lib/auth-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import { retryApiCall } from '@/lib/retry-utils'
import type {
  IEP,
  CreateIEPData,
  UpdateIEPData,
  IEPGoal,
  CreateIEPGoalData,
  UpdateIEPGoalData,
  IEPService,
  CreateIEPServiceData,
  UpdateIEPServiceData,
  IEPProgressData,
  IEPFilters,
  IEPStatus,
  GoalStatus,
  ComplianceIssue
} from '@/types/iep'

// =============================================================================
// COMPLIANCE VALIDATION UTILITIES
// =============================================================================

export interface ComplianceValidationResult {
  isValid: boolean
  issues: ComplianceIssue[]
  warnings: string[]
}

/**
 * Validate IEP compliance with IDEA 2024 requirements
 */
export const validateIEPCompliance = (iep: IEP | CreateIEPData): ComplianceValidationResult => {
  const issues: ComplianceIssue[] = []
  const warnings: string[] = []

  // Required Present Levels
  if (!iep.present_levels_academic_ar?.trim()) {
    issues.push({
      issue_type: 'missing_present_levels_academic',
      description_ar: 'الوضع الحالي للأداء الأكاديمي مطلوب',
      description_en: 'Present levels of academic performance required',
      severity: 'critical',
      resolution_required: true
    })
  }

  if (!iep.present_levels_functional_ar?.trim()) {
    issues.push({
      issue_type: 'missing_present_levels_functional',
      description_ar: 'الوضع الحالي للأداء الوظيفي مطلوب',
      description_en: 'Present levels of functional performance required',
      severity: 'critical',
      resolution_required: true
    })
  }

  // Required LRE justification
  if (!iep.lre_justification_ar?.trim()) {
    issues.push({
      issue_type: 'missing_lre_justification',
      description_ar: 'مبرر البيئة الأقل تقييداً مطلوب',
      description_en: 'Least Restrictive Environment justification required',
      severity: 'high',
      resolution_required: true
    })
  }

  // Annual review date validation
  const effectiveDate = new Date(iep.effective_date)
  const annualReviewDate = new Date(iep.annual_review_date)
  const daysDifference = Math.ceil((annualReviewDate.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDifference > 365) {
    issues.push({
      issue_type: 'annual_review_exceeds_365_days',
      description_ar: 'تاريخ المراجعة السنوية يجب أن يكون خلال 365 يوماً',
      description_en: 'Annual review date must be within 365 days',
      severity: 'critical',
      resolution_required: true
    })
  }

  if (daysDifference < 360) {
    warnings.push('Annual review scheduled less than 360 days from effective date')
  }

  // Mainstreaming percentage validation
  if (iep.mainstreaming_percentage < 0 || iep.mainstreaming_percentage > 100) {
    issues.push({
      issue_type: 'invalid_mainstreaming_percentage',
      description_ar: 'نسبة الدمج يجب أن تكون بين 0 و 100',
      description_en: 'Mainstreaming percentage must be between 0 and 100',
      severity: 'medium',
      resolution_required: true
    })
  }

  // Check for at least one annual goal (if IEP has goals data)
  if ('annual_goals_count' in iep && iep.annual_goals_count === 0) {
    issues.push({
      issue_type: 'no_annual_goals',
      description_ar: 'يجب وجود هدف سنوي واحد على الأقل',
      description_en: 'At least one annual goal is required',
      severity: 'critical',
      resolution_required: true
    })
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  }
}

/**
 * Calculate progress percentage for a goal based on recent data
 */
export const calculateGoalProgress = (progressData: IEPProgressData[]): number => {
  if (progressData.length === 0) return 0

  // Sort by collection date (newest first)
  const sortedData = progressData
    .filter(data => data.data_reliability === 'reliable')
    .sort((a, b) => new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime())

  if (sortedData.length === 0) return 0

  // Use weighted average with more weight on recent data
  const weights = sortedData.map((_, index) => Math.pow(0.9, index))
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)

  const weightedSum = sortedData.reduce((sum, data, index) => {
    const percentage = data.percentage_achieved || 
                      (data.score_achieved && data.score_possible 
                        ? (data.score_achieved / data.score_possible) * 100 
                        : 0)
    return sum + (percentage * weights[index])
  }, 0)

  return Math.round(weightedSum / weightSum)
}

// =============================================================================
// CORE IEP CRUD OPERATIONS
// =============================================================================

/**
 * Create a new IEP document
 */
export const createIEP = async (data: CreateIEPData): Promise<IEP> => {
  return retryApiCall(async () => {
    console.log('🔍 IEP Service: Creating IEP with data:', data)

    const user = await requireAuth()

    // Validate compliance before creating
    const validationResult = validateIEPCompliance(data)
    if (!validationResult.isValid) {
      throw new Error(`IEP compliance validation failed: ${validationResult.issues.map(i => i.description_en).join(', ')}`)
    }

    // Generate IEP number based on student registration number
    let iepNumber = ''
    try {
      const { data: student } = await supabase
        .from('students')
        .select('registration_number')
        .eq('id', data.student_id)
        .single()

      if (student) {
        const yearShort = data.academic_year.substring(0, 4).slice(-2)
        iepNumber = `IEP-${student.registration_number}-${yearShort}`
      }
    } catch (error) {
      console.warn('Could not generate IEP number:', error)
    }

    const iepData = {
      ...data,
      status: 'draft' as IEPStatus,
      workflow_stage: 'drafting' as const,
      compliance_check_passed: validationResult.isValid,
      compliance_issues: validationResult.issues,
      quality_review_passed: false,
      version_number: 1,
      is_current_version: true,
      annual_goals_count: 0,
      special_education_services: data.special_education_services || [],
      related_services: data.related_services || [],
      supplementary_services: data.supplementary_services || [],
      accommodations_ar: data.accommodations_ar || [],
      accommodations_en: data.accommodations_en || [],
      modifications_ar: data.modifications_ar || [],
      modifications_en: data.modifications_en || [],
      state_assessment_accommodations_ar: data.state_assessment_accommodations_ar || [],
      state_assessment_accommodations_en: data.state_assessment_accommodations_en || [],
      transition_services: data.transition_services || {},
      behavior_interventions: data.behavior_interventions || {},
      esy_services: data.esy_services || {},
      attachments: [],
      meeting_frequency: 'quarterly' as const,
      created_by: user.id,
      updated_by: user.id
    }

    console.log('📝 Creating IEP in database...')
    const { data: newIEP, error } = await supabase
      .from('ieps')
      .insert([iepData])
      .select(`
        *,
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
      console.error('❌ Error creating IEP:', error)
      errorMonitoring.reportError(error, {
        component: 'createIEP',
        action: 'insert_iep',
        userId: user.id,
        metadata: { student_id: data.student_id }
      })
      throw error
    }

    console.log('✅ IEP created successfully:', newIEP.id)
    return newIEP
  }, {
    context: 'Creating IEP',
    maxAttempts: 3,
    logErrors: true
  })
}

/**
 * Get IEPs with filtering and related data
 */
export const getIEPs = async (filters: IEPFilters = {}): Promise<IEP[]> => {
  return retryApiCall(async () => {
    console.log('🔍 IEP Service: Fetching IEPs with filters:', filters)

    const user = await requireAuth()

    let query = supabase
      .from('ieps')
      .select(`
        *,
        student:students(
          id,
          first_name_ar,
          last_name_ar,
          first_name_en,
          last_name_en,
          registration_number
        ),
        goals:iep_goals(count),
        services:iep_services(count),
        team_members:iep_team_members(count),
        approvals:iep_approvals(count)
      `)
      .order('updated_at', { ascending: false })

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.iep_type) {
      query = query.eq('iep_type', filters.iep_type)
    }

    if (filters.academic_year) {
      query = query.eq('academic_year', filters.academic_year)
    }

    if (filters.student_id) {
      query = query.eq('student_id', filters.student_id)
    }

    if (filters.workflow_stage) {
      query = query.eq('workflow_stage', filters.workflow_stage)
    }

    if (filters.due_for_review) {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      query = query.lte('annual_review_date', thirtyDaysFromNow.toISOString().split('T')[0])
    }

    if (filters.compliance_issues) {
      query = query.eq('compliance_check_passed', false)
    }

    if (filters.search) {
      // Search in student names or IEP content
      query = query.or(`
        student.first_name_ar.ilike.%${filters.search}%,
        student.last_name_ar.ilike.%${filters.search}%,
        student.first_name_en.ilike.%${filters.search}%,
        student.last_name_en.ilike.%${filters.search}%,
        present_levels_academic_ar.ilike.%${filters.search}%,
        present_levels_academic_en.ilike.%${filters.search}%
      `)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching IEPs:', error)
      errorMonitoring.reportError(error, {
        component: 'getIEPs',
        action: 'fetch_ieps',
        userId: user.id,
        metadata: { filters }
      })
      throw error
    }

    console.log('✅ IEPs fetched successfully:', data?.length, 'records')
    return data || []
  }, {
    context: 'Fetching IEPs',
    maxAttempts: 3,
    logErrors: true
  })
}

/**
 * Get single IEP by ID with complete related data
 */
export const getIEP = async (id: string): Promise<IEP> => {
  return retryApiCall(async () => {
    console.log('🔍 IEP Service: Fetching IEP:', id)

    const user = await requireAuth()

    const { data, error } = await supabase
      .from('ieps')
      .select(`
        *,
        student:students(
          id,
          first_name_ar,
          last_name_ar,
          first_name_en,
          last_name_en,
          registration_number,
          date_of_birth,
          diagnosis_ar,
          diagnosis_en
        ),
        goals:iep_goals(*),
        services:iep_services(*),
        team_members:iep_team_members(
          *,
          user:profiles(name, email)
        ),
        meetings:iep_meetings(
          *,
          attendance:iep_meeting_attendance(*)
        ),
        approvals:iep_approvals(*),
        compliance_alerts:iep_compliance_alerts(
          *
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Error fetching IEP:', error)
      errorMonitoring.reportError(error, {
        component: 'getIEP',
        action: 'fetch_single_iep',
        userId: user.id,
        metadata: { iep_id: id }
      })
      throw error
    }

    if (!data) {
      throw new Error('IEP not found')
    }

    console.log('✅ IEP fetched successfully:', data.id)
    return data
  }, {
    context: 'Fetching single IEP',
    maxAttempts: 3,
    logErrors: true
  })
}

/**
 * Update IEP document
 */
export const updateIEP = async ({ id, data }: { id: string; data: UpdateIEPData }): Promise<IEP> => {
  return retryApiCall(async () => {
    console.log('🔍 IEP Service: Updating IEP:', id, 'with data:', data)

    const user = await requireAuth()

    // Get current IEP to merge with updates
    const currentIEP = await getIEP(id)

    // Merge data for validation
    const mergedData = { ...currentIEP, ...data }

    // Validate compliance if content changed
    const validationResult = validateIEPCompliance(mergedData)

    const updateData = {
      ...data,
      compliance_check_passed: validationResult.isValid,
      compliance_issues: validationResult.issues,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }

    // Version management - create new version if major changes
    const majorChangeFields = ['present_levels_academic_ar', 'present_levels_functional_ar', 'lre_justification_ar']
    const hasMajorChanges = majorChangeFields.some(field => data[field as keyof UpdateIEPData] !== undefined)

    if (hasMajorChanges && currentIEP.status === 'active') {
      // Create new version
      updateData.version_number = currentIEP.version_number + 1
      updateData.parent_iep_id = currentIEP.id
      
      // Mark current version as not current
      await supabase
        .from('ieps')
        .update({ is_current_version: false })
        .eq('id', id)
    }

    console.log('📝 Updating IEP in database...')
    const { data: updatedIEP, error } = await supabase
      .from('ieps')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
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
      console.error('❌ Error updating IEP:', error)
      errorMonitoring.reportError(error, {
        component: 'updateIEP',
        action: 'update_iep',
        userId: user.id,
        metadata: { iep_id: id }
      })
      throw error
    }

    // Create compliance alerts if issues found
    if (!validationResult.isValid) {
      await createComplianceAlerts(id, validationResult.issues)
    }

    console.log('✅ IEP updated successfully:', updatedIEP.id)
    return updatedIEP
  }, {
    context: 'Updating IEP',
    maxAttempts: 3,
    logErrors: true
  })
}

// =============================================================================
// IEP GOAL OPERATIONS
// =============================================================================

/**
 * Create new IEP goal
 */
export const createIEPGoal = async (data: CreateIEPGoalData): Promise<IEPGoal> => {
  return retryApiCall(async () => {
    console.log('🔍 IEP Service: Creating IEP Goal:', data)

    const user = await requireAuth()

    // Validate goal data
    if (!data.goal_statement_ar.trim()) {
      throw new Error('Goal statement in Arabic is required')
    }

    if (!data.mastery_criteria_ar.trim()) {
      throw new Error('Mastery criteria in Arabic is required')
    }

    const goalData = {
      ...data,
      baseline_date: data.baseline_date || new Date().toISOString().split('T')[0],
      current_progress_percentage: 0,
      progress_status: 'not_started' as const,
      is_active: true,
      goal_status: 'active' as GoalStatus,
      is_continuing_goal: data.is_continuing_goal || false,
      goal_order: data.goal_order || data.goal_number,
      created_by: user.id,
      updated_by: user.id
    }

    const { data: newGoal, error } = await supabase
      .from('iep_goals')
      .insert([goalData])
      .select('*')
      .single()

    if (error) {
      console.error('❌ Error creating IEP goal:', error)
      errorMonitoring.reportError(error, {
        component: 'createIEPGoal',
        action: 'insert_goal',
        userId: user.id,
        metadata: { iep_id: data.iep_id }
      })
      throw error
    }

    console.log('✅ IEP Goal created successfully:', newGoal.id)
    return newGoal
  }, {
    context: 'Creating IEP Goal',
    maxAttempts: 3,
    logErrors: true
  })
}

/**
 * Update IEP goal progress
 */
export const updateIEPGoalProgress = async (goalId: string, progressData: IEPProgressData[]): Promise<IEPGoal> => {
  return retryApiCall(async () => {
    console.log('🔍 IEP Service: Updating goal progress:', goalId)

    const user = await requireAuth()

    // Calculate new progress percentage
    const newProgress = calculateGoalProgress(progressData)
    
    // Determine progress status based on percentage
    let progressStatus: typeof import('@/types/iep').ProgressStatus = 'progressing'
    if (newProgress === 0) progressStatus = 'not_started'
    else if (newProgress >= 90) progressStatus = 'mastered'
    else if (newProgress >= 70) progressStatus = 'progressing'
    else progressStatus = 'introduced'

    const updateData = {
      current_progress_percentage: newProgress,
      progress_status: progressStatus,
      last_progress_update: new Date().toISOString().split('T')[0],
      updated_by: user.id
    }

    const { data: updatedGoal, error } = await supabase
      .from('iep_goals')
      .update(updateData)
      .eq('id', goalId)
      .select('*')
      .single()

    if (error) {
      console.error('❌ Error updating goal progress:', error)
      errorMonitoring.reportError(error, {
        component: 'updateIEPGoalProgress',
        action: 'update_progress',
        userId: user.id,
        metadata: { goal_id: goalId, new_progress: newProgress }
      })
      throw error
    }

    console.log('✅ Goal progress updated successfully:', goalId, newProgress + '%')
    return updatedGoal
  }, {
    context: 'Updating goal progress',
    maxAttempts: 3,
    logErrors: true
  })
}

// =============================================================================
// COMPLIANCE AND ALERTS
// =============================================================================

/**
 * Create compliance alerts for IEP issues
 */
export const createComplianceAlerts = async (iepId: string, issues: ComplianceIssue[]): Promise<void> => {
  return retryApiCall(async () => {
    console.log('🔍 IEP Service: Creating compliance alerts for:', iepId)

    const user = await requireAuth()

    const alerts = issues
      .filter(issue => issue.resolution_required)
      .map(issue => ({
        iep_id: iepId,
        alert_type: issue.issue_type as any,
        alert_title_ar: issue.description_ar,
        alert_title_en: issue.description_en || issue.description_ar,
        alert_message_ar: `يتطلب حل مشكلة: ${issue.description_ar}`,
        alert_message_en: `Resolution required: ${issue.description_en || issue.description_ar}`,
        severity_level: issue.severity as any,
        priority: issue.severity === 'critical' ? 1 : issue.severity === 'high' ? 2 : 3,
        status: 'active' as const,
        alert_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days
        notification_sent: false,
        reminder_count: 0
      }))

    if (alerts.length === 0) return

    const { error } = await supabase
      .from('iep_compliance_alerts')
      .insert(alerts)

    if (error) {
      console.error('❌ Error creating compliance alerts:', error)
      errorMonitoring.reportError(error, {
        component: 'createComplianceAlerts',
        action: 'insert_alerts',
        userId: user.id,
        metadata: { iep_id: iepId, alerts_count: alerts.length }
      })
      throw error
    }

    console.log('✅ Compliance alerts created:', alerts.length)
  }, {
    context: 'Creating compliance alerts',
    maxAttempts: 2,
    logErrors: true
  })
}

/**
 * Get IEP statistics for dashboard
 */
export const getIEPStats = async (): Promise<any> => {
  return retryApiCall(async () => {
    const user = await requireAuth()

    const { data, error } = await supabase
      .from('ieps')
      .select('status, workflow_stage, compliance_check_passed, annual_review_date')

    if (error) {
      throw error
    }

    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const stats = {
      total: data?.length || 0,
      draft: data?.filter(iep => iep.status === 'draft').length || 0,
      active: data?.filter(iep => iep.status === 'active').length || 0,
      due_for_review: data?.filter(iep => 
        new Date(iep.annual_review_date) <= thirtyDaysFromNow
      ).length || 0,
      compliance_issues: data?.filter(iep => 
        !iep.compliance_check_passed
      ).length || 0
    }

    return stats
  }, {
    context: 'Getting IEP statistics',
    maxAttempts: 2
  })
}

// All functions are exported individually above with 'export const'
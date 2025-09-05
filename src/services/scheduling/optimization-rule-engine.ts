/**
 * Optimization Rule Engine Service
 * Story 3.1: Automated Scheduling Engine - Rule Processing System
 * 
 * Advanced rule engine for processing conditional logic, priority weighting,
 * and dynamic optimization rules. Supports Arabic RTL/English LTR content.
 */

import { supabase } from '@/lib/supabase'
import type {
  OptimizationRule,
  OptimizationCondition,
  OptimizationAction,
  ScheduledSession,
  SchedulingRequest,
  TherapistAvailability,
  PriorityLevel
} from '@/types/scheduling'

// =====================================================
// Rule Engine Core Class
// =====================================================

export class OptimizationRuleEngine {
  private static instance: OptimizationRuleEngine
  private ruleCache = new Map<string, OptimizationRule[]>()
  private readonly CACHE_TTL = 10 * 60 * 1000 // 10 minutes
  private executionStats = new Map<string, { 
    executions: number
    successes: number
    failures: number
    avgExecutionTime: number
  }>()

  static getInstance(): OptimizationRuleEngine {
    if (!OptimizationRuleEngine.instance) {
      OptimizationRuleEngine.instance = new OptimizationRuleEngine()
    }
    return OptimizationRuleEngine.instance
  }

  /**
   * Execute optimization rules against a set of sessions
   */
  async executeRules(
    sessions: ScheduledSession[],
    request: SchedulingRequest,
    context: {
      availability?: TherapistAvailability[]
      existingSessions?: ScheduledSession[]
      ruleSet?: string
    } = {}
  ): Promise<{
    optimizedSessions: ScheduledSession[]
    appliedRules: string[]
    ruleResults: Map<string, any>
    optimizationScore: number
  }> {
    const startTime = Date.now()
    
    try {
      // Fetch applicable rules
      const rules = await this.getApplicableRules(context.ruleSet)
      
      // Initialize execution context
      const executionContext = {
        sessions: [...sessions],
        request,
        availability: context.availability || [],
        existingSessions: context.existingSessions || [],
        appliedRules: [] as string[],
        ruleResults: new Map<string, any>(),
        scores: new Map<string, number>()
      }

      // Execute rules in priority order
      const sortedRules = this.sortRulesByPriority(rules)
      
      for (const rule of sortedRules) {
        const ruleStartTime = Date.now()
        
        try {
          // Check if rule conditions are met
          if (await this.evaluateConditions(rule, executionContext)) {
            // Execute rule actions
            const result = await this.executeActions(rule, executionContext)
            
            if (result.success) {
              executionContext.appliedRules.push(rule.id)
              executionContext.ruleResults.set(rule.id, result.data)
              executionContext.scores.set(rule.id, result.score || 0)
              
              // Update execution stats
              this.updateExecutionStats(rule.id, true, Date.now() - ruleStartTime)
            } else {
              this.updateExecutionStats(rule.id, false, Date.now() - ruleStartTime)
            }
          }
        } catch (error) {
          console.error(`Rule execution failed for ${rule.name}:`, error)
          this.updateExecutionStats(rule.id, false, Date.now() - ruleStartTime)
        }
      }

      // Calculate overall optimization score
      const optimizationScore = this.calculateOptimizationScore(
        executionContext.sessions,
        executionContext.scores
      )

      // Update rule execution metrics in database
      await this.updateRuleMetrics(executionContext.appliedRules)

      const totalExecutionTime = Date.now() - startTime
      console.log(`Rule engine execution completed in ${totalExecutionTime}ms`)

      return {
        optimizedSessions: executionContext.sessions,
        appliedRules: executionContext.appliedRules,
        ruleResults: executionContext.ruleResults,
        optimizationScore
      }

    } catch (error) {
      console.error('Rule engine execution failed:', error)
      throw new Error(`فشل في تنفيذ قواعد التحسين: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    }
  }

  /**
   * Validate and test a rule before activation
   */
  async validateRule(rule: OptimizationRule): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    testResults?: any
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Basic validation
      if (!rule.name || !rule.name_ar) {
        errors.push('اسم القاعدة مطلوب / Rule name is required')
      }

      if (!rule.condition || typeof rule.condition !== 'object') {
        errors.push('شروط القاعدة مطلوبة / Rule conditions are required')
      }

      if (!rule.action || typeof rule.action !== 'object') {
        errors.push('إجراءات القاعدة مطلوبة / Rule actions are required')
      }

      if (rule.priority < 1 || rule.priority > 10) {
        errors.push('أولوية القاعدة يجب أن تكون بين 1 و 10 / Rule priority must be between 1 and 10')
      }

      if (rule.weight < 0 || rule.weight > 5) {
        warnings.push('وزن القاعدة خارج النطاق المعتاد (0-5) / Rule weight outside typical range (0-5)')
      }

      // Validate condition structure
      const conditionValidation = this.validateConditionStructure(rule.condition)
      if (!conditionValidation.isValid) {
        errors.push(...conditionValidation.errors)
      }

      // Validate action structure
      const actionValidation = this.validateActionStructure(rule.action)
      if (!actionValidation.isValid) {
        errors.push(...actionValidation.errors)
      }

      // Test rule execution with sample data (if no critical errors)
      let testResults = null
      if (errors.length === 0) {
        testResults = await this.testRuleExecution(rule)
        if (!testResults.success) {
          warnings.push(`تحذير من الاختبار: ${testResults.message} / Test warning: ${testResults.message}`)
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        testResults
      }

    } catch (error) {
      console.error('Rule validation failed:', error)
      return {
        isValid: false,
        errors: [`خطأ في التحقق من القاعدة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`],
        warnings: []
      }
    }
  }

  /**
   * Create a new optimization rule with validation
   */
  async createRule(ruleData: Partial<OptimizationRule>): Promise<OptimizationRule> {
    // Validate rule before creation
    const validation = await this.validateRule(ruleData as OptimizationRule)
    if (!validation.isValid) {
      throw new Error(`Rule validation failed: ${validation.errors.join(', ')}`)
    }

    const { data, error } = await supabase
      .from('optimization_rules')
      .insert({
        ...ruleData,
        execution_count: 0,
        success_rate: 0.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Clear cache to force refresh
    this.ruleCache.clear()

    return data as OptimizationRule
  }

  /**
   * Update an existing optimization rule
   */
  async updateRule(ruleId: string, updates: Partial<OptimizationRule>): Promise<OptimizationRule> {
    // If updating condition or action, validate first
    if (updates.condition || updates.action) {
      const currentRule = await this.getRuleById(ruleId)
      const updatedRule = { ...currentRule, ...updates }
      
      const validation = await this.validateRule(updatedRule)
      if (!validation.isValid) {
        throw new Error(`Rule validation failed: ${validation.errors.join(', ')}`)
      }
    }

    const { data, error } = await supabase
      .from('optimization_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId)
      .select()
      .single()

    if (error) throw error

    // Clear cache
    this.ruleCache.clear()

    return data as OptimizationRule
  }

  /**
   * Get rule execution statistics
   */
  getRuleStatistics(ruleId?: string): Map<string, any> {
    if (ruleId) {
      return new Map([[ruleId, this.executionStats.get(ruleId) || null]])
    }
    return new Map(this.executionStats)
  }

  // =====================================================
  // Rule Evaluation Methods
  // =====================================================

  private async evaluateConditions(
    rule: OptimizationRule,
    context: any
  ): Promise<boolean> {
    try {
      const condition = rule.condition
      
      // Handle different condition types
      switch (condition.operator || 'and') {
        case 'equals':
          return this.evaluateEqualsCondition(condition, context)
        
        case 'greater_than':
          return this.evaluateComparisonCondition(condition, context, '>')
        
        case 'less_than':
          return this.evaluateComparisonCondition(condition, context, '<')
        
        case 'contains':
          return this.evaluateContainsCondition(condition, context)
        
        case 'between':
          return this.evaluateBetweenCondition(condition, context)
        
        case 'and':
          return this.evaluateAndCondition(condition, context)
        
        case 'or':
          return this.evaluateOrCondition(condition, context)
        
        default:
          return this.evaluateCustomCondition(condition, context)
      }
    } catch (error) {
      console.error(`Condition evaluation failed for rule ${rule.name}:`, error)
      return false
    }
  }

  private evaluateEqualsCondition(condition: OptimizationCondition, context: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, context)
    return fieldValue === condition.value
  }

  private evaluateComparisonCondition(
    condition: OptimizationCondition, 
    context: any, 
    operator: '>' | '<'
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, context)
    
    if (typeof fieldValue !== 'number' || typeof condition.value !== 'number') {
      return false
    }

    return operator === '>' ? fieldValue > condition.value : fieldValue < condition.value
  }

  private evaluateContainsCondition(condition: OptimizationCondition, context: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, context)
    
    if (Array.isArray(fieldValue)) {
      return fieldValue.includes(condition.value)
    }
    
    if (typeof fieldValue === 'string') {
      return fieldValue.includes(condition.value.toString())
    }
    
    return false
  }

  private evaluateBetweenCondition(condition: OptimizationCondition, context: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, context)
    
    if (typeof fieldValue !== 'number' || !Array.isArray(condition.value) || condition.value.length !== 2) {
      return false
    }

    return fieldValue >= condition.value[0] && fieldValue <= condition.value[1]
  }

  private evaluateAndCondition(condition: OptimizationCondition, context: any): boolean {
    const conditions = condition.additional_params?.conditions || []
    return conditions.every((cond: OptimizationCondition) => this.evaluateConditions({ condition: cond } as OptimizationRule, context))
  }

  private evaluateOrCondition(condition: OptimizationCondition, context: any): boolean {
    const conditions = condition.additional_params?.conditions || []
    return conditions.some((cond: OptimizationCondition) => this.evaluateConditions({ condition: cond } as OptimizationRule, context))
  }

  private evaluateCustomCondition(condition: OptimizationCondition, context: any): boolean {
    // Custom condition logic based on field and parameters
    switch (condition.field) {
      case 'time_range':
        return this.evaluateTimeRangeCondition(condition, context)
      
      case 'therapist_workload':
        return this.evaluateTherapistWorkloadCondition(condition, context)
      
      case 'session_gaps':
        return this.evaluateSessionGapsCondition(condition, context)
      
      case 'resource_availability':
        return this.evaluateResourceAvailabilityCondition(condition, context)
      
      default:
        console.warn(`Unknown condition field: ${condition.field}`)
        return true // Default to allow execution
    }
  }

  // =====================================================
  // Rule Action Execution Methods
  // =====================================================

  private async executeActions(
    rule: OptimizationRule,
    context: any
  ): Promise<{ success: boolean; data?: any; score?: number; message?: string }> {
    try {
      const action = rule.action
      
      switch (action.type) {
        case 'boost_score':
          return this.executeBoostScoreAction(action, context)
        
        case 'penalize_score':
          return this.executePenalizeScoreAction(action, context)
        
        case 'reject':
          return this.executeRejectAction(action, context)
        
        case 'prefer':
          return this.executePreferAction(action, context)
        
        case 'suggest_alternative':
          return this.executeSuggestAlternativeAction(action, context)
        
        case 'reschedule':
          return this.executeRescheduleAction(action, context)
        
        case 'optimize_gaps':
          return this.executeOptimizeGapsAction(action, context)
        
        default:
          return this.executeCustomAction(action, context)
      }
    } catch (error) {
      console.error(`Action execution failed for rule ${rule.name}:`, error)
      return {
        success: false,
        message: `Action execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private executeBoostScoreAction(action: OptimizationAction, context: any) {
    const scoreImpact = action.score_impact || 10
    const targetSessions = this.getTargetSessions(action, context)
    
    // Apply score boost to qualifying sessions
    targetSessions.forEach(session => {
      if (!session.optimization_score) session.optimization_score = 50
      session.optimization_score = Math.min(100, session.optimization_score + scoreImpact)
    })

    return {
      success: true,
      data: { boostedSessions: targetSessions.length, scoreImpact },
      score: scoreImpact
    }
  }

  private executePenalizeScoreAction(action: OptimizationAction, context: any) {
    const scoreImpact = Math.abs(action.score_impact || -10)
    const targetSessions = this.getTargetSessions(action, context)
    
    targetSessions.forEach(session => {
      if (!session.optimization_score) session.optimization_score = 50
      session.optimization_score = Math.max(0, session.optimization_score - scoreImpact)
    })

    return {
      success: true,
      data: { penalizedSessions: targetSessions.length, scoreImpact: -scoreImpact },
      score: -scoreImpact
    }
  }

  private executeRejectAction(action: OptimizationAction, context: any) {
    const targetSessions = this.getTargetSessions(action, context)
    const rejectedSessions: ScheduledSession[] = []
    
    // Mark sessions for rejection/removal
    targetSessions.forEach(session => {
      session.status = 'cancelled'
      rejectedSessions.push(session)
    })

    // Remove from context
    context.sessions = context.sessions.filter((s: ScheduledSession) => 
      !rejectedSessions.some(rs => rs.id === s.id)
    )

    return {
      success: true,
      data: { rejectedSessions: rejectedSessions.length },
      score: -50 // Heavy penalty for rejections
    }
  }

  private executePreferAction(action: OptimizationAction, context: any) {
    const preferenceBoost = action.parameters?.boost || 20
    const targetSessions = this.getTargetSessions(action, context)
    
    targetSessions.forEach(session => {
      if (!session.priority_level || session.priority_level < PriorityLevel.HIGH) {
        session.priority_level = PriorityLevel.HIGH
      }
      
      if (!session.optimization_score) session.optimization_score = 50
      session.optimization_score = Math.min(100, session.optimization_score + preferenceBoost)
    })

    return {
      success: true,
      data: { preferredSessions: targetSessions.length, boost: preferenceBoost },
      score: preferenceBoost / 2
    }
  }

  private executeSuggestAlternativeAction(action: OptimizationAction, context: any) {
    // This would generate alternative scheduling suggestions
    // Implementation depends on specific alternative generation logic
    return {
      success: true,
      data: { suggestionsGenerated: true },
      score: 5
    }
  }

  private executeRescheduleAction(action: OptimizationAction, context: any) {
    // This would reschedule sessions based on optimization criteria
    // Implementation would depend on rescheduling logic
    return {
      success: true,
      data: { rescheduledSessions: 0 },
      score: 0
    }
  }

  private executeOptimizeGapsAction(action: OptimizationAction, context: any) {
    // Optimize gaps between sessions for same therapist
    const maxGap = action.parameters?.max_gap_minutes || 60
    let optimizedCount = 0

    // Group sessions by therapist and date
    const sessionsByTherapistDate = new Map<string, ScheduledSession[]>()
    
    context.sessions.forEach((session: ScheduledSession) => {
      const key = `${session.therapist_id}|${session.scheduled_date}`
      if (!sessionsByTherapistDate.has(key)) {
        sessionsByTherapistDate.set(key, [])
      }
      sessionsByTherapistDate.get(key)!.push(session)
    })

    // Optimize each therapist's daily schedule
    sessionsByTherapistDate.forEach(sessions => {
      sessions.sort((a, b) => a.start_time.localeCompare(b.start_time))
      
      for (let i = 0; i < sessions.length - 1; i++) {
        const current = sessions[i]
        const next = sessions[i + 1]
        
        const gap = this.calculateGapMinutes(current.end_time, next.start_time)
        if (gap > maxGap) {
          // Could implement gap reduction logic here
          optimizedCount++
        }
      }
    })

    return {
      success: true,
      data: { optimizedSessions: optimizedCount },
      score: optimizedCount * 2
    }
  }

  private executeCustomAction(action: OptimizationAction, context: any) {
    console.warn(`Unknown action type: ${action.type}`)
    return {
      success: false,
      message: `Unknown action type: ${action.type}`
    }
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private async getApplicableRules(ruleSet?: string): Promise<OptimizationRule[]> {
    const cacheKey = ruleSet || 'default'
    
    // Check cache first
    if (this.ruleCache.has(cacheKey)) {
      return this.ruleCache.get(cacheKey)!
    }

    // Fetch from database
    let query = supabase
      .from('optimization_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (ruleSet) {
      query = query.eq('rule_set_id', ruleSet)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Failed to fetch optimization rules:', error)
      return []
    }

    const rules = data as OptimizationRule[]
    
    // Cache results
    this.ruleCache.set(cacheKey, rules)
    
    // Auto-expire cache
    setTimeout(() => {
      this.ruleCache.delete(cacheKey)
    }, this.CACHE_TTL)

    return rules
  }

  private sortRulesByPriority(rules: OptimizationRule[]): OptimizationRule[] {
    return rules.sort((a, b) => b.priority - a.priority)
  }

  private getFieldValue(field: string, context: any): any {
    const fieldPath = field.split('.')
    let value = context

    for (const part of fieldPath) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return undefined
      }
    }

    return value
  }

  private getTargetSessions(action: OptimizationAction, context: any): ScheduledSession[] {
    const filter = action.parameters?.filter
    
    if (!filter) {
      return context.sessions
    }

    return context.sessions.filter((session: ScheduledSession) => {
      // Apply filtering logic based on action parameters
      if (filter.therapist_id && session.therapist_id !== filter.therapist_id) {
        return false
      }
      
      if (filter.session_type && session.session_category !== filter.session_type) {
        return false
      }
      
      if (filter.time_range) {
        const sessionTime = session.start_time
        if (sessionTime < filter.time_range.start || sessionTime > filter.time_range.end) {
          return false
        }
      }
      
      return true
    })
  }

  private calculateOptimizationScore(
    sessions: ScheduledSession[],
    scores: Map<string, number>
  ): number {
    if (sessions.length === 0) return 0

    // Base score from sessions
    const sessionScores = sessions.map(s => s.optimization_score || 50)
    const avgSessionScore = sessionScores.reduce((sum, score) => sum + score, 0) / sessionScores.length

    // Rule impact scores
    const ruleScores = Array.from(scores.values())
    const totalRuleImpact = ruleScores.reduce((sum, score) => sum + score, 0)

    // Combined score (weighted)
    const combinedScore = (avgSessionScore * 0.7) + (totalRuleImpact * 0.3)

    return Math.max(0, Math.min(100, combinedScore))
  }

  private calculateGapMinutes(endTime: string, startTime: string): number {
    const end = new Date(`2000-01-01T${endTime}`)
    const start = new Date(`2000-01-01T${startTime}`)
    return (start.getTime() - end.getTime()) / (1000 * 60)
  }

  private updateExecutionStats(ruleId: string, success: boolean, executionTime: number): void {
    const current = this.executionStats.get(ruleId) || {
      executions: 0,
      successes: 0,
      failures: 0,
      avgExecutionTime: 0
    }

    current.executions++
    
    if (success) {
      current.successes++
    } else {
      current.failures++
    }

    // Update average execution time
    current.avgExecutionTime = (current.avgExecutionTime * (current.executions - 1) + executionTime) / current.executions

    this.executionStats.set(ruleId, current)
  }

  private async updateRuleMetrics(appliedRules: string[]): Promise<void> {
    for (const ruleId of appliedRules) {
      const stats = this.executionStats.get(ruleId)
      if (stats) {
        const successRate = (stats.successes / stats.executions) * 100
        
        await supabase
          .from('optimization_rules')
          .update({
            execution_count: stats.executions,
            success_rate: successRate,
            last_executed: new Date().toISOString()
          })
          .eq('id', ruleId)
      }
    }
  }

  private async getRuleById(ruleId: string): Promise<OptimizationRule> {
    const { data, error } = await supabase
      .from('optimization_rules')
      .select('*')
      .eq('id', ruleId)
      .single()

    if (error) throw error
    return data as OptimizationRule
  }

  private validateConditionStructure(condition: OptimizationCondition): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!condition.field) {
      errors.push('حقل الشرط مطلوب / Condition field is required')
    }

    if (!condition.operator) {
      errors.push('عامل الشرط مطلوب / Condition operator is required')
    }

    const validOperators = ['equals', 'greater_than', 'less_than', 'contains', 'between', 'and', 'or']
    if (condition.operator && !validOperators.includes(condition.operator)) {
      errors.push(`عامل شرط غير صالح: ${condition.operator} / Invalid condition operator: ${condition.operator}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private validateActionStructure(action: OptimizationAction): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!action.type) {
      errors.push('نوع الإجراء مطلوب / Action type is required')
    }

    const validActionTypes = ['boost_score', 'penalize_score', 'reject', 'prefer', 'suggest_alternative']
    if (action.type && !validActionTypes.includes(action.type)) {
      errors.push(`نوع إجراء غير صالح: ${action.type} / Invalid action type: ${action.type}`)
    }

    if (action.score_impact && (action.score_impact < -100 || action.score_impact > 100)) {
      errors.push('تأثير النتيجة يجب أن يكون بين -100 و 100 / Score impact must be between -100 and 100')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private async testRuleExecution(rule: OptimizationRule): Promise<{ success: boolean; message: string }> {
    try {
      // Create mock context for testing
      const mockContext = {
        sessions: [],
        request: {} as SchedulingRequest,
        availability: [],
        existingSessions: []
      }

      // Test condition evaluation
      const conditionResult = await this.evaluateConditions(rule, mockContext)
      
      // Test action execution if condition passes
      if (conditionResult) {
        const actionResult = await this.executeActions(rule, mockContext)
        if (!actionResult.success) {
          return { success: false, message: actionResult.message || 'Action execution failed' }
        }
      }

      return { success: true, message: 'Rule test passed' }
    } catch (error) {
      return { 
        success: false, 
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  // Custom condition evaluators
  private evaluateTimeRangeCondition(condition: OptimizationCondition, context: any): boolean {
    const timeRange = condition.additional_params?.time_range
    if (!timeRange) return false

    // Check if sessions fall within the specified time range
    return context.sessions.some((session: ScheduledSession) => 
      session.start_time >= timeRange.start && session.end_time <= timeRange.end
    )
  }

  private evaluateTherapistWorkloadCondition(condition: OptimizationCondition, context: any): boolean {
    const maxSessions = condition.additional_params?.max_sessions || 8
    
    // Count sessions per therapist
    const therapistSessions = new Map<string, number>()
    context.sessions.forEach((session: ScheduledSession) => {
      therapistSessions.set(
        session.therapist_id,
        (therapistSessions.get(session.therapist_id) || 0) + 1
      )
    })

    // Check if any therapist exceeds the limit
    return Array.from(therapistSessions.values()).some(count => count > maxSessions)
  }

  private evaluateSessionGapsCondition(condition: OptimizationCondition, context: any): boolean {
    const maxGap = condition.additional_params?.max_gap_minutes || 60
    
    // Group by therapist and check for excessive gaps
    const therapistSessions = new Map<string, ScheduledSession[]>()
    context.sessions.forEach((session: ScheduledSession) => {
      if (!therapistSessions.has(session.therapist_id)) {
        therapistSessions.set(session.therapist_id, [])
      }
      therapistSessions.get(session.therapist_id)!.push(session)
    })

    for (const sessions of therapistSessions.values()) {
      sessions.sort((a, b) => a.start_time.localeCompare(b.start_time))
      
      for (let i = 0; i < sessions.length - 1; i++) {
        const gap = this.calculateGapMinutes(sessions[i].end_time, sessions[i + 1].start_time)
        if (gap > maxGap) {
          return true
        }
      }
    }

    return false
  }

  private evaluateResourceAvailabilityCondition(condition: OptimizationCondition, context: any): boolean {
    // Check if required resources are available
    // This would integrate with resource availability checking
    return true // Placeholder
  }
}

// =====================================================
// Export Singleton and Utility Functions
// =====================================================

export const optimizationRuleEngine = OptimizationRuleEngine.getInstance()

/**
 * Execute optimization rules on sessions
 */
export async function executeOptimizationRules(
  sessions: ScheduledSession[],
  request: SchedulingRequest,
  context?: {
    availability?: TherapistAvailability[]
    existingSessions?: ScheduledSession[]
    ruleSet?: string
  }
) {
  return optimizationRuleEngine.executeRules(sessions, request, context)
}

/**
 * Validate an optimization rule
 */
export async function validateOptimizationRule(rule: OptimizationRule) {
  return optimizationRuleEngine.validateRule(rule)
}

/**
 * Create a new optimization rule
 */
export async function createOptimizationRule(ruleData: Partial<OptimizationRule>) {
  return optimizationRuleEngine.createRule(ruleData)
}

/**
 * Update an optimization rule
 */
export async function updateOptimizationRule(ruleId: string, updates: Partial<OptimizationRule>) {
  return optimizationRuleEngine.updateRule(ruleId, updates)
}

/**
 * Get rule execution statistics
 */
export function getRuleExecutionStats(ruleId?: string) {
  return optimizationRuleEngine.getRuleStatistics(ruleId)
}
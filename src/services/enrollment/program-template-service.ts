import { supabase } from '@/lib/supabase'
import type { ProgramTemplate, PlanSession } from '@/types/enrollment'

export interface ProgramTemplateFilters {
  category_id?: string
  age_range?: {
    min_age?: number
    max_age?: number
  }
  duration_weeks?: {
    min?: number
    max?: number
  }
  intensity_level?: 'low' | 'medium' | 'high'
  search_term?: string
  is_active?: boolean
}

export interface CreateProgramTemplateRequest {
  name_en: string
  name_ar: string
  description_en: string
  description_ar: string
  category_id: string
  target_age_min: number
  target_age_max: number
  duration_weeks: number
  session_frequency: number
  default_intensity: 'low' | 'medium' | 'high'
  goals_en: string[]
  goals_ar: string[]
  prerequisites: string[]
  pricing: {
    base_price: number
    currency: string
    payment_frequency: 'weekly' | 'monthly' | 'full'
  }
  is_customizable: boolean
}

export class ProgramTemplateService {
  async getAllTemplates(filters?: ProgramTemplateFilters): Promise<{
    success: boolean
    templates?: ProgramTemplate[]
    message: string
  }> {
    try {
      let query = supabase
        .from('program_templates')
        .select(`
          *,
          plan_categories (
            id,
            name_en,
            name_ar,
            description_en,
            description_ar
          )
        `)

      // Apply filters
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id)
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      } else {
        query = query.eq('is_active', true) // Default to active templates only
      }

      if (filters?.age_range?.min_age) {
        query = query.gte('target_age_min', filters.age_range.min_age)
      }

      if (filters?.age_range?.max_age) {
        query = query.lte('target_age_max', filters.age_range.max_age)
      }

      if (filters?.duration_weeks?.min) {
        query = query.gte('duration_weeks', filters.duration_weeks.min)
      }

      if (filters?.duration_weeks?.max) {
        query = query.lte('duration_weeks', filters.duration_weeks.max)
      }

      if (filters?.search_term) {
        query = query.or(`name_en.ilike.%${filters.search_term}%,name_ar.ilike.%${filters.search_term}%,description_en.ilike.%${filters.search_term}%,description_ar.ilike.%${filters.search_term}%`)
      }

      const { data: templates, error } = await query.order('name_en', { ascending: true })

      if (error) {
        return {
          success: false,
          message: `Failed to retrieve templates: ${error.message}`
        }
      }

      return {
        success: true,
        templates: templates as ProgramTemplate[],
        message: 'Templates retrieved successfully'
      }
    } catch (error) {
      console.error('Error getting program templates:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while retrieving templates'
      }
    }
  }

  async getTemplateById(templateId: string): Promise<{
    success: boolean
    template?: ProgramTemplate & { sessions?: PlanSession[] }
    message: string
  }> {
    try {
      const [templateResult, sessionsResult] = await Promise.all([
        supabase
          .from('program_templates')
          .select(`
            *,
            plan_categories (
              id,
              name_en,
              name_ar,
              description_en,
              description_ar
            )
          `)
          .eq('id', templateId)
          .single(),
        supabase
          .from('plan_sessions')
          .select('*')
          .eq('therapy_plan_id', templateId)
          .order('session_number', { ascending: true })
      ])

      if (templateResult.error) {
        return {
          success: false,
          message: 'Template not found'
        }
      }

      const template = {
        ...templateResult.data,
        sessions: sessionsResult.data || []
      }

      return {
        success: true,
        template: template as ProgramTemplate & { sessions: PlanSession[] },
        message: 'Template retrieved successfully'
      }
    } catch (error) {
      console.error('Error getting program template by ID:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while retrieving template'
      }
    }
  }

  async createTemplate(templateData: CreateProgramTemplateRequest): Promise<{
    success: boolean
    template?: ProgramTemplate
    message: string
  }> {
    try {
      // Validate category exists
      const { data: category, error: categoryError } = await supabase
        .from('plan_categories')
        .select('id')
        .eq('id', templateData.category_id)
        .single()

      if (categoryError || !category) {
        return {
          success: false,
          message: 'Invalid category selected'
        }
      }

      const { data: template, error } = await supabase
        .from('program_templates')
        .insert({
          name_en: templateData.name_en,
          name_ar: templateData.name_ar,
          description_en: templateData.description_en,
          description_ar: templateData.description_ar,
          category_id: templateData.category_id,
          target_age_min: templateData.target_age_min,
          target_age_max: templateData.target_age_max,
          duration_weeks: templateData.duration_weeks,
          session_frequency: templateData.session_frequency,
          default_intensity: templateData.default_intensity,
          goals_en: templateData.goals_en,
          goals_ar: templateData.goals_ar,
          prerequisites: templateData.prerequisites,
          pricing: templateData.pricing,
          is_customizable: templateData.is_customizable,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (error) {
        return {
          success: false,
          message: `Failed to create template: ${error.message}`
        }
      }

      return {
        success: true,
        template: template as ProgramTemplate,
        message: 'Template created successfully'
      }
    } catch (error) {
      console.error('Error creating program template:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while creating template'
      }
    }
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<CreateProgramTemplateRequest>
  ): Promise<{
    success: boolean
    template?: ProgramTemplate
    message: string
  }> {
    try {
      const { data: template, error } = await supabase
        .from('program_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select('*')
        .single()

      if (error) {
        return {
          success: false,
          message: `Failed to update template: ${error.message}`
        }
      }

      return {
        success: true,
        template: template as ProgramTemplate,
        message: 'Template updated successfully'
      }
    } catch (error) {
      console.error('Error updating program template:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while updating template'
      }
    }
  }

  async deactivateTemplate(templateId: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // Check if template has active enrollments
      const { data: activeEnrollments } = await supabase
        .from('student_enrollments')
        .select('id')
        .eq('program_template_id', templateId)
        .eq('status', 'active')

      if (activeEnrollments && activeEnrollments.length > 0) {
        return {
          success: false,
          message: 'Cannot deactivate template with active enrollments'
        }
      }

      const { error } = await supabase
        .from('program_templates')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)

      if (error) {
        return {
          success: false,
          message: `Failed to deactivate template: ${error.message}`
        }
      }

      return {
        success: true,
        message: 'Template deactivated successfully'
      }
    } catch (error) {
      console.error('Error deactivating program template:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while deactivating template'
      }
    }
  }

  async getTemplatesForStudent(
    studentAge: number,
    excludeEnrolledTemplates = true
  ): Promise<{
    success: boolean
    templates?: ProgramTemplate[]
    message: string
  }> {
    try {
      let query = supabase
        .from('program_templates')
        .select(`
          *,
          plan_categories (
            id,
            name_en,
            name_ar
          )
        `)
        .eq('is_active', true)
        .lte('target_age_min', studentAge)
        .gte('target_age_max', studentAge)

      const { data: templates, error } = await query.order('name_en', { ascending: true })

      if (error) {
        return {
          success: false,
          message: `Failed to retrieve templates: ${error.message}`
        }
      }

      return {
        success: true,
        templates: templates as ProgramTemplate[],
        message: 'Templates retrieved successfully'
      }
    } catch (error) {
      console.error('Error getting templates for student:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while retrieving templates'
      }
    }
  }

  async getTemplateStats(templateId: string): Promise<{
    success: boolean
    stats?: {
      total_enrollments: number
      active_enrollments: number
      completed_enrollments: number
      completion_rate: number
      average_duration: number
      total_revenue: number
    }
    message: string
  }> {
    try {
      const [
        totalResult,
        activeResult,
        completedResult
      ] = await Promise.all([
        supabase
          .from('student_enrollments')
          .select('id, pricing')
          .eq('program_template_id', templateId),
        supabase
          .from('student_enrollments')
          .select('id')
          .eq('program_template_id', templateId)
          .eq('status', 'active'),
        supabase
          .from('student_enrollments')
          .select('id, enrollment_date, completion_date')
          .eq('program_template_id', templateId)
          .eq('status', 'completed')
      ])

      const totalEnrollments = totalResult.data?.length || 0
      const activeEnrollments = activeResult.data?.length || 0
      const completedEnrollments = completedResult.data?.length || 0

      const completionRate = totalEnrollments > 0 
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0

      // Calculate average duration for completed enrollments
      let averageDuration = 0
      if (completedResult.data && completedResult.data.length > 0) {
        const durations = completedResult.data.map(enrollment => {
          if (enrollment.enrollment_date && enrollment.completion_date) {
            const start = new Date(enrollment.enrollment_date)
            const end = new Date(enrollment.completion_date)
            return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          }
          return 0
        })
        averageDuration = Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
      }

      // Calculate total revenue
      const totalRevenue = totalResult.data?.reduce((sum, enrollment) => {
        return sum + (enrollment.pricing?.total_amount || 0)
      }, 0) || 0

      return {
        success: true,
        stats: {
          total_enrollments: totalEnrollments,
          active_enrollments: activeEnrollments,
          completed_enrollments: completedEnrollments,
          completion_rate: completionRate,
          average_duration: averageDuration,
          total_revenue: totalRevenue
        },
        message: 'Template statistics retrieved successfully'
      }
    } catch (error) {
      console.error('Error getting template statistics:', error)
      return {
        success: false,
        message: 'An unexpected error occurred while retrieving statistics'
      }
    }
  }
}

export const programTemplateService = new ProgramTemplateService()
import { PlanCategory } from './categories'

export interface TherapyPlan {
  id: string
  name_ar: string
  name_en?: string
  description_ar?: string
  description_en?: string
  category_id: string
  category?: PlanCategory
  duration_weeks: number
  sessions_per_week: number
  total_sessions: number
  price_per_session: number
  total_price: number
  discount_percentage: number
  final_price: number
  is_active: boolean
  is_featured: boolean
  prerequisites?: string
  target_age_min?: number
  target_age_max?: number
  max_students_per_session: number
  materials_needed: string[]
  learning_objectives: string[]
  created_by?: string
  created_at: string
  updated_at: string
}

export interface PlanSession {
  id: string
  plan_id: string
  session_number: number
  session_name_ar: string
  session_name_en?: string
  duration_minutes: number
  objectives_ar: string[]
  objectives_en: string[]
  materials_needed: string[]
  homework_activities: string[]
  assessment_criteria: Record<string, any>
  is_assessment_session: boolean
  created_at: string
  updated_at: string
}

export interface PlanTemplate {
  id: string
  name_ar: string
  name_en?: string
  description_ar?: string
  description_en?: string
  category_id: string
  template_data: Record<string, any>
  is_public: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Form types
export interface CreatePlanData {
  name_ar: string
  name_en?: string
  description_ar?: string
  description_en?: string
  category_id: string
  duration_weeks: number
  sessions_per_week: number
  price_per_session: number
  discount_percentage?: number
  prerequisites?: string
  target_age_min?: number
  target_age_max?: number
  max_students_per_session?: number
  materials_needed?: string[]
  learning_objectives?: string[]
  is_featured?: boolean
}

export interface UpdatePlanData extends Partial<CreatePlanData> {
  id: string
}

// Filter and search types
export interface PlanFilters {
  category_id?: string
  is_active?: boolean
  is_featured?: boolean
  search?: string
  price_min?: number
  price_max?: number
  duration_min?: number
  duration_max?: number
  target_age?: number
}

export interface PlanSortOptions {
  field: 'name_ar' | 'created_at' | 'final_price' | 'duration_weeks'
  direction: 'asc' | 'desc'
}

// API response types
export interface PlansResponse {
  data: TherapyPlan[]
  count: number
  page: number
  limit: number
  total_pages: number
}

export interface PlanStatsResponse {
  total_plans: number
  active_plans: number
  featured_plans: number
  categories_count: number
  average_price: number
  most_popular_category: string
}
export interface PlanCategory {
  id: string
  name_ar: string
  name_en?: string
  description_ar?: string
  description_en?: string
  color_code: string
  icon_name?: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateCategoryData {
  name_ar: string
  name_en?: string
  description_ar?: string
  description_en?: string
  color_code: string
  icon_name?: string
  sort_order?: number
  is_active?: boolean
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: string
}

export interface CategoryFilters {
  is_active?: boolean
  search?: string
}

export interface CategoryStats {
  id: string
  name_ar: string
  name_en?: string
  color_code: string
  icon_name: string
  plans_count: number
  total_revenue: number
  avg_plan_price: number
}

// Icon options for categories
export const CATEGORY_ICONS = [
  'mic',
  'hand',
  'brain',
  'activity',
  'book-open',
  'eye',
  'heart',
  'star',
  'users',
  'target',
  'zap',
  'compass'
] as const

export type CategoryIcon = typeof CATEGORY_ICONS[number]

// Color options for categories
export const CATEGORY_COLORS = [
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#EF4444', // red
  '#84CC16', // lime
  '#3B82F6', // blue
  '#F97316', // orange
  '#EC4899', // pink
  '#6B7280', // gray
] as const

export type CategoryColor = typeof CATEGORY_COLORS[number]
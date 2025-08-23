import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TherapyPlan, PlanFilters, CreatePlanData, UpdatePlanData } from '@/types/plans'
import { supabase } from '@/lib/supabase'

// Real Supabase API functions
const fetchPlans = async (filters?: PlanFilters): Promise<TherapyPlan[]> => {
  let query = supabase
    .from('therapy_plans')
    .select(`
      *,
      category:plan_categories(
        id,
        name_ar,
        name_en,
        color_code,
        icon_name
      )
    `)
    .order('created_at', { ascending: false })
  
  if (filters) {
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id)
    }
    
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }
    
    if (filters.is_featured !== undefined) {
      query = query.eq('is_featured', filters.is_featured)
    }
    
    if (filters.search) {
      query = query.or(`name_ar.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,description_ar.ilike.%${filters.search}%`)
    }
    
    if (filters.price_min !== undefined) {
      query = query.gte('final_price', filters.price_min)
    }
    
    if (filters.price_max !== undefined) {
      query = query.lte('final_price', filters.price_max)
    }
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching plans:', error)
    throw new Error(`Failed to fetch plans: ${error.message}`)
  }
  
  return data || []
}

const fetchPlan = async (id: string): Promise<TherapyPlan | null> => {
  const { data, error } = await supabase
    .from('therapy_plans')
    .select(`
      *,
      category:plan_categories(
        id,
        name_ar,
        name_en,
        color_code,
        icon_name
      )
    `)
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null // Plan not found
    }
    console.error('Error fetching plan:', error)
    throw new Error(`Failed to fetch plan: ${error.message}`)
  }
  
  return data
}

const createPlan = async (data: CreatePlanData): Promise<TherapyPlan> => {
  console.log('🔍 createPlan called with:', data)
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('👤 Current user:', user?.email)
  console.log('🔐 Auth error:', authError)
  console.log('🔍 Full auth response:', { user, authError })
  
  if (!user) {
    console.warn('⚠️ No user found, but continuing for testing...')
    // Temporarily commenting out auth check for testing
    // throw new Error('You must be logged in to create a plan')
  }
  
  // Filter out non-database fields before sending to Supabase
  const { session_types, program_price, ...dbData } = data
  
  // Calculate price_per_session from program_price if provided
  const totalSessions = session_types?.reduce((total: number, type: any) => {
    return total + (type.sessions_per_week * type.duration_weeks)
  }, 0) || (data.duration_weeks * data.sessions_per_week)
  
  const calculatedPricePerSession = program_price && totalSessions > 0 
    ? program_price / totalSessions 
    : data.price_per_session
  
  const planData = {
    ...dbData,
    price_per_session: calculatedPricePerSession,
    discount_percentage: data.discount_percentage || 0,
    is_featured: data.is_featured || false,
    materials_needed: data.materials_needed || [],
    learning_objectives: data.learning_objectives || [],
    max_students_per_session: data.max_students_per_session || 1,
    is_active: true,
    created_by: user?.id || null
  }
  
  console.log('📝 Sending to database:', planData)
  
  const { data: newPlan, error } = await supabase
    .from('therapy_plans')
    .insert([planData])
    .select(`
      *,
      category:plan_categories(
        id,
        name_ar,
        name_en,
        color_code,
        icon_name
      )
    `)
    .single()
  
  console.log('📊 Database response:', { newPlan, error })
  
  if (error) {
    console.error('❌ Database error:', error)
    throw new Error(`Failed to create plan: ${error.message}`)
  }
  
  return newPlan
}

const updatePlan = async (data: UpdatePlanData): Promise<TherapyPlan> => {
  const { id, ...updateData } = data
  
  const { data: updatedPlan, error } = await supabase
    .from('therapy_plans')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      *,
      category:plan_categories(
        id,
        name_ar,
        name_en,
        color_code,
        icon_name
      )
    `)
    .single()
  
  if (error) {
    console.error('Error updating plan:', error)
    throw new Error(`Failed to update plan: ${error.message}`)
  }
  
  return updatedPlan
}

const deletePlan = async (id: string): Promise<void> => {
  console.log('🗑️ Deleting plan with ID:', id)
  
  const { error } = await supabase
    .from('therapy_plans')
    .delete()
    .eq('id', id)
  
  console.log('📊 Delete response:', { error })
  
  if (error) {
    console.error('❌ Database error:', error)
    throw new Error(`Failed to delete plan: ${error.message}`)
  }
  
  console.log('✅ Plan deleted from database successfully')
}

// React Query hooks
export const usePlans = (filters?: PlanFilters) => {
  return useQuery({
    queryKey: ['plans', filters],
    queryFn: () => fetchPlans(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const usePlan = (id: string) => {
  return useQuery({
    queryKey: ['plan', id],
    queryFn: () => fetchPlan(id),
    enabled: !!id,
  })
}

export const useCreatePlan = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
    },
  })
}

export const useUpdatePlan = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updatePlan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.setQueryData(['plan', data.id], data)
    },
  })
}

export const useDeletePlan = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
    },
  })
}
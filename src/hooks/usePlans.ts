import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TherapyPlan, PlanFilters, CreatePlanData, UpdatePlanData } from '@/types/plans'
import { mockPlans } from '@/lib/mock-data'

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock API functions
const fetchPlans = async (filters?: PlanFilters): Promise<TherapyPlan[]> => {
  await delay(500) // Simulate network delay
  
  let filteredPlans = [...mockPlans]
  
  if (filters) {
    if (filters.category_id) {
      filteredPlans = filteredPlans.filter(plan => plan.category_id === filters.category_id)
    }
    
    if (filters.is_active !== undefined) {
      filteredPlans = filteredPlans.filter(plan => plan.is_active === filters.is_active)
    }
    
    if (filters.is_featured !== undefined) {
      filteredPlans = filteredPlans.filter(plan => plan.is_featured === filters.is_featured)
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredPlans = filteredPlans.filter(plan => 
        plan.name_ar.toLowerCase().includes(searchLower) ||
        plan.name_en?.toLowerCase().includes(searchLower) ||
        plan.description_ar?.toLowerCase().includes(searchLower)
      )
    }
    
    if (filters.price_min !== undefined) {
      filteredPlans = filteredPlans.filter(plan => plan.final_price >= filters.price_min!)
    }
    
    if (filters.price_max !== undefined) {
      filteredPlans = filteredPlans.filter(plan => plan.final_price <= filters.price_max!)
    }
  }
  
  return filteredPlans
}

const fetchPlan = async (id: string): Promise<TherapyPlan | null> => {
  await delay(300)
  return mockPlans.find(plan => plan.id === id) || null
}

const createPlan = async (data: CreatePlanData): Promise<TherapyPlan> => {
  await delay(1000)
  
  const newPlan: TherapyPlan = {
    id: Math.random().toString(36).substr(2, 9),
    ...data,
    discount_percentage: data.discount_percentage || 0,
    is_featured: data.is_featured || false,
    total_sessions: data.duration_weeks * data.sessions_per_week,
    total_price: (data.duration_weeks * data.sessions_per_week) * data.price_per_session,
    final_price: ((data.duration_weeks * data.sessions_per_week) * data.price_per_session) * (1 - (data.discount_percentage || 0) / 100),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    materials_needed: data.materials_needed || [],
    learning_objectives: data.learning_objectives || [],
    max_students_per_session: data.max_students_per_session || 1
  }
  
  return newPlan
}

const updatePlan = async (data: UpdatePlanData): Promise<TherapyPlan> => {
  await delay(1000)
  
  const existingPlan = mockPlans.find(plan => plan.id === data.id)
  if (!existingPlan) {
    throw new Error('Plan not found')
  }
  
  const updatedPlan: TherapyPlan = {
    ...existingPlan,
    ...data,
    updated_at: new Date().toISOString()
  }
  
  // Recalculate totals if relevant fields changed
  if (data.duration_weeks || data.sessions_per_week || data.price_per_session || data.discount_percentage !== undefined) {
    const duration = data.duration_weeks ?? existingPlan.duration_weeks
    const sessions = data.sessions_per_week ?? existingPlan.sessions_per_week
    const price = data.price_per_session ?? existingPlan.price_per_session
    const discount = data.discount_percentage ?? existingPlan.discount_percentage
    
    updatedPlan.total_sessions = duration * sessions
    updatedPlan.total_price = updatedPlan.total_sessions * price
    updatedPlan.final_price = updatedPlan.total_price * (1 - discount / 100)
  }
  
  return updatedPlan
}

const deletePlan = async (id: string): Promise<void> => {
  await delay(500)
  const index = mockPlans.findIndex(plan => plan.id === id)
  if (index === -1) {
    throw new Error('Plan not found')
  }
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
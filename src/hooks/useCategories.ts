import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlanCategory, CreateCategoryData, UpdateCategoryData } from '@/types/categories'
import { supabase } from '@/lib/supabase'

// Real Supabase API functions
const fetchCategories = async (): Promise<PlanCategory[]> => {
  const { data, error } = await supabase
    .from('plan_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  
  if (error) {
    console.error('Error fetching categories:', error)
    throw new Error(`Failed to fetch categories: ${error.message}`)
  }
  
  return data || []
}

const fetchAllCategories = async (): Promise<PlanCategory[]> => {
  const { data, error } = await supabase
    .from('plan_categories')
    .select('*')
    .order('sort_order', { ascending: true })
  
  if (error) {
    console.error('Error fetching all categories:', error)
    throw new Error(`Failed to fetch categories: ${error.message}`)
  }
  
  return data || []
}

const fetchCategory = async (id: string): Promise<PlanCategory | null> => {
  const { data, error } = await supabase
    .from('plan_categories')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null // Category not found
    }
    console.error('Error fetching category:', error)
    throw new Error(`Failed to fetch category: ${error.message}`)
  }
  
  return data
}

const createCategory = async (data: CreateCategoryData): Promise<PlanCategory> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('You must be logged in to create a category')
  }
  
  const categoryData = {
    ...data,
    sort_order: data.sort_order || 0,
    is_active: true
  }
  
  const { data: newCategory, error } = await supabase
    .from('plan_categories')
    .insert([categoryData])
    .select('*')
    .single()
  
  if (error) {
    console.error('Error creating category:', error)
    throw new Error(`Failed to create category: ${error.message}`)
  }
  
  return newCategory
}

const updateCategory = async (data: UpdateCategoryData): Promise<PlanCategory> => {
  const { id, ...updateData } = data
  
  const { data: updatedCategory, error } = await supabase
    .from('plan_categories')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single()
  
  if (error) {
    console.error('Error updating category:', error)
    throw new Error(`Failed to update category: ${error.message}`)
  }
  
  return updatedCategory
}

const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('plan_categories')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting category:', error)
    throw new Error(`Failed to delete category: ${error.message}`)
  }
}

// React Query hooks
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useAllCategories = () => {
  return useQuery({
    queryKey: ['categories', 'all'],
    queryFn: fetchAllCategories,
    staleTime: 10 * 60 * 1000,
  })
}

export const useCategory = (id: string) => {
  return useQuery({
    queryKey: ['category', id],
    queryFn: () => fetchCategory(id),
    enabled: !!id,
  })
}

export const useCreateCategory = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export const useUpdateCategory = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.setQueryData(['category', data.id], data)
    },
  })
}

export const useDeleteCategory = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
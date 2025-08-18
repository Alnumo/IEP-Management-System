import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlanCategory, CreateCategoryData, UpdateCategoryData } from '@/types/categories'
import { mockCategories } from '@/lib/mock-data'

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock API functions
const fetchCategories = async (): Promise<PlanCategory[]> => {
  await delay(300)
  return mockCategories.filter(category => category.is_active)
}

const fetchAllCategories = async (): Promise<PlanCategory[]> => {
  await delay(300)
  return mockCategories
}

const fetchCategory = async (id: string): Promise<PlanCategory | null> => {
  await delay(200)
  return mockCategories.find(category => category.id === id) || null
}

const createCategory = async (data: CreateCategoryData): Promise<PlanCategory> => {
  await delay(800)
  
  const newCategory: PlanCategory = {
    id: Math.random().toString(36).substr(2, 9),
    ...data,
    sort_order: data.sort_order || 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  return newCategory
}

const updateCategory = async (data: UpdateCategoryData): Promise<PlanCategory> => {
  await delay(800)
  
  const existingCategory = mockCategories.find(category => category.id === data.id)
  if (!existingCategory) {
    throw new Error('Category not found')
  }
  
  const updatedCategory: PlanCategory = {
    ...existingCategory,
    ...data,
    updated_at: new Date().toISOString()
  }
  
  return updatedCategory
}

const deleteCategory = async (id: string): Promise<void> => {
  await delay(500)
  const index = mockCategories.findIndex(category => category.id === id)
  if (index === -1) {
    throw new Error('Category not found')
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
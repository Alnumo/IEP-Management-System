import { useNavigate } from 'react-router-dom'
import { CategoryForm } from '@/components/forms/CategoryForm'
import { useCreateCategory } from '@/hooks/useCategories'
import { CategoryFormData } from '@/components/forms/CategoryForm'

export const AddCategoryPage = () => {
  const navigate = useNavigate()
  const createCategoryMutation = useCreateCategory()

  const handleSubmit = async (data: CategoryFormData) => {
    console.log('🔍 AddCategoryPage: Starting submission with data:', data)
    try {
      console.log('🔍 AddCategoryPage: Calling mutateAsync...')
      const result = await createCategoryMutation.mutateAsync(data)
      console.log('✅ AddCategoryPage: Category created successfully:', result)
      navigate('/categories')
    } catch (error) {
      console.error('❌ AddCategoryPage: Failed to create category:', error)
      // TODO: Show error toast/notification
    }
  }

  const handleCancel = () => {
    navigate('/categories')
  }

  return (
    <CategoryForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={createCategoryMutation.isPending}
    />
  )
}
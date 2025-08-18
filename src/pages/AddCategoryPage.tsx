import { useNavigate } from 'react-router-dom'
import { CategoryForm } from '@/components/forms/CategoryForm'
import { useCreateCategory } from '@/hooks/useCategories'
import { CategoryFormData } from '@/components/forms/CategoryForm'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'

export const AddCategoryPage = () => {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { t } = useTranslation()
  const createCategoryMutation = useCreateCategory()

  const handleSubmit = async (data: CategoryFormData) => {
    try {
      await createCategoryMutation.mutateAsync(data)
      navigate('/categories')
    } catch (error) {
      console.error('Failed to create category:', error)
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
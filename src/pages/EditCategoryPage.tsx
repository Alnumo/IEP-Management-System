import { useParams, useNavigate } from 'react-router-dom'
import { CategoryForm } from '@/components/forms/CategoryForm'
import { useCategory, useUpdateCategory } from '@/hooks/useCategories'
import { CategoryFormData } from '@/components/forms/CategoryForm'
import { useLanguage } from '@/contexts/LanguageContext'

export const EditCategoryPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language } = useLanguage()
  
  const { data: category, isLoading, error } = useCategory(id!)
  const updateCategoryMutation = useUpdateCategory()

  const handleSubmit = async (data: CategoryFormData) => {
    if (!id) return
    
    try {
      await updateCategoryMutation.mutateAsync({ id, ...data })
      navigate('/categories')
    } catch (error) {
      console.error('Failed to update category:', error)
      // Error handled through console logging and user feedback
    }
  }

  const handleCancel = () => {
    navigate('/categories')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`${language === 'ar' ? 'font-arabic' : ''}`}>
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </p>
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-red-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
          {language === 'ar' ? 'الفئة غير موجودة' : 'Category not found'}
        </p>
      </div>
    )
  }

  return (
    <CategoryForm
      initialData={category}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={updateCategoryMutation.isPending}
    />
  )
}
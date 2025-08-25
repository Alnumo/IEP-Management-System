import { useParams, useNavigate } from 'react-router-dom'
import { PlanForm } from '@/components/forms/PlanForm'
import { usePlan, useUpdatePlan } from '@/hooks/usePlans'
import { PlanFormData } from '@/lib/validations'
import { useLanguage } from '@/contexts/LanguageContext'

export const EditPlanPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language } = useLanguage()
  
  const { data: plan, isLoading, error } = usePlan(id!)
  const updatePlanMutation = useUpdatePlan()

  const handleSubmit = async (data: PlanFormData) => {
    if (!id) return
    
    try {
      await updatePlanMutation.mutateAsync({ id, ...data })
      navigate('/plans')
    } catch (error) {
      console.error('Failed to update plan:', error)
      // Error handled through console logging and user feedback
    }
  }

  const handleCancel = () => {
    navigate('/plans')
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

  if (error || !plan) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-red-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
          {language === 'ar' ? 'البرنامج غير موجود' : 'Plan not found'}
        </p>
      </div>
    )
  }

  return (
    <PlanForm
      initialData={plan}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={updatePlanMutation.isPending}
    />
  )
}
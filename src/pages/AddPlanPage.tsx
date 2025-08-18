import { useNavigate } from 'react-router-dom'
import { PlanForm } from '@/components/forms/PlanForm'
import { useCreatePlan } from '@/hooks/usePlans'
import { PlanFormData } from '@/lib/validations'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'

export const AddPlanPage = () => {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { t } = useTranslation()
  const createPlanMutation = useCreatePlan()

  const handleSubmit = async (data: PlanFormData) => {
    try {
      await createPlanMutation.mutateAsync(data)
      navigate('/plans')
    } catch (error) {
      console.error('Failed to create plan:', error)
      // TODO: Show error toast/notification
    }
  }

  const handleCancel = () => {
    navigate('/plans')
  }

  return (
    <PlanForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={createPlanMutation.isPending}
    />
  )
}
import { useNavigate } from 'react-router-dom'
import { PlanForm } from '@/components/forms/PlanForm'
import { useCreatePlan } from '@/hooks/usePlans'
import { PlanFormData } from '@/lib/validations'

export const AddPlanPage = () => {
  const navigate = useNavigate()
  const createPlanMutation = useCreatePlan()

  const handleSubmit = async (data: PlanFormData) => {
    console.log('🚀 Form submitted with data:', data)
    try {
      console.log('⏳ Creating plan...')
      const result = await createPlanMutation.mutateAsync(data)
      console.log('✅ Plan created successfully:', result)
      navigate('/plans')
    } catch (error) {
      console.error('❌ Failed to create plan:', error)
      alert(`خطأ في إنشاء البرنامج: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
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
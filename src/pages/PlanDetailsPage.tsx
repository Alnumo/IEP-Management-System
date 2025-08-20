import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Copy, Trash2, Calendar, Clock, Users, Star, DollarSign, Target, BookOpen, Package } from 'lucide-react'
import { usePlan, useDeletePlan } from '@/hooks/usePlans'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatCurrency } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export const PlanDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language, isRTL } = useLanguage()
  
  const { data: plan, isLoading, error } = usePlan(id!)
  const deletePlanMutation = useDeletePlan()

  const handleEdit = () => {
    navigate(`/plans/edit/${id}`)
  }

  const handleDuplicate = () => {
    if (!plan) return
    
    console.log('Duplicate plan:', id)
    
    // Navigate to add page with pre-filled data from this plan
    // We'll pass the plan data through URL state
    navigate('/plans/add', { 
      state: { 
        duplicateFrom: {
          name_ar: `نسخة من ${plan.name_ar}`,
          name_en: plan.name_en ? `Copy of ${plan.name_en}` : '',
          description_ar: plan.description_ar,
          description_en: plan.description_en,
          category_id: plan.category_id,
          duration_weeks: plan.duration_weeks,
          sessions_per_week: plan.sessions_per_week,
          price_per_session: plan.price_per_session,
          discount_percentage: plan.discount_percentage,
          target_age_min: plan.target_age_min,
          target_age_max: plan.target_age_max,
          max_students_per_session: plan.max_students_per_session,
          materials_needed: plan.materials_needed,
          learning_objectives: plan.learning_objectives,
          prerequisites: plan.prerequisites,
          is_featured: false // Don't duplicate featured status
        }
      }
    })
  }

  const handleDelete = async () => {
    if (!plan) return
    
    console.log('Delete plan:', id)
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف البرنامج "${plan.name_ar}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`
    )
    
    if (!confirmed) return
    
    try {
      await deletePlanMutation.mutateAsync(id!)
      console.log('✅ Plan deleted successfully')
      // Navigate back to plans list after successful deletion
      navigate('/plans')
    } catch (error) {
      console.error('❌ Failed to delete plan:', error)
      alert(`خطأ في حذف البرنامج: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    }
  }

  const handleBack = () => {
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
    <div className="max-w-6xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className={`${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
          {language === 'ar' ? 'العودة للبرامج' : 'Back to Plans'}
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'تعديل' : 'Edit'}
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'نسخ' : 'Duplicate'}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'حذف' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: plan.category?.color_code || '#3B82F6' }}
                    />
                    <Badge variant="outline">
                      {language === 'ar' ? plan.category?.name_ar : plan.category?.name_en || plan.category?.name_ar}
                    </Badge>
                    {plan.is_featured && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        {language === 'ar' ? 'مميز' : 'Featured'}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className={`text-3xl ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? plan.name_ar : plan.name_en || plan.name_ar}
                  </CardTitle>
                  {((language === 'ar' && plan.name_en) || (language === 'en' && plan.name_ar)) && (
                    <p className="text-lg text-muted-foreground">
                      {language === 'ar' ? plan.name_en : plan.name_ar}
                    </p>
                  )}
                </div>
                <div className={`text-${isRTL ? 'left' : 'right'}`}>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(plan.final_price)}
                  </div>
                  {plan.discount_percentage > 0 && (
                    <div className="text-sm text-muted-foreground line-through">
                      {formatCurrency(plan.total_price)}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description */}
              {(plan.description_ar || plan.description_en) && (
                <div>
                  <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? plan.description_ar : plan.description_en || plan.description_ar}
                  </p>
                </div>
              )}

              <Separator />

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'}`}>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'المدة' : 'Duration'}
                    </p>
                    <p className="font-semibold">
                      {plan.duration_weeks} {language === 'ar' ? 'أسابيع' : 'weeks'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'}`}>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'جلسات/أسبوع' : 'Sessions/week'}
                    </p>
                    <p className="font-semibold">{plan.sessions_per_week}</p>
                  </div>
                </div>

                <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'}`}>
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'إجمالي الجلسات' : 'Total sessions'}
                    </p>
                    <p className="font-semibold">{plan.total_sessions}</p>
                  </div>
                </div>

                <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'}`}>
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'سعر الجلسة' : 'Per session'}
                    </p>
                    <p className="font-semibold">{formatCurrency(plan.price_per_session)}</p>
                  </div>
                </div>
              </div>

              {/* Age Range */}
              {(plan.target_age_min !== undefined || plan.target_age_max !== undefined) && (
                <>
                  <Separator />
                  <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'}`}>
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الفئة العمرية المستهدفة' : 'Target Age Range'}
                      </p>
                      <p className="font-semibold">
                        {plan.target_age_min && plan.target_age_max 
                          ? `${plan.target_age_min} - ${plan.target_age_max} ${language === 'ar' ? 'سنة' : 'years'}`
                          : plan.target_age_min 
                            ? `${plan.target_age_min}+ ${language === 'ar' ? 'سنة' : 'years'}`
                            : `${language === 'ar' ? 'حتى' : 'up to'} ${plan.target_age_max} ${language === 'ar' ? 'سنة' : 'years'}`
                        }
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Prerequisites */}
              {plan.prerequisites && (
                <>
                  <Separator />
                  <div>
                    <h4 className={`font-semibold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'المتطلبات المسبقة' : 'Prerequisites'}
                    </h4>
                    <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {plan.prerequisites}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Materials and Objectives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Required Materials */}
            {plan.materials_needed && plan.materials_needed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} ${language === 'ar' ? 'font-arabic' : ''}`}>
                    <Package className="h-5 w-5" />
                    <span>{language === 'ar' ? 'المواد المطلوبة' : 'Required Materials'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {plan.materials_needed.map((material, index) => (
                      <div key={index} className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'}`}>
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>{material}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Learning Objectives */}
            {plan.learning_objectives && plan.learning_objectives.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} ${language === 'ar' ? 'font-arabic' : ''}`}>
                    <BookOpen className="h-5 w-5" />
                    <span>{language === 'ar' ? 'أهداف التعلم' : 'Learning Objectives'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {plan.learning_objectives.map((objective, index) => (
                      <div key={index} className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'}`}>
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>{objective}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'معلومات عامة' : 'General Info'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'الحالة' : 'Status'}
                </p>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active 
                    ? (language === 'ar' ? 'نشط' : 'Active')
                    : (language === 'ar' ? 'غير نشط' : 'Inactive')
                  }
                </Badge>
              </div>

              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'عدد الطلاب/الجلسة' : 'Students per session'}
                </p>
                <p className="font-semibold">{plan.max_students_per_session}</p>
              </div>

              {/* Temporarily hidden until DB is updated
              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'أيام تجميد الاشتراك المسموح' : 'Allowed freeze days'}
                </p>
                <p className="font-semibold">
                  {plan.allowed_freeze_days || 0} {language === 'ar' ? 'يوم' : 'days'}
                </p>
              </div>
              */}

              {plan.discount_percentage > 0 && (
                <div>
                  <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'نسبة الخصم' : 'Discount'}
                  </p>
                  <Badge variant="destructive">{plan.discount_percentage}%</Badge>
                </div>
              )}

              <Separator />

              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}
                </p>
                <p className="text-sm">
                  {new Date(plan.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>

              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'آخر تحديث' : 'Last updated'}
                </p>
                <p className="text-sm">
                  {new Date(plan.updated_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'تفاصيل التسعير' : 'Pricing Breakdown'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'سعر الجلسة' : 'Session price'}
                </span>
                <span className="text-sm font-medium">{formatCurrency(plan.price_per_session)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'عدد الجلسات' : 'Total sessions'}
                </span>
                <span className="text-sm font-medium">{plan.total_sessions}</span>
              </div>
              
              <div className="flex justify-between">
                <span className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'السعر الإجمالي' : 'Subtotal'}
                </span>
                <span className="text-sm font-medium">{formatCurrency(plan.total_price)}</span>
              </div>
              
              {plan.discount_percentage > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'خصم' : 'Discount'} ({plan.discount_percentage}%)
                  </span>
                  <span className="text-sm font-medium">-{formatCurrency(plan.total_price - plan.final_price)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between">
                <span className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'المجموع النهائي' : 'Final Total'}
                </span>
                <span className="font-bold text-primary">{formatCurrency(plan.final_price)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
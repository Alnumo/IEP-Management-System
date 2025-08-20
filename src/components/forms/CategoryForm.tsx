import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { PlanCategory } from '@/types/categories'

// Validation schema
const categorySchema = z.object({
  name_ar: z.string().min(1, 'الاسم العربي مطلوب'),
  name_en: z.string().optional(),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  color_code: z.string().regex(/^#[0-9A-F]{6}$/i, 'يجب أن يكون رمز اللون صالحاً'),
  icon_name: z.string().optional(),
  sort_order: z.number().min(0).optional(),
  is_active: z.boolean().default(true)
})

export type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryFormProps {
  initialData?: Partial<PlanCategory>
  onSubmit: (data: CategoryFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

export const CategoryForm = ({ initialData, onSubmit, onCancel, isLoading = false }: CategoryFormProps) => {
  const { language, isRTL } = useLanguage()

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name_ar: initialData?.name_ar || '',
      name_en: initialData?.name_en || '',
      description_ar: initialData?.description_ar || '',
      description_en: initialData?.description_en || '',
      color_code: initialData?.color_code || '#3B82F6',
      icon_name: initialData?.icon_name || '',
      sort_order: initialData?.sort_order || 0,
      is_active: initialData?.is_active ?? true
    }
  })

  const handleSubmit = (data: CategoryFormData) => {
    console.log('🔍 CategoryForm: Submitting data:', data)
    onSubmit(data)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
          {initialData 
            ? (language === 'ar' ? 'تعديل الفئة' : 'Edit Category')
            : (language === 'ar' ? 'إضافة فئة جديدة' : 'Add New Category')
          }
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'معلومات أساسية' : 'Basic Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Arabic Name */}
            <div className="space-y-2">
              <Label htmlFor="name_ar" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الاسم العربي' : 'Arabic Name'} *
              </Label>
              <Input
                id="name_ar"
                {...form.register('name_ar')}
                className={`${language === 'ar' ? 'font-arabic text-right' : ''}`}
                placeholder={language === 'ar' ? 'أدخل الاسم العربي للفئة' : 'Enter Arabic name'}
                dir="rtl"
              />
              {form.formState.errors.name_ar && (
                <p className={`text-sm text-red-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {form.formState.errors.name_ar.message}
                </p>
              )}
            </div>

            {/* English Name */}
            <div className="space-y-2">
              <Label htmlFor="name_en" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الاسم الإنجليزي' : 'English Name'}
              </Label>
              <Input
                id="name_en"
                {...form.register('name_en')}
                placeholder={language === 'ar' ? 'أدخل الاسم الإنجليزي (اختياري)' : 'Enter English name (optional)'}
                dir="ltr"
              />
            </div>

            {/* Color Code */}
            <div className="space-y-2">
              <Label htmlFor="color_code" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'لون الفئة' : 'Category Color'}
              </Label>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Input
                  id="color_code"
                  type="color"
                  {...form.register('color_code')}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <Input
                  {...form.register('color_code')}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
              {form.formState.errors.color_code && (
                <p className={`text-sm text-red-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {form.formState.errors.color_code.message}
                </p>
              )}
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sort_order" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'ترتيب العرض' : 'Display Order'}
              </Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                {...form.register('sort_order', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            {/* Status */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="space-y-1">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'الحالة' : 'Status'}
                </Label>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'تفعيل أو إلغاء تفعيل الفئة' : 'Enable or disable this category'}
                </p>
              </div>
              <Switch
                checked={form.watch('is_active')}
                onCheckedChange={(checked) => form.setValue('is_active', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Descriptions */}
        <Card>
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'الوصف' : 'Description'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Arabic Description */}
            <div className="space-y-2">
              <Label htmlFor="description_ar" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الوصف العربي' : 'Arabic Description'}
              </Label>
              <Textarea
                id="description_ar"
                {...form.register('description_ar')}
                className={`${language === 'ar' ? 'font-arabic text-right' : ''} min-h-[100px]`}
                placeholder={language === 'ar' ? 'أدخل وصف الفئة باللغة العربية' : 'Enter Arabic description'}
                dir="rtl"
              />
            </div>

            {/* English Description */}
            <div className="space-y-2">
              <Label htmlFor="description_en" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الوصف الإنجليزي' : 'English Description'}
              </Label>
              <Textarea
                id="description_en"
                {...form.register('description_en')}
                className="min-h-[100px]"
                placeholder={language === 'ar' ? 'أدخل الوصف باللغة الإنجليزية (اختياري)' : 'Enter English description (optional)'}
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" disabled={isLoading}>
            {isLoading 
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (language === 'ar' ? 'حفظ' : 'Save')
            }
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      </form>
    </div>
  )
}
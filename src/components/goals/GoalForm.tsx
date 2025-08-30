import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { CreateTherapyGoal } from '@/types/therapy-data'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

const goalFormSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  therapist_id: z.string().min(1, 'Therapist is required'),
  therapy_type: z.enum(['aba', 'speech', 'occupational', 'physical']),
  goal_category: z.string().min(1, 'Goal category is required'),
  goal_description: z.string().min(10, 'Goal description must be at least 10 characters'),
  target_behavior: z.string().min(5, 'Target behavior is required'),
  priority_level: z.enum(['high', 'medium', 'low']),
  target_date: z.date(),
  baseline_measurement_type: z.enum(['frequency', 'duration', 'percentage', 'rate', 'level_of_assistance', 'accuracy']),
  baseline_value: z.number().min(0),
  baseline_unit: z.string().min(1, 'Baseline unit is required'),
  target_value: z.number().min(0),
  target_unit: z.string().min(1, 'Target unit is required'),
  success_criteria: z.string().min(10, 'Success criteria is required'),
  consecutive_sessions: z.number().min(1).max(10),
  generalization_required: z.boolean(),
  data_collection_method: z.string().min(1, 'Data collection method is required'),
  measurement_frequency: z.string().min(1, 'Measurement frequency is required'),
  strategies: z.string().min(10, 'Strategies and interventions are required'),
  materials: z.string().min(5, 'Materials and resources are required'),
  environmental_supports: z.string().optional(),
})

type GoalFormData = z.infer<typeof goalFormSchema>

interface GoalFormProps {
  onSubmit: (data: CreateTherapyGoal) => void
  onCancel: () => void
  initialData?: Partial<CreateTherapyGoal>
  isLoading?: boolean
}

export default function GoalForm({ onSubmit, onCancel, initialData, isLoading }: GoalFormProps) {
  const { language } = useLanguage()
  
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      student_id: initialData?.student_id || '',
      therapist_id: initialData?.therapist_id || '',
      therapy_type: initialData?.therapy_type || 'aba',
      goal_category: initialData?.goal_category || '',
      goal_description: initialData?.goal_description || '',
      target_behavior: initialData?.target_behavior || '',
      priority_level: initialData?.priority_level || 'medium',
      target_date: initialData?.target_date ? new Date(initialData.target_date) : new Date(),
      baseline_measurement_type: initialData?.baseline_measurement?.measurement_type || 'frequency',
      baseline_value: initialData?.baseline_measurement?.baseline_value || 0,
      baseline_unit: initialData?.baseline_measurement?.measurement_unit || '',
      target_value: initialData?.target_criteria?.target_value || 0,
      target_unit: initialData?.target_criteria?.target_unit || '',
      success_criteria: initialData?.target_criteria?.success_criteria || '',
      consecutive_sessions: initialData?.target_criteria?.consecutive_sessions_required || 3,
      generalization_required: initialData?.target_criteria?.generalization_required || false,
      data_collection_method: initialData?.data_collection_method || '',
      measurement_frequency: initialData?.measurement_frequency || '',
      strategies: initialData?.strategies_interventions?.join(', ') || '',
      materials: initialData?.materials_resources?.join(', ') || '',
      environmental_supports: initialData?.environmental_supports?.join(', ') || '',
    }
  })

  const handleSubmit = (data: GoalFormData) => {
    const goalData: CreateTherapyGoal = {
      student_id: data.student_id,
      therapist_id: data.therapist_id,
      therapy_type: data.therapy_type,
      goal_category: data.goal_category,
      goal_description: data.goal_description,
      target_behavior: data.target_behavior,
      baseline_measurement: {
        measurement_type: data.baseline_measurement_type,
        baseline_value: data.baseline_value,
        baseline_date: new Date().toISOString().split('T')[0],
        measurement_unit: data.baseline_unit,
        measurement_context: 'Initial assessment'
      },
      target_criteria: {
        target_value: data.target_value,
        target_unit: data.target_unit,
        success_criteria: data.success_criteria,
        consecutive_sessions_required: data.consecutive_sessions,
        generalization_required: data.generalization_required,
        maintenance_period_days: 30
      },
      priority_level: data.priority_level,
      goal_status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      target_date: data.target_date.toISOString().split('T')[0],
      data_collection_method: data.data_collection_method,
      measurement_frequency: data.measurement_frequency,
      strategies_interventions: data.strategies.split(',').map(s => s.trim()),
      materials_resources: data.materials.split(',').map(m => m.trim()),
      environmental_supports: data.environmental_supports?.split(',').map(e => e.trim()) || [],
      generalization_settings: ['Classroom', 'Home'],
      maintenance_plan: 'Weekly probes after achieving mastery',
      progress_data: [],
      review_notes: [],
      mastery_criteria_met: false
    }

    onSubmit(goalData)
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الطالب' : 'Student'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر الطالب' : 'Select Student'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student-1">Ahmed Ali</SelectItem>
                          <SelectItem value="student-2">Sarah Mohammad</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="therapist_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'المعالج' : 'Therapist'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر المعالج' : 'Select Therapist'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="therapist-1">Dr. Fatima Hassan</SelectItem>
                          <SelectItem value="therapist-2">Mr. Omar Khalil</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="therapy_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'نوع العلاج' : 'Therapy Type'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="aba">{language === 'ar' ? 'العلاج السلوكي' : 'ABA Therapy'}</SelectItem>
                          <SelectItem value="speech">{language === 'ar' ? 'علاج النطق' : 'Speech Therapy'}</SelectItem>
                          <SelectItem value="occupational">{language === 'ar' ? 'العلاج الوظيفي' : 'Occupational Therapy'}</SelectItem>
                          <SelectItem value="physical">{language === 'ar' ? 'العلاج الطبيعي' : 'Physical Therapy'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مستوى الأولوية' : 'Priority Level'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">{language === 'ar' ? 'عالي' : 'High'}</SelectItem>
                          <SelectItem value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                          <SelectItem value="low">{language === 'ar' ? 'منخفض' : 'Low'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Goal Definition */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'تعريف الهدف' : 'Goal Definition'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="goal_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'فئة الهدف' : 'Goal Category'}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={language === 'ar' ? 'مثال: التواصل' : 'e.g., Communication'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goal_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'وصف الهدف' : 'Goal Description'}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder={language === 'ar' ? 'اكتب وصف مفصل للهدف' : 'Write a detailed description of the goal'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_behavior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'السلوك المستهدف' : 'Target Behavior'}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder={language === 'ar' ? 'اكتب السلوك المحدد المستهدف' : 'Write the specific target behavior'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'التاريخ المستهدف' : 'Target Date'}
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>{language === 'ar' ? 'اختر التاريخ' : 'Pick a date'}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Measurement Criteria */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'معايير القياس' : 'Measurement Criteria'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="baseline_measurement_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'نوع القياس' : 'Measurement Type'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="frequency">{language === 'ar' ? 'التكرار' : 'Frequency'}</SelectItem>
                          <SelectItem value="duration">{language === 'ar' ? 'المدة' : 'Duration'}</SelectItem>
                          <SelectItem value="percentage">{language === 'ar' ? 'النسبة المئوية' : 'Percentage'}</SelectItem>
                          <SelectItem value="accuracy">{language === 'ar' ? 'الدقة' : 'Accuracy'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseline_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'القيمة الأساسية' : 'Baseline Value'}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseline_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'وحدة القياس' : 'Unit'}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={language === 'ar' ? 'مثال: مرات/جلسة' : 'e.g., times/session'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="target_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'القيمة المستهدفة' : 'Target Value'}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'وحدة الهدف' : 'Target Unit'}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={language === 'ar' ? 'مثال: مرات/جلسة' : 'e.g., times/session'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="success_criteria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'معايير النجاح' : 'Success Criteria'}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder={language === 'ar' ? 'اكتب معايير النجاح المحددة' : 'Write specific success criteria'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consecutive_sessions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الجلسات المتتالية المطلوبة' : 'Consecutive Sessions Required'}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="10" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Implementation Details */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'تفاصيل التنفيذ' : 'Implementation Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_collection_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'طريقة جمع البيانات' : 'Data Collection Method'}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={language === 'ar' ? 'مثال: عد التكرار' : 'e.g., Frequency count'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="measurement_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تكرار القياس' : 'Measurement Frequency'}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={language === 'ar' ? 'مثال: كل جلسة' : 'e.g., Every session'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="strategies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الاستراتيجيات والتدخلات (مفصولة بفاصلة)' : 'Strategies and Interventions (comma-separated)'}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder={language === 'ar' ? 'مثال: الإشارات البصرية، النمذجة اللفظية، جدول التعزيز' : 'e.g., Visual prompts, Verbal modeling, Reinforcement schedule'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="materials"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'المواد والموارد (مفصولة بفاصلة)' : 'Materials and Resources (comma-separated)'}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder={language === 'ar' ? 'مثال: بطاقات الصور، العناصر المفضلة، أوراق جمع البيانات' : 'e.g., Picture cards, Preferred items, Data collection sheets'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="environmental_supports"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الدعم البيئي (اختياري)' : 'Environmental Supports (Optional)'}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder={language === 'ar' ? 'مثال: بيئة هادئة، تقليل المشتتات' : 'e.g., Quiet setting, Minimize distractions'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ الهدف' : 'Save Goal')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
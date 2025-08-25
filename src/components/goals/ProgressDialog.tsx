import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'
import { TherapyGoal, GoalProgressData } from '@/types/therapy-data'
import { useGoals } from '@/hooks/useGoals'

const progressSchema = z.object({
  measurement_date: z.date(),
  measured_value: z.number().min(0),
  measurement_context: z.string().min(1, 'Context is required'),
  notes: z.string().min(1, 'Notes are required'),
  trend_direction: z.enum(['improving', 'maintaining', 'declining'])
})

type ProgressFormData = z.infer<typeof progressSchema>

interface ProgressDialogProps {
  goal: TherapyGoal
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function ProgressDialog({ goal, trigger, open, onOpenChange }: ProgressDialogProps) {
  const { language } = useLanguage()
  const { addProgressData } = useGoals()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const form = useForm<ProgressFormData>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      measurement_date: new Date(),
      measured_value: 0,
      measurement_context: '',
      notes: '',
      trend_direction: 'maintaining'
    }
  })

  const handleSubmit = async (data: ProgressFormData) => {
    setIsSubmitting(true)
    try {
      const progressData: Omit<GoalProgressData, 'id'> = {
        measurement_date: data.measurement_date.toISOString().split('T')[0],
        measured_value: data.measured_value,
        measurement_context: data.measurement_context,
        notes: data.notes,
        recorded_by: 'current-user', // This would come from auth context
        trend_direction: data.trend_direction
      }

      await addProgressData(goal.id, progressData)
      
      // Close dialog and reset form
      const currentOpen = open !== undefined ? open : dialogOpen
      if (onOpenChange) {
        onOpenChange(false)
      } else {
        setDialogOpen(false)
      }
      
      form.reset()
    } catch (error) {
      console.error('Failed to add progress data:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentOpen = open !== undefined ? open : dialogOpen
  const setCurrentOpen = onOpenChange || setDialogOpen

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600'
      case 'maintaining': return 'text-yellow-600'
      case 'declining': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendText = (trend: string) => {
    const trendMap = {
      'improving': language === 'ar' ? 'تحسن' : 'Improving',
      'maintaining': language === 'ar' ? 'ثبات' : 'Maintaining',
      'declining': language === 'ar' ? 'تراجع' : 'Declining'
    }
    return trendMap[trend as keyof typeof trendMap] || trend
  }

  return (
    <Dialog open={currentOpen} onOpenChange={setCurrentOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <TrendingUp className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'إضافة تقدم' : 'Add Progress'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'إضافة بيانات التقدم' : 'Add Progress Data'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {/* Goal Information */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {goal.goal_description}
            </h4>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                <span className="font-medium">
                  {language === 'ar' ? 'النوع:' : 'Type:'}
                </span>{' '}
                {goal.baseline_measurement.measurement_type}
              </span>
              <span>
                <span className="font-medium">
                  {language === 'ar' ? 'الوحدة:' : 'Unit:'}
                </span>{' '}
                {goal.baseline_measurement.measurement_unit}
              </span>
              <span>
                <span className="font-medium">
                  {language === 'ar' ? 'الهدف:' : 'Target:'}
                </span>{' '}
                {goal.target_criteria.target_value} {goal.target_criteria.target_unit}
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Date and Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="measurement_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ القياس' : 'Measurement Date'}
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
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="measured_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'القيمة المقاسة' : 'Measured Value'}
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                          <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground">
                            {goal.baseline_measurement.measurement_unit}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Context and Trend */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="measurement_context"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'سياق القياس' : 'Measurement Context'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={language === 'ar' ? 'مثال: جلسة علاج منظمة' : 'e.g., Structured therapy session'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trend_direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'اتجاه التقدم' : 'Trend Direction'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="improving">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              {getTrendText('improving')}
                            </div>
                          </SelectItem>
                          <SelectItem value="maintaining">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              {getTrendText('maintaining')}
                            </div>
                          </SelectItem>
                          <SelectItem value="declining">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              {getTrendText('declining')}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'ملاحظات التقدم' : 'Progress Notes'}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        rows={4}
                        placeholder={language === 'ar' ? 'اكتب ملاحظات مفصلة حول الأداء والتقدم...' : 'Write detailed notes about performance and progress...'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Progress Calculation */}
              {form.watch('measured_value') > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h5 className={`font-medium text-blue-900 mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'حساب التقدم' : 'Progress Calculation'}
                  </h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'القيمة الحالية:' : 'Current Value:'}
                      </span>
                      <span>{form.watch('measured_value')} {goal.baseline_measurement.measurement_unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'القيمة المستهدفة:' : 'Target Value:'}
                      </span>
                      <span>{goal.target_criteria.target_value} {goal.target_criteria.target_unit}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'نسبة التقدم:' : 'Progress Percentage:'}
                      </span>
                      <span className="text-blue-700">
                        {Math.min(100, Math.round((form.watch('measured_value') / goal.target_criteria.target_value) * 100))}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentOpen(false)}
                  disabled={isSubmitting}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting 
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                    : (language === 'ar' ? 'حفظ التقدم' : 'Save Progress')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
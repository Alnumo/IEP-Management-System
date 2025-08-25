import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Save, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'
import { CreateAssessmentResultData } from '@/types/assessment'

const assessmentSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  assessment_tool_id: z.string().min(1, 'Assessment tool is required'),
  assessment_date: z.date(),
  assessor_id: z.string().min(1, 'Assessor is required'),
  assessment_purpose: z.enum(['baseline', 'progress_monitoring', 'annual_review', 'discharge', 'diagnostic', 'program_planning', 'research']),
  overall_score: z.number().optional(),
  interpretation_summary_ar: z.string().optional(),
  interpretation_summary_en: z.string().optional(),
  raw_scores: z.string().optional(),
  standard_scores: z.string().optional(),
})

type AssessmentFormData = z.infer<typeof assessmentSchema>

interface AssessmentFormProps {
  onSubmit: (data: CreateAssessmentResultData) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<CreateAssessmentResultData>
}

export default function AssessmentForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData 
}: AssessmentFormProps) {
  const { language } = useLanguage()

  const form = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      student_id: initialData?.student_id || '',
      assessment_tool_id: initialData?.assessment_tool_id || '',
      assessment_date: initialData?.assessment_date ? new Date(initialData.assessment_date) : new Date(),
      assessor_id: initialData?.assessor_id || '',
      assessment_purpose: initialData?.assessment_purpose || 'baseline',
      overall_score: initialData?.overall_score || undefined,
      interpretation_summary_ar: initialData?.interpretation_summary_ar || '',
      interpretation_summary_en: initialData?.interpretation_summary_en || '',
      raw_scores: '',
      standard_scores: '',
    }
  })

  const handleSubmit = (data: AssessmentFormData) => {
    const formData: CreateAssessmentResultData = {
      student_id: data.student_id,
      assessment_tool_id: data.assessment_tool_id,
      assessment_date: data.assessment_date.toISOString().split('T')[0],
      assessor_id: data.assessor_id,
      assessment_purpose: data.assessment_purpose,
      overall_score: data.overall_score,
      interpretation_summary_ar: data.interpretation_summary_ar,
      interpretation_summary_en: data.interpretation_summary_en,
      raw_scores: data.raw_scores ? JSON.parse(data.raw_scores) : {},
      standard_scores: data.standard_scores ? JSON.parse(data.standard_scores) : {},
    }
    onSubmit(formData)
  }

  const getPurposeText = (purpose: string) => {
    const purposeMap = {
      'baseline': language === 'ar' ? 'تقييم أولي' : 'Baseline',
      'progress_monitoring': language === 'ar' ? 'متابعة التقدم' : 'Progress Monitoring', 
      'annual_review': language === 'ar' ? 'مراجعة سنوية' : 'Annual Review',
      'discharge': language === 'ar' ? 'تقييم الخروج' : 'Discharge',
      'diagnostic': language === 'ar' ? 'تشخيصي' : 'Diagnostic',
      'program_planning': language === 'ar' ? 'تخطيط البرنامج' : 'Program Planning',
      'research': language === 'ar' ? 'بحثي' : 'Research'
    }
    return purposeMap[purpose as keyof typeof purposeMap] || purpose
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
                          <SelectItem value="student-3">Omar Hassan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'المقيم' : 'Assessor'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر المقيم' : 'Select Assessor'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="assessor-1">Dr. Fatima Hassan</SelectItem>
                          <SelectItem value="assessor-2">Ms. Aisha Ahmed</SelectItem>
                          <SelectItem value="assessor-3">Dr. Mohammad Ali</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assessment_tool_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'أداة التقييم' : 'Assessment Tool'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر أداة التقييم' : 'Select Assessment Tool'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vb-mapp">VB-MAPP</SelectItem>
                          <SelectItem value="celf-5">CELF-5</SelectItem>
                          <SelectItem value="wppsi-iv">WPPSI-IV</SelectItem>
                          <SelectItem value="vineland-3">Vineland-3</SelectItem>
                          <SelectItem value="cars-2">CARS-2</SelectItem>
                          <SelectItem value="ados-2">ADOS-2</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessment_purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الغرض من التقييم' : 'Assessment Purpose'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="baseline">{getPurposeText('baseline')}</SelectItem>
                          <SelectItem value="progress_monitoring">{getPurposeText('progress_monitoring')}</SelectItem>
                          <SelectItem value="annual_review">{getPurposeText('annual_review')}</SelectItem>
                          <SelectItem value="discharge">{getPurposeText('discharge')}</SelectItem>
                          <SelectItem value="diagnostic">{getPurposeText('diagnostic')}</SelectItem>
                          <SelectItem value="program_planning">{getPurposeText('program_planning')}</SelectItem>
                          <SelectItem value="research">{getPurposeText('research')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assessment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ التقييم' : 'Assessment Date'}
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
                  name="overall_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'النتيجة الإجمالية' : 'Overall Score'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.1"
                          placeholder={language === 'ar' ? 'النتيجة الإجمالية (اختياري)' : 'Overall score (optional)'}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </CardContent>
          </Card>

          {/* Scores and Data */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'النتائج والبيانات' : 'Scores and Data'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <FormField
                control={form.control}
                name="raw_scores"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'النتائج الخام (JSON)' : 'Raw Scores (JSON)'}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={language === 'ar' ? 'أدخل النتائج الخام بصيغة JSON' : 'Enter raw scores in JSON format'}
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' 
                        ? 'مثال: {"domain1": 85, "domain2": 92}' 
                        : 'Example: {"domain1": 85, "domain2": 92}'
                      }
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="standard_scores"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'النتائج المعيارية (JSON)' : 'Standard Scores (JSON)'}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={language === 'ar' ? 'أدخل النتائج المعيارية بصيغة JSON' : 'Enter standard scores in JSON format'}
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' 
                        ? 'مثال: {"verbal_iq": 110, "performance_iq": 105}' 
                        : 'Example: {"verbal_iq": 110, "performance_iq": 105}'
                      }
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          {/* Interpretation and Summary */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'التفسير والملخص' : 'Interpretation and Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <FormField
                control={form.control}
                name="interpretation_summary_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'ملخص التفسير (عربي)' : 'Interpretation Summary (Arabic)'}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={language === 'ar' ? 'اكتب ملخص تفسير النتائج باللغة العربية' : 'Write interpretation summary in Arabic'}
                        rows={5}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interpretation_summary_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'ملخص التفسير (إنجليزي)' : 'Interpretation Summary (English)'}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={language === 'ar' ? 'اكتب ملخص تفسير النتائج باللغة الإنجليزية' : 'Write interpretation summary in English'}
                        rows={5}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                : (language === 'ar' ? 'حفظ التقييم' : 'Save Assessment')
              }
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}
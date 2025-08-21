import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CreateStudentData, Student } from '@/types/student'

// Student form validation schema
const studentSchema = z.object({
  // Basic Information (Bilingual)
  first_name_ar: z.string().min(2, 'الاسم الأول يجب أن يكون حرفين على الأقل'),
  last_name_ar: z.string().min(2, 'اسم العائلة يجب أن يكون حرفين على الأقل'),
  first_name_en: z.string().optional().or(z.literal('')),
  last_name_en: z.string().optional().or(z.literal('')),
  
  // Personal Details
  date_of_birth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
  gender: z.enum(['male', 'female'], {
    required_error: 'يجب اختيار الجنس',
  }),
  nationality_ar: z.string().optional().or(z.literal('')),
  nationality_en: z.string().optional().or(z.literal('')),
  national_id: z.string().optional().or(z.literal('')),
  
  // Contact Information
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('يرجى إدخال بريد إلكتروني صالح').optional().or(z.literal('')),
  address_ar: z.string().optional().or(z.literal('')),
  address_en: z.string().optional().or(z.literal('')),
  city_ar: z.string().optional().or(z.literal('')),
  city_en: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),
  
  // Medical Information
  diagnosis_ar: z.string().optional().or(z.literal('')),
  diagnosis_en: z.string().optional().or(z.literal('')),
  severity_level: z.enum(['mild', 'moderate', 'severe']).optional(),
  allergies_ar: z.string().optional().or(z.literal('')),
  allergies_en: z.string().optional().or(z.literal('')),
  medications_ar: z.string().optional().or(z.literal('')),
  medications_en: z.string().optional().or(z.literal('')),
  special_needs_ar: z.string().optional().or(z.literal('')),
  special_needs_en: z.string().optional().or(z.literal('')),
  
  // Educational Information
  school_name_ar: z.string().optional().or(z.literal('')),
  school_name_en: z.string().optional().or(z.literal('')),
  grade_level: z.string().optional().or(z.literal('')),
  educational_support_ar: z.string().optional().or(z.literal('')),
  educational_support_en: z.string().optional().or(z.literal('')),
  
  // Therapy Information
  referral_source_ar: z.string().optional().or(z.literal('')),
  referral_source_en: z.string().optional().or(z.literal('')),
  therapy_goals_ar: z.string().optional().or(z.literal('')),
  therapy_goals_en: z.string().optional().or(z.literal('')),
  
  // File Attachments
  profile_photo_url: z.string().optional().or(z.literal('')),
})

type StudentFormData = z.infer<typeof studentSchema>

interface StudentFormProps {
  initialData?: Student | null
  onSubmit: (data: CreateStudentData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const StudentForm = ({ initialData, onSubmit, onCancel, isLoading = false }: StudentFormProps) => {
  const { language, isRTL } = useLanguage()

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name_ar: initialData?.first_name_ar || '',
      last_name_ar: initialData?.last_name_ar || '',
      first_name_en: initialData?.first_name_en || '',
      last_name_en: initialData?.last_name_en || '',
      date_of_birth: initialData?.date_of_birth || '',
      gender: initialData?.gender || 'male',
      nationality_ar: initialData?.nationality_ar || 'سعودي',
      nationality_en: initialData?.nationality_en || 'Saudi',
      national_id: initialData?.national_id || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      address_ar: initialData?.address_ar || '',
      address_en: initialData?.address_en || '',
      city_ar: initialData?.city_ar || 'الرياض',
      city_en: initialData?.city_en || 'Riyadh',
      postal_code: initialData?.postal_code || '',
      diagnosis_ar: initialData?.diagnosis_ar || '',
      diagnosis_en: initialData?.diagnosis_en || '',
      severity_level: initialData?.severity_level,
      allergies_ar: initialData?.allergies_ar || '',
      allergies_en: initialData?.allergies_en || '',
      medications_ar: initialData?.medications_ar || '',
      medications_en: initialData?.medications_en || '',
      special_needs_ar: initialData?.special_needs_ar || '',
      special_needs_en: initialData?.special_needs_en || '',
      school_name_ar: initialData?.school_name_ar || '',
      school_name_en: initialData?.school_name_en || '',
      grade_level: initialData?.grade_level || '',
      educational_support_ar: initialData?.educational_support_ar || '',
      educational_support_en: initialData?.educational_support_en || '',
      referral_source_ar: initialData?.referral_source_ar || '',
      referral_source_en: initialData?.referral_source_en || '',
      therapy_goals_ar: initialData?.therapy_goals_ar || '',
      therapy_goals_en: initialData?.therapy_goals_en || '',
      profile_photo_url: initialData?.profile_photo_url || '',
    },
  })

  const handleSubmit = async (data: StudentFormData) => {
    console.log('🔍 StudentForm: Form submitted with data:', data)
    try {
      await onSubmit(data as CreateStudentData)
      console.log('✅ StudentForm: Form submission successful')
    } catch (error) {
      console.error('❌ StudentForm: Form submission error:', error)
      throw error
    }
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {initialData 
              ? (language === 'ar' ? 'تعديل بيانات الطالب' : 'Edit Student Information')
              : (language === 'ar' ? 'إضافة طالب جديد' : 'Add New Student')
            }
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
              console.error('❌ Form validation errors:', errors)
            })} className="space-y-4 sm:space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className={`grid w-full grid-cols-4 ${language === 'ar' ? 'font-arabic' : ''} text-xs sm:text-sm`}>
                  <TabsTrigger value="basic" className="px-1 sm:px-3">
                    {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Info'}
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="px-1 sm:px-3">
                    {language === 'ar' ? 'معلومات الاتصال' : 'Contact Info'}
                  </TabsTrigger>
                  <TabsTrigger value="medical" className="px-1 sm:px-3">
                    {language === 'ar' ? 'المعلومات الطبية' : 'Medical Info'}
                  </TabsTrigger>
                  <TabsTrigger value="education" className="px-1 sm:px-3">
                    {language === 'ar' ? 'التعليم والعلاج' : 'Education & Therapy'}
                  </TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="first_name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الاسم الأول (عربي) *' : 'First Name (Arabic) *'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'الاسم الأول بالعربي' : 'First name in Arabic'}
                              className={language === 'ar' ? 'font-arabic text-right' : ''}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="last_name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'اسم العائلة (عربي) *' : 'Last Name (Arabic) *'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'اسم العائلة بالعربي' : 'Last name in Arabic'}
                              className={language === 'ar' ? 'font-arabic text-right' : ''}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="first_name_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الاسم الأول (إنجليزي)' : 'First Name (English)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'الاسم الأول بالإنجليزي' : 'First name in English'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="last_name_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'اسم العائلة (إنجليزي)' : 'Last Name (English)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'اسم العائلة بالإنجليزي' : 'Last name in English'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'تاريخ الميلاد *' : 'Date of Birth *'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الجنس *' : 'Gender *'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر الجنس' : 'Select gender'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">
                                {language === 'ar' ? 'ذكر' : 'Male'}
                              </SelectItem>
                              <SelectItem value="female">
                                {language === 'ar' ? 'أنثى' : 'Female'}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="national_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'رقم الهوية/الإقامة' : 'National ID/Iqama'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'رقم الهوية أو الإقامة' : 'National ID or Iqama number'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nationality_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الجنسية (عربي)' : 'Nationality (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'الجنسية بالعربي' : 'Nationality in Arabic'}
                              className={language === 'ar' ? 'font-arabic text-right' : ''}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Contact Information Tab */}
                <TabsContent value="contact" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? '+966501234567' : '+966501234567'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder={language === 'ar' ? 'student@example.com' : 'student@example.com'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address_ar"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'العنوان (عربي)' : 'Address (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'العنوان بالتفصيل' : 'Detailed address'}
                              className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'المدينة (عربي)' : 'City (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'الرياض' : 'Riyadh'}
                              className={language === 'ar' ? 'font-arabic text-right' : ''}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الرمز البريدي' : 'Postal Code'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? '12345' : '12345'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Medical Information Tab */}
                <TabsContent value="medical" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="diagnosis_ar"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'التشخيص (عربي)' : 'Diagnosis (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'التشخيص الطبي للحالة' : 'Medical diagnosis'}
                              className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="severity_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'درجة الشدة' : 'Severity Level'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر درجة الشدة' : 'Select severity'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mild">
                                {language === 'ar' ? 'خفيفة' : 'Mild'}
                              </SelectItem>
                              <SelectItem value="moderate">
                                {language === 'ar' ? 'متوسطة' : 'Moderate'}
                              </SelectItem>
                              <SelectItem value="severe">
                                {language === 'ar' ? 'شديدة' : 'Severe'}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allergies_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الحساسيات (عربي)' : 'Allergies (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'أي حساسيات معروفة' : 'Known allergies'}
                              className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medications_ar"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الأدوية (عربي)' : 'Medications (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'الأدوية الحالية' : 'Current medications'}
                              className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="special_needs_ar"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الاحتياجات الخاصة (عربي)' : 'Special Needs (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'الاحتياجات الخاصة للطالب' : 'Student special needs'}
                              className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Education & Therapy Tab */}
                <TabsContent value="education" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="school_name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'اسم المدرسة (عربي)' : 'School Name (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'اسم المدرسة' : 'School name'}
                              className={language === 'ar' ? 'font-arabic text-right' : ''}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grade_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الصف الدراسي' : 'Grade Level'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'الصف الأول' : 'Grade 1'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="referral_source_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'مصدر الإحالة (عربي)' : 'Referral Source (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'طبيب الأطفال' : 'Pediatrician'}
                              className={language === 'ar' ? 'font-arabic text-right' : ''}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="educational_support_ar"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الدعم التعليمي (عربي)' : 'Educational Support (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'الدعم التعليمي المطلوب' : 'Required educational support'}
                              className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="therapy_goals_ar"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'أهداف العلاج (عربي)' : 'Therapy Goals (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'الأهداف المطلوبة من العلاج' : 'Desired therapy goals'}
                              className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className={`flex gap-4 pt-6 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  className="min-w-[120px]"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !form.formState.isValid}
                  className="min-w-[120px]"
                >
                  {isLoading 
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : initialData 
                      ? (language === 'ar' ? 'تحديث الطالب' : 'Update Student')
                      : (language === 'ar' ? 'إضافة الطالب' : 'Add Student')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
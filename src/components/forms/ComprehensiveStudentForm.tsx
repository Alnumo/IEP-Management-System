import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CreateStudentData, Student } from '@/types/student'
import { usePlans } from '@/hooks/usePlans'
import { Plus, Trash2, Upload } from 'lucide-react'

// Comprehensive student form validation schema with new structure
const comprehensiveStudentSchema = z.object({
  // Phase 1: Student Information
  // Admission Information
  child_id: z.string().optional(),
  admission_date: z.string().optional(),
  admission_fee: z.number().optional(),
  
  // Student Information
  first_name_ar: z.string().min(2, 'الاسم الأول يجب أن يكون حرفين على الأقل'),
  last_name_ar: z.string().min(2, 'اسم العائلة يجب أن يكون حرفين على الأقل'),
  first_name_en: z.string().optional(),
  last_name_en: z.string().optional(),
  date_of_birth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
  place_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female'], { required_error: 'يجب اختيار الجنس' }),
  nationality_ar: z.string().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  blood_type: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  
  // Parents & Family Information
  // Father Information
  father_full_name: z.string().optional(),
  father_national_id: z.string().optional(),
  father_mobile: z.string().optional(),
  father_education: z.string().optional(),
  father_job: z.string().optional(),
  father_workplace: z.string().optional(),
  father_alive: z.boolean().optional(),
  
  // Mother Information
  mother_full_name: z.string().optional(),
  mother_national_id: z.string().optional(),
  mother_mobile: z.string().optional(),
  mother_education: z.string().optional(),
  mother_job: z.string().optional(),
  mother_workplace: z.string().optional(),
  mother_alive: z.boolean().optional(),
  
  // Siblings Information
  siblings_count: z.number().optional(),
  child_order: z.number().optional(),
  parents_marital_status: z.enum(['married', 'separated']).optional(),
  
  // Housing Information (moved from Phase 2)
  housing_type: z.enum(['palace', 'villa', 'floor', 'apartment']).optional(),
  housing_ownership: z.enum(['owned', 'rented']).optional(),
  housing_condition: z.enum(['new', 'good', 'old']).optional(),
  family_income: z.enum(['under_3000', '3000_to_5000', 'over_5000']).optional(),
  
  // Phase 2: Medical History
  // Developmental History (moved from Phase 3)
  pregnancy_condition: z.enum(['normal', 'abnormal']).optional(),
  birth_type: z.enum(['natural', 'cesarean']).optional(),
  weight_height_appropriate: z.enum(['appropriate', 'underweight', 'overweight']).optional(),
  developmental_progress: z.enum(['normal', 'delayed']).optional(),
  birth_problems: z.string().optional(),
  
  // Child Health Status (moved from Phase 3)
  takes_medication: z.boolean().optional(),
  health_conditions: z.array(z.string()).optional(),
  
  // Family Health Status (moved from Phase 3)
  father_health_status: z.enum(['healthy', 'sick']).optional(),
  father_illness: z.string().optional(),
  mother_health_status: z.enum(['healthy', 'sick']).optional(),
  mother_illness: z.string().optional(),
  siblings_health_status: z.enum(['healthy', 'sick']).optional(),
  siblings_illness: z.string().optional(),
  hereditary_developmental_disorders: z.boolean().optional(),
  hereditary_developmental_info: z.string().optional(),
  autism_family_history: z.boolean().optional(),
  autism_family_info: z.string().optional(),
  adhd_family_history: z.boolean().optional(),
  adhd_family_info: z.string().optional(),
  
  // Phase 3: Diagnosis
  // Diagnosis Information
  diagnosis_source: z.string().optional(),
  diagnosis_age: z.number().optional(),
  diagnosis_file_url: z.string().optional(),
  
  // Assessment Interview (moved from Phase 4)
  interview_date: z.string().optional(),
  interview_time: z.string().optional(),
  interview_notes: z.string().optional(),
  
  // Special Needs Types & Difficulties
  special_needs_types: z.array(z.string()).optional(),
  learning_difficulties: z.array(z.string()).optional(),
  behavioral_difficulties: z.array(z.string()).optional(),
  communication_difficulties: z.array(z.string()).optional(),
  motor_difficulties: z.array(z.string()).optional(),
  sensory_difficulties: z.array(z.string()).optional(),
  
  // Phase 4: Education & Therapy (moved from Phase 1)
  school_name_ar: z.string().optional(),
  grade_level: z.string().optional(),
  referral_source_ar: z.string().optional(),
  therapy_goals_ar: z.string().optional(),
  therapy_program_id: z.string().optional(),
  educational_support_ar: z.string().optional(),
  
  // Guardian Detailed Information (remaining in Phase 4)
  guardian_title: z.string().optional(),
  guardian_relation: z.enum(['father', 'mother', 'other']).optional(),
  guardian_full_name: z.string().optional(),
  guardian_national_id: z.string().optional(),
  guardian_mobile: z.string().optional(),
  guardian_email: z.string().email('يرجى إدخال بريد إلكتروني صالح').optional().or(z.literal('')),
  guardian_workplace: z.string().optional(),
  has_insurance: z.boolean().optional(),
  insurance_company: z.string().optional(),
  
  // Address Information
  address_district: z.string().optional(),
  address_building_number: z.string().optional(),
  address_street: z.string().optional(),
  address_contact_number: z.string().optional(),
  
  // Registration Status
  registration_completed: z.boolean().optional(),
  registration_not_completed_reason: z.string().optional(),
  fees_paid: z.boolean().optional(),
  fees_not_paid_reason: z.string().optional(),
})

type ComprehensiveStudentFormData = z.infer<typeof comprehensiveStudentSchema>

interface ComprehensiveStudentFormProps {
  initialData?: Student | null
  onSubmit: (data: CreateStudentData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const ComprehensiveStudentForm = ({ initialData, onSubmit, onCancel, isLoading = false }: ComprehensiveStudentFormProps) => {
  const { language, isRTL } = useLanguage()
  const { data: plans = [] } = usePlans({ is_active: true })
  const [medications, setMedications] = useState<Array<{name: string, type: string, dosage: string}>>([])
  const [specialNeedsTypes, setSpecialNeedsTypes] = useState<string[]>([])
  const [learningDifficulties, setLearningDifficulties] = useState<string[]>([])

  const form = useForm<ComprehensiveStudentFormData>({
    resolver: zodResolver(comprehensiveStudentSchema),
    defaultValues: {
      // Admission Information
      child_id: initialData?.child_id || '',
      admission_date: initialData?.admission_date || '',
      admission_fee: initialData?.admission_fee || undefined,
      
      // Student Information
      first_name_ar: initialData?.first_name_ar || '',
      last_name_ar: initialData?.last_name_ar || '',
      first_name_en: initialData?.first_name_en || '',
      last_name_en: initialData?.last_name_en || '',
      date_of_birth: initialData?.date_of_birth || '',
      place_of_birth: initialData?.place_of_birth || '',
      gender: initialData?.gender || 'male',
      nationality_ar: initialData?.nationality_ar || 'سعودي',
      height: initialData?.height || undefined,
      weight: initialData?.weight || undefined,
      blood_type: initialData?.blood_type || undefined,
      
      // Father Information
      father_full_name: initialData?.father_full_name || '',
      father_national_id: initialData?.father_national_id || '',
      father_mobile: initialData?.father_mobile || '',
      father_education: initialData?.father_education || '',
      father_job: initialData?.father_job || '',
      father_workplace: initialData?.father_workplace || '',
      father_alive: initialData?.father_alive ?? true,
      
      // Mother Information
      mother_full_name: initialData?.mother_full_name || '',
      mother_national_id: initialData?.mother_national_id || '',
      mother_mobile: initialData?.mother_mobile || '',
      mother_education: initialData?.mother_education || '',
      mother_job: initialData?.mother_job || '',
      mother_workplace: initialData?.mother_workplace || '',
      mother_alive: initialData?.mother_alive ?? true,
      
      // Siblings and Family
      siblings_count: initialData?.siblings_count || undefined,
      child_order: initialData?.child_order || undefined,
      parents_marital_status: initialData?.parents_marital_status || 'married',
      
      // Housing Information
      housing_type: initialData?.housing_type,
      housing_ownership: initialData?.housing_ownership,
      housing_condition: initialData?.housing_condition,
      family_income: initialData?.family_income,
      
      // Medical History
      pregnancy_condition: initialData?.pregnancy_condition,
      birth_type: initialData?.birth_type,
      weight_height_appropriate: initialData?.weight_height_appropriate,
      developmental_progress: initialData?.developmental_progress,
      birth_problems: initialData?.birth_problems || '',
      takes_medication: initialData?.takes_medication ?? false,
      health_conditions: initialData?.health_conditions || [],
      
      // Family Health
      father_health_status: initialData?.father_health_status || 'healthy',
      father_illness: initialData?.father_illness || '',
      mother_health_status: initialData?.mother_health_status || 'healthy',
      mother_illness: initialData?.mother_illness || '',
      siblings_health_status: initialData?.siblings_health_status || 'healthy',
      siblings_illness: initialData?.siblings_illness || '',
      hereditary_developmental_disorders: initialData?.hereditary_developmental_disorders ?? false,
      hereditary_developmental_info: initialData?.hereditary_developmental_info || '',
      autism_family_history: initialData?.autism_family_history ?? false,
      autism_family_info: initialData?.autism_family_info || '',
      adhd_family_history: initialData?.adhd_family_history ?? false,
      adhd_family_info: initialData?.adhd_family_info || '',
      
      // Diagnosis
      diagnosis_source: initialData?.diagnosis_source || '',
      diagnosis_age: initialData?.diagnosis_age || undefined,
      diagnosis_file_url: initialData?.diagnosis_file_url || '',
      
      // Assessment Interview
      interview_date: initialData?.interview_date || '',
      interview_time: initialData?.interview_time || '',
      interview_notes: initialData?.interview_notes || '',
      
      // Special Needs
      special_needs_types: initialData?.special_needs_types || [],
      learning_difficulties: initialData?.learning_difficulties || [],
      behavioral_difficulties: initialData?.behavioral_difficulties || [],
      communication_difficulties: initialData?.communication_difficulties || [],
      motor_difficulties: initialData?.motor_difficulties || [],
      sensory_difficulties: initialData?.sensory_difficulties || [],
      
      // Education & Therapy
      school_name_ar: initialData?.school_name_ar || '',
      grade_level: initialData?.grade_level || '',
      referral_source_ar: initialData?.referral_source_ar || '',
      therapy_goals_ar: initialData?.therapy_goals_ar || '',
      educational_support_ar: initialData?.educational_support_ar || '',
      
      // Guardian Information
      guardian_title: initialData?.guardian_title || '',
      guardian_relation: initialData?.guardian_relation,
      guardian_full_name: initialData?.guardian_full_name || '',
      guardian_national_id: initialData?.guardian_national_id || '',
      guardian_mobile: initialData?.guardian_mobile || '',
      guardian_email: initialData?.guardian_email || '',
      guardian_workplace: initialData?.guardian_workplace || '',
      has_insurance: initialData?.has_insurance ?? false,
      insurance_company: initialData?.insurance_company || '',
      
      // Address
      address_district: initialData?.address_district || '',
      address_building_number: initialData?.address_building_number || '',
      address_street: initialData?.address_street || '',
      address_contact_number: initialData?.address_contact_number || '',
      
      // Registration
      registration_completed: initialData?.registration_completed ?? false,
      registration_not_completed_reason: initialData?.registration_not_completed_reason || '',
      fees_paid: initialData?.fees_paid ?? false,
      fees_not_paid_reason: initialData?.fees_not_paid_reason || '',
    }
  })

  const handleSubmit = async (data: ComprehensiveStudentFormData) => {
    try {
      const submitData: CreateStudentData = {
        ...data,
        medications_list: medications,
        special_needs_types: specialNeedsTypes,
        learning_difficulties: learningDifficulties,
      }
      await onSubmit(submitData)
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  const handleFileUpload = () => {
    // Create a file input element
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
    
    fileInput.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const file = files[0]
        // Here you would typically upload to your storage service
        console.log('File selected:', file.name)
        // For now, just show the filename
        form.setValue('diagnosis_file_url', file.name)
      }
    }
    
    fileInput.click()
  }

  const addMedication = () => {
    setMedications([...medications, { name: '', type: '', dosage: '' }])
  }

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index))
  }

  const updateMedication = (index: number, field: keyof typeof medications[0], value: string) => {
    const updated = [...medications]
    updated[index] = { ...updated[index], [field]: value }
    setMedications(updated)
  }

  return (
    <div className={`w-full max-w-4xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <Tabs defaultValue="phase1" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="phase1" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المرحلة 1: معلومات الطالب' : 'Phase 1: Student Information'}
              </TabsTrigger>
              <TabsTrigger value="phase2" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المرحلة 2: التاريخ الطبي' : 'Phase 2: Medical History'}
              </TabsTrigger>
              <TabsTrigger value="phase3" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المرحلة 3: التشخيص' : 'Phase 3: Diagnosis'}
              </TabsTrigger>
              <TabsTrigger value="phase4" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المرحلة 4: التعليم والعلاج' : 'Phase 4: Education & Therapy'}
              </TabsTrigger>
              <TabsTrigger value="phase5" className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المرحلة 5: معلومات العنوان' : 'Phase 5: Address Information'}
              </TabsTrigger>
            </TabsList>

            {/* Phase 1: Student Information */}
            <TabsContent value="phase1" className="space-y-6">
              {/* Admission Information */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'معلومات القبول' : 'Admission Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="child_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'رقم الطفل' : 'Child ID'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'رقم الطفل' : 'Child ID'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="admission_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'تاريخ القبول' : 'Admission Date'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="admission_fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'رسوم القبول' : 'Admission Fee'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder={language === 'ar' ? 'رسوم القبول' : 'Admission Fee'}
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

              {/* Student Information */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    👤 {language === 'ar' ? 'معلومات الطالب' : 'Student Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الاسم الأول (عربي) *' : 'First Name (Arabic) *'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'الاسم الأول' : 'First Name'} />
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
                            <Input {...field} placeholder={language === 'ar' ? 'اسم العائلة' : 'Last Name'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الاسم الأول (إنجليزي)' : 'First Name (English)'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'الاسم الأول' : 'First Name'} />
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
                            <Input {...field} placeholder={language === 'ar' ? 'اسم العائلة' : 'Last Name'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'تاريخ الميلاد *' : 'Date of Birth *'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="place_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'مكان الميلاد' : 'Place of Birth'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر البلد' : 'Select Country'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                              {/* Gulf Countries */}
                              <SelectItem value="saudi_arabia">{language === 'ar' ? 'المملكة العربية السعودية' : 'Saudi Arabia'}</SelectItem>
                              <SelectItem value="uae">{language === 'ar' ? 'الإمارات العربية المتحدة' : 'United Arab Emirates'}</SelectItem>
                              <SelectItem value="kuwait">{language === 'ar' ? 'الكويت' : 'Kuwait'}</SelectItem>
                              <SelectItem value="qatar">{language === 'ar' ? 'قطر' : 'Qatar'}</SelectItem>
                              <SelectItem value="bahrain">{language === 'ar' ? 'البحرين' : 'Bahrain'}</SelectItem>
                              <SelectItem value="oman">{language === 'ar' ? 'سلطنة عمان' : 'Oman'}</SelectItem>
                              
                              {/* Middle East */}
                              <SelectItem value="jordan">{language === 'ar' ? 'الأردن' : 'Jordan'}</SelectItem>
                              <SelectItem value="lebanon">{language === 'ar' ? 'لبنان' : 'Lebanon'}</SelectItem>
                              <SelectItem value="syria">{language === 'ar' ? 'سوريا' : 'Syria'}</SelectItem>
                              <SelectItem value="iraq">{language === 'ar' ? 'العراق' : 'Iraq'}</SelectItem>
                              <SelectItem value="palestine">{language === 'ar' ? 'فلسطين' : 'Palestine'}</SelectItem>
                              <SelectItem value="yemen">{language === 'ar' ? 'اليمن' : 'Yemen'}</SelectItem>
                              
                              {/* North Africa */}
                              <SelectItem value="egypt">{language === 'ar' ? 'مصر' : 'Egypt'}</SelectItem>
                              <SelectItem value="libya">{language === 'ar' ? 'ليبيا' : 'Libya'}</SelectItem>
                              <SelectItem value="tunisia">{language === 'ar' ? 'تونس' : 'Tunisia'}</SelectItem>
                              <SelectItem value="algeria">{language === 'ar' ? 'الجزائر' : 'Algeria'}</SelectItem>
                              <SelectItem value="morocco">{language === 'ar' ? 'المغرب' : 'Morocco'}</SelectItem>
                              <SelectItem value="sudan">{language === 'ar' ? 'السودان' : 'Sudan'}</SelectItem>
                              
                              {/* Other Countries */}
                              <SelectItem value="turkey">{language === 'ar' ? 'تركيا' : 'Turkey'}</SelectItem>
                              <SelectItem value="iran">{language === 'ar' ? 'إيران' : 'Iran'}</SelectItem>
                              <SelectItem value="afghanistan">{language === 'ar' ? 'أفغانستان' : 'Afghanistan'}</SelectItem>
                              <SelectItem value="pakistan">{language === 'ar' ? 'باكستان' : 'Pakistan'}</SelectItem>
                              <SelectItem value="india">{language === 'ar' ? 'الهند' : 'India'}</SelectItem>
                              <SelectItem value="bangladesh">{language === 'ar' ? 'بنغلاديش' : 'Bangladesh'}</SelectItem>
                              <SelectItem value="sri_lanka">{language === 'ar' ? 'سريلانكا' : 'Sri Lanka'}</SelectItem>
                              <SelectItem value="philippines">{language === 'ar' ? 'الفلبين' : 'Philippines'}</SelectItem>
                              <SelectItem value="indonesia">{language === 'ar' ? 'إندونيسيا' : 'Indonesia'}</SelectItem>
                              <SelectItem value="malaysia">{language === 'ar' ? 'ماليزيا' : 'Malaysia'}</SelectItem>
                              <SelectItem value="thailand">{language === 'ar' ? 'تايلاند' : 'Thailand'}</SelectItem>
                              <SelectItem value="ethiopia">{language === 'ar' ? 'إثيوبيا' : 'Ethiopia'}</SelectItem>
                              <SelectItem value="somalia">{language === 'ar' ? 'الصومال' : 'Somalia'}</SelectItem>
                              <SelectItem value="eritrea">{language === 'ar' ? 'إريتريا' : 'Eritrea'}</SelectItem>
                              <SelectItem value="chad">{language === 'ar' ? 'تشاد' : 'Chad'}</SelectItem>
                              
                              {/* Western Countries */}
                              <SelectItem value="usa">{language === 'ar' ? 'الولايات المتحدة الأمريكية' : 'United States'}</SelectItem>
                              <SelectItem value="canada">{language === 'ar' ? 'كندا' : 'Canada'}</SelectItem>
                              <SelectItem value="uk">{language === 'ar' ? 'المملكة المتحدة' : 'United Kingdom'}</SelectItem>
                              <SelectItem value="france">{language === 'ar' ? 'فرنسا' : 'France'}</SelectItem>
                              <SelectItem value="germany">{language === 'ar' ? 'ألمانيا' : 'Germany'}</SelectItem>
                              <SelectItem value="italy">{language === 'ar' ? 'إيطاليا' : 'Italy'}</SelectItem>
                              <SelectItem value="spain">{language === 'ar' ? 'إسبانيا' : 'Spain'}</SelectItem>
                              <SelectItem value="netherlands">{language === 'ar' ? 'هولندا' : 'Netherlands'}</SelectItem>
                              <SelectItem value="sweden">{language === 'ar' ? 'السويد' : 'Sweden'}</SelectItem>
                              <SelectItem value="norway">{language === 'ar' ? 'النرويج' : 'Norway'}</SelectItem>
                              <SelectItem value="australia">{language === 'ar' ? 'أستراليا' : 'Australia'}</SelectItem>
                              <SelectItem value="new_zealand">{language === 'ar' ? 'نيوزيلندا' : 'New Zealand'}</SelectItem>
                              
                              {/* Other option */}
                              <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="male" id="male" />
                                <Label htmlFor="male" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'ذكر' : 'Male'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="female" id="female" />
                                <Label htmlFor="female" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'أنثى' : 'Female'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الطول (سم)' : 'Height (cm)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder={language === 'ar' ? 'الطول' : 'Height'}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الوزن (كغ)' : 'Weight (kg)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder={language === 'ar' ? 'الوزن' : 'Weight'}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="blood_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'فصيلة الدم' : 'Blood Type'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر فصيلة الدم' : 'Select Blood Type'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Parents & Family Information */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    👨‍👩‍👧‍👦 {language === 'ar' ? 'معلومات الوالدين والأسرة' : 'Parents & Family Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 overflow-visible">
                  {/* Father Information */}
                  <div>
                    <h4 className={`text-lg font-semibold mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'معلومات الأب' : 'Father Information'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="father_full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'الاسم الكامل للأب' : 'Father Full Name'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full Name'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="father_national_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'رقم الهوية الوطنية' : 'National ID Number'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'رقم الهوية' : 'National ID'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="father_mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'رقم الجوال' : 'Mobile Number'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'رقم الجوال' : 'Mobile Number'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="father_education"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'المستوى التعليمي للأب' : "Father's Education Level"}
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={language === 'ar' ? 'اختر المستوى التعليمي' : 'Select Education Level'} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                                <SelectItem value="literate">{language === 'ar' ? 'يقرأ و يكتب' : 'Literate'}</SelectItem>
                                <SelectItem value="elementary">{language === 'ar' ? 'الابتدائية' : 'Elementary'}</SelectItem>
                                <SelectItem value="middle">{language === 'ar' ? 'المتوسطة' : 'Middle School'}</SelectItem>
                                <SelectItem value="high_school">{language === 'ar' ? 'الثانوية' : 'High School'}</SelectItem>
                                <SelectItem value="bachelor">{language === 'ar' ? 'بكالوريوس' : 'Bachelor\'s Degree'}</SelectItem>
                                <SelectItem value="master">{language === 'ar' ? 'ماجستير' : 'Master\'s Degree'}</SelectItem>
                                <SelectItem value="doctorate">{language === 'ar' ? 'دكتوراة' : 'Doctorate'}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="father_job"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'مهنة الأب' : 'Father Job'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'المهنة' : 'Job'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="father_workplace"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'مكان العمل' : 'Workplace'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'مكان العمل' : 'Workplace'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="father_alive"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'هل الأب على قيد الحياة؟' : 'Is father alive?'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === 'true')}
                              defaultValue={field.value ? 'true' : 'false'}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="father_alive_yes" />
                                <Label htmlFor="father_alive_yes" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'نعم' : 'Yes'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="father_alive_no" />
                                <Label htmlFor="father_alive_no" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'لا' : 'No'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Mother Information */}
                  <div>
                    <h4 className={`text-lg font-semibold mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'معلومات الأم' : 'Mother Information'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="mother_full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'الاسم الكامل للأم' : 'Mother Full Name'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full Name'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="mother_national_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'رقم الهوية الوطنية' : 'National ID Number'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'رقم الهوية' : 'National ID'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="mother_mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'رقم الجوال' : 'Mobile Number'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'رقم الجوال' : 'Mobile Number'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="mother_education"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'المستوى التعليمي للأم' : "Mother's Education Level"}
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={language === 'ar' ? 'اختر المستوى التعليمي' : 'Select Education Level'} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                                <SelectItem value="literate">{language === 'ar' ? 'يقرأ و يكتب' : 'Literate'}</SelectItem>
                                <SelectItem value="elementary">{language === 'ar' ? 'الابتدائية' : 'Elementary'}</SelectItem>
                                <SelectItem value="middle">{language === 'ar' ? 'المتوسطة' : 'Middle School'}</SelectItem>
                                <SelectItem value="high_school">{language === 'ar' ? 'الثانوية' : 'High School'}</SelectItem>
                                <SelectItem value="bachelor">{language === 'ar' ? 'بكالوريوس' : 'Bachelor\'s Degree'}</SelectItem>
                                <SelectItem value="master">{language === 'ar' ? 'ماجستير' : 'Master\'s Degree'}</SelectItem>
                                <SelectItem value="doctorate">{language === 'ar' ? 'دكتوراة' : 'Doctorate'}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="mother_job"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'مهنة الأم' : 'Mother Job'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'المهنة' : 'Job'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="mother_workplace"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'مكان العمل' : 'Workplace'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'مكان العمل' : 'Workplace'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="mother_alive"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'هل الأم على قيد الحياة؟' : 'Is mother alive?'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === 'true')}
                              defaultValue={field.value ? 'true' : 'false'}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="mother_alive_yes" />
                                <Label htmlFor="mother_alive_yes" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'نعم' : 'Yes'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="mother_alive_no" />
                                <Label htmlFor="mother_alive_no" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'لا' : 'No'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Siblings Information */}
                  <div>
                    <h4 className={`text-lg font-semibold mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'معلومات الإخوة والأخوات' : 'Siblings Information'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="siblings_count"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'عدد الإخوة والأخوات' : 'Number of Siblings'}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                placeholder={language === 'ar' ? 'عدد الإخوة' : 'Number of Siblings'}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="child_order"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'ترتيب الطفل' : 'Child Order'}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                placeholder={language === 'ar' ? 'ترتيب الطفل' : 'Child Order'}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="parents_marital_status"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الحالة الاجتماعية للوالدين' : 'Parents Marital Status'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="married" id="married" />
                                <Label htmlFor="married" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'متزوجان' : 'Married'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="separated" id="separated" />
                                <Label htmlFor="separated" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'منفصلان' : 'Separated'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Housing Information */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    🏠 {language === 'ar' ? 'معلومات السكن' : 'Housing Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="housing_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'نوع السكن' : 'Housing Type'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-2 gap-2"
                              dir={isRTL ? 'rtl' : 'ltr'}
                            >
                              <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', textAlign: isRTL ? 'right' : 'left' }}>
                                <RadioGroupItem value="palace" id="palace" />
                                <Label htmlFor="palace" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'قصر' : 'Palace'}
                                </Label>
                              </div>
                              <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', textAlign: isRTL ? 'right' : 'left' }}>
                                <RadioGroupItem value="villa" id="villa" />
                                <Label htmlFor="villa" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'فيلا' : 'Villa'}
                                </Label>
                              </div>
                              <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', textAlign: isRTL ? 'right' : 'left' }}>
                                <RadioGroupItem value="floor" id="floor" />
                                <Label htmlFor="floor" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'دور' : 'Floor'}
                                </Label>
                              </div>
                              <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', textAlign: isRTL ? 'right' : 'left' }}>
                                <RadioGroupItem value="apartment" id="apartment" />
                                <Label htmlFor="apartment" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'شقة' : 'Apartment'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="housing_ownership"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'ملكية السكن' : 'Housing Ownership'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className={`flex ${isRTL ? 'flex-row-reverse space-x-6 space-x-reverse' : 'flex-row space-x-6'}`}
                              dir={isRTL ? 'rtl' : 'ltr'}
                              style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                            >
                              <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', textAlign: isRTL ? 'right' : 'left' }}>
                                <RadioGroupItem value="owned" id="owned" />
                                <Label htmlFor="owned" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'ملك' : 'Owned'}
                                </Label>
                              </div>
                              <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', textAlign: isRTL ? 'right' : 'left' }}>
                                <RadioGroupItem value="rented" id="rented" />
                                <Label htmlFor="rented" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'إيجار' : 'Rented'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="housing_condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'حالة السكن' : 'Housing Condition'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className={`flex ${isRTL ? 'flex-row-reverse space-x-6 space-x-reverse' : 'flex-row space-x-6'}`}
                              dir={isRTL ? 'rtl' : 'ltr'}
                              style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                            >
                              <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', textAlign: isRTL ? 'right' : 'left' }}>
                                <RadioGroupItem value="new" id="new" />
                                <Label htmlFor="new" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'جديد' : 'New'}
                                </Label>
                              </div>
                              <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', textAlign: isRTL ? 'right' : 'left' }}>
                                <RadioGroupItem value="good" id="good" />
                                <Label htmlFor="good" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'جيد' : 'Good'}
                                </Label>
                              </div>
                              <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', textAlign: isRTL ? 'right' : 'left' }}>
                                <RadioGroupItem value="old" id="old" />
                                <Label htmlFor="old" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'قديم' : 'Old'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="family_income"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'دخل الأسرة الشهري' : 'Monthly Family Income'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="under_3000" id="under_3000" />
                                <Label htmlFor="under_3000" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'أقل من 3,000 ريال' : 'Under 3,000 SAR'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="3000_to_5000" id="3000_to_5000" />
                                <Label htmlFor="3000_to_5000" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'من 3,000 إلى 5,000 ريال' : '3,000 to 5,000 SAR'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="over_5000" id="over_5000" />
                                <Label htmlFor="over_5000" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'من 5,000 ريال فأكثر' : 'Over 5,000 SAR'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Phase 2: Medical History */}
            <TabsContent value="phase2" className="space-y-6">
              {/* Developmental History */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    👶 {language === 'ar' ? 'التاريخ النمائي' : 'Developmental History'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pregnancy_condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'حالة الحمل' : 'Pregnancy Condition'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="normal" id="pregnancy_normal" />
                                <Label htmlFor="pregnancy_normal" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'طبيعي' : 'Normal'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="abnormal" id="pregnancy_abnormal" />
                                <Label htmlFor="pregnancy_abnormal" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'غير طبيعي' : 'Abnormal'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="birth_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'نوع الولادة' : 'Birth Type'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="natural" id="natural" />
                                <Label htmlFor="natural" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'طبيعي' : 'Natural'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="cesarean" id="cesarean" />
                                <Label htmlFor="cesarean" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'قيصري' : 'Cesarean'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="weight_height_appropriate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'مناسبة الطول والوزن مع العمر' : 'Weight/Height Appropriate for Age'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="appropriate" id="appropriate" />
                                <Label htmlFor="appropriate" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'مناسب' : 'Appropriate'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="underweight" id="underweight" />
                                <Label htmlFor="underweight" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'نقص الوزن' : 'Underweight'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="overweight" id="overweight" />
                                <Label htmlFor="overweight" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'زيادة الوزن' : 'Overweight'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="developmental_progress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'التطور النمائي' : 'Developmental Progress'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="normal" id="dev_normal" />
                                <Label htmlFor="dev_normal" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'طبيعي' : 'Normal'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="delayed" id="delayed" />
                                <Label htmlFor="delayed" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'تأخر' : 'Delayed'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="birth_problems"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'مشاكل عند الولادة' : 'Birth Problems'}
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder={language === 'ar' ? 'اذكر أي مشاكل حدثت عند الولادة' : 'Describe any problems at birth'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Child Health Status */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    🩺 {language === 'ar' ? 'الحالة الصحية للطفل' : 'Child Health Status'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="takes_medication"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'هل يتناول أدوية؟' : 'Does the child take medication?'}
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === 'true')}
                            defaultValue={field.value ? 'true' : 'false'}
                            className="flex flex-row space-x-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="takes_medication_yes" />
                              <Label htmlFor="takes_medication_yes" className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'نعم' : 'Yes'}
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="takes_medication_no" />
                              <Label htmlFor="takes_medication_no" className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'لا' : 'No'}
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Medication Table */}
                  {form.watch('takes_medication') && (
                    <div className="space-y-4">
                      <Label className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'جدول الأدوية' : 'Medication Table'}
                      </Label>
                      <div className="space-y-2">
                        {medications.map((medication, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                            <Input
                              placeholder={language === 'ar' ? 'اسم الدواء' : 'Medication Name'}
                              value={medication.name}
                              onChange={(e) => updateMedication(index, 'name', e.target.value)}
                            />
                            <Input
                              placeholder={language === 'ar' ? 'نوع الدواء' : 'Medication Type'}
                              value={medication.type}
                              onChange={(e) => updateMedication(index, 'type', e.target.value)}
                            />
                            <Input
                              placeholder={language === 'ar' ? 'الجرعة' : 'Dosage'}
                              value={medication.dosage}
                              onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeMedication(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addMedication}
                          className="w-full flex items-center justify-center"
                        >
                          <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          {language === 'ar' ? 'إضافة دواء' : 'Add Medication'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Medical Conditions */}
                  <div className="space-y-4">
                    <Label className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'الأعراض المرضية التي يعاني منها الطفل' : 'Medical Conditions the Child Suffers From'}
                    </Label>
                    
                    <FormField
                      control={form.control}
                      name="health_conditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
                              {[
                                { value: 'heart_disease', label: language === 'ar' ? 'أمراض القلب' : 'Heart Disease' },
                                { value: 'blood_pressure', label: language === 'ar' ? 'ضغط الدم' : 'Blood Pressure' },
                                { value: 'kidney_disease', label: language === 'ar' ? 'أمراض الكلى' : 'Kidney Disease' },
                                { value: 'asthma', label: language === 'ar' ? 'ربو شعبي' : 'Bronchial Asthma' },
                                { value: 'diabetes', label: language === 'ar' ? 'سكر الدم' : 'Diabetes' },
                                { value: 'hearing_impairment', label: language === 'ar' ? 'ضعف السمع' : 'Hearing Impairment' },
                                { value: 'vision_impairment', label: language === 'ar' ? 'ضعف البصر' : 'Vision Impairment' },
                                { value: 'seizures_epilepsy', label: language === 'ar' ? 'تشنجات وصرع' : 'Seizures and Epilepsy' },
                                { value: 'cancer', label: language === 'ar' ? 'السرطان' : 'Cancer' },
                                { value: 'anemia', label: language === 'ar' ? 'فقر الدم' : 'Anemia' },
                                { value: 'rheumatism', label: language === 'ar' ? 'روماتيزم' : 'Rheumatism' },
                                { value: 'sleep_disorder', label: language === 'ar' ? 'النوم المرضي' : 'Sleep Disorder' },
                                { value: 'tonsillitis', label: language === 'ar' ? 'التهاب اللوزتين' : 'Tonsillitis' },
                                { value: 'seasonal_allergy', label: language === 'ar' ? 'حساسية موسمية' : 'Seasonal Allergy' },
                                { value: 'organ_disability', label: language === 'ar' ? 'إعاقة أحد الأعضاء' : 'Organ Disability' },
                                { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' }
                              ].map((condition) => (
                                <div key={condition.value} className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', textAlign: isRTL ? 'right' : 'left' }}>
                                  <Checkbox
                                    id={condition.value}
                                    checked={field.value?.includes(condition.value) || false}
                                    onCheckedChange={(checked) => {
                                      const currentValues = field.value || []
                                      if (checked) {
                                        field.onChange([...currentValues, condition.value])
                                      } else {
                                        field.onChange(currentValues.filter((value: string) => value !== condition.value))
                                      }
                                    }}
                                  />
                                  <Label htmlFor={condition.value} className={language === 'ar' ? 'font-arabic' : ''}>
                                    {condition.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                </CardContent>
              </Card>

              {/* Family Health Status */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    👨‍👩‍👧‍👦 {language === 'ar' ? 'الحالة الصحية للأسرة' : 'Family Health Status'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 overflow-visible">
                  {/* Father Health */}
                  <div className="space-y-4">
                    <h4 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'الحالة الصحية للأب' : 'Father Health Status'}
                    </h4>
                    <FormField
                      control={form.control}
                      name="father_health_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="healthy" id="father_healthy" />
                                <Label htmlFor="father_healthy" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'سليم' : 'Healthy'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sick" id="father_sick" />
                                <Label htmlFor="father_sick" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'مريض' : 'Sick'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch('father_health_status') === 'sick' && (
                      <FormField
                        control={form.control}
                        name="father_illness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'نوع المرض' : 'Type of Illness'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'اذكر نوع المرض' : 'Specify illness type'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <Separator />

                  {/* Mother Health */}
                  <div className="space-y-4">
                    <h4 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'الحالة الصحية للأم' : 'Mother Health Status'}
                    </h4>
                    <FormField
                      control={form.control}
                      name="mother_health_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="healthy" id="mother_healthy" />
                                <Label htmlFor="mother_healthy" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'سليم' : 'Healthy'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sick" id="mother_sick" />
                                <Label htmlFor="mother_sick" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'مريض' : 'Sick'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch('mother_health_status') === 'sick' && (
                      <FormField
                        control={form.control}
                        name="mother_illness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'نوع المرض' : 'Type of Illness'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'اذكر نوع المرض' : 'Specify illness type'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <Separator />

                  {/* Siblings Health */}
                  <div className="space-y-4">
                    <h4 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'الحالة الصحية للإخوة' : 'Siblings Health Status'}
                    </h4>
                    <FormField
                      control={form.control}
                      name="siblings_health_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="healthy" id="siblings_healthy" />
                                <Label htmlFor="siblings_healthy" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'سليم' : 'Healthy'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sick" id="siblings_sick" />
                                <Label htmlFor="siblings_sick" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'مريض' : 'Sick'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch('siblings_health_status') === 'sick' && (
                      <FormField
                        control={form.control}
                        name="siblings_illness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'نوع المرض' : 'Type of Illness'}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={language === 'ar' ? 'اذكر نوع المرض' : 'Specify illness type'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <Separator />

                  {/* Hereditary Conditions */}
                  <div className="space-y-4">
                    <h4 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'التاريخ المرضي الوراثي' : 'Hereditary Medical History'}
                    </h4>
                    
                    <FormField
                      control={form.control}
                      name="hereditary_developmental_disorders"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'وجود تاريخ اضطرابات نمائية' : 'History of Developmental Disorders'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === 'true')}
                              defaultValue={field.value ? 'true' : 'false'}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="hereditary_yes" />
                                <Label htmlFor="hereditary_yes" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'نعم' : 'Yes'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="hereditary_no" />
                                <Label htmlFor="hereditary_no" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'لا' : 'No'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch('hereditary_developmental_disorders') && (
                      <FormField
                        control={form.control}
                        name="hereditary_developmental_info"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'معلومات إضافية' : 'Additional Information'}
                            </FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder={language === 'ar' ? 'اذكر التفاصيل' : 'Provide details'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="autism_family_history"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'وجود تشخيص بالتوحد' : 'History of Autism Diagnosis'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === 'true')}
                              defaultValue={field.value ? 'true' : 'false'}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="autism_yes" />
                                <Label htmlFor="autism_yes" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'نعم' : 'Yes'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="autism_no" />
                                <Label htmlFor="autism_no" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'لا' : 'No'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch('autism_family_history') && (
                      <FormField
                        control={form.control}
                        name="autism_family_info"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'معلومات إضافية' : 'Additional Information'}
                            </FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder={language === 'ar' ? 'اذكر التفاصيل' : 'Provide details'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="adhd_family_history"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'وجود تشخيص بفرط الحركة' : 'History of ADHD Diagnosis'}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === 'true')}
                              defaultValue={field.value ? 'true' : 'false'}
                              className="flex flex-row space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="adhd_yes" />
                                <Label htmlFor="adhd_yes" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'نعم' : 'Yes'}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="adhd_no" />
                                <Label htmlFor="adhd_no" className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'لا' : 'No'}
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch('adhd_family_history') && (
                      <FormField
                        control={form.control}
                        name="adhd_family_info"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'معلومات إضافية' : 'Additional Information'}
                            </FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder={language === 'ar' ? 'اذكر التفاصيل' : 'Provide details'} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Phase 3: Diagnosis */}
            <TabsContent value="phase3" className="space-y-6">
              {/* Diagnosis Information */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    🔍 {language === 'ar' ? 'معلومات التشخيص' : 'Diagnosis Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="diagnosis_source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'جهة التشخيص' : 'Diagnosis Source'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'جهة التشخيص' : 'Diagnosis Source'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="diagnosis_age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'العمر عند التشخيص' : 'Age at Diagnosis'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder={language === 'ar' ? 'العمر بالسنوات' : 'Age in years'}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'ملف التشخيص' : 'Diagnosis File'}
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFileUpload}
                      className="w-full mt-2 flex items-center justify-center"
                    >
                      <Upload className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {language === 'ar' ? 'رفع ملف التشخيص' : 'Upload Diagnosis File'}
                    </Button>
                    {form.watch('diagnosis_file_url') && (
                      <p className="text-sm text-green-600 mt-1">
                        {language === 'ar' ? 'تم رفع: ' : 'Uploaded: '}{form.watch('diagnosis_file_url')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assessment Interview */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    📅 {language === 'ar' ? 'مقابلة التقييم' : 'Assessment Interview'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="interview_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'تاريخ المقابلة' : 'Interview Date'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="interview_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'وقت المقابلة' : 'Interview Time'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="interview_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'ملاحظات خاصة بالمقابلة' : 'Interview Notes'}
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder={language === 'ar' ? 'ملاحظات المقابلة' : 'Interview notes'}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Special Needs Types & Difficulties */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    🎯 {language === 'ar' ? 'أنواع الاحتياجات الخاصة والصعوبات' : 'Special Needs Types & Difficulties'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 overflow-visible">
                  {/* Special Needs Types */}
                  <div>
                    <Label className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'أنواع الاحتياجات الخاصة' : 'Special Needs Types'}
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {[
                        { value: 'autism', label: language === 'ar' ? 'التوحد' : 'Autism' },
                        { value: 'adhd', label: language === 'ar' ? 'فرط الحركة وتشتت الانتباه' : 'ADHD' },
                        { value: 'intellectual_disability', label: language === 'ar' ? 'الإعاقة الذهنية' : 'Intellectual Disability' },
                        { value: 'learning_disability', label: language === 'ar' ? 'صعوبات التعلم' : 'Learning Disability' },
                        { value: 'speech_delay', label: language === 'ar' ? 'تأخر الكلام' : 'Speech Delay' },
                        { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' },
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`special_needs_${option.value}`}
                            checked={specialNeedsTypes.includes(option.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSpecialNeedsTypes([...specialNeedsTypes, option.value])
                              } else {
                                setSpecialNeedsTypes(specialNeedsTypes.filter(item => item !== option.value))
                              }
                            }}
                          />
                          <Label htmlFor={`special_needs_${option.value}`} className={language === 'ar' ? 'font-arabic' : ''}>
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Learning Difficulties */}
                  <div>
                    <Label className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'صعوبات التعلم' : 'Learning Difficulties'}
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {[
                        { value: 'reading', label: language === 'ar' ? 'صعوبة في القراءة' : 'Reading Difficulty' },
                        { value: 'writing', label: language === 'ar' ? 'صعوبة في الكتابة' : 'Writing Difficulty' },
                        { value: 'math', label: language === 'ar' ? 'صعوبة في الرياضيات' : 'Math Difficulty' },
                        { value: 'memory', label: language === 'ar' ? 'صعوبة في الذاكرة' : 'Memory Difficulty' },
                        { value: 'concentration', label: language === 'ar' ? 'صعوبة في التركيز' : 'Concentration Difficulty' },
                        { value: 'following_instructions', label: language === 'ar' ? 'صعوبة في اتباع التعليمات' : 'Following Instructions' },
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`learning_${option.value}`}
                            checked={learningDifficulties.includes(option.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setLearningDifficulties([...learningDifficulties, option.value])
                              } else {
                                setLearningDifficulties(learningDifficulties.filter(item => item !== option.value))
                              }
                            }}
                          />
                          <Label htmlFor={`learning_${option.value}`} className={language === 'ar' ? 'font-arabic' : ''}>
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Phase 4: Education & Therapy */}
            <TabsContent value="phase4" className="space-y-6">
              {/* Guardian Detailed Information - MOVED TO FIRST */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    📇 {language === 'ar' ? 'بيانات ولي الأمر التفصيلية' : 'Detailed Guardian Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="guardian_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'ولي الأمر' : 'Guardian'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر ولي الأمر' : 'Select Guardian'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                              <SelectItem value="father">{language === 'ar' ? 'الأب' : 'Father'}</SelectItem>
                              <SelectItem value="mother">{language === 'ar' ? 'الأم' : 'Mother'}</SelectItem>
                              <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="guardian_relation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'صلة القرابة' : 'Guardian Relation'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder={language === 'ar' ? 'صلة القرابة' : 'Guardian Relation'} 
                              dir={isRTL ? 'rtl' : 'ltr'}
                              style={{ textAlign: isRTL ? 'right' : 'left' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="guardian_full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full Name'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="guardian_national_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'رقم الهوية الوطنية' : 'National ID Number'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'رقم الهوية' : 'National ID'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="guardian_mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'رقم الجوال' : 'Mobile Number'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'رقم الجوال' : 'Mobile Number'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="guardian_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email'} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="guardian_workplace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'جهة العمل' : 'Workplace'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'جهة العمل' : 'Workplace'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="has_insurance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'هل يوجد شركة تأمين؟' : 'Do you have insurance?'}
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === 'true')}
                            defaultValue={field.value ? 'true' : 'false'}
                            className={`flex ${isRTL ? 'flex-row-reverse space-x-6 space-x-reverse' : 'flex-row space-x-6'}`}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          >
                            <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                              <RadioGroupItem value="true" id="has_insurance_yes" />
                              <Label htmlFor="has_insurance_yes" className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'نعم' : 'Yes'}
                              </Label>
                            </div>
                            <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse flex-row-reverse' : 'space-x-2'}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                              <RadioGroupItem value="false" id="has_insurance_no" />
                              <Label htmlFor="has_insurance_no" className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'لا' : 'No'}
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('has_insurance') && (
                    <FormField
                      control={form.control}
                      name="insurance_company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'اسم شركة التأمين' : 'Insurance Company Name'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'اسم شركة التأمين' : 'Insurance Company Name'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Education & Therapy */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    📚 {language === 'ar' ? 'التعليم والعلاج' : 'Education & Therapy'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="school_name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'اسم المدرسة' : 'School Name'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'اسم المدرسة' : 'School Name'} />
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
                            {language === 'ar' ? 'المستوى الدراسي' : 'Grade Level'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'المستوى الدراسي' : 'Grade Level'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="referral_source_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'مصدر التحويل' : 'Referral Source'}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={language === 'ar' ? 'مصدر التحويل' : 'Referral Source'} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="therapy_goals_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'أهداف العلاج' : 'Therapy Goals'}
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder={language === 'ar' ? 'أهداف العلاج' : 'Therapy Goals'}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="therapy_program_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'البرنامج العلاجي' : 'Therapy Program'}
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue 
                                placeholder={language === 'ar' ? 'اختر البرنامج العلاجي' : 'Select Therapy Program'} 
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {plans?.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {language === 'ar' ? plan.name_ar : (plan.name_en || plan.name_ar)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="educational_support_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'الدعم التعليمي' : 'Educational Support'}
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder={language === 'ar' ? 'الدعم التعليمي المطلوب' : 'Required educational support'}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Phase 5: Address Information (NEW PHASE) */}
            <TabsContent value="phase5" className="space-y-6">
              {/* Address Information */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    📍 {language === 'ar' ? 'معلومات العنوان' : 'Address Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address_district"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الحي' : 'District'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'الحي' : 'District'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="address_building_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'رقم المبنى' : 'Building Number'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'رقم المبنى' : 'Building Number'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="address_street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الشارع' : 'Street'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'الشارع' : 'Street'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="address_contact_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'رقم التواصل' : 'Contact Number'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'رقم التواصل' : 'Contact Number'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Registration Status */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                    ✅ {language === 'ar' ? 'حالة التسجيل' : 'Registration Status'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="registration_completed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'حالة التسجيل' : 'Registration Status'}
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === 'true')}
                            defaultValue={field.value ? 'true' : 'false'}
                            className="flex flex-row space-x-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="registration_completed" />
                              <Label htmlFor="registration_completed" className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'تم التسجيل' : 'Registration Completed'}
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="registration_not_completed" />
                              <Label htmlFor="registration_not_completed" className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'لم يتم التسجيل' : 'Registration Not Completed'}
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {!form.watch('registration_completed') && (
                    <FormField
                      control={form.control}
                      name="registration_not_completed_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'سبب عدم التسجيل' : 'Reason for Not Completing Registration'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'اذكر السبب' : 'Specify reason'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="fees_paid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'حالة سداد الرسوم' : 'Fee Payment Status'}
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === 'true')}
                            defaultValue={field.value ? 'true' : 'false'}
                            className="flex flex-row space-x-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="fees_paid" />
                              <Label htmlFor="fees_paid" className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'تم تسديد الرسوم' : 'Fees Paid'}
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="fees_not_paid" />
                              <Label htmlFor="fees_not_paid" className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'لم يتم تسديد الرسوم' : 'Fees Not Paid'}
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {!form.watch('fees_paid') && (
                    <FormField
                      control={form.control}
                      name="fees_not_paid_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'سبب عدم سداد الرسوم' : 'Reason for Not Paying Fees'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'اذكر السبب' : 'Specify reason'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                language === 'ar' ? 'جاري الحفظ...' : 'Saving...'
              ) : (
                language === 'ar' ? 'حفظ' : 'Save'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
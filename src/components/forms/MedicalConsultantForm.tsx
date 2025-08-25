// Medical Consultant Form Component
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { MedicalConsultant } from '@/types/medical'

const supervisionLevels = [
  'attending_physician',
  'consulting_physician', 
  'supervising_specialist',
  'medical_director',
  'clinical_consultant',
  'external_consultant'
] as const

const contractTypes = [
  'full_time',
  'part_time',
  'consultant',
  'on_call',
  'contractual'
] as const

const statusOptions = [
  'active',
  'inactive',
  'suspended',
  'on_leave',
  'terminated'
] as const

const medicalConsultantSchema = z.object({
  first_name_ar: z.string().min(1, 'الاسم الأول بالعربية مطلوب'),
  last_name_ar: z.string().min(1, 'اسم العائلة بالعربية مطلوب'),
  first_name_en: z.string().optional(),
  last_name_en: z.string().optional(),
  title_ar: z.string().optional(),
  title_en: z.string().optional(),
  license_number: z.string().min(1, 'رقم الترخيص مطلوب'),
  license_type: z.string().min(1, 'نوع الترخيص مطلوب'),
  license_expiry_date: z.string().optional(),
  license_issuing_authority_ar: z.string().optional(),
  license_issuing_authority_en: z.string().optional(),
  primary_specialization_ar: z.string().min(1, 'التخصص الأساسي مطلوب'),
  primary_specialization_en: z.string().optional(),
  secondary_specializations: z.array(z.string()).optional(),
  board_certifications: z.array(z.string()).optional(),
  fellowship_training: z.array(z.string()).optional(),
  years_of_experience: z.number().min(0).optional(),
  professional_memberships: z.array(z.string()).optional(),
  primary_phone: z.string().optional(),
  secondary_phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp_number: z.string().optional(),
  clinic_name_ar: z.string().optional(),
  clinic_name_en: z.string().optional(),
  address_ar: z.string().optional(),
  address_en: z.string().optional(),
  city_ar: z.string().optional(),
  city_en: z.string().optional(),
  postal_code: z.string().optional(),
  supervision_level: z.enum(supervisionLevels),
  supervision_scope_ar: z.string().optional(),
  supervision_scope_en: z.string().optional(),
  start_date: z.string().min(1, 'تاريخ البداية مطلوب'),
  end_date: z.string().optional(),
  contract_type: z.enum(contractTypes),
  hourly_rate: z.number().min(0).optional(),
  consultation_fee: z.number().min(0).optional(),
  emergency_contact: z.boolean().default(false),
  emergency_phone: z.string().optional(),
  emergency_availability_notes_ar: z.string().optional(),
  emergency_availability_notes_en: z.string().optional(),
  status: z.enum(statusOptions).default('active'),
  background_check_date: z.string().optional(),
  background_check_status: z.string().optional(),
})

export type MedicalConsultantFormData = z.infer<typeof medicalConsultantSchema>

interface MedicalConsultantFormProps {
  initialData?: Partial<MedicalConsultant>
  onSubmit: (data: MedicalConsultantFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
  submitLabel?: React.ReactNode
}

export const MedicalConsultantForm = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  submitLabel
}: MedicalConsultantFormProps) => {
  const { language, isRTL } = useLanguage()
  const [newSpecialization, setNewSpecialization] = useState('')

  const form = useForm<MedicalConsultantFormData>({
    resolver: zodResolver(medicalConsultantSchema),
    defaultValues: {
      first_name_ar: initialData?.first_name_ar || '',
      last_name_ar: initialData?.last_name_ar || '',
      first_name_en: initialData?.first_name_en || '',
      last_name_en: initialData?.last_name_en || '',
      title_ar: initialData?.title_ar || '',
      title_en: initialData?.title_en || '',
      license_number: initialData?.license_number || '',
      license_type: initialData?.license_type || '',
      license_expiry_date: initialData?.license_expiry_date || '',
      license_issuing_authority_ar: initialData?.license_issuing_authority_ar || '',
      license_issuing_authority_en: initialData?.license_issuing_authority_en || '',
      primary_specialization_ar: initialData?.primary_specialization_ar || '',
      primary_specialization_en: initialData?.primary_specialization_en || '',
      secondary_specializations: initialData?.secondary_specializations || [],
      board_certifications: initialData?.board_certifications || [],
      fellowship_training: initialData?.fellowship_training || [],
      years_of_experience: initialData?.years_of_experience || undefined,
      professional_memberships: initialData?.professional_memberships || [],
      primary_phone: initialData?.primary_phone || '',
      secondary_phone: initialData?.secondary_phone || '',
      email: initialData?.email || '',
      whatsapp_number: initialData?.whatsapp_number || '',
      clinic_name_ar: initialData?.clinic_name_ar || '',
      clinic_name_en: initialData?.clinic_name_en || '',
      address_ar: initialData?.address_ar || '',
      address_en: initialData?.address_en || '',
      city_ar: initialData?.city_ar || '',
      city_en: initialData?.city_en || '',
      postal_code: initialData?.postal_code || '',
      supervision_level: initialData?.supervision_level || 'consulting_physician',
      supervision_scope_ar: initialData?.supervision_scope_ar || '',
      supervision_scope_en: initialData?.supervision_scope_en || '',
      start_date: initialData?.start_date || '',
      end_date: initialData?.end_date || '',
      contract_type: initialData?.contract_type || 'consultant',
      hourly_rate: initialData?.hourly_rate || undefined,
      consultation_fee: initialData?.consultation_fee || undefined,
      emergency_contact: initialData?.emergency_contact || false,
      emergency_phone: initialData?.emergency_phone || '',
      emergency_availability_notes_ar: initialData?.emergency_availability_notes_ar || '',
      emergency_availability_notes_en: initialData?.emergency_availability_notes_en || '',
      status: initialData?.status || 'active',
      background_check_date: initialData?.background_check_date || '',
      background_check_status: initialData?.background_check_status || '',
    },
  })

  const addItem = (fieldName: keyof MedicalConsultantFormData, value: string, setValue: (value: string) => void) => {
    if (!value.trim()) return
    
    const currentValues = form.getValues(fieldName) as string[] || []
    form.setValue(fieldName, [...currentValues, value.trim()] as any)
    setValue('')
  }

  const removeItem = (fieldName: keyof MedicalConsultantFormData, index: number) => {
    const currentValues = form.getValues(fieldName) as string[] || []
    form.setValue(fieldName, currentValues.filter((_, i) => i !== index) as any)
  }

  const getSupervisionLevelLabel = (level: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      attending_physician: { ar: 'طبيب حاضر', en: 'Attending Physician' },
      consulting_physician: { ar: 'طبيب استشاري', en: 'Consulting Physician' },
      supervising_specialist: { ar: 'أخصائي مشرف', en: 'Supervising Specialist' },
      medical_director: { ar: 'مدير طبي', en: 'Medical Director' },
      clinical_consultant: { ar: 'استشاري إكلينيكي', en: 'Clinical Consultant' },
      external_consultant: { ar: 'استشاري خارجي', en: 'External Consultant' }
    }
    return language === 'ar' ? labels[level]?.ar || level : labels[level]?.en || level
  }

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      full_time: { ar: 'دوام كامل', en: 'Full Time' },
      part_time: { ar: 'دوام جزئي', en: 'Part Time' },
      consultant: { ar: 'استشاري', en: 'Consultant' },
      on_call: { ar: 'عند الطلب', en: 'On Call' },
      contractual: { ar: 'تعاقد', en: 'Contractual' }
    }
    return language === 'ar' ? labels[type]?.ar || type : labels[type]?.en || type
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      active: { ar: 'نشط', en: 'Active' },
      inactive: { ar: 'غير نشط', en: 'Inactive' },
      suspended: { ar: 'موقوف', en: 'Suspended' },
      on_leave: { ar: 'في إجازة', en: 'On Leave' },
      terminated: { ar: 'منتهي', en: 'Terminated' }
    }
    return language === 'ar' ? labels[status]?.ar || status : labels[status]?.en || status
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
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
                  name="first_name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الاسم الأول (عربي)' : 'First Name (Arabic)'} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل الاسم الأول' : 'Enter first name'}
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
                        {language === 'ar' ? 'اسم العائلة (عربي)' : 'Last Name (Arabic)'} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل اسم العائلة' : 'Enter last name'}
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
                          placeholder={language === 'ar' ? 'أدخل الاسم الأول' : 'Enter first name'}
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
                          placeholder={language === 'ar' ? 'أدخل اسم العائلة' : 'Enter last name'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'اللقب (عربي)' : 'Title (Arabic)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'د. / أ.د. / استشاري' : 'Dr. / Prof. / Consultant'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'اللقب (إنجليزي)' : 'Title (English)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Dr. / Prof. / Consultant"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الحالة' : 'Status'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'اختر الحالة' : 'Select status'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {getStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Medical Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المؤهلات الطبية' : 'Medical Credentials'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="license_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'رقم الترخيص' : 'License Number'} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل رقم الترخيص' : 'Enter license number'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="license_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'نوع الترخيص' : 'License Type'} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'ترخيص وزارة الصحة' : 'Ministry of Health License'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="license_expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ انتهاء الترخيص' : 'License Expiry Date'}
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
                  name="years_of_experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'سنوات الخبرة' : 'Years of Experience'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primary_specialization_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'التخصص الأساسي (عربي)' : 'Primary Specialization (Arabic)'} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'طب الأطفال / الطب النفسي / العلاج الطبيعي' : 'Enter specialization'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primary_specialization_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'التخصص الأساسي (إنجليزي)' : 'Primary Specialization (English)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Pediatrics / Psychiatry / Physical Therapy"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Secondary Specializations */}
              <FormField
                control={form.control}
                name="secondary_specializations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'التخصصات الثانوية' : 'Secondary Specializations'}
                    </FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder={language === 'ar' ? 'أدخل تخصص ثانوي' : 'Enter secondary specialization'}
                          value={newSpecialization}
                          onChange={(e) => setNewSpecialization(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addItem('secondary_specializations', newSpecialization, setNewSpecialization)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => addItem('secondary_specializations', newSpecialization, setNewSpecialization)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((specialization, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {specialization}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => removeItem('secondary_specializations', index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primary_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الهاتف الأساسي' : 'Primary Phone'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? '+966 50 123 4567' : '+966 50 123 4567'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondary_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الهاتف الثانوي' : 'Secondary Phone'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? '+966 11 123 4567' : '+966 11 123 4567'}
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
                        {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="doctor@hospital.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'رقم الواتساب' : 'WhatsApp Number'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? '+966 50 123 4567' : '+966 50 123 4567'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Supervision Details */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'تفاصيل الإشراف' : 'Supervision Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supervision_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مستوى الإشراف' : 'Supervision Level'} *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر مستوى الإشراف' : 'Select supervision level'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {supervisionLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {getSupervisionLevelLabel(level)}
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
                  name="contract_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'نوع التعاقد' : 'Contract Type'} *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر نوع التعاقد' : 'Select contract type'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contractTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {getContractTypeLabel(type)}
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
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ البداية' : 'Start Date'} *
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
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ النهاية' : 'End Date'}
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
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الأجر بالساعة (ريال)' : 'Hourly Rate (SAR)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="500"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="consultation_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'رسوم الاستشارة (ريال)' : 'Consultation Fee (SAR)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="300"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="supervision_scope_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'نطاق الإشراف (عربي)' : 'Supervision Scope (Arabic)'}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'وصف نطاق ومسؤوليات الإشراف' : 'Describe supervision scope and responsibilities'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {/* Form Actions */}
          <div className="flex gap-4 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {submitLabel || (isLoading 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ الاستشاري الطبي' : 'Save Medical Consultant')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
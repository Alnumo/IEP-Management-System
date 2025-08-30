// Medical Record Form Component
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { MedicalRecord } from '@/types/medical'

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
const dataClassifications = ['public', 'internal', 'confidential', 'restricted'] as const

const medicalRecordSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  medical_record_number: z.string().optional(),
  primary_diagnosis_code: z.array(z.string()).optional(),
  secondary_diagnosis_codes: z.array(z.string()).optional(),
  medical_history: z.record(z.any()).optional(),
  current_medications: z.record(z.any()).optional(),
  allergies: z.array(z.string()).optional(),
  emergency_protocol: z.string().optional(),
  blood_type: z.enum(bloodTypes).optional(),
  weight_kg: z.union([z.number().min(0), z.string()]).optional().transform((val) => {
    if (typeof val === 'string' && val === '') return undefined
    if (typeof val === 'string') return parseFloat(val) || undefined
    return val
  }),
  height_cm: z.union([z.number().min(0), z.string()]).optional().transform((val) => {
    if (typeof val === 'string' && val === '') return undefined
    if (typeof val === 'string') return parseFloat(val) || undefined
    return val
  }),
  primary_physician_ar: z.string().optional(),
  primary_physician_en: z.string().optional(),
  primary_physician_phone: z.string().optional(),
  primary_physician_email: z.string().email().optional().or(z.literal('')),
  hospital_clinic_ar: z.string().optional(),
  hospital_clinic_en: z.string().optional(),
  insurance_provider_ar: z.string().optional(),
  insurance_provider_en: z.string().optional(),
  policy_number: z.string().optional(),
  insurance_expiry_date: z.string().optional(),
  emergency_medical_contact_name_ar: z.string().optional(),
  emergency_medical_contact_name_en: z.string().optional(),
  emergency_medical_contact_phone: z.string().optional(),
  emergency_medical_contact_relationship_ar: z.string().optional(),
  emergency_medical_contact_relationship_en: z.string().optional(),
  activity_restrictions_ar: z.string().optional(),
  activity_restrictions_en: z.string().optional(),
  dietary_restrictions_ar: z.string().optional(),
  dietary_restrictions_en: z.string().optional(),
  medication_allergies: z.array(z.string()).optional(),
  environmental_allergies: z.array(z.string()).optional(),
  contraindications_ar: z.string().optional(),
  contraindications_en: z.string().optional(),
  special_accommodations_ar: z.string().optional(),
  special_accommodations_en: z.string().optional(),
  data_classification: z.enum(dataClassifications).optional(),
})

export type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>

interface MedicalRecordFormProps {
  initialData?: Partial<MedicalRecord>
  students?: Array<{ id: string; name_ar: string; name_en?: string }>
  onSubmit: (data: MedicalRecordFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const MedicalRecordForm = ({
  initialData,
  students = [],
  onSubmit,
  onCancel,
  isLoading = false
}: MedicalRecordFormProps) => {
  const { language, isRTL } = useLanguage()
  const [newAllergy, setNewAllergy] = useState('')
  const [newDiagnosisCode, setNewDiagnosisCode] = useState('')

  const form = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      student_id: initialData?.student_id || '',
      medical_record_number: initialData?.medical_record_number || '',
      primary_diagnosis_code: initialData?.primary_diagnosis_code || [],
      secondary_diagnosis_codes: initialData?.secondary_diagnosis_codes || [],
      allergies: initialData?.allergies || [],
      emergency_protocol: initialData?.emergency_protocol || '',
      blood_type: initialData?.blood_type || undefined,
      weight_kg: initialData?.weight_kg || undefined,
      height_cm: initialData?.height_cm || undefined,
      primary_physician_ar: initialData?.primary_physician_ar || '',
      primary_physician_en: initialData?.primary_physician_en || '',
      primary_physician_phone: initialData?.primary_physician_phone || '',
      primary_physician_email: initialData?.primary_physician_email || '',
      hospital_clinic_ar: initialData?.hospital_clinic_ar || '',
      hospital_clinic_en: initialData?.hospital_clinic_en || '',
      insurance_provider_ar: initialData?.insurance_provider_ar || '',
      insurance_provider_en: initialData?.insurance_provider_en || '',
      policy_number: initialData?.policy_number || '',
      insurance_expiry_date: initialData?.insurance_expiry_date || '',
      emergency_medical_contact_name_ar: initialData?.emergency_medical_contact_name_ar || '',
      emergency_medical_contact_name_en: initialData?.emergency_medical_contact_name_en || '',
      emergency_medical_contact_phone: initialData?.emergency_medical_contact_phone || '',
      emergency_medical_contact_relationship_ar: initialData?.emergency_medical_contact_relationship_ar || '',
      emergency_medical_contact_relationship_en: initialData?.emergency_medical_contact_relationship_en || '',
      activity_restrictions_ar: initialData?.activity_restrictions_ar || '',
      activity_restrictions_en: initialData?.activity_restrictions_en || '',
      dietary_restrictions_ar: initialData?.dietary_restrictions_ar || '',
      dietary_restrictions_en: initialData?.dietary_restrictions_en || '',
      medication_allergies: initialData?.medication_allergies || [],
      environmental_allergies: initialData?.environmental_allergies || [],
      contraindications_ar: initialData?.contraindications_ar || '',
      contraindications_en: initialData?.contraindications_en || '',
      special_accommodations_ar: initialData?.special_accommodations_ar || '',
      special_accommodations_en: initialData?.special_accommodations_en || '',
      data_classification: initialData?.data_classification || 'internal',
    },
  })

  const addItem = (fieldName: keyof MedicalRecordFormData, value: string, setValue: (value: string) => void) => {
    if (!value.trim()) return
    
    const currentValues = form.getValues(fieldName) as string[] || []
    form.setValue(fieldName, [...currentValues, value.trim()] as any)
    setValue('')
  }

  const removeItem = (fieldName: keyof MedicalRecordFormData, index: number) => {
    const currentValues = form.getValues(fieldName) as string[] || []
    form.setValue(fieldName, currentValues.filter((_, i) => i !== index) as any)
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
              <FormField
                control={form.control}
                name="student_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الطالب' : 'Student'} *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'اختر طالب' : 'Select student'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {language === 'ar' ? student.name_ar : student.name_en || student.name_ar}
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
                name="medical_record_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'رقم السجل الطبي' : 'Medical Record Number'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={language === 'ar' ? 'أدخل رقم السجل الطبي' : 'Enter medical record number'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_classification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'تصنيف البيانات' : 'Data Classification'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'اختر التصنيف' : 'Select classification'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dataClassifications.map((classification) => (
                          <SelectItem key={classification} value={classification}>
                            {language === 'ar' 
                              ? (classification === 'public' ? 'عام' : 
                                 classification === 'internal' ? 'داخلي' : 
                                 classification === 'confidential' ? 'سري' : 'محظور')
                              : classification
                            }
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

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المعلومات الطبية' : 'Medical Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Diagnosis Codes */}
              <FormField
                control={form.control}
                name="primary_diagnosis_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'أكواد التشخيص الأساسية' : 'Primary Diagnosis Codes'}
                    </FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder={language === 'ar' ? 'أدخل كود التشخيص' : 'Enter diagnosis code'}
                          value={newDiagnosisCode}
                          onChange={(e) => setNewDiagnosisCode(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addItem('primary_diagnosis_code', newDiagnosisCode, setNewDiagnosisCode)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => addItem('primary_diagnosis_code', newDiagnosisCode, setNewDiagnosisCode)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((code, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {code}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => removeItem('primary_diagnosis_code', index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Blood Type */}
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
                          <SelectValue placeholder={language === 'ar' ? 'اختر فصيلة الدم' : 'Select blood type'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bloodTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Physical Measurements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الوزن (كجم)' : 'Weight (kg)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="height_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الطول (سم)' : 'Height (cm)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Allergies */}
              <FormField
                control={form.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الحساسيات' : 'Allergies'}
                    </FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder={language === 'ar' ? 'أدخل نوع الحساسية' : 'Enter allergy'}
                          value={newAllergy}
                          onChange={(e) => setNewAllergy(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addItem('allergies', newAllergy, setNewAllergy)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => addItem('allergies', newAllergy, setNewAllergy)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((allergy, index) => (
                          <Badge key={index} variant="destructive" className="gap-1">
                            {allergy}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-white"
                              onClick={() => removeItem('allergies', index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Emergency Protocol */}
              <FormField
                control={form.control}
                name="emergency_protocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'بروتوكول الطوارئ' : 'Emergency Protocol'}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'أدخل بروتوكول الطوارئ' : 'Enter emergency protocol'}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {language === 'ar' ? 'الخطوات المطلوبة في حالات الطوارئ الطبية' : 'Steps required in medical emergencies'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Primary Physician Information */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الطبيب المعالج' : 'Primary Physician'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primary_physician_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'اسم الطبيب (عربي)' : 'Physician Name (Arabic)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل اسم الطبيب' : 'Enter physician name'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primary_physician_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'اسم الطبيب (إنجليزي)' : 'Physician Name (English)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل اسم الطبيب' : 'Enter physician name'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primary_physician_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'هاتف الطبيب' : 'Physician Phone'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل رقم الهاتف' : 'Enter phone number'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primary_physician_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'بريد الطبيب الإلكتروني' : 'Physician Email'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={language === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter email address'}
                          {...field}
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
                  name="hospital_clinic_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'المستشفى/العيادة (عربي)' : 'Hospital/Clinic (Arabic)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل اسم المستشفى أو العيادة' : 'Enter hospital or clinic name'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hospital_clinic_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'المستشفى/العيادة (إنجليزي)' : 'Hospital/Clinic (English)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل اسم المستشفى أو العيادة' : 'Enter hospital or clinic name'}
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

          {/* Form Actions */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ السجل الطبي' : 'Save Medical Record')
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}